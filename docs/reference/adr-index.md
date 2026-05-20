---
icon: lucide/cog
title: ADRs
---
# Architecture Decision Records index

This page lists all Architecture Decision Records (ADRs) for this project.

ADRs capture important architectural and technical decisions, including their context, rationale, and consequences.

## Status values

A decision may be **"proposed"** if the project stakeholders haven't agreed with it yet, or **"accepted"** once it is agreed. If a later ADR changes or reverses a decision, it may be marked as **"deprecated"** or **"superseded"** with a reference to its replacement.

## ADRs list

| ADR | Title | Status | Date | Supersedes | Superseded by |
|---|---|---|---|---|---|
| [ADR-0001](../explanation/architecture/adrs/0001-record-architecture-decisions.md) | Record architecture decisions | Accepted | 2026-05-19 | - | - |
| [ADR-0002](../explanation/architecture/adrs/0002-mvc-layering-pure-game-model.md) | MVC layering with a pure game model | Accepted | 2026-05-20 | - | - |
| [ADR-0003](../explanation/architecture/adrs/0003-tech-stack-vue3-babylonjs-typescript.md) | Tech stack: Vue 3, BabylonJS 8, TypeScript, Vite | Accepted | 2026-05-20 | - | - |
| [ADR-0004](../explanation/architecture/adrs/0004-event-bus-as-model-view-boundary.md) | Typed event bus as the formal model-to-view boundary | Accepted | 2026-05-20 | - | - |
| [ADR-0005](../explanation/architecture/adrs/0005-discriminated-union-action-system.md) | Discriminated-union action system as the sole robot mutation path | Accepted | 2026-05-20 | - | - |
| [ADR-0006](../explanation/architecture/adrs/0006-differential-renderer.md) | Differential renderer with per-object-id state cache | Accepted | 2026-05-20 | - | - |
| [ADR-0007](../explanation/architecture/adrs/0007-nullengine-headless-tests.md) | BabylonJS NullEngine for headless unit tests | Accepted | 2026-05-20 | - | - |
| [ADR-0008](../explanation/architecture/adrs/0008-sub-tick-game-tick-split.md) | Sub-tick / game-tick split (100 ms / 500 ms) | Accepted | 2026-05-20 | - | - |
| [ADR-0009](../explanation/architecture/adrs/0009-vite-base-url-github-pages.md) | Vite base URL set to `/netherearth_web/` for GitHub Pages | Accepted | 2026-05-20 | - | - |

## Conventions

- ADRs are numbered sequentially.
- Numbers are never reused.
- Superseded ADRs remain in the repository for historical context.
- New ADRs should be added to this index when created.
