'use strict';
// =====================================================================
// Update 1.3 (part 3): the Fossil Museum (and fossils to dig up in the
// Lost Lands and Dino Valley), the Pet Show, Photo Puzzles, and the
// updated menus, What's New list and Help Book.
// =====================================================================
ACH_LIST.push(['museum', 'CURATOR', 'BUILD A WHOLE DINOSAUR SKELETON'], ['bestinshow', 'BEST IN SHOW', 'WIN FIRST PRIZE AT THE PET SHOW'], ['puzzler', 'PICTURE PERFECT', 'SOLVE A PHOTO PUZZLE']);

// ---------------- fossils ----------------
const SKELETONS = [['trex', 'T-REX'], ['tri', 'TRICERATOPS'], ['ptero', 'PTERODACTYL']];
const BONE_NAMES = ['SKULL', 'BACKBONE', 'LEGS', 'TAIL'];
const FOSSIL_LV = () => [3, 6].flatMap((w) => (WORLDS[w] ? WORLDS[w].nodes() : []).filter((n) => n.li !== undefined && n.kind === 'level').map((n) => n.li));
const fossilsGot = () => (game && game.fossils) || [];
{
  const _upd = Play.prototype.update;
  Play.prototype.update = function () {
    if (!this._initF) {
      this._initF = true;
      if (game && !this.mode && !this.ta && !this.rush && !this.daily && FOSSIL_LV().includes(this.li) && this.lv && this.lv.grid) {
        const missing = []; for (const [k] of SKELETONS) for (let b = 0; b < 4; b++) if (!fossilsGot().includes(k + b)) missing.push(k + b);
        if (missing.length) {
          const id = missing[(this.li * 7) % missing.length], W = this.lv.w;
          for (let x = Math.floor(W * 0.55); x < W - 10; x++) { const gy = groundRow(this, x); if (gy > 0 && gy >= 10 && this.tile(x - 1, gy) !== '.' && this.tile(x + 1, gy) !== '.') { this.ents.push({ type: 'fossil', alive: true, t: 0, x: x * TS, y: gy * TS - 6, w: 16, h: 6, id, dig: 0 }); break; } }
        }
      }
    }
    const p = this.p, pound = p.pound;
    const r = _upd.call(this);
    if (this.state === 'play' && !this.paused) for (const e of this.ents) if (e.type === 'fossil' && e.alive) {
      const on = Math.abs(p.x + p.w / 2 - (e.x + 8)) < 12 && Math.abs(p.y + p.h - (e.y + 6)) < 6 && p.onGround;
      if ((pound === -1 && p.pound !== -1 && on) || (on && p.crouch && ++e.dig > 40)) {
        e.alive = false; game.fossils = game.fossils || []; if (!game.fossils.includes(e.id)) game.fossils.push(e.id);
        const sk = SKELETONS.find((k) => e.id.startsWith(k[0])); Audio8.sfx('oneup'); this.shake = 6;
        this.parts.push({ k: 'text', s: `FOSSIL! ${sk[1]} ${BONE_NAMES[+e.id.slice(-1)]}`, x: e.x - 50, y: e.y - 30, vy: -0.3, life: 110 });
        for (let k = 0; k < 8; k++) this.parts.push({ k: 'dust', x: e.x + 8, y: e.y, vx: (k - 4) * 0.4, vy: -1 - (k % 3) * 0.4, life: 22 });
        Save.persist();
      }
    }
    return r;
  };
  const _ue = Play.prototype.updateEnt;
  Play.prototype.updateEnt = function (e) { if (e.type === 'fossil') { e.t++; return; } return _ue.call(this, e); };
  const _de = Play.prototype.drawEnt;
  Play.prototype.drawEnt = function (e, cx) {
    if (e.type !== 'fossil') return _de.call(this, e, cx);
    const x = Math.round(e.x - cx), y = Math.round(e.y);
    hR(x, y + 2, 16, 4, '#6a4a2a'); hR(x + 2, y, 12, 3, '#8a6a40'); hR(x + 4, y + 1, 2, 2, '#f0e8d0'); hR(x + 9, y + 2, 3, 1, '#f0e8d0'); if ((frame >> 4) & 1) txt('!', x + 5, y - 14, '#ffe040', { outline: '#1a1020' });
    if (e.dig > 0) { hR(x, y - 6, 16, 3, '#1a1020'); hR(x + 1, y - 5, Math.round(14 * e.dig / 40), 1, '#ffe040'); }
  };
  const _hud = Play.prototype.drawHUD;
  Play.prototype.drawHUD = function () { _hud.call(this); if (this.ents.some((e) => e.type === 'fossil' && e.alive) && this.hF < 300) txt('A FOSSIL IS BURIED HERE! GROUND-POUND IT', 128, 190, '#ffe040', { align: 'center', outline: '#101848' }); };
}
function drawSkeleton(kind, x, y, have, t) {
  const B = (i, fn) => { ctx.save(); if (!have.includes(i)) { ctx.globalAlpha = 0.25; } fn(have.includes(i) ? '#f0e8d0' : '#a8b0d8'); ctx.restore(); };
  if (kind === 'trex') {
    B(0, (c) => { hR(x + 44, y, 22, 14, c); hR(x + 60, y + 10, 8, 4, c); hR(x + 48, y + 4, 3, 3, '#1a1020'); });
    B(1, (c) => { for (let k = 0; k < 6; k++) hR(x + 18 + k * 5, y + 14 + Math.abs(k - 3), 4, 6, c); hR(x + 40, y + 22, 8, 2, c); });
    B(2, (c) => { hR(x + 24, y + 22, 4, 22, c); hR(x + 36, y + 22, 4, 22, c); hR(x + 22, y + 44, 8, 3, c); hR(x + 34, y + 44, 8, 3, c); });
    B(3, (c) => { for (let k = 0; k < 5; k++) hR(x + 16 - k * 4, y + 16 + k * 3, 4, 3, c); });
  } else if (kind === 'tri') {
    B(0, (c) => { hR(x + 46, y + 6, 18, 14, c); hR(x + 44, y, 4, 10, c); hR(x + 62, y + 2, 3, 8, c); hR(x + 54, y + 2, 3, 6, c); });
    B(1, (c) => { for (let k = 0; k < 6; k++) hR(x + 16 + k * 5, y + 14 - Math.abs(k - 3) * 0.5, 4, 6, c); });
    B(2, (c) => { for (const lx of [18, 26, 36, 42]) hR(x + lx, y + 22, 4, 18, c); });
    B(3, (c) => { for (let k = 0; k < 4; k++) hR(x + 12 - k * 4, y + 16 + k * 2, 4, 3, c); });
  } else {
    B(0, (c) => { hR(x + 30, y + 10, 14, 8, c); hR(x + 42, y + 12, 14, 3, c); hR(x + 26, y + 6, 6, 4, c); });
    B(1, (c) => { hR(x + 22, y + 18, 16, 6, c); });
    B(2, (c) => { for (let k = 0; k < 5; k++) { hR(x + 4 + k * 4, y + 14 + k * 2, 4, 2, c); hR(x + 52 - k * 4, y + 14 + k * 2, 4, 2, c); } });
    B(3, (c) => { hR(x + 26, y + 24, 3, 12, c); hR(x + 32, y + 24, 3, 12, c); });
  }
}
function MuseumScene() {
  let t = 0; game.fossilPaid = game.fossilPaid || [];
  for (const [k] of SKELETONS) if (!game.fossilPaid.includes(k) && [0, 1, 2, 3].every((b) => fossilsGot().includes(k + b))) { game.fossilPaid.push(k); payCoins(30); Ach.unlock('museum'); }
  return {
    enter() { Audio8.play('map'); },
    update() { t++; if (Input.pressed('back') || Input.pressed('run') || Input.confirm()) go(() => HouseScene(16)); },
    draw() {
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(0, 0, VW, VH); hR(0, 180, VW, 44, '#8a6a4a'); for (let x = 0; x < VW; x += 32) hR(x, 180, 30, 44, '#9a7a5a');
      drawWindow(8, 6, 240, 22); txt('FOSSIL MUSEUM', 128, 13, '#ffe040', { align: 'center' });
      SKELETONS.forEach(([k, n], i) => {
        const x = 8 + i * 82, y = 60, have = [0, 1, 2, 3].filter((b) => fossilsGot().includes(k + b)), done = have.length === 4;
        hR(x, y + 54, 76, 6, '#5a4a3a'); hR(x + 34, y + 60, 8, 60, '#6a5a4a'); drawSkeleton(k, x + 4, y, have, t);
        txt(n.length > 12 ? n.slice(0, 12) : n, x + 38, y + 126, done ? '#a07010' : '#3a2a1a', { align: 'center', shadow: null }); txt(`${have.length}/4`, x + 38, y + 136, done ? '#2a8a30' : '#6a5a4a', { align: 'center', shadow: null });
      });
      txt('BONES ARE BURIED IN THE LOST LANDS', 128, 34, '#3a2a1a', { align: 'center', shadow: null });
      txt('AND DINO VALLEY. 30 COINS A SKELETON', 128, 46, '#6a5a4a', { align: 'center', shadow: null });
    },
  };
}

