/**
 * Replicates the exact setup from main.ts + small1.map:
 *
 *   - Map 8 × 64, fences at y=0 and y=63
 *   - Factories at (0,10),(4,10),(0,15),(4,15),(0,20),(4,20) — all owner=2
 *   - Warbases: player-1 at (0.5, 4), player-2 at (0, 57)
 *   - Robots spawned at y=14, x=0..7, alternating owner 1/2
 *
 * Robots at y=14 start sandwiched between:
 *   factory(0,10) bottom AABB at y=12.75
 *   factory(0,15) top    AABB at y=14.25   ← only 1.5-unit gap!
 *
 * Factory at x=0 has left AABB at x=-0.75 (outside map).
 *
 * Tests verify no robot drifts outside map bounds and that a robot
 * with goal=capture_factory actually reaches the nearest factory
 * capture zone within a reasonable tick budget.
 */
import { Direction } from '../../../game/warmap';
import { describe, it, expect } from 'vitest';
import { dummyAI } from '../../../game/ai/dummy';
import { applyAction } from '../../../game/actions';
import { buildOccupancy } from '../../../game/occupancy';
import { CAPTURE_ZONES } from '../../../game/capture';
import type { WarMap, WarObject, RobotObject } from '../../../game/warmap';
import { isRobot, RobotGoal, Owner } from '../../../game/warmap';
import { Chassis, Electronics } from '../../../data/robot';

const MAP_W = 8, MAP_H = 64;

function fence(x: number, y: number): WarObject {
    return { id: `fence_${x}_${y}`, type: 'fence', x, y };
}
function factory(x: number, y: number, subtype: string, owner: Owner): WarObject {
    return { id: `f_${x}_${y}`, type: 'factory', x, y, subtype, owner };
}
function warbase(x: number, y: number, owner: Owner): WarObject {
    return { id: `wb_${x}_${y}`, type: 'warbase', x, y, owner };
}

function makeSmall1Map(): WarMap {
    const objects: WarObject[] = [
        // Top and bottom border fences
        ...[0,1,2,3,4,5,6,7].map(x => fence(x, 0)),
        ...[0,1,2,3,4,5,6,7].map(x => fence(x, 63)),

        // Factories — all owner=2 as in main.ts
        factory(0, 10, 'electronics', Owner.BLUE),
        factory(4, 10, 'chassis',     Owner.BLUE),
        factory(0, 15, 'missiles',    Owner.BLUE),
        factory(4, 15, 'cannons',     Owner.BLUE),
        factory(0, 20, 'phasers',     Owner.BLUE),
        factory(4, 20, 'nuclear',     Owner.BLUE),

        // Warbases
        warbase(0.5, 4,  Owner.RED),
        warbase(0,   57, Owner.BLUE),
    ];

    // Robots exactly as in main.ts: x=0..7, y=14, alternating owner, goals cycling
    const goals = [RobotGoal.ATTACK_ROBOTS, RobotGoal.CAPTURE_FACTORY, RobotGoal.CAPTURE_WARBASE, RobotGoal.DEFEND];
    const chassis = [Chassis.ANTIGRAV, Chassis.TRACKS, Chassis.BIPOD, Chassis.TRACKS,
                     Chassis.ANTIGRAV, Chassis.TRACKS, Chassis.BIPOD, Chassis.TRACKS];
    for (let x = 0; x < MAP_W; x++) {
        objects.push({
            id: `robot_${x}`,
            type: 'robot',
            x,
            y: 14,
            owner: x % 2 === 0 ? Owner.RED : Owner.BLUE,
            facing: Direction.S,
            goal: goals[x % goals.length],
            robotConfig: { chassis: chassis[x], electronics: Electronics.STANDARD },
        } as WarObject);
    }

    return { width: MAP_W, height: MAP_H, objects, tick: 0 };
}

describe('small1.map full setup', () => {

    it('no robot ever exits map bounds over 500 ticks', () => {
        const map = makeSmall1Map();
        const robots = map.objects.filter(isRobot);

        for (let tick = 0; tick < 500; tick++) {
            map.tick = tick;
            const occ = buildOccupancy(map);
            for (const robot of robots) {
                applyAction(robot, dummyAI(robot, map, occ), map, occ);
            }
            for (const r of robots) {
                if (r.x < 0 || r.y < 0 || r.x >= MAP_W || r.y >= MAP_H) {
                    expect.fail(`robot ${r.id} exited map at tick ${tick}: (${r.x.toFixed(2)}, ${r.y.toFixed(2)})`);
                }
            }
        }
        expect(true).toBe(true); // all 500 ticks clean
    });

    it('antigrav robot with capture_factory goal reaches a factory capture zone within 400 ticks', () => {
        // Isolated robot — no other robots blocking, only factories and fences.
        // This replicates the antigrav robot cycling near factories seen in the screenshot.
        const map: WarMap = {
            width: MAP_W, height: MAP_H,
            objects: [
                ...[0,1,2,3,4,5,6,7].map(x => fence(x, 0)),
                ...[0,1,2,3,4,5,6,7].map(x => fence(x, 63)),
                factory(0, 10, 'electronics', Owner.BLUE),
                factory(4, 10, 'chassis',     Owner.BLUE),
                factory(0, 15, 'missiles',    Owner.BLUE),
                factory(4, 15, 'cannons',     Owner.BLUE),
                factory(0, 20, 'phasers',     Owner.BLUE),
                factory(4, 20, 'nuclear',     Owner.BLUE),
                {
                    id: 'r0', type: 'robot',
                    x: 0.5, y: 14,
                    owner: Owner.RED,
                    facing: Direction.S,
                    goal: RobotGoal.CAPTURE_FACTORY,
                    robotConfig: { chassis: Chassis.ANTIGRAV, electronics: Electronics.STANDARD },
                } as RobotObject,
            ],
            tick: 0,
        };

        const robot = map.objects.find(o => o.id === 'r0')! as RobotObject;
        const zone  = CAPTURE_ZONES['factory']!;
        const factories = map.objects.filter(o => o.type === 'factory');

        const trace: string[] = [];
        let reached = false;

        for (let tick = 0; tick < 400; tick++) {
            map.tick = tick;
            const occ = buildOccupancy(map);
            const action = dummyAI(robot, map, occ);
            applyAction(robot, action, map, occ);

            trace.push(`t=${String(tick).padStart(3)} (${robot.x.toFixed(2)},${robot.y.toFixed(2)}) f=${robot.facing??Direction.N} ${robot.nav?.navMode??'goal'}`);

            const inZone = factories.some(fac => {
                const gx = fac.x + zone.dx, gy = fac.y + zone.dy;
                return Math.max(Math.abs(robot.x - gx), Math.abs(robot.y - gy)) <= zone.radius;
            });
            if (inZone) { reached = true; break; }
        }

        if (!reached) console.log('LAST 40 TICKS:\n' + trace.slice(-40).join('\n'));
        expect(reached).toBe(true);
    });
});
