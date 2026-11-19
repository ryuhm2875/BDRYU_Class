/* ──────────────────────────────────────────────────────────────
   6시의 섬 · 3D 폐교 (three.js)
   - 쿼터뷰 3인칭. 작게 그려 키운 화면 + 디더링 + 꼭짓점 흔들림(옛 게임기 느낌)
   - 바닥·벽·가구는 모두 textures.js 의 픽셀 텍스처. 바닥 그늘은 미리 구움
   - 그림자 만드는 빛은 내 손전등 하나뿐
   - 방향 a: (cos a, sin a) 가 x·z 로 향하는 쪽 (0 = 동쪽)
   ────────────────────────────────────────────────────────────── */
import * as THREE from "../vendor/three.module.min.js";
import { MAP, IT } from "./data.js?v=202611191038";
import { photoSVG } from "./puzzles.js?v=202611191038";
import * as TX from "./textures.js?v=202611191038";
import { makeRig, makeMannequin } from "./rig.js?v=202611191038";
import { loadPeople, makePerson, makeThing } from "./people.js?v=202611191038";

const H = 2.4, T = 0.2;
const SNAP = { value: new THREE.Vector2(320, 200) };          // 꼭짓점이 붙는 격자

/* 옛 게임기처럼 꼭짓점을 화면 격자에 붙임 */
function ps1(m) {
  if (!m || m.userData.ps1) return m; m.userData.ps1 = true;
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    if (prev) prev.call(m, sh, r);
    sh.uniforms.uSnap = SNAP;
    sh.vertexShader = "uniform vec2 uSnap;\n" + sh.vertexShader.replace("#include <project_vertex>",
      "#include <project_vertex>\n vec4 sn = gl_Position; sn.xyz /= sn.w; sn.xy = floor(sn.xy * uSnap) / uSnap; sn.xyz *= sn.w; gl_Position = sn;");
  };
  return m;
}
const lam = o => ps1(new THREE.MeshLambertMaterial(o));
const cache = {};
const once = (k, f) => cache[k] || (cache[k] = f());
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);

