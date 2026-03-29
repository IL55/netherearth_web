import * as BABYLON from '@babylonjs/core';
import type { ShipInput } from '../game/ship';

// Arrow keys: 4 horizontal directions.  Space: ascend (auto-descent when released).
export function attachShipControls(scene: BABYLON.Scene, input: ShipInput): void {
    scene.onKeyboardObservable.add((kbInfo) => {
        const down = kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN;
        switch (kbInfo.event.key) {
            case 'ArrowLeft':  input.forward  = down; break;
            case 'ArrowRight': input.backward = down; break;
            case 'ArrowUp':    input.left     = down; break;
            case 'ArrowDown':  input.right    = down; break;
            case ' ':          input.ascend   = down; break;
        }
    });
}
