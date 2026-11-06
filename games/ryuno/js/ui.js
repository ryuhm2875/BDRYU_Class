/* ──────────────────────────────────────────────────────────────
   RYUNO · 칠판과 학생 화면이 함께 쓰는 그림·글
   ────────────────────────────────────────────────────────────── */
import { DECK, CONS, COLOR_INFO, ACTION_NAME } from "./cards.js";

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const 이가 = w => /[가-힣]$/.test(w) && (w.charCodeAt(w.length - 1) - 0xAC00) % 28 ? "이" : "가";
export const 을를 = w => /[가-힣]$/.test(w) && (w.charCodeAt(w.length - 1) - 0xAC00) % 28 ? "을" : "를";

/* ---------- 카드 한 장 ----------
   크기는 감싸는 곳의 --cw(카드 너비)로 정합니다. 글자는 모두 그 비율로 커짐 */
export function cardHTML(i, o = {}) {
  const c = DECK[i];
  const cls = ["card"];
  if (c.k === "wild" || c.k === "w4") cls.push("blk"); else cls.push(c.c);
  if (o.cls) cls.push(o.cls);
  const attr = o.attr || "";
  let mid, corner, badge;
  if (c.k === "n") {
    const x = CONS[c.j];
    mid = c.j; corner = c.j;
    badge = `${x.p} · ${x.s || x.sub || "세기 없음"}`;
  } else if (c.k === "wild") {
    mid = c.j; corner = c.j; badge = "단모음 와일드";
  } else if (c.k === "w4") {
    mid = "+4"; corner = "+4"; badge = "+4 와일드";
  } else {
    mid = { skip: "⊘", rev: "⇄", d2: "+2" }[c.k]; corner = mid; badge = ACTION_NAME[c.k];
  }
  const sym = c.k !== "n" && c.k !== "wild" ? " sym" : "";
  return `<div class="${cls.join(" ")}" ${attr}><b class="ck">${corner}</b><div class="cm"><span class="${sym}">${mid}</span></div><b class="ck r">${corner}</b><i class="cb">${badge}</i></div>`;
}
export const backHTML = (o = {}) => `<div class="card back ${o.cls || ""}"><div class="cm"><span>RYUNO</span></div></div>`;

export const colorName = c => c ? `${COLOR_INFO[c].name} · ${COLOR_INFO[c].manner}` : "";

/* ---------- 사건 → 알림 글 ----------
   돌려주는 값 { big, small, tone } 또는 null(알릴 것 없음) */
export function evText(e, nm) {
  const N = p => nm(p) || "누군가";
  switch (e.t) {
    case "play":
      if (e.why === "place") return { big: `${e.via}소리끼리!`, small: `${N(e.pid)} · ${DECK[e.card].j}`, tone: "link" };
      if (e.why === "strength") return { big: `${e.via}소리끼리!`, small: `${N(e.pid)} · ${DECK[e.card].j}`, tone: "link" };
      if (e.why === "same") return { big: "같은 글자!", small: N(e.pid), tone: "link" };
      if (e.why === "wild" && DECK[e.card].k === "wild") return { big: "와일드!", small: `${N(e.pid)} → ${colorName(e.color)}`, tone: "wild" };
      return null;
    case "skip": return { big: "건너뛰기!", small: `${N(e.pid)} 차례를 건너뜀`, tone: "act" };
    case "rev": return e.two ? { big: "방향 반대!", small: `둘이라 ${N(e.pid)} 차례를 건너뜀`, tone: "act" } : { big: "방향 반대!", small: e.dir > 0 ? "시계 방향" : "반시계 방향", tone: "act" };
    case "d2": return { big: "+2!", small: `${N(e.pid)} +${e.got}장, 차례 쉼`, tone: "hit" };
    case "w4": return e.quiz ? { big: "+4!", small: `${N(e.pid)} 방어 문제 도전!`, tone: "hit" } : { big: "+4!", small: `${N(e.pid)} +${e.got}장`, tone: "hit" };
    case "quizres": return e.ok ? { big: "방어 성공!", small: `${N(e.pid)} 2장만 받음`, tone: "good" } : { big: "방어 실패…", small: `${N(e.pid)} 4장 · 정답: ${e.opts ? e.opts[e.a] : ""}`, tone: "hit" };
    case "combo": return { big: `${e.name} 콤보!`, small: `${e.show} · ${e.ex[0]} · ${N(e.pid)} +1장`, tone: "combo" };
    case "uno": return { big: "류노!", small: `${N(e.pid)} 한 장 남음`, tone: "uno" };
    case "catch": return { big: "잡았다!", small: `${N(e.by)}${이가(N(e.by))} ${N(e.pid)}${을를(N(e.pid))} 잡음 · +${e.got}장`, tone: "hit" };
    case "win": return { big: `${N(e.pid)} 승리!`, small: e.left ? "혼자 남았어요" : "카드를 모두 냈어요", tone: "win" };
    case "timeout": return { big: null, small: `${N(e.pid)} 시간 초과${e.drew ? " · 1장" : ""}`, tone: "dim" };
    case "recycle": return { big: null, small: "버린 카드를 다시 섞어 더미를 채웠어요", tone: "dim" };
    case "leave": return { big: null, small: `${N(e.pid)} 판에서 나감`, tone: "dim" };
  }
  return null;
}

/* ---------- 알림 줄 세우기: 한꺼번에 여러 개 와도 차례로 보여 줌 ---------- */
export function toaster(el, ms = 1300) {
  const q = []; let busy = false;
  const run = () => {
    if (!q.length) { busy = false; return; }
    busy = true;
    const t = q.shift();
    el.innerHTML = `<div class="toast ${t.tone || ""}">${t.big ? `<b>${esc(t.big)}</b>` : ""}${t.small ? `<span>${esc(t.small)}</span>` : ""}</div>`;
    el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
    setTimeout(run, t.big ? ms : 900);
  };
  return t => { if (!t) return; q.push(t); if (q.length > 2) q.splice(0, q.length - 2); if (!busy) run(); };
}

/* 남은 시간(초) */
export const secLeft = (dl, now) => Math.max(0, Math.ceil((dl - now) / 1000));
