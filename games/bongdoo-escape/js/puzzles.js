/* ──────────────────────────────────────────────────────────────
   마지막 배는 6시 · 2D 화면 (3D 방에서 물건을 누르면 위에 뜨는 것)
   단서 보기 · 장면 카드 줄 세우기 · 자물쇠 · 일기장 · 캐릭터 소개
   ────────────────────────────────────────────────────────────── */
import { ROOMS } from "./data.js?v=202611182044";
import { duck } from "./sound.js?v=202611182044";

export const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const br = s => esc(s).replace(/\n/g, "<br>");

/* ---------- 창 띄우기 ---------- */
export function modal(html, { cls = "", onClose } = {}) {
  closeModal();
  const m = document.createElement("div");
  m.className = "modal on " + cls; m.id = "modal";
  m.innerHTML = `<div class="mbox">${html}<button class="x" aria-label="닫기">✕</button></div>`;
  m.addEventListener("click", e => { if (e.target === m || e.target.classList.contains("x")) close(); });
  const close = () => { m.remove(); onClose && onClose(); };
  m.close = close;
  document.body.appendChild(m);
  return m;
}
export const closeModal = () => { const m = document.getElementById("modal"); if (m) m.close ? m.close() : m.remove(); };

/* ---------- 장면 그림 (서진 영상의 한 장면) ----------
   160×100 작은 그림. clock 이 있으면 오른쪽 위 벽시계가 그 시각을 가리킴 */
