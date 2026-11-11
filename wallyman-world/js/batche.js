'use strict';
// =====================================================================
// Batch E: Carnival Isle mechanics (Ferris wheels, coasters, mirror
// zones, minecart, jet), new enemies, the Ringmaster, grappling hook,
// keys, pets, upgrades, Dino's house, mini-games, missions, stats,
// New Game+, Endless Run, comics, Star Isle weather and art.
// =====================================================================
(() => {
  const F = Sprites.fromRows;
  Sprites.slime = F(['................', '................', '................', '.....KKKKKK.....', '...KKggggggKK...', '..KgggwggggggK..', '.KggwwggggwgggK.', '.KgKwKggggKwKgK.', 'KggKKggggggKKggK', 'KggggggKKggggggK', 'KgggggggggggggGK', '.KKKKKKKKKKKKKK.'], { K: '#1a1020', g: '#ff70d0', G: '#c040a0', w: '#ffffff' });
  Sprites.slimeS = F(['..........', '...KKKK...', '.KKggggKK.', 'KgwKggwKgK', 'KgKKggKKgK', 'KggggggggK', '.KKKKKKKK.'], { K: '#1a1020', g: '#ff70d0', w: '#ffffff' });
  Sprites.boomer = [0, 1].map((f) => F(['....KKKKKK......', '...KyyyyyyK.....', '..KyKKyyyyyK....', '..KywKyyyyyK....', '..KyyyyyKKKK....', '...KKyyyK.......', '..KbbKKKbbK.....', '.KbbbbbbbbbK....', '.KbKbbbbbKbK....', '.KK.KbbbK.KK....', '...KbbbbbK......', f ? '..KbK..KbK......' : '...KbKKbK.......', f ? '..KKK..KKK......' : '...KKKKKK.......'], { K: '#1a1020', y: '#ffcc60', w: '#ffffff', b: '#30a060' }));
  Sprites.magdrone = [0, 1].map((f) => F([f ? '.KKKKKKKKKKKK...' : '...KKKKKKKK.....', '.......KK.......', '...KKKKKKKKKK...', '..KRRRRKKBBBBK..', '..KRRRK..KBBBK..', '..KRRK....KBBK..', '..KRRK....KBBK..', '..KwwK....KwwK..', '..KKKK....KKKK..'], { K: '#1a1020', R: '#e83030', B: '#2f62d0', w: '#e0e0e8' }));
  Sprites.asteroid = F(['....KKKKK.....', '..KKgggggKK...', '.KggGgggggGK..', '.KgGGgggKggK..', 'KgggggggKKggK.', 'KggKKggggggggK', 'KggKKggGGggggK', 'KgggggggGGgggK', '.KggggggggggK.', '.KgGgggKKggK..', '..KKggggggK...', '....KKKKKK....'], { K: '#1a1020', g: '#8a7a6a', G: '#5a4a40' });
  Sprites.hook = F(['................', '..........KKK...', '.........KwwwK..', '..........KwK...', '..........KwK...', '..KK......KwK...', '.KwwK.....KwK...', '.KwK......KwK...', '.KwK.....KwwK...', '.KwwKKKKKwwK....', '..KwwwwwwwK.....', '...KKKKKKK......', '....KrrK........', '...KrrrrK.......', '....KrrK........', '................'], { K: '#1a1020', w: '#c0c8d8', r: '#e83030' });
  Sprites.mapkey = F(['....KKKK........', '...KYYYYK.......', '..KYYKKYYK......', '..KYK..KYK......', '..KYYKKYYK......', '...KYYYYK.......', '....KYYK........', '....KYYK........', '....KYYKKK......', '....KYYYYK......', '....KYYKKK......', '....KYYYK.......', '....KYYKK.......', '.....KK.........'], { K: '#7a4a10', Y: '#ffd040' });
  const PETS = {
    wally: { name: 'PUP', rows: ['..KK....KK..', '.KbbK..KbbK.', '.KbbKKKKbbK.', '..KwwwwwwK..', '.KwKwwwwKwK.', '.KwwwwwwwwK.', '..KwwnnwwK..', '...KKKKKK...', '..KwK..KwK..', '..KK....KK..'], pal: { K: '#1a1020', b: '#8a5a2a', w: '#f0e0c8', n: '#1a1020' }, fly: false },
    goth: { name: 'BAT', rows: ['K..........K', 'KK...KK...KK', 'KpK.KppK.KpK', 'KppKppppKppK', '.KppprrpppK.', '..KppppppK..', '...KK..KK...'], pal: { K: '#1a1020', p: '#6a3a9a', r: '#ff4060' }, fly: true },
    doug: { name: 'CAT', rows: ['.K......K...', '.KK....KK...', '.KoKKKKoK...', '.KooooooK...', 'KoKoooKooK..', 'KooopoooK.K.', '.KooooooK.oK', '..KooooooKoK', '..KoK.KoKK..', '..KK..KK....'], pal: { K: '#1a1020', o: '#f0a040', p: '#ff80a0' }, fly: false },
    robo: { name: 'DRONE', rows: ['.KKKK..KKKK.', '....KKKK....', '...KssssK...', '..KsRssRsK..', '..KssssssK..', '...KKKKKK...', '....K..K....'], pal: { K: '#1a1020', s: '#c0c8d8', R: '#ff3040' }, fly: true },
    frost: { name: 'PENGUIN', rows: ['...KKKK...', '..KkkkkK..', '.KkwwwwkK.', '.KkwKwKkK.', '.KkwwYwkK.', 'KkwwwwwwkK', 'KkwwwwwwkK', '.KkwwwwkK.', '..KYKKYK..'], pal: { K: '#1a1020', k: '#2a3a5a', w: '#ffffff', Y: '#ffb020' }, fly: false },
  };
  for (const k of Object.keys(PETS)) { const img = F(PETS[k].rows, PETS[k].pal); PETS[k].img = [img, Sprites.flip(img)]; }
  window.PETS = PETS;
})();

// ---------- trophies, stickers and talk for the new content ----------
ACH_LIST.push(['carnival', 'SHOWSTOPPER', 'BEAT THE RINGMASTER'], ['missions', 'MISSION COMPLETE', 'ALL 3 MISSIONS IN A LEVEL'], ['endless', 'MARATHON', 'RUN 500M IN ENDLESS RUN'], ['keys', 'KEY MASTER', 'FIND ALL 3 SECRET KEYS'], ['jackpot', 'JACKPOT', 'HIT 3 STARS ON THE SLOTS']);
STICKERS.push(['slime', 'SPLITTER SLIME', 'e'], ['mimic', 'MIMIC BLOCK', 'e'], ['boomer', 'BOOMERANG BRO', 'e'], ['magdrone', 'MAGNET DRONE', 'e'], ['asteroid', 'ASTEROID', 'e'], ['ringmaster', 'RINGMASTER', 'b']);
BOSS_TALK.ringmaster = [['boss', 'LADIES AND GENTLE-HEROES! WELCOME TO THE GREATEST SHOW ON THE ISLES!'], ['boss', 'TONIGHT I MAKE EVERY SIGNAL BAR... DISAPPEAR!'], ['hero', 'SORRY, RINGMASTER. THIS SHOW IS CANCELLED!']];
BOSS_ART.ringmaster = 'ringmaster'; BOSS_NAMES.ringmaster = 'RINGMASTER';
LEVELS[11].weather = 'ash'; LEVELS[14].weather = 'meteors';
function drawRingmaster(x, y, t, e) {
  const blink = e && e.inv > 0 && (frame >> 2) & 1; if (blink) return;
  const R = (X, Y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + X), Math.round(y + Y), w, h); };
  R(4, -8, 12, 2, '#1a1020'); R(6, -18, 8, 10, '#1a1020'); R(7, -17, 6, 8, '#2a2a3a'); R(6, -11, 8, 2, '#e83050');
  R(5, -6, 10, 9, '#1a1020'); R(6, -5, 8, 7, '#f2c09a'); R(7, -3, 2, 2, '#1a1020'); R(11, -3, 2, 2, '#1a1020'); R(7, 0, 6, 1, '#8a2020'); R(5, 1, 3, 1, '#2a1a10'); R(12, 1, 3, 1, '#2a1a10');
  R(2, 3, 16, 14, '#1a1020'); R(3, 4, 14, 12, '#d02040'); R(9, 4, 2, 12, '#ffd040'); R(4, 6, 2, 2, '#ffd040'); R(14, 6, 2, 2, '#ffd040');
  R(4, 16, 12, 10, '#1a1020'); R(5, 16, 4, 9, '#f8f8f8'); R(11, 16, 4, 9, '#f8f8f8'); R(4, 25, 5, 3, '#1a1020'); R(11, 25, 5, 3, '#1a1020');
  const whip = e && e.state === 'whip' && e.act < 30;
  if (whip) { const d = e.face || 1; for (let k = 0; k < 18; k++) R(10 + d * (8 + k * 1.6), 8 + Math.sin(k * 0.5 + t * 0.6) * 3, 2, 2, k % 3 ? '#6a3a1a' : '#a06a3a'); }
  else { R(-2, 8, 6, 2, '#6a3a1a'); R(-4, 10, 2, 8, '#6a3a1a'); }
}
{
  const _sa = stickerArt;
  stickerArt = function (id, x, y, t) { // eslint-disable-line no-func-assign
    const D = (img) => ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2));
    if (id === 'slime') return D(Sprites.slime);
    if (id === 'mimic') { ctx.drawImage(Sprites.tiles.grass.bonus[0], x - 8, y - 8); ctx.fillStyle = '#ffffff'; for (let k = 0; k < 4; k++) ctx.fillRect(x - 7 + k * 4, y + 2, 2, 3); ctx.fillStyle = '#e83030'; ctx.fillRect(x - 5, y - 4, 2, 2); ctx.fillRect(x + 3, y - 4, 2, 2); return; }
    if (id === 'boomer') return D(Sprites.boomer[0]);
    if (id === 'magdrone') return D(Sprites.magdrone[0]);
    if (id === 'asteroid') return D(Sprites.asteroid);
    if (id === 'ringmaster') { ctx.save(); ctx.translate(x, y); ctx.scale(0.7, 0.7); drawRingmaster(-10, -6, t, null); ctx.restore(); return; }
    return _sa(id, x, y, t);
  };
}

// ---------- spawning ----------
{
  const _sp = Play.prototype.spawn;
  Play.prototype.spawn = function (sp) {
    const x = sp.x * TS, y = sp.y * TS, toward = this.p.x < x ? -1 : 1, spd = DIFF[this.diff].speed * (this.speedMul || 1);
    const E = (o) => { const e = Object.assign({ t: 0, alive: true, vx: 0, vy: 0, enemy: false }, o); this.ents.push(e); return e; };
    switch (sp.t) {
      case '1': E({ type: 'mimic', x: x + 1, y: y + 1, w: 14, h: 15, state: 'sleep', stomp: true, wait: 30 }); return;
      case '2': E({ type: 'boomer', x: x + 1, y: y + 2, w: 14, h: 14, vx: 0.35 * toward * spd, enemy: true, stomp: true, cool: 90 }); return;
      case '3': E({ type: 'magdrone', x, y: Math.max(24, y - 40), ox: x, oy: Math.max(24, y - 40), w: 16, h: 10, enemy: true, stomp: true }); return;
      case '4': E({ type: 'slime', x, y: y + 4, w: 16, h: 12, enemy: true, stomp: true, wait: 50 }); return;
      case '5': { const e = E({ type: 'ferris', x: x + 8, y: y + 8, cx: x + 8, cy: y + 8, w: 1, h: 1, R: 58, a: 0, pls: [] }); for (let k = 0; k < 4; k++) { const pl = { x: 0, y: 0, w: 48, h: 8, ox: 0, oy: 0, axis: 'none', t: 0, dx: 0, dy: 0, gondola: k }; e.pls.push(pl); this.platforms.push(pl); } this.ferrisPos(e); for (const pl of e.pls) { pl.x = pl.ox; pl.y = pl.oy; } return; }
      case '6': { const k = (this._coasterN = (this._coasterN || 0) + 1) - 1, path = ((this.def.coasters || [])[k] || [[sp.x, sp.y], [sp.x + 10, sp.y]]).map(([a, b]) => [a * TS - 12, b * TS + 4]); const pl = { x: path[0][0], y: path[0][1], w: 40, h: 8, ox: path[0][0], oy: path[0][1], axis: 'none', t: 0, dx: 0, dy: 0, coaster: true }; this.platforms.push(pl); E({ type: 'coaster', x: path[0][0], y: path[0][1], w: 40, h: 8, path, seg: 0, u: 0, state: 'wait', pl }); return; }
      case '7': E({ type: 'asteroid', x, y, w: 14, h: 12, vx: -0.35 - ((sp.x * 7) % 5) * 0.08, vy: ((sp.y * 3) % 5 - 2) * 0.08, enemy: true, stomp: false, spin: 0 }); return;
      case '&': if (!(game.keys && game.keys[(this.def.key || {}).n])) E({ type: 'mapkey', item: true, x: x + 2, y: y + 1, w: 12, h: 14, rise: 0, n: (this.def.key || {}).n || 0 }); return;
      case 'r': { const hp = (this.def.bossHp || 6) + (this.diff === 'hard' ? 1 : this.diff === 'easy' ? -1 : 0) + (game.plus && !this.rush ? 2 * game.plus : 0); E({ type: 'ringmaster', boss: true, enemy: true, x, y: y - 14, w: 20, h: 30, hp, maxHp: hp, inv: 0, state: 'idle', act: 90, face: -1 }); return; }
      default: {
        const n = this.ents.length;
        _sp.call(this, sp);
        if (game.plus && !this.rush && this.ents.length > n) { const e = this.ents[this.ents.length - 1]; if ((e.boss || e.yeti) && e.hp) { e.hp += 2 * game.plus; e.maxHp = (e.maxHp || e.hp) + 2 * game.plus; } }
      }
    }
  };
  Play.prototype.ferrisPos = function (e) { e.pls.forEach((pl, k) => { const a = e.a + (k * Math.PI) / 2; pl.ox = e.cx + Math.cos(a) * e.R - 24; pl.oy = e.cy + Math.sin(a) * e.R + 4; }); };
}

