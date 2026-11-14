'use strict';
// =====================================================================
// Update 2.2 (part 1): new modes
//  - EMOTES: stand still and hold B, then press UP to wave, LEFT/RIGHT
//    to dance or DOWN to sit
//  - RANDOMIZER (Challenges): 8 real levels in a shuffled order with
//    shuffled enemies and blocks, from a seed code you can share
//  - EXPLORE CASTLE (Challenges): one big castle; each relic you find
//    (Feather, Bounce Boots, Dash Gem, Iron Fist) opens up new areas,
//    with hidden castle gems to come back for, and a Golem in the throne
//  - PRACTICE (Challenges): any level you have beaten, from any point,
//    at 100%, 75% or 50% speed, with no lives lost
//  - BOUNTY BOARD (Wally Town): three hunts at a time that refresh as
//    you claim them
// Levels 135 (randomizer), 136 (explore castle).
// =====================================================================
const U22 = (() => {
  const PP = Play.prototype;
  const isPlay = () => typeof Play !== 'undefined' && scene instanceof Play;
  const R = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  // ---------------- emotes ----------------
  Object.assign(Wally.POSES, {
    wave0: { bob: 0, lean: 0, front: [0.3, 0.1], back: [-0.3, 0.1], armF: [2.7, 3.5], armB: [-0.3, 0.2], cape: [0.6, 1.0, 10] },
    wave1: { bob: 0, lean: 0, front: [0.3, 0.1], back: [-0.3, 0.1], armF: [2.7, 2.6], armB: [-0.3, 0.2], cape: [0.7, 1.0, 10] },
    sit: { bob: 7, lean: 0, front: [1.45, 1.45], back: [1.25, 1.3], armF: [0.5, 1.0], armB: [-0.2, 0.2], cape: [0.4, 0.5, 8] },
    dance0: { bob: 1, lean: 1, front: [0.5, 0.2], back: [-0.25, 0.5], armF: [2.8, 3.3], armB: [-2.6, -3.1], cape: [1.0, 1.3, 10] },
    dance1: { bob: 0, lean: -1, front: [-0.3, 0.6], back: [0.6, 0.2], armF: [0.4, 1.7], armB: [-0.4, -1.7], cape: [0.4, 1.3, 10] },
  });
  { const _pp = PP.playerPose;
    PP.playerPose = function () {
      const p = this.p;
      if (p.emote) { const f = (frame >> 3); return p.emote === 'wave' ? (f & 1 ? 'wave0' : 'wave1') : p.emote === 'sit' ? 'sit' : ['dance0', 'win0', 'dance1', 'win1'][f & 3]; }
      return _pp.call(this);
    };
  }

  // ---------------- per-level rules (emotes, explore, practice, bounty) ----------------
  const EX = { ab: new Set(), gems: new Set(), broken: new Set(), seen: new Set() };
  { const _up = PP.updatePlayer;
    PP.updatePlayer = function () {
      const p = this.p, D = Input.down, Pr = Input.pressed;
      if (this.state === 'play') { // emotes
        const still = p.onGround && Math.abs(p.vx) < 0.15 && !p.riding;
        p.emoteHold = still && D('run') ? (p.emoteHold || 0) + 1 : 0;
        if (p.emoteHold > 24) { p.emoteMenu = true; }
        if (p.emoteMenu) {
          const pick = Pr('up') ? 'wave' : Pr('left') || Pr('right') ? 'dance' : Pr('down') ? 'sit' : null;
          if (pick) { p.emote = pick; p.emoteT = 180; p.emoteMenu = false; p.emoteHold = -999; Audio8.sfx('select'); if (typeof Ach !== 'undefined') try { Ach.unlock('emote'); } catch (e) { /* ignore */ } }
          if (!D('run')) p.emoteMenu = false;
          Input.down = (k) => (k === 'left' || k === 'right' || k === 'down' || k === 'up' || k === 'jump' ? false : D(k)); Input.pressed = (k) => (k === 'left' || k === 'right' || k === 'down' || k === 'up' || k === 'jump' ? false : Pr(k));
        }
        if (p.emote) { if (--p.emoteT <= 0 || D('left') || D('right') || Pr('jump')) p.emote = null; }
      }
      const real = game && game.upgrades; if (this.def.explore && game) game.upgrades = {}; // explore mode: only the relics count
      const vy0 = p.vy, g0 = p.onGround;
      try { _up.apply(this, arguments); } finally { Input.down = D; Input.pressed = Pr; if (this.def.explore && game) game.upgrades = real; }
      if (this.state !== 'play' || !this.def.explore) return;
      // relic powers
      if (p.onGround) p.dj = false;
      if (EX.ab.has('boots') && Pr('jump') && !g0 && !p.onGround && !p.dj && p.vy > -3) { p.dj = true; p.vy = -5.2; Audio8.sfx('jump'); for (let k = 0; k < 4; k++) this.parts.push({ k: 'dust', x: p.x + p.w / 2 + (k - 1.5) * 3, y: p.y + p.h, vx: (k - 1.5) * 0.4, vy: 0.4, life: 12 }); }
      if (EX.ab.has('feather') && !p.onGround && D('jump') && p.vy > 0.9) { p.vy = 0.9; if (frame % 6 === 0) this.parts.push({ k: 'spark', x: p.x + p.w / 2, y: p.y - 2, life: 8 }); }
      if (EX.ab.has('gem') && Pr('special') && !(p.exCool > 0)) { p.exDash = 12; p.exCool = 40; Audio8.sfx('swoop'); }
      if (p.exCool > 0) p.exCool--;
      if (p.exDash > 0) { p.exDash--; p.vx = p.face * 5; p.vy = Math.min(p.vy, 0.2); this.parts.push({ k: 'dust', x: p.x + p.w / 2 - p.face * 6, y: p.y + 10, vx: 0, vy: 0, life: 8 });
        const tx = Math.floor((p.x + p.w / 2 + p.face * 10) / TS); for (let ty = Math.floor(p.y / TS); ty <= Math.floor((p.y + p.h - 1) / TS); ty++) if (this.isCrystal(tx, ty)) this.breakAt(tx, ty, '#a0e8ff'); }
      if (EX.ab.has('fist') && p.onGround && vy0 > 5) { const tx = Math.floor((p.x + p.w / 2) / TS); for (const dx of [-1, 0, 1]) for (let ty = Math.floor((p.y + p.h + 2) / TS); ty < 13 && this.isCrack(tx + dx, ty); ty++) this.breakAt(tx + dx, ty, '#c8b8a0'); }
    };
  }
  const key = (x, y) => x + ',' + y;
  PP.isCrystal = function (x, y) { return !!this.def.crystals && this.def.crystals.some(([cx, cy]) => cx === x && cy === y) && this.tile(x, y) === 'X'; };
  PP.isCrack = function (x, y) { return !!this.def.cracks && this.def.cracks.some(([cx, cy]) => cx === x && cy === y) && this.tile(x, y) === 'X'; };
  PP.breakAt = function (x, y, col) { this.setTile(x, y, '.'); EX.broken.add(key(x, y)); Audio8.sfx('brick'); this.shake = Math.max(this.shake, 4); for (let k = 0; k < 4; k++) this.parts.push({ k: 'frag', x: x * TS + 6, y: y * TS + 4, vx: (k - 1.5) * 0.9, vy: -2.5 - k * 0.4, g: 0.3, life: 30 }); };
  { const _en = PP.enter;
    PP.enter = function () {
      const r = _en.apply(this, arguments);
      if (this.def.explore) {
        for (const k of EX.broken) { const [x, y] = k.split(',').map(Number); this.setTile(x, y, '.'); }
        for (const [x, y, kind] of this.def.relics) if (!EX.ab.has(kind)) this.ents.push({ type: 'relic', kind, alive: true, item: true, t: 0, x: x * TS + 2, y: y * TS, w: 12, h: 14 });
        this.def.gems.forEach(([x, y], i) => { if (!EX.gems.has(i)) this.ents.push({ type: 'xgem', id: i, alive: true, item: true, t: 0, x: x * TS + 3, y: y * TS + 2, w: 10, h: 12 }); });
      }
      if (PRACTICE.on && this.li === PRACTICE.li) { this.practice = PRACTICE; const x = Math.max(2, Math.floor(this.lv.w * PRACTICE.at)); const p = this.p; let gx = x; for (let k = 0; k < 30 && gx < this.lv.w; k++, gx++) { let ok = false; for (let ty = 2; ty < 13; ty++) if (this.tile(gx, ty) === '.' && (SOLID.has(this.tile(gx, ty + 1)) || this.tile(gx, ty + 1) === '=')) { if (PRACTICE.at > 0) { p.x = gx * TS + 2; p.y = (ty + 1) * TS - p.h; } ok = true; break; } if (ok) break; } this.cam.x = clamp(p.x - 100, 0, this.lv.w * TS - VW); this.practiceX = [p.x, p.y]; }
      return r;
    };
  }
  { const _ue = PP.updateEnt;
    PP.updateEnt = function (e) {
      if (e.type === 'relic' || e.type === 'xgem') {
        e.t++; const p = this.p;
        if (this.state === 'play' && overlap(p, e)) { e.alive = false; Audio8.sfx('power');
          if (e.type === 'relic') { EX.ab.add(e.kind); this.relicMsg = { kind: e.kind, t: 200 }; } else { EX.gems.add(e.id); this.parts.push({ k: 'text', s: `CASTLE GEM ${EX.gems.size}/3`, x: e.x - 24, y: e.y - 10, vy: -0.4, life: 70 }); this.addScore(2000); } }
        return;
      }
      return _ue.call(this, e);
    };
  }
  const RELIC = { feather: ['FEATHER', 'HOLD A WHILE FALLING TO GLIDE', '#ffffff'], boots: ['BOUNCE BOOTS', 'PRESS A IN THE AIR: DOUBLE JUMP', '#ff8040'], gem: ['DASH GEM', 'PRESS S TO DASH THROUGH CRYSTAL', '#80e8ff'], fist: ['IRON FIST', 'LAND HARD TO SMASH CRACKED STONE', '#c0c0d0'] };
  const drawRelic = (kind, x, y, t) => {
    const col = RELIC[kind][2], g = ctx.createRadialGradient(x + 6, y + 6, 0.5, x + 6, y + 6, 11); g.addColorStop(0, 'rgba(255,250,200,0.6)'); g.addColorStop(1, 'rgba(255,250,200,0)'); ctx.fillStyle = g; ctx.fillRect(x - 6, y - 6, 24, 24);
    const b = Math.sin(t * 0.08) * 1.5; ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(x + 6, y + 6 + b, 6.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + 6, y + 6 + b, 5.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1020'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center'; ctx.fillText({ feather: 'F', boots: 'B', gem: 'D', fist: 'I' }[kind], x + 6, y + 8.5 + b); ctx.textAlign = 'left';
  };
  { const _de = PP.drawEnt;
    PP.drawEnt = function (e, cx) {
      const x = Math.round(e.x - cx), y = Math.round(e.y);
      if (e.type === 'relic') { drawRelic(e.kind, x, y, frame); return; }
      if (e.type === 'xgem') { const b = Math.sin(frame * 0.1 + e.id) * 1.5; ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.moveTo(x + 5, y + b); ctx.lineTo(x + 10, y + 5 + b); ctx.lineTo(x + 5, y + 12 + b); ctx.lineTo(x, y + 5 + b); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ff60c0'; ctx.beginPath(); ctx.moveTo(x + 5, y + 1.5 + b); ctx.lineTo(x + 8.6, y + 5 + b); ctx.lineTo(x + 5, y + 10.4 + b); ctx.lineTo(x + 1.4, y + 5 + b); ctx.closePath(); ctx.fill(); return; }
      return _de.call(this, e, cx);
    };
  }
  { const _dt = PP.drawTiles;
    PP.drawTiles = function (cx) {
      const r = _dt.call(this, cx);
      if (this.def.explore) { // crystals glow; cracked stone shows its cracks
        for (const [x, y] of this.def.crystals) if (this.tile(x, y) === 'X') { const X = x * TS - cx; if (X < -16 || X > VW) continue; ctx.fillStyle = 'rgba(120,230,255,0.55)'; ctx.fillRect(X, y * TS, 16, 16); ctx.strokeStyle = '#e0faff'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(X + 3, y * TS + 13); ctx.lineTo(X + 8, y * TS + 3); ctx.lineTo(X + 13, y * TS + 12); ctx.stroke(); }
        for (const [x, y] of this.def.cracks) if (this.tile(x, y) === 'X') { const X = x * TS - cx; if (X < -16 || X > VW) continue; ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X + 2, y * TS + 4); ctx.lineTo(X + 7, y * TS + 8); ctx.lineTo(X + 5, y * TS + 13); ctx.moveTo(X + 7, y * TS + 8); ctx.lineTo(X + 13, y * TS + 6); ctx.stroke(); }
      }
      return r;
    };
  }
  { const _hud = PP.drawHUD;
    PP.drawHUD = function () {
      const r = _hud.apply(this, arguments), p = this.p;
      if (p.emoteMenu) { const x = clamp(Math.round(p.x + p.w / 2 - this.cam.x), 40, VW - 40), y = Math.round(p.y) - 30; drawWindow(x - 40, y - 10, 80, 34); txt('UP: WAVE', x, y - 6, '#ffe040', { align: 'center' }); txt('SIDE: DANCE', x, y + 4, '#fff', { align: 'center' }); txt('DOWN: SIT', x, y + 14, '#fff', { align: 'center' }); }
      if (this.def.explore) {
        const room = Math.floor(p.x / (50 * TS)); EX.seen.add(room);
        for (let i = 0; i < 6; i++) { const X = 168 + i * 13, Y = 30; ctx.fillStyle = EX.seen.has(i) ? (i === room ? '#ffe040' : '#5a6ab0') : '#202840'; ctx.fillRect(X, Y, 11, 7); }
        let ix = 168; for (const k of ['feather', 'boots', 'gem', 'fist']) { ctx.globalAlpha = EX.ab.has(k) ? 1 : 0.25; ctx.save(); ctx.translate(ix, 40); ctx.scale(0.7, 0.7); drawRelic(k, 0, 0, 0); ctx.restore(); ctx.globalAlpha = 1; ix += 12; }
        txt(`*${EX.gems.size}/3`, 220, 41, '#ff60c0');
        if (this.relicMsg && this.relicMsg.t > 0) { this.relicMsg.t--; const m = RELIC[this.relicMsg.kind]; drawWindow(28, 70, 200, 40); txt(m[0] + '!', 128, 78, '#ffe040', { align: 'center' }); txt(m[1], 128, 92, '#fff', { align: 'center' }); }
      }
      if (this.practice) txt(`PRACTICE: ${{ 1: 'FULL', 0.75: '3/4', 0.5: 'HALF' }[this.practice.speed]} SPEED`, 128, 40, '#80ffb0', { align: 'center', outline: '#101848' });
      return r;
    };
  }
  // practice: slower speed, and falling or a hit just puts you back at your practice point
  const PRACTICE = { on: false, li: 0, at: 0, speed: 1 };
  { const _u = PP.update; let acc = 0;
    PP.update = function () {
      if (this.practice && this.practice.speed < 1 && this.state === 'play' && !this.paused) { acc += this.practice.speed; if (acc < 1) return; acc -= 1; }
      const r = _u.apply(this, arguments);
      if (this.state === 'play' || this.state === 'bossdead') for (const e of this.ents) if (e.enemy && e.dying && !e._bty) { e._bty = true; Bounty.count(e.boss || e.yeti ? 'boss' : e.type); }
      return r;
    };
  }
  { const _die = PP.die;
    PP.die = function () {
      if (this.practice && this.state === 'play') { const p = this.p; [p.x, p.y] = this.practiceX; p.vx = p.vy = 0; p.hearts = Math.max(p.hearts, 2); p.inv = 90; this.cam.x = clamp(p.x - 100, 0, this.lv.w * TS - VW); this.practiceFalls = (this.practiceFalls || 0) + 1; Audio8.sfx('hurt'); return; }
      return _die.apply(this, arguments);
    };
  }
  { const _h = PP.hurt;
    PP.hurt = function (s) { if (this.practice && this.state === 'play' && this.p.hearts <= 1 && !(this.p.inv > 0)) { this.die(); return; } return _h.apply(this, arguments); };
  }

  // ---------------- bounty board ----------------
  const NAMES = { grumble: 'GRUMBLES', prickle: 'PRICKLES', buzzer: 'BUZZERS', hopper: 'HOPPERS', bat: 'BATS', charger: 'RHINO-BOTS', turret: 'TURRETS', ghost: 'GHOSTS', slime: 'SLIMES', boomer: 'BOOMERS', fish: 'FISH', ant: 'ANTS', boss: 'BOSSES' };
  const RANKS = ['ROOKIE', 'TRACKER', 'HUNTER', 'SHERIFF', 'LEGEND'];
  const Bounty = {
    state() { if (!game) return null; if (!game.bounty) { game.bounty = { list: [], done: 0, seed: (Date.now() % 100000) + 7 }; } while (game.bounty.list.length < 3) game.bounty.list.push(this.make()); return game.bounty; },
    make() { const b = game.bounty, r = R(b.seed = (b.seed * 48271) % 2147483647 || 99), types = Object.keys(NAMES).filter((k) => !b.list.some((q) => q.type === k)), type = types[Math.floor(r() * types.length)], n = type === 'boss' ? 1 + Math.floor(r() * 2) : 5 + Math.floor(r() * 4) * 5; return { type, need: n, got: 0, reward: type === 'boss' ? 60 * n : 10 + n * 3 }; },
    count(type) { const s = this.state(); if (!s) return; for (const q of s.list) if (q.type === type && q.got < q.need) q.got++; },
    rank() { const d = (game && game.bounty && game.bounty.done) || 0; return RANKS[Math.min(RANKS.length - 1, Math.floor(d / 4))]; },
  };
  function BountyScene() {
    let sel = 0, t = 0, msg = '';
    return {
      enter() { Audio8.play('menu'); Bounty.state(); },
      update() {
        t++; const s = Bounty.state();
        if (Input.pressed('down')) { sel = (sel + 1) % 4; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + 3) % 4; Audio8.sfx('select'); }
        if (Input.pressed('back') || (Input.confirm() && sel === 3)) { Save.persist(); go(() => TownScene()); return; }
        if (Input.confirm()) { const q = s.list[sel]; if (q.got >= q.need) { game.coins += q.reward; while (game.coins >= 100) { game.coins -= 100; game.lives++; } s.done++; s.list[sel] = Bounty.make(); msg = `+${q.reward} COINS! RANK: ${Bounty.rank()}`; Audio8.sfx('oneup'); Save.persist(); } else { msg = 'NOT FINISHED YET - KEEP HUNTING!'; Audio8.sfx('bump'); } }
      },
      draw() {
        drawParallax('grass', t * 0.3); drawWindow(16, 18, 224, 190); const s = Bounty.state();
        txt('BOUNTY BOARD', 128, 26, '#ffe040', { align: 'center', scale: 2 }); txt(`RANK: ${Bounty.rank()}   CLAIMED: ${s.done}`, 128, 46, '#a8f0ff', { align: 'center' });
        s.list.forEach((q, i) => { const y = 62 + i * 38, on = sel === i, dn = q.got >= q.need; if (on) txt('>', 24 + ((t >> 3) & 1), y + 8, '#ffe040');
          txt(`WANTED: ${q.need} ${NAMES[q.type] || q.type.toUpperCase()}`, 36, y, on ? '#ffe040' : '#fff'); txt(`REWARD ${q.reward} COINS`, 36, y + 11, '#ffd040');
          ctx.fillStyle = '#202840'; ctx.fillRect(36, y + 22, 150, 5); ctx.fillStyle = dn ? '#40e090' : '#5a8af0'; ctx.fillRect(36, y + 22, 150 * Math.min(1, q.got / q.need), 5); txt(dn ? 'DONE! A: CLAIM' : `${q.got}/${q.need}`, 194, y + 20, dn ? '#40e090' : '#fff'); });
        txt('BACK', 36, 178, sel === 3 ? '#ffe040' : '#fff'); if (sel === 3) txt('>', 24 + ((t >> 3) & 1), 178, '#ffe040');
        if (msg) txt(msg, 128, 194, '#40e090', { align: 'center' });
      },
    };
  }

  // ---------------- randomizer ----------------
  const BASE = LEVELS.length; // 135
  LEVELS.push({ name: 'RANDOMIZER', reserved: true, noAuto: true, theme: 'grass', music: 'grass', width: 40, tag: 'RND', world: 'RANDOMIZER', build(b) { b.ground(0, 39).set(2, 11, '@').set(30, 11, 'G'); } });
  const RLI = BASE;
  const RAND = { active: false, seed: 0, i: 0, list: [], deaths: 0, frames: 0, done: false };
  const POOL = () => LEVELS.map((d, li) => [d, li]).filter(([d, li]) => d && li < 135 && !d.reserved && !d.boss && !d.board && !d.sub && !d.shmup && !d.tower && !d.custom && !d.story && !d.secretRoom && !d.yetiArena && typeof d.build === 'function').map(([, li]) => li);
  const seedCode = (n) => 'WR-' + n.toString(36).toUpperCase().padStart(6, '0');
  const seedFrom = (c) => { const m = String(c || '').trim().toUpperCase().match(/^WR-([0-9A-Z]{1,8})$/); return m ? parseInt(m[1], 36) : null; };
  function setRandLevel() {
    const src = LEVELS[RAND.list[RAND.i]], r = R(RAND.seed * 31 + RAND.i * 977 + 13);
    const GROUND = 'gphc', AIR = 'zb', BLOCKS = 'PSAVQNTE';
    LEVELS[RLI] = Object.assign({}, src, { name: `${RAND.i + 1}/8 ${src.name}`, reserved: true, randRun: true, key: undefined, secret: undefined, tag: 'RND', world: 'RANDOMIZER',
      build(b) { src.build(b); for (let y = 0; y < 14; y++) for (let x = 0; x < b.w; x++) { const c = b.g[y][x]; if (GROUND.includes(c)) b.g[y][x] = GROUND[Math.floor(r() * GROUND.length)]; else if (AIR.includes(c)) b.g[y][x] = AIR[Math.floor(r() * AIR.length)]; else if (BLOCKS.includes(c)) b.g[y][x] = BLOCKS[Math.floor(r() * BLOCKS.length)]; } } });
  }
  function startRun(seed) {
    const pool = POOL(), r = R(seed + 1), list = [];
    while (list.length < 8 && pool.length) list.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    Object.assign(RAND, { active: true, seed, i: 0, list, deaths: 0, frames: 0, done: false });
    setRandLevel(); go(() => IntroScene(RLI, false));
  }
  { const _c = PP.clear; PP.clear = function () { if (this.def.randRun && this.state === 'play') { RAND.cleared = true; RAND.frames += this.levelFrames || 0; } return _c.apply(this, arguments); }; }
  { const _d = PP.die; PP.die = function () { if (this.def.randRun && this.state === 'play') RAND.deaths++; return _d.apply(this, arguments); }; }
  { const _u = PP.update; PP.update = function () { if (this.def.randRun && this.state === 'play' && !this.paused) this.levelFrames = (this.levelFrames || 0) + 1; return _u.apply(this, arguments); }; }
  function RandomizerScene() {
    let sel = 0, t = 0, dom = false; const items = ['NEW RANDOM RUN', 'ENTER A SEED CODE', 'BACK'];
    return {
      enter() { Audio8.play('menu'); },
      update() { t++; if (dom) return;
        if (Input.pressed('down')) { sel = (sel + 1) % items.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + items.length - 1) % items.length; Audio8.sfx('select'); }
        if (Input.pressed('back') || (Input.confirm() && sel === 2)) { go(() => ChallengeScene(0)); return; }
        if (Input.confirm() && sel === 0) { Audio8.sfx('confirm'); startRun(1 + Math.floor(Math.random() * 2000000000)); }
        if (Input.confirm() && sel === 1) { dom = true; codeBox('PASTE A RANDOMIZER SEED (WR-...)', '', (code) => { const s = seedFrom(code); if (!s) return false; setTimeout(() => startRun(s), 0); return true; }, () => { dom = false; }); }
      },
      draw() { drawParallax('candy', t * 0.4); drawWindow(36, 50, 184, 130); txt('RANDOMIZER', 128, 58, '#ffe040', { align: 'center', scale: 2 });
        ['8 REAL LEVELS, SHUFFLED ORDER,', 'SHUFFLED ENEMIES AND BLOCKS.', 'SHARE THE SEED: SAME RUN!'].forEach((l, k) => txt(l, 128, 80 + k * 10, '#fff', { align: 'center' }));
        items.forEach((s, i) => { const y = 120 + i * 14; txt(s, 70, y, sel === i ? '#ffe040' : '#fff'); if (sel === i) txt('>', 58 + ((t >> 3) & 1), y, '#ffe040'); }); },
    };
  }
  function RandomResult() {
    let t = 0, dom = false; const secs = Math.round(RAND.frames / 60), code = seedCode(RAND.seed);
    return { enter() { Audio8.play('victory'); },
      update() { t++; if (dom || t < 40) return; if (Input.pressed('run') || Input.pressed('special')) { dom = true; codeBox('SHARE THIS RANDOMIZER SEED', code, null, () => { dom = false; }); return; } if (Input.confirm()) go(() => ChallengeScene(0)); },
      draw() { drawParallax('candy', t * 0.4); drawWindow(32, 50, 192, 124); txt('RUN COMPLETE!', 128, 60, '#ffe040', { align: 'center', scale: 2 }); txt(`TIME  ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, 128, 90, '#fff', { align: 'center' }); txt(`LIVES LOST  ${RAND.deaths}`, 128, 104, '#fff', { align: 'center' }); txt(`SEED  ${code}`, 128, 122, '#a8f0ff', { align: 'center' }); txt('B: SHARE THE SEED   A: DONE', 128, 150, '#fff', { align: 'center' }); } };
  }

  // ---------------- explore castle (level 136) ----------------
  const XLI = LEVELS.length;
  const crystals = [[47, 9], [47, 10], [47, 11]]; for (let y = 2; y <= 11; y++) crystals.push([188, y]);
  const cracks = [[106, 8], [107, 8], [108, 8], [106, 9], [107, 9], [108, 9], [232, 7], [233, 7]];
  LEVELS.push({ name: 'WALLY CASTLE', theme: 'castle', music: 'castle', width: 300, time: 900, explore: true, reserved: true, noAuto: true, boss: true, bossHp: 8, bossType: 'golem', bossName: 'CASTLE GOLEM', tag: 'EXP', world: 'EXPLORE MODE',
    relics: [[29, 8, 'feather'], [90, 10, 'boots'], [150, 10, 'gem'], [210, 5, 'fist']], gems: [[49, 11], [108, 11], [165, 5]], crystals, cracks,
    bossMsg: ['THE CASTLE GOLEM CRUMBLES!', '', 'YOU EXPLORED WALLY CASTLE.', 'DID YOU FIND ALL 3 GEMS?', '', 'COME BACK ANY TIME FROM', 'THE CHALLENGES MENU.'],
    build(b) {
      b.fill(0, 0, 299, 1, 'X').ground(0, 55).set(2, 11, '@').fill(26, 9, 32, 9, '=').set(14, 11, 'g').set(36, 11, 'p');
      b.fill(47, 8, 52, 11, 'X').fill(48, 9, 51, 11, '.').set(54, 11, 'C');
      b.ground(71, 190).set(80, 11, 'g').set(98, 11, 'p').set(115, 8, 'z').fill(104, 8, 112, 11, 'X').fill(106, 10, 110, 11, '.').set(120, 11, 'C').fill(128, 4, 129, 11, 'X');
      b.set(140, 3, 'b').set(158, 11, 'c').fill(162, 6, 168, 6, '=').set(176, 11, 'g').set(184, 11, 'C').fill(188, 2, 188, 11, 'X');
      b.ground(189, 299).fill(191, 7, 231, 11, 'X').fill(232, 7, 262, 7, 'X').fill(262, 2, 263, 6, 'X').set(222, 6, 'g').set(245, 11, 'g').set(268, 11, 'C').set(294, 11, '*');
    } });
  function ExploreIntro() {
    let t = 0;
    return { enter() { Audio8.play('castle'); },
      update() { t++; if (t > 30 && Input.confirm()) { EX.ab.clear(); EX.gems.clear(); EX.broken.clear(); EX.seen.clear(); go(() => IntroScene(XLI, false)); } if (Input.pressed('back')) go(() => ChallengeScene(0)); },
      draw() { drawParallax('castle', t * 0.3); drawWindow(24, 40, 208, 150); txt('EXPLORE CASTLE', 128, 48, '#ffe040', { align: 'center', scale: 2 });
        ['ONE BIG CASTLE. FIND 4 RELICS', 'THAT OPEN NEW WAYS ON:', '', 'F FEATHER - GLIDE OVER GAPS', 'B BOUNCE BOOTS - DOUBLE JUMP', 'D DASH GEM - S DASHES THROUGH', '  CRYSTAL', 'I IRON FIST - LAND HARD TO', '  SMASH CRACKED STONE', '', 'FIND 3 HIDDEN CASTLE GEMS TOO!'].forEach((l, k) => txt(l, 40, 68 + k * 10, k >= 3 && k <= 8 ? '#a8f0ff' : '#fff'));
        if ((t >> 4) & 1) txt('PRESS A TO ENTER', 128, 182, '#ffe040', { align: 'center' }); } };
  }

  // ---------------- practice ----------------
  function PracticeScene() {
    let sel = 0, t = 0, step = 0, at = 0, sp = 0; const SPEEDS = [1, 0.75, 0.5];
    const list = () => LEVELS.map((d, li) => [d, li]).filter(([d, li]) => d && !d.reserved && game && game.cleared[li]).map(([, li]) => li);
    return {
      enter() { Audio8.play('menu'); },
      update() {
        t++; const L = list();
        if (step === 0) {
          if (!L.length) { if (Input.confirm() || Input.pressed('back')) go(() => ChallengeScene(0)); return; }
          if (Input.pressed('down')) { sel = (sel + 1) % L.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + L.length - 1) % L.length; Audio8.sfx('select'); }
          if (Input.pressed('back')) { go(() => ChallengeScene(0)); return; }
          if (Input.confirm()) { step = 1; Audio8.sfx('confirm'); }
        } else {
          if (Input.pressed('down') || Input.pressed('up')) { step = step === 1 ? 2 : 1; Audio8.sfx('select'); }
          const d = (Input.pressed('right') ? 1 : 0) - (Input.pressed('left') ? 1 : 0);
          if (d && step === 1) { at = clamp(at + d, 0, 9); Audio8.sfx('select'); } if (d && step === 2) { sp = (sp + d + 3) % 3; Audio8.sfx('select'); }
          if (Input.pressed('back')) { step = 0; return; }
          if (Input.confirm()) { Object.assign(PRACTICE, { on: true, li: L[sel], at: at / 10, speed: SPEEDS[sp] }); Audio8.sfx('confirm'); go(() => new Play(L[sel], false)); }
        }
      },
      draw() {
        drawParallax('sky', t * 0.3); drawWindow(20, 14, 216, 196); txt('PRACTICE', 128, 22, '#ffe040', { align: 'center', scale: 2 });
        const L = list();
        if (!L.length) { txt('BEAT A LEVEL FIRST, THEN', 128, 90, '#fff', { align: 'center' }); txt('PRACTISE ANY PART OF IT HERE.', 128, 102, '#fff', { align: 'center' }); return; }
        if (step === 0) { const SHOW = 13, top = clamp(sel - 6, 0, Math.max(0, L.length - SHOW)); for (let i = 0; i < Math.min(SHOW, L.length); i++) { const k = top + i, y = 44 + i * 11; txt(`${levelTag(L[k])} ${LEVELS[L[k]].name}`.slice(0, 32), 40, y, k === sel ? '#ffe040' : '#fff'); if (k === sel) txt('>', 30 + ((t >> 3) & 1), y, '#ffe040'); } txt('A: CHOOSE', 128, 196, '#a8b0d8', { align: 'center' }); }
        else { const li = L[sel]; txt(LEVELS[li].name, 128, 50, '#fff', { align: 'center' });
          txt(`START POINT  < ${at}/10 >`, 128, 84, step === 1 ? '#ffe040' : '#fff', { align: 'center' }); ctx.fillStyle = '#202840'; ctx.fillRect(48, 98, 160, 6); ctx.fillStyle = '#40e090'; ctx.fillRect(48 + at * 16, 96, 4, 10);
          txt(`SPEED  < ${['FULL', '3/4', 'HALF'][sp]} >`, 128, 124, step === 2 ? '#ffe040' : '#fff', { align: 'center' });
          txt('NO LIVES LOST: A FALL OR A', 128, 150, '#a8f0ff', { align: 'center' }); txt('LAST HIT PUTS YOU BACK HERE.', 128, 160, '#a8f0ff', { align: 'center' }); txt('A: GO   B: BACK', 128, 186, '#ffe040', { align: 'center' }); }
      },
    };
  }
  // after a practice run, a randomizer level or the explore castle, go to the right place instead of the map
  { const _M = MapScene;
    MapScene = function (...a) { // eslint-disable-line no-func-assign
      if (PRACTICE.on) { PRACTICE.on = false; return PracticeScene(); }
      if (RAND.active) { if (RAND.cleared) { RAND.cleared = false; RAND.i++; if (RAND.i < RAND.list.length) { setRandLevel(); return IntroScene(RLI, false); } RAND.active = false; return RandomResult(); } RAND.active = false; }
      return _M(...a);
    };
  }
  // the new modes on the Challenges menu
  ChallengeScene = function (start = 0) { // eslint-disable-line no-func-assign
    const items = ['TIME ATTACK', 'BOSS RUSH', 'DAILY CHALLENGE', 'ENDLESS RUN', 'VERSUS', 'SURVIVAL ARENA', 'HARD REMIX', "DOUG'S STORY", 'ROGUELIKE TOWER', 'GOLDEN LEVELS', 'TUTORIAL', 'MIRROR MODE', 'PARTY MODE', 'SPEEDRUN', 'WEEKLY CHALLENGE', 'MEGA BOSS RUSH', 'IRON HERO', 'RANDOMIZER', 'EXPLORE CASTLE', 'PRACTICE', 'BACK'];
    const tips = ['RACE ANY LEVEL YOU HAVE BEATEN', 'EVERY BOSS BACK TO BACK!', "TODAY'S LEVEL WITH A TWIST", 'HOW FAR CAN YOU RUN?', 'TWO PLAYERS: RACE OR BATTLE', 'ENDLESS WAVES OF FOES', 'MEANER VERSIONS OF WALLY ISLAND', 'PLAY AS DOUG IN 3 NEW LEVELS', 'RANDOM FLOORS, UPGRADES, ONE LIFE', 'HUNT 100 GOLD COINS PER LEVEL', 'LEARN ALL THE MOVES', 'EVERY LEVEL FLIPPED AROUND', 'UP TO 4 PLAYERS, 3 MINI-GAMES', 'ONE TIMER FOR THE WHOLE GAME', '3 LEVELS, 1 RULE, NEW EVERY WEEK', 'EVERY BOSS IN THE GAME IN A ROW', 'ONE LIFE FOR THE WHOLE GAME', '8 SHUFFLED LEVELS FROM A SEED', 'ONE BIG CASTLE, 4 RELICS', 'ANY BIT OF A LEVEL, SLOWED DOWN', ''];
    const go_ = [() => TimeAttackSelect(), () => RushIntroScene(), () => DailyScene(), () => EndlessIntro(), () => VersusScene(), () => ArenaIntro(), () => RemixScene(), () => StoryMenu(Math.min(2, storyDone())), () => RogueIntro(), () => GoldScene(), () => startTutorial(false), () => MirrorScene(), () => PartyScene(), () => SpeedrunScene(), () => WeeklyScene(), () => MegaIntro(), () => IronScene(), () => RandomizerScene(), () => ExploreIntro(), () => PracticeScene()];
    let sel = Math.min(start, items.length - 1), t = 0;
    return {
      enter() { Audio8.play('menu'); },
      update() {
        t++;
        if (Input.pressed('down')) { sel = (sel + 1) % items.length; Audio8.sfx('select'); }
        if (Input.pressed('up')) { sel = (sel + items.length - 1) % items.length; Audio8.sfx('select'); }
        if (Input.pressed('back') || (Input.confirm() && sel === items.length - 1)) { go(() => TitleScene()); return; }
        if (Input.confirm()) { Audio8.sfx('confirm'); go(go_[sel]); }
      },
      draw() {
        drawParallax('castle', t * 0.4); drawLogo(2); drawWindow(48, 72, 160, 136); txt('CHALLENGES', 128, 77, '#ffe040', { align: 'center' });
        const SHOW = 12, top = clamp(sel - 6, 0, items.length - SHOW);
        for (let i = 0; i < SHOW; i++) { const k = top + i, y = 88 + i * 10; txt(items[k], 74, y, k === sel ? '#ffe040' : k >= 17 && k <= 19 ? '#a8f0ff' : '#fff'); if (k === sel) txt('>', 62 + ((t >> 3) & 1), y, '#ffe040'); }
        if (top > 0) txt('^', 196, 86, '#a8b0d8'); if (top + SHOW < items.length) txt('V', 196, 198, '#a8b0d8');
        txt(tips[sel], 128, 212, '#fff', { align: 'center', outline: '#101848' });
      },
    };
  };
  if (typeof ACH_LIST !== 'undefined') ACH_LIST.push(['emote', 'HELLO THERE!', 'DO AN EMOTE IN A LEVEL']);
  return { EX, RAND, PRACTICE, Bounty, BountyScene, RandomizerScene, ExploreIntro, PracticeScene, startRun, seedCode, seedFrom, POOL, RLI, XLI };
})();
function BountyScene() { return U22.BountyScene(); }
