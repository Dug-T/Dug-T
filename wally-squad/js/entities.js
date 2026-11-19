// Units, buildings, projectiles, combat and death.
import * as THREE from 'three';
import { G, nextId, rr, clamp, angleDiff, later, srand, srr, emit } from './state.js';
import { UNITS, BUILDINGS, WEAPONS, WARHEADS, CELL, HALF, GRID, HARVEST_CAPACITY, FACTIONS, WATER_LEVEL, hasMut } from './config.js';
import { T, heightAt, groundY, normalAt, cellOf, cellCenter, idx, isWalkable, isVisibleAt, inGrid, blastTrees } from './terrain.js';
import { makeUnitModel, makeBuildingModel, makeRubble, charModel } from './models.js';
import { findPath, nearestFree } from './pathfind.js';
import * as FX from './particles.js';
import { M } from './materials.js';
import { selectRingTexture } from './textures.js';
import { techEffect } from './features.js';
import { paraFall } from './powers.js';
import { upg } from './production.js';

const UP = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _n = new THREE.Vector3();
export const byId = new Map();
export const decay = []; // corpses, wrecks, falling things: {update(dt) -> bool keep}

export const isEnemy = (a, b) => a.faction !== b.faction;
export const alive = e => e && !e.dead && !e.removed;

// ------------------------------------------------------------------ selection ring
const ringGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
function makeRing(r, color) {
  const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ map: selectRingTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.scale.set(r * 2.4, 1, r * 2.4); m.renderOrder = 5;
  return m;
}

// ------------------------------------------------------------------ spatial hash
const HS = 4, HN = Math.ceil(GRID * CELL / HS);
const buckets = Array.from({ length: HN * HN }, () => []);
// Veterans earn a nickname (cosmetic only, so ordinary randomness is fine here)
const NICK_INF = ['Biscuit', 'Sparky', 'Ace', 'Tank', 'Noodles', 'Moose', 'Ziggy', 'Bubbles', 'Hammer', 'Pickles', 'Boots', 'Rocket', 'Waffles', 'Duke', 'Scruffy', 'Tiny', 'Banjo', 'Crumpet'];
const NICK_VEH = ['Big Bertha', 'Old Rusty', 'Thunderpants', 'The Kettle', 'Mean Machine', 'Lucky', 'Bulldozer', 'Rumbles', 'Sir Tanks-a-lot', 'Iron Granny', 'The Toaster', 'Clanky'];
const NICK_DOG = ['Rex', 'Fido', 'Chomper', 'Sir Barksalot', 'Muttley', 'Woofles', 'Fang', 'Biscuit'];
function nickname(u) {
  const pool = u.type === 'dog' ? NICK_DOG : u.isInf ? NICK_INF : NICK_VEH;
  const used = new Set(G.units.filter(o => o.nick).map(o => o.nick));
  const free = pool.filter(n => !used.has(n)), name = (free.length ? free : pool)[Math.floor(Math.random() * (free.length || pool.length))];
  return u.isInf && u.type !== 'dog' ? `${['Pvt.', 'Cpl.', 'Sgt.'][Math.floor(Math.random() * 3)]} ${name}` : name;
}

// Units riding in an APC or garrisoning a bunker get out around the host.
export function ejectPassengers(host, hurt = 0, killer = null) {
  const list = (host.passengers || []).filter(u => !u.dead);
  // aircraft drop their troops on the nearest flat, dry ground below them
  let cx = host.x, cz = host.z;
  if (host.air && list.length && !list[0].canStand(cx, cz)) {
    let found = false;
    for (let r = 2; r <= 8 && !found; r += 2) for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, x = host.x + Math.cos(a) * r, z = host.z + Math.sin(a) * r; if (list[0].canStand(x, z)) { cx = x; cz = z; found = true; break; } }
    if (!found) { if (host.faction === G.player) G.ui?.message('Can\'t unload here - fly over flat, dry ground first'); return 0; }
  }
  host.passengers = [];
  const base = host.kind === 'unit' ? host.heading + Math.PI : 0;
  const R = host.air ? 1.8 : host.kind === 'unit' ? 2.6 : Math.max(host.def.w, host.def.h) * CELL / 2 + 1.6;
  list.forEach((u, i) => {
    const a = base + (i - (list.length - 1) / 2) * 0.6;
    u.boarded = null;
    u.x = cx + Math.sin(a) * R; u.z = cz + Math.cos(a) * R;
    if (!u.canStand(u.x, u.z)) { let ok = false; for (let k = 1; k < 12; k++) { const b = a + k * 0.55; const x = cx + Math.sin(b) * R, z = cz + Math.cos(b) * R; if (u.canStand(x, z)) { u.x = x; u.z = z; ok = true; break; } } if (!ok) { u.x = cx; u.z = cz; } }
    u.y = groundY(u.x, u.z);
    u.heading = a; u.mesh.visible = true; u.order = null; u.path = null; u.target = null;
  });
  if (hurt) for (const u of list) damage(u, u.maxHp * hurt, killer);
  return list.length;
}
export const capacityOf = e => (e && e.def && (e.def.transport || e.def.garrison)) || 0;

const _gm = new THREE.Vector3();
export function rebuildHash() {
  for (const b of buckets) b.length = 0;
  for (const u of G.units) {
    if (u.dead || u.boarded) continue;
    const bx = clamp(Math.floor((u.x + HALF) / HS), 0, HN - 1), bz = clamp(Math.floor((u.z + HALF) / HS), 0, HN - 1);
    buckets[bz * HN + bx].push(u);
  }
}
export function unitsNear(x, z, r, out = []) {
  out.length = 0;
  const x0 = clamp(Math.floor((x - r + HALF) / HS), 0, HN - 1), x1 = clamp(Math.floor((x + r + HALF) / HS), 0, HN - 1);
  const z0 = clamp(Math.floor((z - r + HALF) / HS), 0, HN - 1), z1 = clamp(Math.floor((z + r + HALF) / HS), 0, HN - 1);
  for (let j = z0; j <= z1; j++) for (let i = x0; i <= x1; i++) for (const u of buckets[j * HN + i]) if ((u.x - x) ** 2 + (u.z - z) ** 2 <= r * r) out.push(u);
  return out;
}

// distance from point to an entity's edge
export function distTo(e, x, z) {
  if (e.kind === 'building') {
    const hw = e.def.w * CELL / 2, hd = e.def.h * CELL / 2;
    const dx = Math.max(0, Math.abs(x - e.x) - hw), dz = Math.max(0, Math.abs(z - e.z) - hd);
    return Math.hypot(dx, dz);
  }
  return Math.hypot(e.x - x, e.z - z) - (e.def.radius || 0) * 0.5;
}
export function aimPoint(e) {
  if (e.kind === 'building') return { x: e.x + srr(-0.6, 0.6) * e.def.w, y: e.baseY + 1.2 + srand() * 1.2, z: e.z + srr(-0.6, 0.6) * e.def.h };
  return { x: e.x, y: e.y + (e.def.air ? 0.2 : e.def.armor === 'infantry' ? 1.0 : 1.1), z: e.z };
}
export const FACIDX = { wally: 1, grim: 2 };
function canTarget(w, e) {
  if (!alive(e)) return false;
  if (e.boarded) return false;
  if (e.cloaked) return false;
  if (e.kind === 'building' && e.def.isMine) return false;
  const air = e.kind === 'unit' && e.def.air;
  return air ? w.air : w.ground;
}

// ================================================================== UNIT
export class Unit {
  constructor(type, faction, x, z, heading = 0) {
    this.id = nextId(); this.kind = 'unit'; this.type = type; this.def = UNITS[type]; this.faction = faction;
    this.x = x; this.z = z; this.y = groundY(x, z); this.heading = heading; this.turretYaw = heading;
    this.hp = this.def.hp; this.maxHp = this.def.hp;
    if (upg(faction, this.def.armor === 'infantry' ? 'bodyarmor' : 'armor')) { this.hp *= 1.25; this.maxHp *= 1.25; }
    this.path = null; this.pi = 0; this.order = null; this.target = null; this.cool = 0; this.cool2 = 0;
    this.speedNow = 0; this.walkPhase = Math.random() * 6; this.scanT = srand() * 0.5; this.stuckT = 0; this.lastPos = { x, z };
    this.kills = 0; this.rank = hasMut(G.cfg, 'veterans') && faction !== 'neutral' ? 1 : 0; this.idleT = 0;
    this.weapon = this.def.weapon ? WEAPONS[this.def.weapon] : null;
    this.weapon2 = this.def.weapon2 ? WEAPONS[this.def.weapon2] : null;
    this.isInf = this.def.armor === 'infantry';
    this.air = !!this.def.air;
    this.altitude = this.air ? 9 : 0;
    // harvester
    this.load = 0; this.hState = 'seek'; this.hT = 0;
    this.mesh = makeUnitModel(type, faction);
    this.turret = this.mesh.getObjectByName('turret');
    this.barrel = this.mesh.getObjectByName('barrel');
    this.rotor = this.mesh.getObjectByName('rotor');
    this.tailrotor = this.mesh.getObjectByName('tailrotor');
    this.legs = []; this.mesh.traverse(o => { if (o.name === 'leg') this.legs.push(o); });
    this.tail = this.mesh.getObjectByName('tail');
    this.cape = this.mesh.getObjectByName('cape'); this.barrels = this.mesh.getObjectByName('barrels');
    this.loadMesh = this.mesh.getObjectByName('load');
    this.fans = this.mesh.getObjectByName('fans');
    this.rotor2 = this.mesh.getObjectByName('rotor2');
    if (!this.isInf && !this.air) { this.lights = makeHeadlights(this.def.radius); this.mesh.add(this.lights); }
    G.three.scene.add(this.mesh);
    this.ring = null;
    G.units.push(this); byId.set(this.id, this);
    this.syncMesh(0);
  }

  get selectable() { return !this.dead; }

  setSelected(on) {
    this.selected = on;
    if (on && !this.ring) {
      this.ring = makeRing(this.def.radius + (this.isInf ? 0.3 : 0.4), this.faction === G.player ? 0x55ff77 : 0xff5544);
      this.ring.position.y = 0.15; this.mesh.add(this.ring);
      if (this.isInf) this.ring.scale.multiplyScalar(1 / (this.type === 'wally' ? 1.15 : 1));
    }
    if (this.ring) this.ring.visible = on;
  }

