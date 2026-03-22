// Chassis types and their terrain passability.
// speedFactor: 1 = move every tick, 0.5 = move every 2nd tick, 0 = impassable.

export type ChassisType = 'tracks' | 'antigrav' | 'bipod';

interface TerrainRule {
    passable: boolean;
    speedFactor: number; // 1 = full speed, 0.5 = half speed, 0 = impassable
}

// tile subtype → chassis type → rule
const TERRAIN: Record<string, Partial<Record<ChassisType, TerrainRule>>> = {
    G:  { tracks: { passable: true, speedFactor: 1   }, antigrav: { passable: true, speedFactor: 1   }, bipod: { passable: true, speedFactor: 1   } },
    S:  { tracks: { passable: true, speedFactor: 0.5 }, antigrav: { passable: true, speedFactor: 1   }, bipod: { passable: true, speedFactor: 0.5 } },
    S2: { tracks: { passable: true, speedFactor: 0.5 }, antigrav: { passable: true, speedFactor: 1   }, bipod: { passable: true, speedFactor: 0.5 } },
    M:  { tracks: { passable: false, speedFactor: 0  }, antigrav: { passable: true, speedFactor: 0.5 }, bipod: { passable: true, speedFactor: 0.5 } },
    H1: { tracks: { passable: false, speedFactor: 0  }, antigrav: { passable: false, speedFactor: 0  }, bipod: { passable: false, speedFactor: 0  } },
    H2: { tracks: { passable: false, speedFactor: 0  }, antigrav: { passable: false, speedFactor: 0  }, bipod: { passable: false, speedFactor: 0  } },
    H3: { tracks: { passable: false, speedFactor: 0  }, antigrav: { passable: false, speedFactor: 0  }, bipod: { passable: false, speedFactor: 0  } },
    H4: { tracks: { passable: false, speedFactor: 0  }, antigrav: { passable: false, speedFactor: 0  }, bipod: { passable: false, speedFactor: 0  } },
    H5: { tracks: { passable: false, speedFactor: 0  }, antigrav: { passable: false, speedFactor: 0  }, bipod: { passable: false, speedFactor: 0  } },
    H6: { tracks: { passable: false, speedFactor: 0  }, antigrav: { passable: false, speedFactor: 0  }, bipod: { passable: false, speedFactor: 0  } },
};

const DEFAULT_RULE: TerrainRule = { passable: true, speedFactor: 1 };

export function getTerrainRule(tileSubtype: string, chassis: ChassisType): TerrainRule {
    return TERRAIN[tileSubtype]?.[chassis] ?? DEFAULT_RULE;
}

// Derive chassis type from a chassis model name (e.g. 'h-tracks' → 'tracks')
export function chassisTypeOf(chassisModel: string): ChassisType {
    if (chassisModel.includes('antigrav')) return 'antigrav';
    if (chassisModel.includes('bipod'))    return 'bipod';
    return 'tracks';
}
