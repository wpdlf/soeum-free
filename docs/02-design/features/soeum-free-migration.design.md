# SOEUM-FREE Migration Design

> Feature: soeum-free-migration
> Created: 2026-04-01
> Architecture: Option C — Pragmatic Balance
> Status: Draft

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 데모 수준의 프로토타입을 실제 서비스 가능한 웹 어플리케이션으로 전환 |
| **WHO** | 이사를 계획하는 사용자, 부동산 관계자, 소음에 민감한 거주자 |
| **RISK** | 공공데이터 API 서울 전체 커버리지 미확인, Kakao Map 무료 쿼터 제한, 데이터 실시간성 |
| **SUCCESS** | Docker Compose 원클릭 실행, 지역 검색/지도 시각화 동작, 공공 API 연동 완료 |
| **SCOPE** | 모노레포 마이그레이션 (기존 코드 전면 재작성) |

---

## 1. Overview

### 1.1 아키텍처 선택: Option C — Pragmatic Balance

| 레이어 | 설계 결정 |
|--------|-----------|
| Backend | Router → Service → Repository (3계층, DI 기반) |
| Frontend | CSR 메인 페이지 + SSR 지역 상세 페이지 |
| Caching | summary 데이터 + 검색 자동완성 전략적 캐싱 |
| DB | MySQL (원본 + 집계 테이블) + Redis (캐시 전용) |
| Infra | Docker Compose (MySQL + Redis + Backend + Frontend) |

### 1.2 전체 시스템 아키텍처

```
                        ┌──────────────────┐
                        │   사용자 브라우저   │
                        └────────┬─────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
              ┌─────▼─────┐          ┌───────▼───────┐
              │ Next.js    │          │ Kakao Map SDK │
              │ :3000      │          │ (JS, CDN)     │
              └─────┬──────┘          └───────────────┘
                    │ API 호출
              ┌─────▼──────────────────────────┐
              │          FastAPI :8000          │
              │  ┌────────┐  ┌───────────┐     │
              │  │ Router │→│  Service   │     │
              │  └────────┘  └─────┬─────┘     │
              │                    │           │
              │              ┌─────▼─────┐     │
              │              │Repository │     │
              │              └─────┬─────┘     │
              └────────────────────┼───────────┘
                         ┌────────┼────────┐
                    ┌────▼────┐       ┌───▼────┐
                    │ MySQL   │       │ Redis  │
                    │ :3306   │       │ :6379  │
                    └─────────┘       └────────┘

              ┌────────────────────────────────┐
              │      data.go.kr 공공 API        │
              │  (소음/공사장/실거래가)          │
              └────────────────────────────────┘
```

---

## 2. Backend Architecture

### 2.1 계층형 구조

```
backend/app/
├── main.py              # FastAPI 앱, CORS, 예외 핸들러
├── config.py            # pydantic-settings 환경변수
├── database.py          # AsyncEngine, AsyncSession, get_db
├── redis.py             # aioredis 연결풀, get_redis
├── models/              # SQLAlchemy ORM 모델
│   ├── __init__.py
│   ├── base.py          # Base = declarative_base()
│   ├── region.py        # Region
│   ├── noise.py         # NoiseRaw, NoiseSummary
│   ├── construction.py  # ConstructionPermit
│   └── real_estate.py   # RealEstateTrade, RealEstateSummary
├── schemas/             # Pydantic 요청/응답 스키마
│   ├── common.py        # PaginatedResponse, ErrorResponse
│   ├── region.py
│   ├── noise.py
│   ├── construction.py
│   ├── real_estate.py
│   └── data_sync.py
├── repositories/        # DB 쿼리 전담
│   ├── region_repo.py
│   ├── noise_repo.py
│   ├── construction_repo.py
│   └── real_estate_repo.py
├── services/            # 비즈니스 로직
│   ├── noise_service.py
│   ├── construction_service.py
│   ├── real_estate_service.py
│   ├── region_service.py
│   ├── data_collector.py  # 공공 API 수집 파이프라인
│   └── cache_service.py   # Redis 캐시 래퍼
├── routers/             # API 엔드포인트
│   ├── noise.py
│   ├── construction.py
│   ├── real_estate.py
│   ├── region.py
│   └── data_sync.py
└── utils/
    ├── noise_level.py   # 소음 수준 분류 + 색상 코딩
    └── geocoding.py     # Kakao REST API 좌표 변환
```

