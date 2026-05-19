---
title: NetherEarth Web
icon: lucide/home
---

NetherEarth Web — browser-based 3D strategy game built with Vue 3, BabylonJS, and TypeScript.

---

## Overview

**NetherEarth Web** is a real-time strategy game running entirely in the browser. Players control a flying ship and command robot units across a tile-based map, capturing factories and warbases to win.

Refer to the:

- [ADRs](./reference/adr-index.md) for design decisions.
- [Architecture Overview](./explanation/architecture/architecture-overview.md) for system structure.

## Tech Stack

| Concern | Technology |
|---|---|
| Framework | Vue 3 + Pinia |
| 3D Engine | BabylonJS 8 |
| Language | TypeScript |
| Build | Vite |
| Tests | Vitest + NullEngine (no WebGL required) |

## Key Concepts

- **MVC architecture** — model (`game/`, `data/`) is pure TypeScript with zero BabylonJS imports; view (`view/`) renders with BabylonJS and must not mutate game state.
- **Event bus** — typed singleton (`game/event-bus.ts`) is the formal model→view boundary.
- **Action system** — discriminated-union `RobotAction` is the only legal way to mutate robot position or trigger combat.
- **Differential renderer** — `view/map/renderer.ts` caches per-object state and only rebuilds changed meshes each tick.
- **Headless tests** — BabylonJS `NullEngine` allows the full game model to be tested without a browser or GPU.
