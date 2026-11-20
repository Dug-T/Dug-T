// Natural Disasters mutator: tornadoes that roam across the battlefield, tossing infantry, battering
// vehicles and buildings. Movement and damage use the seeded simulation RNG (online-safe); the
// funnel mesh and dust are only visuals.
import * as THREE from 'three';
import { G, srand, srr, later, emit } from './state.js';
import { timeOfDay } from './weather.js';
import { HALF } from './config.js';
import { groundY, isVisibleAt, blastTrees, currentMap } from './terrain.js';
import { unitsNear, damage, distTo } from './entities.js';
import * as FX from './particles.js';

const tornadoes = [];
let nextT = 70, nextM = 120;
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

// ---- meteor shower: a warning, then a dozen burning rocks slam into one area of the map
function meteorShower() {
  // aim at a random unit or building so the shower lands where the action is
  const pool = [...G.units.filter(u => !u.dead && !u.air), ...G.buildings.filter(b => !b.dead && b.faction !== 'neutral')];
  const tgt = pool.length ? pool[Math.floor(srand() * pool.length)] : { x: 0, z: 0 };
  const cx = tgt.x + srr(-8, 8), cz = tgt.z + srr(-8, 8);
  G.announce?.('Warning: meteor shower!', G.player, 8);
  G.alertAt = { x: cx, z: cz, t: G.time };
  for (let i = 0; i < 12; i++) {
    const x = cx + srr(-14, 14), z = cz + srr(-14, 14), at = 2.5 + i * 0.45 + srr(0, 0.3);
    later(at - 1.2, () => fallingRock(x, z));   // visual streak, lands 1.2 s later
    later(at, () => {
      const y = groundY(x, z);
      FX.explosion(x, y + 0.5, z, 1.6, { sound: i % 3 === 0 });
      blastTrees(x, z, 4, 200);
      for (const u of unitsNear(x, z, 4.5, buf)) if (!u.air && !u.dead) damage(u, (u.isInf ? 90 : 120) * (1 - Math.hypot(u.x - x, u.z - z) / 5), null);
      for (const b of G.buildings) if (!b.dead && b.faction !== 'neutral' && distTo(b, x, z) < 3) damage(b, 110, null);
    });
  }
}
let rockGeo = null;
function fallingRock(x, z) {
  if (!(isVisibleAt(x, z) || G.revealed)) return;
  if (!rockGeo) rockGeo = new THREE.DodecahedronGeometry(0.7, 0);
  const m = new THREE.Mesh(rockGeo, new THREE.MeshStandardMaterial({ color: 0x3a2a20, emissive: 0xff6a20, emissiveIntensity: 1.6, roughness: 1 }));
  const gy = groundY(x, z), sx = x - 18, sy = gy + 45, sz = z - 10;
  m.position.set(sx, sy, sz); G.three.scene.add(m);
  let t = 0;
  const step = () => {
    t += 1 / 60; const k = Math.min(1, t / 1.2);
    m.position.set(sx + (x - sx) * k, sy + (gy - sy) * k, sz + (z - sz) * k);
    m.rotation.x += 0.2; m.rotation.y += 0.15;
    FX.trail?.(m.position.x, m.position.y, m.position.z, true);
    if (k < 1) requestAnimationFrame(step); else G.three.scene.remove(m);
  };
  requestAnimationFrame(step);
}

// ---- lightning strikes: during a thunderstorm, bolts sometimes hit the ground near troops
let strikeT = 10;
function updateStrikes(dt) {
  const W = G.weather;
  if (!W || W.type !== 'storm' || W.k < 0.6) return;
  strikeT -= dt;
  if (strikeT > 0) return;
  strikeT = srr(9, 18);
  const pool = G.units.filter(u => !u.dead && !u.boarded && !u.air && u.faction !== 'neutral');
  if (!pool.length) return;
  const tgt = pool[Math.floor(srand() * pool.length)];
  const x = tgt.x + srr(-3, 3), z = tgt.z + srr(-3, 3), y = groundY(x, z);
  if (isVisibleAt(x, z) || G.revealed) {
    FX.lightning([[x + srr(-6, 6), y + 70, z + srr(-6, 6)], [x, y + 0.2, z]]);
    FX.explosion(x, y + 0.3, z, 0.9, { sound: true });
  }
  blastTrees(x, z, 2, 160);
  for (const u of unitsNear(x, z, 3, buf)) if (!u.air && !u.dead) damage(u, (u.isInf ? 55 : 35) * (1 - Math.hypot(u.x - x, u.z - z) / 3.5), null);
}

// ---- Magma Rift: the volcano erupts every couple of minutes, raining lava bombs around a lava pool
let eruptT = 100;
function updateVolcano(dt) {
  const map = currentMap();
  if (!map || map.theme !== 'volcanic') return;
  eruptT -= dt;
  if (eruptT > 0) return;
  eruptT = srr(90, 150);
  const lakes = map.lakes || []; if (!lakes.length) return;
  const L = lakes[Math.floor(srand() * lakes.length)];
  G.announce?.('The volcano is erupting! Lava bombs incoming!', G.player, 8);
  G.alertAt = { x: L.x, z: L.z, t: G.time };
  for (let i = 0; i < 10; i++) {
    const a = srand() * Math.PI * 2, r = L.r * 0.6 + srr(2, 16);
    const x = L.x + Math.cos(a) * r, z = L.z + Math.sin(a) * r, at = 1.5 + i * 0.35 + srr(0, 0.3);
    later(at - 1.2, () => fallingRock(x, z));
    later(at, () => {
      const y = groundY(x, z);
      FX.explosion(x, y + 0.5, z, 1.4, { sound: i % 3 === 0 });
      for (let k = 0; k < 6; k++) G.fx?.ember?.(x, y + 0.5, z);
      blastTrees(x, z, 3.5, 200);
      for (const u of unitsNear(x, z, 4, buf)) if (!u.air && !u.dead) damage(u, (u.isInf ? 80 : 100) * (1 - Math.hypot(u.x - x, u.z - z) / 4.5), null);
      for (const b of G.buildings) if (!b.dead && b.faction !== 'neutral' && distTo(b, x, z) < 3) damage(b, 90, null);
    });
  }
}

// ---- Blood Moon: some nights (with the day-night cycle on) the moon turns red and every weapon hits 25% harder
let wasNight = false;
function updateBloodMoon() {
  if (!G.cfg.daynight || !G.weather) return;
  const tod = timeOfDay(), day = Math.max(0, Math.min(1, Math.sin((tod - 0.25) * Math.PI * 2) * 2 + 0.55));
  const night = day < 0.4;
  if (night && !wasNight) {
    G.bloodMoon = srand() < 0.35;
    if (G.bloodMoon) G.announce?.('A Blood Moon rises! Every weapon hits 25% harder tonight!', G.player, 8);
  } else if (!night && wasNight && G.bloodMoon) {
    G.bloodMoon = false;
    G.announce?.('The Blood Moon has set.', G.player, 2);
    emit('bloodmoon');
  }
  wasNight = night;
}

export function updateHazards(dt) {
  if (G.over) return;
  updateBloodMoon();
  updateStrikes(dt);
  updateVolcano(dt);
  if (!(G.cfg.mut && G.cfg.mut.includes('disasters'))) return;
  nextT -= dt;
  if (nextT <= 0) { nextT = srr(90, 150); spawn(); }
  nextM -= dt;
  if (nextM <= 0) { nextM = srr(80, 140); meteorShower(); }
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
