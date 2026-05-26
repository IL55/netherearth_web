---
title: Architecture Overview
---

# Architecture Overview

Two entry points at the top level:

- `scene.ts` — BabylonJS scene setup, asset loading, sound wiring. Thin — 28 lines.
- `game-session.ts` — owns the full game lifecycle: state, renderers, triggers, menus, bus handlers, clock.

---

## MVC layer map

| Layer | Where | Rule |
|---|---|---|
| **Model** | `data/`, `game/` | Pure state and simulation. Zero BabylonJS, zero DOM. |
| **View** | `view/` | Reads state, renders with BabylonJS or DOM. Must not mutate game logic. |
| **Controller** | `scene.ts`, `game-session.ts`, `controls/` | Wires M↔V, handles input, owns lifecycle. |

### What is clean

- Every file in `game/` imports zero BabylonJS symbols. The model is fully headless and testable.
- `data/` is pure types, parsing, and storage — no simulation or rendering.
- `controls/` handles only input bindings — no game logic, no rendering.
- The **event bus** (`game/event-bus.ts`) is the formal M→V boundary. The model emits typed events; the view subscribes. Neither layer holds a direct reference to the other.
- The **action system** (`game/actions/`) is the only legal way to mutate robot position or trigger combat.
- `ConstructionYardTrigger` receives `onCreate: (config: RobotConfig) => void` from the controller — the view no longer calls `spawnManualRobot` directly.
- `StartupMenu` receives a `StartupMenuStorage` interface — it no longer imports from `data/storage` directly.
- Player-driven robot mutations (`cycleRobotGoal`, `setManualControl`, etc.) live in `game/robot-mutations.ts`, not in `view/`.

### Where the boundary is still blurred

| File | Issue | Severity |
|---|---|---|
| `view/construction-yard/construction-yard-3d.ts` | Calls `deductSelectionCost` directly — mutates `ownerResources` from view. `ownerResources` is an injected ref so the coupling is shallow, but it's still a write from view. | Low |
| `view/robot-control/robot-control-3d.ts` | Calls `setManualControl`, `setRobotGoal`, `setMoveGoal` from `game/robot-mutations` — functions are now in the right layer, but they're still invoked by the view panel rather than dispatched as commands to the controller. | Low |
| `game-session.ts` | `RobotControlTrigger` is constructed with an empty third callback `() => {}` — dead parameter. | Low |

---

## Directory map

