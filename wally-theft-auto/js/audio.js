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
  // ---------------- weapons ----------------
  // every gun is built from layers: a sharp crack, the body of the bang, a low thump in the chest,
  // and an echo off the buildings (a short convolution reverb). A compressor stops it all clipping.
  _bus() {
    if (this.wbus) return this.wbus;
    const c = this.ctx, comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 5; comp.attack.value = 0.002; comp.release.value = 0.15;
    comp.connect(this.sfx); this.wbus = comp;
    const len = (c.sampleRate * 1.5) | 0, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) { const k = 1 - i / len; d[i] = (Math.random() * 2 - 1) * k * k * k; }
      // a couple of distinct slap-back echoes off the tenements
      for (const [t, v] of [[0.09, 0.5], [0.21, 0.3], [0.37, 0.18]]) { const j = ((t + ch * 0.013) * c.sampleRate) | 0; for (let n = 0; n < 300; n++) d[j + n] += (Math.random() * 2 - 1) * v * (1 - n / 300); }
    }
    this.verb = c.createConvolver(); this.verb.buffer = ir;
    const vg = c.createGain(); vg.gain.value = 0.35; this.verb.connect(vg); vg.connect(comp);
    return comp;
  }
  _n(dur, f, vol, o = {}) {
    if (!this.ctx || vol <= 0) return;
    const c = this.ctx, bus = this._bus(), t = c.currentTime + (o.when || 0), s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const fl = c.createBiquadFilter(); fl.type = o.type || 'lowpass'; fl.frequency.setValueAtTime(f, t); fl.Q.value = o.q || 0.8;
    if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (o.attack || 0.002)); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(bus);
    if (o.verb) { const vg = c.createGain(); vg.gain.value = o.verb; g.connect(vg); vg.connect(this.verb); }
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }
  _o(f, dur, vol, o = {}) {
    if (!this.ctx || vol <= 0) return;
    const c = this.ctx, bus = this._bus(), t = c.currentTime + (o.when || 0), osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (o.attack || 0.002)); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g); g.connect(bus);
    if (o.verb) { const vg = c.createGain(); vg.gain.value = o.verb; g.connect(vg); vg.connect(this.verb); }
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  click(when = 0, f = 2500, vol = 0.25) { this._n(0.018, f, vol, { type: 'highpass', when }); this._o(f * 0.5, 0.025, vol * 0.35, { type: 'square', when }); }
  // spent brass tinkling on the pavement
  casing(when = 0.25, vol = 0.08) { [0, 0.07, 0.16].forEach((k, i) => this._o(3200 + Math.random() * 1600, 0.05, vol / (i + 1), { type: 'triangle', when: when + k })); }
  gunshot(p, vol = 1) {
    const v = vol * (0.9 + Math.random() * 0.2), r = 0.92 + Math.random() * 0.16;
    this._n(0.03, 2600 * r, p.crack * v, { type: 'highpass', verb: p.verb });
    this._n(p.len, p.f * r, p.body * v, { f2: p.f * 0.22, verb: p.verb });
    this._o(p.low * r, p.len * 1.3, p.thump * v, { f2: p.low * 0.35 });
  }
  fire(id, vol = 1) {
    if (!this.ctx) return;
    switch (id) {
      case 'blaster': this.gunshot({ crack: 0.5, body: 0.8, f: 1800, len: 0.14, low: 140, thump: 0.35, verb: 0.5 }, vol); this._o(1700, 0.12, 0.05 * vol, { type: 'sawtooth', f2: 400 }); break;
      case 'revolver': this.click(0, 1800, 0.18 * vol); this.gunshot({ crack: 0.8, body: 1.1, f: 1400, len: 0.26, low: 110, thump: 0.55, verb: 0.8 }, vol); break;
      case 'smg': this.gunshot({ crack: 0.35, body: 0.55, f: 2300, len: 0.08, low: 170, thump: 0.25, verb: 0.25 }, vol); if (Math.random() < 0.35) this.casing(0.2, 0.05 * vol); break;
      case 'rifle': this.gunshot({ crack: 0.75, body: 0.75, f: 2700, len: 0.13, low: 150, thump: 0.35, verb: 0.45 }, vol); if (Math.random() < 0.5) this.casing(0.3, 0.06 * vol); break;
      case 'gatling': this.gunshot({ crack: 0.3, body: 0.5, f: 2100, len: 0.07, low: 180, thump: 0.25, verb: 0.2 }, vol); if (Math.random() < 0.25) this.casing(0.15, 0.04 * vol); break;
      case 'scatter': this.gunshot({ crack: 0.7, body: 1.3, f: 1100, len: 0.32, low: 85, thump: 0.8, verb: 0.9 }, vol); this.click(0.33, 1500, 0.25 * vol); this.click(0.48, 1000, 0.3 * vol); break;
      case 'double': this.gunshot({ crack: 0.85, body: 1.4, f: 1000, len: 0.4, low: 75, thump: 0.9, verb: 1 }, vol); this._n(0.25, 900, 0.5 * vol, { when: 0.025, f2: 200 }); break;
      case 'sniper': this.gunshot({ crack: 1, body: 1.2, f: 2100, len: 0.42, low: 70, thump: 0.8, verb: 1.4 }, vol); this.click(0.55, 1200, 0.3 * vol); this.click(0.72, 2200, 0.25 * vol); this.casing(0.66, 0.07 * vol); break;
      case 'nailgun': this._n(0.05, 3500, 0.4 * vol, { type: 'bandpass', q: 2 }); this._o(2600, 0.04, 0.12 * vol, { type: 'square', f2: 1800 }); this._n(0.09, 600, 0.35 * vol, { f2: 200 }); break;
      case 'taser': for (let k = 0; k < 7; k++) this._o(70 + Math.random() * 70, 0.06, 0.12 * vol, { type: 'square', when: k * 0.05 }); this._n(0.4, 5000, 0.22 * vol, { type: 'highpass' }); this._n(0.04, 2000, 0.4 * vol, { type: 'highpass' }); break;
      case 'laser': this._o(1900, 0.2, 0.12 * vol, { type: 'sawtooth', f2: 300 }); this._o(950, 0.2, 0.1 * vol, { f2: 150 }); this._n(0.1, 4000, 0.15 * vol, { type: 'highpass' }); break;
      case 'soaker': this._n(0.12, 1400, 0.25 * vol, { type: 'bandpass', q: 1.5, f2: 900 }); if (Math.random() < 0.3) this._o(300 + Math.random() * 200, 0.06, 0.05 * vol, { f2: 600 }); break;
      case 'tattie': this._o(160, 0.18, 0.5 * vol, { f2: 60 }); this._n(0.25, 1200, 0.4 * vol, { f2: 300 }); this._n(0.15, 3000, 0.15 * vol, { type: 'highpass', when: 0.02 }); break;
      case 'crossbow': this._o(190, 0.25, 0.35 * vol, { type: 'triangle', f2: 170 }); this._o(380, 0.15, 0.1 * vol, { type: 'triangle' }); this._n(0.08, 2500, 0.4 * vol, { type: 'bandpass', q: 2 }); break;
      case 'haggis': case 'caber': this._n(0.08, 800, 0.9 * vol, { verb: 0.5 }); this._n(0.9, 600, 0.6 * vol, { f2: 2500, type: 'bandpass', q: 0.8, attack: 0.05 }); this._o(id === 'caber' ? 70 : 110, 0.4, 0.5 * vol, { f2: 40 }); break;
      case 'throw': this._n(0.22, 400, 0.3 * vol, { type: 'bandpass', q: 1.2, f2: 1400, attack: 0.05 }); break;
      default: this.gunshot({ crack: 0.5, body: 0.8, f: 1600, len: 0.16, low: 130, thump: 0.3, verb: 0.7 }, vol); // anyone else's gun
    }
  }
  swing(vol = 1) { this._n(0.18, 500, 0.25 * vol, { type: 'bandpass', q: 1.2, f2: 1600, attack: 0.06 }); }
  hit(id) {
    switch (id) {
      case 'club': this._o(2400, 0.25, 0.15, { type: 'triangle' }); this._n(0.08, 1500, 0.6); break;
      case 'claymore': this._n(0.3, 6000, 0.25, { type: 'highpass' }); this._o(3200, 0.35, 0.07); this._n(0.1, 800, 0.6); break;
      case 'shinty': this._o(420, 0.09, 0.35, { type: 'triangle', f2: 300 }); this._n(0.07, 1800, 0.6, { type: 'bandpass', q: 2 }); break;
      default: this.punch();
    }
  }
  // a flamethrower roars for as long as you hold the trigger
  flame(vol = 1, big) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    if (!this.flameG) {
      this.flameG = c.createGain(); this.flameG.gain.value = 0;
      const bp = c.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 900; this.flameF = bp;
      const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; s.connect(bp); bp.connect(this.flameG); this.flameG.connect(this._bus()); s.start();
    }
    if (t - (this.flameLast || 0) > 0.25) { this._n(0.3, 300, 0.6 * vol, { f2: 2000, attack: 0.03 }); this._o(90, 0.25, 0.3 * vol, { f2: 50 }); } // whoomph as it lights
    this.flameLast = t;
    this.flameF.frequency.setTargetAtTime(big ? 1300 : 900, t, 0.05);
    this.flameG.gain.cancelScheduledValues(t);
    this.flameG.gain.setTargetAtTime((big ? 0.75 : 0.5) * vol, t, 0.03);
    this.flameG.gain.setTargetAtTime(0, t + 0.12, 0.08);
    if (Math.random() < 0.35) this._n(0.02, 4500, 0.15 * vol, { type: 'highpass' }); // crackle
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
  setRain(v, inCar) { if (this.rainG) this.rainG.gain.setTargetAtTime(v * (inCar ? 0.03 : 0.055), this.ctx.currentTime, 0.5); } // a gentle patter, not a roar
  thunder(near = 1) {
    if (!this.ctx) return;
    this.noise(3.5, 140, 0.8 * near); this.noise(1.2, 420, 0.3 * near);
    this.tone(48, 2.5, 'sine', 0.5 * near, -20);
  }
  // the saucer's warbling hum
  ufoHum(on) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (on && !this._ufo) {
      const o = this.ctx.createOscillator(), o2 = this.ctx.createOscillator(), lfo = this.ctx.createOscillator(), lg = this.ctx.createGain(), g = this.ctx.createGain();
      o.type = 'sine'; o.frequency.value = 220; o2.type = 'triangle'; o2.frequency.value = 331;
      lfo.frequency.value = 6; lg.gain.value = 30; lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 1.5);
      o.connect(g); o2.connect(g); g.connect(this.sfx); o.start(); o2.start(); lfo.start();
      this._ufo = { o, o2, lfo, g };
    } else if (!on && this._ufo) {
      const u = this._ufo; this._ufo = null;
      u.g.gain.setTargetAtTime(0, t, 0.2); setTimeout(() => { u.o.stop(); u.o2.stop(); u.lfo.stop(); }, 1500);
    }
  }
  // a terrible skirl on the pipes: drone plus a squealing chanter
  pipes() {
    if (!this.ctx) return;
    this.tone(117, 1.2, 'sawtooth', 0.14); this.tone(175, 1.2, 'sawtooth', 0.1);
    [880, 988, 1175, 880, 784].forEach((f, i) => this.tone(f, 0.22, 'square', 0.08, 0, i * 0.18));
  }
  // a car horn somewhere in the street (vol 0..1 by distance)
  hornAt(vol = 1, pitch = 1) {
    if (!this.ctx || vol <= 0.02) return;
    this.tone(392 * pitch, 0.4, 'square', 0.1 * vol); this.tone(494 * pitch, 0.4, 'square', 0.08 * vol);
  }
  // ice cream van chimes (a wee jingle, nothing copyrighted)
  chimes() {
    if (!this.ctx) return;
    [784, 880, 988, 784, 659, 784, 880, 1047, 988, 784].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.09, 0, i * 0.2));
  }
  // a seagull overhead
  gull() { if (!this.ctx) return; this.tone(1400, 0.25, 'sawtooth', 0.04, -700); this.tone(1300, 0.2, 'sawtooth', 0.035, -600, 0.3); }
  // a car hitting someone: a deep body thud plus a crunch of bumper, louder the faster you were going
  thud(speed = 10, vol = 1) {
    if (!this.ctx) return;
    const k = Math.min(1, speed / 25) * vol;
    this.tone(95, 0.22, 'sine', 0.55 * k + 0.1, -55);
    this.noise(0.18, 420, 0.7 * k + 0.15);
    this.noise(0.08, 2600, 0.18 * k, 'highpass');
  }
  // a comic cartoon yelp that slides down; pitch varies so everyone sounds different
  yelp(pitch = 1, vol = 1) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = 'sawtooth'; f.type = 'bandpass'; f.frequency.value = 1200 * pitch; f.Q.value = 3;
    o.frequency.setValueAtTime(700 * pitch, t); o.frequency.exponentialRampToValueAtTime(260 * pitch, t + 0.45);
    const vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = 9; vg.gain.value = 25 * pitch; vib.connect(vg); vg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22 * vol, t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(f); f.connect(g); g.connect(this.sfx); o.start(t); vib.start(t); o.stop(t + 0.55); vib.stop(t + 0.55);
  }
  bump(vol = 1) { if (!this.ctx) return; this.tone(70, 0.12, 'sine', 0.3 * vol, -30); this.noise(0.07, 300, 0.25 * vol); }
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
