# NetherEarth Web — Architecture

Entry point and top-level wiring for the BabylonJS scene.

- `main.ts` — creates the scene, loads assets, builds the initial `WarMap`, registers `bus` subscribers, and starts the clock.

---

## Directory map

```
data/            Pure data: types, parsing, loading. Zero BabylonJS.
  map.ts           MapData interface + loadMap()
  robot.ts         RobotConfig, robotConfigs presets, calcHealth, calcRobotHeight

game/            Live game state + simulation. Zero BabylonJS.
  core/
    warmap.ts      WarMap, RobotObject, MapObject — central type hub
    utils.ts       createWarMap, removeObject, spawnRobot, findLastByType
    occupancy.ts   buildOccupancy() — spatial index for move blocking
    terrain.ts     Terrain passability helpers
  types/           Enums re-exported through warmap.ts
  actions/         Discriminated-union RobotAction + apply* functions
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
  resources.ts     OwnerResources, tickResources(), DAY_TICKS
  clock.ts         startClock() — drives gameTick every SUB_TICKS sub-ticks
  event-bus.ts     Typed EventBus singleton (bus) + GameEvent union

view/            BabylonJS rendering. Reads state, never mutates game logic.
  shared/          Asset loader (models.ts), scene helpers
  map/
    renderer.ts    Differential renderer — caches by object id, re-draws on change
    robot.ts       Robot 3D mesh management
    factory.ts     Factory 3D mesh management
    warbase.ts     Warbase 3D mesh management
    projectile-renderer.ts
    ship-renderer.ts
  construction-yard/
    construction-yard-logic.ts  Robot build & customisation (game-side)
    construction-yard-3d.ts     Panel 3D rendering (view-side)
    trigger.ts     ConstructionYardTrigger — ship proximity check + open/close
    constants.ts   Layout constants
  robot-control/
    queries.ts     Pure reads: isRobotAlive, getRobotHealthPercent, getGoalLabel
    mutations.ts   Player-driven state changes: cycleRobotGoal, setManualControl, setRobotGoal, setMoveGoal
    physics.ts     findRobotUnderShip, setHoverHeight, applyExitBump
    actions.ts     buildDirectionAction, buildFireAction
    constants.ts   HOVER_DISTANCE, HOVER_GAP, ORDERABLE_GOALS, GOAL_LABELS, RC_LAYOUT
    robot-control-3d.ts  Panel 3D rendering
    trigger.ts     RobotControlTrigger — ship proximity check + open/close
  hud/             Heads-up display during gameplay
  game-over.ts     Victory / defeat screen

controls/        User input bindings. Zero game logic.
  camera.ts        Keyboard panning for ArcRotateCamera
  ship.ts          Flying ship controls
  game.ts          Debug/dev keyboard bindings

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

**EventBus** (`game/event-bus.ts`) — typed singleton with three events:

| Event | When | Who listens |
|---|---|---|
| `tick:sub` | every 100ms | Renderer, ship physics, trigger checks, HUD |
| `tick:game` | every 500ms | (currently unused externally) |
| `game:over` | on victory | clock.stop(), GameOverScreen |

`main.ts` subscribes to `tick:sub` and `game:over`. The clock knows nothing about rendering.

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

- **Initial robots in `main.ts` bypass `spawnRobot` intent.** The loop at lines 82–94 places robots with `goal: DEFEND` at hardcoded `y: 14` — this is leftover scaffolding from development. The real spawn mechanism is `tickBuild`. Remove or gate behind a dev flag.

- **`warMap.tick ?? 0` in `gameTick`.** `tick` is required on `WarMap` now; the `?? 0` is a stale defensive pattern.

### Medium priority

- **`RobotControlTrigger` receives an unused callback.** `new RobotControlTrigger(scene, mapData.width, () => {})` — the third argument is a no-op. Either remove the parameter or use it.

- **`constructionYardTrigger.check` and `robotControlTrigger.check` are called inside `tick:sub`.** They run every 100ms. Proximity checks are cheap but the panel open/close side-effects run on sub-ticks. Consider moving trigger checks to `tick:game` so they run only on full game ticks.

- **`bus.on('tick:sub')` in `main.ts` does too much.** Ship physics, construction yard check, robot control check, render, projectile render, ship render, and HUD update are all in one handler. Extract per-concern sub-tick handlers or a `TickCoordinator` that calls each in turn.

- **`ship-height.test.ts` has a mid-file import** (line 24). `import { RobotGoal, RobotAI }` appears after a function definition. Move to top of file.

- **`game/core/utils.ts` import order.** Imports added during `spawnRobot` refactor appear after function definitions at the bottom of the file. Standard imports belong at the top.

### Low priority

- **`index.ts` barrel in `robot-control/` re-exports everything including `robot-control-3d` and `trigger`.** BabylonJS-heavy modules are bundled with pure-logic ones. Callers that only need `queries` or `mutations` pull in the renderer. Split the barrel or use named re-exports that separate 3D from logic.

- **`setRobotGoal` and `setMoveGoal` in `mutations.ts` have no test coverage.**

- **`NavAlgo` is only used in `robotConfig.navAlgo` but not surfaced in `RobotConfig` type docs.** The Trémaux path is tested but not reachable from the construction UI.

- **`GOAL_LABELS` type is `Record<string, string>`** instead of `Record<RobotGoal, string>`. Using `RobotGoal` would catch missing label entries at compile time.
