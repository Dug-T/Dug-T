'use strict';
// =====================================================================
// Batch K (part 2): the Orbit One map, quest givers, save-code help,
// the pet and costume shops, the Kart Grand Prix, friend ghost races,
// speedrun mode, island fishing and the fish log, the living world
// map, the help book and titles.
// =====================================================================

// ---------------- Orbit One on the world map ----------------
NODES7.push({ x: 236, y: 186, kind: 'portal', to: 7, name: 'ROCKET TO ORBIT ONE' }); EDGES7.push([4, NODES7.length - 1]);
const NODES8 = [
  { x: 26, y: 178, kind: 'portal', to: 6, name: 'ROCKET TO DINO VALLEY' },
  { x: 66, y: 150, kind: 'level', li: 64 }, { x: 110, y: 172, kind: 'level', li: 65 }, { x: 154, y: 150, kind: 'level', li: 66 }, { x: 200, y: 168, kind: 'level', li: 67 }, { x: 214, y: 118, kind: 'level', li: 68 }, { x: 150, y: 86, kind: 'castle', li: 69 },
];
const EDGES8 = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]];
{ const q = ISLAND_QUESTS.find((k) => k.world === 7); NODES8.push({ x: q.x, y: q.y, kind: 'npc', quest: q.id, name: q.npc, side: true, after: 64 }); EDGES8.push([0, NODES8.length - 1]); }
const Island8 = makeIsland(NODES8, [[90, 160, 24], [132, 160, 24], [178, 156, 24], [210, 140, 22], [184, 104, 24], [116, 112, 20]], 233, (f, near, ch) => {
  if (f > 1.9) return near(6, 30) ? (ch ? [120, 128, 150] : [140, 148, 170]) : ch ? [170, 176, 196] : [190, 196, 214];
  if (f > 1.45) return [90, 96, 120];
  if (f > 1.25) return [60, 70, 130];
  return null;
});
WORLDS.push({ nodes: () => NODES8, edges: () => EDGES8, isle: () => Island8, name: 'ORBIT ONE', sea: ['#05051a', '#1a1a40'], key: 'node8' });

// ---------------- quest givers ----------------
function QuestNpcScene(nd) {
  const q = ISLAND_QUESTS.find((k) => k.id === nd.quest); let t = 0;
  game.iq = game.iq || {}; const st = game.iq[q.id] || (game.iq[q.id] = { state: 'new', got: 0 });
  const n = () => q.levels.filter((_, i) => st.got & (1 << i)).length;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (t < 20) return;
      if (Input.pressed('back') || Input.pressed('run')) { go(() => MapScene()); return; }
      if (!Input.confirm()) return;
      if (st.state === 'new') { st.state = 'active'; Save.persist(); Audio8.sfx('confirm'); go(() => MapScene()); }
      else if (st.state === 'active' && n() >= 3) { st.state = 'done'; game.coins += 40; while (game.coins >= 100) { game.coins -= 100; game.lives++; } game.lives++; Ach.unlock('islandquest'); Save.persist(); Audio8.sfx('oneup'); t = 0; }
      else go(() => MapScene());
    },
    draw() {
      drawParallax(['grass', 'moon', 'carnival', 'jungle', 'crystal', 'beach', 'jungle', 'moon'][q.world], t * 0.3); drawWindow(16, 40, 224, 140);
      hR(30, 56, 40, 48, '#1a1020'); hR(31, 57, 38, 46, '#3a5a8a'); hR(42, 64, 16, 14, '#1a1020'); hR(43, 65, 14, 12, '#f2b48a'); hR(46, 69, 2, 2, '#1a1020'); hR(52, 69, 2, 2, '#1a1020'); hR(38, 80, 24, 20, '#1a1020'); hR(39, 81, 22, 19, q.col);
      txt(q.npc, 80, 56, q.col);
      const lines = st.state === 'done' ? ['THANK YOU SO MUCH!', 'YOU ARE A TRUE HERO.'] : st.state === 'active' ? (n() >= 3 ? ['YOU FOUND THEM ALL!', 'HERE IS YOUR REWARD:', '40 COINS AND A 1-UP!'] : [`FOUND ${n()} OF 3 SO FAR.`, 'LOOK IN THESE LEVELS:', q.levels.map((li) => levelTag(li)).join('  ')]) : q.text.concat(['', 'A: I WILL HELP!']);
      lines.forEach((l, i) => txt(l, 80, 70 + i * 11, '#fff'));
      if (st.state !== 'done') { drawQuestItem(q.id, 210, 56, t); }
      txt(st.state === 'new' ? 'A: ACCEPT   B: LATER' : 'A / B: BACK TO THE MAP', 128, 166, '#a8b0d8', { align: 'center' });
    },
  };
}

// ---------------- save codes (for browsers that forget) ----------------
function SaveCodeQuit() {
  let t = 0, dom = false, shown = false;
  return {
    enter() { Audio8.play('menu'); },
    update() { t++; if (dom) return; if (!shown && t > 20) { shown = true; dom = true; codeBox('THIS BROWSER MAY FORGET YOUR GAME. COPY THIS SAVE CODE!', SaveCode.encode(game), null, () => { dom = false; }); return; } if (shown && !dom) go(() => TitleScene()); },
    draw() { drawParallax('sky', t * 0.3); drawWindow(30, 80, 196, 50); txt('SAVING YOUR PROGRESS...', 128, 92, '#ffe040', { align: 'center' }); txt('PASTE IT INTO IMPORT SAVE LATER', 128, 106, '#fff', { align: 'center' }); },
  };
}
function SaveCodesScene() {
  let sel = 0, t = 0, dom = false;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++; if (dom) return;
      if (Input.pressed('back') || Input.pressed('run')) { go(() => TitleScene()); return; }
      if (Input.pressed('down')) sel = (sel + 1) % 4; if (Input.pressed('up')) sel = (sel + 3) % 4;
      if (Input.confirm()) { if (sel === 3) { go(() => ImportSaveScene()); return; } const s = Save.slots[sel]; if (!s) { Audio8.sfx('bump'); return; } dom = true; codeBox(`SAVE CODE FOR FILE ${'ABC'[sel]} - KEEP IT SAFE`, SaveCode.encode(s), null, () => { dom = false; }); }
    },
    draw() {
      drawParallax('sky', t * 0.3); drawWindow(20, 30, 216, 160); txt('SAVE CODES', 128, 38, '#ffe040', { align: 'center', scale: 2 });
      ['THIS BROWSER MAY NOT KEEP SAVES.', 'COPY A CODE, THEN USE IMPORT', 'SAVE NEXT TIME TO CARRY ON.'].forEach((l, i) => txt(l, 128, 60 + i * 10, '#fff', { align: 'center' }));
      ['FILE A', 'FILE B', 'FILE C', 'IMPORT A SAVE CODE'].forEach((l, i) => { const y = 100 + i * 14, on = i === sel; txt(i < 3 && !Save.slots[i] ? l + ' (EMPTY)' : l, 60, y, on ? '#ffe040' : '#fff'); if (on) txt('>', 50 + ((t >> 3) & 1), y, '#ffe040'); });
      txt('A: SHOW CODE   B: BACK', 128, 172, '#a8b0d8', { align: 'center' });
    },
  };
}
{ // the title screen: a warning when saves may not stick, S for save codes, and each file's title
  const _T = TitleScene;
  TitleScene = function (...a) { // eslint-disable-line no-func-assign
    const s = _T(...a), u = s.update, d = s.draw;
    s.update = function () { if (StorageCheck.risky() && Input.pressed('special')) { Audio8.sfx('confirm'); go(() => SaveCodesScene()); return; } return u.call(this); };
    s.draw = function () {
      d.call(this);
      if (StorageCheck.risky() && (frame >> 5) % 3) { hR(0, 0, VW, 11, 'rgba(120,10,30,0.85)'); txt('THIS BROWSER MAY NOT KEEP SAVES - S: SAVE CODES', 128, 2, '#fff', { align: 'center' }); }
    };
    return s;
  };
}

