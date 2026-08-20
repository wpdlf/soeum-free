# 소음프리 (Soeum-Free)

서울시 소음·공사장·전월세 공공데이터를 통합해 **조용한 이사 지역**을 찾아주는 지도 서비스입니다.

## 주요 기능

- **소음 지도** — 서울 425개 행정동의 소음 수준을 색상 폴리곤으로 시각화
- **공사장 현황** — 진행 중인 대규모 공사장을 마커로 표시
- **전월세 정보** — 아파트/연립다세대/오피스텔 전월세 실거래가 요약
- **지역 검색** — 동 이름으로 검색 시 해당 위치로 지도 이동
- **지역 상세** — 소음/공사장/부동산 데이터를 탭으로 확인, 공사장 목록 더보기 지원
- **지역 비교** — 두 지역을 나란히 비교 (소음/공사장/부동산)
- **기간 필터** — 3개월/6개월/12개월 단위로 조회 기간 선택
- **다크 모드** — 라이트/다크 테마 전환 지원

## 기술 스택

| 구분 | 기술 |
|---|---|
| **Frontend** | Next.js 15, React, TypeScript, TanStack Query |
| **Backend** | FastAPI, SQLAlchemy (async), Pydantic v2 |
| **Database** | MySQL 8.0, Redis 7.0 |
| **Map** | Kakao Maps JavaScript SDK |
| **Infra** | Docker Compose |

## 데이터 소스

| 데이터 | 출처 | 용도 |
|---|---|---|
| 소음 측정 | 서울시 S-DoT (IoT 센서) | 동별 평균 소음 수준 |
| 대규모 공사장 | 행정안전부 공유플랫폼 (DSSP-IF-10684) | 공사장 마커 + 상세 정보 |
| 건설공사 현황 | 행정안전부 생활안전지도 (IF_0043) | 공사장 데이터 보완 (fallback) |
| 건축허가 | 국토교통부 건축인허가 (ArchPmsService_v2) | 공사장 데이터 보완 (fallback) |
| 비산먼지 공사장 | 행정안전부 비산먼지발생사업정보 | 진행 중인 공사장 수집 |
| 아파트 전월세 | 국토교통부 아파트 전월세 실거래가 | 전세/월세 평균, 범위 |
| 연립다세대 전월세 | 국토교통부 연립다세대 전월세 실거래가 | 전세/월세 평균, 범위 |
| 오피스텔 전월세 | 국토교통부 오피스텔 전월세 실거래가 | 전세/월세 평균, 범위 |
| 좌표 변환 | 카카오 로컬 API | 공사장 주소 → 좌표 지오코딩 |

> 데이터 수집은 자동 스케줄러 없이 sync API를 수동 호출하는 방식입니다.
> 수집된 데이터는 MySQL에 저장되고 Redis로 캐싱되어 사용자 요청 시 제공됩니다.

## 시작하기

### 사전 준비

- Docker & Docker Compose
- 아래 API 키 발급 필요

