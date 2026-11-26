// Survival rules: the stats, the items, the recipes, the eruption stages and the three ways off the island.

export const DIFFICULTY = {
  relaxed: { name: 'Relaxed', minutes: 40, desc: '40 minutes to the final surge. Time to explore.' },
  standard: { name: 'Standard', minutes: 24, desc: '24 minutes. The intended experience.' },
  hardcore: { name: 'Hardcore', minutes: 14, desc: '14 minutes, and everything hurts more.' },
};

export const ITEMS = {
  wood: { name: 'Driftwood', icon: '🪵', desc: 'Dry logs. Rafts are made of these.' },
  vine: { name: 'Vine', icon: '🌿', desc: 'Tough jungle vine. Three make a rope.' },
  stone: { name: 'Stone', icon: '🪨', desc: 'A sharp piece of volcanic rock.' },
  coconut: { name: 'Coconut', icon: '🥥', desc: 'Food and drink in one. Eat it.', use: { hunger: 22, thirst: 24 } },
  banana: { name: 'Banana', icon: '🍌', desc: 'Quick energy.', use: { hunger: 16, stamina: 30 } },
  mango: { name: 'Mango', icon: '🥭', desc: 'Sweet and juicy.', use: { hunger: 20, thirst: 10 } },
  water: { name: 'Canteen water', icon: '💧', desc: 'A drink of fresh water.', use: { thirst: 40 } },
  cloth: { name: 'Cloth', icon: '🧵', desc: 'Torn seat covers from the wreck.' },
  rope: { name: 'Rope', icon: '🪢', desc: 'Braided vine rope. Holds a raft together.' },
  axe: { name: 'Stone axe', icon: '🪓', desc: 'Chop palms for logs. Hold USE beside a palm.', tool: true },
  torch: { name: 'Torch', icon: '🔦', desc: 'A cloth-wrapped stick. Lights itself after dark and in thick ash.', tool: true },
  mask: { name: 'Ash mask', icon: '😷', desc: 'Wet cloth over your mouth. Keeps the ash out of your lungs.', tool: true },
  logger: { name: 'Data logger', icon: '💾', desc: 'Dr Osei\'s seismometer readings. Thirty days of the mountain waking up.' },
  pendant: { name: 'Carved pendant', icon: '📿', desc: 'Kai\'s grandmother\'s bone pendant, on a frayed cord.' },
  logbook: { name: 'Station logbook', icon: '📒', desc: 'Thirty years of island records, in Lena\'s neat hand.' },
  frond: { name: 'Palm frond', icon: '🍃', desc: 'A long palm leaf. Good for thatching a shelter.' },
  spear: { name: 'Fishing spear', icon: '🔱', desc: 'Stand in the shallows near a school of fish and press USE.', tool: true },
  fish_raw: { name: 'Raw fish', icon: '🐟', desc: 'Better cooked. Much better cooked.', use: { hunger: 10, health: -8 } },
  fish_cooked: { name: 'Grilled fish', icon: '🍢', desc: 'Hot, smoky and filling.', use: { hunger: 45, stamina: 25 } },
  crab: { name: 'Crab', icon: '🦀', desc: 'Still nippy. Cook it on a fire.', use: { hunger: 8, health: -6 } },
  crab_cooked: { name: 'Roast crab', icon: '🍲', desc: 'Sweet white meat.', use: { hunger: 35, stamina: 15 } },
  bandage: { name: 'Bandage', icon: '🩹', desc: 'Patches you up.', use: { health: 35 } },
  tarp: { name: 'Tarpaulin', icon: '⛵', desc: 'A survival tarp from the wreck. A sail, if you had a raft.' },
  battery: { name: 'Battery', icon: '🔋', desc: 'The plane\'s battery. Still holds a charge.' },
  antenna: { name: 'Antenna', icon: '📶', desc: 'The mast from the ranger tower.' },
  handset: { name: 'Radio handset', icon: '📻', desc: 'From the village radio hut.' },
};
export const FOOD = ['coconut', 'banana', 'mango', 'fish_cooked', 'crab_cooked'];
export const COOKS = { fish_raw: 'fish_cooked', crab: 'crab_cooked' };

