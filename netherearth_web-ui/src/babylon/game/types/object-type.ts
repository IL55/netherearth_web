/**
 * Defines all possible types of objects that can exist on the map.
 * This separates active agents (ROBOT) from structures and terrain items.
 */
export enum ObjectType {
    /** A mobile unit capable of movement and combat. */
    ROBOT   = 'robot',
    /** The base ground layer defining passability and movement speed. */
    TILE    = 'tile',
    /** A capturable structure used for resource generation. */
    FACTORY = 'factory',
    /** The primary structure of a player; spawning units and generating resources. */
    WARBASE = 'warbase',
    /** Obstacle variants representing different wall formations. */
    WALL1   = 'wall1',
    WALL2   = 'wall2',
    WALL3   = 'wall3',
    WALL4   = 'wall4',
    WALL5   = 'wall5',
    WALL6   = 'wall6',
    /** A boundary obstacle typically preventing movement while allowing vision. */
    FENCE   = 'fence',
    /** Natural obstacles */
    ROCKS   = 'rocks',
    HEAVYROCKS = 'heavyrocks',
}