// ---------------- the Pet Show ----------------
const SHOWS = [['CUTEST PET', 1], ['TRICK SHOW', 2], ['GRAND CHAMPION', 3]];
function PetShowScene() {
  let stage = 'pick', sel = 0, t = 0, tries = 0, hits = [], pos = 0, dir = 1, zone = 0, result = null; const k = game.petKind || heroOf(), pd = PETS[k] || PETS.wally;
  const RIVAL_PETS = ['FLUFFY', 'SIR WAGGLES', 'PRINCESS PURR', 'CHOMPY', 'MR BUBBLES', 'ZIGGY'];
  const newZone = () => { zone = 20 + Math.random() * 60; };
  return {
    enter() { Audio8.play('carnival'); },
    update() {
      t++;
      if (stage === 'pick') {
        if (Input.pressed('back') || Input.pressed('run')) { go(() => HouseScene(17)); return; }
        if (Input.pressed('down')) { sel = (sel + 1) % SHOWS.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + SHOWS.length - 1) % SHOWS.length; Audio8.sfx('select'); }
        if (Input.confirm()) { stage = 'show'; tries = 0; hits = []; pos = 0; newZone(); Audio8.sfx('confirm'); }
        return;
      }
      if (stage === 'show') {
        pos += dir * (1.4 + SHOWS[sel][1] * 0.4); if (pos >= 100 || pos <= 0) dir = -dir;
        if (Input.confirm()) { const d = Math.abs(pos - zone); const pts = d < 4 ? 20 : d < 10 ? 12 : d < 18 ? 5 : 0; hits.push(pts); Audio8.sfx(pts >= 12 ? 'coin' : pts ? 'select' : 'bump'); tries++; newZone(); if (tries >= 5) {
          const stg = petStage(k), mine = hits.reduce((a, b) => a + b, 0) + stg * 10, tier = SHOWS[sel][1];
          const rivals = [0, 1, 2].map((i) => ({ name: RIVAL_PETS[(i * 2 + sel + t) % RIVAL_PETS.length], score: 30 + tier * 18 + Math.floor(Math.random() * 30) - i * 6 }));
          const all = rivals.concat([{ name: pd.name, score: mine, me: true }]).sort((a, b) => b.score - a.score), place = all.findIndex((r) => r.me);
          game.rosettes = game.rosettes || [0, 0, 0]; if (place < 3) { game.rosettes[place]++; payCoins([20, 10, 5][place] * tier); } if (place === 0) Ach.unlock('bestinshow'); Save.persist();
          result = { all, place }; stage = 'result'; t = 0; Audio8.play(place === 0 ? 'victory' : 'map');
        } }
        return;
      }
      if (t > 60 && Input.confirm()) { stage = 'pick'; t = 0; Audio8.play('carnival'); }
    },
    draw() {
      drawParallax('carnival', t * 0.3); hR(0, 160, VW, 64, '#5ab048');
      ctx.save(); ctx.translate(112, 120 - (stage === 'show' && (t >> 3) & 1 ? 4 : 0)); ctx.scale(2.5, 2.5); ctx.drawImage(pd.img[0], 0, 0); drawPetLook(petStage(k), 0, 0, t); ctx.restore();
      if (stage === 'pick') {
        drawWindow(24, 8, 208, 24 + SHOWS.length * 14); txt('PET SHOW', 128, 14, '#ffe040', { align: 'center' });
        SHOWS.forEach(([n, tier], i) => { const y = 30 + i * 14; txt(n, 60, y, i === sel ? '#ffe040' : '#fff'); txt('LEVEL ' + tier, 204, y, '#ffd040', { align: 'right' }); if (i === sel) txt('>', 48 + ((t >> 3) & 1), y, '#ffe040'); });
        const r = game.rosettes || [0, 0, 0]; txt(`ROSETTES  GOLD ${r[0]}  SILVER ${r[1]}  BRONZE ${r[2]}`, 128, 196, '#fff', { align: 'center', outline: '#101848' }); txt(`${pd.name} (${petStage(k) >= 5 ? 'EVOLVED' : 'LEVEL ' + petStage(k)})`, 128, 208, '#a8b0d8', { align: 'center', outline: '#101848' });
        return;
      }
      if (stage === 'show') {
        drawWindow(24, 8, 208, 60); txt(SHOWS[sel][0] + ` - TRICK ${tries + 1}/5`, 128, 14, '#ffe040', { align: 'center' }); txt('PRESS A IN THE GREEN!', 128, 26, '#fff', { align: 'center' });
        hR(38, 44, 180, 12, '#1a1020'); hR(39, 45, 178, 10, '#5a4a6a'); hR(39 + zone * 1.78 - 10, 45, 20, 10, '#5ae060'); hR(39 + zone * 1.78 - 3, 45, 6, 10, '#ffe040'); hR(38 + pos * 1.78, 40, 3, 20, '#ffffff');
        txt('SCORES ' + hits.join(' '), 128, 196, '#fff', { align: 'center', outline: '#101848' });
        return;
      }
      drawWindow(40, 8, 176, 30 + result.all.length * 12); txt(['FIRST PRIZE!', 'SECOND PLACE!', 'THIRD PLACE!', 'NO PRIZE THIS TIME'][result.place], 128, 14, result.place === 0 ? '#ffe040' : '#fff', { align: 'center' });
      result.all.forEach((r, i) => txt(`${i + 1}. ${r.name}  ${r.score}`, 128, 30 + i * 12, r.me ? '#5ff0ff' : '#fff', { align: 'center' }));
      if (result.place < 3) { const c = ['#ffd040', '#c0c8d8', '#d08040'][result.place]; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(200, 140, 12, 0, Math.PI * 2); ctx.fill(); hR(196, 150, 3, 14, c); hR(201, 150, 3, 14, c); }
    },
  };
}

