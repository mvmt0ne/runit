# runit — Changelog

---

## [2026-04-23] Shift5 디자인 시스템 적용

### Theme Migration
- **Accent**: `#9CFD32` (neon green) → `#FF5841` (Signal Orange) — 전 파일
- **Dark BG**: `#191919` → `#202020` (Tactical Black) — manifest 포함
- **Fonts**:
  - Urbanist → **Space Grotesk** (primary)
  - **Space Mono** 신규 추가 (data readout 용)
  - Pretendard Variable 유지 (한글)
- **Border Radius**: 전역 `0` (sharp corners, 원형 50% 제외)
  - 월 섹션 헤더, 칩, 버튼, 카드, 토글, PTR 인디케이터, stat grid 등 79개소
- **Run Type Palette**: race / dark / long 계열 orange 통일
- **accent-rgb**: `156, 253, 50` → `255, 88, 65`

### Step 1 — Data Readout → Space Mono ✅
- `</style>` 직전 override 블록 주입
- runit-home: `.hero-km-big`, `.day-num`, `.lp-month-km`, `.lp-stat-value` 등
- list: `.lp-compact-date/time`, `.lp-stat-value`, `.range-val`
- detail: `.status-time`, `.detail-km`, `.dsc-value`, `.hr-pct`, `.split-*`
- stats: `.cmp-km`, `.delta-*`, `.pace-val`, `.run-km`
- `font-feature-settings: "tnum"` — 탭 너비 숫자

### Step 2 — Label Tracking ✅
- uppercase 라벨 전체에 `letter-spacing: 0.14em` + Space Mono 400
- `.dsc-label`, `.chart-label`, `.cal-month-label`, `.sf-section-label` 등

### Step 3 — Zero-padded Numbered Index ✅
- `list.html` renderList에 `(r, i) => rowHTML(r, i+1)` 인덱스 전달
- `.lp-run-name` 앞에 `<span class="lp-idx">01.</span>` 주입 (월별 리셋)
- `.lp-idx` 스타일: accent orange, Space Mono, 0.85em

### Step 4 — Light Theme Cream ✅
- `--bg: #ACACAC` (gray) → `#F8F4EB` (Bone/Cream)
- `--surface-1: #FFFFFF` (white cards)
- `--text-1: #202020` (Tactical Black)
- `--text-2: #8B8B8B` (Steel Gray)
- `--text-3: #B9B9B9` (Slate Gray)
- 홈 페이지 (기본 light 테마) 에디토리얼 크림 톤으로 전환

### Round CTA Buttons Unified ✅
- `.view-all-btn` (home 전체 활동 보기) + `.runs-view-all` (stats 전체 목록 보기) 통일
- 풀-width 솔리드 블록 → 중앙 정렬 **outlined pill**
- `border-radius: 999px`, `1px solid rgba(255,255,255,0.22)` 보더
- `padding: 12px 28px`, `font-size: 14px / 500`, 투명 배경
- `:active` → 배경 `rgba(255,255,255,0.08)` + `scale(0.96)`

### Modal Blur Inverted ✅
- 기존: `.sf-backdrop`에 `backdrop-filter: blur(40px)` → dimmed 영역이 블러
- 변경: backdrop는 순수 dim만, 팝업 시트/모달 자체가 frosted glass
- `.sf-backdrop`: `background: rgba(0, 0, 0, 0.5)`, blur 제거
- `.sf-sheet` (home): `rgba(54, 54, 54, 0.7)` + `backdrop-filter: blur(30px) saturate(160%)`
- `.month-modal` (home): `rgba(88, 88, 88, 0.55)` + 동일 blur
- `.month-modal` (list — 정렬/필터 sheet): `rgba(35, 35, 35, 0.7)` + 동일 blur

### Asphalt Noise Texture (Home Calendar) ✅
- **grained.js** ([sarathsaleem/grained](https://github.com/sarathsaleem/grained)) MIT 라이선스 로컬 포함
- `.cal-page`에 `id="cal-page"` 부여, grained 초기화
- 옵션: `patternWidth/Height: 300`, `grainOpacity: 0.12`, `grainDensity: 2`, `grainWidth/Height: 1.5`, `grainChaos: 0.6`, `grainSpeed: 20`
- `isolation: isolate` + `#cal-page::before { z-index: -1 }` → 노이즈가 콘텐츠 뒤로
- Canvas 기반 런타임 grain + stepped animation (Shift5 shimmer 재현)
- `.list-sheet`는 `#2f2f2f` 유지 (노이즈는 캘린더 영역에만)

### Numbering Removed ✅
- `01. 02. 03.` zero-padded 인덱스 제거 (home + list)
- `rowHTML(r, idx)` → `rowHTML(r)` 시그니처 원복
- `.lp-idx` CSS 및 Space Mono override 목록에서 삭제

### List Redesign Sync + Dark Mode Removal ✅
- `list.html` 신규 리스트 디자인을 home에 동일 적용:
  - `.lp-badge`: 48x48 → 6x6 작은 dot
  - `.lp-row.expanded`: flex-column 구조, `#2f2f2f` BG, `.lp-stats` grid 3col
  - `.lp-row`: `padding: 20px 20px 10px`, `gap: 20px`
  - `.lp-stat-value`: 16px / 500
  - `.lp-month-section`: solid `#242424`, `margin-bottom: 10px` (frosted glass 제거)
- `.list-sheet`, `.view-all-wrap` background `#2f2f2f` 통일
- **다크모드 제거:**
  - `<html data-theme="...">` 속성 4개 파일 제거
  - `:root, [data-theme="light"]` → `:root` 단일화 (값은 기존 dark 팔레트로)
  - `[data-theme="dark"]`, `[data-theme="light"]` 모든 override selector 삭제
  - `localStorage.getItem('runit-theme')` + `setAttribute('data-theme')` IIFE 3개 제거
  - `theme-color` meta → `#202020` 통일

### Home List Unification & Dead Code Cleanup ✅
- `runit-home.html` `rowHTML` → `(r, idx)` 시그니처로 list.html과 통일
- `.lp-idx` zero-padded 인덱스 적용 (이번 달 리스트)
- `.lp-idx` 스타일 블록 home에도 추가
- **Dead code 삭제:**
  - `.bottom-sheet`, `.bs-row*`, `.bs-badge`, `.bs-handle*`, `.bs-title`, `.bs-count`, `.bs-list`, `.bs-header-row` CSS (≈140줄)
  - `.list-sheet-actions` CSS (미사용)
  - `MONTH_DATA.{march,april}.runList` 템플릿 (미사용, perl multiline 삭제)
  - Legacy `Bottom Sheet drag` IIFE (guarded 상태로 dead, ≈80줄)
  - `toggleViewMode` 함수 + `viewMode` 변수 (미사용 — 홈은 expanded 고정)
- 파일 라인: ≈3500 → 3205

### Step 5 — Icon Redesign ✅
- `icon.svg` Shift5 스타일 신규 생성
  - Tactical Black `#202020` BG
  - Orange `#FF5841` "R" 워드마크 (Space Grotesk 700)
  - 좌상 chevron 코너 마커 (Shift5 tribute)
  - 하단 `01 · RUNIT` / `/` 메타 스트립 (Space Mono)
- 4개 HTML `apple-touch-icon` + `rel="icon"` → `icon.svg`

---

## [2026-04-23] PTR 개선

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
