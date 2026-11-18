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
    theme: 'temperate', weather: ['clear', 'clear', 'rain', 'fog', 'storm'],
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
    theme: 'snow', weather: ['snow', 'snow', 'clear', 'fog', 'blizzard'],
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
};

// Visual themes
export const THEMES = {
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
    trees: { pine: 0.6, leaf: 0.4 }, rockTint: [0.08, 0.05, 0.4],
  },
  snow: {
    grass1: 0xdfe6ec, grass2: 0xf4f7fa, dirt: 0xa7b0b8, rock: 0x5b6068, sand: 0xc9d3db, mud: 0x6d7a86, base: 0x9aa0a6,
    oreTint: 0x9ec7d8, water: 0x6f9fb8, ice: true,
    skyTop: 0x6c8fb3, horizon: 0xd2dde8, skyBottom: 0x8a929a, sun: 0xeaf2ff, sunI: 2.6, hemiSky: 0xdbe8ff, hemiGround: 0x8090a0, hemiI: 0.9,
    trees: { snowpine: 1 }, rockTint: [0.6, 0.05, 0.4],
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
