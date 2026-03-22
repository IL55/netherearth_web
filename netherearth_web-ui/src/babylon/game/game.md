# Game Rules

## World

The map is a 2D grid of integer cells. Each cell contains one tile (terrain type).
Objects (factories, warbases, walls, robots) occupy cells at integer coordinates.

## Ownership

Objects can be **neutral** (no owner), **red** (owner=1), or **blue** (owner=2).

- Factories and warbases show a flag on the right side when owned by red (owner=1),
  left side when owned by blue (owner=2), and no flag when neutral.
- Robots belong to a team and act in that team's interest.

## Robots

### Movement

- Robots move in **1/4 grid increments** per tick (4 ticks to cross one cell).
- Robots can only move in **4 cardinal directions** (N, E, S, W).
- A robot can **only move in the direction it is currently facing** (weapon side = front).
- To face a different direction a robot must first **rotate 90° per tick**.
- Robots **cannot move outside the map boundaries**.
- **Collision uses Chebyshev distance** — a move is blocked if the target position is within
  `1.0` of any other robot on **either axis independently** (`max(|dx|, |dy|) < 1.0`).
  This gives each robot a square 1×1 footprint and prevents corner overlap.

### Terrain

Terrain affects movement based on the robot's chassis type:

| Tile | Tracks | Antigrav | Bipod |
|------|--------|----------|-------|
| Grass (G)       | full speed | full speed | full speed |
| Sand (S, S2)    | half speed | full speed | half speed |
| Mountains (M)   | impassable | half speed | half speed |
| Holes (H1–H6)   | impassable | impassable | impassable |

**Half speed** means the robot moves every 2nd tick (accumulates a slow counter).

### Chassis types

- **Tracks** — derived from chassis model names containing `tracks`
- **Antigrav** — from `antigrav`
- **Bipod** — from `bipod`

## AI

Each robot has a **goal** and an **AI strategy**:

### Goals

| Goal | Behaviour |
|------|-----------|
| `attack_robots` | Find and move toward the nearest enemy robot |
| `capture_factory` | Move toward the nearest neutral or enemy factory |
| `capture_warbase` | Move toward the nearest neutral or enemy warbase |
| `defend` | Stay in place (no movement target yet) |

### AI Strategies

- **dummy** — navigates toward the nearest target by Manhattan distance; rotates to face the
  preferred direction, moves when aligned, tries alternate directions if primary is blocked.
- **advanced** *(planned)* — same as dummy but uses electronics bonus for extended look-ahead
  and threat detection.

## Game Clock

The simulation runs on an **internal tick loop** (default 500 ms/tick):

1. Build an occupancy snapshot of the current map.
2. For each robot (in object order): compute its AI action, then attempt to apply it.
3. Trigger a re-render of all changed objects.

Tick count is stored in `warMap.tick`.

## Structures

| Type | Blocks movement | Capturable |
|------|----------------|-----------|
| Factory | Yes (full cell) | Yes (owner changes) |
| Warbase | Yes (full cell) | Yes (owner changes) |
| Walls (wall1–wall6) | Yes | No |
| Fence | Yes | No |

The **warbase** H-shaped central model is always visible. A decal texture is applied on top only when owned by blue (owner=2).
