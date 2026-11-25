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
  // a stainless-steel electric wedge of a pickup: fast, heavy, built like a fridge
  wedge: { len: 5.7, wid: 2.1, hgt: 1.9, max: 50, acc: 17, grip: 9.5, mass: 1.9, wheel: 0.42, names: ['Steel Wedge', 'Tinfoil Hat'] },
  // a wee three-wheeled van: one wheel at the front, slow, light, and it tips over in corners
  trike: { len: 3.35, wid: 1.45, hgt: 1.42, max: 30, acc: 7, grip: 7, mass: 0.55, wheel: 0.27, names: ['Wee Trike', 'Plastic Rocket'] },
};
const PAINTS = ['#b3122e', '#1d4f91', '#e8e8e8', '#202326', '#2f6b3a', '#c49a1a', '#6d2a8c', '#a7b0b8', '#d35400', '#0f7c8c', '#5b3a29', '#f2c9d8'];

function extrude(shape, width, bevel, segs = 24) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 5, curveSegments: segs });
  g.translate(0, 0, -(width - bevel * 2) / 2);
  g.rotateY(-Math.PI / 2); // shape x -> world z
  return g;
}

const sharedM = {};
// everything cached here is shared by many cars, so it must never be disposed
export const SHARED = new Set();
function M(key, make) { if (!sharedM[key]) { sharedM[key] = make(); SHARED.add(sharedM[key]); if (sharedM[key] && sharedM[key].map) SHARED.add(sharedM[key].map); } return sharedM[key]; }

// Free the GPU memory held by an object's own geometry, materials and textures.
// Anything in `keep` (shared caches) is left alone; sprites share one internal geometry, so skip it.
export function disposeObject(root, keep = SHARED) {
  const seen = new Set();
  root.traverse((o) => {
    if (o.isSkinnedMesh && o.skeleton) o.skeleton.dispose();
    if (!o.isSprite && o.geometry && !keep.has(o.geometry) && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
    const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
    for (const m of mats) {
      if (keep.has(m) || seen.has(m)) continue;
      seen.add(m);
      for (const k of ['map', 'emissiveMap', 'normalMap', 'bumpMap', 'alphaMap']) if (m[k] && !keep.has(m[k]) && !seen.has(m[k])) { seen.add(m[k]); m[k].dispose(); }
      m.dispose();
    }
  });
}

// Per-type body plan (profile x runs front +h to back -h; y is up). All cars share one builder.
function carSpec(type, T) {
  const h = T.len / 2, wr = T.wheel;
  const base = { h, wr, cy: wr, archR: wr + 0.07, y0: 0.27, zF: h - 0.8, zR: -(h - 0.8), roofY: T.hgt };
  const S = {
    saloon: { nose: 0.6, hoodY: 0.86, beltY: 0.9, xW: 0.6, xRf: -0.2, xRr: -1.0, xC: -1.45, deckY: 0.94 },
    police: { nose: 0.62, hoodY: 0.88, beltY: 0.92, xW: 0.66, xRf: -0.18, xRr: -1.08, xC: -1.52, deckY: 0.96 },
    hatch: { nose: 0.6, hoodY: 0.86, beltY: 0.9, xW: 0.52, xRf: -0.22, xRr: -1.6, xC: -1.86, deckY: 0.92 },
    sports: { nose: 0.46, hoodY: 0.66, beltY: 0.7, xW: 0.3, xRf: -0.48, xRr: -1.02, xC: -1.7, deckY: 0.76 },
    taxi: { nose: 0.7, hoodY: 0.96, beltY: 0.98, xW: 0.86, xRf: 0.3, xRr: -1.55, xC: -1.78, deckY: 1.0 },
    van: { nose: 0.82, hoodY: 1.04, beltY: 1.15, xW: h - 0.72, xRf: h - 1.25, xRr: h - 1.9, xC: h - 1.9, deckY: 1.15, zF: h - 0.85, zR: -(h - 0.9) },
    icecream: { nose: 0.82, hoodY: 1.04, beltY: 1.15, xW: h - 0.72, xRf: h - 1.25, xRr: h - 1.9, xC: h - 1.9, deckY: 1.15, zF: h - 0.85, zR: -(h - 0.9) },
  }[type];
  if (type === 'van' || type === 'icecream') base.roofY = T.hgt - 0.05;
  return { ...base, ...S };
}

// Side silhouette of the lower body, with proper wheel arches cut out
function bodyShape(S) {
  const { h, y0, cy, archR: r, zF, zR, nose, hoodY, beltY, xW, xC, deckY } = S;
  const s = new THREE.Shape();
  s.moveTo(-h + 0.15, y0 + 0.04);
  s.lineTo(zR - r - 0.03, y0);
  s.lineTo(zR - r, cy);
  s.absarc(zR, cy, r, Math.PI, 0, true);
  s.lineTo(zR + r + 0.03, y0);
  s.lineTo(zF - r - 0.03, y0);
  s.lineTo(zF - r, cy);
  s.absarc(zF, cy, r, Math.PI, 0, true);
  s.lineTo(zF + r + 0.03, y0);
  s.lineTo(h - 0.18, y0 + 0.03);
  s.quadraticCurveTo(h + 0.03, y0 + 0.06, h + 0.02, nose);            // front bumper
  s.quadraticCurveTo(h, hoodY, h - 0.32, hoodY);                          // nose into the bonnet
  s.lineTo(xW, beltY + 0.02);                                             // bonnet up to the windscreen
  s.lineTo(xC, beltY + 0.02);                                             // waist line under the windows
  s.lineTo(-h + 0.28, deckY);                                             // boot lid
  s.quadraticCurveTo(-h + 0.02, deckY, -h, deckY - 0.16);
  s.lineTo(-h - 0.01, y0 + 0.16);                                         // rear bumper
  s.quadraticCurveTo(-h, y0 + 0.04, -h + 0.15, y0 + 0.04);
  return s;
}
// The glasshouse: windscreen, side windows and rear window as one clear shape
function glassShape(S) {
  const { beltY, xW, xRf, xRr, xC, roofY } = S;
  const c = new THREE.Shape();
  c.moveTo(xW, beltY);
  c.quadraticCurveTo(xW - (xW - xRf) * 0.35, roofY - 0.02, xRf, roofY);
  c.lineTo(xRr, roofY);
  c.quadraticCurveTo(xC + (xRr - xC) * 0.3, roofY - 0.04, xC, beltY);
  c.lineTo(xW, beltY);
  return c;
}

let plateN = 0;
// shared additive glow sprites for car lights
const glowMats = {};
function glowMat(kind) {
  if (!glowMats[kind]) {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (kind === 'head') { g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.25, 'rgba(255,240,200,0.6)'); g.addColorStop(1, 'rgba(255,220,160,0)'); }
    else { g.addColorStop(0, 'rgba(255,80,60,1)'); g.addColorStop(0.3, 'rgba(255,30,20,0.55)'); g.addColorStop(1, 'rgba(255,0,0,0)'); }
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    glowMats[kind] = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    SHARED.add(glowMats[kind]); SHARED.add(glowMats[kind].map);
  }
  return glowMats[kind];
}
// a slanted bar between two profile points (used for the roof pillars)
function strut(len, m, w = 0.06, t = 0.07) { return new THREE.Mesh(new THREE.BoxGeometry(w, t, len), m); }
function placeStrut(mesh, x, z1, y1, z2, y2) {
  mesh.position.set(x, (y1 + y2) / 2, (z1 + z2) / 2);
  mesh.rotation.x = -Math.atan2(y2 - y1, z2 - z1);
}

