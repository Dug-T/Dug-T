// Extra battlefield features: supply crates, neutral tech buildings and the match history graphs.
// Everything that affects the game uses the seeded RNG so online games stay in sync.
import * as THREE from 'three';
import { G, srand, srr, emit } from './state.js';
import { CELL, GRID, UNITS, HALF } from './config.js';
import { T, idx, inGrid, cellOf, cellCenter, heightAt, BASES, revealAll, currentMap, isWalkable } from './terrain.js';
import { Unit, unitsNear, alive, damage, decay } from './entities.js';
import { forcePlace } from './missions.js';
import * as FX from './particles.js';
import { M } from './materials.js';

// ------------------------------------------------------------------ supply crates
const crates = [];
let crateT = 40;
let crateGeo = null;
function crateMesh() {
  const g = new THREE.Group();
  if (!crateGeo) crateGeo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
  const box = new THREE.Mesh(crateGeo, new THREE.MeshStandardMaterial({ color: 0xc8963c, roughness: 0.7, map: M().metal.map, emissive: 0x6a4a10, emissiveIntensity: 0.25 }));
  box.castShadow = true; g.add(box);
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.18, 1.14), M().hazard); g.add(band);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.25, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 2, 0.6), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.position.y = -0.5; g.add(ring); g.userData.ring = ring; g.userData.box = box;
  return g;
}

function spawnCrate() {
  for (let tries = 0; tries < 60; tries++) {
    const cx = 10 + Math.floor(srand() * (GRID - 20)), cz = 10 + Math.floor(srand() * (GRID - 20));
    const i = idx(cx, cz);
    if (T.blocked[i] || T.bld[i] || T.ore[i]) continue;
    const x = cellCenter(cx), z = cellCenter(cz);
    let nearBase = false; for (const k in BASES) if (Math.hypot(x - BASES[k].x, z - BASES[k].z) < 38) nearBase = true;
    if (nearBase || crates.some(c => Math.hypot(c.x - x, c.z - z) < 20)) continue;
    const c = { x, z, y: heightAt(x, z), mesh: crateMesh(), t: 0 };
    c.mesh.position.set(x, c.y + 0.6, z);
    G.three.scene.add(c.mesh);
    crates.push(c);
    return;
  }
}

const BONUSES = ['money', 'money', 'bigmoney', 'heal', 'veteran', 'reinforce', 'reveal', 'trap'];
function pickUp(c, u) {
  const kind = BONUSES[Math.floor(srand() * BONUSES.length)];
  emit('crate', u.faction, kind);
  const P = G.players[u.faction];
  const mine = u.faction === G.player;
  let msg = '';
  FX.sparkBurst(c.x, c.y + 1, c.z, 30, [3, 2.6, 1, 1]);
  if (kind === 'money' || kind === 'bigmoney') { const n = kind === 'money' ? 1000 : 2500; P.credits += n; msg = `Supply crate: +$${n}`; }
  else if (kind === 'heal') { for (const o of unitsNear(c.x, c.z, 14, [])) if (o.faction === u.faction) o.hp = o.maxHp; msg = 'Supply crate: units fully repaired'; }
  else if (kind === 'veteran') { for (const o of unitsNear(c.x, c.z, 10, [])) if (o.faction === u.faction && o.rank < 2) { o.rank++; o.kills = Math.max(o.kills, o.rank === 2 ? 6 : 3); } msg = 'Supply crate: units promoted!'; }
  else if (kind === 'reinforce') {
    for (const [t, dx, dz] of [['rifle', -1.5, 0], ['rifle', 1.5, 0], ['rocket', 0, 1.5], ['rocket', 0, -1.5]]) new Unit(t, u.faction, c.x + dx, c.z + dz, u.heading);
    FX.teleportSwirl(c.x, c.y, c.z); msg = 'Supply crate: reinforcements!';
  } else if (kind === 'reveal') {
    if (mine) { revealAll(true); setTimeout(() => { if (!G.revealed) revealAll(false); }, 20000); }
    msg = 'Supply crate: map revealed for 20 seconds';
  } else {
    FX.explosion(c.x, c.y + 0.5, c.z, 1.6, { force: true });
    for (const o of unitsNear(c.x, c.z, 4, [])) damage(o, 220, null);
    msg = 'Supply crate: it was booby-trapped!';
  }
  if (mine) { G.announce?.(msg.replace('Supply crate: ', ''), G.player, 1); G.ui?.message(msg); G.sfx?.play('ready'); }
}

