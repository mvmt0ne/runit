/* ═══════════════════════════════════════════════════════════
   STORE — localStorage 우선, default(번들) 폴백
   사용 패턴:
     <script src="./data/splits.js"></script>
     <script src="./data/zones.js"></script>
     <script src="./data/store.js"></script>
     getSplits('2026-04-26') → [...]
     setSplits('2026-04-26', [...])  // localStorage에 저장
═══════════════════════════════════════════════════════════ */

const STORE_KEYS = {
  splits: 'runit:splits',
  zones:  'runit:zones',
};

function _load(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}

function _save(key, obj) {
  localStorage.setItem(key, JSON.stringify(obj));
}

/* ── 읽기 ── */
function getSplits(date) {
  const overrides = _load(STORE_KEYS.splits);
  if (overrides[date]) return overrides[date];
  if (typeof SPLITS_DEFAULT !== 'undefined' && SPLITS_DEFAULT[date]) {
    return SPLITS_DEFAULT[date];
  }
  return null;
}

function getZones(date) {
  const overrides = _load(STORE_KEYS.zones);
  if (overrides[date]) return overrides[date];
  if (typeof ZONES_DEFAULT !== 'undefined' && ZONES_DEFAULT[date]) {
    return ZONES_DEFAULT[date];
  }
  return null;
}

/* ── 쓰기 ── */
function setSplits(date, splits) {
  const all = _load(STORE_KEYS.splits);
  all[date] = splits;
  _save(STORE_KEYS.splits, all);
}

function setZones(date, zones) {
  const all = _load(STORE_KEYS.zones);
  all[date] = zones;
  _save(STORE_KEYS.zones, all);
}

/* ── 관리 ── */
function listSavedDates() {
  const splits = _load(STORE_KEYS.splits);
  const zones  = _load(STORE_KEYS.zones);
  const set = new Set([...Object.keys(splits), ...Object.keys(zones)]);
  return [...set].sort().reverse().map(date => ({
    date,
    hasSplits: !!splits[date],
    hasZones:  !!zones[date],
  }));
}

function removeSaved(date) {
  const splits = _load(STORE_KEYS.splits);
  const zones  = _load(STORE_KEYS.zones);
  delete splits[date];
  delete zones[date];
  _save(STORE_KEYS.splits, splits);
  _save(STORE_KEYS.zones,  zones);
}

function clearAllSaved() {
  localStorage.removeItem(STORE_KEYS.splits);
  localStorage.removeItem(STORE_KEYS.zones);
}
