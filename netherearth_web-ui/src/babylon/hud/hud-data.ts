/**
 * Pure data extraction for the HUD.
 * Reads warMap objects to count robots, warbases and owned factories per owner.
 */
import { ObjectType } from '../game/core/warmap';
import type { WarMap } from '../game/core/warmap';
import { Owner } from '../game/types/owner';
import { DAY_TICKS } from '../game/resources';

export interface OwnerStats {
    robots:      number;
    warbases:    number;
    electronics: number;
    chassis:     number;
    missiles:    number;
    cannons:     number;
    phasers:     number;
    nuclear:     number;
}

export interface HudData {
    /** Completed in-game days (increments every DAY_TICKS ticks). */
    day: number;
    /** Progress toward next day, 00–99. */
    dayProgress: number;
    red:  OwnerStats;
    blue: OwnerStats;
}

function emptyStats(): OwnerStats {
    return { robots: 0, warbases: 0, electronics: 0, chassis: 0, missiles: 0, cannons: 0, phasers: 0, nuclear: 0 };
}

function ownerStats(warMap: WarMap, owner: Owner): OwnerStats {
    const s = emptyStats();
    for (const obj of warMap.objects) {
        if (obj.owner !== owner) continue;
        if (obj.type === ObjectType.ROBOT)   { s.robots++;   continue; }
        if (obj.type === ObjectType.WARBASE) { s.warbases++; continue; }
        if (obj.type === ObjectType.FACTORY && obj.subtype) {
            const key = obj.subtype as keyof OwnerStats;
            if (key in s) (s[key] as number)++;
        }
    }
    return s;
}

export function buildHudData(warMap: WarMap): HudData {
    const tick = warMap.tick ?? 0;
    return {
        day:         Math.floor(tick / DAY_TICKS),
        dayProgress: Math.floor((tick % DAY_TICKS) / DAY_TICKS * 100),
        red:         ownerStats(warMap, Owner.RED),
        blue:        ownerStats(warMap, Owner.BLUE),
    };
}
