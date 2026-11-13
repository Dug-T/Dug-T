'use strict';
// =====================================================================
// Batch J (part 2): the Dino Valley map, Completion, Mirror Mode and
// Boss Rematch menus, the card and photo albums, the Theatre, the
// Music Maker, Level Maker worlds, Party Mode and save backups.
// =====================================================================

// ---------------- Dino Valley on the world map ----------------
NODES6.push({ x: 236, y: 186, kind: 'portal', to: 6, name: 'RAFT TO DINO VALLEY' }); EDGES6.push([4, 6]);
const NODES7 = [
  { x: 26, y: 178, kind: 'portal', to: 5, name: 'RAFT TO PIRATE COVE' },
  { x: 66, y: 148, kind: 'level', li: 57 }, { x: 108, y: 172, kind: 'level', li: 58 }, { x: 150, y: 146, kind: 'level', li: 59 }, { x: 196, y: 168, kind: 'level', li: 60 }, { x: 214, y: 116, kind: 'level', li: 61 }, { x: 150, y: 84, kind: 'castle', li: 62 },
];
const EDGES7 = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]];
const Island7 = makeIsland(NODES7, [[90, 160, 26], [130, 158, 26], [176, 150, 24], [210, 140, 24], [180, 100, 26], [110, 110, 24], [70, 120, 20]], 211, (f, near, ch, r) => {
  let col = null;
  if (f > 1.9) {
    col = ch ? [60, 140, 60] : [74, 160, 70];
    if (near(6, 30) || near(4, 22)) col = ch ? [110, 80, 60] : [130, 94, 70];
    if (near(2, 26)) col = ch ? [220, 190, 120] : [236, 206, 136];
  } else if (f > 1.45) col = [210, 190, 130];
  else if (f > 1.25) col = [80, 170, 160];
  if (f > 5 && r() < 0.06) col = [30, 90, 40];
  return col;
});
WORLDS.push({ nodes: () => NODES7, edges: () => EDGES7, isle: () => Island7, name: 'DINO VALLEY', sea: ['#1a5a5a', '#2a7a6a'], key: 'node7' });

// ---------------- shared helpers ----------------
const listMenu = (items, sel, t, x, y0, gap, show, col = '#fff') => { const top = clamp(sel - Math.floor(show / 2), 0, Math.max(0, items.length - show)); for (let i = 0; i < show; i++) { const k = top + i; if (k >= items.length) break; const y = Math.round(y0 + i * gap); txt(items[k], x, y, k === sel ? '#ffe040' : col); if (k === sel) txt('>', x - 10 + ((t >> 3) & 1), y, '#ffe040'); } if (top > 0) txt('^', x + 120, y0 - 4, '#a8b0d8'); if (top + show < items.length) txt('V', x + 120, Math.round(y0 + (show - 1) * gap), '#a8b0d8'); };
const anySlot = (f) => Save.slots.some((s) => s && f(s));

// ---------------- Completion ----------------
function CompletionScene() {
  let t = 0; const g = game || Save.slots.find(Boolean) || null, c = g ? Completion.compute(g) : null;
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (Input.pressed('back') || Input.pressed('run')) { go(() => ExtrasScene('COMPLETION')); return; }
      if (c && c.pct >= 100 && Input.confirm()) { if (!game) { Audio8.sfx('bump'); return; } Audio8.sfx('secret'); go(() => IntroScene(SECRET_LI, false)); }
    },
    draw() {
      drawParallax('static', t * 0.3); drawWindow(16, 12, 224, 200);
      txt('COMPLETION', 128, 20, '#ffe040', { align: 'center', scale: 2 });
      if (!c) { txt('LOAD A SAVE FILE FIRST', 128, 100, '#fff', { align: 'center' }); return; }
      txt(`${c.pct} PERCENT`, 128, 44, c.pct >= 100 ? '#ffe040' : '#5ff0ff', { align: 'center', scale: 2 });
      c.parts.forEach(([n, a, b], i) => { const y = 82 + i * 22; txt(n, 32, y, '#fff'); txt(`${a}/${b}`, 224, y, '#a8b0d8', { align: 'right' }); hR(32, y + 10, 192, 6, '#1a1020'); hR(33, y + 11, Math.round(190 * (b ? a / b : 1)), 4, a >= b ? '#ffe040' : '#5ae060'); });
      if (c.pct >= 100) { if ((t >> 4) & 1) txt('A: ENTER THE SIGNAL SOURCE', 128, 178, '#ffe040', { align: 'center' }); } else txt('REACH 100 PERCENT TO OPEN A SECRET...', 128, 178, '#a8b0d8', { align: 'center' });
      txt('B: BACK', 128, 196, '#a8b0d8', { align: 'center' });
    },
  };
}

// ---------------- Mirror Mode ----------------
const MIRROR_LV = LEVELS.map((d, i) => i).filter((i) => { const d = LEVELS[i]; return i < DINO_BASE + 6 && !d.boss && !d.autoscroll && !d.shmup && !d.tower && !d.board && !d.sub && !d.train && !d.story && !d.puzzle && !d.secretRoom && !d.noAuto && i !== TUTORIAL_LI; });
function MirrorScene(start = 0, msg = '') {
  let sel = start, t = 0; const unlocked = anySlot((s) => s.cleared[7]), done = lsJ('wallyman-mirror', {});
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (Input.pressed('back') || Input.pressed('run')) { go(() => ChallengeScene(11)); return; }
      if (!unlocked) return;
      if (Input.pressed('down')) { sel = (sel + 1) % MIRROR_LV.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + MIRROR_LV.length - 1) % MIRROR_LV.length; Audio8.sfx('select'); }
      if (Input.confirm()) { const li = MIRROR_LV[sel], keep = sel; if (!anySlot((s) => s.cleared[li])) { msg = 'BEAT THIS LEVEL FIRST!'; Audio8.sfx('bump'); return; } Audio8.sfx('confirm'); game = challengeGame(); go(() => { const s = new Play(li, false); s.mode = { kind: 'mirror', sel: keep }; return s; }); }
    },
    draw() {
      drawParallax('crystal', -t * 0.4); drawWindow(16, 8, 224, 208);
      txt('MIRROR MODE', 128, 14, '#c0f8ff', { align: 'center', scale: 2 });
      if (!unlocked) { ['EVERY LEVEL FLIPPED LEFT TO', 'RIGHT, WITH FASTER FOES.', '', 'BEAT BARON STATIC AT THE', 'STATIC TOWER TO UNLOCK IT!'].forEach((l, i) => txt(l, 128, 80 + i * 12, '#fff', { align: 'center' })); return; }
      listMenu(MIRROR_LV.map((li) => (anySlot((s) => s.cleared[li]) ? `${levelTag(li)}. ${LEVELS[li].name}`.slice(0, 22) : `${levelTag(li)}. ?????`) + (done[li] ? ' #' : '')), sel, t, 36, 36, 11, 14);
      txt(msg || 'A: PLAY   B: BACK', 128, 200, msg ? '#ff8080' : '#a8b0d8', { align: 'center' });
    },
  };
}

