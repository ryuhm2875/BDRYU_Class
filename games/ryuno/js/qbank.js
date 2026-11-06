/* ──────────────────────────────────────────────────────────────
   RYUNO · 문제 은행
   - 기본 문제: data/questions.json
   - 선생님이 더한 문제와 '끈' 문제는 칠판 기기의 브라우저에 저장
   - [내보내기]로 파일을 받아 두면 다른 컴퓨터에서 [가져오기]로 옮길 수 있음
   ────────────────────────────────────────────────────────────── */
import { esc } from "./ui.js?v=202611061330";

const KEY = "ryuno-qbank-v1";
const LV_NAME = { 1: "1단계 식별", 2: "2단계 분류", 3: "3단계 특징", 4: "4단계 음운 변동", 5: "5단계 종합" };
let BASE = [];
let MINE = { custom: [], off: [] };

function load() { try { MINE = Object.assign({ custom: [], off: [] }, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {} }
function store() { try { localStorage.setItem(KEY, JSON.stringify(MINE)); } catch (e) {} }

export async function initBank() {
  load();
  BASE = await fetch("data/questions.json").then(r => r.json()).then(j => j.questions || []).catch(() => []);
}
export const allQuestions = () => [...BASE.map(q => ({ ...q, base: true })), ...MINE.custom.map(q => ({ ...q, base: false }))];
export const activeQuestions = () => allQuestions().filter(q => !MINE.off.includes(q.id));
export { LV_NAME };

/* 보기 순서를 섞어서 내보냄 */
export function pickQuestion(levels, recent, rint = n => Math.floor(Math.random() * n)) {
  let pool = activeQuestions().filter(q => levels.includes(q.lv));
  if (!pool.length) pool = activeQuestions();
  if (!pool.length) return null;
  const fresh = pool.filter(q => !recent.includes(q.id));
  if (fresh.length) pool = fresh; else recent.length = 0;
  const q = pool[rint(pool.length)];
  recent.push(q.id); if (recent.length > 40) recent.shift();
  const order = q.opts.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = rint(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
  return { id: q.id, q: q.q, opts: order.map(i => q.opts[i]), a: order.indexOf(q.a), ex: q.ex || "" };
}

/* ================================================================
   문제 관리 화면 (칠판 위에 겹쳐 뜸)
   ================================================================ */
export function openManager(host, onClose) {
  let filter = 0, editing = null;
  const el = document.createElement("div");
  el.className = "qm";
  host.appendChild(el);
  const close = () => { el.remove(); onClose && onClose(); };

  function draw() {
    const all = allQuestions().filter(q => !filter || q.lv === filter);
    const on = activeQuestions().length;
    el.innerHTML = `<div class="qm-box">
      <div class="qm-hd"><b>문제 관리</b><span class="muted">켜진 문제 ${on}개 / 전체 ${allQuestions().length}개</span>
        <button class="pill sm" data-q="close">닫기</button></div>
      <div class="qm-tools">
        <div class="seg">${[0, 1, 2, 3, 4, 5].map(l => `<button data-lvf="${l}" class="${filter === l ? "on" : ""}">${l ? l + "단계" : "전체"}</button>`).join("")}</div>
        <button class="pill y sm" data-q="new">+ 새 문제</button>
        <button class="pill sm" data-q="export">내보내기</button>
        <label class="pill sm">가져오기<input type="file" accept=".json,application/json" data-q="import" hidden></label>
      </div>
      ${editing ? form(editing) : ""}
      <div class="qm-list">${all.map(row).join("") || `<p class="muted">문제가 없어요.</p>`}</div></div>`;
  }
  const row = q => {
    const off = MINE.off.includes(q.id);
    return `<div class="qm-row ${off ? "off" : ""}">
      <span class="qm-lv">${q.lv}</span>
      <div class="qm-t"><b>${esc(q.q)}</b><span>정답: ${esc(q.opts[q.a])} · 오답: ${esc(q.opts.filter((_, i) => i !== q.a).join(", "))}</span></div>
      <button class="pill sm" data-tog="${esc(q.id)}">${off ? "꺼짐" : "켜짐"}</button>
      ${q.base ? "" : `<button class="pill sm" data-edit="${esc(q.id)}">고치기</button><button class="pill sm r" data-del="${esc(q.id)}">지우기</button>`}
    </div>`;
  };
  const form = q => `<div class="qm-form">
    <div class="qm-f"><span>단계</span><div class="seg">${[1, 2, 3, 4, 5].map(l => `<button data-flv="${l}" class="${q.lv === l ? "on" : ""}">${LV_NAME[l]}</button>`).join("")}</div></div>
    <div class="qm-f"><span>문제</span><input class="inp" id="qf-q" maxlength="80" value="${esc(q.q)}" placeholder="예) ㄴ의 조음 위치는?"></div>
    <div class="qm-f"><span>정답</span><input class="inp" id="qf-a" maxlength="40" value="${esc(q.opts[q.a] || "")}" placeholder="예) 잇몸"></div>
    <div class="qm-f"><span>오답</span><div class="qm-wr">${[0, 1, 2].map(i => `<input class="inp" id="qf-w${i}" maxlength="40" value="${esc(q.opts.filter((_, k) => k !== q.a)[i] || "")}" placeholder="오답 ${i + 1}${i ? " (없어도 됨)" : ""}">`).join("")}</div></div>
    <div class="qm-f"><span>해설</span><input class="inp" id="qf-ex" maxlength="80" value="${esc(q.ex || "")}" placeholder="틀렸을 때 보여 줄 한 줄 (없어도 됨)"></div>
    <div class="row"><button class="pill y" data-q="save">저장</button><button class="pill" data-q="cancel">취소</button><span id="qf-m" class="muted"></span></div></div>`;

  el.addEventListener("click", e => {
    const t = e.target.closest("button,[data-q]"); if (!t) return;
    const d = t.dataset;
    if (d.q === "close") return close();
    if (d.lvf != null) { filter = +d.lvf; return draw(); }
    if (d.q === "new") { editing = { id: null, lv: filter || 2, q: "", opts: [], a: 0, ex: "" }; return draw(); }
    if (d.flv) { editing = readForm(); editing.lv = +d.flv; return draw(); }
    if (d.q === "cancel") { editing = null; return draw(); }
    if (d.q === "save") {
      const f = readForm();
      const wrong = [0, 1, 2].map(i => el.querySelector("#qf-w" + i).value.trim()).filter(Boolean);
      const right = el.querySelector("#qf-a").value.trim();
      const m = el.querySelector("#qf-m");
      if (!f.q || !right || !wrong.length) { m.textContent = "문제, 정답, 오답 하나 이상을 적어 주세요."; return; }
      if (wrong.includes(right) || new Set(wrong).size !== wrong.length) { m.textContent = "보기가 서로 겹치지 않게 적어 주세요."; return; }
      const q = { id: f.id || "T-" + Date.now().toString(36), lv: f.lv, tag: "선생님 문제", q: f.q, opts: [right, ...wrong], a: 0, ex: f.ex };
      const at = MINE.custom.findIndex(x => x.id === q.id);
      if (at >= 0) MINE.custom[at] = q; else MINE.custom.push(q);
      store(); editing = null; return draw();
    }
    if (d.tog) { const i = MINE.off.indexOf(d.tog); if (i >= 0) MINE.off.splice(i, 1); else MINE.off.push(d.tog); store(); return draw(); }
    if (d.edit) { const q = MINE.custom.find(x => x.id === d.edit); if (q) editing = JSON.parse(JSON.stringify(q)); return draw(); }
    if (d.del) { if (!confirm("이 문제를 지울까요?")) return; MINE.custom = MINE.custom.filter(x => x.id !== d.del); store(); return draw(); }
    if (d.q === "export") {
      const blob = new Blob([JSON.stringify({ about: "류노 선생님 문제", ...MINE }, null, 1)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ryuno-문제.json"; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
  });
  el.addEventListener("change", async e => {
    if (e.target.dataset.q !== "import") return;
    const f = e.target.files[0]; if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      const list = (j.custom || j.questions || []).filter(q => q && q.q && Array.isArray(q.opts) && q.opts.length >= 2 && q.opts[q.a] != null);
      let added = 0;
      for (const q of list) {
        const id = q.id && !BASE.some(b => b.id === q.id) ? q.id : "T-" + Date.now().toString(36) + added;
        const at = MINE.custom.findIndex(x => x.id === id);
        const item = { id, lv: Math.min(5, Math.max(1, +q.lv || 2)), tag: q.tag || "선생님 문제", q: String(q.q).slice(0, 80), opts: q.opts.map(String), a: +q.a || 0, ex: String(q.ex || "") };
        if (at >= 0) MINE.custom[at] = item; else MINE.custom.push(item);
        added++;
      }
      if (Array.isArray(j.off)) MINE.off = [...new Set([...MINE.off, ...j.off])];
      store(); alert(`문제 ${added}개를 가져왔어요.`); draw();
    } catch (err) { alert("파일을 읽지 못했어요. 류노에서 내보낸 파일인지 확인해 주세요."); }
  });
  function readForm() {
    const v = id => (el.querySelector(id) || {}).value || "";
    const right = v("#qf-a").trim();
    const wrong = [0, 1, 2].map(i => v("#qf-w" + i).trim());
    return { id: editing.id, lv: editing.lv, q: v("#qf-q").trim(), opts: [right, ...wrong], a: 0, ex: v("#qf-ex").trim() };
  }
  draw();
}
