import { CW_DIRS, Direction } from '../warmap';
import type { RobotObject } from '../warmap';
import { RotateDir } from '../rotate-dir';
import { ROTATE_COOLDOWN } from './types';

export function applyRotate(
    robot: RobotObject,
    direction: RotateDir,
    tick: number,
): boolean {
    if (tick - (robot.lastRotatedAt ?? tick - ROTATE_COOLDOWN) < ROTATE_COOLDOWN) return false;
    const idx = CW_DIRS.indexOf(robot.facing ?? Direction.N);
    robot.facing = CW_DIRS[(idx + (direction === RotateDir.RIGHT ? 1 : 3)) % 4];
    robot.lastRotatedAt = tick;
    return true;
}
