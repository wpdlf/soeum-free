# SOEUM-FREE Migration Plan

> Feature: soeum-free-migration
> Created: 2026-04-01
> Status: Draft
> Level: Dynamic

---

## Executive Summary

| Perspective | Description |
|-------------|-------------|
| **Problem** | 기존 데모 소스는 이중 백엔드(FastAPI+Express), 이중 DB(MongoDB+MySQL), 하드코딩된 API 키/IP, 서버 사이드 지도 생성(Folium) 등으로 서비스 배포 및 유지보수가 불가능한 상태 |
| **Solution** | FastAPI + Next.js + MySQL + Redis + Kakao Map JS SDK + Docker Compose 기반의 모노레포 구조로 완전 마이그레이션하여 서비스 가능한 수준으로 고도화 |
| **Function UX Effect** | 실시간 인터랙티브 지도에서 소음 수준 + 공사장 인허가 + 부동산 실거래가를 통합 시각화하고, 지역 검색/비교 기능 제공 |
| **Core Value** | "조용한 이사 지역 찾기" — 소음·공사장·부동산 데이터를 결합하여 사용자가 거주 환경과 가격을 한 눈에 비교하고 이사 의사결정을 내릴 수 있는 플랫폼 |

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 데모 수준의 프로토타입을 실제 서비스 가능한 웹 어플리케이션으로 전환 |
| **WHO** | 이사를 계획하는 사용자, 부동산 관계자, 소음에 민감한 거주자 |
| **RISK** | 공공데이터 API 서울 전체 커버리지 미확인, Kakao Map 무료 쿼터 제한, 데이터 실시간성 |
| **SUCCESS** | Docker Compose 원클릭 실행, 지역 검색/지도 시각화 동작, 공공 API 연동 완료 |
| **SCOPE** | 모노레포 마이그레이션 (기존 코드 전면 재작성) |

---

## 1. Background & Motivation

### 1.1 현재 상태 (AS-IS)

현재 SOEUM-FREE는 학습 목적으로 만든 데모 프로젝트로, 다음과 같은 구조적 문제가 있다:

- **이중 백엔드**: FastAPI(포트 5000) + Express.js(포트 8000)가 하드코딩된 IP(`192.168.1.158`)로 상호 호출
- **이중 DB**: MongoDB Atlas(소음 데이터 저장) + MySQL(사용자 데이터) 혼용
- **보안 취약점**: Kakao API 키, Naver Papago API 키가 소스 코드에 하드코딩
- **지도 생성 방식**: Folium(Python)으로 서버에서 HTML 파일을 생성 후 정적 파일로 반환 → 실시간 인터랙션 불가
- **프론트엔드**: 순수 HTML + 인라인 CSS, form submit 방식의 검색
- **데이터 범위**: 서울 4개 구(강남, 관악, 금천, 영등포)만 하드코딩
- **번역 의존**: 영문 지역명을 Naver Papago로 한글 번역 → 불필요한 외부 API 의존

### 1.2 목표 상태 (TO-BE)

서비스 가능한 수준의 웹 어플리케이션으로 전환한다:

- **단일 백엔드**: FastAPI로 통합, RESTful API 설계
- **단일 DB**: MySQL(정형 데이터) + Redis(캐싱/세션)
- **보안**: 환경변수(.env) 기반 키 관리, CORS 설정
- **인터랙티브 지도**: Kakao Map JS SDK로 실시간 지도 인터랙션
- **현대적 프론트엔드**: Next.js App Router, 반응형 디자인
- **확장 가능한 데이터**: 공공데이터 포털 API 직접 연동, 서울 전체 커버리지 목표
- **공사장 데이터 통합**: 소음 + 공사장 인허가 데이터 결합 시각화
- **부동산 실거래가 통합**: 국토교통부 실거래가 API 연동 (매매+전월세) + 네이버 부동산 매물 링크
- **로컬 개발**: Docker Compose로 원클릭 개발 환경 구축

---

## 2. Requirements

### 2.1 Functional Requirements

