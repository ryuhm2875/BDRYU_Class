/* ──────────────────────────────────────────────────────────────
   RYUNO · 칠판 (심판)
   - 이 기기만 규칙 엔진을 돌립니다. 학생 요청은 신호함(inbox)으로 받아
     도착 순서대로 하나씩 처리하므로, 동시에 눌러도 판이 꼬이지 않습니다.
   - 전자칠판: 테이블 여러 개를 한꺼번에 / 모둠 태블릿: 테이블 하나
   ────────────────────────────────────────────────────────────── */
import { Net, P, newCode } from "./net.js";
import { STALE_MS } from "./firebase-config.js";
import * as E from "./engine.js";
import { DECK, COLOR_INFO } from "./cards.js";
import { shuffle } from "./rng.js";
import { esc, cardHTML, backHTML, colorName, evText, toaster, secLeft } from "./ui.js";

const LS = "ryuno-host-v1";
const LEVELS = {
  easy:   { name: "쉬움",   desc: "1~2단계 · 자음과 모음, 조음 방법", lv: [1, 2] },
  normal: { name: "보통",   desc: "1~3단계 · 세기, 단모음, 이중 모음까지", lv: [1, 2, 3] },
  hard:   { name: "어려움", desc: "2~5단계 · 음운 변동까지", lv: [2, 3, 4, 5] }
};
const ls = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

let H = null, code = null, seats = {}, BANK = [], ctx = null;
let $stage, toast, lastEv = {}, flash = {};

/* ================================================================ 시작 */
export async function Board(context) {
  ctx = context;
  const $app = document.getElementById("app");
  $app.innerHTML = `<div class="wrap"><div class="logo">RYUNO</div><p class="muted">방을 여는 중…</p></div>`;

  BANK = await fetch("data/questions.json").then(r => r.json()).then(j => j.questions || []).catch(() => []);

  /* 지난번 방이 아직 내 것이면 이어서, 아니면 새 방 */
  const saved = ls.get(LS, null);
  if (saved && saved.code) {
    const m = await Net.get(P.meta(saved.code)).catch(() => null);
    if (m && m.host === Net.uid) { code = saved.code; H = saved; }
  }
  if (!code) {
    for (let i = 0; i < 8 && !code; i++) {
      const c = newCode();
      const old = await Net.get(P.meta(c)).catch(() => null);
      if (old && (old.at || 0) > Net.now() - STALE_MS) continue;
      try { await Net.set(P.room(c), { meta: { host: Net.uid, at: Net.TS, v: 2 } }); code = c; } catch (e) {}
    }
    if (!code) { $app.innerHTML = `<div class="err"><h1>방을 열지 못했어요</h1><p class="lead">새로 고침해 주세요.</p></div>`; return; }
    H = { code, phase: "lobby", cfg: { size: 4, level: "normal" }, round: 0, tables: {}, recentQ: [] };
  }
  save();

  const beat = () => Net.update(P.meta(code), { at: Net.TS }).catch(() => {});
  beat(); setInterval(beat, 60000);

  document.body.classList.add("board");
  $app.innerHTML = `<div id="fit"><div class="stage" id="stage"></div></div>`;
  $stage = document.getElementById("stage");
  const fit = () => { const s = Math.min(innerWidth / 1280, innerHeight / 720); $stage.style.transform = `scale(${s})`; };
  addEventListener("resize", fit); fit();

  Net.on(P.seats(code), v => { seats = v || {}; render(); });
  listenInbox();
  setInterval(loop, 250);
  publish(); render();
}

