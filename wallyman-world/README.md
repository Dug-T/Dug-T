# WallyMan World

A 16-bit style side-scrolling platformer starring **WallyMan**, built in plain HTML5 + JavaScript (no installs, no build step).

## Play

Open `index.html` in any modern browser — or enable **GitHub Pages** for this repo (Settings → Pages → deploy from branch) and visit `/wallyman-world/`.

| Action | Keyboard | Gamepad | Touch |
| --- | --- | --- | --- |
| Move | Arrows / WASD | D-pad / stick | ◀ ▶ |
| Jump (hold for higher) | Z / Space | A | A |
| Run (hold) / throw cannonball (tap) | X / Shift | X / B | B |
| Start / Pause | Enter | Start | START |
| Back (menus) / exit level when paused | Esc / X | Select | B |

## What's in it

- **Title screen & file select** – animated logo, 3 save slots (saved in your browser), high scores, sound toggle, erase file.
- **Wally Island overworld map** – walk between levels; clearing a level unlocks the next path.
- **8 levels**: Wally's Backyard (grassland), Cavern Commute (cave), Cloudtop Climb (sky), Static Fortress (castle + boss fight against **Baron Static**), Sunny Shoreline (beach with springboards), Frosty Peaks (slippery ice), Deep Dark Mine (cave), and Static Tower (the final rematch with a tougher Baron Static).
- **High score table** – when a run ends (game over or beating the game) a top-10 score lets you enter your name arcade-style (D-pad + A, or just type). Scores are kept in the browser; when the game runs as a claude.ai artifact they are also shared through its database for players allowed to save there.
- **Cannonballs** – tap B to throw a rolling cannonball that explodes on enemies, walls or when its fuse runs out, blasting nearby enemies and bricks (it can hurt the boss too). You start each life with 3; ammo crates (+3, max 9) sit along every level and in one bonus block per level. With the Signal Phone you fire sonic pings once the cannonballs run out.
- **Power-ups** from bonus `W` blocks: Energy Drink (+1 heart), Signal Phone (fire sonic pings), WallyMan Badge (1-UP), Super Charge battery (10 seconds of invincibility – touch enemies to flatten them, with its own music) and Jet Boots (double jump until you get hit).
- **Layered parallax backgrounds** – four to five scrolling layers per world (distant mountains, hills, bushes, crystals, stalactites, floating islands, banners, chains, sailboats, dunes and snowdrifts). 100 coins = extra life.
- **Enemies**: Grumbles (stompable), Prickles (spiky – don't stomp!), Buzzers (flying), Hoppers (jumping frogs), Flitter bats (swoop down from cave ceilings), Rhino-bots (charge when they spot you), Static Turrets (fire bolts), and **UFOs** that hover overhead, track you, flash a warning line and fire a laser beam down – stomp them or hold Up + B to lob a cannonball straight up.
- Checkpoint flags, Signal Tower goal posts, time bonus tally, moving platforms, lava, spikes.
- **Original chiptune soundtrack** synthesised live with the Web Audio API (pulse-wave lead, triangle bass, noise drums and an SNES-style echo) – separate themes for title, map, each world, the boss, plus jingles.

## Code layout

```
index.html          page + touch controls
js/font.js          5x7 pixel font
js/audio.js         music sequencer, songs and sound effects
js/sprites.js       pixel art for enemies, items, tiles and backgrounds
js/wally.js         WallyMan's animation rig: poses, cape physics, auto-outline
js/levels.js        level layouts (easy to edit – see the legend at the top)
js/game.js          engine: input, physics, enemies, scenes, HUD
assets/             pixelated WallyMan portrait used on the title/ending screens
```
