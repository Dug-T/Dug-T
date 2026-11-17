// GOFFICHICK - Goffichick's voice lines.
//
// By default the lines are spoken with the browser's built-in speech voice, and shown as a
// subtitle. To use your OWN recordings instead: put audio files in goffichick/assets/voice/
// and list them in VOICE_FILES below, e.g.
//     kill: ['assets/voice/unsubscribed.mp3', 'assets/voice/rest-in-pieces.mp3'],
// Any event with files listed plays a random file; the others keep using the speech voice.
'use strict';

const VOICE_FILES = {
  // levelStart: [], kill: [], boss: [], hurt: [], lowHealth: [], weapon: [], power: [],
  // rage: [], key: [], secret: [], exit: [], death: [], heedshot: [],
};

const VOICE_LINES = {
  levelStart: ["Ugh. Somebody's been having fun in here.", 'Time to bring the gloom.', "Let's ruin somebody's good mood.", 'Too bright. Too cheerful. Fixing it.', 'Who decorated this? A golden retriever?', 'I can smell the scented candles from here.', "Right. Who's ready to be disappointed?"],
  kill: ['Unsubscribed.', 'Have a nice day. Not.', 'Back to the void with you.', 'Cheer up? No.', 'Rest in pieces.', 'Thoughts and prayers.', 'And stay sad.', 'Block. Delete.', 'Leave a review.'],
  boss: ["Who's smiling now?", 'Positivity. Cancelled.'],
  hurt: ['Ow. Rude.', 'That was annoyingly upbeat.', 'Watch the eyeliner!', 'Not the hair!', 'I bruise in black, you know.'],
  lowHealth: ['I need a black heart. Literally.', 'Running low on darkness here.'],
  weapon: ['Ooh. I love this one.', "Now we're talking."],
  power: ['Darkness suits me.', 'Oh, this is very me.'],
  rage: ["Now I'm properly angry."],
  key: ['Ooh, shiny. And spooky.', 'A key! How mysterious.'],
  secret: ['Ooh, a secret. My favourite kind of thing.'],
  exit: ['Next. Please be gloomier.', "That's one less happy place."],
  death: ['Too. Much. Sunshine.', 'Tell my bats I love them.', 'Bury me in something black.'],
  nade: ['Catch.', 'Fire in the hole. Gothically.', 'A little gift. Wrapped in doom.'],
  rose: ["A black rose. For me? You shouldn't have.", 'Ooh. My favourite flower.', 'Another one for the collection.'],
  champion: ['Ooh, a fancy one.', 'Gold? Tacky.'],
  combo: ['Two for one. Bargain.', 'Buy one, get one dead.', 'Group discount.'],
};

