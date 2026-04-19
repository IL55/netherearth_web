import { ObjectType } from '../game/core/warmap';
import * as BABYLON from '@babylonjs/core';
import { cycleOwner } from '../game/core/warmap';
import type { WarMap } from '../game/core/warmap';

export const attachGameControls = (
    scene: BABYLON.Scene,
    warMap: WarMap,
    onUpdate: () => void,
) => {
    const observer = scene.onKeyboardObservable.add((kbInfo) => {
        if (kbInfo.type !== BABYLON.KeyboardEventTypes.KEYDOWN) return;

        switch (kbInfo.event.key) {
            case 't': {
                warMap.tiles
                    .filter(o => o.type === ObjectType.FACTORY || o.type === ObjectType.WARBASE)
                    .forEach(o => cycleOwner(o));
                onUpdate();
                break;
            }
        }
    });
    return () => {
        if (observer) scene.onKeyboardObservable.remove(observer);
    };
};
