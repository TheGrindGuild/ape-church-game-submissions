"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Game } from "@/lib/games";
import { GamePhase, BonusEvent, BONUS_NAMES, BetType } from "./gimbozCrapsConfig";

const MAX_ROLLS = 13; // Lucky 13
import { RollResult } from "./GimbozCraps";
import Die3D from "./Dice3D";
import GothicCrapsTable from "./GothicCrapsTable";
import BonusRound from "./BonusRound";
import GameTile, { TileData } from "./GameTile";

interface GameState {
    phase: GamePhase;
    point: number | null;
    rollHistory: RollResult[];
    totalPayout: number;
    initialWagered: number;
    bonusRoundTriggered: boolean;
    bonusRoundReason: "streak" | "maxRolls" | null;
    lastRoll: [number, number] | null;
    bonusEvent: BonusEvent;
    consecutivePointHits: number;
    gameOver: boolean;
    currentBonusMultiplier: number;
    activeBets: Partial<Record<BetType, number>>;
}

interface GimbozCrapsWindowProps {
    game: Game;
    gameState: GameState;
    isRolling: boolean;
    currentView: 0 | 1 | 2;
    selectedChipValue: number;
    onBetPlace: (type: BetType) => void;
    pendingBets: Partial<Record<BetType, number>>;
    onClearBet: (type: BetType) => void;
    onRoll: () => void;
    onCashOut: () => void;
    onBonusComplete: (multiplier: number) => void;
    showDiceOverlay: boolean;
    onDismissOverlay: () => void;
    bonusSessionPayout: number;
    activeTile: TileData | null;
    onTileDismiss: () => void;
}

// ─── Dice overlay (full-screen popup during roll) ─────────────────────────────
// Phase 1: Monk throw animation (~900ms)
// Phase 2: Monk fades out, 3D dice tumble in
// Phase 3: Dice settle, result shown

interface DiceOverlayProps {
    isRolling: boolean;
    lastRoll: [number, number] | null;
    currentOutcome: RollResult | null;
    bonusEvent: BonusEvent;
    bonusMultiplier: number;
    isWin: boolean;
    show: boolean;
    onDismiss: () => void;
    rollCount: number;
    streak: number;
    maxRolls: number;
}