// ---------- entity behaviour ----------
{
  const _ue = Play.prototype.updateEnt;
  Play.prototype.updateEnt = function (e) {
    const p = this.p, frozen = this.freezeT > 0, live = !e.dying && !e.iced && !frozen && !this._p2ctx;
    switch (e.type) {
      case 'ferris': if (!this._p2ctx) { e.a += 0.0075; this.ferrisPos(e); } return;
      case 'coaster': {
        if (this._p2ctx) return;
        const pl = e.pl;
        if (e.state === 'wait' && p.platform === pl) { e.state = 'ride'; Audio8.sfx('spring'); }
        if (e.state === 'ride') {
          let left = 2.3;
          while (left > 0 && e.seg < e.path.length - 1) {
            const [ax, ay] = e.path[e.seg], [bx, by] = e.path[e.seg + 1], L = Math.hypot(bx - ax, by - ay), rem = (1 - e.u) * L;
            if (left >= rem) { left -= rem; e.seg++; e.u = 0; } else { e.u += left / L; left = 0; }
          }
          if (e.seg >= e.path.length - 1) { e.state = 'end'; e.endT = 200; }
        } else if (e.state === 'end' && --e.endT <= 0 && p.platform !== pl) { e.state = 'wait'; e.seg = 0; e.u = 0; }
        const s = Math.min(e.seg, e.path.length - 2), [ax, ay] = e.path[s], [bx, by] = e.path[s + 1], u = e.seg >= e.path.length - 1 ? 1 : e.u;
        pl.ox = ax + (bx - ax) * u; pl.oy = ay + (by - ay) * u; e.x = pl.ox; e.y = pl.oy;
        return;
      }
      case 'mapkey': if (this.state === 'play' && overlap(p, e)) {
        e.alive = false; game.keys = game.keys || {}; game.keys[e.n] = true; Save.persist(); Audio8.sfx('oneup'); rumble(0.4, 200);
        this.parts.push({ k: 'text', s: 'SECRET KEY FOUND!', x: e.x - 40, y: e.y - 16, vy: -0.3, life: 120 });
        this.parts.push({ k: 'text', s: 'A DOOR OPENED ON THE MAP', x: e.x - 60, y: e.y - 4, vy: -0.3, life: 120 });
        if ([0, 1, 2].every((n) => game.keys[n])) Ach.unlock('keys');
      } return;
      case 'hook':
        if (e.rise > 0) { e.y -= 0.5; e.rise -= 0.5; return; }
        if (this.state === 'play' && overlap(p, e)) { e.alive = false; p.grapple = true; Audio8.sfx('power'); this.parts.push({ k: 'text', s: 'GRAPPLING HOOK!', x: e.x - 30, y: e.y - 8, vy: -0.5, life: 70 }); this.parts.push({ k: 'text', s: 'JUMP NEAR A RING', x: e.x - 32, y: e.y + 4, vy: -0.5, life: 70 }); }
        return;
      case 'mimic':
        if (live) {
          if (e.state === 'sleep') { if (Math.abs(p.x - e.x) < 44 && Math.abs(p.y - e.y) < 60) { e.state = 'awake'; e.enemy = true; Audio8.sfx('chomp'); this.parts.push({ k: 'text', s: 'MIMIC!', x: e.x - 8, y: e.y - 12, vy: -0.5, life: 40 }); } return; }
          e.vy = Math.min(5, e.vy + 0.3);
          if (e.onGround) { e.vx = 0; if (--e.wait <= 0) { e.vy = -4.6; e.vx = (p.x < e.x ? -1 : 1) * 1.2; e.wait = 45; Audio8.sfx('chomp'); } }
          this.move(e, true);
        }
        break;
      case 'boomer':
        if (live) {
          e.vy = Math.min(5, e.vy + 0.3);
          if (e.onGround && !this.groundAhead(e)) e.vx = -e.vx;
          this.move(e, true);
          if (e.hitWall) e.vx = -e.hitWall * Math.abs(e.vx);
          e.face = p.x < e.x ? -1 : 1;
          if (--e.cool <= 0 && Math.abs(p.x - e.x) < 170 && this.state === 'play') { e.cool = 150; this.ents.push({ type: 'boomerang', alive: true, t: 0, x: e.x, y: e.y + 2, w: 10, h: 8, vx: e.face * 3.2, vy: 0, d: e.face, owner: e, hazard: true, enemy: false }); Audio8.sfx('swoop'); }
        }
        break;
      case 'boomerang':
        if (!frozen) { e.t++; e.vx -= e.d * 0.07; e.x += e.vx; e.y += Math.sin(e.t * 0.1) * 0.6; if (e.t > 40 && e.owner && overlap(e, e.owner)) e.alive = false; if (e.t > 260) e.alive = false; }
        break;
      case 'magdrone':
        if (live) {
          e.t++; e.x += clamp(p.x - e.x, -0.5, 0.5); e.x = clamp(e.x, e.ox - 90, e.ox + 90); e.y = e.oy + Math.sin(e.t * 0.05) * 6;
          const dx = e.x + 8 - (p.x + p.w / 2);
          if (Math.abs(dx) < 110 && this.state === 'play' && !p.riding && !p.swing) { const ox = p.x; p.x += Math.sign(dx) * 0.55; if (this.solidOverlap(p)) p.x = ox; }
        }
        break;
      case 'slime':
        if (live) {
          e.vy = Math.min(5, e.vy + 0.3);
          if (e.onGround) { e.vx = 0; if (--e.wait <= 0) { e.vy = e.small ? -3.6 : -3; e.vx = (p.x < e.x ? -1 : 1) * (e.small ? 1.3 : 0.8) * DIFF[this.diff].speed; e.wait = e.small ? 30 : 60; } }
          this.move(e, true);
          if (e.hitWall) e.vx = -e.vx;
        }
        break;
      case 'asteroid':
        if (live) { e.x += e.vx; e.y += e.vy; e.spin += 0.05; if (e.y < 16 || e.y > VH - 30) e.vy = -e.vy; }
        break;
      case 'meteor':
        if (!frozen) {
          e.t++;
          if (e.t > 50) { e.y += 4.5; e.x += e.vx; }
          const ty = Math.floor((e.y + 8) / TS), tx = Math.floor((e.x + 4) / TS);
          if (SOLID.has(this.tile(tx, ty)) || e.y > VH) {
            e.alive = false; Audio8.sfx('boom'); this.shake = Math.max(this.shake, 8); this.parts.push({ k: 'blast', x: e.x + 4, y: e.y + 6, life: 20 });
            if (this.state === 'play' && Math.hypot(p.x + p.w / 2 - e.x - 4, p.y + p.h - e.y - 8) < 22) this.hurt();
          }
        }
        return;
      case 'jball':
        if (!frozen) { e.vy = Math.min(5, e.vy + 0.25); this.move(e, true); if (e.onGround) e.vy = -4.2; if (e.hitWall) e.vx = -e.vx; if (++e.t > 300) e.alive = false; }
        break;
      case 'ringmaster': this.updateRingmaster(e); return;
      default:
    }
    return _ue.call(this, e);
  };
  Play.prototype.updateRingmaster = function (e) {
    const p = this.p;
    if (e.inv > 0) e.inv--;
    if (!this.bossLock || e.dying) return;
    if (this.freezeT > 0) { if (this.state === 'play' && overlap(p, e) && p.vy > 0 && p.prevBottom <= e.y + 10) { p.vy = -6.5; this.damageBoss(e); } return; }
    e.t++; e.act--;
    const rage = e.maxHp - e.hp, minX = this.camMin + 16, maxX = this.camMin + VW - 36;
    e.vy = Math.min(6, e.vy + 0.3);
    if (e.state === 'idle') { e.vx = 0; e.face = p.x < e.x ? -1 : 1; if (e.act <= 0) { const r = (e.t >> 3) % 3; e.state = Math.abs(p.x - e.x) < 50 ? 'whip' : ['juggle', 'leap', 'juggle'][r]; e.act = e.state === 'whip' ? 50 : e.state === 'juggle' ? 60 : 40; if (e.state === 'leap') { e.vy = -6.2; e.vx = clamp((p.x - e.x) / 40, -2.6, 2.6); Audio8.sfx('jump'); } } }
    else if (e.state === 'juggle') { if (e.act % 18 === 0 && e.act > 0) { this.ents.push({ type: 'jball', alive: true, t: 0, x: e.x + 6, y: e.y - 4, w: 8, h: 8, vx: e.face * (1.2 + (e.act % 3) * 0.6 + rage * 0.15), vy: -4, hazard: true, col: ['#ff4060', '#ffe040', '#40c0ff'][(e.act / 18) % 3] }); Audio8.sfx('swoop'); } if (e.act <= 0) { e.state = 'idle'; e.act = 70 - rage * 6; } }
    else if (e.state === 'leap') { if (e.onGround && e.act < 30) { e.state = 'idle'; e.act = 60 - rage * 5; e.vx = 0; this.shake = 8; Audio8.sfx('thunder'); if (rage >= 3) for (const d of [-1, 1]) this.ents.push({ type: 'slime', alive: true, t: 0, x: e.x + 2, y: e.y + 12, w: 10, h: 8, small: true, vx: d, vy: -3, enemy: true, stomp: true, wait: 20 }); } }
    else if (e.state === 'whip') { if (e.act === 30) Audio8.sfx('zap'); if (e.act < 30 && e.act > 18 && this.state === 'play') { const hb = { x: e.face > 0 ? e.x + 18 : e.x - 34, y: e.y + 4, w: 36, h: 10 }; if (overlap(p, hb)) this.hurt(); } if (e.act <= 0) { e.state = 'idle'; e.act = 50; } }
    this.move(e, false);
    e.x = clamp(e.x, minX, maxX);
    if (this.state === 'play' && overlap(p, e)) {
      if (p.charge > 0 || (p.vy > 0 && p.prevBottom <= e.y + 10 && e.state !== 'whip')) { p.vy = Input.down('jump') ? -7 : -5.5; this.damageBoss(e); } else this.hurt();
    }
  };
  const _db = Play.prototype.damageBoss;
  Play.prototype.damageBoss = function (e) {
    _db.call(this, e);
    if (e.type === 'ringmaster' && !e.alive) { Sticker.add('ringmaster'); Ach.unlock('carnival'); this.ents.forEach((k) => { if (k.type === 'jball') k.alive = false; }); }
  };
  const _st = Play.prototype.stomp;
  Play.prototype.stomp = function (e) {
    if (e.type === 'slime' && !e.small) {
      const p = this.p; p.vy = Input.down('jump') ? -6.2 : -3.8; p.y = e.y - p.h - 0.1; Audio8.sfx('stomp'); this.addScore(100, e.x, e.y - 8); this.countKill(e);
      e.alive = false; Sticker.add('slime');
      for (const d of [-1, 1]) this.ents.push({ type: 'slime', alive: true, t: 0, x: e.x + 3 + d * 4, y: e.y + 2, w: 10, h: 8, small: true, vx: d * 1.4, vy: -3.2, enemy: true, stomp: true, wait: 25 });
      return;
    }
    if (e.type === 'mimic' && e.state === 'sleep') return;
    return _st.call(this, e);
  };
  const _de = Play.prototype.drawEnt;
  Play.prototype.drawEnt = function (e, cx) {
    const x = Math.round(e.x - cx), y = Math.round(e.y), flipY = e.dying === 'flip';
    const put = (img, dx = 0, dy = 0) => { if (flipY) { ctx.save(); ctx.translate(x + dx + img.width / 2, y + dy + img.height / 2); ctx.scale(1, -1); ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.restore(); } else ctx.drawImage(img, x + dx, y + dy); };
    switch (e.type) {
      case 'ferris': {
        ctx.strokeStyle = '#5a2a7a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.cx - cx, e.cy, e.R, 0, Math.PI * 2); ctx.stroke();
        e.pls.forEach((pl, k) => { const a = e.a + (k * Math.PI) / 2; ctx.beginPath(); ctx.moveTo(e.cx - cx, e.cy); ctx.lineTo(e.cx - cx + Math.cos(a) * e.R, e.cy + Math.sin(a) * e.R); ctx.stroke(); });
        ctx.fillStyle = '#5a2a7a'; for (let k = 0; k < 40; k++) { ctx.fillRect(e.cx - cx - 2 - k * 0.5, e.cy + k * 1.5, 2, 2); ctx.fillRect(e.cx - cx + k * 0.5, e.cy + k * 1.5, 2, 2); }
        ctx.fillStyle = '#ffd040'; ctx.fillRect(e.cx - cx - 3, e.cy - 3, 6, 6);
        for (let k = 0; k < 12; k++) { const a = e.a * 2 + (k / 12) * Math.PI * 2; ctx.fillStyle = (k + (frame >> 3)) % 3 ? '#ff60a0' : '#ffffff'; ctx.fillRect(Math.round(e.cx - cx + Math.cos(a) * e.R) - 1, Math.round(e.cy + Math.sin(a) * e.R) - 1, 3, 3); }
        return;
      }
      case 'coaster': { ctx.fillStyle = '#6a4a8a'; for (let s = 0; s < e.path.length - 1; s++) { const [ax, ay] = e.path[s], [bx, by] = e.path[s + 1], L = Math.hypot(bx - ax, by - ay); for (let d = 0; d < L; d += 3) ctx.fillRect(Math.round(ax + 20 + ((bx - ax) * d) / L - cx), Math.round(ay + 8 + ((by - ay) * d) / L), 2, 2); } return; }
      case 'mapkey': ctx.drawImage(Sprites.mapkey, x - 2, y - 1 + Math.round(Math.sin(frame * 0.1) * 2)); if ((frame >> 3) % 4 === 0) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 10, y, 1, 3); ctx.fillRect(x + 9, y + 1, 3, 1); } return;
      case 'hook': ctx.drawImage(Sprites.hook, x - 2, y - 2); return;
      case 'mimic': {
        const T = this.T || Sprites.tiles.grass;
        if (e.state === 'sleep') { ctx.drawImage(T.bonus[(frame >> 3) % 4], x - 1, y - 1); return; }
        const open = (frame >> 3) & 1;
        if (flipY) { put(T.used || T.bonus[0], -1, -1); return; }
        ctx.drawImage(T.bonus[0], x - 1, y - 1 - (open ? 2 : 0), 16, 8); ctx.drawImage(T.bonus[0], 0, 8, 16, 8, x - 1, y + 7, 16, 8);
        ctx.fillStyle = '#1a1020'; ctx.fillRect(x, y + 6, 14, open ? 4 : 2); ctx.fillStyle = '#ffffff'; for (let k = 0; k < 4; k++) { ctx.fillRect(x + 1 + k * 4, y + 5, 2, 2); ctx.fillRect(x + 3 + k * 4, y + (open ? 9 : 7), 2, 2); }
        ctx.fillStyle = '#e83030'; ctx.fillRect(x + 3, y + 1, 2, 2); ctx.fillRect(x + 10, y + 1, 2, 2); return;
      }
      case 'boomer': { const img = Sprites.boomer[(frame >> 3) & 1]; if (e.face > 0) put(img, -1, -2); else { ctx.save(); ctx.translate(x + 15, y - 2); ctx.scale(-1, flipY ? -1 : 1); ctx.drawImage(img, 0, flipY ? -16 : 0); ctx.restore(); } if (e.dying === 'squish') return; return; }
      case 'boomerang': { const a = e.t * 0.5; ctx.save(); ctx.translate(x + 5, y + 4); ctx.rotate(a); ctx.fillStyle = '#1a1020'; ctx.fillRect(-6, -2, 12, 4); ctx.fillRect(-2, -6, 4, 6); ctx.fillStyle = '#e8a040'; ctx.fillRect(-5, -1, 10, 2); ctx.fillRect(-1, -5, 2, 5); ctx.restore(); return; }
      case 'magdrone': {
        put(Sprites.magdrone[(frame >> 1) & 1]);
        if (!e.dying && Math.abs(e.x + 8 - (this.p.x + this.p.w / 2)) < 110) { ctx.strokeStyle = (frame >> 2) & 1 ? 'rgba(255,80,80,0.5)' : 'rgba(80,120,255,0.5)'; for (let k = 1; k <= 3; k++) { const r = ((frame + k * 8) % 24) + 4; ctx.beginPath(); ctx.arc(x + 8, y + 9, r, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke(); } }
        return;
      }
      case 'slime': if (e.dying === 'squish') { ctx.drawImage(e.small ? Sprites.slimeS : Sprites.slime, 0, 6, 16, 6, x, y + 6, 16, 6); return; } put(e.small ? Sprites.slimeS : Sprites.slime, e.small ? 0 : 0, e.small ? 1 : -4 + (e.onGround ? 0 : -1)); return;
      case 'asteroid': { ctx.save(); ctx.translate(x + 7, y + 6); ctx.rotate(e.spin); ctx.drawImage(Sprites.asteroid, -7, -6); ctx.restore(); return; }
      case 'meteor': {
        const gx = Math.round(e.x - cx + (e.vx * Math.max(0, (VH - e.y) / 4.5))); if (e.t < 70 || (frame >> 2) & 1) { ctx.fillStyle = 'rgba(255,60,60,0.6)'; ctx.fillRect(gx - 6, 186, 16, 2); ctx.fillRect(gx - 2, 182, 8, 2); }
        if (e.t > 50) { for (let k = 0; k < 8; k++) { ctx.fillStyle = k < 3 ? '#fff0a0' : k < 6 ? '#ff9030' : 'rgba(255,80,30,0.5)'; ctx.fillRect(x + 2 - Math.round(e.vx * k * 1.5), y - k * 4, 6 - (k >> 1), 6 - (k >> 1)); } ctx.fillStyle = '#5a4a40'; ctx.fillRect(x, y, 8, 8); }
        return;
      }
      case 'jball': { ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 1, y - 1, 10, 10); ctx.fillStyle = e.col || '#ff4060'; ctx.fillRect(x, y, 8, 8); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 1, y + 1, 3, 2); return; }
      case 'ringmaster': if (e.dying) { ctx.save(); ctx.translate(x + 10, y + 14); ctx.scale(1, -1); drawRingmaster(-10, -14, frame, e); ctx.restore(); } else drawRingmaster(x, y, frame, e); return;
      default:
    }
    return _de.call(this, e, cx);
  };
  const _dpl = Play.prototype.drawPlatform;
  Play.prototype.drawPlatform = function (pl, cx) {
    const x = Math.round(pl.x - cx), y = Math.round(pl.y);
    if (pl.gondola !== undefined) {
      const c = ['#e83850', '#40a0e8', '#ffd040', '#40d080'][pl.gondola];
      ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 22, y - 10, 2, 10); ctx.fillRect(x + 6, y - 1, 36, 10); ctx.fillStyle = c; ctx.fillRect(x + 7, y, 34, 8); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 7, y, 34, 2); ctx.fillStyle = '#1a1020'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 12 + k * 8, y + 4, 2, 2);
      return;
    }
    if (pl.coaster) {
      ctx.fillStyle = '#1a1020'; ctx.fillRect(x, y - 1, 40, 12); ctx.fillStyle = '#e83850'; ctx.fillRect(x + 1, y, 38, 9); ctx.fillStyle = '#ffd040'; ctx.fillRect(x + 1, y, 38, 2); ctx.fillRect(x + 3, y + 4, 6, 3);
      ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 6, y + 9, 6, 5); ctx.fillRect(x + 28, y + 9, 6, 5); ctx.fillStyle = '#a0a8c0'; ctx.fillRect(x + 7, y + 10, 4, 3); ctx.fillRect(x + 29, y + 10, 4, 3);
      return;
    }
    return _dpl.call(this, pl, cx);
  };
}

