# runit — Changelog

---

## [2026-04-23] 이번 세션

### Pull-to-Refresh 개선 (list / detail / stats)

- **헤더 푸시 다운**: 당기는 동안 `.back-header`(stats는 `.tab-row` 포함)가 인디케이터와 함께 아래로 밀려남
- **헤더 스냅백**: 새로고침 완료 후 새 페이지에서 헤더가 내려간 상태에서 원위치로 올라오는 애니메이션 (`sessionStorage` 플래그 활용)
- **인디케이터 디자인**: 44px 원형 pill, `rgba(35,35,35,0.92)` frosted glass 배경, `border: 1px solid rgba(255,255,255,0.08)`
- **아이콘**: stroke `#cdcdcd` (어두운 배경 대비 개선)
- **z-index**: 헤더(10) 아래(9)로 설정해 인디케이터가 헤더를 덮지 않음
- **위치 공식**: `헤더 translateY = max(0, ty + 52)` → 인디케이터 하단(44px) + 간격(8px) 유지
- **트리거 후 고정**: 인디케이터 `translateY(12px)`, 헤더 `translateY(64px)`

### PTR 동작 흐름
```
당기기 시작
  → 인디케이터 top:0 에서 페이드인
  → 헤더 동시에 아래로 이동 (간격 8px 유지)
임계점(80px) 도달 후 손 뗌
  → 인디케이터 12px 고정 + 스피너 회전
  → sessionStorage('ptr-return') 저장
  → 700ms 후 window.location.reload()
새 페이지 로드
  → 플래그 감지 → 헤더 즉시 64px 내려간 상태 세팅
  → 50ms 후 0.5s ease로 원위치 스냅백
```

---

## [이전 세션] 주요 작업 내역

### 아이콘
- 전 페이지 SVG → **Lucide 아이콘** 교체 (arrow-left, chevron, sun, moon 등)
- 전체 `stroke-width` → `2` 통일
- 뷰 토글: 크게보기 `rows-2`, 작게보기 `rows-3`

### Float Bar
- `.float-sf-item`에 `white-space: nowrap` 추가 → "정렬" / "필터" 줄바꿈 방지

### 월 섹션 헤더 (list.html)
- `.lp-month-section`에 frosted glass 효과
  - `background: rgba(202, 202, 202, 0.75)`
  - `backdrop-filter: blur(24px) saturate(150%)`
  - 다크모드: `rgba(32, 32, 32, 0.75)`

### PWA
- `manifest.json` 생성 (start_url, display: standalone, theme_color)
- `sw.js` 생성 — HTML: network-first / assets: cache-first
- `icon.svg` 생성 — 다크 배경, accent "R"
- `index.html` 생성 — GitHub Pages redirect
- 전 페이지 PWA 메타태그 + SW 등록 추가

### Pull-to-Refresh (초기 구현)
- 전 페이지 inline PTR 스크립트 추가
- `THRESHOLD=80`, `MAX_PULL=120`, `RESIST=0.45`
- Lucide `rotate-cw` 스피너 아이콘
- `runit-home.html`: scrollTop 셀렉터에 `.cal-area` 추가

### stats.html 흔들림 수정
- `.back-header` 중복 `position: fixed` 제거
- `.scroll-area`에 `overflow-x: hidden` 추가
- 스와이프 핸들러: Y축 방향 감지, threshold 60px

---

## 파일 구조

```
runit/
├── runit-home.html   # 홈 (캘린더 + 마일리지)
├── list.html         # 러닝 기록 목록
├── detail.html       # 러닝 상세
├── stats.html        # 통계
├── manifest.json     # PWA manifest
├── sw.js             # Service Worker
├── icon.svg          # PWA 아이콘
├── index.html        # GitHub Pages redirect
└── CLAUDE.md         # 에이전트 모드 설정
```
