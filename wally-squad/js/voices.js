// Unit voices: record your own lines (and your friends') for every unit with the microphone.
// Clips are stored in this browser (IndexedDB) and can be exported / imported as a voice pack file.
// Units without a recording fall back to the computer's text-to-speech with a per-unit voice.
import { UNITS } from './config.js';
import { duckMusic } from './audio.js';
import { G } from './state.js';

export const EVENTS = { select: 'Selected', move: 'Move order', attack: 'Attack order' };
const DEFAULT_LINES = {
  warlord: { select: ['Grak hungers.', 'Who dares summon the Warlord?', 'Grimlock, to me!'], move: ['Grak marches!', 'Out of my way.'], attack: ['WAAAR!', 'Crush them all!', 'Feel the cannon of Grak!'] },
  wallyman: {
    select: ['Wally Man is here, ya dancer!', 'Nae bother, Wally Man is oan it!', 'Haw! Who called fur a hero?', 'Och aye, cape oan, specs oan!',
      'Wally Man, reportin fur duty!', 'Gatling is birlin, Wally Man is ready!', 'Ah am here tae save the day, so ah am!', 'Grimlocks, yer in fur it noo!',
      'Mon then, let us huv ye!', 'Wally Man never misses, by the way!', 'Pure dead brilliant, a hero!', 'Gonnae gie them laldy!', 'Wally Man, at yer service!',
      'Away an bile yer heid, Grimlocks!', 'Haud oan, Wally Man is comin!', 'Awright pal? Wally Man here!', 'Haud yer wheesht, the hero has arrived!',
      'Gonnae no dae that, Grimlocks!', 'Ah am pure buzzin fur a scrap!', 'Whit is the craic?', 'Ya wee dancer!', 'Ah am no feart!',
      'Ah could murder a fish supper.', 'Is that you or the Irn Bru talkin?', 'Ma maw says ah am the best hero in the toon.', 'Dinnae fash yersel, Wally Man is here!',
      'Braw day fur a battle!', 'Ah am a pure belter, so ah am!', 'Whit are ye lookin at? Ah am gorgeous!', 'Och, ma cape is aw crumpled.',
      'Gie us a minute, ah am eatin ma piece.', 'Haw! Ah have goat ma specs oan an everything!', 'Who is a hero? Me! Ah am a hero!', 'Ah am that fast ah can catch a haggis!'],
    move: ['Up, up an awa!', 'Tae the rescue!', 'Ah am aff!', 'Shift yersel!', 'Ah am awa!', 'Hink ah will go fur a wee wander.', 'Gaun yersel!', 'Shift, shift, shift!', 'Ah am oan ma way, keep the kettle oan!', 'Haud oan, ah am comin!'],
    attack: ['Gie it laldy!', 'Taste the Gatling, ya numpties!', 'Get it right up ye!', 'Wally Man, open fire!', 'Ya beauty!', 'Get tore in!', 'Ye have had it noo!', 'Ah will skelp ye!', 'Gie them pelters!', 'Mon then, square go!', 'Taste ma Gatling, ya bampots!'],
    kill: ['Ya dancer!', 'That is you telt!', 'Pure dead brilliant!', 'Away ye go!', 'Hasta la vista, bampot!', 'Ah am gonnae need a bigger kilt.', 'Another wan bites the dust!', 'Haw! Did ye see that?', 'Sorted!'],
    hurt: ['Ah am pure wabbit!', 'Ma heid is nippin!', 'Somebody get me an Irn Bru!', 'Ah have hud better days!', 'Ow! That is gonnae leave a mark!', 'Medic! An a cup of tea!'],
    win: ['Ya dancer! We won!', 'Pure dead brilliant! Get the kettle oan!', 'That is them telt! Who is fur chips?', 'Haw! Victory! Ah am buyin the Irn Bru!'],
    lose: ['Aw naw... ah am gonnae greet.', 'We have been pumped, so we have.', 'Och, that is a right sair yin.'],
    dragon: ['A dragon! Ah have seen bigger midgies!', 'Get it doon, lads!', 'Mon then, ya big lizard!'],
    haggis: ['Haggis fur tea!', 'Ah have been chasin that wee beastie fur years!', 'Haw! Caught the haggis!'],
  },
  dog: { select: ['Woof!', 'Arf arf!', 'Grrrr!'], move: ['Woof woof!', 'Arf!'], attack: ['GRRRR!', 'Bark bark bark!'] },
  grenadier: { select: ['Grenadier ready.', 'Who ordered the fireworks?', 'Pins out, sir!', 'Got a pocket full of boom.'], move: ['Moving. Keep your heads down.', 'On it.', 'Relocating.'], attack: ['Fire in the hole!', 'Grenade out!', 'Catch!'] },
  boomer: { select: ['Hehehe! Boom time?', 'Gimme something to blow up!', 'Ooh, shiny fuse!', 'Me go big bang!'], move: ['Running, running!', 'Hehehehe!', 'Outta my way!'], attack: ['KABOOOOM!', 'For the Legion! Hehehe!', 'Here comes the BANG!'] },
  wyvern: { select: ['SKREEEEE!', 'Wyvern ready! Hehehe!', 'Up, up, up!'], move: ['Flap faster, beastie!', 'To the skies!'], attack: ['BURN THEM!', 'Breathe fire, beastie!', 'Roast em!'] },
  teslatruck: { select: ['Tesla Truck, fully charged!', 'Volts are up!', 'Mind the sparks.'], move: ['Rolling out.', 'Moving the coil.'], attack: ['Light em up!', 'Unlimited power!', 'Zap zap!'] },
  mech: { select: ['Mech online. All systems green.', 'Wally Mech, standing tall!', 'Big feet, bigger guns.'], move: ['Stomping over.', 'Moving out. Mind your toes.'], attack: ['Twin cannons, fire!', 'Target locked!', 'Stomp them flat!'] },
  troll: { select: ['Hhrrrmm. Troll here.', 'Troll hungry...', 'Who wake troll?'], move: ['Troll go.', 'Stomp stomp.'], attack: ['TROLL SMASH!', 'Crush puny things!', 'RRRAAAGH!'] },
  spy: { select: ['Agent reporting. Nobody saw me.', 'Shaken, not stirred.', 'I was never here.', 'Disguise is ready.'], move: ['Blending in.', 'Moving quietly.', 'Just another face in the crowd.'], attack: ['Time to infiltrate.', 'They will never know.', 'Going in.'] },
  catapult: { select: ['Big rock ready!', 'Catapult crew here!', 'Load the boulder!'], move: ['Push, push!', 'Roll it out!'], attack: ['FLING IT!', 'Rocks away!', 'Smash their walls!'] },
  shieldgen: { select: ['Shields up!', 'Shield Projector online.', 'Stay close, stay safe.'], move: ['Moving the bubble.', 'Keep together, everyone!'], attack: ['I am not armed, but I have got your back!', 'Shields holding!'] },
  piper: { select: ['Piper ready! Wheesht an listen!', 'The pipes, the pipes are callin!', 'Ah will play ye intae battle!'], move: ['Marchin oan!', 'Follow the pipes!'], attack: ['Gie them a tune!', 'Pipe them doon!'] },
  drummer: { select: ['BOOM. BOOM. BOOM.', 'War drums ready!', 'Grimlocks, march to the beat!'], move: ['Drum on!', 'Keep the beat!'], attack: ['Faster! FASTER!', 'Drums of war!'] },
  blink: { select: ['Blink Trooper, phase locked.', 'Now you see me...', 'Ready to jump.'], move: ['Blinking!', 'Zip!', 'See you there!'], attack: ['Laser online!', 'Surprise!'] },
  burrower: { select: ['Drill spinning!', 'Dig dig dig!', 'Tunnel Drill ready!'], move: ['Going under!', 'Diggin in!'], attack: ['DRILL THEM!', 'Bursting out!'] },
  medevac: { select: ['Medevac standing by.', 'Who needs patching up?', 'Rescue chopper ready!'], move: ['On my way.', 'Inbound to the wounded.'], attack: ['I am a medic, not a gunship!', 'Holding over the troops.'] },
  freezetank: { select: ['Freeze Tank, chilled and ready.', 'Stay frosty!', 'Ice to meet you!'], move: ['Rolling, nice and cool.', 'Brrr, moving out.'], attack: ['Freeze!', 'Chill out!', 'Ice ice, baby!'] },
  haggislauncher: { select: ['Haggis Launcher, loaded and steaming!', 'Wha\'s like us? Haggis ready!', 'Hot haggis, coming right up!'], move: ['Rolling, mind the neeps.', 'On the move, pal.'], attack: ['Haggis away!', 'Get that doon ye!', 'Fire the puddin\'!', 'Chieftain o\' the puddin\' race!'] },
  caber: { select: ['Caber Tosser! Ah\'ve tossed bigger trees than this!', 'Aye, whit is it?', 'Highland Games champion, at yer service!'], move: ['Mind yer heids!', 'On ma way, wi\' ma wee stick.'], attack: ['TIMBERRR!', 'Catch this, ya numpty!', 'Have a caber!'] },
  rocketeer: { select: ['Rocket pack fuelled, hehe!', 'Whee! Ready!', 'Goblin airways!'], move: ['Zooooom!', 'Flying, flying!'], attack: ['Rockets away, hehe!', 'Boom from above!', 'Eat my exhaust!'] },
  zeppelin: { select: ['Zeppelin floating, hehe!', 'Bombs loaded, boss!', 'Up, up and AWAY!'], move: ['Floating slowly...', 'The wind takes us!'], attack: ['Bombs away, hehe!', 'Drop the big ones!', 'Look out beloooow!'] },
  toxic: { select: ['Smells funny, hehe!', 'Toxic Trooper, ready to stink!', 'Who wants a whiff?'], move: ['Stinking along.', 'Pee-yew, moving.'], attack: ['Gas them!', 'Breathe deep, hehe!', 'Smell THIS!'] },
  rifle: { select: ['Rifleman reporting.', 'Ready for action!'], move: ['Moving out.', 'On my way.'], attack: ['Opening fire!', 'Engaging!'] },
  rocket: { select: ['Rockets loaded.', 'Anti-armour ready.'], move: ['Relocating.'], attack: ['Rocket away!', 'Tank spotted!'] },
  flamer: { select: [
    'Wally Man to the rescue!',
    'Never fear, Wally Man is here!',
    'Wally Man, reporting for flame duty!',
    'Who called for Wally Man?',
    'Stand back, Wally Man is on the job!',
    'Wally Man is fired up and ready!',
    'Did somebody say barbecue? Wally Man is here!',
    'Wally Man, hot and ready to roll!',
    'Feel the heat, it is Wally Man!',
    'Up, up and away with Wally Man!',
    'Wally Man has arrived, let us light it up!',
    'Have no fear, Wally Man brings the fire!',
    'This is a job for Wally Man!',
    'Wally Man is on the scene!',
    'Somebody call the fire brigade, Wally Man is here!',
    'Wally Man, ready to turn up the heat!',
    'Grimlocks beware, Wally Man is here!',
    'Wally Man, flame on!',
    'Is it hot in here, or is it just Wally Man?',
    'Wally Man saves the day again!',
    'Here comes Wally Man, hot stuff coming through!',
    'Wally Man, toasting Grimlocks since forever!',
    'Fear not citizens, Wally Man has arrived!',
    'Wally Man is warmed up and ready to go!',
  ], move: ['Moving.'], attack: ['Burn it down!', 'Toasty!'] },
  engineer: { select: ['Engineer.', 'Tools ready.'], move: ['On my way.'], attack: ['I can fix that.', 'Taking it over.'] },
  shaman: { select: ['The spirits listen.', 'Who bleeds?'], move: ['I walk with the ancestors.'], attack: ['I heal, I do not fight!'] },
  medic: { select: ['Medic here.', 'Who needs patching up?'], move: ['Coming through.'], attack: ['I am a medic!'] },
  wally: { select: ['Wally here!', 'Where to, boss?', 'Glasses on, ready.'], move: ['Wally on the move!', 'Find me if you can.'], attack: ['Lining up the shot.', 'Time for a surprise!'] },
  buggy: { select: ['Buggy ready.', 'Let us roll.'], move: ['Full throttle!'], attack: ['Light them up!'] },
  tank: { select: ['Tank commander.', 'Armour ready.'], move: ['Rolling out.', 'Moving.'], attack: ['Firing main gun!', 'Target acquired.'] },
  harvester: { select: ['Harvester.', 'Ready to mine.'], move: ['Heading there.'], attack: ['I am just a harvester!'] },
  arty: { select: ['Artillery standing by.'], move: ['Repositioning.'], attack: ['Fire for effect!', 'Shells out!'] },
  titan: { select: ['Titan online.', 'Heavy armour here.'], move: ['Advancing.'], attack: ['Crush them!', 'Twin cannons, fire!'] },
  gunship: { select: ['Hornet in the air.', 'Gunship ready.'], move: ['Flying there.'], attack: ['Rockets hot!', 'Strafing run!'] },
  stealth: { select: ['Shade, cloaked.', 'Unseen.'], move: ['Slipping through.'], attack: ['Decloaking.', 'Surprise.'] },
  inferno: { select: ['Inferno ready.', 'Fuel tanks full.'], move: ['Rolling.'], attack: ['Burn them all!'] },
  apc: { select: ['Carrier ready.', 'Room for five!'], move: ['Moving the squad.', 'Hold on back there!'], attack: ['Covering fire!'] },
  hover: { select: ['Skimmer ready.', 'Water, lava, whatever!'], move: ['Skimming!', 'Full throttle over the top!'], attack: ['Rockets away!', 'Hit and run!'] },
  repair: { select: ['Repair crew here.', 'Who needs fixing?'], move: ['On my way with the wrench.'], attack: ['I fix things, not fight them!'] },
  jet: { select: ['Strike Jet, engines hot.', 'Ready to scramble!'], move: ['Afterburners!', 'Going supersonic!'], attack: ['Fox two!', 'Missiles away!'] },
  hauler: { select: ['Sky Hauler, rotors turning.', 'Need a lift?'], move: ['Airborne!', 'Hold on to something!'], attack: ['We are a taxi, not a gunship!'] },
  drone: { select: ['Drone online.', 'Eyes in the sky.'], move: ['Scouting ahead.'], attack: ['No weapons, just cameras!'] },
};
// names of common female text-to-speech voices (iPhone/iPad, Mac, Windows, Android/Chrome)
// novelty / effect voices some devices list as "English" (iPhones especially) - never use these
const NOVELTY = /albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|deranged|hysterical|princess|grandma|grandpa|junior|ralph|kathy/i;
// the clearest male voices on common devices, best first (used for Wally Man)
const CLEAR = [/google uk english male/i, /daniel/i, /arthur/i, /microsoft (ryan|george|guy|andrew|brian|christopher|eric)/i, /\b(aaron|alex|oliver|tom|rishi|gordon|lee|nathan)\b/i, /microsoft (david|mark)/i, /google us english/i];
const english = () => speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang) && !NOVELTY.test(v.name));
// a Scottish voice if the device has one (e.g. Apple's Fiona, lang en-GB-...-gbsct), otherwise the clearest one
const SCOTS = v => /sct|scot/i.test(v.lang) || /fiona|scottish|scotland/i.test(v.name);
function scottishVoice(vs) { return vs.find(v => SCOTS(v) && /enhanced|premium/i.test(v.name)) || vs.find(SCOTS) || clearVoice(vs); }
function clearVoice(vs) {
  const good = v => /enhanced|premium|natural|neural|online/i.test(v.name);
  for (const re of CLEAR) { const m = vs.filter(v => re.test(v.name)); if (m.length) return m.find(good) || m.find(v => v.localService) || m[0]; }
  return vs.find(good) || vs.find(v => v.default) || vs[0] || null;
}
const FEMALE = /female|samantha|karen|moira|tessa|victoria|fiona|serena|kate|zira|susan|hazel|libby|sonia|catherine|allison|ava|nicky|siri.*(voice 2|voice 4)|google uk english female|google us english|jenny|aria|emma|amy|joanna|salli/i;
const lastLine = {};
const VOICE_STYLE = {
  piper: { pitch: 1.1, rate: 1.0, scottish: true },
  drummer: { pitch: 0.5, rate: 0.8 },
  troll: { pitch: 0.3, rate: 0.75 },
  mech: { pitch: 0.8, rate: 0.95 },
  wyvern: { pitch: 1.6, rate: 1.2 },
  boomer: { pitch: 1.75, rate: 1.3 },
  grenadier: { pitch: 0.9, rate: 1.0 },
  dog: { pitch: 1.9, rate: 1.3 },
  warlord: { pitch: 0.4, rate: 0.85 },
  flamer: { pitch: 1.15, rate: 1.08, female: true },
  spy: { pitch: 0.95, rate: 0.95, clear: true },
  wally: { pitch: 1.4, rate: 1.15 }, wallyman: { pitch: 1.5, rate: 1.0, clear: true, scottish: true, loud: true }, /* squeaky Scottish superhero! */ medic: { pitch: 1.3, rate: 1.05 }, engineer: { pitch: 1.2, rate: 1.1 },
  titan: { pitch: 0.5, rate: 0.85 }, tank: { pitch: 0.7, rate: 0.95 }, harvester: { pitch: 0.8, rate: 0.9 },
  stealth: { pitch: 0.6, rate: 0.8 }, inferno: { pitch: 0.55, rate: 0.9 }, gunship: { pitch: 1.0, rate: 1.2 },
};

