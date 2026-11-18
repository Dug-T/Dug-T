// Wally Squad — game data: factions, buildings, units, weapons.
export const CELL = 2;            // world units per grid cell
export const GRID = 128;          // cells per side
export const WORLD = CELL * GRID; // 256 world units
export const HALF = WORLD / 2;
export const WATER_LEVEL = -1.2;

export const FACTIONS = {
  wally: { id: 'wally', name: 'Wally Squad', color: 0x2f7fe0, dark: 0x163a66, accent: 0xffc23a, light: 0x8fd0ff, css: '#3d8bff' },
  grim:  { id: 'grim',  name: 'Grimlock Legion', color: 0xc8312b, dark: 0x3a1210, accent: 0x2a2a2a, light: 0xff6a3a, css: '#ff4a3d' },
};

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
  turret:   { name: 'Gun Turret', cost: 600, time: 10, hp: 750, w: 1, h: 1, power: -20, sight: 16, req: ['barracks'], tab: 'defense', weapon: 'turretGun', desc: 'Anti-vehicle cannon emplacement.' },
  sam:      { name: 'SAM Site', cost: 750, time: 12, hp: 650, w: 2, h: 2, power: -20, sight: 22, req: ['radar'], tab: 'defense', weapon: 'sam', desc: 'Anti-aircraft missile launcher.' },
  plasma:   { name: 'Plasma Tower', cost: 1500, time: 18, hp: 950, w: 1, h: 1, power: -75, sight: 21, req: ['tech'], tab: 'defense', weapon: 'plasma', desc: 'Devastating energy beam. Needs power.' },
};

