// Wally Theft Auto: game bootstrap, loop, camera, police, pickups, HUD and missions.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { buildCity, N, P, HALF, ROAD, LANE, ISLAND, KERB, roadC, blockMin, blockMax } from './city.js';
import { Car, TrafficAI, PoliceAI, randomType, DIRS, validDir } from './vehicles.js';
import { PedManager, Ped } from './peds.js';
import { Player } from './player.js';
import { Audio } from './audio.js';
import { MISSIONS, missionStartPoint } from './missions.js';
import { smokeTexture, rng, signTexture } from './textures.js';
import { VERSION, CHANGES } from './version.js';
import { WEAPONS, buildNeep, buildWeaponModel } from './weapons.js';

const $ = (id) => document.getElementById(id);
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');

// ---------------- settings & save ----------------
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};
let quality = store.get('wta-quality', isTouch ? 'low' : 'high');

// ---------------- renderer ----------------
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 2600);
scene.fog = new THREE.Fog('#c9d6e3', 120, 520);

// sky dome
const skyU = {
  top: { value: new THREE.Color('#3a6fc0') }, horizon: { value: new THREE.Color('#cfe0f0') }, bottom: { value: new THREE.Color('#2a4a60') },
  sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color('#fff2cc') }, night: { value: 0 }, time: { value: 0 },
};
const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), new THREE.ShaderMaterial({
  uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform vec3 top, horizon, bottom, sunCol, sunDir; uniform float night, time; varying vec3 vP;
    float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y); }
    float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int k = 0; k < 5; k++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
    void main(){ vec3 d = normalize(vP); float h = d.y;
      vec3 c = h > 0.0 ? mix(horizon, top, pow(h, 0.55)) : mix(horizon, bottom, pow(-h, 0.4));
      float s = max(dot(d, normalize(sunDir)), 0.0);
      c += sunCol * (pow(s, 900.0) * 6.0 + pow(s, 12.0) * 0.35 * (1.0 - night));
      vec3 md = normalize(-sunDir); float m = max(dot(d, md), 0.0); c += vec3(0.85,0.9,1.0) * pow(m, 1400.0) * 3.0 * night;
      if (h > 0.0) { // drifting clouds, lit by the sun
        vec2 cp = d.xz / (d.y + 0.12) * 1.6 + vec2(time * 0.012, time * 0.004);
        float cl = smoothstep(0.52, 0.78, fbm(cp)) * smoothstep(0.0, 0.18, h);
        vec3 cc = mix(vec3(1.0, 0.98, 0.95), sunCol * 0.9 + 0.1, 0.35) * (1.0 - night * 0.85) + vec3(0.04, 0.05, 0.08) * night;
        c = mix(c, cc * (0.75 + 0.25 * fbm(cp * 2.0 + 3.0)), cl * 0.9);
      }
      if (h > 0.0 && night > 0.0) { vec2 g = floor(d.xz / (d.y + 0.3) * 260.0); float st = step(0.9965, h21(g)); c += vec3(st) * night * smoothstep(0.0, 0.3, h); }
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}));
sky.renderOrder = -1;
scene.add(sky);

const hemi = new THREE.HemisphereLight('#cfe3ff', '#5b5348', 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff1d6', 2.6);
sun.castShadow = true;
sun.shadow.camera.left = -75; sun.shadow.camera.right = 75; sun.shadow.camera.top = 75; sun.shadow.camera.bottom = -75;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 600;
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
const headlight = new THREE.SpotLight('#fff3d6', 0, 70, 0.55, 0.5, 1.2);
scene.add(headlight, headlight.target);
const flashLight = new THREE.PointLight('#ffaa55', 0, 40, 1.6);
scene.add(flashLight);

let composer = null, bloom = null;
function applyQuality() {
  const hi = quality === 'high';
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, hi ? 2 : 1.25));
  sun.shadow.mapSize.set(hi ? 2048 : 1024, hi ? 2048 : 1024);
  if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  if (hi && !composer) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.35, 0.5, 0.88);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    // gentle colour grade: a touch more contrast and colour, darker corners
    composer.addPass(new ShaderPass({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
        void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb;
          float l = dot(c, vec3(0.299, 0.587, 0.114));
          c = mix(vec3(l), c, 1.12);
          c = (c - 0.5) * 1.06 + 0.5;
          vec2 q = vUv - 0.5; c *= 1.0 - dot(q, q) * 0.55;
          gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }`,
    }));
  }
  for (const id of ['gfx', 'gfx2']) $(id).textContent = 'GRAPHICS: ' + quality.toUpperCase();
  resize();
}
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
}
window.addEventListener('resize', resize);

// ---------------- world ----------------
const world = buildCity(scene, quality);
const audio = new Audio();
const player = new Player(scene);
const peds = new PedManager(scene, world);
const cars = [];

// particles
const smokeTex = smokeTexture();
const particles = [];
function puff(x, y, z, o = {}) {
  let p = particles.find((q) => !q.alive);
  if (!p) {
    if (particles.length > 220) return;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, fog: true }));
    p = { s, alive: false }; particles.push(p); scene.add(s);
  }
  p.alive = true; p.t = 0; p.life = o.life || 1.5;
  p.s.position.set(x, y, z); p.s.visible = true;
  p.vx = o.vx ?? (Math.random() - 0.5) * 0.8; p.vy = o.vy ?? 1.5; p.vz = o.vz ?? (Math.random() - 0.5) * 0.8;
  p.size0 = o.size || 1; p.grow = o.grow ?? 2;
  p.s.material.color.set(o.color || '#888');
  p.s.material.blending = o.add ? THREE.AdditiveBlending : THREE.NormalBlending;
  p.op = o.opacity ?? 0.7;
}
function updateParticles(dt) {
  for (const p of particles) {
    if (!p.alive) continue;
    p.t += dt;
    if (p.t >= p.life) { p.alive = false; p.s.visible = false; continue; }
    const k = p.t / p.life;
    p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt;
    p.s.scale.setScalar(p.size0 * (1 + k * p.grow));
    p.s.material.opacity = p.op * (1 - k);
  }
}
// tracers
const tracers = [];
function tracer(a, b, col = '#7fe8ff') {
  const g = new THREE.BufferGeometry().setFromPoints([a, b]);
  const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 1 }));
  scene.add(l); tracers.push({ l, t: 0.09 });
}

// ---------------- game state ----------------
const cam = { yaw: Math.PI, pitch: -0.18, dist: 4.6, far: false, lastLook: 0, shake: 0 };
const game = {
  world, player, peds, cars, audio, cam, night: 0, time: 10 * 60, // minutes since midnight
  stats: { kills: 0, cars: 0, flights: 0, specs: 0, busted: 0, wasted: 0 },
  wanted: null, alarm: null, alarmT: 0, mission: null, missionIdx: 0, markers: [], blips: [], specs: [], pickups: [],
  playing: false, paused: false,
};

// ----- wanted level -----
game.wanted = {
  heat: 0, level: 0, unseen: 0, seen: false,
  add(h) { this.heat = Math.min(30, this.heat + h); this.recalc(); this.unseen = 0; },
  recalc() { const t = [1, 3, 6, 10, 15]; let l = 0; for (const x of t) if (this.heat >= x) l++; this.level = l; },
  clear() { this.heat = 0; this.level = 0; },
  update(dt) {
    if (this.level === 0) return;
    // seen by any cop?
    const px = player.x, pz = player.z;
    this.seen = false;
    for (const c of cars) if (c.type === 'police' && c.ai && !c.dead && Math.hypot(c.x - px, c.z - pz) < 55 && !world.blocked(c.x, c.z, px, pz, 1.2)) { this.seen = true; break; }
    if (!this.seen) for (const p of peds.list) if (p.cop && p.state !== 'dead' && Math.hypot(p.x - px, p.z - pz) < 40) { this.seen = true; break; }
    if (this.seen) this.unseen = 0; else this.unseen += dt;
    if (this.unseen > 9) { this.heat = Math.max(0, this.heat - dt * 1.2); this.recalc(); }
  },
};

// ---------------- helpers used by other modules ----------------
game.toast = (txt) => { const t = $('toast'); t.textContent = txt; t.style.opacity = 1; clearTimeout(game._toastT); game._toastT = setTimeout(() => (t.style.opacity = 0), 3800); };
game.bigText = (h, p = '', dur = 2.5, bad = false) => {
  const b = $('big'); b.querySelector('h1').textContent = h; b.querySelector('h1').className = bad ? 'bad' : ''; b.querySelector('p').textContent = p;
  b.style.opacity = 1; clearTimeout(game._bigT); game._bigT = setTimeout(() => (b.style.opacity = 0), dur * 1000);
};
const fmtObj = (s) => s.replace(/~([yrbw])~/g, (m, c) => c === 'w' ? '</span><span>' : `</span><span class="${c}">`);
game.objective = (txt) => { if (game._obj === txt) return; game._obj = txt; $('objective').innerHTML = txt ? '<span>' + fmtObj(txt) + '</span>' : ''; };
game.timer = (t) => { const e = $('timer'); if (t == null) { e.classList.add('hidden'); return; } e.classList.remove('hidden'); const s = Math.max(0, Math.ceil(t)); e.textContent = `⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; e.style.color = s < 10 ? '#ff5a5a' : '#fff'; };
let subsQ = [], subsT = 0;
game.subs = (lines) => { subsQ = lines.slice(); subsT = 0; };
const bubbles = [];
game.say = (ped, text) => {
  if (bubbles.length > 3) return;
  const el = document.createElement('div'); el.className = 'bubble'; el.textContent = text; $('bubbles').appendChild(el);
  bubbles.push({ el, ped, t: 3.2 });
};
game.addSign = (text, bg, fg, x, z, ry = Math.PI) => {
  const tex = signTexture(text, bg, fg);
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.25), new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.35, side: THREE.DoubleSide }));
  board.position.y = 3.2; g.add(board);
  for (const sx of [-2.2, 2.2]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.2, 10), new THREE.MeshStandardMaterial({ color: '#3b3f44', metalness: 0.6, roughness: 0.4 })); p.position.set(sx, 1.6 + KERB, 0); p.castShadow = true; g.add(p); }
  g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g); return g;
};
game.removeCar = (c) => removeCar(c);
game.spawnCar = (type, x, z, heading, o = {}) => { const c = new Car(scene, type, o.paint, x, z, heading); cars.push(c); return c; };
game.spawnPed = (x, z, o = {}) => { const p = new Ped(scene, x, z, o); peds.list.push(p); return p; };

