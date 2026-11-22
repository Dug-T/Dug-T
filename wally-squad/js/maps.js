// Map definitions: layout (bases, lanes, lakes, crystal) and visual theme (palette, sky, trees, weather).
export const MAPS = {
  valley: {
    name: 'Crystal Valley', desc: 'Green hills, twin lakes and a rich blue crystal field in the centre.',
    seed: [10, -4, 31, 17],
    slots: [{ x: -82, z: 82 }, { x: 82, z: -82 }],
    lanes: [
      [[-82, 82], [0, 0], [82, -82]],
      [[-82, 82], [-70, -20], [-20, -72], [82, -82]],
      [[-82, 82], [20, 72], [70, 20], [82, -82]],
    ],
    ore: [
      { x: -60, z: 104, r: 11 }, { x: -104, z: 52, r: 10 }, { x: 60, z: -104, r: 11 }, { x: 104, z: -52, r: 10 },
      { x: 0, z: 0, r: 9, rich: 1 }, { x: -62, z: -58, r: 9 }, { x: 62, z: 58, r: 9 }, { x: -18, z: 46, r: 7 }, { x: 18, z: -46, r: 7 },
    ],
    lakes: [{ x: -38, z: -2, r: 20 }, { x: 38, z: 2, r: 20 }, { x: -2, z: -40, r: 11 }, { x: 2, z: 40, r: 11 }],
    ridge: 48, forest: 0.12,
    theme: 'temperate', weather: ['clear', 'clear', 'rain', 'fog', 'storm', 'hail'],
  },
  frost: {
    name: 'Frostbite Pass', desc: 'A frozen mountain pass. Three routes, icy lakes and heavy snowfall.',
    seed: [77, 13, -5, 44],
    slots: [{ x: -96, z: 6 }, { x: 96, z: -6 }],
    lanes: [
      [[-96, 6], [0, 0], [96, -6]],
      [[-96, 6], [-50, -70], [50, -70], [96, -6]],
      [[-96, 6], [-50, 70], [50, 70], [96, -6]],
    ],
    ore: [
      { x: -100, z: 50, r: 10 }, { x: -100, z: -40, r: 9 }, { x: 100, z: -50, r: 10 }, { x: 100, z: 40, r: 9 },
      { x: 0, z: -70, r: 9, rich: 1 }, { x: 0, z: 70, r: 9, rich: 1 }, { x: -40, z: 4, r: 7 }, { x: 40, z: -4, r: 7 },
    ],
    lakes: [{ x: 0, z: -34, r: 16 }, { x: 0, z: 36, r: 16 }, { x: -60, z: 100, r: 14 }, { x: 60, z: -100, r: 14 }],
    ridge: 60, forest: 0.05,
    theme: 'snow', weather: ['snow', 'snow', 'clear', 'fog', 'blizzard', 'hail'],
  },
  dunes: {
    name: 'Dune Sea', desc: 'Scorching desert with mesas, palm-lined oases and blinding sandstorms.',
    seed: [-33, 52, 8, -21],
    slots: [{ x: -84, z: -84 }, { x: 84, z: 84 }],
    lanes: [
      [[-84, -84], [0, 0], [84, 84]],
      [[-84, -84], [-80, 40], [-40, 80], [84, 84]],
      [[-84, -84], [40, -80], [80, -40], [84, 84]],
    ],
    ore: [
      { x: -104, z: -50, r: 10 }, { x: -50, z: -104, r: 10 }, { x: 104, z: 50, r: 10 }, { x: 50, z: 104, r: 10 },
      { x: -60, z: 60, r: 10, rich: 1 }, { x: 60, z: -60, r: 10, rich: 1 }, { x: 0, z: 0, r: 8 },
    ],
    lakes: [{ x: -24, z: 24, r: 10 }, { x: 24, z: -24, r: 10 }],
    ridge: 70, forest: 0.28,
    theme: 'desert', weather: ['clear', 'clear', 'sandstorm', 'clear'],
  },
  midnight: {
    name: 'Midnight Ridge', desc: 'Eternal night on a forested ridge. Headlights and searchlights cut the dark.',
    seed: [5, 91, -60, 3],
    slots: [{ x: 4, z: 96 }, { x: -4, z: -96 }],
    lanes: [
      [[4, 96], [0, 0], [-4, -96]],
      [[4, 96], [-80, 40], [-80, -40], [-4, -96]],
      [[4, 96], [80, 40], [80, -40], [-4, -96]],
    ],
    ore: [
      { x: -50, z: 104, r: 10 }, { x: 50, z: 100, r: 9 }, { x: 50, z: -104, r: 10 }, { x: -50, z: -100, r: 9 },
      { x: -86, z: 0, r: 10, rich: 1 }, { x: 86, z: 0, r: 10, rich: 1 }, { x: 0, z: 0, r: 7 },
    ],
    lakes: [{ x: -36, z: 0, r: 15 }, { x: 36, z: 0, r: 15 }],
    ridge: 50, forest: 0.08,
    theme: 'night', weather: ['clear', 'rain', 'fog', 'storm'], night: true,
  },
  isles: {
    name: 'Emerald Isles', desc: 'Tropical jungle islands around turquoise lagoons, joined by sandy causeways. Hovercraft rule the water.',
    seed: [63, 8, -41, 29],
    slots: [{ x: -90, z: 90 }, { x: 90, z: -90 }],
    lanes: [
      [[-90, 90], [0, 0], [90, -90]],
      [[-90, 90], [-95, -20], [-20, -95], [90, -90]],
      [[-90, 90], [20, 95], [95, 20], [90, -90]],
    ],
    ore: [
      { x: -60, z: 104, r: 11 }, { x: -104, z: 52, r: 10 }, { x: 60, z: -104, r: 11 }, { x: 104, z: -52, r: 10 },
      { x: 0, z: 30, r: 7, rich: 1 }, { x: 0, z: -30, r: 7, rich: 1 }, { x: -66, z: -66, r: 8 }, { x: 66, z: 66, r: 8 },
    ],
    lakes: [{ x: -35, z: -35, r: 20 }, { x: 35, z: 35, r: 20 }, { x: -112, z: -112, r: 22 }, { x: 112, z: 112, r: 22 }, { x: 60, z: -20, r: 9 }, { x: -60, z: 20, r: 9 }],
    ridge: 40, forest: 0.2,
    theme: 'jungle', weather: ['clear', 'clear', 'rain', 'storm', 'fog'],
  },
  magma: {
    name: 'Magma Rift', desc: 'A volcanic wasteland split by a river of glowing lava. Three crossings, falling ash.',
    seed: [41, -73, 12, 66],
    slots: [{ x: -90, z: -60 }, { x: 90, z: 60 }],
    lanes: [
      [[-90, -60], [0, 0], [90, 60]],
      [[-90, -60], [-62, 18], [-32, 48], [40, 82], [90, 60]],
      [[-90, -60], [-40, -82], [32, -48], [62, -18], [90, 60]],
    ],
    ore: [
      { x: -112, z: -24, r: 10 }, { x: -58, z: -104, r: 10 }, { x: 112, z: 24, r: 10 }, { x: 58, z: 104, r: 10 },
      { x: -12, z: -46, r: 7, rich: 1 }, { x: 12, z: 46, r: 7, rich: 1 },
    ],
    // the rift: a chain of lava pools across the map with three gaps to cross
    lakes: [{ x: -16, z: 25, r: 12 }, { x: 16, z: -25, r: 12 }, { x: -50, z: 76, r: 15 }, { x: 50, z: -76, r: 15 }, { x: -70, z: 108, r: 12 }, { x: 70, z: -108, r: 12 }],
    ridge: 55, forest: 0.07,
    theme: 'volcanic', weather: ['clear', 'ashfall', 'clear', 'fog', 'ashfall'],
  },
  canyon: {
    name: 'Red Canyon', desc: 'Towering red-rock mesas, winding canyon roads, cactus and two shady oases. Watch out for sandstorms.',
    seed: [-12, 47, 83, -31],
    slots: [{ x: -100, z: 40 }, { x: 100, z: -40 }],
    lanes: [
      [[-100, 40], [0, 0], [100, -40]],
      [[-100, 40], [-60, -40], [20, -90], [100, -40]],
      [[-100, 40], [-20, 90], [60, 40], [100, -40]],
    ],
    ore: [
      { x: -118, z: 8, r: 10 }, { x: -108, z: 82, r: 9 }, { x: 118, z: -8, r: 10 }, { x: 108, z: -82, r: 9 },
      { x: 0, z: 0, r: 8, rich: 1 }, { x: 0, z: -55, r: 7 }, { x: 0, z: 55, r: 7 },
    ],
    lakes: [{ x: -40, z: -22, r: 9 }, { x: 40, z: 22, r: 9 }],
    ridge: 62, forest: 0.06,
    theme: 'canyon', weather: ['clear', 'clear', 'sandstorm', 'clear', 'fog'],
  },
  castle: {
    name: 'Castle Rock', desc: 'An ancient castle stands on a crag in the middle of the glen. Hold it with your infantry for income and a commanding view - if you can keep it.',
    seed: [91, -55, 14, 72], castle: true,
    slots: [{ x: -96, z: 70 }, { x: 96, z: -70 }],
    lanes: [
      [[-96, 70], [-40, 30], [0, 0], [40, -30], [96, -70]],
      [[-96, 70], [-100, -40], [-30, -100], [60, -96], [96, -70]],
      [[-96, 70], [-60, 100], [30, 100], [100, 40], [96, -70]],
    ],
    ore: [
      { x: -116, z: 36, r: 10 }, { x: -70, z: 108, r: 9 }, { x: 116, z: -36, r: 10 }, { x: 70, z: -108, r: 9 },
      { x: -40, z: -60, r: 8, rich: 1 }, { x: 40, z: 60, r: 8, rich: 1 },
    ],
    lakes: [{ x: -26, z: -26, r: 11 }, { x: 26, z: 26, r: 11 }, { x: 70, z: 20, r: 9 }, { x: -70, z: -20, r: 9 }],
    ridge: 52, forest: 0.12,
    theme: 'highland', weather: ['rain', 'fog', 'clear', 'rain', 'storm', 'hail'],
  },
  loch: {
    name: 'Kelpie Loch', desc: 'A great sea loch splits the glen in two. Build a Shipyard on the shore and rule the waves - or march round the long way by land.',
    seed: [52, -17, 73, -8],
    slots: [{ x: -100, z: 0 }, { x: 100, z: 0 }],
    lanes: [
      [[-100, 0], [-84, 70], [-40, 104], [40, 104], [84, 70], [100, 0]],
      [[-100, 0], [-84, -70], [-40, -104], [40, -104], [84, -70], [100, 0]],
    ],
    ore: [
      { x: -112, z: 56, r: 10 }, { x: -112, z: -56, r: 10 }, { x: 112, z: 56, r: 10 }, { x: 112, z: -56, r: 10 },
      { x: 0, z: 0, r: 7, rich: 1 }, { x: 0, z: 104, r: 7 }, { x: 0, z: -104, r: 7 },
    ],
    lakes: [{ x: 0, z: -62, r: 30 }, { x: 0, z: -24, r: 32 }, { x: 0, z: 24, r: 32 }, { x: 0, z: 62, r: 30 },
      { x: -36, z: 0, r: 18 }, { x: -58, z: 0, r: 17 }, { x: 36, z: 0, r: 18 }, { x: 58, z: 0, r: 17 },
      { x: -30, z: -60, r: 16 }, { x: 30, z: 60, r: 16 }],
    ridge: 40, forest: 0.12,
    theme: 'highland', weather: ['rain', 'fog', 'clear', 'rain', 'storm', 'hail'],
  },
  highland: {
    name: 'Highland Glen', desc: 'A misty Scottish glen of heather, pines and dark lochs, with shaggy Highland cows. Bring a brolly - it is usually pishing doon.',
    seed: [17, 88, -29, 40],
    slots: [{ x: -96, z: -30 }, { x: 96, z: 30 }],
    lanes: [
      [[-96, -30], [0, 0], [96, 30]],
      [[-96, -30], [-60, -90], [40, -80], [96, 30]],
      [[-96, -30], [-40, 80], [60, 90], [96, 30]],
    ],
    ore: [
      { x: -118, z: 4, r: 10 }, { x: -110, z: -76, r: 9 }, { x: 118, z: -4, r: 10 }, { x: 110, z: 76, r: 9 },
      { x: 0, z: 0, r: 8, rich: 1 }, { x: -60, z: 2, r: 7 }, { x: 60, z: -2, r: 7 },
    ],
    lakes: [{ x: -30, z: 32, r: 14 }, { x: 30, z: -32, r: 14 }, { x: 0, z: 54, r: 10 }, { x: 0, z: -54, r: 10 }],
    ridge: 48, forest: 0.1,
    theme: 'highland', weather: ['rain', 'rain', 'fog', 'clear', 'storm', 'hail'],
  },
  blossom: {
    name: 'Blossom Gardens', desc: 'Peaceful spring gardens of pink cherry blossom around koi ponds. Petals drift on the breeze - until the tanks arrive.',
    seed: [61, -19, 37, 4],
    slots: [{ x: -90, z: 0 }, { x: 90, z: 0 }],
    lanes: [
      [[-90, 0], [0, 0], [90, 0]],
      [[-90, 0], [-50, -60], [50, -60], [90, 0]],
      [[-90, 0], [-50, 60], [50, 60], [90, 0]],
    ],
    ore: [
      { x: -112, z: 32, r: 10 }, { x: -112, z: -32, r: 9 }, { x: 112, z: -32, r: 10 }, { x: 112, z: 32, r: 9 },
      { x: 0, z: 0, r: 8, rich: 1 }, { x: 0, z: -84, r: 7 }, { x: 0, z: 84, r: 7 },
    ],
    lakes: [{ x: -30, z: -28, r: 12 }, { x: 30, z: 28, r: 12 }, { x: -25, z: 32, r: 10 }, { x: 25, z: -32, r: 10 }],
    ridge: 52, forest: 0.14,
    theme: 'blossom', weather: ['clear', 'clear', 'rain', 'fog'],
  },
  autumn: {
    name: 'Autumn Hollow', desc: 'Rolling hills of red and gold woodland, quiet ponds and grazing farm animals. Leaves drift on the wind.',
    seed: [23, 58, -41, 9],
    slots: [{ x: -88, z: -40 }, { x: 88, z: 40 }],
    lanes: [
      [[-88, -40], [0, 0], [88, 40]],
      [[-88, -40], [-40, -96], [60, -80], [88, 40]],
      [[-88, -40], [-60, 80], [40, 96], [88, 40]],
    ],
    ore: [
      { x: -112, z: -8, r: 10 }, { x: -96, z: -88, r: 9 }, { x: 112, z: 8, r: 10 }, { x: 96, z: 88, r: 9 },
      { x: 0, z: 0, r: 8, rich: 1 }, { x: -30, z: -62, r: 7 }, { x: 30, z: 62, r: 7 },
    ],
    lakes: [{ x: 0, z: -34, r: 13 }, { x: 0, z: 34, r: 13 }, { x: 40, z: -45, r: 15 }, { x: -40, z: 45, r: 15 }],
    ridge: 50, forest: 0.16,
    theme: 'autumn', weather: ['clear', 'clear', 'rain', 'fog', 'storm'],
  },
};