| ID | 요구사항 | 우선순위 | 설명 |
|----|---------|----------|------|
| FR-01 | 지역 소음 데이터 조회 API | P0 | 구/동 단위 소음 데이터 CRUD API |
| FR-02 | 공사장 인허가 데이터 조회 API | P0 | 지역별 공사장 인허가 현황 API |
| FR-03 | 공공데이터 포털 API 연동 | P0 | data.go.kr 소음측정/건축허가 데이터 수집 |
| FR-04 | 인터랙티브 지도 시각화 | P0 | Kakao Map에 소음 수준 히트맵/마커 표시 |
| FR-05 | 지역 검색 + 기간 필터 | P0 | 구/동 이름 검색(자동완성) + 기간 프리셋(최근 3/6/12개월) 및 직접 입력 |
| FR-06 | 공사장 데이터 지도 오버레이 | P1 | 지도에 공사장 위치/규모 마커 표시 |
| FR-07 | 지역 비교 기능 | P1 | 2~3개 지역의 소음/공사/부동산 현황 비교 |
| FR-08 | 데이터 정기 수집 스케줄러 | P1 | 공공데이터 주기적 수집 (Cron/Celery) |
| FR-09 | 소음 수준별 색상 코딩 | P0 | 기존 로직 유지: >70dB(검정), 60-70(빨강), 50-60(노랑), <50(초록) |
| FR-10 | 반응형 웹 디자인 | P1 | 모바일/태블릿/데스크톱 대응 |
| FR-11 | 부동산 실거래가 조회 API | P0 | 국토교통부 실거래가 API 연동 (아파트/연립다세대 매매·전월세) |
| FR-12 | 부동산 실거래가 지도 시각화 | P1 | 지도에 동별 평균 실거래가 마커/정보창 표시 |
| FR-13 | 부동산 매물 외부 링크 | P1 | 검색된 지역의 네이버 부동산 매물 페이지로 링크 연결 |
| FR-14 | 지역 종합 정보 패널 | P0 | 소음·공사장·부동산 정보를 탭/패널로 통합 제공 |

### 2.2 Non-Functional Requirements

| ID | 요구사항 | 기준 |
|----|---------|------|
| NFR-01 | 로컬 개발 환경 | Docker Compose 원클릭 실행 |
| NFR-02 | API 응답 시간 | < 500ms (캐시 적용 시 < 100ms) |
| NFR-03 | 보안 | API 키 환경변수 관리, CORS 설정, SQL Injection 방지 |
| NFR-04 | 코드 품질 | Python: Ruff linter, TypeScript: ESLint |
| NFR-05 | 확장성 | 서울 외 지역 추가 시 코드 수정 최소화 |
| NFR-06 | 데이터 캐싱 | Redis를 활용한 공공 API 응답 캐싱 |

---

## 3. Tech Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Backend Framework** | FastAPI | 0.115+ | 기존 Python 데이터 처리 코드 재활용, 비동기 지원, 자동 API docs |
| **Backend Language** | Python | 3.12+ | Pandas, geopy 등 데이터 처리 라이브러리 호환 |
| **ORM** | SQLAlchemy | 2.0+ | MySQL 연동, 마이그레이션(Alembic) 지원 |
| **Database** | MySQL | 8.0+ | 정형 데이터(지역, 소음, 공사장), 공간 인덱스 지원 |
| **Cache** | Redis | 7.0+ | 공공 API 응답 캐싱, 세션 관리 |
| **Frontend Framework** | Next.js | 15+ | App Router, SSR/SEO, React 기반 |
| **Frontend Language** | TypeScript | 5.0+ | 타입 안정성 |
| **Map SDK** | Kakao Map JS SDK | v3 | 한국 주소 체계 지원, 무료 쿼터 충분 |
| **Styling** | Tailwind CSS | 4.0+ | 유틸리티 기반 빠른 스타일링 |
| **Container** | Docker Compose | v2 | 로컬 개발 환경 통합 관리 |
| **Data Processing** | Pandas | 2.0+ | 소음 데이터 집계/변환 |
| **HTTP Client** | httpx | 0.27+ | 비동기 HTTP 클라이언트 (공공 API 호출) |

---

## 4. Project Structure (Monorepo)

