// Computer opponent: builds a base, harvests, trains an army, defends and attacks in waves.
import { G, srr as rr, srand } from './state.js';
import { BASES } from './terrain.js';
import { hill } from './koth.js';
import { convoyActive } from './features.js';
import { DIFFICULTY, BUILDINGS, UNITS, CELL, GRID } from './config.js';
import { enqueue, hasReqs, canPlace, placeBuilding, defOf, placeInstant } from './production.js';
import { superState, fireSuperweapon, aiSuperTarget } from './superweapons.js';
import { aiGrabCrates, aiCaptureTech } from './features.js';
import { aiUsePowers } from './powers.js';
import { alive, distTo } from './entities.js';
import { cellOf, T, idx } from './terrain.js';

const BUILD_ORDER = ['power', 'refinery', 'barracks', 'power', 'factory', 'turret', 'refinery', 'radar', 'power', 'turret', 'bunker', 'tesla', 'flametower', 'sam', 'power', 'tech', 'helipad', 'power', 'plasma', 'turret', 'power', 'uplink', 'silo', 'sam', 'power', 'plasma', 'factory', 'barracks', 'power'];
const available = (f, t) => { const d = defOf(t); return !(d.fac && d.fac !== f) && !(G.allowed && !G.allowed.includes(t)); };

export class AI {
  constructor(faction, opts = {}) {
    this.f = faction;
    this.opts = opts; // campaign: { noBuild, noAttack, noUnits }
    this.diff = DIFFICULTY[G.difficulty];
    const P = G.players[faction];
    P.incomeMult = this.diff.aiIncome; P.buildMult = this.diff.aiBuild;
    this.t = 0; this.think = 0;
    this.waveN = 0; this.nextWave = this.diff.firstWave;
    this.army = new Set(); this.attackers = new Set();
  }
  get P() { return G.players[this.f]; }
  get base() { return G.buildings.find(b => !b.dead && b.faction === this.f && b.type === 'conyard') || G.buildings.find(b => !b.dead && b.faction === this.f); }

  update(dt) {
    this.t += dt; this.think -= dt;
    if (this.think > 0) return;
    this.think = 0.7;
    const P = this.P;
    if (!this.base) { if (!this.opts.noBuild) return; }
    if (!this.opts.noBuild && this.base) this.manageBuild(P);
    if (!this.opts.noUnits && this.base) this.manageUnits(P);
    this.manageDefence();
    if (!this.opts.noAttack) this.manageAttack();
    if (srand() < 0.25) this.manageGarrison();
    // pipers and drummers tag along behind the army
    for (const p of G.units) {
      if (p.dead || p.faction !== this.f || !p.def.inspire || (p.order && srand() < 0.9)) continue;
      let best = null, bd = 1e9;
      for (const a of this.attackers) { if (!alive(a)) continue; const d = Math.hypot(a.x - p.x, a.z - p.z); if (d < bd) { bd = d; best = a; } }
      if (best && bd > 6) p.moveTo(best.x + rr(-3, 3), best.z + rr(-3, 3));
    }
    // idle spies sneak into the nearest enemy refinery or power plant
    for (const s of G.units) {
      if (s.dead || s.faction !== this.f || !s.def.spy || s.order) continue;
      let best = null, bd = 1e9;
      for (const b of G.buildings) { if (b.dead || b.faction === this.f || b.faction === 'neutral' || !(b.type === 'refinery' || b.def.power > 0 || b.type === 'radar')) continue; const d = Math.hypot(b.x - s.x, b.z - s.z); if (d < bd) { bd = d; best = b; } }
      if (best) s.attack(best);
    }
    // a bounty convoy passing nearby? send a hunting party after it
    const cv = convoyActive();
    if (cv && srand() < 0.3 && !G.units.some(u => !u.dead && u.faction === this.f && u.target === cv)) {
      const hunters = G.units.filter(u => !u.dead && !u.boarded && u.faction === this.f && u.weapon && u.type !== 'harvester' && !u.isInf && !this.attackers.has(u) && Math.hypot(u.x - cv.x, u.z - cv.z) < 60);
      hunters.slice(0, 4).forEach(u => u.attack(cv));
    }
    if (srand() < 0.2) aiGrabCrates(this.f);
    if (this.t > 240 && !this.opts.noAttack && srand() < 0.3) aiUsePowers(this.f, aiSuperTarget(this.f));
    if (!this.opts.noUnits) aiCaptureTech(this.f);
    const ss = superState(this.f);
    if (ss && ss.ready) { const tg = aiSuperTarget(this.f); if (tg) fireSuperweapon(this.f, tg.x + rr(-2, 2), tg.z + rr(-2, 2)); }
    if (!this.opts.noBuild && this.t > 400 && P.credits > 1500 && srand() < 0.08) this.layMines();
    // repair damaged buildings when rich
    for (const b of G.buildings) if (b.faction === this.f && !b.dead && b.hp < b.maxHp * 0.7 && P.credits > 800) b.repairing = true;
  }

