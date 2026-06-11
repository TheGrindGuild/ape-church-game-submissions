export type FroglingAnimationName =
    | "idle"
    | "hop"
    | "wobble"
    | "fall"
    | "celebrate"
    | "slash";

export interface SpriteSheetConfig {
    src: string;
    sheetWidth: number;
    sheetHeight: number;
    frameWidth: number;
    frameHeight: number;
    frameCount: number;
    /** Top offset of this animation row inside the sheet. */
    rowY: number;
    fps: number;
    loop: boolean;
}

/** Combined idle / wobble / hop sheet (512×512, RGBA). */
const IDLE_WOBBLE_HOP_SHEET = "/submissions/swamp-hop/sprites/idle-wobble-hop.png";

/** Combined slash / fall / celebrate sheet (512×512, RGBA). */
const SLASH_FALL_CELEBRATE_SHEET =
    "/submissions/swamp-hop/sprites/slash-fall-celebrate.png";

export const FROGLING_SPRITE_SHEETS: Record<
    FroglingAnimationName,
    SpriteSheetConfig
> = {
    idle: {
        src: IDLE_WOBBLE_HOP_SHEET,
        sheetWidth: 512,
        sheetHeight: 512,
        frameWidth: 128,
        frameHeight: 157,
        frameCount: 4,
        rowY: 0,
        fps: 4,
        loop: true,
    },
    wobble: {
        src: IDLE_WOBBLE_HOP_SHEET,
        sheetWidth: 512,
        sheetHeight: 512,
        frameWidth: 128,
        frameHeight: 156,
        frameCount: 4,
        rowY: 178,
        fps: 8,
        loop: false,
    },
    hop: {
        src: IDLE_WOBBLE_HOP_SHEET,
        sheetWidth: 512,
        sheetHeight: 512,
        frameWidth: 85,
        frameHeight: 146,
        frameCount: 6,
        rowY: 351,
        fps: 12,
        loop: false,
    },
    slash: {
        src: SLASH_FALL_CELEBRATE_SHEET,
        sheetWidth: 512,
        sheetHeight: 512,
        frameWidth: 128,
        frameHeight: 131,
        frameCount: 4,
        rowY: 18,
        fps: 12,
        loop: false,
    },
    fall: {
        src: SLASH_FALL_CELEBRATE_SHEET,
        sheetWidth: 512,
        sheetHeight: 512,
        frameWidth: 85,
        frameHeight: 121,
        frameCount: 6,
        rowY: 198,
        fps: 10,
        loop: false,
    },
    celebrate: {
        src: SLASH_FALL_CELEBRATE_SHEET,
        sheetWidth: 512,
        sheetHeight: 512,
        frameWidth: 85,
        frameHeight: 156,
        frameCount: 6,
        rowY: 347,
        fps: 10,
        loop: false,
    },
};

export const FROG_TARGET_HEIGHT = 96;

/** Reference cell — idle row; all animations render in this box to prevent hop zoom. */
export const FROG_REFERENCE_FRAME_WIDTH = 128;
export const FROG_REFERENCE_FRAME_HEIGHT = 157;

/** Unified sheet scale so idle/hop/slash frames render the same size. */
export const FROG_DISPLAY_SCALE =
    FROG_TARGET_HEIGHT / FROG_REFERENCE_FRAME_HEIGHT;

export const FROG_SPRITE_BOX_WIDTH = Math.ceil(
    FROG_REFERENCE_FRAME_WIDTH * FROG_DISPLAY_SCALE
);

/** Clip viewport width per animation — one sheet frame, no horizontal bleed. */
export function getSpriteDisplayCellWidth(frameWidth: number): number {
    return Math.ceil(frameWidth * FROG_DISPLAY_SCALE);
}

export function getFrogDisplayScale(_frameHeight?: number): number {
    return FROG_DISPLAY_SCALE;
}

/** Pad type index → lily pad image (see swampHopLogic pad types 0–5). */
export const PAD_IMAGES: Record<number, string> = {
    0: "/submissions/swamp-hop/pads/golden.png",
    1: "/submissions/swamp-hop/pads/stable.png",
    2: "/submissions/swamp-hop/pads/wobbly.png",
    3: "/submissions/swamp-hop/pads/murky.png",
    4: "/submissions/swamp-hop/pads/murky.png",
    5: "/submissions/swamp-hop/pads/shrine.png",
};

export const PAD_IMAGE_SHORE = "/submissions/swamp-hop/pads/shore.png";
export const PAD_IMAGE_UNKNOWN = "/submissions/swamp-hop/pads/stable.png";

/** One scene picked per game session (derived from gameId for rewatch consistency). */
export const SCENE_BACKGROUNDS = [
    "/submissions/swamp-hop/scenes/day.png",
    "/submissions/swamp-hop/scenes/sunset.png",
    "/submissions/swamp-hop/scenes/night.png",
    "/submissions/swamp-hop/scenes/shrine.png",
] as const;

export function getSceneForGameId(gameId: bigint): string {
    const index = Number(gameId % BigInt(SCENE_BACKGROUNDS.length));
    return SCENE_BACKGROUNDS[Math.abs(index) % SCENE_BACKGROUNDS.length];
}