/* ================================================================ 저장·공개 */
let pubT = null, saveT = null, lastHands = {};
function save() { clearTimeout(saveT); saveT = setTimeout(() => ls.set(LS, H), 300); }
function publish() {
  clearTimeout(pubT);
  pubT = setTimeout(() => {
    const tables = {};
    for (const [id, T] of Object.entries(H.tables)) tables[id] = E.publicView(T);
    Net.set(P.pub(code), { phase: H.phase, round: H.round, cfg: H.cfg, tables }).catch(() => {});

    /* 손패: 바뀐 사람 것만 다시 씀 */
    const upd = {}, inGame = new Set();
    for (const T of Object.values(H.tables)) for (const p of T.players) {
      inGame.add(p);
      const h = { tid: T.id, round: H.round, cards: T.hands[p], drawn: (E.curPid(T) === p && T.drawn != null && T.phase === "play") ? T.drawn : null };
      const key = JSON.stringify(h);
      if (lastHands[p] !== key) { upd[p] = h; lastHands[p] = key; }
    }
    for (const p of Object.keys(lastHands)) if (!inGame.has(p)) { upd[p] = null; delete lastHands[p]; }
    if (Object.keys(upd).length) Net.update(P.hands(code), upd).catch(() => {});
  }, 30);
  save();
}

/* ================================================================ 학생 요청 처리 */
function listenInbox() {
  const done = new Set();
  Net.on(P.inbox(code), box => {
    if (!box) return;
    const list = [];
    for (const [u, msgs] of Object.entries(box)) for (const [k, m] of Object.entries(msgs || {})) if (!done.has(k)) list.push([k, u, m]);
    list.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
    let changed = false;
    for (const [k, u, m] of list) {
      done.add(k);
      Net.remove(`${P.mail(code, u)}/${k}`).catch(() => {});
      if (handle(u, m)) changed = true;
    }
    if (changed) afterChange();
  });
}
function tableOf(pid) {
  for (const T of Object.values(H.tables)) if (T.players.includes(pid)) return T;
  return null;
}
function handle(u, m) {
  if (H.phase !== "play" || !m || typeof m.t !== "string") return false;
  const T = tableOf(u); if (!T) return false;
  const r = E.act(T, u, m, Net.now(), quizPicker);
  return r.ok;
}

/* +4 방어 문제 고르기: 난이도에 맞는 것 중 최근에 안 나온 것, 보기 순서는 섞음 */
function quizPicker() {
  const lv = LEVELS[H.cfg.level].lv;
  let pool = BANK.filter(q => lv.includes(q.lv));
  if (!pool.length) return null;
  const fresh = pool.filter(q => !H.recentQ.includes(q.id));
  if (fresh.length) pool = fresh; else H.recentQ = [];
  const q = pool[Math.floor(Math.random() * pool.length)];
  H.recentQ.push(q.id); if (H.recentQ.length > 30) H.recentQ.shift();
  const order = shuffle(q.opts.map((_, i) => i));
  return { id: q.id, q: q.q, opts: order.map(i => q.opts[i]), a: order.indexOf(q.a), ex: q.ex || "" };
}

function afterChange() {
  if (H.phase === "play" && Object.values(H.tables).every(T => T.phase === "end")) H.phase = "end";
  publish(); render();
}

/* 0.25초마다: 시간 초과 처리와 남은 시간 표시 */
function loop() {
  if (H.phase === "play") {
    let ch = false;
    for (const T of Object.values(H.tables)) if (T.phase !== "end" && E.tick(T, Net.now())) ch = true;
    if (ch) afterChange();
  }
  const now = Net.now();
  $stage.querySelectorAll("[data-dl]").forEach(el => {
    const dl = +el.dataset.dl, tot = +el.dataset.tot || 20000;
    if (el.classList.contains("bar")) el.firstElementChild.style.width = Math.max(0, Math.min(100, (dl - now) / tot * 100)) + "%";
    else el.textContent = secLeft(dl, now);
  });
}

/* ================================================================ 판 시작 */
const online = () => Object.entries(seats).filter(([, s]) => s && s.on).map(([u]) => u);
function startRound() {
  const ids = shuffle(online());
  if (ids.length < 2) return;
  const k = Math.ceil(ids.length / H.cfg.size);
  const groups = Array.from({ length: k }, () => []);
  ids.forEach((u, j) => groups[j % k].push(u));
  H.tables = {};
  const now = Net.now();
  groups.forEach((g, i) => { const id = String(i + 1); H.tables[id] = E.newTable(id, g, now); });
  H.round++; H.phase = "play"; lastEv = {};
  afterChange();
}
function toLobby() { H.phase = "lobby"; H.tables = {}; afterChange(); }

