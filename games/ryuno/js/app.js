/* ──────────────────────────────────────────────────────────────
   RYUNO · 1단계 화면: 방 만들기 / 참가 / 연결·손패 보호 시험
   주소 그대로        → 처음 화면 (칠판에서 방 만들기, 또는 참가)
   ?join=방번호       → 학생 기기 참가 화면
   ?local=1           → 인터넷 없이 한 브라우저 탭끼리 시험
   ?tab=1             → (실제 모드) 탭마다 다른 사람으로 접속
   ────────────────────────────────────────────────────────────── */
import { Net, P, newCode, CODE_RE, isDenied, SECURE } from "./net.js";
import { STALE_MS } from "./firebase-config.js";

const QS = new URLSearchParams(location.search);
const $app = document.getElementById("app");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ls = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const keepParams = () => ["local", "tab"].filter(k => QS.has(k)).map(k => `&${k}=1`).join("");
const joinURL = code => `${location.origin}${location.pathname}?join=${code}${keepParams()}`;
const homeURL = () => `${location.pathname}${QS.has("local") ? "?local=1" : QS.has("tab") ? "?tab=1" : ""}`;

/* 시험용 자음 색 (6단계에서 카드 데이터로 옮김) */
const COLOR = {};
"ㄱㄲㅋㄷㄸㅌㅂㅃㅍ".split("").forEach(c => COLOR[c] = "red");
"ㅅㅆㅎ".split("").forEach(c => COLOR[c] = "blue");
"ㅈㅉㅊ".split("").forEach(c => COLOR[c] = "yel");
"ㄴㄹㅁㅇ".split("").forEach(c => COLOR[c] = "grn");
const JAMO = Object.keys(COLOR);
const pick = n => Array.from(crypto.getRandomValues(new Uint32Array(n)), x => JAMO[x % JAMO.length]);
const cardHTML = j => `<div class="card ${COLOR[j]}"><div class="k">${j}</div><div class="m"><span>${j}</span></div></div>`;

const top = sub => `<div class="top"><a class="logo" href="${homeURL()}" style="text-decoration:none">RYUNO<small>${esc(sub)}</small></a>
  <div class="conn"><span class="dot" id="cdot"></span><span id="ctxt">연결됨</span>${Net.kind === "local" ? " · 시험 모드" : ""}</div></div>`;
function watchConn() {
  Net.onConn(ok => {
    const d = document.getElementById("cdot"), t = document.getElementById("ctxt");
    if (d) d.classList.toggle("off", !ok);
    if (t) t.textContent = ok ? "연결됨" : "연결 끊김 · 다시 잇는 중";
  });
}

/* ================================================================ 시작 */
boot();
async function boot() {
  try {
    await Net.init();
  } catch (e) {
    return showInitError(e);
  }
  const code = (QS.get("join") || "").toUpperCase();
  if (code) return Player(code);
  Home();
}

function showInitError(e) {
  const c = String(e && e.code || "");
  let body;
  if (/operation-not-allowed|admin-restricted/.test(c)) {
    body = `<h1>익명 로그인이 꺼져 있어요</h1>
      <p class="lead">Firebase 콘솔에서 한 번만 켜 주시면 됩니다.</p>
      <ol><li>console.firebase.google.com → <b>appleday-quiz</b> 프로젝트</li>
      <li>왼쪽 메뉴 <b>빌드 → Authentication</b> → <b>Sign-in method</b> 탭</li>
      <li><b>익명</b>(Anonymous) → <b>사용 설정</b> 켜기 → 저장</li>
      <li>이 화면을 새로 고침</li></ol>`;
  } else if (c === "NETWORK" || /network/.test(c)) {
    body = `<h1>인터넷에 연결하지 못했어요</h1><p class="lead">와이파이를 확인하고 새로 고침해 주세요.</p>`;
  } else {
    body = `<h1>시작하지 못했어요</h1><p class="lead">${esc(c || e && e.message)}</p>`;
  }
  $app.innerHTML = `<div class="err"><div class="logo" style="margin-bottom:20px">RYUNO</div>${body}
    <div class="row" style="margin-top:24px"><button class="pill y" onclick="location.reload()">새로 고침</button></div></div>`;
}

