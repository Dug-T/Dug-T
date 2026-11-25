// Vehicles: the survey team's jeep. Arcade handling on the heightfield, suspension that leans with the
// ground, steering wheels, headlights, an engine note, seats for your followers, and a dislike of deep water.
import * as THREE from 'three';
import { heightAt, normalAt, SEA } from './island.js';
import { resolveObstacles } from './npcs.js';
import { mat } from './survivor.js';
import { signTexture, metalTexture } from './textures.js';

const _wp = new THREE.Vector3();
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (r1, r2, h, m, seg = 16) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m);

export function buildJeep() {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: '#5f7a3c', roughness: 0.55, metalness: 0.25 });
  const dark = mat('#1d1d1d', 0.6), rubber = mat('#161616', 0.95), steel = new THREE.MeshStandardMaterial({ map: metalTexture(), roughness: 0.45, metalness: 0.6 });
  const seatM = mat('#4a3a2a', 0.9), glass = new THREE.MeshStandardMaterial({ color: '#9ad0ff', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
  const body = new THREE.Group(); g.add(body); // everything that rides on the suspension
  // tub and bonnet
  const tub = box(1.7, 0.55, 3.7, paint); tub.position.set(0, 0.72, 0); body.add(tub);
  const bonnet = box(1.55, 0.32, 1.35, paint); bonnet.position.set(0, 1.08, 1.12); body.add(bonnet);
  for (const s of [-1, 1]) {
    const side = box(0.1, 0.5, 2.1, paint); side.position.set(s * 0.8, 1.2, -0.65); body.add(side); // cabin sides
    const guard = box(0.3, 0.12, 1.1, paint); guard.position.set(s * 0.95, 0.95, 1.1); body.add(guard); // front mudguards
    const guard2 = box(0.3, 0.12, 1.0, paint); guard2.position.set(s * 0.95, 0.9, -1.2); body.add(guard2);
    const mirror = box(0.06, 0.18, 0.12, dark); mirror.position.set(s * 1.0, 1.55, 0.35); body.add(mirror);
    const step = box(0.25, 0.06, 1.6, steel); step.position.set(s * 0.95, 0.5, -0.3); body.add(step);
  }
  const back = box(1.7, 0.5, 0.1, paint); back.position.set(0, 1.2, -1.85); body.add(back);
  const dash = box(1.5, 0.3, 0.3, dark); dash.position.set(0, 1.12, 0.35); body.add(dash);
  // grille, bumper, headlights
  const grille = box(1.0, 0.4, 0.08, dark); grille.position.set(0, 0.85, 1.86); body.add(grille);
  for (let i = -3; i <= 3; i++) { const slat = box(0.05, 0.36, 0.1, steel); slat.position.set(i * 0.13, 0.85, 1.88); body.add(slat); }
  const bumper = box(1.9, 0.14, 0.14, steel); bumper.position.set(0, 0.5, 1.92); body.add(bumper);
  const lamps = [];
  for (const s of [-1, 1]) {
    const rim = cyl(0.16, 0.16, 0.08, steel, 18); rim.rotation.x = Math.PI / 2; rim.position.set(s * 0.6, 0.9, 1.88); body.add(rim);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.13, 18), new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#fff0c0', emissiveIntensity: 0, roughness: 0.2 })); lens.position.set(s * 0.6, 0.9, 1.93); body.add(lens); lamps.push(lens);
    const spot = new THREE.SpotLight('#fff0c8', 0, 60, 0.55, 0.5, 1.2); spot.position.set(s * 0.6, 0.95, 1.9); spot.target.position.set(s * 0.6, 0.2, 20); body.add(spot, spot.target); lamps.push(spot);
    const tail = new THREE.Mesh(new THREE.CircleGeometry(0.08, 12), new THREE.MeshStandardMaterial({ color: '#500', emissive: '#ff2020', emissiveIntensity: 0.4 })); tail.rotation.y = Math.PI; tail.position.set(s * 0.6, 1.0, -1.91); body.add(tail);
  }
  // windscreen and roll cage
  const frameM = dark;
  const wsFrame = new THREE.Group(); wsFrame.position.set(0, 1.25, 0.5); wsFrame.rotation.x = -0.25;
  for (const s of [-1, 1]) { const p = box(0.06, 0.7, 0.06, frameM); p.position.set(s * 0.78, 0.35, 0); wsFrame.add(p); }
  const top = box(1.62, 0.06, 0.06, frameM); top.position.y = 0.7; wsFrame.add(top);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.62), glass); pane.position.y = 0.36; wsFrame.add(pane);
  body.add(wsFrame);
  const cage = new THREE.Group(); cage.position.set(0, 1.2, -0.75);
  for (const s of [-1, 1]) { const p = cyl(0.04, 0.04, 1.1, frameM, 10); p.position.set(s * 0.72, 0.55, 0); cage.add(p); }
  const cross = cyl(0.04, 0.04, 1.5, frameM, 10); cross.rotation.z = Math.PI / 2; cross.position.y = 1.1; cage.add(cross);
  for (const s of [-1, 1]) { const brace = cyl(0.035, 0.035, 1.2, frameM, 10); brace.rotation.x = 0.55; brace.position.set(s * 0.72, 0.6, -0.6); cage.add(brace); }
  body.add(cage);
  // seats and the wheel
  const seats = [];
  for (const [x, z] of [[-0.42, -0.15], [0.42, -0.15], [-0.42, -1.2], [0.42, -1.2]]) {
    const base = box(0.6, 0.15, 0.6, seatM); base.position.set(x, 0.95, z); body.add(base);
    const backrest = box(0.6, 0.6, 0.12, seatM); backrest.position.set(x, 1.3, z - 0.3); body.add(backrest);
    seats.push(new THREE.Vector3(x, 0.98, z + 0.05));
  }
  const col = cyl(0.03, 0.03, 0.45, dark, 8); col.rotation.x = 0.9; col.position.set(-0.42, 1.25, 0.2); body.add(col);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.025, 10, 24), dark); wheel.rotation.x = 0.9 - Math.PI / 2; wheel.position.set(-0.42, 1.4, 0.05); body.add(wheel);
  // the sign on the bonnet, a spare wheel and a jerry can
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.25), new THREE.MeshStandardMaterial({ map: signTexture('VOLCANO SURVEY', '#e8e0c8', '#2a2a2a'), roughness: 0.6 })); sign.rotation.x = -Math.PI / 2; sign.position.set(0, 1.245, 1.1); body.add(sign);
  const spare = cyl(0.4, 0.4, 0.26, rubber, 20); spare.rotation.x = Math.PI / 2; spare.position.set(0.3, 1.1, -1.98); body.add(spare);
  const spareHub = cyl(0.22, 0.22, 0.28, steel, 14); spareHub.rotation.x = Math.PI / 2; spareHub.position.copy(spare.position); body.add(spareHub);
  const can = box(0.35, 0.45, 0.2, mat('#8a2a1a', 0.6)); can.position.set(-0.5, 1.1, -1.95); body.add(can);
  // wheels: front ones in steering pivots
  const wheels = [], pivots = [];
  for (const [x, z, front] of [[-0.92, 1.25, 1], [0.92, 1.25, 1], [-0.92, -1.25, 0], [0.92, -1.25, 0]]) {
    const pivot = new THREE.Group(); pivot.position.set(x, 0.42, z); body.add(pivot);
    const w = new THREE.Group(); pivot.add(w);
    const tyre = cyl(0.42, 0.42, 0.3, rubber, 22); tyre.rotation.z = Math.PI / 2; w.add(tyre);
    for (let i = 0; i < 14; i++) { const lug = box(0.3, 0.07, 0.09, rubber); lug.position.set(0, Math.cos(i / 14 * Math.PI * 2) * 0.42, Math.sin(i / 14 * Math.PI * 2) * 0.42); lug.rotation.x = -i / 14 * Math.PI * 2; w.add(lug); }
    const hub = cyl(0.24, 0.24, 0.32, steel, 14); hub.rotation.z = Math.PI / 2; w.add(hub);
    const nut = cyl(0.08, 0.08, 0.36, dark, 8); nut.rotation.z = Math.PI / 2; w.add(nut);
    wheels.push(w); if (front) pivots.push(pivot);
  }
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return { group: g, body, wheels, pivots, lamps, seats, paint };
}