```
soeum-free/
├── backend/                     # FastAPI Backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI 앱 엔트리포인트
│   │   ├── config.py            # 환경변수 설정
│   │   ├── database.py          # DB 연결 (SQLAlchemy)
│   │   ├── models/              # SQLAlchemy 모델
│   │   │   ├── noise.py         # 소음 데이터 모델
│   │   │   ├── construction.py  # 공사장 인허가 모델
│   │   │   ├── real_estate.py   # 부동산 실거래가 모델
│   │   │   └── region.py        # 지역(구/동) 모델
│   │   ├── schemas/             # Pydantic 스키마
│   │   ├── routers/             # API 라우터
│   │   │   ├── noise.py         # 소음 데이터 API
│   │   │   ├── construction.py  # 공사장 데이터 API
│   │   │   ├── real_estate.py   # 부동산 실거래가 API
│   │   │   ├── region.py        # 지역 검색 API
│   │   │   └── data_sync.py     # 공공데이터 수집 API
│   │   ├── services/            # 비즈니스 로직
│   │   │   ├── noise_service.py
│   │   │   ├── construction_service.py
│   │   │   ├── real_estate_service.py # 부동산 실거래가
│   │   │   ├── data_collector.py # 공공데이터 수집기
│   │   │   └── cache_service.py  # Redis 캐시
│   │   └── utils/
│   │       ├── geocoding.py     # 좌표 변환 유틸
│   │       └── noise_level.py   # 소음 수준 분류 (색상 코딩)
│   ├── alembic/                 # DB 마이그레이션
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/                    # Next.js Frontend
│   ├── public/
│   │   └── geo/
│   │       └── seoul-dong.geojson  # 서울 행정동 경계 GeoJSON (정적)
│   ├── src/
│   │   ├── app/                 # App Router
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx         # 메인 페이지 (지도 + 검색)
│   │   │   ├── region/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx # 지역 상세 페이지
│   │   │   └── compare/
│   │   │       └── page.tsx     # 지역 비교 페이지
│   │   ├── components/
│   │   │   ├── map/
│   │   │   │   ├── KakaoMap.tsx        # 카카오 맵 컴포넌트
│   │   │   │   ├── NoiseMarker.tsx     # 소음 마커
│   │   │   │   ├── ConstructionMarker.tsx # 공사장 마커
│   │   │   │   └── RealEstateMarker.tsx # 실거래가 마커
│   │   │   ├── search/
│   │   │   │   ├── RegionSearch.tsx    # 지역 검색 + 자동완성
│   │   │   │   └── PeriodFilter.tsx    # 기간 필터 (프리셋 + 직접 입력)
│   │   │   └── ui/
│   │   │       ├── NoiseLevel.tsx      # 소음 수준 표시
│   │   │       ├── RegionCard.tsx      # 지역 정보 카드
│   │   │       └── RegionInfoPanel.tsx # 종합 정보 패널 (소음/공사/부동산 탭)
│   │   ├── lib/
│   │   │   ├── api.ts           # Backend API 클라이언트
│   │   │   └── kakaoMap.ts      # Kakao Map 유틸
│   │   └── types/
│   │       └── index.ts         # 타입 정의
│   ├── package.json
│   ├── Dockerfile
│   └── .env.local.example
├── docker-compose.yml           # MySQL + Redis + Backend + Frontend
├── .env.example                 # 전체 환경변수 템플릿
├── .gitignore
├── CLAUDE.md
└── docs/                        # PDCA 문서
```

---

## 5. Data Model

### 5.1 regions (지역)

| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT PK | 자동 증가 |
| district_name | VARCHAR(50) | 구 이름 (e.g., 강남구) |
| dong_name | VARCHAR(50) | 동 이름 (e.g., 역삼1동) |
| latitude | DECIMAL(10,7) | 위도 |
| longitude | DECIMAL(10,7) | 경도 |
| created_at | DATETIME | 생성일 |

### 5.2 noise_raw (소음 원본 데이터)

| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT PK | 자동 증가 |
| region_id | BIGINT FK | regions.id |
| region_type | ENUM | 'residential', 'road_park', 'main_street' |
| max_noise | FLOAT | 최대 소음 (dB) |
| min_noise | FLOAT | 최소 소음 (dB) |
| avg_noise | FLOAT | 평균 소음 (dB) |
| measured_at | DATE | 측정일 |
| source | VARCHAR(50) | 데이터 출처 (data.go.kr) |
| created_at | DATETIME | 수집일 |

### 5.3 noise_summary (시각화용 집계 데이터)

> 기존 MongoDB 역할 대체 — 공공 API 원본을 Pandas로 가공 후 UPSERT하여 프론트엔드 시각화에 최적화된 데이터를 저장

| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT PK | 자동 증가 |
| region_id | BIGINT FK (UNIQUE) | regions.id (동 단위 1건) |
| avg_noise | FLOAT | 동 평균 소음 (dB) |
| noise_level | ENUM | 'quiet'(<50), 'normal'(50-60), 'loud'(60-70), 'very_loud'(>70) |
| noise_color | VARCHAR(10) | 시각화 색상: green/yellow/red/black |
| sample_count | INT | 집계에 사용된 측정 건수 |
| period_start | DATE | 집계 기간 시작일 |
| period_end | DATE | 집계 기간 종료일 |
| updated_at | DATETIME | 마지막 집계일 |

