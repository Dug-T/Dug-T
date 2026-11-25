# ASHBOUND: SURVIVE THE ERUPTION

*“The island is paradise. The mountain has other plans.”*

An open-world island survival game for the browser, played in third person. You are stranded on a tropical island with a volcano that is waking up. Before the final pyroclastic surge you have to find a way off the island, or a way to live through it.

Open `ashbound/index.html` from any web server (GitHub Pages works). Nothing needs installing: Three.js is bundled in `lib/`, and the island, its textures, the characters and every sound are generated in code. It plays on phones (touch controls, landscape), on PC and Mac (keyboard and mouse) and with game controllers.

## The game

- **The island**: a procedurally built tropical island, the same one every time, with white beaches, a reef, dense palm jungle, hibiscus, cliffs to the west, a fishing village, a plane wreck, a ranger station with a lookout tower and helipad, a jungle spring, a rock pool and a 1943 bunker dug into a hillside. The volcano fills the north of the island.
- **The eruption**: the clock in the corner counts down to the surge. The mountain moves through five stages: **Calm** (steam and birdsong), **Unrest** (tremors, a darkening plume, the birds leave), **Ashfall** (the sky goes dark, ash fills the air and your lungs), **Eruption** (lava bombs whistle down, lava flows pour down the valleys, forest fires) and the **Pyroclastic surge** that rolls over the whole island. The sun goes from morning to a red dusk as it happens.
- **Survival**: health, stamina, hunger, thirst and clean air. Eat coconuts, bananas and mangos, drink at the well, the spring or the rock pool (and fill your canteen), and wear an ash mask or get under a roof when the ash falls. Sprinting, swimming and the heat all take their toll. Lava bombs, lava, falls and drowning hurt.
- **The jeep**: the survey team's jeep is parked by the camp with the keys in it. It seats you and three followers, has headlights for the ash and the dusk, won't swim or climb cliffs, stops dead against palms, and lava or a falling rock will wreck it.
- **Crafting**: braid vines into rope, make a stone axe (then chop palms for logs), make an ash mask from cloth, and bandages.
- **Four ways out**:
  - ⛵ **The raft**: 10 logs, 3 ropes and the tarpaulin from the plane wreck. Build it in stages on Raft Beach, launch it, and paddle out past the reef.
  - 🚤 **The skiff**: Kai's boat lies by the village jetty. Patch it with two logs and a rope, fit the plane's battery, and motor out past the reef, fast but the battery is the same one the radio needs.
  - 📡 **The radio**: find the battery (in the nose of the plane), the antenna (the snapped mast at the ranger tower) and the handset (the village radio hut). Repair the ranger radio and a helicopter comes to the helipad. Be on the pad when it lands.
  - 🚪 **The bunker**: stock the old shelter with four waters, four meals and an ash mask, then seal the steel door and wait out the surge.
- **Voices and subtitles**: the survivors speak their lines, the narrator reads the stage warnings and endings, and everything spoken is also shown as text, so the game plays fully with the sound off and for players who are deaf or hard of hearing. Voices use the speech built into your phone or computer and can be switched off.
- **The other survivors**: Dr Amara Osei (volcanologist, at the camp), Kai Tane (fisherman, in the village), Tomas Reyes (the injured pilot at the wreck, who needs a bandage before he can walk), Lena Hart (the ranger) and Old Pete (the hermit at the bunker). Each has their own advice as the stages change. Talk to them, then press again and they follow you. Anyone with you when you launch, lift off or seal the door is saved; the end screen counts them.
- **Pace**: Relaxed (40 minutes to the surge), Standard (24, temporarily 5 while testing) or Hardcore (14, and everything hurts more).
- **Graphics**: High (soft shadows, bloom, more jungle) or Low for older phones. The island, sea and sky are shader-driven: wet sand, breakers along the shore, a drifting eruption column and ash that greys the whole world out.
- The game saves itself as you play and from the pause menu; **CONTINUE** on the title screen picks it back up.

## Controls

| Action | Keyboard / mouse | Phone | Controller |
|---|---|---|---|
| Move | WASD or arrows | Left stick | Left stick |
| Look | Mouse (click the game first) | Small stick, or drag the right of the screen | Right stick |
| Sprint | Shift | SPRINT | LT |
| Jump | Space | JUMP | A |
| Use / pick up / talk / chop (hold) | E or left click | USE | Y or RT |
| Crafting | C | CRAFT | X |
| Map | M or Tab | MAP | LB |
| Eat / drink / use item | 1 – 8, or click the item | Tap the item | — |
| Camera distance | V | CAM | R3 |
| Drive the jeep | W / S, A / D, Space brake | Stick, JUMP brake | Left stick, A brake |
| Pause | Esc or P | II | Start |

## Multiplayer

Version 1.0 is single player with NPC survivors. The world is seeded and deterministic (every player gets the same island), the game state is kept in plain objects (`ASH.game`, `ASH.player`, NPC states) and inputs are reduced to a small set of actions, so a later version can sync players over the network without rebuilding the game.

## Versions

- **1.8**: Kai's skiff: repair it with the battery, two logs and a rope and motor past the reef, a fourth ending; the battery is now a choice between the skiff and the radio.
- **1.7**: spoken voices for the survivors, the narrator and the player, using the device's built-in speech, with every line still shown as text; VOICES switch on the title and pause screens.
- **1.6**: trunks bend with their crowns in gusting wind; ash greys the jungle and buildings; sea glints, lava glow on the water and steam where flows meet it; crater glow, fireflies at dusk, blowing leaves; chromatic aberration and per-stage colour tints.
- **1.5**: fixed the jeep's suspension leaning the wrong way on side slopes; each wheel now follows the ground under it.
- **1.4**: the survey jeep (drive, passengers, headlights, damage, drowning); luminous pulsing lava with ground glow and lights on the fronts and bombs; heat haze, sun shafts, volcanic lightning with thunder, stars at dusk.
- **1.3**: start at the foot of the volcano; 12 slow, staggered lava flows all round the cone; many more hot rocks and debris that kill survivors too; a billowing eruption plume with bursts; stride-driven walking and slope tilt so nobody floats; terrain bump detail, cloud shadows, seabed caustics, grass tufts, sun glare, seagulls, dust and spray, and a film-grade post pass on High.
- **1.2**: every character is one skinned mesh with blended joints and far more detail (fingers, kneecaps, collars, soles, eyes with lids); reworked walk, run, idle, sit, talk, chop and a proper front-crawl swim; Standard pace temporarily 5 minutes for testing.
- **1.1**: fixed left/right movement being mirrored on the joystick, keyboard, controller and raft; fixed the mirrored compass and map (north is up); FPS counter shown under the stat bars, with a switch in the pause menu.
- **1.0**: first release. A procedurally built tropical island with a live volcano; third-person survival with health, stamina, hunger, thirst and clean air; the five eruption stages (calm, unrest, ashfall, eruption, surge); three escapes (raft, radio and helicopter, bunker); five survivors to find, help and bring along; phone, PC/Mac and controller support.
