# WallyMan Maze

A 3D maze-chase arcade game built with [Three.js](https://threejs.org/). Everything is in one file, `index.html`.

You play **WallyMan**, a hero in a blue hood, goggles and a looped headpiece, trapped in a neon maze. Collect every spark to clear the level while four Sentry drones hunt you. Grab a **flare** to scare the Sentries for a few seconds, then chase them down for bonus points.

## Play

Open `index.html` in a modern browser. It needs an internet connection to load Three.js from a CDN.

| Control | Action |
| --- | --- |
| Arrow keys / WASD | Move (or swipe / use the on-screen pad on touch screens) |
| C | Switch between chase camera and overhead camera |
| P / Esc | Pause |
| M | Sound on or off |

## The Sentries

| Sentry | Behaviour |
| --- | --- |
| Rook (red) | Heads straight for you |
| Vex (violet) | Aims four tiles ahead of you to cut you off |
| Mirra (teal) | Moves to the opposite side of you from Rook, pinning you between them |
| Drift (orange) | Wanders the maze, then pounces when you get close |

Sentries switch between *scatter* (each retreats to its own corner) and *chase*. Every level they get faster and flares wear off sooner.

## Bonus fruit

A bonus fruit appears just below the Sentry bay twice per level: once when 30% of the sparks are eaten, and again at 70%. It stays for about 9 seconds and blinks before it disappears. Fruit you collect show up as coloured dots in the HUD.

| Level | Fruit | Points |
| --- | --- | --- |
| 1 | Cherries | 100 |
| 2 | Banana | 300 |
| 3 | Grapes | 500 |
| 4 | Pineapple | 700 |
| 5 | Watermelon | 1000 |
| 6+ | Gold star | 2000 |

## Scoring

- Spark: 10
- Flare: 50
- Sentries eaten during one flare: 200, 400, 800, 1600
- Bonus fruit: see the table above
- Extra life at 10,000 points

## High scores

The top 10 scores are saved in your browser (`localStorage`) with your name and the level you reached. If you make the table, you're asked for your name when the game ends. Scores are kept per browser, so they don't carry across devices.

## How it works

- **Grid movement**: actors move tile to tile and pick a new direction at each tile centre (`advance()`). Your next turn is buffered, so you can press a direction before reaching a junction.
- **Sentry AI**: at each junction a Sentry picks the open direction (never reversing) that brings it closest to its target tile (`sentryChoose()` and `sentryTarget()`).
- **WallyMan model**: built from Three.js primitives (spheres, tori and a tube along a curve for each headpiece loop). His face stays turned toward the camera and leans left or right as he moves.
- **Rendering**: walls, neon edge strips and sparks are `InstancedMesh`es, so the whole maze is drawn in a few draw calls.

To change the layout, edit the `MAZE` array at the top of the script. Keep every row the same width. To add or change fruit, edit the `FRUITS` list.
