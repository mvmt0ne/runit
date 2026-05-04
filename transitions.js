/**
 * runit — Page Transitions (View Transitions API)
 *
 * pagereveal 에서 viewTransition.types 로 방향을 주입 — CSS `:active-view-transition-type()` 로 분기
 * 동시에 html 클래스도 추가해 구형 브라우저 폴백 지원
 *
 * SPA 쉘(app.html) iframe 안에서 호출되면 부모 윈도우를 네비게이트.
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

  /* iframe 안에서 실행 중이면 top window 를 네비게이트 */
  function _navigate(url) {
    if (window.top && window.top !== window) {
      window.top.location.href = url;
    } else {
      location.href = url;
    }
  }

  /* ── Forward ── */
  window.goTo = function (url) {
    sessionStorage.setItem('runit-nav', 'forward');
    _navigate(url);
  };

  /* ── Back ── */
  window.goBack = function (url) {
    sessionStorage.setItem('runit-nav', 'back');
    _navigate(url);
  };

  /* ─── iframe → parent 스와이프 브리지 ───
     iframe 안에서 가로 스와이프 발생 시 부모에게 메시지로 알림.
     SPA 셸(app.html)이 받아 swiper.slideNext/Prev() 실행.
     - 가로 거리 > 50px 이고 세로보다 1.5배 클 때만 트리거 (스크롤 보존)
     - drill-down(detail/input) 같이 iframe이 아닌 컨텍스트에선 자동 비활성화 */
  if (window.top && window.top !== window) {
    var _sx = 0, _sy = 0, _tracking = false;
    document.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      _sx = e.touches[0].clientX;
      _sy = e.touches[0].clientY;
      _tracking = true;
    }, { passive: true });
    document.addEventListener('touchend', function (e) {
      if (!_tracking) return;
      _tracking = false;
      var t = e.changedTouches[0];
      var dx = t.clientX - _sx;
      var dy = t.clientY - _sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        try {
          window.top.postMessage({
            type: 'runit:swipe',
            dir: dx > 0 ? 'prev' : 'next'
          }, '*');
        } catch (err) { /* cross-origin 보호 시 무시 */ }
      }
    }, { passive: true });
    document.addEventListener('touchcancel', function () { _tracking = false; }, { passive: true });
  }
})();
