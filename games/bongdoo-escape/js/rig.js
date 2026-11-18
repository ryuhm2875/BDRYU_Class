/* ──────────────────────────────────────────────────────────────
   마지막 배는 6시 · 관절 인형 (2~3등신 로우폴리)
   엉덩이 → 몸통 → 목 → 머리 / 어깨 → 팔꿈치 / 허벅지 → 무릎
   동작은 코드로: 서 있기(숨쉬기·눈 깜빡임) · 걷기 · 숨기 · 겁먹기 · 굳기 · 말하기
   모델은 +z 쪽을 봅니다.
   ────────────────────────────────────────────────────────────── */
import * as THREE from "../vendor/three.module.min.js";
import { bakeFace, bakeUniform, toTex } from "./textures.js?v=202611182020";

/* 어둠 속에서도 형태가 읽히게 자기 색을 조금 스스로 냄 */
export const lam = (o) => {
  const m = new THREE.MeshLambertMaterial(Object.assign({ flatShading: true }, o));
  if (!o.emissive) { m.emissive = (o.color ? new THREE.Color(o.color) : new THREE.Color(0x888888)).multiplyScalar(0.16); }
  return m;
};
const OUT = new THREE.MeshBasicMaterial({ color: 0x050507, side: THREE.BackSide });
/* 바깥선: 뒷면만 검게, 살짝 크게 */
export function outline(root, k = 0.022) {
  const list = []; root.traverse(o => { if (o.isMesh && !o.userData.noOutline) list.push(o); });
  for (const o of list) {
    const h = new THREE.Mesh(o.geometry, OUT); h.userData.noOutline = true; h.userData.hull = true;
    o.geometry.computeBoundingSphere();
    const r = o.geometry.boundingSphere.radius || 0.1;
    h.scale.setScalar(1 + k / r); o.add(h);
  }
}
const cap = (r, len, seg = 6) => new THREE.CapsuleGeometry(r, len, 2, seg);
export const hexc = a => new THREE.Color(`rgb(${a[0]},${a[1]},${a[2]})`);

/* 인물 생김새 */
export const LOOKS = {
  player: { skin: [210, 180, 150], jacket: [64, 96, 160], tie: [0, 0, 0], hood: true, hair: "hood", legs: [36, 38, 46], shoe: [220, 220, 214] },
  minjae: { skin: [236, 200, 162], jacket: [38, 48, 78], tie: [60, 110, 180], hair: "short", legs: [42, 44, 56], prop: "camera" },
  sua:    { skin: [240, 206, 172], jacket: [38, 48, 78], tie: [70, 150, 100], hair: "long", skirt: true, legs: [30, 30, 38], prop: "books" },
  haeun:  { skin: [232, 196, 158], jacket: [38, 48, 78], tie: [210, 160, 60], hair: "bob", skirt: true, legs: [30, 30, 38], prop: "headphones" },
  taeo:   { skin: [226, 186, 146], jacket: [38, 48, 78], tie: [140, 90, 190], hair: "cap", legs: [42, 44, 56], prop: "cap", small: true },
  police: { skin: [220, 184, 150], jacket: [34, 48, 88], tie: [40, 40, 60], hair: "cap", legs: [28, 32, 48], prop: "cap" },
  seoyul: { skin: [242, 210, 178], jacket: [38, 48, 78], tie: [210, 70, 90], hair: "pony", skirt: true, legs: [30, 30, 38], prop: "phone" }
};

