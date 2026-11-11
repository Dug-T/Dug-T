'use strict';
// =====================================================================
// Update 1.1 (part 1): weather you can hear (rain, wind, splashes),
// rainbows with coin trails, fog and hailstorms, lightning that shows
// hidden blocks, phone buzzes, the New Game+ remix and gold outfit,
// the What's New screen, WallyMan's Diary, the Statue Garden, trophy
// cards, the Weekly Challenge, song choice in Beat Tapper and co-op
// boss battles.
// =====================================================================
ACH_LIST.push(['rainbow', 'END OF THE RAINBOW', 'FOLLOW A RAINBOW COIN TRAIL'], ['weekly', 'WEEKEND WARRIOR', 'FINISH A WEEKLY CHALLENGE'], ['diary', 'DEAR DIARY', 'READ 5 DIARY ENTRIES'],
  ['statues', 'ART COLLECTOR', 'FILL 8 PLINTHS IN THE STATUE GARDEN'], ['teamwork', 'TEAMWORK!', 'LAND A TEAM BLAST ON A BOSS'], ['goldhero', 'GOLDEN HERO', 'START A NEW GAME+ REMIX'], ['sharecard', 'SHOW OFF', 'MAKE A TROPHY CARD']);

// phone buzzes (most Android phones; iPhones do not let web pages vibrate)
function buzz(pattern) {
  if (Settings.get('rumble') === false || !touchUsed || !navigator.vibrate) return;
  try { navigator.vibrate(pattern); } catch (e) { /* ignore */ }
}