export const RECIPES = [
  { id: 'rope', name: 'Rope', needs: { vine: 3 }, gives: { rope: 1 } },
  { id: 'axe', name: 'Stone axe', needs: { wood: 2, stone: 1, vine: 1 }, gives: { axe: 1 }, once: true },
  { id: 'mask', name: 'Ash mask', needs: { cloth: 2, vine: 1 }, gives: { mask: 1 }, once: true },
  { id: 'bandage', name: 'Bandage', needs: { cloth: 1 }, gives: { bandage: 1 } },
  { id: 'torch', name: 'Torch', needs: { wood: 1, cloth: 1 }, gives: { torch: 1 }, once: true },
  { id: 'spear', name: 'Fishing spear', needs: { wood: 1, stone: 1, vine: 1 }, gives: { spear: 1 }, once: true },
  { id: 'shelter', name: 'Lean-to shelter', needs: { wood: 3, vine: 2, frond: 3 }, build: 'shelter', icon: '⛺', desc: 'Built where you stand. Keeps the ash off, and you can sleep under it.' },
  { id: 'campfire', name: 'Campfire', needs: { wood: 2, stone: 2 }, build: 'campfire', icon: '🔥', desc: 'Built where you stand. Rest beside it to recover, and it lights up the night.' },
];

// what each escape needs
export const ESCAPES = {
  raft: { name: 'Build a raft', needs: { wood: 10, rope: 3, tarp: 1 }, where: 'boatyard' },
  radio: { name: 'Repair the ranger radio', needs: { battery: 1, antenna: 1, handset: 1 }, where: 'tower' },
  boat: { name: 'Repair Kai\'s skiff', needs: { battery: 1, wood: 2, rope: 1 }, where: 'village' },
  bunker: { name: 'Seal the old bunker', needs: { water: 4, food: 4, mask: 1 }, where: 'bunker' },
};

export const STAGES = [
  { id: 'calm', from: 0, name: 'Calm', desc: 'Steam over the summit. Birdsong. Paradise.' },
  { id: 'unrest', from: 0.22, name: 'Unrest', desc: 'Tremors. The plume is darkening. The birds have gone quiet.' },
  { id: 'ashfall', from: 0.48, name: 'Ashfall', desc: 'Ash is falling. Cover your mouth. The sky is going dark.' },
  { id: 'eruption', from: 0.72, name: 'Eruption', desc: 'Lava bombs and lava flows. Get off the mountain.' },
  { id: 'surge', from: 0.94, name: 'Pyroclastic surge', desc: 'Nothing on the surface survives this. Be gone, or be underground.' },
];
export function stageAt(p) { let s = STAGES[0]; for (const st of STAGES) if (p >= st.from) s = st; return s; }

export function newStats() { return { health: 100, stamina: 100, hunger: 100, thirst: 100, air: 100 }; }