// a driver figure that the Car class recolours for Wally, a cop or the owner
function makeDriverFig(x, y, z) {
  const driver = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: ['#c0392b', '#2471a3', '#27ae60', '#e67e22', '#8e44ad', '#ecf0f1'][(Math.random() * 6) | 0], roughness: 0.8 });
  const skinD = new THREE.MeshStandardMaterial({ color: ['#f1c7a5', '#e0ac85', '#c68863', '#8d5a3b'][(Math.random() * 4) | 0], roughness: 0.6 });
  const hairD = new THREE.MeshStandardMaterial({ color: ['#2b1a10', '#5a3a1c', '#d9b56a', '#1a1a1a'][(Math.random() * 4) | 0], roughness: 0.9 });
  const torsoD = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.25, 4, 12), shirt); torsoD.scale.z = 0.75; torsoD.position.y = 0.3; driver.add(torsoD);
  const headD = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), skinD); headD.position.y = 0.72; headD.scale.y = 1.1; driver.add(headD);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), hairD); hairCap.position.y = 0.74; hairCap.rotation.x = -0.3; driver.add(hairCap);
  for (const sx of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.3, 3, 8), shirt); arm.position.set(sx * 0.15, 0.42, 0.2); arm.rotation.x = -1.1; driver.add(arm); }
  driver.position.set(x, y, z);
  driver.userData = { shirt, skinD, hairD, own: [shirt.color.clone(), skinD.color.clone(), hairD.color.clone()] };
  driver.visible = false;
  return driver;
}
// simple wheels: tyre, a flat hub cover and a hub, on a steering pivot
function simpleWheel(g, x, y, z, r, front, coverM, width = 0.24) {
  const tyreM = M('tyre', () => new THREE.MeshStandardMaterial({ color: '#18181a', roughness: 0.92 }));
  const pivot = new THREE.Group(); pivot.position.set(x, y, z); g.add(pivot);
  const spin = new THREE.Group(); pivot.add(spin);
  const tyre = new THREE.Mesh(M('tyreS' + r + width, () => { const t = new THREE.CylinderGeometry(r, r, width, 28); t.rotateZ(Math.PI / 2); return t; }), tyreM); spin.add(tyre);
  for (const sx of [-1, 1]) {
    const cover = new THREE.Mesh(M('coverS' + r, () => { const t = new THREE.CylinderGeometry(r * 0.72, r * 0.72, 0.02, 24); t.rotateZ(Math.PI / 2); return t; }), coverM);
    cover.position.x = sx * (width / 2 + 0.005); spin.add(cover);
    // spokes so you can see it turn
    for (let k = 0; k < 3; k++) { const s = new THREE.Mesh(M('spokeS' + r, () => new THREE.BoxGeometry(0.02, r * 1.2, 0.05)), M('blackS', () => new THREE.MeshStandardMaterial({ color: '#202124', roughness: 0.6 }))); s.position.x = sx * (width / 2 + 0.012); s.rotation.x = k * Math.PI / 3; spin.add(s); }
  }
  return { pivot, spin, front };
}
function lightGlows(body, head, tail, glows, tailGlows) {
  for (const p of head) { const s = new THREE.Sprite(glowMat('head')); s.scale.setScalar(1.2); s.position.copy(p); s.visible = false; body.add(s); glows.push(s); }
  for (const p of tail) { const s = new THREE.Sprite(glowMat('tail')); s.scale.setScalar(0.8); s.position.copy(p); s.visible = false; body.add(s); glows.push(s); tailGlows.push(s); }
}

// The Steel Wedge: flat stainless panels, a peaked roof, angular arches and light bars front and back
function buildWedge(T, paint) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const h = T.len / 2, wr = T.wheel, zF = h - 1.05, zR = -(h - 1.15), y0 = 0.42, ar = wr + 0.12;
  const steel = new THREE.MeshStandardMaterial({ color: paint, metalness: 0.85, roughness: 0.38 });
  const glassM = M('wedgeGlass', () => new THREE.MeshPhysicalMaterial({ color: '#1c2530', roughness: 0.03, metalness: 0.3, clearcoat: 1, transparent: true, opacity: 0.6, depthWrite: false }));
  const blackM = M('black', () => new THREE.MeshStandardMaterial({ color: '#141516', roughness: 0.55 }));
  const headM = M('wedgeHead', () => new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 1.6 }));
  const tailM = new THREE.MeshStandardMaterial({ color: '#7a0000', emissive: '#ff1010', emissiveIntensity: 0.8 });
  const noseY = 1.02, tailY = 1.22, apexZ = -0.25, apexY = T.hgt;
  // lower body: straight lines and trapezoid arches
  const s = new THREE.Shape();
  s.moveTo(-h, y0 + 0.15); s.lineTo(-h, tailY); s.lineTo(h, noseY); s.lineTo(h, y0 + 0.2); s.lineTo(h - 0.25, y0);
  s.lineTo(zF + ar + 0.1, y0); s.lineTo(zF + ar * 0.55, wr + ar * 0.75); s.lineTo(zF - ar * 0.55, wr + ar * 0.75); s.lineTo(zF - ar - 0.1, y0);
  s.lineTo(zR + ar + 0.1, y0); s.lineTo(zR + ar * 0.55, wr + ar * 0.75); s.lineTo(zR - ar * 0.55, wr + ar * 0.75); s.lineTo(zR - ar - 0.1, y0);
  s.lineTo(-h + 0.2, y0); s.lineTo(-h, y0 + 0.15);
  body.add(new THREE.Mesh(extrude(s, T.wid, 0.03, 4), steel));
  // the triangle on top, with the windows cut out of it
  const beltAt = (z) => noseY + (tailY - noseY) * (h - z) / (2 * h);
  const tri = new THREE.Shape(); tri.moveTo(h, noseY); tri.lineTo(apexZ, apexY); tri.lineTo(-h, tailY); tri.lineTo(h, noseY);
  const wF = h - 1.35, wB = -1.35;
  const win = [[wF, beltAt(wF) + 0.05], [apexZ + 0.1, apexY - 0.1], [wB, beltAt(wB) + (apexY - tailY) * 0.62], [wB, beltAt(wB) + 0.05]];
  tri.holes.push(new THREE.Path(win.slice().reverse().map(([a, b]) => new THREE.Vector2(a, b))));
  body.add(new THREE.Mesh(extrude(tri, T.wid - 0.04, 0.02, 2), steel));
  const ws = new THREE.Shape(win.map(([a, b]) => new THREE.Vector2(a, b)));
  const glass = new THREE.Mesh(extrude(ws, T.wid - 0.1, 0.02, 2), glassM); body.add(glass);
  // light bars and trim
  const bar = new THREE.Mesh(new THREE.BoxGeometry(T.wid - 0.1, 0.04, 0.03), headM); bar.position.set(0, noseY - 0.05, h + 0.01); body.add(bar);
  const tbar = new THREE.Mesh(new THREE.BoxGeometry(T.wid - 0.1, 0.05, 0.03), tailM); tbar.position.set(0, tailY - 0.1, -h - 0.01); body.add(tbar);
  for (const sx of [-1, 1]) { const arch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2 * h - 0.6), blackM); arch.position.set(sx * (T.wid / 2 + 0.005), y0 + 0.04, 0); body.add(arch); }
  const pm = new THREE.MeshStandardMaterial({ map: plateTexture('W' + String(100 + (plateN++ * 37) % 900) + ' LY'), roughness: 0.5 });
  for (const sz of [1, -1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.12), pm); p.position.set(0, y0 + 0.3, sz * (h + 0.035)); if (sz < 0) p.rotation.y = Math.PI; body.add(p); }
  // seats, dash and the driver inside
  const seatM = M('seat', () => new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.9 }));
  const seatZ = -0.45, seatY = 0.95;
  for (const sx of [-1, 1]) { const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.1), seatM); back.position.set(sx * 0.48, seatY + 0.32, seatZ - 0.3); body.add(back); }
  const driverFig = makeDriverFig(-0.48, seatY, seatZ - 0.05); body.add(driverFig);
  // driver's door
  const door = new THREE.Group(); door.position.set(-T.wid / 2 - 0.006, 0, 0.75); body.add(door);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.62, 1.2), steel); panel.position.set(-0.01, 0.82, -0.6); door.add(panel);
  const glows = [], tailGlows = [];
  lightGlows(body, [new THREE.Vector3(-0.6, noseY - 0.05, h + 0.12), new THREE.Vector3(0.6, noseY - 0.05, h + 0.12)], [new THREE.Vector3(-0.7, tailY - 0.1, -h - 0.1), new THREE.Vector3(0.7, tailY - 0.1, -h - 0.1)], glows, tailGlows);
  const coverM = M('wedgeCover', () => new THREE.MeshStandardMaterial({ color: '#2b2d31', roughness: 0.4, metalness: 0.6 }));
  const wx = T.wid / 2 - 0.2, wheels = [];
  for (const [sx, z, f] of [[-1, zF, true], [1, zF, true], [-1, zR, false], [1, zR, false]]) wheels.push(simpleWheel(g, sx * wx, wr, z, wr, f, coverM, 0.3));
  body.position.y = 0.05;
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; }); glass.castShadow = false;
  const amberM = M('amber', () => new THREE.MeshStandardMaterial({ color: '#ff9a1c', emissive: '#ff7a00', emissiveIntensity: 0.35, roughness: 0.3 }));
  return { group: g, body, wheels, lightbar: null, paintM: steel, tailM, headM, door, driverFig, amberM, glows, tailGlows, rearAxle: { x: wx, z: zR } };
}