// ---------------- Dino's House: pet shop, costume shop ----------------
function PetShopScene() {
  let sel = 0, t = 0, msg = ''; game.pets = game.pets || ['wally', heroOf()];
  return {
    enter() { Audio8.play('map'); },
    update() {
      t++;
      if (Input.pressed('back') || Input.pressed('run')) { go(() => HouseScene(5)); return; }
      if (Input.pressed('right')) { sel = (sel + 1) % PET_SHOP.length; Audio8.sfx('select'); } if (Input.pressed('left')) { sel = (sel + PET_SHOP.length - 1) % PET_SHOP.length; Audio8.sfx('select'); }
      if (Input.confirm()) {
        const [k, name, price, ok] = PET_SHOP[sel], own = game.pets.includes(k);
        if (own) { game.petKind = k; msg = name + ' IS YOUR PET NOW!'; Audio8.sfx('power'); }
        else if (ok && !ok()) { msg = 'NOT FOUND YET...'; Audio8.sfx('bump'); }
        else if (game.coins < price) { msg = 'NOT ENOUGH COINS!'; Audio8.sfx('bump'); }
        else { game.coins -= price; game.pets.push(k); game.petKind = k; msg = 'ADOPTED ' + name + '!'; Ach.unlock('petpal'); Audio8.sfx('oneup'); }
        Save.persist();
      }
    },
    draw() {
      ctx.fillStyle = '#f0e0b0'; ctx.fillRect(0, 0, VW, VH); drawWindow(8, 6, 240, 210); txt('PET SHOP', 128, 12, '#ffe040', { align: 'center' }); ctx.drawImage(Sprites.coinIcon, 196, 12); txt('*' + pad(game.coins, 2), 203, 12, '#fff');
      const [k, name, price, ok] = PET_SHOP[sel], pd = PETS[k], own = game.pets.includes(k), open = own || !ok || ok();
      hR(78, 30, 100, 80, '#5cb0f8'); hR(78, 96, 100, 14, '#5ad84a'); ctx.save(); ctx.translate(108, 50); ctx.scale(3, 3); if (!open) ctx.filter = 'brightness(0)'; ctx.drawImage(pd.img[0], 0, (t >> 4) & 1); ctx.restore(); ctx.filter = 'none';
      txt(open ? name : '???', 128, 118, '#ffe040', { align: 'center' });
      txt(own ? ((game.petKind || heroOf()) === k ? 'YOUR PET' : 'A: CHOOSE') : open ? `ADOPT FOR ${price} COINS` : 'KEEP EXPLORING TO FIND IT', 128, 132, '#fff', { align: 'center' });
      txt(`LEVEL ${petLevel(k)}  (TRICKS LEVEL UP PER PET)`, 128, 146, '#a8b0d8', { align: 'center' });
      for (let i = 0; i < PET_SHOP.length; i++) { const x = 30 + i * 22; hR(x, 162, 18, 18, i === sel ? '#ffe040' : '#4a3a5a'); hR(x + 1, 163, 16, 16, '#efe0f8'); const p2 = PETS[PET_SHOP[i][0]]; ctx.save(); if (!(game.pets.includes(PET_SHOP[i][0]) || !PET_SHOP[i][3] || PET_SHOP[i][3]())) ctx.filter = 'brightness(0)'; ctx.drawImage(p2.img[0], x + 3, 166, 12, 10); ctx.restore(); ctx.filter = 'none'; }
      txt(msg || '< >: BROWSE  A: ADOPT  B: BACK', 128, 192, msg ? '#5ae060' : '#a8b0d8', { align: 'center' });
    },
  };
}
function CostumeShopScene() {
  let sel = 0, t = 0, msg = ''; const L = OUTFITS.filter((o) => o[2] > 0); game.outfits = game.outfits || [];
  return {
    enter() { Audio8.play('carnival'); },
    update() {
      t++;
      if (Input.pressed('back') || Input.pressed('run')) { go(() => HouseScene(6)); return; }
      if (Input.pressed('right')) { sel = (sel + 1) % L.length; Audio8.sfx('select'); } if (Input.pressed('left')) { sel = (sel + L.length - 1) % L.length; Audio8.sfx('select'); }
      if (Input.confirm()) { const [id, name, price] = L[sel]; if (game.outfits.includes(id)) { game.costume = id; msg = 'WEARING ' + name + '!'; Audio8.sfx('power'); } else if (game.coins < price) { msg = 'NOT ENOUGH COINS!'; Audio8.sfx('bump'); } else { game.coins -= price; game.outfits.push(id); game.costume = id; Ach.unlock('fashion2'); msg = 'BOUGHT ' + name + '!'; Audio8.sfx('oneup'); } Save.persist(); }
    },
    draw() {
      drawParallax('carnival', t * 0.3); drawWindow(8, 6, 240, 210); txt('COSTUME SHOP', 128, 12, '#ffe040', { align: 'center' }); ctx.drawImage(Sprites.coinIcon, 196, 12); txt('*' + pad(game.coins, 2), 203, 12, '#fff');
      const [id, name, price] = L[sel], own = game.outfits.includes(id);
      ['wally', 'goth', 'doug', 'volt'].forEach((h, i) => { hR(22 + i * 54, 32, 50, 84, '#5cb0f8'); Wally.draw(ctx, 47 + i * 54, 110, 'idle' + ((t >> 4) % 4), 1, { t, hero: h, costume: id, sx: 2, sy: 2, hat: 'none' }); });
      txt(name, 128, 124, '#ffe040', { align: 'center', scale: 2 });
      txt(own ? (game.costume === id ? 'YOU ARE WEARING IT' : 'A: WEAR IT') : `${price} COINS - A: BUY`, 128, 146, '#fff', { align: 'center' });
      txt('EVERY HERO GETS THE NEW LOOK!', 128, 160, '#a8b0d8', { align: 'center' });
      txt(msg || '< >: BROWSE   B: BACK', 128, 192, msg ? '#5ae060' : '#a8b0d8', { align: 'center' });
    },
  };
}
function HouseScene(start = 0) { // eslint-disable-line no-func-assign
  const items = () => ["DINO'S SHOP", 'UPGRADE TREE', 'MINI-GAMES', 'GARDEN', 'PETS', 'PET SHOP', 'COSTUME SHOP', 'FILE STATS', 'SAVE CODE', 'CLOUD SAVE'].concat(game.cleared[7] ? ['NEW GAME+'] : []).concat(['LEAVE']);
  let sel = start, t = 0, dom = false;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++; if (dom) return; const it = items();
      if (Input.pressed('down')) { sel = (sel + 1) % it.length; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + it.length - 1) % it.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || (Input.confirm() && it[sel] === 'LEAVE')) { go(() => MapScene()); return; }
      if (Input.confirm() && it[sel] === 'SAVE CODE') { Save.persist(); dom = true; codeBox('YOUR SAVE CODE - KEEP IT SAFE!', SaveCode.encode(game), null, () => { dom = false; }); return; }
      if (Input.confirm()) { Audio8.sfx('confirm'); go({ "DINO'S SHOP": () => ShopScene(), 'UPGRADE TREE': () => UpgradeScene(), 'MINI-GAMES': () => MiniGamesScene(), GARDEN: () => GardenScene(), PETS: () => PetScene(), 'PET SHOP': () => PetShopScene(), 'COSTUME SHOP': () => CostumeShopScene(), 'FILE STATS': () => StatsScene(), 'CLOUD SAVE': () => CloudScene(), 'NEW GAME+': () => PlusScene() }[it[sel]]); }
    },
    draw() {
      ctx.fillStyle = '#f0c890'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e0b478'; for (let x = 0; x < VW; x += 20) ctx.fillRect(x, 0, 2, 140);
      ctx.fillStyle = '#8a5a2a'; ctx.fillRect(0, 140, VW, 84); ctx.fillStyle = '#a06a34'; for (let x = 0; x < VW; x += 32) ctx.fillRect(x, 140, 30, 84);
      ctx.fillStyle = '#5ab0f0'; ctx.fillRect(170, 22, 60, 44); ctx.fillStyle = '#fff'; ctx.fillRect(170, 43, 60, 2); ctx.fillRect(199, 22, 2, 44); ctx.fillStyle = '#6a3a1a'; ctx.fillRect(168, 20, 64, 2); ctx.fillRect(168, 66, 64, 2);
      ctx.drawImage(Sprites.dino.r[(t >> 4) & 1], 210, 176);
      const q = PETS[game.petKind || heroOf()] || PETS.wally; ctx.drawImage(q.img[0], 196, 188 + ((t >> 4) & 1));
      drawWally(180, 200, 'idle' + ((t >> 4) % 4), 1);
      drawWindow(8, 8, 150, 22); txt("DINO'S HOUSE", 83, 15, '#ffe040', { align: 'center' });
      ctx.drawImage(Sprites.coinIcon, 172, 76); txt('*' + pad(game.coins, 2), 179, 76, '#3a2010', { shadow: null });
      const it = items(); drawWindow(8, 34, 150, 12 + it.length * 10);
      it.forEach((s, i) => { const y = 40 + i * 10; txt(s, 26, y, i === sel ? '#ffe040' : '#fff'); if (i === sel) txt('>', 16 + ((t >> 3) & 1), y, '#ffe040'); });
    },
  };
}
{ // the Pets page follows the chosen pet
  const _PS = PetScene;
  PetScene = function () { const keep = game.hero, k = game.petKind; if (k) game.hero = k; const s = _PS(); if (k) game.hero = keep; const d = s.draw; s.draw = function () { const h = game.hero; if (k) game.hero = k; try { d.call(this); } finally { game.hero = h; } }; return s; }; // eslint-disable-line no-func-assign
}