**데이터 흐름**: `공공 API → noise_raw 저장 → Pandas 집계 → noise_summary UPSERT → Redis 캐시 → 프론트엔드`

### 5.4 construction_permits (공사장 인허가)

| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT PK | 자동 증가 |
| region_id | BIGINT FK | regions.id |
| permit_number | VARCHAR(50) | 인허가 번호 |
| project_name | VARCHAR(200) | 공사명 |
| building_type | VARCHAR(100) | 건축 용도 |
| permit_date | DATE | 인허가일 |
| start_date | DATE | 착공일 (nullable) |
| end_date | DATE | 준공 예정일 (nullable) |
| address | VARCHAR(300) | 공사장 주소 |
| latitude | DECIMAL(10,7) | 위도 |
| longitude | DECIMAL(10,7) | 경도 |
| status | ENUM | 'permitted', 'in_progress', 'completed' |
| created_at | DATETIME | 수집일 |

### 5.5 real_estate_trades (부동산 실거래가)

> 국토교통부 실거래가 API 데이터 저장 (매매 + 전월세)

| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT PK | 자동 증가 |
| region_id | BIGINT FK | regions.id |
| trade_type | ENUM | 'sale'(매매), 'jeonse'(전세), 'monthly'(월세) |
| building_type | ENUM | 'apartment', 'villa', 'officetel', 'house' |
| building_name | VARCHAR(100) | 건물명 (e.g., 래미안) |
| exclusive_area | FLOAT | 전용면적 (m2) |
| floor | INT | 층 (nullable) |
| price | INT | 매매가/보증금 (만원) |
| monthly_rent | INT | 월세 (만원, 월세일 때만) |
| build_year | INT | 건축년도 |
| trade_date | DATE | 거래일 |
| address | VARCHAR(300) | 상세 주소 |
| created_at | DATETIME | 수집일 |

### 5.6 real_estate_summary (부동산 집계 데이터)

| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT PK | 자동 증가 |
| region_id | BIGINT FK (UNIQUE per trade_type) | regions.id |
| trade_type | ENUM | 'sale', 'jeonse', 'monthly' |
| avg_price | INT | 동 평균 가격 (만원) |
| min_price | INT | 최저 가격 |
| max_price | INT | 최고 가격 |
| trade_count | INT | 거래 건수 |
| period_start | DATE | 집계 기간 시작일 |
| period_end | DATE | 집계 기간 종료일 |
| naver_link | VARCHAR(500) | 네이버 부동산 해당 지역 URL |
| updated_at | DATETIME | 마지막 집계일 |

---

## 6. API Design

### 6.1 Backend API (FastAPI)

| Method | Endpoint | Description | Priority |
|--------|----------|-------------|----------|
| GET | `/api/v1/health` | 헬스 체크 | P0 |
| GET | `/api/v1/regions` | 전체 지역 목록 (구/동) | P0 |
| GET | `/api/v1/regions/{id}` | 지역 상세 (소음+공사장 통합) | P0 |
| GET | `/api/v1/regions/search?q={query}` | 지역 검색 (자동완성) | P0 |
| GET | `/api/v1/noise?district={구}&dong={동}&from={date}&to={date}` | 소음 데이터 조회 (기간 필터) | P0 |
| GET | `/api/v1/noise/map?bounds={bbox}&from={date}&to={date}` | 지도 영역 내 소음 데이터 | P0 |
| GET | `/api/v1/construction?district={구}&from={date}&to={date}` | 공사장 인허가 조회 (기간 필터) | P0 |
| GET | `/api/v1/construction/map?bounds={bbox}&from={date}&to={date}` | 지도 영역 내 공사장 데이터 | P1 |
| GET | `/api/v1/real-estate?district={구}&dong={동}&from={date}&to={date}` | 부동산 실거래가 조회 (기간 필터) | P0 |
| GET | `/api/v1/real-estate/map?bounds={bbox}&from={date}&to={date}` | 지도 영역 내 부동산 집계 | P1 |
| GET | `/api/v1/real-estate/link?district={구}&dong={동}` | 네이버 부동산 매물 URL | P1 |
| GET | `/api/v1/compare?regions={id1,id2}` | 지역 비교 (소음+공사+부동산) | P1 |
| POST | `/api/v1/data/sync/noise` | 소음 데이터 수동 수집 | P1 |
| POST | `/api/v1/data/sync/construction` | 공사장 데이터 수동 수집 | P1 |
| POST | `/api/v1/data/sync/real-estate` | 부동산 실거래가 수동 수집 | P1 |

