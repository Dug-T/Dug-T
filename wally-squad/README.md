# Wally Squad

A 3D real-time strategy game for the browser, in the style of the classic base-building RTS games. You build a base, harvest crystal, raise an army and wipe out the enemy faction.

Play it by opening `wally-squad/index.html` from any web server (GitHub Pages works). Nothing needs installing: Three.js is bundled in `lib/`, and every model, texture and sound is generated in code.

## Game modes

- **🎓 Boot Camp:** an interactive tutorial. Step by step, it teaches you to move the camera, select and move troops, build a Power Plant, Refinery and Barracks, train riflemen, use an APC and attack an outpost. Each step shows mouse or touch instructions.
- **Campaign:** five story missions in which the hero **Wally Man** leads the squad against the Grimlock Warlord. Every mission lets you train infantry and vehicles, and every mission is lost if Wally Man falls. Each mission has a briefing, objectives and scripted events, and completing one unlocks the next.
  1. **First Contact** – a small field base and a strike team. Destroy an outpost and keep Wally Man alive.
  2. **Hold the Line** – fortify Frostbite Pass against seven waves until reinforcements arrive.
  3. **Crystal Rush** – out-harvest the enemy in the Dune Sea and burn down its refineries.
  4. **Lights Out** – at night, cut the enemy's power so its Plasma Towers go dark, then finish the fortress.
  5. **The Warlord** – a full base battle against a Doom Missile silo.
  6. **Into the Fire** – cross the Magma Rift, find the cloaked Shade tanks and defeat Warlord Grak in his fortress.
- **👹 Grimlock campaign** (Campaign menu): switch sides and lead **Warlord Grak**, who must survive every mission.
  1. **Raid on Crystal Valley** – burn down a Wally Squad outpost.
  2. **Night of the Shades** – use cloaked Shade tanks to destroy every Comms Center on Midnight Ridge within 8 minutes.
  3. **Grak's Revenge** – defeat Wally Man himself and raze the Wally Squad fortress in Frostbite Pass.
  - It has its own progress track and a medal for finishing it.
- **Survival:** endless enemy waves that grow stronger each time, with a boss every 5th wave. The game keeps your best score and wave for each map.
- **Skirmish:** choose a map, your faction and the difficulty, and turn the day–night cycle and dynamic weather on or off.
  - Skirmish options: switch superweapons, support powers, supply crates, tech buildings, fog of war and starting armies on or off, and choose the starting money ($2,500–$15,000).
