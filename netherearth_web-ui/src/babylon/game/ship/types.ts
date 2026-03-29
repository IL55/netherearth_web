export interface ShipState {
    x: number;
    y: number;
    height: number;
    vx?: number;
    vy?: number;
}

export interface ShipInput {
    left: boolean;
    right: boolean;
    forward: boolean;
    backward: boolean;
    ascend: boolean;
}

// Axis-aligned bounding box in game XY coordinates.
export interface ShipObstacle {
    x0: number; y0: number;
    x1: number; y1: number;
    height: number;
}

export function createShipInput(): ShipInput {
    return { left: false, right: false, forward: false, backward: false, ascend: false };
}
