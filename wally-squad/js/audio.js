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
  pipes(o, t) { tone(o, t, 1.1, 'sawtooth', 110, 110, 0.07); for (const [d, f] of [[0, 659], [0.22, 740], [0.44, 880], [0.7, 740]]) { tone(o, t + d, 0.24, 'sawtooth', f, f, 0.08); tone(o, t + d, 0.03, 'sawtooth', f * 1.78, f * 1.78, 0.06); } },
  wardrum(o, t) { for (const d of [0, 0.18, 0.36, 0.72]) tone(o, t + d, 0.3, 'sine', 120, 45, 0.5); },
  bite(o, t) { env(noise(o, t, 0.12, 'bandpass', 900, 2), t, 0.002, 0.5, 0.1); tone(o, t, 0.25, 'sawtooth', 160, 90, 0.18); },
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
// Twelve tunes, played in random order. Each tune has its own tempo, key, chord progressions, drum style,
// bass line, lead melody and arpeggios, arranged into sections:
// intro · verse · chorus · breakdown · verse · chorus (about a minute and a half). The arrangement also
// follows the fighting: calm = stripped back, battle = full band, war = extra drums, doubled lead.
let musicOn = true;
// briefly turn the music down so a spoken line can be heard clearly
let duckTimer = 0;
export function duckMusic(sec) {
  if (!ctx || !musicBus || !musicOn) return;
  const t = ctx.currentTime;
  musicBus.gain.cancelScheduledValues(t);
  musicBus.gain.setTargetAtTime(0.06, t, 0.08);
  clearTimeout(duckTimer);
  duckTimer = setTimeout(() => { if (musicOn && musicBus) musicBus.gain.setTargetAtTime(0.22, ctx.currentTime, 0.4); }, sec * 1000);
}
export function toggleMusic() { musicOn = !musicOn; if (musicBus) musicBus.gain.value = musicOn ? 0.22 : 0; return musicOn; }
let target = 0.15, level = 0.15;
export function setIntensity(x) { target = Math.max(0, Math.min(1, x)); }
export function musicLevel() { return level; }
const mtof = n => 440 * Math.pow(2, (n - 69) / 12);

// short victory / defeat phrase over the top of the music
export function sting(win) {
  if (!ctx || !musicOn) return;
  const t0 = ctx.currentTime + 0.1;
  const notes = win ? [[57, 0], [61, 0.18], [64, 0.36], [69, 0.54], [73, 0.54], [76, 0.54]] : [[57, 0], [56, 0.3], [55, 0.6], [53, 0.9], [48, 0.9]];
  for (const [n, d] of notes) { tone(musicBus, t0 + d, win && d === 0.54 ? 1.6 : 0.5, 'square', mtof(n), 0, 0.08); tone(musicBus, t0 + d, 0.5, 'sawtooth', mtof(n - 12), 0, 0.06); }
}

