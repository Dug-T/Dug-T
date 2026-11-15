'use strict';
// =====================================================================
// Update 2.8: DINO as a playable hero (tail spin, ground-stomp
// shockwave), GRIP GLOVES (hang from ceilings, wall-jump with any
// hero), GIFT CODES, the FARM in Wally Town (hens and a cow, new crops),
// COOKING with a timing mini-game and new recipes, the WEEKEND FESTIVAL,
// and MINI-GAME RECORDS. (4-player online co-op and shared boss health
// live in batchy2.js.)
// =====================================================================
const U28 = (() => {
  const PP = Play.prototype;

  // ---------------- Dino, the hero ----------------
  HEROES.dino = { name: 'DINO', alt: 'DINO', short: 'DINO', color: '#2ec4b6', secret: true, hint: ['BEAT THE FIRST', 'CASTLE'], ok: () => !!(game && (game.cleared[7] || game.dinoHero)), lines: ['HEAVY BUT MIGHTY! S: TAIL SPIN', '(NO LIMIT). DOWN IN THE AIR:', 'A STOMP THAT SHAKES THE GROUND'] };
  if (!HERO_IDS.includes('dino')) HERO_IDS.push('dino');
  const dinoFrames = new Map();
  function dinoFrame(pose, face, mode) {
    const k = /^walk/.test(pose) ? (parseInt(pose.slice(4), 10) >> 1) & 1 : pose === 'jump' || pose === 'fall' ? 1 : 0, key = `${k}|${face < 0 ? 'l' : 'r'}|${mode}`;
    if (dinoFrames.has(key)) return dinoFrames.get(key);
    const im = (face < 0 ? Sprites.dino.l : Sprites.dino.r)[k], c = document.createElement('canvas'); c.width = Wally.W; c.height = Wally.H; const x = c.getContext('2d');
    x.drawImage(im, Math.round((c.width - im.width) / 2), c.height - im.height);
    if (mode === 'k' || mode === 'w') { x.globalCompositeOperation = 'source-in'; x.fillStyle = mode === 'k' ? '#000000' : '#ffffff'; x.fillRect(0, 0, c.width, c.height); }
    if (mode === 'g') { x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(160,200,255,0.5)'; x.fillRect(0, 0, c.width, c.height); }
    dinoFrames.set(key, c); return c;
  }
  { const _fr = Wally.frame; Wally.frame = function (pose, capeF, signal, face, mode, costume, hero) { if ((hero || Wally.hero) === 'dino') return dinoFrame(String(pose || 'idle0'), face, mode); return _fr.apply(this, arguments); }; }
  { const _dr = Wally.draw;
    Wally.draw = function (c, cx, feetY, pose, face, o = {}) {
      if ((o.hero || Wally.hero) !== 'dino') return _dr.apply(this, arguments);
      const sx = o.sx || 1, sy = o.sy || 1, img = dinoFrame(String(pose || 'idle0'), face, o.white ? 'w' : o.ghost ? 'g' : o.black ? 'k' : 'n'), w = Math.round(Wally.W * sx), h = Math.round(Wally.H * sy);
      const hop = /^win/.test(pose) ? -Math.abs(Math.sin((o.t || 0) * 0.15)) * 3 : 0;
      c.drawImage(img, Math.round(cx - w / 2), Math.round(feetY - h + hop), w, h);
    };
  }
  const isDino = (pl) => !pl._p2ctx ? heroOf() === 'dino' : (game.other && game.other.hero) === 'dino';
  { const _up = PP.updatePlayer;
    PP.updatePlayer = function () {
      const p = this.p, dino = isDino(this) && this.state === 'play', wasPound = p.pound === -1, wasGround = p.onGround;
      // grip gloves let any hero wall-jump (the Upgrade Tree's wall jump, for this level)
      const U = game.upgrades = game.upgrades || {}, hadWall = U.wall; if (p.grip) U.wall = true;
      const pr = Input.pressed; if (dino) Input.pressed = (k) => (k === 'special' ? false : pr(k));
      let r; try { r = _up.apply(this, arguments); } finally { Input.pressed = pr; if (p.grip) U.wall = hadWall; }
      if (dino) {
        if (p.tailCool > 0) p.tailCool--; if (p.tailT > 0) p.tailT--;
        if (pr('special') && !(p.tailCool > 0)) { p.tailT = 20; p.tailCool = 40; Audio8.sfx('swoop'); }
        if (p.tailT > 0) for (const e of this.ents) if (e.enemy && e.alive && !e.dying && !e.boss && Math.abs(e.x + e.w / 2 - (p.x + p.w / 2)) < 28 && Math.abs(e.y + e.h / 2 - (p.y + p.h / 2)) < 22) { this.flipKill(e); this.addScore(100, e.x, e.y); }
        if (wasPound && p.pound === 0 && p.onGround) { // the stomp: a shockwave along the ground
          this.shake = 14; Audio8.sfx('boom'); for (let k = 0; k < 10; k++) this.parts.push({ k: 'dust', x: p.x + p.w / 2 + (k - 5) * 7, y: p.y + p.h, vx: (k - 5) * 0.4, vy: -0.6, life: 20 });
          for (const e of this.ents) if (e.enemy && e.alive && !e.dying && !e.boss && Math.abs(e.x + e.w / 2 - (p.x + p.w / 2)) < 64 && Math.abs(e.y + e.h - (p.y + p.h)) < 20) { this.flipKill(e); this.addScore(200, e.x, e.y); }
        }
        if (wasGround && !p.onGround && p.vy < -4) p.vy *= 0.92; // heavy: a slightly lower jump
      }
      // grip gloves: hold UP under a ceiling to hang and swing along it
      if (p.grip && this.state === 'play' && !p.onGround && Input.down('up')) {
        const ty = Math.floor((p.y - 3) / TS), cell = (tx) => SOLID.has(this.tile(tx, ty));
        if (cell(Math.floor((p.x + 1) / TS)) || cell(Math.floor((p.x + p.w - 1) / TS))) { if (!p.hang) Audio8.sfx('bump'); p.hang = true; p.y = (ty + 1) * TS; p.vy = 0; p.vx = clamp(p.vx, -1.3, 1.3); } else p.hang = false;
      } else p.hang = false;
      return r;
    };
  }
  { const _dp = PP.drawPlayer;
    PP.drawPlayer = function (cx) {
      const p = this.p;
      if (p.tailT > 0 && isDino(this)) { const x = Math.round(p.x + p.w / 2 - cx), y = Math.round(p.y + p.h / 2); ctx.save(); ctx.translate(x, y); ctx.rotate((20 - p.tailT) * 0.63 * (p.face || 1)); ctx.translate(-x, -y); try { _dp.call(this, cx); } finally { ctx.restore(); } ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1; return; }
      const r = _dp.call(this, cx);
      if (p.hang) { const x = Math.round(p.x + p.w / 2 - cx), y = Math.round(p.y); ctx.fillStyle = '#ff9a3a'; ctx.fillRect(x - 5, y - 3, 3, 4); ctx.fillRect(x + 2, y - 3, 3, 4); }
      if (p.grip && this.state === 'play') txt('GRIP', 6, 44, '#ff9a3a', { outline: '#101848' });
      return r;
    };
  }
  // Grip Gloves are found in one level in nine, near the start
  const gripLevel = (pl) => { const d = pl.def; return d === LEVELS[pl.li] && pl.li % 9 === 4 && !d.boss && !d.board && !d.sub && !d.shmup && !d.water && !d.reserved && !pl.rush; };
  { const _en = PP.enter;
    PP.enter = function () {
      const r = _en.apply(this, arguments);
      if (!this._grip && gripLevel(this)) { this._grip = true; for (let x = 10; x < 40; x++) { let y = -1; for (let yy = 4; yy < 13; yy++) if (SOLID.has(this.tile(x, yy)) && this.tile(x, yy - 1) === '.' && this.tile(x, yy - 2) === '.') { y = yy; break; } if (y > 0) { this.ents.push({ type: 'gripitem', item: true, alive: true, t: 0, x: x * TS + 2, y: (y - 2) * TS, w: 12, h: 12, vx: 0, vy: 0, rise: 0 }); break; } } }
      return r;
    };
  }
  { const _ue = PP.updateEnt;
    PP.updateEnt = function (e) {
      if (e.type === 'gripitem') { e.t++; if (this.state === 'play' && overlap(this.p, e)) { e.alive = false; this.p.grip = true; Audio8.sfx('power'); this.parts.push({ k: 'text', s: 'GRIP GLOVES! HOLD UP UNDER A CEILING', x: e.x - 70, y: e.y - 10, vy: -0.4, life: 120 }); try { Ach.unlock('grip'); } catch (er) { /* ignore */ } } return; }
      return _ue.call(this, e);
    };
  }
  { const _de = PP.drawEnt;
    PP.drawEnt = function (e, cx) {
      if (e.type !== 'gripitem') return _de.call(this, e, cx);
      const x = Math.round(e.x - cx), y = Math.round(e.y + Math.sin(e.t * 0.08) * 2); const g = ctx.createRadialGradient(x + 6, y + 6, 1, x + 6, y + 6, 12); g.addColorStop(0, 'rgba(255,200,120,0.5)'); g.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = g; ctx.fillRect(x - 6, y - 6, 24, 24);
      ctx.fillStyle = '#1a1020'; ctx.fillRect(x, y + 2, 12, 10); ctx.fillStyle = '#ff9a3a'; ctx.fillRect(x + 1, y + 3, 10, 8); for (let k = 0; k < 4; k++) ctx.fillRect(x + 1 + k * 3, y - 1, 2, 4); ctx.fillStyle = '#c05a10'; ctx.fillRect(x + 1, y + 9, 10, 2);
    };
  }

  // ---------------- gift codes ----------------
  const GIFTS = [['10 COINS', 'c', 10], ['25 COINS', 'c', 25], ['A 1-UP', 'l', 1], ['2 EGGS', 'egg', 2], ['2 CARROTS', 'carrot', 2]];
  const sum = (s) => { let h = 7; for (const ch of s + 'wally-gift') h = (h * 31 + ch.charCodeAt(0)) % 1000003; return h; };
  const giftCode = (k, n, id) => 'WMG1-' + btoa(JSON.stringify([k, n, id, sum(`${k}|${n}|${id}`)])).replace(/=+$/, '');
  function giftOpen(code) {
    try { const m = String(code || '').replace(/\s+/g, '').match(/^WMG1-([A-Za-z0-9+/]+)=*$/); if (!m) return null; const a = JSON.parse(atob(m[1] + '==='.slice((m[1].length + 3) % 4))); if (!Array.isArray(a) || a.length !== 4) return null; const [k, n, id, h] = a; if (h !== sum(`${k}|${n}|${id}`) || !GIFTS.some((g) => g[1] === k && g[2] === n)) return null; return { k, n, id: String(id) }; } catch (e) { return null; }
  }
  function giftGive(g) { game.pantry = game.pantry || {}; if (g.k === 'c') game.coins += g.n; else if (g.k === 'l') game.lives += g.n; else game.pantry[g.k] = (game.pantry[g.k] | 0) + g.n; while (game.coins >= 100) { game.coins -= 100; game.lives++; } }
  function GiftScene() {
    let sel = 0, t = 0, dom = false, msg = '';
    const rows = () => GIFTS.map((g) => 'SEND ' + g[0]).concat(['OPEN A GIFT CODE', 'BACK']);
    const canPay = (g) => (g[1] === 'c' ? game.coins >= g[2] : g[1] === 'l' ? game.lives > 1 : ((game.pantry || {})[g[1]] | 0) >= g[2]);
    return {
      _s: () => ({ sel, msg }),
      enter() { Audio8.play('menu'); },
      update() {
        t++; if (dom) return; const R = rows();
        if (Input.pressed('down')) { sel = (sel + 1) % R.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + R.length - 1) % R.length; Audio8.sfx('select'); }
        if (Input.pressed('back') || (Input.confirm() && R[sel] === 'BACK')) { go(() => HouseScene(20)); return; }
        if (!Input.confirm()) return;
        if (R[sel] === 'OPEN A GIFT CODE') { dom = true; codeBox('PASTE A GIFT CODE (WMG1-...)', '', (c) => { const g = giftOpen(c); if (!g) return false; game.giftsOpened = game.giftsOpened || []; game.giftsSent = game.giftsSent || []; if (game.giftsOpened.includes(g.id)) { msg = 'YOU ALREADY OPENED THAT GIFT'; return true; } if (game.giftsSent.includes(g.id)) { msg = 'THAT IS YOUR OWN GIFT - SEND IT TO A FRIEND!'; return true; } game.giftsOpened.push(g.id); giftGive(g); Save.persist(); msg = 'A GIFT! YOU GOT ' + (GIFTS.find((x) => x[1] === g.k && x[2] === g.n) || ['SOMETHING'])[0]; Audio8.sfx('oneup'); try { Ach.unlock('gift'); } catch (e) { /* ignore */ } return true; }, () => { dom = false; }); return; }
        const g = GIFTS[sel]; if (!canPay(g)) { msg = 'YOU NEED ' + g[0] + ' TO SEND THAT'; Audio8.sfx('bump'); return; }
        if (g[1] === 'c') game.coins -= g[2]; else if (g[1] === 'l') game.lives -= g[2]; else game.pantry[g[1]] -= g[2];
        const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', id = Array.from(crypto.getRandomValues(new Uint32Array(8)), (n) => A[n % A.length]).join('');
        game.giftsSent = game.giftsSent || []; game.giftsSent.push(id); Save.persist(); msg = 'GIFT WRAPPED! SEND THE CODE TO A FRIEND'; Audio8.sfx('coin');
        dom = true; codeBox(`A GIFT OF ${g[0]} - SEND THIS CODE`, giftCode(g[1], g[2], id), null, () => { dom = false; });
      },
      draw() {
        drawParallax('candy', t * 0.3); drawWindow(16, 12, 224, 200); txt('GIFT CODES', 128, 20, '#ffe040', { align: 'center', scale: 2 });
        rows().forEach((r, i) => { const y = 50 + i * 14, on = i === sel; txt(r, 50, y, on ? '#ffe040' : '#fff'); if (on) txt('>', 38 + ((t >> 3) & 1), y, '#ffe040'); });
        // a little wrapped present
        const bx = 190, by = 60 + Math.sin(t * 0.08) * 2; ctx.fillStyle = '#e83850'; ctx.fillRect(bx, by, 26, 22); ctx.fillStyle = '#ffd040'; ctx.fillRect(bx + 11, by, 4, 22); ctx.fillRect(bx, by + 8, 26, 4); ctx.beginPath(); ctx.ellipse(bx + 8, by - 3, 6, 3, -0.4, 0, Math.PI * 2); ctx.ellipse(bx + 18, by - 3, 6, 3, 0.4, 0, Math.PI * 2); ctx.fill();
        ['SENDING TAKES IT FROM YOUR FILE', 'AND GIVES YOU A CODE (AND QR).', 'EACH GIFT OPENS ONCE PER FILE.'].forEach((l, i) => txt(l, 128, 152 + i * 10, '#a8b0d8', { align: 'center' }));
        ctx.drawImage(Sprites.coinIcon, 30, 196); txt('*' + pad(game.coins, 2), 37, 196, '#fff'); ctx.drawImage(Sprites.heart, 70, 196); txt('*' + pad(game.lives, 2), 79, 196, '#fff');
        if (msg) txt(msg, 128, 184, '#40e090', { align: 'center' });
      },
    };
  }

  // ---------------- the farm ----------------
  Object.assign(SEEDS, { strawberry: { name: 'STRAWBERRY', price: 4, hours: 3, col: '#ff3050', veg: true }, corn: { name: 'CORN', price: 5, hours: 5, col: '#ffd040', veg: true }, egg: { name: 'EGG', price: 0, hours: 0, col: '#fff8e0', veg: true }, milk: { name: 'MILK', price: 0, hours: 0, col: '#e8f0ff', veg: true } });
  for (const k of ['strawberry', 'corn']) if (!SEED_IDS.includes(k)) SEED_IDS.push(k);
  const today = () => new Date(Date.now() + (window.GARDEN_SKIP || 0)).toDateString();
  function FarmScene() {
    let sel = 0, t = 0, msg = '', msgT = 0; game.farm = game.farm || {}; game.pantry = game.pantry || {};
    const ROWS = ['FEED THE HENS (2 COINS)', 'MILK DAISY THE COW (3 COINS)', 'BACK'];
    const say = (m) => { msg = m; msgT = 150; };
    return {
      _s: () => ({ sel, msg, farm: game.farm }),
      enter() { Audio8.play('grass'); },
      update() {
        t++; if (msgT) msgT--;
        if (Input.pressed('down')) { sel = (sel + 1) % ROWS.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + ROWS.length - 1) % ROWS.length; Audio8.sfx('select'); }
        if (Input.pressed('back') || Input.pressed('run') || (Input.confirm() && sel === 2)) { Save.persist(); go(() => TownScene()); return; }
        if (!Input.confirm()) return;
        const k = sel === 0 ? 'hens' : 'cow', price = sel === 0 ? 2 : 3;
        if (game.farm[k] === today()) { say(sel === 0 ? 'THE HENS ARE FULL. BACK TOMORROW!' : 'DAISY IS RESTING. BACK TOMORROW!'); Audio8.sfx('bump'); return; }
        if (game.coins < price) { say('NOT ENOUGH COINS!'); Audio8.sfx('bump'); return; }
        game.coins -= price; game.farm[k] = today(); game.farm.n = (game.farm.n | 0) + 1;
        if (sel === 0) { game.pantry.egg = (game.pantry.egg | 0) + 2; say('CLUCK! +2 EGGS FOR THE KITCHEN'); } else { game.pantry.milk = (game.pantry.milk | 0) + 1; say('MOO! +1 MILK FOR THE KITCHEN'); }
        Audio8.sfx('oneup'); if (game.farm.n >= 5) try { Ach.unlock('farmer'); } catch (e) { /* ignore */ } Save.persist();
      },
      draw() {
        drawParallax('grass', t * 0.15); ctx.fillStyle = '#7ac050'; ctx.fillRect(0, 150, VW, 74); ctx.fillStyle = '#5aa040'; for (let x = 0; x < VW; x += 12) ctx.fillRect(x + ((t >> 5) % 2), 150, 2, 4);
        // barn
        ctx.fillStyle = '#1a1020'; ctx.fillRect(169, 89, 72, 62); ctx.fillStyle = '#c03a30'; ctx.fillRect(170, 90, 70, 60); ctx.fillStyle = '#ffffff'; ctx.fillRect(190, 112, 30, 38); ctx.fillStyle = '#c03a30'; ctx.fillRect(193, 115, 24, 35); ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(193, 115); ctx.lineTo(217, 150); ctx.moveTo(217, 115); ctx.lineTo(193, 150); ctx.stroke();
        ctx.fillStyle = '#8a2a20'; ctx.beginPath(); ctx.moveTo(164, 92); ctx.lineTo(205, 66); ctx.lineTo(246, 92); ctx.fill();
        // fence, crops
        ctx.fillStyle = '#e8d0a0'; for (let x = 4; x < 160; x += 14) ctx.fillRect(x, 160, 3, 18); ctx.fillRect(0, 164, 160, 3); ctx.fillRect(0, 172, 160, 3);
        for (let i = 0; i < 6; i++) { const x = 16 + i * 24; ctx.fillStyle = '#3a8a30'; ctx.fillRect(x, 192, 3, 12); ctx.fillStyle = i % 2 ? '#ffd040' : '#ff3050'; ctx.fillRect(x - 2, 188 + ((t >> 5) + i) % 2, 7, 5); }
        // hens and Daisy
        for (let i = 0; i < 3; i++) { const hx = 30 + i * 36 + Math.sin(t * 0.03 + i) * 10, hy = 146, peck = ((t >> 3) + i * 3) % 12 < 2 ? 2 : 0; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(hx, hy, 7, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(hx + 6, hy - 5 + peck, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ff3a3a'; ctx.fillRect(hx + 5, hy - 10 + peck, 3, 2); ctx.fillStyle = '#ffa020'; ctx.fillRect(hx + 9, hy - 5 + peck, 3, 2); ctx.fillStyle = '#1a1020'; ctx.fillRect(hx + 7, hy - 6 + peck, 1, 1); }
        const cx = 120 + Math.sin(t * 0.01) * 6; ctx.fillStyle = '#1a1020'; ctx.fillRect(cx - 1, 125, 36, 20); ctx.fillStyle = '#ffffff'; ctx.fillRect(cx, 126, 34, 18); ctx.fillStyle = '#1a1020'; ctx.fillRect(cx + 6, 128, 8, 6); ctx.fillRect(cx + 20, 134, 7, 6); ctx.fillStyle = '#ffffff'; ctx.fillRect(cx + 30, 118, 12, 12); ctx.fillStyle = '#ffb0c0'; ctx.fillRect(cx + 34, 124, 8, 5); ctx.fillStyle = '#1a1020'; ctx.fillRect(cx + 33, 120, 2, 2); for (const lx of [cx + 2, cx + 10, cx + 22, cx + 30]) ctx.fillRect(lx, 144, 3, 7);
        drawWindow(4, 4, 248, 22); txt('THE FARM', 12, 11, '#ffe040'); ctx.drawImage(Sprites.coinIcon, 104, 11); txt('*' + pad(game.coins, 2), 111, 11); txt(`EGGS ${game.pantry.egg | 0}  MILK ${game.pantry.milk | 0}`, 246, 11, '#fff8e0', { align: 'right' });
        drawWindow(4, 30, 200, 46); ROWS.forEach((r, i) => { const y = 36 + i * 12, on = i === sel; txt(r, 18, y, on ? '#ffe040' : '#fff'); if (on) txt('>', 8 + ((t >> 3) & 1), y, '#ffe040'); });
        txt('GROW STRAWBERRIES AND CORN IN THE GARDEN!', 128, 212, '#fff', { align: 'center', outline: '#101848' });
        if (msgT) txt(msg, 104, 82, '#40e090', { align: 'center', outline: '#101848' });
      },
    };
  }

  // ---------------- cooking: new recipes and a timing mini-game ----------------
  RECIPES.push(
    { id: 'pancakes', name: 'PANCAKES', need: { egg: 1, milk: 1 }, tip: 'FULL HEARTS AND +10 COINS', apply: (pl) => { pl.p.hearts = Math.max(pl.p.hearts, 3); payCoins(10); } },
    { id: 'shake', name: 'STRAWBERRY SHAKE', need: { milk: 1, strawberry: 2 }, tip: 'A SHIELD AND A COIN MAGNET', apply: (pl) => { pl.p.shield = true; pl.p.magnet = 1800; } },
    { id: 'cornbread', name: 'CORN BREAD', need: { corn: 2, egg: 1 }, tip: '+5 CANNONBALLS', apply: (pl) => { pl.p.ammo += 5; } },
    { id: 'feast', name: "FARMER'S FEAST", need: { corn: 1, strawberry: 1, egg: 1, milk: 1 }, tip: 'A 1-UP AND +3 SPECIALS', apply: (pl) => { game.lives++; pl.p.special += 3; } },
  );
  for (const R of RECIPES) if (!R._wrapped) { const a = R.apply; R._wrapped = true; R.apply = (pl) => { a(pl); if (game.snackStars === 3) { payCoins(20); pl.parts.push({ k: 'text', s: 'PERFECT COOKING! +20 COINS', x: pl.p.x - 40, y: pl.p.y - 30, vy: -0.3, life: 120 }); } game.snackStars = 0; }; }
  const ING = ['carrot', 'tomato', 'pumpkin', 'strawberry', 'corn', 'egg', 'milk'];
  const MARKET2 = [['carrot', 4], ['tomato', 5], ['pumpkin', 7], ['strawberry', 5], ['corn', 6], ['egg', 4], ['milk', 5]];
  const haveAll = (need) => Object.keys(need).every((k) => ((game.pantry || {})[k] | 0) >= need[k]);
  function CookScene(R) {
    const STEPS = [['CHOP!', '#ffd040'], ['STIR!', '#5ff0ff'], ['BAKE!', '#ff8a3a']];
    let step = 0, t = 0, pos = 0, dir = 1, zone = 0.3 + Math.random() * 0.4, pts = [], done = false, flash = 0;
    const W_ = 0.18;
    return {
      _s: () => ({ step, pts, done, stars: done ? (pts.reduce((a, b) => a + b, 0) >= 5 ? 3 : pts.reduce((a, b) => a + b, 0) >= 3 ? 2 : 1) : 0 }),
      enter() { Audio8.play('carnival'); },
      update() {
        t++; if (flash) flash--;
        if (done) { if (t > 50 && (Input.confirm() || Input.pressed('back'))) go(() => KitchenScene()); return; }
        pos += dir * (0.016 + step * 0.004); if (pos > 1 || pos < 0) { dir = -dir; pos = clamp(pos, 0, 1); }
        if (Input.confirm() && t > 10) {
          const d = Math.abs(pos - zone); const p = d < W_ / 6 ? 2 : d < W_ / 2 ? 1 : 0; pts.push(p); flash = 20; Audio8.sfx(p === 2 ? 'oneup' : p ? 'coin' : 'bump');
          if (++step >= 3) { done = true; t = 0; const total = pts.reduce((a, b) => a + b, 0), stars = total >= 5 ? 3 : total >= 3 ? 2 : 1; for (const k of Object.keys(R.need)) game.pantry[k] -= R.need[k]; game.snack = R.id; game.snackStars = stars; Ach.unlock('chef'); if (stars === 3) try { Ach.unlock('masterchef'); } catch (e) { /* ignore */ } Save.persist(); Audio8.play('victory'); }
          else { zone = 0.2 + Math.random() * 0.6; pos = 0; dir = 1; }
        }
      },
      draw() {
        ctx.fillStyle = '#f0d8a8'; ctx.fillRect(0, 0, VW, VH); for (let x = 0; x < VW; x += 16) for (let y = 0; y < 90; y += 16) if (((x + y) >> 4) & 1) hR(x, y, 16, 16, '#e8c890');
        drawWindow(8, 8, 240, 24); txt('COOKING: ' + R.name, 128, 15, '#ffe040', { align: 'center' });
        // the pan / bowl
        ctx.fillStyle = '#3a3a48'; ctx.beginPath(); ctx.ellipse(128, 110, 50, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#5a5a6a'; ctx.beginPath(); ctx.ellipse(128, 106, 44, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(176, 102, 30, 6);
        Object.keys(R.need).forEach((k, i) => { const a = t * 0.05 * (step === 1 ? 3 : 1) + i * 2; ctx.fillStyle = SEEDS[k].col; ctx.beginPath(); ctx.arc(128 + Math.cos(a) * 22, 106 + Math.sin(a) * 6, 5, 0, Math.PI * 2); ctx.fill(); });
        if (step === 2 || done) for (let k = 0; k < 3; k++) { ctx.fillStyle = 'rgba(230,230,240,0.6)'; ctx.beginPath(); ctx.arc(110 + k * 18, 88 - ((t + k * 10) % 30), 4, 0, Math.PI * 2); ctx.fill(); }
        ctx.drawImage(Sprites.dino.r[(t >> 4) & 1], 212, 120);
        if (!done) {
          const BX = 28, BW = 200, BY = 150; ctx.fillStyle = '#1a1020'; ctx.fillRect(BX - 2, BY - 2, BW + 4, 16); ctx.fillStyle = '#5a4a6a'; ctx.fillRect(BX, BY, BW, 12);
          ctx.fillStyle = '#40c060'; ctx.fillRect(BX + (zone - W_ / 2) * BW, BY, W_ * BW, 12); ctx.fillStyle = '#a0ff80'; ctx.fillRect(BX + (zone - W_ / 6) * BW, BY, (W_ / 3) * BW, 12);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(BX + pos * BW - 1, BY - 4, 3, 20);
          txt(STEPS[step][0], 128, 128, STEPS[step][1], { align: 'center', scale: 2, outline: '#101848' }); txt('PRESS A IN THE GREEN!', 128, 172, '#3a2010', { align: 'center', shadow: null });
          pts.forEach((p, i) => txt(['MISS', 'GOOD', 'PERFECT'][p], 60 + i * 68, 190, ['#c04040', '#3a8a3a', '#d09010'][p], { align: 'center', shadow: null }));
        } else {
          const total = pts.reduce((a, b) => a + b, 0), stars = total >= 5 ? 3 : total >= 3 ? 2 : 1; drawWindow(40, 140, 176, 64);
          txt(R.name + ' IS READY!', 128, 148, '#ffe040', { align: 'center' }); for (let k = 0; k < 3; k++) txt('#', 110 + k * 18, 162, k < stars ? '#ffe040' : '#5a6080', { scale: 2 });
          txt(stars === 3 ? 'PERFECT! +20 COINS WHEN YOU EAT IT' : 'EAT IT AT THE START OF A LEVEL', 128, 184, '#fff', { align: 'center' });
        }
      },
    };
  }
  KitchenScene = function () { // eslint-disable-line no-func-assign
    let sel = 0, t = 0, msg = '', msgT = 0; game.pantry = game.pantry || {};
    const rows = RECIPES.length + MARKET2.length + 1, SHOW = 9;
    return {
      _s: () => ({ sel, msg }),
      enter() { Audio8.play('menu'); },
      update() {
        t++; if (msgT) msgT--;
        if (Input.pressed('down')) { sel = (sel + 1) % rows; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + rows - 1) % rows; Audio8.sfx('select'); }
        if (Input.pressed('back') || Input.pressed('run') || (Input.confirm() && sel === rows - 1)) { Save.persist(); go(() => HouseScene(12)); return; }
        if (!Input.confirm()) return;
        if (sel < RECIPES.length) {
          const R = RECIPES[sel]; if (game.snack) { msg = 'EAT YOUR ' + RECIPES.find((k) => k.id === game.snack).name + ' FIRST!'; msgT = 120; Audio8.sfx('bump'); return; }
          if (!haveAll(R.need)) { msg = 'NOT ENOUGH INGREDIENTS'; msgT = 120; Audio8.sfx('bump'); return; }
          Audio8.sfx('confirm'); go(() => CookScene(R)); return;
        }
        const [v, price] = MARKET2[sel - RECIPES.length]; if (game.coins < price) { msg = 'NOT ENOUGH COINS!'; msgT = 100; Audio8.sfx('bump'); return; }
        game.coins -= price; game.pantry[v] = (game.pantry[v] | 0) + 1; Audio8.sfx('coin'); msg = 'BOUGHT ' + SEEDS[v].name + '!'; msgT = 80; Save.persist();
      },
      draw() {
        ctx.fillStyle = '#f0d8a8'; ctx.fillRect(0, 0, VW, VH); for (let x = 0; x < VW; x += 16) for (let y = 0; y < 60; y += 16) if (((x + y) >> 4) & 1) hR(x, y, 16, 16, '#e8c890');
        ctx.drawImage(Sprites.dino.r[(t >> 4) & 1], 214, 150);
        drawWindow(8, 4, 150, 20); txt("DINO'S KITCHEN", 83, 10, '#ffe040', { align: 'center' }); ctx.drawImage(Sprites.coinIcon, 172, 10); txt('*' + pad(game.coins, 2), 179, 10, '#3a2010', { shadow: null });
        ING.forEach((v, i) => { const x = 10 + (i % 4) * 60, y = 30 + Math.floor(i / 4) * 11; hR(x, y, 7, 7, SEEDS[v].col); hR(x, y, 7, 1, '#1a1020'); txt(`${SEEDS[v].name.slice(0, 6)} ${game.pantry[v] | 0}`, x + 10, y, '#3a2010', { shadow: null }); });
        drawWindow(8, 54, 200, 16 + SHOW * 12); const top = clamp(sel - 4, 0, rows - SHOW);
        for (let i = 0; i < SHOW; i++) { const k = top + i, y = 60 + i * 12; let label, col;
          if (k < RECIPES.length) { const R = RECIPES[k]; label = R.name; col = k === sel ? '#ffe040' : haveAll(R.need) ? '#fff' : '#7880b0'; }
          else if (k < rows - 1) { const [v, p] = MARKET2[k - RECIPES.length]; label = `BUY ${SEEDS[v].name} (${p})`; col = k === sel ? '#ffe040' : '#a8d8a8'; } else { label = 'BACK'; col = k === sel ? '#ffe040' : '#fff'; }
          txt(label, 24, y, col); if (k === sel) txt('>', 14 + ((t >> 3) & 1), y, '#ffe040'); }
        drawWindow(8, 184, 240, 36);
        if (msgT) txt(msg, 128, 196, '#c03030', { align: 'center' });
        else if (sel < RECIPES.length) { const R = RECIPES[sel]; txt(Object.keys(R.need).map((k) => `${R.need[k]} ${SEEDS[k].name}`).join(' + '), 128, 190, '#fff', { align: 'center' }); txt(R.tip, 128, 202, '#a8f0ff', { align: 'center' }); }
        else txt(game.snack ? 'READY TO EAT: ' + RECIPES.find((k) => k.id === game.snack).name : 'COOK A DISH TO EAT AT THE NEXT LEVEL', 128, 196, '#a8b0d8', { align: 'center' });
      },
    };
  };

  // ---------------- the weekend festival ----------------
  const weekend = () => !!window.FESTIVAL_FORCE || [0, 6].includes(new Date().getDay());
  const weekKey = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 1) % 7)); return d.toDateString(); };
  { const _T = TownScene;
    TownScene = function (...a) { // eslint-disable-line no-func-assign
      const s = _T(...a); if (!weekend()) return s; const _d = s.draw;
      s.draw = function () { _d.apply(this, arguments); for (let x = -8; x < VW + 8; x += 16) { ctx.fillStyle = ['#e83850', '#ffd040', '#3a7af0', '#3cc060'][((x + 8) / 16) % 4 | 0]; ctx.beginPath(); ctx.moveTo(x, 28); ctx.lineTo(x + 12, 28); ctx.lineTo(x + 6, 38); ctx.closePath(); ctx.fill(); } ctx.fillStyle = '#5a3a1a'; ctx.fillRect(0, 27, VW, 1); for (let k = 0; k < 14; k++) { ctx.fillStyle = ['#ff60a0', '#5ff0ff', '#ffe040'][k % 3]; ctx.fillRect((k * 37 + frame) % VW, (k * 23 + frame * 0.7) % 150 + 40, 2, 2); } txt('FESTIVAL WEEKEND!', 128, 44, (frame >> 4) & 1 ? '#ffe040' : '#ff80c0', { align: 'center', outline: '#101848' }); };
      return s;
    };
  }
  function FestivalScene() {
    let sel = 0, t = 0, msg = '', msgT = 0, toss = null;
    const ROWS = ['LUCKY DIP (2 COINS)', 'RING TOSS (3 COINS)', 'PARADE GIFT', 'BACK'];
    const say = (m) => { msg = m; msgT = 160; };
    const dip = () => { const r = Math.random(); if (r < 0.4) { const n = 1 + Math.floor(Math.random() * 5); payCoins(n); return `${n} COINS`; } if (r < 0.65) { payCoins(8); return '8 COINS'; } if (r < 0.8) { const v = ['carrot', 'tomato', 'egg', 'strawberry'][Math.floor(Math.random() * 4)]; game.pantry = game.pantry || {}; game.pantry[v] = (game.pantry[v] | 0) + 1; return 'A ' + SEEDS[v].name; } if (r < 0.93) { payCoins(15); return '15 COINS'; } game.lives++; return 'A 1-UP!'; };
    return {
      _s: () => ({ sel, msg, toss, open: weekend() }),
      enter() { Audio8.play('carnival'); },
      update() {
        t++; if (msgT) msgT--;
        if (toss) {
          toss.x += toss.d * (1.4 + toss.n * 0.3); if (toss.x > 200 || toss.x < 56) toss.d = -toss.d;
          if (toss.fly > 0) { if (--toss.fly === 0) { const hit = Math.abs(toss.x - 128) < 9; toss.hits += hit ? 1 : 0; toss.n++; Audio8.sfx(hit ? 'coin' : 'bump'); if (toss.n >= 3) { const prize = toss.hits * 4 + (toss.hits === 3 ? 5 : 0); payCoins(prize); say(toss.hits === 3 ? `3 RINGERS! +${prize} COINS` : `${toss.hits} RINGER${toss.hits === 1 ? '' : 'S'}: +${prize} COINS`); if (toss.hits === 3) try { Ach.unlock('festival'); } catch (e) { /* ignore */ } toss = null; Save.persist(); } } return; }
          if (Input.confirm()) { toss.fly = 24; Audio8.sfx('jump'); } if (Input.pressed('back')) toss = null; return;
        }
        if (!weekend()) { if (t > 10 && (Input.confirm() || Input.pressed('back') || Input.pressed('run'))) go(() => TownScene()); return; }
        if (Input.pressed('down')) { sel = (sel + 1) % ROWS.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + ROWS.length - 1) % ROWS.length; Audio8.sfx('select'); }
        if (Input.pressed('back') || Input.pressed('run') || (Input.confirm() && sel === 3)) { Save.persist(); go(() => TownScene()); return; }
        if (!Input.confirm()) return;
        if (sel === 0) { if (game.coins < 2) { say('NOT ENOUGH COINS!'); Audio8.sfx('bump'); return; } game.coins -= 2; say('YOU PULLED OUT ' + dip()); Audio8.sfx('oneup'); Save.persist(); }
        else if (sel === 1) { if (game.coins < 3) { say('NOT ENOUGH COINS!'); Audio8.sfx('bump'); return; } game.coins -= 3; toss = { x: 60, d: 1, n: 0, hits: 0, fly: 0 }; Audio8.sfx('confirm'); }
        else if (game.festGift === weekKey()) { say('ONE PARADE GIFT EACH WEEKEND!'); Audio8.sfx('bump'); } else { game.festGift = weekKey(); payCoins(10); say('THE PARADE GIVES YOU 10 COINS!'); Audio8.sfx('oneup'); }
      },
      draw() {
        drawParallax('carnival', t * 0.3); ctx.fillStyle = '#c8a878'; ctx.fillRect(0, 186, VW, 38);
        for (let x = -8; x < VW + 8; x += 16) { ctx.fillStyle = ['#e83850', '#ffd040', '#3a7af0', '#3cc060'][((x + 8) / 16) % 4 | 0]; ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x + 12, 4); ctx.lineTo(x + 6, 14); ctx.closePath(); ctx.fill(); }
        // the parade
        QUESTS.forEach((q, i) => { const x = ((t * 0.6 + i * 52) % (VW + 60)) - 30; Wally.draw(ctx, x, 186, 'walk' + ((t >> 2) % 8), 1, { t, hero: q.hero, costume: q.costume, hat: 'none' }); ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x + 4, 166); ctx.lineTo(x + 6, 150); ctx.stroke(); ctx.fillStyle = ['#ff60a0', '#5ff0ff', '#ffe040', '#a0ff80', '#ff9a3a'][i]; ctx.beginPath(); ctx.ellipse(x + 6, 144, 5, 6, 0, 0, Math.PI * 2); ctx.fill(); });
        { const x = ((t * 0.6 + 5 * 52) % (VW + 60)) - 30; ctx.drawImage(Sprites.dino.r[(t >> 3) & 1], Math.round(x - 12), 166); }
        if (!weekend()) { drawWindow(28, 50, 200, 70); txt('THE FESTIVAL IS CLOSED', 128, 60, '#ffe040', { align: 'center' }); txt('IT OPENS EVERY SATURDAY', 128, 80, '#fff', { align: 'center' }); txt('AND SUNDAY. COME BACK THEN!', 128, 92, '#fff', { align: 'center' }); return; }
        drawWindow(16, 22, 224, 66); txt('WEEKEND FESTIVAL', 128, 28, '#ffe040', { align: 'center' });
        ROWS.forEach((r, i) => { const y = 42 + i * 11, on = i === sel; txt(r, 40, y, on ? '#ffe040' : '#fff'); if (on) txt('>', 30 + ((t >> 3) & 1), y, '#ffe040'); });
        ctx.drawImage(Sprites.coinIcon, 186, 42); txt('*' + pad(game.coins, 2), 193, 42, '#fff');
        if (toss) { drawWindow(40, 92, 176, 56); ctx.fillStyle = '#8a5a30'; ctx.fillRect(Math.round(toss.x) - 2, 116, 4, 22); ctx.fillStyle = '#ffd040'; ctx.fillRect(Math.round(toss.x) - 6, 136, 12, 3); txt(`RING ${toss.n + 1}/3  RINGERS ${toss.hits}`, 128, 98, '#fff', { align: 'center' }); const fy = toss.fly > 0 ? 140 - (24 - toss.fly) * 1.2 : 140; ctx.strokeStyle = '#ff60a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(128, toss.fly > 0 ? 116 + toss.fly * 1.1 : 142, 7, 3, 0, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1; txt('A: THROW WHEN THE PEG IS IN THE MIDDLE', 128, 108, '#a8b0d8', { align: 'center' }); void fy; }
        if (msgT) txt(msg, 128, 154, '#40e090', { align: 'center', outline: '#101848' });
      },
    };
  }

  // ---------------- mini-game records ----------------
  const REC = { penalty: 'PENALTY SHOOTOUT', tennis: 'TENNIS VS DINO', hide: 'HIDE & SEEK', tag: 'TAG VS GOTHCHICK' };
  const recAdd = (k, r) => { game.mgRec = game.mgRec || {}; const a = game.mgRec[k] = game.mgRec[k] || []; r.d = todayKey(); a.push(r); a.sort((x, y) => y.score - x.score); a.length = Math.min(a.length, 5); Save.persist(); };
  const hook = (name, key, fn) => { const _f = window[name]; if (typeof _f !== 'function') return; window[name] = function (...args) { const s = _f(...args); if (!s || !s._s) return s; const _u = s.update; let done = false; s.update = function () { const r = _u.apply(this, arguments); if (!done) { const st = s._s(); if (st.stage === 'end') { done = true; const rec = fn(st); if (rec && game) recAdd(key, rec); } } return r; }; return s; }; };
  hook('PenaltyScene', 'penalty', (s) => { const a = s.me.filter(Boolean).length, b = s.dino.filter(Boolean).length; return { score: (s.won ? 1000 : 0) + (a - b) * 10 + a, txt: `${s.won ? 'WIN' : 'LOSS'} ${a}-${b}` }; });
  hook('TennisScene', 'tennis', (s) => ({ score: (s.won ? 1000 : 0) + (s.games[0] - s.games[1]) * 10, txt: `${s.won ? 'WIN' : 'LOSS'} ${s.games[0]}-${s.games[1]}` }));
  hook('HideSeekScene', 'hide', (s) => { const used = 90 * 60 - s.left, sec = Math.round(used / 60); return { score: s.got * 10000 - (s.got === 5 ? used : 0), txt: s.got === 5 ? `ALL 5 IN ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : `${s.got}/5 FOUND` }; });
  hook('TagScene', 'tag', (s) => (s.two ? null : { score: (s.won === 0 ? 100000 : 0) - s.itT[0], txt: `${s.won === 0 ? 'WIN' : s.won < 0 ? 'DRAW' : 'LOSS'} - IT FOR ${(s.itT[0] / 60).toFixed(1)}S` }));
  function RecordsScene() {
    let tab = 0, t = 0; const K = Object.keys(REC);
    return {
      _s: () => ({ tab, rec: game.mgRec || {} }),
      enter() { Audio8.play('menu'); },
      update() { t++; if (Input.pressed('right')) { tab = (tab + 1) % K.length; Audio8.sfx('select'); } if (Input.pressed('left')) { tab = (tab + K.length - 1) % K.length; Audio8.sfx('select'); } if (t > 10 && (Input.pressed('back') || Input.pressed('run') || Input.confirm())) go(() => HouseScene(21)); },
      draw() {
        drawParallax('carnival', t * 0.3); drawWindow(16, 16, 224, 192); txt('MINI-GAME RECORDS', 128, 24, '#ffe040', { align: 'center' });
        txt(`< ${REC[K[tab]]} >`, 128, 44, '#5ff0ff', { align: 'center' });
        const a = (game.mgRec || {})[K[tab]] || [];
        if (!a.length) txt('NO RECORDS YET - GO PLAY!', 128, 100, '#a8b0d8', { align: 'center' });
        a.forEach((r, i) => { const y = 66 + i * 18; txt(`${i + 1}.`, 34, y, i === 0 ? '#ffe040' : '#fff'); txt(r.txt, 56, y, i === 0 ? '#ffe040' : '#fff'); const d = String(r.d || ''); txt(d.length === 8 ? `${d.slice(6)}/${d.slice(4, 6)}` : '', 224, y, '#a8b0d8', { align: 'right' }); });
        txt('YOUR 5 BEST GAMES OF EACH', 128, 176, '#a8b0d8', { align: 'center' }); txt('< > CHANGE GAME   B: BACK', 128, 190, '#fff', { align: 'center' });
      },
    };
  }

  if (typeof ACH_LIST !== 'undefined') ACH_LIST.push(['grip', 'GET A GRIP', 'FIND THE GRIP GLOVES'], ['gift', 'IT IS THE THOUGHT', 'OPEN A GIFT CODE'], ['farmer', 'EARLY RISER', 'COLLECT FROM THE FARM 5 TIMES'], ['masterchef', 'PERFECT PLATE', 'COOK A PERFECT 3-STAR DISH'], ['festival', 'RINGER!', 'GET 3 RINGERS AT THE RING TOSS']);
  UPDATES.unshift(['2.8', ['NEW HERO: DINO! TAIL SPIN AND', '  A GROUND-SHAKING STOMP', 'GRIP GLOVES: HANG FROM CEILINGS', 'ONLINE CO-OP: UP TO 4 PLAYERS', '  AND SHARED BOSS HEALTH', 'GIFT CODES (DINO\'S HOUSE)', 'THE FARM IN WALLY TOWN', 'COOKING MINI-GAME + 4 RECIPES', 'WEEKEND FESTIVAL IN TOWN', 'MINI-GAME RECORDS']]);
  return { GiftScene, FarmScene, CookScene, FestivalScene, RecordsScene, giftCode, giftOpen, weekend, recAdd, dinoFrame };
})();
function GiftScene() { return U28.GiftScene(); }
function FarmScene() { return U28.FarmScene(); }
function FestivalScene() { return U28.FestivalScene(); }
function RecordsScene() { return U28.RecordsScene(); }
