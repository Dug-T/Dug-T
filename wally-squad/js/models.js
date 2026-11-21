// Procedural, detailed 3D models for every building and unit.
// Each model is assembled from many primitives, then merged per material so it renders cheaply.
import * as THREE from 'three';
import { mergeGeometries } from '../lib/utils/BufferGeometryUtils.js';
import { mats, M, fogify } from './materials.js';
import { CELL, UNITS } from './config.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();

class Builder {
  constructor() { this.parts = new Map(); }
  add(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    _e.set(rx, ry, rz); _q.setFromEuler(_e); _s.set(sx, sy, sz); _p.set(x, y, z);
    _m.compose(_p, _q, _s); g.applyMatrix4(_m);
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat).push(g);
    return this;
  }
  box(mat, w, h, d, x, y, z, rx, ry, rz) { return this.add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, rx, ry, rz); }
  cyl(mat, rt, rb, h, seg, x, y, z, rx, ry, rz) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg || 12), mat, x, y, z, rx, ry, rz); }
  sph(mat, r, x, y, z, sx = 1, sy = 1, sz = 1) { return this.add(new THREE.SphereGeometry(r, 14, 10), mat, x, y, z, 0, 0, 0, sx, sy, sz); }
  build(shadow = true) {
    const grp = new THREE.Group();
    for (const [mat, geos] of this.parts) {
      const merged = mergeGeometries(geos, false);
      const mesh = new THREE.Mesh(merged, mat);
      // Tiny parts and glowing lamps don't get their own shadow draw call: their shadows would be
      // a few pixels at most, and every shadow-casting mesh is drawn a second time each frame.
      if (!merged.boundingSphere) merged.computeBoundingSphere();
      const glow = mat.emissive && mat.emissiveIntensity > 0.5 && (mat.emissive.r + mat.emissive.g + mat.emissive.b) > 0.6;
      mesh.castShadow = shadow && !mat.transparent && !glow && merged.boundingSphere.radius > 0.3;
      mesh.userData.cs = mesh.castShadow;
      mesh.receiveShadow = true;
      grp.add(mesh);
    }
    return grp;
  }
}

// Cache geometry groups per (type, faction); clones share geometry.
const cache = new Map();
function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cloneTree(cache.get(key));
}
function cloneTree(obj) {
  const c = obj.clone(true); // meshes share geometry + material
  c.userData = { ...obj.userData };
  return c;
}

// ------------------------------------------------------------------ helpers
function wheel(b, mat, x, y, z, r, w) {
  b.add(new THREE.CylinderGeometry(r, r, w, 16), M().rubber, x, y, z, 0, 0, Math.PI / 2);
  b.add(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.04, 10), mat, x, y, z, 0, 0, Math.PI / 2);
  b.add(new THREE.CylinderGeometry(r * 0.18, r * 0.18, w + 0.1, 8), M().gun, x, y, z, 0, 0, Math.PI / 2);
}
function trackUnit(b, side, len, h, w, y, faction) {
  const m = M();
  const x = side * 1;
  b.box(m.tread, w, h, len, x, y, 0);
  b.add(new THREE.CylinderGeometry(h / 2, h / 2, w, 14), m.tread, x, y, len / 2, 0, 0, Math.PI / 2);
  b.add(new THREE.CylinderGeometry(h / 2, h / 2, w, 14), m.tread, x, y, -len / 2, 0, 0, Math.PI / 2);
  // road wheels showing on outer face
  const n = 5;
  for (let i = 0; i < n; i++) {
    const z = -len / 2 + 0.25 + (i / (n - 1)) * (len - 0.5);
    b.add(new THREE.CylinderGeometry(h * 0.36, h * 0.36, 0.08, 12), m.darkMetal, x + side * (w / 2 + 0.02), y - h * 0.05, z, 0, 0, Math.PI / 2);
    b.add(new THREE.CylinderGeometry(h * 0.12, h * 0.12, 0.1, 8), m.metal, x + side * (w / 2 + 0.05), y - h * 0.05, z, 0, 0, Math.PI / 2);
  }
  // side skirt
  b.box(mats(faction).teamDark, 0.06, h * 0.45, len * 0.92, x + side * (w / 2 + 0.07), y + h * 0.28, 0);
}

// ------------------------------------------------------------------ infantry
let _shamanGlow = null;
const shamanGlow = () => _shamanGlow || (_shamanGlow = new THREE.MeshStandardMaterial({ color: 0x6aff7a, emissive: 0x4aff60, emissiveIntensity: 2.4 }));
export function makeInfantry(type, faction) {
  return cached(`inf-${type}-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const S = type === 'wally' ? 1.15 : 1.0;
    // body (torso + head + gear)
    const b = new Builder();
    const uniform = type === 'engineer' ? m.hazard : type === 'medic' ? M().medic : type === 'shaman' ? t.teamDark : t.team;
    b.box(uniform, 0.46, 0.55, 0.28, 0, 1.0, 0);               // torso
    b.box(t.teamDark, 0.5, 0.18, 0.32, 0, 0.78, 0);           // belt / hips
    b.box(m.cloth, 0.36, 0.3, 0.12, 0, 1.05, -0.2);           // backpack
    b.box(m.darkMetal, 0.08, 0.12, 0.08, 0.12, 0.8, 0.17);    // pouch
    b.box(m.darkMetal, 0.08, 0.12, 0.08, -0.12, 0.8, 0.17);
    b.sph(m.skin, 0.15, 0, 1.43, 0.0);                        // head
    if (type === 'wally') {
      // red & white bobble hat, round glasses and stripy jumper - our hero!
      b.cyl(M().lampRed, 0.17, 0.17, 0.1, 14, 0, 1.53, 0);
      b.cyl(m.metal, 0.165, 0.165, 0.06, 14, 0, 1.6, 0);
      b.cyl(M().lampRed, 0.0, 0.16, 0.22, 14, 0, 1.72, 0);
      b.sph(m.metal, 0.07, 0, 1.86, 0);
      b.add(new THREE.TorusGeometry(0.05, 0.012, 6, 14), m.black, 0.065, 1.45, 0.14);
      b.add(new THREE.TorusGeometry(0.05, 0.012, 6, 14), m.black, -0.065, 1.45, 0.14);
      for (let i = 0; i < 4; i++) b.box(M().lampRed, 0.47, 0.06, 0.29, 0, 0.82 + i * 0.13, 0);
    } else if (type === 'spy') {
      // trench coat, fedora and dark glasses
      b.cyl(m.black, 0.27, 0.27, 0.03, 16, 0, 1.55, 0);
      b.cyl(m.black, 0.16, 0.18, 0.18, 14, 0, 1.64, 0);
      b.box(m.black, 0.26, 0.06, 0.04, 0, 1.45, 0.15);
      b.box(new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.85 }), 0.5, 0.62, 0.32, 0, 0.82, 0); // coat skirt
      b.box(new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.85 }), 0.5, 0.12, 0.33, 0, 1.24, 0.0);  // collar
    } else if (type === 'boomer') {
      // goblin: green head, big pointy ears, leather cap and goggles
      const gob = new THREE.MeshStandardMaterial({ color: 0x6f9a3a, roughness: 0.75 });
      b.sph(gob, 0.17, 0, 1.43, 0.0);
      b.add(new THREE.ConeGeometry(0.06, 0.26, 5), gob, 0.2, 1.48, 0, 0, 0, -1.3);
      b.add(new THREE.ConeGeometry(0.06, 0.26, 5), gob, -0.2, 1.48, 0, 0, 0, 1.3);
      b.add(new THREE.SphereGeometry(0.18, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.cloth, 0, 1.5, -0.01);
      b.box(m.glass, 0.24, 0.07, 0.05, 0, 1.47, 0.15);
      // the bomb on his back, with a sizzling fuse
      b.sph(m.black, 0.3, 0, 1.12, -0.36);
      b.box(m.hazard, 0.62, 0.08, 0.08, 0, 1.12, -0.18);
      b.cyl(m.cloth, 0.02, 0.02, 0.25, 5, 0, 1.5, -0.4, 0.4, 0, 0);
      b.sph(new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 2.5, 0.6) }), 0.05, 0, 1.63, -0.45);
    } else if (type === 'engineer') {
      b.add(new THREE.SphereGeometry(0.18, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.hazard, 0, 1.5, 0);
      b.cyl(m.hazard, 0.24, 0.24, 0.03, 16, 0, 1.5, 0);
      b.box(m.metal, 0.3, 0.2, 0.12, 0, 0.95, -0.24); // toolbox
    } else {
      b.add(new THREE.SphereGeometry(0.19, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), t.teamDark, 0, 1.47, 0); // helmet
      b.cyl(t.teamDark, 0.2, 0.21, 0.04, 14, 0, 1.47, 0);
      b.box(m.glass, 0.22, 0.06, 0.04, 0, 1.45, 0.15);       // goggles
    }
    if (type === 'medic') {
      b.box(m.lampRed, 0.06, 0.2, 0.02, 0, 1.08, 0.15); b.box(m.lampRed, 0.2, 0.06, 0.02, 0, 1.08, 0.15);
      b.box(M().medic, 0.3, 0.25, 0.14, 0, 1.0, -0.24); b.box(m.lampRed, 0.06, 0.16, 0.02, 0, 1.0, -0.32); b.box(m.lampRed, 0.16, 0.06, 0.02, 0, 1.0, -0.32);
    }
    if (type === 'shaman') {
      // hooded robe, bone necklace, skull staff with a glowing green orb
      b.add(new THREE.ConeGeometry(0.36, 0.7, 10, 1, true), t.teamDark, 0, 0.62, 0);
      b.add(new THREE.SphereGeometry(0.21, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), t.teamDark, 0, 1.47, -0.02);
      for (let i = 0; i < 5; i++) b.sph(m.concrete, 0.035, -0.12 + i * 0.06, 1.25 - Math.abs(i - 2) * 0.025, 0.15);
      b.cyl(m.wood || m.darkMetal, 0.025, 0.03, 1.7, 6, 0.3, 1.05, 0.25);
      b.sph(m.concrete, 0.09, 0.3, 1.95, 0.25, 1, 1.1, 1);
      b.sph(shamanGlow(), 0.07, 0.3, 2.1, 0.25);
    }
    if (type === 'piper') { // kilt, sporran, feather bonnet and a set of bagpipes
      const tartan = new THREE.MeshStandardMaterial({ color: 0x2a5a3a, roughness: 0.85 });
      b.box(tartan, 0.52, 0.32, 0.34, 0, 0.66, 0); b.box(m.lampRed, 0.53, 0.04, 0.35, 0, 0.7, 0); b.box(t.team, 0.53, 0.03, 0.35, 0, 0.6, 0); // kilt
      b.box(m.black, 0.16, 0.16, 0.06, 0, 0.66, 0.19);                                   // sporran
      b.cyl(m.black, 0.18, 0.2, 0.3, 12, 0, 1.68, 0);                                    // feather bonnet
      b.sph(tartan, 0.2, -0.22, 1.08, 0.12, 1, 0.8, 1.2);                                 // the bag
      for (const [dx, h] of [[-0.05, 0.75], [0.07, 0.6], [0.18, 0.5]]) b.cyl(m.black, 0.025, 0.03, h, 6, -0.3 + dx, 1.25 + h / 2, -0.05 - dx, -0.35, 0, 0.3); // drones
      b.cyl(m.black, 0.03, 0.035, 0.5, 6, -0.05, 0.95, 0.35, 0.6, 0, 0);                // chanter
    }
    if (type === 'drummer') { // a huge war drum slung on the front
      b.cyl(t.teamDark, 0.3, 0.3, 0.32, 14, 0, 0.98, 0.32, Math.PI / 2, 0, 0);
      b.cyl(m.concrete, 0.29, 0.29, 0.02, 14, 0, 0.98, 0.49, Math.PI / 2, 0, 0);
      for (const s2 of [-1, 1]) b.cyl(m.wood || m.darkMetal, 0.02, 0.03, 0.42, 5, s2 * 0.2, 1.2, 0.4, 0.9, 0, s2 * 0.3);
    }
    if (type === 'blink') { // glowing visor and a teleport ring on the backpack
      const glow = new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x40d8ff, emissiveIntensity: 2.6 });
      b.box(glow, 0.24, 0.07, 0.05, 0, 1.45, 0.16);
      b.add(new THREE.TorusGeometry(0.17, 0.035, 6, 16), glow, 0, 1.08, -0.3);
    }
    if (type === 'toxic') { // gas mask and two green toxin tanks
      const tox = new THREE.MeshStandardMaterial({ color: 0x7adc3a, emissive: 0x2a6a10, roughness: 0.5 });
      b.sph(m.darkMetal, 0.12, 0, 1.4, 0.14, 1, 0.8, 0.7);
      b.cyl(m.black, 0.05, 0.05, 0.1, 8, 0, 1.33, 0.22, Math.PI / 2, 0, 0);
      for (const s2 of [-1, 1]) b.cyl(tox, 0.09, 0.09, 0.48, 10, s2 * 0.1, 1.05, -0.28);
    }
    if (type === 'grenadier') { // bandolier of grenades
      b.box(m.cloth, 0.08, 0.62, 0.05, 0, 1.02, 0.15, 0, 0, 0.75);
      for (let i = 0; i < 4; i++) b.sph(m.gun, 0.05, -0.15 + i * 0.1, 0.88 + i * 0.11, 0.19);
    }
    if (type === 'flamer') { b.cyl(m.lampRed, 0.08, 0.08, 0.5, 10, 0.1, 1.05, -0.28); b.cyl(m.lampRed, 0.08, 0.08, 0.5, 10, -0.1, 1.05, -0.28); }
    // arms holding weapon
    b.box(uniform, 0.12, 0.42, 0.12, 0.29, 1.05, 0.1, -0.7, 0, 0.1);
    b.box(uniform, 0.12, 0.42, 0.12, -0.29, 1.05, 0.1, -0.9, 0, -0.1);
    b.sph(m.skin, 0.06, 0.24, 0.92, 0.32); b.sph(m.skin, 0.06, -0.2, 0.98, 0.35);
    // weapon
    if (type === 'rocket') {
      b.cyl(t.teamDark, 0.09, 0.09, 1.1, 12, 0.18, 1.3, 0.05, Math.PI / 2, 0, 0);
      b.cyl(m.darkMetal, 0.11, 0.09, 0.15, 12, 0.18, 1.3, 0.6, Math.PI / 2, 0, 0);
      b.box(m.gun, 0.05, 0.15, 0.08, 0.18, 1.18, 0.15);
    } else if (type === 'flamer') {
      b.cyl(m.gun, 0.05, 0.06, 0.7, 10, 0.05, 0.98, 0.45, Math.PI / 2, 0, 0);
      b.cyl(m.darkMetal, 0.07, 0.07, 0.1, 10, 0.05, 0.98, 0.8, Math.PI / 2, 0, 0);
    } else if (type === 'blink') {
      b.box(m.gun, 0.07, 0.12, 0.8, 0.05, 1.0, 0.5); b.box(new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x40d8ff, emissiveIntensity: 2.4 }), 0.05, 0.05, 0.3, 0.05, 1.08, 0.55); // laser rifle
    } else if (type === 'toxic') {
      b.cyl(m.gun, 0.08, 0.1, 0.6, 10, 0.05, 1.02, 0.5, Math.PI / 2, 0, 0); b.cyl(new THREE.MeshStandardMaterial({ color: 0x7adc3a, emissive: 0x2a6a10 }), 0.06, 0.06, 0.05, 10, 0.05, 1.02, 0.82, Math.PI / 2, 0, 0);
    } else if (type === 'piper' || type === 'drummer') {
      // hands busy with the music - no gun
    } else if (type === 'grenadier') {
      b.cyl(m.gun, 0.07, 0.07, 0.55, 10, 0.05, 1.02, 0.5, Math.PI / 2, 0, 0);
      b.cyl(m.darkMetal, 0.13, 0.13, 0.16, 10, 0.05, 0.98, 0.3, 0, 0, Math.PI / 2);
      b.box(m.gun, 0.05, 0.15, 0.08, 0.05, 0.88, 0.25);
    } else if (type === 'spy') {
      b.box(m.darkMetal, 0.32, 0.24, 0.08, 0.26, 0.82, 0.3); b.box(m.metal, 0.08, 0.04, 0.02, 0.26, 0.96, 0.3); // briefcase
    } else if (type === 'boomer') {
      b.box(m.lampRed, 0.07, 0.24, 0.07, 0.24, 1.0, 0.36); // a stick of dynamite in each hand
      b.box(m.lampRed, 0.07, 0.24, 0.07, -0.2, 1.05, 0.38);
    } else if (type === 'engineer') {
      b.box(m.metal, 0.06, 0.06, 0.4, 0.05, 0.98, 0.42);
    } else if (type === 'shaman') {
      b.sph(shamanGlow(), 0.05, -0.2, 1.0, 0.36);
    } else if (type === 'medic') {
      b.box(M().medic, 0.18, 0.14, 0.1, 0.1, 0.95, 0.4); b.box(m.lampRed, 0.1, 0.03, 0.02, 0.1, 0.95, 0.46);
    } else {
      const L = type === 'wally' ? 1.0 : 0.7;
      b.box(m.gun, 0.07, 0.12, L, 0.05, 1.0, 0.3 + L / 2 - 0.2);
      b.box(m.gun, 0.05, 0.16, 0.08, 0.05, 0.9, 0.3);
      if (type === 'wally') { b.cyl(m.gun, 0.05, 0.05, 0.3, 8, 0.05, 1.12, 0.4, Math.PI / 2, 0, 0); }
    }
    const body = b.build(); body.name = 'body';
    // legs (animated)
    const legs = [];
    for (const side of [-1, 1]) {
      const lb = new Builder();
      lb.box(t.teamDark, 0.16, 0.5, 0.18, 0, -0.25, 0);
      lb.box(m.black, 0.18, 0.12, 0.26, 0, -0.52, 0.04);
      const leg = lb.build(); leg.position.set(side * 0.12, 0.72, 0); leg.name = 'leg';
      legs.push(leg); root.add(leg);
    }
    root.add(body);
    root.scale.setScalar(S);
    root.userData.muzzle = new THREE.Vector3(0.05, 1.05, 1.0);
    return root;
  });
}

// ------------------------------------------------------------------ vehicles
export function makeTank(faction) {
  return cached(`tank-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const hull = new Builder();
    trackUnit(hull, -1, 3.4, 0.7, 0.62, 0.38, faction);
    trackUnit(hull, 1, 3.4, 0.7, 0.62, 0.38, faction);
    hull.box(t.team, 1.5, 0.45, 3.2, 0, 0.8, 0);
    hull.add(new THREE.BoxGeometry(1.5, 0.45, 0.7), t.team, 0, 0.72, 1.75, -0.6, 0, 0); // sloped glacis
    hull.add(new THREE.BoxGeometry(1.5, 0.35, 0.5), t.teamDark, 0, 0.75, -1.72, 0.5, 0, 0);
    hull.box(t.team, 2.15, 0.08, 3.3, 0, 1.06, 0);              // track guards
    hull.box(m.darkMetal, 0.8, 0.12, 0.8, 0, 1.08, -1.1);       // engine grille
    for (let i = 0; i < 5; i++) hull.box(m.black, 0.7, 0.03, 0.05, 0, 1.15, -1.4 + i * 0.15);
    hull.cyl(m.darkMetal, 0.08, 0.08, 0.35, 8, 0.75, 1.1, -1.55); // exhaust
    hull.cyl(m.darkMetal, 0.08, 0.08, 0.35, 8, -0.75, 1.1, -1.55);
    hull.box(m.lampWhite, 0.18, 0.1, 0.05, 0.55, 0.92, 1.68); hull.box(m.lampWhite, 0.18, 0.1, 0.05, -0.55, 0.92, 1.68);
    hull.box(m.metal, 0.15, 0.15, 0.6, 0.85, 1.15, 0.6); // toolbox
    hull.box(m.wood, 0.12, 0.08, 1.0, -0.88, 1.12, 0.2);  // log
    root.add(hull.build());
    const turret = new Builder();
    turret.add(new THREE.CylinderGeometry(0.75, 0.95, 0.5, 8), t.team, 0, 0, 0, 0, Math.PI / 8, 0);
    turret.box(t.team, 1.3, 0.42, 1.1, 0, 0.0, -0.45);
    turret.box(t.teamDark, 1.2, 0.08, 1.5, 0, 0.27, -0.2);
    turret.cyl(m.darkMetal, 0.25, 0.25, 0.18, 14, 0.35, 0.36, -0.2); // hatch
    turret.cyl(m.gun, 0.03, 0.03, 0.6, 6, -0.4, 0.55, -0.4);           // antenna
    turret.box(m.gun, 0.08, 0.08, 0.5, -0.4, 0.38, 0.15);                // coax mg
    turret.box(t.accent, 0.3, 0.2, 0.02, 0.66, 0.0, 0.1, 0, Math.PI / 2, 0); // faction plate
    turret.box(m.darkMetal, 0.35, 0.35, 0.4, 0, 0, 0.75);               // mantlet
    turret.cyl(m.gun, 0.11, 0.13, 2.4, 12, 0, 0.02, 1.95, Math.PI / 2, 0, 0);
    turret.cyl(m.gun, 0.17, 0.17, 0.4, 12, 0, 0.02, 2.0, Math.PI / 2, 0, 0); // fume extractor
    turret.cyl(m.gun, 0.15, 0.15, 0.25, 12, 0, 0.02, 3.1, Math.PI / 2, 0, 0); // muzzle brake
    const tur = turret.build(); tur.position.set(0, 1.35, -0.1); tur.name = 'turret';
    root.add(tur);
    root.userData.muzzle = new THREE.Vector3(0, 0.02, 3.3);
    return root;
  });
}

