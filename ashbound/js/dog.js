// Biscuit, Old Pete's dog: lost near the jungle spring when the tremors began. A small procedural
// quadruped that wanders, trots after whoever she is following, and rides along when they do.
import * as THREE from 'three';
import { heightAt, SEA, POIS, normalAt } from './island.js';
import { resolveObstacles } from './npcs.js';
import { mat } from './survivor.js';
import { groundTilt } from './survivor.js';

export function buildDog() {
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const fur = mat('#8a5a32', 0.95), light = mat('#d8b48a', 0.95), dark = mat('#2a1a10', 0.6), nose = mat('#111', 0.3);
  const body = new THREE.Group(); body.position.y = 0.42; g.add(body);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.42, 6, 14), fur); torso.rotation.x = Math.PI / 2; body.add(torso);
  const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.3, 4, 10), light); belly.rotation.x = Math.PI / 2; belly.position.y = -0.06; body.add(belly);
  const neck = new THREE.Group(); neck.position.set(0, 0.08, 0.3); body.add(neck);
  const nm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.12, 4, 10), fur); nm.rotation.x = -0.7; nm.position.set(0, 0.06, 0.04); neck.add(nm);
  const head = new THREE.Group(); head.position.set(0, 0.16, 0.1); neck.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), fur); skull.scale.set(1, 0.95, 1.1); head.add(skull);
  const snout = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.1, 4, 10), light); snout.rotation.x = Math.PI / 2; snout.position.set(0, -0.03, 0.13); head.add(snout);
  const nb = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), nose); nb.position.set(0, -0.015, 0.21); head.add(nb);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), dark); e.position.set(s * 0.05, 0.03, 0.09); head.add(e); }
  const ears = [];
  for (const s of [-1, 1]) {
    const ear = new THREE.Group(); ear.position.set(s * 0.07, 0.08, -0.01); head.add(ear);
    const em = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.13, 0.025), dark); em.position.y = 0.06; ear.add(em);
    ear.rotation.z = s * (s > 0 ? 2.6 : 0.35); // one ear flops over, the other stands up
    ears.push(ear);
  }
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.015, 6, 16), mat('#c9473a', 0.5)); collar.position.set(0, 0.04, 0.05); collar.rotation.x = Math.PI / 2 - 0.7; neck.add(collar);
  const legs = [];
  for (const [x, z] of [[-0.09, 0.22], [0.09, 0.22], [-0.09, -0.2], [0.09, -0.2]]) {
    const hip = new THREE.Group(); hip.position.set(x, -0.02, z); body.add(hip);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.28, 4, 8), fur); leg.position.y = -0.18; hip.add(leg);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), light); paw.scale.set(1, 0.6, 1.3); paw.position.set(0, -0.37, 0.02); hip.add(paw);
    legs.push(hip);
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.05, -0.33); body.add(tail);
  const tm = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.22, 4, 8), fur); tm.position.y = 0.12; tm.rotation.x = 0.1; tail.add(tm);
  tail.rotation.x = -0.7;
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return { group: g, body, head, neck, legs, tail, ears };
}

