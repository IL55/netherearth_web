import { ObjectType } from '../core/warmap';
import type { WarMap, WarObject, RobotObject, MapObject } from '../core/warmap';
import { DAY_TICKS } from '../resources';
import { FACTORY_CAPTURE_DAYS, WARBASE_CAPTURE_DAYS } from '../config';

interface CaptureZone {
    dx: number;    // offset from obj.x to zone center
    dy: number;    // offset from obj.y to zone center
    radius: number; // Chebyshev radius — robot center must be within this to count
    ticks: number; // consecutive ticks required to capture
}

// Factory: open slot at (xo=1, yo=1) in C-shaped layout, 1 day to capture.
// Warbase: right-side gap between (xo=3,yo=1) and (xo=3,yo=3), 3 days to capture.
export const CAPTURE_ZONES: Partial<Record<ObjectType, CaptureZone>> = {
    [ObjectType.FACTORY]: { dx: 1,   dy: 1,   radius: 0.1, ticks: FACTORY_CAPTURE_DAYS * DAY_TICKS },
    [ObjectType.WARBASE]: { dx: 3.5, dy: 2.0, radius: 0.1, ticks: WARBASE_CAPTURE_DAYS * DAY_TICKS },
};

export function isInCaptureZone(robot: RobotObject, structure: MapObject): boolean {
    const zone = CAPTURE_ZONES[structure.type];
    if (!zone) return false;
    return (
        Math.max(
            Math.abs(robot.x - (structure.x + zone.dx)),
            Math.abs(robot.y - (structure.y + zone.dy)),
        ) <= zone.radius
    );
}

// Called once per tick after all robot actions.
// A robot in a structure's capture zone for CAPTURE_TICKS consecutive ticks captures it.
// Any interruption (robot leaves or is a teammate) resets the counter.
export function tickCapture(warMap: WarMap): void {
    for (const obj of warMap.tiles) {
        if (!CAPTURE_ZONES[obj.type]) continue;

        const captor = warMap.robots.find(
            r => r.owner !== obj.owner && isInCaptureZone(r, obj),
        );

        if (captor) {
            obj.captureCounter = (obj.captureCounter ?? 0) + 1;
            const zone = CAPTURE_ZONES[obj.type]!;
            if (obj.captureCounter >= zone.ticks) {
                obj.owner = captor.owner;
                obj.captureCounter = 0;
            }
        } else {
            obj.captureCounter = 0;
        }
    }
}