/* ① 실제 영상에서 뽑은 장면 사진 (assets/video) */
export const sceneImg = id => `<img class="scene shot" src="assets/video/scene_${id}.jpg" alt="" draggable="false">`;
/* 영상이 재생되는 동안 배경음악을 줄이고, 창이 닫히면 되돌림 */
function hookVideo(el, v) {
  v.addEventListener("play", () => duck(true)); v.addEventListener("pause", () => duck(false)); v.addEventListener("ended", () => duck(false));
  el._t = setInterval(() => { if (!document.body.contains(v)) { clearInterval(el._t); duck(false); } }, 400);
}
export function sceneSVG(id, { clock = null, crop = null } = {}) {
  const fig = (x, y, s = 1, arm = false) => `<g transform="translate(${x} ${y}) scale(${s})">
    <circle cx="0" cy="-26" r="6" fill="#e8c09a"/><path d="M-6,-30 q6,-8 12,0 v-2 q-6,-6 -12,2z" fill="#2a1d18"/>
    <rect x="-7" y="-19" width="14" height="18" rx="3" fill="#c03a3a"/>
    <rect x="-6" y="-1" width="5" height="10" fill="#222"/><rect x="1" y="-1" width="5" height="10" fill="#222"/>
    ${arm ? `<rect x="6" y="-30" width="4" height="14" fill="#c03a3a"/><rect x="5" y="-38" width="7" height="10" rx="1" fill="#111" stroke="#8cf" stroke-width="1"/>` : ""}</g>`;
  const smoke = (x, y, o = .8) => `<g fill="#7d7d7d" opacity="${o}"><circle cx="${x}" cy="${y}" r="9"/><circle cx="${x + 9}" cy="${y - 6}" r="11"/><circle cx="${x + 20}" cy="${y - 2}" r="8"/><circle cx="${x + 6}" cy="${y - 16}" r="8"/></g>`;
  let clockSVG = "";
  if (clock) {
    const [h, mi] = clock.split(":").map(Number);
    const ma = mi / 60 * 2 * Math.PI, ha = ((h % 12) + mi / 60) / 12 * 2 * Math.PI;
    const cx = 140, cy = 14, r = 5;
    clockSVG = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ddd6c4" stroke="#333" stroke-width="1"/>
      ${[0, 1, 2, 3].map(i => { const a = i * Math.PI / 2; return `<rect x="${cx + Math.sin(a) * 4 - .4}" y="${cy - Math.cos(a) * 4 - .4}" width=".8" height=".8" fill="#333"/>`; }).join("")}
      <line x1="${cx}" y1="${cy}" x2="${cx + Math.sin(ha) * 2.6}" y2="${cy - Math.cos(ha) * 2.6}" stroke="#111" stroke-width="1.2" stroke-linecap="round"/>
      <line x1="${cx}" y1="${cy}" x2="${cx + Math.sin(ma) * 4}" y2="${cy - Math.cos(ma) * 4}" stroke="#111" stroke-width=".7" stroke-linecap="round"/>`;
  }
  const S = {
    a: `<rect width="160" height="100" fill="#e9925a"/><rect y="60" width="160" height="40" fill="#5b4a37"/>
        <rect x="30" y="22" width="8" height="40" fill="#777"/><rect x="122" y="22" width="8" height="40" fill="#777"/>
        <rect x="40" y="18" width="80" height="12" fill="#ddd" /><text x="80" y="27.5" font-size="8" text-anchor="middle" fill="#333" font-family="sans-serif">봉두분교</text>
        ${fig(70, 84, 1.1)}`,
    b: `<rect width="160" height="100" fill="#3b352d"/><polygon points="0,100 60,55 100,55 160,100" fill="#5a4632"/>
        <rect x="60" y="20" width="40" height="35" fill="#2a251f"/><rect x="72" y="26" width="16" height="29" fill="#120e0c"/>
        ${smoke(66, 30, .85)}${smoke(80, 18, .7)}<rect x="0" y="0" width="160" height="6" fill="#2a251f"/>`,
    c: `<rect width="160" height="100" fill="#41382f"/><rect y="70" width="160" height="30" fill="#55432f"/>
        ${smoke(20, 40, .7)}${smoke(110, 30, .6)}${fig(86, 88, 1.3, true)}`,
    d: `<rect width="160" height="100" fill="#2f2a26"/>
        <rect x="35" y="14" width="90" height="56" fill="#1a1714" stroke="#555" stroke-width="3"/>
        <line x1="80" y1="14" x2="80" y2="70" stroke="#555" stroke-width="3"/>
        <g fill="#000" opacity=".8"><ellipse cx="60" cy="26" rx="26" ry="14"/><ellipse cx="96" cy="22" rx="22" ry="11"/></g>
        ${fig(80, 96, 1.5)}`
  };
  const vb = crop || "0 0 160 100";
  return `<svg class="scene" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">${S[id] || ""}${clockSVG}</svg>`;
}

/* ---------- 서진의 휴대폰 (모두 볼 수 있음) ---------- */
export function showMemo(bat, text) {
  modal(`<div class="phone"><div class="pbar"><span>메모</span><span>🔋 ${bat}%</span></div>
    <div class="memo">${br(text)}</div>
    <p class="muted small">서진 언니의 휴대폰. 힌트를 쓸 때마다 배터리가 2%씩 줄어요.</p></div>`);
}
export function phoneApps(bat, apps) {
  const m = modal(`<div class="phone"><div class="pbar"><span>서진의 폰</span><span>🔋 ${bat}%</span></div>
    <div class="apps">${apps.map((a, i) => `<button class="app" data-i="${i}"><i>${a.icon}</i><span>${esc(a.name)}</span></button>`).join("")}</div></div>`);
  m.querySelectorAll(".app").forEach(b => b.onclick = () => { const a = apps[+b.dataset.i]; m.close(); a.open(); });
  return m;
}

/* ---------- 단서 수첩: 모은 단서를 탭으로 ----------
   entries: [{ label, clue }], frags: 친구에게 들은 증거 조각 */
export function showNotebook(entries, frags = [], pick = null) {
  if (!entries.length && !frags.length) return modal(`<h2>단서 수첩</h2><p class="muted">아직 모은 단서가 없어요. 교실부터 둘러보세요.</p>`);
  const tabs = entries.map((e, i) => `<button class="pill sm ghost" data-i="${i}">${esc(e.label)}</button>`).join("")
    + (frags.length ? `<button class="pill sm ghost" data-i="f">친구에게 들은 것</button>` : "");
  const m = modal(`<h2>단서 수첩</h2><div class="row ctabs">${tabs}</div><div id="clueBody"></div>`, { cls: "wide" });
  const show = i => {
    m.querySelectorAll(".ctabs button").forEach(b => b.className = `pill sm ${b.dataset.i === String(i) ? "y" : "ghost"}`);
    const body = m.querySelector("#clueBody");
    if (i === "f") { body.innerHTML = `<ul class="frags">${frags.map(f => `<li>${esc(f)}</li>`).join("")}</ul>`; return; }
    renderClue(body, entries[i].clue);
  };
  m.querySelectorAll(".ctabs button").forEach(b => b.onclick = () => show(b.dataset.i === "f" ? "f" : +b.dataset.i));
  show(pick != null ? pick : entries.length ? entries.length - 1 : "f");
  return m;
}
export function showClue(clue) { const m = modal(`<div id="clueBody"></div>`, { cls: "wide" }); renderClue(m.querySelector("#clueBody"), clue); return m; }

function renderClue(el, c) {
  clearInterval(el._t);
  if (c.kind === "shorts") {
    el.innerHTML = `<div class="shorts real"><div class="phonev"><video src="assets/video/shorts.mp4" poster="assets/video/shorts_poster.jpg" playsinline loop autoplay></video>
        <div class="sside"><span>♥<b>3.1만</b></span><span>💬<b>2,184</b></span><span>↗<b>공유</b></span></div>
        <div class="sbar"><i></i></div><div class="stap">▶ 눌러서 재생</div></div>
      <div class="sinfo">▶ ${esc(c.views)} · ♪ ${esc(c.music)}</div>
      <div class="comments">${c.comments.map(t => `<div>💬 ${esc(t)}</div>`).join("")}</div></div>`;
    const v = el.querySelector("video"), bar = el.querySelector(".sbar i"), tap = el.querySelector(".stap");
    hookVideo(el, v);
    v.play().then(() => tap.hidden = true).catch(() => {});
    v.addEventListener("timeupdate", () => { bar.style.width = (v.currentTime / (v.duration || 1) * 100) + "%"; });
    el.querySelector(".phonev").onclick = () => { if (v.paused) { v.play(); tap.hidden = true; } else { v.pause(); tap.hidden = false; tap.textContent = "❚❚ 멈춤"; } };
    return;
  }
  if (c.kind === "original") {
    el.innerHTML = `<div class="origv"><video src="assets/video/original.mp4" poster="assets/video/orig_a.jpg" playsinline controls preload="auto"></video></div>
      <div class="frames">${c.frames.map((fr, i) => `<button class="frame" data-i="${i}">${sceneImg(fr.s)}<span>${esc(fr.t)}</span></button>`).join("")}</div>
      <div id="big" class="big"></div><p class="muted small">${esc(c.note)}</p>`;
    const v = el.querySelector("video"); hookVideo(el, v);
    const big = el.querySelector("#big");
    const CROPS = [["왼쪽 위", "0% 0%"], ["오른쪽 위", "100% 0%"], ["왼쪽 아래", "0% 100%"], ["오른쪽 아래", "100% 100%"]];
    const START = { a: 0, b: 5.5, c: 11.5, d: 17.5 };
    el.querySelectorAll(".frame").forEach(b => b.onclick = () => {
      const fr = c.frames[+b.dataset.i], src = `assets/video/orig_${fr.s}.jpg`;
      v.pause(); v.currentTime = START[fr.s] + 3.3;
      big.innerHTML = `<div class="bigimg"><img src="${src}" alt=""></div>
        <div class="row">${CROPS.map(([n], j) => `<button class="pill sm ghost" data-z="${j}">🔍 ${n}</button>`).join("")}</div><div class="zoom"></div>`;
      big.querySelectorAll("[data-z]").forEach(z => z.onclick = () => {
        big.querySelector(".zoom").innerHTML = `<div class="bigimg zoomed" style="background-image:url(${src});background-position:${CROPS[+z.dataset.z][1]}"></div>`;
      });
    });
    return;
  }
  if (c.kind === "article") {
    el.innerHTML = `<div class="paper"><div class="pm"><b>${esc(c.paper)}</b><span>${esc(c.date)}</span></div>
      <h3>${esc(c.head)}</h3><div class="pcols"><figure>${photoSVG({ crop: ARTICLE_CROP })}<figcaption>${esc(c.cap)}</figcaption></figure>
      <p>${esc(c.body)}</p></div></div>`;
    return;
  }
  if (c.kind === "film") {
    el.innerHTML = `<div class="film"><i></i><div class="neg">${photoSVG()}</div><div class="neg blank"></div><div class="neg blank"></div><i></i></div>
      <p class="lead">${br(c.note)}</p>`;
    return;
  }
  if (c.kind === "zoom") {
    el.innerHTML = `<div class="bigimg zoomed">${watchSVG(c.word)}</div><p class="lead">${esc(c.note)}</p>`;
    return;
  }
  if (c.kind === "journal") { el.innerHTML = `<div class="paper"><h3>${esc(c.title)}</h3>${c.lines.map(l => `<p>${esc(l)}</p>`).join("")}</div>`; return; }
  if (c.kind === "flyer") { el.innerHTML = `<div class="flyer">${logoSVG("sun", 56)}<div><h3>봉두분교 터, 바다를 품은 리조트로</h3><p>${br(c.body)}</p><b>해송개발</b></div></div>`; return; }
  if (c.kind === "board") { el.innerHTML = `<ul class="evlist">${c.items.map(i => `<li><b>${esc(i.t)}</b><span>${esc(i.l)}</span></li>`).join("") || "<li>아직 증거가 없어요.</li>"}</ul>`; return; }
  el.innerHTML = `<h3>${esc(c.title)}</h3><p class="lead">${br(c.body)}</p>`;
}

/* ---------- ② 1999년 사진 (240×160) ----------
   기사는 재희만 남기고 잘랐다. 오른쪽 바깥에 봉투를 든 어른의 손.
   손목시계 글자는 여기 그리지 않음 → 잘린 곳을 맞게 표시해야 칠판이 확대 사진(글자)을 보내 줌 */
export const ARTICLE_CROP = "60 18 72 124";
export function photoSVG({ crop = null } = {}) {
  return `<svg class="scene photo" viewBox="${crop || "0 0 240 160"}" xmlns="http://www.w3.org/2000/svg">
    <rect width="240" height="160" fill="#d9c9a3"/><rect y="62" width="240" height="30" fill="#ab9b78"/>
    <rect y="92" width="240" height="68" fill="#8c7858"/>
    <rect x="0" y="20" width="58" height="80" fill="#bba98a"/><rect x="10" y="34" width="16" height="20" fill="#7d6d55"/><rect x="34" y="34" width="16" height="20" fill="#7d6d55"/>
    <text x="29" y="28" font-size="6" text-anchor="middle" fill="#5a4a38" font-family="sans-serif">봉두분교</text>
    <!-- 재희 -->
    <rect x="86" y="66" width="18" height="46" rx="4" fill="#6b5a47"/>
    <rect x="88" y="112" width="5" height="24" fill="#4a3d30"/><rect x="97" y="112" width="5" height="24" fill="#4a3d30"/>
    <circle cx="95" cy="58" r="9" fill="#e6c9a2"/><path d="M85,57 q10,-16 20,0 v-4 q-10,-10 -20,0z" fill="#3a2c22"/>
    <rect x="86" y="58" width="7" height="6" rx="2" fill="#e6c9a2"/><rect x="97" y="58" width="7" height="6" rx="2" fill="#e6c9a2"/>
    <line x1="92" y1="64" x2="91" y2="70" stroke="#9ab" stroke-width=".8"/>
    <!-- 다른 어른 (기사에서 잘림) -->
    <rect x="196" y="52" width="44" height="90" rx="6" fill="#4a4036"/>
    <circle cx="224" cy="38" r="13" fill="#d7b994"/><path d="M211,36 q13,-14 26,0 v-6 q-13,-8 -26,0z" fill="#2a221c"/>
    <line x1="200" y1="76" x2="172" y2="88" stroke="#4a4036" stroke-width="9" stroke-linecap="round"/>
    <circle cx="172" cy="88" r="3.6" fill="#c8b070" stroke="#6a5a30" stroke-width=".8"/>
    <rect x="160" y="83" width="10" height="10" rx="3" fill="#d7b994"/>
    <g transform="rotate(-8 155 89)"><rect x="146" y="81" width="18" height="16" fill="#f4eee0" stroke="#999" stroke-width=".6"/>
      <line x1="149" y1="86" x2="161" y2="86" stroke="#bbb" stroke-width=".6"/><line x1="149" y1="90" x2="158" y2="90" stroke="#bbb" stroke-width=".6"/></g>
  </svg>`;
}
function watchSVG(word) {
  return `<svg class="scene photo" viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="100" fill="#cdbd98"/>
    <line x1="170" y1="30" x2="60" y2="58" stroke="#4a4036" stroke-width="40" stroke-linecap="round"/>
    <rect x="18" y="44" width="40" height="34" rx="10" fill="#d7b994"/>
    <g transform="rotate(-8 30 70)"><rect x="-6" y="52" width="40" height="38" fill="#f4eee0" stroke="#999"/><text x="14" y="76" font-size="9" text-anchor="middle" fill="#a33" font-family="sans-serif">현금</text></g>
    <circle cx="80" cy="54" r="19" fill="#c8b070" stroke="#6a5a30" stroke-width="3"/><circle cx="80" cy="54" r="14" fill="#efe6cc"/>
    <line x1="80" y1="54" x2="80" y2="43" stroke="#222" stroke-width="1"/><line x1="80" y1="54" x2="86" y2="50" stroke="#222" stroke-width="1"/>
    <text x="80" y="64" font-size="7" font-weight="bold" text-anchor="middle" fill="#3a3020" font-family="serif">${esc(word)}</text>
  </svg>`;
}

/* ---------- ② 벽에 비친 사진: 기사가 잘라 낸 곳에서 찾은 것을 네모로 ---------- */
export function cropPuzzle(onSubmit, lockedText) {
  const m = modal(`<h2>벽에 비친 사진</h2>
    <p class="lead">기사 사진과 견주어 보세요. <b>기사가 잘라 낸 곳</b>에서 수상한 것을 찾아 손가락으로 끌어 네모로 감싸세요.</p>
    <div class="cropbox" id="cb">${photoSVG()}<div class="sel" id="sel"></div></div>
    <div class="row"><button class="pill ghost" id="rs">다시</button><button class="pill y" id="go" disabled>여기를 표시</button></div>
    <div>${lockedText ? `<div class="res bad">${esc(lockedText)}</div>` : ""}</div>`, { cls: "wide" });
  const cb = m.querySelector("#cb"), sel = m.querySelector("#sel"), go = m.querySelector("#go");
  let a = null, r = null, pid = null;
  const at = e => { const b = cb.getBoundingClientRect(); return [Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)), Math.max(0, Math.min(1, (e.clientY - b.top) / b.height))]; };
  const draw = () => {
    if (!r) { sel.style.display = "none"; go.disabled = true; return; }
    Object.assign(sel.style, { display: "block", left: r[0] * 100 + "%", top: r[1] * 100 + "%", width: r[2] * 100 + "%", height: r[3] * 100 + "%" });
    go.disabled = !!lockedText || r[2] < 0.03 || r[3] < 0.03;
  };
  cb.addEventListener("pointerdown", e => { pid = e.pointerId; try { cb.setPointerCapture(pid); } catch (er) {} a = at(e); r = [a[0], a[1], 0, 0]; draw(); e.preventDefault(); });
  cb.addEventListener("pointermove", e => { if (e.pointerId !== pid || !a) return; const b = at(e); r = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])]; draw(); });
  const up = e => { if (e.pointerId === pid) { pid = null; a = null; } };
  cb.addEventListener("pointerup", up); cb.addEventListener("pointercancel", up);
  m.querySelector("#rs").onclick = () => { r = null; draw(); };
  go.onclick = () => { onSubmit(r.map(v => +v.toFixed(3))); m.close(); };
  draw();
  return m;
}

