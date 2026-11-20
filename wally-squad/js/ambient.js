// Ambient life (visual only - never touches the simulation): flocks of birds wheeling over the forests by
// day, and a rainbow when a rain storm clears.
import * as THREE from 'three';
import { G } from './state.js';
import { T, cellCenter, cellOf, groundY, isVisibleAt, BASES } from './terrain.js';
import { GRID as GRID_CELLS, WATER_LEVEL } from './config.js';
import * as FX from './particles.js';

const flocks = [];
let birdGeo = null, birdMat = null, rainbow = null, rbT = 0, lastWeather = null;

function treeSpot() {
  // a random wooded cell (or anywhere, on maps without forests)
  for (let k = 0; k < 60; k++) {
    const cx = 4 + Math.floor(Math.random() * (GRID_CELLS - 8)), cz = 4 + Math.floor(Math.random() * (GRID_CELLS - 8));
    if (T.tree[cz * GRID_CELLS + cx]) return { x: cellCenter(cx), z: cellCenter(cz) };
  }
  return { x: (Math.random() - 0.5) * 160, z: (Math.random() - 0.5) * 160 };
}

export function initAmbient(scene, theme) {
  setSkyTheme(theme);
  if (theme && theme.animals) initAnimals(scene, theme.animals);
  if (theme && theme.leaves) initLeaves(scene, theme.leaves);
  if (theme && !theme.lava && !theme.ice && !theme.trees.cactus) { initFireflies(scene); initButterflies(scene); }
  if (theme && !theme.lava && !theme.ice) initFish(scene);
  if (theme && theme.lava) return; // nothing flies over the lava fields
  // a bird: two thin wings in a shallow V
  birdGeo = new THREE.BufferGeometry();
  birdGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0.25, -0.9, 0.12, -0.15, 0, 0, -0.2, 0, 0, 0.25, 0, 0, -0.2, 0.9, 0.12, -0.15]), 3));
  birdGeo.computeVertexNormals();
  birdMat = new THREE.MeshBasicMaterial({ color: theme && theme.ice ? 0x2a3038 : 0x1c1a18, side: THREE.DoubleSide });
  for (let f = 0; f < 3; f++) {
    const c = treeSpot();
    const flock = { cx: c.x, cz: c.z, tx: c.x, tz: c.z, r: 12 + Math.random() * 12, h: 8 + Math.random() * 5, a: Math.random() * 6.28, spd: (0.25 + Math.random() * 0.15) * (Math.random() < 0.5 ? -1 : 1), move: 30 + Math.random() * 30, birds: [] };
    const n = 6 + Math.floor(Math.random() * 6);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(birdGeo, birdMat);
      m.userData = { da: (Math.random() - 0.5) * 0.9, dr: (Math.random() - 0.5) * 6, dh: (Math.random() - 0.5) * 3, ph: Math.random() * 6.28 };
      m.scale.setScalar(1.5 + Math.random() * 0.6);
      scene.add(m); flock.birds.push(m);
    }
    flocks.push(flock);
  }
}

export function updateAmbient(dt) {
  if (!G.three) return;
  const night = (G.nightLevel || 0) > 0.6;
  const t = performance.now() / 1000;
  for (const f of flocks) {
    f.move -= dt;
    if (f.move <= 0) { const s = treeSpot(); f.tx = s.x; f.tz = s.z; f.move = 35 + Math.random() * 35; }
    f.cx += (f.tx - f.cx) * Math.min(1, dt * 0.05); f.cz += (f.tz - f.cz) * Math.min(1, dt * 0.05);
    f.a += f.spd * dt;
    const gy = groundY(f.cx, f.cz);
    for (const b of f.birds) {
      b.visible = !night;
      if (night) continue;
      const u = b.userData, a = f.a + u.da, r = f.r + u.dr;
      b.position.set(f.cx + Math.cos(a) * r, gy + f.h + u.dh + Math.sin(t * 1.3 + u.ph) * 0.6, f.cz + Math.sin(a) * r);
      b.rotation.set(0, -a + (f.spd > 0 ? 0 : Math.PI), 0);
      b.scale.y = 0.6 + Math.abs(Math.sin(t * 9 + u.ph)) * 1.2; // flapping
    }
  }
  updateRainbow(dt);
  updateNightSky(dt);
  updateAnimals(dt);
  updateLeaves(dt, t);
  updateFireflies(dt, t);
  updateButterflies(dt, t);
  updateFish(dt);
}

