import * as BABYLON from '@babylonjs/core';
import { cycleOwner, rotateRobots } from '../game/warmap';
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
                warMap.objects
                    .filter(o => o.type === 'factory' || o.type === 'warbase')
                    .forEach(o => cycleOwner(o));
                rotateRobots(warMap);
                onUpdate();
                break;
            }
        }
    });
};