// ---------- the player: minecart, jet, grapple, dash, climb, mirror zones ----------
{
  const _up = Play.prototype.updatePlayer;
  const findAnchor = (pl, p) => {
    let best = null, bd = 104;
    const tx0 = Math.floor((p.x - 104) / TS), tx1 = Math.floor((p.x + 104) / TS), ty1 = Math.floor(p.y / TS);
    for (let ty = 0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (pl.tile(tx, ty) === '%') { const ax = tx * TS + 8, ay = ty * TS + 8, d = Math.hypot(ax - (p.x + p.w / 2), ay - p.y); if (d < bd && ay < p.y) { bd = d; best = [ax, ay, d]; } }
    return best;
  };
  Play.prototype.updatePlayer = function () {
    const p = this.p, U = game.upgrades || {}, D = Input.down, Pr = Input.pressed;
    if (this.state === 'play' && !p.warpT) {
      if (this.def.shmup) return this.updateJet();
      // grappling hook swing
      if (p.swing) {
        const s = p.swing; if (p.inv > 0) p.inv--; if (p.hurtT > 0) p.hurtT--;
        s.av += (-0.5 / s.len) * Math.sin(s.ang) + ((D('right') ? 0.0025 : 0) - (D('left') ? 0.0025 : 0)); s.av *= 0.996; s.ang += s.av;
        const ox = p.x, oy = p.y; p.x = s.ax + Math.sin(s.ang) * s.len - p.w / 2; p.y = s.ay + Math.cos(s.ang) * s.len - 4;
        p.face = s.av >= 0 ? 1 : -1; p.onGround = false; p.vx = 0; p.vy = 0;
        const hit = this.solidOverlap(p);
        if (hit) { p.x = ox; p.y = oy; s.av = -s.av * 0.4; }
        if (Pr('jump') || (hit && Math.abs(s.av) < 0.01)) { p.vx = Math.cos(s.ang) * s.av * s.len * 1.1; p.vy = -Math.sin(s.ang) * s.av * s.len - 3; p.swing = null; Audio8.sfx('jump'); }
        p.prevBottom = p.y + p.h;
        return;
      }
      if (p.grapple && !p.onGround && !p.riding && Pr('jump')) {
        const a = findAnchor(this, p);
        if (a) { const [ax, ay, d] = a, len = clamp(d, 28, 100), ang = Math.atan2(p.x + p.w / 2 - ax, p.y + 4 - ay); p.swing = { ax, ay, len, ang, av: clamp((p.vx * Math.cos(ang) - p.vy * Math.sin(ang)) / len, -0.12, 0.12) }; Audio8.sfx('swoop'); return; }
      }
      // dash: double-tap left or right
      for (const [k, d] of [['left', -1], ['right', 1]]) if (Pr(k) && U.dash) {
        if (p.lastTap === d && frame - (p.lastTapT || 0) < 14 && !(p.dashCool > 0) && (p.onGround || (U.airdash && !p.airDashed))) { p.dashT = 12; p.dashDir = d; p.dashCool = 45; if (!p.onGround) p.airDashed = true; Audio8.sfx('swoop'); }
        p.lastTap = d; p.lastTapT = frame;
      }
    }
    // mirror zones swap left and right; the minecart always rolls forward
    const flip = this.tile(Math.floor((p.x + p.w / 2) / TS), Math.floor((p.y + p.h / 2) / TS)) === '!';
    if (flip && !p.inFlip) this.parts.push({ k: 'text', s: 'MIRRORED!', x: p.x - 14, y: p.y - 14, vy: -0.4, life: 40 });
    p.inFlip = flip;
    const mc = this.def.minecart && this.state === 'play';
    if (flip || mc) Input.down = (k) => (mc ? (k === 'right' ? true : k === 'left' || k === 'run' || k === 'down' ? false : D(k)) : D(k === 'left' ? 'right' : k === 'right' ? 'left' : k));
    if (flip && !mc) Input.pressed = (k) => Pr(k === 'left' ? 'right' : k === 'right' ? 'left' : k);
    try { _up.call(this); } finally { Input.down = D; Input.pressed = Pr; }
    if (mc && !p.riding) { // minecart: duck under beams with Down
      p.vx = 2.5;
      if (D('down') && p.onGround && !p.duck) { const b = p.y + p.h; p.duck = true; p.h = 12; p.y = b - 12; }
      else if (!D('down') && p.duck) { const b = p.y + p.h; p.y = b - 22; p.h = 22; if (this.solidOverlap(p)) { p.h = 12; p.y = b - 12; } else p.duck = false; }
    }
    if (p.dashT > 0) { p.dashT--; p.vx = p.dashDir * 5; if (!p.onGround) p.vy = Math.min(p.vy, 0.2); p.trail.unshift({ x: p.x, y: p.y, pose: 'run2', face: p.dashDir }); p.trail.length = Math.min(p.trail.length, 3); }
    if (p.dashCool > 0) p.dashCool--;
    if (p.onGround) { p.airDashed = false; p.climbT = 0; }
    if (U.climb && p.wallTouch && D(p.wallTouch > 0 ? 'right' : 'left') && (p.climbT || 0) < 55) { p.vy = -1.7; p.climbT = (p.climbT || 0) + 1; if (frame % 6 === 0) this.parts.push({ k: 'dust', x: p.x + p.w / 2 + p.wallTouch * 6, y: p.y + p.h, vx: 0, vy: 0.4, life: 10 }); }
  };
  Play.prototype.updateJet = function () {
    const p = this.p, D = Input.down;
    if (p.inv > 0) p.inv--; if (p.hurtT > 0) p.hurtT--;
    const ax = (D('right') ? 1 : 0) - (D('left') ? 1 : 0), ay = (D('down') ? 1 : 0) - (D('up') ? 1 : 0);
    p.vx += (ax * 2.4 - p.vx) * 0.25; p.vy += (ay * 2.2 - p.vy) * 0.25;
    p.prevBottom = p.y + p.h; p.x += p.vx + (this.def.autoscroll || 0); p.y += p.vy; p.onGround = false; p.face = 1;
    p.x = clamp(p.x, this.cam.x + 4, this.cam.x + VW - 34); p.y = clamp(p.y, 26, VH - 30);
    if (p.jetCool > 0) p.jetCool--;
    if ((Input.pressed('run') || (D('run') && !p.jetCool)) && !p.jetCool) { p.jetCool = 9; this.pings.push({ x: p.x + 26, y: p.y + 12, w: 8, h: 4, vx: 6, life: 50 }); Audio8.sfx('zap'); }
    if (Input.pressed('special') && p.special > 0 && !p.spCool) { p.special--; p.spCool = 30; const h = heroOf(); if (h === 'goth') this.batSwarm(); else if (h === 'doug' || h === 'frost') this.pauseFreeze(); else this.shockwave(); }
    if (p.spCool > 0) p.spCool--;
    for (let ty = Math.floor(p.y / TS); ty <= Math.floor((p.y + p.h) / TS); ty++) for (let tx = Math.floor(p.x / TS); tx <= Math.floor((p.x + 24) / TS); tx++) if (this.tile(tx, ty) === 'o') { this.setTile(tx, ty, '.'); this.addCoin(); }
    if (frame % 3 === 0) this.parts.push({ k: 'dust', x: p.x - 4, y: p.y + 14, vx: -1.5, vy: 0, life: 10 });
  };
  const _pp = Play.prototype.playerPose;
  Play.prototype.playerPose = function () { if (this.p.duck) return 'crouch'; if (this.def.shmup || this.p.swing) return this.def.shmup ? 'ride' : 'jump'; return _pp.call(this); };
  const _dp = Play.prototype.drawPlayer;
  Play.prototype.drawPlayer = function (cx) {
    const p = this.p;
    if (p.swing) { ctx.strokeStyle = '#d0d8e8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.swing.ax - cx, p.swing.ay); ctx.lineTo(p.x + p.w / 2 - cx, p.y + 6); ctx.stroke(); }
    if (this.def.shmup && this.state !== 'dying') { // little jet under the hero
      if (p.inv > 0 && (frame >> 2) & 1) return;
      const x = Math.round(p.x - cx) - 6, y = Math.round(p.y) + 10;
      ctx.fillStyle = '#1a1020'; ctx.fillRect(x, y + 2, 34, 9); ctx.fillRect(x + 6, y - 2, 6, 4); ctx.fillStyle = '#e8ecf8'; ctx.fillRect(x + 1, y + 3, 30, 7); ctx.fillStyle = '#e83850'; ctx.fillRect(x + 1, y + 7, 30, 3); ctx.fillRect(x + 7, y - 1, 4, 3);
      ctx.fillStyle = '#5ff0ff'; ctx.fillRect(x + 26, y + 4, 4, 3); ctx.fillStyle = (frame >> 1) & 1 ? '#ffe040' : '#ff7020'; ctx.fillRect(x - 4, y + 5, 4, 4);
      Wally.draw(ctx, x + 16, y + 6, 'ride', 1, { t: frame });
      return;
    }
    _dp.call(this, cx);
    if (this.def.minecart && this.state !== 'dying' && !p.riding) {
      const x = Math.round(p.x + p.w / 2 - cx) - 12, y = Math.round(p.y + p.h) - 8;
      ctx.fillStyle = '#1a1020'; ctx.fillRect(x, y, 24, 9); ctx.fillStyle = '#7a6a5a'; ctx.fillRect(x + 1, y + 1, 22, 6); ctx.fillStyle = '#a89888'; ctx.fillRect(x + 1, y + 1, 22, 1);
      ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 3, y + 7, 5, 5); ctx.fillRect(x + 16, y + 7, 5, 5); ctx.fillStyle = (frame >> 2) & 1 ? '#c0c8d8' : '#808898'; ctx.fillRect(x + 4, y + 8, 3, 3); ctx.fillRect(x + 17, y + 8, 3, 3);
    }
  };
}

// ---------- pets, upgrades on level start, missions, stats, weather ----------
const missionCache = {};
function missionsFor(li) {
  if (missionCache[li]) return missionCache[li];
  const lv = buildLevel(li), foes = lv.spawns.filter((s) => 'gpzhbctufjel12347'.includes(s.t)).length;
  let coins = 0; lv.grid.forEach((r) => r.forEach((c) => { if (c === 'o') coins++; if (c === 'W') coins++; }));
  return (missionCache[li] = { foes: Math.max(4, Math.round(foes * 0.5)), coins: Math.max(6, Math.min(30, Math.floor(coins * 0.6))) });
}
const missionsOn = (pl) => !pl.ta && !pl.rush && !pl.daily && !pl.endless && !pl.def.custom && isRealLi(pl.li);
{
  const _upd = Play.prototype.update;
  Play.prototype.update = function () {
    if (!this._initE) {
      this._initE = true; this.kills = 0; this.coinsGot = 0; this.usedSpecial = false;
      const U = game.upgrades || {}, p = this.p;
      if (U.heart) p.hearts = Math.min(3, p.hearts + 1); if (U.ammo) p.ammo = Math.max(p.ammo, 5); if (U.special) p.special = Math.max(p.special, 4);
      if (game.plus && missionsOn(this)) {
        this.speedMul = (this.speedMul || 1) * (1 + 0.25 * game.plus);
        const extra = [];
        for (let x = 24; x < this.lv.w - 30; x += 24) { for (let y = 3; y < 13; y++) if (SOLID.has(this.lv.grid[y][x]) && this.lv.grid[y - 1][x] === '.') { extra.push({ t: (x / 24) % 2 ? 'c' : '4', x, y: y - 1 }); break; } }
        const head = this.lv.spawns.slice(0, this.spawnIdx), tail = this.lv.spawns.slice(this.spawnIdx).concat(extra.filter((s) => s.x * TS > this.p.x + 120));
        tail.sort((a, b) => a.x - b.x); this.lv.spawns = head.concat(tail);
      }
      if (missionsOn(this)) { this.mis = missionsFor(this.li); game.stats = game.stats || {}; const hs = (game.stats.hero = game.stats.hero || {}); hs[heroOf()] = (hs[heroOf()] || 0) + 1; }
      if (Settings.get('pet') !== false && !this.def.shmup) this.pet = { x: p.x - 16, y: p.y, down: 0, kind: heroOf() };
    }
    if (this.endless && this.state === 'play') this.def.autoscroll = Math.min(2.2, 0.75 + this.cam.x / TS / 550);
    if (this.def.weather === 'meteors' && this.state === 'play' && !this.paused && !this.talk && !this.bossLock && frame % 200 === 0) this.ents.push({ type: 'meteor', alive: true, t: 0, x: this.p.x + ((frame * 37) % 120) - 50, y: -30, w: 8, h: 8, vx: 0.6, hazard: false });
    _upd.call(this);
    if (this.pet && !this.paused && !this.talk) this.updatePet();
  };
  Play.prototype.updatePet = function () {
    const q = this.pet, p = this.p, pd = PETS[q.kind] || PETS.wally;
    if (q.down > 0) { q.down--; if (!q.down) { q.x = p.x - 20; q.y = p.y - 30; this.parts.push({ k: 'text', s: pd.name + ' IS BACK!', x: p.x - 20, y: p.y - 20, vy: -0.4, life: 50 }); } return; }
    const tx = p.x + p.w / 2 - p.face * 18 - 6, ty = pd.fly ? p.y - 10 + Math.sin(frame * 0.08) * 4 : p.y + p.h - 10;
    q.x += (tx - q.x) * 0.1; q.y += (ty - q.y) * (pd.fly ? 0.1 : 0.2); q.face = tx > q.x ? 1 : -1;
    const R = game.upgrades && game.upgrades.petmag ? 2 : 1, cx0 = Math.floor((q.x + 6) / TS), cy0 = Math.floor((q.y + 5) / TS);
    for (let ty2 = cy0 - R; ty2 <= cy0 + R; ty2++) for (let tx2 = cx0 - R; tx2 <= cx0 + R; tx2++) if (this.tile(tx2, ty2) === 'o') { this.setTile(tx2, ty2, '.'); this.addCoin(); this.parts.push({ k: 'coinpop', x: tx2 * TS + 4, y: ty2 * TS, vy: -2, life: 12 }); }
  };
  const _hurt = Play.prototype.hurt;
  Play.prototype.hurt = function (spike) {
    const p = this.p, q = this.pet;
    if (!this._p2ctx && q && !q.down && !p.shield && !(p.inv > 0) && !(p.charge > 0) && this.state === 'play' && !p.riding) {
      q.down = 1200; p.inv = 100; Audio8.sfx('dinocry'); rumble(0.4, 150);
      this.parts.push({ k: 'text', s: (PETS[q.kind] || PETS.wally).name + ' SAVED YOU!', x: p.x - 30, y: p.y - 16, vy: -0.4, life: 70 });
      for (let i = 0; i < 6; i++) this.parts.push({ k: 'star', x: q.x + 6, y: q.y + 4, life: 14 });
      return;
    }
    const before = p.hearts; _hurt.call(this, spike);
    if (p.hearts < before) { p.grapple = false; p.swing = null; }
  };
  const _die = Play.prototype.die;
  Play.prototype.die = function () { if (!this._p2ctx && this.state !== 'dying' && missionsOn(this)) { game.stats = game.stats || {}; game.stats.deaths = (game.stats.deaths || 0) + 1; } this.p.swing = null; return _die.call(this); };
  Play.prototype.countKill = function (e) { if (this.state !== 'play') return; this.kills = (this.kills || 0) + 1; if (missionsOn(this)) { game.stats = game.stats || {}; game.stats.kills = (game.stats.kills || 0) + 1; } };
  const _fk = Play.prototype.flipKill;
  Play.prototype.flipKill = function (e) { const was = e.dying; _fk.call(this, e); if (!was && e.dying && !e.yeti) { this.countKill(e); if (['mimic', 'boomer', 'magdrone', 'asteroid', 'slime'].includes(e.type)) Sticker.add(e.type); } };
  const _sq = Play.prototype.stomp;
  Play.prototype.stomp = function (e) { const was = e.dying, a = e.alive; _sq.call(this, e); if (!was && e.dying === 'squish') this.countKill(e); if (e.type === 'slime' && e.small && a && e.dying === 'squish') Sticker.add('slime'); };
  const _ac = Play.prototype.addCoin;
  Play.prototype.addCoin = function () { this.coinsGot = (this.coinsGot || 0) + 1; if (missionsOn(this)) { game.stats = game.stats || {}; game.stats.coins = (game.stats.coins || 0) + 1; } return _ac.call(this); };
  for (const m of ['shockwave', 'batSwarm', 'pauseFreeze']) { const f = Play.prototype[m]; Play.prototype[m] = function (...a) { this.usedSpecial = true; return f.apply(this, a); }; }
  const _dy = Play.prototype.damageYeti;
  Play.prototype.damageYeti = function (e) { const h = e.hp; _dy.call(this, e); if (h > 0 && e.hp <= 0 && missionsOn(this)) { game.stats = game.stats || {}; game.stats.bosses = (game.stats.bosses || 0) + 1; } };
  const _db2 = Play.prototype.damageBoss;
  Play.prototype.damageBoss = function (e) { const a = e.alive; _db2.call(this, e); if (a && !e.alive && missionsOn(this)) { game.stats = game.stats || {}; game.stats.bosses = (game.stats.bosses || 0) + 1; } };
  const _cl = Play.prototype.clear;
  Play.prototype.clear = function (secretTo) {
    const was = this.state; _cl.call(this, secretTo);
    if (was !== 'play' || this.state !== 'clear' || !missionsOn(this) || !this.mis) return;
    const got = (this.kills >= this.mis.foes ? 1 : 0) | (this.coinsGot >= this.mis.coins ? 2 : 0) | (!this.usedSpecial ? 4 : 0);
    game.missions = game.missions || []; const old = game.missions[this.li] | 0, fresh = got & ~old;
    game.missions[this.li] = old | got;
    let reward = 0; for (let b = 0; b < 3; b++) if (fresh & (1 << b)) reward += 10;
    if (reward) { game.coins += reward; while (game.coins >= 100) { game.coins -= 100; game.lives++; } }
    if ((old | got) === 7 && old !== 7) { game.lives++; Ach.unlock('missions'); }
    const labels = [`DEFEAT ${this.mis.foes} FOES`, `GRAB ${this.mis.coins} COINS`, 'NO SPECIALS'];
    labels.forEach((l, b) => this.parts.push({ k: 'text', s: (got & (1 << b) ? '# ' : '- ') + l + (fresh & (1 << b) ? ' +10' : ''), x: this.cam.x + 70, y: 64 + b * 11, vy: 0, life: 170, fixed: false }));
    game.stats = game.stats || {}; game.stats.levels = (game.stats.levels || 0) + 1;
  };
  const _dw = Play.prototype.drawWeather;
  Play.prototype.drawWeather = function (cx) {
    _dw.call(this, cx);
    if (this.def.weather === 'ash') {
      const g = (Math.sin(frame * 0.004) + 1) / 2;
      ctx.fillStyle = `rgba(60,30,20,${0.12 + g * 0.18})`; ctx.fillRect(0, 0, VW, VH);
      for (let i = 0; i < 70; i++) { const x = (((i * 97 - frame * (0.8 + (i % 4) * 0.3) - cx * 0.6) % VW) + VW) % VW, y = (i * 53 + frame * (0.4 + (i % 3) * 0.25)) % VH; ctx.fillStyle = i % 5 ? 'rgba(150,140,140,0.7)' : 'rgba(255,140,60,0.8)'; ctx.fillRect(Math.round(x), Math.round(y), i % 3 ? 1 : 2, 1); }
      if (g > 0.85) txt('ASH STORM!', 128, 34, '#ffb080', { align: 'center', outline: '#000' });
    } else if (this.def.weather === 'meteors') {
      for (let k = 0; k < 3; k++) { const ph = (frame * 2 + k * 160) % 480; if (ph < 60) { const sx = (k * 97 + 40) % VW + ph * 2, sy = 20 + k * 18 + ph; for (let i = 0; i < 12; i++) { ctx.fillStyle = `rgba(255,240,200,${(12 - i) / 12})`; ctx.fillRect(sx - i * 2, sy - i, 2, 1); } } }
    }
  };
  const _dh = Play.prototype.drawHUD;
  Play.prototype.drawHUD = function () {
    const q = this.pet;
    if (q && !q.down && this.state !== 'dying') { const pd = PETS[q.kind] || PETS.wally, cx = Math.round(this.cam.x); ctx.drawImage(pd.img[q.face < 0 ? 1 : 0], Math.round(q.x - cx), Math.round(q.y + (pd.fly ? 0 : -((frame >> 3) & 1)))); }
    _dh.call(this);
    if (this.p.grapple) { ctx.drawImage(Sprites.hook, 0, 0, 16, 16, 176, 14, 8, 8); }
  };
}

// ---------- intro screen: missions ----------
{
  const _intro = IntroScene;
  IntroScene = function (li, cp) { // eslint-disable-line no-func-assign
    const s = _intro(li, cp), d = s.draw;
    s.draw = function () {
      d.call(this);
      if (!isRealLi(li) || !game) return;
      const m = missionsFor(li), got = (game.missions && game.missions[li]) | 0;
      drawWindow(148, 116, 104, 44);
      txt('MISSIONS', 200, 121, '#ffe040', { align: 'center' });
      [`${m.foes} FOES`, `${m.coins} COINS`, 'NO SPECIALS'].forEach((l, b) => txt((got & (1 << b) ? '# ' : '- ') + l, 155, 132 + b * 9, got & (1 << b) ? '#ffe040' : '#fff'));
      if (game.plus) txt('NEW GAME+' + (game.plus > 1 ? ' ' + game.plus : ''), 128, 40, '#ff8080', { align: 'center' });
    };
    return s;
  };
}

// ---------- Dino's house: shop, upgrades, mini-games, stats, New Game+ ----------
function HouseScene(start = 0) {
  const items = () => ["DINO'S SHOP", 'UPGRADE TREE', 'MINI-GAMES', 'FILE STATS'].concat(game.cleared[7] ? ['NEW GAME+'] : []).concat(['LEAVE']);
  let sel = start, t = 0;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++; const it = items();
      if (Input.pressed('down')) { sel = (sel + 1) % it.length; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + it.length - 1) % it.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || (Input.confirm() && it[sel] === 'LEAVE')) { go(() => MapScene()); return; }
      if (Input.confirm()) { Audio8.sfx('confirm'); go({ "DINO'S SHOP": () => ShopScene(), 'UPGRADE TREE': () => UpgradeScene(), 'MINI-GAMES': () => MiniGamesScene(), 'FILE STATS': () => StatsScene(), 'NEW GAME+': () => PlusScene() }[it[sel]]); }
    },
    draw() {
      ctx.fillStyle = '#f0c890'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e0b478'; for (let x = 0; x < VW; x += 20) ctx.fillRect(x, 0, 2, 140);
      ctx.fillStyle = '#8a5a2a'; ctx.fillRect(0, 140, VW, 84); ctx.fillStyle = '#a06a34'; for (let x = 0; x < VW; x += 32) ctx.fillRect(x, 140, 30, 84);
      ctx.fillStyle = '#5ab0f0'; ctx.fillRect(170, 22, 60, 44); ctx.fillStyle = '#fff'; ctx.fillRect(170, 43, 60, 2); ctx.fillRect(199, 22, 2, 44); ctx.fillStyle = '#6a3a1a'; ctx.fillRect(168, 20, 64, 2); ctx.fillRect(168, 66, 64, 2);
      ctx.fillStyle = '#c03040'; ctx.fillRect(22, 112, 50, 6); ctx.fillStyle = '#6a3a1a'; ctx.fillRect(26, 118, 4, 22); ctx.fillRect(64, 118, 4, 22);
      ctx.drawImage(Sprites.dino.r[(t >> 4) & 1], 190, 116);
      const q = PETS[heroOf()]; if (q) ctx.drawImage(q.img[0], 150, 128 + ((t >> 4) & 1));
      drawWally(130, 140, 'idle' + ((t >> 4) % 4), 1);
      drawWindow(8, 8, 150, 22); txt("DINO'S HOUSE", 83, 15, '#ffe040', { align: 'center' });
      ctx.drawImage(Sprites.coinIcon, 172, 76); txt('*' + pad(game.coins, 2), 179, 76, '#3a2010');
      drawWindow(8, 146, 150, 74);
      items().forEach((s, i) => { const y = 152 + i * 11; txt(s, 26, y, i === sel ? '#ffe040' : '#fff'); if (i === sel) txt('>', 16 + ((t >> 3) & 1), y, '#ffe040'); });
    },
  };
}
const UPGRADES = [
  { id: 'dash', name: 'DASH', price: 40, col: 0, row: 0, tip: ['DOUBLE-TAP LEFT OR RIGHT', 'FOR A BURST OF SPEED'] },
  { id: 'airdash', name: 'AIR DASH', price: 70, col: 0, row: 1, need: 'dash', tip: ['DASH IN MID-AIR TOO', '(ONCE PER JUMP)'] },
  { id: 'wall', name: 'WALL JUMP', price: 60, col: 1, row: 0, tip: ['SLIDE DOWN WALLS AND', 'JUMP OFF THEM (ALL HEROES)'] },
  { id: 'climb', name: 'CLIMB', price: 90, col: 1, row: 1, need: 'wall', tip: ['HOLD TOWARD A WALL', 'TO RUN UP IT FOR A MOMENT'] },
  { id: 'heart', name: 'HEART+', price: 80, col: 2, row: 0, tip: ['START EVERY LEVEL', 'WITH AN EXTRA HEART'] },
  { id: 'ammo', name: 'AMMO+', price: 30, col: 2, row: 1, tip: ['START EVERY LEVEL', 'WITH 5 CANNONBALLS'] },
  { id: 'special', name: 'SPECIAL+', price: 50, col: 3, row: 0, tip: ['START EVERY LEVEL', 'WITH 4 SPECIALS'] },
  { id: 'petmag', name: 'PET RANGE', price: 40, col: 3, row: 1, tip: ['YOUR PET GRABS COINS', 'FROM FURTHER AWAY'] },
];
function UpgradeScene() {
  let col = 0, row = 0, t = 0, msg = '', msgT = 0;
  const at = () => UPGRADES.find((u) => u.col === col && u.row === row);
  return {
    enter() { Audio8.play('menu'); if (!game.upgrades) game.upgrades = {}; },
    update() {
      t++; if (msgT > 0) msgT--;
      if (Input.pressed('right')) { col = (col + 1) % 4; Audio8.sfx('select'); } if (Input.pressed('left')) { col = (col + 3) % 4; Audio8.sfx('select'); }
      if (Input.pressed('down') || Input.pressed('up')) { row ^= 1; Audio8.sfx('select'); }
      if (Input.pressed('back') || Input.pressed('run') || Input.pressed('start')) { go(() => HouseScene(1)); return; }
      if (Input.pressed('jump')) {
        const u = at(), U = game.upgrades;
        if (U[u.id]) { msg = 'ALREADY LEARNED!'; Audio8.sfx('bump'); } else if (u.need && !U[u.need]) { msg = 'LEARN ' + UPGRADES.find((k) => k.id === u.need).name + ' FIRST'; Audio8.sfx('bump'); } else if (game.coins < u.price) { msg = 'NOT ENOUGH COINS!'; Audio8.sfx('bump'); } else { game.coins -= u.price; U[u.id] = true; Save.persist(); msg = u.name + ' LEARNED!'; Audio8.sfx('oneup'); }
        msgT = 100;
      }
    },
    draw() {
      drawParallax('sky', t * 0.3);
      drawWindow(8, 6, 240, 22); txt('UPGRADE TREE', 70, 13, '#ffe040', { align: 'center' }); ctx.drawImage(Sprites.coinIcon, 180, 13); txt('*' + pad(game.coins, 2), 187, 13, '#fff');
      const U = game.upgrades || {};
      for (const u of UPGRADES) {
        const x = 9 + u.col * 60, y = 44 + u.row * 54, on = u.col === col && u.row === row, own = U[u.id], lock = u.need && !U[u.need];
        if (u.need) { ctx.fillStyle = U[u.need] ? '#ffd040' : '#6a6a8a'; ctx.fillRect(x + 27, y - 10, 4, 10); }
        ctx.fillStyle = on ? ((t >> 3) & 1 ? '#ffe040' : '#ffa020') : '#101848'; ctx.fillRect(x - 2, y - 2, 62, 42);
        ctx.fillStyle = own ? '#2a7a40' : lock ? '#3a3a50' : '#2a3a7a'; ctx.fillRect(x, y, 58, 38);
        txt(u.name, x + 29, y + 6, own ? '#c0ffc0' : lock ? '#8890a8' : '#fff', { align: 'center' });
        if (own) txt('LEARNED', x + 29, y + 22, '#80ff90', { align: 'center' }); else { ctx.drawImage(Sprites.coinIcon, x + 17, y + 22); txt(String(u.price), x + 24, y + 22, game.coins >= u.price ? '#ffe040' : '#ff6060'); }
      }
      const u = at(); drawWindow(8, 156, 240, 44); u.tip.forEach((l, i) => txt(l, 128, 164 + i * 11, '#fff', { align: 'center' }));
      if (msgT) txt(msg, 128, 188, '#5ff0ff', { align: 'center' });
      txt('A: LEARN   B: BACK', 128, 208, '#fff', { align: 'center', outline: '#101848' });
    },
  };
}
function MiniGamesScene() {
  const items = ['SLOT MACHINE (5 COINS)', 'MEMORY MATCH (10 COINS)', 'BACK'];
  let sel = 0, t = 0;
  return {
    enter() { Audio8.play('carnival'); },
    update() {
      t++;
      if (Input.pressed('down')) { sel = (sel + 1) % 3; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + 2) % 3; Audio8.sfx('select'); }
      if (Input.pressed('back') || (Input.confirm() && sel === 2)) { go(() => HouseScene(2)); return; }
      if (Input.confirm()) { Audio8.sfx('confirm'); go(sel === 0 ? () => SlotScene() : () => MemoryScene()); }
    },
    draw() {
      drawParallax('carnival', t * 0.4);
      drawWindow(28, 70, 200, 70); txt('MINI-GAMES', 128, 76, '#ffe040', { align: 'center' });
      items.forEach((s, i) => { const y = 94 + i * 13; txt(s, 48, y, i === sel ? '#ffe040' : '#fff'); if (i === sel) txt('>', 38 + ((t >> 3) & 1), y, '#ffe040'); });
      ctx.drawImage(Sprites.coinIcon, 100, 150); txt('*' + pad(game.coins, 2), 107, 150, '#fff', { outline: '#101848' });
    },
  };
}
const SLOT_ICONS = ['coin', 'heart', 'star', 'dino', 'medal', 'bomb'];
function drawSlotIcon(k, x, y) {
  if (k === 'coin') ctx.drawImage(Sprites.coin, x + 4, y + 1); else if (k === 'heart') ctx.drawImage(Sprites.heart, x + 4, y + 4, 14, 14); else if (k === 'medal') ctx.drawImage(Sprites.medal, x + 3, y + 2);
  else if (k === 'dino') ctx.drawImage(Sprites.dino.r[0], 0, 0, 24, 12, x - 1, y + 4, 24, 12); else if (k === 'star') txt('#', x + 5, y + 3, '#ffe040', { scale: 2 });
  else { ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 5, y + 6, 12, 12); ctx.fillStyle = '#3a3a48'; ctx.fillRect(x + 6, y + 7, 10, 10); ctx.fillStyle = '#ff7020'; ctx.fillRect(x + 12, y + 3, 2, 3); }
}
function SlotScene() {
  let t = 0, reels = [0, 2, 4], spin = [false, false, false], stopAt = 0, msg = 'A: SPIN FOR 5 COINS', msgT = 0;
  const prize = () => {
    const [a, b, c] = reels.map((r) => SLOT_ICONS[r]);
    if (a === b && b === c) {
      if (a === 'star') { game.lives += 3; Ach.unlock('jackpot'); return 'JACKPOT! +3 LIVES!'; }
      if (a === 'heart') { game.lives++; return '1-UP!'; }
      if (a === 'dino') { game.coins += 50; return '+50 COINS!'; }
      if (a === 'coin') { game.coins += 30; return '+30 COINS!'; }
      if (a === 'medal') { game.coins += 20; return '+20 COINS!'; }
      return 'KABOOM! NOTHING...';
    }
    if ((a === b || b === c || a === c) && ![a, b, c].includes('bomb')) { game.coins += 6; return 'A PAIR! +6 COINS'; }
    return 'NO LUCK. TRY AGAIN!';
  };
  return {
    enter() { Audio8.play('carnival'); },
    update() {
      t++; if (msgT > 0) msgT--;
      for (let i = 0; i < 3; i++) if (spin[i] && t % 3 === 0) reels[i] = (reels[i] + 1) % SLOT_ICONS.length;
      if (spin.some(Boolean) && t >= stopAt) { const i = spin.indexOf(true); spin[i] = false; Audio8.sfx('tick'); stopAt = t + 20; if (!spin.some(Boolean)) { msg = prize(); while (game.coins >= 100) { game.coins -= 100; game.lives++; } Save.persist(); Audio8.sfx(msg.includes('NO') || msg.includes('NOTHING') ? 'bump' : 'oneup'); } }
      if (Input.pressed('back') || Input.pressed('run')) { go(() => MiniGamesScene()); return; }
      if (Input.pressed('jump') && !spin.some(Boolean)) { if (game.coins < 5) { msg = 'NOT ENOUGH COINS!'; Audio8.sfx('bump'); } else { game.coins -= 5; spin = [true, true, true]; stopAt = t + 40 + ((t * 7) % 20); for (let i = 0; i < 3; i++) reels[i] = (reels[i] + ((t * (i + 3)) % 6)) % 6; msg = 'SPINNING...'; Audio8.sfx('coin'); } }
    },
    draw() {
      ctx.fillStyle = '#2a0a3a'; ctx.fillRect(0, 0, VW, VH);
      for (let k = 0; k < 24; k++) { ctx.fillStyle = (k + (t >> 3)) % 3 ? '#ffe040' : '#ff4060'; ctx.fillRect(40 + k * 7.5, 30, 3, 3); ctx.fillRect(40 + k * 7.5, 150, 3, 3); }
      ctx.fillStyle = '#c02040'; ctx.fillRect(40, 36, 178, 112); ctx.fillStyle = '#ffd040'; ctx.fillRect(44, 40, 170, 104);
      txt('LUCKY DINO SLOTS', 128, 46, '#c02040', { align: 'center' });
      for (let i = 0; i < 3; i++) { const x = 62 + i * 46, y = 66; ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 2, y - 2, 30, 40); ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 26, 36); drawSlotIcon(SLOT_ICONS[reels[i]], x + 2, y + 7); if (spin[i]) { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(x, y + ((t * 4) % 30), 26, 6); } }
      txt(msg, 128, 122, '#3a1020', { align: 'center' });
      ctx.drawImage(Sprites.coinIcon, 90, 170); txt('*' + pad(game.coins, 2), 97, 170, '#fff'); ctx.drawImage(Sprites.heart, 140, 170); txt('*' + pad(game.lives, 2), 149, 170, '#fff');
      txt('3 STARS = 3 LIVES   3 HEARTS = 1-UP', 128, 190, '#ffd0ff', { align: 'center' });
      txt('A: SPIN   B: BACK', 128, 206, '#fff', { align: 'center' });
    },
  };
}
function MemoryScene() {
  const icons = ['coin', 'heart', 'star', 'dino', 'medal', 'bomb'];
  let cards = [], sel = 0, open = [], tries = 0, t = 0, wait = 0, done = false, paid = false, msg = 'A: PLAY FOR 10 COINS';
  const deal = () => { cards = icons.concat(icons).map((k, i) => ({ k, up: false, got: false, r: Math.sin(i * 12.9898 + frame * 0.37) })); cards.sort((a, b) => a.r - b.r); tries = 0; open = []; done = false; };
  deal();
  return {
    enter() { Audio8.play('carnival'); },
    update() {
      t++;
      if (Input.pressed('back') || Input.pressed('run')) { go(() => MiniGamesScene()); return; }
      if (!paid) { if (Input.pressed('jump')) { if (game.coins < 10) { msg = 'NOT ENOUGH COINS!'; Audio8.sfx('bump'); } else { game.coins -= 10; paid = true; deal(); msg = 'FIND ALL 6 PAIRS IN 10 TRIES'; Audio8.sfx('coin'); } } return; }
      if (wait > 0) { if (--wait === 0) { const [a, b] = open; if (cards[a].k === cards[b].k) { cards[a].got = cards[b].got = true; game.coins += 3; Audio8.sfx('coin'); } else { cards[a].up = cards[b].up = false; } open = []; if (cards.every((c) => c.got)) { done = true; paid = false; game.lives++; game.coins += 20; msg = 'PERFECT! 1-UP AND +20 COINS!'; Audio8.sfx('oneup'); } else if (tries >= 10) { done = true; paid = false; msg = 'OUT OF TRIES! A: PLAY AGAIN'; Audio8.sfx('bump'); } while (game.coins >= 100) { game.coins -= 100; game.lives++; } Save.persist(); } return; }
      if (Input.pressed('right')) sel = (sel + 1) % 12; if (Input.pressed('left')) sel = (sel + 11) % 12; if (Input.pressed('down')) sel = (sel + 4) % 12; if (Input.pressed('up')) sel = (sel + 8) % 12;
      if (Input.pressed('jump') && !cards[sel].up && !cards[sel].got) { cards[sel].up = true; open.push(sel); Audio8.sfx('select'); if (open.length === 2) { tries++; wait = 40; } }
    },
    draw() {
      ctx.fillStyle = '#1a3a2a'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#2a5a3a'; for (let y = 0; y < VH; y += 8) ctx.fillRect(0, y, VW, 1);
      txt('MEMORY MATCH', 128, 8, '#ffe040', { align: 'center' });
      cards.forEach((c, i) => {
        const x = 40 + (i % 4) * 46, y = 24 + Math.floor(i / 4) * 46, on = i === sel && paid;
        ctx.fillStyle = on ? '#ffe040' : '#0a1a10'; ctx.fillRect(x - 2, y - 2, 38, 42);
        if (c.up || c.got || !paid && done) { ctx.fillStyle = c.got ? '#d0ffd0' : '#ffffff'; ctx.fillRect(x, y, 34, 38); drawSlotIcon(c.k, x + 6, y + 8); }
        else { ctx.fillStyle = '#c02040'; ctx.fillRect(x, y, 34, 38); ctx.fillStyle = '#ffd040'; ctx.fillRect(x + 4, y + 4, 26, 30); ctx.fillStyle = '#c02040'; txt('?', x + 13, y + 15, '#c02040'); }
      });
      txt(msg, 128, 168, '#fff', { align: 'center' });
      txt(paid ? `TRIES ${tries}/10` : '', 128, 180, '#a0ffa0', { align: 'center' });
      ctx.drawImage(Sprites.coinIcon, 96, 194); txt('*' + pad(game.coins, 2), 103, 194, '#fff'); ctx.drawImage(Sprites.heart, 136, 194); txt('*' + pad(game.lives, 2), 145, 194, '#fff');
      txt('B: BACK', 128, 210, '#fff', { align: 'center' });
    },
  };
}
function StatsScene() {
  let t = 0;
  const S = game.stats || {}, bits = (a, n) => a.reduce((s, m) => s + [...Array(n).keys()].filter((i) => (m | 0) & (1 << i)).length, 0);
  const fav = Object.entries(S.hero || {}).sort((a, b) => b[1] - a[1])[0];
  const pt = Math.floor((game.playTime || 0) / 60), lines = [
    ['PLAY TIME', `${Math.floor(pt / 3600)}H ${pad(Math.floor(pt / 60) % 60, 2)}M ${pad(pt % 60, 2)}S`], ['LEVELS CLEARED', `${game.cleared.filter((c, i) => c && isRealLi(i)).length}/${LEVELS.filter((d) => !d.reserved).length}`],
    ['WALLY MEDALS', String(bits(game.medals, 5))], ['STARS', String(bits(game.stars, 3))], ['SIGNAL BARS', String(bits(game.bars || [], 3))], ['MISSIONS', String(bits(game.missions || [], 3))],
    ['ENEMIES DEFEATED', String(S.kills || 0)], ['BOSSES BEATEN', String(S.bosses || 0)], ['LIVES LOST', String(S.deaths || 0)], ['COINS COLLECTED', String(S.coins || 0)],
    ['SECRET KEYS', `${Object.keys(game.keys || {}).length}/3`], ['FAVOURITE HERO', fav ? HEROES[fav[0]].short || HEROES[fav[0]].name : '-'], ['NEW GAME+', game.plus ? String(game.plus) : '-'],
  ];
  return {
    enter() { Audio8.play('menu'); },
    update() { t++; if (t > 10 && (Input.confirm() || Input.pressed('back') || Input.pressed('run'))) go(() => HouseScene(3)); },
    draw() {
      drawParallax('grass', t * 0.3); drawWindow(16, 8, 224, 208);
      txt('FILE STATS', 128, 14, '#ffe040', { align: 'center' });
      lines.forEach(([k, v], i) => { txt(k, 28, 32 + i * 13, '#a8b0d8'); txt(v, 228, 32 + i * 13, '#fff', { align: 'right' }); });
    },
  };
}
function PlusScene() {
  let t = 0;
  return {
    enter() { Audio8.play('boss'); },
    update() {
      t++;
      if (Input.pressed('back') || Input.pressed('run')) { go(() => HouseScene(4)); return; }
      if (t > 20 && Input.pressed('jump')) {
        game.plus = (game.plus || 0) + 1; game.cleared = Array(140).fill(false); game.medals = Array(140).fill(0); game.stars = Array(140).fill(0); game.bars = Array(140).fill(0); game.missions = []; for (let k = 4; k <= 16; k++) game['node' + k] = 0; if (typeof ngPlusStart === 'function') ngPlusStart();
        game.secrets = {}; game.world = 0; game.node = 0; game.node2 = 0; game.node3 = 0; game.seenTalk = {}; Save.persist(); Audio8.sfx('secret'); go(() => MapScene());
      }
    },
    draw() {
      ctx.fillStyle = '#200818'; ctx.fillRect(0, 0, VW, VH);
      txt('NEW GAME+', 128, 30, '#ff8080', { scale: 2, align: 'center', outline: '#000' });
      ['START THE ADVENTURE AGAIN?', '', 'YOU KEEP: LIVES, COINS, SCORE,', 'UPGRADES, HATS, KEYS AND PETS.', '', 'LEVELS, MEDALS AND STARS RESET.', 'ENEMIES ARE FASTER, THERE ARE', 'MORE OF THEM, AND BOSSES TAKE', 'MORE HITS.'].forEach((l, i) => txt(l, 128, 62 + i * 12, '#fff', { align: 'center' }));
      txt('A: YES, BRING IT ON!   B: NO', 128, 196, (t >> 4) & 1 ? '#ffe040' : '#fff', { align: 'center' });
    },
  };
}

