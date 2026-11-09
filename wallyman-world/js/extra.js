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

// ---------------- Ko-fi tip jar button on the title screen ----------------
const KOFI_RECT = { x: 180, y: 200, w: 68, h: 18 };
const kofiName = () => String(window.WALLYMAN_KOFI || '').trim().replace(/^https?:\/\/(www\.)?ko-fi\.com\//i, '').replace(/[^A-Za-z0-9_-]/g, '');
function drawTipJar(t) {
  if (!kofiName()) return;
  const { x, y, w, h } = KOFI_RECT, cx = x + w / 2, cy = y + h / 2;
  // gentle pulse: grows a little every 2 seconds, then eases back to normal size
  const ph = t % 120, s = ph < 40 ? 1 + 0.12 * Math.sin((Math.PI * ph) / 40) : 1, glow = 0.35 + 0.25 * Math.sin(t * 0.1);
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
  // soft golden glow around the button
  for (let k = 3; k >= 1; k--) { ctx.fillStyle = `rgba(255,220,90,${(glow * (4 - k)) / 8})`; ctx.fillRect(x - 1 - k * 2, y - 1 - k * 2, w + 2 + k * 4, h + 2 + k * 4); }
  ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = (t >> 3) & 1 ? '#ffe060' : '#ffc030'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#ff8a80'); g.addColorStop(0.5, '#ff5e5b'); g.addColorStop(1, '#d83c40');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(x + 1, y + 1, w - 2, 1);
  // a shine that sweeps across the button
  const sweep = (t * 2) % 200 - 30;
  if (sweep < w + 20) { ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); for (let yy = 0; yy < h; yy++) { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(x + sweep - yy * 0.6, y + yy, 6, 1); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x + sweep + 8 - yy * 0.6, y + yy, 3, 1); } ctx.restore(); }
  // coffee cup with a heart, and rising steam
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 4, y + 5, 10, 9); ctx.fillRect(x + 14, y + 7, 3, 1); ctx.fillRect(x + 16, y + 7, 1, 4); ctx.fillRect(x + 14, y + 10, 3, 1);
  ctx.fillStyle = '#ff5e5b'; ctx.fillRect(x + 6, y + 7, 2, 2); ctx.fillRect(x + 9, y + 7, 2, 2); ctx.fillRect(x + 6, y + 9, 5, 1); ctx.fillRect(x + 7, y + 10, 3, 1); ctx.fillRect(x + 8, y + 11, 1, 1);
  const st = (t >> 3) % 4; ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 7, y + 3 - (st & 1), 1, 2); ctx.fillRect(x + 10, y + 2 - ((st >> 1) & 1), 1, 2);
  txt('TIP JAR', x + 21, y + 6, '#ffffff', { shadow: '#801820' });
  ctx.restore();
  // twinkling sparkles around the edges
  const spark = (sx, sy, on) => { if (!on) return; ctx.fillStyle = '#fffbe0'; ctx.fillRect(sx, sy - 2, 1, 5); ctx.fillRect(sx - 2, sy, 5, 1); ctx.fillStyle = '#ffffff'; ctx.fillRect(sx, sy, 1, 1); };
  spark(x - 4, y + 2, (t >> 4) % 3 === 0); spark(x + w + 3, y + h - 3, (t >> 4) % 3 === 1); spark(x + w - 10, y - 4, (t >> 4) % 3 === 2); spark(x + 12, y + h + 3, (t >> 4) % 3 === 1);
}
function openTipJar() {
  const name = kofiName(); if (!name) return;
  const a = document.createElement('a'); a.href = 'https://ko-fi.com/' + name; a.target = '_blank'; a.rel = 'noopener noreferrer';
  document.body.appendChild(a); a.click(); a.remove();
}
cv.addEventListener('pointerup', (e) => {
  if (!kofiName() || typeof scene === 'undefined' || !scene || !scene.isTitle) return;
  const r = cv.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * VW, y = ((e.clientY - r.top) / r.height) * VH, k = KOFI_RECT;
  if (x >= k.x - 4 && x <= k.x + k.w + 4 && y >= k.y - 4 && y <= k.y + k.h + 4) openTipJar();
});

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
  r(); const pool = LEVELS.map((d, i) => i).filter((i) => !LEVELS[i].shmup && !LEVELS[i].minecart && !LEVELS[i].secretRoom && !LEVELS[i].board && !LEVELS[i].sub && !LEVELS[i].train && !LEVELS[i].tower && !LEVELS[i].boss), li = pool[Math.floor(r() * pool.length)], rule = DAILY_RULES[Math.floor(r() * DAILY_RULES.length)];
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