export class Jeep {
  constructor(scene, x, z, yaw) {
    const m = buildJeep();
    Object.assign(this, m);
    this.scene = scene; this.x = x; this.z = z; this.y = heightAt(x, z); this.yaw = yaw; this.speed = 0; this.steer = 0; this.pitch = 0; this.roll = 0; this.bounce = 0;
    this.driver = null; this.riders = []; this.hp = 100; this.dead = false; this.flooded = false; this.lightsOn = false; this.smokeT = 0; this.rpm = 0;
    this.group.position.set(x, this.y, z); this.group.rotation.y = yaw;
    scene.add(this.group);
    this.normal = new THREE.Vector3(0, 1, 0);
  }
  get name() { return 'jeep'; }
  // drive it. ctx: { dt, move (x,y), brake, world, heatAt, dark, onHit(speed), fx }
  update(ctx) {
    const { dt, world } = ctx;
    const driving = !!this.driver && !this.dead;
    const mv = driving ? ctx.move : { x: 0, y: 0 };
    const grade = normalAt(this.x, this.z, this.normal);
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const uphill = -(grade.x * fx + grade.z * fz); // >0 when the nose points up a slope
    const depth = SEA - heightAt(this.x, this.z);
    // power, brakes and drag
    const maxF = 17, maxR = 6;
    let throttle = mv.y;
    if (this.flooded) throttle = 0;
    if (throttle > 0 && this.speed >= -0.5) this.speed += (maxF - Math.max(0, this.speed)) * 0.55 * throttle * dt;
    else if (throttle < 0 && this.speed <= 0.5) this.speed += (-maxR - Math.min(0, this.speed)) * 0.9 * -throttle * dt;
    else if (throttle !== 0) this.speed -= Math.sign(this.speed) * 14 * dt; // brakes
    if (ctx.brake) this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 18 * dt);
    this.speed -= this.speed * 0.35 * dt + Math.sign(this.speed) * Math.min(Math.abs(this.speed), 1.2 * dt);
    this.speed -= 9.81 * uphill * 0.9 * dt; // gravity along the slope
    if (grade.y < 0.56 && uphill > 0.3 && this.speed > 2) this.speed = 2; // it won't climb cliffs
    if (depth > 0.5) { this.speed *= 1 - Math.min(1, dt * 2.5); if (depth > 1.0 && !this.flooded) { this.flooded = true; if (ctx.onFlood) ctx.onFlood(); } }
    if (depth < 0.2) this.flooded = false;
    // steering: lighter at speed, and the car turns about its rear axle
    const target = mv.x * 0.6 / (1 + Math.abs(this.speed) / 14);
    this.steer += (target - this.steer) * Math.min(1, dt * 6);
    this.yaw -= (this.speed / 2.5) * Math.tan(this.steer) * dt;
    let nx = this.x + fx * this.speed * dt, nz = this.z + fz * this.speed * dt;
    // trees and boulders stop it
    const r = resolveObstacles(nx, nz, 1.3, world);
    if (Math.hypot(r.x - nx, r.z - nz) > 0.01) { if (Math.abs(this.speed) > 6 && ctx.onHit) ctx.onHit(Math.abs(this.speed)); this.hp -= Math.abs(this.speed) > 6 ? Math.abs(this.speed) * 1.5 : 0; this.speed *= -0.25; nx = r.x; nz = r.z; }
    const dc = Math.hypot(nx, nz); if (dc > 430) { nx *= 430 / dc; nz *= 430 / dc; this.speed *= -0.3; }
    this.x = nx; this.z = nz;
    // suspension: fit the body to the ground under the four wheels. The car's local +x is its LEFT side
    // (a yaw of 0 faces +z), so sample left at +x and right at -x.
    const lx = fz, lz = -fx;
    const corners = [[-0.92, 1.25], [0.92, 1.25], [-0.92, -1.25], [0.92, -1.25]]; // local (x, z) of each wheel, same order as this.wheels
    const hW = corners.map(([cx, cz]) => heightAt(this.x + lx * cx + fx * cz, this.z + lz * cx + fz * cz));
    const hF = (hW[0] + hW[1]) / 2, hB = (hW[2] + hW[3]) / 2, hL = (hW[1] + hW[3]) / 2, hR = (hW[0] + hW[2]) / 2;
    const ground = Math.max((hF + hB) / 2, SEA - 0.8);
    const pitchT = Math.atan2(hB - hF, 2.5) + this.speed * (throttle > 0 ? -0.004 : 0.006), rollT = Math.atan2(hL - hR, 1.84) - this.steer * this.speed * 0.012;
    this.pitch += (pitchT - this.pitch) * Math.min(1, dt * 9); this.roll += (rollT - this.roll) * Math.min(1, dt * 9);
    this.y += (ground - this.y) * Math.min(1, dt * 14);
    this.group.position.set(this.x, this.y, this.z); this.group.rotation.set(0, this.yaw, 0); this.body.rotation.set(this.pitch, 0, this.roll, 'YXZ');
    // each wheel then drops or lifts on its own spring to meet the ground exactly beneath it
    this.group.updateMatrixWorld(true);
    this.wheels.forEach((w, i) => {
      const pivot = w.parent; pivot.getWorldPosition(_wp);
      const gy = hW[i] + 0.42, travel = Math.max(-0.3, Math.min(0.3, gy - _wp.y));
      pivot.position.y += (0.42 + travel - pivot.position.y) * Math.min(1, dt * 16);
      w.rotation.x += this.speed / 0.42 * dt;
    });
    for (const p of this.pivots) p.rotation.y = this.steer;
    // headlights in the dark
    const want = ctx.dark && driving;
    if (want !== this.lightsOn) { this.lightsOn = want; this.lamps.forEach((l) => { if (l.isSpotLight) l.intensity = want ? 60 : 0; else l.material.emissiveIntensity = want ? 2.5 : 0; }); }
    this.rpm = driving ? Math.min(1, 0.15 + Math.abs(this.speed) / maxF + Math.max(0, throttle) * 0.2) : 0;
    // lava
    const heat = ctx.heatAt(this.x, this.z);
    if (heat > 0.3) this.damage(heat * 60 * dt, ctx);
    // smoke when hurt, fire when dead
    this.smokeT -= dt;
    if (this.hp < 50 && this.smokeT <= 0 && ctx.fx) { this.smokeT = this.dead ? 0.08 : 0.35; ctx.fx.emit(this.x + fx * 1.2, this.y + 1.4, this.z + fz * 1.2, 0, 1.5, 0, this.dead ? 2.2 : 1.2, 3, this.dead ? 0.9 : 0.6, 0.5, 1.5); }
    // the people inside
    if (this.driver) { this.driver.x = this.x; this.driver.z = this.z; this.driver.y = this.y; this.driver.yaw = this.yaw; }
    for (const n of this.riders) { n.x = this.x; n.z = this.z; n.y = this.y; }
  }
  damage(n, ctx) {
    if (this.dead) return;
    this.hp -= n;
    if (this.hp <= 0) { this.hp = 0; this.dead = true; this.paint.color.set('#2a2622'); this.paint.roughness = 1; this.lamps.forEach((l) => { if (l.isSpotLight) l.intensity = 0; }); if (ctx && ctx.onDestroyed) ctx.onDestroyed(); }
  }
  seatFor(index) { return this.seats[Math.min(index, this.seats.length - 1)]; }
  // put a rig in a seat (it becomes a child of the body so it leans with the car)
  seat(rig, index) { const s = this.seatFor(index); this.body.add(rig.root); rig.root.position.copy(s); rig.root.position.y -= 0.5; rig.root.rotation.set(0, 0, 0); }
  unseat(rig, scene) { this.body.remove(rig.root); scene.add(rig.root); }
  // where to stand when you climb out: the driver's side, or the other side if that is blocked
  exitSpot() {
    const lx = Math.cos(this.yaw), lz = -Math.sin(this.yaw);
    for (const s of [1, -1]) { const x = this.x + lx * s * 2.0, z = this.z + lz * s * 2.0; if (heightAt(x, z) > SEA - 1.0) return { x, z }; }
    return { x: this.x - Math.sin(this.yaw) * 3, z: this.z - Math.cos(this.yaw) * 3 };
  }
}
