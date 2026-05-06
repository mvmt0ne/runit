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

  /* ── 2) pagereveal: VT types 주입 + bfcache 복원 대응 ── */
  window.addEventListener('pagereveal', function (e) {
    var nav = _nav;
    if (!nav) {
      nav = sessionStorage.getItem('runit-nav');
      if (nav) {
        sessionStorage.removeItem('runit-nav');
        document.documentElement.classList.add('nav-' + nav);
      }
    }
    if (nav && e.viewTransition && e.viewTransition.types) {
      e.viewTransition.types.add(nav);
    }
  });

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
})();
