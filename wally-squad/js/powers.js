// Support powers: Recon Sweep, Paradrop and Airstrike. They charge up once you own the right
// buildings, then you click a spot on the map. Game effects use game-time timers (online-safe).
import * as THREE from 'three';
import { G, later, srr, emit } from './state.js';
import { HALF } from './config.js';
import { groundY, BASES, blastTrees } from './terrain.js';
import { Unit, damage, unitsNear, decay, distTo } from './entities.js';
import { mats, M } from './materials.js';
import * as FX from './particles.js';

export const POWERS = {
  recon:     { name: 'Recon Sweep', icon: '📡', req: ['radar'], charge: 75, desc: 'Reveals a large area for 20 seconds.' },
  paradrop:  { name: 'Paradrop', icon: '🪂', req: ['barracks', 'radar'], charge: 150, desc: 'A transport drops 7 troopers by parachute.' },
  airstrike: { name: 'Airstrike', icon: '✈', req: ['helipad'], charge: 210, desc: 'Bombers carpet-bomb a line through the target.' },
  reinforce: { name: 'Reinforcements', icon: '🛬', req: ['factory', 'radar'], charge: 240, desc: 'A heavy transport parachutes two tanks onto the battlefield.' },
  emp:       { name: 'EMP Strike', icon: '⚡', req: ['tech'], charge: 180, desc: 'An electromagnetic pulse knocks out enemy vehicles, aircraft and defences in a wide area for 12 seconds.' },
};

export function powerStates(f) {
  const P = G.players[f];
  if (!P || G.cfg.powers === false) return [];
  P.powers = P.powers || {};
  const out = [];
  for (const k in POWERS) {
    const d = POWERS[k];
    const has = d.req.every(r => P.owned[r] > 0);
    if (!has) continue;
    const st = P.powers[k] || (P.powers[k] = { charge: 0 });
    out.push({ type: k, ...d, charge: st.charge, ready: st.charge >= d.charge });
  }
  return out;
}

export function updatePowers(dt) {
  for (const f in G.players) {
    if (f === 'neutral') continue;
    const P = G.players[f];
    const powered = P.powerProd >= P.powerUse;
    for (const s of powerStates(f)) {
      const st = P.powers[s.type];
      const before = st.charge;
      st.charge = Math.min(POWERS[s.type].charge, st.charge + dt * (powered ? 1 : 0.5));
      if (before < POWERS[s.type].charge && st.charge >= POWERS[s.type].charge && f === G.player) G.announce?.(`${POWERS[s.type].name} ready`, G.player, 2);
    }
  }
}

export function usePower(f, type, x, z) {
  const P = G.players[f];
  const s = powerStates(f).find(p => p.type === type);
  if (!s || !s.ready) return false;
  P.powers[type].charge = 0;
  emit('power', f, type);
  x = Math.max(-HALF + 8, Math.min(HALF - 8, x)); z = Math.max(-HALF + 8, Math.min(HALF - 8, z));
  if (type === 'recon') recon(f, x, z);
  else if (type === 'paradrop') paradrop(f, x, z);
  else if (type === 'emp') emp(f, x, z);
  else if (type === 'reinforce') reinforce(f, x, z);
  else airstrike(f, x, z);
  if (f !== G.player && type !== 'recon') { G.announce?.(type === 'airstrike' ? 'Warning: enemy aircraft approaching' : type === 'emp' ? 'Warning: enemy EMP strike!' : type === 'reinforce' ? 'Enemy tanks are being dropped in' : 'Enemy paratroopers detected', G.player, 3); G.alertAt = { x, z, t: G.time }; }
  return true;
}

// ---------------------------------------------------------------- recon sweep
function recon(f, x, z) {
  G.visionPings = G.visionPings || [];
  G.visionPings.push({ f, x, z, r: 32, until: G.time + 20 });
  if (f !== G.player) return;
  G.announce?.('Recon sweep', G.player, 1);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 2.4, 1.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.position.set(x, groundY(x, z) + 0.5, z); G.three.scene.add(ring);
  let t = 0;
  decay.push({ update: dt => { t += dt; const r = 32 * Math.min(1, t / 1.2); ring.scale.set(r, 1, r); ring.material.opacity = Math.max(0, 1 - t / 2); if (t > 2) { G.three.scene.remove(ring); return false; } return true; } });
}