// ---- butterflies: by day, a few colourful butterflies flutter over the grass near the camera
let bflies = null;
const BF_N = 36, bfState = [];
function initButterflies(scene) {
  const g = new THREE.BufferGeometry();
  // two wings hinged on the body line; the flap is done by squashing x
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0.12, -0.22, 0.02, 0.16, -0.2, 0, -0.1, 0, 0, 0.12, 0, 0, -0.08, -0.2, 0, -0.1, 0, 0, 0.12, 0.2, 0, -0.1, 0.22, 0.02, 0.16, 0, 0, 0.12, 0, 0, -0.08, 0.2, 0, -0.1]), 3));
  g.computeVertexNormals();
  bflies = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), BF_N);
  bflies.frustumCulled = false;
  const cols = [0xffd23a, 0xff7a2a, 0x7ac8ff, 0xffffff, 0xff5aa8, 0xb07aff], c = new THREE.Color();
  for (let i = 0; i < BF_N; i++) {
    bflies.setColorAt(i, c.set(cols[i % cols.length]));
    bfState.push({ x: (Math.random() - 0.5) * 60, z: (Math.random() - 0.5) * 60, h: 0.5 + Math.random() * 1.5, a: Math.random() * 6.28, ph: Math.random() * 6.28, sp: 1 + Math.random() });
  }
  scene.add(bflies);
}
const _bm = new THREE.Matrix4(), _bq = new THREE.Quaternion(), _be = new THREE.Euler(), _bp = new THREE.Vector3(), _bs = new THREE.Vector3();
function updateButterflies(dt, t) {
  if (!bflies) return;
  const day = (G.nightLevel || 0) < 0.4 && !(G.weather && (G.weather.type === 'rain' || G.weather.type === 'storm'));
  bflies.visible = day;
  if (!day) return;
  const cx = G.camera.x, cz = G.camera.z;
  for (let i = 0; i < BF_N; i++) {
    const b = bfState[i];
    b.a += Math.sin(t * 0.8 + b.ph) * dt * 1.5;
    b.x += Math.sin(b.a) * dt * b.sp; b.z += Math.cos(b.a) * dt * b.sp;
    if (Math.abs(b.x) > 32 || Math.abs(b.z) > 32) { b.x = (Math.random() - 0.5) * 60; b.z = (Math.random() - 0.5) * 60; }
    const wx = cx + b.x, wz = cz + b.z, gy = groundY(wx, wz);
    const vis = gy > WATER_LEVEL + 0.1 && isVisibleAt(wx, wz);
    _be.set(0, b.a, 0); _bq.setFromEuler(_be);
    _bp.set(wx, gy + b.h + Math.sin(t * 3 + b.ph) * 0.25, wz);
    const flap = vis ? 0.25 + Math.abs(Math.sin(t * 16 + b.ph)) * 1.1 : 0;
    _bs.set(flap * 1.6, 1.6, 1.6);
    bflies.setMatrixAt(i, _bm.compose(_bp, _bq, _bs));
  }
  bflies.instanceMatrix.needsUpdate = true;
}

