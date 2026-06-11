"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Hex } from "viem";
import {
    LUMA_BONUS_CONFIG,
    LumaChoiceId,
} from "./swampHopConfig";
import {
    LumaBonusRecord,
    LumaBonusResult,
    resolveLumaBonusOutcome,
} from "./swampHopLogic";

interface LumaShrineBonusRoundProps {
    gameId: bigint;
    userRandomWord: Hex;
    hopIndex: number;
    currentBank: number;
    replayRecord?: LumaBonusRecord | null;
    onComplete: (choiceId: LumaChoiceId, result: LumaBonusResult) => void;
}

const LUMA_IMAGES: Record<LumaChoiceId, string> = {
    safe: "/submissions/swamp-hop/luma/safe.png",
    wild: "/submissions/swamp-hop/luma/wild.png",
    ancient: "/submissions/swamp-hop/luma/ancient.png",
};

const REVEAL_DELAY_MS = 500;
const RESULT_DISPLAY_MS = 900;

const LumaShrineBonusRound: React.FC<LumaShrineBonusRoundProps> = ({
    gameId,
    userRandomWord,
    hopIndex,
    currentBank,
    replayRecord = null,
    onComplete,
}) => {
    const [selectedChoice, setSelectedChoice] = useState<LumaChoiceId | null>(
        replayRecord?.choiceId ?? null
    );
    const [result, setResult] = useState<LumaBonusResult | null>(
        replayRecord
            ? {
                  factor: replayRecord.factor,
                  label: replayRecord.label,
              }
            : null
    );
    const [revealed, setRevealed] = useState(replayRecord != null);

    useEffect(() => {
        if (replayRecord == null || selectedChoice == null || result == null) {
            return;
        }

        const timer = window.setTimeout(() => setRevealed(true), 200);
        return () => window.clearTimeout(timer);
    }, [replayRecord, selectedChoice, result]);

    useEffect(() => {
        if (!revealed || selectedChoice == null || result == null) {
            return;
        }

        const timer = window.setTimeout(() => {
            onComplete(selectedChoice, result);
        }, RESULT_DISPLAY_MS);

        return () => window.clearTimeout(timer);
    }, [revealed, selectedChoice, result, onComplete]);

    const handlePick = (choiceId: LumaChoiceId) => {
        if (selectedChoice != null) {
            return;
        }

        const resolved = resolveLumaBonusOutcome(
            gameId,
            userRandomWord,
            hopIndex,
            choiceId
        );
        setSelectedChoice(choiceId);
        setResult(resolved);
        window.setTimeout(() => setRevealed(true), REVEAL_DELAY_MS);
    };

    const selectedLabel =
        LUMA_BONUS_CONFIG.choices.find((c) => c.id === selectedChoice)?.label ??
        "";

    return (
        <div className="luma-shrine-overlay">
            <div className="luma-shrine-glow" aria-hidden />
            <div className="luma-shrine-panel">
                <p className="luma-shrine-title">Luma Shrine Bonus</p>
                <p className="luma-shrine-subtitle">Tap a Luma to choose</p>
                <div className="luma-shrine-bank">
                    <p className="luma-shrine-bank-label">Bank</p>
                    <p className="luma-shrine-bank-value">
                        {currentBank.toLocaleString([], {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}{" "}
                        APE
                    </p>
                </div>

                <div className="luma-shrine-choices">
                    {LUMA_BONUS_CONFIG.choices.map((choice) => {
                        const isSelected = selectedChoice === choice.id;
                        const isDimmed =
                            selectedChoice != null && !isSelected;

                        return (
                            <button
                                key={choice.id}
                                type="button"
                                className={`luma-shrine-choice luma-choice-${choice.id} ${
                                    isSelected ? "luma-shrine-choice-selected" : ""
                                } ${isDimmed ? "luma-shrine-choice-dimmed" : ""}`}
                                onClick={() => handlePick(choice.id)}
                                disabled={selectedChoice != null}
                                aria-label={choice.label}
                            >
                                <Image
                                    src={LUMA_IMAGES[choice.id]}
                                    alt={choice.label}
                                    width={72}
                                    height={72}
                                    className="luma-shrine-icon"
                                    priority
                                />
                                <span className="luma-shrine-choice-label">
                                    {choice.label.replace(" Luma", "")}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {result != null && revealed && (
                    <div className="luma-shrine-footer">
                        <p className="luma-shrine-reveal-label">
                            {selectedLabel}: {result.label}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LumaShrineBonusRound;
