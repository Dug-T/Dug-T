'use strict';
// =====================================================================
// Challenges (Boss Rush, Daily Challenge), boss cutscenes, speedrun
// splits, and the day / night cycle.
// =====================================================================
const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };
const fmtDiff = (f) => (f <= 0 ? '-' : '+') + (Math.abs(f) / 60).toFixed(2);
const challengeGame = () => {
  const h = lastHero();
  return Object.assign(Save.fresh(), { lives: 99, hero: heroOpen(h) ? h : 'wally', hat: (game && game.hat) || 'none' });
};
function wrapText(s, n) {
  const out = []; let line = '';
  for (const w of s.split(' ')) { if ((line + ' ' + w).trim().length > n) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); }
  if (line) out.push(line);
  return out;
}

// ---------------- Challenges menu ----------------
function ChallengeScene(start = 0) {
  const items = ['TIME ATTACK', 'BOSS RUSH', 'DAILY CHALLENGE', 'BACK'];
  const tips = ['RACE ANY LEVEL YOU HAVE BEATEN', 'EVERY BOSS BACK TO BACK!', "TODAY'S LEVEL WITH A TWIST", ''];
  let sel = start, t = 0;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (Input.pressed('down')) { sel = (sel + 1) % items.length; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + items.length - 1) % items.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || (Input.confirm() && sel === 3)) { go(() => TitleScene()); return; }
      if (Input.confirm()) { Audio8.sfx('confirm'); go([() => TimeAttackSelect(), () => RushIntroScene(), () => DailyScene()][sel]); }
    },
    draw() {
      drawParallax('castle', t * 0.4);
      drawLogo(8);
      drawWindow(48, 104, 160, 76);
      txt('CHALLENGES', 128, 110, '#ffe040', { align: 'center' });
      items.forEach((s, i) => { const y = 126 + i * 12; txt(s, 74, y, i === sel ? '#ffe040' : '#fff'); if (i === sel) txt('>', 62 + ((t >> 3) & 1), y, '#ffe040'); });
      txt(tips[sel], 128, 190, '#fff', { align: 'center', outline: '#101848' });
    },
  };
}