export function makeRig(id, { jacket = null } = {}) {
  const L = Object.assign({}, LOOKS[id]);
  if (jacket) L.jacket = jacket;
  const S = L.small ? 0.9 : 1;
  const root = new THREE.Group(), hips = new THREE.Group();
  root.add(hips); root.scale.setScalar(S);
  const HIP = 0.55;
  hips.position.y = HIP;

  const skin = lam({ color: hexc(L.skin) });
  const cloth = lam({ map: toTex(bakeUniform(L.jacket, L.tie, { hood: !!L.hood })) });
  const sleeve = lam({ color: hexc(L.jacket).multiplyScalar(0.95) });
  const legM = lam({ color: hexc(L.legs) });
  const shoeM = lam({ color: hexc(L.shoe || [28, 24, 22]) });
  const hairM = lam({ color: 0x2a1d18 });

  /* 다리 */
  const legs = [-1, 1].map(s => {
    const thigh = new THREE.Group(); thigh.position.set(0.09 * s, 0, 0); hips.add(thigh);
    const t = new THREE.Mesh(cap(0.068, 0.16), L.skirt ? skin : legM); t.position.y = -0.12; thigh.add(t);
    const knee = new THREE.Group(); knee.position.y = -0.26; thigh.add(knee);
    const sh = new THREE.Mesh(cap(0.06, 0.14), legM); sh.position.y = -0.1; knee.add(sh);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.2), shoeM); shoe.position.set(0, -0.25, 0.03); knee.add(shoe);
    return { thigh, knee };
  });
  if (L.skirt) {
    const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.27, 0.24, 8, 1, true), lam({ color: hexc(L.jacket).multiplyScalar(0.8), side: THREE.DoubleSide }));
    sk.position.y = -0.08; hips.add(sk);
  }

  /* 몸통 */
  const torso = new THREE.Group(); hips.add(torso);
  const body = new THREE.Mesh(cap(0.19, 0.2, 8), cloth); body.position.y = 0.2; body.scale.set(1, 1, 0.82);
  body.rotation.y = 0; torso.add(body);

  /* 머리 */
  const neck = new THREE.Group(); neck.position.y = 0.44; torso.add(neck);
  const faces = {
    open: toTex(bakeFace(L.skin, "open")),
    closed: toTex(bakeFace(L.skin, "closed")),
    wide: toTex(bakeFace(L.skin, "wide"))
  };
  const faceM = lam({ map: faces.open, flatShading: false, emissive: 0x000000 });
  faceM.emissiveMap = faces.open; faceM.emissive = new THREE.Color(0.22, 0.22, 0.22);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 9), faceM); head.position.y = 0.2; neck.add(head);
  addHair(neck, L, hairM, cloth);

  /* 팔 */
  const arms = [-1, 1].map(s => {
    const sh = new THREE.Group(); sh.position.set(0.24 * s, 0.34, 0); torso.add(sh);
    const up = new THREE.Mesh(cap(0.055, 0.12), sleeve); up.position.y = -0.1; sh.add(up);
    const el = new THREE.Group(); el.position.y = -0.2; sh.add(el);
    const fo = new THREE.Mesh(cap(0.05, 0.1), sleeve); fo.position.y = -0.08; el.add(fo);
    const hand = new THREE.Mesh(new THREE.IcosahedronGeometry(0.055, 0), skin); hand.position.y = -0.19; el.add(hand);
    sh.rotation.z = 0.12 * s;
    return { sh, el, hand };
  });
  addProp(L.prop, { torso, neck, arms, head });

  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  outline(root);

  /* ---------- 동작 ---------- */
  let ph = 0, t = Math.random() * 10, blinkT = 2 + Math.random() * 3, walkW = 0, mode = "idle", modeK = 0, shake = 0;
  function update(dt, st = {}) {
    t += dt;
    const sp = st.speed || 0;
    walkW += ((sp > 0.05 ? Math.min(1, sp / 2.4) : 0) - walkW) * Math.min(1, dt * 10);
    ph += dt * (4 + sp * 3.2);
    const want = st.mode || "idle";
    if (want !== mode) { mode = want; modeK = 0; }
    modeK = Math.min(1, modeK + dt * 6);
    const k = modeK;

    /* 기본: 걷기 */
    const sw = Math.sin(ph) * 0.75 * walkW;
    legs[0].thigh.rotation.x = -sw; legs[1].thigh.rotation.x = sw;
    legs[0].knee.rotation.x = Math.max(0, Math.cos(ph)) * 0.9 * walkW;
    legs[1].knee.rotation.x = Math.max(0, -Math.cos(ph)) * 0.9 * walkW;
    arms[0].sh.rotation.x = sw * 0.9; arms[1].sh.rotation.x = -sw * 0.9;
    arms[0].el.rotation.x = arms[1].el.rotation.x = -0.25 - walkW * 0.3;
    hips.position.y = HIP + Math.abs(Math.sin(ph)) * 0.045 * walkW;
    torso.rotation.x = walkW * 0.08; torso.rotation.y = Math.sin(ph) * 0.08 * walkW;
    torso.scale.y = 1 + Math.sin(t * 2.2) * 0.012;                                 // 숨쉬기
    neck.rotation.set(0, 0, 0);
    hips.position.x = 0;

    if (mode === "hide") {                                                         // 쪼그려 앉기
      hips.position.y = HIP - 0.24 * k;
      legs.forEach(l => { l.thigh.rotation.x = -1.5 * k; l.knee.rotation.x = 2.3 * k; });
      arms.forEach(a => { a.sh.rotation.x = -0.9 * k; a.el.rotation.x = -1.2 * k; });
      torso.rotation.x = 0.35 * k;
    } else if (mode === "scared" || mode === "frozen") {                          // 손으로 얼굴 가리기
      arms.forEach((a, i) => { a.sh.rotation.x = -2.3 * k; a.sh.rotation.z = (i ? 1 : -1) * -0.35 * k; a.el.rotation.x = -1.7 * k; });
      torso.rotation.x = 0.25 * k; hips.position.y = HIP - 0.06 * k;
      legs.forEach(l => { l.thigh.rotation.x = -0.25 * k; l.knee.rotation.x = 0.4 * k; });
      shake = mode === "frozen" ? 0.03 : 0.012;
      hips.position.x = (Math.random() - 0.5) * shake;
    } else if (mode === "talk") {
      neck.rotation.x = Math.sin(t * 7) * 0.06; neck.rotation.z = Math.sin(t * 1.3) * 0.05;
      arms[1].sh.rotation.x = -0.4 + Math.sin(t * 2.5) * 0.15; arms[1].el.rotation.x = -0.8;
    } else if (walkW < 0.1) {
      neck.rotation.y = Math.sin(t * 0.5) * 0.25 * (st.look ?? 1);                 // 두리번
    }
    if (st.lookAt != null) neck.rotation.y = st.lookAt;

    /* 얼굴 */
    blinkT -= dt;
    let f = (mode === "scared" || mode === "frozen") ? "wide" : "open";
    if (blinkT < 0) { f = "closed"; if (blinkT < -0.12) blinkT = 2 + Math.random() * 3.5; }
    if (faceM.map !== faces[f]) { faceM.map = faceM.emissiveMap = faces[f]; faceM.needsUpdate = true; }
  }

  return { group: root, update, height: 1.5 * S, head };
}

