// Wally Man: on-foot movement, punching, the Blaster, cars, and his (unreliable) superpowers.
import * as THREE from 'three';
import { buildHuman, animateHuman } from './humans.js';
import { WEAPONS, WEAPON_ORDER, buildWeaponModel } from './weapons.js';

const POWER_FAILS = [
  'Up, up and... oh no.',
  'Heat vision! ...no, that\'s just steamed-up specs.',
  'X-ray vision engaged. Everyone\'s pants are... normal.',
  'Super speed! Pulled a hamstring.',
  'Ice breath! It\'s just garlic.',
];

export class Player {
  constructor(scene) {
    this.h = buildHuman({ wally: true });
    scene.add(this.h.root);
    // one model per weapon in his right hand; only the current one is shown
    this.models = {};
    for (const id of ['club', 'blaster', 'scatter', 'neep']) {
      const m = buildWeaponModel(id); m.visible = false;
      if (id === 'club') m.rotation.x = Math.PI - 0.5; else if (id !== 'neep') m.rotation.x = Math.PI / 2;
      this.h.arms[1].grip.add(m); this.models[id] = m;
    }
    this.blaster = this.models.blaster;
    this.x = 0; this.y = 0.2; this.z = 0; this.vy = 0; this.heading = 0;
    this.vx = 0; this.vz = 0;
    this.health = 100; this.armour = 0; this.money = 0;
    this.weapon = 'fists'; this.owned = { fists: true }; this.ammoOf = { blaster: 0, scatter: 0, neep: 0 };
    this.car = null; this.onGround = true; this.dead = false;
    this.fireT = 0; this.punchCool = 0; this.powerCool = 0; this.flyT = 0; this.flail = false; this.faceplantT = 0;
    this.superPunch = 0; this.flyBonus = 0; this.enterT = 0;
    this.speed = 0; this.aiming = false;
  }
  get ammo() { return this.ammoOf[this.weapon] ?? 0; }
  get hasWeapons() { return Object.keys(this.owned).length > 1; }
  giveWeapon(id, ammo = 0) {
    const fresh = !this.owned[id];
    this.owned[id] = true;
    if (id in this.ammoOf) this.ammoOf[id] += ammo;
    if (fresh || this.weapon === 'fists') this.weapon = id;
  }
  giveBlaster(ammo) { this.giveWeapon('blaster', ammo); }
  loseWeapons() { this.owned = { fists: true }; for (const k in this.ammoOf) this.ammoOf[k] = 0; this.weapon = 'fists'; }
  cycleWeapon() {
    const list = WEAPON_ORDER.filter((w) => this.owned[w]);
    this.weapon = list[(list.indexOf(this.weapon) + 1) % list.length];
  }
  place(x, z, heading = 0) { this.x = x; this.z = z; this.y = 0.3; this.vy = 0; this.heading = heading; }