// ---------------- 2 players together (co-op) ----------------
// Player 2 uses W A S D to move, F to jump, G to run/throw and H for specials
// (or the second gamepad). Player 1 leads the camera; player 2 is kept on screen.
const Input2 = (() => {
  const names = ['left', 'right', 'up', 'down', 'jump', 'run', 'special'], st = {}, prev = {}, kb = {}, hit = {};
  names.forEach((n) => { st[n] = prev[n] = kb[n] = hit[n] = 0; });
  addEventListener('keydown', (e) => { const a = P2_KEYS[e.code]; if (a && coopActive()) { if (!e.repeat) hit[a] = 1; kb[a] = 1; e.preventDefault(); } });
  addEventListener('keyup', (e) => { const a = P2_KEYS[e.code]; if (a) kb[a] = 0; });
  addEventListener('blur', () => names.forEach((n) => { kb[n] = 0; }));
  function poll() {
    const gp = {}; names.forEach((n) => { gp[n] = 0; });
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    const p = pads[1];
    if (p) {
      const b = (i) => (p.buttons[i] && p.buttons[i].pressed ? 1 : 0);
      gp.jump = b(0) | b(1); gp.run = b(2) | b(6) | b(7); gp.special = b(3) | b(4) | b(5);
      gp.up = b(12) | (p.axes[1] < -0.5); gp.down = b(13) | (p.axes[1] > 0.5); gp.left = b(14) | (p.axes[0] < -0.5); gp.right = b(15) | (p.axes[0] > 0.5);
    }
    names.forEach((n) => { prev[n] = st[n]; st[n] = kb[n] || hit[n] || gp[n] ? 1 : 0; hit[n] = 0; });
  }
  return { poll, down: (k) => !!st[k], pressed: (k) => !!(st[k] && !prev[k]) };
})();
const p2Hero = () => (game.other && game.other.hero) || 'wally';
const p2Costume = () => (game.other && game.other.costume) || (p2Hero() === game.hero ? 'junior' : 'classic');
Play.prototype.makeP2 = function () {
  const p = this.p;
  this.p2 = Object.assign({}, p, { x: p.x - 14, vx: 0, vy: 0, trail: [], platform: null, riding: false, w: 10, h: 22, y: p.y + p.h - 22, hearts: DIFF[this.diff].hearts, ammo: 3, special: 3, inv: 60, power: 'none', boots: false, charge: 0, tiny: 0, shield: false, magnet: 0, warpT: 0, down: 0, isP2: true });
};
Play.prototype.withP2 = function (fn) { // run fn as if player 2 were the hero
  const p1 = this.p, hero = game.hero, cos = game.costume, d = Input.down, pr = Input.pressed;
  this.p = this.p2; game.hero = p2Hero(); game.costume = p2Costume(); Wally.hero = game.hero; Wally.current = game.costume;
  Input.down = Input2.down; Input.pressed = (k) => (k === 'start' || k === 'back' ? pr(k) : Input2.pressed(k));
  this._p2ctx = true;
  try { fn(); } finally {
    this._p2ctx = false; this.p = p1; game.hero = hero; game.costume = cos; Wally.hero = hero; Wally.current = cos; Input.down = d; Input.pressed = pr;
  }
};
Play.prototype.p2Down = function () {
  const q = this.p2; if (q.down) return;
  q.down = 150; q.riding = false; q.w = 10; q.h = 22; q.tiny = 0; Audio8.sfx('hurt'); rumble(0.5, 200);
  this.parts.push({ k: 'text', s: 'P2 DOWN!', x: q.x - 14, y: Math.min(q.y, 180) - 10, vy: -0.4, life: 70 });
  game.lives--; if (game.lives < 0) { game.lives = 0; q.out = true; }
};
Play.prototype.updateP2 = function () {
  const q = this.p2, p = this.p;
  Input2.poll();
  if (q.out) return;
  if (q.down) { // respawn next to player 1 after a short break
    if (--q.down === 0) { Object.assign(q, { x: p.x - 12, y: Math.max(16, p.y - 30), vx: 0, vy: 0, hearts: DIFF[this.diff].hearts, inv: 120, platform: null }); this.parts.push({ k: 'text', s: 'P2 BACK!', x: q.x - 14, y: q.y - 12, vy: -0.4, life: 60 }); }
    return;
  }
  this.withP2(() => {
    this.updatePlayer();
    // touch enemies, items, goals: replay those entities' logic for player 2 without moving them twice
    for (const e of this.ents) {
      if (!e.alive || e.dying || q.down || !overlap({ x: q.x - 2, y: q.y - 2, w: q.w + 4, h: q.h + 4 }, e)) continue;
      const keep = { x: e.x, y: e.y, vx: e.vx, vy: e.vy, t: e.t };
      this.updateEnt(e);
      if (e.alive && !e.dying) Object.assign(e, keep);
    }
  });
  if (q.down) return;
  // keep player 2 on screen (not in a versus race, where each player has their own view)
  if (!this.versus && q.x < this.cam.x + 2) { q.x = this.cam.x + 2; if (q.vx < 0) q.vx = 0; }
  if (!this.versus && q.x > this.cam.x + VW - q.w - 2) { q.x = this.cam.x + VW - q.w - 2; if (q.vx > 0) q.vx = 0; }
  // bounce off each other's heads
  for (const [a, b] of [[q, p], [p, q]]) {
    if (a.vy > 0 && a.x + a.w > b.x && a.x < b.x + b.w && a.y + a.h >= b.y && a.y + a.h <= b.y + 8 && !a.riding) { a.vy = -5.6; a.y = b.y - a.h; Audio8.sfx('spring'); if (this.onHeadBounce) this.onHeadBounce(a, b); this.parts.push({ k: 'star', x: b.x + b.w / 2, y: b.y, life: 10 }); }
  }
};
{
  const _upd = Play.prototype.update;
  Play.prototype.update = function () {
    if (game && game.coop && !this.p2 && !this.ta && !this.rush && !this.daily && !this.def.custom) this.makeP2();
    const was = this.state;
    _upd.call(this);
    if (this.p2 && !this.paused && !this.talk && this.state === 'play' && was === 'play' && !this.taReady) this.updateP2();
  };
  const _dp = Play.prototype.drawPlayer;
  Play.prototype.drawPlayer = function (cx) {
    if (this.p2 && !this.p2.down && !this.p2.out) {
      this.withP2(() => { if (this.state !== 'dying') _dp.call(this, cx); });
      const q = this.p2; txt('P2', Math.round(q.x + q.w / 2 - cx), Math.round(q.y) - (q.riding ? 18 : 10) - 6, '#5ae060', { align: 'center', outline: '#101848' });
    }
    _dp.call(this, cx);
  };
  const _hud = Play.prototype.drawHUD;
  Play.prototype.drawHUD = function () {
    _hud.call(this);
    const q = this.p2; if (!q) return;
    ctx.fillStyle = 'rgba(16,24,72,0.7)'; ctx.fillRect(196, 26, 58, 11);
    txt('P2', 199, 28, '#5ae060');
    if (q.out) txt('OUT', 216, 28, '#ff6060'); else if (q.down) txt('...', 216, 28, '#fff');
    else for (let i = 0; i < 3; i++) ctx.drawImage(i < q.hearts ? Sprites.heart : Sprites.heartEmpty, 214 + i * 9, 28);
  };
}

