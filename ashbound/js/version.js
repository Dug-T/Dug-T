// Bump VERSION for every update (1.1, 1.2, 1.3 ...) and add a line to CHANGES.
export const VERSION = '1.3';

export const CHANGES = [
  ['1.3', [
    'You now start right at the foot of the volcano: the camp has moved to the base of the cone',
    'Lava comes down all round the mountain: 12 flows instead of 6, creeping at a realistic few metres a second with staggered starts',
    'Hot rocks: far more lava bombs once the eruption starts, plus dark rock debris, and a landing rock kills any survivor beneath it',
    'Smoke billows out of the summit during the eruption: a much bigger plume with great dark bursts every few seconds',
    'Characters no longer float along: the walk cycle is driven by stride length so feet plant, walking is a natural pace, and bodies tilt with the slope',
    'Graphics: bump detail on the ground, cloud shadows drifting over the island, sunlight caustics on the shallow seabed, thousands of grass tufts, a sun glare, seagulls that flee the eruption, dust off your heels and spray when you swim, and a film grade (vignette, grain, colour draining with the ash) on High',
  ]],
  ['1.2', [
    'Every character is now one skinned mesh with weight-blended joints: shoulders, elbows, hips, knees and the neck bend as one body',
    'Much more detail: hands with fingers, elbows and kneecaps, tapering forearms and calves, collars, belts, shoes with soles, eyes with lids, and sharper hats and packs',
    'Reworked animations: walk and run with pelvis and shoulder counter-rotation, bobbing, swinging elbows and a limp when hurt; idle breathing, weight shifting and looking around; a proper front crawl when swimming, rolling to breathe; better sitting, talking and chopping',
    'Standard pace temporarily set to 5 minutes for testing (Relaxed 40 and Hardcore 14 unchanged); the helicopter arrives sooner on short timers',
  ]],
  ['1.1', [
    'Fixed: moving the stick (or pressing A / D) to the right walked you left, and the same on the raft',
    'Fixed: the compass strip and the map were mirrored. North is up on the map, and markers now sit on the side they really are',
    'FPS counter shown under the stat bars (turn it off in the pause menu)',
  ]],
  ['1.0', [
    'First release of ASHBOUND: SURVIVE THE ERUPTION',
    'A procedurally built tropical island with a live volcano, beaches, jungle, cliffs and a reef',
    'Third-person survival: health, stamina, hunger, thirst and clean air',
    'The mountain wakes up over the game: calm, unrest, ashfall, eruption and the final surge',
    'Three ways out: build a raft, repair the ranger radio and call a helicopter, or seal yourself in the old bunker',
    'Five survivors on the island to find, help and bring with you',
    'Plays on phones (touch), PC and Mac (keyboard and mouse), and on game controllers',
  ]],
];
