// Vehicles: the survey team's jeep. Arcade handling on the heightfield, suspension that leans with the
// ground, steering wheels, headlights, an engine note, seats for your followers, and a dislike of deep water.
import * as THREE from 'three';
import { heightAt, normalAt, SEA } from './island.js';
import { resolveObstacles } from './npcs.js';
import { mat } from './survivor.js';
import { signTexture, metalTexture } from './textures.js';

const _wp = new THREE.Vector3();
// a soft cone of light in the air in front of a headlamp: brightest at the lamp, fading along its length and at its edges
const beamMat = new THREE.ShaderMaterial({
  uniforms: { uCol: { value: new THREE.Color('#fff0c8') }, uI: { value: 0.28 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  vertexShader: 'varying float vT; varying vec3 vN; varying vec3 vV; void main(){ vT = position.z / 13.0; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'uniform vec3 uCol; uniform float uI; varying float vT; varying vec3 vN; varying vec3 vV; void main(){ float a = uI * pow(1.0 - clamp(vT, 0.0, 1.0), 1.6) * pow(abs(dot(normalize(vN), normalize(vV))), 1.8); gl_FragColor = vec4(uCol * a, a); }',
});
function headBeam(x, y, z, len = 13, spread = 2.2) {
  const g = new THREE.CylinderGeometry(0.1, spread, len, 18, 1, true); g.translate(0, -len / 2, 0); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, beamMat); m.position.set(x, y, z); m.rotation.x = 0.07; m.visible = false; m.renderOrder = 6; return m;
}
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
    const beam = headBeam(s * 0.6, 0.9, 1.95); body.add(beam); lamps.push(beam);
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

export function buildQuad() {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: '#c0392b', roughness: 0.45, metalness: 0.3 });
  const dark = mat('#1d1d1d', 0.6), rubber = mat('#161616', 0.95), steel = mat('#8a9098', 0.4, { metalness: 0.7 }), seatM = mat('#222', 0.8);
  const body = new THREE.Group(); g.add(body);
  const frame = box(0.7, 0.25, 1.5, dark); frame.position.set(0, 0.55, 0); body.add(frame);
  const tank = box(0.62, 0.3, 0.55, paint); tank.position.set(0, 0.82, 0.3); tank.rotation.x = -0.12; body.add(tank);
  const seat = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.7, 4, 12), seatM); seat.rotation.x = Math.PI / 2; seat.scale.set(1.25, 1, 0.55); seat.position.set(0, 0.86, -0.3); body.add(seat);
  for (const [z, w] of [[0.62, 1.25], [-0.62, 1.25]]) { const fender = box(w, 0.08, 0.6, paint); fender.position.set(0, 0.82, z); body.add(fender); }
  const nose = box(0.55, 0.22, 0.35, paint); nose.position.set(0, 0.74, 0.88); nose.rotation.x = 0.35; body.add(nose);
  const rack = box(0.9, 0.04, 0.4, steel); rack.position.set(0, 0.92, -0.8); body.add(rack);
  const stem = cyl(0.03, 0.03, 0.4, steel, 8); stem.position.set(0, 1.0, 0.55); stem.rotation.x = -0.35; body.add(stem);
  const bars = cyl(0.025, 0.025, 0.8, dark, 8); bars.rotation.z = Math.PI / 2; bars.position.set(0, 1.18, 0.5); body.add(bars);
  for (const s of [-1, 1]) { const grip = cyl(0.035, 0.035, 0.12, rubber, 8); grip.rotation.z = Math.PI / 2; grip.position.set(s * 0.42, 1.18, 0.5); body.add(grip); }
  const lamps = [];
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#fff0c0', emissiveIntensity: 0, roughness: 0.2 })); lens.position.set(0, 0.8, 1.06); lens.rotation.x = 0.35; body.add(lens); lamps.push(lens);
  const spot = new THREE.SpotLight('#fff0c8', 0, 45, 0.6, 0.5, 1.2); spot.position.set(0, 0.85, 1.05); spot.target.position.set(0, 0.1, 15); body.add(spot, spot.target); lamps.push(spot);
  const beam = headBeam(0, 0.8, 1.1, 11, 2.0); body.add(beam); lamps.push(beam);
  const tail = new THREE.Mesh(new THREE.CircleGeometry(0.05, 10), new THREE.MeshStandardMaterial({ color: '#500', emissive: '#ff2020', emissiveIntensity: 0.4 })); tail.rotation.y = Math.PI; tail.position.set(0, 0.8, -1.01); body.add(tail);
  const wheels = [], pivots = [];
  for (const [x, z, front] of [[-0.55, 0.62, 1], [0.55, 0.62, 1], [-0.55, -0.62, 0], [0.55, -0.62, 0]]) {
    const pivot = new THREE.Group(); pivot.position.set(x, 0.32, z); body.add(pivot);
    const w = new THREE.Group(); pivot.add(w);
    const tyre = cyl(0.32, 0.32, 0.28, rubber, 18); tyre.rotation.z = Math.PI / 2; w.add(tyre);
    for (let i = 0; i < 10; i++) { const lug = box(0.28, 0.06, 0.08, rubber); lug.position.set(0, Math.cos(i / 10 * Math.PI * 2) * 0.32, Math.sin(i / 10 * Math.PI * 2) * 0.32); lug.rotation.x = -i / 10 * Math.PI * 2; w.add(lug); }
    const hub = cyl(0.15, 0.15, 0.3, steel, 10); hub.rotation.z = Math.PI / 2; w.add(hub);
    wheels.push(w); if (front) pivots.push(pivot);
  }
  const seats = [new THREE.Vector3(0, 0.88, -0.2), new THREE.Vector3(0, 0.92, -0.72)];
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return { group: g, body, wheels, pivots, lamps, seats, paint };
}

