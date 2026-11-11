'use strict';
// =====================================================================
// Batch I (part 2): the Pirate Cove map, airship fast travel, the
// tutorial prompt, Roguelike Tower / Golden Levels menus, the garden,
// pet tricks page, new mini-games, the Hero Maker, cloud saves,
// Level of the Week, the touch-controls editor and Level Maker parts.
// =====================================================================

// ---------------- Pirate Cove on the world map ----------------
NODES5.push({ x: 240, y: 186, kind: 'portal', to: 5, name: 'SHIP TO PIRATE COVE' }); EDGES5.push([4, 11]);
const NODES6 = [
  { x: 26, y: 178, kind: 'portal', to: 4, name: 'SHIP TO CRYSTAL ISLE' },
  { x: 66, y: 150, kind: 'level', li: 51 }, { x: 112, y: 170, kind: 'level', li: 52 }, { x: 158, y: 146, kind: 'level', li: 53 }, { x: 204, y: 164, kind: 'level', li: 54 }, { x: 196, y: 96, kind: 'castle', li: 55 },
];
const EDGES6 = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]];
const Island6 = makeIsland(NODES6, [[90, 160, 26], [136, 158, 26], [182, 150, 24], [200, 124, 26], [150, 110, 22], [110, 120, 20]], 191, (f, near, ch, r) => {
  let col = null;
  if (f > 1.9) {
    col = ch ? [90, 170, 80] : [104, 188, 92];
    if (near(5, 34)) col = ch ? [70, 60, 90] : [86, 74, 110];
    if (near(4, 26)) col = ch ? [80, 70, 80] : [100, 90, 100];
    if (near(1, 24) || near(3, 22)) col = ch ? [240, 220, 160] : [250, 232, 176];
  } else if (f > 1.45) col = [244, 226, 168];
  else if (f > 1.25) col = [90, 210, 220];
  if (f > 6 && r() < 0.05) col = [40, 120, 50];
  return col;
});
WORLDS.push({ nodes: () => NODES6, edges: () => EDGES6, isle: () => Island6, name: 'PIRATE COVE', sea: ['#0a4a6a', '#1a6a8a'], key: 'node6' });
const worldOpen = (w) => [true, !!game.cleared[7], !!game.cleared[14], !!game.cleared[20], !!game.cleared[27], !!game.cleared[44], !!game.cleared[55], !!game.cleared[62], !!game.cleared[69], !!game.cleared[78], !!game.cleared[85], !!game.cleared[91], !!game.cleared[105], !!game.cleared[111]][w];

// ---------------- map: airship fast travel and the tutorial offer ----------------
function AirshipScene(to) {
  let t = 0;
  return {
    enter() { Audio8.play('sky'); },
    update() { t++; if (t > 150 || (t > 30 && Input.confirm())) go(() => MapScene()); },
    draw() {
      drawParallax('sky', t * 3);
      const x = 40 + t * 1.2, y = 96 + Math.sin(t * 0.06) * 6;
      for (let yy = -9; yy <= 9; yy++) { const h = Math.round(Math.sqrt(81 - yy * yy) * 3.4); hR(x - h, y + yy, h * 2, 1, yy < -4 ? '#ffb0b8' : '#e83850'); }
      hR(x - 14, y + 11, 28, 8, '#1a1020'); hR(x - 13, y + 12, 26, 6, '#a06a30'); hR(x - 30, y - 1, 4, 3, '#c0c8d8'); hR(x - 34 - ((t >> 2) & 1) * 2, y - 3, 3, 7, '#ffffff');
      drawWally(x + 2, y + 12, 'idle' + ((t >> 4) % 4), 1, { sx: 0.6, sy: 0.6 });
      drawWindow(48, 170, 160, 30); txt('AIRSHIP TO', 128, 176, '#a8b0d8', { align: 'center' }); txt(WORLDS[to].name, 128, 188, '#ffe040', { align: 'center' });
    },
  };
}
{
  const _Map = MapScene;
  MapScene = function (...a) { // eslint-disable-line no-func-assign
    const s = _Map(...a); if (!s.isMap) return s;
    const u = s.update, d = s.draw; let menu = null, ask = game && !game.tutorialAsked && game.players !== 2 && !game.cleared.some(Boolean), t = 0;
    s.update = function () {
      t++;
      if (ask) {
        if (t < 30) return;
        if (Input.confirm()) { ask = false; game.tutorialAsked = true; Save.persist(); Audio8.sfx('confirm'); go(() => startTutorial(true)); }
        else if (Input.pressed('back') || Input.pressed('run')) { ask = false; game.tutorialAsked = true; Save.persist(); Audio8.sfx('select'); }
        return;
      }
      if (menu) {
        const L = menu.list;
        if (Input.pressed('down')) { menu.sel = (menu.sel + 1) % L.length; Audio8.sfx('select'); }
        if (Input.pressed('up')) { menu.sel = (menu.sel + L.length - 1) % L.length; Audio8.sfx('select'); }
        if (Input.pressed('back') || Input.pressed('run') || Input.pressed('special')) { menu = null; Audio8.sfx('select'); return; }
        if (Input.confirm()) {
          const w = L[menu.sel]; menu = null;
          if (w === (game.world || 0)) { Audio8.sfx('bump'); return; }
          game.world = w; game[WORLDS[w].key] = Math.max(0, WORLDS[w].nodes().findIndex((n) => n.kind === 'portal')); Save.persist(); Audio8.sfx('secret'); go(() => AirshipScene(w));
        }
        return;
      }
      if (Input.pressed('special')) { const list = WORLDS.map((_, i) => i).filter(worldOpen); if (list.length > 1) { menu = { list, sel: Math.max(0, list.indexOf(game.world || 0)) }; Audio8.sfx('confirm'); } else Audio8.sfx('bump'); return; }
      return u.call(this);
    };
    s.draw = function () {
      d.call(this);
      if (WORLDS.filter((_, i) => worldOpen(i)).length > 1 && !menu && !ask) txt('S: AIRSHIP', 250, 26, '#a8b0d8', { align: 'right', outline: '#101848' });
      if (menu) {
        drawWindow(56, 40, 144, 22 + menu.list.length * 12); txt('FLY THE AIRSHIP TO', 128, 46, '#ffe040', { align: 'center' });
        menu.list.forEach((w, i) => { const y = 60 + i * 12, on = i === menu.sel; txt(WORLDS[w].name, 80, y, on ? '#ffe040' : w === (game.world || 0) ? '#7880b0' : '#fff'); if (on) txt('>', 70 + ((t >> 3) & 1), y, '#ffe040'); });
      }
      if (ask && t >= 30) { drawWindow(36, 70, 184, 64); txt('NEW TO WALLYMAN WORLD?', 128, 78, '#ffe040', { align: 'center' }); txt('PLAY THE QUICK TUTORIAL?', 128, 92, '#fff', { align: 'center' }); txt('A: YES PLEASE   B: NO THANKS', 128, 112, '#5ff0ff', { align: 'center' }); }
    };
    return s;
  };
}
function startTutorial(file) { // returns the level scene
  if (!file) game = challengeGame();
  const s = new Play(TUTORIAL_LI, false); s.mode = { kind: 'tutorial', file: !!file }; return s;
}

