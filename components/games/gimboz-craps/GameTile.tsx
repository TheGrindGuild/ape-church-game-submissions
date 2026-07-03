"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
export type TileType =
    | "welcome"
    | "naturalWin"
    | "pointHit"
    | "sevenOut"
    | "crapsOut"
    | "bonusStreak"
    | "bonusMaxRolls";

export interface TileData {
    type: TileType;
    pointNumber?: number;
    rollTotal?: number;
    d1?: number; d2?: number;
    payout?: number;
    netPnl?: number;
    wagered?: number;
    streak?: number;
    rollCount?: number;
}

interface GameTileProps {
    tile: TileData | null;
    onDismiss: () => void;
}

const G    = "#A8E10C";
const GOLD = "#FFD700";

// ─── Image-backed tile wrapper ─────────────────────────────────────────────────
// Shows a full-bleed image, overlays dynamic content at bottom

const ImageTile: React.FC<{
    src: string;
    onDismiss: () => void;
    autoDismissMs?: number;
    children?: React.ReactNode;
    tapToContinue?: boolean;
    childrenPosition?: "bottom" | "top"; // where to pin the overlay
}> = ({ src, onDismiss, autoDismissMs, children, tapToContinue = true, childrenPosition = "bottom" }) => {

    React.useEffect(() => {
        if (!autoDismissMs) return;
        const t = setTimeout(onDismiss, autoDismissMs);
        return () => clearTimeout(t);
    }, [autoDismissMs, onDismiss]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 z-50"
            style={{ cursor: tapToContinue ? "pointer" : "default" }}
            onClick={tapToContinue ? onDismiss : undefined}
        >
            {/* Dark casino green background fills entire tile behind the image */}
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, #0e2210 0%, #050e06 100%)" }} />
            <img
                src={src}
                alt=""
                className="absolute inset-0 w-full h-full pointer-events-none select-none"
                style={{ objectFit: "contain", objectPosition: "center center" }}
            />

            {/* Dynamic overlay content */}
            {children && (
                <div
                    className={`absolute ${childrenPosition === "top" ? "top-0" : "bottom-0"} left-0 right-0 flex flex-col items-center gap-2 px-6 ${childrenPosition === "top" ? "pt-3 pb-2" : "pb-4 pt-3"}`}
                    style={{
                        background: childrenPosition === "top"
                            ? "linear-gradient(to bottom, rgba(0,0,0,0.7) 60%, transparent)"
                            : "linear-gradient(to top, rgba(0,0,0,0.75) 60%, transparent)"
                    }}
                    onClick={e => e.stopPropagation()}>
                    {children}
                </div>
            )}

            {/* Tap hint */}
            {tapToContinue && !children && (
                <motion.p
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.8 }}
                    className="absolute bottom-4 left-0 right-0 text-center text-[10px] uppercase tracking-widest text-white/40">
                    Tap to continue
                </motion.p>
            )}
        </motion.div>
    );
};

// ─── PayoutBadge — reusable payout display ────────────────────────────────────
const PayoutBadge: React.FC<{ payout: number; color?: string }> = ({ payout, color = G }) => (
    <div className="px-5 py-1.5 rounded-full font-black text-xl"
        style={{ background: `${color}22`, border: `1.5px solid ${color}`, color }}>
        +{payout.toLocaleString()} APE
    </div>
);

// ─── PnLBadge ─────────────────────────────────────────────────────────────────
const PnLBadge: React.FC<{ netPnl: number; wagered: number }> = ({ netPnl, wagered }) => {
    const isWin = netPnl >= 0;
    return (
        <div className="flex gap-4 text-xs text-white/60">
            <span>Wagered: {wagered.toLocaleString()} APE</span>
            <span className="font-bold" style={{ color: isWin ? G : "#ef4444" }}>
                Net: {isWin ? "+" : ""}{netPnl.toLocaleString()} APE
            </span>
        </div>
    );
};

// ─── Individual tiles ─────────────────────────────────────────────────────────

const WelcomeTile: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 z-50"
    >
        <img src="/submissions/gimboz-craps/welcome-tile.webp" alt=""
            className="absolute inset-0 w-full h-full pointer-events-none select-none"
            style={{ objectFit: "cover", objectPosition: "center top" }} />
        {/* Transparent button overlaid on the gold oval — positioned at 0% from bottom, 11% tall */}
        <button
            onClick={onDismiss}
            className="absolute flex items-center justify-center font-black uppercase tracking-widest"
            style={{
                bottom: "-0.25%", left: "12%", right: "12%", height: "11%",
                cursor: "pointer", background: "transparent", border: "none",
                color: "#3d1a00", fontSize: "clamp(16px, 2.5vw, 24px)", letterSpacing: "0.15em",
            }}>
            ROLL THE DICE
        </button>
    </motion.div>
);

