# Wally Theft Auto

- Every update gets a new version number, going up by 0.1 (1.1, 1.2, 1.3...). Bump `VERSION` in `js/version.js`, add the update's changes to the top of `CHANGES`, and add the same summary to the Versions list in `README.md`.
- Mention the new version number in the commit message and the pull request title.
- Files in `js/` are loaded through the version-stamped loader at the bottom of `index.html`. If you add a new file to `js/`, add its name to the `files` list there, or it can be served stale from the browser cache.
