// Weapons Wally can find lying about Wallypool
import * as THREE from 'three';
import { buildBlaster } from './humans.js';

// melee: swing in front.  ranged: hitscan rays.  proj: launched projectile.  flame: short cone.  thrown: neeps.
export const WEAPONS = {
  fists: { name: 'Fists', icon: '👊', melee: true },
  club: { name: "Granda's Golf Club", icon: '🏌', melee: true, range: 2.3, dmg: 45, cool: 0.55 },
  pan: { name: 'Frying Pan', icon: '🍳', melee: true, range: 1.9, dmg: 40, cool: 0.5, clang: true },
  claymore: { name: 'Claymore', icon: '🗡️', melee: true, range: 2.6, dmg: 85, cool: 0.75 },
  bagpipes: { name: 'Battle Bagpipes', icon: '🎶', melee: true, blast: 4.5, dmg: 15, cool: 1.4 },
  blaster: { name: 'Wally Blaster', icon: '🔫', ranged: true, rate: 0.22, dmg: 45, pellets: 1, spread: 0, range: 90, pickup: 30, tracer: '#7fe8ff' },
  scatter: { name: 'Scatter Blaster', icon: '💥', ranged: true, rate: 0.85, dmg: 24, pellets: 7, spread: 0.075, range: 35, pickup: 12, tracer: '#ffd27a' },
  laser: { name: 'Wally Laser', icon: '⚡', ranged: true, rate: 0.12, dmg: 30, pellets: 1, spread: 0.004, range: 120, pickup: 40, tracer: '#ff2a2a', beam: true },
  gatling: { name: 'Gatling Blaster', icon: '🌀', ranged: true, rate: 0.065, dmg: 16, pellets: 1, spread: 0.035, range: 70, pickup: 150, tracer: '#ffe28a' },
  sniper: { name: 'Long Scope', icon: '🎯', ranged: true, rate: 1.2, dmg: 170, pellets: 1, spread: 0, range: 220, pickup: 8, tracer: '#ffffff', zoom: 18 },
  soaker: { name: 'Super Soaker', icon: '💦', ranged: true, rate: 0.08, dmg: 2, pellets: 1, spread: 0.02, range: 16, pickup: 200, tracer: '#6fc8ff', soak: true },
  tattie: { name: 'Tattie Gun', icon: '🥔', proj: 'tattie', rate: 0.45, dmg: 32, pickup: 15 },
  haggis: { name: 'Haggis Launcher', icon: '🚀', proj: 'haggis', rate: 1.3, pickup: 4 },
  flame: { name: "Dragon's Breath", icon: '🔥', flame: true, rate: 0.06, dmg: 5, range: 9, pickup: 120 },
  neep: { name: 'Neep Grenades', icon: '💣', thrown: true, rate: 0.9, pickup: 4 },
  // ---- v3.0 ----
  shinty: { name: 'Shinty Stick', icon: '🏑', melee: true, range: 2.4, dmg: 55, cool: 0.55 },
  revolver: { name: 'Auld Revolver', icon: '🤠', ranged: true, rate: 0.55, dmg: 75, pellets: 1, spread: 0.004, range: 80, pickup: 18, tracer: '#ffe7b0', kick: 0.08 },
  taser: { name: 'Polis Taser', icon: '🔌', ranged: true, rate: 0.9, dmg: 12, pellets: 1, spread: 0, range: 14, pickup: 10, tracer: '#8fd0ff', beam: true, stun: true },
  double: { name: "Gamekeeper's Double", icon: '🦌', ranged: true, rate: 0.95, dmg: 26, pellets: 10, spread: 0.09, range: 30, pickup: 10, tracer: '#ffd27a', kick: 0.2 },
  smg: { name: 'Wee Rattler', icon: '🐍', ranged: true, rate: 0.075, dmg: 17, pellets: 1, spread: 0.045, range: 55, pickup: 90, tracer: '#ffd27a' },
  nailgun: { name: 'Nail Gun', icon: '🔩', ranged: true, rate: 0.1, dmg: 15, pellets: 1, spread: 0.02, range: 35, pickup: 100, tracer: '#b8c0c8' },
  rifle: { name: 'Highland Rifle', icon: '🏔', ranged: true, rate: 0.12, dmg: 34, pellets: 1, spread: 0.012, range: 130, pickup: 60, tracer: '#fff0c0', kick: 0.04 },
  crossbow: { name: 'Thistle Crossbow', icon: '🏹', proj: 'bolt', rate: 1.0, dmg: 140, pickup: 12 },
  caber: { name: 'Caber Launcher', icon: '🪵', proj: 'caber', rate: 1.6, pickup: 4 },
  flamer: { name: 'Flamethrower', icon: '☄️', flame: true, big: true, rate: 0.045, dmg: 8, range: 15, pickup: 200 },
};
for (const k in WEAPONS) WEAPONS[k].id = k;
export const WEAPON_ORDER = ['fists', 'club', 'pan', 'shinty', 'claymore', 'bagpipes', 'blaster', 'revolver', 'taser', 'scatter', 'double', 'smg', 'nailgun', 'laser', 'rifle', 'gatling', 'sniper', 'soaker', 'tattie', 'crossbow', 'haggis', 'caber', 'flame', 'flamer', 'neep'];
export const usesAmmo = (id) => !WEAPONS[id].melee;
// how a model sits in Wally's hand: melee weapons angle down and forward, guns point along the forearm
export const HOLD = { club: [Math.PI - 0.5, 0], pan: [Math.PI - 0.5, 0], shinty: [Math.PI - 0.5, 0], claymore: [Math.PI - 0.45, 0], bagpipes: [0, 0], neep: [0, 0] };

