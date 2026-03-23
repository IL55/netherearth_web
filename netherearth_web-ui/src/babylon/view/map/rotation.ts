import type { Direction } from '../../game/warmap';

// View-only utilities: convert between Direction and Babylon rotation (radians).
// Game logic uses Direction strings exclusively; radians are only needed for mesh placement.

export function directionToRotation(dir: Direction): number {
    return { E: 0, N: Math.PI / 2, W: Math.PI, S: -Math.PI / 2 }[dir];
}

// Convert a rotation (radians) to the nearest cardinal Direction.
// Weapon is along local +X: rotation=0 → world +X → East.
export function rotationToDirection(rotation: number): Direction {
    const normalized = ((rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const idx = Math.round(normalized / (Math.PI / 2)) % 4;
    return (['E', 'N', 'W', 'S'] as Direction[])[idx];
}
