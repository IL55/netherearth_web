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

### Facing direction

A robot's orientation is stored as `facing: Direction` — one of `'N' | 'E' | 'S' | 'W'`.
The view layer converts this to a radian angle for rendering (`directionToRotation`).

### Movement

- Robots move in **1/4 grid increments** per tick (4 ticks to cross one cell).
- Robots can only move in **4 cardinal directions** (N, E, S, W).
- A robot can **only move in the direction it is currently facing** (weapon side = front).
- To face a different direction a robot must first **rotate 90° per tick** (changes `facing`).
  Rotating **right** is clockwise: N→E→S→W→N. Rotating **left** is counter-clockwise.
- Robots **cannot move outside the map boundaries**.
- **Collision uses Chebyshev distance** — a move is blocked if the target position is within
  `1.0` of any other robot on **either axis independently** (`max(|dx|, |dy|) < 1.0`).
  This gives each robot a square 1×1 footprint and prevents corner overlap.

### Terrain

Terrain affects movement based on the robot's chassis type:

| Tile | Tracks | Antigrav | Bipod |
|------|--------|----------|-------|
| Grass (G)       | 3/4 speed | full speed | half speed |
| Sand (S, S2)    | half speed | full speed | half speed |
| Mountains (M)   | half speed | full speed | impassable |
| Holes (H1–H6)   | impassable | full speed | impassable |

**Half speed / 3/4 speed** means the robot skips some ticks (accumulates a slow counter).
Antigrav moves at full speed on all terrain, including holes (flies over them).

### Chassis types

- **Tracks** — derived from chassis model names containing `tracks`
- **Antigrav** — from `antigrav`
- **Bipod** — from `bipod`

### Weapons & Nuclear Bomb

Robots can be equipped with different weapon modules that determine their firing stats. Damage falls off linearly over distance (from 100% at 1 cell to 40% at maximum range). A robot can only fire if it is equipped with an Electronics module.

| Weapon | Max Range | Cooldown | Base Damage (at 1 cell) | Projectile Speed |
|--------|-----------|----------|-------------------------|------------------|
| Cannon | 5 cells | 7 ticks | 4 HP | Medium |
| Missiles | 7 cells | 12 ticks | 6 HP | Slow |
| Phasers | 5 cells | 6 ticks | 8 HP | Slow |

When a robot equipped with a **Nuclear Bomb** (A-bomb) activates it, it detonates with the following effects:
- **3x3 Kill Zone**: The 3x3 area centered on the detonating robot is completely destroyed.
  - All robots inside this 3x3 area are instantly killed.
  - All structures (fences, walls, rocks, etc.) inside this 3x3 area turn to sand.
  - If **any** block of a factory or warbase falls within this 3x3 area, the **entire** structure is destroyed and turns to sand.
- **5x5 Damage Zone**: Any robot located within the 5x5 area centered on the detonating robot (but outside the 3x3 kill zone) receives 50% damage.

## AI

Each robot has a **goal** and an **AI strategy**:

### Goals

| Goal | Behaviour |
|------|-----------|
| `attack_robots`           | Nearest enemy robot |
| `capture_factory`         | Nearest non-owned factory (enemy **or** neutral) |
| `capture_enemy_factory`   | Nearest enemy-owned factory only |
| `capture_neutral_factory` | Nearest neutral (unowned) factory only |
| `capture_warbase`         | Nearest non-owned warbase (enemy **or** neutral) |
| `capture_enemy_warbase`   | Nearest enemy-owned warbase only |
| `capture_neutral_warbase` | Nearest neutral (unowned) warbase only |
| `nuke_factory`            | Navigate toward an enemy factory and detonate nuclear bomb |
| `nuke_warbase`            | Navigate toward an enemy warbase and detonate nuclear bomb |
| `defend`                  | Stay in place (no movement target) |
| `move_forward`            | Move a fixed number of tiles toward the enemy base, then stop |
| `move_backward`           | Move a fixed number of tiles toward own base, then stop |

### AI Strategies

- **simple** — navigates toward the nearest target by Manhattan distance; rotates to face the
  preferred direction, moves when aligned, tries alternate directions if primary is blocked.
  Uses Bug2-style wall-follow when stuck (right-hand rule, exits when path to goal is clear).
- **advanced** *(planned)* — same as simple but uses electronics bonus for extended look-ahead
  and threat detection.

## Game Clock

The simulation runs on an **internal tick loop** (default 500 ms/tick):

1. Build an occupancy snapshot of the current map.
2. For each robot (in object order): compute its AI action, then attempt to apply it.
3. Trigger a re-render of all changed objects.

Tick count is stored in `warMap.tick`.

## Collision System

All structures are modelled as **1×1 cubic blocks**. Collision uses exact AABB overlap —
no inflation. Both robots and structure blocks are treated as 1×1 squares.

A robot at `(tx, ty)` is blocked by a structure block centered at `(bx, by)` when their
boxes overlap:

```
tx - 0.5 < bx + 0.5  &&  tx + 0.5 > bx - 0.5   (x axis)
ty - 0.5 < by + 0.5  &&  ty + 0.5 > by - 0.5   (y axis)
```

Simplified: blocked when `|tx − bx| < 1.0` on both axes simultaneously.

This is consistent with robot–robot collision, which also uses a 1.0 clearance threshold.

### Structure shapes

| Type | Blocks |
|------|--------|
| wall\*, fence | 1 block at `(x, y)` |
| factory | 5 blocks (C-shape): left column `(x, y)`, `(x, y+1)`, `(x, y+2)` + right top/bottom `(x+1, y)`, `(x+1, y+2)`. Hole (capture slot) at `(x+1, y+1)`. |
| warbase | 15 blocks matching the visual H-shape. Capture slot gap at approx `(x+3.5, y+2)`. |

**Do NOT use `floor()` / `Math.floor()` for structure collision.**
`floor()` maps a continuous position to an integer cell index. Since models use centered
origins, `floor(1.75) = 1` would wrongly allow a robot inside a block centered at `x=2.0`.

### Robot–robot collision

Uses **Chebyshev distance** (square footprint): blocked when
`max(|dx|, |dy|) < ROBOT_COLLISION_DISTANCE` (1.0).

## Structures

| Type | Blocks movement | Capturable |
|------|----------------|-----------|
| Factory | Yes (C-shaped) | Yes (owner changes) |
| Warbase | Yes (H-shaped) | Yes (owner changes) |
| Walls (wall1–wall6) | Yes | No |
| Fence | Yes | No |

The **warbase** H-shaped central model is always visible. A decal texture is applied on top only when owned by blue (owner=2).

## Victory Conditions

The game evaluates victory at the end of every simulation tick based on the following strict rules:

1. **Elimination by Loss of Warbases:** If a team's warbase count drops to 0 (because their last warbase was captured by the enemy or neutralized/destroyed), that team is instantly eliminated and loses the game. It does not matter if they still have surviving robots out on the battlefield; without a base of operations, they forfeit immediately.
2. **Total Map Control:** A team instantly wins if they are the only team remaining that owns a warbase.
