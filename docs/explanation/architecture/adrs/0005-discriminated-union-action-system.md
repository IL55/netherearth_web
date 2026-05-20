---
tags:
- adr
---
# ADR 5. Discriminated-union action system as the sole robot mutation path

Date: 2026-05-20

## Status

Accepted

## Context

Robot state (position, facing, health, combat) is mutated by both the AI loop and player input. Without a single, controlled mutation path it is easy for the view layer or other subsystems to modify robot state directly, bypassing validation and making the simulation non-deterministic.

## Decision

`RobotAction` is a discriminated union (`MOVE | ROTATE | FIRE | DETONATE | IDLE`). It is the only legal way to change a robot's position or trigger combat. `applyAction()` dispatches to the appropriate apply function (`applyMove`, `applyRotate`, `applyFire`, `applyNuclear`). Both the AI loop and the player-control panel produce `RobotAction` values; neither mutates robot fields directly.

## Consequences

- All robot state transitions are auditable in one place (`game/actions/`).
- The AI and the player use the same action pipeline, so bugs in movement or combat are caught regardless of source.
- New robot behaviours must be expressed as new action types or new apply functions, not as ad-hoc field mutations scattered across the codebase.
- Action replay or undo could be added in the future by recording the action stream.