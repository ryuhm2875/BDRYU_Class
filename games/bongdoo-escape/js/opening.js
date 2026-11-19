/* ──────────────────────────────────────────────────────────────
   6시의 섬 · 오프닝 (학교 정문까지)
   1 dm       검은 화면, 준호의 DM → 쇼츠 → 재희 인스타 → 전화
   2 terminal 오후 3시 대서버스터미널 (3D, 조작 연습)
   3 taxi     택시 (컷 장면)
   4 pier     오후 5시 대서항 (3D)
   5 boat     배 (컷 장면)
   6 path     봉두도 섬 길 (3D, 걸으며 대화)
   7 gate     봉두초등학교 정문 → 제목 「6시의 섬」
   단계마다 저장 → 이어 하기는 그 단계 처음부터
   ────────────────────────────────────────────────────────────── */
import * as THREE from "../vendor/three.module.min.js";
import { makePost } from "./post.js?v=202611191033";
import { loadPeople, makePerson } from "./people.js?v=202611191033";
import { talk, talking, setGender, preloadPortraits } from "./dialog.js?v=202611191033";
import { sfx, music, myStep, startAudio, duck } from "./sound.js?v=202611191033";
import { esc } from "./puzzles.js?v=202611191033";
import { OPENING as O } from "./story.js?v=202611191033";

const STAGES = ["dm", "terminal", "taxi", "pier", "boat", "path", "gate"];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const lam = o => new THREE.MeshLambertMaterial(Object.assign({ flatShading: true }, o));
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);