### 2.2 의존성 주입 패턴

```python
# Router → Service → Repository → DB/Redis

@router.get("/api/v1/noise")
async def get_noise(
    district: str | None = Query(None),
    dong: str | None = Query(None),
    date_from: date | None = Query(None, alias="from"),
    date_to: date | None = Query(None, alias="to"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    service: NoiseService = Depends(get_noise_service),
):
    return await service.get_noise_data(district, dong, date_from, date_to, page, size)

# Depends 체인:
# get_noise_service ← get_noise_repository ← get_db
#                   ← get_cache_service ← get_redis
```

### 2.3 Async/Sync 결정

| 작업 | 방식 | 이유 |
|------|------|------|
| DB 쿼리 | **async** (AsyncSession) | I/O 바운드 |
| Redis | **async** (redis.asyncio) | I/O 바운드 |
| 공공 API 호출 | **async** (httpx.AsyncClient) | 네트워크 I/O, asyncio.gather 병렬 |
| Pandas 집계 | **sync** → `run_in_executor` | CPU 바운드, 이벤트 루프 블로킹 방지 |

### 2.4 공통 스키마

```python
# PaginatedResponse - 페이지네이션 응답 래퍼
class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    size: int
    total_pages: int

# ErrorResponse - 표준 에러 응답
class ErrorResponse(BaseModel):
    error: str        # "NOT_FOUND", "VALIDATION_ERROR"
    message: str      # 사람이 읽을 수 있는 메시지
    detail: dict | list | None
    path: str
    timestamp: datetime
```

### 2.5 소음 수준 분류 (기존 로직 보존)

```python
# utils/noise_level.py
# 기존 app.py 322-329행 로직 그대로 이식

NOISE_LEVELS = {
    "very_loud": {"min_db": 70, "color": "black", "hex": "#171717", "label": "매우 시끄러움"},
    "loud":      {"min_db": 60, "color": "red",   "hex": "#ef4444", "label": "시끄러움"},
    "normal":    {"min_db": 50, "color": "yellow", "hex": "#eab308", "label": "보통"},
    "quiet":     {"min_db": 0,  "color": "green",  "hex": "#22c55e", "label": "조용"},
}

def classify_noise(avg_noise: float) -> tuple[str, str]:
    """Returns (noise_level, noise_color)"""
    if avg_noise > 70: return ("very_loud", "black")
    if avg_noise > 60: return ("loud", "red")
    if avg_noise > 50: return ("normal", "yellow")
    return ("quiet", "green")
```

---

## 3. API Design

### 3.1 엔드포인트 상세

| Method | Endpoint | Response | 기간 필터 | 캐시 TTL |
|--------|----------|----------|----------|---------|
| GET | `/api/v1/health` | `{"status":"ok"}` | - | - |
| GET | `/api/v1/regions` | `RegionResponse[]` | - | 24h |
| GET | `/api/v1/regions/{id}` | `RegionDetailResponse` | - | 15min |
| GET | `/api/v1/regions/search?q={query}` | `RegionSearchResponse` | - | 24h |
| GET | `/api/v1/noise?district=&dong=&from=&to=` | `PaginatedResponse[NoiseResponse]` | O | 5min |
| GET | `/api/v1/noise/map?bounds=&from=&to=` | `NoiseMapResponse` | O | 1h |
| GET | `/api/v1/construction?district=&from=&to=` | `PaginatedResponse[ConstructionResponse]` | O | 10min |
| GET | `/api/v1/construction/map?bounds=&from=&to=` | `ConstructionMapResponse` | O | 1h |
| GET | `/api/v1/real-estate?district=&dong=&from=&to=` | `PaginatedResponse[RealEstateResponse]` | O | 30min |
| GET | `/api/v1/real-estate/map?bounds=&from=&to=` | `RealEstateMapResponse` | O | 1h |
| GET | `/api/v1/real-estate/link?district=&dong=` | `NaverLinkResponse` | - | 7d |
| GET | `/api/v1/compare?regions={id1,id2}` | `CompareResponse` | - | 15min |
| POST | `/api/v1/data/sync/noise` | `SyncResponse` | - | - |
| POST | `/api/v1/data/sync/construction` | `SyncResponse` | - | - |
| POST | `/api/v1/data/sync/real-estate` | `SyncResponse` | - | - |

