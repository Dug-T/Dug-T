// Wally Squad — game data: factions, buildings, units, weapons.
export const CELL = 2;            // world units per grid cell
export const GRID = 128;          // cells per side
export const WORLD = CELL * GRID; // 256 world units
export const HALF = WORLD / 2;
export const WATER_LEVEL = -1.2;

export const FACTIONS = {
  wally: { id: 'wally', name: 'Wally Squad', color: 0x2f7fe0, dark: 0x163a66, accent: 0xffc23a, light: 0x8fd0ff, css: '#3d8bff' },
  grim:  { id: 'grim',  name: 'Grimlock Legion', color: 0xc8312b, dark: 0x3a1210, accent: 0x2a2a2a, light: 0xff6a3a, css: '#ff4a3d' },
  neutral: { id: 'neutral', name: 'Neutral', color: 0x8f949a, dark: 0x45494e, accent: 0xffc23a, light: 0xfff2c0, css: '#b9bec4' },
};

// Army colours you can pick for your own side (skirmish, survival, sandbox)
export const TEAM_COLORS = {
  blue:   { name: 'Blue', color: 0x2f7fe0, dark: 0x163a66, light: 0x8fd0ff, css: '#3d8bff', hue: 215 },
  red:    { name: 'Red', color: 0xc8312b, dark: 0x3a1210, light: 0xff6a3a, css: '#ff4a3d', hue: 3 },
  green:  { name: 'Green', color: 0x2fa84a, dark: 0x124a20, light: 0x8cffa0, css: '#3ccf5c', hue: 133 },
  purple: { name: 'Purple', color: 0x8446d8, dark: 0x2e1550, light: 0xd2a8ff, css: '#a56bff', hue: 268 },
  gold:   { name: 'Gold', color: 0xd8a020, dark: 0x5a3e08, light: 0xffe08a, css: '#f2b830', hue: 42 },
  orange: { name: 'Orange', color: 0xe8701c, dark: 0x5a2606, light: 0xffb070, css: '#ff8a3a', hue: 25 },
  teal:   { name: 'Teal', color: 0x18a8a8, dark: 0x0a3e40, light: 0x8ff4f0, css: '#2fd0cc', hue: 180 },
  pink:   { name: 'Pink', color: 0xe0509a, dark: 0x561238, light: 0xffa8d6, css: '#ff6ab4', hue: 330 },
  steel:  { name: 'Steel', color: 0x5d6670, dark: 0x22272c, light: 0xc8d4e0, css: '#9aa6b4', hue: -1 },
};
// Recolour your side; if your pick is close to the enemy's colour, the enemy swaps to your side's usual colours
export function applyTeamColor(player, key) {
  const c = TEAM_COLORS[key]; if (!c) return;
  const enemy = player === 'wally' ? 'grim' : 'wally';
  const orig = { color: FACTIONS[player].color, dark: FACTIONS[player].dark, light: FACTIONS[player].light, css: FACTIONS[player].css };
  Object.assign(FACTIONS[player], { color: c.color, dark: c.dark, light: c.light, css: c.css });
  const eh = enemy === 'grim' ? 3 : 215;
  const close = c.hue >= 0 && Math.min(Math.abs(c.hue - eh), 360 - Math.abs(c.hue - eh)) < 35;
  if (close) Object.assign(FACTIONS[enemy], orig);
}

// Damage multipliers: warhead -> armour class
export const WARHEADS = {
  bullet:    { infantry: 1.0, light: 0.55, heavy: 0.22, building: 0.2, air: 0.6 },
  shell:     { infantry: 0.45, light: 0.9, heavy: 1.0, building: 0.75, air: 0 },
  rocket:    { infantry: 0.35, light: 1.0, heavy: 1.1, building: 0.85, air: 1.25 },
  artillery: { infantry: 1.2, light: 0.85, heavy: 0.55, building: 1.0, air: 0 },
  beam:      { infantry: 1.0, light: 1.0, heavy: 1.0, building: 0.8, air: 0 },
  sniper:    { infantry: 4.0, light: 0.08, heavy: 0.04, building: 0.02, air: 0.05 },
  flame:     { infantry: 1.6, light: 0.7, heavy: 0.35, building: 0.9, air: 0 },
};