export async function Opening(G, { onDone, save }) {
  setGender(G.gender); preloadPortraits();
  document.body.classList.add("player");
  const $app = document.getElementById("app");
  $app.innerHTML = `<div class="op" id="op"><canvas id="opcv"></canvas>
    <div class="lb t"></div><div class="lb b"></div>
    <div class="opcap" id="opcap"></div>
    <div class="marks" id="opmarks"></div>
    <div class="joy" id="opjoy" hidden><i id="opknob"></i></div>
    <button class="opskip" id="opskip" hidden>건너뛰기 ›</button>
    <div class="opfade" id="opfade"></div>
    <div class="ophone-wrap" id="phonewrap" hidden></div></div>`;
  const $ = id => document.getElementById(id);
  const say = lines => talk(lines, { name: G.name });
  const fade = async (on, ms = 900) => { $("opfade").style.transition = `opacity ${ms}ms`; $("opfade").classList.toggle("on", on); await sleep(ms); };
  const letterbox = on => $("op").classList.toggle("cine", on);
  /* 영화식 장소 자막: 작은 시간 + 큰 장소 */
  async function caption(time, place, ms = 2600) {
    const c = $("opcap"); c.innerHTML = `<small>${esc(time)}</small><b>${esc(place)}</b>`; c.classList.add("on");
    await sleep(ms); c.classList.remove("on"); await sleep(700);
  }

  /* 3D 무대: 3D 단계에서만 만듦 */
  let E = null;
  const eng = async () => E || (E = await makeEngine($("opcv"), G));


  /* ═════════ 1. DM ═════════ */
  async function stageDM() {
    music(null);
    $("opfade").classList.add("on", "instant");
    await sleep(400); $("opfade").classList.remove("instant");
    await caption("밤 11시 42분", "", 1800);
    const wrap = $("phonewrap"); wrap.hidden = false;
    wrap.innerHTML = `<div class="ophone"><div class="pbar"><span>11:42</span><span>▮▮▮ 76%</span></div>
      <div class="pscreen" id="ps"></div></div><div class="phint" id="phint"></div>`;
    const ps = $("ps"), hint = t => { $("phint").textContent = t || ""; };
    await sleep(500);
    /* 1-1 채팅 */
    ps.innerHTML = `<div class="chat"><div class="chead"><i class="av">준</i><b>준호</b></div><div class="clist" id="cl"></div></div>`;
    const cl = $("cl");
    let tapRes; const tapped = new Promise(r => tapRes = r);
    const bubble = async (m, me = false) => {
      const typing = document.createElement("div"); typing.className = "msg typing"; typing.innerHTML = "<i></i><i></i><i></i>"; cl.appendChild(typing);
      await sleep(700); typing.remove();
      const el = document.createElement("div"); el.className = "msg" + (me ? " me" : "");
      if (m.video) el.innerHTML = `<button class="vthumb" id="vthumb"><img src="assets/video/shorts_poster.jpg" alt=""><span>▶</span></button>`;
      else el.textContent = m;
      if (m.video) el.querySelector("button").onclick = () => tapRes();
      cl.appendChild(el); cl.scrollTop = 1e6; sfx.vibrate(); await sleep(450);
      return el;
    };
    for (const m of O.dm1) await bubble(m);
    /* 1-2 영상 누르기 */
    hint("영상을 눌러 보세요");
    await tapped;
    hint("");
    await shortsView(ps);
    ps.innerHTML = `<div class="chat"><div class="chead"><i class="av">준</i><b>준호</b></div><div class="clist" id="cl"></div></div>`;
    const cl2 = $("cl");
    for (const m of O.dm1) { const el = document.createElement("div"); el.className = "msg"; if (m.video) el.innerHTML = `<div class="vthumb"><img src="assets/video/shorts_poster.jpg" alt=""><span>▶</span></div>`; else el.textContent = m; cl2.appendChild(el); }
    const bubble2 = async m => { const t = document.createElement("div"); t.className = "msg typing"; t.innerHTML = "<i></i><i></i><i></i>"; cl2.appendChild(t); cl2.scrollTop = 1e6; await sleep(800); t.remove(); const el = document.createElement("div"); el.className = "msg"; el.textContent = m; cl2.appendChild(el); cl2.scrollTop = 1e6; sfx.vibrate(); await sleep(500); };
    for (const m of O.dm2) await bubble2(m);
    await sleep(600);
    /* 화면이 멎고, 얼굴 확대 */
    $("op").classList.add("jolt"); sfx.heart();
    ps.insertAdjacentHTML("beforeend", `<div class="faceup"><img src="assets/video/orig_d.jpg" alt=""></div>`);
    await sleep(1400);
    await say(O.me1);
    $("op").classList.remove("jolt");
    /* 1-3 재희 인스타 */
    const I = O.insta;
    ps.innerHTML = `<div class="insta"><div class="ihead"><div class="iav" style="background-image:url(assets/portraits/seojin.webp)"></div>
        <div><b>${esc(I.id)}</b><small>${esc(I.nameLine)}</small><small>팔로워 ${esc(I.followers)}</small></div></div>
      <div class="ipost"><img src="assets/video/scene_a.jpg" alt=""><p>${esc(I.post)}</p></div>
      <div class="icom" id="icom"></div></div>`;
    const ic = $("icom");
    for (const c of I.comments) { const d = document.createElement("div"); d.innerHTML = `<i>${"익명" + (Math.floor(Math.random() * 900) + 100)}</i> ${esc(c)}`; ic.prepend(d); sfx.vibrate(); await sleep(380); }
    ic.insertAdjacentHTML("afterbegin", `<div class="noreply">한재희 님은 아직 답글을 달지 않았습니다.</div>`);
    await sleep(900);
    await say(O.me2);
    /* 1-4 재희에게 전화 */
    ps.insertAdjacentHTML("beforeend", `<button class="callbtn" id="cb">📞 재희에게 전화</button>`);
    hint("전화를 걸어 보세요");
    await new Promise(r => $("cb").onclick = r); hint("");
    ps.innerHTML = callScreen("한재희", "연결 중…", "seojin");
    for (let k = 0; k < 3; k++) { sfx.ring(); await sleep(1500); }
    ps.querySelector(".cst").textContent = "전화를 받을 수 없어 음성사서함으로 연결됩니다.";
    sfx.bad(); await sleep(1800);
    /* 1-5 서율에게 전화 */
    ps.innerHTML = `<div class="contacts"><div class="ct">최근 기록</div>
      <div class="crow miss">한재희 <small>부재중 · 방금</small></div>
      <button class="crow" id="cs">재희 동생 서율 <small>📞</small></button></div>`;
    hint("서율에게 전화해 보세요");
    await new Promise(r => $("cs").onclick = r); hint("");
    ps.innerHTML = callScreen("재희 동생 서율", "연결 중…", "seoyul");
    sfx.ring(); await sleep(1500);
    const cst = ps.querySelector(".cst"); let sec = 0; const tm = setInterval(() => { sec++; cst.textContent = `통화 중 00:${String(sec).padStart(2, "0")}`; }, 1000);
    await say(O.call);
    clearInterval(tm); cst.textContent = "통화 종료"; sfx.click && sfx.click();
    await sleep(900);
    wrap.classList.add("off"); await sleep(800); wrap.hidden = true; wrap.classList.remove("off"); wrap.innerHTML = "";
    await caption("", "다음 날", 2000);
  }
  function callScreen(name, status, who) {
    return `<div class="callv"><div class="cav" style="background-image:url(assets/portraits/${who}.webp)"></div><b>${esc(name)}</b><div class="cst">${esc(status)}</div><div class="cend">●</div></div>`;
  }
  /* 쇼츠 보기: 영상 + 댓글 */
  function shortsView(ps) {
    return new Promise(resolve => {
      ps.innerHTML = `<div class="sview"><video src="assets/video/shorts.mp4" playsinline autoplay></video>
        <div class="sside"><span>♥<b>3.1만</b></span><span>💬<b>2,184</b></span></div>
        <div class="scom" id="scom"><div class="sct">댓글 2,184</div>${O.comments.map(c => `<div>💬 ${esc(c)}</div>`).join("")}</div>
        <button class="sclose" id="scl" hidden>✕</button></div>`;
      const v = ps.querySelector("video");
      v.addEventListener("play", () => duck(true));
      v.play().catch(() => { v.controls = true; });
      let closed = false;
      const done = () => { if (closed || !$("scl")) return; $("scl").hidden = false; $("phint").textContent = "댓글을 내려 보고, ✕ 를 눌러 닫으세요"; ps.querySelector(".sview").classList.add("ended"); };
      v.addEventListener("ended", done); setTimeout(done, 16000);
      $("scl").onclick = () => { closed = true; duck(false); v.pause(); $("phint").textContent = ""; resolve(); };
    });
  }

  /* ═════════ 7. 정문 · 제목 ═════════ */
  async function stageGate() {
    letterbox(true);
    await fade(true, 1200); $("op").classList.add("black");
    if (E) E.stop();
    $("op").classList.add("titledrop");
    $("opcap").innerHTML = `<b class="big">6시의 섬</b><small class="sub">마지막 배까지 30분</small>`; $("opcap").classList.add("on", "tdrop");
    sfx.heart(); await sleep(3800);
    $("opcap").classList.remove("on"); await sleep(1200);
  }

  /* ═════════ 3D 단계 ═════════ */
  const STAGE3D = {
    async terminal(e) {
      music("calm");
      await e.build(sceneTerminal);
      const me = e.spawn("player", -3.5, -1.2, 0), yul = e.spawn("seoyul", 3.2, -2.6, Math.PI), woo = e.spawn("minjae", 4.4, -2.9, Math.PI);
      await fade(false, 900);
      await caption("오후 3시", "대서버스터미널");
      $("opjoy").hidden = false;
      await say(O.guideMeet);
      await e.walkUntil({ target: yul, reach: 2.2, marks: [yul] });
      e.face(me, yul); e.face(yul, me); e.face(woo, me);
      await say(O.meet);
      e.follow([yul, woo]);
      await say(O.guideRoad);
      const curb = { x: 1.5, z: 2.4 };
      await e.walkUntil({ target: curb, reach: 1.0, marks: [curb] });
      /* 택시가 다가와 멈춤 */
      $("opjoy").hidden = true; letterbox(true); e.lockInput(true);
      const taxi = e.taxi; taxi.visible = true; taxi.position.set(26, 0, 4.2);
      e.camTo({ x: 3, z: 1.5 }, { h: 4.4, d: 8.5 });
      await e.tween(2600, t => { taxi.position.x = 26 - 22.5 * (1 - (1 - t) * (1 - t)); });
      sfx.door();
      await fade(true, 700);
      [me, yul, woo].forEach(p => p.group.visible = false);
      await fade(false, 500);
      await e.tween(2600, t => { taxi.position.x = 3.5 - 30 * t * t; });
      await fade(true, 900);
      letterbox(false); e.lockInput(false);
    },
    async taxi(e) {
      letterbox(true); e.lockInput(true);
      await e.build(sceneCoast);
      const t = e.taxi; t.visible = true;
      e.camFixed({ x: 0, y: 2.2, z: 7.5 }, { x: 0, y: 0.8, z: 0 });
      let alive = true; e.onFrame(dt => { if (!alive) return; e.scroll(dt * 14); t.position.y = Math.sin(performance.now() / 90) * 0.015; });
      await fade(false, 900);
      await caption("", "대서항으로", 1800);
      await say(O.taxi);
      await sleep(600);
      await fade(true, 1100); alive = false;
      letterbox(false);
    },
    async pier(e) {
      music("calm");
      await e.build(scenePier);
      const me = e.spawn("player", -10, -3, 0), yul = e.spawn("seoyul", -11.6, -3.5, 0), woo = e.spawn("minjae", -11.8, -2.4, 0);
      e.follow([yul, woo]); e.lockInput(false);
      await fade(false, 900);
      await caption("오후 5시", "대서항");
      $("opjoy").hidden = false;
      await sleep(400);
      e.face(yul, me); e.face(woo, me);
      const pick = await say(O.pier); G.flags.opPier = pick;
      await say(O.guideBoat);
      const board = { x: 6.9, z: 9 };
      await e.walkUntil({ target: board, reach: 1.1, marks: [board] });
      $("opjoy").hidden = true;
      await fade(true, 900);
    },
    async boat(e) {
      letterbox(true); e.lockInput(true);
      await e.build(sceneSea);
      const cap = e.spawn("captain", 0.9, 0.3, Math.PI / 2); e.boat.add(cap.group); cap.group.position.set(0.9, 0.55, -0.6);
      e.camFixed({ x: 7, y: 3.2, z: 9 }, { x: 0, y: 1, z: -2 });
      let alive = true; e.onFrame(dt => { if (!alive) return; e.boat.position.z -= dt * 2.2; e.boat.rotation.z = Math.sin(performance.now() / 700) * 0.03; e.camFollowBoat(); });
      await fade(false, 1000);
      await say(O.captain);
      await sleep(2400);
      await fade(true, 1100); alive = false;
      await caption("오후 5시 20분", "봉두도", 2200);
      letterbox(false);
    },
    async path(e) {
      music("calm");
      await e.build(scenePath);
      const me = e.spawn("player", -2, 0, 0), yul = e.spawn("seoyul", -3.4, -0.6, 0), woo = e.spawn("minjae", -3.6, 0.6, 0);
      e.follow([yul, woo]); e.lockInput(false);
      await fade(false, 900);
      $("opjoy").hidden = false;
      const gate = { x: 41, z: 0 };
      let talked1 = false, talked2 = false;
      await e.walkUntil({ target: gate, reach: 2.6, marks: [gate], onStep: async p => {
        if (!talked1 && p.x > 9) { talked1 = true; e.lockInput(true); e.face(yul, woo); const k = await say(O.path1); G.flags.opComfort = k; e.lockInput(false); }
        if (!talked2 && p.x > 30) { talked2 = true; e.lockInput(true); await say(O.path2); e.lockInput(false); }
      } });
      $("opjoy").hidden = true; e.lockInput(true); letterbox(true);
      e.camTo({ x: 44, z: 0 }, { h: 3.2, d: 9 });
      await sleep(2200);
    }
  };

  /* ── 차례대로 진행 ── */
  let i = Math.max(0, STAGES.indexOf(G.op || "dm"));
  startAudio();
  for (; i < STAGES.length; i++) {
    G.op = STAGES[i]; save();
    const name = STAGES[i];
    if (name === "dm") await stageDM();
    else if (name === "gate") await stageGate();
    else { const e = await eng(); await STAGE3D[name](e); }
  }
  if (E) E.dispose();
  G.op = "done"; G.opDone = true; save();
  onDone();

}