### 3.2 Redis 캐시 키 패턴

```
noise:summary:{bounds_hash}           TTL 1h
noise:data:{district}:{dong}:{from}:{to}:{page}  TTL 5min
construction:data:{district}:{from}:{to}:{page}  TTL 10min
real_estate:data:{district}:{dong}:{type}:{from}:{to}  TTL 30min
regions:all                            TTL 24h
regions:search:{query_prefix}          TTL 24h
region:detail:{id}                     TTL 15min
naver_link:{district}:{dong}           TTL 7d
```

### 3.3 데이터 수집 파이프라인

```
data.go.kr API → httpx (async, retry 3회)
    → Raw Parser (정규화/검증)
    → MySQL *_raw 테이블 (bulk insert)
    → Pandas 집계 (run_in_executor)
    → MySQL *_summary 테이블 (UPSERT)
    → Redis 캐시 무효화 (invalidate_pattern)
```

### 3.4 공공데이터 API 매핑

| 데이터 | API 서비스 | 호출 주기 |
|--------|-----------|----------|
| 소음측정 | 서울시 IoT 도시데이터 소음측정 API | 일 1회 |
| 건축허가 | 국토교통부 건축인허가 API | 주 1회 |
| 아파트 매매 | 국토교통부 아파트매매 실거래가 API | 월 1회 |
| 아파트 전월세 | 국토교통부 아파트 전월세 API | 월 1회 |
| 연립다세대 매매 | 국토교통부 연립다세대 매매 API | 월 1회 |
| 연립다세대 전월세 | 국토교통부 연립다세대 전월세 API | 월 1회 |

---

## 4. Database Design

### 4.1 테이블 관계도

```
regions (1) ──< noise_raw (N)
    │
    ├──── noise_summary (1:1)
    │
    ├──< construction_permits (N)
    │
    ├──< real_estate_trades (N)
    │
    └──< real_estate_summary (N, per trade_type)
```

### 4.2 인덱스 전략

| 테이블 | 인덱스 | 타입 | 용도 |
|--------|--------|------|------|
| regions | (district_name, dong_name) | UNIQUE | 중복 방지, 검색 |
| regions | (district_name) | INDEX | 구 단위 필터 |
| noise_raw | (region_id, measured_at) | COMPOSITE | 핵심 쿼리: 지역+기간 |
| noise_raw | (region_id, region_type, measured_at) | UNIQUE | 중복 수집 방지 |
| noise_summary | (region_id) | UNIQUE | 동 단위 1건 보장 |
| construction_permits | (region_id, permit_date) | COMPOSITE | 지역+기간 |
| construction_permits | (permit_number) | UNIQUE | 중복 방지 |
| real_estate_trades | (region_id, trade_type, trade_date) | COMPOSITE | 핵심 쿼리 |
| real_estate_summary | (region_id, trade_type) | UNIQUE | 동+유형 1건 |

### 4.3 regions 테이블 추가 컬럼

```sql
district_code VARCHAR(10) -- 법정동 코드 (5자리, 국토부 실거래가 API용)
```

---

## 5. Frontend Architecture

### 5.1 페이지 구조

| 경로 | 렌더링 | 핵심 컴포넌트 |
|------|--------|-------------|
| `/` | **CSR** | KakaoMap, RegionSearch, PeriodFilter, RegionInfoPanel |
| `/region/[id]` | **SSR** + CSR | RegionHeader, NoiseDetailCard, ConstructionDetailCard, RealEstateDetailCard |
| `/compare` | **CSR** | RegionSelector, ComparisonCard, ComparisonChart |

### 5.2 컴포넌트 트리