// ---- fish: every so often a fish leaps out of a lake near the camera and splashes back in
let fishMesh = null, fishT = 3;
const fishList = [];
function initFish(scene) {
  const g = new THREE.SphereGeometry(0.22, 8, 6).scale(0.6, 0.7, 1.6);
  const tail = new THREE.ConeGeometry(0.18, 0.3, 4).rotateX(Math.PI / 2).translate(0, 0, -0.42);
  fishMesh = { scene, geos: [g, tail], mat: new THREE.MeshStandardMaterial({ color: 0x9ab0b8, metalness: 0.6, roughness: 0.35 }) };
}
function waterSpot() {
  for (let k = 0; k < 40; k++) {
    const x = G.camera.x + (Math.random() - 0.5) * 60, z = G.camera.z + (Math.random() - 0.5) * 60;
    const cx = cellOf(x), cz = cellOf(z);
    if (cx < 1 || cz < 1 || cx >= GRID_CELLS - 1 || cz >= GRID_CELLS - 1) continue;
    if (T.water[cz * GRID_CELLS + cx] && T.water[cz * GRID_CELLS + cx + 1] && T.water[(cz + 1) * GRID_CELLS + cx] && isVisibleAt(x, z)) return { x, z };
  }
  return null;
}
function updateFish(dt) {
  if (!fishMesh) return;
  fishT -= dt;
  if (fishT <= 0) {
    fishT = 2 + Math.random() * 5;
    const s = waterSpot();
    if (s) {
      const g = new THREE.Group();
      for (const geo of fishMesh.geos) g.add(new THREE.Mesh(geo, fishMesh.mat));
      const a = Math.random() * 6.28;
      fishMesh.scene.add(g);
      fishList.push({ g, x: s.x, z: s.z, dx: Math.sin(a), dz: Math.cos(a), t: 0, h: 1.2 + Math.random() * 1.2, dur: 0.9 + Math.random() * 0.4 });
      FX.splash?.(s.x, WATER_LEVEL, s.z, 0.6);
    }
  }
  for (let i = fishList.length - 1; i >= 0; i--) {
    const f = fishList[i];
    f.t += dt;
    const k = f.t / f.dur;
    if (k >= 1) { fishMesh.scene.remove(f.g); fishList.splice(i, 1); FX.splash?.(f.x + f.dx * 2, WATER_LEVEL, f.z + f.dz * 2, 0.7); continue; }
    const px = f.x + f.dx * 2 * k, pz = f.z + f.dz * 2 * k, y = WATER_LEVEL + Math.sin(k * Math.PI) * f.h;
    f.g.position.set(px, y, pz);
    f.g.rotation.set(-Math.cos(k * Math.PI) * 1.1, Math.atan2(f.dx, f.dz), 0, 'YXZ');
  }
}

// ---- fireflies: on warm maps after dark, little green-gold lights drift and blink near the camera
let flies = null;
const FLY_N = 140, flyState = [];
function initFireflies(scene) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FLY_N * 3), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(FLY_N * 3), 3));
  const cv = document.createElement('canvas'); cv.width = cv.height = 32;
  const cx2 = cv.getContext('2d'), gr = cx2.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  cx2.fillStyle = gr; cx2.fillRect(0, 0, 32, 32);
  flies = new THREE.Points(g, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(cv), size: 1.4, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, sizeAttenuation: true }));
  flies.frustumCulled = false; flies.visible = false;
  for (let i = 0; i < FLY_N; i++) flyState.push({ x: (Math.random() - 0.5) * 70, z: (Math.random() - 0.5) * 70, h: 0.6 + Math.random() * 2.5, ph: Math.random() * 6.28, sp: 0.5 + Math.random() });
  scene.add(flies);
}
function updateFireflies(dt, t) {
  if (!flies) return;
  const dark = Math.min(1, Math.max(0, ((G.nightLevel || 0) - 0.45) * 3));
  flies.visible = dark > 0.02;
  if (!flies.visible) return;
  const pos = flies.geometry.attributes.position.array, col = flies.geometry.attributes.color.array, cx = G.camera.x, cz = G.camera.z;
  for (let i = 0; i < FLY_N; i++) {
    const f = flyState[i];
    f.x += Math.sin(t * 0.7 * f.sp + f.ph) * dt * 0.8; f.z += Math.cos(t * 0.6 * f.sp + f.ph * 1.3) * dt * 0.8;
    if (Math.abs(f.x) > 36 || Math.abs(f.z) > 36) { f.x = (Math.random() - 0.5) * 70; f.z = (Math.random() - 0.5) * 70; }
    const wx = cx + f.x, wz = cz + f.z;
    pos[i * 3] = wx; pos[i * 3 + 1] = groundY(wx, wz) + f.h + Math.sin(t * 1.3 + f.ph) * 0.3; pos[i * 3 + 2] = wz;
    const blink = Math.max(0, Math.sin(t * 2.2 * f.sp + f.ph)) ** 2 * dark * (isVisibleAt(wx, wz) ? 1 : 0);
    col[i * 3] = 3.2 * blink; col[i * 3 + 1] = 4.4 * blink; col[i * 3 + 2] = 0.5 * blink;
  }
  flies.geometry.attributes.position.needsUpdate = true; flies.geometry.attributes.color.needsUpdate = true;
}

