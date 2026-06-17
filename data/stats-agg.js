/* ═══════════════════════════════════════════════════════════
   STATS-AGG — 정규화된 활동(loadActivities)을 마일리지 화면용
   집계 구조로 변환. 모두 '오늘' 기준 동적 생성.

   사용:
     <script src="./data/activities.js"></script>
     <script src="./data/stats-agg.js"></script>
     const S = buildStatsData(await loadActivities());
     // S.RUNS, S.YEAR_MONTH_DATA, S.WEEK_PERIOD_DATA,
     //   S.YEAR_PERIOD_DATA, S.month{Year,Month,minYear,maxYear},
     //   S.weekDefaultIdx, S.yearDefaultIdx, S.totalKm

   buildStatsData(activities, todayStr?) — todayStr 'YYYY-MM-DD' 생략 시 오늘.
═══════════════════════════════════════════════════════════ */

(function (global) {
  const DAY = 86400000;

  const _parseYMD = s => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const _mondayOf = t => {
    const wd = (new Date(t).getUTCDay() + 6) % 7; // Mon=0 … Sun=6
    return t - wd * DAY;
  };
  const _round1 = n => Math.round(n * 10) / 10;
  const _sumKm = arr => arr.reduce((s, a) => s + (a.km || 0), 0);
  const _weekLabel = t => {
    const d = new Date(t);
    return `${d.getUTCMonth() + 1}.${d.getUTCDate()}`;
  };
  // 주 시작(월요일) 기준 "M월 N째주" — 그 달의 며칠인지로 주차 계산
  const _monthWeekLabel = t => {
    const d = new Date(t);
    const wom = Math.ceil(d.getUTCDate() / 7);
    return `${d.getUTCMonth() + 1}월 ${wom}째주`;
  };

  // 활동 → stats 렌더러가 기대하는 run 형태 (보폭 m→cm)
  function _toRun(a) {
    return {
      date: a.date,
      type: a.type,
      name: a.name || a.type,
      dur: a.dur,
      durSec: a.durSec,
      km: a.km,
      pace: a.pace,
      paceV: a.paceV,
      bpm: a.bpm,
      spm: a.spm,
      ground: a.ground,
      stride: a.stride != null ? Math.round(a.stride * 100) : null, // m → cm
    };
  }

  // 12칸 페이지로 분할 — 최신 항목이 마지막 페이지 끝.
  // items: 오래된→최신 순 배열. 반환: 페이지 배열(오래된 페이지가 idx 0).
  function _paginate(items, size) {
    const pages = [];
    for (let end = items.length - 1; end >= 0; end -= size) {
      const start = Math.max(0, end - size + 1);
      pages.push(items.slice(start, end + 1));
    }
    pages.reverse();
    return pages;
  }

  function buildStatsData(activities, todayStr) {
    const RUNS = (activities || []).filter(a => a && a.date).map(_toRun);

    // 오늘
    let todayT;
    if (todayStr) {
      todayT = _parseYMD(todayStr);
    } else {
      const n = new Date();
      todayT = Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
    }
    const today = new Date(todayT);
    const curY = today.getUTCFullYear();
    const curM = today.getUTCMonth() + 1;

    const dates = RUNS.map(r => _parseYMD(r.date));
    const years = RUNS.map(r => +r.date.slice(0, 4));
    const minDataY = years.length ? Math.min(...years) : curY;

    // ── 월간: {year: [12개월]} ──
    const YEAR_MONTH_DATA = {};
    const minY = Math.min(minDataY, curY);
    for (let y = minY; y <= curY; y++) {
      YEAR_MONTH_DATA[y] = [];
      for (let m = 1; m <= 12; m++) {
        const ms = RUNS.filter(r => +r.date.slice(0, 4) === y && +r.date.slice(5, 7) === m);
        const entry = { label: `${m}월`, km: _round1(_sumKm(ms)) };
        if (y === curY && m === curM) entry.current = true;
        else if (y > curY || (y === curY && m > curM)) entry.future = true;
        else entry.past = true;
        YEAR_MONTH_DATA[y].push(entry);
      }
    }

    // ── 주간: 첫 데이터 주 ~ 이번 주, 12주 페이지 ──
    const curWeek = _mondayOf(todayT);
    const firstWeek = _mondayOf(dates.length ? Math.min(...dates) : todayT);
    const allWeeks = [];
    for (let t = firstWeek; t <= curWeek; t += 7 * DAY) {
      const start = t,
        end = t + 7 * DAY;
      const wRuns = RUNS.filter(r => {
        const rt = _parseYMD(r.date);
        return rt >= start && rt < end;
      });
      const w = {
        label: _weekLabel(start),
        // 주 기간 라벨 (월~일): "6.1 — 6.7"
        range: `${_weekLabel(start)} — ${_weekLabel(start + 6 * DAY)}`,
        // "M월 N째주"
        mlabel: _monthWeekLabel(start),
        km: _round1(_sumKm(wRuns)),
        runs: wRuns,
      };
      if (t === curWeek) w.current = true;
      else w.past = true;
      allWeeks.push(w);
    }
    const weekPages = _paginate(allWeeks, 12);
    const WEEK_PERIOD_DATA = weekPages.map(pg => ({
      label: `${pg[0].label} — ${pg[pg.length - 1].label}`,
      weeks: pg.map(w => ({ label: w.label, range: w.range, mlabel: w.mlabel, km: w.km, current: w.current, past: w.past, runs: w.runs })),
      runs: pg.flatMap(w => w.runs),
      bpms: pg.flatMap(w => w.runs.map(r => r.bpm)).filter(b => b != null),
    }));

    // ── 연간: 첫 데이터 해 ~ 올해, 12년 페이지 ──
    const allYears = [];
    for (let y = minY; y <= curY; y++) {
      const ys = RUNS.filter(r => +r.date.slice(0, 4) === y);
      const yr = { label: `${String(y).slice(2)}년`, km: _round1(_sumKm(ys)), runs: ys, year: y };
      if (y === curY) yr.current = true;
      else yr.past = true;
      allYears.push(yr);
    }
    const yearPages = _paginate(allYears, 12);
    const YEAR_PERIOD_DATA = yearPages.map(pg => ({
      label: `${String(pg[0].year).slice(2)} — ${String(pg[pg.length - 1].year).slice(2)}`,
      years: pg.map(y => ({ label: y.label, km: y.km, current: y.current, past: y.past, runs: y.runs, year: y.year })),
      runs: pg.flatMap(y => y.runs),
      bpms: pg.flatMap(y => y.runs.map(r => r.bpm)).filter(b => b != null),
    }));

    return {
      RUNS,
      YEAR_MONTH_DATA,
      WEEK_PERIOD_DATA,
      YEAR_PERIOD_DATA,
      curYear: curY,
      curMonth: curM,
      minYear: minY,
      maxYear: curY,
      weekDefaultIdx: Math.max(0, WEEK_PERIOD_DATA.length - 1),
      yearDefaultIdx: Math.max(0, YEAR_PERIOD_DATA.length - 1),
      totalKm: _round1(_sumKm(RUNS)),
    };
  }

  global.buildStatsData = buildStatsData;
})(typeof window !== 'undefined' ? window : globalThis);
