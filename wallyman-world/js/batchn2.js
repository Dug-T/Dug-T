'use strict';
// =====================================================================
// Update 1.3 (part 2): Card Battle, Grumble Bowling, the Party Board,
// the Arcade Corner (Brick Breaker and Snake) and Air Hockey.
// =====================================================================
ACH_LIST.push(['cardshark', 'CARD SHARK', 'BEAT BARON STATIC AT CARD BATTLE'], ['strike', 'STRIKE!', 'KNOCK DOWN ALL 10 GRUMBLES IN ONE ROLL'], ['partyking', 'PARTY ANIMAL', 'WIN A PARTY BOARD GAME'],
  ['arcade', 'ARCADE ACE', 'SCORE 3000 AT BRICK BREAKER'], ['snake', 'LONG BOI', 'GROW YOUR SNAKE TO 20'], ['hockey', 'TOP SHELF', 'BEAT DINO AT AIR HOCKEY']);
const mgBack = (n) => () => MiniGamesScene(n);
const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

// ---------------- Card Battle ----------------
const ELEM = [['FIRE', '#ff6030'], ['WATER', '#40a0ff'], ['ZAP', '#ffe040']];
const beats = (a, b) => (a === 1 && b === 0) || (a === 0 && b === 2) || (a === 2 && b === 1); // water > fire > zap > water
const cardOf = (id, shiny) => { const B = BEASTS.find((k) => k[0] === id) || [id, id.toUpperCase(), 'e'], h = hash(id); return { id, name: B[1], pow: (B[2] === 'b' ? 6 + (h % 4) : 1 + (h % 5)) + (shiny ? 1 : 0), el: h % 3, shiny }; };
const RIVALS = [['PROFESSOR HOOT', 1, '#8a6a40'], ['DINO', 2, '#30b0a0'], ['VOLT', 3, '#5aa0ff'], ['BARON STATIC', 4, '#c060ff']];
function myDeck() {
  const own = BEASTS.filter((b) => Cards.get(b[0])).map((b) => cardOf(b[0], (Cards.get(b[0]).s | 0) > 0));
  const loan = ['grumble', 'prickle', 'buzzer', 'hopper', 'bat'].filter((k) => !own.some((c) => c.id === k)).map((k) => Object.assign(cardOf(k), { loan: true }));
  return own.length >= 5 ? own : own.concat(loan).slice(0, Math.max(5, own.length));
}
function drawCard(c, x, y, sel, hidden) {
  hR(x, y, 44, 60, sel ? '#ffe040' : '#1a1020'); hR(x + 2, y + 2, 40, 56, hidden ? '#3a2a6a' : c.shiny ? '#fff8d0' : '#f4ecd8');
  if (hidden) { txt('?', x + 22, y + 24, '#a8b0d8', { align: 'center', scale: 2 }); return; }
  hR(x + 4, y + 12, 36, 30, '#8ad0f8'); ctx.save(); ctx.beginPath(); ctx.rect(x + 4, y + 12, 36, 30); ctx.clip(); stickerArt(c.id, x + 22, y + 27, frame); ctx.restore();
  txt(String(c.pow), x + 5, y + 4, '#1a1020', { shadow: null }); hR(x + 30, y + 4, 9, 7, ELEM[c.el][1]); txt(c.name.length > 7 ? c.name.slice(0, 7) : c.name, x + 22, y + 46, '#1a1020', { align: 'center', shadow: null });
  if (c.loan) txt('LOAN', x + 22, y + 2, '#a02020', { align: 'center', shadow: null });
}
function CardBattleScene() {
  let stage = 'pick', rival = 0, t = 0, sel = 0, hand = [], foe = [], round = 0, me = 0, them = 0, played = null, msg = '', done = false;
  const deal = () => { const d = myDeck().slice(); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } hand = d.slice(0, 5); const L = RIVALS[rival][1], pool = BEASTS.filter((b) => (b[2] === 'b') === (L >= 3 && Math.random() < 0.5) || L < 3).map((b) => cardOf(b[0])); foe = []; for (let i = 0; i < 5; i++) { let c = pool[Math.floor(Math.random() * pool.length)]; if (L <= 1) c = Object.assign({}, c, { pow: Math.max(1, c.pow - 2) }); foe.push(c); } };
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (Input.pressed('back')) { go(mgBack(11)); return; }
      if (stage === 'pick') {
        if (Input.pressed('down')) { rival = (rival + 1) % RIVALS.length; Audio8.sfx('select'); } if (Input.pressed('up')) { rival = (rival + RIVALS.length - 1) % RIVALS.length; Audio8.sfx('select'); }
        if (Input.confirm()) { deal(); stage = 'play'; round = 0; me = 0; them = 0; sel = 0; Audio8.sfx('confirm'); }
        return;
      }
      if (stage === 'show') { if (t > 70 && Input.confirm()) { played = null; round++; t = 0; if (round >= 5) { stage = 'end'; const won = me > them; if (won) { payCoins(5 * RIVALS[rival][1]); if (rival === 3) Ach.unlock('cardshark'); } Audio8.play(won ? 'victory' : 'gameover'); } else stage = 'play'; } return; }
      if (stage === 'end') { if (t > 60 && Input.confirm()) { stage = 'pick'; t = 0; Audio8.play('menu'); } return; }
      const left = hand.filter((c) => !c.used);
      if (Input.pressed('right')) { sel = (sel + 1) % left.length; Audio8.sfx('select'); } if (Input.pressed('left')) { sel = (sel + left.length - 1) % left.length; Audio8.sfx('select'); }
      if (Input.confirm()) {
        const mine = left[sel % left.length], theirs = foe[round]; mine.used = true; sel = 0;
        const a = mine.pow + (beats(mine.el, theirs.el) ? 3 : 0), b = theirs.pow + (beats(theirs.el, mine.el) ? 3 : 0);
        played = { mine, theirs, a, b }; if (a > b) { me++; msg = 'YOU WIN THE ROUND!'; Audio8.sfx('coin'); } else if (b > a) { them++; msg = RIVALS[rival][0] + ' WINS THE ROUND'; Audio8.sfx('bump'); } else { msg = 'A DRAW!'; Audio8.sfx('select'); }
        stage = 'show'; t = 0;
      }
    },
    draw() {
      ctx.fillStyle = '#1a3a2a'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#20482f'; for (let y = 0; y < VH; y += 8) ctx.fillRect(0, y, VW, 4);
      if (stage === 'pick') {
        drawWindow(24, 12, 208, 30); txt('CARD BATTLE', 128, 20, '#ffe040', { align: 'center', scale: 2 });
        drawWindow(24, 50, 208, 20 + RIVALS.length * 16); RIVALS.forEach(([n, L, c], i) => { const y = 58 + i * 16; txt(n, 48, y, i === rival ? '#ffe040' : '#fff'); txt('LEVEL ' + L, 210, y, c, { align: 'right' }); if (i === rival) txt('>', 36 + ((t >> 3) & 1), y, '#ffe040'); });
        drawWindow(24, 138, 208, 74); ['PLAY 5 CARDS, ONE A ROUND.', 'HIGHER POWER WINS THE ROUND.', 'WATER BEATS FIRE, FIRE BEATS', 'ZAP, ZAP BEATS WATER (+3).', `YOUR CARDS: ${myDeck().filter((c) => !c.loan).length} (CARD ALBUM)`].forEach((l, i) => txt(l, 128, 144 + i * 12, i === 4 ? '#5ff0ff' : '#fff', { align: 'center' }));
        return;
      }
      txt(`${RIVALS[rival][0]}`, 128, 4, RIVALS[rival][2], { align: 'center', outline: '#101848' }); txt(`ROUND ${Math.min(5, round + 1)}/5   YOU ${me} - ${them} THEM`, 128, 14, '#fff', { align: 'center', outline: '#101848' });
      for (let i = round; i < 5; i++) drawCard(foe[i], 20 + (i - round) * 48, 26, false, true);
      if (played) { drawCard(played.theirs, 106, 70, false, false); drawCard(played.mine, 106, 134, true, false); txt(`${played.b}`, 160, 98, '#ff8080', { scale: 2, outline: '#101848' }); txt(`${played.a}`, 160, 162, '#5ae060', { scale: 2, outline: '#101848' }); txt(msg, 128, 200, '#ffe040', { align: 'center', outline: '#101848' }); }
      else { const left = hand.filter((c) => !c.used); left.forEach((c, i) => drawCard(c, 128 - left.length * 24 + i * 48, 150 - (i === sel % left.length ? 8 : 0), i === sel % left.length, false)); txt('< > CHOOSE   A: PLAY', 128, 120, '#fff', { align: 'center', outline: '#101848' }); }
      if (stage === 'end') { drawWindow(48, 80, 160, 60); txt(me > them ? 'YOU WIN!' : me === them ? 'A DRAW!' : 'YOU LOSE...', 128, 90, me > them ? '#ffe040' : '#ff8080', { align: 'center', scale: 2 }); if (me > them) txt(`+${5 * RIVALS[rival][1]} COINS`, 128, 116, '#5ff0ff', { align: 'center' }); }
    },
  };
}

