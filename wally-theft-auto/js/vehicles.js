// Cars: smooth extruded bodies, arcade drift physics, traffic and police AI.
import * as THREE from 'three';
import { plateTexture, rng } from './textures.js';
import { N, P, HALF, ROAD, LANE, roadC } from './city.js';

const TYPES = {
  saloon: { len: 4.5, wid: 1.85, hgt: 1.45, max: 42, acc: 11, grip: 9, mass: 1.0, wheel: 0.34, names: ['Thistle', 'Dundee', 'Clyde'] },
  hatch: { len: 3.9, wid: 1.75, hgt: 1.5, max: 38, acc: 10, grip: 9.5, mass: 0.85, wheel: 0.32, names: ['Wee Bairn', 'Pocket', 'Neep'] },
  sports: { len: 4.4, wid: 1.95, hgt: 1.15, max: 60, acc: 18, grip: 11, mass: 0.95, wheel: 0.35, names: ['Stag GT', 'Kelpie', 'Banshee'] },
  taxi: { len: 4.6, wid: 1.85, hgt: 1.6, max: 40, acc: 10, grip: 9, mass: 1.05, wheel: 0.34, names: ['Black Cab'] },
  police: { len: 4.6, wid: 1.9, hgt: 1.5, max: 52, acc: 15, grip: 10, mass: 1.15, wheel: 0.35, names: ['Panda'] },
  van: { len: 5.2, wid: 2.0, hgt: 2.3, max: 32, acc: 7, grip: 7.5, mass: 1.6, wheel: 0.38, names: ['Flitter', 'Hauler'] },
  icecream: { len: 5.0, wid: 2.0, hgt: 2.5, max: 28, acc: 6, grip: 7, mass: 1.5, wheel: 0.37, names: ['Mr Fudge'] },
};
const PAINTS = ['#b3122e', '#1d4f91', '#e8e8e8', '#202326', '#2f6b3a', '#c49a1a', '#6d2a8c', '#a7b0b8', '#d35400', '#0f7c8c', '#5b3a29', '#f2c9d8'];

function profile(type, L, H) {
  // side profile, x = forward (front at +L/2), y = up from 0 (underbody) — returns [bodyPts, cabinPts]
  const h = L / 2;
  const s = new THREE.Shape();
  const c = new THREE.Shape();
  if (type === 'van' || type === 'icecream') {
    s.moveTo(-h, 0.25); s.lineTo(h - 0.1, 0.25); s.quadraticCurveTo(h + 0.05, 0.3, h, 0.75); s.lineTo(h - 0.15, 1.0);
    s.lineTo(h - 0.9, 1.15); s.lineTo(-h, 1.15); s.lineTo(-h, 0.25);
    c.moveTo(h - 0.9, 1.12); c.lineTo(h - 1.35, H - 0.05); c.lineTo(-h + 0.02, H - 0.05); c.lineTo(-h + 0.02, 1.12); c.lineTo(h - 0.9, 1.12);
    return [s, c];
  }
  const low = type === 'sports';
  const belt = low ? 0.72 : 0.92, nose = low ? 0.45 : 0.58;
  const ws = type === 'hatch' ? 0.2 : 0.05;
  s.moveTo(-h, 0.3);
  s.lineTo(h - 0.25, 0.3);
  s.quadraticCurveTo(h + 0.02, 0.32, h, nose);         // front bumper
  s.quadraticCurveTo(h - 0.05, belt - 0.05, h - 0.4, belt); // bonnet nose
  s.lineTo(L * (low ? 0.02 : 0.12), belt + 0.06);         // bonnet
  s.lineTo(-h + (type === 'hatch' ? 0.1 : 0.55), belt + 0.05); // boot
  s.quadraticCurveTo(-h, belt, -h, belt - 0.2);
  s.lineTo(-h, 0.3);
  const roof = H;
  const fx = L * (low ? 0.05 : 0.15), rx = -h + (type === 'hatch' ? 0.12 : 0.75);
  c.moveTo(fx, belt + 0.04);
  c.quadraticCurveTo(fx - 0.6, roof - 0.12, fx - 1.0 - ws, roof);
  c.lineTo(rx + (type === 'hatch' ? 0.25 : 0.45), roof);
  c.quadraticCurveTo(rx + 0.05, roof - 0.1, rx, belt + 0.04);
  c.lineTo(fx, belt + 0.04);
  return [s, c];
}