```
scene.ts         BabylonJS scene + assets only (scene, light, models, sounds)
game-session.ts  Controller: full game lifecycle, bus handlers, trigger/menu wiring

data/            Pure data: types, parsing, persistence. Zero BabylonJS.
  map.ts           MapData interface + loadMap()
  robot.ts         RobotConfig, robotConfigs presets, calcHealth, calcRobotHeight
  storage.ts       localStorage: StartupMenuStorage interface, save slots
                   (saveKey/listSaves/loadSave), key bindings, selected map

game/            Live game state + simulation. Zero BabylonJS.
  core/
    warmap.ts      WarMap, RobotObject, MapObject — central type hub
    utils.ts       createWarMap, removeObject, spawnRobot, findLastByType
    occupancy.ts   buildOccupancy() — spatial index for move blocking
    terrain.ts     Terrain passability helpers
  types/           Enums re-exported through warmap.ts
                   (direction, nav-mode, nav-state, object-type, owner,
                    projectile-type, robot-ai, robot-goal, rotate-dir,
                    sound, weapon-type)
  actions/         Discriminated-union RobotAction + apply* functions
                   (apply-fire, apply-move, apply-nuclear, apply-rotate, index, types)
  ai/
    simple.ts      simpleAI() + AIResult/AIStateUpdate + stepSimpleAI
    fight.ts       Combat: fightAction (shoot or advance toward enemy)
    nav.ts         Direction helpers + isPassable
    bug2.ts        Bug2 wall-follower: bug2Dirs()
    tremaux.ts     Trémaux sliding-window: tremauxDirs() + recordCell()
    nuclear.ts     shouldDetonateNuclear()
    nav-algo.ts    NavAlgo enum (BUG2 | TREMAUX)
  mechanics/
    capture.ts     tickCapture(), CAPTURE_ZONES
    build.ts       tickBuild(), chooseBuildOption(), chooseBuildGoal()
    projectile.ts  advanceProjectiles(), SUB_TICKS
    victory.ts     checkVictory()
    kill-terrain.ts recordKill() — terrain upgrades on kills
  ship/            Flying-ship physics (separate from robots)
                   (collision, constants, index, movement, types)
  resources.ts     OwnerResources, tickResources(), DAY_TICKS
  clock.ts         startClock() — drives gameTick every SUB_TICKS sub-ticks
  event-bus.ts     Typed EventBus singleton (bus) + GameEvent union
  reset.ts         resetGame() — restores warMap + resources + ship + clock
                   in-place (preserves reference)
  robot-mutations.ts  Player-driven robot state changes:
                   ORDERABLE_GOALS, cycleRobotGoal, setManualControl,
                   setRobotGoal, setMoveGoal
  save.ts          GameSave interface + saveGame(), parseGameSave(), applySave()
                   Serialises warMap/resources/ship to localStorage; strips
                   nav and dyingTicks (transient fields) on save

view/            BabylonJS rendering + DOM UI. Reads state, must not mutate game logic.
  shared/
    models.ts        Asset loader — loads all .glb models via AssetsManager
    model-textures.ts Overlay texture planes for walls, factories, warbases
    scene-utils.ts   createOverlayPlane, toggleVisibility, paintFlag helpers
    sounds.ts        Sounds interface + loadSounds() — native HTMLAudioElement,
                     fire-and-forget; playSequence() defers until first user gesture
  map/
    renderer.ts    Differential renderer — caches by object id, redraws on change
    robot.ts       Robot 3D mesh management
    factory.ts     Factory 3D mesh management (owner-aware e-/h-/n- model prefix)
    warbase.ts     Warbase 3D mesh management
    map.ts         Debug helper — visualises map data with labelled planes/boxes
    rotation.ts    Direction ↔ Babylon radian conversion (E/N/W/S)
    projectile-renderer.ts
    ship-renderer.ts
  construction-yard/
    construction-yard-logic.ts  Robot build & customisation (game-side)
    construction-yard-3d.ts     Panel 3D rendering
                   Constructor: (scene, models, ownerResources, warMap,
                                 onCreate: (config) => void, onExit: () => void)
    trigger.ts     ConstructionYardTrigger — proximity check + open/close
                   Constructor: (scene, models, ownerResources,
                                 onCreate: (config) => void, onExit: () => void)
    constants.ts   Layout + speed constants (ROTATION_SPEED, CY_LAYOUT, CY_PARTS)
    model-utils.ts BabylonJS mesh helpers: createModelWrapper(),
                   createRobotPreviewWrapper() — clone + auto-scale + stack parts
    ui-utils.ts    DynamicTexture helpers: createTextPlane(), updateTextOnTexture(),
                   createBackground()
  robot-control/
    queries.ts     Pure reads: isRobotAlive, getRobotHealthPercent, getGoalLabel
    actions.ts     buildDirectionAction, buildFireAction
    physics.ts     findRobotUnderShip, setHoverHeight, applyExitBump
    constants.ts   HOVER_DISTANCE, HOVER_GAP, GOAL_LABELS, RC_LAYOUT
                   Re-exports ORDERABLE_GOALS from game/robot-mutations
    index.ts       Barrel: re-exports queries, game/robot-mutations, actions,
                   physics, constants
    robot-control-3d.ts  Panel 3D rendering
    trigger.ts     RobotControlTrigger — ship proximity check + open/close
  hud/
    hud.ts         GameHud — live HUD overlay (health bars, resource counts, day timer)
    hud-data.ts    Pure extractor: robot/warbase/factory counts + resource tallies
  game-over.ts     Victory / defeat screen
  startup-menu.ts  Full-screen pause/start menu with four nested dialogs:
                   main menu, map selector, key binder, load game list.
                   Constructor: (storage: StartupMenuStorage, onSave: () => boolean,
                                 onLoad, onNewGame?)
                   Emits game:new-map; reads/writes storage only through injected interface.

controls/        User input bindings. Zero game logic.
  camera.ts        ArcRotateCamera setup + smooth ship-follow (updateCameraTarget)
  ship.ts          Ship movement input capture; syncs to ShipInput from key bindings
  game.ts          Debug/dev keyboard bindings
  keybindings.ts   formatKey() display helper; re-exports storage binding functions

__tests__/       Unit and integration tests (Vitest + NullEngine, no WebGL)
```

---

## Tick architecture

```
setInterval(100ms)                ← sub-tick
  │
  ├─ subTick === 0 → gameTick()   ← full game tick (every 500ms / SUB_TICKS sub-ticks)
  │     AI loop (simpleAI → applyAIStateUpdate → applyAction)
  │     tickCapture, tickResources, tickBuild
  │     checkVictory → bus.emit('game:over')
  │     bus.emit('tick:game')
  │
  ├─ advanceProjectiles()
  └─ bus.emit('tick:sub')         ← renderer + ship + UI subscribe here
```

**EventBus** (`game/event-bus.ts`) — typed singleton:

