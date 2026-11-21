// Economy: credits, power, build queues, tech tree and building placement.
import { G, srr as rr, later } from './state.js';
import { BUILDINGS, UNITS, UPGRADES, PRODUCERS, QUEUE_OF, CELL, START_CREDITS, GRID, hasMut } from './config.js';
import { T, idx, inGrid, cellOf, cellCenter, heightAt } from './terrain.js';
import { Building, Unit, alive } from './entities.js';
import * as FX from './particles.js';

export function initPlayer(faction, isAI) {
  G.players[faction] = {
    faction, isAI, credits: START_CREDITS, powerProd: 0, powerUse: 0,
    queues: { build: newQueue(), infantry: newQueue(), vehicle: newQueue(), air: newQueue(), research: newQueue() },
    upgrades: {},
    incomeMult: 1, buildMult: 1, owned: {},
  };
}
function newQueue() { return { items: [], progress: 0, spent: 0, ready: false, hold: false }; }

export const defOf = type => BUILDINGS[type] || UNITS[type] || UPGRADES[type];
// has faction f finished upgrade k?
export const upg = (f, k) => !!(G.players[f] && G.players[f].upgrades && G.players[f].upgrades[k]);
export const isBuildingType = type => !!BUILDINGS[type];

export function updatePower() {
  for (const f in G.players) { const P = G.players[f]; P.powerProd = 0; P.powerUse = 0; P.owned = {}; P.lvl2 = {}; }
  for (const b of G.buildings) {
    if (b.dead) continue;
    const P = G.players[b.faction];
    P.owned[b.type] = (P.owned[b.type] || 0) + 1;
    if (b.level === 2) P.lvl2[b.type] = (P.lvl2[b.type] || 0) + 1;
    const pw = b.def.power;
    if (pw > 0) P.powerProd += pw * (b.level === 2 ? 1.6 : 1) * (0.5 + 0.5 * b.hp / b.maxHp); else P.powerUse -= pw;
  }
  for (const u of G.units) if (!u.dead) { const P = G.players[u.faction]; P.owned[u.type] = (P.owned[u.type] || 0) + 1; }
  for (const f in G.players) { const P = G.players[f]; if (P.blackoutUntil > G.time) P.powerProd = 0; } // a spy blacked out the grid
}
export const powerFactor = P => (P.powerUse <= P.powerProd ? 1 : Math.max(0.3, P.powerProd / Math.max(1, P.powerUse)));

export function hasReqs(faction, type) {
  const P = G.players[faction];
  const d = defOf(type);
  if (d.fac && d.fac !== faction) return false;
  if (d.superweapon && G.cfg.supers === false) return false;
  if (d.wonder && (G.cfg.wonders === false || !['skirmish', 'mp'].includes(G.cfg.mode))) return false; // wonders: skirmish & online only
  if (d.research && (P.upgrades[type] || P.queues.research.items.includes(type))) return false;
  if (G.allowed && !d.research && !G.allowed.includes(type)) return false; // campaign tech restrictions
  if (hasMut(G.cfg, 'infantry') && (d.tab === 'vehicle' || d.tab === 'air') && type !== 'harvester' && type !== 'apc') return false;
  if (!d.req.every(r => P.owned[r] > 0)) return false;
  const q = QUEUE_OF[d.tab];
  if (!PRODUCERS[d.tab].some(p => P.owned[p] > 0)) return false;
  if (d.limit) {
    const inQ = P.queues[q].items.filter(i => i === type).length;
    if ((P.owned[type] || 0) + inQ >= d.limit) return false;
  }
  return true;
}

// Adds item to the right queue; returns false on failure
export function enqueue(faction, type) {
  const d = defOf(type);
  if (d.instant) return false; // walls, gates and mines are bought on placement
  if (!hasReqs(faction, type)) return false;
  const P = G.players[faction];
  const q = P.queues[QUEUE_OF[d.tab]];
  if (isBuildingType(type)) {
    if (q.items.length) return false; // one structure at a time
  } else if (q.items.length >= 12) return false;
  q.items.push(type);
  if (q.items.length === 1) { q.progress = 0; q.spent = 0; q.ready = false; q.hold = false; }
  return true;
}