```
RootLayout
├── Header
├── MainPage (/)
│   ├── SidePanel (40% / 모바일: 하단)
│   │   ├── RegionSearch (자동완성)
│   │   ├── PeriodFilter (3/6/12개월 프리셋 + 커스텀)
│   │   ├── MapLayerToggle (소음/공사/부동산 on/off)
│   │   └── RegionInfoPanel
│   │       ├── NoiseTab
│   │       ├── ConstructionTab
│   │       └── RealEstateTab (+ NaverLinkButton)
│   └── MapContainer (60% / 모바일: 50vh 상단)
│       ├── KakaoMap
│       │   ├── NoisePolygonLayer[]   ← 행정동 경계 Polygon (GeoJSON)
│       │   ├── ConstructionMarker[]  ← 폴리곤 위 마커 오버레이
│       │   └── RealEstateMarker[]    ← 폴리곤 위 마커 오버레이
│       └── MapLegend
├── RegionDetailPage (/region/[id])
│   ├── RegionHeader + NoiseLevelBadge
│   ├── 3-column Grid (lg) / 탭 (mobile)
│   │   ├── NoiseDetailCard + NoiseChart
│   │   ├── ConstructionDetailCard + Timeline
│   │   └── RealEstateDetailCard + PriceChart + NaverLink
│   └── MiniKakaoMap
└── ComparePage (/compare)
    ├── RegionSelector (2개 선택)
    ├── ComparisonCard x2 (좌/우)
    └── ComparisonChart (오버레이)
```

### 5.3 UI Wireframe — 메인 페이지 (Desktop)

```
+---------------------------------------------------------------------+
|  [SOEUM-FREE]     메인  |  지역 비교                                 |
+---------------------------------------------------------------------+
|                          |                                           |
|  [돋보기] 지역 검색____  |        KAKAO MAP (60%)                    |
|  [3개월|6개월|12개월]    |                                           |
|  [v]소음 [v]공사 [v]부동산|   ┌────────┐초록  ▲공사장              |
|                          |   │역삼1동 │54dB                        |
|  ┌─ 지역 정보 ─────────┐ |   ├────────┤빨강    $실거래             |
|  │[소음|공사장|부동산]  │ |   │논현1동 │63dB                        |
|                          |   ├────────┤초록                        |
|                          |   │대치1동 │47dB                        |
|                          |   └────────┘                            |
|                          |  범례: 초록<50 노랑50-60 빨강60-70 검정>70|
|  │ 역삼1동, 강남구      │ |                                           |
|  │ 평균 소음: 54dB      │ |                                           |
|  │ [====노랑====]       │ |                                           |
|  │ 소음 등급: 보통       │ |                                           |
|  │ [상세보기 ->]         │ |                                           |
|  └─────────────────────┘ |                                           |
|          (40%)           |                                           |
+---------------------------------------------------------------------+
```

### 5.4 UI Wireframe — 메인 페이지 (Mobile)

```
+---------------------------+
| [=] SOEUM-FREE            |
+---------------------------+
|      KAKAO MAP (50vh)     |
|   (O)54dB  (O)63dB       |
|        범례: 초록/노랑/... |
+---------------------------+
| [돋보기] 지역 검색_______ |
| [3개월] [6개월] [12개월]  |
| [v]소음 [v]공사 [v]부동산 |
+---------------------------+
| [소음|공사장|부동산]      |
| 역삼1동, 강남구           |
| 평균 소음: 54dB           |
| [상세보기 ->]             |
+---------------------------+
```

### 5.5 디자인 시스템

**색상 팔레트**

| 용도 | 색상 | HEX | Tailwind |
|------|------|-----|----------|
| Primary | 남색 | #3b82f6 | blue-500 |
| Primary Hover | 진남색 | #2563eb | blue-600 |
| 소음 - 조용 | 초록 | #22c55e | green-500 |
| 소음 - 보통 | 노랑 | #eab308 | yellow-500 |
| 소음 - 시끄러움 | 빨강 | #ef4444 | red-500 |
| 소음 - 매우시끄러움 | 검정 | #171717 | neutral-900 |
| 공사장 - 진행중 | 빨강 | #ef4444 | red-500 |
| 공사장 - 허가 | 황색 | #f59e0b | amber-500 |
| 부동산 - 매매 | 보라 | #8b5cf6 | violet-500 |
| 부동산 - 전세 | 시안 | #06b6d4 | cyan-500 |
| 부동산 - 월세 | 주황 | #f97316 | orange-500 |
| Neutral BG | 흰색 | #ffffff | white |
| Neutral Border | 밝은 회색 | #e5e5e5 | neutral-200 |

**타이포그래피**: Pretendard (한글 최적화), 4px 그리드 간격 시스템