// ---------------- Grumble Bowling ----------------
function BowlingScene() {
  const LX = 88, RX = 168, PIN = [[128, 40], [120, 52], [136, 52], [112, 64], [128, 64], [144, 64], [104, 76], [120, 76], [136, 76], [152, 76]];
  let frameN = 0, roll = 0, score = 0, t = 0, stage = 'aim', bx = 128, ang = 0, adir = 1, pow = 0, pdir = 1, ball = null, pins = [], left = 10, msg = '', msgT = 0, done = false, settle = 0;
  const rack = () => { pins = PIN.map(([x, y]) => ({ x, y, ox: x, oy: y, vx: 0, vy: 0, down: false })); };
  rack();
  return {
    enter() { Audio8.play('carnival'); },
    update() {
      t++; if (msgT) msgT--;
      if (done) { if (t > 60 && (Input.confirm() || Input.pressed('back'))) go(mgBack(12)); return; }
      if (Input.pressed('back')) { go(mgBack(12)); return; }
      if (stage === 'aim') { if (Input.down('left')) bx = Math.max(LX + 8, bx - 1.2); if (Input.down('right')) bx = Math.min(RX - 8, bx + 1.2); ang += adir * 0.012; if (Math.abs(ang) > 0.35) adir = -adir; if (Input.confirm()) { stage = 'power'; Audio8.sfx('select'); } return; }
      if (stage === 'power') { pow += pdir * 0.025; if (pow >= 1 || pow <= 0) pdir = -pdir; if (Input.confirm()) { stage = 'roll'; const s = 2.5 + pow * 3.5; ball = { x: bx, y: 196, vx: Math.sin(ang) * s, vy: -Math.cos(ang) * s }; Audio8.sfx('kick'); } return; }
      if (stage === 'roll') {
        const all = [ball].concat(pins.filter((p) => !p.out));
        for (let k = 0; k < 3; k++) {
          for (const o of all) { o.x += o.vx / 3; o.y += o.vy / 3; }
          if (ball.x < LX || ball.x > RX) { ball.vx = 0; ball.gutter = true; }
          for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) { const a = all[i], b = all[j], ra = a === ball ? 6 : 5, dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d < ra + 5 && d > 0) { const nx = dx / d, ny = dy / d, rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny; if (rel > 0) { const ma = a === ball ? 3 : 1, mb = 1, imp = (2 * rel) / (ma + mb); a.vx -= imp * mb * nx * 0.9; a.vy -= imp * mb * ny * 0.9; b.vx += imp * ma * nx * 0.9; b.vy += imp * ma * ny * 0.9; if (a === ball || b === ball) Audio8.sfx('stomp'); } } }
        }
        for (const p of pins) { p.vx *= 0.96; p.vy *= 0.96; if (p.x < LX - 4 || p.x > RX + 4 || p.y < 20) p.out = true; if (Math.hypot(p.x - p.ox, p.y - p.oy) > 4) p.down = true; }
        if (ball.y < 10 || (Math.hypot(ball.vx, ball.vy) < 0.05)) { settle++; if (settle > 50) {
          settle = 0; const n = pins.filter((p) => p.down).length - (10 - left), now = pins.filter((p) => p.down).length;
          let bonus = 0; if (roll === 0 && now === 10) { bonus = 10; msg = 'STRIKE!'; Ach.unlock('strike'); Audio8.sfx('oneup'); } else if (roll === 1 && now === 10) { bonus = 5; msg = 'SPARE!'; Audio8.sfx('coin'); } else msg = n + ' GRUMBLE' + (n === 1 ? '' : 'S') + (ball.gutter && n === 0 ? ' - GUTTER BALL!' : '!');
          score += n + bonus; left = 10 - now; msgT = 80;
          if (roll === 0 && left > 0) { roll = 1; pins = pins.filter((p) => !p.down); } else { roll = 0; frameN++; rack(); left = 10; if (frameN >= 5) { done = true; t = 0; const c = Math.floor(score / 6); payCoins(c); this.coins = c; Audio8.play('victory'); } }
          stage = 'aim'; ball = null; bx = 128; pow = 0;
        } }
      }
    },
    draw() {
      ctx.fillStyle = '#2a1a3a'; ctx.fillRect(0, 0, VW, VH); hR(LX - 10, 10, 10, VH, '#3a2a4a'); hR(RX, 10, 10, VH, '#3a2a4a'); hR(LX, 10, RX - LX, VH, '#d8a868'); for (let x = LX + 8; x < RX; x += 10) hR(x, 10, 1, VH, '#c89858'); for (let k = 0; k < 7; k++) hR(LX + 10 + k * 10, 150, 3, 3, '#8a4a20');
      for (const p of pins) { if (p.out) continue; ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y)); if (p.down) ctx.rotate(0.9); ctx.drawImage(Sprites.grumble[(t >> 4) & 1], -7, -7); ctx.restore(); }
      if (ball) { ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(ball.x, ball.y, 6.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#3050c0'; ctx.beginPath(); ctx.arc(ball.x, ball.y, 5.5, 0, Math.PI * 2); ctx.fill(); hR(ball.x - 2, ball.y - 3, 2, 2, '#ffffff'); }
      else { ctx.fillStyle = '#3050c0'; ctx.beginPath(); ctx.arc(bx, 196, 6, 0, Math.PI * 2); ctx.fill(); for (let k = 1; k < 6; k++) hR(bx + Math.sin(ang) * k * 8 - 1, 196 - Math.cos(ang) * k * 8 - 1, 2, 2, '#fff'); }
      hR(4, 4, 76, 70, 'rgba(16,24,72,0.85)'); txt('BOWLING', 42, 8, '#ffe040', { align: 'center' }); txt(`FRAME ${Math.min(5, frameN + 1)}/5`, 8, 22, '#fff'); txt(`ROLL ${roll + 1}`, 8, 34, '#fff'); txt(`SCORE ${score}`, 8, 46, '#5ff0ff');
      if (stage === 'power' || stage === 'aim') { hR(180, 60, 10, 100, '#1a1020'); hR(181, 159 - Math.round(98 * pow), 8, Math.round(98 * pow), pow > 0.8 ? '#ff5040' : '#5ae060'); }
      txt(stage === 'aim' ? '< > MOVE  A: SET ANGLE' : stage === 'power' ? 'A: SET POWER' : msgT ? msg : '', 128, 212, '#fff', { align: 'center', outline: '#101848' });
      if (done) { drawWindow(56, 80, 144, 60); txt('GAME OVER', 128, 88, '#ffe040', { align: 'center', scale: 2 }); txt(`SCORE ${score}  +${this.coins || 0} COINS`, 128, 114, '#5ff0ff', { align: 'center' }); }
    },
  };
}

