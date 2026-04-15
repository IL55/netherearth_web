# controls

User input handlers — keyboard, mouse, touch bindings for the scene.
Each handler receives an `onUpdate` callback rather than calling the renderer directly,
keeping controls decoupled from the view layer.

- `camera.ts` — `attachCameraControls()`: `a`/`d` pan the `ArcRotateCamera`
- `game.ts` — `attachGameControls()`: game action keys that mutate `WarMap` and trigger a re-render
- `ship.ts` — `attachShipControls()`: controls the player's ship movement

## Keybindings

| Key | Action |
|-----|--------|
| `a` | Pan camera target −z |
| `d` | Pan camera target +z |
| `t` | Cycle owner for all factories and warbases |
| `Arrow Keys` | Move ship horizontally (forward, backward, left, right) |
| `Space` | Ship ascend |