// ---------------- Zappling Squadron: an alien formation that marches, steps down and fires ----------------
{
  const S = Sprites;
  const rowsA = ['....K..K....', '...KgK.KgK..', '..KKKKKKKK..', '.KggggggggK.', 'KgwwKggwwKgK', 'KgwKKggwKKgK', 'KggggggggggK', '.KgGGGGGGgK.', '..KK.KK.KK..', '.K...K..K...'];
  const rowsB = ['....K..K....', '...KgK.KgK..', '..KKKKKKKK..', '.KggggggggK.', 'KgwwKggwwKgK', 'KgwKKggwKKgK', 'KggggggggggK', '.KgGGGGGGgK.', '..KK.KK.KK..', '...K..K...K.'];
  const cols = [['#40d860', '#1a8a30'], ['#ff60c0', '#a02880'], ['#50d8ff', '#2080b0']];
  S.zappling = cols.map(([g, G]) => [rowsA, rowsB].map((r) => S.fromRows(r, { K: '#1a1020', g, G, w: '#ffffff' })));
}
const SQ_DX = 18, SQ_DY = 15;
{
  const _spawn = Play.prototype.spawn;
  Play.prototype.spawn = function (sp) {
    if (sp.t !== 'i') return _spawn.call(this, sp);
    const cfg = this.def.squad || { rows: 3, cols: 5 }, rows = cfg.rows, colsN = cfg.cols;
    const x = sp.x * TS;
    this.ents.push({ type: 'squad', alive: true, t: 0, x, y: 24, w: colsN * SQ_DX, h: rows * SQ_DY, ox: x, rows, cols: colsN, dir: 1, step: 0, cool: 90,
      grid: Array.from({ length: rows }, () => Array(colsN).fill(true)), bolts: [], vx: 0, vy: 0, entered: false });
  };
  const aliens = (e) => { const out = []; e.grid.forEach((r, j) => r.forEach((on, i) => { if (on) out.push({ i, j, x: e.x + i * SQ_DX, y: e.y + j * SQ_DY, w: 12, h: 10 }); })); return out; };
  Play.prototype.zapAlien = function (e, a, by) {
    e.grid[a.j][a.i] = false; this.addScore(100 * (e.rows - a.j), a.x, a.y);
    Audio8.sfx('kick'); this.parts.push({ k: 'star', x: a.x + 6, y: a.y + 5, life: 12 }); this.parts.push({ k: 'dust', x: a.x + 6, y: a.y + 5, vx: 0, vy: -0.5, life: 16 });
    if (!e.grid.some((r) => r.some(Boolean))) {
      e.alive = false; Sticker.add('squad'); this.addScore(2000); Audio8.sfx('oneup');
      this.parts.push({ k: 'text', s: 'SQUADRON CLEARED! +2000', x: this.cam.x + 52, y: 60, vy: 0, life: 110 });
      for (let k = 0; k < 5; k++) this.parts.push({ k: 'coinpop', x: a.x - 20 + k * 10, y: a.y, vy: -3 - k * 0.3, life: 26 });
      for (let k = 0; k < 5; k++) this.addCoin();
    }
  };
  Play.prototype.updateSquad = function (e) {
    const p = this.p;
    if (!e.entered) { if (e.x < this.cam.x + VW - 20) { e.entered = true; Audio8.sfx('lasercharge'); this.parts.push({ k: 'text', s: 'ALIEN SQUADRON!', x: this.cam.x + 80, y: 50, vy: 0, life: 90 }); } else return; }
    e.t++;
    const live = aliens(e), n = live.length, frozen = this.freezeT > 0 || this.state !== 'play';
    if (!n) { e.alive = false; return; }
    // march: the fewer that are left, the faster they go
    if (!frozen && ++e.step >= Math.max(3, Math.round(4 + n * 1.4))) {
      e.step = 0; e.frame = (e.frame || 0) ^ 1;
      const minI = Math.min(...live.map((a) => a.i)), maxI = Math.max(...live.map((a) => a.i));
      const left = e.x + minI * SQ_DX, right = e.x + maxI * SQ_DX + 12;
      const lo = Math.max(e.ox - 56, this.cam.x + 4), hi = Math.min(e.ox + e.cols * SQ_DX + 56, this.cam.x + VW - 4);
      if ((e.dir > 0 && right + 4 > hi) || (e.dir < 0 && left - 4 < lo)) { e.dir = -e.dir; if (e.y < 96) e.y += 6; } else e.x += e.dir * 4;
      Audio8.sfx('tick');
    }
    // fire from the bottom alien of a random column
    if (!frozen && --e.cool <= 0 && e.bolts.length < 3) {
      const colsLive = [...new Set(live.map((a) => a.i))], ci = colsLive[(e.t * 7 + n) % colsLive.length];
      const shooter = live.filter((a) => a.i === ci).sort((a, b) => b.j - a.j)[0];
      e.bolts.push({ x: shooter.x + 5, y: shooter.y + 10, w: 3, h: 7, t: 0 });
      e.cool = 50 + Math.round(n * 2.5) + ((e.t * 13) % 40); Audio8.sfx('zap');
    }
    for (const bl of e.bolts) {
      if (!frozen) { bl.y += 2.2; bl.t++; }
      if (SOLID.has(this.tile(Math.floor((bl.x + 1) / TS), Math.floor((bl.y + 6) / TS))) || bl.y > VH) bl.dead = true;
      else if (this.state === 'play' && overlap(bl, p)) { bl.dead = true; this.hurt(); }
      else if (this.p2 && !this.p2.down && overlap(bl, this.p2)) { bl.dead = true; this.withP2(() => this.hurt()); }
    }
    e.bolts = e.bolts.filter((bl) => !bl.dead);
    // hits: stomps, cannonballs, pings, bats, Dino fire, touching from the side hurts
    for (const a of live) {
      if (!e.grid[a.j][a.i]) continue;
      const hit = (arr, kill) => { for (const o of arr) if (!o.dead && overlap(o, a)) { kill(o); this.zapAlien(e, a); return true; } return false; };
      if (hit(this.balls, (o) => { o.fuse = 0; })) continue;
      if (hit(this.pings, (o) => { o.life = 0; })) continue;
      if (hit(this.bats, (o) => { o.life = 0; })) continue;
      if (hit(this.fires, (o) => { o.life = 0; })) continue;
      for (const q of [p, this.p2]) {
        if (!q || q.down || this.state !== 'play' || !overlap(q, a)) continue;
        if (q.vy > 0 && q.prevBottom <= a.y + 6) { q.vy = Input.down('jump') ? -6 : -4; this.zapAlien(e, a); Audio8.sfx('stomp'); } else if (q === p) this.hurt(); else this.withP2(() => this.hurt());
        break;
      }
    }
    const l2 = aliens(e); if (l2.length) { e.w = (Math.max(...l2.map((a) => a.i)) + 1) * SQ_DX; }
  };
  const _ue = Play.prototype.updateEnt;
  Play.prototype.updateEnt = function (e) { if (e.type === 'squad') { if (!this._p2ctx) this.updateSquad(e); return; } return _ue.call(this, e); };
  const _de = Play.prototype.drawEnt;
  Play.prototype.drawEnt = function (e, cx) {
    if (e.type !== 'squad') return _de.call(this, e, cx);
    if (!e.entered) return;
    e.grid.forEach((r, j) => r.forEach((on, i) => { if (on) ctx.drawImage(Sprites.zappling[j % 3][e.frame || 0], Math.round(e.x + i * SQ_DX - cx), Math.round(e.y + j * SQ_DY)); }));
    for (const bl of e.bolts) { const x = Math.round(bl.x - cx), y = Math.round(bl.y), z = (bl.t >> 2) & 1; ctx.fillStyle = '#ffffff'; ctx.fillRect(x + z, y, 1, 2); ctx.fillRect(x + 1 - z, y + 2, 1, 2); ctx.fillRect(x + z, y + 4, 1, 3); ctx.fillStyle = '#ff60c0'; ctx.fillRect(x + 2, y + 1, 1, 5); }
  };
  const _ex = Play.prototype.explode;
  Play.prototype.explode = function (x, y) {
    _ex.call(this, x, y);
    for (const e of this.ents) if (e.type === 'squad' && e.alive && e.entered) for (const a of aliens(e)) if (e.alive && Math.hypot(a.x + 6 - x, a.y + 5 - y) < 34) this.zapAlien(e, a);
  };
  const _sw = Play.prototype.shockwave;
  Play.prototype.shockwave = function () {
    _sw.call(this);
    const p = this.p, x = p.x + p.w / 2, y = p.y + p.h / 2;
    for (const e of this.ents) if (e.type === 'squad' && e.alive && e.entered) for (const a of aliens(e)) if (e.alive && Math.hypot(a.x + 6 - x, a.y + 5 - y) < 96) this.zapAlien(e, a);
  };
}

