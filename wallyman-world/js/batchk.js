'use strict';
// =====================================================================
// Batch K (part 1): Orbit One (8th world) with zero-gravity rooms,
// airlocks, laser gates and Mega-Bot; the hidden Glitch World; island
// side quests; more pets and outfits; the speedrun timer; achievement
// titles; and a warning when a browser won't keep saves.
// =====================================================================
ACH_LIST.push(['megabot', 'SCRAP METAL', 'BEAT MEGA-BOT ON ORBIT ONE'], ['glitchworld', 'MISSINGNO', 'FINISH THE GLITCH WORLD'], ['kartgp', 'GRAND PRIX CHAMP', 'WIN A KART GRAND PRIX'],
  ['petpal', 'PET PAL', 'ADOPT A NEW PET'], ['ghostrace', 'FRIENDLY RIVALRY', "BEAT A FRIEND'S GHOST"], ['speedrun', 'SPEEDRUNNER', 'FINISH A SPEEDRUN'], ['islandquest', 'HELPING HAND', 'FINISH AN ISLAND QUEST'],
  ['fishlog', 'MASTER ANGLER', 'CATCH 15 KINDS OF FISH'], ['fashion2', 'TRENDSETTER', 'BUY AN OUTFIT AT THE COSTUME SHOP'], ['reader', 'BOOKWORM', 'READ EVERY PAGE OF THE HELP BOOK']);
Object.assign(BOSS_TALK, { megabot: [['boss', 'INTRUDER DETECTED. INITIATING... STOMP PROTOCOL.'], ['hero', 'BEEP BOOP YOURSELF, TIN CAN!']] });
Object.assign(BOSS_ART, { megabot: 'megabot' }); Object.assign(BOSS_NAMES, { megabot: 'MEGA-BOT' });
BEASTS.push(['megabot', 'MEGA-BOT', 'b']); Object.assign(BEAST_INFO, { megabot: 'THE GUARD OF ORBIT ONE. STOMP ITS HEAD WHEN THE HATCH OPENS.' });
Object.assign(SONG_NAMES, {});
SOLID.add('Ш');

// ---------------- saves: spot browsers that won't keep them ----------------
const StorageCheck = (() => {
  let ok = true, seen = false;
  try { const k = 'wallyman-storage-test'; localStorage.setItem(k, '1'); ok = localStorage.getItem(k) === '1'; localStorage.removeItem(k); seen = !!localStorage.getItem('wallyman-seen'); localStorage.setItem('wallyman-seen', String(Date.now())); } catch (e) { ok = false; }
  const embedded = (() => { try { return window.top !== window; } catch (e) { return true; } })();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* ignore */ }
  const risky = !ok || (embedded && !seen && !Save.slots.some(Boolean));
  return { ok: () => ok, risky: () => risky };
})();

// ---------------- art ----------------
function drawMegaBot(x, y, e, t) {
  if (e && e.inv > 0 && (frame >> 2) & 1) return;
  const open = e && e.state === 'hatch', l = e && Math.abs(e.vx) > 0.2 ? (t >> 3) & 1 : 0;
  hR(x + 4 + l * 2, y + 36, 10, 14, '#1a1020'); hR(x + 28 - l * 2, y + 36, 10, 14, '#1a1020'); hR(x + 5 + l * 2, y + 37, 8, 12, '#6a7080'); hR(x + 29 - l * 2, y + 37, 8, 12, '#6a7080');
  hR(x, y + 12, 42, 26, '#1a1020'); hR(x + 1, y + 13, 40, 24, '#a0a8b8'); hR(x + 1, y + 13, 40, 3, '#d0d8e8'); hR(x + 14, y + 20, 14, 10, '#3a3a58'); hR(x + 16, y + 22, 10, 6, (t >> 3) & 1 ? '#ff3040' : '#a01020');
  hR(x - 6, y + 16, 7, 18, '#1a1020'); hR(x + 41, y + 16, 7, 18, '#1a1020'); hR(x - 5, y + 17, 5, 16, '#8a90a8'); hR(x + 42, y + 17, 5, 16, '#8a90a8');
  hR(x + 8, y, 26, 14, '#1a1020'); hR(x + 9, y + 1, 24, 12, '#c0c8d8'); hR(x + 12, y + 5, 18, 4, '#1a1020'); hR(x + 13, y + 6, 16, 2, '#5ff0ff');
  if (open) { hR(x + 10, y - 6, 22, 7, '#1a1020'); hR(x + 11, y - 5, 20, 5, '#ffe040'); txt('!', x + 18, y - 18, '#ffe040', { outline: '#1a1020' }); } else { hR(x + 18, y - 4, 2, 4, '#c0c8d8'); hR(x + 17, y - 6, 4, 2, (t >> 4) & 1 ? '#ff3040' : '#ffe040'); }
}
{
  const _sa = stickerArt;
  stickerArt = function (id, x, y, t) { if (id === 'megabot') { ctx.save(); ctx.translate(x, y); ctx.scale(0.4, 0.4); drawMegaBot(-21, -25, null, t); ctx.restore(); return; } return _sa(id, x, y, t); }; // eslint-disable-line no-func-assign
}