// what makes each land vehicle handle the way it does
const LAND = {
  jeep: { build: buildJeep, label: 'jeep', maxF: 17, maxR: 6, radius: 1.3, climb: 0.56, wheelR: 0.42, base: 2.5, track: 1.84, corners: [[-0.92, 1.25], [0.92, 1.25], [-0.92, -1.25], [0.92, -1.25]], beam: 60, reach: 3.8 },
  quad: { build: buildQuad, label: 'quad bike', maxF: 21, maxR: 5, radius: 0.8, climb: 0.45, wheelR: 0.32, base: 1.24, track: 1.1, corners: [[-0.55, 0.62], [0.55, 0.62], [-0.55, -0.62], [0.55, -0.62]], beam: 45, reach: 2.8 },
};

export class Jeep {
  constructor(scene, x, z, yaw, kind = 'jeep') {
    this.kind = kind; this.spec = LAND[kind];
    const m = this.spec.build();
    Object.assign(this, m);
    this.scene = scene; this.x = x; this.z = z; this.y = heightAt(x, z); this.yaw = yaw; this.speed = 0; this.steer = 0; this.pitch = 0; this.roll = 0; this.bounce = 0;
    this.driver = null; this.riders = []; this.hp = 100; this.dead = false; this.flooded = false; this.lightsOn = false; this.smokeT = 0; this.rpm = 0;
    this.group.position.set(x, this.y, z); this.group.rotation.y = yaw;
    scene.add(this.group);
    this.normal = new THREE.Vector3(0, 1, 0);
  }
  get name() { return this.spec.label; }
  get reach() { return this.spec.reach; }
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
    const sp = this.spec, maxF = sp.maxF, maxR = sp.maxR;
    let throttle = mv.y;
    if (this.flooded) throttle = 0;
    if (throttle > 0 && this.speed >= -0.5) this.speed += (maxF - Math.max(0, this.speed)) * 0.55 * throttle * dt;
    else if (throttle < 0 && this.speed <= 0.5) this.speed += (-maxR - Math.min(0, this.speed)) * 0.9 * -throttle * dt;
    else if (throttle !== 0) this.speed -= Math.sign(this.speed) * 14 * dt; // brakes
    if (ctx.brake) this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 18 * dt);
    this.speed -= this.speed * 0.35 * dt + Math.sign(this.speed) * Math.min(Math.abs(this.speed), 1.2 * dt);
    this.speed -= 9.81 * uphill * 0.9 * dt; // gravity along the slope
    if (grade.y < sp.climb && uphill > 0.3 && this.speed > 2) this.speed = 2; // it won't climb cliffs
    if (depth > 0.5) { this.speed *= 1 - Math.min(1, dt * 2.5); if (depth > 1.0 && !this.flooded) { this.flooded = true; if (ctx.onFlood) ctx.onFlood(); } }
    if (depth < 0.2) this.flooded = false;
    // steering: lighter at speed, and the car turns about its rear axle
    const target = mv.x * 0.6 / (1 + Math.abs(this.speed) / 14);
    this.steer += (target - this.steer) * Math.min(1, dt * 6);
    this.yaw -= (this.speed / sp.base) * Math.tan(this.steer) * dt;
    let nx = this.x + fx * this.speed * dt, nz = this.z + fz * this.speed * dt;
    // trees and boulders stop it
    const r = resolveObstacles(nx, nz, sp.radius, world);
    if (Math.hypot(r.x - nx, r.z - nz) > 0.01) { if (Math.abs(this.speed) > 6 && ctx.onHit) ctx.onHit(Math.abs(this.speed)); this.hp -= Math.abs(this.speed) > 6 ? Math.abs(this.speed) * 1.5 : 0; this.speed *= -0.25; nx = r.x; nz = r.z; }
    const dc = Math.hypot(nx, nz); if (dc > 430) { nx *= 430 / dc; nz *= 430 / dc; this.speed *= -0.3; }
    this.x = nx; this.z = nz;
    // suspension: fit the body to the ground under the four wheels. The car's local +x is its LEFT side
    // (a yaw of 0 faces +z), so sample left at +x and right at -x.
    const lx = fz, lz = -fx;
    const corners = sp.corners; // local (x, z) of each wheel, same order as this.wheels
    const hW = corners.map(([cx, cz]) => heightAt(this.x + lx * cx + fx * cz, this.z + lz * cx + fz * cz));
    const hF = (hW[0] + hW[1]) / 2, hB = (hW[2] + hW[3]) / 2, hL = (hW[1] + hW[3]) / 2, hR = (hW[0] + hW[2]) / 2;
    const ground = Math.max((hF + hB) / 2, SEA - 0.8);
    const pitchT = Math.atan2(hB - hF, sp.base) + this.speed * (throttle > 0 ? -0.004 : 0.006), rollT = Math.atan2(hL - hR, sp.track) - this.steer * this.speed * (this.kind === 'quad' ? 0.018 : 0.012);
    this.pitch += (pitchT - this.pitch) * Math.min(1, dt * 9); this.roll += (rollT - this.roll) * Math.min(1, dt * 9);
    this.y += (ground - this.y) * Math.min(1, dt * 14);
    this.group.position.set(this.x, this.y, this.z); this.group.rotation.set(0, this.yaw, 0); this.body.rotation.set(this.pitch, 0, this.roll, 'YXZ');
    // each wheel then drops or lifts on its own spring to meet the ground exactly beneath it
    this.group.updateMatrixWorld(true);
    this.wheels.forEach((w, i) => {
      const pivot = w.parent; pivot.getWorldPosition(_wp);
      const gy = hW[i] + sp.wheelR, travel = Math.max(-0.3, Math.min(0.3, gy - _wp.y));
      pivot.position.y += (sp.wheelR + travel - pivot.position.y) * Math.min(1, dt * 16);
      w.rotation.x += this.speed / sp.wheelR * dt;
    });
    for (const p of this.pivots) p.rotation.y = this.steer;
    // headlights in the dark
    const want = ctx.dark && driving;
    if (want !== this.lightsOn) { this.lightsOn = want; this.lamps.forEach((l) => { if (l.isSpotLight) l.intensity = want ? sp.beam : 0; else if (l.material === beamMat) l.visible = want; else l.material.emissiveIntensity = want ? 2.5 : 0; }); }
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
    if (this.hp <= 0) { this.hp = 0; this.dead = true; this.paint.color.set('#2a2622'); this.paint.roughness = 1; this.lamps.forEach((l) => { if (l.isSpotLight) l.intensity = 0; else if (l.material === beamMat) l.visible = false; }); if (ctx && ctx.onDestroyed) ctx.onDestroyed(); }
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

