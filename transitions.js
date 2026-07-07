/**
 * runit — Page Transitions (View Transitions API)
 *
 * pagereveal 에서 viewTransition.types 로 방향을 주입 — CSS `:active-view-transition-type()` 로 분기
 * 동시에 html 클래스도 추가해 구형 브라우저 폴백 지원
 */

(function () {
  /* ── 1) 동기 실행: 신규 페이지 로드 시 클래스 선적용 ── */
  var _nav = sessionStorage.getItem('runit-nav');
  if (_nav) {
    sessionStorage.removeItem('runit-nav');
    document.documentElement.classList.add('nav-' + _nav);
  }

  /* 상세(detail)는 시트처럼 아래↔위 전환. from/to URL로 판별 */
  function _sheetKind(fromUrl, toUrl) {
    var f = /detail\.html/.test(fromUrl || '');
    var t = /detail\.html/.test(toUrl || '');
    if (t && !f) return 'sheet-open';   // 상세 진입 → 아래에서 위로
    if (f && !t) return 'sheet-close';  // 상세 이탈 → 위에서 아래로
    return null;                        // detail↔detail(제자리 전환)엔 해당 없음
  }

  /* ── 2) pagereveal: VT types 주입 + bfcache 복원 대응 ── */
  window.addEventListener('pagereveal', function (e) {
    if (!e.viewTransition || !e.viewTransition.types) return;
    // 상세 시트 전환이면 방향(forward/back) 대신 sheet 타입 사용
    var act = (self.navigation && navigation.activation) || null;
    var kind = act ? _sheetKind(act.from && act.from.url, act.entry && act.entry.url) : null;
    if (kind) { e.viewTransition.types.add(kind); return; }

    var nav = _nav;
    if (!nav) {
      nav = sessionStorage.getItem('runit-nav');
      if (nav) {
        sessionStorage.removeItem('runit-nav');
        document.documentElement.classList.add('nav-' + nav);
      }
    }
    if (nav) e.viewTransition.types.add(nav);
  });

  /* ── 2.5) pageswap: 떠나는 페이지에서도 sheet 타입 주입 ── */
  window.addEventListener('pageswap', function (e) {
    if (!e.viewTransition || !e.viewTransition.types || !e.activation) return;
    var kind = _sheetKind(
      e.activation.from && e.activation.from.url,
      e.activation.entry && e.activation.entry.url
    );
    if (kind) e.viewTransition.types.add(kind);
  });

  /* ── 날짜 표기 통일: 'YYYY-MM-DD' → '2026. 7. 26.' ── */
  window.fmtDateDot = function (iso) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return iso || '';
    return `${m[1]}. ${parseInt(m[2], 10)}. ${parseInt(m[3], 10)}.`;
  };

  /* ── 네이티브 date 입력의 0 패딩 표기(2026. 07. 06.)를 fmtDateDot 오버레이로 교체.
     네이티브 포맷은 로케일이 결정해 직접 변경 불가 → 값 있을 때 네이티브 텍스트를
     투명 처리하고 같은 자리에 포맷 텍스트를 겹침. 부모는 position:relative 필요. ── */
  window.bindDateDot = function (input) {
    if (!input || input._dotBound) return;
    input._dotBound = true;
    const span = document.createElement('span');
    span.className = 'date-dot-display';
    const cs = getComputedStyle(input);
    span.style.font = cs.font;
    span.style.color = cs.color;
    (input.parentElement || input).appendChild(span);
    const upd = () => {
      const has = !!input.value;
      span.textContent = has ? window.fmtDateDot(input.value) : '';
      input.classList.toggle('date-dotted', has);
    };
    input.addEventListener('input', upd);
    input.addEventListener('change', upd);
    setInterval(upd, 600); // 프로그램적 value 세팅(편집 진입 등) 반영
    upd();
  };

  /* ── Forward ── */
  window.goTo = function (url) {
    sessionStorage.setItem('runit-nav', 'forward');
    location.href = url;
  };

  /* ── Back ── */
  window.goBack = function (url) {
    sessionStorage.setItem('runit-nav', 'back');
    location.href = url;
  };

  /* ── Collapsing large title (iOS-style) ──
     scrollEl 안에 .lp-header-title-compact + .lp-hero-title 가 있어야 함.
     스크롤하면 큰 타이틀이 페이드/축소되고 sticky 헤더에 작은 타이틀이 페이드인. */
  window.setupCollapsingHeader = function (scrollEl) {
    if (!scrollEl) return;
    const compactTitle = scrollEl.querySelector('.lp-header-title-compact');
    const largeTitle = scrollEl.querySelector('.lp-hero-title');
    if (!compactTitle || !largeTitle) return;

    const FADE_START = 16, FADE_END = 44;

    function update() {
      const y = scrollEl.scrollTop;
      const t = Math.max(0, Math.min(1, (y - FADE_START) / (FADE_END - FADE_START)));
      compactTitle.style.opacity = t;
      const scale = 1 - t * 0.05;
      largeTitle.style.transform = `scale(${scale})`;
      largeTitle.style.transformOrigin = 'left center';
      largeTitle.style.opacity = 1 - t * 0.5;
    }
    scrollEl.addEventListener('scroll', update, { passive: true });
    update();
  };

  /* ── Auto-hide chrome (탭바 + 플로팅 바만) ──
     스크롤 방향 감지: 아래로 → 탭바 화면 밖, 플로팅 바도 탭바 자리로 내려옴.
     위로 스크롤하면 둘 다 다시 올라옴. 헤더는 영향 없음. */
  window.setupAutoHideChrome = function (scrollEl) {
    if (!scrollEl) return;
    let lastY = scrollEl.scrollTop;
    let hidden = false;
    let pendingDir = 0;
    const HIDE_DELTA = 6;   // 누적 dy 가 ±6 넘으면 방향 결정
    const TOP_BAND = 40;    // 이 영역 안에선 무조건 보임

    function setHidden(h) {
      if (hidden === h) return;
      hidden = h;
      const tabBar = document.getElementById('app-tab-bar');
      if (tabBar) tabBar.classList.toggle('chrome-hidden', h);
      const ctrlBtn = document.getElementById('tab-ctrl-btn');
      if (ctrlBtn) ctrlBtn.classList.toggle('chrome-hidden', h);
      const slide = scrollEl.closest('.swiper-slide') || document;
      slide.querySelectorAll('.float-bar-wrap').forEach(el => {
        el.classList.toggle('chrome-hidden', h);
      });
    }

    function update() {
      const y = scrollEl.scrollTop;
      const dy = y - lastY;
      lastY = y;

      if (y <= TOP_BAND) {
        setHidden(false);
        pendingDir = 0;
        return;
      }
      if ((dy > 0) !== (pendingDir > 0)) pendingDir = 0;
      pendingDir += dy;

      if (pendingDir > HIDE_DELTA) {
        setHidden(true);
        pendingDir = 0;
      } else if (pendingDir < -HIDE_DELTA) {
        setHidden(false);
        pendingDir = 0;
      }
    }
    scrollEl.addEventListener('scroll', update, { passive: true });
  };
})();