// ---------------- Orbit One and the Glitch World ----------------
LEVELS.push(
  { // 64
    name: 'ORBIT DOCK', theme: 'moon', music: 'moon', width: 170, lowGrav: true, space: true, tag: 'OO1', world: 'ORBIT ONE 1',
    extras: [['u', 70], ['c', 120]],
    build(b) {
      b.ground(0, 30).set(2, 11, '@').coins(8, 9, 5).set(18, 11, 'c').row(24, 7, 'WPW');
      b.ground(36, 70).set(42, 11, 't').fill(50, 8, 53, 11, 'X').coins(50, 7, 4).set(60, 11, 'c').set(66, 11, 'C');
      b.ground(76, 110).set(84, 11, 'c').row(90, 7, 'BWB').set(100, 11, 't');
      b.ground(116, 169).set(124, 11, 'c').fill(134, 9, 136, 11, 'X').set(150, 11, 'c').set(162, 11, 'G');
    },
  },
  { // 65
    name: 'ZERO-G LAB', theme: 'moon', music: 'moon', width: 170, space: true, tag: 'OO2', world: 'ORBIT ONE 2',
    build(b) {
      b.ground(0, 24).set(2, 11, '@').coins(8, 10, 4);
      b.ground(25, 60, 12).fill(28, 2, 56, 11, '░').fill(27, 1, 57, 1, 'X').fill(27, 2, 27, 8, 'X').fill(57, 4, 57, 11, 'X').coins(34, 4, 4).coins(46, 7, 4).set(40, 5, 'z').set(50, 9, 'z');
      b.ground(61, 90).set(66, 11, 'C').set(74, 11, 'c').row(80, 8, 'WEW');
      b.ground(91, 140, 12).fill(94, 1, 136, 11, '░').fill(93, 0, 137, 0, 'X').fill(100, 5, 101, 11, 'X').fill(112, 1, 113, 7, 'X').fill(124, 5, 125, 11, 'X').coins(104, 3, 4).coins(116, 9, 4).set(130, 4, 'z');
      b.ground(141, 169).set(150, 11, 'c').set(162, 11, 'G');
    },
  },
  { // 66
    name: 'AIRLOCK ALLEY', theme: 'factory', music: 'moon', width: 170, space: true, tag: 'OO3', world: 'ORBIT ONE 3',
    airlocks: [[30, 6, 11, 0], [62, 6, 11, 120], [100, 6, 11, 60], [136, 6, 11, 180]], lasers: [[46, 2, 11, 150, 0], [82, 2, 11, 150, 75], [118, 2, 11, 120, 30]],
    build(b) {
      b.ground(0, 169).fill(0, 0, 169, 5, 'X').set(2, 11, '@').coins(8, 10, 4).set(20, 11, 'c').set(56, 11, 'C').set(70, 11, 't').set(90, 11, 'c').row(108, 8, 'WPW').set(126, 11, 'c').set(150, 11, 'c').set(162, 11, 'G');
      for (const x of [30, 62, 100, 136]) b.fill(x, 6, x, 11, 'Ш');
    },
  },
  { // 67
    name: 'SOLAR ARRAY', theme: 'sky', music: 'neon', width: 180, space: true, lowGrav: true, tag: 'OO4', world: 'ORBIT ONE 4',
    lasers: [[40, 0, 11, 140, 0], [96, 0, 11, 120, 60], [150, 0, 11, 100, 20]],
    build(b) {
      b.ground(0, 22).set(2, 11, '@').coins(8, 9, 4);
      for (let x = 26; x < 170; x += 9) { const y = 8 + ((x * 5) % 4); b.fill(x, y, x + 4, y, '='); b.coins(x + 1, y - 2, 3); if (x % 27 === 8) b.set(x + 2, y - 1, 'c'); }
      b.set(90, 5, 'C').fill(88, 6, 92, 6, '=');
      b.ground(168, 179).set(174, 11, 'G');
    },
  },
  { // 68
    name: 'REACTOR CORE', theme: 'static', music: 'static', width: 170, lantern: true, space: true, tag: 'OO5', world: 'ORBIT ONE 5',
    lasers: [[60, 2, 11, 110, 0], [120, 2, 11, 90, 45]],
    build(b) {
      b.fill(0, 0, 169, 0, 'X');
      b.ground(0, 40).set(2, 11, '@').set(10, 7, CRYS).set(20, 11, 'c').row(28, 8, 'WBW');
      b.ground(44, 80).set(50, 7, CRYS).set(70, 11, 't').set(76, 11, 'C');
      b.ground(84, 90).fill(88, 4, 88, 9, 'X').ground(91, 110, 4).set(91, 8, CRYS).coins(94, 3, 4);
      b.ground(111, 169).set(118, 11, 'c').set(132, 7, CRYS).set(140, 11, 'c').set(150, 7, CRYS).set(162, 11, 'G');
    },
  },
  { // 69
    name: 'MEGA-BOT BAY', theme: 'moon', music: 'moon', width: 80, boss: true, bossHp: 8, bossName: 'MEGA-BOT', bossType: 'megabot', talk: 'megabot', space: true, tag: 'OO6', world: 'ORBIT ONE 6',
    bossMsg: ['MEGA-BOT POWERS DOWN!', '', 'ORBIT ONE IS SAFE, AND IT', 'BEAMS FULL SIGNAL BACK TO', 'EVERY ISLAND BELOW.', '', 'NICE WORK, SPACE HERO!'],
    build(b) { b.ground(0, 79).set(2, 11, '@').coins(8, 10, 4).set(18, 11, 'c').row(26, 8, 'WEW').set(36, 11, 'C').set(46, 11, 'c').row(66, 8, '===').row(74, 8, '==').set(74, 11, '*'); },
  },
  { // 70
    name: 'GLITCH 1: BOUNCE HOUSE', theme: 'static', music: 'static', width: 150, glitch: true, bouncy: true, noAuto: true, noSign: true, tag: '?-1', world: 'GLITCH WORLD',
    build(b) { b.ground(0, 149).set(2, 11, '@'); for (let x = 14; x < 140; x += 12) { b.gap(x, x + 2).coins(x, 5, 3); b.fill(x + 6, 6 + (x % 3), x + 8, 6 + (x % 3), 'X'); } b.set(40, 11, 'g').set(80, 11, 'g').set(110, 11, 'h').set(144, 11, 'G'); },
  },
  { // 71
    name: 'GLITCH 2: BACKWARDS', theme: 'haunted', music: 'haunted', width: 150, glitch: true, swapLR: true, noAuto: true, noSign: true, tag: '?-2', world: 'GLITCH WORLD',
    build(b) { b.ground(0, 149).set(2, 11, '@').coins(8, 10, 4); b.gap(20, 22).fill(30, 10, 31, 11, 'X').gap(44, 46).set(54, 11, 'g').fill(64, 9, 66, 11, 'X').gap(76, 78).row(86, 8, 'WWW').set(98, 11, 'p').gap(108, 110).fill(118, 10, 119, 11, 'X').set(128, 11, 'g').set(144, 11, 'G'); },
  },
  { // 72
    name: 'GLITCH 3: LAG SPIKES', theme: 'castle', music: 'castle', width: 160, glitch: true, lag: true, noAuto: true, noSign: true, tag: '?-3', world: 'GLITCH WORLD',
    build(b) { b.ground(0, 159).set(2, 11, '@'); for (let x = 16; x < 150; x += 16) { b.gap(x, x + 2); b.set(x + 8, 11, x % 32 ? 'g' : 'p').coins(x + 5, 9, 3); } b.set(154, 11, 'G'); },
  },
);
const ORBIT_BASE = 64, GLITCH_BASE = 70;

