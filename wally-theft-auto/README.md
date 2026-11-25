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
- **Nine story missions**, started from the yellow marker outside Wally's Flat. In the first, *Special Delivery*, Wally follows his GPS (the purple route on the radar) to a white Pamazon van parked outside the depot, steals it, and has to deliver 10 parcels in 5 minutes. Then come *Fish Supper Run*, *Checkpoint Charlie*, *Pest Control*, *Hot Potato*, *The Big Flap*, *Mammy's Birthday*, *The Haggis Heist* and *Battle of Hero Square*.
- **Side jobs**: get in a black cab for **Wally Cabs** (pick up fares, beat the clock), or park the **Mr Fudge** ice cream van near Hero Square so the chimes bring customers.
- **Granda's Armoury** (red square on the radar): spend your cash on any weapon, ammo, body armour or health.
- **Stunt ramps** (orange triangles on the radar): hit them fast for slow-motion jumps and cash, with a big bonus for doing all six.
- **Wardrobe** in Wally's Flat: six outfits, from Classic to Golden Wally.
- **24 weapons** lying about town, in different spots every game, plus ammo crates:
  - Melee: Granda's Golf Club, Frying Pan, Shinty Stick, Claymore, and the Battle Bagpipes (knock over everyone around you)
  - Pistols: Wally Blaster, Auld Revolver, and the Polis Taser (drops people on the spot)
  - Shotguns: Scatter Blaster and the Gamekeeper's Double
  - Automatics: Wee Rattler (SMG), Nail Gun, Highland Rifle and Gatling Blaster
  - Wally Laser, Long Scope (a sniper rifle that zooms in when aiming) and the Super Soaker (knocks people over and puts out car fires)
  - Launchers: Tattie Gun (potatoes), Thistle Crossbow, Haggis Launcher and Caber Launcher (both explosive)
  - Dragon's Breath (a short-range flamer), the Flamethrower (long range, big flames) and Neep Grenades (thrown turnips)
  - Every weapon has its own realistic firing sound, with echoes off the buildings.
  - Tab or the mouse wheel cycles through what you've found.
- **20 hidden Golden Specs** (some on rooftops), plus health, armour, cash and Blaster-cell pickups.
- **Carjacking**: press F by an occupied car and Wally yanks the door open, drags the driver out by the collar, punches them and drives off. Grab a polis car and the driver fights back.
- **Weather** that changes every few minutes: Braw (clear), Dreich (overcast), Pishin' doon (rain), Blawin' a hoolie (storm, with thunder and lightning), the Haar (sea fog) and snow. Rain makes roads shiny and slippy.
- **Day–night cycle**: a full day lasts 24 minutes. At night the windows, street lamps and shop signs light up, with bloom.
- **Six radio stations** (R in a car), each with three songs that play in turn, with DJ chat and the song name on screen:
  - Wally FM (chiptune pop), Clyde Beats (synthwave), Pipes & Riffs (bagpipe rock)
  - Ceilidh Classics (accordion and fiddle jigs, reels and a waltz), Rave an' Scran (90s happy hardcore), Smooth Haar (late-night jazz)
- If you die it's **HOPELESS!** and you wake up at the Infirmary. If you're arrested you're **NICKED!** and released from the Polis station.
- **Wally's Flat**: walk through the front door (the pink ring) to go inside. Sleep in the bed (green ring, then F) to save the game, and you'll wake up there next time. Progress also saves automatically after missions.

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
| Set GPS destination | G, or tap the radar | |
| Mute / pause | M / Esc or P | Start |

On phones and tablets there's an on-screen stick, a drag-to-look area and buttons. The **Graphics** toggle switches between High (2048 shadows, bloom, retina resolution, more traffic) and Low.

## Versions

The version number is shown on the title screen (with a "What's new" list) and on the pause screen. It lives in `js/version.js`: bump it by 0.1 for every update (1.1, 1.2, 1.3...) and add a line to `CHANGES`.