// chords: [root midi note, 'm' minor | 'M' major] one per bar
const TRACKS = [
  { name: 'Wally Squad Assemble', bpm: 128, key: 57, minor: true, drums: 'rock', bass: 'eighth', lead: 'square', arp: true,
    verse: [[57, 'm'], [53, 'M'], [48, 'M'], [55, 'M']], chorus: [[53, 'M'], [55, 'M'], [57, 'm'], [57, 'm']], seed: 11 },
  { name: 'Grimlock Rising', bpm: 140, key: 50, minor: true, drums: 'four', bass: 'octave', lead: 'saw', arp: false,
    verse: [[50, 'm'], [50, 'm'], [46, 'M'], [45, 'M']], chorus: [[46, 'M'], [48, 'M'], [50, 'm'], [45, 'M']], seed: 23 },
  { name: 'Crystal Rush', bpm: 168, key: 52, minor: true, drums: 'dnb', bass: 'synco', lead: 'pluck', arp: true,
    verse: [[52, 'm'], [48, 'M'], [55, 'M'], [50, 'M']], chorus: [[48, 'M'], [50, 'M'], [52, 'm'], [52, 'm']], seed: 37 },
  { name: 'Steel Thunder', bpm: 112, key: 55, minor: true, drums: 'half', bass: 'gallop', lead: 'saw', arp: false,
    verse: [[55, 'm'], [55, 'm'], [51, 'M'], [53, 'M']], chorus: [[51, 'M'], [53, 'M'], [55, 'm'], [50, 'M']], seed: 41 },
  { name: 'Lava Run', bpm: 150, key: 54, minor: true, drums: 'four', bass: 'gallop', lead: 'square', arp: true,
    verse: [[54, 'm'], [50, 'M'], [52, 'M'], [49, 'M']], chorus: [[50, 'M'], [52, 'M'], [54, 'm'], [54, 'm']], seed: 53 },
  { name: 'Victory Road', bpm: 134, key: 48, minor: false, drums: 'march', bass: 'octave', lead: 'square', arp: true,
    verse: [[48, 'M'], [55, 'M'], [57, 'm'], [53, 'M']], chorus: [[53, 'M'], [55, 'M'], [48, 'M'], [48, 'M']], seed: 67 },
  { name: 'Neon Commander', bpm: 104, key: 57, minor: true, drums: 'rock', bass: 'pulse', lead: 'saw', arp: true,
    verse: [[57, 'm'], [53, 'M'], [48, 'M'], [55, 'M']], chorus: [[53, 'M'], [48, 'M'], [55, 'M'], [57, 'm']], seed: 71 },
  { name: 'Pixel Platoon', bpm: 152, key: 48, minor: false, drums: 'chip', bass: 'pulse', lead: 'chip', arp: true,
    verse: [[48, 'M'], [57, 'm'], [53, 'M'], [55, 'M']], chorus: [[53, 'M'], [55, 'M'], [52, 'm'], [57, 'm']], seed: 79 },
  { name: 'Skank Tank', bpm: 160, key: 55, minor: false, drums: 'ska', bass: 'walk', lead: 'brass', arp: false, skank: true,
    verse: [[55, 'M'], [48, 'M'], [50, 'M'], [48, 'M']], chorus: [[48, 'M'], [50, 'M'], [55, 'M'], [52, 'm']], seed: 83 },
  { name: 'Iron Grimlock', bpm: 176, key: 52, minor: true, drums: 'metal', bass: 'gallop', lead: 'saw', arp: false,
    verse: [[52, 'm'], [48, 'M'], [50, 'M'], [47, 'M']], chorus: [[48, 'M'], [50, 'M'], [52, 'm'], [47, 'M']], seed: 89 },
  { name: 'Funky Harvester', bpm: 108, key: 52, minor: true, drums: 'funk', bass: 'funk', lead: 'pluck', arp: false, skank: true,
    verse: [[52, 'm'], [57, 'M'], [52, 'm'], [57, 'M']], chorus: [[55, 'M'], [57, 'M'], [59, 'm'], [59, 'm']], seed: 97 },
  { name: 'Highland Charge', bpm: 112, key: 57, minor: false, drums: 'march', bass: 'drone', lead: 'pipes', arp: false,
    verse: [[57, 'M'], [55, 'M'], [57, 'M'], [52, 'm']], chorus: [[55, 'M'], [57, 'M'], [55, 'M'], [57, 'M']], seed: 107 },
  { name: 'Desert Shuffle', bpm: 122, key: 57, minor: false, drums: 'shuffle', bass: 'walk', lead: 'square', arp: false,
    verse: [[57, 'M'], [50, 'M'], [57, 'M'], [52, 'M']], chorus: [[50, 'M'], [50, 'M'], [57, 'M'], [52, 'M']], seed: 101 },
];
// song layout in bars
const SECTIONS = [['intro', 4], ['verse', 8], ['chorus', 8], ['break', 4], ['verse', 8], ['chorus', 8]];
const SONG_BARS = SECTIONS.reduce((a, s) => a + s[1], 0);
const sectionAt = bar => { let b = bar, i = 0; for (const [n, l] of SECTIONS) { if (b < l) return { name: n, bar: b, len: l, i }; b -= l; i++; } return { name: 'chorus', bar: 0, len: 8, i: SECTIONS.length - 1 }; };