  ownCombat() { let n = 0; for (const u of G.units) if (!u.dead && !u.boarded && u.faction === this.f && u.weapon) n++; return n; }

  // fill bunkers with idle infantry that are hanging around the base
  manageGarrison() {
    for (const b of G.buildings) {
      if (b.dead || b.faction !== this.f || !b.def.garrison || b.buildAnim < 1) continue;
      const room = b.def.garrison - (b.passengers || []).length;
      if (room <= 0) continue;
      const pick = G.units.filter(u => !u.dead && !u.boarded && u.faction === this.f && u.isInf && u.weapon && !u.hero && !u.order && !u.target && !this.attackers.has(u) && distTo(b, u.x, u.z) < 30);
      pick.slice(0, room).forEach(u => u.board(b));
    }
    // now and then, send a few idle infantry out to hold the nearest empty civilian house
    if (srand() < 0.3) {
      const home = BASES[this.f]; let house = null, hd = 125;
      for (const b of G.buildings) { if (b.dead || !b.def.civil || b.faction !== 'neutral') continue; const d = Math.hypot(b.x - home.x, b.z - home.z); if (d < hd) { hd = d; house = b; } }
      const held = G.buildings.filter(b => !b.dead && b.def.civil && b.faction === this.f).length;
      if (house && held < 2 && !G.units.some(u => !u.dead && u.faction === this.f && u.order && u.order.type === 'board' && u.order.target === house)) {
        const pick = G.units.filter(u => !u.dead && !u.boarded && u.faction === this.f && u.isInf && u.weapon && !u.hero && !u.order && !u.target && !this.attackers.has(u));
        if (pick.length >= 4) pick.slice(0, 3).forEach(u => u.board(house));
      }
    }
  }

  count(type) {
    return (this.P.owned[type] || 0);
  }

  manageBuild(P) {
    const q = P.queues.build;
    if (q.ready) {
      const type = q.items[0];
      const spot = this.findSpot(type);
      if (spot) placeBuilding(this.f, type, spot.x, spot.z);
      else { q.items.shift(); q.ready = false; q.progress = 0; P.credits += q.spent; q.spent = 0; }
      return;
    }
    if (q.items.length) { this.saving = P.credits < 900; return; }
    this.saving = false;
    // low power? build power first
    if (P.powerUse > P.powerProd - 10 && hasReqs(this.f, 'power') && P.credits > 300) { enqueue(this.f, 'power'); return; }
    const need = {};
    for (const t of BUILD_ORDER) {
      if (!available(this.f, t)) continue;
      need[t] = (need[t] || 0) + 1;
      if (this.count(t) < need[t]) {
        if (hasReqs(this.f, t)) { if (P.credits > defOf(t).cost * 0.4) enqueue(this.f, t); else this.saving = true; }
        return;
      }
    }
    if (this.t > 900 && P.credits > 5500 && !this.count('wonder') && hasReqs(this.f, 'wonder') && srand() < 0.25) { enqueue(this.f, 'wonder'); return; }
    // late game: more defences
    if (P.credits > 2500 && srand() < 0.3) enqueue(this.f, srand() < 0.5 ? (hasReqs(this.f, 'plasma') ? 'plasma' : 'turret') : 'turret');
  }