const nm = p => (seats[p] && seats[p].name) || "?";

/* ================================================================ 그리기 */
function render() {
  if (!$stage) return;
  if (H.phase === "lobby") return renderLobby();
  if (H.phase === "end") return renderEnd();
  const ts = Object.values(H.tables);
  if (ts.length === 1) renderOne(ts[0]); else renderMany(ts);
}

function head(extra = "") {
  return `<div class="bhd"><span class="logo">RYUNO</span><span class="bcode">방 <b>${code}</b></span>${extra}
    <span class="conn"><span class="dot ${Net.ok ? "" : "off"}"></span>${Net.kind === "local" ? "시험 모드" : Net.ok ? "연결됨" : "연결 끊김"}</span></div>`;
}

/* ---------- 대기실 ---------- */
function renderLobby() {
  const ids = Object.keys(seats), on = online();
  const k = on.length >= 2 ? Math.ceil(on.length / H.cfg.size) : 0;
  $stage.className = "stage lobby";
  $stage.innerHTML = `${head()}
    <div class="lb-left">
      <div class="qr big">${typeof qrSVG === "function" ? qrSVG(ctx.joinURL(code)) : ""}</div>
      <div class="muted">방 번호</div><div class="codebig">${code}</div>
      <div class="muted small">${esc(ctx.joinURL(code).replace(/^https?:\/\//, ""))}</div>
    </div>
    <div class="lb-right">
      <h2>들어온 사람 <b class="y">${on.length}</b>명</h2>
      <div class="chips">${ids.length ? ids.map(u => `<span class="chip ${seats[u].on ? "" : "off"}">${esc(seats[u].name)}</span>`).join("") : `<span class="muted">QR을 찍거나 방 번호를 넣어 들어오세요.</span>`}</div>
      <div class="opt"><span>한 테이블 인원</span><div class="seg">${[3, 4, 5, 6].map(n => `<button data-size="${n}" class="${H.cfg.size === n ? "on" : ""}">${n}명</button>`).join("")}</div></div>
      <div class="opt"><span>방어 문제</span><div class="seg">${Object.entries(LEVELS).map(([k2, v]) => `<button data-lv="${k2}" class="${H.cfg.level === k2 ? "on" : ""}">${v.name}</button>`).join("")}</div></div>
      <div class="muted small">${LEVELS[H.cfg.level].desc}</div>
      <div class="go">${k ? `<span class="muted">→ 테이블 ${k}개로 나눠 시작</span>` : `<span class="muted">두 명 이상 들어오면 시작할 수 있어요.</span>`}
        <button class="pill y xl" id="start" ${k ? "" : "disabled"}>게임 시작</button></div>
    </div>
    <div class="bbar"><button class="pill sm" id="close">방 닫기</button></div>`;
  $stage.querySelectorAll("[data-size]").forEach(b => b.onclick = () => { H.cfg.size = +b.dataset.size; afterChange(); });
  $stage.querySelectorAll("[data-lv]").forEach(b => b.onclick = () => { H.cfg.level = b.dataset.lv; afterChange(); });
  document.getElementById("start").onclick = startRound;
  document.getElementById("close").onclick = closeRoom;
}

async function closeRoom() {
  if (!confirm("방을 닫을까요? 들어온 학생들은 모두 나가게 됩니다.")) return;
  await Net.remove(P.room(code)).catch(() => {});
  ls.set(LS, null); location.href = ctx.homeURL();
}