/* ---------- 글자 자물쇠 ---------- */
export function wordPad(label, onSubmit, lockedText) {
  const m = modal(`<h2>🔒 ${esc(label)}</h2><p class="lead">글자 두 칸짜리 자물쇠다.</p>
    <input class="inp word" id="wd" maxlength="6" autocomplete="off" placeholder="글자 입력" ${lockedText ? "disabled" : ""}>
    <div class="row"><button class="pill y" id="go" ${lockedText ? "disabled" : ""}>열어 보기</button></div>
    <div>${lockedText ? `<div class="res bad">${esc(lockedText)}</div>` : ""}</div>`);
  const wd = m.querySelector("#wd"), go = () => { const v = wd.value.trim(); if (v) { onSubmit(v); m.close(); } };
  m.querySelector("#go").onclick = go;
  wd.onkeydown = e => { if (e.key === "Enter" && !e.isComposing) go(); };
  setTimeout(() => wd.focus(), 50);
  return m;
}

/* ---------- 장면 카드 줄 세우기 (교실 TV) ---------- */
export function orderPuzzle(names, onSubmit, lockedText) {
  const ids = Object.keys(names).sort(() => Math.random() - 0.5);
  const slots = [null, null, null, null];
  const m = modal(`<h2>교실 TV · 장면 되돌리기</h2>
    <p class="lead">쇼츠가 섞어 놓은 장면을, <b>실제로 일어난 순서</b>로 놓으세요.</p>
    <div class="slots4"></div><div class="pool"></div>
    <div class="row"><button class="pill ghost" id="rs">다시</button><button class="pill y" id="go" disabled>이 순서로 맞추기</button></div>
    <div id="om">${lockedText ? `<div class="res bad">${esc(lockedText)}</div>` : ""}</div>`, { cls: "wide" });
  const draw = () => {
    m.querySelector(".slots4").innerHTML = slots.map((s, i) => `<button class="slot" data-i="${i}"><b>${i + 1}</b>${s ? sceneImg(s) + `<span>${esc(names[s])}</span>` : "<span>비어 있음</span>"}</button>`).join("");
    m.querySelector(".pool").innerHTML = ids.filter(x => !slots.includes(x)).map(x => `<button class="card" data-id="${x}">${sceneImg(x)}<span>${esc(names[x])}</span></button>`).join("");
    m.querySelectorAll(".card").forEach(b => b.onclick = () => { const i = slots.indexOf(null); if (i >= 0) { slots[i] = b.dataset.id; draw(); } });
    m.querySelectorAll(".slot").forEach(b => b.onclick = () => { slots[+b.dataset.i] = null; draw(); });
    m.querySelector("#go").disabled = slots.includes(null) || !!lockedText;
  };
  draw();
  m.querySelector("#rs").onclick = () => { slots.fill(null); draw(); };
  m.querySelector("#go").onclick = () => { onSubmit(slots.slice()); m.close(); };
}

