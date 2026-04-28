/**
 * runit — Page Transitions (GSAP)
 *
 * Forward (goTo)  : 현재 페이지 scale-back → 새 페이지 아래서 올라옴
 * Back   (goBack) : 현재 페이지 아래로 퇴장 → 이전 페이지 앞으로 나옴
 */

(function () {
  function root() {
    return document.querySelector('.phone-inner');
  }

  /* ── Forward: 현재 페이지 뒤로 물러남 ── */
  window.goTo = async function (url) {
    sessionStorage.removeItem('runit-back');
    await gsap.to(root(), {
      scale: 0.95,
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
    });
    location.href = url;
  };

  /* ── Back: 현재 페이지 아래로 퇴장 ── */
  window.goBack = async function () {
    sessionStorage.setItem('runit-back', '1');
    await gsap.to(root(), {
      y: '100%',
      duration: 0.28,
      ease: 'power2.in',
    });
    history.back();
  };

  /* ── 뒤로가기로 진입한 경우 is-back 클래스 적용 ── */
  if (sessionStorage.getItem('runit-back')) {
    sessionStorage.removeItem('runit-back');
    document.documentElement.classList.add('is-back');
  }
})();