// ---------------- Boss Rush ----------------
const RUSH_STAGES = [
  { id: 'crab', name: 'KING KRABBY', theme: 'beach', c: 'q', y: 10 },
  { id: 'mole', name: 'DRILL MOLE', theme: 'cave', c: 'w', y: 10 },
  { id: 'dragon', name: 'NIMBUS', theme: 'sky', c: 'v', y: 3 },
  { id: 'yeti', name: 'ICE YETI', theme: 'snow', c: 'y', y: 10, yeti: true },
  { id: 'boss', name: 'BARON STATIC', theme: 'castle', c: 'K', y: 10, boss: true, hp: 4 },
  { id: 'mother', name: 'MOTHERSHIP', theme: 'moon', c: 'k', y: 3, boss: true, hp: 6, lowGrav: true },
];
let RUSH = null;
function rushDef(i) {
  const s = RUSH_STAGES[i], W = 26;
  const def = {
    name: 'BOSS RUSH', theme: s.theme, music: s.theme, width: W, noAuto: true, rushStage: i,
    lowGrav: !!s.lowGrav, ice: s.theme === 'snow',
    build(b) {
      b.ground(0, W - 1).fill(0, 0, 0, 11, 'X').fill(W - 1, 0, W - 1, 11, 'X');
      b.row(4, 8, '====').row(W - 8, 8, '====');
      b.set(s.boss ? 12 : 7, 11, '@'); b.set(s.boss ? (s.c === 'k' ? 18 : 21) : 19, s.y, s.c);
      b.set(3, 11, 'a'); b.set(W - 4, 11, 's');
    },
  };
  if (s.boss) Object.assign(def, { boss: true, bossHp: s.hp, bossName: s.c === 'k' ? 'MOTHERSHIP' : undefined });
  else if (s.yeti) def.yetiArena = [1, W - 2]; else def.miniArena = [1, W - 2];
  return def;
}
function startRushStage() {
  window.RUSH_LEVEL = rushDef(RUSH.stage);
  const pl = new Play(98, false, { rush: true });
  while (pl.spawnIdx < pl.lv.spawns.length) pl.spawn(pl.lv.spawns[pl.spawnIdx++]);
  pl.p.hearts = RUSH.hearts; pl.p.ammo = Math.max(pl.p.ammo, RUSH.ammo); pl.p.special = Math.max(3, RUSH.special);
  if (RUSH.lastDiff !== null) pl.splitMsg = { s: fmtDiff(RUSH.lastDiff), col: RUSH.lastDiff <= 0 ? '#5ae060' : '#ff6060', t: 150 };
  pl.parts.push({ k: 'text', s: `BOSS ${RUSH.stage + 1}/6`, x: 104, y: 50, vy: 0, life: 110, fixed: true });
  return pl;
}
function RushIntroScene() {
  let t = 0;
  const best = lsGet('wallyman-rush', []);
  return {
    enter() { Audio8.play('boss'); },
    update() {
      t++;
      if (Input.pressed('back')) { go(() => ChallengeScene(1)); return; }
      if (t > 20 && Input.confirm()) {
        game = challengeGame();
        RUSH = { stage: 0, frames: 0, splits: [], hearts: 3, ammo: 6, special: 3, lastDiff: null, best: lsGet('wallyman-rush-splits', null) };
        Audio8.sfx('confirm'); go(() => startRushStage());
      }
    },
    draw() {
      ctx.fillStyle = '#100818'; ctx.fillRect(0, 0, VW, VH);
      txt('BOSS RUSH', 128, 14, '#ff6060', { scale: 2, align: 'center', outline: '#000' });
      RUSH_STAGES.forEach((s, i) => { const x = 22 + i * 37; ctx.fillStyle = '#2a1a3a'; ctx.fillRect(x - 2, 40, 34, 34); ctx.save(); stickerArt(s.id, x + 15, 57, t); ctx.restore(); txt(String(i + 1), x + 15, 77, '#ffe040', { align: 'center' }); });
      txt('BEAT ALL SIX BOSSES IN A ROW.', 128, 92, '#fff', { align: 'center' });
      txt('3 HEARTS, +1 HEART AFTER EACH BOSS.', 128, 102, '#fff', { align: 'center' });
      drawWindow(48, 116, 160, 76);
      txt('BEST TIMES', 128, 122, '#ffe040', { align: 'center' });
      if (!best.length) txt('NO RECORDS YET!', 128, 150, '#a8b0d8', { align: 'center' });
      best.slice(0, 5).forEach((r, i) => { txt(`${i + 1}. ${r.name}`, 60, 136 + i * 10, i === 0 ? '#ffe040' : '#fff'); txt(fmtTime(r.t), 196, 136 + i * 10, '#fff', { align: 'right' }); });
      if ((t >> 4) & 1) txt('PRESS START', 128, 204, '#fff', { align: 'center' });
    },
  };
}
function rushNext(pl) {
  RUSH.splits.push(RUSH.frames);
  const b = RUSH.best && RUSH.best[RUSH.stage];
  RUSH.lastDiff = b ? RUSH.frames - b : null;
  RUSH.hearts = Math.min(3, pl.p.hearts + 1); RUSH.ammo = pl.p.ammo; RUSH.special = pl.p.special;
  RUSH.stage++;
  if (RUSH.stage >= RUSH_STAGES.length) go(() => RushResult(true)); else go(() => startRushStage());
}
function RushResult(won) {
  let t = 0, record = false;
  const best = lsGet('wallyman-rush', []), name = HEROES[heroOf()].short || HEROES[heroOf()].name;
  if (won) {
    record = !best.length || RUSH.frames < best[0].t;
    best.push({ t: RUSH.frames, name: name.slice(0, 10) }); best.sort((a, b) => a.t - b.t); lsSet('wallyman-rush', best.slice(0, 5));
    if (record) lsSet('wallyman-rush-splits', RUSH.splits);
    Ach.unlock('bossrush');
  }
  return {
    enter() { Audio8.play(won ? 'victory' : 'gameover'); },
    update() { t++; if (t > 40 && (Input.confirm() || Input.pressed('back'))) go(() => RushIntroScene()); },
    draw() {
      ctx.fillStyle = '#100818'; ctx.fillRect(0, 0, VW, VH);
      txt(won ? 'BOSS RUSH CLEAR!' : 'RUSH OVER!', 128, 16, won ? '#ffe040' : '#ff6060', { scale: 2, align: 'center', outline: '#000' });
      if (record && (t >> 3) & 1) txt('NEW RECORD!', 128, 40, '#5ff0ff', { align: 'center' });
      drawWindow(40, 54, 176, 120);
      txt('SPLITS', 128, 60, '#ffe040', { align: 'center' });
      RUSH_STAGES.forEach((s, i) => {
        const y = 74 + i * 13, f = RUSH.splits[i], b = RUSH.best && RUSH.best[i];
        txt(s.name, 50, y, f !== undefined ? '#fff' : '#6a6a8a');
        if (f !== undefined) { txt(fmtTime(f), 168, y, '#fff', { align: 'right' }); if (b) txt(fmtDiff(f - b), 206, y, f <= b ? '#5ae060' : '#ff6060', { align: 'right' }); }
      });
      txt('TOTAL ' + (won ? fmtTime(RUSH.frames) : '--'), 128, 158, '#ffe040', { align: 'center' });
      if (t > 40 && (t >> 4) & 1) txt('PRESS START', 128, 196, '#fff', { align: 'center' });
    },
  };
}

