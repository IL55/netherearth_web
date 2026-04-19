# babylon

Entry point and top-level wiring for the BabylonJS scene.

- `main.ts` — creates the scene, loads assets, builds the initial `WarMap`, and kicks off the first render

## Architecture

```
data/            Pure data: types, parsing, loading. Zero BabylonJS.
  map.ts           MapData interface + loadMap()
  robot.ts         RobotConfig interface + robotConfigs presets

game/            Live game state. Zero BabylonJS.
  core/warmap.ts   WarObject, WarMap, createWarMap()
                   Mutated by game events (move, capture, destroy, spawn).

view/            BabylonJS rendering. Reads game state, draws scene.
  shared/            Asset loader, scene helpers (used by all views)
  map/               3D battlefield: tiles, factories, warbases, robots
  construction-yard/ Robot construction and customisation view
  robot-control/     Manual control view for robots
  hud/               Heads-up display during gameplay
  ui/                Menus and HUD: start, pause, game over, overlays

controls/        User input handlers (keyboard, mouse, touch).
  camera.ts        Keyboard panning for ArcRotateCamera
  ship.ts          Flying ship movement and positioning
  game.ts          Keyboard bindings for game commands

__tests__/       Unit/integration tests (NullEngine, no WebGL)
  view/map/        Tests for the battlefield view
```

## Data flow

```
loadMap()  →  MapData  →  createWarMap()  →  WarMap  →  Renderer.render()  →  scene
                                                ↑
                                         game events mutate WarMap
```