  findSpot(type) {
    const d = BUILDINGS[type];
    const base = this.base;
    const cx0 = cellOf(base.x), cz0 = cellOf(base.z);
    const defensive = !!d.weapon;
    // face the defences toward the enemy
    const enemyBase = G.buildings.find(b => !b.dead && b.faction !== this.f && b.faction !== 'neutral');
    let dirx = 0, dirz = 0;
    if (enemyBase) { const l = Math.hypot(enemyBase.x - base.x, enemyBase.z - base.z); dirx = (enemyBase.x - base.x) / l; dirz = (enemyBase.z - base.z) / l; }
    let best = null, bs = 1e9;
    for (let n = 0; n < 400; n++) {
      const r = defensive ? rr(7, 13) : rr(3, 9 + this.count('power'));
      const a = srand() * Math.PI * 2;
      const cx = Math.round(cx0 + Math.cos(a) * r - d.w / 2), cz = Math.round(cz0 + Math.sin(a) * r - d.h / 2);
      if (!canPlace(this.f, type, cx, cz)) continue;
      // keep a gap so units can move between buildings
      let crowded = false;
      for (let j = -1; j <= d.h && !crowded; j++) for (let i = -1; i <= d.w; i++) {
        const X = cx + i, Z = cz + j;
        if (X < 0 || Z < 0 || X >= GRID || Z >= GRID) continue;
        if ((i === -1 || j === -1 || i === d.w || j === d.h) && T.bld[idx(X, Z)]) { crowded = true; break; }
      }
      if (crowded && n < 300) continue;
      let score = r;
      if (defensive) score = -(Math.cos(a) * dirx + Math.sin(a) * dirz) * 10 + srand() * 3;
      if (score < bs) { bs = score; best = { x: cx, z: cz }; }
      if (n > 60 && best) break;
    }
    return best;
  }

  manageUnits(P) {
    const harvs = this.count('harvester');
    const refs = this.count('refinery');
    if (refs && harvs < refs * 2 && hasReqs(this.f, 'harvester') && P.queues.vehicle.items.length < 2 && !P.queues.vehicle.items.includes('harvester')) {
      if (harvs < refs) P.queues.vehicle.items.unshift('harvester'), P.queues.vehicle.progress = 0, P.queues.vehicle.spent = 0;
      else enqueue(this.f, 'harvester');
    }
    // keep a reserve for buildings early on
    const reserve = this.t < 150 ? 600 : 200;
    if (P.credits < reserve) return;
    if (this.saving && P.credits < 1600 && this.army.size >= 0 && this.ownCombat() > 6) return;
    if (P.queues.infantry.items.length < 2) {
      const opts = ['rifle', 'rifle', 'rocket', 'rocket', 'dog', 'spy', 'piper', 'drummer', 'grenadier', 'boomer', 'boomer', 'troll', 'flamer', 'engineer', 'medic', 'shaman', 'wallyman', 'warlord'].filter(t => hasReqs(this.f, t));
      if (hasReqs(this.f, 'wally') && srand() < 0.2) opts.push('wally');
      if (opts.length) {
        let t = opts[Math.floor(srand() * opts.length)];
        if (t === 'engineer' && srand() < 0.7) t = 'rifle';
        enqueue(this.f, t);
      }
    }
    if (P.queues.air && P.queues.air.items.length < 1 && this.t > 360 && srand() < 0.15 && hasReqs(this.f, 'jet')) enqueue(this.f, 'jet');
    if (P.queues.vehicle.items.length < 2) {
      const opts = ['tank', 'tank', 'buggy', 'arty', 'titan', 'titan', 'stealth', 'stealth', 'inferno', 'inferno', 'repair', 'hover', 'teslatruck', 'mech', 'catapult', 'shieldgen'].filter(t => hasReqs(this.f, t));
      if (opts.length) enqueue(this.f, opts[Math.floor(srand() * opts.length)]);
    }
    if (P.credits > 2200 && !P.queues.research.items.length) {
      const opts = ['refining', 'armor', 'bodyarmor', 'shells', 'engines', 'optics'].filter(t => hasReqs(this.f, t));
      if (opts.length) enqueue(this.f, opts[Math.floor(srand() * opts.length)]);
    }
    if (P.queues.air.items.length < 1 && hasReqs(this.f, 'wyvern') && this.count('wyvern') < 3 && srand() < 0.5) enqueue(this.f, 'wyvern'); // Grimlocks mix in Wyvern Riders
    if (P.queues.air.items.length < 1 && hasReqs(this.f, 'gunship') && this.count('gunship') < 4) enqueue(this.f, 'gunship');
  }

  layMines() {
    const base = this.base; if (!base) return;
    const e = G.buildings.find(b => !b.dead && b.faction !== this.f && b.faction !== 'neutral');
    if (!e) return;
    const l = Math.hypot(e.x - base.x, e.z - base.z);
    const dx = (e.x - base.x) / l, dz = (e.z - base.z) / l;
    const cells = [];
    for (let i = 0; i < 3; i++) {
      const d = rr(18, 28), side = rr(-8, 8);
      cells.push([cellOf(base.x + dx * d - dz * side), cellOf(base.z + dz * d + dx * side)]);
    }
    placeInstant(this.f, 'mine', cells);
  }

