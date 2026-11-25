// Pedestrians and foot cops
import * as THREE from 'three';
import { buildHuman, animateHuman, randomPedLook, buildBlaster } from './humans.js';
import { N, P, HALF, ROAD, KERB, blockMin, blockMax } from './city.js';

const LINES = {
  idle: ["Haw, Wally! Nice cape!", "Is that a onesie?", "Get a real job, pal!", "Wally! Sign ma chip butty!", "Mind the cape, son.", "Whit's the 'W' for? Wee?", "Ma maw says you're a menace.", "Can ye even fly?", "Nae chance yer a superhero.", "Lovely day for it!", "Is that a cape or a tablecloth?", "Wally! Ma cat's up a tree again!", "Yer specs are steamed up, pal.", "Didnae know the circus was in town.", "Ma granny could fly better than you.", "Here, are you that Wally fella aff the telly?", "Gie's a twirl, Wally!", "It's pure Baltic, how are ye no' frozen in that?", "I've seen better costumes at a hen do.", "Moan the hero!"],
  hit: ["Ya numpty!", "Oi! Watch it!", "Ma heid!", "Awa' an bile yer heid!", "Polis! POLIS!", "That's no very heroic!", "Ya big walloper!", "Ma good jaicket!", "I'm tellin' yer maw!", "Ah'll set ma granny on ye!"],
  flee: ["Aaargh!", "Run!", "He's lost the plot!", "Somebody phone the polis!", "Help ma boab!", "Run for the hills!", "Every man for himself!", "He's went radge!"],
  argue: ["Oi! You! Aye, YOU in the cape!", "Look whit ye did tae ma motor!", "I want yer insurance details!", "Who d'ye think ye are, Superman?", "Ma maw's gonnae hear aboot this!", "Ye want a square go, pal?", "That's a brand new bumper!"],
  cop: ["Stop right there, cape boy!", "You're nicked!", "Haud it right there!", "Drop the gadget, Wally!", "We know where yer maw lives!", "Is that a cape? That's a fire hazard, son.", "Come quietly or come noisily, I'm no' fussy."],
};
export const pick = (a) => a[(Math.random() * a.length) | 0];