// ---------------- the Party Board ----------------
function PartyBoardScene() {
  const N = 24, SP = [];
  for (let i = 0; i < N; i++) { const s = i % 24, side = Math.floor(s / 6), k = s % 6; const x = side === 0 ? 30 + k * 34 : side === 1 ? 234 : side === 2 ? 234 - k * 34 : 30, y = side === 0 ? 48 : side === 1 ? 48 + k * 26 : side === 2 ? 204 : 204 - k * 26; SP.push({ x, y, kind: i === 0 ? 'start' : i % 6 === 3 ? 'mini' : i % 5 === 2 ? 'event' : i % 4 === 1 ? 'red' : 'blue' }); }
  const KC = { start: '#ffffff', blue: '#3a7af0', red: '#e03040', event: '#30c060', mini: '#ffc020' };
  let stage = 'setup', humans = 1, t = 0, players = [], turn = 0, roundN = 1, die = 1, steps = 0, star = 9, msg = '', msgT = 0, mini = null, results = null;
  const ROUNDS = 8;
  const start = () => { const heroes = HERO_IDS.filter((h) => heroOpen(h) && h !== 'maker').slice(0, 4); while (heroes.length < 4) heroes.push('wally'); players = [0, 1, 2, 3].map((i) => ({ hero: heroes[i], cpu: i >= humans, pos: 0, coins: 10, stars: 0, name: i < humans ? 'P' + (i + 1) : 'CPU' })); stage = 'roll'; turn = 0; t = 0; };
  const P = () => players[turn];
  const say = (s) => { msg = s; msgT = 90; };
  const land = () => {
    const pl = P(), sp = SP[pl.pos];
    if (sp.kind === 'blue') { pl.coins += 3; say(pl.name + ' +3 COINS'); Audio8.sfx('coin'); }
    else if (sp.kind === 'red') { pl.coins = Math.max(0, pl.coins - 3); say(pl.name + ' LOSES 3 COINS'); Audio8.sfx('bump'); }
    else if (sp.kind === 'event') { const r = Math.floor(Math.random() * 3); if (r === 0) { pl.coins += 6; say('LUCKY! +6 COINS'); } else if (r === 1) { pl.pos = Math.floor(Math.random() * N); say('WHOOSH! WARPED AWAY'); } else { const rich = players.slice().sort((a, b) => b.coins - a.coins)[0]; const n = Math.min(4, rich.coins); rich.coins -= n; pl.coins += n; say(`${pl.name} TAKES ${n} FROM ${rich.name}`); } Audio8.sfx('secret'); }
    else if (sp.kind === 'mini') { mini = { t: 0, go: 60 + Math.floor(Math.random() * 80), hit: -1 }; stage = 'mini'; return; }
    next();
  };
  const next = () => { stage = 'wait'; t = 0; };
  return {
    enter() { Audio8.play('carnival'); },
    update() {
      t++; if (msgT) msgT--;
      if (Input.pressed('back') && (stage === 'setup' || stage === 'end')) { go(mgBack(13)); return; }
      if (stage === 'setup') { if (Input.pressed('right')) humans = Math.min(4, humans + 1); if (Input.pressed('left')) humans = Math.max(1, humans - 1); if (Input.confirm() && t > 10) { start(); Audio8.sfx('confirm'); } return; }
      if (stage === 'end') { if (t > 60 && Input.confirm()) go(mgBack(13)); return; }
      const pl = P();
      if (stage === 'roll') { die = 1 + (t >> 2) % 6; if ((pl.cpu && t > 50) || (!pl.cpu && Input.confirm() && t > 10)) { die = 1 + Math.floor(Math.random() * 6); steps = die; stage = 'move'; t = 0; Audio8.sfx('select'); } return; }
      if (stage === 'move') { if (t % 10 === 0) { pl.pos = (pl.pos + 1) % N; steps--; Audio8.sfx('jump'); if (pl.pos === star && pl.coins >= 10) { pl.coins -= 10; pl.stars++; star = (star + 7 + Math.floor(Math.random() * 10)) % N || 5; say(pl.name + ' GETS A STAR!'); Audio8.sfx('oneup'); } if (steps <= 0) { t = 0; land(); } } return; }
      if (stage === 'mini') {
        mini.t++;
        if (mini.hit < 0) { const press = pl.cpu ? mini.t === mini.go + 12 + Math.floor(Math.random() * 20) : Input.confirm(); if (press) { if (mini.t < mini.go) { mini.hit = 0; say('TOO EARLY!'); Audio8.sfx('bump'); } else { const r = mini.t - mini.go; mini.hit = Math.max(1, 10 - Math.floor(r / 4)); pl.coins += mini.hit; say(`QUICK DRAW! +${mini.hit} COINS`); Audio8.sfx('coin'); } mini.done = mini.t; } if (mini.t > mini.go + 120 && mini.hit < 0) { mini.hit = 0; mini.done = mini.t; } }
        else if (mini.t - mini.done > 60) next();
        return;
      }
      if (stage === 'wait' && t > 50) { turn++; if (turn >= 4) { turn = 0; roundN++; } if (roundN > ROUNDS) { stage = 'end'; t = 0; results = players.slice().sort((a, b) => b.stars - a.stars || b.coins - a.coins); const win = results[0]; if (!win.cpu) { Ach.unlock('partyking'); payCoins(15); } Audio8.play('victory'); } else { stage = 'roll'; t = 0; } }
    },
    draw() {
      drawParallax('carnival', frame * 0.2);
      if (stage === 'setup') { drawWindow(32, 50, 192, 110); txt('PARTY BOARD', 128, 58, '#ffe040', { align: 'center', scale: 2 }); txt(`< ${humans} PLAYER${humans > 1 ? 'S' : ''} >`, 128, 90, '#fff', { align: 'center' }); txt(`${4 - humans} CPU`, 128, 104, '#a8b0d8', { align: 'center' }); txt(`${ROUNDS} ROUNDS. MOST STARS WINS!`, 128, 122, '#fff', { align: 'center' }); txt('PASS THE CONTROLLER ON YOUR TURN', 128, 136, '#a8b0d8', { align: 'center' }); return; }
      hR(20, 40, 224, 172, 'rgba(16,24,72,0.5)');
      SP.forEach((s, i) => { hR(s.x - 9, s.y - 9, 18, 18, '#1a1020'); hR(s.x - 8, s.y - 8, 16, 16, KC[s.kind]); if (s.kind === 'mini') txt('M', s.x - 2, s.y - 3, '#1a1020', { shadow: null }); if (s.kind === 'event') txt('?', s.x - 2, s.y - 3, '#1a1020', { shadow: null }); if (i === star) { hR(s.x - 4, s.y - 18, 8, 8, '#ffe040'); hR(s.x - 2, s.y - 20, 4, 12, '#ffe040'); } });
      players.forEach((pl, i) => { const s = SP[pl.pos]; Wally.draw(ctx, s.x - 6 + (i % 2) * 12, s.y + 4 - Math.floor(i / 2) * 6, i === turn && stage === 'move' ? 'jump' : 'idle0', 1, { t: frame, hero: pl.hero, sx: 0.7, sy: 0.7 }); });
      players.forEach((pl, i) => { const x = 56 + (i % 2) * 80, y = 76 + Math.floor(i / 2) * 26; hR(x, y, 74, 22, i === turn ? '#ffe040' : '#1a1020'); hR(x + 1, y + 1, 72, 20, '#2a2a5a'); txt(`${pl.name} ${(HEROES[pl.hero].short || HEROES[pl.hero].name).slice(0, 6)}`, x + 4, y + 3, '#fff'); txt(`*${pl.stars}  ${pl.coins}C`, x + 4, y + 12, '#ffe040'); });
      txt(`ROUND ${Math.min(ROUNDS, roundN)}/${ROUNDS}`, 128, 132, '#fff', { align: 'center', outline: '#101848' });
      const pl = P();
      if (stage === 'roll') { hR(112, 142, 32, 32, '#1a1020'); hR(114, 144, 28, 28, '#ffffff'); txt(String(die), 128, 152, '#1a1020', { align: 'center', scale: 2, shadow: null }); txt(pl.cpu ? 'CPU ROLLS...' : `${pl.name}: PRESS A TO ROLL`, 128, 180, '#fff', { align: 'center', outline: '#101848' }); }
      if (stage === 'mini') { drawWindow(60, 140, 136, 46); txt('QUICK DRAW!', 128, 146, '#ffe040', { align: 'center' }); txt(mini.t >= mini.go ? 'GO! PRESS A!' : 'WAIT FOR IT...', 128, 162, mini.t >= mini.go ? '#5ae060' : '#fff', { align: 'center' }); }
      if (msgT) txt(msg, 128, 192, '#5ff0ff', { align: 'center', outline: '#101848' });
      if (stage === 'end') { drawWindow(40, 40, 176, 120); txt('FINAL RESULTS', 128, 48, '#ffe040', { align: 'center', scale: 2 }); results.forEach((r, i) => txt(`${i + 1}. ${r.name} ${(HEROES[r.hero].short || HEROES[r.hero].name).slice(0, 8)}  *${r.stars}  ${r.coins}C`, 128, 76 + i * 14, i === 0 ? '#ffe040' : '#fff', { align: 'center' })); if (!results[0].cpu) txt('+15 COINS FOR THE WINNER!', 128, 140, '#5ff0ff', { align: 'center' }); }
    },
  };
}