// ---------------- Roguelike Tower ----------------
const rogueBest = () => lsJ('wallyman-rogue', 0) | 0;
function startRogue(floor, perks) { window.ROGUE_LEVEL = rogueDef(floor); if (floor === 1) game = challengeGame(); const s = new Play(93, false); s.mode = { kind: 'rogue', floor, perks }; return s; }
function RogueIntro() {
  let t = 0;
  return {
    enter() { Audio8.play('castle'); },
    update() { t++; if (Input.pressed('back') || Input.pressed('run')) { go(() => ChallengeScene(8)); return; } if (t > 20 && Input.confirm()) { Audio8.sfx('confirm'); go(() => startRogue(1, [])); } },
    draw() {
      drawParallax('castle', t * 0.4); drawWindow(24, 30, 208, 160);
      txt('ROGUELIKE TOWER', 128, 40, '#ff8080', { align: 'center', scale: 2, outline: '#3a0010' });
      ['EVERY FLOOR IS DIFFERENT.', 'BEAT A FLOOR, THEN PICK ONE', 'OF THREE UPGRADES TO KEEP.', '', 'YOU ONLY GET ONE LIFE!', 'HOW HIGH CAN YOU CLIMB?'].forEach((l, i) => txt(l, 128, 66 + i * 12, '#fff', { align: 'center' }));
      txt(`BEST: FLOOR ${rogueBest()}`, 128, 146, '#ffe040', { align: 'center' }); if ((t >> 4) & 1) txt('PRESS START', 128, 166, '#5ff0ff', { align: 'center' });
    },
  };
}
function RoguePick(floor, perks) {
  if (floor - 1 > rogueBest()) lsS('wallyman-rogue', floor - 1); if (floor - 1 >= 10) Ach.unlock('rogue10');
  let s = floor * 31 + perks.length * 7; const left = ROGUE_PERKS.filter((k) => !perks.includes(k.id)), opts = [];
  while (opts.length < Math.min(3, left.length)) { s = (s * 1103515245 + 12345) >>> 0; const k = left[s % left.length]; if (!opts.includes(k)) opts.push(k); }
  let sel = 0, t = 0;
  return {
    enter() { Audio8.play('victory'); },
    update() {
      t++;
      if (!opts.length) { if (t > 30 && Input.confirm()) go(() => startRogue(floor, perks)); return; }
      if (Input.pressed('down')) { sel = (sel + 1) % opts.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + opts.length - 1) % opts.length; Audio8.sfx('select'); }
      if (t > 30 && Input.confirm()) { const id = opts[sel].id; Audio8.sfx('power'); go(() => startRogue(floor, perks.concat([id]))); }
    },
    draw() {
      drawParallax('castle', t * 0.4); drawWindow(20, 20, 216, 184);
      txt(`FLOOR ${floor - 1} CLEARED!`, 128, 28, '#ffe040', { align: 'center', scale: 2 });
      txt(opts.length ? 'PICK AN UPGRADE:' : 'YOU HAVE EVERY UPGRADE!', 128, 54, '#fff', { align: 'center' });
      opts.forEach((k, i) => { const y = 72 + i * 30, on = i === sel; drawWindow(36, y - 4, 184, 26); txt(k.name, 128, y + 1, on ? '#ffe040' : '#fff', { align: 'center' }); txt(k.desc, 128, y + 11, '#a8b0d8', { align: 'center' }); if (on) txt('>', 42 + ((t >> 3) & 1), y + 5, '#ffe040'); });
      if (perks.length) txt('YOU HAVE: ' + perks.map((id) => ROGUE_PERKS.find((k) => k.id === id).name.split(' ')[0]).join(' '), 128, 172, '#5ff0ff', { align: 'center' });
    },
  };
}
function RogueResult(reached, perks) {
  let t = 0; const rec = reached > rogueBest(); if (rec) lsS('wallyman-rogue', reached); if (reached >= 10) Ach.unlock('rogue10');
  return {
    enter() { Audio8.play(rec ? 'victory' : 'gameover'); },
    update() { t++; if (t > 60 && (Input.confirm() || Input.pressed('back'))) go(() => RogueIntro()); },
    draw() { drawParallax('castle', t * 0.2); drawWindow(40, 60, 176, 100); txt('TOWER OVER', 128, 70, '#ff8080', { align: 'center', scale: 2 }); txt(`FLOORS CLEARED: ${reached}`, 128, 96, '#fff', { align: 'center' }); txt(`UPGRADES: ${perks.length}`, 128, 110, '#fff', { align: 'center' }); if (rec) txt('NEW RECORD!', 128, 126, (t >> 3) & 1 ? '#ffe040' : '#ff8040', { align: 'center' }); if (t > 60 && (t >> 4) & 1) txt('PRESS START', 128, 144, '#5ff0ff', { align: 'center' }); },
  };
}

// ---------------- Golden Levels ----------------
function GoldScene(start = 0, msg = '') {
  let sel = start, t = 0; const best = lsJ('wallyman-gold', {});
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (Input.pressed('back') || Input.pressed('run')) { go(() => ChallengeScene(9)); return; }
      if (Input.pressed('down')) { sel = (sel + 1) % GOLD_LV.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + GOLD_LV.length - 1) % GOLD_LV.length; Audio8.sfx('select'); }
      if (Input.confirm()) { const li = GOLD_LV[sel], keep = sel; if (!goldOpen(li)) { Audio8.sfx('bump'); msg = "BEAT THIS ISLAND'S CASTLE FIRST!"; return; } Audio8.sfx('confirm'); game = challengeGame(); go(() => { const s = new Play(li, false); s.mode = { kind: 'gold', sel: keep }; return s; }); }
    },
    draw() {
      ctx.fillStyle = '#3a2a08'; ctx.fillRect(0, 0, VW, VH); drawParallax('desert', t * 0.3); ctx.fillStyle = 'rgba(255,200,40,0.18)'; ctx.fillRect(0, 0, VW, VH);
      drawWindow(16, 8, 224, 208); txt('GOLDEN LEVELS', 128, 14, '#ffe040', { align: 'center', outline: '#5a3a08' }); txt('FIND ALL 100 GOLD COINS!', 128, 26, '#fff', { align: 'center' });
      const top = clamp(sel - 6, 0, GOLD_LV.length - 13);
      for (let i = 0; i < 13; i++) { const k = top + i, li = GOLD_LV[k]; if (li === undefined) break; const y = 42 + i * 11, on = k === sel, open = goldOpen(li); txt(open ? `${levelTag(li)}. ${LEVELS[li].name}`.slice(0, 22) : `${levelTag(li)}. ?????`, 34, y, on ? '#ffe040' : open ? '#fff' : '#7880b0'); if (best[li] !== undefined) txt(`${best[li]}/100`, 230, y, best[li] >= 100 ? '#ffe040' : '#5ff0ff', { align: 'right' }); if (on) txt('>', 24 + ((t >> 3) & 1), y, '#ffe040'); }
      txt(msg || 'A: PLAY   B: BACK', 128, 200, msg ? '#ff8080' : '#a8b0d8', { align: 'center' });
    },
  };
}
function GoldResult(li, got, total, won) {
  const best = lsJ('wallyman-gold', {}), rec = got > (best[li] | 0); if (rec) { best[li] = got; lsS('wallyman-gold', best); }
  let t = 0;
  return {
    enter() { Audio8.play(got >= total ? 'victory' : 'clear'); },
    update() { t++; if (t > 60 && (Input.confirm() || Input.pressed('back'))) go(() => GoldScene(Math.max(0, GOLD_LV.indexOf(li)))); },
    draw() { drawParallax('desert', t * 0.2); drawWindow(40, 60, 176, 100); txt(won ? 'GOLD RUN DONE!' : 'GOLD RUN OVER', 128, 70, '#ffe040', { align: 'center', scale: 2 }); txt(LEVELS[li].name, 128, 92, '#fff', { align: 'center' }); txt(`GOLD COINS: ${got}/${total}`, 128, 106, '#ffe040', { align: 'center' }); if (rec) txt('NEW BEST!', 128, 122, (t >> 3) & 1 ? '#ffe040' : '#ff8040', { align: 'center' }); if (t > 60 && (t >> 4) & 1) txt('PRESS START', 128, 144, '#5ff0ff', { align: 'center' }); },
  };
}

