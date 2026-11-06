/* ──────────────────────────────────────────────────────────────
   RYUNO · 네트워크 계층
   - 실제 모드: Firebase Realtime Database + 익명 로그인
   - 시험 모드(?local=1): 한 브라우저 안의 여러 탭끼리만 통하는 가짜 DB
     가짜 DB도 보안 규칙과 같은 권한 검사를 흉내 냅니다.
   - 게임 코드는 이 파일의 Net 만 쓰고, 어느 모드인지 신경 쓰지 않습니다.
   ────────────────────────────────────────────────────────────── */
import { FIREBASE_CONFIG, FIREBASE_SDK, SECURE, roomPath, STALE_MS } from "./firebase-config.js?v=202611061331";
export { SECURE };

const QS = new URLSearchParams(location.search);
const TS = { ".sv": "timestamp" };           // 서버 시각 표시 (두 모드 공통)

export const isDenied = e => /permission/i.test(String((e && (e.code || "")) + " " + (e && e.message || "")));
const denied = () => Object.assign(new Error("PERMISSION_DENIED"), { code: "PERMISSION_DENIED" });
const clone = v => v == null ? null : JSON.parse(JSON.stringify(v));
const parts = p => String(p).split("/").filter(Boolean);

/* ---------- 경로 ---------- */
export const P = {
  room:  c => roomPath(c),
  meta:  c => `${roomPath(c)}/meta`,
  pub:   c => `${roomPath(c)}/pub`,
  seats: c => `${roomPath(c)}/seats`,
  seat:  (c, u) => `${roomPath(c)}/seats/${u}`,
  hands: c => `${roomPath(c)}/hands`,
  hand:  (c, u) => `${roomPath(c)}/hands/${u}`,
  inbox: c => `${roomPath(c)}/inbox`,
  mail:  (c, u) => `${roomPath(c)}/inbox/${u}`,
  priv:  c => `${roomPath(c)}/priv`
};

/* ---------- 방 번호: 헷갈리는 글자(0 O 1 I L) 뺀 31글자 × 6자리 ---------- */
export const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_RE = /^[A-HJKMNP-Z2-9]{6}$/;
export function newCode() {
  let s = "";
  while (s.length < 6) {
    const b = crypto.getRandomValues(new Uint8Array(12));
    for (const x of b) {                     // 248 = 31×8, 그 이상은 버려서 치우침 없앰
      if (x < 248 && s.length < 6) s += CODE_CHARS[x % 31];
    }
  }
  return s;
}

/* ================================================================
   공통 창구
   ================================================================ */
export const Net = {
  kind: "none", uid: null, ok: false, offset: 0, _api: null, _conn: [],
  now() { return Date.now() + this.offset; },
  TS,
  onConn(cb) { this._conn.push(cb); cb(this.ok); return () => this._conn.splice(this._conn.indexOf(cb), 1); },
  _setConn(v) { this.ok = v; this._conn.forEach(f => f(v)); },

  async init() {
    if (this._api) return this;
    this._api = QS.has("local") ? localApi(this) : await firebaseApi(this);
    return this;
  },
  get:    p => Net._api.get(p),
  set:    (p, v) => Net._api.set(p, v),
  update: (p, v) => Net._api.update(p, v),
  remove: p => Net._api.remove(p),
  push:   (p, v) => Net._api.push(p, v),
  /* 값 구독. 권한이 없으면 onErr 로 알려 줌. 해제 함수를 돌려줌 */
  on:     (p, cb, onErr) => Net._api.on(p, cb, onErr),
  /* 연결이 끊기면 서버가 대신 써 줄 값 (접속 표시용) */
  onDisconnectSet: (p, v) => Net._api.onDisconnectSet(p, v)
};

/* ================================================================
   실제 모드: Firebase
   ================================================================ */
