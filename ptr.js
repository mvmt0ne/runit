(function () {
  const THRESHOLD = 80;   // 새로고침 트리거 거리 (px)
  const MAX_PULL  = 120;  // 최대 당김 거리
  const RESIST    = 0.45; // 저항감

  // ── 인디케이터 DOM ──
  const wrap = document.createElement('div');
  wrap.style.cssText = [
    'position:fixed', 'top:0', 'left:50%',
    'transform:translateX(-50%) translateY(-56px)',
    'width:40px', 'height:40px',
    'display:flex', 'align-items:center', 'justify-content:center',
    'z-index:999', 'pointer-events:none',
    'transition:transform 0.25s cubic-bezier(0.16,1,0.3,1), opacity 0.25s',
    'opacity:0',
  ].join(';');

  const icon = document.createElement('div');
  icon.style.cssText = 'display:flex; align-items:center; justify-content:center;';
  icon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="#8d8d8d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
    <path d="M21 3v5h-5"/>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
    <path d="M8 16H3v5"/>
  </svg>`;
  wrap.appendChild(icon);
  document.body.appendChild(wrap);

  // spin 키프레임
  const style = document.createElement('style');
  style.textContent = '@keyframes ptr-spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);

  // ── 상태 ──
  let startY    = 0;
  let pullDist  = 0;
  let tracking  = false;
  let triggered = false;

  function scrollTop() {
    const el = document.querySelector('.scroll-area, .list-scroll');
    return el ? el.scrollTop : window.scrollY;
  }

  function setPos(pull, opacity) {
    wrap.style.transform = `translateX(-50%) translateY(${pull - 48}px)`;
    wrap.style.opacity   = opacity;
    icon.style.transform = `rotate(${Math.min(pull / THRESHOLD, 1) * 210}deg)`;
  }

  document.addEventListener('touchstart', e => {
    if (triggered || scrollTop() > 2) return;
    startY   = e.touches[0].clientY;
    pullDist = 0;
    tracking = true;
    wrap.style.transition = 'none';
    icon.style.transition = 'none';
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!tracking) return;
    if (scrollTop() > 2) { tracking = false; return; }

    const dy = e.touches[0].clientY - startY;
    if (dy <= 0) return;

    pullDist = Math.min(dy * RESIST, MAX_PULL);
    const progress = Math.min(pullDist / THRESHOLD, 1);
    setPos(pullDist, progress);
  }, { passive: true });

  document.addEventListener('touchend', () => {
    if (!tracking) return;
    tracking = false;

    wrap.style.transition = 'transform 0.25s cubic-bezier(0.16,1,0.3,1), opacity 0.25s';
    icon.style.transition = 'transform 0.25s';

    if (pullDist >= THRESHOLD) {
      triggered = true;
      // 고정 위치 + 스핀
      wrap.style.transform = 'translateX(-50%) translateY(16px)';
      wrap.style.opacity   = '1';
      icon.style.transform = 'none';
      icon.style.transition = 'none';
      icon.style.animation  = 'ptr-spin 0.55s linear infinite';
      setTimeout(() => window.location.reload(), 700);
    } else {
      setPos(0, 0);
    }
    pullDist = 0;
  }, { passive: true });
})();
