---
tags:
- adr
---
# ADR 4. Typed event bus as the formal model-to-view boundary

Date: 2026-05-20

## Status

Accepted

## Context

The model layer must notify the view layer of state changes (tick elapsed, game over, new map loaded, sound triggers) without holding a direct reference to any BabylonJS object. A plain callback registry or direct method calls would create tight coupling between layers and make it hard to add or remove listeners independently.

## Decision

A typed singleton event bus (`game/event-bus.ts`) is the only formal channel through which the model communicates with the view. The bus exposes a `GameEvent` discriminated union; every emitted event carries a typed payload. The view subscribes to named events and the model emits them; neither layer imports the other's types directly.

Key events:

| Event | When |
|---|---|
| `tick:sub` | every 100 ms |
| `tick:game` | every 500 ms |
| `game:over` | on victory / defeat |
| `game:start` | after map load |
| `game:new-map` | NEW GAME button |
| `sound:play` | weapon fire, explosions, UI |

## Consequences

- The model can be tested in isolation: tests subscribe to bus events and assert on them without instantiating any BabylonJS objects.
- New view concerns (e.g., a new HUD widget) subscribe to existing events without modifying the model.
- All cross-layer communication is visible in one place (`GameEvent` union), making the event contract explicit and auditable.
- The bus is a singleton; tests that emit events must take care not to leave stale subscribers across test cases.