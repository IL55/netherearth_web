# __tests__

Unit and integration tests for the babylon layer, using BabylonJS `NullEngine` (no WebGL required).
Test folders mirror the source folder structure.

- `test-utils.ts` — shared helpers: `makeEnv()` creates a fresh engine+scene+models, `createMockModels()` builds mock GLB-like hierarchies

## view/map/

Tests for the 3D battlefield view:

- `robot.test.ts` — `robotConfigs` and `placeRobot`
- `factory.test.ts` — `addFactory` (wall placement, central piece offsets, flags)
- `warbase.test.ts` — `addWarbase` (part count, positions, owner flags)

## view/workshop/, view/ui/

_(planned)_

## controls/

- `camera.test.ts` — `attachCameraControls`: key `a`/`d` pan, other keys and KEYUP are ignored
