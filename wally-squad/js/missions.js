// Campaign: Wally's squad against the Grimlock Warlord. Each mission sets up the map, forces and
// objectives, then a tick() checks for victory or defeat and runs scripted events.
import { G, later } from './state.js';
import { BUILDINGS, CELL, GRID } from './config.js';
import { Unit, Building, alive } from './entities.js';
import { T, idx, inGrid, cellOf, heightAt, BASES, revealCircle, groundY } from './terrain.js';
import * as THREE from 'three';

const ALL_BASIC = ['power', 'refinery', 'barracks', 'factory', 'radar', 'turret', 'sam', 'wall', 'gate', 'mine', 'rifle', 'rocket', 'flamer', 'engineer', 'medic', 'buggy', 'tank', 'harvester', 'arty'];
const FIELD_BASE = ['power', 'refinery', 'barracks', 'factory', 'turret', 'wall', 'gate', 'rifle', 'rocket', 'flamer', 'engineer', 'medic', 'buggy', 'tank', 'harvester'];

export const MISSIONS = [
  {
    id: 'm1', title: 'First Contact', map: 'valley', difficulty: 'easy',
    story: [
      'Commander, the Wally Squad has touched down in Crystal Valley. Our scouts report a Grimlock outpost dug in near the valley floor, guarding a rich crystal seam.',
      'Our hero, WALLY MAN, leads the strike team. We have dropped a small field base with a Barracks and War Factory - train more infantry and tanks, then break the outpost. Whatever happens, do not let Wally Man fall.',
      'Tip: Wally Man\'s Gatling gun shreds infantry - let your tanks deal with the turrets. Engineers can capture enemy structures.'
    ],
    objectives: [{ id: 'outpost', text: 'Destroy the Grimlock outpost' }, { id: 'hero', text: 'Wally Man must survive' }],
    allowed: FIELD_BASE,
    setup(ctx) {
      const s = BASES[G.player];
      ctx.base(G.player, s, ['conyard', 'power', 'barracks', 'factory', 'refinery']);
      ctx.hero(G.player, s.x + 12, s.z - 12);
      ctx.squad(G.player, s.x + 14, s.z - 14, [['tank', 3], ['rifle', 6], ['rocket', 3], ['medic', 1], ['engineer', 2]]);
      ctx.credits(G.player, 2500);
      const ox = 26, oz = -26;
      for (const t of ['barracks', 'power', 'power', 'refinery', 'turret', 'turret', 'turret', 'sam']) ctx.place(G.enemy, t, ox, oz);
      ctx.squad(G.enemy, ox, oz, [['rifle', 6], ['rocket', 2], ['tank', 2]], true);
      ctx.squad(G.enemy, -20, 30, [['rifle', 3], ['buggy', 1]], true);
      ctx.ai({ noBuild: true, noUnits: true, noAttack: true });
      revealCircle(s.x, s.z, 40);
    },
    tick(ctx) {
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
    objectives: [{ id: 'hold', text: 'Survive until reinforcements arrive', timer: 420 }, { id: 'hq', text: 'Protect the Command HQ' }, { id: 'hero', text: 'Wally Man must survive' }],
    allowed: ALL_BASIC,
    setup(ctx) {
      const s = BASES[G.player];
      ctx.base(G.player, s, ['conyard', 'power', 'power', 'refinery', 'barracks', 'factory', 'turret', 'turret']);
      ctx.hero(G.player, s.x + 12, s.z + 3);
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
    objectives: [{ id: 'harvest', text: 'Harvest 8,000 credits', progress: () => `${Math.floor(G.stats.harvested)}/8000` }, { id: 'refs', text: 'Destroy all Grimlock refineries' }, { id: 'hero', text: 'Wally Man must survive' }],
    allowed: ALL_BASIC,
    setup(ctx) {
      const s = BASES[G.player], e = BASES[G.enemy];
      ctx.base(G.player, s, ['conyard']);
      ctx.hero(G.player, s.x + 6, s.z + 10);
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
      'Tip: Wally Man\'s Gatling gun clears the infantry guarding the power plants, and Engineers can capture them outright. Watch for Shade stealth tanks - they only appear when close.',
    ],
    objectives: [{ id: 'power', text: 'Destroy every Grimlock Power Plant' }, { id: 'hq', text: 'Destroy the Grimlock Command HQ' }, { id: 'hero', text: 'Wally Man must survive' }],
    allowed: ALL_BASIC,
    setup(ctx) {
      const s = BASES[G.player], e = BASES[G.enemy];
      ctx.base(G.player, s, ['conyard', 'power', 'power', 'refinery', 'barracks', 'factory']);
      ctx.hero(G.player, s.x - 3, s.z - 12);
      ctx.squad(G.player, s.x, s.z - 14, [['engineer', 2], ['tank', 3], ['rocket', 4], ['medic', 1]]);
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
      'Wally Man leads the final assault. Build your Sky Lance Uplink and fight fire with fire. Destroy every Grimlock structure and end this war.',
      'Tip: when the enemy silo is armed, spread your base out - and strike the silo first if you can.',
    ],
    objectives: [{ id: 'silo', text: 'Destroy the Doom Missile Silo' }, { id: 'all', text: 'Destroy every Grimlock structure' }, { id: 'hero', text: 'Wally Man must survive' }],
    allowed: null,
    setup(ctx) {
      const s = BASES[G.player], e = BASES[G.enemy];
      ctx.base(G.player, s, ['conyard', 'power', 'power', 'refinery', 'barracks']);
      ctx.hero(G.player, s.x + 8, s.z - 8);
      ctx.squad(G.player, s.x + 10, s.z - 10, [['tank', 3], ['rifle', 6], ['rocket', 3]]);
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

// ------------------------------------------------------------------ Boot Camp tutorial
// One step at a time: only the current step is shown and checked. Each step has a hint for mouse
// and one for touch screens.
const touchy = () => document.body.classList.contains('touch');
function beacon(x, z) {
  const g = new THREE.Group();
  const y = groundY(x, z);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 30, 16, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 2.2, 0.8), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  col.position.y = 15; g.add(col);
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 4, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 2.5, 1), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.position.y = 0.3; g.add(ring);
  g.position.set(x, y, z);
  g.userData.ring = ring;
  G.three.scene.add(g);
  return g;
}
const STEP_HINTS = {
  cam:   ['Use W A S D or the arrow keys (or push the mouse to the screen edge) to scroll around the map.', 'Drag one finger across the map to scroll the camera. Pinch to zoom.'],
  sel:   ['Click a soldier to select it, or drag a box around the whole squad.', 'Tap a soldier to select it. Tap the "Box" button and drag to select a group.'],
  move:  ['With the squad selected, right-click the green beacon to move there.', 'With the squad selected, tap the green beacon to move there.'],
  power: ['Open the BASE tab on the right, click Power Plant, wait for it to build, then click the ground next to your HQ.', 'Open the BASE tab, tap Power Plant, wait for it to build, then tap the ground next to your HQ.'],
  ref:   ['Crystal pays for everything. Build a Crystal Refinery - a free Harvester comes with it.', 'Crystal pays for everything. Build a Crystal Refinery - a free Harvester comes with it.'],
  barr:  ['Build a Barracks so you can train infantry.', 'Build a Barracks so you can train infantry.'],
  train: ['Open the INFANTRY tab and click Rifleman three times. Clicking queues more.', 'Open the INFANTRY tab and tap Rifleman three times. Each tap queues one more.'],
  apc:   ['Select some infantry and right-click the Squad Carrier APC to load them. Then select the APC and press Unload (U) to drop them off.', 'Select some infantry and tap the Squad Carrier APC to load them. Then select the APC and tap Unload.'],
  attack:['Select everyone (drag a big box, or press Ctrl+A) and right-click the red Grimlock buildings to attack. A-click attack-moves.', 'Select your army and tap the red Grimlock buildings to attack them.'],
};
export const TUTORIAL = {
  id: 'boot', title: 'Boot Camp', map: 'valley', difficulty: 'easy', tutorial: true,
  story: [
    'Welcome to Boot Camp, recruit! Sergeant Wally will walk you through the basics of commanding a Wally Squad base.',
    'Follow the instructions in the top-left corner. Each step unlocks the next one. There is no time limit - take it slow.',
  ],
  objectives: [
    { id: 'cam', text: 'Scroll the camera around' },
    { id: 'sel', text: 'Select your squad' },
    { id: 'move', text: 'Move the squad to the green beacon' },
    { id: 'power', text: 'Build a Power Plant' },
    { id: 'ref', text: 'Build a Crystal Refinery' },
    { id: 'barr', text: 'Build a Barracks' },
    { id: 'train', text: 'Train 3 Riflemen', progress: () => `${Math.min(3, (G.tutorialTrained || 0))}/3` },
    { id: 'apc', text: 'Load infantry into the APC and unload them' },
    { id: 'attack', text: 'Destroy the Grimlock outpost' },
  ],
  allowed: ['power', 'refinery', 'barracks', 'harvester', 'rifle', 'rocket', 'medic'],
  setup(ctx) {
    const s = BASES[G.player], e = BASES[G.enemy];
    ctx.base(G.player, s, ['conyard']);
    ctx.credits(G.player, 6000);
    const dx = e.x - s.x, dz = e.z - s.z, l = Math.hypot(dx, dz) || 1;
    ctx.squad(G.player, s.x + dx / l * 14 + 4, s.z + dz / l * 14, [['rifle', 4], ['rocket', 2]]);
    ctx.state.beaconAt = { x: s.x + dx / l * 30 - dz / l * 8, z: s.z + dz / l * 30 + dx / l * 8 };
    const ox = s.x + dx / l * 62, oz = s.z + dz / l * 62;
    for (const t of ['power', 'barracks']) ctx.place(G.enemy, t, ox, oz);
    ctx.squad(G.enemy, ox, oz, [['rifle', 3]], true);
    ctx.state.outpost = { x: ox, z: oz };
    ctx.ai({ noBuild: true, noUnits: true, noAttack: true });
    G.tutorialTrained = 0;
    revealCircle(s.x, s.z, 34);
  },
  tick(ctx) {
    const st = ctx.state, P = G.players[G.player];
    const step = this.objectives.find(o => ctx.status[o.id] === 'open');
    if (!step) return;
    if (st.step !== step.id) {
      st.step = step.id;
      st.t0 = G.time;
      G.ui?.message(`Boot Camp: ${STEP_HINTS[step.id][touchy() ? 1 : 0]}`);
      G.sfx?.play('ready');
      if (step.id === 'cam') st.cam = { x: G.camera.x, z: G.camera.z };
      if (step.id === 'move') st.beacon = beacon(st.beaconAt.x, st.beaconAt.z);
      if (step.id === 'apc') { const s = BASES[G.player]; st.apc = ctx.squad(G.player, s.x + 8, s.z + 8, [['apc', 1]])[0]; G.ui?.message('A Squad Carrier APC has arrived at your base.'); }
      if (step.id === 'attack') { revealCircle(st.outpost.x, st.outpost.z, 14); G.alertAt = { x: st.outpost.x, z: st.outpost.z, t: G.time }; }
    }
    if (st.beacon) { const r = st.beacon.userData.ring; r.scale.setScalar(1 + 0.12 * Math.sin(G.time * 5)); }
    const mine = G.units.filter(u => u.faction === G.player && !u.dead);
    let ok = false;
    switch (step.id) {
      case 'cam': ok = Math.hypot(G.camera.x - st.cam.x, G.camera.z - st.cam.z) > 14; break;
      case 'sel': ok = G.selection.filter(u => u.kind === 'unit' && u.faction === G.player).length >= 2; break;
      case 'move': ok = mine.filter(u => !u.boarded && Math.hypot(u.x - st.beaconAt.x, u.z - st.beaconAt.z) < 7).length >= 3; break;
      case 'power': ok = P.owned.power > 0; break;
      case 'ref': ok = P.owned.refinery > 0; break;
      case 'barr': ok = P.owned.barracks > 0; break;
      case 'train': ok = (G.tutorialTrained || 0) >= 3; break;
      case 'apc': if (st.apc && (st.apc.passengers || []).length) st.loaded = true; ok = st.loaded && st.apc && !(st.apc.passengers || []).length || (st.apc && st.apc.dead); break;
      case 'attack': ok = !G.buildings.some(b => b.faction === G.enemy && !b.dead); break;
    }
    if (ok) {
      if (st.beacon && step.id === 'move') { G.three.scene.remove(st.beacon); st.beacon = null; }
      ctx.complete(step.id);
      if (step.id === 'attack') { G.ui?.message('Outstanding, recruit! You are ready for the campaign.'); return ctx.win(); }
    }
  },
  hint(ctx) { return ctx.state.step ? STEP_HINTS[ctx.state.step][touchy() ? 1 : 0] : ''; },
};

// ------------------------------------------------------------------ mission context helpers
export function makeContext(mission, hooks) {
  const status = {};
  for (const o of mission.objectives) status[o.id] = 'open';
  const ctx = {
    state: {}, status,
    complete(id) { if (status[id] !== 'done') { status[id] = 'done'; G.ui?.message(`Objective complete: ${mission.objectives.find(o => o.id === id).text}`); G.sfx?.play('ready'); hooks.changed(); } },
    check(id, ok) { if (ok && status[id] === 'open') { /* ongoing */ } },
    done(id) { return status[id] === 'done'; },
    win() { if (!G.over) { if (status.hero === 'open') status.hero = 'done'; hooks.changed(); hooks.end(true); } },
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
    // Wally Man, campaign hero: much tougher than a normal trooper, starts as Elite, and must survive
    hero(f, x, z) {
      const [u] = this.squad(f, x, z, [['wallyman', 1]]);
      u.hero = true; u.maxHp = u.hp = 1000; u.rank = 2; u.kills = 6;
      ctx.heroUnit = u;
      return u;
    },
    heroCheck() {
      if (ctx.heroUnit && ctx.heroUnit.dead && !G.over) { status.hero = 'failed'; hooks.changed(); hooks.end(false, 'Wally Man has fallen. Mission failed.'); return false; }
      if (ctx.heroUnit && status.hero === 'open' && G.over) status.hero = 'done';
      return true;
    },
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