  // ---------------------------------------------------- orders
  moveTo(x, z, opts = {}) {
    if (!opts.keepWaypoints) this.waypoints = null;
    this.order = { type: opts.attackMove ? 'attackMove' : 'move', x, z };
    if (opts.patrol) this.order.patrol = opts.patrol;
    if (!opts.keepTarget) this.target = null;
    this.requestPath(x, z);
    if (this.type === 'harvester' && !opts.harvest) this.hState = 'manual';
  }
  attack(target) {
    if (!alive(target)) return;
    if (this.type === 'engineer' && !target.def.explosive) { this.order = { type: 'capture', target }; this.requestPath(target.x, target.z, target.kind === 'building' ? target.id : 0); return; }
    if (this.type === 'wally' && target.kind === 'building') { this.order = { type: 'c4', target }; this.requestPath(target.x, target.z, target.id); return; }
    if (!this.weapon) { this.moveTo(target.x, target.z); return; }
    this.order = { type: 'attack', target };
    this.target = target;
    this.path = null;
  }
  // Wally Man's special ability: Gatling Frenzy
  frenzy() {
    if ((this.type !== 'wallyman' && this.type !== 'warlord') || this.frenzyCD > 0 || this.dead) return false;
    if (this.type === 'warlord') {
      // War Cry: every friendly fighter close by (and Grak himself) fires much faster for 6 seconds
      this.frenzyCD = 55;
      for (const u of G.units) if (!u.dead && !u.boarded && u.faction === this.faction && u.weapon && Math.hypot(u.x - this.x, u.z - this.z) < 13) { u.frenzyT = 6; FX.sparkBurst(u.x, u.y + 1.2, u.z, 8, [4, 0.8, 0.3, 1]); }
      FX.sparkBurst(this.x, this.y + 1.6, this.z, 40, [4, 0.8, 0.3, 1]);
      if (isVisibleAt(this.x, this.z)) G.camera.shake = Math.max(G.camera.shake || 0, 0.4);
    } else {
      this.frenzyT = 8; this.frenzyCD = 45;
      FX.sparkBurst(this.x, this.y + 1.2, this.z, 30, [3.5, 1.5, 0.4, 1]);
    }
    if (this.faction === G.player) G.sfx?.play('promote', this.x, this.z);
    return true;
  }
  // ---- APC transport ----
  board(apc) {
    if (!this.isInf || !alive(apc) || !capacityOf(apc)) return;
    this.order = { type: 'board', target: apc };
    this.target = null;
    this.requestPath(apc.x, apc.z, apc.kind === 'building' ? apc.id : 0);
  }
  boardLogic() {
    const apc = this.order.target;
    if (!alive(apc) || apc.faction !== this.faction || (apc.passengers || []).length >= capacityOf(apc)) { this.order = null; this.path = null; return; }
    if (apc.kind === 'building' ? distTo(apc, this.x, this.z) < 1.8 : Math.hypot(apc.x - this.x, apc.z - this.z) < 2.8) {
      apc.passengers = apc.passengers || [];
      apc.passengers.push(this);
      this.boarded = apc; this.order = null; this.path = null; this.target = null;
      this.setSelected(false); this.mesh.visible = false;
      if (G.selection.includes(this)) G.selection = G.selection.filter(s => s !== this);
      if (this.faction === G.player) G.sfx?.play('click', this.x, this.z);
      return;
    }
    if (!this.path) this.requestPath(apc.x, apc.z, apc.kind === 'building' ? apc.id : 0);
  }
  unload() { return ejectPassengers(this); }
  stop() { this.order = null; this.target = null; this.path = null; if (this.type === 'harvester') this.hState = 'seek'; }

  requestPath(x, z, ignoreId = 0) {
    if (this.air) { this.path = [{ x, z }]; this.pi = 0; return; }
    this.path = findPath(this.x, this.z, x, z, { ignoreId, gate: FACIDX[this.faction], hover: !!this.def.hover });
    this.pi = 0; this.stuckT = 0;
    this.pathGoal = { x, z, ignoreId };
  }

  // ---------------------------------------------------- update
  update(dt) {
    if (this.dead) return;
    if (this.dropH > 0) { paraFall(this, dt); return; } // still floating down under a parachute
    if (this.boarded) { this.x = this.boarded.x; this.z = this.boarded.z; this.y = this.boarded.y; return; } // riding inside an APC
    if (this.order && this.order.type === 'board') { this.boardLogic(); }
    if (this.def.selfRepair && this.hp < this.maxHp * 0.5) this.hp = Math.min(this.maxHp * 0.5, this.hp + 6 * dt);
    if (this.rank >= 2 && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + (this.rank >= 3 ? 6 : 2) * dt);
    if (this.rank >= 3 && Math.random() < dt * 3 && this.mesh.visible) FX.sparkBurst(this.x, this.y + (this.isInf ? 1.9 : 2.4), this.z, 1, [4, 3.2, 0.8, 1]); // golden glint
    if (this.empT > 0) { this.empT -= dt; if (Math.random() < dt * 10 && this.mesh.visible) FX.sparkBurst(this.x, this.y + 1.2, this.z, 2, [1.2, 2.5, 5, 1]); this.path = null; this.syncMesh(dt); return; } // knocked out by an EMP
    this.cool -= dt; this.cool2 -= dt;
    if (this.frenzyCD > 0) this.frenzyCD -= dt;
    if (this.frenzyT > 0) {
      this.frenzyT -= dt;
      if (Math.random() < dt * 20) FX.sparkBurst(this.x, this.y + 1.2, this.z, 2, [3.5, 1.2, 0.4, 1]);
    }

    if (this.def.stealth) {
      this.cloakT = (this.cloakT || 0) - dt;
      if (this.cloakT <= 0) {
        this.cloakT = 0.3;
        let near = G.time - (this.lastFire ?? -99) < 2.5 || this.hp < this.maxHp * 0.25;
        if (!near) for (const o of unitsNear(this.x, this.z, 5.5, cloakBuf)) if (o.faction !== this.faction && !o.dead) { near = true; break; }
        if (!near) for (const b of G.buildings) if (!b.dead && b.faction !== this.faction && !b.def.isMine && distTo(b, this.x, this.z) < 4) { near = true; break; }
        // recon drones see through the cloak
        if (!near) for (const o of G.units) if (o.def.detector && !o.dead && o.faction !== this.faction && Math.hypot(o.x - this.x, o.z - this.z) < o.def.detector) { near = true; break; }
        this.cloaked = !near;
      }
    }
    if (this.def.heals || this.def.repairs) this.medicLogic(dt);
    else if (this.type === 'harvester') this.harvestLogic(dt);
    else if (this.order && (this.order.type === 'capture' || this.order.type === 'c4')) this.specialLogic(dt);
    else this.combatLogic(dt);

    this.moveLogic(dt);
    this.syncMesh(dt);
  }

  combatLogic(dt) {
    const w = this.weapon;
    if (!w) { if (this.order && this.order.type !== 'move') this.order = null; return; }
    // validate target
    if (this.target && (!alive(this.target) || !canTarget(w, this.target) && !(this.weapon2 && canTarget(this.weapon2, this.target)))) {
      this.target = null;
      if (this.order && this.order.type === 'attack') { this.order = null; this.path = null; }
    }
    // auto-acquire
    this.scanT -= dt;
    const mayScan = (!this.order || this.order.type === 'attackMove') && this.stance !== 'holdfire';
    if (this.scanT <= 0) {
      this.scanT = 0.4 + srand() * 0.2;
      if (!this.target && mayScan) {
        const t = this.findTarget(this.stance === 'hold' ? w.range * (upg(this.faction, 'optics') ? 1.2 : 1) : this.def.sight * G.sightMult * (upg(this.faction, 'optics') ? 1.2 : 1));
        if (t) { this.target = t; this.guardPos = this.guardPos || { x: this.x, z: this.z }; }
      }
      if (this.target && this.target.kind === 'building' && mayScan && this.order?.type !== 'attack') {
        // prefer units over buildings when auto-targeting
        const t = this.findTarget(this.def.sight * G.sightMult, true);
        if (t) this.target = t;
      }
    }
    if (!this.target) {
      if (!this.order && this.guardPos && !this.path) {
        if (Math.hypot(this.x - this.guardPos.x, this.z - this.guardPos.z) > 3) this.requestPath(this.guardPos.x, this.guardPos.z);
        this.guardPos = null;
      }
      if (this.order && this.order.type === 'attackMove' && !this.path) this.requestPath(this.order.x, this.order.z);
      this.aimTurret(dt, null);
      return;
    }
    const t = this.target;
    const d = distTo(t, this.x, this.z);
    const useW = canTarget(w, t) ? w : this.weapon2;
    const range = useW.range * (this.rank ? 1.05 : 1) * (upg(this.faction, 'optics') ? 1.2 : 1);
    // leash for auto targets
    if ((!this.order || this.order.type !== 'attack') && this.guardPos && Math.hypot(this.x - this.guardPos.x, this.z - this.guardPos.z) > this.def.sight * (this.target === this.retal ? 3 : 1.6) && this.order?.type !== 'attackMove') { // chase whoever shot us further
      this.target = null; this.path = null; return;
    }
    if ((d > range || (useW.minRange && d < useW.minRange)) && this.stance === 'hold' && (!this.order || this.order.type !== 'attack')) { this.target = null; return; } // hold position: never chase
    if (d > range || (useW.minRange && d < useW.minRange)) {
      // chase
      if (useW.minRange && d < useW.minRange) {
        const a = Math.atan2(this.x - t.x, this.z - t.z);
        if (!this.path) this.requestPath(this.x + Math.sin(a) * 8, this.z + Math.cos(a) * 8);
      } else {
        this.chaseT = (this.chaseT || 0) - dt;
        if (!this.path || this.chaseT <= 0) {
          this.chaseT = 1.2;
          if (this.air) { const a = Math.atan2(t.x - this.x, t.z - this.z); this.path = [{ x: t.x - Math.sin(a) * range * 0.7, z: t.z - Math.cos(a) * range * 0.7 }]; this.pi = 0; }
          else this.requestPath(t.x, t.z, t.kind === 'building' ? t.id : 0);
        }
      }
      this.aimTurret(dt, t);
      return;
    }
    // in range: stop and shoot
    if (this.path) { this.path = null; }
    if (!(this.frenzyCD > 0) && (this.type === 'wallyman' || this.type === 'warlord') && G.players[this.faction]?.isAI) this.frenzy();
    const aimed = this.aimTurret(dt, t);
    if (aimed && this.cool <= 0 && canTarget(w, t)) {
      this.cool = w.rof * (0.9 + srand() * 0.2) * (this.frenzyT > 0 ? 0.4 : 1);
      fireWeapon(this, w, t, this.mesh.userData.muzzle, this.turret);
      if (w.twin) later(0.14, () => { if (alive(this) && alive(t)) fireWeapon(this, w, t, this.mesh.userData.muzzle2 || this.mesh.userData.muzzle, this.turret); });
    }
    if (this.weapon2 && this.cool2 <= 0 && canTarget(this.weapon2, t) && d <= this.weapon2.range && aimed) {
      this.cool2 = this.weapon2.rof;
      fireWeapon(this, this.weapon2, t, new THREE.Vector3(1.2, 0.5, 0.3), this.turret);
      later(0.18, () => { if (alive(this) && alive(t)) fireWeapon(this, this.weapon2, t, new THREE.Vector3(-1.2, 0.5, 0.3), this.turret); });
    }
  }

