/* ═══════════════════════════════════════════════════════════
   STORE — localStorage 우선 데이터 저장
   사용 패턴:
     <script src="./data/store.js"></script>
     getMeta('2026-04-26'), setMeta(...), getShoes(), getManualActivities() ...
═══════════════════════════════════════════════════════════ */

const STORE_KEYS = {
  meta:       'runit:meta',       // 날짜별 오버라이드 — { [date]: {name,type,note,shoeId} }
  activities: 'runit:activities', // 수동 추가 활동 (CSV 외) — { [id]: activity }
  shoes:      'runit:shoes',      // 내 신발장 — { [id]: {id, name, image} }
  pb:         'runit:pb',         // 거리별 공식 PB(가민 입력) — { [dist]: {time,pace,date,name} }
};

function _load(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}

function _save(key, obj) {
  localStorage.setItem(key, JSON.stringify(obj));
  // 클라우드 동기화 (로그인 시) — 미로드/미로그인이면 무시
  try { if (window.RUNIT_CLOUD && window.RUNIT_CLOUD.enabled) window.RUNIT_CLOUD.pushStore(key, obj); } catch (e) {}
}

/* ── 날짜별 메타 ── */
function getMeta(date) {
  const overrides = _load(STORE_KEYS.meta);
  return overrides[date] || null;
}

function setMeta(date, meta) {
  const all = _load(STORE_KEYS.meta);
  all[date] = meta;
  _save(STORE_KEYS.meta, all);
}

/* ── 관리 ── */
function listSavedDates() {
  const meta = _load(STORE_KEYS.meta);
  return Object.keys(meta).sort().reverse().map(date => ({ date, hasMeta: true }));
}

function removeSaved(date) {
  const meta = _load(STORE_KEYS.meta);
  delete meta[date];
  _save(STORE_KEYS.meta, meta);
}

function clearAllSaved() {
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

/* ── 거리별 공식 PB (가민 기록 직접 입력) ── */
function getAllPB() {
  return _load(STORE_KEYS.pb);
}

function getPB(dist) {
  return _load(STORE_KEYS.pb)[dist] || null;
}

function setPB(dist, pb) {
  const all = _load(STORE_KEYS.pb);
  all[dist] = pb;
  _save(STORE_KEYS.pb, all);
}

function removePB(dist) {
  const all = _load(STORE_KEYS.pb);
  delete all[dist];
  _save(STORE_KEYS.pb, all);
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
