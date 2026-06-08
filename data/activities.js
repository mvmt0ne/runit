/* ═══════════════════════════════════════════════════════════
   ACTIVITIES — 가민 CSV(Activities.csv)에서 로드한 활동 요약
   key = '날짜' (YYYY-MM-DD)
   사용:
     <script src="./data/activities.js"></script>
     loadActivities().then(list => { ... })
     getActivity('2026-04-26').then(act => { ... })
═══════════════════════════════════════════════════════════ */

const ACTIVITIES_CSV_PATH = './data/activities.csv';

/* ── CSV 파서 (쿼팅, 쉼표/개행 포함 필드 처리) ── */
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuote = false;
      } else field += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/* ── 제목 → type 추론 ── */
function inferType(title) {
  const t = String(title || '').trim();
  if (t === 'E' || t === '러닝') return 'easy';
  if (t === 'S') return 'tempo'; // steady → tempo 로 병합
  if (t === 'T') return 'tempo';
  if (t === 'J') return 'jogging';
  if (t === 'TT') return 'tt';
  if (t === 'L') return 'long';
  if (t === 'I') return 'interval';
  if (t === 'R') return 'race';
  if (/[가-힣]/.test(t)) return 'race';
  return 'easy';
}

/* ── 런타입 정규화 — steady 는 tempo 로 병합 (레거시 저장값 호환) ── */
function normRunType(t) {
  return t === 'steady' ? 'tempo' : t;
}

/* ── 안전한 숫자 변환 (쉼표/따옴표 제거) ── */
function num(v) {
  if (v == null) return null;
  const s = String(v).replace(/[",]/g, '').trim();
  if (!s || s === '--') return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/* ── 페이스 "M:SS" → 초 ── */
function paceToSec(p) {
  if (!p) return null;
  const m = String(p).match(/^(\d+):(\d+)$/);
  return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : null;
}

/* ── duration "HH:MM:SS" 또는 "MM:SS" → 초 ── */
function durToSec(d) {
  if (!d) return null;
  const parts = String(d).split(':').map(s => parseInt(s, 10));
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

/* ── duration HH:MM:SS → 짧은 표시("1:46:42" 또는 "41:20") ── */
function shortDur(d) {
  if (!d) return d;
  const m = String(d).match(/^(\d{2}):(\d{2}):(\d{2})/);
  if (!m) return d;
  const h = parseInt(m[1]), mm = m[2], ss = m[3];
  return h > 0 ? `${h}:${mm}:${ss}` : `${parseInt(mm)}:${ss}`;
}

/* ── 한 row → 활동 객체 정규화 ── */
function normalizeRow(headers, row) {
  const get = (key) => {
    const idx = headers.indexOf(key);
    return idx >= 0 ? row[idx] : null;
  };
  const dateRaw = get('날짜') || '';
  const [datePart, timePart] = dateRaw.split(' ');
  const title = get('제목') || '';
  const km = num(get('거리'));
  const pace = get('평균 페이스') || null;
  return {
    date: datePart || null,                 // YYYY-MM-DD
    startTime: (timePart || '').slice(0, 5),// HH:MM
    name: title,
    type: inferType(title),
    activityKind: get('활동 종류'),
    favorite: get('즐겨찾기') === 'true',
    km,
    dur: shortDur(get('시간')),
    durSec: durToSec(get('시간')),
    pace,
    paceV: paceToSec(pace),
    maxPace: get('최대 페이스'),
    bpm: num(get('평균 심박')),
    maxBpm: num(get('최대심박')),
    teAerobic: num(get('유산소 훈련 효과')),
    spm: num(get('평균 달리기 케이던스')),
    maxSpm: num(get('최고 달리기 케이던스')),
    calories: num(get('칼로리')),
    stride: num(get('평균 보폭')),                // 미터
    vertRatio: num(get('평균 수직 비율')),
    vertOsc: num(get('평균 수직 진동')),
    ground: num(get('평균 지면 접촉 시간')),       // ms
    avgGAP: get('평균 GAP'),
    np: num(get('Normalized Power® (NP®)')),
    tss: num(get('Training Stress Score®')),
    avgPower: num(get('평균 파워')),
    maxPower: num(get('최대 파워')),
    steps: num(get('걸음')),
    ascent: num(get('총 상승')),
    descent: num(get('총 하강')),
    tempMin: num(get('최저 온도')),
    tempMax: num(get('최고 온도')),
    bestLap: get('최고 랩 기록'),
    lapCount: num(get('랩 수')),
    movingTime: get('이동 시간'),
    elapsedTime: get('경과 시간'),
    elevMin: num(get('최저 해발')),
    elevMax: num(get('최고 해발')),
  };
}

/* ── 수동 입력 → 정규화 활동 객체 (CSV 행과 동일 형태) ──
   in: { id?, date, name, type, km, dur, pace?, bpm?, spm?, ground?, stride? }
   - pace 비우면 dur/km 로 자동 계산
   - stride 는 미터 단위로 저장 (CSV '평균 보폭'과 동일) */
function buildManualActivity(input) {
  const km = num(input.km);
  const durSec = durToSec(input.dur);
  let pace = (input.pace || '').trim() || null;
  let paceV = paceToSec(pace);
  if (!paceV && km && durSec) {
    paceV = Math.round(durSec / km);
    pace = `${Math.floor(paceV / 60)}:${String(paceV % 60).padStart(2, '0')}`;
  }
  const fmtDurSec = s => {
    if (s == null) return null;
    const h = Math.floor(s / 3600),
      m = Math.floor((s % 3600) / 60),
      sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${m}:${String(sec).padStart(2, '0')}`;
  };
  const id = input.id || `man-${input.date}-${durSec || ''}-${km || ''}`;
  return {
    id,
    manual: true,
    date: input.date || null,
    startTime: '',
    name: (input.name || '').trim() || (input.type || '러닝'),
    type: input.type || inferType(input.name),
    activityKind: '러닝',
    favorite: false,
    km,
    dur: fmtDurSec(durSec),
    durSec,
    pace,
    paceV,
    bpm: num(input.bpm),
    spm: num(input.spm),
    ground: num(input.ground),
    stride: num(input.stride),
  };
}

/* ── 캐시된 Promise ── */
let _activitiesPromise = null;

function loadActivities() {
  if (_activitiesPromise) return _activitiesPromise;
  _activitiesPromise = fetch(ACTIVITIES_CSV_PATH)
    .then(r => {
      if (!r.ok) throw new Error('CSV 로드 실패: ' + r.status);
      return r.text();
    })
    .then(text => {
      const rows = parseCSV(text).filter(r => r.length > 1);
      if (!rows.length) return [];
      const headers = rows[0].map(h => h.trim());
      return rows.slice(1)
        .map(r => normalizeRow(headers, r))
        .filter(a => a.date && a.activityKind === '러닝');
    })
    .catch(err => {
      console.error('[activities] load error', err);
      return [];
    })
    .then(csvList => {
      // 수동 추가 활동 병합 (store.js 가 로드된 경우)
      const manual = typeof getManualActivities === 'function' ? getManualActivities() : [];
      return csvList.concat(manual.filter(a => a && a.date)).sort((a, b) => (a.date < b.date ? 1 : -1));
    });
  return _activitiesPromise;
}

function getActivity(date) {
  return loadActivities().then(list => list.find(a => a.date === date) || null);
}