// ---------- Endless Run ----------
function endlessDef(seed) {
  const r = Sprites.rng(seed), W = 1600, theme = ['grass', 'beach', 'candy', 'sky', 'carnival'][Math.floor(r() * 5)];
  return {
    name: 'ENDLESS RUN', theme, music: theme, width: W, noAuto: true, autoscroll: 0.75, endless: true,
    build(b) {
      b.ground(0, 24).set(4, 11, '@');
      let x = 25;
      while (x < W - 30) {
        const d = x / W, k = r();
        if (k < 0.22) { const g = 2 + Math.floor(r() * (2 + d * 3)); x += g; b.ground(x, x + 8); if (r() < 0.5) b.coins(x - g, 9, g); x += 9; }
        else if (k < 0.38) { b.ground(x, x + 12); const e = 'gpch24'[Math.floor(r() * 6)]; b.set(x + 6, 11, e); if (d > 0.3) b.set(x + 10, 11, 'gp4'[Math.floor(r() * 3)]); x += 13; }
        else if (k < 0.5) { b.ground(x, x + 10).stairsUp(x + 2, 3).stairsDown(x + 6, 3); x += 11; }
        else if (k < 0.62) { b.row(x + 1, 9, '===').row(x + 6, 8, '===').coins(x + 6, 6, 3); x += 10; b.ground(x, x + 5); x += 6; }
        else if (k < 0.72) { b.ground(x, x + 10); b.set(x + 4, 11, '^'); if (d > 0.4) b.set(x + 5, 11, '^'); b.coins(x + 3, 8, 3); x += 11; }
        else if (k < 0.8) { b.ground(x, x + 12).set(x + 3, 11, 'J').fill(x + 7, 7, x + 11, 11, 'X').coins(x + 7, 5, 5); x += 13; }
        else if (k < 0.9) { b.ground(x, x + 10).row(x + 3, 8, r() < 0.2 ? 'BVB' : r() < 0.4 ? 'BEB' : 'BWB'); x += 11; }
        else { b.ground(x, x + 9).set(x + 5, 3, 'u'); x += 10; }
      }
      b.ground(W - 30, W - 1).set(W - 8, 11, 'G');
    },
  };
}
function EndlessIntro() {
  let t = 0; const best = lsGet('wallyman-endless', []);
  return {
    enter() { Audio8.play('charge'); },
    update() {
      t++;
      if (Input.pressed('back')) { go(() => ChallengeScene(3)); return; }
      if (t > 20 && Input.confirm()) { game = challengeGame(); window.ENDLESS_LEVEL = endlessDef((Date.now() & 0xffff) + 1); Audio8.sfx('confirm'); go(() => new Play(97, false, { endless: true })); }
    },
    draw() {
      drawParallax('grass', t * 1.5);
      txt('ENDLESS RUN', 128, 16, '#ffe040', { scale: 2, align: 'center', outline: '#101848' });
      ['THE SCREEN NEVER STOPS AND KEEPS', 'GETTING FASTER. HOW FAR CAN YOU GO?', 'A NEW COURSE EVERY RUN.'].forEach((l, i) => txt(l, 128, 46 + i * 11, '#fff', { align: 'center', outline: '#101848' }));
      drawWindow(48, 90, 160, 82); txt('LONGEST RUNS', 128, 96, '#ffe040', { align: 'center' });
      if (!best.length) txt('NO RUNS YET!', 128, 128, '#a8b0d8', { align: 'center' });
      best.slice(0, 5).forEach((rw, i) => { txt(`${i + 1}. ${rw.name}`, 60, 112 + i * 11, i === 0 ? '#ffe040' : '#fff'); txt(rw.d + 'M', 196, 112 + i * 11, '#fff', { align: 'right' }); });
      if ((t >> 4) & 1) txt('PRESS START', 128, 194, '#fff', { align: 'center', outline: '#101848' });
    },
  };
}
function EndlessResult(d) {
  let t = 0; const best = lsGet('wallyman-endless', []), name = (HEROES[heroOf()].short || HEROES[heroOf()].name).slice(0, 10), rec = !best.length || d > best[0].d;
  best.push({ d, name }); best.sort((a, b) => b.d - a.d); lsSet('wallyman-endless', best.slice(0, 5)); if (d >= 500) Ach.unlock('endless');
  return {
    enter() { Audio8.play(rec ? 'victory' : 'gameover'); },
    update() { t++; if (t > 40 && (Input.confirm() || Input.pressed('back'))) go(() => EndlessIntro()); },
    draw() {
      ctx.fillStyle = '#101848'; ctx.fillRect(0, 0, VW, VH);
      txt('RUN OVER!', 128, 50, '#ffe040', { scale: 2, align: 'center', outline: '#000' });
      txt(`DISTANCE ${d}M`, 128, 90, '#fff', { align: 'center' }); txt(`COINS ${game.coins}`, 128, 104, '#fff', { align: 'center' });
      if (rec && (t >> 3) & 1) txt('NEW RECORD!', 128, 122, '#5ff0ff', { align: 'center' });
      drawWally(128, 170, rec ? 'win' + ((t >> 4) & 1) : 'hurt', 1);
      if (t > 40 && (t >> 4) & 1) txt('PRESS START', 128, 196, '#fff', { align: 'center' });
    },
  };
}
function ChallengeScene(start = 0) { // eslint-disable-line no-func-assign
  const items = ['TIME ATTACK', 'BOSS RUSH', 'DAILY CHALLENGE', 'ENDLESS RUN', 'BACK'];
  const tips = ['RACE ANY LEVEL YOU HAVE BEATEN', 'EVERY BOSS BACK TO BACK!', "TODAY'S LEVEL WITH A TWIST", 'HOW FAR CAN YOU RUN?', ''];
  let sel = start, t = 0;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (Input.pressed('down')) { sel = (sel + 1) % items.length; Audio8.sfx('select'); }
      if (Input.pressed('up')) { sel = (sel + items.length - 1) % items.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || (Input.confirm() && sel === 4)) { go(() => TitleScene()); return; }
      if (Input.confirm()) { Audio8.sfx('confirm'); go([() => TimeAttackSelect(), () => RushIntroScene(), () => DailyScene(), () => EndlessIntro()][sel]); }
    },
    draw() {
      drawParallax('castle', t * 0.4);
      drawLogo(8);
      drawWindow(48, 100, 160, 84);
      txt('CHALLENGES', 128, 106, '#ffe040', { align: 'center' });
      items.forEach((s, i) => { const y = 120 + i * 12; txt(s, 74, y, i === sel ? '#ffe040' : '#fff'); if (i === sel) txt('>', 62 + ((t >> 3) & 1), y, '#ffe040'); });
      txt(tips[sel], 128, 192, '#fff', { align: 'center', outline: '#101848' });
    },
  };
}