// ---------------- Boss Rematch ----------------
const REMATCH = [3, 7, 14, 20, 25, 27, 32, 43, 44, 50, 55, 62, 63];
const rematchOpen = (li) => (li === 50 ? storyDone() >= 3 : anySlot((s) => s.cleared[li]));
function RematchScene(start = 0, msg = '') {
  let sel = start, t = 0; const best = lsJ('wallyman-rematch', {});
  return {
    enter() { Audio8.play('boss'); },
    update() {
      t++;
      if (Input.pressed('back') || Input.pressed('run')) { go(() => ExtrasScene('BOSS REMATCH')); return; }
      if (Input.pressed('down')) { sel = (sel + 1) % REMATCH.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + REMATCH.length - 1) % REMATCH.length; Audio8.sfx('select'); }
      if (Input.confirm()) { const li = REMATCH[sel], keep = sel; if (!rematchOpen(li)) { msg = 'BEAT THIS BOSS FIRST!'; Audio8.sfx('bump'); return; } Audio8.sfx('confirm'); game = challengeGame(); if (li === 50) game.hero = 'doug'; go(() => { const s = new Play(li, false); s.mode = { kind: 'rematch', sel: keep }; return s; }); }
    },
    draw() {
      drawParallax('castle', t * 0.4); drawWindow(16, 8, 224, 208);
      txt('BOSS REMATCH', 128, 14, '#ff8080', { align: 'center', scale: 2 });
      REMATCH.forEach((li, i) => { const y = 36 + i * 12, on = i === sel, open = rematchOpen(li), n = LEVELS[li].bossName || (li === 3 ? 'BARON STATIC' : li === 7 ? 'BARON STATIC (TOWER)' : '???'); txt(open ? n : '???', 36, y, on ? '#ffe040' : open ? '#fff' : '#7880b0'); if (best[li]) txt(fmtTime(best[li]), 228, y, '#5ff0ff', { align: 'right' }); if (on) txt('>', 26 + ((t >> 3) & 1), y, '#ffe040'); });
      txt(msg || 'A: FIGHT   B: BACK', 128, 200, msg ? '#ff8080' : '#a8b0d8', { align: 'center' });
    },
  };
}
function RematchResult(li, frames, won, sel) {
  const best = lsJ('wallyman-rematch', {}), rec = won && (!best[li] || frames < best[li]); if (rec) { best[li] = frames; lsS('wallyman-rematch', best); }
  let t = 0;
  return {
    enter() { Audio8.play(won ? 'victory' : 'gameover'); },
    update() { t++; if (t > 60 && (Input.confirm() || Input.pressed('back'))) go(() => RematchScene(sel)); },
    draw() { drawParallax('castle', t * 0.2); drawWindow(40, 60, 176, 100); txt(won ? 'BOSS BEATEN!' : 'DEFEATED...', 128, 70, won ? '#ffe040' : '#ff8080', { align: 'center', scale: 2 }); if (won) txt('TIME ' + fmtTime(frames), 128, 100, '#fff', { align: 'center' }); if (rec) txt('NEW BEST TIME!', 128, 116, (t >> 3) & 1 ? '#ffe040' : '#ff8040', { align: 'center' }); if (t > 60 && (t >> 4) & 1) txt('PRESS START', 128, 144, '#5ff0ff', { align: 'center' }); },
  };
}
{
  const _me = modeExit;
  modeExit = function (pl, won) { // eslint-disable-line no-func-assign
    const m = pl.mode;
    if (m.kind === 'mirror') { if (won) { const d = lsJ('wallyman-mirror', {}); d[pl.li] = true; lsS('wallyman-mirror', d); Ach.unlock('mirror'); } return MirrorScene(m.sel || 0, won ? 'MIRROR LEVEL CLEARED!' : ''); }
    if (m.kind === 'rematch') return RematchResult(pl.li, pl.hF || 0, won, m.sel || 0);
    return _me(pl, won);
  };
}

// ---------------- card album ----------------
function CardScene() {
  let sel = 0, t = 0; const N = BEASTS.length, COLS = 7;
  return {
    enter() { Audio8.play('map'); },
    update() {
      t++;
      if (Input.pressed('right')) { sel = (sel + 1) % N; Audio8.sfx('select'); } if (Input.pressed('left')) { sel = (sel + N - 1) % N; Audio8.sfx('select'); }
      if (Input.pressed('down')) { sel = Math.min(N - 1, sel + COLS); Audio8.sfx('select'); } if (Input.pressed('up')) { sel = Math.max(0, sel - COLS); Audio8.sfx('select'); }
      if (Input.pressed('back') || Input.pressed('run') || Input.confirm()) go(() => ExtrasScene('CARD ALBUM'));
    },
    draw() {
      ctx.fillStyle = '#2a1a3a'; ctx.fillRect(0, 0, VW, VH);
      txt('CARD ALBUM', 128, 4, '#ffe040', { align: 'center' }); txt(`${Cards.count()}/${N}`, 250, 4, '#fff', { align: 'right' });
      const rowSel = Math.floor(sel / COLS), top = clamp(rowSel - 2, 0, Math.max(0, Math.ceil(N / COLS) - 5));
      for (let i = top * COLS; i < Math.min(N, (top + 5) * COLS); i++) {
        const b = BEASTS[i], c = Cards.get(b[0]), x = 8 + (i % COLS) * 35, y = 16 + (Math.floor(i / COLS) - top) * 38, on = i === sel;
        hR(x - 1, y - 1, 32, 36, on ? '#ffe040' : '#1a1020'); hR(x, y, 30, 34, c ? (c.s ? ((t >> 3) & 1 ? '#fff8c0' : '#ffe080') : '#f0e8d0') : '#4a3a5a');
        if (c) { ctx.save(); ctx.beginPath(); ctx.rect(x + 2, y + 2, 26, 22); ctx.clip(); hR(x + 2, y + 2, 26, 22, b[2] === 'b' ? '#e8b0b0' : '#a8d8f8'); stickerArt(b[0], x + 15, y + 13, t); ctx.restore(); if (c.s) txt('*', x + 24, y + 1, '#ff40c0'); } else txt('?', x + 15, y + 9, '#7a6a8a', { align: 'center', scale: 2 });
      }
      const b = BEASTS[sel], c = Cards.get(b[0]);
      drawWindow(8, 196, 240, 26); txt(c ? b[1] : '??????', 128, 200, '#ffe040', { align: 'center' }); txt(c ? `COLLECTED ${c.n}${c.s ? '  SHINY ' + c.s : ''}` : 'BEAT ONE - CARDS DROP NOW AND THEN', 128, 210, '#a8b0d8', { align: 'center' });
    },
  };
}