function extrude(shape, width, bevel, segs = 24) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 5, curveSegments: segs });
  g.translate(0, 0, -(width - bevel * 2) / 2);
  g.rotateY(-Math.PI / 2); // shape x -> world z
  return g;
}

const sharedM = {};
function M(key, make) { return sharedM[key] || (sharedM[key] = make()); }

let plateN = 0;
export function buildCarModel(type, paint) {
  const T = TYPES[type];
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const paintM = new THREE.MeshPhysicalMaterial({ color: paint, roughness: 0.28, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.08 });
  const glassM = M('glass', () => new THREE.MeshPhysicalMaterial({ color: '#141c24', roughness: 0.05, metalness: 0.8, clearcoat: 1 }));
  const blackM = M('black', () => new THREE.MeshStandardMaterial({ color: '#18191b', roughness: 0.6 }));
  const chromeM = M('chrome', () => new THREE.MeshStandardMaterial({ color: '#dfe3e8', roughness: 0.15, metalness: 1 }));
  const tyreM = M('tyre', () => new THREE.MeshStandardMaterial({ color: '#1b1b1b', roughness: 0.9 }));
  const headM = M('head', () => new THREE.MeshStandardMaterial({ color: '#fffbe8', emissive: '#fff1c4', emissiveIntensity: 0.3, roughness: 0.1 }));
  const tailM = new THREE.MeshStandardMaterial({ color: '#7a0000', emissive: '#ff1010', emissiveIntensity: 0.4, roughness: 0.3 });
  const [bs, cs] = profile(type, T.len, T.hgt);
  const bodyMesh = new THREE.Mesh(extrude(bs, T.wid, 0.12), paintM);
  const cabin = new THREE.Mesh(extrude(cs, T.wid - 0.16, 0.08), glassM);
  body.add(bodyMesh, cabin);
  // roof skin, pillars
  const isBox = type === 'van' || type === 'icecream';
  if (!isBox) {
    const roof = new THREE.Mesh(new THREE.BoxGeometry(T.wid - 0.22, 0.06, T.len * 0.3), paintM);
    roof.position.set(0, T.hgt + 0.06, type === 'hatch' ? -T.len * 0.12 : -T.len * 0.04); body.add(roof);
    for (const sx of [-1, 1]) {
      const bp = new THREE.Mesh(new THREE.BoxGeometry(0.06, (T.hgt - 0.95) * 0.95, 0.12), paintM);
      bp.position.set(sx * (T.wid / 2 - 0.05), (T.hgt + 0.95) / 2, -T.len * 0.04); body.add(bp);
    }
  } else {
    const box = new THREE.Mesh(new THREE.BoxGeometry(T.wid - 0.04, T.hgt - 1.1, T.len - 1.4), paintM);
    box.position.set(0, (T.hgt + 1.12) / 2, -0.62); body.add(box);
    if (type === 'icecream') {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 16), M('cone', () => new THREE.MeshStandardMaterial({ color: '#d9a35a' })));
      cone.rotation.x = Math.PI; cone.position.set(0, T.hgt + 0.4, 0.5); body.add(cone);
      const scoop = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), M('scoop', () => new THREE.MeshStandardMaterial({ color: '#fff0f5', roughness: 0.8 })));
      scoop.position.set(0, T.hgt + 0.85, 0.5); body.add(scoop);
    }
  }
  // bumpers
  for (const sz of [1, -1]) {
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, T.wid - 0.3, 4, 12), blackM);
    b.rotation.z = Math.PI / 2; b.position.set(0, 0.42, sz * (T.len / 2 + 0.02)); body.add(b);
  }
  // lights
  for (const sx of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 10), headM); hl.scale.set(1.3, 0.75, 0.5);
    hl.position.set(sx * (T.wid / 2 - 0.3), isBox ? 0.8 : (type === 'sports' ? 0.58 : 0.7), T.len / 2 - (isBox ? 0.02 : 0.08)); body.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.06), tailM);
    tl.position.set(sx * (T.wid / 2 - 0.28), isBox ? 0.9 : 0.82, -T.len / 2 - 0.01); body.add(tl);
    // mirrors
    const mr = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.12), paintM);
    mr.position.set(sx * (T.wid / 2 + 0.06), isBox ? 1.25 : 1.0, isBox ? T.len / 2 - 1.0 : T.len * 0.12); body.add(mr);
  }
  // grille
  const gr = new THREE.Mesh(new THREE.BoxGeometry(T.wid * 0.45, 0.16, 0.05), chromeM);
  gr.position.set(0, isBox ? 0.62 : 0.55, T.len / 2 + 0.01); body.add(gr);
  // plates
  const ptxt = 'W' + String(100 + (plateN++ * 37) % 900) + ' LY';
  const pm = new THREE.MeshStandardMaterial({ map: plateTexture(ptxt), roughness: 0.5 });
  for (const sz of [1, -1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.12), pm);
    p.position.set(0, 0.42, sz * (T.len / 2 + 0.15)); if (sz < 0) p.rotation.y = Math.PI; body.add(p);
  }
  // type extras
  let lightbar = null;
  if (type === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.25), new THREE.MeshStandardMaterial({ color: '#ffd23f', emissive: '#ffb300', emissiveIntensity: 0.8 }));
    sign.position.set(0, T.hgt + 0.2, -T.len * 0.04); body.add(sign);
  }
  if (type === 'police') {
    lightbar = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.3), blackM); lightbar.add(base);
    const blueM = new THREE.MeshStandardMaterial({ color: '#2050ff', emissive: '#1040ff', emissiveIntensity: 0.5 });
    const redM = new THREE.MeshStandardMaterial({ color: '#ff2030', emissive: '#ff1020', emissiveIntensity: 0.5 });
    const bL = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.4, 4, 10), blueM); bL.rotation.z = Math.PI / 2; bL.position.set(-0.3, 0.1, 0);
    const bR = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.4, 4, 10), redM); bR.rotation.z = Math.PI / 2; bR.position.set(0.3, 0.1, 0);
    lightbar.add(bL, bR); lightbar.userData = { blueM, redM };
    lightbar.position.set(0, T.hgt + 0.12, -T.len * 0.04); body.add(lightbar);
    // chequered side stripe (yellow & blue)
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 32; const cx = cv.getContext('2d');
    for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { cx.fillStyle = (i + j) % 2 ? '#1a3fa8' : '#f2e21a'; cx.fillRect(i * 16, j * 16, 16, 16); }
    const st = new THREE.CanvasTexture(cv); st.colorSpace = THREE.SRGBColorSpace;
    for (const sx of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(T.len * 0.85, 0.28), new THREE.MeshStandardMaterial({ map: st, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 }));
      p.position.set(sx * (T.wid / 2 + 0.005), 0.62, 0); p.rotation.y = sx * Math.PI / 2; body.add(p);
    }
  }
  // wheels
  const wheels = [];
  const wr = T.wheel, wx = T.wid / 2 - 0.18, wz = T.len / 2 - (isBox ? 0.85 : 0.78);
  const tyreG = M('tyreG' + wr, () => { const t = new THREE.CylinderGeometry(wr, wr, 0.26, 28, 1); t.rotateZ(Math.PI / 2); return t; });
  const rimG = M('rimG' + wr, () => { const t = new THREE.CylinderGeometry(wr * 0.62, wr * 0.62, 0.27, 20, 1); t.rotateZ(Math.PI / 2); return t; });
  const spokeG = M('spoke' + wr, () => new THREE.BoxGeometry(0.02, wr * 1.15, 0.05));
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const pivot = new THREE.Group(); pivot.position.set(sx * wx, wr, sz * wz); g.add(pivot);
    const spin = new THREE.Group(); pivot.add(spin);
    spin.add(new THREE.Mesh(tyreG, tyreM));
    spin.add(new THREE.Mesh(rimG, chromeM));
    for (let k = 0; k < 5; k++) { const s = new THREE.Mesh(spokeG, chromeM); s.rotation.x = k * Math.PI * 2 / 5; s.position.x = sx * 0.137; spin.add(s); }
    wheels.push({ pivot, spin, front: sz > 0 });
  }
  body.position.y = 0.05;
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; } });
  return { group: g, body, wheels, lightbar, paintM, tailM, headM };
}

