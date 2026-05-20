---
tags:
- adr
---
# ADR 2. MVC layering with a pure game model

Date: 2026-05-20

## Status

Accepted

## Context

The game requires both a simulation engine (AI, physics, combat, resources) and a 3D renderer (BabylonJS). Mixing simulation and rendering code in the same modules makes the logic hard to test — BabylonJS requires a WebGL context, which is unavailable in most CI environments.

## Decision

We enforce a strict three-layer separation:

| Layer | Location | Constraint |
|---|---|---|
| **Model** | `game/`, `data/` | Pure TypeScript. Zero BabylonJS imports, zero DOM access. |
| **View** | `view/` | Reads game state and renders with BabylonJS. Must not mutate game logic. |
| **Controller** | `main.ts`, `game-session.ts`, `controls/` | Wires model and view, handles input, owns lifecycle. |

The model layer emits typed events via the event bus; the view layer subscribes to those events. Neither layer holds a direct reference to the other.

## Consequences

- The entire `game/` directory can be tested with plain Vitest (no browser, no GPU) by virtue of having zero BabylonJS imports.
- Adding or changing rendering code never risks breaking simulation correctness.
- Player-driven mutations (goal changes, manual control) must live in `game/robot-mutations.ts`, not in `view/`.
- The boundary is occasionally blurred at low severity (e.g., `construction-yard-3d.ts` calls `deductSelectionCost` directly); these are tracked as technical debt.