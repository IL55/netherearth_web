import { ObjectType, Owner } from '../../game/core/warmap';
import type { WarMap } from '../../game/core/warmap';
import { ConstructionYard3D } from './construction-yard-3d';
import type * as BABYLON from '@babylonjs/core';
import type { OwnerResources } from '../../game/resources';
import type { RobotConfig } from '../../data/robot';
import { bus } from '../../game/event-bus';
import { SOUNDS } from '../../game/types/sound';

export class ConstructionYardTrigger {
    private isConstructionYardOpen = false;
    private hasTriggeredYard = false;
    private constructionYard: ConstructionYard3D | null = null;

    constructor(
        private scene: BABYLON.Scene,
        private models: Map<string, BABYLON.AbstractMesh>,
        private ownerResources: OwnerResources,
        private onCreate: (config: RobotConfig) => void,
        private onExit: () => void,
    ) {}

    public check(warMap: WarMap, ship: { x: number; y: number; height: number }): void {
        const redWarbase = warMap.tiles.find(o => o.type === ObjectType.WARBASE && o.owner === Owner.RED);
        if (redWarbase) {
            const hX = redWarbase.x + 1.5;
            const hY = redWarbase.y + 2;
            const dist = Math.sqrt((ship.x - hX) ** 2 + (ship.y - hY) ** 2);

            if (dist < 0.1 && ship.height <= 1.05) {
                if (!this.hasTriggeredYard) {
                    this.isConstructionYardOpen = true;
                    this.hasTriggeredYard = true;
                    bus.emit({ type: 'sound:play', name: SOUNDS.SELECT });

                    if (!this.constructionYard) {
                        this.constructionYard = new ConstructionYard3D(
                            this.scene, this.models, this.ownerResources, warMap,
                            this.onCreate,
                            () => { this.isConstructionYardOpen = false; this.onExit(); },
                        );
                    }
                    this.constructionYard.open();
                }
            } else if (dist >= 0.1 || ship.height > 1.2) {
                this.hasTriggeredYard = false;
            }
        }
    }

    public isOpen(): boolean {
        return this.isConstructionYardOpen;
    }

    public dispose(): void {
        if (this.constructionYard) {
            this.constructionYard.dispose();
            this.constructionYard = null;
        }
    }
}