  medicLogic(dt) {
    this.scanT -= dt;
    if (this.scanT <= 0) {
      this.scanT = 0.5;
      if (!this.healTarget || this.healTarget.dead || this.healTarget.hp >= this.healTarget.maxHp) {
        this.healTarget = null;
        let bd = 1e9;
        for (const u of unitsNear(this.x, this.z, this.def.sight, healBuf)) {
          if (u === this || u.faction !== this.faction || u.boarded || u.hp >= u.maxHp || (this.def.repairs ? u.isInf || u.air : !u.isInf)) continue;
          const d = Math.hypot(u.x - this.x, u.z - this.z);
          if (d < bd) { bd = d; this.healTarget = u; }
        }
      }
      const h = this.healTarget;
      if (h && !this.order && Math.hypot(h.x - this.x, h.z - this.z) > (this.def.repairs ? 3.5 : 2.5)) this.requestPath(h.x, h.z);
    }
    const h = this.healTarget;
    if (h && !h.dead && Math.hypot(h.x - this.x, h.z - this.z) < (this.def.repairs ? 4.5 : 3)) {
      if (this.path && !this.order) this.path = null;
      h.hp = Math.min(h.maxHp, h.hp + (this.def.repairs ? 28 : 16) * dt);
      if (Math.random() < dt * 8) FX.sparkBurst(h.x, h.y + 1.2, h.z, 2, this.def.repairs ? [4, 3, 1, 1] : [1, 4, 1.5, 1]);
      this.heading += clamp(angleDiff(this.heading, Math.atan2(h.x - this.x, h.z - this.z)), -dt * 8, dt * 8);
    }
  }

  findTarget(range, unitsOnly = false) {
    let best = null, bd = 1e9;
    const w = this.weapon, w2 = this.weapon2;
    for (const u of G.units) {
      if (u.dead || u.boarded || u.faction === this.faction || u.faction === 'neutral') continue;
      if (!canTarget(w, u) && !(w2 && canTarget(w2, u))) continue;
      const d = Math.hypot(u.x - this.x, u.z - this.z);
      if (d > range) continue;
      // prefer things we hurt well
      const wh = WARHEADS[(canTarget(w, u) ? w : w2).warhead][u.def.armor] || 0.1;
      const score = d / (0.3 + wh) + (u.type === 'harvester' ? 3 : 0);
      if (score < bd) { bd = score; best = u; }
    }
    if (best || unitsOnly) return best;
    for (const b of G.buildings) {
      if (b.dead || b.faction === this.faction || b.faction === 'neutral' || !w.ground || b.def.isMine || b.def.isWall) continue;
      const d = distTo(b, this.x, this.z);
      if (d > range) continue;
      const score = d + (b.def.weapon ? -5 : 5);
      if (score < bd) { bd = score; best = b; }
    }
    return best;
  }

  // rotate turret (or body) toward target; returns true when aimed
  aimTurret(dt, t) {
    if (!t) {
      if (this.turret) this.turretYaw += angleDiff(this.turretYaw, this.heading) * Math.min(1, dt * 2);
      return false;
    }
    const want = Math.atan2(t.x - this.x, t.z - this.z);
    if (this.turret) {
      const d = angleDiff(this.turretYaw, want);
      const rate = 3.2 * dt;
      this.turretYaw += clamp(d, -rate, rate);
      return Math.abs(d) < 0.08;
    }
    // no turret: rotate whole body (infantry, gunship)
    if (!this.path || this.isInf || this.air) {
      const d = angleDiff(this.heading, want);
      const rate = (this.isInf ? 9 : this.air ? 3 : this.def.turnRate || 3) * dt;
      this.heading += clamp(d, -rate, rate);
      return Math.abs(d) < 0.15;
    }
    return false;
  }

  specialLogic(dt) {
    const o = this.order, t = o.target;
    if (!alive(t)) { this.order = null; this.path = null; return; }
    const d = distTo(t, this.x, this.z);
    if (d < 1.6) {
      this.path = null;
      if (o.type === 'capture') {
        if (t.kind === 'building') {
          if (t.faction === this.faction) { t.hp = t.maxHp; G.announce?.('Building repaired', this.faction); }
          else { t.capture(this.faction); }
          FX.teleportSwirl(this.x, this.y + 0.5, this.z);
          this.remove();
        } else this.order = null;
      } else if (o.type === 'c4') {
        o.plantT = (o.plantT || 0) + dt;
        if (o.plantT > 1.2) {
          G.sfx?.play('beep', this.x, this.z);
          const target = t;
          later(2.5, () => { if (alive(target)) damage(target, 99999, this, 'c4'); });
          this.order = null;
          const a = Math.atan2(this.x - t.x, this.z - t.z);
          this.moveTo(this.x + Math.sin(a) * 7, this.z + Math.cos(a) * 7);
        }
      }
      return;
    }
    if (!this.path) this.requestPath(t.x, t.z, t.kind === 'building' ? t.id : 0);
  }

  // ---------------------------------------------------- harvesting
  harvestLogic(dt) {
    const s = this.hState;
    if (s === 'manual') { if (!this.path) this.hState = 'seek'; return; }
    if (s === 'seek') {
      if (this.load >= HARVEST_CAPACITY) { this.hState = 'return'; return; }
      this.hT -= dt; if (this.hT > 0) return; this.hT = 1;
      const c = findOre(this.x, this.z, this);
      if (!c) { if (this.load > 0) this.hState = 'return'; return; }
      this.oreCell = c;
      this.requestPath(cellCenter(c % GRID), cellCenter((c / GRID) | 0));
      this.hState = 'toOre';
    } else if (s === 'toOre') {
      const c = this.oreCell;
      if (!(T.ore[c] > 0)) { this.hState = 'seek'; this.hT = 0; return; }
      const cx = cellCenter(c % GRID), cz = cellCenter((c / GRID) | 0);
      if (Math.hypot(cx - this.x, cz - this.z) < 2.2) { this.path = null; this.hState = 'mine'; this.hT = 0.5; }
      else if (!this.path) { this.hState = 'seek'; this.hT = 0.5; }
    } else if (s === 'mine') {
      this.hT -= dt;
      this.heading += dt * 0.6 * Math.sin(G.time * 1.3);
      if (Math.random() < 0.6) {
        const f = this.mesh.localToWorld(_v.set(0, 0.4, 2.4));
        FX.dust(f.x, f.z, 0.8);
        if (Math.random() < 0.3) FX.sparkBurst(f.x, f.y, f.z, 2, T.oreRich[this.oreCell] ? [1, 2, 4, 1] : [1, 4, 2, 1]);
      }
      if (this.hT <= 0) {
        this.hT = 0.4;
        const c = this.oreCell;
        const take = Math.min(35, T.ore[c] || 0);
        if (take <= 0) {
          const n = findOre(this.x, this.z, this, 6);
          if (n !== null && this.load < HARVEST_CAPACITY) { this.oreCell = n; this.hState = 'toOre'; this.requestPath(cellCenter(n % GRID), cellCenter((n / GRID) | 0)); }
          else this.hState = this.load > 0 ? 'return' : 'seek';
          return;
        }
        T.ore[c] -= take; T.oreDirty = true;
        this.load += take * (T.oreRich[c] ? 2 : 1);
        if (this.load >= HARVEST_CAPACITY) { this.load = HARVEST_CAPACITY; this.hState = 'return'; }
      }
    } else if (s === 'return') {
      const r = nearestOwn(this, 'refinery');
      if (!r) { this.hState = 'seek'; this.hT = 3; return; }
      this.refinery = r;
      const dock = r.dockPoint();
      this.requestPath(dock.x, dock.z, r.id);
      this.hState = 'toDock';
    } else if (s === 'toDock') {
      const r = this.refinery;
      if (!alive(r)) { this.hState = 'return'; return; }
      const dock = r.dockPoint();
      const d = Math.hypot(dock.x - this.x, dock.z - this.z);
      if (r.dockedBy && r.dockedBy !== this && alive(r.dockedBy)) {
        if (d < 8) this.path = null; // wait in line
        return;
      }
      if (d < 1.2) { this.path = null; this.hState = 'unload'; this.hT = 0; r.dockedBy = this; }
      else if (!this.path) this.requestPath(dock.x, dock.z, r.id);
    } else if (s === 'unload') {
      const r = this.refinery;
      if (!alive(r)) { this.hState = 'return'; return; }
      const want = Math.PI; // face away to dock
      this.heading += clamp(angleDiff(this.heading, want), -dt * 2, dt * 2);
      this.hT -= dt;
      if (this.hT <= 0) {
        this.hT = 0.25;
        const amt = Math.min(this.load, 50);
        this.load -= amt;
        const P = G.players[this.faction];
        const gain = amt * (P.incomeMult || 1) * (upg(this.faction, 'refining') ? 1.25 : 1) * (hasMut(G.cfg, 'rich') ? 2 : 1);
        P.credits += gain; P.harvested = (P.harvested || 0) + gain;
        if (this.faction === G.player) G.stats.harvested += gain;
        FX.sparkBurst(r.x + 1.8, r.baseY + 1.5, r.z + 1.3, 3, [1, 4, 2, 1]);
        if (this.load <= 0) {
          this.load = 0; r.dockedBy = null; this.hState = 'seek'; this.hT = 0;
          // drive off the pad
          this.path = [{ x: r.x + 1.8, z: r.z + r.def.h * CELL / 2 + 2.5 }]; this.pi = 0;
        }
      }
    }
  }

