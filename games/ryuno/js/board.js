/* ──────────────────────────────────────────────────────────────
   RYUNO · 칠판 (심판)
   - 이 기기만 규칙 엔진을 돌립니다. 학생 요청은 신호함(inbox)으로 받아
     도착 순서대로 하나씩 처리하므로, 동시에 눌러도 판이 꼬이지 않습니다.
   - 전자칠판: 테이블 여러 개를 한꺼번에 / 모둠 태블릿: 테이블 하나
   - [선생님] 판: 멈춤 · 깜짝 문제 · 난이도 · 학생 관리 · 별 순위 · 소리
   ────────────────────────────────────────────────────────────── */
import { Net, P, newCode } from "./net.js?v=202611172054";
import { STALE_MS } from "./firebase-config.js?v=202611172054";
import * as E from "./engine.js?v=202611172054";
import { COLOR_INFO } from "./cards.js?v=202611172054";
import { shuffle } from "./rng.js?v=202611172054";
import { esc, cardHTML, backHTML, colorName, evText, toaster, secLeft, chartHTML, DEAL, dealLeave, dealCount, confettiHTML, fsOK, fsOn, fsToggle } from "./ui.js?v=202611172054";
import { initBank, pickQuestion, openManager, LV_NAME } from "./qbank.js?v=202611172054";
import { Sound, fxOf } from "./sound.js?v=202611172054";

const LS = "ryuno-host-v1";
const LEVELS = {
  easy:   { name: "쉬움",   desc: "1~2단계 · 자음과 모음, 조음 위치와 방법", lv: [1, 2] },
  normal: { name: "보통",   desc: "1~3단계 · 소리의 세기, 단모음, 이중 모음까지", lv: [1, 2, 3] },
  hard:   { name: "어려움", desc: "3~5단계 · 음운 변동까지", lv: [3, 4, 5] }
};
const POP_MS = 15000, POP_SHOW_MS = 7000, STAR = { win: 3, defend: 1, pop: 1 };
const ls = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

let H = null, code = null, seats = {}, ctx = null;
let $stage, $tp = null, toast, lastEv = {}, flash = {}, alertK = {}, won = {}, tpOpen = false, popLevel = 2;
const TOUR_MS = 10000;

/* ================================================================ 시작 */
export async function Board(context) {
  ctx = context;
  const $app = document.getElementById("app");
  $app.innerHTML = `<div class="wrap"><div class="logo">RYUNO</div><p class="muted">방을 여는 중…</p></div>`;
  await initBank();

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
  H = Object.assign({ stars: {}, history: [], awarded: {}, paused: null, pop: null, recentQ: [], view: "grid", tour: false }, H);
  if (H.phase === "end") H.phase = "play";              // 예전 저장: 판 전체가 끝난 상태 → 테이블별로
  save();

  const beat = () => Net.update(P.meta(code), { at: Net.TS }).catch(() => {});
  beat(); setInterval(beat, 60000);

  document.body.classList.add("board");
  $app.innerHTML = `<div id="fit"><div class="stage" id="stage"></div></div>`;
  $stage = document.getElementById("stage");
  const fit = () => { const s = Math.min(innerWidth / 1280, innerHeight / 720); $stage.style.transform = `scale(${s})`; };
  addEventListener("resize", fit); fit();
  Sound.unlockOnTouch(true);
  addEventListener("keydown", e => { if (e.key === " " && H.phase === "play" && e.target === document.body) { e.preventDefault(); togglePause(); } });

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
    for (const [id, T] of Object.entries(H.tables)) tables[id] = Object.assign(E.publicView(T), {
      rk: rkOf(T), paused: !!(H.paused || T.paused),
      deal: T.dealAt && Net.now() < T.dealAt + DEAL.ms ? { at: T.dealAt, ms: DEAL.ms } : null });
    const pop = H.pop ? { id: H.pop.id, q: H.pop.q, opts: H.pop.opts, dl: H.pop.dl, cnt: Object.keys(H.pop.ans).length, done: H.pop.done,
      a: H.pop.done ? H.pop.a : null, ex: H.pop.done ? H.pop.ex : null, right: H.pop.done ? H.pop.right : null } : null;
    Net.set(P.pub(code), { phase: H.phase, round: H.round, cfg: H.cfg, tables, paused: !!H.paused, pop, stars: H.stars }).catch(() => {});

    const upd = {}, inGame = new Set();
    for (const T of Object.values(H.tables)) for (const p of T.players) {
      inGame.add(p);
      const h = { tid: T.id, rk: rkOf(T), cards: T.hands[p], drawn: (E.curPid(T) === p && T.drawn != null && T.phase === "play") ? T.drawn : null };
      const key = JSON.stringify(h);
      if (lastHands[p] !== key) { upd[p] = h; lastHands[p] = key; }
    }
    for (const p of Object.keys(lastHands)) if (!inGame.has(p)) { upd[p] = null; delete lastHands[p]; }
    if (Object.keys(upd).length) Net.update(P.hands(code), upd).catch(() => {});
  }, 30);
  save();
}
/* 테이블의 판 이름표 (학생 기기가 새 판인지 알아보는 값) */
const rkOf = T => `${T.id}.${T.rnd || 1}`;
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
const tableOf = pid => Object.values(H.tables).find(T => T.players.includes(pid)) || null;
function handle(u, m) {
  if (!m || typeof m.t !== "string") return false;
  if (m.t === "pop") {
    const p = H.pop;
    if (!p || p.done || Net.now() > p.dl + 500 || p.ans[u] != null || !seats[u]) return false;
    p.ans[u] = +m.choice; return true;
  }
  if (H.phase !== "play" || H.paused) return false;
  const T = tableOf(u); if (!T || T.paused || dealing(T)) return false;   // 그 테이블이 멈췄거나 카드를 나눠 주는 중
  return E.act(T, u, m, Net.now(), () => pickQuestion(LEVELS[H.cfg.level].lv, H.recentQ)).ok;
}