export function makeTitan(faction) {
  return cached(`titan-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const hull = new Builder();
    for (const s of [-1, 1]) {
      // double tracks each side
      for (const off of [0.55, 1.25]) {
        hull.box(m.tread, 0.62, 0.85, 4.1, s * off, 0.45, 0);
        hull.add(new THREE.CylinderGeometry(0.42, 0.42, 0.62, 14), m.tread, s * off, 0.45, 2.05, 0, 0, Math.PI / 2);
        hull.add(new THREE.CylinderGeometry(0.42, 0.42, 0.62, 14), m.tread, s * off, 0.45, -2.05, 0, 0, Math.PI / 2);
      }
      hull.box(t.teamDark, 0.12, 0.55, 4.0, s * 1.6, 0.65, 0);
      for (let i = 0; i < 6; i++) hull.box(m.darkMetal, 0.04, 0.4, 0.35, s * 1.67, 0.6, -1.7 + i * 0.68);
    }
    hull.box(t.team, 2.3, 0.6, 3.8, 0, 1.05, 0);
    hull.add(new THREE.BoxGeometry(2.3, 0.55, 0.9), t.team, 0, 0.95, 2.2, -0.55, 0, 0);
    hull.box(t.team, 3.4, 0.1, 4.0, 0, 1.38, 0);
    hull.box(m.darkMetal, 1.4, 0.15, 1.0, 0, 1.45, -1.4);
    for (let i = 0; i < 6; i++) hull.box(m.black, 1.3, 0.04, 0.05, 0, 1.53, -1.8 + i * 0.16);
    hull.box(m.lampWhite, 0.2, 0.12, 0.05, 0.85, 1.15, 2.6); hull.box(m.lampWhite, 0.2, 0.12, 0.05, -0.85, 1.15, 2.6);
    hull.cyl(m.darkMetal, 0.12, 0.12, 0.6, 8, 1.0, 1.6, -1.8); hull.cyl(m.darkMetal, 0.12, 0.12, 0.6, 8, -1.0, 1.6, -1.8);
    root.add(hull.build());
    const tb = new Builder();
    tb.add(new THREE.CylinderGeometry(1.1, 1.3, 0.7, 8), t.team, 0, 0, 0, 0, Math.PI / 8, 0);
    tb.box(t.team, 2.0, 0.6, 1.6, 0, 0, -0.6);
    tb.box(t.teamDark, 1.8, 0.1, 2.1, 0, 0.36, -0.3);
    tb.box(m.darkMetal, 1.0, 0.5, 0.5, 0, 0, 1.0);
    for (const s of [-0.28, 0.28]) {
      tb.cyl(m.gun, 0.13, 0.15, 2.9, 12, s, 0.05, 2.4, Math.PI / 2, 0, 0);
      tb.cyl(m.gun, 0.19, 0.19, 0.3, 12, s, 0.05, 3.75, Math.PI / 2, 0, 0);
    }
    // missile pods
    for (const s of [-1, 1]) {
      tb.box(t.teamDark, 0.45, 0.5, 1.0, s * 1.2, 0.25, -0.3);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) tb.cyl(m.lampRed, 0.07, 0.07, 0.05, 8, s * 1.2 + (c - 0.5) * 0.2, 0.15 + r * 0.22, 0.21, Math.PI / 2, 0, 0);
    }
    tb.cyl(m.gun, 0.03, 0.03, 0.9, 6, -0.7, 0.8, -1.0);
    tb.cyl(m.darkMetal, 0.28, 0.28, 0.2, 14, 0.4, 0.45, -0.5);
    const tur = tb.build(); tur.position.set(0, 1.8, -0.2); tur.name = 'turret';
    root.add(tur);
    root.userData.muzzle = new THREE.Vector3(0.28, 0.05, 3.9);
    root.userData.muzzle2 = new THREE.Vector3(-0.28, 0.05, 3.9);
    return root;
  });
}

export function makeBuggy(faction) {
  return cached(`buggy-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const b = new Builder();
    b.box(m.darkMetal, 1.0, 0.18, 2.6, 0, 0.55, 0);   // chassis
    b.box(t.team, 1.3, 0.35, 1.1, 0, 0.8, 0.7);         // hood
    b.add(new THREE.BoxGeometry(1.3, 0.25, 0.5), t.team, 0, 0.75, 1.35, -0.4, 0, 0);
    b.box(t.team, 1.3, 0.3, 0.9, 0, 0.78, -0.85);       // rear bed
    b.box(m.black, 1.1, 0.25, 0.7, 0, 0.75, -0.1);      // seats area
    // roll cage
    for (const s of [-1, 1]) {
      b.cyl(m.gun, 0.04, 0.04, 0.9, 6, s * 0.55, 1.25, 0.15, 0.25, 0, 0);
      b.cyl(m.gun, 0.04, 0.04, 0.9, 6, s * 0.55, 1.25, -0.5, -0.25, 0, 0);
    }
    b.cyl(m.gun, 0.04, 0.04, 1.15, 6, 0, 1.66, 0.05, 0, 0, Math.PI / 2);
    b.cyl(m.gun, 0.04, 0.04, 1.15, 6, 0, 1.66, -0.4, 0, 0, Math.PI / 2);
    b.box(m.glass, 1.0, 0.35, 0.04, 0, 1.12, 0.4, -0.3, 0, 0); // windscreen
    b.box(m.lampWhite, 0.15, 0.1, 0.05, 0.45, 0.85, 1.6); b.box(m.lampWhite, 0.15, 0.1, 0.05, -0.45, 0.85, 1.6);
    b.box(m.lampWhite, 0.8, 0.08, 0.06, 0, 1.75, 0.08); // light bar
    b.box(m.metal, 1.4, 0.12, 0.12, 0, 0.6, 1.65);       // bull bar
    b.cyl(m.rubber, 0.36, 0.36, 0.25, 14, 0, 1.0, -1.35, Math.PI / 2, 0, 0); // spare tire
    b.sph(m.skin, 0.13, 0.25, 1.22, -0.05); b.sph(t.teamDark, 0.15, 0.25, 1.28, -0.05, 1, 0.6, 1);
    for (const [x, z] of [[0.75, 0.95], [-0.75, 0.95], [0.75, -0.9], [-0.75, -0.9]]) wheel(b, m.metal, x, 0.45, z, 0.45, 0.32);
    root.add(b.build());
    const g = new Builder();
    g.cyl(m.darkMetal, 0.12, 0.15, 0.3, 10, 0, 0, 0);
    g.box(m.gun, 0.2, 0.2, 0.55, 0, 0.18, 0.15);
    g.cyl(m.gun, 0.05, 0.05, 0.8, 8, 0, 0.2, 0.75, Math.PI / 2, 0, 0);
    g.box(m.darkMetal, 0.5, 0.35, 0.04, 0, 0.3, 0.02); // gun shield
    const tur = g.build(); tur.position.set(0, 1.25, -0.75); tur.name = 'turret';
    root.add(tur);
    root.userData.muzzle = new THREE.Vector3(0, 0.2, 1.15);
    return root;
  });
}

export function makeHarvester(faction) {
  return cached(`harv-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const b = new Builder();
    trackUnit(b, -1, 3.8, 0.8, 0.7, 0.42, faction);
    trackUnit(b, 1, 3.8, 0.8, 0.7, 0.42, faction);
    b.box(m.darkMetal, 1.6, 0.4, 3.6, 0, 0.85, 0);
    b.box(t.team, 2.3, 1.1, 2.2, 0, 1.55, -0.6);          // hopper
    b.box(t.teamDark, 2.1, 0.1, 2.0, 0, 2.12, -0.6);
    b.box(m.hazard, 2.32, 0.2, 2.22, 0, 1.0, -0.6);
    for (let i = 0; i < 4; i++) b.box(m.darkMetal, 0.08, 1.0, 0.08, 1.16, 1.55, -1.6 + i * 0.66);
    b.box(t.team, 1.3, 1.0, 1.0, -0.4, 1.6, 1.2);        // cab
    b.box(m.glass, 1.0, 0.45, 0.04, -0.4, 1.85, 1.71);
    b.box(m.glass, 0.04, 0.4, 0.7, -1.06, 1.85, 1.2);
    b.box(m.lampWhite, 0.18, 0.12, 0.05, -0.75, 1.3, 1.71); b.box(m.lampWhite, 0.18, 0.12, 0.05, -0.05, 1.3, 1.71);
    b.cyl(m.lampRed, 0.08, 0.08, 0.12, 10, -0.4, 2.15, 1.2); // beacon
    b.cyl(m.darkMetal, 0.12, 0.12, 0.9, 8, 0.7, 2.0, 1.1);   // exhaust stack
    // front harvesting drum
    b.box(m.darkMetal, 2.2, 0.25, 0.5, 0, 0.55, 2.1);
    b.add(new THREE.CylinderGeometry(0.35, 0.35, 2.0, 14), m.metal, 0, 0.45, 2.35, 0, 0, Math.PI / 2);
    for (let i = 0; i < 8; i++) b.box(m.hazard, 0.08, 0.1, 0.8, -0.9 + i * 0.26, 0.45, 2.35, i * 0.8, 0, 0);
    root.add(b.build());
    // crystal load (visible when carrying)
    const load = new Builder();
    for (let i = 0; i < 9; i++) load.add(new THREE.ConeGeometry(0.22, 0.7, 6), M().crystal, -0.7 + (i % 3) * 0.7, 2.1 + (i % 2) * 0.1, -1.2 + Math.floor(i / 3) * 0.6, (i * 0.7) % 0.5, i, 0.2);
    const lg = load.build(false); lg.name = 'load'; lg.visible = false;
    root.add(lg);
    return root;
  });
}

export function makeArtillery(faction) {
  return cached(`arty-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const b = new Builder();
    trackUnit(b, -1, 3.0, 0.6, 0.55, 0.35, faction);
    trackUnit(b, 1, 3.0, 0.6, 0.55, 0.35, faction);
    b.box(t.team, 1.5, 0.45, 3.0, 0, 0.75, 0);
    b.box(t.teamDark, 2.0, 0.08, 3.1, 0, 1.0, 0);
    b.box(t.team, 1.3, 0.6, 0.9, 0, 1.3, 1.0);   // cab
    b.box(m.glass, 1.1, 0.25, 0.04, 0, 1.45, 1.46);
    b.box(m.darkMetal, 0.3, 0.6, 0.3, 0.75, 0.6, -1.5); b.box(m.darkMetal, 0.3, 0.6, 0.3, -0.75, 0.6, -1.5); // stabilisers
    b.box(m.hazard, 1.6, 0.1, 0.1, 0, 0.95, -1.55);
    root.add(b.build());
    const g = new Builder();
    g.box(t.team, 1.2, 0.6, 1.3, 0, 0, 0);
    g.box(m.darkMetal, 0.55, 0.5, 0.6, 0, 0.1, 0.6);
    g.cyl(m.gun, 0.14, 0.18, 3.4, 12, 0, 0.15, 2.4, Math.PI / 2, 0, 0);
    g.cyl(m.gun, 0.22, 0.22, 0.45, 12, 0, 0.15, 4.0, Math.PI / 2, 0, 0);
    g.box(m.darkMetal, 0.15, 0.15, 1.2, 0.3, -0.05, 1.2); // recoil cylinders
    g.box(m.darkMetal, 0.15, 0.15, 1.2, -0.3, -0.05, 1.2);
    const tur = g.build(); tur.position.set(0, 1.3, -0.6); tur.name = 'turret';
    const pitch = new THREE.Group(); pitch.name = 'turretRoot'; pitch.position.copy(tur.position); tur.position.set(0, 0, 0);
    tur.rotation.x = -0.45; pitch.add(tur); pitch.userData.barrel = tur;
    pitch.name = 'turret';
    tur.name = 'barrel';
    root.add(pitch);
    root.userData.muzzle = new THREE.Vector3(0, 0.15, 4.2);
    return root;
  });
}

export function makeHovercraft(faction) {
  return cached(`hover-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const b = new Builder();
    b.add(new THREE.CylinderGeometry(1.05, 1.15, 0.45, 18), m.black, 0, 0.35, 0, 0, 0, 0, 1, 1, 1.55);   // rubber skirt
    b.add(new THREE.CylinderGeometry(0.95, 1.0, 0.3, 18), t.team, 0, 0.7, 0, 0, 0, 0, 1, 1, 1.5);         // hull
    b.box(t.teamDark, 1.1, 0.4, 1.2, 0, 1.0, 0.25);                                                        // cockpit block
    b.box(m.glass, 0.9, 0.25, 0.05, 0, 1.08, 0.86, -0.4, 0, 0);
    b.box(t.accent, 0.4, 0.05, 1.0, 0, 0.87, -0.9);
    for (const s of [-1, 1]) {
      b.add(new THREE.TorusGeometry(0.42, 0.06, 6, 18), m.darkMetal, s * 0.5, 1.15, -1.25, 0, 0, 0);       // fan ducts
      b.box(m.darkMetal, 0.06, 0.6, 0.06, s * 0.5, 1.15, -1.25);
      b.box(m.gun, 0.16, 0.16, 0.7, s * 0.7, 0.95, 0.5);                                                    // rocket pods
      b.box(m.lampWhite, 0.12, 0.06, 0.04, s * 0.45, 0.75, 1.5);
    }
    b.box(t.teamDark, 0.06, 0.55, 0.4, 0, 1.35, -1.25);                                                    // rudder
    root.add(b.build());
    // fan blades spin (named 'tailrotor' so the unit animator turns them)
    const fb = new Builder();
    for (let i = 0; i < 4; i++) fb.box(m.metal, 0.07, 0.75, 0.04, 0, 0, 0, 0, 0, i * Math.PI / 4);
    const fans = new THREE.Group(); fans.name = 'fans';
    for (const s of [-1, 1]) { const f = fb.build(); f.position.set(s * 0.5, 1.15, -1.25); fans.add(f); }
    root.add(fans);
    root.userData.muzzle = new THREE.Vector3(0.7, 0.95, 0.9);
    root.userData.muzzle2 = new THREE.Vector3(-0.7, 0.95, 0.9);
    return root;
  });
}

export function makeRepairTruck(faction) {
  return cached(`repair-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const b = new Builder();
    for (const z of [1.0, -0.2, -1.0]) for (const x of [-0.8, 0.8]) wheel(b, m.metal, x, 0.42, z, 0.4, 0.3);
    b.box(t.team, 1.5, 0.95, 1.0, 0, 1.05, 1.15);                     // cab
    b.box(m.glass, 1.3, 0.4, 0.04, 0, 1.3, 1.66);                     // windscreen
    b.box(m.darkMetal, 1.55, 0.3, 3.0, 0, 0.62, -0.2);                // chassis
    b.box(t.teamDark, 1.55, 0.55, 1.9, 0, 1.0, -0.7);                 // tool bed
    b.box(m.hazard, 1.6, 0.08, 1.95, 0, 1.3, -0.7);
    for (const s of [-1, 1]) b.box(m.metal, 0.05, 0.4, 1.7, s * 0.79, 1.05, -0.7);  // tool lockers
    b.box(m.lampWhite, 0.18, 0.1, 0.04, 0.5, 0.95, 1.66); b.box(m.lampWhite, 0.18, 0.1, 0.04, -0.5, 0.95, 1.66);
    b.box(m.lampRed, 0.3, 0.1, 0.12, -0.35, 1.58, 1.15); b.box(m.lampWhite, 0.3, 0.1, 0.12, 0.35, 1.58, 1.15); // beacon bar
    b.box(t.accent, 0.5, 0.5, 0.02, 0.77, 1.05, 1.15, 0, Math.PI / 2, 0);
    root.add(b.build());
    // crane arm with a wrench hook (turret so it swings toward what it repairs)
    const c = new Builder();
    c.cyl(m.darkMetal, 0.22, 0.26, 0.3, 10, 0, 0, 0);
    c.box(m.hazard, 0.18, 0.18, 1.6, 0, 0.35, 0.6, -0.45, 0, 0);
    c.cyl(m.gun, 0.03, 0.03, 0.7, 4, 0, 0.55, 1.35);
    c.box(m.metal, 0.3, 0.12, 0.12, 0, 0.2, 1.35);
    const crane = c.build(); crane.position.set(0, 1.45, -1.2); crane.name = 'turret';
    root.add(crane);
    return root;
  });
}

// Wyvern Rider: a scaly winged beast with a goblin on its back. Wings flap (wingL / wingR).
export function makeWyvern(faction, skin = 0x3f5a2a) {
  return cached(`wyvern-${faction}-${skin}`, () => {
    const t = mats(faction), m = M();
    const scale = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7, metalness: 0.1, flatShading: true });
    const belly = new THREE.MeshStandardMaterial({ color: 0xa08a5a, roughness: 0.8, flatShading: true });
    const root = new THREE.Group();
    const b = new Builder();
    b.sph(scale, 0.75, 0, 0, 0, 0.9, 0.8, 1.6);                         // body
    b.sph(belly, 0.6, 0, -0.25, 0.1, 0.8, 0.55, 1.35);
    b.cyl(scale, 0.22, 0.38, 1.4, 8, 0, 0.35, 1.45, -0.9, 0, 0);       // neck
    b.box(scale, 0.42, 0.36, 0.75, 0, 0.75, 2.2);                      // head
    b.box(belly, 0.36, 0.12, 0.6, 0, 0.55, 2.3);                       // jaw
    b.add(new THREE.ConeGeometry(0.07, 0.4, 5), m.concrete, 0.14, 1.0, 2.0, -0.6, 0, 0); b.add(new THREE.ConeGeometry(0.07, 0.4, 5), m.concrete, -0.14, 1.0, 2.0, -0.6, 0, 0); // horns
    b.box(m.lampRed, 0.08, 0.06, 0.04, 0.16, 0.82, 2.45); b.box(m.lampRed, 0.08, 0.06, 0.04, -0.16, 0.82, 2.45); // glowing eyes
    b.cyl(scale, 0.3, 0.05, 2.6, 7, 0, -0.05, -2.0, Math.PI / 2 + 0.15, 0, 0); // tail
    b.add(new THREE.ConeGeometry(0.25, 0.5, 4).rotateX(-Math.PI / 2), t.team, 0, -0.25, -3.35);
    for (let i = 0; i < 5; i++) b.add(new THREE.ConeGeometry(0.08, 0.3, 4), t.teamDark, 0, 0.62 - i * 0.04, 0.7 - i * 0.45); // back spines
    for (const s of [-1, 1]) { b.box(scale, 0.16, 0.55, 0.2, s * 0.4, -0.65, 0.5); b.box(scale, 0.16, 0.5, 0.2, s * 0.4, -0.65, -0.6); } // legs tucked
    // goblin rider in a team-coloured saddle
    b.box(t.team, 0.6, 0.2, 0.7, 0, 0.62, 0.1);
    b.box(t.teamDark, 0.34, 0.42, 0.24, 0, 0.95, 0.05);
    b.sph(new THREE.MeshStandardMaterial({ color: 0x6f9a3a, roughness: 0.75 }), 0.16, 0, 1.3, 0.05);
    b.box(m.glass, 0.24, 0.06, 0.05, 0, 1.33, 0.2);
    const body = b.build(); root.add(body);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x5a2a22, roughness: 0.8, side: THREE.DoubleSide, flatShading: true });
    for (const s of [-1, 1]) {
      const wb = new Builder();
      wb.box(scale, 1.6, 0.1, 0.12, s * 0.8, 0, 0.3);                  // wing bone
      wb.box(scale, 1.3, 0.08, 0.1, s * 2.2, 0, -0.2, 0, s * 0.5, 0);
      const mem = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0.3, s * 1.6, 0, 0.35, s * 2.9, 0, -0.65, s * 1.6, 0, 0.35, s * 1.8, 0, -1.3, s * 2.9, 0, -0.65, 0, 0, 0.3, s * 1.8, 0, -1.3, 0, 0, -0.9]), 3)); // wing membrane
      mem.computeVertexNormals();
      wb.add(mem, wingMat, 0, 0, 0);
      const wing = wb.build(false); wing.position.set(s * 0.45, 0.35, 0.1); wing.name = s < 0 ? 'wingL' : 'wingR';
      root.add(wing);
    }
    root.userData.muzzle = new THREE.Vector3(0, 0.6, 2.65);
    return root;
  });
}

