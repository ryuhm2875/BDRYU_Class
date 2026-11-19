/* ──────────────────────────────────────────────────────────────
   6시의 섬 · 대화창 (비주얼 노벨 방식)
   - 화면 아래 대화창 + 왼쪽 초상화 + 글자가 한 자씩
   - 초상화 그림(수채화)은 나중에 assets/portraits/<아이디>_<표정>.webp 로 넣으면 자동으로 씀.
     없으면 색과 이름 첫 글자로 대신 그림
   ────────────────────────────────────────────────────────────── */
import { NPCS } from "./data.js?v=202611191033";
import { esc } from "./puzzles.js?v=202611191033";

const has = {};             // 그림 파일이 있는지 기억
/* 친구가 아닌 사람들 */
const OTHERS = { driver: { name: "택시 기사", color: "#c8b890" }, captain: { name: "선장", color: "#9ac0c8" }, police: { name: "섬 경찰", color: "#8aa4d8" }, seojin: { name: "한서진", color: "#f0a0a8" }, jaehee: { name: "윤재희", color: "#d8c49a" } };
const who2 = w => NPCS[w] || OTHERS[w];
function portrait(who, face) {
  if (who === "narr" || who === "voice" || who === "guide") return "";
  /* 수채화 초상화: assets/portraits/<아이디>.webp (표정은 화면 효과로) */
  const isMe = who === "me";
  if (isMe) who = "me_" + GENDER;
  const src = `assets/portraits/${who}.webp`;
  const N = who2(who), col = isMe ? "#3a4660" : N ? N.color : "#555";
  const ch = isMe ? "" : N ? N.name[1] : "?";
  const ph = `<div class="pf ph ${face || ""}" style="--c:${col}"><i></i><b>${esc(ch)}</b></div>`;
  if (has[who] === false) return ph;
  if (has[who] === true) return `<div class="pf art ${face || ""}" style="--c:${col}"><img src="${src}" alt=""></div>`;
  const im = new Image(); im.onload = () => { has[who] = true; }; im.onerror = () => { has[who] = false; }; im.src = src;
  return ph;
}
/* 미리 불러 두기 (대화가 처음 뜰 때 그림이 늦게 뜨지 않게) */
export function preloadPortraits() { for (const w of ["me", "minjae", "sua", "taeo", "haeun", "seoyul", "seojin", "jaehee", "police"]) portrait(w); }

/* 이름 뒤 조사: {name:은} {name:이} {name:을} {name:과} {name:아} */
const JOSA = { "은": ["은", "는"], "이": ["이", "가"], "을": ["을", "를"], "과": ["과", "와"], "아": ["아", "야"] };
/* 주인공 성별: {오빠언니} {형누나} */
let GENDER = "m";
export function setGender(g) { GENDER = g === "f" ? "f" : "m"; }
export function withName(s, name) {
  s = String(s).replace(/\{오빠언니\}/g, GENDER === "f" ? "언니" : "오빠").replace(/\{형누나\}/g, GENDER === "f" ? "누나" : "형");
  const c = name.charCodeAt(name.length - 1);
  const bat = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
  return String(s).replace(/\{name(?::(은|이|을|과|아))?\}/g, (_, j) => j ? name + JOSA[j][bat ? 0 : 1] : name);
}