async function firebaseApi(N) {
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK}`;
  let A, AU, D;
  try {
    [A, AU, D] = await Promise.all([
      import(`${base}/firebase-app.js`),
      SECURE ? import(`${base}/firebase-auth.js`) : null,   // 잠금 모드에서만 로그인 모듈
      import(`${base}/firebase-database.js`)
    ]);
  } catch (e) {
    throw Object.assign(new Error("NETWORK"), { code: "NETWORK" });
  }
  const app = A.getApps().length ? A.getApp() : A.initializeApp(FIREBASE_CONFIG);

  if (SECURE) N.uid = await signIn(AU, app);
  else N.uid = deviceId();                      // 로그인 없이: 이 기기를 알아보는 번호
  N.kind = "firebase";
  return dbApi(N, D, app);
}

/* 로그인 없이 쓰는 기기 번호. 같은 기기·같은 브라우저면 다시 열어도 같은 사람.
   ?tab=1 이면 탭마다 다른 사람 */
function deviceId() {
  const store = QS.has("tab") ? sessionStorage : localStorage;
  let id = null;
  try { id = store.getItem("ryuno-uid"); } catch (e) {}
  if (!id) {
    id = "u" + Array.from(crypto.getRandomValues(new Uint8Array(10)), b => (b % 36).toString(36)).join("");
    try { store.setItem("ryuno-uid", id); } catch (e) {}
  }
  return id;
}

async function signIn(AU, app) {
  /* 익명 로그인. 기본은 같은 기기·같은 브라우저면 다시 열어도 같은 사람으로 기억.
     ?tab=1 이면 탭마다 다른 사람 (선생님이 PC 한 대로 여러 명 흉내 낼 때) */
  const auth = AU.getAuth(app);
  await AU.setPersistence(auth, QS.has("tab") ? AU.browserSessionPersistence : AU.browserLocalPersistence);
  const user = await new Promise((res, rej) => {
    const off = AU.onAuthStateChanged(auth, u => { if (u) { off(); res(u); } });
    AU.signInAnonymously(auth).catch(e => { off(); rej(Object.assign(e, { code: e.code || "AUTH" })); });
  });
  return user.uid;
}

function dbApi(N, D, app) {
  const db = D.getDatabase(app);
  D.onValue(D.ref(db, ".info/serverTimeOffset"), s => { N.offset = s.val() || 0; });
  D.onValue(D.ref(db, ".info/connected"), s => N._setConn(!!s.val()));
  const r = p => D.ref(db, p);
  return {
    get: p => D.get(r(p)).then(s => s.val()),
    set: (p, v) => D.set(r(p), v),
    update: (p, v) => D.update(r(p), v),
    remove: p => D.remove(r(p)),
    push: (p, v) => { const k = D.push(r(p)); return D.set(k, v).then(() => k.key); },
    on: (p, cb, onErr) => D.onValue(r(p), s => cb(s.val()), e => onErr && onErr(e)),
    onDisconnectSet: (p, v) => D.onDisconnect(r(p)).set(v)
  };
}

/* ================================================================
   시험 모드: 한 브라우저 안 가짜 DB (BroadcastChannel + localStorage)
   ================================================================ */
function localApi(N) {
  const KEY = "ryuno-local-db";
  const ch = new BroadcastChannel("ryuno-local");
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  let tree = load();
  const subs = [];

  /* 탭마다 다른 사람 */
  let uid = sessionStorage.getItem("ryuno-local-uid");
  if (!uid) { uid = "L" + Math.random().toString(36).slice(2, 10); sessionStorage.setItem("ryuno-local-uid", uid); }
  N.uid = uid; N.kind = "local";
  setTimeout(() => N._setConn(true));

  const at = p => parts(p).reduce((o, k) => o == null ? undefined : o[k], tree);
  const resolveTS = v => {
    if (v && typeof v === "object") {
      if (v[".sv"] === "timestamp") return Date.now();
      const o = Array.isArray(v) ? [] : {};
      for (const k in v) o[k] = resolveTS(v[k]);
      return o;
    }
    return v;
  };
  function put(p, v) {
    const ks = parts(p); let o = tree;
    for (let i = 0; i < ks.length - 1; i++) {
      if (typeof o[ks[i]] !== "object" || o[ks[i]] === null) o[ks[i]] = {};
      o = o[ks[i]];
    }
    const last = ks[ks.length - 1];
    if (v == null) delete o[last]; else o[last] = v;
  }

  /* ---- database.rules.json 과 같은 권한 검사 ---- */
  /* 방 경로를 잘라 (방번호, 그 아래 칸, 사람) 으로 나눔 */
  const ROOM_RE = /^(?:ryuno\/rooms\/|rooms\/ryuno-)([^/]+)(?:\/(.*))?$/;
  function where(p) {
    const m = parts(p).join("/").match(ROOM_RE); if (!m) return null;
    const ks = (m[2] || "").split("/").filter(Boolean);
    return { code: m[1], sub: ks[0], key: ks[1], rest: ks.slice(1) };
  }
  const meta = code => at(`${roomPath(code)}/meta`);
  const isHost = code => { const m = meta(code); return !!m && m.host === uid; };
  function canRead(p) {
    if (!SECURE) return true;                    // 잠금 모드가 아니면 기존 게임처럼 열려 있음
    const w = where(p); if (!w || !w.code) return false;
    if (isHost(w.code)) return true;
    if (["meta", "pub", "seats"].includes(w.sub)) return true;
    if (w.sub === "hands" && w.key) return w.key === uid;
    return false;
  }
  function canWrite(p, v) {
    const w = where(p); if (!w || !w.code || !CODE_RE.test(w.code)) return false;
    if (!SECURE) return true;
    if (isHost(w.code)) return true;
    if (!w.sub) {                                // 방 만들기 / 오래된 방 이어받기
      const m = meta(w.code);
      const free = !m || (m.at || 0) < Date.now() - STALE_MS;
      return free && v && v.meta && v.meta.host === uid;
    }
    if (w.sub === "seats" && w.key) {
      if (w.key !== uid || !meta(w.code)) return false;
      const OK = ["name", "on", "at"];          // 학생이 자기 자리에 쓸 수 있는 칸
      if (w.rest.length > 1) return OK.includes(w.rest[1]);
      return v == null || Object.keys(v).every(k => OK.includes(k));
    }
    if (w.sub === "inbox" && w.key) return w.key === uid && !!meta(w.code);
    return false;
  }

  function notify(p) {
    const rel = (a, b) => a === b || a.startsWith(b + "/") || b.startsWith(a + "/");
    subs.forEach(s => { if (rel(s.p, p)) s.cb(clone(at(s.p))); });
  }
  function apply(op) {
    if (op.o === "set") put(op.p, op.v);
    else if (op.o === "upd") Object.entries(op.v).forEach(([k, v]) => put(op.p + "/" + k, v));
    notify(op.p);
  }
  /* 다른 탭의 변경은 내용째 받아서 내 사본에 그대로 적용
     (localStorage 는 탭 사이 반영이 늦을 수 있어 다시 읽지 않음) */
  ch.onmessage = e => { apply(e.data); };
  const run = op => {
    if (op.o === "upd") {
      for (const [k, v] of Object.entries(op.v)) if (!canWrite(op.p + "/" + k, v)) return Promise.reject(denied());
    } else if (!canWrite(op.p, op.v)) return Promise.reject(denied());
    op.v = resolveTS(clone(op.v));
    apply(op);
    localStorage.setItem(KEY, JSON.stringify(tree));   // 새로 여는 탭을 위한 저장
    ch.postMessage(op);
    return Promise.resolve();
  };

  /* 탭을 닫으면 '연결 끊김' 값을 대신 써 줌 */
  const onBye = [];
  addEventListener("pagehide", () => onBye.forEach(([p, v]) => { try { run({ o: "set", p, v }); } catch (e) {} }));

  return {
    get: p => { return canRead(p) ? Promise.resolve(clone(at(p))) : Promise.reject(denied()); },
    set: (p, v) => run({ o: "set", p, v }),
    update: (p, v) => run({ o: "upd", p, v }),
    remove: p => run({ o: "set", p, v: null }),
    push: (p, v) => {
      const k = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      return run({ o: "set", p: p + "/" + k, v }).then(() => k);
    },
    on: (p, cb, onErr) => {
      if (!canRead(p)) { setTimeout(() => onErr && onErr(denied())); return () => {}; }
      const s = { p, cb: v => { if (canRead(p)) cb(v); } };
      subs.push(s);
      setTimeout(() => cb(clone(at(p))));
      return () => { const i = subs.indexOf(s); if (i >= 0) subs.splice(i, 1); };
    },
    onDisconnectSet: (p, v) => { onBye.push([p, v]); return Promise.resolve(); }
  };
}
