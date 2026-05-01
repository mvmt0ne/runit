/**
 * runit — 공통 하단 탭바
 *
 * 사용법: 각 페이지 <head> 에 `<script src="./tabbar.js"></script>` 한 줄.
 *   - .phone-inner 끝에 자동 삽입되어 모든 페이지에서 동일한 탭바를 렌더링한다.
 *   - 현재 URL 파일명으로 활성 탭을 자동 결정한다.
 *   - 활성이 아닌 탭은 transitions.js 의 goTo() 로 전환한다(없으면 location.href 폴백).
 *
 * 새 탭을 추가하려면 TABS 배열에 항목을 한 줄 추가하면 된다.
 */
(function () {
  'use strict';

  var ICONS = {
    home:
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3 10.5 12 3l9 7.5"/>' +
      '<path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>' +
      '</svg>',
    list:
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      '<line x1="8" y1="6" x2="21" y2="6"/>' +
      '<line x1="8" y1="12" x2="21" y2="12"/>' +
      '<line x1="8" y1="18" x2="21" y2="18"/>' +
      '<circle cx="4" cy="6" r="1"/>' +
      '<circle cx="4" cy="12" r="1"/>' +
      '<circle cx="4" cy="18" r="1"/>' +
      '</svg>',
    chart:
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3 21h18"/>' +
      '<rect x="5" y="12" width="3" height="7"/>' +
      '<rect x="10.5" y="8" width="3" height="11"/>' +
      '<rect x="16" y="4" width="3" height="15"/>' +
      '</svg>',
    trophy:
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"/>' +
      '<path d="M16 6h3v2a3 3 0 0 1-3 3"/>' +
      '<path d="M8 6H5v2a3 3 0 0 0 3 3"/>' +
      '<path d="M10 14h4v3h-4z"/>' +
      '<path d="M8 20h8"/>' +
      '</svg>'
  };

  var TABS = [
    { href: 'runit-home.html', label: '홈', icon: ICONS.home },
    { href: 'list.html', label: '활동', icon: ICONS.list },
    { href: 'stats.html', label: '마일리지', icon: ICONS.chart },
    { href: 'pb.html', label: 'PB', icon: ICONS.trophy }
  ];

  /* detail.html 같은 서브 페이지는 활성 탭 없음 */
  function getCurrentFile() {
    var path = (location.pathname || '').split('/').pop() || '';
    if (!path || path === 'index.html') return 'runit-home.html';
    return path;
  }

  function buildTab(tab, isActive) {
    var a = document.createElement('a');
    a.className = 'tab-item' + (isActive ? ' active' : '');
    a.href = tab.href;
    if (isActive) {
      a.setAttribute('aria-current', 'page');
    } else {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof window.goTo === 'function') {
          window.goTo(tab.href);
        } else {
          location.href = tab.href;
        }
      });
    }
    a.innerHTML =
      '<div class="tab-icon">' + tab.icon + '</div>' +
      '<div class="tab-label">' + tab.label + '</div>';
    return a;
  }

  function render() {
    /* 이전 인스턴스 제거 (스크립트 중복 로드 / SPA 재렌더 대비) */
    var existing = document.querySelectorAll('.tab-bar');
    for (var i = 0; i < existing.length; i++) existing[i].parentNode.removeChild(existing[i]);

    var mount = document.querySelector('.phone-inner');
    if (!mount) return;

    var current = getCurrentFile();
    var nav = document.createElement('nav');
    nav.className = 'tab-bar';
    for (var j = 0; j < TABS.length; j++) {
      nav.appendChild(buildTab(TABS[j], TABS[j].href === current));
    }
    mount.appendChild(nav);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