const NaturalWinTile: React.FC<{ payout: number; onDismiss: () => void }> = ({ payout, onDismiss }) => (
    <ImageTile src="/submissions/gimboz-craps/tile-natural-win.webp" onDismiss={onDismiss} autoDismissMs={2000}>
        {payout > 0 && <PayoutBadge payout={payout} color={GOLD} />}
    </ImageTile>
);

const PointHitTile: React.FC<{ point: number; payout: number; streak: number; onDismiss: () => void }> = ({
    point, payout, streak, onDismiss
}) => {
    const streakColor = streak >= 3 ? "#F97316" : G;
    return (
        <ImageTile src="/submissions/gimboz-craps/tile-point-hit.webp" onDismiss={onDismiss} autoDismissMs={2200}>
            {/* Streak counter */}
            {streak > 0 && (
                <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="text-lg font-black uppercase tracking-widest"
                    style={{ color: streakColor }}>
                    {"🔥".repeat(Math.min(streak, 4))} {streak} IN A ROW
                    {streak === 3 && " — ONE MORE FOR BONUS!"}
                </motion.div>
            )}
            {payout > 0 && <PayoutBadge payout={payout} />}
        </ImageTile>
    );
};

const SevenOutTile: React.FC<{
    netPnl: number; wagered: number; onDismiss: () => void;
}> = ({ netPnl, wagered, onDismiss }) => (
    <ImageTile src="/submissions/gimboz-craps/tile-seven-out.webp" onDismiss={onDismiss} tapToContinue={false}>
        <PnLBadge netPnl={netPnl} wagered={wagered} />
        <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={onDismiss}
            className="w-full max-w-xs py-2.5 rounded-xl font-black uppercase tracking-widest text-sm"
            style={{ background: "rgba(239,68,68,0.2)", border: "1.5px solid #ef4444", color: "#ef4444" }}>
            View Results
        </motion.button>
    </ImageTile>
);

const CrapsOutTile: React.FC<{
    netPnl: number; wagered: number; onDismiss: () => void;
}> = ({ netPnl, wagered, onDismiss }) => (
    <ImageTile src="/submissions/gimboz-craps/tile-craps-out.webp" onDismiss={onDismiss} tapToContinue={false}>
        <PnLBadge netPnl={netPnl} wagered={wagered} />
        <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={onDismiss}
            className="w-full max-w-xs py-2.5 rounded-xl font-black uppercase tracking-widest text-sm"
            style={{ background: "rgba(239,68,68,0.2)", border: "1.5px solid #ef4444", color: "#ef4444" }}>
            View Results
        </motion.button>
    </ImageTile>
);

// Bonus tiles: pure cinematic splash — no buttons, auto-dismisses after 2.5s
const BonusStreakTile: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => (
    <ImageTile src="/submissions/gimboz-craps/tile-sacred-trial.webp" onDismiss={onDismiss} tapToContinue={false} autoDismissMs={2500} />
);

const BonusMaxRollsTile: React.FC<{ rollCount: number; onDismiss: () => void }> = ({ rollCount, onDismiss }) => (
    <ImageTile src="/submissions/gimboz-craps/tile-cursed-trial.webp" onDismiss={onDismiss} tapToContinue={false} autoDismissMs={2500} />
);

// ─── Main export ──────────────────────────────────────────────────────────────

const GameTile: React.FC<GameTileProps> = ({ tile, onDismiss }) => {
    if (!tile) return null;

    return (
        <AnimatePresence mode="wait">
            <React.Fragment key={tile.type + (tile.pointNumber ?? "") + (tile.rollTotal ?? "")}>
                {tile.type === "welcome" && (
                    <WelcomeTile onDismiss={onDismiss} />
                )}
                {tile.type === "naturalWin" && (
                    <NaturalWinTile payout={tile.payout ?? 0} onDismiss={onDismiss} />
                )}
                {tile.type === "pointHit" && tile.pointNumber != null && (
                    <PointHitTile
                        point={tile.pointNumber}
                        payout={tile.payout ?? 0}
                        streak={tile.streak ?? 1}
                        onDismiss={onDismiss}
                    />
                )}
                {tile.type === "sevenOut" && (
                    <SevenOutTile
                        netPnl={tile.netPnl ?? 0}
                        wagered={tile.wagered ?? 0}
                        onDismiss={onDismiss}
                    />
                )}
                {tile.type === "crapsOut" && (
                    <CrapsOutTile
                        netPnl={tile.netPnl ?? 0}
                        wagered={tile.wagered ?? 0}
                        onDismiss={onDismiss}
                    />
                )}
                {tile.type === "bonusStreak" && (
                    <BonusStreakTile onDismiss={onDismiss} />
                )}
                {tile.type === "bonusMaxRolls" && (
                    <BonusMaxRollsTile rollCount={tile.rollCount ?? 13} onDismiss={onDismiss} />
                )}
            </React.Fragment>
        </AnimatePresence>
    );
};

export default GameTile;
