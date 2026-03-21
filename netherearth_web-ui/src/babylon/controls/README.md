# controls

User input handlers — keyboard, mouse, touch bindings for the scene.
Each handler receives an `onUpdate` callback rather than calling the renderer directly,
keeping controls decoupled from the view layer.

- `camera.ts` — `attachCameraControls()`: `a`/`d` pan the `ArcRotateCamera`
- `game.ts` — `attachGameControls()`: game action keys that mutate `WarMap` and trigger a re-render

## Keybindings

| Key | Action |
|-----|--------|
| `a` | Pan camera target −z |
| `d` | Pan camera target +z |
| `t` | Remove last robot from the map |
