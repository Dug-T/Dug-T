// The other survivors: where they live, what they say as the mountain wakes, and how they follow you.
import * as THREE from 'three';
import { POIS, heightAt, SEA, normalAt } from './island.js';
import { buildSurvivor, animateSurvivor, LOOKS, groundTilt } from './survivor.js';

export const SURVIVORS = [
  {
    id: 'amara', name: 'Dr Amara Osei', role: 'Volcanologist', home: 'camp', offset: [1.8, 1.2], pose: 'sit',
    lines: {
      calm: ['The seismometer at the station went off the scale last night. This mountain is waking up.', 'We have hours, not days. Three ways off this rock: the sea, the sky, or underground. Pick one and commit.', 'Kai in the village knows boats. Lena at the ranger station has a radio, if it still works.'],
      unrest: ['Feel that? Harmonic tremor. Magma is on the move.', 'When the ash starts, breathe through wet cloth. Your lungs will thank you.'],
      ashfall: ['Keep your mask on. This ash is glass. Fine as flour and twice as nasty.', 'The column is going to collapse eventually. When it does, run.'],
      eruption: ['Lava bombs. Watch the sky and listen for the whistle!', 'The flows take the valleys. Stay on the ridges and get to the coast.'],
      surge: ['This is it! Underground or off the island, NOW!'],
      follow: 'Right behind you. Go!', wait: 'I\'ll stay put. Come back for me.',
    },
  },
  {
    id: 'kai', name: 'Kai Tane', role: 'Fisherman', home: 'village', offset: [-4, 4], pose: 'stand',
    lines: {
      calm: ['My boat went down on the reef in the storm. Everyone else took the ferry to the mainland. I stayed for the fish.', 'A raft would do it: ten good logs, three ropes, and something for a sail. Build it on Raft Beach, east side, the current carries you off the reef there.', 'There\'s a survival tarp in that plane that came down in the jungle. Makes a fine sail.'],
      unrest: ['The sea is wrong today. Fish are leaving. Fish know.', 'Braid vines for rope. Three strands, tight.'],
      ashfall: ['Ash on the water. Never seen that. Get building, friend.'],
      eruption: ['Paddle straight out from Raft Beach and don\'t look back. Past the reef is far enough.'],
      surge: ['Go! GO!'],
      follow: 'Lead on. I can paddle.', wait: 'I\'ll wait by the huts.',
    },
  },
  {
    id: 'tomas', name: 'Tomas Reyes', role: 'Pilot', home: 'wreck', offset: [-9, 4], pose: 'lie', hurt: true,
    lines: {
      hurt: ['My leg\'s busted. Bandage it and I can walk. There\'s cloth in the cabin seats... *coughs*'],
      healed: ['That\'ll hold. Thanks. The battery\'s in the nose of the plane, still good. Take it.', 'If the ranger\'s radio works, that battery will run it. Tell Lena the pilot sends his apologies about her tower.'],
      calm: ['Flew in supplies for the research station. Clipped the ranger\'s mast in the crosswind and came down here.'],
      unrest: ['I\'ve flown over volcanoes. You don\'t want to be under one.'],
      ashfall: ['Ash and engines don\'t mix. A helicopter will need a clear pad. Keep the helipad clear.'],
      eruption: ['Move, move. I can keep up.'],
      surge: ['We\'re out of time!'],
      follow: 'Limping, but coming.', wait: 'I\'ll rest here.',
    },
  },
  {
    id: 'lena', name: 'Lena Hart', role: 'Park Ranger', home: 'tower', offset: [3, 6], pose: 'stand',
    lines: {
      calm: ['The mast came down when that plane clipped it. Battery\'s flat. And the villagers borrowed my handset for their radio hut and never brought it back.', 'Get me a battery, the antenna from the mast and the handset, and I can raise the coastguard. A helicopter can be here in minutes.', 'The helipad is just east of here. Keep it clear.'],
      unrest: ['Every bird on the island just left. I\'ve never seen the sky so empty.'],
      ashfall: ['A chopper can land in light ash. Heavy ash, no chance. Hurry.'],
      eruption: ['Whatever you\'re doing, do it faster!'],
      surge: ['It\'s coming down the mountain! Get out of here!'],
      fixed: ['Coastguard, this is Ranger Station Kalani... yes! YES! They\'re scrambling a helicopter. Get everyone to the pad!'],
      follow: 'Moving out.', wait: 'I\'ll hold the station.',
    },
  },
  {
    id: 'pete', name: 'Old Pete', role: 'Hermit', home: 'bunker', offset: [4, 5], pose: 'sit',
    lines: {
      calm: ['Forty years I\'ve been on this island. She grumbles. She\'s never done this.', 'This shelter was dug in \'43. Steel door, two metres of rock, air vent out the back. Stock it with water and food and a mask for the ash, and she\'ll hold.', 'You seal that door, you stay sealed. No peeking.'],
      unrest: ['The goats went up the far ridge this morning. Goats know.'],
      ashfall: ['Four waters, four meals, one mask. Then we shut the door.'],
      eruption: ['Lava\'s in the south valley. Keep to the coast path.'],
      surge: ['In! IN! Shut the door!'],
      follow: 'Aye, I\'m with you.', wait: 'I\'ll keep the door open for you.',
    },
  },
];

