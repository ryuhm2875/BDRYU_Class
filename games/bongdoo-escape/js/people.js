/* ──────────────────────────────────────────────────────────────
   6시의 섬 · 사람 모델 (Quaternius Universal Animation Library 1·2, CC0)
   - 회색 마네킹 몸에 뼈대별로 색을 칠해 교복을 입힘 (머리·손=피부, 몸통·팔=상의 …)
   - 머리는 기존 큰 얼굴 공 + 머리카락을 머리뼈에 붙여 2~3등신 느낌 유지
   - 동작: 서기·걷기·뛰기·웅크리기·말하기·손전등·겁먹기 / ‘그것’은 좀비 걸음
   - 모델은 +z 쪽을 봄 (rig.js 와 같은 약속)
   ────────────────────────────────────────────────────────────── */
import * as THREE from "../vendor/three.module.min.js";
import { GLTFLoader } from "../vendor/GLTFLoader.js";
import * as SkeletonUtils from "../vendor/SkeletonUtils.js";
import { LOOKS, lam, hexc, addHair, addProp } from "./rig.js?v=202611191038";
import { bakeFace, toTex } from "./textures.js?v=202611191038";

const BASE = new URL("../assets/models/", import.meta.url).href;
const FEMALE = new Set(["sua", "haeun", "seoyul"]);
const SKIRT = { sua: [116, 42, 54], haeun: [52, 56, 74], seoyul: [70, 64, 78] };
const HEIGHT = { player: 1.5, minjae: 1.55, sua: 1.48, haeun: 1.46, taeo: 1.36, seoyul: 1.5, police: 1.72, captain: 1.66, it: 2.05, decoy: 1.85 };

let lib = null;
/* 두 파일 받기. 실패하면 null → world 는 예전 인형을 그대로 씀 */
export function loadPeople() {
  if (lib) return lib;
  const L = new GLTFLoader();
  const get = f => new Promise((ok, no) => L.load(BASE + f, ok, undefined, no));
  lib = Promise.all([get("people_m.glb"), get("people_f.glb")]).then(([m, f]) => {
    const clips = {}; for (const c of m.animations) clips[c.name] = c;
    return { m: m.scene, f: f.scene, clips };
  }).catch(e => { console.warn("사람 모델을 못 받음", e); return null; });
  return lib;
}