/* 장 표지: 책장이 넘어가며 장 제목이 떴다가 사라짐 */
export function chapter({ no, title, line }, name = "") {
  return new Promise(resolve => {
    const el = document.createElement("div"); el.className = "chapter";
    el.innerHTML = `<div class="cpage"><div class="cin">
      ${no ? `<div class="cno">${esc(no)}</div><div class="crule"></div>` : ""}
      <div class="cti">${esc(title)}</div>
      ${line ? `<div class="cline">${esc(withName(line, name))}</div>` : ""}</div></div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("on"));
    let done = false;
    const end = () => { if (done) return; done = true; el.classList.add("out"); setTimeout(() => { el.remove(); resolve(); }, 700); };
    const t = setTimeout(end, 3400);
    setTimeout(() => el.addEventListener("click", () => { clearTimeout(t); end(); }), 600);
  });
}

/* 사전 이야기: 화면 가득 책 한 쪽씩. 문단이 차례로 떠오름. 누르기·Space·Enter 로 넘김 */
export function book(pages, name = "") {
  return new Promise(resolve => {
    const el = document.createElement("div"); el.className = "book";
    el.innerHTML = `<button class="bskip">건너뛰기 ›</button><div class="bstage"></div><div class="bnum"></div>`;
    document.body.appendChild(el);
    const stage = el.querySelector(".bstage"), num = el.querySelector(".bnum");
    let i = -1, paras = [], shown = 0, timer = null, busy = false;
    const finish = () => { clearInterval(timer); removeEventListener("keydown", key); el.classList.add("out"); setTimeout(() => { el.remove(); resolve(); }, 700); };
    const reveal = () => { if (shown < paras.length) { paras[shown++].classList.add("on"); } else { clearInterval(timer); timer = null; el.classList.add("ready"); } };
    const show = () => {
      i++; if (i >= pages.length) return finish();
      const P = pages[i]; el.classList.remove("ready");
      const old = stage.querySelector(".bpage"); if (old) { old.classList.add("turn"); setTimeout(() => old.remove(), 700); }
      const pg = document.createElement("div"); pg.className = "bpage" + (P.msg ? " msg" : "");
      if (P.msg) {
        pg.innerHTML = `<div class="phone"><div class="pfrom">${esc(P.from || "")}</div><div class="bubble"></div><div class="ptime">${esc(P.time || "")}</div></div>`;
        pg.querySelector(".bubble").innerHTML = withName(P.msg, name).split("\n\n").map(t => `<p class="bp">${esc(t)}</p>`).join("");
      } else {
        pg.innerHTML = withName(P.text, name).split("\n\n").map(t => `<p class="bp">${esc(t)}</p>`).join("");
      }
      stage.appendChild(pg); requestAnimationFrame(() => pg.classList.add("in"));
      paras = [...pg.querySelectorAll(".bp")]; shown = 0;
      num.textContent = `${i + 1} / ${pages.length}`;
      clearInterval(timer); setTimeout(() => { reveal(); timer = setInterval(reveal, 900); }, 450);
    };
    const next = () => {
      if (busy) return;
      if (timer || shown < paras.length) { clearInterval(timer); timer = null; paras.forEach(p => p.classList.add("on")); shown = paras.length; el.classList.add("ready"); return; }
      busy = true; setTimeout(() => busy = false, 350); show();
    };
    const key = e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); next(); } };
    addEventListener("keydown", key);
    el.addEventListener("click", e => { if (e.target.closest(".bskip")) { finish(); return; } next(); });
    requestAnimationFrame(() => el.classList.add("on"));
    show();
  });
}

/* lines 를 차례로 보여 줌. 고르기가 있으면 고른 kind 를 돌려줌 */
export function talk(lines, { name = "나", onLine, party = null } = {}) {
  /* needs: 그 친구가 일행에 있을 때만 나오는 줄 */
  if (party) lines = lines.filter(L => !L.needs || party.includes(L.needs));
  return new Promise(resolve => {
    const box = document.createElement("div"); box.className = "talk"; document.body.appendChild(box);
    let i = 0, typing = null, full = "", picked = null;
    const sub = s => withName(s, name);
    const next = () => {
      if (typing) { clearInterval(typing); typing = null; box.querySelector(".tx").textContent = full; return; }
      if (i >= lines.length) { box.remove(); resolve(picked); return; }
      const L = lines[i++];
      if (L.choice) return choose(L.choice);
      onLine && onLine(L);
      const who = L.who, N = who2(who);
      const nm = who === "me" ? name : (who === "narr" || who === "voice" || who === "guide") ? "" : N ? N.name : who;
      full = sub(L.text);
      box.className = "talk " + (who === "narr" ? "narr page" : who === "voice" ? "narr voice" : who === "guide" ? "narr guide" : "");
      box.innerHTML = `${portrait(who, L.face)}<div class="tb">${nm ? `<div class="nm" style="color:${who === "me" ? "#ffd27a" : N ? N.color : "#ccc"}">${esc(nm)}</div>` : ""}<div class="tx"></div><div class="more">▼</div></div>`;
      const tx = box.querySelector(".tx"); let k = 0;
      typing = setInterval(() => { k++; tx.textContent = full.slice(0, k); if (k >= full.length) { clearInterval(typing); typing = null; } }, who === "narr" ? 34 : 28);
    };
    const choose = opts => {
      box.className = "talk choose";
      box.innerHTML = `<div class="tb"><div class="nm" style="color:#ffd27a">${esc(name)}</div>${opts.map((o, j) => `<button class="opt" data-j="${j}">${esc(sub(o.text))}</button>`).join("")}</div>`;
      box.querySelectorAll(".opt").forEach(b => b.onclick = e => {
        e.stopPropagation();
        const o = opts[+b.dataset.j]; picked = o.kind;
        lines = lines.slice(0, i).concat(o.then || [], lines.slice(i)); next();
      });
    };
    box.addEventListener("click", e => { if (!box.classList.contains("choose")) next(); });
    const key = e => { if ((e.key === " " || e.key === "Enter") && document.body.contains(box) && !box.classList.contains("choose")) { e.preventDefault(); next(); } if (!document.body.contains(box)) removeEventListener("keydown", key); };
    addEventListener("keydown", key);
    next();
  });
}
export const talking = () => !!document.querySelector(".talk");