- **🎖 Commander Profile** (main menu): every game earns XP for taking part, winning, kills and buildings, scaled by difficulty. Climb nine ranks from Private to Field Marshal. The profile also tracks career games, wins, kills and time played, and the end screen shows the XP earned and any promotion.
- **📅 Daily Challenge** (main menu): everyone gets the same map, faction and two mutators for the day, on Commander difficulty. Win as fast as you can; the game keeps your best time for the day.
- **🎲 Mutators** (skirmish menu): Turbo Build, Crystal Rush (double crystal value), Glass Cannons (+75% damage), Boots Only (no vehicles except Harvesters and APCs), Veteran Armies and Crate Rain.
- **Game over:** in every mode you lose as soon as **all your buildings are destroyed** (walls, gates and mines don't count). Destroy every enemy building to win.
- **Online battle:** 1 v 1 against a friend. One player hosts and shares a 5-letter room code; the other joins with it.
- **Unit Designer:** invent your own infantry and vehicles:
  - Pick a weapon, chassis (tracks, wheels or hover), size, armour, speed, colours and looks (hats, glasses, capes and more).
  - Watch a live 3D preview.
  - Saved designs appear in the Barracks and War Factory build menus in every mode. Online games use the host's designs.
- **Map Editor:** design your own battlefield.
  - Place and drag the two bases, green and blue crystal fields, lakes and roads.
  - Pick a theme (green, snow, desert or night) and adjust mountains and forests.
  - Roll new terrain, or mirror one side so the map is fair.
  - A live preview shows the result. Saved maps appear in the Skirmish, Survival and Online map lists, and online games send the host's map to the other player.
- **Voice Studio:** record your own voice lines for every unit, including your own designs.

## Factions

| | Wally Squad | Grimlock Legion |
|---|---|---|
| Exclusive units | Titan Tank, Field Medic, Wally Man (caped Gatling gunner), Wally (hero sniper) | Shade Stealth Tank, Inferno flame tank |
| Superweapon | **Sky Lance** – an orbital energy lance | **Doom Missile** – a ballistic warhead with a mushroom cloud |

Both factions share the basic army: riflemen, rocket troopers, Scorchers, engineers, buggies, tanks, artillery, harvesters and Hornet gunships.

## Features

- **Maps:** Crystal Valley (temperate), Frostbite Pass (snow), Dune Sea (desert, with palms and cacti) and Midnight Ridge (permanent night). Each has its own layout, colours, trees and weather.
- **Day–night cycle:** at night, vehicles switch on headlights and base searchlights sweep the ground. Sight range drops in the dark.
- **Weather:**
  - Rain and storms (with lightning) slow vehicles, and the ground looks wet.
  - Fog cuts sight range.
  - Snow and blizzards slow vehicles and cut sight range.
  - Sandstorms cut sight range.
- **Base defence:**
  - Walls: drag to lay a whole line.
  - Gates open for your own units and block the enemy.
  - Mines are invisible to the enemy.
  - Gun Turrets, SAM Sites and Plasma Towers.
- **Superweapons:** each one charges up with a countdown, shown in the sidebar for both sides. The computer opponent uses its superweapon too.
- **Stealth:** Shade tanks are invisible until they fire or an enemy gets close.
- **Unit voices:** record your own lines (up to 3 takes per line), or let the computer voice play. Voice packs can be exported and imported so you can swap them with friends.
- **Landscape only on phones and tablets:** websites can't stop a phone from rotating the page, so when the phone is held upright the whole game is drawn turned 90°. It stays horizontal whichever way you hold the phone, and taps are translated to match. **⛶ Fullscreen** (top bar) hides the browser bars and, on phones that allow it, also locks the screen to landscape.
- **Support powers:** once you have the right buildings, they recharge and appear above the build tabs.
  - 📡 **Recon Sweep** (needs a Comms Center) reveals an area for 20 seconds.
  - 🪂 **Paradrop** (needs a Barracks and Comms Center) drops 7 troopers by parachute.
  - ✈ **Airstrike** (needs a Helipad) sends bombers to carpet-bomb a line.
  - The computer opponent uses them too.
- **Medals:** 18 achievements, from First Blood to beating the Warlord or surviving 20 waves. They pop up as you earn them, and the **🎖 Medals** screen lists them all.
- **Research (TECH tab):** one-off upgrades.
  - Composite Armour: vehicles get +25% health.
  - Body Armour: infantry get +25% health.
  - Depleted Shells: all your units and defences do +20% damage.
  - Crystal Refining: +25% income.
  - Turbo Engines: vehicles are 15% faster.
  - Long-Range Optics: +20% sight and range.
  - The computer opponent researches them too.
- **👹 Warlord Grak** (Grimlock hero, Barracks + Comms Center, one at a time): a hulking brute with a rotary rocket cannon. **War Cry** (`G`) makes every Grimlock fighter within 13 m fire much faster for 6 seconds. The computer uses heroes' abilities too.
- **💬 Enemy taunts:** the enemy commander (Warlord Grak, or Commander Wally when you play the Grimlocks) taunts you during skirmishes and campaigns. Taunts come at the start, when you destroy their buildings or they destroy yours, when a hero falls and when they're nearly beaten. They are spoken aloud, with at least 35 seconds between them.
- **🎆 Victory celebration:** win and fireworks burst over the battlefield while your infantry jump for joy.
- **🕹 Cheat codes** (type them into the box in the pause menu; single player only, and a cheating game earns no XP or medals): `WALLYCASH` (+$10,000), `SHOWMETHEMAP`, `INSTABUILD`, `BIGBOOM` (superweapon charged), `POWERUP` (support powers ready), `GODMODE` (your forces can't be hurt) and `HEROES` (a hero and a Titan arrive).
- **🎨 Army colours** (Skirmish, Survival and Sandbox menus): paint your side Blue, Red, Green, Purple, Gold, Orange, Teal, Pink or Steel. Your choice is remembered. If you pick a colour close to the enemy's, they switch to your faction's usual colour so the sides stay easy to tell apart.
- **🔁 Repeat production:** a toggle above the Infantry, Vehicles and Air build menus. Each finished unit is queued again, so a factory keeps pumping out your army.
- **🧙 Grimlock Shaman** (Grimlocks only): a hooded healer with a glowing skull staff who heals nearby infantry, like the Field Medic.
- **☄ Meteor showers:** the Natural Disasters mutator now also rains burning meteors on the battlefield every couple of minutes, with a warning first.
- **📱 Works on more phones:** older phones that don't understand import maps (e.g. iPhones before iOS 16.4) now load the game thanks to the small MIT-licensed [es-module-shims](https://github.com/guybedford/es-module-shims) script in `lib/`. If a device really can't run the game (no WebGL, a failed download, or a very slow load), the loading screen explains why and what to try instead of hanging.
- **🎯 Hero Hunt** (Skirmish → Battlefield option): both sides start with their champion beside the Construction Yard - Wally Man for the Wally Squad, Warlord Grak for the Grimlocks - wearing a spinning gold crown and with double health. If your champion falls, you lose; take out theirs to win. The AI keeps its champion safe at home. Win one for the **Headhunter** medal.
- **⚡ Blink Trooper** (Wally Squad only, Barracks + Comms Center): with a glowing visor and a teleport ring on his back, he blinks instantly to wherever you send him (up to 45 m, then 10 s to recharge) and fires a laser rifle.
- **🕳 Tunnel Drill** (Grimlocks only, War Factory + Comms Center): an armoured mole-machine with a giant spinning drill. It sinks underground while it moves - nothing can see or hit it, only a trail of dust - then bursts up to drill into vehicles and buildings.
- **🏴 Scottish Wally Man:** Wally Man is now Scottish! New lines like "Gie it laldy!", "Nae bother, Wally Man is oan it!" and "Away an bile yer heid, Grimlocks!". He uses a Scottish voice on devices that have one (e.g. Apple's Fiona), otherwise the clearest voice available, still pitched up for a squeaky superhero sound. Select him in the rain and he'll tell you: *"It's pishing doon!"* (and in the snow, sometimes: *"It's Baltic oot here!"*).
- **🏞 Highland Glen** (new map): a misty Scottish glen of purple heather, pines and dark lochs, with shaggy ginger Highland cows. Usually raining. Win there for the **Braveheart** medal (also a 🏴 Highland theme in the Map Editor).
- **🎵 Bagpiper** (Wally Squad) and **🥁 War Drummer** (Grimlocks) (Barracks + Refinery): unarmed musicians - every friendly unit within earshot fires **25% faster**. Music notes float up from them and you hear a few bars now and then.
- **🎶 Highland Charge:** a new bagpipe battle tune with drones and grace notes joins the soundtrack.
- **🌸 Blossom Gardens** (new map): peaceful spring gardens of pink and white cherry blossom around four koi ponds, with petals drifting on the breeze. Win there for the **Petal Power** medal (also in the Map Editor as a 🌸 Blossom theme).
- **🪨 Bone Catapult** (Grimlocks only, War Factory + Comms Center): a creaking wooden siege engine decorated with skulls. Its arm whips forward to hurl flaming boulders a very long way - great against buildings, useless up close.
- **🛡 Shield Projector** (Wally Squad only, War Factory + Comms Center): an unarmed truck with a glowing dish that projects a shimmering energy bubble. Your units inside it take 40% less damage, and the bubble flashes as it soaks up hits.
- **🗣 Clearer Wally Man:** Wally Man now speaks with the clearest male voice your device has (e.g. Google UK English Male, Daniel, Arthur or Microsoft Ryan) at full volume - pitched right up into a funny, squeaky superhero voice - and the music dips while he talks. Novelty voices some phones list as English (Bubbles, Trinoids, Bad News, Whisper...) are never used for any unit.
- **🕵 Spy** (both sides, Barracks + Comms Center): enemy troops and defences ignore him unless he walks right up to them - but Attack Dogs sniff him out. Send him into an enemy building: a **Refinery or Construction Yard** to steal half their cash (up to $2,500), a **Power Plant** to black out their power for 40 seconds, or a **Comms Center, Tech Lab or superweapon** to reset their support powers and superweapon. The AI sends spies too. Earns the **Double Agent** medal.
- **🌌 Night sky:** the northern lights shimmer over the snow maps at night, and shooting stars streak overhead on clear nights.
- **🤖 Wally Mech** (Wally Squad only, War Factory + Tech Lab): a towering two-legged battle walker with twin shoulder cannons. Its legs stride and stomp up dust as it walks.
- **👹 Cave Troll** (Grimlocks only, Barracks + Tech Lab): a huge grey-green troll with a spiked tree-trunk club. Each swing smashes everything around its target, and it slowly heals its own wounds. Destroy a Mech or Troll for the **Giant Slayer** medal.
- **⛈ Lightning strikes:** during thunderstorms, real bolts now hit the ground near troops, hurting anything close and knocking down trees.
- **🌋 Volcanic eruptions:** on Magma Rift the volcano erupts every couple of minutes, raining lava bombs around one of the lava pools.
- **📜 Update numbers & What's New:** the game now has a version number (currently **v1.32.1**), shown on the main menu and the loading screen. The first time you load a new version, a **What's New** screen lists what changed, with every earlier update underneath. Tap the version number at the bottom of the main menu to see it again. Updates always load fresh: a small service worker (`sw.js`) asks the server for the newest game files first, and if a newer version appears while the game is open, a **tap to update** banner shows on the main menu. *(To release an update: bump `VERSION` in `js/version.js` and add an entry at the top of `CHANGELOG`.)*
- **💰 Bounty Convoys** (skirmish & online, can be switched off under Battlefield): every few minutes an armoured, gold-trimmed cash truck rumbles across the map from one side to the other. Destroy it before it escapes to claim a **$1,500 bounty** - the AI hunts it too. Bag one for the **Highway Robbery** medal.
- **🛬 Reinforcements** (support power, needs a War Factory and Comms Center): a heavy transport flies over and parachutes two tanks onto the spot you pick (two Battle Tanks for the Wally Squad, a Battle Tank and an Inferno Tank for the Grimlocks).
- **🐟 Leaping fish & 🦋 butterflies:** fish jump out of lakes and splash back in, and colourful butterflies flutter over the grass by day.
- **👑 King of the Hill** (Skirmish → Battlefield option): a ring of glowing beacons and a crowned flag in the middle of the map. Keep troops on the hill with no enemies there to score time; the first side to hold it for 3 minutes in total wins. A score bar shows both clocks, and the AI fights for the hill too. Win one for the **King of the Hill** medal.
- **🐉 Wyvern Rider** (Grimlocks only, Helipad): a goblin on a fire-breathing wyvern with flapping wings. It swoops low to roast infantry and buildings. Shoot it down with rockets and SAMs.
- **⚡ Tesla Truck** (Wally Squad only, War Factory + Comms Center): a six-wheeled truck with a swivelling Tesla coil. Its lightning arcs between up to three packed enemies, and it doesn't need power.
- **✨ Fireflies:** on green, autumn and jungle maps, glowing fireflies drift and blink near the ground after dark.
- **💣 Grenadier** (Wally Squad only, Barracks + Refinery): lobs grenades in a short arc over walls and into crowds. Great against infantry, bunkers and garrisoned houses, but can't hit anything right next to him.
- **🧨 Goblin Boomer** (Grimlocks only, Barracks + Refinery): a cackling goblin with a huge bomb on his back. He sprints at the enemy and blows himself up, wrecking everything nearby. One use only!
- **🍂 Autumn Hollow** (new map): rolling hills of red, orange and gold woodland around four quiet ponds, with leaves drifting on the wind. Win there for the **Fall Guy** medal.
- **🐑 Wildlife:** flocks of sheep and cows graze on the green and autumn maps, and penguins waddle about on Frostbite Pass. They're just for show: they munch grass and scatter in a panic when troops or tanks come near.
- **🐕 Attack Dog** (Barracks, both sides): cheap, fast and fierce. It has a big sight range for scouting, savages enemy infantry, and is useless against tanks. It wags its tail and barks.
- **🏷 Nicknames:** when one of your units becomes a Veteran it earns a nickname, like "Sgt. Biscuit", "Sir Tanks-a-lot", "Iron Granny" or "Sir Barksalot" for dogs. The nickname shows in the selection panel, the battle log and the MVP.
- **🌈 Ambient life:** flocks of birds wheel over the forests by day, and a rainbow arcs across the sky when rain or a storm clears.
- **🌲 Destructible forests:** artillery, explosions, airstrikes, meteors and barrels knock trees down. They topple away from the blast, charred and smoking, leaving a burnt stump, and the ground they stood on becomes passable. You can blast your way through a forest. Tree damage is part of the shared game state, so it stays in sync online.
- **🛢 Explosive fuel barrels:** red fuel drums sit beside every lane. Shoot one to blow up anything nearby, and nearby barrels go up in a chain reaction. They don't count as anyone's building.
- **🛞 Tread and tyre tracks:** vehicles leave twin tracks in the ground, which slowly fade (but not on water).
- **🔫 Shell casings:** brass casings flick out of machine guns and rifles.
- **🎬 Cinematic filter** (Graphics settings; on for High and Ultra): film grain, a touch of colour fringing at the screen edges, a gentle contrast curve and warmer highlights.
- **Main menu:** the Wally Man photo, with its background removed, sits beside the logo, with "© 2026 Douglas Thomson. All rights reserved." at the bottom. The image is `img/wallyman-photo.webp`.
- **Loading screen** now reads "LOADING WALLY SQUAD…" and shows a random gameplay tip.
- **🎯 Find enemy base** (🎯 in the top bar, "Find enemy" on touch screens, or `N`):
  - **Before the enemy is found:** the camera flies to where their base is, and a pulsing red beacon and a minimap ping mark the spot for 12 seconds. The fog stays, so it shows where to go, not what's there.
  - **Once their buildings have been seen:** each press jumps to the next one, HQ first.
- **📺 Watch AI Battle** (main menu): pick a map and AI skill, then watch the Wally Squad AI fight the Grimlock AI. The whole map is revealed and the build sidebar is hidden. Scroll and zoom to follow the action, and speed it up from the pause menu.
- **🗿 Victory Monument** (Construction Yard, needs a Tech Lab; Skirmish and Online): a $5,000 wonder. If it stands for **5 minutes** after it's finished, its owner wins.
  - Each side's monument is different: a golden Wally Man statue, or a horned Grimlock skull idol.
  - A countdown floats above it, and warnings sound at 4, 3, 2 and 1 minutes, 30 seconds and 10 seconds.
  - The AI builds one in long, rich games, and throws everything at yours.
  - It can be switched off in the Skirmish options.
- **✈ Strike Jet** (Helipad + Comms Center): a blisteringly fast, fragile jet with twin missiles that hit air and ground. The AI builds them too.
- **🏝 Emerald Isles** (new map): tropical jungle islands around turquoise lagoons, joined by sandy causeways. Hovercraft shine here.
- **🧪 Sandbox** (main menu): unlimited money, five-times-faster building and no win or lose. A toolbar spawns any unit for either side wherever you tap (one or five at a time), switches the enemy AI on or off, reveals the map and clears all units.
- **🚁 Sky Hauler** (Helipad): a twin-rotor transport helicopter that carries 6 infantry over cliffs, water and lava. Load it like the APC. Unload (`U`) drops the troops on the nearest flat, dry ground; it refuses over water.
- **📰 Battle log:** a feed in the top-right shows what your forces destroy and lose ("Battle Tank destroyed Scout Buggy ×2"), plus Heroic promotions.
- **🎬 Finale cam:** when a battle is won or lost, the camera swoops to the last building to fall, in slow motion, with a final chain of explosions before the end screen.
- **🛶 Skimmer Hovercraft** (War Factory + Comms Center): a fast amphibious raider with twin rockets that skims over water and even lava, so it can flank across lakes and the Magma Rift.
- **⚡ EMP Strike** (support power, needs a Tech Lab): a blue pulse that knocks out enemy vehicles, aircraft and defences within 15 m for 12 seconds. Infantry are unaffected.
- **🌟 Heroic rank:** a unit with 10 kills becomes Heroic (★★★). It deals +75% damage, heals faster and has a golden glint.
- **🌪 Natural Disasters** mutator: tornadoes roam the battlefield every couple of minutes, throwing infantry around and battering vehicles and buildings.
- **Fighting back:** infantry and vehicles that come under fire turn on the attacker, even out-of-sight artillery, and chase it further than a normal target. Idle friends within 11 m join in. A unit busy shooting a building switches to the unit shooting it.
  - Units on a direct move or attack order keep following it.
  - Hold Fire units never shoot back; Hold Position units only shoot back if the attacker is in range.
- **↔ Patrol** (`P` or the selection-panel button, then pick a point): units walk back and forth between where they are and that point, attacking anything they meet.
- **Building info** closes by itself after 10 seconds. Touching the panel (or hovering over it with a mouse) restarts the countdown.
- **New medals:** Graduate, Unstoppable, Fortified, Grak Smash, Trial by Fire, Mad Science, Daily Duty and Into the Fire.
- **More medals:** Home Sweet Home (take a civilian house) and Shocking! (one Tesla bolt strikes three enemies).
- **🌋 Magma Rift** (new map): a volcanic wasteland split by a river of glowing, bubbling lava with three crossings, charred dead trees and ashfall weather.
- **🔧 Repair Truck** (War Factory): drives to damaged vehicles nearby and repairs them in the field.
- **🛸 Recon Drone** (Helipad): a cheap, fast, unarmed scout with a huge sight range. It reveals cloaked Shade tanks within 14 m.
- **💤 Idle units:** the top bar shows how many fighting units are idle. Click it (or press `.`) to jump to the next one.
- **⚡ Tesla Coil** (Wally Squad only, Defence tab, needs a Radar): hurls a bolt of lightning that arcs on to two more enemies nearby. Needs power.
- **🔥 Flame Tower** (Grimlocks only, Defence tab, needs a Barracks and Refinery): a spiked tower with a swivelling nozzle that sprays a wide gout of fire. Short range, roasts infantry and buildings.
- **🏠 Civilian houses**: every lane has a couple of neutral cottages. Send up to 3 infantry inside (right-click or tap the house): they shoot out of the windows with extra range, and the house flies your flag until they leave or it's knocked down. The AI grabs them too. Houses don't count as structures for winning or losing.
- **🏰 Battle Bunker** (Defence tab, needs a Barracks): a sandbagged pillbox for up to 4 infantry. Select infantry and right-click (or tap) it to garrison.
  - Troops inside shoot out with +25% range and can't be hurt until the bunker falls; then they bail out wounded.
  - Evacuate (`U`) sends them back out. The computer builds and garrisons bunkers too.
- **🔥 Kill streaks:** quick kills in a row get a banner and a shout (Double kill, Triple kill, Rampage, Unstoppable and more). The end screen shows your **MVP** unit and your best streak.
- **Unit voices:** select the Scorcher for one of 24 "Wally Man" introductions ("Never fear, Wally Man is here!", "Did somebody say barbecue?"...), spoken in a female voice and never the same one twice in a row. Wally Man himself has 15 introductions.
- **🚚 Squad Carrier APC** (War Factory, needs a Barracks): an armoured troop carrier with a machine gun. To load up to 5 infantry, select them and right-click (or tap) the APC. Press Unload (`U`) to drop them off. Green pips show how many are inside. If the APC is destroyed, its passengers bail out wounded.
- **🎵 Soundtrack:** twelve original tunes, shuffled at random. A new one starts every minute and a half or so, and **⏭** in the top bar skips to another.
  - **Wally Squad Assemble:** a heroic rock march.
  - **Grimlock Rising:** a dark, four-on-the-floor stomp.
  - **Crystal Rush:** fast drum & bass.
  - **Steel Thunder:** heavy half-time with a galloping bass.
  - **Lava Run:** an urgent chase.
  - **Victory Road:** an upbeat major-key march.
  - **Neon Commander:** synthwave with pulsing bass.
  - **Pixel Platoon:** 8-bit chiptune.
  - **Skank Tank:** ska with off-beat chords and a brass lead.
  - **Iron Grimlock:** metal with double-kick drums.
  - **Funky Harvester:** syncopated funk with a popping bass.
  - **Desert Shuffle:** a swinging blues shuffle with a walking bass.
  - Every tune has a second melody in its verses and goes up a key for the final chorus.
  - Each tune has its own tempo, key, chords, drum groove, bass line and lead melody, arranged into an intro, verses, catchy choruses and a breakdown. It also has crashes and tom fills, sidechain pumping and an echoing lead.
  - **Dynamic:** the music follows the fighting. It is stripped back when calm, the full band in battle, and adds extra kicks, 16th-note hats and an octave-doubled lead in all-out war. The Music button shows the mood, and "♪ Now playing" names each new tune. Victory and defeat each play a short phrase.
- **Unit stances:** in the selection panel, choose Aggressive (chase enemies), Hold Position (shoot only what's in range and never move) or Hold Fire (never shoot unless ordered, good for sneaking).
- **📷 Photo mode** (pause menu or `F9`): hides the interface and slows or freezes time. You can zoom right in and tilt the camera (`Z`/`C` or Shift + wheel), then save a picture.
- **Graphics settings** (main menu and pause menu):
  - Low/Medium/High/Ultra presets.
  - A resolution scale from 50% to 150% (anything over 100% is supersampling).
  - Shadows up to 4096, anti-aliasing up to 8×, bloom, an FPS counter, and auto-adjust, which keeps play smooth by lowering the resolution when needed.
  - Auto-adjust aims for 45+ FPS. It first lowers the resolution, then turns off bloom, then anti-aliasing, and redraws shadows less often. As the frame rate recovers, it restores them in reverse order.
- **Performance:**
  - Trees, rocks, crystal fields and the ground are split into map tiles, so anything off-screen isn't drawn, in the main pass or the shadow pass. That cuts the triangles drawn each frame by 60–70%.
  - On phones, shadows are redrawn every other frame with a cheaper filter, and bloom is computed at quarter resolution.
  - Small parts such as lamps and glass don't cast shadows.
- **Supply crates** drop on the battlefield. Drive over one for money, repairs, promotions, free reinforcements or a map reveal. Some are booby-trapped!
- **Neutral tech buildings** sit beside each lane, and an Engineer can capture them:
  - Crystal Derrick: steady income.
  - Field Hospital: heals nearby infantry.
  - Repair Depot: repairs nearby vehicles.
- **Waypoints:** Shift + right-click queues up a route.
- **Gatling Frenzy:** Wally Man's special ability (key `G`). It gives 8 seconds of super-fast fire and extra speed, with a 45-second cooldown.
- **End-of-game graphs** show army strength and crystal harvested over time for both sides.
- **Effects:** layered explosions with a fireball, smoke, sparks, a shockwave, burning debris, dynamic light and scorch marks. Tank turrets get blown into the air and buildings collapse.

## Tip jar (Ko-fi)

The tip jar works like Goffichick's and Wallyman World's:
- **On the title screen:** a pulsing pink **TIP JAR** button wanders around the top of the screen.
  - It has a gold rim, a glow, a sweeping shine and a steaming coffee cup with a heart.
  - It darts away when the mouse gets close, or when you click or tap it, shouting things like "Nope!" and "Too slow!".
  - After your 3rd click it runs out of puff, sweats, says "Okay, okay... tip me!" and stays put. The 4th click always opens Ko-fi.
- **In the pause menu:** it sits still under the options.
- **Opening Ko-fi:** your page opens in a new tab. If a phone app's built-in browser blocks pop-ups, a box appears with a link to tap and a Copy link button.
- **Your page name:** set it with `WALLY_KOFI` at the top of `js/tipjar.js` (currently `dugt574832`, the same as Goffichick and Wallyman World). Leave it empty to hide the tip jar.

## Online play: how it works

Online battles use the same Supabase realtime project as Goffichick's online mode, so no extra server is needed. Both players run the same simulation in lockstep and only send their commands to each other, in 200 ms turns. The two machines compare checksums and show a warning if they get out of sync. Using the same browser on both sides gives the best results.

For testing, add `?loopnet` to the URL to connect two tabs on the same computer without any server.

## Controls

| Action | Control |
|---|---|
| Select | Left-click, or drag a box. Shift adds to the selection. Double-click selects all units of that type on screen |
| Move / attack | Right-click |
| Attack-move / Stop | `A` then click / `S` |
| Control groups | `Ctrl`+`1-9` to set, `1-9` to recall |
| Scroll | Arrow keys, screen edges, right-drag, or click the minimap |
| Zoom / rotate | Mouse wheel / `Q` and `E` |
| Base / last alert | `H` / `Space` |
| Repair / sell mode | `R` / `X` |
| Superweapon | **LAUNCH** in the sidebar, then click a target |
| Load / unload APC | Right-click the APC with infantry selected / `U` |
| Next idle unit | `.` or the 💤 button |
| Find enemy base | `N` or the 🎯 button |
| Patrol | `P`, then click the far end of the route |
| Hero ability (Frenzy / War Cry) | `G` |

URL options: `?auto` starts a skirmish straight away (add `&map=frost|dunes|midnight`, `&faction=grim` or `&weather=storm` to change it), and `?reveal` turns off the fog of war.

## More ideas

- 2 v 2 online battles, and online play against the computer with a friend
- A map editor with shareable maps
- Naval units, and bridges that can be destroyed
- Replays, and graphs at the end of a match showing army size and income over time
