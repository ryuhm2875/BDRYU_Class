/* ──────────────────────────────────────────────────────────────
   마지막 배는 6시 · 픽셀 텍스처 (그림 파일 없이 캔버스로 그림)
   - 모두 작은 해상도 + 가장 가까운 점 보간 → 레트로 느낌
   - 바닥은 방마다 한 장으로 굽고, 벽 모서리·가구 밑 그늘까지 미리 그려 넣음
   ────────────────────────────────────────────────────────────── */
import * as THREE from "../vendor/three.module.min.js";

/* 같은 씨앗이면 같은 무늬 (기기마다 똑같이) */
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
}
const cv = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const hex = (r, g, b) => `rgb(${r | 0},${g | 0},${b | 0})`;
function tint([r, g, b], k) { return hex(r * k, g * k, b * k); }

export function toTex(c, { repeat = null, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.anisotropy = 1;
  return t;
}

/* 점점이 흩뿌린 얼룩 */
function speckle(g, w, h, R, n, colors, size = 1) {
  for (let i = 0; i < n; i++) { g.fillStyle = colors[(R() * colors.length) | 0]; g.fillRect((R() * w) | 0, (R() * h) | 0, size, size); }
}
function blob(g, x, y, r, color, alpha) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, color.replace("rgb", "rgba").replace(")", `,${alpha})`)); gr.addColorStop(1, color.replace("rgb", "rgba").replace(")", ",0)"));
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
}

/* ---------- 나무 마루 (방 한 장, 그늘까지) ----------
   rect: {x0,x1,z0,z1} m, px: 1m 당 점 수, shadows: [[x,z,w,d]] 가구 자리 */
export function bakeWoodFloor(rect, { seed = 1, base = [112, 78, 48], px = 16, shadows = [], burn = null } = {}) {
  const W = Math.round((rect.x1 - rect.x0) * px), H = Math.round((rect.z1 - rect.z0) * px);
  const c = cv(W, H), g = c.getContext("2d"), R = rng(seed);
  const plank = 0.25 * px;                                         // 판자 폭 25cm
  for (let y = 0; y < H; y += plank) {
    let x = -((R() * 3 * px) | 0);
    while (x < W) {
      const len = (1.2 + R() * 1.6) * px, k = 0.78 + R() * 0.35;
      g.fillStyle = tint(base, k); g.fillRect(x, y, len, plank);
      for (let i = 0; i < 3; i++) { g.fillStyle = tint(base, k * (0.86 + R() * 0.08)); g.fillRect(x, y + ((R() * plank) | 0), len, 1); }   // 나뭇결
      if (R() < 0.3) { g.fillStyle = tint(base, k * 0.6); g.fillRect(x + ((R() * len) | 0), y + ((R() * plank) | 0), 2, 1); }            // 옹이
      g.fillStyle = tint(base, 0.42); g.fillRect(x, y, 1, plank);
      x += len;
    }
    g.fillStyle = tint(base, 0.38); g.fillRect(0, y, W, 1);
  }
  speckle(g, W, H, R, W * H / 18, ["rgba(0,0,0,.18)", "rgba(255,230,190,.07)"]);
  finishFloor(g, W, H, rect, px, shadows, R, burn);
  return c;
}

/* ---------- 복도 테라조 (돌가루 박힌 바닥) ---------- */
export function bakeTerrazzo(rect, { seed = 7, px = 16, shadows = [] } = {}) {
  const W = Math.round((rect.x1 - rect.x0) * px), H = Math.round((rect.z1 - rect.z0) * px);
  const c = cv(W, H), g = c.getContext("2d"), R = rng(seed);
  g.fillStyle = hex(118, 116, 104); g.fillRect(0, 0, W, H);
  speckle(g, W, H, R, W * H / 3, [hex(96, 94, 86), hex(140, 136, 122), hex(84, 88, 80), hex(150, 120, 96)]);
  speckle(g, W, H, R, W * H / 40, [hex(60, 60, 56), hex(170, 166, 150)], 2);
  for (let x = 0; x < W; x += px * 1.2) { g.fillStyle = "rgba(40,40,36,.55)"; g.fillRect(x | 0, 0, 1, H); }      // 줄눈
  g.fillStyle = "rgba(40,40,36,.55)"; g.fillRect(0, (H / 2) | 0, W, 1);
  for (let i = 0; i < 18; i++) blob(g, R() * W, R() * H, (0.4 + R() * 1.2) * px, "rgb(30,26,20)", 0.25);    // 물자국
  finishFloor(g, W, H, rect, px, shadows, R);
  return c;
}