  // ---------------------------------------------------- movement
  moveLogic(dt) {
    const sp = this.def.speed * (this.rank >= 1 ? 1.05 : 1) * (this.isInf || this.air ? 1 : G.speedMult) * (this.frenzyT > 0 ? 1.35 : 1) * (!this.isInf && upg(this.faction, 'engines') ? 1.15 : 1);
    let moving = false;
    if (this.path && this.pi < this.path.length) {
      const wp = this.path[this.pi];
      const dx = wp.x - this.x, dz = wp.z - this.z, dist = Math.hypot(dx, dz);
      const last = this.pi === this.path.length - 1;
      if (dist < (last ? 0.4 : 1.2)) {
        this.pi++;
        if (this.pi >= this.path.length) {
          this.path = null;
          if (this.order && (this.order.type === 'move' || this.order.type === 'attackMove')) {
            const pt = this.order.patrol;
            this.order = null;
            if (pt) {
              // patrol: walk back to the other end, fighting anything met on the way
              const toA = Math.hypot(this.x - pt.bx, this.z - pt.bz) < Math.hypot(this.x - pt.ax, this.z - pt.az);
              this.moveTo(toA ? pt.ax : pt.bx, toA ? pt.az : pt.bz, { attackMove: true, patrol: pt });
            }
            const w = !pt && this.waypoints && this.waypoints.shift();
            if (w) this.moveTo(w.x, w.z, { attackMove: w.am, keepWaypoints: true });
          }
        }
      } else {
        const want = Math.atan2(dx, dz);
        const diff = angleDiff(this.heading, want);
        const turn = (this.isInf ? 10 : this.air ? 3.5 : (this.def.turnRate || 3.5)) * dt;
        this.heading += clamp(diff, -turn, turn);
        let f = this.isInf ? 1 : Math.max(0, Math.cos(diff));
        if (!this.isInf && !this.air && Math.abs(diff) > 1.0) f = 0; // tanks pivot in place
        const target = sp * f * (last ? Math.min(1, dist / 2 + 0.3) : 1);
        this.speedNow += clamp(target - this.speedNow, -sp * 3 * dt, sp * 2 * dt);
        moving = true;
      }
    } else {
      this.speedNow = Math.max(0, this.speedNow - sp * 4 * dt);
    }
    let vx = Math.sin(this.heading) * this.speedNow, vz = Math.cos(this.heading) * this.speedNow;
    // separation
    const near = unitsNear(this.x, this.z, 3.5, sepBuf);
    for (const o of near) {
      if (o === this || o.air !== this.air) continue;
      const dx = this.x - o.x, dz = this.z - o.z, d = Math.hypot(dx, dz) || 0.01;
      const min = (this.def.radius + o.def.radius) * (this.air ? 2.2 : 1.0);
      if (d < min) {
        let push = (min - d) / min * (this.air ? 4 : 6);
        if (!moving && o.speedNow > 0.5) push *= 1.5; // step aside for moving units
        if (this.type === 'harvester' && this.hState === 'unload') push = 0;
        vx += dx / d * push; vz += dz / d * push;
      }
    }
    let nx = this.x + vx * dt, nz = this.z + vz * dt;
    if (!this.air) {
      if (!this.canStand(nx, nz)) {
        if (this.canStand(nx, this.z)) nz = this.z;
        else if (this.canStand(this.x, nz)) nx = this.x;
        else if (!this.canStand(this.x, this.z)) { /* stuck inside something: allow to escape */ }
        else { nx = this.x; nz = this.z; }
      }
    } else {
      nx = clamp(nx, -HALF + 4, HALF - 4); nz = clamp(nz, -HALF + 4, HALF - 4);
    }
    const moved = Math.hypot(nx - this.x, nz - this.z);
    this.x = nx; this.z = nz;
    // stuck detection -> repath
    if (moving && this.path && !this.air) {
      this.stuckT += dt;
      if (this.stuckT > 1.5) {
        const prog = Math.hypot(this.x - this.lastPos.x, this.z - this.lastPos.z);
        if (prog < 0.8) {
          const g = this.pathGoal || this.path[this.path.length - 1];
          this.repaths = (this.repaths || 0) + 1;
          if (this.repaths > 4) { this.path = null; this.repaths = 0; if (this.order?.type === 'move') this.order = null; }
          else this.requestPath(g.x, g.z, g.ignoreId || 0);
        } else this.repaths = 0;
        this.stuckT = 0; this.lastPos = { x: this.x, z: this.z };
      }
    }
    this.movedAmt = moved / Math.max(dt, 1e-4);
  }
  canStand(x, z) {
    const cx = cellOf(x), cz = cellOf(z);
    if (!inGrid(cx, cz)) return false;
    const i = idx(cx, cz);
    if (T.blocked[i] && !(this.def.hover && T.water[i] && !T.tree[i])) return false;
    const b = T.bld[i];
    if (b) {
      if (this.type === 'harvester' && this.refinery && b === this.refinery.id) return true;
      if (this.pathGoal && this.pathGoal.ignoreId === b) return true;
      if (T.gate[i] && T.gate[i] === FACIDX[this.faction]) return true;
      return false;
    }
    return true;
  }

  // ---------------------------------------------------- visuals
  syncMesh(dt) {
    const m = this.mesh;
    const gy = this.air ? groundY(this.x, this.z) : heightAt(this.x, this.z);
    if (this.air) {
      const targetY = Math.max(gy, WATER_LEVEL) + this.altitude + Math.sin(G.time * 1.7 + this.id) * 0.25;
      this.y += (targetY - this.y) * Math.min(1, dt * 2);
      m.position.set(this.x, this.y, this.z);
      const bank = clamp(-angleDiff(this.prevHeading ?? this.heading, this.heading) / Math.max(dt, 1e-3) * 0.15, -0.4, 0.4);
      this.prevHeading = this.heading;
      this.bank = (this.bank || 0) + (bank - (this.bank || 0)) * Math.min(1, dt * 3);
      m.rotation.set(this.speedNow / this.def.speed * 0.18, this.heading, this.bank, 'YXZ');
      if (this.rotor) this.rotor.rotation.y += dt * 28;
      if (this.rotor2) this.rotor2.rotation.y -= dt * 28;
      if (this.tailrotor) this.tailrotor.rotation.x += dt * 35;
      // rotor wash dust
      if (Math.random() < 0.3 && this.y - gy < 12) FX.dust(this.x + rr(-2, 2), this.z + rr(-2, 2), 1.2);
    } else if (this.isInf) {
      this.y = Math.max(gy, WATER_LEVEL - 0.6);
      // victory: your troops jump for joy
      const cheer = G.won && this.faction === G.player ? Math.abs(Math.sin(G.time * 7 + this.id * 1.3)) * 0.55 : 0;
      m.position.set(this.x, this.y + cheer, this.z);
      m.rotation.set(0, this.heading, 0);
      const walking = this.speedNow > 0.3;
      if (walking) this.walkPhase += dt * this.speedNow * 3.2;
      const sw = walking ? Math.sin(this.walkPhase) * 0.6 : 0;
      if (this.legs[0]) { this.legs[0].rotation.x = sw; this.legs[1].rotation.x = -sw; }
      if (this.tail) this.tail.rotation.y = Math.sin(G.time * (walking ? 18 : 9) + this.id) * 0.6;
      if (this.cape) this.cape.rotation.x = 0.12 + Math.min(1, this.speedNow / 3) * 0.5 + Math.sin(G.time * 7 + this.id) * (walking ? 0.12 : 0.04);
      if (this.barrels) {
        const firing = G.time - (this.lastFire ?? -9) < 0.4;
        this.spin = Math.max(0, Math.min(40, (this.spin || 0) + (firing ? 120 : -50) * dt));
        this.barrels.rotation.z += this.spin * dt;
      }
    } else {
      this.y = this.def.hover ? Math.max(gy, WATER_LEVEL) + 0.15 + Math.sin(G.time * 3 + this.id) * 0.06 : gy; // hovercraft float over water and lava
      if (this.fans) for (const f of this.fans.children) f.rotation.z += dt * 30;
      // tread / tyre tracks behind ground vehicles
      if (!this.def.hover && this.speedNow > 0.5 && this.mesh.visible) {
        this.trackD = (this.trackD || 0) + this.speedNow * dt;
        if (this.trackD > 0.55) { this.trackD = 0; FX.trackMark(this.x - Math.sin(this.heading) * this.def.radius * 0.7, this.z - Math.cos(this.heading) * this.def.radius * 0.7, this.heading, this.def.radius * 0.55); }
      }
      if (this.def.hover && this.speedNow > 1 && Math.random() < dt * 8 && this.mesh.visible) FX.dust(this.x - Math.sin(this.heading) * 1.5, this.z - Math.cos(this.heading) * 1.5, 0.6);
      m.position.set(this.x, this.y, this.z);
      normalAt(this.x, this.z, _n);
      if (!this.sn) this.sn = _n.clone();
      this.sn.lerp(_n, Math.min(1, dt * 6)).normalize();
      _q1.setFromUnitVectors(UP, this.sn);
      _q2.setFromAxisAngle(UP, this.heading);
      m.quaternion.copy(_q1).multiply(_q2);
      if (this.speedNow > 1 && Math.random() < 0.25 * (this.speedNow / this.def.speed)) {
        const back = m.localToWorld(_v.set(rr(-1, 1), 0, -this.def.radius));
        FX.dust(back.x, back.z, this.type === 'buggy' ? 0.9 : 1.2);
      }
    }
    if (this.turret) this.turret.rotation.y = this.turretYaw - this.heading;
    if (this.barrels && !this.isInf) {
      const firing = G.time - (this.lastFire ?? -9) < 0.4;
      this.spin = Math.max(0, Math.min(40, (this.spin || 0) + (firing ? 120 : -50) * dt));
      this.barrels.rotation.z += this.spin * dt;
    }
    if (this.barrel && this.target) {
      // artillery elevation
      const d = distTo(this.target, this.x, this.z);
      this.barrel.rotation.x = -clamp(0.25 + d / 40, 0.25, 0.9);
    }
    if (this.loadMesh) this.loadMesh.visible = this.load > HARVEST_CAPACITY * 0.15;
    // damage smoke
    if (!this.isInf && this.hp < this.maxHp * 0.5 && Math.random() < dt * (this.hp < this.maxHp * 0.25 ? 14 : 6)) {
      if (this.hp < this.maxHp * 0.25) FX.fireSmoke(this.x, this.y + 1.4, this.z, 0.7);
      else FX.blackSmoke(this.x, this.y + 1.4, this.z, 0.8);
    }
    if (this.def.stealth) setCloakLook(this, this.cloaked && this.faction === G.player);
    if (this.lights) this.lights.visible = (G.nightLevel || 0) > 0.3;
    // visibility (fog)
    if (this.faction !== G.player) m.visible = isVisibleAt(this.x, this.z) && !this.cloaked;
  }