/* ---------- 테이블 하나: 큰 판 ---------- */
function renderOne(T) {
  const V = E.publicView(T);
  if ($stage.className !== "stage one") {
    $stage.className = "stage one";
    $stage.innerHTML = `${head(`<span class="bround">${H.round}판</span><span class="wait" id="wait"></span>`)}
      <div class="dir" id="dir"></div>
      <div class="pile"><div class="deck" id="deck"></div><div class="disc" id="disc"></div></div>
      <div class="cname" id="cname"></div>
      <div class="seats" id="seats"></div>
      <div class="quizbox" id="quiz"></div>
      <div class="toastwrap" id="toast"></div>
      <div class="bbar"><button class="pill sm" id="again">새로 섞어 다시</button><button class="pill sm" id="lobby">대기실로</button></div>`;
    toast = toaster(document.getElementById("toast"));
    document.getElementById("again").onclick = () => confirm("지금 판을 끝내고 새로 섞어 시작할까요?") && startRound();
    document.getElementById("lobby").onclick = () => confirm("대기실로 돌아갈까요?") && toLobby();
  }
  const g = id => document.getElementById(id);
  const waiting = online().filter(u => !T.players.includes(u)).length;
  g("wait").textContent = waiting ? `다음 판 대기 ${waiting}명` : "";
  g("dir").className = "dir " + (V.dir > 0 ? "cw" : "ccw");
  g("dir").innerHTML = V.dir > 0 ? "↻" : "↺";
  g("deck").innerHTML = `${backHTML()}<b>${V.deck}</b>`;
  const disc = g("disc"), topKey = String(V.top) + ":" + T.disc.length;
  if (disc.dataset.k !== topKey) { disc.dataset.k = topKey; disc.innerHTML = cardHTML(V.top, { cls: "land" }); }
  disc.style.setProperty("--glow", COLOR_INFO[V.color].hex);
  g("cname").innerHTML = `<span class="sw" style="background:${COLOR_INFO[V.color].hex}"></span>${colorName(V.color)}`;
  g("seats").innerHTML = V.p.map(p => seatHTML(T, V, p)).join("");
  g("quiz").innerHTML = V.quiz ? `<div class="qhd">${esc(nm(V.quiz.target))} 방어 문제 <b data-dl="${V.quiz.dl}">${secLeft(V.quiz.dl, Net.now())}</b></div>
      <div class="qq">${esc(V.quiz.q)}</div><ol>${V.quiz.opts.map(o => `<li>${esc(o)}</li>`).join("")}</ol>` : "";
  g("quiz").classList.toggle("on", !!V.quiz);
  newEvents(T, e => toast(evText(e, nm)));
}
function seatHTML(T, V, p) {
  const s = seats[p] || {}, me = V.turn === p, n = V.n[p];
  const tags = [];
  if (V.uno && V.uno.pid === p) tags.push(V.uno.safe ? `<i class="tag uno">류노!</i>` : `<i class="tag warn">1장!</i>`);
  if (V.quiz && V.quiz.target === p) tags.push(`<i class="tag q">방어 중</i>`);
  if (V.winner === p) tags.push(`<i class="tag win">승리</i>`);
  if (!s.on) tags.push(`<i class="tag off">나감</i>`);
  const fan = Array.from({ length: Math.min(n, 12) }, () => `<i></i>`).join("");
  const bar = me && V.phase === "play" ? `<div class="bar" data-dl="${V.dl}" data-tot="${V.drawn ? E.RULES.afterDrawMs : E.RULES.turnMs}"><i></i></div>` : "";
  return `<div class="seat ${me ? "now" : ""} ${s.on ? "" : "gone"}"><div class="sn">${esc(nm(p))}</div>
    <div class="sc"><span class="fan">${fan}</span><b>${n}</b>장</div><div class="tags">${tags.join("")}</div>${bar}</div>`;
}
function newEvents(T, fn) {
  const seen = lastEv[T.id] || 0;
  for (const e of T.ev) if (e.n > seen) fn(e);
  lastEv[T.id] = T.evn;
}

