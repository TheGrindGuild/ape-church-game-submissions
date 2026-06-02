"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useSound from "use-sound";
import { Game } from "@/lib/games";
import { FROG_ANCHOR_SLOT, VISIBLE_PAD_COUNT } from "./swampHopConfig";
import { HopResult, PAD_LABELS, PadType } from "./swampHopLogic";
import SpriteSheetAnimation from "./SpriteSheetAnimation";
import SwampHopRunStats from "./SwampHopRunStats";
import {
    FroglingAnimationName,
    PAD_IMAGE_SHORE,
    PAD_IMAGE_UNKNOWN,
    PAD_IMAGES,
} from "./swampHopSprites";

/** Matches SwampHop hop timeout and motion duration. */
export const HOP_MOTION_DURATION_S = 0.7;

interface SwampHopWindowProps {
    game: Game;
    isHopping: boolean;
    currentHopIndex: number;
    maxHops: number;
    gameCompleted: boolean;
    hopHistory: (HopResult | null)[];
    lastHopResult: HopResult | null;
    betAmount: number;
    payoutAmount: number;
    currentBank: number;
    currentMultiplier: number;
    cashedOut: boolean;
}

function getPadImageSrc(
    globalIndex: number,
    padType: number | null,
    isFuture: boolean
): string {
    if (isFuture) {
        return PAD_IMAGE_UNKNOWN;
    }
    if (globalIndex === 0 && padType == null) {
        return PAD_IMAGE_SHORE;
    }
    if (padType != null && PAD_IMAGES[padType]) {
        return PAD_IMAGES[padType];
    }
    return PAD_IMAGE_UNKNOWN;
}

function getPadLabel(
    globalIndex: number,
    padType: number | null,
    isFuture: boolean
): string {
    if (isFuture) {
        return "Ahead";
    }
    if (padType != null) {
        return PAD_LABELS[padType as PadType];
    }
    if (globalIndex === 0) {
        return "Shore";
    }
    return "Pad";
}

