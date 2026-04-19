import { ObjectType } from '../core/warmap';
import { Owner } from '../types/owner';
import type { WarMap } from '../core/warmap';

function hasRobots(warMap: WarMap, owner: Owner): boolean {
    return warMap.robots.some(
        o => o.owner === owner && o.dyingTicks === undefined,
    );
}

/**
 * Returns the winning Owner when the game is decided; null while in progress.
 *
 * Two win conditions:
 *  1. One team owns ALL warbases (no neutral, no enemy bases remaining).
 *  2. One team has no warbases AND no live robots — they cannot recapture anything.
 *     A neutral warbase only keeps the game alive when at least one robot still exists
 *     that could capture it.
 */
export function checkVictory(warMap: WarMap): Owner | null {
    const warbases = warMap.tiles.filter(o => o.type === ObjectType.WARBASE);
    if (warbases.length === 0) return null;

    // Condition 1: complete map control
    for (const owner of [Owner.RED, Owner.BLUE] as const) {
        if (warbases.every(o => o.owner === owner)) return owner;
    }

    // Condition 2: one side eliminated (no warbases + no live robots)
    const sides: [Owner, Owner][] = [[Owner.BLUE, Owner.RED], [Owner.RED, Owner.BLUE]];
    for (const [loser, winner] of sides) {
        const hasBase = warbases.some(o => o.owner === loser);
        if (!hasBase && !hasRobots(warMap, loser)) return winner;
    }

    return null;
}