/* 바깥선: 뒷면을 법선 방향으로 조금 부풀린 검은 껍질 (뼈대 따라 같이 움직임) */
function outlineMat(width, ps1) {
  const m = new THREE.MeshBasicMaterial({ color: 0x050507, side: THREE.BackSide });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>\n transformed += normalize(normal) * ${width.toFixed(4)};`);
  };
  m.customProgramCacheKey = () => "outline" + width.toFixed(4);
  if (ps1) ps1(m);
  m.customProgramCacheKey = () => "outline-ps1" + width.toFixed(4);
  return m;
}

/* 정점 색 재질: 어둠 속에서도 형태가 읽히게 자기 색을 조금 스스로 냄 (rig.js 와 같은 느낌) */
function bodyMat(lift, ps1) {
  const m = lam({ vertexColors: true, color: 0xffffff });
  m.emissive = new THREE.Color(lift, lift, lift);
  m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace("vec3 totalEmissiveRadiance = emissive;", "vec3 totalEmissiveRadiance = emissive * vColor;"); };
  if (ps1) ps1(m);
  m.customProgramCacheKey = () => "body-vc";
  return m;
}

/* 뼈 이름 → 옷 부위 */
function partOf(bone) {
  if (/^Head|^neck/.test(bone)) return "skin";
  if (/^hand|^index|^middle|^pinky|^ring|^thumb/.test(bone)) return "skin";
  if (/^spine|^clavicle|^upperarm|^lowerarm/.test(bone)) return "top";
  if (/^pelvis|^root/.test(bone)) return "hip";
  if (/^thigh/.test(bone)) return "thigh";
  if (/^calf/.test(bone)) return "calf";
  return "shoe";
}

/* 정점마다 가장 무게가 큰 뼈를 골라 색칠 */
function paint(mesh, pal) {
  const g = mesh.geometry = mesh.geometry.clone();
  const ji = g.attributes.skinIndex, jw = g.attributes.skinWeight, n = g.attributes.position.count;
  const bones = mesh.skeleton.bones.map(b => b.name);
  const col = new Float32Array(n * 3);
  const pos = g.attributes.position;
  for (let i = 0; i < n; i++) {
    let best = 0, bw = -1;
    for (let k = 0; k < 4; k++) { const w = jw.getComponent(i, k); if (w > bw) { bw = w; best = ji.getComponent(i, k); } }
    let part = partOf(bones[best] || "");
    const c = pal[part] || pal.top;
    /* 상의 아랫단·소매 끝을 조금 어둡게 → 주름 느낌 */
    const shade = part === "top" ? 0.92 + (Math.sin(pos.getY(i) * 40) * 0.04) : 1;
    col[i * 3] = c.r * shade; col[i * 3 + 1] = c.g * shade; col[i * 3 + 2] = c.b * shade;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
}

function palette(L, it) {
  const C = a => hexc(a);
  if (it) { const p = new THREE.Color(0xd8d0c2), j = new THREE.Color(0x9a9184); return { skin: p, top: p, hip: j, thigh: p, calf: p, shoe: j }; }
  const top = C(L.jacket), legs = C(L.legs), skin = C(L.skin);
  return L.skirt
    ? { skin, top, hip: C(L.skirtC), thigh: skin, calf: legs, shoe: C(L.shoe || [28, 24, 22]) }
    : { skin, top, hip: legs, thigh: legs, calf: legs, shoe: C(L.shoe || [28, 24, 22]) };
}

/* ---------- 학생·경찰 ---------- */
export function makePerson(P, id, { jacket = null, ps1, female = false } = {}) {
  const L = Object.assign({}, LOOKS[id] || LOOKS.minjae); if (jacket) L.jacket = jacket;
  L.skirtC = SKIRT[id] || L.jacket;
  const src = (FEMALE.has(id) || female) ? P.f : P.m;
  const model = SkeletonUtils.clone(src);
  const root = new THREE.Group(); root.add(model);

  /* 크기 맞추기 + 앞(+z) 확인 */
  const bb = new THREE.Box3().setFromObject(model);
  const k = HEIGHT[id] / (bb.max.y - bb.min.y || 1.8);
  model.scale.setScalar(k); model.position.y = -bb.min.y * k;
  root.updateMatrixWorld(true);
  const bone = n => { let b = null; model.traverse(o => { if (!b && o.isBone && o.name === n) b = o; }); return b; };
  const wp = o => o.getWorldPosition(new THREE.Vector3());
  if (wp(bone("ball_l")).z < wp(bone("foot_l")).z) { model.rotation.y = Math.PI; root.updateMatrixWorld(true); }

  const pal = palette(L);
  const mat = bodyMat(0.35, ps1);
  const OL = outlineMat(0.022 / k, ps1);
  const skins = []; model.traverse(o => { if (o.isSkinnedMesh) skins.push(o); });
  for (const s of skins) {
    paint(s, pal); s.material = mat; s.castShadow = true; s.frustumCulled = false;
    const h = new THREE.SkinnedMesh(s.geometry, OL); h.bind(s.skeleton, s.bindMatrix); h.frustumCulled = false; h.userData.hull = true;
    s.parent.add(h);
  }

  /* 머리: 큰 얼굴 공 + 머리카락 (rig.js 와 같은 부품) */
  const head = bone("Head"), hand = bone("hand_r");
  const hp = wp(head);
  const R = 0.2 * (HEIGHT[id] / 1.5);                         // 얼굴 공 반지름
  const kk = R / 0.26;
  const neck = new THREE.Group(); neck.position.set(hp.x, hp.y + R * 0.15 - 0.2 * kk, hp.z); neck.scale.setScalar(kk); root.add(neck);
  const faces = { open: toTex(bakeFace(L.skin, "open")), closed: toTex(bakeFace(L.skin, "closed")), wide: toTex(bakeFace(L.skin, "wide")) };
  const faceM = lam({ map: faces.open, flatShading: false }); faceM.emissiveMap = faces.open; faceM.emissive = new THREE.Color(0.22, 0.22, 0.22);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 9), faceM); ball.position.y = 0.2; neck.add(ball);
  const hairM = lam({ color: 0x2a1d18 }), cloth = lam({ color: hexc(L.jacket) });
  addHair(neck, L, hairM, cloth);
  /* 소품: 손에 드는 건 오른손에, 나머지는 머리·몸에 */
  const handG = new THREE.Group(); { const p = wp(hand); handG.position.set(p.x, p.y + 0.19 * kk * 0.6, p.z); handG.scale.setScalar(kk * 0.6); root.add(handG); }
  const torsoG = new THREE.Group(); { const p = wp(bone("spine_02")); torsoG.position.set(p.x, p.y - 0.2 * kk * 0.7, p.z); torsoG.scale.setScalar(kk * 0.7); root.add(torsoG); }
  addProp(L.prop, { torso: torsoG, neck, arms: [{ el: handG }, { el: handG }], head: ball });
  /* 주인공은 손전등을 듦 */
  let torch = null;
  if (id === "player") {
    torch = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.22, 8), lam({ color: 0x2a2a2c })); body.rotation.x = Math.PI / 2; torch.add(body);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.036, 8), new THREE.MeshBasicMaterial({ color: 0xfff2c0 })); lens.position.z = 0.111; torch.add(lens);
    const p = wp(hand); torch.position.set(p.x, p.y - 0.03, p.z + 0.08); root.add(torch);
  }
  /* 치마 · 넥타이 */
  const hs = HEIGHT[id] / 1.5;
  let skirt = null, tie = null;
  if (L.skirt) {
    const p = wp(bone("pelvis"));
    skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * hs, 0.24 * hs, 0.26 * hs, 10, 1, true), lam({ color: hexc(L.skirtC), side: THREE.DoubleSide }));
    skirt.position.set(p.x, p.y - 0.06 * hs, p.z); root.add(skirt);
  }
  if (id !== "player" && id !== "police") {
    const p = wp(bone("spine_03")), fwd = 0.12 * hs * (FEMALE.has(id) ? 1.12 : 1);
    tie = new THREE.Group(); tie.position.set(p.x, p.y + 0.02 * hs, p.z + fwd); root.add(tie);
    const shirt = new THREE.Mesh(new THREE.CircleGeometry(0.06 * hs, 3), lam({ color: 0xe8e4da })); shirt.rotation.z = -Math.PI / 2; shirt.position.y = 0.05 * hs; tie.add(shirt);
    const tt = new THREE.Mesh(new THREE.BoxGeometry(0.035 * hs, 0.16 * hs, 0.012), lam({ color: hexc(L.tie) })); tt.position.set(0, -0.02 * hs, 0.004); tie.add(tt);
  }
  /* 붙인 부품들 그림자·PS1 */
  for (const g of [neck, handG, torsoG, torch, skirt, tie].filter(Boolean)) g.traverse(o => { if (o.isMesh) { o.castShadow = true; if (ps1 && o.material !== OL) ps1(o.material); } });
  head.attach(neck); hand.attach(handG); bone("spine_03").attach(torsoG); if (torch) hand.attach(torch);
  if (skirt) bone("pelvis").attach(skirt); if (tie) bone("spine_03").attach(tie);
  /* 얼굴 공 바깥선 */
  { const h = new THREE.Mesh(ball.geometry, new THREE.MeshBasicMaterial({ color: 0x050507, side: THREE.BackSide })); h.scale.setScalar(1.08); h.userData.hull = true; ball.add(h); }

  /* ---------- 동작 ---------- */
  const mixer = new THREE.AnimationMixer(model);
  const acts = {};
  const act = n => acts[n] || (acts[n] = P.clips[n] ? mixer.clipAction(P.clips[n]) : null);
  let cur = null, curName = "", t = Math.random() * 10, blinkT = 2 + Math.random() * 3, frozenAt = 0;
  function go(name, fade = 0.25) {
    if (name === curName) return cur;
    const a = act(name); if (!a) return cur;
    a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play();
    if (cur) cur.crossFadeTo(a, fade, false);
    cur = a; curName = name; return a;
  }
  const idleName = { police: "foldArms", seoyul: "phone" }[id] || (id === "player" ? "torch" : "idle");
  go(idleName, 0); mixer.update(Math.random() * 2);

  function update(dt, st = {}) {
    t += dt;
    const sp = st.speed || 0, mode = st.mode || "idle";
    let a;
    if (mode === "frozen") { a = go("guard", 0.15); }
    else if (mode === "hide") a = go(sp > 0.3 ? "crouchWalk" : "crouch", 0.2);
    else if (sp > 2.9) { a = go("run"); a.timeScale = sp / 3.4; }
    else if (sp > 0.25) { a = go("walk"); a.timeScale = Math.max(0.6, sp / 1.25); }
    else if (mode === "scared") a = go("guard", 0.2);
    else if (mode === "talk") a = go("talk");
    else a = go(idleName, 0.35);
    if (a && !/walk|run|crouchWalk/i.test(curName)) a.timeScale = 1;
    if (mode === "frozen") { if (!frozenAt) frozenAt = 1; } else frozenAt = 0;
    mixer.update(frozenAt ? 0 : dt);
    /* 겁먹으면 덜덜, 굳으면 크게 덜덜 */
    model.position.x = mode === "frozen" ? (Math.random() - 0.5) * 0.03 : mode === "scared" ? (Math.random() - 0.5) * 0.01 : 0;
    if (st.lookAt != null) neck.rotation.y = st.lookAt;
    /* 눈 깜빡임 */
    blinkT -= dt;
    let f = (mode === "scared" || mode === "frozen") ? "wide" : "open";
    if (blinkT < 0) { f = "closed"; if (blinkT < -0.12) blinkT = 2 + Math.random() * 3.5; }
    if (faceM.map !== faces[f]) { faceM.map = faceM.emissiveMap = faces[f]; faceM.needsUpdate = true; }
  }
  return { group: root, update, height: HEIGHT[id], head: ball, torch, glb: true };
}

/* ---------- ‘그것’ · 미끼 마네킹: 얼굴 없는 키 큰 마네킹, 좀비 걸음 ---------- */
export function makeThing(P, { ps1, decoy = false } = {}) {
  const model = SkeletonUtils.clone(P.m);
  const root = new THREE.Group(); root.add(model);
  const hgt = HEIGHT[decoy ? "decoy" : "it"];
  const bb = new THREE.Box3().setFromObject(model); const k = hgt / (bb.max.y - bb.min.y || 1.8);
  model.scale.set(k * 0.92, k, k * 0.92); model.position.y = -bb.min.y * k;
  root.updateMatrixWorld(true);
  let foot = null, ballB = null; model.traverse(o => { if (o.name === "foot_l") foot = o; if (o.name === "ball_l") ballB = o; });
  if (ballB.getWorldPosition(new THREE.Vector3()).z < foot.getWorldPosition(new THREE.Vector3()).z) model.rotation.y = Math.PI;
  const mat = bodyMat(0.3, ps1);
  const OL = outlineMat(0.02 / k, ps1);
  model.traverse(s => {
    if (!s.isSkinnedMesh) return;
    paint(s, palette(null, true)); s.material = mat; s.castShadow = true; s.frustumCulled = false;
    const h = new THREE.SkinnedMesh(s.geometry, OL); h.bind(s.skeleton, s.bindMatrix); h.frustumCulled = false; h.userData.hull = true; s.parent.add(h);
  });
  const mixer = new THREE.AnimationMixer(model);
  const A = n => mixer.clipAction(P.clips[n]);
  const walk = A("zWalk"), idle = A("zIdle"), scratch = A("zScratch"), up = A("getUp");
  up.setLoop(THREE.LoopOnce, 1); up.clampWhenFinished = true;
  let cur = null, name = "", snap = 0, acc = 0, lying = false;
  function go(n, a, fade = 0.3) { if (name === n) return a; a.reset().play(); if (cur) cur.crossFadeTo(a, fade, false); cur = a; name = n; return a; }
  if (decoy) { go("idle", idle, 0); mixer.update(0.7); }
  else go("walk", walk, 0);
  function update(dt, { speed = 1, alert = false, off = false } = {}) {
    if (decoy) return;                                  // 미끼는 그대로 서 있음 (world 가 홱 돌림)
    if (off) {                                          // 쓰러져 있음: 일어나기 첫 장면에서 멈춤
      if (!lying) { lying = true; go("down", up, 0); up.time = 0; up.paused = true; mixer.update(0); }
      return;
    }
    if (lying) { lying = false; up.paused = false; }
    if (speed <= 0) go("idle", idle);
    else if (alert) { go("scratch", scratch, 0.15); scratch.timeScale = 1.3; }
    else { go("walk", walk); walk.timeScale = 0.85 * speed; }
    /* 툭툭 끊기는 움직임: 시간을 모아 두었다가 한 번에 */
    acc += dt; snap -= dt;
    if (snap > 0) return;
    snap = alert ? 0.05 : 0.09 + Math.random() * 0.08;
    mixer.update(acc); acc = 0;
    /* 가끔 고개가 홱 */
    if (Math.random() < 0.04) model.rotation.z = (Math.random() - 0.5) * 0.08; else model.rotation.z *= 0.5;
  }
  return { group: root, update, glb: true, lies: true };
}