  manageDefence() {
    // find enemies near our buildings
    let threat = null;
    for (const u of G.units) {
      if (u.dead || u.faction === this.f || u.faction === 'neutral') continue;
      for (const b of G.buildings) {
        if (b.dead || b.faction !== this.f || b.def.isMine) continue;
        if (distTo(b, u.x, u.z) < 16) { threat = u; break; }
      }
      if (threat) break;
    }
    if (!threat) return;
    for (const u of G.units) {
      if (u.dead || u.boarded || u.faction !== this.f || !u.weapon || u.type === 'harvester' || this.attackers.has(u)) continue;
      if (Math.hypot(u.x - threat.x, u.z - threat.z) > 60) continue;
      if (!u.target || !alive(u.target)) u.moveTo(threat.x + rr(-3, 3), threat.z + rr(-3, 3), { attackMove: true });
    }
  }

  manageAttack() {
    for (const u of [...this.attackers]) if (!alive(u)) this.attackers.delete(u);
    const idle = G.units.filter(u => !u.dead && !u.boarded && !(u.order && u.order.type === 'board') && u.faction === this.f && u.weapon && u.type !== 'harvester' && !this.attackers.has(u));
    // gather idle army at a rally point in front of the base
    const base = this.base; if (!base) return;
    const enemyB = G.buildings.filter(b => !b.dead && b.faction !== this.f && b.faction !== 'neutral' && !b.def.isMine && !b.def.isWall);
    if (!enemyB.length) return;
    const target0 = enemyB[0];
    let rx = base.x + (target0.x - base.x) * 0.15, rz = base.z + (target0.z - base.z) * 0.15;
    if (hill.on && this.t > 60) { rx = hill.x; rz = hill.z; } // King of the Hill: rally the army on the hill
    for (const u of idle) if (!u.order && !u.target && Math.hypot(u.x - rx, u.z - rz) > 14) u.moveTo(rx + rr(-6, 6), rz + rr(-6, 6), { attackMove: true });

    const waveSize = this.diff.waveBase + this.waveN * this.diff.waveGrow;
    const urgent = enemyB.some(b => b.def.wonder && b.buildAnim >= 1) && idle.length >= 4; // monument up: attack with whatever we have
    if ((this.t >= this.nextWave || urgent && this.t >= this.nextWave - this.diff.waveGap * 0.6) && (urgent || idle.length >= Math.min(waveSize, 30))) {
      this.waveN++;
      this.nextWave = this.t + this.diff.waveGap;
      // pick a target: harvesters & refineries are juicy, otherwise nearest structure
      let tgt = enemyB.find(b => b.def.wonder) || null; // an enemy monument must fall first
      const r = srand();
      if (!tgt && r < 0.3) tgt = enemyB.find(b => b.type === 'refinery');
      if (!tgt && r < 0.5) tgt = enemyB.find(b => b.def.weapon == null && b.type !== 'conyard');
      if (!tgt) { let bd = 1e9; for (const b of enemyB) { const d = Math.hypot(b.x - base.x, b.z - base.z); if (d < bd) { bd = d; tgt = b; } } }
      for (const u of idle) {
        if (u.type === 'engineer') { u.attack(tgt); this.attackers.add(u); continue; }
        u.moveTo(tgt.x + rr(-4, 4), tgt.z + rr(-4, 4), { attackMove: true });
        this.attackers.add(u);
      }
      G.ui?.message(`Enemy assault wave ${this.waveN} incoming!`, true);
    }
    // keep attackers pushing
    for (const u of this.attackers) {
      if (u.order || u.target || u.path) continue;
      let tgt = null, bd = 1e9;
      for (const b of enemyB) { const d = Math.hypot(b.x - u.x, b.z - u.z); if (d < bd) { bd = d; tgt = b; } }
      for (const e of G.units) { if (e.dead || e.faction === this.f) continue; const d = Math.hypot(e.x - u.x, e.z - u.z); if (d < bd * 0.6) { bd = d; tgt = e; } }
      if (tgt) u.moveTo(tgt.x + rr(-3, 3), tgt.z + rr(-3, 3), { attackMove: true });
    }
  }
}
void UNITS; void CELL;