// ---------------- photo album ----------------
const PhotoAlbum = (() => {
  const KEY = 'wallyman-photos';
  const list = () => lsJ(KEY, []);
  return {
    list,
    add(src) { try { const c = document.createElement('canvas'); c.width = VW; c.height = VH; c.getContext('2d').drawImage(src, 0, 0, VW, VH); const l = list(); l.unshift({ at: Date.now(), img: c.toDataURL('image/jpeg', 0.82) }); while (l.length > 10) l.pop(); lsS(KEY, l); if (!lsJ(KEY, null)) { l.length = Math.max(1, l.length - 3); lsS(KEY, l); } } catch (e) { /* storage full */ } },
    remove(i) { const l = list(); l.splice(i, 1); lsS(KEY, l); },
  };
})();
function PhotoAlbumScene() {
  let sel = 0, t = 0, img = null, shown = -1, msg = '';
  return {
    enter() { Audio8.play('map'); },
    update() {
      t++; const L = PhotoAlbum.list();
      if (Input.pressed('back') || Input.pressed('run')) { go(() => ExtrasScene('PHOTO ALBUM')); return; }
      if (!L.length) return;
      if (Input.pressed('right')) { sel = (sel + 1) % L.length; Audio8.sfx('select'); } if (Input.pressed('left')) { sel = (sel + L.length - 1) % L.length; Audio8.sfx('select'); }
      if (Input.confirm()) { const a = document.createElement('a'); a.href = L[sel].img; a.download = 'wallyman-photo-' + L[sel].at + '.jpg'; document.body.appendChild(a); a.click(); a.remove(); msg = 'DOWNLOADED!'; Audio8.sfx('check'); }
      if (Input.pressed('special')) { PhotoAlbum.remove(sel); sel = Math.max(0, sel - 1); shown = -1; msg = 'DELETED'; Audio8.sfx('brick'); }
    },
    draw() {
      ctx.fillStyle = '#1a1020'; ctx.fillRect(0, 0, VW, VH); const L = PhotoAlbum.list();
      txt('PHOTO ALBUM', 128, 4, '#ffe040', { align: 'center' });
      if (!L.length) { ['TAKE PHOTOS IN PHOTO MODE', '(PAUSE MENU) AND THEY ARE', 'KEPT HERE TOO!'].forEach((l, i) => txt(l, 128, 90 + i * 12, '#fff', { align: 'center' })); return; }
      sel = Math.min(sel, L.length - 1);
      if (shown !== sel || !img) { img = new Image(); img.src = L[sel].img; shown = sel; }
      hR(22, 18, 212, 186, '#f8f4ec'); if (img.complete) ctx.drawImage(img, 28, 24, 200, 175);
      txt(`${sel + 1}/${L.length}  ${new Date(L[sel].at).toDateString().toUpperCase()}`, 128, 206, '#fff', { align: 'center' });
      txt(msg || '< >: BROWSE  A: DOWNLOAD  S: DELETE', 128, 215, msg ? '#5ae060' : '#a8b0d8', { align: 'center' });
    },
  };
}

// ---------------- Theatre ----------------
function theatreItems() {
  const it = [['OPENING STORY', true, () => StoryScene(() => TheatreScene())], ['INTRO MOVIE', true, () => IntroMovieScene()]];
  it.push(['STAR ISLE COMIC', anySlot((s) => s.seenComic1), () => ComicScene('star', () => TheatreScene())], ['CARNIVAL COMIC', anySlot((s) => s.seenComic2), () => ComicScene('carnival', () => TheatreScene())]);
  STORY.forEach((c, i) => { it.push([`DOUG STORY ${i + 1}: START`, storyDone() >= i, () => StoryPages(c.before, () => TheatreScene())], [`DOUG STORY ${i + 1}: END`, storyDone() > i, () => StoryPages(c.after, () => TheatreScene())]); });
  it.push(['THE ENDING', anySlot((s) => s.cleared[7]), () => EndingScene()], ['CREDITS', true, () => CreditsScene(() => TheatreScene())]);
  return it;
}
function TheatreScene(start = 0) {
  let sel = start, t = 0; const it = theatreItems();
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (Input.pressed('back') || Input.pressed('run')) { go(() => ExtrasScene('THEATRE')); return; }
      if (Input.pressed('down')) { sel = (sel + 1) % it.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + it.length - 1) % it.length; Audio8.sfx('select'); }
      if (Input.confirm()) {
        if (!it[sel][1]) { Audio8.sfx('bump'); return; }
        Audio8.sfx('confirm'); const make = it[sel][2];
        go(() => { const s = make(), u = s.update; s.update = function () { if (Input.pressed('back')) { go(() => TheatreScene()); return; } const g0 = go; go = (f) => g0(() => (f === null ? TheatreScene() : TheatreScene())); try { return u.call(this); } finally { go = g0; } }; return s; }); // eslint-disable-line no-global-assign
      }
    },
    draw() {
      drawParallax('carnival', t * 0.3); drawWindow(16, 8, 224, 208);
      txt('THEATRE', 128, 14, '#ffe040', { align: 'center', scale: 2 });
      listMenu(it.map(([n, open]) => (open ? n : '???')), sel, t, 40, 40, 12, 13);
      txt('A: WATCH   B: BACK', 128, 202, '#a8b0d8', { align: 'center' });
    },
  };
}

