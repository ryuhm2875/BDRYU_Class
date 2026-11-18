/* ──────────────────────────────────────────────────────────────
   마지막 배는 6시 · 소리 (WebAudio, 파일 없음)
   파도 · 바람 · ‘그것’ 발소리 · 문 쾅 · 지지직 · 딩
   ────────────────────────────────────────────────────────────── */
let ac = null, master = null, wave = null, step = 0;

export function startAudio() {
  if (ac) { ac.resume(); return; }
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  master = ac.createGain(); master.gain.value = 0.7; master.connect(ac.destination);
  /* 파도 + 바람: 걸러 낸 잡음을 천천히 흔들기 */
  const buf = noiseBuf(4);
  const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
  const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 500;
  wave = ac.createGain(); wave.gain.value = 0.12;
  const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.12; lg.gain.value = 0.08;
  lfo.connect(lg).connect(wave.gain); lfo.start();
  src.connect(lp).connect(wave).connect(master); src.start();
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
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function burst(dur, vol, f = 1200) {
  if (!ac) return;
  const s = ac.createBufferSource(); s.buffer = noiseBuf(dur);
  const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f;
  const g = ac.createGain(), t = ac.currentTime; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(bp).connect(g).connect(master); s.start();
}

/* ‘그것’ 발소리: 거리(m)에 따라 크기. 1초에 한 번쯤 불러 주면 됨 */
export function itStep(dist, loud = 1) {
  if (!ac || dist > 16) return;
  const v = Math.min(0.5, (1 - dist / 16) * 0.45 * loud);
  step++;
  blip(step % 2 ? 70 : 62, 0.18, "triangle", v, 40);
  burst(0.06, v * 0.4, 300);
}
export const sfx = {
  slam: () => { blip(55, 0.6, "square", 0.35, 30); burst(0.4, 0.5, 200); },
  caught: () => burst(0.9, 0.35, 2500),
  good: () => { blip(660, 0.15, "sine", 0.15); setTimeout(() => blip(880, 0.25, "sine", 0.15), 120); },
  bad: () => blip(140, 0.4, "sawtooth", 0.15, 90),
  pick: () => blip(990, 0.1, "square", 0.08),
  blackout: () => { blip(120, 1.2, "sawtooth", 0.2, 30); burst(1.2, 0.2, 600); }
};
export function setDusk(p) { if (wave) wave.gain.value = 0.12 + p * 0.06; }