// ---- grazing animals: little herds of sheep and cows (penguins on snow maps). Purely decorative: they
// amble about and munch grass, and scatter in a panic when soldiers or vehicles come close.
const herds = [];
function boxGeo(w, h, d, x, y, z) { return new THREE.BoxGeometry(w, h, d).translate(x, y, z); }
function animalMesh(kind) {
  const g = new THREE.Group();
  const add = (geo, color) => { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.95 })); m.castShadow = true; g.add(m); return m; };
  if (kind === 'sheep') {
    add(new THREE.IcosahedronGeometry(0.42, 1).scale(1, 0.85, 1.3).translate(0, 0.62, 0), 0xf2efe6);
    const head = add(boxGeo(0.2, 0.24, 0.3, 0, 0.7, 0.55), 0x2a2522); head.name = 'head';
    for (const [x, z] of [[-0.18, 0.25], [0.18, 0.25], [-0.18, -0.25], [0.18, -0.25]]) add(boxGeo(0.08, 0.32, 0.08, x, 0.16, z), 0x2a2522);
  } else if (kind === 'cow') {
    add(boxGeo(0.62, 0.55, 1.15, 0, 0.82, 0), 0xf4f1ea);
    add(boxGeo(0.64, 0.3, 0.35, 0, 0.9, 0.1), 0x2a2420); add(boxGeo(0.64, 0.25, 0.3, 0, 0.78, -0.35), 0x2a2420); // patches
    const head = add(boxGeo(0.34, 0.36, 0.42, 0, 0.98, 0.72), 0xf4f1ea); head.name = 'head';
    add(boxGeo(0.36, 0.16, 0.12, 0, 0.88, 0.95), 0xe8a6a0);
    add(boxGeo(0.5, 0.06, 0.06, 0, 1.2, 0.65), 0xe8e0c8);
    for (const [x, z] of [[-0.22, 0.4], [0.22, 0.4], [-0.22, -0.4], [0.22, -0.4]]) add(boxGeo(0.13, 0.55, 0.13, x, 0.28, z), 0xe8e4dc);
  } else if (kind === 'hcow') { // shaggy ginger Highland cow with long horns and a fringe over its eyes
    add(boxGeo(0.66, 0.6, 1.15, 0, 0.8, 0), 0xb4622a);
    add(boxGeo(0.7, 0.18, 1.18, 0, 0.55, 0), 0xa4562a);                 // shaggy belly fringe
    const head = add(boxGeo(0.38, 0.38, 0.45, 0, 0.92, 0.72), 0xb4622a); head.name = 'head';
    add(boxGeo(0.4, 0.14, 0.2, 0, 1.04, 0.92), 0x9a4e22);               // fringe
    add(boxGeo(0.3, 0.14, 0.1, 0, 0.82, 0.96), 0x3a2a20);               // nose
    add(new THREE.ConeGeometry(0.05, 0.45, 5).rotateZ(Math.PI / 2 + 0.4).translate(0.38, 1.14, 0.7), 0xe8dcc0); // horns
    add(new THREE.ConeGeometry(0.05, 0.45, 5).rotateZ(-Math.PI / 2 - 0.4).translate(-0.38, 1.14, 0.7), 0xe8dcc0);
    for (const [x, z] of [[-0.22, 0.4], [0.22, 0.4], [-0.22, -0.4], [0.22, -0.4]]) add(boxGeo(0.14, 0.5, 0.14, x, 0.25, z), 0x8a4a22);
  } else { // penguin
    add(new THREE.CapsuleGeometry(0.22, 0.35, 4, 8).translate(0, 0.42, 0), 0x1c1e24);
    add(new THREE.CapsuleGeometry(0.17, 0.3, 4, 8).translate(0, 0.4, 0.07), 0xf4f6fa);
    const head = add(new THREE.SphereGeometry(0.17, 10, 8).translate(0, 0.85, 0), 0x1c1e24); head.name = 'head';
    add(new THREE.ConeGeometry(0.05, 0.16, 5).rotateX(Math.PI / 2).translate(0, 0.83, 0.2), 0xf0a020);
    add(boxGeo(0.08, 0.03, 0.14, -0.1, 0.02, 0.06), 0xf0a020); add(boxGeo(0.08, 0.03, 0.14, 0.1, 0.02, 0.06), 0xf0a020);
  }
  return g;
}
function openSpot() {
  for (let k = 0; k < 200; k++) {
    const cx = 6 + Math.floor(Math.random() * (GRID_CELLS - 12)), cz = 6 + Math.floor(Math.random() * (GRID_CELLS - 12));
    const i = cz * GRID_CELLS + cx;
    if (T.blocked[i] || T.water[i] || T.tree[i]) continue;
    let ore = false; for (let j = -6; j <= 6 && !ore; j++) for (let k2 = -6; k2 <= 6; k2++) if (T.ore[(cz + j) * GRID_CELLS + cx + k2] > 0) { ore = true; break; }
    if (ore) continue; // keep the herds out of the crystal fields
    const x = cellCenter(cx), z = cellCenter(cz);
    if (Object.values(BASES).some(b => Math.hypot(b.x - x, b.z - z) < 40)) continue;
    return { x, z };
  }
  return null;
}
const walkable = (x, z) => { const cx = cellOf(x), cz = cellOf(z); if (cx < 1 || cz < 1 || cx >= GRID_CELLS - 1 || cz >= GRID_CELLS - 1) return false; const i = cz * GRID_CELLS + cx; return !T.blocked[i] && !T.water[i] && !T.tree[i] && !(T.ore[i] > 0); };
function initAnimals(scene, type) {
  const kinds = type === 'penguin' ? ['penguin'] : type === 'highland' ? ['hcow', 'sheep', 'hcow'] : ['sheep', 'sheep', 'cow'];
  for (let h = 0; h < 4; h++) {
    const c = openSpot(); if (!c) continue;
    const kind = kinds[h % kinds.length], n = kind === 'cow' || kind === 'hcow' ? 3 : kind === 'penguin' ? 6 : 5;
    const herd = { kind, animals: [] };
    for (let i = 0; i < n; i++) {
      const x = c.x + (Math.random() - 0.5) * 6, z = c.z + (Math.random() - 0.5) * 6;
      if (!walkable(x, z)) continue;
      const m = animalMesh(kind); m.scale.setScalar(kind === 'penguin' ? 1.1 : 1.25); scene.add(m);
      herd.animals.push({ m, head: m.getObjectByName('head'), x, z, h: Math.random() * 6.28, tx: x, tz: z, wait: Math.random() * 4, panic: 0, ph: Math.random() * 6 });
    }
    herds.push(herd);
  }
}
function updateAnimals(dt) {
  const t = performance.now() / 1000;
  for (const herd of herds) for (const a of herd.animals) {
    if (a.dead) continue;
    // anything military nearby? run away from it
    let fx = 0, fz = 0;
    for (const u of G.units) { if (u.dead || u.boarded || u.air) continue; const dx = a.x - u.x, dz = a.z - u.z, d2 = dx * dx + dz * dz; if (d2 < 64 && d2 > 0.01) { const d = Math.sqrt(d2); fx += dx / d; fz += dz / d; } }
    if (fx || fz) { const l = Math.hypot(fx, fz); a.tx = a.x + fx / l * 8; a.tz = a.z + fz / l * 8; a.panic = 2.5; a.wait = 0; }
    a.panic = Math.max(0, a.panic - dt);
    const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz);
    let moving = false;
    if (d > 0.2 && a.wait <= 0) {
      const sp = (a.panic > 0 ? (herd.kind === 'penguin' ? 2.6 : 4.2) : 0.7) * dt;
      const nx = a.x + dx / d * Math.min(sp, d), nz = a.z + dz / d * Math.min(sp, d);
      if (walkable(nx, nz)) { a.x = nx; a.z = nz; moving = true; a.h += Math.atan2(Math.sin(Math.atan2(dx, dz) - a.h), Math.cos(Math.atan2(dx, dz) - a.h)) * Math.min(1, dt * 6); }
      else { a.tx = a.x; a.tz = a.z; }
    } else {
      a.wait -= dt;
      if (a.wait <= 0 && d <= 0.2) { // pick a new patch of grass near the herd
        const lead = herd.animals[0];
        a.tx = lead.x + (Math.random() - 0.5) * 9; a.tz = lead.z + (Math.random() - 0.5) * 9; a.wait = 2 + Math.random() * 6;
      }
    }
    const vis = isVisibleAt(a.x, a.z) || G.revealed;
    a.m.visible = vis;
    if (!vis) continue;
    const bob = moving ? Math.abs(Math.sin(t * (a.panic > 0 ? 14 : 7) + a.ph)) * 0.08 : 0;
    a.m.position.set(a.x, groundY(a.x, a.z) + bob, a.z);
    a.m.rotation.y = a.h;
    if (herd.kind === 'penguin') a.m.rotation.z = moving ? Math.sin(t * 10 + a.ph) * 0.15 : 0; // waddle
    if (a.head) a.head.rotation.x = !moving && herd.kind !== 'penguin' ? 0.35 + Math.sin(t * 2 + a.ph) * 0.15 : 0; // grazing
  }
}

