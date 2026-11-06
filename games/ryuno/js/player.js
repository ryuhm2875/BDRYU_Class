/* ──────────────────────────────────────────────────────────────
   RYUNO · 학생 화면
   - 공개 정보(pub)와 내 손패(hands/나)만 구독합니다.
   - 하는 일은 모두 신호함(inbox)에 '요청'으로 보내고, 판정은 칠판이 합니다.
   ────────────────────────────────────────────────────────────── */
import { Net, P } from "./net.js?v=202611061325";
import { DECK, CONS, COLORS, COLOR_INFO, describe } from "./cards.js?v=202611061325";
import { matchReason, RULES } from "./engine.js?v=202611061325";
import { esc, cardHTML, backHTML, colorName, evText, toaster, secLeft, rulesHTML } from "./ui.js?v=202611061325";
import { Sound, fxOf } from "./sound.js?v=202611061325";

const ORDER = Object.keys(CONS);
const sortKey = i => {
  const c = DECK[i];
  if (c.k === "w4") return 900;
  if (c.k === "wild") return 800 + i;
  const ci = COLORS.indexOf(c.c) * 100;
  return ci + (c.k === "n" ? ORDER.indexOf(c.j) : 40 + ["skip", "rev", "d2"].indexOf(c.k));
};

export function Player(code, name, ctx) {
  const me = Net.uid;
  let pub = null, hand = null, seats = {}, sel = null, pending = 0, lastN = 0, lastRound = -1, answered = null;

  document.body.classList.add("player");
  const $app = document.getElementById("app");
  $app.innerHTML = `<div class="pl">
    <header class="ptop"><span class="logo">RYUNO</span><span class="pname" id="pname">${esc(name)}</span><span class="ptbl" id="tbl"></span>
      <span class="pstar" id="star"></span>
      <span class="conn"><button class="hbtn" id="rules" aria-label="규칙">?</button><button class="hbtn" id="snd" aria-label="소리">${Sound.sfxOn ? "🔊" : "🔈"}</button><span class="dot" id="cdot"></span></span></header>
    <div class="status" id="status"></div>
    <div class="opps" id="opps"></div>
    <div class="mid"><button class="deckbtn" id="deck"></button><div class="topc" id="top"></div>
      <div class="minfo"><div id="cname"></div><div class="dirp" id="dir"></div></div></div>
    <div class="acts" id="acts"></div>
    <div class="desc" id="desc"></div>
    <div class="handwrap"><div class="hand" id="hand"></div></div>
    <div class="ptoast" id="toast"></div>
    <div class="modal" id="modal"></div>
    <div class="modal" id="pop"></div>
    <div class="pause" id="pause">⏸ 잠깐 멈춤<span>선생님이 다시 시작하면 이어서 해요</span></div>
  </div>`;
  const g = id => document.getElementById(id);
  const toast = toaster(g("toast"), 1400);
  Sound.unlockOnTouch(false);
  g("snd").onclick = e => { e.stopPropagation(); g("snd").textContent = Sound.toggleSfx() ? "🔊" : "🔈"; };
  g("rules").onclick = e => {
    e.stopPropagation();
    const m = g("modal"); m.dataset.kind = "rules"; m.className = "modal on";
    m.innerHTML = `<div class="mbox rulesbox">${rulesHTML()}<button class="pill y" data-close="1">알겠어요</button></div>`;
  };
  Net.onConn(ok => { const d = g("cdot"); if (d) d.classList.toggle("off", !ok); });

  Net.on(P.pub(code), v => { pub = v; draw(); overlays(); });
  Net.on(P.hand(code, me), v => { hand = v; draw(); });
  Net.on(P.seats(code), v => {
    seats = v || {};
    const mine = seats[me]; if (mine && mine.name && g("pname")) g("pname").textContent = mine.name;   // 선생님이 이름을 바꾸면
    draw();
  });
  setInterval(timers, 250);

  const nm = p => p === me ? "나" : ((seats[p] && seats[p].name) || "?");
  const T = () => {
    if (!pub || !pub.tables || !hand || hand.round !== pub.round) return null;
    return pub.tables[hand.tid] || null;
  };
  const send = msg => {
    pending = Date.now();
    return Net.push(P.mail(code, me), Object.assign({ at: Net.TS }, msg)).catch(() => { pending = 0; });
  };
  const busy = () => Date.now() - pending < 2500;

  /* ---------- 그리기 ---------- */
  function draw() {
    if (!g("status")) return;                         // 방에서 나간 뒤
    const V = T();
    g("tbl").textContent = V ? `${hand.tid}번 테이블` : "";
    if (!pub || pub.phase === "lobby" || !V) {
      const msg = !pub || pub.phase === "lobby" ? "선생님이 게임을 시작하면 카드가 나와요."
        : pub.phase === "play" ? "지금 판이 진행 중이에요. 다음 판부터 함께해요." : "판이 끝났어요. 다음 판을 기다려요.";
      g("status").className = "status wait";
      g("status").innerHTML = msg;
      ["opps", "desc"].forEach(k => g(k).innerHTML = "");
      g("acts").innerHTML = `<button class="pill" data-rules="1">📖 규칙 보기</button>`;
      g("top").innerHTML = ""; g("deck").innerHTML = ""; g("cname").textContent = ""; g("dir").textContent = "";
      g("hand").innerHTML = "";
      if (g("modal").dataset.kind !== "rules") g("modal").className = "modal";
      return;
    }

    let dealt = false;
    if (pub.round !== lastRound) { lastRound = pub.round; lastN = 0; sel = null; answered = null; dealt = true; }
    if (V.seq !== draw.seq) { draw.seq = V.seq; pending = 0; }

    /* 새 사건 알림 */
    let fx = null;
    for (const e of V.ev || []) if (e.n > lastN) {
      const t = evText(e, nm); if (t) toast(t);
      const f = fxOf(e); if (f && lastN && (e.pid === me || e.by === me || ["uno", "catch", "combo", "win", "skip", "rev"].includes(e.t))) fx = f;
      if (navigator.vibrate && (e.pid === me) && ["d2", "w4", "catch", "skip"].includes(e.t)) navigator.vibrate(120);
    }
    lastN = Math.max(lastN, ...(V.ev || []).map(e => e.n), 0);
    const turnNow = V.turn === me && V.phase === "play" ? V.seq : null;
    if (turnNow != null && draw.turnSeq == null && !fx) fx = "turn";
    draw.turnSeq = turnNow == null ? null : (draw.turnSeq ?? turnNow);
    if (fx) Sound.fx(fx);
    if (draw.star !== (pub.stars || {})[me]) { draw.star = (pub.stars || {})[me]; g("star").textContent = draw.star ? `⭐${draw.star}` : ""; }

    const mine = V.turn === me && V.phase === "play";
    const cards = (hand.cards || []).slice().sort((a, b) => sortKey(a) - sortKey(b));
    const can = new Set(mine ? cards.filter(i => (hand.drawn == null || i === hand.drawn) && matchReason(i, V.top, V.color)) : []);
    if (sel != null && !cards.includes(sel)) sel = null;

    /* 상태 띠 */
    const st = g("status");
    if (V.phase === "end") { st.className = "status " + (V.winner === me ? "win" : "end"); st.innerHTML = V.winner === me ? "🏆 내가 이겼어요!" : `${esc(nm(V.winner))} 승리! 다음 판을 기다려요.`; }
    else if (V.quiz && V.quiz.target === me) { st.className = "status quiz"; st.innerHTML = `방어 문제! <b data-dl="${V.quiz.dl}"></b>`; }
    else if (V.quiz) { st.className = "status"; st.innerHTML = `${esc(nm(V.quiz.target))} 방어 문제 푸는 중…`; }
    else if (mine) { st.className = "status mine"; st.innerHTML = `${hand.drawn != null ? "뽑은 카드를 낼까요?" : "내 차례!"} <b data-dl="${V.dl}"></b>`; }
    else { st.className = "status"; st.innerHTML = `${esc(nm(V.turn))} 차례 <b data-dl="${V.dl}"></b>`; }

    /* 다른 사람들 (도는 순서대로, 내 다음 사람부터) */
    const at = V.p.indexOf(me), order = V.p.map((_, k) => V.p[(at + V.dir * (k + 1) + V.p.length * 7) % V.p.length]).filter(p => p !== me);
    g("opps").innerHTML = order.map(p => {
      const tag = V.uno && V.uno.pid === p ? (V.uno.safe ? `<i class="tag uno">류노!</i>` : `<i class="tag warn">1장!</i>`) : "";
      return `<div class="opp ${V.turn === p ? "now" : ""} ${seats[p] && seats[p].on ? "" : "gone"}"><span>${esc(nm(p))}</span><b>${V.n[p]}</b>${tag}</div>`;
    }).join("");

    g("deck").innerHTML = `${backHTML()}<b>${V.deck}</b>`;
    g("deck").disabled = !(mine && hand.drawn == null) || busy();
    g("top").style.setProperty("--glow", COLOR_INFO[V.color].hex);
    g("top").innerHTML = cardHTML(V.top);
    g("cname").innerHTML = `<span class="sw" style="background:${COLOR_INFO[V.color].hex}"></span>${colorName(V.color)}`;
    g("dir").textContent = V.dir > 0 ? "↻ 시계 방향" : "↺ 반시계 방향";

    /* 단추들 */
    const btns = [];
    if (mine && hand.drawn == null) btns.push(`<button class="pill" data-a="draw" ${busy() ? "disabled" : ""}>한 장 뽑기</button>`);
    if (mine && hand.drawn != null) btns.push(`<button class="pill" data-a="pass" ${busy() ? "disabled" : ""}>넘기기</button>`);
    if (mine && sel != null && can.has(sel)) btns.push(`<button class="pill y" data-a="play">이 카드 내기</button>`);
    const n = cards.length;
    const unoOpen = V.uno && V.uno.pid === me && !V.uno.safe;
    const unoReady = mine && n === 2 && !(V.ready || []).includes(me);
    if (unoOpen || unoReady) btns.push(`<button class="pill uno ${unoOpen ? "hot" : ""}" data-a="uno">류노!</button>`);
    if (V.uno && !V.uno.safe && V.uno.pid !== me && V.phase !== "end") btns.push(`<button class="pill r hot" data-a="catch">잡았다! ${esc(nm(V.uno.pid))}</button>`);
    if ((V.ready || []).includes(me) && n === 2) btns.push(`<span class="ok">류노 준비 완료</span>`);
    g("acts").innerHTML = btns.join("");

    g("desc").innerHTML = sel != null ? esc(describe(DECK[sel])) : (mine ? (can.size ? "낼 수 있는 카드가 위로 올라와 있어요." : "낼 카드가 없어요. 한 장 뽑으세요.") : "");

    /* 손패 */
    g("hand").innerHTML = cards.map((i, k) => cardHTML(i, {
      cls: [mine ? (can.has(i) ? "can" : "no") : "", sel === i ? "sel" : "", hand.drawn === i ? "new" : ""].join(" "),
      attr: `data-i="${i}" style="--k:${k}"`
    })).join("");
    if (dealt) { draw.dealUntil = Date.now() + 1100; g("hand").classList.remove("deal"); void g("hand").offsetWidth; g("hand").classList.add("deal"); Sound.fx("draw"); }
    else if (Date.now() > (draw.dealUntil || 0)) g("hand").classList.remove("deal");
    fitHand();

    /* 방어 문제 */
    const m = g("modal");
    if (V.quiz && V.quiz.target === me && V.phase === "quiz") {
      if (m.dataset.q !== V.quiz.q + V.seq) {
        m.dataset.q = V.quiz.q + V.seq; answered = null;
        m.className = "modal on";
        m.innerHTML = `<div class="mbox quiz"><div class="mh">🛡️ 방어 문제 · 맞히면 2장만! <b data-dl="${V.quiz.dl}"></b></div>
          <div class="mq">${esc(V.quiz.q)}</div>
          <div class="mo">${V.quiz.opts.map((o, k) => `<button data-ans="${k}">${esc(o)}</button>`).join("")}</div></div>`;
      }
    } else if (m.dataset.kind === "rules") { /* 규칙 창은 그대로 */ }
    else if (m.dataset.kind !== "color" || !mine) { m.className = "modal"; m.dataset.q = ""; m.dataset.kind = ""; }
    timers();
  }

  /* ---------- 멈춤 · 깜짝 문제 (판 밖에 있어도 보임) ---------- */
  let popId = null, popPick = null;
  function overlays() {
    if (!g("pause")) return;
    g("pause").classList.toggle("on", !!(pub && pub.paused && !pub.pop && pub.phase === "play"));
    const pm = g("pop"), p = pub && pub.pop;
    if (!p) { pm.className = "modal"; popId = null; return; }
    if (popId !== p.id + p.dl) { popId = p.id + p.dl; popPick = null; Sound.fx("pop"); }
    pm.className = "modal on";
    if (!p.done) {
      pm.innerHTML = `<div class="mbox quiz"><div class="mh">⚡ 선생님 깜짝 문제 <b data-dl="${p.dl}"></b></div>
        <div class="mq">${esc(p.q)}</div>
        <div class="mo">${p.opts.map((o, k) => `<button data-pop="${k}" class="${popPick === k ? "picked" : ""}" ${popPick != null ? "disabled" : ""}>${esc(o)}</button>`).join("")}</div>
        <div class="muted" style="margin-top:10px">${popPick != null ? "골랐어요! 정답을 기다려요." : "맞히면 ⭐+1"}</div></div>`;
    } else {
      const ok = (p.right || []).includes(me);
      if (draw.popDone !== popId) { draw.popDone = popId; Sound.fx(ok ? "good" : "bad"); }
      pm.innerHTML = `<div class="mbox ${ok ? "good" : ""}"><div class="mh">${ok ? "⭕ 정답! ⭐+1" : popPick == null ? "시간이 끝났어요" : "❌ 아쉬워요"}</div>
        <div class="mq">${esc(p.q)}</div><div class="mo">${p.opts.map((o, k) => `<button class="${k === p.a ? "picked" : ""}" disabled>${esc(o)}</button>`).join("")}</div>
        ${p.ex ? `<div class="muted" style="margin-top:10px">${esc(p.ex)}</div>` : ""}</div>`;
    }
  }

  /* 손패가 화면보다 넓으면 카드를 겹쳐서 한눈에 보이게 (너무 많으면 그때는 옆으로 넘김) */
  function fitHand() {
    const h = g("hand"), first = h.firstElementChild;
    if (!first) return;
    const n = h.children.length, cw = first.offsetWidth, gap = 6;
    const W = h.parentElement.clientWidth - 28;
    const need = n * cw + (n - 1) * gap;
    const ov = need > W && n > 1 ? Math.min(cw * 0.62, (need - W) / (n - 1) + gap) : 0;
    h.style.setProperty("--ov", ov + "px");
  }
  addEventListener("resize", fitHand);

  function timers() {
    const now = Net.now();
    document.querySelectorAll("#app [data-dl]").forEach(el => {
      if (pub && pub.paused && !el.closest("#pop")) return;          // 멈춘 동안은 시간도 멈춤
      el.textContent = secLeft(+el.dataset.dl, now);
    });
  }

  /* ---------- 누르기 ---------- */
  const playSel = color => {
    const V = T(); if (!V || sel == null) return;
    const card = sel; sel = null;
    send({ t: "play", card, color: color || null, seq: V.seq });
    draw();
  };
  const askColor = () => {
    const m = g("modal");
    m.dataset.kind = "color"; m.className = "modal on";
    m.innerHTML = `<div class="mbox"><div class="mh">어떤 색으로 바꿀까요?</div>
      <div class="colors">${COLORS.map(c => `<button data-color="${c}" style="background:${COLOR_INFO[c].hex}">${COLOR_INFO[c].name}<small>${COLOR_INFO[c].manner}</small></button>`).join("")}</div>
      <button class="pill sm" data-color="">취소</button></div>`;
  };

  $app.addEventListener("click", e => {
    const V = T();
    const cardEl = e.target.closest(".hand .card");
    if (cardEl) {
      const i = +cardEl.dataset.i;
      const mine = V && V.turn === me && V.phase === "play";
      const ok = mine && (hand.drawn == null || i === hand.drawn) && matchReason(i, V.top, V.color);
      if (sel === i && ok && !busy()) {                // 두 번 누르면 냄
        if (DECK[i].c == null) return askColor();
        return playSel();
      }
      sel = i; draw(); return;
    }
    if (e.target.closest("[data-rules]")) return g("rules").click();
    if (e.target.closest("[data-close]")) { const m = g("modal"); m.className = "modal"; m.dataset.kind = ""; return draw(); }
    const pb = e.target.closest("[data-pop]");
    if (pb) { if (popPick != null) return; popPick = +pb.dataset.pop; send({ t: "pop", choice: popPick }); pending = 0; return overlays(); }
    const b = e.target.closest("[data-a],[data-ans],[data-color]");
    if (b && b.id !== "deck") {
      if (b.dataset.color != null) {
        const m = g("modal"); m.className = "modal"; m.dataset.kind = "";
        if (b.dataset.color) playSel(b.dataset.color); else draw();
        return;
      }
      if (b.dataset.ans != null) {
        if (answered != null) return;
        answered = +b.dataset.ans;
        b.classList.add("picked");
        send({ t: "answer", choice: answered });
        return;
      }
      const a = b.dataset.a;
      if (!V) return;
      if (a === "play") { if (DECK[sel] && DECK[sel].c == null) return askColor(); return playSel(); }
      if (a === "draw" || a === "pass") { send({ t: a, seq: V.seq }); return draw(); }
      if (a === "uno") { send({ t: "uno" }); return; }
      if (a === "catch") { send({ t: "catch" }); return; }
    }
    if (e.target.closest("#deck") && V && V.turn === me && hand.drawn == null && !busy()) { send({ t: "draw", seq: V.seq }); draw(); }
  });
}