  // ---------------------------------------------------- death
  die(killer) {
    if (this.dead) return;
    if (this.passengers && this.passengers.length) ejectPassengers(this, 0.5, killer);
    this.dead = true;
    this.setSelected(false);
    if (this.refinery && this.refinery.dockedBy === this) this.refinery.dockedBy = null;
    if (killer && killer.kind === 'unit' && !killer.dead) {
      killer.kills++;
      if (killer.faction === G.player && killer.kills > (G.mvp?.kills || 0)) G.mvp = { kills: killer.kills, name: killer.hero ? killer.def.name + ' (Hero)' : killer.nick ? `${killer.nick} (${killer.def.name})` : killer.def.name, type: killer.type };
      const r = killer.kills >= 10 ? 3 : killer.kills >= 6 ? 2 : killer.kills >= 3 ? 1 : 0;
      if (r >= 1 && !killer.nick && !killer.hero && killer.faction === G.player) { killer.nick = nickname(killer); G.ui?.message(`🏷 Your ${killer.def.name} has earned a nickname: "${killer.nick}"`); }
      if (r === 3 && killer.rank < 3) { FX.sparkBurst(killer.x, killer.y + 1.5, killer.z, 40, [4, 3.2, 0.8, 1]); if (killer.faction === G.player) G.announce?.(`${killer.def.name} is now HEROIC!`, G.player, 2); emit('heroic', killer); }
      if (r > killer.rank) { killer.rank = r; if (killer.faction === G.player) G.sfx?.play('promote', killer.x, killer.z); }
    }
    if (this.faction === G.player) { G.stats.lost++; G.announce?.('Unit lost', G.player, 6); }
    else if (killer && killer.faction === G.player) G.stats.killed++;
    emit('kill', this, killer);
    const m = this.mesh;
    if (this.isInf) {
      FX.smallHit(this.x, this.y + 1, this.z, 'bullet');
      FX.dust(this.x, this.z, 1);
      G.sfx?.play('scream', this.x, this.z);
      let t = 0; const fall = rr(0.8, 1.4) * (Math.random() < 0.5 ? -1 : 1);
      if (this.legs[0]) { this.legs[0].rotation.x = 0; this.legs[1].rotation.x = 0; }
      decay.push({ update: dt => {
        t += dt;
        m.rotation.x = clamp(t * 4, 0, 1) * fall * 1.3;
        if (t > 4) m.position.y -= dt * 0.4;
        if (t > 6) { G.three.scene.remove(m); return false; }
        return true;
      } });
    } else if (this.air) {
      // spin out of the sky, trailing smoke, then explode on impact
      let vy = 0, spin = 0;
      FX.explosion(this.x, this.y, this.z, 0.8, { ground: false, debris: true });
      decay.push({ update: dt => {
        vy -= 14 * dt; spin += dt * 6;
        m.position.y += vy * dt; m.rotation.y += spin * dt;
        m.position.x += Math.sin(this.heading) * 6 * dt; m.position.z += Math.cos(this.heading) * 6 * dt;
        FX.fireSmoke(m.position.x, m.position.y, m.position.z, 1);
        if (m.position.y <= groundY(m.position.x, m.position.z) + 0.5) {
          FX.explosion(m.position.x, m.position.y, m.position.z, 2.2, {});
          G.three.scene.remove(m); return false;
        }
        return true;
      } });
    } else {
      const big = this.type === 'titan' ? 2.6 : this.type === 'harvester' ? 2.4 : this.type === 'buggy' ? 1.3 : 1.8;
      FX.explosion(this.x, this.y + 0.8, this.z, big, {});
      if (this.type === 'harvester' && this.load > 100) FX.sparkBurst(this.x, this.y + 2, this.z, 40, [1, 4, 2, 1]);
      // pop the turret off!
      const tur = this.turret;
      let tv = null;
      if (tur && Math.random() < 0.7) {
        const wp = tur.getWorldPosition(new THREE.Vector3());
        m.remove(tur); G.three.scene.add(tur); tur.position.copy(wp); tur.rotation.set(0, this.turretYaw, 0);
        charModel(tur);
        tv = { vx: rr(-3, 3), vy: rr(9, 14), vz: rr(-3, 3), sx: rr(-4, 4), sz: rr(-4, 4), rest: false };
      }
      charModel(m);
      let t = 0;
      FX.addEmitter(() => (t < 9 ? { x: this.x, y: this.y + 1.2, z: this.z, intensity: 1 - t / 10 } : null), 10, 'fire');
      decay.push({ update: dt => {
        t += dt;
        if (tv && !tv.rest) {
          tv.vy -= 22 * dt; tur.position.x += tv.vx * dt; tur.position.y += tv.vy * dt; tur.position.z += tv.vz * dt;
          tur.rotation.x += tv.sx * dt; tur.rotation.z += tv.sz * dt;
          FX.fireSmoke(tur.position.x, tur.position.y, tur.position.z, 0.6);
          const gy = groundY(tur.position.x, tur.position.z);
          if (tur.position.y < gy + 0.3) { tur.position.y = gy + 0.3; if (tv.vy < -4) { tv.vy *= -0.3; tv.vx *= 0.4; tv.vz *= 0.4; FX.dust(tur.position.x, tur.position.z, 1.5); } else tv.rest = true; }
        }
        if (t > 14) { m.position.y -= dt * 0.5; if (tur && tv) tur.position.y -= dt * 0.5; }
        if (t > 17) { G.three.scene.remove(m); if (tur && tv) G.three.scene.remove(tur); return false; }
        return true;
      } });
    }
  }
  remove() {
    this.dead = true; this.removed = true; this.setSelected(false);
    G.three.scene.remove(this.mesh);
  }
}
const sepBuf = [], cloakBuf = [], healBuf = [], gateBuf = [];

// --- stealth look: swap to a shimmering glass material while cloaked (own units only)
const cloakMats = {};
function setCloakLook(u, on) {
  if (!!u._cloakLook === on) return;
  u._cloakLook = on;
  if (!cloakMats[u.faction]) cloakMats[u.faction] = new THREE.MeshStandardMaterial({ color: 0x9ad8ff, transparent: true, opacity: 0.22, roughness: 0.1, metalness: 0.9, emissive: 0x2a6a9a, emissiveIntensity: 0.4, depthWrite: false });
  u.mesh.traverse(o => {
    if (!o.isMesh || o === u.ring) return;
    if (on) { o.userData.realMat = o.userData.realMat || o.material; o.material = cloakMats[u.faction]; o.castShadow = false; }
    else if (o.userData.realMat) { o.material = o.userData.realMat; o.castShadow = o.userData.cs ?? true; }
  });
}