**Kakao Map 소음 Polygon (행정동 경계 Choropleth)**:
- 데이터 소스: `frontend/public/geo/seoul-dong.geojson` (정적 파일)
- 렌더링: `kakao.maps.Polygon`으로 행정동 경계 그리기
- fillColor: noise_level에 따른 HEX 코드 (green/yellow/red/black)
- fillOpacity: 0.35 (반투명, 지도 가독성 유지)
- strokeColor: #333333, strokeWeight: 2, strokeOpacity: 0.8
- 클릭 이벤트: 해당 동의 소음 상세 정보 InfoWindow 표시
- 호버 이벤트: fillOpacity → 0.6 (강조)
- 레이어 구조: L1 소음 Polygon → L2 공사장 Marker → L3 부동산 Marker

### 5.6 상태 관리

| 상태 | 관리 방식 | 이유 |
|------|----------|------|
| 서버 데이터 | TanStack Query v5 | 자동 캐싱/리페칭, staleTime 활용 |
| 필터 상태 | URL Search Params | URL 공유 시 동일 상태 복원 |
| 지도 상태 | React Context | map 인스턴스, bounds, zoom 공유 |

### 5.7 반응형 브레이크포인트

| 디바이스 | Tailwind | 레이아웃 |
|---------|----------|---------|
| Mobile (<768px) | 기본 | 수직: 지도 50vh 상단 + 검색/정보 하단 |
| Tablet (768~1023px) | md: | 수직: 지도 55vh + 하단 확장 |
| Desktop (1024px+) | lg: | 수평: 좌 패널 400px + 우 지도 flex-1 |

---

## 6. Infrastructure

### 6.1 Docker Compose 서비스 구성

```
docker compose up
  → mysql:8.0     (3306, health check, utf8mb4)
  → redis:7.0     (6379, health check, maxmemory 128mb)
  → backend       (8000, depends: mysql+redis healthy, alembic + uvicorn --reload)
  → frontend      (3000, depends: backend, pnpm dev)
  → soeum-network (bridge, 서비스간 DNS)
  → mysql_data    (named volume, 영속)
```

### 6.2 환경변수 (.env)

```bash
# Database
MYSQL_ROOT_PASSWORD=soeum_root_2024
MYSQL_DATABASE=soeum
MYSQL_USER=soeum_user
MYSQL_PASSWORD=soeum_pass_2024

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# External APIs
DATA_GO_KR_API_KEY=your_key_here
KAKAO_REST_API_KEY=your_key_here   # Backend: 좌표변환
KAKAO_MAP_API_KEY=your_key_here    # Frontend: 지도

# App
DEBUG=true
```

### 6.3 개발 워크플로우

```bash
cp .env.example .env       # API 키 입력
docker compose up --build  # 원클릭 실행
# MySQL 초기화 → Alembic 마이그레이션 → uvicorn + next dev 자동 시작
```

### 6.4 Windows 특이사항

- `.gitattributes`: `* text=auto eol=lf` (Docker Linux 컨테이너 호환)
- Hot-reload: `WATCHPACK_POLLING=true` 환경변수 추가 (Docker Desktop 파일 감시)
- `node_modules`: anonymous volume으로 격리 (Windows/Linux 바이너리 비호환)

### 6.5 시드 데이터

- `db/init/01_seed_regions.sql`: 서울 25개 구 + 행정동 + 위경도 (최초 컨테이너 생성 시 자동)
- 공공 API 데이터: `POST /api/v1/data/sync/*` 수동 호출로 수집

---

## 7. Security

| 항목 | 구현 방식 |
|------|-----------|
| API 키 관리 | pydantic-settings (.env 파일) |
| CORS | FastAPI CORSMiddleware, allow_origins=["http://localhost:3000"] |
| SQL Injection | SQLAlchemy ORM 파라미터화 쿼리만 사용 |
| Rate Limiting | slowapi, Redis 기반, 60req/min 기본 |
| data-sync 보호 | X-API-Key 헤더 인증 |
| API docs 노출 | DEBUG=true일 때만 /docs 활성화 |

---

## 8. Test Plan

| 레벨 | 대상 | 도구 |
|------|------|------|
| Unit | Service/Repository 메서드 | pytest + pytest-asyncio |
| API | FastAPI 엔드포인트 | httpx + TestClient |
| Frontend | 컴포넌트 렌더링 | Jest + React Testing Library |
| E2E | 전체 사용자 플로우 | Playwright (향후) |