// markers
const markerTex = (() => {
  const c = document.createElement('canvas'); c.width = 4; c.height = 64; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,1)');
  x.fillStyle = g; x.fillRect(0, 0, 4, 64); const t = new THREE.CanvasTexture(c); return t;
})();
const MCOL = { mission: '#ffd23f', dest: '#ffd23f', check: '#ff4fb8', ghost: '#ff4fb8', pickup: '#5fe36a' };
game.marker = (x, z, type = 'dest', r = 3, y = null) => {
  const g = new THREE.Group();
  const col = MCOL[type] || '#fff';
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 2.2, 40, 1, true), new THREE.MeshBasicMaterial({ color: col, map: markerTex, transparent: true, opacity: type === 'ghost' ? 0.2 : 0.45, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  cyl.position.y = 1.1; g.add(cyl);
  if (type !== 'ghost') {
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.4, 4), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.8 }));
    arrow.rotation.x = Math.PI; arrow.position.y = 5; g.add(arrow); g.userData.arrow = arrow;
  }
  const gy = y != null ? y : world.groundHeight(x, z, 0.5);
  g.position.set(x, gy, z);
  scene.add(g);
  const m = { x, z, y: gy, r, type, obj: g };
  game.markers.push(m);
  return m;
};
game.inMarker = (m, x, z) => m && Math.hypot(m.x - x, m.z - z) < m.r;
game.clearMarkers = () => { for (const m of game.markers) if (m.type !== 'mission') scene.remove(m.obj); game.markers = game.markers.filter((m) => m.type === 'mission'); };
game.blip = (obj, kind, only) => { if (only && game.blips.some((b) => b.obj === obj)) return; game.blips.push({ obj, kind }); };
game.clearBlips = () => { game.blips = []; };

// ---------------- traffic ----------------
const maxTraffic = () => (quality === 'high' ? 22 : 13);
function spawnTraffic(type) {
  const px = player.x, pz = player.z;
  for (let tries = 0; tries < 10; tries++) {
    const i = Math.floor(Math.random() * (N + 1)), j = Math.floor(Math.random() * (N + 1));
    const [nx, nz] = [roadC(i), roadC(j)];
    const d = Math.hypot(nx - px, nz - pz);
    if (d < 95 || d > 175) continue;
    const dirs = DIRS.filter((q) => validDir(i, j, q));
    const dd = dirs[(Math.random() * dirs.length) | 0];
    const ai = type === 'police' ? null : null;
    const t = type || randomType();
    const tmpAI = new TrafficAI({ x: 0, z: 0 }, i, j, dd);
    const [sx, sz] = tmpAI.path[0];
    if (cars.some((c) => Math.hypot(c.x - sx, c.z - sz) < 8)) continue;
    const car = game.spawnCar(t, sx, sz, Math.atan2(dd[0], dd[1]));
    car.ai = t === 'police' ? new PoliceAI(car, i, j, dd) : new TrafficAI(car, i, j, dd);
    car.driver = t === 'police' ? 'cop' : 'ai';
    car.vx = dd[0] * 8; car.vz = dd[1] * 8;
    return car;
  }
  return null;
}
function spawnParked() {
  const px = player.x, pz = player.z;
  for (let tries = 0; tries < 8; tries++) {
    const bx = Math.floor(Math.random() * N), bz = Math.floor(Math.random() * N);
    const b = world.blocks[bx * N + bz];
    const side = (Math.random() * 4) | 0;
    const t = 0.2 + Math.random() * 0.6;
    let x, z, h;
    const off = 1.4;
    if (side === 0) { x = b.x0 + (b.x1 - b.x0) * t; z = b.z0 - off - 0.2; h = -Math.PI / 2; }       // north kerb, traffic heading -X on the left
    else if (side === 1) { x = b.x0 + (b.x1 - b.x0) * t; z = b.z1 + off + 0.2; h = Math.PI / 2; }
    else if (side === 2) { x = b.x0 - off - 0.2; z = b.z0 + (b.z1 - b.z0) * t; h = 0; }
    else { x = b.x1 + off + 0.2; z = b.z0 + (b.z1 - b.z0) * t; h = Math.PI; }
    const d = Math.hypot(x - px, z - pz);
    if (d < 45 || d > 150) continue;
    if (cars.some((c) => Math.hypot(c.x - x, c.z - z) < 7)) continue;
    const r = Math.random();
    const type = r < 0.15 ? 'sports' : (r < 0.3 ? 'van' : (r < 0.6 ? 'hatch' : 'saloon'));
    const c = game.spawnCar(type, x, z, h); c.parked = true; return c;
  }
}
function spawnPolice() {
  const c = spawnTraffic('police');
  if (c) c.sirenOn = true;
  return c;
}
function removeCar(c) { c.remove(); const i = cars.indexOf(c); if (i >= 0) cars.splice(i, 1); }

// ---------------- collectibles & pickups ----------------
function buildSpecsMesh() {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: '#ffcc33', metalness: 1, roughness: 0.2, emissive: '#aa7700', emissiveIntensity: 0.5 });
  for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 10, 24), gold); r.position.x = s * 0.28; g.add(r); }
  const br = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.05), gold); g.add(br);
  return g;
}
const PICK = {
  health: { col: '#ff4040', icon: '❤' }, armour: { col: '#4aa3ff', icon: '🛡' }, cash: { col: '#5fe36a', icon: '$' }, ammo: { col: '#58e0ff', icon: '⚡' },
};
const ringMat = new THREE.MeshStandardMaterial({ color: '#ffd23f', emissive: '#ffb300', emissiveIntensity: 1.4, roughness: 0.3 });
function makePickupMesh(kind, weapon) {
  const g = new THREE.Group();
  if (kind === 'weapon') {
    const w = buildWeaponModel(weapon);
    if (weapon === 'club') { w.scale.setScalar(1.1); w.rotation.z = 1.1; w.position.set(-0.35, -0.35, 0); }
    else if (weapon === 'neep') w.scale.setScalar(3.2);
    else { w.scale.multiplyScalar(3.2); w.position.z = -0.3; }
    g.add(w);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.035, 8, 40), ringMat);
    ring.rotation.x = Math.PI / 2; ring.position.y = -0.75; g.add(ring); g.userData.ring = ring;
    return g;
  }
  const m = new THREE.MeshStandardMaterial({ color: PICK[kind].col, emissive: PICK[kind].col, emissiveIntensity: 0.6, roughness: 0.3 });
  let mesh;
  if (kind === 'health') { mesh = new THREE.Group(); const a = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.22), m), b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), m); mesh.add(a, b); }
  else if (kind === 'armour') mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.1, 6), m), mesh.rotation.x = Math.PI / 2;
  else if (kind === 'cash') mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.32), m);
  else mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 14), m);
  g.add(mesh);
  return g;
}
function addPickup(kind, x, z, o = {}) {
  const g = makePickupMesh(kind, o.weapon); const y = (o.y ?? world.groundHeight(x, z, 1)) + 0.9;
  g.position.set(x, y, z); scene.add(g);
  const p = { kind, weapon: o.weapon, x, y, z, obj: g, amount: o.amount, respawn: o.respawn, home: [x, z], t: Math.random() * 6, gone: 0 };
  game.pickups.push(p); return p;
}

function setupCollectibles(save) {
  const r = rng(424242);
  const spots = world.specSpots.slice();
  // shuffle deterministic
  for (let i = spots.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [spots[i], spots[j]] = [spots[j], spots[i]]; }
  const chosen = spots.slice(0, 20);
  chosen.forEach((s, i) => {
    if (save.specs && save.specs.includes(i)) return;
    const m = buildSpecsMesh(); const y = (s[2] != null ? s[2] : KERB) + 1.1;
    m.position.set(s[0], y, s[1]); scene.add(m);
    game.specs.push({ id: i, x: s[0], y, z: s[1], obj: m });
  });
  // pickups: parks and around town
  world.pickupsSpots.forEach(([x, z], i) => addPickup(['health', 'armour', 'cash', 'ammo'][i % 4], x + 6, z + 6, { respawn: 60 }));
  const h = world.specials.home, hos = world.specials.hospital, pol = world.specials.police;
  addPickup('health', h.x + 6, h.z, { respawn: 45 });
  addPickup('armour', pol.x - 10, pol.z, { respawn: 90 });
  addPickup('health', hos.x - 6, hos.z, { respawn: 30 });
  addPickup('ammo', h.x - 8, h.z, { respawn: 45 });
  scatterWeapons(26);
}
// weapons dropped at random spots on the pavements, different every time you play
function scatterWeapons(n) {
  const kinds = ['club', 'club', 'blaster', 'blaster', 'blaster', 'scatter', 'scatter', 'neep', 'neep'];
  for (let k = 0, tries = 0; k < n && tries < n * 8; tries++) {
    const b = world.blocks[(Math.random() * world.blocks.length) | 0];
    const L = world.paveLoop(b), t = 0.1 + Math.random() * 0.8, side = (Math.random() * 4) | 0;
    const x = side < 2 ? L.x0 + (L.x1 - L.x0) * t : (side === 2 ? L.x0 : L.x1);
    const z = side >= 2 ? L.z0 + (L.z1 - L.z0) * t : (side === 0 ? L.z0 : L.z1);
    if (game.pickups.some((p) => Math.hypot(p.x - x, p.z - z) < 20)) continue;
    k++;
    addPickup('weapon', x, z, { weapon: kinds[(Math.random() * kinds.length) | 0], respawn: 90 });
  }
}

