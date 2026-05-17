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
  meta:   'runit:meta',
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

function getMeta(date) {
  const overrides = _load(STORE_KEYS.meta);
  return overrides[date] || null;
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

function setMeta(date, meta) {
  const all = _load(STORE_KEYS.meta);
  all[date] = meta;
  _save(STORE_KEYS.meta, all);
}

/* ── 관리 ── */
function listSavedDates() {
  const splits = _load(STORE_KEYS.splits);
  const zones  = _load(STORE_KEYS.zones);
  const meta   = _load(STORE_KEYS.meta);
  const set = new Set([...Object.keys(splits), ...Object.keys(zones), ...Object.keys(meta)]);
  return [...set].sort().reverse().map(date => ({
    date,
    hasSplits: !!splits[date],
    hasZones:  !!zones[date],
    hasMeta:   !!meta[date],
  }));
}

function removeSaved(date) {
  const splits = _load(STORE_KEYS.splits);
  const zones  = _load(STORE_KEYS.zones);
  const meta   = _load(STORE_KEYS.meta);
  delete splits[date];
  delete zones[date];
  delete meta[date];
  _save(STORE_KEYS.splits, splits);
  _save(STORE_KEYS.zones,  zones);
  _save(STORE_KEYS.meta,   meta);
}

function clearAllSaved() {
  localStorage.removeItem(STORE_KEYS.splits);
  localStorage.removeItem(STORE_KEYS.zones);
  localStorage.removeItem(STORE_KEYS.meta);
}