export class Ped {
  constructor(scene, x, z, opts = {}) {
    this.cop = !!opts.cop; this.thug = !!opts.thug;
    const look = randomPedLook(Math.random);
    if (this.thug) { look.shirt = '#9b111e'; look.pants = '#111'; look.hair = '#111'; }
    this.h = buildHuman({ ...look, cop: this.cop });
    this.female = !!look.female; this.vpitch = (look.female ? 1.15 : 0.8) + Math.random() * 0.35;
    if (this.cop || this.thug) { this.gun = buildBlaster(); this.h.arms[1].grip.add(this.gun); this.gun.rotation.x = Math.PI / 2; this.gun.visible = this.thug || false; }
    this.scene = scene; scene.add(this.h.root);
    this.x = x; this.z = z; this.y = KERB; this.heading = Math.random() * 6.28;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.state = opts.state || 'walk';
    this.health = this.cop ? 120 : (this.thug ? 140 : 60);
    this.speed = 0; this.loop = null; this.corner = 0; this.dir = Math.random() < 0.5 ? 1 : -1;
    this.t = 0; this.deadT = 0; this.downT = 0; this.fleeT = 0; this.fireT = 1 + Math.random(); this.bustT = 0;
    this.sayCool = 3 + Math.random() * 10; this.walkSpeed = 1.2 + Math.random() * 0.5;
  }
  remove() { this.scene.remove(this.h.root); }
  setLoop(world) {
    const bx = Math.max(0, Math.min(N - 1, Math.floor((this.x + HALF - ROAD / 2) / P)));
    const bz = Math.max(0, Math.min(N - 1, Math.floor((this.z + HALF - ROAD / 2) / P)));
    const b = world.blocks[bx * N + bz];
    this.loop = world.paveLoop(b);
    const L = this.loop;
    // project onto the rectangle
    const cs = [[L.x0, L.z0], [L.x1, L.z0], [L.x1, L.z1], [L.x0, L.z1]];
    let best = 0, bd = 1e9;
    cs.forEach((c, i) => { const d = Math.hypot(c[0] - this.x, c[1] - this.z); if (d < bd) { bd = d; best = i; } });
    this.corner = best;
  }
  hurt(amount, game, fromX, fromZ, kind) {
    if (this.state === 'dead') return false;
    this.health -= amount;
    const dx = this.x - fromX, dz = this.z - fromZ, d = Math.hypot(dx, dz) || 1;
    if (this.health <= 0) {
      this.state = kind === 'car' ? 'tumble' : 'dead';
      if (kind !== 'car') { this.vx = dx / d * 3; this.vz = dz / d * 3; this.vy = 2; this.state = 'tumble'; }
      game.onPedKilled(this, kind);
      return true;
    }
    if (kind === 'punch') { this.vx = dx / d * 4; this.vz = dz / d * 4; this.vy = 3; this.state = 'tumble'; this.knock = true; }
    if (!this.cop && !this.thug) { this.fleeFrom = [fromX, fromZ]; this.fleeT = 8; if (Math.random() < 0.6) game.say(this, pick(LINES.hit)); }
    if (this.cop || this.thug) this.aggro = true;
    return false;
  }
  update(dt, game) {
    const world = game.world, pl = game.player;
    this.t += dt;
    const h = this.h;
    let anim = { speed: 0 };
    if (this.state === 'dead') {
      this.deadT += dt;
      anim.mode = 'dead';
      h.root.rotation.x = -Math.PI / 2; h.root.position.set(this.x, this.y + 0.15, this.z);
      animateHuman(h, dt, anim);
      return;
    }
    if (this.state === 'cuffing') {
      // standing behind Wally, snapping the cuffs on
      h.root.position.set(this.x, this.y, this.z); h.root.rotation.set(0, this.heading, 0);
      animateHuman(h, dt, { speed: 0, reach: 0.8 });
      return;
    }
    if (this.state === 'held') {
      // being dragged out of a car: position is set by the carjack, we just flail
      h.root.position.set(this.x, this.y, this.z);
      h.root.rotation.set(this.tilt || 0, this.heading, 0, 'YXZ');
      animateHuman(h, dt, { mode: this.sit ? 'drive' : 'tumble' });
      return;
    }
    if (this.state === 'tumble') {
      this.vy -= 18 * dt;
      this.x += this.vx * dt; this.z += this.vz * dt; this.y += this.vy * dt;
      const c = world.collide(this.x, this.z, 0.3, this.y); if (c.hit) { this.vx *= -0.4; this.vz *= -0.4; } this.x = c.x; this.z = c.z;
      const g = world.groundHeight(this.x, this.z, this.y + 0.5);
      h.root.rotation.x -= dt * 9 * Math.min(1, Math.hypot(this.vx, this.vz) / 6 + 0.3);
      if (this.y <= g && this.vy < 0) {
        this.y = g;
        if (Math.hypot(this.vx, this.vz) > 4) { this.vy = 2.5; this.vx *= 0.5; this.vz *= 0.5; }
        else if (this.health <= 0) { this.state = 'dead'; this.deadT = 0; }
        else { this.state = 'down'; this.downT = 1.6; }
      }
      anim.mode = 'tumble';
      h.root.position.set(this.x, this.y + 0.5, this.z);
      h.root.rotation.y = this.heading;
      animateHuman(h, dt, anim);
      return;
    }
    if (this.state === 'down') {
      this.downT -= dt; anim.mode = 'dead';
      h.root.rotation.x = -Math.PI / 2; h.root.position.set(this.x, this.y + 0.15, this.z);
      if (this.downT <= 0) { this.state = this.cop || this.thug ? 'chase' : 'flee'; h.root.rotation.x = 0; this.fleeT = 8; this.fleeFrom = [pl.x, pl.z]; }
      animateHuman(h, dt, anim); return;
    }
    h.root.rotation.x = 0;
    let tx = this.x, tz = this.z, spd = 0;
    const pdist = Math.hypot(pl.x - this.x, pl.z - this.z);
    if ((this.cop || this.thug) && (this.aggro || (this.cop && game.wanted.level > 0))) this.state = 'chase';
    else if (this.cop && this.state === 'chase' && game.wanted.level === 0) this.state = 'walk';
    if (this.state === 'chase') {
      const px = pl.car ? pl.car.x : pl.x, pz = pl.car ? pl.car.z : pl.z;
      const shooter = this.thug || game.wanted.level >= 3;
      if (this.gun) this.gun.visible = shooter;
      const d = Math.hypot(px - this.x, pz - this.z);
      tx = px; tz = pz; spd = d > (shooter ? 9 : 1.1) ? 5.2 : 0;
      this.heading = Math.atan2(px - this.x, pz - this.z);
      if (shooter && d < 30 && !pl.dead) {
        this.fireT -= dt;
        if (this.fireT <= 0 && !world.blocked(this.x, this.z, px, pz, 1.3)) {
          this.fireT = 0.9 + Math.random() * 0.6;
          game.npcShoot(this, px, pz);
        }
      }
      // close enough to grab him: start the arrest (or drag him out of a stopped car first)
      if (!pl.dead && game.arrestTick) {
        if (!pl.car && d < 1.8) { spd = 0; game.arrestTick(this, dt); }
        else if (pl.car && pl.car.speed < 1.5 && d < 3.6) { spd = 0; game.pullOutTick(this, dt); }
      }
      if (Math.random() < dt * 0.15 && d < 20) game.say(this, pick(LINES.cop));
      anim.aim = shooter && d < 30;
    } else if (this.state === 'argue') {
      // storm up to Wally, wave your arms and shout
      this.argueT -= dt;
      const px = pl.car ? pl.car.x : pl.x, pz = pl.car ? pl.car.z : pl.z, d = Math.hypot(px - this.x, pz - this.z);
      tx = px; tz = pz; spd = d > 2 ? 4.2 : 0;
      if (d <= 2) this.heading = Math.atan2(px - this.x, pz - this.z);
      this.shoutT = (this.shoutT || 0) - dt;
      if (this.shoutT <= 0 && d < 25) { this.shoutT = 2.4 + Math.random() * 1.5; game.say(this, pick(LINES.argue)); this.h.punchT = 0.3; this.h.punchSide = Math.random() < 0.5 ? 1 : -1; }
      if (this.argueT <= 0 || d > 40) { this.state = 'walk'; this.setLoop(world); }
    } else if (this.state === 'icecream') {
      // queue up at the ice cream van's hatch
      const [ix, iz] = this.iceAt || [this.x, this.z];
      tx = ix; tz = iz; spd = 1.9;
      if (Math.hypot(ix - this.x, iz - this.z) < 1.3) { if (game.onIceCream) game.onIceCream(this); this.state = 'walk'; this.setLoop(world); }
      this.iceT = (this.iceT || 15) - dt; if (this.iceT <= 0) { this.state = 'walk'; this.setLoop(world); }
    } else if (this.state === 'flee') {
      this.fleeT -= dt;
      const [fx, fz] = this.fleeFrom || [pl.x, pl.z];
      const dx = this.x - fx, dz = this.z - fz, d = Math.hypot(dx, dz) || 1;
      tx = this.x + dx / d * 5; tz = this.z + dz / d * 5; spd = 5;
      if (this.fleeT <= 0) { this.state = 'walk'; this.setLoop(world); }
    } else {
      if (!this.loop) this.setLoop(world);
      const L = this.loop;
      const cs = [[L.x0, L.z0], [L.x1, L.z0], [L.x1, L.z1], [L.x0, L.z1]];
      const c = cs[this.corner];
      if (Math.hypot(c[0] - this.x, c[1] - this.z) < 0.8) this.corner = (this.corner + this.dir + 4) % 4;
      tx = cs[this.corner][0]; tz = cs[this.corner][1]; spd = this.walkSpeed;
      // gawk at Wally when he's close
      if (pdist < 6 && !pl.car) {
        this.sayCool -= dt;
        if (this.sayCool <= 0) { this.sayCool = 12 + Math.random() * 20; if (Math.random() < 0.5) game.say(this, pick(LINES.idle)); }
      }
      // panic if a car is bombing at us or guns are out
      if (game.alarm && Math.hypot(game.alarm[0] - this.x, game.alarm[1] - this.z) < 25) { this.state = 'flee'; this.fleeFrom = game.alarm; this.fleeT = 7; if (Math.random() < 0.15) game.say(this, pick(LINES.flee)); }
    }
    const dx = tx - this.x, dz = tz - this.z, d = Math.hypot(dx, dz);
    if (d > 0.05 && spd > 0) {
      const want = Math.atan2(dx, dz);
      let da = want - this.heading; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      this.heading += da * Math.min(1, dt * 8);
      this.x += Math.sin(this.heading) * spd * dt; this.z += Math.cos(this.heading) * spd * dt;
    }
    const c = world.collide(this.x, this.z, 0.3, this.y); this.x = c.x; this.z = c.z;
    if (game.carCollide) { const cc = game.carCollide(this.x, this.z, 0.3, this.y); this.x = cc.x; this.z = cc.z; }
    const g = world.groundHeight(this.x, this.z, this.y + 0.4);
    this.y += (g - this.y) * Math.min(1, dt * 15);
    this.speed = spd;
    anim.speed = spd;
    h.root.position.set(this.x, this.y, this.z);
    h.root.rotation.y = this.heading;
    animateHuman(h, dt, anim);
  }
}