// ---------- comic cutscenes between worlds ----------
const COMICS = {
  star: [
    [{ bg: 'grass', hero: 'win0', text: 'BARON STATIC IS BEATEN... BUT A STRANGE SIGNAL BEEPS FROM THE STARS!' }, { bg: 'factory', hero: 'idle0', rocket: true, text: 'SO OUR HERO BUILDS A ROCKET OUT OF SPARE PARTS!' }],
    [{ bg: 'moon', boss: 'mother', text: 'ON STAR ISLE, THE MOTHERSHIP MK II IS WAITING...' }, { bg: 'volcano', hero: 'run2', text: 'NEXT STOP: STAR ISLE! HOLD ON TIGHT!' }],
  ],
  carnival: [
    [{ bg: 'moon', hero: 'win1', text: 'THE MK II IS DOWN! BUT MUSIC DRIFTS ACROSS THE SEA...' }, { bg: 'carnival', text: 'A WHOLE ISLAND OF RIDES, LIGHTS AND CANDY FLOSS!' }],
    [{ bg: 'carnival', boss: 'ringmaster', text: 'BUT THE RINGMASTER HAS STOLEN EVERY SIGNAL BAR FOR HIS SHOW!' }, { bg: 'carnival', hero: 'run2', text: 'THE SHOW MUST GO... WRONG! HERE WE COME!' }],
  ],
};
function ComicScene(kind, next) {
  const pages = COMICS[kind]; let page = 0, t = 0;
  function panel(p, x, y, w, h) {
    ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.translate(x, y); ctx.scale(w / VW, h / (VH * 0.75)); drawParallax(p.bg, t * 0.6); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    if (p.hero) Wally.draw(ctx, x + w * 0.35, y + h - 4, p.hero, 1, { t, sx: 1.6, sy: 1.6 });
    if (p.rocket) { ctx.save(); ctx.translate(x + w * 0.72, y + h - 8); ctx.scale(2, 2); drawRocket(0, 0, t); ctx.restore(); }
    if (p.boss) { ctx.save(); ctx.translate(x + w * 0.62, y + h * 0.45); ctx.scale(1.6, 1.6); stickerArt(p.boss, 0, 0, t); ctx.restore(); }
    ctx.restore();
  }
  return {
    enter() { Audio8.play(kind === 'carnival' ? 'carnival' : 'map'); },
    update() { t++; if (t > 20 && (Input.confirm() || Input.pressed('run'))) { t = 0; Audio8.sfx('select'); if (++page >= pages.length) go(next); } },
    draw() {
      ctx.fillStyle = '#f0e8d0'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e0d4b0'; for (let i = 0; i < VW; i += 4) for (let j = (i / 4) % 2 ? 2 : 0; j < VH; j += 4) ctx.fillRect(i, j, 1, 1);
      const pg = pages[Math.min(page, pages.length - 1)];
      pg.forEach((p, i) => {
        const y = 10 + i * 104; panel(p, 12, y, 232, 70);
        const lines = wrapText(p.text, 36); ctx.fillStyle = '#fff8c0'; ctx.fillRect(12, y + 72, 232, 4 + lines.length * 10); ctx.fillStyle = '#1a1020'; ctx.fillRect(12, y + 72, 232, 1);
        lines.forEach((l, k) => txt(l, 16, y + 75 + k * 10, '#1a1020', { shadow: null }));
      });
      if ((t >> 4) & 1) txt(page < pages.length - 1 ? 'A: NEXT' : 'A: GO!', 244, 214, '#1a1020', { align: 'right', shadow: null });
    },
  };
}