// ---------------- Daily Challenge ----------------
const DAILY_RULES = [
  { id: 'lowgrav', name: 'MOON GRAVITY', tip: 'FLOATY JUMPS EVERYWHERE', def: { lowGrav: true } },
  { id: 'fast', name: 'TURBO ENEMIES', tip: 'EVERY ENEMY MOVES 60% FASTER', setup: (pl) => { pl.speedMul = 1.6; } },
  { id: 'onehit', name: 'ONE HEART', tip: 'ONE HIT AND IT IS OVER', setup: (pl) => { pl.p.hearts = 1; } },
  { id: 'ammo', name: 'CANNON PARTY', tip: '9 CANNONBALLS AND 9 SPECIALS', setup: (pl) => { pl.p.ammo = 9; pl.p.special = 9; } },
  { id: 'tiny', name: 'TINY HERO', tip: 'YOU ARE SHRUNK ALL LEVEL', setup: (pl) => { pl.setTiny(true); pl.p.tiny = 1e9; } },
  { id: 'dark', name: 'LIGHTS OUT', tip: 'ONLY A POOL OF LIGHT AROUND YOU', def: { dark: true } },
  { id: 'ice', name: 'SLIP AND SLIDE', tip: 'THE WHOLE LEVEL IS ICY', def: { ice: true } },
  { id: 'shield', name: 'BUBBLE START', tip: 'START WITH A SHIELD AND A MAGNET', setup: (pl) => { pl.p.shield = true; pl.p.magnet = 1e9; } },
];
const todayKey = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
function dailyToday() {
  let s = todayKey() * 2654435761 % 4294967296;
  const r = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  r(); const li = Math.floor(r() * LEVELS.length), rule = DAILY_RULES[Math.floor(r() * DAILY_RULES.length)];
  return { li, rule, key: todayKey() };
}
const dailyScores = () => { const d = lsGet('wallyman-daily', null); return d && d.key === todayKey() ? d.scores : []; };
function DailyScene() {
  const d = dailyToday();
  let t = 0;
  return {
    enter() { Audio8.play('map'); },
    update() {
      t++;
      if (Input.pressed('back')) { go(() => ChallengeScene(2)); return; }
      if (t > 20 && Input.confirm()) {
        game = challengeGame(); Audio8.sfx('confirm');
        go(() => {
          const pl = new Play(d.li, false, { daily: d.rule });
          pl.def = Object.assign({}, pl.def, d.rule.def || {});
          pl.time = Math.ceil(levelTime(pl.def) / 5) * 5;
          if (d.rule.setup) d.rule.setup(pl);
          return pl;
        });
      }
    },
    draw() {
      drawParallax(LEVELS[d.li].theme, t * 0.4);
      drawWindow(20, 10, 216, 70);
      const k = String(d.key);
      txt('DAILY CHALLENGE', 128, 16, '#ffe040', { align: 'center' });
      txt(`${k.slice(6)}/${k.slice(4, 6)}/${k.slice(0, 4)}`, 128, 28, '#a8b0d8', { align: 'center' });
      txt(LEVELS[d.li].name, 128, 42, '#fff', { align: 'center' });
      txt('RULE: ' + d.rule.name, 128, 54, '#ff8080', { align: 'center' });
      txt(d.rule.tip, 128, 66, '#fff', { align: 'center' });
      drawWindow(40, 88, 176, 104);
      txt("TODAY'S BEST", 128, 94, '#ffe040', { align: 'center' });
      const sc = dailyScores();
      if (!sc.length) txt('BE THE FIRST!', 128, 130, '#a8b0d8', { align: 'center' });
      sc.slice(0, 8).forEach((r, i) => { txt(`${i + 1}. ${r.name}`, 52, 108 + i * 10, i === 0 ? '#ffe040' : '#fff'); txt(String(r.score), 204, 108 + i * 10, '#fff', { align: 'right' }); });
      if ((t >> 4) & 1) txt('PRESS START TO PLAY', 128, 204, '#fff', { align: 'center', outline: '#101848' });
    },
  };
}
function DailyResult(won, score) {
  let t = 0, rank = -1;
  if (won) {
    const sc = dailyScores(), name = (localStorage.getItem('wallyman-world-lastname') || HEROES[heroOf()].short || HEROES[heroOf()].name).slice(0, 10);
    sc.push({ name, score }); sc.sort((a, b) => b.score - a.score); rank = sc.findIndex((r) => r.score === score && r.name === name);
    lsSet('wallyman-daily', { key: todayKey(), scores: sc.slice(0, 10) });
    Ach.unlock('daily');
  }
  return {
    enter() { Audio8.play(won ? 'victory' : 'gameover'); },
    update() { t++; if (t > 40 && (Input.confirm() || Input.pressed('back'))) go(() => DailyScene()); },
    draw() {
      ctx.fillStyle = '#101848'; ctx.fillRect(0, 0, VW, VH);
      txt(won ? 'CHALLENGE CLEAR!' : 'CHALLENGE FAILED', 128, 50, won ? '#ffe040' : '#ff6060', { scale: 2, align: 'center', outline: '#000' });
      if (won) { txt('SCORE ' + score, 128, 90, '#fff', { align: 'center' }); txt(rank >= 0 && rank < 10 ? `YOU PLACED #${rank + 1} TODAY!` : 'TRY AGAIN TO RANK!', 128, 106, '#5ff0ff', { align: 'center' }); }
      else txt('YOU CAN RETRY AS OFTEN AS YOU LIKE', 128, 96, '#fff', { align: 'center' });
      drawWally(128, 170, won ? 'win' + ((t >> 4) & 1) : 'hurt', 1);
      if (t > 40 && (t >> 4) & 1) txt('PRESS START', 128, 196, '#fff', { align: 'center' });
    },
  };
}