---

## 9. Risk & Mitigation

| Risk | Mitigation |
|------|------------|
| 공공 API 서울 전체 미커버 | API 응답 조사 후 커버리지 매핑, 부족 시 순차 확장 |
| Kakao Map 쿼터 | 로컬 개발에서 충분, 프로덕션 시 유료 전환 |
| 공공 API 장애 | Redis 캐시 반환 (stale data), tenacity 재시도 3회 |
| Windows Docker 성능 | 폴링 모드 활성화, volume 격리 |
| `from` Python 예약어 | `Query(alias="from")` + `date_from` 변수명 |

---

## 10. Dependencies

### 10.1 Backend (requirements.txt)

```
fastapi==0.115.6
uvicorn[standard]==0.34.0
sqlalchemy==2.0.36
alembic==1.14.1
mysqlclient==2.2.6
redis==5.2.1
httpx==0.28.1
pandas==2.2.3
pydantic==2.10.4
pydantic-settings==2.7.1
slowapi==0.1.9
tenacity==9.0.0
ruff==0.9.4
```

### 10.2 Frontend (package.json)

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@tanstack/react-query": "^5.0.0",
    "recharts": "^2.12.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "tailwindcss": "^4.0.0",
    "@types/react": "^19.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0"
  }
}
```

---

## 11. Implementation Guide

### 11.1 Module Map

| Module | 범위 | 핵심 파일 |
|--------|------|----------|
| **M1: Infrastructure** | Docker Compose, Dockerfile, .env, .gitignore, .gitattributes | docker-compose.yml, backend/Dockerfile, frontend/Dockerfile |
| **M2: Database** | SQLAlchemy 모델, Alembic 마이그레이션, 시드 데이터 | models/*.py, alembic/versions/, db/init/01_seed_regions.sql |
| **M3: Data Pipeline** | 공공 API 수집기, Pandas 집계, Redis 캐싱 | services/data_collector.py, services/cache_service.py |
| **M4: Backend API** | FastAPI 라우터, 서비스, 리포지토리 | routers/*.py, services/*.py, repositories/*.py |
| **M5: Frontend Base** | Next.js 세팅, Kakao Map, 기본 레이아웃 | app/layout.tsx, app/page.tsx, components/map/*.tsx |
| **M6: Integration** | API 클라이언트, 검색, 필터, 소음 시각화 | lib/api.ts, hooks/*.ts, components/search/*.tsx |
| **M7: Construction** | 공사장 마커, 공사장 탭 | ConstructionMarker.tsx, ConstructionTab.tsx |
| **M8: Real Estate** | 부동산 마커, 부동산 탭, 네이버 링크 | RealEstateMarker.tsx, RealEstateTab.tsx, NaverLinkButton.tsx |
| **M9: Polish** | 종합 정보 패널, 반응형, 상세/비교 페이지 | RegionInfoPanel.tsx, region/[id]/page.tsx, compare/page.tsx |

### 11.2 Implementation Order

```
M1 (Infra) ──→ M2 (DB) ──→ M3 (Data Pipeline) ──→ M4 (Backend API)
                                                         │
M1 (Infra) ──→ M5 (Frontend Base) ──────────────────────→ M6 (Integration)
                                                         │
                                              M7 (Construction) ──→ M9 (Polish)
                                              M8 (Real Estate)  ──→ M9 (Polish)
```

### 11.3 Session Guide

| Session | Module | Scope | 산출물 |
|---------|--------|-------|--------|
| **Session 1** | M1 + M2 | Docker Compose + DB 모델 + 시드 데이터 | `docker compose up` 으로 전체 스택 기동 |
| **Session 2** | M3 + M4 | 공공 API 수집기 + FastAPI 라우터 전체 | API docs(/docs)에서 전체 엔드포인트 테스트 가능 |
| **Session 3** | M5 + M6 | Next.js + Kakao Map + 소음 시각화 + 검색/필터 | 지도에 소음 원형 오버레이 표시 + 검색 동작 |
| **Session 4** | M7 + M8 | 공사장 + 부동산 데이터 통합 | 지도에 3종 데이터 모두 표시 |
| **Session 5** | M9 | 종합 정보 패널 + 반응형 + 상세/비교 페이지 | 서비스 완성 |
