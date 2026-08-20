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

  /* ── 날짜 표기 통일: 'YYYY-MM-DD' → 'yy-mm-dd' (예: 26-07-06) ── */
  window.fmtDateDot = function (iso) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return iso || '';
    return `${m[1].slice(2)}-${m[2]}-${m[3]}`;
  };

  /* ── 네이티브 date 입력의 로케일 표기(2026. 07. 06.)를 yy-mm-dd 오버레이로 교체.
     네이티브 포맷은 OS 로케일이 결정해 직접 변경 불가 → 값이 있을 때 네이티브 텍스트를
     투명 처리(.date-dotted)하고 같은 위치에 포맷 텍스트 span 을 겹침.
     input 부모는 position:relative 여야 함 (.dt / .pb-dt / .date-wrap). ── */
  window.bindDateDot = function (input) {
    if (!input || input._dotBound) return;
    input._dotBound = true;
    const span = document.createElement('span');
    span.className = 'date-dot-display';
    (input.parentElement || input).appendChild(span);
    const upd = () => {
      const has = !!input.value;
      if (has) {
        // date-dotted 는 input 텍스트를 transparent 로 만들므로, 실제 텍스트 색은
        // 클래스를 잠시 뗀 상태에서 읽어 오버레이에 적용 (오버레이까지 투명해지는 것 방지)
        input.classList.remove('date-dotted');
        const cs = getComputedStyle(input);
        span.style.font = cs.font;
        span.style.color = cs.color;
        span.style.left = (input.offsetLeft + parseFloat(cs.paddingLeft || 0)) + 'px';
        span.style.top = input.offsetTop + 'px';
        span.style.height = input.offsetHeight + 'px';
        span.textContent = window.fmtDateDot(input.value);
        input.classList.add('date-dotted');
      } else {
        span.textContent = '';
        input.classList.remove('date-dotted');
      }
    };
    input.addEventListener('input', upd);
    input.addEventListener('change', upd);
    setInterval(upd, 500); // 프로그램적 value 세팅(편집 진입 등) 반영
    upd();
  };

  /* 페이지 로드 시 모든 date 입력에 오버레이 자동 연결 */
  window.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('input[type="date"]').forEach(function (el) { window.bindDateDot(el); });
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

  /* ── (사용 안 함) 큰 타이틀 접힘 — 스크롤 리플로우로 끊김 발생해 제거.
     이제 큰 타이틀은 스크롤과 함께 자연스럽게 사라지고 탭만 sticky로 상단 고정됨. */
  window.setupCollapsingHeader = function () { /* no-op */ };
  window._setupCollapsingHeader_unused = function (scrollEl) {
    if (!scrollEl) return;
    const page = scrollEl.parentElement;
    if (!page) return;
    const hero = page.querySelector('.lp-hero');
    const compactTitle = page.querySelector('.lp-header-title-compact');
    const largeTitle = hero && hero.querySelector('.lp-hero-title');
    if (!hero || !largeTitle) return;

    let fullH = 0, padT = 0, padB = 0;
    function measure() {
      hero.style.maxHeight = ''; hero.style.paddingTop = ''; hero.style.paddingBottom = '';
      const cs = getComputedStyle(hero);
      padT = parseFloat(cs.paddingTop) || 0;
      padB = parseFloat(cs.paddingBottom) || 0;
      fullH = hero.scrollHeight;
    }
    measure();
    hero.style.overflow = 'hidden';
    hero.style.willChange = 'max-height, opacity';

    const FADE_START = 8, FADE_END = 60;

    function update() {
      const y = scrollEl.scrollTop;
      const t = Math.max(0, Math.min(1, (y - FADE_START) / (FADE_END - FADE_START)));
      hero.style.maxHeight = (fullH * (1 - t)) + 'px';
      hero.style.paddingTop = (padT * (1 - t)) + 'px';
      hero.style.paddingBottom = (padB * (1 - t)) + 'px';
      hero.style.opacity = String(1 - t);
      if (compactTitle) compactTitle.style.opacity = String(t);
    }
    scrollEl.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', function () { measure(); update(); });
    update();
  };

  /* ── Tab reveal (타이틀은 고정, 탭 영역은 스크롤 시 아래로 슬라이드-노출) ──
     scrollTop 이 0 근처면 숨김, 스크롤하면 펼쳐짐. 높이 애니메이션은
     grid-template-rows: 0fr → 1fr (styles.css) 로 처리 — 콘텐츠의 실제
     높이에 자동으로 맞춰지므로 JS 로 px 를 미리 재는 방식의 오차가 없음. */
  window.setupTabReveal = function (scrollEl, tabEl) {
    if (!scrollEl || !tabEl) return;
    function update() {
      tabEl.classList.toggle('tab-row--revealed', scrollEl.scrollTop > 4);
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
