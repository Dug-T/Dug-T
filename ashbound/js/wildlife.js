// The island's animals: crabs scuttling on the beaches, goats on the high ridges, and schools of fish in the shallows.
// Crabs and fish are instanced, so dozens of them cost a handful of draw calls.
import * as THREE from 'three';
import { mergeGeometries } from '../lib/utils/BufferGeometryUtils.js';
import { heightAt, normalAt, SEA, W, distToVolcano, VOLCANO } from './island.js';
import { rng } from './textures.js';
import { mat } from './survivor.js';
import { resolveObstacles } from './npcs.js';

const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(), P = new THREE.Vector3();
const place = (g, pos, rot = [0, 0, 0], scl = [1, 1, 1]) => { E.set(...rot); Q.setFromEuler(E); M.compose(P.set(...pos), Q, S.set(...scl)); g.applyMatrix4(M); return g.index ? g.toNonIndexed() : g; };

function crabGeometries() {
  const body = [
    place(new THREE.SphereGeometry(0.12, 12, 8), [0, 0.08, 0], [0, 0, 0], [1.25, 0.5, 1]),
    place(new THREE.SphereGeometry(0.05, 8, 6), [0.13, 0.09, 0.12], [0, 0, 0], [1, 0.7, 1.4]), place(new THREE.SphereGeometry(0.05, 8, 6), [-0.13, 0.09, 0.12], [0, 0, 0], [1, 0.7, 1.4]),
    place(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 4), [0.035, 0.14, 0.08]), place(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 4), [-0.035, 0.14, 0.08]),
  ];
  const legs = [];
  for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) legs.push(place(new THREE.CylinderGeometry(0.01, 0.008, 0.16, 4), [sd * 0.15, 0.05, -0.05 + i * 0.06], [0, 0, sd * 1.1]));
  return [mergeGeometries(body), mergeGeometries(legs)];
}
function fishGeometry() {
  const b = new THREE.SphereGeometry(0.09, 10, 6); b.scale(0.45, 0.6, 1.6);
  const tail = new THREE.ConeGeometry(0.06, 0.12, 4); tail.rotateX(-Math.PI / 2); tail.scale(0.3, 1, 1); tail.translate(0, 0, -0.19);
  return mergeGeometries([b.toNonIndexed(), tail.toNonIndexed()]);
}
function buildGoat(r) {
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const coat = mat(r() < 0.5 ? '#e8e2d6' : '#7a5a3a', 0.95), horn = mat('#3a3028', 0.7), hoof = mat('#1a1410', 0.6);
  const torso = mergeGeometries([place(new THREE.CapsuleGeometry(0.22, 0.6, 4, 10), [0, 0.75, 0], [Math.PI / 2, 0, 0]), place(new THREE.CapsuleGeometry(0.09, 0.18, 4, 8), [0, 0.95, 0.42], [-0.6, 0, 0])]);
  const body = new THREE.Mesh(torso, coat); g.add(body);
  const head = new THREE.Group(); head.position.set(0, 1.05, 0.55); g.add(head);
  head.add(new THREE.Mesh(mergeGeometries([place(new THREE.CapsuleGeometry(0.08, 0.16, 4, 8), [0, 0, 0.06], [1.3, 0, 0]), place(new THREE.ConeGeometry(0.04, 0.12, 5), [0, -0.12, 0.08], [Math.PI, 0, 0])]), coat));
  head.add(new THREE.Mesh(mergeGeometries([place(new THREE.TorusGeometry(0.08, 0.018, 5, 10, Math.PI * 0.9), [0.05, 0.08, -0.02], [0, Math.PI / 2, 0.5]), place(new THREE.TorusGeometry(0.08, 0.018, 5, 10, Math.PI * 0.9), [-0.05, 0.08, -0.02], [0, Math.PI / 2, -0.5])]), horn));
  const legs = [];
  for (const [x, z] of [[-0.12, 0.3], [0.12, 0.3], [-0.12, -0.3], [0.12, -0.3]]) {
    const hip = new THREE.Group(); hip.position.set(x, 0.65, z); g.add(hip);
    hip.add(new THREE.Mesh(mergeGeometries([place(new THREE.CapsuleGeometry(0.04, 0.5, 3, 6), [0, -0.3, 0]), place(new THREE.CylinderGeometry(0.045, 0.05, 0.06, 6), [0, -0.6, 0])]), coat));
    legs.push(hip);
  }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 5), coat); tail.position.set(0, 0.9, -0.5); tail.rotation.x = -0.8; g.add(tail);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return { group: g, head, legs, tail, hoof };
}