// ---------------- Kai's skiff ----------------
// the hull's shape along its length (z from the transom at -2.3 to the bow tip at 2.6)
const HULL = { stern: -2.3, bow: 2.6 };
function hullW(z) { return z >= 0 ? 0.95 * Math.pow(Math.max(0, 1 - Math.pow(z / HULL.bow, 2.2)), 0.6) : 0.95 - 0.15 * Math.pow(-z / -HULL.stern, 2); }
function hullD(z) { return 0.5 * (1 - 0.55 * Math.pow(Math.max(0, z / HULL.bow), 2)); }
function hullRim(z) { return 0.65 + 0.22 * Math.pow(Math.max(0, z / HULL.bow), 2); }
// a point on the hull skin: a runs round the U from -PI/2 (left rim) through 0 (keel) to PI/2 (right rim)
function hullPt(z, a, grow = 1) { const w = hullW(z) * grow, d = hullD(z); return new THREE.Vector3(Math.sin(a) * w, hullRim(z) - d * Math.pow(Math.cos(a), 0.6), z); }

function hullGeometry() {
  const L = 36, R = 20, pos = [], idx = [];
  for (let i = 0; i <= L; i++) { const z = HULL.stern + (HULL.bow - HULL.stern) * (i / L); for (let j = 0; j <= R; j++) { const p = hullPt(z, -Math.PI / 2 + Math.PI * (j / R)); pos.push(p.x, p.y, p.z); } }
  for (let i = 0; i < L; i++) for (let j = 0; j < R; j++) { const a = i * (R + 1) + j, b = a + R + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  // the flat transom: a fan across the stern section
  const c = pos.length / 3; pos.push(0, hullRim(HULL.stern) - hullD(HULL.stern) * 0.45, HULL.stern);
  for (let j = 0; j < R; j++) idx.push(c, j + 1, j);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// a tube round the hull at angle a (the rim when a = PI/2), closed across the stern
function hullRing(a, r, grow = 1.0) {
  const pts = [];
  for (let i = 0; i <= 24; i++) pts.push(hullPt(HULL.stern + (HULL.bow - 0.05 - HULL.stern) * (i / 24), a, grow));
  for (let i = 24; i >= 0; i--) pts.push(hullPt(HULL.stern + (HULL.bow - 0.05 - HULL.stern) * (i / 24), -a, grow));
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, 'centripetal'), 120, r, 6, true);
}

