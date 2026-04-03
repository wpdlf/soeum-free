import asyncio
import logging
import re
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings
from app.repositories.construction_repo import ConstructionRepository
from app.repositories.noise_repo import NoiseRepository
from app.repositories.real_estate_repo import RealEstateRepository
from app.repositories.region_repo import RegionRepository
from app.schemas.data_sync import SyncResponse
from app.services.cache_service import CacheService

logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=4)


# ---------------------------------------------------------------------------
# Pandas aggregation helpers (run in thread pool to avoid blocking event loop)
# ---------------------------------------------------------------------------


async def _aggregate_noise(raw_records: list[dict]) -> list[dict]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _sync_aggregate, raw_records)


def _sync_aggregate(records: list[dict]) -> list[dict]:
    import pandas as pd
    from app.utils.noise_level import classify_noise

    df = pd.DataFrame(records)
    summary = (
        df.groupby("region_id")
        .agg(
            avg_noise=("avg_noise", "mean"),
            sample_count=("id", "count"),
        )
        .reset_index()
    )
    summary["avg_noise"] = summary["avg_noise"].round(1)
    summary[["noise_level", "noise_color"]] = summary["avg_noise"].apply(
        lambda x: pd.Series(classify_noise(x))
    )
    return summary.to_dict(orient="records")


# S-DoT API 영문 구 이름 → 한글 매핑
SDOT_GU_MAP: dict[str, str] = {
    "Gangnam-gu": "강남구", "Gangdong-gu": "강동구", "Gangbuk-gu": "강북구",
    "Gangseo-gu": "강서구", "Gwanak-gu": "관악구", "Gwangjin-gu": "광진구",
    "Guro-gu": "구로구", "Geumcheon-gu": "금천구", "Nowon-gu": "노원구",
    "Dobong-gu": "도봉구", "Dongdaemun-gu": "동대문구", "Dongjak-gu": "동작구",
    "Mapo-gu": "마포구", "Seodaemun-gu": "서대문구", "Seocho-gu": "서초구",
    "Seongdong-gu": "성동구", "Seongbuk-gu": "성북구", "Songpa-gu": "송파구",
    "Yangcheon-gu": "양천구", "Yeongdeungpo-gu": "영등포구", "Yongsan-gu": "용산구",
    "Eunpyeong-gu": "은평구", "Jongno-gu": "종로구", "Jung-gu": "중구",
    "Jungnang-gu": "중랑구",
}

# S-DoT 영문 region type → DB enum
SDOT_REGION_MAP: dict[str, str] = {
    "residential_area": "residential",
    "roads_and_parks": "road_park",
    "main_street": "main_street",
    "commercial_area": "main_street",
    "industrial_area": "main_street",
    "parks": "road_park",
    "public_facilities": "residential",
    "traditional_markets": "main_street",
}