// --- fake volumetric lights for the night: beam cones + glowing ground pools
let beamTex = null, poolTex = null;
function lightTextures() {
  if (beamTex) return;
  const c = document.createElement('canvas'); c.width = 4; c.height = 128;
  const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.35, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 4, 128);
  beamTex = new THREE.CanvasTexture(c);
  const c2 = document.createElement('canvas'); c2.width = c2.height = 64;
  const x2 = c2.getContext('2d'); const g2 = x2.createRadialGradient(32, 32, 0, 32, 32, 32);
  g2.addColorStop(0, 'rgba(255,255,255,1)'); g2.addColorStop(0.5, 'rgba(255,255,255,0.35)'); g2.addColorStop(1, 'rgba(255,255,255,0)');
  x2.fillStyle = g2; x2.fillRect(0, 0, 64, 64);
  poolTex = new THREE.CanvasTexture(c2);
}
let beamGeo = null, poolGeo = null, beamMat = null, poolMat = null, searchMat = null;
function lightAssets() {
  lightTextures();
  if (beamGeo) return;
  // cone with its apex at the origin pointing down +z; uv.v=1 at the apex
  beamGeo = new THREE.CylinderGeometry(0.05, 1.6, 9, 16, 1, true).translate(0, -4.5, 0).rotateX(-Math.PI / 2);
  poolGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  beamMat = new THREE.MeshBasicMaterial({ color: 0xfff1c8, map: beamTex, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  poolMat = new THREE.MeshBasicMaterial({ color: 0xffe6b0, map: poolTex, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  searchMat = beamMat.clone(); searchMat.color.set(0xd8ecff); searchMat.opacity = 0.16;
}
function makeHeadlights(r) {
  lightAssets();
  const g = new THREE.Group();
  for (const s of [-0.5, 0.5]) {
    const b = new THREE.Mesh(beamGeo, beamMat); b.position.set(s * r, 0.9, r * 1.1); b.rotation.x = 0.22; b.scale.set(0.6, 0.6, 1); g.add(b);
  }
  const pool = new THREE.Mesh(poolGeo, poolMat); pool.scale.set(5, 1, 8); pool.position.set(0, 0.2, r + 5.5); g.add(pool);
  g.visible = false;
  return g;
}
function makeSearchlight(h) {
  lightAssets();
  const g = new THREE.Group();
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), M().lampWhite); lamp.position.y = h; g.add(lamp);
  const b = new THREE.Mesh(beamGeo, searchMat); b.position.y = h; b.rotation.x = 0.55; b.scale.set(1.3, 1.3, 2.2); g.add(b);
  const pool = new THREE.Mesh(poolGeo, poolMat); pool.scale.set(7, 1, 7); pool.position.set(0, 0.25 - h * 0 + 0.1, h / Math.tan(0.55) * 1.0 + 4); g.add(pool);
  g.visible = false;
  return g;
}

function nearestOwn(u, type) {
  let best = null, bd = 1e9;
  for (const b of G.buildings) {
    if (b.dead || b.faction !== u.faction || b.type !== type) continue;
    const d = Math.hypot(b.x - u.x, b.z - u.z);
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}

export function findOre(x, z, harv, maxR = 60) {
  const cx = cellOf(x), cz = cellOf(z);
  const R = Math.ceil(maxR / CELL);
  let best = null, bd = 1e9;
  const claimed = new Set();
  for (const u of G.units) if (u !== harv && u.type === 'harvester' && !u.dead && u.oreCell != null && (u.hState === 'mine' || u.hState === 'toOre')) claimed.add(u.oreCell);
  for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
    const X = cx + i, Z = cz + j;
    if (!inGrid(X, Z)) continue;
    const k = idx(X, Z);
    if (!(T.ore[k] > 30) || T.bld[k]) continue;
    let d = i * i + j * j;
    if (claimed.has(k)) d += 40;
    if (T.oreRich[k]) d *= 0.7;
    if (d < bd) { bd = d; best = k; }
  }
  return best;
}

// ================================================================== BUILDING
export class Building {
  constructor(type, faction, cx, cz, instant = false) {
    this.id = nextId(); this.kind = 'building'; this.type = type; this.def = BUILDINGS[type]; this.faction = faction;
    this.cx = cx; this.cz = cz;
    this.x = cellCenter(cx) - CELL / 2 + this.def.w * CELL / 2;
    this.z = cellCenter(cz) - CELL / 2 + this.def.h * CELL / 2;
    this.hp = this.def.hp; this.maxHp = this.def.hp;
    this.cool = 0; this.turretYaw = Math.PI * 0.75 + (faction === 'grim' ? Math.PI : 0);
    this.rally = null; this.repairing = false; this.dockedBy = null;
    if (!this.def.noFootprint) for (let j = 0; j < this.def.h; j++) for (let i = 0; i < this.def.w; i++) { T.bld[idx(cx + i, cz + j)] = this.id; if (this.def.isGate) T.gate[idx(cx + i, cz + j)] = FACIDX[faction]; }
    if (this.def.instant) instant = instant || this.def.isMine;
    // ground level: highest corner so nothing clips into the slope
    let hmax = -1e9, hmin = 1e9;
    for (let j = 0; j <= this.def.h; j++) for (let i = 0; i <= this.def.w; i++) {
      const h = heightAt(cellCenter(cx) - CELL / 2 + i * CELL, cellCenter(cz) - CELL / 2 + j * CELL);
      hmax = Math.max(hmax, h); hmin = Math.min(hmin, h);
    }
    this.baseY = hmax;
    this.buildAnim = instant ? 1 : 0;
    this.makeMesh();
    G.buildings.push(this); byId.set(this.id, this);
    if (!instant) G.sfx?.play('build', this.x, this.z);
  }
  makeMesh() {
    if (this.mesh) G.three.scene.remove(this.mesh);
    const m = makeBuildingModel(this.type, this.faction);
    this.mesh = new THREE.Group();
    this.mesh.add(m);
    this.model = m;
    // skirt so the foundation never floats on slopes
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(this.def.w * CELL - 0.1, 4, this.def.h * CELL - 0.1), M().concreteDark);
    skirt.position.y = -2.1; skirt.receiveShadow = true;
    if (this.def.w > 1) this.mesh.add(skirt);
    this.mesh.position.set(this.x, this.baseY, this.z);
    this.turret = m.getObjectByName('turret');
    this.crane = m.getObjectByName('crane');
    this.door = m.getObjectByName('door');
    this.dish = m.getObjectByName('dish');
    this.core = m.getObjectByName('core');
    this.parts = m.userData.parts || {};
    this.gateDoor = m.getObjectByName('gatedoor');
    this.pump = m.getObjectByName('pump');
    if (['conyard', 'turret', 'radar', 'plasma'].includes(this.type)) { this.search = makeSearchlight(this.type === 'conyard' ? 7 : this.type === 'radar' ? 4.2 : 3.2); this.mesh.add(this.search); }
    if (this.def.isMine) this.mesh.visible = this.faction === G.player;
    G.three.scene.add(this.mesh);
    if (this.selected) { this.ring = null; this.setSelected(true); }
  }
  setSelected(on) {
    this.selected = on;
    if (on && !this.ring) {
      const r = Math.max(this.def.w, this.def.h) * CELL * 0.6;
      this.ring = makeRing(r, this.faction === G.player ? 0x55ff77 : 0xff5544);
      this.ring.position.y = 0.4;
      this.mesh.add(this.ring);
    }
    if (this.ring) this.ring.visible = on;
  }
  dockPoint() { return { x: this.x + 1.8, z: this.z + 1.3 }; }
  exitPoint() {
    const z = this.z + this.def.h * CELL / 2 + 1.5;
    const f = nearestFree(cellOf(this.x), cellOf(z), 6);
    return f ? { x: cellCenter(f.x), z: cellCenter(f.z) } : { x: this.x, z };
  }
  get powered() { const P = G.players[this.faction]; return P.powerProd >= P.powerUse; }

  capture(faction) {
    const old = this.faction;
    this.faction = faction;
    if (this.dockedBy) this.dockedBy = null;
    this.repairing = false;
    if (this.def.isGate) for (let j = 0; j < this.def.h; j++) for (let i = 0; i < this.def.w; i++) T.gate[idx(this.cx + i, this.cz + j)] = FACIDX[faction];
    this.makeMesh();
    if (faction === G.player) G.announce?.('Building captured', G.player);
    emit('capture', this, faction);
    if (old === G.player) G.announce?.('Building lost', G.player);
    if (this.selected && faction !== G.player) { G.selection = G.selection.filter(s => s !== this); this.setSelected(false); }
  }

  update(dt) {
    if (this.dead) return;
    // build-up animation
    if (this.buildAnim < 1) {
      this.buildAnim = Math.min(1, this.buildAnim + dt / 1.6);
      const k = this.buildAnim;
      this.model.scale.set(1, Math.max(0.02, 1 - Math.pow(1 - k, 3)), 1);
      if (Math.random() < 0.8) FX.buildSparks(this.x + rr(-1, 1) * this.def.w, this.baseY + k * 3, this.z + rr(-1, 1) * this.def.h);
      if (Math.random() < 0.3) FX.dust(this.x + rr(-1, 1) * this.def.w, this.z + rr(-1, 1) * this.def.h, 1.5);
    }
    const t = G.time;
    if (this.def.isMine) { this.mineLogic(dt); return; }
    if (this.gateDoor) {
      this.gateT = (this.gateT || 0) - dt;
      if (this.gateT <= 0) { this.gateT = 0.25; this.gateOpen = unitsNear(this.x, this.z, 5, gateBuf).some(u => u.faction === this.faction && !u.air); }
      const want = this.gateOpen ? -0.95 : 1.05;
      this.gateDoor.position.y += (want - this.gateDoor.position.y) * Math.min(1, dt * 5);
    }
    if (this.search) {
      const on = (G.nightLevel || 0) > 0.3 && this.powered;
      this.search.visible = on;
      if (on) this.search.rotation.y = Math.sin(t * 0.35 + this.id * 1.7) * 2.2 + this.id;
    }
    if (this.crane) this.crane.rotation.y = Math.sin(t * 0.3 + this.id) * 1.6;
    if (this.dish) this.dish.rotation.y += dt * (this.powered ? 0.8 : 0.05);
    if (this.core) { this.core.rotation.y += dt * 1.5; this.core.rotation.x = Math.sin(t) * 0.3; this.core.position.y = (this.type === 'plasma' ? 4.7 : 3.4) + Math.sin(t * 2) * 0.1; }
    if (this.door) {
      const open = this.doorOpen > 0 ? 1 : 0; this.doorOpen = Math.max(0, (this.doorOpen || 0) - dt);
      this.door.position.y += ((open ? 3.6 : 1.4) - this.door.position.y) * Math.min(1, dt * 4);
    }
    if (this.parts.steam && Math.random() < dt * 3 && isVisibleAt(this.x, this.z)) {
      for (const p of this.parts.steam) if (Math.random() < 0.6) {
        const w = this.mesh.localToWorld(_v.copy(p));
        FX.steam(w.x, w.y, w.z);
      }
    }
    // repair
    if (this.repairing) {
      const P = G.players[this.faction];
      const rate = this.maxHp * 0.04 * dt, cost = this.def.cost * 0.4 * (rate / this.maxHp);
      if (this.hp >= this.maxHp) this.repairing = false;
      else if (P.credits >= cost) { P.credits -= cost; this.hp = Math.min(this.maxHp, this.hp + rate); if (Math.random() < dt * 6) FX.buildSparks(this.x + rr(-1, 1) * this.def.w, this.baseY + rr(1, 3), this.z + rr(-1, 1) * this.def.h); }
    }
    // damage fire
    const frac = this.hp / this.maxHp;
    if (frac < 0.6 && Math.random() < dt * (frac < 0.3 ? 10 : 4)) {
      const px = this.x + rr(-0.4, 0.4) * this.def.w * CELL, pz = this.z + rr(-0.4, 0.4) * this.def.h * CELL;
      if (frac < 0.3) FX.fireSmoke(px, this.baseY + 2, pz, 1.2); else FX.blackSmoke(px, this.baseY + 2.2, pz, 1.2);
    }
    if (this.empT > 0) { this.empT -= dt; if (Math.random() < dt * 8 && this.mesh.visible) FX.sparkBurst(this.x + rr(-1, 1) * this.def.w, this.baseY + 2, this.z + rr(-1, 1) * this.def.h, 2, [1.2, 2.5, 5, 1]); }
    // defensive weapon
    if (this.def.weapon && this.buildAnim >= 1 && !(this.empT > 0)) this.defend(dt);
    if (this.passengers && this.passengers.length) this.garrisonFire(dt);
    // Wonder: counts down to victory once finished
    if (this.def.wonder && this.buildAnim >= 1) {
      const before = this.wonderT || 0; this.wonderT = before + dt;
      const left = 300 - this.wonderT, was = 300 - before;
      for (const mark of [240, 180, 120, 60, 30, 10]) if (was > mark && left <= mark) {
        const mine = this.faction === G.player;
        G.announce?.(mine ? `Victory Monument: ${mark >= 60 ? mark / 60 + ' minute' + (mark > 60 ? 's' : '') : mark + ' seconds'} to victory!` : `Warning: enemy monument completes in ${mark >= 60 ? mark / 60 + ' minute' + (mark > 60 ? 's' : '') : mark + ' seconds'}!`, G.player, 1);
        if (!mine) G.alertAt = { x: this.x, z: this.z, t: G.time };
      }
      if (Math.random() < dt * 4 && this.mesh.visible) FX.sparkBurst(this.x + rr(-2, 2), this.baseY + rr(3, 7), this.z + rr(-2, 2), 2, [4, 3.2, 0.8, 1]);
    }
    if (this.def.tech) techEffect(this, dt);
    if (this.faction !== G.player) this.mesh.visible = !!T.explored[idx(cellOf(this.x), cellOf(this.z))] || G.revealed;
  }

  defend(dt) {
    const w = WEAPONS[this.def.weapon];
    if (w.needsPower && !this.powered) { if (this.core) this.core.visible = Math.sin(G.time * 8) > 0; return; }
    if (this.core) this.core.visible = true;
    this.cool -= dt;
    this.scanT = (this.scanT || 0) - dt;
    if (this.target && (!alive(this.target) || distTo(this.target, this.x, this.z) > w.range + 1 || !canTarget(w, this.target))) this.target = null;
    if (!this.target && this.scanT <= 0) {
      this.scanT = 0.3;
      let best = null, bd = 1e9;
      for (const u of G.units) {
        if (u.dead || u.faction === this.faction || !canTarget(w, u)) continue;
        const d = Math.hypot(u.x - this.x, u.z - this.z);
        if (d < w.range && d < bd) { bd = d; best = u; }
      }
      this.target = best;
    }
    const t = this.target;
    if (!t) { if (this.turret) this.turret.rotation.y += dt * 0.2; return; }
    let aimed = true;
    if (this.turret) {
      const want = Math.atan2(t.x - this.x, t.z - this.z);
      const d = angleDiff(this.turretYaw, want);
      this.turretYaw += clamp(d, -dt * 3, dt * 3);
      this.turret.rotation.y = this.turretYaw;
      aimed = Math.abs(d) < 0.1;
    }
    if (aimed && this.cool <= 0) {
      this.cool = w.rof;
      const mz = this.parts.muzzle || new THREE.Vector3(0, 2, 0);
      fireWeapon(this, w, t, mz, this.turret || this.model);
      if (w.twin && this.parts.muzzle2) later(0.16, () => { if (alive(this) && alive(t)) fireWeapon(this, w, t, this.parts.muzzle2, this.turret || this.model); });
    }
  }

  // garrisoned infantry shoot out of the bunker's firing slits with extra range
  garrisonFire(dt) {
    this.passengers = this.passengers.filter(p => !p.dead);
    for (const p of this.passengers) {
      const w = p.weapon;
      p.x = this.x; p.z = this.z;
      if (!w) continue;
      p.cool -= dt;
      const range = w.range * 1.25 + Math.max(this.def.w, this.def.h);
      if (p.target && (!alive(p.target) || p.target.faction === this.faction || distTo(p.target, this.x, this.z) > range || !canTarget(w, p.target))) p.target = null;
      p.scanT -= dt;
      if (!p.target && p.scanT <= 0) {
        p.scanT = 0.35 + srand() * 0.2;
        let best = null, bd = 1e9;
        for (const u of G.units) {
          if (u.dead || u.boarded || u.faction === this.faction || u.faction === 'neutral' || !canTarget(w, u)) continue;
          if (u.cloaked && u.faction !== G.player) continue;
          const d = Math.hypot(u.x - this.x, u.z - this.z);
          if (d < range && d < bd) { bd = d; best = u; }
        }
        if (!best && w.building !== false) for (const b of G.buildings) {
          if (b.dead || b.faction === this.faction || b.faction === 'neutral' || b.def.isMine) continue;
          const d = distTo(b, this.x, this.z);
          if (d < range && d < bd) { bd = d; best = b; }
        }
        p.target = best;
      }
      if (p.target && p.cool <= 0) {
        p.cool = w.rof * (0.9 + srand() * 0.2);
        const a = Math.atan2(p.target.x - this.x, p.target.z - this.z);
        _gm.set(Math.sin(a) * 1.6, 1.45, Math.cos(a) * 1.6);
        fireWeapon(p, w, p.target, _gm, this.model);
      }
    }
  }

  mineLogic(dt) {
    this.mesh.visible = this.faction === G.player;
    this.scanT = (this.scanT || 0) - dt;
    if (this.scanT > 0) return;
    this.scanT = 0.15;
    const trig = unitsNear(this.x, this.z, 1.6, gateBuf).find(u => u.faction !== this.faction && !u.air && !u.dead);
    if (!trig) return;
    FX.explosion(this.x, this.baseY + 0.3, this.z, 1.5, { force: true });
    for (const u of unitsNear(this.x, this.z, 3.5, gateBuf.slice())) {
      if (u.faction === this.faction || u.air) continue;
      const k = 1 - Math.hypot(u.x - this.x, u.z - this.z) / 4;
      damage(u, 420 * k * (u.def.armor === 'infantry' ? 1.2 : 1), this);
    }
    this.dead = true; G.three.scene.remove(this.mesh);
  }

  die(killer) {
    if (this.dead) return;
    if (this.def.explosive) {
      // fuel barrels: a big fireball that hurts everyone nearby - including other barrels (chain reactions!)
      this.dead = true; this.setSelected(false);
      for (let j = 0; j < this.def.h; j++) for (let i = 0; i < this.def.w; i++) if (T.bld[idx(this.cx + i, this.cz + j)] === this.id) T.bld[idx(this.cx + i, this.cz + j)] = 0;
      G.three.scene.remove(this.mesh);
      FX.explosion(this.x, this.baseY + 1, this.z, 2.6, { force: true });
      const x = this.x, z = this.z;
      later(0.15, () => {
        blastTrees(x, z, 5, 160);
        for (const u of unitsNear(x, z, 6.5, [])) if (!u.air && !u.dead) damage(u, 170 * Math.max(0, 1 - Math.hypot(u.x - x, u.z - z) / 7), killer);
        for (const b of G.buildings) if (!b.dead && distTo(b, x, z) < 5) damage(b, b.def.explosive ? 999 : 140 * (1 - distTo(b, x, z) / 5), killer); // barrels set each other off
      });
      emit('kill', this, killer);
      return;
    }
    if (this.passengers && this.passengers.length) ejectPassengers(this, 0.3, killer);
    if (this.def.isMine || this.def.isWall || this.def.isGate) {
      this.dead = true; this.setSelected(false);
      for (let j = 0; j < this.def.h; j++) for (let i = 0; i < this.def.w; i++) if (T.bld[idx(this.cx + i, this.cz + j)] === this.id) { T.bld[idx(this.cx + i, this.cz + j)] = 0; T.gate[idx(this.cx + i, this.cz + j)] = 0; }
      FX.explosion(this.x, this.baseY + 1, this.z, this.def.isGate ? 1.4 : 0.9, {});
      const rub = makeRubble(this.def.w * CELL, this.def.h * CELL); rub.position.set(this.x, this.baseY, this.z); G.three.scene.add(rub);
      G.three.scene.remove(this.mesh);
      let t = 0; decay.push({ update: dt => { t += dt; if (t > 30) { G.three.scene.remove(rub); return false; } return true; } });
      return;
    }
    this.dead = true;
    this.setSelected(false);
    if (killer && killer.kind === 'unit' && !killer.dead) killer.kills++;
    if (this.faction === G.player) { G.announce?.('Structure lost', G.player); }
    else if (killer && killer.faction === G.player) G.stats.killed++;
    emit('kill', this, killer);
    for (let j = 0; j < this.def.h; j++) for (let i = 0; i < this.def.w; i++) if (T.bld[idx(this.cx + i, this.cz + j)] === this.id) { T.bld[idx(this.cx + i, this.cz + j)] = 0; T.gate[idx(this.cx + i, this.cz + j)] = 0; }
    // chain of explosions then a big one
    const W = this.def.w * CELL, D = this.def.h * CELL;
    const n = 3 + this.def.w * 2;
    for (let i = 0; i < n; i++) {
      later((i * 140 + Math.random() * 80) / 1000, () => FX.explosion(this.x + rr(-0.45, 0.45) * W, this.baseY + rr(0.5, 3), this.z + rr(-0.45, 0.45) * D, rr(0.9, 1.6), { force: false, sound: i % 2 === 0 }));
    }
    const big = Math.max(this.def.w, this.def.h);
    later(n * 0.14, () => {
      FX.explosion(this.x, this.baseY + 1.5, this.z, 1.6 + big * 0.55, {});
      FX.shake(this.x, this.z, 0.6);
      const rub = makeRubble(W, D);
      rub.position.set(this.x, this.baseY, this.z);
      rub.visible = this.mesh.visible;
      G.three.scene.add(rub);
      let t = 0;
      FX.addEmitter(() => (t < 25 ? { x: this.x + rr(-0.3, 0.3) * W, y: this.baseY + 0.8, z: this.z + rr(-0.3, 0.3) * D, intensity: 1 - t / 25, size: 1.4 } : null), 6, 'fire');
      decay.push({ update: dt => { t += dt; if (t > 60) { rub.position.y -= dt * 0.2; } if (t > 70) { G.three.scene.remove(rub); return false; } return true; } });
    });
    // the structure itself crumbles and sinks
    const mesh = this.mesh; let t = 0;
    decay.push({ update: dt => {
      t += dt;
      mesh.position.y -= dt * (t < n * 0.14 ? 0.5 : 4);
      mesh.rotation.z = Math.sin(t * 30) * 0.01 * Math.min(1, t);
      if (t > n * 0.14 + 0.6) { G.three.scene.remove(mesh); return false; }
      return true;
    } });
  }

  sell() {
    if (this.dead) return;
    if (this.passengers && this.passengers.length) ejectPassengers(this);
    const P = G.players[this.faction];
    P.credits += Math.round(this.def.cost * 0.5 * this.hp / this.maxHp);
    G.sfx?.play('sell', this.x, this.z);
    this.dead = true; this.setSelected(false);
    for (let j = 0; j < this.def.h; j++) for (let i = 0; i < this.def.w; i++) if (T.bld[idx(this.cx + i, this.cz + j)] === this.id) { T.bld[idx(this.cx + i, this.cz + j)] = 0; T.gate[idx(this.cx + i, this.cz + j)] = 0; }
    // a couple of survivors walk out
    const crew = Math.min(3, Math.floor(this.def.cost / 600));
    for (let i = 0; i < crew; i++) {
      const p = this.exitPoint();
      const u = new Unit('rifle', this.faction, p.x + srr(-1, 1), p.z + srr(-1, 1));
      u.moveTo(u.x + srr(-3, 3), u.z + srr(1, 4));
    }
    const mesh = this.mesh; let t = 0;
    decay.push({ update: dt => {
      t += dt; this.model.scale.y = Math.max(0.01, 1 - t / 1.2);
      if (Math.random() < 0.6) FX.dust(this.x + rr(-1, 1) * this.def.w, this.z + rr(-1, 1) * this.def.h, 1.5);
      if (t > 1.2) { G.three.scene.remove(mesh); return false; }
      return true;
    } });
  }
}


// ================================================================== WEAPONS / PROJECTILES
const projMats = {};
function projMesh(kind) {
  let g, m;
  if (!projMats[kind]) {
    if (kind === 'bullet' || kind === 'sniper') { g = new THREE.BoxGeometry(0.06, 0.06, 1.4); m = new THREE.MeshBasicMaterial({ color: kind === 'sniper' ? new THREE.Color(3, 3, 4) : new THREE.Color(4, 3, 1.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }); }
    else if (kind === 'shell' || kind === 'artillery') { g = new THREE.SphereGeometry(kind === 'artillery' ? 0.22 : 0.15, 8, 6); g.scale(1, 1, 2.2); m = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.4, 0.8) }); }
    else { // rocket / missile
      const b = [new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8).rotateX(Math.PI / 2), new THREE.ConeGeometry(0.08, 0.25, 8).rotateX(Math.PI / 2).translate(0, 0, 0.47)];
      g = b[0]; m = M().darkMetal; void b;
    }
    projMats[kind] = { g, m };
  }
  const p = projMats[kind];
  const mesh = new THREE.Mesh(p.g, p.m);
  mesh.renderOrder = 3;
  return mesh;
}
const pools = {};
function getProj(kind) {
  pools[kind] = pools[kind] || [];
  const m = pools[kind].pop() || projMesh(kind);
  m.visible = true; G.three.scene.add(m);
  return m;
}
function freeProj(kind, m) { G.three.scene.remove(m); pools[kind].push(m); }