// ---------------- Music Maker ----------------
function MusicMakerScene() {
  let slot = 0, song = MusicMaker.songs[0] ? JSON.parse(JSON.stringify(MusicMaker.songs[0])) : MusicMaker.blank();
  let cx = 0, cy = 4, focus = 'grid', msel = 0, t = 0, playing = false, msg = '', msgT = 0;
  const ROWS = ['SONG SLOT', 'TEMPO', 'CHORDS', 'DRUMS', 'BASS', 'SOUND', 'PLAY/STOP', 'SAVE SONG', 'MAKER SLOT', 'BACK'];
  const say = (s) => { msg = s; msgT = 120; };
  const preview = () => { Audio8.addSong('userpreview', MusicMaker.toDef(song)); Audio8.stop(); Audio8.play('userpreview'); playing = true; };
  return {
    enter() { Audio8.stop(); },
    update() {
      t++; if (msgT) msgT--;
      if (Input.pressed('special')) { focus = focus === 'grid' ? 'menu' : 'grid'; Audio8.sfx('select'); return; }
      if (Input.pressed('start')) { if (playing) { Audio8.stop(); playing = false; } else preview(); return; }
      if (focus === 'grid') {
        if (Input.pressed('left')) cx = (cx + 31) % 32; if (Input.pressed('right')) cx = (cx + 1) % 32; if (Input.pressed('up')) cy = Math.min(MUSIC_NOTES.length - 1, cy + 1); if (Input.pressed('down')) cy = Math.max(0, cy - 1);
        if (Input.pressed('jump')) { song.notes[cx] = song.notes[cx] === cy ? -1 : cy; Audio8.sfx(song.notes[cx] < 0 ? 'tick' : 'select'); cx = (cx + 1) % 32; }
        if (Input.pressed('run')) { song.notes[cx] = -1; Audio8.sfx('tick'); }
        if (Input.pressed('back')) { focus = 'menu'; msel = ROWS.length - 1; }
        return;
      }
      if (Input.pressed('down')) { msel = (msel + 1) % ROWS.length; Audio8.sfx('select'); } if (Input.pressed('up')) { msel = (msel + ROWS.length - 1) % ROWS.length; Audio8.sfx('select'); }
      const d = (Input.pressed('right') ? 1 : 0) - (Input.pressed('left') ? 1 : 0), a = Input.pressed('jump'), r = ROWS[msel];
      if (Input.pressed('back') || (a && r === 'BACK')) { Audio8.stop(); go(() => ExtrasScene('MUSIC MAKER')); return; }
      const cyc = (k, n) => { if (d || a) { song[k] = (song[k] + (d || 1) + n) % n; Audio8.sfx('coin'); if (playing) preview(); } };
      if (r === 'SONG SLOT' && (d || a)) { slot = (slot + (d || 1) + 3) % 3; song = MusicMaker.songs[slot] ? JSON.parse(JSON.stringify(MusicMaker.songs[slot])) : MusicMaker.blank(); Audio8.sfx('coin'); }
      if (r === 'TEMPO' && d) { song.bpm = clamp(song.bpm + d * 6, 84, 192); Audio8.sfx('coin'); if (playing) preview(); }
      if (r === 'CHORDS') cyc('chords', MUSIC_CHORDS.length); if (r === 'DRUMS') cyc('drums', MUSIC_DRUMS.length); if (r === 'BASS') cyc('bass', MUSIC_BASS.length); if (r === 'SOUND') cyc('lead', MUSIC_LEAD.length);
      if (r === 'PLAY/STOP' && a) { if (playing) { Audio8.stop(); playing = false; } else preview(); }
      if (r === 'SAVE SONG' && a) { MusicMaker.save(slot, song); say(`SAVED IN SLOT ${slot + 1}!`); Audio8.sfx('oneup'); }
      if (r === 'MAKER SLOT' && (a || d)) { const map = lsJ('wallyman-maker-music', {}); const cur = Object.keys(map).find((k) => map[k] === slot); let next = cur === undefined ? 0 : +cur + 1; Object.keys(map).forEach((k) => { if (map[k] === slot) delete map[k]; }); if (next <= 2) map[next] = slot; lsS('wallyman-maker-music', map); if (!MusicMaker.songs[slot]) MusicMaker.save(slot, song); say(next <= 2 ? `LEVEL MAKER SLOT ${'ABC'[next]} PLAYS THIS SONG` : 'NOT USED IN THE LEVEL MAKER'); Audio8.sfx('check'); }
    },
    draw() {
      ctx.fillStyle = '#100820'; ctx.fillRect(0, 0, VW, VH);
      txt('MUSIC MAKER', 128, 3, '#ffe040', { align: 'center' });
      const gx = 16, gy = 14, cw = 7, rh = 9, playStep = playing ? Math.floor(Math.max(0, Audio8.songStep()) / 2) % 32 : -1;
      for (let r = 0; r < MUSIC_NOTES.length; r++) { const y = gy + (MUSIC_NOTES.length - 1 - r) * rh; txt(MUSIC_NOTES[r].replace(/\d/, ''), 4, y + 1, '#7880b0'); }
      for (let c = 0; c < 32; c++) for (let r = 0; r < MUSIC_NOTES.length; r++) {
        const x = gx + c * cw, y = gy + (MUSIC_NOTES.length - 1 - r) * rh, on = song.notes[c] === r;
        hR(x, y, cw - 1, rh - 1, on ? ['#ff4aa8', '#5ff0ff', '#ffe040', '#5ae060'][r % 4] : c === playStep ? '#3a3a68' : (c >> 2) % 2 ? '#1e1a3a' : '#262246');
        if (focus === 'grid' && c === cx && r === cy) { ctx.strokeStyle = (t >> 3) & 1 ? '#ffffff' : '#ffe040'; ctx.lineWidth = 1; ctx.strokeRect(x - 0.5, y - 0.5, cw, rh); }
      }
      drawWindow(4, 108, 248, 104);
      const vals = { 'SONG SLOT': String(slot + 1) + (MusicMaker.songs[slot] ? '' : ' NEW'), TEMPO: song.bpm + ' BPM', CHORDS: MUSIC_CHORDS[song.chords], DRUMS: song.drums === MUSIC_DRUMS.length - 1 ? 'NONE' : 'BEAT ' + (song.drums + 1), BASS: MUSIC_BASS[song.bass].toUpperCase(), SOUND: ['SOFT', 'SHARP', 'ROUND'][song.lead], 'PLAY/STOP': playing ? 'PLAYING' : '', 'MAKER SLOT': (() => { const m = lsJ('wallyman-maker-music', {}); const k = Object.keys(m).find((q) => m[q] === slot); return k === undefined ? 'NONE' : 'ABC'[k]; })() };
      ROWS.forEach((r, i) => { const col = i < 5 ? 0 : 1, y = 114 + (i % 5) * 11, x = col ? 136 : 18, on = focus === 'menu' && i === msel; txt(r, x, y, on ? '#ffe040' : '#fff'); if (vals[r]) txt(vals[r], col ? 246 : 126, y, '#5ff0ff', { align: 'right' }); if (on) txt('>', x - 9 + ((t >> 3) & 1), y, '#ffe040'); });
      txt(msgT ? msg : focus === 'grid' ? 'A: NOTE  B: REST  S: MENU  START: PLAY' : 'S: BACK TO THE NOTES  < >: CHANGE', 128, 172, msgT ? '#5ae060' : '#a8b0d8', { align: 'center' });
    },
  };
}

