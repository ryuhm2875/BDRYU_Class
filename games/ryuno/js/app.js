/* ──────────────────────────────────────────────────────────────
   RYUNO · 시작과 길 나누기
   주소 그대로        → 처음 화면 (칠판에서 방 만들기, 또는 참가)
   ?join=방번호       → 학생 기기 참가
   ?local=1           → 인터넷 없이 한 브라우저 탭끼리 시험
   ?tab=1             → 탭마다 다른 사람으로 접속 (PC 한 대로 시험할 때)
   ────────────────────────────────────────────────────────────── */
import { Net, P, CODE_RE } from "./net.js";
import { Board } from "./board.js";
import { Player } from "./player.js";
import { esc, rulesHTML } from "./ui.js";

const QS = new URLSearchParams(location.search);
const $app = document.getElementById("app");
const ls = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const keepParams = () => ["local", "tab"].filter(k => QS.has(k)).map(k => `&${k}=1`).join("");
const ctx = {
  joinURL: code => `${location.origin}${location.pathname}?join=${code}${keepParams()}`,
  homeURL: () => `${location.pathname}${QS.has("local") ? "?local=1" : QS.has("tab") ? "?tab=1" : ""}`
};

const top = sub => `<div class="top"><a class="logo" href="${ctx.homeURL()}" style="text-decoration:none">RYUNO<small>${esc(sub)}</small></a>
  <div class="conn"><span class="dot" id="cdot"></span><span id="ctxt">연결됨</span>${Net.kind === "local" ? " · 시험 모드" : ""}</div></div>`;
function watchConn() {
  Net.onConn(ok => {
    const d = document.getElementById("cdot"), t = document.getElementById("ctxt");
    if (d) d.classList.toggle("off", !ok);
    if (t) t.textContent = ok ? "연결됨" : "연결 끊김 · 다시 잇는 중";
  });
}

boot();
async function boot() {
  try { await Net.init(); } catch (e) { return showInitError(e); }
  const code = (QS.get("join") || "").toUpperCase();
  if (code) return Join(code);
  if (QS.has("board")) return Board(ctx);
  Home();
}

function showInitError(e) {
  const c = String(e && e.code || "");
  const body = c === "NETWORK" || /network/.test(c)
    ? `<h1>인터넷에 연결하지 못했어요</h1><p class="lead">와이파이를 확인하고 새로 고침해 주세요.</p>`
    : /operation-not-allowed|admin-restricted/.test(c)
      ? `<h1>익명 로그인이 꺼져 있어요</h1><p class="lead">잠금 모드를 쓰려면 Firebase 콘솔에서 익명 로그인을 켜 주세요. (README 참고)</p>`
      : `<h1>시작하지 못했어요</h1><p class="lead">${esc(c || (e && e.message))}</p>`;
  $app.innerHTML = `<div class="err"><div class="logo" style="margin-bottom:20px">RYUNO</div>${body}
    <div class="row" style="margin-top:24px"><button class="pill y" onclick="location.reload()">새로 고침</button></div></div>`;
}

/* ================================================================ 처음 화면 */
function Home() {
  $app.innerHTML = `<div class="wrap home">${top("류노")}
    <div class="hero"><div class="hcards"><i class="c1">ㄷ</i><i class="c2">ㄴ</i><i class="c3">ㅈ</i></div>
      <h1>한글 음운으로 하는<br>우노, <span class="y">류노!</span></h1>
      <p class="lead">색이 같거나, 조음 위치가 같거나, 소리 세기가 같으면 낼 수 있어요.<br>손에 든 카드를 가장 먼저 다 내면 이겨요.</p></div>
    <div class="grid2">
      <div class="box"><h2 style="margin-top:0">칠판 · 모둠 태블릿</h2>
        <p class="muted" style="margin-bottom:16px">방 번호와 QR을 띄우고 게임판을 보여 줍니다. 이 기기가 심판을 맡아요.</p>
        <div class="row"><button class="pill y" id="mk">방 만들기</button><button class="pill" id="rl">📖 규칙 보기</button></div></div>
      <div class="box"><h2 style="margin-top:0">참가 (학생)</h2>
        <input class="inp code" id="jc" maxlength="6" placeholder="방 번호" autocomplete="off" autocapitalize="characters">
        <div class="row" style="margin-top:12px"><button class="pill" id="jb">들어가기</button></div>
        <div id="jm"></div></div>
    </div></div>`;
  watchConn();
  document.getElementById("rl").onclick = () => {
    const m = document.createElement("div"); m.className = "modal on";
    m.innerHTML = `<div class="mbox rulesbox">${rulesHTML()}<button class="pill y">알겠어요</button></div>`;
    m.onclick = e => { if (e.target === m || e.target.tagName === "BUTTON") m.remove(); };
    document.body.appendChild(m);
  };
  document.getElementById("mk").onclick = () => { location.href = `${location.pathname}?board=1${keepParams()}`; };
  const go = () => {
    const c = document.getElementById("jc").value.trim().toUpperCase();
    if (!CODE_RE.test(c)) { document.getElementById("jm").innerHTML = `<div class="res bad">방 번호 6자리를 확인해 주세요.</div>`; return; }
    location.href = ctx.joinURL(c);
  };
  document.getElementById("jb").onclick = go;
  document.getElementById("jc").onkeydown = e => { if (e.key === "Enter") go(); };
}

/* ================================================================ 학생 참가 */
async function Join(code) {
  if (!CODE_RE.test(code)) return joinMsg("방 번호가 올바르지 않아요.");
  const meta = await Net.get(P.meta(code)).catch(() => null);
  if (!meta) return joinMsg(`<b>${esc(code)}</b> 방을 찾을 수 없어요. 칠판의 방 번호를 다시 확인해 주세요.`);

  const mine = await Net.get(P.seat(code, Net.uid)).catch(() => null);
  if (mine && mine.name) return enter(code, mine.name);

  $app.innerHTML = `<div class="wrap">${top(code)}
    <h1>이름을 적어 주세요</h1><p class="lead">칠판과 친구들에게 보이는 이름이에요. (12자까지)</p>
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

function joinMsg(html) {
  document.body.classList.remove("player");
  $app.innerHTML = `<div class="wrap">${top("참가")}<h1>앗,</h1><p class="lead">${html}</p>
    <a class="pill y" href="${ctx.homeURL()}">처음으로</a></div>`;
  watchConn();
}

async function enter(code, name) {
  const seatPath = P.seat(code, Net.uid);
  const sit = async () => {
    await Net.update(seatPath, { name, on: true, at: Net.TS });
    await Net.onDisconnectSet(`${seatPath}/on`, false);   // 끊기면 서버가 '나감'으로 표시
  };
  let out = false, had = false;
  try { await sit(); } catch (e) { return joinMsg("방에 들어가지 못했어요. 방이 닫혔을 수 있어요."); }
  Net.onConn(ok => { if (ok && !out) sit().catch(() => {}); });   // 다시 연결되면 자리 되찾기
  Net.on(P.meta(code), m => { if (!m && !out) { out = true; joinMsg("선생님이 방을 닫았어요."); } });
  Net.on(seatPath, v => {                                            // 선생님이 내보내면 자리가 사라짐
    if (v) had = true;
    else if (had && !out) { out = true; joinMsg(`선생님이 방에서 내보냈어요.<br>다시 참가하려면 <a class="y" href="${ctx.joinURL(code)}">여기</a>를 누르세요.`); }
  });
  Player(code, name, ctx);
}