// ---------------- the Arcade Corner: Brick Breaker and Snake ----------------
function ArcadeScene(start = 0) {
  let sel = start, t = 0; const hs = lsJ('wallyman-arcade', {});
  const items = [['BRICK BREAKER', () => BreakerScene()], ['SNAKE', () => SnakeScene()], ['BACK', null]];
  return {
    enter() { Audio8.play('neon'); },
    update() { t++; if (Input.pressed('down')) { sel = (sel + 1) % items.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + items.length - 1) % items.length; Audio8.sfx('select'); } if (Input.pressed('back') || (Input.confirm() && !items[sel][1])) { go(mgBack(14)); return; } if (Input.confirm()) { Audio8.sfx('confirm'); go(items[sel][1]); } },
    draw() {
      ctx.fillStyle = '#100820'; ctx.fillRect(0, 0, VW, VH); hR(48, 20, 160, 190, '#3a1a6a'); hR(56, 30, 144, 100, '#000'); for (let y = 30; y < 130; y += 3) hR(56, y, 144, 1, 'rgba(95,240,255,0.06)');
      txt('ARCADE', 128, 40, '#ff40c0', { align: 'center', scale: 2 }); txt('CORNER', 128, 60, '#5ff0ff', { align: 'center', scale: 2 });
      items.forEach(([n], i) => { const y = 92 + i * 12; txt(n, 128, y, i === sel ? '#ffe040' : '#fff', { align: 'center' }); });
      txt(`BEST: BRICKS ${hs.breaker | 0}   SNAKE ${hs.snake | 0}`, 128, 150, '#a8b0d8', { align: 'center' });
      for (let k = 0; k < 6; k++) hR(70 + k * 20, 180, 10, 10, ['#ff4040', '#ffe040', '#5ae060', '#5ff0ff', '#ff40c0', '#ffffff'][k]);
    },
  };
}
function arcadeBest(k, v) { const hs = lsJ('wallyman-arcade', {}); if (v > (hs[k] | 0)) { hs[k] = v; lsS('wallyman-arcade', hs); return true; } return false; }
function BreakerScene() {
  let px = 110, ball = null, bricks = [], lives = 3, score = 0, lvl = 1, t = 0, over = false, rec = false;
  const build = () => { bricks = []; for (let r = 0; r < 5 + Math.min(3, lvl - 1); r++) for (let c = 0; c < 10; c++) bricks.push({ x: 14 + c * 23, y: 30 + r * 10, hp: r < lvl - 1 ? 2 : 1, col: ['#ff4040', '#ffa040', '#ffe040', '#5ae060', '#5ff0ff', '#a070ff', '#ff40c0', '#ffffff'][r] }); };
  const serve = () => { ball = { x: px + 18, y: 190, vx: 1.6, vy: -2.4 - lvl * 0.3, stuck: true }; };
  build(); serve();
  return {
    enter() { Audio8.play('neon'); },
    update() {
      t++;
      if (over) { if (t > 60 && (Input.confirm() || Input.pressed('back'))) go(() => ArcadeScene(0)); return; }
      if (Input.pressed('back')) { go(() => ArcadeScene(0)); return; }
      if (Input.down('left')) px = Math.max(4, px - 4); if (Input.down('right')) px = Math.min(VW - 40, px + 4);
      if (ball.stuck) { ball.x = px + 18; if (Input.confirm()) { ball.stuck = false; Audio8.sfx('kick'); } return; }
      for (let k = 0; k < 3; k++) {
        ball.x += ball.vx / 3; ball.y += ball.vy / 3;
        if (ball.x < 4 || ball.x > VW - 4) { ball.vx = -ball.vx; ball.x = clamp(ball.x, 4, VW - 4); Audio8.sfx('bump'); }
        if (ball.y < 20) { ball.vy = Math.abs(ball.vy); Audio8.sfx('bump'); }
        if (ball.vy > 0 && ball.y >= 196 && ball.y <= 202 && ball.x >= px - 2 && ball.x <= px + 38) { ball.vy = -Math.abs(ball.vy); ball.vx = ((ball.x - (px + 18)) / 18) * 3; Audio8.sfx('kick'); }
        for (const b of bricks) if (b.hp > 0 && ball.x > b.x - 2 && ball.x < b.x + 23 && ball.y > b.y - 2 && ball.y < b.y + 10) { b.hp--; ball.vy = -ball.vy; score += 50; Audio8.sfx(b.hp ? 'bump' : 'brick'); break; }
      }
      if (ball.y > VH) { lives--; Audio8.sfx('hurt'); if (lives <= 0) { over = true; t = 0; rec = arcadeBest('breaker', score); if (score >= 3000) Ach.unlock('arcade'); payCoins(Math.floor(score / 600)); } else serve(); }
      if (!bricks.some((b) => b.hp > 0)) { lvl++; score += 500; build(); serve(); Audio8.sfx('oneup'); }
    },
    draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
      for (const b of bricks) if (b.hp > 0) { hR(b.x, b.y, 22, 9, b.hp > 1 ? '#c0c8d8' : b.col); hR(b.x, b.y, 22, 2, 'rgba(255,255,255,0.4)'); }
      hR(px, 198, 40, 6, '#5ff0ff'); hR(px + 2, 198, 36, 2, '#ffffff'); hR(ball.x - 2, ball.y - 2, 5, 5, '#ffffff');
      txt(`SCORE ${score}`, 8, 6, '#ffe040'); txt(`LEVEL ${lvl}`, 128, 6, '#fff', { align: 'center' }); txt(`BALLS ${lives}`, 248, 6, '#ff8080', { align: 'right' });
      if (ball.stuck && !over) txt('A: LAUNCH   < >: MOVE', 128, 150, '#fff', { align: 'center' });
      if (over) { drawWindow(56, 80, 144, 60); txt('GAME OVER', 128, 88, '#ffe040', { align: 'center', scale: 2 }); txt(`SCORE ${score}`, 128, 112, '#fff', { align: 'center' }); if (rec) txt('NEW HIGH SCORE!', 128, 124, '#5ff0ff', { align: 'center' }); }
    },
  };
}
function SnakeScene() {
  const C = 12, GW = 20, GH = 15, OX = 8, OY = 30;
  let snake = [[10, 7], [9, 7], [8, 7]], dir = [1, 0], nd = [1, 0], food = [15, 7], t = 0, step = 0, over = false, score = 0, rec = false;
  const place = () => { do food = [Math.floor(Math.random() * GW), Math.floor(Math.random() * GH)]; while (snake.some((s) => s[0] === food[0] && s[1] === food[1])); };
  return {
    enter() { Audio8.play('neon'); },
    update() {
      t++;
      if (over) { if (t > 60 && (Input.confirm() || Input.pressed('back'))) go(() => ArcadeScene(1)); return; }
      if (Input.pressed('back')) { go(() => ArcadeScene(1)); return; }
      if (Input.pressed('up') && dir[1] === 0) nd = [0, -1]; if (Input.pressed('down') && dir[1] === 0) nd = [0, 1]; if (Input.pressed('left') && dir[0] === 0) nd = [-1, 0]; if (Input.pressed('right') && dir[0] === 0) nd = [1, 0];
      if (++step < Math.max(4, 9 - Math.floor(snake.length / 5))) return; step = 0; dir = nd;
      const h = [snake[0][0] + dir[0], snake[0][1] + dir[1]];
      if (h[0] < 0 || h[1] < 0 || h[0] >= GW || h[1] >= GH || snake.some((s) => s[0] === h[0] && s[1] === h[1])) { over = true; t = 0; Audio8.sfx('hurt'); rec = arcadeBest('snake', score); payCoins(Math.floor(score / 50)); return; }
      snake.unshift(h); if (h[0] === food[0] && h[1] === food[1]) { score += 10; Audio8.sfx('coin'); place(); if (snake.length >= 20) Ach.unlock('snake'); } else snake.pop();
    },
    draw() {
      ctx.fillStyle = '#081808'; ctx.fillRect(0, 0, VW, VH); hR(OX - 2, OY - 2, GW * C + 4, GH * C + 4, '#2a6a2a'); hR(OX, OY, GW * C, GH * C, '#0a200a');
      ctx.drawImage(Sprites.coinIcon, OX + food[0] * C + 2, OY + food[1] * C + 2);
      snake.forEach(([x, y], i) => { hR(OX + x * C + 1, OY + y * C + 1, C - 2, C - 2, i === 0 ? '#9aff6a' : i % 2 ? '#3ac040' : '#4ad050'); if (i === 0) { hR(OX + x * C + 3, OY + y * C + 3, 2, 2, '#1a1020'); hR(OX + x * C + 7, OY + y * C + 3, 2, 2, '#1a1020'); } });
      txt(`SNAKE   SCORE ${score}   LENGTH ${snake.length}`, 128, 10, '#9aff6a', { align: 'center' });
      if (over) { drawWindow(56, 80, 144, 60); txt('GAME OVER', 128, 88, '#ffe040', { align: 'center', scale: 2 }); txt(`SCORE ${score}`, 128, 112, '#fff', { align: 'center' }); if (rec) txt('NEW HIGH SCORE!', 128, 124, '#5ff0ff', { align: 'center' }); }
    },
  };
}