/* ---------- 4자리 자물쇠 ---------- */
export function codePad(label, onSubmit, lockedText) {
  let v = "";
  const m = modal(`<h2>🔒 ${esc(label)}</h2><div class="dial"><i></i><i></i><i></i><i></i></div>
    <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, "←", 0, "확인"].map(k => `<button data-k="${k}">${k}</button>`).join("")}</div>
    <div id="cm">${lockedText ? `<div class="res bad">${esc(lockedText)}</div>` : ""}</div>`);
  const dial = [...m.querySelectorAll(".dial i")];
  const draw = () => dial.forEach((d, i) => d.textContent = v[i] || "");
  m.querySelectorAll(".pad button").forEach(b => b.onclick = () => {
    const k = b.dataset.k;
    if (lockedText) return;
    if (k === "←") v = v.slice(0, -1);
    else if (k === "확인") { if (v.length === 4) { onSubmit(v); m.close(); } return; }
    else if (v.length < 4) v += k;
    draw();
  });
}

/* ---------- 재희의 일기장 ---------- */
const DIARY = {
  1: "1999년 5월 3일.\n신문에 내 사진이 났다. 우는 얼굴만.\n그날 내 옆에 누가 있었는지는\n아무도 묻지 않는다.",
  2: "5월 5일.\n사진관 아저씨가 필름은 안 버렸다고 했다.\n원래 사진엔 다 나와 있대.",
  3: "5월 9일.\n할머니들이 테이프에 대고 말했다.\n다들 그랬다더라, 하고.\n본 사람은 없는데.",
  4: "5월 14일.\n섬을 떠난다.\n아무도 원래 사진을 안 봤으니까.",
  5: "2026년 11월.\n서진이라는 애가 찾아왔다.\n27년 만에 처음으로,\n누가 원래 사진을 봐 줬다."
};
export function showDiary(room) {
  modal(`<div class="diary"><div class="dh">재희의 일기장 · ${room}/5</div><p>${br(DIARY[room])}</p></div>`);
}