const M = {};
export const SHARED_WEAPON = new Set();
const mat = (k, o) => { if (!M[k]) { M[k] = new THREE.MeshStandardMaterial(o); SHARED_WEAPON.add(M[k]); } return M[k]; };
const steel = () => mat('steel', { color: '#c9ced6', metalness: 1, roughness: 0.25 });
const black = () => mat('blk', { color: '#161616', roughness: 0.5, metalness: 0.4 });
const cyl = (r1, r2, h, m, seg = 14) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m);
const box = (x, y, z, m) => new THREE.Mesh(new THREE.BoxGeometry(x, y, z), m);
const alongZ = (o, z, y = 0.03) => { o.rotation.x = Math.PI / 2; o.position.set(0, y, z); return o; };
const muzzle = (g, z, y = 0.035) => { g.userData.muzzle = new THREE.Vector3(0, y, z); return g; };
const done = (g) => { g.traverse((m) => { if (m.isMesh) m.castShadow = true; }); return g; };

export function buildClub() {
  const g = new THREE.Group();
  const shaft = cyl(0.011, 0.014, 0.95, steel(), 10); shaft.position.y = 0.42; g.add(shaft);
  const grip = cyl(0.02, 0.018, 0.24, mat('gripblk', { color: '#1d1d1d', roughness: 0.8 }), 12); grip.position.y = 0.04; g.add(grip);
  const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.08, 4, 12), steel());
  head.rotation.z = Math.PI / 2; head.position.set(0.04, 0.9, 0); head.scale.set(1, 1, 0.55); g.add(head);
  return done(g);
}
function buildPan() {
  const g = new THREE.Group();
  const handle = cyl(0.016, 0.014, 0.3, mat('panh', { color: '#2a1a10', roughness: 0.7 }), 10); handle.position.y = 0.12; g.add(handle);
  const pan = cyl(0.15, 0.13, 0.04, mat('pan', { color: '#2b2d30', metalness: 0.7, roughness: 0.4 }), 28); pan.rotation.z = Math.PI / 2; pan.position.set(0, 0.42, 0); g.add(pan);
  return done(g);
}
function buildClaymore() {
  const g = new THREE.Group();
  const blade = box(0.05, 1.0, 0.012, steel()); blade.position.y = 0.62; g.add(blade);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 4), steel()); tip.position.y = 1.18; tip.rotation.y = Math.PI / 4; tip.scale.z = 0.35; g.add(tip);
  const guard = box(0.32, 0.03, 0.03, mat('brass', { color: '#b88a3a', metalness: 0.9, roughness: 0.3 })); guard.position.y = 0.1; g.add(guard);
  const grip = cyl(0.018, 0.018, 0.2, mat('leather', { color: '#3a2414', roughness: 0.8 }), 10); grip.position.y = 0; g.add(grip);
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), M.brass); pommel.position.y = -0.11; g.add(pommel);
  return done(g);
}
function buildBagpipes() {
  const g = new THREE.Group();
  // tartan bag
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#1d5a2e'; x.fillRect(0, 0, 64, 64);
  x.fillStyle = 'rgba(20,40,120,0.7)'; for (let i = 0; i < 64; i += 16) { x.fillRect(i, 0, 8, 64); x.fillRect(0, i, 64, 8); }
  x.fillStyle = 'rgba(200,30,30,0.8)'; for (let i = 4; i < 64; i += 16) { x.fillRect(i, 0, 2, 64); x.fillRect(0, i, 64, 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const bag = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }));
  bag.scale.set(0.8, 1, 0.7); bag.position.set(0, 0.05, 0.1); g.add(bag);
  const wood = mat('wood', { color: '#1a1008', roughness: 0.4 });
  [[-0.06, 0.55, 0.08], [0, 0.5, 0.04], [0.06, 0.42, 0.06]].forEach(([dx, h, dz]) => { const d = cyl(0.016, 0.02, h, wood, 10); d.position.set(dx, 0.1 + h / 2, dz); d.rotation.z = dx * 1.5; g.add(d); });
  const chanter = cyl(0.014, 0.022, 0.32, wood, 10); chanter.position.set(0, -0.15, 0.2); chanter.rotation.x = 0.4; g.add(chanter);
  return done(g);
}
export function buildScatter() {
  const g = buildBlaster();
  g.scale.set(1.35, 1.35, 1.6);
  const pump = alongZ(cyl(0.024, 0.024, 0.09, mat('pump', { color: '#e8641c', roughness: 0.5 })), 0.17, 0.012); g.add(pump);
  const barrel2 = alongZ(cyl(0.014, 0.014, 0.14, mat('grey2', { color: '#555b63', metalness: 0.8, roughness: 0.3 }), 12), 0.21, 0.012); g.add(barrel2);
  return g;
}
function buildLaser() {
  const g = new THREE.Group();
  const body = box(0.05, 0.07, 0.3, mat('white', { color: '#e8ecf2', metalness: 0.3, roughness: 0.3 })); body.position.set(0, 0.03, 0.1); g.add(body);
  const grip = box(0.04, 0.11, 0.045, black()); grip.position.set(0, -0.04, 0); grip.rotation.x = -0.25; g.add(grip);
  const glow = mat('redglow', { color: '#ff3030', emissive: '#ff1010', emissiveIntensity: 3 });
  for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.006, 6, 16), glow); r.position.set(0, 0.03, 0.18 + i * 0.03); g.add(r); }
  g.add(alongZ(cyl(0.012, 0.016, 0.12, steel()), 0.31));
  return done(muzzle(g, 0.38, 0.03));
}
function buildGatling() {
  const g = new THREE.Group();
  const body = box(0.09, 0.09, 0.18, black()); body.position.set(0, 0.03, 0.02); g.add(body);
  const grip = box(0.04, 0.1, 0.045, black()); grip.position.set(0, -0.05, -0.04); g.add(grip);
  const spin = new THREE.Group(); spin.position.set(0, 0.03, 0.1); g.add(spin);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const b = alongZ(cyl(0.009, 0.009, 0.34, steel(), 8), 0.17, 0); b.position.x = Math.cos(a) * 0.028; b.position.y = Math.sin(a) * 0.028; spin.add(b); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 16), steel()); ring.position.set(0, 0.03, 0.33); g.add(ring);
  const drum = cyl(0.06, 0.06, 0.08, mat('olive', { color: '#4b5320', roughness: 0.6 }), 16); drum.rotation.z = Math.PI / 2; drum.position.set(0.08, 0.0, 0.02); g.add(drum);
  g.userData.spin = spin;
  return done(muzzle(g, 0.45, 0.03));
}
function buildSniper() {
  const g = new THREE.Group();
  const stock = box(0.045, 0.09, 0.3, mat('walnut', { color: '#5a3820', roughness: 0.5 })); stock.position.set(0, 0.0, -0.08); g.add(stock);
  const body = box(0.045, 0.06, 0.25, black()); body.position.set(0, 0.03, 0.15); g.add(body);
  g.add(alongZ(cyl(0.012, 0.014, 0.6, black(), 10), 0.55));
  const scope = alongZ(cyl(0.022, 0.022, 0.22, black(), 14), 0.15, 0.095); g.add(scope);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.02, 14), mat('lensb', { color: '#4fa3ff', emissive: '#2a6aff', emissiveIntensity: 1 })); lens.position.set(0, 0.095, 0.262); g.add(lens);
  return done(muzzle(g, 0.86, 0.03));
}
function buildSoaker() {
  const g = new THREE.Group();
  const body = box(0.06, 0.08, 0.32, mat('lime', { color: '#5ad13a', roughness: 0.4 })); body.position.set(0, 0.03, 0.1); g.add(body);
  const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.12, 4, 12), mat('tank', { color: '#ff8a1c', roughness: 0.3, transparent: true, opacity: 0.85 }));
  tank.rotation.x = Math.PI / 2; tank.position.set(0, 0.11, 0.06); g.add(tank);
  const grip = box(0.04, 0.11, 0.045, mat('purple', { color: '#7b3fc4', roughness: 0.4 })); grip.position.set(0, -0.05, 0); g.add(grip);
  g.add(alongZ(cyl(0.01, 0.014, 0.08, mat('yellow', { color: '#ffd23f' })), 0.3));
  return done(muzzle(g, 0.35, 0.03));
}
function buildTattie() {
  const g = new THREE.Group();
  g.add(alongZ(cyl(0.035, 0.04, 0.5, mat('pvc', { color: '#d9d4c7', roughness: 0.6 }), 16), 0.18));
  const chamber = cyl(0.055, 0.055, 0.14, M.pvc, 16); chamber.rotation.x = Math.PI / 2; chamber.position.set(0, 0.03, -0.12); g.add(chamber);
  const grip = box(0.04, 0.1, 0.045, black()); grip.position.set(0, -0.05, -0.05); g.add(grip);
  const spud = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), mat('spud', { color: '#b58a4f', roughness: 0.9 })); spud.position.set(0, 0.03, 0.44); spud.scale.set(1, 0.8, 1.3); g.add(spud);
  return done(muzzle(g, 0.46, 0.03));
}
function buildHaggisLauncher() {
  const g = new THREE.Group();
  g.add(alongZ(cyl(0.06, 0.06, 0.8, mat('army', { color: '#3f4a2a', roughness: 0.7 }), 18), 0.12, 0.07));
  const grip = box(0.04, 0.12, 0.045, black()); grip.position.set(0, -0.04, 0); g.add(grip);
  const sight = box(0.02, 0.06, 0.06, black()); sight.position.set(-0.07, 0.12, 0.1); g.add(sight);
  const warhead = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), mat('haggis', { color: '#6a3b22', roughness: 0.8 })); warhead.position.set(0, 0.07, 0.54); warhead.scale.z = 1.3; g.add(warhead);
  return done(muzzle(g, 0.6, 0.07));
}
function buildFlame() {
  const g = new THREE.Group();
  const tank = cyl(0.05, 0.05, 0.22, mat('redtank', { color: '#a11d1d', metalness: 0.4, roughness: 0.4 }), 14); tank.position.set(0.07, 0.02, -0.02); g.add(tank);
  g.add(alongZ(cyl(0.018, 0.026, 0.42, steel(), 12), 0.16));
  const grip = box(0.04, 0.1, 0.045, black()); grip.position.set(0, -0.05, 0); g.add(grip);
  const pilot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), mat('pilot', { color: '#4fb6ff', emissive: '#2a8cff', emissiveIntensity: 3 })); pilot.position.set(0, 0.03, 0.39); g.add(pilot);
  return done(muzzle(g, 0.4, 0.03));
}

