import { keccak256, encodePacked, Hex } from "viem";
import { getPayout, PayoutStructure } from "@/lib/games";
import {
    CROC_ESCALATION_BP,
    CROC_ESCALATION_START_HOP,
    LUMA_BONUS_CONFIG,
    LUMA_BONUS_ROLL_INDEX_BASE,
    LumaChoiceId,
    PAD_BASE_WEIGHTS,
} from "./swampHopConfig";

export type PadType = 0 | 1 | 2 | 3 | 4 | 5;

export interface HopResult {
    hopIndex: number;
    rolls: [number, number, number];
    padType: PadType;
    payoutFactor: number;
    isCroc: boolean;
    isShrine: boolean;
}

export const PAD_LABELS: Record<PadType, string> = {
    0: "Golden Lily",
    1: "Stable Pad",
    2: "Wobbly Pad",
    3: "Murky Edge",
    4: "Croc Snap",
    5: "Shrine Pad",
};

export const CROC_PAD_TYPE = 4;
export const SHRINE_PAD_TYPE = 5;

/** Finish bonus when all hops complete without cashing out (1.06x). */
export const TREASURE_BONUS_FACTOR = 10600;

const PAD_TYPES: PadType[] = [0, 1, 2, 3, 4, 5];

const PAD_DEFAULT_FACTORS: Record<PadType, number> = {
    0: 11200,
    1: 10280,
    2: 10080,
    3: 9100,
    4: 0,
    5: 15000,
};

export interface LumaBonusRecord {
    hopIndex: number;
    choiceId: LumaChoiceId;
    factor: number;
    label: string;
}

export interface LumaBonusResult {
    factor: number;
    label: string;
}

const LUMA_CHOICE_ORDER: LumaChoiceId[] = ["safe", "wild", "ancient"];

function getLumaChoiceConfig(choiceId: LumaChoiceId) {
    const choice = LUMA_BONUS_CONFIG.choices.find((c) => c.id === choiceId);
    if (choice == null) {
        return LUMA_BONUS_CONFIG.choices[0];
    }
    return choice;
}

function getLumaRollIndex(choiceId: LumaChoiceId): number {
    const index = LUMA_CHOICE_ORDER.indexOf(choiceId);
    return LUMA_BONUS_ROLL_INDEX_BASE + (index >= 0 ? index : 0);
}

function rollLumaOutcome(
    gameId: bigint,
    userRandomWord: Hex,
    hopIndex: number,
    choiceId: LumaChoiceId
): LumaBonusResult {
    const choice = getLumaChoiceConfig(choiceId);
    const outcomes = choice.outcomes;
    let totalWeight = 0;
    for (const outcome of outcomes) {
        totalWeight += outcome.weight;
    }

    const hash = keccak256(
        encodePacked(
            ["uint256", "bytes32", "uint256", "uint8"],
            [
                gameId,
                userRandomWord,
                BigInt(hopIndex),
                getLumaRollIndex(choiceId),
            ]
        )
    );
    const roll = Number(BigInt(hash) % BigInt(totalWeight));

    let cumulative = 0;
    for (const outcome of outcomes) {
        cumulative += outcome.weight;
        if (roll < cumulative) {
            return { factor: outcome.factor, label: outcome.label };
        }
    }

    const fallback = outcomes[outcomes.length - 1];
    return { factor: fallback.factor, label: fallback.label };
}

export function resolveLumaBonusOutcome(
    gameId: bigint,
    userRandomWord: Hex,
    hopIndex: number,
    choiceId: LumaChoiceId
): LumaBonusResult {
    return rollLumaOutcome(gameId, userRandomWord, hopIndex, choiceId);
}

export function precomputeLumaOutcomesForHop(
    gameId: bigint,
    userRandomWord: Hex,
    hopIndex: number
): Record<LumaChoiceId, LumaBonusResult> {
    return {
        safe: resolveLumaBonusOutcome(gameId, userRandomWord, hopIndex, "safe"),
        wild: resolveLumaBonusOutcome(gameId, userRandomWord, hopIndex, "wild"),
        ancient: resolveLumaBonusOutcome(
            gameId,
            userRandomWord,
            hopIndex,
            "ancient"
        ),
    };
}

export function applyLumaBonusToBank(
    bank: number,
    factor: number,
    betAmount: number
): number {
    if (bank <= 0) {
        return bank;
    }

    const next = (bank * factor) / 10_000;
    const floor = Math.max(betAmount * 0.01, 0.01);
    return Math.max(next, floor);
}

function rollFromHash(
    gameId: bigint,
    userRandomWord: Hex,
    hopIndex: number,
    rollIndex: number
): number {
    const hash = keccak256(
        encodePacked(
            ["uint256", "bytes32", "uint256", "uint8"],
            [gameId, userRandomWord, BigInt(hopIndex), rollIndex]
        )
    );
    return Number(BigInt(hash) % BigInt(6));
}