// ---------------- Level Maker worlds ----------------
const MakerWorld = (() => {
  const KEY = 'wallyman-maker-world';
  const get = () => lsJ(KEY, { name: 'MY WORLD', codes: [null, null, null, null, null], done: [] });
  return {
    get, set: (w) => lsS(KEY, w),
    encode: (w) => 'WMWW-' + btoa(JSON.stringify({ n: w.name, c: w.codes })),
    decode(code) { try { const m = String(code).replace(/\s+/g, '').match(/^WMWW-([A-Za-z0-9+/=]+)$/); if (!m) return null; const o = JSON.parse(atob(m[1])); if (!o || !Array.isArray(o.c) || o.c.length !== 5) return null; const codes = o.c.map((c) => (c && Maker.decode(c) ? c : null)); return { name: String(o.n || 'WORLD').toUpperCase().slice(0, 16), codes, done: [] }; } catch (e) { return null; } },
  };
})();
function MakerWorldScene(start = 0) {
  let sel = start, t = 0, dom = false, msg = '', msgT = 0; const w = MakerWorld.get();
  const items = () => w.codes.map((c, i) => `COURSE ${i + 1}: ${c ? (w.done.includes(i) ? 'CLEARED' : 'READY') : 'EMPTY'}`).concat(['PLAY THE WORLD', 'NAME: ' + w.name, 'SHARE WORLD CODE', 'LOAD WORLD CODE', 'BACK']);
  const say = (s) => { msg = s; msgT = 150; };
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++; if (msgT) msgT--; if (dom) return; const it = items();
      if (Input.pressed('down')) { sel = (sel + 1) % it.length; Audio8.sfx('select'); } if (Input.pressed('up')) { sel = (sel + it.length - 1) % it.length; Audio8.sfx('select'); }
      if (Input.pressed('back') || (Input.confirm() && sel === it.length - 1)) { go(() => ExtrasScene('MAKER WORLDS')); return; }
      if (sel < 5) {
        const lr = (Input.pressed('right') ? 1 : 0) - (Input.pressed('left') ? 1 : 0);
        if (lr) { const sl = Maker.slots.map((s, i) => [s, i]).filter(([s]) => s); if (!sl.length) { say('MAKE A COURSE IN THE LEVEL MAKER FIRST'); return; } const cur = sl.findIndex(([s]) => s && Maker.encode(s) === w.codes[sel]); const nx = sl[(cur + lr + sl.length + (cur < 0 && lr < 0 ? 1 : 0)) % sl.length]; w.codes[sel] = Maker.encode(nx[0]); w.done = w.done.filter((k) => k !== sel); MakerWorld.set(w); say(`COURSE ${sel + 1} = MAKER SLOT ${'ABC'[nx[1]]}`); Audio8.sfx('coin'); }
        if (Input.confirm()) { dom = true; codeBox(`PASTE A LEVEL CODE FOR COURSE ${sel + 1}`, w.codes[sel] || '', (code) => { if (!Maker.decode(code)) return false; w.codes[sel] = String(code).replace(/\s+/g, ''); w.done = w.done.filter((k) => k !== sel); MakerWorld.set(w); say('COURSE SET!'); return true; }, () => { dom = false; }); }
        return;
      }
      if (!Input.confirm()) return;
      const r = it[sel];
      if (r === 'PLAY THE WORLD') { if (!w.codes.some(Boolean)) { say('ADD AT LEAST ONE COURSE'); Audio8.sfx('bump'); return; } Audio8.sfx('confirm'); go(() => MakerWorldMap()); }
      else if (r.startsWith('NAME')) { dom = true; textBox('NAME YOUR WORLD', w.name, (s) => { dom = false; if (s) { w.name = String(s).toUpperCase().replace(/[^A-Z0-9 .!-]/g, '').slice(0, 16) || 'MY WORLD'; MakerWorld.set(w); } }); }
      else if (r === 'SHARE WORLD CODE') { dom = true; codeBox('WORLD CODE - SHARE ALL 5 COURSES!', MakerWorld.encode(w), null, () => { dom = false; }); }
      else if (r === 'LOAD WORLD CODE') { dom = true; codeBox('PASTE A WORLD CODE', '', (code) => { const nw = MakerWorld.decode(code); if (!nw) return false; Object.assign(w, nw); MakerWorld.set(w); say('WORLD LOADED: ' + w.name); return true; }, () => { dom = false; }); }
    },
    draw() {
      drawParallax('candy', t * 0.3); drawWindow(16, 8, 224, 208); txt('MAKER WORLDS', 128, 14, '#ffe040', { align: 'center', scale: 2 });
      items().forEach((s, i) => { const y = 38 + i * 14 + (i >= 5 ? 6 : 0), on = i === sel; txt(s, 40, y, on ? '#ffe040' : '#fff'); if (on) txt('>', 30 + ((t >> 3) & 1), y, '#ffe040'); });
      txt(msgT ? msg : sel < 5 ? '< >: USE A MAKER SLOT   A: PASTE A CODE' : 'CHAIN UP TO 5 COURSES INTO A WORLD', 128, 196, msgT ? '#5ae060' : '#a8b0d8', { align: 'center' });
    },
  };
}
function MakerWorldMap(msg = '') {
  const w = MakerWorld.get(), idx = w.codes.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
  let sel = Math.max(0, idx.findIndex((i) => !w.done.includes(i))), t = 0;
  const open = (k) => k === 0 || w.done.includes(idx[k - 1]);
  if (idx.length && idx.every((i) => w.done.includes(i)) && !w.won) { w.won = true; MakerWorld.set(w); Ach.unlock('makerworld'); msg = 'WORLD COMPLETE!'; }
  return {
    enter() { Audio8.play('map'); },
    update() {
      t++;
      if (Input.pressed('back')) { go(() => MakerWorldScene(5)); return; }
      if (Input.pressed('right') && sel < idx.length - 1 && open(sel + 1)) { sel++; Audio8.sfx('map'); } if (Input.pressed('left') && sel > 0) { sel--; Audio8.sfx('map'); }
      if (Input.confirm() && idx.length) { const lv = Maker.decode(w.codes[idx[sel]]); if (!lv) { Audio8.sfx('bump'); return; } if (!game) game = Save.fresh(); window.CUSTOM_LEVEL = Object.assign(Maker.toDef(lv), { fromMakerWorld: idx[sel], name: `${w.name} ${sel + 1}` }); Audio8.sfx('confirm'); go(() => new Play(99, false)); }
    },
    draw() {
      ctx.fillStyle = '#5ab0f0'; ctx.fillRect(0, 0, VW, VH); drawParallax('candy', t * 0.2);
      drawWindow(4, 4, 248, 20); txt(w.name, 128, 10, '#ffe040', { align: 'center' });
      idx.forEach((i, k) => { const x = 36 + k * 46, y = 120 + (k % 2 ? -20 : 10); if (k) { const px = 36 + (k - 1) * 46, py = 120 + ((k - 1) % 2 ? -20 : 10); for (let s = 0; s < 10; s++) hR(Math.round(px + (x - px) * s / 10), Math.round(py + (y - py) * s / 10), 3, 2, open(k) ? '#7a5a2a' : '#4a4a60'); } hR(x - 7, y - 5, 14, 10, '#1a1020'); hR(x - 6, y - 4, 12, 8, w.done.includes(i) ? '#ffd040' : open(k) ? '#e83850' : '#5a5a70'); txt(String(k + 1), x, y - 16, '#fff', { align: 'center' }); if (k === sel) drawWally(x, y + 4, 'idle' + ((t >> 4) % 4), 1); });
      drawWindow(4, 196, 248, 24); txt(msg || 'A: PLAY   < >: MOVE   B: BACK', 128, 204, msg ? '#5ae060' : '#fff', { align: 'center' });
    },
  };
}
{ // Maker World courses return to the world map
  const _uc = Play.prototype.updateClear, _ud = Play.prototype.updateDying;
  Play.prototype.updateClear = function () { if (this.def.fromMakerWorld !== undefined) { if (this.stateT === 150) { const w = MakerWorld.get(); if (!w.done.includes(this.def.fromMakerWorld)) w.done.push(this.def.fromMakerWorld); MakerWorld.set(w); go(() => MakerWorldMap('COURSE CLEARED!')); } return; } return _uc.call(this); };
  Play.prototype.updateDying = function () { if (this.def.fromMakerWorld !== undefined) { const p = this.p, t = this.stateT; if (t === 30) p.vy = -5.5; if (t > 30) { p.vy += 0.25; p.y += p.vy; } if (t === 110) go(() => MakerWorldMap('TRY AGAIN!')); return; } return _ud.call(this); };
  const _pz = Play.prototype.update;
  Play.prototype.update = function () { if (this.def.fromMakerWorld !== undefined && this.paused && this.pauseSel === 6 && Input.pressed('jump')) { this.paused = false; this.state = 'done'; go(() => MakerWorldMap()); return; } return _pz.call(this); };
}

