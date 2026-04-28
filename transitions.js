/**
 * runit — Page Transitions (View Transitions API)
 *
 * 방향을 sessionStorage로 다음 페이지에 전달
 * Forward (goTo)  : 새 페이지 아래서 올라옴 / 현재 페이지 뒤로 물러남
 * Back   (goBack) : 현재 페이지 아래로 퇴장 / 이전 페이지 앞으로 나옴
 */

(function () {
  /* ── 진입 시 방향 클래스 적용 (VT 시작 전에 동기 실행) ── */
  function applyNavClass() {
    var nav = sessionStorage.getItem('runit-nav');
    if (nav) {
      sessionStorage.removeItem('runit-nav');
      document.documentElement.classList.add('nav-' + nav);
    }
  }
  applyNavClass();

  /* ── bfcache 복원 시에도 방향 적용 (pagereveal: Chrome 126+, Safari 18.2+) ── */
  window.addEventListener('pagereveal', applyNavClass);

  /* ── Forward ── */
  window.goTo = function (url) {
    sessionStorage.setItem('runit-nav', 'forward');
    location.href = url;
  };

  /* ── Back ── */
  window.goBack = function () {
    sessionStorage.setItem('runit-nav', 'back');
    history.back();
  };
})();