// ---- falling leaves (autumn maps): a cloud of tumbling red and gold leaves drifting around the camera
let leaves = null;
const LEAF_N = 220, leafState = [];
const _lm = new THREE.Matrix4(), _lq = new THREE.Quaternion(), _le = new THREE.Euler(), _lp = new THREE.Vector3(), _ls = new THREE.Vector3(1, 1, 1);
function initLeaves(scene, kind) {
  const g = new THREE.PlaneGeometry(0.32, 0.22);
  leaves = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), LEAF_N);
  leaves.frustumCulled = false;
  const c = new THREE.Color();
  for (let i = 0; i < LEAF_N; i++) {
    if (kind === 'petals') leaves.setColorAt(i, c.setHSL(0.9 + Math.random() * 0.08, 0.6 + Math.random() * 0.3, 0.78 + Math.random() * 0.12)); // cherry blossom petals
    else leaves.setColorAt(i, c.setHSL(Math.random() * 0.12, 0.8, 0.42 + Math.random() * 0.15));
    leafState.push({ x: (Math.random() - 0.5) * 70, y: Math.random() * 22, z: (Math.random() - 0.5) * 70, rx: Math.random() * 6, ry: Math.random() * 6, sp: 0.8 + Math.random() * 0.8, ph: Math.random() * 6.28 });
  }
  scene.add(leaves);
}
function updateLeaves(dt, t) {
  if (!leaves) return;
  const cx = G.camera.x, cz = G.camera.z, wind = 1.2;
  for (let i = 0; i < LEAF_N; i++) {
    const L = leafState[i];
    L.y -= L.sp * dt; L.x += (wind + Math.sin(t * 1.3 + L.ph) * 0.8) * dt; L.z += Math.cos(t * 0.9 + L.ph) * 0.6 * dt;
    L.rx += dt * 2.4; L.ry += dt * 1.7;
    let wx = cx + L.x, wz = cz + L.z;
    const gy = groundY(wx, wz);
    if (L.y < gy || Math.abs(L.x) > 36 || Math.abs(L.z) > 36) { L.x = (Math.random() - 0.5) * 70; L.z = (Math.random() - 0.5) * 70; wx = cx + L.x; wz = cz + L.z; L.y = groundY(wx, wz) + 14 + Math.random() * 10; }
    _le.set(L.rx, L.ry, 0); _lq.setFromEuler(_le); _lp.set(wx, L.y, wz);
    leaves.setMatrixAt(i, _lm.compose(_lp, _lq, _ls));
  }
  leaves.instanceMatrix.needsUpdate = true;
}