let carId = 0;
export class Car {
  constructor(scene, type, paint, x, z, heading) {
    this.id = carId++;
    this.type = type; this.T = TYPES[type];
    this.paint = paint || PAINTS[(Math.random() * PAINTS.length) | 0];
    if (type === 'taxi') this.paint = '#111214';
    if (type === 'police') this.paint = '#f4f4f4';
    if (type === 'icecream') this.paint = '#fbe7f0';
    const m = buildCarModel(type, this.paint);
    Object.assign(this, m);
    this.name = this.T.names[(Math.random() * this.T.names.length) | 0];
    this.x = x; this.z = z; this.y = 0; this.heading = heading;
    this.vx = 0; this.vz = 0; this.steer = 0; this.vf = 0; this.yawRate = 0;
    this.health = 1000; this.burnT = 0; this.dead = false; this.deadT = 0;
    this.driver = null;     // 'ai' | 'player' | 'cop' | null
    this.ai = null;
    this.input = { throttle: 0, steer: 0, brake: false, hand: false };
    this.pitch = 0; this.roll = 0; this.lastHit = 0; this.horn = 0;
    this.radius = this.T.wid / 2 + 0.05;
    this.scene = scene;
    scene.add(this.group);
    this.sync();
  }
  get speed() { return Math.hypot(this.vx, this.vz); }
  forward() { return [Math.sin(this.heading), Math.cos(this.heading)]; }
  circles() {
    const [fx, fz] = this.forward(), o = this.T.len / 2 - this.radius;
    return [[this.x + fx * o, this.z + fz * o], [this.x, this.z], [this.x - fx * o, this.z - fz * o]];
  }
  update(dt, world, game) {
    if (this.dead) { this.deadT += dt; this.vx *= 0.95; this.vz *= 0.95; this.x += this.vx * dt; this.z += this.vz * dt; this.sync(); return; }
    const T = this.T, inp = this.input;
    const [fx, fz] = this.forward();
    const rx = fz, rz = -fx; // car's left-hand side vector (see city.js note), used as lateral axis
    let vf = this.vx * fx + this.vz * fz;
    let vr = this.vx * rx + this.vz * rz;
    const maxSteer = 0.62 / (1 + Math.abs(vf) * 0.045);
    this.steer += (inp.steer * maxSteer - this.steer) * Math.min(1, dt * 8);
    const fwdMax = T.max * (this.boost || 1);
    if (inp.throttle > 0) {
      if (vf < -0.5) vf += T.acc * 2.2 * dt;
      else vf += T.acc * inp.throttle * dt * Math.max(0.05, 1 - vf / fwdMax);
    } else if (inp.throttle < 0) {
      if (vf > 0.5) vf -= T.acc * 2.4 * dt;
      else vf = Math.max(-11, vf + T.acc * 0.6 * inp.throttle * dt);
    } else {
      vf -= vf * 0.35 * dt + Math.sign(vf) * Math.min(Math.abs(vf), 1.2 * dt);
    }
    if (this.health < 120) vf *= 1 - dt * 0.5;
    // yaw: kinematic bicycle
    const wb = T.len * 0.62;
    let yaw = vf * Math.tan(this.steer) / wb;
    let grip = T.grip;
    if (inp.hand) { grip = 1.6; yaw *= 1.35; vf -= vf * 0.6 * dt; }
    this.heading -= yaw * dt; // steer>0 turns right (clockwise from above)
    this.yawRate = yaw;
    // lateral grip
    vr *= Math.exp(-grip * dt);
    const [nfx, nfz] = this.forward();
    const nrx = nfz, nrz = -nfx;
    this.vx = nfx * vf + nrx * vr; this.vz = nfz * vf + nrz * vr;
    this.vf = vf; this.vr = vr;
    let nx = this.x + this.vx * dt, nz = this.z + this.vz * dt;
    // collide with the city (three circles along the car)
    let pushX = 0, pushZ = 0, impact = 0, hn = null;
    const o = T.len / 2 - this.radius;
    for (const k of [1, 0, -1]) {
      const cx = nx + nfx * o * k, cz = nz + nfz * o * k;
      const c = world.collide(cx, cz, this.radius, 0);
      if (c.hit) {
        const dx = c.x - cx, dz = c.z - cz;
        if (Math.abs(dx) > Math.abs(pushX)) pushX = dx;
        if (Math.abs(dz) > Math.abs(pushZ)) pushZ = dz;
        hn = [c.nx, c.nz];
      }
    }
    if (hn) {
      nx += pushX; nz += pushZ;
      const vn = this.vx * hn[0] + this.vz * hn[1];
      if (vn < 0) {
        impact = -vn;
        this.vx -= hn[0] * vn * 1.35; this.vz -= hn[1] * vn * 1.35;
        this.vx *= 0.8; this.vz *= 0.8;
      }
    }
    this.x = nx; this.z = nz;
    if (impact > 3) this.damage(impact * impact * 1.1, game, 'crash');
    if (impact > 2 && game) game.onCarImpact(this, impact);
    // ground follow
    const gy = Math.min(0.2, Math.max(0, world.groundHeight(this.x, this.z, 0.5)));
    this.y += (gy - this.y) * Math.min(1, dt * 12);
    // visual tilt
    const accel = (vf - (this._lastVf || 0)) / Math.max(dt, 1e-3); this._lastVf = vf;
    this.pitch += (Math.max(-0.06, Math.min(0.06, -accel * 0.004)) - this.pitch) * Math.min(1, dt * 6);
    this.roll += (Math.max(-0.08, Math.min(0.08, yaw * vf * 0.0035 + vr * 0.01)) - this.roll) * Math.min(1, dt * 6);
    // wheel spin + steer
    for (const w of this.wheels) {
      w.spin.rotation.x += vf * dt / T.wheel;
      w.pivot.rotation.y = w.front ? -this.steer : 0;
    }
    // fire / smoke state
    if (this.health <= 0 && !this.dead) {
      this.burnT += dt;
      if (this.burnT > 4) this.explode(game);
    }
    if (this.lightbar) {
      const on = this.sirenOn ? (Math.floor(performance.now() / 160) % 2) : -1;
      this.lightbar.userData.blueM.emissiveIntensity = on === 0 ? 6 : 0.4;
      this.lightbar.userData.redM.emissiveIntensity = on === 1 ? 6 : 0.4;
    }
    this.tailM.emissiveIntensity = inp.throttle < 0 && vf > 0.5 ? 3.5 : (game && game.night > 0.3 ? 1.4 : 0.4);
    this.sync();
  }
  damage(amount, game, cause) {
    if (this.dead) return;
    this.health -= amount;
    if (this.health <= 0 && this.burnT === 0) { this.health = 0; this.burnT = 0.001; }
    if (cause === 'shot' && this.health <= 0 && this.burnT < 3) this.burnT = Math.max(this.burnT, 3);
  }
  explode(game) {
    if (this.dead) return;
    this.dead = true; this.health = 0;
    const charred = new THREE.MeshStandardMaterial({ color: '#1a1716', roughness: 1 });
    this.body.traverse((m) => { if (m.isMesh) m.material = charred; });
    this.vx += (Math.random() - 0.5) * 2; this.vz += (Math.random() - 0.5) * 2;
    this.body.position.y = 0.2; this.body.rotation.z = (Math.random() - 0.5) * 0.3;
    if (game) game.onExplosion(this.x, this.y + 1, this.z, this);
  }
  sync() {
    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = this.heading;
    this.body.rotation.x = this.pitch; this.body.rotation.z = this.roll + (this.dead ? 0.1 : 0);
  }
  remove() { this.scene.remove(this.group); this.group.traverse((m) => { if (m.isMesh && m.geometry && !m.geometry.userData.shared) { /* shared geos kept */ } }); }
  // where the driver's door is (left-hand side kerb side for UK... driver sits on the right)
  doorPos() {
    const [fx, fz] = this.forward();
    const rx = -fz, rz = fx; // car's right
    return [this.x + rx * (this.T.wid / 2 + 0.7) + fx * 0.3, this.z + rz * (this.T.wid / 2 + 0.7) + fz * 0.3];
  }
}

