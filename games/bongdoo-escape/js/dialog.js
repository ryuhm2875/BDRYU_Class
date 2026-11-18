/* ──────────────────────────────────────────────────────────────
   마지막 배는 6시 · 대화창 (비주얼 노벨 방식)
   - 화면 아래 대화창 + 왼쪽 초상화 + 글자가 한 자씩
   - 초상화 그림(수채화)은 나중에 assets/portraits/<아이디>_<표정>.webp 로 넣으면 자동으로 씀.
     없으면 색과 이름 첫 글자로 대신 그림
   ────────────────────────────────────────────────────────────── */
import { NPCS } from "./data.js?v=202611181930";
import { esc } from "./puzzles.js?v=202611181930";

const has = {};             // 그림 파일이 있는지 기억
/* 친구가 아닌 사람들 */
const OTHERS = { police: { name: "섬 경찰", color: "#8aa4d8" }, seojin: { name: "한서진", color: "#f0a0a8" }, jaehee: { name: "윤재희", color: "#d8c49a" } };
const who2 = w => NPCS[w] || OTHERS[w];
function portrait(who, face) {
  if (who === "narr" || who === "voice") return "";
  /* 수채화 초상화: assets/portraits/<아이디>.webp (표정은 화면 효과로) */
  const src = `assets/portraits/${who}.webp`;
  const N = who2(who), col = who === "me" ? "#3a4660" : N ? N.color : "#555";
  const ch = who === "me" ? "" : N ? N.name[1] : "?";
  const ph = `<div class="pf ph ${face || ""}" style="--c:${col}"><i></i><b>${esc(ch)}</b></div>`;
  if (has[who] === false || who === "me") return ph;
  if (has[who] === true) return `<div class="pf art ${face || ""}" style="--c:${col}"><img src="${src}" alt=""></div>`;
  const im = new Image(); im.onload = () => { has[who] = true; }; im.onerror = () => { has[who] = false; }; im.src = src;
  return ph;
}
/* 미리 불러 두기 (대화가 처음 뜰 때 그림이 늦게 뜨지 않게) */
export function preloadPortraits() { for (const w of ["minjae", "sua", "taeo", "haeun", "seoyul", "seojin", "jaehee", "police"]) portrait(w); }

/* lines 를 차례로 보여 줌. 고르기가 있으면 고른 kind 를 돌려줌 */
export function talk(lines, { name = "나", onLine, party = null } = {}) {
  /* needs: 그 친구가 일행에 있을 때만 나오는 줄 */
  if (party) lines = lines.filter(L => !L.needs || party.includes(L.needs));
  return new Promise(resolve => {
    const box = document.createElement("div"); box.className = "talk"; document.body.appendChild(box);
    let i = 0, typing = null, full = "", picked = null;
    const sub = s => String(s).replace(/\{name\}/g, name);
    const next = () => {
      if (typing) { clearInterval(typing); typing = null; box.querySelector(".tx").textContent = full; return; }
      if (i >= lines.length) { box.remove(); resolve(picked); return; }
      const L = lines[i++];
      if (L.choice) return choose(L.choice);
      onLine && onLine(L);
      const who = L.who, N = who2(who);
      const nm = who === "me" ? name : (who === "narr" || who === "voice") ? "" : N ? N.name : who;
      full = sub(L.text);
      box.className = "talk " + (who === "narr" ? "narr" : who === "voice" ? "narr voice" : "");
      box.innerHTML = `${portrait(who, L.face)}<div class="tb">${nm ? `<div class="nm" style="color:${who === "me" ? "#ffd27a" : N ? N.color : "#ccc"}">${esc(nm)}</div>` : ""}<div class="tx"></div><div class="more">▼</div></div>`;
      const tx = box.querySelector(".tx"); let k = 0;
      typing = setInterval(() => { k++; tx.textContent = full.slice(0, k); if (k >= full.length) { clearInterval(typing); typing = null; } }, 28);
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
