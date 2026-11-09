'use strict';
// =====================================================================
// Batch H (part 3): menus for the new modes, jukebox + sound test,
// languages, the intro voice line, and the kart race with ramps,
// crashes and exploding karts.
// =====================================================================

// ---------------- menus ----------------
function ExtrasScene(start = 0) { // eslint-disable-line no-func-assign
  const items = [['LEVEL MAKER', () => LevelMakerScene(null)], ['COURSE WORLD', () => CourseWorldScene()], ['TROPHY ROOM', () => TrophyScene()], ['STICKER BOOK', () => StickerScene()], ['BESTIARY', () => BestiaryScene()],
    ['ART GALLERY', () => ArtScene()], ['JUKEBOX', () => JukeboxScene()], ['GALLERY', () => GalleryScene()], ['REPLAYS', () => ReplaysScene()], ['LEADERBOARDS', () => LeaderScene()], ['CREDITS', () => CreditsScene()],
    ['IMPORT SAVE', () => ImportSaveScene()], ['INSTALL APP', () => InstallScene()], ['OPTIONS', () => OptionsScene()], ['BACK', null]];
  let sel = start, t = 0; const SHOW = 11;
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
      drawParallax('sky', t * 0.3);
      drawLogo(4);
      drawWindow(60, 78, 136, 134);
      txt('EXTRAS', 128, 83, '#ffe040', { align: 'center' });
      const top = clamp(sel - 5, 0, items.length - SHOW);
      for (let i = 0; i < SHOW; i++) { const k = top + i, y = Math.round(95 + i * 10); txt(items[k][0], 84, y, k === sel ? '#ffe040' : '#fff'); if (k === sel) txt('>', 72 + ((t >> 3) & 1), y, '#ffe040'); }
      if (top > 0) txt('^', 186, 92, '#a8b0d8'); if (top + SHOW < items.length) txt('V', 186, 196, '#a8b0d8');
      txt(`TROPHIES ${Ach.count()}/${ACH_LIST.length}`, 128, 215, '#fff', { align: 'center', outline: '#101848' });
    },
  };
}
function ChallengeScene(start = 0) { // eslint-disable-line no-func-assign
  const items = ['TIME ATTACK', 'BOSS RUSH', 'DAILY CHALLENGE', 'ENDLESS RUN', 'VERSUS', 'SURVIVAL ARENA', 'HARD REMIX', "DOUG'S STORY", 'BACK'];
  const tips = ['RACE ANY LEVEL YOU HAVE BEATEN', 'EVERY BOSS BACK TO BACK!', "TODAY'S LEVEL WITH A TWIST", 'HOW FAR CAN YOU RUN?', 'TWO PLAYERS: RACE OR BATTLE', 'ENDLESS WAVES OF FOES', 'MEANER VERSIONS OF WALLY ISLAND', 'PLAY AS DOUG IN 3 NEW LEVELS', ''];
  const go_ = [() => TimeAttackSelect(), () => RushIntroScene(), () => DailyScene(), () => EndlessIntro(), () => VersusScene(), () => ArenaIntro(), () => RemixScene(), () => StoryMenu(Math.min(2, storyDone()))];
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
      drawParallax('castle', t * 0.4);
      drawLogo(4);
      drawWindow(48, 78, 160, 118);
      txt('CHALLENGES', 128, 83, '#ffe040', { align: 'center' });
      items.forEach((s, i) => { const y = 95 + i * 11; txt(s, 74, y, i === sel ? '#ffe040' : '#fff'); if (i === sel) txt('>', 62 + ((t >> 3) & 1), y, '#ffe040'); });
      txt(tips[sel], 128, 202, '#fff', { align: 'center', outline: '#101848' });
    },
  };
}

