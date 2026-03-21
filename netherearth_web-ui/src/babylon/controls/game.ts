import * as BABYLON from '@babylonjs/core';
import { removeObject, findLastByType } from '../game/warmap';
import type { WarMap } from '../game/warmap';

export const attachGameControls = (
    scene: BABYLON.Scene,
    warMap: WarMap,
    onUpdate: () => void,
) => {
    scene.onKeyboardObservable.add((kbInfo) => {
        if (kbInfo.type !== BABYLON.KeyboardEventTypes.KEYDOWN) return;

        switch (kbInfo.event.key) {
            case 't': {
                const robot = findLastByType(warMap, 'robot');
                if (robot) {
                    removeObject(warMap, robot.id);
                    onUpdate();
                }
                break;
            }
        }
    });
};