{
  const _upd = Play.prototype.update;
  Play.prototype.update = function () {
    const m = this.mode;
    // risky browser: offer a save code when quitting to the title
    if (StorageCheck.risky() && !m && this.paused && this.pauseSel === 7 && Input.pressed('jump') && Save.slots.includes(game)) { this.paused = false; this.state = 'done'; Save.persist(); go(() => SaveCodeQuit()); return; }
    if (!this._initK) this.initK();
    _upd.call(this);
    if (this.paused || this.talk || this.photo) return;
    if (this.pet && game && game.petKind && PETS[game.petKind] && this.pet.kind !== game.petKind) this.pet.kind = game.petKind;
    if (this.def.space) this.parts = this.parts.filter((q) => q.k !== 'bubble');
    if (this.state !== 'play') return;
    const p = this.p, hF = this.hF || 0;
    for (const a of this.def.airlocks || []) { // doors that cycle open and shut, with a suck of air while open
      const [x, y0, y1, ph] = a, open = (hF + ph) % 360 < 130;
      if (open !== a.open) { a.open = open; for (let y = y0; y <= y1; y++) this.setTile(x, y, open ? '.' : 'Ш'); if (Math.abs(x * TS - p.x) < 260) Audio8.sfx(open ? 'swoop' : 'bump'); }
      if (open && Math.abs(x * TS + 8 - (p.x + p.w / 2)) < 90 && p.y + p.h > y0 * TS) p.x += Math.sign(x * TS + 8 - (p.x + p.w / 2)) * 0.45;
    }
    for (const [x, y0, y1, per, ph] of this.def.lasers || []) { const c = (hF + ph) % per; if (c < per / 2 && overlap(p, { x: x * TS + 5, y: y0 * TS, w: 6, h: (y1 - y0 + 1) * TS })) this.hurt(); }
    if (this.def.bouncy && p.onGround && !Input.down('down')) { p.vy = -7.2; p.onGround = false; Audio8.sfx('spring'); }
    if (this.def.lag) { this.lagBuf = this.lagBuf || []; this.lagBuf.push([p.x, p.y]); if (this.lagBuf.length > 50) this.lagBuf.shift(); if (hF % 240 === 200) { const [x, y] = this.lagBuf[0]; p.x = x; p.y = y; p.vx = 0; p.vy = 0; this.shake = 6; Audio8.sfx('zap'); this.parts.push({ k: 'text', s: 'LAG!', x: p.x - 6, y: p.y - 16, vy: -0.4, life: 40 }); } }
    // a secret: hold Down against the far-left wall at the start of Cavern Commute
    if (this.li === 1 && !m && p.x < 2 * TS && p.onGround && Input.down('down')) { if (++this.glitchT === 180) { this.state = 'done'; Audio8.sfx('secret'); go(() => MessageScene(['YOU FELL THROUGH THE FLOOR...', '', 'WELCOME TO THE', 'GLITCH WORLD!', '', 'NOTHING HERE WORKS QUITE', 'THE WAY IT SHOULD...'], () => startGlitch(0))); } } else this.glitchT = 0;
  };
  Play.prototype.initK = function () {
    this._initK = true;
    // island quest items appear while a quest is on
    const q = ISLAND_QUESTS.find((k) => k.levels.includes(this.li)), st = q && game && game.iq && game.iq[q.id];
    if (q && st && st.state === 'active' && !this.mode && !(st.got & (1 << q.levels.indexOf(this.li)))) {
      const g = this.lv.grid, W = this.lv.w, want = Math.floor(W * (0.3 + 0.2 * q.levels.indexOf(this.li)));
      for (let x = want; x < W - 10; x++) { let gy = -1; for (let y = 3; y < 14; y++) if (SOLID.has(g[y][x]) && g[y - 1][x] === '.' && g[y - 2][x] === '.') { gy = y; break; } if (gy > 0) { this.ents.push({ type: 'qitem', item: true, alive: true, t: 0, x: x * TS + 2, y: (gy - 1) * TS + 1, oy: (gy - 1) * TS + 1, w: 12, h: 14, rise: 0, q: q.id, bit: 1 << q.levels.indexOf(this.li) }); break; } }
    }
    // a chosen pet
    if (this.pet && game && game.petKind && PETS[game.petKind]) this.pet.kind = game.petKind;
  };
  const _ue = Play.prototype.updateEnt;
  Play.prototype.updateEnt = function (e) {
    const p = this.p;
    if (e.type === 'qitem') { e.t++; e.y = e.oy + Math.sin(e.t * 0.08) * 2; if (this.state === 'play' && overlap(p, e)) { e.alive = false; const st = game.iq[e.q]; st.got |= e.bit; const q = ISLAND_QUESTS.find((k) => k.id === e.q), n = q.levels.filter((_, i) => st.got & (1 << i)).length; Audio8.sfx('oneup'); this.parts.push({ k: 'text', s: `${q.item} ${n}/3!`, x: p.x - 30, y: p.y - 24, vy: -0.4, life: 80 }); Save.persist(); } return; }
    if (e.type === 'megabot') return this.updateMegaBot(e);
    return _ue.call(this, e);
  };
  Play.prototype.updateMegaBot = function (e) {
    const p = this.p; if (e.inv > 0) e.inv--;
    e.vy = Math.min(6, e.vy + 0.35); this.move(e, false);
    if (!this.bossLock || this.talk || this._p2ctx) return;
    e.t++; const L = this.camMin + 10, R = this.camMin + VW - 52, rage = e.maxHp - e.hp;
    if (--e.act <= 0) {
      const next = { walk: 'stomp', stomp: 'rockets', rockets: 'hatch', hatch: 'walk' }[e.state] || 'walk';
      e.state = next; e.act = { walk: 90 - rage * 5, stomp: 60, rockets: 80, hatch: 110 - rage * 7 }[next];
      if (next === 'stomp') { e.vy = -6; e.stomping = true; Audio8.sfx('lasercharge'); }
      if (next === 'rockets') for (let k = 0; k < 3 + (rage >> 2); k++) this.ents.push({ type: 'bolt', alive: true, t: 0, x: e.x + 18, y: e.y + 4, w: 8, h: 8, vx: (p.x < e.x ? -1 : 1) * (1.2 + k * 0.7), vy: -4 - k * 0.3, g: 0.14, life: 180 });
      if (next === 'rockets') Audio8.sfx('cannon');
    }
    if (e.state === 'walk') { e.face = p.x < e.x + 20 ? -1 : 1; e.vx = e.face * (0.6 + rage * 0.08); } else e.vx = 0;
    if (e.stomping && e.onGround && e.vy >= 0) { e.stomping = false; this.shake = 14; Audio8.sfx('bosshit'); for (const d of [-1, 1]) this.ents.push({ type: 'wave', alive: true, t: 0, x: e.x + 18 + d * 20, y: 12 * TS - 14, w: 12, h: 14, vx: d * (2 + rage * 0.15), life: 160 }); }
    e.x = clamp(e.x, L, R);
    if (this.state !== 'play' || !overlap(p, e) || e.inv > 0) return;
    if (e.state === 'hatch' && p.vy > 0 && p.prevBottom <= e.y + 12) { p.vy = -6.5; this.damageBoss(e); if (e.alive) { e.state = 'walk'; e.act = 60; } return; }
    this.hurt();
  };
  const _sp = Play.prototype.spawn;
  Play.prototype.spawn = function (sp) {
    if (sp.t === '*' && this.def.bossType === 'megabot') { const hp = (this.def.bossHp || 8) + (this.diff === 'hard' ? 1 : this.diff === 'easy' ? -1 : 0); this.ents.push({ type: 'megabot', boss: true, enemy: true, alive: true, t: 0, x: sp.x * TS - 30, y: 12 * TS - 50, w: 42, h: 50, hp, maxHp: hp, inv: 0, state: 'walk', act: 80, vx: 0, vy: 0, face: -1 }); return; }
    return _sp.call(this, sp);
  };
  const _db = Play.prototype.damageBoss;
  Play.prototype.damageBoss = function (e) { const a = e.alive, sa = Sticker.add; if (e.type === 'megabot') Sticker.add = () => {}; try { _db.call(this, e); } finally { Sticker.add = sa; } if (a && !e.alive && e.type === 'megabot') { Ach.unlock('megabot'); Bestiary.add('megabot'); } };
  const _de = Play.prototype.drawEnt;
  Play.prototype.drawEnt = function (e, cx) {
    const x = Math.round(e.x - cx), y = Math.round(e.y);
    if (e.type === 'qitem') { drawQuestItem(e.q, x, y, frame); return; }
    if (e.type === 'megabot') { if (e.dying) return; drawMegaBot(x, y, e, frame); return; }
    return _de.call(this, e, cx);
  };
  const _dt = Play.prototype.drawTiles;
  Play.prototype.drawTiles = function (cx) {
    _dt.call(this, cx);
    const t0 = Math.floor(cx / TS);
    for (let ty = 0; ty < 14; ty++) for (let tx = t0; tx <= t0 + 16; tx++) {
      const c = this.tile(tx, ty), X = tx * TS - cx, Y = ty * TS;
      if (c === '░') { ctx.fillStyle = 'rgba(160,120,255,0.13)'; ctx.fillRect(X, Y, 16, 16); if ((tx * 7 + ty * 3 + (frame >> 4)) % 9 === 0) { ctx.fillStyle = '#e0d0ff'; ctx.fillRect(X + (tx * 5) % 14, Y + (ty * 7) % 14, 1, 1); } }
      else if (c === 'Ш') { hR(X + 2, Y, 12, 16, '#1a1020'); hR(X + 3, Y, 10, 16, '#8a90a8'); hR(X + 3, Y + ((ty * 3) % 16), 10, 2, '#ffd040'); hR(X + 7, Y, 2, 16, '#5a6078'); }
    }
    for (const [x, y0, y1, per, ph] of this.def.lasers || []) {
      const c = ((this.hF || 0) + ph) % per, X = x * TS - cx; if (X < -16 || X > VW + 16) continue;
      hR(X + 3, y0 * TS - 6, 10, 6, '#1a1020'); hR(X + 4, y0 * TS - 5, 8, 4, '#ff3040'); hR(X + 3, (y1 + 1) * TS, 10, 4, '#1a1020');
      if (c < per / 2) { hR(X + 6, y0 * TS, 4, (y1 - y0 + 1) * TS, '#ff2040'); hR(X + 7, y0 * TS, 2, (y1 - y0 + 1) * TS, '#ffd0d8'); } else if (c > per - 25 && (frame >> 2) & 1) hR(X + 7, y0 * TS, 2, (y1 - y0 + 1) * TS, 'rgba(255,60,80,0.35)');
    }
  };
  // the second Glitch World level swaps left and right
  const _up = Play.prototype.updatePlayer;
  Play.prototype.updatePlayer = function () {
    if (this.def.space && this.state === 'play') { // zero-gravity rooms: drift gently instead of sinking
      const r = _up.call(this), p = this.p; if (this.tile(Math.floor((p.x + p.w / 2) / TS), Math.floor((p.y + p.h / 2) / TS)) === '░' && p.vy > 0.45) p.vy = 0.45; return r;
    }
    if (!this.def.swapLR || this.state !== 'play') return _up.call(this);
    const D = Input.down; Input.down = (k) => (k === 'left' ? D('right') : k === 'right' ? D('left') : D(k));
    try { return _up.call(this); } finally { Input.down = D; }
  };
}
function startGlitch(i) { const s = new Play(GLITCH_BASE + i, false); s.mode = { kind: 'glitch', i }; return s; }
{
  const _me = modeExit;
  modeExit = function (pl, won) { // eslint-disable-line no-func-assign
    const m = pl.mode;
    if (m.kind !== 'glitch') return _me(pl, won);
    if (!won) return MapScene();
    if (m.i < 2) return startGlitch(m.i + 1);
    Ach.unlock('glitchworld'); game.outfits = game.outfits || []; if (!game.outfits.includes('glitch')) game.outfits.push('glitch'); game.lives += 3; Save.persist();
    return MessageScene(['YOU ESCAPED THE GLITCH WORLD!', '', 'REWARD: THE GLITCH OUTFIT', '(IN THE WARDROBE) AND 3 LIVES.', '', 'TELL NO ONE HOW YOU GOT IN...'], () => MapScene());
  };
}