export const WEAPONS = {
  rifle:    { warhead: 'bullet', damage: 13, range: 11, rof: 0.75, proj: 'bullet', air: true, ground: true, sound: 'rifle' },
  nessieBite: { warhead: 'shell', damage: 120, range: 6, rof: 1.6, proj: 'melee', air: false, ground: true, sound: 'bite' },
  coastGun: { warhead: 'shell', damage: 95, range: 20, rof: 2.4, proj: 'shell', air: false, ground: true, sound: 'bigcannon' },
  haggisLob: { warhead: 'artillery', damage: 80, range: 27, minRange: 6, rof: 3.4, proj: 'artillery', haggis: true, air: false, ground: true, splash: 3.2, sound: 'arty' },
  zeppBomb: { warhead: 'artillery', damage: 95, range: 4.5, rof: 2.2, proj: 'artillery', lob: true, air: false, ground: true, splash: 3.4, sound: 'arty' },
  boatGun:  { warhead: 'bullet', damage: 13, range: 13, rof: 0.15, proj: 'bullet', air: true, ground: true, sound: 'mg', twin: true },
  navalCannon: { warhead: 'shell', damage: 78, range: 16, rof: 1.7, proj: 'shell', air: false, ground: true, sound: 'bigcannon', twin: true },
  torpedo:  { warhead: 'shell', damage: 210, range: 12, rof: 2.8, proj: 'shell', air: false, ground: true, navalOnly: true, sound: 'cannon' },
  navalArty: { warhead: 'artillery', damage: 130, range: 30, minRange: 7, rof: 4.2, proj: 'artillery', air: false, ground: true, splash: 4, sound: 'arty' },
  mg:       { warhead: 'bullet', damage: 11, range: 12, rof: 0.16, proj: 'bullet', air: true, ground: true, sound: 'mg', burst: 1 },
  bazooka:  { warhead: 'rocket', damage: 60, range: 14, rof: 2.6, proj: 'rocket', air: true, ground: true, sound: 'rocket' },
  sniper:   { warhead: 'sniper', damage: 140, range: 18, rof: 1.6, proj: 'sniper', air: false, ground: true, sound: 'sniper' },
  cannon:   { warhead: 'shell', damage: 72, range: 13, rof: 1.8, proj: 'shell', air: false, ground: true, sound: 'cannon' },
  twin:     { warhead: 'shell', damage: 95, range: 14, rof: 2.3, proj: 'shell', air: false, ground: true, sound: 'bigcannon', twin: true },
  titanMsl: { warhead: 'rocket', damage: 50, range: 17, rof: 3.4, proj: 'missile', air: true, ground: true, sound: 'rocket', twin: true },
  arty:     { warhead: 'artillery', damage: 115, range: 32, minRange: 7, rof: 4.6, proj: 'artillery', air: false, ground: true, splash: 4.5, sound: 'arty' },
  heliRkt:  { warhead: 'rocket', damage: 42, range: 13, rof: 1.7, proj: 'rocket', air: false, ground: true, sound: 'rocket', twin: true },
  turretGun:{ warhead: 'shell', damage: 62, range: 16, rof: 1.5, proj: 'shell', air: false, ground: true, sound: 'cannon' },
  sam:      { warhead: 'rocket', damage: 85, range: 22, rof: 1.9, proj: 'missile', air: true, ground: false, sound: 'rocket', twin: true },
  plasma:   { warhead: 'beam', damage: 210, range: 21, rof: 3.4, proj: 'beam', air: false, ground: true, splash: 2.2, sound: 'beam', needsPower: true },
  gatling:  { warhead: 'bullet', damage: 9, range: 12.5, rof: 0.085, proj: 'bullet', air: true, ground: true, sound: 'mg', vsLight: true },
  flamer:   { warhead: 'flame', damage: 26, range: 7, rof: 0.25, proj: 'flame', air: false, ground: true, splash: 1.6, sound: 'flame' },
  inferno:  { warhead: 'flame', damage: 44, range: 8.5, rof: 0.3, proj: 'flame', air: false, ground: true, splash: 2.4, sound: 'flame', big: true },
  warCannon: { warhead: 'rocket', damage: 34, range: 12, rof: 0.75, proj: 'rocket', air: true, ground: true, splash: 1.6, sound: 'rocket' },
  hoverRkt: { warhead: 'rocket', damage: 30, range: 11.5, rof: 1.3, proj: 'rocket', air: true, ground: true, sound: 'rocket', twin: true },
  jetMsl:   { warhead: 'rocket', damage: 62, range: 14, rof: 2.2, proj: 'missile', air: true, ground: true, sound: 'rocket', twin: true },
  tesla:    { warhead: 'beam', damage: 115, range: 15, rof: 2.1, proj: 'tesla', air: false, ground: true, sound: 'zap', needsPower: true },
  flameTower: { warhead: 'flame', damage: 36, range: 10, rof: 0.3, proj: 'flame', air: false, ground: true, splash: 2.4, sound: 'flame', big: true },
  grenade:  { warhead: 'artillery', damage: 48, range: 12, minRange: 2.5, rof: 2.3, proj: 'artillery', lob: true, air: false, ground: true, splash: 2.4, sound: 'cannon' },
  boom:     { warhead: 'artillery', damage: 230, range: 1.9, rof: 1, proj: 'kamikaze', air: false, ground: true, splash: 3.6, sound: 'arty' },
  wyvern:   { warhead: 'flame', damage: 30, range: 8, rof: 0.35, proj: 'flame', air: false, ground: true, splash: 2.2, sound: 'flame', big: true },
  teslaGun: { warhead: 'beam', damage: 72, range: 11, rof: 2.4, proj: 'tesla', air: false, ground: true, sound: 'zap' },
  mechGun:  { warhead: 'shell', damage: 66, range: 15, rof: 1.7, proj: 'shell', air: false, ground: true, sound: 'bigcannon', twin: true },
  club:     { warhead: 'shell', damage: 105, range: 2.6, rof: 1.5, proj: 'melee', air: false, ground: true, splash: 2.2, sound: 'bigcannon' },
  boulder:  { warhead: 'artillery', damage: 150, range: 30, minRange: 8, rof: 5.2, proj: 'artillery', air: false, ground: true, splash: 3.6, sound: 'arty' },
  laserRifle: { warhead: 'beam', damage: 32, range: 12, rof: 1.2, proj: 'beam', air: true, ground: true, sound: 'beam' },
  drill:    { warhead: 'shell', damage: 90, range: 2.4, rof: 0.9, proj: 'melee', air: false, ground: true, sound: 'bigcannon' },
  dragonFire: { warhead: 'flame', damage: 55, range: 10, rof: 0.45, proj: 'flame', air: false, ground: true, splash: 3.2, sound: 'flame', big: true },
  cryo:     { warhead: 'beam', damage: 42, range: 13, rof: 1.4, proj: 'cryo', air: false, ground: true, sound: 'beam' },
  toxin:    { warhead: 'artillery', damage: 22, range: 12, minRange: 3, rof: 2.8, proj: 'artillery', lob: true, gas: true, air: false, ground: true, splash: 2.2, sound: 'cannon' },
  bite:     { warhead: 'bullet', damage: 24, range: 1.7, rof: 0.7, proj: 'melee', air: false, ground: true, sound: 'bite' },
  shadeRkt: { warhead: 'rocket', damage: 50, range: 13, rof: 2.2, proj: 'rocket', air: false, ground: true, sound: 'rocket', twin: true },
};

