"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Game } from "@/lib/games";
import { BetType, GamePhase, BonusEvent, BET_LABELS } from "./gimbozCrapsConfig";
import { RollResult } from "./GimbozCraps";

interface GameState {
    phase: GamePhase;
    point: number | null;
    rollHistory: RollResult[];
    totalPayout: number;
    initialWagered: number;
    consecutivePointHits: number;
    consecutiveNaturals: number;
    currentBonusMultiplier: number;
    gameOver: boolean;
    bonusEvent: BonusEvent;
    activeBets: Partial<Record<BetType, number>>;
}

// Flash state per bet: positive = win amount, negative = loss indicator
type BetFlash = Record<string, { amount: number; win: boolean }>

interface GimbozCrapsSetupCardProps {
    game: Game;
    currentView: 0 | 1 | 2;
    pendingBets: Partial<Record<BetType, number>>;
    selectedChipValue: number;
    onChipSelect: (v: number) => void;
    onClearBets: () => void;
    onPlay: () => void;
    onRoll: () => void;
    onCashOut: () => void;
    onAddBets: () => void;
    onSameBetsAgain: () => void; // instant replay with same bets
    onRewatch: () => void;
    overlayShowing: boolean;
    pendingIsGameEnder?: boolean; // hide Roll Again when game-ending tile is pending
    bonusActive?: boolean;
    onReset: () => void;
    onPlayAgain: () => void;
    totalBetAmount: number;
    isLoading: boolean;
    isRolling: boolean;
    payout: number | null;
    gameState: GameState;
    walletBalance: number;
    inReplayMode: boolean;
}

const THEME = "#A8E10C";

// ─── Chip denominations ───────────────────────────────────────────────────────
const CHIPS = [
    { value: 1,   color: "#6B46C1", label: "1"   },  // deep purple
    { value: 5,   color: "#2B6CB0", label: "5"   },  // deep blue
    { value: 10,  color: "#B7791F", label: "10"  },  // deep gold
    { value: 25,  color: "#276749", label: "25"  },  // deep green
    { value: 100, color: "#C53030", label: "100" },  // deep red
    { value: 250, color: "#C05621", label: "250" },  // deep orange
];

const ChipButton: React.FC<{
    chip: typeof CHIPS[0];
    selected: boolean;
    onClick: () => void;
}> = ({ chip, selected, onClick }) => (
    <button
        onClick={onClick}
        className="relative focus:outline-none transition-transform duration-150"
        style={{ transform: selected ? "scale(1.2) translateY(-3px)" : "scale(1)" }}
        title={`${chip.value} APE`}
    >
        <svg viewBox="0 0 100 100" width={selected ? 48 : 42} height={selected ? 48 : 42}
            style={{
                filter: selected
                    ? `drop-shadow(0 0 8px ${chip.color}) drop-shadow(0 0 16px ${chip.color}88)`
                    : "drop-shadow(0 2px 5px rgba(0,0,0,0.6))",
                transition: "all 0.15s",
            }}>
            {/* Outer */}
            <circle cx="50" cy="50" r="48" fill={chip.color} />
            {/* Notches */}
            {[0,30,60,90,120,150,180,210,240,270,300,330].map(deg => (
                <rect key={deg} x="46" y="2" width="8" height="12" rx="2"
                    fill="rgba(0,0,0,0.3)" transform={`rotate(${deg},50,50)`} />
            ))}
            {/* Face */}
            <circle cx="50" cy="50" r="32" fill={chip.color} />
            <circle cx="50" cy="50" r="28" fill="rgba(255,255,255,0.12)" />
            <circle cx="50" cy="50" r="26" fill={chip.color} />
            {/* Label */}
            <text x="50" y="59" textAnchor="middle" fill="white"
                fontSize={chip.value >= 100 ? 22 : 27}
                fontWeight="900" fontFamily="'Arial Black', Impact, sans-serif">
                {chip.label}
            </text>
        </svg>
        {selected && (
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-white border border-black" />
        )}
    </button>
);