// ---------------- island side quests ----------------
const ISLAND_QUESTS = [
  { id: 'socks', world: 1, npc: 'ASTRO AL', col: '#c0c8d8', levels: [11, 12, 13], item: 'SPACE SOCK', text: ['MY 3 LUCKY SPACE SOCKS', 'FLOATED OFF INTO THE', 'LEVELS OF STAR ISLE!'], x: 44, y: 120 },
  { id: 'balloons', world: 2, npc: 'CLOWN CLARA', col: '#ff60b0', levels: [15, 17, 19], item: 'BALLOON', text: ['THE WIND STOLE MY 3', 'BEST BALLOONS! THEY ARE', 'STUCK AROUND THE FAIR.'], x: 30, y: 128 },
  { id: 'idols', world: 3, npc: 'PROF DIGBY', col: '#c08040', levels: [24, 26, 29], item: 'GOLD IDOL', text: ['3 GOLDEN IDOLS ARE HIDDEN', 'IN THE LOST LANDS. FIND', 'THEM FOR MY MUSEUM!'], x: 40, y: 120 },
  { id: 'gems', world: 4, npc: 'MINER MO', col: '#80f0ff', levels: [38, 39, 40], item: 'GLOW GEM', text: ['I DROPPED 3 GLOW GEMS', 'DOWN THE CAVES. MY LAMP', 'NEEDS THEM BACK!'], x: 30, y: 136 },
  { id: 'coins', world: 5, npc: 'CAP. POLLY', col: '#ffd040', levels: [51, 52, 53], item: 'DOUBLOON', text: ['ARR! 3 OF ME LUCKY GOLD', 'DOUBLOONS WENT OVERBOARD', 'AROUND THE COVE!'], x: 54, y: 120 },
  { id: 'eggs', world: 6, npc: 'RANGER RITA', col: '#5ab040', levels: [57, 60, 61], item: 'DINO EGG', text: ['3 DINO EGGS ROLLED AWAY', 'FROM THE NEST. PLEASE', 'BRING THEM HOME SAFE!'], x: 44, y: 120 },
  { id: 'bots', world: 7, npc: 'CMDR KAY', col: '#5ff0ff', levels: [64, 65, 66], item: 'HELPER BOT', text: ['3 OF MY LITTLE HELPER', 'BOTS WANDERED OFF ON', 'THE STATION. FIND THEM!'], x: 40, y: 124 },
];
function drawQuestItem(id, x, y, t) {
  const R = (X, Y, w, h, c) => hR(x + X, y + Y, w, h, c);
  if (id === 'socks') { R(3, 0, 6, 9, '#1a1020'); R(4, 1, 4, 8, '#ffffff'); R(4, 3, 4, 2, '#ff4060'); R(3, 8, 9, 5, '#1a1020'); R(4, 9, 7, 3, '#ffffff'); }
  else if (id === 'balloons') { R(2, 0, 9, 10, '#1a1020'); R(3, 1, 7, 8, '#ff60b0'); R(4, 2, 2, 2, '#ffd0e8'); R(6, 10, 1, 4, '#e0e0e0'); }
  else if (id === 'idols') { R(3, 0, 7, 13, '#1a1020'); R(4, 1, 5, 11, '#ffd040'); R(5, 3, 1, 1, '#7a4a10'); R(7, 3, 1, 1, '#7a4a10'); R(3, 12, 7, 2, '#a07010'); }
  else if (id === 'gems') { ctx.save(); ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 0.2); R(4, 0, 5, 13, '#1a1020'); R(5, 1, 3, 11, '#80f0ff'); R(5, 2, 1, 5, '#ffffff'); ctx.restore(); }
  else if (id === 'coins') { R(1, 2, 11, 11, '#7a4a08'); R(2, 3, 9, 9, '#ffd040'); R(5, 5, 3, 5, '#c09010'); }
  else if (id === 'eggs') { R(2, 1, 9, 12, '#1a1020'); R(3, 2, 7, 10, '#f0e8c8'); R(4, 4, 2, 2, '#5ab040'); R(7, 8, 2, 2, '#5ab040'); }
  else { R(2, 3, 9, 8, '#1a1020'); R(3, 4, 7, 6, '#c0c8d8'); R(4, 5, 2, 2, '#5ff0ff'); R(7, 5, 2, 2, '#5ff0ff'); R(6, 0, 1, 3, '#c0c8d8'); R(5, 0, 3, 1, '#ff3040'); R(3, 11, 2, 2, '#1a1020'); R(8, 11, 2, 2, '#1a1020'); }
}
function drawNpcNode(n, t) {
  const q = ISLAND_QUESTS.find((k) => k.id === n.quest), b = (t >> 4) & 1;
  hR(n.x - 4, n.y - 12 + b, 8, 7, '#1a1020'); hR(n.x - 3, n.y - 11 + b, 6, 5, '#f2b48a'); hR(n.x - 5, n.y - 6 + b, 10, 8, '#1a1020'); hR(n.x - 4, n.y - 5 + b, 8, 6, q ? q.col : '#fff');
  const st = game && game.iq && game.iq[n.quest];
  if (!st || st.state !== 'done') txt(st && st.state === 'active' ? '?' : '!', n.x - 2, n.y - 24 + b, '#ffe040', { outline: '#1a1020' });
}
for (const q of ISLAND_QUESTS) { const N = [null, NODES2, NODES3, NODES4, NODES5, NODES6, NODES7][q.world]; if (!N) continue; const after = N.find((k) => k.li !== undefined).li; N.push({ x: q.x, y: q.y, kind: 'npc', quest: q.id, name: q.npc, side: true, after }); const E = [null, EDGES2, EDGES3, EDGES4, EDGES5, EDGES6, EDGES7][q.world]; E.push([0, N.length - 1]); }

