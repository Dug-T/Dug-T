// Every sound is synthesised with WebAudio: surf, wind, birds, the mountain's rumble, explosions and the little UI noises.
export class Audio {
  constructor() { this.ctx = null; this.on = true; this.birdT = 1; this.heartT = 0; this.vol = { waves: 0, wind: 0, rumble: 0, heli: 0, fire: 0 }; }
  init() {
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const ctx = this.ctx = new C();
    this.master = ctx.createGain(); this.master.gain.value = this.on ? 0.8 : 0; this.master.connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.connect(this.master);
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;
    // brown noise for rumble and surf
    const bb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), bd = bb.getChannelData(0);
    let last = 0; for (let i = 0; i < bd.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; bd[i] = last * 3.5; }
    this.brownBuf = bb;
    const loop = (buf, type, freq, q = 1) => {
      const g = ctx.createGain(); g.gain.value = 0; g.connect(this.sfx);
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; f.connect(g);
      const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(f); s.start();
      return { g, f, s };
    };
    this.waves = loop(bb, 'lowpass', 700);
    this.wind = loop(nb, 'bandpass', 500, 0.6);
    this.rumble = loop(bb, 'lowpass', 90);
    this.fire = loop(nb, 'bandpass', 1500, 0.5);
    this.sub = ctx.createOscillator(); this.sub.type = 'sine'; this.sub.frequency.value = 38; this.subG = ctx.createGain(); this.subG.gain.value = 0; this.sub.connect(this.subG); this.subG.connect(this.sfx); this.sub.start();
    // helicopter: a chopped low tone
    this.heliG = ctx.createGain(); this.heliG.gain.value = 0; this.heliG.connect(this.sfx);
    const ho = ctx.createOscillator(); ho.type = 'sawtooth'; ho.frequency.value = 55;
    const hf = ctx.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 300;
    const chop = ctx.createGain(); chop.gain.value = 0.5; const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 11; const lg = ctx.createGain(); lg.gain.value = 0.5; lfo.connect(lg); lg.connect(chop.gain);
    ho.connect(hf); hf.connect(chop); chop.connect(this.heliG); ho.start(); lfo.start();
    // the jeep: two detuned waves through a lowpass, pitched by rpm
    this.engG = ctx.createGain(); this.engG.gain.value = 0; this.engG.connect(this.sfx);
    this.engF = ctx.createBiquadFilter(); this.engF.type = 'lowpass'; this.engF.frequency.value = 400; this.engF.connect(this.engG);
    this.eng1 = ctx.createOscillator(); this.eng1.type = 'sawtooth'; this.eng1.frequency.value = 60; this.eng1.connect(this.engF);
    this.eng2 = ctx.createOscillator(); this.eng2.type = 'square'; this.eng2.frequency.value = 31; const e2g = ctx.createGain(); e2g.gain.value = 0.35; this.eng2.connect(e2g); e2g.connect(this.engF);
    this.eng1.start(); this.eng2.start();
    // rain: a hiss of filtered noise
    this.rainL = loop(nb, 'bandpass', 2600, 0.35); this.rainL.s.playbackRate.value = 0.75; // a softer patter, without the harsh top end
    this.t0 = ctx.currentTime;
  }
  setOn(on) { this.on = on; if (this.master) this.master.gain.setTargetAtTime(on ? 0.8 : 0, this.ctx.currentTime, 0.05); }
  // continuous levels, eased every frame. ctx: { waves, wind, rumble, heli, fire, birds, hurt, stage }
  update(dt, c) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, ease = (g, v, k = 0.4) => g.gain.setTargetAtTime(v, t, k);
    ease(this.waves.g, c.waves * 0.5);
    this.waves.f.frequency.setTargetAtTime(500 + 250 * Math.sin(t * 0.35), t, 0.5);
    this.waves.g.gain.setTargetAtTime(c.waves * (0.35 + 0.25 * Math.sin(t * 0.35 + 1)), t, 0.6);
    ease(this.wind.g, c.wind * 0.18); this.wind.f.frequency.setTargetAtTime(350 + 300 * c.wind + 120 * Math.sin(t * 0.7), t, 0.4);
    ease(this.rumble.g, c.rumble * 0.9); ease(this.subG, c.rumble * 0.35);
    this.sub.frequency.setTargetAtTime(34 + 8 * Math.sin(t * 0.9), t, 0.3);
    ease(this.heliG, c.heli * 0.6, 0.2);
    ease(this.fire.g, c.fire * 0.09);
    ease(this.rainL.g, (c.rain || 0) * 0.08);
    const rpm = c.engine || 0;
    ease(this.engG, rpm > 0 ? 0.16 : 0, 0.15);
    this.eng1.frequency.setTargetAtTime(52 + rpm * 190, t, 0.08); this.eng2.frequency.setTargetAtTime(26 + rpm * 95, t, 0.08);
    this.engF.frequency.setTargetAtTime(280 + rpm * 1600, t, 0.1);
    // birds: random chirps, fewer as the mountain wakes
    this.birdT -= dt;
    if (this.birdT <= 0 && c.birds > 0.05 && Math.random() < c.birds) { this.chirp(); this.birdT = 0.4 + Math.random() * 3 / Math.max(0.1, c.birds); } else if (this.birdT <= 0) this.birdT = 1;
    // crickets after dark
    this.crickT = (this.crickT || 0) - dt;
    if (c.crickets > 0.05 && this.crickT <= 0) { this.crickT = 0.15 + Math.random() * 0.9 / c.crickets; const f = 3900 + Math.random() * 900; for (let i = 0; i < 3; i++) this.tone(f, 0.035, 'sine', 0.018 * c.crickets, 0, i * 0.055); }
    // heartbeat when badly hurt
    if (c.hurt > 0) { this.heartT -= dt * (1 + c.hurt); if (this.heartT <= 0) { this.heartT = 1.0; this.thump(0.3 + c.hurt * 0.3); setTimeout(() => this.thump(0.2 + c.hurt * 0.2), 160); } }
  }
  tone(freq, dur, type = 'sine', vol = 0.2, slide = 0, when = 0) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + dur + 0.05);
  }
  noise(dur, freq, vol = 0.5, type = 'lowpass', q = 1, when = 0, f2) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + when, s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q; if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfx); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  chirp() { const f = 1800 + Math.random() * 2200, n = 2 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) this.tone(f * (1 + Math.random() * 0.2), 0.08, 'sine', 0.04, Math.random() < 0.5 ? 600 : -500, i * 0.12); }
  thump(v = 0.3) { this.tone(55, 0.25, 'sine', v, -25); }
  pickup() { this.tone(660, 0.08, 'triangle', 0.12); this.tone(990, 0.12, 'triangle', 0.1, 0, 0.07); }
  eat() { this.noise(0.12, 900, 0.2, 'bandpass', 2); this.noise(0.1, 700, 0.15, 'bandpass', 2, 0.15); }
  drink() { for (let i = 0; i < 3; i++) this.tone(300 + i * 60, 0.12, 'sine', 0.08, 120, i * 0.16); }
  chop() { this.noise(0.08, 1800, 0.5, 'bandpass', 1.5); this.tone(140, 0.12, 'triangle', 0.25, -60); }
  craft() { for (let i = 0; i < 3; i++) this.noise(0.05, 2500, 0.25, 'highpass', 1, i * 0.1); this.tone(520, 0.25, 'triangle', 0.1, 0, 0.3); this.tone(780, 0.3, 'triangle', 0.1, 0, 0.4); }
  ui() { this.tone(880, 0.05, 'square', 0.04); }
  splash() { this.noise(0.5, 1200, 0.35, 'lowpass', 1, 0, 300); }
  jump() { this.noise(0.1, 600, 0.1, 'lowpass'); }
  hurt() { this.noise(0.15, 500, 0.3, 'lowpass'); this.tone(180, 0.2, 'sawtooth', 0.12, -80); }
  tremor(v = 1) { this.noise(1.6, 120, 0.6 * v, 'lowpass', 1, 0, 50); this.tone(42, 1.4, 'sine', 0.35 * v, -14); }
  explosion(dist) {
    const v = Math.max(0.05, Math.min(1, 1 - dist / 420));
    this.noise(0.9, 1800 * v + 150, 0.9 * v, 'lowpass', 1, 0, 80); this.tone(60, 0.9, 'sine', 0.5 * v, -40);
    if (dist < 150) this.noise(0.3, 3000, 0.3 * v, 'highpass');
  }
  whistle(when = 0) { this.tone(1400, 1.6, 'sine', 0.07, -900, when); }
  radioStatic() { this.noise(1.2, 2000, 0.25, 'bandpass', 0.8); this.tone(1000, 0.1, 'square', 0.05, 0, 0.5); this.tone(1200, 0.1, 'square', 0.05, 0, 0.7); }
  doorSlam() { this.noise(0.4, 300, 0.7, 'lowpass'); this.tone(90, 0.5, 'triangle', 0.3, -50); }
  success() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.12, 0, i * 0.14)); }
  fail() { [330, 262, 196].forEach((f, i) => this.tone(f, 0.7, 'sawtooth', 0.08, -20, i * 0.3)); }
  stageSting() { this.tone(110, 1.5, 'sawtooth', 0.08, -30); this.tone(165, 1.5, 'sawtooth', 0.06, -45, 0.1); this.noise(2, 200, 0.3, 'lowpass', 1, 0, 60); }
  // volcanic lightning: a crack, then the roll, arriving after the light
  thunder(dist) {
    const delay = Math.min(3, dist / 340), v = Math.max(0.08, 1 - dist / 700);
    this.noise(0.25, 3000, 0.5 * v, 'highpass', 1, delay); this.noise(2.8, 160, 0.9 * v, 'lowpass', 1, delay + 0.1, 45); this.tone(48, 2.5, 'sine', 0.35 * v, -20, delay + 0.15);
  }
  flood() { this.noise(0.6, 500, 0.5, 'lowpass', 1, 0, 120); this.tone(90, 0.8, 'sawtooth', 0.12, -70); }
  crash(v = 1) { this.noise(0.25, 900, 0.7 * v, 'lowpass'); this.tone(120, 0.3, 'triangle', 0.3 * v, -80); }
  // a footstep on the given surface; vol 0..1
  step(surface, vol = 1) {
    if (!this.ctx) return;
    const v = vol * (0.85 + Math.random() * 0.3), f = 0.9 + Math.random() * 0.2;
    switch (surface) {
      case 'sand': this.noise(0.11, 1100 * f, 0.16 * v, 'lowpass', 0.7); this.noise(0.06, 4200 * f, 0.03 * v, 'highpass'); break;
      case 'grass': this.noise(0.08, 2600 * f, 0.09 * v, 'bandpass', 0.9); this.tone(110 * f, 0.05, 'sine', 0.06 * v, -40); break;
      case 'rock': this.noise(0.035, 3200 * f, 0.1 * v, 'highpass'); this.tone(240 * f, 0.05, 'triangle', 0.06 * v, -90); break;
      case 'ash': this.noise(0.14, 800 * f, 0.15 * v, 'bandpass', 0.8); this.noise(0.05, 2400 * f, 0.04 * v, 'highpass'); break;
      case 'water': this.noise(0.22, 1300 * f, 0.16 * v, 'lowpass', 1, 0, 300); break;
      default: this.noise(0.07, 1500 * f, 0.1 * v, 'bandpass', 1);
    }
  }
  land(surface, vol = 1) { this.step(surface, vol * 1.4); this.tone(70, 0.12, 'sine', 0.18 * vol, -30); }
  stroke(vol = 1) { this.noise(0.3, 900, 0.14 * vol, 'lowpass', 1, 0, 250); this.noise(0.12, 3000, 0.03 * vol, 'highpass', 1, 0.05); }
  bark(dist) { const v = Math.max(0.05, 0.5 * (1 - dist / 45)); for (let i = 0; i < 2; i++) { this.tone(520 + Math.random() * 60, 0.09, 'sawtooth', 0.12 * v, -220, i * 0.22); this.noise(0.08, 900, 0.18 * v, 'bandpass', 2, i * 0.22); } }
  splashSmall() { this.noise(0.3, 1600, 0.25, 'lowpass', 1, 0, 400); }
  sizzle() { this.noise(1.2, 5200, 0.12, 'highpass', 1); for (let i = 0; i < 6; i++) this.noise(0.04, 3000, 0.08, 'bandpass', 2, 0.1 + i * 0.15); }
  bleat(dist) { const v = Math.max(0.03, 0.3 * (1 - dist / 60)); const o = this.ctx; if (!o) return; this.tone(420, 0.5, 'sawtooth', 0.06 * v * 3, -80); this.tone(430, 0.5, 'square', 0.03 * v * 3, -90, 0.02); }
  pinch() { this.tone(2400, 0.04, 'square', 0.05); this.tone(2100, 0.04, 'square', 0.05, 0, 0.07); }
  achievement() { [784, 988, 1175].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.1, 0, i * 0.09)); }
  shutter() { this.noise(0.05, 4000, 0.3, 'highpass'); this.noise(0.08, 1800, 0.2, 'bandpass', 2, 0.07); }
  page() { this.noise(0.25, 3500, 0.12, 'bandpass', 0.7); this.tone(660, 0.4, 'sine', 0.05, 0, 0.1); this.tone(880, 0.5, 'sine', 0.05, 0, 0.25); }
  talk() { for (let i = 0; i < 4; i++) this.tone(220 + Math.random() * 120, 0.06, 'triangle', 0.04, 0, i * 0.08); }
}