// ---------------- Party Mode (up to 4 players, CPUs fill empty seats) ----------------
function PartyScene() {
  const pads = () => (navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : []);
  let t = 0, n = 4; const HEROS = ['wally', 'goth', 'doug', 'robo'], COLS = ['#f2702a', '#ff4aa8', '#ffd040', '#c8d0e0'];
  return {
    enter() { Audio8.play('carnival'); },
    update() {
      t++;
      if (Input.pressed('back') || Input.pressed('run')) { go(() => ChallengeScene(12)); return; }
      if (Input.pressed('left')) n = Math.max(2, n - 1); if (Input.pressed('right')) n = Math.min(4, n + 1);
      if (t > 20 && Input.confirm()) { Audio8.sfx('confirm'); const humans = Math.max(1, Math.min(n, pads().length || 1)); go(() => PartyGame({ n, humans, heroes: HEROS, cols: COLS, round: 0, score: Array(n).fill(0) })); }
    },
    draw() {
      drawParallax('carnival', t * 0.4); drawWindow(20, 20, 216, 184);
      txt('PARTY MODE', 128, 28, '#ffe040', { align: 'center', scale: 2 });
      txt(`< ${n} PLAYERS >`, 128, 52, '#fff', { align: 'center' });
      const pc = pads().length;
      for (let i = 0; i < n; i++) { const x = 52 + i * 50; Wally.draw(ctx, x, 110, 'idle' + ((t >> 4) % 4), 1, { t, hero: HEROS[i], costume: 'classic', hat: 'none' }); txt(`P${i + 1}`, x, 116, COLS[i], { align: 'center' }); txt(i === 0 ? (pc ? 'PAD 1/KEYS' : 'KEYBOARD') : i < pc ? `PAD ${i + 1}` : 'CPU', x, 126, '#a8b0d8', { align: 'center' }); }
      ['3 QUICK GAMES: COIN GRAB, LAST ONE', 'STANDING AND HOT POTATO. PLUG IN', 'GAMEPADS FOR MORE PLAYERS!'].forEach((l, i) => txt(l, 128, 146 + i * 11, '#fff', { align: 'center' }));
      if ((t >> 4) & 1) txt('PRESS START', 128, 186, '#5ff0ff', { align: 'center' });
    },
  };
}
function PartyGame(S) {
  const GAMES = ['COIN GRAB', 'LAST ONE STANDING', 'HOT POTATO'], kind = S.round, padsNow = () => (navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : []);
  const plats = kind === 1 ? [] : [[0, 196, 256, 28], [24, 150, 60, 8], [172, 150, 60, 8], [96, 112, 64, 8], [20, 76, 50, 8], [186, 76, 50, 8]];
  const tiles = kind === 1 ? Array.from({ length: 16 }, (_, i) => ({ x: i * 16, y: i % 2 ? 160 : 140, hp: 1, t: 0 })).concat(Array.from({ length: 8 }, (_, i) => ({ x: 16 + i * 32, y: 96, hp: 1, t: 0 }))) : [];
  const P = Array.from({ length: S.n }, (_, i) => ({ i, x: 30 + i * 60, y: 60, vx: 0, vy: 0, on: false, face: 1, out: false, coins: 0, stun: 0, cpu: i >= S.humans, cool: 0, place: 0, jumpHeld: false }));
  let t = 0, time = kind === 0 ? 30 * 60 : 0, coins = [], holder = kind === 2 ? Math.floor(Math.random() * S.n) : -1, fuse = 600, done = false, order = [], countIn = 120;
  const input = (pl) => {
    if (pl.cpu) return cpu(pl);
    if (pl.i === 0) return { l: Input.down('left'), r: Input.down('right'), j: Input.down('jump'), jp: Input.pressed('jump') };
    const g = padsNow()[pl.i]; if (!g) return { l: 0, r: 0, j: 0, jp: 0 };
    const b = (k) => g.buttons[k] && g.buttons[k].pressed, j = b(0) || b(1), jp = j && !pl.jumpHeld; pl.jumpHeld = j;
    return { l: b(14) || g.axes[0] < -0.5, r: b(15) || g.axes[0] > 0.5, j, jp };
  };
  const cpu = (pl) => {
    let tx = 128, ty = 100;
    if (kind === 0 && coins.length) { const c = coins.reduce((a, b) => (Math.abs(b.x - pl.x) + Math.abs(b.y - pl.y) < Math.abs(a.x - pl.x) + Math.abs(a.y - pl.y) ? b : a)); tx = c.x; ty = c.y; }
    if (kind === 1) { const safe = tiles.filter((k) => k.hp > 0 && !k.t).sort((a, b) => Math.abs(a.x - pl.x) - Math.abs(b.x - pl.x))[0]; if (safe) { tx = safe.x + 8; ty = safe.y; } }
    if (kind === 2) { const live = P.filter((q) => !q.out && q !== pl); if (pl.i === holder && live.length) { const q = live.reduce((a, b) => (Math.abs(b.x - pl.x) < Math.abs(a.x - pl.x) ? b : a)); tx = q.x; ty = q.y; } else if (P[holder]) { tx = P[holder].x < 128 ? 230 : 26; ty = 60; } }
    const dx = tx - pl.x, jp = pl.on && (ty < pl.y - 20 || (t + pl.i * 13) % 70 === 0) && Math.random() < 0.5;
    return { l: dx < -6, r: dx > 6, j: jp || ty < pl.y - 10, jp };
  };
  const solidAt = (x, y, pl) => { for (const [px, py, pw] of plats) if (x > px && x < px + pw && y >= py && y <= py + 8 && pl.vy >= 0) return py; for (const k of tiles) if (k.hp > 0 && x > k.x && x < k.x + 16 && y >= k.y && y <= k.y + 8 && pl.vy >= 0) return k.y; return null; };
  const finishRound = () => {
    done = true; t = 0; let rank;
    if (kind === 0) rank = P.slice().sort((a, b) => b.coins - a.coins); else rank = P.filter((q) => !q.out).concat(order.slice().reverse());
    rank.forEach((q, k) => { S.score[q.i] += [3, 2, 1, 0][k] || 0; });
    S.last = rank.map((q) => q.i); Audio8.play('victory');
  };
  return {
    enter() { Audio8.play(['carnival', 'volcano', 'toy'][kind]); },
    update() {
      t++;
      if (done) { if (t > 90 && Input.confirm()) { if (S.round < 2) { S.round++; go(() => PartyGame(S)); } else go(() => PartyResult(S)); } return; }
      if (Input.pressed('back')) { go(() => PartyScene()); return; }
      if (countIn > 0) { countIn--; if (countIn % 40 === 0) Audio8.sfx(countIn ? 'tick' : 'confirm'); return; }
      if (kind === 0) { if (--time <= 0) { finishRound(); return; } if (t % 40 === 0 && coins.length < 8) { const [px, py, pw] = plats[Math.floor(Math.random() * plats.length)]; coins.push({ x: px + 8 + Math.random() * (pw - 16), y: py - 10 }); } }
      if (kind === 2 && --fuse <= 0) { const q = P[holder]; q.out = true; order.push(q); Audio8.sfx('boom'); rumble(0.8, 300); const live = P.filter((k) => !k.out); if (live.length <= 1) { finishRound(); return; } holder = live[Math.floor(Math.random() * live.length)].i; fuse = 420 + Math.floor(Math.random() * 240); }
      for (const pl of P) {
        if (pl.out) continue; if (pl.stun > 0) pl.stun--; if (pl.cool > 0) pl.cool--;
        const c = pl.stun ? { l: 0, r: 0, j: 0, jp: 0 } : input(pl), dir = (c.r ? 1 : 0) - (c.l ? 1 : 0);
        pl.vx = approach(pl.vx, dir * 1.9, 0.25); if (dir) pl.face = dir;
        if (c.jp && pl.on) { pl.vy = -6.2; pl.on = false; }
        pl.vy = Math.min(6, pl.vy + (c.j && pl.vy < 0 ? 0.22 : 0.45));
        pl.x = clamp(pl.x + pl.vx, 6, VW - 6); const ny = pl.y + pl.vy, land = solidAt(pl.x, ny, pl);
        if (land !== null && pl.y <= land + 2) { pl.y = land; pl.vy = 0; pl.on = true; for (const k of tiles) if (k.hp > 0 && pl.x > k.x && pl.x < k.x + 16 && Math.abs(k.y - land) < 1 && !k.t) k.t = 1; } else { pl.y = ny; pl.on = false; }
        if (pl.y > VH + 20) { if (kind === 1) { pl.out = true; order.push(pl); Audio8.sfx('hurt'); if (P.filter((q) => !q.out).length <= 1) { finishRound(); return; } } else { pl.y = 40; pl.x = 128; pl.vy = 0; } }
        if (kind === 0) for (let k = coins.length - 1; k >= 0; k--) if (Math.abs(coins[k].x - pl.x) < 8 && Math.abs(coins[k].y - (pl.y - 10)) < 12) { coins.splice(k, 1); pl.coins++; Audio8.sfx('coin'); }
      }
      for (const k of tiles) if (k.t && k.hp > 0 && ++k.t > 45) { k.hp = 0; Audio8.sfx('brick'); }
      // bumping: stomp someone to stun them (and pinch a coin); in Hot Potato, touching passes the bomb
      for (const a of P) for (const b of P) {
        if (a === b || a.out || b.out || Math.abs(a.x - b.x) > 10 || Math.abs(a.y - b.y) > 20) continue;
        if (kind === 2 && a.i === holder && !a.cool) { holder = b.i; b.cool = 40; a.cool = 40; Audio8.sfx('kick'); }
        else if (a.vy > 1 && a.y < b.y - 8 && !b.stun) { b.stun = 50; a.vy = -4.5; Audio8.sfx('stomp'); if (kind === 0 && b.coins > 0) { b.coins--; a.coins++; } }
      }
      if (kind === 1 && t % 600 === 0) for (const k of tiles) if (k.hp > 0 && Math.random() < 0.3) k.t = 1;
    },
    draw() {
      drawParallax(['carnival', 'volcano', 'toy'][kind], t * 0.2);
      if (kind === 1) { hR(0, 200, VW, 24, (frame >> 3) & 1 ? '#ff6a10' : '#ffa030'); }
      for (const [px, py, pw, ph] of plats) { hR(px, py, pw, ph || 8, '#1a1020'); hR(px + 1, py + 1, pw - 2, (ph || 8) - 2, '#a06a34'); }
      for (const k of tiles) if (k.hp > 0) { const sh = k.t ? ((k.t >> 1) & 1) : 0; hR(k.x + sh, k.y, 16, 8, '#1a1020'); hR(k.x + 1 + sh, k.y + 1, 14, 6, k.t ? '#c0a080' : '#8a8aa0'); }
      for (const c of coins) ctx.drawImage(Sprites.coin, Math.round(c.x - 4), Math.round(c.y - 7));
      for (const pl of P) { if (pl.out) continue; ctx.save(); if (pl.stun && (t >> 2) & 1) ctx.globalAlpha = 0.5; Wally.draw(ctx, pl.x, pl.y, !pl.on ? 'jump' : Math.abs(pl.vx) > 0.3 ? 'run' + ((t >> 2) % 8) : 'idle' + ((t >> 4) % 4), pl.face, { t, hero: S.heroes[pl.i], costume: 'classic', hat: 'none' }); ctx.restore(); txt(`P${pl.i + 1}`, pl.x, pl.y - 40, S.cols[pl.i], { align: 'center', outline: '#101848' }); if (kind === 2 && pl.i === holder) { hR(pl.x - 5, pl.y - 34, 10, 10, '#1a1020'); hR(pl.x - 4, pl.y - 33, 8, 8, '#3a3a48'); hR(pl.x + 2, pl.y - 37, 2, 4, (t >> 2) & 1 ? '#ff8020' : '#ffe040'); } }
      drawWindow(4, 2, 248, 16); txt(`${GAMES[kind]}  ${S.round + 1}/3`, 10, 6, '#ffe040');
      if (kind === 0) txt(`TIME ${Math.ceil(time / 60)}  ` + P.map((q) => `P${q.i + 1}:${q.coins}`).join(' '), 246, 6, '#fff', { align: 'right' });
      if (kind === 2) txt(`FUSE ${Math.ceil(fuse / 60)}`, 246, 6, fuse < 120 && (t >> 2) & 1 ? '#ff4040' : '#fff', { align: 'right' });
      if (countIn > 0) txt(countIn > 40 ? GAMES[kind] : 'GO!', 128, 90, '#ffe040', { align: 'center', scale: 2, outline: '#101848' });
      if (done) { drawWindow(48, 60, 160, 90); txt('ROUND OVER!', 128, 68, '#ffe040', { align: 'center', scale: 2 }); S.last.forEach((i, k) => txt(`${k + 1}. P${i + 1}  (${S.score[i]} PTS)`, 128, 92 + k * 11, S.cols[i], { align: 'center' })); if (t > 90 && (t >> 4) & 1) txt('PRESS START', 128, 140, '#5ff0ff', { align: 'center' }); }
    },
  };
}
function PartyResult(S) {
  let t = 0; const rank = S.score.map((s, i) => [s, i]).sort((a, b) => b[0] - a[0]);
  if (rank[0][1] === 0) Ach.unlock('party');
  return {
    enter() { Audio8.play('victory'); },
    update() { t++; if (t > 60 && (Input.confirm() || Input.pressed('back'))) go(() => PartyScene()); },
    draw() { drawParallax('carnival', t * 0.4); drawWindow(30, 30, 196, 160); txt('PARTY CHAMPION', 128, 38, '#ffe040', { align: 'center', scale: 2 }); Wally.draw(ctx, 128, 110, 'win' + ((t >> 4) & 1), 1, { t, hero: S.heroes[rank[0][1]], costume: 'classic', sx: 2, sy: 2, hat: 'crown' }); rank.forEach(([s, i], k) => txt(`${k + 1}. P${i + 1}  ${s} PTS`, 128, 124 + k * 12, S.cols[i], { align: 'center' })); },
  };
}