// ---------------- Kart racing: tracks, items and the Grand Prix ----------------
const KART_TRACKS = [
  { name: 'WALLY RING', rx: 100, ry: 70, grass: ['#5ac858', '#4ab048'], road: '#7a7a8a', edge: '#e8e8f0', infield: '#f0d890', ramps: [0.05, Math.PI + 0.05, Math.PI * 1.5], boxes: [0.7, 2.3, 3.9, 5.4], grip: 1, offSlow: 0.95 },
  { name: 'DUNE OVAL', rx: 108, ry: 62, grass: ['#e8c078', '#d8a858'], road: '#a08060', edge: '#fff0c0', infield: '#c8905a', ramps: [Math.PI * 0.5 + 0.9, Math.PI * 1.5 + 0.2], boxes: [0.2, 1.8, 3.4, 4.9], grip: 0.95, offSlow: 0.7 },
  { name: 'FROST LOOP', rx: 96, ry: 74, grass: ['#e8f4ff', '#d0e4f8'], road: '#90a0c0', edge: '#ffffff', infield: '#b8d8f8', ramps: [0.8, Math.PI + 0.8], boxes: [0.3, 1.9, 3.5, 5.0], grip: 0.55, offSlow: 0.85 },
];
function KartMenu(start = 0) {
  let sel = start, t = 0, tr = 0;
  return {
    enter() { Audio8.play('charge'); },
    update() {
      t++;
      if (Input.pressed('back') || Input.pressed('run')) { go(() => MiniGamesScene(3)); return; }
      if (Input.pressed('down')) { sel = (sel + 1) % 3; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + 2) % 3; Audio8.sfx('select'); }
      if (sel === 0 && (Input.pressed('left') || Input.pressed('right'))) { tr = (tr + (Input.pressed('right') ? 1 : 2)) % 3; Audio8.sfx('select'); }
      if (Input.confirm()) { Audio8.sfx('confirm'); if (sel === 0) go(() => KartScene({ track: tr })); else if (sel === 1) go(() => KartScene({ track: 0, cup: { race: 0, pts: [0, 0, 0, 0] } })); else go(() => MiniGamesScene(3)); }
    },
    draw() {
      ctx.fillStyle = '#5ac858'; ctx.fillRect(0, 0, VW, VH); drawWindow(30, 30, 196, 150); txt('KART RACING', 128, 38, '#ffe040', { align: 'center', scale: 2 });
      [`QUICK RACE: < ${KART_TRACKS[tr].name} >`, 'GRAND PRIX (3 RACES)', 'BACK'].forEach((s, i) => { const y = 70 + i * 16, on = i === sel; txt(s, 50, y, on ? '#ffe040' : '#fff'); if (on) txt('>', 40 + ((t >> 3) & 1), y, '#ffe040'); });
      ['A: GO   B: BRAKE   < >: STEER', 'S: ITEM (BOOST/BANANA/SHIELD)', 'RAMPS JUMP, ? BOXES GIVE ITEMS'].forEach((l, i) => txt(l, 128, 130 + i * 11, '#a8b0d8', { align: 'center' }));
      const best = lsJ('wallyman-kartgp', 0); if (best) txt(`GRAND PRIX WINS: ${best}`, 128, 168, '#5ff0ff', { align: 'center' });
    },
  };
}
function KartScene(opts) { // eslint-disable-line no-func-assign
  if (!opts) return KartMenu();
  const TR = KART_TRACKS[opts.track || 0], CX = 128, CY = 118, RX = TR.rx, RY = TR.ry, LAPS = 3, HALF = 16, TH0 = Math.PI / 2 + 0.08;
  const thOf = (x, y) => Math.atan2((y - CY) / RY, (x - CX) / RX);
  const pt = (th, lane = 0) => [CX + Math.cos(th) * (RX + lane), CY + Math.sin(th) * (RY + lane)];
  const dirAt = (th) => Math.atan2(RY * Math.cos(th), -RX * Math.sin(th));
  const angD = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
  const mk = (i, col, name, ai, maxV, mean) => { const th = TH0 + i * 0.13, lane = i % 2 ? 9 : -9, [x, y] = pt(th, lane); return { i, x, y, z: 0, vz: 0, h: dirAt(th), v: 0, hp: 100, dead: 0, inv: 0, prog: 0, last: thOf(x, y), col, name, ai, maxV, mean, lane, kx: 0, ky: 0, rampCool: 0, myHit: 0, done: false, item: null, boostT: 0, spin: 0, shield: false, useT: 0, boxCool: 0, meanCool: 0 }; };
  const me = mk(0, '#ff5040', HEROES[heroOf()].short || 'YOU', false, 2.3, false);
  const karts = [me, mk(1, '#40a0ff', 'DINO', true, 2.12, false), mk(2, '#5ae060', 'GRUMB', true, 2.06, false), mk(3, '#ffd040', 'BARON', true, 2.02, true)];
  const parts = [], bananas = [], boxes = TR.boxes.map((a) => ({ a, t: 0 }));
  let t = 0, count = 180, done = false, place = 0, award = 0;
  const off = (k) => { const th = thOf(k.x, k.y), [ex, ey] = pt(th); return Math.hypot(k.x - ex, k.y - ey) > HALF; };
  const boom = (k) => { k.dead = 150; k.hp = 0; k.v = 0; k.z = 0; Audio8.sfx('boom'); if (k === me || k.myHit > 0) rumble(1, 400); for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2, s = 0.6 + (i % 4) * 0.5; parts.push({ x: k.x, y: k.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 30 + (i % 5) * 6, col: ['#ffe060', '#ff7020', '#ff3020', '#ffffff'][i % 4], s: 2 + (i % 2) }); } if (k.ai && k.myHit > 0) Ach.unlock('kartboom'); };
  const hurt = (k, n) => { if (k.dead || k.inv > 0) return; if (k.shield) { k.shield = false; k.inv = 30; Audio8.sfx('pop' in Audio8 ? 'pop' : 'bump'); return; } k.hp = Math.max(0, k.hp - n); if (k.hp <= 0) boom(k); };
  const useItem = (k) => {
    if (!k.item) return; const it = k.item; k.item = null;
    if (it === 'boost') { k.boostT = 90; if (k === me) Audio8.sfx('power'); }
    if (it === 'banana') { bananas.push({ x: k.x - Math.cos(k.h) * 12, y: k.y - Math.sin(k.h) * 12, t: 0, owner: k.i }); if (k === me) Audio8.sfx('select'); }
    if (it === 'shield') { k.shield = true; if (k === me) Audio8.sfx('check'); }
  };
  const finishCup = () => { const c = opts.cup; c.pts = c.pts.map((p, i) => p + [10, 6, 3, 1][c.order.indexOf(i)]); };
  return {
    enter() { Audio8.play('charge'); },
    update() {
      t++;
      for (const q of parts) { q.life--; q.x += q.vx; q.y += q.vy; if (q.g) q.vy += q.g; } for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
      if (Input.pressed('back')) { go(() => KartMenu()); return; }
      if (done) { if (Input.confirm() && t > 60) { if (opts.cup) go(() => CupStandings(opts)); else go(() => KartMenu()); } return; }
      if (count > 0) { count--; if (count % 60 === 0) Audio8.sfx(count ? 'tick' : 'confirm'); return; }
      for (const b of boxes) if (b.t > 0) b.t--;
      for (const k of karts) {
        if (k.inv > 0) k.inv--; if (k.myHit > 0) k.myHit--; if (k.rampCool > 0) k.rampCool--; if (k.boostT > 0) k.boostT--; if (k.boxCool > 0) k.boxCool--;
        if (k.dead > 0) { if (--k.dead === 0) { const th = thOf(k.x, k.y), [x, y] = pt(th, k.lane * 0.5); k.x = x; k.y = y; k.h = dirAt(th); k.hp = 100; k.inv = 90; k.v = 0; } else { if (k.dead % 6 === 0) parts.push({ x: k.x + (k.dead % 5) - 2, y: k.y - 4, vx: 0.1, vy: -0.5, life: 30, col: 'rgba(60,60,70,0.7)', s: 3 }); continue; } }
        const air = k.z > 0, offTrack = !air && off(k), maxV = (offTrack ? TR.offSlow : k.boostT ? 3.4 : k.maxV) * (k.ai ? (k.prog > me.prog + 1.2 ? 0.94 : k.prog < me.prog - 1.2 ? 1.07 : 1) : 1);
        if (k.spin > 0) { k.spin--; k.h += 0.35; k.v *= 0.92; }
        else if (!air && !k.done) {
          if (k.ai) {
            const th = thOf(k.x, k.y), wob = Math.sin(t * 0.013 + k.maxV * 50) * 6; let [tx, ty] = pt(th + 0.34, k.lane + wob); const dme = Math.hypot(me.x - k.x, me.y - k.y);
            if (k.meanCool > 0) k.meanCool--; else if (k.mean && !me.dead && me.z === 0 && dme < 46 && dme > 6) { tx = me.x; ty = me.y; }
            const d = angD(Math.atan2(ty - k.y, tx - k.x), k.h); k.h += clamp(d, -0.07, 0.07) * TR.grip; k.v = Math.min(maxV, k.v + 0.045); if (k.v > maxV) k.v -= 0.06;
            if (k.item && ++k.useT > 90 + k.i * 37) { k.useT = 0; useItem(k); }
          } else {
            const steer = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0); k.h += steer * 0.055 * (0.4 + Math.min(1, k.v / 2)) * (TR.grip < 1 ? 0.75 + TR.grip * 0.25 : 1);
            if (Input.down('jump')) k.v = Math.min(maxV, k.v + 0.05); else k.v = Math.max(0, k.v - 0.03);
            if (Input.down('run')) k.v = Math.max(0, k.v - 0.08); if (k.v > maxV) k.v -= 0.08;
            if (Input.pressed('special')) useItem(k);
          }
          const th = thOf(k.x, k.y);
          if (!k.rampCool && k.v > 1.1 && !offTrack) for (const a of TR.ramps) if (Math.abs(angD(th, a)) < 0.045) { k.vz = 0.8 + k.v * 0.18; k.z = 0.1; k.rampCool = 40; if (k === me || Math.hypot(k.x - me.x, k.y - me.y) < 90) Audio8.sfx('spring'); }
          if (!k.item && !k.boxCool) for (const b of boxes) if (!b.t && Math.abs(angD(th, b.a)) < 0.04 && !offTrack) { b.t = 120; k.boxCool = 30; k.item = ['boost', 'banana', 'shield'][Math.floor(Math.random() * 3)]; if (k === me) Audio8.sfx('coin'); }
        } else if (k.done) k.v = Math.max(0, k.v - 0.03);
        if (air) { k.z += k.vz; k.vz -= 0.07; if (k.z <= 0) { k.z = 0; k.vz = 0; for (let i = 0; i < 4; i++) parts.push({ x: k.x + (i - 1.5) * 4, y: k.y + 3, vx: (i - 1.5) * 0.3, vy: -0.3, life: 14, col: '#d0d0d0', s: 2 }); if (k === me) Audio8.sfx('bump'); for (const o of karts) if (o !== k && !o.dead && o.z === 0 && Math.hypot(o.x - k.x, o.y - k.y) < 11) { hurt(o, 34); hurt(k, 12); if (k === me) o.myHit = 120; Audio8.sfx('stomp'); } } }
        // ice slides a little sideways
        const slide = TR.grip < 1 ? (1 - TR.grip) * 0.6 : 0, mvh = k.h - slide * Math.sin(t * 0.05 + k.i) * 0.3;
        k.x += Math.cos(mvh) * k.v + k.kx; k.y += Math.sin(mvh) * k.v + k.ky; k.kx *= 0.85; k.ky *= 0.85;
        k.x = clamp(k.x, 6, VW - 6); k.y = clamp(k.y, 30, VH - 6);
        const nth = thOf(k.x, k.y); k.prog += angD(nth, k.last); k.last = nth;
        if (k.boostT && t % 2 === 0) parts.push({ x: k.x - Math.cos(k.h) * 7, y: k.y - Math.sin(k.h) * 7, vx: 0, vy: 0, life: 10, col: '#ffe060', s: 2 });
        if (k.hp < 50 && t % (k.hp < 25 ? 3 : 7) === 0) parts.push({ x: k.x, y: k.y - 2 - k.z, vx: 0.1, vy: -0.45, life: 26, col: k.hp < 25 && (t & 4) ? '#ff7020' : 'rgba(80,80,90,0.75)', s: 2 });
        if (k.prog >= LAPS * Math.PI * 2 && !k.done) k.done = true;
        for (let bi = bananas.length - 1; bi >= 0; bi--) { const b = bananas[bi]; if (k.z === 0 && !k.dead && Math.hypot(b.x - k.x, b.y - k.y) < 7 && (b.owner !== k.i || b.t > 40)) { bananas.splice(bi, 1); if (k.shield) { k.shield = false; } else { k.spin = 40; if (k === me) { Audio8.sfx('hurt'); rumble(0.5, 200); } } } }
      }
      for (const b of bananas) b.t++;
      for (let i = 0; i < karts.length; i++) for (let j = i + 1; j < karts.length; j++) {
        const a = karts[i], b = karts[j]; if (a.dead || b.dead || Math.abs(a.z - b.z) > 6) continue;
        const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy); if (dist >= 11 || dist === 0) continue;
        const nx = dx / dist, ny = dy / dist, push = (11 - dist) / 2; a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
        const va = Math.cos(a.h) * a.v * nx + Math.sin(a.h) * a.v * ny, vb = Math.cos(b.h) * b.v * nx + Math.sin(b.h) * b.v * ny, rel = va - vb;
        if (rel <= 0.15) continue;
        const dmg = 4 + rel * 15; hurt(a, va > vb ? dmg * 0.5 : dmg); hurt(b, vb > va ? dmg * 0.5 : dmg);
        a.kx -= nx * rel * 1.2; a.ky -= ny * rel * 1.2; b.kx += nx * rel * 1.2; b.ky += ny * rel * 1.2; a.v *= 0.7; b.v *= 0.7;
        if (a === me) { b.myHit = 120; b.meanCool = 200; } if (b === me) { a.myHit = 120; a.meanCool = 200; }
        for (let s = 0; s < 6; s++) parts.push({ x: a.x + dx / 2, y: a.y + dy / 2, vx: Math.cos(s) * 1.5, vy: Math.sin(s) * 1.5 - 0.5, life: 12, col: '#ffe060', s: 1 });
        if (a === me || b === me) { Audio8.sfx('kick'); rumble(Math.min(1, 0.3 + rel * 0.3), 120); }
      }
      me.lap = Math.min(LAPS, Math.floor(Math.max(0, me.prog) / (Math.PI * 2)) + 1);
      me.rank = 1 + karts.filter((k) => k.ai && k.prog > me.prog).length;
      const leadProg = Math.max(...karts.filter((k) => k.ai).map((k) => k.prog));
      if (me.done || karts.filter((k) => k.ai && k.done).length === 3 || leadProg > LAPS * Math.PI * 2 + Math.PI * 1.5) {
        done = true; t = 0; place = me.done ? 1 + karts.filter((k) => k.ai && k.prog > me.prog).length : 4;
        if (opts.cup) { opts.cup.order = karts.slice().sort((a, b) => b.prog - a.prog).map((k) => k.i); if (!me.done) { opts.cup.order = opts.cup.order.filter((i) => i !== 0).concat([0]); } finishCup(); }
        award = opts.cup ? 0 : [0, 20, 10, 5, 2][place];
        game.coins += award; while (game.coins >= 100) { game.coins -= 100; game.lives++; } if (place === 1) Ach.unlock('kart'); Save.persist(); Audio8.play(place === 1 ? 'victory' : 'clear');
      }
    },
    draw() {
      ctx.fillStyle = TR.grass[0]; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = TR.grass[1]; for (let y = 0; y < VH; y += 12) for (let x = (y % 24); x < VW; x += 24) ctx.fillRect(x, y, 2, 2);
      ctx.lineWidth = 34; ctx.strokeStyle = TR.edge; ctx.beginPath(); ctx.ellipse(CX, CY, RX, RY, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 30; ctx.strokeStyle = TR.road; ctx.beginPath(); ctx.ellipse(CX, CY, RX, RY, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1; ctx.setLineDash([6, 6]); ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(CX, CY, RX, RY, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#ffffff'; for (let k = 0; k < 8; k++) ctx.fillRect(CX - 2 + (k % 2) * 2, CY + RY - 16 + k * 4, 2, 4);
      ctx.fillStyle = TR.infield; ctx.beginPath(); ctx.ellipse(CX, CY, RX - 30, RY - 30, 0, 0, Math.PI * 2); ctx.fill(); txt(TR.name, CX, CY - 4, '#ffffff', { align: 'center', outline: '#101848' });
      for (const a of TR.ramps) for (let s = -14; s <= 14; s += 2) { const [x0, y0] = pt(a - 0.04, s), [x1, y1] = pt(a + 0.04, s); ctx.strokeStyle = ((s + 14) >> 2) % 2 ? '#ffd040' : '#1a1020'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
      for (const b of boxes) if (!b.t) { const [bx, by] = pt(b.a, 0); hR(bx - 4, by - 4, 9, 9, '#1a1020'); hR(bx - 3, by - 3, 7, 7, (t >> 3) & 1 ? '#ffe040' : '#ff70c0'); txt('?', bx - 2, by - 3, '#1a1020'); }
      for (const b of bananas) { hR(b.x - 3, b.y - 2, 6, 4, '#1a1020'); hR(b.x - 2, b.y - 1, 4, 2, '#ffe040'); }
      const drawKart = (k) => {
        const lift = Math.round(k.z);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(k.x, k.y + 3, 7 - Math.min(3, lift / 6), 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(Math.round(k.x), Math.round(k.y) - lift); ctx.rotate(k.h); const sc = 1 + Math.min(0.3, k.z * 0.025); ctx.scale(sc, sc);
        if (k.dead) { ctx.fillStyle = '#2a2a2a'; ctx.fillRect(-7, -5, 14, 10); ctx.restore(); return; }
        if (k.inv > 0 && (t >> 2) & 1) ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#1a1020'; ctx.fillRect(-7, -5, 14, 10); ctx.fillStyle = k.col; ctx.fillRect(-6, -4, 12, 8); ctx.fillStyle = '#1a1020'; ctx.fillRect(-6, -6, 4, 2); ctx.fillRect(2, -6, 4, 2); ctx.fillRect(-6, 4, 4, 2); ctx.fillRect(2, 4, 4, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(2, -3, 3, 6); ctx.restore(); ctx.globalAlpha = 1;
        if (k.shield) { ctx.strokeStyle = 'rgba(120,220,255,0.8)'; ctx.beginPath(); ctx.arc(k.x, k.y - lift, 9, 0, Math.PI * 2); ctx.stroke(); }
        ctx.fillStyle = k === me ? '#f2b48a' : '#ffffff'; ctx.fillRect(Math.round(k.x) - 2, Math.round(k.y) - 3 - lift, 4, 4);
        if (k.hp < 100) { ctx.fillStyle = '#1a1020'; ctx.fillRect(Math.round(k.x) - 7, Math.round(k.y) - 11 - lift, 14, 3); ctx.fillStyle = k.hp > 50 ? '#5ae060' : k.hp > 25 ? '#ffd040' : '#ff3040'; ctx.fillRect(Math.round(k.x) - 6, Math.round(k.y) - 10 - lift, Math.round(12 * k.hp / 100), 1); }
      };
      karts.slice().sort((a, b) => a.y + a.z - (b.y + b.z)).forEach(drawKart);
      for (const q of parts) { ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x), Math.round(q.y), q.s, q.s); }
      drawWindow(4, 2, 248, 20); txt(`LAP ${me.lap || 1}/${LAPS}`, 10, 8, '#ffe040'); txt(`POS ${me.rank || 1}/4`, 246, 8, '#fff', { align: 'right' });
      txt('HP', 66, 8, '#fff'); hR(80, 8, 42, 7, '#1a1020'); hR(81, 9, Math.round(40 * me.hp / 100), 5, me.hp > 50 ? '#5ae060' : me.hp > 25 ? '#ffd040' : '#ff3040');
      txt('ITEM', 130, 8, '#a8b0d8'); txt(me.item ? me.item.toUpperCase() : '-', 158, 8, me.item ? '#5ff0ff' : '#7880b0');
      if (opts.cup) txt(`RACE ${opts.cup.race + 1}/3`, 128, 24, '#ffe040', { align: 'center', outline: '#101848' });
      if (me.dead) txt('KABOOM! RESPAWNING...', 128, 100, (t >> 3) & 1 ? '#ff6040' : '#ffe040', { align: 'center', outline: '#101848' });
      if (!done && count > -200) txt('A: GO  B: BRAKE  S: ITEM', 128, 212, '#fff', { align: 'center', outline: '#101848' });
      if (count > 0) txt(String(Math.ceil(count / 60)), 128, 100, '#ffe040', { scale: 3, align: 'center', outline: '#101848' });
      if (count <= 0 && count > -40) txt('GO!', 128, 100, '#5ae060', { scale: 3, align: 'center', outline: '#101848' });
      if (done) { drawWindow(48, 80, 160, 60); txt(['', '1ST PLACE!', '2ND PLACE', '3RD PLACE', '4TH PLACE'][place], 128, 90, place === 1 ? '#ffe040' : '#fff', { scale: 2, align: 'center' }); txt(opts.cup ? `+${[10, 6, 3, 1][place - 1]} CUP POINTS` : `+${award} COINS`, 128, 112, '#5ff0ff', { align: 'center' }); if ((t >> 4) & 1) txt('PRESS START', 128, 126, '#fff', { align: 'center' }); }
      if (count <= 0) count--;
    },
  };
}
function CupStandings(opts) {
  const c = opts.cup, last = c.race >= 2, names = [HEROES[heroOf()].short || 'YOU', 'DINO', 'GRUMB', 'BARON'], cols = ['#ff5040', '#40a0ff', '#5ae060', '#ffd040'];
  const rank = c.pts.map((p, i) => [p, i]).sort((a, b) => b[0] - a[0]); let t = 0;
  if (last) { const coins = [40, 20, 10, 0][rank.findIndex((r) => r[1] === 0)]; game.coins += coins; while (game.coins >= 100) { game.coins -= 100; game.lives++; } if (rank[0][1] === 0) { Ach.unlock('kartgp'); lsS('wallyman-kartgp', (lsJ('wallyman-kartgp', 0) | 0) + 1); } Save.persist(); c.coins = coins; }
  return {
    enter() { Audio8.play(last && rank[0][1] === 0 ? 'victory' : 'menu'); },
    update() { t++; if (t > 40 && Input.confirm()) { if (last) go(() => KartMenu(1)); else go(() => KartScene({ track: c.race + 1, cup: Object.assign(c, { race: c.race + 1 }) })); } },
    draw() {
      ctx.fillStyle = '#3a8a4a'; ctx.fillRect(0, 0, VW, VH); drawWindow(30, 26, 196, 170);
      txt(last ? 'GRAND PRIX RESULTS' : `AFTER RACE ${c.race + 1} OF 3`, 128, 36, '#ffe040', { align: 'center' });
      rank.forEach(([p, i], k) => { const y = 64 + k * 22; txt(`${k + 1}.`, 60, y, '#fff'); txt(names[i], 80, y, cols[i]); txt(`${p} PTS`, 196, y, '#fff', { align: 'right' }); });
      if (last) { txt(rank[0][1] === 0 ? 'YOU WIN THE GRAND PRIX!' : `${names[rank[0][1]]} WINS THE CUP`, 128, 158, rank[0][1] === 0 ? '#ffe040' : '#fff', { align: 'center' }); txt(`+${c.coins} COINS`, 128, 170, '#5ff0ff', { align: 'center' }); }
      else txt('NEXT: ' + KART_TRACKS[c.race + 1].name, 128, 158, '#5ff0ff', { align: 'center' });
      if ((t >> 4) & 1) txt('PRESS START', 128, 182, '#fff', { align: 'center' });
    },
  };
}

// ---------------- friend ghost races ----------------
const GhostCode = (() => {
  const POSES = Object.keys(Wally.POSES).concat(['ride']);
  return {
    encode(li, r) { let px = 0, py = 0; const d = r.rec.map(([x, y, pose, face]) => { const a = [x - px, y - py, Math.max(0, POSES.indexOf(pose)) * 2 + (face < 0 ? 1 : 0)]; px = x; py = y; return a.join(','); }).join(';'); return 'WMG1-' + btoa(JSON.stringify({ li, f: r.f, h: r.hero || 'wally', n: (localStorage.getItem('wallyman-world-lastname') || 'FRIEND').slice(0, 8), d })); },
    decode(code) {
      try { const m = String(code).replace(/\s+/g, '').match(/^WMG1-([A-Za-z0-9+/=]+)$/); if (!m) return null; const o = JSON.parse(atob(m[1])); if (!LEVELS[o.li] || typeof o.d !== 'string') return null; let px = 0, py = 0; const rec = o.d.split(';').map((s) => { const [dx, dy, pf] = s.split(',').map(Number); px += dx; py += dy; return [px, py, POSES[pf >> 1] || 'idle0', pf & 1 ? -1 : 1]; }); return { li: o.li, f: o.f | 0, hero: o.h, name: String(o.n || 'FRIEND').toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 8), rec }; } catch (e) { return null; }
    },
  };
})();
function GhostScene(msg = '') {
  let sel = 0, t = 0, dom = false; const mine = () => Object.keys(Replays.all()).map(Number).filter((li) => LEVELS[li]).sort((a, b) => a - b);
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++; if (dom) return; const L = mine(), n = L.length + 2;
      if (Input.pressed('back') || Input.pressed('run')) { go(() => ExtrasScene('GHOST RACES')); return; }
      if (Input.pressed('down')) sel = (sel + 1) % n; if (Input.pressed('up')) sel = (sel + n - 1) % n;
      if (!Input.confirm()) return;
      if (sel === 0) { dom = true; codeBox("PASTE A FRIEND'S GHOST CODE", '', (code) => { const g = GhostCode.decode(code); if (!g) return false; window.FRIEND_GHOST = g; game = challengeGame(); go(() => { const s = new Play(g.li, false, { ta: true }); s.ghost = g.rec; s.friend = g; return s; }); return true; }, () => { dom = false; }); return; }
      if (sel === n - 1) { go(() => ExtrasScene('GHOST RACES')); return; }
      const li = L[sel - 1]; dom = true; codeBox(`YOUR GHOST FOR ${LEVELS[li].name} - SEND IT TO A FRIEND!`, GhostCode.encode(li, Replays.get(li)), null, () => { dom = false; });
    },
    draw() {
      drawParallax('neon', t * 0.3); drawWindow(16, 10, 224, 204); txt('GHOST RACES', 128, 16, '#ffe040', { align: 'center', scale: 2 });
      const L = mine(), items = ["RACE A FRIEND'S GHOST"].concat(L.map((li) => `SHARE: ${levelTag(li)} ${LEVELS[li].name}`.slice(0, 26) + ' ' + fmtTime(Replays.get(li).f))).concat(['BACK']);
      listMenu(items, sel, t, 34, 40, 12, 13);
      txt(msg || (L.length ? 'YOUR FASTEST CLEARS CAN BE SHARED AS CODES' : 'CLEAR LEVELS TO GET GHOSTS TO SHARE'), 128, 202, msg ? '#5ae060' : '#a8b0d8', { align: 'center' });
    },
  };
}
{ // beat the friend's time for a trophy, and show their name on the ghost
  const _TR = TAResultScene;
  TAResultScene = function (li, frames, rec, sp) { const g = window.FRIEND_GHOST; window.FRIEND_GHOST = null; if (g && g.li === li && frames < g.f) Ach.unlock('ghostrace'); const s = _TR(li, frames, rec, sp); if (g && g.li === li) { const d = s.draw; s.draw = function () { d.call(this); drawWindow(40, 176, 176, 24); txt(frames < g.f ? `YOU BEAT ${g.name}'S GHOST!` : `${g.name}'S GHOST WON (${fmtTime(g.f)})`, 128, 184, frames < g.f ? '#ffe040' : '#ff8080', { align: 'center' }); }; } return s; }; // eslint-disable-line no-func-assign
}