/* ================================================================ 처음 화면 */
function Home() {
  $app.innerHTML = `<div class="wrap">${top("류노")}
    <h1>한글 음운으로 하는<br>우노, 류노!</h1>
    <p class="lead">1단계 연결 시험 화면입니다. 칠판에서 방을 만들고, 태블릿이나 휴대폰으로 들어와 보세요.</p>
    <div class="grid2">
      <div class="box"><h2 style="margin-top:0">칠판 (선생님)</h2>
        <p class="muted" style="margin-bottom:16px">방 번호와 QR을 띄우고 게임을 진행합니다.</p>
        <button class="pill y" id="mk">방 만들기</button></div>
      <div class="box"><h2 style="margin-top:0">참가 (학생)</h2>
        <input class="inp code" id="jc" maxlength="6" placeholder="방 번호" autocomplete="off" autocapitalize="characters">
        <div class="row" style="margin-top:12px"><button class="pill" id="jb">들어가기</button></div>
        <div id="jm"></div></div>
    </div></div>`;
  watchConn();
  document.getElementById("mk").onclick = () => Host();
  const go = () => {
    const c = document.getElementById("jc").value.trim().toUpperCase();
    if (!CODE_RE.test(c)) { document.getElementById("jm").innerHTML = `<div class="res bad">방 번호 6자리를 확인해 주세요.</div>`; return; }
    location.href = joinURL(c);
  };
  document.getElementById("jb").onclick = go;
  document.getElementById("jc").onkeydown = e => { if (e.key === "Enter") go(); };
}

/* ================================================================ 칠판 (심판) */
async function Host() {
  $app.innerHTML = `<div class="wrap">${top("칠판")}<p class="muted">방을 여는 중…</p></div>`;
  watchConn();

  /* 지난번에 열던 방이 아직 내 것이면 이어서 */
  let code = ls.get("ryuno-host-code", null);
  if (code) {
    const m = await Net.get(P.meta(code)).catch(() => null);
    if (!m || m.host !== Net.uid) code = null;
  }
  if (!code) {
    for (let i = 0; i < 6 && !code; i++) {
      const c = newCode();
      const old = await Net.get(P.meta(c)).catch(() => null);      // 쓰는 중인 번호면 건너뜀
      if (old && (old.at || 0) > Net.now() - STALE_MS) continue;
      try { await Net.set(P.room(c), { meta: { host: Net.uid, at: Net.TS, v: 1, stage: "test" } }); code = c; }
      catch (e) { if (!isDenied(e)) return showInitError(e); }
    }
    if (!code) return showInitError({ message: "빈 방 번호를 찾지 못했어요. 다시 시도해 주세요." });
    ls.set("ryuno-host-code", code);
  }

  /* 심판이 살아 있다는 신호 (1분마다) */
  const beat = () => Net.update(P.meta(code), { at: Net.TS }).catch(() => {});
  beat(); setInterval(beat, 60000);

  let seats = {}, got = {}, logs = [];
  $app.innerHTML = `<div class="wrap">${top("칠판")}
    <div class="box row" style="gap:24px">
      <div class="qr">${typeof qrSVG === "function" ? qrSVG(joinURL(code)) : ""}</div>
      <div><div class="muted">방 번호</div><div class="codebig">${code}</div>
        <div class="muted" style="margin-top:10px">${esc(joinURL(code).replace(/^https?:\/\//, ""))}</div></div>
    </div>
    <div class="grid2" style="margin-top:16px">
      <div class="box"><h2 style="margin-top:0">들어온 사람 <span id="cnt" class="muted"></span></h2><div class="list" id="seats"></div>
        <div class="row" style="margin-top:14px"><button class="pill y sm" id="deal">시험용 손패 3장씩 나눠 주기</button></div></div>
      <div class="box"><h2 style="margin-top:0">받은 신호</h2><div class="log" id="log"><span class="muted">학생 기기에서 [신호 보내기]를 눌러 보세요.</span></div></div>
    </div>
    <div class="row" style="margin-top:20px"><button class="pill r sm" id="close">방 닫기</button></div></div>`;
  watchConn();

  const drawSeats = () => {
    const ids = Object.keys(seats);
    document.getElementById("cnt").textContent = ids.length ? `${ids.length}명` : "";
    document.getElementById("seats").innerHTML = ids.length ? ids.map(u => {
      const s = seats[u] || {};
      return `<div class="item"><span class="dot ${s.on ? "" : "off"}"></span>${esc(s.name)}<span class="r">신호 ${got[u] || 0}번</span></div>`;
    }).join("") : `<span class="muted">아직 아무도 없어요.</span>`;
  };
  const drawLog = () => {
    document.getElementById("log").innerHTML = logs.slice(-40).reverse().map(l => `<div>${l}</div>`).join("");
  };
  Net.on(P.seats(code), v => { seats = v || {}; drawSeats(); });

  /* 학생 → 칠판 신호함. 읽고 나면 지움 */
  Net.on(P.inbox(code), box => {
    if (!box) return;
    for (const [u, msgs] of Object.entries(box)) {
      for (const [k, m] of Object.entries(msgs || {})) {
        const name = (seats[u] && seats[u].name) || "누군가";
        const lag = Math.max(0, Math.round(Net.now() - (m.at || Net.now())));
        if (m.t === "ping") { got[u] = (got[u] || 0) + 1; logs.push(`📶 <b>${esc(name)}</b>의 신호 · ${lag}ms 걸림`); }
        Net.remove(`${P.mail(code, u)}/${k}`).catch(() => {});
      }
    }
    drawSeats(); drawLog();
  });

  document.getElementById("deal").onclick = async () => {
    const ids = Object.keys(seats); if (!ids.length) return;
    const upd = {}; ids.forEach(u => upd[u] = { cards: pick(3) });
    await Net.update(P.hands(code), upd);
    logs.push(`🃏 ${ids.length}명에게 손패를 나눠 줬어요. 각자 자기 카드만 보여야 합니다.`); drawLog();
  };
  document.getElementById("close").onclick = async () => {
    if (!confirm("방을 닫을까요? 들어온 학생들은 모두 나가게 됩니다.")) return;
    await Net.remove(P.room(code)).catch(() => {});
    ls.set("ryuno-host-code", null); location.href = homeURL();
  };
}

