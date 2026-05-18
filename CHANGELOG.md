# runit — Changelog

---

## [2026-05-17 → 18] CSV 데이터 파이프라인 + UI 통일 + PB 인터랙션

### 서버 실행
- `.claude/launch.json` 의 `runit` 설정: `python3` 로컬 서버 (port 8080)
- 진입점: **`app.html`** (Swiper로 home/list/stats/pb 슬라이드를 동적 로드)
- 단독 페이지: `detail.html?date=YYYY-MM-DD`, `input.html?date=YYYY-MM-DD`
- file:// 직접 열기 NG — fetch CORS 때문 (활동 CSV 로드 안 됨)

### 데이터 모델 (중요)
- **CSV (1차 데이터)**: `data/activities.csv` — 가민 앱 내보내기 그대로. ~173개 러닝 활동.
  - 35 컬럼 중 사용: 날짜, 제목, 거리, 시간, 평균 페이스/최대 페이스, 평균/최대 심박, TE(유산소), 케이던스, 보폭(m), 접지시간, 수직 진동/비율, 칼로리, 걸음, 상승/하강
  - **없는 것**: km별 페이스(분할), 심박존 분포 — 가민 CSV 익스포트엔 미포함
- **JS 파서**: `data/activities.js` — `loadActivities() / getActivity(date)` Promise 기반.
  - `inferType(title)` 매핑: E·러닝→easy / S→steady / T→tempo / J→jogging / TT→tt / L→long / I→interval / R·한글대회명→race
  - 보폭 단위: CSV는 m, list 렌더는 cm — `Math.round(stride * 100)`
- **메타 (사용자 오버라이드)**: `data/store.js` — localStorage 키 `runit:meta`
  - `getMeta(date) / setMeta(date, { name, type, note, shoe })`
  - `shoe`: base64 JPEG (입력 시 max 800px / quality 0.85 자동 리사이즈)
- `splits.js`, `zones.js`: 현재 detail에서는 사용 안 함. 향후 분할/심박존 데이터 수동 입력 용도로 보존.

### 페이지별 변경

#### list.html — CSV에서 활동 173개 자동 로드
- 하드코딩 `RUNS` 17개 제거 → `loadActivities()` → `activityToRun()` 매핑
- 월 그룹핑 키 `r.month`(int) → `r.date.slice(0,7)`(YYYY-MM): 다년도 정렬 버그 수정 (이제 2026-05 → 2026-04 → ... → 2025-12 순서)
- 행 클릭 → `detail.html?date=YYYY-MM-DD` 라우팅
- lp-hero에 인라인 뷰 토글(`.lp-view-toggle`) — 단일 아이콘 버튼, on/off 색상 (확장=흰색 배경, 컴팩트=아웃라인)
- 컴팩트 모드 행 높이 통일: 숨김 `.lp-date-month` span에 빈 값 → 실제 월 텍스트로 (visibility:hidden로 자리만 잡기). `display:none`으로 월 라벨 자체를 컴팩트에서 숨김.
- 필터/뷰 토글 FAB은 탭바 밖 플로팅 버튼으로 분리 ([app.html:32-58](app.html)) — 자동 숨김 동기화 ([transitions.js:78-86](transitions.js))

#### detail.html — list/home 톤으로 재설계, CSV-only
- 색: asphalt-black 배경 + slate-gray 카드 + bone 텍스트 (list와 동일)
- 표시 항목: 헤더(date·time·type 배지·name) → 핵심(km/dur/avgPace) → CSV 스탯 14개 → 유산소 TE → **러닝화 카드** (메타에 이미지 있으면 표시, 없으면 점선 placeholder → 탭하면 input.html로 이동)
- 우상단 ✏️ → `input.html?date=`
- meta.name 있으면 CSV 제목 오버라이드
- splits/zones 차트·테이블·HR존 섹션 모두 제거 (CSV에 없는 데이터)

#### input.html — 메타 입력 (러닝화 이미지 + 이름·타입·메모)
- `?date=` 자동 파싱, 헬퍼에 CSV 활동 요약 표시
- 메타 입력: 이름 / 타입 select / 메모 / **러닝화 이미지(파일 선택 + 미리보기)**
- 이미지 처리: canvas 리사이즈 800px max + JPEG 0.85
- 저장 흐름은 기존 splits/zones 패턴 그대로 + `setMeta()` 추가
- localStorage 용량 초과 시 토스트 알림

#### pb.html — Podium 레이아웃 + 홀로그래픽 hero + 자이로
- 기존 pile/expanded 스택 모드 폐기
- 헤더/탭: stats와 동일 (`.lp-hero` + `.lp-header` 스크롤 컴팩트 전환, sticky `.dist-tabs`)
- 거리 탭 6개: **1K / 3K / 5K / 10K / 하프 / 풀** (폰트 17px)
- Hero 카드 (1위):
  - 보라/블루 그라데이션 + 코너 핑크/블루 글로우 + 우하단 거대 워터마크 숫자
  - **3D tilt**: 터치(우선) > 마우스 > 자이로 → `--rx/--ry` ±9~12°
  - **자이로(폰 기울기)**: `deviceorientation` (beta/gamma) → 평활화 후 카드 회전. `screen.orientation.angle` 보정. iOS 13+는 카드 탭 시 `requestPermission()` 트리거.
  - **Foil shimmer**: `--foil-x/--foil-y` 따라 흰색 radial highlight 이동, mix-blend-mode: overlay
  - **Rainbow sheen**: 각도에 따라 색상 흐름
  - **슬롯머신 카운터**: 거리 탭 전환 시 시간 숫자가 0.62초 동안 scramble 후 정착
  - **탭 펄스**: 0.42s scale 0.96 ↔ 1
- 2~5위는 컴팩트 리스트 (호버 시 좌측 보라 라인)

#### runit-home.html
- 위치 권한 팝업 매번 뜨는 문제 해결: 좌표를 `localStorage('runit-coords')` 캐시 → 첫 허용 후엔 다시 안 묻음
- 4월 ▼ 드롭다운을 hero에서 분리해 캘린더 위쪽 좌측으로 이동, 스와이프 화살표는 우측 그룹화

### 다음 작업 후보
- splits/zones 입력은 input.html에 살아있으나 detail에 표시 경로 없음 — 차후 detail에 "수동 분할 추가" 토글 부활 여부 결정
- pb.html `PB_DATA` 는 여전히 하드코딩 — CSV에서 거리별 최고기록 자동 추출 로직 도입 가능 (distance 매칭 + time 정렬)
- localStorage 용량 모니터링: 활동 메타 이미지 다수 저장 시 ~5MB 한계 도달 가능, IndexedDB 이전 고려

### 디렉터리 메모
```
data/
  activities.csv     # 가민 익스포트 — 새 CSV 받으면 이 파일만 교체
  activities.js      # 파서 + 로더 (fetch 기반)
  store.js           # localStorage 오버라이드 + meta
  splits.js          # (현재 미사용, 보존)
  zones.js           # (현재 미사용, 보존)
```

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