// ---------- Art Gallery: concept art unlocked by trophies ----------
const ART = [
  { name: 'WALLY ISLAND DAWN', need: 2, draw: (t) => { drawParallax('grass', 40); Wally.draw(ctx, 128, 200, 'win1', 1, { t, sx: 3, sy: 3 }); } },
  { name: 'THE STATIC FORTRESS', need: 4, draw: (t) => { drawParallax('castle', 60); ctx.save(); ctx.translate(128, 120); ctx.scale(3, 3); stickerArt('boss', 0, 0, t); ctx.restore(); } },
  { name: 'ICE YETI AMBUSH', need: 6, draw: (t) => { drawParallax('snow', 80); ctx.save(); ctx.translate(150, 120); ctx.scale(3, 3); stickerArt('yeti', 0, 0, t); ctx.restore(); Wally.draw(ctx, 60, 200, 'jump', 1, { t, sx: 2, sy: 2 }); } },
  { name: 'MOTHERSHIP ATTACK', need: 9, draw: (t) => { drawParallax('airship', 30); ctx.save(); ctx.translate(128, 70); ctx.scale(2.4, 2.4); stickerArt('mother', 0, 0, t); ctx.restore(); ctx.fillStyle = 'rgba(95,240,255,0.5)'; ctx.fillRect(122, 90, 12, 134); } },
  { name: 'ROCKET TO THE STARS', need: 12, draw: (t) => { drawParallax('moon', 20); ctx.save(); ctx.translate(128, 170); ctx.scale(4, 4); drawRocket(0, 0, t); ctx.restore(); } },
  { name: 'CANDY DREAMS', need: 15, draw: (t) => { drawParallax('candy', 90); Wally.draw(ctx, 100, 200, 'run3', 1, { t, sx: 2, sy: 2, hero: 'goth' }); Wally.draw(ctx, 160, 200, 'run6', 1, { t, sx: 2, sy: 2, hero: 'doug' }); } },
  { name: 'THE GREATEST SHOW', need: 19, draw: (t) => { drawParallax('carnival', 50); ctx.save(); ctx.translate(128, 130); ctx.scale(3, 3); stickerArt('ringmaster', 0, 0, t); ctx.restore(); } },
  { name: 'HEROES UNITED', need: 24, draw: (t) => { drawParallax('sky', 70); HERO_IDS.forEach((h, i) => Wally.draw(ctx, 40 + i * 44, 200, 'win' + ((t >> 4) & 1), 1, { t, sx: 2, sy: 2, hero: h })); } },
];
function ArtScene() {
  let i = 0, t = 0;
  return {
    enter() { Audio8.play('map'); },
    update() {
      t++;
      if (Input.pressed('right')) { i = (i + 1) % ART.length; Audio8.sfx('select'); } if (Input.pressed('left')) { i = (i + ART.length - 1) % ART.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || Input.confirm() || Input.pressed('run')) go(() => ExtrasScene());
    },
    draw() {
      const a = ART[i], open = Ach.count() >= a.need;
      ctx.save(); a.draw(t); ctx.restore();
      if (!open) { ctx.fillStyle = 'rgba(10,8,20,0.88)'; ctx.fillRect(0, 0, VW, VH); txt('?', 128, 80, '#6a6a8a', { scale: 4, align: 'center' }); txt(`UNLOCK WITH ${a.need} TROPHIES`, 128, 140, '#ffb0b0', { align: 'center' }); txt(`YOU HAVE ${Ach.count()}`, 128, 152, '#fff', { align: 'center' }); }
      else { ctx.fillStyle = 'rgba(240,220,170,0.12)'; ctx.fillRect(0, 0, VW, VH); }
      ctx.strokeStyle = '#c8a050'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, VW - 4, VH - 4);
      drawWindow(30, 4, 196, 20); txt(`${i + 1}/${ART.length} ${open ? a.name : '???'}`, 128, 10, '#ffe040', { align: 'center' });
      txt('< >  BROWSE    B: BACK', 128, 212, '#fff', { align: 'center', outline: '#101848' });
    },
  };
}