export class Dog {
  constructor(scene) {
    const m = buildDog(); Object.assign(this, m);
    const s = POIS.spring;
    this.home = { x: s.x + 9, z: s.z + 6 };
    this.x = this.home.x; this.z = this.home.z; this.y = heightAt(this.x, this.z); this.yaw = 0; this.speed = 0; this.phase = 0; this.t = 0;
    this.follow = null; // null while lost, 'player', or 'pete'
    this.dead = false; this.saved = false; this.wanderT = 0; this.tx = this.x; this.tz = this.z; this.barkT = 3; this.hidden = false;
    scene.add(this.group);
  }
  // target: { x, z, riding } of whoever she follows. ctx: { dt, world, heatAt, onBark(dist) }
  update(ctx, target, listener) {
    const dt = ctx.dt; this.t += dt;
    if (this.dead) { this.group.rotation.z = Math.PI / 2; this.group.position.y = this.y + 0.05; this.body.position.y = 0.15; return; }
    this.hidden = !!(target && target.riding) || this.saved;
    this.group.visible = !this.hidden;
    if (this.hidden) { if (target) { this.x = target.x; this.z = target.z; } return; }
    let want = 0, mx = 0, mz = 0;
    if (target) {
      const dx = target.x - this.x, dz = target.z - this.z, d = Math.hypot(dx, dz);
      if (d > 60) { this.x = target.x - dx / d * 4; this.z = target.z - dz / d * 4; }
      if (d > 2.2) { mx = dx / d; mz = dz / d; want = d > 7 ? 6.5 : 3.0; }
    } else {
      // lost: snuffling about near the spring
      this.wanderT -= dt;
      if (this.wanderT <= 0) { this.wanderT = 2 + Math.random() * 4; const a = Math.random() * 6.3, r = Math.random() * 7; this.tx = this.home.x + Math.cos(a) * r; this.tz = this.home.z + Math.sin(a) * r; }
      const dx = this.tx - this.x, dz = this.tz - this.z, d = Math.hypot(dx, dz);
      if (d > 0.5) { mx = dx / d; mz = dz / d; want = 1.6; }
      // someone comes close: she stops, turns to look and waits to be called
      if (listener && Math.hypot(listener.x - this.x, listener.z - this.z) < 8) {
        want = 0; this.waiting = true;
        let dd = Math.atan2(listener.x - this.x, listener.z - this.z) - this.yaw; while (dd > Math.PI) dd -= Math.PI * 2; while (dd < -Math.PI) dd += Math.PI * 2; this.yaw += dd * Math.min(1, dt * 4);
      } else this.waiting = false;
    }
    if (want > 0 && ctx.heatAt(this.x + mx * 3, this.z + mz * 3) > 0) { const t = mx; mx = -mz; mz = t; }
    this.speed += (want - this.speed) * Math.min(1, dt * 6);
    if (want > 0) {
      let nx = this.x + mx * this.speed * dt, nz = this.z + mz * this.speed * dt;
      const r = resolveObstacles(nx, nz, 0.3, ctx.world); nx = r.x; nz = r.z;
      if (heightAt(nx, nz) > SEA - 0.6) { this.x = nx; this.z = nz; }
      let d = Math.atan2(mx, mz) - this.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; this.yaw += d * Math.min(1, dt * 9);
    }
    this.y = Math.max(heightAt(this.x, this.z), SEA - 0.35);
    const tilt = groundTilt(normalAt(this.x, this.z), this.yaw, 0.8);
    this.group.position.set(this.x, this.y, this.z); this.group.rotation.set(tilt[0], this.yaw, tilt[1]);
    // the trot: diagonal pairs of legs together, a little bounce, the tail never stops
    const moving = this.speed > 0.2;
    this.phase += dt * (moving ? 4 + this.speed * 2.2 : 0);
    const sw = moving ? Math.min(0.75, 0.3 + this.speed * 0.08) : 0;
    this.legs[0].rotation.x = Math.sin(this.phase) * sw; this.legs[3].rotation.x = Math.sin(this.phase) * sw;
    this.legs[1].rotation.x = -Math.sin(this.phase) * sw; this.legs[2].rotation.x = -Math.sin(this.phase) * sw;
    this.body.position.y = 0.42 + (moving ? Math.abs(Math.cos(this.phase)) * 0.03 : Math.sin(this.t * 2) * 0.006);
    this.tail.rotation.z = Math.sin(this.t * (target || this.waiting ? 14 : 6)) * (target || this.waiting ? 0.6 : 0.25);
    this.neck.rotation.x = moving ? 0.1 : (target || this.waiting ? -0.1 : 0.35 + Math.sin(this.t * 1.3) * 0.15); // nose down, sniffing, while lost
    this.head.rotation.y = moving ? 0 : Math.sin(this.t * 0.7) * 0.5;
    this.stepPhase = this.phase;
    // a bark now and then, more when she first hears you
    this.barkT -= dt;
    if (this.barkT <= 0 && listener) { const dl = Math.hypot(listener.x - this.x, listener.z - this.z); this.barkT = target ? 9 + Math.random() * 14 : 4 + Math.random() * 6; if (dl < 45 && ctx.onBark) ctx.onBark(dl); }
  }
}
