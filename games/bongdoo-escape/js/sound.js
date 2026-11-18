/* ──────────────────────────────────────────────────────────────
   마지막 배는 6시 · 소리
   - 효과음: Kenney (CC0) 녹음 파일 + WebAudio 합성음 겹치기
   - 배경음악: Pixabay 3곡 (calm / explore / tension), 서서히 바꿔 틀기
   - 파일을 못 받으면 합성음만으로도 돌아감
   ────────────────────────────────────────────────────────────── */
const BASE = new URL("../assets/", import.meta.url).href;
const FILES = ["step0", "step1", "step2", "step3", "step4", "it0", "it1", "it2", "it3", "it4",
  "door_open", "door_close", "slam", "creak1", "creak2", "creak3", "page1", "page2",
  "unlock", "click", "pick", "hit", "glass", "cloth"];

let ac = null, master = null, sfxBus = null, musBus = null, wave = null, step = 0;
const buf = {};
let muted = false;
try { muted = localStorage.getItem("escape-mute") === "1"; } catch (e) {}

export function startAudio() {
  if (ac) { if (ac.state !== "running") ac.resume(); return; }
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  master = ac.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ac.destination);
  sfxBus = ac.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
  musBus = ac.createGain(); musBus.gain.value = 0.55; musBus.connect(master);
  /* 파도 + 바람: 걸러 낸 잡음을 천천히 흔들기 */
  const src = ac.createBufferSource(); src.buffer = noiseBuf(4); src.loop = true;
  const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 500;
  wave = ac.createGain(); wave.gain.value = 0.06;
  const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.12; lg.gain.value = 0.04;
  lfo.connect(lg).connect(wave.gain); lfo.start();
  src.connect(lp).connect(wave).connect(master); src.start();
  /* 효과음 파일 받기 (작아서 한꺼번에) */
  for (const n of FILES) fetch(BASE + "sfx/" + n + ".mp3").then(r => r.ok ? r.arrayBuffer() : null)
    .then(a => a && new Promise((ok, no) => ac.decodeAudioData(a, ok, no))).then(b => { if (b) buf[n] = b; }).catch(() => {});
  if (want) music(want);
}

export function isMuted() { return muted; }
export function setMuted(m) {
  muted = !!m; try { localStorage.setItem("escape-mute", muted ? "1" : "0"); } catch (e) {}
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.8, ac.currentTime, 0.1);
}

