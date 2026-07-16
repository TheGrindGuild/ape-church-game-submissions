"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { randomBytes } from "@/lib/games";
import { bytesToHex, Hex } from "viem";
import { toast } from "sonner";
import GameWindow from "@/components/shared/GameWindow";
import GimbozCrapsWindow from "./GimbozCrapsWindow";
import GimbozCrapsSetupCard from "./GimbozCrapsSetupCard";
import { preloadGimbozTileImages } from "./GameTile";
import {
    gimbozCrapsGame,
    BetType,
    GamePhase,
    BonusEvent,
    rollFromSeed,
    isHardWay,
    isCraps,
    isNatural,
    PLACE_PAYOUTS,
    HARDWAY_PAYOUTS,
    FIELD_PAYOUTS,
    PROP_PAYOUTS,
    PASS_ODDS_PAYOUTS,
    HOLY_SEVENS_THRESHOLD,
} from "./gimbozCrapsConfig";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActiveBet {
    type: BetType;
    amount: number;
}

export interface RollResult {
    d1: number;
    d2: number;
    total: number;
    phase: GamePhase;
    point: number | null;
    outcome: string;
    outcomeDetail: string; // plain English explanation
    payout: number;
    betBreakdown: { label: string; wagered: number; payout: number }[];
    bonusEvent: BonusEvent;
    bonusMultiplier: number;
}

interface GameState {
    phase: GamePhase;
    point: number | null;
    rollHistory: RollResult[];
    activeBets: Partial<Record<BetType, number>>;
    initialWagered: number;
    totalPayout: number;
    consecutivePointHits: number;
    consecutiveNaturals: number;
    currentBonusMultiplier: number;
    gameOver: boolean;
    bonusRoundTriggered: boolean;  // true when bonus round should show
    bonusRoundReason: "streak" | "maxRolls" | null;
    seed: number[];
    rollIndex: number;
    lastRoll: [number, number] | null;
    bonusEvent: BonusEvent;
}

const initialState: GameState = {
    phase: "comeOut",
    point: null,
    rollHistory: [],
    activeBets: {},
    initialWagered: 0,
    totalPayout: 0,
    consecutivePointHits: 0,
    consecutiveNaturals: 0,
    currentBonusMultiplier: 1,
    gameOver: false,
    bonusRoundTriggered: false,
    bonusRoundReason: null,
    seed: [],
    rollIndex: 0,
    lastRoll: null,
    bonusEvent: "none",
};

const MAX_ROLLS = 13; // Lucky 13 — ~20% of games reach the bonus
const BONUS_STREAK_THRESHOLD = 4;

// ─── Payout Calculator ────────────────────────────────────────────────────────

function calculatePayout(
    bets: Partial<Record<BetType, number>>,
    d1: number,
    d2: number,
    total: number,
    phase: GamePhase,
    point: number | null,
    bonusMultiplier: number
): number {
    let payout = 0;
    const hard = isHardWay(d1, d2);

    for (const [betTypeStr, amount] of Object.entries(bets)) {
        const betType = betTypeStr as BetType;
        if (!amount || amount <= 0) continue;

        switch (betType) {
            case "passLine":
                if (phase === "comeOut") {
                    if (isNatural(total)) payout += amount * 2;
                    // craps = lose (no payout)
                } else {
                    if (total === point) payout += amount * 2;
                    // 7-out = lose
                }
                break;

            case "dontPass":
                if (phase === "comeOut") {
                    if (total === 2 || total === 3) payout += amount * 2;
                    if (total === 12) payout += amount; // push
                    // natural = lose
                } else {
                    if (total === 7) payout += amount * 2;
                    // point = lose
                }
                break;

            case "come":
                if (phase === "point") {
                    if (isNatural(total)) payout += amount * 2;
                    // craps = lose
                }
                break;

            case "dontCome":
                if (phase === "point") {
                    if (total === 2 || total === 3) payout += amount * 2;
                    if (total === 12) payout += amount; // push
                }
                break;

            case "field":
                if (FIELD_PAYOUTS[total]) payout += (amount * FIELD_PAYOUTS[total]) / 10000;
                break;

            case "place4":
            case "place5":
            case "place6":
            case "place8":
            case "place9":
            case "place10": {
                const placeNum = parseInt(betType.replace("place", ""));
                if (phase === "point" && total === placeNum) {
                    payout += (amount * PLACE_PAYOUTS[betType]) / 10000;
                }
                break;
            }

            case "hard4":
                if (total === 4 && hard) payout += (amount * HARDWAY_PAYOUTS.hard4) / 10000;
                else if (total === 4 || total === 7) { /* lose */ }
                break;
            case "hard6":
                if (total === 6 && hard) payout += (amount * HARDWAY_PAYOUTS.hard6) / 10000;
                else if (total === 6 || total === 7) { /* lose */ }
                break;
            case "hard8":
                if (total === 8 && hard) payout += (amount * HARDWAY_PAYOUTS.hard8) / 10000;
                else if (total === 8 || total === 7) { /* lose */ }
                break;
            case "hard10":
                if (total === 10 && hard) payout += (amount * HARDWAY_PAYOUTS.hard10) / 10000;
                else if (total === 10 || total === 7) { /* lose */ }
                break;

            case "any7":
                if (total === 7) payout += (amount * PROP_PAYOUTS.any7) / 10000;
                break;

            case "anyCraps":
                if (isCraps(total)) payout += (amount * PROP_PAYOUTS.anyCraps) / 10000;
                break;

            case "passOdds":
                if (phase === "point" && point && total === point) {
                    payout += (amount * PASS_ODDS_PAYOUTS[point]) / 10000;
                }
                break;

            case "dontPassOdds":
                if (phase === "point" && total === 7) {
                    // lay odds pay true odds inverted
                    const layOdds: Record<number, number> = { 4: 5000, 5: 6700, 6: 8300, 8: 8300, 9: 6700, 10: 5000 };
                    if (point && layOdds[point]) payout += (amount * layOdds[point]) / 10000;
                }
                break;
        }
    }

    // Apply bonus multiplier (only to non-zero payouts)
    if (payout > 0 && bonusMultiplier > 1) {
        payout *= bonusMultiplier;
    }

    return Math.floor(payout);
}