// Superweapons (one per faction)
export const SUPERWEAPONS = {
  skylance: { name: 'Sky Lance', charge: 240, radius: 9, damage: 1150, desc: 'Orbital energy lance' },
  doom: { name: 'Doom Missile', charge: 270, radius: 11.5, damage: 1300, desc: 'Ballistic warhead' },
};

// footprint in cells (w x h), power: + produces / - consumes
export const BUILDINGS = {
  conyard:  { name: 'Command HQ', cost: 3000, time: 30, hp: 2200, w: 4, h: 4, power: 15, sight: 20, req: [], tab: 'none', desc: 'Heart of your base. Builds all structures.' },
  power:    { name: 'Power Plant', cost: 300, time: 8, hp: 650, w: 3, h: 3, power: 100, sight: 9, req: [], tab: 'build', key: 'P', desc: 'Generates power. Low power slows production and shuts down Plasma Towers.' },
  refinery: { name: 'Crystal Refinery', cost: 1600, time: 18, hp: 1300, w: 4, h: 3, power: -30, sight: 10, req: ['power'], tab: 'build', key: 'R', desc: 'Processes crystal into credits. Comes with a free Harvester.' },
  barracks: { name: 'Barracks', cost: 400, time: 10, hp: 850, w: 3, h: 3, power: -20, sight: 10, req: ['power'], tab: 'build', key: 'B', desc: 'Trains infantry.' },
  factory:  { name: 'War Factory', cost: 2000, time: 22, hp: 1600, w: 4, h: 4, power: -30, sight: 10, req: ['refinery'], tab: 'build', key: 'F', desc: 'Builds vehicles.' },
  radar:    { name: 'Comms Center', cost: 1000, time: 14, hp: 1000, w: 3, h: 3, power: -40, sight: 22, req: ['refinery'], tab: 'build', key: 'C', desc: 'Enables the minimap radar and advanced units.' },
  tech:     { name: 'Tech Lab', cost: 1500, time: 20, hp: 1000, w: 3, h: 3, power: -60, sight: 10, req: ['factory', 'radar'], tab: 'build', key: 'T', desc: 'Unlocks Titan Tanks, Plasma Towers and the hero Wally.' },
  helipad:  { name: 'Helipad', cost: 1200, time: 16, hp: 800, w: 3, h: 3, power: -20, sight: 10, req: ['radar'], tab: 'build', key: 'H', desc: 'Builds Hornet gunships.' },
  uplink:   { name: 'Sky Lance Uplink', fac: 'wally', cost: 2500, time: 30, hp: 1500, w: 3, h: 3, power: -100, sight: 12, req: ['tech'], tab: 'build', key: 'U', limit: 1, superweapon: 'skylance', desc: 'Wally Squad superweapon. Charges an orbital energy lance that obliterates anything it touches.' },
  silo:     { name: 'Doom Missile Silo', fac: 'grim', cost: 2500, time: 30, hp: 1500, w: 3, h: 3, power: -100, sight: 12, req: ['tech'], tab: 'build', key: 'U', limit: 1, superweapon: 'doom', desc: 'Grimlock superweapon. Launches a devastating ballistic warhead.' },
  wall:     { name: 'Concrete Wall', cost: 60, time: 0, instant: true, hp: 900, w: 1, h: 1, power: 0, sight: 3, req: ['barracks'], tab: 'defense', isWall: true, desc: 'Cheap barrier. Drag to build a line of wall.' },
  gate:     { name: 'Gate', cost: 250, time: 0, instant: true, hp: 1300, w: 2, h: 1, power: -5, sight: 4, req: ['barracks'], tab: 'defense', isGate: true, desc: 'Opens for your units, blocks the enemy.' },
  mine:     { name: 'Land Mine', cost: 100, time: 0, instant: true, hp: 60, w: 1, h: 1, power: 0, sight: 1, req: ['factory'], tab: 'defense', isMine: true, noFootprint: true, placeRange: 22, desc: 'Hidden explosive. Detonates under enemy ground units.' },
  derrick:  { name: 'Crystal Derrick', cost: 1000, time: 0, hp: 900, w: 2, h: 2, power: 0, sight: 8, req: ['none'], tab: 'none', tech: true, desc: 'Neutral tech. Capture it with an Engineer for a steady flow of credits.' },
  hospital: { name: 'Field Hospital', cost: 1000, time: 0, hp: 900, w: 2, h: 2, power: 0, sight: 8, req: ['none'], tab: 'none', tech: true, desc: 'Neutral tech. Capture it with an Engineer to heal nearby infantry.' },
  depot:    { name: 'Repair Depot', cost: 1000, time: 0, hp: 900, w: 2, h: 2, power: 0, sight: 8, req: ['none'], tab: 'none', tech: true, desc: 'Neutral tech. Capture it with an Engineer to repair nearby vehicles.' },
  shipyard: { name: 'Shipyard', cost: 1000, time: 14, hp: 1200, w: 3, h: 3, power: -20, sight: 12, req: ['barracks'], tab: 'build', key: 'Y', naval: true, desc: 'Builds warships. Must be built on the shore, next to open water (only on maps with lakes or sea).' },
  coastgun: { name: 'Coastal Gun', cost: 900, time: 12, hp: 1100, w: 2, h: 2, power: -25, sight: 21, req: ['shipyard'], tab: 'defense', weapon: 'coastGun', naval: true, desc: 'A heavy long-range cannon in a concrete bunker. Must be built on the shore. Pounds ships and anything else that comes near the coast.' },
  turret:   { name: 'Gun Turret', cost: 600, time: 10, hp: 750, w: 1, h: 1, power: -20, sight: 16, req: ['barracks'], tab: 'defense', weapon: 'turretGun', desc: 'Anti-vehicle cannon emplacement.' },
  wonder:   { name: 'Victory Monument', cost: 5000, time: 60, hp: 3200, w: 3, h: 3, power: -40, sight: 12, req: ['tech'], tab: 'build', wonder: true, limit: 1, desc: 'A giant monument to your army. If it stands for 5 minutes after it is finished, you WIN. The enemy will throw everything at it.' },
  xbarrel:  { name: 'Fuel Barrels', cost: 0, time: 0, hp: 70, w: 1, h: 1, power: 0, sight: 0, req: [], explosive: true, desc: 'Explosive! Shoot them to blow up anything nearby.' },
  bunker:   { name: 'Battle Bunker', cost: 500, time: 9, hp: 1600, w: 2, h: 2, power: 0, sight: 15, req: ['barracks'], tab: 'defense', garrison: 4, desc: 'Garrison up to 4 infantry: they shoot out with +25% range and can\'t be hurt until the bunker falls. Right-click it with infantry selected.' },
  sam:      { name: 'SAM Site', cost: 750, time: 12, hp: 650, w: 2, h: 2, power: -20, sight: 22, req: ['radar'], tab: 'defense', weapon: 'sam', desc: 'Anti-aircraft missile launcher.' },
  tesla:    { name: 'Tesla Coil', fac: 'wally', cost: 1000, time: 14, hp: 800, w: 1, h: 1, power: -50, sight: 17, req: ['radar'], tab: 'defense', weapon: 'tesla', desc: 'Wally Squad only. Hurls a bolt of lightning that arcs on to two more nearby enemies. Needs power.' },
  flametower: { name: 'Flame Tower', fac: 'grim', cost: 800, time: 12, hp: 950, w: 1, h: 1, power: -25, sight: 13, req: ['barracks', 'refinery'], tab: 'defense', weapon: 'flameTower', desc: 'Grimlock only. Sprays a wide gout of fire that roasts infantry and buildings. Short range.' },
  house:    { name: 'Civilian House', cost: 0, time: 0, hp: 1100, w: 2, h: 2, power: 0, sight: 10, req: [], tab: 'none', garrison: 3, civil: true, desc: 'Neutral. Send up to 3 infantry inside: they shoot out of the windows, and the house is yours while they stay.' },
  plasma:   { name: 'Plasma Tower', cost: 1500, time: 18, hp: 950, w: 1, h: 1, power: -75, sight: 21, req: ['tech'], tab: 'defense', weapon: 'plasma', desc: 'Devastating energy beam. Needs power.' },
};

