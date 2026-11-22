// Battle replays. The simulation is deterministic (seeded random numbers), so a replay only needs
// the starting settings, the random seed, the length of every simulation step and every command
// that was carried out. Playing it back re-runs the same battle exactly.
import { G } from './state.js';
import { VERSION } from './version.js';

const KEY = 'ws_replay';
const Q = 2000; // step lengths are stored in 1/2000ths of a second
export const REPLAY_MODES = ['skirmish', 'survival', 'campaign'];

const rec = { on: false, cfg: null, seed: 0, steps: [], cmds: [] };
const play = { on: false, steps: null, cmds: null, i: 0, ci: 0, speed: 1 };

export const isRecording = () => rec.on;
export const isReplaying = () => play.on;

export function startRecording(cfg, seed, extra = {}) {
  rec.on = REPLAY_MODES.includes(cfg.mode);
  rec.cfg = { ...cfg, ...extra }; rec.seed = seed; rec.steps = []; rec.cmds = [];
}
export function stopRecording() { rec.on = false; }

// called at the start of every simulation step; returns the (rounded) step length to use
export function recordStep(dt) {
  const q = Math.max(0, Math.min(65535, Math.round(dt * Q)));
  if (rec.on) rec.steps.push(q);
  return q / Q;
}
// called whenever a command is carried out
export function recordCommand(c) {
  if (rec.on) rec.cmds.push([rec.steps.length, JSON.parse(JSON.stringify(c))]);
}

const toB64 = arr => { const u8 = new Uint8Array(new Uint16Array(arr).buffer); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = b => { const s = atob(b), u8 = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i); return Array.from(new Uint16Array(u8.buffer)); };

export function saveReplay(result) {
  if (!rec.on || rec.steps.length < 20) return false;
  const data = { v: VERSION, date: new Date().toISOString(), cfg: rec.cfg, seed: rec.seed, steps: toB64(rec.steps), cmds: rec.cmds, result, length: G.time };
  try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch { return false; }
}
export function loadReplay() {
  try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!d) return null; return d; } catch { return null; }
}
export function replayInfo() {
  const d = loadReplay(); if (!d) return null;
  return { version: d.v, date: d.date, mode: d.cfg.mode, map: d.cfg.map, result: d.result, length: d.length, sameVersion: d.v === VERSION };
}

// ---- playback
export function beginPlayback(d) {
  play.on = true; play.steps = fromB64(d.steps); play.cmds = d.cmds; play.i = 0; play.ci = 0; play.speed = 1; play.total = d.length || 0;
}
export const playback = play;
// run up to `budget` seconds of recorded steps (at the chosen speed). execute(c) carries out commands.
export function advance(real, simStep, execute) {
  if (!play.on || G.paused) return;
  let budget = real * play.speed;
  while (budget > 0 && play.i < play.steps.length) {
    while (play.ci < play.cmds.length && play.cmds[play.ci][0] <= play.i) execute(play.cmds[play.ci++][1]);
    const dt = play.steps[play.i++] / Q;
    simStep(dt);
    budget -= dt || 0.001;
  }
  if (play.i >= play.steps.length) play.done = true;
}
