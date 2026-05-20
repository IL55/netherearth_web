---
tags:
- adr
---
# ADR 8. Sub-tick / game-tick split (100 ms / 500 ms)

Date: 2026-05-20

## Status

Accepted

## Context

The game needs smooth visual updates (projectile motion, ship movement, HUD refresh) at a high frequency, but the AI and game-logic loop is expensive and should not run on every visual frame. Running AI on every render tick would waste CPU; running rendering at the slower AI cadence would make movement look choppy.

## Decision

The clock (`game/clock.ts`) drives a `setInterval` at 100 ms (the **sub-tick**). Every fifth sub-tick triggers a full **game tick** (500 ms):

```
setInterval(100ms)
  ├─ subTick === 0 → gameTick()    ← AI, capture, resources, build, victory
  │     bus.emit('tick:game')
  ├─ advanceProjectiles()
  └─ bus.emit('tick:sub')          ← renderer, ship physics, trigger checks, HUD
```

`SUB_TICKS = 5` is the ratio constant defined in `game/mechanics/projectile.ts`.

## Consequences

- Visual updates (rendering, ship movement, projectiles) run at 10 Hz; AI and game logic run at 2 Hz. Both rates are configurable by changing `SUB_TICKS`.
- Projectile advancement runs on every sub-tick for smooth motion even though AI fires weapons only on game ticks.
- Proximity trigger checks (construction yard, robot control) also fire on sub-ticks, which is more frequent than necessary; moving them to `tick:game` is noted as a medium-priority improvement in the architecture TODO.
- The `tick:sub` handler in `GameSession` currently coordinates ship physics, trigger checks, rendering, and HUD updates in a single handler; extracting per-concern handlers is a tracked improvement.