export const UNITS = {
  shaman:   { name: 'Grimlock Shaman', fac: 'grim', cost: 320, time: 6, hp: 110, armor: 'infantry', speed: 3.4, sight: 12, radius: 0.45, weapon: null, heals: true, tab: 'infantry', req: ['barracks'], desc: 'Grimlock only. Chants over wounded infantry to heal them.' },
  medic:    { name: 'Field Medic', fac: 'wally', cost: 300, time: 6, hp: 90, armor: 'infantry', speed: 3.5, sight: 12, radius: 0.45, weapon: null, heals: true, tab: 'infantry', req: ['barracks'], desc: 'Wally Squad only. Heals nearby infantry.' },
  rifle:    { name: 'Rifle Trooper', cost: 100, time: 4, hp: 100, armor: 'infantry', speed: 3.4, sight: 13, radius: 0.45, weapon: 'rifle', tab: 'infantry', req: ['barracks'], desc: 'Cheap all-round infantry.' },
  grenadier:{ name: 'Grenadier', fac: 'wally', cost: 250, time: 6, hp: 100, armor: 'infantry', speed: 3.3, sight: 13, radius: 0.45, weapon: 'grenade', tab: 'infantry', req: ['barracks', 'refinery'], desc: 'Wally Squad only. Lobs grenades over walls and into crowds. Great against infantry, bunkers and houses; can\'t hit anything right next to him.' },
  boomer:   { name: 'Goblin Boomer', fac: 'grim', cost: 200, time: 5, hp: 70, armor: 'infantry', speed: 5.2, sight: 12, radius: 0.45, weapon: 'boom', tab: 'infantry', req: ['barracks', 'refinery'], desc: 'Grimlock only. A cackling goblin with a huge bomb strapped to his back. Sprints at the enemy and blows up, wrecking everything nearby. One use only!' },
  troll:    { name: 'Cave Troll', fac: 'grim', cost: 1400, time: 18, hp: 1150, armor: 'light', speed: 3.6, sight: 13, radius: 1.1, weapon: 'club', walker: true, regen: 8, tab: 'infantry', req: ['barracks', 'tech'], desc: 'Grimlock only. A huge troll with a tree-trunk club that smashes everything around its target. Slowly heals its own wounds.' },
  spy:      { name: 'Spy', cost: 400, time: 8, hp: 80, armor: 'infantry', speed: 3.9, sight: 14, radius: 0.45, weapon: null, spy: true, tab: 'infantry', req: ['barracks', 'radar'], desc: 'Disguised agent: enemy troops and defences ignore him unless he walks right up to them (Attack Dogs sniff him out). Send him into an enemy building - Refinery or Construction Yard: steal their cash; Power Plant: black out their power for 40 s; Comms Center, Tech Lab or superweapon: reset their support powers and superweapon.' },
  piper:    { name: 'Bagpiper', fac: 'wally', cost: 350, time: 7, hp: 120, armor: 'infantry', speed: 3.4, sight: 13, radius: 0.45, weapon: null, inspire: 9, tab: 'infantry', req: ['barracks', 'refinery'], desc: 'Wally Squad only. Plays the bagpipes into battle: every friendly unit within earshot fires 25% faster. Unarmed - keep him behind the front line.' },
  drummer:  { name: 'War Drummer', fac: 'grim', cost: 350, time: 7, hp: 140, armor: 'infantry', speed: 3.4, sight: 13, radius: 0.45, weapon: null, inspire: 9, tab: 'infantry', req: ['barracks', 'refinery'], desc: 'Grimlock only. Pounds a huge war drum: every friendly unit within earshot fires 25% faster. Unarmed - keep him behind the front line.' },
  blink:    { name: 'Blink Trooper', fac: 'wally', cost: 450, time: 8, hp: 95, armor: 'infantry', speed: 3.5, sight: 14, radius: 0.45, weapon: 'laserRifle', blink: 45, tab: 'infantry', req: ['barracks', 'radar'], desc: 'Wally Squad only. Teleports instantly to wherever you send him (up to 45 m, then 10 s to recharge) and fires a laser rifle. Perfect for surprise raids.' },
  toxic:    { name: 'Toxic Trooper', fac: 'grim', cost: 300, time: 7, hp: 110, armor: 'infantry', speed: 3.3, sight: 13, radius: 0.45, weapon: 'toxin', tab: 'infantry', req: ['barracks', 'refinery'], desc: 'Grimlock only. Lobs gas canisters that leave a poisonous green cloud for 6 seconds, hurting any enemy who stays inside.' },
  dog:      { name: 'Attack Dog', cost: 150, time: 4, hp: 75, armor: 'infantry', speed: 6.6, sight: 16, radius: 0.45, weapon: 'bite', tab: 'infantry', req: ['barracks'], desc: 'Cheap, fast and fierce. Great scout with a big sight range; savages enemy infantry, but useless against tanks.' },
  rocket:   { name: 'Rocket Trooper', cost: 300, time: 7, hp: 90, armor: 'infantry', speed: 3.0, sight: 14, radius: 0.45, weapon: 'bazooka', tab: 'infantry', req: ['barracks'], desc: 'Anti-tank and anti-air.' },
  flamer:   { name: 'Scorcher', cost: 250, time: 6, hp: 120, armor: 'infantry', speed: 3.2, sight: 11, radius: 0.45, weapon: 'flamer', tab: 'infantry', req: ['barracks', 'refinery'], desc: 'Flamethrower. Burns infantry and buildings.' },
  warlord:  { name: 'Warlord Grak', fac: 'grim', cost: 900, time: 13, hp: 520, armor: 'infantry', speed: 3.3, sight: 15, radius: 0.6, weapon: 'warCannon', tab: 'infantry', req: ['barracks', 'radar'], limit: 1, desc: 'Grimlock only. Hulking hero with a rocket cannon. War Cry (G): nearby Grimlock troops fire much faster for 6 seconds.' },
  wallyman: { name: 'Wally Man', fac: 'wally', cost: 800, time: 12, hp: 300, armor: 'infantry', speed: 3.6, sight: 15, radius: 0.5, weapon: 'gatling', tab: 'infantry', req: ['barracks', 'radar'], desc: 'Wally Squad only. Caped super-soldier with a spinning Gatling gun that shreds infantry.' },
  engineer: { name: 'Engineer', cost: 500, time: 8, hp: 70, armor: 'infantry', speed: 3.4, sight: 10, radius: 0.45, weapon: null, tab: 'infantry', req: ['barracks'], desc: 'Captures enemy buildings or fully repairs your own.' },
  wally:    { name: 'Wally (Hero)', fac: 'wally', cost: 1500, time: 25, hp: 320, armor: 'infantry', speed: 4.2, sight: 19, radius: 0.5, weapon: 'sniper', tab: 'infantry', req: ['barracks', 'tech'], limit: 1, desc: 'Elite sniper. One-shots infantry and plants C4 on buildings.' },
  haggislauncher: { name: 'Haggis Launcher', fac: 'wally', cost: 950, time: 14, hp: 300, armor: 'light', speed: 4.6, sight: 13, radius: 1.3, weapon: 'haggisLob', turnRate: 2.0, tab: 'vehicle', req: ['factory', 'radar'], desc: 'Wally Squad only. A truck with a giant mortar that lobs piping-hot haggis across the battlefield. Splats everything nearby - and now and then a haggis survives the landing and runs off. Cannot hit close targets.' },
  zeppelin: { name: 'Goblin Zeppelin', fac: 'grim', cost: 1500, time: 20, hp: 950, armor: 'air', speed: 3.6, sight: 16, radius: 2.4, weapon: 'zeppBomb', air: true, altitude: 12, tab: 'air', req: ['helipad', 'radar'], desc: 'Grimlock only. A slow, tough airship crewed by goblins who drop bombs on whatever is below. Hit it with rockets, SAMs and jets before it reaches your base.' },
  gunboat:  { name: 'Gunboat', cost: 500, time: 8, hp: 380, armor: 'light', speed: 8.5, sight: 15, radius: 1.3, weapon: 'boatGun', turnRate: 2.6, naval: true, tab: 'naval', req: ['shipyard'], desc: 'Fast patrol boat with twin machine guns. Good against infantry, light boats and aircraft.' },
  destroyer: { name: 'Destroyer', cost: 1100, time: 14, hp: 980, armor: 'heavy', speed: 6, sight: 17, radius: 1.8, weapon: 'navalCannon', turnRate: 1.8, naval: true, detector: 14, tab: 'naval', req: ['shipyard', 'radar'], desc: 'Armoured warship with twin cannons. Its sonar finds submarines and cloaked units nearby.' },
  submarine: { name: 'Submarine', cost: 1000, time: 13, hp: 560, armor: 'heavy', speed: 6.4, sight: 14, radius: 1.5, weapon: 'torpedo', turnRate: 2.0, naval: true, stealth: true, tab: 'naval', req: ['shipyard', 'radar'], desc: 'Dives out of sight and sinks ships with huge torpedoes. Torpedoes only hit ships. Destroyers can find it with sonar.' },
  landingcraft: { name: 'Landing Craft', cost: 650, time: 9, hp: 650, armor: 'heavy', speed: 7, sight: 13, radius: 1.6, weapon: 'mg', turnRate: 2.2, naval: true, transport: 6, tab: 'naval', req: ['shipyard'], desc: 'Carries up to 6 infantry across the water. Select infantry and right-click (or tap) it to load; sail up to a beach and press Unload.' },
  nessie:   { name: 'Nessie', cost: 0, time: 0, hp: 2600, armor: 'heavy', speed: 5, sight: 16, radius: 2.4, weapon: 'nessieBite', naval: true, bounty: 3000, tab: 'none', req: ['none'], desc: 'The Loch Ness Monster herself! She bites ships and anyone standing on the shore. Worth a $3,000 bounty - if you can catch her before she dives.' },
  battleship: { name: 'Dreadnought', cost: 2200, time: 24, hp: 1900, armor: 'heavy', speed: 4.4, sight: 18, radius: 2.4, weapon: 'navalArty', turnRate: 1.2, naval: true, tab: 'naval', req: ['shipyard', 'tech'], desc: 'Huge battleship with long-range guns that shell anything near the shore. Can\'t hit targets right next to it.' },
  buggy:    { name: 'Scout Buggy', cost: 400, time: 8, hp: 260, armor: 'light', speed: 10, sight: 16, radius: 1.0, weapon: 'mg', tab: 'vehicle', req: ['factory'], desc: 'Fast raider with a heavy machine gun.' },
  tank:     { name: 'Battle Tank', cost: 800, time: 12, hp: 560, armor: 'heavy', speed: 5.6, sight: 14, radius: 1.35, weapon: 'cannon', turnRate: 2.6, tab: 'vehicle', req: ['factory'], desc: 'Main battle tank.' },
  apc:      { name: 'Squad Carrier APC', cost: 700, time: 11, hp: 650, armor: 'heavy', speed: 7.2, sight: 13, radius: 1.35, weapon: 'mg', turnRate: 2.8, tab: 'vehicle', req: ['factory', 'barracks'], transport: 5, desc: 'Armoured carrier. Right-click it with infantry selected to load up to 5; Unload (U) drops them off.' },
  teslatruck: { name: 'Tesla Truck', fac: 'wally', cost: 1000, time: 13, hp: 360, armor: 'light', speed: 6.8, sight: 15, radius: 1.1, weapon: 'teslaGun', turnRate: 3, tab: 'vehicle', req: ['factory', 'radar'], desc: 'Wally Squad only. A truck carrying a crackling Tesla coil. Its lightning arcs between up to three packed enemies.' },
  convoy:   { name: 'Bounty Convoy', cost: 0, time: 0, hp: 1100, armor: 'heavy', speed: 3.6, sight: 8, radius: 1.2, weapon: null, bounty: 1500, tab: 'none', req: ['none'], desc: 'An armoured cash truck crossing the battlefield. Destroy it before it escapes to claim the bounty!' },
  mech:     { name: 'Wally Mech', fac: 'wally', cost: 1800, time: 20, hp: 950, armor: 'heavy', speed: 4.2, sight: 16, radius: 1.4, weapon: 'mechGun', walker: true, turnRate: 2.4, tab: 'vehicle', req: ['factory', 'tech'], desc: 'Wally Squad only. A towering two-legged battle walker with twin shoulder cannons. Strides over rough ground and hits hard at long range.' },
  catapult: { name: 'Bone Catapult', fac: 'grim', cost: 1000, time: 14, hp: 380, armor: 'light', speed: 3.6, sight: 13, radius: 1.3, weapon: 'boulder', turnRate: 2, tab: 'vehicle', req: ['factory', 'radar'], desc: 'Grimlock only. A creaking wooden siege engine that hurls flaming boulders a very long way. Wrecks buildings and clumps of troops, but can\'t hit anything close.' },
  shieldgen: { name: 'Shield Projector', fac: 'wally', cost: 1100, time: 14, hp: 420, armor: 'light', speed: 5.4, sight: 14, radius: 1.1, weapon: null, shield: 7.5, tab: 'vehicle', req: ['factory', 'radar'], desc: 'Wally Squad only. Unarmed truck that projects a shimmering energy bubble: your units inside it take 40% less damage. Keep it with your army.' },
  burrower: { name: 'Tunnel Drill', fac: 'grim', cost: 1100, time: 14, hp: 460, armor: 'heavy', speed: 6.2, sight: 12, radius: 1.2, weapon: 'drill', burrow: true, turnRate: 2.4, tab: 'vehicle', req: ['factory', 'radar'], desc: 'Grimlock only. Burrows underground while it moves - nothing can see or hit it - then bursts up to drill into vehicles and buildings.' },
  dragon:   { name: 'Ancient Dragon', cost: 0, time: 0, hp: 4200, armor: 'air', speed: 6, sight: 20, radius: 3, weapon: 'dragonFire', air: true, altitude: 11, bounty: 5000, tab: 'none', req: ['none'], desc: 'A huge, ancient dragon that attacks everyone. Bring it down with rockets, SAMs and aircraft for a $5,000 bounty.' },
  haggis:   { name: 'Wild Haggis', cost: 0, time: 0, hp: 40, armor: 'infantry', speed: 6.5, sight: 8, radius: 0.5, weapon: null, bounty: 500, tab: 'none', req: ['none'], desc: 'A rare wild haggis! Its legs are longer on one side so it can run round hills. Catch it for a $500 bounty.' },
  freezetank: { name: 'Freeze Tank', fac: 'wally', cost: 1000, time: 13, hp: 520, armor: 'heavy', speed: 5.4, sight: 14, radius: 1.35, weapon: 'cryo', turnRate: 2.6, tab: 'vehicle', req: ['factory', 'radar'], desc: 'Wally Squad only. Fires a freezing cryo beam: anything it hits is frosted over and slowed to half speed for 3 seconds.' },
  icecream: { name: 'Ice Cream Van', cost: 0, time: 0, hp: 500, armor: 'light', speed: 4.2, sight: 8, radius: 1.2, weapon: null, healAura: 7, tab: 'none', req: ['none'], desc: 'A cheerful ice cream van that trundles about playing its jingle, patching up EVERYONE nearby. Only a monster would blow it up.' },
  repair:   { name: 'Repair Truck', cost: 600, time: 9, hp: 420, armor: 'light', speed: 6.8, sight: 12, radius: 1.15, weapon: null, repairs: true, turnRate: 2.8, tab: 'vehicle', req: ['factory'], desc: 'Fixes nearby vehicles in the field. Park it behind your tanks.' },
  hover:    { name: 'Skimmer Hovercraft', cost: 650, time: 9, hp: 320, armor: 'light', speed: 9, sight: 14, radius: 1.2, weapon: 'hoverRkt', turnRate: 3.2, hover: true, tab: 'vehicle', req: ['factory', 'radar'], desc: 'Fast amphibious raider. Skims over water and even lava to flank the enemy. Twin rockets hit ground and air.' },
  harvester:{ name: 'Harvester', cost: 1200, time: 16, hp: 950, armor: 'heavy', speed: 4.6, sight: 9, radius: 1.5, weapon: null, turnRate: 2.0, tab: 'vehicle', req: ['factory', 'refinery'], desc: 'Gathers crystal for the refinery.' },
  arty:     { name: 'Thunder Artillery', cost: 900, time: 14, hp: 230, armor: 'light', speed: 4.3, sight: 12, radius: 1.3, weapon: 'arty', turnRate: 2.0, tab: 'vehicle', req: ['factory', 'radar'], desc: 'Long-range siege gun. Cannot hit close targets.' },
  titan:    { name: 'Titan Tank', fac: 'wally', cost: 1700, time: 24, hp: 1350, armor: 'heavy', speed: 3.5, sight: 15, radius: 1.8, weapon: 'twin', weapon2: 'titanMsl', turnRate: 1.5, tab: 'vehicle', req: ['factory', 'tech'], selfRepair: true, desc: 'Twin cannons + missiles. Self-repairs to half health.' },
  stealth:  { name: 'Shade Stealth Tank', fac: 'grim', cost: 1100, time: 16, hp: 430, armor: 'light', speed: 6.6, sight: 14, radius: 1.3, weapon: 'shadeRkt', turnRate: 2.8, tab: 'vehicle', req: ['factory', 'tech'], stealth: true, desc: 'Grimlock only. Invisible until it fires or enemies come close.' },
  inferno:  { name: 'Inferno Tank', fac: 'grim', cost: 1000, time: 15, hp: 820, armor: 'heavy', speed: 4.6, sight: 12, radius: 1.4, weapon: 'inferno', turnRate: 2.2, tab: 'vehicle', req: ['factory', 'radar'], desc: 'Grimlock only. Heavy flamethrower tank that roasts infantry and buildings.' },
  hauler:   { name: 'Sky Hauler', cost: 900, time: 12, hp: 450, armor: 'air', speed: 11, sight: 14, radius: 1.7, weapon: null, air: true, transport: 6, tab: 'air', req: ['helipad'], desc: 'Twin-rotor transport helicopter. Carries 6 infantry over cliffs, water and lava. Right-click it with infantry selected to load; Unload (U) over solid ground.' },
  drone:    { name: 'Recon Drone', cost: 350, time: 6, hp: 110, armor: 'air', speed: 14, sight: 22, radius: 0.8, weapon: null, air: true, detector: 14, tab: 'air', req: ['helipad'], desc: 'Fast unarmed scout with a huge sight range. Reveals cloaked Shade tanks within 14 m.' },
  wyvern:   { name: 'Wyvern Rider', fac: 'grim', cost: 1300, time: 16, hp: 430, armor: 'air', speed: 8.5, sight: 17, radius: 1.6, weapon: 'wyvern', air: true, altitude: 6, tab: 'air', req: ['helipad'], desc: 'Grimlock only. A goblin riding a fire-breathing wyvern. Swoops low to roast infantry and buildings. Shoot it down with rockets and SAMs.' },
  medevac:  { name: 'Medevac Copter', cost: 900, time: 12, hp: 300, armor: 'air', speed: 9, sight: 15, radius: 1.5, weapon: null, air: true, healAura: 7, tab: 'air', req: ['helipad'], desc: 'Unarmed rescue helicopter. Hovers over your army and slowly heals every unit beneath it - infantry and vehicles alike.' },
  jet:      { name: 'Strike Jet', cost: 1100, time: 13, hp: 280, armor: 'air', speed: 19, sight: 17, radius: 1.5, weapon: 'jetMsl', air: true, tab: 'air', req: ['helipad', 'radar'], desc: 'Blisteringly fast jet with twin missiles that hit air and ground. Fragile - strike and get out.' },
  gunship:  { name: 'Hornet Gunship', cost: 1200, time: 16, hp: 360, armor: 'air', speed: 10, sight: 18, radius: 1.6, weapon: 'heliRkt', tab: 'air', req: ['helipad'], air: true, desc: 'Fast attack helicopter. Hit it with rockets and SAMs.' },
};

