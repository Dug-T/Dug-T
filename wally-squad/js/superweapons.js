// Superweapons: the Wally Squad's Sky Lance orbital strike and the Grimlock Doom Missile.
import * as THREE from 'three';
import { G, later, rr } from './state.js';
import { SUPERWEAPONS, FACTIONS } from './config.js';
import { groundY, heightAt } from './terrain.js';
import { damage, decay, distTo, alive } from './entities.js';
import * as FX from './particles.js';
import { M } from './materials.js';

function superBuilding(f) {
  return G.buildings.find(b => !b.dead && b.faction === f && b.def.superweapon && b.buildAnim >= 1);
}

export function superState(f) {
  const P = G.players[f];
  if (!P || !P.super) return null;
  const sw = SUPERWEAPONS[P.super.type];
  return { name: sw.name, charge: P.super.charge, max: sw.charge, ready: P.super.charge >= sw.charge, type: P.super.type };
}

export function updateSuper(dt) {
  for (const f in G.players) {
    const P = G.players[f];
    const b = superBuilding(f);
    if (!b) { P.super = null; continue; }
    const type = b.def.superweapon;
    if (!P.super || P.super.type !== type) {
      P.super = { type, charge: 0, warned: false };
      if (f !== G.player) G.announce?.(`Warning: enemy ${SUPERWEAPONS[type].name} detected`, G.player);
    }
    const sw = SUPERWEAPONS[type];
    const powered = P.powerProd >= P.powerUse;
    const before = P.super.charge;
    if (powered) P.super.charge = Math.min(sw.charge, P.super.charge + dt);
    if (before < sw.charge && P.super.charge >= sw.charge) {
      if (f === G.player) G.announce?.(`${sw.name} ready`, G.player);
      else G.announce?.(`Warning: enemy ${sw.name} is armed`, G.player);
    }
    // building animation
    const ready = P.super.charge >= sw.charge;
    const k = P.super.charge / sw.charge;
    const m = b.model;
    if (type === 'doom') {
      const L = m.getObjectByName('siloL'), Rr = m.getObjectByName('siloR'), mis = m.getObjectByName('missile');
      const open = ready ? 1 : 0;
      if (L) { L.position.x += ((-0.75 - open * 1.5) - L.position.x) * Math.min(1, dt * 2); Rr.position.x += ((0.75 + open * 1.5) - Rr.position.x) * Math.min(1, dt * 2); }
      if (mis) mis.position.y += ((ready ? 0.9 : -3.2) - mis.position.y) * Math.min(1, dt * 1.2);
    } else if (b.core) {
      const s = 0.6 + k * 1.2 + (ready ? Math.sin(G.time * 8) * 0.25 : 0);
      b.core.scale.setScalar(s);
    }
  }
}

// ------------------------------------------------------------------ firing
export function fireSuperweapon(f, x, z) {
  const P = G.players[f];
  const st = superState(f);
  if (!st || !st.ready) return false;
  P.super.charge = 0;
  const b = superBuilding(f);
  if (f !== G.player) G.alertAt = { x, z, t: G.time };
  if (st.type === 'skylance') skyLance(f, x, z);
  else doomMissile(f, b, x, z);
  return true;
}

function applyBlast(f, type, x, z) {
  const sw = SUPERWEAPONS[type];
  for (const u of G.units) {
    if (u.dead) continue;
    const d = Math.hypot(u.x - x, u.z - z);
    if (d < sw.radius) damage(u, sw.damage * Math.pow(1 - d / sw.radius, 0.6), null);
  }
  for (const b of G.buildings) {
    if (b.dead) continue;
    const d = distTo(b, x, z);
    if (d < sw.radius) damage(b, sw.damage * 0.85 * Math.pow(1 - d / sw.radius, 0.5), null);
  }
  void f;
}