/* ================================================================
   ③ ④ ⑤ 와 ① 편집 노트 · 증거 카드
   ================================================================ */

/* 작은 로고 그림 (계정 프로필 · 전단지) */
export function logoSVG(k, size = 36) {
  const L = {
    sun: `<rect width="40" height="40" rx="9" fill="#1d5a7a"/><circle cx="20" cy="17" r="8" fill="#f2b03a"/><path d="M4 28 q8 -6 16 0 t16 0 v8 h-32z" fill="#e8f0f4"/>`,
    fire: `<rect width="40" height="40" rx="20" fill="#c0302a"/><path d="M20 8 q8 10 3 16 q4 -2 4 -7 q5 8 -2 15 h-10 q-7 -7 -1 -14 q1 5 4 6 q-5 -8 2 -16z" fill="#ffd27a"/>`,
    town: `<rect width="40" height="40" rx="9" fill="#3a7a4a"/><path d="M8 30 v-10 l6 -5 6 5 v10z M22 30 v-14 h10 v14z" fill="#f0ead8"/>`,
    eye: `<rect width="40" height="40" rx="20" fill="#222"/><ellipse cx="20" cy="20" rx="13" ry="8" fill="#fff"/><circle cx="20" cy="20" r="5" fill="#222"/>`,
    cat: `<rect width="40" height="40" rx="20" fill="#e8a0b0"/><path d="M11 14 l4 -6 4 6 h2 l4 -6 4 6 v10 q-9 8 -18 0z" fill="#fff"/>`,
    news: `<rect width="40" height="40" rx="9" fill="#ddd"/><rect x="8" y="9" width="24" height="5" fill="#333"/><rect x="8" y="18" width="11" height="13" fill="#888"/><rect x="21" y="18" width="11" height="3" fill="#888"/><rect x="21" y="24" width="11" height="3" fill="#888"/>`,
    book: `<rect width="40" height="40" rx="20" fill="#6a3a2a"/><path d="M10 12 h9 q2 0 2 2 v16 q-1 -2 -3 -2 h-8z M30 12 h-8 v18 q1 -2 3 -2 h5z" fill="#f4e8c8"/>`
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">${L[k] || ""}</svg>`;
}

/* ① 편집 노트: 쇼츠가 원본을 어떻게 바꿨나 (여러 개 고르기) */
export function editPuzzle(edits, onSubmit, lockedText) {
  const m = modal(`<h2>편집 노트</h2>
    <p class="lead">쇼츠는 원본을 <b>어떻게</b> 바꿨을까? 맞는 것을 <b>모두</b> 고르세요.</p>
    <div class="checks">${edits.map(e => `<label class="ck"><input type="checkbox" value="${e.id}"><span>${esc(e.text)}</span></label>`).join("")}</div>
    <div class="row"><button class="pill y" id="go" ${lockedText ? "disabled" : ""}>이렇게 적기</button></div>
    ${lockedText ? `<div class="res bad">${esc(lockedText)}</div>` : ""}`);
  m.querySelector("#go").onclick = () => { const v = [...m.querySelectorAll("input:checked")].map(i => i.value); if (v.length) { onSubmit(v); m.close(); } };
}

/* ③ 녹음기: 테이프 듣기 + 학교 일지 대조 + 분류 */
const WHY = { few: "사례 부족", sim: "유사성 부족", fact: "사실과 어긋남" };
function garble(t) { return t.split(" ").map((w, i) => (i % 3 === 1 ? "…지지직…" : w)).join(" "); }
export function tapePuzzle(tapes, { clean, journal }, onSubmit, lockedText, onLast) {
  const pick = {};
  const m = modal(`<h2>녹음기 · 1999년 테이프</h2>
    <p class="lead">섬사람들의 증언이다. 들어 보고, 근거가 있는지 가려 보자.</p>
    ${clean ? "" : `<div class="res bad">테이프가 늘어져 소리가 뭉개진다. 귀가 밝은 친구가 있으면 또렷해질 텐데.</div>`}
    <div class="tapes">${tapes.map((t, i) => `<div class="tape" data-id="${t.id}">
      <button class="play" data-i="${i}">▶</button>
      <div class="tw"><b>${esc(t.who)}</b><div class="tt" id="tt-${t.id}">— 재생 버튼을 누르세요 —</div>
      <div class="seg2"><button data-v="yes">근거 있음</button><button data-v="no">근거 없음</button></div>
      <div class="whys" hidden>${Object.entries(WHY).map(([k, v]) => `<button data-w="${k}">${v}</button>`).join("")}</div></div></div>`).join("")}</div>
    ${journal ? `<details class="journal"><summary>📓 수아의 대조: ${esc(journal.title)}</summary>${journal.lines.map(l => `<p>${esc(l)}</p>`).join("")}</details>` : `<p class="muted small">기록과 대조해 줄 친구가 있으면 더 확실할 텐데.</p>`}
    <div class="row"><button class="pill y" id="go" disabled>이렇게 나누기</button></div>
    ${lockedText ? `<div class="res bad">${esc(lockedText)}</div>` : ""}`, { cls: "wide" });
  let played = 0;
  m.querySelectorAll(".play").forEach(b => b.onclick = () => {
    const t = tapes[+b.dataset.i], el = m.querySelector("#tt-" + t.id), txt = clean ? t.text : garble(t.text);
    let k = 0; el.textContent = ""; clearInterval(el._t);
    el._t = setInterval(() => { k++; el.textContent = "“" + txt.slice(0, k) + (k >= txt.length ? "”" : ""); if (k >= txt.length) { clearInterval(el._t); if (++played === tapes.length && onLast) onLast(); } }, 24);
  });
  const draw = () => {
    m.querySelectorAll(".tape").forEach(row => {
      const id = row.dataset.id, v = pick[id];
      row.querySelectorAll(".seg2 button").forEach(b => b.classList.toggle("on", v === "yes" ? b.dataset.v === "yes" : v && v !== "yes" ? b.dataset.v === "no" : false));
      const w = row.querySelector(".whys"); w.hidden = !(v && v !== "yes");
      w.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.w === v));
    });
    m.querySelector("#go").disabled = !!lockedText || tapes.some(t => !pick[t.id] || pick[t.id] === "no");
  };
  m.querySelectorAll(".tape").forEach(row => {
    const id = row.dataset.id;
    row.querySelectorAll(".seg2 button").forEach(b => b.onclick = () => { pick[id] = b.dataset.v === "yes" ? "yes" : "no"; draw(); });
    row.querySelectorAll(".whys button").forEach(b => b.onclick = () => { pick[id] = b.dataset.w; draw(); });
  });
  m.querySelector("#go").onclick = () => { onSubmit(Object.assign({}, pick)); m.close(); };
  draw();
}

