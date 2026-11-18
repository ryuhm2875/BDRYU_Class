/* ──────────────────────────────────────────────────────────────
   마지막 배는 6시 · 1인 게임 본체
   주인공 한 명이 움직이고, 찾은 친구들은 뒤를 따라옴.
   판정은 이 기기 안에서 (judge.js). 진행은 자동 저장.
   ────────────────────────────────────────────────────────────── */
import { NPCS, ROOMS, MAP, GAME_MS, IT, JACKETS, clockText, leftText, isOpen, roomAt, itPos } from "./data.js?v=202611181804";
import { newTeam, handle, timeUp } from "./judge.js?v=202611181804";
import { CLUES, ZOOM2 } from "./answers.js?v=202611181804";
import { INTRO, MEMO, FOUND, CONFESS, CHATTER, NUDGE } from "./story.js?v=202611181804";
import { talk, talking } from "./dialog.js?v=202611181804";
import { esc, modal, closeModal, showMemo, phoneApps, showNotebook, showClue, orderPuzzle, codePad, wordPad, cropPuzzle, showDiary } from "./puzzles.js?v=202611181804";
import { startAudio, itStep, sfx, setDusk } from "./sound.js?v=202611181804";

const SAVE = "escape-solo-v1";
const SPEED = 2.5, NEAR = 1.5, FLASH_DRAIN = 10 / 60, FREEZE_MS = 20000;
const SCENE_NAMES = { a: "정문에 도착", b: "새어 나오는 연기", c: "휴대폰을 듦", d: "그을린 창문 앞" };
const QS = new URLSearchParams(location.search);

export const loadSave = () => { try { return JSON.parse(localStorage.getItem(SAVE) || "null"); } catch (e) { return null; } };
export const clearSave = () => { try { localStorage.removeItem(SAVE); } catch (e) {} };
export function newGame(name, jacket, fear) {
  return Object.assign(newTeam([]), {
    v: 1, name, jacket, fear, el: 0, party: [], found: {}, heart: {}, frags: [], seen: {}, confessed: {},
    x: MAP.spawn.x, z: MAP.spawn.z, a: 0, fbat: 100, flash: true, picked: [], introDone: false, hints: 0, startedAt: Date.now()
  });
}