// ---------------- more pets ----------------
(() => {
  const F = Sprites.fromRows;
  const add = (k, name, rows, pal, fly) => { const img = F(rows, pal); PETS[k] = { name, rows, pal, fly, img: [img, Sprites.flip(img)] }; };
  add('parrot', 'PARROT', ['...KKK......', '..KrrrK.....', '.KrwKrrK....', '.KrrrrrKK...', '..KrryyyyK..', '...KryybbK..', '....KKbbbK..', '......KbbK..', '.......KK...'], { K: '#1a1020', r: '#e83040', w: '#ffffff', y: '#ffd040', b: '#3070e0' }, true);
  add('babyrex', 'BABY REX', ['.......KKKK.', '......KggggK', '......KgKggK', '..K...KgggggK', '.KgK.KgggKKK.', 'KgggKggggK...', '.KggggggggK..', '..KggKKggK...', '..KK...KK....'], { K: '#1a1020', g: '#5ab040' }, false);
  add('miniufo', 'MINI UFO', ['....KKKK....', '...KccccK...', '..KKKKKKKK..', '.KssssssssK.', 'KsRsRsRsRssK', '.KKKKKKKKKK.'], { K: '#1a1020', c: '#80e0ff', s: '#b0b8c8', R: '#ff3040' }, true);
  add('boo', 'BOO', ['...KKKKK....', '..KwwwwwK...', '.KwKwwKwwK..', '.KwwwwwwwK..', '.KwwKKwwwK..', '.KwwwwwwwK..', '.KwKwKwKwK..', '..K.K.K.K...'], { K: '#1a1020', w: '#e8f0ff' }, true);
})();
const PET_SHOP = [['wally', 'PUP', 0, null], ['goth', 'BAT', 20, null], ['doug', 'CAT', 20, null], ['robo', 'DRONE', 30, () => Ach.has('robohero')], ['frost', 'PENGUIN', 30, () => Ach.has('starisle')],
  ['boo', 'BOO', 40, () => game.cleared[8]], ['miniufo', 'MINI UFO', 40, () => game.cleared[14]], ['parrot', 'PARROT', 50, () => game.cleared[55]], ['babyrex', 'BABY REX', 50, () => game.cleared[62]]];

