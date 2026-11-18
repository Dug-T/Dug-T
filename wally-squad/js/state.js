// Shared mutable game state. Every module imports G and reads/writes it.
export const G = {
  three: null,       // { renderer, scene, camera, composer, sun, ... }
  time: 0,           // game seconds
  dt: 0,
  speed: 1,
  paused: true,
  started: false,
  over: false,
  difficulty: 'normal',
  player: 'wally',
  enemy: 'grim',
  units: [],
  buildings: [],
  projectiles: [],
  nextId: 1,
  players: {},       // faction id -> { credits, power, drain, queues, ... }
  selection: [],
  groups: {},
  placing: null,     // building type being placed
  mode: null,        // 'sell' | 'repair' | null
  camera: { x: 0, z: 0, dist: 70, yaw: 0, shake: 0 },
  mouse: { x: 0, y: 0, ground: null, inside: false },
  stats: { built: 0, lost: 0, killed: 0, harvested: 0 },
  cfg: { mode: 'skirmish', map: 'valley', faction: 'wally', difficulty: 'normal' },
  sightMult: 1, speedMult: 1,
};

// game-time timers (respect pause and game speed)
const timers = [];
export function later(sec, fn) { timers.push({ t: G.time + sec, fn }); }
export function runTimers() {
  for (let i = timers.length - 1; i >= 0; i--) if (timers[i].t <= G.time) { const f = timers[i].fn; timers.splice(i, 1); f(); }
}
// tiny event bus (kills, pickups, ...) used by survival scoring and achievements
const listeners = {};
export function on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); }
export function emit(ev, ...a) { for (const fn of listeners[ev] || []) fn(...a); }
export function nextId() { return G.nextId++; }

// ---------- deterministic random + noise ----------
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rand = Math.random;
// Simulation RNG: seeded so that multiplayer clients stay in lockstep. Use only for game logic.
let simRng = mulberry32(12345);
export function seedSim(seed) { simRng = mulberry32(seed >>> 0); }
export const srand = () => simRng();
export const srr = (a, b) => a + simRng() * (b - a);
export const rr = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// 2D value-gradient noise (simplex-ish via hashed gradients)
const perm = new Uint8Array(512);
(function () {
  const r = mulberry32(1337);
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
})();
function grad(h, x, y) {
  switch (h & 7) {
    case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y;
    case 4: return x; case 5: return -x; case 6: return y; default: return -y;
  }
}
const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
export function noise2(x, y) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
  x -= Math.floor(x); y -= Math.floor(y);
  const u = fade(x), v = fade(y);
  const a = perm[X] + Y, b = perm[X + 1] + Y;
  return lerp(lerp(grad(perm[a], x, y), grad(perm[b], x - 1, y), u),
              lerp(grad(perm[a + 1], x, y - 1), grad(perm[b + 1], x - 1, y - 1), u), v) * 0.7;
}
export function fbm(x, y, oct = 4) {
  let s = 0, a = 1, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += noise2(x * f, y * f) * a; n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}
