// Story missions. Each one is a small state machine driven by game.update.
import { roadC, LANE, N, blockMin, blockMax } from './city.js';
import { addLivery, TrafficAI } from './vehicles.js';

// Pamazon drop-offs: one doorstep on the north side of each of these blocks
const DROPS = [[4, 4], [3, 4], [4, 3], [4, 5], [5, 5], [6, 4], [6, 5], [3, 5], [7, 4], [5, 2]];
const PARCEL_LINES = ["Left it wi' the neighbour.", 'Chucked it over the hedge.', 'Left it in the wheelie bin. Safe!', 'Signed for it masel.', 'Posted it through the letterbox. Mostly.', 'Delivered! Slightly squashed.', "'Sorry we missed you' card left. They were in.", 'Handed to a passing dug.', 'Placed gently. From the van window.', 'Right door. Probably.'];

const node = (i, j) => [roadC(i) + LANE, roadC(j) + LANE];

export const MISSIONS = [
  {
    id: 'pamazon', title: 'Special Delivery', reward: 750,
    intro: ["MAMMY WALLY: Wallace! Superheroing doesnae pay the leccy bill.", "MAMMY WALLY: Pamazon are short a driver. Their van's parked up by the depot.", "MAMMY WALLY: Use yer GPS, get in that van and deliver ten parcels in five minutes. Go!"],
    start(g) {
      this.stage = 0; this.t = 300; this.done = 0;
      // the van waits at the kerb outside the Pamazon depot
      const vx = blockMin(5) + 20, vz = blockMin(4) - 1.6;
      this.van = g.spawnCar('van', vx, vz, -Math.PI / 2, { paint: '#f4f4f2' });
      this.van.parked = true; this.van.mission = true; this.van.name = 'Pamazon Van';
      addLivery(this.van, 'PAMAZON', 'Parcels. Fast(ish).');
      g.blip(this.van, 'target');
      g.setGps(vx, vz);
      this.sign = g.addSign('PAMAZON DEPOT', '#1b3a8a', '#ffffff', vx + 6, blockMin(4) + 0.6);
      this.driver = g.spawnPed(vx + 4, blockMin(4) + 1.4, {}); this.driver.mission = true;
      g.objective('Use yer ~y~GPS~w~ to find the ~b~Pamazon van~w~.');
      g.toast('GPS: Route set. Follow the purple line on yer radar.');
    },
    beginDeliveries(g) {
      this.stage = 1;
      g.clearBlips();
      this.drops = DROPS.map(([bx, bz], i) => {
        const x = (blockMin(bx) + blockMax(bx)) / 2 + ((i * 7) % 15) - 7, z = blockMin(bz) - 1.5;
        return g.marker(x, z, 'dest', 4.5);
      });
      g.bigText('10 PARCELS', '5 minutes. Nae pressure.', 2.2);
      if (this.driver && this.driver.state !== 'dead' && Math.hypot(this.driver.x - g.player.x, this.driver.z - g.player.z) < 30) g.say(this.driver, "Oi! That's ma van! Ma targets!");
    },
    update(dt, g) {
      const pl = g.player, van = this.van;
      if (van.dead) return 'fail';
      if (this.stage === 0) {
        if (pl.car === van) this.beginDeliveries(g);
        else return null;
      }
      this.t -= dt; g.timer(this.t);
      if (this.t <= 0) return 'fail';
      // GPS points at the nearest undelivered parcel (or back to the van)
      const px = pl.car ? pl.car.x : pl.x, pz = pl.car ? pl.car.z : pl.z;
      if (pl.car !== van) {
        g.setGps(van.x, van.z); g.blip(van, 'target', true);
        g.objective('Get back in the ~b~Pamazon van~w~!');
        return null;
      }
      g.clearBlips();
      let best = null, bd = 1e9;
      for (const m of this.drops) { if (m.done) continue; const d = Math.hypot(m.x - px, m.z - pz); if (d < bd) { bd = d; best = m; } }
      if (best) g.setGps(best.x, best.z);
      g.objective(`Deliver the parcels: ~y~${this.done} / 10~w~ delivered.`);
      for (const m of this.drops) {
        if (m.done || !g.inMarker(m, van.x, van.z)) continue;
        if (van.speed > 6) { g.objective('Slow down to drop the parcel off!'); continue; }
        m.done = true; m.obj.visible = false; g.markers = g.markers.filter((q) => q !== m);
        this.done++; g.audio.pickup(); g.player.money += 25;
        g.toast(`Parcel ${this.done}/10: ${PARCEL_LINES[this.done - 1]} (+$25 tip)`);
        if (this.done >= 10) return 'pass';
      }
      return null;
    },
    end(g) {
      g.clearMarkers(); g.clearBlips(); g.timer(null);
      if (this.sign) { this.sign.parent?.remove(this.sign); this.sign = null; }
      if (this.van) { this.van.mission = false; if (g.player.car !== this.van && !this.van.dead) g.removeCar(this.van); }
      if (this.driver) this.driver.mission = false;
    },
  },
  {
    id: 'chippy', title: 'Fish Supper Run', reward: 500,
    intro: ["MAMMY WALLY: Yer Uncle Tam's coming for his tea and there's nae fish.", "MAMMY WALLY: Get two fish suppers from the chippy and bring them to the statue in the plaza.", "MAMMY WALLY: And if they're cold, I'm telling the whole street."],
    start(g) {
      this.stage = 0; this.t = 0;
      const [x, z] = node(6, 5); this.m = g.marker(x, z, 'dest', 3.5); g.objective('Go to the ~y~chippy~w~.');
    },
    update(dt, g) {
      const pl = g.player, px = pl.car ? pl.car.x : pl.x, pz = pl.car ? pl.car.z : pl.z;
      if (this.stage === 0 && g.inMarker(this.m, px, pz)) {
        g.clearMarkers(); g.audio.pickup(); g.toast('Two fish suppers. Salt \'n\' sauce.');
        const s = g.world.specials.plaza; this.m = g.marker(s.x, s.z - 14, 'dest', 4); this.stage = 1; this.t = 75; g.timer(this.t);
      }
      if (this.stage === 1) {
        this.t -= dt; g.timer(this.t);
        g.objective('Deliver the suppers before they go cold!');
        if (this.t <= 0) return 'fail';
        if (g.inMarker(this.m, px, pz)) return 'pass';
      }
      return null;
    },
    end(g) { g.clearMarkers(); g.timer(null); },
  },
  {
    id: 'race', title: 'Checkpoint Charlie', reward: 800,
    intro: ["BIG DAVIE: Wally! Word is yer the slowest hero in Wallypool.", "BIG DAVIE: Prove me wrong. Hit every checkpoint before the clock runs out.", "BIG DAVIE: Ye'll want something with a bit more poke than yer maw's hatchback."],
    start(g) {
      this.cps = [node(2, 1), node(4, 1), node(6, 1), node(7, 3), node(7, 6), node(5, 6), node(3, 7), node(1, 6), node(1, 3), node(2, 2)];
      this.i = 0; this.t = 140; this.next(g);
    },
    next(g) { g.clearMarkers(); const [x, z] = this.cps[this.i]; this.m = g.marker(x, z, 'check', 5); if (this.cps[this.i + 1]) g.marker(...this.cps[this.i + 1], 'ghost', 5); },
    update(dt, g) {
      const pl = g.player;
      if (!pl.car) { g.objective('Get a car! The clock is ticking.'); }
      else g.objective(`Checkpoint ${this.i + 1} / ${this.cps.length}`);
      this.t -= dt; g.timer(this.t);
      if (this.t <= 0) return 'fail';
      const px = pl.car ? pl.car.x : pl.x, pz = pl.car ? pl.car.z : pl.z;
      if (g.inMarker(this.m, px, pz)) {
        this.i++; g.audio.checkpoint();
        if (this.i >= this.cps.length) return 'pass';
        this.next(g);
      }
      return null;
    },
    end(g) { g.clearMarkers(); g.timer(null); },
  },
  {
    id: 'thugs', title: 'Pest Control', reward: 1200,
    intro: ["MRS McGLASHAN: Wally son, the Red Shirt gang are down the docks again.", "MRS McGLASHAN: They nicked my bingo winnings. A real hero would sort them out.", "MRS McGLASHAN: Take this - it's yer granda's old blaster. Mind, it's loaded."],
    start(g) {
      g.player.giveBlaster(60); g.toast('Got the WALLY BLASTER. Right-click to aim, left-click to fire.');
      const cx = roadC(2) + 24, cz = roadC(7) + 62;
      this.thugs = [];
      for (let k = 0; k < 4; k++) { const p = g.spawnPed(cx + k * 5 - 7, cz + (k % 2) * 2, { thug: true, state: 'idle' }); p.mission = true; this.thugs.push(p); g.blip(p, 'enemy'); }
      g.objective('Take out the ~r~Red Shirts~w~ at the docks.');
    },
    update(dt, g) {
      const left = this.thugs.filter((p) => p.state !== 'dead' && p.health > 0).length;
      for (const p of this.thugs) if (!p.aggro && Math.hypot(p.x - g.player.x, p.z - g.player.z) < 22) p.aggro = true;
      g.objective(`Take out the ~r~Red Shirts~w~ (${left} left).`);
      return left === 0 ? 'pass' : null;
    },
    end(g) { g.clearBlips(); },
  },
  {
    id: 'panda', title: 'Hot Potato', reward: 2000,
    intro: ["BIG DAVIE: Right, hero. Ma cousin wants a polis car for his film.", "BIG DAVIE: There's one parked outside the Polis station. Nick it.", "BIG DAVIE: Get it to the crane at the docks. They'll be after ye, mind."],
    start(g) {
      const s = g.world.specials.police;
      this.car = g.spawnCar('police', s.x + 8, s.z - 4.2, -Math.PI / 2, { parked: true });
      this.car.mission = true; g.blip(this.car, 'target');
      this.stage = 0; g.objective('Steal the ~b~polis car~w~.');
    },
    update(dt, g) {
      const pl = g.player;
      if (this.car.dead) return 'fail';
      if (this.stage === 0 && pl.car === this.car) {
        this.stage = 1; g.wanted.add(9); g.clearBlips();
        this.m = g.marker(roadC(4) + 13, roadC(8) - 18, 'dest', 5);
      }
      if (this.stage === 1) {
        if (pl.car !== this.car) { g.objective('Get back in the ~b~polis car~w~.'); g.blip(this.car, 'target', true); }
        else { g.clearBlips(); g.objective('Take it to the ~y~crane at the docks~w~.'); if (g.inMarker(this.m, this.car.x, this.car.z) && this.car.speed < 4) return 'pass'; }
      }
      return null;
    },
    end(g) { g.clearMarkers(); g.clearBlips(); if (this.car) this.car.mission = false; },
  },
  {
    id: 'flap', title: 'The Big Flap', reward: 5000,
    intro: ["NARRATOR: Every hero has to fly eventually.", "WALLY MAN: Right. Q for Wally Power. How hard can it be?", "NARRATOR: Reach the roof of the tallest tower in Wallypool. Without the stairs."],
    start(g) {
      // find the tallest building
      let best = null; for (const b of g.world.buildings) if (b.roof && !b.circle && (!best || b.roof > best.roof)) best = b;
      this.b = best; this.m = g.marker((best.x0 + best.x1) / 2, (best.z0 + best.z1) / 2, 'dest', 4, best.roof);
      g.objective('Use ~y~Wally Power (Q)~w~ to fly onto the ~y~tallest tower~w~.');
      g.player.flyBonus = 0.25; // his luck is improving
    },
    update(dt, g) {
      const pl = g.player;
      if (!pl.car && g.inMarker(this.m, pl.x, pl.z) && pl.y > this.b.roof - 1) return 'pass';
      return null;
    },
    end(g) { g.clearMarkers(); g.player.flyBonus = 0; },
  },
  {
    id: 'birthday', title: "Mammy's Birthday", reward: 1500,
    intro: ["WALLY MAN: Oh naw. It's Mammy's birthday. I've got NOTHING.", "WALLY MAN: Flowers from Neep Park, a cake from the Pie Palace, a card from the corner shop.", "WALLY MAN: Four minutes before she's back from the bingo. Go go go!"],
    start(g) {
      const W = g.world, park = W.blocks.find((b) => b.kind === 'park' && b.bx > 0);
      const mid = (b) => [(b.x0 + b.x1) / 2, b.z0 + 1.4];
      const B = (bx, bz) => W.blocks[bx * N + bz];
      this.items = [
        { name: 'flowers', pos: [(park.x0 + park.x1) / 2, (park.z0 + park.z1) / 2] },
        { name: 'cake', pos: mid(B(6, 5)) },
        { name: 'card', pos: mid(B(1, 3)) },
      ];
      for (const it of this.items) it.m = g.marker(it.pos[0], it.pos[1], 'dest', 2.5);
      this.t = 240; this.got = 0; this.stage = 0;
    },
    update(dt, g) {
      const pl = g.player, px = pl.car ? pl.car.x : pl.x, pz = pl.car ? pl.car.z : pl.z;
      this.t -= dt; g.timer(this.t);
      if (this.t <= 0) return 'fail';
      if (this.stage === 0) {
        let best = null, bd = 1e9;
        for (const it of this.items) {
          if (it.done) continue;
          const d = Math.hypot(it.pos[0] - px, it.pos[1] - pz);
          if (d < bd) { bd = d; best = it; }
          if (g.inMarker(it.m, px, pz)) {
            it.done = true; this.got++; it.m.obj.visible = false; g.markers = g.markers.filter((q) => q !== it.m);
            g.audio.pickup(); g.toast({ flowers: 'Got the flowers. Slightly trampled.', cake: 'Got the cake. Only ate a wee bit.', card: 'Got a card. It says "Get Well Soon". Close enough.' }[it.name]);
          }
        }
        if (best) g.setGps(best.pos[0], best.pos[1]);
        g.objective(`Get Mammy's presents: ~y~${this.got} / 3~w~`);
        if (this.got === 3) { this.stage = 1; const h = g.world.specials.home; this.home = g.marker(h.x + 2, h.z - 1, 'dest', 3); g.setGps(h.x + 2, h.z - 1); }
      } else {
        g.objective('Get back to ~y~the flat~w~ before Mammy does!');
        if (g.inMarker(this.home, px, pz)) return 'pass';
      }
      return null;
    },
    end(g) { g.clearMarkers(); g.timer(null); },
  },
  {
    id: 'heist', title: 'The Haggis Heist', reward: 2500,
    intro: ["BIG DAVIE: The Haggis Express. Armoured van. Full of the finest offal in Scotland.", "BIG DAVIE: It's doing its rounds right now. Get it off them and bring it to the Wally Wash.", "BIG DAVIE: It's got a tracker, so the polis will be on ye. The Wally Wash'll sort that."],
    start(g) {
      const i = 6, j = 5, d = [-1, 0];
      const van = g.spawnCar('van', 0, 0, -Math.PI / 2, { paint: '#2f5d2e' });
      addLivery(van, 'HAGGIS EXPRESS', 'Finest offal since 1823', '#f2e21a');
      van.ai = new TrafficAI(van, i, j, d); van.driver = 'ai'; van.mission = true; van.name = 'Haggis Express';
      const [sx, sz] = van.ai.path[0]; van.x = sx; van.z = sz; van.heading = Math.atan2(d[0], d[1]); van.health = 2500;
      this.van = van; this.stage = 0;
      g.blip(van, 'target');
    },
    update(dt, g) {
      const pl = g.player, van = this.van;
      if (van.dead) return 'fail';
      if (this.stage === 0) {
        g.setGps(van.x, van.z);
        g.objective('Find and nick the ~b~Haggis Express~w~.');
        if (pl.car === van) {
          this.stage = 1; g.clearBlips(); g.wanted.add(6); g.bigText('TRACKER ACTIVE', 'The polis are coming!', 2);
          const s = g.world.specials.garage; this.m = g.marker(s.x, s.z - 6, 'dest', 4.5); g.setGps(s.x, s.z - 6);
        }
      } else {
        if (pl.car !== van) { g.objective('Get back in the ~b~Haggis Express~w~!'); g.blip(van, 'target', true); g.setGps(van.x, van.z); }
        else {
          g.clearBlips(); const s = g.world.specials.garage; g.setGps(s.x, s.z - 6);
          g.objective('Take the van to the ~y~Wally Wash~w~.');
          if (g.inMarker(this.m, van.x, van.z) && van.speed < 3) return 'pass';
        }
      }
      return null;
    },
    end(g) { g.clearMarkers(); g.clearBlips(); if (this.van) this.van.mission = false; },
  },
  {
    id: 'square', title: 'Battle of Hero Square', reward: 5000,
    intro: ["MRS McGLASHAN: Wally! The Red Shirts are takin' over Hero Square!", "MRS McGLASHAN: They're spray-paintin' moustaches on yer statue. Yer OWN statue!", "MRS McGLASHAN: Here's a Scatter Blaster and some armour. Hold the square, son."],
    start(g) {
      g.player.giveWeapon('scatter', 40); g.player.armour = 100;
      this.wave = 0; this.thugs = []; this.gap = 3;
      const s = g.world.specials.plaza; this.cx = s.x; this.cz = s.z;
      g.setGps(s.x, s.z - 12);
      g.objective('Get to ~y~Hero Square~w~.');
    },
    spawnWave(g) {
      this.wave++;
      const n = 2 + this.wave * 2;
      g.bigText(`WAVE ${this.wave} / 3`, `${n} Red Shirts incoming`, 2);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + Math.random() * 0.4, r = 24;
        const p = g.spawnPed(this.cx + Math.cos(a) * r, this.cz + Math.sin(a) * r, { thug: true });
        p.mission = true; p.aggro = true; p.health = 110 + this.wave * 20; this.thugs.push(p); g.blip(p, 'enemy');
      }
    },
    update(dt, g) {
      const pl = g.player, px = pl.car ? pl.car.x : pl.x, pz = pl.car ? pl.car.z : pl.z;
      if (this.wave === 0) {
        if (Math.hypot(px - this.cx, pz - this.cz) < 30) { g.setGps(null); this.spawnWave(g); }
        return null;
      }
      const left = this.thugs.filter((p) => p.state !== 'dead' && p.health > 0).length;
      g.objective(`Hold Hero Square! Wave ${this.wave}/3: ~r~${left} Red Shirts~w~ left.`);
      if (left === 0) {
        if (this.wave >= 3) return 'pass';
        this.gap -= dt;
        if (this.gap <= 0) { this.gap = 3; g.clearBlips(); this.thugs = []; this.spawnWave(g); }
      }
      return null;
    },
    end(g) { g.clearBlips(); g.setGps(null); for (const p of this.thugs || []) p.mission = false; },
  },
  {
    id: 'granda', title: "Granda's Appointment", reward: 1500,
    intro: ["GRANDA: Wallace! Ma hip appointment's at the Infirmary and the bus is aff.", "GRANDA: Get a motor and come round the flat. And drive gentle, son.", "GRANDA: If ye bump me, ma teeth come oot. And they're no' cheap."],
    start(g) {
      const h = g.world.specials.home; this.stage = 0; this.teeth = 100;
      this.m = g.marker(h.x + 2, h.z - 4, 'dest', 4);
      this.granda = g.spawnPed(h.x + 1, h.z - 0.5, { state: 'idle' }); this.granda.mission = true;
    },
    update(dt, g) {
      const pl = g.player, c = pl.car;
      if (this.stage === 0) {
        if (this.granda.state === 'dead' || this.granda.health <= 0) return 'fail';
        g.objective(c ? 'Pick up ~y~Granda~w~ outside the flat.' : 'Get a ~b~motor~w~ and pick up ~y~Granda~w~ at the flat.');
        if (c && g.inMarker(this.m, c.x, c.z) && c.speed < 3) {
          this.car = c; this.hp = c.health; this.stage = 1;
          this.granda.mission = false; this.granda.x = 1e5; this.granda.z = 1e5; this.granda.h.root.visible = false;
          g.clearMarkers(); g.audio.door(); g.sayCar(c, "GRANDA: Mind ma hip. Mind ma HIP!");
          const s = g.world.specials.hospital; this.m = g.marker(s.x, s.z - 5, 'dest', 4.5); g.setGps(s.x, s.z - 5);
          g.toast('Granda is in. Every bump knocks his teeth loose!');
        }
        return null;
      }
      const car = this.car;
      if (car.dead) return 'fail';
      if (pl.car !== car) { g.objective("Get back in the motor! Granda's on his own in there!"); g.setGps(car.x, car.z); return null; }
      const s = g.world.specials.hospital; g.setGps(s.x, s.z - 5);
      if (car.health < this.hp) { this.teeth -= (this.hp - car.health) * 0.12; this.hp = car.health; g.sayCar(car, ['GRANDA: MA TEETH!', 'GRANDA: Ya hooligan!', 'GRANDA: I fought in the war for this?', "GRANDA: Ah've swallied a molar!"][(Math.random() * 4) | 0]); g.audio.oof && g.audio.oof(); }
      if (car.air) this.teeth -= dt * 20;
      if (this.teeth <= 0) { g.toast("Granda's teeth are somewhere on the dual carriageway."); return 'fail'; }
      g.objective(`Drive Granda to the ~y~Infirmary~w~. Teeth: ~y~${Math.ceil(this.teeth)}%~w~`);
      if (g.inMarker(this.m, car.x, car.z) && car.speed < 3) { const p = g.spawnPed(car.x + 2, car.z + 2, {}); g.say(p, 'GRANDA: Cheers, son. Same time next week.'); return 'pass'; }
      return null;
    },
    end(g) { g.clearMarkers(); g.setGps(null); if (this.granda) this.granda.mission = false; },
  },
  {
    id: 'icewars', title: 'Ice Cream Wars', reward: 2500,
    intro: ["MR FUDGE: Wally, there's three dodgy vans sellin' watery slush on MA patch.", "MR FUDGE: Frosty Fergus and his boys. Their ninety-nines havenae even got a flake.", "MR FUDGE: Wreck all three vans. Do it for the flakes, Wally."],
    start(g) {
      this.vans = [];
      const spots = [[2, 2, [1, 0]], [6, 6, [-1, 0]], [2, 6, [0, -1]]];
      const paints = ['#8fd3ff', '#b6f2a2', '#ffd1e0'];
      spots.forEach(([i, j, d], k) => {
        const van = g.spawnCar('icecream', 0, 0, 0, { paint: paints[k] });
        van.ai = new TrafficAI(van, i, j, d); van.driver = 'ai'; van.mission = true; van.name = 'Frosty Fergus';
        const [sx, sz] = van.ai.path[0]; van.x = sx; van.z = sz; van.heading = Math.atan2(d[0], d[1]); van.health = 700;
        this.vans.push(van); g.blip(van, 'enemy');
      });
    },
    update(dt, g) {
      const left = this.vans.filter((v) => !v.dead && v.health > 0).length;
      g.objective(`Wreck Frosty Fergus's ~r~ice cream vans~w~: ${3 - left} / 3 done.`);
      return left === 0 ? 'pass' : null;
    },
    end(g) { g.clearBlips(); for (const v of this.vans || []) v.mission = false; },
  },
  {
    id: 'bigair', title: 'Big Air', reward: 2000,
    intro: ["BIG DAVIE: Ma wee nephew's filmin' a stunt video. He needs a daftie.", "BIG DAVIE: Hit three of the yellow ramps in three minutes. Get some air!", "BIG DAVIE: Insurance? Naw. Why would ye need that?"],
    start(g) { this.t = 180; this.jumps = 0; this.wasAir = false; },
    update(dt, g) {
      const pl = g.player, c = pl.car;
      this.t -= dt; g.timer(this.t);
      if (this.t <= 0) return 'fail';
      if (c && c.air && !this.wasAir) { this.jumps++; g.bigText(`JUMP ${this.jumps} / 3`, 'Pure magic!', 1.5); g.audio.checkpoint(); }
      this.wasAir = !!(c && c.air);
      if (this.jumps >= 3 && !(c && c.air)) return 'pass';
      // GPS to the run-up of the nearest ramp
      const px = c ? c.x : pl.x, pz = c ? c.z : pl.z;
      let best = null, bd = 1e9;
      for (const r of g.ramps || []) { const ax = r.x - r.dx * 18, az = r.z - r.dz * 18, d = Math.hypot(ax - px, az - pz); if (d < bd) { bd = d; best = [ax, az]; } }
      if (best) g.setGps(best[0], best[1]);
      g.objective(c ? `Hit the ~y~stunt ramps~w~ (orange on the radar): ~y~${this.jumps} / 3~w~` : 'Get a fast ~b~motor~w~, then hit the ~y~stunt ramps~w~.');
      return null;
    },
    end(g) { g.timer(null); g.setGps(null); },
  },
  {
    id: 'bingo', title: 'Bingo Bus', reward: 1800,
    intro: ["MRS McGLASHAN: Wally! The bingo bus has broke doon and it's the big jackpot the night!", "MRS McGLASHAN: Pick up me, Senga and Isa and get us to the bingo hall in the square.", "MRS McGLASHAN: Eyes down at eight o'clock sharp. Don't you dare make us late."],
    start(g) {
      this.t = 240; this.got = 0; this.stage = 0;
      const B = (bx, bz) => g.world.blocks[bx * N + bz];
      this.stops = [['Mrs McGlashan', B(2, 3)], ['Senga', B(5, 3)], ['Isa', B(3, 6)]].map(([name, b]) => {
        const x = (b.x0 + b.x1) / 2, z = b.z0 - 3.5;
        const p = g.spawnPed(x, b.z0 + 1.2, { state: 'idle' }); p.mission = true;
        return { name, x, z, p, m: g.marker(x, z, 'dest', 4) };
      });
    },
    update(dt, g) {
      const pl = g.player, c = pl.car;
      this.t -= dt; g.timer(this.t);
      if (this.t <= 0) { g.toast('"Eyes down" has been and gone. The grannies will never forgive ye.'); return 'fail'; }
      if (!c) { g.objective('Get a ~b~motor~w~ for the grannies!'); return null; }
      if (this.stage === 0) {
        for (const s of this.stops) {
          if (s.done || !g.inMarker(s.m, c.x, c.z) || c.speed > 3) continue;
          s.done = true; this.got++; g.removeMarker(s.m); g.audio.door();
          s.p.mission = false; s.p.x = 1e5; s.p.z = 1e5; s.p.h.root.visible = false;
          g.sayCar(c, `${s.name.toUpperCase()}: ${['Mind ma perm!', "Is there nae heatin' in this?", "Ooh, a superhero! Ye're awfy wee."][this.got - 1]}`);
        }
        g.objective(`Pick up the grannies: ~y~${this.got} / 3~w~`);
        if (this.got === 3) { const s = g.world.specials.plaza; this.stage = 1; this.hall = g.marker(s.x, s.z - 16, 'dest', 5); }
      } else {
        g.objective('Get the grannies to the ~y~bingo~w~ in Hero Square!');
        if (g.inMarker(this.hall, c.x, c.z) && c.speed < 3) {
          for (let k = 0; k < 3; k++) { const p = g.spawnPed(c.x + 2 + k, c.z + 2, {}); if (k === 0) g.say(p, "MRS McGLASHAN: Two fat ladies, eighty-eight! Cheers, son!"); }
          return 'pass';
        }
      }
      return null;
    },
    end(g) { g.clearMarkers(); g.timer(null); for (const s of this.stops || []) s.p.mission = false; },
  },
  {
    id: 'getaway', title: 'The Great Neep Robbery', reward: 4000,
    intro: ["BIG DAVIE: Right, Wally. The Neep Market's got a lorry-load of prize turnips.", "BIG DAVIE: Get over there, grab the Golden Neep, then lose the polis. They'll be swarming.", "BIG DAVIE: Tip: the Wally Wash sprays yer motor and the polis forget all about ye."],
    start(g) {
      const B = g.world.blocks[5 * N + 6]; this.x = (B.x0 + B.x1) / 2; this.z = B.z0 - 3;
      this.m = g.marker(this.x, this.z, 'dest', 3.5); this.stage = 0;
    },
    update(dt, g) {
      const pl = g.player, px = pl.car ? pl.car.x : pl.x, pz = pl.car ? pl.car.z : pl.z;
      if (this.stage === 0) {
        g.objective('Go to the ~y~Neep Market~w~ and grab the Golden Neep.');
        if (g.inMarker(this.m, px, pz)) {
          g.clearMarkers(); this.stage = 1; g.audio.pickup(); g.wanted.add(10);
          g.bigText('GOT THE GOLDEN NEEP', 'Now lose the polis!', 2.4);
          if (g.player.giveWeapon) g.player.giveWeapon('neep', 10);
        }
        return null;
      }
      const s = g.world.specials.garage; g.setGps(s.x, s.z - 6);
      g.objective(`Lose the ~b~polis~w~! (Hint: the ~y~Wally Wash~w~ is on yer GPS.)`);
      return g.wanted.level === 0 ? 'pass' : null;
    },
    end(g) { g.clearMarkers(); g.setGps(null); },
  },
];

export function missionStartPoint(world) {
  const h = world.specials.home; return [h.x, h.z - 0.5];
}
