// Synthesised sound effects (Web Audio) and a spoken battlefield announcer (speechSynthesis).
import { G } from './state.js';

let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null, comp = null;
const lastPlayed = {};
let enabled = true;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 5;
  master = ctx.createGain(); master.gain.value = 0.8;
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9;
  musicBus = ctx.createGain(); musicBus.gain.value = 0.22;
  sfxBus.connect(comp); musicBus.connect(comp); comp.connect(master); master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  let b = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b = (b + 0.02 * w) / 1.02; d[i] = w * 0.5 + b * 3; }
  startMusic();
}

export function setVolume(v) { if (master) master.gain.value = v; enabled = v > 0; }

function vol(x, z) {
  if (x === undefined) return 1;
  const d = Math.hypot(G.camera.x - x, G.camera.z - z);
  const zoom = 1 - Math.min(0.6, (G.camera.dist - 30) / 150);
  return Math.max(0, 1 - d / 110) * zoom;
}
function pan(x) {
  if (x === undefined || !ctx.createStereoPanner) return null;
  const p = ctx.createStereoPanner();
  const dx = x - G.camera.x;
  p.pan.value = Math.max(-0.8, Math.min(0.8, dx / 50 * Math.cos(G.camera.yaw)));
  return p;
}
function out(x, gain) {
  const g = ctx.createGain(); g.gain.value = gain;
  const p = pan(x);
  if (p) { g.connect(p); p.connect(sfxBus); } else g.connect(sfxBus);
  return g;
}
function noise(dest, t0, dur, type, freq, q = 1, endFreq) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
  if (endFreq) f.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
  const g = ctx.createGain();
  s.connect(f); f.connect(g); g.connect(dest);
  s.start(t0, Math.random() * 1.5); s.stop(t0 + dur + 0.05);
  return g.gain;
}
function tone(dest, t0, dur, type, f0, f1, gain = 1) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t0);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + dur + 0.02);
}
function env(param, t0, a, peak, dec) {
  param.setValueAtTime(0.0001, t0); param.linearRampToValueAtTime(peak, t0 + a); param.exponentialRampToValueAtTime(0.0001, t0 + a + dec);
}

const SOUNDS = {
  rifle(o, t) { env(noise(o, t, 0.12, 'bandpass', 1800, 0.8), t, 0.002, 0.7, 0.1); tone(o, t, 0.05, 'square', 300, 90, 0.15); },
  mg(o, t) { env(noise(o, t, 0.08, 'bandpass', 1400, 0.9), t, 0.002, 0.6, 0.07); },
  sniper(o, t) { env(noise(o, t, 0.5, 'highpass', 900, 0.5), t, 0.002, 1.0, 0.45); tone(o, t, 0.2, 'sawtooth', 900, 100, 0.25); },
  cannon(o, t) { env(noise(o, t, 0.6, 'lowpass', 1200, 0.7, 200), t, 0.003, 1.2, 0.55); tone(o, t, 0.35, 'sine', 120, 40, 0.9); },
  bigcannon(o, t) { env(noise(o, t, 0.9, 'lowpass', 900, 0.7, 120), t, 0.003, 1.4, 0.8); tone(o, t, 0.5, 'sine', 90, 30, 1.1); },
  arty(o, t) { env(noise(o, t, 1.2, 'lowpass', 700, 0.6, 90), t, 0.004, 1.5, 1.1); tone(o, t, 0.7, 'sine', 70, 25, 1.2); },
  rocket(o, t) { env(noise(o, t, 0.8, 'bandpass', 600, 1.5, 2500), t, 0.05, 0.8, 0.7); },
  beam(o, t) { tone(o, t, 0.6, 'sawtooth', 1600, 120, 0.4); tone(o, t, 0.5, 'square', 400, 60, 0.25); env(noise(o, t, 0.4, 'highpass', 3000), t, 0.01, 0.4, 0.35); },
  flame(o, t) { env(noise(o, t, 0.3, 'lowpass', 900, 0.5), t, 0.03, 0.35, 0.25); },
  build(o, t) { for (let i = 0; i < 6; i++) { env(noise(o, t + i * 0.12, 0.08, 'bandpass', 2500 + Math.random() * 2000, 4), t + i * 0.12, 0.002, 0.3, 0.07); } tone(o, t, 0.6, 'square', 160, 320, 0.08); },
  sell(o, t) { tone(o, t, 0.12, 'square', 880, 0, 0.12); tone(o, t + 0.12, 0.2, 'square', 660, 0, 0.12); },
  ready(o, t) { tone(o, t, 0.12, 'sine', 660, 0, 0.3); tone(o, t + 0.13, 0.2, 'sine', 990, 0, 0.3); },
  click(o, t) { tone(o, t, 0.05, 'square', 1200, 600, 0.08); },
  ack(o, t) { tone(o, t, 0.06, 'square', 700 + Math.random() * 200, 0, 0.08); tone(o, t + 0.07, 0.06, 'square', 900 + Math.random() * 200, 0, 0.08); },
  error(o, t) { tone(o, t, 0.25, 'sawtooth', 140, 110, 0.2); },
  beep(o, t) { for (let i = 0; i < 3; i++) tone(o, t + i * 0.18, 0.08, 'square', 1800, 0, 0.12); },
  promote(o, t) { tone(o, t, 0.1, 'triangle', 523, 0, 0.3); tone(o, t + 0.1, 0.1, 'triangle', 659, 0, 0.3); tone(o, t + 0.2, 0.25, 'triangle', 784, 0, 0.3); },
  zap(o, t) { tone(o, t, 0.9, 'sawtooth', 2400, 60, 0.35); tone(o, t + 0.05, 0.7, 'square', 180, 40, 0.25); env(noise(o, t, 0.8, 'bandpass', 4000, 3), t, 0.005, 0.5, 0.7); },
  scream(o, t) { tone(o, t, 0.35, 'sawtooth', 500 + Math.random() * 200, 250, 0.06); },
};