let db = null;
const clips = new Map();        // key -> [Blob]
const urls = new Map();         // Blob -> objectURL
let lastSay = 0;
export const settings = { voices: true, tts: true, lyrics: true };
try { Object.assign(settings, JSON.parse(localStorage.getItem('ws_voice_settings') || '{}')); } catch { /* ignore */ }
export function saveSettings() { try { localStorage.setItem('ws_voice_settings', JSON.stringify(settings)); } catch { /* ignore */ } }

function openDB() {
  return new Promise((res) => {
    try {
      const r = indexedDB.open('wallysquad-voices', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('clips');
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch { res(null); }
  });
}
export async function initVoices() {
  db = await openDB();
  if (!db) return;
  await new Promise(res => {
    const tx = db.transaction('clips', 'readonly');
    const st = tx.objectStore('clips');
    const req = st.openCursor();
    req.onsuccess = () => {
      const c = req.result;
      if (!c) return res();
      clips.set(c.key, c.value); c.continue();
    };
    req.onerror = () => res();
  });
}
function persist(key) {
  if (!db) return;
  const tx = db.transaction('clips', 'readwrite');
  const list = clips.get(key);
  if (list && list.length) tx.objectStore('clips').put(list, key); else tx.objectStore('clips').delete(key);
}
const keyOf = (type, ev) => `${type}:${ev}`;
export const takes = (type, ev) => (clips.get(keyOf(type, ev)) || []).length;
export function addTake(type, ev, blob) { const k = keyOf(type, ev); const l = clips.get(k) || []; l.push(blob); if (l.length > 3) l.shift(); clips.set(k, l); persist(k); }
export function clearTakes(type, ev) { clips.delete(keyOf(type, ev)); persist(keyOf(type, ev)); }

function playBlob(b) {
  if (!urls.has(b)) urls.set(b, URL.createObjectURL(b));
  const a = new Audio(urls.get(b)); a.volume = 0.9; a.play().catch(() => {});
}
export function playTake(type, ev) {
  const l = clips.get(keyOf(type, ev));
  if (l && l.length) { playBlob(l[Math.floor(Math.random() * l.length)]); return true; }
  return false;
}

// Speak any line in a given unit's voice style (used for enemy commander taunts)
export function sayLine(text, type) {
  if (!settings.voices || !settings.tts || !('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    const st = VOICE_STYLE[type] || { pitch: 1, rate: 1 };
    u.pitch = st.pitch; u.rate = st.rate; u.volume = 0.9;
    const vs = english();
    if (st.clear) u.voice = clearVoice(vs); else if (vs.length) u.voice = vs[(type.length * 7) % vs.length];
    speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

const LAST_WORDS = {
  inf: ['Tell my mum I was brave!', 'Not the face!', 'I only had two days to retirement!', 'Worth it!', 'Was it something I said?', 'Avenge me... or not, whatever.', 'I regret nothing!', 'Mummy!', 'I should have been a baker!', 'Is it lunch time yet?', 'Ow, ow, ow!', 'I left the oven on!'],
  veh: ['Engine failure! And also everything else!', 'Who parked that there?!', 'I told you to check the oil!', 'Tell the mechanic it was not my fault!', 'That is going to void the warranty!', 'Abandon ship! Wait, this is a tank!'],
  grim: ['Grak will avenge... ow.', 'Worth it! Hehe... urk.', 'Tell the Legion... I tried...', 'Not fair! Not fair!'],
};
let lastWordsT = 0;
export function lastWords(unit) {
  if (!settings.voices || !settings.tts || !('speechSynthesis' in window) || speechSynthesis.speaking) return;
  const now = performance.now(); if (now - lastWordsT < 9000 || Math.random() > 0.2) return;
  lastWordsT = now;
  const pool = unit.faction === 'grim' && unit.isInf ? LAST_WORDS.grim : unit.isInf ? LAST_WORDS.inf : LAST_WORDS.veh;
  sayLine(pool[Math.floor(Math.random() * pool.length)], unit.type);
}

// Sing a lyric line from the soundtrack (a cheerful, slightly sung-sounding computer voice)
let singing = false;
export function singLine(text, track, kind) {
  if (!settings.lyrics || !settings.tts || !('speechSynthesis' in window) || speechSynthesis.speaking) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    const V = track && track.vox;
    u.pitch = kind === 'hype' ? 0.8 : kind === 'adlib' ? 1.8 : V === 'chant' ? 0.5 : V === 'robot' ? 0.2 : V === 'scat' ? 1.7 : 1.45; u.rate = track && track.bpm < 100 ? 0.9 : V === 'robot' ? 0.85 : 1.05; u.volume = 0.8;
    const vs = english(); u.voice = clearVoice(vs);
    singing = true; u.onend = () => { singing = false; }; setTimeout(() => { singing = false; }, 6000);
    speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

// Called by the game when the player selects or commands a unit
export function say(type, ev, force = false) {
  if (!settings.voices) return;
  if (singing && 'speechSynthesis' in window) { speechSynthesis.cancel(); singing = false; } // units talk over the song
  const now = performance.now();
  if (!force && now - lastSay < 1100) return;
  lastSay = now;
  if (playTake(type, ev)) return;
  if (!settings.tts || !('speechSynthesis' in window)) return;
  if (speechSynthesis.speaking && !force) return;
  let lines = DEFAULT_LINES[type]?.[ev] || DEFAULT_LINES[UNITS[type]?.tab === 'vehicle' ? 'tank' : 'rifle'][ev];
  // Wally Man has something to say about the weather
  const wt = G.weather && G.weather.type;
  if (type === 'wallyman' && ev === 'select' && (wt === 'rain' || wt === 'storm')) lines = ["It's pishing doon!"];
  else if (type === 'wallyman' && ev === 'select' && (wt === 'snow' || wt === 'blizzard') && Math.random() < 0.5) lines = ["It's Baltic oot here!"];
  else if (type === 'wallyman' && ev === 'select' && G.bloodMoon && Math.random() < 0.5) lines = ["Thon moon is a pure funny colour...", "Whit is up wi the moon? It looks like a tomato!"];
  else if (type === 'wallyman' && ev === 'select' && (G.nightLevel || 0) > 0.7 && Math.random() < 0.2) lines = ["It is gey dark, int it?", "Who turned the lights aff?"];
  else if (type === 'wallyman' && ev === 'select' && wt === 'clear' && (G.nightLevel || 0) < 0.3 && Math.random() < 0.2) lines = ["Taps aff! It is roastin!", "Phew, it is a scorcher the day!"];
  if (!lines) return;
  // pick a line, never the same one twice in a row for this unit
  const key = type + ':' + ev;
  let i = Math.floor(Math.random() * lines.length);
  if (lines.length > 1 && i === lastLine[key]) i = (i + 1 + Math.floor(Math.random() * (lines.length - 1))) % lines.length;
  lastLine[key] = i;
  const u = new SpeechSynthesisUtterance(lines[i]);
  const st = VOICE_STYLE[type] || { pitch: 1, rate: 1.05 };
  u.pitch = st.pitch; u.rate = st.rate; u.volume = st.loud ? 1 : 0.85;
  const vs = english();
  const fem = st.female ? vs.find(v => FEMALE.test(v.name)) : null;
  if (fem) u.voice = fem;
  else if (st.scottish) u.voice = scottishVoice(vs);
  else if (st.clear) u.voice = clearVoice(vs);
  else if (vs.length) u.voice = vs[(type.length * 7) % vs.length];
  if (st.clear) duckMusic(0.8 + lines[i].length * 0.075 / st.rate); // music dips so the hero is easy to hear
  speechSynthesis.speak(u);
}

// ---------------- recording ----------------
let rec = null;
export async function startRecording(onStop) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const chunks = [];
  const mr = new MediaRecorder(stream);
  mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); onStop(new Blob(chunks, { type: mr.mimeType || 'audio/webm' })); rec = null; };
  mr.start();
  rec = { mr, timer: setTimeout(() => { if (mr.state === 'recording') mr.stop(); }, 4000) };
  return rec;
}
export function stopRecording() { if (rec) { clearTimeout(rec.timer); if (rec.mr.state === 'recording') rec.mr.stop(); } }
export const isRecording = () => !!rec;

// ---------------- voice packs ----------------
const blobToB64 = b => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });
export async function exportPack(name = 'my-voices') {
  const out = { format: 'wallysquad-voices', version: 1, name, clips: {} };
  for (const [k, list] of clips) out.clips[k] = await Promise.all(list.map(blobToB64));
  const blob = new Blob([JSON.stringify(out)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${name}.wallyvoices.json`; a.click();
}
export async function importPack(file, merge = true) {
  const data = JSON.parse(await file.text());
  if (data.format !== 'wallysquad-voices') throw new Error('Not a Wally Squad voice pack');
  let n = 0;
  for (const k in data.clips) {
    const [type, ev] = k.split(':');
    if (!UNITS[type] || !EVENTS[ev]) continue;
    if (!merge) clips.delete(k);
    for (const d of data.clips[k]) { const b = await (await fetch(d)).blob(); addTake(type, ev, b); n++; }
  }
  return n;
}

// ---------------- studio UI ----------------
export function buildStudio(container, icons) {
  container.innerHTML = '';
  const tbl = document.createElement('div'); tbl.className = 'vgrid';
  tbl.innerHTML = '<div class="vh">Unit</div>' + Object.values(EVENTS).map(e => `<div class="vh">${e}</div>`).join('');
  for (const type in UNITS) {
    const name = document.createElement('div'); name.className = 'vname';
    name.innerHTML = `${icons[type] ? `<img src="${icons[type]}">` : ''}<span>${UNITS[type].name}</span>`;
    tbl.appendChild(name);
    for (const ev in EVENTS) {
      const cell = document.createElement('div'); cell.className = 'vcell';
      const count = document.createElement('span'); count.className = 'vcount';
      const recB = document.createElement('button'); recB.className = 'btn vbtn'; recB.textContent = '● Rec'; recB.title = 'Record (up to 4 seconds). Click again to stop.';
      const playB = document.createElement('button'); playB.className = 'btn vbtn'; playB.textContent = '▶'; playB.title = 'Play';
      const delB = document.createElement('button'); delB.className = 'btn vbtn'; delB.textContent = '✖'; delB.title = 'Delete recordings';
      const refresh = () => { const n = takes(type, ev); count.textContent = n ? `${n} take${n > 1 ? 's' : ''}` : 'TTS'; count.classList.toggle('has', n > 0); };
      recB.onclick = async () => {
        if (isRecording()) { stopRecording(); return; }
        try {
          recB.classList.add('on'); recB.textContent = '■ Stop';
          await startRecording(blob => { addTake(type, ev, blob); recB.classList.remove('on'); recB.textContent = '● Rec'; refresh(); });
        } catch (e) { recB.classList.remove('on'); recB.textContent = '● Rec'; alert('Could not use the microphone: ' + e.message); }
      };
      playB.onclick = () => { if (!playTake(type, ev)) say(type, ev, true); };
      delB.onclick = () => { clearTakes(type, ev); refresh(); };
      refresh();
      cell.append(recB, playB, delB, count);
      tbl.appendChild(cell);
    }
  }
  container.appendChild(tbl);
}