// ---------------- Play hooks: rush / daily flow, cutscenes, splits ----------------
const BOSS_TALK = {
  baron: [['boss', 'SO, YOU FOUND MY FORTRESS! THIS ISLAND IS MINE. NO SIGNAL FOR ANYONE!'], ['hero', 'NOT ON MY WATCH, BARON. TIME TO RESTORE THE SIGNAL!']],
  final: [['boss', 'YOU AGAIN?! WELCOME TO MY STATIC TOWER. THIS TIME THERE IS NO ESCAPE!'], ['hero', 'I CAME TO FIX THE SIGNAL FOR GOOD. LET US END THIS!']],
  mother: [['boss', 'BEEP BOOP. EARTHLING DETECTED. PREPARE FOR TOTAL STATIC!'], ['hero', 'I HAVE FULL BARS. BRING IT ON!']],
  mk2: [['boss', 'MOTHERSHIP MK II ONLINE. UPGRADED. EXTRA ANGRY.'], ['hero', 'UPGRADED? SO AM I. LET US GO!']],
  yeti: [['boss', 'ROOOOAAARRR!!'], ['hero', 'SOMEBODY NEEDS A HUG... OR A STOMP.']],
  crab: [['boss', 'SNIP SNAP! THIS IS MY BEACH, LANDLUBBER!'], ['hero', 'LEARN TO SHARE THE SAND, KRABBY!']],
  mole: [['boss', 'WHO DARES TO DIG IN MY MINE?'], ['hero', 'NICE DRILL. SHAME ABOUT THE MANNERS!']],
  dragon: [['boss', 'I AM NIMBUS, KING OF THE CLOUDS!'], ['hero', 'THEN IT IS A STORMY DAY FOR YOU!']],
};
const BOSS_ART = { baron: 'boss', final: 'boss', mother: 'mother', mk2: 'mother', yeti: 'yeti', crab: 'crab', mole: 'mole', dragon: 'dragon' };
const BOSS_NAMES = { baron: 'BARON STATIC', final: 'BARON STATIC', mother: 'MOTHERSHIP', mk2: 'MOTHERSHIP MK II', yeti: 'ICE YETI', crab: 'KING KRABBY', mole: 'DRILL MOLE', dragon: 'NIMBUS' };
Play.prototype.startTalk = function (key) {
  if (this.ta || this.rush || this.daily || this.def.custom || !BOSS_TALK[key]) return;
  if (!game.seenTalk) game.seenTalk = {};
  if (game.seenTalk[key + this.li]) return;
  game.seenTalk[key + this.li] = 1;
  this.talk = { key, i: 0, t: 0 };
};
Play.prototype.updateTalk = function () {
  const k = this.talk; k.t++;
  if (Input.pressed('start')) { this.talk = null; return; }
  if (k.t > 12 && (Input.pressed('jump') || Input.pressed('run'))) { k.i++; k.t = 0; Audio8.sfx('select'); if (k.i >= BOSS_TALK[k.key].length) this.talk = null; }
};
function drawHeroPortrait(x, y, w, h, t) {
  const id = heroOf(), img = id === 'goth' ? Sprites.gothPortrait : id === 'doug' ? Sprites.dougPortrait : id === 'wally' ? Sprites.portrait : null;
  ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); ctx.fillStyle = '#5cb0f8'; ctx.fillRect(x, y, w, h);
  if (img && img.complete && img.naturalWidth) { const s = Math.max(w / img.naturalWidth, h / img.naturalHeight); ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.drawImage(img, x + (w - img.naturalWidth * s) / 2, y, img.naturalWidth * s, img.naturalHeight * s); ctx.restore(); }
  else ctx.drawImage(Wally.frame('idle0', 0, false, 1, 'n', 'classic', id), x + (w - 36) / 2, y + 2, 36, 48);
}
Play.prototype.drawTalk = function () {
  const k = this.talk, [who, line] = BOSS_TALK[k.key][k.i], hero = who === 'hero';
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, VW, VH);
  drawWindow(8, 146, 240, 72);
  const px = hero ? 14 : 198, py = 152;
  if (hero) drawHeroPortrait(px, py, 44, 52, frame);
  else { ctx.fillStyle = '#1a1020'; ctx.fillRect(px - 1, py - 1, 46, 54); ctx.fillStyle = '#3a1838'; ctx.fillRect(px, py, 44, 52); ctx.save(); ctx.beginPath(); ctx.rect(px, py, 44, 52); ctx.clip(); ctx.translate(px + 22, py + 28); ctx.scale(1.4, 1.4); stickerArt(BOSS_ART[k.key], 0, 0, frame); ctx.restore(); }
  const tx = hero ? 66 : 16;
  txt(hero ? HEROES[heroOf()].name : BOSS_NAMES[k.key], tx, 152, hero ? HEROES[heroOf()].color : '#ff8080');
  const shown = Math.min(line.length, k.t * 2), lines = wrapText(line, 29);
  let left = shown;
  lines.forEach((l, i) => { const part = l.slice(0, Math.max(0, left)); left -= l.length + 1; txt(part, tx, 166 + i * 11, '#fff'); });
  if (shown >= line.length && (frame >> 4) & 1) txt('>', 236, 206, '#ffe040');
  txt('START: SKIP', 128, 136, '#fff', { align: 'center', outline: '#000' });
};
// split popups (Time Attack checkpoint / finish, Boss Rush stages)
const splitLoad = (li) => (lsGet('wallyman-splits', {})[li]) || null;
Play.prototype.split = function (key, f) {
  if (!this.splitRec) this.splitRec = {};
  if (this.splitRec[key] !== undefined) return;
  this.splitRec[key] = f;
  const best = splitLoad(this.li);
  if (best && best[key] !== undefined) { const d = f - best[key]; this.splitMsg = { s: (key === 'cp' ? 'CHECKPOINT ' : 'FINISH ') + fmtDiff(d), col: d <= 0 ? '#5ae060' : '#ff6060', t: 150 }; }
  else this.splitMsg = { s: (key === 'cp' ? 'CHECKPOINT ' : 'FINISH ') + fmtTime(f), col: '#fff', t: 150 };
};
function saveSplits(li, rec, frames) { const all = lsGet('wallyman-splits', {}); all[li] = Object.assign({}, rec || {}, { end: frames }); lsSet('wallyman-splits', all); }