// ---------------- challenges menu ----------------
function ChallengeScene(start = 0) { // eslint-disable-line no-func-assign
  const items = ['TIME ATTACK', 'BOSS RUSH', 'DAILY CHALLENGE', 'ENDLESS RUN', 'VERSUS', 'SURVIVAL ARENA', 'HARD REMIX', "DOUG'S STORY", 'ROGUELIKE TOWER', 'GOLDEN LEVELS', 'TUTORIAL', 'BACK'];
  const tips = ['RACE ANY LEVEL YOU HAVE BEATEN', 'EVERY BOSS BACK TO BACK!', "TODAY'S LEVEL WITH A TWIST", 'HOW FAR CAN YOU RUN?', 'TWO PLAYERS: RACE OR BATTLE', 'ENDLESS WAVES OF FOES', 'MEANER VERSIONS OF WALLY ISLAND', 'PLAY AS DOUG IN 3 NEW LEVELS', 'RANDOM FLOORS, UPGRADES, ONE LIFE', 'HUNT 100 GOLD COINS PER LEVEL', 'LEARN ALL THE MOVES', ''];
  const go_ = [() => TimeAttackSelect(), () => RushIntroScene(), () => DailyScene(), () => EndlessIntro(), () => VersusScene(), () => ArenaIntro(), () => RemixScene(), () => StoryMenu(Math.min(2, storyDone())), () => RogueIntro(), () => GoldScene(), () => startTutorial(false)];
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
      drawParallax('castle', t * 0.4);
      drawLogo(2);
      drawWindow(48, 72, 160, 136);
      txt('CHALLENGES', 128, 77, '#ffe040', { align: 'center' });
      items.forEach((s, i) => { const y = 88 + i * 10; txt(s, 74, y, i === sel ? '#ffe040' : '#fff'); if (i === sel) txt('>', 62 + ((t >> 3) & 1), y, '#ffe040'); });
      txt(tips[sel], 128, 212, '#fff', { align: 'center', outline: '#101848' });
    },
  };
}

// ---------------- Dino's House: garden, pets and cloud saves ----------------
function HouseScene(start = 0) { // eslint-disable-line no-func-assign
  const items = () => ["DINO'S SHOP", 'UPGRADE TREE', 'MINI-GAMES', 'GARDEN', 'PETS', 'FILE STATS', 'SAVE CODE', 'CLOUD SAVE'].concat(game.cleared[7] ? ['NEW GAME+'] : []).concat(['LEAVE']);
  let sel = start, t = 0, dom = false;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++; if (dom) return; const it = items();
      if (Input.pressed('down')) { sel = (sel + 1) % it.length; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + it.length - 1) % it.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || (Input.confirm() && it[sel] === 'LEAVE')) { go(() => MapScene()); return; }
      if (Input.confirm() && it[sel] === 'SAVE CODE') { Save.persist(); dom = true; codeBox('YOUR SAVE CODE - KEEP IT SAFE!', SaveCode.encode(game), null, () => { dom = false; }); return; }
      if (Input.confirm()) { Audio8.sfx('confirm'); go({ "DINO'S SHOP": () => ShopScene(), 'UPGRADE TREE': () => UpgradeScene(), 'MINI-GAMES': () => MiniGamesScene(), GARDEN: () => GardenScene(), PETS: () => PetScene(), 'FILE STATS': () => StatsScene(), 'CLOUD SAVE': () => CloudScene(), 'NEW GAME+': () => PlusScene() }[it[sel]]); }
    },
    draw() {
      ctx.fillStyle = '#f0c890'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e0b478'; for (let x = 0; x < VW; x += 20) ctx.fillRect(x, 0, 2, 140);
      ctx.fillStyle = '#8a5a2a'; ctx.fillRect(0, 140, VW, 84); ctx.fillStyle = '#a06a34'; for (let x = 0; x < VW; x += 32) ctx.fillRect(x, 140, 30, 84);
      ctx.fillStyle = '#5ab0f0'; ctx.fillRect(170, 22, 60, 44); ctx.fillStyle = '#fff'; ctx.fillRect(170, 43, 60, 2); ctx.fillRect(199, 22, 2, 44); ctx.fillStyle = '#6a3a1a'; ctx.fillRect(168, 20, 64, 2); ctx.fillRect(168, 66, 64, 2);
      ctx.drawImage(Sprites.dino.r[(t >> 4) & 1], 210, 176);
      const q = PETS[heroOf()] || PETS.wally; ctx.drawImage(q.img[0], 196, 188 + ((t >> 4) & 1));
      drawWally(180, 200, 'idle' + ((t >> 4) % 4), 1);
      drawWindow(8, 8, 150, 22); txt("DINO'S HOUSE", 83, 15, '#ffe040', { align: 'center' });
      ctx.drawImage(Sprites.coinIcon, 172, 76); txt('*' + pad(game.coins, 2), 179, 76, '#3a2010', { shadow: null });
      const it = items(); drawWindow(8, 36, 150, 12 + it.length * 10);
      it.forEach((s, i) => { const y = 42 + i * 10; txt(s, 26, y, i === sel ? '#ffe040' : '#fff'); if (i === sel) txt('>', 16 + ((t >> 3) & 1), y, '#ffe040'); });
    },
  };
}
const SEEDS = { coin: { name: 'COIN SEED', price: 5, hours: 8, col: '#ffd040' }, fruit: { name: 'PET FRUIT', price: 8, hours: 12, col: '#ff5060' }, star: { name: 'STAR SEED', price: 25, hours: 36, col: '#c070ff' }, carrot: { name: 'CARROT', price: 3, hours: 2, col: '#ff8a20', veg: true }, tomato: { name: 'TOMATO', price: 4, hours: 3, col: '#ff3030', veg: true }, pumpkin: { name: 'PUMPKIN', price: 6, hours: 5, col: '#ffa040', veg: true } };
const SEED_IDS = Object.keys(SEEDS);
function GardenScene() {
  if (!game.garden) game.garden = [null, null, null, null, null, null];
  let sel = 0, seed = 0, t = 0, msg = '', msgT = 0;
  const now = () => Date.now() + (window.GARDEN_SKIP || 0), day = () => new Date(now()).toDateString();
  const grow = (pl) => Math.min(1, (now() - pl.at + (pl.boost || 0) * 3600000) / (SEEDS[pl.seed].hours * 3600000));
  const say = (s) => { msg = s; msgT = 150; };
  return {
    enter() { Audio8.play('grass'); },
    update() {
      t++; if (msgT) msgT--;
      if (Input.pressed('back') || Input.pressed('run')) { Save.persist(); go(() => HouseScene(3)); return; }
      if (Input.pressed('right')) { sel = (sel + 1) % 6; Audio8.sfx('select'); } if (Input.pressed('left')) { sel = (sel + 5) % 6; Audio8.sfx('select'); }
      const pl = game.garden[sel];
      if (!pl && (Input.pressed('up') || Input.pressed('down'))) { seed = (seed + (Input.pressed('down') ? 1 : SEED_IDS.length - 1)) % SEED_IDS.length; Audio8.sfx('select'); }
      if (!Input.confirm()) return;
      if (!pl) { const S = SEEDS[SEED_IDS[seed]]; if (game.coins < S.price) { say('NOT ENOUGH COINS!'); Audio8.sfx('bump'); return; } game.coins -= S.price; game.garden[sel] = { seed: SEED_IDS[seed], at: now(), boost: 0, wet: '' }; Audio8.sfx('sprout'); say('PLANTED A ' + S.name + '!'); Save.persist(); return; }
      if (grow(pl) < 1) { if (pl.wet === day()) { say('ALREADY WATERED TODAY!'); Audio8.sfx('bump'); return; } pl.wet = day(); pl.boost = (pl.boost || 0) + 3; Audio8.sfx('swim'); say('WATERED! IT GROWS 3 HOURS FASTER'); Save.persist(); return; }
      // harvest
      game.garden[sel] = null; game.harvests = (game.harvests || 0) + 1; if (game.harvests >= 5) Ach.unlock('gardener'); Audio8.sfx('oneup');
      if (pl.seed === 'coin') { game.coins += 15; while (game.coins >= 100) { game.coins -= 100; game.lives++; } say('+15 COINS!'); }
      else if (SEEDS[pl.seed].veg) { game.pantry = game.pantry || {}; game.pantry[pl.seed] = (game.pantry[pl.seed] | 0) + 2; say(`+2 ${SEEDS[pl.seed].name}S FOR THE KITCHEN!`); }
      else if (pl.seed === 'fruit') { const k = heroOf(); game.petXP = game.petXP || {}; game.petXP[k] = (game.petXP[k] | 0) + 3; say(`${(PETS[k] || PETS.wally).name} ATE IT! +3 PET XP`); }
      else { game.hats = game.hats || ['none']; const left = ['pirate', 'flower', 'viking'].filter((h) => !game.hats.includes(h)); if (left.length) { const h = left[(game.harvests * 7) % left.length]; game.hats.push(h); say('A RARE HAT: ' + HAT_LIST.find((k) => k.id === h).name + '!'); } else { game.lives += 2; say('+2 LIVES!'); } }
      Save.persist();
    },
    draw() {
      drawParallax('grass', t * 0.2); hR(0, 150, VW, 74, '#7a4a20'); hR(0, 150, VW, 4, '#5ad84a');
      drawWindow(8, 6, 240, 22); txt('GARDEN', 40, 13, '#ffe040'); ctx.drawImage(Sprites.coinIcon, 186, 13); txt('*' + pad(game.coins, 2), 193, 13, '#fff');
      for (let i = 0; i < 6; i++) {
        const x = 18 + i * 38, y = 156, pl = game.garden[i], on = i === sel;
        hR(x, y, 32, 18, on ? '#ffe040' : '#3a2010'); hR(x + 2, y + 2, 28, 14, '#5a3418');
        if (pl) { const g = grow(pl), S = SEEDS[pl.seed], h = Math.round(4 + g * 26); hR(x + 15, y - h, 2, h, '#2a9a30'); if (g > 0.3) hR(x + 10, y - h * 0.6, 6, 3, '#3aba40'); if (g > 0.6) hR(x + 17, y - h * 0.8, 6, 3, '#3aba40'); if (g >= 1) { hR(x + 11, y - h - 7, 10, 9, '#1a1020'); hR(x + 12, y - h - 6, 8, 7, S.col); if ((t >> 4) & 1) txt('!', x + 14, y - h - 20, '#ffe040', { outline: '#1a1020' }); } if (pl.wet && pl.wet === new Date(Date.now() + (window.GARDEN_SKIP || 0)).toDateString()) hR(x + 4, y + 12, 24, 2, '#5ab0f0'); }
        if (on) txt('^', x + 13, y + 22, '#ffe040');
      }
      const pl = game.garden[sel]; drawWindow(16, 34, 224, 70);
      if (!pl) { const S = SEEDS[SEED_IDS[seed]]; txt('EMPTY PLOT', 128, 40, '#fff', { align: 'center' }); txt(S.name, 128, 54, '#ffe040', { align: 'center' }); txt(`COSTS ${S.price} COINS - READY IN ${S.hours} HOURS`, 128, 66, '#a8b0d8', { align: 'center' }); txt({ coin: 'GROWS 15 COINS', fruit: 'FEEDS YOUR PET (+3 PET XP)', star: 'GROWS A RARE HAT!' }[SEED_IDS[seed]], 128, 78, '#5ff0ff', { align: 'center' }); txt('UP/DOWN: SEED   A: PLANT', 128, 92, '#fff', { align: 'center' }); }
      else { const g = grow(pl), S = SEEDS[pl.seed]; txt(S.name, 128, 40, '#ffe040', { align: 'center' }); hR(60, 54, 136, 8, '#1a1020'); hR(61, 55, Math.round(134 * g), 6, g >= 1 ? '#ffe040' : '#5ae060'); const left = Math.max(0, Math.ceil((1 - g) * S.hours)); txt(g >= 1 ? 'READY! A: HARVEST' : `ABOUT ${left} HOUR${left === 1 ? '' : 'S'} TO GO`, 128, 68, '#fff', { align: 'center' }); if (g < 1) txt('A: WATER (ONCE A DAY, +3 HOURS)', 128, 82, '#5ff0ff', { align: 'center' }); }
      if (msgT) txt(msg, 128, 112, '#ffe040', { align: 'center', outline: '#101848' });
      txt('< >: PLOT   B: BACK', 128, 212, '#fff', { align: 'center', outline: '#3a2010' });
    },
  };
}
function PetScene() {
  let t = 0; const ids = HERO_IDS.filter((h) => PETS[h]);
  return {
    enter() { Audio8.play('map'); },
    update() { t++; if (Input.pressed('back') || Input.pressed('run') || Input.confirm()) go(() => HouseScene(4)); },
    draw() {
      ctx.fillStyle = '#f0e0b0'; ctx.fillRect(0, 0, VW, VH); drawWindow(8, 6, 240, 210); txt('PETS AND TRICKS', 128, 12, '#ffe040', { align: 'center' });
      const k = heroOf(), pd = PETS[k] || PETS.wally, lv = petLevel(k), xp = ((game.petXP || {})[k]) | 0, need = [0, 4, 10, 18, 18][lv];
      ctx.save(); ctx.translate(40, 34); ctx.scale(3, 3); ctx.drawImage(pd.img[0], 0, (t >> 4) & 1); ctx.restore();
      txt(pd.name, 120, 34, '#fff'); txt(`LEVEL ${lv}`, 120, 46, '#ffe040'); hR(120, 58, 110, 6, '#1a1020'); hR(121, 59, Math.round(108 * (lv >= 4 ? 1 : Math.min(1, xp / need))), 4, '#5ae060'); txt(lv >= 4 ? 'MAX LEVEL!' : `XP ${xp}/${need}`, 120, 68, '#a8b0d8');
      PET_TRICKS.forEach((s, i) => { const y = 96 + i * 22, on = lv > i; txt((on ? '# ' : '- ') + `LEVEL ${i + 1}`, 20, y, on ? '#ffe040' : '#7880b0'); txt(s, 20, y + 10, on ? '#fff' : '#7880b0'); });
      txt('PETS EARN XP WHEN YOU CLEAR A LEVEL', 128, 186, '#a8b0d8', { align: 'center' }); txt('PET FRUIT FROM THE GARDEN GIVES +3', 128, 196, '#a8b0d8', { align: 'center' });
    },
  };
}