  update(dt, inp, game) {
    const world = game.world;
    this.powerCool = Math.max(0, this.powerCool - dt);
    this.superPunch = Math.max(0, this.superPunch - dt);
    if (this.dead) { this.h.root.visible = true; animateHuman(this.h, dt, { mode: 'dead' }); this.h.root.rotation.x = -Math.PI / 2; this.h.root.position.set(this.x, this.y + 0.15, this.z); return; }
    this.h.root.rotation.x = 0;
    if (this.car) {
      // sit Wally in the driver's seat (right-hand drive)
      const c = this.car;
      this.x = c.x; this.z = c.z; this.y = c.y;
      this.h.root.visible = false; // hidden: roofs are opaque and he clips the steering
      animateHuman(this.h, dt, { mode: 'drive', steer: c.steer });
      return;
    }
    this.h.root.visible = true;
    // ----- carjacking: main.js drives the position, we just hold the pose -----
    if (this.jackPose) {
      animateHuman(this.h, dt, this.jackPose);
      this.h.root.position.set(this.x, this.y, this.z);
      this.h.root.rotation.set(0, this.heading, 0);
      return;
    }
    // ----- faceplant after a failed flight -----
    if (this.faceplantT > 0) {
      this.faceplantT -= dt;
      this.h.root.position.set(this.x, this.y + 0.2, this.z);
      this.h.root.rotation.set(Math.PI / 2 * 0.95, this.heading, 0, 'YXZ');
      animateHuman(this.h, dt, { mode: 'dead' });
      if (this.faceplantT <= 0) this.h.root.rotation.set(0, this.heading, 0);
      return;
    }
    const camYaw = game.cam.yaw;
    const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
    const rx = -fz, rz = fx;
    let mx = fx * inp.my + rx * inp.mx, mz = fz * inp.my + rz * inp.mx;
    const ml = Math.hypot(mx, mz);
    if (ml > 1) { mx /= ml; mz /= ml; }
    this.aiming = inp.aim && !WEAPONS[this.weapon].melee;
    // ----- flight -----
    if (this.flyT > 0) {
      this.flyT -= dt;
      const pitch = game.cam.pitch;
      if (this.flail) {
        this.vy -= 14 * dt;
        if (this.flyT <= 0 || (this.vy < 0 && this.y <= world.groundHeight(this.x, this.z, this.y) + 0.05)) { this.flyT = 0; }
      } else {
        const sp = 17;
        const tx = fx * sp * (inp.my >= 0 ? 1 : 0.3), tz = fz * sp * (inp.my >= 0 ? 1 : 0.3);
        this.vx += (tx - this.vx) * Math.min(1, dt * 2); this.vz += (tz - this.vz) * Math.min(1, dt * 2);
        const wantVy = (inp.jump ? 7 : 0) + (inp.crouch ? -8 : 0) + (pitch + 0.15) * 14; // look up to climb
        this.vy += (wantVy - this.vy) * Math.min(1, dt * 3);
        this.heading = Math.atan2(this.vx, this.vz);
        if (this.flyT <= 0) game.toast('Wally Power... wearing off...');
      }
    } else {
      // normal ground / air control
      const run = inp.sprint ? 7.2 : 4.6;
      const tvx = mx * run, tvz = mz * run;
      const k = this.onGround ? 12 : 2.5;
      this.vx += (tvx - this.vx) * Math.min(1, dt * k); this.vz += (tvz - this.vz) * Math.min(1, dt * k);
      if (this.aiming) this.heading = camYaw;
      else if (ml > 0.1) {
        const want = Math.atan2(mx, mz);
        let da = want - this.heading; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
        this.heading += da * Math.min(1, dt * 12);
      }
      if (inp.jumpPressed && this.onGround) { this.vy = 6.2; this.onGround = false; game.audio.tone(300, 0.1, 'triangle', 0.08, 200); }
      this.vy -= 18 * dt;
    }
    // integrate
    const prevVy = this.vy;
    this.x += this.vx * dt; this.z += this.vz * dt; this.y += this.vy * dt;
    const c = world.collide(this.x, this.z, 0.38, this.y);
    this.x = c.x; this.z = c.z;
    const g = world.groundHeight(this.x, this.z, this.y + 0.6);
    if (this.y <= g) {
      if (prevVy < -15 && this.flyT <= 0) game.hurtPlayer((-prevVy - 15) * 6, 'fall');
      this.y = g; this.vy = 0;
      if (!this.onGround && this.flyT > 0 && !this.flail) { this.flyT = 0; }
      this.onGround = true;
    } else if (this.y > g + 0.05) this.onGround = false;
    if (this.y < -1.2) { game.hurtPlayer(999, 'drown'); }
    if (this.flail && this.onGround && this.flyT <= 0.0001) {
      this.flail = false; this.faceplantT = 1.4; game.audio.oof(); game.hurtPlayer(5, 'faceplant', true);
    }
    this.speed = Math.hypot(this.vx, this.vz);
    // ----- weapons -----
    const W = WEAPONS[this.weapon];
    for (const id in this.models) this.models[id].visible = id === this.weapon && (id !== 'neep' || this.ammoOf.neep > 0);
    this.punchCool -= dt; this.fireT -= dt;
    if (inp.fire && this.flyT <= 0) {
      if (W.melee && this.punchCool <= 0) {
        this.punchCool = W.cool || 0.38; this.h.punchT = 0.3; this.h.punchSide = this.weapon === 'club' ? 1 : -this.h.punchSide;
        setTimeout(() => game.playerPunch(this.weapon), 120);
      } else if ((W.ranged || W.thrown) && this.fireT <= 0) {
        if (this.ammoOf[this.weapon] > 0) {
          this.fireT = W.rate; this.ammoOf[this.weapon]--;
          if (W.thrown) { this.h.punchT = 0.3; this.h.punchSide = 1; setTimeout(() => game.throwNeep(), 150); }
          else game.playerShoot(W);
        } else {
          this.fireT = 0.4; game.audio.tone(200, 0.05, 'square', 0.1);
          if (inp.firePressed) game.toast(`Out of ammo for the ${W.name}! Press Tab to switch.`);
        }
      }
    }
    // ----- Wally Power -----
    if (inp.powerPressed) this.usePower(game);

    const air = !this.onGround && this.flyT <= 0;
    animateHuman(this.h, dt, {
      speed: this.onGround ? this.speed : 0, air, mode: this.flyT > 0 ? 'fly' : 'move', flail: this.flail,
      aim: this.aiming || (WEAPONS[this.weapon].ranged && this.fireT > 0), aimPitch: -game.cam.pitch * 0.8,
      capeLift: this.flyT > 0 ? 1.25 : (air ? 0.9 : this.speed / 7),
    });
    this.h.root.position.set(this.x, this.y, this.z);
    this.h.root.rotation.set(this.flyT > 0 && !this.flail ? 1.25 : 0, this.heading, 0, 'YXZ');
  }
  usePower(game) {
    if (this.powerCool > 0) { game.toast(`Wally Power recharging... ${Math.ceil(this.powerCool)}s`); return; }
    if (this.car) { game.toast('Wally Power needs a run-up. Get out the car!'); return; }
    this.powerCool = 6;
    game.audio.power();
    const r = Math.random();
    const flyChance = 0.38 + this.flyBonus;
    if (r < flyChance) {
      this.flyT = 4.5; this.flail = false; this.vy = 9; this.onGround = false;
      game.bigText('WALLY POWER!', 'He... he\'s actually flying!', 1.6);
      game.stats.flights++;
    } else if (r < flyChance + 0.27) {
      this.flyT = 1.6; this.flail = true; this.vy = 8; this.onGround = false;
      game.toast(POWER_FAILS[0]);
    } else if (r < flyChance + 0.45) {
      this.superPunch = 6; game.bigText('WALLY STRENGTH!', 'Next punch packs a wallop', 1.4);
      if (this.weapon !== 'fists') this.weapon = 'fists';
    } else {
      game.toast(POWER_FAILS[1 + ((Math.random() * (POWER_FAILS.length - 1)) | 0)]);
    }
  }
}
