'use strict';
// =====================================================================
// Update 2.2 (part 2): making things
//  - COMIC MAKER (Extras): turn your photos into a 4-panel comic with a
//    title and speech bubbles, then save or share it
//  - SONG CODES (Extras): share your Music Maker songs as codes (with a
//    QR code) and load songs friends send you
//  - BOSS CREATOR (Extras): build your own boss from a body, colour,
//    eyes, size, health, speed, two attacks and a taunt; test-fight it,
//    and pick MY BOSS for a Level Maker course
// =====================================================================
const U22b = (() => {
  const PP = Play.prototype;
  const editText = (title, cur, cb) => { if (typeof textBox === 'function') textBox(title, cur, (v) => cb(v)); else { const v = window.prompt(title, cur); cb(v); } };

  // ---------------- comic maker ----------------
  const PHRASES = ['HERE WE GO!', 'WAHOO!', 'UH-OH...', 'NOT AGAIN!', 'I GOT THIS!', 'BOING!', 'THE END!', '?!'];
  const imgCache = new Map();
  const getImg = (src, onload) => { let im = imgCache.get(src); if (!im) { im = new Image(); im.onload = onload; im.src = src; imgCache.set(src, im); } return im.complete && im.naturalWidth ? im : null; };
  function renderComic(st, photos, onload) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 448; const x = c.getContext('2d');
    x.fillStyle = '#fffaf0'; x.fillRect(0, 0, 512, 448); x.fillStyle = '#1a1020'; x.font = 'bold 28px "Trebuchet MS", sans-serif'; x.textAlign = 'center'; x.fillText(st.title, 256, 38);
    const P = [[12, 52], [262, 52], [12, 252], [262, 252]];
    P.forEach(([px, py], i) => {
      const w = 238, h = 188; x.save(); x.beginPath(); x.rect(px, py, w, h); x.clip(); x.fillStyle = '#c8d8f0'; x.fillRect(px, py, w, h);
      const ph = photos[st.pick[i] % Math.max(1, photos.length)], im = ph && getImg(ph.img, onload);
      if (im) { const k = Math.max(w / im.width, h / im.height); x.drawImage(im, px + (w - im.width * k) / 2, py + (h - im.height * k) / 2, im.width * k, im.height * k); }
      x.restore(); x.strokeStyle = '#1a1020'; x.lineWidth = 4; x.strokeRect(px, py, w, h);
      const s = st.say[i]; if (!s) return;
      x.font = 'bold 15px "Trebuchet MS", sans-serif'; const words = s.split(' '), lines = []; let cur = ''; for (const wd of words) { if ((cur + ' ' + wd).trim().length > 16) { lines.push(cur.trim()); cur = wd; } else cur += ' ' + wd; } lines.push(cur.trim());
      const bw = Math.min(200, Math.max(...lines.map((l) => x.measureText(l).width)) + 24), bh = lines.length * 17 + 12, bx = px + 10 + (i % 2) * (w - bw - 20), by = py + 10;
      x.fillStyle = '#ffffff'; x.strokeStyle = '#1a1020'; x.lineWidth = 2.5; x.beginPath(); x.ellipse(bx + bw / 2, by + bh / 2, bw / 2, bh / 2, 0, 0, Math.PI * 2); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(bx + bw / 2 - 8, by + bh - 4); x.lineTo(bx + bw / 2 + (i % 2 ? 18 : -18), by + bh + 16); x.lineTo(bx + bw / 2 + 8, by + bh - 2); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = '#ffffff'; x.fillRect(bx + bw / 2 - 7, by + bh - 6, 14, 5);
      x.fillStyle = '#1a1020'; lines.forEach((l, k) => x.fillText(l, bx + bw / 2, by + 20 + k * 17));
    });
    x.font = 'bold 11px "Trebuchet MS", sans-serif'; x.fillStyle = '#7a7a8a'; x.textAlign = 'right'; x.fillText('MADE IN WALLYMAN WORLD', 500, 444);
    return c;
  }
  function ComicMakerScene() {
    const photos = PhotoAlbum.list(), st = { title: 'MY ADVENTURE', pick: [0, 1, 2, 3], say: [PHRASES[0], PHRASES[1], PHRASES[2], PHRASES[6]] };
    let sel = 0, t = 0, dom = false, page = null, msg = ''; const dirty = () => { page = null; };
    const ROWS = ['TITLE', 'PANEL 1', 'PANEL 2', 'PANEL 3', 'PANEL 4', 'SAVE + SHARE', 'BACK'];
    return {
      enter() { Audio8.play('menu'); },
      update() {
        t++; if (dom) return;
        if (!photos.length) { if (Input.confirm() || Input.pressed('back')) go(() => ExtrasList('COMIC MAKER')); return; }
        if (Input.pressed('down')) { sel = (sel + 1) % ROWS.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + ROWS.length - 1) % ROWS.length; Audio8.sfx('select'); }
        const d = (Input.pressed('right') ? 1 : 0) - (Input.pressed('left') ? 1 : 0);
        if (d && sel >= 1 && sel <= 4) { st.pick[sel - 1] = (st.pick[sel - 1] + d + photos.length) % photos.length; dirty(); Audio8.sfx('select'); }
        if (Input.pressed('special') && sel >= 1 && sel <= 4) { const k = PHRASES.indexOf(st.say[sel - 1]); st.say[sel - 1] = PHRASES[(k + 1) % PHRASES.length]; dirty(); Audio8.sfx('select'); }
        if (Input.pressed('back') || (Input.confirm() && sel === 6)) { go(() => ExtrasList('COMIC MAKER')); return; }
        if (Input.confirm() && sel === 0) { dom = true; editText('COMIC TITLE', st.title, (v) => { dom = false; if (v) { st.title = String(v).toUpperCase().slice(0, 28); dirty(); } }); }
        if (Input.confirm() && sel >= 1 && sel <= 4) { dom = true; editText(`WHAT DO THEY SAY IN PANEL ${sel}?`, st.say[sel - 1], (v) => { dom = false; if (v !== null && v !== undefined) { st.say[sel - 1] = String(v).toUpperCase().slice(0, 40); dirty(); } }); }
        if (Input.confirm() && sel === 5) { const c = renderComic(st, photos, dirty); if (typeof shareCard === 'function') shareCard(c, 'comic'); msg = 'SAVED TO YOUR PHOTO ALBUM!'; Audio8.sfx('oneup'); try { Ach.unlock('comic'); } catch (e) { /* ignore */ } }
      },
      draw() {
        drawParallax('sky', t * 0.3);
        if (!photos.length) { drawWindow(24, 70, 208, 70); txt('NO PHOTOS YET!', 128, 82, '#ffe040', { align: 'center' }); txt('PAUSE IN A LEVEL AND PICK', 128, 100, '#fff', { align: 'center' }); txt('PHOTO MODE TO TAKE SOME.', 128, 112, '#fff', { align: 'center' }); return; }
        if (!page) page = renderComic(st, photos, dirty);
        ctx.fillStyle = '#1a1020'; ctx.fillRect(4, 22, 132, 118); ctx.drawImage(page, 6, 24, 128, 112);
        txt('COMIC MAKER', 128, 6, '#ffe040', { align: 'center', outline: '#101848' });
        drawWindow(140, 22, 112, 118); ROWS.forEach((r, i) => { const y = 30 + i * 14; txt(r, 154, y, i === sel ? '#ffe040' : '#fff'); if (i === sel) txt('>', 144 + ((t >> 3) & 1), y, '#ffe040'); });
        drawWindow(4, 146, 248, 62);
        const tips = sel === 0 ? ['A: TYPE A TITLE'] : sel <= 4 ? [`PHOTO ${st.pick[sel - 1] + 1}/${photos.length}  <> CHANGE PHOTO`, 'A: TYPE WORDS  S: QUICK WORDS', `"${st.say[sel - 1]}"`.replace(/"/g, "'")] : sel === 5 ? ['A: SAVE THE COMIC (512X448)', 'TO YOUR PHOTO ALBUM AND', 'SHARE OR DOWNLOAD IT'] : ['A: BACK TO EXTRAS'];
        tips.forEach((l, k) => txt(l, 128, 154 + k * 12, '#fff', { align: 'center' }));
        if (msg) txt(msg, 128, 196, '#40e090', { align: 'center' });
      },
    };
  }

  // ---------------- song codes ----------------
  const SongCode = {
    encode: (s) => 'WMS1-' + btoa(JSON.stringify([s.name, s.bpm, s.chords, s.drums, s.bass, s.lead, s.notes.map((n) => (n < 0 ? '.' : n.toString(36))).join('')])).replace(/=+$/, ''),
    decode(code) { try { const m = String(code).replace(/\s+/g, '').match(/^WMS1-([A-Za-z0-9+/]+)=*$/); if (!m) return null; const a = JSON.parse(atob(m[1] + '==='.slice((m[1].length + 3) % 4))); if (!Array.isArray(a) || a.length !== 7 || typeof a[6] !== 'string' || a[6].length !== 32) return null; const s = MusicMaker.blank(); [s.name, s.bpm, s.chords, s.drums, s.bass, s.lead] = a; s.name = String(s.name).toUpperCase().slice(0, 16); s.bpm = clamp(+s.bpm || 132, 60, 220); s.notes = [...a[6]].map((ch) => (ch === '.' ? -1 : parseInt(ch, 36))); if (s.notes.some((n) => Number.isNaN(n) || n > 40)) return null; return s; } catch (e) { return null; } },
  };
  function SongCodesScene() {
    let slot = 0, sel = 0, t = 0, dom = false, msg = ''; const ROWS = ['SONG SLOT', 'SHARE THIS SONG', 'LOAD A SONG CODE', 'PLAY / STOP', 'BACK']; let playing = false;
    return {
      enter() { Audio8.play('menu'); },
      update() {
        t++; if (dom) return;
        if (Input.pressed('down')) { sel = (sel + 1) % ROWS.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + ROWS.length - 1) % ROWS.length; Audio8.sfx('select'); }
        const d = (Input.pressed('right') ? 1 : 0) - (Input.pressed('left') ? 1 : 0); if (d && sel === 0) { slot = (slot + d + 3) % 3; Audio8.sfx('select'); }
        if (Input.pressed('back') || (Input.confirm() && sel === 4)) { Audio8.stop(); go(() => ExtrasList('SONG CODES')); return; }
        const s = MusicMaker.songs[slot];
        if (Input.confirm() && sel === 1) { if (!s) { msg = 'THIS SLOT IS EMPTY'; Audio8.sfx('bump'); } else { dom = true; codeBox(`SONG CODE: ${s.name}`, SongCode.encode(s), null, () => { dom = false; }); } }
        if (Input.confirm() && sel === 2) { dom = true; codeBox(`PASTE A SONG CODE FOR SLOT ${slot + 1}`, '', (code) => { const ns = SongCode.decode(code); if (!ns) return false; MusicMaker.save(slot, ns); msg = `LOADED '${ns.name}' INTO SLOT ${slot + 1}`; return true; }, () => { dom = false; }); }
        if (Input.confirm() && sel === 3) { if (playing) { Audio8.stop(); playing = false; } else if (s) { Audio8.play(MusicMaker.key(slot)); playing = true; } else { msg = 'THIS SLOT IS EMPTY'; Audio8.sfx('bump'); } }
      },
      draw() {
        drawParallax('neon', t * 0.3); drawWindow(28, 40, 200, 150); txt('SONG CODES', 128, 48, '#ffe040', { align: 'center', scale: 2 });
        const s = MusicMaker.songs[slot]; txt(s ? `${s.name}  ${s.bpm} BPM` : '(EMPTY - MAKE ONE IN MUSIC MAKER)', 128, 70, s ? '#a8f0ff' : '#a8b0d8', { align: 'center' });
        ROWS.forEach((r, i) => { const y = 90 + i * 16; txt(i === 0 ? `SONG SLOT  < ${slot + 1} >` : r, 60, y, i === sel ? '#ffe040' : '#fff'); if (i === sel) txt('>', 48 + ((t >> 3) & 1), y, '#ffe040'); });
        if (msg) txt(msg, 128, 176, '#40e090', { align: 'center' });
      },
    };
  }

  // ---------------- boss creator ----------------
  const OPT = { body: ['BLOB', 'ROBOT', 'BEAST', 'GHOST'], color: ['#e83850', '#2f62d0', '#3cc048', '#9a4ae8', '#f2a020', '#30c8d0', '#e060c0', '#5a5a6a'], eyes: ['ANGRY', 'CUTE', 'ONE EYE', 'SHADES'], size: ['SMALL', 'MEDIUM', 'BIG'], speed: ['SLOW', 'NORMAL', 'FAST'], atk: ['NONE', 'SHOOT', 'HOP', 'DIVE', 'SUMMON'] };
  const TAUNTS = ['YOU SHALL NOT PASS!', 'I AM THE BOSS OF BOSSES!', 'PREPARE TO BE STOMPED... BY ME!', 'NOBODY BEATS MY HIGH SCORE!', 'THIS IS MY LEVEL NOW!', 'ROAR! (THAT MEANS HELLO)'];
  const COLNAMES = ['RED', 'BLUE', 'GREEN', 'PURPLE', 'ORANGE', 'TEAL', 'PINK', 'GREY'];
  const KEY = 'wallyman-myboss';
  const blank = () => ({ name: 'BIG BOSS', body: 0, color: 0, eyes: 0, size: 1, hp: 6, speed: 1, atk1: 1, atk2: 2, taunt: 0 });
  const load = () => Object.assign(blank(), lsJ(KEY, {}));
  const shade = (h, k) => { const n = parseInt(h.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))); return `rgb(${c.join(',')})`; };
  function drawMyBoss(cfg, x, y, t, e) {
    if (e && e.inv > 0 && (frame >> 2) & 1) return;
    const k = [0.8, 1, 1.3][cfg.size], col = OPT.color[cfg.color], w = 32 * k, h = 32 * k, cx = x + w / 2, by = y + h;
    ctx.save(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#1a1020';
    const g = ctx.createLinearGradient(x, y, x, by); g.addColorStop(0, shade(col, 0.35)); g.addColorStop(1, shade(col, -0.3)); ctx.fillStyle = g;
    const bob = cfg.body === 3 ? Math.sin(t * 0.08) * 2 : 0;
    ctx.beginPath();
    if (cfg.body === 0) { ctx.moveTo(x, by); ctx.quadraticCurveTo(x - 2, y, cx, y); ctx.quadraticCurveTo(x + w + 2, y, x + w, by); ctx.closePath(); }
    else if (cfg.body === 1) { const r = 5 * k; ctx.moveTo(x + r, y + 4 * k); ctx.arcTo(x + w, y + 4 * k, x + w, by, r); ctx.arcTo(x + w, by, x, by, r); ctx.arcTo(x, by, x, y, r); ctx.arcTo(x, y + 4 * k, x + w, y + 4 * k, r); ctx.closePath(); }
    else if (cfg.body === 2) { for (let i = 0; i <= 20; i++) { const a = Math.PI + (i / 20) * Math.PI, r = (i % 2 ? 1.06 : 1); ctx.lineTo(cx + Math.cos(a) * w / 2 * r, by - 4 * k + Math.sin(a) * (h - 4 * k) * r); } ctx.lineTo(x + w, by); ctx.lineTo(x, by); ctx.closePath(); }
    else { ctx.moveTo(x, by + bob); ctx.lineTo(x, y + h * 0.4 + bob); ctx.quadraticCurveTo(x, y + bob, cx, y + bob); ctx.quadraticCurveTo(x + w, y + bob, x + w, y + h * 0.4 + bob); ctx.lineTo(x + w, by + bob); for (let i = 0; i < 4; i++) { const ax = x + w - (i + 1) * w / 4; ctx.quadraticCurveTo(ax + w / 8, by + bob + ((t >> 3) + i) % 2 * 4 - 4, ax, by + bob); } ctx.closePath(); ctx.globalAlpha = 0.85; }
    ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
    if (cfg.body === 1) { ctx.beginPath(); ctx.moveTo(cx, y + 4 * k); ctx.lineTo(cx, y - 4 * k); ctx.stroke(); ctx.fillStyle = (t >> 3) & 1 ? '#ff3040' : '#ffe040'; ctx.beginPath(); ctx.arc(cx, y - 5 * k, 2 * k, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#c8ccd8'; for (const bx of [x + 4 * k, x + w - 4 * k]) { ctx.beginPath(); ctx.arc(bx, by - 5 * k, 1.4 * k, 0, Math.PI * 2); ctx.fill(); } }
    if (cfg.body === 2) { ctx.fillStyle = '#f0e8c8'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + d * w * 0.3, y + 6 * k); ctx.lineTo(cx + d * w * 0.42, y - 5 * k); ctx.lineTo(cx + d * w * 0.18, y + 4 * k); ctx.closePath(); ctx.fill(); ctx.stroke(); } ctx.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) { const tx = cx - 6 * k + i * 4 * k; ctx.beginPath(); ctx.moveTo(tx, by - 9 * k); ctx.lineTo(tx + 1.5 * k, by - 5 * k); ctx.lineTo(tx + 3 * k, by - 9 * k); ctx.fill(); } }
    const ey = y + h * 0.42 + bob, hurt = e && e.hp < e.maxHp;
    const eye = (ex, r) => { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = hurt ? '#ff3040' : '#1a1020'; ctx.beginPath(); ctx.arc(ex + r * 0.2, ey + r * 0.15, r * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ex + r * 0.05, ey - r * 0.15, r * 0.18, 0, Math.PI * 2); ctx.fill(); };
    if (cfg.eyes === 0) { eye(cx - 6 * k, 3.4 * k); eye(cx + 6 * k, 3.4 * k); ctx.lineWidth = 1.6 * k; ctx.beginPath(); ctx.moveTo(cx - 10 * k, ey - 5 * k); ctx.lineTo(cx - 3 * k, ey - 3 * k); ctx.moveTo(cx + 10 * k, ey - 5 * k); ctx.lineTo(cx + 3 * k, ey - 3 * k); ctx.stroke(); }
    else if (cfg.eyes === 1) { eye(cx - 6 * k, 4.4 * k); eye(cx + 6 * k, 4.4 * k); ctx.fillStyle = 'rgba(255,120,150,0.6)'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + d * 11 * k, ey + 5 * k, 2.4 * k, 1.4 * k, 0, 0, Math.PI * 2); ctx.fill(); } }
    else if (cfg.eyes === 2) eye(cx, 6 * k);
    else { ctx.fillStyle = '#1a1020'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + d * 6 * k, ey, 5 * k, 3.4 * k, 0, 0, Math.PI * 2); ctx.fill(); } ctx.fillRect(cx - 2 * k, ey - 1 * k, 4 * k, 1.6 * k); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(cx - 9 * k, ey - 2 * k, 3 * k, 1.2 * k); }
    ctx.restore();
  }
  function BossMakerScene(note) {
    const cfg = load(); let sel = 0, t = 0, dom = false, msg = note || '';
    const ROWS = ['NAME', 'BODY', 'COLOUR', 'EYES', 'SIZE', 'HEALTH', 'SPEED', 'ATTACK 1', 'ATTACK 2', 'TAUNT', 'TEST FIGHT', 'SAVE', 'BACK'];
    const val = (r) => ({ NAME: cfg.name, BODY: OPT.body[cfg.body], COLOUR: COLNAMES[cfg.color], EYES: OPT.eyes[cfg.eyes], SIZE: OPT.size[cfg.size], HEALTH: String(cfg.hp), SPEED: OPT.speed[cfg.speed], 'ATTACK 1': OPT.atk[cfg.atk1], 'ATTACK 2': OPT.atk[cfg.atk2], TAUNT: String(cfg.taunt + 1) }[r]);
    const step = (r, d) => { const cyc = (k, n) => { cfg[k] = (cfg[k] + d + n) % n; }; ({ BODY: () => cyc('body', 4), COLOUR: () => cyc('color', 8), EYES: () => cyc('eyes', 4), SIZE: () => cyc('size', 3), HEALTH: () => { cfg.hp = clamp(cfg.hp + d, 3, 12); }, SPEED: () => cyc('speed', 3), 'ATTACK 1': () => cyc('atk1', 5), 'ATTACK 2': () => cyc('atk2', 5), TAUNT: () => cyc('taunt', TAUNTS.length) }[r] || (() => {}))(); };
    return {
      enter() { Audio8.play('menu'); },
      update() {
        t++; if (dom) return;
        if (Input.pressed('down')) { sel = (sel + 1) % ROWS.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + ROWS.length - 1) % ROWS.length; Audio8.sfx('select'); }
        const d = (Input.pressed('right') ? 1 : 0) - (Input.pressed('left') ? 1 : 0), r = ROWS[sel]; if (d) { step(r, d); Audio8.sfx('select'); }
        if (Input.pressed('back') || (Input.confirm() && r === 'BACK')) { go(() => ExtrasList('BOSS CREATOR')); return; }
        if (Input.confirm()) {
          if (r === 'NAME') { dom = true; editText('NAME YOUR BOSS', cfg.name, (v) => { dom = false; if (v) cfg.name = String(v).toUpperCase().replace(/[^A-Z0-9 !?'.-]/g, '').slice(0, 16) || cfg.name; }); }
          else if (r === 'SAVE') { lsS(KEY, cfg); msg = 'SAVED! PICK MY BOSS IN THE LEVEL MAKER'; Audio8.sfx('oneup'); try { Ach.unlock('bossmaker'); } catch (e) { /* ignore */ } }
          else if (r === 'TEST FIGHT') { lsS(KEY, cfg); TEST.on = true; Audio8.sfx('confirm'); go(() => IntroScene(TLI, false)); }
          else if (d === 0) { step(r, 1); Audio8.sfx('select'); }
        }
      },
      draw() {
        drawParallax('castle', t * 0.3); txt('BOSS CREATOR', 128, 4, '#ffe040', { align: 'center', outline: '#101848' });
        drawWindow(4, 16, 132, 196); ROWS.forEach((r, i) => { const y = 24 + i * 14, on = i === sel; txt(r, 18, y, on ? '#ffe040' : '#fff'); const v = val(r); if (v) txt(v.length > 9 ? v.slice(0, 9) : v, 130, y, on ? '#ffe040' : '#a8f0ff', { align: 'right' }); if (on) txt('>', 8 + ((t >> 3) & 1), y, '#ffe040'); });
        drawWindow(140, 16, 112, 140); const k = [0.8, 1, 1.3][cfg.size]; drawMyBoss(cfg, 196 - 16 * k, 120 - 32 * k, frame, null);
        txt(cfg.name, 196, 128, '#ffe040', { align: 'center' }); txt(`HP ${cfg.hp}`, 196, 140, '#fff', { align: 'center' });
        drawWindow(140, 160, 112, 52); const tl = TAUNTS[cfg.taunt].split(' '), l1 = []; while (tl.length && (l1.join(' ') + ' ' + tl[0]).length <= 16) l1.push(tl.shift()); txt(`'${l1.join(' ')}`, 196, 168, '#fff', { align: 'center' }); txt(`${tl.join(' ')}'`, 196, 180, '#fff', { align: 'center' });
        if (msg) txt(msg, 196, 196, '#40e090', { align: 'center' });
      },
    };
  }
  // the test arena (level 137)
  const TLI = LEVELS.length;
  LEVELS.push({ name: 'BOSS TEST ARENA', theme: 'castle', music: 'castle', width: 40, reserved: true, noAuto: true, bossTest: true, miniArena: [1, 38], tag: 'BOSS', world: 'BOSS CREATOR',
    build(b) { b.ground(0, 39).fill(0, 0, 0, 11, 'X').fill(39, 0, 39, 11, 'X').set(3, 11, '@').set(30, 10, '§'); } });
  const TEST = { on: false };
  { const _M = MapScene; MapScene = function (...a) { if (TEST.on) { TEST.on = false; return BossMakerScene(TEST.won ? 'YOU BEAT IT! TOO EASY? MAKE IT HARDER!' : 'TEST OVER'); } return _M(...a); }; } // eslint-disable-line no-func-assign
  { const _d = PP.die; PP.die = function () { if (this.def.bossTest && this.state === 'play') { this.state = 'done'; TEST.won = false; go(() => { TEST.on = false; return BossMakerScene('IT BEAT YOU! TRY AGAIN.'); }); return; } return _d.apply(this, arguments); }; }

  // ---------------- your boss in levels ----------------
  { const _sp = PP.spawn;
    PP.spawn = function (sp) {
      if (sp.t === '§') { const cfg = load(), k = [0.8, 1, 1.3][cfg.size], w = Math.round(32 * k), h = Math.round(32 * k), hp = cfg.hp + (this.diff === 'hard' ? 1 : this.diff === 'easy' && cfg.hp > 3 ? -1 : 0);
        if (typeof BOSS_NAMES !== 'undefined') BOSS_NAMES.myboss = cfg.name; if (typeof BOSS_TALK !== 'undefined') BOSS_TALK.myboss = [['boss', TAUNTS[cfg.taunt]], ['hero', `${cfg.name}? NEVER HEARD OF YOU!`]];
        this.ents.push({ type: 'myboss', cfg, yeti: true, enemy: true, alive: true, mini: cfg.name, hp, maxHp: hp, inv: 0, t: 0, x: sp.x * TS, y: (sp.y + 1) * TS - h, w, h, vx: 0, vy: 0, state: 'walk', act: 90, n: 0 });
        return; }
      return _sp.call(this, sp);
    };
  }
  { const _ue = PP.updateEnt;
    PP.updateEnt = function (e) {
      if (e.type !== 'myboss') return _ue.call(this, e);
      const p = this.p, c = e.cfg, sp = [0.6, 1, 1.5][c.speed], ghost = c.body === 3, floor = 12 * TS - e.h, ar = this.def.yetiArena || this.def.miniArena || [0, this.lv.w - 1];
      if (e.inv > 0) e.inv--;
      if (e.dying) { if (this.def.bossTest && !TEST.won) { TEST.won = true; this.parts.push({ k: 'text', s: 'YOU WIN!', x: 128, y: 80, vy: 0, life: 120, fixed: true }); } e.vy = (e.vy || 0) + 0.3; e.y += e.vy; if (e.y > VH + 40) e.alive = false; return; }
      if (!e.active) { if (p.x > ar[0] * TS + 24) this.activateMini(e); return; }
      if (this.talk) return;
      e.t++; const slow = this.freezeT > 0;
      if (!slow && --e.act <= 0) { const atks = [c.atk1, c.atk2].filter((a) => a > 0); e.n++; if (e.state === 'walk' && atks.length) { e.atk = atks[e.n % atks.length]; e.state = 'atk'; e.act = 80; e.started = false; } else { e.state = 'walk'; e.act = Math.round(90 / sp); } }
      if (e.state === 'walk' && !slow) { e.vx = (p.x < e.x ? -0.7 : 0.7) * sp; e.x += e.vx; }
      if (e.state === 'atk' && !slow) {
        const A = OPT.atk[e.atk];
        if (A === 'SHOOT' && e.act % 24 === 0) { const a = Math.atan2(p.y - e.y, p.x - e.x); this.ents.push({ type: 'shade', alive: true, t: 0, x: e.x + e.w / 2, y: e.y + e.h / 3, w: 8, h: 8, vx: Math.cos(a) * 1.8 * sp, vy: Math.sin(a) * 1.8 * sp }); Audio8.sfx('zap'); }
        if (A === 'HOP' && !e.started && e.y >= floor - 1) { e.started = true; e.vy = -6.2; e.vx = (p.x < e.x ? -1.2 : 1.2) * sp; Audio8.sfx('jump'); }
        if (A === 'HOP' && e.started) e.x += e.vx;
        if (A === 'DIVE') { if (e.act > 40) { e.vy = 0; e.y += (30 - e.y) * 0.1; e.x += clamp(p.x - e.x, -2.5, 2.5) * sp; } else if (!e.started) { e.started = true; e.vy = 7; Audio8.sfx('swoop'); } }
        if (A === 'SUMMON' && !e.started) { e.started = true; this.spawn({ t: 'g', x: Math.floor((e.x + (p.x < e.x ? -24 : 40)) / TS), y: 11 }); Audio8.sfx('roar'); }
      }
      if (ghost && !(e.state === 'atk' && OPT.atk[e.atk] === 'DIVE')) { e.y += ((12 * TS - e.h - 30 + Math.sin(e.t * 0.05) * 14) - e.y) * 0.08; }
      else { const wasAir = e.y < floor - 1; e.vy = Math.min(8, (e.vy || 0) + 0.38); e.y = Math.min(floor, e.y + e.vy); if (e.y >= floor && wasAir) { e.vy = 0; if (e.state === 'atk' && (OPT.atk[e.atk] === 'HOP' || OPT.atk[e.atk] === 'DIVE')) { this.shake = 10; Audio8.sfx('bosshit'); for (const d of [-1, 1]) this.ents.push({ type: 'wave', alive: true, t: 0, x: e.x + e.w / 2 - 6 + d * 16, y: 12 * TS - 14, w: 12, h: 14, vx: d * 2.2, life: 160 }); } } }
      e.x = clamp(e.x, ar[0] * TS + 4, (ar[1] + 1) * TS - e.w - 4);
      this.miniContact(e);
    };
  }
  { const _de = PP.drawEnt;
    PP.drawEnt = function (e, cx) { if (e.type === 'myboss') { const x = Math.round(e.x - cx), y = Math.round(e.y); if (e.dying) { ctx.save(); ctx.translate(x + e.w / 2, y + e.h / 2); ctx.scale(1, -1); ctx.translate(-x - e.w / 2, -y - e.h / 2); drawMyBoss(e.cfg, x, y, frame, e); ctx.restore(); } else drawMyBoss(e.cfg, x, y, frame, e); return; } return _de.call(this, e, cx); };
  }
  { const _u = PP.update; PP.update = function () { const r = _u.apply(this, arguments); if (this.def.bossTest && TEST.won && !this._testEnd) { this._testEnd = 1; setTimeout(() => go(() => { TEST.on = false; return BossMakerScene('YOU BEAT IT! TOO EASY? MAKE IT HARDER!'); }), 2500); } return r; }; }
  { const _dy = PP.damageYeti; PP.damageYeti = function (e) { const r = _dy.apply(this, arguments); if (e && e.type === 'myboss' && (e.dying || !e.alive) && this.def.bossTest && !TEST.won) { TEST.won = true; this.parts.push({ k: 'text', s: 'YOU WIN!', x: 128, y: 80, vy: 0, life: 120, fixed: true }); } return r; }; }
  if (typeof BOSS_ART !== 'undefined') BOSS_ART.myboss = 'myboss';
  if (typeof stickerArt === 'function') { const _sa = stickerArt; stickerArt = function (id, x, y, t) { if (id === 'myboss') { const c = load(); ctx.save(); ctx.translate(x, y); ctx.scale(0.55, 0.55); drawMyBoss(c, -16, -16, t, null); ctx.restore(); return; } return _sa(id, x, y, t); }; } // eslint-disable-line no-func-assign
  if (typeof Maker !== 'undefined' && Maker.BOSSES && !Maker.BOSSES.some((b) => b[0] === '§')) Maker.BOSSES.push(['§', 'MY BOSS']);
  if (typeof ACH_LIST !== 'undefined') ACH_LIST.push(['comic', 'COMIC ARTIST', 'MAKE A COMIC FROM YOUR PHOTOS'], ['bossmaker', 'BOSS BUILDER', 'SAVE A BOSS IN THE BOSS CREATOR']);

  // ---------------- the Extras menu ----------------
  ExtrasList = function (start) { // eslint-disable-line no-func-assign
    const items = [['LEVEL MAKER', () => LevelMakerScene(null)], ['MAKER WORLDS', () => MakerWorldScene()], ['MUSIC MAKER', () => MusicMakerScene()], ['MUSIC STUDIO', () => Studio.StudioScene()], ['SONG CODES', () => SongCodesScene()], ['BOSS CREATOR', () => BossMakerScene()], ['COMIC MAKER', () => ComicMakerScene()], ['COURSE WORLD', () => CourseWorldScene()], ['HERO MAKER', () => HeroMakerScene()], ['COMPLETION', () => CompletionScene()], ['TITLES', () => TitlesScene()],
      ['TROPHY ROOM', () => TrophyScene()], ['STICKER BOOK', () => StickerScene()], ['CARD ALBUM', () => CardScene()], ['BESTIARY', () => BestiaryScene()], ['PHOTO ALBUM', () => PhotoAlbumScene()], ['ART GALLERY', () => ArtScene()], ['JUKEBOX', () => JukeboxScene()],
      ['GALLERY', () => GalleryScene()], ['THEATRE', () => TheatreScene()], ['BOSS REMATCH', () => RematchScene()], ['REPLAYS', () => ReplaysScene()], ['GHOST RACES', () => GhostScene()], ['LEADERBOARDS', () => LeaderScene()], ['HELP BOOK', () => HelpScene()], ['UPDATES', () => UpdatesScene()], ['CREDITS', () => CreditsScene()],
      ['IMPORT SAVE', () => ImportSaveScene()], ['BACKUPS', () => BackupScene()], ['INSTALL APP', () => InstallScene()], ['OPTIONS', () => OptionsScene()], ['BACK', null]];
    let sel = typeof start === 'string' ? Math.max(0, items.findIndex((k) => k[0] === start)) : (start || 0), t = 0; const SHOW = 11, NEWS = ['MUSIC STUDIO'];
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
        for (let i = 0; i < SHOW; i++) { const k = top + i, y = Math.round(95 + i * 10); txt(items[k][0], 84, y, k === sel ? '#ffe040' : NEWS.includes(items[k][0]) ? '#a8f0ff' : '#fff'); if (k === sel) txt('>', 72 + ((t >> 3) & 1), y, '#ffe040'); }
        if (top > 0) txt('^', 186, 92, '#a8b0d8'); if (top + SHOW < items.length) txt('V', 186, 196, '#a8b0d8');
        txt(`TROPHIES ${Ach.count()}/${ACH_LIST.length}`, 128, 215, '#fff', { align: 'center', outline: '#101848' });
      },
    };
  };
  return { renderComic, ComicMakerScene, SongCode, SongCodesScene, BossMakerScene, drawMyBoss, load, TEST, TLI };
})();
UPDATES.unshift(['2.2', [
  'CHALLENGES: RANDOMIZER (SEEDS!)', ' EXPLORE CASTLE: 4 RELICS', ' PRACTICE: ANY PART, SLOWER', 'WALLY TOWN: BOUNTY BOARD', 'EMOTES: HOLD B, THEN A DIRECTION',
  'EXTRAS: COMIC MAKER', ' BOSS CREATOR (+ LEVEL MAKER)', ' SONG CODES FOR MUSIC MAKER',
]]);