export const UNITS = {
  medic:    { name: 'Field Medic', fac: 'wally', cost: 300, time: 6, hp: 90, armor: 'infantry', speed: 3.5, sight: 12, radius: 0.45, weapon: null, heals: true, tab: 'infantry', req: ['barracks'], desc: 'Wally Squad only. Heals nearby infantry.' },
  rifle:    { name: 'Rifle Trooper', cost: 100, time: 4, hp: 100, armor: 'infantry', speed: 3.4, sight: 13, radius: 0.45, weapon: 'rifle', tab: 'infantry', req: ['barracks'], desc: 'Cheap all-round infantry.' },
  rocket:   { name: 'Rocket Trooper', cost: 300, time: 7, hp: 90, armor: 'infantry', speed: 3.0, sight: 14, radius: 0.45, weapon: 'bazooka', tab: 'infantry', req: ['barracks'], desc: 'Anti-tank and anti-air.' },
  flamer:   { name: 'Scorcher', cost: 250, time: 6, hp: 120, armor: 'infantry', speed: 3.2, sight: 11, radius: 0.45, weapon: 'flamer', tab: 'infantry', req: ['barracks', 'refinery'], desc: 'Flamethrower. Burns infantry and buildings.' },
  wallyman: { name: 'Wally Man', fac: 'wally', cost: 800, time: 12, hp: 300, armor: 'infantry', speed: 3.6, sight: 15, radius: 0.5, weapon: 'gatling', tab: 'infantry', req: ['barracks', 'radar'], desc: 'Wally Squad only. Caped super-soldier with a spinning Gatling gun that shreds infantry.' },
  engineer: { name: 'Engineer', cost: 500, time: 8, hp: 70, armor: 'infantry', speed: 3.4, sight: 10, radius: 0.45, weapon: null, tab: 'infantry', req: ['barracks'], desc: 'Captures enemy buildings or fully repairs your own.' },
  wally:    { name: 'Wally (Hero)', fac: 'wally', cost: 1500, time: 25, hp: 320, armor: 'infantry', speed: 4.2, sight: 19, radius: 0.5, weapon: 'sniper', tab: 'infantry', req: ['barracks', 'tech'], limit: 1, desc: 'Elite sniper. One-shots infantry and plants C4 on buildings.' },
  buggy:    { name: 'Scout Buggy', cost: 400, time: 8, hp: 260, armor: 'light', speed: 10, sight: 16, radius: 1.0, weapon: 'mg', tab: 'vehicle', req: ['factory'], desc: 'Fast raider with a heavy machine gun.' },
  tank:     { name: 'Battle Tank', cost: 800, time: 12, hp: 560, armor: 'heavy', speed: 5.6, sight: 14, radius: 1.35, weapon: 'cannon', turnRate: 2.6, tab: 'vehicle', req: ['factory'], desc: 'Main battle tank.' },
  harvester:{ name: 'Harvester', cost: 1200, time: 16, hp: 950, armor: 'heavy', speed: 4.6, sight: 9, radius: 1.5, weapon: null, turnRate: 2.0, tab: 'vehicle', req: ['factory', 'refinery'], desc: 'Gathers crystal for the refinery.' },
  arty:     { name: 'Thunder Artillery', cost: 900, time: 14, hp: 230, armor: 'light', speed: 4.3, sight: 12, radius: 1.3, weapon: 'arty', turnRate: 2.0, tab: 'vehicle', req: ['factory', 'radar'], desc: 'Long-range siege gun. Cannot hit close targets.' },
  titan:    { name: 'Titan Tank', fac: 'wally', cost: 1700, time: 24, hp: 1350, armor: 'heavy', speed: 3.5, sight: 15, radius: 1.8, weapon: 'twin', weapon2: 'titanMsl', turnRate: 1.5, tab: 'vehicle', req: ['factory', 'tech'], selfRepair: true, desc: 'Twin cannons + missiles. Self-repairs to half health.' },
  stealth:  { name: 'Shade Stealth Tank', fac: 'grim', cost: 1100, time: 16, hp: 430, armor: 'light', speed: 6.6, sight: 14, radius: 1.3, weapon: 'shadeRkt', turnRate: 2.8, tab: 'vehicle', req: ['factory', 'tech'], stealth: true, desc: 'Grimlock only. Invisible until it fires or enemies come close.' },
  inferno:  { name: 'Inferno Tank', fac: 'grim', cost: 1000, time: 15, hp: 820, armor: 'heavy', speed: 4.6, sight: 12, radius: 1.4, weapon: 'inferno', turnRate: 2.2, tab: 'vehicle', req: ['factory', 'radar'], desc: 'Grimlock only. Heavy flamethrower tank that roasts infantry and buildings.' },
  gunship:  { name: 'Hornet Gunship', cost: 1200, time: 16, hp: 360, armor: 'air', speed: 10, sight: 18, radius: 1.6, weapon: 'heliRkt', tab: 'air', req: ['helipad'], air: true, desc: 'Fast attack helicopter. Hit it with rockets and SAMs.' },
};

export const TABS = [
  { id: 'build', label: 'BASE' },
  { id: 'defense', label: 'DEFENCE' },
  { id: 'infantry', label: 'INFANTRY' },
  { id: 'vehicle', label: 'VEHICLES' },
  { id: 'air', label: 'AIR' },
];

// Which building types act as producers for which queue
export const PRODUCERS = { build: ['conyard'], defense: ['conyard'], infantry: ['barracks'], vehicle: ['factory'], air: ['helipad'] };
// Structures + defences share a single queue, like the classics
export const QUEUE_OF = { build: 'build', defense: 'build', infantry: 'infantry', vehicle: 'vehicle', air: 'air' };

export const DIFFICULTY = {
  easy:   { label: 'Recruit', aiIncome: 0.75, aiBuild: 0.7, firstWave: 260, waveBase: 4, waveGrow: 1, waveGap: 150 },
  normal: { label: 'Veteran', aiIncome: 1.0, aiBuild: 1.0, firstWave: 200, waveBase: 6, waveGrow: 2, waveGap: 115 },
  hard:   { label: 'Commander', aiIncome: 1.35, aiBuild: 1.3, firstWave: 150, waveBase: 8, waveGrow: 3, waveGap: 90 },
};

export const START_CREDITS = 4000;
export const HARVEST_CAPACITY = 700;
export const ORE_MAX = 500;