// ---------------- Air Hockey ----------------
function HockeyScene() {
  const L = 40, R = 216, T = 16, B = 208, GW = 70, MID = 128;
  let stage = 'pick', two = false, t = 0, me = { x: 128, y: 180, vx: 0, vy: 0 }, op = { x: 128, y: 44, vx: 0, vy: 0 }, puck = { x: 128, y: 112, vx: 0, vy: 0 }, sMe = 0, sOp = 0, pause = 0, won = false;
  const reset = (toward) => { puck = { x: 128, y: 112, vx: 0, vy: toward * 0.6 }; pause = 40; };
  const hit = (m) => { const dx = puck.x - m.x, dy = puck.y - m.y, d = Math.hypot(dx, dy); if (d < 16 && d > 0) { const nx = dx / d, ny = dy / d; puck.x = m.x + nx * 16; puck.y = m.y + ny * 16; const rel = (puck.vx - m.vx) * nx + (puck.vy - m.vy) * ny; if (rel < 0) { puck.vx -= 1.9 * rel * nx; puck.vy -= 1.9 * rel * ny; } puck.vx += m.vx * 0.4; puck.vy += m.vy * 0.4; Audio8.sfx('kick'); } };
  return {
    enter() { Audio8.play('carnival'); },
    update() {
      t++;
      if (stage === 'pick') { if (Input.pressed('left') || Input.pressed('right')) { two = !two; Audio8.sfx('select'); } if (Input.pressed('back')) { go(mgBack(15)); return; } if (Input.confirm() && t > 10) { stage = 'play'; reset(1); Audio8.sfx('confirm'); } return; }
      if (stage === 'end') { if (t > 60 && (Input.confirm() || Input.pressed('back'))) go(mgBack(15)); return; }
      if (Input.pressed('back')) { go(mgBack(15)); return; }
      const move = (m, up, down, left, right, minY, maxY, sp) => { const ox = m.x, oy = m.y; m.x = clamp(m.x + ((right ? 1 : 0) - (left ? 1 : 0)) * sp, L + 10, R - 10); m.y = clamp(m.y + ((down ? 1 : 0) - (up ? 1 : 0)) * sp, minY, maxY); m.vx = m.x - ox; m.vy = m.y - oy; };
      move(me, Input.down('up'), Input.down('down'), Input.down('left'), Input.down('right'), MID + 10, B - 10, 3.2);
      if (two) { Input2.poll(); move(op, Input2.down('up'), Input2.down('down'), Input2.down('left'), Input2.down('right'), T + 10, MID - 10, 3.2); }
      else { const tx = puck.y < MID ? puck.x : 128, ty = puck.y < MID ? Math.max(T + 12, puck.y - 12) : 44, sp = 2.2; move(op, op.y > ty + 2, op.y < ty - 2, op.x > tx + 2, op.x < tx - 2, T + 10, MID - 10, sp); }
      if (pause) { pause--; return; }
      for (let k = 0; k < 3; k++) {
        puck.x += puck.vx / 3; puck.y += puck.vy / 3;
        if (puck.x < L + 6 || puck.x > R - 6) { puck.vx = -puck.vx * 0.9; puck.x = clamp(puck.x, L + 6, R - 6); Audio8.sfx('bump'); }
        const inGoal = Math.abs(puck.x - 128) < GW / 2;
        if (puck.y < T + 6 && !inGoal) { puck.vy = Math.abs(puck.vy) * 0.9; Audio8.sfx('bump'); } if (puck.y > B - 6 && !inGoal) { puck.vy = -Math.abs(puck.vy) * 0.9; Audio8.sfx('bump'); }
        hit(me); hit(op);
      }
      puck.vx *= 0.995; puck.vy *= 0.995; const sp = Math.hypot(puck.vx, puck.vy); if (sp > 8) { puck.vx *= 8 / sp; puck.vy *= 8 / sp; }
      if (puck.y < T - 4) { sMe++; Audio8.sfx('oneup'); reset(-1); } else if (puck.y > B + 4) { sOp++; Audio8.sfx('hurt'); reset(1); }
      if (sMe >= 5 || sOp >= 5) { stage = 'end'; t = 0; won = sMe >= 5; if (won && !two) { Ach.unlock('hockey'); payCoins(10); } Audio8.play(won ? 'victory' : 'gameover'); }
    },
    draw() {
      ctx.fillStyle = '#1a1030'; ctx.fillRect(0, 0, VW, VH); hR(L - 4, T - 4, R - L + 8, B - T + 8, '#ff40c0'); hR(L, T, R - L, B - T, '#e8f4ff'); hR(L, MID - 1, R - L, 2, '#ff8080'); ctx.strokeStyle = '#8ab0e0'; ctx.beginPath(); ctx.arc(128, MID, 22, 0, Math.PI * 2); ctx.stroke();
      hR(128 - GW / 2, T - 4, GW, 4, '#1a1020'); hR(128 - GW / 2, B, GW, 4, '#1a1020');
      if (stage === 'pick') { drawWindow(48, 70, 160, 70); txt('AIR HOCKEY', 128, 78, '#ffe040', { align: 'center', scale: 2 }); txt(`< ${two ? '2 PLAYERS' : 'VS DINO'} >`, 128, 104, '#1a1020', { align: 'center', shadow: null }); txt(two ? 'P2: W A S D' : 'FIRST TO 5 GOALS', 128, 120, '#5a4a6a', { align: 'center', shadow: null }); return; }
      ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(puck.x, puck.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#3a3a5a'; ctx.beginPath(); ctx.arc(puck.x, puck.y, 5, 0, Math.PI * 2); ctx.fill();
      for (const [m, c] of [[me, '#3a7af0'], [op, two ? '#e03040' : '#30b0a0']]) { ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(m.x, m.y, 11, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(m.x, m.y, 9.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(m.x - 2, m.y - 2, 3, 0, Math.PI * 2); ctx.fill(); }
      if (!two) ctx.drawImage(Sprites.dino.r[(t >> 4) & 1], 222, 10);
      txt(String(sOp), 20, 60, '#ff8080', { align: 'center', scale: 2 }); txt(String(sMe), 20, 150, '#5ff0ff', { align: 'center', scale: 2 }); txt(two ? 'P2' : 'DINO', 20, 44, '#fff', { align: 'center' }); txt(two ? 'P1' : 'YOU', 20, 172, '#fff', { align: 'center' });
      if (stage === 'end') { drawWindow(56, 80, 144, 50); txt(won ? (two ? 'P1 WINS!' : 'YOU WIN!') : (two ? 'P2 WINS!' : 'DINO WINS!'), 128, 92, '#ffe040', { align: 'center', scale: 2 }); }
    },
  };
}