// ---------------- Photo Puzzles ----------------
const BUILTIN_PICS = [['WALLY ISLAND', 'grass'], ['STAR ISLE', 'moon'], ['CANDY COVE', 'candy']];
function PhotoPuzzleScene() {
  const photos = PhotoAlbum.list(), pics = BUILTIN_PICS.map(([n, th]) => ({ name: n, theme: th })).concat(photos.map((p, i) => ({ name: 'PHOTO ' + (i + 1), url: p.img })));
  let stage = 'pick', sel = 0, t = 0, img = null, tiles = [], blank = 8, moves = 0;
  const load = (pic) => {
    const c = Sprites.canvas(VW, VH), x = c.getContext('2d');
    if (pic.url) { const im = new Image(); im.onload = () => x.drawImage(im, 0, 0, VW, VH); im.src = pic.url; }
    else { drawParallax(pic.theme, 40); for (let i = 0; i < 3; i++) Wally.draw(ctx, 70 + i * 58, 200, 'win' + (i & 1), 1, { t: 0, hero: ['wally', 'goth', 'doug'][i], sx: 2, sy: 2 }); try { x.drawImage(cv, 0, 0); } catch (e) { /* ignore */ } }
    return c;
  };
  const solved = () => tiles.every((v, i) => v === i);
  const slide = (dx, dy) => { const bx = blank % 3, by = Math.floor(blank / 3), sx = bx - dx, sy = by - dy; if (sx < 0 || sy < 0 || sx > 2 || sy > 2) return false; const s = sy * 3 + sx; [tiles[blank], tiles[s]] = [tiles[s], tiles[blank]]; blank = s; return true; };
  return {
    enter() { Audio8.play('map'); },
    update() {
      t++;
      if (stage === 'pick') {
        if (Input.pressed('back') || Input.pressed('run')) { go(() => HouseScene(19)); return; }
        if (Input.pressed('right')) { sel = (sel + 1) % pics.length; Audio8.sfx('select'); } if (Input.pressed('left')) { sel = (sel + pics.length - 1) % pics.length; Audio8.sfx('select'); }
        if (Input.confirm()) { img = load(pics[sel]); tiles = [0, 1, 2, 3, 4, 5, 6, 7, 8]; blank = 8; for (let k = 0; k < 160; k++) { const d = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)]; slide(d[0], d[1]); } if (solved()) slide(1, 0); moves = 0; stage = 'play'; Audio8.sfx('confirm'); }
        return;
      }
      if (stage === 'done') { if (t > 60 && Input.confirm()) { stage = 'pick'; t = 0; } return; }
      if (Input.pressed('back')) { stage = 'pick'; return; }
      for (const [k, dx, dy] of [['left', -1, 0], ['right', 1, 0], ['up', 0, -1], ['down', 0, 1]]) if (Input.pressed(k) && slide(dx, dy)) { moves++; Audio8.sfx('select'); }
      if (solved()) { stage = 'done'; t = 0; payCoins(5); Ach.unlock('puzzler'); Audio8.sfx('oneup'); }
    },
    draw() {
      ctx.fillStyle = '#2a1a3a'; ctx.fillRect(0, 0, VW, VH);
      if (stage === 'pick') { drawWindow(16, 40, 224, 110); txt('PHOTO PUZZLES', 128, 48, '#ffe040', { align: 'center', scale: 2 }); txt(`< ${pics[sel].name} >`, 128, 80, '#fff', { align: 'center' }); txt(`${sel + 1}/${pics.length}`, 128, 94, '#a8b0d8', { align: 'center' }); txt(photos.length ? 'YOUR PHOTOS ARE PUZZLES TOO!' : 'TAKE PHOTOS TO MAKE MORE PUZZLES', 128, 116, '#5ff0ff', { align: 'center' }); txt('A: START', 128, 132, '#fff', { align: 'center' }); return; }
      const S = 64, OX = 32, OY = 16, sw = VW / 3, sh = VH / 3;
      tiles.forEach((v, i) => { if (v === 8 && stage !== 'done') return; const x = OX + (i % 3) * S, y = OY + Math.floor(i / 3) * S; try { ctx.drawImage(img, (v % 3) * sw, Math.floor(v / 3) * sh, sw, sh, x, y, S - 1, S - 1); } catch (e) { hR(x, y, S - 1, S - 1, '#5a4a8a'); } });
      txt(`MOVES ${moves}`, 232, 40, '#fff', { align: 'center' }); txt('ARROWS', 232, 60, '#a8b0d8', { align: 'center' }); txt('SLIDE', 232, 70, '#a8b0d8', { align: 'center' });
      if (stage === 'done') { drawWindow(48, 90, 160, 40); txt(`SOLVED IN ${moves} MOVES!`, 128, 98, '#ffe040', { align: 'center' }); txt('+5 COINS', 128, 112, '#5ff0ff', { align: 'center' }); }
    },
  };
}

