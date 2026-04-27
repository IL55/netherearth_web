import type { SoundName } from '../../game/types/sound';

export interface Sounds {
    play(name: SoundName): void;
    playSequence(names: SoundName[]): void;
}

export const loadSounds = (): Sounds => {
    const play = (name: SoundName) => {
        new Audio(`/sound/${name}.wav`).play().catch(() => {});
    };

    const playSequence = (names: SoundName[]) => {
        const start = () => {
            const step = (i: number) => {
                if (i >= names.length) return;
                const audio = new Audio(`/sound/${names[i]}.wav`);
                audio.addEventListener('ended', () => step(i + 1), { once: true });
                audio.play().catch(() => step(i + 1));
            };
            step(0);
        };
        // Audio is blocked until user gesture — queue on first interaction
        window.addEventListener('pointerdown', start, { once: true });
        window.addEventListener('keydown', start, { once: true });
    };

    return { play, playSequence };
};