// ---------------- outfits for every hero ----------------
const OUTFITS = [['neon', 'NEON NIGHTS', 60], ['pirate', 'PIRATE', 80], ['knight', 'KNIGHT', 100], ['candy', 'CANDY POP', 60], ['galaxy', 'GALAXY', 150], ['glitch', 'GLITCH', -1]];
for (const [id, name, price] of OUTFITS) COSTUME_LIST.push({ id, name, hint: price < 0 ? 'FIND THE GLITCH WORLD' : 'BUY IT AT THE COSTUME SHOP', ok: () => !!(game && game.outfits && game.outfits.includes(id)) });
{ // Volt wears outfits too: his jacket and hair take the outfit's colours
  const _fr = Wally.frame, cache = new Map();
  Wally.frame = function (pose, capeF, signal, face, variant = 'n', costume = 'classic', hero = 'wally') {
    const base = _fr.call(Wally, pose, capeF, signal, face, variant, costume, hero);
    if (hero !== 'volt' || variant !== 'n' || !costume || costume === 'classic' || !Wally.COSTUMES[costume]) return base;
    const key = pose + face + costume; let c = cache.get(key); if (c) return c;
    const C = Wally.COSTUMES[costume], hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const map = [[hex('#ffd040'), hex(C.org || '#ffd040')], [hex('#2a6aff'), hex(C.blue || '#2a6aff')], [hex('#5aa0ff'), hex(C.blueL || '#5aa0ff')]];
    c = Sprites.canvas(Wally.W, Wally.H); const x = c.getContext('2d'); x.drawImage(base, 0, 0); const d = x.getImageData(0, 0, Wally.W, Wally.H);
    for (let i = 0; i < d.data.length; i += 4) for (const [a, b] of map) if (d.data[i] === a[0] && d.data[i + 1] === a[1] && d.data[i + 2] === a[2]) { d.data[i] = b[0]; d.data[i + 1] = b[1]; d.data[i + 2] = b[2]; }
    x.putImageData(d, 0, 0); cache.set(key, c); return c;
  };
}

