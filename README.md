# Hare & Tortoise — playable prototype

A small browser proof-of-concept based on James Poole's 2012 Sarcastic Hedgehog design.

## Run it

Open `index.html` directly, or use VS Code Live Server. No build step, account, network connection, purchased audio, or external library is required.

## Included in this first pass

- Separate Hare and Tortoise course layouts
- Opposing fastest/longest scoring objectives
- Placeable, draggable and rotatable platforms, ramps and springs
- Deterministic fixed-step local physics: unchanged layouts repeat exactly
- No Tortoise time limit; a valid journey may keep running until it reaches the goal
- Piece fatigue to prevent endless scoring loops
- Carrot and Golden Hedgehog bonus objects
- Best scores, star ratings, synthesized sound and responsive touch controls

This is deliberately a vertical slice rather than a complete game. Progression, more worlds, a proper level editor and asynchronous challenges belong in later passes.
