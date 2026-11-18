// Campaign: Wally's squad against the Grimlock Warlord. Each mission sets up the map, forces and
// objectives, then a tick() checks for victory or defeat and runs scripted events.
import { G, later } from './state.js';
import { BUILDINGS, CELL, GRID } from './config.js';
import { Unit, Building, alive } from './entities.js';
import { T, idx, inGrid, cellOf, heightAt, BASES, revealCircle } from './terrain.js';

const ALL_BASIC = ['power', 'refinery', 'barracks', 'factory', 'radar', 'turret', 'sam', 'wall', 'gate', 'mine', 'rifle', 'rocket', 'flamer', 'engineer', 'medic', 'wallyman', 'buggy', 'tank', 'harvester', 'arty'];

export const MISSIONS = [
  {
    id: 'm1', title: 'First Contact', map: 'valley', difficulty: 'easy',
    story: [
      'Commander, the Wally Squad has touched down in Crystal Valley. Our scouts report a Grimlock outpost dug in near the valley floor, guarding a rich crystal seam.',
      'We have no base yet - just a strike team led by Wally himself. Use your tanks to break the turrets, keep your infantry behind the armour, and do not let Wally get himself killed.',
      'Tip: Wally can snipe infantry from long range and plants C4 on buildings. Engineers can capture enemy structures.',
    ],
    objectives: [{ id: 'outpost', text: 'Destroy the Grimlock outpost' }, { id: 'wally', text: 'Wally must survive' }],
    allowed: [],
    setup(ctx) {
      const s = BASES[G.player];
      ctx.squad(G.player, s.x, s.z, [['wally', 1], ['tank', 3], ['rifle', 6], ['rocket', 3], ['medic', 1], ['engineer', 2]]);
      ctx.credits(G.player, 0);
      const ox = 26, oz = -26;
      for (const t of ['barracks', 'power', 'power', 'refinery', 'turret', 'turret', 'turret', 'sam']) ctx.place(G.enemy, t, ox, oz);
      ctx.squad(G.enemy, ox, oz, [['rifle', 6], ['rocket', 2], ['tank', 2]], true);
      ctx.squad(G.enemy, -20, 30, [['rifle', 3], ['buggy', 1]], true);
      ctx.ai({ noBuild: true, noUnits: true, noAttack: true });
      revealCircle(s.x, s.z, 40);
    },
    tick(ctx) {
      if (!G.units.some(u => u.faction === G.player && u.type === 'wally' && !u.dead)) return ctx.fail('Wally has fallen. Mission failed.');
      ctx.check('wally', true);
      if (!G.buildings.some(b => b.faction === G.enemy && !b.dead && !b.def.isMine && !b.def.isWall)) { ctx.complete('outpost'); return ctx.win(); }
      if (!G.units.some(u => u.faction === G.player && !u.dead)) return ctx.fail('Our strike team has been wiped out.');
    },
  },
  {
    id: 'm2', title: 'Hold the Line', map: 'frost', difficulty: 'normal',
    story: [
      'Frostbite Pass is the only way through the mountains, and we hold it. Grimlock forces are massing on the far side of the pass.',
      'Reinforcements are seven minutes out. Build defences - walls, gates, turrets and mines - and hold the Command HQ until they arrive.',
      'Tip: drag with the Concrete Wall selected to build a whole line. Gates let your own units through.',
    ],
    objectives: [{ id: 'hold', text: 'Survive until reinforcements arrive', timer: 420 }, { id: 'hq', text: 'Protect the Command HQ' }],
    allowed: ALL_BASIC,
    setup(ctx) {
      const s = BASES[G.player];
      ctx.base(G.player, s, ['conyard', 'power', 'power', 'refinery', 'barracks', 'factory', 'turret', 'turret']);
      ctx.squad(G.player, s.x + 14, s.z, [['tank', 2], ['rifle', 4], ['rocket', 2]]);
      ctx.credits(G.player, 5000);
      ctx.ai({ noBuild: true, noUnits: true, noAttack: true });
      const e = BASES[G.enemy];
      ctx.state.wave = 0;
      const waves = [[['rifle', 5], ['buggy', 2]], [['rifle', 6], ['rocket', 3], ['tank', 2]], [['tank', 4], ['flamer', 4], ['buggy', 2]], [['tank', 4], ['arty', 2], ['rocket', 4], ['inferno', 1]],
        [['inferno', 2], ['tank', 5], ['rifle', 8]], [['stealth', 3], ['tank', 4], ['arty', 2], ['gunship', 2]], [['inferno', 3], ['tank', 6], ['rocket', 6], ['gunship', 2]]];
      waves.forEach((w, i) => later(35 + i * 55, () => {
        if (G.over) return;
        const lane = [-60, 0, 60][i % 3];
        const us = ctx.squad(G.enemy, e.x - 6, e.z + lane * 0.5, w, true);
        for (const u of us) u.moveTo(s.x + 8, s.z, { attackMove: true });
        G.ui?.message(`Enemy wave ${i + 1} of ${waves.length} approaching!`, true);
      }));
      revealCircle(s.x, s.z, 50);
    },
    tick(ctx) {
      if (!G.buildings.some(b => b.faction === G.player && b.type === 'conyard' && !b.dead)) return ctx.fail('The Command HQ has been destroyed.');
      ctx.check('hq', true);
      if (G.time >= 420) {
        ctx.complete('hold');
        if (!ctx.state.reinf) {
          ctx.state.reinf = true;
          G.announce?.('Reinforcements have arrived');
          const s = BASES[G.player];
          ctx.squad(G.player, s.x - 4, s.z - 20, [['titan', 3], ['tank', 4]]);
          later(4, () => ctx.win());
        }
      }
    },
  },
  {
    id: 'm3', title: 'Crystal Rush', map: 'dunes', difficulty: 'normal',
    story: [
      'The Dune Sea hides the richest blue crystal in the region. Whoever controls it controls the war.',
      'Build up your economy fast - harvest 8,000 credits of crystal - and burn down the Grimlock refineries so they cannot do the same.',
      'Tip: blue crystal is worth double. A second refinery and more harvesters will speed you up. Watch out for sandstorms - they cut your sight range.',
    ],
    objectives: [{ id: 'harvest', text: 'Harvest 8,000 credits', progress: () => `${Math.floor(G.stats.harvested)}/8000` }, { id: 'refs', text: 'Destroy all Grimlock refineries' }],
    allowed: ALL_BASIC,
    setup(ctx) {
      const s = BASES[G.player], e = BASES[G.enemy];
      ctx.base(G.player, s, ['conyard']);
      ctx.squad(G.player, s.x + 8, s.z + 8, [['tank', 2], ['buggy', 2], ['rifle', 4]]);
      ctx.base(G.enemy, e, ['conyard', 'power', 'refinery', 'refinery', 'barracks', 'power', 'turret']);
      ctx.squad(G.enemy, e.x - 8, e.z - 8, [['tank', 2], ['rifle', 4]]);
      ctx.credits(G.player, 4000);
      ctx.ai({});
      revealCircle(s.x, s.z, 42);
    },
    tick(ctx) {
      if (G.stats.harvested >= 8000) ctx.complete('harvest');
      if (ctx.state.seenRef || G.time > 5) { ctx.state.seenRef = true; if (!G.buildings.some(b => b.faction === G.enemy && b.type === 'refinery' && !b.dead)) ctx.complete('refs'); }
      if (ctx.done('harvest') && ctx.done('refs')) return ctx.win();
      if (!G.buildings.some(b => b.faction === G.player && !b.dead && !b.def.isMine && !b.def.isWall)) return ctx.fail('Our base has been destroyed.');
    },
  },
  {
    id: 'm4', title: 'Lights Out', map: 'midnight', difficulty: 'normal',
    story: [
      'Midnight Ridge. The Grimlock fortress is ringed by Plasma Towers - a frontal assault would be suicide.',
      'But Plasma Towers need power. Knock out every Grimlock Power Plant and their defences will go dark. Then finish the fortress.',
      'Tip: Wally plants C4 on buildings and can slip in under the cover of night. Watch for Shade stealth tanks - they only appear when close.',
    ],
    objectives: [{ id: 'power', text: 'Destroy every Grimlock Power Plant' }, { id: 'hq', text: 'Destroy the Grimlock Command HQ' }],
    allowed: [...ALL_BASIC, 'wally'],
    setup(ctx) {
      const s = BASES[G.player], e = BASES[G.enemy];
      ctx.base(G.player, s, ['conyard', 'power', 'power', 'refinery', 'barracks', 'factory']);
      ctx.squad(G.player, s.x, s.z - 14, [['wally', 1], ['engineer', 2], ['tank', 3], ['rocket', 4], ['medic', 1]]);
      ctx.base(G.enemy, e, ['conyard', 'power', 'power', 'power', 'refinery', 'barracks', 'factory', 'plasma', 'plasma', 'plasma', 'plasma', 'turret', 'turret', 'sam']);
      ctx.squad(G.enemy, e.x, e.z + 16, [['stealth', 2], ['tank', 3], ['rifle', 6]], true);
      ctx.credits(G.player, 3500);
      ctx.ai({ noBuild: true });
      revealCircle(s.x, s.z, 40);
    },
    tick(ctx) {
      if (!G.buildings.some(b => b.faction === G.enemy && b.type === 'power' && !b.dead)) {
        if (!ctx.done('power')) { ctx.complete('power'); G.announce?.('Enemy power grid destroyed. Their defences are offline.'); }
      }
      if (!G.buildings.some(b => b.faction === G.enemy && b.type === 'conyard' && !b.dead)) { ctx.complete('hq'); if (ctx.done('power')) return ctx.win(); }
      if (!G.buildings.some(b => b.faction === G.player && !b.dead && !b.def.isMine && !b.def.isWall) && !G.units.some(u => u.faction === G.player && !u.dead)) return ctx.fail('Our forces have been destroyed.');
    },
  },
  {
    id: 'm5', title: 'The Warlord', map: 'valley', difficulty: 'hard',
    story: [
      'This is it, commander. The Grimlock Warlord has dug in at the far end of Crystal Valley, and our spies confirm he has a Doom Missile silo.',
      'Build your Sky Lance Uplink and fight fire with fire. Destroy every Grimlock structure and end this war.',
      'Tip: when the enemy silo is armed, spread your base out - and strike the silo first if you can.',
    ],
    objectives: [{ id: 'silo', text: 'Destroy the Doom Missile Silo' }, { id: 'all', text: 'Destroy every Grimlock structure' }],
    allowed: null,
    setup(ctx) {
      const s = BASES[G.player], e = BASES[G.enemy];
      ctx.base(G.player, s, ['conyard', 'power', 'power', 'refinery', 'barracks']);
      ctx.squad(G.player, s.x + 10, s.z - 10, [['tank', 3], ['rifle', 6], ['rocket', 3], ['wally', 1]]);
      ctx.base(G.enemy, e, ['conyard', 'power', 'power', 'power', 'power', 'refinery', 'refinery', 'barracks', 'factory', 'radar', 'tech', 'silo', 'turret', 'turret', 'plasma', 'sam', 'sam']);
      ctx.squad(G.enemy, e.x - 12, e.z + 12, [['tank', 4], ['inferno', 2], ['rifle', 8], ['rocket', 4]], true);
      ctx.credits(G.player, 6000); ctx.credits(G.enemy, 6000);
      ctx.ai({});
      revealCircle(s.x, s.z, 42);
    },
    tick(ctx) {
      if (ctx.state.siloSeen || G.time > 3) { ctx.state.siloSeen = true; if (!G.buildings.some(b => b.faction === G.enemy && b.type === 'silo' && !b.dead)) ctx.complete('silo'); }
      if (!G.buildings.some(b => b.faction === G.enemy && !b.dead && !b.def.isMine && !b.def.isWall)) { ctx.complete('all'); ctx.complete('silo'); return ctx.win(); }
      if (!G.buildings.some(b => b.faction === G.player && !b.dead && !b.def.isMine && !b.def.isWall) && !G.units.some(u => u.faction === G.player && !u.dead && u.weapon)) return ctx.fail('Our base has fallen.');
    },
  },
];