// ---------- changing weather: clear, rain, thunderstorms and snow come and go ----------
const WX_THEMES = ['grass', 'sky', 'beach', 'snow', 'candy', 'carnival', 'airship'];
const WX_MSG = { clear: 'THE SKY CLEARS UP', rain: 'IT STARTS TO RAIN!', thunder: 'THUNDERSTORM!', snow: "IT'S SNOWING!" };
function pickWeather(theme, not) {
  const w = { clear: 3, rain: 3, thunder: 2, snow: theme === 'snow' ? 5 : theme === 'beach' ? 1 : 2 };
  if (not) delete w[not];
  let r = Math.random() * Object.values(w).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(w)) { r -= w[k]; if (r <= 0) return k; }
  return 'clear';
}
{
  const _upd = Play.prototype.update;
  Play.prototype.update = function () {
    if (this.wx === undefined) {
      const on = Settings.get('weather') !== false && !this.def.weather && WX_THEMES.includes(this.def.theme) && !this.ta && !this.rush && !this.def.shmup && !this.def.minecart;
      this.wx = on ? { cur: pickWeather(this.def.theme), amt: 0, want: null, timer: 600 + Math.floor(Math.random() * 900), flash: 0, baseIce: !!this.def.ice } : null;
      if (this.wx) { this.def = Object.assign({}, this.def); this.wx.amt = this.wx.cur === 'clear' ? 0 : 1; }
    }
    _upd.call(this);
    const w = this.wx;
    if (!w || this.paused || this.talk) return;
    // change every 15-30 seconds: fade the old weather out, then the new one in
    if (this.state === 'play' && --w.timer <= 0 && !w.want) { w.want = pickWeather(this.def.theme, w.cur); w.timer = 900 + Math.floor(Math.random() * 900); }
    if (w.want) { w.amt -= 0.012; if (w.amt <= 0) { w.amt = 0; w.cur = w.want; w.want = null; this.wxMsg = { s: WX_MSG[w.cur], t: 130 }; if (w.cur === 'thunder') { w.flash = 12; this.lightning(); } } }
    else if (w.cur !== 'clear' && w.amt < 1) w.amt = Math.min(1, w.amt + 0.012);
    this.def.ice = w.baseIce || (w.cur === 'snow' && w.amt > 0.6);
    // thunderstorms: flashes, and the odd lightning bolt striking near you (watch the warning)
    if (w.flash > 0) w.flash--;
    if (w.cur === 'thunder' && w.amt > 0.7 && this.state === 'play') {
      if (--w.nextFlash <= 0 || !(w.nextFlash > 0)) { w.flash = 12; this.lightning(); w.nextFlash = 200 + Math.floor(Math.random() * 300); }
      if (frame % 420 === 210 && !this.bossLock && !this.arena) { const x = this.p.x + ((frame * 53) % 140) - 60; this.ents.push({ type: 'bolt', alive: true, t: 0, x, y: 0, w: 8, h: 8 }); }
    }
  };
  // after each flash the thunder arrives 1 to 5 seconds later, like a real storm: the longer the
  // wait, the further away the lightning was, so the rumble is softer and lower
  Play.prototype.lightning = function () {
    const sec = 1 + Math.random() * 4;
    (this.thunderQ = this.thunderQ || []).push({ t: Math.round(sec * 60), d: (sec - 1) / 4 });
  };
  const _updTh = Play.prototype.update;
  Play.prototype.update = function () {
    const r = _updTh.apply(this, arguments);
    const q = this.thunderQ;
    if (q && q.length && !this.paused) {
      for (const k of q) if (--k.t === 0) { Audio8.thunder(k.d); if (k.d < 0.4) rumble(0.45 - k.d, 300); }
      this.thunderQ = q.filter((k) => k.t > 0);
    }
    return r;
  };
  const _rn = Play.prototype.rainNow;
  Play.prototype.rainNow = function () { const w = this.wx; if (w) return w.cur === 'rain' || w.cur === 'thunder' ? w.amt * (w.cur === 'thunder' ? 1 : 0.8) : 0; return _rn.call(this); };
  const _ue = Play.prototype.updateEnt;
  Play.prototype.updateEnt = function (e) {
    if (e.type !== 'bolt') return _ue.call(this, e);
    if (this._p2ctx) return;
    e.t++;
    if (e.t === 1) { let y = 0; while (y < 13 && !SOLID.has(this.tile(Math.floor((e.x + 4) / TS), y))) y++; e.gy = y * TS; }
    if (e.t === 60) {
      Audio8.thunder(0); this.shake = Math.max(this.shake, 8); if (this.wx) this.wx.flash = 8; rumble(0.6, 200); // a strike right next to you: the crack comes at once
      for (let i = 0; i < 6; i++) this.parts.push({ k: 'spark', x: e.x + 4 + (i - 3) * 3, y: e.gy - 4, life: 14 });
      const p = this.p; if (this.state === 'play' && Math.abs(p.x + p.w / 2 - (e.x + 4)) < 14 && p.y + p.h > e.gy - 60) this.hurt();
    }
    if (e.t > 72) e.alive = false;
  };
  const _de = Play.prototype.drawEnt;
  Play.prototype.drawEnt = function (e, cx) {
    if (e.type !== 'bolt') return _de.call(this, e, cx);
    const x = Math.round(e.x - cx) + 4, gy = e.gy || 192;
    if (e.t < 60) { if ((e.t >> 2) & 1) { ctx.fillStyle = 'rgba(255,240,120,0.8)'; ctx.fillRect(x - 7, gy - 2, 14, 2); ctx.fillRect(x - 1, gy - 8, 2, 4); } return; }
    ctx.fillStyle = '#ffffff'; let bx = x;
    for (let y = 0; y < gy; y += 6) { const nx = x + (((y * 7 + e.t) % 9) - 4); ctx.fillRect(Math.min(bx, nx), y, Math.abs(nx - bx) + 2, 6); bx = nx; }
    ctx.fillStyle = 'rgba(255,255,160,0.6)'; ctx.fillRect(x - 3, 0, 6, gy);
  };
  const _dw = Play.prototype.drawWeather;
  Play.prototype.drawWeather = function (cx) {
    _dw.call(this, cx);
    const w = this.wx; if (!w) return;
    if (w.cur === 'thunder') { ctx.fillStyle = `rgba(10,10,30,${0.25 * w.amt})`; ctx.fillRect(0, 0, VW, VH); }
    if (w.cur === 'snow' && w.amt > 0) {
      ctx.save(); ctx.globalAlpha = w.amt; drawSnow(cx); ctx.fillStyle = 'rgba(230,240,255,0.12)'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#ffffff'; for (let i = 0; i < 30; i++) { const x = (((i * 89 - cx * 0.9 + Math.sin(frame * 0.03 + i) * 8) % VW) + VW) % VW, y = (i * 61 + frame * (0.6 + (i % 4) * 0.25)) % VH; ctx.fillRect(Math.round(x), Math.round(y), 2, 2); }
      ctx.restore();
    }
    if (w.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${w.flash / 16})`; ctx.fillRect(0, 0, VW, VH); }
  };
  const _dh = Play.prototype.drawHUD;
  Play.prototype.drawHUD = function () {
    _dh.call(this);
    const w = this.wx; if (!w) return;
    if (this.wxMsg && this.wxMsg.t > 0) { this.wxMsg.t--; txt(this.wxMsg.s, 128, 64, w.cur === 'thunder' ? '#ffe060' : w.cur === 'snow' ? '#e0f0ff' : w.cur === 'rain' ? '#a0c8ff' : '#ffe8a0', { align: 'center', outline: '#101848' }); }
    if (w.cur === 'clear' && !w.want) return;
    const x = 238, y = 26, k = w.want ? w.cur : w.cur;
    ctx.fillStyle = 'rgba(16,24,72,0.7)'; ctx.fillRect(x - 2, y - 1, 16, 12);
    if (k === 'snow') { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 5, y, 2, 9); ctx.fillRect(x + 1, y + 4, 10, 2); ctx.fillRect(x + 2, y + 1, 2, 2); ctx.fillRect(x + 8, y + 7, 2, 2); ctx.fillRect(x + 8, y + 1, 2, 2); ctx.fillRect(x + 2, y + 7, 2, 2); }
    else if (k !== 'clear') { ctx.fillStyle = '#c8d0e0'; ctx.fillRect(x + 1, y + 2, 10, 4); ctx.fillRect(x + 3, y, 6, 2); ctx.fillStyle = k === 'thunder' ? '#ffe040' : '#80b8ff'; if (k === 'thunder') { ctx.fillRect(x + 5, y + 6, 2, 2); ctx.fillRect(x + 4, y + 8, 2, 2); } else { ctx.fillRect(x + 2, y + 7, 1, 2); ctx.fillRect(x + 6, y + 8, 1, 2); ctx.fillRect(x + 9, y + 7, 1, 2); } }
  };
}

// ---------- snow builds up on the ground and slows you down ----------
const SNOW_MAX = 9;
{
  const isTop = (pl, tx, ty) => SOLID.has(pl.tile(tx, ty)) && !SOLID.has(pl.tile(tx, ty - 1)) && pl.tile(tx, ty - 1) !== '=';
  const _upd = Play.prototype.update;
  Play.prototype.update = function () {
    _upd.call(this);
    const w = this.wx;
    if (!w || this.paused || this.talk) return;
    if (!this.snowD) this.snowD = new Float32Array(this.lv.w);
    this.def.ice = w.baseIce; // deep snow is sticky rather than slippery
    const snowing = w.cur === 'snow' ? w.amt : 0, t0 = Math.max(0, Math.floor(this.cam.x / TS) - 24), t1 = Math.min(this.lv.w - 1, t0 + 64);
    for (let tx = t0; tx <= t1; tx++) {
      const d = this.snowD[tx];
      if (snowing > 0.3) this.snowD[tx] = Math.min(SNOW_MAX, d + 0.0055 * snowing * (0.8 + ((tx * 37) % 10) / 25));
      else if (d > 0) this.snowD[tx] = Math.max(0, d - (w.cur === 'rain' || w.cur === 'thunder' ? 0.012 : 0.006));
    }
  };
  Play.prototype.snowAt = function (b) { // depth of snow under a body standing on the ground
    if (!this.snowD || !b.onGround) return 0;
    const tx = Math.floor((b.x + b.w / 2) / TS), ty = Math.floor((b.y + b.h + 1) / TS);
    return isTop(this, tx, ty) ? this.snowD[tx] || 0 : 0;
  };
  const _up = Play.prototype.updatePlayer;
  Play.prototype.updatePlayer = function () {
    _up.call(this);
    const p = this.p, d = this.snowAt(p);
    if (d > 0.5 && !p.riding && !(p.dashT > 0) && !(p.charge > 0)) {
      p.vx *= 1 - 0.15 * (d / SNOW_MAX); // wading through deep snow
      if (Math.abs(p.vx) > 0.3 && frame % 5 === 0) this.parts.push({ k: 'dust', x: p.x + p.w / 2 - p.face * 4, y: p.y + p.h - 2, vx: -p.face * 0.4, vy: -0.6, life: 14 });
      if (d > SNOW_MAX * 0.7 && this.state === 'play' && !p.snowTip) { p.snowTip = true; this.parts.push({ k: 'text', s: 'DEEP SNOW! JUMP OR DASH', x: p.x - 40, y: p.y - 18, vy: -0.4, life: 90 }); }
    }
    if (p.riding && d > 0.5 && frame % 6 === 0) this.parts.push({ k: 'dust', x: p.x + p.w / 2, y: p.y + p.h - 2, vx: 0, vy: -0.5, life: 12 }); // Dino ploughs through
  };
  const clearSnow = (pl, x, r) => { if (!pl.snowD) return; for (let tx = Math.floor((x - r) / TS); tx <= Math.floor((x + r) / TS); tx++) if (tx >= 0 && tx < pl.lv.w) pl.snowD[tx] = 0; };
  const _ex = Play.prototype.explode;
  Play.prototype.explode = function (x, y) { _ex.call(this, x, y); clearSnow(this, x, 36); };
  const _uf = Play.prototype.updateFires;
  Play.prototype.updateFires = function () { _uf.call(this); for (const f of this.fires) if (!f.frost) clearSnow(this, f.x + 4, 8); };
  const _dp = Play.prototype.drawPlayer;
  Play.prototype.drawPlayer = function (cx) {
    _dp.call(this, cx);
    if (!this.snowD) return;
    // snow drifts on every exposed ground top, drawn over feet so you wade through it
    const t0 = Math.floor(cx / TS), shade = (frame >> 4) & 1;
    for (let tx = t0; tx <= t0 + 16 && tx < this.lv.w; tx++) {
      const d = this.snowD[tx]; if (!d || d < 0.4) continue;
      const dl = this.snowD[tx - 1] || 0, dr = this.snowD[tx + 1] || 0, X = tx * TS - cx;
      for (let ty = 1; ty < 14; ty++) {
        if (!isTop(this, tx, ty)) continue;
        const Y = ty * TS;
        for (let i = 0; i < 16; i += 2) { const h = Math.round(d + (i < 8 ? (dl - d) * (8 - i) / 16 : (dr - d) * (i - 8) / 16) + Math.sin((tx * 16 + i) * 0.7) * 0.8); if (h <= 0) continue; ctx.fillStyle = '#f4f8ff'; ctx.fillRect(X + i, Y - h, 2, h); ctx.fillStyle = '#ffffff'; ctx.fillRect(X + i, Y - h, 2, 1); }
        ctx.fillStyle = '#c8d8f0'; ctx.fillRect(X, Y - 1, 16, 1);
        if (d > 5 && (tx + shade) % 5 === 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(X + 6, Y - Math.round(d) - 1, 2, 1); }
      }
    }
  };
}