function afterChange() {
  for (const T of Object.values(H.tables)) {
    /* 별 주기: 승리 3개, 방어 성공 1개 */
    const key = rkOf(T), seen = H.awarded[key] || 0;
    for (const e of T.ev) if (e.n > seen) {
      if (e.t === "win" && !e.left && e.pid) star(e.pid, STAR.win);
      if (e.t === "quizres" && e.ok) star(e.pid, STAR.defend);
    }
    H.awarded[key] = T.evn;
    /* 테이블이 끝나면: 기록 남기고 우승 장면 (선생님이 [결과 보기]·[다음 판]을 누를 때까지) */
    if (T.phase === "end" && !T.logged) {
      T.logged = true; T.celebrate = true;
      H.history.push({ id: T.id, rnd: T.rnd || 1, multi: Object.keys(H.tables).length > 1, winner: T.winner, ranks: E.ranking(T).map(p => [p, T.hands[p].length]) });
      if (H.history.length > 40) H.history.shift();
    }
  }
  const V = viewTable();
  Sound.setScene(H.phase === "lobby" ? "lobby" : V && V.phase === "end" ? "win" : "play");
  publish(); render();
}
/* 지금 크게 보고 있는 테이블 (테이블이 하나면 늘 그 테이블) */
function viewTable() {
  const ts = Object.values(H.tables);
  if (H.phase !== "play" || !ts.length) return null;
  if (ts.length === 1) return ts[0];
  return H.view !== "grid" && H.tables[H.view] ? H.tables[H.view] : null;
}
const star = (pid, n) => { H.stars[pid] = (H.stars[pid] || 0) + n; };

