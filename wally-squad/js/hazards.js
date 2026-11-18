// Natural Disasters mutator: tornadoes that roam across the battlefield, tossing infantry, battering
// vehicles and buildings. Movement and damage use the seeded simulation RNG (online-safe); the
// funnel mesh and dust are only visuals.
import * as THREE from 'three';
import { G, srand, srr } from './state.js';
import { HALF } from './config.js';
import { groundY, isVisibleAt } from './terrain.js';
import { unitsNear, damage, distTo } from './entities.js';
import * as FX from './particles.js';

const tornadoes = [];
let nextT = 70;
const buf = [];

function funnelMesh() {
  const g = new THREE.Group();
  // stacked, slowly widening rings of semi-transparent dust
  const mat = new THREE.MeshBasicMaterial({ color: 0x8a7a68, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide });
  const geo = new THREE.CylinderGeometry(1, 0.55, 1, 14, 1, true);
  for (let i = 0; i < 12; i++) {
    const r = 1.1 + Math.pow(i / 11, 1.6) * 7;
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(r, 2.4, r); m.position.y = 1.2 + i * 2.2;
    m.userData.k = i;
    g.add(m);
  }
  return g;
}

function spawn() {
  // enter from a random map edge and cross toward the other side
  const a = srand() * Math.PI * 2;
  const x = Math.cos(a) * (HALF - 10), z = Math.sin(a) * (HALF - 10);
  const tx = srr(-HALF * 0.4, HALF * 0.4), tz = srr(-HALF * 0.4, HALF * 0.4);
  const l = Math.hypot(tx - x, tz - z) || 1;
  const t = { x, z, dx: (tx - x) / l, dz: (tz - z) / l, life: srr(28, 40), age: 0, mesh: funnelMesh() };
  t.mesh.position.set(x, groundY(x, z), z);
  G.three.scene.add(t.mesh);
  tornadoes.push(t);
  G.announce?.('Warning: tornado approaching!', G.player, 8);
  G.alertAt = { x, z, t: G.time };
}

export function updateHazards(dt) {
  if (!(G.cfg.mut && G.cfg.mut.includes('disasters')) || G.over) return;
  nextT -= dt;
  if (nextT <= 0) { nextT = srr(90, 150); spawn(); }
  for (let i = tornadoes.length - 1; i >= 0; i--) {
    const t = tornadoes[i];
    t.age += dt;
    // wander: steer a little each step, bounce off the map edge
    const turn = (srand() - 0.5) * 1.6 * dt;
    const c = Math.cos(turn), s = Math.sin(turn);
    [t.dx, t.dz] = [t.dx * c - t.dz * s, t.dx * s + t.dz * c];
    t.x += t.dx * 6 * dt; t.z += t.dz * 6 * dt;
    if (Math.abs(t.x) > HALF - 6) t.dx = -t.dx;
    if (Math.abs(t.z) > HALF - 6) t.dz = -t.dz;
    // damage: strongest in the middle of the funnel
    for (const u of unitsNear(t.x, t.z, 6, buf)) {
      if (u.dead || u.air) continue;
      const d = Math.hypot(u.x - t.x, u.z - t.z), k = Math.max(0, 1 - d / 6);
      damage(u, (u.isInf ? 45 : 30) * k * dt, null);
      // infantry get dragged around the funnel
      if (u.isInf && !u.dead && d > 0.3) { const a = Math.atan2(u.z - t.z, u.x - t.x) + dt * 2.5; const nx = t.x + Math.cos(a) * d * 0.98, nz = t.z + Math.sin(a) * d * 0.98; if (u.canStand(nx, nz)) { u.x = nx; u.z = nz; } }
    }
    for (const b of G.buildings) if (!b.dead && b.faction !== 'neutral' && distTo(b, t.x, t.z) < 4) damage(b, 22 * dt, null);
    // visuals
    const m = t.mesh, fade = Math.min(1, t.age / 2, (t.life - t.age) / 2);
    m.position.set(t.x, groundY(t.x, t.z), t.z);
    m.visible = isVisibleAt(t.x, t.z) || G.revealed;
    for (const ring of m.children) { ring.rotation.y += dt * (4 + ring.userData.k * 0.4); ring.position.x = Math.sin(G.time * 1.3 + ring.userData.k * 0.5) * ring.userData.k * 0.18; ring.material.opacity = 0.38 * fade; }
    m.scale.setScalar(0.3 + 0.7 * fade);
    if (m.visible && Math.random() < 0.8) { FX.dust(t.x + (Math.random() - 0.5) * 6, t.z + (Math.random() - 0.5) * 6, 2.5); }
    if (t.age >= t.life) { G.three.scene.remove(m); tornadoes.splice(i, 1); }
  }
}
