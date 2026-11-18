# Wally Squad

A 3D real-time strategy game for the browser, in the style of the classic base-building RTS games. You build a base, harvest crystal, raise an army and wipe the **Grimlock Legion** off the map.

Play it by opening `wally-squad/index.html` from any web server (GitHub Pages works). Nothing needs installing: Three.js is bundled in `lib/`, and every model, texture and sound is generated in code.

## Features

- **Base building:** Command HQ, Power Plant, Crystal Refinery, Barracks, War Factory, Comms Center, Tech Lab, Helipad, plus Gun Turret, SAM Site and Plasma Tower defences. Buildings rise out of the ground in a burst of sparks.
- **Tech tree and power:** higher-tier units and buildings need prerequisites. If you run low on power, production slows, the radar goes offline and Plasma Towers shut down.
- **Economy:** Harvesters mine glowing crystal fields and dock at the refinery. Blue crystal is worth double, and crystal slowly grows back.
- **11 units:**
  - Infantry: Rifle Trooper, Rocket Trooper, Scorcher (flamethrower), Engineer (captures enemy buildings)
  - Vehicles: Scout Buggy, Battle Tank, Thunder Artillery, Titan Tank, Harvester
  - Air: Hornet Gunship
  - Hero: **Wally**, who wears a bobble hat and glasses. He's a sniper and plants C4 on buildings.
- **Combat:** different warheads do different damage to each armour type, and units can be hit by splash damage. Tracers, shells, homing rockets, arcing artillery and plasma beams are all modelled. Units with kills earn veterancy stars.
- **Effects:** layered explosions with a flash, fireball, rolling smoke, sparks, a ground shockwave, flying burning debris, dynamic light and scorch marks. The screen shakes. Tank turrets get blown into the air. Damaged buildings smoke and burn, and destroyed buildings collapse in a chain of explosions and leave rubble.
- **Graphics:** PBR materials with reflections, soft shadows, bloom and ACES tone mapping. There's a procedural heightmap with lakes, forests and rocks, animated cranes, radar dishes, steam and factory doors. Fog of war and a minimap are included.
- **AI opponent:** the enemy follows a build order, expands, defends its base and sends larger attack waves over time. It has three difficulty levels.
- **Audio:** sound effects are synthesised with Web Audio, along with a procedural battle music loop. A spoken announcer says things like "Construction complete" and "Our base is under attack".
- **Controls:** mouse and keyboard, or touch (tap, drag and pinch).

## Controls

| Action | Control |
|---|---|
| Select | Left-click, or drag a box. Shift adds to the selection. Double-click selects all units of that type on screen |
| Move / attack | Right-click |
| Attack-move | `A`, then click |
| Stop | `S` |
| Control groups | `Ctrl`+`1-9` to set, `1-9` to recall (press twice to jump the camera to them) |
| Scroll | Arrow keys, screen edges, right-drag, or click the minimap |
| Zoom / rotate | Mouse wheel / `Q` and `E` |
| Base / last alert | `H` / `Space` |
| Repair / sell mode | `R` / `X` |
| Rally point | Select a factory, then right-click the map |
| Pause | `P` or `Esc` |

URL options: `?auto` skips the title screen and `?reveal` turns off the fog of war.

## Ideas for what to add next

1. **Campaign missions** with a story (Wally's squad versus the Grimlock warlord), scripted objectives and briefings.
2. **Online multiplayer**, 1v1 or 2v2. The simulation is already separate from rendering, so lockstep networking could be added on top of it.
3. **Skirmish map editor and more maps**, including snow, desert and night maps with headlights and searchlights.
4. **Superweapons** such as an orbital strike or a nuke silo, with a countdown timer and huge explosions.
5. **Naval units and bridges** on the lakes, with destructible bridges that open new routes.
6. **Weather and a day–night cycle.** Rain could slow vehicles, and fog could cut sight range.
7. **Walls, gates and mines** for base defence.
8. **Faction differences.** The Grimlock could get stealth tanks and a different superweapon so the two sides play differently.
9. **Unit voices** recorded by you and your friends for each unit type.
10. **Replays and a stats graph** at the end of the match showing army size and income over time.