// ---------------- speedrun mode ----------------
function SpeedrunScene() {
  let sel = 0, t = 0; const pb = lsJ('wallyman-speedrun', {});
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (Input.pressed('back') || Input.pressed('run')) { go(() => ChallengeScene(13)); return; }
      if (Input.pressed('down')) sel = (sel + 1) % 3; if (Input.pressed('up')) sel = (sel + 2) % 3;
      if (Input.confirm()) { if (sel === 2) { go(() => ChallengeScene(13)); return; } Audio8.sfx('confirm'); game = Save.fresh(); game.speedrun = { cat: SPEED_CATS[sel].id, t: 0, splits: [], done: false }; game.tutorialAsked = true; go(() => HeroSelect(true, false)); }
    },
    draw() {
      drawParallax('neon', t * 0.4); drawWindow(16, 16, 224, 196); txt('SPEEDRUN', 128, 24, '#ffe040', { align: 'center', scale: 2 });
      ['ONE TIMER FOR THE WHOLE GAME, FROM A', 'BRAND NEW FILE. SPLITS AT EVERY ISLAND.', '(SPEEDRUN FILES ARE NOT SAVED.)'].forEach((l, i) => txt(l, 128, 46 + i * 10, '#fff', { align: 'center' }));
      SPEED_CATS.concat([{ name: 'BACK' }]).forEach((c, i) => { const y = 86 + i * 34, on = i === sel; txt(c.name, 40, y, on ? '#ffe040' : '#fff'); if (on) txt('>', 30 + ((t >> 3) & 1), y, '#ffe040'); if (c.id) txt(pb[c.id] ? 'BEST: ' + fmtTime(pb[c.id].t) : 'NO TIME YET', 40, y + 11, pb[c.id] ? '#5ff0ff' : '#7880b0'); });
    },
  };
}
function SpeedrunResult() {
  const r = game.speedrun; let t = 0;
  return {
    enter() { Audio8.play('victory'); },
    update() { t++; if (t > 60 && Input.confirm()) { game = null; go(() => TitleScene()); } },
    draw() {
      drawParallax('neon', t * 0.4); drawWindow(20, 16, 216, 196); txt('RUN COMPLETE!', 128, 24, '#ffe040', { align: 'center', scale: 2 });
      txt(fmtTime(r.t), 128, 48, '#5ff0ff', { align: 'center', scale: 2 }); if (r.pb) txt('NEW PERSONAL BEST!', 128, 68, (t >> 3) & 1 ? '#ffe040' : '#ff8040', { align: 'center' });
      r.splits.forEach((s, i) => txt(`${SPLITS[i][1]}`.padEnd(14, ' ') + fmtTime(s), 128, 86 + i * 11, '#fff', { align: 'center' }));
      if (t > 60 && (t >> 4) & 1) txt('PRESS START', 128, 198, '#fff', { align: 'center' });
    },
  };
}