/* ④ 업로드 기록: 계정을 올린 순서대로 + 맨 앞 계정의 정체 */
export function accountPuzzle(accounts, sources, { flyer }, onSubmit, lockedText) {
  const order = [];
  let src = null;
  const card = a => `<div class="acc-in">${logoSVG(a.logo, 34)}<div><b>${esc(a.name)}</b><small>팔로워 ${esc(a.fol)} · 계정 만든 날 ${esc(a.born)}</small>
    <div class="cap">“${esc(a.cap)}”</div><small class="up">업로드 기록: ${esc(a.up)}</small></div></div>`;
  const m = modal(`<h2>숨겨진 앱 · 업로드 기록</h2>
    <p class="lead">같은 쇼츠를 올린 계정 여섯. <b>처음 올린 계정부터</b> 차례로 누르세요.</p>
    <div class="accs"></div>
    <h3>맨 앞 계정의 프로필 그림은 어디서 본 것일까?</h3>
    ${flyer ? "" : `<p class="muted small">이 그림, 어디서 본 것 같은데… 섬 사람이라면 알지도.</p>`}
    <div class="srcs">${sources.map(s => `<button class="src" data-s="${s.id}" ${flyer ? "" : "disabled"}>${logoSVG(s.logo, 30)}<span>${esc(s.name)}</span></button>`).join("")}</div>
    <div class="row"><button class="pill ghost" id="rs">다시</button><button class="pill y" id="go" disabled>이 기록으로 확인</button></div>
    ${lockedText ? `<div class="res bad">${esc(lockedText)}</div>` : ""}`, { cls: "wide" });
  const draw = () => {
    m.querySelector(".accs").innerHTML = accounts.map(a => { const n = order.indexOf(a.id); return `<button class="acc ${n >= 0 ? "on" : ""}" data-a="${a.id}"><i>${n >= 0 ? n + 1 : ""}</i>${card(a)}</button>`; }).join("");
    m.querySelectorAll(".acc").forEach(b => b.onclick = () => { const id = b.dataset.a, n = order.indexOf(id); if (n >= 0) order.splice(n); else order.push(id); draw(); });
    m.querySelectorAll(".src").forEach(b => b.classList.toggle("on", b.dataset.s === src));
    m.querySelector("#go").disabled = !!lockedText || order.length !== accounts.length || !src;
  };
  m.querySelectorAll(".src").forEach(b => b.onclick = () => { src = b.dataset.s; draw(); });
  m.querySelector("#rs").onclick = () => { order.length = 0; src = null; draw(); };
  m.querySelector("#go").onclick = () => { onSubmit({ order: order.slice(), src }); m.close(); };
  draw();
}