class DataCollector:
    """Collects data from external public APIs and syncs to the database."""

    def __init__(
        self,
        noise_repo: NoiseRepository,
        construction_repo: ConstructionRepository,
        real_estate_repo: RealEstateRepository,
        region_repo: RegionRepository,
        cache: CacheService,
    ):
        self._noise_repo = noise_repo
        self._construction_repo = construction_repo
        self._real_estate_repo = real_estate_repo
        self._region_repo = region_repo
        self._cache = cache

    # ------------------------------------------------------------------
    # Geocoding helper (Kakao keyword search)
    # ------------------------------------------------------------------

    async def _geocode_keyword(self, keyword: str) -> tuple[float, float] | None:
        """Geocode a keyword using Kakao Local API. Returns (lat, lng) or None."""
        kakao_key = settings.KAKAO_REST_API_KEY
        if not kakao_key:
            return None
        # Extract meaningful part from construction name
        # Remove common suffixes like 신축공사, 공사, 현장 etc.
        clean = re.sub(r'(신축|증축|개축|재건축|리모델링|확장|성능개선)?\s*(공사|현장|사업)$', '', keyword).strip()
        if not clean:
            clean = keyword
        try:
            async with httpx.AsyncClient(timeout=5, follow_redirects=True) as client:
                resp = await client.get(
                    "https://dapi.kakao.com/v2/local/search/keyword.json",
                    params={"query": clean, "size": "1"},
                    headers={"Authorization": f"KakaoAK {kakao_key}"},
                )
                if resp.status_code != 200:
                    return None
                docs = resp.json().get("documents", [])
                if docs:
                    return float(docs[0]["y"]), float(docs[0]["x"])
        except Exception:
            pass
        return None

    async def geocode_constructions(self) -> SyncResponse:
        """Fill missing coordinates for construction records using Kakao geocoding."""
        start = time.monotonic()
        details: list[str] = []
        updated = 0
        errors = 0

        try:
            rows, total = await self._construction_repo.get_permits(limit=1000)
            no_coords = [r for r in rows if r.latitude is None or r.longitude is None]
            details.append(f"Total: {total}, missing coords: {len(no_coords)}")

            for r in no_coords:
                query = r.project_name or r.address or ""
                if not query:
                    continue
                coords = await self._geocode_keyword(query)
                if coords:
                    lat, lng = coords
                    # Update directly
                    r.latitude = lat
                    r.longitude = lng
                    updated += 1
                else:
                    # Try with address if different
                    if r.address and r.address != r.project_name:
                        coords = await self._geocode_keyword(r.address)
                        if coords:
                            r.latitude, r.longitude = coords
                            updated += 1

                # Rate limit: avoid hammering Kakao API
                await asyncio.sleep(0.1)

            await self._construction_repo.db.commit()
            details.append(f"Geocoded {updated}/{len(no_coords)} constructions")

            await self._cache.invalidate_pattern("construction:*")
            await self._cache.invalidate_pattern("region:detail:*")

        except Exception as e:
            errors += 1
            details.append(f"Error: {e!s}")
            logger.exception("Error in geocode_constructions")

        return SyncResponse(
            status="success" if errors == 0 else "failed",
            collected_count=updated,
            error_count=errors,
            duration_seconds=round(time.monotonic() - start, 2),
            details=details,
        )

    # ------------------------------------------------------------------
    # HTTP helper with retry
    # ------------------------------------------------------------------

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(min=2, max=30),
        reraise=True,
    )
    async def _fetch_api(
        self,
        url: str,
        params: dict | None = None,
        timeout: int = 30,
    ) -> dict:
        """Fetch data from an external API with retry logic."""
        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0"},
        ) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()

    # ------------------------------------------------------------------
    # Noise data sync
    # ------------------------------------------------------------------

    async def sync_noise_data(
        self,
        district: str | None = None,
        year_month: str | None = None,
    ) -> SyncResponse:
        """Sync noise data from Seoul S-DoT (IotVdata017) API.

        API: http://openapi.seoul.go.kr:8088/{KEY}/json/IotVdata017/{START}/{END}/
        Fields: CGG(구 영문), DONG(동 영문), MAX_NIS/AVG_NIS/MIN_NIS(소음 dB),
                RGN(지역유형), MSRMT_HR(측정시간)
        """
        start = time.monotonic()
        details: list[str] = []
        collected = 0
        errors = 0

        try:
            api_key = settings.DATA_GO_KR_API_KEY
            if not api_key:
                return SyncResponse(
                    status="failed", collected_count=0, error_count=1,
                    duration_seconds=round(time.monotonic() - start, 2),
                    details=["DATA_GO_KR_API_KEY is not configured"],
                )

            # Build region mapping (한글 구/동 → region_id)
            regions = await self._region_repo.get_all()
            region_map = {
                (r.district_name, r.dong_name): r.id for r in regions
            }

            # S-DoT API — 최대 1000건씩 페이징
            base_url = f"http://openapi.seoul.go.kr:8088/{api_key}/json/IotVdata017"

            # 먼저 전체 건수 확인
            meta = await self._fetch_api(f"{base_url}/1/1/")
            total = meta.get("IotVdata017", {}).get("list_total_count", 0)
            details.append(f"S-DoT total records: {total}")

            # 최대 5000건까지 수집 (5 pages x 1000)
            max_pages = min(5, (total // 1000) + 1)
            all_raw_records: list[dict] = []

            for page in range(max_pages):
                s = page * 1000 + 1
                e = (page + 1) * 1000
                try:
                    data = await self._fetch_api(f"{base_url}/{s}/{e}/")
                    rows = data.get("IotVdata017", {}).get("row", [])
                    if not rows:
                        break

                    for row in rows:
                        # 소음 데이터가 없는 센서는 스킵
                        avg_nis = row.get("AVG_NIS", "")
                        if not avg_nis or avg_nis == "":
                            continue

                        # 영문 구/동 → 한글 변환
                        gu_en = row.get("CGG", "")
                        gu_kr = SDOT_GU_MAP.get(gu_en, "")
                        if district and gu_kr != district:
                            continue
                        if not gu_kr:
                            continue

                        # 동 이름은 영문이므로 정확한 매칭 어려움 → 구 단위로 매칭
                        # regions 테이블에서 해당 구의 첫 번째 동으로 매핑
                        region_id = None
                        for (d, dn), rid in region_map.items():
                            if d == gu_kr:
                                region_id = rid
                                break
                        if not region_id:
                            continue

                        # 측정 시간 파싱: "2026-03-31_23:07:00"
                        msrmt = row.get("MSRMT_HR", "")
                        try:
                            measured_at = datetime.strptime(
                                msrmt[:10], "%Y-%m-%d"
                            ).date()
                        except (ValueError, IndexError):
                            measured_at = date.today()

                        # region type 매핑
                        rgn = row.get("RGN", "residential_area")
                        region_type = SDOT_REGION_MAP.get(rgn, "residential")

                        try:
                            all_raw_records.append({
                                "region_id": region_id,
                                "region_type": region_type,
                                "max_noise": float(row.get("MAX_NIS", 0) or 0),
                                "min_noise": float(row.get("MIN_NIS", 0) or 0),
                                "avg_noise": float(avg_nis or 0),
                                "measured_at": measured_at,
                                "source": "sdot",
                            })
                        except (ValueError, TypeError):
                            continue

                    details.append(f"Page {page+1}: fetched {len(rows)} rows")
                except Exception as e:
                    errors += 1
                    details.append(f"Page {page+1}: error - {e!s}")

            # Bulk upsert raw records
            if all_raw_records:
                try:
                    count = await self._noise_repo.bulk_upsert_raw(all_raw_records)
                    collected = count
                    details.append(f"Upserted {count} noise records")
                except Exception as e:
                    errors += 1
                    details.append(f"Bulk upsert error: {e!s}")

            # Aggregate summaries with Pandas
            if all_raw_records:
                try:
                    for i, rec in enumerate(all_raw_records):
                        rec["id"] = i
                    summary_records = await _aggregate_noise(all_raw_records)
                    today = date.today()
                    for s in summary_records:
                        s["period_start"] = date(today.year, today.month, 1)
                        s["period_end"] = today
                    agg_count = await self._noise_repo.bulk_upsert_summary(summary_records)
                    details.append(f"Aggregated {agg_count} noise summaries")
                except Exception as e:
                    errors += 1
                    details.append(f"Aggregation error: {e!s}")

            # Invalidate cache
            await self._cache.invalidate_pattern("noise:*")
            await self._cache.invalidate_pattern("region:detail:*")

            status = "success" if errors == 0 else "partial"
            if collected == 0 and errors > 0:
                status = "failed"

        except Exception as e:
            logger.exception("Unexpected error in sync_noise_data")
            return SyncResponse(
                status="failed", collected_count=collected, error_count=errors + 1,
                duration_seconds=round(time.monotonic() - start, 2),
                details=[*details, f"Unexpected error: {e!s}"],
            )

        return SyncResponse(
            status=status, collected_count=collected, error_count=errors,
            duration_seconds=round(time.monotonic() - start, 2), details=details,
        )

    # ------------------------------------------------------------------
    # 비산먼지발생사업정보 수집
    # ------------------------------------------------------------------

    async def sync_dust_emission(
        self,
        district: str | None = None,
    ) -> SyncResponse:
        """Sync dust emission construction data from 행정안전부 비산먼지발생사업정보 API."""
        start = time.monotonic()
        details: list[str] = []
        collected = 0
        errors = 0

        try:
            api_key = settings.DUST_EMISSION_API_KEY
            if not api_key:
                return SyncResponse(
                    status="failed", collected_count=0, error_count=1,
                    duration_seconds=round(time.monotonic() - start, 2),
                    details=["DUST_EMISSION_API_KEY is not configured"],
                )

            # Build region mapping
            regions = await self._region_repo.get_all()
            region_map: dict[str, int] = {}
            for r in regions:
                region_map[f"{r.district_name} {r.dong_name}"] = r.id

            base_url = "https://apis.data.go.kr/1741000/dust_emission_business_info/info"
            today = date.today()
            page = 1
            max_pages = 100
            all_records: list[dict] = []

            while page <= max_pages:
                try:
                    data = await self._fetch_api(base_url, params={
                        "serviceKey": api_key,
                        "pageNo": str(page),
                        "numOfRows": "100",
                        "returnType": "json",
                        "cond[LCTN_ROAD_NM_ADDR::LIKE]": "서울",
                    }, timeout=30)

                    header = data.get("response", {}).get("header", {})
                    if header.get("resultCode") != "0":
                        errors += 1
                        details.append(f"Page {page}: API error - {header.get('resultMsg')}")
                        break

                    body = data.get("response", {}).get("body", {})
                    items = body.get("items", {}).get("item", [])
                    if not items:
                        break
                    if isinstance(items, dict):
                        items = [items]

                    for item in items:
                        # 공사 종료일 확인 — 진행중인 것만
                        end_day = item.get("INSTL_CSTRN_END_DAY", "")
                        if end_day:
                            try:
                                end_date = datetime.strptime(end_day, "%Y-%m-%d").date()
                                if end_date < today:
                                    continue  # 이미 종료된 공사
                            except ValueError:
                                pass

                        cstrn_nm = item.get("CNSTST_NM", "") or ""
                        addr = item.get("LCTN_ROAD_NM_ADDR", "") or item.get("LCTN_LOTNO_ADDR", "") or ""
                        bzmn = item.get("BZMN_NM_CONM", "") or ""
                        mng_no = item.get("MNG_NO", "")
                        bgn_day = item.get("INSTL_CSTRN_BGNG_DAY", "")

                        if district and district not in addr:
                            continue

                        # 시작/종료일 파싱
                        start_date = None
                        end_date_val = None
                        try:
                            if bgn_day:
                                start_date = datetime.strptime(bgn_day, "%Y-%m-%d").date()
                        except ValueError:
                            pass
                        try:
                            if end_day:
                                end_date_val = datetime.strptime(end_day, "%Y-%m-%d").date()
                        except ValueError:
                            pass

                        # Region 매칭: 주소에서 구/동 추출
                        region_id = None
                        for key, rid in region_map.items():
                            gu, dong = key.split(" ", 1)
                            if gu in addr:
                                region_id = rid
                                break
                        if not region_id:
                            continue

                        all_records.append({
                            "region_id": region_id,
                            "permit_number": f"DE-{mng_no}" if mng_no else f"DE-{len(all_records)}",
                            "project_name": cstrn_nm[:200] or "비산먼지 공사장",
                            "building_type": f"비산먼지 | {bzmn[:50]}" if bzmn else "비산먼지",
                            "permit_date": start_date or today,
                            "start_date": start_date,
                            "end_date": end_date_val,
                            "address": addr[:300] if addr else None,
                            "latitude": None,
                            "longitude": None,
                            "status": "in_progress",
                        })

                    details.append(f"Page {page}: fetched {len(items)} items")

                    total_count = body.get("totalCount", 0)
                    if page * 100 >= total_count:
                        break
                    page += 1

                except Exception as e:
                    errors += 1
                    details.append(f"Page {page}: error - {e!s}")
                    break

            # Bulk upsert
            if all_records:
                try:
                    count = await self._construction_repo.bulk_upsert(all_records)
                    collected = count
                    details.append(f"Upserted {count} dust emission records")
                except Exception as e:
                    errors += 1
                    details.append(f"Bulk upsert error: {e!s}")

            await self._cache.invalidate_pattern("construction:*")
            await self._cache.invalidate_pattern("region:detail:*")

            status_str = "success" if errors == 0 else "partial"
            if collected == 0 and errors > 0:
                status_str = "failed"

        except Exception as e:
            logger.exception("Unexpected error in sync_dust_emission")
            return SyncResponse(
                status="failed", collected_count=collected, error_count=errors + 1,
                duration_seconds=round(time.monotonic() - start, 2),
                details=[*details, f"Unexpected error: {e!s}"],
            )

        return SyncResponse(
            status=status_str, collected_count=collected, error_count=errors,
            duration_seconds=round(time.monotonic() - start, 2), details=details,
        )

    # ------------------------------------------------------------------
    # Construction data sync (공유플랫폼 대규모공사장)
    # ------------------------------------------------------------------

    async def sync_construction_safetydata(
        self,
        district: str | None = None,
        year_month: str | None = None,
    ) -> SyncResponse:
        """Sync large construction data from 행정안전부 공유플랫폼 (DSSP-IF-10684)."""
        start = time.monotonic()
        details: list[str] = []
        collected = 0
        errors = 0

        try:
            api_key = settings.SAFETYDATA_API_KEY
            if not api_key:
                return SyncResponse(
                    status="failed", collected_count=0, error_count=1,
                    duration_seconds=round(time.monotonic() - start, 2),
                    details=["SAFETYDATA_API_KEY is not configured"],
                )

            # Build region mapping
            regions = await self._region_repo.get_all()
            region_map: dict[str, int] = {}
            for r in regions:
                region_map[f"{r.district_name} {r.dong_name}"] = r.id

            # 구 코드 → 구 이름 매핑 (RGN_CD 앞 5자리가 시군구코드)
            seoul_gu_codes: dict[str, str] = {}
            for r in regions:
                if r.district_code:
                    seoul_gu_codes[r.district_code] = r.district_name

            base_url = "https://www.safetydata.go.kr/V2/api/DSSP-IF-10684"
            page = 1
            max_pages = 50
            all_records: list[dict] = []

            while page <= max_pages:
                try:
                    data = await self._fetch_api(base_url, params={
                        "serviceKey": api_key,
                        "returnType": "json",
                        "pageNo": str(page),
                        "numOfRows": "100",
                    }, timeout=60)

                    header = data.get("header", {})
                    if header.get("resultCode") != "00":
                        errors += 1
                        details.append(
                            f"Page {page}: API error - {header.get('errorMsg', 'unknown')}"
                        )
                        break

                    items = data.get("body", [])
                    if not items:
                        details.append(f"Page {page}: no more items")
                        break

                    if isinstance(items, dict):
                        items = [items]

                    for item in items:
                        # 서울 필터 (RGN_CD가 11로 시작)
                        rgn_cd = item.get("RGN_CD", "")
                        if not rgn_cd.startswith("11"):
                            continue

                        # 삭제 데이터 제외
                        if item.get("DEL_YN") == "Y":
                            continue

                        cstrn_nm = item.get("CSTRN_NM", "") or ""
                        daddr = item.get("DADDR", "") or item.get("RONA_DADDR", "") or cstrn_nm
                        bgncst_ymd = item.get("BGNCST_YMD", "")
                        cmcn_ymd = item.get("CMCN_PRNMNT_YMD", "")
                        mng_no = item.get("LASC_CNST_COSI_MNG_NO", "")
                        enag_nm = item.get("ENAG_NM", "") or ""
                        cstrn_smry = item.get("CSTRN_SMRY", "") or ""

                        if district and district not in daddr and district not in cstrn_nm:
                            continue

                        # 날짜 파싱
                        start_date = None
                        end_date = None
                        try:
                            if bgncst_ymd and len(bgncst_ymd) >= 8:
                                start_date = datetime.strptime(bgncst_ymd[:8], "%Y%m%d").date()
                        except ValueError:
                            pass
                        try:
                            if cmcn_ymd and len(cmcn_ymd) >= 8:
                                end_date = datetime.strptime(cmcn_ymd[:8], "%Y%m%d").date()
                        except ValueError:
                            pass

                        # 공사 상태 판단
                        today = date.today()
                        if end_date and end_date < today:
                            status = "completed"
                        elif start_date and start_date <= today:
                            status = "in_progress"
                        else:
                            status = "permitted"

                        # Region 매칭
                        region_id = None
                        gu_name = seoul_gu_codes.get(rgn_cd[:5], "")
                        if gu_name:
                            for key, rid in region_map.items():
                                if key.startswith(gu_name):
                                    region_id = rid
                                    break
                        if not region_id:
                            continue

                        # 좌표
                        lat = None
                        lng = None
                        try:
                            if item.get("LAT"):
                                lat = float(item["LAT"])
                            if item.get("LOT"):
                                lng = float(item["LOT"])
                        except (ValueError, TypeError):
                            pass

                        project_name = cstrn_nm or daddr or "대규모공사장"
                        building_type = cstrn_smry[:100] if cstrn_smry else "대규모공사"

                        all_records.append({
                            "region_id": region_id,
                            "permit_number": f"SD-{mng_no}" if mng_no else f"SD-{len(all_records)}",
                            "project_name": project_name[:200],
                            "building_type": building_type[:100],
                            "permit_date": start_date or today,
                            "start_date": start_date,
                            "end_date": end_date,
                            "address": daddr[:300] if daddr else None,
                            "latitude": lat,
                            "longitude": lng,
                            "status": status,
                        })

                    details.append(f"Page {page}: fetched {len(items)} items")

                    # 전체 건수 확인하여 페이징 종료
                    total_count = data.get("totalCount", 0)
                    if page * 100 >= total_count:
                        break
                    page += 1

                except Exception as e:
                    errors += 1
                    details.append(f"Page {page}: error - {e!s}")
                    break

            # Bulk upsert
            if all_records:
                try:
                    count = await self._construction_repo.bulk_upsert(all_records)
                    collected = count
                    details.append(f"Upserted {count} construction records from SafetyData")
                except Exception as e:
                    errors += 1
                    details.append(f"Bulk upsert error: {e!s}")

            # Invalidate cache
            await self._cache.invalidate_pattern("construction:*")
            await self._cache.invalidate_pattern("region:detail:*")

            status_str = "success" if errors == 0 else "partial"
            if collected == 0 and errors > 0:
                status_str = "failed"

        except Exception as e:
            logger.exception("Unexpected error in sync_construction_safetydata")
            return SyncResponse(
                status="failed", collected_count=collected, error_count=errors + 1,
                duration_seconds=round(time.monotonic() - start, 2),
                details=[*details, f"Unexpected error: {e!s}"],
            )

        return SyncResponse(
            status=status_str, collected_count=collected, error_count=errors,
            duration_seconds=round(time.monotonic() - start, 2), details=details,
        )

    # ------------------------------------------------------------------
    # Construction data sync (SafeMap 생활안전지도)
    # ------------------------------------------------------------------

    async def sync_construction_safemap(
        self,
        district: str | None = None,
        year_month: str | None = None,
    ) -> SyncResponse:
        """Sync construction data from 행정안전부 생활안전지도 API (IF_0043)."""
        start = time.monotonic()
        details: list[str] = []
        collected = 0
        errors = 0

        try:
            api_key = settings.SAFEMAP_API_KEY
            if not api_key:
                return SyncResponse(
                    status="failed", collected_count=0, error_count=1,
                    duration_seconds=round(time.monotonic() - start, 2),
                    details=["SAFEMAP_API_KEY is not configured"],
                )

            # Build region mapping
            regions = await self._region_repo.get_all()
            region_map: dict[str, int] = {}
            for r in regions:
                region_map[f"{r.district_name} {r.dong_name}"] = r.id

            base_url = "http://safemap.go.kr/openapi2/IF_0043"
            page = 1
            max_pages = 10
            all_records: list[dict] = []

            while page <= max_pages:
                try:
                    data = await self._fetch_api(base_url, params={
                        "serviceKey": api_key,
                        "pageNo": str(page),
                        "numOfRows": "100",
                        "returnType": "JSON",
                    }, timeout=60)

                    header = data.get("header", {})
                    if header.get("resultCode") != "00":
                        errors += 1
                        details.append(
                            f"Page {page}: API error - {header.get('errorMsg', 'unknown')}"
                        )
                        break

                    items = data.get("body", {}).get("items", [])
                    if not items:
                        details.append(f"Page {page}: no more items")
                        break

                    if isinstance(items, dict):
                        items = [items]

                    for item in items:
                        address = item.get("wrk_adres_rn", "")
                        x = item.get("x", "")
                        y = item.get("y", "")
                        sgg_cd = item.get("sgg_cd", "")
                        balju = item.get("balju_name", "")
                        agree_pro = item.get("agree_pro", "")

                        if not address or not x or not y:
                            continue

                        # 서울 필터 (시군구코드 11로 시작)
                        if sgg_cd and not sgg_cd.startswith("11"):
                            continue

                        # 좌표 파싱
                        try:
                            lng = float(x)
                            lat = float(y)
                        except (ValueError, TypeError):
                            continue

                        # 서울 범위 필터
                        if not (126.7 < lng < 127.2 and 37.4 < lat < 37.7):
                            continue

                        # Region 매칭: 주소에서 구/동 추출
                        region_id = None
                        for key, rid in region_map.items():
                            gu, dong = key.split(" ", 1)
                            if gu in address and dong in address:
                                region_id = rid
                                break
                        if not region_id:
                            # 구만 매칭
                            for key, rid in region_map.items():
                                gu = key.split(" ")[0]
                                if gu in address:
                                    region_id = rid
                                    break
                        if not region_id:
                            continue

                        if district and district not in address:
                            continue

                        status = "in_progress" if agree_pro == "Y" else "permitted"

                        all_records.append({
                            "region_id": region_id,
                            "permit_number": f"SM-{sgg_cd}-{len(all_records)}",
                            "project_name": balju or "건설공사",
                            "building_type": "건설공사",
                            "permit_date": date.today(),
                            "start_date": None,
                            "end_date": None,
                            "address": address,
                            "latitude": lat,
                            "longitude": lng,
                            "status": status,
                        })

                    details.append(f"Page {page}: fetched {len(items)} items")
                    page += 1

                except Exception as e:
                    errors += 1
                    details.append(f"Page {page}: error - {e!s}")
                    break

            # Bulk upsert
            if all_records:
                try:
                    count = await self._construction_repo.bulk_upsert(all_records)
                    collected = count
                    details.append(f"Upserted {count} construction records from SafeMap")
                except Exception as e:
                    errors += 1
                    details.append(f"Bulk upsert error: {e!s}")

            # Invalidate cache
            await self._cache.invalidate_pattern("construction:*")
            await self._cache.invalidate_pattern("region:detail:*")

            status_str = "success" if errors == 0 else "partial"
            if collected == 0 and errors > 0:
                status_str = "failed"

        except Exception as e:
            logger.exception("Unexpected error in sync_construction_safemap")
            return SyncResponse(
                status="failed", collected_count=collected, error_count=errors + 1,
                duration_seconds=round(time.monotonic() - start, 2),
                details=[*details, f"Unexpected error: {e!s}"],
            )

        return SyncResponse(
            status=status_str, collected_count=collected, error_count=errors,
            duration_seconds=round(time.monotonic() - start, 2), details=details,
        )

    # ------------------------------------------------------------------
    # Construction data sync (국토교통부 — fallback)
    # ------------------------------------------------------------------

    async def sync_construction_data(
        self,
        district: str | None = None,
        year_month: str | None = None,
    ) -> SyncResponse:
        """Sync construction permit data from 국토교통부 건축인허가 API."""
        start = time.monotonic()
        details: list[str] = []
        collected = 0
        errors = 0

        try:
            api_key = settings.DATA_GO_KR_API_KEY
            if not api_key:
                return SyncResponse(
                    status="failed",
                    collected_count=0,
                    error_count=1,
                    duration_seconds=round(time.monotonic() - start, 2),
                    details=["DATA_GO_KR_API_KEY is not configured"],
                )

            district_codes = await self._region_repo.get_district_codes(
                district
            )
            if not district_codes:
                details.append(
                    f"No regions found for district={district}"
                )
                return SyncResponse(
                    status="failed",
                    collected_count=0,
                    error_count=1,
                    duration_seconds=round(time.monotonic() - start, 2),
                    details=details,
                )

            # 국토교통부 건축인허가 API
            base_url = (
                "http://apis.data.go.kr/1613000"
                "/ArchPmsService_v2/getApBrBasisOulnInfo"
            )

            # Determine date parameters
            if year_month:
                approval_date = year_month
            else:
                approval_date = datetime.now().strftime("%Y%m")

            for dist_name, dist_code in district_codes:
                if not dist_code:
                    details.append(
                        f"{dist_name}: no district_code, skipping"
                    )
                    continue

                try:
                    params = {
                        "serviceKey": api_key,
                        "sigunguCd": dist_code,
                        "bjdongCd": "",
                        "numOfRows": "100",
                        "pageNo": "1",
                        "_type": "json",
                    }

                    data = await self._fetch_api(base_url, params=params)

                    body = (
                        data.get("response", {})
                        .get("body", {})
                    )
                    items = body.get("items", {})
                    rows = items.get("item", []) if items else []

                    if isinstance(rows, dict):
                        rows = [rows]

                    if not rows:
                        details.append(
                            f"{dist_name}: no construction data"
                        )
                        continue

                    # Find region mapping
                    regions = await self._region_repo.get_all()
                    region_map = {
                        (r.district_name, r.dong_name): r.id
                        for r in regions
                    }

                    records = []
                    for row in rows:
                        dong = row.get("bjdongNm", "")
                        region_id = region_map.get((dist_name, dong))
                        if not region_id:
                            # Try matching by district only
                            for key, rid in region_map.items():
                                if key[0] == dist_name:
                                    region_id = rid
                                    break
                            if not region_id:
                                continue

                        permit_date_str = row.get("crtnDay", "")
                        permit_date = None
                        if permit_date_str:
                            try:
                                permit_date = datetime.strptime(
                                    permit_date_str[:8], "%Y%m%d"
                                ).date()
                            except ValueError:
                                pass

                        records.append(
                            {
                                "region_id": region_id,
                                "permit_number": row.get("gbsCdNm", None),
                                "project_name": row.get(
                                    "bldNm", None
                                ),
                                "building_type": row.get(
                                    "mainPurpsCdNm", None
                                ),
                                "permit_date": permit_date,
                                "start_date": None,
                                "end_date": None,
                                "address": row.get("platPlc", None),
                                "latitude": None,
                                "longitude": None,
                                "status": "permitted",
                            }
                        )

                    if records:
                        count = (
                            await self._construction_repo.bulk_upsert(
                                records
                            )
                        )
                        collected += count
                        details.append(
                            f"{dist_name}: upserted {count} construction records"
                        )
                    else:
                        details.append(
                            f"{dist_name}: no matching records"
                        )

                except Exception as e:
                    errors += 1
                    details.append(f"{dist_name}: error - {e!s}")
                    logger.exception(
                        "Error syncing construction for %s", dist_name
                    )

            # Invalidate cache
            await self._cache.invalidate_pattern("construction:*")
            await self._cache.invalidate_pattern("region:detail:*")

            status = "success" if errors == 0 else "partial"
            if collected == 0 and errors > 0:
                status = "failed"

        except Exception as e:
            logger.exception(
                "Unexpected error in sync_construction_data"
            )
            return SyncResponse(
                status="failed",
                collected_count=collected,
                error_count=errors + 1,
                duration_seconds=round(time.monotonic() - start, 2),
                details=[*details, f"Unexpected error: {e!s}"],
            )

        return SyncResponse(
            status=status,
            collected_count=collected,
            error_count=errors,
            duration_seconds=round(time.monotonic() - start, 2),
            details=details,
        )

    # ------------------------------------------------------------------
    # Real estate data sync
    # ------------------------------------------------------------------

    async def sync_real_estate_data(
        self,
        district: str | None = None,
        year_month: str | None = None,
    ) -> SyncResponse:
        """Sync real estate rent data from 국토교통부 전월세 APIs
        (아파트/연립다세대/오피스텔)."""
        start = time.monotonic()
        details: list[str] = []
        collected = 0
        errors = 0

        try:
            api_key = settings.DUST_EMISSION_API_KEY  # 동일 키 사용
            if not api_key:
                return SyncResponse(
                    status="failed", collected_count=0, error_count=1,
                    duration_seconds=round(time.monotonic() - start, 2),
                    details=["API key is not configured"],
                )

            district_codes = await self._region_repo.get_district_codes(district)
            if not district_codes:
                details.append(f"No regions found for district={district}")
                return SyncResponse(
                    status="failed", collected_count=0, error_count=1,
                    duration_seconds=round(time.monotonic() - start, 2),
                    details=details,
                )

            deal_ym = year_month if year_month else datetime.now().strftime("%Y%m")

            # 3개 전월세 API
            rent_apis: list[tuple[str, str, str]] = [
                (
                    "apartment",
                    "아파트",
                    "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent",
                ),
                (
                    "multiplex",
                    "연립다세대",
                    "https://apis.data.go.kr/1613000/RTMSDataSvcRHRent/getRTMSDataSvcRHRent",
                ),
                (
                    "officetel",
                    "오피스텔",
                    "https://apis.data.go.kr/1613000/RTMSDataSvcOffiRent/getRTMSDataSvcOffiRent",
                ),
            ]

            regions = await self._region_repo.get_all()
            region_map = {(r.district_name, r.dong_name): r.id for r in regions}

            all_trade_records: list[dict] = []

            for dist_name, dist_code in district_codes:
                if not dist_code:
                    details.append(f"{dist_name}: no district_code, skipping")
                    continue

                for bldg_type, bldg_label, api_url in rent_apis:
                    try:
                        data = await self._fetch_api(api_url, params={
                            "serviceKey": api_key,
                            "LAWD_CD": dist_code,
                            "DEAL_YMD": deal_ym,
                            "numOfRows": "1000",
                            "pageNo": "1",
                            "_type": "json",
                        }, timeout=30)

                        body = data.get("response", {}).get("body", {})
                        items = body.get("items", {})
                        rows = items.get("item", []) if items else []
                        if isinstance(rows, dict):
                            rows = [rows]

                        if not rows:
                            details.append(f"{dist_name}/{bldg_label}: no data")
                            continue

                        records = []
                        for row in rows:
                            dong = row.get("umdNm", "").strip()
                            region_id = region_map.get((dist_name, dong))
                            if not region_id:
                                continue

                            # 거래일
                            trade_date = None
                            try:
                                trade_date = date(
                                    int(row.get("dealYear", 0)),
                                    int(row.get("dealMonth", 0)),
                                    int(row.get("dealDay", 0)),
                                )
                            except (ValueError, TypeError):
                                pass

                            # 보증금 (deposit)
                            deposit_str = str(row.get("deposit", "0")).replace(",", "").strip()
                            try:
                                deposit = int(deposit_str)
                            except ValueError:
                                deposit = 0

                            # 월세
                            monthly_str = str(row.get("monthlyRent", "0")).replace(",", "").strip()
                            try:
                                monthly_rent = int(monthly_str)
                            except ValueError:
                                monthly_rent = 0

                            # 전세 vs 월세 구분
                            trade_type = "monthly" if monthly_rent > 0 else "jeonse"

                            # 건물명
                            building_name = (
                                row.get("aptNm")      # 아파트
                                or row.get("mhouseNm") # 연립다세대
                                or row.get("offiNm")   # 오피스텔
                                or None
                            )

                            records.append({
                                "region_id": region_id,
                                "trade_type": trade_type,
                                "building_type": bldg_type,
                                "building_name": building_name,
                                "exclusive_area": (
                                    float(row["excluUseAr"])
                                    if row.get("excluUseAr")
                                    else None
                                ),
                                "floor": (
                                    int(row["floor"])
                                    if row.get("floor") and str(row["floor"]).strip()
                                    else None
                                ),
                                "price": deposit,
                                "monthly_rent": monthly_rent if monthly_rent > 0 else None,
                                "build_year": (
                                    int(row["buildYear"])
                                    if row.get("buildYear")
                                    else None
                                ),
                                "trade_date": trade_date,
                                "address": row.get("jibun", None),
                            })

                        if records:
                            count = await self._real_estate_repo.bulk_upsert_trades(records)
                            collected += count
                            all_trade_records.extend(records)
                            details.append(f"{dist_name}/{bldg_label}: upserted {count} records")
                        else:
                            details.append(f"{dist_name}/{bldg_label}: no matching records")

                    except Exception as e:
                        errors += 1
                        details.append(f"{dist_name}/{bldg_label}: error - {e!s}")
                        logger.exception("Error syncing %s for %s", bldg_label, dist_name)

            # Aggregate to real estate summaries
            if all_trade_records:
                try:
                    summary_records = await self._aggregate_real_estate(
                        all_trade_records, region_map, deal_ym
                    )
                    if summary_records:
                        agg_count = (
                            await self._real_estate_repo.bulk_upsert_summary(
                                summary_records
                            )
                        )
                        details.append(
                            f"Aggregated {agg_count} real estate summaries"
                        )
                except Exception as e:
                    errors += 1
                    details.append(
                        f"Summary aggregation error: {e!s}"
                    )
                    logger.exception(
                        "Error aggregating real estate data"
                    )

            # Invalidate cache
            await self._cache.invalidate_pattern("realestate:*")
            await self._cache.invalidate_pattern("region:detail:*")

            status = "success" if errors == 0 else "partial"
            if collected == 0 and errors > 0:
                status = "failed"

        except Exception as e:
            logger.exception(
                "Unexpected error in sync_real_estate_data"
            )
            return SyncResponse(
                status="failed",
                collected_count=collected,
                error_count=errors + 1,
                duration_seconds=round(time.monotonic() - start, 2),
                details=[*details, f"Unexpected error: {e!s}"],
            )

        return SyncResponse(
            status=status,
            collected_count=collected,
            error_count=errors,
            duration_seconds=round(time.monotonic() - start, 2),
            details=details,
        )

    # ------------------------------------------------------------------
    # Real estate aggregation helper
    # ------------------------------------------------------------------

    async def _aggregate_real_estate(
        self,
        trade_records: list[dict],
        region_map: dict[tuple[str, str], int],
        deal_ym: str,
    ) -> list[dict]:
        """Aggregate trade records into summaries per region + trade_type."""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            _executor,
            self._sync_aggregate_real_estate,
            trade_records,
            region_map,
            deal_ym,
        )

    @staticmethod
    def _sync_aggregate_real_estate(
        records: list[dict],
        region_map: dict[tuple[str, str], int],
        deal_ym: str,
    ) -> list[dict]:
        import pandas as pd

        df = pd.DataFrame(records)
        if df.empty:
            return []

        # monthly_rent 컬럼이 없으면 0으로 채움
        if "monthly_rent" not in df.columns:
            df["monthly_rent"] = 0
        df["monthly_rent"] = df["monthly_rent"].fillna(0)

        summary = (
            df.groupby(["region_id", "trade_type", "building_type"])
            .agg(
                avg_price=("price", "mean"),
                min_price=("price", "min"),
                max_price=("price", "max"),
                avg_monthly_rent=("monthly_rent", "mean"),
                trade_count=("price", "count"),
            )
            .reset_index()
        )

        summary["avg_price"] = summary["avg_price"].round(0).astype(int)
        summary["avg_monthly_rent"] = summary["avg_monthly_rent"].round(0).astype(int)

        # Build period dates from deal_ym
        year = int(deal_ym[:4])
        month = int(deal_ym[4:6])
        period_start = date(year, month, 1)
        if month == 12:
            period_end = date(year + 1, 1, 1)
        else:
            period_end = date(year, month + 1, 1)

        result = []
        for _, row in summary.iterrows():
            region_id = int(row["region_id"])

            # Find district+dong for naver link
            district = ""
            dong = ""
            for (d, dn), rid in region_map.items():
                if rid == region_id:
                    district = d
                    dong = dn
                    break

            naver_link = (
                f"https://new.land.naver.com/search"
                f"?query={district}+{dong}"
            )

            result.append(
                {
                    "region_id": region_id,
                    "trade_type": row["trade_type"],
                    "building_type": row["building_type"],
                    "avg_price": int(row["avg_price"]),
                    "min_price": int(row["min_price"]),
                    "max_price": int(row["max_price"]),
                    "avg_monthly_rent": int(row["avg_monthly_rent"]),
                    "trade_count": int(row["trade_count"]),
                    "period_start": period_start,
                    "period_end": period_end,
                    "naver_link": naver_link,
                }
            )

        return result