export function play(name, x, z) {
  if (!ctx || !enabled) return;
  const now = ctx.currentTime;
  const min = { mg: 0.05, rifle: 0.04, flame: 0.08, scream: 0.15 }[name] ?? 0.03;
  if (lastPlayed[name] && now - lastPlayed[name] < min) return;
  lastPlayed[name] = now;
  const v = vol(x, z);
  if (v <= 0.02) return;
  const fn = SOUNDS[name]; if (!fn) return;
  fn(out(x, v * 0.6), now);
}

export function explosion(x, z, size = 1) {
  if (!ctx || !enabled) return;
  const now = ctx.currentTime;
  if (lastPlayed.ex && now - lastPlayed.ex < 0.04) return;
  lastPlayed.ex = now;
  const v = vol(x, z) * Math.min(1.4, 0.5 + size * 0.4);
  if (v <= 0.02) return;
  const o = out(x, v);
  const dur = 0.8 + size * 0.7;
  env(noise(o, now, dur, 'lowpass', 2200, 0.7, 60), now, 0.004, 1.3, dur);
  env(noise(o, now, 0.25, 'highpass', 1500, 0.5), now, 0.002, 0.6, 0.2);
  tone(o, now, 0.6 + size * 0.3, 'sine', 80 / Math.sqrt(size), 22, 1.4);
  // crackle tail
  for (let i = 0; i < 4 * size; i++) { const t = now + 0.15 + Math.random() * dur * 0.8; env(noise(o, t, 0.05, 'bandpass', 1000 + Math.random() * 3000, 2), t, 0.002, 0.25, 0.05); }
}

// ---------------- announcer ----------------
const spoken = {};
let voice = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return null;
  const vs = speechSynthesis.getVoices();
  return vs.find(v => /en-GB/i.test(v.lang) && /female|libby|sonia|serena|kate|hazel/i.test(v.name)) || vs.find(v => /en-GB/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
}
export function announce(text, faction, cooldown = 4) {
  if (faction && faction !== G.player) return;
  const now = performance.now() / 1000;
  if (spoken[text] && now - spoken[text] < cooldown) return;
  spoken[text] = now;
  G.ui?.message(text);
  if (!enabled || !('speechSynthesis' in window)) return;
  try {
    if (speechSynthesis.speaking && speechSynthesis.pending) return;
    if (!voice) voice = pickVoice();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.rate = 1.05; u.pitch = 0.85; u.volume = 0.9;
    speechSynthesis.speak(u);
  } catch { /* ignore */ }
}
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { voice = pickVoice(); };

