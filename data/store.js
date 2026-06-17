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
  zones:      'runit:zones',      // 심박존 경계 이력 — [{from:'YYYY-MM-DD', z2Max, z3Max}]
};

// 심박존 기본값 (이력 없을 때 = 모든 과거 기록의 '지금 기준')
// 존: z1 112~ / z2 138~ / z3 152~ / z4 164~ / z5 173+
// 강도 매핑: 저=z1~z2(≤151) / 중=z3(152~163) / 고=z4+(164+)
const ZONE_DEFAULT = { z2Max: 151, z3Max: 163 };

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
  return getShoes().sort((a, b) => {
    const ao = a.order, bo = b.order;
    if (ao != null && bo != null) return ao - bo;     // 둘 다 순서 있으면 순서대로
    if (ao != null) return -1;                        // 순서 있는 것 먼저
    if (bo != null) return 1;
    return (a.name || '').localeCompare(b.name || ''); // 둘 다 없으면 이름순
  });
}

// 드래그로 바뀐 순서 저장 — ids(새 순서)대로 order 인덱스 부여
function reorderShoes(ids) {
  const all = _load(STORE_KEYS.shoes);
  ids.forEach((id, i) => { if (all[id]) all[id].order = i; });
  _save(STORE_KEYS.shoes, all);
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

/* ── 심박존 경계 이력 (날짜별 적용) ──
   존을 바꿔도 과거 기록은 그 당시 존으로 분류되도록, 적용 시작일(from)과 함께 보관.
   각 항목: { from:'YYYY-MM-DD', z2Max, z3Max }  (저=≤z2Max / 중=≤z3Max / 고=초과) */
function getZoneHistory() {
  const r = _load(STORE_KEYS.zones);
  return Array.isArray(r) ? r.slice().sort((a, b) => (a.from < b.from ? -1 : 1)) : [];
}

// 특정 날짜에 유효한 존 설정 — from <= date 중 가장 최근. 없으면 기본값.
function getZoneConfigFor(date) {
  const hist = getZoneHistory();
  if (!hist.length) return ZONE_DEFAULT;
  let cfg = hist[0]; // 가장 이른 설정을 그 이전 기록의 기준으로 사용
  for (const h of hist) {
    if (!date || h.from <= date) cfg = h;
    else break;
  }
  return cfg;
}

// 새 존 설정 추가(= 변경). from(기본 오늘) 이후 기록부터 적용, 과거는 보존.
// 이력이 비어있으면 현재 기본값을 baseline으로 먼저 심어 과거 데이터를 고정.
function addZoneConfig(from, z2Max, z3Max) {
  let hist = getZoneHistory();
  if (!hist.length) hist = [{ from: '2000-01-01', z2Max: ZONE_DEFAULT.z2Max, z3Max: ZONE_DEFAULT.z3Max }];
  hist = hist.filter(h => h.from !== from);
  hist.push({ from, z2Max, z3Max });
  hist.sort((a, b) => (a.from < b.from ? -1 : 1));
  _save(STORE_KEYS.zones, hist);
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