// ---------------- combat ----------------
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
function raySphere(o, d, c, r) {
  const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z;
  const b = ox * d.x + oy * d.y + oz * d.z, cc = ox * ox + oy * oy + oz * oz - r * r, disc = b * b - cc;
  if (disc < 0) return -1; const t = -b - Math.sqrt(disc); return t;
}
// fire a ranged weapon (W from weapons.js): one ray per pellet with a little spread
game.playerShoot = (W = WEAPONS.blaster) => {
  if (W.pellets > 1) { audio.bang(); audio.noise(0.3, 600, 0.7); cam.shake = Math.max(cam.shake, 0.12); } else audio.zap();
  const origin = camera.position.clone();
  const aim = new THREE.Vector3(); camera.getWorldDirection(aim);
  const minT = origin.distanceTo(tmpV.set(player.x, player.y + 1.4, player.z)) + 0.5;
  const model = player.models[player.weapon] || player.blaster;
  const muzzle = model.localToWorld(player.blaster.userData.muzzle.clone());
  puff(muzzle.x, muzzle.y, muzzle.z, { color: W.pellets > 1 ? '#ffd27a' : '#9ff', add: true, life: 0.12, size: W.pellets > 1 ? 0.7 : 0.4, grow: 1, vy: 0, opacity: 1 });
  game.raiseAlarm(player.x, player.z, 1.5);
  for (let k = 0; k < W.pellets; k++) {
    const dir = aim.clone();
    if (W.spread) { dir.x += (Math.random() - 0.5) * W.spread * 2; dir.y += (Math.random() - 0.5) * W.spread * 2; dir.z += (Math.random() - 0.5) * W.spread * 2; dir.normalize(); }
    let best = W.range, hit = null;
    for (let t = minT; t < best; t += 0.8) {
      const x = origin.x + dir.x * t, y = origin.y + dir.y * t, z = origin.z + dir.z * t;
      if (y < 0) { best = t; hit = { kind: 'ground' }; break; }
      let blocked = false;
      for (const b of world.nearby(x, z, 0.1)) if (!b.circle && y < b.h && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) { blocked = true; break; }
      if (blocked) { best = t; hit = { kind: 'wall' }; break; }
    }
    for (const p of peds.list) {
      if (p.state === 'dead') continue;
      const t = raySphere(origin, dir, tmpV2.set(p.x, p.y + 1.05, p.z), 0.5);
      if (t > minT && t < best) { best = t; hit = { kind: 'ped', p }; }
    }
    for (const c of cars) {
      if (c === player.car) continue;
      for (const [cx, cz] of c.circles()) {
        const t = raySphere(origin, dir, tmpV2.set(cx, c.y + 0.8, cz), c.radius);
        if (t > minT && t < best) { best = t; hit = { kind: 'car', c }; }
      }
    }
    const end = origin.clone().addScaledVector(dir, best);
    tracer(muzzle, end, W.pellets > 1 ? '#ffd27a' : '#7fe8ff');
    if (!hit) continue;
    if (hit.kind === 'ped') {
      const p = hit.p;
      p.hurt(W.dmg, game, player.x, player.z, 'shot');
      puff(end.x, end.y, end.z, { color: '#ff3030', life: 0.4, size: 0.4, opacity: 0.9 });
      if (p.cop) game.wanted.add(1.5 / W.pellets * 1.5); else if (!p.thug) game.wanted.add(0.4 / Math.sqrt(W.pellets));
    } else if (hit.kind === 'car') {
      hit.c.damage(W.dmg * 2, game, 'shot');
      puff(end.x, end.y, end.z, { color: '#ffd080', add: true, life: 0.2, size: 0.5, opacity: 1 });
      if (hit.c.ai instanceof TrafficAI) hit.c.ai.panic = 6;
      if (hit.c.type === 'police') game.wanted.add(1 / W.pellets * 1.5);
    } else puff(end.x, end.y, end.z, { color: '#ccc', life: 0.5, size: 0.5 });
  }
};
// lob a neep grenade: it bounces, fizzes, then goes off
const neeps = [];
game.throwNeep = () => {
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const hand = player.h.arms[1].grip.localToWorld(new THREE.Vector3());
  const m = buildNeep(0.11); m.position.copy(hand); scene.add(m);
  const sp = 15;
  neeps.push({ m, x: hand.x, y: hand.y, z: hand.z, vx: dir.x * sp + player.vx, vy: dir.y * sp + 5, vz: dir.z * sp + player.vz, t: 2.2 });
  audio.tone(500, 0.15, 'triangle', 0.08, -300);
};
function updateNeeps(dt) {
  for (let i = neeps.length - 1; i >= 0; i--) {
    const n = neeps[i];
    n.t -= dt; n.vy -= 18 * dt;
    n.x += n.vx * dt; n.y += n.vy * dt; n.z += n.vz * dt;
    const c = world.collide(n.x, n.z, 0.12, n.y);
    if (c.hit) { n.x = c.x; n.z = c.z; const vn = n.vx * c.nx + n.vz * c.nz; n.vx -= 1.6 * vn * c.nx; n.vz -= 1.6 * vn * c.nz; }
    const g = world.groundHeight(n.x, n.z, n.y + 0.3) + 0.11;
    if (n.y < g) { n.y = g; n.vy = Math.abs(n.vy) * 0.4; n.vx *= 0.6; n.vz *= 0.6; }
    n.m.position.set(n.x, n.y, n.z); n.m.rotation.x += dt * 8; n.m.rotation.z += dt * 5;
    if (Math.random() < dt * 20) puff(n.x, n.y + 0.15, n.z, { color: '#ffcf40', add: true, life: 0.25, size: 0.2, vy: 0.5, opacity: 1 });
    if (n.t <= 0) {
      scene.remove(n.m); neeps.splice(i, 1);
      game.onExplosion(n.x, n.y, n.z, null);
      game.wanted.add(1);
    }
  }
}
game.playerPunch = (weapon = 'fists') => {
  const fx = Math.sin(player.heading), fz = Math.cos(player.heading);
  const sup = player.superPunch > 0;
  const club = weapon === 'club', reach = sup ? 2.6 : (club ? WEAPONS.club.range : 1.6);
  let any = false;
  for (const p of peds.list) {
    if (p.state === 'dead') continue;
    const dx = p.x - player.x, dz = p.z - player.z, d = Math.hypot(dx, dz);
    if (d < reach && (dx * fx + dz * fz) / (d || 1) > 0.3) {
      any = true;
      if (sup) { p.vx = fx * 18; p.vz = fz * 18; p.vy = 9; p.state = 'tumble'; p.hurt(30, game, player.x, player.z, 'car'); }
      else p.hurt(club ? WEAPONS.club.dmg : 22, game, player.x, player.z, 'punch');
      if (p.cop) game.wanted.add(2); else if (!p.thug) game.wanted.add(0.5);
    }
  }
  for (const c of cars) {
    if (c.dead) continue;
    for (const [cx, cz] of c.circles()) {
      const dx = cx - player.x, dz = cz - player.z, d = Math.hypot(dx, dz);
      if (d < c.radius + (sup ? 1.6 : (club ? 1.4 : 0.9)) && (dx * fx + dz * fz) / (d || 1) > 0.2) {
        any = true;
        if (sup) { c.vx += fx * 28; c.vz += fz * 28; c.damage(650, game); game.bigText('KA-WALLOP!', '', 1); cam.shake = 0.6; }
        else c.damage(club ? 60 : 15, game);
        if (c.ai) c.ai.panic = 5;
        break;
      }
    }
  }
  if (any && club) audio.tone(900, 0.12, 'square', 0.12, -500);
  if (any) { audio.punch(); if (sup) { player.superPunch = 0; audio.boom(); } }
  else audio.tone(180, 0.08, 'triangle', 0.05, -60);
};
game.npcShoot = (ped, tx, tz) => {
  audio.bang();
  const d = Math.hypot(tx - ped.x, tz - ped.z);
  const moving = player.car ? player.car.speed > 8 : player.speed > 3;
  const chance = 0.62 - d * 0.013 - (moving ? 0.2 : 0);
  const from = new THREE.Vector3(ped.x, ped.y + 1.4, ped.z);
  const to = new THREE.Vector3(tx + (Math.random() - 0.5) * 2, (player.car ? player.car.y : player.y) + 1 + (Math.random() - 0.5), tz + (Math.random() - 0.5) * 2);
  tracer(from, to, '#ffcf60');
  if (Math.random() < chance) {
    if (player.car) player.car.damage(35, game, 'shot');
    else game.hurtPlayer(ped.thug ? 6 : 8, 'shot');
  }
};
game.raiseAlarm = (x, z, t = 4) => { game.alarm = [x, z]; game.alarmT = t; };
game.onPedKilled = (p, kind) => {
  game.stats.kills++;
  if (Math.random() < 0.7) addPickup('cash', p.x, p.z, { amount: 10 + ((Math.random() * 40) | 0) });
  if (p.thug) return;
  game.wanted.add(p.cop ? 4 : 1.2);
};
game.onCarImpact = (car, v) => {
  const d = Math.hypot(car.x - player.x, car.z - player.z);
  if (d < 40) audio.crash(v * (1 - d / 40));
  if (car === player.car) cam.shake = Math.min(0.5, v * 0.03);
};
game.onExplosion = (x, y, z, src) => {
  const d = Math.hypot(x - player.x, z - player.z);
  if (d < 120) audio.boom();
  flashLight.position.set(x, y + 1, z); flashLight.intensity = 400;
  for (let i = 0; i < 26; i++) puff(x, y, z, { color: i < 12 ? '#ffb030' : '#ff6010', add: true, life: 0.6 + Math.random() * 0.5, size: 2 + Math.random() * 2, vx: (Math.random() - 0.5) * 10, vy: Math.random() * 8, vz: (Math.random() - 0.5) * 10, opacity: 1, grow: 1.5 });
  for (let i = 0; i < 16; i++) puff(x, y + 1, z, { color: '#2a2a2a', life: 2.5 + Math.random() * 2, size: 2.5, vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 3, vz: (Math.random() - 0.5) * 4, opacity: 0.8, grow: 3 });
  if (d < 60) cam.shake = Math.max(cam.shake, 0.8 * (1 - d / 60));
  if (src === player.car) { game.hurtPlayer(999, 'boom'); }
  else if (!player.car && d < 8) game.hurtPlayer((8 - d) * 12, 'boom');
  for (const p of peds.list) { const pd = Math.hypot(p.x - x, p.z - z); if (pd < 8 && p.state !== 'dead') { p.vx = (p.x - x) / pd * 10; p.vz = (p.z - z) / pd * 10; p.vy = 7; p.state = 'tumble'; p.hurt(200, game, x, z, 'car'); } }
  for (const c of cars) { if (c === src || c.dead) continue; const cd = Math.hypot(c.x - x, c.z - z); if (cd < 9) { c.damage((9 - cd) * 140, game); c.vx += (c.x - x) / cd * 6; c.vz += (c.z - z) / cd * 6; } }
  if (src && src.type === 'police') game.wanted.add(4);
};
game.hurtPlayer = (amt, cause, silent) => {
  if (player.dead) return;
  if (player.armour > 0 && cause !== 'drown' && cause !== 'boom') { const a = Math.min(player.armour, amt); player.armour -= a; amt -= a; }
  player.health -= amt;
  if (!silent) { $('damage').style.opacity = 0.7; setTimeout(() => ($('damage').style.opacity = 0), 160); }
  if (player.health <= 0) die(cause);
};
const DEATHS = { fall: 'Gravity: 1, Wally: 0', drown: 'Wally Man can\'t swim. Never could.', boom: 'Well done.', shot: 'Turns out the cape isn\'t bulletproof.', car: 'Look both ways, hero.', faceplant: 'Death by pavement.' };
function die(cause) {
  player.dead = true; player.health = 0;
  if (player.car) exitCar(true);
  game.stats.wasted++;
  audio.fail();
  game.bigText('HOPELESS!', DEATHS[cause] || 'Wally Man is down.', 4, true);
  failMission();
  setTimeout(() => respawn('hospital'), 4200);
}
game.bust = () => {
  if (player.dead || game.busting || game.wanted.level === 0) return;
  game.busting = true; game.stats.busted++;
  audio.fail();
  if (player.car) exitCar(true);
  game.bigText('NICKED!', 'You have the right to remain hopeless.', 4, true);
  player.loseWeapons();
  failMission();
  player.dead = true;
  setTimeout(() => { respawn('police'); game.busting = false; }, 4200);
};
function respawn(where) {
  const s = world.specials[where] || world.specials.hospital;
  player.dead = false; player.health = 100; player.armour = 0;
  player.money = Math.max(0, player.money - 100);
  player.place(s.x, s.z - 0.2, Math.PI);
  player.h.root.rotation.set(0, Math.PI, 0);
  game.wanted.clear();
  for (const p of peds.list.slice()) if (p.cop) { p.remove(); peds.list.splice(peds.list.indexOf(p), 1); }
  for (const c of cars.slice()) if (c.type === 'police' && c.ai) removeCar(c);
  cam.yaw = Math.PI;
  save();
}