/* 0.25초마다: 시간 초과 · 깜짝 문제 마감 · 남은 시간 표시 */
let lastTickSec = 0;
function loop() {
  const now = Net.now();
  if (H.pop && !H.pop.done) {
    const on = Object.entries(seats).filter(([, s]) => s && s.on).map(([u]) => u);
    if (now > H.pop.dl || (on.length && on.every(u => H.pop.ans[u] != null))) finishPop();
  } else if (H.pop && H.pop.done && now > H.pop.shownUntil) {
    const resume = H.pop.autoPaused; H.pop = null;
    if (resume && H.paused) togglePause(); else afterChange();
  }
  if (H.phase === "play" && !H.paused) {
    let ch = false;
    for (const T of Object.values(H.tables)) {
      if (T.paused) continue;
      if (T.dealAt) {                                      // 카드 나눠 주는 중
        if (now < T.dealAt + DEAL.ms) { dealTick(T, now); continue; }
        T.dealAt = 0; ch = true;                          // 끝 → 첫 바닥 카드 뒤집기
      }
      if (T.phase !== "end" && E.tick(T, now, () => pickQuestion(LEVELS[H.cfg.level].lv, H.recentQ))) ch = true;
    }
    if (ch) afterChange();
    /* 자동 순회: 10초마다 다음 테이블을 크게 */
    if (H.tour && Object.keys(H.tables).length > 1 && now - (H.tourAt || 0) > TOUR_MS) tourNext(now);
    /* 크게 보는 테이블의 마지막 5초 똑딱 */
    const V = viewTable();
    if (V && V.phase !== "end" && !V.paused) {
      const dl = V.phase === "quiz" ? V.quiz.deadline : V.deadline, s = secLeft(dl, now);
      if (s <= 5 && s > 0 && s !== lastTickSec) Sound.fx("tick");
      lastTickSec = s;
    }
  }
  $stage.querySelectorAll("[data-dl]").forEach(el => {
    const dl = +el.dataset.dl, tot = +el.dataset.tot || 20000;
    const tEl = el.closest("[data-tid]"), T = tEl && H.tables[tEl.dataset.tid];
    const stop = el.closest(".ov") ? null : H.paused || (T && T.paused);
    const left = stop ? dl - stop : dl - now;
    if (el.classList.contains("bar")) {
      const pct = Math.max(0, Math.min(100, left / tot * 100));
      el.firstElementChild.style.width = pct + "%";
      el.classList.toggle("low", pct < 30);                         // 30% 아래면 빨간 막대
    }
    else el.textContent = Math.max(0, Math.ceil(left / 1000));
  });
  const tb = document.getElementById("tourbar");
  if (tb) tb.style.width = Math.min(100, (now - (H.tourAt || 0)) / TOUR_MS * 100) + "%";
}
function tourNext(now) {
  const ids = Object.keys(H.tables);
  const live = ids.filter(id => H.tables[id].phase !== "end");
  const pool = live.length ? live : ids;
  const at = pool.indexOf(H.view);
  H.view = pool[(at + 1) % pool.length]; H.tourAt = now;
  afterChange();
}
/* ================================================================ 선생님이 하는 일 */
const online = () => Object.entries(seats).filter(([, s]) => s && s.on).map(([u]) => u);
function startRound() {
  const ids = shuffle(online());
  if (ids.length < 2) return alert("두 명 이상 들어와야 시작할 수 있어요.");
  const k = E.tableCount(ids.length, H.cfg.size);
  const groups = Array.from({ length: k }, () => []);
  ids.forEach((u, j) => groups[j % k].push(u));
  H.tables = {}; H.paused = null; won = {}; lastEv = {}; alertK = {};
  const now = Net.now();
  groups.forEach((g, i) => { const id = String(i + 1); H.tables[id] = dealTable(E.newTable(id, g, now), 1, now); });
  H.round++; H.phase = "play"; H.view = "grid"; H.tour = false;
  Sound.start();
  dealSounds(Math.max(...groups.map(g => g.length)));
  afterChange();
}
/* 카드 나눠 주기: 그동안 첫 차례 시간이 줄지 않게 마감을 미룸 */
function dealTable(T, rnd, now) {
  T.rnd = rnd; T.dealAt = now; T.paused = null; T.logged = false; T.celebrate = false;
  E.shiftTime(T, DEAL.ms);
  return T;
}
function dealSounds(N) {
  for (let r = 0; r < DEAL.hand; r++) setTimeout(() => Sound.fx("draw"), dealLeave(r * N, N) + DEAL.fly);
  setTimeout(() => Sound.fx("card"), DEAL.ms - 420);
}
/* 끝난 테이블 하나만 다음 판: 남아 있는 학생 + 기다리던 학생(6명까지) */
function restartTable(id) {
  const old = H.tables[id]; if (!old) return;
  const keep = old.players.filter(u => seats[u] && seats[u].on);
  const wait = online().filter(u => !tableOf(u) || tableOf(u) === old).filter(u => !keep.includes(u));
  while (keep.length < E.RULES.maxPlayers && wait.length) keep.push(wait.shift());
  if (keep.length < 2) return alert("이 테이블에 남은 학생이 한 명뿐이에요. 다른 테이블로 옮기거나 [테이블 새로 나누기]를 해 주세요.");
  const now = Net.now();
  H.tables[id] = dealTable(E.newTable(id, shuffle(keep), now), (old.rnd || 1) + 1, now);
  lastEv[id] = 0; won[id] = 0; delete alertK[id];
  if (viewTable() === H.tables[id] || Object.keys(H.tables).length === 1) dealSounds(keep.length);
  afterChange();
}
/* 학생 자리 옮기기: 판이 진행 중인 테이블이면 바로 7장 받고 들어감, 끝난 테이블이면 다음 판부터 */
function moveTo(pid, to) {
  const from = tableOf(pid), now = Net.now();
  if (from && from.id === to) return;
  const dst = H.tables[to];
  if (dst && dst.phase !== "end" && dst.players.length >= E.RULES.maxPlayers) return alert("그 테이블은 6명이 꽉 찼어요.");
  if (from) {
    if (from.phase !== "end") E.removePlayer(from, pid, now);
    else { from.players = from.players.filter(u => u !== pid); delete from.hands[pid]; }
  }
  if (dst && dst.phase !== "end") E.addPlayer(dst, pid, now);
  afterChange();
}
const dealing = T => !!(T && T.dealAt && Net.now() < T.dealAt + DEAL.ms);
/* 나눠 주는 동안 0.25초마다: 크게 보는 테이블은 장수만 고쳐 씀, 격자는 다시 그림 */
function dealTick(T, now) {
  const V = viewTable();
  if (V !== T) { if (!V) renderSoon(); return; }
  const N = T.players.length, el = document.getElementById("seats");
  if (!el) return;
  [...el.children].forEach((seat, s) => {
    const c = dealCount(s, N, now - T.dealAt), b = seat.querySelector(".sc b");
    if (b && b.textContent !== String(c)) {
      b.textContent = c;
      seat.querySelector(".fan").innerHTML = "<i></i>".repeat(c);
      seat.classList.remove("got"); void seat.offsetWidth; seat.classList.add("got");
    }
  });
}
let rsT = null;
const renderSoon = () => { if (!rsT) rsT = setTimeout(() => { rsT = null; render(); }, 0); };
/* 방 정리: 나간 학생·별·판 기록을 지우고 대기실로. 지금 들어와 있는 학생은 그대로 */
function tidyRoom() {
  const gone = Object.entries(seats).filter(([, s]) => !s || !s.on).map(([u]) => u);
  if (!confirm(`방을 정리할까요?\n\n· 나간 학생 ${gone.length}명의 이름, 별, 판 기록을 지워요\n· 지금 들어와 있는 학생은 그대로 남아요`)) return;
  gone.forEach(u => { Net.remove(P.seat(code, u)).catch(() => {}); delete seats[u]; });
  H.stars = {}; H.history = []; H.awarded = {}; H.round = 0; H.pop = null;
  toLobby();
}
function toLobby() { H.phase = "lobby"; H.tables = {}; H.paused = null; H.tour = false; H.view = "grid"; afterChange(); }
function togglePause(id) {
  if (H.phase !== "play") return;
  const now = Net.now();
  if (id && H.tables[id]) {                               // 테이블 하나만
    const T = H.tables[id];
    if (T.paused) { E.shiftTime(T, now - T.paused); if (T.dealAt) T.dealAt += now - T.paused; T.paused = null; }
    else T.paused = now;
    return afterChange();
  }
  if (H.paused) {
    const ms = now - H.paused;
    Object.values(H.tables).forEach(T => { if (!T.paused) { E.shiftTime(T, ms); if (T.dealAt) T.dealAt += ms; } });
    H.paused = null;
  } else H.paused = now;
  afterChange();
}
function startPop(lv) {
  const q = pickQuestion([lv], H.recentQ);
  if (!q) return alert("켜진 문제가 없어요. [문제 관리]에서 문제를 켜 주세요.");
  const auto = H.phase === "play" && !H.paused;
  if (auto) togglePause();
  H.pop = Object.assign(q, { dl: Net.now() + POP_MS, ans: {}, done: false, autoPaused: auto });
  closePanel();
  Sound.fx("pop");
  afterChange();
}
function finishPop() {
  const p = H.pop; p.done = true;
  p.right = Object.entries(p.ans).filter(([, c]) => c === p.a).map(([u]) => u);
  p.right.forEach(u => star(u, STAR.pop));
  p.shownUntil = Net.now() + POP_SHOW_MS;
  Sound.fx("good");
  afterChange();
}
function kick(pid) {
  const s = seats[pid]; if (!s) return;
  if (!confirm(`${s.name} 학생을 내보낼까요? (다시 들어오면 새로 참가합니다)`)) return;
  const T = tableOf(pid);
  if (T && T.phase !== "end") E.removePlayer(T, pid, Net.now());
  else if (T) { T.players = T.players.filter(u => u !== pid); delete T.hands[pid]; }
  Net.remove(P.seat(code, pid)).catch(() => {});
  delete seats[pid];
  afterChange();
}
function rename(pid) {
  const s = seats[pid]; if (!s) return;
  const n = (prompt("새 이름 (12자까지)", s.name) || "").trim().slice(0, 12);
  if (n) Net.update(P.seat(code, pid), { name: n }).catch(() => {});
}
function gift(pid) {
  const T = tableOf(pid); if (!T || T.phase === "end") return;
  E.forceGive(T, pid, 1); afterChange();
}
async function closeRoom() {
  if (!confirm("방을 닫을까요? 들어온 학생들은 모두 나가게 됩니다.")) return;
  await Net.remove(P.room(code)).catch(() => {});
  ls.set(LS, null); location.href = ctx.homeURL();
}

const nm = p => (seats[p] && seats[p].name) || "?";

