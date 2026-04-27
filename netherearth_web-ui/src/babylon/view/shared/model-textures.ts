const T = '/models/textures';

export interface OverlayConfig {
    texture: string;
    // World-space position offsets from the model's (px, 1, pz) anchor
    dx: number; dy: number; dz: number;
    // Euler rotation of the overlay plane (radians)
    rx: number; ry: number; rz: number;
    // Plane dimensions
    w: number; h: number;
    // Brightness multiplier applied to diffuseColor (0–1, default 1)
    brightness?: number;
    // In-plane texture rotation in radians (applied as texture.wAng)
    texRot?: number;
}

export const MODEL_OVERLAY: Record<string, OverlayConfig> = {
    // ── wall2 ──────────────────────────────────────────────────────────────
    'wall2-top':   { texture: `${T}/lowwall3r1.bmp`,  dx:  0,    dy: 0.51, dz:  0,    rx: Math.PI / 2, ry: 3 * Math.PI / 2, rz: 0, w: 1, h: 1 },
    'wall2-back':  { texture: `${T}/highwall2w2.bmp`, dx: -0.51, dy: 0.25, dz:  0,    rx: 0, ry: Math.PI / 2,  rz: 0, w: 1, h: 0.5 },
    'wall2-front': { texture: `${T}/highwall2w2.bmp`, dx:  0.51, dy: 0.25, dz:  0,    rx: 0, ry: -Math.PI / 2, rz: 0, w: 1, h: 0.5 },
    'wall2-z-neg': { texture: `${T}/highwall2w2.bmp`, dx:  0,    dy: 0.25, dz: -0.51, rx: 0, ry: 0,            rz: 0, w: 1, h: 0.5 },
    'wall2-z-pos': { texture: `${T}/highwall2w2.bmp`, dx:  0,    dy: 0.25, dz:  0.51, rx: 0, ry: Math.PI,      rz: 0, w: 1, h: 0.5 },
    // ── wall4 ──────────────────────────────────────────────────────────────
    'wall4-top':   { texture: `${T}/highwall2w1.bmp`, dx: 0, dy: 1.01, dz: 0, rx: Math.PI / 2, ry: 3 * Math.PI / 2, rz: 0, w: 1, h: 1 },
    // ── wall6 ──────────────────────────────────────────────────────────────
    'wall6-back':  { texture: `${T}/highwall2w2.bmp`, dx: -0.51, dy: 0.5, dz:  0,    rx: 0, ry: Math.PI / 2,  rz: 0, w: 1, h: 1 },
    'wall6-front': { texture: `${T}/highwall2w2.bmp`, dx:  0.51, dy: 0.5, dz:  0,    rx: 0, ry: -Math.PI / 2, rz: 0, w: 1, h: 1 },
    'wall6-z-neg': { texture: `${T}/highwall2w2.bmp`, dx:  0,    dy: 0.5, dz: -0.51, rx: 0, ry: 0,            rz: 0, w: 1, h: 1 },
    'wall6-z-pos': { texture: `${T}/highwall2w2.bmp`, dx:  0,    dy: 0.5, dz:  0.51, rx: 0, ry: Math.PI,      rz: 0, w: 1, h: 1 },
    // ── wall3 ──────────────────────────────────────────────────────────────
    'wall3-top':   { texture: `${T}/highwall2r1.bmp`, dx: 0, dy: 0.51, dz: 0, rx: Math.PI / 2, ry: 3 * Math.PI / 2, rz: 0, w: 1, h: 1 },
    // ── warbase ────────────────────────────────────────────────────────────
    // highwall (h=1)
    'warbase-brick-back':  { texture: `${T}/highwall2w2.bmp`, dx: -0.51, dy: 0.5,  dz:  0,    rx: 0, ry: Math.PI / 2,  rz: 0, w: 1, h: 1   },
    'warbase-front':       { texture: `${T}/lowwall2w2.bmp`,  dx:  0.51, dy: 0.5,  dz:  0,    rx: 0, ry: -Math.PI / 2, rz: 0, w: 1, h: 1   },
    'warbase-brick-z-neg': { texture: `${T}/highwall2w2.bmp`, dx:  0,    dy: 0.5,  dz: -0.51, rx: 0, ry: 0,            rz: 0, w: 1, h: 1   },
    'warbase-brick-z-pos': { texture: `${T}/highwall2w2.bmp`, dx:  0,    dy: 0.5,  dz:  0.51, rx: 0, ry: Math.PI,      rz: 0, w: 1, h: 1   },
    // highwall top face
    'warbase-hw-top':   { texture: `${T}/warbasew2.bmp`,  dx:  0,    dy: 1.01, dz:  0,    rx: Math.PI / 2, ry: 3 * Math.PI / 2, rz: 0, w: 1, h: 1 },
    // heliport cube (warbase model)
    'warbase-hp-front': { texture: `${T}/warbasew1.bmp`, dx:  0.51, dy: 0.5, dz:  0,    rx: 0, ry: -Math.PI / 2, rz: 0, w: 1, h: 1 },
    'warbase-hp-z-neg': { texture: `${T}/warbasew1.bmp`, dx:  0,    dy: 0.5, dz: -0.51, rx: 0, ry: 0,            rz: 0, w: 1, h: 1 },
    'warbase-hp-z-pos': { texture: `${T}/warbasew1.bmp`, dx:  0,    dy: 0.5, dz:  0.51, rx: 0, ry: Math.PI,      rz: 0, w: 1, h: 1 },
    // lowwall top face
    'warbase-lw-top':  { texture: `${T}/lowwall1r1.bmp`,  dx:  0,    dy: 0.51, dz:  0,    rx: Math.PI / 2, ry: 3 * Math.PI / 2, rz: 0, w: 1, h: 1,   brightness: 0.7 },
    // lowwall (h=0.5)
    'warbase-lw-back':     { texture: `${T}/highwall2w2.bmp`, dx: -0.51, dy: 0.25, dz:  0,    rx: 0, ry: Math.PI / 2,  rz: 0, w: 1, h: 0.5 },
    'warbase-lw-front':    { texture: `${T}/lowwall3w2.bmp`,  dx:  0.51, dy: 0.25, dz:  0,    rx: 0, ry: -Math.PI / 2, rz: 0, w: 1, h: 0.5 },
    'warbase-lw-z-neg':    { texture: `${T}/highwall2w2.bmp`, dx:  0,    dy: 0.25, dz: -0.51, rx: 0, ry: 0,            rz: 0, w: 1, h: 0.5 },
    'warbase-lw-z-pos':    { texture: `${T}/highwall2w2.bmp`, dx:  0,    dy: 0.25, dz:  0.51, rx: 0, ry: Math.PI,      rz: 0, w: 1, h: 0.5 },
    // ── factory ────────────────────────────────────────────────────────────
    'factory-lowwall2':      { texture: `${T}/lowwall1r1.bmp`,   dx:  0,    dy: 0.51, dz:  0,    rx: Math.PI / 2, ry: 3 * Math.PI / 2, rz: 0, w: 1,   h: 1,   brightness: 0.7 },
    'factory-lowwall2-front':{ texture: `${T}/lowwall1w1.bmp`,   dx:  0.51, dy: 0.25, dz:  0,    rx: 0,           ry: -Math.PI / 2,    rz: 0, w: 1,   h: 0.5 },
    'factory-lowwall2-z-neg':{ texture: `${T}/highwall2w2.bmp`,  dx:  0,    dy: 0.25, dz: -0.51, rx: 0,           ry: 0,               rz: 0, w: 1,   h: 0.5 },
    'factory-lowwall2-z-pos':{ texture: `${T}/highwall2w2.bmp`,  dx:  0,    dy: 0.25, dz:  0.51, rx: 0,           ry: Math.PI,         rz: 0, w: 1,   h: 0.5 },
    'factory-highwall1':     { texture: `${T}/lowwall3w1.bmp`,   dx:  0.51, dy: 0.5,  dz:  0,    rx: 0,           ry: -Math.PI / 2,    rz: 0, w: 1,   h: 1   },
    'factory-highwall1-top': { texture: `${T}/highwall1w1.bmp`,  dx:  0,    dy: 1.01, dz:  0,    rx: Math.PI / 2, ry: 2 * Math.PI / 2, rz: 0, w: 1,   h: 1,   brightness: 0.8, texRot: Math.PI / 2 },
    'factory-building':      { texture: `${T}/buildingw1.bmp`,   dx:  0.51, dy: 0.5,  dz:  0,    rx: 0,           ry: -Math.PI / 2,    rz: 0, w: 1,   h: 1   },
    'factory-brick-side':    { texture: `${T}/highwall2w2.bmp`,  dx: -0.51, dy: 0.5,  dz:  0,    rx: 0,           ry: Math.PI / 2,     rz: 0, w: 1,   h: 1   },
    'factory-brick-center':  { texture: `${T}/highwall2w1.bmp`,  dx: -0.51, dy: 0.5,  dz:  0,    rx: 0,           ry: Math.PI / 2,     rz: 0, w: 1,   h: 1   },
    'factory-brick-z-neg':   { texture: `${T}/highwall2w2.bmp`,  dx:  0,    dy: 0.5,  dz: -0.51, rx: 0,           ry: 0,               rz: 0, w: 1,   h: 1   },
    'factory-brick-z-pos':   { texture: `${T}/highwall2w2.bmp`,  dx:  0,    dy: 0.5,  dz:  0.51, rx: 0,           ry: Math.PI,         rz: 0, w: 1,   h: 1   },
};