// ---------------- cars: enter / exit ----------------
function enterCar() {
  if (player.car || player.dead) return;
  let best = null, bd = 3.8;
  for (const c of cars) { if (c.dead) continue; const d = Math.hypot(c.x - player.x, c.z - player.z) - c.T.len * 0.3; if (d < bd) { bd = d; best = c; } }
  if (!best) return;
  const c = best;
  if (c.health <= 0) { game.toast('That one\'s on fire, Wally.'); return; }
  if (c.driver === 'ai' || c.driver === 'cop') {
    const [dx, dz] = c.doorPos();
    const p = game.spawnPed(dx, dz, { cop: c.driver === 'cop' });
    if (c.driver === 'cop') { p.aggro = true; game.wanted.add(3); }
    else {
      p.state = 'flee'; p.fleeT = 8; p.fleeFrom = [player.x, player.z];
      game.say(p, ['Ma motor!', 'Wally, ya thief!', 'I only just washed that!', 'Ye cannae just TAKE it!'][(Math.random() * 4) | 0]);
      if (nearCop(40)) game.wanted.add(2); else if (Math.random() < 0.3) game.wanted.add(1);
    }
  } else if (c.type === 'police') game.wanted.add(nearCop(60) ? 3 : 1);
  c.driver = 'player'; c.ai = null; c.parked = false; c.sirenOn = false;
  player.car = c; game.stats.cars++;
  audio.door(); audio.init();
  const vn = $('vehName'); vn.textContent = c.name; vn.style.opacity = 1; setTimeout(() => (vn.style.opacity = 0), 2500);
  showRadio();
}
function exitCar(force) {
  const c = player.car; if (!c) return;
  if (!force && c.speed > 9) { // bail out!
    player.vx = c.vx * 0.5; player.vz = c.vz * 0.5;
    game.hurtPlayer(8, 'car');
  } else { player.vx = 0; player.vz = 0; }
  let [x, z] = c.doorPos();
  const col = world.collide(x, z, 0.4, 0); x = col.x; z = col.z;
  player.place(x, z, c.heading);
  c.driver = null; c.input = { throttle: 0, steer: 0, brake: false, hand: false };
  player.car = null;
  audio.door();
}
function nearCop(r) {
  for (const c of cars) if (c.type === 'police' && c.driver === 'cop' && Math.hypot(c.x - player.x, c.z - player.z) < r) return true;
  for (const p of peds.list) if (p.cop && p.state !== 'dead' && Math.hypot(p.x - player.x, p.z - player.z) < r) return true;
  return false;
}
function showRadio() {
  if (!player.car) return;
  const r = $('radio'); r.textContent = '📻 ' + audio.stations[audio.station]; r.style.opacity = 1; clearTimeout(game._radT); game._radT = setTimeout(() => (r.style.opacity = 0), 2200);
}

// ---------------- input ----------------
const keys = new Set(); const pressed = new Set();
let mouse = { l: false, r: false, lp: false };
window.addEventListener('keydown', (e) => {
  if (['Tab', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  if (!keys.has(e.code)) pressed.add(e.code);
  keys.add(e.code);
  if ((e.code === 'Escape' || e.code === 'KeyP') && game.playing && performance.now() - (game._plT || 0) > 400) togglePause();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
canvas.addEventListener('mousedown', (e) => {
  audio.init();
  if (game.playing && !game.paused && document.pointerLockElement !== canvas && !isTouch) { canvas.requestPointerLock?.(); return; }
  if (e.button === 0) { mouse.l = true; mouse.lp = true; } if (e.button === 2) mouse.r = true;
});
window.addEventListener('mouseup', (e) => { if (e.button === 0) mouse.l = false; if (e.button === 2) mouse.r = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas || game.paused) return;
  cam.yaw -= e.movementX * 0.0026; cam.pitch -= e.movementY * 0.0022;
  cam.pitch = Math.max(-1.2, Math.min(0.7, cam.pitch)); cam.lastLook = performance.now();
});
document.addEventListener('pointerlockchange', () => {
  game._plT = performance.now();
  if (document.pointerLockElement !== canvas && game.playing && !game.paused && !isTouch) togglePause(true);
});

// touch controls
const touch = { mx: 0, my: 0, btn: new Set(), pressed: new Set(), stickId: null, lookId: null, lx: 0, ly: 0 };
if (isTouch) {
  const stick = $('stick'), knob = $('knob');
  const setStick = (t) => {
    const r = stick.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = (t.clientX - cx) / (r.width / 2), dy = (t.clientY - cy) / (r.height / 2); const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    touch.mx = dx; touch.my = -dy; knob.style.transform = `translate(${dx * 40}px, ${dy * 40}px)`;
  };
  stick.addEventListener('touchstart', (e) => { e.preventDefault(); audio.init(); touch.stickId = e.changedTouches[0].identifier; setStick(e.changedTouches[0]); }, { passive: false });
  stick.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === touch.stickId) setStick(t); }, { passive: false });
  const endStick = (e) => { for (const t of e.changedTouches) if (t.identifier === touch.stickId) { touch.stickId = null; touch.mx = touch.my = 0; knob.style.transform = ''; } };
  stick.addEventListener('touchend', endStick); stick.addEventListener('touchcancel', endStick);
  const look = $('tlook');
  look.addEventListener('touchstart', (e) => { e.preventDefault(); const t = e.changedTouches[0]; touch.lookId = t.identifier; touch.lx = t.clientX; touch.ly = t.clientY; }, { passive: false });
  look.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) if (t.identifier === touch.lookId) {
      cam.yaw -= (t.clientX - touch.lx) * 0.006; cam.pitch -= (t.clientY - touch.ly) * 0.005; cam.pitch = Math.max(-1.2, Math.min(0.7, cam.pitch));
      touch.lx = t.clientX; touch.ly = t.clientY; cam.lastLook = performance.now();
    }
  }, { passive: false });
  for (const b of document.querySelectorAll('#tbtns button')) {
    const k = b.dataset.k;
    b.addEventListener('touchstart', (e) => { e.preventDefault(); audio.init(); touch.btn.add(k); touch.pressed.add(k); b.classList.add('on'); }, { passive: false });
    const up = (e) => { e.preventDefault(); touch.btn.delete(k); b.classList.remove('on'); };
    b.addEventListener('touchend', up); b.addEventListener('touchcancel', up);
  }
  $('tpause').addEventListener('click', () => togglePause());
}