// Cancel the last queued instance of type (refunds what was spent)
export function dequeue(faction, type) {
  const P = G.players[faction];
  const d = defOf(type);
  const q = P.queues[QUEUE_OF[d.tab]];
  const k = q.items.lastIndexOf(type);
  if (k < 0) return false;
  if (k === 0) { P.credits += q.spent; q.progress = 0; q.spent = 0; q.ready = false; q.hold = false; }
  q.items.splice(k, 1);
  return true;
}

export function updateProduction(dt) {
  for (const f in G.players) {
    const P = G.players[f];
    const pf = powerFactor(P);
    for (const qn in P.queues) {
      const q = P.queues[qn];
      if (!q.items.length || q.ready || q.hold) continue;
      const type = q.items[0];
      const d = defOf(type);
      if (!hasReqsSoft(f, type)) continue;
      let producers = PRODUCERS[d.tab].reduce((n, p) => n + (P.owned[p] || 0), 0);
      if (!producers) continue;
      // an upgraded (level 2) producer works like one and a half buildings
      producers += PRODUCERS[d.tab].reduce((n, p) => n + (P.lvl2?.[p] || 0), 0);
      const mult = (1 + (producers - 1) * 0.5) * pf * (P.buildMult || 1) * (hasMut(G.cfg, 'turbo') ? 2 : 1);
      let dp = dt * mult;
      if (q.progress + dp > d.time) dp = d.time - q.progress;
      const cost = d.cost * dp / d.time;
      if (P.credits < cost) { if (f === G.player) G.announce?.('Insufficient funds', f, 15); continue; }
      P.credits -= cost; q.spent += cost; q.progress += dp;
      if (q.progress >= d.time - 1e-6) {
        if (UPGRADES[type]) {
          q.items.shift(); q.progress = 0; q.spent = 0;
          completeUpgrade(f, type);
        } else if (isBuildingType(type)) {
          q.ready = true;
          if (f === G.player) { G.announce?.('Construction complete', f); G.sfx?.play('ready'); }
        } else {
          if (spawnFromProducer(f, type)) {
            q.items.shift(); q.progress = 0; q.spent = 0;
            if (q.repeat && q.items.length < 12 && hasReqs(f, type)) q.items.push(type); // repeat production loops the queue
            if (f === G.player) { G.announce?.(type === 'wally' ? 'Wally reporting for duty' : 'Unit ready', f, 2); }
          } else q.progress = d.time - 0.01;
        }
      }
    }
  }
}
function hasReqsSoft(f, type) {
  const P = G.players[f], d = defOf(type);
  return PRODUCERS[d.tab].some(p => P.owned[p] > 0);
}

function spawnFromProducer(faction, type) {
  const d = UNITS[type];
  const prodTypes = PRODUCERS[d.tab];
  const list = G.buildings.filter(b => !b.dead && b.faction === faction && prodTypes.includes(b.type) && b.buildAnim >= 1);
  if (!list.length) return false;
  // pick primary (flagged) or the one with a rally point, else first
  const b = list.find(x => x.primary) || list[0];
  let x, z, heading = 0;
  if (d.air) { x = b.x; z = b.z; }
  else { const e = b.exitPoint(); x = e.x; z = b.z + b.def.h * CELL / 2 - 0.5; if (b.type === 'barracks') z += 0.5; heading = 0; void e; }
  if (b.door) b.doorOpen = 2.5;
  const u = new Unit(type, faction, x, z, heading);
  if (d.air) { u.y = b.baseY + 0.5; }
  if (b.rally) u.moveTo(b.rally.x + rr(-1.5, 1.5), b.rally.z + rr(-1.5, 1.5), { attackMove: false });
  else if (type !== 'harvester') { const e = b.exitPoint(); u.moveTo(e.x + rr(-2, 2), e.z + rr(1, 4)); }
  if (type === 'harvester') u.hState = 'seek';
  if (type === 'rifle' && faction === G.player) G.tutorialTrained = (G.tutorialTrained || 0) + 1;
  G.onUnitBuilt?.(u);
  return true;
}

