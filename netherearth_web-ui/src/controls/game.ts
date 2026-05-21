import { ObjectType } from '../game/core/warmap';
import * as BABYLON from '@babylonjs/core';
import { cycleOwner } from '../game/core/warmap';
import type { WarMap } from '../game/core/warmap';

export const attachGameControls = (
    scene: BABYLON.Scene,
    warMap: WarMap,
    onUpdate: () => void,
) => {
    // Game debug controls removed per user request
    return () => {
    };
};