export function getPadWeightsForHop(hopIndex: number): Record<PadType, number> {
    const weights: Record<PadType, number> = {
        0: PAD_BASE_WEIGHTS[0] ?? 0,
        1: PAD_BASE_WEIGHTS[1] ?? 0,
        2: PAD_BASE_WEIGHTS[2] ?? 0,
        3: PAD_BASE_WEIGHTS[3] ?? 0,
        4: PAD_BASE_WEIGHTS[4] ?? 0,
        5: PAD_BASE_WEIGHTS[5] ?? 0,
    };
    const escalationSteps = Math.max(0, hopIndex - CROC_ESCALATION_START_HOP);
    const crocBonus = escalationSteps * CROC_ESCALATION_BP;

    if (crocBonus > 0) {
        weights[4] += crocBonus;
        weights[1] = Math.max(800, weights[1] - Math.floor(crocBonus * 0.55));
        weights[2] = Math.max(800, weights[2] - Math.floor(crocBonus * 0.45));
    }

    return weights;
}

function sumPadWeights(weights: Record<PadType, number>): number {
    let total = 0;
    for (const pad of PAD_TYPES) {
        total += weights[pad];
    }
    return total;
}

export function getCrocChancePercent(hopIndex: number): number {
    const weights = getPadWeightsForHop(hopIndex);
    const total = sumPadWeights(weights);
    return (weights[4] / total) * 100;
}

function rollPadType(
    gameId: bigint,
    userRandomWord: Hex,
    hopIndex: number
): PadType {
    const weights = getPadWeightsForHop(hopIndex);
    const total = sumPadWeights(weights);
    const hash = keccak256(
        encodePacked(
            ["uint256", "bytes32", "uint256", "uint8"],
            [gameId, userRandomWord, BigInt(hopIndex), 0]
        )
    );
    const roll = Number(BigInt(hash) % BigInt(total));

    let cumulative = 0;
    for (const pad of PAD_TYPES) {
        cumulative += weights[pad];
        if (roll < cumulative) {
            return pad;
        }
    }

    return 1;
}

export function getHopRolls(
    gameId: bigint,
    userRandomWord: Hex,
    hopIndex: number
): [number, number, number] {
    const padType = rollPadType(gameId, userRandomWord, hopIndex);
    const roll1 = rollFromHash(gameId, userRandomWord, hopIndex, 1);
    const roll2 = rollFromHash(gameId, userRandomWord, hopIndex, 2);

    return [padType, roll1, roll2];
}

function resolvePayoutFactor(
    payouts: PayoutStructure,
    rolls: [number, number, number],
    padType: PadType
): number {
    if (padType === CROC_PAD_TYPE) {
        return 0;
    }

    const exact = getPayout(payouts, rolls[0], rolls[1], rolls[2]);
    if (exact > 0) {
        return exact;
    }

    const byRoll1 = getPayout(payouts, padType, rolls[1], rolls[2]);
    if (byRoll1 > 0) {
        return byRoll1;
    }

    const byRoll1Zero = getPayout(payouts, padType, rolls[1], 0);
    if (byRoll1Zero > 0) {
        return byRoll1Zero;
    }

    const padBase = getPayout(payouts, padType, 0, 0);
    if (padBase > 0) {
        return padBase;
    }

    return PAD_DEFAULT_FACTORS[padType];
}

export function computeHopResult(
    payouts: PayoutStructure,
    gameId: bigint,
    userRandomWord: Hex,
    hopIndex: number
): HopResult {
    const rolls = getHopRolls(gameId, userRandomWord, hopIndex);
    const padType = rolls[0] as PadType;
    const payoutFactor = resolvePayoutFactor(payouts, rolls, padType);

    return {
        hopIndex,
        rolls,
        padType,
        payoutFactor,
        isCroc: padType === CROC_PAD_TYPE,
        isShrine: padType === SHRINE_PAD_TYPE,
    };
}

export function precomputeHopSequence(
    payouts: PayoutStructure,
    gameId: bigint,
    userRandomWord: Hex,
    maxHops: number
): HopResult[] {
    return Array.from({ length: maxHops }, (_, hopIndex) =>
        computeHopResult(payouts, gameId, userRandomWord, hopIndex)
    );
}

export function applyHopToBank(
    currentBank: number,
    betAmount: number,
    hop: HopResult
): number {
    if (hop.isCroc) {
        return 0;
    }

    const base = currentBank > 0 ? currentBank : betAmount;
    return (base * hop.payoutFactor) / 10_000;
}

export function applyTreasureBonus(bank: number): number {
    return (bank * TREASURE_BONUS_FACTOR) / 10_000;
}

export function getCurrentMultiplier(bank: number, betAmount: number): number {
    if (betAmount <= 0) {
        return 0;
    }

    return bank / betAmount;
}

/** Theoretical best-case profit (all shrine hops + treasure finish). */
export function estimateMaxProfit(betAmount: number, maxHops: number): number {
    if (betAmount <= 0 || maxHops <= 0) {
        return 0;
    }

    const bestHopFactor = PAD_DEFAULT_FACTORS[SHRINE_PAD_TYPE] / 10_000;
    let bank = betAmount;

    for (let i = 0; i < maxHops; i++) {
        bank *= bestHopFactor;
    }

    bank = applyTreasureBonus(bank);
    return Math.max(0, bank - betAmount);
}
