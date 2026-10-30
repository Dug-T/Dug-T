# WallyMan Maze

A 3D maze-chase arcade game built with [Three.js](https://threejs.org/). Everything is in one file, `index.html`.

You play **WallyMan**, a hero in a blue hood, goggles and a looped headpiece, trapped in a neon maze. Collect every spark to clear the level while four Sentry drones hunt you. Grab a **flare** to scare the Sentries for a few seconds, then chase them down for bonus points. WallyMan can also breathe fire from his mouth to burn Sentries back to their bay, as long as he has fuel.

## Play

Open `index.html` in a modern browser. Keep `wallyman.jpg` (the portrait on the start screen) and `wallyman-maze-voice.mp3` (the "WallyMan Maze" voice at the start) next to it. It needs an internet connection to load Three.js from a CDN.

| Control | Action |
| --- | --- |
| Arrow keys / WASD | Move (or swipe / use the on-screen pad on touch screens) |
| F / Space | Breathe fire (or double-tap the screen on touch screens, or double-click with a mouse) |
| C | Switch between chase camera and overhead camera |
| P / Esc | Pause |
| M | Cycle sound: music and effects, effects only, off |

## The Sentries

| Sentry | Behaviour |
| --- | --- |
| Rook (red) | Heads straight for you |
| Vex (violet) | Aims four tiles ahead of you to cut you off |
| Mirra (teal) | Moves to the opposite side of you from Rook, pinning you between them |
| Drift (orange) | Wanders the maze, then pounces when you get close |
| Titan (pink, spiked, boss) | Joins from level 3 (level 1 in the daily challenge). Always heads for you, a little slower than the others |

Sentries switch between *scatter* (each retreats to its own corner) and *chase*. Every level they get faster (up to level 13) and flares wear off sooner.

### Titan, the boss Sentry

Flares don't scare the Titan and you can't eat it. Only the flamethrower hurts it: keep it in the flame and its health bar drains (about two full bursts). Burning it down scores 1,500 and sends it back to the bay for 8 seconds before it comes out again.

## Mazes

Level 1 is the classic maze. Every later level is a new maze, generated from the level number, so level 5 is the same maze for everyone. Each maze has its own neon colour. Generated mazes keep the classic border, Sentry bay, side tunnel and start row; the rest starts as a full grid of corridors and random stretches are walled in (mirrored left to right) as long as no dead end appears and every tile stays reachable (`generateMaze()`).

## Power-ups

One power-up at a time appears on a random tile, about every 15 to 20 seconds, and fades after 10 seconds. The HUD shows a countdown chip for each one that's running.

| Power-up | Looks like | Effect |
| --- | --- | --- |
| Speed boost | Green-yellow lightning bolt | WallyMan moves 40% faster for 6 seconds |
| Shield | Green hexagon | A bubble that blocks one catch for 10 seconds. A Sentry that hits it is knocked back to the bay (100 points); the Titan is stunned |
| Freeze | Ice-blue snowflake | All Sentries stop for 4.5 seconds. They can still catch you if you run into them |

## Daily challenge

The **Daily challenge** button plays today's maze, generated from the date (UTC), so everyone gets the same maze on the same day and a new one at midnight UTC. The Titan is in from the first level, and clearing the maze replays it faster. It has its own leaderboard ("Today's daily" tab) that's completely separate from the all-time high scores.

## Skins

Your best score in any mode unlocks new looks for WallyMan: Ember (2,000), Mint (5,000), Royal (10,000), Gold (20,000), Shadow (35,000) and Prism (50,000, colour-cycling). Pick one on the start or game-over screen; the choice is remembered in this browser.

## Sound, music and vibration

- A chase theme plays during play. It speeds up each level, gets a bit faster while the Titan is out, and switches to a jittery variation while the Sentries are scared.
- Effects: a chomp for sparks, a whoosh and roar for the flame, and sounds for power-ups, fuel, the Titan and unlocks.
- On phones that support it (Android browsers; iPhones don't), the game buzzes when you're caught, pick up fuel or a power-up, or bring down the Titan. A **Vibration** button on the start screen turns it off.

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

## Flamethrower and fuel

Double-tap the screen (or press F / Space) and WallyMan breathes a burst of fire from his mouth in the direction he's facing. The flame reaches up to four tiles and stops at walls. Any Sentry it touches is burned back to the bay.

- The **fuel gauge** in the HUD starts full at the start of each game. Each burst burns about a fifth of the tank, and the gauge blinks red when it's nearly empty. With an empty tank, nothing fires.
- **Fuel cans** (red jerry cans) appear on random open tiles, up to two at a time, roughly every 9 to 15 seconds. Each one adds 40 fuel. Cans are cleared at the end of each level.

## Scoring

- Spark: 10
- Flare: 50
- Sentries eaten during one flare: 200, 400, 800, 1600
- Sentry burned by the flame: 300 (or the flare chain value above if it was scared)
- Titan burned down: 1,500
- Sentry knocked back by the shield: 100
- Bonus fruit: see the table above
- Extra life at 10,000 points

## Announcer

When you press Play, a female voice says "WallyMan Maze". It uses your browser's built-in speech voices and picks the most natural-sounding female English voice available:

- **Microsoft Edge:** "Aria", "Sonia" or "Libby" (Online, Natural)
- **Chrome:** Google's cloud voices ("Google US English", "Google UK English Female")
- **Mac / iPhone:** "Enhanced" or "Premium" voices such as Zoe or Ava, otherwise Samantha. Installing one (System Settings → Accessibility → Spoken Content → Manage Voices) makes the announcer sound much more natural.

If no female English voice is installed, it uses the default voice. Turning the sound off (M) also silences the announcer.

## Leaderboard

- **Published page (claude.ai):** the leaderboard is shared by everyone who plays. Each player has one entry, their best run, and it updates live. Posting a score needs Contributor access to the page; viewers can still see the board.
- **Inside the Facebook, Instagram or Messenger app:** those apps open links in their own built-in browser, where you aren't signed in to Claude, so the shared leaderboard can't be reached. Scores save on that phone only, and the game says so under the high score table. The start screen shows an **Open in your browser** button there: on Android it hands the game to Chrome (an `intent://` link), on iPhone (iOS 17+) to Safari (`x-safari-https://`). Facebook and the Claude page frame often block that silently (it does nothing on iPhone), so tapping it also shows the manual steps straight away (⋯ → **Open in browser**) and a Copy link box. Facebook doesn't allow a link to leave its browser without a tap, so it can't happen fully automatically.
- **Opened as a file:** there's no shared database, so the game keeps a top 10 in your browser (`localStorage`) instead.
- The all-time board's storage (the `leaderboard` collection and the `wallyman-maze-scores` browser key) is unchanged from earlier versions, so existing scores carry over. The daily board lives separately (the `daily` collection, one entry per player, and the `wallyman-maze-daily` browser key).

At the end of every game that scores points, you can type your name (up to 12 characters):

- **New best:** your entry is saved with that score.
- **Not a new best:** the name on your entry is updated, and your best score stays.
- **No Contributor access:** the game tells you to ask the owner for access instead of showing the name box.
- **Opened as a file:** names go into the browser's top 10 when the score is good enough to make it.

## How it works

- **Grid movement**: actors move tile to tile and pick a new direction at each tile centre (`advance()`). Your next turn is buffered, so you can press a direction before reaching a junction.
- **Sentry AI**: at each junction a Sentry picks the open direction (never reversing) that brings it closest to its target tile (`sentryChoose()` and `sentryTarget()`).
- **WallyMan model**: built from Three.js primitives (spheres, tori and a tube along a curve for each headpiece loop). His face stays turned toward the camera and leans left or right as he moves.
- **Rendering**: walls, neon edge strips and sparks are `InstancedMesh`es, so the whole maze is drawn in a few draw calls.

To change the level 1 layout, edit the `CLASSIC` array at the top of the script. Keep every row the same width. To add or change fruit, edit the `FRUITS` list.
