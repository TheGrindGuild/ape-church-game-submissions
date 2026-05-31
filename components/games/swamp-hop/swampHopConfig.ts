import { Game } from "@/lib/games";

/** Multiplier factors are stored as value / 10_000 (e.g. 15000 = 1.5x). */
export const swampHop: Game = {
    title: "Froglings Swamp Hop",
    description:
        "Hop lily pad to lily pad with the Froglings adventurer. Grow your bank each hop, cash out early, or land on a Shrine Pad for the Luma bonus pick. Only a Croc Snap busts your full bet.",
    gameAddress: "0x1234567890123456789012345678901234567890",
    gameBackground: "/submissions/swamp-hop/scenes/day.png",
    card: "/submissions/swamp-hop/card.png",
    banner: "/submissions/swamp-hop/banner.png",
    themeColorBackground: "#6bbf3a",
    song: "/submissions/swamp-hop/audio/song.mp3",
    payouts: {
        0: {
            0: { 0: 11200, 1: 11000, 2: 10800, 3: 10600, 4: 0, 5: 13500 },
            1: { 0: 11100, 1: 10900, 2: 10700 },
            2: { 0: 11000, 1: 10800 },
        },
        1: {
            0: { 0: 10280, 1: 10180, 2: 10080, 3: 9980 },
            1: { 0: 10230, 1: 10130 },
            2: { 0: 10180 },
        },
        2: {
            0: { 0: 10130, 1: 10080, 2: 10030 },
            1: { 0: 10080, 1: 10055 },
            2: { 0: 10030 },
        },
        3: {
            0: { 0: 9300, 1: 9200, 2: 9100 },
            1: { 0: 9200, 1: 9150 },
            2: { 0: 9100 },
        },
        4: {
            0: { 0: 0 },
        },
        5: {
            0: { 0: 15000, 1: 14800, 2: 14600, 3: 14400, 4: 0, 5: 16000 },
            1: { 0: 15200, 1: 15000, 5: 15800 },
            2: { 0: 15100, 5: 15700 },
            3: { 0: 14900 },
            4: { 0: 0 },
            5: { 5: 16000, 0: 15300, 1: 15100, 2: 15000, 3: 14800, 4: 0 },
        },
    },
};

/** Pad-type weights in basis points (sum = 10_000). */
export const PAD_BASE_WEIGHTS: Record<number, number> = {
    0: 1400,
    1: 3000,
    2: 2200,
    3: 1600,
    4: 1400,
    5: 400,
};

/** Croc weight increases +150 bp (+1.5%) per hop after hop index 5. */
export const CROC_ESCALATION_BP = 150;

/** First hop index that starts adding extra croc weight. */
export const CROC_ESCALATION_START_HOP = 5;

/** Approximate house edge for UI disclosure (calibrated via simulate script). */
export const APPROX_HOUSE_EDGE_PERCENT = 4;

export const VISIBLE_PAD_COUNT = 5;

/** Fixed screen column for the frog once the pad window starts scrolling. */
export const FROG_ANCHOR_SLOT = 3;

export type LumaChoiceId = "safe" | "wild" | "ancient";

export interface LumaBonusOutcome {
    weight: number;
    factor: number;
    label: string;
}

export interface LumaBonusChoice {
    id: LumaChoiceId;
    label: string;
    description: string;
    outcomes: LumaBonusOutcome[];
}

export const LUMA_BONUS_CONFIG = {
    enabled: true,
    triggerPadIndex: 5,
    choices: [
        {
            id: "safe" as const,
            label: "Safe Luma",
            description: "Small guaranteed boost",
            outcomes: [{ weight: 100, factor: 11500, label: "+15%" }],
        },
        {
            id: "wild" as const,
            label: "Wild Luma",
            description: "Bigger boost, but unstable",
            outcomes: [
                { weight: 50, factor: 17500, label: "+75%" },
                { weight: 50, factor: 8500, label: "-15%" },
            ],
        },
        {
            id: "ancient" as const,
            label: "Ancient Luma",
            description: "Massive power, unknown danger",
            outcomes: [
                { weight: 20, factor: 30000, label: "3x Luma Surge" },
                { weight: 30, factor: 14000, label: "+40%" },
                { weight: 50, factor: 10000, label: "No bonus" },
            ],
        },
    ] satisfies LumaBonusChoice[],
};

/** rollIndex base for Luma bonus (10=safe, 11=wild, 12=ancient). */
export const LUMA_BONUS_ROLL_INDEX_BASE = 10;