export function createWorld(canvas, { pixel = 3 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080d);
  scene.fog = new THREE.FogExp2(0x0a0c12, 0.045);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.3, 80);
  const CAM = new THREE.Vector3(0, 6.3, 7.0);

  /* ---------- 빛 ---------- */
  const amb = new THREE.AmbientLight(0x3a4050, 1.0);
  const hemi = new THREE.HemisphereLight(0x6a78a0, 0x1a120c, 0.6);
  const sun = new THREE.DirectionalLight(0xff8a50, 1.6); sun.position.set(-8, 6, 26); sun.target.position.set(18, 0, -4);
  const flash = new THREE.SpotLight(0xfff2d6, 46, 15, 0.48, 0.5, 1.25);
  flash.castShadow = true; flash.shadow.mapSize.set(1024, 1024);
  flash.shadow.camera.near = 0.2; flash.shadow.camera.far = 15; flash.shadow.bias = -0.0015;
  scene.add(amb, hemi, sun, sun.target, flash, flash.target);
  const glow = new THREE.PointLight(0xffd8a0, 0.9, 2.6, 2);
  const fill = new THREE.PointLight(0xc8d0e8, 3.2, 5, 1.5);                 // 인물이 어둠에 묻히지 않게 (카메라 쪽 위에서)
  scene.add(glow, fill);

  /* ---------- 부딪힘 ---------- */
  const colliders = [];
  const solid = (x0, x1, z0, z1, tag) => { const c = { x0, x1, z0, z1, tag }; colliders.push(c); return c; };

  /* ---------- 바닥 (방마다 한 장, 그늘 구움) ---------- */
  const R = MAP.rooms;
  const shadowsIn = r => MAP.furniture.filter(([x, z]) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1).map(([x, z, w, d]) => [x, z, w, d]);
  function floor(r, canvasFn, y = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(r.x1 - r.x0, r.z1 - r.z0), lam({ map: TX.toTex(canvasFn()) }));
    m.rotation.x = -Math.PI / 2; m.position.set((r.x0 + r.x1) / 2, y, (r.z0 + r.z1) / 2); m.receiveShadow = true; scene.add(m); return m;
  }
  floor(MAP.corridor, () => TX.bakeTerrazzo(MAP.corridor, { shadows: shadowsIn(MAP.corridor) }));
  const woods = { 1: [112, 78, 48], 2: [104, 80, 56], 3: [118, 88, 58], 4: [96, 74, 54] };
  for (const k of [1, 2, 3, 4]) floor(R[k], () => TX.bakeWoodFloor(R[k], { seed: k * 31, base: woods[k], shadows: shadowsIn(R[k]), burn: k === 1 ? [7.6, -0.9, 1.6] : null }));
  floor(R[5], () => TX.bakeGround(R[5]));
  floor({ x0: 0, x1: 40, z0: 3, z1: 9 }, () => TX.bakeGround({ x0: 0, x1: 40, z0: 3, z1: 9 }, { seed: 4 }));
  const pier = box(4, 0.25, 3, lam({ map: TX.toTex(TX.bakeWood(21, [92, 76, 58], 32, 24)) })); pier.position.set(-14, 0.02, 1.5); pier.receiveShadow = true; scene.add(pier);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(200, 140), new THREE.MeshLambertMaterial({ color: 0x0c1a28, emissive: 0x2a1408 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(10, -0.3, 50); scene.add(sea);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(240, 40), new THREE.MeshBasicMaterial({ color: 0xff9a5a, fog: false }));
  sky.position.set(10, 10, 85); sky.rotation.y = Math.PI; scene.add(sky);

  /* ---------- 벽 ---------- */
  const trimM = lam({ color: 0x3a332b });
  function wallMat(L, seed, soot = 0) {
    return once(`w${L.toFixed(1)}-${seed}-${soot}`, () => {
      const t = TX.toTex(TX.bakeWall(L, { seed, soot }));
      return [trimM, trimM, trimM, trimM, lam({ map: t }), lam({ map: t })];
    });
  }
  const cutaway = [];                                                               // 방 안에 있을 때 낮춰 보여 줄 벽 (복도 쪽 벽)
  function wallX(z, x0, x1, gaps = [], h = H, seed = 1, soot = 0) {
    const cut = z === 0;
    const cuts = [x0, ...gaps.flatMap(([c, w]) => [c - w / 2, c + w / 2]), x1];
    for (let i = 0; i < cuts.length; i += 2) {
      const a = cuts[i], b = cuts[i + 1]; if (b - a < 0.01) continue;
      const m = new THREE.Mesh(new THREE.BoxGeometry(b - a, h, T), h < H ? lam({ color: 0x4a5e50 }) : wallMat(b - a, seed + i, soot));
      m.position.set((a + b) / 2, h / 2, z); m.castShadow = m.receiveShadow = true; scene.add(m);
      if (cut) cutaway.push({ m, kind: "wall" });
      solid(a, b, z - T / 2, z + T / 2);
    }
    if (h >= H) for (let i = 1; i < cuts.length - 1; i += 2) {
      const a = cuts[i], b = cuts[i + 1]; const m = box(b - a, 0.3, T, trimM); m.position.set((a + b) / 2, H - 0.15, z); scene.add(m);
      if (cut) cutaway.push({ m, kind: "lintel" });
    }
  }
  function wallZ(x, z0, z1, gaps = [], h = H, seed = 5) {
    const cuts = [z0, ...gaps.flatMap(([c, w]) => [c - w / 2, c + w / 2]), z1];
    for (let i = 0; i < cuts.length; i += 2) {
      const a = cuts[i], b = cuts[i + 1]; if (b - a < 0.01) continue;
      const m = new THREE.Mesh(new THREE.BoxGeometry(b - a, h, T), wallMat(b - a, seed + i));
      m.rotation.y = Math.PI / 2; m.position.set(x, h / 2, (a + b) / 2); m.castShadow = m.receiveShadow = true; scene.add(m);
      solid(x - T / 2, x + T / 2, a, b);
    }
  }
  wallX(-8, 0, 10, [], H, 11, 2); wallX(-8, 10, 40, [], H, 12);
  wallX(0, 0, 40, [1, 2, 3, 4].map(k => [R[k].door, 1.4]), H, 13, 0);
  wallX(3, 0, 40, [], 1.0);
  wallZ(0, -8, 3, [[MAP.frontDoor.z, 1.6]]);
  wallZ(10, -8, 0, [], H, 20); wallZ(20, -8, 0, [[MAP.shortcut.z, 1.0]], H, 21); wallZ(30, -8, 0, [], H, 22);
  wallZ(40, -8, 3);
  solid(-16.6, -16, -5, 8); solid(-16, 0, -5.6, -5); solid(-16, 40, 8.6, 9.2); solid(-0.1, 0.1, 3, 8.6);
  wallX(8.6, -16, 0, [], 0.6); wallX(-5, -16, 0, [], 0.6);
  for (let x = 0; x <= 40; x += 4) { const p = box(0.14, H, 0.14, trimM); p.position.set(x, H / 2, 3); p.castShadow = true; scene.add(p); }
  const sill = box(40, 0.06, 0.32, trimM); sill.position.set(20, 1.0, 3); scene.add(sill);

  /* ---------- 북쪽 창 (방마다 둘): 어스름 + 빛줄기 ---------- */
  const winGlass = new THREE.MeshBasicMaterial({ color: 0x3a4a70, fog: false });
  const shaftTex = (() => {                                                         // 위는 밝고 아래로 사라지는, 가장자리가 흐린 빛줄기
    const c = document.createElement("canvas"); c.width = 32; c.height = 64; const g = c.getContext("2d");
    const v = g.createLinearGradient(0, 0, 0, 64); v.addColorStop(0, "rgba(255,255,255,1)"); v.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = v; g.fillRect(0, 0, 32, 64);
    g.globalCompositeOperation = "destination-in";
    const h = g.createLinearGradient(0, 0, 32, 0); h.addColorStop(0, "rgba(0,0,0,0)"); h.addColorStop(.3, "rgba(0,0,0,1)"); h.addColorStop(.7, "rgba(0,0,0,1)"); h.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = h; g.fillRect(0, 0, 32, 64);
    return new THREE.CanvasTexture(c);
  })();
  const shaftM = new THREE.MeshBasicMaterial({ color: 0x8aa0d0, map: shaftTex, transparent: true, opacity: 0.05, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const curtainM = lam({ map: TX.toTex(TX.bakeWood(41, [120, 40, 36], 16, 32, true)), side: THREE.DoubleSide });
  const burntM = lam({ color: 0x1a1210, side: THREE.DoubleSide });
  for (const k of [1, 2, 3, 4]) for (const off of [2.5, 7.5]) {
    const x = R[k].x0 + off;
    if (k === 1 && off === 2.5) continue;                                         // 교실 왼쪽은 칠판
    const g = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1), winGlass); g.position.set(x, 1.6, -7.89); scene.add(g);
    const fr = box(2.0, 0.08, 0.06, trimM); fr.position.set(x, 1.02, -7.86); scene.add(fr);
    const fr2 = box(0.06, 1.2, 0.06, trimM); fr2.position.set(x, 1.6, -7.86); scene.add(fr2);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.2), shaftM); sh.position.set(x, 0.9, -6.6); sh.rotation.x = -1.05; scene.add(sh);
    const burnt = k === 1;
    for (const s of [-1, 1]) {
      const c = new THREE.Mesh(new THREE.PlaneGeometry(0.45, burnt ? 0.9 : 1.6), burnt ? burntM : curtainM);
      c.position.set(x + s * 0.85, burnt ? 1.75 : 1.4, -7.8); c.rotation.y = s * 0.15; scene.add(c);
    }
  }

  /* ---------- 문 ---------- */
  const doorM = lam({ map: TX.toTex(TX.bakeDoor()) });
  const doors = {};
  function door(key, x, z, axis, w, open) {
    const pivot = new THREE.Group();
    const d = box(w, 2.1, 0.07, doorM); d.position.set(w / 2, 1.05, 0); d.castShadow = true;
    const knob = box(0.07, 0.07, 0.14, lam({ color: 0xb8a070 })); knob.position.set(w - 0.15, 1.0, 0);
    pivot.add(d, knob);
    if (axis === "x") pivot.position.set(x - w / 2, 0, z);
    else { pivot.position.set(x, 0, z - w / 2); pivot.rotation.y = -Math.PI / 2; }
    scene.add(pivot);
    const col = axis === "x" ? solid(x - w / 2, x + w / 2, z - 0.1, z + 0.1, "door") : solid(x - 0.1, x + 0.1, z - w / 2, z + w / 2, "door");
    doors[key] = { pivot, col, axis, open: null, base: pivot.rotation.y };
    if (axis === "x") cutaway.push({ m: pivot, kind: "door" });
    setDoor(key, open);
  }
  function setDoor(key, open) {
    const D = doors[key]; if (!D || D.open === open) return;
    D.open = open; D.col.off = open;
    D.goal = D.base + (open ? (D.axis === "x" ? -1.7 : 1.7) : 0);
  }
  door(1, R[1].door, 0, "x", 1.4, true);
  [2, 3, 4].forEach(k => door(k, R[k].door, 0, "x", 1.4, false));
  door("front", 0, MAP.frontDoor.z, "z", 1.6, false);
  door("short", MAP.shortcut.x, MAP.shortcut.z, "z", 1.0, false);
  /* 숙직실 문 안쪽: 쓰러진 책장 (문이 안 열리는 이유) */
  { const bs = box(1.8, 0.45, 0.9, lam({ map: TX.toTex(TX.bakeWood(31, [86, 60, 38], 32, 32, true)) })); bs.position.set(25, 0.24, -0.75); bs.rotation.y = 0.15; bs.castShadow = true; scene.add(bs); solid(24.1, 25.9, -1.2, -0.3); }
  /* 선착장 6시 배 */
  const boat = new THREE.Group(); boat.position.set(-19.5, -0.1, 1.5); scene.add(boat);
  { const hull = box(2.4, 0.7, 5.5, lam({ color: 0xd8d8d0 })); hull.position.y = 0.2; boat.add(hull);
    const stripe = box(2.42, 0.12, 5.52, lam({ color: 0x2a4a8a })); stripe.position.y = 0.45; boat.add(stripe);
    const cab = box(1.8, 1.2, 2.2, lam({ color: 0xeeeeea })); cab.position.set(0, 1.1, -0.6); boat.add(cab);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.4), new THREE.MeshBasicMaterial({ color: 0xffe0a0 })); win.position.set(0.91, 1.3, -0.6); win.rotation.y = Math.PI / 2; boat.add(win); }
  const boatLamp = new THREE.PointLight(0xffd8a0, 3, 9, 1.5); boatLamp.position.set(-18.5, 2.2, 1.5); scene.add(boatLamp);

  /* ---------- 가구 ---------- */
  const deskTop = lam({ map: TX.toTex(TX.bakeWood(6, [150, 112, 70])) });
  const metal = lam({ color: 0x5a5c5e });
  const darkWood = lam({ map: TX.toTex(TX.bakeWood(8, [92, 64, 40], 32, 32, true)) });
  const lockerM = lam({ map: TX.toTex(TX.bakeLocker()) });
  const R_ = TX.rng(77);
  let decoy = null;
  function desk(x, z, w, d, h) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const top = box(w, 0.05, d, deskTop); top.position.y = h; g.add(top);
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = box(0.04, h, 0.04, metal); l.position.set(lx * (w / 2 - 0.05), h / 2, lz * (d / 2 - 0.05)); g.add(l); }
    const shelf = box(w - 0.1, 0.12, d - 0.1, metal); shelf.position.y = h - 0.12; g.add(shelf);
    return g;
  }
  function chair(x, z, rot, fallen = false) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot;
    const seat = box(0.4, 0.04, 0.38, deskTop); seat.position.y = 0.42; g.add(seat);
    const back = box(0.4, 0.3, 0.03, deskTop); back.position.set(0, 0.7, -0.18); g.add(back);
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = box(0.03, 0.42, 0.03, metal); l.position.set(lx * 0.17, 0.21, lz * 0.16); g.add(l); }
    if (fallen) { g.rotation.z = Math.PI / 2; g.position.y = 0.2; }
    return g;
  }
  for (const [x, z, w, d, h, kind] of MAP.furniture) {
    let o;
    if (kind === "desk") { o = desk(x, z, w, d, h); const fall = R_() < 0.25; scene.add(chair(x + (fall ? 0.3 : 0), z + 0.55, Math.PI + (R_() - 0.5) * 0.6, fall)); }
    else if (kind === "teacher") { o = new THREE.Group(); o.position.set(x, 0, z); const b = box(w, h, d, darkWood); b.position.y = h / 2; o.add(b); const t = box(w + 0.08, 0.05, d + 0.08, deskTop); t.position.y = h; o.add(t); }
    else if (kind === "locker") { o = box(w, h, d, lockerM); o.position.set(x, h / 2, z); }
    else if (kind === "bed") { o = new THREE.Group(); o.position.set(x, 0, z); const fr = box(w, 0.3, d, darkWood); fr.position.y = 0.15; o.add(fr); const mt = box(w - 0.1, 0.16, d - 0.1, lam({ color: 0x8a8a96 })); mt.position.y = 0.38; o.add(mt); const bl = box(w * 0.7, 0.08, d, lam({ color: 0x5a4a6a })); bl.position.set(0.2, 0.48, 0); o.add(bl); }
    else if (kind === "console") { o = new THREE.Group(); o.position.set(x, 0, z); const b = box(w, h, d, lam({ color: 0x2c3036 })); b.position.y = h / 2; o.add(b); for (let i = 0; i < 10; i++) { const k = box(0.08, 0.04, 0.08, lam({ color: i % 3 ? 0x888888 : 0xaa4433 })); k.position.set(-w / 2 + 0.3 + i * 0.28, h + 0.02, 0); o.add(k); } }
    else if (kind === "decoy") { decoy = makeMannequin(); decoy.group.traverse(m => { if (m.isMesh && !m.userData.hull) ps1(m.material); }); decoy.group.position.set(x, 0, z); decoy.group.rotation.y = 0.6; scene.add(decoy.group); solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2, kind); continue; }
    else if (kind === "police") {
      o = new THREE.Group(); o.position.set(x, 0, z);
      const b = box(w, h, d, lam({ color: 0xd8d8d0 })); b.position.y = h / 2; o.add(b);
      const roof = box(w + 0.3, 0.2, d + 0.3, lam({ color: 0x24407a })); roof.position.y = h + 0.1; o.add(roof);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff3030 })); lamp.position.y = h + 0.35; o.add(lamp);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.7), new THREE.MeshBasicMaterial({ color: 0xffe0a0 })); win.position.set(0, 1.4, d / 2 + 0.01); o.add(win);
    }
    else { o = box(w, h, d, darkWood); o.position.set(x, h / 2, z); }
    o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    scene.add(o);
    solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2, kind);
  }

  /* ---------- ① 교실 소품: 칠판 · 1999년 달력 · 깨진 시계 · 학급문고 · 종이 ---------- */
  {
    const cb = box(4.2, 1.25, 0.05, lam({ map: TX.toTex(TX.bakeChalkboard([["1999. 5. 3. (월)", 8, 6, 9], ["자 습", 70, 20, 14], ["주번  윤재희", 104, 48, 8], ["떠든 사람:", 8, 46, 8]])) }));
    cb.position.set(3.0, 1.55, -7.86); scene.add(cb);
    const cal = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), lam({ map: TX.toTex(calendarCanvas()) })); cal.position.set(9.6, 1.6, -7.88); scene.add(cal);
    const clk = new THREE.Group(); clk.position.set(5.6, 2.05, -7.87); scene.add(clk);
    clk.add(new THREE.Mesh(new THREE.CircleGeometry(0.2, 12), lam({ color: 0xd8d0b8 })));
    clk.add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 4, 12), lam({ color: 0x2a2a2a })));
    const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.02), lam({ color: 0x222222 })); crack.rotation.z = 0.7; crack.position.z = 0.01; clk.add(crack);
    const shelf = box(0.35, 1.2, 1.6, darkWood); shelf.position.set(0.3, 0.6, -6.2); shelf.castShadow = true; scene.add(shelf); solid(0.1, 0.5, -7, -5.4);
    for (let i = 0; i < 9; i++) { const b = box(0.22, 0.24 + R_() * 0.08, 0.05 + R_() * 0.04, lam({ color: [0x8a3a2a, 0x2a4a6a, 0x6a6a3a, 0x4a3a5a][i % 4] })); b.position.set(0.32, 0.95, -6.85 + i * 0.16); b.rotation.x = (R_() - 0.5) * 0.3; scene.add(b); }
    const paperM = lam({ color: 0xe2dccb, side: THREE.DoubleSide });
    for (let i = 0; i < 14; i++) { const pp = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.29), paperM); pp.rotation.x = -Math.PI / 2; pp.rotation.z = R_() * 6; pp.position.set(1.5 + R_() * 7.5, 0.012 + i * 0.0005, -7 + R_() * 6.6); scene.add(pp); }
    const tvStand = box(0.7, 1.1, 0.5, metal); tvStand.position.set(6.8, 0.55, -7.55); scene.add(tvStand);
  }
  function calendarCanvas() {
    const c = document.createElement("canvas"); c.width = 40; c.height = 56; const g = c.getContext("2d");
    g.fillStyle = "#d8d2bc"; g.fillRect(0, 0, 40, 56); g.fillStyle = "#a03030"; g.fillRect(0, 0, 40, 12);
    g.fillStyle = "#fff"; g.font = "bold 9px sans-serif"; g.fillText("1999", 4, 9); g.fillStyle = "#333"; g.font = "bold 12px sans-serif"; g.fillText("5", 16, 26);
    g.fillStyle = "#555"; for (let i = 0; i < 30; i++) g.fillRect(4 + (i % 7) * 5, 32 + ((i / 7) | 0) * 5, 3, 2);
    g.strokeStyle = "#c03030"; g.strokeRect(13, 31, 5, 4);
    return c;
  }

  /* ---------- 살펴볼 것 ---------- */
  const items = {};
  let tvScreen = null;
  const ringGeo = new THREE.RingGeometry(0.3, 0.4, 18);
  for (const it of MAP.items) {
    const g = new THREE.Group(); g.position.set(it.x, 0, it.z);
    let m = new THREE.Group();
    if (it.kind === "memo") { m = box(0.16, 0.02, 0.3, lam({ color: 0x111111, emissive: 0x2a5a8a })); m.position.y = 0.98; }
    else if (it.kind === "order") { m = box(1.3, 0.8, 0.12, lam({ color: 0x18181a })); m.position.set(0, 1.5, 0.05); tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.65), new THREE.MeshBasicMaterial({ color: 0x0c1418 })); tvScreen.position.z = 0.07; m.add(tvScreen); }
    else if ((it.kind === "code" || it.kind === "word") && it.room !== 5) {
      m = box(0.6, 0.45, 0.4, lam({ map: TX.toTex(TX.bakeWood(9, [90, 70, 44])) })); m.position.y = 0.23;
      const l = box(0.14, 0.18, 0.06, lam({ color: 0xb09040 })); l.position.set(0, 0.05, 0.22); m.add(l);
    }
    else if (it.kind === "diary") { m = box(0.3, 0.02, 0.22, new THREE.MeshLambertMaterial({ color: 0xe8dcc0, transparent: true, opacity: 0 })); m.position.y = 0.03; m.rotation.y = 0.5; }
    else if (it.kind === "battery") { m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 6), lam({ color: 0xd4b030, emissive: 0x302400 })); m.position.y = 0.1; m.rotation.z = Math.PI / 2; }
    m.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.add(m);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; g.add(ring);
    scene.add(g);
    items[it.id] = { g, m, ring, it, gone: false };
  }

  /* ---------- ② 환등기와 벽에 비친 사진 ---------- */
  const projector = box(0.4, 0.25, 0.35, lam({ color: 0x2b2b2e })); projector.position.set(12.6, 0.9, -4.5); projector.castShadow = true; scene.add(projector);
  const pc = document.createElement("canvas"); pc.width = 480; pc.height = 320;
  const ptex = new THREE.CanvasTexture(pc); ptex.colorSpace = THREE.SRGBColorSpace;
  { const im = new Image(); im.onload = () => { pc.getContext("2d").drawImage(im, 0, 0, 480, 320); ptex.needsUpdate = true; };
    im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(photoSVG().replace('class="scene photo" ', 'width="480" height="320" ')); }
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.4), new THREE.MeshBasicMaterial({ map: ptex, transparent: true, opacity: 0, fog: false }));
  pic.position.set(15, 1.45, -7.88); scene.add(pic);
  const beamGeo = new THREE.ConeGeometry(1.7, 1, 4, 1, true); beamGeo.rotateY(Math.PI / 4); beamGeo.rotateX(-Math.PI / 2);
  const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
  { const a = new THREE.Vector3(12.6, 0.92, -4.7), b = new THREE.Vector3(15, 1.45, -7.86); beam.scale.set(1, 1, a.distanceTo(b)); beam.position.copy(a).add(b).multiplyScalar(0.5); beam.lookAt(b); }
  scene.add(beam);
  const projLight = new THREE.PointLight(0xfff0c0, 0, 5, 1.5); projLight.position.set(15, 1.4, -7.3); scene.add(projLight);
  let projOn = false, projK = 0, tvOn = false;

  /* ---------- 먼지 (손전등 빛 속에 떠다님) ---------- */
  const DN = 260, dpos = new Float32Array(DN * 3), dR = TX.rng(5);
  for (let i = 0; i < DN; i++) { dpos[i * 3] = dR() * 8 - 4; dpos[i * 3 + 1] = dR() * 2.2; dpos[i * 3 + 2] = dR() * 8 - 4; }
  const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute("position", new THREE.BufferAttribute(dpos, 3));
  const dust = new THREE.Points(dgeo, new THREE.PointsMaterial({ color: 0xfff4dc, size: 0.035, transparent: true, opacity: 0.6, depthWrite: false }));
  scene.add(dust);

  /* ---------- 인물 ---------- */
  const rigs = {};
  let P = null, disposed = false;
  function rigFor(id, opts) {
    if (P && rigs[id] && !rigs[id].glb) {             // 사람 모델이 도착하면 예전 인형과 바꿈
      const old = rigs[id]; scene.remove(old.group);
      try { rigs[id] = makePerson(P, id, Object.assign({}, opts, { ps1 })); rigs[id].a = old.a; scene.add(rigs[id].group); }
      catch (e) { console.warn(e); rigs[id] = old; scene.add(old.group); old.glb = true; }
    }
    if (!rigs[id]) { rigs[id] = makeRig(id, opts); rigs[id].group.traverse(o => { if (o.isMesh && !o.userData.hull) ps1(o.material); }); scene.add(rigs[id].group); rigs[id].a = 0; }
    return rigs[id];
  }
  let it = makeMannequin(); it.group.traverse(o => { if (o.isMesh) ps1(o.material); }); scene.add(it.group);
  loadPeople().then(p => {
    if (!p || disposed) return;
    P = p;
    try {
      const n = makeThing(P, { ps1 }); scene.remove(it.group); it = n; scene.add(it.group);
      if (decoy) { const d = makeThing(P, { ps1, decoy: true }); d.group.position.copy(decoy.group.position); d.group.rotation.copy(decoy.group.rotation); scene.remove(decoy.group); decoy = d; scene.add(d.group); }
    } catch (e) { console.warn(e); }
  });
  const fan = new THREE.Mesh(new THREE.CircleGeometry(IT.sight, 18, -IT.fov, IT.fov * 2),
    new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.08, depthWrite: false, fog: false }));
  fan.geometry.rotateX(-Math.PI / 2); scene.add(fan);

  /* ---------- 화면: 작게 그리고 디더링 ---------- */
  const rt = new THREE.WebGLRenderTarget(2, 2, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const post = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: rt.texture }, uRes: { value: new THREE.Vector2(2, 2) }, uTime: { value: 0 }, uStatic: { value: 0 }, uDark: { value: 0 }, uFear: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uTime, uStatic, uDark, uFear; varying vec2 vUv;
      float bayer(vec2 p){ ivec2 q = ivec2(mod(p, 4.)); int i = q.x + q.y * 4;
        float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.); return m[i] / 16. - .5; }
      float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime * 7.) * 43758.5453); }
      void main(){
        vec2 uv = vUv; vec2 d = uv - .5;
        uv += d * dot(d, d) * uFear * .08 * sin(uTime * 3.);
        vec3 c = texture2D(tDiffuse, uv).rgb;
        c = pow(max(c, 0.), vec3(1. / 2.2));
        c = mix(c, vec3(dot(c, vec3(.3, .59, .11))), uFear * .5);
        vec2 px = floor(uv * uRes);
        float lv = 14.;
        c = floor(c * lv + bayer(px) * .55 + .5) / lv;
        c *= 1. - dot(d, d) * (1.4 + uFear);
        c += (rnd(px) - .5) * .035;
        if (uStatic > 0.) { c = mix(c, vec3(rnd(px)), uStatic * .6); c += step(.96, fract(vUv.y * 9. + uTime * 2.3)) * uStatic * .35; }
        c *= 1. - uDark;
        gl_FragColor = vec4(c, 1.);
      }`,
    depthTest: false, depthWrite: false
  });
  const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));

  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    const rw = Math.max(200, Math.ceil(w / pixel)), rh = Math.max(120, Math.ceil(h / pixel));
    renderer.setSize(rw, rh, false); rt.setSize(rw, rh);
    post.uniforms.uRes.value.set(rw, rh); SNAP.value.set(rw / 2, rh / 2);
    camera.aspect = rw / rh;
    /* 세로 화면(폰·태블릿 세로)에서는 옆이 너무 좁지 않게 시야를 넓힘 */
    const asp = rw / rh;
    camera.fov = asp >= 1.3 ? 42 : Math.min(66, 2 * Math.atan(Math.tan(25 * Math.PI / 180) / asp) * 180 / Math.PI);
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize); resize();

  /* ---------- 부딪힘 계산 ---------- */
  function hits(x, z, r) {
    for (const c of colliders) { if (c.off) continue; if (x + r > c.x0 && x - r < c.x1 && z + r > c.z0 && z - r < c.z1) return true; }
    return false;
  }
  function move(x, z, dx, dz, r = 0.28) {
    let nx = x + dx, nz = z;
    if (hits(nx, nz, r)) nx = x;
    nz = z + dz;
    if (hits(nx, nz, r)) nz = z;
    const sp = Math.hypot(dx, dz);
    if (nz === z && Math.abs(dz) > Math.abs(dx)) {
      for (const o of [0.15, -0.15, 0.3, -0.3, 0.45, -0.45]) if (!hits(x + o, z + dz, r) && !hits(x + Math.sign(o) * sp, z, r)) { nx = x + Math.sign(o) * sp; break; }
    } else if (nx === x && Math.abs(dx) > Math.abs(dz)) {
      for (const o of [0.15, -0.15, 0.3, -0.3, 0.45, -0.45]) if (!hits(x + dx, z + o, r) && !hits(x, z + Math.sign(o) * sp, r)) { nz = z + Math.sign(o) * sp; break; }
    }
    return { x: nx, z: nz };
  }

  /* ---------- 매 장면 ---------- */
  const tmp = new THREE.Vector3(), look = new THREE.Vector3(), pv = new THREE.Vector3();
  let t0 = performance.now(), dustT = 0, cutK = 1, flickT = 0;
  function frame(S) {
    const now = performance.now(), dt = Math.min(0.1, (now - t0) / 1000); t0 = now;
    const p = Math.max(0, Math.min(1, S.progress || 0));
    sun.intensity = 1.6 * (1 - p) + 0.05;
    sky.material.color.setHSL(0.06 - p * 0.04, 0.75, 0.6 - p * 0.45);
    amb.intensity = 1.0 - p * 0.6; hemi.intensity = 0.6 - p * 0.4;
    shaftM.opacity = 0.05 * (1 - p * 0.7);
    scene.fog.density = 0.045 + p * 0.03;

    for (const k in doors) { const D = doors[k]; if (D.goal != null) D.pivot.rotation.y += (D.goal - D.pivot.rotation.y) * Math.min(1, dt * 6); }

    projK += ((projOn ? 1 : 0) - projK) * Math.min(1, dt * 1.5);
    const flick = projOn && Math.random() < 0.03 ? 0.6 : 1;
    pic.material.opacity = 0.92 * projK * flick; beam.material.opacity = 0.09 * projK * flick; projLight.intensity = 2.5 * projK;
    if (tvScreen) tvScreen.material.color.setHex(tvOn === "static" ? (Math.random() < 0.5 ? 0xb0b8c0 : 0x404850) : tvOn ? (Math.random() < 0.05 ? 0x6a8aa0 : 0x4a6a80) : 0x0c1418);

    const seen = new Set();
    for (const c of S.chars) {
      const Rg = rigFor(c.id, c.opts); seen.add(c.id);
      Rg.group.visible = !c.hidden;
      Rg.a += angDiff(Rg.a, c.a) * Math.min(1, dt * 12);
      Rg.group.position.set(c.x, 0, c.z); Rg.group.rotation.y = Math.PI / 2 - Rg.a;
      Rg.update(dt, { speed: c.speed || 0, mode: c.mode, lookAt: c.lookAt });
    }
    for (const id in rigs) if (!seen.has(id)) rigs[id].group.visible = false;

    const me = S.me;
    if (me) {
      const ax = Math.cos(me.a), az = Math.sin(me.a);
      flash.visible = !!me.flash;
      flash.position.set(me.x + ax * 0.3, 1.05, me.z + az * 0.3);
      flash.target.position.set(me.x + ax * 6, 0.1, me.z + az * 6);
      flash.intensity = 46 * Math.max(0.25, Math.min(1, (me.bat || 0) / 30 + 0.2)) * (Math.random() < 0.01 && me.bat < 30 ? 0.3 : 1);
      glow.position.set(me.x + ax * 0.4, 0.9, me.z + az * 0.4); glow.intensity = me.flash ? 0.9 : 0.25;
      fill.position.set(me.x, 2.4, me.z + 1.6);
      /* 인형의 집처럼: 방 안에 있으면 앞(남쪽) 벽을 허리 높이로 */
      cutK += ((me.z < -0.25 ? 0.32 : 1) - cutK) * Math.min(1, dt * 6);
      for (const c of cutaway) {
        if (c.kind === "wall") { c.m.scale.y = cutK; c.m.position.y = H * cutK / 2; }
        else if (c.kind === "lintel") c.m.visible = cutK > 0.95;
        else c.m.scale.y = cutK;
      }
      camera.position.lerp(tmp.set(me.x, 0, me.z).add(CAM), Math.min(1, dt * 4));
      look.set(camera.position.x, 0.6, camera.position.z - CAM.z);
      camera.lookAt(look);
      dustT += dt; dust.position.set(me.x, 0, me.z);
      const a = dgeo.attributes.position.array;
      for (let i = 0; i < DN; i++) { a[i * 3 + 1] += Math.sin(dustT * 0.7 + i) * 0.0015; a[i * 3] += Math.cos(dustT * 0.3 + i * 2) * 0.001; }
      dgeo.attributes.position.needsUpdate = true;
      dust.material.opacity = me.flash ? 0.55 : 0.15;
    }

    for (const id in items) {
      const I = items[id];
      I.g.visible = !I.gone;
      I.ring.material.opacity = S.near === id ? 0.5 + Math.sin(now / 200) * 0.25 : 0;
      if (I.it.kind === "diary") I.m.material.opacity = S.lit && S.lit.includes(id) ? 1 : 0;
    }

    if (decoy && S.decoy) { decoy.group.rotation.y += (Math.PI / 2 - S.decoy.a - decoy.group.rotation.y) * Math.min(1, dt * (S.decoy.snap ? 30 : 0)); }
    boatLamp.intensity = 2.5 + Math.sin(now / 300) * 0.8;
    if (flickT > 0) { flickT -= dt; const f = Math.random() < 0.5 ? 0.15 : 1; amb.intensity *= f; hemi.intensity *= f; }
    if (S.it && S.it.off) {
      it.group.visible = true; fan.visible = false;
      if (it.lies) { it.group.position.set(S.it.x, 0, S.it.z); it.group.rotation.set(0, 0.4, 0); it.update(dt, { off: true }); }
      else { it.group.position.set(S.it.x, 0.18, S.it.z); it.group.rotation.set(-Math.PI / 2, 0, 0.4); }
    } else if (S.it) {
      it.group.rotation.x = 0;
      it.group.visible = fan.visible = !S.it.hide;
      it.group.position.set(S.it.x, 0, S.it.z); it.group.rotation.set(0, Math.PI / 2 - S.it.dir, 0);
      it.update(dt, { speed: S.it.moving === false ? 0 : 1, alert: S.it.alert });
      fan.position.set(S.it.x, 0.04, S.it.z); fan.rotation.y = -S.it.dir;
      fan.material.opacity = S.it.weak ? 0.04 : 0.08 + (S.it.alert ? 0.14 : 0);
    }

    post.uniforms.uTime.value = now / 1000;
    post.uniforms.uStatic.value = S.static || 0;
    post.uniforms.uDark.value = S.dark || 0;
    post.uniforms.uFear.value += ((S.fear || 0) - post.uniforms.uFear.value) * Math.min(1, dt * 3);
    renderer.setRenderTarget(rt); renderer.render(scene, camera);
    renderer.setRenderTarget(null); renderer.render(postScene, postCam);
  }

  function project(x, y, z) {
    pv.set(x, y, z).project(camera);
    return { x: (pv.x + 1) / 2 * canvas.clientWidth, y: (1 - pv.y) / 2 * canvas.clientHeight, on: pv.z < 1 };
  }

  return {
    frame, move, setDoor, resize, project, hits,
    setProjection: v => { projOn = !!v; },
    setTV: v => { tvOn = v; },
    flicker: sec => { flickT = sec; },
    setItemGone: (id, v) => { if (items[id]) items[id].gone = v; },
    dispose: () => { disposed = true; removeEventListener("resize", resize); renderer.dispose(); }
  };
}

function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