/* ---------- 테이블 여러 개: 격자 ---------- */
function renderMany(ts) {
  $stage.className = "stage many";
  const waiting = online().filter(u => !tableOf(u)).length;
  $stage.innerHTML = `${head(`<span class="bround">${H.round}판 · 테이블 ${ts.length}개</span>${waiting ? `<span class="wait">다음 판 대기 ${waiting}명</span>` : ""}`)}
    <div class="grid g${ts.length <= 4 ? 2 : 3}">${ts.map(panelHTML).join("")}</div>
    <div class="bbar"><button class="pill sm" id="again">새로 섞어 다시</button><button class="pill sm" id="lobby">대기실로</button></div>`;
  document.getElementById("again").onclick = () => confirm("모든 테이블을 끝내고 새로 섞어 시작할까요?") && startRound();
  document.getElementById("lobby").onclick = () => confirm("대기실로 돌아갈까요?") && toLobby();
}
function panelHTML(T) {
  const V = E.publicView(T);
  let line = "";
  newEvents(T, e => { const t = evText(e, nm); if (t) { line = t.big ? `${t.big} ${t.small || ""}` : t.small; flash[T.id] = Date.now(); } });
  if (line) flash[T.id + "l"] = line;
  const fl = Date.now() - (flash[T.id] || 0) < 1200 ? "flash" : "";
  return `<div class="panel ${V.phase === "end" ? "done" : ""} ${fl}">
    <div class="ph"><b>${T.id}번 테이블</b>${V.phase === "play" ? `<span class="dirs">${V.dir > 0 ? "↻" : "↺"}</span>` : ""}
      ${V.turn && V.phase === "play" ? `<div class="bar" data-dl="${V.dl}" data-tot="${V.drawn ? E.RULES.afterDrawMs : E.RULES.turnMs}"><i></i></div>` : ""}</div>
    <div class="pb"><div class="pcol"><div class="ptc" style="--glow:${COLOR_INFO[V.color].hex}">${cardHTML(V.top)}</div>
      <div class="pcn"><span class="sw" style="background:${COLOR_INFO[V.color].hex}"></span>${COLOR_INFO[V.color].manner}</div></div>
      <ul>${V.p.map(p => {
        const tag = V.winner === p ? "🏆" : V.uno && V.uno.pid === p ? (V.uno.safe ? "류노!" : "1장!") : V.quiz && V.quiz.target === p ? "방어 중" : "";
        return `<li class="${V.turn === p ? "now" : ""} ${seats[p] && seats[p].on ? "" : "gone"}"><span>${esc(nm(p))}</span><i>${tag}</i><b>${V.n[p]}</b></li>`;
      }).join("")}</ul></div>
    <div class="pline">${esc(V.phase === "end" ? `${nm(V.winner)} 승리!` : flash[T.id + "l"] || colorName(V.color))}</div></div>`;
}

/* ---------- 결과 ---------- */
function renderEnd() {
  $stage.className = "stage end";
  const ts = Object.values(H.tables);
  $stage.innerHTML = `${head(`<span class="bround">${H.round}판 결과</span>`)}
    <h1 class="etitle">${ts.length === 1 ? `🏆 ${esc(nm(ts[0].winner))} 승리!` : "테이블별 우승"}</h1>
    <div class="results g${Math.min(ts.length, 3)}">${ts.map(T => `<div class="res-t">
      ${ts.length > 1 ? `<div class="rt">${T.id}번 테이블</div>` : ""}
      <ol>${E.ranking(T).map((p, i) => `<li class="${i === 0 ? "w" : ""}"><span>${i === 0 ? "🏆" : i + 1}</span>${esc(nm(p))}<b>${T.hands[p].length}장</b></li>`).join("")}</ol></div>`).join("")}</div>
    <div class="ego"><button class="pill y xl" id="next">다음 판</button><button class="pill" id="lobby">대기실로</button></div>`;
  document.getElementById("next").onclick = startRound;
  document.getElementById("lobby").onclick = toLobby;
}
