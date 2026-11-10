/* ──────────────────────────────────────────────────────────────
   RYUNO · 칠판과 학생 화면이 함께 쓰는 그림·글
   ────────────────────────────────────────────────────────────── */
import { DECK, CONS, COLOR_INFO, ACTION_NAME } from "./cards.js?v=202611101448";

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
      if (e.cnt > 1) return { big: `${e.cnt}장 한꺼번에!`, small: `${N(e.pid)} · 같은 카드 ${e.cnt}장`, tone: "link" };
      if (e.why === "place") return { big: `${e.via}소리끼리!`, small: `${N(e.pid)} · ${DECK[e.card].j}`, tone: "link" };
      if (e.why === "strength") return { big: `${e.via}소리끼리!`, small: `${N(e.pid)} · ${DECK[e.card].j}`, tone: "link" };
      if (e.why === "same") return { big: "같은 글자!", small: N(e.pid), tone: "link" };
      if (e.why === "wild" && DECK[e.card].k === "wild") return { big: "와일드!", small: `${N(e.pid)} → ${colorName(e.color)}`, tone: "wild" };
      return null;
    case "skip": return { big: (e.pids || []).length > 1 ? `${e.pids.length}명 건너뛰기!` : "건너뛰기!", small: `${(e.pids || [e.pid]).map(N).join(" · ")} 차례를 건너뜀`, tone: "act" };
    case "rev": return e.two ? { big: "방향 반대!", small: `둘이라 ${N(e.pid)} 차례를 건너뜀`, tone: "act" } : { big: "방향 반대!", small: e.cnt > 1 && e.cnt % 2 === 0 ? `${e.cnt}장이라 방향 그대로` : e.dir > 0 ? "시계 방향" : "반시계 방향", tone: "act" };
    case "atk": return { big: `+${e.n} 공격!`, small: `${N(e.pid)} 받아칠까? 받을까?`, tone: "hit" };
    case "d2": return { big: `+${e.got}!`, small: `${N(e.pid)} +${e.got}장, 차례 쉼${e.stacked ? " (쌓인 공격)" : ""}`, tone: "hit" };
    case "w4": return e.quiz ? { big: `+${e.n || 4}!`, small: `${N(e.pid)} 방어 문제 도전!`, tone: "hit" } : { big: `+${e.got}!`, small: `${N(e.pid)} +${e.got}장`, tone: "hit" };
    case "quizres": return e.ok ? { big: "방어 성공!", small: `${N(e.pid)} ${e.got}장만 받음`, tone: "good" } : { big: "방어 실패…", small: `${N(e.pid)} ${e.got}장 · 정답: ${e.opts ? e.opts[e.a] : ""}`, tone: "hit" };
    case "combo": return { big: `${e.name} 콤보!`, small: `${e.show} · ${e.ex[0]} · ${N(e.pid)} +1장`, tone: "combo" };
    case "uno": return { big: "류노!", small: `${N(e.pid)} 한 장 남음`, tone: "uno" };
    case "catch": return { big: "잡았다!", small: `${N(e.by)}${이가(N(e.by))} ${N(e.pid)}${을를(N(e.pid))} 잡음 · +${e.got}장`, tone: "hit" };
    case "win": return { big: `${N(e.pid)} 승리!`, small: e.left ? "혼자 남았어요" : "카드를 모두 냈어요", tone: "win" };
    case "timeout": return { big: null, small: `${N(e.pid)} 시간 초과${e.drew ? " · 1장" : ""}`, tone: "dim" };
    case "recycle": return { big: null, small: "버린 카드를 다시 섞어 더미를 채웠어요", tone: "dim" };
    case "leave": return { big: null, small: `${N(e.pid)} 판에서 나감`, tone: "dim" };
    case "gift": return { big: "선생님 선물!", small: `${N(e.pid)} +${e.got}장`, tone: "hit" };
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

/* ---------- 자음 체계표 (카드 색 그대로) ----------
   가로 = 조음 위치, 세로 = 조음 방법, 한 칸 안의 순서 = 예사 · 된 · 거센 */
const PLACES = ["입술", "잇몸", "센입천장", "여린입천장", "목청"];
const ROWS = [["파열음", "red"], ["마찰음", "blue"], ["파찰음", "yel"], ["비음", "grn"], ["유음", "grn"]];
const ORDER_S = { "예사": 0, "된": 1, "거센": 2 };
export function chartHTML() {
  const cell = (manner, place) => Object.entries(CONS)
    .filter(([, x]) => x.p === place && (x.sub ? x.sub === manner : COLOR_INFO[x.c].manner === manner))
    .sort((a, b) => (ORDER_S[a[1].s] ?? 0) - (ORDER_S[b[1].s] ?? 0))
    .map(([j]) => j).join("");
  return `<table class="chart"><tr><th></th>${PLACES.map(p => `<th>${p}</th>`).join("")}</tr>
    ${ROWS.map(([m, c]) => `<tr class="${c}"><th>${m}${m === "비음" || m === "유음" ? "<small>울림</small>" : ""}</th>${PLACES.map(p => { const v = cell(m, p); return `<td class="${v ? "on" : ""}">${v}</td>`; }).join("")}</tr>`).join("")}
  </table><div class="chart-k">색 = 조음 방법 · 가로줄 = 조음 위치 · 한 칸 안 순서 = 예사 · 된 · 거센</div>`;
}

