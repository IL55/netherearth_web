# game

Game state layer — the live, mutable state of the world. No BabylonJS imports.

- `warmap.ts` — `WarObject` and `WarMap` types, plus `createWarMap()` which converts a static `MapData` into a live game map

## Concepts

**`WarMap`** is the single source of truth at runtime. It starts from the static `.map` file and then evolves as the game progresses — objects move, change owner, are created or destroyed.

**`WarObject`** represents any entity on the map: tiles, factories, warbases, robots, walls. Each has a stable `id` so the renderer can diff and only redraw what changed.

## Future

Mutation helpers will live here: `moveRobot()`, `changeOwner()`, `destroyObject()`, `spawnRobot()`, etc.
Event-driven updates from the server will apply to `WarMap`, and the draw layer re-renders only the affected objects.