// ---------------- fishing on every island, and the fish log ----------------
const ISLAND_FISH = [
  [['MINNOW', 2, '#a0b0c0', 40], ['TROUT', 5, '#80a060', 30], ['SALMON', 8, '#e08070', 18], ['OLD BOOT', 0, '#6a4a2a', 8], ['GOLDEN CARP', 20, '#ffd040', 3], ['TREASURE!', 30, '#c09040', 1]],
  [['STAR FISH', 4, '#ffd040', 30], ['COMET EEL', 7, '#80e0ff', 20], ['MOON JELLY', 6, '#e0e0ff', 20], ['SPACE JUNK', 0, '#808898', 10], ['ALIEN GUPPY', 18, '#5ae060', 3]],
  [['CANDY FISH', 4, '#ff90c8', 30], ['POPCORN PUFFER', 6, '#fff0c0', 20], ['CLOWNFISH', 8, '#ff8020', 15], ['RUBBER DUCK', 1, '#ffe040', 10], ['PRIZE TUNA', 22, '#40a0ff', 3]],
  [['JUNGLE PIRANHA', 6, '#e83040', 25], ['SAND SNAPPER', 5, '#d8a858', 25], ['TEMPLE KOI', 10, '#ff9040', 12], ['ANCIENT COIN', 15, '#ffd040', 4], ['STATIC EEL', 20, '#a040ff', 3]],
  [['GEM GUPPY', 6, '#80f0ff', 25], ['CAVE BLINDFISH', 5, '#e0e0f0', 25], ['CRYSTAL BASS', 12, '#c070ff', 10], ['TOY BOAT', 1, '#ff5060', 8], ['PRISM PIKE', 22, '#ffffff', 3]],
  [['SEA BREAM', 5, '#80a0c0', 30], ['BLOWFISH', 7, '#e8d080', 20], ['GHOST SHARK', 14, '#a8f0d0', 8], ['MESSAGE BOTTLE', 10, '#60c080', 6], ['KRAKEN TENTACLE', 25, '#c070e0', 2]],
  [['MUD SKIPPER', 4, '#8a6a40', 30], ['FOSSIL FISH', 9, '#c8b090', 18], ['TAR BLOB', 0, '#2a2a2a', 10], ['DINO TOOTH', 12, '#ffffff', 6], ['COELACANTH', 24, '#4a6aa0', 3]],
  [['COSMIC CARP', 8, '#c070ff', 25], ['ROBO FISH', 10, '#c0c8d8', 20], ['METEOR', 3, '#806050', 12], ['SPACE SUIT GLOVE', 1, '#ffffff', 8], ['STARLIGHT RAY', 26, '#ffe040', 3]],
];
const ALL_FISH = ISLAND_FISH.flat();
const fishLog = (name) => { if (!game) return; game.fishLog = game.fishLog || {}; game.fishLog[name] = (game.fishLog[name] | 0) + 1; if (Object.keys(game.fishLog).length >= 15) Ach.unlock('fishlog'); };
const ISLAND_NAMES = ['WALLY ISLAND', 'STAR ISLE', 'CARNIVAL ISLE', 'LOST LANDS', 'CRYSTAL ISLE', 'PIRATE COVE', 'DINO VALLEY', 'ORBIT ONE'];
function FishScene() { // eslint-disable-line no-func-assign
  const w = Math.min(ISLAND_FISH.length - 1, (game && game.world) || 0), POOL = ISLAND_FISH[w];
  let t = 0, st = 'aim', pow = 0, powD = 1, dist = 0, wait = 0, tension = 0, prog = 0, fish = null, msg = 'A: CAST (3 COINS)   S: FISH LOG';
  const pick = () => { let r = Math.random() * POOL.reduce((a, f) => a + f[3], 0) * (dist > 0.7 ? 0.8 : 1); for (const f of POOL) { r -= f[3]; if (r <= 0) return f; } return POOL[0]; };
  return {
    enter() { Audio8.play('beach'); },
    update() {
      t++;
      if (Input.pressed('back') || (Input.pressed('run') && st !== 'reel')) { go(() => MiniGamesScene(2)); return; }
      if (Input.pressed('special') && st !== 'reel') { go(() => FishLogScene()); return; }
      if (st === 'aim') { pow += powD * 0.025; if (pow >= 1 || pow <= 0) powD = -powD; if (Input.pressed('jump')) { if (game.coins < 3) { msg = 'NOT ENOUGH COINS!'; Audio8.sfx('bump'); } else { game.coins -= 3; dist = pow; st = 'wait'; wait = 60 + Math.floor(Math.random() * 180); msg = 'WAIT FOR A BITE...'; Audio8.sfx('swoop'); } } }
      else if (st === 'wait') { if (--wait <= 0) { st = 'bite'; wait = 32; fish = pick(); msg = 'A BITE! PRESS A!'; Audio8.sfx('select'); rumble(0.4, 120); } else if (Input.pressed('jump')) { st = 'aim'; msg = 'TOO EARLY! A: CAST AGAIN'; } }
      else if (st === 'bite') { if (Input.pressed('jump')) { st = 'reel'; tension = 30; prog = 0; msg = 'HOLD A TO REEL - KEEP IT GREEN!'; } else if (--wait <= 0) { st = 'aim'; msg = 'IT GOT AWAY! A: CAST AGAIN'; Audio8.sfx('bump'); } }
      else if (st === 'reel') {
        const pull = (fish[1] / 10 + 0.3) * (Math.sin(t * 0.13) + 1.2);
        if (Input.down('jump')) { prog += 0.7; tension += 1.4; } else tension -= 1.6;
        tension += pull * 0.6 - 0.2; tension = Math.max(0, tension);
        if (tension > 100) { st = 'aim'; msg = 'SNAP! THE LINE BROKE'; Audio8.sfx('hurt'); rumble(0.6, 200); }
        else if (tension < 2 && !Input.down('jump') && prog < 100) prog = Math.max(0, prog - 0.4);
        if (prog >= 100) { st = 'caught'; wait = 120; game.coins += fish[1]; while (game.coins >= 100) { game.coins -= 100; game.lives++; } if (fish[0] === 'GOLDEN CARP') Ach.unlock('fisher'); const fresh = !(game.fishLog && game.fishLog[fish[0]]); fishLog(fish[0]); Save.persist(); msg = `${fresh ? 'NEW! ' : ''}${fish[0]}! +${fish[1]} COINS`; Audio8.sfx(fish[1] ? 'oneup' : 'bump'); }
      } else if (st === 'caught') { if (--wait <= 0 || Input.pressed('jump')) { st = 'aim'; msg = 'A: CAST (3 COINS)   S: FISH LOG'; } }
    },
    draw() {
      const g = ctx.createLinearGradient(0, 0, 0, 110); g.addColorStop(0, w === 7 || w === 1 ? '#10102a' : '#ffb070'); g.addColorStop(1, w === 7 || w === 1 ? '#3a2a6a' : '#ffe0b0'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, 110);
      ctx.fillStyle = ['#2a6ab0', '#2a2a7a', '#6a2a8a', '#2a7a6a', '#2a4a8a', '#1a5a8a', '#3a6a4a', '#1a1a4a'][w]; ctx.fillRect(0, 110, VW, 114); ctx.fillStyle = 'rgba(255,255,255,0.18)'; for (let y = 112; y < VH; y += 8) for (let x = ((y * 5 + t) % 20) - 20; x < VW; x += 20) ctx.fillRect(x, y, 8, 1);
      ctx.fillStyle = '#8a5a2a'; ctx.fillRect(0, 100, 70, 10); ctx.fillStyle = '#5a3a1a'; for (let x = 6; x < 70; x += 16) ctx.fillRect(x, 110, 4, 40);
      drawWally(40, 100, st === 'reel' ? 'throw' : 'idle0', 1);
      const bx = 70 + dist * 160, by = 116 + (st === 'bite' ? 4 + ((t >> 1) & 1) * 3 : Math.sin(t * 0.08) * 1.5);
      if (st !== 'aim') { ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(54, 78); ctx.quadraticCurveTo(bx - 20, 60, bx, by); ctx.stroke(); ctx.fillStyle = '#ff3040'; ctx.fillRect(bx - 2, by - 3, 5, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(bx - 2, by, 5, 2); }
      ctx.fillStyle = '#6a4a2a'; ctx.fillRect(46, 70, 2, 18); ctx.fillRect(48, 70, 8, 2);
      if (st === 'aim') { ctx.fillStyle = '#1a1020'; ctx.fillRect(80, 130, 102, 8); ctx.fillStyle = '#5ae060'; ctx.fillRect(81, 131, Math.round(pow * 100), 6); txt('POWER', 131, 140, '#fff', { align: 'center' }); }
      if (st === 'reel') { ctx.fillStyle = '#1a1020'; ctx.fillRect(60, 150, 136, 10); ctx.fillStyle = tension > 80 ? '#ff3040' : tension > 55 ? '#ffd040' : '#5ae060'; ctx.fillRect(61, 151, Math.min(134, Math.round(tension * 1.34)), 8); txt('TENSION', 128, 162, '#fff', { align: 'center' }); ctx.fillStyle = '#1a1020'; ctx.fillRect(60, 176, 136, 8); ctx.fillStyle = '#40c0ff'; ctx.fillRect(61, 177, Math.min(134, Math.round(prog * 1.34)), 6); txt('REEL', 128, 186, '#fff', { align: 'center' }); }
      if (st === 'caught' && fish) { ctx.fillStyle = '#1a1020'; ctx.fillRect(110, 66, 36, 14); ctx.fillStyle = fish[2]; ctx.fillRect(111, 67, 30, 12); ctx.fillRect(141, 64, 6, 18); ctx.fillStyle = '#1a1020'; ctx.fillRect(114, 70, 2, 2); }
      drawWindow(8, 196, 240, 24); txt(msg, 128, 202, '#fff', { align: 'center' });
      txt(ISLAND_NAMES[w] + ' WATERS', 6, 6, '#ffffff', { outline: '#101848' });
      ctx.drawImage(Sprites.coinIcon, 200, 6); txt('*' + pad(game.coins, 2), 207, 6, '#ffffff', { outline: '#101848' });
    },
  };
}
function FishLogScene() {
  let sel = 0, t = 0; const log = (game && game.fishLog) || {};
  return {
    enter() { Audio8.play('beach'); },
    update() { t++; if (Input.pressed('back') || Input.pressed('run') || Input.pressed('special')) { go(() => FishScene()); return; } if (Input.pressed('down')) sel = (sel + 1) % ALL_FISH.length; if (Input.pressed('up')) sel = (sel + ALL_FISH.length - 1) % ALL_FISH.length; },
    draw() {
      ctx.fillStyle = '#2a6ab0'; ctx.fillRect(0, 0, VW, VH); drawWindow(8, 6, 240, 212); txt('FISH LOG', 128, 12, '#ffe040', { align: 'center' }); txt(`${Object.keys(log).length}/${ALL_FISH.length}`, 240, 12, '#fff', { align: 'right' });
      const top = clamp(sel - 7, 0, ALL_FISH.length - 15);
      for (let i = 0; i < 15; i++) { const f = ALL_FISH[top + i], y = 28 + i * 12, on = top + i === sel, got = log[f[0]]; if (on) txt('>', 16 + ((t >> 3) & 1), y, '#ffe040'); hR(26, y, 12, 7, got ? f[2] : '#3a3a58'); txt(got ? f[0] : '???', 44, y, on ? '#ffe040' : got ? '#fff' : '#7880b0'); if (got) txt(`X${got}`, 236, y, '#5ff0ff', { align: 'right' }); }
      const isl = ISLAND_FISH.findIndex((l) => l.includes(ALL_FISH[sel])); txt('FOUND AT: ' + ISLAND_NAMES[isl] + (ALL_FISH[sel][3] <= 3 ? '  (RARE!)' : ''), 128, 208, '#a8b0d8', { align: 'center' });
    },
  };
}

// ---------------- the living world map ----------------
{
  const _Map = MapScene;
  MapScene = function (...a) { // eslint-disable-line no-func-assign
    const s = _Map(...a); if (!s.isMap) return s;
    const d = s.draw;
    s.draw = function () {
      d.call(this);
      const W = game.world || 0, h = new Date().getHours(), night = h >= 20 || h < 6, dusk = h === 19 || h === 6;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 26, VW, 168); ctx.clip();
      for (let k = 0; k < 4; k++) { const cx = ((frame * (0.15 + k * 0.05) + k * 90) % (VW + 80)) - 40, cy = 50 + k * 34; ctx.fillStyle = 'rgba(20,20,60,0.12)'; ctx.beginPath(); ctx.ellipse(cx, cy + 10, 26, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(cx, cy, 18, 6, 0, 0, Math.PI * 2); ctx.ellipse(cx + 10, cy - 3, 12, 5, 0, 0, Math.PI * 2); ctx.fill(); }
      const fx = ['rain', 'stars', 'fireworks', 'birds', 'sparkle', 'gulls', 'ptero', 'stars'][W];
      if (fx === 'rain' && (frame % 2400) < 700) { ctx.fillStyle = 'rgba(200,220,255,0.6)'; for (let i = 0; i < 50; i++) ctx.fillRect((i * 37 + frame * 3) % VW, (i * 53 + frame * 6) % 168 + 26, 1, 4); }
      if (fx === 'stars' || night) { for (let i = 0; i < 30; i++) if ((i + (frame >> 4)) % 7) { ctx.fillStyle = '#ffffff'; ctx.fillRect((i * 71) % VW, 30 + (i * 37) % 60, 1, 1); } if (frame % 300 < 30) { const p = frame % 300; for (let k = 0; k < 10; k++) { ctx.fillStyle = `rgba(255,255,255,${(10 - k) / 10})`; ctx.fillRect(40 + p * 5 - k * 2, 36 + p * 2 - k, 1, 1); } } }
      if (fx === 'fireworks' && frame % 180 < 60) { const p = frame % 180, x = 60 + ((frame / 180) | 0) * 47 % 140, y = 60; for (let k = 0; k < 12; k++) { const an = k / 12 * Math.PI * 2; ctx.fillStyle = ['#ff60b0', '#ffe040', '#60d0ff'][k % 3]; ctx.fillRect(Math.round(x + Math.cos(an) * p * 0.5), Math.round(y + Math.sin(an) * p * 0.5), 2, 2); } }
      if (fx === 'birds' || fx === 'gulls' || fx === 'ptero') for (let k = 0; k < 3; k++) { const x = ((frame * (0.6 + k * 0.2) + k * 80) % (VW + 40)) - 20, y = 50 + k * 22 + Math.sin(frame * 0.05 + k) * 4, w = (frame >> 3) & 1; ctx.fillStyle = fx === 'gulls' ? '#ffffff' : fx === 'ptero' ? '#7a4a30' : '#1a1020'; const s = fx === 'ptero' ? 2 : 1; ctx.fillRect(x, y, 3 * s, 1 * s); ctx.fillRect(x - 2 * s, y - w * s, 2 * s, 1 * s); ctx.fillRect(x + 3 * s, y - w * s, 2 * s, 1 * s); }
      if (fx === 'sparkle') for (let i = 0; i < 12; i++) if ((i * 7 + (frame >> 3)) % 5 === 0) { ctx.fillStyle = '#c0f8ff'; ctx.fillRect((i * 53) % VW, 40 + (i * 29) % 140, 1, 3); ctx.fillRect((i * 53) % VW - 1, 41 + (i * 29) % 140, 3, 1); }
      if (night) { ctx.fillStyle = 'rgba(10,10,60,0.32)'; ctx.fillRect(0, 26, VW, 168); } else if (dusk) { ctx.fillStyle = 'rgba(255,120,40,0.15)'; ctx.fillRect(0, 26, VW, 168); }
      ctx.restore();
    };
    return s;
  };
}

// ---------------- the help book ----------------
const HELP = [
  ['MOVING', [['ARROWS / D-PAD: WALK.', 'HOLD B (X KEY) TO RUN.', 'A (Z KEY): JUMP. HOLD IT TO', 'JUMP HIGHER.'], 'run'], [['PUSH INTO A WALL IN THE AIR', 'TO SLIDE DOWN IT, THEN', 'PRESS A TO WALL-JUMP.', ''], 'jump'], [['IN THE AIR, PRESS DOWN TO', 'GROUND POUND: IT SMASHES', 'BRICKS AND KNOCKS OUT FOES.', ''], 'crouch'], [['HOLD DOWN ON A SLOPE (OR', 'WHILE RUNNING) TO BELLY', 'SLIDE INTO ENEMIES!', ''], 'crouch']],
  ['ATTACKS', [['STOMP MOST ENEMIES BY', "LANDING ON THEM. DON'T", 'STOMP SPIKY PRICKLES!', ''], 'fall'], [['TAP B TO THROW A CANNONBALL.', 'HOLD UP + B TO LOB IT HIGH.', 'CRATES GIVE YOU 3 MORE.', ''], 'throw'], [['S (C KEY): SPECIAL ATTACK.', 'EVERY HERO HAS THEIR OWN.', 'SPECIAL ORBS GIVE 3 MORE.', ''], 'win0']],
  ['POWER-UPS', [['ENERGY DRINK: +1 HEART.', 'SIGNAL PHONE: FIRE PINGS.', 'SUPER CHARGE: INVINCIBLE.', 'JET BOOTS: DOUBLE JUMP.'], 'item'], [['DRILL, BALLOON, GIGA WALLY,', 'GHOST CLOAK, MAGNET, SHIELD', 'AND THE MECH SUIT TOO!', 'HOLD UP + S: RESERVE ITEM.'], 'item'], [['DINO: RIDE HIM FOR HIGHER', 'JUMPS. B: CHOMP. DOWN + A', 'TO HOP OFF.', ''], 'ride']],
  ['COLLECT', [['5 MEDALS AND 3 SIGNAL BARS', 'HIDE IN EVERY LEVEL. GET', '3 STARS: TIME, MEDALS AND', 'NO HITS.'], 'win1'], [['100 COINS = 1 EXTRA LIFE.', 'KEYS OPEN SECRET DOORS ON', 'THE MAP. CARDS DROP FROM', 'FOES NOW AND THEN.'], 'idle0']],
  ['MODES', [['CHALLENGES: TIME ATTACK,', 'BOSS RUSH, DAILY, ENDLESS,', 'ARENA, REMIX, TOWER, GOLD,', 'MIRROR, PARTY, SPEEDRUN.'], 'run'], [['EXTRAS: LEVEL MAKER, MUSIC', 'MAKER, HERO MAKER, ALBUMS,', 'THEATRE, REMATCHES, TITLES', 'AND MORE.'], 'win0']],
  ['TIPS', [['PAUSE (START) TO RESTART A', 'LEVEL, TAKE PHOTOS OR QUIT.', 'OPTIONS HAS ASSIST MODES,', 'AUTO-RUN AND ONE BUTTON.'], 'idle0'], [['STUCK? LOSE 3 LIVES IN A', 'LEVEL AND PROFESSOR HOOT', 'APPEARS WITH A HINT.', ''], 'idle0'], [['RUMOUR: SOMETHING ODD HAPPENS', 'IF YOU HOLD DOWN AT THE VERY', 'LEFT OF CAVERN COMMUTE...', ''], 'crouch']],
];
const HELP_CH = HELP.map((c) => [c[0], c.slice(1)]);
function HelpScene() {
  let ch = 0, pg = 0, t = 0; const read = lsJ('wallyman-help-read', {});
  const mark = () => { read[ch + '-' + pg] = 1; lsS('wallyman-help-read', read); if (Object.keys(read).length >= HELP_CH.reduce((n, c) => n + c[1].length, 0)) Ach.unlock('reader'); };
  mark();
  return {
    enter() { Audio8.play('map'); },
    update() {
      t++;
      if (Input.pressed('back') || Input.pressed('run')) { go(() => ExtrasScene('HELP BOOK')); return; }
      if (Input.pressed('down')) { ch = (ch + 1) % HELP_CH.length; pg = 0; Audio8.sfx('select'); mark(); } if (Input.pressed('up')) { ch = (ch + HELP_CH.length - 1) % HELP_CH.length; pg = 0; Audio8.sfx('select'); mark(); }
      if (Input.pressed('right') || Input.confirm()) { pg = (pg + 1) % HELP_CH[ch][1].length; Audio8.sfx('map'); mark(); } if (Input.pressed('left')) { pg = (pg + HELP_CH[ch][1].length - 1) % HELP_CH[ch][1].length; Audio8.sfx('map'); mark(); }
    },
    draw() {
      ctx.fillStyle = '#7a4a2a'; ctx.fillRect(0, 0, VW, VH); hR(8, 8, 240, 208, '#f0e0b0'); hR(127, 8, 2, 208, '#c0a070');
      txt('HELP BOOK', 66, 16, '#7a2a10', { align: 'center', shadow: null });
      HELP_CH.forEach((c, i) => { const y = 34 + i * 16; txt(c[0], 24, y, i === ch ? '#c02030' : '#5a4030', { shadow: null }); if (i === ch) txt('>', 16, y, '#c02030', { shadow: null }); });
      const [lines, pose] = HELP_CH[ch][1][pg];
      hR(140, 20, 100, 70, '#5cb0f8'); hR(140, 78, 100, 12, '#5ad84a');
      if (pose === 'item') { drawPowerItem(['drill', 'balloon', 'giga', 'cloak'][(t >> 5) % 4], 152, 56); ctx.drawImage(Sprites.drink, 200, 58); } else drawWally(190, 80, pose === 'run' ? 'run' + ((t >> 2) % 8) : pose, 1, { t });
      wrapText(lines.filter(Boolean).join(' '), 18).forEach((l, i) => txt(l, 188, 98 + i * 9, '#3a2010', { align: 'center', shadow: null }));
      txt(`PAGE ${pg + 1}/${HELP_CH[ch][1].length}`, 188, 170, '#7a5a30', { align: 'center', shadow: null });
      txt('UP/DOWN: CHAPTER', 66, 186, '#7a5a30', { align: 'center', shadow: null }); txt('< >: TURN PAGE', 190, 186, '#7a5a30', { align: 'center', shadow: null });
    },
  };
}

// ---------------- titles ----------------
function TitlesScene() {
  let file = Math.max(0, Save.slots.findIndex(Boolean)), sel = 0, t = 0, msg = '';
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (Input.pressed('back') || Input.pressed('run')) { go(() => ExtrasScene('TITLES')); return; }
      if (Input.pressed('right')) file = (file + 1) % 3; if (Input.pressed('left')) file = (file + 2) % 3;
      if (Input.pressed('down')) sel = (sel + 1) % TITLES.length; if (Input.pressed('up')) sel = (sel + TITLES.length - 1) % TITLES.length;
      if (Input.confirm()) { const s = Save.slots[file]; if (!s) { msg = 'THAT FILE IS EMPTY'; Audio8.sfx('bump'); return; } if (!titleOk(sel)) { msg = 'EARN THE TROPHY FIRST'; Audio8.sfx('bump'); return; } s.titleIdx = sel; Save.persist(); msg = `FILE ${'ABC'[file]} IS NOW: ${TITLES[sel][0]}`; Audio8.sfx('power'); }
    },
    draw() {
      drawParallax('castle', t * 0.3); drawWindow(16, 6, 224, 212); txt('TITLES', 128, 12, '#ffe040', { align: 'center', scale: 2 });
      const s = Save.slots[file]; txt(`< FILE ${'ABC'[file]} >  ${s ? 'WEARS: ' + titleOf(s)[0] : '(EMPTY)'}`, 128, 32, '#5ff0ff', { align: 'center' });
      const top = clamp(sel - 6, 0, TITLES.length - 13);
      for (let i = 0; i < 13; i++) { const k = top + i, T = TITLES[k]; if (!T) break; const y = 48 + i * 11, on = k === sel, ok = titleOk(k); hR(30, y, 6, 6, ok ? T[2] : '#3a3a58'); txt(ok ? T[0] : '???', 42, y, on ? '#ffe040' : ok ? '#fff' : '#7880b0'); if (!ok && on) txt('NEEDS: ' + ((ACH_LIST.find((a) => a[0] === T[1]) || [0, '?'])[1]), 226, y, '#ff8080', { align: 'right' }); if (on) txt('>', 22, y, '#ffe040'); }
      txt(msg || 'A: WEAR THIS TITLE', 128, 196, msg ? '#5ae060' : '#a8b0d8', { align: 'center' });
    },
  };
}
{ // show a highlighted file's title on the title screen
  const _T = TitleScene;
  TitleScene = function (...a) { // eslint-disable-line no-func-assign
    const s = _T(...a), d = s.draw;
    s.draw = function () { d.call(this); for (let i = 0; i < 3; i++) { const g = Save.slots[i]; if (!g || !g.titleIdx) continue; const T = titleOf(g); hR(178, 113 + i * 11, 6, 6, '#1a1020'); hR(179, 114 + i * 11, 4, 4, T[2]); } };
    return s;
  };
}