// ---- Bounty Convoy: every few minutes an armoured cash truck crosses the map from one edge to the other.
// Whoever destroys it gets the bounty; if it reaches the far side it escapes. Runs in the sim (online-safe).
let convoyT = 240, convoy = null;
export function convoyActive() { return convoy && !convoy.dead ? convoy : null; }
export function updateConvoy(dt) {
  if (G.cfg.convoys === false || !['skirmish', 'mp', 'watch'].includes(G.cfg.mode) || G.over) return;
  if (convoy) {
    if (convoy.dead) { convoy = null; convoyT = srr(200, 300); return; }
    if (Math.hypot(convoy.x - convoy.goal.x, convoy.z - convoy.goal.z) < 6) {
      G.announce?.('The bounty convoy got away!', G.player, 2);
      convoy.remove(); convoy = null; convoyT = srr(200, 300); return;
    }
    if (!convoy.order && !convoy.path) convoy.moveTo(convoy.goal.x, convoy.goal.z);
    return;
  }
  convoyT -= dt;
  if (convoyT > 0) return;
  // pick the pair of opposite map edges that keeps furthest from both bases
  // the map rim is often mountains, so walk each end inward until it reaches open ground
  const E = HALF - 10, raw = [[0, -E, 0, E], [-E, 0, E, 0], [-E, -E, E, E], [-E, E, E, -E]];
  const inward = (x, z) => { for (let k = 1; k >= 0.3; k -= 0.04) if (isWalkable(cellOf(x * k), cellOf(z * k))) return [x * k, z * k]; return null; };
  const opts = [];
  for (const [x, z, x2, z2] of raw) { const a = inward(x, z), b = inward(x2, z2); if (a && b) opts.push([...a, ...b], [...b, ...a]); }
  const bases = Object.values(BASES), score = ([x, z, x2, z2]) => Math.min(...bases.map(b => Math.min(Math.hypot(b.x - x, b.z - z), Math.hypot(b.x - x2, b.z - z2))));
  const ok = opts.filter(o => score(o) > 40 && Math.hypot(o[2] - o[0], o[3] - o[1]) > 90);
  if (!ok.length) { convoyT = 60; return; }
  const [x, z, x2, z2] = ok[Math.floor(srand() * ok.length)];
  convoy = new Unit('convoy', 'neutral', x, z, Math.atan2(x2 - x, z2 - z));
  convoy.goal = { x: x2, z: z2 };
  convoy.stance = 'holdfire';
  convoy.moveTo(x2, z2);
  G.announce?.(`A bounty convoy is crossing the map! Destroy it for $${UNITS.convoy.bounty.toLocaleString()}`, G.player, 3);
  G.alertAt = { x, z, t: G.time };
}

export function updateCrates(dt) {
  if (G.cfg.crates === false) return;
  crateT -= dt;
  if (crateT <= 0) { const rain = G.cfg.mut && G.cfg.mut.includes('crates'); crateT = srr(45, 80) / (rain ? 4 : 1); if (crates.length < (rain ? 8 : 3)) spawnCrate(); }
  for (let i = crates.length - 1; i >= 0; i--) {
    const c = crates[i];
    c.t += dt;
    const u = unitsNear(c.x, c.z, 1.8, []).filter(o => !o.air && !o.dead && G.players[o.faction] && o.faction !== 'neutral').sort((a, b) => a.id - b.id)[0];
    if (u) { pickUp(c, u); G.three.scene.remove(c.mesh); crates.splice(i, 1); }
  }
}
// visual bob and spin (runs every frame)
export function animateCrates(t) {
  for (const c of crates) {
    c.mesh.position.y = c.y + 0.75 + Math.sin(t * 2 + c.x) * 0.15;
    c.mesh.userData.box.rotation.y = t * 0.8;
    c.mesh.userData.ring.material.opacity = 0.45 + Math.sin(t * 4) * 0.25;
    c.mesh.visible = T.explored[idx(cellOf(c.x), cellOf(c.z))] || G.revealed;
  }
}
// AI: send a nearby idle unit to grab crates
export function aiGrabCrates(f) {
  for (const c of crates) {
    let best = null, bd = 30;
    for (const u of G.units) {
      if (u.dead || u.faction !== f || u.air || u.order || u.target || u.type === 'harvester') continue;
      const d = Math.hypot(u.x - c.x, u.z - c.z);
      if (d < bd) { bd = d; best = u; }
    }
    if (best) best.moveTo(c.x, c.z);
  }
}
export const crateList = () => crates;

