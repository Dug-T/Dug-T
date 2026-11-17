// GOFFICHICK - a gothic retro first-person shooter
// Raycasting engine, enemies, combat, HUD and game flow.
'use strict';

(() => {
  // ------------------------------------------------------------------ constants
  // Height is fixed; the width follows the screen's shape (16:9 up to ~21:9) so a phone held
  // sideways is filled edge to edge. A wider screen shows more to the sides (wider field of
  // view) rather than stretching anything.
  const BASE_W = 480, MAX_W = 640, VIEW_H = 222, HUD_H = 48, H = VIEW_H + HUD_H;
  let W = BASE_W;
  let HOR = VIEW_H / 2;          // the horizon on screen: moves when Goffichick looks up or down
  const CY = VIEW_H / 2;         // the crosshair always sits in the middle
  const PITCH_MAX = 70;
  let pitch = 0;                 // how far she's looking up (+) or down (-), in screen pixels
  const FOV = 70 * Math.PI / 180, PROJ = (BASE_W / 2) / Math.tan(FOV / 2);
  let PLANE = (W / 2) / PROJ;
  const DOOR = 100;
  const TAU = Math.PI * 2;

  const canvas = document.getElementById('screen');
  let ctx = canvas.getContext('2d');
  // The canvas is 3x the game's logical resolution: the 3D world is upscaled with chunky
  // pixels (classic look) while weapons, HUD and text are drawn smooth and detailed.
  let RES = 3; // the canvas is drawn at RES x the game's resolution: 2 for CLASSIC, 3 for HD
  let renderScale = 1; // dropped to 0.75 automatically on slow devices (dynamic resolution)
  const viewC = document.createElement('canvas');
  const viewCtx = viewC.getContext('2d');
  let img, buf, zbuf, occD, occY, occN, wallBot, wallTop;
  // Graphics quality: the 3D view is rendered at QUALITY x the game's base resolution
  // (1 = Classic chunky pixels, 1.5 = HD). The HUD and weapons are always drawn sharp.
  let QUALITY = 1, RW = 480, RH = 222;
  try { const q = localStorage.getItem('goffichick-quality'); QUALITY = q ? +q : (window.matchMedia && window.matchMedia('(pointer: coarse)').matches ? 1 : 1.5); } catch (e) { QUALITY = 1.5; }
  if (QUALITY !== 1 && QUALITY !== 1.5) QUALITY = 1.5;
  const OCC = 8; // ledges per screen column that can hide sprites behind them
  // Facebook / Instagram / Messenger's built-in browser never rotates, so there the game draws
  // itself sideways inside the upright page: turning the phone shows it the right way up and
  // filling the screen. Touch input is mapped back into the game's own coordinates.
  // Every other browser rotates normally, so it is left alone.
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const inAppBrowser = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger/i.test(navigator.userAgent);
  const stage = document.getElementById('stage');
  let sideways = false;
  const toLocal = (x, y) => sideways ? { x: y, y: window.innerWidth - x } : { x, y };
  function fitScreen() {
    const iw = window.innerWidth, ih = window.innerHeight;
    sideways = coarse && inAppBrowser && ih > iw * 1.05;
    if (sideways) Object.assign(stage.style, { inset: 'auto', top: '0px', left: iw + 'px', width: ih + 'px', height: iw + 'px', transform: 'rotate(90deg)', transformOrigin: '0 0' });
    else stage.removeAttribute('style');
    const vw = sideways ? ih : iw, vh = sideways ? iw : ih;
    const nw = clamp(Math.round(H * vw / vh / 2) * 2, BASE_W, MAX_W);
    const wantRes = QUALITY > 1 ? 3 : 2;
    if (nw !== W || !img || RW !== Math.round(nw * QUALITY * renderScale) || RES !== wantRes) {
      RES = wantRes; window.__RES = RES;
      W = nw; PLANE = (W / 2) / PROJ;
      canvas.width = W * RES; canvas.height = H * RES;
      RW = Math.round(W * QUALITY * renderScale); RH = Math.round(VIEW_H * QUALITY * renderScale);
      viewC.width = RW; viewC.height = RH;
      img = viewCtx.createImageData(RW, RH); buf = new Uint32Array(img.data.buffer); zbuf = new Float32Array(RW); wallBot = new Int16Array(RW); wallTop = new Int16Array(RW);
      occD = new Float32Array(RW * OCC); occY = new Int16Array(RW * OCC); occN = new Uint8Array(RW);
      if (hudBg) buildHudBg();
    }
    const scale = Math.min(vw / W, vh / H);
    canvas.style.width = Math.floor(W * scale) + 'px'; canvas.style.height = Math.floor(H * scale) + 'px';
  }

  const rand = (a, b) => a + Math.random() * (b - a);
  const irand = (a, b) => Math.floor(rand(a, b + 1));
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const normAng = a => { a %= TAU; return a < 0 ? a + TAU : a; };

  // ------------------------------------------------------------------ enemy + projectile definitions
  // Add new enemy types here (and their art in sprites.js, and a map letter in levels.js).
  const ENEMY_DEFS = {
    zombie: { name: 'Latte Zombie', hp: 20, speed: 1.1, radius: 0.3, h: 0.78, attack: 'hitscan', dmg: [3, 12], pellets: 1, range: 14, cooldown: [1.4, 2.8], pain: 0.85, sight: 'groan', atkSound: 'memo' },
    manager: { name: 'Middle Manager', hp: 60, speed: 1.4, radius: 0.3, h: 0.84, attack: 'proj', proj: 'memo', melee: [6, 16], range: 16, cooldown: [1.2, 2.4], pain: 0.6, sight: 'groan', atkSound: 'memo' },
    wally: { name: 'Wally Man', hp: 90, speed: 1.6, radius: 0.28, h: 0.8, attack: 'proj', proj: 'notif', count: 3, spread: 0.13, range: 18, cooldown: [1.3, 2.4], pain: 0.4, sight: 'phoneRing', atkSound: 'phoneRing' },
    brute: { name: 'Gym Brute', hp: 150, speed: 2.7, radius: 0.4, h: 0.72, attack: 'melee', melee: [8, 24], range: 1.1, cooldown: [0.7, 1.0], pain: 0.5, sight: 'brute', atkSound: 'brute' },
    skull: { name: 'Influencer Skull', hp: 40, speed: 1.7, radius: 0.25, h: 0.36, z: 0.3, fly: true, attack: 'charge', melee: [3, 18], range: 10, cooldown: [1.5, 3], pain: 1, sight: 'skull', atkSound: 'skull' },
    orb: { name: 'Smiley Orb', hp: 300, speed: 1.0, radius: 0.45, h: 0.62, z: 0.25, fly: true, attack: 'proj', proj: 'sun', range: 18, cooldown: [1.5, 3], pain: 0.3, sight: 'giggle', atkSound: 'giggle' },
    boss: { name: 'WALLY PRIME', hp: 2500, speed: 1.5, radius: 0.6, h: 1.55, attack: 'boss', range: 30, cooldown: [0.7, 1.4], pain: 0.04, sight: 'bossRoar', atkSound: 'phoneRing', boss: true },
    barrel: { name: 'Pumpkin Spice Barrel', hp: 20, radius: 0.3, h: 0.5, ai: false },
    // --- Episode 2 ---
    yoga: { name: 'Yoga Instructor', hp: 70, speed: 2.0, radius: 0.27, h: 0.86, attack: 'proj', proj: 'chakra', range: 16, cooldown: [1.2, 2.2], pain: 0.5, sight: 'om', atkSound: 'om', dodge: 0.5 },
    coach: { name: 'Life Coach', hp: 100, speed: 1.3, radius: 0.3, h: 0.9, attack: 'proj', proj: 'shout', range: 14, cooldown: [1.6, 2.6], pain: 0.5, sight: 'coach', atkSound: 'coach', slogans: true },
    bubbly: { name: 'Bubbly Orb', hp: 120, speed: 1.3, radius: 0.35, h: 0.48, z: 0.3, fly: true, attack: 'proj', proj: 'sun', range: 16, cooldown: [1.4, 2.6], pain: 0.4, sight: 'giggle', atkSound: 'giggle', split: 'mini' },
    mini: { name: 'Mini Orb', hp: 25, speed: 2.6, radius: 0.2, h: 0.26, z: 0.25, fly: true, attack: 'charge', melee: [3, 10], range: 6, cooldown: [1, 2], pain: 1, sight: 'giggle', atkSound: 'skull' },
    wallyfit: { name: 'Wally Man FIT', hp: 70, speed: 2.6, radius: 0.28, h: 0.8, attack: 'melee', melee: [8, 18], range: 1.1, cooldown: [0.6, 1.0], pain: 0.5, sight: 'phoneRing', atkSound: 'brute' },
    wallydeluxe: { name: 'Wally Man DELUXE', hp: 200, speed: 1.2, radius: 0.3, h: 0.86, attack: 'proj', proj: 'phone', range: 20, cooldown: [1.6, 2.8], pain: 0.25, sight: 'phoneRing', atkSound: 'phoneRing' },
    megaorb: { name: 'MEGA SMILEY', hp: 3000, speed: 1.1, radius: 0.8, h: 1.6, z: 0.4, fly: true, attack: 'megaorb', range: 30, cooldown: [0.8, 1.5], pain: 0.03, sight: 'bossRoar', atkSound: 'giggle', boss: true, deathMsg: 'MEGA SMILEY HAS BEEN POPPED!' },
  };
  // --- Episode 3 ---
  ENEMY_DEFS.bridezilla = { name: 'Bridezilla', hp: 160, speed: 1.6, radius: 0.32, h: 0.9, attack: 'proj', proj: 'bouquet', melee: [10, 22], range: 15, cooldown: [1.2, 2.2], pain: 0.35, sight: 'brute', atkSound: 'memo', charge: 3.4 };
  ENEMY_DEFS.redcoat = { name: 'Redcoat Entertainer', hp: 80, speed: 1.9, radius: 0.28, h: 0.88, attack: 'proj', proj: 'ball', count: 3, spread: 0.18, range: 16, cooldown: [1.1, 2.0], pain: 0.5, sight: 'coach', atkSound: 'giggle', dodge: 0.3 };
  ENEMY_DEFS.wallylive = { name: 'WALLY LIVE!', hp: 3600, speed: 1.3, radius: 0.7, h: 2.0, attack: 'live', range: 30, cooldown: [0.7, 1.3], pain: 0.03, sight: 'bossRoar', atkSound: 'phoneRing', boss: true, deathMsg: 'WALLY LIVE! HAS BEEN CANCELLED!' };
  ENEMY_DEFS.boss.deathMsg = 'WALLY PRIME HAS BEEN UNSUBSCRIBED!';
  // --- Episode 4
  ENEMY_DEFS.mummy = { name: 'Spa Mummy', hp: 180, speed: 1.0, radius: 0.3, h: 0.86, attack: 'proj', proj: 'stone', melee: [10, 20], range: 14, cooldown: [1.6, 2.6], pain: 0.3, sight: 'groan', atkSound: 'om' };
  ENEMY_DEFS.mascot = { name: 'Happyland Mascot', hp: 240, speed: 1.7, radius: 0.38, h: 1.0, attack: 'melee', melee: [14, 28], range: 1.2, cooldown: [0.8, 1.2], pain: 0.25, sight: 'giggle', atkSound: 'brute', charge: 4.2 };
  ENEMY_DEFS.drone = { name: 'Selfie Drone', hp: 45, speed: 2.4, radius: 0.25, h: 0.3, z: 0.75, fly: true, attack: 'hitscan', dmg: [2, 6], range: 16, cooldown: [0.5, 1.0], pain: 0.7, sight: 'phoneRing', atkSound: 'pistol' };
  ENEMY_DEFS.karen = { name: 'Karen', hp: 130, speed: 1.5, radius: 0.28, h: 0.86, attack: 'proj', proj: 'complaint', range: 16, cooldown: [1.2, 2.2], pain: 0.4, sight: 'coach', atkSound: 'memo', summoner: 'manager' };
  ENEMY_DEFS.wallyexe = { name: 'WALLY.EXE', hp: 4200, speed: 1.4, radius: 0.7, h: 2.0, attack: 'exe', range: 30, cooldown: [0.6, 1.2], pain: 0.03, sight: 'bossRoar', atkSound: 'phoneRing', boss: true, deathMsg: 'WALLY.EXE HAS STOPPED RESPONDING.' };
  // --- new monsters: each one brings a trick of its own
  ENEMY_DEFS.hypeman = { name: 'Hype Man', hp: 110, speed: 1.5, radius: 0.3, h: 0.9, attack: 'proj', proj: 'shout', range: 14, cooldown: [1.4, 2.4], pain: 0.45, sight: 'coach', atkSound: 'coach', aura: 'hype' };
  ENEMY_DEFS.ghost = { name: 'Selfie Ghost', hp: 55, speed: 1.8, radius: 0.25, h: 0.4, z: 0.35, fly: true, attack: 'proj', proj: 'notif', count: 2, spread: 0.1, range: 16, cooldown: [1.2, 2.2], pain: 0.8, sight: 'skull', atkSound: 'phoneRing', blink: true };
  ENEMY_DEFS.popper = { name: 'Party Popper', hp: 30, speed: 3.4, radius: 0.28, h: 0.42, z: 0.15, fly: true, attack: 'melee', melee: [0, 0], range: 1.6, cooldown: [0.1, 0.2], pain: 0.2, sight: 'giggle', atkSound: 'pop', kamikaze: true };
  ENEMY_DEFS.guru = { name: 'Wellness Guru', hp: 90, speed: 1.6, radius: 0.27, h: 0.86, attack: 'proj', proj: 'chakra', range: 15, cooldown: [1.4, 2.4], pain: 0.5, sight: 'om', atkSound: 'om', healer: true, dodge: 0.3 };
  ENEMY_DEFS.riot = { name: 'Riot Shield Manager', hp: 120, speed: 1.2, radius: 0.32, h: 0.84, attack: 'proj', proj: 'memo', melee: [8, 18], range: 14, cooldown: [1.5, 2.6], pain: 0.25, sight: 'groan', atkSound: 'memo', shield: true };
  // ---- humour: what the monsters shout, how you died, and assorted nonsense
  const QUIPS = {
    zombie: { sight: ['Have you tried oat milk?', 'Is this decaf?!', 'Morning, sunshine!', 'Pumpkin spice season!'], death: ['My latte... art...', "Should've ordered a flat white...", 'Spilled it.'] },
    manager: { sight: ["Let's circle back!", 'Per my last email...', 'Quick sync?', "Let's take this offline!"], death: ["I'm taking this offline...", 'Out of office. Forever.', 'Synergy... lost...'] },
    wally: { sight: ['Hey guys, Wally here!', 'Smash that like button!', "Don't forget to subscribe!", "What's up, Wally Gang?!"], death: ['Unsubscribed?!', 'Like and... subscr...', 'Stream... ended...'] },
    brute: { sight: ['Do you even lift?', 'LEG DAY!', 'Protein shake time!', 'Spot me, bro!'], death: ['My gains!', 'Skipped... cardio...'] },
    skull: { sight: ['#blessed', 'Smile for the camera!', 'Going viral!', 'Link in bio!'], death: ["Ratio'd...", 'Deleted.', 'Shadowbanned!'] },
    orb: { sight: ['Have a NICE DAY!', 'Smile!', 'Turn that frown upside down!'], death: ['Pop!', 'Not so nice now...', 'Deflating...'] },
    yoga: { sight: ['Namaste!', 'Breathe in the positivity!', 'Find your inner light!'], death: ['Om... ow.', 'Bad... vibes...', 'Not very zen.'] },
    coach: { sight: ["You've GOT this!", 'Believe in yourself!', 'Manifest it!'], death: ['Failure is... a lesson...', 'I believe... in nothing now.'] },
    bridezilla: { sight: ["It's MY day!", "You're not on the list!", 'Who wore BLACK to my wedding?!'], death: ['The cake... ruined...', 'Something borrowed... something DEAD.'] },
    redcoat: { sight: ['Hi-de-hi, campers!', 'Knobbly knees contest!', 'Everybody conga!'], death: ['Lights out, campers...', 'Ho-de-ho... no.'] },
    riot: { sight: ['HR will hear about this!', 'Please hold!', "That's a policy violation!"], death: ['Filing... a complaint...', 'Escalating... to God...'] },
    ghost: { sight: ['Say cheese!', 'Selfie time!', 'This angle is SO good!'], death: ['Bad lighting...', 'Filter... failed...'] },
    popper: { sight: ['SURPRISE!', "It's a PARTY!", 'Wheeee!'], death: ['Party... over...'] },
    guru: { sight: ['Your aura is very dark.', 'Have you tried gratitude?', 'Hydrate!'], death: ['Out of... alignment...'] },
    mummy: { sight: ['Have you tried a seaweed wrap?', 'Relaaaax...', 'Cucumber water?', 'Exfoliate your soul!'], death: ['My exfoliation...', 'Too... relaxed...'] },
    mascot: { sight: ['HUG TIME!', 'Smile for the photo!', 'Who wants a HUUUG?!', 'Free hugs! Mandatory!'], death: ['The head... comes off...', 'Twenty years... in this suit...'] },
    drone: { sight: ['Recording!', 'Going live in 3, 2, 1!', 'Smile, you are on camera!', 'Content detected!'], death: ['Signal lost...', 'Battery... low...'] },
    karen: { sight: ['I want to speak to the MANAGER!', 'Excuse me?!', "I'm leaving a one-star review!", 'Do you know who I AM?!'], death: ['This is... unacceptable...', 'Manager... help...'] },
    wallyexe: { sight: ['UPLOADING POSITIVITY.EXE', 'YOU HAVE BEEN SUBSCRIBED.', 'ERROR: GLOOM NOT FOUND.', 'PLEASE RATE YOUR EXPERIENCE.'], death: ['FATAL ERROR...', 'BLUE SCREEN OF... DEATH...'] },
    hypeman: { sight: ["LET'S GOOOO!", 'MAKE SOME NOISE!', 'Is everybody HAPPY?!'], death: ['Hype... gone...'] },
  };
  const LIMB_QUIPS = {
    zombie: ['My arm fell in my latte!', 'Extra shot? NO!'], manager: ["I'll need to file an injury report!", 'This is NOT in my job description!'],
    wally: ['This is NOT going in the vlog!', 'Pin this comment: OW!'], brute: ['NOT MY GAINS ARM!', 'Never skip leg day... I have one!'],
    yoga: ['I can still do tree pose!', 'Flexibility... has limits!'], coach: ['Losing a leg is a growth opportunity!', "I'm still half full!"],
    bridezilla: ['Not before the photos!', 'My something BLUE is now my FACE!'], redcoat: ['Hop along, campers!', 'Everybody do the hokey cokey!'],
    mummy: ['My towel is unravelling!', 'This is NOT relaxing!'], mascot: ['Kids, look away!', 'That is NOT in the costume contract!'], karen: ['I am calling CORPORATE!', 'My HAIR!'],
    guru: ['My chakras!', "I'm releasing... a limb!"], hypeman: ['STILL HYPED!', 'One leg, ONE LOVE!'], riot: ["That's an HR violation!", 'Workplace injury!'],
  };
  const GENERIC_LIMB = ["'Tis but a scratch!", "It's only a flesh wound!", "I'll hop it off!", 'Anyone seen my arm?', 'Hop to it!', 'I needed that!'];
  const NO_ARMS = ['How do I hold this?!', 'Come here and I will BITE you!', 'Armless but not harmless!'];
  for (const [k, v] of [['wallyfit', 'wally'], ['wallydeluxe', 'wally'], ['boss', 'wally'], ['wallylive', 'wally'], ['bubbly', 'orb'], ['mini', 'orb'], ['megaorb', 'orb']]) QUIPS[k] = QUIPS[v];
  const CAUSE = {
    zombie: 'Death by a thousand oat-milk lattes.', manager: 'Buried under a pile of memos.', wally: 'Notified to death.', brute: 'Crushed by unsolicited gym advice.',
    skull: 'Fatally hashtagged.', orb: 'Smiled at too hard.', boss: 'Unsubscribed by Wally Prime.', yoga: 'Stretched beyond her limits.', coach: 'Motivated to death.',
    bubbly: 'Bubbled.', mini: 'Nibbled by a tiny optimist.', wallyfit: "Out-cardio'd.", wallydeluxe: 'Killed by premium content.', megaorb: 'Smiled at by something the size of a bus.',
    bridezilla: 'Caught the bouquet. Next to be married... to the grave.', redcoat: 'Dragged into the conga line. Forever.', wallylive: 'Cancelled live on air.',
    hypeman: 'Hyped to death.', mummy: 'Relaxed to death.', mascot: 'Hugged to death by a theme-park mascot.', drone: 'Filmed for content. Posthumously.', karen: 'Spoken to by the manager.', wallyexe: 'Deleted by the algorithm.', ghost: 'Photobombed into the afterlife.', popper: 'Surprise party. Big surprise.', guru: 'Died of inner peace.', riot: 'Escalated to HR. Permanently.',
    slime: 'Went paddling in toxic sludge. Bold choice.', barrel: 'Pumpkin spice explosion. Very seasonal.', self: 'Blew herself up. Very goth.', player: 'Fragged by a friend. How rude.',
  };
  const TIPS = [
    'TIP: Wally Man cannot be reasoned with. He has a podcast.', 'TIP: Latte Zombies are mostly foam.', 'TIP: The Riot Shield Manager has never once been flanked in a meeting.',
    'TIP: Black roses are hidden on every level. Goffichick will not shut up about them.', 'TIP: Never accept a free hug from a Life Coach.',
    'TIP: Party Poppers are fun at parties. You are not at a party.', 'TIP: Shoot the Wellness Guru first. She heals. Rude.', 'TIP: Bat grenades bounce. So does your ego.',
    'TIP: The Selfie Ghost needs your best angle. Do not give it.', 'TIP: Eyeliner does not count as armour. We checked.', 'TIP: Gym Brutes skip cardio. Run.',
    'TIP: Pumpkin Spice Barrels are seasonal and explosive. Like Halloween.', 'TIP: Press K for a screenshot. Press H to hide the gun and look moody.',
  ];
  const RATINGS = [[100, 'UTTERLY MISERABLE (perfect)'], [80, 'DELIGHTFULLY DREARY'], [60, 'MODERATELY MOODY'], [40, 'SLIGHTLY SULKY'], [0, 'SUSPICIOUSLY CHEERFUL']];
  const PICKUP_QUIPS = {
    vial: ['Picked up a vial of blood. Vintage.', 'Picked up a vial of blood. Type: Goth Negative.'], heart: ['Picked up a black heart. Just like hers.'],
    jacket: ['Picked up a leather jacket. Instantly 40% cooler.'], corset: ['Picked up the SPIKED CORSET! Breathing is optional.'],
    bullets: ['Picked up bullets. Blessed by a very tired vampire.', 'Picked up bullets. Each one engraved "no".'], shells: ['Picked up shells. Not the beach kind.'],
    rockets: ['Picked up rockets. For when words fail.'], soul: ["SOUL ORB! Someone else's soul. Finders keepers."], fuel: ['Picked up fuel. Smells like a bonfire of joy.'],
  };
  const PAUSE_QUIPS = ['Taking a moment to brood.', 'Fixing her eyeliner.', 'Staring into the void. The void waved.', 'Writing very sad poetry.', 'Listening to one song on repeat.'];
  let bubbleCd = 0, lastAttacker = null;
  const typeOf = x => x && typeof x === 'object' ? x.type : x;
  // a speech bubble over a monster
  function shout(e, kind, chance = 1, force = false) {
    if (Math.random() > chance) return;
    let lines = QUIPS[e.type] && QUIPS[e.type][kind];
    if (kind === 'limb') lines = (LIMB_QUIPS[e.type] || []).concat(GENERIC_LIMB);
    if (kind === 'noarms') lines = NO_ARMS;
    if (!lines || !lines.length) return;
    if (!force && kind !== 'death' && bubbleCd > 0) return;
    if (!force && L.enemies.filter(o => o.bubble && o.bubble.t > 0).length >= 2 && kind !== 'death') return;
    const text = lines[irand(0, lines.length - 1)];
    e.bubble = { text, t: kind === 'death' ? 2 : 2.6 }; bubbleCd = 2.2;
    const pd = Math.hypot(e.x - player.x, e.y - player.y);
    if (pd < 12) Voice.monster(e.type, text, pd); // each monster type has its own voice
  }
  const SLOGANS = ['YOU\'VE GOT THIS!', 'LIVE, LAUGH, LOVE!', 'GOOD VIBES ONLY!', 'RISE AND GRIND!', 'SMILE MORE!', 'MANIFEST IT!', 'BE YOUR BEST SELF!', 'NO BAD DAYS!'];

  const PROJECTILES = {
    skull: { speed: 11, dmg: [20, 60], splash: 1.7, splashDmg: 110, size: 0.22, fx: 'boom', fxSize: 1.0, sound: 'explode', trail: true },
    rocket: { speed: 14, dmg: [20, 60], splash: 1.9, splashDmg: 128, size: 0.2, fx: 'boom', fxSize: 1.15, sound: 'explode', trail: true },
    hex: { speed: 15, dmg: [8, 22], size: 0.14, fx: 'hexHit', fxSize: 0.35, sound: 'hexHit' },
    gloom: { speed: 9, dmg: [100, 220], splash: 2.2, splashDmg: 120, size: 0.55, fx: 'gloomHit', fxSize: 1.6, sound: 'bfgBoom', bfg: true },
    memo: { speed: 6.5, dmg: [5, 18], size: 0.2, fx: 'boom', fxSize: 0.35, sound: 'hexHit' },
    notif: { speed: 8, dmg: [4, 10], size: 0.16, fx: 'hexHit', fxSize: 0.3, sound: 'hexHit' },
    sun: { speed: 6.5, dmg: [10, 26], size: 0.25, fx: 'splash', fxSize: 0.45, sound: 'hexHit' },
    // flamethrower: short-lived, growing gouts of fire that set enemies alight
    flame: { speed: 7.5, dmg: [3, 7], size: 0.16, grow: 2.4, life: 0.5, fx: 'flameHit', fxSize: 0.35, sound: null, ignite: 2.2, quiet: true },
    chakra: { speed: 6, dmg: [4, 10], size: 0.24, fx: 'hexHit', fxSize: 0.35, sound: 'hexHit', slow: 1.6 },
    shout: { speed: 7, dmg: [5, 12], size: 0.3, grow: 1.2, fx: 'splash', fxSize: 0.5, sound: 'hexHit', slow: 1.2 },
    bouquet: { speed: 7, dmg: [8, 16], splash: 1.1, splashDmg: 25, size: 0.26, fx: 'petals', fxSize: 0.6, sound: 'pop' },
    ball: { speed: 8.5, dmg: [5, 11], size: 0.16, fx: 'splash', fxSize: 0.3, sound: 'hexHit' },
    spot: { speed: 15, dmg: [12, 22], size: 0.24, fx: 'hexHit', fxSize: 0.45, sound: 'hexHit' },
    // Bat-Bow: a fast silver bat bolt that pierces everything in a line
    bat: { speed: 22, dmg: [30, 55], size: 0.2, fx: 'puff', fxSize: 0.2, sound: null, pierce: true },
    phone: { speed: 9.5, dmg: [15, 30], splash: 1.4, splashDmg: 50, size: 0.26, fx: 'boom', fxSize: 0.9, sound: 'explode' },
    stone: { speed: 8, dmg: [10, 20], size: 0.2, fx: 'puff', fxSize: 0.3, sound: 'punch' },
    complaint: { speed: 7.5, dmg: [8, 14], size: 0.22, fx: 'hexHit', fxSize: 0.35, sound: 'hexHit' },
    pixel: { speed: 11, dmg: [8, 14], size: 0.16, fx: 'hexHit', fxSize: 0.35, sound: 'hexHit' },
    nail: { speed: 26, dmg: [7, 11], size: 0.07, fx: 'puff', fxSize: 0.15, sound: null },
    // a ricocheting record: bounces off up to three walls before it shatters
    vinyl: { speed: 13, dmg: [28, 48], size: 0.22, fx: 'hexHit', fxSize: 0.45, sound: 'hexHit', ricochet: 3 },
    // bat grenade: lobbed, bounces, goes off after its fuse (or on hitting a monster)
    grenade: { speed: 7.5, dmg: [30, 50], splash: 2.1, splashDmg: 130, size: 0.13, fx: 'boom', fxSize: 1.1, sound: 'explode', grav: 9, life: 1.7 },
  };

  const STEP = 0.36;            // tallest ledge you can walk straight up (stairs)
  const DIFFS = [
    { name: 'MILDLY GLOOMY', dmg: 0.5, ammo: 2, speed: 0.85, cool: 1.3, hp: 0.8 },
    { name: 'PROPERLY GOTH', dmg: 1, ammo: 1, speed: 1, cool: 1, hp: 1 },
    { name: 'ULTRA GOTH', dmg: 1.5, ammo: 0.75, speed: 1.2, cool: 0.7, hp: 1.25 },
    { name: 'NIGHTMARE GOTH', dmg: 2, ammo: 0.6, speed: 1.35, cool: 0.55, hp: 1.4, respawn: true }, // monsters come back to life
  ];
  const KEYS = {
    red: { name: 'BAT KEY', color: '#ff2a4a', tex: 13 },
    blue: { name: 'SKULL KEY', color: '#3d8bff', tex: 14 },
    gold: { name: 'COFFIN KEY', color: '#ffcf3a', tex: 15 },
  };
  const LOCK_CHARS = { E: 'red', B: 'blue', Q: 'gold' };
  let diff = 0; // MILDLY GLOOMY by default (a saved choice wins)

  // ------------------------------------------------------------------ state
  let S = null;            // sprite library
  let faces = null;        // HUD face canvases
  let titleImg = null;
  let state = 'loading';
  let levelIndex = 0;
  // what kind of run this is: 'campaign', 'weekly' (the weekly challenge), 'custom' (a friend's
  // shared level) or 'test' (play-testing in the level editor)
  let mode = 'campaign', soloDef = null, mods = { hurt: 1, hit: 1, speed: 1 }, campaignDiff = null;
  let L = null;            // current level runtime
  let player = null;
  let msg = '', msgT = 0;
  let automap = false;
  let shake = 0, lightBoost = 0, painFlash = 0, pickupFlash = 0;
  // combat feedback and effects state
  let shownWpn = null, wpnNameT = 0;
  let hitMarkT = 0, killMarkT = 0, slowMoT = 0, announce = null, killChain = [], dmgDirs = [], heartT = 0;
  // EFFECTS setting: HIGH turns on bloom, reflections, ambient occlusion, film grain and extra particles
  // fxDrop: 0 = everything; 1 = no bloom; 2 = also no reflections or corner shadows (set automatically on slow devices)
  let fxDrop = 0, frameAvg = 1 / 60, slowFor = 0;
  // LOOK SPEED: how fast dragging, the right-hand stick and the gamepad turn and aim (the mouse scales from 1.5)
  const LOOK_STEPS = [0.75, 1, 1.5, 2, 2.5, 3, 4, 5, 6];
  let LOOK_SENS = 1; try { const v = parseFloat(localStorage.getItem('goffichick-look')); if (LOOK_STEPS.includes(v)) LOOK_SENS = v; } catch (e) {}
  const setLook = v => { LOOK_SENS = v; try { localStorage.setItem('goffichick-look', String(v)); } catch (e) {} };
  const nextLook = (dir = 1) => LOOK_STEPS[(LOOK_STEPS.indexOf(LOOK_SENS) + dir + LOOK_STEPS.length) % LOOK_STEPS.length];
  // MUSIC: 'shuffle' plays the level's theme, then random tunes; 'level' keeps repeating the level's theme
  let musicMode = 'shuffle'; try { if (localStorage.getItem('goffichick-music') === 'level') musicMode = 'level'; } catch (e) {}
  let FX_HIGH = true; try { FX_HIGH = localStorage.getItem('goffichick-fx') !== 'low'; } catch (e) {}
  let time = 0, levelTime = 0, stateT = 0;
  let god = false;
  let cheatBuf = '';

  function newPlayer(keep) {
    const p = {
      x: 0, y: 0, a: 0, health: 100, armor: 0, armorType: 0,
      ammo: { bullets: 100, shells: 20, skulls: 8, rockets: 8, souls: 100, fuel: 120, bolts: 20 },
      weapons: Object.fromEntries(WEAPONS.map(w => [w.key, true])), cur: 'shotgun', next: null,
      switchT: 0, cooldown: 0, firePhase: 0, fireT: 0, flashT: 0, windupT: 0,
      bobT: 0, move: 0, eyeZ: 0.5, refireT: 0, dead: false, faceLook: 0, faceT: 0, painT: 0, grinT: 0,
      kills: 0, items: 0, secrets: 0, slimeT: 0,
      fz: 0, vz: 0, keys: {}, pw: { veil: 0, shroud: 0, mask: 0, gloom: 0, wings: 0 }, berserk: false, rageT: 0, slowT: 0, nades: 3, nadeCd: 0, roses: 0, shotsF: 0, shotsH: 0, dmgDealt: 0, bestStreak: 0, bloodSteps: 0,
    };
    if (keep) {
      p.health = keep.health; p.armor = keep.armor; p.armorType = keep.armorType;
      p.ammo = { ...p.ammo, ...keep.ammo }; p.weapons = { ...p.weapons, ...keep.weapons }; p.cur = keep.cur; if (keep.nades !== undefined) p.nades = keep.nades;
    }
    return p;
  }
  const weaponByKey = k => WEAPONS.find(w => w.key === k);

  // ------------------------------------------------------------------ level loading
  function loadLevel(i, keep) {
    const def = typeof i === 'number' ? LEVELS[i] : i;
    const rows = def.map;
    const mw = Math.max(...rows.map(r => r.length)), mh = rows.length;
    const grid = new Int16Array(mw * mh);
    const block = new Uint8Array(mw * mh);
    const seen = new Uint8Array(mw * mh);
    const slime = new Uint8Array(mw * mh);
    const light = new Float32Array(mw * mh).fill(1);
    const fh = new Float32Array(mw * mh);                    // floor height of every tile
    for (const z of def.heights || []) for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) if (x >= 0 && y >= 0 && x < mw && y < mh) fh[y * mw + x] = z.z;
    const liftTile = new Uint8Array(mw * mh);
    const lifts = (def.lifts || []).map(lf => {
      const tiles = [];
      for (let y = lf.y; y < lf.y + lf.h; y++) for (let x = lf.x; x < lf.x + lf.w; x++) { tiles.push(y * mw + x); fh[y * mw + x] = lf.high; liftTile[y * mw + x] = 1; }
      return { tiles, low: lf.low, high: lf.high, h: lf.high, state: 'up', t: 0, onT: 0 };
    });
    const lockAt = new Map();
    for (const z of def.lights || []) for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) if (x >= 0 && y >= 0 && x < mw && y < mh) light[y * mw + x] = z.level;
    L = { def, mw, mh, grid, block, seen, slime, light, fh, lifts, liftTile, ceilH: def.ceilH || 1, stepTex: def.stepTex || 1, lightNow: new Float32Array(light), zones: (def.lights || []).map(z => ({ ...z, on: true })), totalSecrets: 0,
      slimeTex: Textures.flats.slime.data, doors: new Map(), enemies: [], items: [], decor: [], projs: [], fx: [], parts: [], bolts: [], vfx: [], vfxN: {}, fdec: new Map(), wdec: new Map(),
      totalKills: 0, totalItems: 0, starts: [], avatars: [], exitT: -1, flow: null, flowFrom: -1, fog: def.fog,
      floor: Textures.flats[def.floor].data, ceil: Textures.flats[def.ceil].data };
    player = newPlayer(keep);
    for (let y = 0; y < mh; y++) {
      for (let x = 0; x < mw; x++) {
        let ch = rows[y][x] ?? '#';
        if (x === 0 || y === 0 || x === mw - 1 || y === mh - 1) { if (!(ch in WALL_CHARS)) ch = '#'; }
        const idx = y * mw + x;
        if (ch in WALL_CHARS) { grid[idx] = WALL_CHARS[ch]; continue; }
        if (ch === 'D') { grid[idx] = DOOR; continue; }
        if (ch in LOCK_CHARS) { grid[idx] = DOOR; lockAt.set(idx, LOCK_CHARS[ch]); continue; }
        if (ch === '$') { grid[idx] = DOOR; L.secretAt = L.secretAt || new Set(); L.secretAt.add(idx); L.totalSecrets++; continue; }
        if (ch === '~') { slime[idx] = 1; continue; }
        const cx = x + 0.5, cy = y + 0.5;
        if ('><^v'.includes(ch)) { player.x = cx; player.y = cy; player.a = { '>': 0, 'v': Math.PI / 2, '<': Math.PI, '^': -Math.PI / 2 }[ch]; L.starts.push({ x: cx, y: cy, a: player.a }); }
        else if (ch in ENEMY_CHARS) { spawnEnemy(ENEMY_CHARS[ch], cx, cy); L.totalKills++; }
        else if (ch in ITEM_TYPES) { L.items.push({ x: cx, y: cy, def: ITEM_TYPES[ch], taken: false }); if (!ITEM_TYPES[ch].weapon) L.totalItems++; }
        else if (ch in DECOR_TYPES) {
          const d = DECOR_TYPES[ch];
          if (d.barrel) spawnEnemy('barrel', cx, cy);
          else { L.decor.push({ x: cx, y: cy, def: d, hp: 35 }); if (d.block) block[idx] = 1; }
        }
      }
    }
    // doors: orientation from neighbouring walls
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
      if (grid[y * mw + x] !== DOOR) continue;
      const solidNS = isWallTile(x, y - 1) && isWallTile(x, y + 1);
      const secret = !!(L.secretAt && L.secretAt.has(y * mw + x));
      // a secret door wears the texture of the wall next to it
      const near = solidNS ? grid[(y - 1) * mw + x] : grid[y * mw + x - 1];
      const lock = lockAt.get(y * mw + x) || null;
      L.doors.set(y * mw + x, { x, y, open: 0, state: 'closed', t: 0, vertical: solidNS, secret, lock, tex: secret ? (near > 0 && near !== DOOR ? near : 1) : lock ? KEYS[lock].tex : 5 });
    }
    // which sides of each floor tile touch a wall (for the soft shadows in corners)
    L.wmask = new Uint8Array(mw * mh);
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
      const i = y * mw + x; if (grid[i]) continue;
      L.wmask[i] = (isWallTile(x - 1, y) ? 1 : 0) | (isWallTile(x + 1, y) ? 2 : 0) | (isWallTile(x, y - 1) ? 4 : 0) | (isWallTile(x, y + 1) ? 8 : 0);
    }
    L.shiny = def.shiny ?? ['tiles', 'studio', 'parquet', 'checker', 'spa'].includes(def.floor);
    placeLamps(def);
    L.slimeTiles = []; for (let i = 0; i < slime.length; i++) if (slime[i]) L.slimeTiles.push(i);
    L.totalRoses = 0; L.popups = [];
    setupExtras(def, i);
    player.fz = fh[Math.floor(player.y) * mw + Math.floor(player.x)];
    for (const e of L.enemies) e.fz = fh[Math.floor(e.y) * mw + Math.floor(e.x)];
    levelTime = 0; L.flowFrom = -1; L.baseEnemies = L.enemies.length; pitch = 0; HOR = VIEW_H / 2;
    updateDynLights();
    Sfx.setSong(typeof i === 'number' ? i + 1 : def.song || 1);
    Sfx.setAmbience(def.ambience || (def.weather === 'rain' ? 'rain' : null));
    L.rain = []; L.lightningT = 4 + Math.random() * 8; L.flashA = 0;
    Voice.say('levelStart', 0.9, true);
    msg = `${def.name}   - music: ${Sfx.songName()}`; msgT = 4;
  }

  function spawnEnemy(type, x, y) {
    const def = ENEMY_DEFS[type];
    L.enemies.push({ type, def, x, y, hp: def.ai === false ? def.hp : Math.round(def.hp * DIFFS[diff].hp), fz: 0, target: null, state: def.ai === false ? 'static' : 'idle', t: 0, atkT: rand(0.5, 1.5),
      frame: 0, animT: rand(0, 1), vx: 0, vy: 0, dead: false, fired: false, seeT: rand(0, 0.3), z: def.z || 0 });
  }

  const isWallTile = (x, y) => { if (x < 0 || y < 0 || x >= L.mw || y >= L.mh) return true; const t = L.grid[y * L.mw + x]; return t > 0 && t !== DOOR; };

  function floorAt(x, y) {
    const mx = Math.floor(x), my = Math.floor(y);
    if (mx < 0 || my < 0 || mx >= L.mw || my >= L.mh) return 0;
    return L.fh[my * L.mw + mx];
  }
  // solid for movement. fz = the mover's feet height: a ledge more than `step` above it blocks.
  function solidAt(x, y, ignoreBlock, fz, step = STEP) {
    const mx = Math.floor(x), my = Math.floor(y);
    if (mx < 0 || my < 0 || mx >= L.mw || my >= L.mh) return true;
    const idx = my * L.mw + mx, t = L.grid[idx];
    if (t === DOOR) return L.doors.get(idx).open < 0.9;
    if (t > 0) return true;
    if (fz !== undefined && L.fh[idx] - fz > step) return true;
    return !ignoreBlock && L.block[idx] === 1;
  }
  // solid for projectiles / line of sight (decorations don't block)
  function opaqueAt(x, y) {
    const mx = Math.floor(x), my = Math.floor(y);
    if (mx < 0 || my < 0 || mx >= L.mw || my >= L.mh) return true;
    const idx = my * L.mw + mx, t = L.grid[idx];
    if (t === DOOR) return L.doors.get(idx).open < 0.7;
    return t > 0;
  }
  function losClear(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy), n = Math.ceil(d / 0.2);
    for (let i = 1; i < n; i++) if (opaqueAt(x0 + dx * i / n, y0 + dy * i / n)) return false;
    return true;
  }

  function collides(x, y, r, ignoreBlock, fz, step) {
    return solidAt(x - r, y - r, ignoreBlock, fz, step) || solidAt(x + r, y - r, ignoreBlock, fz, step) || solidAt(x - r, y + r, ignoreBlock, fz, step) || solidAt(x + r, y + r, ignoreBlock, fz, step);
  }
  function tryMove(e, dx, dy, r) {
    let moved = false;
    const step = e.def && e.def.fly ? 0.9 : STEP;
    if (!collides(e.x + dx, e.y, r, false, e.fz, step)) { e.x += dx; moved = true; }
    if (!collides(e.x, e.y + dy, r, false, e.fz, step)) { e.y += dy; moved = true; }
    return moved;
  }

  // ------------------------------------------------------------------ raycasting
  const hit = { dist: 0, tex: 0, u: 0, side: 0, mx: 0, my: 0 };
  function cast(px, py, rdx, rdy) {
    let mx = Math.floor(px), my = Math.floor(py);
    const ddx = rdx === 0 ? 1e30 : Math.abs(1 / rdx), ddy = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
    let stepX, stepY, sdx, sdy, side = 0;
    if (rdx < 0) { stepX = -1; sdx = (px - mx) * ddx; } else { stepX = 1; sdx = (mx + 1 - px) * ddx; }
    if (rdy < 0) { stepY = -1; sdy = (py - my) * ddy; } else { stepY = 1; sdy = (my + 1 - py) * ddy; }
    let prevDoor = false;
    for (let i = 0; i < 128; i++) {
      if (sdx < sdy) { sdx += ddx; mx += stepX; side = 0; } else { sdy += ddy; my += stepY; side = 1; }
      if (mx < 0 || my < 0 || mx >= L.mw || my >= L.mh) { hit.dist = 64; hit.tex = 1; hit.u = 0; hit.side = side; return hit; }
      const idx = my * L.mw + mx, t = L.grid[idx];
      if (t === 0) { prevDoor = false; continue; }
      if (t === DOOR) {
        const d = L.doors.get(idx);
        if (d.vertical) {
          const tt = (mx + 0.5 - px) / rdx; const hy = py + tt * rdy;
          if (tt > 0 && Math.floor(hy) === my) { const u = hy - my; if (u >= d.open) { hit.dist = tt; hit.tex = d.tex; hit.u = u - d.open; hit.side = 0; hit.mx = mx; hit.my = my; return hit; } }
        } else {
          const tt = (my + 0.5 - py) / rdy; const hx = px + tt * rdx;
          if (tt > 0 && Math.floor(hx) === mx) { const u = hx - mx; if (u >= d.open) { hit.dist = tt; hit.tex = d.tex; hit.u = u - d.open; hit.side = 1; hit.mx = mx; hit.my = my; return hit; } }
        }
        prevDoor = !d.secret; continue;
      }
      const dist = side === 0 ? sdx - ddx : sdy - ddy;
      let u = side === 0 ? py + dist * rdy : px + dist * rdx; u -= Math.floor(u);
      if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) u = 1 - u;
      hit.dist = dist; hit.tex = prevDoor ? 10 : t; hit.u = u; hit.side = side; hit.mx = mx; hit.my = my;
      return hit;
    }
    hit.dist = 64; hit.tex = 1; return hit;
  }

  // ------------------------------------------------------------------ lamps and light shafts
  // Coloured lamps on the walls (neon, candles, LED strips) and shafts of light falling from skylights.
  // Positions are picked from the map itself, the same way every time.
  function placeLamps(def) {
    L.lamps = []; L.shafts = [];
    if (!def.lamps && !def.shafts) return;
    let h = 7; for (const ch of def.name) h = (h * 31 + ch.charCodeAt(0)) | 0;
    const rnd = seeded(h), mw = L.mw, open = i => !L.grid[i] && !L.slime[i] && !L.block[i];
    const spaced = (list, x, y, d) => list.every(q => Math.hypot(q.x - x, q.y - y) > d);
    if (def.lamps) {
      const cand = []; for (let i = 0; i < mw * L.mh; i++) if (open(i) && L.wmask[i]) cand.push(i);
      for (let tries = 0; tries < 400 && L.lamps.length < def.lamps.count && cand.length; tries++) {
        const i = cand[(rnd() * cand.length) | 0], m = L.wmask[i], tx = i % mw, ty = (i / mw) | 0;
        const x = tx + 0.5 + (m & 1 ? -0.38 : m & 2 ? 0.38 : 0), y = ty + 0.5 + (m & 4 ? -0.38 : m & 8 ? 0.38 : 0);
        if (!spaced(L.lamps, x, y, 4.5)) continue;
        const c = def.lamps.colors[L.lamps.length % def.lamps.colors.length];
        L.lamps.push({ x, y, z: Math.min(L.ceilH - 0.15, def.lamps.h), c, rgb: c.split(',').map(v => v / 255), pulse: !!def.lamps.pulse, ph: rnd() * 6 });
      }
    }
    if (def.shafts) {
      const cand = []; for (let y = 2; y < L.mh - 2; y++) for (let x = 2; x < mw - 2; x++) { let ok = true; for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1; dx++) if (!open((y + dy) * mw + x + dx)) { ok = false; break; } if (ok) cand.push([x, y]); }
      for (let tries = 0; tries < 300 && L.shafts.length < def.shafts.count && cand.length; tries++) {
        const [tx, ty] = cand[(rnd() * cand.length) | 0];
        if (!spaced(L.shafts, tx + 0.5, ty + 0.5, 6)) continue;
        L.shafts.push({ x: tx + 0.5, y: ty + 0.5, c: def.shafts.c, rgb: def.shafts.c.split(',').map(v => v / 255) });
      }
    }
  }
  function drawLampsAndShafts() {
    if (!(L.lamps && L.lamps.length) && !(L.shafts && L.shafts.length)) return;
    const p = player, dirX = Math.cos(p.a), dirY = Math.sin(p.a);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, VIEW_H); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
    for (const sh of L.shafts || []) { // a soft beam of light from the ceiling to the floor
      const dx = sh.x - p.x, dy = sh.y - p.y, depth = dx * dirX + dy * dirY; if (depth < 0.5 || depth > 22) continue;
      const sx = (W / 2) * (1 + ((dirX * dy - dirY * dx) / PLANE) / depth);
      if (sx < -60 || sx > W + 60 || zbuf[Math.max(0, Math.min(RW - 1, Math.round(sx * (RW / W))))] < depth - 0.3) continue;
      const top = HOR + (p.eyeZ - L.ceilH) * PROJ / depth, bot = HOR + (p.eyeZ - floorAt(sh.x, sh.y)) * PROJ / depth, wT = 0.35 * PROJ / depth, wB = 0.6 * PROJ / depth;
      const gr = ctx.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, `rgba(${sh.c},0.2)`); gr.addColorStop(0.7, `rgba(${sh.c},0.07)`); gr.addColorStop(1, `rgba(${sh.c},0)`);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(sx - wT, top); ctx.lineTo(sx + wT, top); ctx.lineTo(sx + wB, bot); ctx.lineTo(sx - wB, bot); ctx.closePath(); ctx.fill();
    }
    for (const lp of L.lamps || []) { // the glowing lamp itself
      const dx = lp.x - p.x, dy = lp.y - p.y, depth = dx * dirX + dy * dirY; if (depth < 0.3 || depth > 24) continue;
      const sx = (W / 2) * (1 + ((dirX * dy - dirY * dx) / PLANE) / depth);
      if (sx < -30 || sx > W + 30 || zbuf[Math.max(0, Math.min(RW - 1, Math.round(sx * (RW / W))))] < depth - 0.5) continue;
      const sy = HOR + (p.eyeZ - lp.z) * PROJ / depth, k = lp.pulse ? 0.7 + 0.3 * Math.sin(time * 2.4 + lp.ph) : 1, r = Math.min(70, 0.7 * PROJ / depth);
      ctx.globalAlpha = 0.3 * k; ctx.drawImage(softDot(lp.c), sx - r * 1.8, sy - r * 1.2, r * 3.6, r * 2.4); // light spilling onto the wall
      ctx.globalAlpha = 0.55 * k; ctx.drawImage(softDot(lp.c), sx - r, sy - r, r * 2, r * 2);
      ctx.globalAlpha = 0.95 * k; ctx.drawImage(softDot('255,255,255'), sx - r * 0.14, sy - r * 0.14, r * 0.28, r * 0.28);
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ post effects
  const bloomC = document.createElement('canvas'), bloomX = bloomC.getContext('2d', { willReadFrequently: true }), halfC = document.createElement('canvas'), halfX = halfC.getContext('2d');
  // bloom: the brightest parts of the picture (lamps, fire, explosions) spill a soft glow around them
  function drawBloom(ox, oy) {
    const bw = Math.max(16, Math.round(W / 6)), bh = Math.max(8, Math.round(VIEW_H / 6)); let th = 236; // replaced below by a threshold that follows the scene's brightness
    if (bloomC.width !== bw || bloomC.height !== bh) { bloomC.width = bw; bloomC.height = bh; }
    // shrink in two steps so the small image is a smooth average, not a few sampled pixels
    if (halfC.width !== bw * 3 || halfC.height !== bh * 3) { halfC.width = bw * 3; halfC.height = bh * 3; }
    halfX.imageSmoothingEnabled = true; halfX.imageSmoothingQuality = 'high'; halfX.drawImage(viewC, 0, 0, bw * 3, bh * 3);
    bloomX.globalCompositeOperation = 'copy'; bloomX.imageSmoothingEnabled = true; bloomX.imageSmoothingQuality = 'high'; bloomX.drawImage(halfC, 0, 0, bw, bh);
    const id = bloomX.getImageData(0, 0, bw, bh), d = id.data;
    let avg = 0; for (let i = 0; i < d.length; i += 4) avg += Math.max(d[i], d[i + 1], d[i + 2]); avg /= d.length / 4;
    th = clamp(avg + 95, 205, 250); // bright rooms need a higher bar, or every pale wall would glow
    for (let i = 0; i < d.length; i += 4) {
      const m = Math.max(d[i], d[i + 1], d[i + 2]);
      if (m < th) { d[i] = d[i + 1] = d[i + 2] = 0; } else { let k = (m - th) / (255 - th); k *= k; d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; }
    }
    bloomX.putImageData(id, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 0.85; ctx.drawImage(bloomC, ox - 5, oy - 4, W + 10, VIEW_H + 8);
    ctx.restore();
  }
  // the sky above the walls: a clip path that follows the tops of the walls on screen
  function skyClip() {
    ctx.beginPath(); ctx.moveTo(0, 0);
    for (let x = 0; x <= W; x += 3) { const d = zbuf[Math.min(RW - 1, Math.round(x * (RW / W)))] || 64; ctx.lineTo(x, HOR - (L.ceilH - player.eyeZ) * PROJ / d); }
    ctx.lineTo(W, 0); ctx.closePath(); ctx.clip();
  }
  function makeSkyBolt() {
    const pts = []; let x = rand(W * 0.1, W * 0.9), y = -5;
    while (y < HOR * 0.75) { pts.push([x, y]); x += rand(-14, 14); y += rand(6, 14); }
    pts.push([x, y]); return { pts, branch: pts.slice(irand(2, Math.max(3, pts.length - 3))).map(([bx, by], i) => [bx + i * rand(4, 9), by + i * 2]) };
  }
  const SUN_A = -2.3;
  function drawSkyFx() {
    ctx.save(); skyClip();
    if (L.def.searchlights) { // sweeping searchlights over the park
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) {
        let da = (k * 2.1 + 0.4) - player.a; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
        if (Math.abs(da) > 1.2) continue;
        const bx = W / 2 * (1 + Math.tan(da) / PLANE), by = HOR, tilt = Math.sin(time * 0.45 + k * 2) * 0.55, len = VIEW_H * 1.4;
        const tx = bx + Math.sin(tilt) * len, ty = by - Math.cos(tilt) * len, wdt = 22;
        const gr = ctx.createLinearGradient(bx, by, tx, ty); gr.addColorStop(0, 'rgba(220,230,255,0.28)'); gr.addColorStop(1, 'rgba(220,230,255,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(bx - 2, by); ctx.lineTo(bx + 2, by); ctx.lineTo(tx + Math.cos(tilt) * wdt, ty + Math.sin(tilt) * wdt); ctx.lineTo(tx - Math.cos(tilt) * wdt, ty - Math.sin(tilt) * wdt); ctx.closePath(); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    if (L.def.skyTex === 'night') { ctx.restore(); return; }
    if (L.def.weather === 'rain') {
      if (L.skyBolt && L.flashA > 0.12) {
        ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
        for (const [wdt, col] of [[6, `rgba(150,170,255,${0.35 * L.flashA})`], [1.6, `rgba(255,255,255,${L.flashA})`]]) {
          ctx.strokeStyle = col; ctx.lineWidth = wdt;
          for (const line of [L.skyBolt.pts, L.skyBolt.branch]) { ctx.beginPath(); line.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
        }
      }
      ctx.restore(); return;
    }
    let da = SUN_A - player.a; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
    if (Math.abs(da) < 1.3) {
      const sx = W / 2 * (1 + Math.tan(da) / PLANE), sy = HOR * 0.3;
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 70);
      g.addColorStop(0, 'rgba(255,250,225,0.95)'); g.addColorStop(0.12, 'rgba(255,240,190,0.75)'); g.addColorStop(0.4, 'rgba(255,210,140,0.18)'); g.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = g; ctx.fillRect(sx - 70, sy - 70, 140, 140);
      ctx.restore();
      // lens flare when the sun itself is in view (not behind a wall)
      const d = zbuf[Math.max(0, Math.min(RW - 1, Math.round(sx * (RW / W))))] || 64, top = HOR - (L.ceilH - player.eyeZ) * PROJ / d;
      if (sx > 0 && sx < W && sy < top) {
        const k = 1 - Math.abs(sx - W / 2) / W;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.beginPath(); ctx.rect(0, 0, W, VIEW_H); ctx.clip();
        ctx.fillStyle = `rgba(255,235,200,${0.1 * k})`; ctx.fillRect(0, sy - 0.8, W, 1.6);
        for (const [t, r, c] of [[0.5, 9, '255,180,120'], [1.15, 5, '160,220,255'], [1.5, 14, '200,140,255'], [1.9, 7, '255,230,150']]) {
          const fx = sx + (W / 2 - sx) * t, fy = sy + (HOR - sy) * t, g2 = ctx.createRadialGradient(fx, fy, 0, fx, fy, r);
          g2.addColorStop(0, `rgba(${c},${0.22 * k})`); g2.addColorStop(1, `rgba(${c},0)`); ctx.fillStyle = g2; ctx.fillRect(fx - r, fy - r, r * 2, r * 2);
        }
        ctx.restore();
      }
      return;
    }
    ctx.restore();
  }
  // colour grading, haze on the horizon and fine film grain, done in one pass over the 3D view's pixels
  let gradeRows = null, gradeKey = '';
  const grainTab = Int8Array.from({ length: 8192 }, () => (Math.random() * 12 - 6) | 0);
  function gradePass() {
    const key = RW + '|' + RH + '|' + L.def.name + '|' + FX_HIGH + '|' + Math.round(pitch);
    if (key !== gradeKey) {
      gradeKey = key; const n = RH, mr = new Float32Array(n), mg = new Float32Array(n), mb = new Float32Array(n), ar = new Float32Array(n), ag = new Float32Array(n), ab = new Float32Array(n);
      const [fr, fg, fb] = L.fog, top = L.def.sky ? [1.05, 1.01, 0.94] : [0.96, 0.95, 1.07], bot = [1.06, 0.96, 1.01];
      for (let y = 0; y < n; y++) {
        const t = y / n, h = FX_HIGH ? Math.max(0, 1 - Math.abs(y - (n / 2 + pitch * (RW / W))) / (n * 0.11)) * 0.13 : 0, k = FX_HIGH ? 1 : 0;
        const r = 1 + (top[0] + (bot[0] - top[0]) * t - 1) * k, g = 1 + (top[1] + (bot[1] - top[1]) * t - 1) * k, b = 1 + (top[2] + (bot[2] - top[2]) * t - 1) * k;
        mr[y] = r * (1 - h); mg[y] = g * (1 - h); mb[y] = b * (1 - h); ar[y] = fr * h; ag[y] = fg * h; ab[y] = fb * h;
      }
      gradeRows = { mr, mg, mb, ar, ag, ab };
    }
    const { mr, mg, mb, ar, ag, ab } = gradeRows, off = (Math.random() * 8192) | 0, grain = FX_HIGH;
    for (let y = 0, i = 0; y < RH; y++) {
      const r = mr[y], g = mg[y], b = mb[y], xr = ar[y], xg = ag[y], xb = ab[y];
      for (let x = 0; x < RW; x++, i++) {
        const c = buf[i], nz = grain ? (grainTab[(i + off) & 8191] * (280 - (c & 255))) >> 8 : 0; // less grain on bright pixels
        let R = (c & 255) * r + xr + nz, Gc = (c >> 8 & 255) * g + xg + nz, B = (c >> 16 & 255) * b + xb + nz;
        R = R < 0 ? 0 : R > 255 ? 255 : R; Gc = Gc < 0 ? 0 : Gc > 255 ? 255 : Gc; B = B < 0 ? 0 : B > 255 ? 255 : B;
        buf[i] = 0xff000000 | (B << 16) | (Gc << 8) | R;
      }
    }
  }
  function drawGrade() {
    if (player.health < 30 && !player.dead && state === 'playing') { // near death: colour drains away and the edges pulse red
      const k = (30 - player.health) / 30, beat = 0.5 + 0.5 * Math.sin(time * (6 + k * 4));
      ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = `rgba(128,128,128,${0.75 * k})`; ctx.fillRect(0, 0, W, VIEW_H); ctx.restore();
      const vg = ctx.createRadialGradient(W / 2, HOR, VIEW_H * 0.35, W / 2, HOR, W * 0.6);
      vg.addColorStop(0, 'rgba(120,0,0,0)'); vg.addColorStop(1, `rgba(150,0,10,${(0.25 + 0.3 * beat) * k})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, VIEW_H);
    }
  }
  function drawCombatOverlays() {
    const p = player;
    for (const b of screenBlood) { // blood on the lens, slowly running down
      b.t += 1 / 60; const k = 1 - b.t / b.life; if (k <= 0) continue;
      ctx.fillStyle = `rgba(120,0,12,${0.75 * k})`; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.fillRect(b.x - b.r * 0.2, b.y, b.r * 0.4, b.drip * (1 - k) * 3 + b.r * 0.5);
      ctx.fillStyle = `rgba(255,120,120,${0.25 * k})`; ctx.beginPath(); ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.25, 0, TAU); ctx.fill();
    }
    screenBlood = screenBlood.filter(b => b.t < b.life);
    for (const d of dmgDirs) { // red arcs showing where the hit came from
      let a = Math.atan2(d.y - p.y, d.x - p.x) - p.a - Math.PI / 2;
      const al = (1 - d.t) * 0.85;
      ctx.strokeStyle = `rgba(255,30,40,${al})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(W / 2, CY, 52, a - 0.35, a + 0.35); ctx.stroke();
      ctx.strokeStyle = `rgba(255,160,160,${al * 0.8})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(W / 2, CY, 52, a - 0.3, a + 0.3); ctx.stroke();
    }
    if (announce) { // DOUBLE KILL! and friends
      const t = announce.t, sc = t < 0.15 ? 1.8 - t / 0.15 * 0.8 : 1, al = t > 1.3 ? 1 - (t - 1.3) / 0.5 : 1;
      ctx.save(); ctx.globalAlpha = Math.max(0, al); ctx.translate(W / 2, 62); ctx.scale(sc, sc);
      ctx.font = '22px "Metal Mania", Impact, serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#000'; ctx.fillText(announce.text, 1.5, 1.5); ctx.shadowColor = '#ff2d95'; ctx.shadowBlur = 12; ctx.fillStyle = '#ffcf3a'; ctx.fillText(announce.text, 0, 0);
      ctx.restore();
    }
    if (slowMoT > 0) { ctx.fillStyle = `rgba(255,220,120,${Math.min(0.12, slowMoT * 0.1)})`; ctx.fillRect(0, 0, W, VIEW_H); }
  }

  // ------------------------------------------------------------------ dynamic coloured light
  // Every frame, glowing things (fireballs, explosions, plasma, torches, muzzle flashes, burning
  // monsters, the toxic sludge) add coloured light to the floor tiles around them.
  const LIGHT_OF = {
    skull: [1, 0.55, 0.15], rocket: [1, 0.6, 0.2], flame: [1, 0.5, 0.1], memo: [1, 0.5, 0.15], phone: [1, 0.6, 0.2], sun: [1, 0.85, 0.3],
    stone: [1, 0.55, 0.2], pixel: [0.3, 1, 0.8], complaint: [1, 0.3, 0.3], spot: [1, 1, 0.75], bouquet: [1, 0.5, 0.7], ball: [1, 0.4, 0.3], petals: [1, 0.5, 0.75],
    hex: [0.8, 0.3, 1], gloom: [1, 0.25, 0.85], notif: [0.3, 0.6, 1], chakra: [0.3, 1, 0.95], shout: [1, 1, 0.8],
    boom: [1, 0.55, 0.15], hexHit: [0.8, 0.3, 1], gloomHit: [1, 0.3, 0.9], flameHit: [1, 0.5, 0.1], spark: [1, 0.75, 0.3],
  };
  const GLOW_OF = { gloomOrb: '200,90,255', wings: '255,120,200', rose: '220,30,90', veil: '190,90,255', shroud: '255,255,255', mask: '90,255,140', rage: '255,60,60', keyRed: '255,60,80', keyBlue: '80,140,255', keyGold: '255,210,80', soul: '255,140,230' };
  const glows = [];
  function addLight(x, y, r, g, b, inten, rad) {
    const x0 = Math.max(0, Math.floor(x - rad)), x1 = Math.min(L.mw - 1, Math.floor(x + rad)), y0 = Math.max(0, Math.floor(y - rad)), y1 = Math.min(L.mh - 1, Math.floor(y + rad));
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const d = Math.hypot(tx + 0.5 - x, ty + 0.5 - y); if (d >= rad) continue;
      const w = (1 - d / rad) ** 2 * inten, i = ty * L.mw + tx;
      if (L.grid[i] > 0 && L.grid[i] !== DOOR) continue;
      L.dynR[i] = Math.min(1, L.dynR[i] + r * w); L.dynG[i] = Math.min(1, L.dynG[i] + g * w); L.dynB[i] = Math.min(1, L.dynB[i] + b * w);
    }
  }
  function updateDynLights() {
    if (!L.dynR || L.dynR.length !== L.mw * L.mh) {
      const n = L.mw * L.mh; L.dynR = new Float32Array(n); L.dynG = new Float32Array(n); L.dynB = new Float32Array(n);
      L.slimeGlow = []; for (let i = 0; i < n; i++) if (L.slime[i]) L.slimeGlow.push(i);
    }
    L.dynR.fill(0); L.dynG.fill(0); L.dynB.fill(0);
    const flick = 0.85 + Math.random() * 0.3;
    for (const lp of L.lamps || []) { const k = lp.pulse ? 0.65 + 0.35 * Math.sin(time * 2.4 + lp.ph) : 1; addLight(lp.x, lp.y, lp.rgb[0], lp.rgb[1], lp.rgb[2], 0.42 * k, 2.6); }
    for (const sh of L.shafts || []) addLight(sh.x, sh.y, sh.rgb[0], sh.rgb[1], sh.rgb[2], 0.22, 1.8);
    { // Goffichick's phone torch: comes on by itself in dark places (L cycles auto / on / off)
      const p = player, ti = Math.floor(p.y) * L.mw + Math.floor(p.x);
      if (!p.dead && (torchMode === 'on' || (torchMode === 'auto' && !L.def.sky && (L.light[ti] ?? 1) < 0.8))) for (const k of [1.3, 2.6, 3.9]) addLight(p.x + Math.cos(p.a) * k, p.y + Math.sin(p.a) * k, 1, 0.95, 0.82, 0.3 - k * 0.04, 1.7);
    }
    if (/^E3M[13]/.test(L.def.name)) for (let i = 0; i < 3; i++) { // disco lights sweeping the dance floor and the studio
      const a = time * 0.8 + i * 2.09, c = [[1, 0.2, 0.7], [0.2, 0.6, 1], [1, 0.85, 0.2]][i];
      addLight(player.x + Math.cos(a) * 3.2, player.y + Math.sin(a) * 3.2, c[0], c[1], c[2], 0.55, 2.4);
    }
    for (const i of L.slimeGlow) addLight(i % L.mw + 0.5, ((i / L.mw) | 0) + 0.5, 0.15, 0.6, 0.1, 0.1, 1.3);
    for (const d of L.decor) {
      if (d.def.sprite === 'torch') addLight(d.x, d.y, 0.7, 0.3, 1, 0.26 * flick, 2.4);
      else if (d.def.sprite === 'candelabra') addLight(d.x, d.y, 1, 0.7, 0.35, 0.2 * flick, 2);
    }
    for (const b of L.bolts) for (const q of b.pts.slice(1)) addLight(q[0], q[1], 0.75, 0.45, 1, 0.8, 3);
    for (const pr of L.projs) { const c = LIGHT_OF[pr.kind]; if (c) addLight(pr.x, pr.y, c[0], c[1], c[2], pr.kind === 'gloom' ? 1 : pr.kind === 'flame' ? 0.12 : 0.55, pr.kind === 'gloom' ? 4 : pr.kind === 'flame' ? 2 : 2.6); }
    for (const f of L.fx) { const c = LIGHT_OF[f.kind]; if (!c) continue; const k = 1 - f.t / f.life; addLight(f.x, f.y, c[0], c[1], c[2], (f.kind === 'boom' || f.kind === 'gloomHit' ? 1.3 : f.kind === 'flameHit' ? 0.12 : 0.45) * k, f.kind === 'boom' || f.kind === 'gloomHit' ? 4 : 2); }
    for (const e of L.enemies) if (!e.dead && e.burnT > 0) addLight(e.x, e.y, 1, 0.5, 0.1, 0.6 * flick, 2.5);
    if (player.flashT > 0) { const w = weaponByKey(player.cur), c = w && w.ammo === 'souls' ? [0.8, 0.35, 1] : w && w.key === 'flamethrower' ? [1, 0.5, 0.1] : [1, 0.8, 0.45]; addLight(player.x + Math.cos(player.a) * 0.6, player.y + Math.sin(player.a) * 0.6, c[0], c[1], c[2], w && w.key === 'flamethrower' ? 0.35 : 0.7, 3.2); }
    for (const it of L.items) if (!it.taken && (it.def.power || it.def.key)) { const g = (GLOW_OF[it.def.sprite] || '255,255,255').split(',').map(v => v / 255); addLight(it.x, it.y, g[0], g[1], g[2], 0.18, 1.6); }
  }

  // ------------------------------------------------------------------ texture relief
  // Give every wall and floor texture a little depth: light from the top left catches raised
  // edges and leaves grooves in shadow (an emboss "bump map" baked in once at start-up).
  function enhanceTextures() {
    const bump = (t, k) => {
      if (!t || !t.data || t.data.length !== 4096 || t.bumped) return; t.bumped = true;
      const d = t.data, lum = new Float32Array(4096), out = new Uint32Array(4096);
      for (let i = 0; i < 4096; i++) { const c = d[i]; lum[i] = (c & 255) * 0.3 + (c >> 8 & 255) * 0.59 + (c >> 16 & 255) * 0.11; }
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
        const i = y * 64 + x, a = lum[((y + 63) & 63) * 64 + ((x + 63) & 63)], b = lum[((y + 1) & 63) * 64 + ((x + 1) & 63)];
        const f = clamp(1 + (a - b) / 255 * k, 0.6, 1.4), c = d[i];
        out[i] = (c & 0xff000000) | (Math.min(255, (c >> 16 & 255) * f) << 16) | (Math.min(255, (c >> 8 & 255) * f) << 8) | Math.min(255, (c & 255) * f);
      }
      d.set(out);
    };
    for (const k in Textures.walls) { bump(Textures.walls[k], 1.6); for (const f of Textures.walls[k].frames || []) bump(f, 1.6); }
    for (const k in Textures.flats) if (k !== 'sky' && k !== 'slimeFrames' && k !== 'slime') bump(Textures.flats[k], 1.1);
  }
  enhanceTextures();
  const mixC = (c, d) => { const a = (d >>> 24) / 255, ia = 1 - a; return 0xff000000 | (((c >> 16 & 255) * ia + (d >> 16 & 255) * a) << 16) | (((c >> 8 & 255) * ia + (d >> 8 & 255) * a) << 8) | ((c & 255) * ia + (d & 255) * a); };

  // ------------------------------------------------------------------ rendering
  function render3D() {
    const RQ = RW / W, RHOR = RH / 2 + pitch * RQ, RPROJ = PROJ * RQ, SKYH = Math.min(RH, Math.ceil(RHOR));
    const p = player, dirX = Math.cos(p.a), dirY = Math.sin(p.a);
    const dR = L.dynR, dG = L.dynG, dB = L.dynB; // coloured light added by fire, explosions, torches...
    glows.length = 0;
    const plX = -dirY * PLANE, plY = dirX * PLANE;
    const eyeZ = p.eyeZ;
    const [fr, fg, fb] = L.fog;
    const boost = lightBoost;
    const walls = Textures.walls;
    const mw = L.mw;
    const aoOn = FX_HIGH && fxDrop < 2, wmask = L.wmask, reflOn = FX_HIGH && fxDrop < 2 && L.shiny;
    // soft shadow where a floor or ceiling meets a wall
    const aoAt = (m, lx, ly) => { let d = 1; if (m & 1 && lx < d) d = lx; if (m & 2 && 1 - lx < d) d = 1 - lx; if (m & 4 && ly < d) d = ly; if (m & 8 && 1 - ly < d) d = 1 - ly; return d < 0.32 ? 0.58 + d * 1.31 : 1; };

    // --- ceiling: one height per level, drawn row by row above the horizon
    const r0x = dirX - plX, r0y = dirY - plY, r1x = dirX + plX, r1y = dirY + plY;
    const floorT = L.floor, ceilT = L.ceil, mh = L.mh, fhm = L.fh, grid = L.grid, ceilH = L.ceilH;
    const lightNow = L.lightNow, slimeMap = L.slime, slimeT = Textures.flats.slimeFrames[((time * 5) | 0) % 4].data, slimeShift = (time * 6) | 0;
    if (L.def.sky) { // outdoor: a panoramic sky that turns with you instead of a ceiling
      const sky = L.def.skyTex === 'night' ? Textures.skyNight : Textures.sky, SW = sky.w, SH = sky.h, drift = L.def.skyDrift ? time * 4 : 0;
      for (let x = 0; x < RW; x++) {
        const ang = p.a + Math.atan((2 * x / RW - 1) * PLANE);
        const u = ((((ang / TAU) * SW * 2 + drift) % SW) + SW) % SW | 0;
        for (let y = 0, o = x; y < SKYH; y++, o += RW) buf[o] = sky.data[Math.max(0, Math.min(SH - 1, (((y - RHOR) / (RH / 2) + 1) * SH) | 0)) * SW + u];
      }
    }
    else for (let y = 0; y < SKYH; y++) {
      const rowDist = (ceilH - eyeZ) * RPROJ / (RHOR - y - 0.5);
      const s = clamp(1.3 - rowDist * 0.05 + boost, 0.25, 1) * 0.92;
      const stepX = rowDist * (r1x - r0x) / RW, stepY = rowDist * (r1y - r0y) / RW;
      let fx = p.x + rowDist * r0x, fy = p.y + rowDist * r0y, o = y * RW;
      for (let x = 0; x < RW; x++, o++) {
        const cx = fx | 0, cy = fy | 0;
        const inside = cx >= 0 && cy >= 0 && cx < mw && cy < mh, ci = cy * mw + cx;
        let ls = inside ? lightNow[ci] : 1;
        if (aoOn && inside) { const m = wmask[ci]; if (m) ls *= aoAt(m, fx - cx, fy - cy); }
        const c = ceilT[((fy * 64) & 63) * 64 + ((fx * 64) & 63)];
        fx += stepX; fy += stepY;
        if (inside && dR[ci] + dG[ci] + dB[ci] > 0.02) putA(o, c, s * ls, dR[ci] * 75, dG[ci] * 75, dB[ci] * 75);
        else { const q = s * ls, iq = 1 - q; buf[o] = 0xff000000 | (((c >> 16 & 255) * q + fb * iq) << 16) | (((c >> 8 & 255) * q + fg * iq) << 8) | ((c & 255) * q + fr * iq); }
      }
    }
    // shade one pixel with extra coloured light added (aR/aG/aB 0..255)
    function putA(o, c, q, aR, aG, aB) {
      const iq = 1 - q;
      let r = (c & 255) * q + fr * iq + aR * (0.35 + 0.65 * ((c & 255) / 255)), g = (c >> 8 & 255) * q + fg * iq + aG * (0.35 + 0.65 * ((c >> 8 & 255) / 255)), b = (c >> 16 & 255) * q + fb * iq + aB * (0.35 + 0.65 * ((c >> 16 & 255) / 255));
      if (r > 255) r = 255; if (g > 255) g = 255; if (b > 255) b = 255;
      buf[o] = 0xff000000 | (b << 16) | (g << 8) | r;
    }
    // shade one pixel: texture colour c, brightness q (0..1), blended toward the level's fog
    const put = (o, c, q) => { const iq = 1 - q; buf[o] = 0xff000000 | (((c >> 16 & 255) * q + fb * iq) << 16) | (((c >> 8 & 255) * q + fg * iq) << 8) | ((c & 255) * q + fr * iq); };
    // floor of one tile between two distances along this column's ray; returns the new clip line
    function floorSpan(x, rdx, rdy, idx, h, dNear, dFar, clip) {
      const e = eyeZ - h; if (e <= 0.001) return clip;
      const yA = Math.max(Math.ceil(RHOR + e * RPROJ / dFar), Math.floor(RHOR) + 1);
      const yB = Math.min(dNear < 0.02 ? RH : Math.ceil(RHOR + e * RPROJ / dNear), clip);
      const isSlime = slimeMap[idx], tex = isSlime ? slimeT : floorT, ls = isSlime ? Math.max(lightNow[idx], 0.9) : lightNow[idx];
      const aR = dR[idx] * 115, aG = dG[idx] * 115, aB = dB[idx] * 115, lit = aR + aG + aB > 3;
      const dec = L.fdec.size ? L.fdec.get(idx) : undefined, m = aoOn ? wmask[idx] : 0, tx0 = idx % mw, ty0 = (idx / mw) | 0;
      for (let y = yA, o = yA * RW + x; y < yB; y++, o += RW) {
        const rowDist = e * RPROJ / (y + 0.5 - RHOR);
        const wx = p.x + rdx * rowDist, wy = p.y + rdy * rowDist;
        let c = tex[((wy * 64) & 63) * 64 + ((wx * 64 + (isSlime ? slimeShift : 0)) & 63)], q = clamp(1.3 - rowDist * 0.05 + boost, 0.25, 1) * ls;
        if (dec) { const dd = dec[((wy * 64) & 63) * 64 + ((wx * 64) & 63)]; if (dd) c = mixC(c, dd); }
        if (m) q *= aoAt(m, wx - tx0, wy - ty0);
        if (lit) putA(o, c, q, aR, aG, aB); else put(o, c, q);
      }
      return Math.min(clip, yA);
    }
    // a vertical surface (wall or the front of a raised floor) from height zLo to zHi at distance d
    function vSpan(x, d, zLo, zHi, texId, u, side, lightIdx, clip, glow, dec) {
      const yTopF = RHOR - (zHi - eyeZ) * RPROJ / d;
      const y0 = Math.max(0, Math.ceil(yTopF)), y1 = Math.min(clip, Math.ceil(RHOR + (eyeZ - zLo) * RPROJ / d));
      if (y0 >= y1) return Math.min(clip, Math.max(0, y0));
      const wt = walls[texId] || walls[1], tex = wt.frames ? wt.frames[((time * (wt.fps || 4)) | 0) % wt.frames.length].data : wt.data, tx = Math.min(63, (u * 64) | 0), ttx = 63 - tx; // ttx: texture column the right way round
      let q = clamp(1.3 - d * 0.05 + boost, 0.25, 1) * (side ? 0.86 : 1) * (lightIdx >= 0 ? lightNow[lightIdx] : 1);
      if (glow) q = Math.max(q, 0.85);
      const vStep = d / RPROJ * 64; let v = (zHi - eyeZ + (y0 + 0.5 - RHOR) * d / RPROJ) * 64 + (ceilH - zHi) * 64;
      const aR = lightIdx >= 0 ? dR[lightIdx] * 115 : 0, aG = lightIdx >= 0 ? dG[lightIdx] * 115 : 0, aB = lightIdx >= 0 ? dB[lightIdx] * 115 : 0;
      const lit = aR + aG + aB > 3, ao = aoOn && d < 16, zpp = d / RPROJ, full = zHi >= ceilH - 0.001;
      if (!ao && !dec) {
        if (lit) { for (let y = y0, o = y0 * RW + x; y < y1; y++, o += RW, v += vStep) putA(o, tex[((v | 0) & 63) * 64 + ttx], q, aR, aG, aB); }
        else for (let y = y0, o = y0 * RW + x; y < y1; y++, o += RW, v += vStep) put(o, tex[((v | 0) & 63) * 64 + ttx], q);
        return Math.min(clip, y0);
      }
      for (let y = y0, o = y0 * RW + x; y < y1; y++, o += RW, v += vStep) {
        const vi = v | 0;
        let c = tex[(vi & 63) * 64 + ttx], qq = q;
        if (dec && vi >= 0 && vi < 192) { const dd = dec[vi * 64 + tx]; if (dd) c = mixC(c, dd); }
        if (ao) { const z = zHi - (y + 0.5 - yTopF) * zpp, b = z - zLo, t = zHi - z; if (b < 0.28) qq *= 0.6 + b * 1.43; else if (full && t < 0.22) qq *= 0.74 + t * 1.18; }
        if (lit) putA(o, c, qq, aR, aG, aB); else put(o, c, qq);
      }
      return Math.min(clip, y0);
    }
    const occlude = (x, d, y) => { const n = occN[x]; if (n < OCC) { occD[x * OCC + n] = d; occY[x * OCC + n] = y; occN[x] = n + 1; } };

    // --- floors, ledges and walls: walk each column's ray front to back, drawing as it goes
    const startX = Math.floor(p.x), startY = Math.floor(p.y);
    for (let x = 0; x < RW; x++) {
      const cam = 2 * x / RW - 1, rdx = dirX + plX * cam, rdy = dirY + plY * cam;
      let mx = startX, my = startY;
      const ddx = rdx === 0 ? 1e30 : Math.abs(1 / rdx), ddy = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
      let stepX, stepY, sdx, sdy, side = 0;
      if (rdx < 0) { stepX = -1; sdx = (p.x - mx) * ddx; } else { stepX = 1; sdx = (mx + 1 - p.x) * ddx; }
      if (rdy < 0) { stepY = -1; sdy = (p.y - my) * ddy; } else { stepY = 1; sdy = (my + 1 - p.y) * ddy; }
      let curIdx = my * mw + mx, curH = fhm[curIdx] || 0, dNear = 0.01, clip = RH, wallD = 64, prevDoor = false;
      occN[x] = 0; wallBot[x] = -1;
      for (let i = 0; i < 160 && clip > 0; i++) {
        let d;
        if (sdx < sdy) { d = sdx; sdx += ddx; mx += stepX; side = 0; } else { d = sdy; sdy += ddy; my += stepY; side = 1; }
        clip = floorSpan(x, rdx, rdy, curIdx, curH, dNear, d, clip);
        if (mx < 0 || my < 0 || mx >= mw || my >= mh) { wallD = d; break; }
        const idx = my * mw + mx, t = grid[idx];
        let u = side === 0 ? p.y + d * rdy : p.x + d * rdx; u -= Math.floor(u);
        if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) u = 1 - u;
        if (t === DOOR) {
          const dr = L.doors.get(idx);
          let tt, du = -1, dside = 0;
          if (dr.vertical) { tt = (mx + 0.5 - p.x) / rdx; const hy = p.y + tt * rdy; if (Math.floor(hy) === my) du = hy - my; dside = 0; }
          else { tt = (my + 0.5 - p.y) / rdy; const hx = p.x + tt * rdx; if (Math.floor(hx) === mx) du = hx - mx; dside = 1; }
          const dh = fhm[idx];
          if (dh > curH + 0.001) clip = vSpan(x, d, curH, dh, L.stepTex, u, side, idx, clip);
          if (dh !== curH) occlude(x, d, clip);
          if (tt > d && du >= dr.open) { // the door panel itself
            clip = floorSpan(x, rdx, rdy, idx, dh, d, tt, clip);
            vSpan(x, tt, dh, ceilH, dr.tex, du - dr.open, dside, curIdx, clip); L.seen[idx] = 1; wallD = tt; break;
          }
          curIdx = idx; curH = dh; dNear = d; prevDoor = !dr.secret; continue;
        }
        if (t > 0) { // solid wall (with any bullet holes or blood on this face)
          const dec = L.wdec.size ? L.wdec.get(idx * 4 + (side === 0 ? (rdx > 0 ? 0 : 1) : (rdy > 0 ? 2 : 3))) : undefined;
          vSpan(x, d, curH, ceilH, prevDoor ? 10 : t, u, side, curIdx, clip, t === 7 || t === 11, dec);
          if (reflOn && occN[x] === 0 && curH === 0) { const yb = Math.ceil(RHOR + eyeZ * RPROJ / d); if (yb < clip) { wallBot[x] = yb; wallTop[x] = Math.max(0, Math.ceil(RHOR - (ceilH - eyeZ) * RPROJ / d)); } }
          L.seen[idx] = 1; wallD = d; break;
        }
        prevDoor = false;
        const nh = fhm[idx];
        if (nh > curH + 0.001) clip = vSpan(x, d, curH, nh, L.liftTile[idx] ? 10 : L.stepTex, u, side, idx, clip); // step / ledge front
        if (nh !== curH) occlude(x, d, clip);
        curIdx = idx; curH = nh; dNear = d;
      }
      zbuf[x] = wallD;
    }

    // --- polished floors mirror the walls standing on them
    if (reflOn) for (let x = 0; x < RW; x++) {
      const b = wallBot[x]; if (b < 0) continue;
      const len = Math.min(RH - b, ((b - wallTop[x]) * 0.45) | 0);
      for (let k = 0; k < len; k++) {
        const sy = b - 1 - k; if (sy < wallTop[x]) break;
        const o = (b + k) * RW + x, a = 0.3 * (1 - k / len), ia = 1 - a, c = buf[o], m = buf[sy * RW + x];
        buf[o] = 0xff000000 | (((c >> 16 & 255) * ia + (m >> 16 & 255) * a) << 16) | (((c >> 8 & 255) * ia + (m >> 8 & 255) * a) << 8) | ((c & 255) * ia + (m & 255) * a);
      }
    }
    // --- soft round shadows under monsters, items and decorations
    if (FX_HIGH && fxDrop < 3) {
      const blob = (wx, wy, r, fz, k) => {
        const dx = wx - p.x, dy = wy - p.y, depth = dx * dirX + dy * dirY; if (depth < 0.3) return;
        const e = eyeZ - fz; if (e <= 0.02) return;
        const sx = (RW / 2) * (1 + ((dirX * dy - dirY * dx) / PLANE) / depth), cy = RHOR + e * RPROJ / depth, rx = r * RPROJ / depth, ry = Math.max(1, rx * Math.min(0.6, e / depth));
        const x0 = Math.max(0, Math.floor(sx - rx)), x1 = Math.min(RW - 1, Math.ceil(sx + rx)), y0 = Math.max(0, Math.floor(cy - ry)), y1 = Math.min(RH - 1, Math.ceil(cy + ry));
        for (let x = x0; x <= x1; x++) {
          if (zbuf[x] < depth) continue;
          const ux = (x - sx) / rx, ux2 = ux * ux; if (ux2 >= 1) continue;
          for (let y = y0, o = y0 * RW + x; y <= y1; y++, o += RW) {
            const uy = (y - cy) / ry, t = ux2 + uy * uy; if (t >= 1) continue;
            const f = 1 - k * (1 - t), c = buf[o];
            buf[o] = 0xff000000 | (((c >> 16 & 255) * f) << 16) | (((c >> 8 & 255) * f) << 8) | ((c & 255) * f);
          }
        }
      };
      for (const e of bodies()) if (!e.dead || e.type === 'barrel') { if (e.dead) continue; const fl = floorAt(e.x, e.y); blob(e.x, e.y, e.def.radius * 1.15, fl, e.z > 0.2 || e.def.fly ? 0.25 : 0.5); }
      for (const it of L.items) if (!it.taken) blob(it.x, it.y, 0.17, floorAt(it.x, it.y), 0.4);
      for (const d of L.decor) if (d.def.block) blob(d.x, d.y, 0.26, floorAt(d.x, d.y), 0.45);
    }

    // --- sprites
    const list = [];
    const add = (x, y, spr, z, h, bright, wscale, minDepth = 0.15, glow = null, flash = 0, cut = 0) => {
      const dx = x - p.x, dy = y - p.y;
      const depth = dx * dirX + dy * dirY;
      if (depth < minDepth) return;
      const li = (y | 0) * mw + (x | 0);
      list.push({ dx, dy, depth, spr, z, h, bright, wscale: wscale || 1, light: L.lightNow[li] ?? 1, li, glow, flash, cut });
    };
    for (const d of L.decor) add(d.x, d.y, S.decor[d.def.sprite], floorAt(d.x, d.y), d.def.h, d.def.bright, 1, 0.15, d.def.sprite === 'torch' ? '200,90,255' : d.def.sprite === 'candelabra' ? '255,190,90' : null);
    for (const it of L.items) if (!it.taken) {
      const spr = S.item[it.def.sprite];
      const bob = it.def.power || it.def.key ? 0.04 + Math.sin(time * 3 + it.x) * 0.03 : 0;
      const gl = it.def.power || it.def.key || it.def.sprite === 'soul' ? (GLOW_OF[it.def.sprite] || '255,140,230') : null;
      add(it.x, it.y, spr, floorAt(it.x, it.y) + bob, spr.h / 72, it.def.sprite === 'soul' || it.def.sprite === 'souls' || !!it.def.power || !!it.def.key, 1, 0.15, gl);
    }
    for (const e of bodies()) {
      const spr = enemySprite(e);
      const h = e.dead && e.def.ai !== false ? e.def.h * (spr.h / (enemyBase(e).h)) : e.def.h;
      const a = animOf(e, dirX, dirY);
      add(e.x + a.ox, e.y + a.oy, spr, (e.fz || 0) + (e.dead ? 0 : e.z) + a.z, h * a.hs, false, a.ws, 0.15, e.champ && !e.dead ? '255,190,60' : e.buffT > 0 && !e.dead ? '255,220,120' : null, a.flash, e.dead ? 0 : e.cut || 0);
    }
    for (const pr of L.projs) {
      const fr = pr.frames, size = pr.def.grow ? pr.def.size * (1 + pr.age * pr.def.grow) : pr.def.size;
      const lc = LIGHT_OF[pr.kind];
      add(pr.x, pr.y, fr[((time * 12 + pr.x * 7) | 0) % fr.length], pr.z - size / 2, size, true, 1, 0.5, lc ? lc.map(v => Math.round(v * 255)).join(',') : null);
    }
    for (const f of L.fx) { const lc = LIGHT_OF[f.kind]; add(f.x, f.y, f.frames[Math.min(f.frames.length - 1, (f.t / f.life * f.frames.length) | 0)], f.z - f.size / 2, f.size, true, 1, 0.6, lc && f.t / f.life < 0.7 ? lc.map(v => Math.round(v * 255)).join(',') : null); }
    for (const q of L.parts) add(q.x, q.y, q.spr, q.z - q.size / 2, q.size, q.bright, 1, 0.75); // not right in front of the camera
    list.sort((a, b) => b.depth - a.depth);

    for (const sp of list) {
      const spr = sp.spr; if (!spr) continue;
      const tX = (dirX * sp.dy - dirY * sp.dx) / PLANE;
      const depth = sp.depth;
      const sx = (RW / 2) * (1 + tX / depth);
      const hPx = sp.h * RPROJ / depth;
      const wPx = hPx * spr.w / spr.h * sp.wscale;
      const bottom = RHOR + (eyeZ - sp.z) * RPROJ / depth;
      const top = bottom - hPx;
      const x0 = Math.max(0, Math.ceil(sx - wPx / 2)), x1 = Math.min(RW, Math.ceil(sx + wPx / 2));
      if (x0 >= x1) continue;
      const y0 = Math.max(0, Math.ceil(top)), y1 = Math.min(RH, Math.ceil(bottom));
      if (y0 >= y1) continue;
      let s = sp.bright ? 1 : clamp(1.3 - depth * 0.05 + boost, 0.3, 1) * sp.light;
      const fl = sp.flash ? sp.flash * 170 : 0; // a white flash when hit
      const is = 1 - s, ar = fr * is + (sp.bright ? 0 : (dR[sp.li] || 0) * 90) + fl, ag = fg * is + (sp.bright ? 0 : (dG[sp.li] || 0) * 90) + fl, ab = fb * is + (sp.bright ? 0 : (dB[sp.li] || 0) * 90) + fl;
      if (sp.glow && zbuf[Math.max(0, Math.min(RW - 1, sx | 0))] >= depth) {
        // decorations glow from their flame at the top; everything else from its middle. Halos are capped
        // so standing right next to a torch doesn't wash the whole screen.
        const tall = sp.h > 0.5, cy = tall ? top + hPx * 0.1 : top + hPx / 2;
        const r = Math.min(tall ? 34 : 60, (tall ? hPx * 0.35 : hPx * 1.2) / (RW / W));
        glows.push({ x: sx / (RW / W), y: cy / (RW / W), r: Math.max(5, r), c: sp.glow, a: Math.min(tall ? 0.3 : 0.42, 1.6 / depth) });
      }
      const data = spr.data, sw = spr.w, sh = spr.h;
      const uStep = sw / wPx, vStep = sh / hPx;
      const left = sx - wPx / 2;
      for (let x = x0; x < x1; x++) {
        if (zbuf[x] < depth) continue;
        const u = ((x - left) * uStep) | 0;
        if (u < 0 || u >= sw) continue;
        let yEnd = y1; // a nearer ledge hides the lower part of the sprite
        for (let k = 0, n = occN[x]; k < n; k++) if (occD[x * OCC + k] < depth && occY[x * OCC + k] < yEnd) yEnd = occY[x * OCC + k];
        let v = (y0 - top) * vStep;
        let o = y0 * RW + x;
        const cut = sp.cut, uf = u / sw;
        for (let y = y0; y < yEnd; y++, o += RW, v += vStep) {
          let c = data[(v | 0) * sw + u];
          if (c === 0) continue;
          if (cut) { // missing head / arms / legs, with a bloody stump at the edge
            const vf = v / sh;
            const zb = vf < 0.24 ? 1 : vf > 0.6 ? (uf < 0.5 ? 8 : 16) : uf < 0.3 ? 2 : uf > 0.7 ? 4 : 0;
            if (cut & zb) continue;
            if ((cut & 1 && vf < 0.28) || (cut & (uf < 0.5 ? 8 : 16) && vf > 0.56) || (cut & 2 && uf < 0.34 && vf > 0.24 && vf < 0.6) || (cut & 4 && uf > 0.66 && vf > 0.24 && vf < 0.6)) c = (v | 0) % 3 ? 0xff1010a0 : 0xff0a0a70;
          }
          let r = (c & 255) * s + ar, g = (c >> 8 & 255) * s + ag, bl = (c >> 16 & 255) * s + ab;
          if (r > 255) r = 255; if (g > 255) g = 255; if (bl > 255) bl = 255;
          buf[o] = 0xff000000 | (bl << 16) | (g << 8) | r;
        }
      }
    }
  }

  // Procedural animation on top of the drawn frames: every monster bobs and sways as it walks, breathes
  // when idle, hovers if it flies, winds up and lunges to attack, flinches and flashes when hit, and
  // drops with a little bounce when it dies.
  const ANIM0 = { ox: 0, oy: 0, z: 0, hs: 1, ws: 1, flash: 0 };
  function animOf(e, dirX, dirY) {
    if (e.type === 'barrel' || e.state === 'static' && !e.remote) {
      if (e.type === 'barrel' || e.dead) return ANIM0;
    }
    const seed = e.seed ?? (e.seed = Math.random() * 10), d = e.def;
    // how fast it is actually moving (works for monsters, puppets in co-op and other players)
    const dtR = Math.max(0.001, time - (e.lt ?? time - 0.016));
    const sp = Math.hypot(e.x - (e.lx ?? e.x), e.y - (e.ly ?? e.y)) / dtR;
    e.lx = e.x; e.ly = e.y; e.lt = time;
    e.mv = (e.mv || 0) + (Math.min(1, sp / (d.speed || 1.5)) - (e.mv || 0)) * 0.25;
    const o = { ox: 0, oy: 0, z: 0, hs: 1, ws: 1, flash: e.hitT > 0 ? Math.min(1, e.hitT / 0.12) : 0 };
    const rx = -dirY, ry = dirX; // camera's right-hand side
    if (e.dead) {
      if (e.deadAt === undefined) e.deadAt = time;
      const age = time - e.deadAt;
      if (age < 0.45) { o.z = Math.sin(age / 0.45 * Math.PI) * 0.1; o.ws = 1 + age * 0.3; }
      return o;
    }
    e.deadAt = undefined;
    const ph = time * (4 + (d.speed || 1.5) * 2.2) + seed, mv = e.mv;
    if ((e.cut & 24) === 24) o.z -= d.h * 0.4;                                   // no legs: dragging itself along
    else if (e.cut & 24) { o.z += Math.abs(Math.sin(ph * 0.6)) * 0.17 * Math.max(mv, 0.35); return o; } // one leg: hop, hop, hop
    if (d.fly) { o.z += Math.sin(time * 2.6 + seed) * 0.05; const p2 = Math.sin(time * 5 + seed); o.hs = 1 + p2 * 0.03; o.ws = 1 - p2 * 0.03; }
    if (mv > 0.05 && !d.fly) { // walking: bounce on each step, sway side to side, squash on landing
      const st = Math.sin(ph);
      o.z += Math.abs(st) * 0.045 * mv * Math.min(1.4, d.h);
      const sway = Math.sin(ph * 0.5) * 0.035 * mv; o.ox += rx * sway; o.oy += ry * sway;
      o.hs *= 1 - 0.05 * mv * (1 - Math.abs(st)); o.ws *= 1 + 0.04 * mv * (1 - Math.abs(st));
    } else if (!d.fly) { const br = Math.sin(time * 2.2 + seed); o.hs *= 1 + br * 0.018; o.ws *= 1 - br * 0.012; } // breathing
    if (e.state === 'attack') { // wind up (crouch), then spring up and lunge forward
      const t = e.t ?? 0;
      if (!e.fired) { o.hs *= 0.93; o.ws *= 1.07; }
      else { const k = Math.max(0, t / 0.22); o.hs *= 1 + 0.08 * k; o.ws *= 1 - 0.04 * k; const lx = player.x - e.x, ly = player.y - e.y, l = Math.hypot(lx, ly) || 1; o.ox += lx / l * 0.12 * k; o.oy += ly / l * 0.12 * k; }
    }
    if (e.state === 'pain') { const j = (Math.random() - 0.5) * 0.06; o.ox += rx * j; o.oy += ry * j; o.hs *= 0.96; }
    if (e.state === 'attack-charge') { o.ws *= 0.9; o.hs *= 1.1; }
    if (e.type === 'wallyexe') { if (e.glitchT > 0) e.glitchT -= 1 / 60; if (e.glitchT > 0 || Math.random() < 0.04) { const j = (Math.random() - 0.5) * 0.4; o.ox += rx * j; o.oy += ry * j; o.ws *= 1 + (Math.random() - 0.5) * 0.3; o.flash = Math.max(o.flash, 0.4); } }
    if (d.boss && mv > 0.2 && Math.abs(Math.sin(ph)) < 0.08 && Math.hypot(e.x - player.x, e.y - player.y) < 9) shake = Math.max(shake, 0.8); // the ground shakes when a boss stomps
    return o;
  }
  function enemyBase(e) { return S.enemy[e.type] ? S.enemy[e.type].walk[0] : S.decor.barrel; }
  function enemySprite(e) {
    if (e.type === 'barrel') return e.dead ? null : S.decor.barrel;
    const set = S.enemy[e.type];
    if (e.dead) return set.die[Math.min(set.die.length - 1, e.frame)];
    if (e.state === 'pain') return set.pain[0];
    if (e.state === 'attack') return set.attack[e.fired ? set.attack.length - 1 : 0];
    if (e.state === 'idle') return set.idle ? set.idle[((e.animT * 2.5) | 0) % set.idle.length] : set.walk[0];
    const n = set.walk.length, f = (e.animT * (set.walkFps || 4) * (n === 3 ? 1.6 : 1)) | 0;
    return set.walk[n === 3 ? [0, 1, 2, 1][f % 4] : f % n];
  }

  // ------------------------------------------------------------------ weapon + HUD drawing
  const weaponC = document.createElement('canvas'), weaponCtx = weaponC.getContext('2d');
  function drawWeapon() {
    const p = player;
    const w = weaponByKey(p.cur);
    if (!w || p.dead) return;
    // draw the gun on its own layer, then shade it with the light where Goffichick stands
    if (weaponC.width !== W * RES || weaponC.height !== VIEW_H * RES) { weaponC.width = W * RES; weaponC.height = VIEW_H * RES; }
    const main = ctx; ctx = weaponCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, weaponC.width, weaponC.height); ctx.setTransform(RES, 0, 0, RES, 0, 0);
    try { drawWeaponLayer(p, w); } finally { ctx = main; }
    const ti = Math.floor(p.y) * L.mw + Math.floor(p.x), lt = Math.min(1, (L.lightNow[ti] ?? 1) + lightBoost);
    const dr = L.dynR ? L.dynR[ti] : 0, dg = L.dynG ? L.dynG[ti] : 0, db = L.dynB ? L.dynB[ti] : 0;
    weaponCtx.setTransform(1, 0, 0, 1, 0, 0); weaponCtx.globalCompositeOperation = 'source-atop';
    if (lt < 0.98) { weaponCtx.fillStyle = `rgba(8,4,14,${(1 - lt) * 0.75})`; weaponCtx.fillRect(0, 0, weaponC.width, weaponC.height); }
    const dsum = dr + dg + db;
    if (dsum > 0.05) { const m = Math.max(dr, dg, db); weaponCtx.fillStyle = `rgba(${(dr / m * 255) | 0},${(dg / m * 255) | 0},${(db / m * 255) | 0},${Math.min(0.18, dsum * 0.07)})`; weaponCtx.fillRect(0, 0, weaponC.width, weaponC.height); }
    weaponCtx.globalCompositeOperation = 'source-over';
    main.save();
    if (p.pw.veil > 0 && (p.pw.veil > 3 || Math.sin(time * 18) > 0)) main.globalAlpha = 0.35;
    main.drawImage(weaponC, 0, 0, W, VIEW_H);
    main.restore();
  }
  function drawWeaponLayer(p, w) {
    const bobX = Math.cos(p.bobT) * 7 * p.move, bobY = Math.abs(Math.sin(p.bobT)) * 7 * p.move;
    const lower = p.switchT > 0 ? (p.next ? (0.25 - p.switchT) / 0.25 : p.switchT / 0.25) * 120 : 0;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, VIEW_H); ctx.clip();
    // weapons are authored at 1x and drawn scaled up around the bottom-centre of the view
    const sway = (p.swayX || 0) + Math.sin(time * 1.3) * 1.2, dip = (p.landT > 0 ? Math.sin(p.landT / 0.3 * Math.PI) * 9 : 0) + Math.sin(time * 1.7) * 1.1;
    ctx.translate(W / 2 + bobX + sway, VIEW_H + 10 + bobY + lower + dip - pitch * 0.12); ctx.rotate(sway * 0.004); ctx.scale(0.8, 0.8 * (1 + pitch * 0.0012));
    w.draw(ctx, 0, 0, p.firePhase, p.flashT > 0, time);
    ctx.restore();
  }

  function digits(n, x, y, size, color = '#e0115f', align = 'center') {
    ctx.font = `${size}px "Metal Mania", Impact, "Arial Black", sans-serif`;
    ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#000'; ctx.fillText(n, x + 1, y + 1);
    ctx.fillStyle = color; ctx.fillText(n, x, y);
  }
  function label(t, x, y, color = '#c9a6c9', align = 'center', size = 7) {
    ctx.font = `bold ${size}px monospace`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color; ctx.fillText(t, x, y);
  }

  let hudBg = null;
  function buildHudBg() {
    const c = document.createElement('canvas'); c.width = W; c.height = HUD_H;
    const hx = (W - BASE_W) / 2;
    const g = c.getContext('2d');
    for (let x = 0; x < W; x += 64) g.drawImage(Textures.walls[2].canvas, 0, 0, 64, 48, x, 0, 64, 48);
    g.fillStyle = 'rgba(10,4,14,0.55)'; g.fillRect(0, 0, W, HUD_H);
    g.fillStyle = '#ff3fa8'; g.fillRect(0, 0, W, 1);
    g.fillStyle = '#000'; g.fillRect(0, 1, W, 1);
    const sections = [0, 70, 150, 214, 266, 346, BASE_W].map(v => v + hx);
    for (let i = 0; i < sections.length - 1; i++) {
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(sections[i] + 2, 4, sections[i + 1] - sections[i] - 4, HUD_H - 7);
      g.strokeStyle = '#5c2a5c'; g.strokeRect(sections[i] + 2.5, 4.5, sections[i + 1] - sections[i] - 5, HUD_H - 8);
    }
    hudBg = c;
  }

  function faceCanvas() {
    const p = player;
    if (p.dead) return faces.dead;
    const tier = p.health >= 80 ? 0 : p.health >= 60 ? 1 : p.health >= 40 ? 2 : p.health >= 20 ? 3 : 4;
    if (p.painT > 0) return faces.pain[tier];
    if (p.grinT > 0) return faces.grin;
    if (god) return faces.god;
    return faces.look[p.faceLook][tier];
  }

  function drawHUD() {
    const p = player, y0 = VIEW_H;
    ctx.imageSmoothingEnabled = false; ctx.drawImage(hudBg, 0, y0); ctx.imageSmoothingEnabled = true;
    ctx.save(); ctx.translate((W - BASE_W) / 2, 0);
    const w = weaponByKey(p.cur);
    digits(w && w.ammo ? p.ammo[w.ammo] : '--', 36, y0 + 33, 24);
    label('AMMO', 36, y0 + 43);
    digits(Math.max(0, Math.ceil(p.health)) + '%', 110, y0 + 33, 24);
    label('HEALTH', 110, y0 + 43);
    // arms
    for (let i = 0; i < 8; i++) {
      const slot = i + 2, has = WEAPONS.some(wp => wp.slot === slot && p.weapons[wp.key]);
      const cur = w && w.slot === slot;
      label(String(slot), 161 + (i % 4) * 14, y0 + 17 + Math.floor(i / 4) * 14, cur ? '#ffffff' : has ? '#ff4fb8' : '#4a3a4a', 'center', 11);
    }
    label('ARMS', 182, y0 + 43);
    // face
    const f = faceCanvas();
    if (p.pw.veil > 0) ctx.globalAlpha = 0.45;
    ctx.drawImage(f, 0, 0, f.width, f.height, 217, y0 + 3, 46, HUD_H - 5);
    ctx.globalAlpha = 1;
    Object.keys(KEYS).forEach((k, i) => { // collected keys
      const ky = y0 + 9 + i * 12, kx = 337;
      if (!p.keys[k]) { ctx.strokeStyle = '#3a2a3a'; ctx.strokeRect(kx - 3.5, ky - 3.5, 7, 9); return; }
      ctx.fillStyle = KEYS[k].color; ctx.beginPath(); ctx.arc(kx, ky, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(kx - 0.8, ky, 1.6, 6); ctx.fillRect(kx, ky + 4, 2.2, 1.2);
    });
    digits(Math.ceil(p.armor) + '%', 306, y0 + 33, 24, p.armorType === 2 ? '#b04cff' : '#e0115f');
    label('ARMOR', 306, y0 + 43);
    // ammo table
    let yy = y0 + 9;
    for (const k of Object.keys(AMMO_TYPES)) {
      const isCur = w && w.ammo === k;
      label(AMMO_TYPES[k].name, 352, yy, isCur ? '#ffffff' : '#c9a6c9', 'left', 5.6);
      label(`${p.ammo[k]}/${AMMO_TYPES[k].max}`, 474, yy, '#ffcf3a', 'right', 5.6);
      yy += 6;
    }
    ctx.restore();
  }

  function drawMessages() {
    if (msgT > 0) {
      ctx.font = 'bold 9px monospace'; ctx.textAlign = 'left';
      ctx.fillStyle = '#000'; ctx.fillText(msg, 5, 13);
      ctx.fillStyle = '#ffd0ec'; ctx.fillText(msg, 4, 12);
    }
    if (L.bossRef && !L.bossRef.dead) {
      const b = L.bossRef, fr = b.hp / b.def.hp;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(W / 2 - 101, 28, 202, 10);
      ctx.fillStyle = '#ff5a1f'; ctx.fillRect(W / 2 - 100, 29, 200 * fr, 8);
      label(b.def.name, W / 2, 26, '#ffcf3a', 'center', 8);
    }
    // power-up timers (top right)
    let px = W - 4;
    for (const [k, nm, col] of [['shroud', 'SHROUD', '#ffffff'], ['veil', 'VEIL', '#b04cff'], ['mask', 'MASK', '#39ff6a'], ['gloom', 'x2', '#d070ff'], ['wings', 'WINGS', '#ff9be0']]) {
      const t = player.pw[k]; if (t <= 0) continue;
      if (t < 3 && Math.sin(time * 18) < 0) { px -= 46; continue; }
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(px - 44, 4, 44, 12);
      label(`${nm} ${Math.ceil(t)}`, px - 22, 13, col, 'center', 8); px -= 46;
    }
    if (player.berserk) label('RAGE', W - 4, 26, '#ff2a4a', 'right', 8);
    // crosshair
    const gap = 1 + player.move * 2.5 + (player.flashT > 0 ? 2.5 : 0);
    ctx.fillStyle = 'rgba(255,80,180,0.75)';
    ctx.fillRect(W / 2 - 1, CY - 3 - gap, 2, 3); ctx.fillRect(W / 2 - 1, CY + 1 + gap, 2, 3);
    ctx.fillRect(W / 2 - 4 - gap, CY - 0.5, 3, 2); ctx.fillRect(W / 2 + 2 + gap, CY - 0.5, 3, 2);
    if (hitMarkT > 0 || killMarkT > 0) { // hit marker: white for a hit, red for a kill
      ctx.strokeStyle = killMarkT > 0 ? `rgba(255,50,70,${Math.min(1, killMarkT * 4)})` : `rgba(255,255,255,${Math.min(1, hitMarkT * 7)})`; ctx.lineWidth = 1.2; ctx.beginPath();
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.moveTo(W / 2 + sx * 4, CY + sy * 4); ctx.lineTo(W / 2 + sx * 8, CY + sy * 8); }
      ctx.stroke();
    }
  }

  function drawAutomap() {
    ctx.fillStyle = 'rgba(8,0,12,0.88)'; ctx.fillRect(0, 0, W, VIEW_H);
    const sc = Math.min((W - 20) / L.mw, (VIEW_H - 20) / L.mh);
    const ox = (W - L.mw * sc) / 2, oy = (VIEW_H - L.mh * sc) / 2;
    for (let y = 0; y < L.mh; y++) for (let x = 0; x < L.mw; x++) {
      const idx = y * L.mw + x, t = L.grid[idx];
      if (!L.seen[idx] && !(god)) continue;
      if (t === DOOR && L.doors.get(idx).secret && L.doors.get(idx).open < 0.5) ctx.fillStyle = '#b0307a';
      else if (t === DOOR && L.doors.get(idx).lock) ctx.fillStyle = KEYS[L.doors.get(idx).lock].color;
      else if (t === DOOR) ctx.fillStyle = '#d8d0b0';
      else if (L.liftTile[idx]) ctx.fillStyle = '#7fb0ff';
      else if (L.slime[idx]) { ctx.fillStyle = '#2f6a12'; }
      else if (t === 6 || t === 11) ctx.fillStyle = '#39ff6a';
      else if (t > 0) ctx.fillStyle = '#b0307a';
      else continue;
      ctx.fillRect(ox + x * sc, oy + y * sc, sc - 0.5, sc - 0.5);
    }
    const px = ox + player.x * sc, py = oy + player.y * sc;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.moveTo(px + Math.cos(player.a) * 6, py + Math.sin(player.a) * 6);
    ctx.lineTo(px + Math.cos(player.a + 2.5) * 4, py + Math.sin(player.a + 2.5) * 4);
    ctx.lineTo(px + Math.cos(player.a - 2.5) * 4, py + Math.sin(player.a - 2.5) * 4); ctx.closePath(); ctx.stroke();
    label('AUTOMAP - ' + L.def.name, W / 2, 12, '#ff9be0', 'center', 9);
  }

  // ------------------------------------------------------------------ faces (HUD portrait from the photo)
  function buildFaces(photos) {
    const mkC = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const blood = (g, n, seed) => {
      let s = seed; const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
      for (let i = 0; i < n; i++) {
        const x = r() * 64, y = r() * 40, len = 6 + r() * 20;
        g.fillStyle = i % 2 ? '#8a0010' : '#b0001e';
        g.fillRect(x, y, 2, len); g.beginPath(); g.arc(x + 1, y + len, 1.6, 0, 7); g.fill();
      }
    };
    const variant = (src, tier, opts = {}) => {
      const c = mkC(64, 66), g = c.getContext('2d');
      g.drawImage(src, 0, 0);
      if (tier > 0) { g.fillStyle = `rgba(30,0,10,${tier * 0.1})`; g.fillRect(0, 0, 64, 66); blood(g, tier * 3, 11 + tier); }
      if (opts.pain) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,0,0,0.4)'; g.fillRect(0, 0, 64, 66); g.globalCompositeOperation = 'source-over'; }
      if (opts.grin) { // glowing pink eyes
        for (const ex of [26, 41]) { const gr = g.createRadialGradient(ex, 27, 0, ex, 27, 7); gr.addColorStop(0, 'rgba(255,120,220,0.95)'); gr.addColorStop(1, 'rgba(255,0,180,0)'); g.fillStyle = gr; g.fillRect(ex - 7, 20, 14, 14); }
      }
      if (opts.god) { g.strokeStyle = '#ffcf3a'; g.lineWidth = 3; g.strokeRect(1, 1, 62, 64); }
      if (opts.dead) {
        const d = g.getImageData(0, 0, 64, 66);
        for (let i = 0; i < d.data.length; i += 4) { const v = (d.data[i] * 0.3 + d.data[i + 1] * 0.5 + d.data[i + 2] * 0.2) * 0.6; d.data[i] = v + 30; d.data[i + 1] = d.data[i + 2] = v; }
        g.putImageData(d, 0, 0); blood(g, 18, 99);
      }
      return c;
    };
    const looks = [photos.face_c, photos.face_l, photos.face_r];
    faces = {
      look: looks.map(src => [0, 1, 2, 3, 4].map(t => variant(src, t))),
      pain: [0, 1, 2, 3, 4].map(t => variant(photos.face_c, t, { pain: true })),
      grin: variant(photos.face_c, 0, { grin: true }),
      god: variant(photos.face_c, 0, { grin: true, god: true }),
      dead: variant(photos.face_c, 4, { dead: true }),
    };
  }

  // ------------------------------------------------------------------ doors / use
  function useAction() {
    const p = player;
    for (let d = 0.3; d <= 1.6; d += 0.1) {
      const x = p.x + Math.cos(p.a) * d, y = p.y + Math.sin(p.a) * d;
      const mx = Math.floor(x), my = Math.floor(y);
      const idx = my * L.mw + mx, t = L.grid[idx];
      if (t === DOOR) {
        const d = L.doors.get(idx);
        if (d.secret) { if (d.state === 'closed') { d.state = 'opening'; Sfx.play.doorOpen(Math.hypot(d.x + 0.5 - player.x, d.y + 0.5 - player.y)); player.secrets++; msg = 'A secret is revealed!'; msgT = 3; Voice.say('secret', 1, true); bump('secrets'); } return; }
        if (d.lock && !p.keys[d.lock]) { lockedMsg(d); return; }
        toggleDoor(d); return;
      }
      if (L.liftTile[idx]) { const lf = L.lifts.find(l => l.tiles.includes(idx)); if (lf && lf.state === 'up') { lf.state = 'lowering'; Sfx.play.door(); } return; }
      if (t === 6) { confettiFx(player.x + Math.cos(player.a) * 0.9, player.y + Math.sin(player.a) * 0.9, player.eyeZ + 0.3, 70); L.grid[idx] = 11; Sfx.play.switch(); Sfx.play.exit(); L.exitT = 1.0; msg = 'Level complete!'; msgT = 2; return; }
      if (t > 0) { Sfx.play.oof(); return; }
    }
  }
  function lockedMsg(d) {
    msg = `You need the ${KEYS[d.lock].name} to open this door.`; msgT = 2.5;
    Sfx.play.locked();
  }
  function toggleDoor(d, byEnemy) {
    if (d.lock && (byEnemy || !player.keys[d.lock])) return;
    if (d.state === 'closed' || d.state === 'closing') { d.state = 'opening'; Sfx.play.doorOpen(Math.hypot(d.x + 0.5 - player.x, d.y + 0.5 - player.y)); }
    else if (d.state === 'open' && !byEnemy) { d.state = 'closing'; d.t = 0; Sfx.play.doorClose(Math.hypot(d.x + 0.5 - player.x, d.y + 0.5 - player.y)); }
  }
  function updateDoors(dt) {
    for (const d of L.doors.values()) {
      // doors open by themselves when Goffichick walks up to them
      const near = !player.dead && Math.hypot(player.x - (d.x + 0.5), player.y - (d.y + 0.5)) < 1.6;
      if (d.lock && !player.keys[d.lock]) { // locked: say which key it needs, once per visit
        if (near && !d.warned) { d.warned = true; lockedMsg(d); }
        if (!near && Math.hypot(player.x - (d.x + 0.5), player.y - (d.y + 0.5)) > 2.6) d.warned = false;
        continue;
      }
      if (!d.secret && (d.state === 'closed' || d.state === 'closing') && near) { if (d.state === 'closed') Sfx.play.doorOpen(Math.hypot(d.x + 0.5 - player.x, d.y + 0.5 - player.y)); d.state = 'opening'; }
      if (d.secret && d.state === 'open') continue; // secrets stay open
      if (d.state === 'opening') { d.open += dt * 2.6; if (d.open >= 1) { d.open = 1; d.state = 'open'; d.t = 0; } }
      else if (d.state === 'open') {
        d.t += dt;
        if (d.t > 4) {
          const occupied = (Math.floor(player.x) === d.x && Math.floor(player.y) === d.y) ||
            L.enemies.some(e => !e.dead && Math.floor(e.x) === d.x && Math.floor(e.y) === d.y);
          if (!occupied) { d.state = 'closing'; Sfx.play.doorClose(Math.hypot(d.x + 0.5 - player.x, d.y + 0.5 - player.y)); } else d.t = 3;
        }
      } else if (d.state === 'closing') {
        const occupied = (Math.floor(player.x) === d.x && Math.floor(player.y) === d.y) ||
          L.enemies.some(e => !e.dead && Math.abs(e.x - (d.x + 0.5)) < 0.9 && Math.abs(e.y - (d.y + 0.5)) < 0.9);
        if (occupied) d.state = 'opening';
        else { d.open -= dt * 1.6; if (d.open <= 0) { d.open = 0; d.state = 'closed'; } }
      }
    }
  }

  // Lifts sit at the top until Goffichick comes near from below; they then sink, wait, and rise
  // again carrying whoever stands on them. Standing still on a raised lift brings it down too.
  function updateLifts(dt) {
    const p = player, here = Math.floor(p.y) * L.mw + Math.floor(p.x);
    for (const lf of L.lifts) {
      const on = lf.tiles.includes(here);
      const near = !p.dead && lf.tiles.some(i => Math.hypot(p.x - (i % L.mw + 0.5), p.y - (((i / L.mw) | 0) + 0.5)) < 2.1);
      // standing still on the raised lift sends it down - but not right after riding it up
      if (!on) lf.rode = false; else if (lf.state === 'raising' || lf.state === 'down' || lf.state === 'lowering') lf.rode = true;
      lf.onT = on && !lf.rode && p.move < 0.1 ? lf.onT + dt : 0;
      if (lf.state === 'up') {
        if ((near && !on && p.fz < lf.high - STEP) || lf.onT > 1.2) { lf.state = 'lowering'; Sfx.play.door(); }
      } else if (lf.state === 'lowering') {
        lf.h -= dt * 1.4; if (lf.h <= lf.low) { lf.h = lf.low; lf.state = 'down'; lf.t = 0; }
      } else if (lf.state === 'down') {
        lf.t += dt; if (lf.t > 2.5) { lf.state = 'raising'; Sfx.play.door(); }
      } else if (lf.state === 'raising') {
        lf.h += dt * 1.1; if (lf.h >= lf.high) { lf.h = lf.high; lf.state = 'up'; }
      }
      for (const i of lf.tiles) L.fh[i] = lf.h;
    }
  }

  // flickering light zones (broken fluorescent tubes, guttering crypt candles)
  function updateLights() {
    for (const z of L.zones) {
      if (!z.flicker) continue;
      const was = z.on;
      if (z.on ? Math.random() < 0.025 : Math.random() < 0.25) z.on = !z.on;
      if (was === z.on) continue;
      const v = z.on ? z.level : z.level * 0.65;
      const zd = Math.hypot(player.x - (z.x + z.w / 2), player.y - (z.y + z.h / 2));
      if (zd < Math.max(z.w, z.h) / 2 + 3) Sfx.play.buzz(zd);
      for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) if (x >= 0 && y >= 0 && x < L.mw && y < L.mh) L.lightNow[y * L.mw + x] = v;
    }
  }

  // ------------------------------------------------------------------ extras: variants, champions, roses, horde, loot
  let torchMode = 'auto', radarOn = true, photoMode = false, jumpReq = false, musicOn = true, pauseSel = 0;
  const seeded = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  function reachableTiles() {
    const mw = L.mw, n = mw * L.mh, start = Math.floor(player.y) * mw + Math.floor(player.x), dist = new Int16Array(n).fill(-1), q = [start], out = [];
    dist[start] = 0;
    for (let h = 0; h < q.length; h++) {
      const c = q[h], cx = c % mw, cy = (c / mw) | 0;
      if (!L.slime[c] && !L.block[c] && L.grid[c] === 0 && !L.liftTile[c] && L.fh[c] === 0) out.push({ x: cx, y: cy, d: dist[c] });
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= mw || ny >= L.mh) continue;
        const ni = ny * mw + nx, g = L.grid[ni]; if (dist[ni] !== -1 || (g > 0 && g !== DOOR) || L.block[ni]) continue;
        dist[ni] = dist[c] + 1; q.push(ni);
      }
    }
    return out;
  }
  function makeChamp(e) { e.champ = true; e.hp = Math.round(e.hp * 2.5); e.maxHp = e.hp; }
  // swap in the new monster types, crown a few champions, and hide three black roses and a bonus power-up
  function setupExtras(def, idx) {
    if (typeof idx !== 'number' || def.custom || mode === 'dm' || mode === 'horde') return;
    const rnd = seeded(idx * 7919 + 17);
    const SWAP = { manager: ['riot', 0.25], coach: ['hypeman', 0.4], yoga: ['guru', 0.4], skull: ['ghost', 0.35], zombie: ['popper', idx >= 1 ? 0.12 : 0] };
    for (const e of L.enemies) {
      const sw = SWAP[e.type];
      if (sw && rnd() < sw[1]) { const d = ENEMY_DEFS[sw[0]]; e.type = sw[0]; e.def = d; e.hp = Math.round(d.hp * DIFFS[diff].hp); e.z = d.z || 0; }
      if (!e.def.boss && e.type !== 'barrel' && rnd() < (diff >= 3 ? 0.14 : 0.07)) makeChamp(e);
    }
    const far = reachableTiles().filter(t => t.d >= 10), pick = [];
    for (let n = 0; n < 4 && far.length; n++) for (let tries = 0; tries < 40; tries++) { const t = far[(rnd() * far.length) | 0]; if (pick.every(q => Math.hypot(q.x - t.x, q.y - t.y) > 6)) { pick.push(t); break; } }
    pick.forEach((t, k) => L.items.push({ x: t.x + 0.5, y: t.y + 0.5, def: ITEM_TYPES[k < 3 ? ',' : rnd() < 0.5 ? '{' : '}'], taken: false, extra: true }));
    L.totalRoses = Math.min(3, pick.length);
  }
  const ROSE_KEY = 'goffichick-roses';
  function takeRose(it) {
    const p = player; p.roses++;
    msg = `A BLACK ROSE!   ${p.roses} / ${L.totalRoses} on this level`; msgT = 3; Sfx.play.weaponUp(); pickupFlash = 0.4;
    popup(it.x, it.y, floorAt(it.x, it.y) + 0.5, '+500', '255,80,140'); runScore += 500;
    unlock('rose'); Voice.say('rose', 1, true);
    if (typeof levelIndex === 'number' && (mode === 'campaign' || mode === 'coop')) {
      const r = store.get(ROSE_KEY) || {}; r[L.def.name] = Math.max(r[L.def.name] || 0, p.roses); store.set(ROSE_KEY, r);
      if (LEVELS.reduce((a, lv) => a + Math.min(3, r[lv.name] || 0), 0) >= LEVELS.length * 3) unlock('roses');
    }
  }
  // monsters sometimes drop something useful; champions always do
  function dropLoot(e) {
    if (mode === 'dm' || mode === 'coop' || e.type === 'barrel' || e.def.boss) return;
    if (!e.champ && Math.random() > (mode === 'horde' ? 0.3 : 0.18)) return;
    const table = e.champ ? ['*', 'a', 's', 'u', '-', '{', '}', 'c'] : ['+', '+', 'c', 's', 'c', '-', 'n', 'r'];
    const ch = table[irand(0, table.length - 1)];
    L.items.push({ x: e.x + rand(-0.2, 0.2), y: e.y + rand(-0.2, 0.2), def: ITEM_TYPES[ch], taken: false, extra: true });
    vfx('ring', e.x, e.y, floorAt(e.x, e.y) + 0.03, { shape: 'ring', life: 0.4, size: 0.05, grow: 5, col: '255,220,120', add: true, a: 0.7 });
  }
  // floating score text
  function popup(x, y, z, text, col = '255,207,58') { if (L.popups.length < 30) L.popups.push({ x, y, z, text, col, t: 0 }); }
  // the Party Popper goes off in a shower of confetti
  function popBlast(e) {
    explosionFx(e.x, e.y, 0.35, 1.6); confettiFx(e.x, e.y, 0.5, 40);
    Sfx.play.explode(Math.hypot(e.x - player.x, e.y - player.y)); Sfx.play.pop(0);
    splash(e.x, e.y, 1.7, 55, e);
  }
  // knockback: explosions and close shotgun blasts shove monsters and send bodies sliding
  function shove(e, dx, dy, f) {
    if (!e || e.remote || e.type === 'barrel' || (e.def.boss && !e.dead)) return;
    const d = Math.hypot(dx, dy) || 1, k = e.dead ? f * 1.6 : f / Math.max(1, (e.def.hp || 50) / 60);
    e.kx = (e.kx || 0) + dx / d * k; e.ky = (e.ky || 0) + dy / d * k;
  }
  // breakable scenery: plants, water coolers, tombstones and candelabras
  const BREAK = { plant: ['60,140,50', 'leaves'], cooler: ['120,190,255', 'water'], tombstone: ['110,105,115', 'stone'], candelabra: ['70,60,60', 'metal'], skulls: ['230,225,210', 'stone'] };
  function hitDecor(d, dmg, c, s) {
    const b = BREAK[d.def.sprite]; if (!b) return;
    d.hp -= dmg;
    const z = floorAt(d.x, d.y) + d.def.h * 0.5;
    for (let i = 0; i < 3; i++) vfx('chip', d.x, d.y, z, { shape: 'rect', vx: -c * rand(0.5, 1.5) + rand(-0.5, 0.5), vy: -s * rand(0.5, 1.5) + rand(-0.5, 0.5), vz: rand(0.6, 1.8), grav: 9, bounce: 0.3, spin: rand(-14, 14), life: 1.5, size: 0.012, col: b[0] });
    if (d.hp <= 0) breakDecor(d);
  }
  function breakDecor(d) {
    const b = BREAK[d.def.sprite]; if (!b || !L.decor.includes(d)) return;
    L.decor = L.decor.filter(o => o !== d);
    const idx = Math.floor(d.y) * L.mw + Math.floor(d.x);
    if (!L.decor.some(o => o.def.block && Math.floor(o.y) * L.mw + Math.floor(o.x) === idx)) L.block[idx] = 0;
    L.flowFrom = -1;
    const fl = floorAt(d.x, d.y);
    for (let i = 0; i < 16; i++) { const a = rand(0, TAU), v = rand(0.6, 2.4); vfx('chip', d.x, d.y, fl + rand(0.1, d.def.h), { shape: 'rect', vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(1, 3), grav: 9, bounce: 0.35, spin: rand(-16, 16), life: rand(1.5, 2.5), size: rand(0.012, 0.03), col: b[0] }); }
    if (b[1] === 'water') { for (let i = 0; i < 14; i++) { const a = rand(0, TAU), v = rand(0.5, 2); vfx('splash', d.x, d.y, fl + 0.4, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(0.5, 2), grav: 7, life: 0.6, size: 0.014, col: '150,200,255', add: true }); } floorDecal(d.x, d.y, 0.45, [40, 70, 110], 0.35, 0.4); }
    else vfx('dust', d.x, d.y, fl + 0.2, { vz: 0.2, life: 1.2, size: 0.12, grow: 1.5, col: '150,140,130', a: 0.4 });
    if (d.def.sprite === 'candelabra') spawnParts('spark', d.x, d.y, fl + 0.7, 8, 2);
    Sfx.play.crash(); bump('smash');
  }
  // Nightmare: dead monsters get back up when you're not looking. Monster tricks run here too.
  function eliteUpdate(dt) {
    const p = player, sk = DIFFS[diff];
    for (const e of L.enemies) {
      if (e.dead && e.bleedT > 0) { e.bleedT -= dt; if (Math.random() < dt * 30) spawnParts('drop', e.x, e.y, (e.fz || 0) + 0.25, 3, 1.4); } // a neck fountain
      if (e.kx || e.ky) { // knockback slide
        tryMove(e, e.kx * dt, e.ky * dt, e.def.radius * 0.8); e.fz = floorAt(e.x, e.y);
        const f = Math.max(0, 1 - dt * (e.dead ? 4 : 7)); e.kx *= f; e.ky *= f; if (Math.abs(e.kx) + Math.abs(e.ky) < 0.05) e.kx = e.ky = 0;
      }
      if (e.dead) {
        if (sk.respawn && mode !== 'horde' && !e.def.boss && e.type !== 'barrel' && e.type !== 'mini' && !e.def.kamikaze) {
          e.deadT = (e.deadT || 0) + dt;
          if (e.deadT > 30 && Math.hypot(e.x - p.x, e.y - p.y) > 7 && !losClear(e.x, e.y, p.x, p.y)) {
            e.dead = false; e.deadT = 0; e.hp = e.maxHp || Math.round(e.def.hp * sk.hp); e.state = 'chase'; e.frame = 0; e.atkT = rand(1, 2);
            swirlFx(e.x, e.y, e.fz || 0, '255,40,80'); L.respawned = (L.respawned || 0) + 1;
          }
        }
        continue;
      }
      if (e.buffT > 0) e.buffT -= dt;
      if (e.bleedT > 0) { e.bleedT -= dt; if (Math.random() < dt * 25) { spawnParts('drop', e.x, e.y, (e.fz || 0) + e.z + (e.bleedZ || 0.5), 2, 1); if (Math.random() < 0.15) floorDecal(e.x + rand(-0.15, 0.15), e.y + rand(-0.15, 0.15), rand(0.03, 0.06), BLOOD, 0.7); } }
      if (e.state === 'idle' || e.state === 'static') continue;
      const d = e.def;
      if (e.champ && Math.random() < dt * 5) vfx('sparkle', e.x + rand(-0.25, 0.25), e.y + rand(-0.25, 0.25), (e.fz || 0) + e.z + rand(0.1, d.h), { shape: 'star', vz: 0.3, life: 0.6, size: 0.02, col: '255,200,80', add: true });
      if (d.aura === 'hype') {
        for (const o of L.enemies) if (o !== e && !o.dead && o.type !== 'barrel' && Math.hypot(o.x - e.x, o.y - e.y) < 5) o.buffT = 0.6;
        if (Math.random() < dt * 6) vfx('ring', e.x, e.y, (e.fz || 0) + 0.05, { shape: 'ring', life: 0.6, size: 0.1, grow: 6, col: '255,210,90', add: true, a: 0.5 });
      }
      if (d.summoner) { // "I want to speak to the MANAGER!"
        e.sumT = (e.sumT ?? rand(4, 7)) - dt;
        if (e.sumT <= 0) {
          e.sumT = rand(8, 11);
          if (L.enemies.filter(o => !o.dead && o.summonedBy === e).length < 2) {
            const a = rand(0, TAU), x = e.x + Math.cos(a) * 1.1, y = e.y + Math.sin(a) * 1.1;
            if (!collides(x, y, 0.3, false, e.fz, STEP)) {
              spawnEnemy(d.summoner, x, y); const m = L.enemies[L.enemies.length - 1]; m.state = 'chase'; m.fz = floorAt(x, y); m.summonedBy = e; L.totalKills++;
              swirlFx(x, y, m.fz, '200,120,255');
              e.bubble = null; bubbleCd = 0; const q = QUIPS.karen; shout(e, 'sight', 1, true); if (e.bubble) e.bubble.text = 'I WANT TO SPEAK TO THE MANAGER!';
            }
          }
        }
      }
      if (d.healer) {
        e.healT = (e.healT ?? 2) - dt;
        if (e.healT <= 0) {
          e.healT = 2.2;
          let best = null, bd = 6;
          for (const o of L.enemies) { if (o === e || o.dead || o.type === 'barrel') continue; const mx = o.maxHp || Math.round(o.def.hp * sk.hp), dd = Math.hypot(o.x - e.x, o.y - e.y); if (o.hp < mx && dd < bd && losClear(e.x, e.y, o.x, o.y)) { best = o; bd = dd; } }
          if (best) {
            const mx = best.maxHp || Math.round(best.def.hp * sk.hp); best.hp = Math.min(mx, best.hp + 35);
            for (let k = 0; k <= 8; k++) vfx('sparkle', e.x + (best.x - e.x) * k / 8, e.y + (best.y - e.y) * k / 8, (e.fz || 0) + 0.6, { shape: 'star', vz: 0.2, life: 0.5, size: 0.025, col: '120,255,140', add: true });
            for (let k = 0; k < 6; k++) vfx('sparkle', best.x + rand(-0.2, 0.2), best.y + rand(-0.2, 0.2), (best.fz || 0) + best.z + rand(0.1, best.def.h), { shape: 'star', vz: 0.6, life: 0.7, size: 0.03, col: '120,255,140', add: true });
            Sfx.play.om(Math.hypot(e.x - p.x, e.y - p.y));
          }
        }
      }
      if (d.blink) {
        e.blinkT = (e.blinkT ?? rand(2, 4)) - dt;
        if (e.blinkT <= 0) {
          e.blinkT = rand(2.5, 4.5);
          for (let k = 0; k < 12; k++) {
            const nx = p.x + rand(-5, 5), ny = p.y + rand(-5, 5);
            if (Math.hypot(nx - p.x, ny - p.y) < 2.5 || collides(nx, ny, d.radius, false, e.fz, 0.9) || !losClear(nx, ny, p.x, p.y)) continue;
            swirlFx(e.x, e.y, (e.fz || 0) + e.z, '170,220,255'); e.x = nx; e.y = ny; e.fz = floorAt(nx, ny); swirlFx(nx, ny, e.fz + e.z, '170,220,255');
            Sfx.play.skull(Math.hypot(nx - p.x, ny - p.y)); break;
          }
        }
      }
      if (d.shield) { // the riot shield turns to face her, a little slowly
        const ta = Math.atan2(p.y - e.y, p.x - e.x); let da = ta - (e.face ?? ta); while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
        e.face = (e.face ?? ta) + clamp(da, -1.5 * dt, 1.5 * dt);
      }
    }
    for (const q of L.popups) { q.t += dt; q.z += dt * 0.5; } L.popups = L.popups.filter(q => q.t < 1.2);
  }
  // ---- Horde mode: endless waves in the Mosh Pit
  let horde = null;
  const HORDE_KEY = 'goffichick-horde';
  const HORDE_POOL = [[6, 'drone'], [9, 'karen'], [10, 'mummy'], [10, 'mascot'], [1, 'zombie'], [1, 'manager'], [2, 'popper'], [3, 'wally'], [3, 'yoga'], [4, 'skull'], [5, 'brute'], [5, 'coach'], [6, 'ghost'], [7, 'redcoat'], [7, 'bridezilla'], [7, 'wallyfit'], [8, 'guru'], [8, 'riot'], [9, 'hypeman'], [11, 'wallydeluxe'], [12, 'bubbly']];
  function hordeInit() { horde = { wave: 0, t: 3, spawnLeft: 0, spawnT: 0 }; L.enemies.length = 0; L.totalKills = 0; msg = 'HORDE MODE: survive as many waves as you can!'; msgT = 4; }
  function hordeSpawn(wave, big) {
    const p = player, opts = L.starts.slice().sort((a, b) => Math.hypot(b.x - p.x, b.y - p.y) - Math.hypot(a.x - p.x, a.y - p.y)).slice(0, 4);
    const sp = opts[irand(0, opts.length - 1)];
    const pool = HORDE_POOL.filter(q => q[0] <= wave);
    const type = big ? (wave % 10 === 0 ? 'boss' : 'wallydeluxe') : pool[irand(0, pool.length - 1)][1];
    const x = sp.x + rand(-0.3, 0.3), y = sp.y + rand(-0.3, 0.3);
    spawnEnemy(type, x, y);
    const e = L.enemies[L.enemies.length - 1]; e.state = 'chase'; e.fz = floorAt(x, y); e.atkT = rand(1, 2);
    if (big || Math.random() < Math.min(0.3, wave * 0.02)) makeChamp(e);
    if (e.def.boss) { e.hp = Math.round(e.hp * 0.5); e.maxHp = e.hp; L.bossRef = e; }
    swirlFx(x, y, e.fz, '255,60,90'); L.totalKills++;
  }
  function hordeUpdate(dt) {
    const h = horde; if (!h || state !== 'playing') return;
    if (h.spawnLeft > 0) { h.spawnT -= dt; if (h.spawnT <= 0) { h.spawnT = 0.5; h.spawnLeft--; hordeSpawn(h.wave, h.spawnLeft === 0 && h.wave % 5 === 0); } return; }
    if (L.enemies.some(e => !e.dead && e.type !== 'barrel')) return;
    h.t -= dt;
    if (h.t > 0) return;
    h.wave++; h.spawnLeft = 3 + h.wave * 2; h.t = 4; h.spawnT = 1;
    announce = { text: h.wave % 5 === 0 ? `WAVE ${h.wave} - BOSS!` : `WAVE ${h.wave}`, t: 0 }; Sfx.play.bossRoar(4);
    if (h.wave > 1) for (let k = 0; k < 3; k++) { // supplies between waves
      const sp = L.starts[irand(0, L.starts.length - 1)], ch = ['*', '+', 'c', 's', 'u', '-', 'n', 'a'][irand(0, 7)];
      L.items.push({ x: sp.x + rand(-0.6, 0.6), y: sp.y + rand(-0.6, 0.6), def: ITEM_TYPES[ch], taken: false, extra: true });
    }
    L.corpses = L.enemies.filter(e => e.dead).length; if (L.corpses > 60) L.enemies = L.enemies.filter(e => !e.dead);
  }
  function hordeEnd() {
    const best = store.get(HORDE_KEY) || 0, wave = horde ? horde.wave : 0;
    soloResult = { wave, kills: player.kills, best: Math.max(best, wave), newBest: wave > best };
    if (wave > best) store.set(HORDE_KEY, wave);
    if (wave >= 10) unlock('horde10');
    state = 'hordeOver'; stateT = 0;
  }
  // ---- grenades
  function throwNade() {
    const p = player;
    if (p.dead || state !== 'playing' || paused) return;
    if (!(p.nades > 0)) { msg = 'No grenades left!'; msgT = 1.2; return; }
    if (p.nadeCd > 0) return;
    p.nades--; p.nadeCd = 0.6; p.shotsF++; Voice.say('nade', 0.35);
    fireProjectile('grenade', p.x, p.y, p.eyeZ - 0.12, p.a, 'player');
    const g = L.projs[L.projs.length - 1]; g.vz = 3.2 + pitch / PROJ * 7;
    Sfx.play.switch();
  }
  function drawRadar() {
    const cx = 30, cy = 52, R = 24, sc = R / 8, p = player, mw = L.mw;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = 'rgba(10,0,16,0.5)'; ctx.fill(); ctx.clip();
    ctx.translate(cx, cy); ctx.rotate(-p.a - Math.PI / 2);
    ctx.fillStyle = 'rgba(255,140,210,0.4)';
    const px0 = Math.floor(p.x), py0 = Math.floor(p.y);
    for (let dy = -9; dy <= 9; dy++) for (let dx = -9; dx <= 9; dx++) {
      const tx = px0 + dx, ty = py0 + dy; if (tx < 0 || ty < 0 || tx >= mw || ty >= L.mh) continue;
      const i = ty * mw + tx, g = L.grid[i]; if (!g || !L.seen[i]) continue;
      ctx.fillStyle = g === DOOR ? 'rgba(255,220,160,0.6)' : 'rgba(255,140,210,0.4)';
      ctx.fillRect((tx - p.x) * sc, (ty - p.y) * sc, sc + 0.3, sc + 0.3);
    }
    for (const it of L.items) if (!it.taken && (it.def.key || it.def.power)) { const dx = it.x - p.x, dy = it.y - p.y; if (dx * dx + dy * dy < 81 && (it.def.key || L.seen[Math.floor(it.y) * mw + Math.floor(it.x)] !== undefined)) { ctx.fillStyle = it.def.rose ? '#ff3a7a' : it.def.key ? KEYS[it.def.key].color : '#c070ff'; ctx.fillRect(dx * sc - 1, dy * sc - 1, 2, 2); } }
    for (const e of bodies()) {
      if (e.dead || e.type === 'barrel') continue;
      const dx = e.x - p.x, dy = e.y - p.y; if (dx * dx + dy * dy > 81) continue;
      ctx.fillStyle = e.remote ? '#28dcff' : e.champ ? '#ffcf3a' : '#ff3a4a';
      ctx.beginPath(); ctx.arc(dx * sc, dy * sc, e.def.boss ? 2.6 : 1.5, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,79,184,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(cx, cy - 4); ctx.lineTo(cx + 3, cy + 3); ctx.lineTo(cx - 3, cy + 3); ctx.closePath(); ctx.fill();
  }
  // ---- pause menu
  function pauseItems() {
    const it = [{ id: 'resume', text: 'RESUME' }];
    if (mode !== 'dm' && mode !== 'coop') it.push({ id: 'restart', text: mode === 'horde' ? 'START AGAIN' : 'RESTART LEVEL' });
    it.push({ id: 'fx', text: `EFFECTS   ${FX_HIGH ? 'HIGH' : 'LOW'}` }, { id: 'music', text: `MUSIC   ${musicOn ? 'ON' : 'OFF'}` }, { id: 'musicMode', text: `TUNES   ${musicMode === 'shuffle' ? 'SHUFFLE' : 'LEVEL THEMES'}` }, { id: 'torch', text: `TORCH   ${torchMode.toUpperCase()}` }, { id: 'look', text: `LOOK SPEED   ${LOOK_SENS}  (tap to change)` }, { id: 'quit', text: online ? 'LEAVE THE GAME' : 'QUIT TO TITLE' });
    return it;
  }
  function pauseAct(id) {
    Sfx.init(); Sfx.play.switch();
    if (id === 'resume') { paused = false; lockPointer(); }
    else if (id === 'restart') { paused = false; if (mode === 'horde') { loadSolo(); state = 'playing'; } else if (mode === 'campaign') restartLevel(); else { loadSolo(); state = 'playing'; } lockPointer(); }
    else if (id === 'fx') { FX_HIGH = !FX_HIGH; fxDrop = 0; try { localStorage.setItem('goffichick-fx', FX_HIGH ? 'high' : 'low'); } catch (e) {} }
    else if (id === 'music') musicOn = Sfx.toggleMusic();
    else if (id === 'musicMode') { musicMode = musicMode === 'shuffle' ? 'level' : 'shuffle'; try { localStorage.setItem('goffichick-music', musicMode); } catch (e) {} }
    else if (id === 'look') setLook(nextLook(1));
    else if (id === 'torch') torchMode = { auto: 'on', on: 'off', off: 'auto' }[torchMode];
    else if (id === 'quit') { paused = false; if (online) leaveOnline(); else if (mode !== 'campaign') quitSolo(); else { state = 'title'; stateT = 0; Sfx.setAmbience(null); if (document.exitPointerLock && locked()) document.exitPointerLock(); ignoreTapUntil = performance.now() + 300; } }
  }
  const PAUSE_Y = 100, PAUSE_DY = 14.5;
  function drawPause() {
    drawOverlayText('PAUSED', `Goffichick is ${PAUSE_QUIPS[Math.floor(levelTime) % PAUSE_QUIPS.length].replace(/^./, c => c.toLowerCase())}`, []);
    const items = pauseItems(); pauseSel = Math.min(pauseSel, items.length - 1);
    items.forEach((it, i) => {
      const y = PAUSE_Y + i * PAUSE_DY, sel = i === pauseSel;
      if (sel) { ctx.fillStyle = 'rgba(255,79,184,0.25)'; ctx.fillRect(W / 2 - 90, y - 11, 180, 15); }
      label(it.text, W / 2, y, sel ? '#ffffff' : '#ff9be0', 'center', 10);
    });
    drawTipJar();
  }
  function pauseTap(ev) {
    const items = pauseItems();
    if (ev && ev.clientX !== undefined) {
      const g0 = gamePoint(ev.clientX, ev.clientY);
      if (kofiName()) { const k = TIP_RECT(); if (g0.x >= k.x - 4 && g0.x <= k.x + k.w + 4 && g0.y >= k.y - 4 && g0.y <= k.y + k.h + 4) { openTipJar(); return; } }
      const g = g0, row = Math.floor((g.y - (PAUSE_Y - 11)) / PAUSE_DY);
      if (Math.abs(g.x - W / 2) < 100 && row >= 0 && row < items.length) { pauseSel = row; pauseAct(items[row].id); return; }
      pauseAct('resume'); return;
    }
    pauseAct(items[Math.min(pauseSel, items.length - 1)].id);
  }
  function screenshot() {
    try {
      canvas.toBlob(b => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `goffichick-${Date.now()}.png`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); });
      msg = 'Screenshot saved!'; msgT = 2; Sfx.play.switch();
    } catch (e) { msg = "Couldn't save a screenshot here."; msgT = 2; }
  }

  // ------------------------------------------------------------------ decals and soft particles
  const BLOOD = [104, 0, 14], BLOODLESS = /orb|bubbly|mini|barrel|^av|drone|wallyexe/;
  // paint a splat onto the floor (64 pixels per tile, kept for the rest of the level)
  function floorDecal(wx, wy, r, rgb, alpha, lumpy = 0.3) {
    const mw = L.mw, R = r * 64, seed = Math.random() * 10, cx = wx * 64, cy = wy * 64;
    for (let py = Math.floor(cy - R); py <= cy + R; py++) for (let px = Math.floor(cx - R); px <= cx + R; px++) {
      const tx = px >> 6, ty = py >> 6; if (tx < 0 || ty < 0 || tx >= mw || ty >= L.mh) continue;
      const ti = ty * mw + tx, g = L.grid[ti]; if (g && g !== DOOR) continue;
      const dx = px + 0.5 - cx, dy = py + 0.5 - cy, dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
      const rr = R * (1 - lumpy + lumpy * (0.5 + 0.5 * Math.sin(ang * 3 + seed) * Math.cos(ang * 5 - seed)));
      if (dist > rr) continue;
      let arr = L.fdec.get(ti); if (!arr) { if (L.fdec.size > 500) continue; arr = new Uint32Array(4096); L.fdec.set(ti, arr); }
      const li = (py & 63) * 64 + (px & 63), na = Math.max(arr[li] >>> 24, Math.min(255, alpha * Math.min(1, (rr - dist) / 2.5) * 255)) | 0;
      arr[li] = ((na << 24) | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0]) >>> 0;
    }
  }
  // paint onto one face of a wall tile. u = across the face (0..1), z = height
  function wallDecal(mx, my, face, u, z, r, rgb, alpha, lumpy = 0.25) {
    const key = (my * L.mw + mx) * 4 + face;
    let arr = L.wdec.get(key); if (!arr) { if (L.wdec.size > 400) return; arr = new Uint32Array(64 * 192); L.wdec.set(key, arr); }
    const cu = u * 64, cv = (L.ceilH - z) * 64, R = r * 64, seed = Math.random() * 10;
    for (let v = Math.floor(cv - R); v <= cv + R; v++) for (let t = Math.floor(cu - R); t <= cu + R; t++) {
      if (v < 0 || v >= 192 || t < 0 || t >= 64) continue;
      const dx = t + 0.5 - cu, dy = v + 0.5 - cv, dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
      const rr = R * (1 - lumpy + lumpy * (0.5 + 0.5 * Math.sin(ang * 4 + seed) * Math.cos(ang * 3 - seed))) + (dy > 0 && Math.abs(dx) < R * 0.25 ? R * lumpy * 1.5 : 0); // drips run down
      if (dist > rr) continue;
      const li = v * 64 + t, na = Math.max(arr[li] >>> 24, Math.min(255, alpha * Math.min(1, (rr - dist) / 1.5) * 255)) | 0;
      arr[li] = ((na << 24) | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0]) >>> 0;
    }
  }
  const wallFace = (side, c, s) => side === 0 ? (c > 0 ? 0 : 1) : (s > 0 ? 2 : 3);
  // soft particles: drawn with real transparency and glow on top of the 3D view
  function vfx(kind, x, y, z, o) {
    if (L.vfx.length >= (FX_HIGH && fxDrop < 3 ? 700 : 220)) return;
    L.vfx.push({ kind, x, y, z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, t: 0, life: o.life || 1, size: o.size || 0.05, grow: o.grow || 0, col: o.col || '255,255,255',
      add: !!o.add, grav: o.grav || 0, drag: o.drag || 0, bounce: o.bounce || 0, rot: Math.random() * TAU, spin: o.spin || 0, shape: o.shape || 'dot', a: o.a ?? 1, wob: o.wob || 0, phase: Math.random() * TAU, tink: !!o.tink });
  }
  function updateVfx(dt) {
    const cnt = {};
    for (const q of L.vfx) {
      q.t += dt;
      if (q.drag) { const f = Math.max(0, 1 - q.drag * dt); q.vx *= f; q.vy *= f; if (!q.grav) q.vz *= f; }
      q.vz -= q.grav * dt;
      let nx = q.x + q.vx * dt, ny = q.y + q.vy * dt;
      if (q.wob) { nx += Math.sin(q.t * 2.3 + q.phase) * q.wob * dt; ny += Math.cos(q.t * 1.9 + q.phase * 1.3) * q.wob * dt; }
      if (!opaqueAt(nx, ny)) { q.x = nx; q.y = ny; } else { q.vx *= -0.4; q.vy *= -0.4; }
      q.z += q.vz * dt; q.rot += q.spin * dt;
      if (q.grav > 0) {
        const fl = floorAt(q.x, q.y) + 0.006;
        if (q.z < fl) {
          q.z = fl;
          if (q.bounce && q.vz < -0.9) { q.vz *= -q.bounce; q.vx *= 0.6; q.vy *= 0.6; q.spin *= 0.6; if (q.tink && Math.random() < 0.5 && Math.hypot(q.x - player.x, q.y - player.y) < 3) Sfx.play.tink(); }
          else { q.vz = 0; q.vx *= 0.7; q.vy *= 0.7; q.spin = 0; }
        }
      }
      if (!L.def.sky && q.z > L.ceilH) q.t = q.life;
      if (q.vz < 0 && !q.grav) { const fl = floorAt(q.x, q.y) + 0.01; if (q.z < fl) { q.z = fl; q.vz = 0; q.wob = 0; q.spin = 0; } }
      cnt[q.kind] = (cnt[q.kind] || 0) + 1;
    }
    L.vfx = L.vfx.filter(q => q.t < q.life); L.vfxN = cnt;
  }
  const dotCache = new Map();
  function softDot(col) {
    let c = dotCache.get(col);
    if (!c) {
      c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
      const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      gr.addColorStop(0, `rgba(${col},1)`); gr.addColorStop(0.35, `rgba(${col},0.55)`); gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr; g.fillRect(0, 0, 32, 32); dotCache.set(col, c);
    }
    return c;
  }
  function drawVfx() {
    const p = player, dirX = Math.cos(p.a), dirY = Math.sin(p.a), list = [];
    for (const q of L.vfx) {
      const dx = q.x - p.x, dy = q.y - p.y, depth = dx * dirX + dy * dirY;
      if (depth < (q.shape === 'rect' ? 0.28 : 0.15) || depth > 26) continue;
      const sx = (W / 2) * (1 + ((dirX * dy - dirY * dx) / PLANE) / depth);
      if (sx < -30 || sx > W + 30) continue;
      if (!(L.def.sky && q.z > L.ceilH) && zbuf[Math.max(0, Math.min(RW - 1, Math.round(sx * (RW / W))))] < depth - 0.05) continue;
      list.push([depth, sx, q]);
    }
    list.sort((a, b) => b[0] - a[0]);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, VIEW_H); ctx.clip();
    for (const [depth, sx, q] of list) {
      const sy = HOR + (p.eyeZ - q.z) * PROJ / depth, k = q.t / q.life, s = Math.max(0.35, q.size * (1 + q.grow * q.t) * PROJ / depth);
      let a = q.a * Math.min(1, q.t * 10 + (q.shape === 'rect' ? 1 : 0)) * (1 - k * k);
      if (q.kind === 'firefly') a *= 0.35 + 0.65 * Math.max(0, Math.sin(q.t * 4 + q.phase));
      if (a <= 0.01) continue;
      ctx.globalAlpha = Math.min(1, a); ctx.globalCompositeOperation = q.add ? 'lighter' : 'source-over';
      if (q.shape === 'rect') { ctx.save(); ctx.translate(sx, sy); ctx.rotate(q.rot); ctx.fillStyle = `rgb(${q.col})`; if (q.kind === 'butterfly') { const f = Math.abs(Math.sin(q.t * 18 + q.phase)); ctx.fillRect(-s * f, -s * 0.5, s * f * 0.9, s); ctx.fillRect(s * 0.1, -s * 0.5, s * f * 0.9, s); } else ctx.fillRect(-s, -s * 0.45, s * 2, s * 0.9); ctx.restore(); }
      else if (q.shape === 'ring' || q.shape === 'ripple') {
        const ry = q.shape === 'ring' ? s * 0.35 : s * Math.min(0.6, Math.max(0.05, (p.eyeZ - q.z) / depth));
        ctx.strokeStyle = `rgb(${q.col})`; ctx.lineWidth = q.shape === 'ring' ? Math.max(0.8, s * 0.18) : 0.6; ctx.beginPath(); ctx.ellipse(sx, sy, s, ry, 0, 0, TAU); ctx.stroke();
      } else if (q.shape === 'star') {
        ctx.drawImage(softDot(q.col), sx - s, sy - s, s * 2, s * 2); ctx.fillStyle = `rgb(${q.col})`;
        const l = s * 1.7 * (0.6 + 0.4 * Math.sin(q.t * 20 + q.phase)); ctx.fillRect(sx - l, sy - 0.3, l * 2, 0.6); ctx.fillRect(sx - 0.3, sy - l, 0.6, l * 2);
      } else ctx.drawImage(softDot(q.col), sx - s, sy - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    for (const q of L.popups || []) { // floating score
      const dx = q.x - p.x, dy = q.y - p.y, depth = dx * dirX + dy * dirY; if (depth < 0.4) continue;
      const sx = (W / 2) * (1 + ((dirX * dy - dirY * dx) / PLANE) / depth), sy = HOR + (p.eyeZ - q.z) * PROJ / depth;
      ctx.globalAlpha = Math.min(1, (1.2 - q.t) * 2); label(q.text, sx, sy, `rgb(${q.col})`, 'center', Math.max(7, Math.min(12, 14 / depth + 5)));
    }
    ctx.globalAlpha = 1;
    // speech bubbles
    ctx.font = 'bold 7px monospace';
    for (const e of L.enemies) {
      if (!e.bubble) continue;
      const dx = e.x - p.x, dy = e.y - p.y, depth = dx * dirX + dy * dirY; if (depth < 0.6 || depth > 14) continue;
      const sx = (W / 2) * (1 + ((dirX * dy - dirY * dx) / PLANE) / depth);
      if (sx < -40 || sx > W + 40 || zbuf[Math.max(0, Math.min(RW - 1, Math.round(sx * (RW / W))))] < depth - 0.2) continue;
      const top = HOR + (p.eyeZ - (e.fz || 0) - e.z - (e.dead ? 0.3 : e.def.h) - 0.2) * PROJ / depth;
      const t = e.bubble.text, tw = ctx.measureText(t).width + 8, bx = clamp(sx - tw / 2, 2, W - tw - 2), by = Math.max(4, top - 12);
      ctx.globalAlpha = Math.min(1, e.bubble.t * 3);
      ctx.fillStyle = 'rgba(255,255,255,0.93)'; ctx.beginPath(); ctx.moveTo(bx + 3, by); ctx.arcTo(bx + tw, by, bx + tw, by + 11, 3); ctx.arcTo(bx + tw, by + 11, bx, by + 11, 3); ctx.arcTo(bx, by + 11, bx, by, 3); ctx.arcTo(bx, by, bx + tw, by, 3); ctx.fill();
      ctx.beginPath(); ctx.moveTo(clamp(sx, bx + 4, bx + tw - 4) - 3, by + 11); ctx.lineTo(clamp(sx, bx + 4, bx + tw - 4), by + 15); ctx.lineTo(clamp(sx, bx + 4, bx + tw - 4) + 3, by + 11); ctx.fill();
      ctx.fillStyle = '#1a0010'; ctx.textAlign = 'left'; ctx.fillText(t, bx + 4, by + 8);
    }
    ctx.globalAlpha = 1;
    // health bars over monsters you've just hurt
    for (const e of L.enemies) {
      if (e.dead || !(e.barT > 0) || e.def.boss || e.type === 'barrel') continue;
      const dx = e.x - p.x, dy = e.y - p.y, depth = dx * dirX + dy * dirY; if (depth < 0.5 || depth > 18) continue;
      const sx = (W / 2) * (1 + ((dirX * dy - dirY * dx) / PLANE) / depth);
      if (sx < 0 || sx >= W || zbuf[Math.max(0, Math.min(RW - 1, Math.round(sx * (RW / W))))] < depth - 0.2) continue;
      const top = HOR + (p.eyeZ - (e.fz || 0) - e.z - e.def.h - 0.08) * PROJ / depth, bw = Math.max(10, Math.min(30, 9 * PROJ / depth / 10)), fr = Math.max(0, e.hp / (e.maxHp || e.def.hp));
      ctx.globalAlpha = Math.min(1, e.barT); ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(sx - bw / 2 - 1, top - 1, bw + 2, 4);
      ctx.fillStyle = fr > 0.5 ? '#5cff6a' : fr > 0.25 ? '#ffcf3a' : '#ff3a4a'; ctx.fillRect(sx - bw / 2, top, bw * fr, 2);
    }
    ctx.restore();
  }
  // ---- body zones and dismemberment
  const HUMANOID = new Set(['zombie', 'manager', 'wally', 'wallyfit', 'wallydeluxe', 'brute', 'yoga', 'coach', 'bridezilla', 'redcoat', 'hypeman', 'guru', 'riot', 'boss', 'wallylive', 'mummy', 'mascot', 'karen']);
  const ZONE_BIT = { head: 1, armL: 2, armR: 4, legL: 8, legR: 16 };
  const ZONE_BOX = { head: [0, 0, 1, 0.24], armL: [0, 0.24, 0.3, 0.6], armR: [0.7, 0.24, 1, 0.6], legL: [0, 0.6, 0.5, 1], legR: [0.5, 0.6, 1, 1] };
  function hitZone(e, lateral, zr) {
    const spr = enemySprite(e); if (!spr) return 'torso';
    const u = 0.5 - lateral / (e.def.h * spr.w / spr.h), v = 1 - zr;
    if (v < 0.24) return 'head';
    if (v > 0.6) return u < 0.5 ? 'legL' : 'legR';
    if (u < 0.3) return 'armL'; if (u > 0.7) return 'armR';
    return 'torso';
  }
  let heedT = 0;
  function zoneHit(e, zone, dmg, c, s) {
    const human = HUMANOID.has(e.type) && !e.dead;
    const mul = zone === 'head' ? (e.def.boss ? 1.6 : 2.5) : !HUMANOID.has(e.type) || e.def.boss ? 1 : zone.startsWith('arm') ? 0.7 : 0.8, dd = dmg * mul;
    if (zone === 'head' && human && !e.def.boss && (dd >= e.hp || dmg >= 9 || Math.random() < 0.35)) { // off with its head
      cutPart(e, 'head', c, s); damageEnemy(e, 1e6, 'player'); heedShot(e); return;
    }
    const wasAlive = !e.dead;
    damageEnemy(e, dd, 'player');
    if (zone === 'head' && wasAlive && e.dead) { heedShot(e); return; }
    if (human && zone !== 'head' && !e.dead && !e.def.boss && !(e.cut & ZONE_BIT[zone]) && Math.random() < (dd >= 12 ? 0.75 : dd >= 7 ? 0.42 : 0.15)) cutPart(e, zone, c, s);
  }
  function heedShot(e) {
    if (time - heedT < 1.2) return; heedT = time;
    announce = { text: 'HEED SHOT!', t: 0 }; Voice.heed(); bump('heads');
    popup(e.x, e.y, (e.fz || 0) + e.def.h + 0.2, '+100 HEED SHOT', '255,80,80'); runScore += 100;
  }
  // cut a piece out of the monster's current picture and send it flying
  function cropSprite(spr, b) {
    const x0 = Math.floor(b[0] * spr.w), y0 = Math.floor(b[1] * spr.h), w = Math.max(1, Math.ceil(b[2] * spr.w) - x0), h = Math.max(1, Math.ceil(b[3] * spr.h) - y0);
    const data = new Uint32Array(w * h); let any = false;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let c = spr.data[(y0 + y) * spr.w + x0 + x]; if (c) { any = true; if (y < 2 || y >= h - 2 || x < 2 || x >= w - 2) c = 0xff1010a0; } data[y * w + x] = c; }
    return any ? { w, h, data } : null;
  }
  function cutPart(e, zone, c, s) {
    const bit = ZONE_BIT[zone]; if (e.cut & bit) return;
    e.cut = (e.cut || 0) | bit;
    const spr = enemySprite(e), b = ZONE_BOX[zone], base = (e.fz || 0) + e.z, h = e.def.h, pd = Math.hypot(e.x - player.x, e.y - player.y);
    const z = base + h * (1 - (b[1] + b[3]) / 2);
    const piece = spr && cropSprite(spr, b);
    if (piece && L.parts.length < 320) L.parts.push({ kind: 'limb', x: e.x, y: e.y, z, vx: c * rand(1, 2.6) + rand(-1, 1), vy: s * rand(1, 2.6) + rand(-1, 1), vz: rand(2, 4), t: 0, life: 14, spr: piece, size: h * (b[3] - b[1]), bright: false });
    spawnParts('drop', e.x, e.y, z, 16, 2.4);
    for (let i = 0; i < 4; i++) vfx('mist', e.x, e.y, z, { vx: rand(-0.6, 0.6), vy: rand(-0.6, 0.6), vz: rand(0, 0.5), drag: 3, life: 0.7, size: 0.05, grow: 2.5, col: '150,0,20', a: 0.6 });
    floorDecal(e.x + rand(-0.2, 0.2), e.y + rand(-0.2, 0.2), rand(0.15, 0.25), BLOOD, 0.85, 0.45);
    e.bleedT = zone === 'head' ? 2.5 : 3; e.bleedZ = h * (zone === 'head' ? 0.76 : zone.startsWith('arm') ? 0.6 : 0.4);
    Sfx.play.squelch(pd); screenGore(pd);
    if (zone !== 'head') { shout(e, 'limb', 1, true); if ((e.cut & 24) === 24) e.speedK = 0.35; else if (e.cut & 24) e.speedK = 0.6; }
  }
  // blood on the camera when things get messy right in front of her
  let screenBlood = [];
  function screenGore(pd) {
    if (pd > 1.8 || !FX_HIGH && Math.random() < 0.5) return;
    for (let i = 0; i < irand(2, 5); i++) screenBlood.push({ x: rand(20, W - 20), y: rand(10, VIEW_H - 40), r: rand(5, 16), t: 0, life: rand(1.6, 2.8), drip: rand(4, 14) });
    if (screenBlood.length > 24) screenBlood.splice(0, screenBlood.length - 24);
  }
  // ---- effect recipes
  let splatT = 0;
  function goreFx(e, hx, hy, hz, c, s) {
    if (BLOODLESS.test(e.type)) { spawnParts('spark', hx, hy, hz, 3, 1.2); return; }
    const pd = Math.hypot(hx - player.x, hy - player.y);
    if (time - splatT > 0.09) { splatT = time; Sfx.play.splat(pd); }
    if (pd < 1.4 && Math.random() < 0.35) screenGore(pd);
    for (let i = 0; i < 5; i++) vfx('mist', hx, hy, hz, { vx: c * rand(0.2, 0.8) + rand(-0.3, 0.3), vy: s * rand(0.2, 0.8) + rand(-0.3, 0.3), vz: rand(-0.1, 0.3), drag: 3, life: rand(0.35, 0.6), size: 0.035, grow: 2.5, col: '150,0,20', a: 0.55 });
    for (let i = 0; i < 2; i++) floorDecal(e.x + c * rand(0.15, 0.9) + rand(-0.15, 0.15), e.y + s * rand(0.15, 0.9) + rand(-0.15, 0.15), rand(0.05, 0.14), BLOOD, 0.85);
    const wh = cast(e.x, e.y, c, s);
    if (wh.dist < 1.3 && L.grid[wh.my * L.mw + wh.mx] !== DOOR) wallDecal(wh.mx, wh.my, wallFace(wh.side, c, s), wh.u, clamp(hz + rand(-0.1, 0.05), 0.05, L.ceilH - 0.05), rand(0.08, 0.16), BLOOD, 0.85, 0.45);
  }
  function wallHitFx(wh, c, s, wx, wy, wz) {
    if (L.grid[wh.my * L.mw + wh.mx] !== DOOR) {
      const f = wallFace(wh.side, c, s);
      wallDecal(wh.mx, wh.my, f, wh.u, wz, 0.06, [30, 26, 24], 0.35, 0.2);
      wallDecal(wh.mx, wh.my, f, wh.u, wz, 0.022, [12, 10, 10], 0.95, 0.1);
    }
    vfx('dust', wx, wy, wz, { vx: -c * 0.5, vy: -s * 0.5, vz: 0.15, drag: 2.5, life: 0.7, size: 0.03, grow: 2.2, col: '170,165,155', a: 0.4 });
    for (let i = 0; i < 2; i++) vfx('chip', wx, wy, wz, { shape: 'rect', vx: -c * rand(0.8, 1.8) + rand(-0.6, 0.6), vy: -s * rand(0.8, 1.8) + rand(-0.6, 0.6), vz: rand(0.5, 1.6), grav: 9, bounce: 0.3, spin: rand(-15, 15), life: 1.2, size: 0.008, col: '120,112,105' });
  }
  function explosionFx(x, y, z, r) {
    const fl = floorAt(x, y);
    vfx('ring', x, y, fl + 0.05, { shape: 'ring', life: 0.4, size: 0.15, grow: r * 10, col: '255,190,110', add: true, a: 0.8 });
    for (let i = 0; i < (FX_HIGH ? 10 : 5); i++) vfx('smoke', x + rand(-0.3, 0.3), y + rand(-0.3, 0.3), z + rand(0, 0.3), { vz: rand(0.35, 0.9), vx: rand(-0.5, 0.5), vy: rand(-0.5, 0.5), drag: 1.2, life: rand(1.6, 3), size: rand(0.12, 0.2), grow: 1.3, col: '58,52,52', a: 0.5, wob: 0.2 });
    for (let i = 0; i < (FX_HIGH ? 16 : 8); i++) { const a = rand(0, TAU), v = rand(1, 3.5); vfx('ember', x, y, z, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(1, 3), grav: 4, drag: 0.6, bounce: 0.3, life: rand(0.6, 1.5), size: 0.018, col: '255,170,60', add: true }); }
    for (let i = 0; i < 6; i++) { const a = rand(0, TAU), v = rand(1, 3); vfx('chip', x, y, z, { shape: 'rect', vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(1.5, 3.5), grav: 9, bounce: 0.35, spin: rand(-14, 14), life: rand(1.5, 2.5), size: 0.022, col: '70,62,58' }); }
    floorDecal(x, y, Math.min(0.55, r * 0.25), [20, 15, 14], 0.55, 0.4);
  }
  function muzzleFx(w) {
    if (w.type === 'melee') return;
    const p = player, c = Math.cos(p.a), s = Math.sin(p.a), rx = -s, ry = c;
    if (w.key !== 'flamethrower') for (let i = 0; i < 2; i++) vfx('smoke', p.x + c * 0.5 + rx * 0.05, p.y + s * 0.5 + ry * 0.05, p.eyeZ - 0.1, { vz: rand(0.15, 0.35), vx: c * 0.5, vy: s * 0.5, drag: 2, life: rand(0.8, 1.3), size: 0.03, grow: 2.5, col: '200,200,205', a: 0.22, wob: 0.2 });
    if (w.ammo === 'bullets' || w.ammo === 'shells') {
      const sh = w.ammo === 'shells';
      vfx('casing', p.x + c * 0.32 + rx * 0.12, p.y + s * 0.32 + ry * 0.12, p.eyeZ - 0.14, { shape: 'rect', vx: rx * rand(1.2, 2) + c * rand(0, 0.5), vy: ry * rand(1.2, 2) + s * rand(0, 0.5), vz: rand(1.2, 2.2), grav: 9, bounce: 0.45, spin: rand(-22, 22), life: 3, size: sh ? 0.02 : 0.013, col: sh ? '190,35,35' : '222,170,70', tink: true });
    }
  }
  function pickupFx(it) {
    const fl = floorAt(it.x, it.y), col = GLOW_OF[it.def.sprite] || (it.def.health ? '255,90,130' : it.def.armor ? '120,200,255' : it.def.weapon ? '255,200,90' : '255,230,150');
    for (let i = 0; i < 12; i++) { const a = rand(0, TAU), v = rand(0.4, 1.2); vfx('sparkle', it.x, it.y, fl + 0.2, { shape: 'star', vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(0.4, 1.4), drag: 2, life: rand(0.4, 0.8), size: 0.03, col, add: true }); }
    vfx('ring', it.x, it.y, fl + 0.02, { shape: 'ring', life: 0.35, size: 0.05, grow: 6, col, add: true, a: 0.7 });
  }
  function confettiFx(x, y, z, n) {
    const cols = ['255,79,184', '255,207,58', '80,220,255', '140,255,90', '255,255,255', '190,90,255'];
    for (let i = 0; i < n; i++) { const a = rand(0, TAU), v = rand(0.5, 3); vfx('confetti', x, y, z, { shape: 'rect', vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(1, 4), grav: 2.2, drag: 1.6, wob: 1.2, spin: rand(-14, 14), life: rand(2.5, 4), size: 0.016, col: cols[i % cols.length] }); }
  }
  function swirlFx(x, y, z, col) {
    for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; vfx('swirl', x + Math.cos(a) * 0.4, y + Math.sin(a) * 0.4, z + rand(0, 0.3), { vx: -Math.sin(a) * 1.2, vy: Math.cos(a) * 1.2, vz: rand(0.6, 1.4), drag: 1, life: rand(0.7, 1.2), size: 0.025, col, add: true }); }
    vfx('ring', x, y, floorAt(x, y) + 0.03, { shape: 'ring', life: 0.5, size: 0.1, grow: 5, col, add: true });
  }
  function killFx(e, src) {
    if (e.type === 'barrel') return;
    const fz = e.fz || 0;
    if (!BLOODLESS.test(e.type)) {
      floorDecal(e.x + rand(-0.1, 0.1), e.y + rand(-0.1, 0.1), rand(0.28, 0.42) * (e.def.boss ? 2.2 : 1), [92, 0, 12], 0.85, 0.35);
      spawnParts('drop', e.x, e.y, fz + e.z + e.def.h * 0.6, 18, 2.6); // a burst of blood
      Sfx.play.splat(Math.hypot(e.x - player.x, e.y - player.y)); screenGore(Math.hypot(e.x - player.x, e.y - player.y));
    }
    for (let i = 0; i < (e.def.boss ? 30 : 5); i++) vfx('wisp', e.x + rand(-0.2, 0.2), e.y + rand(-0.2, 0.2), fz + e.z + e.def.h * rand(0.3, 0.8), { vz: rand(0.3, 0.8), wob: 0.8, life: rand(1.2, 2.2), size: rand(0.02, 0.035), col: e.def.boss ? '255,210,90' : '210,120,255', add: true, a: 0.8 });
    if (e.def.boss) { confettiFx(e.x, e.y, fz + 1.4, 120); if (!online) slowMoT = 1.6; shake = Math.max(shake, 6); }
    if (src === 'player') {
      killMarkT = 0.35;
      killChain = killChain.filter(t => time - t < 1.6); killChain.push(time);
      const n = killChain.length;
      player.bestStreak = Math.max(player.bestStreak, n);
      if (n >= 2) { announce = { text: ['', '', 'DOUBLE KILL!', 'TRIPLE KILL!', 'MULTI KILL!'][n] || 'MASSACRE!', t: 0 }; Sfx.play.achievement(); Voice.say('combo', 0.5, true); const bonus = 50 * n; runScore += bonus; popup(e.x, e.y, (e.fz || 0) + e.def.h + 0.2, `+${bonus} COMBO`); }
    }
  }
  // little things that keep the world alive: embers, smoke, bubbles, rain splashes, fireflies, dust
  function ambientFx(dt) {
    const p = player, near = (x, y, r) => Math.abs(x - p.x) < r && Math.abs(y - p.y) < r, N = L.vfxN, hi = FX_HIGH;
    for (const d of L.decor) {
      if (!near(d.x, d.y, 9)) continue;
      const sp = d.def.sprite, fl = floorAt(d.x, d.y);
      if (sp === 'torch' && Math.random() < dt * (hi ? 8 : 3)) vfx('ember', d.x + rand(-0.05, 0.05), d.y + rand(-0.05, 0.05), fl + 0.86, { vz: rand(0.3, 0.8), life: rand(0.8, 1.6), size: 0.014, col: '225,130,255', add: true, wob: 0.6 });
      else if (sp === 'candelabra' && Math.random() < dt * (hi ? 4 : 1.5)) vfx('smoke', d.x + rand(-0.12, 0.12), d.y, fl + 0.74, { vz: 0.22, life: 2.4, size: 0.022, grow: 1.4, col: '210,205,215', a: 0.16, wob: 0.25 });
    }
    if (L.slimeTiles.length && Math.random() < dt * (hi ? 14 : 5)) {
      const i = L.slimeTiles[irand(0, L.slimeTiles.length - 1)], x = i % L.mw + rand(0.1, 0.9), y = ((i / L.mw) | 0) + rand(0.1, 0.9);
      if (near(x, y, 10)) {
        const fl = floorAt(x, y);
        vfx('bubble', x, y, fl + 0.01, { vz: 0.12, life: rand(0.5, 1), size: 0.022, grow: 0.8, col: '120,255,80', add: true, a: 0.6 });
        if (Math.random() < 0.35) vfx('steam', x, y, fl + 0.05, { vz: 0.18, life: 2, size: 0.08, grow: 1.5, col: '90,200,70', a: 0.12, wob: 0.3 });
      }
    }
    if (L.def.weather === 'rain') for (let i = 0; i < (hi ? 7 : 3); i++) {
      const x = p.x + rand(-6, 6), y = p.y + rand(-6, 6); if (solidAt(x, y, true)) continue;
      const z = floorAt(x, y);
      vfx('splash', x, y, z + 0.01, { vz: rand(0.6, 1.2), vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), grav: 6, life: 0.3, size: 0.01, col: '220,230,255', add: true, a: 0.7 });
      if (Math.random() < 0.3) vfx('ripple', x, y, z + 0.005, { shape: 'ripple', life: 0.7, size: 0.03, grow: 4, col: '190,205,240', a: 0.4 });
    }
    if (L.def.sky && L.def.weather !== 'rain' && (N.firefly || 0) < (hi ? 18 : 8) && Math.random() < dt * 6) {
      vfx('firefly', p.x + rand(-6, 6), p.y + rand(-6, 6), floorAt(p.x, p.y) + rand(0.15, 1.1), { vz: rand(-0.05, 0.05), wob: 1.1, life: rand(5, 9), size: 0.012, col: '210,255,110', add: true });
    }
    if (L.def.fireworks && Math.random() < dt * 0.6) { // fireworks over Happyland
      const a = rand(0, TAU), d = rand(7, 14), x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d, z = rand(3.2, 4.6);
      const col = ['255,60,170', '60,220,255', '255,220,60', '140,255,90', '255,255,255'][irand(0, 4)];
      for (let i = 0; i < (hi ? 46 : 22); i++) { const b = rand(0, TAU), c2 = rand(-1, 1), v = rand(1.6, 2.6); vfx('firework', x, y, z, { vx: Math.cos(b) * v * Math.sqrt(1 - c2 * c2), vy: Math.sin(b) * v * Math.sqrt(1 - c2 * c2), vz: c2 * v, grav: 1.2, drag: 0.9, life: rand(1.2, 2), size: 0.05, col, add: true }); }
      vfx('ring', x, y, z, { shape: 'ring', life: 0.4, size: 0.2, grow: 8, col, add: true, a: 0.6 });
      setTimeout(() => Sfx.play.pop(d + 6), 200 + d * 40);
    }
    if (L.def.butterflies && (N.butterfly || 0) < (hi ? 14 : 6) && Math.random() < dt * 4) { // butterflies in the park
      vfx('butterfly', p.x + rand(-6, 6), p.y + rand(-6, 6), floorAt(p.x, p.y) + rand(0.2, 1.2), { shape: 'rect', vz: rand(-0.05, 0.05), wob: 1.4, spin: 0, life: rand(6, 10), size: 0.018, col: ['255,120,200', '255,220,60', '120,200,255', '255,255,255'][irand(0, 3)] });
    }
    if (L.def.codeRain && (N.glyph || 0) < (hi ? 50 : 20) && Math.random() < dt * 20) { // green code falling in the server rooms
      vfx('glyph', p.x + rand(-6, 6), p.y + rand(-6, 6), L.ceilH - 0.05, { vz: -rand(0.5, 1.1), life: rand(2, 3.5), size: 0.012, col: '80,255,160', add: true, a: 0.8 });
    }
    for (const sh of L.shafts || []) if (near(sh.x, sh.y, 10) && Math.random() < dt * 3) vfx('mote', sh.x + rand(-0.35, 0.35), sh.y + rand(-0.35, 0.35), rand(0.2, L.ceilH - 0.2), { vx: rand(-0.03, 0.03), vy: rand(-0.03, 0.03), vz: rand(-0.04, 0.04), wob: 0.1, life: rand(3, 6), size: 0.007, col: '255,250,230', add: true, a: 0.7 });
    const fall = /^E1M1/.test(L.def.name) ? ['ash', '150,145,150', 0.25] : /^E2M3/.test(L.def.name) ? ['leaf', ['200,120,40', '120,170,50', '230,170,60'], 0.5] : /^E3M1/.test(L.def.name) ? ['petal', ['255,120,170', '255,220,235'], 0.5] : null;
    if (fall && (N[fall[0]] || 0) < (hi ? 40 : 16) && Math.random() < dt * 12) {
      const col = Array.isArray(fall[1]) ? fall[1][irand(0, fall[1].length - 1)] : fall[1];
      vfx(fall[0], p.x + rand(-6, 6), p.y + rand(-6, 6), Math.min(L.ceilH - 0.05, p.fz + rand(1, 1.8)), { shape: fall[0] === 'ash' ? 'dot' : 'rect', vz: -rand(0.12, 0.3), wob: 0.7, spin: rand(-3, 3), life: rand(5, 8), size: fall[0] === 'ash' ? 0.008 : 0.016, col, a: fall[2] + 0.4 });
    }
    if (hi && !L.def.sky && (N.mote || 0) < 30 && Math.random() < dt * 8) {
      vfx('mote', p.x + rand(-4, 4), p.y + rand(-4, 4), p.fz + rand(0.1, 1.2), { vx: rand(-0.04, 0.04), vy: rand(-0.04, 0.04), vz: rand(-0.02, 0.03), wob: 0.15, life: rand(5, 9), size: 0.006, col: '255,240,215', add: true, a: 0.45 });
    }
    for (const it of L.items) if (!it.taken && (it.def.power || it.def.key || it.def.sprite === 'soul') && near(it.x, it.y, 8) && Math.random() < dt * 3)
      vfx('sparkle', it.x + rand(-0.2, 0.2), it.y + rand(-0.2, 0.2), floorAt(it.x, it.y) + rand(0.1, 0.5), { shape: 'star', vz: 0.2, life: 0.6, size: 0.025, col: GLOW_OF[it.def.sprite] || '255,200,255', add: true });
    for (const e of L.enemies) if (!e.dead && e.burnT > 0 && near(e.x, e.y, 12) && Math.random() < dt * 14) {
      const z = (e.fz || 0) + e.z + e.def.h * rand(0.2, 0.9);
      vfx('ember', e.x + rand(-0.2, 0.2), e.y + rand(-0.2, 0.2), z, { vz: rand(0.5, 1.2), wob: 0.5, life: rand(0.5, 1), size: 0.016, col: '255,150,50', add: true });
      if (Math.random() < 0.4) vfx('smoke', e.x, e.y, z + 0.2, { vz: 0.5, life: 1.5, size: 0.06, grow: 1.5, col: '40,36,36', a: 0.35 });
    }
    for (const pr of L.projs) {
      if (pr.def.trail && Math.random() < dt * 40) vfx('smoke', pr.x, pr.y, pr.z, { vz: 0.1, life: rand(0.6, 1.1), size: 0.035, grow: 2, col: '170,165,165', a: 0.35, wob: 0.15 });
      else if ((pr.kind === 'gloom' || pr.kind === 'hex') && Math.random() < dt * 30) vfx('sparkle', pr.x + rand(-0.1, 0.1), pr.y + rand(-0.1, 0.1), pr.z + rand(-0.1, 0.1), { shape: 'star', life: 0.4, size: 0.02, col: pr.kind === 'gloom' ? '150,255,120' : '220,140,255', add: true });
    }
  }

  // ------------------------------------------------------------------ combat
  const bodies = () => L.avatars.length ? L.enemies.concat(L.avatars) : L.enemies;
  function shootables() { return bodies().filter(e => !e.dead); }

  // Physical particles: sparks off walls, blood spray, and gibs from explosive kills.
  function spawnParts(kind, x, y, z, n, spd = 1.5) {
    if (!S.fx[kind]) return;
    for (let i = 0; i < n && L.parts.length < 320; i++) {
      const a = rand(0, TAU), v = rand(0.3, 1) * spd;
      L.parts.push({ kind, x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(0.8, 2.6) * (kind === 'gib' ? 1.4 : 1),
        t: 0, life: kind === 'gib' ? rand(1.4, 2.2) : kind === 'spark' ? rand(0.2, 0.4) : rand(0.5, 0.8),
        spr: S.fx[kind][irand(0, S.fx[kind].length - 1)], size: kind === 'gib' ? rand(0.06, 0.1) : kind === 'spark' ? 0.035 : 0.045, bright: kind === 'spark' });
    }
  }
  function updateParts(dt) {
    for (const q of L.parts) {
      q.t += dt; q.vz -= 9 * dt;
      const nx = q.x + q.vx * dt, ny = q.y + q.vy * dt;
      if (!opaqueAt(nx, ny)) { q.x = nx; q.y = ny; } else { q.vx *= -0.3; q.vy *= -0.3; }
      q.z += q.vz * dt;
      const fl = floorAt(q.x, q.y) + q.size / 2;
      if (q.z < fl) {
        q.z = fl;
        if ((q.kind === 'gib' || q.kind === 'limb') && q.vz < -1) { q.vz *= -0.35; q.vx *= 0.6; q.vy *= 0.6; floorDecal(q.x, q.y, rand(0.05, q.kind === 'limb' ? 0.16 : 0.09), BLOOD, 0.85, 0.4); if (q.vz > 0.8) Sfx.play.splat(Math.hypot(q.x - player.x, q.y - player.y) + 3); }
        else { q.vz = 0; q.vx *= 0.5; q.vy *= 0.5; if (q.kind !== 'gib' && q.kind !== 'limb') q.t = Math.max(q.t, q.life - 0.12); }
      }
    }
    L.parts = L.parts.filter(q => q.t < q.life);
  }
  function spawnFx(kind, x, y, z, size, life = 0.35) { L.fx.push({ kind, x, y, z, frames: S.fx[kind], size, t: 0, life }); }

  // Pixel-accurate hit test: does a ray passing `lateral` world units to the side of the
  // enemy's centre go through a solid column of the sprite exactly as it is drawn?
  function spriteHit(e, lateral, slack = 0) {
    const spr = enemySprite(e);
    if (!spr) return Math.abs(lateral) < e.def.radius;
    if (!spr.cols) { // which columns of this frame contain any solid pixels
      spr.cols = new Uint8Array(spr.w);
      for (let x = 0; x < spr.w; x++) for (let y = 0; y < spr.h; y++) if (spr.data[y * spr.w + x]) { spr.cols[x] = 1; break; }
    }
    const worldW = e.def.h * spr.w / spr.h;
    const pad = Math.ceil(slack / worldW * spr.w);
    const col = Math.floor((0.5 - lateral / worldW) * spr.w);
    for (let x = col - pad; x <= col + pad; x++) if (x >= 0 && x < spr.w && spr.cols[x]) return true;
    return false;
  }

  function hitscan(ox, oy, ang, dmg, range, fromEnemy) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const wh = cast(ox, oy, c, s);
    const wallDist = Math.min(wh.dist, range);
    // the player's shots travel up or down with her aim; spread shots scatter vertically too
    let dev = ang - player.a; while (dev > Math.PI) dev -= TAU; while (dev < -Math.PI) dev += TAU;
    const slope = fromEnemy ? 0 : pitch / PROJ + (Math.random() * 2 - 1) * Math.abs(dev);
    let best = null, bestA = wallDist, bestLat = 0, bestZr = 0.5;
    for (const e of shootables()) {
      if (e === fromEnemy) continue;
      const vx = e.x - ox, vy = e.y - oy;
      const along = vx * c + vy * s;
      if (along <= 0 || along >= bestA) continue;
      const lateral = vy * c - vx * s; // + means the enemy is to the right of the shot
      let zr = 0.5;
      if (!fromEnemy && e.type !== 'barrel' && !e.remote) { // does the shot pass over its head or under its feet?
        const base = (e.fz || 0) + e.z - ((e.cut & 24) === 24 ? e.def.h * 0.4 : 0);
        zr = (player.eyeZ + slope * along - base) / e.def.h;
        if (zr < -0.1 || zr > 1.1) continue;
      }
      if (Math.abs(lateral) < e.def.h * 1.2 && spriteHit(e, lateral)) { best = e; bestA = along; bestLat = lateral; bestZr = zr; }
    }
    if (!fromEnemy) { // shooting a plant, cooler, tombstone or candelabra breaks it
      player.shotsF++;
      let bd = null, bdA = bestA;
      for (const d of L.decor) { if (!BREAK[d.def.sprite]) continue; const vx = d.x - ox, vy = d.y - oy, along = vx * c + vy * s; if (along <= 0 || along >= bdA) continue; if (Math.abs(vy * c - vx * s) < 0.22) { bd = d; bdA = along; } }
      if (bd) { hitDecor(bd, dmg, c, s); spawnFx('puff', ox + c * (bdA - 0.2), oy + s * (bdA - 0.2), player.eyeZ, 0.1, 0.3); return true; }
    }
    if (best && best.def.shield && !fromEnemy && best.state !== 'attack') { // the riot shield stops bullets from the front
      let da = Math.atan2(oy - best.y, ox - best.x) - (best.face ?? Math.atan2(oy - best.y, ox - best.x)); while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
      if (Math.abs(da) < 1.0) { const hx = ox + c * (bestA - 0.35), hy = oy + s * (bestA - 0.35); spawnParts('spark', hx, hy, (best.fz || 0) + best.def.h * 0.55, 4, 1.5); if (Math.random() < 0.4) Sfx.play.tink(); return true; }
    }
    if (best) {
      if (!fromEnemy) { player.shotsH++; if (dmg >= 10 && bestA < 4) shove(best, c, s, 0.9); }
      const zone = !fromEnemy && best.type !== 'barrel' && !best.remote ? hitZone(best, bestLat, bestZr) : 'torso';
      const hz = (best.fz || 0) + best.z + best.def.h * clamp(bestZr, 0.05, 0.95);
      if (zone === 'torso' || fromEnemy) damageEnemy(best, dmg, fromEnemy || 'player');
      else zoneHit(best, zone, dmg, c, s);
      const hx = ox + c * (bestA - 0.3), hy = oy + s * (bestA - 0.3);
      if (!best.remote) goreFx(best, hx, hy, hz, c, s);
      spawnFx(best.type === 'barrel' ? 'puff' : 'blood', hx, hy, hz, 0.12, 0.3);
      spawnParts(best.type === 'barrel' ? 'spark' : 'drop', hx, hy, hz, best.type === 'barrel' ? 4 : 9, 1.8);
      return true;
    }
    if (wallDist < range) {
      const wx = ox + c * (wallDist - 0.05), wy = oy + s * (wallDist - 0.05), wz = player.eyeZ + rand(-0.08, 0.08);
      if (!fromEnemy && wh.dist < range) wallHitFx(wh, c, s, wx, wy, wz);
      spawnFx('puff', wx, wy, wz, 0.1, 0.3);
      spawnParts('spark', wx - c * 0.05, wy - s * 0.05, wz, 4, 1.8);
    }
    return false;
  }

  function fireProjectile(kind, x, y, z, ang, owner) {
    if (owner === 'player' && kind !== 'grenade' && kind !== 'flame') player.shotsF++;
    if (online && online.inGame) {
      const rec = [kind, +x.toFixed(2), +y.toFixed(2), +z.toFixed(2), +ang.toFixed(3)];
      if (owner === 'player') { if (online.pp.length < 6) online.pp.push(rec); }
      else if (mode === 'coop' && online.host && owner && typeof owner === 'object' && !owner.remote && online.ep.length < 24) online.ep.push(rec);
    }
    const def = PROJECTILES[kind];
    L.projs.push({ kind, def, x: x + Math.cos(ang) * 0.4, y: y + Math.sin(ang) * 0.4, z, vx: Math.cos(ang) * def.speed, vy: Math.sin(ang) * def.speed,
      owner, frames: S.proj[kind], life: def.life || 6, age: 0, fireA: player.a, vz: owner === 'player' && !def.grav ? pitch / PROJ * def.speed : 0 });
  }

  function explode(pr) {
    const d = pr.def;
    spawnFx(d.fx, pr.x, pr.y, pr.z, d.fxSize, d.bfg ? 0.6 : 0.4);
    const pd = Math.hypot(pr.x - player.x, pr.y - player.y);
    if (d.sound) Sfx.play[d.sound] && Sfx.play[d.sound](pd);
    if (d.splash) {
      explosionFx(pr.x, pr.y, pr.z, d.splash);
      spawnParts('spark', pr.x, pr.y, pr.z, 10, 3);
      splash(pr.x, pr.y, d.splash, d.splashDmg, pr.owner);
      if (pd < 4) shake = Math.max(shake, (4 - pd) * 2);
    }
    if (d.bfg) { killTag = 'bfg'; tagKills = 0; bfgSpray(pr.fireA); if (pr.owner === 'player' && tagKills >= 5) unlock('bfg'); killTag = null; }
  }

  function splash(x, y, radius, maxDmg, owner) {
    if (owner === 'ghost') return;
    for (const e of shootables()) {
      if (e === owner || (e.remote && owner !== 'player')) continue;
      const dd = Math.hypot(e.x - x, e.y - y) - e.def.radius;
      if (dd < radius && losClear(x, y, e.x, e.y)) {
        const k = 1 - Math.max(0, dd) / radius, alive = !e.dead; damageEnemy(e, maxDmg * k, owner); shove(e, e.x - x, e.y - y, 5 * k);
        if (alive && e.dead && k > 0.45 && HUMANOID.has(e.type) && !e.def.boss) { const dx = e.x - x, dy = e.y - y, l = Math.hypot(dx, dy) || 1; for (const z of ['armL', 'armR', 'legL', 'legR', 'head']) if (Math.random() < 0.45) cutPart(e, z, dx / l, dy / l); } // blown to bits
      }
    }
    for (const d of L.decor.slice()) if (BREAK[d.def.sprite] && Math.hypot(d.x - x, d.y - y) < radius * 0.8 && losClear(x, y, d.x, d.y)) breakDecor(d);
    for (const e of L.enemies) if (e.dead && e.type !== 'barrel' && Math.hypot(e.x - x, e.y - y) < radius) shove(e, e.x - x, e.y - y, 4);
    const pd = Math.hypot(player.x - x, player.y - y) - 0.25;
    if (pd < radius && losClear(x, y, player.x, player.y)) (lastAttacker = owner === 'player' ? 'self' : typeOf(owner) || lastAttacker, damagePlayer)(maxDmg * (1 - Math.max(0, pd) / radius) * (owner === 'player' ? 0.5 : 1), x, y);
  }

  // The B.F.G. tears gloom-tracers through everything you're looking at.
  function bfgSpray(a) {
    for (const e of shootables()) {
      if (e.type === 'barrel') continue;
      const dx = e.x - player.x, dy = e.y - player.y, d = Math.hypot(dx, dy);
      let da = Math.abs(normAng(Math.atan2(dy, dx) - a)); if (da > Math.PI) da = TAU - da;
      if (d < 16 && da < Math.PI / 4 && losClear(player.x, player.y, e.x, e.y)) {
        let dmg = 0; for (let i = 0; i < 15; i++) dmg += irand(1, 8);
        damageEnemy(e, dmg * 3, 'player');
        spawnFx('gloomHit', e.x, e.y, e.z + e.def.h / 2, 0.7, 0.5);
      }
    }
  }

  function damageEnemy(e, dmg, src) {
    if (e.dead) return;
    if (e.remote) { hitAvatar(e, dmg, src); return; }
    if (mode === 'coop' && online && !online.host) { // the host runs the monsters: tell it what we hit
      if (src === 'player') { const i = L.enemies.indexOf(e); online.out.dmg[i] = (online.out.dmg[i] || 0) + dmg * mods.hit; if (e.type !== 'barrel' && Math.random() < e.def.pain) Sfx.play.enemyPain(Math.hypot(e.x - player.x, e.y - player.y)); }
      return;
    }
    if (src === 'player') dmg *= mods.hit;
    if (src === 'player' && player.pw.gloom > 0) dmg *= 2;
    if (e.type !== 'barrel') e.hitT = 0.12;
    if (src === 'player' && e.type !== 'barrel') { hitMarkT = 0.18; e.barT = 2.5; if (!e.maxHp) e.maxHp = Math.max(e.hp, e.def.hp); player.dmgDealt += Math.min(dmg, Math.max(0, e.hp)); }
    e.hp -= dmg;
    if (e.type === 'barrel') {
      if (e.hp <= 0) {
        e.dead = true;
        setTimeout(() => { // a beat later, like the real thing
          spawnFx('boom', e.x, e.y, 0.3, 1.1, 0.45); explosionFx(e.x, e.y, 0.3, 1.8);
          Sfx.play.explode(Math.hypot(e.x - player.x, e.y - player.y));
          const prevTag = killTag, prevKills = tagKills; killTag = 'barrel'; tagKills = 0;
          splash(e.x, e.y, 1.8, 120, src);
          if (tagKills >= 3) unlock('barrel'); killTag = prevTag; tagKills = prevKills + tagKills;
          const pd = Math.hypot(e.x - player.x, e.y - player.y); if (pd < 4) shake = Math.max(shake, (4 - pd) * 2);
        }, 120);
      }
      return;
    }
    const pd = Math.hypot(e.x - player.x, e.y - player.y);
    // infighting: a monster hurt by a different kind of monster turns on it
    if (src && typeof src === 'object' && src !== e && !src.dead && src.type !== e.type && src.type !== 'barrel') e.target = src;
    else if (src === 'player') e.target = null;
    if (e.state === 'idle') wake(e);
    if (e.hp <= 0) {
      e.dead = true; e.state = 'dead'; e.frame = 0; e.t = 0;
      Sfx.play[e.def.boss ? 'bossRoar' : 'enemyDie'](pd);
      const mz = (e.fz || 0) + e.z + e.def.h * 0.55;
      spawnParts('drop', e.x, e.y, mz, 8, 1.6);
      if (dmg >= 40 && !e.def.boss) spawnParts('gib', e.x, e.y, mz, 9, 2.2); // blown apart
      player.kills++; killFx(e, src); dropLoot(e); if (!(e.cut & 1)) shout(e, 'death', 0.6);
      if (e.def.kamikaze) setTimeout(() => popBlast(e), 80);
      if (e.champ) { Voice.say('champion', 0.5); bump('champs'); popup(e.x, e.y, (e.fz || 0) + e.def.h, '+250 CHAMPION', '255,200,80'); runScore += 250; }
      if (src === 'player') unlock('firstblood');
      if (/^wally|^boss$/.test(e.type)) bump('wally');
      if (e.type === 'bubbly' || e.type === 'mini') bump('orbs');
      if (src && typeof src === 'object' && src.type !== 'barrel' && !src.remote) bump('infight');
      if (e.type === 'boss') unlock('wallyprime');
      if (e.type === 'megaorb') unlock('popped');
      if (e.type === 'wallylive') { unlock('cancelled'); bump('wally'); }
      if (e.type === 'wallyexe') unlock('algorithm');
      if (killTag) tagKills++;
      if (e.def.boss) Voice.say('boss', 1, true); else if (src === 'player') Voice.say('kill', 0.18);
      if (e.def.boss) { L.bossDeadT = 3; msg = e.def.deathMsg || 'THE BOSS IS DOWN!'; msgT = 4; }
      if (e.def.split) { // pops into smaller orbs
        Sfx.play.pop(pd);
        for (const s of [-1, 1]) {
          const ox = e.x + s * 0.3, oy = e.y + s * 0.15;
          spawnEnemy(e.def.split, collides(ox, oy, 0.2, true) ? e.x : ox, collides(ox, oy, 0.2, true) ? e.y : oy);
          const m = L.enemies[L.enemies.length - 1]; m.fz = e.fz || 0; m.state = 'chase'; m.atkT = rand(0.4, 1); L.totalKills++;
        }
      }
      return;
    }
    if (Math.random() < e.def.pain && e.state !== 'attack-charge') { e.state = 'pain'; e.t = 0.22; Sfx.play.enemyPain(pd); }
  }

  function damagePlayer(dmg, fromX, fromY) {
    const p = player;
    if (p.dead || god || state !== 'playing' || p.pw.shroud > 0) return;
    dmg = Math.round(dmg * DIFFS[diff].dmg * mods.hurt);
    if (p.armor > 0) {
      const absorb = Math.min(p.armor, Math.floor(dmg * (p.armorType === 2 ? 0.5 : 0.333)));
      p.armor -= absorb; dmg -= absorb; if (p.armor <= 0) p.armorType = 0;
    }
    p.health -= dmg;
    if (dmg > 0) p.hurt = true;
    painFlash = Math.min(1, painFlash + dmg / 30);
    p.painT = 0.35;
    if (fromX !== undefined) {
      dmgDirs.push({ x: fromX, y: fromY, t: 0 }); if (dmgDirs.length > 6) dmgDirs.shift();
      let da = normAng(Math.atan2(fromY - p.y, fromX - p.x) - p.a); if (da > Math.PI) da -= TAU;
      p.faceLook = Math.abs(da) < 0.5 ? 0 : da < 0 ? 1 : 2; p.faceT = 1;
    }
    if (p.health <= 0) {
      p.health = 0; p.dead = true; Sfx.play.playerDie(); state = 'dead'; stateT = 0; Voice.say('death', 1, true);
    } else {
      Sfx.play.playerPain();
      if (p.health < 25 && !p.lowSaid) { p.lowSaid = true; Voice.say('lowHealth', 1, true); }
      else if (dmg >= 15) Voice.say('hurt', 0.5);
    }
  }

  function wake(e) {
    if (e.state !== 'idle') return;
    shout(e, 'sight', 0.55);
    e.state = 'chase'; e.atkT = rand(0.4, 1.2);
    const pd = Math.hypot(e.x - player.x, e.y - player.y);
    Sfx.play[e.def.sight] && Sfx.play[e.def.sight](pd);
    if (e.def.boss) { L.bossRef = e; }
  }

  // noise from the player's gun wakes nearby monsters
  function makeNoise() {
    for (const e of L.enemies) if (!e.dead && e.state === 'idle' && Math.hypot(e.x - player.x, e.y - player.y) < 10) wake(e);
  }

  // ------------------------------------------------------------------ AI
  // Breadth-first "flow field" from the player so monsters can chase around corners and through doors.
  function updateFlow() {
    const pt = Math.floor(player.y) * L.mw + Math.floor(player.x);
    if (pt === L.flowFrom) return;
    L.flowFrom = pt;
    const n = L.mw * L.mh;
    const dist = L.flow && L.flow.length === n ? L.flow : new Int16Array(n);
    dist.fill(-1);
    const q = new Int32Array(n); let h = 0, t = 0;
    q[t++] = pt; dist[pt] = 0;
    while (h < t) {
      const c = q[h++], cx = c % L.mw, cy = (c / L.mw) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= L.mw || ny >= L.mh) continue;
        const ni = ny * L.mw + nx;
        if (dist[ni] !== -1) continue;
        const tile = L.grid[ni];
        if ((tile > 0 && tile !== DOOR) || L.block[ni]) continue;
        if (tile === DOOR) { const dr = L.doors.get(ni); if ((dr.secret || dr.lock) && dr.open < 0.9) continue; }
        if (Math.abs(L.fh[ni] - L.fh[c]) > STEP) continue;
        dist[ni] = dist[c] + 1; q[t++] = ni;
      }
    }
    L.flow = dist;
  }

  function enemyMoveDir(e) {
    const mx = Math.floor(e.x), my = Math.floor(e.y), here = L.flow ? L.flow[my * L.mw + mx] : -1;
    const pdx = player.x - e.x, pdy = player.y - e.y, pd = Math.hypot(pdx, pdy);
    if (here <= 1 || here === -1 && pd < 3) return [pdx / pd, pdy / pd];
    let best = null, bestD = here;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = mx + dx, ny = my + dy, ni = ny * L.mw + nx;
      const d = L.flow[ni];
      if (d < 0 || d >= bestD) continue;
      if (dx && dy && (L.flow[my * L.mw + nx] < 0 || L.flow[ny * L.mw + mx] < 0)) continue;
      best = [nx + 0.5 - e.x, ny + 0.5 - e.y]; bestD = d;
    }
    if (!best) return [pdx / pd, pdy / pd];
    const bl = Math.hypot(best[0], best[1]) || 1;
    return [best[0] / bl, best[1] / bl];
  }

  function enemyAttack(e) {
    const d = e.def, p = player, tg = e.target && !e.target.dead ? e.target : null;
    const tx = tg ? tg.x : p.x, ty = tg ? tg.y : p.y;
    const pd = Math.hypot(tx - e.x, ty - e.y), playerDist = Math.hypot(p.x - e.x, p.y - e.y);
    const veiled = !tg && p.pw.veil > 0;              // Shadow Veil: monsters can barely see her
    const ang = Math.atan2(ty - e.y, tx - e.x) + (veiled ? rand(-0.5, 0.5) : 0);
    const z = (e.fz || 0) + e.z + d.h * 0.6;
    const hurt = dmg => tg ? damageEnemy(tg, dmg, e) : damagePlayer(dmg, e.x, e.y);
    if ((e.cut & 6) === 6 && d.attack !== 'melee' && d.attack !== 'charge') { // no arms: all it can do is headbutt
      if (pd < d.radius + 0.95) { hurt(irand(3, 8)); Sfx.play.punch(); } else shout(e, 'noarms', 0.4); return;
    }
    if (d.kamikaze) { if (pd < 1.7) { e.dead = true; e.state = 'dead'; e.frame = 0; e.t = 0; popBlast(e); } return; }
    Sfx.play[d.atkSound] && Sfx.play[d.atkSound](playerDist);
    if (d.slogans && playerDist < 14) { msg = `"${SLOGANS[irand(0, SLOGANS.length - 1)]}"`; msgT = 1.6; }
    if (d.attack === 'hitscan') {
      // a monster standing in the line of fire takes the hit instead (and gets angry)
      const c = Math.cos(ang), s = Math.sin(ang);
      let blocker = null, best = pd;
      for (const o of shootables()) {
        if (o === e || o === tg || o.type === 'barrel') continue;
        const vx = o.x - e.x, vy = o.y - e.y, along = vx * c + vy * s;
        if (along > 0.3 && along < best && Math.abs(vy * c - vx * s) < o.def.radius) { blocker = o; best = along; }
      }
      const acc = clamp(1 - pd / 16, 0.15, 0.6) * (veiled ? 0.25 : 1);
      if (blocker) damageEnemy(blocker, irand(d.dmg[0], d.dmg[1]), e);
      else if (Math.random() < (tg ? 0.7 : acc) && losClear(e.x, e.y, tx, ty)) hurt(irand(d.dmg[0], d.dmg[1]));
      spawnFx('splash', e.x + Math.cos(ang) * 0.5, e.y + Math.sin(ang) * 0.5, z, 0.25, 0.25);
    } else if (d.attack === 'proj' || d.attack === 'melee') {
      if (d.melee && pd < d.radius + 0.95) { hurt(irand(d.melee[0], d.melee[1])); Sfx.play.punch(); return; }
      if (d.attack === 'melee') return;
      const n = d.count || 1;
      for (let i = 0; i < n; i++) fireProjectile(d.proj, e.x, e.y, z, ang + (i - (n - 1) / 2) * (d.spread || 0), e);
    } else if (d.attack === 'live') {
      const enraged = e.hp < d.hp / 2, bz = (e.fz || 0) + 1.1, roll = Math.random();
      if (roll < 0.45) { // spotlight blasts straight at you
        const n = enraged ? 5 : 3; for (let i = 0; i < n; i++) fireProjectile('spot', e.x, e.y, bz, ang + (i - (n - 1) / 2) * 0.09, e);
      } else if (roll < 0.8) { // a ring of applause in every direction
        const n = enraged ? 18 : 12; for (let i = 0; i < n; i++) fireProjectile('shout', e.x, e.y, (e.fz || 0) + 0.5, ang + i * TAU / n, e);
        Sfx.play.coach(playerDist);
      } else if (L.enemies.filter(o => !o.dead && o.type === 'wallyfit').length < 5) { // calls in the backing dancers
        for (const sgn of [-1, 1]) { spawnEnemy('wallyfit', e.x + Math.cos(ang + sgn * 1.4) * 1.2, e.y + Math.sin(ang + sgn * 1.4) * 1.2); const m = L.enemies[L.enemies.length - 1]; m.state = 'chase'; m.fz = floorAt(m.x, m.y); L.totalKills++; }
        msg = '"PUT YOUR HANDS TOGETHER FOR THE DANCERS!"'; msgT = 2;
      } else fireProjectile('phone', e.x, e.y, bz, ang, e);
    } else if (d.attack === 'exe') { // WALLY.EXE: pixel storms, glitch teleports and a swarm of drones
      const enraged = e.hp < d.hp / 2, bz = (e.fz || 0) + 1.2, roll = Math.random();
      if (roll < 0.4) { const n = enraged ? 9 : 7; for (let i = 0; i < n; i++) fireProjectile('pixel', e.x, e.y, bz, ang + (i - (n - 1) / 2) * 0.1, e); }
      else if (roll < 0.65) { // glitch: vanish and reappear somewhere near her, then a ring of pixels
        for (let k = 0; k < 12; k++) {
          const nx = p.x + rand(-6, 6), ny = p.y + rand(-6, 6);
          if (Math.hypot(nx - p.x, ny - p.y) < 3.5 || collides(nx, ny, d.radius, false, e.fz, STEP)) continue;
          swirlFx(e.x, e.y, e.fz || 0, '60,255,200'); e.x = nx; e.y = ny; e.fz = floorAt(nx, ny); swirlFx(nx, ny, e.fz, '60,255,200'); break;
        }
        const n = enraged ? 16 : 12; for (let i = 0; i < n; i++) fireProjectile('pixel', e.x, e.y, (e.fz || 0) + 0.6, i * TAU / n, e);
        e.glitchT = 0.6;
      } else if (L.enemies.filter(o => !o.dead && o.type === 'drone').length < 6) {
        for (const sgn of [-1, 1]) { spawnEnemy('drone', e.x + Math.cos(ang + sgn * 1.4) * 1.3, e.y + Math.sin(ang + sgn * 1.4) * 1.3); const m = L.enemies[L.enemies.length - 1]; m.state = 'chase'; m.fz = floorAt(m.x, m.y); L.totalKills++; }
        msg = '"DEPLOYING CONTENT CREATORS."'; msgT = 2;
      } else fireProjectile('phone', e.x, e.y, bz, ang, e);
    } else if (d.attack === 'megaorb') {
      const enraged = e.hp < d.hp / 2, bz = (e.fz || 0) + e.z + 0.6;
      if (Math.random() < 0.65) { const n = enraged ? 9 : 6; for (let i = 0; i < n; i++) fireProjectile('sun', e.x, e.y, bz, ang + (i - (n - 1) / 2) * 0.14, e); }
      else if (L.enemies.filter(o => !o.dead && o.type === 'mini').length < 8) { // spits out mini orbs
        Sfx.play.pop(playerDist);
        for (const s of [-1, 1]) { spawnEnemy('mini', e.x + Math.cos(ang + s * 1.2) * 0.9, e.y + Math.sin(ang + s * 1.2) * 0.9); const m = L.enemies[L.enemies.length - 1]; m.state = 'chase'; m.fz = floorAt(m.x, m.y); L.totalKills++; }
      }
    } else if (d.attack === 'boss') {
      const enraged = e.hp < d.hp / 2, bz = (e.fz || 0) + 0.6;
      if (Math.random() < 0.5) {
        fireProjectile('phone', e.x, e.y, bz, ang, e);
        if (enraged) { fireProjectile('phone', e.x, e.y, bz, ang - 0.25, e); fireProjectile('phone', e.x, e.y, bz, ang + 0.25, e); }
      } else {
        const n = enraged ? 7 : 5;
        for (let i = 0; i < n; i++) fireProjectile('notif', e.x, e.y, bz, ang + (i - (n - 1) / 2) * 0.12, e);
      }
    }
  }

  function updateEnemies(dt) {
    if (mode === 'coop' && online && !online.host) { puppetEnemies(dt); return; }
    updateFlow();
    const p = player;
    for (const e of L.enemies) {
      e.animT += dt;
      if (e.dead) {
        if (e.type !== 'barrel' && e.frame < S.enemy[e.type].die.length - 1) { e.t += dt; if (e.t > 0.12) { e.t = 0; e.frame++; } }
        continue;
      }
      if (e.burnT > 0) { // on fire: damage ticks and flickering flames
        e.burnT -= dt; e.burnTick = (e.burnTick || 0) - dt;
        if (e.burnTick <= 0) { e.burnTick = 0.3; Sfx.play.burn(Math.hypot(e.x - player.x, e.y - player.y)); damageEnemy(e, irand(2, 5), e.burnBy || 'player'); spawnFx('flameHit', e.x + rand(-0.15, 0.15), e.y + rand(-0.15, 0.15), e.z + e.def.h * rand(0.3, 0.8), 0.3, 0.3); }
        if (e.dead) continue;
      }
      if (e.state === 'static') continue;
      const d = e.def;
      if (e.target && e.target.dead) e.target = null;
      const tg = e.target;
      const pdx = (tg ? tg.x : p.x) - e.x, pdy = (tg ? tg.y : p.y) - e.y, pd = Math.hypot(pdx, pdy) || 0.001;
      const sk = DIFFS[diff];
      if (e.state === 'idle') {
        e.seeT -= dt;
        if (e.seeT <= 0) { e.seeT = 0.3; if (pd < (p.pw.veil > 0 ? 6 : 22) && losClear(e.x, e.y, p.x, p.y)) wake(e); }
        continue;
      }
      if (e.dodgeT > 0) { // quick sidestep
        e.dodgeT -= dt;
        const c = Math.cos(p.a), s = Math.sin(p.a), sp = 6 * dt * e.dodgeDir;
        tryMove(e, -s * sp, c * sp, d.radius * 0.8); e.fz = floorAt(e.x, e.y);
      }
      if (e.state === 'pain') { e.t -= dt; if (e.t <= 0) e.state = 'chase'; continue; }
      if (e.state === 'attack') {
        e.t -= dt;
        if (!e.fired && e.t < 0.22) { e.fired = true; if (!p.dead) { lastAttacker = e.type; enemyAttack(e); } }
        if (e.t <= 0) { e.state = 'chase'; e.atkT = rand(d.cooldown[0], d.cooldown[1]) * sk.cool * (d.boss && e.hp < d.hp / 2 ? 0.6 : 1) * (e.buffT > 0 ? 0.65 : 1); }
        continue;
      }
      if (e.state === 'attack-charge') { // influencer skull dive
        e.t -= dt;
        const steps = 3;
        for (let i = 0; i < steps; i++) {
          const nx = e.x + e.vx * dt / steps, ny = e.y + e.vy * dt / steps;
          const hx = tg ? tg.x : p.x, hy = tg ? tg.y : p.y;
          if (Math.hypot(hx - nx, hy - ny) < d.radius + (tg ? tg.def.radius : 0.3)) { const dm = irand(d.melee[0], d.melee[1]); if (tg) damageEnemy(tg, dm, e); else damagePlayer(dm, e.x, e.y); e.state = 'chase'; e.atkT = rand(1, 2); break; }
          if (collides(nx, ny, d.radius, true, e.fz, 0.9)) { e.state = 'chase'; e.atkT = rand(1, 2); break; }
          e.x = nx; e.y = ny;
        }
        if (e.t <= 0) { e.state = 'chase'; e.atkT = rand(d.cooldown[0], d.cooldown[1]) * sk.cool; }
        continue;
      }
      // chase
      e.atkT -= dt;
      if (e.atkT <= 0 && !p.dead) {
        const inMelee = d.attack === 'melee' ? pd < d.radius + 0.95 : true;
        if (inMelee && pd < d.range && losClear(e.x, e.y, e.x + pdx, e.y + pdy)) {
          if (d.attack === 'charge') {
            e.state = 'attack-charge'; e.t = 1.3; e.vx = pdx / pd * 7; e.vy = pdy / pd * 7;
            Sfx.play.skull(pd); continue;
          }
          e.state = 'attack'; e.t = 0.5; e.fired = false; continue;
        }
        e.atkT = 0.2;
      }
      // move (Bridezilla storms in at double speed once she's close)
      const rush = d.charge && pd < 6 ? d.charge / d.speed : 1;
      const keepDist = d.attack === 'melee' || d.attack === 'charge' || d.charge ? d.radius + 0.55 : 1.4;
      if (pd > keepDist) {
        const [mx, my] = tg ? [pdx / pd, pdy / pd] : enemyMoveDir(e);
        const sp = d.speed * sk.speed * mods.speed * dt * rush * (e.buffT > 0 ? 1.35 : 1) * (e.speedK || 1);
        const nx = e.x + mx * sp, ny = e.y + my * sp;
        // open doors in the way
        const ti = Math.floor(ny) * L.mw + Math.floor(nx);
        if (L.grid[ti] === DOOR) { const dr = L.doors.get(ti); if (dr.open < 0.9 && !dr.secret) toggleDoor(dr, true); }
        if (!tryMove(e, mx * sp, my * sp, d.radius * 0.8)) e.atkT = Math.min(e.atkT, 0.1);
        e.fz = floorAt(e.x, e.y);
      }
    }
    // keep monsters from stacking
    const live = L.enemies.filter(e => !e.dead && e.type !== 'barrel');
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = (a.def.radius + b.def.radius) * 0.9;
      if (d > 0.001 && d < min) {
        const push = (min - d) / 2, ux = dx / d * push, uy = dy / d * push;
        if (!collides(a.x - ux, a.y - uy, a.def.radius * 0.8)) { a.x -= ux; a.y -= uy; }
        if (!collides(b.x + ux, b.y + uy, b.def.radius * 0.8)) { b.x += ux; b.y += uy; }
      }
    }
  }

  function updateProjectiles(dt) {
    const p = player;
    for (const pr of L.projs) {
      pr.life -= dt; pr.age += dt;
      if (pr.def.grav) { // a lobbed grenade: falls, bounces off walls and floors, then goes off
        pr.vz -= pr.def.grav * dt;
        let nx = pr.x + pr.vx * dt, ny = pr.y + pr.vy * dt;
        if (opaqueAt(nx, pr.y)) { pr.vx *= -0.5; nx = pr.x; if (Math.random() < 0.5) Sfx.play.tink(); }
        if (opaqueAt(pr.x, ny)) { pr.vy *= -0.5; ny = pr.y; }
        pr.x = nx; pr.y = ny; pr.z += pr.vz * dt;
        const fl = floorAt(pr.x, pr.y) + 0.07;
        if (pr.z < fl) { pr.z = fl; if (pr.vz < -1.2) { pr.vz *= -0.45; Sfx.play.tink(); } else pr.vz = 0; pr.vx *= 0.7; pr.vy *= 0.7; }
        if (pr.owner !== 'ghost' && pr.age > 0.15) for (const e of bodies()) if (!e.dead && e !== pr.owner && !(e.remote && pr.owner !== 'player') && Math.hypot(e.x - pr.x, e.y - pr.y) < e.def.radius + 0.1) { pr.life = 0; break; }
        if (Math.random() < dt * 30) vfx('ember', pr.x, pr.y, pr.z + 0.06, { vz: 0.3, life: 0.3, size: 0.012, col: '255,120,200', add: true });
        if (pr.life <= 0) { const prev = killTag; killTag = 'nade'; tagKills = 0; explode(pr); if (pr.owner === 'player' && tagKills >= 3) unlock('grenadier'); killTag = prev; pr.done = true; }
        continue;
      }
      const steps = 4;
      for (let i = 0; i < steps && !pr.done; i++) {
        const nx = pr.x + pr.vx * dt / steps, ny = pr.y + pr.vy * dt / steps;
        if (pr.def.ricochet && opaqueAt(nx, ny) && (pr.bounces || 0) < pr.def.ricochet) { // bounce off the wall
          if (opaqueAt(nx, pr.y)) pr.vx = -pr.vx; if (opaqueAt(pr.x, ny)) pr.vy = -pr.vy; if (!opaqueAt(nx, pr.y) && !opaqueAt(pr.x, ny)) { pr.vx = -pr.vx; pr.vy = -pr.vy; }
          pr.bounces = (pr.bounces || 0) + 1; pr.hit = null; spawnParts('spark', pr.x, pr.y, pr.z, 4, 1.5); Sfx.play.tink(); break;
        }
        if (opaqueAt(nx, ny) || pr.z < floorAt(nx, ny) - 0.02) { explode(pr); pr.done = true; break; }
        pr.x = nx; pr.y = ny; if (pr.vz) { pr.z += pr.vz * dt / steps; if (!L.def.sky && pr.z > L.ceilH) { explode(pr); pr.done = true; break; } }
        if (pr.owner !== 'player' && pr.owner !== 'ghost') {
          if (Math.hypot(p.x - pr.x, p.y - pr.y) < 0.3 + pr.def.size / 2) {
            lastAttacker = typeOf(pr.owner) === '_ep' ? lastAttacker : typeOf(pr.owner);
            damagePlayer(irand(pr.def.dmg[0], pr.def.dmg[1]), pr.x - pr.vx, pr.y - pr.vy);
            if (pr.def.slow && !p.pw.shroud) p.slowT = Math.max(p.slowT, pr.def.slow);
            explode(pr); pr.done = true; break;
          }
        }
        if (pr.owner === 'ghost') { // another player's shot, shown for looks: their game decides what it hits
          if (Math.hypot(p.x - pr.x, p.y - pr.y) < 0.3 + pr.def.size / 2 || bodies().some(e => !e.dead && Math.hypot(e.x - pr.x, e.y - pr.y) < e.def.radius + pr.def.size / 2)) { explode(pr); pr.done = true; }
          continue;
        }
        for (const e of bodies()) {
          if (e.dead || e === pr.owner) continue;
          if (e.remote && pr.owner !== 'player') continue; // other players dodge monster shots in their own game
          if (pr.owner.ghostEnemy) continue;
          if (pr.owner !== 'player' && e.type !== 'barrel' && pr.owner.type === e.type) continue; // same kind don't hurt each other
          if (Math.hypot(e.x - pr.x, e.y - pr.y) < e.def.radius + pr.def.size / 2) {
            if (pr.def.pierce) { // flies on through; each monster is hit once
              pr.hit = pr.hit || new Set(); if (pr.hit.has(e)) continue; pr.hit.add(e);
              damageEnemy(e, irand(pr.def.dmg[0], pr.def.dmg[1]), pr.owner);
              spawnParts(e.type === 'barrel' ? 'spark' : 'drop', pr.x, pr.y, pr.z, 5, 1.4); Sfx.play.punch(); continue;
            }
            if (pr.owner === 'player' && !pr.counted) { pr.counted = true; player.shotsH++; }
            damageEnemy(e, irand(pr.def.dmg[0], pr.def.dmg[1]), pr.owner);
            if (pr.def.ignite && !e.dead) { e.burnT = Math.max(e.burnT || 0, pr.def.ignite); e.burnBy = pr.owner; }
            explode(pr); pr.done = true; break;
          }
        }
      }
      if (pr.def.trail && Math.random() < 0.6) spawnFx('puff', pr.x, pr.y, pr.z, 0.08, 0.3);
      if (pr.life <= 0) { if (pr.def.quiet && !pr.done) spawnFx('flameHit', pr.x, pr.y, pr.z, pr.def.size * (1 + pr.age * pr.def.grow), 0.25); pr.done = true; }
    }
    L.projs = L.projs.filter(pr => !pr.done);
    for (const f of L.fx) f.t += dt;
    L.fx = L.fx.filter(f => f.t < f.life);
  }

  // ------------------------------------------------------------------ player
  const keys = {};
  let mouseDX = 0, mouseDY = 0, fireHeld = false;
  const touch = { mx: 0, my: 0, turn: 0, pitch: 0, rx: 0, ry: 0, fire: false };
  // ---- gamepad (Xbox / PlayStation / Switch / phone controllers, standard mapping)
  const pad = { mx: 0, my: 0, turn: 0, pitch: 0, fire: false, run: false };
  let padPrev = [], padConnected = false, padNavT = 0;
  const synthKey = code => { const key = { Enter: 'Enter', Escape: 'Escape' }[code] || code; window.dispatchEvent(new KeyboardEvent('keydown', { code, key })); window.dispatchEvent(new KeyboardEvent('keyup', { code, key })); };
  function pollGamepad(dt) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null; for (const g of pads) if (g && g.connected) { gp = g; break; }
    if (!gp) { if (padConnected) { padConnected = false; pad.mx = pad.my = pad.turn = 0; pad.fire = pad.run = false; } return; }
    if (!padConnected) { padConnected = true; msg = 'Controller connected'; msgT = 2; Sfx.init(); }
    const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), hit = i => b(i) && !padPrev[i];
    const ax = i => { const v = gp.axes[i] || 0; return Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82; };
    if (state === 'playing' && !paused) {
      pad.mx = ax(0); pad.my = -ax(1); pad.turn = ax(2) * Math.abs(ax(2)) * 4.2 * (LOOK_SENS / 1.5) * dt; // curve: fine aim near the centre
      pad.pitch = ax(3) * Math.abs(ax(3)) * 150 * (LOOK_SENS / 1.5) * dt;
      pad.fire = b(7) || b(6); // either trigger fires
      pad.run = b(10);
      if (hit(2)) useAction();
      if (hit(0)) jumpReq = true;
      if (hit(1)) throwNade();
      if (hit(4)) cycleWeapon(-1);
      if (hit(5) || hit(3)) cycleWeapon(1);
      if (hit(8)) automap = !automap;
      if (hit(9)) paused = true;
      if (hit(12)) cycleWeapon(-1);
      if (hit(13)) cycleWeapon(1);
    } else {
      pad.mx = pad.my = pad.turn = 0; pad.fire = pad.run = false;
      // menus: d-pad or left stick move, A chooses, Start resumes
      const ly = ax(1), lx = ax(0);
      padNavT -= dt;
      const dir = b(12) || ly < -0.6 ? 'ArrowUp' : b(13) || ly > 0.6 ? 'ArrowDown' : b(14) || lx < -0.6 ? 'ArrowLeft' : b(15) || lx > 0.6 ? 'ArrowRight' : null;
      if (dir && padNavT <= 0) { synthKey(dir); padNavT = 0.22; } else if (!dir) padNavT = 0;
      if (hit(9) && paused) paused = false;
      else if (hit(0) || hit(9)) synthKey('Enter');
    }
    padPrev = gp.buttons.map(x => x.pressed);
  }

  function switchWeapon(key) {
    const p = player;
    if (!p.weapons[key] || p.cur === key || p.next) return;
    p.next = key; p.switchT = 0.25;
  }
  function weaponSlot(slot) {
    const p = player;
    const options = WEAPONS.filter(w => w.slot === slot && p.weapons[w.key]);
    if (!options.length) return;
    // pressing the key again while a weapon is still coming up moves on to the next one in the slot
    const base = p.next || p.cur, curIdx = options.findIndex(w => w.key === base);
    const pick = options[(curIdx + 1) % options.length].key;
    if (p.next) { if (pick !== p.cur) p.next = pick; } else switchWeapon(pick);
  }
  function cycleWeapon(dir) {
    const p = player;
    const owned = WEAPONS.filter(w => p.weapons[w.key]);
    let i = owned.findIndex(w => w.key === p.cur);
    for (let k = 0; k < owned.length; k++) {
      i = (i + dir + owned.length) % owned.length;
      const w = owned[i];
      if (!w.ammo || p.ammo[w.ammo] >= w.cost) { switchWeapon(w.key); return; }
    }
  }
  function bestWeapon() {
    const p = player;
    const order = ['gatling', 'machinegun', 'coffin', 'shotgun', 'hexcaster', 'batbow', 'doomscroll', 'flamethrower', 'pistol', 'rocketlauncher', 'launcher', 'bfg', 'chainsaw', 'knuckles'];
    for (const k of order) { const w = weaponByKey(k); if (w && p.weapons[k] && (!w.ammo || p.ammo[w.ammo] >= w.cost)) return k; }
    return 'knuckles';
  }

  // yoga instructors flow sideways out of the line of fire
  function yogaDodge() {
    const p = player, c = Math.cos(p.a), s = Math.sin(p.a);
    for (const e of L.enemies) {
      if (e.dead || !e.def.dodge || e.state === 'idle' || e.dodgeT > 0) continue;
      const vx = e.x - p.x, vy = e.y - p.y, along = vx * c + vy * s, lat = vy * c - vx * s;
      if (along > 0 && along < 14 && Math.abs(lat) < 1.2 && Math.random() < e.def.dodge) { e.dodgeT = 0.35; e.dodgeDir = lat >= 0 ? 1 : -1; }
    }
  }
  function doFire(w) {
    muzzleFx(w);
    if (online && online.inGame) online.shots++;
    const p = player;
    if (w.type !== 'melee') p.usedGun = true;
    if (w.type !== 'melee') yogaDodge();
    if (w.ammo) p.ammo[w.ammo] -= w.cost;
    Sfx.play[w.sound] && Sfx.play[w.sound]();
    if (w.after) setTimeout(() => Sfx.play[w.after](), 350);
    p.flashT = w.type === 'melee' ? 0 : 0.07;
    if (w.type !== 'melee') { lightBoost = 0.25; makeNoise(); }
    if (w.kick) shake = Math.max(shake, w.kick * 0.5);
    if (w.type === 'melee') {
      const c = Math.cos(p.a), s = Math.sin(p.a);
      let best = null, bestA = w.range;
      for (const e of shootables()) {
        const vx = e.x - p.x, vy = e.y - p.y, along = vx * c + vy * s;
        if (along <= 0 || along > bestA + e.def.radius) continue;
        if (spriteHit(e, vy * c - vx * s, 0.08)) { best = e; bestA = along; }
      }
      if (best) { spawnParts('drop', best.x - c * 0.3, best.y - s * 0.3, (best.fz || 0) + best.z + best.def.h * 0.6, 6, 1.5); if (w.knock) shove(best, c, s, w.knock); damageEnemy(best, irand(w.damage[0], w.damage[1]) * (p.berserk ? 10 : 1), 'player'); if (p.berserk || w.knock) shake = Math.max(shake, 2); Sfx.play.punch(); spawnFx('blood', best.x - c * 0.3, best.y - s * 0.3, best.z + best.def.h * 0.6, 0.12, 0.3); }
      else Sfx.play.swing();
    } else if (w.type === 'hitscan') {
      const accurate = w.pellets === 1 && p.refireT <= 0;
      for (let i = 0; i < w.pellets; i++) hitscan(p.x, p.y, p.a + (accurate ? 0 : rand(-w.spread, w.spread)), irand(w.damage[0], w.damage[1]), 40);
    } else if (w.type === 'zap') {
      // lightning to the first monster you aim at, then hops to the nearest others
      const c = Math.cos(p.a), s = Math.sin(p.a), wall = Math.min(cast(p.x, p.y, c, s).dist, w.range);
      let tgt = null, best = wall;
      for (const e of shootables()) {
        const vx = e.x - p.x, vy = e.y - p.y, along = vx * c + vy * s;
        if (along <= 0 || along >= best) continue;
        if (Math.abs(vy * c - vx * s) < e.def.radius + 0.25) { tgt = e; best = along; }
      }
      const from = [p.x + c * 0.5, p.y + s * 0.5, p.eyeZ - 0.12], pts = [from];
      if (!tgt) { pts.push([p.x + c * (wall - 0.1), p.y + s * (wall - 0.1), p.eyeZ]); spawnParts('spark', p.x + c * (wall - 0.1), p.y + s * (wall - 0.1), p.eyeZ, 5, 2); }
      let dmg = irand(w.damage[0], w.damage[1]); const hit = new Set();
      for (let k = 0; tgt && k <= w.chain; k++) {
        hit.add(tgt); pts.push([tgt.x, tgt.y, (tgt.fz || 0) + tgt.z + tgt.def.h * 0.55]);
        damageEnemy(tgt, dmg, 'player'); spawnFx('hexHit', tgt.x, tgt.y, (tgt.fz || 0) + tgt.z + tgt.def.h * 0.55, 0.45, 0.3);
        dmg = Math.round(dmg * 0.7);
        let next = null, nd = 4.5;
        for (const e of shootables()) { if (hit.has(e)) continue; const d = Math.hypot(e.x - tgt.x, e.y - tgt.y); if (d < nd && losClear(tgt.x, tgt.y, e.x, e.y)) { next = e; nd = d; } }
        tgt = next;
      }
      L.bolts.push({ pts, t: 0, life: 0.18 });
    } else if (w.type === 'projectile') {
      fireProjectile(w.projectile, p.x, p.y, p.eyeZ - 0.12, p.a + (w.projSpread ? rand(-w.projSpread, w.projSpread) : 0), 'player');
    }
    p.refireT = 0.5;
  }

  function updatePlayer(dt) {
    const p = player;
    if (p.dead) { p.eyeZ = Math.max(p.fz + 0.12, p.eyeZ - dt * 0.6); pitch *= 0.92; HOR = VIEW_H / 2 + pitch; return; }
    // turning
    const turnSpeed = 2.8, prevA = p.a;
    if (keys.ArrowLeft) p.a -= turnSpeed * dt;
    if (keys.ArrowRight) p.a += turnSpeed * dt;
    const ease = Math.min(1, dt * 10); // edge-hold turning eases in and out instead of snapping
    touch.rxs = (touch.rxs || 0) + (touch.rx - (touch.rxs || 0)) * ease; touch.rys = (touch.rys || 0) + (touch.ry - (touch.rys || 0)) * ease;
    p.a += mouseDX * 0.0028 * (LOOK_SENS / 1.5) + touch.turn + pad.turn + touch.rxs * 2.6 * LOOK_SENS * dt; mouseDX = 0; touch.turn = 0;
    pitch -= touch.rys * 110 * LOOK_SENS * dt;
    // look up and down: mouse, a vertical drag on the right of the screen, the right stick, or R / F (C centres)
    pitch -= mouseDY * 0.25 * (LOOK_SENS / 1.5) + touch.pitch + (pad.pitch || 0) - ((keys.KeyR || keys.PageUp ? 90 : 0) - (keys.KeyF || keys.PageDown ? 90 : 0)) * dt;
    mouseDY = 0; touch.pitch = 0; pitch = clamp(pitch, -PITCH_MAX, PITCH_MAX); HOR = VIEW_H / 2 + pitch;
    p.a = normAng(p.a);
    { let da = p.a - prevA; if (da > Math.PI) da -= TAU; if (da < -Math.PI) da += TAU; // the gun lags behind when turning
      p.swayX = (p.swayX || 0) + (clamp(-da / Math.max(dt, 0.001) * 4, -16, 16) - (p.swayX || 0)) * Math.min(1, dt * 8); }
    // movement
    let fwd = 0, str = 0;
    if (keys.KeyW || keys.ArrowUp) fwd += 1;
    if (keys.KeyS || keys.ArrowDown) fwd -= 1;
    if (keys.KeyD) str += 1;
    if (keys.KeyA) str -= 1;
    fwd += touch.my + pad.my; str += touch.mx + pad.mx;
    const len = Math.hypot(fwd, str);
    if (len > 1) { fwd /= len; str /= len; }
    const speed = (keys.ShiftLeft || keys.ShiftRight || pad.run ? 6.5 : 4.4) * dt * (p.slowT > 0 ? 0.5 : 1) * (p.pw.wings > 0 ? 1.3 : 1);
    p.nadeCd = Math.max(0, p.nadeCd - dt);
    p.slowT = Math.max(0, p.slowT - dt);
    const c = Math.cos(p.a), s = Math.sin(p.a);
    const dx = (c * fwd - s * str) * speed, dy = (s * fwd + c * str) * speed;
    if (dx || dy) tryMove(p, dx, dy, 0.24);
    const moving = Math.min(1, Math.hypot(fwd, str));
    p.move += (moving - p.move) * Math.min(1, dt * 8);
    p.bobT += dt * 9 * p.move;
    p.stepAcc = (p.stepAcc || 0) + Math.hypot(dx, dy);
    if (p.stepAcc > 1.15) {
      p.stepAcc = 0;
      if (Math.abs(p.fz - floorAt(p.x, p.y)) < 0.05) {
        Sfx.play.step();
        // walking through blood leaves red footprints for a few steps
        const dec = L.fdec.get(Math.floor(p.y) * L.mw + Math.floor(p.x));
        if (dec) { const dd = dec[(((p.y * 64) | 0) & 63) * 64 + (((p.x * 64) | 0) & 63)]; if ((dd >>> 24) > 120 && (dd & 255) > ((dd >> 8) & 255) * 2) p.bloodSteps = 8; }
        if (p.bloodSteps > 0) { p.bloodSteps--; p.foot = -(p.foot || 1); const c = Math.cos(p.a), s = Math.sin(p.a); floorDecal(p.x - s * 0.08 * p.foot - c * 0.2, p.y + c * 0.08 * p.foot - s * 0.2, 0.04, [96, 0, 10], 0.25 + p.bloodSteps * 0.07, 0.15); }
      }
    }
    // climb stairs smoothly, ride lifts, and drop off ledges with a little gravity
    const ground = floorAt(p.x, p.y);
    if (jumpReq) { jumpReq = false; if (Math.abs(p.fz - ground) < 0.04 && p.vz === 0) { p.vz = p.pw.wings > 0 ? 5 : 3.6; Sfx.play.jump(); } }
    if (ground > p.fz && p.vz <= 0) { p.fz = Math.min(ground, p.fz + dt * 2.8); p.vz = 0; }
    else if (ground < p.fz || p.vz > 0) { p.vz -= 9.8 * dt; p.fz = Math.max(ground, p.fz + p.vz * dt); if (p.fz <= ground) { if (p.vz < -2) p.landT = 0.3; p.vz = 0; } }
    if (p.landT > 0) p.landT -= dt;
    p.eyeZ = p.fz + 0.5 + Math.sin(p.bobT * 2) * 0.012 * p.move;
    for (const k in p.pw) if (p.pw[k] > 0) { p.pw[k] -= dt; if (p.pw[k] <= 0) { p.pw[k] = 0; msg = { veil: 'The Shadow Veil fades.', shroud: 'The Night Shroud fades.', mask: 'The gas mask runs out.', gloom: 'Double Gloom wears off.', wings: 'The bat wings fold away.' }[k]; msgT = 2; } }
    p.rageT = Math.max(0, p.rageT - dt);

    // toxic slime burns
    if (L.slime[Math.floor(p.y) * L.mw + Math.floor(p.x)] && p.pw.mask <= 0 && p.fz < 0.05) {
      p.slimeT -= dt;
      if (p.slimeT <= 0) { p.slimeT = 1; lastAttacker = 'slime'; damagePlayer(5); }
    } else p.slimeT = 0.4;

    // pickups
    for (const it of L.items) {
      if (it.taken || Math.hypot(it.x - p.x, it.y - p.y) > 0.55) continue;
      if (it.def.rose) { it.taken = true; takeRose(it); pickupFx(it); netTake(it); continue; }
      if (pickup(it.def)) { it.taken = true; if (!it.def.weapon && !it.extra) p.items++; pickupFlash = 0.35; pickupFx(it); netTake(it); }
    }

    // weapon switching
    if (p.switchT > 0) {
      p.switchT -= dt;
      if (p.switchT <= 0 && p.next) { p.cur = p.next; p.next = null; p.switchT = 0.25; }
      if (p.switchT < 0) p.switchT = 0;
    }
    const w = weaponByKey(p.cur);
    p.cooldown -= dt; p.flashT -= dt; p.refireT -= dt;
    if (p.windupT > 0) {
      p.windupT -= dt;
      if (p.windupT <= 0) doFire(w);
    }
    const trigger = fireHeld || keys.ControlLeft || keys.ControlRight || touch.fire || touch.fire2 || touch.fireTap || pad.fire;
    if (trigger && p.cooldown <= 0 && p.switchT <= 0 && p.windupT <= 0) {
      touch.fireTap = false;
      if (w.ammo && p.ammo[w.ammo] < w.cost) {
        Sfx.play.empty(); p.cooldown = 0.3;
        const b = bestWeapon(); if (b !== p.cur) switchWeapon(b);
      } else {
        p.cooldown = w.cooldown; p.fireT = 0;
        if (w.windup) { p.windupT = w.windup; Sfx.play[w.windupSound](); p.cooldown = w.cooldown + w.windup; }
        else doFire(w);
      }
    }
    // fire animation phase 0..1
    if (p.cooldown > 0) { const total = w.cooldown + (w.windup || 0); p.firePhase = clamp(1 - p.cooldown / total, 0.001, 1); if (p.firePhase >= 1) p.firePhase = 0; }
    else p.firePhase = 0;

    // HUD face: glance around while idle
    p.faceT -= dt; if (p.faceT <= 0) { p.faceT = rand(0.8, 2); p.faceLook = Math.random() < 0.6 ? 0 : irand(1, 2); }
    p.painT -= dt; p.grinT -= dt;
  }

  function pickup(def) { // eslint-disable-line no-param-reassign
    const p = player;
    let used = false;
    if (def.health) {
      const max = def.overheal ? 200 : 100;
      if (p.health < max) { p.health = Math.min(max, p.health + def.health); used = true; }
    }
    if (def.armor) {
      if (p.armor < def.armor) { p.armor = def.armor; p.armorType = def.armorType; used = true; }
    }
    if (def.key) { p.keys[def.key] = true; used = true; Voice.say('key', 0.8, true); }
    if (def.nades) { if (p.nades < 10) { p.nades = Math.min(10, p.nades + def.nades); used = true; } }
    if (def.power) { p.pw[def.power] = def.time; used = true; p.grinT = 1.5; Voice.say('power', 1, true); }
    if (def.berserk) { p.berserk = true; p.rageT = 10; p.health = Math.max(p.health, 100); used = true; switchWeapon('knuckles'); Voice.say('rage', 1, true); }
    if (p.health > 50) p.lowSaid = false;
    if (def.weapon) {
      const w = weaponByKey(def.weapon);
      if (!p.weapons[def.weapon]) { p.weapons[def.weapon] = true; switchWeapon(def.weapon); p.grinT = 1.5; Sfx.play.weaponUp(); msg = `You got the ${w.name}!`; msgT = 3; used = true; Voice.say('weapon', 1, true); }
      else def = { ...def, msg: `Picked up ammo for the ${w.name}.`, weapon: null };
    }
    if (def.ammo) {
      for (const [k, v] of Object.entries(def.ammo)) {
        if (p.ammo[k] < AMMO_TYPES[k].max) { p.ammo[k] = Math.min(AMMO_TYPES[k].max, p.ammo[k] + Math.max(1, Math.round(v * DIFFS[diff].ammo))); used = true; }
      }
    }
    if (used) {
      if (!def.weapon) { (def.power || def.berserk || def.key ? Sfx.play.weaponUp : Sfx.play.pickup)(); const qs = PICKUP_QUIPS[def.sprite]; msg = qs && Math.random() < 0.6 ? qs[irand(0, qs.length - 1)] : def.msg; msgT = 2.5; }
    }
    return used;
  }

  // ------------------------------------------------------------------ cheats
  const CHEATS = {
    gothmode: () => { god = !god; return god ? 'GOTH MODE: invulnerable to positivity.' : 'Goth mode off.'; },
    allblack: () => { for (const w of WEAPONS) player.weapons[w.key] = true; for (const k in AMMO_TYPES) player.ammo[k] = AMMO_TYPES[k].max; player.armor = 200; player.armorType = 2; return 'ALL BLACK EVERYTHING. Full arsenal.'; },
    nightfall: () => { completeLevel(); return 'Skipping level...'; },
  };
  function cheatKey(ch) {
    if (mode === 'dm') return;
    cheatBuf = (cheatBuf + ch).slice(-12);
    for (const [code, fn] of Object.entries(CHEATS)) if (cheatBuf.endsWith(code)) { msg = fn() + '  (achievements off this run)'; msgT = 3; cheatBuf = ''; cheated = true; }
  }

  // ------------------------------------------------------------------ game flow
  let carry = null, interStats = null;
  // Progress is saved on this device at the start of every level, so the title screen can offer
  // CONTINUE. (Browser storage can be unavailable, e.g. private windows - then it simply isn't offered.)
  const SAVE_KEY = 'goffichick-save-v1', DIFF_KEY = 'goffichick-difficulty';
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  { const d = store.get(DIFF_KEY); if (Number.isInteger(d) && d >= 0 && d < DIFFS.length) diff = d; } // includes NIGHTMARE
  // ---- achievements (kept on this device; cheating switches them off for that run)
  const ACHIEVEMENTS = [
    { id: 'firstblood', name: 'FIRST BLOOD', desc: 'Defeat your first monster' },
    { id: 'unsub', name: 'UNSUBSCRIBER', desc: 'Defeat 100 Wally Men of any kind', count: 'wally', need: 100 },
    { id: 'pooper', name: 'PARTY POOPER', desc: 'Pop 25 Bubbly or Mini Orbs', count: 'orbs', need: 25 },
    { id: 'secrets', name: 'SECRET KEEPER', desc: 'Find 5 secrets', count: 'secrets', need: 5 },
    { id: 'infight', name: 'INFIGHTING INSTIGATOR', desc: 'Let monsters finish each other off 10 times', count: 'infight', need: 10 },
    { id: 'knuckle', name: 'BARE KNUCKLE GOTH', desc: 'Finish a level using only fists or the chainsaw' },
    { id: 'untouch', name: 'UNTOUCHABLE', desc: 'Finish a level without taking any damage' },
    { id: 'speed', name: 'SPEED GOTH', desc: "Finish a level in half its par time" },
    { id: 'collector', name: 'COLLECTOR', desc: 'Collect every item in a level' },
    { id: 'ultra', name: 'PROPERLY ULTRA', desc: 'Finish a level on Ultra Goth' },
    { id: 'bfg', name: "BIG FREAKIN' GLOOM", desc: 'Defeat 5 monsters with one BFG shot' },
    { id: 'barrel', name: 'BARREL OF LAUGHS', desc: 'Defeat 3 monsters with one barrel' },
    { id: 'wallyprime', name: "WALLY'S WORST DAY", desc: 'Defeat Wally Prime' },
    { id: 'popped', name: 'POPPED', desc: 'Defeat the Mega Smiley' },
    { id: 'cancelled', name: 'CANCELLED', desc: 'Defeat Wally Live!' },
    { id: 'weekly', name: 'WEEKLY WARRIOR', desc: 'Finish a weekly challenge' },
    { id: 'rose', name: 'A ROSE BY ANY OTHER NAME', desc: 'Find a hidden black rose' },
    { id: 'roses', name: 'ROSE COLLECTOR', desc: 'Find every black rose in the campaign' },
    { id: 'horde10', name: 'HORDE SURVIVOR', desc: 'Reach wave 10 in Horde mode' },
    { id: 'grenadier', name: 'GRENADIER', desc: 'Take out 3 monsters with one grenade' },
    { id: 'champion', name: 'CHAMPION SLAYER', desc: 'Defeat 10 champion monsters', count: 'champs', need: 10 },
    { id: 'smash', name: 'BULL IN A GOTH SHOP', desc: 'Smash 25 plants, coolers and tombstones', count: 'smash', need: 25 },
    { id: 'nightmare', name: 'LIVING NIGHTMARE', desc: 'Finish the game on Nightmare Goth' },
    { id: 'algorithm', name: 'BEAT THE ALGORITHM', desc: 'Defeat WALLY.EXE' },
    { id: 'heed', name: 'HEED HUNTER', desc: 'Land 25 heed shots', count: 'heads', need: 25 },
    { id: 'theend', name: 'THE END OF CHEER', desc: 'Finish the whole game' },
  ];
  const ACH_KEY = 'goffichick-achievements';
  const ach = store.get(ACH_KEY) || { unlocked: {}, counts: {} };
  let cheated = false, achToasts = [], killTag = null, tagKills = 0;
  function unlock(id) {
    if (cheated || mode === 'test' || mode === 'custom' || ach.unlocked[id]) return;
    const a = ACHIEVEMENTS.find(x => x.id === id); if (!a) return;
    ach.unlocked[id] = new Date().toISOString().slice(0, 10); store.set(ACH_KEY, ach);
    achToasts.push({ a, t: 0 }); Sfx.play.achievement();
  }
  function bump(counter, n = 1) {
    if (cheated || mode === 'test' || mode === 'custom') return;
    ach.counts[counter] = (ach.counts[counter] || 0) + n; store.set(ACH_KEY, ach);
    for (const a of ACHIEVEMENTS) if (a.count === counter && ach.counts[counter] >= a.need) unlock(a.id);
  }
  function saveProgress() { store.set(SAVE_KEY, { level: levelIndex, diff, carry }); }
  // ---- scoring, best times and the high-score table (kept on this device)
  const SCORES_KEY = 'goffichick-scores', TIMES_KEY = 'goffichick-best-times', DIFF_MUL = [0.6, 1, 1.5, 2.2];
  let runScore = 0, lastEntry = -1;
  const highScores = () => store.get(SCORES_KEY) || [];
  // with the online leaderboard on, every finished game can be posted; otherwise only device top-10s
  const qualifies = sc => sc > 0 && (Leaderboard.enabled || highScores().length < 10 || sc > highScores()[highScores().length - 1].score);
  let scoresTab = Leaderboard.enabled ? 'world' : 'device', posted = null, postStatus = '';
  function openScores() { state = 'scores'; stateT = 0; scoresTab = Leaderboard.enabled ? 'world' : 'device'; Leaderboard.refresh(); }
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
  const NAME_KEY = 'goffichick-name';
  let initials = (Array.isArray(store.get(NAME_KEY)) && store.get(NAME_KEY).length === 3) ? store.get(NAME_KEY) : [6, 14, 5], initCur = 0, nameFor = 'score', savedInitials = null; // "GOF"
  function saveHighScore() {
    const name = initials.map(i => ALPHA[i]).join('').trim() || '???';
    if (nameFor === 'weekly') { postWeekly(name); return; }
    if (nameFor === 'online') { store.set(NAME_KEY, initials); nameFor = 'score'; state = 'title'; stateT = 0; ignoreTapUntil = performance.now() + 300; return; }
    if (nameFor === 'room') { const code = initials.map(i => ALPHA[i]).join('').replace(/ /g, ''); initials = savedInitials; nameFor = 'score'; ignoreTapUntil = performance.now() + 300; if (code.length === 3) joinOnline(code); else { state = 'title'; msg = 'Room codes have 3 letters.'; msgT = 3; } return; }
    const list = highScores(); const entry = { name, score: runScore, diff, date: new Date().toISOString().slice(0, 10) };
    list.push(entry); list.sort((a, b) => b.score - a.score);
    lastEntry = list.indexOf(entry); store.set(SCORES_KEY, list.slice(0, 10));
    openScores();
    if (Leaderboard.enabled) {
      posted = { name, score: runScore }; postStatus = 'Posting your score to the world leaderboard...';
      Leaderboard.submit(entry).then(ok => { postStatus = ok ? 'Your score is on the world leaderboard!' : "Couldn't post online (no connection?). It's saved on this device."; });
    }
  }
  function savedGame() { const s = store.get(SAVE_KEY); return s && LEVELS[s.level] ? s : null; }
  function beginPlay() { state = 'playing'; Sfx.init(); Sfx.startMusic(); }
  function startGame() {
    levelIndex = 0; carry = null; god = false; runScore = 0; cheated = false;
    loadLevel(0, null); saveProgress(); beginPlay();
  }
  function continueGame() {
    const sv = savedGame(); if (!sv) return startGame();
    levelIndex = sv.level; diff = sv.diff; carry = sv.carry; god = false; runScore = (carry && carry.score) || 0; cheated = false;
    loadLevel(levelIndex, carry); beginPlay();
  }
  // title menu
  let menuSel = 0;
  let menuPage = 'main', onKind = 'dm', onLvl = 0;
  // online play is switched off until the online server is set up again (add #online to the address to try it anyway)
  const ONLINE_READY = /online/.test(location.hash) || (() => { try { return localStorage.getItem('goffichick-online') === 'on'; } catch (e) { return false; } })();
  function menuItems() {
    if (menuPage === 'options') return [
      { id: 'gfx', lr: true, text: `GRAPHICS   ${QUALITY > 1 ? 'HD' : 'CLASSIC'}` },
      { id: 'fx', lr: true, text: `EFFECTS   ${FX_HIGH ? 'HIGH' : 'LOW (faster)'}` },
      { id: 'look', lr: true, text: `LOOK SPEED   <  ${LOOK_SENS}  >` },
      { id: 'musicMode', lr: true, text: `MUSIC   ${musicMode === 'shuffle' ? 'SHUFFLE (level theme, then random)' : 'LEVEL THEMES ONLY'}` },
      { id: 'voice', lr: true, text: Voice.available() ? `VOICES   ${Voice.on ? 'ON' : 'OFF'}` : 'VOICES   (not available in this browser)' },
      { id: 'optBack', text: 'BACK' },
    ];
    if (menuPage === 'online') {
      const it = [{ id: 'onKind', lr: true, text: `GAME   <  ${onKind === 'dm' ? 'DEATHMATCH' : 'CO-OP CAMPAIGN'}  >` }];
      if (onKind === 'coop') it.push({ id: 'onLvl', lr: true, text: `START AT   <  ${LEVELS[onLvl].name.split(':')[0]}  >` });
      it.push({ id: 'onName', text: `YOUR NAME   ${myName()}` }, { id: 'onHost', text: 'HOST A NEW GAME' }, { id: 'onJoin', text: "JOIN A FRIEND'S GAME" }, { id: 'onBack', text: 'BACK' });
      return it;
    }
    const items = [], sv = savedGame();
    if (sharedLvl) items.push({ id: 'shared', text: `PLAY FRIEND'S LEVEL: ${sharedLvl.name}` });
    if (sv) items.push({ id: 'continue', text: `CONTINUE  -  ${LEVELS[sv.level].name.split(':')[0]}, ${DIFFS[sv.diff].name}` });
    items.push({ id: 'new', text: 'NEW GAME' });
    items.push({ id: 'weekly', text: `WEEKLY CHALLENGE  -  WEEK ${weeklyInfo().week}` });
    items.push({ id: 'horde', text: `HORDE MODE  -  BEST WAVE ${store.get(HORDE_KEY) || 0}` });
    items.push({ id: 'editor', text: 'LEVEL EDITOR' });
    items.push({ id: 'online', text: ONLINE_READY ? 'PLAY ONLINE  -  DEATHMATCH / CO-OP' : 'PLAY ONLINE  -  COMING SOON IN AN UPDATE' });
    items.push({ id: 'diff', lr: true, text: `DIFFICULTY   <  ${DIFFS[diff].name}  >` });
    items.push({ id: 'options', text: 'OPTIONS  -  GRAPHICS, LOOK SPEED, VOICE' });
    items.push({ id: 'scores', text: 'HIGH SCORES' });
    items.push({ id: 'ach', text: `ACHIEVEMENTS   ${Object.keys(ach.unlocked).length} / ${ACHIEVEMENTS.length}` });
    return items;
  }
  function menuActivate(item, dir = 1) {
    if (item.id === 'continue') continueGame();
    else if (item.id === 'new') startGame();
    else if (item.id === 'shared') startSolo('custom', customLevelDef(sharedLvl));
    else if (item.id === 'weekly') openWeekly();
    else if (item.id === 'horde') startSolo('horde', DM_LEVELS[0]);
    else if (item.id === 'editor') { state = 'editor'; stateT = 0; editor.open(); }
    else if (item.id === 'options') { menuPage = 'options'; menuSel = 0; Sfx.play.switch(); }
    else if (item.id === 'musicMode') { musicMode = musicMode === 'shuffle' ? 'level' : 'shuffle'; try { localStorage.setItem('goffichick-music', musicMode); } catch (e) {} Sfx.init(); Sfx.play.switch(); }
    else if (item.id === 'optBack') { menuPage = 'main'; menuSel = 0; Sfx.play.switch(); }
    else if (item.id === 'look') { setLook(nextLook(dir)); Sfx.init(); Sfx.play.switch(); }
    else if (item.id === 'online' && !ONLINE_READY) { msg = 'Online play is not available right now - it will be in an update!'; msgT = 4; Sfx.play.switch(); }
    else if (item.id === 'online') { menuPage = 'online'; menuSel = 0; Sfx.play.switch(); if (!Net.enabled) { msg = 'Online play needs the Supabase settings in js/leaderboard.js.'; msgT = 4; } }
    else if (item.id === 'onBack') { menuPage = 'main'; menuSel = 0; Sfx.play.switch(); }
    else if (item.id === 'onKind') { onKind = onKind === 'dm' ? 'coop' : 'dm'; Sfx.play.switch(); }
    else if (item.id === 'onLvl') { onLvl = (onLvl + dir + LEVELS.length) % LEVELS.length; Sfx.play.switch(); }
    else if (item.id === 'onName') { nameFor = 'online'; state = 'enterName'; initCur = 0; stateT = 0; }
    else if (item.id === 'onHost') hostOnline();
    else if (item.id === 'onJoin') { nameFor = 'room'; savedInitials = initials; initials = [0, 0, 0]; state = 'enterName'; initCur = 0; stateT = 0; }
    else if (item.id === 'scores') { openScores(); lastEntry = -1; posted = null; postStatus = ''; }
    else if (item.id === 'ach') { state = 'achievements'; stateT = 0; }
    else if (item.id === 'gfx') { QUALITY = QUALITY > 1 ? 1 : 1.5; renderScale = 1; fxDrop = 0; try { localStorage.setItem('goffichick-quality', String(QUALITY)); } catch (e) {} fitScreen(); Sfx.init(); Sfx.play.switch(); }
    else if (item.id === 'fx') { FX_HIGH = !FX_HIGH; fxDrop = 0; slowFor = 0; if (renderScale !== 1) { renderScale = 1; fitScreen(); } try { localStorage.setItem('goffichick-fx', FX_HIGH ? 'high' : 'low'); } catch (e) {} Sfx.init(); Sfx.play.switch(); }
    else if (item.id === 'voice') { Voice.toggle(); Sfx.init(); Sfx.play.switch(); if (Voice.on) Voice.say('levelStart', 1, true); }
    else { diff = (diff + dir + DIFFS.length) % DIFFS.length; store.set(DIFF_KEY, diff); Sfx.init(); Sfx.play.switch(); }
    if (state === 'playing') lockPointer();
  }
  const MENU_Y = 100, MENU_DY = 10;
  // a click / tap on the title screen: pick the menu row under it, or the highlighted one
  // On-screen arrow pad for the title menu (phones have no arrow keys): up / down move the
  // highlight, left / right change the difficulty, OK chooses the highlighted option.
  function titlePad() {
    const cx = W - 62, cy = 196, s = 26, g = 30;
    return [
      { id: 'up', x: cx - s / 2, y: cy - g - s / 2, w: s, h: s, glyph: 'up' },
      { id: 'down', x: cx - s / 2, y: cy + g - s / 2, w: s, h: s, glyph: 'down' },
      { id: 'left', x: cx - g - s / 2, y: cy - s / 2, w: s, h: s, glyph: 'left' },
      { id: 'right', x: cx + g - s / 2, y: cy - s / 2, w: s, h: s, glyph: 'right' },
      { id: 'ok', x: cx - s / 2, y: cy - s / 2, w: s, h: s, glyph: 'OK' },
    ];
  }
  function drawTitlePad() {
    for (const b of titlePad()) {
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2, r = b.w / 2;
      ctx.fillStyle = b.id === 'ok' ? 'rgba(255,45,149,0.75)' : 'rgba(20,0,24,0.7)';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ff4fb8'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#ffffff';
      if (b.id === 'ok') { label('OK', cx, cy + 3.5, '#ffffff', 'center', 9); continue; }
      const a = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 }[b.id];
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7);
      ctx.lineTo(cx + Math.cos(a + 2.4) * 6, cy + Math.sin(a + 2.4) * 6);
      ctx.lineTo(cx + Math.cos(a - 2.4) * 6, cy + Math.sin(a - 2.4) * 6);
      ctx.closePath(); ctx.fill();
    }
  }
  function menuMove(dir) { const n = menuItems().length; menuSel = (menuSel + dir + n) % n; Sfx.init(); Sfx.play.switch(); }
  function titleTap(gx, gy) {
    const items = menuItems();
    if (gx !== undefined && kofiName()) {
      const k = TIP_RECT(), on = gx >= k.x - 4 && gx <= k.x + k.w + 4 && gy >= k.y - 4 && gy <= k.y + k.h + 4;
      const a = jarArea(), zone = gx >= a.x0 - 50 && gx <= a.x1 + 50 && gy >= a.y0 - 14 && gy <= a.y1 + 14;
      if (on || zone || Math.hypot(gx - jar.x, gy - jar.y) < 70) { // a click at (or chasing) the jar
        if (jar.tired > 0 || jar.dodges >= 3) { jar.tired = 0; jar.dodges = 0; jar.say = 'Thank you!'; jar.sayT = 2; openTipJar(); return; } // 4th click: Ko-fi
        jar.dodges++; jar.cool = 0; jarDodge(gx, gy);
        if (jar.dodges >= 3) { jar.tired = 1; jar.say = 'Okay, okay... tip me!'; jar.sayT = 1; jar.vx *= 0.3; jar.vy *= 0.3; }
        return;
      }
    }
    if (gx !== undefined) { // the arrow pad
      const pb = titlePad().find(b => gx >= b.x - 4 && gx <= b.x + b.w + 4 && gy >= b.y - 4 && gy <= b.y + b.h + 4);
      if (pb) {
        const it = items[Math.min(menuSel, items.length - 1)];
        if (pb.id === 'up') menuMove(-1);
        else if (pb.id === 'down') menuMove(1);
        else if (pb.id === 'left' || pb.id === 'right') { if (it.lr) menuActivate(it, pb.id === 'left' ? -1 : 1); }
        else menuActivate(it, 1);
        return;
      }
    }
    const row = Math.floor((gy - (MENU_Y - 8)) / MENU_DY);
    if (gx !== undefined && gx > 8 && gx < 215 && row >= 0 && row < items.length) { menuSel = row; menuActivate(items[row], 1); }
    else if (gx !== undefined && kofiName() && (() => { const a = jarArea(); return gx >= a.x0 - 50 && gx <= a.x1 + 50 && gy >= a.y0 - 14 && gy <= a.y1 + 14; })()) return; // chasing the tip jar shouldn't start a game
    else menuActivate(items[Math.min(menuSel, items.length - 1)], 1);
  }
  // ---------------------------------------------------------------- weekly challenge, shared and test levels
  const TWISTS = [
    { id: 'pistol', name: 'PISTOL START', desc: 'Only your fists and the pistol. Find the rest on the way.' },
    { id: 'turbo', name: 'TURBO MONSTERS', desc: 'Every monster moves 40% faster.' },
    { id: 'glass', name: 'GLASS CANNON', desc: 'You hit twice as hard - and so do they.' },
    { id: 'dark', name: 'LIGHTS OUT', desc: 'The power is off. Stay close to the torches.' },
    { id: 'rage', name: 'RAGE START', desc: 'You start with the rage heart: fists hit ten times harder.' },
    { id: 'arsenal', name: 'FULL ARSENAL', desc: 'Every weapon, full ammo and the spiked corset.' },
  ];
  const WEEK_MS = 7 * 864e5, WEEK_EPOCH = Date.UTC(2026, 0, 5); // weeks start on Monday (UTC)
  function weeklyInfo(now = Date.now()) {
    const week = Math.floor((now - WEEK_EPOCH) / WEEK_MS) + 1, m = (a, n) => ((a % n) + n) % n;
    return { week, lvl: m(week * 4, LEVELS.length), twist: TWISTS[m(week * 5, TWISTS.length)], ends: WEEK_EPOCH + week * WEEK_MS };
  }
  const WEEKLY_KEY = 'goffichick-weekly';
  let weeklyRun = null, soloResult = null, weeklyPost = null, ignoreTapUntil = 0;
  const fmtMs = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
  const weeklyBest = wk => { const r = store.get(WEEKLY_KEY); return r && r.week === wk ? r.best : undefined; };
  function openWeekly() { weeklyRun = weeklyInfo(); weeklyPost = null; state = 'weekly'; stateT = 0; Leaderboard.refreshWeekly(weeklyRun.week); }
  function applyTwist(t) {
    const p = player;
    if (t.id === 'pistol') {
      for (const w of WEAPONS) p.weapons[w.key] = w.key === 'knuckles' || w.key === 'pistol';
      for (const k in p.ammo) p.ammo[k] = k === 'bullets' ? 50 : 0;
      p.cur = 'pistol';
    } else if (t.id === 'turbo') mods.speed = 1.4;
    else if (t.id === 'glass') { mods.hurt = 2; mods.hit = 2; }
    else if (t.id === 'dark') { for (let i = 0; i < L.light.length; i++) { L.light[i] *= 0.45; L.lightNow[i] *= 0.45; } for (const z of L.zones) z.level *= 0.45; }
    else if (t.id === 'rage') { p.berserk = true; p.cur = 'knuckles'; }
    else if (t.id === 'arsenal') { for (const k in AMMO_TYPES) p.ammo[k] = AMMO_TYPES[k].max; p.armor = 200; p.armorType = 2; }
  }
  function loadSolo() {
    mods = { hurt: 1, hit: 1, speed: 1 };
    loadLevel(soloDef, null);
    if (mode === 'horde') hordeInit();
    if (mode === 'weekly') { applyTwist(weeklyRun.twist); msg = `WEEKLY CHALLENGE: ${weeklyRun.twist.name}`; msgT = 4; }
  }
  function startSolo(m, def) {
    if (mode === 'campaign') campaignDiff = diff;
    mode = m; soloDef = def; god = false; cheated = false; carry = null; runScore = 0; paused = false;
    if (m === 'weekly') { diff = 1; weeklyRun = weeklyInfo(); }
    loadSolo(); beginPlay();
  }
  // leave a weekly / shared / test run and go back to the title screen (or the editor)
  function leaveSolo(to = 'title') {
    if (campaignDiff !== null) diff = campaignDiff;
    campaignDiff = null; mode = 'campaign'; mods = { hurt: 1, hit: 1, speed: 1 }; paused = false; fireHeld = false;
    Sfx.setAmbience(null);
    if (document.exitPointerLock && locked()) document.exitPointerLock();
    state = to; stateT = 0; ignoreTapUntil = performance.now() + 400;
  }
  function quitSolo() { if (online) { leaveOnline(); return; } leaveSolo(mode === 'test' ? 'editor' : 'title'); }
  function soloComplete() {
    soloResult = { time: levelTime, name: L.def.name, kills: L.totalKills ? Math.min(100, Math.round(player.kills / L.totalKills * 100)) : 100 };
    Voice.say('exit', 0.8, true);
    if (mode === 'test') { leaveSolo('editor'); editor.flash(`Cleared in ${fmtMs(soloResult.time)} with ${soloResult.kills}% kills!`); return; }
    if (mode === 'weekly') {
      const best = weeklyBest(weeklyRun.week);
      soloResult.newBest = best === undefined || soloResult.time < best;
      soloResult.best = soloResult.newBest ? soloResult.time : best;
      if (soloResult.newBest) store.set(WEEKLY_KEY, { week: weeklyRun.week, best: soloResult.time });
      unlock('weekly');
      state = 'weeklyDone'; stateT = 0; return;
    }
    state = 'customDone'; stateT = 0;
  }
  function postWeekly(name) {
    nameFor = 'score';
    const entry = { week: weeklyRun.week, name, ms: Math.round(soloResult.time * 1000) };
    weeklyPost = { name, ms: entry.ms, status: 'Posting your time to the weekly board...' };
    state = 'weekly'; stateT = 0;
    Leaderboard.submitTime(entry).then(ok => {
      weeklyPost.status = ok ? 'Your time is on the weekly board!' : Leaderboard.weekly.status === 'missing' ? "The weekly board isn't set up yet (the times table is missing)." : "Couldn't post online (no connection?). Your best is kept on this device.";
    });
  }
  const PLAY_BTN = () => ({ x: W / 2 - 50, y: 236, w: 100, h: 20 });
  function drawWeekly() {
    drawTitle();
    ctx.fillStyle = 'rgba(5,0,10,0.93)'; ctx.fillRect(0, 0, W, H);
    const wk = weeklyRun, lv = LEVELS[wk.lvl];
    ctx.font = '24px "Metal Mania", Impact, serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#ff4fb8'; ctx.shadowColor = '#ff2d95'; ctx.shadowBlur = 10; ctx.fillText('WEEKLY CHALLENGE', W / 2, 30); ctx.shadowBlur = 0;
    label(`WEEK ${wk.week}:  ${lv.name}`, W / 2, 46, '#ffffff', 'center', 9);
    label(`TWIST - ${wk.twist.name}: ${wk.twist.desc}`, W / 2, 58, '#ffcf3a', 'center', 7.5);
    const left = Math.max(0, wk.ends - Date.now()), dd = Math.floor(left / 864e5), hh = Math.floor(left % 864e5 / 36e5);
    label(`Fastest time to the exit wins. Normal skill, cheats off. A new challenge in ${dd}d ${hh}h.`, W / 2, 70, '#c9a6c9', 'center', 7);
    label('FASTEST THIS WEEK', W / 2, 88, '#ff9be0', 'center', 8);
    const B = Leaderboard.weekly;
    if (!Leaderboard.enabled) label('The online board is off - your best time is kept on this device.', W / 2, 120, '#ffd0ec', 'center', 8);
    else if (B.status === 'loading') label('Loading the weekly board...', W / 2, 120, '#ffd0ec', 'center', 8);
    else if (B.status === 'missing') label("The weekly board isn't set up yet (the times table is missing).", W / 2, 120, '#ffd0ec', 'center', 8);
    else if (B.status === 'error') label("Couldn't reach the weekly board. Check your connection.", W / 2, 120, '#ffd0ec', 'center', 8);
    else if (!(B.list || []).length) label('Nobody has finished it yet. Be the first!', W / 2, 120, '#ffd0ec', 'center', 8);
    else B.list.forEach((e, i) => {
      const y = 101 + i * 11, me = weeklyPost && e.name === weeklyPost.name && e.ms === weeklyPost.ms;
      if (me) { ctx.fillStyle = 'rgba(255,79,184,0.25)'; ctx.fillRect(W / 2 - 110, y - 8, 220, 10); }
      label(`${i + 1}.`, W / 2 - 80, y, '#c9a6c9', 'right', 8);
      label(e.name, W / 2 - 70, y, me ? '#ffffff' : '#ff9be0', 'left', 8);
      label(fmtMs(e.ms / 1000), W / 2 + 40, y, '#ffcf3a', 'right', 8);
      label(e.date.slice(5), W / 2 + 80, y, '#8a6a8a', 'right', 7);
    });
    const best = weeklyBest(wk.week);
    label(best === undefined ? 'You have not finished this week yet.' : `YOUR BEST THIS WEEK: ${fmtMs(best)}`, W / 2, 216, '#ffffff', 'center', 8);
    if (weeklyPost) label(weeklyPost.status, W / 2, 228, '#ffcf3a', 'center', 7);
    const b = PLAY_BTN();
    ctx.fillStyle = '#ff2d95'; ctx.fillRect(b.x, b.y, b.w, b.h);
    label('PLAY', W / 2, b.y + 14, '#ffffff', 'center', 10);
    label('ENTER / PLAY to start  -  tap anywhere else to go back', W / 2, 266, '#8a6a8a', 'center', 6.5);
  }
  function weeklyTap(ev) {
    if (stateT < 0.3) return;
    let play = true;
    if (ev && ev.clientX !== undefined) { const g = gamePoint(ev.clientX, ev.clientY), b = PLAY_BTN(); play = g.x >= b.x - 6 && g.x <= b.x + b.w + 6 && g.y >= b.y - 6 && g.y <= b.y + b.h + 6; }
    if (play) startSolo('weekly', LEVELS[weeklyInfo().lvl]); else leaveSolo('title');
  }
  // the little QUIT / EDIT box at the top right during a weekly, shared or test run
  const QUIT_BOX = () => ({ x: W - 44, y: 2, w: 40, h: 14 });
  function drawSoloHud() {
    if (mode === 'campaign' || state !== 'playing') return;
    const b = QUIT_BOX();
    ctx.fillStyle = 'rgba(10,0,16,0.6)'; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = '#ff4fb8'; ctx.lineWidth = 1; ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    label(mode === 'test' ? 'EDIT' : 'QUIT', b.x + b.w / 2, b.y + 10, '#ffffff', 'center', 7.5);
    ctx.fillStyle = 'rgba(10,0,16,0.6)'; ctx.fillRect(b.x - 48, b.y, 46, b.h);
    label(mode === 'dm' ? fmtTime(Math.max(0, DM_TIME - levelTime)) : mode === 'horde' ? `WAVE ${horde ? horde.wave : 0}` : fmtMs(levelTime), b.x - 6, b.y + 10, '#ffcf3a', 'right', 8);
    if (online) drawOnlineHud();
  }
  function completeLevel() {
    if (state !== 'playing') return;
    if (mode !== 'campaign' && mode !== 'coop') { soloComplete(); return; }
    if (mode === 'coop' && !L.exitFromNet) Net.send('exit', { lvl: levelIndex });
    interStats = { name: L.def.name, kills: L.totalKills ? Math.min(100, Math.round(player.kills / L.totalKills * 100)) : 100,
      items: L.totalItems ? Math.round(player.items / L.totalItems * 100) : 100,
      secrets: L.totalSecrets ? Math.round(player.secrets / L.totalSecrets * 100) : 100, time: levelTime, par: L.def.par || 240,
      acc: player.shotsF ? Math.min(100, Math.round(player.shotsH / player.shotsF * 100)) : 0, dmg: Math.round(player.dmgDealt), streak: player.bestStreak, roses: player.roses, totalRoses: L.totalRoses };
    const st = interStats;
    st.score = Math.round((st.kills * 20 + st.items * 10 + st.secrets * 30 + Math.max(0, st.par - st.time) * 5) * DIFF_MUL[diff]);
    runScore += st.score; st.total = runScore;
    const times = store.get(TIMES_KEY) || {};
    st.best = times[L.def.name]; st.newBest = st.best === undefined || st.time < st.best;
    if (st.newBest) { times[L.def.name] = Math.round(st.time); store.set(TIMES_KEY, times); }
    Voice.say('exit', 0.8, true);
    if (!player.hurt) unlock('untouch');
    if (!player.usedGun) unlock('knuckle');
    if (st.time <= st.par / 2) unlock('speed');
    if (st.items >= 100 && L.totalItems > 0) unlock('collector');
    if (diff === 2) unlock('ultra');
    if (levelIndex >= LEVELS.length - 1) { unlock('theend'); if (diff >= 3) unlock('nightmare'); }
    carry = { health: player.health, armor: player.armor, armorType: player.armorType, ammo: player.ammo, weapons: player.weapons, cur: player.cur, nades: player.nades, score: runScore };
    state = levelIndex >= LEVELS.length - 1 ? 'victory' : 'intermission'; stateT = 0;
    if (mode === 'coop') return;
    if (state === 'victory') store.del(SAVE_KEY);
    else { levelIndex++; saveProgress(); levelIndex--; } // a CONTINUE now starts the next level
  }
  function nextLevel() {
    if (mode === 'coop') { if (!online.host) { msg = 'Waiting for the host to carry on...'; msgT = 2; return; } Net.send('lvl', { i: levelIndex + 1 }); }
    levelIndex++;
    loadLevel(levelIndex, carry); state = 'playing';
  }
  function restartLevel() {
    if (mode === 'dm' || mode === 'coop') { respawnOnline(); return; }
    if (mode === 'horde') { hordeEnd(); return; }
    if (mode !== 'campaign') { loadSolo(); state = 'playing'; return; }
    loadLevel(levelIndex, carry ? { ...carry, health: 100 } : null); state = 'playing';
  }

  const IN_GAME = new Set(['playing', 'dead', 'intermission', 'victory', 'dmOver', 'hordeOver', 'weeklyDone', 'customDone']);
  function musicTick() {
    if (!IN_GAME.has(state)) { Sfx.setShuffle(false); if (Sfx.song !== 0) Sfx.setSong(0); } // menus get the title theme
    else Sfx.setShuffle(musicMode === 'shuffle');
  }
  Sfx.onSongChange(name => { if (state === 'playing') { msg = `Now playing: ${name}`; msgT = 3.5; } });
  function update(dt) {
    musicTick();
    if (state === 'title') jarTick(dt);
    time += dt; stateT += dt;
    Voice.update(dt);
    if (msgT > 0) msgT -= dt;
    if (state === 'playing' || state === 'dead') {
      levelTime += dt;
      updatePlayer(dt);
      updateDoors(dt);
      updateLifts(dt);
      updateLights();
      updateEnemies(dt);
      updateProjectiles(dt);
      updateParts(dt);
      updateVfx(dt); if (state === 'playing') ambientFx(dt);
      if (!(mode === 'coop' && online && !online.host)) eliteUpdate(dt);
      if (mode === 'horde') hordeUpdate(dt);
      wpnNameT = Math.max(0, wpnNameT - dt); hitMarkT = Math.max(0, hitMarkT - dt); killMarkT = Math.max(0, killMarkT - dt);
      bubbleCd -= dt;
      for (const e of L.enemies) {
        if (e.barT > 0) e.barT -= dt; if (e.hitT > 0) e.hitT -= dt; if (e.bubble) { e.bubble.t -= dt; if (e.bubble.t <= 0) e.bubble = null; }
        if (!e.dead && e.state === 'chase' && Math.random() < dt * 0.09 && Math.hypot(e.x - player.x, e.y - player.y) < 9) shout(e, (e.cut & 24) && Math.random() < 0.5 ? 'limb' : 'sight', 0.6); // the odd taunt
      }
      for (const d of dmgDirs) d.t += dt; dmgDirs = dmgDirs.filter(d => d.t < 1);
      if (announce) { announce.t += dt; if (announce.t > 1.8) announce = null; }
      if (state === 'playing' && !player.dead && player.health < 30) { heartT -= dt; if (heartT <= 0) { heartT = 0.45 + player.health / 30 * 0.55; Sfx.play.heartbeat(); } }
      for (const b of L.bolts) b.t += dt; L.bolts = L.bolts.filter(b => b.t < b.life);
      updateDynLights();
      if (L.def.weather === 'rain') { // lightning every so often, thunder a moment later
        L.lightningT -= dt; L.flashA = Math.max(0, L.flashA - dt * 3);
        if (L.lightningT <= 0) { L.lightningT = 7 + Math.random() * 12; L.flashA = 1; L.skyBolt = makeSkyBolt(); lightBoost = Math.max(lightBoost, 0.7); setTimeout(() => Sfx.play.thunder(), 300 + Math.random() * 1200); }
      }
      if (L.exitT > 0) { L.exitT -= dt; if (L.exitT <= 0) completeLevel(); }
      if (L.bossDeadT > 0) { L.bossDeadT -= dt; if (L.bossDeadT <= 0) completeLevel(); }
    }
    shake = Math.max(0, shake - dt * 12);
    lightBoost = Math.max(0, lightBoost - dt * 3);
    painFlash = Math.max(0, painFlash - dt * 1.5);
    pickupFlash = Math.max(0, pickupFlash - dt);
  }

  // ------------------------------------------------------------------ screens
  // ---- Ko-fi tip jar on the title screen (like Wallyman World's): pulses, glows, shines and sparkles
  const kofiName = () => String((typeof GOFFICHICK_KOFI !== 'undefined' && GOFFICHICK_KOFI) || '').trim().replace(/^https?:\/\/(www\.)?ko-fi\.com\//i, '').replace(/[^A-Za-z0-9_-]/g, '');
  // On the title screen the tip jar wanders about and dodges the mouse (or a tapping finger), cracking jokes.
  // After 3 dodges it gets tired and lets itself be caught for a few seconds, so players can still tip.
  const jar = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, retarget: 0, dodges: 0, tired: 0, say: '', sayT: 0, cool: 0, init: false };
  const JAR_SAYS = ['Nope!', 'Not today!', 'Too slow!', 'Catch me first!', 'Hehe!', 'Nice try!', 'Missed me!', 'Wheee!'];
  let hoverG = null;
  const jarArea = () => ({ x0: W / 2 - 70, x1: Math.max(W / 2 + 40, W - 140), y0: 18, y1: 84 }); // keeps off her face in the photo
  function jarPick(awayX, awayY) {
    const a = jarArea(); let best = null, bd = -1;
    for (let k = 0; k < 10; k++) { const x = a.x0 + Math.random() * (a.x1 - a.x0), y = a.y0 + Math.random() * (a.y1 - a.y0), d = awayX === undefined ? Math.random() : Math.hypot(x - awayX, y - awayY); if (d > bd) { bd = d; best = [x, y]; } }
    jar.tx = best[0]; jar.ty = best[1];
  }
  function jarDodge(fromX, fromY) {
    if (jar.tired > 0) return false;
    if (jar.cool > 0) return true; // still mid-dodge: it's already running away
    jar.cool = 0.45; jarPick(fromX, fromY);
    const dx = jar.x - fromX, dy = jar.y - fromY, l = Math.hypot(dx, dy) || 1; jar.vx += dx / l * 420; jar.vy += dy / l * 260;
    jar.say = JAR_SAYS[irand(0, JAR_SAYS.length - 1)]; jar.sayT = 1.1; Sfx.init(); Sfx.play.jump();
    return true;
  }
  function jarTick(dt) {
    const a = jarArea();
    if (!jar.init) { jar.init = true; jar.x = W / 2; jar.y = 17; jarPick(); }
    if (jar.sayT > 0) jar.sayT -= dt;
    if (jar.cool > 0) jar.cool -= dt;
    if (jar.tired > 0) { jar.tx = jar.x; jar.ty = jar.y; jar.sayT = Math.max(jar.sayT, 0.5); } // given up: waits to be clicked
    else {
      jar.retarget -= dt; if (jar.retarget <= 0) { jar.retarget = 1.8 + Math.random() * 2; jarPick(); }
      if (hoverG && Math.hypot(hoverG.x - jar.x, hoverG.y - jar.y) < 72) jarDodge(hoverG.x, hoverG.y); // the mouse is getting close: run!
    }
    jar.vx += (jar.tx - jar.x) * 9 * dt; jar.vy += (jar.ty - jar.y) * 9 * dt;
    const damp = Math.max(0, 1 - 4.5 * dt); jar.vx *= damp; jar.vy *= damp;
    jar.x = clamp(jar.x + jar.vx * dt, a.x0, a.x1); jar.y = clamp(jar.y + jar.vy * dt, a.y0, a.y1);
  }
  const TIP_RECT = () => paused && state === 'playing' ? { x: W / 2 - 43, y: 216, w: 86, h: 22 } : { x: jar.x - 43, y: jar.y - 11, w: 86, h: 22 };
  function drawTipJar() {
    if (!kofiName()) return;
    const onTitle = !(paused && state === 'playing');
    if (onTitle && jar.sayT > 0) { // what it's saying
      const k = TIP_RECT(), t = jar.say; ctx.font = 'bold 7px monospace'; const tw = ctx.measureText(t).width + 8, bx = clamp(k.x + k.w / 2 - tw / 2, 2, W - tw - 2), by = k.y + k.h + 6;
      ctx.globalAlpha = Math.min(1, jar.sayT * 3); ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.roundRect(bx, by, tw, 11, 3); ctx.fill();
      ctx.beginPath(); ctx.moveTo(k.x + k.w / 2 - 3, by); ctx.lineTo(k.x + k.w / 2, by - 4); ctx.lineTo(k.x + k.w / 2 + 3, by); ctx.fill();
      ctx.fillStyle = '#1a0010'; ctx.textAlign = 'left'; ctx.fillText(t, bx + 4, by + 8); ctx.globalAlpha = 1;
    }
    if (onTitle && jar.tired > 0) { const k = TIP_RECT(); ctx.fillStyle = '#7ad0ff'; for (const [sx, ph] of [[k.x - 3, 0], [k.x + k.w + 2, 1.5]]) { const yy = k.y + ((time * 14 + ph * 6) % 12); ctx.beginPath(); ctx.ellipse(sx, yy, 1.4, 2.2, 0, 0, TAU); ctx.fill(); } } // sweat drops
    const { x, y, w, h } = TIP_RECT(), cx = x + w / 2, cy = y + h / 2, t = time * 60;
    const ph = t % 120, sc = ph < 40 ? 1 + 0.1 * Math.sin(Math.PI * ph / 40) : 1, glowA = 0.35 + 0.25 * Math.sin(t * 0.1);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
    ctx.shadowColor = `rgba(255,79,184,${0.5 + glowA})`; ctx.shadowBlur = 12; // a soft pink glow
    ctx.fillStyle = '#ffcf3a'; ctx.beginPath(); ctx.roundRect(x - 1.5, y - 1.5, w + 3, h + 3, 6); ctx.fill(); ctx.shadowBlur = 0;
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#ff7cc4'); g.addColorStop(0.5, '#ff2d95'); g.addColorStop(1, '#a8106a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, w, h, 5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x + 4, y + 1.5, w - 8, 1);
    const sweep = (t * 2) % 220 - 30; // a shine sweeping across
    if (sweep < w + 20) { ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 5); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(x + sweep, y); ctx.lineTo(x + sweep + 8, y); ctx.lineTo(x + sweep - 4, y + h); ctx.lineTo(x + sweep - 12, y + h); ctx.fill(); ctx.restore(); }
    // a black coffee cup with a pink heart, and rising steam
    ctx.fillStyle = '#16020c'; ctx.beginPath(); ctx.roundRect(x + 6, y + 8, 12, 10, 2); ctx.fill(); ctx.strokeStyle = '#16020c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x + 19, y + 12.5, 2.6, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.fillStyle = '#ff7cc4'; ctx.beginPath(); ctx.moveTo(x + 12, y + 16); ctx.bezierCurveTo(x + 7, y + 12, x + 9, y + 9.5, x + 12, y + 11.5); ctx.bezierCurveTo(x + 15, y + 9.5, x + 17, y + 12, x + 12, y + 16); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 0.9;
    for (const [sx, off] of [[10, 0], [14, 1.6]]) { const wv = Math.sin(time * 4 + off); ctx.beginPath(); ctx.moveTo(x + sx, y + 7); ctx.quadraticCurveTo(x + sx + 2 * wv, y + 4.5, x + sx, y + 2.5); ctx.stroke(); }
    ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#3a0020'; ctx.fillText('TIP JAR', x + 28, y + 15.5); ctx.fillStyle = '#ffffff'; ctx.fillText('TIP JAR', x + 27, y + 14.5);
    ctx.restore();
    const spark = (sx, sy, on) => { if (!on) return; ctx.fillStyle = '#fff6c0'; ctx.fillRect(sx - 0.5, sy - 3, 1, 7); ctx.fillRect(sx - 3, sy - 0.5, 7, 1); };
    const k = Math.floor(t / 16) % 3; spark(x - 4, y + 4, k === 0); spark(x + w + 4, y + h - 4, k === 1); spark(x + w - 14, y - 4, k === 2); spark(x + 16, y + h + 4, k === 1);
  }
  function openTipJar() {
    const name = kofiName(); if (!name) return;
    const a = document.createElement('a'); a.href = 'https://ko-fi.com/' + name; a.target = '_blank'; a.rel = 'noopener noreferrer';
    document.body.appendChild(a); a.click(); a.remove();
    msg = 'Thank you! Opening the tip jar...'; msgT = 3;
  }
  function drawTitle() {
    ctx.fillStyle = '#07030a'; ctx.fillRect(0, 0, W, H);
    if (titleImg) {
      const ih = H, iw = titleImg.width * ih / titleImg.height;
      ctx.drawImage(titleImg, W - iw + 10, 0, iw, ih);
      const gr = ctx.createLinearGradient(W - iw + 10, 0, W - iw + 90, 0);
      gr.addColorStop(0, '#07030a'); gr.addColorStop(1, 'rgba(7,3,10,0)');
      ctx.fillStyle = gr; ctx.fillRect(W - iw + 10, 0, 80, H);
    }
    const flick = 0.85 + Math.sin(time * 7) * 0.08 + (Math.random() < 0.03 ? -0.4 : 0);
    ctx.save(); ctx.globalAlpha = flick;
    ctx.font = '46px "Metal Mania", Impact, serif'; ctx.textAlign = 'left';
    ctx.fillStyle = '#000'; ctx.fillText('GOFFICHICK', 18, 70);
    ctx.shadowColor = '#ff2d95'; ctx.shadowBlur = 14; ctx.fillStyle = '#ff4fb8'; ctx.fillText('GOFFICHICK', 16, 67);
    ctx.restore();
    if (msgT > 0 && state === 'title') label(msg, 18, 86, '#ffcf3a', 'left', 7.5);
    else label('THE WORLD IS TOO CHEERFUL. FIX IT.', 18, 86, '#c9a6c9', 'left', 8);
    if (state === 'loading') { if (Math.sin(time * 5) > 0) label('SUMMONING...', 18, MENU_Y, '#ffffff', 'left', 10); }
    else {
      const items = menuItems(); menuSel = Math.min(menuSel, items.length - 1);
      items.forEach((it, i) => {
        const sel = i === menuSel, y = MENU_Y + i * MENU_DY;
        if (sel) { ctx.fillStyle = 'rgba(255,79,184,0.18)'; ctx.fillRect(12, y - 8, 203, 10); }
        label((sel ? '> ' : '  ') + it.text, 16, y, sel ? '#ffffff' : '#ff9be0', 'left', 8.5);
      });
      if (state === 'title') { drawTitlePad(); drawTipJar(); }
    }
    const lines = ['WASD / ARROWS  move    MOUSE  look    CLICK / CTRL  fire    E  use', 'SPACE  jump    G  grenade    1-9 / Q / WHEEL  weapons    SHIFT run',
      'MOUSE UP/DOWN or R / F  aim up and down (C centres)   TAB map   N radar   L torch   H photo   K screenshot'];
    if (state !== 'title' || menuItems().length <= 12) lines.forEach((l, i) => label(l, 18, 222 + i * 7.5, '#b78ab7', 'left', 6));
    label('Keys open coloured doors. Stairs and lifts take you up. V toggles her voice. Gamepads work too.', 18, 246, '#8a6a8a', 'left', 6.5);
    if (state === 'title') label(TIPS[Math.floor(time / 7) % TIPS.length], 18, 264, '#ff9be0', 'left', 6);
    label('ON A PHONE? Pink stick moves, cyan pad aims, FIRE on either side.', 18, 254, '#7a5a7a', 'left', 6.5);
  }

  function drawOverlayText(title, sub, lines, dy = 16) {
    ctx.fillStyle = 'rgba(5,0,10,0.9)'; ctx.fillRect(0, 0, W, H);
    ctx.font = '30px "Metal Mania", Impact, serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#ff4fb8'; ctx.shadowColor = '#ff2d95'; ctx.shadowBlur = 10; ctx.fillText(title, W / 2, 60); ctx.shadowBlur = 0;
    label(sub, W / 2, 80, '#c9a6c9', 'center', 9);
    (lines || []).forEach((l, i) => label(l, W / 2, 108 + i * dy, /NEW/.test(l) ? '#ffcf3a' : '#ffffff', 'center', 10));
  }
  const SCORE_TABS = () => [{ id: 'world', x: W / 2 - 75, text: 'WORLD' }, { id: 'device', x: W / 2 + 15, text: 'THIS DEVICE' }];
  function drawAchievements() {
    drawTitle(); drawOverlayText('ACHIEVEMENTS', `${Object.keys(ach.unlocked).length} of ${ACHIEVEMENTS.length} unlocked on this device`, []);
    ACHIEVEMENTS.forEach((a, i) => {
      const rows = Math.ceil(ACHIEVEMENTS.length / 3), col = Math.floor(i / rows), row = i % rows, cw = (W - 24) / 3, x = 12 + col * cw, y = 96 + row * 16, got = !!ach.unlocked[a.id];
      ctx.fillStyle = got ? 'rgba(255,79,184,0.28)' : 'rgba(255,255,255,0.05)'; ctx.fillRect(x, y - 8, cw - 4, 14.5);
      label((got ? '* ' : '  ') + a.name, x + 3, y - 1, got ? '#ffcf3a' : '#8a6a8a', 'left', 6.5);
      let sub = a.desc; if (a.count && !got) sub += `  (${Math.min(ach.counts[a.count] || 0, a.need)}/${a.need})`;
      label(sub, x + 3, y + 5, got ? '#ffd0ec' : '#6a5a6a', 'left', 4.8);
    });
    if (stateT > 0.5) label('CLICK OR PRESS ENTER', W / 2, 264, '#c9a6c9', 'center', 7);
  }
  function drawAchievementToast(dt) {
    if (!achToasts.length) return;
    const t = achToasts[0]; t.t += dt;
    const a = Math.min(1, t.t * 4, (3.2 - t.t) * 4); if (t.t > 3.2) { achToasts.shift(); return; }
    ctx.save(); ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = 'rgba(20,0,24,0.88)'; ctx.fillRect(W / 2 - 120, 34, 240, 26); ctx.strokeStyle = '#ffcf3a'; ctx.strokeRect(W / 2 - 119.5, 34.5, 239, 25);
    label('ACHIEVEMENT UNLOCKED', W / 2, 44, '#ffcf3a', 'center', 7); label(t.a.name, W / 2, 55, '#ffffff', 'center', 9);
    ctx.restore();
  }
  function drawScores() {
    const world = scoresTab === 'world';
    drawTitle(); drawOverlayText('HIGH SCORES', world ? 'The gloomiest players anywhere' : 'The gloomiest players on this device', []);
    if (Leaderboard.enabled) for (const t of SCORE_TABS()) {
      const on = t.id === scoresTab;
      ctx.fillStyle = on ? 'rgba(255,79,184,0.35)' : 'rgba(255,255,255,0.06)'; ctx.fillRect(t.x, 86, 70, 12);
      label(t.text, t.x + 35, 95, on ? '#ffffff' : '#b78ab7', 'center', 8);
    }
    let list = world ? (Leaderboard.list || []) : highScores();
    if (world && Leaderboard.status === 'loading') label('Loading the world leaderboard...', W / 2, 135, '#ffd0ec', 'center', 9);
    else if (world && Leaderboard.status === 'error') label("Couldn't reach the online leaderboard. Check your connection.", W / 2, 135, '#ffd0ec', 'center', 9);
    else if (world && Leaderboard.status === 'missing') label("The online leaderboard isn't set up yet (the scores table is missing).", W / 2, 135, '#ffd0ec', 'center', 9);
    else if (!list.length) label('No scores yet. Finish the game to get on the board!', W / 2, 135, '#ffd0ec', 'center', 9);
    if (postStatus) label(postStatus, W / 2, 240, '#ffcf3a', 'center', 8);
    let marked = false;
    list.forEach((e, i) => {
      const mine = world ? (!marked && posted && e.name === posted.name && e.score === posted.score && (marked = true)) : i === lastEntry;
      const y = 112 + i * 12, col = mine ? '#ffcf3a' : '#ffffff';
      label(`${String(i + 1).padStart(2)}.  ${e.name.padEnd(3)}`, W / 2 - 120, y, col, 'left', 10);
      label(e.score.toLocaleString(), W / 2 + 20, y, col, 'right', 10);
      label(`${DIFFS[e.diff] ? DIFFS[e.diff].name : ''}  ${e.date || ''}`, W / 2 + 34, y, '#b78ab7', 'left', 8);
    });
    if (stateT > 0.5) label(Leaderboard.enabled ? 'TAP A TAB OR USE LEFT / RIGHT  -  CLICK ELSEWHERE TO GO BACK' : 'CLICK OR PRESS ENTER', W / 2, 254, '#c9a6c9', 'center', 8);
  }
  // arcade-style initials: three letter boxes and an OK button
  const NAME_BOX = i => ({ x: W / 2 - 75 + i * 40, y: 112, w: 32, h: 40 }), NAME_OK = () => ({ x: W / 2 + 55, y: 120, w: 44, h: 24 });
  function drawEnterName() {
    drawTitle(); drawOverlayText({ weekly: 'WEEKLY BOARD', online: 'YOUR NAME', room: 'JOIN A GAME' }[nameFor] || 'NEW HIGH SCORE', nameFor === 'weekly' ? `${fmtMs(soloResult.time)} - enter your initials` : nameFor === 'online' ? 'Three letters the other players will see' : nameFor === 'room' ? 'Type the 3-letter room code your friend sees' : `${runScore.toLocaleString()} points - enter your initials`, []);
    for (let i = 0; i < 3; i++) {
      const b = NAME_BOX(i);
      ctx.fillStyle = i === initCur ? 'rgba(255,79,184,0.35)' : 'rgba(255,255,255,0.08)'; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#ff4fb8'; ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      digits(ALPHA[initials[i]] === ' ' ? '_' : ALPHA[initials[i]], b.x + b.w / 2, b.y + 30, 26, '#ffffff');
      label('^', b.x + b.w / 2, b.y - 3, '#ff9be0', 'center', 9); label('v', b.x + b.w / 2, b.y + b.h + 9, '#ff9be0', 'center', 9);
    }
    const ok = NAME_OK(); ctx.fillStyle = '#ff2d95'; ctx.fillRect(ok.x, ok.y, ok.w, ok.h); label('OK', ok.x + ok.w / 2, ok.y + 16, '#ffffff', 'center', 11);
    label('Type letters, or tap the top / bottom of a letter to change it', W / 2, 190, '#b78ab7', 'center', 8);
  }
  function enterNameTap(gx, gy) {
    const ok = NAME_OK();
    if (gx >= ok.x && gx <= ok.x + ok.w && gy >= ok.y && gy <= ok.y + ok.h) { saveHighScore(); return; }
    for (let i = 0; i < 3; i++) {
      const b = NAME_BOX(i);
      if (gx >= b.x && gx <= b.x + b.w && gy >= b.y - 12 && gy <= b.y + b.h + 12) {
        initCur = i; initials[i] = (initials[i] + (gy < b.y + b.h / 2 ? 1 : -1) + ALPHA.length) % ALPHA.length; Sfx.play.switch();
      }
    }
  }

  function draw() {
    ctx.setTransform(RES, 0, 0, RES, 0, 0); ctx.imageSmoothingEnabled = true;
    if (state === 'loading' || state === 'title') { drawTitle(); return; }
    if (state === 'scores') { drawScores(); return; }
    if (state === 'achievements') { drawAchievements(); return; }
    if (state === 'enterName') { drawEnterName(); return; }
    if (state === 'editor') { editor.draw(1 / 60); return; }
    if (state === 'weekly') { drawWeekly(); return; }
    if (state === 'lobby') { drawLobby(); return; }
    if (state === 'dmOver') { drawDmOver(); return; }
    if (state === 'weeklyDone') {
      drawTitle();
      const r = soloResult, canPost = Leaderboard.enabled && !cheated && r.newBest;
      drawOverlayText('CHALLENGE COMPLETE', `WEEK ${weeklyRun.week}: ${r.name} - ${weeklyRun.twist.name}`, [
        `TIME  ${fmtMs(r.time)}`, r.newBest ? 'NEW PERSONAL BEST!' : `YOUR BEST  ${fmtMs(r.best)}`, `KILLS  ${r.kills}%`, cheated ? 'Cheats were used - this run is not posted.' : '',
        stateT > 1.5 ? (canPost ? 'CLICK TO SIGN THE WEEKLY BOARD' : 'CLICK TO SEE THE WEEKLY BOARD') : ''], 16);
      return;
    }
    if (state === 'hordeOver') {
      drawTitle();
      const r = soloResult;
      drawOverlayText('OVERRUN!', `You survived to wave ${r.wave}`, [`WAVE  ${r.wave}`, `KILLS  ${r.kills}`, r.newBest ? 'NEW BEST WAVE!' : `BEST WAVE  ${r.best}`, '', stateT > 1.5 ? 'CLICK TO CONTINUE' : ''], 16);
      return;
    }
    if (state === 'customDone') {
      drawTitle();
      drawOverlayText('LEVEL CLEARED', soloResult.name, [`TIME  ${fmtMs(soloResult.time)}`, `KILLS  ${soloResult.kills}%`, '', 'Want to make your own? Try the LEVEL EDITOR!', stateT > 1.5 ? 'CLICK TO CONTINUE' : ''], 16);
      return;
    }
    if (state === 'intermission' || state === 'victory') {
      if (state === 'victory') {
        drawTitle();
        drawOverlayText('VICTORY', 'The cheerfulness is defeated. The world is safely gloomy again.', [
          `LAST LEVEL  +${interStats.score}`, `FINAL SCORE  ${runScore.toLocaleString()}`, `SKILL  ${DIFFS[diff].name}`, '',
          stateT > 2 ? (Leaderboard.enabled ? 'CLICK TO SIGN YOUR NAME ON THE WORLD LEADERBOARD' : qualifies(runScore) ? 'A NEW HIGH SCORE! CLICK TO SIGN YOUR NAME' : 'THANKS FOR PLAYING - CLICK TO CONTINUE') : ''], 15);
      } else {
        const st = interStats;
        drawOverlayText(st.name, 'FINISHED', [`KILLS  ${st.kills}%     ITEMS  ${st.items}%     SECRETS  ${st.secrets}%     ROSES  ${st.roses}/${st.totalRoses}`,
          `ACCURACY  ${st.acc}%     DAMAGE  ${st.dmg.toLocaleString()}     BEST STREAK  ${st.streak}`,
          `TIME  ${fmtTime(st.time)}   (PAR ${fmtTime(st.par)})`,
          st.newBest ? 'NEW BEST TIME!' : `BEST TIME  ${fmtTime(st.best)}`,
          `LEVEL SCORE  +${st.score.toLocaleString()}`, `TOTAL  ${st.total.toLocaleString()}`, `RATING:  ${(RATINGS.find(r => st.kills >= r[0]) || RATINGS[4])[1]}`, stateT > 1 ? 'CLICK OR PRESS ENTER' : ''], 13);
      }
      return;
    }
    render3D(); if (FX_HIGH && fxDrop < 3) gradePass(); // on LOW (or a struggling device) the grading pass is skipped entirely
    const sx = shake ? (Math.random() - 0.5) * shake * 2 : 0, sy = shake ? (Math.random() - 0.5) * shake * 2 : 0;
    const pw = player.pw;
    if (pw.shroud > 0 && (pw.shroud > 3 || Math.sin(time * 18) > 0)) { // Night Shroud: inverted greyscale, like the classic invulnerability
      for (let i = 0, n = buf.length; i < n; i++) { const c = buf[i]; const v = 255 - (((c & 255) * 77 + (c >> 8 & 255) * 150 + (c >> 16 & 255) * 29) >> 8); buf[i] = 0xff000000 | (v << 16) | (v << 8) | v; }
    }
    viewCtx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(viewC, sx | 0, sy | 0, W, VIEW_H); ctx.imageSmoothingEnabled = true;
    if (FX_HIGH && fxDrop < 1) drawBloom(sx | 0, sy | 0);
    if (L.def.sky) drawSkyFx();
    // glow halos around fireballs, explosions, torches and power-ups
    if (glows.length) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath(); ctx.rect(0, 0, W, VIEW_H); ctx.clip();
      for (const g of glows) {
        const gr = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r);
        gr.addColorStop(0, `rgba(${g.c},${g.a})`); gr.addColorStop(1, `rgba(${g.c},0)`);
        ctx.fillStyle = gr; ctx.fillRect(g.x - g.r, g.y - g.r, g.r * 2, g.r * 2);
      }
      ctx.restore();
    }
    drawLampsAndShafts();
    drawVfx();
    if (L.bolts.length) { // Doom Scroll lightning, projected from world space onto the screen
      const dirX = Math.cos(player.a), dirY = Math.sin(player.a), pr = q => {
        const dx = q[0] - player.x, dy = q[1] - player.y, depth = Math.max(0.2, dx * dirX + dy * dirY);
        return [(W / 2) * (1 + ((dirX * dy - dirY * dx) / PLANE) / depth), HOR + (player.eyeZ - q[2]) * PROJ / depth];
      };
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (const b of L.bolts) {
        const a = 1 - b.t / b.life;
        for (const [wdt, col] of [[5, `rgba(160,80,255,${0.45 * a})`], [1.6, `rgba(240,220,255,${a})`]]) {
          ctx.strokeStyle = col; ctx.lineWidth = wdt; ctx.beginPath();
          b.pts.forEach((q, i) => {
            const [sx, sy] = pr(q);
            if (i === 0) { ctx.moveTo(W / 2 + 18, VIEW_H - 40); return; }
            const [px0, py0] = i === 1 ? [W / 2 + 18, VIEW_H - 40] : pr(b.pts[i - 1]);
            for (let k = 1; k <= 5; k++) ctx.lineTo(px0 + (sx - px0) * k / 5 + (k < 5 ? (Math.random() - 0.5) * 10 : 0), py0 + (sy - py0) * k / 5 + (k < 5 ? (Math.random() - 0.5) * 10 : 0));
          });
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    if (L.def.weather === 'rain') { // rain streaks and lightning flashes
      if (L.rain.length < 140) for (let i = 0; i < 140; i++) L.rain.push({ x: Math.random() * W, y: Math.random() * VIEW_H, s: 5 + Math.random() * 7 });
      ctx.save(); ctx.strokeStyle = 'rgba(200,215,255,0.35)'; ctx.lineWidth = 0.7; ctx.beginPath();
      const turnDrift = (player.a - (L.lastA ?? player.a)) * 120; L.lastA = player.a;
      for (const r of L.rain) {
        r.y += r.s * 1.6; r.x += -1.2 - turnDrift; if (r.y > VIEW_H) { r.y = -10; r.x = Math.random() * W; } if (r.x < 0) r.x += W; if (r.x > W) r.x -= W;
        ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - 1.5, r.y + r.s);
      }
      ctx.stroke(); ctx.restore();
      if (L.flashA > 0) { ctx.fillStyle = `rgba(230,235,255,${L.flashA * 0.45})`; ctx.fillRect(0, 0, W, VIEW_H); }
    }
    drawGrade();
    { // soft vignette: darker screen edges
      const vg = ctx.createRadialGradient(W / 2, HOR, VIEW_H * 0.45, W / 2, HOR, W * 0.62);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.38)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, VIEW_H);
    }
    if (player.cur === 'laser' && player.flashT > 0 && state === 'playing' && !photoMode) { // the lipstick laser beam
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      const mx = W / 2 + 36 * 0.8, my = VIEW_H + 10 - 112 * 0.8; // the lipstick's tip
      for (const [w, c] of [[7, 'rgba(255,30,100,0.35)'], [3, 'rgba(255,80,150,0.8)'], [1.2, 'rgba(255,235,245,1)']]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(W / 2 + (Math.random() - 0.5), CY + (Math.random() - 0.5)); ctx.stroke(); }
      ctx.restore();
    }
    if (!photoMode) drawWeapon();
    if (player.cur !== shownWpn) { shownWpn = player.cur; wpnNameT = 1.8; }
    if (wpnNameT > 0 && state === 'playing' && !photoMode) { // the weapon's name, shown when you pick it
      const w = weaponByKey(player.cur), a = Math.min(1, wpnNameT * 2);
      if (w) {
        ctx.save(); ctx.globalAlpha = a; ctx.font = 'bold 9px monospace'; const tw = Math.max(ctx.measureText(w.name).width + 14, 120);
        ctx.fillStyle = 'rgba(10,0,16,0.7)'; ctx.fillRect(W / 2 - tw / 2, VIEW_H - 74, tw, 22); ctx.strokeStyle = 'rgba(255,79,184,0.8)'; ctx.lineWidth = 1; ctx.strokeRect(W / 2 - tw / 2 + 0.5, VIEW_H - 73.5, tw - 1, 21);
        label(w.name, W / 2, VIEW_H - 64, '#ffffff', 'center', 9);
        const am = w.ammo ? `${player.ammo[w.ammo]} ${AMMO_TYPES[w.ammo].name}` : 'NO AMMO NEEDED';
        label(`SLOT ${w.slot}  -  ${am}`, W / 2, VIEW_H - 55, '#ff9be0', 'center', 6.5);
        ctx.restore();
      }
    }
    if (painFlash > 0) { ctx.fillStyle = `rgba(255,0,0,${painFlash * 0.45})`; ctx.fillRect(0, 0, W, VIEW_H); }
    if (pickupFlash > 0) { ctx.fillStyle = `rgba(255,120,220,${pickupFlash * 0.4})`; ctx.fillRect(0, 0, W, VIEW_H); }
    if (pw.mask > 0 && (pw.mask > 3 || Math.sin(time * 18) > 0)) { ctx.fillStyle = 'rgba(40,255,90,0.12)'; ctx.fillRect(0, 0, W, VIEW_H); }
    if (player.slowT > 0) { ctx.fillStyle = `rgba(80,200,255,${Math.min(0.22, player.slowT * 0.15)})`; ctx.fillRect(0, 0, W, VIEW_H); }
    if (player.rageT > 0) { ctx.fillStyle = `rgba(255,0,0,${Math.min(0.35, player.rageT * 0.04)})`; ctx.fillRect(0, 0, W, VIEW_H); }
    if (pw.veil > 0) { const g = ctx.createRadialGradient(W / 2, HOR, 40, W / 2, HOR, W * 0.6); g.addColorStop(0, 'rgba(60,0,90,0)'); g.addColorStop(1, 'rgba(60,0,90,0.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, VIEW_H); }
    drawCombatOverlays();
    if (radarOn && !automap && !photoMode && state === 'playing') drawRadar();
    if (state === 'playing' && !photoMode) {
      if (player.nades > 0 || player.nadeCd > 0) label(`GRENADES ${player.nades}`, 6, VIEW_H - 6, '#ff9be0', 'left', 7);
      if (mode === 'campaign' || mode === 'coop') { const left = L.enemies.filter(e => !e.dead && e.type !== 'barrel').length; if (left > 0 && left <= 3 && L.totalKills >= 6) label(`${left} MONSTER${left > 1 ? 'S' : ''} LEFT`, W / 2, 50, '#ff9be0', 'center', 8); }
      if (player.pw.gloom > 0) { const g = ctx.createRadialGradient(W / 2, HOR, 50, W / 2, HOR, W * 0.6); g.addColorStop(0, 'rgba(140,40,255,0)'); g.addColorStop(1, `rgba(140,40,255,${0.25 + 0.1 * Math.sin(time * 6)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, VIEW_H); }
    }
    if (automap) drawAutomap();
    drawMessages();
    drawAchievementToast(1 / 60);
    if (Voice.subtitle) {
      const t = `"${Voice.subtitle}"`;
      ctx.font = 'italic bold 9px monospace'; const tw = ctx.measureText(t).width;
      ctx.fillStyle = 'rgba(10,0,16,0.6)'; ctx.fillRect(W / 2 - tw / 2 - 4, VIEW_H - 30, tw + 8, 13);
      ctx.textAlign = 'center'; ctx.fillStyle = '#ff9be0'; ctx.fillText(t, W / 2, VIEW_H - 20.5);
    }
    if (!photoMode) drawHUD(); else { ctx.fillStyle = '#07030a'; ctx.fillRect(0, VIEW_H, W, HUD_H); label('PHOTO MODE  -  H to exit, K to save a screenshot', W / 2, VIEW_H + 26, '#ff9be0', 'center', 8); }
    if (state === 'dead') {
      ctx.fillStyle = `rgba(80,0,0,${Math.min(0.6, stateT * 0.4)})`; ctx.fillRect(0, 0, W, VIEW_H);
      if (stateT > 1) {
        ctx.font = '34px "Metal Mania", Impact, serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ff2d4a'; ctx.fillText('YOU DIED', W / 2, 90);
        const k = lastAttacker, nm = k && ENEMY_DEFS[k] ? ENEMY_DEFS[k].name : null;
        if (nm) label(`KILLED BY: ${nm.toUpperCase()}`, W / 2, 108, '#ff9be0', 'center', 8);
        label(CAUSE[k] || 'Too much positivity.', W / 2, nm ? 121 : 110, '#ffd0ec', 'center', 9);
        label('Click to rise again.', W / 2, nm ? 136 : 124, '#c9a6c9', 'center', 8);
      }
    }
    if (online && online.inGame) drawNameTags();
    drawSoloHud();
    if (paused) drawPause();
    if (isTouch && !sideways && window.innerHeight > window.innerWidth) {
      ctx.fillStyle = 'rgba(10,0,16,0.75)'; ctx.fillRect(0, VIEW_H - 16, W, 16);
      label('Turn your phone sideways for full screen', W / 2, VIEW_H - 5, '#ff9be0', 'center', 8);
    }
  }
  const fmtTime = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

  // ------------------------------------------------------------------ input
  let paused = false;
  // convert a click / tap position into the game's own 480-wide coordinates
  function gamePoint(cx, cy) {
    const l = toLocal(cx, cy);
    return { x: (l.x - canvas.offsetLeft) / canvas.offsetWidth * W, y: (l.y - canvas.offsetTop) / canvas.offsetHeight * H };
  }
  function primaryAction(ev) {
    Sfx.init();
    if (performance.now() < ignoreTapUntil) return true;
    if (state === 'editor') return true;
    if (state === 'weekly') { weeklyTap(ev); return true; }
    if (state === 'weeklyDone' && stateT > 1.5) {
      if (Leaderboard.enabled && !cheated && soloResult.newBest) { nameFor = 'weekly'; state = 'enterName'; initCur = 0; stateT = 0; }
      else { state = 'weekly'; stateT = 0; Leaderboard.refreshWeekly(weeklyRun.week); }
      return true;
    }
    if (state === 'customDone' && stateT > 1.5) { leaveSolo('title'); return true; }
    if (state === 'hordeOver' && stateT > 1.5) { horde = null; leaveSolo('title'); return true; }
    if (state === 'lobby') { lobbyTap(ev); return true; }
    if (state === 'dmOver' && stateT > 2) { leaveOnline(); return true; }
    if (state === 'victory' && mode === 'coop' && stateT > 2) { leaveOnline(); return true; }
    if (state === 'playing' && mode !== 'campaign' && ev && ev.clientX !== undefined && !locked()) {
      const g = gamePoint(ev.clientX, ev.clientY), b = QUIT_BOX();
      if (g.x >= b.x - 6 && g.x <= b.x + b.w + 6 && g.y >= b.y - 4 && g.y <= b.y + b.h + 8) { quitSolo(); return true; }
    }
    if (state === 'title') {
      if (ev && ev.clientX !== undefined) { const g = gamePoint(ev.clientX, ev.clientY); titleTap(g.x, g.y); }
      else titleTap();
      return true;
    }
    if (state === 'dead' && stateT > 1) { restartLevel(); return true; }
    if (state === 'intermission' && stateT > 1) { nextLevel(); return true; }
    if (state === 'victory' && stateT > 2) { if (qualifies(runScore)) { state = 'enterName'; initCur = 0; stateT = 0; } else { openScores(); lastEntry = -1; } return true; }
    if (state === 'achievements' && stateT > 0.3) { state = 'title'; return true; }
    if (state === 'scores' && stateT > 0.3) {
      if (Leaderboard.enabled && ev && ev.clientX !== undefined) { // tapping a tab switches it
        const g = gamePoint(ev.clientX, ev.clientY);
        const tab = SCORE_TABS().find(t => g.x >= t.x && g.x <= t.x + 70 && g.y >= 82 && g.y <= 102);
        if (tab) { scoresTab = tab.id; if (tab.id === 'world') Leaderboard.refresh(); return true; }
      }
      state = 'title'; return true;
    }
    if (state === 'enterName') { if (ev && ev.clientX !== undefined) { const g = gamePoint(ev.clientX, ev.clientY); enterNameTap(g.x, g.y); } else saveHighScore(); return true; }
    if (paused) { pauseTap(ev); return true; }
    return false;
  }
  function lockPointer() { if (!isTouch && canvas.requestPointerLock) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} } }
  const locked = () => document.pointerLockElement === canvas;

  window.addEventListener('keydown', e => {
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (state === 'editor') { editor.key(e.code); return; }
    if (state === 'weekly' && (e.code === 'Escape' || e.code === 'Backspace')) { leaveSolo('title'); return; }
    if (state === 'lobby' && (e.code === 'Escape' || e.code === 'Backspace')) { leaveOnline(); return; }
    keys[e.code] = true;
    if (paused && state === 'playing') {
      const items = pauseItems();
      if (e.code === 'ArrowUp') pauseSel = (pauseSel + items.length - 1) % items.length;
      else if (e.code === 'ArrowDown') pauseSel = (pauseSel + 1) % items.length;
      else if (e.code === 'Enter') pauseAct(items[Math.min(pauseSel, items.length - 1)].id);
      else if (e.code === 'Escape' || e.code === 'KeyP') paused = false;
      else if (e.code === 'KeyX') pauseAct('quit');
      return;
    }
    if (state === 'title' && menuPage !== 'main' && (e.code === 'Escape' || e.code === 'Backspace')) { menuPage = 'main'; menuSel = 0; return; }
    if (state === 'title') {
      const items = menuItems();
      if (e.code === 'ArrowUp') menuSel = (menuSel + items.length - 1) % items.length;
      if (e.code === 'ArrowDown') menuSel = (menuSel + 1) % items.length;
      if ((e.code === 'ArrowLeft' || e.code === 'ArrowRight') && items[menuSel].lr) menuActivate(items[menuSel], e.code === 'ArrowLeft' ? -1 : 1);
    }
    if (state === 'enterName') {
      if (e.code === 'ArrowUp') initials[initCur] = (initials[initCur] + 1) % ALPHA.length;
      if (e.code === 'ArrowDown') initials[initCur] = (initials[initCur] + ALPHA.length - 1) % ALPHA.length;
      if (e.code === 'ArrowLeft') initCur = (initCur + 2) % 3;
      if (e.code === 'ArrowRight') initCur = (initCur + 1) % 3;
      if (/^[a-z0-9]$/i.test(e.key)) { initials[initCur] = ALPHA.indexOf(e.key.toUpperCase()); initCur = Math.min(2, initCur + 1); }
      if (e.code === 'Backspace') { initials[initCur] = ALPHA.length - 1; initCur = Math.max(0, initCur - 1); }
      if (e.code === 'Enter') saveHighScore();
      return;
    }
    if (state === 'scores' && Leaderboard.enabled && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) { scoresTab = scoresTab === 'world' ? 'device' : 'world'; if (scoresTab === 'world') Leaderboard.refresh(); return; }
    if (e.code === 'Enter') primaryAction();
    if (state !== 'playing') return;
    if (e.code === 'KeyV') { msg = Voice.toggle() ? "Goffichick's voice on" : "Goffichick's voice off"; msgT = 1.5; }
    if (e.key.length === 1) cheatKey(e.key.toLowerCase());
    if (e.code === 'KeyE') useAction();
    if (e.code === 'Space') jumpReq = true;
    const typingCheat = Object.keys(CHEATS).some(c => { for (let n = Math.min(c.length, cheatBuf.length); n >= 2; n--) if (c.startsWith(cheatBuf.slice(-n))) return true; return false; });
    if (!typingCheat) {
    if (e.code === 'KeyG') throwNade();
    if (e.code === 'KeyN') { radarOn = !radarOn; msg = radarOn ? 'Radar on' : 'Radar off'; msgT = 1.5; }
    if (e.code === 'KeyL') { torchMode = { auto: 'on', on: 'off', off: 'auto' }[torchMode]; msg = `Torch: ${torchMode}`; msgT = 1.5; }
    if (e.code === 'KeyH') { photoMode = !photoMode; msg = photoMode ? 'Photo mode' : ''; msgT = photoMode ? 1.5 : 0; }
    if (e.code === 'KeyK') screenshot();
    if (e.code === 'KeyC') { pitch = 0; HOR = VIEW_H / 2; }
    }
    if (e.code === 'Tab') automap = !automap;
    if (e.code === 'KeyM') { musicOn = Sfx.toggleMusic(); msg = musicOn ? 'Music on' : 'Music off'; msgT = 1.5; }
    if (e.code === 'KeyQ') cycleWeapon(1);
    if (e.code === 'Escape' || e.code === 'KeyP') paused = !paused;
    const n = parseInt(e.key, 10); if (n >= 1 && n <= 9) weaponSlot(n);
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; fireHeld = false; });

  canvas.addEventListener('mousedown', e => {
    if (isTouch) return;
    if (primaryAction(e)) return;
    if (state === 'playing' && !locked()) lockPointer();
    if (e.button === 0) fireHeld = true;
  });
  window.addEventListener('mouseup', () => { fireHeld = false; });
  document.addEventListener('mousemove', e => { if (locked() && state === 'playing' && !paused) { mouseDX += e.movementX; mouseDY += e.movementY; } });
  // without pointer lock (e.g. inside an embedded frame) drag with the mouse to look
  let dragX = null;
  let dragY = null;
  canvas.addEventListener('mousemove', e => { if (!locked() && (e.buttons & 1) && dragX !== null && state === 'playing') { mouseDX += (e.clientX - dragX) * 1.5; mouseDY += (e.clientY - (dragY ?? e.clientY)) * 1.5; } dragX = e.clientX; dragY = e.clientY; });
  canvas.addEventListener('wheel', e => { if (state === 'editor') { editor.wheel(e.deltaY); e.preventDefault(); return; } if (state === 'playing') { cycleWeapon(e.deltaY > 0 ? 1 : -1); e.preventDefault(); } }, { passive: false });
  document.addEventListener('pointerlockchange', () => { if (!locked() && state === 'playing' && !isTouch) { /* stay running; click relocks */ } });

  canvas.addEventListener('mousemove', e => { hoverG = state === 'title' ? gamePoint(e.clientX, e.clientY) : null; });
  canvas.addEventListener('mouseleave', () => { hoverG = null; });
  // ---- the level editor's own pointer input (mouse and touch)
  let edPtr = null;
  canvas.addEventListener('pointerdown', e => {
    if (state !== 'editor' || performance.now() < ignoreTapUntil) return;
    edPtr = e.pointerId; try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    const g = gamePoint(e.clientX, e.clientY); editor.down(g.x, g.y);
    if (state !== 'editor') ignoreTapUntil = performance.now() + 400; // it started a test or went back to the title
  });
  canvas.addEventListener('pointermove', e => { if (state === 'editor' && e.pointerId === edPtr) { const g = gamePoint(e.clientX, e.clientY); editor.move(g.x, g.y); } });
  const edUp = e => { if (e.pointerId !== edPtr) return; edPtr = null; if (state === 'editor') editor.up(); };
  canvas.addEventListener('pointerup', edUp); canvas.addEventListener('pointercancel', edUp);

  // ---- touch controls
  let isTouch = false;
  // Real full screen (hides the browser bars) where the phone allows it - Android and most
  // tablets. Browsers only allow this from a tap, so every touch control asks for it.
  function tryFullscreen() {
    if (window.innerHeight > window.innerWidth) return; // only once the phone is sideways
    const el = document.documentElement, fs = document.fullscreenElement || document.webkitFullscreenElement;
    if (fs) return;
    try {
      const r = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen && el.webkitRequestFullscreen();
      if (r && r.catch) r.catch(() => {});
    } catch (e) {}
  }
  function setupTouch() {
    if (isTouch) return; isTouch = true;
    document.getElementById('touch').addEventListener('pointerdown', tryFullscreen, true);
    const ui = document.getElementById('touch'); ui.style.display = 'block';
    const stick = document.getElementById('stick'), knob = document.getElementById('knob');
    let stickId = null, sx0 = 0, sy0 = 0;
    stick.addEventListener('pointerdown', e => { stickId = e.pointerId; const r = stick.getBoundingClientRect(), c = toLocal(r.left + r.width / 2, r.top + r.height / 2); sx0 = c.x; sy0 = c.y; stick.setPointerCapture(e.pointerId); moveStick(e); e.preventDefault(); });
    const moveStick = e => {
      if (e.pointerId !== stickId) return;
      const r = stick.getBoundingClientRect().width / 2;
      const pt = toLocal(e.clientX, e.clientY);
      let dx = (pt.x - sx0) / r, dy = (pt.y - sy0) / r; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
      touch.mx = dx; touch.my = -dy; knob.style.transform = `translate(${dx * r * 0.6}px, ${dy * r * 0.6}px)`;
    };
    stick.addEventListener('pointermove', moveStick);
    const endStick = e => { if (e.pointerId !== stickId) return; stickId = null; touch.mx = touch.my = 0; knob.style.transform = ''; };
    stick.addEventListener('pointerup', endStick); stick.addEventListener('pointercancel', endStick);
    // right-hand stick: aim (turn and look up/down) for as long as it is held over
    const rstick = document.getElementById('rstick'), rknob = document.getElementById('rknob');
    let rId = null, rx0 = 0, ry0 = 0;
    // Aiming works like Call of Duty Mobile: the view follows your thumb 1:1 as you swipe (precise),
    // and holding your thumb out near the edge keeps turning (for big spins). Wherever your thumb lands
    // becomes the centre, so touching the pad never makes the view jump.
    let lastX = 0, lastY = 0;
    const moveR = e => {
      if (e.pointerId !== rId) return;
      const rad = rstick.getBoundingClientRect().width / 2, pt = toLocal(e.clientX, e.clientY);
      touch.turn += (pt.x - lastX) * 0.011 * LOOK_SENS; touch.pitch += (pt.y - lastY) * 0.5 * LOOK_SENS; // swipe: direct
      lastX = pt.x; lastY = pt.y;
      let dx = (pt.x - rx0) / rad, dy = (pt.y - ry0) / rad; const l = Math.hypot(dx, dy);
      if (l > 1) { rx0 = pt.x - dx / l * rad; ry0 = pt.y - dy / l * rad; dx /= l; dy /= l; } // the centre follows a thumb that keeps going
      const edge = v => Math.abs(v) < 0.6 ? 0 : Math.sign(v) * (Math.abs(v) - 0.6) / 0.4; // only the outer part keeps turning
      touch.rx = edge(dx); touch.ry = edge(dy);
      rknob.style.transform = `translate(${dx * rad * 0.6}px, ${dy * rad * 0.6}px)`;
    };
    if (rstick) rstick.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (primaryAction(e)) return; rId = e.pointerId; const pt = toLocal(e.clientX, e.clientY); rx0 = lastX = pt.x; ry0 = lastY = pt.y; rstick.setPointerCapture(e.pointerId); rknob.style.transform = ''; });
    const endR = e => { if (e.pointerId !== rId) return; rId = null; touch.rx = touch.ry = 0; rknob.style.transform = ''; };
    if (rstick) { rstick.addEventListener('pointermove', moveR); rstick.addEventListener('pointerup', endR); rstick.addEventListener('pointercancel', endR); rstick.addEventListener('lostpointercapture', endR); }
    const look = document.getElementById('look'); let lookId = null, lx = 0, ly = 0;
    look.addEventListener('pointerdown', e => { if (primaryAction(e)) return; lookId = e.pointerId; const l0 = toLocal(e.clientX, e.clientY); lx = l0.x; ly = l0.y; look.setPointerCapture(e.pointerId); });
    // (dragging on the rest of the screen used to turn too; now only the cyan pad aims)
    const endLook = e => { if (e.pointerId === lookId) lookId = null; };
    look.addEventListener('pointerup', endLook); look.addEventListener('pointercancel', endLook);
    const btn = (id, down, up) => { const b = document.getElementById(id); if (!b) return; b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (!primaryAction(e)) down(); }); if (up) { b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up); } };
    btn('bFire', () => { touch.fire = true; touch.fireTap = true; }, () => { touch.fire = false; });
    // the left-thumb FIRE button: each button keeps its own hold, so letting go of one doesn't stop the other
    btn('bFire2', () => { touch.fire2 = true; touch.fireTap = true; }, () => { touch.fire2 = false; });
    btn('bUse', () => state === 'playing' && useAction());
    btn('bWpn', () => state === 'playing' && cycleWeapon(1));
    btn('bMap', () => { automap = !automap; });
    btn('bJump', () => { if (state === 'playing') jumpReq = true; });
    btn('bNade', () => throwNade());
    btn('bPause', () => { if (state === 'playing') { paused = true; pauseSel = 0; } });
  }
  window.addEventListener('touchstart', () => setupTouch(), { once: true, passive: true });
  for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, () => { Voice.unlock(); if (state !== 'loading') { Sfx.init(); Sfx.startMusic(); } }, { capture: true, passive: true });
  // the very first tap lands on the canvas (before the touch overlay exists): let it start the game
  canvas.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') { setupTouch(); tryFullscreen(); primaryAction(e); } });
  // Claim every touch gesture for the game. Without this, in-app browsers such as Facebook's
  // read a sideways look-drag as "swipe to go back / close", and a downward drag as "pull to close".
  const blockGesture = e => { if (e.cancelable) e.preventDefault(); };
  for (const ev of ['touchstart', 'touchmove']) {
    document.addEventListener(ev, e => {
      // let the title / end screens still receive normal taps; block everything that drags
      if (ev === 'touchmove' || e.target.closest('#touch') || e.target === canvas) blockGesture(e);
    }, { passive: false });
  }
  for (const ev of ['gesturestart', 'gesturechange', 'dblclick', 'contextmenu']) document.addEventListener(ev, blockGesture, { passive: false });

  // ------------------------------------------------------------------ online play (deathmatch and co-op)
  // Everyone runs their own game and shares where they are, what they shot and what they picked up.
  // Deathmatch: whoever fires decides what they hit and tells the player they hit.
  // Co-op: the host runs the monsters and sends where they are; the others tell the host what they hit.
  const DM_FRAGS = 10, DM_TIME = 600, DM_HIT = 0.5, AV_DEF = { name: 'player', hp: 100, radius: 0.3, h: 0.92, pain: 0, ai: false };
  const ST_CODE = { idle: 0, chase: 1, attack: 2, pain: 3, dead: 4, 'attack-charge': 5, static: 6 }, ST_NAME = Object.keys(ST_CODE);
  const EP_OWNER = { type: '_ep', ghostEnemy: true, x: 0, y: 0 };
  let online = null;
  const myName = () => initials.map(i => ALPHA[i]).join('').trim() || '???';
  const ROOM_ABC = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  function newOnline(code, host) {
    return { code, host, kind: onKind, lvl: onLvl, diff, peers: new Map(), hostId: host ? Net.id : null, started: false, inGame: false, frags: {}, names: {},
      sendT: 0, hiT: 0, ep: [], pp: [], out: { hit: {}, hurt: {}, dmg: {} }, shots: 0, tick: 0, lastHit: null, deathSent: false, status: 'connecting', nextColor: 0, note: '' };
  }
  function hostOnline() {
    if (!Net.enabled) { msg = 'Online play needs the Supabase settings in js/leaderboard.js.'; msgT = 4; return; }
    let code = ''; for (let i = 0; i < 3; i++) code += ROOM_ABC[irand(0, ROOM_ABC.length - 1)];
    online = newOnline(code, true); Net.connect(code, onNet, s => { if (online) online.status = s; });
    state = 'lobby'; stateT = 0;
  }
  function joinOnline(code) {
    online = newOnline(code, false); Net.connect(code, onNet, s => { if (online) online.status = s; });
    state = 'lobby'; stateT = 0;
  }
  function leaveOnline(note) {
    if (online) { Net.send('bye', {}); Net.close(); }
    online = null; menuPage = 'online'; menuSel = 0;
    if (mode !== 'campaign' || state !== 'title') leaveSolo('title');
    if (note) { msg = note; msgT = 4; }
  }
  function peerOf(id, name) {
    let pe = online.peers.get(id);
    if (!pe) {
      const used = new Set([...online.peers.values()].map(q => q.color));
      let c = 0; while (used.has(c) && c < 3) c++;
      pe = { id, name: name || '???', x: 0, y: 0, a: 0, fz: 0, w: 'pistol', dead: false, f: 0, seen: time, color: c, lv: -1, tx: null, ty: null, avatar: null };
      online.peers.set(id, pe);
      if (online.inGame) { msg = `${pe.name} joined the game.`; msgT = 3; }
    }
    if (name) pe.name = name;
    online.names[id] = pe.name;
    pe.seen = time;
    return pe;
  }
  function onNet(ev, p) {
    if (!online) return;
    const from = p._from;
    if (ev === 'bye') { const pe = online.peers.get(from); if (pe) dropPeer(pe, `${pe.name} left the game.`); return; }
    const pe = peerOf(from, p.n);
    if (ev === 'hi') {
      if (online.host) {
        Net.send('room', { kind: online.kind, lvl: online.lvl, diff: online.diff, started: online.started, n: myName() });
        if (online.started) Net.send('go', { kind: online.kind, lvl: mode === 'coop' ? levelIndex : online.lvl, diff: online.diff, n: myName() });
      }
    } else if (ev === 'room') {
      if (!online.host) { online.hostId = from; online.kind = p.kind; online.lvl = p.lvl; online.diff = p.diff; }
    } else if (ev === 'go') {
      if (!online.host && !online.started) { online.hostId = from; online.kind = p.kind; online.lvl = p.lvl; online.diff = p.diff; startOnline(); }
    } else if (ev === 'st') {
      if (pe.tx === null) { pe.x = p.x; pe.y = p.y; }
      pe.tx = p.x; pe.ty = p.y; pe.a = p.a; pe.fz = p.z; pe.dead = !!p.d; pe.lv = p.lv;
      if (p.f !== pe.f) { if (pe.f !== undefined && online.inGame) remoteShot(pe, p.w); pe.f = p.f; }
      pe.w = p.w;
      if (online.inGame && p.pp) for (const r of p.pp) spawnGhost(r, 'ghost');
      if (online.inGame && mode === 'coop' && !online.host && from === online.hostId && p.lv === levelIndex) {
        if (p.es) applySnapshot(p.es);
        if (p.ep) for (const r of p.ep) spawnGhost(r, EP_OWNER);
      }
      if (online.inGame && state === 'playing') {
        for (const h of p.hit || []) if (h[0] === Net.id && mode === 'dm') { lastAttacker = 'player'; online.lastHit = { id: from, t: time }; damagePlayer(Math.max(1, Math.round(h[1])), h[2], h[3]); }
        for (const h of p.hurt || []) if (h[0] === Net.id && mode === 'coop') damagePlayer(Math.round(h[1]), h[2], h[3]);
      }
      if (online.inGame && mode === 'coop' && online.host && p.lv === levelIndex) for (const [i, d] of p.dmg || []) { const e = L.enemies[i]; if (e) damageEnemy(e, d, pe.avatar || 'peer'); }
    } else if (ev === 'frag') {
      addFrag(p.k, p.v);
    } else if (ev === 'take') {
      const it = L && L.items[p.i];
      if (online.inGame && it && (mode === 'dm' || p.lv === levelIndex) && !(mode === 'coop' && it.def.key)) { it.taken = true; if (mode === 'dm') it.respawnT = 25; }
    } else if (ev === 'exit') {
      if (mode === 'coop' && state === 'playing' && p.lvl === levelIndex) { L.exitFromNet = true; msg = `${pe.name} reached the exit!`; msgT = 3; completeLevel(); }
    } else if (ev === 'lvl') {
      if (mode === 'coop' && !online.host && online.inGame) { levelIndex = p.i; if (levelIndex >= LEVELS.length) { leaveOnline('The host finished the game!'); return; } loadLevel(levelIndex, carry); state = 'playing'; stateT = 0; }
    }
  }
  function dropPeer(pe, note) {
    online.peers.delete(pe.id);
    if (L && pe.avatar) L.avatars = L.avatars.filter(a => a !== pe.avatar);
    if (pe.id === online.hostId && (mode === 'coop' || !online.started)) { leaveOnline('The host left the game.'); return; }
    if (note) { msg = note; msgT = 3; }
  }
  function addFrag(k, v) {
    if (!online) return;
    online.frags[k] = (online.frags[k] || 0) + (k === v ? -1 : 1);
    const nk = k === Net.id ? 'You' : online.names[k] || '???', nv = v === Net.id ? 'you' : online.names[v] || '???';
    msg = k === v ? `${nk === 'You' ? 'You' : nk} took the easy way out.` : `${nk} fragged ${nv}!`; msgT = 3;
    if (k === Net.id && k !== v) Voice.say('kill', 0.6);
    if (Object.values(online.frags).some(f => f >= DM_FRAGS)) { state = 'dmOver'; stateT = 0; }
  }
  function startOnline() {
    if (mode === 'campaign') campaignDiff = diff;
    online.started = true; online.inGame = true; online.frags = {};
    mode = online.kind; diff = online.diff; god = false; cheated = false; carry = null; runScore = 0; paused = false; mods = { hurt: 1, hit: 1, speed: 1 };
    if (mode === 'dm') { soloDef = DM_LEVELS[0]; loadLevel(soloDef, null); respawnOnline(true); }
    else { levelIndex = online.lvl; loadLevel(levelIndex, null); }
    beginPlay(); stateT = 0;
    msg = mode === 'dm' ? `DEATHMATCH! First to ${DM_FRAGS} frags wins.` : `CO-OP: ${L.def.name}`; msgT = 4;
  }
  function hostStart() {
    if (!online || !online.host || online.status !== 'ok') return;
    online.kind = onKind; online.lvl = onLvl; online.diff = diff;
    Net.send('go', { kind: online.kind, lvl: online.lvl, diff: online.diff, n: myName() });
    startOnline();
  }
  // back into the fight after dying (deathmatch: at the spawn point furthest from everyone)
  function respawnOnline(first) {
    const keep = mode === 'coop' && carry ? { ...carry, health: 100 } : null;
    const was = player; player = newPlayer(keep);
    let sp = L.starts[0] || { x: was.x, y: was.y, a: was.a };
    if (mode === 'dm') {
      let best = -1;
      for (const s0 of L.starts) {
        const near = Math.min(99, ...L.avatars.filter(a => !a.dead).map(a => Math.hypot(a.x - s0.x, a.y - s0.y)));
        const score = near + Math.random() * 2; if (score > best) { best = score; sp = s0; }
      }
      for (const w of WEAPONS) player.weapons[w.key] = ['knuckles', 'chainsaw', 'pistol', 'shotgun'].includes(w.key);
      for (const k in player.ammo) player.ammo[k] = { bullets: 60, shells: 12 }[k] || 0;
      player.cur = 'shotgun';
    }
    player.x = sp.x; player.y = sp.y; player.a = sp.a; player.fz = floorAt(sp.x, sp.y);
    online.deathSent = false; online.lastHit = null;
    if (!first) { state = 'playing'; stateT = 0; Sfx.play.weaponUp(); spawnFx('gloomHit', sp.x, sp.y, 0.5, 0.9, 0.5); swirlFx(sp.x, sp.y, player.fz, '255,90,200'); }
  }
  function netTake(it) {
    if (!online || !online.inGame) return;
    if (mode === 'dm') it.respawnT = 25;
    if (!(mode === 'coop' && it.def.key)) Net.send('take', { i: L.items.indexOf(it), lv: mode === 'coop' ? levelIndex : -1, n: myName() });
  }
  function spawnGhost(r, owner) {
    if (!Array.isArray(r) || !PROJECTILES[r[0]]) return;
    const def = PROJECTILES[r[0]];
    L.projs.push({ kind: r[0], def, x: r[1] + Math.cos(r[4]) * 0.4, y: r[2] + Math.sin(r[4]) * 0.4, z: r[3], vx: Math.cos(r[4]) * def.speed, vy: Math.sin(r[4]) * def.speed,
      owner, frames: S.proj[r[0]], life: def.life || 6, age: 0, fireA: r[4], vz: def.grav ? 3.2 : 0 });
  }
  function remoteShot(pe, wkey) {
    const d = Math.hypot(pe.x - player.x, pe.y - player.y), w = weaponByKey(wkey);
    if (pe.avatar) addLight(pe.x, pe.y, 1, 0.8, 0.4, 0.5, 2.5);
    if (w && d < 12 && Sfx.play[w.sound] && !w.auto) Sfx.play[w.sound]();
    else if (w && d < 12 && Math.random() < 0.3 && Sfx.play[w.sound]) Sfx.play[w.sound]();
  }
  // a monster gets hit while it's really another player
  function hitAvatar(e, dmg, src) {
    if (!online) return;
    const add = (kind, x, y, d) => { const h = online.out[kind][e.peer] || (online.out[kind][e.peer] = [e.peer, 0, +x.toFixed(2), +y.toFixed(2)]); h[1] += d; };
    if (mode === 'dm' && src === 'player') add('hit', player.x, player.y, dmg * DM_HIT);
    else if (mode === 'coop' && online.host && src && typeof src === 'object' && !src.remote) add('hurt', src.x, src.y, dmg);
  }
  function applySnapshot(es) {
    for (let i = 0; i < es.length; i++) {
      const r = es[i];
      let e = L.enemies[i];
      if (!e) { if (!r[5] || !ENEMY_DEFS[r[5]]) continue; spawnEnemy(r[5], r[0] / 50, r[1] / 50); e = L.enemies[i]; if (!e) continue; e.state = 'chase'; }
      e.nx = r[0] / 50; e.ny = r[1] / 50; e.hp = r[2];
      const st = ST_NAME[r[3]] || 'chase', pd = Math.hypot(e.x - player.x, e.y - player.y);
      if (st === 'dead') {
        if (!e.dead) {
          e.dead = true; e.state = 'dead'; e.frame = 0; e.t = 0; player.kills++;
          if (e.type === 'barrel') { spawnFx('boom', e.x, e.y, 0.3, 1.1, 0.45); Sfx.play.explode(pd); }
          else { Sfx.play[e.def.boss ? 'bossRoar' : 'enemyDie'](pd); spawnParts('drop', e.x, e.y, (e.fz || 0) + e.z + e.def.h * 0.55, 8, 1.6); }
          if (e.def.boss) { L.bossDeadT = 3; msg = e.def.deathMsg || 'THE BOSS IS DOWN!'; msgT = 4; }
        }
        continue;
      }
      if (e.state === 'idle' && st !== 'idle') { Sfx.play[e.def.sight] && Sfx.play[e.def.sight](pd); if (e.def.boss) L.bossRef = e; }
      if (st === 'attack' && e.state !== 'attack') { e.fired = true; Sfx.play[e.def.atkSound] && Sfx.play[e.def.atkSound](pd); }
      if (st === 'pain' && e.state !== 'pain') Sfx.play.enemyPain(pd);
      e.state = st;
    }
  }
  function puppetEnemies(dt) {
    for (const e of L.enemies) {
      e.animT += dt;
      if (e.dead) { if (e.type !== 'barrel' && e.frame < S.enemy[e.type].die.length - 1) { e.t += dt; if (e.t > 0.12) { e.t = 0; e.frame++; } } continue; }
      if (e.nx !== undefined) { const k = Math.min(1, dt * 8); e.x += (e.nx - e.x) * k; e.y += (e.ny - e.y) * k; e.fz = floorAt(e.x, e.y); }
    }
  }
  // keep an avatar in the world for every other player on this level
  function syncAvatars(dt) {
    for (const pe of online.peers.values()) {
      const here = online.inGame && (mode === 'dm' || pe.lv === levelIndex) && pe.tx !== null;
      if (!here) { if (pe.avatar) { L.avatars = L.avatars.filter(a => a !== pe.avatar); pe.avatar = null; } continue; }
      if (!pe.avatar || !L.avatars.includes(pe.avatar)) {
        pe.avatar = { type: 'av' + pe.color, def: AV_DEF, remote: true, peer: pe.id, x: pe.tx, y: pe.ty, fz: pe.fz, z: 0, hp: 100, state: 'static', animT: 0, frame: 0, t: 0, dead: false, target: null };
        L.avatars.push(pe.avatar);
      }
      const av = pe.avatar, k = Math.min(1, dt * 10), ox = av.x, oy = av.y;
      av.x += (pe.tx - av.x) * k; av.y += (pe.ty - av.y) * k; av.fz = pe.fz || floorAt(av.x, av.y);
      if (Math.hypot(av.x - ox, av.y - oy) > 0.004) av.animT += dt;
      if (pe.dead && !av.dead) { av.dead = true; av.frame = 0; av.t = 0; Sfx.play.enemyDie(Math.hypot(av.x - player.x, av.y - player.y)); }
      if (!pe.dead && av.dead) av.dead = false;
      if (av.dead && av.frame < S.enemy[av.type].die.length - 1) { av.t += dt; if (av.t > 0.12) { av.t = 0; av.frame++; } }
    }
  }
  // co-op host: monsters also go after the other players
  function retarget() {
    for (const e of L.enemies) {
      if (e.dead || e.type === 'barrel' || e.state === 'static') continue;
      let best = null, bd = Math.hypot(e.x - player.x, e.y - player.y) * (player.dead ? 99 : 0.85);
      for (const av of L.avatars) {
        if (av.dead) continue;
        const d = Math.hypot(av.x - e.x, av.y - e.y);
        if (d < bd && d < 22 && losClear(e.x, e.y, av.x, av.y)) { best = av; bd = d; }
      }
      if (best && e.state === 'idle') wake(e);
      if (best && (!e.target || e.target.remote)) e.target = best;
      else if (!best && e.target && e.target.remote) e.target = null;
    }
  }
  function netUpdate(dt) {
    const o = online;
    for (const pe of [...o.peers.values()]) if (time - pe.seen > 8) dropPeer(pe, `${pe.name} lost connection.`);
    if (!online) return;
    if ((o.status === 'error' || o.status === 'closed') && !o.inGame) o.note = Net.reason || "Couldn't connect to the online server. Check your connection.";
    if (state === 'lobby') {
      o.hiT -= dt;
      if (o.hiT <= 0 && o.status === 'ok') { o.hiT = 1.5; Net.send('hi', { n: myName() }); if (o.host) Net.send('room', { kind: onKind, lvl: onLvl, diff, started: false, n: myName() }); }
      if (o.host) { o.kind = onKind; o.lvl = onLvl; }
      return;
    }
    if (!o.inGame || !L) return;
    syncAvatars(dt);
    if (mode === 'coop' && o.host) { o.rt = (o.rt || 0) - dt; if (o.rt <= 0) { o.rt = 0.5; retarget(); } }
    if (mode === 'dm') {
      for (const it of L.items) if (it.taken && it.respawnT > 0) { it.respawnT -= dt; if (it.respawnT <= 0) { it.taken = false; spawnFx('gloomHit', it.x, it.y, 0.3, 0.5, 0.4); } }
      if (player.dead && !o.deathSent) { o.deathSent = true; const k = o.lastHit && time - o.lastHit.t < 4 ? o.lastHit.id : Net.id; Net.send('frag', { k, v: Net.id, n: myName() }); addFrag(k, Net.id); }
      if (state === 'playing' && levelTime >= DM_TIME) { state = 'dmOver'; stateT = 0; }
    }
    o.sendT -= dt;
    if (o.sendT <= 0) {
      o.sendT = 1 / 7; o.tick++;
      const p = player, m = { n: myName(), x: +p.x.toFixed(2), y: +p.y.toFixed(2), a: +p.a.toFixed(2), z: +p.fz.toFixed(2), w: p.cur, d: p.dead ? 1 : 0, f: o.shots, lv: mode === 'coop' ? levelIndex : -1 };
      if (o.pp.length) { m.pp = o.pp; o.pp = []; }
      const hits = Object.values(o.out.hit), hurts = Object.values(o.out.hurt), dmgs = Object.entries(o.out.dmg);
      if (hits.length) m.hit = hits.map(h => [h[0], Math.round(h[1] * 10) / 10, h[2], h[3]]);
      if (hurts.length) m.hurt = hurts.map(h => [h[0], Math.round(h[1]), h[2], h[3]]);
      if (dmgs.length) m.dmg = dmgs.map(([i, d]) => [+i, Math.round(d)]);
      o.out = { hit: {}, hurt: {}, dmg: {} };
      if (mode === 'coop' && o.host) {
        if (o.ep.length) { m.ep = o.ep; o.ep = []; }
        if (o.tick % 2 === 0) m.es = L.enemies.map((e, i) => { const r = [Math.round(e.x * 50), Math.round(e.y * 50), Math.max(0, Math.round(e.hp)), ST_CODE[e.state] ?? 1]; if (i >= L.baseEnemies) { r.push(0, e.type); } return r; });
      }
      Net.send('st', m);
    }
  }
  // ---- online screens
  const LOBBY_BTN = () => ({ start: { x: W / 2 - 110, y: 232, w: 100, h: 20 }, leave: { x: W / 2 + 10, y: 232, w: 100, h: 20 } });
  function drawLobby() {
    drawTitle();
    ctx.fillStyle = 'rgba(5,0,10,0.93)'; ctx.fillRect(0, 0, W, H);
    const o = online; if (!o) return;
    ctx.font = '24px "Metal Mania", Impact, serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#ff4fb8'; ctx.shadowColor = '#ff2d95'; ctx.shadowBlur = 10; ctx.fillText(o.host ? 'YOUR GAME' : 'JOINING A GAME', W / 2, 30); ctx.shadowBlur = 0;
    label('ROOM CODE', W / 2, 48, '#c9a6c9', 'center', 8);
    digits(o.code, W / 2, 80, 30, '#ffffff');
    const kind = o.host ? onKind : o.kind, lvl = o.host ? onLvl : o.lvl;
    label(kind === 'dm' ? `DEATHMATCH  -  first to ${DM_FRAGS} frags, ${DM_TIME / 60} minutes` : `CO-OP CAMPAIGN  -  starting at ${LEVELS[lvl].name}`, W / 2, 98, '#ffcf3a', 'center', 8);
    const st = o.status === 'ok' ? '' : o.status === 'connecting' ? 'Connecting...' : o.note || "Couldn't connect to the online server.";
    if (st) label(st, W / 2, 112, '#ffd0ec', 'center', 8);
    label('PLAYERS', W / 2, 128, '#ff9be0', 'center', 8);
    const list = [{ name: myName() + '  (you)' + (o.host ? '  - host' : ''), c: null }, ...[...o.peers.values()].map(pe => ({ name: pe.name + (pe.id === o.hostId ? '  - host' : ''), c: pe.color }))];
    list.slice(0, 6).forEach((q, i) => label(q.name, W / 2, 142 + i * 11, q.c === null ? '#ffffff' : ['#ff4fb8', '#28dcff', '#78ff3c', '#ffc81e'][q.c], 'center', 8.5));
    label(o.host ? (o.status === 'ok' ? 'Tell your friends the room code. Press START when everyone is here.' : '') : (o.status === 'ok' ? (o.hostId ? 'Waiting for the host to start...' : 'Looking for the host... check the room code.') : ''), W / 2, 220, '#c9a6c9', 'center', 7.5);
    const b = LOBBY_BTN();
    if (o.host) { ctx.fillStyle = o.status === 'ok' ? '#ff2d95' : '#5a2a45'; ctx.fillRect(b.start.x, b.start.y, b.start.w, b.start.h); label('START', b.start.x + b.start.w / 2, b.start.y + 14, '#ffffff', 'center', 10); }
    ctx.fillStyle = 'rgba(255,79,184,0.25)'; const lv = o.host ? b.leave : { ...b.leave, x: W / 2 - 50 }; ctx.fillRect(lv.x, lv.y, lv.w, lv.h); label('LEAVE', lv.x + lv.w / 2, lv.y + 14, '#ffffff', 'center', 10);
  }
  function lobbyTap(ev) {
    if (stateT < 0.3) return;
    if (!ev || ev.clientX === undefined) { if (online.host) hostStart(); return; }
    const g = gamePoint(ev.clientX, ev.clientY), b = LOBBY_BTN(), inB = r => g.x >= r.x - 4 && g.x <= r.x + r.w + 4 && g.y >= r.y - 4 && g.y <= r.y + r.h + 4;
    if (online.host && inB(b.start)) hostStart();
    else if (inB(online.host ? b.leave : { ...b.leave, x: W / 2 - 50 })) leaveOnline();
  }
  function fragTable() {
    const rows = [{ id: Net.id, name: myName(), c: null }, ...[...online.peers.values()].map(pe => ({ id: pe.id, name: pe.name, c: pe.color }))];
    for (const r of rows) r.f = online.frags[r.id] || 0;
    return rows.sort((a, b) => b.f - a.f);
  }
  function drawOnlineHud() {
    if (mode === 'dm') fragTable().slice(0, 5).forEach((r, i) => {
      ctx.fillStyle = 'rgba(10,0,16,0.55)'; ctx.fillRect(W - 92, 20 + i * 10, 88, 9.5);
      label(r.name, W - 88, 27.5 + i * 10, r.c === null ? '#ffffff' : ['#ff4fb8', '#28dcff', '#78ff3c', '#ffc81e'][r.c], 'left', 7);
      label(String(r.f), W - 8, 27.5 + i * 10, '#ffcf3a', 'right', 7);
    });
    else label(`CO-OP  ${online.peers.size + 1} PLAYERS  -  ROOM ${online.code}`, W - 4, 27, '#ff9be0', 'right', 6.5);
  }
  function drawNameTags() {
    const p = player, dirX = Math.cos(p.a), dirY = Math.sin(p.a);
    for (const av of L.avatars) {
      const pe = online.peers.get(av.peer); if (!pe || av.dead) continue;
      const dx = av.x - p.x, dy = av.y - p.y, depth = dx * dirX + dy * dirY;
      if (depth < 0.4 || depth > 16) continue;
      const tX = (dirX * dy - dirY * dx) / PLANE, sx = (W / 2) * (1 + tX / depth);
      if (sx < 0 || sx >= W) continue;
      const zc = zbuf[Math.min(RW - 1, Math.max(0, Math.round(sx * (RW / W))))];
      if (zc < depth - 0.3) continue;
      const top = HOR + (p.eyeZ - (av.fz || 0) - av.def.h - 0.12) * PROJ / depth;
      label(pe.name, sx, top, ['#ff4fb8', '#28dcff', '#78ff3c', '#ffc81e'][pe.color], 'center', Math.max(6, Math.min(9, 12 / depth + 5)));
    }
  }
  function drawDmOver() {
    drawTitle();
    const rows = fragTable();
    drawOverlayText(rows[0] && rows[0].id === Net.id ? 'YOU WIN!' : 'MATCH OVER', `${rows[0] ? rows[0].name : '???'} wins the Mosh Pit`, [
      ...rows.slice(0, 6).map((r, i) => `${i + 1}.  ${r.name}   ${r.f} FRAGS`), '', stateT > 2 ? 'CLICK TO LEAVE' : ''], 14);
  }

  // ------------------------------------------------------------------ level editor and shared levels
  function shareLevel(lvl) {
    const url = location.href.split('#')[0] + '#lvl=' + LevelCode.encode(lvl);
    const copy = () => (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(url) : Promise.reject(new Error('no clipboard')))
      .then(() => 'Link copied - paste it to your friends!', () => { window.prompt('Copy this link and send it to your friends:', url); return 'Send that link to your friends!'; });
    if (navigator.share) return navigator.share({ title: 'Goffichick', text: `Play my Goffichick level "${lvl.name}"!`, url }).then(() => 'Shared!', err => err && err.name === 'AbortError' ? 'Share cancelled.' : copy());
    return copy();
  }
  const editor = makeEditor({
    get ctx() { return ctx; }, W: () => W, H,
    label: (...a) => label(...a), sprites: () => S, textures: Textures, sfx: Sfx.play,
    onTest: (lvl, warn) => { startSolo('test', customLevelDef(lvl)); if (warn) { msg = warn; msgT = 4; } },
    onExit: () => { state = 'title'; stateT = 0; ignoreTapUntil = performance.now() + 400; },
    share: shareLevel,
  });
  let sharedLvl = null;
  function readSharedLevel() {
    const m = /[#&]lvl=([\w-]+)/.exec(location.hash);
    sharedLvl = m ? LevelCode.decode(m[1], validTile) : null;
    if (sharedLvl && !checkLevel(sharedLvl).ok) sharedLvl = null;
    if (sharedLvl) menuSel = 0;
  }
  readSharedLevel();
  window.addEventListener('hashchange', readSharedLevel);

  // ------------------------------------------------------------------ boot
  function loadImages(map) {
    return Promise.all(Object.entries(map).map(([k, src]) => new Promise((res, rej) => {
      const im = new Image(); im.onload = () => res([k, im]); im.onerror = rej; im.src = src;
    }))).then(Object.fromEntries);
  }

  let last = performance.now();
  let touchShown = null;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (isTouch) { // in-game touch controls only while actually playing
      const show = state === 'playing' && !paused;
      if (show !== touchShown) { touchShown = show; document.getElementById('touch').style.display = show ? 'block' : 'none'; }
    }
    pollGamepad(dt);
    if (online) netUpdate(dt);
    if (slowMoT > 0) slowMoT -= dt;
    // keep it smooth: if frames stay slow while playing, quietly turn off the heaviest effects
    frameAvg += (dt - frameAvg) * 0.05;
    // steps: 1 no bloom, 2 no reflections / corner shadows, 3 no grading, round shadows or extra particles,
    // 4 render the 3D view at 75% resolution. On EFFECTS LOW it goes straight to step 4 if it needs to.
    if (state === 'playing' && !paused && fxDrop < 4) {
      slowFor = frameAvg > 1 / 45 ? slowFor + dt : Math.max(0, slowFor - dt);
      if (slowFor > 2.5) { fxDrop = FX_HIGH ? fxDrop + 1 : 4; slowFor = 0; if (fxDrop >= 4 && renderScale === 1) { renderScale = 0.75; fitScreen(); } }
    }
    if (!paused) update(slowMoT > 0 ? dt * 0.35 : dt); else time += dt;
    draw();
    requestAnimationFrame(frame);
  }
  fitScreen();
  for (const ev of ['resize', 'orientationchange']) window.addEventListener(ev, () => { fitScreen(); setTimeout(fitScreen, 250); });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitScreen);
  requestAnimationFrame(frame);

  const fontReady = document.fonts ? document.fonts.load('30px "Metal Mania"').catch(() => {}) : Promise.resolve();
  Promise.all([loadImages(PHOTO_DATA), fontReady]).then(([photos]) => {
    S = Sprites.build(photos);
    buildFaces(photos);
    buildHudBg();
    titleImg = photos.title;
    state = 'title';
    // expose a tiny debug hook for testing
    window.GOFFI = { get state() { return state; }, get player() { return player; }, get level() { return L; }, start: startGame, completeLevel, ach, ACHIEVEMENTS, get quality() { return QUALITY; }, get score() { return runScore; }, highScores, get diff() { return diff; }, set diff(v) { diff = v; }, continueGame, savedGame, setLevel: i => { levelIndex = i; loadLevel(i, null); state = 'playing'; }, get mode() { return mode; }, get jar() { return jar; }, get tipRect() { return kofiName() ? TIP_RECT() : null; }, get menuSel() { return menuSel; }, get song() { return Sfx.song; }, get musicMode() { return musicMode; }, get look() { return LOOK_SENS; }, get touchState() { return touch; }, get menuItems() { return menuItems().map(i => i.id); }, get lamps() { return L && L.lamps; }, get shafts() { return L && L.shafts; }, get pitch() { return pitch; }, set pitch(v) { pitch = v; HOR = VIEW_H / 2 + v; }, get horde() { return horde; }, throwNade, jump: () => { jumpReq = true; }, get paused() { return paused; }, spawn: (t, x, y) => spawnEnemy(t, x, y), startHorde: () => startSolo('horde', DM_LEVELS[0]), get fxHigh() { return FX_HIGH; }, set fxHigh(v) { FX_HIGH = v; }, get fxDrop() { return fxDrop; }, set fxDrop(v) { fxDrop = v; if (v < 4 && renderScale !== 1) { renderScale = 1; fitScreen(); } }, get renderScale() { return renderScale; }, get res() { return RES; }, get online() { return online; }, Net, get menuPage() { return menuPage; }, weeklyInfo, editor, LevelCode, get sharedLvl() { return sharedLvl; }, get levelTime() { return levelTime; }, set levelTime(v) { levelTime = v; } };
  });
})();
