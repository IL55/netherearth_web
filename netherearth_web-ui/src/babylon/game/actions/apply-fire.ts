import type { WarMap, RobotObject, Direction } from '../warmap';
import { WEAPON_DAMAGE, WEAPON_RANGE, calcDamageFalloff } from '../../data/robot';
import { spawnProjectile } from '../projectile';

function directionToward(fromX: number, fromY: number, toX: number, toY: number): Direction {
    const dx = toX - fromX;
    const dy = toY - fromY;
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'E' : 'W';
    return dy > 0 ? 'S' : 'N';
}

export function applyFire(
    robot: RobotObject,
    targetId: string,
    warMap: WarMap,
): boolean {
    robot.lastFiredAt = warMap.tick ?? 0;
    const target = warMap.objects.find(
        (o): o is RobotObject => o.id === targetId && o.type === 'robot',
    );
    if (target) {
        const weapon = robot.robotConfig?.weapon;
        if (weapon && target.health !== undefined) {
            const baseDmg  = WEAPON_DAMAGE[weapon] ?? 0;
            const maxRange = WEAPON_RANGE[weapon]  ?? 1;
            const dist     = Math.abs(target.x - robot.x) + Math.abs(target.y - robot.y);
            const dmg      = Math.round(baseDmg * calcDamageFalloff(dist, maxRange));
            target.health  = Math.max(0, target.health - dmg);
        }
        target.facing = directionToward(target.x, target.y, robot.x, robot.y);
        spawnProjectile(warMap, robot, target);
    }
    return true;
}