- **3.2**: loads more funny dialogue, phone calls from the cast, pavement chats, and Wally comments on much more
- **3.1**: fixed the radio going silent after changing vehicles
- **3.0**: 10 new weapons (including a Flamethrower), realistic firing sounds for every weapon, twice as many pickups, 3 new radio stations and 18 songs
- **2.9**: 5 new missions, GPS routes for every mission, full Pamazon van lettering, landscape only on phones
- **2.8**: run-over sounds: a thud, a cartoon yelp, a Scottish cry, a bump on landing, and shouting witnesses
- **2.7**: fixed a graphics memory leak that could crash phones after long sessions; the game now saves and offers a reload if the graphics ever give out
- **2.6**: the polis climb out and arrest Wally (with a GETTING NICKED bar you can run from, and being dragged out of a stopped car); rebuilt, more realistic cars with wheel arches, pillars, window surrounds, alloys, headlights, grilles and mirrors
- **2.5**: labelled radar icons for home (H), Granda's Armoury (A), the next mission (M), Wally Wash (W), Infirmary (+) and Polis (P); set the GPS to any of them with G, the GPS button or by tapping the map
- **2.4**: spoken dialogue for missions, pedestrians, drivers, polis, the radio DJ and Wally (VOICES toggle), lots more Scottish patter, the full WALLY MAN badge on his chest, and clear cab glass on vans
- **2.3**: three new missions (Mammy's Birthday, The Haggis Heist, Battle of Hero Square), Granda's Armoury shop, Wally Cabs taxi job, ice cream van job, 6 stunt ramps with slow-mo, a wardrobe with 6 outfits, and seagulls
- **2.2**: cache-proof loading: the page checks the live version and loads every file stamped with it, so updates show up straight away
- **2.1**: go inside Wally's Flat; sleep in the bed to save; quieter rain; 130 weapon pickups and 45 ammo crates; speed blur, lamp light pools, car light glows, skid marks, tyre smoke, muzzle flashes, raindrops on the lens
- **2.0**: weapons and ammo crates hidden up the (now wider) alleyways and shown as gold squares on the radar; all car windows are clear see-through glass
- **1.9**: Wally rebuilt as one skinned mesh with weight maps; eyes, eyebrows, nose and mouth; detailed cars with interiors and drivers; honking, shouting and arguing drivers; lamp posts that get knocked over; 10 new weapons and ammo crates
- **1.8**: a UFO intro: a flying saucer beams Wally down outside his flat at the start of the game (skippable)
- **1.7**: the touch PUNCH/FIRE button moves next to the red Q (Wally Power) button
- **1.6**: the touch PUNCH/FIRE button sits beside the movement stick, so the left thumb fires while the right thumb aims
- **1.5**: touch aiming: hold AIM or FIRE and drag to move the aim, plus a soft lock-on to the nearest target (red crosshair)
- **1.4**: cars are solid, so Wally and pedestrians can't walk through them, and you can stand on car roofs
- **1.3**: carjacking (open the door, drag the driver out, punch them, drive off), opening driver's doors, and weather: Braw, Dreich, Pishin' doon, Blawin' a hoolie (thunder and lightning), the Haar and snow, with wet, slippy roads; graphics now default to High on every device
- **1.2**: real hands with fingers, random weapon pickups (Golf Club, Wally Blaster, Scatter Blaster, Neep Grenades), engine sounds from nearby traffic, and more graphical detail (surface relief, contact shadows, awnings, fuller trees, manholes, clouds, rippling sea, colour grade)
- **1.1**: Pamazon "Special Delivery" first mission with a GPS route on the radar, the cape no longer clips through the suit, the touch stick sits beside the map, ENTER/LEAVE button, and version numbers
- **1.0**: first release

## Code layout

- `js/main.js`: renderer, sky and lighting, camera, input, police, pickups, HUD, radar, missions glue and the game loop
- `js/city.js`: city generation (merged geometry, instanced street furniture), colliders and the road graph
- `js/humans.js`: the jointed human rig, Wally Man, and the walk, run, fly and drive animations
- `js/vehicles.js`: car models, drift physics, traffic AI and police pursuit AI
- `js/peds.js`: pedestrians and foot cops
- `js/player.js`: Wally's controls, combat and powers
- `js/voice.js`: spoken dialogue (browser speech, a Scottish voice where the device has one) and Wally's quips
- `js/weapons.js`: weapon stats and models
- `js/content.js`: side jobs (taxi, ice cream), Granda's Armoury, stunt ramps and seagulls
- `js/flat.js`: the inside of Wally's Flat and its bed save point
- `js/ufo.js`: the flying saucer from the intro
- `js/weather.js`: weather states, rain and snow particles, lightning
- `js/missions.js`: the story missions
- `js/audio.js`: synthesised sound effects and generative radio
- `js/textures.js`: procedural canvas textures
- `js/version.js`: the version number and changelog