/* ---------- 바깥 흙 · 선착장 콘크리트 ---------- */
export function bakeGround(rect, { seed = 9, px = 8 } = {}) {
  const W = Math.round((rect.x1 - rect.x0) * px), H = Math.round((rect.z1 - rect.z0) * px);
  const c = cv(W, H), g = c.getContext("2d"), R = rng(seed);
  g.fillStyle = hex(74, 66, 50); g.fillRect(0, 0, W, H);
  speckle(g, W, H, R, W * H / 2, [hex(64, 58, 44), hex(88, 78, 58), hex(58, 62, 44), hex(96, 90, 70)]);
  for (let i = 0; i < 40; i++) blob(g, R() * W, R() * H, (0.5 + R() * 2) * px, "rgb(40,52,30)", 0.35);      // 풀 자리
  return c;
}

function finishFloor(g, W, H, rect, px, shadows, R, burn) {
  /* 벽 모서리 그늘 */
  const e = 0.7 * px;
  for (const [x, y, w, h, dir] of [[0, 0, W, e, "v"], [0, H - e, W, e, "v2"], [0, 0, e, H, "h"], [W - e, 0, e, H, "h2"]]) {
    const gr = dir[0] === "v" ? g.createLinearGradient(0, dir === "v" ? 0 : H, 0, dir === "v" ? e : H - e) : g.createLinearGradient(dir === "h" ? 0 : W, 0, dir === "h" ? e : W - e, 0);
    gr.addColorStop(0, "rgba(0,0,0,.55)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  }
  /* 가구 밑 그늘 */
  for (const [x, z, w, d] of shadows) {
    const cx = (x - rect.x0) * px, cy = (z - rect.z0) * px;
    g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(cx - w * px / 2 - 1, cy - d * px / 2 - 1, w * px + 2, d * px + 2);
    blob(g, cx, cy, Math.max(w, d) * px * 0.9, "rgb(0,0,0)", 0.3);
  }
  /* 먼지 · 종이 쪼가리 */
  for (let i = 0; i < W * H / 900; i++) { g.fillStyle = R() < 0.5 ? "rgba(230,222,200,.55)" : "rgba(200,200,190,.4)"; g.fillRect((R() * W) | 0, (R() * H) | 0, 2 + ((R() * 3) | 0), 1 + ((R() * 2) | 0)); }
  if (burn) {                                                          // 불탄 자국
    const cx = (burn[0] - rect.x0) * px, cy = (burn[1] - rect.z0) * px;
    blob(g, cx, cy, burn[2] * px, "rgb(10,8,6)", 0.85); blob(g, cx + px, cy - px * 0.5, burn[2] * px * 0.6, "rgb(0,0,0)", 0.6);
  }
}

/* ---------- 벽: 위는 미색 회벽, 아래는 초록 페인트 (옛 학교) ----------
   길이 L m, 높이 2.4m 한 장. 물 번진 얼룩, 벗겨진 칠 */
export function bakeWall(L, { seed = 3, px = 16, upper = [196, 190, 164], lower = [70, 98, 82], soot = 0 } = {}) {
  const W = Math.max(8, Math.round(L * px)), H = Math.round(2.4 * px);
  const c = cv(W, H), g = c.getContext("2d"), R = rng(seed);
  const split = Math.round(H * 0.42);
  g.fillStyle = hex(...upper); g.fillRect(0, 0, W, H - split);
  speckle(g, W, H - split, R, W * H / 6, [tint(upper, 0.92), tint(upper, 1.04), tint(upper, 0.86)]);
  g.fillStyle = hex(...lower); g.fillRect(0, H - split, W, split);
  for (let i = 0; i < W * split / 5; i++) { g.fillStyle = R() < 0.5 ? tint(lower, 0.9) : tint(lower, 1.1); g.fillRect((R() * W) | 0, H - split + ((R() * split) | 0), 1, 1); }
  g.fillStyle = tint(lower, 0.55); g.fillRect(0, H - split - 1, W, 2);                         // 경계 띠
  g.fillStyle = hex(40, 36, 30); g.fillRect(0, H - 3, W, 3);                                    // 걸레받이
  for (let i = 0; i < L * 0.8; i++) {                                                             // 물 번진 얼룩 (위에서 흘러내림)
    const x = R() * W, w = (0.3 + R()) * px, h = (0.5 + R() * 1.2) * px;
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(90,70,40,.35)"); gr.addColorStop(1, "rgba(90,70,40,0)");
    g.fillStyle = gr; g.fillRect(x, 0, w, h);
  }
  for (let i = 0; i < L * 1.5; i++) {                                                             // 벗겨진 칠
    const x = (R() * W) | 0, y = H - split + ((R() * (split - 4)) | 0);
    g.fillStyle = hex(150, 142, 120); g.fillRect(x, y, 1 + ((R() * 4) | 0), 1 + ((R() * 2) | 0));
  }
  if (soot) for (let i = 0; i < soot; i++) blob(g, R() * W, R() * H * 0.6, (0.8 + R() * 1.5) * px, "rgb(8,6,4)", 0.7);
  return c;
}

/* ---------- 칠판 (분필 글씨) ---------- */
export function bakeChalkboard(lines = []) {
  const W = 160, H = 64, c = cv(W, H), g = c.getContext("2d"), R = rng(11);
  g.fillStyle = hex(36, 58, 46); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 14; i++) blob(g, R() * W, R() * H, 8 + R() * 18, "rgb(150,170,160)", 0.12);        // 지운 자국
  speckle(g, W, H, R, 900, ["rgba(200,220,210,.08)", "rgba(0,0,0,.12)"]);
  g.fillStyle = "rgba(230,236,226,.85)"; g.font = "9px sans-serif"; g.textBaseline = "top";
  lines.forEach(([t, x, y, s = 9]) => { g.font = `${s}px sans-serif`; g.fillText(t, x, y); });
  g.strokeStyle = hex(110, 82, 52); g.lineWidth = 4; g.strokeRect(0, 0, W, H);
  g.fillStyle = hex(92, 70, 44); g.fillRect(0, H - 4, W, 4);
  return c;
}

/* ---------- 철제 사물함 (녹) ---------- */
export function bakeLocker(seed = 5) {
  const W = 32, H = 64, c = cv(W, H), g = c.getContext("2d"), R = rng(seed);
  g.fillStyle = hex(84, 104, 96); g.fillRect(0, 0, W, H);
  speckle(g, W, H, R, 500, [hex(76, 96, 88), hex(94, 114, 104)]);
  g.fillStyle = hex(50, 64, 58); g.fillRect(0, 0, W, 1); g.fillRect(0, H / 2, W, 1); g.fillRect(W / 2, 0, 1, H);
  for (const y of [6, 9, 12, 38, 41, 44]) for (const x0 of [3, W / 2 + 3]) { g.fillStyle = hex(30, 38, 34); g.fillRect(x0, y, 10, 1); }   // 환기구
  for (const [x, y] of [[12, 20], [W / 2 + 12, 20], [12, 52], [W / 2 + 12, 52]]) { g.fillStyle = hex(150, 150, 140); g.fillRect(x, y, 2, 4); }
  for (let i = 0; i < 26; i++) { const x = R() * W, y = R() * H; g.fillStyle = `rgba(${120 + R() * 40},${60 + R() * 20},30,.6)`; g.fillRect(x | 0, y | 0, 1 + ((R() * 3) | 0), 1 + ((R() * 5) | 0)); }
  return c;
}

/* ---------- 나무 판 (책상·교탁·문) ---------- */
export function bakeWood(seed = 2, base = [136, 98, 60], w = 32, h = 32, vertical = false) {
  const c = cv(w, h), g = c.getContext("2d"), R = rng(seed);
  g.fillStyle = hex(...base); g.fillRect(0, 0, w, h);
  for (let i = 0; i < (vertical ? w : h); i++) if (R() < 0.45) { g.fillStyle = tint(base, 0.82 + R() * 0.12); vertical ? g.fillRect(i, 0, 1, h) : g.fillRect(0, i, w, 1); }
  speckle(g, w, h, R, w * h / 8, ["rgba(0,0,0,.12)", "rgba(255,240,210,.08)"]);
  for (let i = 0; i < 4; i++) { g.fillStyle = "rgba(240,230,210,.35)"; g.fillRect((R() * w) | 0, (R() * h) | 0, 3 + ((R() * 5) | 0), 1); }   // 긁힌 자국
  return c;
}

/* ---------- 문 (나무 + 위쪽 유리창) ---------- */
export function bakeDoor(seed = 4) {
  const W = 24, H = 36, c = cv(W, H), g = c.getContext("2d"), R = rng(seed);
  g.drawImage(bakeWood(seed, [96, 66, 40], W, H, true), 0, 0);
  g.fillStyle = hex(40, 28, 18); g.fillRect(0, 0, W, 1); g.fillRect(0, 0, 1, H); g.fillRect(W - 1, 0, 1, H);
  g.fillStyle = hex(28, 34, 40); g.fillRect(4, 4, W - 8, 11); g.fillStyle = "rgba(160,190,200,.25)"; g.fillRect(5, 5, 4, 9);
  g.fillStyle = hex(40, 28, 18); g.fillRect(W / 2, 4, 1, 11);
  g.fillStyle = hex(58, 40, 24); g.fillRect(3, 19, W - 6, 13);
  return c;
}

/* ---------- 얼굴 (머리 구의 앞쪽에 붙는 띠) ----------
   128×64. 구의 u=0.25(앞)가 x=32. eyes: open|wide|closed|hood */
export function bakeFace(skin = [236, 200, 160], eyes = "open", { blush = true, brows = 0 } = {}) {
  const c = cv(128, 64), g = c.getContext("2d");
  g.fillStyle = hex(...skin); g.fillRect(0, 0, 128, 64);
  g.fillStyle = tint(skin, 0.9); g.fillRect(0, 50, 128, 14);
  if (eyes === "hood") return c;
  const ex = [26, 38], ey = 34;
  for (const x of ex) {
    if (eyes === "closed") { g.fillStyle = "#2a1a14"; g.fillRect(x - 2, ey + 2, 5, 1); continue; }
    const big = eyes === "wide";
    g.fillStyle = "#1e1410"; g.fillRect(x - 2, ey - (big ? 3 : 2), big ? 5 : 4, big ? 7 : 5);
    g.fillStyle = "#fff"; g.fillRect(x - 1, ey - (big ? 2 : 1), 1, 1);
    if (brows) { g.fillStyle = "#2a1a14"; g.fillRect(x - 2, ey - 6 + (x < 32 ? brows : -brows) * 0, 5, 1); }
  }
  if (blush) { g.fillStyle = "rgba(230,120,110,.35)"; g.fillRect(21, 41, 4, 2); g.fillRect(39, 41, 4, 2); }
  g.fillStyle = "#7a3a30"; g.fillRect(31, 45, eyes === "wide" ? 3 : 2, eyes === "wide" ? 3 : 1);
  return c;
}

/* ---------- 교복 몸통 (블레이저 + 셔츠 깃 + 넥타이 + 이름표) ---------- */
export function bakeUniform(jacket = [40, 52, 86], tie = [150, 40, 50], { hood = false } = {}) {
  const c = cv(64, 32), g = c.getContext("2d"), R = rng(jacket[0] * 7 + tie[1]);
  g.fillStyle = hex(...jacket); g.fillRect(0, 0, 64, 32);
  speckle(g, 64, 32, R, 300, [tint(jacket, 0.88), tint(jacket, 1.1)]);
  if (hood) {                                                       // 점퍼: 지퍼 + 방송부 글씨 띠
    g.fillStyle = tint(jacket, 0.6); g.fillRect(15, 0, 2, 32);
    g.fillStyle = "rgba(255,255,255,.65)"; g.fillRect(40, 10, 14, 3);
    g.fillStyle = tint(jacket, 0.7); g.fillRect(0, 28, 64, 4);
    return c;
  }
  g.fillStyle = "#e8e6de"; g.beginPath(); g.moveTo(10, 0); g.lineTo(22, 0); g.lineTo(16, 12); g.closePath(); g.fill();     // 셔츠 깃 (앞 u=0.25)
  g.fillStyle = hex(...tie); g.fillRect(15, 3, 3, 12);
  g.fillStyle = tint(jacket, 0.65); g.fillRect(9, 0, 1, 20); g.fillRect(22, 0, 1, 20);
  g.fillStyle = "#ddd8c8"; g.fillRect(24, 8, 6, 2);                                                                             // 이름표
  for (const y of [16, 22]) { g.fillStyle = "#c8b070"; g.fillRect(19, y, 1, 1); }
  return c;
}
