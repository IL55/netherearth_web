import * as BABYLON from '@babylonjs/core';
import type { ShipInput } from '../game/ship';

// Arrow keys: 4 horizontal directions.  Space: ascend (auto-descent when released).
export function attachShipControls(scene: BABYLON.Scene, input: ShipInput): void {
    scene.onKeyboardObservable.add((kbInfo) => {
        const down = kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN;
        switch (kbInfo.event.key) {
            case 'ArrowLeft':  input.left     = down; break;
            case 'ArrowRight': input.right    = down; break;
            case 'ArrowUp':    input.forward  = down; break;
            case 'ArrowDown':  input.backward = down; break;
            case ' ':          input.ascend   = down; break;
        }
    });
}
