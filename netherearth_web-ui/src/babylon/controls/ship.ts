import * as BABYLON from '@babylonjs/core';
import type { ShipInput } from '../game/ship/index';
import { loadKeyBindings } from './keybindings';

export function attachShipControls(scene: BABYLON.Scene, input: ShipInput): () => void {
    const observer = scene.onKeyboardObservable.add((kbInfo) => {
        const down = kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN;
        const bindings = loadKeyBindings();
        
        // Use event.code for layout-independent binding matching
        const code = kbInfo.event.code;
        
        // Handle Space correctly as it might come as 'Space' in code
        const isFire = code === bindings.fire || 
                      (bindings.fire === 'Space' && kbInfo.event.key === ' ');

        if (code === bindings.left) input.forward = down;
        else if (code === bindings.right) input.backward = down;
        else if (code === bindings.up) input.left = down;
        else if (code === bindings.down) input.right = down;
        else if (isFire) input.ascend = down;
    });
    return () => {
        if (observer) scene.onKeyboardObservable.remove(observer);
    };
}