// ---------------- jukebox (songs unlock as you hear them) + sound test ----------------
const Heard = (() => {
  const KEY = 'wallyman-heard', got = lsJ(KEY, { title: 1, menu: 1, map: 1, grass: 1 });
  const _play = Audio8.play;
  Audio8.play = function (name) { const r = _play.call(Audio8, name); const cur = Audio8.current && Audio8.current(); if (cur && !got[cur]) { got[cur] = 1; lsS(KEY, got); } return r; };
  return { has: (k) => !!got[k] || Save.slots.some((s) => s && s.cleared && LEVELS.some((l, i) => s.cleared[i] && l.music === k)), all: () => { for (const k of Audio8.songs()) got[k] = 1; lsS(KEY, got); } };
})();
const SFX_NAMES = { jump: 'JUMP', coin: 'COIN', stomp: 'STOMP', bump: 'BUMP', brick: 'BRICK SMASH', sprout: 'ITEM SPROUT', power: 'POWER UP', signal: 'SIGNAL', hurt: 'OUCH', oneup: '1-UP', ping: 'PING', kick: 'KICK', check: 'CHECKPOINT', secret: 'SECRET!', boom: 'BOOM', spring: 'SPRING', roar: 'ROAR', freeze: 'FREEZE', thunder: 'THUNDER' };
function JukeboxScene() { // eslint-disable-line no-func-assign
  const songs = Audio8.songs().filter((k) => SONG_NAMES[k]), fx = (Audio8.sfxNames ? Audio8.sfxNames() : Object.keys(SFX_NAMES));
  let sel = 0, t = 0, playing = null, tab = 0, fsel = 0, lastFx = null, fxT = 0;
  return {
    enter() { Audio8.stop(); },
    update() {
      t++; if (fxT > 0) fxT--;
      if (Input.pressed('back') || Input.pressed('run')) { go(() => ExtrasScene(6)); return; }
      if (Input.pressed('left') || Input.pressed('right')) { tab = 1 - tab; Audio8.sfx('select'); }
      if (tab === 0) {
        if (Input.pressed('down')) { sel = (sel + 1) % songs.length; Audio8.sfx('select'); }
        if (Input.pressed('up')) { sel = (sel + songs.length - 1) % songs.length; Audio8.sfx('select'); }
        if (Input.pressed('jump') || Input.pressed('start')) { if (!Heard.has(songs[sel])) { Audio8.sfx('bump'); return; } playing = songs[sel]; Audio8.stop(); Audio8.play(playing); }
      } else {
        if (Input.pressed('down')) { fsel = (fsel + 1) % fx.length; Audio8.sfx('select'); }
        if (Input.pressed('up')) { fsel = (fsel + fx.length - 1) % fx.length; Audio8.sfx('select'); }
        if (Input.pressed('jump') || Input.pressed('start')) { lastFx = fx[fsel]; fxT = 30; Audio8.sfx(lastFx); }
      }
    },
    draw() {
      ctx.fillStyle = '#100820'; ctx.fillRect(0, 0, VW, VH);
      txt(tab ? 'SOUND TEST' : 'JUKEBOX', 128, 8, '#ffe040', { align: 'center', outline: '#3a1060' });
      txt('< MUSIC', 10, 8, tab ? '#7880b0' : '#5ff0ff'); txt('SOUNDS >', 246, 8, tab ? '#5ff0ff' : '#7880b0', { align: 'right' });
      const live = tab ? fxT > 0 : !!playing;
      for (let i = 0; i < 24; i++) { const h = live ? 4 + Math.abs(Math.sin(frame * 0.15 + i * 0.7) * Math.sin(frame * 0.05 + i)) * 26 : 2; ctx.fillStyle = i % 3 === 0 ? '#ff4aa8' : i % 3 === 1 ? '#5ff0ff' : '#ffe040'; ctx.fillRect(8 + i * 10, 52 - h, 7, h); }
      drawWindow(16, 58, 224, 138);
      if (tab === 0) {
        const top = Math.max(0, Math.min(songs.length - 11, sel - 5)), n = songs.filter((k) => Heard.has(k)).length;
        for (let i = 0; i < 11; i++) { const k = songs[top + i]; if (!k) break; const on = top + i === sel, y = 64 + i * 12, open = Heard.has(k); if (on) txt('>', 24 + ((t >> 3) & 1), y, '#ffe040'); txt(`${pad(top + i + 1, 2)} ${open ? SONG_NAMES[k] : '???????'}`, 34, y, on ? '#ffe040' : k === playing ? '#5ff0ff' : open ? '#fff' : '#7880b0'); }
        txt(playing ? 'NOW PLAYING: ' + SONG_NAMES[playing] : `${n}/${songs.length} SONGS HEARD - PLAY TO UNLOCK MORE`, 128, 204, '#fff', { align: 'center' });
      } else {
        const top = Math.max(0, Math.min(fx.length - 11, fsel - 5));
        for (let i = 0; i < 11; i++) { const k = fx[top + i]; if (!k) break; const on = top + i === fsel, y = 64 + i * 12; if (on) txt('>', 24 + ((t >> 3) & 1), y, '#ffe040'); txt(`${pad(top + i + 1, 2)} ${SFX_NAMES[k] || k.toUpperCase()}`, 34, y, on ? '#ffe040' : k === lastFx && fxT ? '#5ff0ff' : '#fff'); }
        txt(`${fx.length} SOUND EFFECTS   A: PLAY`, 128, 204, '#fff', { align: 'center' });
      }
      txt('< >: SWITCH   B: BACK', 128, 214, '#a8b0d8', { align: 'center' });
    },
  };
}