const SwampHopWindow: React.FC<SwampHopWindowProps> = ({
    isHopping,
    currentHopIndex,
    maxHops,
    gameCompleted,
    hopHistory,
    lastHopResult,
    betAmount,
    payoutAmount,
    currentBank,
    currentMultiplier,
    cashedOut,
}) => {
    const muteSfx = false;
    const sfxVolume = 0.5;

    const [winSFX] = useSound("/submissions/swamp-hop/sfx/win.mp3", {
        volume: sfxVolume,
        soundEnabled: !muteSfx,
        interrupt: true,
    });
    const [loseSFX] = useSound("/submissions/swamp-hop/sfx/lose.mp3", {
        volume: sfxVolume,
        soundEnabled: !muteSfx,
        interrupt: true,
    });
    const [hopSFX] = useSound("/submissions/swamp-hop/sfx/hop.mp3", {
        volume: sfxVolume * 0.6,
        soundEnabled: !muteSfx,
        interrupt: true,
    });

    const [showOutcome, setShowOutcome] = useState(false);
    const [frogAnimation, setFrogAnimation] =
        useState<FroglingAnimationName>("idle");

    /** Shore + one slot per hop (e.g. 1 hop → shore + landing pad). */
    const padCount = maxHops + 1;

    const frogGlobalIndex = isHopping
        ? Math.min(currentHopIndex + 1, maxHops)
        : Math.min(currentHopIndex, maxHops);

    /** Pad the frog stands on; during a hop he launches from the pad he is leaving. */
    const frogPadIndex = isHopping
        ? Math.min(currentHopIndex, maxHops)
        : frogGlobalIndex;

    const frogColumn = Math.min(frogGlobalIndex, FROG_ANCHOR_SLOT);

    const padWorldScrollRef = useRef<HTMLDivElement>(null);
    const [padStepPx, setPadStepPx] = useState(0);

    useLayoutEffect(() => {
        const root = padWorldScrollRef.current;
        if (!root) {
            return undefined;
        }

        const measure = () => {
            const unit = root.querySelector(".swamp-hop-pad-unit");
            setPadStepPx(
                unit ? unit.getBoundingClientRect().width : 0
            );
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(root);
        return () => observer.disconnect();
    }, [padCount]);

    /** Align pad under frog: shift world so pad[frogGlobalIndex] sits at frogColumn. */
    const worldTranslatePercent =
        padCount > 0
            ? -((frogGlobalIndex - frogColumn) / padCount) * 100
            : 0;

    const allPads = useMemo(() => {
        return Array.from({ length: padCount }, (_, globalIndex) => {
            const historyHop = hopHistory[globalIndex] ?? null;
            const isCurrent = globalIndex === frogGlobalIndex;
            const isPast = globalIndex < currentHopIndex;
            const isFuture = globalIndex > frogGlobalIndex;

            return {
                globalIndex,
                padType: historyHop?.padType ?? null,
                isCurrent,
                isPast,
                isFuture,
            };
        });
    }, [padCount, frogGlobalIndex, currentHopIndex, hopHistory]);

    useEffect(() => {
        if (!isHopping) {
            return;
        }
        hopSFX();
        queueMicrotask(() => setFrogAnimation("hop"));
    }, [isHopping, hopSFX]);

    useEffect(() => {
        if (lastHopResult == null || isHopping) {
            return;
        }

        queueMicrotask(() => {
            setShowOutcome(true);

            if (lastHopResult.isCroc) {
                setFrogAnimation("fall");
            } else if (lastHopResult.isShrine) {
                setFrogAnimation("celebrate");
            } else if (lastHopResult.padType === 0) {
                setFrogAnimation("slash");
            } else if (lastHopResult.padType === 2) {
                setFrogAnimation("wobble");
            } else {
                setFrogAnimation("idle");
            }
        });

        const timer = window.setTimeout(() => setShowOutcome(false), 1400);
        return () => window.clearTimeout(timer);
    }, [lastHopResult, isHopping]);

    useEffect(() => {
        if (!gameCompleted || betAmount <= 0) {
            return;
        }

        const multiplier = payoutAmount / betAmount;
        if (multiplier >= 1) {
            winSFX();
            if (!lastHopResult?.isCroc) {
                queueMicrotask(() => setFrogAnimation("celebrate"));
            }
        } else {
            loseSFX();
        }
    }, [gameCompleted, betAmount, payoutAmount, lastHopResult, winSFX, loseSFX]);

    useEffect(() => {
        if (isHopping || frogAnimation === "idle" || frogAnimation === "fall") {
            return undefined;
        }

        const timer = window.setTimeout(() => setFrogAnimation("idle"), 1100);
        return () => window.clearTimeout(timer);
    }, [frogAnimation, isHopping]);

    const hopTransition = {
        duration: isHopping ? HOP_MOTION_DURATION_S : 0.45,
        ease: [0.25, 0.1, 0.25, 1] as const,
    };

    const hopTravelPx =
        padStepPx > 0
            ? padStepPx * Math.max(1, frogGlobalIndex - currentHopIndex)
            : 0;

    const frogMotionAnimate = isHopping
        ? {
              x: [0, hopTravelPx, hopTravelPx],
              y: [0, -48, 0],
          }
        : frogAnimation === "fall"
          ? { x: 0, y: [0, 20, 50], opacity: [1, 1, 0.3] }
          : { x: 0, y: 0, opacity: 1 };

    const frogMotionDuration = isHopping
        ? HOP_MOTION_DURATION_S
        : frogAnimation === "fall"
          ? 0.7
          : 0.45;

    return (
        <div className="swamp-hop-viewport absolute inset-0 z-10 overflow-hidden text-white pointer-events-none">
            {!gameCompleted && (
                <SwampHopRunStats
                    currentBank={currentBank}
                    currentMultiplier={currentMultiplier}
                    currentHopIndex={currentHopIndex}
                    maxHops={maxHops}
                />
            )}

            <div className="swamp-hop-playfield">
                <div className="swamp-hop-path">
                    <div
                        className="swamp-hop-pad-stage"
                        style={
                            {
                                "--pad-count": padCount,
                                "--visible-pads": VISIBLE_PAD_COUNT,
                            } as React.CSSProperties
                        }
                    >
                        <div className="swamp-hop-pad-viewport">
                        <div
                            ref={padWorldScrollRef}
                            className="swamp-hop-pad-world-scroll"
                        >
                        <motion.div
                            className="swamp-hop-pad-world"
                            initial={false}
                            animate={{ x: `${worldTranslatePercent}%` }}
                            transition={hopTransition}
                        >
                            {allPads.map((pad) => {
                                const src = getPadImageSrc(
                                    pad.globalIndex,
                                    pad.padType,
                                    pad.isFuture
                                );
                                const opacity = pad.isPast
                                    ? 0.55
                                    : pad.isFuture
                                      ? 0.4
                                      : 1;

                                return (
                                    <div
                                        key={pad.globalIndex}
                                        className="swamp-hop-pad-unit"
                                        style={{ opacity }}
                                    >
                                        <div className="swamp-hop-pad-surface">
                                            <motion.div
                                                animate={
                                                    pad.isCurrent &&
                                                    frogAnimation === "wobble"
                                                        ? {
                                                              rotate: [
                                                                  -4, 4, -2, 0,
                                                              ],
                                                          }
                                                        : { rotate: 0 }
                                                }
                                                transition={{ duration: 0.4 }}
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={src}
                                                    alt=""
                                                    className={`swamp-hop-pad-img ${
                                                        pad.isCurrent
                                                            ? "current"
                                                            : ""
                                                    }`}
                                                    draggable={false}
                                                />
                                            </motion.div>
                                            {pad.globalIndex ===
                                                frogPadIndex &&
                                                !gameCompleted && (
                                                    <div className="swamp-hop-frog-slot">
                                                        <motion.div
                                                            className="swamp-hop-frog-motion"
                                                            initial={false}
                                                            animate={
                                                                frogMotionAnimate
                                                            }
                                                            transition={{
                                                                duration:
                                                                    frogMotionDuration,
                                                                ease: hopTransition.ease,
                                                            }}
                                                            key={`frog-hop-${currentHopIndex}`}
                                                        >
                                                            <SpriteSheetAnimation
                                                                animation={
                                                                    frogAnimation
                                                                }
                                                                play={
                                                                    !gameCompleted
                                                                }
                                                                restartKey={
                                                                    currentHopIndex
                                                                }
                                                                alt="Frogling"
                                                            />
                                                        </motion.div>
                                                    </div>
                                                )}
                                        </div>
                                        <span className="swamp-hop-pad-label">
                                            {getPadLabel(
                                                pad.globalIndex,
                                                pad.padType,
                                                pad.isFuture
                                            )}
                                        </span>
                                    </div>
                                );
                            })}
                        </motion.div>
                        </div>
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showOutcome && lastHopResult != null && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="swamp-hop-outcome"
                    >
                        {lastHopResult.isCroc ? (
                            <>
                                <p className="text-[#ff7b7b] font-semibold">
                                    Croc snap!
                                </p>
                                <p className="text-[#ff9a9a] text-sm mt-1">
                                    Lost your bet
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-[#d4a017] font-semibold">
                                    {PAD_LABELS[lastHopResult.padType]}
                                </p>
                                {currentBank > betAmount && betAmount > 0 && (
                                    <p className="text-[#8fd98a] text-sm mt-1 font-semibold">
                                        +{(currentBank - betAmount).toFixed(2)}{" "}
                                        APE
                                    </p>
                                )}
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {cashedOut && (
                <div className="swamp-hop-outcome swamp-hop-outcome-cashout">
                    <p className="text-[#8fd98a] font-semibold text-sm">
                        Cashed out!
                    </p>
                </div>
            )}
        </div>
    );
};

export default SwampHopWindow;
