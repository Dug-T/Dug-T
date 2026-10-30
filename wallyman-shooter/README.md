# WallyMan Shooter

A realistic-style first-person shooter built with [Three.js](https://threejs.org/), and the sequel to [WallyMan Maze](../wallyman-maze/). Everything is in `index.html`, with `wallyman.jpg` as the start-screen portrait. All models, textures and sounds are generated in code; there are no image, model or audio files apart from the portrait.

A Red Cell mercenary unit is closing in on a desert outpost at dusk. As WallyMan, hold it against wave after wave of soldiers among concrete buildings, shipping containers, sandbags, barriers, crates and oil drums. Every fifth wave, the Brute turns up.

## Play

Open `index.html` in a modern browser (Chrome, Edge, Firefox or Safari on a computer works best). Keep `wallyman.jpg` next to it. It needs an internet connection to load Three.js from a CDN.

Click **Deploy** and the game captures your mouse for aiming. Press Esc to get your cursor back; that also pauses the game.

| Control | Action |
| --- | --- |
| Mouse | Look |
| Left button | Fire (hold for the carbine) |
| Right button | Aim down sights: tighter aim, zoomed view, slower movement |
| WASD | Move |
| Shift | Sprint (forward only; you can't fire while sprinting) |
| Space | Jump |
| C or Ctrl | Crouch: hide behind low cover, steadier aim, harder to hit |
| R | Reload |
| 1 / 2, Q or mouse wheel | Carbine or pistol |
| G | Airstrike, when charged |
| Esc / P | Pause |
| M | Sound on or off |

**Touch screens:** drag on the left of the screen to move and on the right to look. Buttons on screen fire, aim, jump, crouch, reload, swap weapons and call the airstrike.

**If mouse capture is blocked** (some embedded pages don't allow it), hold the right mouse button and drag to look instead.

## Weapons

| Weapon | Fire | Damage | Magazine | Reload |
| --- | --- | --- | --- | --- |
| WM-4 Carbine (holographic sight) | Automatic | 34 | 30 (starts with 180 spare) | 2.1 s |
| Hood .45 pistol | One shot per click | 48 | 12 (unlimited spare) | 1.4 s |

- **Hit zones:** headshots do 2.5x damage (1.5–1.6x against the helmeted Heavy and Brute) and score 50 bonus points. Leg shots do 0.75x.
- **Accuracy:** shots spread more when you move, jump or fire quickly, and less when crouched or aiming down sights. The crosshair widens to show it.
- **Recoil:** each shot kicks your view up, and it settles most of the way back.
- **Feedback:** hitmarkers (white for a hit, amber for a headshot, red for a kill), muzzle flash, tracers, ejected brass, dust and bullet holes where shots land, and sparks off metal.

## Enemies

Soldiers enter from the edges of the compound, out of your sight when possible, and find their way to you around buildings. They take a moment to react when they first spot you, can't shoot through walls, and miss more when you're moving or crouched, or when they're on the move.

| Enemy | Behaviour | Points |
| --- | --- | --- |
| Rifleman (olive) | Three-round bursts from mid range; strafes while fighting | 100 |
| Rusher (dark grey, no helmet) | Sprints in close with a submachine gun | 120 |
| Marksman (tan, scoped rifle) | Fights from long range. A red laser shows where he's aiming before each shot, so break line of sight | 150 |
| Heavy (black armour) | Slow and tough, with long machine-gun bursts | 250 |
| The Brute (boss, every 5th wave) | Huge armoured soldier with a minigun; health bar at the top of the screen | 2,500 |

New types join from wave 2 (Rusher), wave 3 (Marksman) and wave 4 (Heavy). Waves get bigger and soldiers tougher as you go. Up to 12 are on the field at once.

## Health and support

- **Health** comes back on its own after 4 seconds without taking damage. The screen edges turn red as it drops, and red arcs round the crosshair show which way the shots came from.
- **Armour:** fallen soldiers sometimes drop a vest (+50 armour, absorbs 60% of each hit until used up) or an ammo box (+60 carbine rounds). Clearing a wave tops your carbine ammo up to at least 120.
- **Radar** (top left): buildings and cover in grey, soldiers as red dots while they can see you or are firing, the Brute in amber, and dropped items as amber squares.
- **Airstrike:** every 10 kills charges it. Call it in and jets hit every soldier on the field a moment later; the Brute loses 30% of his health.

## Leaderboard

- **Published page (claude.ai):** the leaderboard is shared by everyone who plays. Each player has one entry, their best run. At the end of every game you can type your name: a new best is saved with its score, otherwise only your name is updated. Posting needs Contributor access to the page.
- **Opened as a file:** the game keeps a top 10 in your browser (`localStorage`) instead.

## Announcer

When you deploy, a female voice says "WallyMan Shooter" using the browser's built-in speech, picking the most natural-sounding voice available.

## How it works

- **Level**: every solid is a box in `BOXES`. The same list builds the 3D scene, blocks movement, stops bullets, builds the path-finding grid and draws the radar.
- **Look**: ACES film tone mapping, a soft-shadowed low sun, a gradient sky shader with haze, and textures (concrete, brick, facades with windows, wood, corrugated steel, dirt, asphalt) painted onto canvases at load time.
- **Soldiers**: built from boxes and spheres with jointed hips, knees, shoulders and elbows. They animate walking and running, aim up and down at you, flinch when hit and fall when killed. Each has head, chest, belly and leg hit zones.
- **Path-finding**: a 1 m grid over the compound. A flood fill from your position runs a few times a second, and soldiers step towards lower distances, so they route round buildings and containers.
- **Shooting**: hitscan, from the camera with random spread inside the current cone. Enemy shots roll against a hit chance based on range and movement, and only when they have line of sight.
- **View model**: the gun and arms are drawn in a second scene over the world (`vmScene`), so they never poke through walls. Aiming down sights lines the holographic sight up with the centre of the screen.