// ---------------- day and night ----------------
const DAY_LEN = 60 * 60 * 6; // one full day every 6 minutes of play
const dayPhase = () => (((game && game.playTime) || 0) % DAY_LEN) / DAY_LEN;
function nightAmount() { // 0 = bright day, 1 = deep night
  const p = dayPhase();
  if (p < 0.5) return 0; if (p < 0.6) return (p - 0.5) / 0.1; if (p < 0.9) return 1; return 1 - (p - 0.9) / 0.1;
}
const isNight = () => nightAmount() > 0.7;
function drawNightSky(y0, y1, amt, seed = 7) {
  if (amt <= 0) return;
  ctx.fillStyle = `rgba(16,20,70,${0.55 * amt})`; ctx.fillRect(0, y0, VW, y1 - y0);
  ctx.fillStyle = `rgba(255,255,220,${amt})`;
  for (let i = 0; i < 40; i++) { const x = (i * 97 + seed * 13) % VW, y = y0 + ((i * 53 + seed) % (y1 - y0)); if (((frame >> 3) + i) % 7) ctx.fillRect(x, y, 1, 1); }
}
{ // the map gets darker as you play
  const _Map = MapScene;
  MapScene = function (...a) { // eslint-disable-line no-func-assign
    const s = _Map(...a), d = s.draw;
    s.draw = function () {
      d.call(this);
      const n = nightAmount();
      if (n > 0) { drawNightSky(30, 196, n); if (n > 0.7) txt('NIGHT', 250, 186, '#a0b0ff', { align: 'right', outline: '#101848' }); }
    };
    return s;
  };
}
Play.prototype.drawNight = function (cx) {
  if (!this.night) return;
  ctx.fillStyle = 'rgba(20,24,80,0.42)'; ctx.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 10; i++) { // fireflies
    const x = ((i * 71 + frame * (0.2 + (i % 3) * 0.1)) % (VW + 20)) - 10, y = 60 + ((i * 37) % 120) + Math.sin(frame * 0.05 + i) * 8;
    ctx.fillStyle = (frame + i * 9) % 40 < 25 ? '#e8ff80' : '#80a040'; ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
  }
};
{ // HUD extras: split popups, rush clock, cutscene overlay
  const _hud = Play.prototype.drawHUD;
  Play.prototype.drawHUD = function () {
    _hud.call(this);
    if (this.splitMsg && this.splitMsg.t > 0) { this.splitMsg.t--; txt(this.splitMsg.s, 128, 30, this.splitMsg.col, { align: 'center', outline: '#000' }); }
    if (this.night && this.state === 'play' && this.stateT < 150) txt('NIGHT: GHOSTS ROAM, COINS X2!', 128, 40, '#c0c8ff', { align: 'center', outline: '#101848' });
    if (this.daily && this.stateT < 180) txt('DAILY RULE: ' + this.daily.name, 128, 40, '#ff8080', { align: 'center', outline: '#000' });
    if (this.talk) this.drawTalk();
  };
}