export function addHair(neck, L, hairM, cloth) {
  const add = (geo, x, y, z, sx = 1, sy = 1, sz = 1, m = hairM) => { const h = new THREE.Mesh(geo, m); h.position.set(x, y, z); h.scale.set(sx, sy, sz); neck.add(h); return h; };
  /* 정수리부터 덮는 껍질. 앞(+z)은 비워 얼굴이 보이게 */
  const shell = (r, down, open = 1.1) => new THREE.SphereGeometry(r, 12, 8, Math.PI / 2 + open, Math.PI * 2 - open * 2, 0, Math.PI * down);
  const top = (r, down) => new THREE.SphereGeometry(r, 12, 6, 0, Math.PI * 2, 0, Math.PI * down);
  if (L.hair === "hood") {
    add(shell(0.31, 0.72, 0.85), 0, 0.21, -0.01, 1, 1.05, 1, cloth);
    add(new THREE.TorusGeometry(0.235, 0.035, 4, 14), 0, 0.2, 0.1, 1, 1.12, 1, cloth).rotation.x = 0.2;
    return;
  }
  if (L.hair === "short" || L.hair === "cap") {
    add(top(0.275, 0.42), 0, 0.22, -0.01);
    add(shell(0.275, 0.62), 0, 0.2, -0.02);
    add(new THREE.BoxGeometry(0.34, 0.07, 0.08), 0, 0.37, 0.2).rotation.x = 0.4;            // 앞머리
  }
  if (L.hair === "bob" || L.hair === "pony" || L.hair === "long") {
    add(top(0.28, 0.45), 0, 0.22, 0);
    add(shell(0.285, L.hair === "bob" ? 0.72 : 0.62), 0, 0.2, -0.01);
    add(new THREE.BoxGeometry(0.4, 0.09, 0.07), 0, 0.35, 0.21).rotation.x = 0.35;
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.07, L.hair === "bob" ? 0.24 : 0.2, 0.12), 0.25 * s, 0.13, 0.1);
  }
  if (L.hair === "long") add(new THREE.BoxGeometry(0.42, 0.46, 0.1), 0, 0.02, -0.22);
  if (L.hair === "pony") { const p = add(new THREE.CapsuleGeometry(0.07, 0.22, 2, 6), 0, 0.12, -0.3); p.rotation.x = 0.5; }
}