// ---------------- procedural battle music ----------------
let musicOn = true;
export function toggleMusic() { musicOn = !musicOn; if (musicBus) musicBus.gain.value = musicOn ? 0.22 : 0; return musicOn; }
// Dynamic: the score follows the fighting. intensity 0 = calm (sparse drums and a soft pad),
// ~0.5 = the normal battle loop, 1 = all-out war (double hats, fills, lead arpeggio, more drive).
let target = 0.15, level = 0.15;
export function setIntensity(x) { target = Math.max(0, Math.min(1, x)); }
export function musicLevel() { return level; }
// short victory / defeat phrase over the top of the music
export function sting(win) {
  if (!ctx || !musicOn) return;
  const mtof = n => 440 * Math.pow(2, (n - 69) / 12), t0 = ctx.currentTime + 0.1;
  const notes = win ? [[57, 0], [61, 0.18], [64, 0.36], [69, 0.54], [73, 0.54], [76, 0.54]] : [[57, 0], [56, 0.3], [55, 0.6], [53, 0.9], [48, 0.9]];
  for (const [n, d] of notes) { tone(musicBus, t0 + d, win && d === 0.54 ? 1.6 : 0.5, 'square', mtof(n), 0, 0.08); tone(musicBus, t0 + d, 0.5, 'sawtooth', mtof(n - 12), 0, 0.06); }
}
function startMusic() {
  // a driving minor-key loop: kick, snare, hats, bass line and a synth stab
  const bpm = 112, beat = 60 / bpm;
  const bassNotes = [45, 45, 48, 45, 43, 43, 41, 43]; // A2 C3 G2 F2
  const stab = [[57, 60, 64], [57, 60, 64], [55, 59, 62], [53, 57, 60]];
  const mtof = n => 440 * Math.pow(2, (n - 69) / 12);
  let next = ctx.currentTime + 0.5, step = 0;
  function schedule() {
    // rise quickly when fighting starts, calm down slowly
    level += (target - level) * (target > level ? 0.25 : 0.03);
    const L = level, calm = L < 0.28, war = L > 0.62;
    while (next < ctx.currentTime + 0.4) {
      const t = next, s = step % 16, bar = Math.floor(step / 16) % 8;
      const chord = stab[(bar / 2 | 0) % 4];
      if (calm ? s === 0 || s === 8 : s % 4 === 0) tone(musicBus, t, 0.35, 'sine', 120, 38, calm ? 0.7 : 1.1);           // kick
      if (war && (s === 14 || s === 7)) tone(musicBus, t, 0.25, 'sine', 120, 38, 0.8);                                  // extra kicks
      if (!calm && s % 8 === 4) env(noise(musicBus, t, 0.2, 'bandpass', 1800, 0.7), t, 0.002, 0.5, 0.18);               // snare
      if (war && bar === 7 && s >= 12) env(noise(musicBus, t, 0.12, 'bandpass', 2000, 0.7), t, 0.002, 0.25 + (s - 12) * 0.08, 0.1); // fill
      if (!calm && (war || s % 2 === 1)) env(noise(musicBus, t, 0.05, 'highpass', 7000, 0.7), t, 0.001, war && s % 2 === 0 ? 0.1 : 0.18, 0.04); // hats
      if (calm ? s % 8 === 0 : s % 2 === 0) {
        const n = bassNotes[(Math.floor(step / 4)) % 8] - 12;
        tone(musicBus, t, calm ? beat * 1.6 : beat * 0.45, calm ? 'triangle' : 'sawtooth', mtof(n), 0, calm ? 0.2 : war ? 0.26 : 0.22);
      }
      if (calm && s === 0 && bar % 2 === 0) for (const n of chord) tone(musicBus, t, beat * 7, 'sine', mtof(n), 0, 0.05); // soft pad
      if (!calm && s === 0 && bar % 2 === 0) for (const n of chord) tone(musicBus, t, beat * 1.6, 'square', mtof(n), 0, 0.045);
      if (!calm && s === 10 && bar % 4 === 3) for (const n of chord) tone(musicBus, t, beat * 0.5, 'square', mtof(n + 12), 0, 0.04);
      if (war && s % 2 === 0) tone(musicBus, t, beat * 0.4, 'square', mtof(chord[(step / 2) % 3] + 24), 0, 0.022);      // lead arpeggio
      next += beat / 4; step++;
    }
  }
  setInterval(schedule, 100);
}

export const sfx = { play, explosion };