const add = (o) => { G.three.scene.add(o); return o; };
const glowMat = (c, op = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

function skyLance(f, x, z) {
  const y = groundY(x, z);
  G.announce?.(f === G.player ? 'Sky Lance firing' : 'Warning: orbital strike incoming', G.player, 1);
  G.sfx?.play('beep', x, z);
  // targeting laser and a shrinking ring of light while the satellite aligns
  const aim = add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 200, 6, 1, true), glowMat(new THREE.Color(3, 0.6, 0.4), 0.8)));
  aim.position.set(x, y + 100, z);
  const ring = add(new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48).rotateX(-Math.PI / 2), glowMat(new THREE.Color(2.5, 0.8, 0.5), 0.9)));
  ring.position.set(x, y + 0.3, z);
  let t = 0;
  decay.push({ update: dt => {
    t += dt;
    const r = 12 * Math.max(0.05, 1 - t / 2.5);
    ring.scale.set(r, 1, r); ring.rotation.y += dt * 2;
    aim.material.opacity = 0.5 + Math.sin(t * 30) * 0.3;
    if (t > 2.5) { G.three.scene.remove(aim); G.three.scene.remove(ring); return false; }
    return true;
  } });
  later(2.5, () => {
    // the lance itself
    const core = add(new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 240, 16, 1, true), glowMat(new THREE.Color(3, 3.4, 4.5))));
    const halo = add(new THREE.Mesh(new THREE.CylinderGeometry(3.5, 5.5, 240, 20, 1, true), glowMat(new THREE.Color(0.6, 1.2, 3), 0.5)));
    core.position.set(x, y + 120, z); halo.position.set(x, y + 120, z);
    const light = new THREE.PointLight(0x9fd0ff, 4000, 80, 2); light.position.set(x, y + 6, z); add(light);
    FX.explosion(x, y + 0.5, z, 3.2, { force: true });
    FX.shake(x, z, 2.5);
    G.sfx?.explosion(x, z, 4);
    G.sfx?.play('beam', x, z);
    let k = 0;
    decay.push({ update: dt => {
      k += dt;
      const w = k < 0.3 ? k / 0.3 : Math.max(0, 1 - (k - 1.6) / 0.6);
      core.scale.set(w + Math.sin(k * 50) * 0.08, 1, w + Math.sin(k * 50) * 0.08); halo.scale.set(w * (1 + k * 0.4), 1, w * (1 + k * 0.4));
      core.material.opacity = w; halo.material.opacity = w * 0.45; light.intensity = 4000 * w;
      if (k < 1.8 && Math.random() < 0.6) { const a = Math.random() * 6.28, d = Math.random() * 7; FX.explosion(x + Math.cos(a) * d, y + 0.5, z + Math.sin(a) * d, rr(0.8, 1.6), { force: true, sound: Math.random() < 0.3 }); }
      FX.sparkBurst(x + rr(-1, 1), y + rr(0, 8), z + rr(-1, 1), 4, [2, 2.6, 4, 1]);
      if (k > 2.3) { G.three.scene.remove(core); G.three.scene.remove(halo); G.three.scene.remove(light); return false; }
      return true;
    } });
    applyBlast(f, 'skylance', x, z);
    later(0.6, () => applyBlast(f, 'skylance', x, z));
    for (let i = 0; i < 5; i++) FX.scorch(x + rr(-5, 5), z + rr(-5, 5), rr(3, 6));
  });
}

function doomMissile(f, silo, x, z) {
  G.announce?.(f === G.player ? 'Doom Missile launched' : 'Warning: nuclear launch detected', G.player, 1);
  const missileMat = M().metal;
  const mk = () => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 3.4, 16), missileMat); body.castShadow = true; g.add(body);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.2, 16), M().lampRed); nose.position.y = 2.3; g.add(nose);
    return g;
  };
  // launch
  if (silo) {
    const sx = silo.x, sz = silo.z, sy = silo.baseY + 2.5;
    const mis = silo.model.getObjectByName('missile'); if (mis) mis.position.y = -3.2;
    const rocket = add(mk()); rocket.position.set(sx, sy, sz);
    FX.explosion(sx, sy, sz, 1.6, { force: true, debris: false });
    for (let i = 0; i < 40; i++) FX.dust(sx + rr(-4, 4), sz + rr(-4, 4), 3);
    G.sfx?.play('rocket', sx, sz);
    let t = 0, vy = 2;
    decay.push({ update: dt => {
      t += dt; vy += dt * 30;
      rocket.position.y += vy * dt;
      FX.trail(rocket.position.x, rocket.position.y - 2, rocket.position.z, true);
      FX.fireSmoke(rocket.position.x, rocket.position.y - 2.2, rocket.position.z, 1.2);
      if (t > 4) { G.three.scene.remove(rocket); return false; }
      return true;
    } });
  }
  // descent
  later(5, () => {
    const y0 = groundY(x, z);
    const rocket = add(mk()); rocket.rotation.x = Math.PI; rocket.position.set(x, y0 + 140, z);
    const ring = add(new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2), glowMat(new THREE.Color(3, 0.5, 0.3), 0.9)));
    ring.position.set(x, y0 + 0.3, z); ring.scale.setScalar(SUPERWEAPONS.doom.radius);
    G.sfx?.play('rocket', x, z);
    let t = 0;
    decay.push({ update: dt => {
      t += dt;
      rocket.position.y = y0 + 140 * Math.max(0, 1 - t / 1.5);
      FX.trail(x, rocket.position.y + 2, z, true);
      ring.material.opacity = 0.5 + Math.sin(t * 25) * 0.4;
      if (t >= 1.5) { G.three.scene.remove(rocket); G.three.scene.remove(ring); return false; }
      return true;
    } });
  });
  later(6.5, () => {
    const y = groundY(x, z);
    nukeFX(x, y, z);
    applyBlast(f, 'doom', x, z);
    later(0.5, () => applyBlast(f, 'doom', x, z));
  });
}

