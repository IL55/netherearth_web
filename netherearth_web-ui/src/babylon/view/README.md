# view

BabylonJS rendering layer. Reads game state, draws the scene. No game logic lives here.

| Folder | Purpose |
|--------|---------|
| `shared/` | Utilities shared across all views (asset loader, scene helpers) |
| `map/` | 3D battlefield: tiles, factories, warbases, robots in-game |
| `construction-yard/` | Robot construction and customisation view |
| `robot-control/` | Manual control view for robots |
| `hud/` | Heads-up display during gameplay |
| `ui/` | Menus: start screen, pause, game over, overlays |

## How rendering works

`Renderer` holds a cache of all scene nodes created per `WarObject.id`.
On each `render(warMap)` call it compares each object's state to the previous render:
- **unchanged** → skip
- **changed** → dispose old nodes, redraw
- **removed** → dispose old nodes
