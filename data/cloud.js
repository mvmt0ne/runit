/* ═══════════════════════════════════════════════════════════
   CLOUD — Firebase(Firestore + Auth) 동기화 (단일 사용자)
   - 로그인 시 users/{uid}/store/{meta,activities,shoes} ↔ localStorage 미러링
   - 미로그인 시엔 아무 것도 안 함 → 앱은 기존(localStorage)대로 동작 (비파괴)
   - 사용법: firebase compat SDK 스크립트 다음, store.js 앞에 로드
     window.RUNIT_CLOUD.signIn(email, pw) / .signOut() / .user / .ready
     'runit-auth'  이벤트: 인증 상태 변경
     'runit-cloud-sync' 이벤트: 클라우드→로컬 동기화 발생(페이지 재렌더용)
═══════════════════════════════════════════════════════════ */
(function () {
  const firebaseConfig = {
    apiKey: 'AIzaSyAYx8dv-9MKt3j9aHuv9nHclU5NzBM2kVM',
    authDomain: 'runiit.firebaseapp.com',
    projectId: 'runiit',
    storageBucket: 'runiit.firebasestorage.app',
    messagingSenderId: '455714941342',
    appId: '1:455714941342:web:e3bbf8de825ab63fb3ce8f',
  };

  // compat SDK 미로드 시 안전 종료 (앱은 localStorage로 동작)
  if (typeof firebase === 'undefined' || !firebase.initializeApp) {
    window.RUNIT_CLOUD = { enabled: false, user: null, ready: Promise.resolve(null) };
    return;
  }

  if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  try { db.enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch (e) {}
  // Storage는 신발 이미지 업로드 페이지(shoes.html)에서만 SDK 로드 → 없으면 null
  let storage = null;
  try { storage = firebase.storage ? firebase.storage() : null; } catch (e) {}

  const STORE_KEYS = ['runit:meta', 'runit:activities', 'runit:shoes', 'runit:pb', 'runit:zones', 'runit:profile'];
  const shortKey = k => k.split(':')[1];
  const docFor = (uid, key) => db.collection('users').doc(uid).collection('store').doc(shortKey(key));

  // 방금 로컬에서 push 한 키의 시각 — 직후 도착하는 에코/경합 스냅샷이
  // 방금 저장한 로컬 최신값을 덮어써 지우는 것을 막기 위함.
  const _lastPush = {};
  const PUSH_GUARD_MS = 6000;

  let _resolveReady;
  const cloud = {
    enabled: true,
    user: null,
    ready: new Promise(res => (_resolveReady = res)),
    signIn: (email, pw) => auth.signInWithEmailAndPassword(email, pw),
    signOut: () => auth.signOut(),
    // 로컬 저장 후 호출 → 클라우드 반영 (store.js가 사용)
    pushStore(key, obj) {
      if (!this.user || STORE_KEYS.indexOf(key) < 0) return;
      _lastPush[key] = Date.now();
      docFor(this.user.uid, key).set({ data: obj, updated: Date.now() }).catch(() => {});
    },
    // 신발 이미지 → Firebase Storage 업로드, 다운로드 URL 반환 (Firestore 1MB 한도 회피)
    storageReady() { return !!(this.user && storage); },
    async uploadShoeImage(shoeId, dataURL) {
      if (!this.storageReady()) throw new Error('storage-unavailable');
      const ref = storage.ref().child(`users/${this.user.uid}/shoes/${shoeId}.png`);
      await ref.putString(dataURL, 'data_url');
      return await ref.getDownloadURL();
    },
    async deleteShoeImage(shoeId) {
      if (!this.storageReady()) return;
      try { await storage.ref().child(`users/${this.user.uid}/shoes/${shoeId}.png`).delete(); } catch (e) {}
    },
  };
  window.RUNIT_CLOUD = cloud;

  let _readyResolvedOnce = false;
  auth.onAuthStateChanged(async user => {
    cloud.user = user;
    if (user) {
      for (const key of STORE_KEYS) {
        const ref = docFor(user.uid, key);
        try {
          const snap = await ref.get();
          if (snap.exists) {
            // 클라우드 → 로컬. 단, 클라우드가 비었는데 로컬에 데이터가 있으면
            // 덮어쓰지 않고 오히려 로컬을 클라우드로 올림 (사고성 삭제 방지)
            const incoming = snap.data().data || {};
            let localObj = {};
            try { localObj = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) {}
            const incomingEmpty = !incoming || Object.keys(incoming).length === 0;
            const localHasData = localObj && Object.keys(localObj).length > 0;
            if (incomingEmpty && localHasData) {
              ref.set({ data: localObj, updated: Date.now() }).catch(() => {});
            } else {
              localStorage.setItem(key, JSON.stringify(incoming));
            }
          } else {
            // 최초: 로컬 → 클라우드 (마이그레이션)
            const cur = localStorage.getItem(key);
            if (cur) ref.set({ data: JSON.parse(cur), updated: Date.now() }).catch(() => {});
          }
        } catch (e) { /* offline 등 무시 */ }
        // 실시간 동기화 (다른 기기 변경 반영)
        ref.onSnapshot(s => {
          if (!s.exists || s.metadata.hasPendingWrites) return;
          // 방금 로컬에서 저장(push)한 키는 잠시 보호 — 에코/경합 스냅샷이
          // 방금 저장한 값을 덮어쓰지 않도록 (저장 직후 데이터가 사라지는 문제 방지)
          if (_lastPush[key] && Date.now() - _lastPush[key] < PUSH_GUARD_MS) return;
          const incoming = s.data().data || {};
          // 클라우드가 비어있는데 로컬에 데이터가 있으면 덮어쓰지 않음 (사고성 삭제 방지)
          let localObj = {};
          try { localObj = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) {}
          const incomingEmpty = !incoming || Object.keys(incoming).length === 0;
          const localHasData = localObj && Object.keys(localObj).length > 0;
          if (incomingEmpty && localHasData) return;
          localStorage.setItem(key, JSON.stringify(incoming));
          window.dispatchEvent(new Event('runit-cloud-sync'));
        }, () => {});
      }
      window.dispatchEvent(new Event('runit-cloud-sync'));
    }
    window.dispatchEvent(new CustomEvent('runit-auth', { detail: { user } }));
    if (!_readyResolvedOnce) { _readyResolvedOnce = true; _resolveReady(user); }
  });
})();