// ---------------- road graph helpers ----------------
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const nodePos = (i, j) => [roadC(i), roadC(j)];
const laneOff = (dx, dz) => [dz * LANE, -dx * LANE]; // drive on the left

function edgePoints(i, j, d, out) {
  // from node (i,j) to neighbour along d, lane points at start and end
  const [ax, az] = nodePos(i, j), [bx, bz] = nodePos(i + d[0], j + d[1]);
  const [ox, oz] = laneOff(d[0], d[1]);
  const m = ROAD / 2 + 1.5;
  out.push([ax + d[0] * m + ox, az + d[1] * m + oz], [bx - d[0] * m + ox, bz - d[1] * m + oz]);
}
function validDir(i, j, d) { const a = i + d[0], b = j + d[1]; return a >= 0 && a <= N && b >= 0 && b <= N; }

export class TrafficAI {
  constructor(car, i, j, d) {
    this.car = car; this.i = i; this.j = j; this.d = d; this.path = []; this.idx = 0; this.stuck = 0; this.ignore = 0;
    this.cruise = 11 + Math.random() * 4; this.mode = 'traffic'; this.panic = 0;
    edgePoints(i, j, d, this.path);
    this.ni = i + d[0]; this.nj = j + d[1];
  }
  extend(chooseDir) {
    // at node (ni,nj) arriving with dir d: pick a new dir
    const opts = DIRS.filter((nd) => !(nd[0] === -this.d[0] && nd[1] === -this.d[1]) && validDir(this.ni, this.nj, nd));
    let nd = chooseDir ? chooseDir(this.ni, this.nj, opts, this.d) : opts[(Math.random() * opts.length) | 0];
    if (!nd) nd = [-this.d[0], -this.d[1]];
    // curve through the junction
    const last = this.path[this.path.length - 1];
    const tmp = []; edgePoints(this.ni, this.nj, nd, tmp);
    const start = tmp[0];
    if (nd[0] !== this.d[0] || nd[1] !== this.d[1]) {
      // control point: intersection of the lane lines
      const cx = this.d[0] !== 0 ? start[0] : last[0];
      const cz = this.d[1] !== 0 ? start[1] : last[1];
      for (let k = 1; k < 6; k++) {
        const t = k / 6, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
        this.path.push([a * last[0] + b * cx + c * start[0], a * last[1] + b * cz + c * start[1], 'turn']);
      }
    }
    this.path.push(...tmp);
    this.d = nd; this.ni += nd[0]; this.nj += nd[1];
    if (this.idx > 20) { this.path.splice(0, this.idx - 2); this.idx = 2; }
  }
  drive(dt, cars, game, chooseDir) {
    const car = this.car;
    if (this.path.length - this.idx < 4) this.extend(chooseDir);
    // advance waypoint
    let wp = this.path[this.idx];
    while (wp && Math.hypot(wp[0] - car.x, wp[1] - car.z) < 4.5 && this.idx < this.path.length - 1) { this.idx++; wp = this.path[this.idx]; }
    // look ahead point
    const la = this.path[Math.min(this.idx + 1, this.path.length - 1)];
    const tx = (wp[0] * 0.6 + la[0] * 0.4), tz = (wp[1] * 0.6 + la[1] * 0.4);
    const [fx, fz] = car.forward();
    const dx = tx - car.x, dz = tz - car.z;
    const ang = Math.atan2(dx * fz - dz * fx, dx * fx + dz * fz); // + = target to the left
    car.input.steer = Math.max(-1, Math.min(1, -ang * 2.2));
    let want = this.cruise;
    // slow for turns ahead
    for (let k = this.idx; k < Math.min(this.idx + 4, this.path.length); k++) if (this.path[k][2] === 'turn') { want = Math.min(want, 6.5); break; }
    // obstacles ahead
    this.ignore -= dt;
    if (this.ignore <= 0) {
      const check = (ox, oz, rad) => {
        const rx = ox - car.x, rz = oz - car.z;
        const along = rx * fx + rz * fz, lat = Math.abs(rx * fz - rz * fx);
        if (along > 0 && along < 14 && lat < 1.6 + rad) want = Math.min(want, Math.max(0, (along - 5) * 0.9));
      };
      for (const o of cars) if (o !== car && !o.dead) { if (Math.abs(o.x - car.x) < 16 && Math.abs(o.z - car.z) < 16) check(o.x, o.z, 0.8); }
      if (game) { for (const p of game.peds.list) if (!p.dead && Math.abs(p.x - car.x) < 15 && Math.abs(p.z - car.z) < 15) check(p.x, p.z, 0.2); if (!game.player.car) check(game.player.x, game.player.z, 0.3); }
    }
    if (this.panic > 0) { this.panic -= dt; want = Math.max(want, 18); }
    if (car.speed < 0.5 && want < 1) { this.stuck += dt; if (this.stuck > 3.5) { this.ignore = 2.5; this.stuck = 0; car.horn = 0.5; } } else this.stuck = 0;
    const err = want - car.vf;
    car.input.throttle = Math.max(-1, Math.min(1, err * 0.5));
    car.input.hand = false;
  }
}