/* ═════════════════ 3D 엔진 (작게 그려 키움 + 디더링) ═════════════════ */
async function makeEngine(canvas, G) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(1); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const { rt, post, scene: postScene, cam: postCam } = makePost();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.3, 260);
  const PIXEL = 2.6;
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    const rw = Math.max(200, Math.ceil(w / PIXEL)), rh = Math.max(120, Math.ceil(h / PIXEL));
    renderer.setSize(rw, rh, false); rt.setSize(rw, rh); post.uniforms.uRes.value.set(rw, rh);
    const asp = rw / rh; camera.aspect = asp;
    camera.fov = asp >= 1.3 ? 42 : Math.min(66, 2 * Math.atan(Math.tan(25 * Math.PI / 180) / asp) * 180 / Math.PI);
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize); resize();
  const P = await loadPeople();

  let scene = null, solids = [], walk = null, frameFns = [], people = [], followers = [], player = null, locked = false;
  let camMode = "follow", camT = { x: 0, z: 0 }, camOpt = { h: 6.2, d: 7.4 }, camFix = null, scrollFn = null;
  const keys = new Set(), joy = { x: 0, z: 0 };
  const api = { taxi: null, boat: null };

  /* 입력 */
  const kd = e => { if (talking()) return; const k = e.key.toLowerCase(); if (["arrowleft", "arrowright", "arrowup", "arrowdown", "w", "a", "s", "d"].includes(k)) { keys.add(k); goTo = null; } };
  const ku = e => keys.delete(e.key.toLowerCase());
  addEventListener("keydown", kd); addEventListener("keyup", ku);
  const J = document.getElementById("opjoy"), K = document.getElementById("opknob"); let jid = null, ox = 0, oy = 0;
  J.addEventListener("pointerdown", e => { jid = e.pointerId; ox = e.clientX; oy = e.clientY; try { J.setPointerCapture(jid); } catch (er) {} });
  J.addEventListener("pointermove", e => { if (e.pointerId !== jid) return; let dx = e.clientX - ox, dy = e.clientY - oy; const R = 46, l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; } K.style.transform = `translate(${dx}px,${dy}px)`; joy.x = dx / R; joy.z = dy / R; goTo = null; });
  const jup = e => { if (e.pointerId !== jid) return; jid = null; joy.x = joy.z = 0; K.style.transform = ""; };
  J.addEventListener("pointerup", jup); J.addEventListener("pointercancel", jup);
  /* 누른 곳(사람·빛 점)으로 걸어가기 */
  let goTo = null, marks = [];
  const markBox = document.getElementById("opmarks");
  markBox.addEventListener("click", e => { const b = e.target.closest("[data-k]"); if (b) goTo = marks[+b.dataset.k]; });
  canvas.addEventListener("click", e => {
    if (locked || talking()) return;
    let best = null, bd = 70;
    marks.forEach(m => { const p = project(m.x ?? m.group.position.x, 0.8, m.z ?? m.group.position.z); const d = Math.hypot(p.x - e.clientX, p.y - e.clientY); if (p.on && d < bd) { bd = d; best = m; } });
    if (best) goTo = best;
  });

  function project(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(camera), r = canvas.getBoundingClientRect();
    return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, on: v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 };
  }
  /* 걸을 수 있는 곳 = 사각형 여러 개를 합친 곳 (모서리 네 점이 모두 안에 있어야 함) */
  const inWalk = (x, z) => !walk || walk.some(w => x >= w.x0 && x <= w.x1 && z >= w.z0 && z <= w.z1);
  const hits = (x, z, r = 0.3) => !(inWalk(x - r, z - r) && inWalk(x + r, z - r) && inWalk(x - r, z + r) && inWalk(x + r, z + r)) || solids.some(s => x > s.x0 - r && x < s.x1 + r && z > s.z0 - r && z < s.z1 + r);
  function move(o, dx, dz) {
    let nx = o.x + dx, nz = o.z; if (hits(nx, nz)) nx = o.x;
    nz = o.z + dz; if (hits(nx, nz)) nz = o.z;
    o.x = nx; o.z = nz;
  }

  /* 사람 */
  function spawn(id, x, z, a) {
    const isMe = id === "player";
    const r = makePerson(P, id, { female: isMe && G.gender === "f" });
    scene.add(r.group);
    const o = { id, r, group: r.group, x, z, a, sp: 0, mode: "idle" };
    r.group.position.set(x, 0, z); r.group.rotation.y = Math.PI / 2 - a;
    people.push(o); if (isMe) player = o;
    return o;
  }
  const face = (o, t) => { o.a = Math.atan2(t.z - o.z, t.x - o.x); };

  /* 무대 짓기 */
  async function build(fn) {
    if (scene) scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    scene = new THREE.Scene(); solids = []; walk = null; frameFns = []; people = []; followers = []; player = null; goTo = null; marks = []; scrollFn = null;
    camMode = "follow"; camOpt = { h: 4.3, d: 7.8 };
    const S = fn(THREE);
    for (const o of S.objects) scene.add(o);
    solids = S.solids || []; walk = S.walk || null; scrollFn = S.scroll || null;
    scene.background = new THREE.Color(S.sky); scene.fog = new THREE.Fog(S.fog, S.fogNear || 25, S.fogFar || 90);
    if (S.cam) camOpt = Object.assign({}, camOpt, S.cam);
    api.taxi = S.taxi || null; api.boat = S.boat || null;
    if (api.taxi) api.taxi.visible = !!S.taxiVisible;
  }

  /* 걷기: 목표에 닿을 때까지 */
  function walkUntil({ target, reach, marks: mk = [], onStep }) {
    marks = mk;
    return new Promise(resolve => {
      const fn = async () => {
        if (!player) return;
        const tx = target.x ?? target.group.position.x, tz = target.z ?? target.group.position.z;
        if (onStep && !locked) await onStep(player);
        if (!locked && !talking() && Math.hypot(tx - player.x, tz - player.z) < reach) { frameFns = frameFns.filter(f => f !== fn); marks = []; goTo = null; resolve(); }
      };
      frameFns.push(fn);
    });
  }
  function follow(list) { followers = list; trail.length = 0; }
  const trail = [];

  /* 카메라 */
  const camTo = (t, opt) => { camMode = "to"; camT = t; camOpt = Object.assign({ h: 6.2, d: 7.4 }, opt); };
  const camFixed = (pos, look) => { camMode = "fixed"; camFix = { pos, look }; };
  const camFollowBoat = () => { if (api.boat) { camMode = "fixed"; camFix = { pos: { x: api.boat.position.x + 7, y: 3.2, z: api.boat.position.z + 8 }, look: { x: api.boat.position.x, y: 1, z: api.boat.position.z - 2 } }; } };
  const tween = (ms, f) => new Promise(r => { const t0 = performance.now(); const fn = () => { const t = Math.min(1, (performance.now() - t0) / ms); f(t); if (t >= 1) { frameFns = frameFns.filter(x => x !== fn); r(); } }; frameFns.push(fn); });

  /* 매 장면 */
  let last = performance.now(), raf = 0, stopped = false, stepT = 0;
  const camPos = new THREE.Vector3(0, 6, 8), look = new THREE.Vector3();
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!scene) return;
    /* 내 움직임 */
    if (player) {
      let vx = joy.x, vz = joy.z;
      if (keys.has("a") || keys.has("arrowleft")) vx -= 1; if (keys.has("d") || keys.has("arrowright")) vx += 1;
      if (keys.has("w") || keys.has("arrowup")) vz -= 1; if (keys.has("s") || keys.has("arrowdown")) vz += 1;
      if (camOpt.flip && camMode === "follow") { vx = -vx; vz = -vz; }       // 카메라가 반대편에 있으면 조작도 뒤집음
      if (goTo && Math.hypot(vx, vz) < 0.1) {
        const tx = goTo.x ?? goTo.group.position.x, tz = goTo.z ?? goTo.group.position.z, d = Math.hypot(tx - player.x, tz - player.z);
        if (d < 0.9) goTo = null; else { vx = (tx - player.x) / d; vz = (tz - player.z) / d; }
      }
      const l = Math.hypot(vx, vz);
      if (!locked && !talking() && l > 0.12) {
        const s = 2.6 * Math.min(1, l) / Math.max(1, l), ox0 = player.x, oz0 = player.z;
        move(player, vx * s * dt, vz * s * dt);
        player.sp = Math.hypot(player.x - ox0, player.z - oz0) / dt;
        if (player.sp > 0.2) player.a = Math.atan2(vz, vx);
        stepT -= dt * player.sp; if (stepT <= 0 && player.sp > 0.5) { stepT = 1.15; myStep(); }
        const lt = trail[trail.length - 1]; if (!lt || Math.hypot(lt.x - player.x, lt.z - player.z) > 0.25) { trail.push({ x: player.x, z: player.z }); if (trail.length > 80) trail.shift(); }
      } else player.sp = 0;
    }
    /* 따라오기 */
    followers.forEach((f, k) => {
      const back = 5 + k * 4, pt = trail[trail.length - 1 - back];
      if (!pt) { f.sp = 0; return; }
      const d = Math.hypot(pt.x - f.x, pt.z - f.z);
      if (d > 0.3) { const s = Math.min(3.2, d * 2.2); f.x += (pt.x - f.x) / d * s * dt; f.z += (pt.z - f.z) / d * s * dt; f.a = Math.atan2(pt.z - f.z, pt.x - f.x); f.sp = s; } else f.sp = 0;
    });
    /* 사람 그리기 */
    for (const o of people) {
      if (o.group.parent === scene) { o.group.position.set(o.x, 0, o.z); }
      const want = Math.PI / 2 - o.a; let d = want - o.group.rotation.y; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      o.group.rotation.y += d * Math.min(1, dt * 10);
      o.r.update(dt, { speed: o.sp, mode: talking() && o !== player ? "talk" : "idle" });
    }
    for (const f of [...frameFns]) f(dt);
    if (scrollFn) scrollFn(0, dt);
    /* 카메라 */
    if (camMode === "fixed" && camFix) { camPos.set(camFix.pos.x, camFix.pos.y, camFix.pos.z); look.set(camFix.look.x, camFix.look.y, camFix.look.z); camera.position.lerp(camPos, Math.min(1, dt * 4)); }
    else {
      const f = camOpt.flip ? -1 : 1;
      const t = camMode === "to" ? camT : player ? { x: player.x + 1.2, z: player.z - 1.2 * f } : { x: 0, z: 0 };
      camPos.set(t.x, camOpt.h, t.z + camOpt.d * f); look.set(t.x, 1.3, t.z - 1.5 * f);
      camera.position.lerp(camPos, Math.min(1, dt * (camMode === "to" ? 1.6 : 5)));
    }
    camera.lookAt(look);
    /* 빛 점 */
    /* 화면 밖이면 가장자리에 화살표로 */
    const vw = innerWidth, vh = innerHeight, pad = 34;
    const want = (locked || talking()) ? [] : marks.map((m, k) => {
      const p = project(m.x ?? m.group.position.x, m.group ? 2.1 : 0.5, m.z ?? m.group.position.z);
      const inside = p.on && p.x > pad && p.x < vw - pad && p.y > pad && p.y < vh - pad;
      return { k, x: Math.max(pad, Math.min(vw - pad, p.x)), y: Math.max(pad, Math.min(vh - pad, p.y)), edge: !inside, ang: Math.atan2(p.y - vh / 2, p.x - vw / 2) };
    });
    if (markBox.childElementCount !== want.length) markBox.innerHTML = want.map(w => `<button class="mark" data-k="${w.k}" aria-label="가기"></button>`).join("");
    [...markBox.children].forEach((el, j) => { const w = want[j]; if (!w) return; el.style.transform = `translate(${w.x}px, ${w.y}px)`; el.classList.toggle("edge", w.edge); el.style.setProperty("--ang", w.ang + "rad"); });
    /* 그리기 */
    post.uniforms.uTime.value = now / 1000;
    renderer.setRenderTarget(rt); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(postScene, postCam);
  }
  raf = requestAnimationFrame(loop);

  if (new URLSearchParams(location.search).has("debug")) window.__E = () => ({ player: player && { x: player.x, z: player.z }, goTo: !!goTo, marks: marks.length, locked, talking: talking(), keys: [...keys], joy });
  return Object.assign(api, {
    build, spawn, face, walkUntil, follow, camTo, camFixed, camFollowBoat, tween,
    onFrame: f => frameFns.push(f), scroll: v => scrollFn && scrollFn(v, 0),
    lockInput: v => { locked = v; if (v) { goTo = null; keys.clear(); } },
    stop: () => { cancelAnimationFrame(raf); stopped = true; },
    dispose: () => { cancelAnimationFrame(raf); removeEventListener("resize", resize); removeEventListener("keydown", kd); removeEventListener("keyup", ku); renderer.dispose(); }
  });
}

