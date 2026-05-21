# view/map

3D battlefield view — renders the war map, all structures and robots in-game.

- `renderer.ts` — `Renderer` class: diff-based redraw from `WarMap`
- `map.ts` — debug overlay utilities (`debugLoadMap`, `debugPlaceGrass`)
- `factory.ts` — places a factory structure (walls + central piece + optional flag)
- `warbase.ts` — places a warbase structure (15 parts + optional owner flag and decal)
- `robot.ts` — assembles and stacks robot parts (chassis → weapon → nuclear → electronics)
- `projectile-renderer.ts` — rendering for weapon projectiles in-flight
- `ship-renderer.ts` — rendering for the player's flying ship
- `rotation.ts` — utility for converting game directions into 3D rotations
