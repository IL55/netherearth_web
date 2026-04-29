# NetherEarth Web — Architecture

Entry point and top-level wiring for the BabylonJS scene.

- `main.ts` — creates the scene, loads assets, builds the initial `WarMap`, registers `bus` subscribers, and starts the clock.

---

## MVC layer map

| Layer | Directories | Rule |
|---|---|---|
| **Model** | `data/`, `game/` | Pure state and simulation. Zero BabylonJS, zero DOM. |
| **View** | `view/` | Reads state, renders with BabylonJS. Must not mutate game logic. |
| **Controller** | `main.ts`, `controls/` | Wires M↔V, handles user input, owns lifecycle. |

### What is clean

- Every file in `game/` imports zero BabylonJS symbols. The model is fully headless and testable.
- `data/` is pure types, parsing, and storage — no simulation or rendering.
- `controls/` handles only input bindings — no game logic, no rendering.
- The **event bus** is the formal M→V boundary: the model emits typed events; the view subscribes. Neither layer holds a direct reference to the other.
- The **action system** (`game/actions/`) is the only legal way to mutate robot position or trigger combat. Direct field writes are an exception confined to AI nav state (intentional, for performance).

### Where the boundary is blurred

| File | Issue | Severity |
|---|---|---|
| `main.ts` | God controller — constructs all subsystems, holds all trigger refs, hardcodes initial robot loop, owns `clock` via closure. | High |
| `view/construction-yard/construction-yard-3d.ts` | Calls `spawnManualRobot()` directly — view layer mutating model. Should go through a callback injected by the controller or a bus event. | High |
| `view/robot-control/mutations.ts` | `setManualControl`, `cycleRobotGoal` etc. write `RobotObject` fields directly. Conceptually a controller; physically in `view/`. | Medium |
| `view/startup-menu.ts` | Calls `saveSelectedMap` / `loadSelectedMap` / `listSaves` directly (model access). The bus events it emits (`game:new-map`) are correct; the storage calls should go through an injected service or the controller. | Medium |
| `game/clock.ts` | Emits `sound:play` — sound playback is a view concern. Acceptable here because the bus is the boundary (clock signals an event; the sound system decides to play), but it does couple game simulation to audio vocabulary. | Low |

---

## Directory map

