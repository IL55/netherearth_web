# Backlog

Findings from project review (2026-05-19). Ordered by priority within each severity group.

---

## High

### H1 — `data/map.ts`: no `response.ok` check + no tests

`loadMap` does a raw `fetch()` with no status check. A 404 silently returns an HTML
error page; `text.split('\n')` then runs on it and crashes with a cryptic
`parseInt(NaN)` or wrong map dimensions.

**Fix:** add `if (!response.ok) throw new Error(...)` after `await fetch(...)`.  
**Tests needed:** mock `fetch` to return 404, malformed content, missing fields.

---

### H2 — `game/save.ts:65`: robot IDs accumulate `loaded_` prefix on every load

Each `applySave` call wraps every robot ID:
```ts
warMap.robots = save.robots.map(r => ({ ...r, id: `loaded_${r.id}` }));
```
A player who saves and reloads a loaded game gets `loaded_loaded_robot_0`.
Repeats on every load cycle.

**Fix:** strip any existing `loaded_` prefix before prepending, or drop the prefix
entirely and use a counter (`save_${i}`) to guarantee uniqueness.  
**Tests needed:** save → load → save → load round-trip, verify IDs don't accumulate.

---

## Medium

### M1 — `game/ai/fight.ts:160`: combat advance ignores terrain passability

`fightAction` returns `ActionType.MOVE` after checking only `isOccupied` (robots /
structures). It does not call `isPassable`, which also guards mountains and holes.
A robot with an enemy across a hole wastes every tick issuing a MOVE that
`applyMove` silently rejects, instead of wall-following around the obstacle.

**Fix:** call `isPassable(warMap, nx, ny, robot.robotConfig.chassis)` in the advance
branch of `fightAction`, same as the nav layer does.  
**Tests needed:** robot facing impassable terrain toward enemy should not stall.

---

### M2 — `game/mechanics/build.ts:203`: `_builtCount` not reset on `resetGame()`

Module-level `_builtCount` keeps incrementing across game resets. Robot IDs after
a new game continue from where the previous game left off (`robot_47`, `robot_48`,
…) instead of restarting from 0. Same issue in
`view/construction-yard/construction-yard-logic.ts` (`_manualBuildCount`).

**Fix:** expose a `_resetBuildState()` equivalent (already exists for tests) and
call it from `resetGame()` in `game/reset.ts`. Do the same for `_manualBuildCount`.

---

### M3 — `data/map.ts` + `game/save.ts`: weak internal types

- `MapData.objects` uses `[key: string]: any` — replace with a union of the concrete
  object shapes so wrong field access is caught at compile time.
- `GameSave.resources` inner record is `Record<string, number>` — should match the
  actual `Resources` type so `applySave`'s `Object.assign` is type-safe.

---

### M4 — `game/mechanics/build.ts`: dead RED-owner branch + untested scoring

- `tickBuild` exits immediately for any non-BLUE owner (line 203), making
  `BUILD_COOLDOWN_RED` and the RED branch of the cooldown calculation dead code.
  Remove the dead branch or implement RED building.
- `scoreBuildOption` and the late-game `chooseBuildGoal` paths (fighters ratio,
  enemy-capture fallback) have no unit tests.

---

### M5 — `view/robot-control/robot-control-3d.ts:265`: `loadKeyBindings()` on every keypress

`loadKeyBindings()` (a `localStorage.getItem`) is called on every `keydown` and
`keyup` event during robot-control panel use. Key bindings never change while the
panel is open.

**Fix:** load bindings once when the panel opens and store in an instance field.

---

### M6 — `game/mechanics/kill-terrain.ts:42`: duplicate wall tile on repeated kill at same cell

If a cell already has a `wall_kill_${key}` tile (from a previous game or loaded
save) and the kill counter reaches 7 again, a second tile with the same ID is pushed
into `warMap.tiles`. Renderer skips it (cache hit) but `buildOccupancy` adds a
duplicate AABB.

**Fix:** guard with `if (!warMap.tiles.find(t => t.id === id))` before pushing.  
**Tests needed:** 7th kill at a cell that already has a wall tile.

---

### M7 — `game/ai/nuclear.ts`: no test for friendly-structure-only scenario

`shouldDetonateNuclear` has a branch that checks for nearby structures. No test
verifies the robot does NOT detonate when only its own structures are in range.

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
