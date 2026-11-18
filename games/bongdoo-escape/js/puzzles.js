/* ──────────────────────────────────────────────────────────────
   마지막 배는 6시 · 2D 화면 (3D 방에서 물건을 누르면 위에 뜨는 것)
   단서 보기 · 장면 카드 줄 세우기 · 자물쇠 · 일기장 · 캐릭터 소개
   ────────────────────────────────────────────────────────────── */
import { CHARS, ROOMS } from "./data.js?v=202611181648";

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
export function showMemo(bat) {
  modal(`<div class="phone"><div class="pbar"><span>메모</span><span>🔋 ${bat}%</span></div>
    <div class="memo">27년 전 재희처럼 되기 싫어.<br>이걸 찾았으면,<br>끝까지 이어 줘.</div>
    <p class="muted small">서진 언니의 휴대폰. 힌트를 쓸 때마다 배터리가 2%씩 줄어요.</p></div>`);
}

/* ---------- 혼자만 보는 단서 ---------- */
export function showClues(charId, clues) {
  const C = CHARS[charId];
  const list = Object.entries(clues || {}).filter(([, v]) => v && v[charId]).map(([room, v]) => [room, v[charId]]);
  if (!list.length) return modal(`<h2>${esc(C.name)}만 보는 것</h2><p class="lead">${esc(C.sees)}</p>
    <p class="muted">아직 이 캐릭터에게 온 단서가 없어요. 방이 열리면 칠판이 보내 줍니다.</p>`);
  const tabs = list.map(([room], i) => `<button class="pill sm ${i === list.length - 1 ? "y" : "ghost"}" data-i="${i}">${room}. ${esc(ROOMS[room].name)}</button>`).join("");
  const m = modal(`<h2>${esc(C.name)}만 보는 것</h2><div class="row ctabs">${tabs}</div><div id="clueBody"></div>
    <p class="muted small">이 화면은 나만 봅니다. 친구들에게 <b>말로</b> 알려 주세요.</p>`, { cls: "wide" });
  const show = i => {
    m.querySelectorAll(".ctabs button").forEach((b, j) => b.className = `pill sm ${i === j ? "y" : "ghost"}`);
    renderClue(m.querySelector("#clueBody"), list[i][1]);
  };
  m.querySelectorAll(".ctabs button").forEach(b => b.onclick = () => show(+b.dataset.i));
  show(list.length - 1);
}

function renderClue(el, c) {
  clearInterval(el._t);
  if (c.kind === "shorts") {
    let i = 0;
    el.innerHTML = `<div class="shorts"><div class="sframe"></div><div class="sinfo">▶ ${esc(c.views)} · ${esc(c.music)}</div>
      <div class="comments">${c.comments.map(t => `<div>💬 ${esc(t)}</div>`).join("")}</div></div>`;
    const f = el.querySelector(".sframe");
    const draw = () => { const fr = c.frames[i % c.frames.length];
      f.innerHTML = sceneSVG(fr.s) + `<div class="cap">${esc(fr.cap)}</div><div class="dots">${c.frames.map((_, j) => `<i class="${j === i % c.frames.length ? "on" : ""}"></i>`).join("")}</div>`; };
    draw(); el._t = setInterval(() => { i++; if (!document.body.contains(el)) return clearInterval(el._t); draw(); }, 1800);
    f.onclick = () => { i++; draw(); };
    return;
  }
  if (c.kind === "original") {
    el.innerHTML = `<div class="frames">${c.frames.map((fr, i) => `<button class="frame" data-i="${i}">${sceneSVG(fr.s, { clock: fr.clock })}<span>${esc(fr.t)}</span></button>`).join("")}</div>
      <div id="big" class="big"></div><p class="muted small">${esc(c.note)}</p>`;
    const big = el.querySelector("#big");
    const CROPS = [["왼쪽 위", "0 0 40 25"], ["오른쪽 위", "120 0 40 25"], ["왼쪽 아래", "0 75 40 25"], ["오른쪽 아래", "120 75 40 25"]];
    el.querySelectorAll(".frame").forEach(b => b.onclick = () => {
      const fr = c.frames[+b.dataset.i];
      big.innerHTML = `<div class="bigimg">${sceneSVG(fr.s, { clock: fr.clock })}</div>
        <div class="row">${CROPS.map(([n], j) => `<button class="pill sm ghost" data-z="${j}">🔍 ${n}</button>`).join("")}</div><div class="zoom"></div>`;
      big.querySelectorAll("[data-z]").forEach(z => z.onclick = () => {
        big.querySelector(".zoom").innerHTML = `<div class="bigimg zoomed">${sceneSVG(fr.s, { clock: fr.clock, crop: CROPS[+z.dataset.z][1] })}</div>`;
      });
    });
    return;
  }
  el.innerHTML = `<h3>${esc(c.title)}</h3><p class="lead">${br(c.body)}</p>`;
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
    m.querySelector(".slots4").innerHTML = slots.map((s, i) => `<button class="slot" data-i="${i}"><b>${i + 1}</b>${s ? sceneSVG(s) + `<span>${esc(names[s])}</span>` : "<span>비어 있음</span>"}</button>`).join("");
    m.querySelector(".pool").innerHTML = ids.filter(x => !slots.includes(x)).map(x => `<button class="card" data-id="${x}">${sceneSVG(x)}<span>${esc(names[x])}</span></button>`).join("");
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

/* ---------- 캐릭터 소개 ---------- */
export function charCardHTML(id) {
  const C = CHARS[id];
  return `<div class="ccard" style="--c:${C.color}">
    <div class="cface"><i></i></div>
    <div><div class="cname">${esc(C.name)} <small>${esc(C.grade)}</small></div>
    <p>${esc(C.intro)}</p>
    <dl><dt>혼자만 보는 것</dt><dd>${esc(C.sees)}</dd><dt>고유 능력</dt><dd>${esc(C.ability)}</dd>
    <dt>마음속 이야기</dt><dd class="secret">게임 중 털어놓을 때가 올지도 몰라요.</dd></dl></div></div>`;
}
