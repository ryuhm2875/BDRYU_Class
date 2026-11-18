/* ──────────────────────────────────────────────────────────────
   마지막 배는 6시 · 칠판 (심판)
   방 만들기 → QR → 대기실 → 자동 방 나누기 → 판정 → 단면도 중계 → 결과
   정답(answers.js)은 이 기기에만 실립니다.
   ────────────────────────────────────────────────────────────── */
import { Net, P, newCode } from "./net.js?v=202611181710";
import { CHARS, ROOMS, MAP, GAME_MS, IT, clockText, leftText, isOpen, itPos } from "./data.js?v=202611181710";
import { makeTeams, allocate, pickTeamForLate, removeFrom } from "./split.js?v=202611181710";
import { newTeam, handle, timeUp } from "./judge.js?v=202611181710";
import { CLUES, ZOOM2 } from "./answers.js?v=202611181710";
import { esc } from "./puzzles.js?v=202611181710";

const LS = "escape-board";
const GONE_MS = 30000;                    // 이만큼 끊겨 있으면 ‘나간 학생’
const $app = () => document.getElementById("app");

export async function Board(ctx) {
  const uid = Net.uid;
  let code = null, pub = null, seats = {}, posAll = {}, waiting = [];
  const offSince = {};

  /* ---------- 방 이어 쓰기 또는 새로 만들기 ---------- */
  let saved = null; try { saved = JSON.parse(localStorage.getItem(LS) || "null"); } catch (e) {}
  if (saved && saved.code) {
    const meta = await Net.get(P.meta(saved.code)).catch(() => null);
    if (meta && meta.host === uid) { code = saved.code; pub = saved.pub; waiting = saved.waiting || []; }
  }
  if (!code) {
    code = newCode();
    pub = { phase: "lobby", cfg: { fear: "normal" }, teams: {} };
    await Net.set(P.room(code), { meta: { host: uid, at: Net.TS, v: 1 }, pub });
  }
  const save = () => { try { localStorage.setItem(LS, JSON.stringify({ code, pub, waiting })); } catch (e) {} };
  let wq = null;
  const write = () => { save(); if (wq) return; wq = setTimeout(() => { wq = null; Net.set(P.pub(code), pub).catch(() => {}); }, 60); };
  write();
  setInterval(() => Net.update(P.meta(code), { at: Net.TS }).catch(() => {}), 60000);

  const el = () => pub.startAt ? Net.now() - pub.startAt : 0;
  const nameOf = u => (seats[u] && seats[u].name) || "?";

  /* ---------- 단서 나눠 주기: 열린 방의 단서를 지금 그 캐릭터를 든 학생에게 ---------- */
  function syncPriv(tid) {
    const T = pub.teams[tid]; if (!T) return;
    for (const u of T.m) {
      const clues = {};
      for (const k of [1, 2, 3, 4, 5]) {
        if (!isOpen(T, k)) continue;
        for (const ch of ROOMS[k].owners) if ((T.c[u] || []).includes(ch) && CLUES[k] && CLUES[k][ch]) (clues[k] = clues[k] || {})[ch] = CLUES[k][ch];
      }
      if (T.part[2] && T.part[2].crop) (clues[2] = clues[2] || {})["*"] = ZOOM2;      // 모둠 모두에게
      Net.set(P.priv(code, u), { tid, clues }).catch(() => {});
    }
  }
  const realloc = tid => { const T = pub.teams[tid]; if (!T) return; T.c = allocate(T.m); syncPriv(tid); };

  /* ---------- 시작 ---------- */
  function start() {
    const on = Object.keys(seats).filter(u => seats[u].on);
    if (!on.length) return;
    const shuffled = on.map(u => [crypto.getRandomValues(new Uint32Array(1))[0], u]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    const groups = makeTeams(shuffled);
    pub.teams = {};
    for (const [tid, g] of Object.entries(groups)) { pub.teams[tid] = newTeam(g.m); pub.teams[tid].c = allocate(g.m); }
    pub.phase = "play"; pub.startAt = Net.now() + 2000; waiting = [];
    Net.remove(`${P.room(code)}/pos`).catch(() => {});
    write();
    Object.keys(pub.teams).forEach(syncPriv);
    render();
  }

  /* ---------- 학생 요청 처리 ---------- */
  Net.on(P.inbox(code), box => {
    if (!box || pub.phase !== "play") return;
    let changed = false;
    for (const [u, reqs] of Object.entries(box)) {
      for (const [k, req] of Object.entries(reqs || {})) {
        Net.remove(`${P.mail(code, u)}/${k}`).catch(() => {});
        const tid = Object.keys(pub.teams).find(t => pub.teams[t].m.includes(u));
        if (!tid) continue;
        const T = pub.teams[tid], before = JSON.stringify([T.solved, T.part]);
        const r = handle(T, req, el(), pub.cfg, T.c[u] || []);
        if (r !== "ignored" || T.msg) changed = true;
        if (JSON.stringify([T.solved, T.part]) !== before) syncPriv(tid);     // 다음 방 단서 · 확대 사진
      }
    }
    if (changed) { checkEnd(); write(); }
  });

  /* ---------- 자리: 들어오고 나가기 ---------- */
  Net.on(P.seats(code), v => {
    seats = v || {};
    if (pub.phase === "play") {
      for (const u of Object.keys(seats)) {
        if (!seats[u].on) { offSince[u] = offSince[u] || Date.now(); continue; }
        delete offSince[u];
        const inTeam = Object.values(pub.teams).some(t => t.m.includes(u));
        if (!inTeam && !waiting.includes(u)) lateJoin(u);
      }
      write();
    }
    render();
  });
  function lateJoin(u) {
    const tid = pickTeamForLate(pub.teams);
    if (tid) { pub.teams[tid].m.push(u); realloc(tid); return; }
    waiting.push(u);
    if (waiting.length >= 2) {                                  // 다 찼으면 둘이 모일 때 새 방
      const tid2 = "T" + (Object.keys(pub.teams).length + 1);
      pub.teams[tid2] = newTeam(waiting.splice(0)); realloc(tid2);
    }
  }
  function sweepGone() {
    if (pub.phase !== "play") return;
    let ch = false;
    for (const [u, t] of Object.entries(offSince)) {
      if (Date.now() - t < GONE_MS) continue;
      delete offSince[u];
      waiting = waiting.filter(x => x !== u);
      const r = removeFrom(pub.teams, u);
      if (!r) continue;
      ch = true;
      if (r.mergeInto) {
        const last = pub.teams[r.tid].m[0];
        pub.teams[r.tid].m = []; pub.teams[r.tid].end = pub.teams[r.tid].end || "merged";
        pub.teams[r.mergeInto].m.push(last); realloc(r.mergeInto);
      } else if (pub.teams[r.tid].m.length) realloc(r.tid);
      else pub.teams[r.tid].end = pub.teams[r.tid].end || "merged";
    }
    if (ch) { checkEnd(); write(); }
  }

  /* ---------- 시간 ---------- */
  function checkEnd() {
    const e = el(); let ch = false;
    for (const T of Object.values(pub.teams)) if (timeUp(T, e)) ch = true;
    if (pub.phase === "play" && Object.values(pub.teams).every(T => T.end)) { pub.phase = "end"; ch = true; }
    return ch;
  }
  setInterval(() => { sweepGone(); if (pub.phase === "play" && checkEnd()) { write(); render(); } }, 1000);

  Net.on(`${P.room(code)}/pos`, v => { posAll = v || {}; });

  /* ================================================================ 화면 */
  let drawT = 0;
  function render() {
    cancelAnimationFrame(drawT);
    if (pub.phase === "lobby") return Lobby();
    if (pub.phase === "play") return Live();
    return Result();
  }

  function head(sub) {
    return `<div class="top"><a class="logo" href="${ctx.homeURL()}" style="text-decoration:none">마지막 배는 6시<small>${esc(sub)}</small></a>
      <div class="conn">방 <b>${code}</b>${Net.kind === "local" ? " · 시험 모드" : ""}</div></div>`;
  }

  function Lobby() {
    const ids = Object.keys(seats), on = ids.filter(u => seats[u].on);
    const sizes = on.length ? splitPreview(on.length) : "";
    $app().innerHTML = `<div class="wrap wide">${head("대기실")}
      <div class="lobby">
        <div class="qrbox"><div class="qr">${typeof qrSVG === "function" ? qrSVG(ctx.joinURL(code)) : ""}</div>
          <div class="code">${code}</div><div class="muted small">${esc(ctx.joinURL(code))}</div></div>
        <div class="lside">
          <h1>봉두분교 앞, ${on.length}명</h1>
          <p class="lead">${on.length ? `방 나누기: ${sizes}` : "QR을 찍거나 방 번호를 넣어 들어오세요."}</p>
          <div class="chips">${ids.map(u => `<span class="chip ${seats[u].on ? "" : "off"}">${esc(seats[u].name)}</span>`).join("")}</div>
          <div class="opt"><span>공포 강도</span>
            <button class="pill sm ${pub.cfg.fear === "weak" ? "y" : "ghost"}" data-f="weak">약함</button>
            <button class="pill sm ${pub.cfg.fear !== "weak" ? "y" : "ghost"}" data-f="normal">보통</button>
            <span class="muted small">약함: ‘그것’이 보이기만 하고 굳히지 않음, 정전 없음</span></div>
          <button class="pill y big" id="go" ${on.length ? "" : "disabled"}>시작 (5:30)</button>
          ${on.length === 1 ? `<p class="muted small">1명은 시험용입니다. 혼자 캐릭터 5명을 모두 맡아요.</p>` : ""}
        </div></div></div>`;
    $app().querySelectorAll("[data-f]").forEach(b => b.onclick = () => { pub.cfg.fear = b.dataset.f; write(); Lobby(); });
    document.getElementById("go").onclick = start;
  }
  function splitPreview(n) {
    const t = makeTeams(Array.from({ length: n }, (_, i) => i));
    return Object.values(t).map(x => x.m.length + "명").join(" + ");
  }

  /* ---------- 진행 중: 모둠마다 단면도 ---------- */
  function Live() {
    const tids = Object.keys(pub.teams).filter(t => pub.teams[t].m.length || pub.teams[t].end !== "merged");
    $app().innerHTML = `<div class="wrap wide live">${head("진행 중")}
      <div class="livehead"><div class="bigclock" id="bc">5:30</div><div class="muted" id="bl"></div>
        <div class="sp"></div>${waiting.length ? `<span class="chip">기다리는 학생 ${waiting.map(nameOf).map(esc).join(", ")}</span>` : ""}
        <button class="pill sm ghost" id="stop">끝내기</button></div>
      <div class="teams n${Math.min(tids.length, 6)}">${tids.map(t => `<div class="team" id="tm-${t}">
        <div class="thead"><b>${t.replace("T", "")}모둠</b><span class="who">${pub.teams[t].m.map(u => `${esc(nameOf(u))}<small>${(pub.teams[t].c[u] || []).map(c => CHARS[c].name.slice(1)).join("·")}</small>`).join(" ")}</span></div>
        <canvas width="900" height="300"></canvas>
        <div class="tinfo"></div></div>`).join("")}</div></div>`;
    document.getElementById("stop").onclick = () => {
      if (!document.getElementById("stop").dataset.sure) { document.getElementById("stop").dataset.sure = 1; document.getElementById("stop").textContent = "정말 끝낼까요? 한 번 더"; return; }
      for (const T of Object.values(pub.teams)) if (!T.end) { T.end = "night"; T.endAt = el(); }
      pub.phase = "end"; write(); render();
    };
    const loop = () => { drawT = requestAnimationFrame(loop); drawLive(tids); };
    loop();
  }
  let lastInfo = 0;
  function drawLive(tids) {
    const e = el();
    const bc = document.getElementById("bc"); if (!bc) return;
    bc.textContent = e < 0 ? "곧 시작" : clockText(e);
    document.getElementById("bl").textContent = e < 0 ? "" : `배 출발까지 ${leftText(e)}`;
    const info = performance.now() - lastInfo > 500; if (info) lastInfo = performance.now();
    for (const t of tids) {
      const T = pub.teams[t], box = document.getElementById("tm-" + t); if (!box) continue;
      drawPlan(box.querySelector("canvas"), T, posAll[t] || {}, e);
      if (info) box.querySelector(".tinfo").innerHTML =
        `<span class="rooms">${[1, 2, 3, 4, 5].map(k => `<i class="${T.solved[k] ? "on" : isOpen(T, k) ? "open" : ""}">${k}</i>`).join("")}</span>
         <span>증거 ${T.ev.length}</span><span>📔 ${Object.keys(T.diary).length}/5</span><span>틀림 ${T.wrong}</span><span>📱 ${T.bat}%</span>
         ${T.end ? `<b class="endtag">${endName(T.end)}</b>` : ""}
         ${T.msg ? `<span class="msg ${T.msg.kind}">${esc(T.msg.text)}</span>` : ""}`;
    }
  }

  function Result() {
    const rows = Object.entries(pub.teams).filter(([, T]) => T.end !== "merged");
    const mmss = ms => { const s = Math.round((ms || 0) / 1000); return `${Math.floor(s / 60)}분 ${s % 60}초`; };
    $app().innerHTML = `<div class="wrap wide">${head("결과")}
      <h1>6시, 배가 떠났습니다</h1>
      <table class="result"><tr><th>모둠</th><th>학생 (캐릭터)</th><th>엔딩</th><th>걸린 시간</th><th>증거</th><th>일기장</th><th>틀림</th></tr>
      ${rows.map(([t, T]) => `<tr><td>${t.replace("T", "")}</td>
        <td>${T.m.map(u => `${esc(nameOf(u))} <small>${(T.c[u] || []).map(c => CHARS[c].name).join("·")}</small>`).join("<br>")}</td>
        <td><b>${endName(T.end)}</b></td><td>${T.end === "night" ? "—" : mmss(T.endAt)}</td>
        <td>${T.ev.length}/5</td><td>${Object.keys(T.diary).length}/5</td><td>${T.wrong}</td></tr>`).join("")}</table>
      <div class="row"><button class="pill y" id="again">같은 학생들로 새 게임</button><a class="pill ghost" href="${ctx.homeURL()}">처음으로</a></div></div>`;
    document.getElementById("again").onclick = () => {
      pub = { phase: "lobby", cfg: pub.cfg, teams: {} }; waiting = [];
      Net.remove(`${P.room(code)}/pos`).catch(() => {});
      Net.remove(`${P.room(code)}/priv`).catch(() => {});
      write(); render();
    };
  }

  render();
}

const endName = k => ({ true: "진엔딩", escape: "탈출", night: "밤샘", merged: "합쳐짐" }[k] || "");

/* ---------- 단면도 (지금은 위에서 본 평면. 다음 단계에서 3D 인형의 집으로) ---------- */
function drawPlan(cv, T, pos, e) {
  const g = cv.getContext("2d"), W = cv.width, Hh = cv.height;
  const X0 = -16.5, X1 = 40.5, Z0 = -8.5, Z1 = 8.5, s = Math.min(W / (X1 - X0), Hh / (Z1 - Z0));
  const X = x => (x - X0) * s, Z = z => (z - Z0) * s;
  const p = Math.max(0, Math.min(1, e / GAME_MS));
  g.fillStyle = `rgb(${12 + 10 * (1 - p)},${12 + 6 * (1 - p)},${18})`; g.fillRect(0, 0, W, Hh);
  /* 방 */
  const rect = (r, c) => { g.fillStyle = c; g.fillRect(X(r.x0), Z(r.z0), (r.x1 - r.x0) * s, (r.z1 - r.z0) * s); };
  rect(MAP.rooms[5], "#2a2820"); rect(MAP.corridor, "#3a3026");
  for (const k of [1, 2, 3, 4]) {
    const r = MAP.rooms[k];
    rect(r, T.solved[k] ? "#2c3a2e" : isOpen(T, k) ? "#3a3428" : "#1d1b19");
    g.strokeStyle = "#6d665a"; g.lineWidth = 2; g.strokeRect(X(r.x0), Z(r.z0), (r.x1 - r.x0) * s, (r.z1 - r.z0) * s);
    g.fillStyle = isOpen(T, k) ? "#e8dcc0" : "#6a6258"; g.font = `bold ${14}px sans-serif`;
    g.fillText(`${k} ${ROOMS[k].name}${T.solved[k] ? " ✓" : isOpen(T, k) ? "" : " 🔒"}`, X(r.x0) + 6, Z(r.z0) + 18);
    g.fillStyle = isOpen(T, k) ? "#5c9a5c" : "#a04040"; g.fillRect(X(r.door - 0.7), Z(-0.15), 1.4 * s, 0.3 * s);
  }
  g.fillStyle = "#e8dcc0"; g.fillText(`5 ${ROOMS[5].name}${T.solved[5] ? " ✓" : ""}`, X(-15.5), Z(-4.2));
  g.fillStyle = T.solved[4] ? "#5c9a5c" : "#a04040"; g.fillRect(X(-0.15), Z(MAP.frontDoor.z - 0.8), 0.3 * s, 1.6 * s);
  g.fillStyle = "#5a4630"; g.fillRect(X(-16), Z(0), 4 * s, 3 * s);
  /* 그것 */
  const it = itPos(Math.max(0, e), T.threat);
  g.fillStyle = "rgba(255,40,40,.18)"; g.beginPath(); g.moveTo(X(it.x), Z(it.z));
  g.arc(X(it.x), Z(it.z), IT.sight * s, it.dir - IT.fov, it.dir + IT.fov); g.closePath(); g.fill();
  g.fillStyle = "#d8d0c4"; g.beginPath(); g.arc(X(it.x), Z(it.z), 5, 0, 7); g.fill();
  /* 캐릭터 */
  for (const [c, q] of Object.entries(pos)) {
    if (!q || q.x == null || !CHARS[c]) continue;
    g.globalAlpha = q.h ? 0.35 : 1;
    if (q.f) { g.fillStyle = "rgba(255,240,200,.15)"; g.beginPath(); g.moveTo(X(q.x), Z(q.z)); g.arc(X(q.x), Z(q.z), 5 * s, q.a - 0.5, q.a + 0.5); g.closePath(); g.fill(); }
    g.fillStyle = q.fr ? "#7a8aa0" : CHARS[c].color; g.beginPath(); g.arc(X(q.x), Z(q.z), 8, 0, 7); g.fill();
    g.fillStyle = "#fff"; g.font = "bold 10px sans-serif"; g.textAlign = "center"; g.fillText(CHARS[c].name[1], X(q.x), Z(q.z) + 3.5); g.textAlign = "left";
    if (q.emo && Date.now() - (q.emo.at || 0) < 6000) { g.fillStyle = "#fff6d0"; g.font = "bold 13px sans-serif"; g.fillText(q.emo.k, X(q.x) + 9, Z(q.z) - 9); }
    g.globalAlpha = 1;
  }
  /* 정전: 이 모둠 화면이 꺼짐 */
  if (T.bo > e) { g.fillStyle = "rgba(0,0,0,.88)"; g.fillRect(0, 0, W, Hh); g.fillStyle = "#a04040"; g.font = "bold 28px sans-serif"; g.fillText("정전", W / 2 - 28, Hh / 2); }
  if (T.end) { g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(0, 0, W, Hh); g.fillStyle = "#ffd27a"; g.font = "bold 30px sans-serif"; g.textAlign = "center"; g.fillText(endName(T.end), W / 2, Hh / 2); g.textAlign = "left"; }
}