const _mz = new THREE.Vector3();
export function fireWeapon(src, w, target, muzzleLocal, frame) {
  src.lastFire = G.time;
  if (src.cloaked) { src.cloaked = false; src.cloakT = 0.3; }
  const obj = frame || src.mesh;
  obj.updateWorldMatrix(true, false);
  const mz = obj.localToWorld(_mz.copy(muzzleLocal || new THREE.Vector3(0, 1, 1)));
  const tp = aimPoint(target);
  const dx = tp.x - mz.x, dz = tp.z - mz.z, dl = Math.hypot(dx, dz) || 1;
  const vis = isVisibleAt(mz.x, mz.z) || isVisibleAt(tp.x, tp.z);
  if (vis) G.sfx?.play(w.sound, mz.x, mz.z);
  const kind = w.proj;
  if (kind === 'melee') { hit(src, w, target, tp); if (vis) FX.smallHit(tp.x, tp.y, tp.z, 'bullet'); return; } // bites and punches
  if (kind === 'beam') {
    FX.beam(mz.x, mz.y, mz.z, tp.x, tp.y, tp.z);
    FX.smallHit(tp.x, tp.y, tp.z, 'plasma');
    hit(src, w, target, tp);
    return;
  }
  if (kind === 'flame') {
    // stream of fire: particles + damage over time
    const dy = (tp.y - mz.y) / dl;
    for (let i = 0; i < 3; i++) FX.flame(mz.x, mz.y, mz.z, dx / dl, dy, dz / dl);
    later(0.2, () => { if (alive(target)) hit(src, w, target, aimPoint(target)); });
    return;
  }
  const size = kind === 'bullet' ? 0.5 : kind === 'shell' ? (w.damage > 80 ? 1.8 : 1.4) : kind === 'artillery' ? 2.2 : kind === 'sniper' ? 0.6 : 1;
  FX.muzzle(mz.x, mz.y, mz.z, dx / dl, dz / dl, size);
  if (kind === 'bullet' && vis && src.kind === 'unit' && Math.random() < 0.6) FX.casing(mz.x, mz.y, mz.z, Math.atan2(dx, dz));
  // recoil
  if (src.turret && (kind === 'shell' || kind === 'artillery')) src.recoil = 1;
  const speed = { bullet: 110, sniper: 220, shell: 70, rocket: 30, missile: 40, artillery: 0 }[kind];
  const p = { kind, src, w, target, x: mz.x, y: mz.y, z: mz.z, tx: tp.x, ty: tp.y, tz: tp.z, speed, t: 0, faction: src.faction };
  if (kind === 'artillery') {
    const scatter = 1.5;
    p.tx += srr(-scatter, scatter); p.tz += srr(-scatter, scatter); p.ty = groundY(p.tx, p.tz);
    p.flight = 1.2 + dl / 22; p.x0 = mz.x; p.y0 = mz.y; p.z0 = mz.z;
    p.arc = 6 + dl * 0.45;
  }
  if (kind === 'rocket' || kind === 'missile') { p.wob = srand() * 6; p.vy = 4 + srand() * 3; }
  p.mesh = getProj(kind === 'missile' ? 'rocket' : kind);
  p.mesh.position.set(p.x, p.y, p.z);
  p.mesh.visible = vis;
  G.projectiles.push(p);
}