export function buildBoat() {
  const g = new THREE.Group();
  const hullM = new THREE.MeshStandardMaterial({ color: '#e8e2d0', roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide }), trim = mat('#1f5f8a', 0.5), wood = mat('#8a6a46', 0.9), dark = mat('#1d1d1d', 0.6), steel = mat('#8a9098', 0.4, { metalness: 0.7 });
  const body = new THREE.Group(); g.add(body);
  body.add(new THREE.Mesh(hullGeometry(), hullM));
  body.add(new THREE.Mesh(hullRing(Math.PI / 2, 0.055, 1.02), trim));      // gunwale rail
  body.add(new THREE.Mesh(hullRing(1.15, 0.025, 1.015), trim));            // painted stripe
  const floor = box(1.1, 0.04, 3.4, wood); floor.position.set(0, 0.2, 0.05); body.add(floor);
  // thwarts sized to the beam where they sit
  for (const z of [1.0, -0.2, -1.4]) { const w = hullW(z) * 2 - 0.08; const b = box(w, 0.07, 0.32, wood); b.position.set(0, 0.47, z); body.add(b); }
  const transom = box(hullW(HULL.stern) * 2, 0.5, 0.06, wood); transom.position.set(0, hullRim(HULL.stern) - 0.2, HULL.stern - 0.02); body.add(transom);
  const seats = [new THREE.Vector3(0, 0.5, -1.45), new THREE.Vector3(-0.35, 0.5, 1.0), new THREE.Vector3(0.35, 0.5, 1.0), new THREE.Vector3(-0.35, 0.5, -0.2)];
  // outboard on the transom, with a tiller reaching forward to the helmsman
  const motor = new THREE.Group(); motor.position.set(0, hullRim(HULL.stern), HULL.stern - 0.18);
  const cowl = box(0.42, 0.48, 0.5, dark); cowl.position.y = 0.28; motor.add(cowl);
  const cap = box(0.38, 0.06, 0.46, mat('#c9473a', 0.5)); cap.position.y = 0.55; motor.add(cap);
  const leg = box(0.12, 0.9, 0.2, steel); leg.position.y = -0.4; motor.add(leg);
  const prop = new THREE.Group(); prop.position.set(0, -0.82, -0.12); for (let i = 0; i < 3; i++) { const bl = box(0.04, 0.22, 0.1, steel); bl.rotation.z = i * Math.PI * 2 / 3; bl.position.set(Math.sin(i * 2.09) * 0.1, Math.cos(i * 2.09) * 0.1, 0); prop.add(bl); } motor.add(prop);
  const tiller = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 8), dark); tiller.rotation.x = Math.PI / 2 - 0.25; tiller.position.set(0, 0.3, 0.55); motor.add(tiller);
  body.add(motor);
  // her name on both bows, a coil of rope and a bailer
  for (const sd of [1, -1]) { const name = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.2), new THREE.MeshStandardMaterial({ map: signTexture('MOANA', '#e8e2d0', '#1f5f8a'), roughness: 0.6 })); const p = hullPt(1.35, sd * 1.25, 1.03); name.position.copy(p); name.rotation.y = sd * Math.PI / 2; name.rotation.x = -sd * 0.0; body.add(name); }
  const rope = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 6, 16), mat('#b89a6a', 0.9)); rope.rotation.x = Math.PI / 2; rope.position.set(0, 0.32, 1.85); body.add(rope);
  const bailer = cyl(0.12, 0.09, 0.15, mat('#d8a030', 0.6), 10); bailer.position.set(0.3, 0.29, 0.4); body.add(bailer);
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return { group: g, body, motor, prop, seats, hullM };
}

