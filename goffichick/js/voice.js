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
  // rage: [], key: [], secret: [], exit: [], death: [],
};

const VOICE_LINES = {
  levelStart: ["Ugh. Somebody's been having fun in here.", 'Time to bring the gloom.', "Let's ruin somebody's good mood.", 'Too bright. Too cheerful. Fixing it.'],
  kill: ['Unsubscribed.', 'Have a nice day. Not.', 'Back to the void with you.', 'Cheer up? No.', 'Rest in pieces.'],
  boss: ["Who's smiling now?", 'Positivity. Cancelled.'],
  hurt: ['Ow. Rude.', 'That was annoyingly upbeat.', 'Watch the eyeliner!'],
  lowHealth: ['I need a black heart. Literally.', 'Running low on darkness here.'],
  weapon: ['Ooh. I love this one.', "Now we're talking."],
  power: ['Darkness suits me.', 'Oh, this is very me.'],
  rage: ["Now I'm properly angry."],
  key: ['Ooh, shiny. And spooky.', 'A key! How mysterious.'],
  secret: ['Ooh, a secret. My favourite kind of thing.'],
  exit: ['Next. Please be gloomier.', "That's one less happy place."],
  death: ['Too. Much. Sunshine.'],
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
  function toggle() { on = !on; try { localStorage.setItem('goffichick-voice', on ? 'on' : 'off'); } catch (e) {} if (!on && window.speechSynthesis) speechSynthesis.cancel(); return on; }
  return {
    say, toggle, get on() { return on; },
    update(dt) { subT = Math.max(0, subT - dt); },
    get subtitle() { return subT > 0 ? subtitle : ''; },
  };
})();