export const TABS = [
  { id: 'build', label: 'BASE' },
  { id: 'defense', label: 'DEFENCE' },
  { id: 'infantry', label: 'INFANTRY' },
  { id: 'vehicle', label: 'VEHICLES' },
  { id: 'air', label: 'AIR' },
  { id: 'naval', label: 'NAVY' },
  { id: 'research', label: 'TECH' },
];

// One-off research upgrades (TECH tab)
export const UPGRADES = {
  armor:     { name: 'Composite Armour', icon: '🛡', cost: 1500, time: 40, req: ['factory'], tab: 'research', research: true, desc: '+25% health for all your vehicles and aircraft.' },
  bodyarmor: { name: 'Body Armour', icon: '🦺', cost: 800, time: 30, req: ['barracks'], tab: 'research', research: true, desc: '+25% health for all your infantry.' },
  shells:    { name: 'Depleted Shells', icon: '💥', cost: 2000, time: 45, req: ['tech'], tab: 'research', research: true, desc: '+20% damage for all your units and defences.' },
  refining:  { name: 'Crystal Refining', icon: '💎', cost: 1200, time: 35, req: ['refinery', 'radar'], tab: 'research', research: true, desc: '+25% credits from every harvester load.' },
  engines:   { name: 'Turbo Engines', icon: '⚙', cost: 1000, time: 30, req: ['factory', 'radar'], tab: 'research', research: true, desc: '+15% speed for all your vehicles.' },
  optics:    { name: 'Long-Range Optics', icon: '🔭', cost: 800, time: 25, req: ['radar'], tab: 'research', research: true, desc: '+20% sight and weapon range for your units.' },
};