const DiceOverlay: React.FC<DiceOverlayProps> = ({
    isRolling, lastRoll, currentOutcome, bonusEvent, bonusMultiplier, isWin, show, onDismiss,
    rollCount, streak, maxRolls
}) => {
    // Determine outcome type
    const outcome = currentOutcome?.outcome ?? "";
    const isSevenOut = outcome.includes("SEVEN OUT");
    const isPointSet = outcome.includes("POINT IS");
    const isCrapsOut = outcome.includes("CRAPS");
    const isNeutral = isPointSet || outcome.includes("ROLL AGAIN") || outcome.includes("NOT THE POINT");

    const boxColor = isNeutral ? "#A8E10C" : isWin ? "#A8E10C" : "#ef4444";
    const boxBg = isNeutral ? "rgba(168,225,12,0.1)" : isWin ? "rgba(168,225,12,0.15)" : "rgba(239,68,68,0.12)";

    // Plain English loss explanations
    const getLossExplanation = () => {
        if (isSevenOut) return "A 7 was rolled during the point phase. Pass Line, Come, and Place bets all lose on a 7-out.";
        if (isCrapsOut) return "Rolling 2, 3, or 12 on the come-out is called 'craps'. Pass Line and Come bets lose.";
        return "No winning bets resolved on this roll.";
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
                    style={{ background: "rgba(2,5,2,0.96)" }}
                    onClick={!isRolling ? onDismiss : undefined}
                >
                    {/* ── Monk background — static full scene, dice appear in front ── */}
                    <motion.img
                        src="/submissions/gimboz-craps/monk-throw.png"
                        alt=""
                        initial={{ opacity: 0, scale: 1.08 }}
                        animate={{ opacity: isRolling ? 0.7 : 0.35, scale: 1 }}
                        transition={{ duration: 0.35 }}
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                        style={{ mixBlendMode: "screen" }}
                    />

                    {/* ── Dice in foreground over monk background ── */}
                    <div className="relative z-10 flex flex-col items-center gap-4">
                    <div className="flex gap-8 items-center justify-center mb-4" style={{ perspective: 600 }}>
                        <Die3D
                            value={lastRoll ? lastRoll[0] : 1}
                            isRolling={isRolling}
                            glowing={isWin && !isRolling}
                            size={100}
                            delay={0}
                        />
                        <Die3D
                            value={lastRoll ? lastRoll[1] : 1}
                            isRolling={isRolling}
                            glowing={isWin && !isRolling}
                            size={100}
                            delay={90}
                        />
                    </div>

                    {/* Roll result */}
                    {lastRoll && !isRolling && (
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.15 }}
                            className="flex flex-col items-center gap-3 w-full max-w-sm px-6"
                        >
                            {/* Total */}
                            <span className="text-6xl font-black leading-none"
                                style={{ color: isNeutral ? "white" : isWin ? "#A8E10C" : "#ef4444" }}>
                                {lastRoll[0] + lastRoll[1]}
                            </span>

                            {/* Outcome — one line only. Image tiles handle the detail. */}
                            <p className="text-sm font-black uppercase tracking-widest text-center px-4"
                                style={{ color: isNeutral ? "white" : isWin ? "#A8E10C" : "#ef4444" }}>
                                {outcome.replace(/[🎲✅💀🙏⛪🔥✨🎯🌙]/g, '').trim()}
                            </p>
                            {/* Win payout — brief */}
                            {isWin && currentOutcome && currentOutcome.payout > 0 && (
                                <p className="text-xl font-black" style={{ color: "#A8E10C" }}>
                                    +{currentOutcome.payout.toLocaleString()} APE
                                </p>
                            )}

                            {/* Bonus event — big and dramatic */}
                            {bonusEvent !== "none" && (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: [1, 1.06, 1], opacity: 1 }}
                                    transition={{ repeat: Infinity, duration: 1.4 }}
                                    className="flex flex-col items-center gap-1 px-6 py-3 rounded-xl border-2 font-black"
                                    style={{
                                        borderColor: bonusEvent === "apesWill" ? "#FFD700" : "#F97316",
                                        color: bonusEvent === "apesWill" ? "#FFD700" : "#F97316",
                                        background: bonusEvent === "apesWill" ? "rgba(255,215,0,0.12)" : "rgba(249,115,22,0.1)",
                                        boxShadow: bonusEvent === "apesWill" ? "0 0 30px rgba(255,215,0,0.4)" : "0 0 20px rgba(249,115,22,0.3)",
                                    }}>
                                    <span className="text-2xl">
                                        {bonusEvent === "apesWill" ? "✨" : bonusEvent === "holySevens" ? "✨" : "🔥"}
                                    </span>
                                    <span className="text-xl tracking-widest uppercase">{BONUS_NAMES[bonusEvent]}</span>
                                    {bonusEvent === "apesWill" && (
                                        <span className="text-3xl">500×</span>
                                    )}
                                </motion.div>
                            )}

                            {/* Tap to continue */}
                            {!isRolling && (
                                <motion.p
                                    animate={{ opacity: [0.4, 1, 0.4] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                    className="text-[10px] text-white/30 uppercase tracking-widest mt-1">
                                    Tap to continue
                                </motion.p>
                            )}
                        </motion.div>
                    )}

                    {/* Rolling indicator */}
                    {isRolling && (
                        <motion.p
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ repeat: Infinity, duration: 0.5 }}
                            className="absolute bottom-16 text-sm text-[#A8E10C] font-black uppercase tracking-widest z-20">
                            Rolling...
                        </motion.p>
                    )}

                    {/* HUD removed from overlay — lives in sidebar only */}
                    </div>{/* end foreground z-10 */}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// ─── Bonus Banner ─────────────────────────────────────────────────────────────

