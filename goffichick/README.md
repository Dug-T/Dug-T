# GOFFICHICK

A gothic, retro first-person shooter in the style of the classic 90s shooters. It runs in any
browser with no install and no build step: open `index.html`.

> *The world has become unbearably cheerful. Goffichick is here to fix that.*

![Enemies](assets/screenshot-enemies.png)

## Play

Open `goffichick/index.html` in a browser (double-click works, since all art is embedded).

| Keys | Action |
|---|---|
| WASD / arrow keys | Move / turn |
| Mouse | Look (click the game to lock the mouse) |
| Left click / Ctrl | Fire |
| E / Space | Press switches, open secret walls (doors open by themselves) |
| 1-7, Q, mouse wheel | Change weapon |
| Shift | Run |
| Tab | Automap |
| M | Music on/off |
| Esc / P | Pause |

On a phone or tablet, touch controls appear: the left stick moves, drag on the right side to look,
and there are FIRE / USE / WPN / MAP buttons.

**Cheats** (type them while playing): `gothmode` (god mode), `allblack` (every weapon, full ammo),
`nightfall` (skip the level).

## The heroine

**Goffichick** — The HUD face is her photo. It glances around, gets bloodier as she takes damage,
flinches when hit, and her eyes glow pink when she picks up a new weapon.

## Enemies

| Map letter | Enemy | Role (classic shooter equivalent) | Attack |
|---|---|---|---|
| `z` | **Latte Zombie** | Weak grunt | Flings scalding pumpkin-spice latte (hitscan) |
| `m` | **Middle Manager** | Fireball thrower | Hurls flaming memos, claws up close |
| `w` | **WALLY MAN** | Mid-tier soldier | Fires a 3-way spread of "reply-all" notifications from his phone |
| `b` | **Gym Brute** | Fast charging melee demon | Bites. Hard. |
| `i` | **Influencer Skull** | Flying kamikaze skull | Haloed by its ring light, dive-bombs you |
| `h` | **Smiley Orb** | Floating heavy | One eye, too many teeth, spits sunshine balls |
| `K` | **WALLY PRIME** | Final boss | Golden, red-eyed giant Wally. Exploding phones and notification barrages. Gets angrier below half health |
| `y` | Pumpkin-Spice Barrel | Explosive barrel | Shoot it near enemies |

## Weapons

| Slot | Weapon | Ammo | Notes |
|---|---|---|---|
| 1 | **Spiked Knuckles** | none | Melee |
| 2 | **Hex Pistol** | bullets | First shot is pinpoint accurate |
| 3 | **Shotgun** | shells | Pump-action, 7 pellets |
| 3 | **Coffin Shotgun** | 2 shells | Double barrel, 20 pellets, coffin-shaped stock with a silver bat |
| 4 | **Machine Gun** | bullets | Fast, fully automatic |
| 4 | **Bone Gatling** | bullets | Rotating bone barrels |
| 5 | **Rocket Launcher** | rockets | Big splash damage, including to you |
| 5 | **Skull Launcher** | skulls | Explosive flaming skulls |
| 6 | **Hexcaster** | souls | Rapid-fire purple plasma |
| 7 | **B.F.G. (Big Freakin' Gloom)** | 40 souls | Charges, then fires a gloom orb. On impact it also hits everything in front of you |

## Levels

Press a number again to swap between two weapons in the same slot.

Levels have doors that open as you approach, secret walls (press USE on suspicious walls), toxic
glitter-slime that burns, and dark rooms with flickering lights.


1. **E1M1: The Cemetery Gates** — start room, zig-zag hall, a big courtyard with a slime pool and armor on an island, a dark crypt with ambush alcoves, a stained-glass chapel, a hidden machine-gun stash, and a winding route to the exit
2. **E1M2: Cubicle Hell** — an office of smiley-face wallpaper and motivational posters
3. **E1M3: Wally's Penthouse** — marble, Wally shrines and the boss fight

## Project layout

```
index.html          page + touch controls
js/game.js          raycasting engine, AI, combat, HUD, game flow (ENEMY_DEFS, PROJECTILES)
js/weapons.js       WEAPONS + AMMO_TYPES, with first-person weapon art
js/sprites.js       enemy / item / decoration / effect art (canvas-drawn) + Wally Man frames
js/textures.js      wall, floor and ceiling textures
js/levels.js        maps and the map legend
js/audio.js         synthesized sound effects and music (WebAudio)
js/photo-data.js    the two photos, processed and embedded so the game works from file://
assets/             the processed photo assets (Wally Man cut-out, HUD faces, title image)
```

## Adding more weapons

Weapons are data-driven. The top of `js/weapons.js` explains each field in detail. In short:

1. Add an entry to `WEAPONS` with a `slot`, `name`, `ammo`, `cooldown`, a `type`
   (`melee`, `hitscan` or `projectile`) and a `draw()` function for the first-person view.
2. For a projectile weapon, add a projectile to `PROJECTILES` in `js/game.js` and its sprite to
   `S.proj` in `js/sprites.js`.
3. Add a pickup: a letter in `ITEM_TYPES` (`js/levels.js`) and a sprite in `S.item` (`js/sprites.js`),
   then put that letter somewhere on a map.

The HUD, weapon switching, ammo and pickups all handle the new weapon automatically.

## Adding enemies or levels

- **Enemy:** add stats to `ENEMY_DEFS` in `js/game.js`, art to `build()` in `js/sprites.js`
  (walk ×2 and attack frames; pain and death frames are generated), and a letter in `ENEMY_CHARS`.
- **Level:** add an entry to `LEVELS` in `js/levels.js`. Every row must be the same width, and the
  map needs a player start (`>`), plus an `X` exit switch on a wall (or `boss: true`).
