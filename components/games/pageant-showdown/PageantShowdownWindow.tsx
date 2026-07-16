"use client";

import React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import useSound from "use-sound";
import { Game } from "@/lib/games";
import { PageantSide } from "./pageantShowdownConfig";
import { KodaEntry } from "./kodaPool";

interface PageantShowdownWindowProps {
    game: Game;
    chosenSide: PageantSide | null;
    outcome: PageantSide | null;
    isRevealing: boolean;
    gameCompleted: boolean;
    betAmount: number;
    payoutAmount: number;
    leftKoda: KodaEntry;
    rightKoda: KodaEntry;
}

const CONFETTI_COLORS = ["#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#a78bfa", "#f87171"];

const PageantShowdownWindow: React.FC<PageantShowdownWindowProps> = ({
    game,
    chosenSide,
    outcome,
    isRevealing,
    gameCompleted,
    betAmount,
    payoutAmount,
    leftKoda,
    rightKoda,
}) => {
    const muteSfx = false;
    const sfxVolume = 0.5;

    const [winSFX] = useSound("/submissions/pageant-showdown/sfx/win.mp3", {
        volume: sfxVolume,
        soundEnabled: !muteSfx,
        interrupt: true,
    });
    const [loseSFX] = useSound("/submissions/pageant-showdown/sfx/lose.mp3", {
        volume: sfxVolume,
        soundEnabled: !muteSfx,
        interrupt: true,
    });
    const [flipSFX] = useSound("/submissions/pageant-showdown/sfx/flip.mp3", {
        volume: sfxVolume,
        soundEnabled: !muteSfx,
        interrupt: true,
    });

    React.useEffect(() => {
        if (isRevealing) flipSFX();
    }, [isRevealing, flipSFX]);

    React.useEffect(() => {
        if (gameCompleted) {
            const won = payoutAmount > 0;
            if (won) winSFX();
            else loseSFX();
        }
    }, [gameCompleted, payoutAmount, winSFX, loseSFX]);

    const playerWon = gameCompleted && chosenSide !== null && outcome === chosenSide;
    const winnerLabel = outcome === "left" ? "LEFT KODA WINS!" : outcome === "right" ? "RIGHT KODA WINS!" : "";

    return (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center text-white bg-gradient-to-b from-[#1a1030]/70 via-[#120a24]/60 to-[#0a0614]/80 overflow-hidden">
            {!gameCompleted && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 text-center px-4">
                    <p className="text-xs tracking-[0.2em] uppercase text-amber-300/80">Who wins this</p>
                    <p className="text-lg sm:text-xl font-bold text-amber-100">Koda Pageant?</p>
                </div>
            )}

            {gameCompleted && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 text-center px-4">
                    <p className="text-xs sm:text-sm tracking-[0.15em] uppercase text-amber-300 font-bold">
                        The Judge Has Spoken
                    </p>
                    <p className="text-lg sm:text-2xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">
                        {winnerLabel}
                    </p>
                </div>
            )}

            <AnimatePresence>
                {gameCompleted && playerWon && <ConfettiBurst />}
                {gameCompleted && !playerWon && <BooBubbles />}
            </AnimatePresence>

            <div className="relative flex items-center justify-center gap-3 sm:gap-6 w-full h-full px-6 pt-16 pb-16">
                <PageantPortrait
                    side="left"
                    imageSrc={leftKoda.image}
                    tokenId={leftKoda.id}
                    isChosen={chosenSide === "left"}
                    isRevealing={isRevealing}
                    isWinner={gameCompleted && outcome === "left"}
                    isWrongPick={gameCompleted && chosenSide === "left" && outcome !== "left"}
                />

                <div className="flex flex-col items-center justify-center z-10 shrink-0">
                    <span className="text-2xl sm:text-3xl font-black text-amber-200/90 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">
                        VS
                    </span>
                </div>

                <PageantPortrait
                    side="right"
                    imageSrc={rightKoda.image}
                    tokenId={rightKoda.id}
                    isChosen={chosenSide === "right"}
                    isRevealing={isRevealing}
                    isWinner={gameCompleted && outcome === "right"}
                    isWrongPick={gameCompleted && chosenSide === "right" && outcome !== "right"}
                />

                <AnimatePresence>
                    {gameCompleted && (
                        <motion.div
                            initial={{ opacity: 0, x: 20, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                            className="absolute right-2 sm:right-4 bottom-2 w-[90px] sm:w-[130px] z-20"
                        >
                            <Image
                                src="/submissions/pageant-showdown/judge.png"
                                alt="The judge"
                                width={260}
                                height={260}
                                unoptimized
                                className="w-full h-auto drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {gameCompleted && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-center"
                    >
                        <span
                            className={
                                playerWon
                                    ? "inline-block px-3 py-1.5 rounded-md bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 font-semibold text-sm"
                                    : "inline-block px-3 py-1.5 rounded-md bg-white/5 border border-white/15 text-white/60 font-medium text-sm"
                            }
                        >
                            {playerWon ? "A flawless performance!" : "Not the crowd's favorite…"}
                        </span>
                        <p className={`mt-1 text-xs ${playerWon ? "text-emerald-300/80" : "text-red-300/70"}`}>
                            {playerWon ? `+${payoutAmount.toFixed(2)}` : `-${betAmount.toFixed(2)}`}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

interface PageantPortraitProps {
    side: PageantSide;
    imageSrc: string;
    tokenId: number;
    isChosen: boolean;
    isRevealing: boolean;
    isWinner: boolean;
    isWrongPick: boolean;
}

const PageantPortrait: React.FC<PageantPortraitProps> = ({
    imageSrc,
    tokenId,
    isChosen,
    isRevealing,
    isWinner,
    isWrongPick,
}) => {
    const borderColor = isWinner ? "#22c55e" : isWrongPick ? "#ef4444" : "#2A3640";
    const glow = isWinner
        ? "0 0 20px rgba(34,197,94,0.5)"
        : isWrongPick
        ? "0 0 16px rgba(239,68,68,0.45)"
        : "none";

    return (
        <motion.div
            className="relative w-[38%] max-w-[220px] aspect-square rounded-xl overflow-hidden border-4"
            style={{ borderColor, boxShadow: glow }}
            animate={
                isRevealing
                    ? { rotateY: [0, 180, 360], opacity: [1, 0.6, 1] }
                    : { rotateY: 0 }
            }
            transition={isRevealing ? { duration: 1.6, ease: "easeInOut" } : { duration: 0.3 }}
        >
            <Image
                src={imageSrc}
                alt={`Koda #${tokenId}`}
                fill
                unoptimized
                className="object-cover"
            />
            <div className="absolute bottom-1 left-1 bg-black/60 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                #{tokenId}
            </div>
            {isChosen && (
                <div className="absolute top-1 right-1 bg-blue-500/90 text-[10px] font-bold px-1.5 py-0.5 rounded">
                    YOUR PICK
                </div>
            )}
        </motion.div>
    );
};

const ConfettiBurst: React.FC = () => {
    const pieces = React.useMemo(
        () =>
            Array.from({ length: 28 }, (_, i) => ({
                id: i,
                left: Math.random() * 100,
                delay: Math.random() * 0.4,
                duration: 1.4 + Math.random() * 0.8,
                color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                rotate: Math.random() * 360,
                size: 5 + Math.random() * 5,
            })),
        []
    );

    return (
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
            {pieces.map((p) => (
                <motion.div
                    key={p.id}
                    initial={{ y: -20, x: 0, opacity: 1, rotate: 0 }}
                    animate={{ y: 420, opacity: [1, 1, 0], rotate: p.rotate }}
                    transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
                    style={{
                        position: "absolute",
                        left: `${p.left}%`,
                        top: 0,
                        width: p.size,
                        height: p.size * 1.6,
                        backgroundColor: p.color,
                        borderRadius: 1,
                    }}
                />
            ))}
        </div>
    );
};

const BooBubbles: React.FC = () => {
    const bubbles = [
        { left: "8%", top: "30%", delay: 0 },
        { left: "18%", top: "55%", delay: 0.15 },
        { left: "85%", top: "20%", delay: 0.3 },
    ];
    return (
        <div className="absolute inset-0 z-10 pointer-events-none">
            {bubbles.map((b, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, delay: b.delay }}
                    className="absolute bg-purple-900/80 border border-purple-400/40 text-purple-100 text-[11px] font-bold px-2 py-1 rounded-lg"
                    style={{ left: b.left, top: b.top }}
                >
                    BOO!
                </motion.div>
            ))}
        </div>
    );
};

export default PageantShowdownWindow;