function nukeFX(x, y, z) {
  FX.explosion(x, y + 1, z, 4.5, { force: true });
  FX.shake(x, z, 3);
  G.sfx?.explosion(x, z, 6);
  const flash = new THREE.PointLight(0xffc080, 9000, 140, 2); flash.position.set(x, y + 10, z); add(flash);
  const shock = add(new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 64).rotateX(-Math.PI / 2), glowMat(new THREE.Color(2.5, 1.6, 0.8), 0.9)));
  shock.position.set(x, y + 0.5, z);
  const ball = add(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), glowMat(new THREE.Color(4, 2.2, 0.8), 1)));
  ball.position.set(x, y + 2, z);
  for (let i = 0; i < 8; i++) FX.scorch(x + rr(-7, 7), z + rr(-7, 7), rr(4, 8));
  let t = 0;
  decay.push({ update: dt => {
    t += dt;
    flash.intensity = 9000 * Math.max(0, 1 - t / 1.2);
    const r = 3 + t * 40; shock.scale.set(r, 1, r); shock.material.opacity = Math.max(0, 0.9 - t / 1.4);
    // fireball rises to become the mushroom cap
    const cy = y + 2 + Math.min(1, t / 3) * 22;
    ball.position.y = cy; ball.scale.setScalar(4 + Math.min(1, t / 3) * 4); ball.material.opacity = Math.max(0, 1 - t / 4);
    if (t < 6) {
      for (let i = 0; i < 3; i++) FX.fireSmoke(x + rr(-1.5, 1.5), y + rr(1, cy - y), z + rr(-1.5, 1.5), 2.5); // stem
      for (let i = 0; i < 4; i++) { const a = Math.random() * 6.28, d = rr(2, 9); FX.fireSmoke(x + Math.cos(a) * d, cy + rr(-2, 3), z + Math.sin(a) * d, 3.5); } // cap
      if (t < 1.2) for (let i = 0; i < 6; i++) { const a = Math.random() * 6.28, d = r * 0.4; FX.dust(x + Math.cos(a) * d, z + Math.sin(a) * d, 3); }
      if (Math.random() < 0.4) { const a = Math.random() * 6.28, d = rr(0, 10); FX.explosion(x + Math.cos(a) * d, y + 0.5, z + Math.sin(a) * d, rr(0.6, 1.2), { force: true, sound: false }); }
    }
    if (t > 7) { G.three.scene.remove(flash); G.three.scene.remove(shock); G.three.scene.remove(ball); return false; }
    return true;
  } });
}

// AI helper: best target = densest cluster of enemy structures
export function aiSuperTarget(f) {
  let best = null, bs = 0;
  for (const b of G.buildings) {
    if (b.dead || b.faction === f || b.def.isMine || b.def.isWall) continue;
    let s = 0;
    for (const o of G.buildings) if (!o.dead && o.faction === b.faction && Math.hypot(o.x - b.x, o.z - b.z) < 10) s += o.def.cost;
    for (const u of G.units) if (!u.dead && u.faction === b.faction && Math.hypot(u.x - b.x, u.z - b.z) < 10) s += u.def.cost * 0.5;
    if (s > bs) { bs = s; best = b; }
  }
  return best && { x: best.x, z: best.z };
}
void FACTIONS; void heightAt; void alive;