const tmpN = new THREE.Vector3();
export class NpcManager {
  constructor(scene, world, hooks) {
    this.scene = scene; this.world = world; this.hooks = hooks; this.list = [];
    for (const def of SURVIVORS) {
      const look = LOOKS[def.id] || {};
      const rig = buildSurvivor(look);
      const home = POIS[def.home];
      const x = home.x + def.offset[0], z = home.z + def.offset[1];
      rig.root.position.set(x, heightAt(x, z), z);
      scene.add(rig.root);
      this.list.push({ def, rig, x, z, y: heightAt(x, z), yaw: Math.random() * 6, home: { x, z }, state: def.pose === 'lie' ? 'hurt' : 'home', hurt: !!def.hurt, said: 0, talkT: 0, fleeT: 0, fleeDir: 0, saved: false, dead: false, speed: 0, wanderT: 2, tx: x, tz: z, lineIdx: 0, healedSaid: false });
    }
  }
  byId(id) { return this.list.find((n) => n.def.id === id); }
  nearest(x, z, maxD = 3) { let best = null, bd = maxD; for (const n of this.list) { if (n.dead || n.saved) continue; const d = Math.hypot(n.x - x, n.z - z); if (d < bd) { bd = d; best = n; } } return best; }
  followers() { return this.list.filter((n) => n.state === 'follow' && !n.dead); }
  // what this survivor says right now
  line(n, stageId, flags = {}) {
    const L = n.def.lines;
    if (n.hurt) return L.hurt[0];
    if (n.def.id === 'tomas' && !n.healedSaid) { n.healedSaid = true; return L.healed[0]; }
    if (n.def.id === 'lena' && flags.radioFixed && !n.fixedSaid) { n.fixedSaid = true; return L.fixed[0]; }
    const pool = L[stageId] || L.calm;
    const s = pool[n.lineIdx % pool.length]; n.lineIdx++;
    return s;
  }
  // talk / toggle following. Returns { text, name }
  interact(n, ctx) {
    if (n.hurt) {
      if (ctx.inventory.count('bandage') > 0) { ctx.inventory.add('bandage', -1); n.hurt = false; n.state = 'home'; if (this.hooks.onHeal) this.hooks.onHeal(n); return { name: n.def.name, text: this.line(n, ctx.stageId, ctx) }; }
      return { name: n.def.name, text: n.def.lines.hurt[0] + ' (You need a bandage: craft one from cloth.)' };
    }
    // first press talks; pressing again within a few seconds toggles following
    if (n.talkT > 0) {
      if (n.state === 'follow') { n.state = 'home'; n.tx = n.x; n.tz = n.z; return { name: n.def.name, text: n.def.lines.wait }; }
      n.state = 'follow'; return { name: n.def.name, text: n.def.lines.follow };
    }
    n.talkT = 4;
    return { name: n.def.name, text: this.line(n, ctx.stageId, ctx) + (n.state === 'follow' ? '' : '  (Press again: come with me)') };
  }
  // a hot rock lands: anyone under it is gone
  blast(x, z, r) {
    for (const n of this.list) { if (n.dead || n.saved) continue; if (Math.hypot(n.x - x, n.z - z) < r) { n.dead = true; n.state = 'dead'; if (this.hooks.onDeath) this.hooks.onDeath(n, 'rock'); } }
  }
  // run from an explosion
  scare(x, z, r) { for (const n of this.list) { const d = Math.hypot(n.x - x, n.z - z); if (d < r + 25 && !n.hurt && !n.saved) { n.fleeT = 3; n.fleeDir = Math.atan2(n.x - x, n.z - z); } } }
  update(dt, ctx) {
    const { player, heatAt, surgeR, volcano, hiddenInBunker } = ctx;
    for (const n of this.list) {
      if (n.saved) { n.rig.root.visible = false; continue; }
      if (n.dead) { animateSurvivor(n.rig, dt, { mode: 'dead' }); continue; }
      n.talkT -= dt;
      let mx = 0, mz = 0, want = 0, mode = 'move';
      if (n.hurt) { mode = 'lie'; }
      else if (n.fleeT > 0) { n.fleeT -= dt; mx = Math.sin(n.fleeDir); mz = Math.cos(n.fleeDir); want = 6.0; }
      else if (n.state === 'follow') {
        const dx = player.x - n.x, dz = player.z - n.z, d = Math.hypot(dx, dz);
        const idx = ctx.followIndex(n);
        const keep = 2.6 + idx * 1.3;
        if (d > keep) { mx = dx / d; mz = dz / d; want = d > keep + 6 ? 6.0 : 2.6; }
        if (d > 90) { n.x = player.x - dx / d * 8; n.z = player.z - dz / d * 8; } // lost: catch up the cheap way
      } else {
        // potter around home
        n.wanderT -= dt;
        if (n.wanderT <= 0) { n.wanderT = 4 + Math.random() * 8; const a = Math.random() * Math.PI * 2, rr = Math.random() * 5; n.tx = n.home.x + Math.cos(a) * rr; n.tz = n.home.z + Math.sin(a) * rr; }
        const dx = n.tx - n.x, dz = n.tz - n.z, d = Math.hypot(dx, dz);
        if (d > 0.6 && n.def.pose !== 'sit') { mx = dx / d; mz = dz / d; want = 1.4; }
        else if (n.def.pose === 'sit' && d < 0.6) mode = 'sit';
        if (n.def.pose === 'sit' && d >= 0.6 && n.wanderT > 2) { mx = dx / d; mz = dz / d; want = 1.4; }
      }
      // keep clear of lava
      if (want > 0 && heatAt(n.x + mx * 4, n.z + mz * 4) > 0) { const t = mx; mx = -mz; mz = t; }
      n.speed += (want - n.speed) * Math.min(1, dt * 6);
      if (want > 0) {
        let nx = n.x + mx * n.speed * dt, nz = n.z + mz * n.speed * dt;
        const r = resolveObstacles(nx, nz, 0.45, this.world); nx = r.x; nz = r.z;
        if (heightAt(nx, nz) > SEA - 0.8) { n.x = nx; n.z = nz; }
        const ty = Math.atan2(mx, mz); let d = ty - n.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; n.yaw += d * Math.min(1, dt * 8);
      } else if (n.talkT > 0) { const ty = Math.atan2(player.x - n.x, player.z - n.z); let d = ty - n.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; n.yaw += d * Math.min(1, dt * 5); }
      n.y = heightAt(n.x, n.z);
      n.rig.root.position.set(n.x, Math.max(n.y, SEA - 0.3), n.z); n.rig.root.rotation.y = n.yaw;
      animateSurvivor(n.rig, dt, { mode, speed: want > 0 ? n.speed : 0, talk: n.talkT > 0, hurt: n.def.id === 'tomas', tilt: mode === 'move' ? groundTilt(normalAt(n.x, n.z, tmpN), n.yaw) : [0, 0] });
      // hazards
      if (heatAt(n.x, n.z) > 0.6 || (surgeR > 0 && Math.hypot(n.x - volcano.x, n.z - volcano.z) < surgeR && !(hiddenInBunker && n.state === 'follow'))) { n.dead = true; n.state = 'dead'; if (this.hooks.onDeath) this.hooks.onDeath(n); }
    }
  }
}

// push a point out of any tree trunk or boulder it overlaps
export function resolveObstacles(x, z, r, world) {
  for (const o of world.obstaclesNear(x, z)) {
    if (!o.r) continue;
    const dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz), min = o.r + r;
    if (d < min && d > 0.0001) { x = o.x + dx / d * min; z = o.z + dz / d * min; }
  }
  return { x, z };
}