### 6.2 공공데이터 API 연동

| 데이터 | API | 용도 |
|--------|-----|------|
| 소음측정 데이터 | data.go.kr 소음진동측정 API | 지역별 소음 수준 |
| 건축허가 데이터 | data.go.kr 건축인허가 API | 공사장 위치/현황 |
| 아파트 매매 실거래가 | data.go.kr 국토교통부 아파트매매 실거래가 API | 아파트 매매 가격 |
| 아파트 전월세 실거래가 | data.go.kr 국토교통부 아파트 전월세 API | 아파트 전월세 가격 |
| 연립다세대 매매 실거래가 | data.go.kr 국토교통부 연립다세대 매매 API | 연립/빌라 매매 가격 |
| 연립다세대 전월세 실거래가 | data.go.kr 국토교통부 연립다세대 전월세 API | 연립/빌라 전월세 가격 |

---

## 7. Migration Strategy

기존 코드를 참고하되 전면 재작성(Clean Rewrite) 방식으로 진행한다.

### 7.1 마이그레이션 단계

| Phase | 작업 | 산출물 | 의존성 |
|-------|------|--------|--------|
| **Phase 1** | 프로젝트 구조 + Docker Compose 세팅 | 모노레포 스캐폴딩, Docker 실행 환경 | 없음 |
| **Phase 2** | DB 스키마 + 모델 정의 | SQLAlchemy 모델, Alembic 마이그레이션 | Phase 1 |
| **Phase 3** | 공공데이터 수집기 구현 | data.go.kr API 연동, 데이터 파이프라인 | Phase 2 |
| **Phase 4** | Backend API 구현 | FastAPI 라우터, 서비스 레이어 | Phase 2 |
| **Phase 5** | Frontend 기본 구조 + 지도 | Next.js 세팅, Kakao Map 연동 | Phase 1 |
| **Phase 6** | Frontend-Backend 연동 | API 클라이언트, 데이터 바인딩 | Phase 4, 5 |
| **Phase 7** | 공사장 데이터 통합 | 공사장 마커 오버레이, 통합 뷰 | Phase 6 |
| **Phase 8** | 부동산 실거래가 통합 | 실거래가 API 연동, 지도 마커, 정보 패널, 네이버 부동산 링크 | Phase 6 |
| **Phase 9** | UI 고도화 + 반응형 | Tailwind CSS, 모바일 대응 | Phase 7, 8 |

### 7.2 기존 코드 재활용 항목

| 기존 코드 | 재활용 내용 | 변환 방식 |
|-----------|------------|-----------|
| `app.py` 소음 데이터 처리 로직 | Pandas 집계/평균 계산 로직 | `noise_service.py`로 이동 |
| `app.py` 소음 수준 색상 분류 | >70(검정), 60-70(빨강), 50-60(노랑), <50(초록) | `noise_level.py` 유틸로 분리 |
| `seoulmap.py` Kakao geocoding | 주소→좌표 변환 | `geocoding.py` 유틸로 이동 |
| MongoDB 데이터 구조 | 문서 스키마 → MySQL 테이블 설계 참고 | `models/` SQLAlchemy 모델로 변환 |

### 7.3 제거 대상

| 기존 코드 | 제거 사유 |
|-----------|-----------|
| Express.js (app.js, routes/main.js) | FastAPI 단일 백엔드로 통합 |
| MongoDB Atlas 연동 | MySQL로 대체 |
| Naver Papago 번역 API | 공공데이터가 한글 제공, 번역 불필요 |
| Folium 지도 생성 | Kakao Map JS SDK로 대체 |
| 하드코딩된 IP/API 키 | 환경변수(.env)로 대체 |

---