| Event | When | Who listens |
|---|---|---|
| `tick:sub` | every 100ms | Renderer, ship physics, trigger checks, HUD |
| `tick:game` | every 500ms | (currently unused externally) |
| `game:over` | on victory | `clock.stop()`, `GameOverScreen` |
| `game:menu` | ESC key / HUD button | `startupMenu.show()` |
| `game:start` | after map load | `resetGame`, renderer, HUD |
| `game:new-map` | NEW GAME button | loads map then emits `game:start` |
| `sound:play` | weapon fire, explosion, UI triggers | `sounds.play()` in `scene.ts` |

---

## Data model

```
WarMap
  width, height         map dimensions
  tick: number          monotonic game-tick counter
  tiles: MapObject[]    static map objects: TILE, FACTORY, WARBASE, WALL, FENCE
  robots: RobotObject[] mobile units
  projectiles[]         in-flight projectiles
  killCounts            terrain upgrade tracking

RobotObject
  id, x, y, owner, facing, health
  robotConfig           chassis, weapons, nuclear, electronics, navAlgo
  goal: RobotGoal       current strategic objective
  ai: RobotAI           SIMPLE (only value used)
  nav?: NavState        AI-internal navigation memory (visitCounts, moveOutTarget)
  goalPosition?         target for MOVE_FORWARD / MOVE_BACKWARD goals
  dyingTicks?           death-animation countdown; undefined = alive

MapObject
  id, x, y, type, owner?, subtype?
  captureCounter?       consecutive ticks held by enemy robot
  lastBuiltAt?          last tick a robot was built here (build cooldown)
```

---

## AI pipeline (per robot, per game tick)

```
simpleAI(robot, warMap, occupancy): AIResult
  0. shouldDetonateNuclear?  → DETONATE
  1. fightAction()           → FIRE / ROTATE toward enemy if in range
  2. Waypoint goal?          → navigate to goalPosition, then DEFEND on arrival
  3. Goal navigation
       fresh spawn at warbase → set moveOutTarget (+4 toward enemy warbase)
       otherwise → initialize robot.nav = {}
       moveOutTarget present → navigate out
       target selection via findTarget()
       nav algorithm: Bug2 (default) or Trémaux (robotConfig.navAlgo)
       → MOVE / ROTATE / IDLE

applyAIStateUpdate(robot, stateUpdate)
  applies goal, clearGoalPosition, clearMoveOut after simpleAI returns
  (robot.nav is mutated directly inside simpleAI — intentional for perf-sensitive nav state)
```

---

## Action system

`RobotAction` is a discriminated union (`MOVE | ROTATE | FIRE | DETONATE | IDLE`).
`applyAction()` dispatches to `applyMove`, `applyRotate`, `applyFire`, `applyNuclear`.
Actions are the only legal way to change robot position or trigger combat.

---

## Rendering

`Renderer` (`view/map/renderer.ts`) uses a differential strategy: it caches the last-seen state of every object by id. Each `render(warMap)` call only rebuilds meshes for objects that changed. This keeps the render budget constant regardless of map size.

The ship, projectiles, and HUD have their own dedicated renderers, all called from the `tick:sub` handler inside `GameSession`.

---

## TODO

### Medium priority

- **`RobotControlTrigger` empty third callback.** `new RobotControlTrigger(scene, () => mapData.width, () => {})` — the third argument is a no-op. Remove the parameter or wire it up.

- **`constructionYardTrigger.check` and `robotControlTrigger.check` run on `tick:sub`.** They fire every 100ms. Proximity checks are cheap but panel open/close side-effects happen on sub-ticks. Moving to `tick:game` (500ms) would be more appropriate.

- **`bus.on('tick:sub')` in `GameSession` still does too much.** Ship physics, two trigger checks, four renders, and HUD update in one handler. Extract per-concern sub-tick handlers or a `TickCoordinator`.

- **`deductSelectionCost` called inside `construction-yard-3d.ts`.** Mutates `ownerResources` from the view layer. Could be rolled into the `onCreate` callback or moved to the controller.

### Low priority

- **`view/robot-control/index.ts` barrel** still re-exports `robot-control-3d` and `trigger`. BabylonJS-heavy modules are bundled with pure-logic ones. Callers that only need `queries` pull in the renderer.

- **`setRobotGoal` and `setMoveGoal` in `game/robot-mutations.ts` have no test coverage.**

- **`NavAlgo` is only used in `robotConfig.navAlgo`** but not surfaced in the construction UI. The Trémaux path is tested but unreachable by the player.

- **`ship-height.test.ts` has a mid-file import** (line 24). Move to top of file.

- **`game/core/utils.ts` import order.** Imports appear after function definitions at the bottom. Standard imports belong at the top.
