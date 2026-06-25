// Lightweight sound manager for Snack Attack.
// Preloads the mp3s to warm the browser cache, then plays a fresh Audio instance
// per call so overlapping triggers (e.g. rapid cascades) don't cut each other off.

const SOUND_FILES = {
    attackWorker: "/submissions/overtime-zombie/audio/attackworker.mp3",
    bonusRound: "/submissions/overtime-zombie/audio/bonusround.mp3",
    closeInfo: "/submissions/overtime-zombie/audio/closeinfo.mp3",
    gameOver: "/submissions/overtime-zombie/audio/gameover.mp3",
    kick: "/submissions/overtime-zombie/audio/kick.mp3",
    match78: "/submissions/overtime-zombie/audio/match7-8.mp3",
    match910: "/submissions/overtime-zombie/audio/match9-10.mp3",
    match11plus: "/submissions/overtime-zombie/audio/match11+.mp3",
    openInfo: "/submissions/overtime-zombie/audio/openinfo.mp3",
    placeBet: "/submissions/overtime-zombie/audio/placebet.mp3",
    restock: "/submissions/overtime-zombie/audio/restock.mp3",
    impactNormal: "/submissions/overtime-zombie/audio/impactNormal.mp3",
    impactSpecial: "/submissions/overtime-zombie/audio/impactSpecial.mp3",
    select: "/submissions/overtime-zombie/audio/select.mp3",
    snacksFall: "/submissions/overtime-zombie/audio/snacksfall.mp3",
    spin: "/submissions/overtime-zombie/audio/spin.mp3",
    win: "/submissions/overtime-zombie/audio/win.mp3",
} as const;

export type SoundName = keyof typeof SOUND_FILES;

const DEFAULT_VOLUME = 0.5;

let muted = false;
const preloaded: Partial<Record<SoundName, HTMLAudioElement>> = {};

export function setSoundMuted(value: boolean): void {
    muted = value;
}

export function preloadSounds(): void {
    if (typeof window === "undefined") return;
    (Object.keys(SOUND_FILES) as SoundName[]).forEach((name) => {
        if (!preloaded[name]) {
            const audio = new Audio(SOUND_FILES[name]);
            audio.preload = "auto";
            audio.load();
            preloaded[name] = audio;
        }
    });
}

export function playSound(name: SoundName, volume: number = DEFAULT_VOLUME): void {
    if (typeof window === "undefined" || muted) return;
    try {
        const audio = new Audio(SOUND_FILES[name]);
        audio.volume = volume;
        void audio.play().catch(() => {
            // Autoplay can be blocked until first user interaction; ignore.
        });
    } catch {
        // ignore playback errors
    }
}

/** Play the preloaded audio element directly — skips the decode latency of
 *  `new Audio()` so the sound starts in tight sync with a visual change.
 *  Don't use this for sounds that can overlap (e.g. cascade matches), since
 *  retriggering before completion restarts the same element. */
export function playSoundInstant(name: SoundName, volume: number = DEFAULT_VOLUME): void {
    if (typeof window === "undefined" || muted) return;
    const audio = preloaded[name];
    if (!audio) {
        playSound(name, volume);
        return;
    }
    try {
        audio.currentTime = 0;
        audio.volume = volume;
        void audio.play().catch(() => {
            // Autoplay can be blocked until first user interaction; ignore.
        });
    } catch {
        // ignore playback errors
    }
}

/** Choose the match SFX based on the largest matched-symbol count this cascade. */
export function matchSoundForCount(largestCount: number): SoundName {
    if (largestCount >= 11) return "match11plus";
    if (largestCount >= 9) return "match910";
    return "match78";
}