// ---------------- weather: hail and fog join rain, storms and snow ----------------
Object.assign(WX_MSG, { hail: 'HAILSTORM! WATCH ABOVE!', fog: 'A THICK FOG ROLLS IN...' });
{
  const _pw = pickWeather;
  pickWeather = function (theme, not) { // eslint-disable-line no-func-assign
    if (Math.random() < 0.22) { const k = theme === 'beach' || theme === 'candy' || Math.random() < 0.5 ? 'fog' : 'hail'; if (k !== not) return k; }
    return _pw(theme, not);
  };
}
const forceWeather = (pl, cur) => { pl.wx = { cur, amt: 1, want: null, timer: 1e9, flash: 0, baseIce: !!pl.def.ice, fixed: true }; };
const levelFlash = (pl) => { // true while lightning lights up the level
  if (pl.wx && pl.wx.flash > 3) return true;
  const dark = pl.def.dark || (pl.def.darkCols && pl.def.darkCols.has(Math.floor((pl.p.x + pl.p.w / 2) / TS)));
  if (!dark) return false; const lf = frame % 420; return lf < 5 || (lf > 10 && lf < 14);
};
const groundRow = (pl, tx) => { for (let ty = 2; ty < 14; ty++) if (SOLID.has(pl.tile(tx, ty)) && !SOLID.has(pl.tile(tx, ty - 1))) return ty; return -1; };
{
  const _upd = Play.prototype.update;
  Play.prototype.update = function () {
    const p = this.p, wasGround = p.onGround, pound = p.pound, inv = p.inv, wxBefore = this.wx && this.wx.cur;
    _upd.call(this);
    // weather sounds follow the weather on screen
    const rain = this.state === 'play' || this.state === 'clear' ? this.rainNow() : 0;
    let wind = Math.abs(this.windNow()) + (this.wx && this.wx.cur === 'thunder' ? 0.35 * this.wx.amt : 0) + (this.wx && this.wx.cur === 'hail' ? 0.3 * this.wx.amt : 0) + (this.windZoneT > 0 ? 0.7 : 0);
    if (this.def.storm) wind += 0.25;
    Audio8.ambience(this.paused ? rain * 0.3 : rain, this.paused ? 0 : Math.min(1, wind));
    if (this.paused || this.talk || this.photo) return;
    // puddle splashes when you land in the rain, and a buzz on a hit or a ground-pound
    if (p.onGround && !wasGround && rain > 0.3 && this.state === 'play') { Audio8.sfx('splash'); this.splashes = this.splashes || []; for (let i = 0; i < 7; i++) this.splashes.push({ x: p.x + p.w / 2, y: p.y + p.h - 1, vx: (i - 3) * 0.45, vy: -1.4 - Math.random() * 1.2, life: 24 }); }
    if (pound === -1 && p.pound !== -1 && p.onGround) buzz(70);
    if (p.inv > inv + 30) buzz([90, 40, 90]);
    const w = this.wx; if (!w) return;
    // a rainbow (and sometimes a rainbow coin trail) when the rain stops
    if (wxBefore && w.cur !== wxBefore && (wxBefore === 'rain' || wxBefore === 'thunder') && w.cur !== 'rain' && w.cur !== 'thunder' && this.state === 'play') this.makeRainbow();
    if (this.rainbow) this.rainbow.t++;
    // hail: little stones bounce about, and now and then a big one drops (its shadow shows where)
    if (w.cur === 'hail' && w.amt > 0.7 && this.state === 'play') {
      if (Math.random() < 0.08) Audio8.sfx('hail');
      if (--w.bigT <= 0 || !(w.bigT > 0)) {
        w.bigT = 150 + Math.floor(Math.random() * 120);
        if (!this.bossLock && !this.arena) { const x = p.x + p.w / 2 + (Math.random() * 140 - 50); const gy = groundRow(this, Math.floor(x / TS)); if (gy > 0) this.ents.push({ type: 'hailstone', alive: true, t: 0, x: x - 5, y: -16, w: 10, h: 10, vy: 0, gy: gy * TS, warn: 55 }); }
      }
    }
  };
  Play.prototype.makeRainbow = function () {
    this.rainbow = { t: 0 }; Audio8.sfx('rainbow');
    if (Math.random() > 0.45 || this.mode || this.bossLock) return;
    const x0 = Math.floor(this.p.x / TS) + 4, cols = [];
    for (let i = 0; i < 10; i++) { const gy = groundRow(this, x0 + i * 1); if (gy < 0) return; cols.push(gy); }
    cols.forEach((gy, i) => { const lift = 2 + Math.round(Math.sin((Math.PI * i) / 9) * 2.5); this.ents.push({ type: 'rcoin', item: true, alive: true, t: i * 4, x: (x0 + i) * TS + 3, y: (gy - lift) * TS + 2, w: 10, h: 12, last: i === 9 }); });
    this.parts.push({ k: 'text', s: 'FOLLOW THE RAINBOW!', x: this.p.x - 40, y: this.p.y - 30, vy: -0.3, life: 90 });
  };
  const _ue = Play.prototype.updateEnt;
  Play.prototype.updateEnt = function (e) {
    const p = this.p;
    if (e.type === 'rcoin') {
      e.t++; if (this.state !== 'play' || !overlap(p, e)) return;
      e.alive = false; this.addCoin(); Audio8.sfx('coin'); this.parts.push({ k: 'spark', x: e.x + 2, y: e.y + 2, life: 10 });
      if (e.last && !this.ents.some((k) => k.type === 'rcoin' && k.alive)) { for (let k = 0; k < 9; k++) this.addCoin(); game.lives++; Ach.unlock('rainbow'); Audio8.sfx('oneup'); this.parts.push({ k: 'text', s: 'RAINBOW SECRET! 1-UP', x: e.x - 50, y: e.y - 20, vy: -0.4, life: 100 }); }
      return;
    }
    if (e.type === 'hailstone') {
      if (this._p2ctx) return;
      if (e.warn > 0) { e.warn--; return; }
      e.vy = Math.min(7, e.vy + 0.3); e.y += e.vy;
      if (e.y + e.h >= e.gy) { e.alive = false; Audio8.sfx('hail'); Audio8.sfx('brick'); for (let k = 0; k < 6; k++) this.parts.push({ k: 'spark', x: e.x + 5 + (k - 3) * 3, y: e.gy - 4, life: 12 }); }
      if (this.state === 'play' && overlap(p, e)) { this.hurt(); e.alive = false; }
      return;
    }
    return _ue.call(this, e);
  };
  const _de = Play.prototype.drawEnt;
  Play.prototype.drawEnt = function (e, cx) {
    const x = Math.round(e.x - cx), y = Math.round(e.y);
    if (e.type === 'rcoin') { const h = (frame * 4 + e.t * 30) % 360, b = Math.sin(frame * 0.1 + e.t) * 2; ctx.fillStyle = '#1a1020'; ctx.fillRect(x, y + b, 10, 12); ctx.fillStyle = `hsl(${h},90%,60%)`; ctx.fillRect(x + 1, y + 1 + b, 8, 10); ctx.fillStyle = '#fff'; ctx.fillRect(x + 3, y + 3 + b, 2, 5); if (e.last) txt('?', x + 2, y - 10 + b, `hsl(${h},90%,70%)`, { outline: '#101848' }); return; }
    if (e.type === 'hailstone') {
      if (e.warn > 0 || e.y < e.gy - 40) { const s = 6 + Math.round((1 - Math.max(0, e.warn) / 55) * 6); ctx.fillStyle = 'rgba(20,30,60,0.45)'; ctx.fillRect(x + 5 - s / 2, e.gy - 3, s, 3); }
      if (e.warn > 0) return;
      hR(x, y, 10, 10, '#1a1020'); hR(x + 1, y + 1, 8, 8, '#d8f0ff'); hR(x + 2, y + 2, 3, 3, '#ffffff'); hR(x + 6, y + 6, 2, 2, '#90b8e0'); return;
    }
    return _de.call(this, e, cx);
  };
  const _dw = Play.prototype.drawWeather;
  Play.prototype.drawWeather = function (cx) {
    const w = this.wx, rain = this.rainNow();
    // the rainbow sits in the sky behind the rain
    if (this.rainbow && this.rainbow.t < 1500) {
      const a = Math.min(1, this.rainbow.t / 120, (1500 - this.rainbow.t) / 200) * 0.32;
      ['#ff4040', '#ff9a30', '#ffe040', '#50d850', '#40a0ff', '#8050e0'].forEach((c, i) => { ctx.strokeStyle = c; ctx.globalAlpha = a; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(150 - cx * 0.05, 250, 190 - i * 4, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); });
      ctx.globalAlpha = 1; ctx.lineWidth = 1;
    }
    _dw.call(this, cx);
    // puddles on the ground while it rains
    if (rain > 0.25) {
      const t0 = Math.floor(cx / TS);
      for (let tx = t0; tx <= t0 + 16; tx++) { if ((tx * 7) % 5 > 1) continue; const gy = groundRow(this, tx); if (gy < 0) continue; const X = tx * TS - cx, ww = 8 + ((tx * 3) % 6); ctx.fillStyle = `rgba(150,190,240,${0.55 * rain})`; ctx.fillRect(X + 2, gy * TS - 1, ww, 2); if ((frame + tx * 13) % 40 < 6) { ctx.fillStyle = 'rgba(230,245,255,0.8)'; ctx.fillRect(X + 2 + ((frame >> 1) % ww), gy * TS - 2, 1, 1); } }
    }
    if (this.splashes && this.splashes.length) {
      ctx.fillStyle = 'rgba(200,225,255,0.9)';
      for (const s of this.splashes) { s.x += s.vx; s.y += s.vy; s.vy += 0.18; s.life--; ctx.fillRect(Math.round(s.x - cx), Math.round(s.y), 2, 2); }
      this.splashes = this.splashes.filter((s) => s.life > 0);
    }
    if (!w) return;
    if (w.cur === 'hail' && w.amt > 0) {
      ctx.fillStyle = 'rgba(30,40,70,' + (0.15 * w.amt) + ')'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e8f4ff'; const n = Math.round(40 * w.amt);
      for (let i = 0; i < n; i++) { const x = (((i * 41 - cx * 0.3 - frame * 1.5) % VW) + VW) % VW, y = (i * 59 + frame * (5 + (i % 3))) % (VH + 10) - 10; ctx.fillRect(Math.round(x), Math.round(y), 2, 2); }
    }
    if (w.cur === 'fog' && w.amt > 0) {
      const px = this.p.x + this.p.w / 2 - cx, py = this.p.y + this.p.h / 2, gr = ctx.createRadialGradient(px, py, 40, px, py, 150);
      gr.addColorStop(0, 'rgba(225,230,238,0)'); gr.addColorStop(1, `rgba(225,230,238,${0.9 * w.amt})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = `rgba(240,244,250,${0.18 * w.amt})`; for (let i = 0; i < 5; i++) { const x = ((((i * 97 - frame * (0.2 + i * 0.07) - cx * 0.4) % 400) + 400) % 400) - 100; ctx.fillRect(Math.round(x), 30 + i * 36, 140, 10); }
    }
  };
  // lightning shows hidden blocks and cracked walls for a moment
  const _dt = Play.prototype.drawTiles;
  Play.prototype.drawTiles = function (cx) {
    _dt.call(this, cx);
    if (!levelFlash(this)) return;
    const t0 = Math.floor(cx / TS);
    for (let ty = 0; ty < 14; ty++) for (let tx = t0; tx <= t0 + 16; tx++) {
      const c = this.tile(tx, ty), X = tx * TS - cx, Y = ty * TS;
      if (c === 'I') { ctx.strokeStyle = '#ffffa0'; ctx.setLineDash([3, 2]); ctx.strokeRect(X + 1.5, Y + 1.5, 13, 13); ctx.setLineDash([]); txt('?', X + 5, Y + 4, '#ffffa0'); }
      if (c === 'R') { ctx.strokeStyle = '#ffffa0'; ctx.strokeRect(X + 0.5, Y + 0.5, 15, 15); hR(X + 4, Y + 3, 2, 6, '#ffffa0'); hR(X + 6, Y + 8, 4, 2, '#ffffa0'); }
    }
  };
  // a long rumbling buzz with nearby thunder
  const _l = Play.prototype.lightning;
  Play.prototype.lightning = function () { _l.call(this); const q = this.thunderQ && this.thunderQ[this.thunderQ.length - 1]; if (q && q.d < 0.5) q.buzz = true; };
  const _u2 = Play.prototype.update;
  Play.prototype.update = function () { const q = this.thunderQ && this.thunderQ.find((k) => k.buzz && k.t === 1); const r = _u2.call(this); if (q && !this.paused) buzz([120, 50, 200, 60, 120]); return r; };
}
{ // weather sounds stop when you leave a level
  const _go = go;
  go = function (make) { if (fadeDir !== 1) Audio8.ambience(0, 0); return _go(make); }; // eslint-disable-line no-func-assign
}

// ---------------- New Game+ remix: shuffled enemies and a golden outfit ----------------
OUTFITS.push(['gold', 'GOLDEN HERO', -1]);
COSTUME_LIST.push({ id: 'gold', name: 'GOLDEN HERO', hint: 'START A NEW GAME+', ok: () => !!(game && game.outfits && game.outfits.includes('gold')) });
function ngPlusStart() { game.outfits = game.outfits || []; if (!game.outfits.includes('gold')) game.outfits.push('gold'); Ach.unlock('goldhero'); Save.persist(); }
const NG_SWAP = { g: 'c', c: 'h', h: 'p', p: 'g', z: 'b', b: 'z', f: 'j', j: 'f' };
{
  const _sp = Play.prototype.spawn;
  Play.prototype.spawn = function (sp) {
    if (game && game.plus && !this.mode && !this.def.boss && !this.rush && !this.daily && !this.ta && !this.def.custom && NG_SWAP[sp.t] && ((sp.x * 7 + sp.y) % 3 !== 0)) return _sp.call(this, Object.assign({}, sp, { t: NG_SWAP[sp.t] }));
    return _sp.call(this, sp);
  };
  const _dh = Play.prototype.drawHUD;
  Play.prototype.drawHUD = function () { _dh.call(this); if (game && game.plus && !this.mode && this.hF < 240 && (this.hF >> 4) & 1) txt('NEW GAME+ REMIX', 128, 40, '#ffd040', { align: 'center', outline: '#101848' }); };
}

// ---------------- What's New ----------------
const UPDATES = [
  ['1.1', ['THUNDER YOU CAN HEAR ON PHONES', 'RAIN AND WIND SOUNDS, SPLASHES', 'RAINBOWS, FOG AND HAILSTORMS', 'LIGHTNING SHOWS HIDDEN BLOCKS', 'NEW ISLAND: STORM PEAKS', 'NEW ISLAND: UNDERWATER KINGDOM', 'ICE SKATING LEVELS WITH TRICKS', 'NEW GAME+ REMIX AND A GOLD OUTFIT', 'WEEKLY CHALLENGE', "WALLYMAN'S DIARY, STATUE GARDEN", 'TROPHY CARDS TO SHARE', 'BEAT TAPPER: PICK ANY SONG', 'CO-OP BOSS BATTLES (BOSS REMATCH)']],
  ['1.0', ['THE UPDATE NUMBER ON THE TITLE', 'THUNDER FOLLOWS LIGHTNING FLASHES', 'FLASHES AT RANDOM MOMENTS']],
];
const SEEN_KEY = 'wallyman-seen-version';
function drawUpdateList(v, top) {
  const u = UPDATES.find((k) => k[0] === v) || UPDATES[0];
  drawWindow(16, top, 224, 30 + u[1].length * 11);
  txt('UPDATE ' + u[0], 128, top + 7, '#ffe040', { align: 'center', scale: 2 });
  u[1].forEach((l, i) => { hR(28, top + 31 + i * 11, 3, 3, '#ffe040'); txt(l, 36, top + 29 + i * 11, '#fff'); });
}
{ // the first time the game opens after an update, show what changed (new players just start playing)
  const _T = TitleScene;
  TitleScene = function (...a) { // eslint-disable-line no-func-assign
    const s = _T(...a), u = s.update, d = s.draw;
    let seen = 0; try { seen = parseFloat(localStorage.getItem(SEEN_KEY)) || 0; } catch (e) { /* ignore */ }
    let show = seen < parseFloat(GAME_VERSION) && Save.slots.some((k) => k), t = 0;
    if (!show) try { localStorage.setItem(SEEN_KEY, GAME_VERSION); } catch (e) { /* ignore */ }
    s.update = function () {
      if (show) { t++; if (t > 30 && (Input.confirm() || Input.pressed('start') || Input.pressed('back'))) { show = false; Audio8.sfx('confirm'); try { localStorage.setItem(SEEN_KEY, GAME_VERSION); } catch (e) { /* ignore */ } } return; }
      return u.call(this);
    };
    s.draw = function () { d.call(this); if (!show) return; ctx.fillStyle = 'rgba(10,10,30,0.6)'; ctx.fillRect(0, 0, VW, VH); txt("WHAT'S NEW!", 128, 4, '#5ff0ff', { align: 'center', outline: '#101848' }); drawUpdateList(GAME_VERSION, 16); if (t > 30 && (t >> 4) & 1) txt('PRESS A TO PLAY', 128, 212, '#fff', { align: 'center', outline: '#101848' }); };
    return s;
  };
}
function UpdatesScene() {
  let sel = 0, t = 0;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (Input.pressed('back') || Input.pressed('run') || Input.confirm()) { go(() => ExtrasScene('UPDATES')); return; }
      if (Input.pressed('right') || Input.pressed('down')) { sel = (sel + 1) % UPDATES.length; Audio8.sfx('select'); }
      if (Input.pressed('left') || Input.pressed('up')) { sel = (sel + UPDATES.length - 1) % UPDATES.length; Audio8.sfx('select'); }
    },
    draw() { drawParallax('sky', t * 0.3); drawUpdateList(UPDATES[sel][0], 12); txt(`< ${sel + 1}/${UPDATES.length} >   B: BACK`, 128, 212, '#fff', { align: 'center', outline: '#101848' }); },
  };
}

// ---------------- WallyMan's Diary ----------------
const DIARY = [
  [7, 'WALLY ISLAND', ['DEAR DIARY, TODAY I BEAT', 'BARON STATIC. HE SAID I', "WAS 'ONLY A BIT OF NOISE'.", 'I SAID HE WAS A BIT OF', 'A SORE LOSER. GOOD DAY.']],
  [14, 'STAR ISLE', ['DEAR DIARY, I WENT TO', 'SPACE IN MY PYJAMAS.', 'NOBODY TOLD ME THE MOON', 'WAS SO BOUNCY. I MAY HAVE', 'BUMPED MY HEAD 40 TIMES.']],
  [20, 'CARNIVAL ISLE', ['DEAR DIARY, I ATE NINE', 'CANDY FLOSSES AND RODE', 'THE BIG WHEEL. THEN I', 'FOUGHT A RINGMASTER. IN', 'THAT ORDER. MISTAKE.']],
  [27, 'THE LOST LANDS', ['DEAR DIARY, A VOLCANO', 'TRIED TO EAT MY BOOTS.', 'THE BOOTS SURVIVED. MY', 'EYEBROWS DID NOT. THEY', 'WILL GROW BACK. PROBABLY.']],
  [44, 'CRYSTAL ISLE', ['DEAR DIARY, EVERYTHING', 'HERE IS SHINY. I SAW MY', 'REFLECTION 300 TIMES.', 'I LOOK GREAT IN EVERY', 'SINGLE ONE OF THEM.']],
  [55, 'PIRATE COVE', ['DEAR DIARY, ARRR. I SAID', 'ARRR ALL DAY. DINO SAYS', 'IF I SAY ARRR ONE MORE', 'TIME HE WILL MOVE OUT.', 'ARRR.']],
  [62, 'DINO VALLEY', ['DEAR DIARY, I MET DINO\'S', 'GREAT-GREAT-GREAT GRANDAD.', 'HE TRIED TO EAT ME. DINO', 'SAYS THAT IS HOW THEY', 'SAY HELLO. HMM.']],
  [69, 'ORBIT ONE', ['DEAR DIARY, NO GRAVITY!', 'I FLOATED INTO A ROBOT.', 'IT SAID BEEP. I SAID', 'BEEP BACK. THEN I STOMPED', 'IT. SORRY, ROBOT.']],
  [78, 'STORM PEAKS', ['DEAR DIARY, THE THUNDER', 'WAS SO LOUD I HEARD IT', 'IN MY SOCKS. A CLOUD WITH', 'A CROWN SHOUTED AT ME.', 'I RAINED ON HIS PARADE.']],
  [85, 'UNDERWATER KINGDOM', ['DEAR DIARY, I HELD MY', 'BREATH FOR A WHOLE ISLAND.', 'A SEA SERPENT ASKED ME TO', 'LEAVE. I ASKED HER TO', 'MOVE. SHE MOVED. YAY.']],
  [72, 'THE GLITCH WORLD', ['DEAR DIARY, DEAR DIARY,', 'DEAR DIARY. SOMETHING IS', 'WRONG WITH MY PEN. EVERY-', 'THING WENT BACKWARDS AND', 'THEN... LAG. ANYWAY, BYE.']],
  [63, 'THE SIGNAL SOURCE', ['DEAR DIARY, I FOUND WHERE', 'THE SIGNAL COMES FROM.', 'IT IS VERY BRIGHT AND', 'HUMS A LITTLE TUNE. I', 'HUMMED IT BACK. FRIENDS!']],
];
function wrapText(s, n) { const out = []; let line = ''; for (const w of s.split(' ')) { if (line && (line + ' ' + w).length > n) { out.push(line); line = w; } else line = line ? line + ' ' + w : w; } if (line) out.push(line); return out; }
const diaryOpen = () => DIARY.filter((d) => game && game.cleared[d[0]]);
function DiaryScene(back) {
  let sel = 0, t = 0; game.diaryRead = game.diaryRead || [];
  const open = diaryOpen();
  return {
    enter() { Audio8.play('map'); },
    update() {
      t++;
      if (Input.pressed('back') || Input.pressed('run')) { go(back || (() => HouseScene(10))); return; }
      if (Input.pressed('right')) { sel = (sel + 1) % DIARY.length; Audio8.sfx('map'); } if (Input.pressed('left')) { sel = (sel + DIARY.length - 1) % DIARY.length; Audio8.sfx('map'); }
      const d = DIARY[sel]; if (open.includes(d) && !game.diaryRead.includes(d[0])) { game.diaryRead.push(d[0]); Save.persist(); if (game.diaryRead.length >= 5) Ach.unlock('diary'); }
    },
    draw() {
      ctx.fillStyle = '#5a3a1a'; ctx.fillRect(0, 0, VW, VH);
      hR(18, 14, 220, 196, '#3a2410'); hR(22, 16, 104, 190, '#f4e8c8'); hR(130, 16, 104, 190, '#f4e8c8'); hR(126, 16, 4, 190, '#c8b080');
      for (let y = 40; y < 200; y += 12) { hR(26, y, 96, 1, '#d8c8a0'); hR(134, y, 96, 1, '#d8c8a0'); }
      const d = DIARY[sel], has = open.includes(d);
      txt("WALLYMAN'S", 74, 22, '#6a3a1a', { align: 'center', shadow: null }); txt('DIARY', 74, 32, '#6a3a1a', { align: 'center', shadow: null });
      drawWally(74, 110, 'idle' + ((t >> 4) % 4), 1); txt(`PAGE ${sel + 1}/${DIARY.length}`, 74, 130, '#8a6a4a', { align: 'center', shadow: null }); txt(`${open.length} WRITTEN`, 74, 144, '#8a6a4a', { align: 'center', shadow: null });
      txt('< > TURN PAGE', 74, 190, '#8a6a4a', { align: 'center', shadow: null });
      txt(has ? d[1] : '???', 182, 22, '#a02020', { align: 'center', shadow: null });
      if (has) wrapText(d[2].join(' '), 16).forEach((l, i) => txt(l, 136, 44 + i * 12, '#2a1a10', { shadow: null })); else ['THIS PAGE IS STILL', 'BLANK. FINISH MORE', 'ISLANDS TO FILL IT!'].forEach((l, i) => txt(l, 182, 80 + i * 12, '#a08a6a', { align: 'center', shadow: null }));
    },
  };
}
{ // a little note on the map when a new diary page is written
  const _M = MapScene;
  MapScene = function (...a) { // eslint-disable-line no-func-assign
    const s = _M(...a), d = s.draw; let t = 0;
    s.draw = function () {
      d.call(this); t++; if (!game) return;
      const WD = WORLDS[game.world || 0]; if (WD.name.length > 16 && game.players !== 2) { drawWindow(4, 4, 248, 20); txt(WD.name + (game.plus ? ' +' + game.plus : ''), 10, 10, '#ffe040'); ctx.drawImage(Sprites.heart, 124, 10); txt('*' + pad(game.lives, 2), 133, 10); ctx.drawImage(Sprites.coinIcon, 160, 10); txt('*' + pad(game.coins, 2), 167, 10); txt(pad(game.score, 7), 206, 10); } const n = diaryOpen().filter((k) => !(game.diaryRead || []).includes(k[0])).length; if (n && t < 400 && (t >> 5) & 1) txt('NEW DIARY PAGE! (DINO\'S HOUSE)', 128, 38, '#ffe040', { align: 'center', outline: '#101848' }); };
    return s;
  };
}

// ---------------- the Statue Garden: a gold statue for every boss you beat ----------------
function statueList() { return REMATCH.map((li) => { const d = LEVELS[li], key = d.talk || d.bossType; return { li, name: d.bossName || BOSS_NAMES[key] || (li === 7 ? 'BARON STATIC (TOWER)' : 'BARON STATIC'), art: BOSS_ART[key] || (li === 14 ? 'mother' : 'boss'), got: !!(game.cleared[li] || (li === 50 && storyDone() >= 3)) }; }); }
function drawStatue(art, x, y) { // the boss's sticker, cast in gold (a colour filter, where the browser has one)
  ctx.save(); ctx.translate(x, y); ctx.scale(1.4, 1.4);
  if ('filter' in ctx) ctx.filter = 'grayscale(1) sepia(1) saturate(3.5) brightness(1.15)';
  try { stickerArt(art, 0, 0, 0); } catch (e) { /* ignore */ }
  ctx.restore();
}
function StatueGardenScene() {
  let sel = 0, t = 0; const L = statueList(), got = L.filter((k) => k.got).length;
  if (got >= 8) Ach.unlock('statues');
  return {
    enter() { Audio8.play('map'); },
    update() {
      t++;
      if (Input.pressed('back') || Input.pressed('run') || Input.confirm()) { go(() => HouseScene(11)); return; }
      if (Input.pressed('right')) { sel = (sel + 1) % L.length; Audio8.sfx('select'); } if (Input.pressed('left')) { sel = (sel + L.length - 1) % L.length; Audio8.sfx('select'); }
      if (Input.pressed('down')) { sel = Math.min(L.length - 1, sel + 4); Audio8.sfx('select'); } if (Input.pressed('up')) { sel = Math.max(0, sel - 4); Audio8.sfx('select'); }
    },
    draw() {
      ctx.fillStyle = '#8ad0f8'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#5ab048'; ctx.fillRect(0, 60, VW, VH); ctx.fillStyle = '#4a9a3a'; for (let y = 64; y < VH; y += 6) for (let x = (y % 12) / 2; x < VW; x += 12) ctx.fillRect(x, y, 2, 2);
      txt('STATUE GARDEN', 128, 6, '#ffe040', { align: 'center', scale: 2, outline: '#101848' }); txt(`${got}/${L.length} BOSSES BEATEN`, 128, 26, '#fff', { align: 'center', outline: '#101848' });
      const page = Math.floor(sel / 8);
      for (let i = 0; i < 8; i++) {
        const k = page * 8 + i, s = L[k]; if (!s) break;
        const x = 18 + (i % 4) * 60, y = 44 + Math.floor(i / 4) * 78, on = k === sel;
        hR(x + 6, y + 50, 40, 16, '#1a1020'); hR(x + 7, y + 51, 38, 14, '#d0d0d8'); hR(x + 7, y + 51, 38, 3, '#f0f0f8');
        if (s.got) drawStatue(s.art, x + 26, y + 30); else { hR(x + 16, y + 26, 20, 24, 'rgba(60,70,90,0.5)'); txt('?', x + 24, y + 32, '#fff'); }
        if (on) { hR(x, y - 2, 52, 2, '#ffe040'); hR(x, y + 68, 52, 2, '#ffe040'); }
      }
      const s = L[sel]; drawWindow(16, 200, 224, 20); txt(s.got ? s.name : 'NOT BEATEN YET', 128, 206, s.got ? '#ffe040' : '#a8b0d8', { align: 'center' });
    },
  };
}

// ---------------- the Trophy Room: turn a trophy into a card to share ----------------
function trophyCard(a) {
  const c = Sprites.canvas(VW, VH), x = c.getContext('2d'), F = (s, X, Y, col, o = {}) => Font.draw(x, s, X, Y, Object.assign({ color: col, shadow: '#000', sd: 1 }, o));
  const g = x.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#3a1a6a'); g.addColorStop(1, '#101848'); x.fillStyle = g; x.fillRect(0, 0, VW, VH);
  x.fillStyle = '#ffd040'; x.fillRect(6, 6, VW - 12, 2); x.fillRect(6, VH - 8, VW - 12, 2); x.fillRect(6, 6, 2, VH - 12); x.fillRect(VW - 8, 6, 2, VH - 12);
  F('WALLYMAN WORLD', 128, 16, '#5ff0ff', { align: 'center', scale: 2 }); F('TROPHY UNLOCKED!', 128, 40, '#fff', { align: 'center' });
  x.fillStyle = '#1a1020'; x.fillRect(102, 58, 52, 56); x.fillStyle = '#ffd040'; x.fillRect(108, 62, 40, 30); x.fillRect(122, 92, 12, 10); x.fillRect(112, 102, 32, 8); x.fillStyle = '#fff0a0'; x.fillRect(112, 66, 8, 20); x.fillStyle = '#c09010'; x.fillRect(100, 66, 8, 14); x.fillRect(148, 66, 8, 14);
  F(a[1], 128, 126, '#ffe040', { align: 'center', scale: a[1].length > 15 ? 1 : 2 }); F(a[2], 128, 150, '#fff', { align: 'center' });
  Wally.draw(x, 40, 200, 'jump', 1, { t: 0, hero: heroOf(), costume: game ? game.costume : 'classic' });
  const d = new Date(); F(`${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`, 236, 186, '#a8b0d8', { align: 'right' }); F('UPDATE ' + GAME_VERSION, 236, 198, '#a8b0d8', { align: 'right' });
  return c;
}
function shareCard(c, name) {
  PhotoAlbum.add(c); Ach.unlock('sharecard');
  const url = c.toDataURL('image/png'), file = 'wallyman-trophy-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png';
  try {
    if (navigator.canShare && typeof File === 'function') {
      c.toBlob((b) => { const f = new File([b], file, { type: 'image/png' }); if (navigator.canShare({ files: [f] })) navigator.share({ files: [f], title: 'WallyMan World' }).catch(() => {}); else { const el = document.createElement('a'); el.href = url; el.download = file; document.body.appendChild(el); el.click(); el.remove(); } });
      return;
    }
    const el = document.createElement('a'); el.href = url; el.download = file; document.body.appendChild(el); el.click(); el.remove();
  } catch (e) { /* ignore */ }
}
function TrophyScene() { // eslint-disable-line no-func-assign
  let sel = 0, t = 0, msg = '', msgT = 0;
  return {
    enter() { Audio8.play('victory'); },
    update() {
      t++; if (msgT) msgT--;
      if (Input.pressed('down')) { sel = (sel + 2) % ACH_LIST.length; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + ACH_LIST.length - 2) % ACH_LIST.length; Audio8.sfx('select'); }
      if (Input.pressed('right')) { sel = (sel + 1) % ACH_LIST.length; Audio8.sfx('select'); }
      if (Input.pressed('left')) { sel = (sel + ACH_LIST.length - 1) % ACH_LIST.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || Input.pressed('run')) { go(() => ExtrasScene('TROPHY ROOM')); return; }
      if (Input.confirm()) { const a = ACH_LIST[sel]; if (!Ach.has(a[0])) { msg = 'WIN THIS TROPHY FIRST!'; Audio8.sfx('bump'); } else { shareCard(trophyCard(a), a[1]); msg = 'CARD SAVED TO YOUR PHOTO ALBUM!'; Audio8.sfx('check'); } msgT = 120; }
    },
    draw() {
      ctx.fillStyle = '#3a2410'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#5a3a1a'; for (let y = 34; y < 190; y += 26) ctx.fillRect(0, y + 18, VW, 3);
      txt(`TROPHY ROOM  ${Ach.count()}/${ACH_LIST.length}`, 128, 8, '#ffe040', { align: 'center', outline: '#000' });
      const top = Math.max(0, Math.min(ACH_LIST.length - 12, (sel & ~1) - 4));
      for (let i = 0; i < 12; i++) {
        const k = top + i, a = ACH_LIST[k]; if (!a) break;
        const col = k % 2, row = i >> 1, x = 10 + col * 124, y = 24 + row * 26, has = Ach.has(a[0]), on = k === sel;
        ctx.fillStyle = on ? '#ffe040' : '#1a1020'; ctx.fillRect(x - 1, y - 1, 118, 22);
        ctx.fillStyle = has ? '#6a4a20' : '#2a1a10'; ctx.fillRect(x, y, 116, 20);
        ctx.fillStyle = has ? '#ffd040' : '#4a3a2a'; ctx.fillRect(x + 4, y + 4, 10, 8); ctx.fillRect(x + 7, y + 12, 4, 3); ctx.fillRect(x + 5, y + 15, 8, 2);
        txt(has ? (a[1].length > 15 ? a[1].slice(0, 15) : a[1]) : '???', x + 19, y + 7, has ? '#fff' : '#8a7a6a');
      }
      const a = ACH_LIST[sel];
      drawWindow(8, 182, 240, 38);
      txt(Ach.has(a[0]) ? a[1] : 'LOCKED', 128, 187, Ach.has(a[0]) ? '#ffe040' : '#ff8080', { align: 'center' });
      txt(a[2], 128, 198, '#fff', { align: 'center' });
      txt(msgT ? msg : Ach.has(a[0]) ? 'A: MAKE A CARD TO SHARE' : 'B: BACK', 128, 209, msgT ? '#5ff0ff' : '#a8b0d8', { align: 'center' });
    },
  };
}

// ---------------- Weekly Challenge: three levels and one rule, all week ----------------
const WEEKLY_RULES = [
  { id: 'turbo', name: 'TURBO WEEK', tip: 'ENEMIES MOVE TWICE AS FAST', setup: (pl) => { pl.speedMul = 2; } },
  { id: 'norun', name: 'NO RUNNING', tip: 'THE RUN BUTTON TAKES A WEEK OFF', setup: (pl) => { pl.noRun = true; } },
  { id: 'back', name: 'BACKWARDS WEEK', tip: 'LEFT IS RIGHT AND RIGHT IS LEFT', def: { swapLR: true } },
  { id: 'bounce', name: 'BOUNCY WEEK', tip: 'YOU NEVER STOP BOUNCING', def: { bouncy: true } },
  { id: 'fog', name: 'FOGGY WEEK', tip: 'THICK FOG ON EVERY LEVEL', setup: (pl) => forceWeather(pl, 'fog') },
  { id: 'hail', name: 'HAIL WEEK', tip: 'BIG HAILSTONES - WATCH THE SHADOWS', setup: (pl) => forceWeather(pl, 'hail') },
  { id: 'moon', name: 'MOON WEEK', tip: 'FLOATY JUMPS EVERYWHERE', def: { lowGrav: true } },
  { id: 'heart', name: 'ONE HEART WEEK', tip: 'ONE HIT AND THE RUN IS OVER', setup: (pl) => { pl.p.hearts = 1; } },
  { id: 'storm', name: 'STORM WEEK', tip: 'THUNDERSTORMS AND LIGHTNING BOLTS', setup: (pl) => forceWeather(pl, 'thunder') },
];
const weekKey = () => Math.floor((Date.now() / 864e5 + 3) / 7);
function weeklyThis() {
  let s = (weekKey() * 2654435761) % 4294967296; const r = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  r(); const pool = LEVELS.map((d, i) => i).filter((i) => i < 64 && !LEVELS[i].shmup && !LEVELS[i].minecart && !LEVELS[i].secretRoom && !LEVELS[i].board && !LEVELS[i].sub && !LEVELS[i].train && !LEVELS[i].tower && !LEVELS[i].boss && !LEVELS[i].puzzle && !LEVELS[i].story && !LEVELS[i].tutorial && !LEVELS[i].bonus && !LEVELS[i].glitch);
  const lv = []; while (lv.length < 3) { const li = pool[Math.floor(r() * pool.length)]; if (!lv.includes(li)) lv.push(li); }
  return { lv, rule: WEEKLY_RULES[Math.floor(r() * WEEKLY_RULES.length)], key: weekKey() };
}
function startWeekly(i, score) {
  const w = weeklyThis(), pl = new Play(w.lv[i], false, {}); pl.mode = { kind: 'weekly', i, score, rule: w.rule.id };
  if (w.rule.def) pl.def = Object.assign({}, pl.def, w.rule.def);
  if (w.rule.setup) w.rule.setup(pl);
  return pl;
}
function WeeklyScene() {
  const w = weeklyThis(); let t = 0; const best = lsJ('wallyman-weekly', {});
  return {
    enter() { Audio8.play('map'); },
    update() { t++; if (Input.pressed('back') || Input.pressed('run')) { go(() => ChallengeScene(14)); return; } if (t > 20 && Input.confirm()) { game = challengeGame(); Audio8.sfx('confirm'); go(() => startWeekly(0, 0)); } },
    draw() {
      drawParallax(LEVELS[w.lv[0]].theme, t * 0.4); drawWindow(20, 10, 216, 150);
      txt('WEEKLY CHALLENGE', 128, 16, '#ffe040', { align: 'center' });
      const end = new Date((w.key * 7 + 4) * 864e5); txt('NEW RULES IN ' + Math.max(1, Math.ceil((end - Date.now()) / 864e5)) + ' DAY(S)', 128, 28, '#a8b0d8', { align: 'center' });
      txt('RULE: ' + w.rule.name, 128, 44, '#ff8080', { align: 'center' }); txt(w.rule.tip, 128, 56, '#fff', { align: 'center' });
      w.lv.forEach((li, i) => txt(`${i + 1}. ${LEVELS[li].name}`, 40, 76 + i * 14, '#fff'));
      txt('BEAT ALL THREE IN A ROW!', 128, 124, '#5ff0ff', { align: 'center' });
      txt(best.key === w.key ? 'YOUR BEST THIS WEEK: ' + best.score : 'NO SCORE YET THIS WEEK', 128, 140, best.key === w.key ? '#ffe040' : '#a8b0d8', { align: 'center' });
      if ((t >> 4) & 1) txt('PRESS START TO PLAY', 128, 196, '#fff', { align: 'center', outline: '#101848' });
    },
  };
}
function WeeklyResult(score, won, reached) {
  const w = weeklyThis(), best = lsJ('wallyman-weekly', {}); let rec = false, t = 0;
  if (won) { Ach.unlock('weekly'); if (best.key !== w.key || score > best.score) { rec = true; lsS('wallyman-weekly', { key: w.key, score }); } }
  return {
    enter() { Audio8.play(won ? 'victory' : 'gameover'); },
    update() { t++; if (t > 50 && (Input.confirm() || Input.pressed('back'))) go(() => WeeklyScene()); },
    draw() {
      drawParallax('castle', t * 0.2); drawWindow(40, 60, 176, 100);
      txt(won ? 'WEEK BEATEN!' : 'OUT ON LEVEL ' + reached, 128, 70, won ? '#ffe040' : '#ff8080', { align: 'center', scale: 2 });
      txt('SCORE ' + score, 128, 100, '#fff', { align: 'center' }); if (rec && (t >> 3) & 1) txt('NEW BEST THIS WEEK!', 128, 116, '#5ff0ff', { align: 'center' });
      if (t > 50) txt('PRESS A', 128, 140, '#a8b0d8', { align: 'center' });
    },
  };
}
{
  const _me = modeExit;
  modeExit = function (pl, won) { // eslint-disable-line no-func-assign
    const m = pl.mode; if (m.kind !== 'weekly') return _me(pl, won);
    const score = game.score;
    if (won && m.i < 2) return startWeekly(m.i + 1, score);
    return WeeklyResult(score, won, m.i + 1);
  };
  const _up = Play.prototype.updatePlayer;
  Play.prototype.updatePlayer = function () { // the No Running week: the run button does nothing
    if (!this.noRun || this.state !== 'play') return _up.call(this);
    const D = Input.down, P = Input.pressed; Input.down = (k) => (k === 'run' ? false : D(k)); Input.pressed = (k) => (k === 'run' ? false : P(k));
    try { return _up.call(this); } finally { Input.down = D; Input.pressed = P; }
  };
}

// ---------------- Beat Tapper: play along to any island's song ----------------
const TAPPER_SONGS = ['grass', 'cave', 'sky', 'moon', 'carnival', 'candy', 'crystal', 'pirate', 'snow', 'water', 'neon', 'bossbeat'];
function TapperPick() {
  const L = TAPPER_SONGS.filter((k) => Audio8.songs().includes(k)).map((k) => [k, SONG_NAMES[k] || k.toUpperCase()]); let sel = 0, t = 0;
  return {
    enter() { Audio8.play('carnival'); },
    update() {
      t++;
      if (Input.pressed('back') || Input.pressed('run')) { game.coins += 3; go(() => MiniGamesScene(4)); return; }
      if (Input.pressed('down')) { sel = (sel + 1) % L.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + L.length - 1) % L.length; Audio8.sfx('select'); }
      if (Input.confirm()) { Audio8.sfx('confirm'); const k = L[sel][0]; go(() => RhythmScene(k)); }
    },
    draw() {
      drawParallax('neon', t * 0.5); drawWindow(36, 14, 184, 24 + L.length * 14); txt('BEAT TAPPER: PICK A SONG', 128, 20, '#ffe040', { align: 'center' });
      L.forEach(([, n], i) => { const y = 36 + i * 14; txt(n, 60, y, i === sel ? '#ffe040' : '#fff'); if (i === sel) txt('>', 50 + ((t >> 3) & 1), y, '#ffe040'); });
    },
  };
}

// ---------------- co-op boss battles: two heroes, one set of hearts, and a team blast ----------------
let REMATCH_COOP = false;
function RematchScene(start = 0, msg = '') { // eslint-disable-line no-func-assign
  let sel = Math.min(start, REMATCH.length - 1), t = 0; const best = lsJ('wallyman-rematch', {}), SHOW = 12;
  const nameOf = (li) => LEVELS[li].bossName || (li === 3 ? 'BARON STATIC' : li === 7 ? 'BARON STATIC (TOWER)' : '???');
  return {
    enter() { Audio8.play('boss'); },
    update() {
      t++;
      if (Input.pressed('back') || Input.pressed('run')) { go(() => ExtrasScene('BOSS REMATCH')); return; }
      if (Input.pressed('special')) { REMATCH_COOP = !REMATCH_COOP; Audio8.sfx('select'); return; }
      if (Input.pressed('down')) { sel = (sel + 1) % REMATCH.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + REMATCH.length - 1) % REMATCH.length; Audio8.sfx('select'); }
      if (Input.confirm()) {
        const li = REMATCH[sel], keep = sel; if (!rematchOpen(li)) { msg = 'BEAT THIS BOSS FIRST!'; Audio8.sfx('bump'); return; }
        Audio8.sfx('confirm'); game = challengeGame(); if (li === 50) game.hero = 'doug';
        if (REMATCH_COOP) { game.coop = true; game.other = { hero: game.hero === 'wally' ? 'goth' : 'wally', costume: 'classic', lives: 99, out: false }; }
        go(() => { const s = new Play(li, false); s.mode = { kind: 'rematch', sel: keep }; return s; });
      }
    },
    draw() {
      drawParallax('castle', t * 0.4); drawWindow(16, 8, 224, 208);
      txt('BOSS REMATCH', 128, 14, '#ff8080', { align: 'center', scale: 2 });
      const top = clamp(sel - 6, 0, Math.max(0, REMATCH.length - SHOW));
      for (let i = 0; i < SHOW; i++) {
        const k = top + i, li = REMATCH[k]; if (li === undefined) break;
        const y = 36 + i * 12, on = k === sel, open = rematchOpen(li);
        txt(open ? nameOf(li) : '???', 36, y, on ? '#ffe040' : open ? '#fff' : '#7880b0'); if (best[li]) txt(fmtTime(best[li]), 228, y, '#5ff0ff', { align: 'right' }); if (on) txt('>', 26 + ((t >> 3) & 1), y, '#ffe040');
      }
      if (top > 0) txt('^', 228, 30, '#a8b0d8'); if (top + SHOW < REMATCH.length) txt('V', 228, 176, '#a8b0d8');
      txt('S: CO-OP ' + (REMATCH_COOP ? 'ON - 2 PLAYERS!' : 'OFF'), 128, 186, REMATCH_COOP ? '#5ae060' : '#a8b0d8', { align: 'center' });
      txt(msg || 'A: FIGHT   B: BACK', 128, 200, msg ? '#ff8080' : '#a8b0d8', { align: 'center' });
    },
  };
}
{
  const _upd = Play.prototype.update;
  Play.prototype.update = function () {
    const team = this.mode && this.mode.kind === 'rematch' && game && game.coop;
    if (!team || !this.p2) return _upd.call(this);
    const p = this.p, q = this.p2; q.hearts = p.hearts + 5; const qh = q.hearts;
    _upd.call(this);
    if (this.p2 !== q) return;
    if (q.hearts < qh && this.state === 'play') { const pi = p.inv; p.inv = 0; this.hurt(); if (p.inv === 0) p.inv = pi; q.inv = 90; } // a hit on either hero costs a team heart
    q.hearts = p.hearts;
    if (this.paused || this.state !== 'play') return;
    // TEAM BLAST: both press Special at nearly the same time, standing close together
    if (Input.pressed('special')) this.t1 = this.hF; if (Input2.pressed('special')) this.t2 = this.hF;
    if (this.teamCool > 0) this.teamCool--;
    if (!this.teamCool && this.t1 && this.t2 && Math.abs(this.t1 - this.t2) < 20 && Math.max(this.t1, this.t2) === this.hF && Math.abs(p.x - q.x) < 64) {
      this.teamCool = 480; this.t1 = this.t2 = 0; this.shake = 20; Audio8.sfx('shock'); buzz([150, 50, 150]); rumble(1, 300);
      this.parts.push({ k: 'text', s: 'TEAM BLAST!', x: (p.x + q.x) / 2 - 30, y: Math.min(p.y, q.y) - 24, vy: -0.4, life: 80 });
      for (let i = 0; i < 16; i++) { const an = (i / 16) * Math.PI * 2; this.parts.push({ k: 'spark', x: (p.x + q.x) / 2 + 5, y: (p.y + q.y) / 2 + 10, vx: Math.cos(an) * 3, vy: Math.sin(an) * 3, life: 24 }); }
      for (const e of this.ents) if (e.boss && e.alive && !e.dying && e.hp > 0) { e.inv = 0; this.damageBoss(e); Ach.unlock('teamwork'); }
    }
  };
  const _hud = Play.prototype.drawHUD;
  Play.prototype.drawHUD = function () {
    _hud.call(this);
    if (!(this.mode && this.mode.kind === 'rematch' && game && game.coop && this.p2)) return;
    hR(64, 200, 128, 20, 'rgba(16,24,72,0.75)'); txt('TEAM HEARTS: ' + this.p.hearts, 128, 202, '#ff8080', { align: 'center' });
    txt(this.teamCool ? 'TEAM BLAST CHARGING...' : 'BOTH PRESS S: TEAM BLAST!', 128, 211, this.teamCool ? '#a8b0d8' : '#5ff0ff', { align: 'center' });
  };
}