export class Wildlife {
  constructor(scene, world, quality, hooks = {}) {
    this.scene = scene; this.world = world; this.hooks = hooks; this.t = 0;
    const r = rng(777), hi = quality === 'high' || quality === 'ultra';
    // ---- crabs ----
    const [cb, cl] = crabGeometries();
    this.crabs = []; const nc = hi ? 18 : 10;
    this.crabBody = new THREE.InstancedMesh(cb, mat('#d8502a', 0.55), nc); this.crabLegs = new THREE.InstancedMesh(cl, mat('#a83a1a', 0.6), nc);
    for (const m of [this.crabBody, this.crabLegs]) { m.frustumCulled = false; m.castShadow = true; scene.add(m); }
    for (let i = 0; i < nc; i++) { const c = { i, x: 0, z: 0, yaw: r() * 6.3, state: 'idle', t: r() * 3, hideT: 0, speed: 0, ph: r() * 6 }; this.spawnCrab(c, r); this.crabs.push(c); }
    // ---- goats ----
    this.goats = [];
    let tries = 0;
    while (this.goats.length < (hi ? 7 : 4) && tries++ < 4000) {
      const x = (r() - 0.5) * W * 0.8, z = (r() - 0.5) * W * 0.8, h = heightAt(x, z);
      if (h < 28 || h > 85 || 1 - normalAt(x, z).y > 0.4 || distToVolcano(x, z) < 150) continue;
      const g = buildGoat(r); g.group.position.set(x, h, z); scene.add(g.group);
      this.goats.push({ ...g, x, z, y: h, yaw: r() * 6.3, home: { x, z }, tx: x, tz: z, speed: 0, ph: r() * 6, t: r() * 5, wanderT: 0, bleatT: 5 + r() * 20, dead: false });
    }
    // ---- fish ----
    this.schools = [];
    const fg = fishGeometry(), per = 8;
    const spots = [];
    tries = 0;
    while (spots.length < (hi ? 8 : 5) && tries++ < 20000) {
      const a = r() * Math.PI * 2, d = 150 + r() * 220, x = Math.cos(a) * d, z = Math.sin(a) * d, h = heightAt(x, z);
      if (h > -0.6 || h < -3.5) continue; // the shallows: wadeable, but deep enough to swim in
      if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < 40)) continue;
      spots.push({ x, z });
    }
    this.fishMesh = new THREE.InstancedMesh(fg, new THREE.MeshStandardMaterial({ color: '#9ab8c8', roughness: 0.3, metalness: 0.6 }), Math.max(1, spots.length * per));
    this.fishMesh.frustumCulled = false; scene.add(this.fishMesh);
    spots.forEach((sp, k) => { const fish = []; for (let j = 0; j < per; j++) fish.push({ ph: r() * 6.3, rad: 1.2 + r() * 2.2, dy: r() * 0.25, sp: 0.6 + r() * 0.5, gone: 0 }); this.schools.push({ ...sp, fish, scatter: 0, idx: k * per }); });
  }
  spawnCrab(c, r = Math.random) {
    for (let k = 0; k < 400; k++) { const a = r() * Math.PI * 2, d = 120 + r() * 280, x = Math.cos(a) * d, z = Math.sin(a) * d, h = heightAt(x, z); if (h > 0.6 && h < 3.2) { c.x = x; c.z = z; c.state = 'idle'; return; } }
    c.state = 'hidden'; c.hideT = 30;
  }
  nearestCrab(x, z, rr) { let best = null, bd = rr; for (const c of this.crabs) { if (c.state === 'hidden') continue; const d = Math.hypot(c.x - x, c.z - z); if (d < bd) { bd = d; best = c; } } return best; }
  catchCrab(c) { c.state = 'hidden'; c.hideT = 40 + Math.random() * 40; }
  // the nearest fish that is still there, within reach of (x, z)
  nearestFish(x, z, rr) {
    let best = null, bd = rr;
    for (const s of this.schools) { if (Math.hypot(s.x - x, s.z - z) > rr + 5) continue; for (const f of s.fish) { if (f.gone > 0) continue; const fx = s.x + Math.cos(f.ph) * f.rad, fz = s.z + Math.sin(f.ph) * f.rad, d = Math.hypot(fx - x, fz - z); if (d < bd) { bd = d; best = { s, f }; } } }
    return best;
  }
  update(dt, ctx) {
    this.t += dt;
    const { player, stageIdx, heatAt } = ctx;
    // crabs: wander, then dash sideways away from you and dive for the water
    this.crabs.forEach((c) => {
      if (c.state === 'hidden') { c.hideT -= dt; if (c.hideT <= 0 && stageIdx < 3) this.spawnCrab(c); M.makeScale(0, 0, 0); this.crabBody.setMatrixAt(c.i, M); this.crabLegs.setMatrixAt(c.i, M); return; }
      const dp = Math.hypot(player.x - c.x, player.z - c.z);
      let want = 0, dir = c.yaw + Math.PI / 2; // crabs walk sideways
      if (dp < 4.5 || stageIdx >= 3) { c.state = 'flee'; const away = Math.atan2(c.x - player.x, c.z - player.z); dir = away; want = 2.2; let d = away - Math.PI / 2 - c.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; c.yaw += d * Math.min(1, dt * 10); }
      else { c.state = 'idle'; c.t -= dt; if (c.t <= 0) { c.t = 1 + Math.random() * 3; c.wdir = Math.random() < 0.5 ? 1 : -1; c.go = Math.random() < 0.6; } if (c.go) { want = 0.5; dir = c.yaw + c.wdir * Math.PI / 2; } }
      c.speed += (want - c.speed) * Math.min(1, dt * 8);
      if (c.speed > 0.05) { const nx = c.x + Math.sin(dir) * c.speed * dt, nz = c.z + Math.cos(dir) * c.speed * dt, h = heightAt(nx, nz); if (h < 0.2) { this.catchCrab(c); return; } if (h < 6) { c.x = nx; c.z = nz; } }
      c.ph += dt * c.speed * 14;
      const y = heightAt(c.x, c.z);
      E.set(0, c.yaw, 0); Q.setFromEuler(E); M.compose(P.set(c.x, y, c.z), Q, S.set(1, 1, 1)); this.crabBody.setMatrixAt(c.i, M);
      E.set(Math.sin(c.ph) * 0.25, c.yaw, Math.cos(c.ph) * 0.12); Q.setFromEuler(E); M.compose(P.set(c.x, y + Math.abs(Math.sin(c.ph)) * 0.01, c.z), Q, S.set(1, 1, 1)); this.crabLegs.setMatrixAt(c.i, M);
    });
    this.crabBody.instanceMatrix.needsUpdate = true; this.crabLegs.instanceMatrix.needsUpdate = true;
    // goats: graze, wander, bolt from you, and leave the mountain as it wakes
    for (const g of this.goats) {
      if (g.dead) continue;
      g.t += dt; g.wanderT -= dt;
      const dp = Math.hypot(player.x - g.x, player.z - g.z);
      let want = 0, mx = 0, mz = 0;
      if (dp < 12) { const d = dp || 1; mx = (g.x - player.x) / d; mz = (g.z - player.z) / d; want = 6; }
      else if (stageIdx >= 1 && distToVolcano(g.x, g.z) < 260) { const d = distToVolcano(g.x, g.z) || 1; mx = (g.x - VOLCANO.x) / d; mz = (g.z - VOLCANO.z) / d; want = stageIdx >= 3 ? 5 : 1.4; }
      else { if (g.wanderT <= 0) { g.wanderT = 3 + Math.random() * 6; const a = Math.random() * 6.3, rr = Math.random() * 14; g.tx = g.home.x + Math.cos(a) * rr; g.tz = g.home.z + Math.sin(a) * rr; } const dx = g.tx - g.x, dz = g.tz - g.z, d = Math.hypot(dx, dz); if (d > 0.6) { mx = dx / d; mz = dz / d; want = 0.9; } }
      if (want > 0 && heatAt(g.x + mx * 4, g.z + mz * 4) > 0) { const t = mx; mx = -mz; mz = t; }
      g.speed += (want - g.speed) * Math.min(1, dt * 4);
      if (g.speed > 0.05) {
        let nx = g.x + mx * g.speed * dt, nz = g.z + mz * g.speed * dt; const rr = resolveObstacles(nx, nz, 0.5, this.world); nx = rr.x; nz = rr.z;
        if (heightAt(nx, nz) > 1) { g.x = nx; g.z = nz; }
        let d = Math.atan2(mx, mz) - g.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; g.yaw += d * Math.min(1, dt * 5);
      }
      g.y = heightAt(g.x, g.z);
      const n = normalAt(g.x, g.z), fx = Math.sin(g.yaw), fz = Math.cos(g.yaw);
      g.group.position.set(g.x, g.y, g.z); g.group.rotation.set(Math.asin(Math.max(-0.5, Math.min(0.5, n.x * fx + n.z * fz))) * 0.8, g.yaw, 0);
      const moving = g.speed > 0.2; g.ph += dt * (moving ? 3 + g.speed * 1.8 : 0);
      const sw = moving ? Math.min(0.8, 0.3 + g.speed * 0.1) : 0;
      g.legs[0].rotation.x = Math.sin(g.ph) * sw; g.legs[3].rotation.x = Math.sin(g.ph) * sw; g.legs[1].rotation.x = -Math.sin(g.ph) * sw; g.legs[2].rotation.x = -Math.sin(g.ph) * sw;
      g.head.rotation.x = moving ? 0 : 0.9 + Math.sin(g.t * 1.7) * 0.1; // head down, grazing
      g.tail.rotation.z = Math.sin(g.t * 9) * 0.3;
      g.bleatT -= dt; if (g.bleatT <= 0) { g.bleatT = 12 + Math.random() * 25; if (dp < 60 && this.hooks.onBleat) this.hooks.onBleat(dp); }
      if (heatAt(g.x, g.z) > 0.6) { g.dead = true; g.group.rotation.z = Math.PI / 2; }
    }
    // fish: circling in their schools, scattering when startled; the speared ones come back in time
    for (const s of this.schools) {
      s.scatter = Math.max(0, s.scatter - dt);
      s.fish.forEach((f, j) => {
        if (f.gone > 0) { f.gone -= dt; M.makeScale(0, 0, 0); this.fishMesh.setMatrixAt(s.idx + j, M); return; }
        f.ph += dt * f.sp * (1 + s.scatter * 2);
        const rad = f.rad * (1 + s.scatter * 0.8), x = s.x + Math.cos(f.ph) * rad, z = s.z + Math.sin(f.ph) * rad;
        const floor = heightAt(x, z), y = Math.min(SEA - 0.25 - f.dy, Math.max(floor + 0.15, SEA - 0.6 - f.dy));
        E.set(0, -f.ph, Math.sin(this.t * 8 + j) * 0.15); Q.setFromEuler(E); M.compose(P.set(x, y, z), Q, S.set(1, 1, 1 + Math.sin(this.t * 10 + j) * 0.05)); this.fishMesh.setMatrixAt(s.idx + j, M);
      });
    }
    this.fishMesh.instanceMatrix.needsUpdate = true;
  }
}