// ---------------------------------------------------------------- aircraft
function aircraft(f, big) {
  const t = mats(f), m = M();
  const g = new THREE.Group();
  const s = big ? 1.5 : 1;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * s, 0.35 * s, 6 * s, 12).rotateX(Math.PI / 2), t.team); g.add(body);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.5 * s, 12, 8), m.glass); nose.position.z = 3 * s; nose.scale.z = 1.4; g.add(nose);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(9 * s, 0.15 * s, 1.6 * s), t.teamDark); wing.position.z = 0.2; g.add(wing);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(3 * s, 0.12 * s, 0.9 * s), t.teamDark); tail.position.z = -2.6 * s; g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 1.3 * s, 1 * s), t.team); fin.position.set(0, 0.6 * s, -2.6 * s); g.add(fin);
  for (const x of [-2.4, 2.4]) { const e = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * s, 0.3 * s, 1.4 * s, 10).rotateX(Math.PI / 2), m.darkMetal); e.position.set(x * s, -0.3, 0.4); g.add(e); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
// fly a plane along a straight line over (x, z), coming from the owner's side of the map
function flyOver(f, x, z, big, alt, onUpdate) {
  const home = BASES[f] || { x: -HALF, z: HALF };
  let dx = x - home.x, dz = z - home.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  const plane = aircraft(f, big);
  const start = { x: x - dx * 170, z: z - dz * 170 }, speed = 55;
  plane.position.set(start.x, groundY(x, z) + alt, start.z);
  plane.rotation.y = Math.atan2(dx, dz);
  G.three.scene.add(plane);
  G.sfx?.play('rocket', x, z);
  let d = 0;
  decay.push({ update: dt => {
    d += speed * dt;
    plane.position.x = start.x + dx * d; plane.position.z = start.z + dz * d;
    if (Math.random() < 0.5) FX.trail(plane.position.x - dx * 3, plane.position.y, plane.position.z - dz * 3, false);
    onUpdate?.(d - 170, plane);
    if (d > 360) { G.three.scene.remove(plane); return false; }
    return true;
  } });
  return { dx, dz, timeToTarget: 170 / speed };
}

// ---------------------------------------------------------------- paradrop
function paradrop(f, x, z) {
  if (f === G.player) G.announce?.('Paratroopers inbound', G.player, 1);
  const { timeToTarget } = flyOver(f, x, z, true, 26);
  const squad = ['rifle', 'rifle', 'rifle', 'rifle', 'rocket', 'rocket', 'medic'];
  if (f !== 'wally') squad[6] = 'flamer';
  later(timeToTarget, () => {
    squad.forEach((type, i) => {
      const a = i / squad.length * Math.PI * 2, r = 2.5 + (i % 2) * 1.5;
      const u = new Unit(type, f, x + Math.cos(a) * r, z + Math.sin(a) * r, a);
      u.dropH = 24 + i * 1.2; // falls under a parachute; can't act until it lands
      u.chute = chuteMesh(f); u.mesh.add(u.chute);
    });
  });
}
// Reinforcements: a big transport drops two tanks, each under a pair of parachutes
function reinforce(f, x, z) {
  if (f === G.player) G.announce?.('Reinforcements inbound', G.player, 1);
  const { timeToTarget } = flyOver(f, x, z, true, 30);
  const pair = f === 'wally' ? ['tank', 'tank'] : ['tank', 'inferno'];
  later(timeToTarget, () => {
    pair.forEach((type, i) => {
      const u = new Unit(type, f, x + (i ? 3 : -3), z, 0);
      u.dropH = 28 + i * 2;
      u.chute = chuteMesh(f, 2); u.mesh.add(u.chute);
    });
  });
}
let chuteGeo = null;
function chuteMesh(f, n = 1) {
  if (!chuteGeo) chuteGeo = new THREE.SphereGeometry(1.4, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2.2);
  const g = new THREE.Group();
  if (n > 1) { for (let k = 0; k < n; k++) { const c = chuteMesh(f); c.scale.setScalar(1.6); c.position.set((k - (n - 1) / 2) * 3.2, 0.5, 0); g.add(c); } return g; }
  const c = new THREE.Mesh(chuteGeo, new THREE.MeshStandardMaterial({ color: f === 'wally' ? 0xeeeeee : 0x5a2a20, roughness: 0.8, side: THREE.DoubleSide }));
  c.position.y = 3.2; c.scale.y = 0.7; c.castShadow = true; g.add(c);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; const l = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 2.3, 3), M().black); l.position.set(Math.cos(a) * 0.6, 2.2, Math.sin(a) * 0.6); l.rotation.set(Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45); g.add(l); }
  return g;
}
// called from Unit.update while a paratrooper is still in the air
export function paraFall(u, dt) {
  u.dropH = Math.max(0, u.dropH - dt * 5);
  u.y = groundY(u.x, u.z) + u.dropH;
  u.mesh.position.set(u.x, u.y, u.z);
  u.mesh.rotation.z = Math.sin(G.time * 2 + u.id) * 0.08;
  if (u.dropH <= 0) { u.mesh.remove(u.chute); u.chute = null; u.mesh.rotation.z = 0; FX.dust(u.x, u.z, 1); }
}

