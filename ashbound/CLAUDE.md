# ASHBOUND: Survive the Eruption

- Every update gets a new version number, going up by 0.1 (1.1, 1.2, 1.3...). Bump `VERSION` in `js/version.js`, add the update's changes to the top of `CHANGES`, and add the same summary to the Versions list in `README.md`.
- Mention the new version number in the commit message and the pull request title.
- Files in `js/` are loaded through the version-stamped loader at the bottom of `index.html`. If you add a new file to `js/`, add its name to the `files` list there, or it can be served stale from the browser cache.
- Everything is generated in code (terrain, textures, models, sound). No asset downloads at runtime; Three.js is bundled in `lib/`.
- The game must stay playable on phones (touch), PC and Mac (keyboard and mouse) and on game controllers. Test the Low graphics setting as well as High.
- `window.ASH` exposes the live game objects for debugging and automated tests (`ASH.game`, `ASH.player`, `ASH.volcano`, `ASH.npcs`, `ASH.props`, `ASH.world`).