// Tesla Truck: a six-wheeled truck with a coil and electric orb on a swivelling mount
export function makeTeslaTruck(faction) {
  return cached(`teslatruck-${faction}`, () => {
    const t = mats(faction), m = M();
    const copper = new THREE.MeshStandardMaterial({ color: 0xb8673a, roughness: 0.35, metalness: 0.85 });
    const root = new THREE.Group();
    const b = new Builder();
    for (const z of [1.0, -0.2, -1.0]) for (const x of [-0.8, 0.8]) wheel(b, m.metal, x, 0.42, z, 0.4, 0.3);
    b.box(t.team, 1.5, 0.95, 1.0, 0, 1.05, 1.15);                     // cab
    b.box(m.glass, 1.3, 0.4, 0.04, 0, 1.3, 1.66);
    b.box(m.darkMetal, 1.55, 0.3, 3.0, 0, 0.62, -0.2);                // chassis
    b.box(t.teamDark, 1.6, 0.4, 1.9, 0, 0.95, -0.7);                  // flatbed
    b.box(m.hazard, 1.62, 0.08, 1.92, 0, 1.17, -0.7);
    for (const s of [-1, 1]) b.cyl(m.darkMetal, 0.16, 0.16, 1.6, 8, s * 0.55, 1.35, -0.7, Math.PI / 2, 0, 0); // capacitor drums
    b.box(m.lampWhite, 0.18, 0.1, 0.04, 0.5, 0.95, 1.66); b.box(m.lampWhite, 0.18, 0.1, 0.04, -0.5, 0.95, 1.66);
    b.box(t.accent, 0.5, 0.5, 0.02, 0.77, 1.05, 1.15, 0, Math.PI / 2, 0);
    root.add(b.build());
    const c = new Builder();
    c.cyl(m.darkMetal, 0.35, 0.4, 0.25, 10, 0, 0, 0);
    c.cyl(m.darkMetal, 0.12, 0.16, 1.4, 8, 0, 0.8, 0);
    for (let i = 0; i < 5; i++) c.add(new THREE.TorusGeometry(0.28, 0.06, 6, 14), copper, 0, 0.35 + i * 0.22, 0, Math.PI / 2, 0, 0);
    c.add(new THREE.TorusGeometry(0.36, 0.06, 6, 16), copper, 0, 1.5, 0, Math.PI / 2, 0, 0);
    c.add(new THREE.SphereGeometry(0.26, 12, 8), new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x58c8ff, emissiveIntensity: 2.6, roughness: 0.3 }), 0, 1.75, 0);
    const coil = c.build(false); coil.position.set(0, 1.2, -0.75); coil.name = 'turret';
    root.add(coil);
    root.userData.muzzle = new THREE.Vector3(0, 1.75, 0);
    return root;
  });
}

// Bounty Convoy: a gold-trimmed armoured cash truck with flashing beacons and money crates
export function makeConvoy() {
  return cached('convoy', () => {
    const m = M();
    const armour = new THREE.MeshStandardMaterial({ color: 0x4a5048, roughness: 0.55, metalness: 0.6 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xffc23a, roughness: 0.3, metalness: 0.9, emissive: 0x3a2400 });
    const cash = new THREE.MeshStandardMaterial({ color: 0x3f8a3a, roughness: 0.7 });
    const root = new THREE.Group();
    const b = new Builder();
    for (const z of [1.2, 0.0, -1.1]) for (const x of [-0.9, 0.9]) wheel(b, m.metal, x, 0.45, z, 0.45, 0.32);
    b.box(armour, 1.75, 1.0, 1.1, 0, 1.1, 1.35);                     // cab
    b.box(m.glass, 1.4, 0.32, 0.04, 0, 1.38, 1.91);
    b.box(m.darkMetal, 1.8, 0.3, 3.4, 0, 0.62, 0);                   // chassis
    b.box(armour, 1.85, 1.5, 2.3, 0, 1.4, -0.55);                    // strongbox
    b.box(gold, 1.87, 0.12, 2.32, 0, 2.1, -0.55); b.box(gold, 1.87, 0.12, 2.32, 0, 0.75, -0.55);
    b.box(gold, 0.6, 0.6, 0.04, 0.93, 1.4, -0.55, 0, Math.PI / 2, 0); b.box(gold, 0.6, 0.6, 0.04, -0.93, 1.4, -0.55, 0, Math.PI / 2, 0); // $ plates
    b.cyl(m.darkMetal, 0.25, 0.25, 0.08, 12, 0, 1.4, -1.72, Math.PI / 2, 0, 0);    // vault wheel
    for (const [x, z] of [[-0.45, -0.2], [0.45, -0.2], [0, -0.95]]) b.box(cash, 0.5, 0.35, 0.5, x, 2.33, z); // cash bundles on the roof
    b.box(m.lampRed, 0.3, 0.12, 0.14, -0.45, 1.67, 1.3); b.box(m.lampWhite, 0.3, 0.12, 0.14, 0.45, 1.67, 1.3);
    b.box(m.lampWhite, 0.2, 0.1, 0.04, 0.6, 1.0, 1.91); b.box(m.lampWhite, 0.2, 0.1, 0.04, -0.6, 1.0, 1.91);
    root.add(b.build());
    root.userData.muzzle = new THREE.Vector3(0, 1.5, 1.9);
    return root;
  });
}

// Wally Mech: a two-legged battle walker. Legs (wLegL / wLegR) stride; the torso is the turret.
export function makeMech(faction) {
  return cached(`mech-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const b = new Builder();
    b.box(m.darkMetal, 1.5, 0.45, 0.8, 0, 2.15, 0);                    // hips
    b.cyl(m.metal, 0.25, 0.25, 1.8, 10, 0, 2.15, 0, 0, 0, Math.PI / 2); // hip axle
    root.add(b.build());
    for (const s of [-1, 1]) {
      const lb = new Builder();
      lb.box(t.teamDark, 0.42, 1.05, 0.5, 0, -0.5, 0);                  // thigh
      lb.sph(m.metal, 0.24, 0, -1.05, 0.05);                            // knee
      lb.box(m.darkMetal, 0.36, 0.95, 0.42, 0, -1.5, 0.12, -0.15, 0, 0); // shin
      lb.box(m.metal, 0.62, 0.16, 1.0, 0, -2.02, 0.2);                  // foot
      lb.box(t.accent, 0.44, 0.08, 0.3, 0, -0.3, 0.26);
      const leg = lb.build(); leg.position.set(s * 0.82, 2.15, 0); leg.name = s < 0 ? 'wLegL' : 'wLegR';
      root.add(leg);
    }
    const tb = new Builder();
    tb.box(t.team, 1.7, 1.1, 1.5, 0, 0.55, 0);                         // torso
    tb.box(t.teamDark, 1.75, 0.15, 1.55, 0, 1.12, 0);
    tb.box(m.glass, 1.0, 0.35, 0.05, 0, 0.75, 0.76);                   // cockpit window
    tb.box(t.accent, 0.4, 0.4, 0.04, 0.6, 0.45, 0.76);
    for (const s of [-1, 1]) {
      tb.box(t.teamDark, 0.45, 0.6, 0.9, s * 1.08, 0.7, 0.1);          // shoulder
      tb.cyl(m.gun, 0.11, 0.13, 1.6, 10, s * 1.08, 0.62, 1.0, Math.PI / 2, 0, 0); // cannon
      tb.cyl(m.gun, 0.16, 0.16, 0.25, 10, s * 1.08, 0.62, 1.78, Math.PI / 2, 0, 0);
    }
    tb.box(m.darkMetal, 0.7, 0.35, 0.6, 0, 1.35, -0.3);                // missile pod
    for (let i = 0; i < 3; i++) tb.cyl(m.lampRed, 0.07, 0.07, 0.05, 8, -0.2 + i * 0.2, 1.38, 0.0, Math.PI / 2, 0, 0);
    tb.cyl(m.gun, 0.03, 0.03, 0.8, 5, -0.6, 1.5, -0.5);                // antenna
    const tur = tb.build(); tur.position.set(0, 2.4, 0); tur.name = 'turret';
    root.add(tur);
    root.userData.muzzle = new THREE.Vector3(1.08, 0.62, 1.95);
    root.userData.muzzle2 = new THREE.Vector3(-1.08, 0.62, 1.95);
    return root;
  });
}

// Cave Troll: a hulking grey-green brute with a tree-trunk club (swings on attack)
export function makeTroll(faction) {
  return cached(`troll-${faction}`, () => {
    const t = mats(faction), m = M();
    const hide = new THREE.MeshStandardMaterial({ color: 0x6a7a5a, roughness: 0.95, flatShading: true });
    const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.9, flatShading: true });
    const root = new THREE.Group();
    const b = new Builder();
    b.sph(hide, 0.85, 0, 2.3, -0.05, 1.05, 0.95, 0.85);               // hunched body
    b.sph(hide, 0.65, 0, 1.65, 0.05, 1.0, 0.8, 0.9);                  // belly
    b.box(t.team, 1.2, 0.35, 1.0, 0, 1.35, 0);                         // loincloth / belt
    b.box(t.accent, 0.3, 0.3, 0.05, 0, 1.35, 0.52);
    b.sph(hide, 0.38, 0, 3.05, 0.55);                                  // head, jutting forward
    b.box(m.black, 0.1, 0.06, 0.04, 0.13, 3.12, 0.88); b.box(m.black, 0.1, 0.06, 0.04, -0.13, 3.12, 0.88);
    b.box(m.lampRed, 0.06, 0.04, 0.02, 0.13, 3.12, 0.9); b.box(m.lampRed, 0.06, 0.04, 0.02, -0.13, 3.12, 0.9); // glowing eyes
    b.add(new THREE.ConeGeometry(0.06, 0.25, 5), m.concrete, 0.14, 2.88, 0.85, -2.6, 0, 0); b.add(new THREE.ConeGeometry(0.06, 0.25, 5), m.concrete, -0.14, 2.88, 0.85, -2.6, 0, 0); // tusks
    b.sph(hide, 0.12, 0.38, 3.15, 0.45); b.sph(hide, 0.12, -0.38, 3.15, 0.45); // ears
    b.box(hide, 0.32, 1.3, 0.34, -1.0, 2.0, 0.2, 0.2, 0, 0.25);        // left arm, hanging
    b.sph(hide, 0.24, -1.12, 1.35, 0.35);
    for (let i = 0; i < 4; i++) b.add(new THREE.ConeGeometry(0.1, 0.35, 4), m.concrete, -0.4 + i * 0.27, 3.0, -0.35, -0.5, 0, 0); // back spikes
    root.add(b.build());
    for (const s of [-1, 1]) {
      const lb = new Builder();
      lb.box(hide, 0.42, 0.85, 0.46, 0, -0.42, 0);
      lb.box(hide, 0.55, 0.2, 0.75, 0, -0.9, 0.12);
      const leg = lb.build(); leg.position.set(s * 0.42, 1.25, 0); leg.name = s < 0 ? 'wLegL' : 'wLegR';
      root.add(leg);
    }
    const cb = new Builder();                                          // right arm + club, pivoting at the shoulder
    cb.box(hide, 0.34, 1.0, 0.36, 0, -0.45, 0);
    cb.sph(hide, 0.24, 0, -0.95, 0.05);
    cb.cyl(wood, 0.16, 0.3, 2.0, 8, 0, -0.95, 0.95, Math.PI / 2, 0, 0);
    for (let i = 0; i < 4; i++) cb.add(new THREE.ConeGeometry(0.06, 0.22, 4), m.metal, Math.cos(i * 1.6) * 0.28, -0.95 + Math.sin(i * 1.6) * 0.28, 1.6 + i * 0.08, Math.sin(i * 1.6), 0, -Math.cos(i * 1.6));
    const club = cb.build(); club.position.set(1.0, 2.6, 0.1); club.name = 'club'; club.rotation.x = -0.3;
    root.add(club);
    root.scale.setScalar(1.2);
    root.userData.muzzle = new THREE.Vector3(1.0, 1.6, 2.2);
    return root;
  });
}

// Bone Catapult: wooden frame on four wheels with a throwing arm ('arm') and a flaming boulder
export function makeCatapult(faction) {
  return cached(`catapult-${faction}`, () => {
    const t = mats(faction), m = M();
    const wood = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.9, flatShading: true });
    const bone = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.7 });
    const root = new THREE.Group();
    const b = new Builder();
    for (const z of [0.9, -0.9]) for (const x of [-0.95, 0.95]) wheel(b, wood, x, 0.5, z, 0.5, 0.25);
    b.box(wood, 1.7, 0.25, 2.6, 0, 0.75, 0);                           // base frame
    for (const s of [-1, 1]) { b.box(wood, 0.18, 1.5, 0.18, s * 0.65, 1.55, -0.2, 0.25, 0, 0); b.box(wood, 0.18, 1.5, 0.18, s * 0.65, 1.55, 0.4, -0.25, 0, 0); }
    b.box(wood, 1.5, 0.18, 0.18, 0, 2.2, 0.1);                         // cross beam
    b.box(t.team, 1.72, 0.12, 0.6, 0, 0.92, 0.9);                      // team banner rail
    for (let i = 0; i < 4; i++) b.add(new THREE.ConeGeometry(0.06, 0.3, 4), bone, -0.6 + i * 0.4, 1.0, 1.25, Math.PI / 2, 0, 0); // bone spikes
    b.sph(bone, 0.16, 0.7, 1.05, 1.15); b.sph(bone, 0.16, -0.7, 1.05, 1.15); // skulls
    b.box(m.black, 0.06, 0.04, 0.02, 0.75, 1.07, 1.3); b.box(m.black, 0.06, 0.04, 0.02, -0.65, 1.07, 1.3);
    b.box(m.darkMetal, 0.9, 0.5, 0.6, 0, 1.1, -0.95);                  // counterweight box
    root.add(b.build());
    const ab = new Builder();
    ab.box(wood, 0.16, 0.16, 2.6, 0, 0, 1.1);                          // the arm, pivoting at the cross beam
    ab.box(wood, 0.5, 0.12, 0.45, 0, 0.05, 2.35);                      // cup
    ab.sph(m.rock || m.concreteDark, 0.24, 0, 0.28, 2.35);             // boulder
    ab.sph(new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 1.6, 0.4) }), 0.12, 0, 0.42, 2.35);
    const arm = ab.build(false); arm.position.set(0, 2.25, 0.1); arm.rotation.x = 0.55; arm.name = 'arm';
    root.add(arm);
    root.userData.muzzle = new THREE.Vector3(0, 3.6, 0.6);
    return root;
  });
}

// Shield Projector: a six-wheeled truck with a dish emitter; the bubble itself is added by the unit
export function makeShieldGen(faction) {
  return cached(`shieldgen-${faction}`, () => {
    const t = mats(faction), m = M();
    const glow = new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x58c8ff, emissiveIntensity: 2.4, roughness: 0.3 });
    const root = new THREE.Group();
    const b = new Builder();
    for (const z of [1.0, -0.2, -1.0]) for (const x of [-0.8, 0.8]) wheel(b, m.metal, x, 0.42, z, 0.4, 0.3);
    b.box(t.team, 1.5, 0.95, 1.0, 0, 1.05, 1.15);
    b.box(m.glass, 1.3, 0.4, 0.04, 0, 1.3, 1.66);
    b.box(m.darkMetal, 1.55, 0.3, 3.0, 0, 0.62, -0.2);
    b.box(t.teamDark, 1.55, 0.6, 1.9, 0, 1.0, -0.7);
    b.cyl(m.metal, 0.12, 0.18, 0.8, 8, 0, 1.7, -0.7);                  // mast
    b.add(new THREE.SphereGeometry(0.75, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), m.metal, 0, 2.05, -0.7, Math.PI, 0, 0); // dish
    b.sph(glow, 0.22, 0, 2.0, -0.7);                                   // emitter
    for (const s of [-1, 1]) b.cyl(glow, 0.08, 0.08, 1.7, 8, s * 0.6, 1.33, -0.7, Math.PI / 2, 0, 0); // glowing capacitor rails
    b.box(t.accent, 0.5, 0.5, 0.02, 0.77, 1.05, 1.15, 0, Math.PI / 2, 0);
    root.add(b.build());
    root.userData.muzzle = new THREE.Vector3(0, 2.0, -0.7);
    return root;
  });
}

// Tunnel Drill: an armoured mole-machine with a huge spinning drill ('drill') on the nose
export function makeBurrower(faction) {
  return cached(`burrower-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const b = new Builder();
    trackUnit(b, -1, 2.8, 0.6, 0.5, 0.35, faction);
    trackUnit(b, 1, 2.8, 0.6, 0.5, 0.35, faction);
    b.box(t.team, 1.5, 0.8, 2.2, 0, 0.95, -0.2);
    b.box(t.teamDark, 1.55, 0.18, 2.25, 0, 1.4, -0.2);
    b.box(m.darkMetal, 0.7, 0.45, 0.8, 0, 1.6, -0.7);                  // engine
    for (const s of [-1, 1]) b.cyl(m.darkMetal, 0.08, 0.1, 0.6, 6, s * 0.25, 2.0, -0.85);  // exhausts
    b.box(m.hazard, 1.56, 0.1, 0.12, 0, 1.15, 0.9);
    root.add(b.build());
    const db = new Builder();
    db.add(new THREE.ConeGeometry(0.62, 1.6, 10).rotateX(Math.PI / 2).translate(0, 0, 0.8), m.metal, 0, 0, 0);
    for (let i = 0; i < 4; i++) db.add(new THREE.TorusGeometry(0.52 - i * 0.12, 0.05, 5, 12), m.darkMetal, 0, 0, 0.25 + i * 0.35);
    const drill = db.build(false); drill.position.set(0, 0.95, 0.95); drill.name = 'drill';
    root.add(drill);
    root.userData.muzzle = new THREE.Vector3(0, 0.95, 2.4);
    return root;
  });
}

// Medevac Copter: a white rescue helicopter with red crosses and a team-coloured stripe
export function makeMedevac(faction) {
  return cached(`medevac-${faction}`, () => {
    const t = mats(faction), m = M();
    const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.5 });
    const root = new THREE.Group();
    const b = new Builder();
    b.sph(white, 0.85, 0, 0, 0.2, 1, 0.95, 1.8);                      // fuselage
    b.sph(m.glass, 0.55, 0, 0.25, 1.35, 0.9, 0.8, 1.0);              // canopy
    b.box(t.team, 1.72, 0.18, 2.2, 0, -0.1, 0.0);                     // team stripe
    for (const s of [-1, 1]) { b.box(m.lampRed, 0.03, 0.55, 0.16, s * 0.86, 0.1, 0.0); b.box(m.lampRed, 0.03, 0.16, 0.55, s * 0.86, 0.1, 0.0); } // red crosses
    b.box(m.lampRed, 0.55, 0.03, 0.16, 0, 0.82, -0.2); b.box(m.lampRed, 0.16, 0.03, 0.55, 0, 0.82, -0.2);
    b.cyl(white, 0.2, 0.32, 3.0, 10, 0, 0.15, -2.1, Math.PI / 2, 0, 0);  // tail boom
    b.box(white, 0.08, 0.85, 0.55, 0, 0.55, -3.5);
    for (const s of [-1, 1]) { b.box(m.gun, 0.05, 0.4, 0.05, s * 0.55, -0.75, 0.5); b.box(m.gun, 0.05, 0.4, 0.05, s * 0.55, -0.75, -0.4); b.box(m.gun, 0.06, 0.06, 1.6, s * 0.55, -0.95, 0.05); }
    b.box(m.lampRed, 0.12, 0.08, 0.12, 0, 0.95, 0.6); b.box(m.lampWhite, 0.12, 0.08, 0.12, 0, 0.95, 0.35);
    b.cyl(m.darkMetal, 0.15, 0.25, 0.4, 10, 0, 0.85, 0.2);
    root.add(b.build());
    const rb = new Builder();
    for (let i = 0; i < 4; i++) rb.box(m.black, 0.25, 0.03, 4.4, 0, 0, 0, 0, i * Math.PI / 4, 0);
    const rotor = rb.build(false); rotor.position.set(0, 1.1, 0.2); rotor.name = 'rotor'; root.add(rotor);
    const tr = new Builder(); tr.box(m.black, 0.04, 1.0, 0.12, 0, 0, 0); tr.box(m.black, 0.04, 0.12, 1.0, 0, 0, 0);
    const trot = tr.build(false); trot.position.set(0.1, 0.55, -3.5); trot.name = 'tailrotor'; root.add(trot);
    const disk = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.18, depthWrite: false }));
    disk.position.set(0, 1.12, 0.2); root.add(disk);
    root.userData.muzzle = new THREE.Vector3(0, -0.5, 0.5);
    return root;
  });
}