function readInput() {
  const k = (c) => keys.has(c), p = (c) => pressed.has(c);
  const inp = {
    mx: (k('KeyD') || k('ArrowRight') ? 1 : 0) - (k('KeyA') || k('ArrowLeft') ? 1 : 0),
    my: (k('KeyW') || k('ArrowUp') ? 1 : 0) - (k('KeyS') || k('ArrowDown') ? 1 : 0),
    sprint: k('ShiftLeft') || k('ShiftRight'),
    jump: k('Space'), jumpPressed: p('Space'),
    fire: mouse.l, firePressed: mouse.lp, aim: mouse.r,
    enter: p('KeyF') || p('Enter'), power: p('KeyQ'), weapon: p('Tab') || p('Digit1') || p('Digit2'),
    crouch: k('ControlLeft') || k('KeyC') && player.flyT > 0, horn: k('KeyH'), radio: p('KeyR'), camera: p('KeyC') && !(player.flyT > 0), mute: p('KeyM'),
  };
  if (isTouch) {
    inp.mx += touch.mx; inp.my += touch.my;
    const b = (x) => touch.btn.has(x), tp = (x) => touch.pressed.has(x);
    if (Math.hypot(touch.mx, touch.my) > 0.95 && !player.car) inp.sprint = true;
    inp.sprint ||= b('sprint'); inp.jump ||= b('jump'); inp.jumpPressed ||= tp('jump');
    inp.fire ||= b('fire'); inp.firePressed ||= tp('fire'); inp.aim ||= b('aim');
    inp.enter ||= tp('enter'); inp.power ||= tp('power'); inp.weapon ||= tp('weapon'); inp.horn ||= b('horn');
    if (tp('horn') && player.car) inp.radio = true;
    inp.hand = b('hand');
    if (player.car) { if (b('sprint')) inp.my = Math.max(inp.my, 1); if (b('jump')) inp.my = Math.min(inp.my, -1); }
  }
  // gamepad
  const gp = navigator.getGamepads ? [...navigator.getGamepads()].find((g) => g && g.connected) : null;
  if (gp) {
    const dz = (v) => (Math.abs(v) < 0.15 ? 0 : v);
    const prev = game._gpPrev || [];
    const bp = (i) => gp.buttons[i]?.pressed && !prev[i];
    inp.mx += dz(gp.axes[0]); inp.my -= dz(gp.axes[1]);
    const lx = dz(gp.axes[2] || 0), ly = dz(gp.axes[3] || 0);
    if (lx || ly) { cam.yaw -= lx * 0.05; cam.pitch = Math.max(-1.2, Math.min(0.7, cam.pitch - ly * 0.04)); cam.lastLook = performance.now(); }
    const rt = gp.buttons[7]?.value || 0, lt = gp.buttons[6]?.value || 0;
    if (player.car) { if (rt > 0.1) inp.my = Math.max(inp.my, rt); if (lt > 0.1) inp.my = Math.min(inp.my, -lt); }
    else { inp.fire ||= rt > 0.3; inp.firePressed ||= rt > 0.3 && !game._gpRt; inp.aim ||= lt > 0.3; }
    game._gpRt = rt > 0.3;
    inp.jump ||= gp.buttons[0]?.pressed; inp.jumpPressed ||= bp(0);
    inp.enter ||= bp(3); inp.power ||= bp(2); inp.weapon ||= bp(1) || bp(5); inp.sprint ||= gp.buttons[10]?.pressed || gp.buttons[4]?.pressed;
    inp.camera ||= bp(8); inp.radio ||= bp(12); inp.horn ||= gp.buttons[11]?.pressed;
    if (bp(9)) togglePause();
    game._gpPrev = gp.buttons.map((b) => b.pressed);
  }
  inp.mx = Math.max(-1, Math.min(1, inp.mx)); inp.my = Math.max(-1, Math.min(1, inp.my));
  inp.powerPressed = inp.power;
  pressed.clear(); mouse.lp = false; touch.pressed.clear();
  return inp;
}

// ---------------- camera ----------------
function updateCamera(dt, inp) {
  const c = player.car;
  let tx, ty, tz, dist;
  const now = performance.now();
  if (c) {
    tx = c.x; ty = c.y + 1.7; tz = c.z;
    dist = (cam.far ? 11 : 7.2) + Math.min(5, c.speed * 0.08);
    if (now - cam.lastLook > 1400) {
      let want = c.heading + (c.vf < -2 ? Math.PI : 0);
      let da = want - cam.yaw; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      cam.yaw += da * Math.min(1, dt * (1.5 + c.speed * 0.08));
      cam.pitch += (-0.2 - cam.pitch) * Math.min(1, dt * 2);
    }
    camera.fov += ((62 + Math.min(18, c.speed * 0.35)) - camera.fov) * Math.min(1, dt * 3);
  } else {
    tx = player.x; ty = player.y + 1.55; tz = player.z;
    dist = player.aiming ? 2.6 : (cam.far ? 7.5 : 4.4);
    if (player.flyT > 0) dist = 7;
    camera.fov += ((player.aiming ? 50 : 62) - camera.fov) * Math.min(1, dt * 8);
  }
  camera.updateProjectionMatrix();
  cam.dist += (dist - cam.dist) * Math.min(1, dt * 5);
  const fx = Math.sin(cam.yaw) * Math.cos(cam.pitch), fy = Math.sin(cam.pitch), fz = Math.cos(cam.yaw) * Math.cos(cam.pitch);
  const side = player.aiming && !c ? 0.75 : 0;
  const rx = -Math.cos(cam.yaw), rz = Math.sin(cam.yaw);
  const ox = tx + rx * side, oz = tz + rz * side;
  // pull the camera in front of walls
  let d = cam.dist;
  for (let t = 0.5; t <= cam.dist; t += 0.35) {
    const x = ox - fx * t, y = ty - fy * t, z = oz - fz * t;
    let hit = y < 0.3;
    if (!hit) for (const b of world.nearby(x, z, 0.3)) if (!b.circle && y < b.h + 0.3 && x > b.x0 - 0.3 && x < b.x1 + 0.3 && z > b.z0 - 0.3 && z < b.z1 + 0.3) { hit = true; break; }
    if (hit) { d = Math.max(0.6, t - 0.4); break; }
  }
  camera.position.set(ox - fx * d, Math.max(0.4, ty - fy * d), oz - fz * d);
  if (cam.shake > 0) { cam.shake = Math.max(0, cam.shake - dt * 1.5); camera.position.x += (Math.random() - 0.5) * cam.shake; camera.position.y += (Math.random() - 0.5) * cam.shake; }
  camera.lookAt(ox + fx * 10, ty + fy * 10, oz + fz * 10);
}

// ---------------- day / night ----------------
const C = (h) => new THREE.Color(h);
const PAL = {
  day: { top: C('#2f6fd0'), hor: C('#cfe2f2'), fog: C('#c4d4e2'), sun: C('#fff1d6'), hemi: 1.5, sunI: 2.8 },
  dusk: { top: C('#2a3a78'), hor: C('#ff9a5a'), fog: C('#c78a6e'), sun: C('#ffb070'), hemi: 0.9, sunI: 1.6 },
  night: { top: C('#03060f'), hor: C('#1a2440'), fog: C('#141a2c'), sun: C('#8aa0ff'), hemi: 0.4, sunI: 0.35 },
};
const lerpC = (a, b, t) => a.clone().lerp(b, t);
function updateSky(dt) {
  game.time = (game.time + dt * 1.0) % 1440; // 1 real second = 1 game minute
  const dayT = game.time / 1440;
  const ang = dayT * Math.PI * 2 - Math.PI / 2; // 6:00 = sunrise
  const sd = new THREE.Vector3(Math.cos(ang) * 0.7, Math.sin(ang), 0.45).normalize();
  const elev = sd.y;
  const night = THREE.MathUtils.smoothstep(-elev, -0.02, 0.22);
  const dusk = 1 - THREE.MathUtils.smoothstep(Math.abs(elev), 0.0, 0.35);
  game.night = night;
  let pal = {};
  for (const k of ['top', 'hor', 'fog', 'sun']) pal[k] = lerpC(lerpC(PAL.day[k], PAL.dusk[k], dusk), PAL.night[k], night);
  skyU.top.value.copy(pal.top); skyU.horizon.value.copy(pal.hor); skyU.bottom.value.copy(pal.fog).multiplyScalar(0.6);
  skyU.sunDir.value.copy(sd); skyU.sunCol.value.copy(pal.sun); skyU.night.value = night; skyU.time.value = performance.now() / 1000;
  scene.fog.color.copy(pal.fog);
  hemi.intensity = THREE.MathUtils.lerp(THREE.MathUtils.lerp(PAL.day.hemi, PAL.dusk.hemi, dusk), PAL.night.hemi, night);
  hemi.color.copy(pal.top).lerp(C('#ffffff'), 0.5);
  // the moon takes over the directional light at night
  const lightDir = elev > -0.05 ? sd : sd.clone().negate();
  sun.color.copy(pal.sun);
  sun.intensity = elev > -0.05 ? THREE.MathUtils.lerp(0.4, PAL.day.sunI, THREE.MathUtils.smoothstep(elev, -0.05, 0.3)) * (1 - dusk * 0.3) : 0.5;
  const focus = player.car ? player.car : player;
  // snap the shadow camera to texels to stop shimmering
  const step = 150 / sun.shadow.mapSize.x;
  const fxp = Math.round(focus.x / step) * step, fzp = Math.round(focus.z / step) * step;
  sun.target.position.set(fxp, 0, fzp);
  sun.position.set(fxp + lightDir.x * 250, lightDir.y * 250, fzp + lightDir.z * 250);
  if (bloom) bloom.strength = 0.25 + night * 0.55;
  sky.position.copy(camera.position);
  renderer.toneMappingExposure = 1.0 + night * 0.25;
  if (Math.abs(night - envNight) > 0.12 || !scene.environment) refreshEnv(night);
  // clock
  const hh = Math.floor(game.time / 60), mm = Math.floor(game.time % 60);
  $('clock').textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// reflections: bake the current sky into a PMREM environment map
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
const envSky = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), sky.material);
envScene.add(envSky);
const envGround = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: '#4a4c50' }));
envGround.rotation.x = -Math.PI / 2; envGround.position.y = -2; envScene.add(envGround);
let envNight = -1, envRT = null;
function refreshEnv(night) {
  envNight = night;
  envGround.material.color.setScalar(0.25 * (1 - night) + 0.02);
  const rt = pmrem.fromScene(envScene, 0.02, 0.1, 500);
  if (envRT) envRT.dispose();
  envRT = rt; scene.environment = rt.texture;
}