/* ═════════════════ 무대들 ═════════════════ */
/* 글자 간판 */
function signTex(text, { bg = "#1d3d6a", fg = "#f4f0e6", w = 512, h = 96, font = 54 } = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = `800 ${font}px "Noto Sans KR", sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, h / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; return t;
}
function noiseTex(base, spread, n = 64, seed = 1) {
  const c = document.createElement("canvas"); c.width = c.height = n; const g = c.getContext("2d"); let s = seed;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = (r() - 0.5) * spread; g.fillStyle = `rgb(${base[0] + v},${base[1] + v},${base[2] + v})`; g.fillRect(x, y, 1, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function plane(w, d, mat, x = 0, z = 0, y = 0) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; return m; }
function lights(objs, { sky, ground, hemiI = 1, sunC, sunI, sunPos, amb = 0.4 }) {
  const h = new THREE.HemisphereLight(sky, ground, hemiI);
  const s = new THREE.DirectionalLight(sunC, sunI); s.position.set(...sunPos); s.castShadow = true;
  s.shadow.mapSize.set(1024, 1024); Object.assign(s.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 }); s.shadow.bias = -0.002;
  objs.push(h, s, s.target, new THREE.AmbientLight(0xffffff, amb));
  return s;
}
function tree(x, z, s = 1, col = 0x3c5a34) {
  const g = new THREE.Group();
  const tr = box(0.22 * s, 1.2 * s, 0.22 * s, lam({ color: 0x5a4030 })); tr.position.y = 0.6 * s; g.add(tr);
  for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry((1.1 - k * 0.25) * s, 1.2 * s, 7), lam({ color: col })); c.position.y = (1.4 + k * 0.6) * s; g.add(c); }
  g.position.set(x, 0, z); g.traverse(o => { if (o.isMesh) { o.castShadow = true; } }); return g;
}
function car({ body = 0xe8e6e0, roof = "TAXI" } = {}) {
  const g = new THREE.Group(), m = lam({ color: body }), dark = lam({ color: 0x1a1e26 }), glass = lam({ color: 0x2a3a50 });
  const b = box(4.2, 0.8, 1.8, m); b.position.y = 0.6; g.add(b);
  const c = box(2.4, 0.7, 1.6, m); c.position.set(-0.2, 1.35, 0); g.add(c);
  const w1 = box(2.42, 0.5, 1.62, glass); w1.position.set(-0.2, 1.38, 0); w1.scale.set(1, 1, 1.001); g.add(w1);
  for (const [x, z] of [[1.3, 0.9], [-1.3, 0.9], [1.3, -0.9], [-1.3, -0.9]]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.25, 10), dark); wh.rotation.x = Math.PI / 2; wh.position.set(x, 0.36, z); g.add(wh); }
  if (roof) { const r = box(0.7, 0.26, 0.4, new THREE.MeshBasicMaterial({ map: signTex(roof, { bg: "#f0b830", fg: "#222", w: 128, h: 48, font: 30 }) })); r.position.set(-0.2, 1.84, 0); g.add(r); }
  const hl = box(0.06, 0.18, 1.4, new THREE.MeshBasicMaterial({ color: 0xfff0c0 })); hl.position.set(-2.12, 0.7, 0); g.add(hl);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* 2. 대서버스터미널 · 오후 3시 */
function sceneTerminal() {
  const O = [];
  lights(O, { sky: 0xdfe8ff, ground: 0x8a7a66, hemiI: 1.1, sunC: 0xfff0d8, sunI: 2.2, sunPos: [-14, 22, 12] });
  O.push(plane(80, 40, lam({ map: (() => { const t = noiseTex([150, 148, 142], 20, 64, 3); t.repeat.set(20, 10); return t; })() }), 0, -8));
  O.push(plane(80, 7, lam({ map: (() => { const t = noiseTex([58, 60, 66], 12, 64, 5); t.repeat.set(20, 2); return t; })() }), 0, 5.2, 0.01));
  for (let x = -38; x < 40; x += 4) O.push(plane(2, 0.16, new THREE.MeshBasicMaterial({ color: 0xe8e0c0 }), x, 5.2, 0.02));
  O.push(plane(80, 0.25, lam({ color: 0xb8b4aa }), 0, 1.75, 0.03));
  /* 터미널 건물 */
  const wall = lam({ color: 0xe6dcc8 }), stripe = lam({ color: 0x2c5a96 }), glass = lam({ color: 0x3a5070 });
  const bld = box(22, 6, 6, wall); bld.position.set(-1, 3, -10); O.push(bld);
  const st = box(22.1, 0.6, 6.1, stripe); st.position.set(-1, 4.6, -10); O.push(st);
  for (let x = -10; x <= 8; x += 3) { const g = box(2.2, 2.6, 0.1, glass); g.position.set(x, 1.5, -6.95); O.push(g); }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.3), new THREE.MeshBasicMaterial({ map: signTex("대서버스터미널") })); sign.position.set(-1, 5.6, -6.93); O.push(sign);
  const can = box(8, 0.25, 2.2, lam({ color: 0x8a8f98 })); can.position.set(-1, 3.2, -6); O.push(can);
  /* 정류장 지붕, 의자, 화분, 가로등, 버스 */
  const shel = box(5, 0.15, 1.6, lam({ color: 0x5f6f80 })); shel.position.set(8, 2.4, 0.4); O.push(shel);
  for (const x of [5.8, 10.2]) { const p = box(0.12, 2.4, 0.12, lam({ color: 0x40464e })); p.position.set(x, 1.2, 0.9); O.push(p); }
  for (const [x, z] of [[2.6, -3.2], [8, 0.1], [-4, -3.4]]) { const b = box(1.8, 0.45, 0.5, lam({ color: 0x8a5a3a })); b.position.set(x, 0.45, z); O.push(b); }
  for (const x of [-12, -6, 12]) O.push(tree(x, -5.2, 0.8, 0x4d7040));
  for (const x of [-14, 0, 14]) { const p = box(0.14, 4.2, 0.14, lam({ color: 0x3a3e46 })); p.position.set(x, 2.1, 1.4); O.push(p); }
  const bus = car({ body: 0x2f6fb8, roof: "" }); bus.scale.set(2.4, 1.6, 1.25); bus.position.set(-16, 0, 4.4); O.push(bus);
  const taxi = car(); taxi.rotation.y = 0; O.push(taxi);
  O.forEach(o => o.traverse && o.traverse(m => { if (m.isMesh && !m.receiveShadow) m.castShadow = true; }));
  return { objects: O, sky: 0xbfd4ea, fog: 0xc8d6e6, fogNear: 30, fogFar: 110, walk: [{ x0: -24, x1: 22, z0: -6.6, z1: 3.2 }],
    solids: [{ x0: 1.6, x1: 3.6, z0: -3.5, z1: -2.9 }, { x0: 7, x1: 9, z0: -0.2, z1: 0.4 }, { x0: -5, x1: -3, z0: -3.7, z1: -3.1 }], taxi };
}

/* 3. 바닷가 도로 (택시) */
function sceneCoast() {
  const O = [];
  lights(O, { sky: 0xffe2c0, ground: 0x6a5a4a, hemiI: 1.0, sunC: 0xffc890, sunI: 2.0, sunPos: [20, 12, -20] });
  const road = plane(400, 6, lam({ color: 0x3e4048 }), 0, 0, 0.01); O.push(road);
  const sea = plane(400, 120, lam({ color: 0x4a7aa0 }), 0, -64, -0.3); O.push(sea);
  O.push(plane(400, 4, lam({ color: 0xc8b890 }), 0, -5, -0.05));
  O.push(plane(400, 40, lam({ color: 0x5a7a40 }), 0, 23, 0));
  const lines = new THREE.Group(); for (let x = -200; x < 200; x += 5) lines.add(plane(2.4, 0.14, new THREE.MeshBasicMaterial({ color: 0xf0d060 }), x, 0, 0.02)); O.push(lines);
  const rail = new THREE.Group(); for (let x = -200; x < 200; x += 3) { const p = box(0.12, 0.7, 0.12, lam({ color: 0xd0d0d0 })); p.position.set(x, 0.35, -3.2); rail.add(p); } const bar = box(400, 0.12, 0.08, lam({ color: 0xd8d8d8 })); bar.position.set(0, 0.62, -3.2); rail.add(bar); O.push(rail);
  const trees = new THREE.Group(); for (let x = -200; x < 200; x += 7) trees.add(tree(x + Math.sin(x) * 2, 6 + Math.cos(x) * 2, 1.1)); O.push(trees);
  const hills = new THREE.Group(); for (let k = 0; k < 6; k++) { const h = new THREE.Mesh(new THREE.ConeGeometry(14 + k * 2, 8 + (k % 3) * 3, 6), lam({ color: 0x5a6a80 })); h.position.set(-60 + k * 26, 2, -90); hills.add(h); } O.push(hills);
  const taxi = car(); taxi.rotation.y = Math.PI; taxi.position.set(0, 0, 1.4); O.push(taxi);
  const movers = [lines, rail, trees];
  return { objects: O, sky: 0xf0c8a0, fog: 0xe8c8a8, fogNear: 30, fogFar: 140, taxi, taxiVisible: true,
    scroll: v => { for (const g of movers) { g.position.x += v; if (g.position.x > 40) g.position.x -= 40; } } };
}

/* 4. 대서항 · 오후 5시 */
function boatMesh() {
  const g = new THREE.Group();
  const hull = box(2.6, 1.0, 6.4, lam({ color: 0xe8e4dc })); hull.position.y = 0.3; g.add(hull);
  const stripe = box(2.62, 0.22, 6.42, lam({ color: 0x2a5a8a })); stripe.position.y = 0.0; g.add(stripe);
  const cab = box(2.0, 1.3, 2.2, lam({ color: 0xf0ece4 })); cab.position.set(0, 1.4, 0.6); g.add(cab);
  const win = box(2.02, 0.4, 2.0, lam({ color: 0x2a3a50 })); win.position.set(0, 1.7, 0.6); g.add(win);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(1.3, 1.6, 4), lam({ color: 0xe8e4dc })); bow.rotation.x = -Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.scale.set(1, 1, 0.55); bow.position.set(0, 0.3, -3.9); g.add(bow);
  const lamp = new THREE.PointLight(0xffd090, 1.6, 7, 2); lamp.position.set(0, 2.4, 0.6); g.add(lamp);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function scenePier() {
  const O = [];
  lights(O, { sky: 0xffd8b0, ground: 0x5a4a40, hemiI: 0.9, sunC: 0xff9a50, sunI: 2.1, sunPos: [-30, 9, 30] });
  O.push(plane(60, 16, lam({ map: (() => { const t = noiseTex([132, 128, 122], 18, 64, 7); t.repeat.set(14, 4); return t; })() }), 0, -6));
  const sea = plane(300, 200, lam({ color: 0x3d6488 }), 0, 100, -0.35); O.push(sea);
  /* 나무 선착장 */
  const deck = lam({ map: (() => { const t = noiseTex([120, 92, 66], 26, 64, 9); t.repeat.set(2, 6); return t; })() });
  const pier = box(3, 0.3, 12, deck); pier.position.set(6, -0.15, 8); pier.receiveShadow = true; O.push(pier);
  for (let z = 3; z <= 14; z += 2.2) for (const x of [4.6, 7.4]) { const p = box(0.24, 1.4, 0.24, lam({ color: 0x4a3a2a })); p.position.set(x, -0.5, z); O.push(p); }
  const boat = boatMesh(); boat.position.set(9.4, -0.2, 9); O.push(boat);
  /* 간판·매표소·말뚝·상자 */
  const post = box(0.16, 3, 0.16, lam({ color: 0x3a3e46 })); post.position.set(-2, 1.5, 1); O.push(post);
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), new THREE.MeshBasicMaterial({ map: signTex("대서항", { bg: "#2a4a6a" }), side: THREE.DoubleSide })); sg.position.set(-2, 3.1, 1); sg.rotation.y = Math.PI; O.push(sg);
  const tk = box(3, 2.6, 2.4, lam({ color: 0xd8d0c0 })); tk.position.set(-8, 1.3, -10); O.push(tk);
  const tks = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), new THREE.MeshBasicMaterial({ map: signTex("매표소 · 봉두도 막배 18:00", { bg: "#d8d0c0", fg: "#2a2a2a", w: 512, h: 96, font: 40 }) })); tks.position.set(-8, 2.2, -8.79); O.push(tks);
  const tks2 = tks.clone(); tks2.position.z = -11.21; tks2.rotation.y = Math.PI; O.push(tks2);
  for (const x of [-12, -6, 0, 3]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.5, 8), lam({ color: 0x2a2c30 })); b.position.set(x, 0.25, 1.6); O.push(b); }
  for (const [x, z] of [[-14, -4], [-13.2, -4.6], [10, -6]]) { const c = box(1, 0.8, 1, lam({ color: 0x7a5a3a })); c.position.set(x, 0.4, z); O.push(c); }
  const hills = new THREE.Group(); for (let k = 0; k < 4; k++) { const h = new THREE.Mesh(new THREE.ConeGeometry(16 + k * 3, 10 + k * 2, 6), lam({ color: 0x4a5870 })); h.position.set(-30 + k * 22, 3, 90 + k * 6); hills.add(h); } O.push(hills);
  return { objects: O, sky: 0xf2b88a, fog: 0xe8b090, fogNear: 30, fogFar: 150, walk: [{ x0: -18, x1: 14, z0: -10, z1: 1.9 }, { x0: 4.6, x1: 7.4, z0: 1, z1: 13.8 }], cam: { flip: true, h: 4.6, d: 8.4 },
    solids: [{ x0: -9.6, x1: -6.4, z0: -11.4, z1: -8.6 }, { x0: -14.6, x1: -12.6, z0: -5.2, z1: -3.4 }, { x0: 9.4, x1: 10.6, z0: -6.6, z1: -5.4 }], boat,
  };
}

/* 5. 바다 (배) */
function sceneSea() {
  const O = [];
  lights(O, { sky: 0xffc8a0, ground: 0x3a4a5a, hemiI: 0.9, sunC: 0xff8a40, sunI: 1.8, sunPos: [-20, 6, -40] });
  O.push(plane(600, 600, lam({ color: 0x35587c }), 0, -100, -0.3));
  const boat = boatMesh(); boat.position.set(0, -0.2, 0); O.push(boat);
  const isl = new THREE.Group();
  for (let k = 0; k < 5; k++) { const h = new THREE.Mesh(new THREE.ConeGeometry(10 + k * 3, 9 + (k % 2) * 6, 7), lam({ color: k % 2 ? 0x3a4a3e : 0x46584a })); h.position.set(-14 + k * 9, 2, -70 - k * 3); isl.add(h); }
  const sch = box(6, 2.4, 2, lam({ color: 0xbab0a0 })); sch.position.set(4, 7.5, -66); isl.add(sch);
  O.push(isl);
  return { objects: O, sky: 0xe8a07a, fog: 0xd89a80, fogNear: 30, fogFar: 160, boat };
}

/* 6. 봉두도 섬 길 · 오후 5시 20분 */
function scenePath() {
  const O = [];
  lights(O, { sky: 0x9a8ab8, ground: 0x3a2e28, hemiI: 0.8, sunC: 0xff7a40, sunI: 1.5, sunPos: [-30, 7, 14], amb: 0.25 });
  O.push(plane(140, 60, lam({ map: (() => { const t = noiseTex([70, 84, 52], 26, 64, 11); t.repeat.set(30, 14); return t; })() }), 20, 0));
  O.push(plane(70, 2.6, lam({ map: (() => { const t = noiseTex([128, 108, 84], 30, 64, 13); t.repeat.set(20, 1); return t; })() }), 18, 0, 0.02));
  const stone = lam({ color: 0x6a6660 });
  for (let x = -4; x < 36; x += 1.2) for (const z of [-2.2, 2.2]) { if (Math.sin(x * 3 + z) > 0.85) continue; const s = box(1.1, 0.5 + Math.abs(Math.sin(x * 7)) * 0.4, 0.5, stone); s.position.set(x, 0.3, z); O.push(s); }
  for (let x = -6; x < 40; x += 5) { O.push(tree(x + 1, -5 - Math.abs(Math.sin(x)) * 3, 1.3, 0x2e4030)); O.push(tree(x + 3, 5 + Math.abs(Math.cos(x)) * 3, 1.2, 0x34483a)); }
  /* 빈집 */
  const house = new THREE.Group(); const hw = box(5, 2.4, 4, lam({ color: 0x9a8a78 })); hw.position.y = 1.2; house.add(hw);
  const rf = new THREE.Mesh(new THREE.ConeGeometry(4.2, 1.6, 4), lam({ color: 0x3a4a5a })); rf.rotation.y = Math.PI / 4; rf.scale.set(1.2, 1, 0.95); rf.position.y = 3.2; house.add(rf);
  house.position.set(16, 0, -7); O.push(house);
  /* 전봇대 */
  for (const x of [4, 20, 34]) { const p = box(0.18, 5, 0.18, lam({ color: 0x4a3a2c })); p.position.set(x, 2.5, -3); O.push(p); }
  /* 나무 팻말 */
  const sgp = box(0.12, 1.4, 0.12, lam({ color: 0x5a4030 })); sgp.position.set(26, 0.7, -1.8); O.push(sgp);
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.6), new THREE.MeshBasicMaterial({ map: signTex("봉두초등학교 →", { bg: "#6a4a30", fg: "#f0e6d0", w: 512, h: 112, font: 50 }), side: THREE.DoubleSide })); sg.position.set(26, 1.5, -1.8); O.push(sg);
  /* 학교 정문과 건물 */
  const gp = lam({ color: 0x7a7470 });
  for (const z of [-2.2, 2.2]) { const p = box(0.7, 2.2, 0.7, gp); p.position.set(40, 1.1, z); O.push(p); }
  const gname = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.8), new THREE.MeshBasicMaterial({ map: (() => { const c = document.createElement("canvas"); c.width = 64; c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#e8e0d0"; g.fillRect(0, 0, 64, 256); g.fillStyle = "#222"; g.font = "800 34px 'Noto Sans KR'"; g.textAlign = "center"; [..."봉두초등학교"].forEach((ch, k) => g.fillText(ch, 32, 36 + k * 40)); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })() }));
  gname.position.set(39.64, 1.2, 2.2); gname.rotation.y = -Math.PI / 2; O.push(gname);
  const gateM = lam({ color: 0x5a3a2a });
  for (let k = 0; k < 9; k++) { const bar = box(0.06, 1.6, 0.06, gateM); bar.position.set(40, 0.9, -1.8 + k * 0.22); O.push(bar); }
  const top = box(0.08, 0.08, 2, gateM); top.position.set(40, 1.7, -0.9); O.push(top);
  const school = new THREE.Group(); const wallM = lam({ color: 0xc8bca8 });
  const b1 = box(6, 5.4, 20, wallM); b1.position.set(52, 2.7, 0); school.add(b1);
  for (let z = -8; z <= 8; z += 2.6) for (const y of [1.6, 4]) { const soot = Math.abs(z + 3) < 2 && y > 3; const w = box(0.08, 1.1, 1.6, lam({ color: soot ? 0x111111 : 0x2a3446 })); w.position.set(48.96, y, z); school.add(w); }
  const rf2 = box(6.6, 0.4, 20.6, lam({ color: 0x5a5a5a })); rf2.position.set(52, 5.6, 0); school.add(rf2);
  O.push(school);
  return { objects: O, sky: 0x6a5a88, fog: 0x7a6488, fogNear: 22, fogFar: 80, walk: [{ x0: -6, x1: 43, z0: -1.7, z1: 1.7 }] };
}