export function updateProjectiles(dt) {
  for (let i = G.projectiles.length - 1; i >= 0; i--) {
    const p = G.projectiles[i];
    p.t += dt;
    let done = false;
    if (alive(p.target) && p.kind !== 'artillery') {
      const tp = p.target.kind === 'unit' ? aimPoint(p.target) : null;
      if (tp) { p.tx = tp.x; p.ty = tp.y; p.tz = tp.z; }
    }
    if (p.kind === 'artillery') {
      const k = Math.min(1, p.t / p.flight);
      const nx = p.x0 + (p.tx - p.x0) * k, nz = p.z0 + (p.tz - p.z0) * k;
      const ny = p.y0 + (p.ty - p.y0) * k + Math.sin(k * Math.PI) * p.arc;
      p.mesh.lookAt(nx, ny, nz);
      p.x = nx; p.y = ny; p.z = nz;
      FX.shellTrail(nx, ny, nz);
      if (Math.random() < 0.5) FX.trail(nx, ny, nz, false);
      if (k >= 1) done = true;
    } else {
      const dx = p.tx - p.x, dy = p.ty - p.y, dz = p.tz - p.z, d = Math.hypot(dx, dy, dz);
      let step = p.speed * dt;
      if (p.kind === 'rocket' || p.kind === 'missile') {
        // slight corkscrew and initial lift
        p.vy = Math.max(0, (p.vy || 0) - dt * 10);
        const wob = Math.sin(p.t * 14 + p.wob) * 0.4 * Math.min(1, d / 6);
        const ux = dx / d, uz = dz / d;
        p.x += (ux * step) + (-uz * wob * dt * 6);
        p.z += (uz * step) + (ux * wob * dt * 6);
        p.y += (dy / d) * step + p.vy * dt;
        FX.trail(p.x, p.y, p.z, p.kind === 'missile');
      } else {
        if (step > d) step = d;
        p.x += dx / d * step; p.y += dy / d * step; p.z += dz / d * step;
        if (p.kind === 'shell') FX.shellTrail(p.x, p.y, p.z);
      }
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.lookAt(p.tx, p.ty, p.tz);
      if (d < 0.6 + p.speed * dt * 0.5 || p.t > 6) done = true;
    }
    p.mesh.position.set(p.x, p.y, p.z);
    if (done) {
      G.projectiles.splice(i, 1);
      freeProj(p.kind === 'missile' ? 'rocket' : p.kind, p.mesh);
      impact(p);
    }
  }
}

function impact(p) {
  const { kind, w } = p;
  const vis = isVisibleAt(p.tx, p.tz);
  if (kind === 'bullet' || kind === 'sniper') FX.smallHit(p.tx, p.ty, p.tz, kind);
  else if (kind === 'shell') FX.explosion(p.tx, p.ty, p.tz, w.damage > 80 ? 0.75 : 0.6, { debris: false, sound: vis, ground: p.ty - groundY(p.tx, p.tz) < 1.5 });
  else if (kind === 'rocket' || kind === 'missile') FX.explosion(p.tx, p.ty, p.tz, 0.55, { debris: false, sound: vis, ground: p.ty - groundY(p.tx, p.tz) < 1.5 });
  else if (kind === 'artillery') FX.explosion(p.tx, p.ty, p.tz, 1.3, { sound: vis });
  if (kind === 'artillery') { splash(p.src, w, p.tx, p.tz, w.splash, p.faction); return; }
  if (alive(p.target)) hit(p.src, w, p.target, { x: p.tx, y: p.ty, z: p.tz });
}

function hit(src, w, target, at) {
  let dmg = w.damage * (src.rank === 3 ? 1.75 : src.rank === 2 ? 1.5 : src.rank === 1 ? 1.25 : 1) * (upg(src.faction, 'shells') ? 1.2 : 1);
  damage(target, dmg * (WARHEADS[w.warhead][target.kind === 'building' ? 'building' : target.def.armor] ?? 1), src);
  if (w.splash) splash(src, w, at.x, at.z, w.splash, src.faction, target);
}

function splash(src, w, x, z, r, faction, except) {
  if (r >= 1.5) blastTrees(x, z, r * 0.8, w.damage);
  const near = unitsNear(x, z, r + 1, []);
  for (const u of near) {
    if (u === except || u.faction === faction || u.air) continue;
    const d = Math.hypot(u.x - x, u.z - z);
    const k = Math.max(0, 1 - d / (r + 0.5));
    if (k > 0) damage(u, w.damage * k * (WARHEADS[w.warhead][u.def.armor] ?? 1), src);
  }
  for (const b of G.buildings) {
    if (b.dead || b === except || b.faction === faction) continue;
    const d = distTo(b, x, z);
    if (d < r) damage(b, w.damage * (1 - d / r) * WARHEADS[w.warhead].building, src);
  }
}

const helpBuf = [];
// should u switch to attacking `src`, which just shot it (or a friend)?
function retaliate(u, src) {
  if (u.dead || u.boarded || !u.weapon || u.stance === 'holdfire' || u.def.heals || u.def.repairs) return;
  if (u.order && u.order.type !== 'attackMove') return; // a direct order (move, attack, board...) wins
  const can = canTarget(u.weapon, src) || (u.weapon2 && canTarget(u.weapon2, src));
  if (!can) return;
  const cur = u.target;
  if (cur && alive(cur) && cur !== src) {
    // keep a unit target we can already hit; drop buildings and out-of-range targets for the shooter
    const w = canTarget(u.weapon, cur) ? u.weapon : u.weapon2;
    if (cur.kind === 'unit' && w && distTo(cur, u.x, u.z) <= w.range) return;
  }
  if (u.stance === 'hold') { const w = canTarget(u.weapon, src) ? u.weapon : u.weapon2; if (distTo(src, u.x, u.z) > w.range) return; }
  u.target = src; u.retal = src;
  u.guardPos = u.guardPos || { x: u.x, z: u.z };
}

export function damage(target, amount, src, kind) {
  if (!alive(target)) return;
  if (kind === 'c4') {
    FX.explosion(target.x, (target.baseY || 0) + 1, target.z, 2.5, {});
    amount = target.maxHp * 2;
  }
  if (G.god && target.faction === G.player) return; // GODMODE cheat
  if (hasMut(G.cfg, 'glass')) amount *= 1.75;
  target.hp -= amount;
  target.lastHit = G.time;
  // how hot the fighting is for the player (drives the dynamic music; never read by the simulation)
  if (target.faction === G.player || (src && src.faction === G.player)) G.combatHeat = Math.min(40, (G.combatHeat || 0) + Math.min(amount, 250) / 60);
  if (target.faction === G.player && src && src.faction !== G.player) {
    if (target.kind === 'building') G.announce?.('Our base is under attack', G.player, 20);
    else G.announce?.('Unit under attack', G.player, 30);
    G.alertAt = { x: target.x, z: target.z, t: G.time };
  }
  // fight back: infantry and vehicles turn on whoever shoots them, and idle friends nearby join in
  if (target.kind === 'unit' && src && alive(src) && src.faction !== target.faction && src.faction !== 'neutral') {
    retaliate(target, src);
    if (G.time - (target.helpT ?? -9) > 1) {
      target.helpT = G.time;
      for (const u of unitsNear(target.x, target.z, 11, helpBuf)) if (u !== target && u.faction === target.faction && !u.target && !u.order) retaliate(u, src);
    }
  }
  if (target.kind === 'unit' && target.type === 'harvester' && src && alive(src) && target.hState !== 'unload') {
    // harvesters flee home when attacked
    if (srand() < 0.05) { target.hState = 'return'; }
  }
  G.onDamage?.(target, src);
  if (target.hp <= 0) { target.hp = 0; target.die(src); }
}

export function updateDecay(dt) {
  for (let i = decay.length - 1; i >= 0; i--) if (!decay[i].update(dt)) decay.splice(i, 1);
}

export function cleanupDead() {
  for (let i = G.units.length - 1; i >= 0; i--) if (G.units[i].dead) { byId.delete(G.units[i].id); G.units.splice(i, 1); }
  for (let i = G.buildings.length - 1; i >= 0; i--) if (G.buildings[i].dead) { byId.delete(G.buildings[i].id); G.buildings.splice(i, 1); }
  if (G.selection.some(s => s.dead)) G.selection = G.selection.filter(s => !s.dead);
}

export function spawnUnit(type, faction, x, z, heading) { return new Unit(type, faction, x, z, heading); }
export { FACTIONS };