// ---------------- cloud saves (Firebase) ----------------
const CloudSave = (() => {
  const cfg = window.WALLYMAN_ONLINE || {}, on = !!(cfg.projectId && cfg.apiKey && window.fetch);
  const base = on ? `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/databases/(default)/documents/saves` : '';
  const key = () => `key=${encodeURIComponent(cfg.apiKey)}`;
  const newKey = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; const r = crypto.getRandomValues(new Uint32Array(10)); for (const n of r) s += A[n % A.length]; return s; };
  async function upload(g) { const k = game.cloudKey || newKey(); const res = await fetch(`${base}/${k}?${key()}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { code: { stringValue: SaveCode.encode(g) }, ts: { integerValue: String(Date.now()) } } }) }); if (!res.ok) throw new Error('HTTP ' + res.status); return k; }
  async function download(k) { const res = await fetch(`${base}/${encodeURIComponent(String(k).toUpperCase().replace(/[^A-Z0-9]/g, ''))}?${key()}`); if (!res.ok) throw new Error('HTTP ' + res.status); const f = (await res.json()).fields || {}; return SaveCode.decode((f.code && f.code.stringValue) || ''); }
  return { on, upload, download };
})();
function CloudScene() {
  let sel = 0, t = 0, msg = CloudSave.on ? '' : 'CLOUD SAVES NEED THE FIREBASE SETTINGS', busy = false, dom = false;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++; if (dom || busy) return;
      if (Input.pressed('back') || Input.pressed('run')) { go(() => HouseScene(7)); return; }
      if (Input.pressed('down') || Input.pressed('up')) { sel = 1 - sel; Audio8.sfx('select'); }
      if (!Input.confirm() || !CloudSave.on) return;
      if (sel === 0) { busy = true; msg = 'UPLOADING...'; Save.persist(); CloudSave.upload(game).then((k) => { game.cloudKey = k; Save.persist(); msg = 'SAVED! YOUR KEY: ' + k; busy = false; Audio8.sfx('check'); }, () => { msg = 'COULD NOT REACH THE SERVER'; busy = false; }); }
      else { dom = true; textBox('TYPE YOUR CLOUD KEY', 'e.g. ABCD23EFGH', (k) => { dom = false; if (!k) return; busy = true; msg = 'LOADING...'; CloudSave.download(k).then((g) => { busy = false; if (!g) { msg = 'THAT KEY DID NOT WORK'; return; } const i = Save.slots.indexOf(game); g.cloudKey = String(k).toUpperCase(); if (i >= 0) Save.slots[i] = g; game = g; Save.persist(); msg = 'LOADED INTO THIS FILE!'; Audio8.sfx('oneup'); }, () => { busy = false; msg = 'THAT KEY DID NOT WORK'; }); }); }
    },
    draw() {
      drawParallax('sky', t * 0.3); drawWindow(20, 30, 216, 150);
      txt('CLOUD SAVE', 128, 38, '#ffe040', { align: 'center', scale: 2 });
      ['UPLOAD THIS FILE', 'DOWNLOAD WITH A KEY'].forEach((s, i) => { const y = 70 + i * 16; txt(s, 60, y, i === sel ? '#ffe040' : '#fff'); if (i === sel) txt('>', 48 + ((t >> 3) & 1), y, '#ffe040'); });
      ['UPLOAD GIVES YOU A KEY. TYPE IT', 'ON ANOTHER DEVICE TO CARRY ON.', 'KEEP YOUR KEY SECRET!'].forEach((l, i) => txt(l, 128, 112 + i * 10, '#a8b0d8', { align: 'center' }));
      if (game.cloudKey) txt('THIS FILE: ' + game.cloudKey, 128, 146, '#5ff0ff', { align: 'center' });
      if (msg) txt(msg, 128, 162, '#ffe040', { align: 'center' });
    },
  };
}

// ---------------- mini-games: rhythm, snowball fight, whack-a-grumble ----------------
function MiniGamesScene(start = 0) { // eslint-disable-line no-func-assign
  const items = ['SLOT MACHINE (5 COINS)', 'MEMORY MATCH (10 COINS)', 'FISHING (3 COINS A CAST)', 'KART RACE (FREE)', 'BEAT TAPPER (3 COINS)', 'SNOWBALL FIGHT (3 COINS)', 'WHACK-A-GRUMBLE (3 COINS)', 'BACK'];
  const cost = [0, 0, 0, 0, 3, 3, 3];
  let sel = start, t = 0, msg = '';
  return {
    enter() { Audio8.play('carnival'); },
    update() {
      t++;
      if (Input.pressed('down')) { sel = (sel + 1) % items.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + items.length - 1) % items.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || (Input.confirm() && sel === items.length - 1)) { go(() => HouseScene(2)); return; }
      if (Input.confirm()) { if (game.coins < cost[sel]) { msg = 'NOT ENOUGH COINS!'; Audio8.sfx('bump'); return; } game.coins -= cost[sel]; Audio8.sfx('confirm'); go([() => SlotScene(), () => MemoryScene(), () => FishScene(), () => KartScene(), () => RhythmScene(), () => SnowballScene(), () => WhackScene()][sel]); }
    },
    draw() {
      drawParallax('carnival', t * 0.4);
      drawWindow(20, 40, 216, 130); txt('MINI-GAMES', 128, 46, '#ffe040', { align: 'center' });
      items.forEach((s, i) => { const y = 62 + i * 12; txt(s, 40, y, i === sel ? '#ffe040' : '#fff'); if (i === sel) txt('>', 30 + ((t >> 3) & 1), y, '#ffe040'); });
      ctx.drawImage(Sprites.coinIcon, 100, 176); txt('*' + pad(game.coins, 2), 107, 176, '#fff', { outline: '#101848' }); if (msg) txt(msg, 128, 190, '#ff8080', { align: 'center', outline: '#101848' });
    },
  };
}
const payCoins = (n) => { game.coins += n; while (game.coins >= 100) { game.coins -= 100; game.lives++; } Save.persist(); };
function RhythmScene(song = 'bossbeat') {
  const LANES = ['left', 'jump', 'right'], LBL = ['<', 'A', '>'], HITY = 176, SPEED = 34; // pixels per beat
  const notes = []; let s = 77 + [...song].reduce((a, c) => a + c.charCodeAt(0) * 7, 0); for (let b = 4; b < 52; b += 0.5) { s = (s * 1103515245 + 12345) >>> 0; if ((b % 1 === 0 && s % 10 < 7) || (b % 1 && s % 10 < 3)) notes.push({ b, lane: (s >> 8) % 3, hit: 0 }); }
  let t = 0, score = 0, combo = 0, best = 0, judge = '', judgeT = 0, done = false, t0 = null; const flash = [0, 0, 0];
  const beat = () => { const st = Audio8.songStep(); if (st >= 0 && Audio8.current() === song) return st / 4; if (t0 === null) t0 = t; return (t - t0) / 30; };
  return {
    enter() { Audio8.stop(); Audio8.play(song); },
    update() {
      t++; if (judgeT) judgeT--; for (let i = 0; i < 3; i++) if (flash[i]) flash[i]--;
      if (done) { if (t > 60 && (Input.confirm() || Input.pressed('back'))) go(() => MiniGamesScene(4)); return; }
      if (Input.pressed('back')) { go(() => MiniGamesScene(4)); return; }
      const b = beat();
      LANES.forEach((k, i) => {
        if (!Input.pressed(k)) return; flash[i] = 8;
        let best1 = null; for (const n of notes) if (!n.hit && n.lane === i && Math.abs(n.b - b) < 0.35 && (!best1 || Math.abs(n.b - b) < Math.abs(best1.b - b))) best1 = n;
        if (!best1) { combo = 0; judge = 'MISS'; judgeT = 30; Audio8.sfx('bump'); return; }
        const e = Math.abs(best1.b - b); best1.hit = 1; combo++; best = Math.max(best, combo); const pts = e < 0.12 ? 100 : 50; score += pts + combo * 2; judge = e < 0.12 ? 'PERFECT!' : 'GOOD'; judgeT = 30; Audio8.sfx(e < 0.12 ? 'coin' : 'select');
      });
      for (const n of notes) if (!n.hit && b - n.b > 0.4) { n.hit = -1; combo = 0; judge = 'MISS'; judgeT = 30; }
      if (b > 54) { done = true; t = 0; const coins = Math.floor(score / 400); payCoins(coins); this.coins = coins; Audio8.play('victory'); }
    },
    draw() {
      drawParallax('neon', t * 0.6); const b = beat();
      for (let i = 0; i < 3; i++) { const x = 68 + i * 44; hR(x, 20, 32, 180, 'rgba(10,10,40,0.6)'); hR(x, HITY - 2, 32, 4, flash[i] ? '#ffe040' : '#5a5a90'); txt(LBL[i], x + 16, HITY + 8, '#fff', { align: 'center', outline: '#101848' }); }
      for (const n of notes) { if (n.hit) continue; const y = HITY - (n.b - b) * SPEED; if (y < 10 || y > HITY + 20) continue; const x = 68 + n.lane * 44; hR(x + 4, y - 5, 24, 10, '#1a1020'); hR(x + 5, y - 4, 22, 8, ['#ff40c0', '#5ff0ff', '#ffe040'][n.lane]); }
      drawWindow(4, 2, 248, 16); txt(`SCORE ${score}`, 10, 6, '#ffe040'); txt(`COMBO ${combo}`, 246, 6, '#fff', { align: 'right' });
      if (judgeT) txt(judge, 128, 100, judge === 'MISS' ? '#ff6060' : '#5ae060', { align: 'center', scale: 2, outline: '#101848' });
      if (b < 4 && !done) txt('TAP ON THE BEAT!', 128, 70, '#fff', { align: 'center', outline: '#101848' });
      if (done) { drawWindow(48, 70, 160, 70); txt('ENCORE!', 128, 78, '#ffe040', { align: 'center', scale: 2 }); txt(`SCORE ${score}  BEST COMBO ${best}`, 128, 102, '#fff', { align: 'center' }); txt(`+${this.coins || 0} COINS`, 128, 116, '#5ff0ff', { align: 'center' }); }
    },
  };
}
function SnowballScene() {
  const me = { x: 40, y: 170, vy: 0, hit: 0, cool: 0 }, foes = [0, 1, 2].map((i) => ({ x: 170 + i * 26, y: 170, cool: 60 + i * 40, hit: 0, bob: i })), balls = [];
  let t = 0, mine = 0, theirs = 0, done = false, won = false;
  return {
    enter() { Audio8.play('snow'); },
    update() {
      t++;
      if (done) { if (t > 60 && (Input.confirm() || Input.pressed('back'))) go(() => MiniGamesScene(5)); return; }
      if (Input.pressed('back')) { go(() => MiniGamesScene(5)); return; }
      const dir = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0); me.x = clamp(me.x + dir * 1.6, 12, 110);
      if (Input.pressed('jump') && me.y >= 170) me.vy = -4.6; me.vy += 0.25; me.y = Math.min(170, me.y + me.vy);
      if (me.cool > 0) me.cool--; if (me.hit > 0) me.hit--;
      if (Input.pressed('run') && !me.cool) { me.cool = 22; balls.push({ x: me.x + 8, y: me.y - 16, vx: 3.2, vy: -2.4, mine: true }); Audio8.sfx('swoop'); }
      for (const f of foes) { if (f.hit > 0) f.hit--; if (--f.cool <= 0) { f.cool = 70 + ((t * 13 + f.bob * 29) % 60); const d = me.x - f.x, vx = -2.4 - ((t + f.bob) % 3) * 0.4; balls.push({ x: f.x, y: f.y - 14, vx, vy: d / vx * 0.12 - 2.6, mine: false }); } }
      for (const b of balls) { b.x += b.vx; b.y += b.vy; b.vy += 0.12; if (b.mine) { for (const f of foes) if (!b.gone && Math.abs(b.x - f.x) < 9 && b.y > f.y - 20 && b.y < f.y) { b.gone = 1; f.hit = 30; mine++; Audio8.sfx('stomp'); } } else if (!b.gone && Math.abs(b.x - me.x) < 8 && b.y > me.y - 22 && b.y < me.y && !me.hit) { b.gone = 1; me.hit = 40; theirs++; Audio8.sfx('hurt'); } if (b.y > 178) b.gone = 1; }
      for (let i = balls.length - 1; i >= 0; i--) if (balls[i].gone) balls.splice(i, 1);
      if (mine >= 10 || theirs >= 10) { done = true; won = mine >= 10; t = 0; if (won) payCoins(15); Audio8.play(won ? 'victory' : 'gameover'); }
    },
    draw() {
      drawParallax('snow', t * 0.2); hR(0, 170, VW, 54, '#ffffff'); hR(120, 150, 12, 20, '#e0f0ff');
      drawWally(me.x, me.y, me.hit && (t >> 2) & 1 ? 'hurt' : me.y < 170 ? 'jump' : 'idle' + ((t >> 4) % 4), 1);
      for (const f of foes) { ctx.save(); if (f.hit && (t >> 2) & 1) ctx.globalAlpha = 0.4; ctx.drawImage(Sprites.grumble[(t >> 4) & 1], f.x - 8, f.y - 16); ctx.restore(); }
      for (const b of balls) { hR(b.x - 3, b.y - 3, 6, 6, '#a0b8d0'); hR(b.x - 2, b.y - 2, 4, 4, '#ffffff'); }
      drawWindow(4, 2, 248, 16); txt(`YOU ${mine}/10`, 10, 6, '#ffe040'); txt(`GRUMBLES ${theirs}/10`, 246, 6, '#fff', { align: 'right' });
      if (t < 120 && !done) txt('B: THROW   A: JUMP   < >: MOVE', 128, 40, '#fff', { align: 'center', outline: '#101848' });
      if (done) { drawWindow(48, 70, 160, 60); txt(won ? 'YOU WIN!' : 'SNOWED UNDER!', 128, 80, won ? '#ffe040' : '#ff8080', { align: 'center', scale: 2 }); txt(won ? '+15 COINS' : 'TRY AGAIN!', 128, 104, '#5ff0ff', { align: 'center' }); }
    },
  };
}
function WhackScene() {
  const holes = Array.from({ length: 9 }, () => ({ k: null, t: 0, up: 0 }));
  let cx = 1, cy = 1, t = 0, time = 40 * 60, score = 0, done = false, bonk = 0;
  return {
    enter() { Audio8.play('carnival'); },
    update() {
      t++;
      if (done) { if (t > 60 && (Input.confirm() || Input.pressed('back'))) go(() => MiniGamesScene(6)); return; }
      if (Input.pressed('back')) { go(() => MiniGamesScene(6)); return; }
      if (Input.pressed('left')) cx = (cx + 2) % 3; if (Input.pressed('right')) cx = (cx + 1) % 3; if (Input.pressed('up')) cy = (cy + 2) % 3; if (Input.pressed('down')) cy = (cy + 1) % 3;
      if (bonk) bonk--;
      if (Input.pressed('jump') || Input.pressed('run')) {
        bonk = 8; const h = holes[cy * 3 + cx];
        if (h.k && h.up > 6) { if (h.k === 'p') { score = Math.max(0, score - 3); Audio8.sfx('hurt'); } else { score += h.k === 'gold' ? 3 : 1; Audio8.sfx(h.k === 'gold' ? 'coin' : 'stomp'); } h.k = null; h.t = 0; } else Audio8.sfx('bump');
      }
      for (const h of holes) { if (h.k) { h.up = Math.min(12, h.up + 2); if (--h.t <= 0) h.k = null; } else { h.up = Math.max(0, h.up - 2); } }
      const rate = time > 1200 ? 50 : 28;
      if (t % rate === 0) { const free = holes.filter((h) => !h.k && h.up === 0); if (free.length) { const h = free[(t * 7) % free.length], r = (t * 13) % 10; h.k = r < 1 ? 'gold' : r < 3 ? 'p' : 'g'; h.t = time > 1200 ? 80 : 55; } }
      if (--time <= 0) { done = true; t = 0; const coins = Math.floor(score / 3); payCoins(coins); this.coins = coins; Audio8.play('victory'); }
    },
    draw() {
      drawParallax('carnival', t * 0.3); drawWindow(4, 2, 248, 16); txt(`SCORE ${score}`, 10, 6, '#ffe040'); txt(`TIME ${Math.ceil(time / 60)}`, 246, 6, '#fff', { align: 'right' });
      holes.forEach((h, i) => {
        const x = 50 + (i % 3) * 60, y = 60 + Math.floor(i / 3) * 50;
        hR(x - 18, y + 8, 36, 10, '#3a2010'); hR(x - 16, y + 10, 32, 6, '#1a1020');
        if (h.up) { ctx.save(); ctx.beginPath(); ctx.rect(x - 20, y - 20, 40, 32); ctx.clip(); const img = h.k === 'p' ? Sprites.prickle.r[0] : Sprites.grumble[(t >> 4) & 1]; ctx.drawImage(img, x - 8, y + 12 - h.up * 1.6); if (h.k === 'gold') { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(255,210,40,0.6)'; ctx.fillRect(x - 8, y + 12 - h.up * 1.6, 16, 16); } ctx.restore(); }
        if (i % 3 === cx && Math.floor(i / 3) === cy) { hR(x - 4, y - 24 + (bonk ? 10 : 0), 8, 14, '#a06a30'); hR(x - 10, y - 30 + (bonk ? 10 : 0), 20, 8, '#e83850'); }
      });
      txt('A: WHACK  ARROWS: AIM  DON\'T HIT PRICKLES!', 128, 208, '#fff', { align: 'center', outline: '#101848' });
      if (done) { drawWindow(48, 80, 160, 60); txt("TIME'S UP!", 128, 90, '#ffe040', { align: 'center', scale: 2 }); txt(`SCORE ${score}  +${this.coins || 0} COINS`, 128, 114, '#5ff0ff', { align: 'center' }); }
    },
  };
}

// ---------------- Hero Maker ----------------
function HeroMakerScene() {
  const cfg = makerCfg(); let sel = 0, t = 0, dom = false, msg = '';
  const rows = [['NAME'], ['SUIT', 'suit', MAKER_SUITS.length], ['CAPE + BOOTS', 'cape', MAKER_CAPES.length], ['SKIN', 'skin', MAKER_SKINS.length], ['VISOR', 'lens', MAKER_LENS.length], ['HAIR', 'hair', MAKER_HAIR.length], ['HAIR COLOUR', 'hairCol', MAKER_HAIRCOL.length], ['SAVE + PLAY AS THEM'], ['BACK']];
  const save = () => Settings.set('maker', Object.assign({}, cfg));
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++; if (dom) return;
      if (Input.pressed('down')) { sel = (sel + 1) % rows.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + rows.length - 1) % rows.length; Audio8.sfx('select'); }
      const r = rows[sel], d = (Input.pressed('right') ? 1 : 0) - (Input.pressed('left') ? 1 : 0);
      if (r[1] && (d || Input.confirm())) { cfg[r[1]] = (cfg[r[1]] + (d || 1) + r[2]) % r[2]; save(); Audio8.sfx('coin'); }
      if (Input.pressed('back') || (Input.confirm() && r[0] === 'BACK')) { save(); go(() => ExtrasScene()); return; }
      if (Input.confirm() && r[0] === 'NAME') { dom = true; textBox('NAME YOUR HERO', cfg.name, (s) => { dom = false; if (s) { cfg.name = String(s).toUpperCase().replace(/[^A-Z0-9 .!-]/g, '').slice(0, 12) || 'MY HERO'; save(); } }); return; }
      if (Input.confirm() && r[0] === 'SAVE + PLAY AS THEM') { save(); Ach.unlock('makerhero'); try { localStorage.setItem('wallyman-last-hero', 'maker'); } catch (e) { /* ignore */ } if (game) { game.hero = 'maker'; Save.persist(); } msg = 'SAVED! PICK THEM ON THE HERO SCREEN'; Audio8.sfx('oneup'); }
    },
    draw() {
      drawParallax('grass', t * 0.3); drawWindow(8, 8, 128, 208); txt('HERO MAKER', 72, 14, '#ffe040', { align: 'center' });
      rows.forEach((r, i) => { const y = 30 + i * 18, on = i === sel; txt(r[0], 24, y, on ? '#ffe040' : '#fff'); if (on) txt('>', 14 + ((t >> 3) & 1), y, '#ffe040'); const v = r[0] === 'NAME' ? cfg.name : r[1] === 'hair' ? MAKER_HAIR[cfg.hair].toUpperCase() : r[1] ? `< ${cfg[r[1]] + 1} >` : ''; if (v) txt(v, 24, y + 8, '#5ff0ff'); });
      drawWindow(142, 8, 106, 208); ctx.fillStyle = '#5cb0f8'; ctx.fillRect(146, 12, 98, 160);
      Wally.draw(ctx, 195, 160, 'walk' + ((t >> 2) % 8), 1, { t, hero: 'maker', sx: 3, sy: 3 });
      txt(cfg.name, 195, 178, '#ffe040', { align: 'center' }); if (msg) wrapText(msg, 16).forEach((l, i) => txt(l, 195, 190 + i * 10, '#5ae060', { align: 'center' }));
    },
  };
}

// ---------------- Level of the Week in Course World ----------------
{
  const _CW = CourseWorldScene;
  CourseWorldScene = function () { // eslint-disable-line no-func-assign
    const s = _CW(), u = s.update, d = s.draw; let pick = null;
    if (OnlineCourses.on) OnlineCourses.list('top').then((l) => { if (!l.length) return; const wk = Math.floor(Date.now() / 604800000), recent = l.filter((c) => Date.now() - c.ts < 604800000).sort((a, b) => b.likes - a.likes); pick = recent[0] || l[wk % l.length]; }, () => {});
    s.update = function () { if (pick && Input.pressed('special')) { const lv = Maker.decode(pick.code); if (lv) { if (!game) game = Save.fresh(); window.CUSTOM_LEVEL = Object.assign(Maker.toDef(lv), { fromWorld: true, name: pick.name }); Audio8.sfx('confirm'); go(() => new Play(99, false)); return; } } return u.call(this); };
    s.draw = function () { d.call(this); if (pick) { drawWindow(16, 176, 224, 22); txt(`LEVEL OF THE WEEK: ${pick.name}`, 128, 180, '#ffe040', { align: 'center' }); txt(`BY ${pick.author}  ${pick.likes} LIKES  S: PLAY`, 128, 190, '#a8b0d8', { align: 'center' }); } };
    return s;
  };
}

// ---------------- touch controls editor ----------------
const TouchLayout = (() => {
  const KEY = () => (innerWidth > innerHeight ? 'wallyman-touch-land' : 'wallyman-touch'), groups = () => [...document.querySelectorAll('#pad > .grp')];
  const load = () => lsJ(KEY(), {});
  function apply() { const d = load(); groups().forEach((g, i) => { const c = d[i] || { x: 0, y: 0, s: 1 }; g.style.transform = `translate(${c.x}px, ${c.y}px) scale(${c.s})`; g.style.transformOrigin = i === 0 ? 'left bottom' : i === 2 ? 'right bottom' : 'center bottom'; }); }
  apply(); addEventListener('resize', apply);
  return { load, apply, save: (d) => { lsS(KEY(), d); apply(); }, groups };
})();
function TouchLayoutScene() {
  const hadTouch = document.body.classList.contains('touch'), d = TouchLayout.load(); let selG = 0, t = 0, drag = null, done = false;
  document.body.classList.add('touch'); if (typeof resize === 'function') resize();
  const bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:60;display:flex;gap:6px;justify-content:center;flex-wrap:wrap;padding:8px;background:rgba(8,10,40,0.9);font:bold 13px monospace;color:#fff';
  const btn = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.style.cssText = 'font:bold 13px monospace;padding:8px 12px;border-radius:6px;border:2px solid #fff;background:#2f62d0;color:#fff'; b.onclick = (e) => { e.stopPropagation(); fn(); }; bar.appendChild(b); return b; };
  const info = document.createElement('div'); info.textContent = 'Drag a button group to move it'; info.style.cssText = 'width:100%;text-align:center;color:#ffe040'; bar.appendChild(info);
  btn('SMALLER', () => { const c = d[selG] || { x: 0, y: 0, s: 1 }; c.s = Math.max(0.6, Math.round((c.s - 0.1) * 10) / 10); d[selG] = c; TouchLayout.save(d); });
  btn('BIGGER', () => { const c = d[selG] || { x: 0, y: 0, s: 1 }; c.s = Math.min(1.8, Math.round((c.s + 0.1) * 10) / 10); d[selG] = c; TouchLayout.save(d); });
  btn('RESET', () => { for (const k of Object.keys(d)) delete d[k]; TouchLayout.save(d); });
  btn('DONE', () => { done = true; });
  document.body.appendChild(bar);
  const gs = TouchLayout.groups();
  const down = (e) => { const i = gs.indexOf(e.currentTarget); selG = i; const c = d[i] || { x: 0, y: 0, s: 1 }; drag = { i, sx: e.clientX, sy: e.clientY, ox: c.x, oy: c.y }; gs.forEach((g, k) => { g.style.outline = k === i ? '2px dashed #ffe040' : ''; }); e.preventDefault(); e.stopPropagation(); };
  const move = (e) => { if (!drag) return; const c = d[drag.i] || { x: 0, y: 0, s: 1 }; c.x = Math.round(drag.ox + e.clientX - drag.sx); c.y = Math.round(drag.oy + e.clientY - drag.sy); d[drag.i] = c; TouchLayout.save(d); e.preventDefault(); };
  const up = () => { drag = null; };
  gs.forEach((g) => g.addEventListener('pointerdown', down, true)); addEventListener('pointermove', move); addEventListener('pointerup', up);
  const finish = () => { bar.remove(); gs.forEach((g) => { g.removeEventListener('pointerdown', down, true); g.style.outline = ''; }); removeEventListener('pointermove', move); removeEventListener('pointerup', up); if (!hadTouch) document.body.classList.remove('touch'); if (typeof resize === 'function') resize(); go(() => OptionsScene()); };
  return {
    enter() { Audio8.play('menu'); },
    update() { t++; if (done || Input.pressed('back')) { done = false; finish(); } },
    draw() { drawParallax('sky', t * 0.3); drawWindow(24, 60, 208, 70); txt('TOUCH LAYOUT', 128, 68, '#ffe040', { align: 'center', scale: 2 }); ['DRAG THE BUTTONS ANYWHERE.', 'USE BIGGER / SMALLER TO RESIZE.', 'PRESS DONE WHEN FINISHED.'].forEach((l, i) => txt(l, 128, 92 + i * 11, '#fff', { align: 'center' })); },
  };
}

// ---------------- Extras gets the Hero Maker ----------------
function ExtrasScene(start = 0) { // eslint-disable-line no-func-assign
  const items = [['LEVEL MAKER', () => LevelMakerScene(null)], ['COURSE WORLD', () => CourseWorldScene()], ['HERO MAKER', () => HeroMakerScene()], ['TROPHY ROOM', () => TrophyScene()], ['STICKER BOOK', () => StickerScene()], ['BESTIARY', () => BestiaryScene()],
    ['ART GALLERY', () => ArtScene()], ['JUKEBOX', () => JukeboxScene()], ['GALLERY', () => GalleryScene()], ['REPLAYS', () => ReplaysScene()], ['LEADERBOARDS', () => LeaderScene()], ['CREDITS', () => CreditsScene()],
    ['IMPORT SAVE', () => ImportSaveScene()], ['INSTALL APP', () => InstallScene()], ['OPTIONS', () => OptionsScene()], ['BACK', null]];
  let sel = start, t = 0; const SHOW = 11;
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
{ // the jukebox's B button returns to its new place in Extras
  const _J = JukeboxScene;
  JukeboxScene = function () { const s = _J(), u = s.update; s.update = function () { if (Input.pressed('back') || Input.pressed('run')) { go(() => ExtrasScene(7)); return; } return u.call(this); }; return s; }; // eslint-disable-line no-func-assign
}

// ---------------- Level Maker: the new parts ----------------
Maker.PALETTE.push([SL_R, 'SLOPE UP'], [SL_L, 'SLOPE DOWN'], [FAN, 'FAN'], ['β', 'CRATE'], [PLATE, 'PRESSURE PLATE'], [POUNDP, 'POUND PLATE'], [GATE, 'PUZZLE GATE'], [MIR_A, 'MIRROR /'], [MIR_B, 'MIRROR \\'], [EMIT, 'LIGHT (SHINES RIGHT)'], [RECV, 'LIGHT TARGET'], [CRYS, 'GLOW CRYSTAL'],
  ['χ', 'CRUSHER'], ['σ', 'TOY SOLDIER'], ['μ', 'WIND-UP MOUSE'], ['ζ', 'CRYSTAL BUG'], ['ψ', 'GUST BIRD'], ['ξ', 'SKELLY PIRATE'], ['¤', 'DARK LANTERN MODE']);
Object.assign(Maker.LIMITS, { '¤': 1, 'χ': 8 });
{
  const _td = Maker.toDef;
  Maker.toDef = function (lv) {
    const d = _td(lv), flat = lv.rows.map((r) => r.join('')).join('');
    if (flat.includes('¤')) d.lantern = true;
    if (/[πΠΓω]/.test(flat)) { const beams = []; lv.rows.forEach((r, y) => r.forEach((c, x) => { if (c === EMIT) beams.push([x, y, 'r']); })); d.puzzle = { beams }; }
    const b0 = d.build; d.build = (b) => { b0(b); for (const row of b.g) for (let x = 0; x < row.length; x++) if (row[x] === '¤') row[x] = '.'; };
    return d;
  };
  const _mi = makerIcon;
  makerIcon = function (c, X, Y, t = 0) { // eslint-disable-line no-func-assign
    const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(X + x, Y + y, w, h); };
    switch (c) {
      case SL_R: case SL_L: ctx.fillStyle = '#a0602e'; for (let k = 0; k < 16; k++) { const h = c === SL_R ? k + 1 : 16 - k; ctx.fillRect(X + k, Y + 16 - h, 1, h); } ctx.fillStyle = '#5ad84a'; for (let k = 0; k < 16; k++) { const h = c === SL_R ? k + 1 : 16 - k; ctx.fillRect(X + k, Y + 16 - h, 1, 2); } return;
      case FAN: R(0, 0, 16, 16, '#1a1020'); R(1, 1, 14, 14, '#7a8090'); R(3, 4, 10, 2, '#d0e0f0'); R(3, 8, 10, 2, '#d0e0f0'); R(6, -6, 1, 5, '#d0e0f0'); R(9, -8, 1, 6, '#d0e0f0'); return;
      case 'β': R(0, 0, 16, 16, '#1a1020'); R(1, 1, 14, 14, '#c08848'); R(2, 7, 12, 2, '#7a4a20'); R(7, 2, 2, 12, '#7a4a20'); return;
      case PLATE: R(1, 11, 14, 5, '#1a1020'); R(2, 12, 12, 3, '#e05050'); return;
      case POUNDP: R(0, 0, 16, 16, '#1a1020'); R(1, 1, 14, 14, '#e0a040'); Font.draw(ctx, 'V', X + 8, Y + 5, { color: '#1a1020', align: 'center' }); return;
      case GATE: R(2, 0, 12, 16, '#1a1020'); for (let k = 0; k < 3; k++) R(3 + k * 4, 0, 2, 16, '#c0a040'); return;
      case MIR_A: case MIR_B: ctx.fillStyle = '#c0f8ff'; for (let k = 1; k < 15; k++) ctx.fillRect(X + (c === MIR_A ? 15 - k : k), Y + k, 2, 1); return;
      case EMIT: R(0, 0, 16, 16, '#1a1020'); R(1, 1, 14, 14, '#4a4a6a'); R(5, 5, 6, 6, '#ffe040'); R(12, 7, 4, 2, '#fff0a0'); return;
      case RECV: R(0, 0, 16, 16, '#1a1020'); R(1, 1, 14, 14, '#3a3a58'); R(4, 4, 8, 8, '#6a6a90'); return;
      case CRYS: R(0, 0, 16, 16, '#1a1020'); R(1, 1, 14, 14, '#2a3a6a'); R(3, 2, 4, 12, '#80f0ff'); R(8, 4, 4, 10, '#c0a0ff'); return;
      case 'χ': R(0, 4, 16, 12, '#1a1020'); R(1, 5, 14, 10, '#ff5060'); R(7, 0, 2, 4, '#4a4a5a'); return;
      case 'σ': case 'μ': case 'ζ': case 'ψ': drawHEnemy(H_ENTS[c], X + 1, Y + 2, t); return;
      case 'ξ': drawSkelly(X + 1, Y + 3, t, 1); return;
      case '¤': R(4, 2, 8, 12, '#1a1020'); R(5, 4, 6, 8, (t >> 3) & 1 ? '#ffe040' : '#ffb020'); R(6, 0, 4, 2, '#1a1020'); return;
    }
    return _mi(c, X, Y, t);
  };
}