// Which building types act as producers for which queue
export const PRODUCERS = { build: ['conyard'], defense: ['conyard'], infantry: ['barracks'], vehicle: ['factory'], air: ['helipad'], naval: ['shipyard'], research: ['conyard', 'barracks', 'factory', 'refinery', 'radar', 'tech'] };
// Structures + defences share a single queue, like the classics
export const QUEUE_OF = { build: 'build', defense: 'build', infantry: 'infantry', vehicle: 'vehicle', air: 'air', naval: 'naval', research: 'research' };

export const DIFFICULTY = {
  easy:   { label: 'Recruit', aiIncome: 0.75, aiBuild: 0.7, firstWave: 260, waveBase: 4, waveGrow: 1, waveGap: 150 },
  normal: { label: 'Veteran', aiIncome: 1.0, aiBuild: 1.0, firstWave: 200, waveBase: 6, waveGrow: 2, waveGap: 115 },
  hard:   { label: 'Commander', aiIncome: 1.35, aiBuild: 1.3, firstWave: 150, waveBase: 8, waveGrow: 3, waveGap: 90 },
};

export const START_CREDITS = 4000;

// Skirmish mutators: optional rule changes (also used by the Daily Challenge)
export const MUTATORS = {
  turbo:    { name: 'Turbo Build', icon: '⏩', desc: 'Everything builds twice as fast.' },
  rich:     { name: 'Crystal Rush', icon: '💎', desc: 'Harvested crystal is worth double.' },
  glass:    { name: 'Glass Cannons', icon: '💥', desc: 'Everything takes 75% more damage.' },
  infantry: { name: 'Boots Only', icon: '🥾', desc: 'No vehicles or aircraft (except Harvesters and APCs).' },
  veterans: { name: 'Veteran Armies', icon: '★', desc: 'Every unit starts as a Veteran.' },
  disasters: { name: 'Natural Disasters', icon: '🌪', desc: 'Tornadoes roam the battlefield, wrecking anything in their path.' },
  crates:   { name: 'Crate Rain', icon: '📦', desc: 'Supply crates drop four times as often.' },
  party:    { name: 'Party Hats', icon: '🎉', desc: 'Every soldier, tank and aircraft wears a party hat. Completely pointless. Completely brilliant.' },
};
export const hasMut = (cfg, k) => !!(cfg && cfg.mut && cfg.mut.includes(k));
export const HARVEST_CAPACITY = 700;
export const ORE_MAX = 500;
