// Campaign: Wally's squad against the Grimlock Warlord. Each mission sets up the map, forces and
// objectives, then a tick() checks for victory or defeat and runs scripted events.
import { G, later, srand, srr } from './state.js';
import { BUILDINGS, CELL, GRID } from './config.js';
import { Unit, Building, alive } from './entities.js';
import { T, idx, inGrid, cellOf, cellCenter, heightAt, BASES, revealCircle, groundY } from './terrain.js';
import { nearestFree, findPath } from './pathfind.js';
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
  {
    id: 'm6', title: 'Into the Fire', map: 'magma', difficulty: 'hard',
    story: [
      'The Warlord is gone, but his champion is not. WARLORD GRAK has gathered the last Grimlock legions in a fortress on the far side of the Magma Rift.',
      'The lava river can only be crossed at three points. Grak hides his Shade tanks along the crossings - bring Recon Drones to see them, Repair Trucks to keep your armour rolling, and APCs to rush infantry across.',
      'Tip: Grak\'s War Cry makes nearby Grimlocks fire much faster. Focus him down first - and keep Wally Man alive.',
    ],
    objectives: [{ id: 'grak', text: 'Defeat Warlord Grak' }, { id: 'all', text: 'Destroy the Grimlock fortress' }, { id: 'hero', text: 'Wally Man must survive' }],
    allowed: null,
    setup(ctx) {
      const s = BASES[G.player], e = BASES[G.enemy];
      ctx.base(G.player, s, ['conyard', 'power', 'power', 'refinery', 'barracks', 'factory']);
      ctx.hero(G.player, s.x + 10, s.z + 6);
      ctx.squad(G.player, s.x + 12, s.z + 9, [['tank', 3], ['rifle', 6], ['rocket', 3], ['apc', 1], ['repair', 1]]);
      ctx.base(G.enemy, e, ['conyard', 'power', 'power', 'power', 'refinery', 'refinery', 'barracks', 'factory', 'radar', 'helipad', 'turret', 'turret', 'bunker', 'bunker', 'plasma', 'sam']);
      const [grak] = ctx.squad(G.enemy, e.x - 10, e.z - 8, [['warlord', 1]], true);
      grak.maxHp = grak.hp = 1400; grak.rank = 2;
      ctx.state.grak = grak;
      ctx.squad(G.enemy, e.x - 14, e.z - 12, [['tank', 3], ['inferno', 2], ['rifle', 6], ['rocket', 3]], true);
      ctx.squad(G.enemy, 0, 0, [['stealth', 2]], true);
      ctx.squad(G.enemy, -32, 48, [['stealth', 1], ['rifle', 3]], true);
      ctx.squad(G.enemy, 32, -48, [['stealth', 1], ['rifle', 3]], true);
      ctx.credits(G.player, 5000); ctx.credits(G.enemy, 5000);
      ctx.ai({});
      revealCircle(s.x, s.z, 42);
    },
    tick(ctx) {
      if (ctx.state.grak && ctx.state.grak.dead && !ctx.done('grak')) { ctx.complete('grak'); G.announce?.('Warlord Grak has fallen!'); }
      if (!G.buildings.some(b => b.faction === G.enemy && !b.dead && !b.def.isMine && !b.def.isWall)) ctx.complete('all');
      if (ctx.done('grak') && ctx.done('all')) return ctx.win();
      if (!G.buildings.some(b => b.faction === G.player && !b.dead && !b.def.isMine && !b.def.isWall) && !G.units.some(u => u.faction === G.player && !u.dead && u.weapon)) return ctx.fail('Our base has fallen.');
    },
  },
  {
    id: 'm7', title: 'Operation Haggis Supper', map: 'highland', difficulty: 'normal', noBase: true,
    story: [
      'Bad news, commander. While we were busy with Grak, a Grimlock raiding party snatched four of our crystal scientists. They are locked up in a prison camp on the far side of the Highlands.',
      'This is a commando job - no base, no reinforcements. Wally Man leads a small strike team. Reach the scientists (walk any of your soldiers right up to them to set them free), then bring at least three of them home to the green evac beacon.',
      'Tip: the APC can carry the scientists home safely. Blink Troopers can teleport past guards. Keep the medics close.',
    ],
    objectives: [{ id: 'free', text: 'Free the 4 captured scientists', progress: () => `${G.missionFreed || 0}/4` }, { id: 'evac', text: 'Bring at least 3 scientists to the evac beacon', progress: () => `${G.missionSaved || 0}/3` }, { id: 'hero', text: 'Wally Man must survive' }],
    allowed: [],
    setup(ctx) {
      const s = BASES[G.player], e = BASES[G.enemy];
      G.missionFreed = 0; G.missionSaved = 0;
      ctx.hero(G.player, s.x + 6, s.z - 6);
      ctx.squad(G.player, s.x + 9, s.z - 9, [['wally', 1], ['rifle', 5], ['rocket', 2], ['medic', 2], ['blink', 2], ['apc', 1]]);
      ctx.credits(G.player, 0);
      // the prison camp
      ctx.base(G.enemy, e, ['barracks', 'power', 'bunker', 'turret', 'turret', 'sam']);
      const cx = e.x * 0.85, cz = e.z * 0.85;
      ctx.state.captives = ctx.squad('neutral', cx, cz, [['engineer', 4]]);
      for (const u of ctx.state.captives) { u.stance = 'holdfire'; u.captive = true; }
      ctx.squad(G.enemy, cx + 4, cz + 4, [['rifle', 5], ['flamer', 2], ['dog', 2]], true);
      // guard posts along the way
      for (const k of [0.3, 0.55]) ctx.squad(G.enemy, s.x + (e.x - s.x) * k + 8, s.z + (e.z - s.z) * k - 8, [['rifle', 4], ['rocket', 1], ['dog', 1]], true);
      ctx.squad(G.enemy, s.x + (e.x - s.x) * 0.45 - 10, s.z + (e.z - s.z) * 0.45 + 10, [['tank', 1], ['rifle', 2]], true);
      ctx.ai({ noBuild: true, noUnits: true, noAttack: true });
      ctx.state.evac = { x: s.x, z: s.z };
      ctx.state.beacon = beacon(s.x, s.z);
      revealCircle(s.x, s.z, 30); revealCircle(cx, cz, 14);
      G.alertAt = { x: cx, z: cz, t: G.time };
    },
    tick(ctx) {
      const st = ctx.state, mine = G.units.filter(u => u.faction === G.player && !u.dead);
      if (st.beacon) st.beacon.userData.ring.scale.setScalar(1 + 0.12 * Math.sin(G.time * 5));
      for (let i = 0; i < st.captives.length; i++) {
        const c = st.captives[i];
        if (!c || c.dead) continue;
        if (mine.some(u => !u.boarded && Math.hypot(u.x - c.x, u.z - c.z) < 6)) { // set free: they join your side
          const free = new Unit('engineer', G.player, c.x, c.z, c.yaw || 0);
          free.scientist = true; free.nick = ['Dr. McTavish', 'Prof. Bairn', 'Dr. Haggerty', 'Dr. Wee Jean'][i];
          c.remove(); st.captives[i] = null;
          G.missionFreed++; G.ui?.message(`${free.nick} has been freed! Get them to the evac beacon.`); G.sfx?.play('ready');
          if (G.missionFreed >= 4) ctx.complete('free');
        }
      }
      for (const u of mine) if (u.scientist && !u.boarded && Math.hypot(u.x - st.evac.x, u.z - st.evac.z) < 8) {
        u.remove(); G.missionSaved++; G.ui?.message(`${u.nick} is safe! (${G.missionSaved} rescued)`); G.sfx?.play('jingle');
      }
      const lost = 4 - G.missionSaved - st.captives.filter(c => c && !c.dead).length - G.units.filter(u => u.scientist && !u.dead).length;
      if (G.missionSaved >= 3) { ctx.complete('evac'); if (!ctx.done('free') && G.missionFreed >= 3) ctx.complete('free'); return ctx.win(); }
      if (lost > 1) return ctx.fail('Too many scientists were lost.');
      if (!mine.some(u => !u.scientist)) return ctx.fail('Our strike team has been wiped out.');
    },
  },
  {
    id: 'm8', title: 'Road to Glen Crystal', map: 'canyon', difficulty: 'normal',
    story: [
      'The outpost at Glen Crystal is running out of everything - fuel, shells and, worst of all, tea. Three armoured supply trucks are ready to roll from our base.',
      'The trucks drive themselves along the canyon road. Your job is to keep them alive: scout ahead, clear the ambushes and escort them all the way to the outpost. At least two must make it.',
      'Tip: Grimlock ambushes come from the side canyons. Send buggies ahead to spot them, and keep a Repair Truck with the convoy.',
    ],
    objectives: [{ id: 'escort', text: 'Get at least 2 supply trucks to the outpost', progress: () => `${G.missionArrived || 0}/2` }, { id: 'hero', text: 'Wally Man must survive' }],
    allowed: FIELD_BASE.concat(['repair', 'apc', 'radar', 'sam', 'drone']),
    setup(ctx) {
      const s = BASES[G.player], e = BASES[G.enemy];
      G.missionArrived = 0;
      ctx.base(G.player, s, ['conyard', 'power', 'power', 'refinery', 'barracks', 'factory']);
      ctx.hero(G.player, s.x + 10, s.z + 4);
      ctx.squad(G.player, s.x + 12, s.z + 8, [['tank', 3], ['buggy', 2], ['rifle', 4], ['rocket', 2], ['repair', 1]]);
      ctx.credits(G.player, 4000);
      // the outpost: the far corner of the map that isn't the Grimlock base
      const goal = [[e.x, s.z], [s.x, e.z], [-s.x, -s.z * 0.2]].map(([x, z]) => ({ x: x * 0.85, z: z * 0.85 })).find(p => Math.hypot(p.x - e.x, p.z - e.z) > 60 && Math.hypot(p.x - s.x, p.z - s.z) > 80) || { x: e.x * 0.7, z: -e.z * 0.7 };
      const f = nearestFree(cellOf(goal.x), cellOf(goal.z), 20); if (f) { goal.x = cellCenter(f.x); goal.z = cellCenter(f.z); }
      { const p = findPath(s.x + 6, s.z + 12, goal.x, goal.z, { maxIter: 80000 }); const end = p && p[p.length - 1]; if (end) { goal.x = end.x; goal.z = end.z; } } // somewhere the trucks can actually drive to
      G.missionGoal = goal; ctx.state.goal = goal; ctx.state.beacon = beacon(goal.x, goal.z);
      ctx.state.trucks = ctx.squad(G.player, s.x + 6, s.z + 12, [['convoy', 3]]);
      ctx.state.trucks.forEach((t, i) => { t.stance = 'holdfire'; t.speedMult = 0.7; t.nick = ['Tea Wagon', 'Shell Shock', 'Big Bertha'][i]; t.wait = i * 4; });
      ctx.base(G.enemy, e, ['conyard', 'power', 'power', 'refinery', 'barracks', 'factory', 'turret', 'turret']);
      ctx.credits(G.enemy, 3000);
      ctx.ai({ noAttack: true });
      // ambushes along the road, each one sprung as the convoy gets close
      ctx.state.ambush = [0.25, 0.45, 0.62, 0.8].map((k, i) => ({ k, x: s.x + (goal.x - s.x) * k, z: s.z + (goal.z - s.z) * k, sprung: false,
        list: [[['rifle', 4], ['rocket', 2]], [['tank', 2], ['flamer', 3], ['buggy', 1]], [['stealth', 2], ['rocket', 3], ['rifle', 3]], [['tank', 3], ['inferno', 1], ['arty', 1], ['rocket', 3]]][i] }));
      revealCircle(s.x, s.z, 40); revealCircle(goal.x, goal.z, 14);
      later(6, () => G.ui?.message('The convoy is rolling out! Keep those trucks safe.', true));
    },
    tick(ctx) {
      const st = ctx.state;
      if (st.beacon) st.beacon.userData.ring.scale.setScalar(1 + 0.12 * Math.sin(G.time * 5));
      for (const t of st.trucks) {
        if (t.dead || t.arrived) continue;
        if (Math.hypot(t.x - st.goal.x, t.z - st.goal.z) < 9) { t.arrived = true; G.missionArrived++; G.ui?.message(`${t.nick} made it to Glen Crystal!`); G.sfx?.play('jingle'); t.stop(); continue; }
        if (G.time < 6 + t.wait) continue;
        // trucks stop and wait while enemies are close by, then roll on once the road is clear
        const threat = G.units.some(u => u.faction === G.enemy && !u.dead && !u.air && Math.hypot(u.x - t.x, u.z - t.z) < 18);
        if (threat) { if (!t.halted) { t.halted = true; t.stop(); if (!st.haltMsgT || G.time - st.haltMsgT > 20) { st.haltMsgT = G.time; G.ui?.message(`${t.nick} has stopped under fire - clear the road!`, true); } } continue; }
        if (t.halted) { t.halted = false; t.path = null; t.order = null; }
        if (!t.order && !t.path) t.moveTo(st.goal.x + (t.wait - 4) * 0.8, st.goal.z);
      }
      // spring an ambush when the leading truck gets near it
      const lead = st.trucks.filter(t => !t.dead && !t.arrived);
      for (const a of st.ambush) if (!a.sprung && lead.some(t => Math.hypot(t.x - a.x, t.z - a.z) < 34)) {
        a.sprung = true;
        const side = srand() < 0.5 ? 1 : -1, dx = st.goal.x - a.x, dz = st.goal.z - a.z, l = Math.hypot(dx, dz) || 1;
        const ax = a.x - dz / l * 22 * side, az = a.z + dx / l * 22 * side;
        const us = ctx.squad(G.enemy, ax, az, a.list);
        const tgt = lead[0];
        for (const u of us) u.attack(tgt);
        G.ui?.message('Ambush! Protect the trucks!', true); G.alertAt = { x: ax, z: az, t: G.time };
      }
      if (G.missionArrived >= 2 && !lead.length || G.missionArrived >= 3) { ctx.complete('escort'); return ctx.win(); }
      if (G.missionArrived + lead.length < 2) return ctx.fail('Too many supply trucks were destroyed.');
    },
  },
  {
    id: 'm9', title: "The Dragon's Lair", map: 'magma', difficulty: 'hard',
    story: [
      'Something has woken up beneath the Magma Rift. Something BIG. An Ancient Dragon - older than the valley itself - has claimed the crystal fields, and a Grimlock cult worships it from a camp on the far bank.',
      'It will come for our base, and it will bring its brood of wyverns. Build anti-air - SAM Sites, Rocket Troopers, Hornets - and slay the beast. Wally Man insists on being there. Of course he does.',
      'Tip: the dragon gets angrier the more you hurt it. Keep plenty of rockets near your Command HQ, and repair your SAMs between attacks.',
    ],
    objectives: [{ id: 'dragon', text: 'Slay the Ancient Dragon', progress: () => G.missionBoss && !G.missionBoss.dead ? `${Math.ceil(G.missionBoss.hp / G.missionBoss.maxHp * 100)}% health` : '' }, { id: 'hq', text: 'Protect the Command HQ' }, { id: 'hero', text: 'Wally Man must survive' }],
    allowed: null,
    setup(ctx) {
      const s = BASES[G.player], e = BASES[G.enemy];
      ctx.base(G.player, s, ['conyard', 'power', 'power', 'refinery', 'barracks', 'factory', 'radar', 'sam']);
      ctx.hero(G.player, s.x + 10, s.z + 6);
      ctx.squad(G.player, s.x + 12, s.z + 9, [['rocket', 6], ['rifle', 4], ['tank', 2]]);
      ctx.credits(G.player, 7000);
      ctx.base(G.enemy, e, ['conyard', 'power', 'power', 'refinery', 'barracks', 'helipad', 'turret', 'sam']);
      ctx.credits(G.enemy, 2000);
      ctx.ai({ noAttack: true });
      const lx = e.x * 0.55, lz = -e.z * 0.3;
      const d = new Unit('dragon', 'neutral', lx, lz, 0);
      d.maxHp = d.hp = 16000; d.rank = 3; d.nick = 'Auld Scorchie'; d.boss = true;
      G.missionBoss = d; ctx.state.d = d; ctx.state.phase = 0; ctx.state.wakeT = 50;
      revealCircle(s.x, s.z, 42);
      later(4, () => G.ui?.message('The ground is shaking... Build anti-air while you still can!', true));
    },
    tick(ctx) {
      const st = ctx.state, d = st.d, s = BASES[G.player];
      if (!G.buildings.some(b => b.faction === G.player && b.type === 'conyard' && !b.dead)) return ctx.fail('The Command HQ has been destroyed.');
      if (d.dead) { ctx.complete('dragon'); G.announce?.('Auld Scorchie has been slain! The Highlands are safe!'); return ctx.win(); }
      st.wakeT -= 0.5;
      if (st.wakeT <= 0) { // swoop on the player's base every so often
        st.wakeT = 28;
        const mineB = G.buildings.filter(b => b.faction === G.player && !b.dead && !b.def.isWall && !b.def.isMine);
        const t = mineB.length ? mineB[Math.floor(srand() * mineB.length)] : s;
        d.moveTo(t.x + srr(-6, 6), t.z + srr(-6, 6), { attackMove: true });
        if (!st.warned) { st.warned = true; G.announce?.('The Ancient Dragon is awake - and it is heading for our base!', G.player, 9); }
        G.alertAt = { x: d.x, z: d.z, t: G.time };
      }
      // brood of wyverns as it gets hurt, and it grows angrier (heals a little, flies faster)
      const f = d.hp / d.maxHp;
      const phases = [[0.75, 2], [0.5, 3], [0.25, 4]];
      if (st.phase < phases.length && f < phases[st.phase][0]) {
        const n = phases[st.phase][1]; st.phase++;
        const us = ctx.squad(G.enemy, d.x, d.z, [['wyvern', n]]);
        for (const u of us) u.moveTo(s.x, s.z, { attackMove: true });
        d.hp = Math.min(d.maxHp, d.hp + d.maxHp * 0.04); d.speedMult = 1 + st.phase * 0.15;
        const lines = ['The dragon roars - its brood is coming!', 'The dragon is ENRAGED! More wyverns incoming!', 'Auld Scorchie is nearly finished - and absolutely furious!'];
        G.announce?.(lines[st.phase - 1], G.player, 9); G.sfx?.play('wardrum');
      }
    },
  },
];