// ---------------- radar ----------------
const RAD = $('radar'), rctx = RAD.getContext('2d');
const mapK = 1.2, mapSize = Math.ceil(ISLAND * 2 * mapK);
const mapCanvas = document.createElement('canvas'); mapCanvas.width = mapCanvas.height = mapSize;
(() => {
  const m = mapCanvas.getContext('2d');
  m.fillStyle = '#5f6b75'; m.fillRect(0, 0, mapSize, mapSize);
  const X = (x) => (x + ISLAND) * mapK;
  for (const b of world.blocks) {
    m.fillStyle = b.kind === 'park' ? '#4f8a3a' : (b.kind === 'plaza' ? '#b8aa88' : (b.kind === 'docks' ? '#6f6250' : '#8b8f94'));
    m.fillRect(X(b.x0), X(b.z0), (b.x1 - b.x0) * mapK, (b.z1 - b.z0) * mapK);
  }
  m.fillStyle = '#3d434a';
  for (const b of world.buildings) if (!b.circle && b.h > 2 && (b.x1 - b.x0) > 3) m.fillRect(X(b.x0), X(b.z0), (b.x1 - b.x0) * mapK, (b.z1 - b.z0) * mapK);
  m.strokeStyle = '#1f2f3f'; m.lineWidth = 3; m.strokeRect(1, 1, mapSize - 2, mapSize - 2);
})();
const BLIPC = { enemy: '#ff3b30', target: '#4aa3ff', cop: '#2f6dff', mission: '#ffd23f', dest: '#ffd23f', check: '#ff4fb8', ghost: '#ff4fb880', home: '#5fe36a', garage: '#ff9a3c' };
// Manhattan route over the road grid: to the nearest junction, along one road, then the other
function gpsRoute(px, pz, tx, tz) {
  const [ai, aj] = world.nearestNode(px, pz), [bi, bj] = world.nearestNode(tx, tz);
  const pts = [[px, pz]];
  if (ai !== bi || aj !== bj) {
    pts.push([roadC(ai), roadC(aj)]);
    if (Math.abs(tx - px) > Math.abs(tz - pz)) pts.push([roadC(bi), roadC(aj)]); else pts.push([roadC(ai), roadC(bj)]);
    pts.push([roadC(bi), roadC(bj)]);
  }
  pts.push([tx, tz]);
  return pts;
}
game.setGps = (x, z) => { game.gps = x == null ? null : { x, z }; };
function drawRadar() {
  const W = RAD.width, c = W / 2, s = 1.1 * (W / 190) / 1.15;
  const px = player.car ? player.car.x : player.x, pz = player.car ? player.car.z : player.z;
  const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw), rx = -fz, rz = fx;
  rctx.setTransform(1, 0, 0, 1, 0, 0);
  rctx.fillStyle = '#2d5f86'; rctx.fillRect(0, 0, W, W);
  const k = mapK;
  rctx.setTransform(s * rx / k, -s * fx / k, s * rz / k, -s * fz / k,
    c + s * rx * (-ISLAND - px) + s * rz * (-ISLAND - pz), c - s * fx * (-ISLAND - px) - s * fz * (-ISLAND - pz));
  rctx.drawImage(mapCanvas, 0, 0);
  rctx.setTransform(1, 0, 0, 1, 0, 0);
  const toR = (x, z) => { const dx = x - px, dz = z - pz; return [c + s * (dx * rx + dz * rz), c - s * (dx * fx + dz * fz)]; };
  const dot = (x, z, col, r = 7, clamp = true, shape) => {
    let [sx, sy] = toR(x, z);
    const dx = sx - c, dy = sy - c, l = Math.hypot(dx, dy), lim = c - 12;
    if (l > lim) { if (!clamp) return; sx = c + dx / l * lim; sy = c + dy / l * lim; }
    rctx.fillStyle = col; rctx.strokeStyle = '#000'; rctx.lineWidth = 3;
    rctx.beginPath();
    if (shape === 'sq') rctx.rect(sx - r, sy - r, r * 2, r * 2); else rctx.arc(sx, sy, r, 0, 7);
    rctx.fill(); rctx.stroke();
  };
  // specials
  // GPS route along the roads to the current target
  if (game.gps) {
    const pts = gpsRoute(px, pz, game.gps.x, game.gps.z).map(([x, z]) => toR(x, z));
    rctx.save(); rctx.beginPath(); rctx.arc(c, c, c - 2, 0, 7); rctx.clip();
    rctx.lineJoin = 'round'; rctx.lineCap = 'round';
    for (const [w, col] of [[13, '#000'], [8, '#c86bff']]) {
      rctx.strokeStyle = col; rctx.lineWidth = w; rctx.beginPath();
      pts.forEach(([x, y], i) => (i ? rctx.lineTo(x, y) : rctx.moveTo(x, y))); rctx.stroke();
    }
    rctx.restore();
    const dist = Math.round(Math.hypot(game.gps.x - px, game.gps.z - pz));
    rctx.font = 'bold 26px Oswald, sans-serif'; rctx.textAlign = 'center'; rctx.textBaseline = 'middle';
    rctx.strokeStyle = '#000'; rctx.lineWidth = 6; rctx.fillStyle = '#e7c6ff';
    rctx.strokeText(`GPS ${dist}m`, c, W - 44); rctx.fillText(`GPS ${dist}m`, c, W - 44);
  }
  const h = world.specials.home, g = world.specials.garage;
  dot(h.x, h.z, BLIPC.home, 8, true, 'sq');
  dot(g.x, g.z - 6, BLIPC.garage, 7, false, 'sq');
  for (const car of cars) if (car.type === 'police' && car.driver === 'cop') dot(car.x, car.z, (Math.floor(performance.now() / 200) % 2) ? '#ff2f2f' : '#2f6dff', 6, false);
  for (const p of peds.list) if (p.cop && p.state !== 'dead' && game.wanted.level) dot(p.x, p.z, '#2f6dff', 4, false);
  for (const m of game.markers) dot(m.x, m.z, BLIPC[m.type] || '#fff', m.type === 'ghost' ? 6 : 9);
  for (const b of game.blips) { const o = b.obj; if (o.dead || o.state === 'dead') continue; dot(o.x, o.z, BLIPC[b.kind] || '#fff', 7); }
  // north
  const [nx, ny] = toR(px, pz - 1000); const nd = Math.hypot(nx - c, ny - c);
  const nX = c + (nx - c) / nd * (c - 16), nY = c + (ny - c) / nd * (c - 16);
  rctx.fillStyle = '#fff'; rctx.font = 'bold 22px Oswald, sans-serif'; rctx.textAlign = 'center'; rctx.textBaseline = 'middle';
  rctx.strokeStyle = '#000'; rctx.lineWidth = 4; rctx.strokeText('N', nX, nY); rctx.fillText('N', nX, nY);
  // player arrow
  const hd = player.car ? player.car.heading : player.heading;
  const hx = Math.sin(hd), hz = Math.cos(hd);
  const ax = hx * rx + hz * rz, ay = -(hx * fx + hz * fz);
  const ang = Math.atan2(ay, ax);
  rctx.save(); rctx.translate(c, c); rctx.rotate(ang);
  rctx.fillStyle = '#fff'; rctx.strokeStyle = '#000'; rctx.lineWidth = 3;
  rctx.beginPath(); rctx.moveTo(14, 0); rctx.lineTo(-9, -9); rctx.lineTo(-4, 0); rctx.lineTo(-9, 9); rctx.closePath(); rctx.fill(); rctx.stroke();
  rctx.restore();
}

// ---------------- zones ----------------
function zoneName(x, z) {
  if (Math.abs(x) > HALF + 4 || Math.abs(z) > HALF + 4) return 'The Prom';
  const bx = Math.floor((x + HALF) / P), bz = Math.floor((z + HALF) / P);
  const b = world.blocks[Math.max(0, Math.min(N - 1, bx)) * N + Math.max(0, Math.min(N - 1, bz))];
  if (b.kind === 'docks') return 'Clydeside Docks';
  if (b.kind === 'park') return 'Neep Park';
  if (b.kind === 'plaza') return 'Hero Square';
  if (Math.hypot(x, z) < HALF * 0.45) return 'Downtown Wallypool';
  if (x < 0 && z < 0) return 'Haggis Heights';
  if (x >= 0 && z < 0) return 'Tannadice';
  if (x < 0) return 'Bawheid Brae';
  return 'Shortbread Shore';
}
let lastZone = '';

// ---------------- missions ----------------
let missionMarker = null;
function placeMissionMarker() {
  if (missionMarker) { scene.remove(missionMarker.obj); game.markers = game.markers.filter((m) => m !== missionMarker); missionMarker = null; }
  if (game.mission || game.missionIdx >= MISSIONS.length) return;
  const [x, z] = missionStartPoint(world);
  missionMarker = game.marker(x, z - 1.5, 'mission', 1.6);
}
function startMission() {
  const m = MISSIONS[game.missionIdx];
  game.mission = m;
  placeMissionMarker();
  game.bigText(m.title.toUpperCase(), `Mission ${game.missionIdx + 1} of ${MISSIONS.length}`, 2.8);
  game.subs(m.intro);
  m.start(game);
}
function failMission() {
  if (!game.mission) return;
  game.mission.end(game);
  game.mission = null; game.objective(''); game.setGps(null);
  setTimeout(() => { if (!player.dead) game.bigText('MISSION FAILED!', 'Hopeless.', 2.5, true); }, 4400);
  placeMissionMarker();
}
function updateMission(dt) {
  if (game.mission) {
    const r = game.mission.update(dt, game);
    if (r === 'pass') {
      const m = game.mission; m.end(game); game.mission = null; game.objective(''); game.setGps(null);
      player.money += m.reward; game.missionIdx++; audio.pass();
      game.bigText('MISSION PASSED!', `+$${m.reward}`, 3.5);
      if (game.missionIdx >= MISSIONS.length) setTimeout(() => game.bigText('WALLYPOOL IS SAFE', '(ish). Thanks for playing! Keep exploring.', 5), 4000);
      placeMissionMarker(); save();
    } else if (r === 'fail') {
      audio.fail(); failMission();
    }
  } else if (missionMarker && !player.dead) {
    const px = player.car ? player.car.x : player.x, pz = player.car ? player.car.z : player.z;
    if (game.inMarker(missionMarker, px, pz)) startMission();
  }
}

// ---------------- save ----------------
function save() {
  store.set('wta-save', { v: 2, money: player.money, missionIdx: game.missionIdx, specs: game.collected || [], weapons: Object.keys(player.owned), ammoOf: player.ammoOf, stats: game.stats, time: game.time });
}
function load(fresh) {
  const s = fresh ? {} : store.get('wta-save', {});
  player.money = s.money || 0; game.missionIdx = s.missionIdx || 0;
  if (!s.v) game.missionIdx = 0; // mission 1 is new (Pamazon), so older saves start the story again
  game.collected = s.specs || [];
  player.loseWeapons();
  for (const w of s.weapons || []) player.owned[w] = true;
  Object.assign(player.ammoOf, s.ammoOf || {});
  if (s.hasBlaster) { player.owned.blaster = true; player.ammoOf.blaster += s.ammo || 0; } // saves from v1.1 and earlier
  if (s.stats) Object.assign(game.stats, s.stats);
  game.stats.specs = game.collected.length;
  if (s.time) game.time = s.time;
  return s;
}

