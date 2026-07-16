import { Game } from "@/lib/games";

export const gimbozCrapsGame: Game = {
    title: "Shake, Rattle & Roll",
    description: "Full casino craps on the altar of the Ape Church. Roll the sacred dice, chase the point, and pray to the ape gods for a Cathedral Roll.",
    gameAddress: "0x0000000000000000000000000000000000000000", // TODO: replace with deployed contract address
    gameBackground: "/submissions/gimboz-craps/background.webp",
    card: "/submissions/gimboz-craps/card.webp",
    banner: "/submissions/gimboz-craps/banner.webp",
    themeColorBackground: "#A8E10C",
    song: "/submissions/gimboz-craps/audio/ambience.mp3",
    payouts: {
        // Craps uses custom payout logic — this structure is a placeholder
        // Actual payouts are calculated in GimbozCraps.tsx based on bet type
        0: { 0: { 0: 10000 } },
    },
};

// ─── Bet Types ────────────────────────────────────────────────────────────────

export type BetType =
    | "passLine"
    | "dontPass"
    | "come"
    | "dontCome"
    | "place4"
    | "place5"
    | "place6"
    | "place8"
    | "place9"
    | "place10"
    | "field"
    | "hard4"
    | "hard6"
    | "hard8"
    | "hard10"
    | "any7"
    | "anyCraps"
    | "passOdds"
    | "dontPassOdds";

export type GamePhase = "comeOut" | "point";
export type BonusEvent = "none" | "blessing" | "cathedralRoll" | "apesWill" | "holySevens";

// ─── Payout Tables ────────────────────────────────────────────────────────────

/** Returns payout multiplier * 10000 for a given bet type and result */
// ─── Payout constants ─────────────────────────────────────────────────────────
// All values are TOTAL RETURN per 10000 wagered (stake + profit).
// e.g. 20000 = 1:1 (even money): player gets back 2x their bet
//      30000 = 2:1: player gets back 3x their bet
//      10000 = push: player gets back their stake only

export const PLACE_PAYOUTS: Record<string, number> = {
    place4:  28000,   // 9:5 → profit 9 per 5 → total 14 per 5 → 28000 per 10000
    place5:  24000,   // 7:5 → profit 7 per 5 → total 12 per 5 → 24000 per 10000
    place6:  21667,   // 7:6 → total 13 per 6 → 21667 per 10000
    place8:  21667,
    place9:  24000,
    place10: 28000,
};

export const HARDWAY_PAYOUTS: Record<string, number> = {
    hard4:  80000,   // 7:1 → profit 7, return 8x bet → 80000
    hard6:  100000,  // 9:1 → profit 9, return 10x bet → 100000
    hard8:  100000,
    hard10: 80000,
};

export const FIELD_PAYOUTS: Record<number, number> = {
    2:  30000,   // 2:1 → return 3x bet
    3:  20000,   // 1:1 → return 2x bet
    4:  20000,
    9:  20000,
    10: 20000,
    11: 20000,
    12: 40000,   // 3:1 → return 4x bet
};

export const PROP_PAYOUTS: Record<string, number> = {
    any7:     50000,   // 4:1 → return 5x bet
    anyCraps: 80000,   // 7:1 → return 8x bet
};

// True odds for Pass Line odds bets (total return including stake)
export const PASS_ODDS_PAYOUTS: Record<number, number> = {
    4:  30000,   // 2:1 → return 3x
    5:  25000,   // 3:2 → return 2.5x
    6:  22000,   // 6:5 → return 2.2x
    8:  22000,
    9:  25000,
    10: 30000,
};

// ─── Bonus Thresholds ─────────────────────────────────────────────────────────

export const BLESSING_THRESHOLD = 3;       // point hits in a row
export const CATHEDRAL_ROLL_THRESHOLD = 5; // point hits for escalating multiplier
export const HOLY_SEVENS_THRESHOLD = 3;    // natural 7s in a row on come-out

export const CATHEDRAL_MULTIPLIERS = [2, 5, 15, 50, 100];

export const BONUS_NAMES: Record<BonusEvent, string> = {
    none: "",
    blessing: "🙏 The Blessing",
    cathedralRoll: "⛪ The Cathedral Roll",
    apesWill: "🦍 Ape's Will",
    holySevens: "✨ Holy Sevens",
};

// ─── Bet Labels ───────────────────────────────────────────────────────────────

export const BET_LABELS: Record<BetType, string> = {
    passLine: "PASS LINE",
    dontPass: "DON'T PASS",
    come: "COME",
    dontCome: "DON'T COME",
    place4: "PLACE 4",
    place5: "PLACE 5",
    place6: "PLACE 6",
    place8: "PLACE 8",
    place9: "PLACE 9",
    place10: "PLACE 10",
    field: "FIELD",
    hard4: "HARD 4",
    hard6: "HARD 6",
    hard8: "HARD 8",
    hard10: "HARD 10",
    any7: "ANY 7",
    anyCraps: "ANY CRAPS",
    passOdds: "PASS ODDS",
    dontPassOdds: "DON'T PASS ODDS",
};

// ─── Dice Helper ──────────────────────────────────────────────────────────────

export const rollFromSeed = (seed: number[], index: number): [number, number] => {
    const s = seed[index % seed.length];
    const s2 = seed[(index + 1) % seed.length];
    const d1 = (s % 6) + 1;
    const d2 = (s2 % 6) + 1;
    return [d1, d2];
};

export const isHardWay = (d1: number, d2: number): boolean => d1 === d2;

export const isCraps = (total: number): boolean => [2, 3, 12].includes(total);
export const isNatural = (total: number): boolean => [7, 11].includes(total);

// ─── Bet Availability ─────────────────────────────────────────────────────────

export const PRE_POINT_BETS: BetType[] = ["passLine", "dontPass", "field", "any7", "anyCraps", "hard4", "hard6", "hard8", "hard10"];
export const POST_POINT_BETS: BetType[] = ["come", "dontCome", "place4", "place5", "place6", "place8", "place9", "place10", "passOdds", "dontPassOdds", "field", "any7", "anyCraps", "hard4", "hard6", "hard8", "hard10"];
