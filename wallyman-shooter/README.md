# WallyMan Shooter

A 3D arena shooter built with [Three.js](https://threejs.org/), and the sequel to [WallyMan Maze](../wallyman-maze/). Everything is in `index.html`, with `wallyman.jpg` as the start-screen portrait.

The Sentries are back. WallyMan fires laser bolts from his goggles to hold off wave after wave of them in a neon arena with cover blocks. Every fifth wave, the Overseer turns up.

## Play

Open `index.html` in a modern browser. Keep `wallyman.jpg` next to it. It needs an internet connection to load Three.js from a CDN.

| Control | Action |
| --- | --- |
| WASD | Move |
| Mouse | Aim; hold the left button to fire |
| Arrow keys | Aim and fire without a mouse |
| Touch | Drag on the left half of the screen to move, and on the right half to aim and fire |
| P / Esc | Pause |
| M | Sound on or off |

## Enemies

| Enemy | Behaviour | Points |
| --- | --- | --- |
| Rook (red) | Charges straight at you | 100 |
| Vex (violet) | Gets close, flashes as it winds up, then dashes | 150 |
| Mirra (teal) | Keeps its distance, circles you and fires pink orbs | 200 |
| Drift (orange) | Slow and tough; splits into two fast minis when destroyed | 150 (minis 50) |
| The Overseer (boss, every 5th wave) | Fires rings of orbs and aimed volleys; health bar at the top of the screen | 2,500 |

New enemy types join from wave 2 (Vex), wave 3 (Mirra) and wave 4 (Drift). Waves get bigger and enemies get faster as you go. Touching an enemy or being hit by an orb costs health. Clearing a wave restores 10 health.

## Power-ups

Destroyed enemies sometimes drop a power-up, and the Overseer always drops three. Power-ups blink before they disappear after 10 seconds.

| Power-up | Effect |
| --- | --- |
| Health (red cross) | +30 health |
| Rapid fire (yellow arrows) | About twice the fire rate for 8 seconds |
| Triple shot (cyan dots) | Three bolts per shot for 8 seconds |
| Shield (blue ring) | Blocks all damage for 6 seconds |

## Scoring

Kills in quick succession build a combo: every 4 kills without a 2-second gap raises the multiplier, up to x5. Each kill's points are multiplied by the current combo.

## Leaderboard

- **Published page (claude.ai):** the leaderboard is shared by everyone who plays. Each player has one entry, their best run. At the end of every game you can type your name: a new best is saved with its score, otherwise only your name is updated. Posting needs Contributor access to the page.
- **Opened as a file:** the game keeps a top 10 in your browser (`localStorage`) instead.

## Announcer

When you press Play, a female voice says "WallyMan Shooter" using the browser's built-in speech, picking the most natural-sounding voice available. To use a recorded clip instead, as WallyMan Maze does, add an MP3 and play it from `newGame()`.

## How it works

- **Arena**: walls and cover are axis-aligned boxes in `BOXES`. Players and enemies are circles pushed out of boxes by `collideCircle()`, and bolts stop when they enter one.
- **Enemies**: each type has its own steering in `updateEnemy()`. Enemies that bump into cover slide sideways around it, and nearby enemies push apart so they don't stack.
- **Waves**: `buildWave()` chooses each wave's mix. Enemies arrive through the pink portals, away from WallyMan, with at most 22 on the field at once.
- **Bolts**: player bolts and enemy orbs come from fixed pools, so firing never creates new objects.
