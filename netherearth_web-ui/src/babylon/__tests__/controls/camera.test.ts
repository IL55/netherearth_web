import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NullEngine, Scene, ArcRotateCamera, Vector3, KeyboardInfo, KeyboardEventTypes } from '@babylonjs/core';
import { updateCameraTarget } from '../../controls/camera';

describe('updateCameraTarget', () => {
    it('updates camera target when ship moves beyond threshold', () => {
        const shipTarget = new Vector3(0, 2, 0);
        const ship = { x: 5, y: 5 };
        const mapBegin = new Vector3(0, 0, 0);
        
        updateCameraTarget(shipTarget, ship, mapBegin, 3.5);
        
        expect(shipTarget.x).toBeCloseTo(1.5);
        expect(shipTarget.z).toBeCloseTo(1.5);
    });

    it('does not update camera target when ship is within threshold', () => {
        const shipTarget = new Vector3(0, 2, 0);
        const ship = { x: 2, y: 2 };
        const mapBegin = new Vector3(0, 0, 0);
        
        updateCameraTarget(shipTarget, ship, mapBegin, 3.5);
        
        expect(shipTarget.x).toBeCloseTo(0);
        expect(shipTarget.z).toBeCloseTo(0);
    });
});