// ---------------- speedrun timer ----------------
const SPLITS = [[7, 'WALLY ISLAND'], [14, 'STAR ISLE'], [20, 'CARNIVAL ISLE'], [27, 'LOST LANDS'], [44, 'CRYSTAL ISLE'], [55, 'PIRATE COVE'], [62, 'DINO VALLEY'], [69, 'ORBIT ONE']];
const SPEED_CATS = [{ id: 'any', name: 'QUICK RUN: BEAT BARON STATIC', end: 7 }, { id: 'all', name: 'ALL ISLANDS: BEAT MEGA-BOT', end: 69 }];
{
  const _poll = Input.poll;
  Input.poll = function () {
    _poll.call(Input);
    const r = game && game.speedrun; if (!r || r.done) return;
    if (!(scene && scene.paused)) r.t++;
    const next = SPLITS[r.splits.length];
    if (next && game.cleared[next[0]]) { r.splits.push(r.t); r.flash = 180; Audio8.sfx('check'); }
    const cat = SPEED_CATS.find((c) => c.id === r.cat);
    if (game.cleared[cat.end]) { r.done = true; Ach.unlock('speedrun'); const pb = lsJ('wallyman-speedrun', {}); r.pb = !pb[r.cat] || r.t < pb[r.cat].t; if (r.pb) { pb[r.cat] = { t: r.t, splits: r.splits.slice(), hero: heroOf() }; lsS('wallyman-speedrun', pb); } go(() => SpeedrunResult()); }
  };
  const _dt = Ach.drawToast;
  Ach.drawToast = function () {
    _dt.call(Ach);
    const r = game && game.speedrun; if (!r || r.done) return;
    hR(96, 212, 64, 11, 'rgba(0,0,0,0.6)'); txt(fmtTime(r.t), 128, 214, '#5ff0ff', { align: 'center' });
    if (r.flash > 0) { r.flash--; const i = r.splits.length - 1, pb = (lsJ('wallyman-speedrun', {})[r.cat] || {}).splits, d = pb && pb[i] !== undefined ? r.splits[i] - pb[i] : null; drawWindow(64, 186, 128, 24); txt(SPLITS[i][1] + ' SPLIT', 128, 190, '#ffe040', { align: 'center' }); txt(fmtTime(r.splits[i]) + (d === null ? '' : (d <= 0 ? '  -' : '  +') + fmtTime(Math.abs(d))), 128, 200, d !== null && d <= 0 ? '#5ae060' : d === null ? '#fff' : '#ff8080', { align: 'center' }); }
  };
}

