---
tags:
- adr
---
# ADR 6. Differential renderer with per-object-id state cache

Date: 2026-05-20

## Status

Accepted

## Context

The game map contains many tiles, robots, factories, and warbases. Rebuilding all meshes on every render tick (100 ms) would be expensive and cause visible frame-rate issues. A naive full-rebuild approach does not scale with map size.

## Decision

`view/map/renderer.ts` uses a differential strategy: it maintains a cache keyed by object `id` that stores the last-rendered state of each object. On each `render(warMap)` call only objects whose state has changed since the last render are rebuilt. Unchanged objects reuse their existing meshes.

## Consequences

- The per-frame render cost is proportional to the number of changed objects, not total map size. For a typical game tick only a handful of robots and projectiles change.
- Object identity (`id`) is stable for the lifetime of an object; adding or removing an object is handled cleanly by cache insertion or eviction.
- The duplicate-tile bug (BACKLOG M6) is a consequence of this design: if a tile with a known id is pushed to `warMap.tiles` a second time, the cache treats it as unchanged and skips the mesh, but `buildOccupancy` still processes both entries.
- The ship, projectiles, and HUD have their own dedicated renderers with similar differential logic, all coordinated by the `tick:sub` handler in `GameSession`.