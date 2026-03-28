// Chassis types and their terrain passability.
// speedFactor: 1 = move every tick, 0.5 = move every 2nd tick, 0 = impassable.

import { Chassis } from '../../data/robot';
export { Chassis };

interface TerrainRule {
    passable: boolean;
    speedFactor: number; // 1 = full speed, 0.5 = half speed, 0 = impassable
}

// tile subtype → chassis type → rule
//   tracks:   any terrain except holes; slower on sand and mountains
//   antigrav: best — full speed on all terrain including holes (flies over)
//   bipod:    grass and sand only, always at half speed
const TERRAIN: Record<string, Partial<Record<Chassis, TerrainRule>>> = {
    G:  { [Chassis.TRACKS]: { passable: true,  speedFactor: 0.75 }, [Chassis.ANTIGRAV]: { passable: true, speedFactor: 1 }, [Chassis.BIPOD]: { passable: true,  speedFactor: 0.5 } },
    S:  { [Chassis.TRACKS]: { passable: true,  speedFactor: 0.5  }, [Chassis.ANTIGRAV]: { passable: true, speedFactor: 1 }, [Chassis.BIPOD]: { passable: true,  speedFactor: 0.5 } },
    S2: { [Chassis.TRACKS]: { passable: true,  speedFactor: 0.5  }, [Chassis.ANTIGRAV]: { passable: true, speedFactor: 1 }, [Chassis.BIPOD]: { passable: true,  speedFactor: 0.5 } },
    M:  { [Chassis.TRACKS]: { passable: true,  speedFactor: 0.5  }, [Chassis.ANTIGRAV]: { passable: true, speedFactor: 1 }, [Chassis.BIPOD]: { passable: false, speedFactor: 0   } },
    H1: { [Chassis.TRACKS]: { passable: false, speedFactor: 0    }, [Chassis.ANTIGRAV]: { passable: true, speedFactor: 1 }, [Chassis.BIPOD]: { passable: false, speedFactor: 0   } },
    H2: { [Chassis.TRACKS]: { passable: false, speedFactor: 0    }, [Chassis.ANTIGRAV]: { passable: true, speedFactor: 1 }, [Chassis.BIPOD]: { passable: false, speedFactor: 0   } },
    H3: { [Chassis.TRACKS]: { passable: false, speedFactor: 0    }, [Chassis.ANTIGRAV]: { passable: true, speedFactor: 1 }, [Chassis.BIPOD]: { passable: false, speedFactor: 0   } },
    H4: { [Chassis.TRACKS]: { passable: false, speedFactor: 0    }, [Chassis.ANTIGRAV]: { passable: true, speedFactor: 1 }, [Chassis.BIPOD]: { passable: false, speedFactor: 0   } },
    H5: { [Chassis.TRACKS]: { passable: false, speedFactor: 0    }, [Chassis.ANTIGRAV]: { passable: true, speedFactor: 1 }, [Chassis.BIPOD]: { passable: false, speedFactor: 0   } },
    H6: { [Chassis.TRACKS]: { passable: false, speedFactor: 0    }, [Chassis.ANTIGRAV]: { passable: true, speedFactor: 1 }, [Chassis.BIPOD]: { passable: false, speedFactor: 0   } },
};

const DEFAULT_RULE: TerrainRule = { passable: true, speedFactor: 1 };

export function getTerrainRule(tileSubtype: string, chassis: Chassis): TerrainRule {
    return TERRAIN[tileSubtype]?.[chassis] ?? DEFAULT_RULE;
}
