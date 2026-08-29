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

This is deliberately a vertical slice rather than a complete game. More worlds, a proper level editor and asynchronous challenges belong in later passes.

## Local saves

Courses, named layouts and personal bests are stored in IndexedDB in the current browser. They survive ordinary refreshes and restarts, but they are deliberately device-local: another browser, phone or web origin has its own save data. In particular, layouts created on a Live Server address will not automatically appear on the eventual production website.

Canonical level definitions live only in `levels.js`. Saved player state stores the level ID, independent Hare/Tortoise unlock results, scores and player-placed pieces; it does not duplicate level geometry or scoring rules. That leaves a clean route to hosted Candy Crush-style progression later: a service can own player identity and the two global leaderboards while every client continues to use the same versioned level catalogue. Golden Hedgehog results remain a separate filter/category.
