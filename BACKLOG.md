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

### ~~L1 — Dead code removed~~ ✓ Done

- `stuckCheckDist?` removed from `nav-state.ts`
- `nav.wallFollowStartDist` write + `distToGoal` parameter removed from `bug2.ts`; call sites in `simple.ts` updated
- `export function key(x, y)` removed from `occupancy.ts`

---

### ~~L2 — TypeScript loose types fixed~~ ✓ Done

- `occupancy.ts`: `Record<string, AABBDef[]>` → `Record<ObjectType, AABBDef[]>`
- `constants.ts`: `Record<string, string>` → `Partial<Record<RobotGoal, string>>`
- `event-bus.ts`: `Handler<any>[]` → `Handler<GameEvent>[]` (with safe cast on store)
- `construction-yard-3d.ts`: `(this.scene as any).activeCameras = null` line removed
- `game-over.ts`: `(this.overlay as any).__title` → `private title: HTMLDivElement`

---

### ~~L3 — `game/save.ts:37`: silent save failure~~ ✓ Done

`saveGame` now returns `boolean`. `StartupMenu.onSave` updated to `() => boolean`.
On failure, a red "SAVE FAILED (storage full?)" toast is shown.

---

### ~~L4 — `game/mechanics/nuclear.ts`: JSDoc says 10%, code is 5%~~ ✓ Done

Comment updated to "5% per tick, ~10% per second at 500ms game ticks".

---

### ~~L5 — `view/shared/models.ts:36`: debug `console.log` left in production~~ ✓ Done

Guarded with `import.meta.env.DEV`.

---

### ~~L6 — `game/event-bus.ts`: `off()` not covered by any test~~ ✓ Done

`__tests__/game/event-bus.test.ts` created; covers `on/emit`, `off` isolation,
no-op off, and multi-handler scenarios.

---

### ~~L7 — `game/ship/movement.ts:29`: optional `vx`/`vy` read without narrowing~~ ✓ Done

`ShipState.vx`/`vy` made required. `movement.ts` simplified (no `!== undefined`
guards). All affected test and production sites updated.

---

### ~~L8 — `game/mechanics/build.ts`: `_resetBuildState` comment~~ ✓ Done

Comment updated to reflect it's now called from `resetGame()` as well as tests.

---

### ~~L9 — Remove the `babylon/` nesting from `src/`~~ ✓ Done

All files moved from `src/babylon/` up to `src/`. `babylon/main.ts` renamed to
`scene.ts` to avoid conflict with the Vue entry `src/main.ts`. No import path
updates were needed within the moved files (all relative imports remained valid).
`src/App.vue` import updated: `./babylon/main` → `./scene`.
Zero TS errors; 534 tests passing.

---

## Mobile (known gaps — 2026-05-26)

### MB1 — Camera rotation limited on mobile

The BabylonJS ArcRotateCamera relies on pointer events that are blocked by the
touch-zone overlay covering the right half of the screen (fire zone, z-index 5).
Only the dead-corner areas of the left half pass through to the camera.
Full camera rotation on mobile is not supported until the touch zones are
redesigned (e.g. smaller buttons, edge swipe strips, or a camera drag mode).

---

### MB2 — No visual feedback on touch zone press

Zone divs do not highlight when pressed. A pressed state (e.g. `background:
rgba(255,255,255,0.15)`) should be applied on `pointerdown` and cleared on
`pointerup`/`pointercancel` for each active zone.

---

### MB3 — Construction yard (warbase landing) not tested on mobile

The BabylonJS 3D dialog that opens when a ship lands on a warbase has not been
exercised with touch controls. Tap targets and scroll behaviour inside that
dialog are unknown.

---

### MB4 — All mobile testing is Playwright emulation only

No testing has been done on a real mobile device (iOS Safari, Android Chrome).
Playwright emulation covers viewport and pointer events but not GPU rendering,
audio policy enforcement, or iOS-specific scroll/overscroll quirks.
