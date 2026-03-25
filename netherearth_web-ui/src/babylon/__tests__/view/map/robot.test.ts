import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NullEngine, Scene, Vector3 } from '@babylonjs/core';
import type { AbstractMesh } from '@babylonjs/core';
import { placeRobot, robotConfigs } from '../../../view/map/robot';
import { Owner } from '../../../game/owner';
import { makeEnv } from '../../test-utils';

import type { RobotConfig } from '../../../view/map/robot';

const configs = Object.values(robotConfigs) as RobotConfig[];

describe('robotConfigs', () => {
    it('each config has a chassis', () => {
        configs.forEach(config => {
            expect(config.chassis).toBeTruthy();
        });
    });

    it('armed configs have a weapon', () => {
        const armed = configs.filter(c => c.weapon);
        expect(armed.length).toBeGreaterThan(0);
        armed.forEach(config => expect(config.weapon).toBeTruthy());
    });

    it('has 4 configs', () => {
        expect(configs).toHaveLength(4);
    });
});

describe('placeRobot', () => {
    let engine: NullEngine;
    let scene: Scene;
    let models: Map<string, AbstractMesh>;
    const mapBegin = new Vector3(0, 0, 0);
    const STACK_GAP = 0; // disable gap so math is predictable

    beforeEach(() => {
        ({ engine, scene, models } = makeEnv());
    });

    afterEach(() => {
        scene.dispose();
        engine.dispose();
    });

    it('does not throw with a valid config', () => {
        expect(() => placeRobot(models, mapBegin, 5, 5, robotConfigs['cannon'], Owner.RED, 0, STACK_GAP)).not.toThrow();
    });

    it('does not throw when chassis model is missing', () => {
        const partial = new Map(models);
        partial.delete('h-tracks');
        expect(() => placeRobot(partial, mapBegin, 5, 5, robotConfigs['cannon'], Owner.RED, 0, STACK_GAP)).not.toThrow();
    });

    it('does not throw when weapon model is missing', () => {
        const partial = new Map(models);
        partial.delete('h-cannon');
        expect(() => placeRobot(partial, mapBegin, 5, 5, robotConfigs['cannon'], Owner.RED, 0, STACK_GAP)).not.toThrow();
    });

    it('adds 3 transform nodes for an armed config without nuclear', () => {
        const config = configs.find(c => c.weapon && !c.nuclear)!;
        const before = scene.transformNodes.length;
        placeRobot(models, mapBegin, 0, 0, config, Owner.RED, 0, STACK_GAP);
        expect(scene.transformNodes.length - before).toBe(3); // chassis + weapon + electronics
    });

    it('adds 4 transform nodes for a config with nuclear', () => {
        const config = configs.find(c => c.nuclear)!;
        const before = scene.transformNodes.length;
        placeRobot(models, mapBegin, 0, 0, config, Owner.RED, 0, STACK_GAP);
        expect(scene.transformNodes.length - before).toBe(4); // chassis + weapon + nuclear + electronics
    });

    it('places chassis XZ at the requested tile coords', () => {
        const before = scene.transformNodes.length;
        placeRobot(models, mapBegin, 3, 7, robotConfigs['cannon'], Owner.RED, 0, STACK_GAP);
        const chassis = scene.transformNodes[before];
        expect(chassis.position.x).toBeCloseTo(3, 1);
        expect(chassis.position.z).toBeCloseTo(7, 1);
    });

    it('applies mapBegin offset to XZ position', () => {
        const begin = new Vector3(10, 0, 5);
        const before = scene.transformNodes.length;
        placeRobot(models, begin, 3, 7, robotConfigs['cannon'], Owner.RED, 0, STACK_GAP);
        const chassis = scene.transformNodes[before];
        expect(chassis.position.x).toBeCloseTo(13, 1);
        expect(chassis.position.z).toBeCloseTo(12, 1);
    });

    it('applies rotation to all placed parts', () => {
        const before = scene.transformNodes.length;
        placeRobot(models, mapBegin, 0, 0, robotConfigs['cannon'], Owner.RED, Math.PI / 2, STACK_GAP);
        const newNodes = scene.transformNodes.slice(before);
        newNodes.forEach(node => {
            expect(node.rotation.y).toBeCloseTo(Math.PI / 2);
        });
    });

    it('stacks parts vertically: weapon above chassis, electronics above weapon', () => {
        const config = configs.find(c => c.weapon && !c.nuclear && c.electronics)!;
        const before = scene.transformNodes.length;
        placeRobot(models, mapBegin, 0, 0, config, Owner.RED, 0, STACK_GAP);
        const [chassis, weapon, electronics] = scene.transformNodes.slice(before);
        expect(weapon.position.y).toBeGreaterThan(chassis.position.y);
        expect(electronics.position.y).toBeGreaterThan(weapon.position.y);
    });

    it('chassis bottom is grounded at y=1', () => {
        const before = scene.transformNodes.length;
        placeRobot(models, mapBegin, 0, 0, robotConfigs['cannon'], Owner.RED, 0, STACK_GAP);
        const chassis = scene.transformNodes[before];
        chassis.computeWorldMatrix(true);
        const childMeshes = chassis.getChildMeshes();
        childMeshes.forEach(m => m.computeWorldMatrix(true));
        const minY = Math.min(...childMeshes.map(m => m.getBoundingInfo().boundingBox.minimumWorld.y));
        expect(minY).toBeCloseTo(1, 1);
    });

    it('uses e- model prefix for BLUE owner', () => {
        const partial = new Map(models);
        partial.delete('e-tracks');
        // with e-tracks missing, chassis won't be placed → 0 transform nodes
        const before = scene.transformNodes.length;
        placeRobot(partial, mapBegin, 0, 0, robotConfigs['cannon'], Owner.BLUE, 0, STACK_GAP);
        expect(scene.transformNodes.length - before).toBe(0);
    });

    it('all configs place robots without throwing', () => {
        configs.forEach((config, i) => {
            expect(() => placeRobot(models, mapBegin, i, 0, config, Owner.RED, 0, STACK_GAP)).not.toThrow();
        });
    });
});