export class Boat {
  constructor(scene, x, z, yaw) {
    Object.assign(this, buildBoat());
    this.scene = scene; this.x = x; this.z = z; this.yaw = yaw; this.speed = 0; this.steer = 0; this.y = SEA; this.pitch = 0; this.roll = 0;
    this.driver = null; this.riders = []; this.hp = 100; this.dead = false; this.repaired = false; this.rpm = 0; this.t = Math.random() * 6; this.aground = false;
    this.group.position.set(x, this.y, z); this.group.rotation.y = yaw; scene.add(this.group);
    this.hullM.color.set('#b8b2a0'); // weathered until repaired
  }
  get name() { return 'boat'; }
  repair() { this.repaired = true; this.hullM.color.set('#e8e2d0'); }
  update(ctx) {
    const { dt, world } = ctx; this.t += dt;
    const driving = !!this.driver && !this.dead && this.repaired;
    const mv = driving ? ctx.move : { x: 0, y: 0 };
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const maxF = 11, maxR = 3;
    if (mv.y > 0) this.speed += (maxF - Math.max(0, this.speed)) * 0.5 * mv.y * dt;
    else if (mv.y < 0) this.speed += (-maxR - Math.min(0, this.speed)) * 0.8 * -mv.y * dt;
    this.speed -= this.speed * 0.45 * dt;
    if (ctx.brake) this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 6 * dt);
    const target = mv.x * 0.7 / (1 + Math.abs(this.speed) / 12);
    this.steer += (target - this.steer) * Math.min(1, dt * 4);
    this.yaw -= this.steer * Math.min(1.2, 0.3 + Math.abs(this.speed) / 4) * dt * Math.sign(this.speed || 1);
    let nx = this.x + fx * this.speed * dt, nz = this.z + fz * this.speed * dt;
    // the hull grounds in the shallows and the reef
    const depthAhead = SEA - heightAt(nx + fx * 2.2, nz + fz * 2.2), depthHere = SEA - heightAt(nx, nz);
    this.aground = false;
    if (depthAhead < 0.5 || depthHere < 0.4) { if (Math.abs(this.speed) > 3 && ctx.onHit) ctx.onHit(Math.abs(this.speed)); this.hp -= Math.abs(this.speed) > 5 ? Math.abs(this.speed) * 0.8 : 0; this.speed *= -0.3; nx = this.x; nz = this.z; this.aground = true; }
    const dc = Math.hypot(nx, nz); if (dc > 460) { nx *= 460 / dc; nz *= 460 / dc; this.speed *= -0.3; }
    this.x = nx; this.z = nz;
    // ride the waves
    const wave = Math.sin(this.t * 1.3 + this.x * 0.2) * 0.12 + Math.sin(this.t * 2.1 + this.z * 0.3) * 0.06;
    this.y = SEA + 0.05 + wave;
    const pitchT = -this.speed * 0.012 + Math.sin(this.t * 1.6) * 0.03, rollT = Math.sin(this.t * 1.1 + 1) * 0.05 - this.steer * this.speed * 0.02;
    this.pitch += (pitchT - this.pitch) * Math.min(1, dt * 4); this.roll += (rollT - this.roll) * Math.min(1, dt * 4);
    this.group.position.set(this.x, this.y, this.z); this.group.rotation.set(0, this.yaw, 0); this.body.rotation.set(this.pitch, 0, this.roll, 'YXZ');
    this.motor.rotation.y = -this.steer * 0.8; this.prop.rotation.z += this.speed * 6 * dt;
    this.rpm = driving ? Math.min(1, 0.15 + Math.abs(this.speed) / maxF + Math.max(0, mv.y) * 0.2) : 0;
    // wake and spray
    if (ctx.fx && Math.abs(this.speed) > 1.5 && Math.random() < dt * 30) {
      const side = Math.random() < 0.5 ? 1 : -1, lx = fz * side, lz = -fx * side;
      ctx.fx.emit(this.x + fx * 1.6 + lx * 0.9, SEA + 0.05, this.z + fz * 1.6 + lz * 0.9, lx * 1.5 + fx * 0.5, 0.8 + Math.random() * 1.2 * this.speed / maxF, lz * 1.5 + fz * 0.5, 0.35, 0.8, 0.1, 0.85, 1.2);
      ctx.fx.emit(this.x - fx * 2.4, SEA + 0.05, this.z - fz * 2.4, -fx * 2 + (Math.random() - 0.5), 0.6, -fz * 2 + (Math.random() - 0.5), 0.6, 1.4, 0.1, 0.6, 1.5);
    }
    if (this.driver) { this.driver.x = this.x; this.driver.z = this.z; this.driver.y = this.y; this.driver.yaw = this.yaw; }
    for (const n of this.riders) { n.x = this.x; n.z = this.z; n.y = this.y; }
  }
  damage(n, ctx) {
    if (this.dead) return;
    this.hp -= n;
    if (this.hp <= 0) { this.hp = 0; this.dead = true; this.hullM.color.set('#3a3530'); if (ctx && ctx.onDestroyed) ctx.onDestroyed(); }
  }
  seatFor(index) { return this.seats[Math.min(index, this.seats.length - 1)]; }
  seat(rig, index) { const s = this.seatFor(index); this.body.add(rig.root); rig.root.position.copy(s); rig.root.position.y -= 0.5; rig.root.rotation.set(0, index === 0 ? 0 : Math.PI, 0); }
  unseat(rig, scene) { this.body.remove(rig.root); scene.add(rig.root); }
  // step off onto the nearest bit of ground, or into the water if there is none close
  exitSpot() {
    let best = null, bd = 1e9;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) for (let r = 2.5; r <= 8; r += 1.5) { const x = this.x + Math.cos(a) * r, z = this.z + Math.sin(a) * r; if (heightAt(x, z) > SEA - 0.5 && r < bd) { bd = r; best = { x, z }; } }
    return best || { x: this.x + Math.cos(this.yaw) * 2.5, z: this.z - Math.sin(this.yaw) * 2.5 };
  }
}