// ---------------------------------------------------------------- EMP strike
const EMP_R = 15;
function emp(f, x, z) {
  for (const u of unitsNear(x, z, EMP_R, [])) if (u.faction !== f && u.faction !== 'neutral' && !u.isInf) u.empT = 12;
  for (const b of G.buildings) if (!b.dead && b.faction !== f && b.faction !== 'neutral' && distTo(b, x, z) < EMP_R && (b.def.weapon || b.def.power < 0)) b.empT = 12;
  // blue shockwave + flash (visual only)
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 2.5, 6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.position.set(x, groundY(x, z) + 0.6, z); G.three.scene.add(ring);
  FX.sparkBurst(x, groundY(x, z) + 2, z, 60, [1.2, 2.5, 5, 1]);
  G.sfx?.play('zap', x, z);
  let t = 0;
  decay.push({ update: dt => { t += dt; const r = EMP_R * Math.min(1, t / 0.6); ring.scale.set(r, 1, r); ring.material.opacity = Math.max(0, 1 - t / 1.2); if (t > 1.2) { G.three.scene.remove(ring); return false; } return true; } });
  if (f === G.player) G.announce?.('EMP strike', G.player, 1);
}

// ---------------------------------------------------------------- airstrike
function airstrike(f, x, z) {
  if (f === G.player) G.announce?.('Airstrike inbound', G.player, 1);
  const { dx, dz, timeToTarget } = flyOver(f, x, z, false, 22);
  flyOver(f, x - dz * 6, z + dx * 6, false, 24);
  flyOver(f, x + dz * 6, z - dx * 6, false, 24);
  // a line of bombs centred on the target
  for (let i = 0; i < 9; i++) {
    const off = (i - 4) * 4.2;
    later(timeToTarget + off / 55 + 0.6, () => {
      const bx = x + dx * off + srr(-1.2, 1.2), bz = z + dz * off + srr(-1.2, 1.2);
      const by = groundY(bx, bz);
      FX.explosion(bx, by + 0.5, bz, 1.7, { force: true, sound: i % 2 === 0 });
      blastTrees(bx, bz, 4.5, 200);
      for (const u of unitsNear(bx, bz, 4.5, [])) if (u.faction !== f && !u.air) damage(u, 170 * (1 - Math.hypot(u.x - bx, u.z - bz) / 5), null);
      for (const b of G.buildings) if (!b.dead && b.faction !== f && b.faction !== 'neutral' && distTo(b, bx, bz) < 3.5) damage(b, 140, null);
    });
  }
}

// ---------------------------------------------------------------- AI use
export function aiUsePowers(f, target) {
  for (const s of powerStates(f)) {
    if (!s.ready || !target) continue;
    if (s.type === 'recon') usePower(f, 'recon', target.x, target.z);
    else if (s.type === 'airstrike' || s.type === 'emp') usePower(f, s.type, target.x, target.z);
    else if (s.type === 'reinforce') { const home = BASES[f] || { x: 0, z: 0 }; usePower(f, 'reinforce', home.x + (target.x - home.x) * 0.35, home.z + (target.z - home.z) * 0.35); }
    else if (s.type === 'paradrop') {
      // drop beside the target, not on top of its defences
      const home = BASES[f] || { x: 0, z: 0 };
      const dx = target.x - home.x, dz = target.z - home.z, l = Math.hypot(dx, dz) || 1;
      usePower(f, 'paradrop', target.x - dx / l * 22, target.z - dz / l * 22);
    }
  }
}
