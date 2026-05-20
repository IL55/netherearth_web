# Backlog

Findings from project review (2026-05-19). Ordered by priority within each severity group.

---

## High

### ~~H1 — `data/map.ts`: no `response.ok` check + no tests~~ ✓ Done

`loadMap` now throws a descriptive error on non-2xx responses.
Tests added in `__tests__/data/map.test.ts` (HTTP errors, dimensions, tiles, objects).

---

### ~~H2 — `game/save.ts:65`: robot IDs accumulate `loaded_` prefix on every load~~ ✓ Done

`applySave` now strips existing `loaded_` prefixes before applying a new one.
Round-trip tests added to `save.integration.test.ts` (1 cycle, 2 cycles, 3 cycles).

---

## Medium

### ~~M1 — `game/ai/fight.ts:160`: combat advance ignores terrain passability~~ ✓ Done

`isPassable()` now checked in the advance branch of `fightAction`.
Test added in `fight.test.ts` (impassable HOLE tile blocks advance toward enemy).

---

### ~~M2 — `game/mechanics/build.ts:203`: `_builtCount` not reset on `resetGame()`~~ ✓ Done

`_resetBuildState()` called from `resetGame()` in `game/reset.ts`.
`_resetManualBuildCount()` called in `game-session.ts` after `resetGame()`.

---

### ~~M3 — `data/map.ts` + `game/save.ts`: weak internal types~~ ✓ Done

- `MapData.objects` now uses `MapDataObject` interface (typed optional fields).
- `GameSave.resources` now typed as `OwnerResources` (from `./resources`).

---

### ~~M4 — `game/mechanics/build.ts`: dead RED-owner branch + untested scoring~~ ✓ Done

`BUILD_COOLDOWN_RED` and the dead ternary removed from `tickBuild`.
`scoreBuildOption` and late-game `chooseBuildGoal` paths already covered by
existing tests in `build.test.ts`.

---

### ~~M5 — `view/robot-control/robot-control-3d.ts:265`: `loadKeyBindings()` on every keypress~~ ✓ Done

`loadKeyBindings()` now called once in `attachKeys()` and stored in `this.keyBindings`.
Cleared in `detachKeys()`.

---

### ~~M6 — `game/mechanics/kill-terrain.ts:42`: duplicate wall tile on repeated kill at same cell~~ ✓ Done

Guard added: wall is only pushed if no tile with the same id already exists.
Test added in `kill-terrain.test.ts` (pre-existing wall scenario).

---

### ~~M7 — `game/ai/nuclear.ts`: no test for friendly-structure-only scenario~~ ✓ Done

Test already present in `nuclear.test.ts`: "returns false if only friendly structures
intersect 3x3 zone".

---

## Low

### L1 — Dead code to remove

| File | Symbol | Reason |
|---|---|---|
| `game/types/nav-state.ts:14` | `stuckCheckDist?` | Never written or read in production |
| `game/ai/bug2.ts:101` | `nav.wallFollowStartDist` | Written on wall-follow entry, never read |
| `game/core/occupancy.ts:178` | `export function key(x, y)` | Never imported outside tests |

---

### L2 — TypeScript loose types

| File | Issue |
|---|---|
| `game/core/occupancy.ts:26` | `Partial<Record<string, AABBDef[]>>` → `Partial<Record<ObjectType, AABBDef[]>>` |
| `view/robot-control/constants.ts:14` | `Record<string, string>` → `Partial<Record<RobotGoal, string>>` |
| `game/event-bus.ts:18` | `Handler<any>[]` in internal map → `Handler<GameEvent>` |
| `view/construction-yard/construction-yard-3d.ts:254` | `(this.scene as any).activeCameras = null` → `scene.activeCamera = this.mainCamera` |
| `view/game-over.ts:62` | `(this.overlay as any).__title` → typed private field |

---

### L3 — `game/save.ts:37`: silent save failure

Save failures are caught and logged but the player gets no feedback. The save button
appears to succeed even when `localStorage` quota is exceeded.

**Fix:** return `boolean` from `saveGame` and surface the error in the UI.

---

### L4 — `game/mechanics/nuclear.ts`: JSDoc says 10%, code is 5%

`NUKE_DETONATE_CHANCE = 0.05` — the JSDoc block at the top says "10% per tick".
Update the comment to say "5% per tick (~10% per second at 500ms game ticks)".

---

### L5 — `view/shared/models.ts:36`: debug `console.log` left in production

Fires on every model load. Remove or guard with `import.meta.env.DEV`.

---

### L6 — `game/event-bus.ts`: `off()` not covered by any test

A double-register + remove sequence is untested. Add a unit test for `off()`.

---

### L7 — `game/ship/movement.ts:29`: optional `vx`/`vy` read without narrowing

`ShipState.vx` and `vy` are optional but read as `const dx = ship.vx` after
conditional assignment. In practice always a number, but the type still allows
`undefined`. Make them required (`vx: number; vy: number`) in `ShipState`.

---

### L8 — `game/mechanics/build.ts`: `_builtCount` exported as `_resetBuildState`

The reset helper exists only for tests. Once M2 is fixed and it's called from
`resetGame()`, ensure the export is kept only for test use (rename to convey intent
or document it explicitly).

---

### L9 — Remove the `babylon/` nesting from `src/`

All source files live under `netherearth_web-ui/src/babylon/`. Since there is only
one engine and no plans for another, the folder adds a pointless path segment to
every import and every `__tests__` path.

**Fix:** move the contents of `src/babylon/` up to `src/` and update all import
paths, `tsconfig` path aliases, and test globs accordingly.