// Visual themes
export const THEMES = {
  canyon: {
    grass1: 0xc0703a, grass2: 0xd8905a, dirt: 0xa0522d, rock: 0x8a3a20, sand: 0xe0a070, mud: 0x6a3a20, base: 0xb08060,
    oreTint: 0x9a7a4a, water: 0x2a7a8a,
    skyTop: 0x4a7ab8, horizon: 0xf0c8a0, skyBottom: 0x9a5a3a, sun: 0xffe0b8, sunI: 3.4, hemiSky: 0xffe2c8, hemiGround: 0x8a4a2a, hemiI: 0.8,
    trees: { cactus: 0.65, dead: 0.35 }, rockTint: [0.03, 0.5, 0.4],
  },
  highland: {
    grass1: 0x6a8c44, grass2: 0x94709e, dirt: 0x7a6a52, rock: 0x8a8076, sand: 0xb8a888, mud: 0x3e3a30, base: 0x8a8478,
    oreTint: 0x5a6a48, water: 0x1e3a48, animals: 'highland',
    skyTop: 0x6a7e96, horizon: 0xc8ccd0, skyBottom: 0x5a5a58, sun: 0xf0eadc, sunI: 3.0, hemiSky: 0xe0e8f0, hemiGround: 0x5a5040, hemiI: 0.95,
    trees: { pine: 0.75, leaf: 0.25 }, rockTint: [0.6, 0.05, 0.35],
  },
  blossom: {
    grass1: 0x5f8a3a, grass2: 0x8aae4e, dirt: 0x8a7150, rock: 0x7a7470, sand: 0xd8c49a, mud: 0x4a4232, base: 0x958a7a,
    oreTint: 0x4f6b3a, water: 0x2a6a78, leaves: 'petals', animals: 'farm',
    skyTop: 0x5a8ed0, horizon: 0xf0d8e0, skyBottom: 0x6a5a50, sun: 0xfff0e6, sunI: 3.0, hemiSky: 0xffe0ee, hemiGround: 0x4a3f2c, hemiI: 0.8,
    trees: { blossom: 0.6, leaf: 0.2, pine: 0.2 }, rockTint: [0.08, 0.05, 0.4],
  },
  autumn: {
    grass1: 0x6c7c30, grass2: 0xb0983c, dirt: 0x8a6440, rock: 0x6e665e, sand: 0xc4a878, mud: 0x4e3e2a, base: 0x8d8270,
    oreTint: 0x6a6a3a, water: 0x2a4e5a, leaves: true, animals: 'farm',
    skyTop: 0x4a7ab0, horizon: 0xe0c8a0, skyBottom: 0x6a5440, sun: 0xffdcb0, sunI: 3.0, hemiSky: 0xffe2c4, hemiGround: 0x5a3f22, hemiI: 0.8,
    trees: { autumn: 0.75, pine: 0.25 }, rockTint: [0.08, 0.05, 0.4],
  },
  jungle: {
    grass1: 0x2f6a24, grass2: 0x4f8f2e, dirt: 0x7a5a36, rock: 0x5e6658, sand: 0xe6d49a, mud: 0x3e4a2a, base: 0x8a8070,
    oreTint: 0x3f7a4a, water: 0x18a6ae,
    skyTop: 0x3f8fd0, horizon: 0xbfe0e8, skyBottom: 0x4a5a3a, sun: 0xfff2d0, sunI: 3.2, hemiSky: 0xc8f0ff, hemiGround: 0x3a4a22, hemiI: 0.85,
    trees: { palm: 0.45, leaf: 0.55 }, rockTint: [0.25, 0.1, 0.4],
  },
  volcanic: {
    grass1: 0x4a413b, grass2: 0x645549, dirt: 0x6e4a33, rock: 0x2a2624, sand: 0x6b5848, mud: 0x8a3212, base: 0x5a524c,
    oreTint: 0x7a4a2a, water: 0xff5a14, lava: true,
    skyTop: 0x4a2f36, horizon: 0xc27a52, skyBottom: 0x3a2420, sun: 0xffc8a0, sunI: 2.6, hemiSky: 0xffb894, hemiGround: 0x4a2014, hemiI: 0.75,
    trees: { dead: 1 }, rockTint: [0.03, 0.15, 0.22],
  },
  temperate: {
    grass1: 0x4f7a2a, grass2: 0x76913a, dirt: 0x8a7150, rock: 0x6e6a64, sand: 0xc2ac7c, mud: 0x4a4232, base: 0x8d8270,
    oreTint: 0x4f6b3a, water: 0x1d4b63,
    skyTop: 0x3d78b8, horizon: 0xa9c4d8, skyBottom: 0x5a5446, sun: 0xfff0d6, sunI: 3.0, hemiSky: 0xbfd8ff, hemiGround: 0x4a3f2c, hemiI: 0.75,
    trees: { pine: 0.6, leaf: 0.4 }, rockTint: [0.08, 0.05, 0.4], animals: 'farm',
  },
  snow: {
    grass1: 0xdfe6ec, grass2: 0xf4f7fa, dirt: 0xa7b0b8, rock: 0x5b6068, sand: 0xc9d3db, mud: 0x6d7a86, base: 0x9aa0a6,
    oreTint: 0x9ec7d8, water: 0x6f9fb8, ice: true,
    skyTop: 0x6c8fb3, horizon: 0xd2dde8, skyBottom: 0x8a929a, sun: 0xeaf2ff, sunI: 2.6, hemiSky: 0xdbe8ff, hemiGround: 0x8090a0, hemiI: 0.9,
    trees: { snowpine: 1 }, rockTint: [0.6, 0.05, 0.4], animals: 'penguin',
  },
  desert: {
    grass1: 0xd2b27a, grass2: 0xe0c38c, dirt: 0xb48a58, rock: 0xa0653e, sand: 0xe8d29c, mud: 0x6d5a3c, base: 0xb9a07a,
    oreTint: 0xa89a5a, water: 0x2a7d86,
    skyTop: 0x4c86c4, horizon: 0xe6d6b4, skyBottom: 0x9a7a52, sun: 0xffe6b8, sunI: 3.6, hemiSky: 0xffe8c8, hemiGround: 0x8a6a40, hemiI: 0.8,
    trees: { palm: 0.45, cactus: 0.55 }, rockTint: [0.06, 0.35, 0.45],
  },
  night: {
    grass1: 0x3f6a2a, grass2: 0x5a7d34, dirt: 0x7a6548, rock: 0x666260, sand: 0xa89870, mud: 0x3a3428, base: 0x7d7468,
    oreTint: 0x3f5f3a, water: 0x13314a,
    skyTop: 0x3d78b8, horizon: 0xa9c4d8, skyBottom: 0x5a5446, sun: 0xfff0d6, sunI: 3.0, hemiSky: 0xbfd8ff, hemiGround: 0x4a3f2c, hemiI: 0.75,
    trees: { pine: 0.8, leaf: 0.2 }, rockTint: [0.08, 0.05, 0.4],
  },
};

export const getMap = id => MAPS[id] || MAPS.valley;
