'use strict';
// Tiny 16-bit-style sound engine: pulse-wave lead, triangle bass, noise drums,
// plus an echo send for that warm SNES "reverb". All music here is original.
const Audio8 = (() => {
  let ctx = null, master, musicBus, sfxBus, echoIn, noiseBuf, waves = {};
  let enabled = true, musicVol = 1, sfxVol = 1;
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
    musicBus = ctx.createGain(); musicBus.gain.value = 0.55 * musicVol; musicBus.connect(master);
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
    setInterval(tick, 25);
  }

  function tone(wave, f, t, dur, vol, bus, o = {}) {
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
      if (s.drums) for (let st = 0; st < bar; st++) { const d = s.drums[st % s.drums.length]; if (d && d !== '.') ev.push({ s: b0 + st, c: 'drum', d }); }
    });
    ev.sort((a, b) => a.s - b.s);
    return { ev, total: Math.max(step, chords.length * bar), stepDur: 60 / s.bpm / 4, swing: s.swing || 0, lead: s.lead, once: !!s.once };
  }
  const compiled = {};
  let cur = null, curName = null, idx = 0, loopN = 0, t0 = 0;

  function playEvent(e, t, sd) {
    const dur = e.l * sd;
    if (e.c === 'lead') tone(cur.lead, freq(e.m), t, dur * 0.92, 0.16, musicBus, { vib: true, echo: true, release: 0.06 });
    else if (e.c === 'bass') tone('triangle', freq(e.m), t, dur * 0.85, 0.42, musicBus, { release: 0.03 });
    else if (e.c === 'harm') tone('p50', freq(e.m), t, dur * 0.8, 0.035, musicBus, { echo: true, decay: 0.3 });
    else if (e.c === 'pad') tone('triangle', freq(e.m), t, dur, 0.07, musicBus, { attack: 0.15, release: 0.2, echo: true });
    else if (e.c === 'arp') tone('p25', freq(e.m), t, dur * 0.7, 0.04, musicBus, { echo: true, decay: 0.2 });
    else if (e.c === 'drum') drum(e.d, t);
  }
  function tick() {
    if (!cur || !ctx) return;
    const ahead = ctx.currentTime + 0.15;
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
    cur = compiled[name]; curName = name; idx = 0; loopN = 0; t0 = ctx.currentTime + 0.06;
  }
  function stop() {
    cur = null; curName = null;
    if (!ctx) return;
    // fade out lingering notes quickly by swapping the music bus
    const old = musicBus; old.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    setTimeout(() => old.disconnect(), 400);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.55 * musicVol; musicBus.connect(master);
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
  return { setVolume, getVolume, init, unlock: init, play, stop, sfx, setEnabled, isEnabled: () => enabled, current: () => curName };
})();
