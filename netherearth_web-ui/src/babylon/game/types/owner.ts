/**
 * Owner enum — identifies which player owns a game object (robot, factory, warbase).
 *
 * Placed in its own file so it can be imported by game logic, view code, map
 * data parsing, and AI modules without introducing circular dependencies.
 *
 * Every robot, factory, and warbase always has an explicit owner value —
 * NEUTRAL means "not yet captured / unclaimed". undefined is only
 * acceptable for non-game objects such as tiles and walls.
 */
export enum Owner {
    NEUTRAL = 0,
    RED     = 1,  // player 1 — flag on the right side of structures
    BLUE    = 2,  // player 2 — flag on the left  side of structures
}
