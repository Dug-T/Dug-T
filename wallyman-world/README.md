# WallyMan World

A 16-bit style side-scrolling platformer starring **WallyMan**, built in plain HTML5 + JavaScript (no installs, no build step).

## Play

Open `index.html` in any modern browser — or enable **GitHub Pages** for this repo (Settings → Pages → deploy from branch) and visit `/wallyman-world/`.

| Action | Keyboard | Gamepad | Touch |
| --- | --- | --- | --- |
| Move | Arrows / WASD | D-pad / stick | ◀ ▶ |
| Climb off Dino | Down + Jump | Down + A | ▼ + A |
| Swim (underwater) | Jump, repeatedly | A | A |
| Ground-pound | Down in mid-air | Down in mid-air | ▼ in mid-air |
| Dino flutter | Hold Jump while falling on Dino | Hold A | Hold A |
| Jump (hold for higher) | Z / Space | A | A |
| Run (hold) / throw cannonball (tap) | X / Shift | X / B | B |
| Special attack | C | Y / LB / RB | S |
| Start / Pause | Enter | Start | START |
| Back (menus) / exit level when paused | Esc / X | Select | B |

## What's in it

- **Title screen & file select** – animated logo, 3 save slots (saved in your browser), high scores, sound toggle, erase file.
- **Wally Island overworld map** – walk between levels; clearing a level unlocks the next path.
- **8 levels**: Wally's Backyard (grassland), Cavern Commute (cave), Cloudtop Climb (sky), Static Fortress (castle + boss fight against **Baron Static**), Sunny Shoreline (beach with springboards), Frosty Peaks (slippery ice), Deep Dark Mine (cave), and Static Tower (the final rematch with a tougher Baron Static).
- **Ice Yeti mid-boss** halfway through Frosty Peaks: the screen locks while it stomps around, throws snowballs and freezes you with ground-shaking leaps. Three hits (stomps, cannonball blasts or Dino chomps).
- **Secret exits and bonus worlds** – hidden purple doors in Cavern Commute, Sunny Shoreline and Frosty Peaks open paths across the sea to three bonus levels (all three also open after you beat the game):
  - **Haunted Manor** – pitch dark except for a pool of light around WallyMan, lightning flashes and ghosts that fade in and out.
  - **Coral Depths** – underwater: press Jump to swim, with fish, jellyfish and coral walls.
  - **Sky Armada** – an auto-scrolling airship level (don't get squashed by the screen edge) ending in a fight with the **UFO Mothership**, which sweeps a pink laser, drops bombs and launches mini UFOs.
- **Star Isle** – once you've cleared Haunted Manor, a rocket on the Wally Island map blasts you to a second island with four new worlds:
  - **Molten Peak** – a volcano with lava pools and lava blobs that leap out of them.
  - **Gear Works** – a factory full of **conveyor belts** that carry you left and right.
  - **Candy Cove** – lollipops, candy-cane peaks and plenty of springboards.
  - **Moon Base** – **low gravity** (floaty, extra-high jumps) and a final showdown with the **Mothership MK II**.
- **Signal Bars** – three per level, tucked away in the highest nooks. They're saved when you clear the level and shown in the HUD; collect all three for **FULL SIGNAL**: +3 specials, a 1-UP and a trophy.
- **Time Attack ghost** – your best run in each level is recorded, and a see-through ghost of it races you next time.
- **Level Maker** (Extras → Level Maker) – build your own 120-tile course in any of the 13 themes, with every block, hazard, enemy and item. D-pad moves the cursor, A places (hold to paint), B erases, S picks the next item (B+S the previous one), START opens the menu (Play Test, Save, Theme, Clear All, Save and Exit). Three courses are kept on your device, and play-testing drops you straight back into the editor. New tools: **water zones** (swim inside them), **dark zones**, a **boss at the end** (any boss or mini-boss), **COPY AREA** then paste with A, and **share codes**: SHARE CODE shows a short text code to send to friends, LOAD CODE plays theirs.
- **Beam-down aliens** – UFOs now shine a green tractor beam and drop little alien troopers that land, chase you and hop; stomp them like any enemy. Each UFO keeps up to 2 aliens around (3 on Star Isle).
- **Busier Star Isle** – Molten Peak, Gear Works, Candy Cove and Moon Base now have about twice as many enemies, 3–4 UFOs each, an alien squadron, and extra power-up blocks (Bubble Shield, Coin Magnet, Shrink Ray, Super Charge, Jet Boots, drinks and a 1-UP).
- **Zappling Squadron** – an alien formation is waiting right at the start of Wally's Backyard, and hovers over Cloudtop Climb, Sky Armada and Moon Base. It marches side to side, steps down each time it reaches an edge, speeds up as you thin it out and drops zig-zag bolts. Stomp them, lob cannonballs up (Up + B), use pings, bats, Dino fire or specials; clearing the whole squadron pays 2000 points and 5 coins. You can place squadrons in the Level Maker too.
- **Five heroes** – WallyMan, GothChick and Doug Thomson, plus two **secret heroes**: **Robo-Wally** (hover jets; unlock by collecting 20 Signal Bars) and **Frost Queen** (glides, Deep Freeze special; unlock by beating the Mothership MK II). The hero select scrolls with left/right.
- **2 players together** – choose **2P TOGETHER** after picking a file: both heroes are on screen at once. Player 2 uses **W A S D** to move, **F** to jump, **G** to run/throw and **H** for specials (or a second gamepad). You can bounce off each other's heads; if player 2 goes down they pop back in next to player 1 for one shared life.
- **New power-ups** from bonus blocks: **Coin Magnet** (pulls in nearby coins and items), **Shrink Ray** (tiny hero for 15 seconds – fit through one-tile gaps) and **Bubble Shield** (blocks one hit). Hidden blocks now hold a sliding **1-UP mushroom**.
- **Ice Dino** in Frosty Peaks – B breathes frost that freezes enemies into ice blocks you can stand on, or kick into other enemies.
- **Warp pipes** – press Down on the green pipe in Wally's Backyard or Sunny Shoreline to skip ahead two levels.
- **Boss cutscenes** – each boss and mini-boss has a short talk before the fight, with your hero's portrait (START skips).
- **Day and night** – the island map gets darker the longer you play. Levels started at night are darker, have fireflies and extra ghosts, and coins count double.
- **Challenges menu** (title screen): **Time Attack** (now with checkpoint and finish **splits** against your best run), **Boss Rush** (all six bosses back to back with a timer, splits and a best-times table) and the **Daily Challenge** (one level a day with a random rule such as Moon Gravity, Turbo Enemies, One Heart, Tiny Hero or Lights Out, plus today's score table).
- **Sticker Book** (Extras) – a sticker for every kind of enemy and boss you beat and every kind of secret you find.
- **Hat Stand** in Dino's Shop – party hat, cowboy hat, top hat, propeller cap, gold crown and halo, drawn on any hero.
- **Rumble** – gamepads rumble (and phones buzz when playing by touch) on hits, explosions and boss damage; toggle it in Options.
- **Three heroes** – after choosing a file, pick your hero on the **CHOOSE YOUR HERO** screen: **Doug Thomson** (bald, blue glasses, black tee and jeans) – the fastest runner, who can **slide down and jump off walls** and whose special, the **Pause Button**, freezes every enemy for 5 seconds so they are harmless and can all be stomped; **WallyMan**, the caped all-rounder, or **GothChick** (pink and purple pigtails, black halter dress, black boots) who jumps higher, runs a little slower, can **glide** by holding Jump in the air, and has her own special attack: the **Bat Swarm**, three homing bats that seek out enemies, UFOs and bosses. Both get every move, Dino rides and costume.
- **Special attacks** – on their own button (S / C key). WallyMan's **Signal Shockwave** blasts a ring of signal from his phone that knocks out every enemy around him, destroys incoming bolts, snowballs and bombs, and hurts bosses; GothChick's **Bat Swarm** sends three homing bats. Each hero starts every level or life with **3 specials**; glowing **Special Orbs** (two per level) give +3, up to 9.
- **2-player mode** – pick "2 PLAYER GAME" after choosing a file. Players take turns on the same device: **WallyMan** and **Wally Jr** (green suit) share the island map and progress but have their own lives, score and coins. The turn passes after each level and each lost life; if one player runs out of lives the other carries on.
- **Time Attack** – from the title menu, race any level you have beaten (in any save file) with no time limit and unlimited instant retries. Best times are saved, with a NEW RECORD! fanfare.
- **Costumes** – visit the **Wardrobe** in Dino's Shop at Wally's House. Seven outfits: Classic, Wally Jr, Golden (find 20 Wally Medals), Ice (clear Frosty Peaks), Dino Suit (clear Coral Depths), Shadow (clear Haunted Manor) and Fire (beat Baron Static).
- **Difficulty** (Extras → Options): Easy (3 hearts, 50% more time, slower enemies, weaker bosses), Normal, or Hard (1 heart, less time, faster enemies, tougher bosses).
- **Star rankings** – up to 3 stars per level: finish with 40% of the time left, have all 5 medals, and take no hits. Stars show on the clear screen, the map and the level intro.
- **Trophies** – 27 achievements (first clear, flawless boss, Dino rider, UFO hunter, secret exits, three stars and more) with pop-up notifications and a **Trophy Room**.
- **Extras menu** – Trophy Room, **Jukebox** (play every song), **Gallery** (heroes, enemies, bosses and items) and **Options** (difficulty, music/sound volume, sound on/off, **CRT retro-TV filter**, screen shake).
- **Hidden secrets** – an invisible block in most levels (jump into empty air to find a 1-UP) and cracked walls that crumble into coins when blasted, chomped, shocked or ground-pounded.
- **High score table** – when a run ends (game over or beating the game) a top-10 score lets you enter your name arcade-style (D-pad + A, or just type). Scores are kept in the browser; when the game runs as a claude.ai artifact they are also shared through its database for players allowed to save there.
- **Cannonballs** – tap B to throw a rolling cannonball that explodes on enemies, walls or when its fuse runs out, blasting nearby enemies and bricks (it can hurt the boss too). You start each life with 3; ammo crates (+3, max 9) sit along every level and in one bonus block per level. With the Signal Phone you fire sonic pings once the cannonballs run out.
- **Power-ups** from bonus `W` blocks: Energy Drink (+1 heart), Signal Phone (fire sonic pings), WallyMan Badge (1-UP), Super Charge battery (10 seconds of invincibility – touch enemies to flatten them, with its own music) and Jet Boots (double jump until you get hit).
- **Dino** – WallyMan's rideable dinosaur pal hatches from one bonus block in every level and hops down to you. Touch him to climb on: you jump higher, can stomp anything (even spiky Prickles), and tap B to have Dino chomp whatever is in front of him (enemies, bricks, even the boss). Get hit and you're thrown off without losing a heart while Dino runs away – chase him to climb back on. Down + Jump hops off.
- **Ground-pound** – press Down in mid-air to slam down: it squashes any enemy (even spiky ones), knocks out nearby enemies with a shockwave, smashes bricks and hits blocks from above. Dino can do it too, and holding Jump while falling on Dino makes him flutter.
- **Wally Medals** – five hidden in every level, usually up high on blocks and ledges. They are saved when you clear the level, shown under each level on the map, and finding all five gives a 1-UP.
- **Dino's Shop** at Wally's House on the map – spend coins on an extra life, +3 cannonballs, full hearts or Jet Boots for your next level.
- **Story intro** when you start a new file, and a **pause menu** with music and sound-effect volume.
- **Three Dinos** – teal Dino (chomps), **Fire Dino** (red; B spits bouncing fireballs) in the castles and the mine, and **Sky Dino** (blue, with wings; hold Jump to fly for a moment) in Cloudtop Climb and Sky Armada.
- **Mini-bosses** with locked arenas: **King Krabby** the giant crab (Sunny Shoreline – claw dashes and shockwave leaps), **Drill Mole** (Deep Dark Mine – burrows, erupts under you and throws rocks; hit it while it is above ground) and **Nimbus** the cloud dragon (Cloudtop Climb – swoops and rains lightning).
- **Weather** – wind gusts that shove you around in Cloudtop Climb, passing rain showers on the beach and a thunderstorm over the Haunted Manor.
- **Layered parallax backgrounds** – 12 to 15 scrolling layers per world (snowy far mountains and birds, rainbows and hot-air balloons, lighthouses, auroras, castle towers, graveyards, sun rays and kelp, an erupting volcano, a city skyline and cranes, gumdrop hills and chocolate rivers, ringed planets and shooting stars, and more). Earlier layers include (distant mountains, hills, bushes, crystals, stalactites, floating islands, banners, chains, sailboats, dunes and snowdrifts). 100 coins = extra life. Losing a life resets your coins to 0.
- **Enemies**: Grumbles (stompable), Prickles (spiky – don't stomp!), Buzzers (flying), Hoppers (jumping frogs), Flitter bats (swoop down from cave ceilings), Rhino-bots (charge when they spot you), Static Turrets (fire bolts), and **UFOs** that hover overhead, track you, flash a warning line and fire a laser beam down – stomp them or hold Up + B to lob a cannonball straight up.
- **A tight timer** in real seconds: about 1.8x the time it takes to walk straight to the end (60–65s per level, extra for boss castles). A HURRY UP warning sounds at 20 seconds and the last 10 tick down; leftover seconds are worth 100 points each.
- Checkpoint flags, Signal Tower goal posts, time bonus tally, moving platforms, lava, spikes.
- **Original chiptune soundtrack** synthesised live with the Web Audio API (pulse-wave lead, triangle bass, noise drums and an SNES-style echo) – separate themes for title, map, each world, the boss, plus jingles.

## Worldwide high scores (Firebase)

The GitHub Pages version can share one high-score table with everyone through a free Firebase project:

1. At [console.firebase.google.com](https://console.firebase.google.com) create a project (Analytics not needed).
2. **Build → Firestore Database → Create database** (production mode, any location).
3. In Firestore's **Rules** tab, paste the contents of [`firestore.rules`](firestore.rules) and **Publish**. Anyone can read and add scores; nobody can edit or delete them, and only valid-looking scores are accepted.
4. **Project settings → Your apps → Web (`</>`)**, register an app, then copy `projectId` and `apiKey` into [`js/online-config.js`](js/online-config.js).

With those set the table title reads **WORLD HIGH SCORES**. Without them (or offline) scores are kept on each device. The claude.ai artifact version cannot reach outside services, so it keeps its own table.

## Tip jar (Ko-fi)

Put your Ko-fi page name in `js/online-config.js` (`window.WALLYMAN_KOFI = 'yourname';`) and a **TIP JAR** button appears in the corner of the title screen. Clicking or tapping it opens `https://ko-fi.com/yourname` in a new tab. Leave it empty to hide the button.

## Code layout

```
index.html          page + touch controls
js/font.js          5x7 pixel font
js/audio.js         music sequencer, songs and sound effects
js/sprites.js       pixel art for enemies, items, tiles and backgrounds
js/wally.js         WallyMan's animation rig: poses, cape physics, auto-outline
js/levels.js        level layouts (easy to edit – see the legend at the top)
js/online-config.js Firebase settings for the worldwide high-score table
firestore.rules     security rules to paste into Firebase
js/game.js          engine: input, physics, enemies, scenes, HUD
js/maker.js         the Level Maker editor
js/extra.js         challenges, cutscenes, splits, day/night and 2-player co-op
assets/             pixelated WallyMan, GothChick and Doug Thomson portraits (title, character select, ending)
```