// advance the body by dt seconds. ctx: { sprinting, swimming, ash (0..1 ash in the air), sheltered, mask, hard, moving }
export function tickStats(s, dt, ctx) {
  const k = ctx.hard ? 1.45 : 1;
  s.hunger -= dt * (100 / (30 * 60)) * k * (ctx.sprinting ? 1.6 : 1);
  s.thirst -= dt * (100 / (17 * 60)) * k * (ctx.sprinting ? 2.0 : ctx.moving ? 1.25 : 1) * (ctx.hot ? 1.6 : 1);
  if (ctx.sprinting) s.stamina -= dt * 13;
  else if (ctx.swimming) s.stamina -= dt * 4.5;
  else s.stamina += dt * (ctx.moving ? 9 : 16) * (s.hunger > 25 ? 1 : 0.4);
  // ash in the lungs
  const ash = ctx.sheltered ? 0 : ctx.ash;
  if (ash > 0.02) s.air -= dt * ash * (ctx.mask ? 100 / (20 * 60) : 100 / (3.5 * 60)) * k;
  else s.air += dt * 6;
  // the damage all of that does
  let dmg = 0;
  if (s.hunger <= 0) dmg += 1.2; if (s.thirst <= 0) dmg += 2.0; if (s.air <= 0) dmg += 3.0;
  if (ctx.swimming && s.stamina <= 0) dmg += 6;
  if (dmg > 0) s.health -= dmg * dt * k; else if (s.hunger > 50 && s.thirst > 50 && s.air > 30) s.health += dt * 0.6;
  for (const key of Object.keys(s)) s[key] = Math.max(0, Math.min(100, s[key]));
  return dmg;
}

// the running inventory
export class Inventory {
  constructor(obj) { this.items = obj || {}; }
  count(id) { return this.items[id] || 0; }
  add(id, n = 1) { this.items[id] = (this.items[id] || 0) + n; if (this.items[id] <= 0) delete this.items[id]; }
  has(needs) { return Object.entries(needs).every(([id, n]) => (id === 'food' ? FOOD.reduce((a, f) => a + this.count(f), 0) : this.count(id)) >= n); }
  take(needs) {
    for (const [id, n] of Object.entries(needs)) {
      if (id === 'food') { let left = n; for (const f of FOOD) { const t = Math.min(left, this.count(f)); if (t) { this.add(f, -t); left -= t; } } }
      else this.add(id, -n);
    }
  }
  foodCount() { return FOOD.reduce((a, f) => a + this.count(f), 0); }
  list() { return Object.keys(ITEMS).filter((id) => this.count(id) > 0); }
  total() { return Object.values(this.items).reduce((a, b) => a + b, 0); }
}

export const ACHIEVEMENTS = [
  { id: 'end_raft', name: 'Castaway', desc: 'Escape on the raft you built' },
  { id: 'end_boat', name: 'Open throttle', desc: 'Escape in Kai\'s skiff' },
  { id: 'end_rescue', name: 'Airlifted', desc: 'Escape by helicopter' },
  { id: 'end_bunker', name: 'Underground', desc: 'Ride out the eruption in the bunker' },
  { id: 'end_dead', name: 'The mountain wins', desc: 'Lose your life to the island' },
  { id: 'everyone', name: 'Nobody left behind', desc: 'Save all five survivors and Biscuit' },
  { id: 'journal', name: 'Field notes', desc: 'Find all twelve pages of Dr Osei\'s journal' },
  { id: 'dog', name: 'Good girl', desc: 'Reunite Biscuit with Old Pete' },
  { id: 'chef', name: 'Island chef', desc: 'Cook three meals on a fire' },
  { id: 'fisher', name: 'Spear fisher', desc: 'Spear three fish' },
  { id: 'crab', name: 'Pinched', desc: 'Catch a crab with your bare hands' },
  { id: 'builder', name: 'Home sweet lean-to', desc: 'Build a shelter' },
  { id: 'sleep', name: 'Sweet dreams', desc: 'Sleep till dawn' },
  { id: 'quad', name: 'Off-road', desc: 'Ride the quad bike for a kilometre' },
  { id: 'photo', name: 'Shutterbug', desc: 'Take a photo in photo mode' },
  { id: 'early', name: 'Early bird', desc: 'Escape with a quarter of the time still left' },
  { id: 'healthy', name: 'Not a scratch', desc: 'Escape with 90 health or more' },
  { id: 'beacon', name: 'Keeper of the light', desc: 'Light the lighthouse beacon' },
  { id: 'gas', name: 'Rotten eggs', desc: 'Walk out of a sulphur gas pocket alive' },
  { id: 'radio_ear', name: 'Stay tuned', desc: 'Hear three emergency broadcasts' },
];
