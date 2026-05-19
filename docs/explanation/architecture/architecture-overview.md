---
title: Architecture Overview
---

# Architecture Overview

See the detailed architecture document in the source repository:
[`netherearth_web-ui/src/babylon/README.md`](../../netherearth_web-ui/src/babylon/README.md).

## Layer summary

| Layer | Location | Rule |
|---|---|---|
| **Model** | `game/`, `data/` | Pure state and simulation. Zero BabylonJS, zero DOM. |
| **View** | `view/` | Reads state, renders with BabylonJS. Must not mutate game logic. |
| **Controller** | `main.ts`, `game-session.ts`, `controls/` | Wires M↔V, handles input, owns lifecycle. |

## Tick architecture

```
setInterval(100ms)                ← sub-tick
  │
  ├─ subTick === 0 → gameTick()   ← full game tick (every 500ms)
  │     AI loop → apply actions
  │     tickCapture, tickResources, tickBuild
  │     checkVictory → bus.emit('game:over')
  │
  ├─ advanceProjectiles()
  └─ bus.emit('tick:sub')         ← renderer + ship + UI
```

## Key event bus events

| Event | When |
|---|---|
| `tick:sub` | every 100 ms |
| `tick:game` | every 500 ms |
| `game:over` | on victory/defeat |
| `game:start` | after map load |
| `game:new-map` | NEW GAME button |
| `sound:play` | weapon fire, explosions, UI |
