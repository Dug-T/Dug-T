# Wally Theft Auto

An open-world, third-person 3D crime-caper for the browser starring **Wally Man**, Wallypool's caped and largely hopeless superhero.

Open `wally-theft-auto/index.html` from any web server (GitHub Pages works). Nothing needs installing: Three.js is bundled in `lib/`. All the models, textures, music and sound effects are generated in code.

## The game

- **Wallypool**: an island city of 64 blocks, with downtown glass towers, sandstone tenements, shopfronts, parks, the Clydeside Docks (with containers and a crane), red phone boxes, street lamps and a seafront promenade.
- **Wally Man**: a smooth, jointed model built from the portrait: blue suit, "WALLY MAN" chest emblem, red-orange cape that billows with speed, blue mask with flapping ties, thick black specs, ginger hair and moustache, red boots and gauntlets.
- **Cars to "borrow"**: saloons, hatchbacks, sports cars, black cabs, vans, ice cream vans and police cars. They have rounded bodies, clearcoat paint, spinning and steering wheels, working brake lights and drift handling. Cars take damage, smoke, catch fire and explode.
- **Traffic & pedestrians**: AI traffic drives on the left and follows the road network. Pedestrians walk the pavements, heckle Wally in Scots and run when trouble starts.
- **Wanted level**: five stars. Polis cars use the road grid to hunt you down, foot cops try to arrest you and, from three stars, they open fire. Break line of sight to lose them, or pay $100 at the **Wally Wash** for a respray.
- **Wally Power (Q)**: sometimes he flies, which lets you reach the rooftops. Sometimes he faceplants. Sometimes he gets one super punch that sends cars flying. Sometimes he discovers that his heat vision is just steamed-up specs.
- **Six story missions**, started from the yellow marker outside Wally's Flat. In the first, *Special Delivery*, Wally follows his GPS (the purple route on the radar) to a white Pamazon van parked outside the depot, steals it, and has to deliver 10 parcels in 5 minutes. Then come *Fish Supper Run*, *Checkpoint Charlie*, *Pest Control*, *Hot Potato* and *The Big Flap*.
- **20 hidden Golden Specs** (some on rooftops), plus health, armour, cash and Blaster-cell pickups.
- **Day–night cycle**: a full day lasts 24 minutes. At night the windows, street lamps and shop signs light up, with bloom.
- **Three radio stations** (R in a car): Wally FM, Clyde Beats, and Pipes & Riffs.
- If you die it's **HOPELESS!** and you wake up at the Infirmary. If you're arrested you're **NICKED!** and released from the Polis station.
- Progress saves automatically in the browser.

## Controls

| Action | Keyboard / mouse | Gamepad |
|---|---|---|
| Move / drive | WASD or arrows | Left stick, RT/LT for gas/brake |
| Look | Mouse | Right stick |
| Sprint | Shift | LB / L3 |
| Jump / handbrake | Space | A |
| Enter / exit car | F or Enter | Y |
| Punch / fire | Left click | RT |
| Aim Blaster | Right click | LT |
| Switch weapon | Tab | B |
| Wally Power | Q | X |
| Fly down | Ctrl | |
| Horn / radio / camera | H / R / C | |
| Mute / pause | M / Esc or P | Start |

On phones and tablets there's an on-screen stick, a drag-to-look area and buttons. The **Graphics** toggle switches between High (2048 shadows, bloom, retina resolution, more traffic) and Low.

## Versions

The version number is shown on the title screen (with a "What's new" list) and on the pause screen. It lives in `js/version.js`: bump it by 0.1 for every update (1.1, 1.2, 1.3...) and add a line to `CHANGES`.

- **1.1**: Pamazon "Special Delivery" first mission with a GPS route on the radar, the cape no longer clips through the suit, the touch stick sits beside the map, ENTER/LEAVE button, and version numbers
- **1.0**: first release

## Code layout

- `js/main.js`: renderer, sky and lighting, camera, input, police, pickups, HUD, radar, missions glue and the game loop
- `js/city.js`: city generation (merged geometry, instanced street furniture), colliders and the road graph
- `js/humans.js`: the jointed human rig, Wally Man, and the walk, run, fly and drive animations
- `js/vehicles.js`: car models, drift physics, traffic AI and police pursuit AI
- `js/peds.js`: pedestrians and foot cops
- `js/player.js`: Wally's controls, combat and powers
- `js/missions.js`: the story missions
- `js/audio.js`: synthesised sound effects and generative radio
- `js/textures.js`: procedural canvas textures
- `js/version.js`: the version number and changelog