/* ================================================================ 그리기 */
function render() {
  if (!$stage) return;
  if (H.phase === "lobby") renderLobby();
  else {
    const ts = Object.values(H.tables), V = viewTable();
    if (!ts.length) renderLobby();
    else if (!V) renderMany(ts);
    else if (V.phase === "end") V.celebrate ? renderWin(V) : renderEnd(V);
    else renderOne(V);
  }
  renderOverlay();
  if (tpOpen) renderPanel();
}
function head(extra = "") {
  return `<div class="bhd"><span class="logo">RYUNO</span><span class="bcode">방 <b>${code}</b></span>${extra}
    <span class="conn"><span class="dot ${Net.ok ? "" : "off"}"></span>${Net.kind === "local" ? "시험 모드" : Net.ok ? "연결됨" : "연결 끊김"}</span></div>`;
}
function bbar(extra = "") {
  return `<div class="bbar">${extra}${fsOK() ? `<button class="pill sm" data-b="fs" title="전체 화면">⛶</button>` : ""}<button class="pill sm" data-b="sound">${Sound.bgmOn ? "🔊" : "🔈"}</button><button class="pill sm tbtn" data-b="panel">⚙ 선생님</button></div>`;
}
/* 여러 테이블일 때 크게 보는 화면 위쪽: 전체 보기 · 순회 · 이 테이블 멈춤 */
function zoomBar(T) {
  const multi = Object.keys(H.tables).length > 1;
  if (!multi) return bbar(T.phase !== "end" ? `<button class="pill sm" data-b="pause" id="pz">${H.paused ? "▶ 다시 시작" : "⏸ 멈춤"}</button>` : "");
  return bbar(`<button class="pill sm back" data-b="grid">◀ 전체 보기</button>
    <button class="pill sm ${H.tour ? "on" : ""}" data-b="tour">${H.tour ? "⏹ 순회 멈춤" : "⏵ 자동 순회"}</button>
    ${T.phase !== "end" ? `<button class="pill sm" data-b="tpause" id="pz">${T.paused ? "▶ 이 테이블 다시" : "⏸ 이 테이블 멈춤"}</button>` : ""}`);
}
function wire() {
  $stage.querySelectorAll("[data-b]").forEach(b => b.onclick = () => {
    const k = b.dataset.b;
    if (k === "panel") { tpOpen = !tpOpen; return tpOpen ? renderPanel() : closePanel(); }
    if (k === "sound") { Sound.toggleBgm(); return render(); }
    if (k === "pause") return togglePause();
    if (k === "start") { if (fsOK() && !fsOn()) fsToggle(true); return startRound(); }
    if (k === "next") { const V = viewTable(); if (fsOK() && !fsOn()) fsToggle(true); return V ? restartTable(V.id) : startRound(); }
    if (k === "grid") { H.view = "grid"; H.tour = false; return afterChange(); }
    if (k === "tour") { H.tour = !H.tour; if (H.tour) tourNext(Net.now()); else { H.view = "grid"; afterChange(); } return; }
    if (k === "tpause") { const V = viewTable(); return V && togglePause(V.id); }
    if (k === "fs") return fsToggle();
    if (k === "tidy") return tidyRoom();
    if (k === "results") { const V = viewTable(); if (V) V.celebrate = false; save(); return afterChange(); }
    if (k === "lobby") return toLobby();
    if (k === "qm") return openManager(document.body, () => {});
  });
}

/* ---------- 대기실 ---------- */
function renderLobby() {
  const ids = Object.keys(seats), on = online();
  const k = E.tableCount(on.length, H.cfg.size);
  const split = k ? Array.from({ length: k }, (_, i) => Math.floor(on.length / k) + (i < on.length % k ? 1 : 0)).join("·") : "";
  $stage.className = "stage lobby";
  $stage.innerHTML = `${head()}
    <div class="lb-left">
      <div class="qr big">${typeof qrSVG === "function" ? qrSVG(ctx.joinURL(code)) : ""}</div>
      <div class="muted">방 번호</div><div class="codebig">${code}</div>
      <div class="muted small">${esc(ctx.joinURL(code).replace(/^https?:\/\//, ""))}</div>
    </div>
    <div class="lb-right">
      <h2>들어온 사람 <b class="y">${on.length}</b>명${ids.length > on.length || H.round || Object.keys(H.stars).length ? ` <button class="pill sm tidy" data-b="tidy">🧹 방 정리</button>` : ""}</h2>
      <div class="chips">${ids.length ? ids.map(u => `<span class="chip ${seats[u].on ? "" : "off"}">${esc(seats[u].name)}${H.stars[u] ? ` <i>⭐${H.stars[u]}</i>` : ""}</span>`).join("") : `<span class="muted">QR을 찍거나 방 번호를 넣어 들어오세요.</span>`}</div>
      <div class="opt"><span>한 테이블 인원</span><div class="seg">${[3, 4, 5, 6].map(n => `<button data-size="${n}" class="${H.cfg.size === n ? "on" : ""}">${n}명</button>`).join("")}</div></div>
      <div class="opt"><span>방어 문제</span><div class="seg">${Object.entries(LEVELS).map(([k2, v]) => `<button data-lv="${k2}" class="${H.cfg.level === k2 ? "on" : ""}">${v.name}</button>`).join("")}</div>
        <button class="pill sm" data-b="qm">문제 관리</button></div>
      <div class="muted small">${LEVELS[H.cfg.level].desc}</div>
      <div class="lb-chart">${chartHTML()}</div>
      <div class="go">${k ? `<span class="muted">→ 테이블 ${k}개 (${split}명)</span>` : `<span class="muted">두 명 이상 들어오면 시작할 수 있어요.</span>`}
        <button class="pill y xl" data-b="start" ${k ? "" : "disabled"}>게임 시작</button></div>
    </div>${bbar()}`;
  $stage.querySelectorAll("[data-size]").forEach(b => b.onclick = () => { H.cfg.size = +b.dataset.size; afterChange(); });
  $stage.querySelectorAll("[data-lv]").forEach(b => b.onclick = () => { H.cfg.level = b.dataset.lv; afterChange(); });
  wire();
}