const BonusBanner: React.FC<{ event: BonusEvent; multiplier: number }> = ({ event, multiplier }) => {
    if (event === "none") return null;
    const colors: Record<BonusEvent, string> = {
        none: "", blessing: "#A8E10C", cathedralRoll: "#FFD700", apesWill: "#FF4500", holySevens: "#00FFFF",
    };
    return (
        <motion.div
            initial={{ scale: 0, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: -20 }}
            className="absolute top-2 left-1/2 -translate-x-1/2 z-50 text-center px-4 py-2 rounded-lg border-2"
            style={{ backgroundColor: "rgba(0,0,0,0.92)", borderColor: colors[event], boxShadow: `0 0 20px ${colors[event]}` }}
        >
            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: colors[event] }}>
                {BONUS_NAMES[event]}
            </p>
            <p className="text-xl font-black" style={{ color: colors[event] }}>{multiplier}x MULTIPLIER</p>
        </motion.div>
    );
};

// ─── Main Window ──────────────────────────────────────────────────────────────

const GimbozCrapsWindow: React.FC<GimbozCrapsWindowProps> = ({
    game, gameState, isRolling, currentView,
    selectedChipValue, onBetPlace, pendingBets, onClearBet, onRoll, onCashOut,
    onBonusComplete, showDiceOverlay, onDismissOverlay, activeTile, onTileDismiss, bonusSessionPayout,
}) => {
    const {
        phase, point, rollHistory, lastRoll, bonusEvent,
        totalPayout, initialWagered, currentBonusMultiplier, gameOver, activeBets
    } = gameState;

    const [lastWinningBets, setLastWinningBets] = useState<BetType[]>([]);
    const prevRollCount = useRef(0);

    const currentOutcome = rollHistory.length > 0 ? rollHistory[rollHistory.length - 1] : null;
    const _ot = currentOutcome?.outcome ?? "";
    // Win = outcome text says the player won, regardless of specific prop payouts
    const isWinningRoll =
        _ot.includes("WINS") ||
        _ot.includes("NATURAL") ||
        _ot.includes("BLESSING") ||
        _ot.includes("CATHEDRAL") ||
        _ot.includes("HOLY") ||
        (_ot.includes("HIT") && !_ot.includes("HIT IT")); // "POINT 8 HIT" not "ROLL TO HIT IT"

    // When roll settles, track winning bet zones
    useEffect(() => {
        if (!isRolling && rollHistory.length > prevRollCount.current && currentOutcome) {
            const winBets = currentOutcome.betBreakdown?.map(b => {
                const map: Record<string, BetType> = {
                    "Pass Line": "passLine", "Don't Pass": "dontPass", "Come": "come",
                    "Field": "field", "Any Seven": "any7", "Any Craps": "anyCraps",
                    "Hard 4": "hard4", "Hard 6": "hard6", "Hard 8": "hard8", "Hard 10": "hard10",
                    "Pass Odds": "passOdds", "Place 4": "place4", "Place 5": "place5",
                    "Place 6": "place6", "Place 8": "place8", "Place 9": "place9", "Place 10": "place10",
                };
                return map[b.label];
            }).filter(Boolean) as BetType[] ?? [];
            setLastWinningBets(winBets);
        }
        prevRollCount.current = rollHistory.length;
    }, [isRolling, rollHistory.length]);

    // Win = pass line wins, point hit, or natural — regardless of whether specific prop bets paid
    const outcome_text = currentOutcome?.outcome ?? "";
    const isNetWin = outcome_text.includes("WINS") ||
        outcome_text.includes("NATURAL") ||
        outcome_text.includes("HIT") ||
        outcome_text.includes("BLESSING") ||
        outcome_text.includes("CATHEDRAL") ||
        outcome_text.includes("HOLY") ||
        (currentOutcome?.payout ?? 0) > 0 && !outcome_text.includes("SEVEN OUT") && !outcome_text.includes("CRAPS");

    const wagered = initialWagered || Object.values(pendingBets).reduce((a, b) => a + (b ?? 0), 0);

    return (
        <div
            className="absolute inset-0 z-0 flex flex-col text-white overflow-hidden"
            style={{ background: "radial-gradient(ellipse at center bottom, #050f05 0%, #020602 100%)" }}
        >
            {/* Atmospheric glow */}
            <div className="absolute inset-0 pointer-events-none"
                style={{ backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(168,225,12,0.025) 0%, transparent 50%)" }} />

            {/* Loss flash on seven-out */}
            {gameOver && totalPayout < wagered && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 0.3, 0] }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0 bg-red-950 pointer-events-none z-30" />
            )}

            {/* ── BONUS ROUND overlay ─────────────────────────────── */}
            <AnimatePresence>
                {/* ── Game Tiles — narrative pause moments ── */}
                {/* Bonus tiles show BEFORE the bonus round (they act as the dramatic intro) */}
                {activeTile && !showDiceOverlay && (
                    <GameTile
                        tile={activeTile}
                        onDismiss={onTileDismiss}
                    />
                )}

                {/* Bonus round shows only AFTER tile is dismissed */}
                {gameState.bonusRoundTriggered && !gameState.gameOver && !showDiceOverlay && !activeTile && (
                    <BonusRound
                        sessionPayout={bonusSessionPayout > 0 ? bonusSessionPayout : gameState.totalPayout}
                        reason={gameState.bonusRoundReason ?? "maxRolls"}
                        onComplete={onBonusComplete}
                    />
                )}
            </AnimatePresence>

            {/* Dice overlay — controlled by parent via showDiceOverlay prop */}
            <DiceOverlay
                isRolling={isRolling}
                lastRoll={lastRoll}
                currentOutcome={currentOutcome}
                bonusEvent={bonusEvent}
                bonusMultiplier={currentBonusMultiplier}
                isWin={isNetWin}
                show={showDiceOverlay && currentView === 1}
                onDismiss={onDismissOverlay}
                rollCount={rollHistory.length}
                streak={gameState.consecutivePointHits}
                maxRolls={MAX_ROLLS}
            />

            {/* ── SETUP VIEW ─────────────────────────────────────── */}
            {currentView === 0 && (
                <div className="absolute inset-0 p-1">
                    <div className="w-full h-full">
                        <GothicCrapsTable
                            point={null} phase="comeOut" bets={pendingBets}
                            selectedChipValue={selectedChipValue}
                            onBetPlace={onBetPlace} onClearBet={onClearBet} interactive={true}
                        />
                    </div>
                </div>
            )}

            {/* ── ONGOING VIEW ───────────────────────────────────── */}
            {currentView === 1 && (
                <div className="absolute inset-0">
                    {/* Craps table fills full window */}
                    <div className="absolute inset-0 w-full h-full">
                        <div className="absolute inset-0">
                            <GothicCrapsTable
                                point={point} phase={phase} bets={activeBets}
                                selectedChipValue={selectedChipValue}
                                onBetPlace={onBetPlace} onClearBet={onClearBet}
                                interactive={!isRolling && !gameOver}
                                winningZones={showDiceOverlay ? [] : lastWinningBets}
                                closeInfo={isRolling || showDiceOverlay}
                            />
                        </div>

                        {/* Point phase info now lives in sidebar only */}
                    </div>

                </div>
            )}

            {/* ── GAME OVER ──────────────────────────────────────── */}
            {currentView === 2 && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center"
                    style={{ background: "radial-gradient(ellipse at center, rgba(0,20,0,0.97) 0%, rgba(0,0,0,0.99) 100%)" }}>

                    {/* Game info — renders above the overlay */}
                    <div className="relative z-10 flex flex-col items-center gap-3 w-full px-2 text-center">
                    {totalPayout >= wagered ? (
                        // ── GREEN TILE — net profit or break even ─────────────
                        <>
                            {(() => {
                                const profit = totalPayout - wagered;
                                const mult = wagered > 0 ? (totalPayout / wagered) : 1;
                                const isHuge = profit > wagered * 10; // 10x+ = legendary
                                const isBig = profit > wagered * 2;   // 2x+ = big win
                                const emoji = isHuge ? "🏆" : isBig ? "🎉" : profit > 0 ? "✅" : "🤝";
                                const headline = isHuge ? `${mult.toFixed(0)}× MULTIPLIER!` : isBig ? "BIG WIN!" : profit > 0 ? "Winner!" : "Break Even";
                                return (
                                    <>
                                        <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 1.8 }}
                                            className="text-5xl">{emoji}</motion.div>
                                        <p className="text-2xl font-black uppercase tracking-widest"
                                            style={{ color: isHuge ? "#FFD700" : "#A8E10C" }}>{headline}</p>
                                    </>
                                );
                            })()}
                            <div className="rounded-xl px-6 py-4 max-w-sm w-full"
                                style={{ background: "rgba(168,225,12,0.12)", border: "2px solid #A8E10C", boxShadow: "0 0 24px rgba(168,225,12,0.25)" }}>
                                <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "#A8E10C" }}>
                                    {totalPayout > wagered ? "Net Profit" : "Break Even"}
                                </p>
                                <p className="text-4xl font-black" style={{ color: "#A8E10C" }}>
                                    {totalPayout > wagered ? `+${(totalPayout - wagered).toLocaleString()}` : "±0"} APE
                                </p>
                                <div className="border-t border-[#A8E10C]/20 mt-2 pt-2 flex flex-col gap-1">
                                    <div className="flex justify-between text-xs text-white/50">
                                        <span>Wagered</span><span>{wagered.toLocaleString()} APE</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-white/50">
                                        <span>Collected</span><span className="font-bold" style={{color:"#A8E10C"}}>{totalPayout.toLocaleString()} APE</span>
                                    </div>
                                </div>
                            </div>
                            {lastRoll && (
                                <div className="flex gap-6" style={{ perspective: 400 }}>
                                    <Die3D value={lastRoll[0]} isRolling={false} glowing size={64} />
                                    <Die3D value={lastRoll[1]} isRolling={false} glowing size={64} />
                                </div>
                            )}
                        </>
                    ) : (
                        // ── RED TILE — total payout < wagered ────────────────
                        <>
                            <div className="text-5xl">💀</div>
                            <div className="rounded-xl px-6 py-4 max-w-sm w-full"
                                style={{ background: "rgba(239,68,68,0.1)", border: "2px solid #ef4444", boxShadow: "0 0 20px rgba(239,68,68,0.2)" }}>
                                <p className="text-xs font-black uppercase tracking-widest mb-2 text-red-400">
                                    Net Loss
                                </p>
                                <p className="text-4xl font-black text-red-400">
                                    -{(wagered - totalPayout).toLocaleString()} APE
                                </p>
                                {/* How game ended */}
                                <p className="text-[10px] text-white/50 mt-1.5 leading-snug">
                                    {lastRoll && `Rolled ${lastRoll[0]}+${lastRoll[1]}=${lastRoll[0]+lastRoll[1]} — `}
                                    {currentOutcome?.outcome?.replace(/[🎲✅💀🙏⛪🔥✨🎯🌙]/g,'').trim() ?? "Game over"}
                                </p>
                                <div className="border-t border-red-400/20 mt-2 pt-2 flex flex-col gap-1">
                                    <div className="flex justify-between text-xs text-white/50">
                                        <span>Wagered</span><span>{wagered.toLocaleString()} APE</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-white/50">
                                        <span>Recovered</span><span className="text-red-400 font-bold">{totalPayout.toLocaleString()} APE</span>
                                    </div>
                                </div>
                            </div>
                            {lastRoll && (
                                <div className="flex gap-6 opacity-50" style={{ perspective: 400 }}>
                                    <Die3D value={lastRoll[0]} isRolling={false} size={64} />
                                    <Die3D value={lastRoll[1]} isRolling={false} size={64} />
                                </div>
                            )}
                        </>
                    )}

                    {bonusEvent !== "none" && (
                        <p className="text-xs text-yellow-400 font-black">{BONUS_NAMES[bonusEvent]} — {currentBonusMultiplier}x Applied!</p>
                    )}
                    <p className="text-[10px] text-white/25">{gameState.rollHistory.length} roll{gameState.rollHistory.length !== 1 ? "s" : ""} this session</p>
                    </div>{/* end z-10 game info wrapper */}
                </motion.div>
            )}
        </div>
    );
};

export default GimbozCrapsWindow;
