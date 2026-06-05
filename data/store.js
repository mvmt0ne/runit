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
  splits:     'runit:splits',
  zones:      'runit:zones',
  meta:       'runit:meta',
  activities: 'runit:activities', // 수동 추가 활동 (CSV 외) — { [id]: activity }
  shoes:      'runit:shoes',      // 내 신발장 — { [id]: {id, name, image} }
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
  localStorage.removeItem(STORE_KEYS.activities);
  // 신발장(runit:shoes)은 자산이라 전체삭제에서 제외 — 명시적으로만 삭제
}

/* ── 내 신발장 (재사용 신발 — 날짜와 무관) ── */
function getShoes() {
  return Object.values(_load(STORE_KEYS.shoes));
}

function getShoe(id) {
  return _load(STORE_KEYS.shoes)[id] || null;
}

function saveShoe(shoe) {
  if (!shoe || !shoe.id) return;
  const all = _load(STORE_KEYS.shoes);
  all[shoe.id] = shoe;
  _save(STORE_KEYS.shoes, all);
}

function removeShoe(id) {
  const all = _load(STORE_KEYS.shoes);
  delete all[id];
  _save(STORE_KEYS.shoes, all);
}

function listShoes() {
  return getShoes().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

/* ── 수동 활동 (CSV 외 직접 추가) ── */
function getManualActivities() {
  return Object.values(_load(STORE_KEYS.activities));
}

function getManualActivity(id) {
  return _load(STORE_KEYS.activities)[id] || null;
}

function saveManualActivity(act) {
  if (!act || !act.id) return;
  const all = _load(STORE_KEYS.activities);
  all[act.id] = act;
  _save(STORE_KEYS.activities, all);
}

function removeManualActivity(id) {
  const all = _load(STORE_KEYS.activities);
  delete all[id];
  _save(STORE_KEYS.activities, all);
}

function listManualActivities() {
  return getManualActivities().sort((a, b) => (a.date < b.date ? 1 : -1));
}