// Wild Haggis: a furry ball in a tartan bonnet. Its left legs are longer than its right ones, for running round hills.
export function makeHaggis() {
  return cached('haggis', () => {
    const m = M();
    const fur = new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: 1, flatShading: true });
    const tartan = new THREE.MeshStandardMaterial({ color: 0x2a5a3a, roughness: 0.85 });
    const root = new THREE.Group();
    const b = new Builder();
    b.sph(fur, 0.42, 0, 0.62, 0, 1.1, 0.85, 1.2);
    b.sph(fur, 0.22, 0, 0.75, 0.42);                                   // head
    b.sph(m.black, 0.04, 0.08, 0.8, 0.6); b.sph(m.black, 0.04, -0.08, 0.8, 0.6); // eyes
    b.sph(m.lampRed, 0.035, 0, 0.72, 0.64);                            // nose
    b.cyl(tartan, 0.2, 0.2, 0.05, 12, 0, 0.97, 0.38);                  // tam o' shanter
    b.cyl(m.lampRed, 0.21, 0.21, 0.02, 12, 0, 0.95, 0.38);
    b.sph(m.lampRed, 0.06, 0, 1.03, 0.38);                             // bobble
    root.add(b.build());
    for (const [x, z, len] of [[0.22, 0.18, 0.5], [0.22, -0.18, 0.5], [-0.22, 0.18, 0.3], [-0.22, -0.18, 0.3]]) {
      const lb = new Builder(); lb.box(fur, 0.09, len, 0.09, 0, -len / 2, 0); lb.box(m.black, 0.1, 0.05, 0.12, 0, -len, 0.02);
      const leg = lb.build(); leg.position.set(x, 0.42, z); leg.name = 'leg'; root.add(leg);
    }
    root.userData.muzzle = new THREE.Vector3(0, 0.7, 0.5);
    return root;
  });
}

// Freeze Tank: a pale armoured tank whose turret carries a frosty cryo emitter
export function makeFreezeTank(faction) {
  return cached(`freezetank-${faction}`, () => {
    const t = mats(faction), m = M();
    const ice = new THREE.MeshStandardMaterial({ color: 0xbfe8ff, emissive: 0x3a9adf, emissiveIntensity: 1.6, roughness: 0.25 });
    const pale = new THREE.MeshStandardMaterial({ color: 0xe6eef4, roughness: 0.6 });
    const root = new THREE.Group();
    const hull = new Builder();
    trackUnit(hull, -1, 3.3, 0.7, 0.6, 0.38, faction);
    trackUnit(hull, 1, 3.3, 0.7, 0.6, 0.38, faction);
    hull.box(pale, 1.9, 0.55, 3.0, 0, 0.75, 0);
    hull.box(t.team, 1.95, 0.12, 3.05, 0, 1.06, 0);
    hull.box(m.darkMetal, 0.8, 0.3, 0.6, 0, 1.0, -1.3);
    root.add(hull.build());
    const tb = new Builder();
    tb.cyl(pale, 0.75, 0.9, 0.45, 10, 0, 0, 0);
    tb.box(t.team, 0.9, 0.12, 0.9, 0, 0.25, -0.1);
    for (const s of [-1, 1]) tb.cyl(m.metal, 0.12, 0.12, 0.8, 8, s * 0.45, 0.1, -0.3, Math.PI / 2, 0, 0); // coolant tanks
    tb.cyl(m.darkMetal, 0.14, 0.2, 1.7, 10, 0, 0.05, 1.2, Math.PI / 2, 0, 0);
    for (let i = 0; i < 3; i++) tb.add(new THREE.TorusGeometry(0.2, 0.04, 6, 12), ice, 0, 0.05, 0.7 + i * 0.4);
    tb.sph(ice, 0.17, 0, 0.05, 2.1);
    const tur = tb.build(); tur.position.set(0, 1.35, 0); tur.name = 'turret';
    root.add(tur);
    root.userData.muzzle = new THREE.Vector3(0, 0.05, 2.2);
    return root;
  });
}

// Ice Cream Van: pastel van with a giant cone on the roof
export function makeIceCreamVan() {
  return cached('icecream', () => {
    const m = M();
    const pink = new THREE.MeshStandardMaterial({ color: 0xffb6d2, roughness: 0.5 });
    const cream = new THREE.MeshStandardMaterial({ color: 0xfff4dc, roughness: 0.5 });
    const cone = new THREE.MeshStandardMaterial({ color: 0xd89a4a, roughness: 0.8 });
    const root = new THREE.Group();
    const b = new Builder();
    for (const z of [1.0, -1.0]) for (const x of [-0.85, 0.85]) wheel(b, m.metal, x, 0.42, z, 0.42, 0.3);
    b.box(cream, 1.7, 1.5, 3.3, 0, 1.3, 0);
    b.box(pink, 1.72, 0.45, 3.32, 0, 0.75, 0);
    for (let i = 0; i < 5; i++) b.box(pink, 0.3, 0.12, 0.02, -0.6 + i * 0.3, 2.0, 1.66); // scalloped trim
    b.box(m.glass, 1.4, 0.5, 0.04, 0, 1.55, 1.66);
    b.box(m.glass, 0.04, 0.6, 1.2, 0.86, 1.45, -0.2);               // serving hatch
    b.box(pink, 0.06, 0.08, 1.3, 0.9, 1.1, -0.2);
    b.add(new THREE.ConeGeometry(0.35, 0.9, 10).rotateX(Math.PI), cone, 0, 2.55, -0.4);  // giant cone
    b.sph(new THREE.MeshStandardMaterial({ color: 0xfff8f0, roughness: 0.6 }), 0.38, 0, 3.05, -0.4);
    b.sph(new THREE.MeshStandardMaterial({ color: 0xff6aa8, roughness: 0.6 }), 0.28, 0, 3.4, -0.4);
    b.sph(m.lampRed, 0.08, 0, 3.7, -0.4);                              // cherry on top
    b.box(m.lampWhite, 0.2, 0.1, 0.04, 0.55, 0.9, 1.66); b.box(m.lampWhite, 0.2, 0.1, 0.04, -0.55, 0.9, 1.66);
    root.add(b.build());
    root.userData.muzzle = new THREE.Vector3(0, 1.5, 1.7);
    return root;
  });
}

// Research upgrade pictures for the Tech tab (3D, so they look right on every device - emoji icons
// were missing on some phones)
export function makeUpgradeModel(type, faction) {
  const t = mats(faction), m = M();
  const root = new THREE.Group();
  const b = new Builder();
  const glow = (c, e, k = 2.2) => new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: k, roughness: 0.3 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa4ae, metalness: 0.85, roughness: 0.3 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xd8a23a, metalness: 0.9, roughness: 0.3 });
  if (type === 'armor') {            // a tank with thick bolted armour plates
    root.add(makeTank(faction));
    for (const s of [-1, 1]) { b.box(steel, 0.12, 0.7, 3.0, s * 1.15, 0.85, 0); for (let i = 0; i < 4; i++) b.sph(m.darkMetal, 0.06, s * 1.22, 1.05, -1.1 + i * 0.75); }
    b.box(steel, 1.6, 0.12, 0.9, 0, 1.75, 0.3, -0.3, 0, 0);
  } else if (type === 'bodyarmor') { // a soldier in a bright armoured vest
    const inf = makeInfantry('rifle', faction); inf.scale.setScalar(1.6); root.add(inf);
    b.box(glow(0xffa21a, 0x6a3a00, 0.6), 0.85, 0.75, 0.55, 0, 1.6, 0); b.box(m.hazard, 0.87, 0.1, 0.57, 0, 1.45, 0);
    b.box(steel, 0.3, 0.3, 0.05, 0, 1.68, 0.29);
  } else if (type === 'shells') {    // a big glowing artillery shell
    b.cyl(brass, 0.45, 0.45, 1.6, 20, 0, 0.8, 0);
    b.cyl(m.lampRed, 0.47, 0.47, 0.18, 20, 0, 1.2, 0);
    b.add(new THREE.ConeGeometry(0.45, 0.9, 20), glow(0xff7a2a, 0xff4a00, 2.5), 0, 2.05, 0);
    b.cyl(steel, 0.5, 0.5, 0.15, 20, 0, 0.08, 0);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; b.add(new THREE.ConeGeometry(0.08, 0.5, 4), glow(0xffd040, 0xff8000, 3), Math.cos(a) * 0.75, 2.2, Math.sin(a) * 0.75, Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8); }
  } else if (type === 'refining') {  // a cluster of shining blue crystals on a refinery pad
    b.cyl(m.concreteDark, 1.2, 1.3, 0.25, 16, 0, 0.12, 0);
    const blue = glow(0x8fdcff, 0x2a8adf, 1.8);
    for (const [x, z, h, r] of [[0, 0, 1.8, 0.4], [0.55, 0.2, 1.2, 0.3], [-0.5, 0.25, 1.1, 0.3], [0.1, -0.55, 1.0, 0.28], [-0.3, -0.4, 0.8, 0.22]]) b.add(new THREE.OctahedronGeometry(r, 0).scale(1, h / r / 1.6, 1), blue, x, 0.25 + h * 0.5, z);
    b.box(brass, 0.3, 0.3, 0.3, 0.9, 0.4, -0.6);
  } else if (type === 'engines') {   // a big steel gear with exhaust flames
    const g = new Builder();
    g.cyl(steel, 0.9, 0.9, 0.35, 24, 0, 0, 0, Math.PI / 2, 0, 0);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.box(steel, 0.32, 0.36, 0.35, Math.cos(a) * 1.0, Math.sin(a) * 1.0, 0, 0, 0, a); }
    g.cyl(m.darkMetal, 0.3, 0.3, 0.4, 16, 0, 0, 0, Math.PI / 2, 0, 0);
    const gear = g.build(); gear.position.set(0, 1.4, 0); gear.rotation.y = 0.5; root.add(gear);
    for (const s of [-1, 1]) { b.cyl(m.darkMetal, 0.15, 0.18, 0.7, 10, s * 0.5, 0.35, -0.6, Math.PI / 2, 0, 0); b.add(new THREE.ConeGeometry(0.16, 0.7, 10).rotateX(-Math.PI / 2), glow(0x6ac8ff, 0x2a7aff, 3), s * 0.5, 0.35, -1.25); }
  } else {                           // optics: a brass telescope on a tripod
    b.cyl(brass, 0.2, 0.32, 2.2, 16, 0, 1.6, 0, 0.0, 0, -1.0);
    b.cyl(m.darkMetal, 0.34, 0.34, 0.12, 16, 0.9, 2.2, 0, 0, 0, -1.0);
    b.add(new THREE.CircleGeometry(0.3, 16).rotateY(Math.PI / 2).rotateZ(-1.0 + Math.PI / 2), glow(0x9fe8ff, 0x3ab0ff, 2), 0.97, 2.25, 0);
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; b.cyl(m.darkMetal, 0.04, 0.05, 1.6, 6, Math.cos(a) * 0.35, 0.75, Math.sin(a) * 0.35, Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3); }
  }
  if (b.parts.size) root.add(b.build());
  return root;
}

export function makeJet(faction) {
  return cached(`jet-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const b = new Builder();
    b.add(new THREE.ConeGeometry(0.42, 4.2, 12), t.team, 0, 0, 0.2, Math.PI / 2, 0, 0);          // fuselage
    b.sph(m.glass, 0.32, 0, 0.25, 0.9, 0.8, 0.7, 1.8);                                             // canopy
    const wing = new THREE.BufferGeometry();
    wing.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 1.2, -2.4, 0, -1.4, 2.4, 0, -1.4]), 3)); wing.computeVertexNormals();
    b.add(wing, t.teamDark, 0, -0.05, 0); b.add(wing.clone().rotateX(Math.PI), t.teamDark, 0, -0.07, 0); // delta wing (both faces)
    b.box(t.teamDark, 0.06, 0.9, 0.9, 0, 0.45, -1.4, 0.2, 0, 0);                                   // tail fin
    b.box(t.accent, 0.07, 0.25, 0.4, 0, 0.75, -1.55);
    for (const s of [-1, 1]) { b.cyl(m.darkMetal, 0.07, 0.07, 0.9, 6, s * 1.3, -0.15, -0.6, Math.PI / 2, 0, 0); b.box(m.lampRed, 0.06, 0.04, 0.06, s * 2.3, 0, -1.35); }
    b.cyl(m.darkMetal, 0.22, 0.28, 0.4, 10, 0, 0, -1.9, Math.PI / 2, 0, 0);                        // engine nozzle
    b.sph(new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 1.8, 0.6) }), 0.17, 0, 0, -2.1, 1, 1, 0.6); // afterburner glow
    root.add(b.build());
    root.userData.muzzle = new THREE.Vector3(1.3, -0.15, 0); root.userData.muzzle2 = new THREE.Vector3(-1.3, -0.15, 0);
    return root;
  });
}

export function makeHauler(faction) {
  return cached(`hauler-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const b = new Builder();
    b.add(new THREE.CapsuleGeometry(0.75, 3.6, 6, 14), t.team, 0, 0, 0, Math.PI / 2, 0, 0);   // long fuselage
    b.box(t.teamDark, 1.3, 0.2, 4.2, 0, -0.55, 0);                                              // belly
    b.sph(m.glass, 0.55, 0, 0.2, 2.3, 1.1, 0.8, 0.9);                                           // cockpit glass
    b.box(t.teamDark, 0.5, 0.9, 0.9, 0, 0.75, -1.95);                                           // rear pylon
    b.box(t.teamDark, 0.45, 0.55, 0.7, 0, 0.6, 1.7);                                            // front pylon
    for (let i = 0; i < 5; i++) for (const s of [-1, 1]) b.box(m.glass, 0.04, 0.22, 0.3, s * 0.76, 0.15, -1.2 + i * 0.55); // windows
    b.box(m.darkMetal, 1.1, 0.7, 0.08, 0, -0.1, -2.55);                                         // rear ramp
    for (const s of [-1, 1]) { b.box(m.darkMetal, 0.25, 0.25, 1.1, s * 0.7, -0.75, 0.4); b.cyl(m.black, 0.18, 0.18, 0.14, 10, s * 0.7, -0.95, 1.2, 0, 0, Math.PI / 2); b.cyl(m.black, 0.18, 0.18, 0.14, 10, s * 0.7, -0.95, -0.6, 0, 0, Math.PI / 2); }
    b.box(t.accent, 0.02, 0.4, 0.6, 0.77, 0.1, 0.9);
    b.box(m.lampRed, 0.1, 0.06, 0.1, 0, 1.25, -1.95);
    root.add(b.build());
    const rotor = (name, y, z) => {
      const rb = new Builder();
      rb.cyl(m.darkMetal, 0.14, 0.14, 0.2, 8, 0, 0, 0);
      for (let i = 0; i < 3; i++) rb.box(m.darkMetal, 0.22, 0.04, 3.6, 0, 0.08, 0, 0, i * Math.PI * 2 / 3, 0);
      const r = rb.build(); r.position.set(0, y, z); r.name = name; root.add(r);
    };
    rotor('rotor', 1.08, 1.7); rotor('rotor2', 1.28, -1.95);
    return root;
  });
}

export function makeDrone(faction) {
  return cached(`drone-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const b = new Builder();
    b.sph(t.team, 0.45, 0, 0, 0, 1, 0.45, 1.3);                       // body
    b.sph(m.glass, 0.2, 0, -0.12, 0.45, 1, 1, 1);                       // camera ball
    b.box(t.teamDark, 2.0, 0.06, 0.14, 0, 0.04, 0, 0, Math.PI / 4, 0);  // X frame
    b.box(t.teamDark, 2.0, 0.06, 0.14, 0, 0.04, 0, 0, -Math.PI / 4, 0);
    for (const [x, z] of [[0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) b.cyl(m.darkMetal, 0.1, 0.1, 0.16, 8, x, 0.1, z);
    b.box(m.lampRed, 0.08, 0.05, 0.08, 0, 0.22, -0.4);
    b.cyl(m.gun, 0.015, 0.015, 0.5, 4, 0.15, 0.4, -0.3);
    root.add(b.build());
    // spinning prop discs (blurred)
    const discMat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.35, depthWrite: false });
    const props = new THREE.Group(); props.name = 'props';
    for (const [x, z] of [[0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16).rotateX(-Math.PI / 2), discMat); d.position.set(x, 0.2, z); props.add(d); }
    root.add(props);
    root.scale.setScalar(1.2);
    return root;
  });
}

export function makeGunship(faction) {
  return cached(`heli-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const b = new Builder();
    b.sph(t.team, 0.8, 0, 0, 0.3, 1, 0.9, 1.9);                 // fuselage
    b.sph(m.glass, 0.55, 0, 0.25, 1.5, 0.9, 0.8, 1.0);          // canopy
    b.cyl(t.team, 0.2, 0.35, 3.2, 10, 0, 0.15, -2.2, Math.PI / 2, 0, 0); // tail boom
    b.box(t.teamDark, 0.08, 0.9, 0.6, 0, 0.55, -3.7);           // tail fin
    b.box(t.teamDark, 1.3, 0.06, 0.4, 0, 0.2, -3.4);            // stabiliser
    b.box(t.teamDark, 2.6, 0.1, 0.5, 0, -0.15, 0.2);            // stub wings
    for (const s of [-1, 1]) {
      b.cyl(m.darkMetal, 0.17, 0.17, 1.0, 10, s * 1.15, -0.32, 0.25, Math.PI / 2, 0, 0); // rocket pods
      b.cyl(m.lampRed, 0.13, 0.13, 0.05, 10, s * 1.15, -0.32, 0.77, Math.PI / 2, 0, 0);
      b.box(m.gun, 0.05, 0.4, 0.05, s * 0.5, -0.7, 0.6); b.box(m.gun, 0.05, 0.4, 0.05, s * 0.5, -0.7, -0.4);
      b.box(m.gun, 0.06, 0.06, 1.6, s * 0.5, -0.9, 0.1); // skids
      b.box(m.lampGreen, 0.06, 0.06, 0.06, s * 1.3, -0.1, 0.2);
    }
    b.cyl(m.darkMetal, 0.15, 0.25, 0.4, 10, 0, 0.82, 0.2);      // rotor mast
    b.box(t.team, 0.9, 0.35, 1.3, 0, 0.6, 0.0);                 // engine housing
    b.cyl(m.gun, 0.05, 0.05, 0.8, 8, 0, -0.55, 1.7, Math.PI / 2, 0, 0); // chin gun
    const body = b.build();
    root.add(body);
    const rb = new Builder();
    for (let i = 0; i < 4; i++) rb.box(m.black, 0.25, 0.03, 4.4, 0, 0, 0, 0, (i * Math.PI) / 4 * 2 / 2 + i * Math.PI / 4, 0);
    rb.cyl(m.darkMetal, 0.18, 0.18, 0.15, 10, 0, 0, 0);
    const rotor = rb.build(false); rotor.position.set(0, 1.08, 0.2); rotor.name = 'rotor';
    root.add(rotor);
    const tr = new Builder();
    tr.box(m.black, 0.04, 1.1, 0.12, 0, 0, 0); tr.box(m.black, 0.04, 0.12, 1.1, 0, 0, 0);
    const trot = tr.build(false); trot.position.set(0.12, 0.55, -3.7); trot.name = 'tailrotor';
    root.add(trot);
    // rotor blur disk
    const disk = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.18, depthWrite: false }));
    disk.position.set(0, 1.1, 0.2); root.add(disk);
    root.userData.muzzle = new THREE.Vector3(1.15, -0.32, 0.8);
    root.userData.muzzle2 = new THREE.Vector3(-1.15, -0.32, 0.8);
    return root;
  });
}