// The Wee Trike: a rounded fibreglass three-wheeler van, one wheel up front
function buildTrike(T, paint) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const h = T.len / 2, wr = T.wheel, zF = h - 0.5, zR = -(h - 0.75), y0 = 0.36, ar = wr + 0.06;
  const paintM = new THREE.MeshPhysicalMaterial({ color: paint, roughness: 0.35, metalness: 0.1, clearcoat: 0.6 });
  const glassM = M('trikeGlass', () => new THREE.MeshPhysicalMaterial({ color: '#2b3a46', roughness: 0.05, metalness: 0.2, clearcoat: 1, transparent: true, opacity: 0.75 }));
  const blackM = M('black', () => new THREE.MeshStandardMaterial({ color: '#141516', roughness: 0.55 }));
  const chromeM = M('chrome', () => new THREE.MeshStandardMaterial({ color: '#e4e8ee', roughness: 0.12, metalness: 1 }));
  const headM = M('head', () => new THREE.MeshStandardMaterial({ color: '#fffbe8', emissive: '#fff1c4', emissiveIntensity: 0.3, roughness: 0.1 }));
  const tailM = new THREE.MeshStandardMaterial({ color: '#7a0000', emissive: '#ff1010', emissiveIntensity: 0.4, roughness: 0.3 });
  const roofY = T.hgt, beltY = 0.9, wsBase = h - 0.62, wsTop = h - 0.95;
  // side profile: round nose, short bonnet, upright windscreen, a tall box at the back; arches for the back wheels only
  const s = new THREE.Shape();
  s.moveTo(-h + 0.08, y0);
  s.lineTo(zR - ar - 0.02, y0); s.lineTo(zR - ar, wr); s.absarc(zR, wr, ar, Math.PI, 0, true); s.lineTo(zR + ar + 0.02, y0);
  s.lineTo(h - 0.3, y0);
  s.quadraticCurveTo(h + 0.02, y0 + 0.02, h + 0.02, 0.6);
  s.quadraticCurveTo(h, 0.86, h - 0.25, 0.9);
  s.lineTo(wsBase, beltY + 0.02);
  s.lineTo(wsTop, roofY - 0.06);
  s.quadraticCurveTo(wsTop - 0.1, roofY, wsTop - 0.25, roofY);
  s.lineTo(-h + 0.12, roofY);
  s.quadraticCurveTo(-h, roofY, -h, roofY - 0.12);
  s.lineTo(-h, y0 + 0.08);
  s.quadraticCurveTo(-h, y0, -h + 0.08, y0);
  const shell = new THREE.Mesh(extrude(s, T.wid, 0.05, 20), paintM); body.add(shell);
  // windscreen and side windows (the back is a solid van box)
  const wsLen = Math.hypot(wsBase - wsTop, roofY - 0.06 - beltY);
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(T.wid - 0.3, wsLen - 0.08), glassM);
  { const dy = roofY - 0.06 - beltY, dz = wsBase - wsTop, l = Math.hypot(dy, dz); // sit it just proud of the bodywork
    ws.position.set(0, (beltY + roofY - 0.06) / 2 + dz / l * 0.07, (wsBase + wsTop) / 2 + dy / l * 0.07); ws.rotation.x = -Math.atan2(dz, dy); }
  body.add(ws);
  for (const sx of [-1, 1]) {
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(0.62, roofY - beltY - 0.16), glassM);
    sw.position.set(sx * (T.wid / 2 + 0.004), (beltY + roofY) / 2, wsTop - 0.42); sw.rotation.y = sx * Math.PI / 2; body.add(sw);
  }
  // livery on the van box: Uncle Tam's bargain empire
  const c = document.createElement('canvas'); c.width = 512; c.height = 192; const x = c.getContext('2d');
  x.textAlign = 'center'; x.textBaseline = 'middle';
  const fit = (t, size, maxW, font) => { let sz = size; do { x.font = `${font} ${sz}px Georgia, serif`; sz -= 2; } while (x.measureText(t).width > maxW && sz > 10); };
  x.fillStyle = '#7a1a10'; fit("UNCLE TAM'S BARGAINS", 64, 490, 'bold italic'); x.fillText("UNCLE TAM'S BARGAINS", 256, 70);
  x.fillStyle = '#1c2a52'; fit('Nae refunds · Nae questions · Nae VAT', 34, 490, 'italic'); x.fillText('Nae refunds · Nae questions · Nae VAT', 256, 140);
  const lt = new THREE.CanvasTexture(c); lt.colorSpace = THREE.SRGBColorSpace; lt.anisotropy = 4;
  const lm = new THREE.MeshStandardMaterial({ map: lt, transparent: true, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 });
  const panelLen = wsTop - 0.75 - (-h + 0.15);
  for (const sx of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(panelLen, panelLen * 192 / 512), lm);
    p.position.set(sx * (T.wid / 2 + 0.006), (beltY + roofY) / 2 + 0.02, (wsTop - 0.75 + (-h + 0.15)) / 2); p.rotation.y = sx * Math.PI / 2; body.add(p);
  }
  // round headlights, a wee grille, bumpers, tail lights, roof rack
  const glows = [], tailGlows = [];
  for (const sx of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.02, 8, 20), chromeM); ring.position.set(sx * 0.42, 0.66, h + 0.075); ring.rotation.x = -0.35; body.add(ring);
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.08, 20), headM); lamp.position.set(sx * 0.42, 0.66, h + 0.08); lamp.rotation.x = -0.35; body.add(lamp);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.04), tailM); tl.position.set(sx * (T.wid / 2 - 0.14), 0.75, -h - 0.01); body.add(tl);
  }
  for (const sz of [1, -1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(T.wid - 0.1, 0.07, 0.08), chromeM); b.position.set(0, y0 + 0.08, sz * (h + 0.02)); body.add(b); }
  for (const sx of [-1, 1]) { const rr = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 1.3), blackM); rr.position.set(sx * (T.wid / 2 - 0.15), roofY + 0.06, -0.4); body.add(rr); }
  const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 1.2), M('ladder', () => new THREE.MeshStandardMaterial({ color: '#b8bcc2', metalness: 0.8, roughness: 0.4 }))); ladder.position.set(0, roofY + 0.11, -0.4); body.add(ladder);
  lightGlows(body, [new THREE.Vector3(-0.42, 0.66, h + 0.2), new THREE.Vector3(0.42, 0.66, h + 0.2)], [new THREE.Vector3(-(T.wid / 2 - 0.14), 0.75, -h - 0.08), new THREE.Vector3(T.wid / 2 - 0.14, 0.75, -h - 0.08)], glows, tailGlows);
  const pm = new THREE.MeshStandardMaterial({ map: plateTexture('W' + String(100 + (plateN++ * 37) % 900) + ' LY'), roughness: 0.5 });
  for (const sz of [1, -1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.11), pm); p.position.set(0, y0 + 0.22, sz * (h + 0.07)); if (sz < 0) p.rotation.y = Math.PI; body.add(p); }
  // inside: one seat each side and the driver
  const seatM = M('seat', () => new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.9 }));
  const seatZ = wsTop - 0.55, seatY = 0.62;
  for (const sx of [-1, 1]) { const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.08), seatM); back.position.set(sx * 0.32, seatY + 0.3, seatZ - 0.25); body.add(back); }
  const driverFig = makeDriverFig(-0.32, seatY, seatZ - 0.05); driverFig.scale.setScalar(0.9); body.add(driverFig);
  const door = new THREE.Group(); door.position.set(-T.wid / 2 - 0.006, 0, wsTop - 0.12); body.add(door);
  const dpanel = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.75), paintM); dpanel.position.set(-0.01, 0.62, -0.37); door.add(dpanel);
  const guard = new THREE.Mesh(new THREE.CylinderGeometry(wr + 0.05, wr + 0.05, 0.22, 20, 1, true, -Math.PI / 2, Math.PI), blackM.clone()); guard.material.side = THREE.DoubleSide;
  guard.rotation.z = Math.PI / 2; guard.position.set(0, wr, zF); body.add(guard);
  // the famous wheel layout: one up front, two at the back
  const coverM = M('trikeCover', () => new THREE.MeshStandardMaterial({ color: '#d6d9de', roughness: 0.3, metalness: 0.8 }));
  const wx = T.wid / 2 - 0.12, wheels = [simpleWheel(g, 0, wr, zF, wr, true, coverM, 0.16)];
  for (const sx of [-1, 1]) wheels.push(simpleWheel(g, sx * wx, wr, zR, wr, false, coverM, 0.16));
  body.position.y = 0.03;
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  const amberM = M('amber', () => new THREE.MeshStandardMaterial({ color: '#ff9a1c', emissive: '#ff7a00', emissiveIntensity: 0.35, roughness: 0.3 }));
  return { group: g, body, wheels, lightbar: null, paintM, tailM, headM, door, driverFig, amberM, glows, tailGlows, rearAxle: { x: wx, z: zR } };
}