export class PedManager {
  constructor(scene, world) { this.scene = scene; this.world = world; this.list = []; this.max = 26; this.timer = 0; }
  spawnNear(px, pz, opts = {}) {
    // random pavement point 25-80m away
    for (let tries = 0; tries < 12; tries++) {
      const a = Math.random() * Math.PI * 2, dd = (opts.min || 28) + Math.random() * ((opts.max || 80) - (opts.min || 28));
      const x = px + Math.cos(a) * dd, z = pz + Math.sin(a) * dd;
      if (Math.abs(x) > HALF - 2 || Math.abs(z) > HALF - 2) continue;
      const bx = Math.floor((x + HALF - ROAD / 2) / P), bz = Math.floor((z + HALF - ROAD / 2) / P);
      if (bx < 0 || bz < 0 || bx >= N || bz >= N) continue;
      const b = this.world.blocks[bx * N + bz];
      const L = this.world.paveLoop(b);
      // snap to the nearest edge of the loop
      const opts2 = [[x, L.z0], [x, L.z1], [L.x0, z], [L.x1, z]].map(([qx, qz]) => [Math.max(L.x0, Math.min(L.x1, qx)), Math.max(L.z0, Math.min(L.z1, qz))]);
      opts2.sort((u, v) => Math.hypot(u[0] - x, u[1] - z) - Math.hypot(v[0] - x, v[1] - z));
      const [sx, sz] = opts2[0];
      const p = new Ped(this.scene, sx, sz, opts);
      p.loop = L; p.corner = (Math.random() * 4) | 0;
      this.list.push(p);
      return p;
    }
    return null;
  }
  update(dt, game) {
    const pl = game.player;
    this.timer -= dt;
    const civ = this.list.filter((p) => !p.cop && !p.mission).length;
    if (this.timer <= 0 && civ < this.max) { this.timer = 0.25; this.spawnNear(pl.x, pl.z); }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      const d = Math.hypot(p.x - pl.x, p.z - pl.z);
      if ((d > 120 && !p.mission) || (p.state === 'dead' && p.deadT > 25) || (p.cop && game.wanted.level === 0 && d > 50)) { p.remove(); this.list.splice(i, 1); continue; }
      if (d < 150) p.update(dt, game);
      p.h.root.visible = d < 150;
    }
  }
}