| 키 | 발급처 |
|---|---|
| DATA_GO_KR_API_KEY | [data.go.kr](https://www.data.go.kr/) — S-DoT 소음 데이터 |
| KAKAO_REST_API_KEY | [Kakao Developers](https://developers.kakao.com/) — REST API 키 |
| KAKAO_MAP_API_KEY | Kakao Developers — JavaScript 키 (+ Web 플랫폼 도메인 등록) |
| SAFEMAP_API_KEY | [safemap.go.kr](http://safemap.go.kr/) — 생활안전지도 |
| SAFETYDATA_API_KEY | [safetydata.go.kr](https://www.safetydata.go.kr/) — 공유플랫폼 |
| DUST_EMISSION_API_KEY | [data.go.kr](https://www.data.go.kr/) — 비산먼지발생사업정보 |

### 설치 및 실행

```bash
# 1. 저장소 클론
git clone https://github.com/wpdlf/soeum-free.git
cd soeum-free

# 2. 환경변수 설정
cp .env.example .env
cp frontend/.env.local.example frontend/.env.local
# .env 파일을 열어 API 키 입력

# 3. Docker 실행
docker compose up -d

# 4. 접속
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000/docs
```

### 데이터 수집

서비스 시작 후 API를 호출하여 데이터를 수집합니다.

```bash
# 소음 데이터 수집
curl -X POST http://localhost:8000/api/v1/data/sync/noise \
  -H "Content-Type: application/json" -d '{}'

# 공사장 데이터 수집 (SafetyData → SafeMap → 국토교통부 순으로 시도)
curl -X POST http://localhost:8000/api/v1/data/sync/construction \
  -H "Content-Type: application/json" -d '{}'

# 비산먼지 공사장 수집
curl -X POST http://localhost:8000/api/v1/data/sync/dust-emission \
  -H "Content-Type: application/json" -d '{}'

# 공사장 좌표 채우기 (카카오 지오코딩)
curl -X POST http://localhost:8000/api/v1/data/sync/construction/geocode \
  -H "Content-Type: application/json"

# 전월세 데이터 수집 (특정 월)
curl -X POST http://localhost:8000/api/v1/data/sync/real-estate \
  -H "Content-Type: application/json" -d '{"year_month": "202603"}'
```

## 프로젝트 구조

```
soeum-free/
├── backend/
│   ├── app/
│   │   ├── models/          # SQLAlchemy 모델
│   │   ├── repositories/    # DB 접근 계층
│   │   ├── routers/         # API 엔드포인트
│   │   ├── schemas/         # Pydantic 스키마
│   │   ├── services/        # 비즈니스 로직 (데이터 수집, 캐시)
│   │   └── utils/           # 유틸리티
│   ├── alembic/             # DB 마이그레이션
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js 페이지 (메인, 상세, 비교)
│   │   ├── components/
│   │   │   ├── layout/      # Header, 공통 레이아웃
│   │   │   ├── map/         # 카카오맵, 소음 폴리곤, 공사장 마커
│   │   │   ├── search/      # 지역 검색
│   │   │   └── ui/          # Card, Badge, ConstructionList 등
│   │   ├── contexts/        # Context (지도 상태)
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # API 클라이언트, 유틸
│   │   └── types/           # TypeScript 타입
│   ├── public/geo/          # 서울 행정동 GeoJSON
│   └── Dockerfile
├── db/init/                 # DB 초기 시드 데이터 (75개 행정동)
├── docker-compose.yml
└── .env.example
```

## API 엔드포인트

### 조회 API

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/v1/regions` | 전체 지역 목록 |
| GET | `/api/v1/regions/search?q=` | 지역 검색 |
| GET | `/api/v1/regions/{id}` | 지역 상세 (소음+공사장+부동산) |
| GET | `/api/v1/compare` | 두 지역 비교 |
| GET | `/api/v1/noise` | 소음 데이터 목록 |
| GET | `/api/v1/noise/map` | 소음 지도 데이터 |
| GET | `/api/v1/construction` | 공사장 데이터 목록 |
| GET | `/api/v1/construction/map` | 공사장 지도 데이터 |
| GET | `/api/v1/real-estate` | 전월세 데이터 목록 |
| GET | `/api/v1/real-estate/map` | 전월세 지도 데이터 |
| GET | `/api/v1/real-estate/link` | 네이버 부동산 링크 |

### 데이터 수집 API

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/v1/data/sync/noise` | 소음 데이터 수집 |
| POST | `/api/v1/data/sync/construction` | 공사장 데이터 수집 (3단계 fallback) |
| POST | `/api/v1/data/sync/dust-emission` | 비산먼지 데이터 수집 |
| POST | `/api/v1/data/sync/construction/geocode` | 공사장 좌표 변환 (카카오) |
| POST | `/api/v1/data/sync/real-estate` | 전월세 데이터 수집 |

## 라이선스

개인 포트폴리오 프로젝트로, 별도 오픈소스 라이선스를 적용하지 않습니다.
모든 권리는 저작권자에게 있으며, 코드의 복제·수정·재배포를 허용하지 않습니다.
수집 데이터는 각 공공데이터 제공기관의 이용약관을 따릅니다.