/* ---------- 학생용 규칙 ---------- */
export function rulesHTML() {
  return `<div class="rules">
    <h3>이기는 법</h3><p>손에 든 카드를 가장 먼저 다 내면 이겨요.</p>
    <h3>낼 수 있는 카드</h3>
    <p>바닥 카드와 아래 가운데 <b>하나만</b> 같으면 돼요.</p>
    <ul><li><b>색</b> (조음 방법) — 빨강 파열음 · 파랑 마찰음 · 노랑 파찰음 · 초록 울림소리</li>
      <li><b>조음 위치</b> — ㄷ 위에 ㄴ (둘 다 잇몸소리)</li>
      <li><b>소리 세기</b> — ㄷ 위에 ㅈ (둘 다 예사소리)</li>
      <li>같은 글자, 같은 특수 카드</li></ul>
    ${chartHTML()}
    <h3>특수 카드</h3>
    <ul><li>⊘ 건너뛰기 · ⇄ 방향 반대 · +2 다음 사람 2장</li>
      <li>단모음 와일드 — 아무 데나 내고 색을 골라요</li>
      <li>+4 — 다음 사람은 <b>방어 문제</b>! 맞히면 2장, 틀리면 4장</li></ul>
    <h3>여러 장 한꺼번에</h3><p>색과 글자(기호)가 <b>똑같은</b> 카드는 함께 낼 수 있어요. 건너뛰기 2장이면 두 명을 건너뛰고, 방향 반대 2장이면 방향은 그대로, +2 2장이면 4장!</p>
    <h3>받아치기</h3><p>+2를 맞으면 +2나 +4로, +4를 맞으면 +4로 다음 사람에게 넘길 수 있어요. 장수는 쌓여요. 받아치지 못한 사람이 모두 받고, 쌓인 것에 +4가 있으면 방어 문제를 풀어요(맞히면 2장 덜).</p>
    <h3>류노!</h3><p>카드를 내서 1장이 남으면 그때 [류노!]를 눌러요. 미리 누를 수는 없어요. 내가 누르기 전에 친구가 [잡았다!]를 먼저 누르면 2장을 받아요.</p>
    <h3>음운 변동 콤보</h3><p>이어서 내면 다음 사람이 1장! 비음화 ㄱ→ㅇ · ㄷ→ㄴ · ㅂ→ㅁ, 유음화 ㄴ→ㄹ · ㄹ→ㄴ</p>
    <h3>시간</h3><p>차례마다 20초. 지나면 저절로 1장 뽑고 넘어가요.</p>
    <h3>별 ⭐</h3><p>승리 3개 · 방어 성공 1개 · 선생님 깜짝 문제 정답 1개</p></div>`;
}

/* 남은 시간(초) */
export const secLeft = (dl, now) => Math.max(0, Math.ceil((dl - now) / 1000));

/* ---------- 카드 나눠 주기 시각 (칠판과 학생 화면이 같은 박자로 맞춤) ----------
   r번째 바퀴, s번째 자리 카드 → k = r*N + s 번째로 더미를 떠남 */
export const DEAL = { ms: 3000, fly: 380, hand: 7 };
export const dealLeave = (k, N) => k * (DEAL.ms - DEAL.fly - 500) / (DEAL.hand * N);
export function dealCount(s, N, t) {
  let c = 0;
  for (let r = 0; r < DEAL.hand; r++) if (dealLeave(r * N + s, N) + DEAL.fly <= t) c++;
  return c;
}

/* ---------- 색종이: 다시 그려도 같은 모양으로 이어지게 (elapsed = 시작 뒤 지난 ms) ---------- */
const CF = ["#E5322D", "#1F6FD1", "#F2B705", "#22A447", "#FEE500", "#ffffff"];
export function confettiHTML(n, elapsed = 0, seed = 1) {
  let x = (seed * 7919) % 233280;
  const R = () => (x = (x * 9301 + 49297) % 233280) / 233280;
  let h = "";
  for (let i = 0; i < n; i++) {
    const left = R() * 100, dx = (R() - .5) * 260, rot = R() * 900 - 450, dur = 2300 + R() * 1700,
      delay = R() * 900 - elapsed, w = 8 + R() * 9, c = CF[Math.floor(R() * CF.length)], round = R() < .3;
    h += `<i style="left:${left.toFixed(1)}%;--dx:${dx | 0}px;--rot:${rot | 0}deg;width:${w | 0}px;height:${(round ? w : w * 1.6) | 0}px;background:${c};${round ? "border-radius:50%;" : ""}animation-duration:${dur | 0}ms;animation-delay:${delay | 0}ms"></i>`;
  }
  return `<div class="confetti" aria-hidden="true">${h}</div>`;
}

/* ---------- 전체 화면 (아이폰 사파리는 막혀 있음 → '홈 화면에 추가'로 대신) ---------- */
export const fsOK = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
export const fsOn = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
export function fsToggle(on = !fsOn()) {
  const d = document.documentElement;
  try {
    const r = on ? (d.requestFullscreen || d.webkitRequestFullscreen).call(d)
                 : (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    if (r && r.catch) r.catch(() => {});
  } catch (e) {}
}
