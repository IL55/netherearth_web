---
tags:
- adr
---
# ADR 7. BabylonJS NullEngine for headless unit tests

Date: 2026-05-20

## Status

Accepted

## Context

The game logic in `game/` is pure TypeScript and can be tested without a browser. However, some view-layer code instantiates BabylonJS objects (scenes, meshes) that normally require a WebGL context. CI runs on headless Linux runners with no GPU.

## Decision

Tests use BabylonJS's built-in `NullEngine` where a BabylonJS engine instance is required. `NullEngine` satisfies the full BabylonJS engine API without a WebGL context, so view-layer tests can create scenes and meshes without a browser or GPU. Pure model tests (`game/` and `data/`) require no engine at all.

## Consequences

- The full test suite runs with `npm test` in any environment, including CI, with no browser or GPU dependency.
- `NullEngine` does not render pixels, so visual correctness cannot be verified by tests — only logic and state are asserted.
- Tests must instantiate and dispose engines explicitly to avoid resource leaks across test cases.