/* ──────────────────────────────────────────────────────────────
   마지막 배는 6시 · 3D 폐교 (three.js)
   - 쿼터뷰 3인칭, 작게 그려 키우는 레트로 화면 + 디더링
   - 그림자 만드는 빛은 내 손전등 하나뿐
   - 방향 a: (cos a, sin a) 가 x·z 로 향하는 쪽 (0 = 동쪽)
   ────────────────────────────────────────────────────────────── */
import * as THREE from "../vendor/three.module.min.js";
import { MAP, CHARS, IT } from "./data.js?v=202611181648";

const H = 2.4, T = 0.2;                          // 벽 높이 · 두께
const matCache = {};
const mat = (c, o = {}) => {
  const k = c + JSON.stringify(o);
  return matCache[k] || (matCache[k] = new THREE.MeshLambertMaterial(Object.assign({ color: c }, o)));
};
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);

export function createWorld(canvas, { pixel = 3 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070b);
  scene.fog = new THREE.FogExp2(0x06080d, 0.04);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 70);
  const CAM = new THREE.Vector3(0, 11, 8.5);

  /* ---------- 빛 ---------- */
  const amb = new THREE.AmbientLight(0x343a44, 0.9);
  const hemi = new THREE.HemisphereLight(0x50608a, 0x120a08, 0.5);
  const sun = new THREE.DirectionalLight(0xff8545, 1.4);   // 바다 쪽 석양 (그림자 없음)
  sun.position.set(-6, 5, 24); sun.target.position.set(18, 0, -4);
  const flash = new THREE.SpotLight(0xfff0cc, 40, 16, 0.5, 0.45, 1.3);
  flash.castShadow = true;
  flash.shadow.mapSize.set(512, 512);
  flash.shadow.camera.near = 0.3; flash.shadow.camera.far = 16; flash.shadow.bias = -0.003;
  scene.add(amb, hemi, sun, sun.target, flash, flash.target);

  /* ---------- 땅 · 바다 ---------- */
  const colliders = [];
  const solid = (x0, x1, z0, z1, tag) => { const c = { x0, x1, z0, z1, tag }; colliders.push(c); return c; };
  const floor = (x0, x1, z0, z1, c) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat(c));
    m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); m.receiveShadow = true;
    scene.add(m); return m;
  };
  floor(0, 40, 0, 3, 0x4b3b2b);                                  // 복도 마루
  [[0, 10, 0x3e3429], [10, 20, 0x3a352e], [20, 30, 0x40352a], [30, 40, 0x36332f]]
    .forEach(([a, b, c]) => floor(a, b, -8, 0, c));
  floor(-16, 0, -5, 8, 0x2e2b22);                                // 운동장 끝
  floor(-16, -12, 0, 3, 0x5a4630).position.y = 0.02;             // 선착장 나무 바닥
  floor(0, 40, 3, 8, 0x22201b);                                  // 건물 앞 흙
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(160, 120),
    new THREE.MeshLambertMaterial({ color: 0x0b1a2a, emissive: 0x2a1408 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(10, -0.25, 40); scene.add(sea);

  /* ---------- 벽 ---------- */
  const wallMat = mat(0x6d665a), trim = mat(0x3c362f);
  function wallX(z, x0, x1, gaps = [], h = H) {                 // x 방향으로 뻗은 벽
    const cuts = [x0, ...gaps.flatMap(([c, w]) => [c - w / 2, c + w / 2]), x1];
    for (let i = 0; i < cuts.length; i += 2) {
      const a = cuts[i], b = cuts[i + 1]; if (b - a < 0.01) continue;
      const m = box(b - a, h, T, wallMat); m.position.set((a + b) / 2, h / 2, z);
      m.castShadow = m.receiveShadow = true; scene.add(m);
      solid(a, b, z - T / 2, z + T / 2);
    }
  }
  function wallZ(x, z0, z1, gaps = [], h = H) {                 // z 방향으로 뻗은 벽
    const cuts = [z0, ...gaps.flatMap(([c, w]) => [c - w / 2, c + w / 2]), z1];
    for (let i = 0; i < cuts.length; i += 2) {
      const a = cuts[i], b = cuts[i + 1]; if (b - a < 0.01) continue;
      const m = box(T, h, b - a, wallMat); m.position.set(x, h / 2, (a + b) / 2);
      m.castShadow = m.receiveShadow = true; scene.add(m);
      solid(x - T / 2, x + T / 2, a, b);
    }
  }
  const R = MAP.rooms;
  wallX(-8, 0, 40);
  wallX(0, 0, 40, [1, 2, 3, 4].map(k => [R[k].door, 1.4]));
  wallX(3, 0, 40, [], 1.0);
  wallZ(0, -8, 3, [[MAP.frontDoor.z, 1.6]]);
  [10, 20, 30].forEach(x => wallZ(x, -8, 0));
  wallZ(40, -8, 3);
  /* 바깥 울타리 (보이지 않는 벽 + 낮은 난간) */
  solid(-16.6, -16, -5, 8); solid(-16, 0, -5.6, -5); solid(-16, 40, 8, 8.6); solid(-0.1, 0.1, 3, 8);
  wallX(8, -16, 0, [], 0.6); wallX(-5, -16, 0, [], 0.6);

  /* 복도 남쪽은 창턱 높이까지만 (인형의 집처럼 잘라 보여 줌). 창틀 기둥만 세워 석양이 들어오게 */
  const winMat = new THREE.MeshBasicMaterial({ color: 0xff9a5a, fog: false });
  for (let x = 0; x <= 40; x += 4) {
    const post = box(0.16, H, 0.16, trim); post.position.set(x, H / 2, 3); post.castShadow = true; scene.add(post);
  }
  const sill = box(40, 0.06, 0.3, trim); sill.position.set(20, 1.0, 3); scene.add(sill);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(200, 30), winMat);   // 바다 너머 노을
  sky.position.set(10, 8, 70); sky.rotation.y = Math.PI; scene.add(sky);

  /* ---------- 문 ---------- */
  const doors = {};
  function door(key, x, z, axis, w, open) {
    const pivot = new THREE.Group();
    const d = box(w, 2.1, 0.08, mat(0x5b3d26)); d.position.set(w / 2, 1.05, 0); d.castShadow = true;
    const knob = box(0.08, 0.08, 0.14, mat(0xb8a070)); knob.position.set(w - 0.15, 1.0, 0);
    pivot.add(d, knob);
    if (axis === "x") pivot.position.set(x - w / 2, 0, z);
    else { pivot.position.set(x, 0, z - w / 2); pivot.rotation.y = -Math.PI / 2; }
    scene.add(pivot);
    const col = axis === "x" ? solid(x - w / 2, x + w / 2, z - 0.1, z + 0.1, "door") : solid(x - 0.1, x + 0.1, z - w / 2, z + w / 2, "door");
    doors[key] = { pivot, col, axis, open: null, base: pivot.rotation.y };
    setDoor(key, open);
  }
  function setDoor(key, open) {
    const D = doors[key]; if (!D || D.open === open) return;
    D.open = open; D.col.off = open;
    D.goal = D.base + (open ? (D.axis === "x" ? -1.6 : 1.6) : 0);
  }
  door(1, R[1].door, 0, "x", 1.4, true);
  [2, 3, 4].forEach(k => door(k, R[k].door, 0, "x", 1.4, false));
  door("front", 0, MAP.frontDoor.z, "z", 1.6, false);

  /* ---------- 가구 ---------- */
  const FC = { desk: 0x6b5236, teacher: 0x5a4430, cabinet: 0x4a4f4a, bed: 0x55606a, console: 0x2c3036, locker: 0x3d4a44, police: 0xd8d8d0 };
  for (const [x, z, w, d, h, kind] of MAP.furniture) {
    const m = box(w, h, d, mat(FC[kind] || 0x555555)); m.position.set(x, h / 2, z);
    m.castShadow = m.receiveShadow = true; scene.add(m);
    if (kind === "locker") { const s = box(w * 0.9, 0.04, 0.02, trim); s.position.set(x, 1.5, z - d / 2 - 0.01); scene.add(s); }
    if (kind === "police") {
      const roof = box(w + 0.3, 0.2, d + 0.3, mat(0x24407a)); roof.position.set(x, h + 0.1, z); scene.add(roof);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff3030 }));
      lamp.position.set(x, h + 0.35, z); scene.add(lamp);
    }
    if (kind === "desk") { const ch = box(0.4, 0.45, 0.4, mat(0x4d3b28)); ch.position.set(x, 0.22, z + 0.55); scene.add(ch); }
    solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2, kind);
  }
  /* 교실 칠판 + 그을린 창 자국 (분위기) */
  const blackboard = box(4, 1.2, 0.05, mat(0x1d2a22)); blackboard.position.set(3, 1.5, -7.88); scene.add(blackboard);
  const soot = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55 }));
  soot.position.set(7.5, 1.7, -0.12); soot.rotation.y = Math.PI; scene.add(soot);

  /* ---------- 살펴볼 것 ---------- */
  const items = {};
  const ringGeo = new THREE.RingGeometry(0.32, 0.42, 16);
  for (const it of MAP.items) {
    const g = new THREE.Group(); g.position.set(it.x, 0, it.z);
    let m;
    if (it.kind === "memo") { m = box(0.16, 0.02, 0.3, mat(0x111111, { emissive: 0x3a6a9a })); m.position.y = 0.97; }
    else if (it.kind === "order") { m = box(1.6, 0.95, 0.08, mat(0x111111, { emissive: 0x16222c })); m.position.set(0, 1.7, 0); }
    else if (it.kind === "code") {
      m = it.room === 5 ? new THREE.Group() : box(0.6, 0.45, 0.4, mat(0x6a5a3c));
      m.position.y = it.room === 5 ? 0 : 0.23;
      if (it.room !== 5) { const l = box(0.14, 0.18, 0.06, mat(0xb09040)); l.position.set(0, 0.05, 0.22); m.add(l); }
    }
    else if (it.kind === "diary") { m = box(0.3, 0.02, 0.22, new THREE.MeshLambertMaterial({ color: 0xe8dcc0, transparent: true, opacity: 0 })); m.position.y = 0.03; m.rotation.y = 0.5; }
    else { m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 6), mat(0xd4b030, { emissive: 0x302400 })); m.position.y = 0.1; m.rotation.z = Math.PI / 2; }
    m.castShadow = true; g.add(m);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; g.add(ring);
    scene.add(g);
    items[it.id] = { g, m, ring, it, gone: false };
  }

  /* ---------- 캐릭터 ---------- */
  const chars = {};
  function makeChar(id) {
    const def = CHARS[id], g = new THREE.Group(), body = new THREE.Group();
    const cloth = mat(def.color), skin = mat(0xf0c8a0), dark = mat(0x1e1a18);
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.5, 6), cloth); torso.position.y = 0.55;
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.27, 1), skin); head.position.y = 1.05;
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.29, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), dark); hair.position.y = 1.08;
    const eyeL = box(0.05, 0.07, 0.02, dark), eyeR = eyeL.clone(); eyeL.position.set(-0.09, 1.04, 0.255); eyeR.position.set(0.09, 1.04, 0.255);
    const legL = box(0.11, 0.3, 0.12, dark), legR = legL.clone(); legL.position.set(-0.09, 0.15, 0); legR.position.set(0.09, 0.15, 0);
    legL.geometry.translate(0, -0.15, 0); legL.position.y = 0.3; legR.position.y = 0.3;
    body.add(torso, head, hair, eyeL, eyeR, legL, legR);
    const P = def.prop;
    if (P === "camera") { const c = box(0.22, 0.14, 0.1, dark); c.position.set(0, 0.62, 0.25); body.add(c); }
    if (P === "headphones") { const hp = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 4, 10, Math.PI), mat(0x222222)); hp.position.y = 1.08; hp.rotation.z = 0; body.add(hp); }
    if (P === "books") { const b = box(0.24, 0.2, 0.1, mat(0x9a3a2a)); b.position.set(0.26, 0.55, 0.05); body.add(b); }
    if (P === "cap") { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 8), mat(0x333366)); c.position.set(0, 1.28, 0.08); body.add(c); }
    if (P === "phone") { const p = box(0.08, 0.14, 0.02, mat(0x111111, { emissive: 0x335577 })); p.position.set(0.24, 0.6, 0.18); body.add(p); }
    body.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.add(body);
    scene.add(g);
    return chars[id] = { g, body, legL, legR, torso, phase: 0, x: 0, z: 0, a: 0 };
  }
  for (const id of Object.keys(CHARS)) { makeChar(id).g.visible = false; }

  /* ---------- ‘그것’: 얼굴 없는 마네킹 ---------- */
  const it = new THREE.Group();
  { const pale = mat(0xcfc8bc), joint = mat(0x8a8378);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.8, 6), pale); t.position.y = 1.15;
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), pale); hd.position.y = 1.8; hd.scale.set(0.85, 1.1, 0.9);
    const lg = box(0.1, 0.75, 0.1, joint), lg2 = lg.clone(); lg.position.set(-0.08, 0.38, 0); lg2.position.set(0.08, 0.38, 0);
    const ar = box(0.08, 0.7, 0.08, joint), ar2 = ar.clone(); ar.position.set(-0.25, 1.1, 0.05); ar2.position.set(0.25, 1.1, 0.05);
    [t, hd, lg, lg2, ar, ar2].forEach(m => { m.castShadow = true; it.add(m); }); }
  const fan = new THREE.Mesh(new THREE.CircleGeometry(IT.sight, 18, -IT.fov, IT.fov * 2),
    new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.1, depthWrite: false, fog: false }));
  fan.geometry.rotateX(-Math.PI / 2); fan.position.y = 0.04;
  scene.add(it, fan);

  /* ---------- 레트로 화면: 작게 그리고 디더링 ---------- */
  const rt = new THREE.WebGLRenderTarget(2, 2, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const post = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: rt.texture }, uRes: { value: new THREE.Vector2(2, 2) },
                uTime: { value: 0 }, uStatic: { value: 0 }, uDark: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uTime, uStatic, uDark; varying vec2 vUv;
      float bayer(vec2 p){ ivec2 q = ivec2(mod(p, 4.)); int i = q.x + q.y * 4;
        float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.); return m[i] / 16. - .5; }
      float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime * 7.) * 43758.5453); }
      void main(){
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        c = pow(max(c, 0.), vec3(1. / 2.2));
        vec2 px = floor(vUv * uRes);
        float lv = 12.;
        c = floor(c * lv + bayer(px) * .6 + .5) / lv;
        vec2 d = vUv - .5; c *= 1. - dot(d, d) * 1.3;
        if (uStatic > 0.) {
          float n = rnd(px);
          c = mix(c, vec3(n), uStatic * .6);
          c += step(.96, fract(vUv.y * 9. + uTime * 2.3)) * uStatic * .35;
        }
        c *= 1. - uDark;
        gl_FragColor = vec4(c, 1.);
      }`,
    depthTest: false, depthWrite: false
  });
  const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));

  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    const rw = Math.max(160, Math.ceil(w / pixel)), rh = Math.max(100, Math.ceil(h / pixel));
    renderer.setSize(rw, rh, false); rt.setSize(rw, rh);
    post.uniforms.uRes.value.set(rw, rh);
    camera.aspect = rw / rh; camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize); resize();

  /* ---------- 부딪힘 ---------- */
  function hits(x, z, r, who) {
    for (const c of colliders) {
      if (c.off) continue;
      if (x + r > c.x0 && x - r < c.x1 && z + r > c.z0 && z - r < c.z1) return true;
    }
    return false;
  }
  function move(x, z, dx, dz, who, r = 0.28) {
    let nx = x + dx, nz = z;
    if (hits(nx, nz, r, who)) nx = x;
    nz = z + dz;
    if (hits(nx, nz, r, who)) nz = z;
    /* 문 모서리에 걸리면 옆으로 살짝 밀어 줌 (태블릿 조이스틱이 정확하지 않으니까) */
    const sp = Math.hypot(dx, dz);
    if (nz === z && Math.abs(dz) > Math.abs(dx)) {
      for (const o of [0.15, -0.15, 0.3, -0.3, 0.45, -0.45]) if (!hits(x + o, z + dz, r, who) && !hits(x + Math.sign(o) * sp, z, r, who)) { nx = x + Math.sign(o) * sp; break; }
    } else if (nx === x && Math.abs(dx) > Math.abs(dz)) {
      for (const o of [0.15, -0.15, 0.3, -0.3, 0.45, -0.45]) if (!hits(x + dx, z + o, r, who) && !hits(x, z + Math.sign(o) * sp, r, who)) { nz = z + Math.sign(o) * sp; break; }
    }
    return { x: nx, z: nz };
  }

  /* ---------- 매 장면 ---------- */
  const tmp = new THREE.Vector3(), look = new THREE.Vector3();
  let t0 = performance.now();
  function frame(S) {
    const now = performance.now(), dt = Math.min(0.1, (now - t0) / 1000); t0 = now;
    const p = Math.max(0, Math.min(1, S.progress || 0));
    sun.intensity = 1.4 * (1 - p) + 0.05;
    winMat.color.setHSL(0.06 - p * 0.03, 0.8, 0.62 - p * 0.45);
    amb.intensity = 0.9 - p * 0.55; hemi.intensity = 0.5 - p * 0.35;
    scene.fog.density = 0.04 + p * 0.03;

    /* 문 */
    for (const k in doors) { const D = doors[k]; if (D.goal != null) D.pivot.rotation.y += (D.goal - D.pivot.rotation.y) * Math.min(1, dt * 6); }

    /* 캐릭터 */
    const seen = new Set();
    for (const c of S.chars) {
      const C = chars[c.id]; if (!C) continue; seen.add(c.id);
      C.g.visible = !c.hidden;
      const mv = Math.hypot(c.x - C.x, c.z - C.z);
      C.x = c.x; C.z = c.z;
      C.a += angDiff(C.a, c.a) * Math.min(1, dt * 12);
      C.g.position.set(c.x, 0, c.z); C.g.rotation.y = Math.PI / 2 - C.a;
      const walking = mv > 0.002 && !c.frozen;
      C.phase = walking ? C.phase + dt * 11 : C.phase * 0.8;
      C.legL.rotation.x = Math.sin(C.phase) * 0.6; C.legR.rotation.x = -Math.sin(C.phase) * 0.6;
      C.body.position.y = walking ? Math.abs(Math.sin(C.phase)) * 0.05 : 0;
      C.body.position.x = c.frozen ? (Math.random() - 0.5) * 0.06 : 0;
      C.torso.material = c.frozen ? mat(0x7a8aa0) : mat(CHARS[c.id].color);
    }
    for (const id in chars) if (!seen.has(id)) chars[id].g.visible = false;

    /* 손전등 */
    const me = S.me;
    if (me) {
      const ax = Math.cos(me.a), az = Math.sin(me.a);
      flash.visible = !!me.flash;
      flash.position.set(me.x + ax * 0.2, 1.1, me.z + az * 0.2);
      flash.target.position.set(me.x + ax * 6, 0.1, me.z + az * 6);
      flash.intensity = 40 * Math.max(0.25, Math.min(1, (me.bat || 0) / 30 + 0.2));
      camera.position.lerp(tmp.set(me.x, 0, me.z).add(CAM), Math.min(1, dt * 5));
      look.set(camera.position.x, 0.5, camera.position.z - CAM.z);
      camera.lookAt(look);
    }

    /* 살펴볼 것: 가까우면 고리, 일기장은 손전등에 비쳐야 보임 */
    for (const id in items) {
      const I = items[id];
      I.g.visible = !I.gone;
      const near = S.near === id;
      I.ring.material.opacity = near ? 0.5 + Math.sin(now / 200) * 0.25 : 0;
      if (I.it.kind === "diary") I.m.material.opacity = S.lit && S.lit.includes(id) ? 1 : 0;
    }

    /* 그것 */
    if (S.it) {
      it.visible = fan.visible = !S.it.hide;
      it.position.set(S.it.x, 0, S.it.z); it.rotation.y = Math.PI / 2 - S.it.dir;
      fan.position.set(S.it.x, 0.04, S.it.z); fan.rotation.y = -S.it.dir;
      fan.material.opacity = S.it.weak ? 0.05 : 0.1 + (S.it.alert ? 0.15 : 0);
    }

    post.uniforms.uTime.value = now / 1000;
    post.uniforms.uStatic.value = S.static || 0;
    post.uniforms.uDark.value = S.dark || 0;
    renderer.setRenderTarget(rt); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(postScene, postCam);
    return labels(S.chars);
  }

  /* 머리 위 이름표는 글자가 뭉개지지 않게 HTML 로: 화면 좌표만 계산 */
  const pv = new THREE.Vector3();
  function labels(list) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    return list.filter(c => !c.hidden).map(c => {
      pv.set(c.x, 1.75, c.z).project(camera);
      return { id: c.id, x: (pv.x + 1) / 2 * w, y: (1 - pv.y) / 2 * h, on: pv.z < 1 };
    });
  }

  return {
    frame, move, setDoor, resize,
    setItemGone: (id, v) => { if (items[id]) items[id].gone = v; },
    dispose: () => { removeEventListener("resize", resize); renderer.dispose(); }
  };
}

function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }

