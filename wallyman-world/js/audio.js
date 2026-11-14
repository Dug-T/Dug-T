'use strict';
// Tiny 16-bit-style sound engine: pulse-wave lead, triangle bass, noise drums,
// plus an echo send for that warm SNES "reverb". All music here is original.
const Audio8 = (() => {
  let ctx = null, master, musicBus, sfxBus, echoIn, noiseBuf, waves = {}, muf = null; // muf: the music filter (muffles music underwater)
  const mfx = { muffle: 0, intensity: 0, drums: 0 }; let lstep = 0; // adaptive music (Update 1.9)
  let enabled = true, musicVol = 1, sfxVol = 1, modern = false, revSend = null;
  try { modern = localStorage.getItem('wallyman-sound-style') === 'modern'; } catch (e) { /* ignore */ }
  try { const m = localStorage.getItem('wallyman-music-vol'), f = localStorage.getItem('wallyman-sfx-vol'); if (m !== null) musicVol = +m; if (f !== null) sfxVol = +f; } catch (e) { /* ignore */ }
  try { enabled = localStorage.getItem('wallyman-sound') !== 'off'; } catch (e) { /* ignore */ }

  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(n) {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
    if (!m) return null;
    return (parseInt(m[3], 10) + 1) * 12 + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  }
  const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function pulseWave(duty) {
    const n = 48, re = new Float32Array(n), im = new Float32Array(n);
    for (let i = 1; i < n; i++) re[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
    return ctx.createPeriodicWave(re, im);
  }

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = enabled ? 0.8 : 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    muf = ctx.createBiquadFilter(); muf.type = 'lowpass'; muf.frequency.value = 22000; muf.Q.value = 0.7; muf.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.55 * musicVol; musicBus.connect(muf);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.7 * sfxVol; sfxBus.connect(master);
    // echo
    echoIn = ctx.createGain(); echoIn.gain.value = 0.28;
    const d = ctx.createDelay(1); d.delayTime.value = 0.19;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    echoIn.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    waves.p12 = pulseWave(0.125); waves.p25 = pulseWave(0.25); waves.p50 = pulseWave(0.5);
    // modern style: a warm saw-like lead, a soft bell and a round organ, plus a hall reverb
    const harm = (fn) => { const n = 32, re = new Float32Array(n), im = new Float32Array(n); for (let i = 1; i < n; i++) im[i] = fn(i); return ctx.createPeriodicWave(re, im); };
    waves.mWarm = harm((i) => Math.pow(1 / i, 1.35) * (i > 12 ? 0.4 : 1)); waves.mBell = harm((i) => (i === 1 ? 1 : i === 2 ? 0.35 : i === 4 ? 0.2 : i === 6 ? 0.08 : 0)); waves.mOrgan = harm((i) => (i % 2 ? 1 / i : 0.25 / i));
    try {
      const len = Math.floor(ctx.sampleRate * 2.4), ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
      const conv = ctx.createConvolver(); conv.buffer = ir; revSend = ctx.createGain(); revSend.gain.value = 0.32;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 180; revSend.connect(hp); hp.connect(conv); conv.connect(master);
    } catch (e) { revSend = null; }
    setInterval(tick, 25);
  }

  const MODERN_WAVE = { p12: 'mWarm', p25: 'mWarm', p50: 'mOrgan', square: 'mOrgan', sawtooth: 'mWarm', mWarm: 'mWarm', mBell: 'mBell', mOrgan: 'mOrgan' };
  function toneModern(wave, f, t, dur, vol, bus, o) { // two detuned voices panned apart, a soft filter, and reverb
    const mw = bus === musicBus && wave === 'triangle' ? null : MODERN_WAVE[wave] || (wave === 'triangle' ? 'mBell' : null);
    const out = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(12000, f * (bus === musicBus ? 7 : 10)); lp.Q.value = 0.6;
    const a = Math.max(o.attack || 0.005, mw ? 0.012 : 0.006), rel = (o.release || 0.05) * 1.8, v = vol * (mw ? 0.85 : 1);
    out.gain.setValueAtTime(0.0001, t); out.gain.linearRampToValueAtTime(v, t + a);
    if (o.decay) out.gain.exponentialRampToValueAtTime(Math.max(0.0001, v * o.decay), t + dur); else out.gain.setValueAtTime(v, t + Math.max(a, dur - rel));
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
    const voices = mw ? [[-7, -0.35], [7, 0.35]] : [[0, 0]];
    for (const [cents, pan] of voices) {
      const osc = ctx.createOscillator(); if (mw) osc.setPeriodicWave(waves[mw]); else osc.type = wave === 'triangle' ? 'triangle' : wave;
      osc.frequency.setValueAtTime(f, t); osc.detune.value = cents;
      if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + (o.slideT || dur));
      if (o.vib && dur > 0.25) { const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.008, t + Math.min(0.4, dur)); lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t); lfo.stop(t + dur + 0.1); }
      const g = ctx.createGain(); g.gain.value = mw ? 0.55 : 1;
      let node = g; if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
      osc.connect(g); node.connect(lp); osc.start(t); osc.stop(t + dur + rel + 0.05);
    }
    lp.connect(out); out.connect(bus);
    if (revSend) { const s = ctx.createGain(); s.gain.value = bus === musicBus ? 0.55 : 0.3; out.connect(s); s.connect(revSend); }
  }
  function tone(wave, f, t, dur, vol, bus, o = {}) {
    if (modern) return toneModern(wave, f, t, dur, vol, bus, o);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    if (waves[wave]) osc.setPeriodicWave(waves[wave]); else osc.type = wave;
    osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + (o.slideT || dur));
    if (o.vib && dur > 0.25) {
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.35, dur));
      lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t); lfo.stop(t + dur + 0.1);
    }
    const a = o.attack || 0.005, rel = o.release || 0.05;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    if (o.decay) g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * o.decay), t + dur);
    else g.gain.setValueAtTime(vol, t + Math.max(a, dur - rel));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
    osc.connect(g); g.connect(bus);
    if (o.echo) g.connect(echoIn);
    osc.start(t); osc.stop(t + dur + rel + 0.02);
  }
  function noise(t, dur, vol, bus, type, f, q = 1) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(bus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  function drum(kind, t) {
    if (modern) { // punchier, cleaner kit
      if (kind === 'k') { tone('sine', 140, t, 0.22, 0.85, musicBus, { slide: 38, slideT: 0.16, decay: 0.01 }); noise(t, 0.02, 0.12, musicBus, 'highpass', 4000); }
      else if (kind === 's') { noise(t, 0.2, 0.3, musicBus, 'bandpass', 2200, 0.5); tone('triangle', 190, t, 0.08, 0.22, musicBus, { decay: 0.1 }); if (revSend) { const g = ctx.createGain(); g.gain.value = 0.4; noise(t, 0.12, 0.15, g, 'highpass', 1500); g.connect(revSend); } }
      else if (kind === 'h') noise(t, 0.03, 0.06, musicBus, 'highpass', 9000, 0.7);
      else if (kind === 'o') noise(t, 0.22, 0.06, musicBus, 'highpass', 8000, 0.7);
      return;
    }
    if (kind === 'k') tone('sine', 160, t, 0.12, 0.7, musicBus, { slide: 42, slideT: 0.12, decay: 0.01 });
    else if (kind === 's') { noise(t, 0.13, 0.32, musicBus, 'bandpass', 1900, 0.7); tone('triangle', 210, t, 0.06, 0.2, musicBus, { decay: 0.1 }); }
    else if (kind === 'h') noise(t, 0.035, 0.09, musicBus, 'highpass', 7500);
    else if (kind === 'o') noise(t, 0.16, 0.08, musicBus, 'highpass', 6500);
  }

  // ---------- songs (all original compositions) ----------
  const BASS = {
    bounce: [[0, 'r', 3], [4, '5', 2], [6, '8', 2], [8, 'r', 3], [12, '5', 2], [14, '3', 2]],
    walk: [[0, 'r', 4], [4, '3', 4], [8, '5', 4], [12, '8', 4]],
    drive: [[0, 'r', 2], [2, 'r', 2], [4, '8', 2], [6, 'r', 2], [8, 'r', 2], [10, 'r', 2], [12, '8', 2], [14, '5', 2]],
    sparse: [[0, 'r', 6], [8, '5', 6]],
    waltz: [[0, 'r', 4], [4, '5', 3], [8, '8', 3]],
    hold: [[0, 'r', 14]],
  };
  const SONGS = {
    title: {
      bpm: 132, swing: 0.3, bass: 'bounce', harm: 'stab', drums: 'k.h.s.h.k.khs.h.', lead: 'p25',
      chords: 'F C Dm C F Bb C F',
      mel: 'C5/2 F5/2 A5/2 C6/4 A5/2 C6/4 | Bb5/3 A5/1 G5/2 F5/2 G5/8 | A5/2 G5/2 F5/2 D5/2 C5/4 F5/4 | E5/2 F5/2 G5/2 A5/2 G5/8 |' +
        'C5/2 F5/2 A5/2 C6/4 D6/2 C6/4 | Bb5/2 D6/2 C6/2 Bb5/2 A5/4 F5/4 | G5/2 A5/2 Bb5/2 G5/2 E5/2 F5/2 G5/2 E5/2 | F5/8 C5/2 F5/6',
    },
    menu: {
      bpm: 118, swing: 0.36, bass: 'walk', harm: 'stab', drums: 'k..hs.h.k.hhs.h.', lead: 'p12',
      chords: 'D Bm G A D Bm Em A G A F#m Bm G A D D',
      mel: 'F#5/3 E5/1 D5/2 A4/2 B4/2 D5/2 F#5/4 | E5/2 D5/2 B4/4 r/2 B4/2 C#5/2 D5/2 | E5/3 D5/1 B4/2 G4/2 A4/2 B4/2 D5/4 | C#5/2 E5/2 A5/4 G5/2 F#5/2 E5/4 |F#5/3 E5/1 D5/2 A4/2 B4/2 D5/2 A5/4 | B5/2 A5/2 F#5/2 D5/2 E5/4 F#5/4 | G5/2 F#5/2 E5/2 D5/2 B4/2 D5/2 E5/2 G5/2 | F#5/6 E5/2 C#5/4 A4/4 |B4/2 D5/2 G5/3 F#5/1 E5/2 D5/2 B4/4 | C#5/2 E5/2 A5/3 G5/1 F#5/2 E5/2 C#5/4 | A5/3 G#5/1 F#5/2 C#5/2 E5/4 D5/2 C#5/2 | D5/2 C#5/2 B4/2 F#4/2 B4/8 |G5/3 F#5/1 E5/2 D5/2 B4/2 D5/2 G5/4 | A5/3 G5/1 F#5/2 E5/2 C#5/2 E5/2 A5/4 | F#5/2 A5/2 D6/4 C#6/2 B5/2 A5/4 | D5/12 r/4',
    },
    map: {
      bpm: 112, swing: 0.25, bass: 'walk', harm: 'pad', drums: 'k...h.h.k...h.h.', lead: 'p12',
      chords: 'G C Em D G C D G',
      mel: 'D5/4 B4/2 G4/2 A4/4 B4/4 | C5/4 E5/2 D5/2 C5/4 A4/4 | B4/4 D5/2 G5/2 F#5/4 E5/4 | D5/8 r/4 D5/2 E5/2 |' +
        'D5/4 B4/2 G4/2 A4/4 B4/4 | C5/4 E5/2 G5/2 F#5/4 E5/4 | D5/2 C5/2 B4/2 A4/2 B4/4 A4/4 | G4/12 r/4',
    },
    grass: {
      bpm: 150, swing: 0.33, bass: 'bounce', harm: 'stab', drums: 'k.h.s.h.k.khs.hh', lead: 'p25',
      chords: 'C F G G C Am Dm C F C G G',
      mel: 'G4/2 C5/2 E5/3 D5/1 C5/2 A4/2 G4/4 | F4/2 A4/2 C5/2 F5/2 E5/4 r/4 | D5/2 E5/2 F5/3 E5/1 D5/2 B4/2 G4/4 | A4/2 B4/2 C5/2 D5/2 G5/6 r/2 |' +
        'G4/2 C5/2 E5/3 D5/1 C5/2 E5/2 A5/4 | G5/2 F5/2 E5/2 D5/2 C5/4 A4/4 | F4/2 A4/2 D5/2 F5/2 E5/2 D5/2 B4/2 G4/2 | C5/6 G4/2 C5/4 r/4 |' +
        'A5/3 G5/1 F5/2 A5/2 G5/4 E5/4 | F5/3 E5/1 D5/2 F5/2 E5/4 C5/4 | D5/2 D5/2 E5/2 F5/2 G5/2 A5/2 B5/2 G5/2 | C6/4 B5/2 A5/2 G5/4 r/4',
    },
    cave: {
      bpm: 104, swing: 0.2, bass: 'sparse', harm: 'arp', drums: 'k.....h.k...o.h.', lead: 'p50',
      chords: 'Am Am F E Am Dm E Am',
      mel: 'A4/2 r/2 C5/2 r/2 E5/2 D5/2 C5/2 B4/2 | A4/2 r/2 E4/2 r/2 G4/4 A4/4 | F4/2 r/2 A4/2 r/2 C5/2 B4/2 A4/2 G4/2 | E4/2 r/2 G#4/2 r/2 B4/4 E5/4 |' +
        'A4/2 r/2 C5/2 r/2 E5/2 D5/2 C5/2 B4/2 | D5/2 r/2 F5/2 r/2 E5/4 C5/4 | B4/2 C5/2 D5/2 E5/2 C5/2 B4/2 G#4/4 | A4/8 r/8',
    },
    sky: {
      bpm: 168, swing: 0, bar: 12, bass: 'waltz', harm: 'waltz', drums: 'k...h...h...', lead: 'p25',
      chords: 'Bb Cm Bb F Bb Eb F Bb Gm F Eb F Bb Cm F Bb',
      mel: 'F5/4 D5/4 Bb4/4 | C5/4 Eb5/4 G5/4 | F5/6 Eb5/2 D5/4 | C5/12 | F5/4 D5/4 Bb4/4 | Eb5/4 G5/4 Bb5/4 | A5/4 G5/4 A5/4 | Bb5/12 |' +
        'D6/4 C6/4 Bb5/4 | C6/6 Bb5/2 A5/4 | G5/4 F5/4 Eb5/4 | F5/12 | D5/4 Eb5/4 F5/4 | G5/4 Eb5/4 C5/4 | D5/4 F5/4 A4/4 | Bb4/12',
    },
    charge: {
      bpm: 184, swing: 0, bass: 'drive', harm: 'stab', drums: 'khskhskhkhshkhsh', lead: 'p25',
      chords: 'C F G C',
      mel: 'C5/2 E5/2 G5/2 C6/2 G5/2 E5/2 C6/4 | A5/2 F5/2 C6/2 A5/2 F5/4 C6/4 | B5/2 G5/2 D6/2 B5/2 G5/4 D6/4 | C6/4 G5/2 E5/2 C5/8',
    },
    haunted: {
      bpm: 96, swing: 0, bass: 'sparse', harm: 'arp', drums: 'k.......h.......', lead: 'p50',
      chords: 'Em C Am B Em C B Em',
      mel: 'E5/4 G5/2 F#5/2 E5/4 B4/4 | C5/4 E5/2 D#5/2 E5/8 | A4/2 C5/2 E5/4 D5/2 C5/2 B4/4 | D#5/6 F#5/2 B5/8 |' +
        'E5/4 G5/2 B5/2 A#5/4 B5/4 | C6/4 B5/2 A5/2 G5/4 E5/4 | F#5/2 G5/2 A5/2 G5/2 F#5/4 D#5/4 | E5/12 r/4',
    },
    water: {
      bpm: 132, swing: 0, bar: 12, bass: 'waltz', harm: 'waltz', drums: 'k.....h.....', lead: 'p12',
      chords: 'E A B E E A F#m B',
      mel: 'G#5/4 B5/4 E6/4 | C#6/6 B5/2 A5/4 | F#5/4 A5/4 D#6/4 | E6/12 | G#5/4 E5/4 B4/4 | A4/4 C#5/4 E5/4 | F#5/4 A5/4 C#6/4 | B5/8 r/4',
    },
    airship: {
      bpm: 138, swing: 0, bass: 'drive', harm: 'stab', drums: 'k.s.k.s.k.s.kss.', lead: 'p25',
      chords: 'Gm Eb F D Gm Eb F Gm',
      mel: 'G4/2 Bb4/2 D5/2 G5/4 F5/2 D5/4 | Eb5/4 G5/2 Bb5/2 G5/4 Eb5/4 | F5/2 F5/2 A5/2 C6/2 Bb5/2 A5/2 F5/4 | F#5/6 A5/2 D6/8 |' +
        'G5/2 D5/2 G5/2 Bb5/4 A5/2 G5/4 | G5/4 Bb5/2 Eb6/2 D6/4 Bb5/4 | A5/2 C6/2 A5/2 F5/2 D5/2 F#5/2 A5/4 | G5/12 r/4',
    },
    volcano: {
      bpm: 150, swing: 0, bass: 'drive', harm: 'stab', drums: 'k.hsk.hsk.hsk.ss', lead: 'p25',
      chords: 'Em Em C D Em Em C B',
      mel: 'E5/2 E5/2 G5/2 E5/2 B5/4 A5/2 G5/2 | F#5/2 G5/2 A5/2 G5/2 E5/8 | C5/2 E5/2 G5/2 C6/4 B5/2 A5/2 G5/2 | F#5/4 A5/4 D6/4 C6/2 A5/2 |' +
        'E5/2 G5/2 B5/2 E6/4 D6/2 B5/4 | G5/2 F#5/2 E5/2 D5/2 E5/8 | C6/4 B5/2 A5/2 G5/4 E5/4 | D#5/4 F#5/4 B5/8',
    },
    factory: {
      bpm: 140, swing: 0, bass: 'drive', harm: 'arp', drums: 'k.h.k.h.k.hhk.h.', lead: 'p12',
      chords: 'Am Am Dm Dm E E Am Am',
      mel: 'A4/2 A4/1 A4/1 C5/2 E5/2 A5/2 G5/2 E5/2 C5/2 | A4/2 A4/1 A4/1 C5/2 E5/2 G5/4 E5/4 | D5/2 D5/1 D5/1 F5/2 A5/2 D6/2 C6/2 A5/2 F5/2 | D5/2 D5/1 D5/1 F5/2 A5/2 C6/4 A5/4 |' +
        'E5/2 E5/1 E5/1 G#5/2 B5/2 E6/2 D6/2 B5/2 G#5/2 | E5/2 F5/2 E5/2 D5/2 C5/2 B4/2 G#4/4 | A4/2 C5/2 E5/2 A5/2 G5/2 E5/2 C5/2 E5/2 | A5/8 r/8',
    },
    candy: {
      bpm: 160, swing: 0.35, bass: 'bounce', harm: 'stab', drums: 'k.h.s.h.k.h.s.hh', lead: 'p25',
      chords: 'F Bb C F Dm Bb C F',
      mel: 'C5/2 F5/2 A5/2 F5/2 C6/4 A5/4 | Bb5/2 A5/2 G5/2 F5/2 D5/4 F5/4 | E5/2 G5/2 C6/2 G5/2 E5/4 C5/4 | F5/6 A5/2 F5/8 |' +
        'D5/2 F5/2 A5/2 D6/2 C6/2 A5/2 F5/4 | Bb4/2 D5/2 F5/2 Bb5/2 A5/4 G5/4 | G5/2 A5/2 Bb5/2 G5/2 E5/2 C5/2 E5/2 G5/2 | F5/12 r/4',
    },
    moon: {
      bpm: 100, swing: 0, bass: 'sparse', harm: 'pad', drums: 'k.......h.......', lead: 'p50',
      chords: 'C Am F G C Am F C',
      mel: 'E5/4 G5/4 C6/4 B5/4 | A5/6 G5/2 E5/8 | F5/4 A5/4 C6/4 E6/4 | D6/12 r/4 | E5/4 G5/4 C6/4 D6/4 | E6/6 D6/2 C6/8 | A5/4 G5/4 F5/4 A5/4 | G5/16',
    },
    neon: {
      bpm: 138, swing: 0, bass: 'drive', harm: 'stab', drums: 'k.hsk.hsk.hsk.hs', lead: 'p12',
      chords: 'Am F C G Am F C E',
      mel: 'E5/2 A5/2 C6/2 B5/2 A5/4 E5/4 | F5/2 A5/2 C6/2 A5/2 F5/8 | G5/2 C6/2 E6/2 D6/2 C6/4 G5/4 | B5/4 G5/4 D5/8 |' +
        'E5/2 A5/2 C6/2 E6/2 D6/4 C6/4 | A5/2 F5/2 C5/2 F5/2 A5/8 | G5/2 E5/2 C5/2 E5/2 G5/2 C6/2 E6/4 | E6/12 r/4',
    },
    bossufo: {
      bpm: 160, swing: 0, bass: 'drive', harm: 'pad', drums: 'k.s.k.sskks.k.s.', lead: 'p50',
      chords: 'Cm Ab Bb G Cm Ab Bb G',
      mel: 'C5/2 G5/2 C6/2 G5/2 Eb6/4 D6/4 | Ab5/2 C6/2 Eb6/2 C6/2 Ab5/8 | Bb5/2 D6/2 F6/2 D6/2 Bb5/4 F5/4 | G5/2 B5/2 D6/2 G6/2 F6/4 D6/4 |' +
        'C6/2 Bb5/2 G5/2 Eb5/2 C5/4 G5/4 | Ab5/2 G5/2 F5/2 Eb5/2 C5/8 | D5/2 F5/2 Bb5/2 D6/2 F6/4 D6/4 | B5/12 r/4',
    },
    bossice: {
      bpm: 150, swing: 0, bass: 'drive', harm: 'stab', drums: 'k.hsk.hskkhsk.hs', lead: 'p25',
      chords: 'Dm Dm Bb C Dm Dm Bb A',
      mel: 'D5/2 F5/2 A5/2 D6/2 C6/4 A5/4 | F5/2 A5/2 D6/2 F6/2 E6/8 | D6/2 Bb5/2 F5/2 Bb5/2 C6/4 G5/4 | E5/2 G5/2 C6/2 E6/2 D6/4 C6/4 |' +
        'D6/2 C6/2 A5/2 F5/2 D5/4 A5/4 | F5/2 E5/2 D5/2 F5/2 A5/8 | Bb5/2 A5/2 G5/2 F5/2 E5/2 F5/2 G5/4 | A5/12 r/4',
    },
    bosscarn: {
      bpm: 180, swing: 0.4, bass: 'waltz', harm: 'stab', drums: 'k.hk.hk.hk.hk.hs', lead: 'p12',
      chords: 'Em B Em B Am Em B Em',
      mel: 'E5/2 G5/2 B5/2 E6/4 D#6/2 E6/2 | F#6/2 E6/2 D#6/2 B5/4 r/2 F#5/2 | G5/2 B5/2 E6/2 G6/4 F#6/2 E6/2 | D#6/2 F#6/2 B6/4 r/4 |' +
        'A5/2 C6/2 E6/2 A6/4 G6/2 F#6/2 | E6/2 D#6/2 E6/2 B5/4 r/2 G5/2 | F#5/2 A5/2 D#6/2 F#6/2 E6/2 D#6/2 B5/4 | E5/12 r/4',
    },
    bossjungle: {
      bpm: 140, swing: 0.2, bass: 'bounce', harm: 'stab', drums: 'k.kskk.sk.kskkss', lead: 'p25',
      chords: 'Gm Gm Eb F Gm Gm Eb D',
      mel: 'G4/2 Bb4/2 D5/2 G5/2 F5/4 D5/4 | Eb5/2 D5/2 C5/2 Bb4/2 G4/8 | Eb5/2 G5/2 Bb5/2 G5/2 Eb5/4 C5/4 | F5/2 A5/2 C6/2 A5/2 F5/8 |' +
        'G5/2 F5/2 D5/2 Bb4/2 G4/4 D5/4 | Bb5/2 A5/2 G5/2 F5/2 D5/8 | Eb5/2 F5/2 G5/2 Bb5/2 C6/2 Bb5/2 G5/4 | F#5/12 r/4',
    },
    bossdesert: {
      bpm: 146, swing: 0, bass: 'drive', harm: 'pad', drums: 'k..sk.s.k..skks.', lead: 'p12',
      chords: 'Em Em F F Em Em D B',
      mel: 'E5/2 F5/2 G#5/2 A5/2 B5/4 A5/4 | G#5/2 F5/2 E5/4 r/4 B4/4 | F5/2 G#5/2 A5/2 C6/2 B5/4 G#5/4 | A5/2 G#5/2 F5/2 E5/2 F5/8 |' +
        'E5/2 G#5/2 B5/2 E6/2 D6/4 C6/4 | B5/2 A5/2 G#5/2 F5/2 E5/8 | D5/2 F#5/2 A5/2 D6/2 C6/4 A5/4 | B5/12 r/4',
    },
    bossfinal: {
      bpm: 190, swing: 0, bass: 'drive', harm: 'stab', drums: 'kshskshskkhskshs', lead: 'p12',
      chords: 'Bm G A F# Bm G Em F#',
      mel: 'B4/1 B4/1 D5/2 F#5/2 B5/2 A5/2 F#5/2 D5/4 | G5/2 B5/2 D6/2 B5/2 G5/4 E5/4 | A5/2 C#6/2 E6/2 C#6/2 A5/4 F#5/4 | F#5/2 A#5/2 C#6/2 F#6/2 E6/4 C#6/4 |' +
        'B5/2 D6/2 F#6/2 D6/2 B5/2 F#5/2 D5/4 | G5/2 F#5/2 E5/2 D5/2 B4/8 | E5/2 G5/2 B5/2 E6/2 D6/4 B5/4 | A#5/12 r/4',
    },
    jungle: {
      bpm: 132, swing: 0.25, bass: 'bounce', harm: 'stab', drums: 'k..sk.s.k..sk.ss', lead: 'p25',
      chords: 'Am Am G G F F G E',
      mel: 'A4/2 C5/2 E5/2 A5/2 G5/4 E5/4 | D5/2 E5/2 G5/2 D5/2 B4/8 | C5/2 F5/2 A5/2 C6/2 B5/4 A5/4 | G5/4 E5/4 G#5/8 |' +
        'A5/2 G5/2 E5/2 C5/2 D5/2 E5/2 A4/4 | G4/2 B4/2 D5/2 G5/2 F5/4 D5/4 | C5/2 E5/2 F5/2 A5/2 G5/2 F5/2 E5/4 | E5/12 r/4',
    },
    desert: {
      bpm: 120, swing: 0.15, bass: 'sparse', harm: 'pad', drums: 'k...s.k.k...s...', lead: 'p25',
      chords: 'Dm Dm C C Bb Bb A A',
      mel: 'D5/2 E5/2 F5/2 A5/2 G#5/4 A5/4 | F5/2 E5/2 D5/2 C#5/2 D5/8 | A4/2 D5/2 F5/2 G5/2 A5/4 Bb5/4 | A5/4 G5/4 F5/2 E5/2 C#5/4 |' +
        'D5/2 F5/2 A5/2 D6/2 C6/4 Bb5/4 | A5/2 G5/2 F5/2 E5/2 F5/8 | G5/2 F5/2 E5/2 D5/2 C#5/2 E5/2 A4/4 | D5/12 r/4',
    },
    static: {
      bpm: 176, swing: 0, bass: 'drive', harm: 'stab', drums: 'kshskshskshskhss', lead: 'p12',
      chords: 'Em Em C D Em Em C B',
      mel: 'E5/1 E5/1 G5/2 B5/2 E6/2 D6/2 B5/2 G5/4 | A5/2 C6/2 B5/2 A5/2 G5/4 F#5/4 | E5/2 G5/2 B5/2 E6/2 F#6/2 E6/2 D6/2 B5/2 | C6/4 B5/4 A5/4 F#5/4 |' +
        'G5/2 B5/2 E6/2 B5/2 G5/2 E5/2 B4/4 | C5/2 E5/2 A5/2 C6/2 B5/4 A5/4 | G5/2 F#5/2 E5/2 D5/2 C5/2 B4/2 C5/2 D5/2 | E5/12 r/4',
    },
    carnival: {
      bpm: 168, swing: 0.4, bass: 'bounce', harm: 'stab', drums: 'k.hsk.hsk.hsk.hs', lead: 'p25',
      chords: 'C G G C C G G C F C G C',
      mel: 'G5/2 F#5/2 G5/2 E5/2 C5/4 E5/4 | D5/2 C#5/2 D5/2 B4/2 G4/4 B4/4 | D5/2 F5/2 A5/2 G5/2 F5/2 D5/2 B4/2 D5/2 | C5/4 E5/4 G5/4 C6/4 |' +
        'G5/2 F#5/2 G5/2 E5/2 C5/4 E5/4 | F5/2 E5/2 F5/2 D5/2 B4/4 D5/4 | A5/2 G5/2 F5/2 E5/2 D5/2 C5/2 B4/2 D5/2 | C5/12 r/4',
    },
    beach: {
      bpm: 152, swing: 0.32, bass: 'bounce', harm: 'stab', drums: 'k.hsh.hsk.hsh.hh', lead: 'p25',
      chords: 'G C D G G C D G Em C A D',
      mel: 'B4/2 D5/2 G5/2 D5/2 E5/3 D5/1 B4/4 | C5/2 E5/2 G5/2 E5/2 A5/4 G5/4 | F#5/2 A5/2 F#5/2 D5/2 E5/2 F#5/2 D5/4 | G5/6 D5/2 B4/4 r/4 |' +
        'B4/2 D5/2 G5/2 D5/2 E5/3 D5/1 G5/4 | A5/2 G5/2 E5/2 C5/2 E5/4 G5/4 | F#5/3 E5/1 D5/2 C5/2 B4/2 A4/2 F#4/4 | G4/12 r/4 |' +
        'E5/2 G5/2 B5/4 A5/2 G5/2 E5/4 | E5/2 G5/2 C6/4 B5/2 A5/2 G5/4 | A5/3 G5/1 F#5/2 E5/2 C#5/2 E5/2 A5/4 | F#5/2 E5/2 D5/2 A4/2 D5/8',
    },
    snow: {
      bpm: 150, swing: 0, bar: 12, bass: 'waltz', harm: 'arp', drums: 'k.....h.....', lead: 'p12',
      chords: 'Am F G C Am F G Am Dm Am E Am',
      mel: 'E5/4 A5/4 B5/4 | C6/6 B5/2 A5/4 | B5/4 G5/4 D5/4 | E5/12 | E5/4 A5/4 B5/4 | C6/4 D6/4 E6/4 | D6/4 B5/4 G5/4 | A5/12 |' +
        'F5/4 A5/4 D6/4 | C6/6 B5/2 A5/4 | G#5/4 B5/4 E6/4 | A5/8 r/4',
    },
    castle: {
      bpm: 146, swing: 0, bass: 'drive', harm: 'stab', drums: 'k.hks.h.k.hks.ss', lead: 'p25',
      chords: 'Dm Bb Dm A F Gm A Dm',
      mel: 'D5/2 D5/2 F5/2 D5/2 A5/4 G#5/2 A5/2 | Bb5/4 A5/2 G5/2 F5/4 E5/4 | D5/2 D5/2 F5/2 D5/2 C6/4 Bb5/2 A5/2 | G5/2 F5/2 E5/2 C#5/2 D5/8 |' +
        'F5/2 F5/2 A5/2 F5/2 C6/4 B5/2 C6/2 | D6/4 C6/2 Bb5/2 A5/4 G5/4 | F5/2 E5/2 D5/2 E5/2 F5/2 G5/2 A5/4 | D5/12 r/4',
    },
    crystal: {
      bpm: 104, swing: 0, bass: 'hold', harm: 'arp', drums: 'k...h...s...h...', lead: 'p25',
      chords: 'Em C G D Em C B B',
      mel: 'B5/4 G5/2 E5/2 B5/4 C6/4 | G5/4 E5/2 C5/2 G5/8 | D6/4 B5/2 G5/2 D6/4 E6/4 | F#6/4 D6/4 A5/8 |' +
        'E6/4 B5/2 G5/2 E6/4 D6/4 | C6/2 B5/2 G5/2 E5/2 C5/8 | D#5/2 F#5/2 B5/2 D#6/2 F#6/8 | B5/12 r/4',
    },
    toy: {
      bpm: 150, swing: 0.3, bass: 'bounce', harm: 'stab', drums: 'k.h.s.hkk.h.s.h.', lead: 'p12',
      chords: 'C A7 Dm G7 C A7 Dm G7',
      mel: 'G5/2 C6/2 E6/2 C6/2 G5/4 E5/4 | A5/2 C#6/2 E6/2 G6/2 E6/8 | F5/2 A5/2 D6/2 A5/2 F6/4 D6/4 | B5/2 D6/2 G6/2 F6/2 D6/8 |' +
        'E6/2 D6/2 C6/2 G5/2 E5/2 G5/2 C6/4 | C#6/2 E6/2 A6/2 G6/2 E6/8 | D6/2 E6/2 F6/2 A6/2 G6/4 F6/4 | C6/12 r/4',
    },
    bossbeat: {
      bpm: 120, swing: 0, bass: 'drive', harm: 'stab', drums: 'k...s...k.k.s...', lead: 'p50',
      chords: 'Am Am F G Am Am F E',
      mel: 'A5/4 r/4 A5/2 C6/2 E6/4 | D6/4 C6/4 A5/8 | F5/4 r/4 F5/2 A5/2 C6/4 | B5/4 G5/4 D6/8 |' +
        'A5/4 r/4 A5/2 C6/2 E6/4 | G6/4 E6/4 C6/8 | F6/4 E6/4 D6/4 C6/4 | B5/4 G#5/4 E5/8',
    },
    bosscrystal: {
      bpm: 164, swing: 0, bass: 'drive', harm: 'pad', drums: 'k.hsk.hsk.hsksss', lead: 'p25',
      chords: 'Bm G Em F# Bm G A F#',
      mel: 'B5/2 F#5/2 B5/2 D6/2 F#6/4 E6/4 | D6/2 B5/2 G5/2 B5/2 D6/8 | E6/2 G6/2 E6/2 B5/2 G5/4 E5/4 | F#5/2 A#5/2 C#6/2 F#6/2 E6/8 |' +
        'D6/2 C#6/2 B5/2 F#5/2 D5/4 F#5/4 | G5/2 B5/2 D6/2 G6/2 F#6/8 | E6/2 C#6/2 A5/2 C#6/2 E6/4 A6/4 | F#6/12 r/4',
    },
    arena: {
      bpm: 156, swing: 0, bass: 'drive', harm: 'stab', drums: 'kshskshskshsksss', lead: 'p12',
      chords: 'Dm Bb C A Dm Bb C A',
      mel: 'D5/2 F5/2 A5/2 D6/2 C6/4 A5/4 | Bb5/2 D6/2 F6/2 D6/2 Bb5/8 | C6/2 E6/2 G6/2 E6/2 C6/4 G5/4 | A5/2 C#6/2 E6/2 A6/2 G6/8 |' +
        'F6/2 E6/2 D6/2 A5/2 F5/4 D5/4 | D6/2 C6/2 Bb5/2 F5/2 D5/8 | E5/2 G5/2 C6/2 E6/2 G6/4 E6/4 | A5/12 r/4',
    },
    doug: {
      bpm: 132, swing: 0.25, bass: 'walk', harm: 'stab', drums: 'k.h.s.h.k.hks.h.', lead: 'p25',
      chords: 'G Em C D G Em Am D',
      mel: 'D5/2 G5/2 B5/2 D6/2 B5/4 G5/4 | E5/2 G5/2 B5/2 E6/2 D6/8 | C6/2 B5/2 A5/2 G5/2 E5/4 C5/4 | D5/2 F#5/2 A5/2 D6/2 C6/8 |' +
        'B5/2 D6/2 G6/2 D6/2 B5/4 G5/4 | E6/2 D6/2 B5/2 G5/2 E5/8 | A5/2 C6/2 E6/2 C6/2 A5/4 F#5/4 | G5/12 r/4',
    },
    pirate: {
      bpm: 126, swing: 0.35, bass: 'bounce', harm: 'waltz', drums: 'k..h..s..h..k.s.', lead: 'p25',
      chords: 'Dm Dm C C Bb Bb A A',
      mel: 'A4/2 D5/2 D5/2 E5/2 F5/4 D5/4 | C5/2 E5/2 E5/2 F5/2 G5/4 E5/4 | F5/2 D5/2 Bb4/2 D5/2 F5/4 A5/4 | G5/4 E5/4 C#5/8 |' +
        'A5/2 G5/2 F5/2 E5/2 D5/4 A4/4 | C5/2 D5/2 E5/2 G5/2 C6/8 | Bb5/2 A5/2 G5/2 F5/2 D5/4 Bb4/4 | A4/2 C#5/2 E5/2 G5/2 A5/8',
    },
    boss: {
      bpm: 172, swing: 0, bass: 'drive', harm: 'stab', drums: 'kshskshskshsksss', lead: 'p12',
      chords: 'Em C Em B',
      mel: 'E5/2 G5/2 E5/2 B5/2 E5/2 G5/2 A#5/2 B5/2 | C6/2 B5/2 A5/2 G5/2 F#5/4 D#5/4 | E5/2 G5/2 E5/2 B5/2 E6/2 D6/2 B5/2 G5/2 | A5/2 G5/2 F#5/2 D#5/2 E5/8',
    },
    clear: {
      bpm: 150, swing: 0.3, bass: 'bounce', harm: 'stab', drums: 'k.h.s.h.k.h.s.h.', lead: 'p25', once: true,
      chords: 'C F G C',
      mel: 'C5/2 D5/2 E5/2 G5/4 E5/2 G5/2 A5/2 | C6/6 A5/2 B5/2 C6/2 D6/4 | C6/12 r/4 | r/16',
    },
    die: {
      bpm: 140, swing: 0, bass: 'hold', harm: 'none', drums: '', lead: 'p25', once: true,
      chords: 'C C',
      mel: 'E5/2 D#5/2 D5/2 C#5/2 C5/6 r/2 | G4/2 E4/2 C4/8 r/4',
    },
    gameover: {
      bpm: 96, swing: 0, bass: 'hold', harm: 'pad', drums: '', lead: 'p50', once: true,
      chords: 'Am F G C',
      mel: 'A4/4 C5/4 B4/4 G4/4 | F4/4 E4/4 D4/4 E4/2 r/2 | D4/4 B3/4 G3/8 | C4/16',
    },
    victory: {
      bpm: 120, swing: 0.25, bass: 'walk', harm: 'stab', drums: 'k.h.s.h.k.h.s.h.', lead: 'p25',
      chords: 'F Dm Bb C F Dm Bb C F',
      mel: 'A5/4 G5/2 F5/2 C5/4 F5/4 | A5/2 Bb5/2 A5/2 G5/2 F5/8 | D5/4 F5/4 Bb5/4 A5/4 | G5/12 r/4 |' +
        'A5/4 G5/2 F5/2 C6/4 A5/4 | D6/2 C6/2 Bb5/2 A5/2 F5/8 | D5/4 F5/4 Bb5/4 D6/4 | C6/6 E5/2 G5/8 | F5/16',
    },
  };

  function parseChord(ch) {
    const m = /^([A-G][#b]?)(m?)/.exec(ch);
    const pc = ((midi(m[1] + '4') % 12) + 12) % 12;
    return { root: 40 + ((pc - 4 + 12) % 12), minor: m[2] === 'm' };
  }
  function compile(name) {
    const s = SONGS[name], bar = s.bar || 16, ev = [];
    let step = 0;
    for (const tok of s.mel.replace(/\|/g, ' ').split(/\s+/).filter(Boolean)) {
      const [n, l] = tok.split('/'); const len = parseInt(l || '2', 10);
      if (n !== 'r') ev.push({ s: step, c: 'lead', m: midi(n), l: len });
      step += len;
    }
    const chords = s.chords.split(' ').map(parseChord);
    chords.forEach((c, i) => {
      const b0 = i * bar;
      const iv = { r: 0, 3: c.minor ? 3 : 4, 5: 7, 8: 12 };
      for (const [st, w, l] of BASS[s.bass]) if (st < bar) ev.push({ s: b0 + st, c: 'bass', m: c.root + iv[w], l });
      const triad = [c.root + 24, c.root + 24 + iv[3], c.root + 31];
      if (s.harm === 'stab') for (const st of [2, 6, 10, 14]) triad.forEach((m) => ev.push({ s: b0 + st, c: 'harm', m, l: 1 }));
      if (s.harm === 'waltz') for (const st of [4, 8]) triad.forEach((m) => ev.push({ s: b0 + st, c: 'harm', m, l: 2 }));
      if (s.harm === 'pad') triad.forEach((m) => ev.push({ s: b0, c: 'pad', m, l: bar - 1 }));
      if (s.harm === 'arp') for (let st = 0; st < bar; st += 2) ev.push({ s: b0 + st, c: 'arp', m: triad[(st / 2) % 3] + 12, l: 1 });
      ev.push({ s: b0, c: 'rp', ms: triad.map((m) => m - 12), l: bar }); // the remastered pad (modern sound only)
      if (s.drums) for (let st = 0; st < bar; st++) { const d = s.drums[st % s.drums.length]; if (d && d !== '.') ev.push({ s: b0 + st, c: 'drum', d }); }
    });
    ev.sort((a, b) => a.s - b.s);
    return { ev, total: Math.max(step, chords.length * bar), stepDur: 60 / s.bpm / 4, swing: s.swing || 0, lead: s.lead, once: !!s.once };
  }
  const compiled = {};
  let cur = null, curName = null, idx = 0, loopN = 0, t0 = 0;

  function playEvent(e, t, sd) {
    const dur = e.l * sd;
    if (modern) { // remastered arrangement: a warm chord pad, a sub-bass, and a soft octave under the melody
      if (e.c === 'rp') { e.ms.forEach((m, i) => tone('mWarm', freq(m), t + i * 0.012, dur * 0.98, 0.028, musicBus, { attack: 0.35, release: 0.4 })); return; }
      if (e.c === 'bass') tone('sine', freq(e.m) / 2, t, dur * 0.9, 0.22, musicBus, { release: 0.05 });
      if (e.c === 'lead') tone('mBell', freq(e.m) / 2, t + 0.02, dur * 0.85, 0.045, musicBus, { release: 0.1 });
    } else if (e.c === 'rp') return;
    if (e.c === 'lead') tone(cur.lead, freq(e.m), t, dur * 0.92, 0.16, musicBus, { vib: true, echo: true, release: 0.06 });
    else if (e.c === 'bass') tone('triangle', freq(e.m), t, dur * 0.85, 0.42, musicBus, { release: 0.03 });
    else if (e.c === 'harm') tone('p50', freq(e.m), t, dur * 0.8, 0.035, musicBus, { echo: true, decay: 0.3 });
    else if (e.c === 'pad') tone('triangle', freq(e.m), t, dur, 0.07, musicBus, { attack: 0.15, release: 0.2, echo: true });
    else if (e.c === 'arp') tone('p25', freq(e.m), t, dur * 0.7, 0.04, musicBus, { echo: true, decay: 0.2 });
    else if (e.c === 'drum') drum(e.d, t);
  }
  // adaptive layers on top of the song: busier drums as a boss gets near, a driving beat on speed runs
  function layer(k, t) {
    const I = mfx.intensity, hat = (I > 0.3 && k % 2 === 1) || (mfx.drums && k % 2 === 1);
    if (hat) drum('h', t);
    if (I > 0.6 && k % 8 === 4) drum('k', t);
    if (I > 0.85 && k % 16 === 14) drum('s', t);
    if (mfx.drums && k % 32 >= 28 && k % 2 === 0) drum('s', t);
    if (mfx.drums && k % 8 === 6) drum('o', t);
  }
  function tick() {
    if (!cur || !ctx) return;
    const ahead = ctx.currentTime + 0.15;
    if (mfx.intensity > 0.3 || mfx.drums) {
      for (let g = 0; g < 64; g++) { const tt = t0 + lstep * cur.stepDur; if (tt > ahead) break; if (tt >= ctx.currentTime - 0.05) layer(lstep, tt); lstep++; }
    } else lstep = Math.max(lstep, Math.ceil((ctx.currentTime - t0) / cur.stepDur));
    for (let guard = 0; guard < 256; guard++) {
      const e = cur.ev[idx];
      if (!e) { if (cur.once) { cur = null; return; } idx = 0; loopN++; continue; }
      let t = t0 + (loopN * cur.total + e.s) * cur.stepDur;
      if (e.s % 4 === 2) t += cur.swing * cur.stepDur;
      if (t > ahead) return;
      if (t >= ctx.currentTime - 0.05) playEvent(e, t, cur.stepDur);
      idx++;
    }
  }
  function play(name) {
    if (!ctx) init();
    if (!ctx || curName === name && cur) return;
    stop();
    compiled[name] = compiled[name] || compile(name);
    cur = compiled[name]; curName = name; idx = 0; loopN = 0; t0 = ctx.currentTime + 0.06; lstep = 0;
  }
  function stop() {
    cur = null; curName = null;
    if (!ctx) return;
    // fade out lingering notes quickly by swapping the music bus
    const old = musicBus; old.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    setTimeout(() => old.disconnect(), 400);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.55 * musicVol; musicBus.connect(muf || master);
  }

  // ---------- sound effects ----------
  const SFX = {
    jump: (t) => tone('p25', 280, t, 0.16, 0.12, sfxBus, { slide: 760, slideT: 0.14 }),
    coin: (t) => { tone('p50', freq(83), t, 0.06, 0.1, sfxBus); tone('p50', freq(88), t + 0.06, 0.28, 0.1, sfxBus, { decay: 0.05 }); },
    stomp: (t) => { tone('p50', 520, t, 0.12, 0.14, sfxBus, { slide: 90 }); noise(t, 0.08, 0.15, sfxBus, 'lowpass', 1200); },
    bump: (t) => tone('triangle', 140, t, 0.09, 0.3, sfxBus, { slide: 70 }),
    brick: (t) => { noise(t, 0.25, 0.35, sfxBus, 'lowpass', 2200); tone('square', 90, t, 0.12, 0.08, sfxBus, { slide: 40 }); },
    sprout: (t) => [60, 64, 67, 72, 76].forEach((m, i) => tone('p25', freq(m), t + i * 0.05, 0.06, 0.09, sfxBus)),
    power: (t) => [67, 71, 74, 79, 72, 76, 79, 84].forEach((m, i) => tone('p25', freq(m), t + i * 0.045, 0.05, 0.1, sfxBus)),
    signal: (t) => [72, 79, 84, 91].forEach((m, i) => tone('sine', freq(m), t + i * 0.06, 0.1, 0.16, sfxBus, { echo: true })),
    hurt: (t) => tone('p50', 700, t, 0.4, 0.14, sfxBus, { slide: 120 }),
    oneup: (t) => [76, 79, 88, 84, 86, 91].forEach((m, i) => tone('p25', freq(m), t + i * 0.08, 0.08, 0.11, sfxBus)),
    ping: (t) => tone('sine', 1300, t, 0.1, 0.18, sfxBus, { slide: 2400, slideT: 0.08 }),
    kick: (t) => { tone('p50', 900, t, 0.08, 0.12, sfxBus, { slide: 300 }); noise(t, 0.06, 0.1, sfxBus, 'highpass', 3000); },
    check: (t) => [72, 76, 79, 84].forEach((m, i) => tone('p25', freq(m), t + i * 0.07, 0.12, 0.1, sfxBus, { echo: true })),
    select: (t) => tone('p50', 1200, t, 0.04, 0.08, sfxBus),
    confirm: (t) => { tone('p25', freq(79), t, 0.06, 0.1, sfxBus); tone('p25', freq(91), t + 0.07, 0.14, 0.1, sfxBus); },
    pause: (t) => { tone('p50', freq(84), t, 0.06, 0.1, sfxBus); tone('p50', freq(79), t + 0.1, 0.06, 0.1, sfxBus); tone('p50', freq(84), t + 0.2, 0.1, 0.1, sfxBus); },
    bosshit: (t) => { noise(t, 0.4, 0.4, sfxBus, 'lowpass', 1500); tone('square', 300, t, 0.4, 0.12, sfxBus, { slide: 50 }); },
    boom: (t) => { noise(t, 0.9, 0.5, sfxBus, 'lowpass', 800); tone('sine', 120, t, 0.8, 0.4, sfxBus, { slide: 30 }); },
    spark: (t) => noise(t, 0.12, 0.15, sfxBus, 'bandpass', 4000, 3),
    tick: (t) => tone('p50', 1800, t, 0.02, 0.05, sfxBus),
    cannon: (t) => { tone('sine', 220, t, 0.14, 0.35, sfxBus, { slide: 70 }); noise(t, 0.1, 0.18, sfxBus, 'lowpass', 900); },
    reload: (t) => { noise(t, 0.04, 0.2, sfxBus, 'highpass', 2500); noise(t + 0.09, 0.05, 0.22, sfxBus, 'bandpass', 1800, 2); tone('p25', freq(76), t + 0.16, 0.08, 0.1, sfxBus); },
    lasercharge: (t) => tone('sine', 300, t, 0.7, 0.08, sfxBus, { slide: 1400, slideT: 0.7 }),
    laser: (t) => { tone('p12', 1760, t, 0.45, 0.1, sfxBus, { slide: 440, slideT: 0.45 }); noise(t, 0.4, 0.12, sfxBus, 'bandpass', 3000, 1); },
    swoop: (t) => tone('triangle', 900, t, 0.2, 0.12, sfxBus, { slide: 300 }),
    snort: (t) => { noise(t, 0.18, 0.2, sfxBus, 'lowpass', 600); tone('square', 120, t, 0.12, 0.06, sfxBus, { slide: 70 }); },
    zap: (t) => tone('p50', 1400, t, 0.1, 0.07, sfxBus, { slide: 700 }),
    dino: (t) => [72, 79, 76, 84].forEach((m, i) => tone('p25', freq(m), t + i * 0.07, 0.07, 0.11, sfxBus, { echo: true })),
    chomp: (t) => { noise(t, 0.08, 0.25, sfxBus, 'lowpass', 1400); tone('square', 260, t, 0.08, 0.08, sfxBus, { slide: 120 }); },
    dinocry: (t) => tone('p25', 900, t, 0.35, 0.1, sfxBus, { slide: 300 }),
    swim: (t) => { tone('sine', 380, t, 0.12, 0.08, sfxBus, { slide: 620 }); noise(t, 0.08, 0.05, sfxBus, 'bandpass', 900, 2); },
    secret: (t) => [67, 71, 74, 78, 79, 83, 86, 91].forEach((m, i) => tone('p25', freq(m), t + i * 0.06, 0.1, 0.1, sfxBus, { echo: true })),
    roar: (t) => { noise(t, 0.6, 0.35, sfxBus, 'lowpass', 500); tone('square', 110, t, 0.55, 0.12, sfxBus, { slide: 60 }); },
    bats: (t) => [93, 98, 95, 100].forEach((m, i) => tone('p12', freq(m), t + i * 0.04, 0.04, 0.07, sfxBus, { slide: freq(m) * 1.3 })),
    shock: (t) => { tone('sine', 180, t, 0.5, 0.22, sfxBus, { slide: 1800, slideT: 0.35, echo: true }); noise(t, 0.4, 0.18, sfxBus, 'bandpass', 2500, 1); tone('p25', 1500, t + 0.05, 0.25, 0.08, sfxBus, { slide: 400 }); },
    freeze: (t) => { [88, 84, 79, 76, 72].forEach((m, i) => tone('sine', freq(m), t + i * 0.05, 0.12, 0.12, sfxBus, { echo: true })); noise(t, 0.3, 0.1, sfxBus, 'highpass', 6000); },
    fireball: (t) => { noise(t, 0.18, 0.2, sfxBus, 'bandpass', 1200, 1); tone('p50', 300, t, 0.15, 0.1, sfxBus, { slide: 120 }); },
    flap: (t) => noise(t, 0.08, 0.12, sfxBus, 'lowpass', 900),
    thunder: (t) => { noise(t, 1.2, 0.45, sfxBus, 'lowpass', 300); noise(t + 0.05, 0.3, 0.25, sfxBus, 'lowpass', 1200); noise(t, 0.6, 0.5, sfxBus, 'bandpass', 520, 0.7); noise(t + 0.2, 0.8, 0.35, sfxBus, 'bandpass', 380, 0.7); },
    dig: (t) => noise(t, 0.25, 0.25, sfxBus, 'lowpass', 500),
    splash: (t) => { noise(t, 0.16, 0.28, sfxBus, 'bandpass', 1700, 0.8); noise(t + 0.03, 0.22, 0.16, sfxBus, 'bandpass', 900, 1); tone('sine', 700, t, 0.08, 0.06, sfxBus, { slide: 300 }); },
    hail: (t) => { noise(t, 0.05, 0.3, sfxBus, 'highpass', 3000); tone('p25', 1800 + Math.random() * 600, t, 0.03, 0.05, sfxBus); },
    rainbow: (t) => [72, 76, 79, 84, 88, 91].forEach((m, i) => tone('triangle', freq(m), t + i * 0.07, 0.18, 0.12, sfxBus, { echo: true })),
    spring: (t) => tone('p25', 180, t, 0.3, 0.14, sfxBus, { slide: 1100, slideT: 0.25 }),
    letter: (t) => tone('p50', 1500, t, 0.03, 0.07, sfxBus),
    map: (t) => tone('triangle', 600, t, 0.05, 0.2, sfxBus, { slide: 900 }),
  };
  function sfx(name) {
    if (!ctx || !enabled) return;
    const f = SFX[name]; if (f) f(ctx.currentTime + 0.005);
  }
  function setEnabled(v) {
    enabled = v;
    try { localStorage.setItem('wallyman-sound', v ? 'on' : 'off'); } catch (e) { /* ignore */ }
    if (master) master.gain.value = v ? 0.8 : 0;
  }
  function setVolume(kind, v) {
    v = Math.max(0, Math.min(1, Math.round(v * 5) / 5));
    if (kind === 'music') { musicVol = v; if (musicBus) musicBus.gain.value = 0.55 * v; } else { sfxVol = v; if (sfxBus) sfxBus.gain.value = 0.7 * v; }
    try { localStorage.setItem(kind === 'music' ? 'wallyman-music-vol' : 'wallyman-sfx-vol', String(v)); } catch (e) { /* ignore */ }
  }
  const getVolume = (kind) => (kind === 'music' ? musicVol : sfxVol);
  // thunder after a lightning flash. dist 0 = right overhead (a sharp crack, then a loud roll);
  // dist 1 = far away (no crack, a softer, lower roll that goes on for longer). Most of the sound sits
  // between 250 Hz and 2 kHz so phone and laptop speakers can play it; a deep layer adds weight on bigger speakers.
  function grain(t, dur, vol, type, f, q, att) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(sfxBus); s.start(t, Math.random() * 0.9); s.stop(t + dur + 0.05);
  }
  // steady weather sounds: a rain hiss (from a light patter to a downpour) and gusting wind.
  // The game sets the levels every frame; they fade smoothly and fall silent outside levels.
  let amb = null;
  function ambience(rain = 0, wind = 0) {
    if (!ctx) return;
    if (!amb) {
      if (!rain && !wind) return;
      const mk = (type, f, q) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ctx.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(sfxBus); s.start(); return { g, fl }; };
      amb = { rain: mk('bandpass', 3800, 0.5), drops: mk('bandpass', 1300, 1.2), wind: mk('bandpass', 420, 1.4) };
    }
    const now = ctx.currentTime, on = enabled ? 1 : 0;
    amb.rain.g.gain.setTargetAtTime(on * 0.16 * rain, now, 0.4);
    amb.drops.g.gain.setTargetAtTime(on * 0.07 * rain * (0.6 + Math.random() * 0.8), now, 0.05);
    const gust = wind * (0.75 + 0.25 * Math.sin(now * 1.7) + 0.15 * Math.sin(now * 4.3));
    amb.wind.g.gain.setTargetAtTime(on * 0.3 * gust, now, 0.3);
    amb.wind.fl.frequency.setTargetAtTime(320 + 260 * gust, now, 0.4);
  }
  function thunder(dist = 0.5) {
    if (!ctx || !enabled) return;
    const d = Math.max(0, Math.min(1, dist)), t = ctx.currentTime + 0.005, loud = 1 - d * 0.5, len = 1.6 + d * 1.4;
    if (d < 0.6) { // the crack: a bright snap, then a quick tearing crackle
      const c = 1 - d;
      grain(t, 0.14, 1.1 * c, 'bandpass', 2600, 0.6, 0.004);
      for (let i = 0; i < 5; i++) grain(t + 0.05 + i * (0.04 + Math.random() * 0.05), 0.12, (0.7 - i * 0.1) * c, 'bandpass', 1400 + Math.random() * 1600, 0.9, 0.006);
    }
    const centre = 700 - d * 380; // the roll: lots of overlapping bursts so it rumbles and rolls instead of hissing
    const n = 9 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      const st = t + (d < 0.6 ? 0.08 : 0) + (i / n) * len * (0.7 + Math.random() * 0.3), dur = 0.35 + Math.random() * 0.6, k = 1 - (i / n) * 0.6;
      grain(st, dur, (0.55 + Math.random() * 0.5) * loud * k, 'bandpass', centre * (0.7 + Math.random() * 0.6), 0.7, 0.03 + d * 0.12);
    }
    grain(t, len + 0.6, 0.9 * loud, 'lowpass', 160, 0.7, 0.05 + d * 0.3); // deep body for headphones and big speakers
    grain(t + len * 0.4, len * 0.8, 0.5 * loud, 'lowpass', 420, 0.7, 0.2); // a long low tail
  }
  // muffle 0..1 (underwater), intensity 0..1 (a boss is near), drums true/false (speed runs)
  function setMusicFx(o = {}) {
    mfx.muffle = Math.max(0, Math.min(1, o.muffle || 0)); mfx.intensity = Math.max(0, Math.min(1, o.intensity || 0)); mfx.drums = o.drums ? 1 : 0;
    if (ctx && muf) { const f = 650 * Math.pow(22000 / 650, 1 - mfx.muffle); muf.frequency.setTargetAtTime(f, ctx.currentTime, 0.18); }
  }
  return { setMusicFx, musicFx: () => Object.assign({}, mfx, { cutoff: muf ? Math.round(muf.frequency.value) : 0 }), addSong(n, d) { SONGS[n] = d; delete compiled[n]; if (curName === n) { cur = null; curName = null; } }, sfxNames: () => Object.keys(SFX), songStep: () => (cur && ctx ? (ctx.currentTime - t0) / cur.stepDur : -1), songs: () => Object.keys(SONGS), thunder, ambience, style: () => (modern ? 'modern' : 'retro'), setStyle(v) { modern = v === 'modern'; try { localStorage.setItem('wallyman-sound-style', modern ? 'modern' : 'retro'); } catch (e) { /* ignore */ } }, setVolume, getVolume, init, unlock: init, play, stop, sfx, setEnabled, isEnabled: () => enabled, current: () => curName };
})();
