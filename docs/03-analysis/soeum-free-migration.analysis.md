# SOEUM-FREE Migration Gap Analysis

> Feature: soeum-free-migration
> Analyzed: 2026-04-01
> Overall Match Rate: **87.4%**
> Status: Needs iteration (< 90%)

## Match Rate Summary

| Dimension | Score | Detail |
|-----------|-------|--------|
| Structural | 93.6% | 44/47 files exist |
| Functional | 85.0% | Core logic complete, 2 critical bugs + threshold mismatch |
| Contract | 86.7% | 13/15 endpoints, /compare missing, /map params missing |
| **Overall** | **87.4%** | (Structural x 0.2) + (Functional x 0.4) + (Contract x 0.4) |

## Runtime Test Results (L1)

| Endpoint | HTTP Status | Result |
|----------|------------|--------|
| GET /api/v1/health | 200 | Pass |
| GET /api/v1/regions | 200 | Pass |
| GET /api/v1/regions/1 | 200 | Pass |
| GET /api/v1/noise | 200 | Pass |
| GET /api/v1/noise/map | 200 | Pass |
| GET /api/v1/construction | 200 | Pass |
| GET /api/v1/real-estate | **500** | **Fail** |
| GET /api/v1/real-estate/link | **400** | **Fail** (validation) |
| POST /api/v1/data/sync/noise | **500** | **Fail** (method mismatch) |
| Frontend localhost:3000 | 200 | Pass |

## Gap List

### Critical (Runtime Errors)

| ID | Gap | Fix |
|----|-----|-----|
| G-01 | data_sync router method name mismatch | Fix method calls to match DataCollector |
| G-02 | data_sync router constructor param mismatch | Fix parameter name |
| G-05 | Frontend noise threshold mismatch (45/55/65 vs 50/60/70) | Align to backend thresholds |

### Important (Functional Deviation)

| ID | Gap | Fix |
|----|-----|-----|
| G-03 | Missing /api/v1/compare endpoint | Add compare router |
| G-04 | Map endpoints missing bounds/from/to params | Add query params |
| G-06 | Legacy files with hardcoded API keys | Remove or gitignore legacy files |
| G-07 | ErrorResponse schema deviation | Low priority, functional |

### Minor

| ID | Gap | Fix |
|----|-----|-----|
| G-08 | Missing geocoding.py | Create placeholder |
| G-09 | slowapi rate limiting not wired | Wire in main.py |
| G-10 | X-API-Key auth not implemented | Add middleware |
| G-11 | Backend noise HEX colors differ | Align to Tailwind colors |
| G-12 | Noise label inconsistency (조용함 vs 조용) | Align to design |