const Voice = (() => {
  let on = true, lastT = -99, voice = null, subtitle = '', subT = 0;
  try { on = localStorage.getItem('goffichick-voice') !== 'off'; } catch (e) {}
  function pickVoice() {
    if (voice || !window.speechSynthesis) return;
    const vs = speechSynthesis.getVoices();
    voice = vs.find(v => /^en/i.test(v.lang) && /female|woman|serena|kate|martha|libby|sonia|samantha|karen|moira|tessa|zira|fiona/i.test(v.name)) ||
      vs.find(v => /^en-GB/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
  }
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => { voice = null; pickVoice(); };
  // event: which kind of line; chance: 0..1 how likely; force: ignore the "don't chatter" gap
  function say(event, chance = 1, force = false) {
    if (!on) return;
    const now = performance.now() / 1000;
    if (!force && now - lastT < 6) return;
    if (Math.random() > chance) return;
    const lines = VOICE_LINES[event]; if (!lines) return;
    const i = Math.floor(Math.random() * lines.length);
    lastT = now; subtitle = lines[i]; subT = 2.8;
    const files = VOICE_FILES[event];
    if (files && files.length) { try { const a = new Audio(files[i % files.length]); a.volume = 0.9; a.play().catch(() => {}); } catch (e) {} return; }
    if (!window.speechSynthesis) return;
    try {
      speechSynthesis.cancel(); pickVoice();
      const u = new SpeechSynthesisUtterance(lines[i]);
      if (voice) u.voice = voice;
      u.pitch = 0.85; u.rate = 1.02; u.volume = 0.9;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  // ---- monsters talk too, each in a voice of its own (pitch, speed and, where the device has
  // several voices, a different one per monster type). They never talk over anybody.
  const MONSTER_VOICES = {
    zombie: { pitch: 0.35, rate: 0.72 }, manager: { pitch: 0.9, rate: 1.35 }, wally: { pitch: 1.25, rate: 1.2 }, wallyfit: { pitch: 1.4, rate: 1.4 },
    wallydeluxe: { pitch: 0.75, rate: 0.95 }, boss: { pitch: 0.15, rate: 0.8 }, wallylive: { pitch: 1.1, rate: 1.25 }, brute: { pitch: 0.25, rate: 0.9 },
    skull: { pitch: 1.9, rate: 1.35 }, orb: { pitch: 2, rate: 1.5 }, bubbly: { pitch: 2, rate: 1.7 }, mini: { pitch: 2, rate: 1.9 }, megaorb: { pitch: 0.6, rate: 1.1 },
    yoga: { pitch: 1.45, rate: 0.72 }, coach: { pitch: 1.1, rate: 1.45 }, bridezilla: { pitch: 1.7, rate: 1.35 }, redcoat: { pitch: 1.3, rate: 1.25 },
    hypeman: { pitch: 1.0, rate: 1.7 }, ghost: { pitch: 1.8, rate: 1.1 }, popper: { pitch: 2, rate: 1.6 }, guru: { pitch: 1.3, rate: 0.68 }, riot: { pitch: 0.8, rate: 1.05 },
    mummy: { pitch: 0.5, rate: 0.68 }, mascot: { pitch: 1.6, rate: 1.15 }, drone: { pitch: 2, rate: 1.8 }, karen: { pitch: 1.2, rate: 1.4 }, wallyexe: { pitch: 0.1, rate: 0.72 },
  };
  let enVoices = null;
  const hash = str => { let h = 7; for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };
  function monster(type, text, dist = 5) {
    if (!on || !window.speechSynthesis) return;
    try {
      if (speechSynthesis.speaking || speechSynthesis.pending) return;
      if (!enVoices || !enVoices.length) enVoices = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
      const prof = MONSTER_VOICES[type] || { pitch: 1, rate: 1 }, u = new SpeechSynthesisUtterance(text);
      if (enVoices.length) u.voice = enVoices[hash(type) % enVoices.length];
      u.pitch = prof.pitch; u.rate = prof.rate; u.volume = Math.max(0.15, Math.min(1, 4 / (dist + 2)));
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  // "HEED SHOT!" - in a Scottish accent where the device has one (or your own recording: VOICE_FILES.heedshot)
  let heedVoice;
  function heed() {
    if (!on) return;
    const files = VOICE_FILES.heedshot;
    if (files && files.length) { try { const a = new Audio(files[Math.floor(Math.random() * files.length)]); a.play().catch(() => {}); } catch (e) {} return; }
    if (!window.speechSynthesis) return;
    try {
      if (heedVoice === undefined) { const vs = speechSynthesis.getVoices(); heedVoice = vs.find(v => /scot|fiona|en[-_]?gb[-_]?sct/i.test(v.name + ' ' + v.lang)) || vs.find(v => /^en-GB/i.test(v.lang)) || null; }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance('Heed shot!');
      if (heedVoice) u.voice = heedVoice;
      u.pitch = 0.8; u.rate = 0.85; u.volume = 1;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  function toggle() { on = !on; try { localStorage.setItem('goffichick-voice', on ? 'on' : 'off'); } catch (e) {} if (!on && window.speechSynthesis) speechSynthesis.cancel(); return on; }
  return {
    say, toggle, monster, heed, get on() { return on; },
    update(dt) { subT = Math.max(0, subT - dt); },
    get subtitle() { return subT > 0 ? subtitle : ''; },
  };
})();
