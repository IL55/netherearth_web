/**
 * Renderer — 3D scene object lifecycle tests
 *
 * Verifies that the Renderer correctly adds, updates, and removes
 * BabylonJS scene nodes in response to WarMap changes.
 * Uses NullEngine (no WebGL required).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { Renderer } from '../../../view/map/renderer';
import { ObjectType, Owner, Direction } from '../../../game/core/warmap';
import type { WarMap, WarObject, RobotObject } from '../../../game/core/warmap';
import { Chassis, Weapon, Electronics } from '../../../data/robot';
import { makeEnv } from '../../test-utils';

function makeWarMap(...objects: WarObject[]): WarMap {
    return { width: 10, height: 10, objects, projectiles: [], tick: 0 };
}

function makeRobot(id: string, x: number, y: number): RobotObject {
    return {
        id, type: ObjectType.ROBOT, x, y, owner: Owner.RED,
        facing: Direction.E,
        robotConfig: { chassis: Chassis.TRACKS, weapon: Weapon.CANNON, electronics: Electronics.STANDARD },
    };
}

function makeFactory(id: string): WarObject {
    return { id, type: ObjectType.FACTORY, x: 0, y: 0, subtype: 'cannons', owner: Owner.BLUE };
}

// ─── Initial render ───────────────────────────────────────────────────────────

describe('Renderer — initial render', () => {
    let engine: NullEngine;
    let scene: Scene;
    let renderer: Renderer;

    beforeEach(() => {
        const env = makeEnv();
        engine = env.engine; scene = env.scene;
        renderer = new Renderer(env.models, scene, new Vector3(0, 0, 0));
    });
    afterEach(() => { scene.dispose(); engine.dispose(); });

    it('adds scene nodes for a robot on first render', () => {
        const before = scene.transformNodes.length;
        renderer.render(makeWarMap(makeRobot('r1', 5, 5)));
        expect(scene.transformNodes.length).toBeGreaterThan(before);
    });

    it('adds scene nodes for a factory on first render', () => {
        const before = scene.transformNodes.length;
        renderer.render(makeWarMap(makeFactory('f1')));
        expect(scene.transformNodes.length).toBeGreaterThan(before);
    });

    it('adds nodes for each object independently', () => {
        const oneRobot = scene.transformNodes.length;
        const env2 = makeEnv();
        const r2 = new Renderer(env2.models, env2.scene, new Vector3(0, 0, 0));
        r2.render(makeWarMap(makeRobot('r1', 0, 0), makeRobot('r2', 2, 2)));
        const twoRobots = env2.scene.transformNodes.length;
        expect(twoRobots).toBeGreaterThan(oneRobot);
        env2.scene.dispose(); env2.engine.dispose();
    });
});

// ─── State cache — no unnecessary redraws ─────────────────────────────────────

describe('Renderer — state cache', () => {
    let engine: NullEngine;
    let scene: Scene;
    let renderer: Renderer;

    beforeEach(() => {
        const env = makeEnv();
        engine = env.engine; scene = env.scene;
        renderer = new Renderer(env.models, scene, new Vector3(0, 0, 0));
    });
    afterEach(() => { scene.dispose(); engine.dispose(); });

    it('does not add new nodes when the same object is rendered twice unchanged', () => {
        const warMap = makeWarMap(makeRobot('r1', 5, 5));
        renderer.render(warMap);
        const after1 = scene.transformNodes.length;
        renderer.render(warMap);
        expect(scene.transformNodes.length).toBe(after1);
    });
});

// ─── Object removal ───────────────────────────────────────────────────────────

describe('Renderer — object removal', () => {
    let engine: NullEngine;
    let scene: Scene;
    let renderer: Renderer;

    beforeEach(() => {
        const env = makeEnv();
        engine = env.engine; scene = env.scene;
        renderer = new Renderer(env.models, scene, new Vector3(0, 0, 0));
    });
    afterEach(() => { scene.dispose(); engine.dispose(); });

    it('removes nodes when a robot is removed from warMap', () => {
        const robot = makeRobot('r1', 5, 5);
        const warMap = makeWarMap(robot);
        renderer.render(warMap);
        const afterAdd = scene.transformNodes.length;

        warMap.objects = [];
        renderer.render(warMap);
        expect(scene.transformNodes.length).toBeLessThan(afterAdd);
    });

    it('removes nodes when a factory is removed from warMap', () => {
        const factory = makeFactory('f1');
        const warMap = makeWarMap(factory);
        renderer.render(warMap);
        const afterAdd = scene.transformNodes.length;

        warMap.objects = [];
        renderer.render(warMap);
        expect(scene.transformNodes.length).toBeLessThan(afterAdd);
    });
});

// ─── State change — re-render ─────────────────────────────────────────────────

describe('Renderer — re-render on state change', () => {
    let engine: NullEngine;
    let scene: Scene;
    let renderer: Renderer;

    beforeEach(() => {
        const env = makeEnv();
        engine = env.engine; scene = env.scene;
        renderer = new Renderer(env.models, scene, new Vector3(0, 0, 0));
    });
    afterEach(() => { scene.dispose(); engine.dispose(); });

    it('robot is still present in scene after it moves (state change triggers redraw)', () => {
        const robot = makeRobot('r1', 5, 5);
        const warMap = makeWarMap(robot);
        renderer.render(warMap);
        const afterFirst = scene.transformNodes.length;

        // Simulate robot moving
        robot.x = 6;
        renderer.render(warMap);

        // Node count should be the same — old disposed, new created
        expect(scene.transformNodes.length).toBe(afterFirst);
    });

    it('factory is still present in scene after ownership changes', () => {
        const factory = makeFactory('f1');
        const warMap = makeWarMap(factory);
        renderer.render(warMap);
        const afterFirst = scene.transformNodes.length;

        factory.owner = Owner.RED; // ownership flip
        renderer.render(warMap);

        expect(scene.transformNodes.length).toBe(afterFirst);
    });
});

// ─── Dying robot blink ────────────────────────────────────────────────────────

describe('Renderer — dying robot blink', () => {
    let engine: NullEngine;
    let scene: Scene;
    let renderer: Renderer;

    beforeEach(() => {
        const env = makeEnv();
        engine = env.engine; scene = env.scene;
        renderer = new Renderer(env.models, scene, new Vector3(0, 0, 0));
    });
    afterEach(() => { scene.dispose(); engine.dispose(); });

    it('does not render a robot with odd dyingTicks (blink-off frame)', () => {
        const robot: RobotObject = { ...makeRobot('r1', 5, 5), dyingTicks: 3 };
        const baseline = scene.transformNodes.length;
        renderer.render(makeWarMap(robot));
        expect(scene.transformNodes.length).toBe(baseline); // nothing added
    });

    it('renders a robot with even dyingTicks (blink-on frame)', () => {
        const robot: RobotObject = { ...makeRobot('r1', 5, 5), dyingTicks: 2 };
        const baseline = scene.transformNodes.length;
        renderer.render(makeWarMap(robot));
        expect(scene.transformNodes.length).toBeGreaterThan(baseline);
    });
});

// ─── Missing model graceful handling ─────────────────────────────────────────

describe('Renderer — missing model', () => {
    it('does not crash when chassis model is absent', () => {
        const { engine, scene, models, mapBegin } = makeEnv();
        models.delete('e-tracks');
        const renderer = new Renderer(models, scene, mapBegin);
        expect(() => renderer.render(makeWarMap(makeRobot('r1', 0, 0)))).not.toThrow();
        scene.dispose(); engine.dispose();
    });

    it('robot stays absent on re-render when model was always missing', () => {
        const { engine, scene, models, mapBegin } = makeEnv();
        models.delete('e-tracks');
        const renderer = new Renderer(models, scene, mapBegin);
        const robot = makeRobot('r1', 0, 0);
        const warMap = makeWarMap(robot);
        renderer.render(warMap);
        const after1 = scene.transformNodes.length;

        robot.x = 1; // state change
        renderer.render(warMap);
        // Node count should not decrease (nothing was added, nothing to remove)
        expect(scene.transformNodes.length).toBe(after1);
    });
});

// ─── Id collision regression ──────────────────────────────────────────────────
//
// Bug: main.ts pre-placed robots used ids "robot_0".."robot_N".
// tickBuild also generates "robot_0", "robot_1", … starting from 0.
// On the first game tick the renderer saw two warMap objects with the same id,
// disposed the first robot's nodes, and rendered the second — making the
// controlled robot invisible.
// Fix: pre-placed robots now use "init_robot_N" ids (different prefix).

describe('Renderer — id collision regression', () => {
    let engine: NullEngine;
    let scene: Scene;
    let renderer: Renderer;

    beforeEach(() => {
        const env = makeEnv();
        engine = env.engine; scene = env.scene;
        renderer = new Renderer(env.models, scene, new Vector3(0, 0, 0));
    });
    afterEach(() => { scene.dispose(); engine.dispose(); });

    it('preset (init_robot_0) and built (robot_0) robots with distinct ids both remain rendered', () => {
        const preset = makeRobot('init_robot_0', 0, 14);
        const built  = makeRobot('robot_0',      5, 5);
        renderer.render(makeWarMap(preset, built));
        // Both robots contributed nodes — more than a single robot would add
        const env2 = makeEnv();
        const r2 = new Renderer(env2.models, env2.scene, new Vector3(0, 0, 0));
        r2.render(makeWarMap(makeRobot('only_one', 0, 0)));
        const singleRobotNodes = env2.scene.transformNodes.length;
        expect(scene.transformNodes.length).toBeGreaterThan(singleRobotNodes);
        env2.scene.dispose(); env2.engine.dispose();
    });

    it('two objects sharing the same id: the second replaces the first (documents collision behavior)', () => {
        const original = makeRobot('robot_0', 0, 14);
        renderer.render(makeWarMap(original));
        const afterOriginal = scene.transformNodes.length;

        // Simulate tickBuild creating a robot_0 at a different position
        const collision = makeRobot('robot_0', 5, 5);
        renderer.render(makeWarMap(original, collision));
        // Collision causes original's nodes to be disposed and collision's nodes rendered.
        // Net count is the same as one robot (not doubled, not zero).
        expect(scene.transformNodes.length).toBe(afterOriginal);
    });
});