// ------------------------------------------------------------------ neutral tech buildings
// Placed at the middle of each lane; engineers capture them.
// explosive fuel barrels a third and two thirds of the way along each lane, just off the road
export function placeBarrels() {
  const map = currentMap(); if (!map || G.cfg.mode === 'tutorial') return;
  map.lanes.forEach(lane => {
    let len = 0; const segs = [];
    for (let k = 0; k < lane.length - 1; k++) { const l = Math.hypot(lane[k + 1][0] - lane[k][0], lane[k + 1][1] - lane[k][1]); segs.push(l); len += l; }
    for (const [frac, side] of [[0.33, 1], [0.67, -1]]) {
      let want = len * frac, k = 0;
      while (k < segs.length - 1 && want > segs[k]) { want -= segs[k]; k++; }
      const t = want / segs[k], dx = lane[k + 1][0] - lane[k][0], dz = lane[k + 1][1] - lane[k][1], l = Math.hypot(dx, dz);
      const x = lane[k][0] + dx * t, z = lane[k][1] + dz * t;
      forcePlace('neutral', 'xbarrel', x - dz / l * 7 * side, z + dx / l * 7 * side);
    }
  });
}

// a couple of civilian houses beside each lane, waiting to be garrisoned
export function placeHouses() {
  const map = currentMap(); if (!map || G.cfg.mode === 'tutorial') return;
  map.lanes.forEach(lane => {
    let len = 0; const segs = [];
    for (let k = 0; k < lane.length - 1; k++) { const l = Math.hypot(lane[k + 1][0] - lane[k][0], lane[k + 1][1] - lane[k][1]); segs.push(l); len += l; }
    for (const [frac, side] of [[0.4, -1], [0.6, 1]]) {
      let want = len * frac, k = 0;
      while (k < segs.length - 1 && want > segs[k]) { want -= segs[k]; k++; }
      const t = want / segs[k], dx = lane[k + 1][0] - lane[k][0], dz = lane[k + 1][1] - lane[k][1], l = Math.hypot(dx, dz);
      const x = lane[k][0] + dx * t, z = lane[k][1] + dz * t;
      forcePlace('neutral', 'house', x - dz / l * 9 * side, z + dx / l * 9 * side);
    }
  });
}

export function placeTechBuildings() {
  const map = currentMap();
  if (!map || G.cfg.tech === false) return;
  const kinds = ['derrick', 'hospital', 'depot'];
  map.lanes.forEach((lane, i) => {
    // point half-way along the lane
    let len = 0; const segs = [];
    for (let k = 0; k < lane.length - 1; k++) { const l = Math.hypot(lane[k + 1][0] - lane[k][0], lane[k + 1][1] - lane[k][1]); segs.push(l); len += l; }
    let want = len / 2, k = 0;
    while (k < segs.length - 1 && want > segs[k]) { want -= segs[k]; k++; }
    const t = want / segs[k];
    const x = lane[k][0] + (lane[k + 1][0] - lane[k][0]) * t, z = lane[k][1] + (lane[k + 1][1] - lane[k][1]) * t;
    // offset to the side of the lane so it doesn't block the road
    const dx = lane[k + 1][0] - lane[k][0], dz = lane[k + 1][1] - lane[k][1], l = Math.hypot(dx, dz);
    forcePlace('neutral', kinds[i % kinds.length], x - dz / l * 12, z + dx / l * 12);
  });
}