export function Game(G, { onExit }) {
  const $app = document.getElementById("app");
  document.body.classList.add("player");
  const cfg = { fear: G.fear };
  if (QS.has("debug")) window.__G = G;
  const save = () => { try { localStorage.setItem(SAVE, JSON.stringify(G)); } catch (e) {} };
  const saver = setInterval(save, 2000);

  $app.innerHTML = `<div class="game">
    <canvas id="cv"></canvas>
    <div class="hud">
      <div class="tl"><div class="clock" id="clk">5:30</div><div class="left" id="lft"></div><div class="board" id="ev"></div></div>
      <div class="partyb" id="party"></div>
      <div class="tr"><button class="chip phone" id="phone">📱 <b id="bat">12</b>%</button></div>
      <div class="toasts" id="toasts"></div>
      <div class="bubbles" id="bub"></div>
      <div class="edge" id="edge">👣</div>
      <div class="joy" id="joy"><i id="knob"></i></div>
      <div class="acts">
        <button class="act" id="note">📓 수첩</button>
        <button class="act" id="hide" hidden>🚪 숨기</button>
        <button class="act y" id="use" hidden>살펴보기</button>
        <button class="act" id="fl">🔦 <span class="batbar"><i id="flb"></i></span></button>
      </div>
    </div>
    <div class="blackout" id="bo">정전</div>
    <div class="fade" id="fade"></div>
  </div>`;
  const $ = id => document.getElementById(id);

  let W = null, raf = 0, last = performance.now();
  const st = { keys: new Set(), joy: { x: 0, z: 0 }, frozenUntil: 0, immuneUntil: 0, staticUntil: 0, stepT: 0, trail: [], npc: {}, bubbles: [], chatT: 8, ended: false, busy: false, hidden: false, nearRattle: 0 };
  for (const id of G.party) st.npc[id] = { x: G.x, z: G.z, a: G.a, sp: 0 };

  import("./world.js?v=202611181804").then(({ createWorld }) => {
    try { W = createWorld($("cv"), { pixel: innerWidth > 1400 ? 3 : 2.5 }); }
    catch (e) { console.error(e); toast("3D 화면을 열지 못했어요. 크롬이나 사파리 최신 버전으로 열어 주세요.", "bad"); return; }
    W.setItemGone("phone", true);
    bind(); hud(true);
    raf = requestAnimationFrame(loop);
    startAudio();
    if (!G.introDone) runIntro();
  }).catch(e => { console.error(e); toast("게임 파일을 받지 못했어요. 새로 고침해 주세요.", "bad"); });

  async function runIntro() {
    st.busy = true;
    await talk(INTRO, { name: G.name, onLine: L => { if (L.sfx === "slam") { sfx.slam(); shake(); } } });
    G.introDone = true; st.busy = false; save();
    setTimeout(() => toast(NUDGE.start), 800);
  }
  function shake() { const g = document.querySelector(".game"); g.classList.remove("shake"); void g.offsetWidth; g.classList.add("shake"); }

  /* ---------- 입력 ---------- */
  function bind() {
    const joy = $("joy"), knob = $("knob"); let id = null, ox = 0, oy = 0;
    joy.addEventListener("pointerdown", e => { id = e.pointerId; ox = e.clientX; oy = e.clientY; try { joy.setPointerCapture(id); } catch (er) {} });
    joy.addEventListener("pointermove", e => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - ox, dy = e.clientY - oy; const d = Math.hypot(dx, dy), R = 55;
      if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`; st.joy = { x: dx / R, z: dy / R };
    });
    const up = e => { if (e.pointerId !== id) return; id = null; st.joy = { x: 0, z: 0 }; knob.style.transform = ""; };
    joy.addEventListener("pointerup", up); joy.addEventListener("pointercancel", up);
    onkeydown = e => { if (document.getElementById("modal") || talking()) return; st.keys.add(e.key.toLowerCase()); if (e.key === "e") useNear(); if (e.key.toLowerCase() === "f") toggleFlash(); };
    onkeyup = e => st.keys.delete(e.key.toLowerCase());
    $("fl").onclick = toggleFlash; $("use").onclick = useNear; $("hide").onclick = toggleHide;
    $("note").onclick = () => showNotebook(notebook(), G.frags);
    $("phone").onclick = phone;
    document.addEventListener("visibilitychange", () => { last = performance.now(); save(); });
  }
  function toggleFlash() {
    if (st.hidden) return toast("숨어 있을 땐 손전등을 켤 수 없어요.");
    if (!G.flash && G.fbat <= 0) return toast("손전등 배터리가 없어요. 건전지를 찾아보세요.", "bad");
    G.flash = !G.flash;
  }
  function toggleHide() {
    if (st.hidden) { st.hidden = false; toast("사물함에서 나왔다."); return; }
    st.hidden = true; G.flash = false; toast("사물함 안에 숨었다. 숨죽이고…");
  }

  /* ---------- 단서 수첩 ---------- */
  function notebook() {
    const E = [{ label: "① 퍼진 쇼츠", clue: CLUES[1].seoyul }];
    if (G.seen.original) E.push({ label: "① 원본 영상", clue: CLUES[1].minjae });
    if (G.found.sua) E.push({ label: "② 신문 기사", clue: CLUES[2].sua });
    if (G.found.minjae && isOpen(G, 2)) E.push({ label: "② 옛 필름", clue: CLUES[2].minjae });
    if (G.part[2] && G.part[2].crop) E.push({ label: "② 확대 사진", clue: ZOOM2 });
    for (const k of [3, 4, 5]) if (isOpen(G, k)) for (const c of Object.values(CLUES[k] || {})) E.push({ label: `${k} ${ROOMS[k].name} (임시)`, clue: c });
    return E;
  }
  function phone() {
    phoneApps(G.bat, [
      { icon: "📝", name: "메모", open: () => showMemo(G.bat, MEMO) },
      { icon: "▶", name: "쇼츠", open: () => showClue(CLUES[1].seoyul) },
      { icon: "💡", name: `힌트 (2%)`, open: () => {
        if (G.bat < 2) return toast("서진의 폰 배터리가 다 됐어요.", "bad");
        handle(G, { t: "hint" }, G.el, cfg); G.hints++; save();
        toast(`📱 ${G.hint.text}`, "hint", 9000);
      } }
    ]);
  }

  /* ---------- 가까운 것 ---------- */
  const P = () => ({ x: G.x, z: G.z });
  function nearItem() {
    if (st.hidden || st.busy) return null;
    let best = null, bd = 9;
    for (const it of MAP.items) {
      if (it.kind === "memo") continue;
      if (it.kind === "battery" && G.picked.includes(it.id)) continue;
      if (it.kind === "diary" && G.diary[it.room]) continue;
      if (it.kind === "npc" && G.found[it.npc]) continue;
      const r = it.room === 5 && it.kind === "code" ? 2.6 : NEAR;
      const d = Math.hypot(it.x - G.x, it.z - G.z);
      if (d < r && d < bd) { bd = d; best = it; }
    }
    return best;
  }
  const nearHide = () => MAP.hides.some(([x, z]) => Math.hypot(x - G.x, z - G.z) < 1.0);
  function litDiaries() {
    if (!G.flash || st.hidden) return [];
    return MAP.items.filter(it => it.kind === "diary").filter(it => {
      const dx = it.x - G.x, dz = it.z - G.z;
      return Math.hypot(dx, dz) < 6.5 && Math.abs(angDiff(G.a, Math.atan2(dz, dx))) < 0.5;
    }).map(it => it.id);
  }

  /* ---------- 판정 ---------- */
  function judge(req) {
    const before = JSON.stringify(G.solved), r = handle(G, req, G.el, cfg, G.party);
    if (G.msg) { toast(G.msg.text, G.msg.kind); G.msg.kind === "good" ? sfx.good() : G.msg.kind === "bad" ? sfx.bad() : 0; if (G.bo > G.el) sfx.blackout(); }
    if (JSON.stringify(G.solved) !== before) { evidenceFly(); afterSolve(); }
    if (G.end) finishSoon();
    save();
    return r;
  }
  function afterSolve() {
    for (const [id, C] of Object.entries(CONFESS)) {
      if (G.solved[C.after] && G.party.includes(id) && !G.confessed[id]) {
        G.confessed[id] = true;
        setTimeout(async () => {
          st.busy = true;
          const kind = await talk([...C.lines, { choice: C.choice }], { name: G.name });
          G.heart[id] = kind;
          if (kind === "kind") { G.frags.push(C.frag); toast(`증거 조각: ${C.frag}`, "good"); sfx.good(); }
          st.busy = false; save();
        }, 1600);
        break;
      }
    }
  }
  function evidenceFly() {
    const e = document.createElement("div"); e.className = "evfly"; e.textContent = "증거"; document.body.appendChild(e);
    setTimeout(() => e.remove(), 1400);
  }

  async function useNear() {
    const it = nearItem(); if (!it || st.busy) return;
    const lockLeft = G.lock[it.room] > G.el ? Math.ceil((G.lock[it.room] - G.el) / 1000) : 0;
    const lockedText = lockLeft ? `자물쇠가 잠겨 있어요. ${lockLeft}초 뒤에 다시.` : "";
    if (it.kind === "npc") {
      st.busy = true; sfx.slam();
      await talk(FOUND[it.npc], { name: G.name });
      G.found[it.npc] = true; G.party.push(it.npc);
      st.npc[it.npc] = { x: it.x, z: it.z, a: 0, sp: 0 };
      st.busy = false; hud(true); save(); return;
    }
    if (it.kind === "battery") { G.picked.push(it.id); G.fbat = Math.min(100, G.fbat + 40); sfx.pick(); return toast(`건전지를 넣었다. 손전등 ${Math.round(G.fbat)}%`, "good"); }
    if (it.kind === "diary") {
      if (!litDiaries().includes(it.id)) return toast("뭔가 있는 것 같은데… 손전등으로 비춰 보세요.");
      judge({ t: "diary", room: it.room }); return showDiary(it.room);
    }
    if (G.solved[it.room]) return toast("이미 열었어요.");
    if (it.kind === "order") {
      if (!G.party.includes("minjae")) return toast(NUDGE.needMinjae);
      W.setTV(true);
      if (!G.seen.original) { G.seen.original = true; bubble("minjae", CHATTER.minjae.tv); }
      const m = modal(`<h2>교실 TV</h2><p class="lead">민재의 카메라를 연결했다. 원본 영상이 들어 있다.</p>
        <div class="row"><button class="pill y" id="tv1">원본 영상 보기</button><button class="pill ghost" id="tv2">장면 되돌리기</button></div>`);
      m.querySelector("#tv1").onclick = () => { m.close(); showClue(CLUES[1].minjae); };
      m.querySelector("#tv2").onclick = () => {
        m.close();
        if (G.part[1] && G.part[1].order) return toast("TV 화면은 이미 원래 순서로 돌아왔어요.");
        orderPuzzle(SCENE_NAMES, v => judge({ t: "order", room: 1, v }), lockedText);
      };
      return;
    }
    if (it.kind === "code") return codePad(it.label, v => judge({ t: "code", room: it.room, v }), lockedText);
    if (it.kind === "word") return wordPad(it.label, v => judge({ t: "code", room: it.room, v }), lockedText);
    const p2 = G.part[2] || {};
    if (it.kind === "project") {
      if (p2.proj) return toast("환등기가 벽에 사진을 비추고 있다.");
      if (!G.party.includes("minjae")) return toast(NUDGE.needMinjaeProj);
      return judge({ t: "project", room: 2 });
    }
    if (it.kind === "photo") {
      if (!p2.proj) return toast("벽이 비어 있다. 환등기를 켜면 뭔가 비칠 것 같다.");
      if (p2.crop) return showClue(ZOOM2);
      return cropPuzzle(v => judge({ t: "crop", room: 2, v }), lockedText);
    }
  }

  /* ---------- 매 장면 ---------- */
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!W || document.hidden) return;
    const playing = G.introDone && !st.ended;
    if (playing) G.el += dt * 1000;
    const e = G.el, tnow = performance.now();
    const weak = G.fear !== "normal";
    const frozen = st.frozenUntil > tnow;
    const ui = !!document.getElementById("modal") || talking() || st.busy;

    [2, 3, 4].forEach(k => W.setDoor(k, isOpen(G, k)));
    W.setDoor("front", !!G.solved[4]);
    W.setProjection(!!(G.part[2] && G.part[2].proj));
    MAP.items.forEach(it => { if (it.kind === "battery") W.setItemGone(it.id, G.picked.includes(it.id)); if (it.kind === "diary") W.setItemGone(it.id, !!G.diary[it.room]); });

    /* 주인공 */
    let speed = 0;
    if (playing && !frozen && !ui) {
      let vx = st.joy.x, vz = st.joy.z; const k = st.keys;
      if (k.has("a") || k.has("arrowleft")) vx -= 1; if (k.has("d") || k.has("arrowright")) vx += 1;
      if (k.has("w") || k.has("arrowup")) vz -= 1; if (k.has("s") || k.has("arrowdown")) vz += 1;
      const l = Math.hypot(vx, vz);
      if (l > 0.15) {
        if (st.hidden) st.hidden = false;
        vx /= Math.max(1, l); vz /= Math.max(1, l);
        const p = W.move(G.x, G.z, vx * SPEED * dt, vz * SPEED * dt);
        speed = Math.hypot(p.x - G.x, p.z - G.z) / dt;
        G.x = p.x; G.z = p.z; G.a = Math.atan2(vz, vx);
        const L = st.trail[st.trail.length - 1];
        if (!L || Math.hypot(L.x - G.x, L.z - G.z) > 0.2) { st.trail.push({ x: G.x, z: G.z }); if (st.trail.length > 80) st.trail.shift(); }
      }
    }
    /* 일행: 내가 지나간 길을 줄지어 따라옴 */
    G.party.forEach((id, i) => {
      const N = st.npc[id] || (st.npc[id] = { x: G.x, z: G.z, a: G.a, sp: 0 });
      const want = (i + 1) * 0.85;
      let tx = G.x, tz = G.z, acc = 0;
      for (let j = st.trail.length - 1; j > 0; j--) {
        const a = st.trail[j], b = st.trail[j - 1], seg = Math.hypot(a.x - b.x, a.z - b.z);
        if (acc + seg >= want) { const f = (want - acc) / seg; tx = a.x + (b.x - a.x) * f; tz = a.z + (b.z - a.z) * f; acc = want; break; }
        acc += seg; tx = b.x; tz = b.z;
      }
      const dx = tx - N.x, dz = tz - N.z, d = Math.hypot(dx, dz);
      const step = Math.min(d, (d > 2 ? 4 : 3) * dt);
      if (d > 0.05) { N.x += dx / d * step; N.z += dz / d * step; N.a = Math.atan2(dz, dx); }
      else N.a = Math.atan2(G.z - N.z, G.x - N.x);                                 // 멈추면 주인공 쪽을 봄
      N.sp = d > 0.05 ? step / dt : 0;
    });

    /* 손전등 */
    if (G.flash && playing) { G.fbat = Math.max(0, G.fbat - FLASH_DRAIN * dt); if (G.fbat <= 0) { G.flash = false; toast("손전등이 꺼졌다…", "bad"); } }

    /* 그것 */
    const itp = itPos(e, G.threat);
    let alert = false, fear = 0;
    const inCorr = roomAt(G.x, G.z) === 0 && G.x > 0;
    if (inCorr) fear = Math.max(0, 1 - Math.hypot(G.x - itp.x, G.z - itp.z) / 9);
    if (playing && !ui && inCorr && !st.hidden) {
      const dx = G.x - itp.x, dz = G.z - itp.z, d = Math.hypot(dx, dz);
      if (d < IT.sight && Math.abs(angDiff(itp.dir, Math.atan2(dz, dx))) < IT.fov) {
        alert = true;
        if (G.flash && tnow > st.immuneUntil && tnow > st.frozenUntil) caught(weak);
      }
    }
    st.stepT -= dt;
    if (st.stepT <= 0 && playing) { st.stepT = 0.85; itStep(Math.hypot(G.x - itp.x, G.z - itp.z), G.party.includes("haeun") ? 1.4 : 1); }
    if (fear > 0.55 && G.party.length && st.chatT < 0) { const id = G.party[0]; if (CHATTER[id] && CHATTER[id].near_it) { bubble(id, CHATTER[id].near_it); st.chatT = 20; } }
    st.chatT -= dt;

    /* 사물함이 덜컹: 아직 못 찾은 친구 근처 */
    for (const it of MAP.items) if (it.kind === "npc" && !G.found[it.npc] && Math.hypot(it.x - G.x, it.z - G.z) < 3.2 && tnow - st.nearRattle > 4000) { st.nearRattle = tnow; sfx.pick(); }

    /* 그리기 */
    const chars = [{ id: "player", x: G.x, z: G.z, a: G.a, speed, mode: frozen ? "frozen" : st.hidden ? "hide" : "idle", hidden: false, opts: { jacket: JACKETS[G.jacket] } }];
    for (const id of G.party) { const N = st.npc[id]; chars.push({ id, x: N.x, z: N.z, a: N.a, speed: N.sp, mode: frozen ? "frozen" : st.hidden ? "hide" : fear > 0.5 ? "scared" : "idle" }); }
    const near = nearItem();
    const bo = G.bo > e;
    W.frame({
      progress: e / GAME_MS, chars,
      me: { x: G.x, z: G.z, a: G.a, flash: G.flash && !st.hidden, bat: G.fbat },
      it: { x: itp.x, z: itp.z, dir: itp.dir, alert, weak },
      near: near && near.id, lit: litDiaries(), fear,
      static: frozen ? 0.35 + Math.random() * 0.2 : (st.staticUntil > tnow ? 0.5 : 0), dark: bo ? 0.84 : 0
    });
    setDusk(e / GAME_MS);
    drawBubbles();
    st.hudT = (st.hudT || 0) - dt;
    if (st.hudT <= 0) { st.hudT = 0.2; hud(false, { e, near, itp, bo }); }

    if (playing && (timeUp(G, e) || G.end)) finishSoon();
  }

  function caught(weak) {
    const tnow = performance.now(); sfx.caught();
    if (weak) { st.staticUntil = tnow + 1500; st.immuneUntil = tnow + 5000; toast("들켰다! 얼른 손전등을 꺼요. (약함 모드라 몸이 굳지는 않아요)", "bad"); return; }
    st.frozenUntil = tnow + FREEZE_MS; st.immuneUntil = tnow + FREEZE_MS + 6000;
    G.fbat = Math.max(0, G.fbat - 10);
    toast("들켰다…! 20초 동안 몸이 굳는다. 손전등 배터리 −10%", "bad");
  }

  /* ---------- 말풍선 ---------- */
  function bubble(id, text) { st.bubbles.push({ id, text, until: performance.now() + 3500 }); }
  function drawBubbles() {
    const box = $("bub"); if (!box) return;
    const tnow = performance.now(); st.bubbles = st.bubbles.filter(b => b.until > tnow);
    box.innerHTML = st.bubbles.map(b => {
      const N = st.npc[b.id]; if (!N) return "";
      const p = W.project(N.x, 1.9, N.z);
      return `<div class="bub" style="transform:translate(${p.x}px,${p.y}px);--c:${NPCS[b.id].color}">${esc(b.text)}</div>`;
    }).join("");
  }

  /* ---------- HUD ---------- */
  function hud(full, x = {}) {
    if (!$("clk")) return;
    if (full) $("party").innerHTML = G.party.map(id => `<span class="pm" style="--c:${NPCS[id].color}" title="${esc(NPCS[id].name)}">${esc(NPCS[id].name[1])}</span>`).join("");
    const e = x.e != null ? x.e : G.el;
    $("clk").textContent = clockText(e); $("lft").textContent = `배 출발까지 ${leftText(e)}`;
    $("bat").textContent = G.bat; $("flb").style.width = Math.round(G.fbat) + "%"; $("fl").classList.toggle("off", !G.flash);
    const near = x.near;
    $("use").hidden = !near; if (near) $("use").textContent = near.kind === "npc" ? `열어 보기 · ${near.label}` : `살펴보기 · ${near.label}`;
    $("hide").hidden = !(nearHide() || st.hidden); $("hide").textContent = st.hidden ? "🚪 나오기" : "🚪 숨기";
    $("bo").classList.toggle("on", !!x.bo);
    const edge = $("edge");
    if (G.party.includes("haeun") && x.itp) {
      const dx = x.itp.x - G.x, dz = x.itp.z - G.z, d = Math.hypot(dx, dz);
      const Wd = innerWidth / 2 - 40, Hh = innerHeight / 2 - 60, s = Math.min(Wd / Math.abs(dx || 1e-6), Hh / Math.abs(dz || 1e-6));
      edge.style.display = d < 18 ? "block" : "none";
      edge.style.transform = `translate(${innerWidth / 2 + dx * s - 20}px, ${innerHeight / 2 + dz * s - 20}px)`;
      edge.style.opacity = Math.max(0.25, 1 - d / 18);
    } else edge.style.display = "none";
    $("ev").innerHTML = [1, 2, 3, 4, 5].map(k => `<i class="${G.solved[k] ? "on" : isOpen(G, k) ? "open" : ""}" title="${esc(ROOMS[k].name)}">${k}</i>`).join("")
      + `<span>📔 ${Object.keys(G.diary).length}/5</span>`;
  }

  /* ---------- 끝 ---------- */
  function finishSoon() {
    if (st.ended) return; st.ended = true;
    if (!G.end) timeUp(G, G.el);
    if (G.end === "true" && Object.values(G.heart).filter(k => k === "kind").length < 5) G.end = "escape";
    save();
    $("fade").classList.add("on");
    setTimeout(() => { stop(); Ending(G, { onExit }); }, 2200);
  }
  function stop() { cancelAnimationFrame(raf); clearInterval(saver); if (W) W.dispose(); W = null; closeModal(); onkeydown = onkeyup = null; }

  function toast(text, kind = "info", ms = 4200) {
    const box = $("toasts"); if (!box) return;
    const t = document.createElement("div"); t.className = "toast " + kind; t.textContent = text;
    box.appendChild(t); while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => t.classList.add("out"), ms); setTimeout(() => t.remove(), ms + 500);
  }
}

/* ================================================================ 엔딩 + 결과 카드 */
export function Ending(G, { onExit }) {
  document.body.classList.remove("player");
  const E = {
    true: ["진엔딩", "재희의 집. 서진과 재희가 함께 화면을 본다.", `“${G.name}, 이어 줘서 고마워.”`, "그리고 열네 살 재희의 사진 한 장."],
    escape: ["탈출 엔딩", "6시 배에 올랐다. 서진의 누명은 벗겨졌다.", `“${G.name}, 이어 줘서 고마워.”`, "재희의 이야기는 아직 반쯤 남아 있다."],
    night: ["밤샘 엔딩", "배는 떠났다. 다음 날 아침 구조됐다.", "쇼츠는 하루 더 퍼졌다.", ""]
  }[G.end || "night"];
  const mm = ms => { const s = Math.round((ms || 0) / 1000); return `${Math.floor(s / 60)}분 ${s % 60}초`; };
  const d = new Date(G.startedAt || Date.now());
  const when = `${d.getMonth() + 1}월 ${d.getDate()}일 ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  const evN = (G.ev || []).length, fr = (G.frags || []).length, di = Object.keys(G.diary || {}).length;
  const answers = Object.entries(G.heart || {}).map(([id, k]) => `${NPCS[id].name}: ${k === "kind" ? "감싸 줌" : "몰아세움"}`);
  const chk = check([G.name, G.end, Math.round((G.endAt || 0) / 1000), evN, fr, di, G.wrong, G.hints].join("|"));
  document.getElementById("app").innerHTML = `<div class="wrap center end ${G.end}">
    <p class="kicker">${E[0]}</p><h1>${esc(E[1])}</h1><p class="lead big">${esc(E[2])}</p><p class="lead">${esc(E[3])}</p>
    <div class="rcard">
      <div class="rh"><b>마지막 배는 6시 · 결과</b><span>${esc(when)}</span></div>
      <div class="rname">${esc(G.name)}</div>
      <div class="rgrid">
        <div><b>${E[0]}</b>엔딩</div><div><b>${G.end === "night" ? "—" : mm(G.endAt)}</b>걸린 시간</div>
        <div><b>${evN}+${fr}</b>증거</div><div><b>${di}/5</b>일기장</div>
        <div><b>${G.wrong || 0}</b>틀림</div><div><b>${G.hints || 0}</b>힌트</div>
      </div>
      ${answers.length ? `<div class="rans">${answers.map(esc).join(" · ")}</div>` : ""}
      <div class="rchk">확인 번호 <b>${chk}</b></div>
    </div>
    <p class="muted">이 카드를 선생님께 보여 주거나 캡처해서 내세요.</p>
    <div class="row" style="justify-content:center"><button class="pill ghost" id="again">처음 화면으로</button></div></div>`;
  document.getElementById("again").onclick = () => { clearSave(); onExit(); };
}
/* 결과를 고치면 번호가 안 맞게: 간단한 해시 4자리 */
export function check(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return String(h % 10000).padStart(4, "0"); }

function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
