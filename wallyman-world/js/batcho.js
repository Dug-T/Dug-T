'use strict';
// =====================================================================
// Update 1.4: Count Dracula haunts the middle of Wally's Backyard. He
// bites, and he closes his cape, turns into a bat and flies over you.
// When he appears night falls for the rest of the level: his castle
// rises on a new background layer under a full moon, clouds drift past,
// and a thunderstorm comes and goes with clear moonlit spells between.
// =====================================================================
ACH_LIST.push(['dracula', 'DAWN BREAKER', "DEFEAT DRACULA IN WALLY'S BACKYARD"]);
BEASTS.push(['dracula', 'COUNT DRACULA', 'e']);
Object.assign(BEAST_INFO, { dracula: 'BITES WHEN YOU GET CLOSE. WHEN HE WRAPS HIS CAPE AROUND HIMSELF, HE IS ABOUT TO TURN INTO A BAT. STOMP HIM 3 TIMES.' });
const DRAC_LI = 0, DRAC_X = 100;

// ---------------- art ----------------
function drawDracula(x, y, e, t) {
  const st = e ? e.state : 'walk', face = e ? e.face || -1 : -1;
  if (e && e.inv > 0 && (frame >> 2) & 1) return;
  if (st === 'bat') { drawDracBat(x, y + 6, t, face); return; }
  const close = st === 'cloak' ? Math.min(1, 1 - e.act / 40) : st === 'reform' ? Math.max(0, e.act / 30) : 0, fangs = st === 'fangs' || st === 'bite';
  ctx.save(); ctx.translate(x + 8, 0); ctx.scale(face, 1); ctx.translate(-x - 8, 0);
  // cape: wide open with a red lining, closing around him before he turns into a bat
  const spread = Math.round(9 * (1 - close)), sway = st === 'walk' ? Math.sin(t * 0.2) : 0;
  hR(x - spread - 1, y + 6, 18 + spread * 2, 23, '#1a1020');
  if (spread > 1) { hR(x - spread, y + 8, spread + 2, 20 + sway, '#a01020'); hR(x + 14, y + 8, spread + 2, 20 - sway, '#a01020'); }
  hR(x + 1, y + 8, 14, 20, '#20182a'); hR(x + 2, y + 8, 12, 1, '#3a2a4a');
  if (close < 0.85) { hR(x + 5, y + 9, 6, 10, '#f0f0f8'); hR(x + 7, y + 10, 2, 7, '#a01020'); hR(x + 6, y + 19, 4, 2, '#d0a040'); }
  hR(x + 4, y + 28 - (st === 'rise' ? 0 : 0), 3, 1, '#1a1020'); hR(x + 9, y + 28, 3, 1, '#1a1020');
  // high collar, pale face, slicked hair with a widow's peak, red eyes
  hR(x + 1, y + 2, 3, 8, '#a01020'); hR(x + 12, y + 2, 3, 8, '#a01020');
  hR(x + 3, y - 1, 10, 10, '#1a1020'); hR(x + 4, y, 8, 8, '#e8e4f0'); hR(x + 4, y, 8, 2, '#1a1020'); hR(x + 7, y + 2, 2, 1, '#1a1020');
  hR(x + 5, y + 3, 2, 2, '#ff2030'); hR(x + 9, y + 3, 2, 2, '#ff2030'); hR(x + 5, y + 2, 2, 1, '#1a1020'); hR(x + 9, y + 2, 2, 1, '#1a1020');
  if (fangs) { hR(x + 5, y + 6, 6, 2, '#5a0a10'); hR(x + 5, y + 6, 1, 2, '#ffffff'); hR(x + 10, y + 6, 1, 2, '#ffffff'); } else hR(x + 6, y + 6, 4, 1, '#8a2030');
  ctx.restore();
  if (st === 'rest' && (t >> 4) & 1) txt('HUFF', x - 4, y - 14, '#c0c8e0', { outline: '#1a1020' });
}
function drawDracBat(x, y, t, face) {
  const f = (t >> 2) & 1;
  hR(x + 4, y + 2, 8, 7, '#1a1020'); hR(x + 5, y + 3, 6, 5, '#3a2050'); hR(x + 6, y + 4, 1, 1, '#ff2030'); hR(x + 9, y + 4, 1, 1, '#ff2030'); hR(x + 5, y, 2, 3, '#1a1020'); hR(x + 9, y, 2, 3, '#1a1020');
  const wy = f ? -4 : 2;
  for (const d of [-1, 1]) { const bx = d < 0 ? x - 6 : x + 12; hR(bx, y + 3 + wy / 2, 10, 3, '#1a1020'); hR(bx + (d < 0 ? 0 : 6), y + 2 + wy, 4, 3, '#1a1020'); hR(bx + 1, y + 4 + wy / 2, 8, 1, '#5a3a7a'); }
}
function drawCastleLayer(cx, k, t) { // Dracula's castle on its own background layer (it scrolls slowly)
  const X = Math.round(430 - cx * 0.15), Y = 52; if (X < -200 || X > VW + 40) return;
  ctx.save(); ctx.globalAlpha = k;
  ctx.fillStyle = '#120a24'; ctx.beginPath(); ctx.moveTo(X - 70, 200); ctx.quadraticCurveTo(X + 60, 70 + Y, X + 200, 200); ctx.fill();
  const tower = (tx, ty, w, h) => { hR(X + tx, Y + ty, w, h, '#1c1232'); ctx.fillStyle = '#1c1232'; ctx.beginPath(); ctx.moveTo(X + tx - 3, Y + ty); ctx.lineTo(X + tx + w / 2, Y + ty - w * 1.4); ctx.lineTo(X + tx + w + 3, Y + ty); ctx.fill(); };
  hR(X + 20, Y + 50, 90, 80, '#1c1232'); for (let k2 = 0; k2 < 9; k2++) hR(X + 20 + k2 * 10, Y + 44, 6, 6, '#1c1232');
  tower(4, 30, 18, 100); tower(108, 26, 18, 104); tower(52, 10, 26, 120); tower(34, 40, 12, 90); tower(86, 36, 12, 94);
  for (const [wx, wy] of [[60, 30], [70, 30], [10, 55], [114, 50], [40, 70], [90, 66], [62, 60], [30, 100], [96, 98]]) { const lit = ((t >> 5) + wx) % 7 !== 0; hR(X + wx, Y + wy, 4, 6, lit ? '#ffd860' : '#3a2a40'); }
  for (let b = 0; b < 4; b++) { const a = t * 0.04 + b * 1.6, bx = X + 64 + Math.cos(a) * (40 + b * 6), by = Y + 4 + Math.sin(a * 1.7) * 10; const w = (t >> 2) & 1; hR(bx - 3, by - (w ? 1 : 0), 3, 1, '#0a0614'); hR(bx, by, 2, 2, '#0a0614'); hR(bx + 2, by - (w ? 1 : 0), 3, 1, '#0a0614'); }
  ctx.restore();
}
{
  const _sa = stickerArt;
  stickerArt = function (id, x, y, t) { if (id === 'dracula') { drawDracula(x - 8, y - 12, null, t); return; } return _sa(id, x, y, t); }; // eslint-disable-line no-func-assign
}

