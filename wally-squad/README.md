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
- **Survival:** endless enemy waves that grow stronger each time, with a boss every 5th wave. The game keeps your best score and wave for each map.
- **Skirmish:** choose a map, your faction and the difficulty, and turn the day–night cycle and dynamic weather on or off.
  - Skirmish options: switch superweapons, support powers, supply crates, tech buildings, fog of war and starting armies on or off, and choose the starting money ($2,500–$15,000).
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
- **🚚 Squad Carrier APC** (War Factory, needs a Barracks): an armoured troop carrier with a machine gun. To load up to 5 infantry, select them and right-click (or tap) the APC. Press Unload (`U`) to drop them off. Green pips show how many are inside. If the APC is destroyed, its passengers bail out wounded.
- **🎵 Dynamic music:** the soundtrack follows the fighting. It is calm and sparse in quiet moments, becomes the full battle loop in a skirmish, and goes to all-out war (double hats, drum fills and a lead arpeggio) in big fights. The Music button shows the current mood. Victory and defeat each play a short phrase.
- **Unit stances:** in the selection panel, choose Aggressive (chase enemies), Hold Position (shoot only what's in range and never move) or Hold Fire (never shoot unless ordered, good for sneaking).
- **📷 Photo mode** (pause menu or `F9`): hides the interface and slows or freezes time. You can zoom right in and tilt the camera (`Z`/`C` or Shift + wheel), then save a picture.
- **Graphics settings** (main menu and pause menu):
  - Low/Medium/High/Ultra presets.
  - A resolution scale from 50% to 150% (anything over 100% is supersampling).
  - Shadows up to 4096, anti-aliasing up to 8×, bloom, an FPS counter, and auto-adjust, which keeps play smooth by lowering the resolution when needed.
- **Supply crates** drop on the battlefield. Drive over one for money, repairs, promotions, free reinforcements or a map reveal. Some are booby-trapped!
- **Neutral tech buildings** sit beside each lane, and an Engineer can capture them:
  - Crystal Derrick: steady income.
  - Field Hospital: heals nearby infantry.
  - Repair Depot: repairs nearby vehicles.
- **Waypoints:** Shift + right-click queues up a route.
- **Gatling Frenzy:** Wally Man's special ability (key `G`). It gives 8 seconds of super-fast fire and extra speed, with a 45-second cooldown.
- **End-of-game graphs** show army strength and crystal harvested over time for both sides.
- **Effects:** layered explosions with a fireball, smoke, sparks, a shockwave, burning debris, dynamic light and scorch marks. Tank turrets get blown into the air and buildings collapse.

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

URL options: `?auto` starts a skirmish straight away (add `&map=frost|dunes|midnight`, `&faction=grim` or `&weather=storm` to change it), and `?reveal` turns off the fog of war.

## More ideas

- 2 v 2 online battles, and online play against the computer with a friend
- A map editor with shareable maps
- Naval units, and bridges that can be destroyed
- Replays, and graphs at the end of a match showing army size and income over time
