/* ═══════════════════════════════════════════════════════════
   liquid-glass.js
   archisvaze/liquid-glass 의 SVG 굴절 기법을 단일 함수로 패키징.

   사용법:
     <svg width="0" height="0" style="position:absolute"><defs id="svg-defs"></defs></svg>
     applyLiquidGlass(document.querySelector('.tab-bar'), { borderRadius: 100 });

   원본:
     https://github.com/archisvaze/liquid-glass

   브라우저 지원:
     backdrop-filter: url(#…) 은 Chromium 계열만 동작.
     Safari 는 자동으로 평범한 blur 폴백 (CSS @supports 로 분기 권장).
═══════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  const SURFACE_FNS = {
    convex_squircle: x => Math.pow(1 - Math.pow(1 - x, 4), 0.25),
    convex_circle: x => Math.sqrt(1 - (1 - x) * (1 - x)),
    concave: x => 1 - Math.sqrt(1 - (1 - x) * (1 - x)),
    lip: x => {
      const convex = Math.pow(1 - Math.pow(1 - Math.min(x * 2, 1), 4), 0.25);
      const concave = 1 - Math.sqrt(1 - (1 - x) * (1 - x)) + 0.1;
      const t = 6 * x ** 5 - 15 * x ** 4 + 10 * x ** 3;
      return convex * (1 - t) + concave * t;
    },
  };

  function calculateRefractionProfile(glassThickness, bezelWidth, heightFn, ior, samples) {
    samples = samples || 128;
    const eta = 1 / ior;
    function refract(nx, ny) {
      const dot = ny;
      const k = 1 - eta * eta * (1 - dot * dot);
      if (k < 0) return null;
      const sq = Math.sqrt(k);
      return [-(eta * dot + sq) * nx, eta - (eta * dot + sq) * ny];
    }
    const profile = new Float64Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = i / samples;
      const y = heightFn(x);
      const dx = x < 1 ? 0.0001 : -0.0001;
      const y2 = heightFn(x + dx);
      const deriv = (y2 - y) / dx;
      const mag = Math.sqrt(deriv * deriv + 1);
      const ref = refract(-deriv / mag, -1 / mag);
      if (!ref) { profile[i] = 0; continue; }
      profile[i] = ref[0] * ((y * bezelWidth + glassThickness) / ref[1]);
    }
    return profile;
  }

  function generateDisplacementMap(w, h, radius, bezelWidth, profile, maxDisp) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = 128; d[i + 1] = 128; d[i + 2] = 0; d[i + 3] = 255;
    }
    const r = radius;
    const rSq = r * r;
    const r1Sq = (r + 1) ** 2;
    const rBSq = Math.max(r - bezelWidth, 0) ** 2;
    const wB = w - r * 2;
    const hB = h - r * 2;
    const S = profile.length;

    for (let y1 = 0; y1 < h; y1++) {
      for (let x1 = 0; x1 < w; x1++) {
        const x = x1 < r ? x1 - r : x1 >= w - r ? x1 - r - wB : 0;
        const y = y1 < r ? y1 - r : y1 >= h - r ? y1 - r - hB : 0;
        const dSq = x * x + y * y;
        if (dSq > r1Sq || dSq < rBSq) continue;
        const dist = Math.sqrt(dSq);
        const fromSide = r - dist;
        const op = dSq < rSq ? 1 : 1 - (dist - Math.sqrt(rSq)) / (Math.sqrt(r1Sq) - Math.sqrt(rSq));
        if (op <= 0 || dist === 0) continue;
        const cos = x / dist;
        const sin = y / dist;
        const bi = Math.min(((fromSide / bezelWidth) * S) | 0, S - 1);
        const disp = profile[bi] || 0;
        const dX = (-cos * disp) / maxDisp;
        const dY = (-sin * disp) / maxDisp;
        const idx = (y1 * w + x1) * 4;
        d[idx]     = (128 + dX * 127 * op + 0.5) | 0;
        d[idx + 1] = (128 + dY * 127 * op + 0.5) | 0;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  function generateSpecularMap(w, h, radius, bezelWidth, angle) {
    angle = angle != null ? angle : Math.PI / 3;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h);
    const d = img.data;
    d.fill(0);
    const r = radius;
    const rSq = r * r;
    const r1Sq = (r + 1) ** 2;
    const rBSq = Math.max(r - bezelWidth, 0) ** 2;
    const wB = w - r * 2;
    const hB = h - r * 2;
    const sv = [Math.cos(angle), Math.sin(angle)];

    for (let y1 = 0; y1 < h; y1++) {
      for (let x1 = 0; x1 < w; x1++) {
        const x = x1 < r ? x1 - r : x1 >= w - r ? x1 - r - wB : 0;
        const y = y1 < r ? y1 - r : y1 >= h - r ? y1 - r - hB : 0;
        const dSq = x * x + y * y;
        if (dSq > r1Sq || dSq < rBSq) continue;
        const dist = Math.sqrt(dSq);
        const fromSide = r - dist;
        const op = dSq < rSq ? 1 : 1 - (dist - Math.sqrt(rSq)) / (Math.sqrt(r1Sq) - Math.sqrt(rSq));
        if (op <= 0 || dist === 0) continue;
        const cos = x / dist;
        const sin = -y / dist;
        const dot = Math.abs(cos * sv[0] + sin * sv[1]);
        const edge = Math.sqrt(Math.max(0, 1 - (1 - fromSide) ** 2));
        const coeff = dot * edge;
        const col = (255 * coeff) | 0;
        const alpha = (col * coeff * op) | 0;
        const idx = (y1 * w + x1) * 4;
        d[idx] = col; d[idx + 1] = col; d[idx + 2] = col; d[idx + 3] = alpha;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  function buildFilterMarkup(filterId, w, h, scale, blurAmt, dispUrl, specUrl, specSat, specOpacity) {
    return `
      <filter id="${filterId}" x="0%" y="0%" width="100%" height="100%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="${blurAmt}" result="blurred_source"/>
        <feImage href="${dispUrl}" x="0" y="0" width="${w}" height="${h}" result="disp_map"/>
        <feDisplacementMap in="blurred_source" in2="disp_map" scale="${scale}"
          xChannelSelector="R" yChannelSelector="G" result="displaced"/>
        <feColorMatrix in="displaced" type="saturate" values="${specSat}" result="displaced_sat"/>
        <feImage href="${specUrl}" x="0" y="0" width="${w}" height="${h}" result="spec_layer"/>
        <feComposite in="displaced_sat" in2="spec_layer" operator="in" result="spec_masked"/>
        <feComponentTransfer in="spec_layer" result="spec_faded">
          <feFuncA type="linear" slope="${specOpacity}"/>
        </feComponentTransfer>
        <feBlend in="spec_masked" in2="displaced" mode="normal" result="with_sat"/>
        <feBlend in="spec_faded" in2="with_sat" mode="normal"/>
      </filter>`;
  }

  /**
   * @param {HTMLElement} element  대상 엘리먼트 (.tab-bar 등)
   * @param {Object} options
   *   filterId        SVG 필터 id (기본 'liquid-glass-filter')
   *   defsId          <defs> 컨테이너 id (기본 'svg-defs')
   *   surface         굴절 곡면 종류: 'lip' | 'convex_squircle' | 'convex_circle' | 'concave'
   *   borderRadius    엘리먼트의 border-radius (px)
   *   bezelWidth      베젤(곡면) 폭 (px)
   *   glassThickness  유리 두께 (굴절 강도)
   *   ior             굴절률 (1.0~2.0, 유리 ≈ 1.5)
   *   scaleRatio      추가 스케일 배율
   *   blurAmt         feGaussianBlur stdDeviation
   *   specOpacity     스페큘러 하이라이트 강도 (0~1)
   *   specSat         굴절 결과의 saturation (1=원본)
   */
  function applyLiquidGlass(element, options) {
    if (!element) return;
    const opts = Object.assign({
      filterId: 'liquid-glass-filter',
      defsId: 'svg-defs',
      surface: 'lip',
      borderRadius: 100,
      bezelWidth: 14,
      glassThickness: 10,
      ior: 1.45,
      scaleRatio: 1,
      blurAmt: 0.5,
      specOpacity: 0.5,
      specSat: 1.0,
    }, options || {});

    const defs = document.getElementById(opts.defsId);
    if (!defs) {
      console.warn('[liquid-glass] <defs id="' + opts.defsId + '"> not found');
      return;
    }

    function rebuild() {
      const w = element.offsetWidth;
      const h = element.offsetHeight;
      if (w < 2 || h < 2) return;

      const heightFn = SURFACE_FNS[opts.surface] || SURFACE_FNS.lip;
      const clampedBezel = Math.min(opts.bezelWidth, opts.borderRadius - 1, Math.min(w, h) / 2 - 1);
      const profile = calculateRefractionProfile(opts.glassThickness, clampedBezel, heightFn, opts.ior, 128);
      const maxDisp = Math.max(...Array.from(profile).map(Math.abs)) || 1;
      const dispUrl = generateDisplacementMap(w, h, opts.borderRadius, clampedBezel, profile, maxDisp);
      const specUrl = generateSpecularMap(w, h, opts.borderRadius, clampedBezel * 2.5);
      const scale = maxDisp * opts.scaleRatio;

      defs.innerHTML = buildFilterMarkup(
        opts.filterId, w, h, scale, opts.blurAmt, dispUrl, specUrl, opts.specSat, opts.specOpacity
      );
    }

    rebuild();

    let _timer = 0;
    function debouncedRebuild() {
      clearTimeout(_timer);
      _timer = setTimeout(rebuild, 80);
    }

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(debouncedRebuild);
      ro.observe(element);
    } else {
      window.addEventListener('resize', debouncedRebuild);
    }

    return { rebuild };
  }

  global.applyLiquidGlass = applyLiquidGlass;
})(window);
