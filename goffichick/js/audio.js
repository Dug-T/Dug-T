// GOFFICHICK - synthesized sound effects and music (WebAudio, no files needed)
'use strict';

const Sfx = (() => {
  let ctx = null, master = null, musicGain = null, noiseBuf = null;
  let musicOn = true, musicTimer = null, musicStep = 0;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.3; musicGain.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }

  function noise(dur, filterFreq, peak, type = 'lowpass', vol = 1, sweepTo = null, dest = master) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(filterFreq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain(); env(g, t, 0.004, peak * vol, dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t); src.stop(t + dur + 0.05);
  }

  function tone(freq, dur, type = 'square', peak = 0.3, slideTo = null, delay = 0, dest = master) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain(); env(g, t, 0.005, peak, dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  }

  // volume falloff for positional sounds
  function vol(dist) { return dist == null ? 1 : Math.max(0.08, Math.min(1, 3 / (dist + 1))); }

  const play = {
    punch: () => { noise(0.12, 900, 0.6); tone(120, 0.1, 'sine', 0.4, 50); },
    swing: () => noise(0.15, 2500, 0.15, 'bandpass', 1, 600),
    pistol: () => { noise(0.18, 3000, 0.7, 'lowpass', 1, 400); tone(220, 0.08, 'square', 0.15, 80); },
    shotgun: () => { noise(0.45, 2200, 0.9, 'lowpass', 1, 150); tone(90, 0.3, 'sine', 0.6, 35); },
    shotgunPump: () => { noise(0.05, 1500, 0.3, 'bandpass'); setTimeout(() => noise(0.06, 1200, 0.3, 'bandpass'), 140); },
    gatling: () => { noise(0.1, 3500, 0.5, 'lowpass', 1, 600); tone(160, 0.05, 'square', 0.1, 90); },
    launcher: () => { noise(0.6, 600, 0.6, 'bandpass', 1, 3000); tone(140, 0.3, 'sawtooth', 0.15, 60); },
    explode: (d) => { const v = vol(d); noise(1.1, 1200, 1.0, 'lowpass', v, 60); tone(70, 0.7, 'sine', 0.8 * v, 25); },
    hex: () => { tone(900, 0.12, 'sawtooth', 0.15, 300); tone(1400, 0.08, 'square', 0.08, 500); },
    hexHit: (d) => { tone(600, 0.15, 'triangle', 0.2 * vol(d), 150); },
    bfgCharge: () => { tone(80, 0.9, 'sawtooth', 0.3, 900); tone(120, 0.9, 'square', 0.12, 1300); },
    bfgBoom: (d) => { const v = vol(d); noise(1.6, 3000, 1.0, 'lowpass', v, 50); tone(50, 1.4, 'sine', 0.9 * v, 20); tone(400, 0.8, 'sawtooth', 0.3 * v, 40); },
    flame: () => fireOn(),
    burn: (d) => { const v = vol(d) * 0.7; crackle(v); setTimeout(() => crackle(v), 60 + Math.random() * 90); },
    om: (d) => { const v = vol(d); for (const f of [130.8, 196, 261.6]) tone(f, 0.9, 'sine', 0.12 * v, f * 1.01); },
    coach: (d) => { const v = vol(d); tone(520, 0.12, 'sawtooth', 0.22 * v, 780); tone(780, 0.18, 'square', 0.12 * v, 1040, 0.1); noise(0.15, 1800, 0.12, 'bandpass', v); },
    pop: (d) => { const v = vol(d); tone(900, 0.08, 'sine', 0.35 * v, 220); noise(0.06, 3000, 0.2, 'highpass', v); },
    saw: () => { tone(110 + Math.random() * 20, 0.13, 'sawtooth', 0.22, 95); noise(0.12, 2200, 0.12, 'bandpass'); },
    bow: () => { noise(0.08, 3000, 0.4, 'highpass'); tone(220, 0.12, 'triangle', 0.3, 90); },
    zap: () => { for (let i = 0; i < 3; i++) tone(1400 - i * 300, 0.09, 'sawtooth', 0.14, 300, i * 0.02); noise(0.18, 4000, 0.3, 'highpass'); },
    locked: () => { tone(90, 0.12, 'square', 0.3, 70); noise(0.1, 600, 0.3, 'bandpass'); tone(140, 0.08, 'square', 0.2, null, 0.12); },
    buzz: (d) => { const v = vol(d) * 0.5; tone(120, 0.08, 'square', 0.1 * v); noise(0.05, 5000, 0.08 * v, 'highpass'); },
    step: () => noise(0.05, 260, 0.09, 'lowpass'),
    thunder: () => { noise(2.2, 160, 0.9, 'lowpass', 1, 50); noise(0.4, 1200, 0.5, 'lowpass', 1, 200); },
    achievement: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.22, null, i * 0.09)); },
    empty: () => tone(1800, 0.03, 'square', 0.1),
    pickup: () => { tone(660, 0.06, 'square', 0.15); tone(990, 0.09, 'square', 0.15, null, 0.06); },
    weaponUp: () => { tone(330, 0.08, 'square', 0.2); tone(495, 0.08, 'square', 0.2, null, 0.08); tone(660, 0.18, 'square', 0.2, null, 0.16); },
    door: () => { noise(0.7, 400, 0.4, 'lowpass', 1, 150); tone(55, 0.6, 'sawtooth', 0.12, 45); },
    switch: () => { tone(300, 0.05, 'square', 0.3); noise(0.1, 2000, 0.3, 'bandpass'); },
    oof: () => { tone(220, 0.18, 'sawtooth', 0.25, 110); noise(0.1, 800, 0.2); },
    playerPain: () => { tone(520, 0.12, 'sawtooth', 0.25, 260); tone(400, 0.2, 'triangle', 0.2, 200, 0.05); },
    playerDie: () => { tone(500, 1.2, 'sawtooth', 0.3, 60); tone(380, 1.2, 'triangle', 0.2, 40, 0.1); },
    // enemies
    phoneRing: (d) => { const v = vol(d); for (let i = 0; i < 3; i++) { tone(1320, 0.05, 'square', 0.12 * v, null, i * 0.1); tone(1760, 0.05, 'square', 0.12 * v, null, i * 0.1 + 0.05); } },
    groan: (d) => { const v = vol(d); tone(110 + Math.random() * 30, 0.6, 'sawtooth', 0.18 * v, 70); },
    memo: (d) => { const v = vol(d); noise(0.35, 900, 0.4, 'bandpass', v, 3000); },
    brute: (d) => { const v = vol(d); tone(80, 0.5, 'sawtooth', 0.35 * v, 40); noise(0.3, 500, 0.3, 'lowpass', v); },
    skull: (d) => { const v = vol(d); tone(700, 0.4, 'triangle', 0.2 * v, 1400); },
    giggle: (d) => { const v = vol(d); for (let i = 0; i < 4; i++) tone(700 + i * 90, 0.06, 'triangle', 0.2 * v, null, i * 0.08); },
    enemyPain: (d) => { const v = vol(d); tone(300, 0.15, 'sawtooth', 0.2 * v, 150); },
    enemyDie: (d) => { const v = vol(d); tone(260, 0.6, 'sawtooth', 0.25 * v, 50); noise(0.4, 700, 0.3, 'lowpass', v, 100); },
    bossRoar: (d) => { const v = vol(d); tone(60, 1.2, 'sawtooth', 0.5 * v, 30); tone(90, 1.2, 'square', 0.2 * v, 45); noise(1, 300, 0.4, 'lowpass', v); },
    exit: () => { [440, 554, 659, 880].forEach((f, i) => tone(f, 0.25, 'square', 0.18, null, i * 0.12)); },
  };

  // =====================================================================
  //  FLAMETHROWER - a sustained roar of fire while the trigger is held.
  //  Every shot calls fireOn(), which keeps the roar alive; when the shots stop
  //  it dies away by itself with a hiss and a few last crackles.
  // =====================================================================
  let fire = null;
  function crackle(v = 1) {
    if (!ctx) return;
    const t = ctx.currentTime + Math.random() * 0.03;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500 + Math.random() * 3500; f.Q.value = 1.5;
    const g = ctx.createGain(), len = 0.006 + Math.random() * 0.025, peak = (0.15 + Math.random() * 0.4) * v;
    g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(f); f.connect(g); g.connect(master); src.start(t, Math.random()); src.stop(t + len + 0.02);
  }
  function fireOn() {
    if (!ctx) return;
    if (!fire) {
      const t = ctx.currentTime;
      const out = ctx.createGain(); out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(0.5, t + 0.09); out.connect(master);
      // the roar: filtered noise with a warm resonant body
      const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1000; lp.Q.value = 0.8;
      const body = ctx.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 320; body.Q.value = 0.9; body.gain.value = 9;
      src.connect(lp); lp.connect(body); body.connect(out);
      // the low rumble underneath
      const rum = ctx.createBufferSource(); rum.buffer = noiseBuf; rum.loop = true; rum.playbackRate.value = 0.45;
      const rlp = ctx.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 170;
      const rg = ctx.createGain(); rg.gain.value = 1.6;
      rum.connect(rlp); rlp.connect(rg); rg.connect(out);
      src.start(t, Math.random()); rum.start(t, Math.random());
      noise(0.4, 180, 0.8, 'lowpass', 1, 2200); // ignition "whoomph"
      // flames flicker: wobble the tone and loudness, and crackle at random
      const flicker = setInterval(() => {
        const now = ctx.currentTime;
        lp.frequency.setTargetAtTime(650 + Math.random() * 1100, now, 0.03);
        out.gain.setTargetAtTime(0.38 + Math.random() * 0.24, now, 0.04);
        if (Math.random() < 0.75) crackle(0.9);
        if (Math.random() < 0.3) crackle(0.6);
      }, 45);
      fire = { out, src, rum, flicker, timer: null };
    }
    clearTimeout(fire.timer);
    fire.timer = setTimeout(fireOff, 170);
  }
  function fireOff() {
    if (!fire) return;
    const f = fire; fire = null;
    clearInterval(f.flicker);
    const t = ctx.currentTime;
    f.out.gain.cancelScheduledValues(t); f.out.gain.setValueAtTime(Math.max(0.0001, f.out.gain.value), t);
    f.out.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    f.src.stop(t + 0.45); f.rum.stop(t + 0.45);
    noise(0.45, 2600, 0.1, 'highpass'); // dying hiss
    setTimeout(() => crackle(0.7), 90); setTimeout(() => crackle(0.5), 210); setTimeout(() => crackle(0.35), 330);
  }

  // =====================================================================
  //  MUSIC - a small step sequencer playing multi-section songs.
  //  Each level has its own song. A song is a list of sections; every section
  //  has its own chords, drum groove, bass line, arpeggio and a melody that is
  //  composed (from a seed) out of the current chord, so it never sounds like
  //  one short loop. Add or edit songs in SONGS below.
  // =====================================================================
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const M = (r) => [r, 'm'], MAJ = (r) => [r, 'M'], DIM = (r) => [r, 'd'];
  const QUAL = { m: [0, 3, 7], M: [0, 4, 7], d: [0, 3, 6] };

  // chords are [semitones above the key, quality]; one chord per bar
  const SONGS = [
    { // 0: title - "Mourning Glory" (slow cathedral organ)
      name: 'Mourning Glory', key: 45, bpm: 84,
      sections: [
        { bars: 8, chords: [M(0), MAJ(8), MAJ(3), MAJ(10), M(5), M(0), MAJ(7), MAJ(7)], drums: 0, bass: 'hold', pad: 'organ', arp: 'slow', lead: 0, seed: 3 },
        { bars: 8, chords: [M(0), M(5), MAJ(10), MAJ(3), MAJ(8), M(5), MAJ(7), MAJ(7)], drums: 1, bass: 'hold', pad: 'organ', arp: 'slow', lead: 1, seed: 8 },
      ],
    },
    { // 1: E1M1 - "Cemetery Gates" (gothic rock)
      name: 'Cemetery Gates', key: 38, bpm: 124,
      sections: [
        { bars: 4, chords: [M(0), M(0), MAJ(8), MAJ(10)], drums: 0, bass: 'hold', pad: 'pad', arp: 'up8', lead: 0, seed: 1 },
        { bars: 8, chords: [M(0), MAJ(8), MAJ(10), M(5), M(0), MAJ(8), MAJ(7), MAJ(7)], drums: 1, bass: 'pulse', pad: 'pad', arp: 'up8', lead: 0, seed: 2 },
        { bars: 8, chords: [M(0), MAJ(8), MAJ(10), M(5), M(0), MAJ(8), MAJ(7), MAJ(7)], drums: 2, bass: 'pulse', pad: 'pad', arp: 'broken16', lead: 1, seed: 4 },
        { bars: 8, chords: [MAJ(3), MAJ(10), M(5), M(0), MAJ(8), MAJ(3), MAJ(7), MAJ(7)], drums: 2, bass: 'walk', pad: 'pad', arp: 'updown16', lead: 1, seed: 9 },
        { bars: 8, chords: [M(5), M(5), M(0), M(0), MAJ(8), MAJ(10), MAJ(7), MAJ(7)], drums: 3, bass: 'sync', pad: 'none', arp: 'broken16', lead: 2, seed: 13 },
        { bars: 4, chords: [M(0), MAJ(8), M(5), MAJ(7)], drums: 1, bass: 'hold', pad: 'organ', arp: 'slow', lead: 1, seed: 21 },
        { bars: 8, chords: [M(0), MAJ(8), MAJ(10), M(5), M(0), MAJ(8), MAJ(7), MAJ(7)], drums: 2, bass: 'sync', pad: 'pad', arp: 'updown16', lead: 2, seed: 5 },
      ],
    },
    { // 2: E1M2 - "Fluorescent Dread" (driving synth-punk)
      name: 'Fluorescent Dread', key: 40, bpm: 142,
      sections: [
        { bars: 4, chords: [M(0), M(0), M(0), MAJ(11)], drums: 1, bass: 'sync', pad: 'none', arp: 'broken16', lead: 0, seed: 31 },
        { bars: 8, chords: [M(0), MAJ(8), MAJ(10), MAJ(11), M(0), MAJ(8), M(5), MAJ(11)], drums: 2, bass: 'sync', pad: 'none', arp: 'up16', lead: 1, seed: 32 },
        { bars: 8, chords: [M(5), M(0), MAJ(8), MAJ(11), M(5), M(0), MAJ(3), MAJ(11)], drums: 3, bass: 'pulse', pad: 'pad', arp: 'updown16', lead: 2, seed: 35 },
        { bars: 8, chords: [MAJ(3), MAJ(10), MAJ(8), MAJ(10), MAJ(3), MAJ(10), MAJ(11), MAJ(11)], drums: 2, bass: 'walk', pad: 'pad', arp: 'broken16', lead: 1, seed: 38 },
        { bars: 4, chords: [M(0), M(0), DIM(2), MAJ(11)], drums: 0, bass: 'hold', pad: 'organ', arp: 'slow', lead: 0, seed: 40 },
        { bars: 8, chords: [M(0), MAJ(8), MAJ(10), MAJ(11), M(0), MAJ(8), M(5), MAJ(11)], drums: 3, bass: 'sync', pad: 'pad', arp: 'up16', lead: 2, seed: 44 },
        { bars: 8, chords: [M(5), MAJ(8), MAJ(10), M(0), M(5), MAJ(3), MAJ(11), MAJ(11)], drums: 2, bass: 'pulse', pad: 'none', arp: 'updown16', lead: 1, seed: 47 },
      ],
    },
    { // 3: E1M3 - "Penthouse Showdown" (boss fight)
      name: 'Penthouse Showdown', key: 36, bpm: 156,
      sections: [
        { bars: 4, chords: [M(0), M(0), MAJ(8), MAJ(7)], drums: 1, bass: 'pulse', pad: 'organ', arp: 'none', lead: 0, seed: 51 },
        { bars: 8, chords: [M(0), MAJ(8), MAJ(3), MAJ(10), M(5), MAJ(8), MAJ(7), MAJ(7)], drums: 3, bass: 'sync', pad: 'pad', arp: 'up16', lead: 1, seed: 52 },
        { bars: 8, chords: [M(5), M(0), MAJ(7), M(0), M(5), MAJ(8), MAJ(1), MAJ(7)], drums: 3, bass: 'walk', pad: 'organ', arp: 'broken16', lead: 2, seed: 55 },
        { bars: 8, chords: [MAJ(8), MAJ(10), MAJ(3), MAJ(3), MAJ(8), MAJ(10), MAJ(7), MAJ(7)], drums: 2, bass: 'pulse', pad: 'pad', arp: 'updown16', lead: 1, seed: 58 },
        { bars: 8, chords: [M(0), MAJ(1), M(0), MAJ(1), M(5), MAJ(8), MAJ(7), MAJ(7)], drums: 3, bass: 'sync', pad: 'organ', arp: 'up16', lead: 2, seed: 61 },
        { bars: 4, chords: [M(5), M(5), MAJ(7), MAJ(7)], drums: 0, bass: 'hold', pad: 'organ', arp: 'slow', lead: 1, seed: 64 },
        { bars: 8, chords: [MAJ(8), MAJ(7), M(5), M(0), MAJ(8), MAJ(3), MAJ(1), MAJ(7)], drums: 2, bass: 'walk', pad: 'pad', arp: 'broken16', lead: 1, seed: 66 },
        { bars: 8, chords: [M(0), MAJ(8), MAJ(3), MAJ(10), M(5), MAJ(8), MAJ(7), MAJ(7)], drums: 3, bass: 'sync', pad: 'pad', arp: 'updown16', lead: 2, seed: 69 },
      ],
    },
    { // 4: E2M1 - "Retail Therapy" (sleazy mall synth-funk gone wrong)
      name: 'Retail Therapy', key: 41, bpm: 118,
      sections: [
        { bars: 4, chords: [M(0), M(0), MAJ(8), MAJ(10)], drums: 1, bass: 'walk', pad: 'pad', arp: 'none', lead: 0, seed: 71 },
        { bars: 8, chords: [M(0), M(5), MAJ(10), MAJ(3), M(0), M(5), MAJ(8), MAJ(7)], drums: 2, bass: 'sync', pad: 'pad', arp: 'up8', lead: 1, seed: 72 },
        { bars: 8, chords: [MAJ(8), MAJ(10), M(0), M(0), MAJ(8), MAJ(10), MAJ(7), MAJ(7)], drums: 2, bass: 'walk', pad: 'organ', arp: 'broken16', lead: 1, seed: 75 },
        { bars: 8, chords: [M(5), MAJ(10), MAJ(3), MAJ(8), M(5), MAJ(1), MAJ(7), MAJ(7)], drums: 3, bass: 'sync', pad: 'pad', arp: 'updown16', lead: 2, seed: 77 },
        { bars: 4, chords: [M(0), MAJ(8), M(5), MAJ(7)], drums: 0, bass: 'hold', pad: 'organ', arp: 'slow', lead: 1, seed: 79 },
        { bars: 8, chords: [M(0), M(5), MAJ(10), MAJ(3), M(0), M(5), MAJ(8), MAJ(7)], drums: 3, bass: 'pulse', pad: 'pad', arp: 'up16', lead: 2, seed: 81 },
      ],
    },
    { // 5: E2M2 - "No Pain No Gain" (pounding gym metal)
      name: 'No Pain No Gain', key: 38, bpm: 150,
      sections: [
        { bars: 4, chords: [M(0), M(0), M(0), MAJ(1)], drums: 3, bass: 'pulse', pad: 'none', arp: 'none', lead: 0, seed: 91 },
        { bars: 8, chords: [M(0), M(0), MAJ(1), M(0), M(0), M(0), MAJ(10), MAJ(1)], drums: 3, bass: 'sync', pad: 'none', arp: 'broken16', lead: 1, seed: 92 },
        { bars: 8, chords: [M(5), M(5), M(0), M(0), MAJ(8), MAJ(10), MAJ(1), MAJ(1)], drums: 3, bass: 'pulse', pad: 'organ', arp: 'up16', lead: 2, seed: 95 },
        { bars: 4, chords: [M(0), MAJ(1), M(0), MAJ(1)], drums: 1, bass: 'hold', pad: 'pad', arp: 'slow', lead: 0, seed: 97 },
        { bars: 8, chords: [M(0), MAJ(1), MAJ(10), MAJ(8), M(0), MAJ(1), MAJ(7), MAJ(7)], drums: 3, bass: 'sync', pad: 'pad', arp: 'updown16', lead: 2, seed: 99 },
        { bars: 8, chords: [M(5), M(5), M(0), M(0), MAJ(8), MAJ(10), MAJ(1), MAJ(1)], drums: 2, bass: 'walk', pad: 'organ', arp: 'broken16', lead: 1, seed: 101 },
      ],
    },
    { // 6: E2M3 - "Sunshine Overload" (final showdown: a fairground tune turned sinister)
      name: 'Sunshine Overload', key: 43, bpm: 160,
      sections: [
        { bars: 4, chords: [MAJ(0), MAJ(5), MAJ(7), MAJ(0)], drums: 1, bass: 'walk', pad: 'organ', arp: 'up8', lead: 1, seed: 111 },
        { bars: 8, chords: [M(0), MAJ(8), MAJ(3), MAJ(10), M(5), MAJ(8), MAJ(7), MAJ(7)], drums: 3, bass: 'sync', pad: 'pad', arp: 'up16', lead: 2, seed: 112 },
        { bars: 8, chords: [M(5), M(0), MAJ(7), M(0), M(5), MAJ(8), MAJ(1), MAJ(7)], drums: 3, bass: 'pulse', pad: 'organ', arp: 'broken16', lead: 2, seed: 115 },
        { bars: 4, chords: [MAJ(0), MAJ(5), MAJ(7), MAJ(7)], drums: 0, bass: 'hold', pad: 'organ', arp: 'up8', lead: 1, seed: 117 },
        { bars: 8, chords: [M(0), MAJ(1), M(0), MAJ(1), M(5), MAJ(8), MAJ(7), MAJ(7)], drums: 3, bass: 'sync', pad: 'pad', arp: 'updown16', lead: 2, seed: 119 },
        { bars: 8, chords: [MAJ(8), MAJ(10), MAJ(3), MAJ(3), MAJ(8), MAJ(10), MAJ(7), MAJ(7)], drums: 2, bass: 'walk', pad: 'organ', arp: 'up16', lead: 1, seed: 121 },
      ],
    },
    { // 7: E3M1 - "Something Borrowed, Something Gloom" (a wedding waltz that turns sinister)
      name: 'Something Borrowed, Something Gloom', key: 45, bpm: 132,
      sections: [
        { bars: 8, chords: [MAJ(0), MAJ(5), MAJ(7), MAJ(0), MAJ(5), MAJ(0), MAJ(7), MAJ(7)], drums: 0, bass: 'hold', pad: 'organ', arp: 'up8', lead: 1, seed: 131 },
        { bars: 8, chords: [M(0), MAJ(8), MAJ(3), MAJ(10), M(5), MAJ(8), MAJ(7), MAJ(7)], drums: 2, bass: 'walk', pad: 'organ', arp: 'broken16', lead: 1, seed: 132 },
        { bars: 8, chords: [M(0), MAJ(1), M(0), MAJ(1), M(5), MAJ(8), MAJ(7), MAJ(7)], drums: 3, bass: 'sync', pad: 'pad', arp: 'up16', lead: 2, seed: 135 },
        { bars: 4, chords: [MAJ(0), MAJ(5), MAJ(7), MAJ(7)], drums: 0, bass: 'hold', pad: 'organ', arp: 'slow', lead: 1, seed: 137 },
        { bars: 8, chords: [M(5), M(0), MAJ(8), MAJ(7), M(5), MAJ(3), MAJ(1), MAJ(7)], drums: 3, bass: 'pulse', pad: 'pad', arp: 'updown16', lead: 2, seed: 139 },
      ],
    },
    { // 8: E3M2 - "Hi-De-Doom" (a soggy holiday-camp march in the rain)
      name: 'Hi-De-Doom', key: 40, bpm: 138,
      sections: [
        { bars: 4, chords: [MAJ(0), MAJ(5), MAJ(7), MAJ(0)], drums: 1, bass: 'walk', pad: 'none', arp: 'up8', lead: 1, seed: 141 },
        { bars: 8, chords: [M(0), M(0), MAJ(8), MAJ(10), M(5), M(0), MAJ(7), MAJ(7)], drums: 2, bass: 'pulse', pad: 'pad', arp: 'broken16', lead: 1, seed: 142 },
        { bars: 8, chords: [M(5), MAJ(10), MAJ(3), MAJ(8), M(5), MAJ(1), MAJ(7), MAJ(7)], drums: 3, bass: 'sync', pad: 'organ', arp: 'up16', lead: 2, seed: 145 },
        { bars: 4, chords: [M(0), M(0), MAJ(8), MAJ(7)], drums: 0, bass: 'hold', pad: 'pad', arp: 'slow', lead: 0, seed: 147 },
        { bars: 8, chords: [M(0), MAJ(8), MAJ(3), MAJ(10), M(5), MAJ(8), MAJ(7), MAJ(7)], drums: 3, bass: 'sync', pad: 'pad', arp: 'updown16', lead: 2, seed: 149 },
      ],
    },
    { // 9: E3M3 - "Live From Studio 7" (final boss: a game-show theme gone metal)
      name: 'Live From Studio 7', key: 37, bpm: 166,
      sections: [
        { bars: 4, chords: [MAJ(0), MAJ(4), MAJ(7), MAJ(0)], drums: 2, bass: 'walk', pad: 'organ', arp: 'up16', lead: 1, seed: 151 },
        { bars: 8, chords: [M(0), MAJ(8), MAJ(3), MAJ(10), M(5), MAJ(8), MAJ(7), MAJ(7)], drums: 3, bass: 'sync', pad: 'pad', arp: 'up16', lead: 2, seed: 152 },
        { bars: 8, chords: [M(5), M(0), MAJ(7), M(0), M(5), MAJ(8), MAJ(1), MAJ(7)], drums: 3, bass: 'pulse', pad: 'organ', arp: 'broken16', lead: 2, seed: 155 },
        { bars: 4, chords: [MAJ(0), MAJ(4), MAJ(7), MAJ(7)], drums: 1, bass: 'hold', pad: 'organ', arp: 'up8', lead: 1, seed: 157 },
        { bars: 8, chords: [M(0), MAJ(1), M(0), MAJ(1), M(5), MAJ(8), MAJ(7), MAJ(7)], drums: 3, bass: 'sync', pad: 'pad', arp: 'updown16', lead: 2, seed: 159 },
        { bars: 8, chords: [MAJ(8), MAJ(10), MAJ(3), MAJ(3), MAJ(8), MAJ(10), MAJ(7), MAJ(7)], drums: 3, bass: 'walk', pad: 'organ', arp: 'up16', lead: 2, seed: 161 },
      ],
    },
  ];

  // seeded RNG so each section's melody is fixed but different from the others
  function rng(seed) { let s = seed * 9973 + 1; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

  // A melody "motif" is 2 bars of (step, chord-tone index, length). It is re-voiced on
  // whatever chord is playing, and varied every other repeat, so it follows the harmony.
  function makeMotif(seed, density) {
    const r = rng(seed), notes = [];
    let idx = 4 + Math.floor(r() * 3);
    for (let st = 0; st < 32;) {
      const len = [2, 2, 4, 4, 6, 8, 3][Math.floor(r() * 7)];
      if (r() < 0.25 + density * 0.25 || st === 0) {
        idx = Math.max(2, Math.min(9, idx + [-2, -1, -1, 0, 1, 1, 2, 3][Math.floor(r() * 8)]));
        notes.push({ st, idx, len: Math.min(len, 32 - st) });
      }
      st += len;
    }
    return notes;
  }
  for (const song of SONGS) for (const sec of song.sections) sec.motif = makeMotif(sec.seed, sec.lead);

  // ---- instruments (all scheduled at an absolute time t) ----
  function voice(t, freq, dur, type, peak, { attack = 0.005, filter = null, q = 1, detune = 0, vibrato = 0 } = {}) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + Math.max(attack, dur * 0.6)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (vibrato) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5.5; lg.gain.value = vibrato; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
    if (filter) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; f.Q.value = q; node.connect(f); node = f; }
    node.connect(g); g.connect(musicGain);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function kick(t, v = 1) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.9 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + 0.3);
  }
  function hiss(t, dur, freq, type, peak) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(musicGain); src.start(t, Math.random()); src.stop(t + dur + 0.02);
  }
  const snare = (t, v = 1) => { hiss(t, 0.16, 1800, 'bandpass', 0.55 * v); voice(t, 190, 0.08, 'triangle', 0.25 * v); };
  const hat = (t, v = 1, open = false) => hiss(t, open ? 0.2 : 0.04, 8000, 'highpass', 0.18 * v);

  function chordNotes(song, ch) { return QUAL[ch[1]].map(i => song.key + ch[0] + i); }
  // chord tone index -> midi: 0,1,2 = root/3rd/5th of the low octave, 3.. continue upward
  function toneAt(notes, idx) { return notes[idx % 3] + 12 * Math.floor(idx / 3); }

  function playStep(song, sec, step, barInSec, t, sd, lastBarOfPhrase) {
    const ch = sec.chords[barInSec % sec.chords.length], notes = chordNotes(song, ch);
    const root = notes[0];
    // drums
    const d = sec.drums;
    if (d >= 1) {
      if (step % 8 === 0) kick(t, 0.8);
      if (step % 8 === 4 && d >= 2) snare(t);
      if (step % 2 === 0) hat(t, step % 4 === 0 ? 1 : 0.6);
      if (d === 1 && step === 12) snare(t, 0.5);
    }
    if (d >= 2 && (step === 6 || step === 10) && Math.random() < 0.6) kick(t, 0.6);
    if (d >= 3) { if (step % 2 === 1) hat(t, 0.35); if (step === 14) hat(t, 0.8, true); if (step % 4 === 2) kick(t, 0.5); }
    if (d >= 1 && lastBarOfPhrase && step >= 12) snare(t, 0.4 + (step - 12) * 0.2); // fill
    if (d >= 1 && barInSec === 0 && step === 0) hiss(t, 1.2, 5000, 'highpass', 0.12); // crash
    // bass
    const b = sec.bass, bassN = root - 12;
    if (b === 'hold' && step === 0) voice(t, midi(bassN), sd * 16, 'sawtooth', 0.32, { filter: 400, attack: 0.03 });
    if (b === 'pulse' && step % 2 === 0) voice(t, midi(bassN + (step % 8 === 6 ? 12 : 0)), sd * 1.8, 'sawtooth', 0.36, { filter: 700 });
    if (b === 'sync' && [0, 3, 6, 8, 10, 11, 14].includes(step)) voice(t, midi(bassN + (step === 11 ? 7 : step === 14 ? 12 : 0)), sd * 1.5, 'square', 0.28, { filter: 900, q: 4 });
    if (b === 'walk' && step % 4 === 0) voice(t, midi(bassN + [0, 7, 12, notes[1] - root][step / 4]), sd * 3.6, 'sawtooth', 0.36, { filter: 650 });
    // pads
    if (step === 0 && sec.pad === 'pad') for (const n of notes) { voice(t, midi(n), sd * 16, 'sawtooth', 0.06, { attack: 0.25, filter: 1400, detune: -8 }); voice(t, midi(n), sd * 16, 'sawtooth', 0.06, { attack: 0.25, filter: 1400, detune: 8 }); }
    if (step === 0 && sec.pad === 'organ') for (const n of [...notes, notes[0] + 12]) { voice(t, midi(n), sd * 16, 'square', 0.035, { attack: 0.05, filter: 2200 }); voice(t, midi(n + 12), sd * 16, 'sine', 0.05, { attack: 0.05 }); }
    // arpeggio
    const a = sec.arp, ext = [0, 1, 2, 3, 4, 5];
    const arpNote = (i) => toneAt(notes, ext[i % ext.length]) + 12;
    if (a === 'up8' && step % 2 === 0) voice(t, midi(arpNote(step / 2)), sd * 1.6, 'square', 0.07, { filter: 2500 });
    if (a === 'up16') voice(t, midi(arpNote(step)), sd * 0.9, 'square', 0.06, { filter: 3000 });
    if (a === 'updown16') { const seq = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0, 1, 2, 3, 2, 1]; voice(t, midi(arpNote(seq[step])), sd * 0.9, 'triangle', 0.09); }
    if (a === 'broken16') { const seq = [0, 2, 1, 3, 2, 4, 3, 5, 0, 2, 1, 3, 2, 4, 5, 3]; if (step % 4 !== 3) voice(t, midi(arpNote(seq[step])), sd * 0.8, 'square', 0.05, { filter: 2200 }); }
    if (a === 'slow' && step % 4 === 0) voice(t, midi(arpNote(step / 4 + 2)), sd * 3.8, 'triangle', 0.1, { attack: 0.02 });
    // lead melody (motif re-voiced on the chord; every other pass is varied)
    if (sec.lead) {
      const pos = (barInSec % 2) * 16 + step, vary = Math.floor(barInSec / 2) % 2;
      for (const n of sec.motif) if (n.st === pos) {
        const idx = n.idx + (vary && n.st > 16 ? 1 : 0);
        const f = midi(toneAt(notes, idx) + 12);
        voice(t, f, sd * n.len * 0.95, sec.lead === 2 ? 'sawtooth' : 'triangle', sec.lead === 2 ? 0.07 : 0.13, { filter: sec.lead === 2 ? 2600 : null, vibrato: 4, attack: 0.02 });
        if (sec.lead === 2) voice(t, f / 2, sd * n.len * 0.95, 'triangle', 0.06);
      }
    }
  }

  let songIdx = 0, songStep = 0, nextTime = 0;
  function scheduler() {
    if (!ctx || !musicOn) return;
    const song = SONGS[songIdx], sd = 60 / song.bpm / 4;
    const totalBars = song.sections.reduce((a, s) => a + s.bars, 0);
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
    while (nextTime < ctx.currentTime + 0.2) {
      let bar = Math.floor(songStep / 16) % totalBars;
      const step = songStep % 16;
      let sec = null, barInSec = bar;
      for (const s of song.sections) { if (barInSec < s.bars) { sec = s; break; } barInSec -= s.bars; }
      playStep(song, sec, step, barInSec, nextTime, sd, barInSec % 4 === 3);
      nextTime += sd; songStep++;
    }
  }
  // =====================================================================
  //  AMBIENCE - quiet background sound for each level (wind, fluorescent hum, birds, rain)
  // =====================================================================
  let ambWant = null, amb = null;
  function stopAmbience() {
    if (!amb) return;
    const a = amb; amb = null;
    try { a.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3); } catch (e) {}
    clearInterval(a.timer); setTimeout(() => { for (const n of a.nodes) try { n.stop(); } catch (e) {} }, 1200);
  }
  function applyAmbience() {
    stopAmbience();
    if (!ctx || !ambWant) return;
    const t = ctx.currentTime, gain = ctx.createGain(); gain.gain.setValueAtTime(0.0001, t); gain.gain.setTargetAtTime(1, t, 0.8); gain.connect(master);
    const a = { gain, nodes: [], timer: null };
    const loopNoise = (type, freq, q, vol, rate = 1) => {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true; src.playbackRate.value = rate;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = vol; src.connect(f); f.connect(g); g.connect(gain); src.start(t, Math.random()); a.nodes.push(src); return { f, g };
    };
    if (ambWant === 'wind') {
      const w = loopNoise('bandpass', 380, 0.7, 0.05, 0.6);
      a.timer = setInterval(() => { const n = ctx.currentTime; w.g.gain.setTargetAtTime(0.02 + Math.random() * 0.07, n, 1.2); w.f.frequency.setTargetAtTime(250 + Math.random() * 400, n, 1.5); }, 1400);
    } else if (ambWant === 'hum') {
      for (const [f, v] of [[60, 0.02], [120, 0.012]]) { const o = ctx.createOscillator(); o.frequency.value = f; const g = ctx.createGain(); g.gain.value = v; o.connect(g); g.connect(gain); o.start(t); a.nodes.push(o); }
      loopNoise('highpass', 6000, 0.5, 0.006);
    } else if (ambWant === 'birds') {
      loopNoise('lowpass', 500, 0.5, 0.012, 0.5);
      a.timer = setInterval(() => { if (Math.random() < 0.55) { const base = 2200 + Math.random() * 1800; for (let i = 0; i < 2 + (Math.random() * 3 | 0); i++) tone(base * (0.9 + Math.random() * 0.25), 0.07, 'sine', 0.04, base * 1.3, i * 0.09, gain); } }, 900);
    } else if (ambWant === 'rain') {
      loopNoise('highpass', 1800, 0.4, 0.05); loopNoise('lowpass', 300, 0.6, 0.04, 0.7);
    } else if (ambWant === 'crowd') {
      const c = loopNoise('bandpass', 700, 0.9, 0.04, 0.8);
      a.timer = setInterval(() => c.g.gain.setTargetAtTime(0.02 + Math.random() * 0.05, ctx.currentTime, 0.5), 700);
    }
    amb = a;
  }
  function setAmbience(kind) { if (kind === ambWant && amb) return; ambWant = kind || null; if (ctx) applyAmbience(); }

  function startMusic() {
    if (!amb && ambWant) applyAmbience();
    if (musicTimer || !ctx) return;
    nextTime = ctx.currentTime + 0.1;
    musicTimer = setInterval(scheduler, 50);
  }
  function setSong(i) {
    i = Math.max(0, Math.min(SONGS.length - 1, i));
    if (i === songIdx && musicTimer) return;
    songIdx = i; songStep = 0; if (ctx) nextTime = ctx.currentTime + 0.15;
  }
  function stopMusic() { clearInterval(musicTimer); musicTimer = null; }
  function toggleMusic() { musicOn = !musicOn; if (!musicOn) stopMusic(); else startMusic(); return musicOn; }
  function songName() { return SONGS[songIdx].name; }

  return { init, play, startMusic, stopMusic, toggleMusic, setSong, songName, setAmbience };
})();