// ------------------------------------------------------------------ mission context helpers
export function makeContext(mission, hooks) {
  const status = {};
  for (const o of mission.objectives) status[o.id] = 'open';
  const ctx = {
    state: {}, status,
    complete(id) { if (status[id] !== 'done') { status[id] = 'done'; G.ui?.message(`Objective complete: ${mission.objectives.find(o => o.id === id).text}`); G.sfx?.play('ready'); hooks.changed(); } },
    check(id, ok) { if (ok && status[id] === 'open') { /* ongoing */ } },
    done(id) { return status[id] === 'done'; },
    win() { if (!G.over) hooks.end(true); },
    fail(text) { if (!G.over) { for (const id in status) if (status[id] === 'open') status[id] = 'failed'; hooks.changed(); hooks.end(false, text); } },
    credits(f, n) { G.players[f].credits = n; },
    ai(opts) { hooks.ai(opts); },
    squad(f, x, z, list, guard = false) {
      const out = [];
      let k = 0;
      for (const [t, n] of list) for (let i = 0; i < n; i++) {
        const a = k * 2.399, r = 2.2 * Math.sqrt(k + 1);
        let px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
        const f2 = freeSpot(px, pz); if (f2) { px = f2.x; pz = f2.z; }
        const u = new Unit(t, f, px, pz, Math.atan2(-x, -z));
        if (guard) u.guardPos = { x: px, z: pz };
        out.push(u); k++;
      }
      return out;
    },
    place(f, type, x, z) { return forcePlace(f, type, x, z); },
    base(f, at, list) { for (const t of list) forcePlace(f, t, at.x, at.z); },
  };
  return ctx;
}