// ---------------- v3.0 weapons ----------------
const walnut = () => mat('walnut', { color: '#5a3820', roughness: 0.5 });
const gun = () => mat('gunm', { color: '#2b2e33', metalness: 0.85, roughness: 0.35 });
function buildRevolver() {
  const g = new THREE.Group();
  g.add(alongZ(cyl(0.013, 0.013, 0.2, gun(), 12), 0.16, 0.045));
  const drum = cyl(0.033, 0.033, 0.06, gun(), 12); drum.rotation.x = Math.PI / 2; drum.position.set(0, 0.035, 0.04); g.add(drum);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, h = cyl(0.007, 0.007, 0.062, black(), 6); h.rotation.x = Math.PI / 2; h.position.set(Math.cos(a) * 0.019, 0.035 + Math.sin(a) * 0.019, 0.04); g.add(h); }
  const frame = box(0.03, 0.05, 0.1, gun()); frame.position.set(0, 0.03, 0.0); g.add(frame);
  const grip = box(0.035, 0.11, 0.045, walnut()); grip.position.set(0, -0.045, -0.035); grip.rotation.x = -0.35; g.add(grip);
  const hammer = box(0.01, 0.03, 0.02, gun()); hammer.position.set(0, 0.07, -0.03); hammer.rotation.x = -0.5; g.add(hammer);
  return done(muzzle(g, 0.27, 0.045));
}
function buildTaser() {
  const g = new THREE.Group();
  const body = box(0.045, 0.06, 0.16, mat('taserY', { color: '#f2c200', roughness: 0.4 })); body.position.set(0, 0.03, 0.05); g.add(body);
  const cart = box(0.05, 0.065, 0.05, mat('taserB', { color: '#1d4fd6', roughness: 0.4 })); cart.position.set(0, 0.03, 0.15); g.add(cart);
  const grip = box(0.04, 0.1, 0.045, black()); grip.position.set(0, -0.05, -0.01); grip.rotation.x = -0.25; g.add(grip);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), mat('taserLed', { color: '#9fe0ff', emissive: '#40b0ff', emissiveIntensity: 3 })); led.position.set(0, 0.065, -0.01); g.add(led);
  return done(muzzle(g, 0.18, 0.03));
}
function buildDouble() {
  const g = new THREE.Group();
  for (const sx of [-0.017, 0.017]) { const b = alongZ(cyl(0.016, 0.016, 0.62, gun(), 12), 0.33, 0.045); b.position.x = sx; g.add(b); }
  const fore = box(0.05, 0.03, 0.22, walnut()); fore.position.set(0, 0.018, 0.2); g.add(fore);
  const action = box(0.05, 0.05, 0.08, mat('steelc', { color: '#9aa0a8', metalness: 1, roughness: 0.3 })); action.position.set(0, 0.03, 0.03); g.add(action);
  const stock = box(0.045, 0.08, 0.3, walnut()); stock.position.set(0, -0.01, -0.15); stock.rotation.x = 0.12; g.add(stock);
  return done(muzzle(g, 0.65, 0.045));
}
function buildSMG() {
  const g = new THREE.Group();
  const body = box(0.045, 0.07, 0.2, black()); body.position.set(0, 0.03, 0.06); g.add(body);
  g.add(alongZ(cyl(0.011, 0.011, 0.1, gun(), 10), 0.2, 0.04));
  const mag = box(0.03, 0.15, 0.035, gun()); mag.position.set(0, -0.07, 0.09); mag.rotation.x = 0.12; g.add(mag);
  const grip = box(0.035, 0.09, 0.04, black()); grip.position.set(0, -0.04, -0.02); grip.rotation.x = -0.2; g.add(grip);
  const stock = box(0.012, 0.04, 0.16, gun()); stock.position.set(0, 0.02, -0.1); g.add(stock);
  return done(muzzle(g, 0.26, 0.04));
}
function buildNailgun() {
  const g = new THREE.Group();
  const yel = mat('toolY', { color: '#f0b400', roughness: 0.45 });
  const body = box(0.06, 0.1, 0.22, yel); body.position.set(0, 0.04, 0.05); g.add(body);
  const nose = box(0.03, 0.03, 0.08, mat('steelc', { color: '#9aa0a8', metalness: 1, roughness: 0.3 })); nose.position.set(0, 0.0, 0.19); g.add(nose);
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.02, 8, 18), black()); coil.position.set(0, -0.05, 0.12); g.add(coil);
  const grip = box(0.035, 0.1, 0.045, black()); grip.position.set(0, -0.05, -0.03); grip.rotation.x = -0.2; g.add(grip);
  return done(muzzle(g, 0.24, 0.0));
}
function buildRifle() {
  const g = new THREE.Group();
  const body = box(0.045, 0.075, 0.3, black()); body.position.set(0, 0.03, 0.08); g.add(body);
  g.add(alongZ(cyl(0.011, 0.012, 0.32, gun(), 10), 0.38, 0.045));
  const hand = box(0.05, 0.05, 0.16, mat('olive', { color: '#4b5320', roughness: 0.6 })); hand.position.set(0, 0.035, 0.28); g.add(hand);
  const mag = box(0.03, 0.14, 0.05, gun()); mag.position.set(0, -0.07, 0.1); mag.rotation.x = 0.3; g.add(mag);
  const grip = box(0.035, 0.09, 0.04, black()); grip.position.set(0, -0.045, -0.02); grip.rotation.x = -0.25; g.add(grip);
  const stock = box(0.04, 0.08, 0.22, black()); stock.position.set(0, 0.015, -0.17); g.add(stock);
  const sight = box(0.012, 0.04, 0.012, black()); sight.position.set(0, 0.09, 0.45); g.add(sight);
  return done(muzzle(g, 0.55, 0.045));
}
function buildCrossbow() {
  const g = new THREE.Group();
  const stock = box(0.04, 0.05, 0.5, walnut()); stock.position.set(0, 0.02, 0.08); g.add(stock);
  for (const s of [-1, 1]) { const limb = box(0.24, 0.02, 0.025, black()); limb.position.set(s * 0.12, 0.04, 0.3 - 0.03); limb.rotation.y = s * 0.25; g.add(limb); }
  const string = cyl(0.002, 0.002, 0.44, mat('string', { color: '#e8e2d0' }), 4); string.rotation.z = Math.PI / 2; string.position.set(0, 0.045, 0.14); g.add(string);
  const bolt = alongZ(cyl(0.006, 0.006, 0.34, mat('bolt', { color: '#7a5a3a' }), 6), 0.26, 0.055); g.add(bolt);
  const thistle = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), mat('thistle', { color: '#9b4fd1', roughness: 0.6 })); thistle.position.set(0, 0.055, 0.44); g.add(thistle);
  const grip = box(0.035, 0.09, 0.04, black()); grip.position.set(0, -0.04, -0.02); g.add(grip);
  return done(muzzle(g, 0.46, 0.055));
}
function buildShinty() {
  const g = new THREE.Group();
  const ash = mat('ash', { color: '#c9a46a', roughness: 0.55 });
  const shaft = cyl(0.016, 0.018, 0.9, ash, 10); shaft.position.y = 0.4; g.add(shaft);
  const tape = cyl(0.02, 0.02, 0.2, mat('tape', { color: '#1b2f6b', roughness: 0.8 }), 10); tape.position.y = 0.02; g.add(tape);
  const head = box(0.09, 0.16, 0.035, ash); head.position.set(0.035, 0.9, 0); head.rotation.z = -0.5; g.add(head);
  return done(g);
}
function buildCaberLauncher() {
  const g = new THREE.Group();
  g.add(alongZ(cyl(0.07, 0.07, 0.7, mat('tartanR', { color: '#8e1b1b', roughness: 0.6 }), 16), 0.12, 0.08));
  const log = alongZ(cyl(0.05, 0.055, 0.3, mat('bark', { color: '#6b4a2b', roughness: 0.95 }), 10), 0.52, 0.08); g.add(log);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.012, 8, 20), M.steel || steel()); rim.position.set(0, 0.08, 0.47); g.add(rim);
  const grip = box(0.04, 0.12, 0.045, black()); grip.position.set(0, -0.04, 0); g.add(grip);
  return done(muzzle(g, 0.7, 0.08));
}
function buildFlamethrower() {
  const g = new THREE.Group();
  const tankM = mat('flamerTank', { color: '#c9a21a', metalness: 0.5, roughness: 0.35 });
  for (const sx of [0.06, 0.14]) { const t = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.2, 4, 12), tankM); t.position.set(sx, 0.02, -0.05); g.add(t); }
  const hose = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 6, 16, Math.PI), black()); hose.position.set(0.06, -0.04, 0.05); hose.rotation.y = Math.PI / 2; g.add(hose);
  g.add(alongZ(cyl(0.02, 0.03, 0.55, gun(), 12), 0.22));
  const shroud = alongZ(cyl(0.04, 0.035, 0.12, mat('shroud', { color: '#3a3a3a', metalness: 0.7, roughness: 0.5 }), 14), 0.46); g.add(shroud);
  const grip = box(0.04, 0.1, 0.045, black()); grip.position.set(0, -0.05, 0.02); g.add(grip);
  const pilot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), mat('pilot', { color: '#4fb6ff', emissive: '#2a8cff', emissiveIntensity: 3 })); pilot.position.set(0, 0.03, 0.53); g.add(pilot);
  return done(muzzle(g, 0.55, 0.03));
}

