// Ambient life (visual only - never touches the simulation): flocks of birds wheeling over the forests by
// day, and a rainbow when a rain storm clears.
import * as THREE from 'three';
import { G } from './state.js';
import { T, cellCenter, groundY } from './terrain.js';
import { GRID as GRID_CELLS } from './config.js';

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
// for testing: show the rainbow now
export function _showRainbow() { rbT = 45; }