/* ---------- 테이블 하나: 큰 판 ---------- */
function renderOne(T) {
  const V = E.publicView(T), multi = Object.keys(H.tables).length > 1, key = rkOf(T) + (H.tour ? "t" : "");
  if (!$stage.classList.contains("one") || !document.getElementById("disc") || $stage.dataset.k !== key) {
    $stage.className = "stage one"; $stage.dataset.k = key; $stage.dataset.tid = T.id;
    $stage.innerHTML = `${head(`<span class="bround">${multi ? `<b class="tno">${T.id}번 테이블</b> · ` : ""}${T.rnd || 1}판</span><span class="wait" id="wait"></span>`)}
      ${H.tour ? `<div class="tour"><i id="tourbar"></i></div>` : ""}
      <div class="dir" id="dir"></div>
      <div class="pile"><div class="deck" id="deck"></div><div class="disc" id="disc"></div></div>
      <div class="cname" id="cname"></div>
      <div class="seats" id="seats"></div>
      <div class="quizbox" id="quiz"></div>
      <div class="dealfx" id="dealfx"></div>
      <div class="toastwrap" id="toast"></div>${zoomBar(T)}`;
    toast = toaster(document.getElementById("toast"));
    lastEv[T.id] = T.evn;                                  // 다른 화면에서 넘어왔으면 지난 알림은 건너뜀
    wire();
  }
  const g = id => document.getElementById(id);
  const waiting = online().filter(u => !tableOf(u)).length;
  if (g("pz")) g("pz").textContent = multi ? (T.paused ? "▶ 이 테이블 다시" : "⏸ 이 테이블 멈춤") : H.paused ? "▶ 다시 시작" : "⏸ 멈춤";
  g("wait").textContent = waiting ? `대기 ${waiting}명` : "";
  g("dir").className = "dir " + (V.dir > 0 ? "cw" : "ccw");
  g("dir").innerHTML = V.dir > 0 ? "↻" : "↺";
  g("deck").innerHTML = `${backHTML()}<b>${V.deck}</b>`;
  const now = Net.now(), dl = dealing(T), N = V.p.length;
  g("seats").innerHTML = V.p.map((p, s) => seatHTML(T, V, p, dl ? dealCount(s, N, now - T.dealAt) : null)).join("");

  /* 바닥 카드: 낸 사람 자리에서 날아오게. 나눠 주는 동안은 뒷면, 끝나면 뒤집힘 */
  const disc = g("disc"), topKey = dl ? "deal" : String(V.top) + ":" + T.disc.length;
  if (dl) {
    if (disc.dataset.k !== "deal") { disc.dataset.k = "deal"; disc.innerHTML = backHTML(); }
  } else if (disc.dataset.k !== topKey) {
    const flip = disc.dataset.k === "deal";
    disc.dataset.k = topKey;
    const last = [...T.ev].reverse().find(e => e.t === "play" && e.card === V.top);
    let from = "";
    if (last) {
      const seatEl = g("seats").children[V.p.indexOf(last.pid)];
      if (seatEl) {
        const dx = seatEl.offsetLeft + seatEl.offsetWidth / 2 - (disc.offsetLeft + disc.offsetWidth / 2);
        const dy = g("seats").offsetTop + seatEl.offsetTop - (disc.offsetTop + disc.offsetHeight / 2);
        from = `style="--fx:${Math.round(dx)}px;--fy:${Math.round(dy)}px"`;
      }
    }
    disc.innerHTML = cardHTML(V.top, { cls: flip ? "flipin" : "fly", attr: flip ? "" : from });
  }
  disc.style.setProperty("--glow", dl ? "transparent" : COLOR_INFO[V.color].hex);   // 나눠 주는 동안은 색을 숨김
  dealFly(g, V, T, dl, now);                             // 바닥 카드를 놓은 뒤에 재야 더미 위치가 맞음
  if (dl) g("cname").innerHTML = `<span class="muted">카드를 나눠 주는 중…</span>`;
  else g("cname").innerHTML = `<span class="sw" style="background:${COLOR_INFO[V.color].hex}"></span>${colorName(V.color)}${V.atk ? ` <span class="atkb">⚔ +${V.atk.n} 쌓임</span>` : ""}`;
  g("quiz").innerHTML = V.quiz ? `<div class="qhd">${esc(nm(V.quiz.target))} 방어 문제 · ${V.quiz.n || 4}장 <b data-dl="${V.quiz.dl}" data-tot="${E.RULES.quizMs}">${secLeft(V.quiz.dl, Net.now())}</b></div>
      <div class="qq">${esc(V.quiz.q)}</div><ol>${V.quiz.opts.map(o => `<li>${esc(o)}</li>`).join("")}</ol>` : "";
  g("quiz").classList.toggle("on", !!V.quiz);
  let best = null;
  newEvents(T, e => { toast(evText(e, nm)); const f = fxOf(e); if (f && (!best || f !== "card")) best = f; });
  if (best) Sound.fx(best);
}
function seatHTML(T, V, p, dealt = null) {
  const s = seats[p] || {}, me = dealt == null && V.turn === p, n = dealt ?? V.n[p];
  const tags = [];
  if (V.uno && V.uno.pid === p) tags.push(V.uno.safe ? `<i class="tag uno">류노!</i>` : `<i class="tag warn">1장!</i>`);
  if (V.quiz && V.quiz.target === p) tags.push(`<i class="tag q">방어 중</i>`);
  if (V.atk && V.turn === p) tags.push(`<i class="tag warn">+${V.atk.n} 받아치기?</i>`);
  if (V.winner === p) tags.push(`<i class="tag win">승리</i>`);
  if (H.stars[p]) tags.push(`<i class="tag st">⭐${H.stars[p]}</i>`);
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

/* 더미에서 각 자리로 날아가는 카드. 다시 그려도 지난 시간만큼 이어서 날아감 */
function dealFly(g, V, T, dl, now) {
  const fx = g("dealfx");
  if (!dl) { if (fx.innerHTML) fx.innerHTML = ""; return; }
  const deck = g("deck"), pile = deck.parentElement, seatsEl = g("seats");
  const x0 = pile.offsetLeft + deck.offsetLeft + deck.offsetWidth / 2, y0 = pile.offsetTop + deck.offsetTop + deck.offsetHeight / 2;
  const N = V.p.length, t = now - T.dealAt;
  let h = "";
  for (let r = 0; r < DEAL.hand; r++) for (let s = 0; s < N; s++) {
    const leave = dealLeave(r * N + s, N);
    if (leave + DEAL.fly <= t) continue;                       // 이미 도착
    const seat = seatsEl.children[s]; if (!seat) continue;
    const x1 = seatsEl.offsetLeft + seat.offsetLeft + seat.offsetWidth / 2, y1 = seatsEl.offsetTop + seat.offsetTop + 40;
    h += `<div class="dfly" style="left:${x0 | 0}px;top:${y0 | 0}px;--tx:${(x1 - x0) | 0}px;--ty:${(y1 - y0) | 0}px;--rt:${((s - (N - 1) / 2) * 9) | 0}deg;animation-duration:${DEAL.fly}ms;animation-delay:${(leave - t) | 0}ms">${backHTML()}</div>`;
  }
  fx.innerHTML = h;
}

/* ---------- 우승 장면 (선생님이 [결과 보기]를 누를 때까지) ---------- */
function renderWin(T) {
  const key = "win" + rkOf(T);
  if ($stage.dataset.k === key && $stage.classList.contains("win")) {     // 이미 그림 → 색종이는 그대로, 이름만 고침
    const b = $stage.querySelector(".wtitle b"); if (b) b.textContent = nm(T.winner);
    return;
  }
  const multi = Object.keys(H.tables).length > 1;
  $stage.dataset.k = key; $stage.dataset.tid = T.id;
  $stage.className = "stage win";
  const last = T.disc[T.disc.length - 1];
  $stage.innerHTML = `${head(`<span class="bround">${multi ? `<b class="tno">${T.id}번 테이블</b> · ` : ""}${T.rnd || 1}판</span>`)}
    <div class="wglow"></div>
    <div class="wcard" style="--glow:${COLOR_INFO[T.color].hex}">${cardHTML(last)}</div>
    <div class="wtitle"><span class="wtro">🏆</span><b>${esc(nm(T.winner))}</b> 승리!</div>
    <div class="wsub">${T.ev.some(e => e.t === "win" && e.left) ? "혼자 남았어요" : "카드를 모두 냈어요!"}</div>
    ${confettiHTML(140, 0, (T.rnd || 1) * 7 + +T.id)}
    <div class="ego"><button class="pill y xl" data-b="next">다음 판</button><button class="pill" data-b="results">결과 보기</button></div>${zoomBar(T)}`;
  wire();
  Sound.fx("win");
}
/* ---------- 테이블 여러 개: 격자 ---------- */
function renderMany(ts) {
  $stage.className = "stage many"; $stage.dataset.k = "grid"; delete $stage.dataset.tid;
  const waiting = online().filter(u => !tableOf(u)).length, done = ts.filter(T => T.phase === "end").length;
  let best = null;
  $stage.innerHTML = `${head(`<span class="bround">테이블 ${ts.length}개${done ? ` · 🏆 ${done}개 끝남` : ""}</span>${waiting ? `<span class="wait">대기 ${waiting}명</span>` : ""}`)}
    <div class="grid g${ts.length <= 4 ? 2 : 3} ${ts.length <= 2 ? "r1" : ""}">${ts.map(T => panelHTML(T, f => { if (!best || f === "uno" || f === "catch" || f === "win") best = f; })).join("")}</div>
    <div class="ghint">칸을 누르면 그 테이블을 크게 봐요</div>
    ${bbar(`<button class="pill sm" data-b="tour">⏵ 자동 순회</button><button class="pill sm" data-b="pause">${H.paused ? "▶ 모두 다시" : "⏸ 모두 멈춤"}</button>`)}`;
  $stage.querySelectorAll(".panel[data-tid]").forEach(el => el.onclick = e => {
    const rs = e.target.closest("[data-rs]");
    if (rs) return restartTable(rs.dataset.rs);
    H.view = el.dataset.tid; H.tour = false; afterChange();
  });
  wire();
  if (best && best !== "card" && best !== "draw") Sound.fx(best);
}
function panelHTML(T, onFx) {
  const V = E.publicView(T), dl = dealing(T), t = Net.now() - (T.dealAt || 0), end = V.phase === "end";
  if (end && !won[T.id]) won[T.id] = Date.now();
  let line = "";
  newEvents(T, e => {
    const x = evText(e, nm);
    if (x) { line = x.big ? `${x.big} ${x.small || ""}` : x.small; flash[T.id] = Date.now(); }
    /* 눈여겨볼 일은 칸 테두리로 알림: 류노·잡았다·공격·손패 바꾸기·우승 */
    const k = e.t === "win" ? "win" : ["uno", "catch"].includes(e.t) ? "uno" : ["atk", "w4", "swap"].includes(e.t) ? "hot" : null;
    if (k) alertK[T.id] = { k, at: Date.now() };
    const f = fxOf(e); if (f) onFx(f);
  });
  if (line) flash[T.id + "l"] = line;
  const al = alertK[T.id] && (end || Date.now() - alertK[T.id].at < 2500) ? "al-" + alertK[T.id].k : "";
  const fl = Date.now() - (flash[T.id] || 0) < 1200 ? "flash" : "";
  const state = T.paused ? `<span class="tag off">멈춤</span>` : V.quiz ? `<span class="tag q">방어 문제</span>` : V.atk ? `<span class="tag warn">⚔+${V.atk.n}</span>` : "";
  if (end) return `<div class="panel done ${al}" data-tid="${T.id}">
    <div class="ph"><b>${T.id}번 테이블</b><span class="dirs">${T.rnd || 1}판</span></div>
    <div class="pwin"><span>🏆</span><b>${esc(nm(V.winner))}</b><i>승리!</i></div>
    <div class="pend"><button class="pill y sm" data-rs="${T.id}">다음 판 ▶</button></div>
    ${won[T.id] && Date.now() - won[T.id] < 4500 ? confettiHTML(40, Date.now() - won[T.id], +T.id) : ""}</div>`;
  return `<div class="panel ${fl} ${al} ${T.paused ? "paused" : ""}" data-tid="${T.id}">
    <div class="ph"><b>${T.id}번 테이블</b><span class="dirs">${T.rnd || 1}판 ${V.dir > 0 ? "↻" : "↺"}</span>${state}
      ${V.turn && !dl ? `<div class="bar" data-dl="${V.quiz ? V.quiz.dl : V.dl}" data-tot="${V.quiz ? E.RULES.quizMs : V.drawn ? E.RULES.afterDrawMs : E.RULES.turnMs}"><i></i></div>` : ""}</div>
    <div class="pb"><div class="pcol"><div class="ptc" style="--glow:${dl ? "transparent" : COLOR_INFO[V.color].hex}">${dl ? backHTML() : cardHTML(V.top)}</div>
      <div class="pcn">${dl ? "" : `<span class="sw" style="background:${COLOR_INFO[V.color].hex}"></span>${COLOR_INFO[V.color].manner}`}</div></div>
      <ul>${V.p.map(p => {
        const tag = V.uno && V.uno.pid === p ? (V.uno.safe ? "류노!" : "1장!") : V.quiz && V.quiz.target === p ? "방어 중" : V.atk && V.turn === p ? `+${V.atk.n}!` : "";
        return `<li class="${!dl && V.turn === p ? "now" : ""} ${seats[p] && seats[p].on ? "" : "gone"}"><span>${esc(nm(p))}</span><i>${tag}</i><b>${dl ? dealCount(V.p.indexOf(p), V.p.length, t) : V.n[p]}</b></li>`;
      }).join("")}</ul></div>
    <div class="pline">${esc(dl ? "카드를 나눠 주는 중…" : flash[T.id + "l"] || colorName(V.color))}</div></div>`;
}
/* ---------- 결과 ---------- */
function renderEnd(T) {
  const multi = Object.keys(H.tables).length > 1;
  $stage.className = "stage end"; $stage.dataset.k = "end" + rkOf(T); $stage.dataset.tid = T.id;
  const top = Object.entries(H.stars).filter(([u]) => seats[u]).sort((a, b) => b[1] - a[1]).slice(0, 5);
  $stage.innerHTML = `${head(`<span class="bround">${multi ? `<b class="tno">${T.id}번 테이블</b> · ` : ""}${T.rnd || 1}판 결과</span>`)}
    <h1 class="etitle">🏆 ${esc(nm(T.winner))} 승리!</h1>
    <div class="results g1 ${top.length ? "withstars" : ""}"><div class="res-t">
      <ol>${E.ranking(T).map((p, i) => `<li class="${i === 0 ? "w" : ""}"><span>${i === 0 ? "🏆" : i + 1}</span>${esc(nm(p))}<b>${T.hands[p] ? T.hands[p].length : 0}장</b></li>`).join("")}</ol></div></div>
    ${top.length ? `<div class="stars"><b>⭐ 별 순위</b>${top.map(([u, n], i) => `<span>${i + 1}. ${esc(nm(u))} <i>${n}</i></span>`).join("")}</div>` : ""}
    <div class="ego"><button class="pill y xl" data-b="next">다음 판</button>${multi ? "" : `<button class="pill" data-b="tidy">🧹 방 정리</button><button class="pill" data-b="lobby">대기실로</button>`}</div>${zoomBar(T)}`;
  wire();
}
/* ---------- 겹쳐 뜨는 것: 멈춤 · 깜짝 문제 ---------- */
function renderOverlay() {
  let ov = document.getElementById("ov");
  if (!ov) { ov = document.createElement("div"); ov.id = "ov"; }
  $stage.appendChild(ov);
  const p = H.pop;
  if (p) {
    const total = online().length;
    ov.className = "ov pop on";
    ov.innerHTML = `<div class="popbox"><div class="pophd">⚡ 선생님 깜짝 문제 ${p.done ? "" : `<b data-dl="${p.dl}" data-tot="${POP_MS}">${secLeft(p.dl, Net.now())}</b>`}</div>
      <div class="popq">${esc(p.q)}</div>
      <div class="popo">${p.opts.map((o, i) => `<div class="${p.done ? (i === p.a ? "right" : "dim") : ""}"><i>${i + 1}</i>${esc(o)}</div>`).join("")}</div>
      ${p.done ? `<div class="popr"><b>정답 ${p.right.length}명</b> ⭐+1 ${p.right.slice(0, 12).map(u => esc(nm(u))).join(", ")}${p.right.length > 12 ? " …" : ""}${p.ex ? `<div class="muted">${esc(p.ex)}</div>` : ""}</div>`
        : `<div class="popr">답한 사람 <b>${Object.keys(p.ans).length}</b> / ${total}명 · 각자 기기에서 고르세요</div>`}</div>`;
  } else if (H.phase === "play" && (H.paused || (viewTable() && viewTable().paused))) {
    ov.className = "ov pause on";
    ov.innerHTML = `<div class="pausebox">⏸ ${H.paused ? "잠깐 멈춤" : `${viewTable().id}번 테이블 멈춤`}<span>선생님이 다시 시작하면 이어서 해요</span></div>`;
  } else { ov.className = "ov"; ov.innerHTML = ""; }
}

/* ---------- 선생님 판 ---------- */
function closePanel() { tpOpen = false; if ($tp) { $tp.remove(); $tp = null; } }
function renderPanel() {
  if ($tp && $tp.isConnected && document.activeElement && document.activeElement.tagName === "SELECT" && $tp.contains(document.activeElement)) return;   // 고르는 중이면 그대로
  if (!$tp || !$tp.isConnected) { $tp = document.createElement("div"); $tp.className = "tp"; }
  $stage.appendChild($tp);
  const play = H.phase === "play", ts = Object.values(H.tables);
  const open = $tp.querySelectorAll("details[open]");                 // 펼쳐 둔 칸은 다시 그려도 펼친 채로
  const opened = new Set([...open].map(d => d.dataset.k));
  const wait = Object.keys(seats).filter(u => !tableOf(u)).sort((a, b) => nm(a).localeCompare(nm(b), "ko"));
  const top = Object.entries(H.stars).filter(([u]) => seats[u]).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const opts = (u, cur) => `<select data-mv="${u}" title="자리 옮기기"><option value="">${cur ? cur + "번" : "대기"}</option>${ts.filter(t => t.id !== cur).map(t => `<option value="${t.id}">→ ${t.id}번</option>`).join("")}${cur ? `<option value="-">→ 대기</option>` : ""}</select>`;
  const person = (u, T) => {
    const st = seats[u] || {};
    return `<div class="tp-p ${st.on ? "" : "gone"}"><button class="nm" data-rn="${u}" title="이름 고치기">${esc(nm(u))}</button>
      <span class="info">${T && T.hands[u] ? `${T.hands[u].length}장` : ""}${H.stars[u] ? ` ⭐${H.stars[u]}` : ""}${st.on ? "" : " · 나감"}</span>
      ${T && T.phase !== "end" ? `<button data-gf="${u}" title="카드 1장 주기">+1</button>` : ""}${play ? opts(u, T && T.id) : ""}<button class="r" data-kk="${u}" title="내보내기">✕</button></div>`;
  };
  const tableBox = T => {
    const st = T.phase === "end" ? `🏆 ${esc(nm(T.winner))}` : T.paused ? "멈춤" : dealing(T) ? "나눠 주는 중" : "진행 중";
    return `<div class="tp-t"><div class="tp-th"><b>${T.id}번</b><span>${T.rnd || 1}판 · ${st}</span>
      ${T.phase === "end" ? `<button class="pill sm y" data-rs="${T.id}">다음 판</button>` : `<button class="pill sm" data-tp="${T.id}">${T.paused ? "▶" : "⏸"}</button>`}
      ${ts.length > 1 ? `<button class="pill sm" data-vw="${T.id}">보기</button>` : ""}</div>
      ${T.players.map(u => person(u, T)).join("")}</div>`;
  };
  $tp.innerHTML = `<div class="tp-hd"><b>⚙ 선생님</b><button class="pill sm" data-t="close">닫기</button></div>
    <div class="tp-row tp-main">
      ${play ? `<button class="pill ${H.paused ? "y" : ""}" data-t="pause">${H.paused ? "▶ 모두 다시" : "⏸ 모두 멈춤"}</button>
        <button class="pill" data-t="again">🔀 테이블 새로 나누기</button><button class="pill" data-t="lobby">대기실로</button>`
        : `<button class="pill y" data-t="again">게임 시작</button>`}
    </div>
    <div class="tp-sec"><h4>⚡ 깜짝 문제 <span class="muted">모두 각자 풀고, 맞히면 ⭐+1</span></h4>
      <div class="tp-row"><div class="seg sm">${[1, 2, 3, 4, 5].map(l => `<button data-pl="${l}" class="${popLevel === l ? "on" : ""}" title="${LV_NAME[l]}">${l}</button>`).join("")}</div>
      <button class="pill y" data-t="pop" ${H.pop ? "disabled" : ""}>문제 내기</button><span class="muted small">${LV_NAME[popLevel]}</span></div></div>
    <div class="tp-sec grow"><h4>👥 ${play ? "테이블" : "학생"} <span class="muted">이름을 누르면 고칠 수 있어요</span></h4><div class="tp-list">
      ${play ? ts.map(tableBox).join("") : ""}
      ${wait.length ? `<div class="tp-t"><div class="tp-th"><b>${play ? "대기" : "들어온 학생"}</b><span>${wait.length}명${play ? " · 판이 끝난 테이블의 다음 판에 들어가요" : ""}</span></div>${wait.map(u => person(u, null)).join("")}</div>` : ""}
      ${!Object.keys(seats).length ? `<span class="muted">아직 아무도 없어요.</span>` : ""}</div></div>
    <details class="tp-sec" data-k="set" ${opened.has("set") ? "open" : ""}><summary>⚙ 설정 <span class="muted">방어 문제 · 소리</span></summary>
      <div class="tp-row"><span class="tp-l">+4 방어 문제</span><div class="seg sm">${Object.entries(LEVELS).map(([k, v]) => `<button data-tl="${k}" class="${H.cfg.level === k ? "on" : ""}">${v.name}</button>`).join("")}</div>
        <button class="pill sm" data-t="qm">문제 관리</button></div>
      <div class="tp-row"><span class="tp-l">소리</span><button class="pill sm" data-t="bgm">배경음 ${Sound.bgmOn ? "켜짐" : "꺼짐"}</button>
        <button class="pill sm" data-t="sfx">효과음 ${Sound.sfxOn ? "켜짐" : "꺼짐"}</button>
        <label class="pill sm">내 음악<input type="file" accept="audio/*" data-t="file" hidden></label>
        ${Sound.custom ? `<button class="pill sm" data-t="nofile">기본 음악</button>` : ""}</div></details>
    <details class="tp-sec" data-k="rec" ${opened.has("rec") ? "open" : ""}><summary>📋 기록 <span class="muted">별 순위 · 지난 판</span></summary>
      ${top.length ? `<div class="tp-stars">${top.map(([u, n], i) => `<span>${i + 1}. ${esc(nm(u))} <b>⭐${n}</b></span>`).join("")}</div><div class="muted small">승리 3 · 방어 성공 1 · 깜짝 문제 1</div>` : `<div class="muted small">아직 별이 없어요.</div>`}
      ${H.history.length ? `<div class="tp-hist">${H.history.slice(-8).reverse().map(h => `<div>${h.multi || h.tables ? `${h.id || ""}번 · ` : ""}${h.rnd || h.round || ""}판 🏆${esc(nm(h.winner || (h.tables && h.tables[0] && h.tables[0].winner)))}</div>`).join("")}</div>` : ""}
      <div class="tp-row"><button class="pill sm" data-t="tidy">🧹 방 정리</button><button class="pill sm r" data-t="close-room">방 닫기</button></div></details>
    <div class="muted small tp-foot">스페이스바: 모두 멈춤 / 다시 시작</div>`;
  $tp.onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    const d = b.dataset;
    if (d.t === "close") return closePanel();
    if (d.t === "pause") return togglePause();
    if (d.t === "again") return (H.phase === "lobby" || confirm("모든 테이블을 끝내고 새로 나눠 시작할까요?")) && startRound();
    if (d.t === "lobby") return confirm("대기실로 돌아갈까요?") && toLobby();
    if (d.t === "tidy") return tidyRoom();
    if (d.pl) { popLevel = +d.pl; return renderPanel(); }
    if (d.t === "pop") return startPop(popLevel);
    if (d.tl) { H.cfg.level = d.tl; return afterChange(); }
    if (d.t === "qm") return openManager(document.body, () => {});
    if (d.t === "bgm") { Sound.toggleBgm(); return render(); }
    if (d.t === "sfx") { Sound.toggleSfx(); return renderPanel(); }
    if (d.t === "nofile") { Sound.setFile(null); return renderPanel(); }
    if (d.rs) return restartTable(d.rs);
    if (d.tp) return togglePause(d.tp);
    if (d.vw) { H.view = d.vw; H.tour = false; return afterChange(); }
    if (d.rn) return rename(d.rn);
    if (d.gf) return gift(d.gf);
    if (d.kk) return kick(d.kk);
    if (d.t === "close-room") return closeRoom();
  };
  $tp.onchange = e => {
    const t = e.target;
    if (t.dataset.t === "file" && t.files[0]) { Sound.setFile(t.files[0]); renderPanel(); }
    if (t.dataset.mv && t.value) moveTo(t.dataset.mv, t.value === "-" ? null : t.value);
  };
}