// a soft cone of light in front of the headlights at night: one shared geometry and material for every car
let beamGeo = null, beamMat = null;
function headBeam(T) {
  if (!beamGeo) {
    beamGeo = new THREE.ConeGeometry(1.6, 9, 24, 1, true); beamGeo.translate(0, -4.5, 0); beamGeo.rotateX(-Math.PI / 2 + 0.08);
    // brightest at the lamp, fading with distance, and soft at the edges of the cone (where you look across it)
    beamMat = new THREE.ShaderMaterial({
      uniforms: { col: { value: new THREE.Color('#fff1d0') }, op: { value: 0.38 } },
      vertexShader: 'varying float vL; varying vec3 vN; varying vec3 vV; void main(){ vL = uv.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 col; uniform float op; varying float vL; varying vec3 vN; varying vec3 vV; void main(){ float edge = pow(abs(dot(normalize(vN), normalize(vV))), 2.2); float a = op * pow(vL, 2.0) * edge; gl_FragColor = vec4(col * a, a); }',
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    SHARED.add(beamGeo); SHARED.add(beamMat);
  }
  const m = new THREE.Mesh(beamGeo, beamMat); m.scale.set(T.wid / 1.9, 0.55, 1); m.castShadow = false; m.visible = false;
  return m;
}
export function buildCarModel(type, paint) {
  const T = TYPES[type];
  if (type === 'wedge') return buildWedge(T, paint);
  if (type === 'trike') return buildTrike(T, paint);
  const S = carSpec(type, T);
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const isBox = type === 'van' || type === 'icecream';
  const paintM = new THREE.MeshPhysicalMaterial({ color: paint, roughness: 0.22, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.05 });
  // clear, lightly tinted glass you can see the seats and driver through; shiny but not mirrored
  // windscreen/rear glass is light; side windows a bit darker, like real cars, so the far pillars don't show as a cage
  const glassM = M('glass', () => new THREE.MeshPhysicalMaterial({ color: '#9db4c4', roughness: 0.02, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.3, depthWrite: false, envMapIntensity: 0.9 }));
  const sideGlassM = M('sideglass', () => new THREE.MeshPhysicalMaterial({ color: '#33424e', roughness: 0.02, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.55, depthWrite: false, envMapIntensity: 1 }));
  const doorGlassM = M('doorglass', () => new THREE.MeshPhysicalMaterial({ color: '#33424e', roughness: 0.02, metalness: 0.2, clearcoat: 1, transparent: true, opacity: 0.3, depthWrite: false }));
  const blackM = M('black', () => new THREE.MeshStandardMaterial({ color: '#141516', roughness: 0.55 }));
  const satinM = M('satin', () => new THREE.MeshStandardMaterial({ color: '#2a2c30', roughness: 0.4, metalness: 0.5 }));
  const chromeM = M('chrome', () => new THREE.MeshStandardMaterial({ color: '#e4e8ee', roughness: 0.12, metalness: 1 }));
  const tyreM = M('tyre', () => new THREE.MeshStandardMaterial({ color: '#18181a', roughness: 0.92 }));
  const alloyM = M('alloy', () => new THREE.MeshStandardMaterial({ color: '#c8ccd2', roughness: 0.25, metalness: 0.9 }));
  const discM = M('disc', () => new THREE.MeshStandardMaterial({ color: '#6b6e73', roughness: 0.5, metalness: 0.8 }));
  const linerM = M('liner', () => new THREE.MeshStandardMaterial({ color: '#0b0b0c', roughness: 1, side: THREE.BackSide }));
  const headM = M('head', () => new THREE.MeshStandardMaterial({ color: '#fffbe8', emissive: '#fff1c4', emissiveIntensity: 0.3, roughness: 0.1 }));
  const tailM = new THREE.MeshStandardMaterial({ color: '#7a0000', emissive: '#ff1010', emissiveIntensity: 0.4, roughness: 0.3 });
  const glows = [], tailGlows = [];
  const { h, y0, beltY, roofY, xW, xRf, xRr, xC, nose, hoodY, deckY } = S;

  // ---- body shell, glass and roof ----
  const bodyMesh = new THREE.Mesh(extrude(bodyShape(S), T.wid, 0.05, 20), paintM);
  const cabin = new THREE.Mesh(extrude(glassShape(S), T.wid - 0.22, 0.06, 16), [sideGlassM, glassM]); // group 0 = side windows, 1 = screens and roof
  // black rubber window surrounds on both sides
  {
    const outer = glassShape(S).getPoints(12);
    const cx = outer.reduce((a, p) => a + p.x, 0) / outer.length, cy = outer.reduce((a, p) => a + p.y, 0) / outer.length;
    const frame = new THREE.Shape(outer.map((p) => p.clone()));
    const inner = outer.map((p) => { const dx = p.x - cx, dy = p.y - cy, l = Math.hypot(dx, dy) || 1; return new THREE.Vector2(p.x - dx / l * 0.055, p.y - dy / l * 0.055); });
    frame.holes.push(new THREE.Path(inner.reverse()));
    const fg = new THREE.ExtrudeGeometry(frame, { depth: 0.015, bevelEnabled: false, curveSegments: 4 }); fg.rotateY(-Math.PI / 2);
    for (const sx of [-1, 1]) { const f = new THREE.Mesh(fg, blackM); f.position.x = sx * (T.wid / 2 - 0.045) + (sx < 0 ? 0.015 : 0); body.add(f); }
  }
  body.add(bodyMesh, cabin);
  const pillarX = T.wid / 2 - 0.06;
  if (!isBox) {
    const roofLen = Math.abs(xRf - xRr) + 0.1;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(T.wid - 0.16, 0.06, roofLen), paintM);
    roof.position.set(0, roofY + 0.035, (xRf + xRr) / 2); body.add(roof);
    for (const sx of [-1, 1]) {
      const a = strut(Math.hypot(xRf - xW, roofY - beltY), paintM); placeStrut(a, sx * pillarX, xW, beltY, xRf, roofY); body.add(a);           // A pillar
      const cp = strut(Math.hypot(xRr - xC, roofY - beltY), paintM, 0.07, 0.12); placeStrut(cp, sx * pillarX, xC, beltY, xRr, roofY); body.add(cp); // C pillar
      const xB = (xRf + xRr) / 2 + (type === 'hatch' ? 0.25 : 0.1);
      const b = strut(roofY - beltY, paintM, 0.06, 0.1); b.position.set(sx * pillarX, (roofY + beltY) / 2, xB); b.rotation.x = Math.PI / 2; body.add(b); // B pillar
      const trim = strut(Math.abs(xW - xC), chromeM, 0.02, 0.025); trim.position.set(sx * (T.wid / 2 + 0.002), beltY + 0.02, (xW + xC) / 2); body.add(trim); // window line
    }
  } else {
    // the load box stops behind the cab, so the cab has proper see-through windows
    const boxLen = T.len - 1.75;
    const box = new THREE.Mesh(new THREE.BoxGeometry(T.wid - 0.04, T.hgt - 1.1, boxLen), paintM);
    box.position.set(0, (T.hgt + 1.12) / 2, -T.len / 2 + boxLen / 2); body.add(box);
    const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(T.wid - 0.12, 0.07, Math.abs(xRf - (h - 1.75)) + 0.05), paintM);
    cabRoof.position.set(0, roofY + 0.04, (xRf + h - 1.75) / 2); body.add(cabRoof);
    for (const sx of [-1, 1]) { const a = strut(Math.hypot(xRf - xW, roofY - beltY), paintM); placeStrut(a, sx * pillarX, xW, beltY, xRf, roofY); body.add(a); }
    if (type === 'icecream') {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 16), M('cone', () => new THREE.MeshStandardMaterial({ color: '#d9a35a' })));
      cone.rotation.x = Math.PI; cone.position.set(0, T.hgt + 0.4, 0.2); body.add(cone);
      const scoop = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), M('scoop', () => new THREE.MeshStandardMaterial({ color: '#fff0f5', roughness: 0.8 })));
      scoop.position.set(0, T.hgt + 0.85, 0.2); body.add(scoop);
    }
  }
  // dark arch liners so the wheel wells don't show bare paint
  for (const z of [S.zF, S.zR]) {
    const ln = new THREE.Mesh(new THREE.CylinderGeometry(S.archR - 0.005, S.archR - 0.005, T.wid - 0.06, 24, 1, true, 0, Math.PI), linerM);
    ln.rotation.z = Math.PI / 2; ln.position.set(0, S.cy, z); body.add(ln);
  }
  // lower lips front and back
  for (const sz of [1, -1]) {
    const lip = new THREE.Mesh(new THREE.BoxGeometry(T.wid - 0.12, 0.06, 0.12), blackM); lip.position.set(0, y0 + 0.03, sz * (h - 0.02)); body.add(lip);
  }
  // ---- front end: grille, intake, badge, headlight units ----
  const grilleW = isBox ? T.wid * 0.55 : T.wid * 0.4, grilleY = isBox ? nose + 0.02 : (nose + hoodY) / 2 - 0.03;
  const grille = new THREE.Mesh(new THREE.BoxGeometry(grilleW, 0.17, 0.04), M('grille', () => {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 32; const x = cv.getContext('2d');
    x.fillStyle = '#0d0d0e'; x.fillRect(0, 0, 64, 32); x.strokeStyle = '#3a3c40'; x.lineWidth = 2;
    for (let i = -32; i < 96; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 16, 32); x.stroke(); x.beginPath(); x.moveTo(i + 16, 0); x.lineTo(i, 32); x.stroke(); }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, metalness: 0.4 });
  }));
  grille.position.set(0, grilleY, h + 0.012); body.add(grille);
  const gframe = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.012, 6, 32), chromeM); gframe.scale.set(grilleW, 0.18, 1); gframe.position.set(0, grilleY, h + 0.03); body.add(gframe);
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), chromeM); badge.position.set(0, grilleY, h + 0.036); body.add(badge);
  const intake = new THREE.Mesh(new THREE.BoxGeometry(T.wid * 0.55, 0.08, 0.04), blackM); intake.position.set(0, y0 + 0.14, h + 0.01); body.add(intake);
  let hl = null, tl = null;
  for (const sx of [-1, 1]) {
    // headlight: chrome reflector housing with a glowing lens
    const hy = isBox ? hoodY - 0.12 : (nose + hoodY) / 2 + 0.02, hz = h - (isBox ? 0.0 : 0.08);
    const housing = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.2, 4, 12), chromeM); housing.rotation.z = Math.PI / 2; housing.scale.set(1, 1, 0.5);
    housing.position.set(sx * (T.wid / 2 - 0.3), hy, hz); body.add(housing);
    hl = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.18, 4, 12), headM); hl.rotation.z = Math.PI / 2; hl.scale.set(1, 1, 0.5);
    hl.position.set(sx * (T.wid / 2 - 0.3), hy, hz + 0.025); body.add(hl);
    // tail light: a wide red strip with a clear reversing lamp
    tl = new THREE.Mesh(new THREE.BoxGeometry(isBox ? 0.25 : 0.42, isBox ? 0.3 : 0.12, 0.05), tailM);
    tl.position.set(sx * (T.wid / 2 - 0.27), isBox ? 0.95 : deckY - 0.14, -h - 0.012); body.add(tl);
    const rev = new THREE.Mesh(new THREE.BoxGeometry(0.1, isBox ? 0.08 : 0.12, 0.05), headM); rev.position.set(sx * (T.wid / 2 - 0.53), isBox ? 0.75 : deckY - 0.14, -h - 0.012); body.add(rev);
    // night-time glows: a soft halo round each headlight and taillight
    const hg = new THREE.Sprite(glowMat('head')); hg.scale.setScalar(1.3); hg.position.copy(hl.position).add(new THREE.Vector3(0, 0, 0.12)); hg.visible = false; body.add(hg); glows.push(hg);
    const tg = new THREE.Sprite(glowMat('tail')); tg.scale.setScalar(0.8); tg.position.copy(tl.position).add(new THREE.Vector3(0, 0, -0.08)); tg.visible = false; body.add(tg); glows.push(tg); tailGlows.push(tg);
    // door mirror: body-coloured housing with a dark glass face
    const mz = xW - 0.12, my = beltY + 0.1;
    const mh = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.1, 4, 10), paintM); mh.rotation.z = Math.PI / 2; mh.scale.set(1, 1, 0.75);
    mh.position.set(sx * (T.wid / 2 + 0.1), my, mz); body.add(mh);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.05), blackM); arm.position.set(sx * (T.wid / 2 + 0.03), my - 0.03, mz + 0.02); body.add(arm);
  }
  // plates
  const ptxt = 'W' + String(100 + (plateN++ * 37) % 900) + ' LY';
  const pm = new THREE.MeshStandardMaterial({ map: plateTexture(ptxt), roughness: 0.5 });
  for (const sz of [1, -1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.12), pm);
    p.position.set(0, y0 + 0.26, sz * (h + 0.045)); if (sz < 0) p.rotation.y = Math.PI; body.add(p);
  }
  // type extras
  let lightbar = null;
  if (type === 'sports') { // rear wing
    for (const sx of [-0.5, 0.5]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.1), blackM); st.position.set(sx, deckY + 0.08, -h + 0.25); body.add(st); }
    const wing = new THREE.Mesh(new THREE.BoxGeometry(T.wid - 0.15, 0.03, 0.28), paintM); wing.position.set(0, deckY + 0.18, -h + 0.22); wing.rotation.x = 0.08; body.add(wing);
  }
  if (type === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.25), new THREE.MeshStandardMaterial({ color: '#ffd23f', emissive: '#ffb300', emissiveIntensity: 0.8 }));
    sign.position.set(0, roofY + 0.17, (xRf + xRr) / 2 + 0.3); body.add(sign);
  }
  if (type === 'police') {
    lightbar = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.3), blackM); lightbar.add(base);
    const blueM = new THREE.MeshStandardMaterial({ color: '#2050ff', emissive: '#1040ff', emissiveIntensity: 0.5 });
    const redM = new THREE.MeshStandardMaterial({ color: '#ff2030', emissive: '#ff1020', emissiveIntensity: 0.5 });
    const bL = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.4, 4, 10), blueM); bL.rotation.z = Math.PI / 2; bL.position.set(-0.3, 0.1, 0);
    const bR = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.4, 4, 10), redM); bR.rotation.z = Math.PI / 2; bR.position.set(0.3, 0.1, 0);
    lightbar.add(bL, bR); lightbar.userData = { blueM, redM };
    lightbar.position.set(0, roofY + 0.1, (xRf + xRr) / 2); body.add(lightbar);
    // chequered side stripe (yellow & blue) along the doors
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 32; const cx = cv.getContext('2d');
    for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { cx.fillStyle = (i + j) % 2 ? '#1a3fa8' : '#f2e21a'; cx.fillRect(i * 16, j * 16, 16, 16); }
    const st = new THREE.CanvasTexture(cv); st.colorSpace = THREE.SRGBColorSpace;
    for (const sx of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(S.zF - S.zR) - S.archR * 2 - 0.1, 0.26), new THREE.MeshStandardMaterial({ map: st, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 }));
      p.position.set(sx * (T.wid / 2 + 0.006), (beltY + y0) / 2 + 0.06, (S.zF + S.zR) / 2); p.rotation.y = sx * Math.PI / 2; body.add(p);
    }
  }
  // ---- wheels: rounded tyres, five-spoke alloys, brake discs and calipers ----
  const wheels = [];
  const wr = T.wheel, ww = 0.24, wx = T.wid / 2 - 0.16;
  const tyreG = M('tyreL' + wr, () => {
    const rim = wr * 0.66, pts = [[rim, -ww / 2], [wr - 0.035, -ww / 2], [wr, -ww / 2 + 0.05], [wr, ww / 2 - 0.05], [wr - 0.035, ww / 2], [rim, ww / 2]].map(([a, b]) => new THREE.Vector2(a, b));
    const t = new THREE.LatheGeometry(pts, 32); t.rotateZ(Math.PI / 2); return t;
  });
  const dishG = M('dish' + wr, () => { const t = new THREE.CylinderGeometry(wr * 0.66, wr * 0.6, ww * 0.9, 24, 1, true); t.rotateZ(Math.PI / 2); return t; });
  const discG = M('discG' + wr, () => { const t = new THREE.CylinderGeometry(wr * 0.55, wr * 0.55, 0.03, 24); t.rotateZ(Math.PI / 2); return t; });
  const hubG = M('hub' + wr, () => { const t = new THREE.CylinderGeometry(wr * 0.16, wr * 0.18, 0.05, 16); t.rotateZ(Math.PI / 2); return t; });
  const spokeG = M('spokeL' + wr, () => new THREE.BoxGeometry(0.025, wr * 0.5, 0.06));
  const caliperM = type === 'sports' || type === 'police' ? M('calRed', () => new THREE.MeshStandardMaterial({ color: '#c0392b', roughness: 0.4 })) : satinM;
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const pivot = new THREE.Group(); pivot.position.set(sx * wx, wr, sz * (sz > 0 ? S.zF : -S.zR)); g.add(pivot);
    const spin = new THREE.Group(); pivot.add(spin);
    spin.add(new THREE.Mesh(tyreG, tyreM));
    const dish = new THREE.Mesh(dishG, alloyM); spin.add(dish);
    const disc = new THREE.Mesh(discG, discM); disc.position.x = -sx * 0.03; spin.add(disc);
    const hub = new THREE.Mesh(hubG, alloyM); hub.position.x = sx * (ww / 2 - 0.02); spin.add(hub);
    for (let k = 0; k < 5; k++) {
      const sp = new THREE.Mesh(spokeG, alloyM); const a = k * Math.PI * 2 / 5;
      sp.position.set(sx * (ww / 2 - 0.03), Math.cos(a) * wr * 0.38, Math.sin(a) * wr * 0.38); sp.rotation.x = -a; spin.add(sp);
    }
    // the caliper doesn't spin with the wheel
    const cal = new THREE.Mesh(new THREE.BoxGeometry(0.06, wr * 0.35, wr * 0.22), caliperM); cal.position.set(sx * 0.0, wr * 0.38, -sz * wr * 0.1); pivot.add(cal);
    wheels.push({ pivot, spin, front: sz > 0 });
  }
  body.position.y = 0.05;
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; } });
  cabin.castShadow = false; // glass mustn't shade the interior, or the windows look solid
  // driver's door (right-hand drive, so on the car's right, which is local -X), hinged at its front edge
  const hingeZ = isBox ? h - 0.95 : xW - 0.04, doorLen = isBox ? 0.95 : Math.min(T.len * 0.27, Math.abs(xW - xRr) * 0.75);
  const door = new THREE.Group(); door.position.set(-T.wid / 2 - 0.006, 0, hingeZ); body.add(door);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.03, beltY - y0 - 0.12, doorLen), paintM);
  panel.position.set(-0.01, (beltY + y0 + 0.12) / 2, -doorLen / 2); panel.castShadow = true; door.add(panel);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.02, isBox ? 0.55 : (roofY - beltY) * 0.7, doorLen * (isBox ? 0.8 : 0.7)), doorGlassM);
  win.position.set(0.004, beltY + (isBox ? 0.3 : (roofY - beltY) * 0.36), -doorLen * (isBox ? 0.45 : 0.55)); door.add(win);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.14), chromeM);
  handle.position.set(-0.03, beltY - 0.1, -doorLen * 0.8); door.add(handle);
  // ---------- extra detail ----------
  const trimM = M('trim', () => new THREE.MeshStandardMaterial({ color: '#0f1012', roughness: 0.55 }));
  const amberM = M('amber', () => new THREE.MeshStandardMaterial({ color: '#ff9a1c', emissive: '#ff7a00', emissiveIntensity: 0.35, roughness: 0.3 }));
  // side skirts between the arches
  for (const sx of [-1, 1]) { const sill = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, Math.abs(S.zF - S.zR) - S.archR * 2 - 0.08), trimM); sill.position.set(sx * (T.wid / 2 + 0.008), y0 + 0.05, (S.zF + S.zR) / 2); body.add(sill); }
  // indicators: corner lamps up front, repeaters on the wings
  for (const sx of [-1, 1]) {
    const fi = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.05), amberM); fi.position.set(sx * (T.wid / 2 - 0.1), (isBox ? hoodY - 0.12 : (nose + hoodY) / 2 + 0.02) - 0.09, h - 0.03); body.add(fi);
    const rep = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.03, 0.08), amberM); rep.position.set(sx * (T.wid / 2 + 0.004), hoodY - 0.08, S.zF - S.archR - 0.12); body.add(rep);
    const fog = new THREE.Mesh(new THREE.CircleGeometry(0.045, 14), headM); fog.position.set(sx * (T.wid / 2 - 0.32), y0 + 0.14, h + 0.035); body.add(fog);
  }
  // windscreen wipers
  if (!isBox) for (const sx of [-0.25, 0.3]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.015, 0.02), trimM); w.position.set(sx, beltY + 0.05, xW - 0.06); w.rotation.z = 0.12; body.add(w); }
  // twin exhausts
  for (const ex0 of type === 'sports' ? [0.32, 0.5] : [0.4]) { const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.2, 12), chromeM); ex.rotation.x = Math.PI / 2; ex.position.set(T.wid / 2 - ex0, y0 + 0.06, -h - 0.04); body.add(ex); }
  // rear door seam on four-door cars
  if (type === 'saloon' || type === 'taxi' || type === 'police') for (const sx of [-1, 1]) { const seam = new THREE.Mesh(new THREE.BoxGeometry(0.012, beltY - y0 - 0.14, 0.015), trimM); seam.position.set(sx * (T.wid / 2 + 0.008), (beltY + y0) / 2 + 0.04, hingeZ - doorLen - 0.02); body.add(seam); }
  // aerial and roof rails
  if (type === 'saloon' || type === 'taxi') { const ae = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.55, 6), trimM); ae.position.set(T.wid / 2 - 0.3, roofY + 0.3, xRr + 0.1); ae.rotation.x = -0.25; body.add(ae); }
  if (type === 'hatch' || isBox) for (const sx of [-1, 1]) { const rr = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, isBox ? T.len * 0.6 : Math.abs(xRf - xRr) * 0.9), chromeM); rr.position.set(sx * (T.wid / 2 - 0.14), (isBox ? T.hgt + 0.03 : roofY + 0.1), isBox ? -0.6 : (xRf + xRr) / 2); body.add(rr); }
  // interior, seen through the glass: seats, dashboard, steering wheel (right-hand drive)
  const seatM = M('seat', () => new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.9 }));
  const seatZ = hingeZ - doorLen * 0.62, seatY = isBox ? 0.85 : beltY - 0.35;
  for (const sx of [-1, 1]) {
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.5), seatM); cushion.position.set(sx * (T.wid / 2 - 0.45), seatY, seatZ); body.add(cushion);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.6, 0.1), seatM); back.position.set(sx * (T.wid / 2 - 0.45), seatY + 0.32, seatZ - 0.27); back.rotation.x = -0.15; body.add(back);
    const rest = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.1), seatM); rest.position.set(sx * (T.wid / 2 - 0.45), seatY + 0.72, seatZ - 0.33); body.add(rest);
  }
  const dash = new THREE.Mesh(new THREE.BoxGeometry(T.wid - 0.3, 0.16, 0.35), trimM); dash.position.set(0, beltY - 0.02, Math.min(seatZ + 0.75, xW - 0.25)); body.add(dash);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.022, 8, 24), trimM);
  wheel.position.set(-(T.wid / 2 - 0.45), beltY + 0.05, Math.min(seatZ + 0.48, xW - 0.45)); wheel.rotation.x = -0.45; body.add(wheel);

  // the driver: shown whenever someone is at the wheel
  const driver = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: ['#c0392b', '#2471a3', '#27ae60', '#e67e22', '#8e44ad', '#ecf0f1'][(Math.random() * 6) | 0], roughness: 0.8 });
  const skinD = new THREE.MeshStandardMaterial({ color: ['#f1c7a5', '#e0ac85', '#c68863', '#8d5a3b'][(Math.random() * 4) | 0], roughness: 0.6 });
  const hairD = new THREE.MeshStandardMaterial({ color: ['#2b1a10', '#5a3a1c', '#d9b56a', '#1a1a1a'][(Math.random() * 4) | 0], roughness: 0.9 });
  const torsoD = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.25, 4, 12), shirt); torsoD.scale.z = 0.75; torsoD.position.y = 0.3; driver.add(torsoD);
  const headD = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), skinD); headD.position.y = 0.72; headD.scale.y = 1.1; driver.add(headD);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), hairD); hairCap.position.y = 0.74; hairCap.rotation.x = -0.3; driver.add(hairCap);
  for (const sx of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.3, 3, 8), shirt); arm.position.set(sx * 0.15, 0.42, 0.2); arm.rotation.x = -1.1; driver.add(arm); }
  driver.position.set(-(T.wid / 2 - 0.45), seatY, seatZ - 0.05);
  driver.userData = { shirt, skinD, hairD, own: [shirt.color.clone(), skinD.color.clone(), hairD.color.clone()] };
  driver.visible = false; body.add(driver);
  return { group: g, body, wheels, lightbar, paintM, tailM, headM, door, driverFig: driver, amberM, glows, tailGlows, rearAxle: { x: wx, z: S.zR } };
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
    if (type === 'wedge') this.paint = '#b9bfc6';
    if (type === 'trike') this.paint = paint || '#f0c419';
    const m = buildCarModel(type, this.paint);
    Object.assign(this, m);
    this.beam = headBeam(this.T); this.beam.position.set(0, 0.7, this.T.len / 2 + 0.1); this.body.add(this.beam);
    this.name = this.T.names[(Math.random() * this.T.names.length) | 0];
    this.x = x; this.z = z; this.y = 0; this.heading = heading;
    this.vx = 0; this.vz = 0; this.steer = 0; this.vf = 0; this.yawRate = 0;
    this.health = 1000; this.burnT = 0; this.dead = false; this.deadT = 0;
    this.driver = null;     // 'ai' | 'player' | 'cop' | null
    this.ai = null;
    this.input = { throttle: 0, steer: 0, brake: false, hand: false };
    this.pitch = 0; this.roll = 0; this.lastHit = 0; this.horn = 0; this.doorOpen = 0;
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
    const T = this.T;
    let inp = this.input;
    if (this.tip) inp = { throttle: 0, steer: 0, hand: false, brake: false }; // on its side: nae driving
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
    let grip = T.grip * (game && game.grip ? game.grip : 1); // wet roads are slippy
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
    const brk = { speed: Math.hypot(this.vx, this.vz), vx: this.vx, vz: this.vz, knocked: false };
    for (const k of [1, 0, -1]) {
      const cx = nx + nfx * o * k, cz = nz + nfz * o * k;
      const c = world.collide(cx, cz, this.radius, 0, brk);
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
    if (brk.knocked) { this.vx *= 0.78; this.vz *= 0.78; this.damage(25, game); if (this.driver === 'ai' && game) game.onHonk(this, 'crash'); }
    if (impact > 3) this.damage(impact * impact * 1.1, game, 'crash');
    if (impact > 2 && game) game.onCarImpact(this, impact);
    // ground follow, stunt ramps and flight
    const gy = Math.min(0.2, Math.max(0, world.groundHeight(this.x, this.z, 0.5)));
    let rampH = -1, ramp = null;
    if (game && game.ramps) for (const r of game.ramps) {
      const rx = this.x - r.x, rz = this.z - r.z, along = rx * r.dx + rz * r.dz, across = rx * r.dz - rz * r.dx;
      if (Math.abs(across) < r.w / 2 && along > -0.2 && along < r.l + 0.6) { rampH = Math.max(0, Math.min(1, along / r.l)) * r.h; ramp = r; }
    }
    const fwd = this.vx * Math.sin(this.heading) + this.vz * Math.cos(this.heading);
    if (this.air) {
      this.airT += dt; this.vy -= 16 * dt; this.y += this.vy * dt;
      this.pitch = Math.max(-0.45, Math.min(0.45, -this.vy * 0.035));
      if (this.y <= gy && this.vy < 0) {
        const thump = -this.vy;
        this.air = false; this.y = gy; this.pitch = 0;
        if (thump > 9) this.damage((thump - 9) * 30, game, 'crash');
        if (game && game.onStunt) game.onStunt('land', this, thump);
      }
    } else if (ramp && rampH >= 0) {
      const along = (this.x - ramp.x) * ramp.dx + (this.z - ramp.z) * ramp.dz;
      const goingUp = (this.vx * ramp.dx + this.vz * ramp.dz) > 0;
      if (along > ramp.l && goingUp && this.speed > 13) { // off the lip and into the air
        this.air = true; this.airT = 0; this.vy = this.speed * (ramp.h / ramp.l) * 1.15 + 2.5; this.y = ramp.h;
        this.launch = [this.x, this.z]; this.lastRamp = ramp;
        if (game && game.onStunt) game.onStunt('launch', this);
      } else {
        this.y = Math.max(gy, along <= ramp.l ? rampH : gy);
        this.pitch = goingUp && along <= ramp.l ? -Math.atan(ramp.h / ramp.l) : 0;
      }
    } else this.y += (gy - this.y) * Math.min(1, dt * 12);
    // visual tilt
    const accel = (vf - (this._lastVf || 0)) / Math.max(dt, 1e-3); this._lastVf = vf;
    if (!this.air && rampH < 0) this.pitch += (Math.max(-0.06, Math.min(0.06, -accel * 0.004)) - this.pitch) * Math.min(1, dt * 6);
    this.roll += (Math.max(-0.08, Math.min(0.08, yaw * vf * 0.0035 + vr * 0.01)) - this.roll) * Math.min(1, dt * 6);
    if (this.type === 'trike') {
      // one wheel at the front: corner too hard and over she goes, then rocks back onto her wheels
      if (!this.tip && !this.air && Math.abs(yaw * vf) > 7.5 && Math.abs(vf) > 9) {
        this.tip = { t: 0, side: Math.sign(yaw * vf) }; this.vx *= 0.55; this.vz *= 0.55;
        if (game && game.onTip) game.onTip(this);
      }
      if (this.tip) {
        const tp = this.tip; tp.t += dt;
        this.vx *= Math.exp(-2.5 * dt); this.vz *= Math.exp(-2.5 * dt);
        const k = tp.t < 0.35 ? tp.t / 0.35 : (tp.t < 2.4 ? 1 : Math.max(0, 1 - (tp.t - 2.4) / 0.5));
        this.tipRoll = tp.side * 1.45 * (k * k * (3 - 2 * k));
        if (tp.t > 2.9) { this.tip = null; this.tipRoll = 0; }
      }
    }
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
    if (this.door) this.door.rotation.y += (this.doorOpen * 1.15 - this.door.rotation.y) * Math.min(1, dt * 10);
    if (this.driverFig) {
      const who = this.driver === 'player' ? 'wally' : ((this.driver === 'ai' || this.driver === 'cop' || (this.driver === 'jacked' && !this.driverOut)) ? 'npc' : null);
      this.driverFig.visible = !!who && !this.dead;
      if (who !== this._who) {
        this._who = who; const u = this.driverFig.userData;
        if (who === 'wally') { u.shirt.color.set((game && game.wallySuit) || '#1f5fc4'); u.skinD.color.set('#f0c09a'); u.hairD.color.set('#c8763a'); }
        else if (this.driver === 'cop' || this.type === 'police') { u.shirt.color.set('#1c2a4a'); u.skinD.color.copy(u.own[1]); u.hairD.color.set('#151c30'); }
        else { u.shirt.color.copy(u.own[0]); u.skinD.color.copy(u.own[1]); u.hairD.color.copy(u.own[2]); }
      }
    }
    const braking = inp.throttle < 0 && vf > 0.5;
    this.tailM.emissiveIntensity = braking ? 3.5 : (game && game.night > 0.3 ? 1.4 : 0.4);
    const lit = !!game && (game.night > 0.25 || game.weatherDark) && !this.dead;
    if (this.glows) for (const s of this.glows) s.visible = lit;
    if (this.beam) this.beam.visible = lit && !!game.hiFx && !this.tip;
    if (lit) for (const s of this.tailGlows) s.scale.setScalar(braking ? 1.4 : 0.8);
    // tyres squeal and leave rubber when the back end steps out or the handbrake's on
    if (game && game.onSkid && this.speed > 5 && (Math.abs(vr) > 3.2 || (inp.hand && Math.abs(vf) > 6))) {
      const [hx, hz] = this.forward(), lx = hz, lz = -hx, a = this.rearAxle;
      for (const sd of [-1, 1]) game.onSkid(this.x + hx * a.z + lx * a.x * sd, this.z + hz * a.z + lz * a.x * sd, this.heading, this);
    }
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
    // a tipped trike lies on its side, lifted so it rests on the edge rather than sinking into the road
    this.group.rotation.z = this.tipRoll || 0;
    if (this.tipRoll) this.group.position.y += Math.abs(Math.sin(this.tipRoll)) * this.T.wid * 0.45;
    this.body.rotation.x = this.pitch; this.body.rotation.z = this.roll + (this.dead ? 0.1 : 0);
  }
  remove() { this.scene.remove(this.group); disposeObject(this.group); }
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
      let blocker = null;
      const check = (ox, oz, rad, who) => {
        const rx = ox - car.x, rz = oz - car.z;
        const along = rx * fx + rz * fz, lat = Math.abs(rx * fz - rz * fx);
        if (along > 0 && along < 14 && lat < 1.6 + rad) { const w = Math.max(0, (along - 5) * 0.9); if (w < want) { want = w; blocker = who; } }
      };
      const pc = game ? game.player.car : null;
      for (const o of cars) if (o !== car && !o.dead) { if (Math.abs(o.x - car.x) < 16 && Math.abs(o.z - car.z) < 16) check(o.x, o.z, 0.8, o === pc ? 'wally' : null); }
      if (game) { for (const p of game.peds.list) if (!p.dead && Math.abs(p.x - car.x) < 15 && Math.abs(p.z - car.z) < 15) check(p.x, p.z, 0.2, null); if (!game.player.car && !game.player.dead) check(game.player.x, game.player.z, 0.3, 'wally'); }
      // Wally's in the way: lean on the horn and give him a piece of your mind
      this.hornCool = (this.hornCool || 0) - dt;
      if (blocker === 'wally' && car.speed < 2.5) this.annoyed = (this.annoyed || 0) + dt; else this.annoyed = Math.max(0, (this.annoyed || 0) - dt * 2);
      if (game && this.annoyed > 1.1 && this.hornCool <= 0) { this.hornCool = 3 + Math.random() * 3; game.onHonk(car, 'blocked'); }
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
      const want = pl.car && pl.car.speed > 5 ? Math.max(8, pl.car.speed + 6) : Math.max(0, (dist - 8) * 1.2); // ram a moving car, pull up beside a stopped one
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
  if (x < 0.88) return 'sports';
  if (x < 0.92) return 'wedge';
  if (x < 0.96) return 'trike';
  return 'icecream';
}