/* ================================================================ 학생 기기 */
async function Player(code) {
  if (!CODE_RE.test(code)) return playerMsg("방 번호가 올바르지 않아요.");
  const meta = await Net.get(P.meta(code)).catch(() => null);
  if (!meta) return playerMsg(`<b>${esc(code)}</b> 방을 찾을 수 없어요. 칠판의 방 번호를 다시 확인해 주세요.`);

  const mine = await Net.get(P.seat(code, Net.uid)).catch(() => null);
  if (mine && mine.name) return enter(code, mine.name);

  $app.innerHTML = `<div class="wrap">${top(code)}
    <h1>이름을 적어 주세요</h1><p class="lead">칠판과 다른 친구들에게 보이는 이름이에요. (12자까지)</p>
    <input class="inp" id="nm" maxlength="12" placeholder="예) 3반 류봉두" value="${esc(ls.get("ryuno-name", ""))}">
    <div class="row" style="margin-top:14px"><button class="pill y" id="go">들어가기</button></div><div id="m"></div></div>`;
  watchConn();
  const go = () => {
    const n = document.getElementById("nm").value.trim().slice(0, 12);
    if (!n) { document.getElementById("m").innerHTML = `<div class="res bad">이름을 적어 주세요.</div>`; return; }
    ls.set("ryuno-name", n); enter(code, n);
  };
  document.getElementById("go").onclick = go;
  document.getElementById("nm").onkeydown = e => { if (e.key === "Enter") go(); };
}

function playerMsg(html) {
  $app.innerHTML = `<div class="wrap">${top("참가")}<h1>앗,</h1><p class="lead">${html}</p>
    <a class="pill y" href="${homeURL()}">처음으로</a></div>`;
  watchConn();
}