// ---------------- main update ----------------
function updatePickups(dt) {
  const px = player.x, py = player.y, pz = player.z;
  for (const p of game.pickups) {
    if (p.gone > 0) { p.gone -= dt; if (p.gone <= 0) p.obj.visible = true; continue; }
    p.t += dt; p.obj.rotation.y = p.t * 2; p.obj.position.y = p.y + Math.sin(p.t * 3) * 0.15;
    if (p.obj.userData.ring) p.obj.userData.ring.position.y = -0.75 - Math.sin(p.t * 3) * 0.15;
    if (player.car || player.dead) continue;
    if (Math.abs(p.x - px) < 1.3 && Math.abs(p.z - pz) < 1.3 && Math.abs(p.y - 0.9 - py) < 1.6) {
      if (p.kind === 'health') { if (player.health >= 100) continue; player.health = 100; game.toast('Irn... er, energy drink. Health restored.'); }
      if (p.kind === 'armour') { if (player.armour >= 100) continue; player.armour = 100; game.toast('Body armour. Fits over the onesie.'); }
      if (p.kind === 'cash') { const a = p.amount || 250; player.money += a; audio.cash(); }
      if (p.kind === 'ammo') { player.giveWeapon('blaster', 30); game.toast('Blaster cells +30'); }
      if (p.kind === 'weapon') {
        const W = WEAPONS[p.weapon], had = player.owned[p.weapon];
        player.giveWeapon(p.weapon, W.pickup || 0);
        game.toast(had ? `${W.icon} ${W.name}${W.pickup ? ` +${W.pickup}` : ''}` : `${W.icon} Picked up the ${W.name}!${W.pickup ? ` (${W.pickup})` : ''} Tab to switch weapons.`);
      }
      audio.pickup();
      if (p.respawn) { p.gone = p.respawn; p.obj.visible = false; }
      else { scene.remove(p.obj); p.dead = true; }
    }
  }
  game.pickups = game.pickups.filter((p) => !p.dead);
  for (const s of game.specs) {
    s.obj.rotation.y += dt * 2; s.obj.position.y = s.y + Math.sin(performance.now() / 300 + s.id) * 0.15;
    if (!s.got && Math.hypot(s.x - px, s.z - pz) < 1.4 && Math.abs(s.y - 1.1 - py) < 2 && !player.car) {
      s.got = true; scene.remove(s.obj); game.collected.push(s.id); game.stats.specs = game.collected.length;
      player.money += 100; audio.pass();
      game.bigText('GOLDEN SPECS!', `${game.collected.length} of 20 found`, 2.2);
      if (game.collected.length === 20) { player.money += 10000; game.toast('All 20 Golden Specs! +$10,000. Wally can finally see properly.'); }
      save();
    }
  }
  game.specs = game.specs.filter((s) => !s.got);
}

function updateTraffic(dt) {
  const px = player.car ? player.car.x : player.x, pz = player.car ? player.car.z : player.z;
  const civ = cars.filter((c) => c.driver === 'ai').length;
  const parked = cars.filter((c) => c.parked && !c.driver).length;
  if (civ < maxTraffic() && Math.random() < dt * 4) spawnTraffic();
  if (parked < 9 && Math.random() < dt * 2) spawnParked();
  // police response
  const cops = cars.filter((c) => c.type === 'police' && c.driver === 'cop' && c.ai instanceof PoliceAI).length;
  const wantCops = [0, 1, 2, 3, 4, 6][game.wanted.level];
  if (cops < wantCops && Math.random() < dt * 0.6) spawnPolice();
  for (let i = cars.length - 1; i >= 0; i--) {
    const c = cars[i];
    const d = Math.hypot(c.x - px, c.z - pz);
    if (c !== player.car && !c.mission && (d > 210 || (c.dead && c.deadT > 40 && d > 50))) { removeCar(c); continue; }
    if (c.ai && c.driver !== 'player') {
      if (c.ai instanceof PoliceAI && game.wanted.level === 0) {
        // stand down
        const [i2, j2] = world.nearestNode(c.x, c.z); const dirs = DIRS.filter((q) => validDir(i2, j2, q));
        c.ai = new TrafficAI(c, i2, j2, dirs[0]); c.sirenOn = false;
      }
      if (c.health > 0) c.ai.drive(dt, cars, game);
      else { c.input.throttle = 0; c.input.steer = 0; }
      // cops jump out when Wally is on foot nearby
      if (c.ai instanceof PoliceAI && !player.car && !c.copsOut && d < 14 && c.speed < 4) {
        c.copsOut = true; c.ai = null; c.driver = null; c.sirenOn = true; c.input = { throttle: 0, steer: 0, hand: false };
        for (let k = 0; k < 2; k++) { const [dx, dz] = c.doorPos(); const p = game.spawnPed(dx + k * 1.2, dz, { cop: true }); p.state = 'chase'; }
      }
    }
    if (c === player.car) {
      const inp = game._inp;
      c.input.throttle = inp.my; c.input.steer = inp.mx; c.input.hand = inp.jump || inp.hand;
      if (inp.horn) { if (!c._hornOn) audio.horn(); c._hornOn = true; game.raiseAlarm(c.x, c.z, 1); } else c._hornOn = false;
    }
    if (d < 230) c.update(dt, world, game);
    c.group.visible = d < 260;
    // smoke & flames
    if (c.health < 350 && !c.dead && Math.random() < dt * (c.health <= 0 ? 30 : 8)) {
      const [fx, fz] = c.forward();
      puff(c.x + fx * c.T.len * 0.38, c.y + 1, c.z + fz * c.T.len * 0.38, c.health <= 0 ? { color: Math.random() < 0.5 ? '#ff7a1a' : '#ffb347', add: true, life: 0.6, size: 0.8, vy: 3 } : { color: '#555', life: 1.6, size: 0.6, vy: 2 });
    }
    if (c.dead && Math.random() < dt * 6) puff(c.x, c.y + 1.2, c.z, { color: '#222', life: 3, size: 1, vy: 2.5, grow: 3 });
  }
  if (player.car && player.car.health <= 0 && !player.car.dead && Math.random() < dt * 2) game.toast('Get out, Wally! It\'s gonnae blow!');
  // player car vs other cars
  if (player.car) {
    const a = player.car;
    for (const b of cars) {
      if (b === a || Math.abs(b.x - a.x) > 8 || Math.abs(b.z - a.z) > 8) continue;
      let hit = null;
      for (const [ax, az] of a.circles()) for (const [bx, bz] of b.circles()) {
        const dx = ax - bx, dz = az - bz, dd = Math.hypot(dx, dz), m = a.radius + b.radius;
        if (dd < m && dd > 1e-3 && (!hit || m - dd > hit.pen)) hit = { nx: dx / dd, nz: dz / dd, pen: m - dd };
      }
      if (!hit) continue;
      const ma = a.T.mass, mb = b.T.mass * (b.dead ? 1.5 : 1), tot = ma + mb;
      a.x += hit.nx * hit.pen * mb / tot; a.z += hit.nz * hit.pen * mb / tot;
      b.x -= hit.nx * hit.pen * ma / tot; b.z -= hit.nz * hit.pen * ma / tot;
      const rv = (a.vx - b.vx) * hit.nx + (a.vz - b.vz) * hit.nz;
      if (rv < 0) {
        const j = -(1.3) * rv / (1 / ma + 1 / mb);
        a.vx += j * hit.nx / ma; a.vz += j * hit.nz / ma; b.vx -= j * hit.nx / mb; b.vz -= j * hit.nz / mb;
        const imp = -rv;
        if (imp > 2) { audio.crash(imp); cam.shake = Math.min(0.5, imp * 0.03); a.damage(imp * imp * 0.8, game); b.damage(imp * imp * 1.0, game); if (b.ai) b.ai.panic = 6; if (b.type === 'police' && imp > 4) game.wanted.add(1.5); }
      }
    }
  }
  // cars vs people
  for (const c of cars) {
    const sp = c.speed; if (sp < 3.5) continue;
    for (const p of peds.list) {
      if (p.state === 'dead' || p.state === 'tumble' || Math.abs(p.x - c.x) > 4 || Math.abs(p.z - c.z) > 4) continue;
      for (const [cx, cz] of c.circles()) if (Math.hypot(p.x - cx, p.z - cz) < c.radius + 0.35) {
        p.vx = c.vx * 0.9 + (p.x - cx) * 2; p.vz = c.vz * 0.9 + (p.z - cz) * 2; p.vy = 3 + sp * 0.25;
        const wasDead = p.health <= 0; p.state = 'tumble';
        if (!wasDead) p.hurt(sp * 7, c === player.car ? game : { onPedKilled() {}, say() {} }, c.x, c.z, 'car');
        audio.punch();
        if (c === player.car && p.cop) game.wanted.add(2);
        break;
      }
    }
    if (c !== player.car && !player.car && !player.dead) {
      for (const [cx, cz] of c.circles()) if (Math.hypot(player.x - cx, player.z - cz) < c.radius + 0.4 && player.y < 1.5) {
        game.hurtPlayer(sp * 2.2, 'car'); player.vx = c.vx * 0.8; player.vz = c.vz * 0.8; player.vy = 4; player.onGround = false; audio.punch();
        if (c.ai) c.ai.panic = 2; break;
      }
    }
  }
}

function updateBubbles(dt) {
  const w = window.innerWidth, h = window.innerHeight;
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i]; b.t -= dt;
    if (b.t <= 0 || b.ped.state === 'dead') { b.el.remove(); bubbles.splice(i, 1); continue; }
    tmpV.set(b.ped.x, b.ped.y + 2.2, b.ped.z).project(camera);
    const vis = tmpV.z < 1 && Math.abs(tmpV.x) < 1.1 && Math.abs(tmpV.y) < 1.1 && Math.hypot(b.ped.x - camera.position.x, b.ped.z - camera.position.z) < 40;
    b.el.style.display = vis ? 'block' : 'none';
    b.el.style.left = ((tmpV.x + 1) / 2 * w) + 'px'; b.el.style.top = ((1 - tmpV.y) / 2 * h) + 'px';
  }
}