// ---------------- menus ----------------
function HouseScene(start = 0) { // eslint-disable-line no-func-assign
  const items = () => ["DINO'S SHOP", 'UPGRADE TREE', 'MINI-GAMES', 'GARDEN', 'PETS', 'PET SHOP', 'COSTUME SHOP', 'FILE STATS', 'SAVE CODE', 'CLOUD SAVE', "WALLYMAN'S DIARY", 'STATUE GARDEN', 'KITCHEN', 'CRAFTING BENCH', 'MAILBOX' + (unreadMail() ? ' (NEW!)' : ''), 'PHOTO SAFARI', 'FOSSIL MUSEUM', 'PET SHOW', 'WEATHER MACHINE', 'PHOTO PUZZLES'].concat(game.cleared[7] && !game.iron ? ['NEW GAME+'] : []).concat(['LEAVE']);
  let sel = start, t = 0, dom = false; const SHOW = 15;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++; if (dom) return; const it = items(); sel = Math.min(sel, it.length - 1);
      if (Input.pressed('down')) { sel = (sel + 1) % it.length; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + it.length - 1) % it.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || (Input.confirm() && it[sel] === 'LEAVE')) { go(() => MapScene()); return; }
      if (Input.confirm() && it[sel] === 'SAVE CODE') { Save.persist(); dom = true; codeBox('YOUR SAVE CODE - KEEP IT SAFE!', SaveCode.encode(game), null, () => { dom = false; }); return; }
      if (Input.confirm()) { Audio8.sfx('confirm'); const k = it[sel].startsWith('MAILBOX') ? 'MAILBOX' : it[sel]; go({ "DINO'S SHOP": () => ShopScene(), 'UPGRADE TREE': () => UpgradeScene(), 'MINI-GAMES': () => MiniGamesScene(), GARDEN: () => GardenScene(), PETS: () => PetScene(), 'PET SHOP': () => PetShopScene(), 'COSTUME SHOP': () => CostumeShopScene(), 'FILE STATS': () => StatsScene(), 'CLOUD SAVE': () => CloudScene(), "WALLYMAN'S DIARY": () => DiaryScene(), 'STATUE GARDEN': () => StatueGardenScene(), KITCHEN: () => KitchenScene(), 'CRAFTING BENCH': () => BenchScene(), MAILBOX: () => MailScene(), 'PHOTO SAFARI': () => SafariScene(), 'FOSSIL MUSEUM': () => MuseumScene(), 'PET SHOW': () => PetShowScene(), 'WEATHER MACHINE': () => WeatherMachineScene(), 'PHOTO PUZZLES': () => PhotoPuzzleScene(), 'NEW GAME+': () => PlusScene() }[k]); }
    },
    draw() {
      ctx.fillStyle = '#f0c890'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e0b478'; for (let x = 0; x < VW; x += 20) ctx.fillRect(x, 0, 2, 140);
      ctx.fillStyle = '#8a5a2a'; ctx.fillRect(0, 140, VW, 84); ctx.fillStyle = '#a06a34'; for (let x = 0; x < VW; x += 32) ctx.fillRect(x, 140, 30, 84);
      ctx.fillStyle = '#5ab0f0'; ctx.fillRect(170, 22, 60, 44); ctx.fillStyle = '#fff'; ctx.fillRect(170, 43, 60, 2); ctx.fillRect(199, 22, 2, 44); ctx.fillStyle = '#6a3a1a'; ctx.fillRect(168, 20, 64, 2); ctx.fillRect(168, 66, 64, 2);
      ctx.drawImage(Sprites.dino.r[(t >> 4) & 1], 210, 176);
      const q = PETS[game.petKind || heroOf()] || PETS.wally; ctx.drawImage(q.img[0], 196, 188 + ((t >> 4) & 1)); drawPetLook(petStage(game.petKind || heroOf()), 196, 188 + ((t >> 4) & 1), t);
      drawWally(180, 200, 'idle' + ((t >> 4) % 4), 1);
      drawWindow(8, 8, 150, 22); txt("DINO'S HOUSE", 83, 15, '#ffe040', { align: 'center' });
      ctx.drawImage(Sprites.coinIcon, 172, 76); txt('*' + pad(game.coins, 2), 179, 76, '#3a2010', { shadow: null });
      const it = items(), n = Math.min(SHOW, it.length), top = clamp(sel - 7, 0, Math.max(0, it.length - SHOW)); drawWindow(8, 34, 150, 12 + n * 12);
      for (let i = 0; i < n; i++) { const k = top + i, y = 40 + i * 12; txt(it[k], 26, y, k === sel ? '#ffe040' : '#fff'); if (k === sel) txt('>', 16 + ((t >> 3) & 1), y, '#ffe040'); }
      if (top > 0) txt('^', 148, 36, '#a8b0d8'); if (top + SHOW < it.length) txt('V', 148, 36 + n * 12, '#a8b0d8');
    },
  };
}
function MiniGamesScene(start = 0) { // eslint-disable-line no-func-assign
  const items = ['SLOT MACHINE (5 COINS)', 'MEMORY MATCH (10 COINS)', 'FISHING (3 COINS A CAST)', 'KART RACE (FREE)', 'BEAT TAPPER (3 COINS)', 'SNOWBALL FIGHT (3 COINS)', 'WHACK-A-GRUMBLE (3 COINS)', 'MINI GOLF (3 COINS)', 'PINBALL (3 COINS)', "HOOT'S QUIZ (FREE)", 'GARDEN DEFENCE (3 COINS)', 'CARD BATTLE (FREE)', 'GRUMBLE BOWLING (3 COINS)', 'PARTY BOARD (FREE)', 'ARCADE CORNER (2 COINS)', 'AIR HOCKEY (FREE)', 'BACK'];
  const cost = [0, 0, 0, 0, 3, 3, 3, 3, 3, 0, 3, 0, 3, 0, 2, 0];
  let sel = start, t = 0, msg = ''; const SHOW = 12;
  return {
    enter() { Audio8.play('carnival'); },
    update() {
      t++;
      if (Input.pressed('down')) { sel = (sel + 1) % items.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + items.length - 1) % items.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || (Input.confirm() && sel === items.length - 1)) { go(() => HouseScene(2)); return; }
      if (Input.confirm()) { if (game.coins < cost[sel]) { msg = 'NOT ENOUGH COINS!'; Audio8.sfx('bump'); return; } game.coins -= cost[sel]; Audio8.sfx('confirm'); go([() => SlotScene(), () => MemoryScene(), () => FishScene(), () => KartScene(), () => TapperPick(), () => SnowballScene(), () => WhackScene(), () => GolfScene(), () => PinballScene(), () => QuizScene(), () => DefenceScene(), () => CardBattleScene(), () => BowlingScene(), () => PartyBoardScene(), () => ArcadeScene(), () => HockeyScene()][sel]); }
    },
    draw() {
      drawParallax('carnival', t * 0.4);
      drawWindow(20, 18, 216, 26 + SHOW * 13); txt('MINI-GAMES', 128, 24, '#ffe040', { align: 'center' });
      const top = clamp(sel - 6, 0, items.length - SHOW);
      for (let i = 0; i < SHOW; i++) { const k = top + i, y = 40 + i * 13; txt(items[k], 40, y, k === sel ? '#ffe040' : '#fff'); if (k === sel) txt('>', 30 + ((t >> 3) & 1), y, '#ffe040'); }
      if (top > 0) txt('^', 224, 38, '#a8b0d8'); if (top + SHOW < items.length) txt('V', 224, 38 + (SHOW - 1) * 13, '#a8b0d8');
      ctx.drawImage(Sprites.coinIcon, 100, 207); txt('*' + pad(game.coins, 2), 107, 207, '#fff', { outline: '#101848' }); if (msg) txt(msg, 132, 207, '#ff8080', { outline: '#101848' });
    },
  };
}
function ChallengeScene(start = 0) { // eslint-disable-line no-func-assign
  const items = ['TIME ATTACK', 'BOSS RUSH', 'DAILY CHALLENGE', 'ENDLESS RUN', 'VERSUS', 'SURVIVAL ARENA', 'HARD REMIX', "DOUG'S STORY", 'ROGUELIKE TOWER', 'GOLDEN LEVELS', 'TUTORIAL', 'MIRROR MODE', 'PARTY MODE', 'SPEEDRUN', 'WEEKLY CHALLENGE', 'MEGA BOSS RUSH', 'IRON HERO', 'BACK'];
  const tips = ['RACE ANY LEVEL YOU HAVE BEATEN', 'EVERY BOSS BACK TO BACK!', "TODAY'S LEVEL WITH A TWIST", 'HOW FAR CAN YOU RUN?', 'TWO PLAYERS: RACE OR BATTLE', 'ENDLESS WAVES OF FOES', 'MEANER VERSIONS OF WALLY ISLAND', 'PLAY AS DOUG IN 3 NEW LEVELS', 'RANDOM FLOORS, UPGRADES, ONE LIFE', 'HUNT 100 GOLD COINS PER LEVEL', 'LEARN ALL THE MOVES', 'EVERY LEVEL FLIPPED AROUND', 'UP TO 4 PLAYERS, 3 MINI-GAMES', 'ONE TIMER FOR THE WHOLE GAME', '3 LEVELS, 1 RULE, NEW EVERY WEEK', 'EVERY BOSS IN THE GAME IN A ROW', 'ONE LIFE FOR THE WHOLE GAME', ''];
  const go_ = [() => TimeAttackSelect(), () => RushIntroScene(), () => DailyScene(), () => EndlessIntro(), () => VersusScene(), () => ArenaIntro(), () => RemixScene(), () => StoryMenu(Math.min(2, storyDone())), () => RogueIntro(), () => GoldScene(), () => startTutorial(false), () => MirrorScene(), () => PartyScene(), () => SpeedrunScene(), () => WeeklyScene(), () => MegaIntro(), () => IronScene()];
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

// ---------------- What's New, the Help Book ----------------
UPDATES.unshift(['1.3', ['FIXED: OLD FILES AFTER UPDATES', 'NEW ISLAND: HAUNTED HOLLOW', "NEW ISLAND: BUG'S-EYE GARDEN", "BARON'S REVENGE + A NEW ENDING", 'LEVEL MAKER: 15 NEW PIECES', 'IRON HERO MODE: ONE LIFE ONLY', 'MEGA BOSS RUSH: EVERY BOSS', 'CARD BATTLE AND PARTY BOARD', 'BOWLING AND AIR HOCKEY', 'ARCADE: BRICK BREAKER, SNAKE', 'FOSSIL MUSEUM AND PET SHOW', 'WEATHER MACHINE', 'PHOTO PUZZLES']]);
HELP_CH.push(['UPDATE 1.3', [
  [['HAUNTED HOLLOW: STAND IN', 'FRONT OF A MIRROR TO OPEN', 'THE SECRET WALL IT SHOWS.', 'WATCH OUT FOR THE CHAIRS!'], 'jump'],
  [["BUG'S-EYE GARDEN: RIDE THE", 'LADYBIRDS, BOUNCE ON DEW', 'DROPS AND STOMP THE ANTS', 'MARCHING FROM ANT HILLS.'], 'run'],
  [['FOSSILS: GROUND-POUND THE', 'CRACKED GROUND (OR CROUCH', 'ON IT) IN THE LOST LANDS', 'AND DINO VALLEY.'], 'fall'],
  [['THE WEATHER MACHINE IN', "DINO'S HOUSE SETS THE", 'WEATHER FOR OUTDOOR LEVELS', 'ONCE YOU HAVE SEEN IT.'], 'item'],
]]);

// the first title screen was built before these files loaded: rebuild it so the newest extras apply
if (typeof scene !== 'undefined' && scene && scene.isTitle) { scene = TitleScene(); if (scene.enter) scene.enter(); }