// ─── Seed Generator ───────────────────────────────────────────────────────────

function generateSeed(): number[] {
    const bytes = randomBytes(64);
    return Array.from(bytes);
}

// ─── Component ────────────────────────────────────────────────────────────────

const GimbozCraps: React.FC = () => {
    const game = gimbozCrapsGame;
    const router = useRouter();
    const searchParams = useSearchParams();
    const replayIdString = searchParams.get("id");

    const walletBalance = 5000; // TODO: connect wallet
    const [currentView, setCurrentView] = useState<0 | 1 | 2>(0);
    const [isLoading, setIsLoading] = useState(false);
    const [pendingBets, setPendingBets] = useState<Partial<Record<BetType, number>>>({});
    const [selectedChipValue, setSelectedChipValue] = useState<number>(25);
    const [gameState, setGameState] = useState<GameState>(initialState);
    const [payout, setPayout] = useState<number | null>(null);
    const [isRolling, setIsRolling] = useState(false);
    const [showDiceOverlay, setShowDiceOverlay] = useState(false);
    const [addingBets, setAddingBets] = useState(false);
    const [bonusSessionPayout, setBonusSessionPayout] = useState(0);
    const [initialBetsSnapshot, setInitialBetsSnapshot] = useState<typeof pendingBets>({}); // snapshot of all bets at game start
    const tileTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const overlayDismissTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const rollVersionRef = React.useRef(0);
    const tileIdRef = React.useRef(0);
    const pendingTileRef = React.useRef<import("./GameTile").TileData | null>(null);
    const [pendingIsGameEnder, setPendingIsGameEnder] = useState(false);
    const [activeTile, setActiveTile] = useState<import("./GameTile").TileData | null>(null);
    const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
    const [shownPointNumber, setShownPointNumber] = useState<number | null>(null); // track which point we already showed tile for

    // Preload round-transition tile art so images appear as soon as a roll resolves
    React.useEffect(() => {
        preloadGimbozTileImages();
    }, []);

    const assignTileId = useCallback((tile: import("./GameTile").TileData): import("./GameTile").TileData => {
        tileIdRef.current += 1;
        return { ...tile, id: tileIdRef.current };
    }, []);

    const revealPendingTile = useCallback(() => {
        if (overlayDismissTimerRef.current) {
            clearTimeout(overlayDismissTimerRef.current);
            overlayDismissTimerRef.current = null;
        }
        setShowDiceOverlay(false);
        if (pendingTileRef.current) {
            setActiveTile(assignTileId(pendingTileRef.current));
            pendingTileRef.current = null;
        }
    }, [assignTileId]);

    // Show welcome tile on first game
    React.useEffect(() => {
        if (!hasSeenWelcome && currentView === 0) {
            setActiveTile(assignTileId({ type: "welcome" }));
        }
    }, []);

    const dismissTile = () => {
        const t = activeTile;
        setActiveTile(null);
        // Loss tiles: player tapped "View Results" button — go to game over
        if (t?.type === "sevenOut" || t?.type === "crapsOut") {
            setCurrentView(2);
        }
        if (t?.type === "welcome") {
            setHasSeenWelcome(true);
        }
        if (t?.type === "bonusStreak" || t?.type === "bonusMaxRolls") {
            setCurrentView(1);
            setGameState(prev => ({ ...prev, gameOver: false }));
        }
    };

    const handleOverlayDismiss = () => {
        revealPendingTile();
    };

    const [currentGameId, setCurrentGameId] = useState<bigint>(
        replayIdString == null
            ? BigInt(bytesToHex(new Uint8Array(randomBytes(32))))
            : BigInt(replayIdString)
    );
    const [userRandomWord, setUserRandomWord] = useState<Hex>(
        bytesToHex(new Uint8Array(randomBytes(32)))
    );

    useEffect(() => {
        if (replayIdString !== null && replayIdString.length > 2) {
            setIsLoading(true);
            setCurrentGameId(BigInt(replayIdString));
        }
    }, [replayIdString]);

    // ─── Add a Bet ─────────────────────────────────────────────────────────────

    const addBet = useCallback((type: BetType, amount: number) => {
        if (amount <= 0) return;
        setPendingBets(prev => ({
            ...prev,
            [type]: (prev[type] ?? 0) + amount,
        }));
    }, []);

    const clearBet = useCallback((type: BetType) => {
        setPendingBets(prev => {
            const next = { ...prev };
            delete next[type];
            return next;
        });
    }, []);

    const clearBets = useCallback(() => {
        setPendingBets({});
    }, []);

    // Chip-click: place selected chip value on a bet zone
    // In setup view (view=0) → adds to pendingBets
    // In ongoing view (view=1) → adds directly to gameState.activeBets
    const placeChipBet = useCallback((type: BetType) => {
        if (currentView === 0) {
            addBet(type, selectedChipValue);
        } else if (currentView === 1) {
            setGameState(prev => ({
                ...prev,
                activeBets: {
                    ...prev.activeBets,
                    [type]: (prev.activeBets[type] ?? 0) + selectedChipValue,
                },
            }));
        }
    }, [addBet, selectedChipValue, currentView]);

    // Remove a bet — from pendingBets in setup, from activeBets during game
    const clearActiveBet = useCallback((type: BetType) => {
        if (currentView === 1) {
            setGameState(prev => {
                const next = { ...prev.activeBets };
                delete next[type];
                return { ...prev, activeBets: next };
            });
        } else {
            clearBet(type);
        }
    }, [currentView, clearBet]);

    const totalBetAmount = Object.values(pendingBets).reduce((a, b) => a + (b ?? 0), 0);

    // ─── Play Game ─────────────────────────────────────────────────────────────

    const playGame = useCallback(async (gameId?: bigint, randomWord?: Hex, betsOverride?: Record<string, number>) => {
        if (totalBetAmount <= 0) {
            toast.error("Place at least one bet first!");
            return;
        }

        setIsLoading(true);

        const gameIdToUse = gameId ?? currentGameId;
        const randomWordToUse = randomWord ?? userRandomWord;

        try {
            // Mock on-chain transaction
            const seed = generateSeed();

            setTimeout(() => {
                setIsLoading(false);
                const betsForGame = betsOverride ?? pendingBets;
                const initialWagered = Object.values(betsForGame).reduce((a: number,b) => a+(Number(b)??0), 0);
                setInitialBetsSnapshot({ ...betsForGame }); // save ALL bets including one-roll
                setGameState({
                    ...initialState,
                    activeBets: { ...betsForGame },
                    initialWagered,
                    seed,
                    rollIndex: 0,
                });
                setCurrentView(1);
                toast.success("Dice are on the altar. Roll!");
            }, 800);
        } catch (error) {
            console.error("playGame error:", error);
            toast.error("Something went wrong.");
            setIsLoading(false);
        }
    }, [currentGameId, userRandomWord, pendingBets, totalBetAmount]);

    // ─── Roll Dice (handleStateAdvance) ────────────────────────────────────────
    // Key design decisions:
    // 1. One-roll bets (field, any7, anyCraps, hardways) resolve on EVERY roll
    // 2. Multi-roll bets (passLine, place, odds) only resolve when their condition is met
    // 3. After hitting a point: game continues with a new come-out (don't reset activeBets)
    // 4. Game only ends on: 7-out in point phase, OR player clicks Cash Out
    // 5. Natural on come-out: Pass Line pays, game goes back to come-out

    const handleStateAdvance = useCallback(() => {
        if (isRolling || gameState.gameOver || gameState.bonusRoundTriggered) return;

        // Cancel any pending tile timer and increment version — stale timers won't fire
        if (tileTimerRef.current) {
            clearTimeout(tileTimerRef.current);
            tileTimerRef.current = null;
        }
        // Cancel all pending timers from previous roll
        if (tileTimerRef.current) { clearTimeout(tileTimerRef.current); tileTimerRef.current = null; }
        if (overlayDismissTimerRef.current) { clearTimeout(overlayDismissTimerRef.current); overlayDismissTimerRef.current = null; }
        setActiveTile(null);
        pendingTileRef.current = null; // clear any pending tile from last roll
        rollVersionRef.current += 1;
        const capturedVersion = rollVersionRef.current; // capture NOW before any async
        setIsRolling(true);
        setShowDiceOverlay(true);
        setAddingBets(false);

        setTimeout(() => {
            // If another roll started before this settled, abort
            if (rollVersionRef.current !== capturedVersion) {
                setIsRolling(false);
                return;
            }
            setGameState(prev => {
                const [d1, d2] = rollFromSeed(prev.seed, prev.rollIndex);
                const total = d1 + d2;
                const hard = isHardWay(d1, d2);

                let newPhase = prev.phase;
                let newPoint = prev.point;
                let newConsecPointHits = prev.consecutivePointHits;
                let newConsecNaturals = prev.consecutiveNaturals;
                let newBonusMultiplier = prev.currentBonusMultiplier;
                let bonusEvent: BonusEvent = "none";
                let outcome = "";
                let gameOver = false;

                // ── ONE-ROLL BET PAYOUTS ──────────────────────────────────────────────────
                // IMPORTANT: These bets clear after ONE roll (win OR lose).
                // The bet is consumed this roll regardless of outcome.
                // Player must re-place these bets each round.
                let oneRollPayout = 0;
                const clearedBets: (keyof typeof prev.activeBets)[] = [];

                // Field: always resolves this roll
                if (prev.activeBets.field) {
                    if (FIELD_PAYOUTS[total]) {
                        oneRollPayout += Math.floor((prev.activeBets.field * FIELD_PAYOUTS[total]) / 10000);
                    }
                    // Field clears win OR lose
                    clearedBets.push("field");
                }

                // Any Seven: resolves this roll
                if (prev.activeBets.any7) {
                    if (total === 7) oneRollPayout += Math.floor((prev.activeBets.any7 * PROP_PAYOUTS.any7) / 10000);
                    clearedBets.push("any7");
                }

                // Any Craps: resolves this roll
                if (prev.activeBets.anyCraps) {
                    if (isCraps(total)) oneRollPayout += Math.floor((prev.activeBets.anyCraps * PROP_PAYOUTS.anyCraps) / 10000);
                    clearedBets.push("anyCraps");
                }

                // Hardways: each resolves when it wins, or when 7 or easy version rolls
                // Hard 4 — clears on: win (2+2), 7, or easy 4
                if (prev.activeBets.hard4) {
                    if (total === 4 && hard) oneRollPayout += Math.floor((prev.activeBets.hard4 * HARDWAY_PAYOUTS.hard4) / 10000);
                    if (total === 4 || total === 7) clearedBets.push("hard4"); // resolved
                }
                if (prev.activeBets.hard6) {
                    if (total === 6 && hard) oneRollPayout += Math.floor((prev.activeBets.hard6 * HARDWAY_PAYOUTS.hard6) / 10000);
                    if (total === 6 || total === 7) clearedBets.push("hard6");
                }
                if (prev.activeBets.hard8) {
                    if (total === 8 && hard) oneRollPayout += Math.floor((prev.activeBets.hard8 * HARDWAY_PAYOUTS.hard8) / 10000);
                    if (total === 8 || total === 7) clearedBets.push("hard8");
                }
                if (prev.activeBets.hard10) {
                    if (total === 10 && hard) oneRollPayout += Math.floor((prev.activeBets.hard10 * HARDWAY_PAYOUTS.hard10) / 10000);
                    if (total === 10 || total === 7) clearedBets.push("hard10");
                }

                // Note: Ape's Will (500x) only triggers in the bonus round Die 3
                // Double sixes during normal play is just Hard 12 — no special event

                // ── MULTI-ROLL BET PAYOUTS & PHASE LOGIC ──
                let multiRollPayout = 0;

                if (prev.phase === "comeOut") {
                    if (isNatural(total)) {
                        // Pass Line wins
                        if (prev.activeBets.passLine) multiRollPayout += prev.activeBets.passLine * 2;
                        // Don't Pass loses (no return)
                        // Come bet wins (treated as placed on come-out)
                        if (prev.activeBets.come) multiRollPayout += prev.activeBets.come * 2;

                        outcome = total === 7
                            ? "🎲 NATURAL 7 — PASS LINE WINS!"
                            : "🎲 NATURAL 11 — PASS LINE WINS!";

                        if (total === 7) newConsecNaturals += 1; // Holy Sevens: only pure 7s count
                        else newConsecNaturals = 0; // 11 resets the 7-streak
                        // NOTE: naturals do NOT reset the consecutive point hit counter
                        // streak only resets on 7-out

                        // Check Holy Sevens bonus (3 consecutive natural 7s)
                        if (total === 7 && newConsecNaturals >= HOLY_SEVENS_THRESHOLD) {
                            bonusEvent = "holySevens";
                            // 250x on pass line for this roll only
                            if (prev.activeBets.passLine) {
                                multiRollPayout += prev.activeBets.passLine * 50;
                            }
                            newConsecNaturals = 0;
                            outcome = "✨ HOLY SEVENS! 50x BONUS — PASS LINE WINS!";
                        }

                        // After natural: game continues with new come-out, DON'T end game
                        newPhase = "comeOut";
                        newPoint = null;

                    } else if (isCraps(total)) {
                        // Pass Line loses — Don't Pass wins (except 12 = push)
                        if (total !== 12 && prev.activeBets.dontPass) {
                            multiRollPayout += prev.activeBets.dontPass * 2;
                        } else if (total === 12 && prev.activeBets.dontPass) {
                            multiRollPayout += prev.activeBets.dontPass; // push = return stake
                        }
                        if (prev.activeBets.dontCome && total !== 12) multiRollPayout += prev.activeBets.dontCome * 2;
                        if (prev.activeBets.dontCome && total === 12) multiRollPayout += prev.activeBets.dontCome;

                        outcome = total === 12
                            ? "🌙 MIDNIGHT (12) — DON'T PASS PUSH, PASS LOSES"
                            : `💀 CRAPS (${total}) — PASS LINE LOSES, DON'T PASS WINS`;

                        newConsecNaturals = 0;
                        // Craps does NOT reset point streak — only 7-out does
                        newPhase = "comeOut";
                        newPoint = null;

                    } else {
                        // Point established
                        newPoint = total;
                        newPhase = "point";
                        outcome = `🎯 POINT IS ${total} — ROLL TO HIT IT BEFORE 7!`;
                        newConsecNaturals = 0;
                    }

                } else {
                    // ── POINT PHASE ──
                    if (total === newPoint) {
                        // Point hit — Pass Line wins, Place bets win, Odds win
                        if (prev.activeBets.passLine) multiRollPayout += prev.activeBets.passLine * 2;
                        if (prev.activeBets.passOdds && newPoint) {
                            multiRollPayout += Math.floor((prev.activeBets.passOdds * PASS_ODDS_PAYOUTS[newPoint]) / 10000);
                        }
                        const placeKey = `place${newPoint}` as BetType;
                        if (prev.activeBets[placeKey]) {
                            multiRollPayout += Math.floor(((prev.activeBets[placeKey] ?? 0) * PLACE_PAYOUTS[placeKey]) / 10000);
                        }

                        // Place bets on OTHER numbers still active — don't pay out
                        // Come pays on natural, not point hit
                        if (prev.activeBets.come && isNatural(total)) {
                            multiRollPayout += (prev.activeBets.come ?? 0) * 2;
                        }

                        newConsecPointHits += 1;
                        newConsecNaturals = 0;

                        // Show streak in outcome
                        if (newConsecPointHits >= BONUS_STREAK_THRESHOLD) {
                            // 4th consecutive point hit → trigger bonus round
                            bonusEvent = "cathedralRoll";
                            outcome = `⛪ POINT ${total} HIT — 🔥🔥🔥🔥 4 IN A ROW! BONUS ROUND UNLOCKED!`;
                        } else if (newConsecPointHits === 3) {
                            bonusEvent = "blessing";
                            outcome = `🙏 POINT ${total} HIT — 🔥🔥🔥 THREE IN A ROW! ONE MORE FOR BONUS!`;
                        } else if (newConsecPointHits === 2) {
                            outcome = `✅ POINT ${total} HIT — 🔥🔥 TWO IN A ROW!`;
                        } else {
                            outcome = `✅ POINT ${total} HIT — PASS LINE WINS!`;
                        }

                        // Game CONTINUES with a new come-out unless bonus triggered
                        newPhase = "comeOut";
                        newPoint = null;

                    } else if (total === 7) {
                        // 7-OUT — game ends
                        // Don't Pass wins, Lay Odds win
                        if (prev.activeBets.dontPass) multiRollPayout += prev.activeBets.dontPass * 2;
                        if (prev.activeBets.dontPassOdds && newPoint) {
                            const layOdds: Record<number, number> = { 4: 5000, 5: 6700, 6: 8300, 8: 8300, 9: 6700, 10: 5000 };
                            multiRollPayout += Math.floor(((prev.activeBets.dontPassOdds ?? 0) * (layOdds[newPoint] ?? 0)) / 10000);
                        }

                        outcome = "💀 SEVEN OUT — PASS LINE LOSES. GAME OVER.";
                        newConsecPointHits = 0;
                        newConsecNaturals = 0;
                        newBonusMultiplier = 1;
                        gameOver = true;

                    } else {
                        // Non-decisive roll — place bets on this number pay, others continue
                        const placeKey = `place${total}` as BetType;
                        if (prev.activeBets[placeKey] && PLACE_PAYOUTS[placeKey]) {
                            multiRollPayout += Math.floor(((prev.activeBets[placeKey] ?? 0) * PLACE_PAYOUTS[placeKey]) / 10000);
                            outcome = `🎲 ${total} — PLACE ${total} WINS! ROLL AGAIN.`;
                        } else {
                            outcome = `🎲 ${total} — NOT THE POINT (${newPoint}). ROLL AGAIN.`;
                        }
                    }
                }

                const rollPayout = oneRollPayout + multiRollPayout;

                // Build per-bet breakdown
                const betBreakdown: { label: string; wagered: number; payout: number }[] = [];
                const betLabels: Partial<Record<BetType, string>> = {
                    passLine:"Pass Line", dontPass:"Don't Pass", come:"Come", dontCome:"Don't Come",
                    place4:"Place 4", place5:"Place 5", place6:"Place 6", place8:"Place 8",
                    place9:"Place 9", place10:"Place 10", field:"Field", hard4:"Hard 4",
                    hard6:"Hard 6", hard8:"Hard 8", hard10:"Hard 10", any7:"Any Seven",
                    anyCraps:"Any Craps", passOdds:"Pass Odds", dontPassOdds:"DP Odds",
                };
                for (const [bt, wagered] of Object.entries(prev.activeBets)) {
                    if (!wagered || wagered <= 0) continue;
                    const sp = calculatePayout(
                        { [bt]: wagered } as Partial<Record<BetType, number>>,
                        d1, d2, total, prev.phase, prev.point, newBonusMultiplier
                    );
                    if (sp > 0) {
                        betBreakdown.push({
                            label: betLabels[bt as BetType] ?? bt,
                            wagered,
                            payout: sp,
                        });
                    }
                }

                const outcomeDetail = rollPayout > 0
                    ? betBreakdown.map(b => `${b.label}: +${b.payout.toLocaleString()}`).join(" • ")
                    : outcome.includes("ROLL AGAIN") || outcome.includes("POINT IS")
                        ? "No bets resolved — keep rolling"
                        : "No winning bets this roll";

                const rollResult: RollResult = {
                    d1, d2, total,
                    phase: prev.phase,
                    point: prev.point,
                    outcome,
                    outcomeDetail,
                    payout: rollPayout,
                    betBreakdown,
                    bonusEvent,
                    bonusMultiplier: newBonusMultiplier,
                };

                const newTotalPayout = prev.totalPayout + rollPayout;
                const newRollIndex = prev.rollIndex + 1;

                // ── Stop conditions ──────────────────────────────────────────
                // 1. 4 consecutive point hits → bonus round
                const bonusFromStreak = newConsecPointHits >= BONUS_STREAK_THRESHOLD;
                // 2. 20 roll hard cap → bonus round INSTEAD of continuing (overrides 7-out)
                // Check: this was the 20th roll — regardless of outcome, bonus fires
                const bonusFromMaxRolls = newRollIndex >= MAX_ROLLS && !bonusFromStreak;
                // If max rolls hit, cancel the 7-out loss and route to bonus instead
                const bonusRoundTriggered = bonusFromStreak || bonusFromMaxRolls;
                // If bonus fires on what would have been a 7-out, override the loss
                if (bonusFromMaxRolls && gameOver) {
                    gameOver = false; // bonus round handles the ending, not 7-out
                }
                const bonusRoundReason = bonusFromStreak ? "streak" : bonusFromMaxRolls ? "maxRolls" : null;

                pendingTileRef.current = null;
                setPendingIsGameEnder(false); // reset

                if (gameOver) {
                    setShownPointNumber(null);
                    setPayout(newTotalPayout);
                    const lossType = outcome.includes("CRAPS") ? "crapsOut" : "sevenOut";
                    pendingTileRef.current = {
                        type: lossType as import("./GameTile").TileType, d1, d2, rollTotal: total,
                        netPnl: newTotalPayout - (prev.initialWagered || 0),
                        wagered: prev.initialWagered || 0,
                    };
                    setPendingIsGameEnder(true);
                } else if (bonusRoundTriggered) {
                    setPayout(newTotalPayout);
                    setBonusSessionPayout(newTotalPayout);
                    pendingTileRef.current = bonusFromStreak
                        ? { type: "bonusStreak" as import("./GameTile").TileType }
                        : { type: "bonusMaxRolls" as import("./GameTile").TileType, rollCount: newRollIndex };
                    setPendingIsGameEnder(true);
                } else if (newPhase === "point" && prev.phase === "comeOut" && newPoint !== null) {
                    setAddingBets(false);
                    // No tile for point set — just dismiss overlay
                } else if (outcome.includes("NATURAL") && !bonusRoundTriggered && newPhase === "comeOut") {
                    pendingTileRef.current = { type: "naturalWin" as import("./GameTile").TileType, d1, d2, rollTotal: total, payout: rollPayout };
                } else if (outcome.includes("HIT") && !outcome.includes("HIT IT") && !bonusRoundTriggered) {
                    const hitPoint = prev.point;
                    setShownPointNumber(null);
                    if (hitPoint !== null) {
                        pendingTileRef.current = { type: "pointHit" as import("./GameTile").TileType, pointNumber: hitPoint, payout: rollPayout, streak: newConsecPointHits };
                    }
                } else {
                    // Non-decisive — no tile needed
                }

                // Remove one-roll bets that resolved this roll
                const newActiveBets = { ...prev.activeBets };
                for (const key of clearedBets) {
                    delete newActiveBets[key];
                }

                return {
                    ...prev,
                    phase: newPhase,
                    point: newPoint,
                    activeBets: newActiveBets,
                    rollHistory: [...prev.rollHistory, rollResult],
                    totalPayout: newTotalPayout,
                    consecutivePointHits: newConsecPointHits,
                    consecutiveNaturals: newConsecNaturals,
                    currentBonusMultiplier: newBonusMultiplier,
                    gameOver,
                    bonusRoundTriggered,
                    bonusRoundReason,
                    rollIndex: newRollIndex,
                    lastRoll: [d1, d2],
                    bonusEvent,
                };
            });

            setIsRolling(false);
            // Auto-dismiss overlay then show any pending narrative tile
            if (overlayDismissTimerRef.current) clearTimeout(overlayDismissTimerRef.current);
            overlayDismissTimerRef.current = setTimeout(() => {
                if (rollVersionRef.current === capturedVersion) {
                    revealPendingTile();
                }
            }, 2500);
        }, 1100);
    }, [isRolling, gameState.gameOver, revealPendingTile]);

    // ─── Reset ─────────────────────────────────────────────────────────────────

    const handleReset = useCallback((isPlayingAgain = false) => {
        if (!isPlayingAgain) {
            const newGameId = BigInt(bytesToHex(new Uint8Array(randomBytes(32))));
            const newUserWord = bytesToHex(new Uint8Array(randomBytes(32)));
            setCurrentGameId(newGameId);
            setUserRandomWord(newUserWord);
        }

        setGameState(initialState);
        setPayout(null);
        setBonusSessionPayout(0);
        setIsRolling(false);
        setCurrentView(0);
        setPendingBets({});
        setActiveTile(null);
        setShowDiceOverlay(false);
        setAddingBets(false);

        if (replayIdString !== null) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("id");
            router.replace(`?${params.toString()}`, { scroll: false });
        }
    }, [replayIdString, searchParams, router]);

    // ─── Same Bets Again — instant replay with identical bet config ───────────

    const handleSameBetsAgain = useCallback(async () => {
        // Use the snapshot taken at game start — includes ALL bets (field, hardways, props)
        // activeBets at game end is missing one-roll bets that cleared during play
        const betsToUse = Object.keys(initialBetsSnapshot).length > 0
            ? { ...initialBetsSnapshot }
            : { ...pendingBets };

        if (Object.keys(betsToUse).length === 0) {
            // Nothing to restore — go back to setup
            handleReset(false);
            return;
        }

        const newGameId = BigInt(bytesToHex(new Uint8Array(randomBytes(32))));
        const newUserWord = bytesToHex(new Uint8Array(randomBytes(32)));
        setCurrentGameId(newGameId);
        setUserRandomWord(newUserWord);
        setGameState(initialState);
        setPayout(null);
        setIsRolling(false);
        setShowDiceOverlay(false);
        setAddingBets(false);
        setActiveTile(null);
        setPendingBets(betsToUse);
        await playGame(newGameId as bigint, newUserWord as `0x${string}`, betsToUse);
    }, [pendingBets, playGame, handleReset]);

    // ─── Bonus Round complete — apply multiplier and end ──────────────────────

    const handleBonusComplete = useCallback((finalPayout: number) => {
        // finalPayout already computed in BonusRound using its own sessionPayout prop (consistent)
        setPayout(finalPayout);
        // Clear bonus state and mark game over
        setGameState(prev => ({
            ...prev,
            totalPayout: finalPayout,
            gameOver: true,
            bonusRoundTriggered: false,
        }));
        setActiveTile(null);
        setShowDiceOverlay(false);
        setCurrentView(2);
    }, []);

    // ─── Play Again ────────────────────────────────────────────────────────────

    const handlePlayAgain = useCallback(async () => {
        const newGameId = BigInt(bytesToHex(new Uint8Array(randomBytes(32))));
        const newUserWord = bytesToHex(new Uint8Array(randomBytes(32)));
        setCurrentGameId(newGameId);
        setUserRandomWord(newUserWord);
        handleReset(true);
        await playGame(newGameId, newUserWord);
    }, [handleReset, playGame]);

    // ─── Rewatch ───────────────────────────────────────────────────────────────

    const handleRewatch = useCallback(() => {
        setCurrentView(1);
        setGameState(prev => ({
            ...prev,
            rollHistory: [],
            rollIndex: 0,
            lastRoll: null,
            gameOver: false,
            totalPayout: 0,
        }));
        setPayout(null);
        setIsRolling(false);
    }, []);

    // ─── Render ────────────────────────────────────────────────────────────────

    const shouldShowPNL = !!payout && payout > totalBetAmount;

    return (
        <div>
            <div className="flex flex-col lg:flex-row lg:items-stretch gap-4 sm:gap-8 lg:gap-10">
                <div className="min-w-0 w-full h-full lg:basis-2/3 lg:self-stretch">
                <GameWindow
                    game={game}
                    currentGameId={currentGameId}
                    isLoading={isLoading}
                    isGameFinished={false}
                    onPlayAgain={handlePlayAgain}
                    playAgainText="Roll Again"
                    onRewatch={handleRewatch}
                    onReset={() => handleReset(false)}
                    betAmount={totalBetAmount}
                    payout={payout}
                    inReplayMode={replayIdString !== null}
                    isUserOriginalPlayer={true}
                    showPNL={shouldShowPNL}
                    isGamePaused={false}
                    resultModalDelayMs={0}
                    disableBuiltInSong={false}
                >
                    <GimbozCrapsWindow
                        game={game}
                        gameState={gameState}
                        isRolling={isRolling}
                        currentView={currentView}
                        selectedChipValue={selectedChipValue}
                        onBetPlace={placeChipBet}
                        pendingBets={pendingBets}
                        onClearBet={clearActiveBet}
                        onRoll={handleStateAdvance}
                        onCashOut={() => {
                            setGameState(prev => ({ ...prev, gameOver: true }));
                            setCurrentView(2);
                        }}
                        onBonusComplete={handleBonusComplete}
                        showDiceOverlay={showDiceOverlay && !addingBets}
                        onDismissOverlay={handleOverlayDismiss}
                        bonusSessionPayout={bonusSessionPayout}
                        activeTile={activeTile}
                        onTileDismiss={dismissTile}
                    />
                </GameWindow>
                </div>

                <div className="flex min-w-0 w-full flex-col lg:basis-1/3 lg:min-h-0 lg:self-stretch">
                <GimbozCrapsSetupCard
                    game={game}
                    currentView={currentView}
                    pendingBets={pendingBets}
                    selectedChipValue={selectedChipValue}
                    onChipSelect={setSelectedChipValue}
                    onClearBets={clearBets}
                    onPlay={async () => await playGame()}
                    onRoll={() => {
                        setAddingBets(false);
                        // Cancel overlay auto-dismiss — roll immediately clears it
                        if (overlayDismissTimerRef.current) {
                            clearTimeout(overlayDismissTimerRef.current);
                            overlayDismissTimerRef.current = null;
                        }
                        setShowDiceOverlay(false);
                        pendingTileRef.current = null; // skip any pending tile
                        handleStateAdvance();
                    }}
                    onCashOut={() => {
                        setGameState(prev => ({ ...prev, gameOver: true }));
                        setCurrentView(2);
                    }}
                    onAddBets={() => { setAddingBets(true); setShowDiceOverlay(false); setActiveTile(null); }}
                    onSameBetsAgain={handleSameBetsAgain}
                    overlayShowing={showDiceOverlay && !addingBets && !isRolling}
                    pendingIsGameEnder={pendingIsGameEnder}
                    bonusActive={gameState.bonusRoundTriggered && !gameState.gameOver}
                    onRewatch={handleRewatch}
                    onReset={() => handleReset(false)}
                    onPlayAgain={handlePlayAgain}
                    totalBetAmount={totalBetAmount}
                    isLoading={isLoading}
                    isRolling={isRolling}
                    payout={payout}
                    gameState={gameState}
                    walletBalance={walletBalance}
                    inReplayMode={replayIdString !== null}
                />
                </div>
            </div>
        </div>
    );
};

export default GimbozCraps;