```
data/            Pure data: types, parsing, persistence. Zero BabylonJS.
  map.ts           MapData interface + loadMap()
  robot.ts         RobotConfig, robotConfigs presets, calcHealth, calcRobotHeight
  storage.ts       localStorage: save slots (saveKey/listSaves/loadSave),
                   key bindings, selected map

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
                   to initial state without replacing the warMap reference

view/            BabylonJS rendering. Reads state, never mutates game logic.
  shared/
    models.ts        Asset loader — loads all .glb models via AssetsManager
    model-textures.ts Overlay texture planes for walls, factories, warbases
    scene-utils.ts   createOverlayPlane, toggleVisibility, paintFlag helpers
    sounds.ts        loadSounds() — native HTMLAudioElement, fire-and-forget;
                     playSequence() defers until first user gesture (autoplay policy)
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
    construction-yard-3d.ts     Panel 3D rendering (view-side) ⚠ calls spawnManualRobot
    trigger.ts     ConstructionYardTrigger — ship proximity check + open/close
    constants.ts   Layout + speed constants (ROTATION_SPEED, CY_LAYOUT, CY_PARTS)
  robot-control/
    queries.ts     Pure reads: isRobotAlive, getRobotHealthPercent, getGoalLabel
    mutations.ts   Player-driven state changes: cycleRobotGoal, setManualControl,
                   setRobotGoal, setMoveGoal ⚠ writes RobotObject directly
    physics.ts     findRobotUnderShip, setHoverHeight, applyExitBump
    actions.ts     buildDirectionAction, buildFireAction
    constants.ts   HOVER_DISTANCE, HOVER_GAP, ORDERABLE_GOALS, GOAL_LABELS, RC_LAYOUT
    robot-control-3d.ts  Panel 3D rendering
    trigger.ts     RobotControlTrigger — ship proximity check + open/close
  hud/
    hud.ts         GameHud — live HUD overlay (health bars, resource counts, day timer)
    hud-data.ts    Pure extractor: robot/warbase/factory counts + resource tallies
  game-over.ts     Victory / defeat screen
  startup-menu.ts  Full-screen pause/start menu with four nested dialogs:
                   main menu, map selector, key binder, load game list.
                   Emits game:new-map; ⚠ reads/writes storage directly.

controls/        User input bindings. Zero game logic.
  camera.ts        Keyboard panning for ArcRotateCamera + smooth ship-follow
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

**EventBus** (`game/event-bus.ts`) — typed singleton with these events:

| Event | When | Who listens |
|---|---|---|
| `tick:sub` | every 100ms | Renderer, ship physics, trigger checks, HUD |
| `tick:game` | every 500ms | (currently unused externally) |
| `game:over` | on victory | `clock.stop()`, `GameOverScreen` |
| `game:menu` | ESC key / HUD button | `startupMenu.show()` |
| `game:start` | after map load | `resetGame`, renderer, HUD |
| `game:new-map` | NEW GAME button | loads map then emits `game:start` |
| `sound:play` | weapon fire, explosion, UI triggers | `sounds.play()` |

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
Actions are the only legal way to change robot position or trigger combat outside of direct AI nav state writes.

---

## Rendering

`Renderer` (`view/map/renderer.ts`) uses a differential strategy: it caches the last-seen state of every object by id. Each `render(warMap)` call only rebuilds meshes for objects that changed. This keeps the render budget constant regardless of map size.

The ship, projectiles, and HUD have their own dedicated renderers called from the `tick:sub` handler in `main.ts`.

---

## TODO

### High priority

- **`main.ts` is a god-object entry point.** It directly constructs all subsystems, holds references to all triggers, and hardcodes initial robot spawning with a magic loop. Extract a `GameSession` class or `setupGame()` function that owns the lifecycle, removing the free-standing closure and the `clock` variable capture.

- **`construction-yard-3d.ts` calls `spawnManualRobot` directly.** View layer must not mutate game state. Inject a `onCreate(config)` callback from the controller (as is done for `onClose`), or emit a `game:build-robot` bus event handled in `main.ts`.

- **Initial robots in `main.ts` bypass `spawnRobot` intent.** The loop at lines 82–94 places robots with `goal: DEFEND` at hardcoded `y: 14` — this is leftover scaffolding from development. The real spawn mechanism is `tickBuild`. Remove or gate behind a dev flag.

### Medium priority

- **`startup-menu.ts` reads/writes storage directly.** The view layer should receive data via constructor arguments and report changes via callbacks, not call `saveSelectedMap` / `loadSelectedMap` itself. Move storage calls to `main.ts` (controller).

- **`view/robot-control/mutations.ts` lives in `view/`.** It writes `RobotObject` fields (model mutation) but is physically in the view layer. Move to `game/` or `controls/`, or rename the directory to `player/` to signal it is a controller sub-layer.

- **`bus.on('tick:sub')` in `main.ts` does too much.** Ship physics, construction yard check, robot control check, render, projectile render, ship render, and HUD update are all in one handler. Extract per-concern sub-tick handlers or a `TickCoordinator` that calls each in turn.

- **`RobotControlTrigger` receives an unused callback.** `new RobotControlTrigger(scene, mapData.width, () => {})` — the third argument is a no-op. Either remove the parameter or use it.

- **`constructionYardTrigger.check` and `robotControlTrigger.check` are called inside `tick:sub`.** They run every 100ms. Proximity checks are cheap but the panel open/close side-effects run on sub-ticks. Consider moving trigger checks to `tick:game` so they run only on full game ticks.

- **`warMap.tick ?? 0` in `gameTick`.** `tick` is required on `WarMap` now; the `?? 0` is a stale defensive pattern.

### Low priority

- **`index.ts` barrel in `robot-control/` re-exports everything including `robot-control-3d` and `trigger`.** BabylonJS-heavy modules are bundled with pure-logic ones. Callers that only need `queries` or `mutations` pull in the renderer. Split the barrel or use named re-exports that separate 3D from logic.

- **`setRobotGoal` and `setMoveGoal` in `mutations.ts` have no test coverage.**

- **`NavAlgo` is only used in `robotConfig.navAlgo` but not surfaced in `RobotConfig` type docs.** The Trémaux path is tested but not reachable from the construction UI.

- **`GOAL_LABELS` type is `Record<string, string>`** instead of `Record<RobotGoal, string>`. Using `RobotGoal` would catch missing label entries at compile time.

- **`ship-height.test.ts` has a mid-file import** (line 24). `import { RobotGoal, RobotAI }` appears after a function definition. Move to top of file.

- **`game/core/utils.ts` import order.** Imports added during `spawnRobot` refactor appear after function definitions at the bottom of the file. Standard imports belong at the top.