// ------------------------------------------------------------------ Grimlock campaign
// Play the other side: Warlord Grak leads the Grimlock Legion against the Wally Squad.
const GRIM_BASIC = ['power', 'refinery', 'barracks', 'factory', 'radar', 'turret', 'sam', 'bunker', 'wall', 'gate', 'mine', 'rifle', 'rocket', 'flamer', 'engineer', 'shaman', 'buggy', 'tank', 'harvester', 'arty', 'stealth', 'inferno', 'apc', 'repair'];
export const GRIM_MISSIONS = [
  {
    id: 'g1', title: 'Raid on Crystal Valley', map: 'valley', difficulty: 'easy', faction: 'grim',
    story: [
      'Grimlock Legion, hear me! I am WARLORD GRAK. The Wally Squad has built a crystal outpost on OUR valley.',
      'Take my raiders and burn it to the ground. Train more troops at the barracks if you must - but do not let Grak fall.',
      'Tip: Grak\'s War Cry (G) makes every Grimlock near him fire much faster. Use it when the fighting starts!',
    ],
    objectives: [{ id: 'outpost', text: 'Destroy the Wally Squad outpost' }, { id: 'hero', text: 'Warlord Grak must survive' }],
    allowed: GRIM_BASIC,
    setup(ctx) {
      const s = BASES[G.player];
      ctx.base(G.player, s, ['conyard', 'power', 'barracks', 'factory', 'refinery']);
      ctx.hero(G.player, s.x + 12, s.z - 12, 'warlord');
      ctx.squad(G.player, s.x + 14, s.z - 14, [['tank', 3], ['rifle', 6], ['flamer', 3], ['shaman', 1], ['stealth', 1]]);
      ctx.credits(G.player, 2500);
      const ox = 26, oz = -26;
      for (const t of ['barracks', 'power', 'power', 'refinery', 'turret', 'turret', 'bunker', 'sam']) ctx.place(G.enemy, t, ox, oz);
      ctx.squad(G.enemy, ox, oz, [['rifle', 6], ['rocket', 2], ['tank', 2], ['medic', 1]], true);
      ctx.ai({ noBuild: true, noUnits: true, noAttack: true });
      revealCircle(s.x, s.z, 40);
    },
    tick(ctx) {
      if (!G.buildings.some(b => b.faction === G.enemy && !b.dead && !b.def.isMine && !b.def.isWall)) { ctx.complete('outpost'); return ctx.win(); }
      if (!G.units.some(u => u.faction === G.player && !u.dead)) return ctx.fail('Our raiders have been wiped out.');
    },
  },
  {
    id: 'g2', title: 'Night of the Shades', map: 'midnight', difficulty: 'normal', faction: 'grim',
    story: [
      'The Wally Squad watches us with their Comms Centers. Blind them, and they cannot see us coming.',
      'Night has fallen on the ridge. My Shade tanks are invisible in the dark - slip past their towers and destroy every Comms Center before their reinforcements arrive in eight minutes.',
      'Tip: Shades stay cloaked until they fire. Watch out for Recon Drones - they can see through the cloak.',
    ],
    objectives: [{ id: 'radar', text: 'Destroy every Wally Squad Comms Center', timer: 480 }, { id: 'hero', text: 'Warlord Grak must survive' }],
    allowed: GRIM_BASIC,
    setup(ctx) {
      const s = BASES[G.player], e = BASES[G.enemy];
      ctx.base(G.player, s, ['conyard', 'power', 'power', 'refinery', 'barracks', 'factory']);
      ctx.hero(G.player, s.x + 8, s.z - 10, 'warlord');
      ctx.squad(G.player, s.x + 10, s.z - 12, [['stealth', 5], ['rifle', 4], ['rocket', 2], ['shaman', 1]]);
      ctx.credits(G.player, 4000);
      ctx.base(G.enemy, e, ['conyard', 'power', 'power', 'refinery', 'barracks', 'factory', 'turret', 'turret', 'sam']);
      ctx.place(G.enemy, 'radar', e.x - 40, e.z + 30); ctx.place(G.enemy, 'turret', e.x - 40, e.z + 30);
      ctx.place(G.enemy, 'radar', e.x + 40, e.z + 30); ctx.place(G.enemy, 'turret', e.x + 40, e.z + 30);
      ctx.place(G.enemy, 'radar', e.x, e.z - 4);
      ctx.squad(G.enemy, e.x, e.z + 14, [['tank', 3], ['rifle', 6], ['rocket', 3], ['drone', 1]], true);
      ctx.ai({ noAttack: true });
      revealCircle(s.x, s.z, 42);
    },
    tick(ctx) {
      if (!G.buildings.some(b => b.faction === G.enemy && b.type === 'radar' && !b.dead)) { ctx.complete('radar'); return ctx.win(); }
      if (G.time >= 480) return ctx.fail('Wally Squad reinforcements have arrived. The night raid has failed.');
      if (!G.buildings.some(b => b.faction === G.player && !b.dead && !b.def.isMine && !b.def.isWall) && !G.units.some(u => u.faction === G.player && !u.dead && u.weapon)) return ctx.fail('Our forces have fallen.');
    },
  },
  {
    id: 'g3', title: "Grak's Revenge", map: 'frost', difficulty: 'hard', faction: 'grim',
    story: [
      'This is the day the Wally Squad falls. Their fortress in Frostbite Pass is all that stands between the Legion and total victory.',
      'And WALLY MAN himself defends it. Crush their hero, raze every building, and the valley is ours forever!',
      'Tip: Wally Man shreds infantry - send Inferno and Battle Tanks at him, and keep Shamans close to Grak.',
    ],
    objectives: [{ id: 'wallyman', text: 'Defeat Wally Man' }, { id: 'all', text: 'Destroy every Wally Squad structure' }, { id: 'hero', text: 'Warlord Grak must survive' }],
    allowed: null,
    setup(ctx) {
      const s = BASES[G.player], e = BASES[G.enemy];
      ctx.base(G.player, s, ['conyard', 'power', 'power', 'refinery', 'barracks', 'factory', 'radar']);
      ctx.hero(G.player, s.x + 12, s.z + 3, 'warlord');
      ctx.squad(G.player, s.x + 14, s.z, [['tank', 4], ['inferno', 2], ['rifle', 6], ['rocket', 3], ['shaman', 2]]);
      ctx.base(G.enemy, e, ['conyard', 'power', 'power', 'power', 'refinery', 'refinery', 'barracks', 'factory', 'radar', 'tech', 'turret', 'turret', 'bunker', 'plasma', 'sam']);
      const [wm] = ctx.squad(G.enemy, e.x - 12, e.z, [['wallyman', 1]], true);
      wm.hero = true; wm.maxHp = wm.hp = 1300; wm.rank = 2;
      ctx.state.wm = wm;
      ctx.squad(G.enemy, e.x - 16, e.z + 6, [['titan', 2], ['tank', 3], ['rifle', 8], ['rocket', 4], ['medic', 2]], true);
      ctx.credits(G.player, 6000); ctx.credits(G.enemy, 6000);
      ctx.ai({});
      revealCircle(s.x, s.z, 45);
    },
    tick(ctx) {
      if (ctx.state.wm && ctx.state.wm.dead && !ctx.done('wallyman')) { ctx.complete('wallyman'); G.announce?.('Wally Man has fallen!'); }
      if (!G.buildings.some(b => b.faction === G.enemy && !b.dead && !b.def.isMine && !b.def.isWall)) ctx.complete('all');
      if (ctx.done('wallyman') && ctx.done('all')) return ctx.win();
      if (!G.buildings.some(b => b.faction === G.player && !b.dead && !b.def.isMine && !b.def.isWall) && !G.units.some(u => u.faction === G.player && !u.dead && u.weapon)) return ctx.fail('The Legion has been crushed.');
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
    hero(f, x, z, type = 'wallyman') {
      const [u] = this.squad(f, x, z, [[type, 1]]);
      u.hero = true; u.maxHp = u.hp = type === 'warlord' ? 1300 : 1000; u.rank = 2; u.kills = 6;
      ctx.heroUnit = u;
      return u;
    },
    heroCheck() {
      if (ctx.heroUnit && ctx.heroUnit.dead && !G.over) { status.hero = 'failed'; hooks.changed(); hooks.end(false, `${ctx.heroUnit.def.name} has fallen. Mission failed.`); return false; }
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

const progKey = camp => camp === 'grim' ? 'ws_campaign_grim' : 'ws_campaign';
export const campaignList = camp => camp === 'grim' ? GRIM_MISSIONS : MISSIONS;
export function campaignProgress(camp) { try { return +(localStorage.getItem(progKey(camp)) || 0); } catch { return 0; } }
export function unlockNext(i, camp) { if (i + 1 > campaignProgress(camp)) try { localStorage.setItem(progKey(camp), String(Math.min(campaignList(camp).length - 1, i + 1))); } catch { /* ignore */ } }

