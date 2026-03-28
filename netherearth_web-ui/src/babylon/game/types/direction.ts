/**
 * Represents the cardinal directions on the map.
 * Used primarily for robot orientation, movement, and targeting.
 */
export enum Direction {
    N = 'N',
    E = 'E',
    S = 'S',
    W = 'W',
}

/** 
 * Directions in clockwise order. 
 * Useful for calculating rotations (left/right turns) and iterating through cardinal directions.
 */
export const CW_DIRS: Direction[] = [Direction.N, Direction.E, Direction.S, Direction.W];