## 8. Risk & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| 공공데이터 API가 서울 전체를 커버하지 않을 수 있음 | High | Medium | API 문서 사전 조사, 부족 시 구별 순차 확장 |
| Kakao Map 무료 쿼터 제한 (일 300,000건) | Low | Low | 로컬 개발 수준에서는 충분, 프로덕션 시 유료 전환 검토 |
| 공공데이터 API 응답 지연/장애 | Medium | Medium | Redis 캐싱으로 API 호출 최소화, 실패 시 캐시 데이터 반환 |
| 기존 데이터 구조와 공공 API 데이터 구조 불일치 | Medium | High | 데이터 수집기에서 정규화 레이어 구현 |
| 국토교통부 실거래가 API 호출 제한 | Medium | Medium | Redis 캐싱, 일 1회 배치 수집으로 호출 최소화 |
| 네이버 부동산 URL 구조 변경 가능성 | Low | Low | URL 패턴을 설정 파일로 관리, 변경 시 설정만 수정 |

---

## 9. Success Criteria

| ID | 기준 | 측정 방법 |
|----|------|-----------|
| SC-01 | Docker Compose로 전체 스택 원클릭 실행 | `docker compose up` 으로 모든 서비스 정상 기동 |
| SC-02 | 구/동 검색 → 소음 데이터 조회 동작 | API 호출 및 프론트엔드에서 결과 표시 |
| SC-03 | Kakao Map에 소음 수준 시각화 | 색상 코딩된 마커/원이 지도에 표시 |
| SC-04 | 공사장 인허가 데이터 지도 오버레이 | 공사장 마커가 지도에 표시 |
| SC-05 | 공공데이터 포털 API 연동 동작 | data.go.kr API로 데이터 수집 성공 |
| SC-06 | API 키가 소스 코드에 없음 | .env 파일로 관리, .gitignore에 포함 |
| SC-07 | API 응답 시간 < 500ms | 캐시 적용 후 주요 엔드포인트 응답 시간 측정 |
| SC-08 | 부동산 실거래가 조회 동작 | 구/동 검색 시 매매·전월세 가격 정보 표시 |
| SC-09 | 종합 정보 패널에서 소음·공사·부동산 탭 전환 | 3가지 데이터가 탭으로 통합 표시 |
| SC-10 | 네이버 부동산 매물 링크 동작 | 해당 지역 네이버 부동산 페이지로 정상 이동 |

---

## 10. Out of Scope (이번 마이그레이션에 포함하지 않음)

- 사용자 인증/회원가입 (향후 별도 Feature로 진행)
- 프로덕션 배포 (AWS/Terraform) — 로컬 개발 환경 구축이 우선
- 실시간 소음 모니터링 (WebSocket)
- 모바일 앱 (React Native)
- 관리자 대시보드
- 소음 예측 AI 모델

---

## 11. Implementation Guide

### 11.1 Implementation Order

1. **Module 1: Infrastructure** — Docker Compose + 모노레포 스캐폴딩
2. **Module 2: Database** — MySQL 스키마 + SQLAlchemy 모델 + Alembic
3. **Module 3: Data Pipeline** — 공공데이터 수집기 (소음 + 공사 + 부동산) + Redis 캐싱
4. **Module 4: Backend API** — FastAPI 라우터 + 서비스 레이어
5. **Module 5: Frontend Base** — Next.js 세팅 + Kakao Map 연동
6. **Module 6: Integration** — Frontend-Backend 연동 + 소음 지도 시각화
7. **Module 7: Construction Data** — 공사장 인허가 데이터 통합
8. **Module 8: Real Estate** — 부동산 실거래가 통합 + 네이버 부동산 링크
9. **Module 9: Polish** — 종합 정보 패널 + 반응형 디자인 + UI 고도화

### 11.2 Estimated Scope

| Category | Count |
|----------|-------|
| 신규 생성 파일 | ~40개 |
| 기존 코드 참고 | 4개 (app.py, soumdata.py, seoulmap.py, index.html) |
| 제거 대상 파일 | 8개 (app.js, routes/main.js, mkpretty.py 등) |

### 11.3 Session Guide

| Session | Module | Scope | Estimated Work |
|---------|--------|-------|----------------|
| Session 1 | Module 1-2 | Docker Compose + DB 모델 | 인프라 기반 |
| Session 2 | Module 3-4 | 데이터 수집 (소음+공사+부동산) + Backend API | 백엔드 완성 |
| Session 3 | Module 5-6 | Next.js + 지도 + API 연동 | 프론트엔드 기본 |
| Session 4 | Module 7-8 | 공사장 + 부동산 통합 | 데이터 통합 |
| Session 5 | Module 9 | 종합 정보 패널 + 반응형 UI | 서비스 완성 |