// ---------------- Beam-down aliens: UFOs drop little alien troopers in a tractor beam ----------------
{
  const r0 = ['....K....K......', '....KgK.KgK.....', '.....KgKgK......', '...KKggggggKK...', '..KggggggggggK..', '..KgwwKggwwKgK..', '..KgwKKggKKwgK..', '..KggggggggggK..', '...KggKKKKggK...', '....KKmmmmKK....', '...KsKmmmmKsK...', '...KsKmmmmKsK...', '....KKmmmmKK....', '....KgK..KgK....', '...KggK..KggK...', '...KKKK..KKKK...'];
  const r1 = r0.slice(0, 13).concat(['....KgK...KgK...', '...KggK...KggK..', '...KKKK...KKKK..']);
  const pal = { K: '#1a1020', g: '#7ae040', w: '#ffffff', m: '#c040e0', s: '#d0d8e8' };
  Sprites.beamling = [r0, r1].map((r) => Sprites.fromRows(r, pal));
  Sprites.beamlingL = Sprites.beamling.map(Sprites.flip);
}
const starIsle = (pl) => ['volcano', 'factory', 'candy', 'moon'].includes(pl.def.theme);
{
  const _uu = Play.prototype.updateUfo;
  Play.prototype.updateUfo = function (e) {
    _uu.call(this, e);
    if (!e.alive || e.dying || this.freezeT > 0) return;
    const kids = this.ents.filter((k) => k.type === 'beamling' && k.alive && !k.dying && k.owner === e).length, max = starIsle(this) ? 3 : 2;
    if (e.beamCool === undefined) e.beamCool = 90;
    if (e.tractor > 0) { // tractor beam: an alien slides down it
      e.tractor--;
      e.beamTop = e.y + 12; e.tractorX = e.x + e.w / 2; e.tractorEnd = this.beamEnd(e.tractorX, e.beamTop);
      if (e.tractor === 50 && this.state === 'play') {
        this.ents.push({ type: 'beamling', alive: true, t: 0, x: e.tractorX - 6, y: e.beamTop, w: 12, h: 14, vx: 0, vy: 0, enemy: false, stomp: true, state: 'beam', owner: e, face: this.p.x < e.x ? -1 : 1 });
        Audio8.sfx('secret');
      }
      return;
    }
    if (e.state === 'hover' && this.state === 'play' && kids < max && --e.beamCool <= 0 && e.timer > 50) {
      e.tractor = 80; e.beamCool = starIsle(this) ? 230 : 380; Audio8.sfx('lasercharge');
    }
  };
  const _du = Play.prototype.drawUfo;
  Play.prototype.drawUfo = function (e, x, y) {
    if (e && e.tractor > 0 && this && this.cam) {
      const bx = Math.round(x + 14), top = y + 12, bot = Math.min(VH, e.tractorEnd || VH), grow = Math.min(1, (80 - e.tractor) / 12);
      for (let yy = top; yy < bot; yy++) { const w = Math.round((6 + (yy - top) * 0.28) * grow); ctx.fillStyle = ((yy + frame) >> 2) % 3 === 0 ? 'rgba(160,255,140,0.34)' : 'rgba(120,240,120,0.22)'; ctx.fillRect(bx - w, yy, w * 2, 1); }
      ctx.fillStyle = 'rgba(200,255,190,0.5)'; for (let k = 0; k < 6; k++) { const yy = top + ((frame * 2 + k * 23) % Math.max(1, bot - top)); ctx.fillRect(bx - 1 + ((k * 7) % 9) - 4, yy, 2, 2); }
    }
    return _du.call(this, e, x, y);
  };
  const _ue2 = Play.prototype.updateEnt;
  Play.prototype.updateEnt = function (e) {
    if (e.type === 'beamling' && !e.dying && !e.iced && !(this.freezeT > 0) && !this._p2ctx) {
      e.t++;
      const p = this.p;
      if (e.state === 'beam') {
        e.y += 1.3; e.x += Math.sin(e.t * 0.2) * 0.3;
        const ty = Math.floor((e.y + e.h + 1) / TS), tx = Math.floor((e.x + e.w / 2) / TS);
        if (SOLID.has(this.tile(tx, ty)) || this.tile(tx, ty) === '=' || e.y > VH) { e.state = 'walk'; e.enemy = true; e.vx = (p.x < e.x ? -1 : 1) * 0.7 * DIFF[this.diff].speed * (this.speedMul || 1); this.parts.push({ k: 'dust', x: e.x + 6, y: e.y + e.h, vx: 0, vy: -0.3, life: 14 }); }
      } else {
        e.vy = Math.min(5, e.vy + 0.3);
        if (e.onGround && e.t % 100 === 0) { e.vy = -4.2; e.vx = (p.x < e.x ? -1 : 1) * Math.abs(e.vx || 0.7); }
        this.move(e, true);
        if (e.hitWall) e.vx = -e.hitWall * Math.abs(e.vx);
        if (e.vx) e.face = e.vx < 0 ? -1 : 1;
      }
    }
    return _ue2.call(this, e);
  };
  const _de2 = Play.prototype.drawEnt;
  Play.prototype.drawEnt = function (e, cx) {
    if (e.type !== 'beamling') return _de2.call(this, e, cx);
    const img = (e.face < 0 ? Sprites.beamlingL : Sprites.beamling)[e.state === 'beam' ? 0 : (e.t >> 3) & 1], x = Math.round(e.x - cx) - 2, y = Math.round(e.y) - 2;
    if (e.dying === 'flip') { ctx.save(); ctx.translate(x + 8, y + 8); ctx.scale(1, -1); ctx.drawImage(img, -8, -8); ctx.restore(); return; }
    if (e.dying === 'squish') { ctx.drawImage(img, 0, 8, 16, 8, x, y + 8, 16, 8); return; }
    if (e.state === 'beam') { ctx.save(); ctx.globalAlpha = 0.55 + 0.35 * Math.sin(e.t * 0.4); ctx.drawImage(img, x, y); ctx.restore(); return; }
    ctx.drawImage(img, x, y);
  };
}
