# WallyMan World

A 16-bit style side-scrolling platformer starring **WallyMan**, built in plain HTML5 + JavaScript (no installs, no build step).

## Play

Open `index.html` in any modern browser — or enable **GitHub Pages** for this repo (Settings → Pages → deploy from branch) and visit `/wallyman-world/`.

| Action | Keyboard | Gamepad | Touch |
| --- | --- | --- | --- |
| Move | Arrows / WASD | D-pad / stick | ◀ ▶ |
| Jump (hold for higher) | Z / Space | A | A |
| Run / fire Signal Ping | X / Shift | X / B | B |
| Start / Pause | Enter | Start | START |
| Back (menus) / exit level when paused | Esc / X | Select | B |

## What's in it

- **Title screen & file select** – animated logo, 3 save slots (saved in your browser), sound toggle, erase file.
- **Wally Island overworld map** – walk between levels; clearing a level unlocks the next path.
- **4 levels**: Wally's Backyard (grassland), Cavern Commute (cave), Cloudtop Climb (sky), Static Fortress (castle + boss fight against **Baron Static**).
- **Power-ups** from bonus `W` blocks: Energy Drink (+1 heart), Signal Phone (fire sonic pings with X), WallyMan Badge (1-UP). 100 coins = extra life.
- **Enemies**: Grumbles (stompable), Prickles (spiky – don't stomp!), Buzzers (flying), Hoppers (jumping frogs).
- Checkpoint flags, Signal Tower goal posts, time bonus tally, moving platforms, lava, spikes.
- **Original chiptune soundtrack** synthesised live with the Web Audio API (pulse-wave lead, triangle bass, noise drums and an SNES-style echo) – separate themes for title, map, each world, the boss, plus jingles.

## Code layout

```
index.html          page + touch controls
js/font.js          5x7 pixel font
js/audio.js         music sequencer, songs and sound effects
js/sprites.js       all pixel art (characters, tiles, backgrounds)
js/levels.js        level layouts (easy to edit – see the legend at the top)
js/game.js          engine: input, physics, enemies, scenes, HUD
assets/             pixelated WallyMan portrait used on the title/ending screens
```