// Side and rear branding for a box van, e.g. the Pamazon delivery van
// write `text` at `size`px, shrinking until it fits in `maxW` pixels
function fitText(x, text, size, maxW, family = 'Impact, "Arial Black", sans-serif', weight = 'bold') {
  let s = size;
  do { x.font = `${weight} ${s}px ${family}`; s -= 2; } while (x.measureText(text).width > maxW && s > 10);
}
function liveryCanvas(w, h, name, tagline, colour, icon) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const pad = h * 0.08;
  let tx = pad;
  if (icon) {
    // a parcel
    const s = h * 0.5, py = h * 0.14;
    x.fillStyle = '#c8924a'; x.fillRect(pad, py, s, s); x.fillStyle = '#a5743a'; x.fillRect(pad, py, s, s * 0.22);
    x.fillStyle = '#e8d3a8'; x.fillRect(pad + s * 0.42, py, s * 0.16, s);
    tx = pad * 2 + s;
  }
  const maxW = w - tx - pad;
  x.textBaseline = 'middle'; x.textAlign = 'left';
  x.fillStyle = colour; fitText(x, name, Math.round(h * 0.4), maxW); x.fillText(name, tx, h * 0.36);
  x.fillStyle = '#e8641c'; fitText(x, tagline, Math.round(h * 0.15), maxW, 'Arial, sans-serif'); x.fillText(tagline, tx + 4, h * 0.72);
  x.fillStyle = colour; x.fillRect(0, h * 0.9, w, h * 0.1);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 });
}
export function addLivery(car, name, tagline, colour = '#1b3a8a') {
  const T = car.T;
  const h = T.hgt - 1.1, len = T.len - 1.75, yc = (T.hgt + 1.12) / 2, zc = -T.len / 2 + len / 2;
  const pw = len * 0.92, ph = h * 0.9;
  // the canvas has the same shape as the panel, so nothing is squashed or cut off
  const side = liveryCanvas(1024, Math.round(1024 * ph / pw), name, tagline, colour, true);
  for (const sx of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), side);
    p.position.set(sx * (T.wid / 2 + 0.012), yc, zc); p.rotation.y = sx * Math.PI / 2;
    car.body.add(p);
  }
  const bw = T.wid * 0.85, bh = h * 0.5;
  const backM = liveryCanvas(768, Math.round(768 * bh / bw), name, tagline, colour, false);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), backM);
  back.position.set(0, yc + 0.1, -T.len / 2 - 0.02); back.rotation.y = Math.PI; car.body.add(back);
}

export { TYPES, PAINTS, DIRS, validDir };
