// Chassis types and their terrain passability.
// speedFactor: 1 = move every tick, 0.5 = move every 2nd tick, 0 = impassable.

import { Chassis } from '../../data/robot';
export { Chassis };

export enum TileSubtype {
    GRASS    = 'G',
    SAND     = 'S',
    SAND2    = 'S2',
    MOUNTAIN = 'M',
    HOLE1    = 'H1',
    HOLE2    = 'H2',
    HOLE3    = 'H3',
    HOLE4    = 'H4',
    HOLE5    = 'H5',
    HOLE6    = 'H6',
}

interface TerrainRule {
    passable: boolean;
    speedFactor: number; // 1 = full speed, 0.5 = half speed, 0 = impassable
}

// tile subtype → chassis type → rule
//   tracks:   any terrain except holes; slower on sand and mountains
//   antigrav: best — full speed on all terrain including holes (flies over)
//   bipod:    grass and sand only, always at half speed
const TERRAIN: Record<TileSubtype, Partial<Record<Chassis, TerrainRule>>> = {
    [TileSubtype.GRASS]:    { [Chassis.TRACKS]: { passable: true,  speedFactor: 0.75 }, [Chassis.ANTIGRAV]: { passable: true, speedFactor: 1 }, [Chassis.BIPOD]: { passable: true,  speedFactor: 0.5 } },
    [TileSubtype.SAND]:     { [Chassis.TRACKS]: { passable: true,  speedFactor: 0.5  }, [Chassis.ANTIGRAV]: { passable: true, speedFactor: 1 }, [Chassis.BIPOD]: { passable: true,  speedFactor: 0.5 } },
    [TileSubtype.SAND2]:    { [Chassis.TRACKS]: { passable: true,  speedFactor: 0.5  }, [Chassis.ANTIGRAV]: { passable: true, speedFactor: 1 }, [Chassis.BIPOD]: { passable: true,  speedFactor: 0.5 } },
    [TileSubtype.MOUNTAIN]: { [Chassis.TRACKS]: { passable: true,  speedFactor: 0.5  }, [Chassis.ANTIGRAV]: { passable: true, speedFactor: 1 }, [Chassis.BIPOD]: { passable: false, speedFactor: 0   } },
    [TileSubtype.HOLE1]:    { [Chassis.TRACKS]: { passable: false, speedFactor: 0    }, [Chassis.ANTIGRAV]: { passable: true, speedFactor: 1 }, [Chassis.BIPOD]: { passable: false, speedFactor: 0   } },
    [TileSubtype.HOLE2]:    { [Chassis.TRACKS]: { passable: false, speedFactor: 0    }, [Chassis.ANTIGRAV]: { passable: true, speedFactor: 1 }, [Chassis.BIPOD]: { passable: false, speedFactor: 0   } },
    [TileSubtype.HOLE3]:    { [Chassis.TRACKS]: { passable: false, speedFactor: 0    }, [Chassis.ANTIGRAV]: { passable: true, speedFactor: 1 }, [Chassis.BIPOD]: { passable: false, speedFactor: 0   } },
    [TileSubtype.HOLE4]:    { [Chassis.TRACKS]: { passable: false, speedFactor: 0    }, [Chassis.ANTIGRAV]: { passable: true, speedFactor: 1 }, [Chassis.BIPOD]: { passable: false, speedFactor: 0   } },
    [TileSubtype.HOLE5]:    { [Chassis.TRACKS]: { passable: false, speedFactor: 0    }, [Chassis.ANTIGRAV]: { passable: true, speedFactor: 1 }, [Chassis.BIPOD]: { passable: false, speedFactor: 0   } },
    [TileSubtype.HOLE6]:    { [Chassis.TRACKS]: { passable: false, speedFactor: 0    }, [Chassis.ANTIGRAV]: { passable: true, speedFactor: 1 }, [Chassis.BIPOD]: { passable: false, speedFactor: 0   } },
};

const DEFAULT_RULE: TerrainRule = { passable: true, speedFactor: 1 };

export function getTerrainRule(tileSubtype: TileSubtype | string, chassis: Chassis): TerrainRule {
    return TERRAIN[tileSubtype as TileSubtype]?.[chassis] ?? DEFAULT_RULE;
}
