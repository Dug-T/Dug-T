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
    musicGain = ctx.createGain(); musicGain.gain.value = 0.18; musicGain.connect(master);
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

  // --- music: a brooding minor-key synth loop ---
  const bass = [45, 45, 48, 45, 43, 43, 41, 40]; // MIDI notes, A minor-ish
  const lead = [69, 0, 72, 71, 69, 0, 67, 0, 64, 0, 65, 67, 69, 0, 0, 0];
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  function musicTick() {
    if (!ctx || !musicOn) return;
    const s = musicStep++;
    const b = bass[Math.floor(s / 4) % bass.length];
    tone(midi(b), 0.22, 'sawtooth', 0.35, null, 0, musicGain);
    if (s % 2 === 0) tone(midi(b + 12), 0.12, 'square', 0.12, null, 0.11, musicGain);
    const l = lead[s % lead.length];
    if (l && Math.floor(s / 16) % 2 === 1) tone(midi(l), 0.25, 'triangle', 0.3, null, 0, musicGain);
    if (s % 4 === 0) noise(0.12, 120, 0.5, 'lowpass', 1, null, musicGain);
    if (s % 8 === 4) noise(0.1, 2500, 0.25, 'highpass', 1, null, musicGain);
  }
  function startMusic() {
    if (musicTimer || !ctx) return;
    musicTimer = setInterval(musicTick, 150);
  }
  function stopMusic() { clearInterval(musicTimer); musicTimer = null; }
  function toggleMusic() { musicOn = !musicOn; if (!musicOn) stopMusic(); else startMusic(); return musicOn; }

  return { init, play, startMusic, stopMusic, toggleMusic };
})();