export function makeStealth(faction) {
  return cached(`stealth-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const b = new Builder();
    trackUnit(b, -1, 3.2, 0.55, 0.55, 0.3, faction);
    trackUnit(b, 1, 3.2, 0.55, 0.55, 0.3, faction);
    // low faceted wedge hull
    b.add(new THREE.CylinderGeometry(0.2, 1.25, 0.55, 4, 1), t.teamDark, 0, 0.78, 0.1, 0, Math.PI / 4, 0, 1, 1, 1.55);
    b.add(new THREE.BoxGeometry(1.9, 0.12, 3.4), t.team, 0, 0.62, 0);
    b.add(new THREE.BoxGeometry(1.2, 0.3, 0.9), t.teamDark, 0, 0.9, 1.45, -0.35, 0, 0);
    b.box(m.glass, 0.7, 0.08, 0.35, 0, 1.06, 0.85, -0.2, 0, 0);
    for (const s2 of [-1, 1]) b.add(new THREE.BoxGeometry(0.06, 0.35, 1.6), m.darkMetal, s2 * 0.75, 0.95, -0.6, 0, s2 * 0.15, s2 * 0.4);
    b.box(m.lampRed, 0.5, 0.04, 0.04, 0, 0.82, 1.92);
    root.add(b.build());
    const tb = new Builder();
    tb.box(t.teamDark, 0.9, 0.25, 0.9, 0, 0, 0);
    for (const s2 of [-0.42, 0.42]) {
      tb.box(m.darkMetal, 0.32, 0.32, 1.3, s2, 0.2, 0.2);
      for (let r = 0; r < 2; r++) tb.cyl(m.lampRed, 0.06, 0.06, 0.04, 8, s2 + (r - 0.5) * 0.14, 0.2, 0.86, Math.PI / 2, 0, 0);
    }
    const tur = tb.build(); tur.position.set(0, 1.1, -0.5); tur.name = 'turret';
    root.add(tur);
    root.userData.muzzle = new THREE.Vector3(0.42, 0.2, 0.9);
    root.userData.muzzle2 = new THREE.Vector3(-0.42, 0.2, 0.9);
    return root;
  });
}

export function makeInferno(faction) {
  return cached(`inferno-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const b = new Builder();
    trackUnit(b, -1, 3.6, 0.75, 0.66, 0.4, faction);
    trackUnit(b, 1, 3.6, 0.75, 0.66, 0.4, faction);
    b.box(t.team, 1.6, 0.55, 3.4, 0, 0.88, 0);
    b.add(new THREE.BoxGeometry(1.6, 0.5, 0.7), t.team, 0, 0.8, 1.9, -0.6, 0, 0);
    b.box(t.team, 2.3, 0.08, 3.5, 0, 1.18, 0);
    // fuel tanks on the back
    for (const s2 of [-0.45, 0.45]) {
      b.add(new THREE.CylinderGeometry(0.38, 0.38, 1.8, 14), m.lampRed, s2, 1.6, -0.9, Math.PI / 2, 0, 0);
      b.sph(m.lampRed, 0.38, s2, 1.6, 0.0, 1, 1, 0.6); b.sph(m.lampRed, 0.38, s2, 1.6, -1.8, 1, 1, 0.6);
      b.add(new THREE.TorusGeometry(0.4, 0.04, 6, 14), m.darkMetal, s2, 1.6, -0.5, 0, 0, 0);
      b.add(new THREE.TorusGeometry(0.4, 0.04, 6, 14), m.darkMetal, s2, 1.6, -1.3, 0, 0, 0);
    }
    b.box(m.hazard, 1.4, 0.1, 0.1, 0, 1.25, 0.3);
    b.box(m.lampWhite, 0.18, 0.1, 0.05, 0.6, 1.0, 2.2); b.box(m.lampWhite, 0.18, 0.1, 0.05, -0.6, 1.0, 2.2);
    root.add(b.build());
    const tb = new Builder();
    tb.add(new THREE.CylinderGeometry(0.55, 0.7, 0.45, 8), t.teamDark, 0, 0, 0);
    tb.box(m.darkMetal, 0.5, 0.4, 0.6, 0, 0.05, 0.5);
    tb.cyl(m.gun, 0.12, 0.16, 1.6, 10, 0, 0.05, 1.4, Math.PI / 2, 0, 0);
    tb.cyl(m.darkMetal, 0.2, 0.14, 0.3, 10, 0, 0.05, 2.25, Math.PI / 2, 0, 0);
    tb.cyl(m.lampRed, 0.05, 0.05, 1.0, 6, 0.2, 0.25, 0.8, Math.PI / 2, 0, 0); // fuel line
    tb.sph(m.lampRed, 0.06, 0, 0.05, 2.42); // pilot light
    const tur = tb.build(); tur.position.set(0, 1.45, 0.7); tur.name = 'turret';
    root.add(tur);
    root.userData.muzzle = new THREE.Vector3(0, 0.05, 2.45);
    return root;
  });
}

