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
    /* bfcache 복원 시엔 스크립트가 재실행 안 되므로 sessionStorage 재확인 */
    var nav = _nav;
    if (!nav) {
      nav = sessionStorage.getItem('runit-nav');
      if (nav) {
        sessionStorage.removeItem('runit-nav');
        document.documentElement.classList.add('nav-' + nav);
      }
    }
    /* viewTransition.types: Chrome 131+ — CSS :active-view-transition-type() 로 매핑 */
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
})();