function updateHUD(dt) {
  $('hp').firstChild.style.width = Math.max(0, player.health) + '%';
  $('ar').firstChild.style.width = Math.max(0, player.armour) + '%';
  $('ar').style.display = player.armour > 0 ? '' : 'none';
  $('money').textContent = '$' + String(Math.floor(player.money)).padStart(8, '0');
  const st = $('stars').children;
  for (let i = 0; i < 5; i++) st[i].className = i < game.wanted.level ? 'on' : '';
  $('stars').classList.toggle('blink', game.wanted.level > 0 && !game.wanted.seen);
  $('weaponIcon').textContent = WEAPONS[player.weapon].icon;
  $('ammo').textContent = WEAPONS[player.weapon].melee ? '' : player.ammo;
  $('cross').classList.toggle('on', player.aiming && !player.car);
  const pw = $('power'); pw.style.setProperty('--p', (100 - player.powerCool / 6 * 100) + '%');
  pw.style.opacity = player.car ? 0.35 : 1;
  // subtitles
  if (subsQ.length) {
    subsT -= dt;
    if (subsT <= 0) { $('subs').textContent = subsQ.shift(); subsT = 3.6; }
  } else if (subsT > 0) { subsT -= dt; if (subsT <= 0) $('subs').textContent = ''; }
  // zone
  const z = zoneName(player.x, player.z);
  if (z !== lastZone) {
    lastZone = z; const e = $('zone'); e.innerHTML = z; e.style.opacity = 1; clearTimeout(game._zT); game._zT = setTimeout(() => (e.style.opacity = 0), 2600);
  }
  drawRadar();
}

// Wally Wash: lose the polis and fix the motor
let washCool = 0;
function updateGarage(dt) {
  washCool -= dt;
  const g = world.specials.garage; const c = player.car;
  if (!c || washCool > 0) return;
  if (Math.hypot(c.x - g.x, c.z - (g.z - 6)) < 4.5 && c.speed < 3) {
    if (game.wanted.level === 0 && c.health >= 1000) return;
    washCool = 8;
    if (player.money < 100) { game.toast('Wally Wash: "A hundred quid, pal. Nae freebies, even for heroes."'); return; }
    player.money -= 100; game.wanted.clear(); c.health = 1000; c.burnT = 0;
    c.paintM.color.setHSL(Math.random(), 0.65, 0.45);
    for (const car of cars) if (car.type === 'police' && car.ai instanceof PoliceAI) car.sirenOn = false;
    audio.cash(); game.bigText('WALLY WASH', 'Fresh paint, nae polis. -$100', 2.2);
  }
}

let last = performance.now();
let acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
  if (!game.playing || game.paused) { if (!game.playing) titleCam(dt); render(); return; }
  const inp = readInput(); game._inp = inp;
  if (inp.mute) { audio.on = !audio.on; if (audio.master) audio.master.gain.value = audio.on ? 0.7 : 0; game.toast(audio.on ? 'Sound on' : 'Sound off'); }
  if (inp.camera) cam.far = !cam.far;
  if (inp.radio && player.car) { audio.nextStation(); showRadio(); }
  if (inp.enter) { if (player.car) exitCar(); else enterCar(); }
  if (inp.weapon && !player.car) { player.cycleWeapon(); if (!player.hasWeapons) game.toast('No weapons yet. Just fists of mild fury.'); else game.toast(`${WEAPONS[player.weapon].icon} ${WEAPONS[player.weapon].name}`); }
  if (inp.power && player.car) { player.usePower(game); inp.powerPressed = false; }
  player.update(dt, inp, game);
  game.wanted.update(dt);
  if (game.alarmT > 0) { game.alarmT -= dt; if (game.alarmT <= 0) game.alarm = null; }
  updateTraffic(dt);
  peds.update(dt, game);
  updatePickups(dt);
  updateGarage(dt);
  updateMission(dt);
  for (const m of game.markers) { if (m.obj.userData.arrow) { m.obj.userData.arrow.position.y = 5 + Math.sin(now / 250) * 0.4; m.obj.userData.arrow.rotation.y += dt * 2; } }
  updateNeeps(dt);
  updateParticles(dt);
  for (let i = tracers.length - 1; i >= 0; i--) { const t = tracers[i]; t.t -= dt; t.l.material.opacity = t.t / 0.09; if (t.t <= 0) { scene.remove(t.l); t.l.geometry.dispose(); tracers.splice(i, 1); } }
  if (flashLight.intensity > 0) flashLight.intensity = Math.max(0, flashLight.intensity - dt * 900);
  // big statue's cape flutters gently
  if (world.statue) { /* bronze doesn't flutter, Wally insists it does */ }
  // headlights at night
  if (player.car && game.night > 0.2) {
    const c = player.car, [fx, fz] = c.forward();
    headlight.intensity = 60 * game.night; headlight.position.set(c.x + fx * 2, c.y + 0.8, c.z + fz * 2);
    headlight.target.position.set(c.x + fx * 20, 0, c.z + fz * 20);
  } else headlight.intensity = 0;
  world.update(dt, now / 1000, game.night);
  updateCamera(dt, inp);
  updateSky(dt);
  // audio
  const c = player.car;
  const siren = cars.reduce((m, q) => (q.sirenOn && !q.dead ? Math.max(m, 1 - Math.hypot(q.x - player.x, q.z - player.z) / 90) : m), 0);
  // engine noise from the nearest other cars, panned left/right relative to the camera
  if (audio.ctx) {
    const cx = camera.position.x, cz = camera.position.z, ry = Math.atan2(Math.sin(cam.yaw), Math.cos(cam.yaw));
    const rxv = -Math.cos(ry), rzv = Math.sin(ry);
    const near = [];
    for (const q of cars) {
      if (q === c || q.dead || !(q.driver === 'ai' || q.driver === 'cop' || q.speed > 1)) continue;
      const dx = q.x - player.x, dz = q.z - player.z, dist = Math.hypot(dx, dz);
      if (dist > 55) continue;
      const pd = Math.hypot(q.x - cx, q.z - cz) || 1;
      near.push({ dist, pan: ((q.x - cx) * rxv + (q.z - cz) * rzv) / pd, speed: q.speed, throttle: q.input.throttle, type: q.type });
    }
    near.sort((a, b) => a.dist - b.dist);
    audio.traffic(near, !!c);
  }
  audio.update({ inCar: !!c, speed: c ? c.vf : player.speed, throttle: c ? c.input.throttle : 0, slip: c ? c.vr || 0 : 0, carType: c ? c.type : '', siren, flying: player.flyT > 0 && !player.flail });
  updateBubbles(dt);
  updateHUD(dt);
  render();
}
function render() { if (composer && quality === 'high') composer.render(); else renderer.render(scene, camera); }

// slow orbit behind the title screen
let titleT = 0;
function titleCam(dt) {
  titleT += dt * 0.05;
  const s = world.specials.plaza;
  camera.position.set(s.x + Math.cos(titleT) * 38, 16, s.z + Math.sin(titleT) * 38);
  camera.lookAt(s.x, 12, s.z);
  sky.position.copy(camera.position);
  updateSky(0);
  world.update(dt, performance.now() / 1000, game.night);
}

// ---------------- menus ----------------
function togglePause(force) {
  if (!game.playing) return;
  game.paused = force === true ? true : !game.paused;
  $('pause').classList.toggle('hidden', !game.paused);
  if (game.paused) {
    if (document.pointerLockElement) document.exitPointerLock();
    const s = game.stats;
    $('statsBox').innerHTML = `<div class="stat">Missions: ${game.missionIdx} / ${MISSIONS.length}</div><div class="stat">Golden Specs: ${s.specs} / 20</div><div class="stat">Motors borrowed: ${s.cars} · Successful flights: ${s.flights}</div><div class="stat">Times hopeless: ${s.wasted} · Times nicked: ${s.busted}</div>`;
    if (audio.ctx) audio.ctx.suspend();
  } else {
    if (!isTouch) canvas.requestPointerLock?.();
    if (audio.ctx) audio.ctx.resume();
    last = performance.now();
  }
}
let started = false;
function startGame(fresh) {
  audio.init();
  if (!started || fresh) {
    const s = load(fresh);
    if (started) { for (const sp of game.specs) scene.remove(sp.obj); for (const p of game.pickups) scene.remove(p.obj); game.specs = []; game.pickups = []; failMission(); }
    setupCollectibles(s);
    const h = world.specials.home;
    player.place(h.x + 3, h.z - 7, 0); cam.yaw = 0; player.dead = false; player.health = 100;
    if (player.car) exitCar(true);
    game.wanted.clear();
    placeMissionMarker();
    // a motor waiting at the kerb outside the flat
    if (!cars.some((c) => Math.hypot(c.x - h.x, c.z - h.z) < 12)) { const c = game.spawnCar('hatch', h.x - 7, h.z - 3.4, -Math.PI / 2); c.parked = true; }
    started = true;
    if (game.missionIdx === 0) game.subs(["WALLY MAN: Another beautiful day in Wallypool.", "WALLY MAN: Mammy's waiting at the flat. Walk into the yellow marker.", "WALLY MAN: (Q to use my powers. If they work.)"]);
  }
  game.playing = true; game.paused = false;
  $('title').classList.add('hidden'); $('hud').classList.remove('hidden'); $('pause').classList.add('hidden');
  if (!isTouch) canvas.requestPointerLock?.();
  last = performance.now();
}
$('play').onclick = () => startGame(false);
$('newgame').onclick = () => { if (!store.get('wta-save', null) || confirm('Start a new game? Your progress will be wiped.')) { store.set('wta-save', {}); startGame(true); } };
$('howto').onclick = () => { $('help').classList.remove('hidden'); };
$('pauseHelp').onclick = () => { $('help').classList.remove('hidden'); };
$('helpBack').onclick = () => $('help').classList.add('hidden');
$('resume').onclick = () => togglePause(false);
$('quit').onclick = () => { save(); game.playing = false; game.paused = false; $('pause').classList.add('hidden'); $('hud').classList.add('hidden'); $('title').classList.remove('hidden'); if (audio.ctx) audio.ctx.resume(); };
const toggleGfx = () => { quality = quality === 'high' ? 'low' : 'high'; store.set('wta-quality', quality); applyQuality(); };
$('gfx').onclick = toggleGfx; $('gfx2').onclick = toggleGfx;
setInterval(() => { if (game.playing && !game.paused) save(); }, 30000);

applyQuality();
// version badge and what's new
$('verTitle').textContent = 'v' + VERSION; $('verPause').textContent = 'v' + VERSION;
$('news').innerHTML = `<b>What's new in v${VERSION}:</b><ul>${CHANGES[0][1].map((c) => `<li>${c}</li>`).join('')}</ul>`;
// a few cars about town before the player arrives
for (let i = 0; i < 6; i++) { player.x = world.specials.plaza.x; player.z = world.specials.plaza.z; spawnParked(); }
$('loading').classList.add('hidden');
requestAnimationFrame(frame);
window.__game = game; game.camera = camera; // handy for debugging in the console
