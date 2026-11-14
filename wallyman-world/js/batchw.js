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
// =====================================================================
const Studio = (() => {
  const KEY = 'wallyman-studio', MAPKEY = 'wallyman-maker-studio';
  const NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const SCALES = [['MAJOR', [0, 2, 4, 5, 7, 9, 11]], ['MINOR', [0, 2, 3, 5, 7, 8, 10]], ['PENTATONIC', [0, 2, 4, 7, 9]], ['DORIAN', [0, 2, 3, 5, 7, 9, 10]], ['BLUES', [0, 3, 5, 6, 7, 10]]];
  const LEADS = ['PIANO', 'SYNTH', 'BELLS', 'PLUCK', 'STRINGS', 'FLUTE'], CHORDS_I = ['PAD', 'STRINGS', 'E-PIANO', 'ORGAN', 'OFF'], BASSES = ['SUB', 'ELECTRIC', 'SYNTH', 'OFF'], KITS = ['MODERN', '808', 'LO-FI'];
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'], DRUMS = [['KICK', 'k'], ['SNARE', 's'], ['HI-HAT', 'h'], ['OPEN HAT', 'o']];
  const N = 32, MROWS = 12, BROWS = 8;
  const demo = () => {
    const s = { name: 'MY TRACK', bpm: 112, swing: 0, key: 0, scale: 0, rev: 2, lead: 0, chordInst: 0, bassInst: 0, kit: 0, mel: Array(N).fill(null), chords: [0, 4, 5, 3], bass: Array(N).fill(-1), drums: DRUMS.map(() => Array(N).fill(false)) };
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
  function toDef(s) {
    const ev = [];
    s.mel.forEach((n, i) => { if (n) ev.push({ s: i, c: 'L', m: melMidi(s, n.p), l: Math.min(n.l, N - i) }); });
    s.chords.forEach((d, k) => { if (d >= 0) ev.push({ s: k * 8, c: 'C', ms: chordMidis(s, d), l: 8 }); });
    s.bass.forEach((r, i) => { if (r >= 0) { let l = 1; while (i + l < N && s.bass[i + l] < 0 && l < 4) l++; ev.push({ s: i, c: 'B', m: bassMidi(s, r), l }); } });
    s.drums.forEach((row, k) => row.forEach((on, i) => { if (on) ev.push({ s: i, c: 'D', d: DRUMS[k][1] }); }));
    return { studio: true, events: ev, total: N, bpm: s.bpm, swing: [0, 0.12, 0.24, 0.36][s.swing], rev: s.rev, lead: s.lead, chordInst: s.chordInst, bassInst: s.bassInst, kit: s.kit };
  }
  const songs = (() => { try { const a = JSON.parse(localStorage.getItem(KEY) || 'null'); return Array.isArray(a) ? [0, 1, 2].map((i) => a[i] || null) : [null, null, null]; } catch (e) { return [null, null, null]; } })();
  const register = (i) => { if (songs[i]) Audio8.addSong('studio' + (i + 1), toDef(songs[i])); };
  songs.forEach((_, i) => register(i));
  const save = (i, s) => { songs[i] = JSON.parse(JSON.stringify(s)); try { localStorage.setItem(KEY, JSON.stringify(songs)); } catch (e) { /* ignore */ } register(i); try { Ach.unlock('studio'); } catch (e) { /* ignore */ } };
  // share codes: WMM1-<base64 json>
  const pack = (s) => [s.name, s.bpm, s.swing, s.key, s.scale, s.rev, s.lead, s.chordInst, s.bassInst, s.kit, s.mel.map((n) => (n ? n.p.toString(36) + n.l.toString(36) : '..')).join(''), s.chords.join(','), s.bass.map((r) => (r < 0 ? '.' : r)).join(''), s.drums.map((row) => row.map((b) => (b ? 1 : 0)).join('')).join('|')];
  const encode = (s) => 'WMM1-' + btoa(JSON.stringify(pack(s))).replace(/=+$/, '');
  function decode(code) {
    try {
      const m = String(code).replace(/\s+/g, '').match(/^WMM1-([A-Za-z0-9+/]+)=*$/); if (!m) return null;
      const a = JSON.parse(atob(m[1] + '==='.slice((m[1].length + 3) % 4))); if (!Array.isArray(a) || a.length !== 14) return null;
      const s = demo(); [s.name, s.bpm, s.swing, s.key, s.scale, s.rev, s.lead, s.chordInst, s.bassInst, s.kit] = a;
      s.name = String(s.name).toUpperCase().slice(0, 16); s.bpm = clamp(+s.bpm || 112, 60, 200); s.swing = clamp(s.swing | 0, 0, 3); s.key = clamp(s.key | 0, 0, 11); s.scale = clamp(s.scale | 0, 0, SCALES.length - 1); s.rev = clamp(s.rev | 0, 0, 3);
      s.lead = clamp(s.lead | 0, 0, LEADS.length - 1); s.chordInst = clamp(s.chordInst | 0, 0, CHORDS_I.length - 1); s.bassInst = clamp(s.bassInst | 0, 0, BASSES.length - 1); s.kit = clamp(s.kit | 0, 0, KITS.length - 1);
      const mel = String(a[10]); if (mel.length !== N * 2) return null; s.mel = Array.from({ length: N }, (_, i) => (mel[i * 2] === '.' ? null : { p: clamp(parseInt(mel[i * 2], 36), 0, MROWS - 1), l: clamp(parseInt(mel[i * 2 + 1], 36), 1, 16) }));
      s.chords = String(a[11]).split(',').map((v) => clamp(parseInt(v, 10), -1, 6)); if (s.chords.length !== 4 || s.chords.some(Number.isNaN)) return null;
      const bs = String(a[12]); if (bs.length !== N) return null; s.bass = [...bs].map((c) => (c === '.' ? -1 : clamp(parseInt(c, 10), 0, BROWS - 1)));
      const dr = String(a[13]).split('|'); if (dr.length !== 4 || dr.some((r) => r.length !== N)) return null; s.drums = dr.map((r) => [...r].map((c) => c === '1'));
      return s;
    } catch (e) { return null; }
  }
  // Level Maker: a course can use a Music Studio song
  if (typeof Maker !== 'undefined') { const _td = Maker.toDef; Maker.toDef = function (lv) { const d = _td.call(this, lv), slot = Maker.slots.indexOf(lv), map = lsJ(MAPKEY, {}), sg = map[slot]; if (sg !== undefined && songs[sg]) d.music = 'studio' + (sg + 1); return d; }; }

  // ---------------- the studio ----------------
  const TABS = ['MELODY', 'CHORDS', 'BASS', 'DRUMS', 'SONG'];
  const TAB_COL = ['#ff6fb4', '#ffd24a', '#5fd2ff', '#7cf08a', '#c8b8ff'];
  const SONGROWS = ['NAME', 'SLOT', 'TEMPO', 'KEY', 'SCALE', 'SWING', 'REVERB', 'MELODY SOUND', 'CHORD SOUND', 'BASS SOUND', 'DRUM KIT', 'PLAY / STOP', 'SAVE', 'USE IN MAKER', 'SHARE CODE', 'LOAD CODE', 'NEW (DEMO)', 'CLEAR ALL', 'BACK'];
  function StudioScene() {
    let slot = 0, s = songs[0] ? JSON.parse(JSON.stringify(songs[0])) : demo(), tab = 0, cx = 0, cy = 7, sr = 0, t = 0, playing = false, dom = false, msg = '', msgT = 0, dirty = false;
    const say = (m) => { msg = m; msgT = 150; };
    const play = () => { Audio8.addSong('studiopreview', toDef(s)); Audio8.stop(); Audio8.play('studiopreview'); playing = true; };
    const stop = () => { Audio8.stop(); playing = false; };
    const live = () => { if (playing) { Audio8.addSong('studiopreview', toDef(s)); Audio8.play('studiopreview'); } };
    const rows = () => (tab === 0 ? MROWS : tab === 2 ? BROWS : tab === 3 ? 4 : 1);
    const audition = (m) => { if (playing) return; Audio8.addSong('studiotap', { studio: true, events: [{ s: 0, c: tab === 2 ? 'B' : 'L', m, l: 2 }], total: 16, bpm: s.bpm, rev: s.rev, lead: s.lead, bassInst: s.bassInst === 3 ? 0 : s.bassInst }); Audio8.play('studiotap'); setTimeout(() => { if (!playing) Audio8.stop(); }, 400); };
    function songRow(r, d) {
      const cyc = (k, n) => { s[k] = (s[k] + d + n) % n; };
      if (r === 'SLOT') { slot = (slot + d + 3) % 3; s = songs[slot] ? JSON.parse(JSON.stringify(songs[slot])) : demo(); say(songs[slot] ? `SLOT ${slot + 1}: ${s.name}` : `SLOT ${slot + 1} IS EMPTY - HERE IS A DEMO`); }
      else if (r === 'TEMPO') s.bpm = clamp(s.bpm + d * 4, 60, 200); else if (r === 'KEY') cyc('key', 12); else if (r === 'SCALE') cyc('scale', SCALES.length);
      else if (r === 'SWING') cyc('swing', 4); else if (r === 'REVERB') cyc('rev', 4); else if (r === 'MELODY SOUND') cyc('lead', LEADS.length); else if (r === 'CHORD SOUND') cyc('chordInst', CHORDS_I.length);
      else if (r === 'BASS SOUND') cyc('bassInst', BASSES.length); else if (r === 'DRUM KIT') cyc('kit', KITS.length); else return false;
      dirty = true; live(); return true;
    }
    function songAct(r) {
      if (r === 'NAME') { dom = true; const cb = (v) => { dom = false; if (v) { s.name = String(v).toUpperCase().replace(/[^A-Z0-9 !?'.-]/g, '').slice(0, 16) || s.name; dirty = true; } }; if (typeof textBox === 'function') textBox('NAME YOUR SONG', s.name, cb); else cb(window.prompt('NAME YOUR SONG', s.name)); }
      else if (r === 'PLAY / STOP') { if (playing) stop(); else play(); }
      else if (r === 'SAVE') { save(slot, s); dirty = false; say(`SAVED IN SLOT ${slot + 1}!`); Audio8.sfx('oneup'); }
      else if (r === 'USE IN MAKER') { if (!songs[slot]) { say('SAVE THE SONG FIRST'); Audio8.sfx('bump'); return; } const map = lsJ(MAPKEY, {}), cur = Object.keys(map).find((k) => map[k] === slot); let next = cur === undefined ? 0 : +cur + 1; Object.keys(map).forEach((k) => { if (map[k] === slot) delete map[k]; }); if (next <= 2) { map[next] = slot; say(`LEVEL MAKER SLOT ${next + 1} PLAYS THIS SONG`); } else say('NOT USED IN THE LEVEL MAKER'); lsS(MAPKEY, map); Audio8.sfx('coin'); }
      else if (r === 'SHARE CODE') { dom = true; codeBox(`SONG: ${s.name}`, encode(s), null, () => { dom = false; }); }
      else if (r === 'LOAD CODE') { dom = true; codeBox('PASTE A MUSIC STUDIO CODE (WMM1-...)', '', (c) => { const ns = decode(c); if (!ns) return false; s = ns; dirty = true; say(`LOADED '${ns.name}' - SAVE TO KEEP IT`); live(); return true; }, () => { dom = false; }); }
      else if (r === 'NEW (DEMO)') { s = demo(); dirty = true; live(); say('A FRESH DEMO TO START FROM'); }
      else if (r === 'CLEAR ALL') { s.mel.fill(null); s.chords = [-1, -1, -1, -1]; s.bass.fill(-1); s.drums.forEach((r2) => r2.fill(false)); dirty = true; live(); say('ALL CLEAR - MAKE SOMETHING NEW!'); }
      else if (r === 'BACK') { stop(); go(() => ExtrasList('MUSIC STUDIO')); }
      else songRow(r, 1);
    }
    return {
      enter() { Audio8.stop(); },
      update() {
        t++; if (msgT) msgT--; if (dom) return;
        if (Input.pressed('start')) { if (playing) stop(); else play(); Audio8.sfx('select'); return; }
        if (Input.pressed('run')) { tab = (tab + 1) % TABS.length; cy = Math.min(cy, rows() - 1); Audio8.sfx('select'); return; }
        if (Input.pressed('back')) { stop(); go(() => ExtrasList('MUSIC STUDIO')); return; }
        const L = Input.pressed('left'), R = Input.pressed('right'), U = Input.pressed('up'), D = Input.pressed('down'), A = Input.pressed('jump'), S = Input.pressed('special');
        if (tab === 4) {
          if (D) { sr = (sr + 1) % SONGROWS.length; Audio8.sfx('select'); } if (U) { sr = (sr + SONGROWS.length - 1) % SONGROWS.length; Audio8.sfx('select'); }
          if (L || R) { if (songRow(SONGROWS[sr], R ? 1 : -1)) Audio8.sfx('select'); }
          if (A) songAct(SONGROWS[sr]);
          return;
        }
        if (tab === 1) { // chords: one per half bar
          if (L) cx = (cx + 3) % 4; if (R) cx = (cx + 1) % 4; if (L || R) Audio8.sfx('select');
          if (U || D || A) { s.chords[cx] = ((s.chords[cx] + (D ? -1 : 1) + 1 + 8) % 8) - 1; dirty = true; live(); if (!playing && s.chords[cx] >= 0) { Audio8.addSong('studiotap', { studio: true, events: [{ s: 0, c: 'C', ms: chordMidis(s, s.chords[cx]), l: 6 }], total: 16, bpm: s.bpm, rev: s.rev, chordInst: s.chordInst === 4 ? 0 : s.chordInst }); Audio8.play('studiotap'); setTimeout(() => { if (!playing) Audio8.stop(); }, 700); } }
          if (S) { s.chords[cx] = -1; dirty = true; live(); }
          return;
        }
        if (L) cx = (cx + N - 1) % N; if (R) cx = (cx + 1) % N; if (U) cy = Math.min(rows() - 1, cy + 1); if (D) cy = Math.max(0, cy - 1);
        if (tab === 0) {
          const owner = (() => { for (let i = cx; i >= 0; i--) if (s.mel[i]) return i + s.mel[i].l > cx ? i : -1; return -1; })();
          if (A) { if (s.mel[cx] && s.mel[cx].p === cy) s.mel[cx] = null; else { if (owner >= 0 && owner !== cx) s.mel[owner].l = cx - owner; s.mel[cx] = { p: cy, l: s.mel[cx] ? s.mel[cx].l : 1 }; for (let i = cx + 1; i < cx + s.mel[cx].l && i < N; i++) s.mel[i] = null; audition(melMidi(s, cy)); } dirty = true; live(); }
          if (S && s.mel[cx]) { const ls = [1, 2, 3, 4, 6, 8]; s.mel[cx].l = ls[(ls.indexOf(s.mel[cx].l) + 1) % ls.length] || 1; for (let i = cx + 1; i < cx + s.mel[cx].l && i < N; i++) s.mel[i] = null; dirty = true; live(); }
        } else if (tab === 2) {
          if (A) { s.bass[cx] = s.bass[cx] === cy ? -1 : cy; if (s.bass[cx] >= 0) audition(bassMidi(s, cy)); dirty = true; live(); }
          if (S) { s.bass[cx] = -1; dirty = true; live(); }
        } else if (tab === 3) {
          if (A) { s.drums[3 - cy][cx] = !s.drums[3 - cy][cx]; dirty = true; live(); }
          if (S) { const row = s.drums[3 - cy], on = !row[cx]; for (let i = cx % 2; i < N; i += 2) row[i] = on; dirty = true; live(); }
        }
      },
      draw() {
        // a dark studio look with glowing cells (this screen is modern in both graphics modes)
        const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#120c2a'); g.addColorStop(1, '#22184a'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
        const col = TAB_COL[tab], step = playing ? Audio8.songStep() : -1, ps = step >= 0 ? Math.floor(step) % N : -1;
        txt('MUSIC STUDIO', 6, 4, '#ffffff'); txt(`${s.name}${dirty ? '*' : ''}`, 250, 4, '#a8b0d8', { align: 'right' });
        TABS.forEach((tb, i) => { const x = 4 + i * 50, on = i === tab; ctx.fillStyle = on ? TAB_COL[i] : 'rgba(255,255,255,0.08)'; ctx.globalAlpha = on ? 0.9 : 1; ctx.fillRect(x, 14, 48, 11); ctx.globalAlpha = 1; txt(tb, x + 24, 16, on ? '#120c2a' : TAB_COL[i], { align: 'center' }); });
        const GX = 26, GY = 30, GW = 224, GH = 138, cw = GW / N;
        ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(GX, GY, GW, GH);
        for (let i = 0; i <= N; i += 4) { ctx.fillStyle = i % 16 === 0 ? 'rgba(255,255,255,0.25)' : i % 8 === 0 ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)'; ctx.fillRect(GX + i * cw - 0.5, GY, 1, GH); }
        if (tab === 4) {
          drawWindow(20, 30, 216, 150); const top = clamp(sr - 5, 0, SONGROWS.length - 12);
          const v = { NAME: s.name, SLOT: `${slot + 1}${songs[slot] ? '' : ' (EMPTY)'}`, TEMPO: `${s.bpm} BPM`, KEY: NOTE[s.key], SCALE: SCALES[s.scale][0], SWING: ['NONE', 'LIGHT', 'MEDIUM', 'HEAVY'][s.swing], REVERB: ['DRY', 'ROOM', 'HALL', 'CATHEDRAL'][s.rev], 'MELODY SOUND': LEADS[s.lead], 'CHORD SOUND': CHORDS_I[s.chordInst], 'BASS SOUND': BASSES[s.bassInst], 'DRUM KIT': KITS[s.kit], 'PLAY / STOP': playing ? 'PLAYING' : '' };
          for (let i = 0; i < 12; i++) { const k = top + i, r = SONGROWS[k], y = 36 + i * 11, on = k === sr; if (!r) break; txt(r, 38, y, on ? '#ffe040' : '#fff'); if (v[r]) txt(v[r], 228, y, on ? '#ffe040' : '#a8f0ff', { align: 'right' }); if (on) txt('>', 28 + ((t >> 3) & 1), y, '#ffe040'); }
          ctx.fillStyle = '#a8b0d8'; if (top > 0) { ctx.beginPath(); ctx.moveTo(228, 40); ctx.lineTo(232, 34); ctx.lineTo(236, 40); ctx.fill(); } if (top + 12 < SONGROWS.length) { ctx.beginPath(); ctx.moveTo(228, 166); ctx.lineTo(232, 172); ctx.lineTo(236, 166); ctx.fill(); }
        } else if (tab === 1) {
          for (let k = 0; k < 4; k++) { const x = GX + k * 8 * cw + 2, w = 8 * cw - 4, on = k === cx, d = s.chords[k];
            ctx.fillStyle = d >= 0 ? 'rgba(255,210,74,0.28)' : 'rgba(255,255,255,0.05)'; ctx.fillRect(x, GY + 20, w, 90); if (on) { ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 1.5; ctx.strokeRect(x, GY + 20, w, 90); }
            txt(d >= 0 ? ROMAN[d] : '-', x + w / 2, GY + 44, '#ffd24a', { align: 'center', scale: 2 }); txt(chordName(s, d), x + w / 2, GY + 72, '#fff', { align: 'center' }); }
          txt(`KEY OF ${NOTE[s.key]} ${SCALES[s.scale][0]}`, GX + GW / 2, GY + 122, '#a8b0d8', { align: 'center' });
        } else {
          const R = rows(), rh = GH / R;
          for (let r = 0; r < R; r++) { const y = GY + GH - (r + 1) * rh; if (r % 2) { ctx.fillStyle = 'rgba(255,255,255,0.025)'; ctx.fillRect(GX, y, GW, rh); }
            const label = tab === 0 ? NOTE[melMidi(s, r) % 12] : tab === 2 ? NOTE[bassMidi(s, r) % 12] : ['KICK', 'SNR', 'HAT', 'OPEN'][3 - r]; txt(label, 2, Math.round(y + rh / 2 - 3), r === cy ? col : '#7a80a8'); }
          const cell = (i, r, l, c) => { const x = GX + i * cw + 0.5, y = GY + GH - (r + 1) * rh + 1, w = l * cw - 1, h = rh - 2; ctx.fillStyle = c; ctx.globalAlpha = 0.9; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 0.35; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x, y, w, 1); };
          if (tab === 0) s.mel.forEach((n, i) => { if (n) cell(i, n.p, Math.min(n.l, N - i), ps >= i && ps < i + n.l ? '#ffffff' : TAB_COL[0]); });
          if (tab === 2) s.bass.forEach((r, i) => { if (r >= 0) cell(i, r, 1, ps === i ? '#ffffff' : TAB_COL[2]); });
          if (tab === 3) s.drums.forEach((row, k) => row.forEach((on, i) => { if (on) cell(i, 3 - k, 1, ps === i ? '#ffffff' : TAB_COL[3]); }));
          const x = GX + cx * cw, y = GY + GH - (cy + 1) * rh; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, rh - 1);
        }
        if (ps >= 0 && tab !== 4) { const x = GX + (step % N) * cw; const pg = ctx.createLinearGradient(x - 6, 0, x + 2, 0); pg.addColorStop(0, 'rgba(255,255,255,0)'); pg.addColorStop(1, 'rgba(255,255,255,0.5)'); ctx.fillStyle = pg; ctx.fillRect(x - 6, GY, 8, GH); }
        // help bar
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 172, VW, 52);
        const help = tab === 0 ? ['A: NOTE ON/OFF   S: NOTE LENGTH', `${NOTE[melMidi(s, cy) % 12]}  STEP ${cx + 1}/32   ${LEADS[s.lead]}`] : tab === 1 ? ['UP/DOWN OR A: CHANGE CHORD   S: NONE', `${CHORDS_I[s.chordInst]} SOUND`] : tab === 2 ? ['A: NOTE ON/OFF   S: CLEAR STEP', `${NOTE[bassMidi(s, cy) % 12]}  STEP ${cx + 1}/32   ${BASSES[s.bassInst]} BASS`] : tab === 3 ? ['A: HIT ON/OFF   S: FILL EVERY OTHER STEP', `${DRUMS[3 - cy][0]}   ${KITS[s.kit]} KIT`] : ['<>: CHANGE   A: CHOOSE', `SLOT ${slot + 1}   ${s.bpm} BPM   ${NOTE[s.key]} ${SCALES[s.scale][0]}`];
        txt(help[0], 128, 176, '#fff', { align: 'center' }); txt(help[1], 128, 187, col, { align: 'center' });
        txt(`B: NEXT TAB   START: ${playing ? 'STOP' : 'PLAY'}`, 128, 200, '#a8b0d8', { align: 'center' });
        if (msgT) txt(msg, 128, 211, '#40e090', { align: 'center' });
      },
      _s: () => s, _set: (o) => { if (o.tab !== undefined) tab = o.tab; if (o.cx !== undefined) cx = o.cx; if (o.cy !== undefined) cy = o.cy; if (o.sr !== undefined) sr = o.sr; },
    };
  }
  if (typeof ACH_LIST !== 'undefined') ACH_LIST.push(['studio', 'IN THE STUDIO', 'SAVE A SONG IN THE MUSIC STUDIO']);
  return { StudioScene, demo, toDef, encode, decode, songs, save, melMidi, chordMidis, SCALES, MAPKEY };
})();
UPDATES.unshift(['2.3', ['NEW: MUSIC STUDIO (EXTRAS)', ' A MODERN MUSIC MAKER: MELODY,', ' CHORDS, BASS AND DRUMS', ' KEYS, SCALES, SWING, REVERB', ' PIANO, SYNTH, STRINGS, 808...', ' USE SONGS IN THE LEVEL MAKER', ' SHARE SONGS AS CODES + QR']]);
