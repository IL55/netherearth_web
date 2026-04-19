import { ObjectType } from '../../game/core/warmap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NullEngine, Scene, KeyboardInfo, KeyboardEventTypes } from '@babylonjs/core';
import { attachGameControls } from '../../controls/game';
import { Owner } from '../../game/types/owner';
import type { WarMap } from '../../game/core/warmap';

function makeEnv() {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const warMap: WarMap = {
        width: 1,
        height: 1,
        tiles: [
            { id: 'tile_0_0',  type: ObjectType.TILE,     x: 0, y: 0 } as any,
            { id: 'factory_0', type: ObjectType.FACTORY,  x: 1, y: 0, subtype: 'cannons' } as any,
            { id: 'warbase_0', type: ObjectType.WARBASE,  x: 2, y: 0 } as any,
        ],
        robots: [],
        projectiles: [], killCounts: {}, tick: 0
    };
    return { engine, scene, warMap };
}

function pressKey(scene: Scene, key: string) {
    scene.onKeyboardObservable.notifyObservers(
        new KeyboardInfo(KeyboardEventTypes.KEYDOWN, { key } as KeyboardEvent)
    );
}

describe('attachGameControls - t key cycles owner', () => {
    let engine: NullEngine;
    let scene: Scene;
    let warMap: WarMap;
    let updateCount: number;

    beforeEach(() => {
        ({ engine, scene, warMap } = makeEnv());
        updateCount = 0;
        attachGameControls(scene, warMap, () => { updateCount++; });
    });

    afterEach(() => {
        scene.dispose();
        engine.dispose();
    });

    it('first press sets owner to 1 on all factories and warbases', () => {
        pressKey(scene, 't');
        const factory = warMap.tiles.find(o => o.id === 'factory_0')!;
        const warbase = warMap.tiles.find(o => o.id === 'warbase_0')!;
        expect(factory.owner).toBe(Owner.RED);
        expect(warbase.owner).toBe(Owner.RED);
    });

    it('second press sets owner to 2', () => {
        pressKey(scene, 't');
        pressKey(scene, 't');
        const factory = warMap.tiles.find(o => o.id === 'factory_0')!;
        const warbase = warMap.tiles.find(o => o.id === 'warbase_0')!;
        expect(factory.owner).toBe(Owner.BLUE);
        expect(warbase.owner).toBe(Owner.BLUE);
    });

    it('third press clears owner back to neutral', () => {
        pressKey(scene, 't');
        pressKey(scene, 't');
        pressKey(scene, 't');
        const factory = warMap.tiles.find(o => o.id === 'factory_0')!;
        const warbase = warMap.tiles.find(o => o.id === 'warbase_0')!;
        expect(factory.owner).toBe(Owner.NEUTRAL);
        expect(warbase.owner).toBe(Owner.NEUTRAL);
    });

    it('calls onUpdate on every press', () => {
        pressKey(scene, 't');
        pressKey(scene, 't');
        expect(updateCount).toBe(Owner.BLUE);
    });

    it('does not affect tiles', () => {
        pressKey(scene, 't');
        const tile = warMap.tiles.find(o => o.id === 'tile_0_0')!;
        expect(tile.owner).toBeUndefined();
    });


    it('other keys do not trigger updates', () => {
        pressKey(scene, 'a');
        pressKey(scene, 'd');
        expect(updateCount).toBe(0);
    });

    it('KEYUP for t does not trigger update', () => {
        scene.onKeyboardObservable.notifyObservers(
            new KeyboardInfo(KeyboardEventTypes.KEYUP, { key: 't' } as KeyboardEvent)
        );
        expect(updateCount).toBe(0);
    });
});