// ---------------- save backups ----------------
function BackupScene() {
  let sel = 0, t = 0, confirm = false; const L = Backups.list();
  return {
    enter() { Audio8.play('menu'); },
    update() {
      t++;
      if (Input.pressed('back') || Input.pressed('run')) { if (confirm) { confirm = false; return; } go(() => ExtrasScene('BACKUPS')); return; }
      if (!L.length) return;
      if (Input.pressed('down')) { sel = (sel + 1) % L.length; Audio8.sfx('select'); confirm = false; } if (Input.pressed('up')) { sel = (sel + L.length - 1) % L.length; Audio8.sfx('select'); confirm = false; }
      if (Input.confirm()) { if (!confirm) { confirm = true; Audio8.sfx('pause'); } else { Audio8.sfx('secret'); Backups.restore(sel); } }
    },
    draw() {
      drawParallax('sky', t * 0.3); drawWindow(16, 20, 224, 184); txt('SAVE BACKUPS', 128, 28, '#ffe040', { align: 'center', scale: 2 });
      if (!L.length) { txt('NO BACKUPS YET', 128, 90, '#fff', { align: 'center' }); txt('ONE IS MADE EACH DAY YOU PLAY.', 128, 104, '#a8b0d8', { align: 'center' }); return; }
      L.forEach((b, i) => { const y = 56 + i * 30, on = i === sel; let info = ''; try { info = JSON.parse(b.data).map((s) => (s ? `${s.cleared.filter(Boolean).length}` : '-')).join(' / '); } catch (e) { info = '?'; } txt(new Date(b.at).toDateString().toUpperCase(), 44, y, on ? '#ffe040' : '#fff'); txt('LEVELS CLEARED A/B/C: ' + info, 44, y + 11, '#a8b0d8'); if (on) txt('>', 32 + ((t >> 3) & 1), y, '#ffe040'); });
      txt(confirm ? 'PRESS A AGAIN TO RESTORE (REPLACES ALL FILES)' : 'A: RESTORE THIS BACKUP   B: BACK', 128, 184, confirm ? '#ff8080' : '#a8b0d8', { align: 'center' });
    },
  };
}

