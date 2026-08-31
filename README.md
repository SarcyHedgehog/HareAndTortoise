# Hare & Tortoise — playable prototype

A small browser proof-of-concept based on James Poole's 2012 Sarcastic Hedgehog design.

## Run it

Open `index.html` directly, or use VS Code Live Server. No build step, account, network connection, purchased audio, or external library is required.

## Included in this pass

- Three canonical Green Meadows levels, selected from the level strip
- Independent Hare and Tortoise progression: beat par to unlock the next level on that trail
- Per-level par and one-, two- and three-star thresholds held in `levels.js`
- Permanent level geometry that does not consume inventory, including solid green blocks and crate walls
- Separate Hare and Tortoise course layouts
- Opposing fastest/longest scoring objectives
- Placeable, draggable and rotatable platforms, ramps, springs and compact green pipe elbows
- Deterministic fixed-step local physics: unchanged layouts repeat exactly
- No Tortoise time limit; a valid journey may keep running until it reaches the goal
- Piece fatigue to prevent endless scoring loops
- Obvious carrot clock effects (icy freeze for Hare, fiery double speed for Tortoise) without changing sphere velocity or trajectory
- Golden Hedgehog secondary challenges
- Device-local recovery of the current Hare and Tortoise courses
- Named layouts with load, rename, duplicate and delete controls
- Separate personal bests for each trail, including Golden Hedgehog runs
- Star ratings, synthesized sound and responsive touch controls
- Landscape-first tablet and phone presentation with a full-size playfield, compact touch shed and portrait rotation prompt
- Desktop level workshop at `editor.html`, with canvas placement, separate Hare/Tortoise starting layouts, scoring, inventory, background choice, local drafts and JSON import/export
- Clubhouse lobby with separate Hare/Tortoise map progress, per-level overall and Golden Hedgehog group records, a record-holder summary and group create/join/leave/rejoin flows

This is deliberately a vertical slice rather than a complete game. More worlds, editor play-testing and asynchronous challenges belong in later passes.

## Level workshop

Open `editor.html` through the same Live Server as the game. Existing levels can be loaded as starting points. The editor treats the piece counts as pieces available in addition to the starting layout, and exports a single package containing the world reference and canonical level definition. Backgrounds can use the procedural meadow preset or an image URL; the game falls back to the procedural meadow while an image is unavailable.

The canonical starting layout is shared by the Hare and Tortoise. Their timing rules, progress and player-edited courses remain independent, but both trails always begin with the same designed map. The editor imports older version-1 packages containing separate `starter.hare` and `starter.tortoise` arrays and converts them to one shared layout on export.

## Placement grid

Player pieces snap by their centre point to the pinboard grid while they are placed or dragged. The defaults are kept in `config.js`: change `placementGrid.size` to try a different spacing, set `enabled` to `false` to compare free placement, or set `showDots` to `false` to hide the guide. Existing saved layouts retain their original coordinates until an individual piece is moved, so changing the setting does not silently alter old courses.

## Local saves

Courses, named layouts and personal bests are stored in IndexedDB in the current browser. They survive ordinary refreshes and restarts, but they are deliberately device-local: another browser, phone or web origin has its own save data. In particular, layouts created on a Live Server address will not automatically appear on the eventual production website.

Canonical level definitions live only in `levels.js`. Saved player state stores the level ID, independent Hare/Tortoise unlock results, scores and player-placed pieces; it does not duplicate level geometry or scoring rules. That leaves a clean route to hosted Candy Crush-style progression later: a service can own player identity and the two global leaderboards while every client continues to use the same versioned level catalogue. Golden Hedgehog results remain a separate filter/category.

The clubhouse uses the protected PHP score service hosted at `www.ariolasoft.com/hare-and-tortoise-api/` for device identities, group membership and per-level group records. Overall and Golden Hedgehog results form two challenges; the Hare rewards the fastest successful time and the Tortoise the slowest. It falls back to personal local records when offline. `lobby.js` sends only the player name, stable device identity and canonical level results; private course drafts and named layouts are never uploaded.
