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
  GRANDA: { pitch: 0.6, rate: 0.85, male: true },
  'UNCLE TAM': { pitch: 0.7, rate: 1.0, male: true },
  'MR FUDGE': { pitch: 1.1, rate: 1.1, male: true },
  'AUNTIE SENGA': { pitch: 1.4, rate: 1.15, male: false },
  'PAMAZON BOSS': { pitch: 0.95, rate: 1.25, male: true },
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
    "Ma arch nemesis is the stairs. Every single day.",
    "I tried to get a sidekick. They all said they were washing their hair.",
    "Some heroes have a fortress of solitude. I've got a box room in ma mammy's.",
    "Radioactive spider? Naw. I got bit by a radioactive midgie. I'm just itchy.",
    "Ma superpower is finding the one wet bit of pavement wi' ma sock.",
    "I put 'superhero' on ma dating profile. Two matches. Both were the polis.",
    "The cape's no' waterproof. I found that oot the hard way. Every day.",
    "I'm no' lost. I'm patrolling. In circles.",
    "Every hero needs a catchphrase. Mine's 'Is that ma bus?'",
    "If ye see a crime, phone Wally Man. If he doesnae answer, phone the polis. Actually, just phone the polis.",
    "Ma mammy sewed this costume. That's why the W is slightly squint.",
    "I'd fight crime full time, but I've got a dentist appointment on Thursday.",
    "Wally Man. Protector of Wallypool. Terror of buffets.",
    "I asked the council for a Wally signal. They gave me a torch and a leaflet.",
    "See this jaw? Chiselled. Well. Scraped. Wi' a spoon.",
    "Somewhere out there, a cat's stuck up a tree. It can stay there. I'm no' good wi' heights.",
    "I'm basically Batman. If Batman lived on square sausage and lived wi' his maw.",
    "The trick to being a superhero is confidence. And elasticated waistbands.",
  ],
  car: [
    "Shotgun! Oh. It's just me.", "Mind the upholstery, Wally.", "I'm only borrowing it. Like a library book. With wheels.",
    "Smells like crisps in here. Lovely.", "Right, where's the radio?", "Ooh, heated seats. Or I've sat on something. Don't look.",
    "There's a half-eaten pie in the glovebox. Finders keepers.", "Who puts a fluffy dice in a car in this day and age? Brilliant.",
    "Mirror, signal, absolutely floor it.", "Seat's all wrong. This person must have legs.",
    "There's a wee air freshener shaped like a tree. Smells like a different tree.", "Right. Seatbelt on. I'm a criminal, no' an eejit.",
  ],
  jack: [
    "Sorry pal! Superhero business!", "I'll bring it back! Probably!", "It's for a good cause! Me!",
    "Nothing personal! Well. A wee bit personal.", "Ye'll get it back wi' a full tank! Of crisp packets!",
    "Requisitioned! That's a real word, look it up!", "Ye shouldnae have left the engine running! Well, ye didnae. But still!",
  ],
  crash: [
    "That lamppost came oot of naewhere!", "Who put that wall there?!", "That's gonnae leave a mark. On me.",
    "Insurance is gonnae love this.", "I meant to do that. It's a parking technique.", "Ow. Ma neck. Ma motor. Ma pride.",
    "Brakes! Where are the brakes?! Oh, that pedal.",
  ],
  fast: [
    "Wheeeee!", "I am speed! I am also slightly scared!", "This is faster than ma mammy's mobility scooter!",
    "Is this what the speed limit feels like from the other side?", "If I die, tell Mammy I was wearing clean pants.",
    "Woooo! Ma cape's flapping and I'm no' even outside!",
  ],
  wanted: ["The polis! Act natural!", "I can explain! ...No, I cannae.", "Nee naw, nee naw, here we go again.", "Run, Wally, run!", "This'll no' look good on my superhero CV.",
    "It wisnae me! A big boy did it and ran away!", "Officer, I'm a superhero! Here's ma... I left ma badge in ma other onesie.", "Uh oh. Blue lights. And no' the disco kind."],
  wantedHigh: ["That's a lot of polis for one wee man in a onesie!", "Mammy's gonnae kill me.", "Is that a helicopter or am I just dizzy?", "I've had less attention at ma own birthday party!", "Every polis in Scotland is after me! I'm famous!"],
  lostCops: ["Lost them! Wally Man, master of disguise!", "Ha! They'll never catch the Wally!", "Phew. Right. Back to being a law-abiding hero.", "They gave up. Probably went for a pie. Can't blame them."],
  powerFail: ["Ach, that wisnae supposed to happen.", "I meant to do that.", "My powers are just shy.", "Ow. My dignity.", "Ma powers are buffering.", "That was a practice flap.", "Gravity one, Wally nil. Again."],
  powerFly: ["I'm flying! I'm actually flying!", "Up, up and awaaay!", "Look, Mammy! No hands!", "Birds! Move! Coming through!", "I can see ma house from here! It's a mess!", "Flying is easy! Landing is the bit I'm no' sure aboot!"],
  stunt: ["Did ye SEE that?!", "Ten out of ten from the Scottish judge!", "My stomach's still up there somewhere.", "Nobody tell Mammy aboot that one.", "That's going on the internet!", "Evel Knievel? More like Evel Wally!"],
  pickup: ["Ooh, shiny.", "Finders keepers.", "That'll come in handy.", "I'll just borrow this.", "Who leaves this lying aboot? Thanks!", "Christmas has come early!", "Into the onesie pocket it goes."],
  cash: ["Money! I'll get Mammy a new kettle.", "Chips for a week!", "Ooh, that's ma bus fare sorted.", "Kerching!", "Finally, I can pay back Granda."],
  specs: ["Golden specs! I can see for miles! Well, metres.", "Another pair! I'm collecting them like a magpie wi' bad eyes.", "Shiny specs! They match ma golden personality."],
  rain: ["Pure dreich, so it is.", "Typical. I just got my cape dry.", "It's no' raining, it's just very enthusiastic mist.", "Rain again. Wallypool's favourite weather.", "I'm soaked through tae ma Y-fronts."],
  snow: ["Snow! Somebody build a snowman wi' specs!", "Ma toes are like ice lollies.", "Snowball fight! Naw, wait, I've got nae friends."],
  sun: ["Sun's oot! Get the taps aff!", "Two days of sun in a row? That's a heatwave, that.", "Factor fifty, Wally. Ye burn under a light bulb."],
  fog: ["The haar's in. I cannae see ma hand in front of ma face. Or ma face.", "Foggy. Perfect for a stealth hero. If I could find anybody."],
  night: ["Night time. When the real heroes come oot. And the foxes.", "Dark already? I've no' had ma tea.", "Street lights are on. Time to go home. Naw, wait, I'm a hero."],
  morning: ["Morning, Wallypool! Somebody put the kettle on.", "New day, new disasters.", "Morning! Right. Rolls and sausage, then crime fighting."],
  pass: ["Ya dancer!", "Get in! Who's the hero now?", "Another job well done. Mostly.", "Mammy'll be proud. For once.", "Wally Man does it again! Somebody write that down!", "Easy! Well. Medium. Ish."],
  fail: ["Ach, away an' bile yer heid.", "Hopeless. Absolutely hopeless.", "We'll just pretend that never happened.", "I was robbed! By ma own incompetence!", "Practice run. That was a practice run."],
  hurt: ["Ya beauty, that hurt!", "Ow! Watch the specs!", "That's gonnae bruise.", "Ma kidneys!", "Not the face!", "I bruise like a peach!"],
  lowHealth: ["I'm no' feeling too clever.", "I need a lie doon and a Lorne sausage.", "Somebody get me some fizzy ginger juice!", "I can see a light. Oh, it's a chippy. Even better."],
  fall: ["Oof! Ma knees!", "Who moved the ground?!", "That landing was nine out of ten. For damage."],
  punch: ["Wally wallop!", "Hi-YAH!", "Have some of that!", "Sorry! Reflexes!", "Feel the power of the onesie!"],
  wasted: ["I'm alive! Hello, nurse!", "Ah, the Infirmary. Ma second home.", "That's gonnae cost a hundred quid. Again."],
  busted: ["Free at last! Well, a hundred quid poorer.", "Wally Man. Out on good behaviour.", "That cell had better food than Mammy's house."],
  shop: ["Granda's Armoury! He says no running. With the guns."],
  home: ["Home sweet home. Mind the Lego.", "Ma flat! Smells like socks and success."],
  runover: ["Sorry! Sorry! Ma brakes are shy!", "They'll be fine. Probably.", "Did I hit something? Naw. Couldnae have."],
};
// Wally's comment when he picks up a weapon for the first time
export const WEAPON_QUIPS = {
  club: "Granda's golf club! He'll no' miss it. He's never hit a ball in his life.",
  pan: "A frying pan! For breakfast or for baddies.",
  shinty: "A shinty stick! Mind yer ankles, everybody.",
  claymore: "A real claymore! I'm basically Braveheart now. Shorter, mind.",
  bagpipes: "Battle bagpipes! Weapons-grade noise.",
  blaster: "The Wally Blaster! Pew pew!",
  revolver: "An auld revolver. Six shots. I can count to six. Mostly.",
  taser: "A polis taser! Don't touch the pointy end, Wally.",
  scatter: "Scatter Blaster! For when ye're no' sure where the baddie is.",
  double: "Two barrels! Twice the bang, twice the apologies.",
  smg: "The Wee Rattler! Rat-a-tat-tat!",
  nailgun: "A nail gun! I can finally put up those shelves.",
  laser: "A laser! Pure science fiction, this.",
  rifle: "The Highland Rifle! Sharpshooter Wally, reporting for duty.",
  gatling: "A Gatling Blaster! Ma arms are gonnae be so tired.",
  sniper: "A sniper rifle! I can see a wee man eating a pie two streets away.",
  soaker: "A Super Soaker! The most dangerous thing in Wallypool.",
  tattie: "A tattie gun! Mashed justice!",
  crossbow: "A crossbow! I feel like Robin Hood. Robin Hoodie.",
  haggis: "A haggis launcher! Rabbie Burns would be proud. Or terrified.",
  caber: "A caber launcher! Highland games, but make it explosive.",
  flame: "Dragon's Breath! Who wants a toastie?",
  flamer: "A flamethrower! I'll never need a lighter again.",
  neep: "Neep grenades! Bashed neeps, coming right up!",
};
// pavement chats: two folk blethering as Wally walks past
export const CHATS = [
  ["Did ye hear Big Davie got a new motor?", "Aye. He'll have it till Wally finds it."],
  ["It's supposed to be sunny the morra.", "Aye, they said that in nineteen seventy six."],
  ["Is that Wally Man?", "Naw. Wally Man's taller. And less... that."],
  ["I've no' seen ye in ages! How's the hip?", "Still attached, hen. Still attached."],
  ["Ma cat's been missing three days.", "Have ye tried the chippy? That's where mine goes."],
  ["Two fish suppers and a pickled onion, I said.", "And whit did ye get?", "A sausage and an apology."],
  ["They're putting in a new roundabout on the high street.", "Brilliant. Somewhere new for Wally to crash."],
  ["Ye coming to the bingo the night?", "Aye, if ma legs are."],
  ["I hear the Haggis Express got nicked.", "Again? That's the third time this week."],
  ["Is it me or is it baltic?", "It's always baltic. That's how ye know ye're hame."],
  ["My Gary wants to be a superhero.", "Tell him to aim higher. Like a bus driver."],
  ["Seen the price of butter?", "Don't. I've had to take out a mortgage for a scone."],
];
// phone calls: the cast ring Wally for a blether when he's not on a job
export const CALLS = [
  ["MAMMY WALLY: Wallace, have you got clean pants on?", "WALLY MAN: Mammy! I'm in the middle of saving the city!", "MAMMY WALLY: That's no' an answer, Wallace."],
  ["MAMMY WALLY: Pick us up a loaf and a pint of milk on your way home.", "WALLY MAN: Mammy, I'm a superhero, no' a delivery service.", "MAMMY WALLY: And a scratchcard. Ta, son."],
  ["GRANDA: Wallace, is that you?", "WALLY MAN: Aye, Granda. You phoned me.", "GRANDA: Did I? Whit for?", "WALLY MAN: I don't know, Granda.", "GRANDA: Well, that was lovely. Cheerio."],
  ["BIG DAVIE: Wally. Ye know that motor ye borrowed yesterday?", "WALLY MAN: Which one?", "BIG DAVIE: ...That's what worries me."],
  ["UNCLE TAM: Wally, son, can ye lend us twenty quid?", "WALLY MAN: Uncle Tam, you owe me forty already.", "UNCLE TAM: So ye'll no' miss another twenty then. Cracking."],
  ["AUNTIE SENGA: Wallace, I seen you on the news!", "WALLY MAN: Was I being heroic?", "AUNTIE SENGA: Ye were being chased by a seagull."],
  ["MR FUDGE: Wally! Somebody's been selling ice cream wi'oot sprinkles!", "WALLY MAN: That's terrible!", "MR FUDGE: It's a crime against humanity, Wally!"],
  ["PAMAZON BOSS: Mister Wally, a customer says ye delivered a parcel through their windae.", "WALLY MAN: It was open!", "PAMAZON BOSS: It was the fourth floor, Mister Wally."],
  ["MRS McGLASHAN: Wally son, I've lost ma reading glasses.", "WALLY MAN: Have ye checked yer heid, Mrs McGlashan?", "MRS McGLASHAN: Oh! Aye. Ye're a hero, son."],
  ["MAMMY WALLY: Your tea's in the oven.", "WALLY MAN: Whit is it?", "MAMMY WALLY: Burnt. Like the last three days."],
  ["GRANDA: In ma day we didnae have superheroes. We had a man called Shug wi' a big stick.", "WALLY MAN: That's lovely, Granda.", "GRANDA: Shug's in the jail now, mind."],
  ["BIG DAVIE: Wally, I need a favour. Nae questions asked.", "WALLY MAN: What is it?", "BIG DAVIE: I said nae questions, Wally. Ach, forget it."],
];
export const DJ = [
  "You're listening to Wally F M. The only station that plays... whatever this is.",
  "Clyde Beats, keeping your windscreen wipers in time since nineteen ninety nine.",
  "Pipes and Riffs! Where the bagpipes go to eleven.",
  "Traffic update. It's bad. It's always bad. Next song.",
  "Weather update. Look oot the window. Aye. That.",
  "A shout out to Wally Man, who's just borrowed somebody's motor. Again.",
  "News at the top of the hour: a man in a cape was seen eating a pie on a roof. Police are not concerned.",
  "Competition time! First caller to name a Wallypool street wi'oot a pothole wins a car. Lines are open. Forever.",
  "Sponsored by the Pie Palace. Pies so good, ye'll forget yer cholesterol.",
  "If you're driving, please mind the pedestrians. Wally, that means you.",
  "Lost property: one golden pair of specs, one dignity, both belong to Wally Man.",
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