// ---------------- Dracula in Wally's Backyard ----------------
{
  const _upd = Play.prototype.update;
  Play.prototype.update = function () {
    if (!this._initDrac) {
      this._initDrac = true;
      if (this.li === DRAC_LI && !(this.mode && ['replay', 'tutorial'].includes(this.mode.kind))) {
        const gy = groundRow(this, DRAC_X); if (gy > 0) this.ents.push({ type: 'dracula', enemy: true, alive: true, t: 0, x: DRAC_X * TS, y: gy * TS - 28, gy: gy * TS - 28, w: 16, h: 28, hp: 3, inv: 0, state: 'hidden', act: 0, face: -1, vx: 0 });
      }
    }
    _upd.call(this);
    if (!this.dracNight || this.paused || this.talk || this.photo) return;
    this.dracNight++;
    // the storm comes and goes, with clear moonlit spells in between
    const w = this.wx;
    if (!w || !w.drac) { this.wx = { cur: 'rain', amt: 0, want: null, timer: 1e9, flash: 0, baseIce: !!this.def.ice, drac: true, phase: 900, lt: 60 }; return; }
    if (this.state !== 'play') return;
    if (--w.phase <= 0 && !w.want) { if (w.cur === 'rain') { w.want = 'clear'; w.phase = 420; } else { w.want = 'rain'; w.phase = 900; } }
    if (w.cur === 'rain' && w.amt > 0.6 && !w.want && --w.lt <= 0) { w.lt = 150 + Math.floor(Math.random() * 220); w.flash = 12; this.lightning(); }
  };
  Play.prototype.dracDawn = function (e) { // night falls when Dracula appears
    this.dracNight = 1; e.state = 'rise'; e.act = 50;
    if (this.wx) this.wx.flash = 16; Audio8.thunder(0.05); Audio8.sfx('roar'); this.shake = 10; rumble(0.6, 250);
    this.parts.push({ k: 'text', s: 'COUNT DRACULA!', x: e.x - 30, y: e.y - 30, vy: -0.25, life: 120 });
  };
  const _mr = Play.prototype.makeRainbow;
  Play.prototype.makeRainbow = function () { if (this.dracNight) return; return _mr.call(this); }; // no rainbows at midnight
  const _ue = Play.prototype.updateEnt;
  Play.prototype.updateEnt = function (e) {
    if (e.type !== 'dracula') return _ue.call(this, e);
    const p = this.p, danger = !['hidden', 'rise', 'rest'].includes(e.state) && !e.dying;
    if (this._p2ctx) { if (this.state === 'play' && danger && overlap(p, e) && !(e.inv > 0)) this.hurt(); return; }
    e.t++; if (e.inv > 0) e.inv--;
    if (e.dying) { e.dt++; if (e.dt > 40) e.alive = false; return; }
    if (e.state === 'hidden') { if (p.x > e.x - 13 * TS && this.state === 'play') this.dracDawn(e); return; }
    if (this.freezeT > 0 && e.state !== 'bat') { this.dracStomp(e); return; }
    const dx = p.x + p.w / 2 - (e.x + 8), dy = p.y + p.h / 2 - (e.y + 14);
    const ground = () => { const gy = groundRow(this, Math.floor((e.x + 8) / TS)); if (gy > 0) e.y = gy * TS - 28; };
    e.act--;
    switch (e.state) {
      case 'rise': if (e.act <= 0) { e.state = 'walk'; e.act = 150; } break;
      case 'walk':
        e.face = dx < 0 ? -1 : 1; e.x += e.face * 0.7; ground();
        if (Math.abs(dx) < 30 && Math.abs(dy) < 30) { e.state = 'fangs'; e.act = 22; Audio8.sfx('chomp'); }
        else if (e.act <= 0 || Math.abs(dx) > 220) { e.state = 'cloak'; e.act = 40; Audio8.sfx('swoop'); }
        break;
      case 'fangs': if (e.act <= 0) { e.state = 'bite'; e.act = 14; Audio8.sfx('chomp'); } break;
      case 'bite': e.x += e.face * 3.2; ground(); if (e.act <= 0) { e.state = 'rest'; e.act = 45; } break;
      case 'rest': if (e.act <= 0) { e.state = 'walk'; e.act = 120; } break;
      case 'cloak': // he wraps his cape around himself... then turns into a bat
        if (e.act <= 0) { e.state = 'bat'; e.x0 = e.x; e.tx = clamp(p.x + p.w / 2 - 8 + (dx < 0 ? -1 : 1) * 90, this.cam.x + 8, this.cam.x + VW - 24); e.fly = 0; e.face = dx < 0 ? -1 : 1; Audio8.sfx('bats'); for (let k = 0; k < 10; k++) this.parts.push({ k: 'dust', x: e.x + 8, y: e.y + 14, vx: (k - 5) * 0.4, vy: -0.5 - (k % 3) * 0.3, life: 24 }); }
        break;
      case 'bat': { // flies up and over you to land on your other side
        e.fly++; const f = Math.min(1, e.fly / 90); e.x = e.x0 + (e.tx - e.x0) * f; e.y = e.gy - Math.sin(Math.PI * f) * 80 + Math.sin(e.fly * 0.3) * 3; e.face = e.tx < e.x0 ? -1 : 1;
        if (e.fly % 12 === 0) Audio8.sfx('flap');
        if (f >= 1) { ground(); e.gy = e.y; e.state = 'reform'; e.act = 30; Audio8.sfx('swoop'); for (let k = 0; k < 8; k++) this.parts.push({ k: 'dust', x: e.x + 8, y: e.y + 14, vx: (k - 4) * 0.4, vy: -0.6, life: 20 }); }
        break;
      }
      case 'reform': if (e.act <= 0) { e.state = 'walk'; e.act = 140 + Math.floor(Math.random() * 60); } break;
      default: break;
    }
    if (e.state !== 'bat') e.gy = e.y;
    this.dracStomp(e);
  };
  Play.prototype.dracStomp = function (e) {
    const p = this.p; if (this.state !== 'play' || !overlap(p, e) || e.state === 'hidden' || e.state === 'rise') return;
    if (e.state !== 'bat' && p.vy > 0 && p.y + p.h - e.y < 12 && !(e.inv > 0)) {
      p.vy = -6; e.hp--; e.inv = 50; Audio8.sfx('stomp'); this.shake = 6;
      if (e.hp <= 0) { e.dying = true; e.dt = 0; this.addScore(2000, e.x, e.y - 10); Ach.unlock('dracula'); Bestiary.add('dracula'); this.countKill && this.countKill(e); Audio8.sfx('secret'); this.parts.push({ k: 'text', s: 'DRACULA VANISHES INTO THE NIGHT!', x: e.x - 70, y: e.y - 20, vy: -0.3, life: 120 }); }
      else { this.parts.push({ k: 'text', s: e.hp === 1 ? 'BLAH! ONE MORE!' : 'BLEH!', x: e.x - 10, y: e.y - 16, vy: -0.4, life: 50 }); e.state = 'cloak'; e.act = 24; }
      return;
    }
    if (!(e.inv > 0) && !(this.freezeT > 0) && e.state !== 'rest') this.hurt();
  };
  const _de = Play.prototype.drawEnt;
  Play.prototype.drawEnt = function (e, cx) {
    if (e.type !== 'dracula') return _de.call(this, e, cx);
    if (e.state === 'hidden') return;
    const x = Math.round(e.x - cx), y = Math.round(e.y);
    if (e.dying) { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - e.dt / 40); drawDracula(x, y - e.dt * 0.5, e, frame); ctx.restore(); for (let k = 0; k < 5; k++) drawDracBat(x + Math.cos(k * 1.3) * e.dt * 2, y - e.dt * (1 + k * 0.3), frame + k * 3, 1); return; }
    if (e.state === 'rise') { ctx.save(); ctx.beginPath(); ctx.rect(x - 20, y - 40, 60, 40 + 28 * (1 - e.act / 50)); ctx.clip(); drawDracula(x, y + Math.round(28 * e.act / 50), e, frame); ctx.restore(); return; }
    drawDracula(x, y, e, frame);
  };
  const _dt = Play.prototype.drawTiles;
  Play.prototype.drawTiles = function (cx) {
    if (this.dracNight) { // night falls: a dark sky, a full moon with clouds drifting past, and the castle
      const k = Math.min(1, this.dracNight / 120);
      ctx.fillStyle = `rgba(12,8,40,${0.72 * k})`; ctx.fillRect(0, 0, VW, VH);
      const mx = 196 - cx * 0.01, my = 46;
      ctx.save(); ctx.globalAlpha = k;
      ctx.fillStyle = 'rgba(255,250,220,0.12)'; ctx.beginPath(); ctx.arc(mx, my, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff8dc'; ctx.beginPath(); ctx.arc(mx, my, 20, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8dcb0'; for (const [ox, oy, r] of [[-6, -5, 4], [5, 3, 5], [-2, 8, 3], [8, -8, 2]]) { ctx.beginPath(); ctx.arc(mx + ox, my + oy, r, 0, Math.PI * 2); ctx.fill(); }
      for (let c = 0; c < 3; c++) { const x = ((frame * (0.15 + c * 0.05) + c * 120 - cx * 0.05) % 360 + 360) % 360 - 60; ctx.fillStyle = `rgba(40,36,70,${0.8 - c * 0.15})`; ctx.beginPath(); ctx.ellipse(x, 40 + c * 14, 34, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + 18, 36 + c * 14, 18, 6, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      drawCastleLayer(cx, k, frame);
    }
    _dt.call(this, cx);
  };
}

// ---------------- What's New and the Help Book ----------------
UPDATES.unshift(['1.4', ["DRACULA HAUNTS WALLY'S BACKYARD", 'HE BITES WHEN YOU GET CLOSE', 'HE TURNS INTO A BAT AND FLIES', 'OVER YOU (WATCH FOR HIS CAPE!)', "NIGHT FALLS: DRACULA'S CASTLE", 'A FULL MOON WITH PASSING CLOUDS', 'A STORM THAT COMES AND GOES']]);
UPDATES.unshift(['1.5', ['THE TITLE SCREEN, CREDITS AND', 'ENDING NOW SAY DOUGLAS THOMSON']]);
HELP_CH.push(['UPDATE 1.4', [
  [['DRACULA WAITS IN THE MIDDLE', "OF WALLY'S BACKYARD. STOMP", 'HIM 3 TIMES. KEEP AWAY WHEN', 'HE SHOWS HIS FANGS!'], 'jump'],
  [['WHEN HE WRAPS HIS CAPE', 'AROUND HIMSELF HE TURNS', 'INTO A BAT AND FLIES OVER', 'YOU - GET OUT OF THE WAY!'], 'run'],
]]);
if (typeof scene !== 'undefined' && scene && scene.isTitle) { scene = TitleScene(); if (scene.enter) scene.enter(); }