// A neep (a Scottish turnip): purple top, cream bottom, with a wee fuse
export function buildNeep(r = 0.07) {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(r, 20, 14);
  const pos = geo.attributes.position, col = [];
  const top = new THREE.Color('#7b3b8f'), bot = new THREE.Color('#efe2bd'), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / r; c.copy(bot).lerp(top, THREE.MathUtils.smoothstep(y, -0.1, 0.5)); col.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const body = new THREE.Mesh(geo, mat('neep', { vertexColors: true, roughness: 0.6 }));
  body.scale.set(1, 0.9, 1); g.add(body);
  const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, r * 0.8, 6), mat('fuse', { color: '#3a2a1a' }));
  fuse.position.y = r * 1.1; g.add(fuse);
  const spark = new THREE.Mesh(new THREE.SphereGeometry(r * 0.18, 8, 6), mat('spark', { color: '#ffcf40', emissive: '#ff9a20', emissiveIntensity: 3 }));
  spark.position.y = r * 1.5; g.add(spark);
  return done(g);
}
// projectiles in flight
export function buildProjectile(kind) {
  if (kind === 'haggis') {
    const g = new THREE.Group();
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), mat('haggis', { color: '#6a3b22', roughness: 0.8 })); h.scale.z = 1.4; g.add(h);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 10), mat('jet', { color: '#ffb030', emissive: '#ff7a10', emissiveIntensity: 4 }));
    flame.rotation.x = -Math.PI / 2; flame.position.z = -0.28; g.add(flame);
    return g;
  }
  if (kind === 'bolt') {
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 6), mat('bolt', { color: '#7a5a3a' })); shaft.rotation.x = Math.PI / 2; g.add(shaft);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 6), steel()); tip.rotation.x = Math.PI / 2; tip.position.z = 0.33; g.add(tip);
    const th = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mat('thistle', { color: '#9b4fd1', roughness: 0.6 })); th.position.z = -0.3; g.add(th);
    return g;
  }
  if (kind === 'caber') {
    const g = new THREE.Group();
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 1.6, 10), mat('bark', { color: '#6b4a2b', roughness: 0.95 })); log.rotation.x = Math.PI / 2; g.add(log);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 10), mat('jet', { color: '#ffb030', emissive: '#ff7a10', emissiveIntensity: 4 }));
    flame.rotation.x = -Math.PI / 2; flame.position.z = -1.0; g.add(flame);
    return g;
  }
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mat('spud', { color: '#b58a4f', roughness: 0.9 })); s.scale.set(1, 0.8, 1.3);
  return s;
}

export function buildWeaponModel(id) {
  switch (id) {
    case 'club': return buildClub();
    case 'pan': return buildPan();
    case 'claymore': return buildClaymore();
    case 'bagpipes': return buildBagpipes();
    case 'scatter': return buildScatter();
    case 'laser': return buildLaser();
    case 'gatling': return buildGatling();
    case 'sniper': return buildSniper();
    case 'soaker': return buildSoaker();
    case 'tattie': return buildTattie();
    case 'haggis': return buildHaggisLauncher();
    case 'flame': return buildFlame();
    case 'neep': return buildNeep();
    case 'shinty': return buildShinty();
    case 'revolver': return buildRevolver();
    case 'taser': return buildTaser();
    case 'double': return buildDouble();
    case 'smg': return buildSMG();
    case 'nailgun': return buildNailgun();
    case 'rifle': return buildRifle();
    case 'crossbow': return buildCrossbow();
    case 'caber': return buildCaberLauncher();
    case 'flamer': return buildFlamethrower();
    default: return buildBlaster();
  }
}
