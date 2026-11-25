// Spoken dialogue using the browser's built-in speech. Picks a Scottish voice when the device has
// one (e.g. "Fiona"), otherwise a British one, and gives each character their own pitch and pace.

const CAST = {
  WALLY: { pitch: 0.9, rate: 1.02, male: true },
  'WALLY MAN': { pitch: 0.9, rate: 1.02, male: true },
  'MAMMY WALLY': { pitch: 1.35, rate: 1.12, male: false },
  'BIG DAVIE': { pitch: 0.55, rate: 0.92, male: true },
  'MRS McGLASHAN': { pitch: 1.25, rate: 0.95, male: false },
  NARRATOR: { pitch: 0.75, rate: 0.9, male: true },
  DJ: { pitch: 1.05, rate: 1.18, male: true },
  COP: { pitch: 0.7, rate: 1.05, male: true },
  DRIVER: { pitch: 0.85, rate: 1.15, male: true },
};

// Scots spellings that text-to-speech mangles, respelt so they sound right
const SAY_AS = [
  [/\bye\b/gi, 'yeh'], [/\byer\b/gi, 'yer'], [/\bnae\b/gi, 'nay'], [/\bdinnae\b/gi, 'dinnay'], [/\bcannae\b/gi, 'cannay'], [/\bwisnae\b/gi, 'wiznay'],
  [/\bisnae\b/gi, 'iznay'], [/\bdoesnae\b/gi, 'duznay'], [/\bgonnae\b/gi, 'gonnay'], [/\bwhit\b/gi, 'whit'], [/\baff\b/gi, 'aff'], [/\boot\b/gi, 'oot'],
  [/\bheid\b/gi, 'heed'], [/\bawa'/gi, 'away'], [/\bwean\b/gi, 'wayne'], [/\bpolis\b/gi, 'poe-liss'], [/\bnumpty\b/gi, 'numpty'], [/\bbampot\b/gi, 'bam pot'],
  [/\bdreich\b/gi, 'dreech'], [/\bhaar\b/gi, 'haar'], [/\bmasel\b/gi, 'my sell'], [/\baboot\b/gi, 'a boot'], [/\bdug\b/gi, 'dug'], [/\bscunner\b/gi, 'scunner'],
  [/~[yrbw]~/g, ''], [/\*/g, ''], [/\.\.\./g, ', '],
];

export const QUIPS = {
  idle: [
    "Is it just me, or is it absolutely Baltic the day?",
    "If anybody asks, the cape is for aerodynamics.",
    "I'm no' saying I'm the best superhero in Scotland. But I'm in the top two hundred.",
    "Mammy says I've got the body of a god. Unfortunately it's Buddha.",
    "Wallypool. Where the weather's rubbish but the chips are magic.",
    "Superhero tip number one. Never fight crime on an empty stomach.",
    "I could fly to the shops. Or I could just walk. Walking's got a better success rate.",
    "These specs cost me forty quid. I'm no' losing them to a villain.",
    "One day they'll make a film about me. Probably a cautionary one.",
    "Right. Heroics. Then a fish supper. Then more heroics. Maybe.",
  ],
  car: ["Shotgun! Oh. It's just me.", "Mind the upholstery, Wally.", "I'm only borrowing it. Like a library book. With wheels.", "Smells like crisps in here. Lovely.", "Right, where's the radio?"],
  wanted: ["The polis! Act natural!", "I can explain! ...No, I cannae.", "Nee naw, nee naw, here we go again.", "Run, Wally, run!", "This'll no' look good on my superhero CV."],
  wantedHigh: ["That's a lot of polis for one wee man in a onesie!", "Mammy's gonnae kill me."],
  powerFail: ["Ach, that wisnae supposed to happen.", "I meant to do that.", "My powers are just shy.", "Ow. My dignity."],
  powerFly: ["I'm flying! I'm actually flying!", "Up, up and awaaay!", "Look, Mammy! No hands!"],
  stunt: ["Did ye SEE that?!", "Ten out of ten from the Scottish judge!", "My stomach's still up there somewhere."],
  pickup: ["Ooh, shiny.", "Finders keepers.", "That'll come in handy.", "I'll just borrow this."],
  rain: ["Pure dreich, so it is.", "Typical. I just got my cape dry.", "It's no' raining, it's just very enthusiastic mist."],
  snow: ["Snow! Somebody build a snowman wi' specs!", "Ma toes are like ice lollies."],
  sun: ["Sun's oot! Get the taps aff!", "Two days of sun in a row? That's a heatwave, that."],
  fog: ["The haar's in. I cannae see ma hand in front of ma face. Or ma face."],
  pass: ["Ya dancer!", "Get in! Who's the hero now?", "Another job well done. Mostly.", "Mammy'll be proud. For once."],
  fail: ["Ach, away an' bile yer heid.", "Hopeless. Absolutely hopeless.", "We'll just pretend that never happened."],
  hurt: ["Ya beauty, that hurt!", "Ow! Watch the specs!", "That's gonnae bruise."],
};
export const DJ = [
  "You're listening to Wally F M. The only station that plays... whatever this is.",
  "Clyde Beats, keeping your windscreen wipers in time since nineteen ninety nine.",
  "Pipes and Riffs! Where the bagpipes go to eleven.",
  "Traffic update. It's bad. It's always bad. Next song.",
  "Weather update. Look oot the window. Aye. That.",
  "A shout out to Wally Man, who's just borrowed somebody's motor. Again.",
];

export class Voice {
  constructor() {
    this.on = true; this.voices = []; this.busyUntil = 0;
    this.ok = typeof window !== 'undefined' && 'speechSynthesis' in window;
    if (!this.ok) return;
    const load = () => { this.voices = speechSynthesis.getVoices(); this.pickVoices(); };
    load(); speechSynthesis.onvoiceschanged = load;
  }
  pickVoices() {
    const v = this.voices;
    const by = (re) => v.filter((x) => re.test(x.name) || re.test(x.lang));
    const scot = by(/scot|fiona/i), gb = v.filter((x) => /en[-_]GB/i.test(x.lang)), en = v.filter((x) => /^en/i.test(x.lang));
    const pool = scot.length ? scot : (gb.length ? gb : en);
    const male = pool.find((x) => /male|daniel|george|arthur|ryan|oliver/i.test(x.name) && !/female/i.test(x.name));
    const female = pool.find((x) => /female|fiona|kate|serena|libby|sonia|susan/i.test(x.name));
    this.voiceM = male || pool[0] || null; this.voiceF = female || pool[0] || null;
    this.scottish = scot.length > 0;
  }
  // speak a line. who = a CAST name or a ped look { female, pitch }. prio lines interrupt chatter.
  say(text, who = 'WALLY', prio = false) {
    if (!this.ok || !this.on || !text) return;
    const now = performance.now();
    if (!prio && (speechSynthesis.speaking || now < this.busyUntil)) return;
    if (prio) speechSynthesis.cancel();
    let spoken = text;
    for (const [re, rep] of SAY_AS) spoken = spoken.replace(re, rep);
    const u = new SpeechSynthesisUtterance(spoken);
    const c = typeof who === 'string' ? (CAST[who] || CAST.WALLY) : { pitch: who.pitch || 1, rate: who.rate || 1.05, male: !who.female };
    u.voice = c.male ? this.voiceM : this.voiceF;
    if (u.voice) u.lang = u.voice.lang;
    u.pitch = Math.min(2, Math.max(0.1, c.pitch)); u.rate = c.rate; u.volume = who === 'DJ' ? 0.8 : 1;
    this.busyUntil = now + 400;
    speechSynthesis.speak(u);
  }
  // "MAMMY WALLY: Line" -> speaker + line
  sayLine(line, prio = true) {
    const m = /^([A-Z][A-Za-z .']+):\s*(.*)$/.exec(line);
    if (m) this.say(m[2], m[1].trim(), prio); else this.say(line, 'NARRATOR', prio);
  }
  stop() { if (this.ok) speechSynthesis.cancel(); }
}
