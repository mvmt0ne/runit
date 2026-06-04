# runit 데이터 계약 (Data Contract)

실서비스 데이터의 **단일 소스는 `data/activities.csv`** (가민 Activities.csv 내보내기 포맷).
런칭 전에는 이 파일을 교체해 반영하고, 런칭 후에는 `input.html` 등록 화면 + localStorage(`store.js`)로 날짜별 보강(스플릿·심박존·메타)한다.

## 파이프라인

```
activities.csv ──parseCSV──▶ normalizeRow ──▶ loadActivities() ──▶ 화면
   (가민 원본)                (activities.js)        (정규화 객체)      detail / list / home / stats
```

- `data/activities.js` — CSV 파싱·정규화·`loadActivities()` (Promise 캐시)
- `data/stats-agg.js` — 정규화 활동 → 마일리지 화면 집계(`buildStatsData`)
- `data/store.js` — localStorage 오버라이드(splits/zones/meta)

## CSV 컬럼 ↔ 앱 필드 ↔ 화면

`normalizeRow`(activities.js)가 매핑한다. 주요 항목:

| CSV 컬럼 | 앱 필드 | 단위/형식 | 사용 화면 |
|----------|---------|-----------|-----------|
| 날짜 | `date` / `startTime` | YYYY-MM-DD / HH:MM | 전체 |
| 활동 종류 | `activityKind` | (러닝만 필터) | 로더 필터 |
| 제목 | `name` + `type`(추론) | 문자열 | 리스트·상세 |
| 거리 | `km` | km(수) | 마일리지 합계·차트 |
| 시간 | `dur` / `durSec` | 표시문자열 / 초 | 상세 |
| 평균 심박 | `bpm` | bpm | 강도분포·추이 |
| 평균 달리기 케이던스 | `spm` | spm | 추이 |
| 평균 페이스 | `pace` / `paceV` | M:SS / 초 | 추이(거리가중) |
| 평균 보폭 | `stride` | **미터** | 추이는 cm로 변환(×100) |
| 평균 지면 접촉 시간 | `ground` | ms | 추이 |
| 칼로리/파워/온도/해발 등 | `calories`, `avgPower`, … | 수 | 상세 |

> ⚠️ **보폭 단위**: CSV·`activities.js`는 **미터**(0.97). 마일리지 화면 렌더러는 **cm**(97)를 기대하므로 `stats-agg.js`가 `Math.round(stride*100)`으로 변환한다.

## 마일리지 화면 집계 (`buildStatsData(activities, todayStr?)`)

`todayStr` 생략 시 오늘 기준. 모든 기간 구조를 **동적 생성**한다.

| 반환 | 내용 |
|------|------|
| `RUNS` | 활동 배열(보폭 cm 변환) |
| `YEAR_MONTH_DATA` | `{year: [12개월 {label,km,past/current/future}]}` |
| `WEEK_PERIOD_DATA` | 12주 페이지 배열(월요일 시작 주 버킷) |
| `YEAR_PERIOD_DATA` | 12년 페이지 배열 |
| `curYear/curMonth`, `minYear/maxYear` | 네비게이션 범위 |
| `weekDefaultIdx/yearDefaultIdx` | 최신 페이지 인덱스 |
| `totalKm` | 연간 hero 총 마일리지 |

집계 규칙:
- **거리·시간**: 합계
- **페이스**: 거리가중 평균 (`Σ(paceSec×km)/Σkm`)
- **심박·케이던스·접지·보폭**: 산술 평균
- **강도분포**: 평균 심박 → Zone(`ZONE_CONFIG`) → 저/중/고 비율
- 데이터 없는 달/주는 빈 막대, 이번 달에 데이터 없으면 상세는 최근 데이터 달로 폴백

## 새 CSV 반영 방법

1. 가민에서 Activities.csv 내보내기 → `data/activities.csv` 교체 (헤더 동일 유지)
2. 새로고침 — 모든 화면이 오늘 기준으로 자동 재집계
