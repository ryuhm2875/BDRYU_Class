/* ──────────────────────────────────────────────────────────────
   RYUNO · 배경음과 효과음 (품사 경매와 같은 방식: 코드로 연주)
   - 음악 파일이 없어도 됩니다. 브라우저 정책상 화면을 한 번 누른 뒤부터 소리가 납니다.
   - 장면: lobby(대기실) · play(게임 중) · win(결과)
   ────────────────────────────────────────────────────────────── */
const LS = "ryuno-sound";
let saved = {};
try { saved = JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) {}

export const Sound = {
  bgmOn: saved.bgm !== false, sfxOn: saved.sfx !== false,
  ctx: null, bus: null, sfxBus: null, noise: null,
  scene: "lobby", want: "lobby", playing: false, step: 0, next: 0, timer: null, custom: null,

  save() { try { localStorage.setItem(LS, JSON.stringify({ bgm: this.bgmOn, sfx: this.sfxOn })); } catch (e) {} },
  init() {
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === "suspended") this.ctx.resume();
      if (this.bus) return true;
      const C = this.ctx;
      this.bus = C.createGain(); this.bus.gain.value = .38; this.bus.connect(C.destination);
      this.sfxBus = C.createGain(); this.sfxBus.gain.value = .7; this.sfxBus.connect(C.destination);
      const len = C.sampleRate * .5, b = C.createBuffer(1, len, C.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = b;
      return true;
    } catch (e) { return false; }
  },
  /* 첫 터치에 소리 깨우기 */
  unlockOnTouch(withBgm) {
    const go = () => { if (this.init() && withBgm) this.start(); removeEventListener("pointerdown", go); removeEventListener("keydown", go); };
    addEventListener("pointerdown", go); addEventListener("keydown", go);
  },
  setScene(s) { this.want = s; if (this.custom) return; if (s === "win" && this.playing) { this.scene = "win"; this.step = 0; } },
  start() {
    if (!this.bgmOn || !this.init()) return;
    if (this.custom) { this.custom.play().catch(() => {}); return; }
    if (this.playing) return;
    this.playing = true; this.scene = this.want; this.step = 0; this.next = this.ctx.currentTime + .08;
    this.timer = setInterval(() => this.tick(), 25);
  },
  stop() { this.playing = false; clearInterval(this.timer); if (this.custom) this.custom.pause(); },
  toggleBgm() { this.bgmOn = !this.bgmOn; this.save(); if (this.bgmOn) this.start(); else this.stop(); return this.bgmOn; },
  toggleSfx() { this.sfxOn = !this.sfxOn; this.save(); return this.sfxOn; },
  setFile(file) {
    this.stop();
    if (this.custom) { try { URL.revokeObjectURL(this.custom.src); } catch (e) {} }
    this.custom = file ? Object.assign(new Audio(URL.createObjectURL(file)), { loop: true, volume: .5 }) : null;
    if (this.bgmOn) this.start();
  },

  hz: m => 440 * Math.pow(2, (m - 69) / 12),
  tick() {
    const C = this.ctx, BPM = { lobby: 96, play: 128, win: 116 };
    while (this.next < C.currentTime + .12) {
      const e = 60 / BPM[this.scene] / 2;
      const sw = this.scene === "lobby" && this.step % 2 ? e * .16 : 0;
      try { this[this.scene](this.step, this.next + sw, e); } catch (err) {}
      this.next += e; this.step = (this.step + 1) % 32;
      if (this.want !== this.scene && this.step % 8 === 0) { this.scene = this.want; this.step = 0; }
    }
  },

  /* ---- 소리 재료 ---- */
  env(t, a, d, v, out) { const g = this.ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(.001, t + a + d); g.connect(out || this.bus); return g; },
  osc(type, f, t, dur, dest, f2) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur); o.connect(dest); o.start(t); o.stop(t + dur + .02); return o; },
  lp(freq, dest) { const f = this.ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq; f.connect(dest); return f; },
  pluck(m, t, v = .07, d = .3, out) { this.osc("triangle", this.hz(m), t, d, this.lp(2600, this.env(t, .004, d, v, out))); },
  keys(ms, t, d, v = .04) { ms.forEach(m => this.osc("triangle", this.hz(m), t, d, this.lp(1800, this.env(t, .01, d, v)))); },
  bass(m, t, d, v = .2) { this.osc("triangle", this.hz(m), t, d, this.lp(800, this.env(t, .008, d, v))); },
  lead(m, t, d, v = .05, out) { this.osc("square", this.hz(m), t, d, this.lp(2400, this.env(t, .015, d, v, out))); },
  kick(t, v = .28, out) { this.osc("sine", 130, t, .16, this.env(t, .002, .15, v, out), 45); },
  hit(t, freq, q, d, v, out) { const C = this.ctx, s = C.createBufferSource(); s.buffer = this.noise; const f = C.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q; s.connect(f); f.connect(this.env(t, .002, d, v, out)); s.start(t); s.stop(t + d + .05); },

  /* ---- 장면: 대기실 (느긋한 그루브, D장조) ---- */
  lobby(step, t, e) {
    const bar = step >> 3, i = step & 7;
    const CH = [[62, 66, 69, 73], [59, 62, 66, 69], [55, 59, 62, 66], [57, 61, 64, 67]], B = [38, 35, 31, 33];
    if (i === 0 || i === 3) this.keys(CH[bar], t, e * 1.6, .03);
    if (i % 2 === 0) this.bass(B[bar] + (i === 4 ? 7 : i === 6 ? 12 : 0), t, e * 1.5, .17);
    if (i === 0 || i === 5) this.kick(t, .2);
    if (i === 2 || i === 6) this.hit(t, 1700, .8, .09, .07);
    this.hit(t, 7000, 1.5, .03, i % 2 ? .02 : .035);
    const MEL = [[78, 0, 76, 0, 73, 0, 0, 74], [0, 0, 71, 0, 0, 0, 0, 0], [74, 0, 73, 0, 71, 0, 69, 0], [0, 0, 0, 0, 69, 71, 73, 0]];
    const m = MEL[bar][i]; if (m) this.pluck(m, t, .045, e * 2.2);
  },
  /* ---- 장면: 게임 중 (통통 튀는 카드 게임, C장조) ---- */
  play(step, t, e) {
    const bar = step >> 3, i = step & 7;
    const CH = [[60, 64, 67], [57, 60, 64], [65, 69, 72], [67, 71, 74]], B = [36, 33, 41, 43];
    if (i === 0 || i === 3 || i === 6) this.keys(CH[bar].map(m => m + 12), t, e * .7, .026);
    this.bass(B[bar] + ([0, 0, 12, 0, 7, 0, 12, 10][i]), t, e * .8, .16);
    if (i === 0 || i === 4) this.kick(t, .24);
    if (i === 2 || i === 6) this.hit(t, 1900, .7, .1, .1);
    this.hit(t, 8000, 1.5, .02, .03);
    const MEL = [[72, 0, 76, 0, 79, 76, 0, 72], [74, 0, 72, 0, 69, 0, 0, 0], [77, 0, 76, 74, 72, 0, 74, 0], [79, 0, 0, 77, 76, 0, 74, 0]];
    const m = MEL[bar][i]; if (m && step < 32) this.pluck(m, t, .04, e * 1.4);
  },
  /* ---- 장면: 결과 팡파르 ---- */
  win(step, t, e) {
    const bar = step >> 3, i = step & 7;
    const CH = [[60, 64, 67], [65, 69, 72], [67, 71, 74], [72, 76, 79]], B = [36, 41, 43, 48];
    if (i === 0 || i === 3 || i === 6) this.keys(CH[bar].map(m => m + 12), t, e * .9, .034);
    if (i % 2 === 0) this.bass(B[bar], t, e * 1.6, .18);
    if (i === 0 || i === 4) this.kick(t, .26); if (i === 2 || i === 6) this.hit(t, 1600, .7, .12, .13);
    const MEL = [[72, 0, 76, 0, 79, 0, 84, 0], [81, 0, 79, 0, 77, 0, 76, 0], [74, 0, 76, 77, 79, 0, 0, 0], [84, 0, 79, 0, 84, 0, 0, 0]];
    const m = MEL[bar][i]; if (m) this.lead(m, t, e * 1.5, .035);
  },

  /* ================= 효과음 ================= */
  fx(name) {
    if (!this.sfxOn || !this.init()) return;
    const t = this.ctx.currentTime + .01, o = this.sfxBus;
    const P = (m, dt, v, d) => this.pluck(m, t + dt, v, d, o);
    switch (name) {
      case "card": this.hit(t, 2600, .9, .07, .22, o); this.osc("sine", 520, t, .08, this.env(t, .002, .08, .12, o), 260); break;
      case "draw": this.hit(t, 4200, 1.2, .12, .12, o); break;
      case "link": P(79, 0, .12, .18); P(84, .07, .12, .25); break;
      case "skip": P(76, 0, .14, .12); P(72, .09, .14, .2); break;
      case "rev": this.osc("triangle", 300, t, .18, this.env(t, .01, .18, .14, o), 900); this.osc("triangle", 900, t + .18, .18, this.env(t + .18, .01, .18, .12, o), 300); break;
      case "hit": this.kick(t, .45, o); this.hit(t, 900, .8, .2, .25, o); P(55, .05, .15, .3); break;
      case "combo": [72, 76, 79, 84].forEach((m, k) => P(m, k * .06, .13, .3)); break;
      case "uno": [79, 84, 88].forEach((m, k) => this.lead(m, t + k * .08, .16, .09, o)); break;
      case "catch": this.osc("sawtooth", 180, t, .35, this.lp(1200, this.env(t, .01, .35, .2, o)), 120); this.kick(t, .4, o); break;
      case "good": [72, 76, 79].forEach((m, k) => P(m, k * .07, .14, .3)); break;
      case "bad": this.osc("sawtooth", 220, t, .4, this.lp(900, this.env(t, .01, .4, .15, o)), 140); break;
      case "turn": P(84, 0, .14, .15); P(91, .1, .12, .3); break;
      case "tick": this.osc("sine", 1700, t, .05, this.env(t, .001, .04, .08, o)); break;
      case "win": [72, 76, 79, 84, 79, 84].forEach((m, k) => this.lead(m, t + k * .1, .2, .08, o)); break;
      case "pop": [84, 79, 84, 88].forEach((m, k) => P(m, k * .07, .12, .25)); break;
    }
  }
};

/* 사건 → 효과음 이름 */
export function fxOf(e) {
  switch (e.t) {
    case "play": return e.why === "place" || e.why === "strength" || e.why === "same" ? "link" : "card";
    case "draw": return "draw";
    case "skip": return "skip";
    case "rev": return "rev";
    case "d2": case "w4": case "atk": return "hit";
    case "combo": return "combo";
    case "uno": return "uno";
    case "catch": return "catch";
    case "quizres": return e.ok ? "good" : "bad";
    case "win": return "win";
  }
  return null;
}