// effects of captured tech buildings (called from Building.update)
export function techEffect(b, dt) {
  if (b.faction === 'neutral' || b.buildAnim < 1) return;
  const P = G.players[b.faction];
  if (b.type === 'derrick') {
    P.credits += 14 * dt;
    if (b.faction === G.player) G.stats.harvested += 14 * dt;
    if (b.pump) b.pump.rotation.z = Math.sin(G.time * 2) * 0.35;
  } else if (b.type === 'hospital') {
    for (const u of unitsNear(b.x, b.z, 14, healBuf)) if (u.faction === b.faction && u.isInf && u.hp < u.maxHp) { u.hp = Math.min(u.maxHp, u.hp + 12 * dt); if (Math.random() < dt * 3) FX.sparkBurst(u.x, u.y + 1.2, u.z, 2, [1, 4, 1.5, 1]); }
  } else if (b.type === 'depot') {
    for (const u of unitsNear(b.x, b.z, 11, healBuf)) if (u.faction === b.faction && !u.isInf && u.hp < u.maxHp) { u.hp = Math.min(u.maxHp, u.hp + 30 * dt); if (Math.random() < dt * 4) FX.buildSparks(u.x, u.y + 1.5, u.z); }
  }
}
const healBuf = [];

// AI: send engineers to capture neutral tech
export function aiCaptureTech(f) {
  const tech = G.buildings.filter(b => !b.dead && b.faction === 'neutral');
  if (!tech.length) return;
  for (const u of G.units) {
    if (u.dead || u.faction !== f || u.type !== 'engineer' || u.order) continue;
    let best = null, bd = 1e9;
    for (const b of tech) { const d = Math.hypot(b.x - u.x, b.z - u.z); if (d < bd) { bd = d; best = b; } }
    if (best) u.attack(best);
  }
}

// ------------------------------------------------------------------ match history (for the end-screen graphs)
let histT = 0;
export function recordHistory(dt) {
  histT -= dt;
  if (histT > 0) return;
  histT = 5;
  G.history = G.history || [];
  const row = { t: G.time, army: {}, income: {} };
  for (const f of [G.player, G.enemy]) {
    let v = 0;
    for (const u of G.units) if (!u.dead && u.faction === f && u.type !== 'harvester') v += UNITS[u.type]?.cost || 0;
    row.army[f] = v;
    row.income[f] = Math.round(G.players[f]?.harvested || 0);
  }
  G.history.push(row);
}

export function drawHistory(canvas) {
  const h = G.history || [];
  const x = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  x.clearRect(0, 0, W, H);
  if (h.length < 2) return;
  const charts = [['Army strength', 'army'], ['Crystal harvested', 'income']];
  const cw = W / 2 - 16;
  charts.forEach(([title, key], ci) => {
    const ox = ci * (W / 2) + 8, oy = 22, ch = H - 40;
    x.fillStyle = 'rgba(255,255,255,0.05)'; x.fillRect(ox, oy, cw, ch);
    x.fillStyle = '#ffc23a'; x.font = 'bold 13px Rajdhani'; x.fillText(title, ox, 15);
    let max = 1; for (const r of h) for (const f in r[key]) max = Math.max(max, r[key][f]);
    const tMax = h[h.length - 1].t || 1;
    for (const f of [G.enemy, G.player]) {
      x.strokeStyle = f === 'wally' ? '#3d8bff' : '#ff4a3d'; x.lineWidth = 2.5; x.beginPath();
      h.forEach((r, i) => { const px = ox + (r.t / tMax) * cw, py = oy + ch - (r[key][f] || 0) / max * (ch - 4); if (i) x.lineTo(px, py); else x.moveTo(px, py); });
      x.stroke();
    }
    x.fillStyle = '#7e93a4'; x.font = '11px Rajdhani'; x.fillText(`${Math.round(max).toLocaleString()}`, ox + 3, oy + 11); x.fillText(`${Math.floor(tMax / 60)}m`, ox + cw - 18, oy + ch + 12);
  });
}

