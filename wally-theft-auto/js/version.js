// Bump VERSION for every update (1.1, 1.2, 1.3 ...) and add a line to CHANGES.
export const VERSION = '4.4';

export const CHANGES = [
  ['4.4', [
    "Buy property: The Chippy, Pie Palace, Haggis Hut, the Wally Wash and the Neep Market (green squares on the radar). Each pays you every hour",
    "Wally's phone (T, the 📱 button, or Back on a controller): a full city map where you can tap to set a waypoint, contacts to phone (each does you a wee favour), property, stats and the camera",
    'Photo mode from the phone camera: move round Wally, zoom, and snap a picture to your downloads',
    'Three save slots on the title screen',
  ]],
  ['4.3', [
    "Rampages: six red tokens around town (red squares on the radar). Walk into one for a timed challenge, like clattering 10 folk wi' Granda's golf club in a minute. $1500 each, $5000 bonus for all six",
    'Rival superheroes: Captain Clyde and the Tartan Avenger drop in now and then and race you to a landmark. Beat them for $750',
    'The polis helicopter comes out at 4 stars: it follows you, a marksman takes potshots, and at night its searchlight tracks you. Shoot it down if you dare',
    'Roadblocks at 3 stars: polis cars and officers block the road ahead of you',
  ]],
  ['4.2', [
    'Big frame rate boost: smoke, sparks and flames are now drawn on the graphics card in two batches instead of one object each, so explosions, flamethrowers and rain no longer make the game stutter',
    "Cars are merged into a handful of pieces instead of about 110 each, and far-off cars skip shadows and wee details",
    "Nessie, pickups, Golden Specs and litter are drawn in batches too: about a third fewer draw calls overall",
    'Adaptive resolution: if the frame rate drops, the game quietly lowers the resolution a step and raises it again when there is headroom (shown on the FPS counter)',
    'Phones: a slightly lower resolution cap, lighter shadow filtering and lighter anti-aliasing',
  ]],
  ['4.1', [
    "Wally Man gets a quality upgrade: a knitted Lycra suit with a soft sheen, warmer skin, strand-textured ginger hair, catchlights and heavy lids on his eyes, a proper handlebar moustache, a darker cape lining, a gold W belt buckle, boot soles, smoother curves and a soft shadow underneath him",
    'Use your own 3D Wally: put a rigged glTF model at models/wally.glb and the game uses it, playing its idle, walk, run, jump and other animations automatically',
    'More Scottish patter: a patter generator for endless insults and compliments from passers-by ("Ye\'ve got a face like a wet weekend in Largs, ya walloper!"), plus new lines, chats and phone calls',
  ]],
  ['4.0', [
    'FPS counter in the top corner (turn it on or off in the pause menu)',
    'Spent bullet cases and red shotgun shells fly out of the guns and bounce on the pavement, and guns leave a wisp of smoke',
    'Explosions send a shockwave ring racing across the ground and leave scorch marks',
    'A rainbow appears after the rain, and shooting stars streak across the night sky',
    'Damaged motors steam, then pour black smoke before they catch fire',
    'Raindrops splash on the ground, dust flies when Wally sprints, and a ring of dust when he lands',
    'Badly hurt: the colour drains from the screen and the edges throb red with your heartbeat',
    'Soft shadows under every car, so even distant ones sit on the road',
    'Fixed: any grenade, haggis rocket or caber exploding anywhere killed Wally instantly if he was on foot',
  ]],
  ['3.9', [
    'Sun shafts: on sunny days light streams past the buildings, with a lens flare when you look towards the sun',
    'Smoother edges on High graphics (multisampled anti-aliasing)',
    'Headlight beams light up the road in front of cars at night',
    'Bullet holes in walls and roads, with sparks and dust where shots land',
    'Tyre smoke when you skid, exhaust puffs when you put your foot down, and sparks when cars crash',
    'Bits of paper blowing about the streets in the wind',
  ]],
  ['3.8', [
    "Fixed: on some Bluetooth controllers (like the Nacon MG-X Pro) FIRE kept firing on its own and cars wouldn't drive forward. The game now measures where each trigger rests instead of guessing",
    'Any control that reads as held down from the moment a controller connects is ignored until it has been let go, so nothing can get stuck on',
    'The CONTROLLER screen shows live readings from the controller, to help sort out any muddled buttons',
  ]],
  ['3.7', [
    'Full game controller support for Bluetooth controllers on phones (and Xbox / PlayStation pads): every action is on a button, the triggers are proper analogue pedals, and the right stick turns the camera smoothly',
    'Menus work on the controller too: D-pad to move, A to choose, B to go back',
    'The on-screen touch buttons hide while you play on a controller, and come back when you touch the screen',
    'New 🎮 CONTROLLER screen (title and pause menu): shows what is connected and the button layout, and SET UP BUTTONS lets you teach the game any controller whose buttons are muddled',
    "Rumble on gunfire, crashes, explosions and getting hurt, where the controller supports it, and Android's back gesture no longer quits the game",
  ]],
  ['3.6', [
    'New motor: the Steel Wedge, an angular stainless-steel electric pickup with a peaked roof and light bars. Fast, heavy, and it whines instead of roars',
    "New motor: the Wee Trike, a yellow three-wheeled van wi' one wheel at the front. Slow, light, and if you corner too fast it tips over on its side",
    "One of each is parked near Wally's flat, and they turn up in traffic too",
  ]],
  ['3.5', [
    'Nessie follows Wally everywhere: she wriggles after him on foot, chases his motor, and pops up behind him if he gets too far ahead',
    'Wally now starts every game holding the Highland Rifle, with 90 rounds',
    'Loads more Scottish patter: new lines for Wally, folk on the street, pavement chats and phone calls, patter at the wheel, and wee blethers between Wally and Nessie',
  ]],
  ['3.4', [
    "The Loch Ness Monster is outside Wally's flat! She wriggles up and down the pavement in her tartan bunnet and says \"Och aye the noo!\" when you start the game, and again when you go near her",
  ]],
  ['3.3', [
    'Touch controls: smaller buttons on the right, and a new camera joystick just left of them (level with the movement stick) to look around, instead of dragging on the screen',
  ]],
  ['3.2', [
    "Loads more funny dialogue: over 150 new spoken lines for Wally, folk on the street, drivers, the polis and the Red Shirts",
    'Phone calls: Mammy, Granda, Big Davie, Uncle Tam and others ring Wally for a blether between jobs',
    'Folk on the pavement have wee conversations wi\' each other as you walk by',
    'Wally now talks about carjacking, crashes, speeding, falling, low health, losing the polis, nightfall, cash, Golden Specs and every new weapon he finds',
    'People shout up at Wally when he flies over and back away when he aims a gun at them',
  ]],
  ['3.1', [
    'Fixed: the radio could stay silent after getting out of one vehicle and into another',
    'The radio also wakes back up if the phone pauses the sound (a call, another app), and skips ahead on the beat if the phone is too busy to keep up',
  ]],
  ['3.0', [
    "10 new weapons: Flamethrower, Auld Revolver, Wee Rattler SMG, Highland Rifle, Gamekeeper's Double, Thistle Crossbow, Caber Launcher, Nail Gun, Polis Taser and Shinty Stick",
    'Realistic firing sounds for every weapon: a crack, a bang, a thump and an echo off the buildings, plus shotgun pumps, sniper bolts, shell casings and a roaring flamethrower',
    'Melee weapons whoosh when you swing them and each one hits with its own sound',
    "About twice as many weapon pickups and ammo crates around town, and Granda's Armoury sells the new weapons",
    "3 new radio stations: Ceilidh Classics, Rave an' Scran and Smooth Haar. All six stations now have three songs each, with DJ chat and song names",
  ]],
  ['2.9', [
    "5 new missions: Granda's Appointment, Ice Cream Wars, Big Air, Bingo Bus and The Great Neep Robbery",
    'Every mission now shows a GPS route on the radar, including the chippy run, the race and the docks',
    'The Pamazon van shows its full name and slogan, and shop signs no longer get cut off',
    'Landscape only on phones: the game goes full screen sideways, and holding the phone upright shows a "turn yer phone sideways" screen and pauses',
  ]],
  ['2.8', [
    'Running people over now sounds like it: a thud, a cartoon yelp, a cry ("Ma bunions!"), a bump when they land, and witnesses who shout about it',
  ]],
  ['2.7', [
    'Fixed a crash on phones after long sessions (like the Pamazon deliveries): cars, people, projectiles and pickups now free their graphics memory when they leave',
    'Safety net: if the graphics ever do give out, the game saves and offers a reload instead of freezing',
  ]],
  ['2.6', [
    'The polis pull up, climb out of both doors and come to arrest Wally, even dragging him out of a stopped car',
    'Arrests take a moment: a GETTING NICKED bar fills up, so run to wriggle free; get caught and Wally is cuffed, hands behind his back',
    'Rebuilt cars: real wheel arches, painted roof and pillars, black window surrounds, alloy wheels with brake discs, proper headlights, grilles, tail lights and mirrors',
  ]],
  ['2.5', [
    'The radar shows labelled icons: H home, A Granda\'s Armoury, M next mission, W Wally Wash, + Infirmary, P Polis',
    'Set the GPS to any of them with G, the GPS button, or by tapping the map; the purple route leads the way',
  ]],
  ['2.4', [
    'Spoken dialogue: mission briefings, pedestrians, angry drivers, the polis, the radio DJ and Wally himself (VOICES on/off on the title and pause screens)',
    'Loads more Scottish patter from Wally and the people of Wallypool',
    'The full WALLY MAN badge now shows on his chest',
    'Clear glass in the cab of the Pamazon van and other vans',
  ]],
  ['2.3', [
    "3 new story missions: Mammy's Birthday, The Haggis Heist and Battle of Hero Square",
    "Granda's Armoury: a shop to spend your cash on weapons, ammo, armour and health",
    'Wally Cabs: drive a black cab to pick up fares for cash',
    'Ice cream van job: park Mr Fudge and the chimes bring customers',
    '6 stunt ramps with slow motion and cash bonuses',
    'A wardrobe in the flat with 6 outfits for Wally',
    'Seagulls circling the city',
  ]],
  ['2.2', [
    'Updates now load properly: the game checks the live version and fetches fresh files, so browsers can\'t get stuck on an old copy',
  ]],
  ['2.1', [
    "Walk into Wally's Flat through the front door (pink ring) and look around inside",
    'Sleep in the bed to save the game; you wake up in the flat when you continue',
    'Rain is much quieter (and you only hear a patter indoors)',
    'Lots more pickups: 130 weapons and 45 ammo crates around town',
    'New effects: speed blur, light pools under street lamps, glowing car lights, skid marks and tyre smoke, muzzle flashes, raindrops on the lens, film grain',
  ]],
  ['2.0', [
    'Weapons and ammo crates are now hidden up the alleyways between buildings (look for gold squares on the radar)',
    'Alleyways are wider so Wally can get up them easily',
    'All car windows are now clear glass you can see through, including the driver inside',
  ]],
  ['1.9', [
    'Wally is now one smooth skinned character mesh with weight maps, so his joints bend as one body',
    'Wally\'s eyes peek out through his mask behind his specs, with eyebrows, a bigger nose and a mouth',
    'Cars have see-through glass with seats, a dashboard, a steering wheel and a driver, plus indicators, sills, wipers, exhausts and more',
    'Drivers honk and shout at Wally when he blocks the road, and sometimes climb out after a crash to argue',
    'Cars knock lamp posts over',
    '10 new weapons: Frying Pan, Claymore, Battle Bagpipes, Wally Laser, Gatling Blaster, Long Scope, Super Soaker, Tattie Gun, Haggis Launcher and Dragon\'s Breath',
    'Ammo crates top up all your guns, and the mouse wheel switches weapons',
  ]],
  ['1.8', [
    'New intro: a UFO swoops over Wallypool and beams Wally down outside his flat (tap or press any key to skip)',
  ]],
  ['1.7', [
    'Touch controls: the PUNCH/FIRE button now sits right beside the red Q (Wally Power) button',
  ]],
  ['1.6', [
    'Touch controls: the PUNCH/FIRE button now sits right next to the movement stick, so your left thumb fires while your right thumb aims',
  ]],
  ['1.5', [
    'Touch aiming: hold AIM (or FIRE) and drag your thumb to move the aim',
    'On phones, aiming locks gently onto the nearest person in front of you (the crosshair turns red)',
  ]],
  ['1.4', [
    'Cars are solid: Wally and pedestrians can no longer walk through them',
    'You can stand on car roofs (fly onto one with Wally Power)',
  ]],
  ['1.3', [
    'Carjacking: Wally opens the door, drags the driver out and punches them before driving off',
    'Every car now has an opening driver\'s door',
    "Weather that changes as you play: Braw, Dreich, Pishin' doon, Blawin' a hoolie (with thunder and lightning), the Haar and snow",
    'Wet roads look shiny and are slippier, and snow is slippier still',
    'Graphics now start on High on every device, phones included (switch to Low on the title screen if needed)',
  ]],
  ['1.2', [
    'Wally (and everyone else) now has proper hands with fingers and thumbs',
    'Weapons to find around town, in different places every game: Golf Club, Wally Blaster, Scatter Blaster and Neep Grenades',
    'You can hear the engines of the cars around you while walking',
    'More detail: brick and paving relief, contact shadows, shop awnings, fuller trees, manhole covers, clouds, rippling sea and a colour grade',
  ]],
  ['1.1', [
    'Version numbers on the title and pause screens',
    'New first mission: Special Delivery. Find the Pamazon van with your GPS and deliver 10 parcels in 5 minutes',
    'GPS route on the radar',
    'The cape no longer clips through Wally\'s suit',
    'Touch controls: the stick now sits beside the map, and ENTER is now ENTER/LEAVE',
  ]],
  ['1.0', ['First release of Wally Theft Auto']],
];
