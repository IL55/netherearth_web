export const SOUNDS = {
    CONSTRUCTION: 'construction',
    EXPLOSION:    'explosion',
    SELECT:       'select',
    SHOT:         'shot',
    WRONG:        'wrong',
} as const;

export type SoundName = typeof SOUNDS[keyof typeof SOUNDS];

export const ALL_SOUNDS: SoundName[] = Object.values(SOUNDS) as SoundName[];