// ---------------- languages ----------------
const LANGS = ['ENGLISH', 'ESPANOL', 'FRANCAIS', 'DEUTSCH'];
const L10N = (() => {
  // [english, spanish, french, german]
  const rows = [
    ['PRESS START', 'PULSA START', 'APPUIE SUR START', 'DRUECKE START'], ['CHALLENGES', 'DESAFIOS', 'DEFIS', 'HERAUSFORDERUNGEN'], ['HIGH SCORES', 'RECORDS', 'MEILLEURS SCORES', 'BESTENLISTE'],
    ['ERASE FILE', 'BORRAR ARCHIVO', 'EFFACER', 'DATEI LOESCHEN'], ['CANCEL ERASE', 'CANCELAR', 'ANNULER', 'ABBRECHEN'], ['NEW GAME', 'NUEVA PARTIDA', 'NOUVELLE PARTIE', 'NEUES SPIEL'],
    ['1 PLAYER GAME', '1 JUGADOR', '1 JOUEUR', '1 SPIELER'], ['2P TAKE TURNS', '2J POR TURNOS', '2J CHACUN SON TOUR', '2S ABWECHSELND'], ['2P TOGETHER', '2J JUNTOS', '2J ENSEMBLE', '2S ZUSAMMEN'],
    ['PICK A FILE TO ERASE', 'ELIGE UN ARCHIVO', 'CHOISIS UN FICHIER', 'WAEHLE EINE DATEI'], ['PAUSED', 'PAUSA', 'PAUSE', 'PAUSE'], ['CONTINUE', 'CONTINUAR', 'CONTINUER', 'WEITER'],
    ['MUSIC', 'MUSICA', 'MUSIQUE', 'MUSIK'], ['SOUND FX', 'EFECTOS', 'EFFETS', 'EFFEKTE'], ['PHOTO MODE', 'MODO FOTO', 'MODE PHOTO', 'FOTOMODUS'], ['EXIT TO MAP', 'SALIR AL MAPA', 'RETOUR A LA CARTE', 'ZUR KARTE'],
    ['A: SELECT   < >: VOLUME', 'A: ELEGIR   < >: VOLUMEN', 'A: CHOISIR   < >: VOLUME', 'A: WAEHLEN  < >: LAUTSTAERKE'], ['COURSE CLEAR!', 'NIVEL SUPERADO!', 'NIVEAU TERMINE!', 'LEVEL GESCHAFFT!'],
    ['SECRET EXIT!', 'SALIDA SECRETA!', 'SORTIE SECRETE!', 'GEHEIMER AUSGANG!'], ['GAME OVER', 'FIN DEL JUEGO', 'PARTIE TERMINEE', 'SPIEL VORBEI'], ['HURRY UP!', 'DATE PRISA!', 'VITE!', 'BEEIL DICH!'],
    ['NO HIT', 'SIN DANO', 'SANS COUP', 'OHNE TREFFER'], ['OPTIONS', 'OPCIONES', 'OPTIONS', 'OPTIONEN'], ['DIFFICULTY', 'DIFICULTAD', 'DIFFICULTE', 'SCHWIERIGKEIT'], ['SCREEN SHAKE', 'TEMBLOR', 'TREMBLEMENT', 'WACKELN'],
    ['CRT FILTER', 'FILTRO CRT', 'FILTRE CRT', 'CRT FILTER'], ['RUMBLE', 'VIBRACION', 'VIBRATION', 'VIBRATION'], ['WEATHER', 'CLIMA', 'METEO', 'WETTER'], ['EVENTS', 'EVENTOS', 'EVENEMENTS', 'EVENTS'],
    ['COLORS', 'COLORES', 'COULEURS', 'FARBEN'], ['READABLE TEXT', 'TEXTO CLARO', 'TEXTE LISIBLE', 'LESBARER TEXT'], ['CONTROLS', 'CONTROLES', 'COMMANDES', 'STEUERUNG'], ['LANGUAGE', 'IDIOMA', 'LANGUE', 'SPRACHE'],
    ['INTRO VOICE', 'VOZ INICIAL', 'VOIX INTRO', 'INTRO STIMME'], ['ASSIST', 'AYUDA', 'AIDE', 'HILFE'], ['SOUND', 'SONIDO', 'SON', 'TON'], ['BACK', 'VOLVER', 'RETOUR', 'ZURUECK'],
    ['START: TRAVEL', 'START: VIAJAR', 'START: VOYAGER', 'START: REISEN'], ['START: ENTER', 'START: ENTRAR', 'START: ENTRER', 'START: BETRETEN'], ['START: OPEN', 'START: ABRIR', 'START: OUVRIR', 'START: OEFFNEN'],
    ['START: HOUSE', 'START: CASA', 'START: MAISON', 'START: HAUS'], ['LOCKED DOOR', 'PUERTA CERRADA', 'PORTE FERMEE', 'TUER ZU'], ['TROPHY ROOM', 'TROFEOS', 'TROPHEES', 'TROPHAEEN'], ['STICKER BOOK', 'ALBUM', 'ALBUM', 'STICKERALBUM'],
    ['BESTIARY', 'BESTIARIO', 'BESTIAIRE', 'BESTIARIUM'], ['ART GALLERY', 'GALERIA DE ARTE', 'GALERIE D ART', 'KUNSTGALERIE'], ['GALLERY', 'GALERIA', 'GALERIE', 'GALERIE'], ['REPLAYS', 'REPETICIONES', 'REPLAYS', 'WIEDERHOLUNGEN'],
    ['LEADERBOARDS', 'CLASIFICACION', 'CLASSEMENTS', 'RANGLISTEN'], ['CREDITS', 'CREDITOS', 'CREDITS', 'ABSPANN'], ['IMPORT SAVE', 'IMPORTAR', 'IMPORTER', 'IMPORTIEREN'], ['INSTALL APP', 'INSTALAR APP', 'INSTALLER', 'APP INSTALLIEREN'],
    ['LEVEL MAKER', 'EDITOR', 'EDITEUR', 'LEVEL EDITOR'], ['COURSE WORLD', 'MUNDO DE NIVELES', 'MONDE DES NIVEAUX', 'LEVELWELT'], ['TIME ATTACK', 'CONTRARRELOJ', 'CONTRE LA MONTRE', 'ZEITRENNEN'],
    ['BOSS RUSH', 'JEFES SEGUIDOS', 'BOSS RUSH', 'BOSS MARATHON'], ['DAILY CHALLENGE', 'RETO DIARIO', 'DEFI DU JOUR', 'TAGESAUFGABE'], ['ENDLESS RUN', 'CARRERA SIN FIN', 'COURSE INFINIE', 'ENDLOSLAUF'],
    ['SURVIVAL ARENA', 'ARENA', 'ARENE DE SURVIE', 'UEBERLEBENSARENA'], ['HARD REMIX', 'REMIX DIFICIL', 'REMIX DIFFICILE', 'SCHWERER REMIX'], ["DOUG'S STORY", 'HISTORIA DE DOUG', 'HISTOIRE DE DOUG', 'DOUGS GESCHICHTE'],
    ['TROPHIES', 'TROFEOS', 'TROPHEES', 'TROPHAEEN'], ['STARS', 'ESTRELLAS', 'ETOILES', 'STERNE'], ['MEDALS', 'MEDALLAS', 'MEDAILLES', 'MEDAILLEN'], ['WAVE', 'OLEADA', 'VAGUE', 'WELLE'],
    ['LAP', 'VUELTA', 'TOUR', 'RUNDE'], ['POSITION', 'POSICION', 'POSITION', 'PLATZ'], ['COINS', 'MONEDAS', 'PIECES', 'MUENZEN'], ['LEVEL', 'NIVEL', 'NIVEAU', 'LEVEL'], ['TIME', 'TIEMPO', 'TEMPS', 'ZEIT'],
    ['FILE', 'ARCHIVO', 'FICHIER', 'DATEI'], ['BEST', 'MEJOR', 'RECORD', 'BESTE'], ['WORLD', 'MUNDO', 'MONDE', 'WELT'], ['MINI-GAMES', 'MINIJUEGOS', 'MINI-JEUX', 'MINISPIELE'], ['LEAVE', 'SALIR', 'PARTIR', 'GEHEN'],
    ['PLAYERS', 'JUGADORES', 'JOUEURS', 'SPIELER'], ['CHAPTER', 'CAPITULO', 'CHAPITRE', 'KAPITEL'], ['REPLAY', 'REPETICION', 'REPLAY', 'WIEDERHOLUNG'], ['RADAR', 'RADAR', 'RADAR', 'RADAR'],
  ];
  const exact = [{ ON: 'ON', OFF: 'OFF' }, { ON: 'SI', OFF: 'NO', EASY: 'FACIL', HARD: 'DIFICIL', EXTRAS: 'EXTRAS' }, { ON: 'OUI', OFF: 'NON', EASY: 'FACILE', HARD: 'DIFFICILE', EXTRAS: 'BONUS' }, { ON: 'AN', OFF: 'AUS', EASY: 'LEICHT', HARD: 'SCHWER', EXTRAS: 'EXTRAS' }];
  const sorted = rows.slice().sort((a, b) => b[0].length - a[0].length).map((r) => [new RegExp(`(^|[^A-Z'])${r[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Z])`, 'g'), r]);
  const cache = new Map();
  return {
    tr(s, li) {
      if (!li || typeof s !== 'string' || !/[A-Z]/.test(s)) return s;
      const ck = li + '|' + s; if (cache.has(ck)) return cache.get(ck);
      let out = exact[li][s.trim()] !== undefined ? exact[li][s.trim()] : s;
      if (out === s) for (const [re, r] of sorted) if (s.includes(r[0])) out = out.replace(re, (m, pre) => pre + r[li]);
      if (cache.size > 4000) cache.clear(); cache.set(ck, out); return out;
    },
  };
})();
{
  const langIdx = () => Math.max(0, LANGS.indexOf(Settings.get('lang') || 'ENGLISH'));
  const _fd = Font.draw, _fw = Font.width;
  Font.draw = function (c, s, x, y, o) { const li = langIdx(); return _fd.call(Font, c, li ? L10N.tr(String(s), li) : s, x, y, o); };
  Font.width = function (s, ...r) { const li = langIdx(); return _fw.call(Font, li ? L10N.tr(String(s), li) : s, ...r); };
}

