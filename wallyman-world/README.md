# WallyMan World

A 16-bit style side-scrolling platformer starring **WallyMan**, built in plain HTML5 + JavaScript (no installs, no build step).

**Current version: Update 1.2.** The update number shows on a ribbon under the title logo. It is set by `GAME_VERSION` at the top of `js/game.js`, and each new update adds 0.1 (1.1, 1.2, 1.3 and so on).

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

- **Saves on every device** – the game keeps each player's progress in their own browser. If a browser looks like it won't keep saves (for example a claude.ai link opened while signed out), the title screen says so, S shows a **save code** for each file, and quitting to the title offers one too.
- **Clockwork Kingdom** – an 11th island (clock train from the Underwater Kingdom): ride platforms on turning **gear wheels**, touch **rewind switches** to rebuild a crumbled bridge for a few seconds, dodge swinging **pendulums**, sneak through **The Vault**, use the jetpack and time clock in **Time Tower**, and face **the Clockmaker**, who throws rolling gears – stomp him when he lands to wind his key. The side level **Ninja Dojo** opens after The Vault.
- **Stealth levels** – guards sweep searchlights; if one spots you an **alarm** rings and extra foes drop in. Stomp guards from above. Finish a stealth level without an alarm for a trophy.
- **Ninja Nell** – a secret hero (beat Wally Island): hold Up against a wall to **climb** it, press S to **dash** through foes (no specials used, short cooldown), and crouch to **hide from searchlights**. Her pet is a fox.
- **Tornadoes and earthquakes** join the random weather: tornadoes lift you up and fling you, and quakes shake rocks loose from above (watch their shadows).
- **Jetpack and time clock** – the jetpack lets you fly for 5 seconds (hold Jump in the air); the time clock freezes foes and moving platforms for 5 seconds. Find them in the Clockwork Kingdom or craft them.
- **New mini-games** (Dino's House → Mini-Games): **Mini Golf** (9 holes with bumpers, pipes and Grumbles), **Pinball** (bosses for bumpers; Left/Right flip, hold A to launch), **Professor Hoot's Quiz** (10 questions about the game, free to play) and **Garden Defence** (stop 5 waves of Grumbles reaching the garden).
- **Dino's Kitchen** – grow carrots, tomatoes and pumpkins in the garden (or buy them in the kitchen) and cook a snack that powers up your next level: extra heart, shield, coin magnet, more cannonballs and specials, or a jetpack.
- **Crafting bench** – gears, springs, cloth and crystals turn up in most levels; craft a jetpack, time clock or bubble shield for your reserve box, or the Clockwork outfit.
- **Pet evolution** – pets now change their look as they level up (a collar, goggles, a crown) and at 30 XP evolve into their final form, which zaps a nearby foe every 8 seconds.
- **Mailbox** – a new letter from a game character each day you play, some with coins or gifts inside.
- **Photo Safari** – photograph creatures in photo mode to fill four pages; each finished page pays 25 coins.
- **Update 1.1 at a glance** – the first time a returning player opens the game after an update, a **What's New** list shows what changed; every update's list stays in **Extras → Updates**.
- **Storm Peaks** – a 9th island (rocket from Orbit One after Mega-Bot) under a permanent thunderstorm: Squall Slopes, **Lightning Rod Ridge** (lightning hits a rod and its platform crackles into life for a few seconds – watch for the "!" on the rod), **Wind Tunnel Pass** (updrafts lift you to high ledges and gusts push you back), **Frozen Lake** and the side level **Glacier Rink** (ice skating: in the air press B to spin, Up for a star jump or S for a triple axel, and chain them for a bigger combo – land before the move finishes or you wipe out), **Hail Hollow** (big hailstones drop where their shadows grow), and **King Thunderhead**, a crowned storm cloud who calls down lightning and blows you about – when he sinks low and puffs, bounce on his head.
- **Underwater Kingdom** – a 10th island (submarine from Storm Peaks): every level has an **air meter**, topped up in **bubble streams**; **currents** carry you along; **giant clams** open to show a pearl (+5 coins) and snap shut after a shake. The queen of the deep, **Serpentina**, swims in waves and charges at you – dodge so she hits a wall, then stomp her dizzy head.
- **Weather you can hear** – thunder that phone speakers can play, a rain hiss that grows into a downpour, gusting wind, and **puddle splashes** when you land in the rain. When the rain stops a **rainbow** appears, and sometimes a **rainbow coin trail** leads to a 1-UP. **Fog** and **hailstorms** join the random weather. In dark levels each **lightning flash shows hidden blocks and cracked walls** for a moment.
- **Phone buzzes** – on Android phones the game buzzes for hits, ground-pounds, nearby thunder and team blasts (iPhones do not let web pages vibrate). Options → RUMBLE turns it off.
- **New Game+ remix** – starting New Game+ now resets every island (not just the first three), shuffles which enemies appear where, and gives you the **Golden Hero** outfit.
- **Weekly Challenge** (Challenges) – three levels and one rule (Turbo, No Running, Backwards, Bouncy, Foggy, Hail, Moon, One Heart or Storm week), the same for everyone all week; beat all three in a row for your weekly best.
- **WallyMan's Diary** (Dino's House) – a funny diary page for each island you finish. **Statue Garden** (Dino's House) – a gold statue of every boss you have beaten.
- **Trophy cards** – in the Trophy Room press A on a trophy you have won to make a picture card; it goes into your Photo Album and is shared (phones) or downloaded.
- **Beat Tapper** – now plays along to any island's song. **Co-op boss battles** – in Boss Rematch press S for two players: one set of team hearts, and when both players press Special close together you land a **TEAM BLAST** on the boss.
- **Orbit One** – an 8th world (rocket from Dino Valley after the T-Rex): Orbit Dock, **Zero-G Lab** (float through purple zero-gravity rooms – tap jump to push off), **Airlock Alley** (doors cycle open and shut and pull you along), Solar Array and Reactor Core (laser gates switch on and off) and **Mega-Bot Bay** – stomp Mega-Bot's head when its hatch pops open.
- **The Glitch World** – a hidden 3-level world with odd physics (everything bounces, left and right swap, lag spikes rewind you). Rumour has it you get in by holding Down against the far-left wall at the start of Cavern Commute...
- **Kart Grand Prix** – three tracks (Wally Ring, Dune Oval, icy Frost Loop), ? item boxes (boost, banana, shield – S to use), quick races or a 3-race cup with points.
- **Pet Shop** (Dino's House) – adopt any hero's pet, or new ones you discover: Boo, Mini UFO, Parrot and Baby Rex. Each pet levels up its own tricks.
- **Costume Shop** (Dino's House) – Neon Nights, Pirate, Knight, Candy Pop and Galaxy outfits for every hero (Volt too), plus a secret Glitch outfit.
- **Level Maker tools** – undo/redo (menu, or U and Y keys), a fill tool and a line tool (menu → Tool), and Test From Here to try the course from the cursor.
- **Ghost Races** (Extras) – share your fastest run on any level as a code; a friend pastes it to race your ghost in Time Attack.
- **Speedrun** (Challenges) – a fresh file with one timer for the whole game, splits at every island and personal bests (Quick Run to Baron Static, or All Islands to Mega-Bot).
- **Island quests** – a quest giver on every island map asks you to find 3 lost things hidden in that island's levels, for coins and a 1-UP.
- **Fishing everywhere** – each island has its own fish (and rare catches); press S while fishing for the **Fish Log**.
- **Living world map** – drifting clouds, day and night from your clock, and island weather and wildlife.
- **Help Book** (Extras) – every move, attack, power-up, collectible and mode explained, with a little demo.
- **Titles** (Extras) – earn titles like Dino Tamer, Pirate King or Golden Ace from trophies; each file wears one, shown on the title screen and next to its high scores.

- **Dino Valley** – a 7th island (take the raft from Pirate Cove after Captain Gloombeard): Jurassic Jungle, **Stampede!** (a herd of dinosaurs chases you), **Pterodactyl Pass** (fly a pterodactyl through rocky pillars), Tar Pits, Fossil Cave and the **Rex Arena** – make the T-Rex charge into a wall, then stomp him while he's dizzy. New enemy: **Raptors**.
- **Completion** (Extras) – your percentage for levels, medals, stars and trophies. At 100 percent the secret **Signal Source** opens, where **Shadow Wally** copies your every move.
- **Mirror Mode** (Challenges) – every level flipped left to right with faster enemies (unlocks after Baron Static's tower).
- **Mech suit** – a walking robot from special blocks in some levels: stomps anything it touches, smashes brick walls, fires a laser with B and takes 3 hits before it breaks.
- **Trading cards** – enemies sometimes drop a card (and bosses always do); some are shiny. See them in Extras → Card Album.
- **Photo Album** – photos taken in Photo Mode are kept (10 at a time) to browse and download later.
- **Boss Rematch** (Extras) – refight any boss you have beaten, with a best time for each.
- **Theatre** (Extras) – rewatch the opening story, intro movie, comics, Doug's story scenes, the ending and the credits.
- **Music Maker** (Extras) – write a tune on a 32-step note grid, pick tempo, chords, drums, bass and sound, save up to 3 songs and set one as the music for a Level Maker slot.
- **Level Maker worlds** (Extras → Maker Worlds) – chain up to 5 courses into a mini world with its own map, and share the whole world with one code. Courses can now be **double length** (Maker menu → Length), and in Maker courses pressing Down on a pipe takes you to the matching pipe, so you can build sub-areas.
- **Party Mode** (Challenges) – up to 4 players (gamepads, with the computer filling empty seats) play Coin Grab, Last One Standing and Hot Potato.
- **Restart Level / Restart Checkpoint** in the pause menu, **captions** for every spoken line (Options), an **Oops screen** instead of a freeze if something goes wrong, and a **daily save backup** (Extras → Backups keeps the last 3 days).

- **Pirate Cove** – a 6th island (sail from Crystal Isle after beating the Crystal Dragon): **Shipwreck Shore**, **Cannon Deck** (cannonball volleys land where red markers flash), **Rising Tide** (the sea slowly floods the level and drains away again – swim up to high treasures), **Skull Cave** (dark) and the **Ghost Galleon**, where **Captain Gloombeard** vanishes, throws his cutlass, calls in cannon fire and can only be stomped while he rests on deck. New enemy: **Skelly Pirates**.
- **Roguelike Tower** (Challenges) – randomly built floors; after each one pick 1 of 3 upgrades (jet boots, extra hearts, magnet, shield, cannon pro, super special, speedy shoes, slow clock). One life – your best floor is saved.
- **Golden Levels** (Challenges) – once an island's castle is beaten, its levels can be replayed with 100 gold coins hidden all over them.
- **Tutorial** – the Training Grounds teach every move with signposts. New files are offered it on the map, and it's in Challenges too.
- **Volt is playable** after finishing Doug's Story – the fastest runner, with a **Lightning Dash** special that zaps through enemies.
- **Hero Maker** (Extras) – design your own hero: suit, cape and boots, skin, visor, hair style and colour, and a name. Pick them on the hero screen.
- **Hero quips** – now and then your hero says a short line out loud after a boss, a 1-UP or a clear (Options → Hero Quips).
- **Reserve box** – grab a power-up you don't need right now (an energy drink at full hearts, a second pair of jet boots...) and it is stored. Hold Up and press S to drop it in when you need it.
- **Garden** (Dino's House) – plant coin seeds, pet fruit and star seeds that grow over real hours; water once a day to speed them up. Star seeds grow rare hats (pirate hat, flower crown, viking helmet).
- **New mini-games** – Beat Tapper (tap on the beat to DJ Decibel's song), Snowball Fight and Whack-a-Grumble.
- **Airship fast travel** – press S on the map to fly to any island you have unlocked.
- **Pet tricks** (Dino's House → Pets) – pets level up as you clear levels: Fetch (wider coin grab), Sniff (barks near hidden blocks, cracked walls and buried treasure) and Guard (comes back 3x faster after saving you).
- **Level Maker** – slopes, fans, crates, pressure plates, pound plates, gates, mirrors, light beams and targets, crushers, glow crystals, every new enemy and a dark lantern mode.
- **Level of the Week** in Course World and **Cloud Save** in Dino's House (both need the Firebase settings).
- **Touch layout editor** (Options) – drag and resize the on-screen buttons. **Auto-run** and **One Button** modes make the game easier to play.
- **Boss phase 2** – Baron Static and the Motherships change form at half health with extra attacks, in the story and in Boss Rush.

- **Crystal Isle** – a 5th island (take the boat from the Lost Lands once the Sandworm is beaten): **Glitter Grotto** (pitch-dark caves lit only by your lantern, glowing crystals and crystal bugs, with wall-jump shafts), **Windy Cliffs** (strong gusts and fans that blow you up cliffs), **Slippery Slopes** (real slopes), **Toy Factory** (conveyor belts, springs, fans, crushers, toy soldiers and wind-up mice), **Magma Chase** (a wall of lava chases you from the left), **Beat Box Arena** and **Crystal Crown**.
- **New bosses** – **DJ Decibel**, whose every attack lands on the beat of his song (bass waves to jump, speaker blasts to stay under, falling notes; stomp him when his lid pops open on beat 4), and the **Crystal Dragon** (crystal-shard rain, swoops, and perches to rest – that's when you stomp it).
- **Wall-jump for everyone** – every hero can now slide down walls and kick off them (the Upgrade Tree's Wall Jump is free).
- **Bigger ground pound** – a shock ring that knocks out enemies further away, and orange **pound plates** that only a ground pound can press.
- **Slopes and belly slide** – hold Down on a slope (or while running) to slide on your tummy and bowl over enemies. Three at once earns a trophy.
- **Puzzle rooms** – three side rooms on Crystal Isle: push crates onto pressure plates, turn crystal mirrors (press Up while touching one) to bounce a light beam into a target, and ground-pound plates. Solving one opens the gate and awards all 3 stars. Press Up at the sign to reset a room.
- **Volt, the rival** – a speedy rival races you to the flag in some levels (a race bar shows who is ahead). Beat him for 20 coins.
- **Signposts and Professor Hoot** – a sign near the start of each level gives a tip; if you lose 3 lives in one level, Professor Hoot the owl turns up with a hint.
- **Bestiary** (Extras) – a page for every enemy and boss with a description and how many you have beaten.
- **Level radar** – in levels you have already beaten, a strip at the bottom shows the medals, signal bars and buried treasure you are still missing (switch it off in Options).
- **Replays** (Extras) – your fastest clear of each level is recorded and can be watched back (the 12 most recent are kept).
- **Best times and world leaderboards** – your best clear time per level shows on the map and in Extras → Leaderboards; with Firebase set up, the world top 5 per level appear too.
- **Doug's Story** (Challenges) – three new levels starring Doug Thomson with story scenes: race Volt, sprint through his vault, then beat him in a boss fight.
- **Survival Arena** (Challenges) – one room, endless waves of enemies, drinks every 3 waves. **Hard Remix** (Challenges) – meaner versions of the Wally Island levels with new looks, more enemies and less time.
- **Jukebox + sound test** – songs unlock as you hear them in the game; press left/right for a sound test of every effect.
- **Languages** – menus and common messages in English, Spanish, French or German (Options → Language).
- **Intro voice** – now and then, as the game starts, a voice says "WallyMan World, created by Claude and Doug Thomson. Enjoy the game." (uses your browser's built-in voices; switch it off in Options).
- **Kart race upgrade** – ramps that launch you into the air, karts that bump and take damage (a health bar shows over each one), and karts that explode when they take too much – then respawn a few seconds later.

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
- **New power-ups** (in ? blocks across the levels): the **Drill Helmet** (press Down on the ground to dig straight down – dig up **buried treasure chests**, look for the faint sparkle in the ground), the **Balloon Pack** (float upward for a few seconds and steer), **Giga Wally** (grow huge for 10 seconds, smashing blocks and flattening enemies) and the **Ghost Cloak** (go see-through and drift right through walls).
- **Combo meter** – chain enemy defeats quickly or without landing for score multipliers (x2, x3...). An x8 combo gives a 1-UP.
- **Wally Town** – a new stop on the Wally Island map (next to Wally's House). Walk around, enter buildings with Up and talk to people with A:
  - **NPC quests** – Mrs Mittens (find her lost kitty in Cavern Commute), Coach (beat Sunny Shoreline without getting hit), Old Salt (collect 150 coins), Board Bro (2000 trick points on Powder Peak) and the Gardener (stomp 25 Grumbles). Rewards are coins and lives; the **Quest Board** tracks them.
  - **My Home** – buy and place furniture: paintings, a clock, a trophy shelf, a hero poster, a sofa, a lava lamp, a plant, an arcade machine, an aquarium and rugs.
  - **Rides** – five special levels: **Powder Peak** (snowboarding downhill – hit the ramps for air, press B in the air to spin a trick, and grind on rails; land a spin badly and you wipe out), **Deep Sea Dive** (pilot a submarine, fire torpedoes with B, dodge mines, and fight the **Giant Squid**), **Haunted Express** (run along the roof of a speeding ghost train and hold Down to duck the tunnels), and **Rooftop Run** and **Neon Heights** in **Neon City** (night-time rooftops, cranes and window-cleaner lifts).
- **EX Boss Rush** – after beating the Static Emperor, Boss Rush gets an EX mode with all ten bosses, tougher and faster, and its own records.
- **Daily gift** – the first time you open the map each day you get coins; keep a 7-day streak for bigger gifts and a 1-UP.
- **Online ghost races** – with Firebase set up, your Time Attack records upload as world ghosts; press S on the Time Attack menu to race the world's best ghost for each level.
- **Credits** – roll after beating the Static Emperor (and any time from Extras), with every hero, friend, enemy and boss marching past.
- **Intro movie** – leave the title screen alone for about 25 seconds and a short animated story plays.
- **Boss music** – the UFOs, Ice Yeti, Ringmaster, Golem, Sandworm, Giant Squid and Static Emperor (and the mini-bosses) now have their own battle themes.
- **Colour assist and readable text** (Options) – HIGH CONTRAST, VIVID, RED-GREEN ASSIST and BLUE-YELLOW ASSIST colour filters, and a READABLE TEXT option that gives all text a bold outline.
- **Install as an app** – on the GitHub Pages site the game can be added to a phone's home screen or installed on a computer (Extras → INSTALL APP explains how). It gets its own icon and keeps working offline.
- **The Lost Lands** – a fourth island, reached by boat from Carnival Isle after beating the Ringmaster:
  - **Vine Temple** – climb vines (press Up), ride a **zipline**, dodge **dart traps**, get fired from a **barrel cannon** (press Jump to launch), then outrun a **giant rolling boulder**.
  - **Golem Sanctum** – **on/off switch blocks** (hit the switch to swap which coloured blocks are solid), then the **Stone Golem**, who slams the ground (jump the shockwaves) and throws rocks; stomp the glowing gem on its head while it is stunned.
  - **Dune Drift** – **sandstorms** that push you around, **quicksand** that slowly sinks you (mash Jump to struggle out), **cacti** that fire needles, and a **portal** pair.
  - **Sandworm Pit** – the **Sandworm** burrows after you, bursts out of the sand and spits sand balls; stomp its head while it is up.
  - **Lava Tower** and **Flood Tower** – vertical climbs, room by room, while lava or floodwater rises behind you. Underwater you can swim, but watch your air bubbles.
- **The Static Dimension** – a glitching secret world on the Lost Lands map, unlocked by finding **all 3 secret keys** and earning **25 stars**. It has **gravity-flip zones** (you fall upward and walk on the ceiling – press Jump to drop), switches, portals, ziplines, and the true final boss, the **Static Emperor**, who uses lightning strikes, a sweeping laser, ground-pound shockwaves and bouncing balls. Stomp him when he is dizzy.
- **Two more secret heroes**: **Dino** (unlock by beating Baron Static at the Static Tower) – B is a tongue-grab and holding Jump makes him flutter; and **Baron Static** himself (unlock by beating him in New Game+) – he hovers on static and his special zaps the three nearest enemies.
- **Versus mode** (Challenges) – **Race**: a split-screen dash to the goal with a progress bar; **Battle**: a one-screen arena where cannonball blasts and head-stomps knock hearts off your rival. Player 2 uses WASD + F G H or a second gamepad.
- **Course World** (Extras) – upload Level Maker courses (Maker menu → UPLOAD ONLINE), browse the newest or most-liked courses, play them and like them. This switches on with the same Firebase settings as the worldwide high scores (see the new `levels` rules in `firestore.rules`).
- **Save codes** – Dino's House → SAVE CODE gives a code with your whole save file; Extras → IMPORT SAVE loads it into any file on another device.
- **New mini-games** in Dino's House: **Fishing** (time your cast, hook on the bite, then hold A to reel while keeping the line tension in the green – look out for the Golden Carp) and a **Kart Race** around Wally Island against three rivals.
- **Photo mode** – pause → PHOTO MODE: place stickers (A), switch sticker (S), choose a frame (B), and press START to save a picture.
- **Seasonal events** – Halloween (pumpkins, bats and witch hats on Grumbles), Christmas (snowfall, Santa hats and presents instead of ? blocks) and WallyMan's birthday on 2 November (confetti and a cake). Options → EVENTS turns them off.
- **Assist mode** (Options → ASSIST): SLOW (75% speed), HEARTS (never run out of hearts, and a safe catch if you fall into a pit), WIDE (wider platforms and narrower gaps), or ALL.
- **Control remapping** (Options → CONTROLS) – press A on an action and then the key you want, or S and a gamepad button; RESET TO DEFAULTS puts everything back.
- **Changing weather** – outdoor levels (grassland, sky, beach, snow, candy, carnival and airship worlds) randomly switch between clear skies, **rain**, **thunderstorms** and **snow** every 15–30 seconds, with a banner and a weather icon in the corner. Thunderstorms darken the sky with lightning flashes at random moments, each followed **1 to 5 seconds later by thunder** (the longer the wait, the further away the lightning was, so the rumble is softer and deeper; close ones start with a sharp crack), and the odd **lightning bolt** that strikes near you (a yellow mark flashes on the ground first – move!). Snow **piles up on the ground** as it falls (each patch of ground fills up a little differently); deep snow makes walking slow and heavy, so jump, dash or ride Dino through it. Rain melts it, and cannonball blasts and Fire Dino's fireballs clear it away. Turn it off in Options → WEATHER.
- **Carnival Isle** – a third island, reached by ferry from Star Isle after beating the Mothership MK II (with a comic cutscene the first time you visit each new island):
  - **Funfair Midway** – ride rotating **Ferris wheel** gondolas and swing on grappling rings.
  - **Coaster Chaos** – hop in a **rollercoaster cart** that races along its track over huge gaps.
  - **Minecart Mayhem** – the cart never stops: jump the gaps and hold Down to **duck under low beams**.
  - **Mirror Maze** – purple **mirror zones** swap left and right.
  - **Asteroid Alley** – a **shoot-'em-up**: fly a jet (D-pad moves, B fires) through asteroids and UFOs.
  - **Big Top** – tightropes and trampolines, then the **Ringmaster** boss, who juggles bouncing balls, cracks his whip and leaps at you.
- **New enemies**: **Mimic blocks** that look like ? blocks until you get close, **Boomerang Bros**, **Magnet Drones** that pull you toward them, and **Splitter Slimes** that split in two when stomped.
- **Grappling hook** power-up – jump near a metal ring in mid-air to latch on, swing (left/right to pump), and press Jump to let go.
- **Secret keys and doors** – three keys are hidden in Cavern Commute, Gear Works and Coaster Chaos. Each unlocks a locked door on one of the maps, leading to a **Secret Room** packed with coins and 1-UPs.
- **Pets** – each hero has a little companion (a pup, a bat, a cat, a drone or a penguin) that follows you, grabs nearby coins and **takes one hit for you** (it comes back after 20 seconds). Toggle it in Options.
- **Dino's House** (Wally's House on the map) – **Dino's Shop**, the **Upgrade Tree** (Dash and Air Dash by double-tapping left/right, Wall Jump and Wall Climb for every hero, Heart+, Ammo+, Special+ and Pet Range), **Mini-games** (Lucky Dino Slots and Memory Match), **File Stats** (play time, enemies defeated, deaths, coins, bosses, favourite hero and more) and **New Game+**.
- **Medal Missions** – three goals per level (defeat a number of foes, grab a number of coins, finish without specials), shown on the level intro. Each new mission pays 10 coins; all three give a 1-UP.
- **New Game+** – after beating Baron Static, start again keeping your lives, coins, upgrades and hats; enemies are faster, there are more of them, and bosses take extra hits.
- **Endless Run** (Challenges) – a new random course every run that scrolls faster and faster, with a longest-runs table.
- **Star Isle weather** – ash storms on Molten Peak and meteor showers on Moon Base (watch for the red warning marks).
- **Art Gallery** (Extras) – eight concept-art scenes unlocked as you earn trophies.
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
- **Trophies** – 87 achievements (first clear, flawless boss, Dino rider, UFO hunter, secret exits, three stars and more) with pop-up notifications and a **Trophy Room**.
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
- **Weather** – wind gusts that shove you around in Cloudtop Climb, passing rain showers on the beach and a thunderstorm over the Haunted Manor, whose lightning flashes are followed by thunder a few seconds later.
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

With those set the table title reads **WORLD HIGH SCORES**, and the per-level world leaderboards fill in. Without them (or offline) scores are kept on each device. The claude.ai artifact version cannot reach outside services, so it keeps its own table.

## Tip jar (Ko-fi)

Put your Ko-fi page name in `js/online-config.js` (`window.WALLYMAN_KOFI = 'yourname';`) and a shiny, gently pulsing **TIP JAR** button appears in the corner of the title screen. Clicking or tapping it opens `https://ko-fi.com/yourname` in a new tab. Leave it empty to hide the button.

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
js/batche.js        Carnival Isle, new enemies, pets, upgrades, Dino's House, mini-games, missions, Endless Run, art
js/batchf.js        Lost Lands, Static Dimension, vines, ziplines, cannons, portals, towers, new bosses and heroes, events, assist
js/batchf2.js       photo mode, versus, fishing, kart racing, Course World, save codes, options and controls
js/batchg.js        new power-ups, rides, combo meter, Wally Town, EX rush, daily gifts, world ghosts, credits, intro movie
js/batchh.js        slopes, fans, wall-jump for all, puzzles, lava chase, dark caves, new enemies and bosses, the rival, signs, arena/remix/replay modes
js/batchh2.js       Crystal Isle levels and map, puzzle rooms, Doug's story, bestiary, replays, leaderboards, radar
js/batchh3.js       menus, jukebox + sound test, languages, intro voice, kart race
js/batchi.js        Pirate Cove levels, tide, volleys, Gloombeard, tower floors, gold mode, tutorial, Volt + hero maker heroes, reserve box, pet tricks, boss phase 2, quips
js/batchj.js        Dino Valley, Shadow Wally, mirror mode, mech suit, cards, restarts, captions, backups, Maker pipes, Music Maker songs
js/batchk.js        Orbit One, the Glitch World, island quests, pets, outfits, speedrun timer, titles, save warning
js/batchk2.js       Orbit One map, quest givers, pet/costume shops, Kart Grand Prix, ghost races, speedrun, fishing, living map, help book, titles
js/batchl.js        Update 1.1: weather sounds, rainbows, fog, hail, lightning reveals, phone buzzes, New Game+ remix, What's New, diary, statues, trophy cards, weekly challenge, Beat Tapper songs, co-op bosses
js/batchl2.js       Update 1.1: Storm Peaks and the Underwater Kingdom (levels, bosses, maps) and the updated menus
js/batchm.js        Update 1.2: tornadoes, earthquakes, jetpack, time clock, stealth guards, Ninja Nell, the Clockwork Kingdom and the Clockmaker
js/batchm2.js       Update 1.2: mini golf, pinball, quiz, Garden Defence, kitchen, crafting, pet evolution, mailbox, Photo Safari, menus
js/batchj2.js       Dino Valley map, completion, mirror/rematch menus, card and photo albums, theatre, Music Maker, Maker worlds, Party Mode
js/batchi2.js       Pirate Cove map, airship, tower/gold menus, garden, pets, mini-games, hero maker, cloud save, Level of the Week, touch editor, Level Maker parts
manifest.webmanifest, sw.js, icons/   install-as-an-app support (works offline)
assets/             pixelated WallyMan, GothChick and Doug Thomson portraits (title, character select, ending)
```