// a catchy 2-bar melody per tune (fixed per tune so it is recognisable), built from the pentatonic
// scale with chord tones on the strong beats
const RHYTHMS = [
  [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0],
  [1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0],
  [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0],
];
function seeded(seed) { let s = seed * 9301 + 49297; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }
function buildMelody(tr) {
  const r = seeded(tr.seed);
  const pent = tr.minor ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9];
  const rhythm = RHYTHMS[Math.floor(r() * RHYTHMS.length)];
  const notes = [];
  let deg = 2 + Math.floor(r() * 3); // index into a 2-octave pentatonic ladder
  const ladder = []; for (let o = 0; o < 3; o++) for (const p of pent) ladder.push(tr.key + 12 + o * 12 + p - 12);
  for (let s = 0; s < 32; s++) {
    if (!rhythm[s]) { notes.push(null); continue; }
    if (s % 8 === 0) deg = Math.max(2, Math.min(ladder.length - 3, deg + (r() < 0.5 ? -2 : 2)));
    else deg = Math.max(1, Math.min(ladder.length - 2, deg + [-2, -1, -1, 1, 1, 2][Math.floor(r() * 6)]));
    let len = 1; while (s + len < 32 && !rhythm[s + len] && len < 4) len++;
    notes.push({ n: ladder[deg] + 12, len });
  }
  if (notes[30] === null && notes[28] === null) notes[28] = { n: tr.key + 24, len: 4 }; // resolve home at the end
  return notes;
}

// ---- voices
let pump, leadIn, delay, fb, wet, musicStarted = false;
// a bagpipe chanter note: bright and reedy, with a quick grace note flicked in front of it
function pipeNote(t, dur, n, gain) {
  synth(leadIn, t, 0.035, 'sawtooth', mtof(n + 10), gain * 0.9, 5200, 5000, 2, 0.002);
  synth(leadIn, t + 0.03, Math.max(0.08, dur - 0.03), 'sawtooth', mtof(n), gain * 1.1, 5200, 4200, 3, 0.004);
  synth(leadIn, t + 0.03, Math.max(0.08, dur - 0.03), 'square', mtof(n + 12), gain * 0.25, 6000, 5000, 0, 0.004);
}
function synth(dest, t, dur, type, freq, gain, cutoff = 2400, cutEnd = 600, detune = 7, attack = 0.005) {
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 2.5;
  f.frequency.setValueAtTime(cutoff, t); f.frequency.exponentialRampToValueAtTime(Math.max(80, cutEnd), t + Math.max(0.05, dur));
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.setValueAtTime(gain, t + Math.max(attack, dur * 0.6)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  for (const d of detune ? [-detune, detune] : [0]) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = d; o.connect(f); o.start(t); o.stop(t + dur + 0.05); }
  f.connect(g); g.connect(dest);
}
const kick = (t, v = 1) => {
  tone(musicBus, t, 0.4, 'sine', 150, 40, 1.2 * v);
  env(noise(musicBus, t, 0.02, 'highpass', 3000), t, 0.001, 0.25 * v, 0.02);
  pump.gain.cancelScheduledValues(t); pump.gain.setValueAtTime(0.45, t); pump.gain.linearRampToValueAtTime(1, t + 0.22); // sidechain pump
};
const snare = (t, v = 1) => { env(noise(musicBus, t, 0.22, 'bandpass', 1900, 0.8), t, 0.002, 0.55 * v, 0.2); tone(musicBus, t, 0.12, 'triangle', 220, 160, 0.3 * v); };
const hat = (t, v = 1, open = false) => env(noise(pump, t, open ? 0.3 : 0.05, 'highpass', 8000, 0.7), t, 0.001, 0.16 * v, open ? 0.25 : 0.04);
const tom = (t, f) => tone(musicBus, t, 0.3, 'sine', f, f * 0.55, 0.7);
const crash = t => env(noise(musicBus, t, 1.8, 'highpass', 5000, 0.5), t, 0.002, 0.3, 1.6);

let tr = null, melody = null, verseMelody = null, step = 0, next = 0, lastIdx = -1, onTrack = null;
export function onTrackChange(fn) { onTrack = fn; }
export function currentTrack() { return tr ? tr.name : ''; }
function pickTrack(force) {
  let i; do { i = Math.floor(Math.random() * TRACKS.length); } while (i === lastIdx && TRACKS.length > 1);
  if (force !== undefined) i = force;
  lastIdx = i; tr = TRACKS[i]; melody = buildMelody(tr); verseMelody = buildMelody({ ...tr, seed: tr.seed * 7 + 3 }); step = 0;
  if (delay) delay.delayTime.setValueAtTime(60 / tr.bpm * 0.75, ctx.currentTime);
  onTrack?.(tr.name);
}
// skip to another random tune (starts on the next beat)
export function nextTrack() { if (!ctx) return ''; pickTrack(); next = ctx.currentTime + 0.15; return tr.name; }

