export * from './types';
export { applyRotate } from './apply-rotate';
export { applyFire }   from './apply-fire';
export { applyMove }   from './apply-move';

import { ActionType } from './types';
import type { RobotAction } from './types';
import type { RobotObject, WarMap } from '../warmap';
import type { OccupancyMap } from '../occupancy';
import { applyRotate } from './apply-rotate';
import { applyFire }   from './apply-fire';
import { applyMove }   from './apply-move';

// Apply an action to a robot, respecting terrain + occupancy.
// Returns true if the action was executed, false if blocked.
export function applyAction(
    robot: RobotObject,
    action: RobotAction,
    warMap: WarMap,
    occupancy: OccupancyMap,
): boolean {
    if (action.type === ActionType.IDLE) return false;
    const tick = warMap.tick ?? 0;
    if (action.type === ActionType.ROTATE) return applyRotate(robot, action.direction, tick);
    if (action.type === ActionType.FIRE)   return applyFire(robot, action.targetId, warMap);
    return applyMove(robot, action.direction, warMap, occupancy, tick);
}
