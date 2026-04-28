/**
 * runit — Page Transitions
 *
 * 일반 스크립트로 로드 (type="module" 아님)
 * → goTo / goBack 즉시 정의, motion.dev는 백그라운드 프리로드
 * → CDN 느리거나 실패해도 네비게이션은 항상 동작
 */
(function () {
  const EASE_IN = [0.4, 0, 1, 1];

  /* motion.dev를 백그라운드에서 프리로드 */
  const motionReady = import('https://esm.sh/motion@10')
    .then(m => m.animate)
    .catch(() => null);

  async function exit(el, transform) {
    try {
      const animate = await motionReady;
      if (animate && el) {
        await animate(
          el,
          { opacity: 0, transform },
          { duration: 0.18, easing: EASE_IN }
        ).finished;
      }
    } catch (_) { /* 폴백: 즉시 이동 */ }
  }

  window.goTo = async function (url) {
    await exit(document.querySelector('.phone-inner'), 'translateY(-10px)');
    location.href = url;
  };

  window.goBack = async function () {
    await exit(document.querySelector('.phone-inner'), 'translateY(10px)');
    history.back();
  };
})();