function startMusic() {
  if (musicStarted) return; musicStarted = true;
  pump = ctx.createGain(); pump.connect(musicBus);
  leadIn = ctx.createGain(); leadIn.gain.value = 1; leadIn.connect(pump);
  delay = ctx.createDelay(1.5); fb = ctx.createGain(); fb.gain.value = 0.3; wet = ctx.createGain(); wet.gain.value = 0.32;
  leadIn.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(pump);
  pickTrack();
  next = ctx.currentTime + 0.4;
  setInterval(schedule, 90);
}

function schedule() {
  level += (target - level) * (target > level ? 0.25 : 0.03);
  const L = level, calm = L < 0.28, war = L > 0.62;
  while (next < ctx.currentTime + 0.35) {
    const t = next, sixteenth = 60 / tr.bpm / 4, beat = sixteenth * 4;
    const s = step % 16, bar = Math.floor(step / 16);
    if (bar >= SONG_BARS) { pickTrack(); continue; }
    const sec = sectionAt(bar);
    const prog = sec.name === 'chorus' ? tr.chorus : tr.verse;
    const lift = sec.name === 'chorus' && sec.i === SECTIONS.length - 1 ? 2 : 0; // final chorus goes up a key
    const [root0, q] = prog[bar % 4], root = root0 + lift;
    const chord = [root, root + (q === 'm' ? 3 : 4), root + 7];
    const intro = sec.name === 'intro', brk = sec.name === 'break', chorus = sec.name === 'chorus';
    const lastBarOfSection = sec.bar === sec.len - 1;
    const full = !calm && !intro && !brk;

    // ---- drums
    if (s === 0 && sec.bar === 0 && (chorus || sec.name === 'verse')) crash(t);
    const d = tr.drums;
    const kickHit = d === 'four' ? s % 4 === 0 : d === 'dnb' ? s === 0 || s === 10 : d === 'half' ? s === 0 || s === 7 || (s === 10 && chorus) : d === 'march' ? s % 8 === 0 || s === 6
      : d === 'metal' ? (war || chorus ? s % 2 === 0 : s % 4 === 0 || s === 6) : d === 'funk' ? s === 0 || s === 3 || s === 10 : d === 'shuffle' ? s === 0 || s === 8 || s === 11 : d === 'ska' || d === 'chip' ? s === 0 || s === 8 : s === 0 || s === 8 || s === 10;
    const snareHit = d === 'half' ? s === 8 : s === 4 || s === 12;
    const swing = d === 'shuffle' && s % 2 === 1 ? sixteenth * 0.33 : 0; // shuffle: late off-beats
    if (lastBarOfSection && s >= 12 && !calm && !intro) { if (s % 2 === 0 || war) tom(t, [200, 170, 140, 110][(s - 12)] || 120); }
    else {
      if (kickHit && (!calm || s === 0) && !(brk && s !== 0)) kick(t, calm ? 0.7 : 1);
      if (war && (s === 14 || s === 3) && !brk) kick(t, 0.7);
      if (snareHit && full) snare(t);
      if (d === 'march' && full && (s === 14 || s === 15)) snare(t, 0.35);
      if (d === 'dnb' && full && (s === 7 || s === 15)) snare(t, 0.25); // ghost notes
      if (d === 'funk' && full && (s === 7 || s === 9 || s === 15)) snare(t, 0.2);
      if (!brk && (intro || !calm) && (war ? true : d === 'dnb' || d === 'funk' || d === 'metal' ? s % 2 === 0 || d === 'funk' : d === 'shuffle' ? s % 4 === 0 || s % 4 === 3 : s % 2 === 1)) hat(t + swing, s % 4 === 2 ? 1 : 0.6, (d === 'four' || d === 'ska') && s % 4 === 2 && full);
      if (calm && s % 4 === 2) hat(t, 0.4);
    }

    // ---- bass
    const bn = root - 24;
    const b = tr.bass;
    const bassHit = calm || brk ? s === 0 : b === 'eighth' || b === 'octave' ? s % 2 === 0 : b === 'gallop' ? [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15].includes(s)
      : b === 'pulse' ? true : b === 'walk' ? s % 4 === 0 : b === 'funk' ? [0, 3, 6, 7, 10, 13, 14].includes(s) : [0, 3, 6, 10, 12].includes(s);
    if (b === 'drone') { // bagpipe drones: one low note held under everything, retuned every bar
      if (s === 0) { synth(pump, t, beat * 4.1, 'sawtooth', mtof(tr.key - 24), 0.07, 1400, 1300, 2, 0.05); synth(pump, t, beat * 4.1, 'sawtooth', mtof(tr.key - 12), 0.05, 1800, 1700, 3, 0.05); }
    } else if (bassHit && !intro) {
      // walking bass climbs root - third - fifth - sixth; funk pops up the octave
      let n = b === 'octave' && s % 4 === 2 ? bn + 12 : bn;
      if (b === 'walk' && !calm && !brk) n = bn + [0, q === 'm' ? 3 : 4, 7, 9][s / 4];
      if (b === 'funk' && !calm && (s === 7 || s === 14)) n = bn + 12;
      const len = calm || brk ? beat * 3.5 : sixteenth * (b === 'gallop' || b === 'pulse' ? 0.9 : b === 'walk' ? 3.6 : 1.8);
      synth(pump, t + swing, len, calm ? 'triangle' : tr.drums === 'chip' ? 'square' : 'sawtooth', mtof(n), calm ? 0.22 : 0.2, calm ? 600 : war ? 1600 : 1100, 160, 4);
    }

    // ---- pads / stabs
    if (s === 0 && (calm || brk || intro || chorus)) for (const n of chord) synth(pump, t, beat * 3.8, 'sawtooth', mtof(n), calm || brk ? 0.035 : 0.03, 1200, 500, 12, 0.25);
    if (tr.skank && full && s % 4 === 2) for (const n of chord) synth(pump, t + swing, sixteenth * 0.8, 'square', mtof(n + 12), 0.03, 3600, 1200, 4); // off-beat 'skank' chords
    else if (full && !chorus && (s === 0 || s === 6 || s === 12) && tr.drums !== 'dnb') for (const n of chord) synth(pump, t, sixteenth * 1.5, 'square', mtof(n + 12), 0.025, 3000, 900, 5);

    // ---- arpeggio (verses, battle and war)
    if (tr.arp && !calm && (sec.name === 'verse' || (war && chorus)) ) {
      const an = chord[[0, 1, 2, 1][s % 4]] + 12 + (s % 8 >= 4 ? 12 : 0);
      synth(leadIn, t, sixteenth * 0.9, 'square', mtof(an), 0.035, 3800, 700, 3);
    }

    // ---- verse melody: a second, quieter tune in the second half of each verse
    if (sec.name === 'verse' && sec.bar >= 4 && !calm && !tr.arp) {
      const m = verseMelody[(bar % 2) * 16 + s];
      if (m && tr.lead === 'pipes') pipeNote(t + swing, sixteenth * m.len * 0.9, m.n + lift, 0.05);
      else if (m) synth(leadIn, t + swing, sixteenth * m.len * 0.9, tr.lead === 'chip' ? 'square' : 'triangle', mtof(m.n - 12 + lift), 0.05, 2600, 900, tr.lead === 'chip' ? 0 : 5);
    }
    // ---- lead melody (choruses always; quieter while calm; doubled an octave up in war)
    if (chorus || (brk && sec.bar >= 2)) {
      const m0 = melody[(bar % 2) * 16 + s], m = m0 && { ...m0, n: m0.n + lift };
      if (m) {
        const g = calm ? 0.05 : 0.075, len = sixteenth * m.len * 0.95;
        if (tr.lead === 'pipes') pipeNote(t + swing, len, m.n, g);
        const ty = tr.lead === 'saw' || tr.lead === 'brass' ? 'sawtooth' : 'square';
        if (tr.lead !== 'pipes') synth(leadIn, t + swing, len, ty, mtof(m.n), g, tr.lead === 'pluck' ? 4500 : tr.lead === 'brass' ? 2200 : 3200, tr.lead === 'pluck' ? 500 : 1500, tr.lead === 'chip' ? 0 : tr.lead === 'brass' ? 10 : 6, tr.lead === 'brass' ? 0.04 : 0.005);
        if (tr.lead === 'brass') synth(leadIn, t + swing, len, 'sawtooth', mtof(m.n - 12), g * 0.6, 1600, 900, 8, 0.04); // brass section an octave below
        if (war) synth(leadIn, t, len, 'sawtooth', mtof(m.n + 12), 0.03, 4000, 1500, 9);
      }
    }
    next += sixteenth; step++;
  }
}

export const sfx = { play, explosion };
// testing aid: jump to a bar of the current tune
export function _seekBar(bar) { step = bar * 16; }
