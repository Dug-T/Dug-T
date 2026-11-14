'use strict';
// =====================================================================
// Update 2.3: MUSIC STUDIO - a modern music maker (Extras)
// Four tracks over 2 bars: MELODY (12-note grid, notes of any length),
// CHORDS (one per half bar, picked from the key), BASS (8-note grid) and
// DRUMS (kick, snare, hi-hat, open hat). Pick a key and scale, tempo,
// swing, reverb and modern instruments (piano, synth, bells, pluck,
// strings, flute / pad, strings, e-piano, organ / sub, electric, synth
// bass / modern, 808 and lo-fi kits). Save 3 songs, use one as the music
// for a Level Maker course, and share songs as codes (with a QR code).
// Update 2.6: songs of 2, 4 or 8 bars, a second melody track, live
// recording while the song plays, and songs as island-map or title music.
// =====================================================================
const Studio = (() => {
  const KEY = 'wallyman-studio', MAPKEY = 'wallyman-maker-studio';
  const NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const SCALES = [['MAJOR', [0, 2, 4, 5, 7, 9, 11]], ['MINOR', [0, 2, 3, 5, 7, 8, 10]], ['PENTATONIC', [0, 2, 4, 7, 9]], ['DORIAN', [0, 2, 3, 5, 7, 9, 10]], ['BLUES', [0, 3, 5, 6, 7, 10]]];
  const LEADS = ['PIANO', 'SYNTH', 'BELLS', 'PLUCK', 'STRINGS', 'FLUTE'], CHORDS_I = ['PAD', 'STRINGS', 'E-PIANO', 'ORGAN', 'OFF'], BASSES = ['SUB', 'ELECTRIC', 'SYNTH', 'OFF'], KITS = ['MODERN', '808', 'LO-FI'];
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'], DRUMS = [['KICK', 'k'], ['SNARE', 's'], ['HI-HAT', 'h'], ['OPEN HAT', 'o']];
  const N = 32, MROWS = 12, BROWS = 8; // N = steps shown on one page (2 bars)
  const LEN = (s) => (s.bars || 2) * 16;
  const demo = () => {
    const s = { name: 'MY TRACK', bpm: 112, swing: 0, key: 0, scale: 0, rev: 2, lead: 0, chordInst: 0, bassInst: 0, kit: 0, bars: 2, lead2: 2, mel: Array(N).fill(null), mel2: Array(N).fill(null), chords: [0, 4, 5, 3], bass: Array(N).fill(-1), drums: DRUMS.map(() => Array(N).fill(false)) };
    [[0, 7, 2], [2, 9, 2], [4, 11, 4], [8, 8, 2], [10, 7, 2], [12, 4, 4], [16, 5, 2], [18, 7, 2], [20, 9, 4], [24, 7, 2], [26, 4, 2], [28, 2, 4]].forEach(([i, p, l]) => { s.mel[i] = { p, l }; });
    [0, 6, 8, 14, 16, 22, 24, 30].forEach((i, k) => { s.bass[i] = [0, 0, 4, 4, 5, 5, 3, 3][k]; });
    for (let i = 0; i < N; i++) { s.drums[0][i] = i % 8 === 0 || i % 16 === 10; s.drums[1][i] = i % 8 === 4; s.drums[2][i] = i % 2 === 0; s.drums[3][i] = i % 16 === 14; }
    return s;
  };
  const scaleOf = (s) => SCALES[s.scale][1];
  const melMidi = (s, row) => { const sc = scaleOf(s), n = sc.length; return 60 + s.key + Math.floor(row / n) * 12 + sc[row % n]; };
  const bassMidi = (s, row) => { const sc = scaleOf(s), n = sc.length; return 36 + s.key + Math.floor(row / n) * 12 + sc[row % n]; };
  const chordMidis = (s, deg) => { const sc = scaleOf(s), n = sc.length; return [0, 2, 4].map((k) => { const d = deg + k; return 48 + s.key + Math.floor(d / n) * 12 + sc[d % n]; }); };
  const chordName = (s, deg) => { if (deg < 0) return '-'; const m = chordMidis(s, deg), third = (m[1] - m[0] + 12) % 12; return NOTE[m[0] % 12] + (third === 3 ? ' MIN' : ''); };
  // songs from before 2.6 are 2 bars with no second melody
  function fix(s) {
    if (!s) return s; if (![2, 4, 8].includes(s.bars)) s.bars = 2; const L = LEN(s);
    if (s.lead2 === undefined) s.lead2 = 2; if (!Array.isArray(s.mel2)) s.mel2 = Array(L).fill(null);
    const fit = (a, n, v) => { a = Array.isArray(a) ? a.slice(0, n) : []; while (a.length < n) a.push(v); return a; };
    s.mel = fit(s.mel, L, null); s.mel2 = fit(s.mel2, L, null); s.bass = fit(s.bass, L, -1); s.drums = (s.drums || []).map((r) => fit(r, L, false)); s.chords = fit(s.chords, s.bars * 2, -1);
    return s;
  }
  function resize(s, bars) { // longer: the song so far repeats to fill the new bars; shorter: the end is cut
    const L0 = LEN(s), L = bars * 16, grow = (a) => Array.from({ length: L }, (_, i) => { const v = a[i % L0]; return v && typeof v === 'object' ? Object.assign({}, v) : v; });
    s.mel = grow(s.mel); s.mel2 = grow(s.mel2); s.bass = grow(s.bass); s.drums = s.drums.map(grow); const C0 = s.chords.length; s.chords = Array.from({ length: bars * 2 }, (_, i) => s.chords[i % C0]); s.bars = bars;
    for (const m of [s.mel, s.mel2]) m.forEach((n, i) => { if (n && i + n.l > L) n.l = L - i; });
  }
  function toDef(s) {
    const ev = [];
    const L = LEN(s);
    s.mel.forEach((n, i) => { if (n) ev.push({ s: i, c: 'L', m: melMidi(s, n.p), l: Math.min(n.l, L - i) }); });
    (s.mel2 || []).forEach((n, i) => { if (n) ev.push({ s: i, c: 'L', inst: s.lead2, m: melMidi(s, n.p), l: Math.min(n.l, L - i) }); });
    s.chords.forEach((d, k) => { if (d >= 0) ev.push({ s: k * 8, c: 'C', ms: chordMidis(s, d), l: 8 }); });
    s.bass.forEach((r, i) => { if (r >= 0) { let l = 1; while (i + l < L && s.bass[i + l] < 0 && l < 4) l++; ev.push({ s: i, c: 'B', m: bassMidi(s, r), l }); } });
    s.drums.forEach((row, k) => row.forEach((on, i) => { if (on) ev.push({ s: i, c: 'D', d: DRUMS[k][1] }); }));
    return { studio: true, events: ev, total: L, bpm: s.bpm, swing: [0, 0.12, 0.24, 0.36][s.swing], rev: s.rev, lead: s.lead, chordInst: s.chordInst, bassInst: s.bassInst, kit: s.kit };
  }
  const songs = (() => { try { const a = JSON.parse(localStorage.getItem(KEY) || 'null'); return Array.isArray(a) ? [0, 1, 2].map((i) => fix(a[i] || null)) : [null, null, null]; } catch (e) { return [null, null, null]; } })();
  const register = (i) => { if (songs[i]) Audio8.addSong('studio' + (i + 1), toDef(songs[i])); };
  songs.forEach((_, i) => register(i));
  const save = (i, s) => { songs[i] = JSON.parse(JSON.stringify(s)); try { localStorage.setItem(KEY, JSON.stringify(songs)); } catch (e) { /* ignore */ } register(i); try { Ach.unlock('studio'); } catch (e) { /* ignore */ } };
  // share codes: WMM1-<base64 json>
  const pack = (s) => [s.name, s.bpm, s.swing, s.key, s.scale, s.rev, s.lead, s.chordInst, s.bassInst, s.kit, s.mel.map((n) => (n ? n.p.toString(36) + n.l.toString(36) : '..')).join(''), s.chords.join(','), s.bass.map((r) => (r < 0 ? '.' : r)).join(''), s.drums.map((row) => row.map((b) => (b ? 1 : 0)).join('')).join('|'), s.bars, s.lead2, s.mel2.map((n) => (n ? n.p.toString(36) + n.l.toString(36) : '..')).join('')];
  const encode = (s) => 'WMM2-' + btoa(JSON.stringify(pack(s))).replace(/=+$/, '');
  function decode(code) {
    try {
      const m = String(code).replace(/\s+/g, '').match(/^WMM([12])-([A-Za-z0-9+/]+)=*$/); if (!m) return null; const v2 = m[1] === '2'; m[1] = m[2];
      const a = JSON.parse(atob(m[1] + '==='.slice((m[1].length + 3) % 4))); if (!Array.isArray(a) || a.length !== (v2 ? 17 : 14)) return null;
      const s = demo(); s.bars = v2 ? ([2, 4, 8].includes(a[14]) ? a[14] : 0) : 2; if (!s.bars) return null; const L = LEN(s); s.lead2 = v2 ? clamp(a[15] | 0, 0, LEADS.length - 1) : 2; [s.name, s.bpm, s.swing, s.key, s.scale, s.rev, s.lead, s.chordInst, s.bassInst, s.kit] = a;
      s.name = String(s.name).toUpperCase().slice(0, 16); s.bpm = clamp(+s.bpm || 112, 60, 200); s.swing = clamp(s.swing | 0, 0, 3); s.key = clamp(s.key | 0, 0, 11); s.scale = clamp(s.scale | 0, 0, SCALES.length - 1); s.rev = clamp(s.rev | 0, 0, 3);
      s.lead = clamp(s.lead | 0, 0, LEADS.length - 1); s.chordInst = clamp(s.chordInst | 0, 0, CHORDS_I.length - 1); s.bassInst = clamp(s.bassInst | 0, 0, BASSES.length - 1); s.kit = clamp(s.kit | 0, 0, KITS.length - 1);
      const melOf = (str) => { str = String(str); if (str.length !== L * 2) return null; return Array.from({ length: L }, (_, i) => (str[i * 2] === '.' ? null : { p: clamp(parseInt(str[i * 2], 36), 0, MROWS - 1), l: clamp(parseInt(str[i * 2 + 1], 36), 1, 16) })); };
      s.mel = melOf(a[10]); s.mel2 = v2 ? melOf(a[16]) : Array(L).fill(null); if (!s.mel || !s.mel2) return null;
      s.chords = String(a[11]).split(',').map((v) => clamp(parseInt(v, 10), -1, 6)); if (s.chords.length !== s.bars * 2 || s.chords.some(Number.isNaN)) return null;
      const bs = String(a[12]); if (bs.length !== L) return null; s.bass = [...bs].map((c) => (c === '.' ? -1 : clamp(parseInt(c, 10), 0, BROWS - 1)));
      const dr = String(a[13]).split('|'); if (dr.length !== 4 || dr.some((r) => r.length !== L)) return null; s.drums = dr.map((r) => [...r].map((c) => c === '1'));
      return s;
    } catch (e) { return null; }
  }
  // Level Maker: a course can use a Music Studio song
  if (typeof Maker !== 'undefined') { const _td = Maker.toDef; Maker.toDef = function (lv) { const d = _td.call(this, lv), slot = Maker.slots.indexOf(lv), map = lsJ(MAPKEY, {}), sg = map[slot]; if (sg !== undefined && songs[sg]) d.music = 'studio' + (sg + 1); return d; }; }

  // ---------------- the studio ----------------
  const TABS = ['MELODY', 'MEL 2', 'CHORDS', 'BASS', 'DRUMS', 'SONG'], T_MEL2 = 1, T_CH = 2, T_BASS = 3, T_DR = 4, T_SONG = 5;
  const TAB_COL = ['#ff6fb4', '#ff9a4a', '#ffd24a', '#5fd2ff', '#7cf08a', '#c8b8ff'];
  const SONGROWS = ['NAME', 'SLOT', 'TEMPO', 'KEY', 'SCALE', 'SWING', 'REVERB', 'MELODY SOUND', 'CHORD SOUND', 'BASS SOUND', 'DRUM KIT', 'PLAY / STOP', 'SAVE', 'USE IN MAKER', 'SHARE CODE', 'LOAD CODE', 'NEW (DEMO)', 'CLEAR ALL', 'LENGTH', 'MELODY 2 SOUND', 'LIVE RECORD', 'MAP MUSIC', 'TITLE MUSIC', 'BACK'];
  const USEKEY = 'wallyman-studio-use', useGet = () => Object.assign({ map: -1, title: -1 }, lsJ(USEKEY, {}));
  function StudioScene() {
    let slot = 0, s = songs[0] ? JSON.parse(JSON.stringify(songs[0])) : demo(), rec = false, recFlash = 0, ccx = 0, tab = 0, cx = 0, cy = 7, sr = 0, t = 0, playing = false, dom = false, msg = '', msgT = 0, dirty = false;
    const say = (m) => { msg = m; msgT = 150; };
    const play = () => { Audio8.addSong('studiopreview', toDef(s)); Audio8.stop(); Audio8.play('studiopreview'); playing = true; };
    const stop = () => { Audio8.stop(); playing = false; };
    const live = () => { if (playing) { if (Audio8.swapSong) Audio8.swapSong('studiopreview', toDef(s)); else { Audio8.addSong('studiopreview', toDef(s)); Audio8.play('studiopreview'); } } };
    const mel = () => (tab === T_MEL2 ? s.mel2 : s.mel), L = () => LEN(s);
    const rows = () => (tab <= T_MEL2 ? MROWS : tab === T_BASS ? BROWS : tab === T_DR ? 4 : 1);
    const audition = (m) => { if (playing) return; Audio8.addSong('studiotap', { studio: true, events: [{ s: 0, c: tab === T_BASS ? 'B' : 'L', m, l: 2 }], total: 16, bpm: s.bpm, rev: s.rev, lead: tab === T_MEL2 ? s.lead2 : s.lead, bassInst: s.bassInst === 3 ? 0 : s.bassInst }); Audio8.play('studiotap'); setTimeout(() => { if (!playing) Audio8.stop(); }, 400); };
    function songRow(r, d) {
      const cyc = (k, n) => { s[k] = (s[k] + d + n) % n; };
      if (r === 'SLOT') { slot = (slot + d + 3) % 3; s = songs[slot] ? fix(JSON.parse(JSON.stringify(songs[slot]))) : demo(); cx = Math.min(cx, L() - 1); ccx = 0; say(songs[slot] ? `SLOT ${slot + 1}: ${s.name}` : `SLOT ${slot + 1} IS EMPTY - HERE IS A DEMO`); }
      else if (r === 'TEMPO') s.bpm = clamp(s.bpm + d * 4, 60, 200); else if (r === 'KEY') cyc('key', 12); else if (r === 'SCALE') cyc('scale', SCALES.length);
      else if (r === 'SWING') cyc('swing', 4); else if (r === 'REVERB') cyc('rev', 4); else if (r === 'MELODY SOUND') cyc('lead', LEADS.length); else if (r === 'CHORD SOUND') cyc('chordInst', CHORDS_I.length);
      else if (r === 'BASS SOUND') cyc('bassInst', BASSES.length); else if (r === 'DRUM KIT') cyc('kit', KITS.length);
      else if (r === 'LENGTH') { const B = [2, 4, 8], nb = B[(B.indexOf(s.bars) + d + 3) % 3]; resize(s, nb); cx = Math.min(cx, L() - 1); ccx = Math.min(ccx, s.bars * 2 - 1); say(`${nb} BARS${nb > 2 ? ' - THE SONG SO FAR REPEATS' : ''}`); }
      else if (r === 'MELODY 2 SOUND') cyc('lead2', LEADS.length);
      else if (r === 'LIVE RECORD') { rec = !rec; say(rec ? 'START PLAYS. A ON A MELODY TAB RECORDS' : 'LIVE RECORD OFF'); return true; }
      else if (r === 'MAP MUSIC' || r === 'TITLE MUSIC') { const k = r === 'MAP MUSIC' ? 'map' : 'title', u = useGet(), opts = [-1].concat([0, 1, 2].filter((i) => songs[i])); u[k] = opts[(Math.max(0, opts.indexOf(u[k])) + d + opts.length) % opts.length]; lsS(USEKEY, u); say(u[k] < 0 ? (k === 'map' ? 'THE ISLAND MAP PLAYS ITS OWN MUSIC' : 'THE TITLE PLAYS ITS OWN MUSIC') : `${k === 'map' ? 'ISLAND MAPS' : 'THE TITLE SCREEN'} PLAY ${songs[u[k]].name}`); return true; }
      else return false;
      dirty = true; live(); return true;
    }
    function songAct(r) {
      if (r === 'NAME') { dom = true; const cb = (v) => { dom = false; if (v) { s.name = String(v).toUpperCase().replace(/[^A-Z0-9 !?'.-]/g, '').slice(0, 16) || s.name; dirty = true; } }; if (typeof textBox === 'function') textBox('NAME YOUR SONG', s.name, cb); else cb(window.prompt('NAME YOUR SONG', s.name)); }
      else if (r === 'PLAY / STOP') { if (playing) stop(); else play(); }
      else if (r === 'SAVE') { save(slot, s); dirty = false; say(`SAVED IN SLOT ${slot + 1}!`); Audio8.sfx('oneup'); }
      else if (r === 'USE IN MAKER') { if (!songs[slot]) { say('SAVE THE SONG FIRST'); Audio8.sfx('bump'); return; } const map = lsJ(MAPKEY, {}), cur = Object.keys(map).find((k) => map[k] === slot); let next = cur === undefined ? 0 : +cur + 1; Object.keys(map).forEach((k) => { if (map[k] === slot) delete map[k]; }); if (next <= 2) { map[next] = slot; say(`LEVEL MAKER SLOT ${next + 1} PLAYS THIS SONG`); } else say('NOT USED IN THE LEVEL MAKER'); lsS(MAPKEY, map); Audio8.sfx('coin'); }
      else if (r === 'SHARE CODE') { dom = true; codeBox(`SONG: ${s.name}`, encode(s), null, () => { dom = false; }); }
      else if (r === 'LOAD CODE') { dom = true; codeBox('PASTE A MUSIC STUDIO CODE (WMM1-...)', '', (c) => { const ns = decode(c); if (!ns) return false; s = ns; cx = Math.min(cx, L() - 1); ccx = 0; dirty = true; say(`LOADED '${ns.name}' - SAVE TO KEEP IT`); live(); return true; }, () => { dom = false; }); }
      else if (r === 'NEW (DEMO)') { s = demo(); cx = Math.min(cx, 31); ccx = 0; dirty = true; live(); say('A FRESH DEMO TO START FROM'); }
      else if (r === 'CLEAR ALL') { s.mel.fill(null); s.mel2.fill(null); s.chords = s.chords.map(() => -1); s.bass.fill(-1); s.drums.forEach((r2) => r2.fill(false)); dirty = true; live(); say('ALL CLEAR - MAKE SOMETHING NEW!'); }
      else if (r === 'BACK') { stop(); go(() => ExtrasList('MUSIC STUDIO')); }
      else songRow(r, 1);
    }
    return {
      enter() { Audio8.stop(); },
      update() {
        t++; if (msgT) msgT--; if (recFlash) recFlash--; if (dom) return;
        if (Input.pressed('start')) { if (playing) stop(); else play(); Audio8.sfx('select'); return; }
        if (Input.pressed('run')) { tab = (tab + 1) % TABS.length; cy = Math.min(cy, rows() - 1); Audio8.sfx('select'); return; }
        if (Input.pressed('back')) { stop(); go(() => ExtrasList('MUSIC STUDIO')); return; }
        const Lf = Input.pressed('left'), R = Input.pressed('right'), U = Input.pressed('up'), D = Input.pressed('down'), A = Input.pressed('jump'), S = Input.pressed('special');
        if (tab === T_SONG) {
          if (D) { sr = (sr + 1) % SONGROWS.length; Audio8.sfx('select'); } if (U) { sr = (sr + SONGROWS.length - 1) % SONGROWS.length; Audio8.sfx('select'); }
          if (Lf || R) { if (songRow(SONGROWS[sr], R ? 1 : -1)) Audio8.sfx('select'); }
          if (A) songAct(SONGROWS[sr]);
          return;
        }
        if (tab === T_CH) { // chords: one per half bar
          const C = s.chords.length; if (Lf) ccx = (ccx + C - 1) % C; if (R) ccx = (ccx + 1) % C; if (Lf || R) Audio8.sfx('select');
          if (U || D || A) { s.chords[ccx] = ((s.chords[ccx] + (D ? -1 : 1) + 1 + 8) % 8) - 1; dirty = true; live(); if (!playing && s.chords[ccx] >= 0) { Audio8.addSong('studiotap', { studio: true, events: [{ s: 0, c: 'C', ms: chordMidis(s, s.chords[ccx]), l: 6 }], total: 16, bpm: s.bpm, rev: s.rev, chordInst: s.chordInst === 4 ? 0 : s.chordInst }); Audio8.play('studiotap'); setTimeout(() => { if (!playing) Audio8.stop(); }, 700); } }
          if (S) { s.chords[ccx] = -1; dirty = true; live(); }
          return;
        }
        if (Lf) cx = (cx + L() - 1) % L(); if (R) cx = (cx + 1) % L(); if (U) cy = Math.min(rows() - 1, cy + 1); if (D) cy = Math.max(0, cy - 1);
        if (tab <= T_MEL2) {
          const M = mel();
          if (rec && playing && A) { const st = Math.round(Audio8.songStep()) % L(), ow = (() => { for (let i = st - 1; i >= 0; i--) if (M[i]) return i + M[i].l > st ? i : -1; return -1; })(); if (ow >= 0) M[ow].l = st - ow; M[st] = { p: cy, l: 1 }; Audio8.studioTap(toDef(s), { c: 'L', inst: tab === T_MEL2 ? s.lead2 : s.lead, m: melMidi(s, cy), l: 2 }); dirty = true; recFlash = 8; live(); return; }
          const owner = (() => { for (let i = cx; i >= 0; i--) if (M[i]) return i + M[i].l > cx ? i : -1; return -1; })();
          if (A) { if (M[cx] && M[cx].p === cy) M[cx] = null; else { if (owner >= 0 && owner !== cx) M[owner].l = cx - owner; M[cx] = { p: cy, l: M[cx] ? M[cx].l : 1 }; for (let i = cx + 1; i < cx + M[cx].l && i < L(); i++) M[i] = null; audition(melMidi(s, cy)); } dirty = true; live(); }
          if (S && M[cx]) { const ls = [1, 2, 3, 4, 6, 8]; M[cx].l = ls[(ls.indexOf(M[cx].l) + 1) % ls.length] || 1; for (let i = cx + 1; i < cx + M[cx].l && i < L(); i++) M[i] = null; dirty = true; live(); }
        } else if (tab === T_BASS) {
          if (A) { s.bass[cx] = s.bass[cx] === cy ? -1 : cy; if (s.bass[cx] >= 0) audition(bassMidi(s, cy)); dirty = true; live(); }
          if (S) { s.bass[cx] = -1; dirty = true; live(); }
        } else if (tab === T_DR) {
          if (A) { s.drums[3 - cy][cx] = !s.drums[3 - cy][cx]; dirty = true; live(); }
          if (S) { const row = s.drums[3 - cy], on = !row[cx]; for (let i = cx % 2; i < N; i += 2) row[i] = on; dirty = true; live(); }
        }
      },
      draw() {
        // a dark studio look with glowing cells (this screen is modern in both graphics modes)
        const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#120c2a'); g.addColorStop(1, '#22184a'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
        const col = TAB_COL[tab], LL = L(), step = playing ? Audio8.songStep() % LL : -1, ps = step >= 0 ? Math.floor(step) : -1;
        const page = tab === T_CH ? Math.floor(ccx / 4) : rec && ps >= 0 ? Math.floor(ps / N) : Math.floor(cx / N), off = page * N, pages = s.bars / 2;
        txt('MUSIC STUDIO', 6, 4, '#ffffff'); if (rec) { ctx.fillStyle = recFlash || (t >> 4) & 1 ? '#ff3050' : '#802030'; ctx.beginPath(); ctx.arc(88, 7, 3, 0, Math.PI * 2); ctx.fill(); txt('REC', 94, 4, '#ff6070'); } let nx = rec ? 118 : 84; if (pages > 1 && tab !== T_SONG) { const bt = `BAR ${page * 2 + 1}-${page * 2 + 2}/${s.bars}`; txt(bt, nx, 4, '#c8b8ff'); nx += bt.length * 6 + 6; } { const room = Math.max(4, Math.floor((250 - nx) / 6)), nm = `${s.name}${dirty ? '*' : ''}`; txt(nm.length > room ? nm.slice(0, room - 1) + '.' : nm, 250, 4, '#a8b0d8', { align: 'right' }); } 
        TABS.forEach((tb, i) => { const x = 2 + i * 42, on = i === tab; ctx.fillStyle = on ? TAB_COL[i] : 'rgba(255,255,255,0.08)'; ctx.globalAlpha = on ? 0.9 : 1; ctx.fillRect(x, 14, 40, 11); ctx.globalAlpha = 1; txt(tb, x + 20, 16, on ? '#120c2a' : TAB_COL[i], { align: 'center' }); });
        const GX = 26, GY = 30, GW = 224, GH = 138, cw = GW / N;
        ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(GX, GY, GW, GH);
        for (let i = 0; i <= N; i += 4) { ctx.fillStyle = i % 16 === 0 ? 'rgba(255,255,255,0.25)' : i % 8 === 0 ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)'; ctx.fillRect(GX + i * cw - 0.5, GY, 1, GH); }
        if (tab === T_SONG) {
          drawWindow(20, 30, 216, 150); const top = clamp(sr - 5, 0, SONGROWS.length - 12);
          const u = useGet(), useName = (k) => (u[k] >= 0 && songs[u[k]] ? `SLOT ${u[k] + 1}` : 'OFF');
          const v = { LENGTH: `${s.bars} BARS`, 'MELODY 2 SOUND': LEADS[s.lead2], 'LIVE RECORD': rec ? 'ON' : 'OFF', 'MAP MUSIC': useName('map'), 'TITLE MUSIC': useName('title'), NAME: s.name, SLOT: `${slot + 1}${songs[slot] ? '' : ' (EMPTY)'}`, TEMPO: `${s.bpm} BPM`, KEY: NOTE[s.key], SCALE: SCALES[s.scale][0], SWING: ['NONE', 'LIGHT', 'MEDIUM', 'HEAVY'][s.swing], REVERB: ['DRY', 'ROOM', 'HALL', 'CATHEDRAL'][s.rev], 'MELODY SOUND': LEADS[s.lead], 'CHORD SOUND': CHORDS_I[s.chordInst], 'BASS SOUND': BASSES[s.bassInst], 'DRUM KIT': KITS[s.kit], 'PLAY / STOP': playing ? 'PLAYING' : '' };
          for (let i = 0; i < 12; i++) { const k = top + i, r = SONGROWS[k], y = 36 + i * 11, on = k === sr; if (!r) break; txt(r, 38, y, on ? '#ffe040' : '#fff'); if (v[r]) txt(v[r], 228, y, on ? '#ffe040' : '#a8f0ff', { align: 'right' }); if (on) txt('>', 28 + ((t >> 3) & 1), y, '#ffe040'); }
          ctx.fillStyle = '#a8b0d8'; if (top > 0) { ctx.beginPath(); ctx.moveTo(228, 40); ctx.lineTo(232, 34); ctx.lineTo(236, 40); ctx.fill(); } if (top + 12 < SONGROWS.length) { ctx.beginPath(); ctx.moveTo(228, 166); ctx.lineTo(232, 172); ctx.lineTo(236, 166); ctx.fill(); }
        } else if (tab === T_CH) {
          for (let k = 0; k < 4; k++) { const x = GX + k * 8 * cw + 2, w = 8 * cw - 4, on = page * 4 + k === ccx, d = s.chords[page * 4 + k];
            ctx.fillStyle = d >= 0 ? 'rgba(255,210,74,0.28)' : 'rgba(255,255,255,0.05)'; ctx.fillRect(x, GY + 20, w, 90); if (on) { ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 1.5; ctx.strokeRect(x, GY + 20, w, 90); }
            txt(d >= 0 ? ROMAN[d] : '-', x + w / 2, GY + 44, '#ffd24a', { align: 'center', scale: 2 }); txt(chordName(s, d), x + w / 2, GY + 72, '#fff', { align: 'center' }); }
          txt(`KEY OF ${NOTE[s.key]} ${SCALES[s.scale][0]}`, GX + GW / 2, GY + 122, '#a8b0d8', { align: 'center' });
        } else {
          const R = rows(), rh = GH / R;
          for (let r = 0; r < R; r++) { const y = GY + GH - (r + 1) * rh; if (r % 2) { ctx.fillStyle = 'rgba(255,255,255,0.025)'; ctx.fillRect(GX, y, GW, rh); }
            const label = tab <= T_MEL2 ? NOTE[melMidi(s, r) % 12] : tab === T_BASS ? NOTE[bassMidi(s, r) % 12] : ['KICK', 'SNR', 'HAT', 'OPEN'][3 - r]; txt(label, 2, Math.round(y + rh / 2 - 3), r === cy ? col : '#7a80a8'); }
          const cell = (i, r, l, c) => { const x = GX + i * cw + 0.5, y = GY + GH - (r + 1) * rh + 1, w = l * cw - 1, h = rh - 2; ctx.fillStyle = c; ctx.globalAlpha = 0.9; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 0.35; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x, y, w, 1); };
          const vis = (i, l = 1) => i + l > off && i < off + N;
          if (tab <= T_MEL2) { if (tab === T_MEL2) s.mel.forEach((n, i) => { if (n && vis(i, n.l)) { const a = Math.max(i, off); ctx.globalAlpha = 0.3; cell(a - off, n.p, Math.min(i + n.l, off + N) - a, '#ff6fb4'); ctx.globalAlpha = 1; } }); mel().forEach((n, i) => { if (n && vis(i, n.l)) { const a = Math.max(i, off); cell(a - off, n.p, Math.min(i + n.l, off + N, LL) - a, ps >= i && ps < i + n.l ? '#ffffff' : TAB_COL[tab]); } }); }
          if (tab === T_BASS) s.bass.forEach((r, i) => { if (r >= 0 && vis(i)) cell(i - off, r, 1, ps === i ? '#ffffff' : TAB_COL[T_BASS]); });
          if (tab === T_DR) s.drums.forEach((row, k) => row.forEach((on, i) => { if (on && vis(i)) cell(i - off, 3 - k, 1, ps === i ? '#ffffff' : TAB_COL[T_DR]); }));
          if (cx >= off && cx < off + N) { const x = GX + (cx - off) * cw, y = GY + GH - (cy + 1) * rh; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, rh - 1); }
        }
        if (ps >= off && ps < off + N && tab !== T_SONG && tab !== T_CH) { const x = GX + (step - off) * cw; const pg = ctx.createLinearGradient(x - 6, 0, x + 2, 0); pg.addColorStop(0, 'rgba(255,255,255,0)'); pg.addColorStop(1, 'rgba(255,255,255,0.5)'); ctx.fillStyle = pg; ctx.fillRect(x - 6, GY, 8, GH); }
        // help bar
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 172, VW, 52);
        const help = tab <= T_MEL2 ? ['A: NOTE ON/OFF   S: NOTE LENGTH', rec ? `RECORDING ${NOTE[melMidi(s, cy) % 12]}: UP/DOWN PICKS THE NOTE` : `${NOTE[melMidi(s, cy) % 12]}  STEP ${cx + 1}/${LL}   ${LEADS[tab === T_MEL2 ? s.lead2 : s.lead]}`] : tab === T_CH ? ['UP/DOWN OR A: CHANGE CHORD   S: NONE', `CHORD ${ccx + 1}/${s.chords.length}   ${CHORDS_I[s.chordInst]} SOUND`] : tab === T_BASS ? ['A: NOTE ON/OFF   S: CLEAR STEP', `${NOTE[bassMidi(s, cy) % 12]}  STEP ${cx + 1}/${LL}   ${BASSES[s.bassInst]} BASS`] : tab === T_DR ? ['A: HIT ON/OFF   S: FILL EVERY OTHER STEP', `${DRUMS[3 - cy][0]}   ${KITS[s.kit]} KIT`] : ['<>: CHANGE   A: CHOOSE', `SLOT ${slot + 1}   ${s.bpm} BPM   ${NOTE[s.key]} ${SCALES[s.scale][0]}`];
        txt(help[0], 128, 176, '#fff', { align: 'center' }); txt(help[1], 128, 187, col, { align: 'center' });
        txt(`B: NEXT TAB   START: ${playing ? 'STOP' : 'PLAY'}`, 128, 200, '#a8b0d8', { align: 'center' });
        if (msgT) txt(msg, 128, 211, '#40e090', { align: 'center' });
      },
      _s: () => s, _set: (o) => { if (o.tab !== undefined) tab = o.tab; if (o.cx !== undefined) cx = o.cx; if (o.cy !== undefined) cy = o.cy; if (o.sr !== undefined) sr = o.sr; },
    };
  }
  // a saved song can be the island-map music or the title music
  { const _p = Audio8.play; Audio8.play = function (name, ...r) { if (name === 'map' || name === 'title') { const k = useGet()[name]; if (k >= 0 && songs[k]) name = 'studio' + (k + 1); } return _p.call(this, name, ...r); }; }
  if (typeof ACH_LIST !== 'undefined') ACH_LIST.push(['studio', 'IN THE STUDIO', 'SAVE A SONG IN THE MUSIC STUDIO']);
  return { StudioScene, demo, toDef, encode, decode, songs, save, melMidi, chordMidis, SCALES, MAPKEY, fix, resize, LEN, useGet };
})();
UPDATES.unshift(['2.3', ['NEW: MUSIC STUDIO (EXTRAS)', ' A MODERN MUSIC MAKER: MELODY,', ' CHORDS, BASS AND DRUMS', ' KEYS, SCALES, SWING, REVERB', ' PIANO, SYNTH, STRINGS, 808...', ' USE SONGS IN THE LEVEL MAKER', ' SHARE SONGS AS CODES + QR']]);