// ---------------------------------------------------- placement
export function canPlace(faction, type, cx, cz, ignoreUnits = false) {
  const d = BUILDINGS[type];
  let nearOwn = false;
  if (d.isMine) {
    if (!inGrid(cx, cz)) return false;
    const k = idx(cx, cz);
    if (T.blocked[k] || T.bld[k] || T.ore[k] > 0 || !T.explored[k] && faction === G.player) return false;
    if (G.buildings.some(b => !b.dead && b.def.isMine && b.cx === cx && b.cz === cz)) return false;
    const R = d.placeRange;
    return G.buildings.some(b => !b.dead && b.faction === faction && !b.def.isMine && Math.abs(b.cx - cx) < R && Math.abs(b.cz - cz) < R);
  }
  for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) {
    const X = cx + i, Z = cz + j;
    if (!inGrid(X, Z) || X < 2 || Z < 2 || X > GRID - 3 || Z > GRID - 3) return false;
    const k = idx(X, Z);
    if (T.blocked[k] || T.bld[k] || T.ore[k] > 0) return false;
  }
  // slope check
  const x0 = cellCenter(cx) - CELL / 2, z0 = cellCenter(cz) - CELL / 2;
  let lo = 1e9, hi = -1e9;
  for (let j = 0; j <= d.h; j++) for (let i = 0; i <= d.w; i++) { const h = heightAt(x0 + i * CELL, z0 + j * CELL); lo = Math.min(lo, h); hi = Math.max(hi, h); }
  if (hi - lo > 2.2) return false;
  // must be near an existing structure
  const R = d.isWall || d.isGate ? 8 : 5;
  for (const b of G.buildings) {
    if (b.dead || b.faction !== faction || b.def.isMine) continue;
    if (cx + d.w + R > b.cx && cx - R < b.cx + b.def.w && cz + d.h + R > b.cz && cz - R < b.cz + b.def.h) { nearOwn = true; break; }
  }
  if (!nearOwn) return false;
  if (!ignoreUnits) {
    for (const u of G.units) {
      if (u.dead || u.air) continue;
      const ux = cellOf(u.x), uz = cellOf(u.z);
      if (ux >= cx && ux < cx + d.w && uz >= cz && uz < cz + d.h) return false;
    }
  }
  return true;
}

export function placeBuilding(faction, type, cx, cz) {
  const P = G.players[faction];
  const q = P.queues.build;
  if (!q.ready || q.items[0] !== type) return null;
  if (!canPlace(faction, type, cx, cz)) return null;
  q.items.shift(); q.ready = false; q.progress = 0; q.spent = 0;
  const b = new Building(type, faction, cx, cz);
  if (type === 'refinery') {
    // free harvester
    later(1.8, () => {
      if (!alive(b)) return;
      const e = b.exitPoint();
      const h = new Unit('harvester', faction, e.x, e.z, 0);
      h.hState = 'seek';
    });
  }
  if (faction === G.player) G.stats.built++;
  return b;
}

// Walls, gates and mines: paid for when placed, no build time. cells: [[cx,cz],...]
export function placeInstant(faction, type, cells) {
  const d = BUILDINGS[type];
  if (!d || !d.instant || !hasReqs(faction, type)) return 0;
  const P = G.players[faction];
  let n = 0;
  for (const [cx, cz] of cells) {
    if (P.credits < d.cost) { if (faction === G.player) G.announce?.('Insufficient funds', faction, 6); break; }
    if (!canPlace(faction, type, cx, cz)) continue;
    P.credits -= d.cost;
    new Building(type, faction, cx, cz);
    n++;
  }
  return n;
}
// cells along a straight line (for dragging walls)
export function lineCells(c0, c1) {
  const out = [];
  const dx = c1.cx - c0.cx, dz = c1.cz - c0.cz;
  const n = Math.max(Math.abs(dx), Math.abs(dz));
  for (let i = 0; i <= n; i++) {
    const cx = Math.round(c0.cx + dx * (n ? i / n : 0)), cz = Math.round(c0.cz + dz * (n ? i / n : 0));
    if (!out.some(([a, b]) => a === cx && b === cz)) out.push([cx, cz]);
  }
  return out.slice(0, 40);
}

// apply a finished research upgrade
export function completeUpgrade(f, k) {
  const P = G.players[f];
  P.upgrades[k] = true;
  if (k === 'armor' || k === 'bodyarmor') {
    for (const u of G.units) {
      if (u.dead || u.faction !== f || (k === 'armor') === u.isInf) continue;
      u.maxHp *= 1.25; u.hp *= 1.25;
    }
  }
  if (f === G.player) { G.announce?.(`Research complete: ${UPGRADES[k].name}`, f); G.sfx?.play('promote'); }
}
