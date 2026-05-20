---
tags:
- adr
---
# ADR 3. Tech stack: Vue 3, BabylonJS 8, TypeScript, Vite

Date: 2026-05-20

## Status

Accepted

## Context

The game runs entirely in the browser and needs a reactive UI layer (menus, HUD, construction panels), a capable 3D engine, and a type-safe language to manage a non-trivial game simulation. The project targets GitHub Pages with no backend.

## Decision

- **Vue 3 + Pinia** for reactive UI and component state management.
- **BabylonJS 8** as the 3D engine for scene management, mesh rendering, cameras, and input.
- **TypeScript** for the entire codebase — strict mode.
- **Vite** as the build tool and dev server.
- **Vitest** as the test runner, with BabylonJS `NullEngine` for headless model tests.

## Consequences

- BabylonJS provides a `NullEngine` that satisfies the engine API without WebGL, enabling CI unit tests for view-layer code that does require an engine instance.
- Vue reactivity is used for HUD data and menu state; BabylonJS owns the canvas and 3D scene directly.
- Vite's fast HMR makes the development loop quick despite the large BabylonJS bundle.
- The BabylonJS bundle is substantial; tree-shaking is relied upon to keep the shipped bundle manageable.