/* ⑤ 연역: 대전제 · 소전제 · 결론 */
export function deducePuzzle(cards, onSubmit, lockedText) {
  const pick = { major: null, minor: null, concl: null };
  const NAMES = { major: "대전제", minor: "소전제", concl: "결론" };
  const m = modal(`<h2>경찰 설득하기</h2>
    <p class="lead">사건 보드의 증거로 논리를 세우자. 칸마다 카드 하나씩.</p>
    <div class="ded">${Object.keys(NAMES).map(k => `<div class="dcol"><h4>${NAMES[k]}</h4>${cards[k].map(c => `<button class="dc" data-k="${k}" data-c="${c.id}">${esc(c.text)}</button>`).join("")}</div>`).join("")}</div>
    <div class="row"><button class="pill y" id="go" disabled>이 논리로 말하기</button></div>
    ${lockedText ? `<div class="res bad">${esc(lockedText)}</div>` : ""}`, { cls: "wide" });
  m.querySelectorAll(".dc").forEach(b => b.onclick = () => {
    pick[b.dataset.k] = b.dataset.c;
    m.querySelectorAll(`.dc[data-k="${b.dataset.k}"]`).forEach(x => x.classList.toggle("on", x === b));
    m.querySelector("#go").disabled = !!lockedText || Object.values(pick).some(v => !v);
  });
  m.querySelector("#go").onclick = () => { onSubmit([pick.major, pick.minor, pick.concl]); m.close(); };
}

