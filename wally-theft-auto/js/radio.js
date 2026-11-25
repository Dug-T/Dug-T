// Radio Wallypool: six stations, each with its own songs, all played live by the synth in audio.js.
//
// A song is a little score:
//   prog   chords, one per bar, as "root:quality" (root in semitones from the key; quality '', m, 7, m7, M7)
//   steps  steps per bar, div steps per beat (16/4 for 4/4 sixteenths, 6/3 for a jig in 6/8)
//   drums  k kick, s snare, h hat, o open hat, b bodhran: 'x' = hit, 'o' = soft hit, '.' = nothing
//   parts  bass / lead / arp / stab / pad / drone; note tokens are semitones from the chord root
//          (or from the key when abs is set), with t/T = the chord's third (+12), s/S = its seventh, '.' = rest
export const STATIONS = [
  {
    name: 'WALLY FM', blurb: 'Chiptune pop',
    songs: [
      { title: "Wally's Theme", artist: 'The Hopeless Heroes', bpm: 128, prog: ['0', '5', '7', '5'],
        drums: { k: 'x...x...x...x...', s: '....x.......x...' },
        parts: [
          { kind: 'bass', inst: 'square', vol: 0.12, len: 1.8, oct: -24, notes: ['0 . 7 . 0 . 7 . 0 . 7 . 0 . 7 .'] },
          { kind: 'lead', inst: 'square', vol: 0.06, len: 1.6, notes: ['12 16 19 16 21 19 16 14 12 14 16 19 24 19 16 12'] },
        ] },
      { title: 'Cape Caper', artist: 'Bit Crusher Brenda', bpm: 150, prog: ['0:m', '8', '10', '3'],
        drums: { k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
        parts: [
          { kind: 'bass', inst: 'square', vol: 0.11, len: 0.9, oct: -24, notes: ['0 0 . 0 12 . 0 . 0 0 . 0 12 . 7 .'] },
          { kind: 'lead', inst: 'square', vol: 0.055, len: 1.2, notes: ['12 . T . 19 . T . 12 . 14 . T . 12 .', '12 . T . 19 . T . 12 . 14 . T . 12 .', '19 . 19 T 12 . 7 . 12 . T . 19 . 24 .', '12 . T . 19 . T . 12 . 7 . . . . .'] },
          { kind: 'arp', inst: 'triangle', vol: 0.03, len: 0.8, notes: ['0 t 7 12'], everyOther: true },
        ] },
      { title: 'Specs Appeal', artist: 'DJ Gameboy Gordon', bpm: 116, prog: ['0', '0', '5', '7'],
        drums: { k: 'x..x..x...x..x..', s: '....x.......x...', h: '..x...x...x...x.' },
        parts: [
          { kind: 'bass', inst: 'square', vol: 0.11, len: 0.9, oct: -24, notes: ['0 . . 0 . . 12 . 10 . 7 . 5 . 3 .'] },
          { kind: 'lead', inst: 'square', vol: 0.05, len: 1.4, notes: ['12 . . 14 T . . 12 . . 19 . 17 . T .', '24 . 22 . 19 . . . T . 12 . . . . .'] },
        ] },
    ],
  },
  {
    name: 'CLYDE BEATS', blurb: 'Synthwave',
    songs: [
      { title: 'Neon Clyde', artist: 'Kelvin Grove', bpm: 100, prog: ['0:m', '-4', '3', '-2'],
        drums: { k: 'x...x...x...x...', s: '....x.......x...', h: '.x.x.x.x.x.x.x.x' },
        parts: [
          { kind: 'bass', inst: 'sawtooth', vol: 0.08, len: 0.9, oct: -24, notes: ['0 12 0 12 0 12 0 12 0 12 0 12 0 12 0 12'] },
          { kind: 'pad', inst: 'triangle', vol: 0.04, len: 15 },
          { kind: 'arp', inst: 'triangle', vol: 0.05, len: 0.8, notes: ['12 T 19 24 19 T 24 27'], everyOther: true },
        ] },
      { title: 'Midnight on the Motorway', artist: 'The Sodium Lamps', bpm: 108, prog: ['0:m', '-7:m', '-4', '-2'],
        drums: { k: 'x.....x.x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
        parts: [
          { kind: 'bass', inst: 'sawtooth', vol: 0.08, len: 0.9, oct: -24, notes: ['0 . 0 . 0 . 0 0 . 0 . 0 7 . 5 .'] },
          { kind: 'pad', inst: 'triangle', vol: 0.035, len: 15 },
          { kind: 'lead', inst: 'square', vol: 0.04, len: 3.5, notes: ['T . . . 7 . . . 12 . . . 10 . . .', '12 . . . T . . . 7 . . . . . . .'] },
        ] },
      { title: 'Laser Loch', artist: 'Nessie Nights', bpm: 120, prog: ['0:m', '0:m', '-4', '-5'],
        drums: { k: 'x...x...x...x...', s: '....x.......x...', o: '..x...x...x...x.' },
        parts: [
          { kind: 'bass', inst: 'sawtooth', vol: 0.08, len: 0.9, oct: -24, notes: ['0 . 12 . 0 . 12 . 0 . 12 . 0 . 12 .'] },
          { kind: 'pad', inst: 'triangle', vol: 0.035, len: 15 },
          { kind: 'arp', inst: 'triangle', vol: 0.045, len: 0.8, notes: ['12 T 19 24 T+12 19 T 12'] },
        ] },
    ],
  },
  {
    name: 'PIPES & RIFFS', blurb: 'Bagpipe rock',
    songs: [
      { title: 'Kilted Thunder', artist: 'The Skirl Boys', bpm: 140, prog: ['0', '0', '5', '7'], drone: true,
        drums: { k: 'x.......x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
        parts: [
          { kind: 'bass', inst: 'square', vol: 0.07, len: 3.5, oct: -12, notes: ['0 . . . 0 . . . 0 . . . 0 . . .'] },
          { kind: 'lead', inst: 'pipes', vol: 0.05, len: 2.1, abs: true, notes: ['12 . 14 . 16 . 19 . 21 . 19 . 16 . 14 .', '12 . 10 . 12 . 14 . 16 . 14 . 12 . 9 .', '19 . 21 . 22 . 21 . 19 . 16 . 14 . 16 .', '14 . 16 . 12 . 9 . 12 . 14 . 12 . 12 .'] },
        ] },
      { title: 'Haggis Headbanger', artist: 'Clan Distortion', bpm: 160, prog: ['0', '0', '-2', '-5'], drone: true,
        drums: { k: 'x.x...x.x.x...x.', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
        parts: [
          { kind: 'bass', inst: 'guitar', vol: 0.05, len: 0.9, oct: -24, notes: ['0 0 0 . 0 0 3 . 0 0 0 . 5 . 3 .'] },
          { kind: 'lead', inst: 'pipes', vol: 0.045, len: 2.1, abs: true, notes: ['12 . . . 14 . 16 . 19 . . . 16 . 14 .', '12 . . . 10 . 12 . 7 . . . . . . .'] },
        ] },
      { title: 'Mist Over the Motorway', artist: 'Lone Piper Lachie', bpm: 84, prog: ['0', '5', '0', '7'], drone: true,
        drums: { k: 'x.......x.......', s: '........x.......', h: 'x...x...x...x...' },
        parts: [
          { kind: 'bass', inst: 'square', vol: 0.06, len: 7.5, oct: -12, notes: ['0 . . . . . . . 0 . . . . . . .'] },
          { kind: 'lead', inst: 'pipes', vol: 0.05, len: 3.8, abs: true, notes: ['12 . . . 16 . . . 19 . . . 21 . 19 .', '17 . . . 16 . . . 14 . . . 12 . . .', '12 . . . 16 . . . 19 . . . 24 . 21 .', '19 . . . 16 . . . 14 . . . . . . .'] },
        ] },
    ],
  },
  {
    name: 'CEILIDH CLASSICS', blurb: 'Accordion and fiddle',
    songs: [
      { title: 'The Drunken Seagull', artist: 'The Auchtermuchty Accordion Club', bpm: 118, steps: 6, div: 3, key: 5,
        prog: ['0', '5', '7', '9:m', '0', '5', '7', '0'], drums: { b: 'x..x..' },
        parts: [
          { kind: 'bass', inst: 'acc', vol: 0.06, len: 1.6, oct: -24, notes: ['0 . . 7 . .'] },
          { kind: 'stab', inst: 'acc', vol: 0.025, len: 1.4, oct: -12, notes: ['. x . . x .'] },
          { kind: 'lead', inst: 'fiddle', vol: 0.06, len: 1.0, abs: true, oct: -12, notes: ['12 16 19 24 19 16', '17 21 24 21 19 17', '19 23 26 23 21 19', '16 19 21 19 16 14', '12 16 19 24 26 28', '26 24 23 24 21 19', '17 16 14 16 19 23', '24 . 19 12 . .'] },
        ] },
      { title: 'Strip the Wally', artist: 'Fiddler Fiona', bpm: 112, key: 5, prog: ['0', '0', '7', '0', '0', '5', '7', '0'],
        drums: { b: 'x.......x.......', h: '..x...x...x...x.' },
        parts: [
          { kind: 'bass', inst: 'acc', vol: 0.06, len: 1.6, oct: -24, notes: ['0 . . . 7 . . . 0 . . . 7 . . .'] },
          { kind: 'stab', inst: 'acc', vol: 0.025, len: 1.4, oct: -12, notes: ['. . x . . . x . . . x . . . x .'] },
          { kind: 'lead', inst: 'fiddle', vol: 0.06, len: 1.8, abs: true, oct: -12, notes: ['24 . 23 . 21 . 19 . 21 . 23 . 24 . 26 .', '28 . 26 . 24 . 23 . 21 . 19 . 16 . 19 .', '19 . 21 . 23 . 26 . 23 . 21 . 19 . 18 .', '19 . 16 . 12 . 16 . 19 . . . . . . .'] },
        ] },
      { title: "Granny's Waltz", artist: 'Senga and the Squeezeboxes', bpm: 96, steps: 12, div: 4, key: -2,
        prog: ['0', '0', '5', '7', '0', '-3:m', '5', '7'], drums: { b: 'x...........' },
        parts: [
          { kind: 'bass', inst: 'acc', vol: 0.06, len: 3, oct: -24, notes: ['0 . . . . . . . . . . .'] },
          { kind: 'stab', inst: 'acc', vol: 0.03, len: 2.5, oct: -12, notes: ['. . . . x . . . x . . .'] },
          { kind: 'lead', inst: 'acc', vol: 0.045, len: 3.8, abs: true, notes: ['16 . . . 19 . . . 24 . . .', '23 . . . 21 . . . 19 . . .', '17 . . . 21 . . . 24 . . .', '23 . . . . . . . . . . .', '16 . . . 19 . . . 24 . . .', '28 . . . 26 . . . 24 . . .', '21 . . . 17 . . . 21 . . .', '19 . . . . . . . . . . .'] },
        ] },
    ],
  },
  {
    name: "RAVE AN' SCRAN", blurb: '90s happy hardcore',
    songs: [
      { title: 'Fizzy Juice Frenzy', artist: 'MC Mince', bpm: 168, prog: ['0', '-5', '-3:m', '-7'],
        drums: { k: 'x...x...x...x...', s: '....x.......x...', o: '..x...x...x...x.' },
        parts: [
          { kind: 'bass', inst: 'sine', vol: 0.18, len: 1.8, oct: -24, notes: ['0 . . . 0 . . . 0 . . . 0 . . .'] },
          { kind: 'stab', inst: 'piano', vol: 0.04, len: 1.5, notes: ['x . . x . . x . . . x . . x . .'] },
          { kind: 'lead', inst: 'piano', vol: 0.06, len: 1.5, notes: ['12 . 12 T . 19 . 24 . 19 . T . 12 . .', '24 . 24 19 . T . 19 . T . 12 . 7 . .'] },
        ] },
      { title: 'Hoover the Clyde', artist: 'Big Tam and the Breakbeats', bpm: 150, prog: ['0:m', '0:m', '-4', '-2'],
        drums: { k: 'x.....x...x.....', s: '....x.......x..x', h: 'x.x.x.x.x.x.x.x.' },
        parts: [
          { kind: 'bass', inst: 'sawtooth', vol: 0.07, len: 1.4, oct: -24, notes: ['0 . . 0 . . 0 . . . 0 . . . . .'] },
          { kind: 'lead', inst: 'hoover', vol: 0.05, len: 7, notes: ['12 . . . . . . . 10 . . . 7 . . .'] },
          { kind: 'stab', inst: 'piano', vol: 0.03, len: 1.2, notes: ['. . x . . . x . . . x . . x . .'] },
        ] },
      { title: 'Last Bus Home', artist: 'The Night Rider', bpm: 160, prog: ['0', '-4', '3', '-2'],
        drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.xxx.xxx.xxx.xx' },
        parts: [
          { kind: 'bass', inst: 'sawtooth', vol: 0.06, len: 0.9, oct: -24, notes: ['. . 0 . . . 0 . . . 0 . . . 0 .'] },
          { kind: 'arp', inst: 'sawtooth', vol: 0.03, len: 0.8, notes: ['0 7 12 7 T 7 12 7'] },
          { kind: 'pad', inst: 'triangle', vol: 0.035, len: 15 },
        ] },
    ],
  },
  {
    name: 'SMOOTH HAAR', blurb: 'Late-night jazz',
    songs: [
      { title: 'Dreich Afternoon', artist: 'The Rhodes Scholars', bpm: 78, swing: 0.18, prog: ['2:m7', '7:7', '0:M7', '-3:m7'],
        drums: { k: 'o.......o.o.....', s: '....o.......o...', h: 'o.o.o.o.o.o.o.o.' },
        parts: [
          { kind: 'bass', inst: 'upright', vol: 0.16, len: 3.6, oct: -24, notes: ['0 . . . t . . . 7 . . . 6 . . .'] },
          { kind: 'stab', inst: 'rhodes', vol: 0.03, len: 8, notes: ['x . . . . . . . . . x . . . . .'], seventh: true },
          { kind: 'lead', inst: 'rhodes', vol: 0.045, len: 2.5, notes: ['T . . . 19 . . . . . S . T . . .', '. . 12 . T . . . 19 . . . . . . .'] },
        ] },
      { title: 'Haar on the Water', artist: 'Morag Moonlight', bpm: 72, swing: 0.12, prog: ['0:M7', '5:M7'],
        drums: { k: 'o.......o.......', h: 'o...o...o...o...' },
        parts: [
          { kind: 'bass', inst: 'upright', vol: 0.15, len: 7, oct: -24, notes: ['0 . . . . . . . 7 . . . . . . .'] },
          { kind: 'pad', inst: 'rhodes', vol: 0.03, len: 15, seventh: true },
          { kind: 'lead', inst: 'rhodes', vol: 0.045, len: 3.5, notes: ['S . . . T . . . 19 . . . . . . .', '. . . . 24 . . . S . . . 19 . . .'] },
        ] },
      { title: 'Chip Shop Jazz', artist: 'The Salt n Sauce Trio', bpm: 96, swing: 0.2, prog: ['0:m7', '5:7', '-2:M7', '-7:7'],
        drums: { k: 'o.....o...o.....', s: '....o.......o..o', h: 'o.o.o.o.o.o.o.o.' },
        parts: [
          { kind: 'bass', inst: 'upright', vol: 0.15, len: 1.8, oct: -24, notes: ['0 . t . 7 . t . 0 . 7 . S . 7 .'] },
          { kind: 'stab', inst: 'rhodes', vol: 0.03, len: 3, notes: ['. . . x . . . . . . x . . . . .'], seventh: true },
          { kind: 'lead', inst: 'square', vol: 0.025, len: 1.6, notes: ['12 . T . 19 . S . 24 . . . S . 19 .', 'T . 12 . . . 7 . . . . . . . . .'] },
        ] },
    ],
  },
];

// ---------------- score parsing ----------------
const QUAL = { '': [0, 4, 7, 11], m: [0, 3, 7, 10], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11] };
const chord = (c) => { const [r, q = ''] = c.split(':'); const iv = QUAL[q] || QUAL['']; return { root: +r, iv, seventh: q.includes('7') }; };
// a note token -> semitones, or null for a rest. 'x' means "the chord" (used by stabs)
function tok(t, ch) {
  if (t === '.' || t === '-' || t == null) return null;
  if (t === 'x') return 'x';
  const m = t.match(/^([tTsS])(?:\+(\d+))?$/);
  if (m) { const base = { t: ch.iv[1], T: ch.iv[1] + 12, s: ch.iv[3], S: ch.iv[3] + 12 }[m[1]]; return base + (+(m[2] || 0)); }
  return +t;
}
export function prepare(song) {
  song.steps = song.steps || 16; song.div = song.div || 4; song.key = song.key || 0;
  song.chords = song.prog.map(chord);
  for (const p of song.parts) p.bars = (p.notes || ['x']).map((b) => b.trim().split(/\s+/));
  song.bars = Math.max(16, song.prog.length * 4); // how long it plays before the next song
  return song;
}
for (const st of STATIONS) for (const s of st.songs) prepare(s);

// DJ links between songs
export const DJ_LINES = [
  ["You're listening to Wally F M. The only station that plays... whatever this is.", 'Wally F M. Eight bits of pure class.', 'That was a banger. Literally. My speakers are banging.'],
  ['Clyde Beats, keeping your windscreen wipers in time since nineteen ninety nine.', 'Clyde Beats. Put your sunglasses on. Aye, even in the rain.', 'Neon, synths, and a wee bit of drizzle. Perfect.'],
  ['Pipes and Riffs! Where the bagpipes go to eleven.', 'Pipes and Riffs. If your ears are bleeding, that means it is working.', 'Somewhere, a piper is very proud of you.'],
  ['Ceilidh Classics. Grab a partner. Or a lamppost. Whatever is nearest.', 'Ceilidh Classics. Mind the auld yins on the dance floor.', 'Strip the willow, not the motor. Wally.'],
  ["Rave an' Scran! Hands in the air, chips in the other hand!", "Rave an' Scran. A hundred and sixty eight beats per minute. Like my granny's heart.", 'Big shout out to everybody stuck at the lights. Have it!'],
  ['Smooth Haar. Slow down. Relax. Unless the polis are behind ye.', 'Smooth Haar. Music for watching the rain run down the windae.', 'That was smooth. Like a well-buttered roll.'],
];