// ─── Stat row ─────────────────────────────────────────────────────────────────
const StatRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
    <div className="flex justify-between items-center text-xs">
        <span className="text-gray-500">{label}</span>
        <span className={highlight ? "font-bold" : "text-white"} style={highlight ? { color: THEME } : {}}>
            {value}
        </span>
    </div>
);

// ─── Main Card ────────────────────────────────────────────────────────────────
const GimbozCrapsSetupCard: React.FC<GimbozCrapsSetupCardProps> = ({
    game,
    currentView,
    pendingBets,
    selectedChipValue,
    onChipSelect,
    onClearBets,
    onPlay,
    onRoll,
    onCashOut,
    onAddBets,
    onSameBetsAgain,
    onRewatch,
    overlayShowing,
    pendingIsGameEnder = false,
    bonusActive = false,
    onReset,
    onPlayAgain,
    totalBetAmount,
    isLoading,
    isRolling,
    payout,
    gameState,
    walletBalance,
    inReplayMode,
}) => {
    const { phase, point, currentBonusMultiplier, rollHistory, consecutivePointHits, consecutiveNaturals, initialWagered } = gameState;
    // Use payout prop (final, post-bonus) when available, fall back to gameState.totalPayout
    const totalPayout = (payout !== null && payout !== undefined) ? payout : gameState.totalPayout;
    const canCashOut = totalPayout > 0 && !isRolling && !gameState.gameOver;
    const netProfit = totalPayout - (initialWagered || totalBetAmount);

    // Build flash map from last roll's bet breakdown
    const [betFlash, setBetFlash] = React.useState<BetFlash>({});
    const prevRollCount = React.useRef(rollHistory.length);

    React.useEffect(() => {
        if (rollHistory.length <= prevRollCount.current) { prevRollCount.current = rollHistory.length; return; }
        prevRollCount.current = rollHistory.length;
        const lastRoll = rollHistory[rollHistory.length - 1];
        if (!lastRoll) return;

        const flash: BetFlash = {};

        // Winning bets — show green +amount
        lastRoll.betBreakdown?.forEach(b => {
            if (b.payout > 0) {
                const labelToKey: Record<string, string> = {
                    "Pass Line":"passLine","Don't Pass":"dontPass","Come":"come","Field":"field",
                    "Any Seven":"any7","Any Craps":"anyCraps","Hard 4":"hard4","Hard 6":"hard6",
                    "Hard 8":"hard8","Hard 10":"hard10","Pass Odds":"passOdds","DP Odds":"dontPassOdds",
                    "Place 4":"place4","Place 5":"place5","Place 6":"place6","Place 8":"place8",
                    "Place 9":"place9","Place 10":"place10",
                };
                const key = labelToKey[b.label];
                if (key) flash[key] = { amount: b.payout, win: true };
            }
        });

        // Seven-out / craps — all active bets that didn't pay = loss flash
        if (lastRoll.outcome.includes("SEVEN OUT") || lastRoll.outcome.includes("CRAPS")) {
            Object.keys(gameState.activeBets).forEach(key => {
                if (!flash[key]) flash[key] = { amount: gameState.activeBets[key as BetType] ?? 0, win: false };
            });
        }

        setBetFlash(flash);
        const t = setTimeout(() => setBetFlash({}), 1500);
        return () => clearTimeout(t);
    }, [rollHistory.length]);

    const activeBetCount = Object.values(pendingBets).filter(v => (v ?? 0) > 0).length;

    const playButton = () => (
        <Button
            onClick={onPlay}
            disabled={totalBetAmount <= 0 || isLoading}
            className="w-full font-black uppercase tracking-widest"
            style={{ backgroundColor: THEME, color: "#000", borderColor: THEME }}
        >
            {isLoading ? "Consecrating..." : "Place Your Bet"}
        </Button>
    );

    const ongoingActionButtons = () => (
        <div className="flex flex-col gap-2">
            {overlayShowing && rollHistory.length > 0 && !pendingIsGameEnder ? (
                <>
                    <p className="text-[10px] text-white/40 text-center uppercase tracking-widest">What next?</p>
                    <Button onClick={onRoll}
                        className="w-full font-black uppercase tracking-widest"
                        style={{ backgroundColor: THEME, color: "#000" }}>
                        <span className="flex items-center gap-2 justify-center">
                            <img src="/submissions/gimboz-craps/icons/dice.webp" className="w-6 h-6" style={{ mixBlendMode:"darken" }} alt="" />
                            {phase === "comeOut" ? "Come-Out Roll" : `Roll for ${point}`}
                        </span>
                    </Button>
                    {phase === "point" && (
                        <Button onClick={onAddBets} variant="secondary"
                            className="w-full font-black uppercase tracking-widest border"
                            style={{ borderColor: "rgba(168,225,12,0.4)", color: "#A8E10C" }}>
                            ➕ Add Bets First
                        </Button>
                    )}
                </>
            ) : (
                <Button onClick={onRoll} disabled={isRolling || gameState.gameOver}
                    className="w-full font-black uppercase tracking-widest text-lg py-5"
                    style={{ backgroundColor: THEME, color: "#000", borderColor: THEME }}>
                    <span className="flex items-center gap-2 justify-center">
                        <img src="/submissions/gimboz-craps/icons/dice.webp" className="w-6 h-6" style={{ mixBlendMode:"multiply" }} alt="" />
                        {isRolling ? "Rolling..." : rollHistory.length === 0 ? "Come-Out Roll" : phase === "comeOut" ? "Come-Out Roll" : `Roll for ${point}`}
                    </span>
                </Button>
            )}

            {canCashOut && (
                <Button onClick={onCashOut}
                    className="w-full font-black uppercase tracking-widest"
                    style={{ backgroundColor: "#FFD700", color: "#000", borderColor: "#FFD700", boxShadow: "0 0 10px rgba(255,215,0,0.25)" }}>
                    <span className="flex items-center gap-2 justify-center">
                        <img src="/submissions/gimboz-craps/icons/coin.webp" className="w-6 h-6" alt="" />
                        Cash Out {totalPayout.toLocaleString()} APE
                    </span>
                </Button>
            )}

            <button onClick={onReset}
                className="w-full text-center text-[10px] text-white/25 hover:text-white/50 transition-colors py-1 uppercase tracking-widest">
                ↩ Change Bets / New Game
            </button>
        </div>
    );

    const gameOverActionButtons = () => (
        <div className="flex flex-col gap-2">
            <Button
                onClick={onSameBetsAgain}
                className="w-full font-black uppercase tracking-widest text-lg py-5"
                style={{ backgroundColor: THEME, color: "#000", borderColor: THEME }}
            >
                <span className="flex items-center gap-2 justify-center">
                    <img src="/submissions/gimboz-craps/icons/dice.webp" className="w-6 h-6" style={{ mixBlendMode:"multiply" }} alt="" />
                    Same Bets Again
                </span>
            </Button>
            <Button
                onClick={onReset}
                variant="secondary"
                className="w-full font-black uppercase tracking-widest"
            >
                Change Bets
            </Button>
            <Button onClick={onRewatch} variant="secondary" className="w-full text-xs opacity-60">
                Rewatch Last Game
            </Button>
        </div>
    );

    return (
        <Card className="h-full min-h-0 w-full flex flex-col overflow-hidden p-4 gap-2">

            {/* ── SETUP VIEW ──────────────────────────────────────────── */}
            {currentView === 0 && (
                <>
                    <div className="shrink-0 lg:hidden">
                        {playButton()}
                    </div>

                    <CardContent className="p-0 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto overflow-x-hidden">

                        {/* USD toggle (aesthetic, matches roulette) */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-white">Show Bets in USD</p>
                                <p className="text-xs text-gray-500">Your chips are valued in APE</p>
                            </div>
                            <div className="w-10 h-5 rounded-full bg-gray-700 relative cursor-not-allowed opacity-50">
                                <div className="w-4 h-4 rounded-full bg-gray-400 absolute top-0.5 left-0.5" />
                            </div>
                        </div>

                        {/* Chip selector */}
                        <div>
                            <div className="flex items-center gap-1 flex-wrap justify-start">
                                {CHIPS.map(chip => (
                                    <ChipButton
                                        key={chip.value}
                                        chip={chip}
                                        selected={selectedChipValue === chip.value}
                                        onClick={() => onChipSelect(chip.value)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Remove all bets */}
                        <button
                            onClick={onClearBets}
                            disabled={activeBetCount === 0}
                            className="w-full py-2 text-sm rounded border border-white/20 text-white/60 hover:text-white hover:border-white/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            Remove All Bets
                        </button>

                        {/* Active bets summary */}
                        {activeBetCount > 0 && (
                            <div className="border border-white/10 rounded p-2 flex flex-col gap-1">
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Placed Bets</p>
                                {Object.entries(pendingBets).filter(([, v]) => (v ?? 0) > 0).map(([type, amount]) => (
                                    <div key={type} className="flex justify-between text-xs">
                                        <span className="text-gray-400">{BET_LABELS[type as BetType]}</span>
                                        <span className="text-white">{(amount ?? 0).toLocaleString()} APE</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>

                    <div className="grow" />

                    <CardFooter className="p-0 flex flex-col gap-2">
                        <div className="w-full flex flex-col gap-1">
                            <StatRow label="Bet Amount" value={`${totalBetAmount.toLocaleString()} APE`} highlight={totalBetAmount > 0} />
                            <StatRow label="Wallet Balance" value={`${walletBalance.toLocaleString()} APE`} />
                            <StatRow label="Max Profit per Game" value="Bounded by house pool" />
                            <StatRow label="Max Bet Per Game" value="75,000 APE" />
                        </div>

                        <Button
                            onClick={onPlay}
                            disabled={totalBetAmount <= 0 || isLoading}
                            className="hidden lg:flex w-full font-black uppercase tracking-widest mt-2"
                            style={{ backgroundColor: THEME, color: "#000", borderColor: THEME }}
                        >
                            {isLoading ? "Consecrating..." : "Place Your Bet"}
                        </Button>


                    </CardFooter>
                </>
            )}

            {/* ── BONUS ACTIVE — minimal sidebar ── */}
            {currentView === 1 && bonusActive && (
                <CardContent className="p-0 flex flex-col gap-3 items-center justify-center h-full text-center">
                    <p className="text-xs text-white/40 uppercase tracking-widest">The Trial Is Underway</p>
                    <p className="text-sm text-white/60">Session: {totalPayout.toLocaleString()} APE</p>
                    <p className="text-[10px] text-white/30">Complete the bonus roll in the game window</p>
                </CardContent>
            )}

            {/* ── ONGOING VIEW ────────────────────────────────────────── */}
            {currentView === 1 && !bonusActive && (
                <>
                    <div className="shrink-0 lg:hidden">
                        {ongoingActionButtons()}
                    </div>

                <CardContent className="p-0 flex flex-col gap-3 h-full min-h-0 flex-1 overflow-y-auto overflow-x-hidden">

                    {/* Live session stats — only show after first roll */}
                    {rollHistory.length > 0 ? (
                        <div className="rounded-lg p-2 flex flex-col gap-1"
                            style={{ background: "rgba(168,225,12,0.05)", border: "1px solid rgba(168,225,12,0.2)" }}>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-white/40 uppercase tracking-widest">Session</span>
                                <span className="text-[10px] text-white/40">Roll #{rollHistory.length}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-white/60">Wagered</span>
                                <span className="text-xs text-white font-bold">{(gameState.initialWagered || totalBetAmount).toLocaleString()} APE</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-white/60">Collected</span>
                                <span className="text-xs font-bold" style={{ color: THEME }}>{totalPayout.toLocaleString()} APE</span>
                            </div>
                            {(totalPayout > 0 || rollHistory.length > 1) && (
                                <div className="border-t border-white/10 pt-1.5 flex justify-between items-center">
                                    <span className="text-xs text-white/60">Net P&L</span>
                                    <span className={`text-sm font-black ${netProfit >= 0 ? "" : "text-red-400"}`}
                                        style={netProfit >= 0 ? { color: THEME } : {}}>
                                        {netProfit >= 0 ? "+" : ""}{netProfit.toLocaleString()} APE
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-lg p-3 text-center"
                            style={{ background: "rgba(168,225,12,0.03)", border: "1px solid rgba(168,225,12,0.15)" }}>
                            <p className="text-[10px] text-white/30 uppercase tracking-widest">Ready to roll</p>
                            <p className="text-xs text-white/50 mt-0.5">{(gameState.initialWagered || totalBetAmount).toLocaleString()} APE on the table</p>
                        </div>
                    )}
                    {/* Point + Streak split panel */}
                    <div className="border border-white/10 rounded overflow-hidden">
                        <div className="flex">
                            {/* Left — current point */}
                            <div className="flex-1 flex flex-col items-center justify-center py-1.5 px-1 border-r border-white/10"
                                style={{ background: phase === "point" ? "rgba(255,215,0,0.06)" : "transparent" }}>
                                <p className="text-[9px] text-white/40 uppercase tracking-widest mb-0.5">Point</p>
                                {phase === "point" && point ? (
                                    <p className="text-2xl font-black leading-none" style={{ color: "#FFD700" }}>
                                        {point}
                                    </p>
                                ) : (
                                    <p className="text-sm text-white/25 font-black">—</p>
                                )}
                                <p className="text-[8px] text-white/30 mt-0.5">
                                    {phase === "point" ? "Roll it to win" : "Come-out"}
                                </p>
                            </div>
                            {/* Right — streak */}
                            <div className="flex-1 flex flex-col items-center justify-center py-1.5 px-1">
                                <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color:"#63B3ED" }}>Streak</p>
                                <p className="text-2xl font-black leading-none"
                                    style={{ color: consecutivePointHits >= 3 ? "#F97316" : consecutivePointHits > 0 ? "#63B3ED" : "rgba(255,255,255,0.2)" }}>
                                    {consecutivePointHits > 0 ? consecutivePointHits : "0"}
                                </p>
                                <p className="text-[10px] font-bold mt-0.5"
                                    style={{ color: consecutivePointHits >= 3 ? "#F97316" : "#63B3ED" }}>
                                    <span className="flex items-center gap-1 justify-center">
                                        {consecutivePointHits > 0 && <img src="/submissions/gimboz-craps/icons/flame.webp" className="w-5 h-5" style={{ mixBlendMode:"screen" }} alt="" />}
                                        {consecutivePointHits === 0 ? "No streak" :
                                         consecutivePointHits === 3 ? "One more!" :
                                         consecutivePointHits >= 4 ? "Bonus!" :
                                         `${consecutivePointHits} in a row`}
                                    </span>
                                </p>
                                {consecutivePointHits < 4 && (
                                    <p className="text-[9px] font-bold mt-0.5"
                                        style={{ color: consecutivePointHits >= 3 ? "#F97316" : "rgba(99,179,237,0.6)" }}>
                                        {4 - consecutivePointHits} to bonus
                                    </p>
                                )}
                            </div>
                        </div>
                        {currentBonusMultiplier > 1 && (
                            <div className="border-t border-white/10 px-2 py-1 text-center">
                                <p className="text-[9px] font-black" style={{ color: "#F97316" }}>
                                    🔥 {currentBonusMultiplier}× BONUS MULTIPLIER ACTIVE
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Holy Sevens counter — only during come-out */}
                    {phase === "comeOut" && (
                        <div className="rounded-lg px-3 py-1.5 flex items-center justify-between"
                            style={{ background: "rgba(255,215,0,0.05)", border: "1px solid rgba(255,215,0,0.15)" }}>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "#FFD700" }}>Holy Sevens</span>
                                <span className="text-[8px] text-white/40">3 straight 7s = 50x</span>
                            </div>
                            <div className="flex items-center gap-1">
                                {[0,1,2].map(i => (
                                    <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                                        style={{
                                            background: i < consecutiveNaturals ? "#FFD700" : "rgba(255,255,255,0.08)",
                                            color: i < consecutiveNaturals ? "#000" : "rgba(255,255,255,0.2)",
                                            boxShadow: i < consecutiveNaturals ? "0 0 8px rgba(255,215,0,0.6)" : "none",
                                        }}>
                                        7
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Roll count bar — 13 segments, lights up as you roll ── */}
                    {(() => {
                        const MAX = 13;
                        const current = rollHistory.length;
                        const getSegColor = (i: number) => {
                            if (i >= current) return "rgba(255,255,255,0.08)";
                            const pct = current / MAX;
                            if (pct >= 0.85) return "#ef4444"; // red — danger zone
                            if (pct >= 0.62) return "#F97316"; // orange — getting close
                            return THEME;                        // green — early
                        };
                        return (
                            <div className="flex flex-col gap-1">
                                <div className="flex gap-0.5 relative h-6 items-end">
                                    {Array.from({ length: MAX }).map((_, i) => {
                                        const isActive = i < current;
                                        const isCurrent = i === current - 1;
                                        return (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                                                {/* Number — only show on current segment */}
                                                <span className="text-[11px] font-black leading-none"
                                                    style={{ color: getSegColor(i), opacity: isCurrent ? 1 : 0 }}>
                                                    {i + 1}
                                                </span>
                                                {/* Segment bar */}
                                                <div className="w-full rounded-sm transition-all duration-300"
                                                    style={{
                                                        height: isCurrent ? 10 : isActive ? 8 : 6,
                                                        background: getSegColor(i),
                                                        boxShadow: isCurrent ? `0 0 6px ${getSegColor(i)}` : "none",
                                                    }} />
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-center font-bold"
                                    style={{ color: current >= 11 ? "#ef4444" : current >= 8 ? "#F97316" : "rgba(168,225,12,0.5)" }}>
                                    <span className="flex items-center gap-1 justify-center">
                                        {current >= MAX && <img src="/submissions/gimboz-craps/icons/lucky13.webp" className="w-5 h-5" style={{ mixBlendMode:"screen" }} alt="" />}
                                        {current >= MAX ? "LUCKY 13 — BONUS!" : `Roll ${current} of ${MAX} · ${MAX - current} to bonus`}
                                    </span>
                                </p>
                            </div>
                        );
                    })()}

                    {/* Chip selector — always visible during game so player can change denomination */}
                    <div className="flex flex-col gap-1.5">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Chip Value</p>
                        <div className="flex items-center gap-1 flex-wrap justify-start">
                            {CHIPS.map(chip => (
                                <ChipButton
                                    key={chip.value}
                                    chip={chip}
                                    selected={selectedChipValue === chip.value}
                                    onClick={() => onChipSelect(chip.value)}
                                />
                            ))}
                        </div>
                        <p className="text-[9px] text-[#A8E10C]/50 text-center">
                            Click a zone on the table to add {selectedChipValue} APE
                        </p>
                    </div>

                    {/* Active bets with win/loss flash — scrollable when many bets */}
                    <div className="border border-white/10 rounded p-2 flex flex-col gap-1">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Your Bets</p>
                        <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: 72 }}>
                        {Object.entries(gameState.activeBets).filter(([, v]) => (v ?? 0) > 0).map(([type, amount]) => {
                            const flash = gameState.gameOver ? undefined : betFlash[type];
                            return (
                                <div key={type} className="flex justify-between items-center text-xs">
                                    <span className="text-gray-400">{BET_LABELS[type as BetType]}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-white">{(amount ?? 0).toLocaleString()} APE</span>
                                        {flash && (
                                            <motion.span
                                                initial={{ opacity: 0, x: 8, scale: 0.8 }}
                                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                                exit={{ opacity: 0, x: 12 }}
                                                className="text-[10px] font-black"
                                                style={{ color: flash.win ? THEME : "#ef4444" }}>
                                                {flash.win ? `+${flash.amount.toLocaleString()}` : "✕ LOST"}
                                            </motion.span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        </div>{/* end scrollable inner div */}
                    </div>

                    <div className="grow hidden lg:block" />

                    {/* ── Action buttons — desktop only (mobile shown above) ── */}
                    <div className="hidden lg:flex flex-col gap-2 shrink-0">
                        {ongoingActionButtons()}
                    </div>
                </CardContent>
                </>
            )}

            {/* ── GAME OVER VIEW ──────────────────────────────────────── */}
            {currentView === 2 && (
                <>
                    <div className="shrink-0 lg:hidden">
                        {gameOverActionButtons()}
                    </div>

                <CardContent className="p-0 flex flex-col gap-3 h-full min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                    <div className="text-center">
                        {(() => {
                            const wagered = gameState.initialWagered || totalBetAmount;
                            const net = totalPayout - wagered;
                            const isWin = totalPayout >= wagered;
                            return (
                                <div className="rounded-xl px-4 py-3 text-center"
                                    style={{
                                        background: isWin ? "rgba(168,225,12,0.1)" : "rgba(239,68,68,0.1)",
                                        border: `2px solid ${isWin ? "#A8E10C" : "#ef4444"}`,
                                    }}>
                                    <p className="text-[10px] uppercase tracking-widest mb-1"
                                        style={{ color: isWin ? "#A8E10C" : "#ef4444" }}>
                                        {isWin ? "Net Profit" : "Net Loss"}
                                    </p>
                                    <p className="text-3xl font-black"
                                        style={{ color: isWin ? "#A8E10C" : "#ef4444" }}>
                                        {isWin ? "+" : "-"}{Math.abs(net).toLocaleString()} APE
                                    </p>
                                </div>
                            );
                        })()}
                    </div>

                    <div className="border border-white/10 rounded p-3 flex flex-col gap-1.5">
                        {(() => {
                            const wagered = gameState.initialWagered || totalBetAmount;
                            const net = totalPayout - wagered;
                            return (<>
                                <StatRow label="Total Wagered" value={`${wagered.toLocaleString()} APE`} />
                                <StatRow label="Total Payout" value={`${totalPayout.toLocaleString()} APE`} highlight={totalPayout > wagered} />
                                <StatRow label="Net P&L" value={`${net > 0 ? "+" : net < 0 ? "-" : ""}${Math.abs(net).toLocaleString()} APE`} highlight={net > 0} />
                                <StatRow label="Rolls" value={String(gameState.rollHistory.length)} />
                            </>);
                        })()}
                        {currentBonusMultiplier > 1 && (
                            <StatRow label="Bonus Applied" value={`${currentBonusMultiplier}x`} highlight />
                        )}
                    </div>

                    <div className="grow" />

                    {/* Roll history log — collapsible, for testing */}
                    {gameState.rollHistory.length > 0 && (
                        <details className="border border-white/10 rounded p-2 text-xs">
                            <summary className="text-white/40 cursor-pointer uppercase tracking-wider text-[10px]">
                                📋 Roll History ({gameState.rollHistory.length} rolls)
                            </summary>
                            <div className="mt-2 flex flex-col gap-0.5 max-h-40 overflow-y-auto">
                                {gameState.rollHistory.map((roll, i) => (
                                    <div key={i} className={`flex justify-between items-start gap-1 py-0.5 border-b border-white/5 ${roll.payout > 0 ? "text-[#A8E10C]" : "text-white/40"}`}>
                                        <span className="shrink-0 text-white/25">#{i+1}</span>
                                        <span className="shrink-0 font-bold">{roll.d1}+{roll.d2}={roll.total}</span>
                                        <span className="flex-1 text-right leading-tight text-[9px]">
                                            {roll.outcome.replace(/[🎲✅💀🙏⛪🔥✨🎯🌙]/g, '').trim()}
                                        </span>
                                        {roll.payout > 0 && (
                                            <span className="shrink-0 font-black">+{roll.payout}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </details>
                    )}

                    <div className="grow hidden lg:block" />

                    <div className="hidden lg:flex flex-col gap-2 shrink-0">
                        {gameOverActionButtons()}
                    </div>
                </CardContent>
                </>
            )}
        </Card>
    );
};

export default GimbozCrapsSetupCard;