function freeSpot(x, z) {
  const cx = cellOf(x), cz = cellOf(z);
  for (let r = 0; r < 8; r++) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
    const X = cx + i, Z = cz + j;
    if (inGrid(X, Z) && !T.blocked[idx(X, Z)] && !T.bld[idx(X, Z)]) return { x: X * CELL - GRID + CELL / 2, z: Z * CELL - GRID + CELL / 2 };
  }
  return null;
}

// place a structure as close as possible to (x, z), leaving a one-cell gap around it
export function forcePlace(f, type, x, z) {
  const d = BUILDINGS[type];
  const c0 = cellOf(x) - Math.floor(d.w / 2), z0 = cellOf(z) - Math.floor(d.h / 2);
  for (let r = 0; r < 30; r++) {
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue;
      const cx = c0 + i, cz = z0 + j;
      if (fits(d, cx, cz)) return new Building(type, f, cx, cz, true);
    }
  }
  return null;
}
function fits(d, cx, cz) {
  let lo = 1e9, hi = -1e9;
  for (let j = -1; j <= d.h; j++) for (let i = -1; i <= d.w; i++) {
    const X = cx + i, Z = cz + j;
    if (!inGrid(X, Z) || X < 3 || Z < 3 || X > GRID - 4 || Z > GRID - 4) return false;
    const k = idx(X, Z);
    const inside = i >= 0 && j >= 0 && i < d.w && j < d.h;
    if (T.bld[k]) return false;
    if (inside && (T.blocked[k] || T.ore[k] > 0)) return false;
    if (inside) { const h = heightAt(X * CELL - GRID + 1, Z * CELL - GRID + 1); lo = Math.min(lo, h); hi = Math.max(hi, h); }
  }
  return hi - lo < 2.4;
}

export function campaignProgress() { return +(localStorage.getItem('ws_campaign') || 0); }
export function unlockNext(i) { if (i + 1 > campaignProgress()) localStorage.setItem('ws_campaign', String(Math.min(MISSIONS.length - 1, i + 1))); }
void alive;