/* ⑤ 반론에 답하기 */
export function rebutPick(list, party, onSubmit, lockedText) {
  const m = modal(`<h2>경찰의 반론</h2><p class="lead">“카메라 시계가 틀렸을 수도 있잖아?”<br>시계 말고 <b>다른 종류의 증거</b>로 답하자.</p>
    <div class="rebs">${list.map(r => { const off = r.need && !r.need.every(n => party.includes(n));
      return `<button class="reb" data-r="${r.id}" ${off || lockedText ? "disabled" : ""}>${esc(off ? "(하은이와 태오가 함께 있어야 떠올릴 수 있다)" : r.text)}</button>`; }).join("")}</div>
    ${lockedText ? `<div class="res bad">${esc(lockedText)}</div>` : ""}`);
  m.querySelectorAll(".reb").forEach(b => b.onclick = () => { onSubmit(b.dataset.r); m.close(); });
}

/* 방을 풀면: 증거 카드 + 무엇을 배웠나 */
export function evidenceCard(room, name, evidence, lesson) {
  return new Promise(res => {
    const m = modal(`<div class="evc"><div class="evk">증거 ${room} · ${esc(name)}</div><div class="evt">${esc(evidence)}</div>
      <div class="evl">${esc(lesson)}</div><button class="pill y" id="ok">사건 보드에 붙이기</button></div>`, { onClose: res });
    m.querySelector("#ok").onclick = () => m.close();
  });
}