// ------------------------------------------------------------------ Wally Man
let wmMats = null;
function wallyManMats() {
  if (wmMats) return wmMats;
  const c = document.createElement('canvas'); c.width = 256; c.height = 160;
  const x = c.getContext('2d');
  x.fillStyle = '#2e6ad0'; x.fillRect(0, 0, 256, 160);
  x.fillStyle = '#2fa34a'; x.beginPath(); x.ellipse(128, 80, 124, 76, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#ee5a24'; x.beginPath(); x.ellipse(128, 80, 112, 66, 0, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#2459b8'; x.lineWidth = 9; x.beginPath(); x.arc(150, 70, 70, 0.55 * Math.PI, 0.95 * Math.PI); x.stroke();
  x.fillStyle = '#1f8a3a'; x.font = 'bold 42px Impact, "Arial Black", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.save(); x.translate(128, 66); x.rotate(-0.06); x.lineWidth = 5; x.strokeStyle = '#fff2c0'; x.strokeText('WALLY MAN', 0, 0); x.fillText('WALLY MAN', 0, 0); x.restore();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const std = o => fogify(new THREE.MeshStandardMaterial(o));
  wmMats = {
    blue: std({ color: 0x2b64cc, roughness: 0.7 }),
    red: std({ color: 0xe04a1e, roughness: 0.65 }),
    cape: std({ color: 0xe0461c, roughness: 0.75, side: THREE.DoubleSide }),
    emblem: std({ map: tex, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
    hair: std({ color: 0xc27236, roughness: 0.9 }),
  };
  return wmMats;
}
// Warlord Grak: the Grimlock hero. Hulking armoured brute with a horned helmet, glowing eyes,
// spiked shoulder plates, a trophy-skull belt and a shoulder-braced rotary rocket cannon.
export function makeWarlord(faction) {
  return cached(`warlord-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const b = new Builder();
    b.box(m.darkMetal, 0.66, 0.62, 0.4, 0, 1.06, 0);                    // armoured torso
    b.box(t.team, 0.7, 0.3, 0.42, 0, 1.22, 0.02);                       // chest plate
    b.box(t.accent, 0.16, 0.16, 0.02, 0, 1.2, 0.24, 0, 0, Math.PI / 4);  // emblem
    b.box(m.black, 0.68, 0.12, 0.44, 0, 0.76, 0);                        // belt
    for (let i = 0; i < 3; i++) b.sph(m.concrete, 0.06, -0.2 + i * 0.2, 0.74, 0.24, 1, 1.1, 0.9); // trophy skulls
    for (const s of [-1, 1]) {
      b.sph(t.teamDark, 0.2, s * 0.43, 1.33, 0, 1.2, 0.8, 1.1);          // shoulder plates
      for (let k = 0; k < 3; k++) b.add(new THREE.ConeGeometry(0.045, 0.2, 6), m.gun, s * (0.36 + k * 0.08), 1.5, -0.08 + k * 0.08, 0, 0, -s * 0.5); // spikes
      b.box(m.darkMetal, 0.17, 0.4, 0.17, s * 0.43, 1.0, 0.05, -0.3, 0, s * 0.1);  // arms
      b.box(t.team, 0.19, 0.2, 0.19, s * 0.43, 0.8, 0.2, -1.0, 0, 0);    // gauntlets
    }
    // head: horned helmet with glowing eye slit and tusks
    b.sph(m.darkMetal, 0.2, 0, 1.56, 0.02, 1, 1.05, 1);
    b.box(m.black, 0.3, 0.06, 0.06, 0, 1.56, 0.19);
    b.box(m.lampRed, 0.24, 0.035, 0.02, 0, 1.565, 0.215);               // glowing eyes
    for (const s of [-1, 1]) {
      b.add(new THREE.ConeGeometry(0.05, 0.36, 8), m.concrete, s * 0.2, 1.74, 0, 0, 0, -s * 0.9); // horns
      b.add(new THREE.ConeGeometry(0.025, 0.1, 5), m.concrete, s * 0.08, 1.45, 0.2, Math.PI, 0, 0); // tusks
    }
    b.box(t.team, 0.04, 0.12, 0.3, 0, 1.76, -0.02);                      // crest
    const body = b.build(); body.name = 'body';
    root.add(body);
    // tattered banner on the back
    const ban = new Builder();
    ban.cyl(m.gun, 0.02, 0.02, 1.1, 5, 0.18, 1.6, -0.24);
    ban.box(t.team, 0.3, 0.42, 0.02, 0.35, 1.9, -0.24);
    ban.box(t.accent, 0.12, 0.12, 0.025, 0.35, 1.92, -0.24, 0, 0, Math.PI / 4);
    root.add(ban.build());
    // rotary rocket cannon braced on the right shoulder
    const gb = new Builder();
    gb.add(new THREE.CylinderGeometry(0.13, 0.15, 0.5, 12), m.darkMetal, 0, 0, 0, Math.PI / 2, 0, 0);
    gb.box(t.teamDark, 0.24, 0.2, 0.3, 0, -0.08, -0.25);
    gb.box(m.hazard, 0.2, 0.16, 0.18, -0.17, -0.06, -0.15);
    const gun = gb.build(); gun.position.set(0.3, 1.18, 0.38); gun.name = 'gatling';
    const bb = new Builder();
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; bb.cyl(m.gun, 0.05, 0.05, 0.5, 8, Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0.25, Math.PI / 2, 0, 0); }
    bb.add(new THREE.TorusGeometry(0.12, 0.02, 5, 14), m.darkMetal, 0, 0, 0.45);
    const barrels = bb.build(); barrels.position.set(0, 0, 0.2); barrels.name = 'barrels';
    gun.add(barrels);
    root.add(gun);
    for (const side of [-1, 1]) {
      const lb = new Builder();
      lb.box(m.darkMetal, 0.24, 0.32, 0.24, 0, -0.14, 0);
      lb.box(t.teamDark, 0.25, 0.3, 0.25, 0, -0.44, 0.0);
      lb.box(m.black, 0.26, 0.1, 0.34, 0, -0.58, 0.05);
      const leg = lb.build(); leg.position.set(side * 0.17, 0.74, 0); leg.name = 'leg';
      root.add(leg);
    }
    root.scale.setScalar(1.3);
    root.userData.muzzle = new THREE.Vector3(0.3, 1.18, 1.1);
    return root;
  });
}

// Attack Dog: a stocky low-poly hound in a team-coloured harness, with a wagging tail
export function makeDog(faction) {
  return cached(`dog-${faction}`, () => {
    const t = mats(faction), m = M();
    const fur = faction === 'wally' ? new THREE.MeshStandardMaterial({ color: 0xb07a45, roughness: 0.9 }) : new THREE.MeshStandardMaterial({ color: 0x3a3330, roughness: 0.9 });
    const root = new THREE.Group();
    const b = new Builder();
    b.box(fur, 0.34, 0.3, 0.75, 0, 0.55, 0);                       // body
    b.box(t.team, 0.36, 0.12, 0.42, 0, 0.62, 0.04);                // harness
    b.box(t.accent, 0.06, 0.06, 0.06, 0.19, 0.62, 0.15);
    b.box(fur, 0.26, 0.26, 0.28, 0, 0.78, 0.45);                   // head
    b.box(fur, 0.16, 0.13, 0.2, 0, 0.72, 0.65);                    // snout
    b.box(m.black, 0.07, 0.05, 0.04, 0, 0.75, 0.76);               // nose
    b.box(m.black, 0.04, 0.04, 0.02, -0.08, 0.84, 0.6); b.box(m.black, 0.04, 0.04, 0.02, 0.08, 0.84, 0.6); // eyes
    b.box(fur, 0.07, 0.14, 0.05, -0.1, 0.96, 0.42, 0.2, 0, 0.3); b.box(fur, 0.07, 0.14, 0.05, 0.1, 0.96, 0.42, 0.2, 0, -0.3); // ears
    b.box(m.lampRed, 0.08, 0.02, 0.06, 0, 0.66, 0.73);              // tongue
    const body = b.build(); body.name = 'body'; root.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3).translate(0, 0, -0.15), fur); tail.position.set(0, 0.66, -0.37); tail.rotation.x = -0.6; tail.name = 'tail'; root.add(tail);
    for (const [x, z, anim] of [[-0.12, 0.28, true], [0.12, 0.28, false], [-0.12, -0.28, false], [0.12, -0.28, true]]) {
      const lb = new Builder(); lb.box(fur, 0.09, 0.42, 0.09, 0, -0.21, 0); lb.box(m.black, 0.1, 0.05, 0.12, 0, -0.42, 0.02);
      const leg = lb.build(); leg.position.set(x, 0.44, z); if (anim) leg.name = 'leg'; root.add(leg);
    }
    root.userData.muzzle = new THREE.Vector3(0, 0.72, 0.75);
    return root;
  });
}

export function makeWallyMan(faction) {
  return cached(`wallyman-${faction}`, () => {
    const m = M(), w = wallyManMats();
    const root = new THREE.Group();
    const b = new Builder();
    // stocky torso, belly and belt
    b.box(w.blue, 0.52, 0.56, 0.3, 0, 1.02, 0);
    b.sph(w.blue, 0.2, 0, 0.84, 0.04, 1.1, 0.7, 0.6);
    b.box(w.red, 0.56, 0.12, 0.34, 0, 0.76, 0.02);
    b.add(new THREE.PlaneGeometry(0.46, 0.29), w.emblem, 0, 1.08, 0.215); // stands proud of the chest so nothing hides the text
    b.box(w.blue, 0.2, 0.08, 0.2, 0, 1.31, 0.0); // collar
    // head: skin, ginger hair, ears, nose, moustache
    b.sph(m.skin, 0.165, 0, 1.47, 0.01, 1, 1.08, 1);
    b.add(new THREE.SphereGeometry(0.172, 16, 8, Math.PI * 0.62, Math.PI * 1.76, Math.PI * 0.22, Math.PI * 0.3), w.hair, 0, 1.47, 0.0); // ginger fringe round the back and sides
    b.sph(m.skin, 0.035, 0.16, 1.47, 0, 0.6, 1, 1); b.sph(m.skin, 0.035, -0.16, 1.47, 0, 0.6, 1, 1);
    b.sph(m.skin, 0.035, 0, 1.43, 0.165);
    b.box(w.hair, 0.09, 0.025, 0.03, 0, 1.385, 0.155);
    // blue bandana mask with trailing ties
    b.add(new THREE.CylinderGeometry(0.172, 0.172, 0.075, 18, 1, true), w.blue, 0, 1.475, 0.005);
    b.box(w.blue, 0.05, 0.05, 0.05, 0, 1.475, -0.18);
    b.box(w.blue, 0.06, 0.03, 0.32, 0.05, 1.4, -0.32, -0.55, 0.25, 0);
    b.box(w.blue, 0.06, 0.03, 0.28, -0.04, 1.38, -0.3, -0.8, -0.2, 0);
    // big black glasses
    for (const s of [-1, 1]) {
      b.add(new THREE.TorusGeometry(0.052, 0.014, 6, 16), m.black, s * 0.065, 1.48, 0.172, 0, 0, 0, 1.15, 0.9, 1);
      b.add(new THREE.CircleGeometry(0.05, 14), m.glass, s * 0.065, 1.48, 0.17, 0, 0, 0, 1.15, 0.9, 1);
      b.box(m.black, 0.06, 0.012, 0.012, s * 0.15, 1.485, 0.14, 0, s * 0.6, 0);
    }
    b.box(m.black, 0.03, 0.012, 0.012, 0, 1.485, 0.175);
    // arms: blue sleeves with red gauntlets, holding the gatling at the hip
    b.box(w.blue, 0.13, 0.3, 0.13, 0.32, 1.13, 0.02, -0.35, 0, 0.15);
    b.box(w.red, 0.14, 0.24, 0.14, 0.33, 0.93, 0.2, -1.25, 0, 0);
    b.sph(m.skin, 0.065, 0.31, 0.9, 0.34);
    b.box(w.blue, 0.13, 0.3, 0.13, -0.32, 1.13, 0.02, -0.5, 0, -0.15);
    b.box(w.red, 0.14, 0.24, 0.14, -0.27, 0.98, 0.24, -1.3, 0, 0.5);
    b.sph(m.skin, 0.065, -0.14, 0.97, 0.38);
    const body = b.build(); body.name = 'body';
    root.add(body);
    // cape (animated)
    const capeGeo = new THREE.PlaneGeometry(0.46, 0.78, 6, 8);
    const cp = capeGeo.attributes.position;
    for (let i = 0; i < cp.count; i++) {
      const px = cp.getX(i), py = cp.getY(i), t = (0.39 - py) / 0.78;
      cp.setX(i, px * (1 + t * 0.4)); cp.setZ(i, -Math.cos(px * 4) * 0.06 * (0.4 + t) - t * 0.08);
    }
    capeGeo.translate(0, -0.39, 0); capeGeo.computeVertexNormals();
    const cape = new THREE.Mesh(capeGeo, w.cape); cape.castShadow = true;
    cape.position.set(0, 1.32, -0.17); cape.rotation.x = 0.12; cape.name = 'cape';
    root.add(cape);
    // gatling gun with spinning barrels
    const gb = new Builder();
    gb.add(new THREE.CylinderGeometry(0.075, 0.085, 0.36, 12), m.gun, 0, 0, 0, Math.PI / 2, 0, 0);
    gb.box(m.darkMetal, 0.08, 0.14, 0.2, 0, -0.1, -0.08);
    gb.box(m.hazard, 0.16, 0.14, 0.16, 0.13, -0.08, -0.05); // ammo box
    for (let i = 0; i < 6; i++) gb.box(m.gun, 0.02, 0.02, 0.06, 0.13 - 0.0, -0.01 + i * 0.012, 0.06 + i * 0.03, 0, 0, 0); // ammo belt
    gb.box(m.darkMetal, 0.04, 0.12, 0.04, 0, 0.1, -0.05); // handle
    const gun = gb.build(); gun.position.set(0.12, 0.92, 0.42); gun.name = 'gatling';
    const bb = new Builder();
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; bb.cyl(m.gun, 0.016, 0.016, 0.62, 6, Math.cos(a) * 0.045, Math.sin(a) * 0.045, 0.31, Math.PI / 2, 0, 0); }
    bb.add(new THREE.TorusGeometry(0.052, 0.012, 5, 14), m.darkMetal, 0, 0, 0.5);
    bb.add(new THREE.TorusGeometry(0.052, 0.012, 5, 14), m.darkMetal, 0, 0, 0.18);
    const barrels = bb.build(); barrels.position.set(0, 0, 0.12); barrels.name = 'barrels';
    gun.add(barrels);
    root.add(gun);
    // legs (animated): blue tights and tall red boots
    for (const side of [-1, 1]) {
      const lb = new Builder();
      lb.box(w.blue, 0.19, 0.3, 0.2, 0, -0.14, 0);
      lb.box(w.red, 0.19, 0.27, 0.2, 0, -0.42, 0.0);
      lb.box(w.red, 0.2, 0.1, 0.3, 0, -0.55, 0.05);
      const leg = lb.build(); leg.position.set(side * 0.13, 0.72, 0); leg.name = 'leg';
      root.add(leg);
    }
    root.scale.setScalar(1.12);
    root.userData.muzzle = new THREE.Vector3(0.12, 0.92, 1.18);
    return root;
  });
}

// ------------------------------------------------------------------ custom (player-designed) units
const paintCache = new Map();
function paint(hex, rough = 0.55, metal = 0.35) {
  const k = hex + ':' + rough + ':' + metal;
  if (!paintCache.has(k)) paintCache.set(k, fogify(new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: rough, metalness: metal })));
  return paintCache.get(k);
}
const teamOr = (hex, fallback) => (!hex || hex === 'team' ? fallback : paint(hex));

export function makeCustomModel(d, faction, cache = true) {
  const build = () => (d.kind === 'vehicle' ? customVehicle(d, faction) : customInfantry(d, faction));
  if (!cache) return build();
  return cached(`custom-${faction}-${JSON.stringify(d)}`, build);
}

function customInfantry(d, faction) {
  const t = mats(faction), m = M();
  const root = new THREE.Group();
  const suit = teamOr(d.color, t.team), acc = teamOr(d.accent, t.teamDark);
  const b = new Builder();
  b.box(suit, 0.48, 0.56, 0.3, 0, 1.0, 0);
  b.box(acc, 0.52, 0.16, 0.33, 0, 0.77, 0);
  if (d.belly) b.sph(suit, 0.2, 0, 0.86, 0.05, 1.1, 0.75, 0.6);
  b.box(acc, 0.2, 0.08, 0.2, 0, 1.3, 0);
  b.sph(m.skin, 0.16, 0, 1.45, 0);
  const hg = d.headgear || 'helmet';
  if (hg === 'helmet') { b.add(new THREE.SphereGeometry(0.19, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), acc, 0, 1.48, 0); b.cyl(acc, 0.2, 0.21, 0.04, 14, 0, 1.48, 0); }
  else if (hg === 'cap') { b.add(new THREE.SphereGeometry(0.17, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), acc, 0, 1.52, 0); b.box(acc, 0.22, 0.03, 0.16, 0, 1.53, 0.14); }
  else if (hg === 'bandana') { b.add(new THREE.CylinderGeometry(0.168, 0.168, 0.07, 18, 1, true), acc, 0, 1.47, 0); b.box(acc, 0.05, 0.03, 0.3, 0.04, 1.42, -0.3, -0.6, 0.2, 0); }
  else if (hg === 'bobble') { b.cyl(acc, 0.17, 0.17, 0.1, 14, 0, 1.56, 0); b.cyl(m.lampWhite, 0.165, 0.165, 0.05, 14, 0, 1.62, 0); b.add(new THREE.ConeGeometry(0.16, 0.22, 14), acc, 0, 1.74, 0); b.sph(m.lampWhite, 0.06, 0, 1.87, 0); }
  else if (hg === 'beret') { b.sph(acc, 0.17, 0.03, 1.56, -0.01, 1.1, 0.35, 1.1); }
  else if (hg === 'hair') { b.add(new THREE.SphereGeometry(0.172, 16, 8, Math.PI * 0.62, Math.PI * 1.76, Math.PI * 0.22, Math.PI * 0.3), paint('#c27236', 0.9, 0), 0, 1.45, 0); }
  if (d.glasses) for (const s2 of [-1, 1]) { b.add(new THREE.TorusGeometry(0.05, 0.013, 6, 14), m.black, s2 * 0.064, 1.46, 0.165, 0, 0, 0, 1.15, 0.9, 1); }
  if (d.backpack) { b.box(m.cloth, 0.36, 0.34, 0.14, 0, 1.03, -0.22); b.cyl(m.gun, 0.02, 0.02, 0.5, 4, 0.12, 1.35, -0.25); }
  // arms
  b.box(suit, 0.12, 0.42, 0.12, 0.29, 1.05, 0.1, -0.7, 0, 0.1);
  b.box(suit, 0.12, 0.42, 0.12, -0.29, 1.05, 0.1, -0.9, 0, -0.1);
  b.sph(m.skin, 0.06, 0.24, 0.92, 0.32); b.sph(m.skin, 0.06, -0.2, 0.98, 0.35);
  const w = d.weapon || 'rifle';
  if (w === 'bazooka') { b.cyl(acc, 0.09, 0.09, 1.1, 12, 0.18, 1.3, 0.05, Math.PI / 2, 0, 0); b.cyl(m.darkMetal, 0.11, 0.09, 0.15, 12, 0.18, 1.3, 0.6, Math.PI / 2, 0, 0); }
  else if (w === 'flamer') { b.cyl(m.lampRed, 0.08, 0.08, 0.5, 10, 0.1, 1.05, -0.28); b.cyl(m.lampRed, 0.08, 0.08, 0.5, 10, -0.1, 1.05, -0.28); b.cyl(m.gun, 0.05, 0.06, 0.7, 10, 0.05, 0.98, 0.45, Math.PI / 2, 0, 0); }
  else if (w !== 'gatling') { const L = w === 'sniper' ? 1.0 : 0.7; b.box(m.gun, 0.07, 0.12, L, 0.05, 1.0, 0.3 + L / 2 - 0.2); b.box(m.gun, 0.05, 0.16, 0.08, 0.05, 0.9, 0.3); if (w === 'sniper') b.cyl(m.gun, 0.05, 0.05, 0.3, 8, 0.05, 1.12, 0.4, Math.PI / 2, 0, 0); }
  root.add(b.build());
  if (w === 'gatling') {
    const gb = new Builder();
    gb.add(new THREE.CylinderGeometry(0.075, 0.085, 0.36, 12), m.gun, 0, 0, 0, Math.PI / 2, 0, 0);
    gb.box(m.hazard, 0.16, 0.14, 0.16, 0.13, -0.08, -0.05);
    const gun = gb.build(); gun.position.set(0.1, 0.95, 0.42); gun.name = 'gatling';
    const bb = new Builder();
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; bb.cyl(m.gun, 0.016, 0.016, 0.62, 6, Math.cos(a) * 0.045, Math.sin(a) * 0.045, 0.31, Math.PI / 2, 0, 0); }
    const barrels = bb.build(); barrels.position.set(0, 0, 0.12); barrels.name = 'barrels';
    gun.add(barrels); root.add(gun);
  }
  if (d.cape) {
    const g = new THREE.PlaneGeometry(0.46, 0.78, 6, 8); const cp = g.attributes.position;
    for (let i = 0; i < cp.count; i++) { const px = cp.getX(i), py = cp.getY(i), tt = (0.39 - py) / 0.78; cp.setX(i, px * (1 + tt * 0.4)); cp.setZ(i, -Math.cos(px * 4) * 0.06 * (0.4 + tt) - tt * 0.08); }
    g.translate(0, -0.39, 0); g.computeVertexNormals();
    const capeMat = fogify(new THREE.MeshStandardMaterial({ color: new THREE.Color(d.capeColor || '#e0461c'), roughness: 0.75, side: THREE.DoubleSide }));
    const cape = new THREE.Mesh(g, capeMat); cape.castShadow = true; cape.position.set(0, 1.32, -0.17); cape.rotation.x = 0.12; cape.name = 'cape';
    root.add(cape);
  }
  for (const side of [-1, 1]) {
    const lb = new Builder();
    lb.box(acc, 0.16, 0.5, 0.18, 0, -0.25, 0);
    lb.box(m.black, 0.18, 0.12, 0.26, 0, -0.52, 0.04);
    const leg = lb.build(); leg.position.set(side * 0.12, 0.72, 0); leg.name = 'leg';
    root.add(leg);
  }
  const sc = d.armor >= 4 ? 1.12 : 1.0;
  root.scale.setScalar(sc);
  root.userData.muzzle = w === 'gatling' ? new THREE.Vector3(0.1, 0.95, 1.18) : new THREE.Vector3(0.05, w === 'bazooka' ? 1.3 : 1.05, 1.0);
  return root;
}

function customVehicle(d, faction) {
  const t = mats(faction), m = M();
  const root = new THREE.Group();
  const body = teamOr(d.color, t.team), acc = teamOr(d.accent, t.teamDark);
  const b = new Builder();
  const ch = d.chassis || 'tracks';
  let lift = 0;
  if (ch === 'tracks') {
    trackUnit(b, -1, 3.3, 0.7, 0.62, 0.38, faction); trackUnit(b, 1, 3.3, 0.7, 0.62, 0.38, faction);
  } else if (ch === 'wheels') {
    for (const z of [1.1, 0, -1.1]) for (const x of [-0.95, 0.95]) wheel(b, m.metal, x, 0.45, z, 0.45, 0.34);
    b.box(acc, 2.1, 0.08, 3.3, 0, 0.98, 0);
  } else { // hover
    lift = 0.35;
    for (const [x, z] of [[-0.85, 1.1], [0.85, 1.1], [-0.85, -1.1], [0.85, -1.1]]) { b.cyl(m.darkMetal, 0.42, 0.48, 0.25, 14, x, 0.42, z); b.cyl(m.energy, 0.32, 0.32, 0.04, 14, x, 0.29, z); }
    b.box(acc, 1.9, 0.18, 3.2, 0, 0.7, 0);
  }
  b.box(body, 1.5, 0.45, 3.1, 0, 0.82 + lift, 0);
  b.add(new THREE.BoxGeometry(1.5, 0.42, 0.7), body, 0, 0.74 + lift, 1.7, -0.6, 0, 0);
  b.add(new THREE.BoxGeometry(1.5, 0.32, 0.5), acc, 0, 0.77 + lift, -1.68, 0.5, 0, 0);
  b.box(acc, 1.52, 0.1, 0.5, 0, 1.06 + lift, 0.4);
  b.box(m.darkMetal, 0.8, 0.12, 0.8, 0, 1.1 + lift, -1.0);
  b.box(m.lampWhite, 0.18, 0.1, 0.05, 0.55, 0.92 + lift, 1.66); b.box(m.lampWhite, 0.18, 0.1, 0.05, -0.55, 0.92 + lift, 1.66);
  b.cyl(m.darkMetal, 0.08, 0.08, 0.35, 8, 0.7, 1.15 + lift, -1.5);
  if (d.weapon === 'inferno') for (const s2 of [-0.45, 0.45]) b.add(new THREE.CylinderGeometry(0.34, 0.34, 1.5, 14), m.lampRed, s2, 1.45 + lift, -0.8, Math.PI / 2, 0, 0);
  root.add(b.build());
  const tb = new Builder();
  const w = d.weapon || 'cannon';
  let muzzle = new THREE.Vector3(0, 0.05, 2.6), muzzle2 = null, barrelObj = null;
  if (w === 'cannon' || w === 'twin') {
    tb.add(new THREE.CylinderGeometry(0.7, 0.88, 0.48, 8), body, 0, 0, 0, 0, Math.PI / 8, 0);
    tb.box(body, 1.2, 0.4, 1.0, 0, 0, -0.45); tb.box(m.darkMetal, 0.4, 0.35, 0.4, 0, 0, 0.7);
    const xs = w === 'twin' ? [-0.22, 0.22] : [0];
    for (const x of xs) { tb.cyl(m.gun, 0.11, 0.13, 2.2, 12, x, 0.02, 1.8, Math.PI / 2, 0, 0); tb.cyl(m.gun, 0.15, 0.15, 0.25, 12, x, 0.02, 2.85, Math.PI / 2, 0, 0); }
    muzzle = new THREE.Vector3(xs[xs.length - 1], 0.02, 3.0); if (w === 'twin') muzzle2 = new THREE.Vector3(-0.22, 0.02, 3.0);
  } else if (w === 'mg' || w === 'gatling') {
    tb.cyl(m.darkMetal, 0.32, 0.4, 0.35, 10, 0, 0, 0);
    tb.box(acc, 0.7, 0.4, 0.06, 0, 0.15, 0.25);
    tb.box(m.gun, 0.2, 0.2, 0.6, 0, 0.12, 0.45);
    if (w === 'mg') { tb.cyl(m.gun, 0.05, 0.05, 1.0, 8, 0, 0.14, 1.2, Math.PI / 2, 0, 0); muzzle = new THREE.Vector3(0, 0.14, 1.7); }
    else muzzle = new THREE.Vector3(0, 0.12, 1.95);
  } else if (w === 'rocketPod') {
    tb.box(acc, 0.9, 0.3, 0.9, 0, 0, 0);
    for (const x of [-0.5, 0.5]) { tb.box(body, 0.55, 0.55, 1.2, x, 0.3, 0.1, -0.25, 0, 0); for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) tb.cyl(m.lampRed, 0.08, 0.08, 0.04, 8, x + (c - 0.5) * 0.22, 0.42 + (r - 0.5) * 0.22, 0.72, Math.PI / 2 - 0.25, 0, 0); }
    muzzle = new THREE.Vector3(0.5, 0.45, 0.8); muzzle2 = new THREE.Vector3(-0.5, 0.45, 0.8);
  } else if (w === 'inferno') {
    tb.add(new THREE.CylinderGeometry(0.55, 0.7, 0.45, 8), acc, 0, 0, 0);
    tb.cyl(m.gun, 0.12, 0.16, 1.5, 10, 0, 0.05, 1.2, Math.PI / 2, 0, 0); tb.sph(m.lampRed, 0.06, 0, 0.05, 1.98);
    muzzle = new THREE.Vector3(0, 0.05, 2.0);
  } else if (w === 'arty') {
    tb.box(body, 1.1, 0.55, 1.2, 0, 0, 0);
  }
  const tur = tb.build(); tur.position.set(0, 1.35 + lift, -0.1); tur.name = 'turret';
  if (w === 'gatling') {
    const bb = new Builder();
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; bb.cyl(m.gun, 0.04, 0.04, 1.3, 6, Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0.65, Math.PI / 2, 0, 0); }
    bb.add(new THREE.TorusGeometry(0.12, 0.025, 5, 14), m.darkMetal, 0, 0, 1.05);
    const barrels = bb.build(); barrels.position.set(0, 0.12, 0.6); barrels.name = 'barrels';
    tur.add(barrels);
  }
  if (w === 'arty') {
    const ab = new Builder();
    ab.box(m.darkMetal, 0.5, 0.45, 0.6, 0, 0.1, 0.5);
    ab.cyl(m.gun, 0.14, 0.18, 3.2, 12, 0, 0.15, 2.2, Math.PI / 2, 0, 0);
    ab.cyl(m.gun, 0.22, 0.22, 0.4, 12, 0, 0.15, 3.7, Math.PI / 2, 0, 0);
    barrelObj = ab.build(); barrelObj.name = 'barrel'; barrelObj.rotation.x = -0.45;
    tur.add(barrelObj);
    muzzle = new THREE.Vector3(0, 0.15, 3.9);
  }
  root.add(tur);
  const sc = { light: 0.8, medium: 1, heavy: 1.28 }[d.size || 'medium'];
  root.scale.setScalar(sc);
  root.userData.muzzle = muzzle;
  if (muzzle2) root.userData.muzzle2 = muzzle2;
  return root;
}

export function makeAPC(faction) {
  return cached(`apc-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const b = new Builder();
    for (const z of [1.15, 0.38, -0.38, -1.15]) for (const x of [-0.92, 0.92]) wheel(b, m.metal, x, 0.45, z, 0.44, 0.32);
    b.box(t.team, 1.6, 0.8, 3.4, 0, 1.05, 0);                        // armoured box
    b.add(new THREE.BoxGeometry(1.6, 0.7, 0.9), t.team, 0, 1.0, 1.85, -0.75, 0, 0); // sloped nose
    b.add(new THREE.BoxGeometry(1.5, 0.12, 3.2), t.teamDark, 0, 1.5, -0.05);
    for (const s of [-1, 1]) {
      b.add(new THREE.BoxGeometry(0.1, 0.55, 3.0), t.teamDark, s * 0.84, 1.1, 0, 0, 0, s * 0.18);   // sloped side armour
      for (let i = 0; i < 3; i++) b.box(m.glass, 0.04, 0.16, 0.3, s * 0.86, 1.2, -0.9 + i * 0.7); // firing ports
      b.box(m.darkMetal, 0.06, 0.12, 2.8, s * 0.95, 0.7, 0);                                       // fender
    }
    b.box(m.glass, 1.1, 0.25, 0.04, 0, 1.3, 2.18, -0.75, 0, 0);          // driver's visor
    b.box(m.darkMetal, 1.3, 0.75, 0.08, 0, 0.95, -1.72);                  // rear ramp
    b.box(m.hazard, 1.3, 0.08, 0.1, 0, 0.6, -1.76);
    b.box(m.lampWhite, 0.16, 0.1, 0.05, 0.55, 0.95, 2.2); b.box(m.lampWhite, 0.16, 0.1, 0.05, -0.55, 0.95, 2.2);
    b.box(m.lampRed, 0.12, 0.08, 0.04, 0.6, 1.2, -1.77); b.box(m.lampRed, 0.12, 0.08, 0.04, -0.6, 1.2, -1.77);
    b.box(m.metal, 0.35, 0.18, 0.5, -0.45, 1.62, -0.9);                   // hatch
    b.cyl(m.gun, 0.03, 0.03, 1.0, 5, 0.6, 2.0, -1.2);                     // antenna
    b.box(t.accent, 0.5, 0.3, 0.02, 0.85, 1.1, 0.9, 0, Math.PI / 2, 0);   // faction plate
    root.add(b.build());
    const g = new Builder();
    g.cyl(m.darkMetal, 0.3, 0.36, 0.25, 10, 0, 0, 0);
    g.box(m.gun, 0.18, 0.18, 0.45, 0, 0.12, 0.2);
    g.cyl(m.gun, 0.045, 0.045, 0.8, 8, 0, 0.14, 0.75, Math.PI / 2, 0, 0);
    g.box(t.teamDark, 0.55, 0.3, 0.05, 0, 0.2, 0.05);
    const tur = g.build(); tur.position.set(0.25, 1.7, 0.6); tur.name = 'turret';
    root.add(tur);
    root.userData.muzzle = new THREE.Vector3(0, 0.14, 1.15);
    return root;
  });
}

export function makeUnitModel(type, faction) {
  switch (type) {
    case 'tank': return makeTank(faction);
    case 'titan': return makeTitan(faction);
    case 'buggy': return makeBuggy(faction);
    case 'harvester': return makeHarvester(faction);
    case 'apc': return makeAPC(faction);
    case 'arty': return makeArtillery(faction);
    case 'gunship': return makeGunship(faction);
    case 'repair': return makeRepairTruck(faction);
    case 'hover': return makeHovercraft(faction);
    case 'drone': return makeDrone(faction);
    case 'hauler': return makeHauler(faction);
    case 'jet': return makeJet(faction);
    case 'stealth': return makeStealth(faction);
    case 'inferno': return makeInferno(faction);
    case 'wallyman': return makeWallyMan(faction);
    case 'dog': return makeDog(faction);
    case 'freezetank': return makeFreezeTank(faction);
    case 'icecream': return makeIceCreamVan();
    case 'dragon': { const d = makeWyvern('neutral', 0x8a1a12); d.scale.setScalar(2.6); return d; }
    case 'haggis': return makeHaggis();
    case 'medevac': return makeMedevac(faction);
    case 'burrower': return makeBurrower(faction);
    case 'catapult': return makeCatapult(faction);
    case 'shieldgen': return makeShieldGen(faction);
    case 'mech': return makeMech(faction);
    case 'troll': return makeTroll(faction);
    case 'convoy': return makeConvoy();
    case 'wyvern': return makeWyvern(faction);
    case 'teslatruck': return makeTeslaTruck(faction);
    case 'warlord': return makeWarlord(faction);
    default: return type.startsWith('custom_') ? makeCustomModel(UNITS[type].design, faction) : makeInfantry(type, faction);
  }
}

// ------------------------------------------------------------------ buildings
function foundation(b, w, d, h = 0.4) {
  const m = M();
  b.box(m.concrete, w, h, d, 0, h / 2 - 0.15, 0);
  b.box(m.concreteDark, w + 0.3, 0.2, d + 0.3, 0, -0.05, 0);
}
function pipes(b, x, y, z, len, axis = 'x', n = 2) {
  const m = M();
  for (let i = 0; i < n; i++) {
    if (axis === 'x') b.add(new THREE.CylinderGeometry(0.12, 0.12, len, 8), m.metal, x, y + i * 0.3, z, 0, 0, Math.PI / 2);
    else b.add(new THREE.CylinderGeometry(0.12, 0.12, len, 8), m.metal, x, y + i * 0.3, z, Math.PI / 2, 0, 0);
  }
}
function lamps(b, pts, mat) { for (const [x, y, z] of pts) b.add(new THREE.SphereGeometry(0.1, 8, 6), mat, x, y, z); }

export function makeBuildingModel(type, faction) {
  return cached(`bld-${type}-${faction}`, () => {
    const t = mats(faction), m = M();
    const root = new THREE.Group();
    const b = new Builder();
    const W = { tesla: 1, flametower: 1, house: 2, tesla: 1, flametower: 1, house: 2, xbarrel: 1, wonder: 3, bunker: 2, conyard: 4, power: 3, refinery: 4, barracks: 3, factory: 4, radar: 3, tech: 3, helipad: 3, turret: 1, sam: 2, plasma: 1, uplink: 3, silo: 3, wall: 1, gate: 2, mine: 1, derrick: 2, hospital: 2, depot: 2 };
    const D = { xbarrel: 1, wonder: 3, bunker: 2, conyard: 4, power: 3, refinery: 3, barracks: 3, factory: 4, radar: 3, tech: 3, helipad: 3, turret: 1, sam: 2, plasma: 1, uplink: 3, silo: 3, wall: 1, gate: 1, mine: 1, derrick: 2, hospital: 2, depot: 2 };
    const w = W[type] * CELL - 0.3, d = D[type] * CELL - 0.3;
    const parts = {};
    switch (type) {
      case 'conyard': {
        foundation(b, w, d);
        b.box(t.team, 5.2, 2.6, 4.6, -0.6, 1.55, -0.5);
        b.box(t.teamDark, 5.4, 0.25, 4.8, -0.6, 2.9, -0.5);
        b.box(m.windows, 5.22, 0.6, 0.02, -0.6, 2.0, 1.82);
        b.box(m.concreteDark, 2.2, 3.6, 2.2, 2.3, 1.9, -2.0);
        b.box(t.accent, 2.25, 0.3, 2.25, 2.3, 3.3, -2.0);
        b.box(m.windows, 0.02, 0.5, 2.0, 3.41, 2.6, -2.0);
        b.box(m.hazard, 3.0, 0.08, 0.6, -1.5, 0.3, 3.0);
        b.box(m.darkMetal, 2.8, 2.2, 0.2, -1.5, 1.3, 1.95);   // big door
        for (let i = 0; i < 6; i++) b.box(m.metal, 2.8, 0.05, 0.05, -1.5, 0.4 + i * 0.35, 2.06);
        pipes(b, 1.5, 0.6, 2.8, 2.5, 'x', 2);
        b.cyl(m.metal, 0.6, 0.6, 1.4, 14, -2.8, 3.6, -1.5); // tank
        b.sph(m.metal, 0.6, -2.8, 4.3, -1.5, 1, 0.5, 1);
        b.cyl(m.gun, 0.05, 0.05, 2.5, 6, 2.8, 4.9, -2.6);
        lamps(b, [[2.8, 6.15, -2.6], [-3.2, 3.05, 1.7], [2.0, 3.05, 1.7]], m.lampRed);
        // construction crane (animated)
        const cb = new Builder();
        cb.cyl(m.hazard, 0.25, 0.3, 4.6, 8, 0, 2.3, 0);
        cb.box(m.hazard, 0.35, 0.35, 5.5, 0, 4.7, 1.5);
        cb.box(m.darkMetal, 0.6, 0.6, 0.8, 0, 4.7, -1.3);
        cb.cyl(m.gun, 0.02, 0.02, 2.4, 4, 0, 3.4, 3.9);
        cb.box(m.darkMetal, 0.3, 0.3, 0.3, 0, 2.2, 3.9);
        cb.box(m.glass, 0.5, 0.4, 0.5, 0.35, 4.5, -0.1);
        const crane = cb.build(); crane.position.set(2.3, 3.4, -2.0); crane.name = 'crane';
        parts.crane = crane;
        break;
      }
      case 'power': {
        foundation(b, w, d);
        b.box(t.teamDark, 4.0, 1.4, 2.0, 0, 0.9, 1.5);
        b.box(m.windows, 3.6, 0.35, 0.02, 0, 1.2, 2.51);
        for (const [x, z] of [[-1.4, -1.0], [1.4, -1.0]]) {
          b.cyl(m.concrete, 1.0, 1.3, 3.8, 18, x, 2.0, z);
          b.cyl(t.team, 1.02, 1.02, 0.4, 18, x, 3.0, z);
          b.cyl(m.concreteDark, 0.9, 1.0, 0.3, 18, x, 4.0, z);
        }
        b.box(m.hazard, 4.6, 0.2, 0.2, 0, 0.3, 2.65);
        // transformer & energy coils
        for (let i = 0; i < 3; i++) { b.cyl(m.darkMetal, 0.25, 0.25, 0.9, 10, -1.2 + i * 1.2, 2.0, 1.5); b.add(new THREE.TorusGeometry(0.28, 0.06, 6, 14), m.metal, -1.2 + i * 1.2, 2.2, 1.5, Math.PI / 2, 0, 0); b.add(new THREE.TorusGeometry(0.28, 0.06, 6, 14), m.metal, -1.2 + i * 1.2, 1.9, 1.5, Math.PI / 2, 0, 0); }
        b.add(new THREE.SphereGeometry(0.22, 10, 8), m.energy, -1.2, 2.55, 1.5); b.add(new THREE.SphereGeometry(0.22, 10, 8), m.energy, 0, 2.55, 1.5); b.add(new THREE.SphereGeometry(0.22, 10, 8), m.energy, 1.2, 2.55, 1.5);
        pipes(b, 0, 1.0, -1.0, 2.0, 'x', 2);
        lamps(b, [[-1.4, 4.2, -1.0], [1.4, 4.2, -1.0]], m.lampRed);
        parts.steam = [new THREE.Vector3(-1.4, 4.2, -1.0), new THREE.Vector3(1.4, 4.2, -1.0)];
        break;
      }
      case 'refinery': {
        foundation(b, w, d);
        b.box(t.team, 4.0, 2.4, 2.8, -1.8, 1.4, -0.9);
        b.box(t.teamDark, 4.2, 0.25, 3.0, -1.8, 2.7, -0.9);
        b.box(m.windows, 0.02, 0.5, 2.4, 0.21, 2.0, -0.9);
        for (let i = 0; i < 3; i++) { b.cyl(m.metal, 0.7, 0.7, 3.0, 16, 1.2 + i * 1.5 - 1.5, 1.7, -1.6 + 0 * i); }
        b.cyl(m.metal, 0.7, 0.7, 3.0, 16, 2.7, 1.7, -1.6);
        for (const x of [-0.3, 1.2, 2.7]) { b.sph(m.metal, 0.7, x, 3.2, -1.6, 1, 0.45, 1); b.add(new THREE.TorusGeometry(0.72, 0.06, 6, 18), t.accent, x, 2.4, -1.6, Math.PI / 2, 0, 0); }
        // dock pad
        b.box(m.concreteDark, 3.4, 0.25, 2.8, 1.8, 0.2, 1.3);
        b.box(m.hazard, 3.4, 0.05, 0.25, 1.8, 0.35, 2.6); b.box(m.hazard, 3.4, 0.05, 0.25, 1.8, 0.35, 0.0);
        b.box(m.darkMetal, 0.4, 1.5, 0.4, 0.2, 1.0, 1.3); b.box(m.darkMetal, 1.8, 0.3, 0.4, 1.0, 1.75, 1.3); // unload arm
        b.add(new THREE.ConeGeometry(0.5, 0.8, 8), m.darkMetal, 1.8, 1.4, 1.3, Math.PI, 0, 0);
        pipes(b, -0.3, 1.1, 0.7, 3.8, 'x', 2);
        b.cyl(m.darkMetal, 0.2, 0.25, 4.4, 10, -3.2, 2.2, -2.0);
        b.add(new THREE.SphereGeometry(0.6, 12, 8), M().crystal, -1.8, 3.2, -0.9);
        lamps(b, [[-3.2, 4.5, -2.0]], m.lampRed);
        parts.steam = [new THREE.Vector3(-3.2, 4.5, -2.0)];
        break;
      }
      case 'barracks': {
        foundation(b, w, d);
        b.box(t.team, 4.4, 1.9, 3.2, 0, 1.15, -0.6);
        // quonset roof
        b.add(new THREE.CylinderGeometry(1.6, 1.6, 4.5, 16, 1, false, 0, Math.PI), t.teamDark, 0, 2.1, -0.6, 0, 0, Math.PI / 2);
        b.box(m.darkMetal, 1.4, 1.5, 0.2, 0, 0.95, 1.05);
        b.box(m.windows, 0.9, 0.35, 0.02, -1.5, 1.6, 1.01); b.box(m.windows, 0.9, 0.35, 0.02, 1.5, 1.6, 1.01);
        // sandbags
        for (let i = 0; i < 9; i++) b.add(new THREE.CapsuleGeometry(0.18, 0.4, 4, 8), m.sand, -2.0 + i * 0.5, 0.35, 2.1, 0, 0, Math.PI / 2);
        for (let i = 0; i < 8; i++) b.add(new THREE.CapsuleGeometry(0.18, 0.4, 4, 8), m.sand, -1.75 + i * 0.5, 0.65, 2.1, 0, 0, Math.PI / 2);
        b.cyl(m.gun, 0.04, 0.04, 3.4, 6, 2.0, 2.0, 1.8);
        b.box(t.accent, 0.9, 0.55, 0.02, 2.47, 3.3, 1.8); // flag
        b.box(m.wood, 0.8, 0.5, 0.6, -2.0, 0.55, 1.4);
        lamps(b, [[0, 1.85, 1.2]], m.lampWhite);
        parts.flag = true;
        break;
      }
      case 'factory': {
        foundation(b, w, d);
        b.box(t.team, 7.2, 3.4, 5.0, 0, 1.9, -1.2);
        b.add(new THREE.BoxGeometry(7.3, 0.25, 2.8), t.teamDark, 0, 4.0, -2.2, 0.35, 0, 0);
        b.add(new THREE.BoxGeometry(7.3, 0.25, 2.8), t.teamDark, 0, 4.0, -0.0, -0.35, 0, 0);
        for (let i = 0; i < 3; i++) b.box(m.glass, 0.9, 0.05, 2.0, -2.4 + i * 2.4, 4.25, -2.2, 0.35, 0, 0);
        b.box(m.darkMetal, 3.6, 2.8, 0.3, 0, 1.55, 1.35); // bay door frame
        b.box(m.black, 3.2, 2.5, 0.1, 0, 1.4, 1.48);
        b.box(m.hazard, 3.8, 0.3, 0.32, 0, 3.05, 1.36);
        b.box(m.hazard, 0.25, 2.8, 0.32, 1.95, 1.55, 1.36); b.box(m.hazard, 0.25, 2.8, 0.32, -1.95, 1.55, 1.36);
        b.box(m.concreteDark, 3.6, 0.15, 2.4, 0, 0.15, 2.6); // ramp
        b.box(m.windows, 1.6, 0.5, 0.02, -2.8, 2.6, 1.31); b.box(m.windows, 1.6, 0.5, 0.02, 2.8, 2.6, 1.31);
        b.cyl(m.darkMetal, 0.3, 0.35, 2.5, 10, 3.0, 4.5, -3.0); b.cyl(m.darkMetal, 0.3, 0.35, 2.5, 10, 2.2, 4.5, -3.0);
        pipes(b, -3.65, 0.8, -1.2, 4.6, 'z', 3);
        lamps(b, [[1.95, 3.3, 1.5], [-1.95, 3.3, 1.5]], m.lampWhite);
        // animated door
        const db = new Builder();
        db.box(m.metal, 3.15, 2.45, 0.08, 0, 0, 0);
        for (let i = 0; i < 8; i++) db.box(m.darkMetal, 3.15, 0.04, 0.1, 0, -1.1 + i * 0.3, 0.02);
        const door = db.build(); door.position.set(0, 1.4, 1.5); door.name = 'door';
        parts.door = door;
        parts.steam = [new THREE.Vector3(3.0, 5.8, -3.0), new THREE.Vector3(2.2, 5.8, -3.0)];
        break;
      }
      case 'radar': {
        foundation(b, w, d);
        b.box(t.team, 3.6, 1.8, 3.6, 0, 1.1, 0);
        b.box(t.teamDark, 3.8, 0.2, 3.8, 0, 2.05, 0);
        b.box(m.windows, 3.62, 0.4, 0.02, 0, 1.4, 1.81);
        b.cyl(m.darkMetal, 0.5, 0.7, 1.2, 12, 0, 2.7, 0);
        for (let i = 0; i < 4; i++) b.cyl(m.gun, 0.03, 0.03, 1.6, 4, 1.5 * (i % 2 ? 1 : -1), 2.9, 1.5 * (i < 2 ? 1 : -1));
        lamps(b, [[1.5, 3.7, 1.5], [-1.5, 3.7, 1.5], [1.5, 3.7, -1.5], [-1.5, 3.7, -1.5]], m.lampRed);
        const db = new Builder();
        db.add(new THREE.SphereGeometry(1.6, 20, 10, 0, Math.PI * 2, 0, Math.PI / 3.2), m.metal, 0, -1.0, 0, 0, 0, 0, 1, 1, 1);
        db.cyl(m.gun, 0.05, 0.05, 1.2, 6, 0, 0.0, 0.5, Math.PI / 3, 0, 0);
        db.sph(m.lampWhite, 0.1, 0, 0.4, 1.0);
        db.box(m.darkMetal, 0.3, 0.6, 0.3, 0, -0.5, 0);
        const dish = db.build(); dish.position.set(0, 3.8, 0); dish.rotation.x = 0.6;
        const dishRoot = new THREE.Group(); dishRoot.position.set(0, 0, 0); dishRoot.name = 'dish'; dishRoot.add(dish);
        parts.dish = dishRoot;
        break;
      }
      case 'tech': {
        foundation(b, w, d);
        b.cyl(t.team, 2.3, 2.6, 2.4, 8, 0, 1.4, 0, 0, Math.PI / 8, 0);
        b.cyl(t.teamDark, 2.0, 2.3, 0.3, 8, 0, 2.75, 0, 0, Math.PI / 8, 0);
        b.add(new THREE.SphereGeometry(1.7, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), m.glass, 0, 2.85, 0);
        b.box(m.windows, 1.5, 0.4, 0.02, 0, 1.6, 2.42);
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; b.cyl(m.metal, 0.15, 0.15, 3.6, 8, Math.cos(a) * 2.2, 1.8, Math.sin(a) * 2.2); b.add(new THREE.SphereGeometry(0.22, 10, 8), m.energy, Math.cos(a) * 2.2, 3.7, Math.sin(a) * 2.2); }
        const cb = new Builder();
        cb.add(new THREE.TorusKnotGeometry(0.55, 0.12, 64, 8), m.energy, 0, 0, 0);
        const core = cb.build(false); core.position.set(0, 3.4, 0); core.name = 'core';
        parts.core = core;
        break;
      }
      case 'helipad': {
        foundation(b, w, d, 0.3);
        b.cyl(m.concreteDark, 2.6, 2.6, 0.12, 24, 0, 0.22, 0);
        b.add(new THREE.TorusGeometry(2.2, 0.08, 6, 32), m.hazard, 0, 0.3, 0, Math.PI / 2, 0, 0);
        b.box(m.lampWhite, 0.25, 0.04, 1.8, -0.55, 0.3, 0); b.box(m.lampWhite, 0.25, 0.04, 1.8, 0.55, 0.3, 0); b.box(m.lampWhite, 1.1, 0.04, 0.25, 0, 0.3, 0);
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b.sph(i % 2 ? m.lampGreen : m.lampRed, 0.09, Math.cos(a) * 2.6, 0.35, Math.sin(a) * 2.6); }
        b.box(t.team, 1.1, 1.6, 1.1, 2.3, 0.9, -2.3); b.box(m.windows, 1.12, 0.35, 0.02, 2.3, 1.3, -1.74);
        b.cyl(m.gun, 0.03, 0.03, 1.6, 4, 2.3, 2.5, -2.3);
        b.box(m.lampRed, 0.5, 0.3, 0.02, 2.55, 3.1, -2.3); // windsock
        break;
      }
      case 'turret': {
        b.cyl(m.concreteDark, 0.95, 1.05, 0.5, 10, 0, 0.1, 0);
        b.cyl(m.concrete, 0.8, 0.95, 0.9, 10, 0, 0.7, 0);
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; b.add(new THREE.CapsuleGeometry(0.14, 0.3, 4, 6), m.sand, Math.cos(a) * 1.0, 0.25, Math.sin(a) * 1.0, 0, -a, Math.PI / 2); }
        const tb = new Builder();
        tb.sph(t.team, 0.62, 0, 0, 0, 1, 0.7, 1.1);
        tb.box(t.teamDark, 0.9, 0.2, 1.0, 0, -0.15, 0);
        tb.box(m.darkMetal, 0.35, 0.35, 0.3, 0, 0.0, 0.6);
        tb.cyl(m.gun, 0.08, 0.1, 1.6, 10, 0, 0.0, 1.4, Math.PI / 2, 0, 0);
        tb.cyl(m.gun, 0.12, 0.12, 0.2, 10, 0, 0.0, 2.15, Math.PI / 2, 0, 0);
        tb.box(m.glass, 0.25, 0.1, 0.05, 0.25, 0.3, 0.45);
        const tur = tb.build(); tur.position.set(0, 1.45, 0); tur.name = 'turret';
        parts.turret = tur; parts.muzzle = new THREE.Vector3(0, 0, 2.25);
        break;
      }
      case 'sam': {
        foundation(b, w, d, 0.3);
        b.box(m.concreteDark, 2.8, 0.6, 2.8, 0, 0.45, 0);
        b.box(m.hazard, 2.85, 0.1, 2.85, 0, 0.8, 0);
        b.cyl(m.darkMetal, 0.5, 0.6, 0.6, 12, 0, 1.0, 0);
        const tb = new Builder();
        tb.box(t.team, 0.8, 0.5, 0.8, 0, 0, 0);
        for (const s of [-1, 1]) {
          tb.box(t.teamDark, 0.6, 0.7, 1.8, s * 0.75, 0.35, 0.2, -0.5, 0, 0);
          for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) tb.cyl(m.lampRed, 0.1, 0.1, 0.05, 8, s * 0.75 + (c - 0.5) * 0.25, 0.65 + r * 0.25 - 0.1 + 0.35, 1.05, Math.PI / 2 - 0.5, 0, 0);
        }
        tb.box(m.darkMetal, 0.2, 0.6, 0.2, 0, 0.5, -0.3);
        tb.add(new THREE.CircleGeometry(0.35, 12), m.metal, 0, 0.9, -0.3, -0.4, 0, 0);
        const tur = tb.build(); tur.position.set(0, 1.5, 0); tur.name = 'turret';
        parts.turret = tur; parts.muzzle = new THREE.Vector3(0.75, 0.8, 1.1); parts.muzzle2 = new THREE.Vector3(-0.75, 0.8, 1.1);
        break;
      }
      case 'uplink': {
        foundation(b, w, d);
        b.box(t.teamDark, 4.6, 1.2, 4.6, 0, 0.8, 0);
        b.box(m.windows, 4.62, 0.3, 0.02, 0, 0.9, 2.31);
        // lattice tower
        for (const [x, z] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) b.cyl(m.metal, 0.1, 0.14, 4.2, 6, x * 0.8, 3.4, z * 0.8, z * 0.08, 0, -x * 0.08);
        for (let i = 0; i < 4; i++) b.box(m.metal, 1.6 - i * 0.2, 0.06, 1.6 - i * 0.2, 0, 1.9 + i * 0.9, 0);
        b.cyl(t.team, 0.5, 0.6, 0.6, 12, 0, 5.4, 0);
        b.box(m.hazard, 4.7, 0.1, 0.25, 0, 1.45, 2.2);
        lamps(b, [[2.2, 1.55, 2.2], [-2.2, 1.55, 2.2], [2.2, 1.55, -2.2], [-2.2, 1.55, -2.2]], m.lampRed);
        const db = new Builder();
        db.add(new THREE.SphereGeometry(2.0, 24, 10, 0, Math.PI * 2, 0, Math.PI / 3.4), m.metal, 0, -1.2, 0);
        db.add(new THREE.TorusGeometry(1.25, 0.08, 6, 28), t.accent, 0, -0.45, 0, Math.PI / 2, 0, 0);
        for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; db.cyl(m.gun, 0.04, 0.04, 1.9, 5, Math.cos(a) * 0.55, 0.3, Math.sin(a) * 0.55, Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45); }
        db.add(new THREE.IcosahedronGeometry(0.28, 1), m.energy, 0, 1.15, 0);
        const dish = db.build(); dish.position.set(0, 6.0, 0); dish.rotation.x = -0.5;
        const dr = new THREE.Group(); dr.name = 'dish'; dr.add(dish);
        parts.dish = dr;
        const cb = new Builder(); cb.add(new THREE.OctahedronGeometry(0.35, 0), m.energy, 0, 0, 0);
        const core = cb.build(false); core.position.set(0, 3.4, 0); core.name = 'core';
        parts.core = core; parts.coreY = 3.4;
        break;
      }
      case 'silo': {
        foundation(b, w, d);
        b.box(m.concreteDark, 5.0, 0.9, 5.0, 0, 0.6, 0);
        b.box(m.hazard, 5.05, 0.12, 5.05, 0, 1.05, 0);
        b.box(m.black, 3.0, 0.1, 3.0, 0, 1.06, 0);
        b.box(t.teamDark, 1.0, 1.6, 1.0, 2.0, 1.6, -2.0); b.box(m.windows, 0.02, 0.3, 0.8, 1.49, 2.0, -2.0);
        b.cyl(m.gun, 0.04, 0.04, 1.8, 5, 2.0, 3.2, -2.0);
        lamps(b, [[2.0, 4.15, -2.0], [-2.3, 1.2, 2.3], [2.3, 1.2, 2.3], [-2.3, 1.2, -2.3]], m.lampRed);
        // the missile (rises when ready)
        const mb = new Builder();
        mb.cyl(m.metal, 0.42, 0.42, 3.4, 16, 0, 1.7, 0);
        mb.add(new THREE.ConeGeometry(0.42, 1.2, 16), m.lampRed, 0, 4.0, 0);
        mb.add(new THREE.TorusGeometry(0.43, 0.04, 6, 16), m.black, 0, 2.6, 0, Math.PI / 2, 0, 0);
        mb.box(m.hazard, 0.86, 0.3, 0.86, 0, 1.2, 0);
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; mb.box(t.team, 0.05, 0.8, 0.5, Math.cos(a) * 0.45, 0.4, Math.sin(a) * 0.45, 0, -a, 0); }
        const missile = mb.build(); missile.position.set(0, -3.2, 0); missile.name = 'missile';
        parts.missile = missile;
        // sliding doors
        for (const s2 of [-1, 1]) {
          const db = new Builder(); db.box(t.team, 1.5, 0.18, 3.0, 0, 0, 0); db.box(m.hazard, 0.1, 0.2, 3.0, -s2 * 0.7, 0.02, 0);
          const door = db.build(); door.position.set(s2 * 0.75, 1.18, 0); door.name = s2 < 0 ? 'siloL' : 'siloR';
          parts[door.name] = door;
        }
        break;
      }
      case 'wall': {
        b.box(m.concrete, 1.95, 1.7, 1.95, 0, 0.75, 0);
        b.box(m.concreteDark, 2.0, 0.25, 2.0, 0, 1.7, 0);
        b.box(t.team, 1.97, 0.18, 1.97, 0, 1.15, 0);
        for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) b.box(m.concreteDark, 0.45, 0.35, 0.45, x, 1.95, z);
        b.box(m.concreteDark, 2.05, 0.6, 2.05, 0, -0.1, 0);
        break;
      }
      case 'gate': {
        for (const s2 of [-1, 1]) {
          b.box(m.concrete, 0.7, 2.6, 1.9, s2 * 1.65, 1.15, 0);
          b.box(t.team, 0.72, 0.25, 1.92, s2 * 1.65, 2.0, 0);
          b.box(m.concreteDark, 0.85, 0.3, 2.0, s2 * 1.65, 2.5, 0);
        }
        b.box(m.darkMetal, 3.4, 0.25, 0.4, 0, 2.75, 0);
        lamps(b, [[-1.65, 2.75, 0.9], [1.65, 2.75, 0.9]], m.lampGreen);
        b.box(m.hazard, 2.6, 0.06, 1.9, 0, 0.06, 0);
        const db = new Builder();
        db.box(m.metal, 2.6, 2.0, 0.25, 0, 0, 0);
        for (let i = 0; i < 5; i++) db.box(m.darkMetal, 2.6, 0.08, 0.3, 0, -0.8 + i * 0.4, 0);
        db.box(m.hazard, 2.6, 0.25, 0.3, 0, 0.95, 0);
        const door = db.build(); door.position.set(0, 1.05, 0); door.name = 'gatedoor';
        const dg = new THREE.Group(); dg.add(door); dg.name = 'gatedoorRoot';
        parts.gatedoor = door;
        break;
      }
      case 'derrick': {
        foundation(b, w, d, 0.3);
        b.cyl(M().crystal, 0.55, 0.6, 1.1, 10, -0.9, 0.75, -0.8);           // crystal tank
        b.add(new THREE.TorusGeometry(0.6, 0.06, 6, 16), t.team, -0.9, 0.95, -0.8, Math.PI / 2, 0, 0);
        b.box(t.team, 0.9, 0.7, 0.9, 0.9, 0.55, -0.9); b.box(m.windows, 0.02, 0.25, 0.7, 1.36, 0.6, -0.9);
        b.box(m.darkMetal, 0.25, 1.9, 0.25, 0.4, 1.1, 0.6); b.box(m.darkMetal, 0.25, 1.9, 0.25, -0.4, 1.1, 0.6); // pump frame
        b.box(m.hazard, 1.1, 0.12, 0.3, 0, 0.3, 0.6);
        pipes(b, -0.2, 0.4, -0.8, 1.2, 'x', 1);
        lamps(b, [[0.9, 1.0, -0.9]], m.lampGreen);
        const pb = new Builder();
        pb.box(t.teamDark, 2.6, 0.22, 0.25, 0, 0, 0);                         // walking beam
        pb.box(m.darkMetal, 0.5, 0.5, 0.3, -1.2, -0.1, 0);                    // counterweight
        pb.add(new THREE.CylinderGeometry(0.35, 0.35, 0.2, 14), m.metal, 1.25, -0.25, 0, Math.PI / 2, 0, 0); // horse head
        pb.cyl(m.gun, 0.03, 0.03, 1.4, 5, 1.4, -0.9, 0);
        const pump = pb.build(); pump.position.set(0, 2.1, 0.6); pump.name = 'pump';
        parts.pump = pump;
        break;
      }
      case 'tesla': {
        // copper coil on a concrete plinth, crowned by a crackling electric orb
        const copper = new THREE.MeshStandardMaterial({ color: 0xb8673a, roughness: 0.35, metalness: 0.85 });
        b.cyl(m.concreteDark, 0.95, 1.05, 0.4, 8, 0, 0.1, 0);
        b.cyl(t.teamDark, 0.7, 0.85, 0.7, 8, 0, 0.6, 0);
        b.cyl(m.darkMetal, 0.28, 0.36, 3.0, 10, 0, 2.3, 0);
        for (let i = 0; i < 9; i++) b.add(new THREE.TorusGeometry(0.42 - i * 0.015, 0.07, 6, 16), copper, 0, 1.2 + i * 0.3, 0, Math.PI / 2, 0, 0);
        for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; b.box(t.team, 0.16, 2.6, 0.16, Math.cos(a) * 0.62, 2.1, Math.sin(a) * 0.62, 0, -a, Math.cos(a) * 0.1); }
        b.add(new THREE.TorusGeometry(0.62, 0.09, 8, 20), copper, 0, 3.85, 0, Math.PI / 2, 0, 0);
        const cb = new Builder();
        cb.add(new THREE.IcosahedronGeometry(0.4, 1), new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x58c8ff, emissiveIntensity: 2.6, roughness: 0.3 }), 0, 0, 0);
        const core = cb.build(false); core.position.set(0, 4.25, 0); core.name = 'core';
        parts.core = core; parts.muzzle = new THREE.Vector3(0, 4.25, 0);
        break;
      }
      case 'flametower': {
        // squat iron tower with fuel tanks and a swivelling flame nozzle, spikes all round
        b.cyl(m.concreteDark, 0.95, 1.05, 0.4, 8, 0, 0.1, 0);
        b.cyl(t.teamDark, 0.65, 0.85, 1.9, 8, 0, 1.2, 0);
        b.cyl(m.darkMetal, 0.75, 0.75, 0.2, 8, 0, 2.2, 0);
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b.add(new THREE.ConeGeometry(0.08, 0.45, 5), m.metal, Math.cos(a) * 0.82, 2.4, Math.sin(a) * 0.82, Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); }
        const fuel = new THREE.MeshStandardMaterial({ color: 0x7a2a18, roughness: 0.5, metalness: 0.5 });
        for (const s of [-1, 1]) { b.cyl(fuel, 0.22, 0.22, 1.1, 10, s * 0.8, 0.95, -0.35); b.cyl(m.hazard, 0.23, 0.23, 0.1, 10, s * 0.8, 1.1, -0.35); }
        const tb = new Builder();
        tb.sph(t.team, 0.45, 0, 0, 0, 1, 0.75, 1.1);
        tb.cyl(m.gun, 0.11, 0.17, 1.1, 10, 0, 0.0, 0.7, Math.PI / 2, 0, 0);
        tb.cyl(m.darkMetal, 0.2, 0.2, 0.15, 10, 0, 0.0, 1.25, Math.PI / 2, 0, 0);
        tb.add(new THREE.SphereGeometry(0.07, 6, 4), m.lampRed, 0, 0.12, 1.32);
        const tur = tb.build(); tur.position.set(0, 2.6, 0); tur.name = 'turret';
        parts.turret = tur; parts.muzzle = new THREE.Vector3(0, 0, 1.35);
        break;
      }
      case 'house': {
        // a little cottage: plastered walls, tiled gable roof, chimney, and a flag showing who holds it
        const plaster = new THREE.MeshStandardMaterial({ color: 0xdccbaa, roughness: 0.92 });
        const tiles = new THREE.MeshStandardMaterial({ color: 0x8f3e2c, roughness: 0.8 });
        const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.85 });
        foundation(b, w, d, 0.2);
        b.box(plaster, 3.0, 1.8, 2.4, 0, 1.0, 0);
        b.box(plaster, 2.98, 1.7, 1.7, 0, 1.9, 0, Math.PI / 4, 0, 0);           // gable
        b.box(tiles, 3.3, 0.12, 2.0, 0, 2.56, 0.66, Math.PI / 4, 0, 0);          // roof slopes
        b.box(tiles, 3.3, 0.12, 2.0, 0, 2.56, -0.66, -Math.PI / 4, 0, 0);
        b.box(tiles, 3.32, 0.14, 0.18, 0, 3.12, 0);                              // ridge
        b.box(m.concreteDark, 0.36, 1.1, 0.36, 0.95, 2.95, -0.55);               // chimney
        for (const s of [-1, 1]) {
          b.box(m.windows, 0.55, 0.5, 0.02, s * 0.85, 1.25, 1.21); b.box(wood, 0.65, 0.07, 0.06, s * 0.85, 0.97, 1.23);
          b.box(m.windows, 0.55, 0.5, 0.02, s * 0.85, 1.25, -1.21);
          b.box(m.windows, 0.02, 0.5, 0.55, s * 1.51, 1.25, 0);
        }
        b.box(wood, 0.55, 1.05, 0.05, 0, 0.62, 1.22);                            // door
        b.cyl(m.metal, 0.03, 0.03, 2.2, 5, 1.55, 1.2, 1.35);                     // flag pole
        b.box(t.team, 0.55, 0.34, 0.03, 1.84, 2.05, 1.35);
        for (let i = 0; i < 6; i++) b.box(wood, 0.06, 0.4, 0.06, -1.6 + i * 0.4, 0.3, 1.75); // picket fence
        b.box(wood, 2.1, 0.05, 0.04, -0.6, 0.38, 1.75);
        break;
      }
      case 'xbarrel': {
        // a cluster of red fuel drums with hazard bands and a little puddle
        const red = new THREE.MeshStandardMaterial({ color: 0xc8281e, roughness: 0.45, metalness: 0.4 });
        for (const [x, z, h] of [[-0.3, -0.25, 0], [0.32, -0.2, 0], [0, 0.3, 0], [0.05, 0, 0.92]]) {
          b.cyl(red, 0.3, 0.3, 0.9, 12, x, 0.45 + h, z);
          b.cyl(m.hazard, 0.31, 0.31, 0.12, 12, x, 0.6 + h, z);
          b.cyl(m.darkMetal, 0.06, 0.06, 0.04, 6, x + 0.12, 0.92 + h, z);
        }
        b.add(new THREE.CircleGeometry(0.75, 14).rotateX(-Math.PI / 2), m.black, 0.1, 0.02, 0.1);
        break;
      }
      case 'wonder': {
        // stepped marble plinth with gold trim, and a giant statue: Wally Man for the Wally Squad, a skull-headed Grimlock idol for the Legion
        foundation(b, w, d, 0.3);
        b.box(m.concrete, 5.4, 0.6, 5.4, 0, 0.5, 0); b.box(m.concrete, 4.4, 0.6, 4.4, 0, 1.1, 0); b.box(m.concrete, 3.4, 1.4, 3.4, 0, 2.1, 0);
        b.box(t.accent, 3.5, 0.15, 3.5, 0, 2.85, 0); b.box(t.team, 3.45, 0.5, 0.05, 0, 2.1, 1.71);
        for (const [x, z] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]]) { b.cyl(m.concrete, 0.18, 0.2, 2.6, 10, x, 1.6, z); b.sph(t.accent, 0.22, x, 3.0, z); }
        lamps(b, [[-2.4, 3.3, -2.4], [2.4, 3.3, -2.4], [-2.4, 3.3, 2.4], [2.4, 3.3, 2.4]], m.lampWhite);
        const gold = M().gold || t.accent;
        if (faction === 'wally') {
          // Wally Man: legs apart, cape, gatling raised
          b.box(gold, 0.45, 1.5, 0.5, -0.35, 3.7, 0); b.box(gold, 0.45, 1.5, 0.5, 0.35, 3.7, 0);
          b.box(t.team, 1.3, 1.5, 0.8, 0, 5.15, 0); b.sph(gold, 0.42, 0, 6.3, 0); b.box(m.black, 0.5, 0.12, 0.05, 0, 6.35, 0.4);
          b.box(t.team, 1.2, 1.9, 0.1, 0, 5.0, -0.5, 0.15, 0, 0);                               // cape
          b.box(gold, 0.3, 1.2, 0.3, -0.85, 5.6, 0, 0, 0, 0.6); b.cyl(m.gun, 0.12, 0.12, 1.4, 8, -1.3, 6.4, 0.2, 0.4, 0, 0.6); // raised gatling arm
          b.box(gold, 0.3, 1.1, 0.3, 0.8, 5.1, 0.2, -0.3, 0, -0.3);
        } else {
          // Grimlock idol: horned skull on a spiked pillar
          b.cyl(m.darkMetal, 0.6, 0.9, 2.6, 8, 0, 4.2, 0);
          for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; b.add(new THREE.ConeGeometry(0.15, 0.8, 6), gold, Math.cos(a) * 0.8, 4.0, Math.sin(a) * 0.8, 0, 0, Math.cos(a) > 0 ? -1.2 : 1.2); }
          b.sph(m.concrete, 1.0, 0, 6.2, 0, 1, 1.1, 1); b.box(m.black, 0.32, 0.3, 0.1, -0.35, 6.3, 0.9); b.box(m.black, 0.32, 0.3, 0.1, 0.35, 6.3, 0.9);
          b.box(m.lampRed, 0.22, 0.15, 0.06, -0.35, 6.3, 0.95); b.box(m.lampRed, 0.22, 0.15, 0.06, 0.35, 6.3, 0.95);
          for (const s of [-1, 1]) b.add(new THREE.ConeGeometry(0.22, 1.6, 8), gold, s * 1.1, 7.0, 0, 0, 0, -s * 0.7);
        }
        break;
      }
      case 'bunker': {
        foundation(b, w, d, 0.3);
        b.cyl(m.concreteDark, 1.75, 1.9, 0.5, 8, 0, 0.35, 0, 0, Math.PI / 8, 0);
        b.cyl(m.concrete, 1.45, 1.7, 1.3, 8, 0, 1.2, 0, 0, Math.PI / 8, 0);
        b.cyl(m.concreteDark, 1.6, 1.5, 0.35, 8, 0, 2.0, 0, 0, Math.PI / 8, 0);           // roof slab
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; b.box(m.black, 0.7, 0.16, 0.06, Math.sin(a) * 1.6, 1.45, Math.cos(a) * 1.6, 0, a, 0); } // firing slits
        for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; b.add(new THREE.CapsuleGeometry(0.16, 0.36, 4, 6), m.sand, Math.cos(a) * 1.95, 0.32, Math.sin(a) * 1.95, 0, -a, Math.PI / 2); }
        b.box(m.darkMetal, 0.7, 1.0, 0.1, 0, 0.9, 1.72);                                    // door
        b.box(t.team, 1.2, 0.12, 1.2, 0, 2.22, 0);
        b.cyl(m.gun, 0.03, 0.03, 1.5, 5, 0.9, 2.95, -0.6);                                  // flag pole
        b.box(t.accent, 0.6, 0.38, 0.02, 1.2, 3.45, -0.6);
        lamps(b, [[0, 2.4, 0]], m.lampWhite);
        parts.muzzle = new THREE.Vector3(0, 1.45, 1.4);
        break;
      }
      case 'hospital': {
        foundation(b, w, d, 0.3);
        b.box(m.medic, 3.2, 1.6, 2.4, 0, 1.0, -0.4);
        b.box(t.team, 3.3, 0.18, 2.5, 0, 1.85, -0.4);
        b.box(m.lampRed, 0.9, 0.25, 0.04, 0, 1.25, 0.82); b.box(m.lampRed, 0.25, 0.9, 0.04, 0, 1.25, 0.83); // red cross
        b.box(m.lampRed, 0.7, 0.04, 0.2, 0, 1.96, -0.4); b.box(m.lampRed, 0.2, 0.04, 0.7, 0, 1.96, -0.4);
        b.box(m.windows, 0.8, 0.35, 0.02, -1.1, 1.3, 0.81); b.box(m.windows, 0.8, 0.35, 0.02, 1.1, 1.3, 0.81);
        b.box(m.darkMetal, 0.8, 1.0, 0.1, 1.1, 0.7, 0.82);
        for (let i = 0; i < 3; i++) b.box(m.medic, 0.8, 0.15, 0.4, -1.2 + i * 1.2, 0.35, 1.25); // stretchers
        lamps(b, [[1.5, 1.95, 0.75], [-1.5, 1.95, 0.75]], m.lampRed);
        break;
      }
      case 'depot': {
        foundation(b, w, d, 0.25);
        b.box(m.concreteDark, 3.4, 0.2, 3.4, 0, 0.22, 0);
        b.box(m.hazard, 3.4, 0.05, 0.25, 0, 0.34, 1.55); b.box(m.hazard, 3.4, 0.05, 0.25, 0, 0.34, -1.55);
        for (const s2 of [-1, 1]) {
          b.box(t.team, 0.3, 2.4, 0.3, s2 * 1.55, 1.35, -1.4);
          b.box(t.team, 0.3, 2.4, 0.3, s2 * 1.55, 1.35, 1.4);
          b.box(t.teamDark, 0.3, 0.3, 3.1, s2 * 1.55, 2.55, 0);
        }
        b.box(m.hazard, 3.4, 0.3, 0.3, 0, 2.55, 0);                              // gantry
        b.cyl(m.gun, 0.03, 0.03, 1.2, 4, 0.4, 1.9, 0); b.box(m.darkMetal, 0.3, 0.2, 0.3, 0.4, 1.25, 0); // hoist
        b.box(m.lampGreen, 0.5, 0.5, 0.05, 1.7, 2.1, 1.56);                       // wrench sign
        b.box(m.black, 0.3, 0.08, 0.06, 1.7, 2.1, 1.6, 0, 0, 0.7);
        lamps(b, [[1.55, 2.75, 1.4], [-1.55, 2.75, 1.4], [1.55, 2.75, -1.4], [-1.55, 2.75, -1.4]], m.lampWhite);
        break;
      }
      case 'mine': {
        b.cyl(m.darkMetal, 0.45, 0.5, 0.18, 12, 0, 0.08, 0);
        b.cyl(t.teamDark, 0.3, 0.32, 0.08, 12, 0, 0.2, 0);
        b.sph(m.lampRed, 0.07, 0, 0.26, 0);
        break;
      }
      case 'plasma': {
        b.cyl(m.concreteDark, 0.95, 1.05, 0.4, 8, 0, 0.1, 0);
        b.cyl(t.teamDark, 0.55, 0.85, 3.6, 8, 0, 2.1, 0);
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; b.box(t.team, 0.25, 3.8, 0.35, Math.cos(a) * 0.75, 2.0, Math.sin(a) * 0.75, 0, -a, Math.cos(a) * 0.12); }
        for (let i = 0; i < 4; i++) b.add(new THREE.TorusGeometry(0.62 - i * 0.04, 0.06, 6, 16), m.plasma, 0, 1.0 + i * 0.85, 0, Math.PI / 2, 0, 0);
        b.cyl(m.darkMetal, 0.25, 0.55, 0.6, 8, 0, 4.1, 0);
        const cb = new Builder();
        cb.add(new THREE.IcosahedronGeometry(0.42, 1), m.plasma, 0, 0, 0);
        const core = cb.build(false); core.position.set(0, 4.7, 0); core.name = 'core';
        parts.core = core; parts.muzzle = new THREE.Vector3(0, 4.7, 0);
        break;
      }
    }
    root.add(b.build());
    for (const k of ['crane', 'door', 'dish', 'core', 'turret', 'missile', 'siloL', 'siloR', 'gatedoor', 'pump']) if (parts[k]) root.add(parts[k]);
    root.userData.parts = { steam: parts.steam, muzzle: parts.muzzle, muzzle2: parts.muzzle2, flag: parts.flag, coreY: parts.coreY };
    return root;
  });
}