// Police pursuit: route along the grid toward the player, then ram
export class PoliceAI extends TrafficAI {
  constructor(car, i, j, d) { super(car, i, j, d); this.mode = 'police'; this.cruise = 20; this.exitT = 0; }
  drive(dt, cars, game) {
    const car = this.car, pl = game.player;
    const px = pl.car ? pl.car.x : pl.x, pz = pl.car ? pl.car.z : pl.z;
    const dist = Math.hypot(px - car.x, pz - car.z);
    car.sirenOn = true;
    const wanted = game.wanted.level;
    this.cruise = 18 + wanted * 3;
    if (dist < 26 && !game.world.blocked(car.x, car.z, px, pz, 1)) {
      // direct pursuit
      const [fx, fz] = car.forward();
      const dx = px - car.x, dz = pz - car.z;
      const ang = Math.atan2(dx * fz - dz * fx, dx * fx + dz * fz);
      car.input.steer = Math.max(-1, Math.min(1, -ang * 2.5));
      const want = pl.car ? Math.max(8, pl.car.speed + 6) : Math.max(0, (dist - 7) * 1.2);
      if (Math.abs(ang) > 2.2 && dist < 12) { car.input.throttle = -1; car.input.steer = -car.input.steer; }
      else car.input.throttle = Math.max(-1, Math.min(1, (want - car.vf) * 0.4));
      // reset path so we re-join the grid later
      const [ni, nj] = game.world.nearestNode(car.x, car.z);
      this.path = []; this.idx = 0; this.i = ni; this.j = nj;
      this.direct = true;
      return;
    }
    if (this.direct) {
      // re-enter the grid at the nearest node heading toward the player
      this.direct = false;
      const [ni, nj] = game.world.nearestNode(car.x, car.z);
      const [ti, tj] = game.world.nearestNode(px, pz);
      let d = Math.abs(ti - ni) > Math.abs(tj - nj) ? [Math.sign(ti - ni) || 1, 0] : [0, Math.sign(tj - nj) || 1];
      if (!validDir(ni, nj, d)) d = DIRS.find((q) => validDir(ni, nj, q));
      this.d = d; this.path = []; this.idx = 0; edgePoints(ni, nj, d, this.path); this.ni = ni + d[0]; this.nj = nj + d[1];
    }
    const choose = (i, j, opts) => {
      const [ti, tj] = game.world.nearestNode(px, pz);
      let best = opts[0], bd = 1e9;
      for (const o of opts) { const dd = Math.abs(ti - (i + o[0])) + Math.abs(tj - (j + o[1])) + Math.random() * 0.3; if (dd < bd) { bd = dd; best = o; } }
      return best;
    };
    super.drive(dt, cars, null, choose);
    // cops don't wait politely
    if (car.input.throttle < 0.3 && car.speed < 3) { this.stuck += dt * 0.5; }
  }
}

export function randomType(r = Math.random) {
  const x = r();
  if (x < 0.36) return 'saloon';
  if (x < 0.58) return 'hatch';
  if (x < 0.7) return 'taxi';
  if (x < 0.8) return 'van';
  if (x < 0.93) return 'sports';
  return 'icecream';
}

export { TYPES, PAINTS, DIRS, validDir };