// ---------------- the intro voice line (now and then, as the game starts) ----------------
const IntroVoice = (() => {
  let said = false;
  const pick = () => {
    const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [], en = vs.filter((v) => /^en/i.test(v.lang));
    const fem = /female|samantha|victoria|karen|moira|tessa|serena|fiona|zira|hazel|susan|libby|sonia|aria|jenny|kate|allison|ava|joanna|salli|amy|emma|martha|catherine|natasha/i;
    return en.find((v) => fem.test(v.name) && /gb|uk|british/i.test(v.lang + v.name)) || en.find((v) => fem.test(v.name)) || en[0] || vs[0] || null;
  };
  if (window.speechSynthesis) { try { speechSynthesis.getVoices(); speechSynthesis.addEventListener('voiceschanged', () => {}); } catch (e) { /* ignore */ } }
  function speak() {
    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return false;
    try {
      const u = new SpeechSynthesisUtterance('WallyMan World... created by Claude, and Doug Thomson. Enjoy the game.');
      const v = pick(); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-GB';
      u.rate = 0.82; u.pitch = 0.9; u.volume = 1;
      speechSynthesis.cancel(); speechSynthesis.speak(u); window.lastVoiceLine = u.text; return true;
    } catch (e) { return false; }
  }
  return { maybe() { if (said) return; said = true; if (Settings.get('voice') === false) return; if (Math.random() < (window.VOICE_CHANCE !== undefined ? window.VOICE_CHANCE : 0.5)) setTimeout(speak, 300); }, speak };
})();
{
  const _T = TitleScene;
  TitleScene = function (...a) { // eslint-disable-line no-func-assign
    const s = _T(...a), u = s.update;
    s.update = function () { if (Input.confirm()) IntroVoice.maybe(); return u.call(this); };
    return s;
  };
}