// ---------------- menus ----------------
function ExtrasScene(start = 0) { // eslint-disable-line no-func-assign
  const items = [['LEVEL MAKER', () => LevelMakerScene(null)], ['MAKER WORLDS', () => MakerWorldScene()], ['MUSIC MAKER', () => MusicMakerScene()], ['COURSE WORLD', () => CourseWorldScene()], ['HERO MAKER', () => HeroMakerScene()], ['COMPLETION', () => CompletionScene()],
    ['TROPHY ROOM', () => TrophyScene()], ['STICKER BOOK', () => StickerScene()], ['CARD ALBUM', () => CardScene()], ['BESTIARY', () => BestiaryScene()], ['PHOTO ALBUM', () => PhotoAlbumScene()], ['ART GALLERY', () => ArtScene()], ['JUKEBOX', () => JukeboxScene()],
    ['GALLERY', () => GalleryScene()], ['THEATRE', () => TheatreScene()], ['BOSS REMATCH', () => RematchScene()], ['REPLAYS', () => ReplaysScene()], ['LEADERBOARDS', () => LeaderScene()], ['CREDITS', () => CreditsScene()],
    ['IMPORT SAVE', () => ImportSaveScene()], ['BACKUPS', () => BackupScene()], ['INSTALL APP', () => InstallScene()], ['OPTIONS', () => OptionsScene()], ['BACK', null]];
  let sel = typeof start === 'string' ? Math.max(0, items.findIndex((k) => k[0] === start)) : start, t = 0; const SHOW = 11;
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
{
  const _J = JukeboxScene;
  JukeboxScene = function () { const s = _J(), u = s.update; s.update = function () { if (Input.pressed('back') || Input.pressed('run')) { go(() => ExtrasScene('JUKEBOX')); return; } return u.call(this); }; return s; }; // eslint-disable-line no-func-assign
}
function ChallengeScene(start = 0) { // eslint-disable-line no-func-assign
  const items = ['TIME ATTACK', 'BOSS RUSH', 'DAILY CHALLENGE', 'ENDLESS RUN', 'VERSUS', 'SURVIVAL ARENA', 'HARD REMIX', "DOUG'S STORY", 'ROGUELIKE TOWER', 'GOLDEN LEVELS', 'TUTORIAL', 'MIRROR MODE', 'PARTY MODE', 'BACK'];
  const tips = ['RACE ANY LEVEL YOU HAVE BEATEN', 'EVERY BOSS BACK TO BACK!', "TODAY'S LEVEL WITH A TWIST", 'HOW FAR CAN YOU RUN?', 'TWO PLAYERS: RACE OR BATTLE', 'ENDLESS WAVES OF FOES', 'MEANER VERSIONS OF WALLY ISLAND', 'PLAY AS DOUG IN 3 NEW LEVELS', 'RANDOM FLOORS, UPGRADES, ONE LIFE', 'HUNT 100 GOLD COINS PER LEVEL', 'LEARN ALL THE MOVES', 'EVERY LEVEL FLIPPED AROUND', 'UP TO 4 PLAYERS, 3 MINI-GAMES', ''];
  const go_ = [() => TimeAttackSelect(), () => RushIntroScene(), () => DailyScene(), () => EndlessIntro(), () => VersusScene(), () => ArenaIntro(), () => RemixScene(), () => StoryMenu(Math.min(2, storyDone())), () => RogueIntro(), () => GoldScene(), () => startTutorial(false), () => MirrorScene(), () => PartyScene()];
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