// ---------------- menus ----------------
{
  ExtrasScene = function (start = 0) { return ExtrasList(start); }; // eslint-disable-line no-func-assign
}
function ExtrasList(start) {
  const items = [['LEVEL MAKER', () => LevelMakerScene(null)], ['MAKER WORLDS', () => MakerWorldScene()], ['MUSIC MAKER', () => MusicMakerScene()], ['COURSE WORLD', () => CourseWorldScene()], ['HERO MAKER', () => HeroMakerScene()], ['COMPLETION', () => CompletionScene()], ['TITLES', () => TitlesScene()],
    ['TROPHY ROOM', () => TrophyScene()], ['STICKER BOOK', () => StickerScene()], ['CARD ALBUM', () => CardScene()], ['BESTIARY', () => BestiaryScene()], ['PHOTO ALBUM', () => PhotoAlbumScene()], ['ART GALLERY', () => ArtScene()], ['JUKEBOX', () => JukeboxScene()],
    ['GALLERY', () => GalleryScene()], ['THEATRE', () => TheatreScene()], ['BOSS REMATCH', () => RematchScene()], ['REPLAYS', () => ReplaysScene()], ['GHOST RACES', () => GhostScene()], ['LEADERBOARDS', () => LeaderScene()], ['HELP BOOK', () => HelpScene()], ['CREDITS', () => CreditsScene()],
    ['IMPORT SAVE', () => ImportSaveScene()], ['BACKUPS', () => BackupScene()], ['INSTALL APP', () => InstallScene()], ['OPTIONS', () => OptionsScene()], ['BACK', null]];
  let sel = typeof start === 'string' ? Math.max(0, items.findIndex((k) => k[0] === start)) : start, t = 0; const SHOW = 11;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (Input.pressed('down')) { sel = (sel + 1) % items.length; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + items.length - 1) % items.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || (Input.confirm() && !items[sel][1])) { go(() => TitleScene()); return; }
      if (Input.confirm()) { Audio8.sfx('confirm'); go(items[sel][1]); }
    },
    draw() {
      drawParallax('sky', t * 0.3); drawLogo(4); drawWindow(60, 78, 136, 134); txt('EXTRAS', 128, 83, '#ffe040', { align: 'center' });
      const top = clamp(sel - 5, 0, items.length - SHOW);
      for (let i = 0; i < SHOW; i++) { const k = top + i, y = Math.round(95 + i * 10); txt(items[k][0], 84, y, k === sel ? '#ffe040' : '#fff'); if (k === sel) txt('>', 72 + ((t >> 3) & 1), y, '#ffe040'); }
      if (top > 0) txt('^', 186, 92, '#a8b0d8'); if (top + SHOW < items.length) txt('V', 186, 196, '#a8b0d8');
      txt(`TROPHIES ${Ach.count()}/${ACH_LIST.length}`, 128, 215, '#fff', { align: 'center', outline: '#101848' });
    },
  };
}
function ChallengeScene(start = 0) { // eslint-disable-line no-func-assign
  const items = ['TIME ATTACK', 'BOSS RUSH', 'DAILY CHALLENGE', 'ENDLESS RUN', 'VERSUS', 'SURVIVAL ARENA', 'HARD REMIX', "DOUG'S STORY", 'ROGUELIKE TOWER', 'GOLDEN LEVELS', 'TUTORIAL', 'MIRROR MODE', 'PARTY MODE', 'SPEEDRUN', 'BACK'];
  const tips = ['RACE ANY LEVEL YOU HAVE BEATEN', 'EVERY BOSS BACK TO BACK!', "TODAY'S LEVEL WITH A TWIST", 'HOW FAR CAN YOU RUN?', 'TWO PLAYERS: RACE OR BATTLE', 'ENDLESS WAVES OF FOES', 'MEANER VERSIONS OF WALLY ISLAND', 'PLAY AS DOUG IN 3 NEW LEVELS', 'RANDOM FLOORS, UPGRADES, ONE LIFE', 'HUNT 100 GOLD COINS PER LEVEL', 'LEARN ALL THE MOVES', 'EVERY LEVEL FLIPPED AROUND', 'UP TO 4 PLAYERS, 3 MINI-GAMES', 'ONE TIMER FOR THE WHOLE GAME', ''];
  const go_ = [() => TimeAttackSelect(), () => RushIntroScene(), () => DailyScene(), () => EndlessIntro(), () => VersusScene(), () => ArenaIntro(), () => RemixScene(), () => StoryMenu(Math.min(2, storyDone())), () => RogueIntro(), () => GoldScene(), () => startTutorial(false), () => MirrorScene(), () => PartyScene(), () => SpeedrunScene()];
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
      for (let i = 0; i < SHOW; i++) { const k = top + i, y = 88 + i * 10; txt(items[k], 74, y, k === sel ? '#ffe040' : '#fff'); if (k === sel) txt('>', 62 + ((t >> 3) & 1), y, '#ffe040'); }
      if (top > 0) txt('^', 196, 86, '#a8b0d8'); if (top + SHOW < items.length) txt('V', 196, 198, '#a8b0d8');
      txt(tips[sel], 128, 212, '#fff', { align: 'center', outline: '#101848' });
    },
  };
}
{
  const _J = JukeboxScene;
  JukeboxScene = function () { const s = _J(), u = s.update; s.update = function () { if (Input.pressed('back') || Input.pressed('run')) { go(() => ExtrasScene('JUKEBOX')); return; } return u.call(this); }; return s; }; // eslint-disable-line no-func-assign
}

// the first title screen was built before these files loaded: rebuild it so the newest extras apply
{ // the update number on a little ribbon under the logo
  const _T = TitleScene;
  TitleScene = function (...a) { // eslint-disable-line no-func-assign
    const s = _T(...a), d = s.draw;
    s.draw = function () {
      d.call(this);
      const label = 'UPDATE ' + GAME_VERSION, w = label.length * 6 - 1, x = 128 - (w >> 1) - 5;
      hR(x - 3, 93, 3, 9, '#8a1010'); hR(x + w + 10, 93, 3, 9, '#8a1010'); hR(x, 91, w + 10, 11, '#d02828'); hR(x, 91, w + 10, 1, '#ff7070'); hR(x, 101, w + 10, 1, '#6a0808');
      txt(label, 128, 93, '#ffe040', { align: 'center' });
    };
    return s;
  };
}
if (typeof scene !== 'undefined' && scene && scene.isTitle) { scene = TitleScene(); if (scene.enter) scene.enter(); }
// Level Maker shortcuts: U = undo, Y = redo
addEventListener('keydown', (e) => { if (!e.repeat && typeof scene !== 'undefined' && scene && scene.isMaker && window.makerKeys) window.makerKeys(e.code); });