// ---------------- achievement titles ----------------
const TITLES = [['ROOKIE', null, '#ffffff'], ['WALLY FAN', 'first', '#5ff0ff'], ['BOSS BUSTER', 'boss', '#ff8080'], ['STAR HUNTER', 'three', '#ffe040'], ['SPEED DEMON', 'speed', '#ff9020'],
  ['PUZZLE MASTER', 'puzzles', '#c070ff'], ['PIRATE KING', 'pirate', '#e83040'], ['DINO TAMER', 'trex', '#5ab040'], ['SPACE HERO', 'megabot', '#80e0ff'], ['GOLDEN ACE', 'golden', '#ffd040'],
  ['GLITCH WIZARD', 'glitchworld', '#30d0c0'], ['PARTY ANIMAL', 'party', '#ff60b0'], ['KART CHAMP', 'kartgp', '#ffe040'], ['100% HERO', 'hundred', '#ffffff']];
const titleOk = (i) => !TITLES[i][1] || Ach.has(TITLES[i][1]);
const titleOf = (g) => TITLES[(g && g.titleIdx) | 0] || TITLES[0];
{ // remember the title next to each new high score
  const _add = Scores.add;
  Scores.add = function (name, score, level, done) { const id = _add.call(Scores, name, score, level, done); const m = lsJ('wallyman-score-titles', {}); m[id] = (game && game.titleIdx) | 0; lsS('wallyman-score-titles', m); return id; };
  const _dst = drawScoreTable;
  drawScoreTable = function (x, y, w, rows, hl) { // eslint-disable-line no-func-assign
    _dst(x, y, w, rows, hl);
    const list = Scores.list(), m = lsJ('wallyman-score-titles', {});
    for (let i = 0; i < rows; i++) { const e = list[i]; if (!e || !m[e.id]) continue; const T = TITLES[m[e.id]]; if (!T) continue; const yy = y + 18 + i * 11; hR(x + 19, yy + 1, 5, 5, '#1a1020'); hR(x + 20, yy + 2, 3, 3, T[2]); }
  };
}