// Ghost (placement preview) — translucent version of a building
export function makeGhost(type, faction) {
  const g = makeBuildingModel(type, faction);
  const mat = new THREE.MeshBasicMaterial({ color: 0x66ff88, transparent: true, opacity: 0.35, depthWrite: false });
  g.traverse(o => { if (o.isMesh) { o.material = mat; o.castShadow = false; } });
  g.userData.ghostMat = mat;
  return g;
}

// Rubble left behind by destroyed buildings
export function makeRubble(w, d) {
  const b = new Builder();
  const m = M();
  const n = Math.round(w * d * 1.2) + 4;
  for (let i = 0; i < n; i++) {
    const x = (Math.random() - 0.5) * w * 0.9, z = (Math.random() - 0.5) * d * 0.9;
    const s = 0.3 + Math.random() * 0.9;
    b.add(new THREE.BoxGeometry(s, s * 0.5, s * 0.8), Math.random() < 0.5 ? m.burnt : m.concreteDark, x, s * 0.2, z, Math.random(), Math.random() * 3, Math.random());
  }
  for (let i = 0; i < 4; i++) b.add(new THREE.CylinderGeometry(0.06, 0.06, 1.5 + Math.random() * 1.5, 4), m.darkMetal, (Math.random() - 0.5) * w * 0.7, 0.6, (Math.random() - 0.5) * d * 0.7, Math.random() - 0.5, 0, Math.random() - 0.5);
  return b.build();
}

// Burnt-out wreck for destroyed vehicles: clone model with charred material
export function charModel(obj) {
  obj.traverse(o => { if (o.isMesh) { o.material = M().burnt; } });
}