// ---------------- kart race: ramps, bumping, damage and exploding karts ----------------
function KartScene() { // eslint-disable-line no-func-assign
  const CX = 128, CY = 118, RX = 100, RY = 70, LAPS = 3, HALF = 16, TH0 = Math.PI / 2 + 0.08;
  const RAMPS = [0.05, Math.PI + 0.05, Math.PI * 1.5];
  const thOf = (x, y) => Math.atan2((y - CY) / RY, (x - CX) / RX);
  const pt = (th, lane = 0) => [CX + Math.cos(th) * (RX + lane), CY + Math.sin(th) * (RY + lane)];
  const dirAt = (th) => Math.atan2(RY * Math.cos(th), -RX * Math.sin(th));
  const mk = (i, col, name, ai, maxV, mean) => { const th = TH0 + i * 0.13, lane = i % 2 ? 9 : -9, [x, y] = pt(th, lane); return { x, y, z: 0, vz: 0, h: dirAt(th), v: 0, hp: 100, dead: 0, inv: 0, prog: 0, last: thOf(x, y), col, name, ai, maxV, mean, lane, kx: 0, ky: 0, rampCool: 0, myHit: 0, done: false }; };
  const me = mk(0, '#ff5040', HEROES[heroOf()].short || 'YOU', false, 2.3, false);
  const karts = [me, mk(1, '#40a0ff', 'DINO', true, 2.12, false), mk(2, '#5ae060', 'GRUMB', true, 2.06, false), mk(3, '#ffd040', 'BARON', true, 2.02, true)];
  const parts = [];
  let t = 0, count = 180, done = false, place = 0, award = 0;
  const off = (k) => { const th = thOf(k.x, k.y), [ex, ey] = pt(th); return Math.hypot(k.x - ex, k.y - ey) > HALF; };
  const boom = (k) => {
    k.dead = 150; k.hp = 0; k.v = 0; k.z = 0; Audio8.sfx('boom'); if (k === me || k.myHit > 0) rumble(1, 400);
    for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2, s = 0.6 + (i % 4) * 0.5; parts.push({ x: k.x, y: k.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 30 + (i % 5) * 6, col: ['#ffe060', '#ff7020', '#ff3020', '#ffffff'][i % 4], s: 2 + (i % 2) }); }
    for (let i = 0; i < 6; i++) parts.push({ x: k.x, y: k.y, vx: (i - 2.5) * 0.8, vy: -2 - (i % 3), g: 0.12, life: 50, col: k.col, s: 3 });
    if (k.ai && k.myHit > 0) Ach.unlock('kartboom');
  };
  const hurt = (k, n) => { if (k.dead || k.inv > 0) return; k.hp = Math.max(0, k.hp - n); if (k.hp <= 0) boom(k); };
  return {
    enter() { Audio8.play('charge'); },
    update() {
      t++;
      for (const q of parts) { q.life--; q.x += q.vx; q.y += q.vy; if (q.g) q.vy += q.g; } for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
      if (Input.pressed('back')) { go(() => MiniGamesScene()); return; }
      if (done) { if (Input.confirm() && t > 60) go(() => MiniGamesScene()); return; }
      if (count > 0) { count--; if (count % 60 === 0) Audio8.sfx(count ? 'tick' : 'confirm'); return; }
      const leadProg = Math.max(...karts.filter((k) => k.ai).map((k) => k.prog));
      for (const k of karts) {
        if (k.inv > 0) k.inv--; if (k.myHit > 0) k.myHit--; if (k.rampCool > 0) k.rampCool--;
        if (k.dead > 0) { if (--k.dead === 0) { const th = thOf(k.x, k.y), [x, y] = pt(th, k.lane * 0.5); k.x = x; k.y = y; k.h = dirAt(th); k.hp = 100; k.inv = 90; k.v = 0; } else { if (k.dead % 6 === 0) parts.push({ x: k.x + (k.dead % 5) - 2, y: k.y - 4, vx: 0.1, vy: -0.5, life: 30, col: 'rgba(60,60,70,0.7)', s: 3 }); continue; } }
        const air = k.z > 0, offTrack = !air && off(k), maxV = (offTrack ? 0.95 : k.maxV) * (k.ai ? (k.prog > me.prog + 1.2 ? 0.94 : k.prog < me.prog - 1.2 ? 1.07 : 1) : 1);
        if (!air && !k.done) {
          if (k.ai) {
            const th = thOf(k.x, k.y), wob = Math.sin(t * 0.013 + k.maxV * 50) * 6;
            let [tx, ty] = pt(th + 0.34, k.lane + wob);
            const dme = Math.hypot(me.x - k.x, me.y - k.y);
            if (k.meanCool > 0) k.meanCool--; else if (k.mean && !me.dead && me.z === 0 && dme < 46 && dme > 6) { tx = me.x; ty = me.y; }
            let d = Math.atan2(ty - k.y, tx - k.x) - k.h; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
            k.h += clamp(d, -0.07, 0.07); k.v = Math.min(maxV, k.v + 0.045);
            if (k.v > maxV) k.v -= 0.06;
          } else {
            const steer = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0);
            k.h += steer * 0.055 * (0.4 + Math.min(1, k.v / 2));
            if (Input.down('jump')) k.v = Math.min(maxV, k.v + 0.05); else k.v = Math.max(0, k.v - 0.03);
            if (Input.down('run')) k.v = Math.max(0, k.v - 0.08); if (k.v > maxV) k.v -= 0.08;
          }
          // ramps launch you into the air
          const th = thOf(k.x, k.y);
          if (!k.rampCool && k.v > 1.1 && !offTrack) for (const a of RAMPS) { let d = th - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; if (Math.abs(d) < 0.045) { k.vz = 0.8 + k.v * 0.18; k.z = 0.1; k.rampCool = 40; if (k === me || Math.hypot(k.x - me.x, k.y - me.y) < 90) Audio8.sfx('spring'); } }
        } else if (k.done) k.v = Math.max(0, k.v - 0.03);
        if (air) { k.z += k.vz; k.vz -= 0.07; if (k.z <= 0) { k.z = 0; k.vz = 0; for (let i = 0; i < 4; i++) parts.push({ x: k.x + (i - 1.5) * 4, y: k.y + 3, vx: (i - 1.5) * 0.3, vy: -0.3, life: 14, col: '#d0d0d0', s: 2 }); if (k === me) Audio8.sfx('bump'); for (const o of karts) if (o !== k && !o.dead && o.z === 0 && Math.hypot(o.x - k.x, o.y - k.y) < 11) { hurt(o, 34); hurt(k, 12); if (k === me) o.myHit = 120; Audio8.sfx('stomp'); } } }
        k.x += Math.cos(k.h) * k.v + k.kx; k.y += Math.sin(k.h) * k.v + k.ky; k.kx *= 0.85; k.ky *= 0.85;
        k.x = clamp(k.x, 6, VW - 6); k.y = clamp(k.y, 30, VH - 6);
        const nth = thOf(k.x, k.y); let d = nth - k.last; if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; k.prog += d; k.last = nth;
        if (k.hp < 50 && t % (k.hp < 25 ? 3 : 7) === 0) parts.push({ x: k.x, y: k.y - 2 - k.z, vx: 0.1, vy: -0.45, life: 26, col: k.hp < 25 && (t & 4) ? '#ff7020' : 'rgba(80,80,90,0.75)', s: 2 });
        if (k.prog >= LAPS * Math.PI * 2 && !k.done) k.done = true;
      }
      // bumping into each other: the faster kart deals more damage
      for (let i = 0; i < karts.length; i++) for (let j = i + 1; j < karts.length; j++) {
        const a = karts[i], b = karts[j]; if (a.dead || b.dead || Math.abs(a.z - b.z) > 6) continue;
        const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy); if (dist >= 11 || dist === 0) continue;
        const nx = dx / dist, ny = dy / dist, push = (11 - dist) / 2; a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
        const va = Math.cos(a.h) * a.v * nx + Math.sin(a.h) * a.v * ny, vb = Math.cos(b.h) * b.v * nx + Math.sin(b.h) * b.v * ny, rel = va - vb;
        if (rel <= 0.15) continue;
        const dmg = 4 + rel * 15; hurt(a, va > vb ? dmg * 0.5 : dmg); hurt(b, vb > va ? dmg * 0.5 : dmg);
        a.kx -= nx * rel * 1.2; a.ky -= ny * rel * 1.2; b.kx += nx * rel * 1.2; b.ky += ny * rel * 1.2; a.v *= 0.7; b.v *= 0.7;
        if (a === me) { b.myHit = 120; b.meanCool = 200; } if (b === me) { a.myHit = 120; a.meanCool = 200; }
        for (let s = 0; s < 6; s++) parts.push({ x: a.x + dx / 2, y: a.y + dy / 2, vx: Math.cos(s) * 1.5, vy: Math.sin(s) * 1.5 - 0.5, life: 12, col: '#ffe060', s: 1 });
        if (a === me || b === me) { Audio8.sfx('kick'); rumble(Math.min(1, 0.3 + rel * 0.3), 120); } else if (Math.hypot(a.x - me.x, a.y - me.y) < 100) Audio8.sfx('bump');
      }
      me.lap = Math.min(LAPS, Math.floor(Math.max(0, me.prog) / (Math.PI * 2)) + 1);
      me.rank = 1 + karts.filter((k) => k.ai && k.prog > me.prog).length;
      if (me.done || karts.filter((k) => k.ai && k.done).length === 3 || leadProg > LAPS * Math.PI * 2 + Math.PI * 1.5) {
        done = true; t = 0; place = me.done ? 1 + karts.filter((k) => k.ai && k.prog > me.prog).length : 4;
        award = [0, 20, 10, 5, 2][place];
        game.coins += award; while (game.coins >= 100) { game.coins -= 100; game.lives++; } if (place === 1) Ach.unlock('kart'); Save.persist(); Audio8.play(place === 1 ? 'victory' : 'clear');
      }
    },
    draw() {
      ctx.fillStyle = '#5ac858'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#4ab048'; for (let y = 0; y < VH; y += 12) for (let x = (y % 24); x < VW; x += 24) ctx.fillRect(x, y, 2, 2);
      ctx.lineWidth = 34; ctx.strokeStyle = '#e8e8f0'; ctx.beginPath(); ctx.ellipse(CX, CY, RX, RY, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 30; ctx.strokeStyle = '#7a7a8a'; ctx.beginPath(); ctx.ellipse(CX, CY, RX, RY, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1; ctx.setLineDash([6, 6]); ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(CX, CY, RX, RY, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#ffffff'; for (let k = 0; k < 8; k++) ctx.fillRect(CX - 2 + (k % 2) * 2, CY + RY - 16 + k * 4, 2, 4);
      ctx.fillStyle = '#f0d890'; ctx.beginPath(); ctx.ellipse(CX, CY, RX - 30, RY - 30, 0, 0, Math.PI * 2); ctx.fill(); ctx.drawImage(Island, 64, 56, 128, 112, CX - 50, CY - 32, 100, 64);
      for (const a of RAMPS) { // striped ramps across the track
        for (let s = -14; s <= 14; s += 2) { const [x0, y0] = pt(a - 0.04, s), [x1, y1] = pt(a + 0.04, s); ctx.strokeStyle = ((s + 14) >> 2) % 2 ? '#ffd040' : '#1a1020'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
        const [ax, ay] = pt(a, 0), h = dirAt(a); ctx.fillStyle = '#ffffff'; for (let k = 0; k < 3; k++) ctx.fillRect(Math.round(ax + Math.cos(h) * (k * 3 - 3)) - 1, Math.round(ay + Math.sin(h) * (k * 3 - 3)) - 1, 2, 2);
      }
      const drawKart = (k) => {
        const lift = Math.round(k.z);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(k.x, k.y + 3, 7 - Math.min(3, lift / 6), 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(Math.round(k.x), Math.round(k.y) - lift); ctx.rotate(k.h); const sc = 1 + Math.min(0.3, k.z * 0.025); ctx.scale(sc, sc);
        if (k.dead) { ctx.fillStyle = '#2a2a2a'; ctx.fillRect(-7, -5, 14, 10); ctx.fillStyle = '#4a3a3a'; ctx.fillRect(-5, -3, 10, 6); ctx.restore(); return; }
        if (k.inv > 0 && (t >> 2) & 1) ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#1a1020'; ctx.fillRect(-7, -5, 14, 10); ctx.fillStyle = k.col; ctx.fillRect(-6, -4, 12, 8); ctx.fillStyle = '#1a1020'; ctx.fillRect(-6, -6, 4, 2); ctx.fillRect(2, -6, 4, 2); ctx.fillRect(-6, 4, 4, 2); ctx.fillRect(2, 4, 4, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(2, -3, 3, 6);
        ctx.restore(); ctx.globalAlpha = 1;
        ctx.fillStyle = k === me ? '#f2b48a' : '#ffffff'; ctx.fillRect(Math.round(k.x) - 2, Math.round(k.y) - 3 - lift, 4, 4);
        if (k.hp < 100) { ctx.fillStyle = '#1a1020'; ctx.fillRect(Math.round(k.x) - 7, Math.round(k.y) - 11 - lift, 14, 3); ctx.fillStyle = k.hp > 50 ? '#5ae060' : k.hp > 25 ? '#ffd040' : '#ff3040'; ctx.fillRect(Math.round(k.x) - 6, Math.round(k.y) - 10 - lift, Math.round(12 * k.hp / 100), 1); }
      };
      karts.slice().sort((a, b) => a.y + a.z - (b.y + b.z)).forEach(drawKart);
      for (const q of parts) { ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x), Math.round(q.y), q.s, q.s); }
      drawWindow(4, 2, 248, 20); txt(`LAP ${me.lap || 1}/${LAPS}`, 10, 8, '#ffe040'); txt(`POSITION ${me.rank || 1}/4`, 246, 8, '#fff', { align: 'right' });
      txt('HP', 92, 8, '#fff'); ctx.fillStyle = '#1a1020'; ctx.fillRect(106, 8, 52, 7); ctx.fillStyle = me.hp > 50 ? '#5ae060' : me.hp > 25 ? '#ffd040' : '#ff3040'; ctx.fillRect(107, 9, Math.round(50 * me.hp / 100), 5);
      if (me.dead) txt('KABOOM! RESPAWNING...', 128, 100, (t >> 3) & 1 ? '#ff6040' : '#ffe040', { align: 'center', outline: '#101848' });
      if (!done) txt('A: GO  B: BRAKE  < >: STEER  RAMPS = JUMP!', 128, 212, '#fff', { align: 'center', outline: '#101848' });
      if (count > 0) txt(String(Math.ceil(count / 60)), 128, 100, '#ffe040', { scale: 3, align: 'center', outline: '#101848' });
      if (count <= 0 && count > -40) txt('GO!', 128, 100, '#5ae060', { scale: 3, align: 'center', outline: '#101848' });
      if (done) { drawWindow(48, 80, 160, 60); txt(['', '1ST PLACE!', '2ND PLACE', '3RD PLACE', '4TH PLACE'][place], 128, 90, place === 1 ? '#ffe040' : '#fff', { scale: 2, align: 'center' }); txt(`+${award} COINS`, 128, 112, '#5ff0ff', { align: 'center' }); if ((t >> 4) & 1) txt('PRESS START', 128, 126, '#fff', { align: 'center' }); }
      if (count <= 0) count--;
    },
  };
}

// the first title screen was made before these extras loaded: rebuild it so they apply
if (typeof scene !== 'undefined' && scene && scene.isTitle) { scene = TitleScene(); if (scene.enter) scene.enter(); }
