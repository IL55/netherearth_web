# game

Game state layer — the live, mutable state of the world. No BabylonJS imports.

- `core/warmap.ts` — `WarObject` and `WarMap` types, plus `createWarMap()` which converts a static `MapData` into a live game map

## Directories

- `actions/` — Player/AI actions (move, rotate, fire) and their application logic
- `ai/` — Navigation and combat logic for autonomous robots
- `core/` — Core map and terrain representation
- `mechanics/` — Game rules (building, capturing, destroying objects)
- `ship/` — Movement and collision logic for the player's ship
- `types/` — Shared enum and type definitions

## Concepts

**`WarMap`** is the single source of truth at runtime. It starts from the static `.map` file and then evolves as the game progresses — objects move, change owner, are created or destroyed.

**`WarObject`** represents any entity on the map: tiles, factories, warbases, robots, walls. Each has a stable `id` so the renderer can diff and only redraw what changed.

## Architecture

Mutation helpers are split between `mechanics/` and `actions/`.
Event-driven updates apply to `WarMap`, and the rendering layer re-renders only the affected objects.