export function addProp(p, { torso, neck, arms }) {
  const dark = lam({ color: 0x1a1a1c }), metal = lam({ color: 0x8a8a88 });
  if (p === "camera") {
    const g = new THREE.Group(); g.position.set(0, 0.26, 0.2); torso.add(g);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.08), dark));
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.07, 8), metal); lens.rotation.x = Math.PI / 2; lens.position.z = 0.07; g.add(lens);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 3, 12, Math.PI), dark); strap.position.set(0, 0.42, 0.04); strap.rotation.z = Math.PI; torso.add(strap);
  }
  if (p === "headphones") {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 4, 12, Math.PI), lam({ color: 0xe0a63a }));
    band.position.set(0, 0.03, 0.02); band.rotation.set(0.15, 0, Math.PI); neck.add(band);
    for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 8), dark); c.rotation.z = Math.PI / 2; c.position.set(0.19 * s, 0.03, 0.04); neck.add(c); }
  }
  if (p === "books") {
    const b = new THREE.Group(); b.position.set(0, -0.2, 0.08); arms[1].el.add(b);
    [[0x8a3a2a, 0], [0x2a4a6a, 0.05], [0x6a6a3a, 0.1]].forEach(([c, y]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.22), lam({ color: c })); m.position.y = y; b.add(m); });
  }
  if (p === "cap") {
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.285, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.4), lam({ color: 0x343e6a })); c.position.y = 0.24; neck.add(c);
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.025, 0.18), lam({ color: 0x2a3256 })); v.position.set(0, 0.33, 0.27); neck.add(v);
  }
  if (p === "phone") {
    const ph = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.13, 0.015), lam({ color: 0x111111, emissive: 0x2a4a6a })); ph.position.set(0, -0.2, 0.05); arms[1].el.add(ph);
  }
}

/* ---------- ‘그것’: 얼굴 없는 마네킹. 툭툭 끊기듯 움직임 ---------- */
export function makeMannequin() {
  const pale = lam({ color: 0xd8d0c2 }), joint = lam({ color: 0x9a9184 });
  const root = new THREE.Group(), hips = new THREE.Group(); hips.position.y = 0.95; root.add(hips);
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.18), pale); hips.add(pelvis);
  const torso = new THREE.Group(); hips.add(torso);
  const chest = new THREE.Mesh(cap(0.16, 0.36, 6), pale); chest.position.y = 0.34; chest.scale.set(1.1, 1, 0.7); torso.add(chest);
  const neck = new THREE.Group(); neck.position.y = 0.66; torso.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), pale); head.scale.set(0.85, 1.2, 0.95); head.position.y = 0.16; neck.add(head);
  const limb = (parent, x, y, len) => {
    const j = new THREE.Group(); j.position.set(x, y, 0); parent.add(j);
    j.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), joint));
    const m = new THREE.Mesh(cap(0.045, len, 5), pale); m.position.y = -len / 2 - 0.04; j.add(m);
    const e = new THREE.Group(); e.position.y = -len - 0.08; j.add(e);
    e.add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), joint));
    const m2 = new THREE.Mesh(cap(0.04, len * 0.95, 5), pale); m2.position.y = -len / 2 - 0.04; e.add(m2);
    return { j, e };
  };
  const arms = [limb(torso, -0.24, 0.56, 0.26), limb(torso, 0.24, 0.56, 0.26)];
  const legs = [limb(hips, -0.1, -0.06, 0.36), limb(hips, 0.1, -0.06, 0.36)];
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  outline(root, 0.018);
  let t = 0, snap = 0, ph = 0;
  function update(dt, { speed = 0.9, alert = false } = {}) {
    t += dt; snap -= dt;
    if (snap > 0) return;                         // 사이사이 멈칫
    snap = alert ? 0.08 : 0.16 + Math.random() * 0.12;
    ph += 1.15;
    const s = Math.sin(ph) * 0.45 * Math.min(1, speed);
    legs[0].j.rotation.x = -s; legs[1].j.rotation.x = s;
    legs[0].e.rotation.x = Math.max(0, s) * 0.6; legs[1].e.rotation.x = Math.max(0, -s) * 0.6;
    arms[0].j.rotation.x = s * 0.25; arms[1].j.rotation.x = -s * 0.25;
    arms.forEach(a => { a.e.rotation.x = -0.15; });
    neck.rotation.z = 0.35 + (Math.random() < 0.08 ? (Math.random() - 0.5) * 0.9 : 0);   // 고개가 꺾여 있음, 가끔 홱
    neck.rotation.x = alert ? -0.25 : 0.1;
    torso.rotation.z = Math.sin(ph * 0.5) * 0.05;
  }
  return { group: root, update };
}
