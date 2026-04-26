const T = '/models/textures';

export interface OverlayConfig {
    texture: string;
    // World-space position offsets from the model's (px, 1, pz) anchor
    dx: number; dy: number; dz: number;
    // Euler rotation of the overlay plane (radians)
    rx: number; ry: number; rz: number;
    // Plane dimensions
    w: number; h: number;
}

// Maps texture key → overlay plane config.
// Naming convention from original .ase sources:
//   r1 = red/owner-colored variant
//   w1 = first white/neutral structural variant (windows, panels, etc.)
//   w2 = second white/neutral structural variant
export const MODEL_OVERLAY: Record<string, OverlayConfig> = {
    // lowwall2: short wall ~1 unit tall — texture shown flat on top face
    lowwall2:  { texture: `${T}/lowwall2w1.bmp`,  dx: 0, dy: 0.51, dz: 0,    rx: Math.PI / 2, ry: 3 * Math.PI / 2, rz: 0,            w: 1, h: 1 },
    lowwall1:  { texture: `${T}/lowwall1w1.bmp`,  dx: 0, dy: 0.51, dz: 0,    rx: Math.PI / 2, ry: 3 * Math.PI / 2, rz: 0,            w: 1, h: 1 },
    lowwall3:  { texture: `${T}/lowwall3w1.bmp`,  dx: 0, dy: 0.51, dz: 0,    rx: Math.PI / 2, ry: 3 * Math.PI / 2, rz: 0,            w: 1, h: 1 },
    // highwall1/2: tall walls — texture on the outer vertical face (facing -X)
    highwall1: { texture: `${T}/highwall1w1.bmp`, dx: 0.51, dy: 0.5, dz: 0, rx: 0,           ry: -Math.PI / 2,    rz: 0,            w: 1, h: 1 },
    highwall2: { texture: `${T}/highwall2w1.bmp`, dx: 0.51, dy: 0.5, dz: 0, rx: 0,           ry: -Math.PI / 2,    rz: 0,            w: 1, h: 1 },
    // building: central block — texture on the outer vertical face (facing -X)
    building:  { texture: `${T}/buildingw1.bmp`,  dx: 0.51, dy: 0.5, dz: 0, rx: 0,           ry: -Math.PI / 2,    rz: 0,            w: 1, h: 1 },
    // back-face brick textures (facing +X, opposite side)
    'brick-side':   { texture: `${T}/highwall2w2.bmp`, dx: -0.51, dy: 0.5, dz: 0, rx: 0, ry: Math.PI / 2, rz: 0, w: 1, h: 1 },
    'brick-center': { texture: `${T}/highwall2w1.bmp`, dx: -0.51, dy: 0.5, dz: 0, rx: 0, ry: Math.PI / 2, rz: 0, w: 1, h: 1 },
};
