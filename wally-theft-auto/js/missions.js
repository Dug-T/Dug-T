// Story missions. Each one is a small state machine driven by game.update.
import { roadC, LANE, N } from './city.js';

const node = (i, j) => [roadC(i) + LANE, roadC(j) + LANE];

export const MISSIONS = [
  {
    id: 'motor', title: 'Cape Expectations', reward: 250,
    intro: ["MAMMY WALLY: Wallace! You've been in that onesie for three days.", "MAMMY WALLY: If yer gonnae be a superhero, at least get a motor.", "MAMMY WALLY: Pinch... I mean BORROW one, and take it to the Wally Wash."],
    start(g) { this.stage = 0; g.objective('Get in a car.'); },
    update(dt, g) {
      const pl = g.player;
      if (this.stage === 0 && pl.car) { this.stage = 1; const s = g.world.specials.garage; this.m = g.marker(s.x, s.z - 6, 'dest', 4); g.objective('Drive the car to the ~y~Wally Wash~w~.'); }
      if (this.stage === 1) {
        if (!pl.car) { g.objective('Get back in a car.'); }
        else if (this.m && g.inMarker(this.m, pl.car.x, pl.car.z)) { if (pl.car.speed < 3) return 'pass'; g.objective('Slow down and stop in the bay.'); }
        else g.objective('Drive the car to the ~y~Wally Wash~w~.');
      }
      return null;
    },
    end(g) { g.clearMarkers(); },
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
];

export function missionStartPoint(world) {
  const h = world.specials.home; return [h.x, h.z - 0.5];
}
