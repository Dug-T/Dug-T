// All sound is synthesised with WebAudio: engines, sirens, gadgets and three radio stations.
export class Audio {
  constructor() { this.ctx = null; this.on = true; this.station = 0; this.stations = ['WALLY FM', 'CLYDE BEATS', 'PIPES & RIFFS', 'RADIO OFF']; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const ctx = this.ctx = new C();
    this.master = ctx.createGain(); this.master.gain.value = 0.7; this.master.connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.connect(this.master);
    this.music = ctx.createGain(); this.music.gain.value = 0; this.music.connect(this.master);
    // white noise buffer
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;
    // engine: two detuned saws through a lowpass
    this.eng = ctx.createGain(); this.eng.gain.value = 0; this.eng.connect(this.sfx);
    this.engF = ctx.createBiquadFilter(); this.engF.type = 'lowpass'; this.engF.frequency.value = 600; this.engF.connect(this.eng);
    this.o1 = ctx.createOscillator(); this.o1.type = 'sawtooth'; this.o2 = ctx.createOscillator(); this.o2.type = 'square';
    this.o1.connect(this.engF); const g2 = ctx.createGain(); g2.gain.value = 0.4; this.o2.connect(g2); g2.connect(this.engF);
    this.o1.start(); this.o2.start();
    // tyre screech
    this.skid = ctx.createGain(); this.skid.gain.value = 0; this.skid.connect(this.sfx);
    const sf = ctx.createBiquadFilter(); sf.type = 'bandpass'; sf.frequency.value = 2200; sf.Q.value = 6; sf.connect(this.skid);
    const sn = ctx.createBufferSource(); sn.buffer = nb; sn.loop = true; sn.connect(sf); sn.start();
    // siren
    this.siren = ctx.createGain(); this.siren.gain.value = 0; this.siren.connect(this.sfx);
    this.sirenO = ctx.createOscillator(); this.sirenO.type = 'triangle'; this.sirenO.connect(this.siren); this.sirenO.start();
    // wind when flying
    this.wind = ctx.createGain(); this.wind.gain.value = 0; this.wind.connect(this.sfx);
    const wf = ctx.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 500; wf.connect(this.wind);
    const wn = ctx.createBufferSource(); wn.buffer = nb; wn.loop = true; wn.connect(wf); wn.start();
    // engines of nearby traffic: a few positional voices that get handed to the closest cars
    this.voices = [];
    for (let i = 0; i < 5; i++) {
      const g = ctx.createGain(); g.gain.value = 0;
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
      const a = ctx.createOscillator(); a.type = 'sawtooth';
      const b = ctx.createOscillator(); b.type = 'square';
      const bg = ctx.createGain(); bg.gain.value = 0.35;
      a.connect(f); b.connect(bg); bg.connect(f); f.connect(g);
      if (pan) { g.connect(pan); pan.connect(this.sfx); } else g.connect(this.sfx);
      a.start(); b.start();
      this.voices.push({ g, pan, f, a, b });
    }
    // rain hiss
    this.rainG = ctx.createGain(); this.rainG.gain.value = 0; this.rainG.connect(this.sfx);
    const rf = ctx.createBiquadFilter(); rf.type = 'highpass'; rf.frequency.value = 1800; rf.connect(this.rainG);
    const rn = ctx.createBufferSource(); rn.buffer = nb; rn.loop = true; rn.playbackRate.value = 0.7; rn.connect(rf); rn.start();
    this.step = 0; this.nextT = ctx.currentTime + 0.1;
    setInterval(() => this.schedule(), 50);
  }
  noise(dur, freq, vol = 0.5, type = 'lowpass', q = 1) {
    if (!this.ctx) return;
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    s.connect(f); f.connect(g); g.connect(this.sfx); s.start(); s.stop(c.currentTime + dur);
  }
  tone(freq, dur, type = 'square', vol = 0.2, slide = 0, when = 0, dest) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || this.sfx); o.start(t); o.stop(t + dur + 0.05);
  }
  punch() { this.noise(0.15, 300, 0.9); this.tone(90, 0.12, 'sine', 0.5, -40); }
  zap() { this.tone(1400, 0.18, 'sawtooth', 0.15, -1100); this.noise(0.08, 3000, 0.2, 'highpass'); }
  bang() { this.noise(0.25, 1200, 0.5); this.tone(160, 0.1, 'square', 0.15, -100); }
  boom() { this.noise(1.6, 400, 1.2); this.noise(0.4, 2000, 0.6); this.tone(60, 1.0, 'sine', 0.8, -30); }
  crash(v) { this.noise(0.3, 700 + v * 40, Math.min(1, 0.2 + v * 0.05)); this.tone(120, 0.1, 'square', 0.1, -60); }
  pickup() { [880, 1175, 1568].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.18, 0, i * 0.06)); }
  cash() { [1318, 1760].forEach((f, i) => this.tone(f, 0.1, 'square', 0.1, 0, i * 0.05)); }
  door() { this.noise(0.12, 500, 0.5); this.tone(200, 0.06, 'square', 0.1, -80, 0.05); }
  horn() { this.tone(392, 0.35, 'square', 0.12); this.tone(494, 0.35, 'square', 0.1); }
  oof() { this.tone(220, 0.3, 'sawtooth', 0.15, -140); this.noise(0.2, 250, 0.6); }
  power() { for (let i = 0; i < 6; i++) this.tone(400 + i * 150, 0.1, 'triangle', 0.15, 0, i * 0.04); }
  fail() { [392, 370, 349, 311].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.2, 0, i * 0.22)); }
  pass() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'square', 0.12, 0, i * 0.12)); }
  checkpoint() { this.tone(988, 0.12, 'square', 0.15); this.tone(1318, 0.2, 'square', 0.15, 0, 0.1); }
  update(st) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const rpm = st.inCar ? (0.25 + Math.min(1, Math.abs(st.speed) / 40) * 0.75 + (st.throttle > 0 ? 0.1 : 0)) : 0;
    const base = st.carType === 'sports' ? 60 : (st.carType === 'van' || st.carType === 'icecream' ? 32 : 45);
    this.o1.frequency.setTargetAtTime(base + rpm * base * 3.2, t, 0.05);
    this.o2.frequency.setTargetAtTime((base + rpm * base * 3.2) * 0.502, t, 0.05);
    this.engF.frequency.setTargetAtTime(300 + rpm * 1600, t, 0.05);
    this.eng.gain.setTargetAtTime(st.inCar ? 0.09 + rpm * 0.08 : 0, t, 0.1);
    this.skid.gain.setTargetAtTime(st.inCar ? Math.min(0.25, Math.max(0, Math.abs(st.slip) - 3) * 0.04) : 0, t, 0.05);
    this.siren.gain.setTargetAtTime(Math.min(0.12, st.siren * 0.12), t, 0.2);
    // UK two-tone "nee-naw"
    this.sirenO.frequency.setValueAtTime((Math.floor(t * 1.4) % 2) ? 600 : 800, t);
    this.wind.gain.setTargetAtTime(st.flying ? 0.35 : Math.min(0.15, Math.abs(st.speed) / 400), t, 0.2);
    this.music.gain.setTargetAtTime(st.inCar && this.station < 3 && this.on ? 0.22 : 0, t, 0.3);
  }
  // others: [{ dist, pan (-1 left .. 1 right), speed, throttle, type }] nearest first
  traffic(others, inCar) {
    if (!this.ctx || !this.voices) return;
    const t = this.ctx.currentTime;
    this.voices.forEach((v, i) => {
      const o = others[i];
      if (!o) { v.g.gain.setTargetAtTime(0, t, 0.15); return; }
      const base = o.type === 'sports' ? 58 : (o.type === 'van' || o.type === 'icecream' ? 30 : (o.type === 'police' ? 50 : 42));
      const rpm = 0.22 + Math.min(1, o.speed / 30) * 0.7 + (o.throttle > 0.3 ? 0.08 : 0);
      const f = base + rpm * base * 3;
      v.a.frequency.setTargetAtTime(f, t, 0.08); v.b.frequency.setTargetAtTime(f * 0.5 + 1.5, t, 0.08);
      v.f.frequency.setTargetAtTime(220 + rpm * 1100, t, 0.08);
      const near = Math.max(0, 1 - o.dist / 55);
      v.g.gain.setTargetAtTime(near * near * (inCar ? 0.05 : 0.09) * (0.6 + rpm * 0.6), t, 0.1);
      if (v.pan) v.pan.pan.setTargetAtTime(Math.max(-0.9, Math.min(0.9, o.pan)), t, 0.1);
    });
  }
  setRain(v, inCar) { if (this.rainG) this.rainG.gain.setTargetAtTime(v * (inCar ? 0.12 : 0.22), this.ctx.currentTime, 0.5); }
  thunder(near = 1) {
    if (!this.ctx) return;
    this.noise(3.5, 140, 1.4 * near); this.noise(1.2, 420, 0.6 * near);
    this.tone(48, 2.5, 'sine', 0.5 * near, -20);
  }
  nextStation() { this.station = (this.station + 1) % this.stations.length; return this.stations[this.station]; }
  // ---------- generative radio ----------
  schedule() {
    const c = this.ctx; if (!c) return;
    const st = this.station;
    if (st >= 3 || this.music.gain.value < 0.001) { this.nextT = c.currentTime + 0.1; return; }
    const bpm = [128, 100, 140][st], sp = 60 / bpm / 4;
    while (this.nextT < c.currentTime + 0.2) {
      this.playStep(st, this.step, this.nextT - c.currentTime, sp);
      this.step++; this.nextT += sp;
    }
  }
  playStep(st, s, when, sp) {
    const m = this.music;
    const bar = Math.floor(s / 16) % 4, k = s % 16;
    const n = (semi) => 220 * Math.pow(2, semi / 12);
    if (st === 0) { // Wally FM: bouncy chiptune march in C major
      const prog = [0, 5, 7, 5][bar];
      if (k % 4 === 0) this.kick(when);
      if (k % 8 === 4) this.snare(when);
      if (k % 2 === 0) this.tone(n(prog - 24 + (k % 4 === 2 ? 7 : 0)), sp * 1.8, 'square', 0.12, 0, when, m);
      const mel = [12, 16, 19, 16, 21, 19, 16, 14, 12, 14, 16, 19, 24, 19, 16, 12];
      if ((s * 7) % 3 !== 1) this.tone(n(prog + mel[k]), sp * 1.6, 'square', 0.06, 0, when, m);
    } else if (st === 1) { // Clyde Beats: synthwave in A minor
      const prog = [0, -4, 3, -2][bar];
      if (k % 4 === 0) this.kick(when);
      if (k === 4 || k === 12) this.snare(when);
      if (k % 2 === 1) this.hat(when);
      this.tone(n(prog - 24 + (k % 2 ? 12 : 0)), sp * 0.9, 'sawtooth', 0.08, 0, when, m);
      if (k === 0) for (const iv of [0, 3, 7]) this.tone(n(prog + iv), sp * 15, 'triangle', 0.04, 0, when, m);
      const arp = [0, 3, 7, 12, 7, 3, 12, 15];
      if (bar % 2 === 1) this.tone(n(prog + 12 + arp[k % 8]), sp * 0.8, 'triangle', 0.05, 0, when, m);
    } else { // Pipes & Riffs: drone + mixolydian chanter + rock drums
      if (k === 0) { this.tone(n(-12), sp * 16.5, 'sawtooth', 0.05, 0, when, m); this.tone(n(-5), sp * 16.5, 'sawtooth', 0.03, 0, when, m); }
      if (k % 8 === 0) this.kick(when); if (k % 8 === 4) this.snare(when); if (k % 2 === 0) this.hat(when);
      const tune = [[0, 2, 4, 7, 9, 7, 4, 2], [0, -2, 0, 2, 4, 2, 0, -3], [7, 9, 10, 9, 7, 4, 2, 4], [2, 4, 0, -3, 0, 2, 0, 0]][bar];
      if (k % 2 === 0) this.tone(n(12 + tune[k / 2]), sp * 2.1, 'square', 0.05, 0, when, m);
      if (k % 4 === 0) this.tone(n(-12 + [0, 0, 5, 7][bar]), sp * 3.5, 'square', 0.07, 0, when, m);
    }
  }
  kick(when) { this.tone(140, 0.18, 'sine', 0.5, -100, when, this.music); }
  snare(when) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500;
    const g = c.createGain(), t = c.currentTime + when; g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    s.connect(f); f.connect(g); g.connect(this.music); s.start(t, Math.random()); s.stop(t + 0.16);
  }
  hat(when) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = c.createGain(), t = c.currentTime + when; g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    s.connect(f); f.connect(g); g.connect(this.music); s.start(t, Math.random()); s.stop(t + 0.05);
  }
}
