# WallyMan Shooter

A first-person arena shooter built with [Three.js](https://threejs.org/), and the sequel to [WallyMan Maze](../wallyman-maze/). Everything is in `index.html`, with `wallyman.jpg` as the start-screen portrait.

You see the outpost through WallyMan's goggles, his blue sleeves on the gun. Hold off wave after wave of Sentries among buildings, walls and crates. Every fifth wave, the Overseer turns up.

## Play

Open `index.html` in a modern browser (Chrome, Edge, Firefox or Safari on a computer works best). Keep `wallyman.jpg` next to it. It needs an internet connection to load Three.js from a CDN.

Click **Deploy** and the game captures your mouse for aiming. Press Esc to get your cursor back; that also pauses the game.

| Control | Action |
| --- | --- |
| Mouse | Look |
| Left button | Fire (hold for the rifle) |
| Right button | Aim down sights: tighter aim, zoomed view, slower movement |
| WASD | Move |
| Shift | Sprint (forward only; you can't fire while sprinting) |
| Space | Jump |
| R | Reload |
| 1 / 2, Q or mouse wheel | Rifle or pistol |
| G | EMP blast, when charged |
| Esc / P | Pause |
| M | Sound on or off |

**Touch screens:** drag on the left of the screen to move and on the right to look. Buttons on screen fire, aim, jump, reload, swap weapons and set off the EMP.

**If mouse capture is blocked** (some embedded pages don't allow it), hold the right mouse button and drag to look instead.

## Weapons

| Weapon | Fire | Damage | Magazine | Reload |
| --- | --- | --- | --- | --- |
| WM-4 Rifle | Automatic | 34 | 30 (starts with 180 spare) | 1.9 s |
| Hood .45 pistol | One shot per click | 48 | 12 (unlimited spare) | 1.3 s |

- **Eye shots:** hit a Sentry in its eye for double damage, a gold hitmarker and 50 bonus points.
- **Accuracy:** shots spread more when you move, jump or fire quickly, and much less when aiming down sights. The crosshair widens to show it.
- **Recoil:** each shot kicks your view up, and it settles most of the way back.

## Health and help

- **Health** comes back on its own after 3.5 seconds without taking damage. The screen edges turn red as it drops, and red arcs round the crosshair show which way the hit came from.
- **Radar** (top left): you're the arrow in the middle, Sentries are red dots, the Overseer is a big pink dot and dropped items are coloured squares.
- **EMP blast:** every 10 kills charges the EMP (the bar in the bottom left). Set it off to destroy every Sentry on the field and knock a quarter off the Overseer's health.
- **Drops:** destroyed Sentries sometimes drop ammo (+60 rifle rounds), rapid fire (8 s) or a shield (6 s). Clearing a wave tops your rifle ammo back up to at least 120.

## Enemies

| Enemy | Behaviour | Points |
| --- | --- | --- |
| Rook (red) | Rushes straight at you and rams | 100 |
| Vex (violet) | Gets close, flashes as it winds up, then dashes through you | 150 |
| Mirra (teal) | Hovers high, circles at range and fires pink orbs when it can see you | 200 |
| Drift (orange) | Slow and tough; splits into two fast minis | 150 (minis 50) |
| The Overseer (boss, every 5th wave) | Fires rings of orbs at chest height (move through the gaps) and aimed volleys | 3,000 |

New enemy types join from wave 2 (Vex), wave 3 (Mirra) and wave 4 (Drift). Sentries arrive through the pink rings at the edge of the outpost and float over crates and low walls, but walls, buildings and pillars block them.

## Leaderboard

- **Published page (claude.ai):** the leaderboard is shared by everyone who plays. Each player has one entry, their best run. At the end of every game you can type your name: a new best is saved with its score, otherwise only your name is updated. Posting needs Contributor access to the page.
- **Opened as a file:** the game keeps a top 10 in your browser (`localStorage`) instead.

## Announcer

When you deploy, a female voice says "WallyMan Shooter" using the browser's built-in speech, picking the most natural-sounding voice available.

## How it works

- **Level**: every solid is a box in `BOXES` (walls, buildings, pillars, cover and crates). The same list builds the 3D scene, blocks movement, stops bullets and orbs, and draws the radar.
- **Shooting**: hitscan. Each shot casts a ray from the camera with random spread inside the current cone, and finds the nearest wall or Sentry (`rayWorld()` and `raySphere()`).
- **View model**: the gun and arms are drawn in a second scene over the world (`vmScene`), so they never poke through walls. Aiming down sights moves the gun from its hip position to line the sight up with the centre of the screen.
- **Enemies**: each type has its own steering in `updateEnemy()`. Mirra and the Overseer only fire when they have line of sight.