function noiseBuf(sec) {
  const b = ac.createBuffer(1, ac.sampleRate * sec, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function blip(freq, dur, type = "sine", vol = 0.2, slide = 0) {
  if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(sfxBus); o.start(t); o.stop(t + dur + 0.02);
}
function burst(dur, vol, f = 1200) {
  if (!ac) return;
  const s = ac.createBufferSource(); s.buffer = noiseBuf(dur);
  const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f;
  const g = ac.createGain(), t = ac.currentTime; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(bp).connect(g).connect(sfxBus); s.start();
}
/* 녹음 파일 한 번 틀기. 없으면 false → 합성음으로 대신 */
function play(name, { vol = 0.6, rate = 1, pan = 0, delay = 0, lp = 0 } = {}) {
  if (!ac || !buf[name]) return false;
  const s = ac.createBufferSource(); s.buffer = buf[name]; s.playbackRate.value = rate;
  const g = ac.createGain(); g.gain.value = vol;
  let node = s;
  if (lp) { const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = lp; node = node.connect(f); }
  if (pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); node = node.connect(p); }
  node.connect(g).connect(sfxBus); s.start(ac.currentTime + delay);
  return true;
}
const pickN = (base, n) => base + Math.floor(Math.random() * n);

/* ---------- 발소리 ---------- */
/* 내 발소리: 걷는 중이면 0.4초마다 불러 주기 */
export function myStep(run = false) {
  play(pickN("step", 5), { vol: run ? 0.32 : 0.2, rate: 0.95 + Math.random() * 0.1, lp: 2600 });
}
/* ‘그것’ 발소리: 거리(m)·좌우 방향에 따라. 1초에 한 번쯤 */
export function itStep(dist, loud = 1, pan = 0) {
  if (!ac || dist > 16) return;
  const v = Math.min(0.75, (1 - dist / 16) * 0.7 * loud);
  step++;
  /* 무겁게: 낮은 속도로 늘인 콘크리트 발소리 + 낮은 쿵 */
  if (!play(pickN("it", 5), { vol: v, rate: 0.55 + Math.random() * 0.06, pan, lp: 900 })) burst(0.06, v * 0.4, 300);
  blip(step % 2 ? 62 : 55, 0.22, "sine", v * 0.55, 38);
}

/* ---------- 효과음 ---------- */
export const sfx = {
  slam: () => { play("door_close", { vol: 0.8, rate: 0.85 }); play("slam", { vol: 0.9, rate: 0.8, delay: 0.03 }); blip(50, 0.7, "sine", 0.4, 28); },
  caught: () => { play("hit", { vol: 0.9, rate: 0.7 }); play("glass", { vol: 0.5, rate: 0.6, delay: 0.05 }); burst(0.9, 0.3, 2500); },
  good: () => { blip(660, 0.15, "sine", 0.13); setTimeout(() => blip(880, 0.3, "sine", 0.13), 120); },
  bad: () => { play("click", { vol: 0.5, rate: 0.6 }); blip(140, 0.4, "sawtooth", 0.1, 90); },
  pick: () => { if (!play("pick", { vol: 0.7 })) blip(990, 0.1, "square", 0.08); },
  blackout: () => { play("click", { vol: 0.8, rate: 0.5 }); blip(120, 1.2, "sawtooth", 0.18, 30); burst(1.2, 0.18, 600); },
  whisper: () => { for (let i = 0; i < 4; i++) setTimeout(() => burst(0.35, 0.16, 3200 + Math.random() * 1500), i * 260); },
  static: () => burst(1.4, 0.24, 1800),
  vibrate: () => { for (let i = 0; i < 3; i++) setTimeout(() => blip(170, 0.18, "square", 0.07), i * 260); },
  horn: () => { blip(98, 2.2, "sawtooth", 0.16, 92); setTimeout(() => blip(98, 2.2, "sawtooth", 0.16, 92), 2600); },
  heart: () => { blip(60, 0.12, "sine", 0.35, 40); setTimeout(() => blip(55, 0.14, "sine", 0.28, 35), 180); },
  door: () => { if (!play("door_open", { vol: 0.7 })) { blip(200, 0.5, "triangle", 0.12, 80); burst(0.3, 0.12, 900); } },
  unlock: () => { if (!play("unlock", { vol: 0.8 })) blip(700, 0.1, "square", 0.08); },
  cloth: () => play("cloth", { vol: 0.5 }),
  glass: () => play("glass", { vol: 0.6, rate: 0.8 })
};
/* 파일 이름이 creak1~3, page1~2 */
sfx.creak = () => play("creak" + (1 + Math.floor(Math.random() * 3)), { vol: 0.5, rate: 0.8 + Math.random() * 0.2, pan: Math.random() * 1.6 - 0.8 });
sfx.rattle = () => play("creak" + (1 + Math.floor(Math.random() * 3)), { vol: 0.45, rate: 1.2 }) || blip(990, 0.1, "square", 0.06);
sfx.page = () => play("page" + (1 + Math.floor(Math.random() * 2)), { vol: 0.6 }) || blip(1400, 0.05, "square", 0.04);

export function setDusk(p) { if (wave) wave.gain.value = 0.06 + p * 0.05; }

/* ---------- 배경음악 ---------- */
let want = null;
const tracks = {};
export function music(name) {
  want = name;
  if (!ac) return;
  for (const [k, t] of Object.entries(tracks)) if (k !== name) fade(t, 0, 2.5);
  if (!name) return;
  let t = tracks[name];
  if (!t) {
    const el = new Audio(BASE + "music/" + name + ".mp3"); el.loop = true; el.preload = "auto"; el.crossOrigin = "anonymous";
    const g = ac.createGain(); g.gain.value = 0;
    try { ac.createMediaElementSource(el).connect(g).connect(musBus); } catch (e) { return; }
    t = tracks[name] = { el, g };
  }
  t.el.play().catch(() => {});
  fade(t, 1, 3);
}
function fade(t, to, sec) {
  const now = ac.currentTime;
  t.g.gain.cancelScheduledValues(now); t.g.gain.setValueAtTime(t.g.gain.value, now);
  t.g.gain.linearRampToValueAtTime(to, now + sec);
  if (to === 0) { clearTimeout(t.stop); t.stop = setTimeout(() => { if (t.g.gain.value < 0.01) t.el.pause(); }, sec * 1000 + 200); }
  else clearTimeout(t.stop);
}
