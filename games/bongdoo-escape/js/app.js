/* ──────────────────────────────────────────────────────────────
   마지막 배는 6시 · 시작과 길 나누기 (류노와 같은 주소 규칙)
   주소 그대로     → 처음 화면
   ?board=1        → 칠판
   ?join=방번호    → 학생 참가
   ?local=1        → 인터넷 없이 한 브라우저 탭끼리 시험
   ?tab=1          → 탭마다 다른 사람
   ────────────────────────────────────────────────────────────── */
import { Net, P, CODE_RE } from "./net.js?v=202611181648";
import { esc } from "./puzzles.js?v=202611181648";

const QS = new URLSearchParams(location.search);
const $app = document.getElementById("app");
const keepParams = () => ["local", "tab"].filter(k => QS.has(k)).map(k => `&${k}=1`).join("");
const ctx = {
  joinURL: code => `${location.origin}${location.pathname}?join=${code}${keepParams()}`,
  homeURL: () => `${location.pathname}${QS.has("local") ? "?local=1" : QS.has("tab") ? "?tab=1" : ""}`
};

boot();
async function boot() {
  try { await Net.init(); } catch (e) {
    $app.innerHTML = `<div class="wrap center"><div class="logo">마지막 배는 6시</div><h1>인터넷에 연결하지 못했어요</h1>
      <p class="lead">와이파이를 확인하고 새로 고침해 주세요.</p><button class="pill y" onclick="location.reload()">새로 고침</button></div>`;
    return;
  }
  const code = (QS.get("join") || "").toUpperCase();
  if (code) return Join(code);
  if (QS.has("board")) return import("./board.js?v=202611181648").then(m => m.Board(ctx));   // 정답 파일은 칠판에서만 불러옴
  Home();
}

function Home() {
  $app.innerHTML = `<div class="wrap home">
    <div class="hero"><div class="sunset"></div>
      <p class="kicker">공포 방탈출 · 중학교 2학년 국어</p>
      <div class="logo big">마지막 배는 6시</div>
      <p class="lead">폐교에 갇힌 30분. 흩어진 기록을 모아<br>두 사람의 누명을 벗기세요.</p></div>
    <div class="grid2">
      <div class="box"><h2>칠판</h2><p class="muted">방 번호와 QR을 띄우고, 모둠마다 폐교 단면도를 보여 줍니다. 이 기기가 심판을 맡아요.</p>
        <button class="pill y big" id="mk">방 만들기</button></div>
      <div class="box"><h2>참가 (학생)</h2>
        <input class="inp code" id="jc" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="방 번호 6자리">
        <button class="pill y big" id="jb">들어가기</button><div id="jm"></div></div>
    </div></div>`;
  document.getElementById("mk").onclick = () => { location.href = `${location.pathname}?board=1${keepParams()}`; };
  const go = () => {
    const c = document.getElementById("jc").value.trim().toUpperCase();
    if (!CODE_RE.test(c)) { document.getElementById("jm").innerHTML = `<div class="res bad">방 번호 6자리를 확인해 주세요.</div>`; return; }
    location.href = ctx.joinURL(c);
  };
  document.getElementById("jb").onclick = go;
  document.getElementById("jc").onkeydown = e => { if (e.key === "Enter") go(); };
}

async function Join(code) {
  if (!CODE_RE.test(code)) return msg("방 번호가 올바르지 않아요.");
  const meta = await Net.get(P.meta(code)).catch(() => null);
  if (!meta) return msg(`<b>${esc(code)}</b> 방을 찾을 수 없어요. 칠판의 방 번호를 다시 확인해 주세요.`);
  const mine = await Net.get(P.seat(code, Net.uid)).catch(() => null);
  if (mine && mine.name) return enter(code, mine.name);
  let last = ""; try { last = localStorage.getItem("escape-name") || ""; } catch (e) {}
  $app.innerHTML = `<div class="wrap center"><div class="logo">마지막 배는 6시</div>
    <h1>이름을 적어 주세요</h1><p class="lead">칠판에 보이는 이름이에요. (12자까지)</p>
    <input class="inp" id="nm" maxlength="12" placeholder="예) 2반 류봉두" value="${esc(last)}">
    <button class="pill y big" id="go">들어가기</button><div id="m"></div></div>`;
  const go = () => {
    const n = document.getElementById("nm").value.trim().slice(0, 12);
    if (!n) { document.getElementById("m").innerHTML = `<div class="res bad">이름을 적어 주세요.</div>`; return; }
    try { localStorage.setItem("escape-name", n); } catch (e) {}
    enter(code, n);
  };
  document.getElementById("go").onclick = go;
  document.getElementById("nm").onkeydown = e => { if (e.key === "Enter") go(); };
}

function msg(html) {
  document.body.classList.remove("player");
  $app.innerHTML = `<div class="wrap center"><div class="logo">마지막 배는 6시</div><h1>앗,</h1><p class="lead">${html}</p>
    <a class="pill y" href="${ctx.homeURL()}">처음으로</a></div>`;
}

async function enter(code, name) {
  const seatPath = P.seat(code, Net.uid);
  const sit = async () => { await Net.update(seatPath, { name, on: true, at: Net.TS }); await Net.onDisconnectSet(`${seatPath}/on`, false); };
  let out = false, had = false;
  try { await sit(); } catch (e) { return msg("방에 들어가지 못했어요. 방이 닫혔을 수 있어요."); }
  Net.onConn(ok => { if (ok && !out) sit().catch(() => {}); });
  Net.on(P.meta(code), m => { if (!m && !out) { out = true; msg("선생님이 방을 닫았어요."); } });
  Net.on(seatPath, v => { if (v) had = true; else if (had && !out) { out = true; msg("선생님이 방에서 내보냈어요."); } });
  const { Player } = await import("./player.js?v=202611181648");
  Player(code, name, ctx);
}