async function enter(code, name) {
  const seatPath = P.seat(code, Net.uid);
  const sit = async () => {
    await Net.update(seatPath, { name, on: true, at: Net.TS });
    await Net.onDisconnectSet(`${seatPath}/on`, false);   // 끊기면 서버가 '나감'으로 표시
  };
  try { await sit(); } catch (e) { return playerMsg("방에 들어가지 못했어요. 방이 닫혔을 수 있어요."); }
  Net.onConn(ok => { if (ok) sit().catch(() => {}); });   // 다시 연결되면 자리 되찾기

  $app.innerHTML = `<div class="wrap">${top(code)}
    <h1>${esc(name)}</h1><p class="lead">들어왔어요. 칠판에 내 이름이 보이는지 확인해 보세요.</p>
    <div class="box"><h2 style="margin-top:0">내 손패</h2><div class="hand" id="hand"><span class="muted">칠판에서 [손패 나눠 주기]를 누르면 여기에 카드가 생겨요.</span></div></div>
    <div class="box" style="margin-top:16px"><h2 style="margin-top:0">시험해 보기</h2>
      <div class="row"><button class="pill y sm" id="ping">📶 신호 보내기</button>
        ${SECURE ? `<button class="pill sm" id="peek">🕵️ 다른 사람 손패 훔쳐보기</button>
        <button class="pill sm" id="hack">✏️ 칠판 마음대로 바꾸기</button>` : ""}</div>
      <div id="res"></div></div>
    <div class="box" style="margin-top:16px"><h2 style="margin-top:0">같은 방 친구들</h2><div class="list" id="others"></div></div></div>`;
  watchConn();

  let seats = {};
  Net.on(P.hand(code, Net.uid), h => {
    const el = document.getElementById("hand");
    if (h && h.cards) el.innerHTML = h.cards.map(cardHTML).join("");
  });
  Net.on(P.seats(code), v => {
    seats = v || {};
    const others = Object.entries(seats).filter(([u]) => u !== Net.uid);
    document.getElementById("others").innerHTML = others.length
      ? others.map(([, s]) => `<div class="item"><span class="dot ${s.on ? "" : "off"}"></span>${esc(s.name)}</div>`).join("")
      : `<span class="muted">아직 나 혼자예요.</span>`;
  });
  Net.on(P.meta(code), m => { if (!m) playerMsg("선생님이 방을 닫았어요."); });

  const res = (ok, msg) => { document.getElementById("res").innerHTML = `<div class="res ${ok ? "ok" : "bad"}">${msg}</div>`; };
  document.getElementById("ping").onclick = () =>
    Net.push(P.mail(code, Net.uid), { t: "ping", at: Net.TS })
      .then(() => res(true, "신호를 보냈어요. 칠판의 [받은 신호]를 확인해 보세요."))
      .catch(e => res(false, "신호를 보내지 못했어요: " + esc(e.code || e.message)));

  if (SECURE) document.getElementById("peek").onclick = async () => {
    const other = Object.keys(seats).find(u => u !== Net.uid);
    if (!other) return res(false, "다른 친구가 한 명 이상 들어와야 시험할 수 있어요.");
    try {
      const v = await Net.get(P.hand(code, other));
      res(false, `⚠️ ${esc(seats[other].name)}의 손패가 보였어요${v ? ` (${esc((v.cards || []).join(" "))})` : ""}. 보안 규칙을 다시 확인해야 합니다.`);
    } catch (e) {
      if (isDenied(e)) res(true, `✅ 막혔어요. ${esc(seats[other].name)}의 손패는 볼 수 없습니다.`);
      else res(false, "다른 이유로 실패했어요: " + esc(e.code || e.message));
    }
  };
  if (SECURE) document.getElementById("hack").onclick = async () => {
    try {
      await Net.set(`${P.pub(code)}/hacked`, name);
      res(false, "⚠️ 칠판 상태를 바꿀 수 있었어요. 보안 규칙을 다시 확인해야 합니다.");
    } catch (e) {
      if (isDenied(e)) res(true, "✅ 막혔어요. 칠판 상태는 선생님(심판)만 바꿀 수 있습니다.");
      else res(false, "다른 이유로 실패했어요: " + esc(e.code || e.message));
    }
  };
}