// ---- rainbow: appears for about 45 seconds when rain or a storm clears in daylight. The camera looks down
// at the ground and never sees the sky, so it is drawn as a soft arc across the top of the screen.
function makeRainbow() {
  const el = document.createElement('div'); el.id = 'rainbow';
  el.style.cssText = 'position:absolute;left:50%;top:-4%;width:100%;aspect-ratio:2/1;transform:translateX(-50%);pointer-events:none;z-index:3;opacity:0;border-radius:50% 50% 0 0;' +
    'background:radial-gradient(ellipse 50% 100% at 50% 100%, transparent 72%, rgba(150,60,255,.55) 74%, rgba(60,90,255,.55) 76%, rgba(40,200,255,.5) 78%, rgba(60,255,90,.5) 80%, rgba(255,240,60,.5) 82%, rgba(255,150,30,.55) 84%, rgba(255,50,50,.55) 86%, transparent 89%);' +
    'mix-blend-mode:screen;filter:blur(2px);transition:opacity .4s';
  (document.getElementById('view') || document.body).appendChild(el);
  return el;
}
function updateRainbow(dt) {
  const W = G.weather; if (!W) return;
  if (lastWeather && lastWeather !== W.type && (lastWeather === 'rain' || lastWeather === 'storm') && W.type === 'clear' && (G.nightLevel || 0) < 0.4) rbT = 45;
  lastWeather = W.type;
  if (!rainbow) { if (rbT <= 0) return; rainbow = makeRainbow(); }
  if (rbT > 0) rbT -= dt;
  rainbow.style.opacity = rbT > 0 ? String(0.55 * Math.min(1, (45 - rbT) / 4, rbT / 6)) : '0';
}
// ---- night sky: shooting stars streak across the top of the screen on clear nights, and the northern
// lights shimmer over the snow maps (drawn as screen overlays, like the rainbow - the camera never sees the sky)
let auroraEl = null, starT = 6, skyTheme = null;
export function setSkyTheme(theme) { skyTheme = theme; }
let bloodEl = null;
function updateBloodMoonSky() {
  if (!G.bloodMoon && !bloodEl) return;
  if (!bloodEl) {
    bloodEl = document.createElement('div'); bloodEl.id = 'bloodMoon';
    bloodEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:3;opacity:0;transition:opacity 3s;' +
      'background:radial-gradient(circle at 82% 11%, rgba(255,110,80,1) 0, rgba(230,40,30,.95) 3.2%, rgba(200,30,20,.45) 4.6%, rgba(200,30,20,0) 10%),' +
      ' radial-gradient(ellipse at 50% 45%, rgba(140,0,0,0) 40%, rgba(150,10,10,.55) 100%), linear-gradient(rgba(170,20,20,.16), rgba(170,20,20,.16))';
    (document.getElementById('view') || document.body).appendChild(bloodEl);
  }
  bloodEl.style.opacity = G.bloodMoon ? '1' : '0';
}
function updateNightSky(dt) {
  updateBloodMoonSky();
  if (!skyTheme || skyTheme.lava) return;
  const W = G.weather, clear = !W || W.type === 'clear' || W.type === 'snow';
  const night = Math.max(0, Math.min(1, ((G.nightLevel || 0) - 0.55) * 3));
  const view = document.getElementById('view') || document.body;
  if (skyTheme.ice) {
    if (!auroraEl) {
      auroraEl = document.createElement('div'); auroraEl.id = 'aurora';
      auroraEl.style.cssText = 'position:absolute;left:0;right:0;top:0;height:42%;pointer-events:none;z-index:3;opacity:0;mix-blend-mode:screen;filter:blur(4px);transition:opacity 2s;' +
        'background:repeating-linear-gradient(95deg, rgba(255,255,255,0) 0 22px, rgba(170,255,210,.22) 24px 27px, rgba(255,255,255,0) 30px 48px), radial-gradient(ellipse 60% 75% at 28% 0%, rgba(60,255,150,.95), transparent 72%), radial-gradient(ellipse 50% 65% at 72% 0%, rgba(70,210,255,.85), transparent 72%), radial-gradient(ellipse 40% 55% at 50% 8%, rgba(200,90,255,.6), transparent 72%);' +
        'animation:auroraWave 9s ease-in-out infinite alternate';
      if (!document.getElementById('auroraKF')) { const st = document.createElement('style'); st.id = 'auroraKF'; st.textContent = '@keyframes auroraWave{0%{transform:translateX(-4%) scaleY(.9) skewX(-6deg)}50%{transform:translateX(3%) scaleY(1.1) skewX(4deg)}100%{transform:translateX(-2%) scaleY(1) skewX(-3deg)}} @keyframes shootStar{0%{opacity:0;transform:translate(0,0) rotate(var(--a))}10%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) rotate(var(--a))}}'; document.head.appendChild(st); }
      view.appendChild(auroraEl);
    }
    auroraEl.style.opacity = String(clear ? night : 0);
  }
  if (night < 0.5 || !clear) return;
  starT -= dt;
  if (starT > 0) return;
  starT = 4 + Math.random() * 9;
  if (!document.getElementById('auroraKF')) { const st = document.createElement('style'); st.id = 'auroraKF'; st.textContent = '@keyframes shootStar{0%{opacity:0;transform:translate(0,0) rotate(var(--a))}10%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) rotate(var(--a))}}'; document.head.appendChild(st); }
  const s = document.createElement('div'), ang = 15 + Math.random() * 25, dx = 180 + Math.random() * 200;
  s.style.cssText = `position:absolute;left:${10 + Math.random() * 60}%;top:${2 + Math.random() * 16}%;width:110px;height:2px;pointer-events:none;z-index:3;border-radius:2px;background:linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.95));box-shadow:0 0 8px rgba(200,230,255,.9);--a:${ang}deg;--dx:${dx}px;--dy:${dx * Math.tan(ang * Math.PI / 180)}px;animation:shootStar 1.1s ease-out forwards`;
  view.appendChild(s); setTimeout(() => s.remove(), 1300);
}

// for testing: show the rainbow now
export function _showRainbow() { rbT = 45; }
