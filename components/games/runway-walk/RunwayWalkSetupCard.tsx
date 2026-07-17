"use client";

import React, { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Game } from "@/lib/games";
import { cn } from "@/lib/utils";
import BetAmountInput from "@/components/shared/BetAmountInput";
import { BUST_PROBABILITY } from "./runwayWalkConfig";

interface RunwayWalkSetupCardProps {
    game: Game;
    placement?: "sidebar" | "standalone";
    className?: string;

    currentView: 0 | 1 | 2;
    betAmount: number;
    setBetAmount: (amount: number) => void;
    isLoading: boolean;

    currentStep: number;
    totalMultiplier: number;
    bonusMultiplier: number;
    busted: boolean;
    cashedOut: boolean;
    isAdvancing: boolean;
    inReplayMode: boolean;

    walletBalance: number;
    minBet: number;
    maxBet: number;

    onPlay: () => void;
    onCashOut: () => void;
}

const RunwayWalkSetupCard: React.FC<RunwayWalkSetupCardProps> = ({
    placement = "sidebar",
    className,
    currentView,
    betAmount,
    setBetAmount,
    isLoading,
    currentStep,
    totalMultiplier,
    bonusMultiplier,
    busted,
    cashedOut,
    isAdvancing,
    inReplayMode,
    walletBalance,
    minBet,
    maxBet,
    onPlay,
    onCashOut,
}) => {
    const [usdMode, setUsdMode] = useState<boolean>(false);

    const canStartWalk = currentView === 0 && !isLoading && !inReplayMode && betAmount > 0;
    const canCashOut = currentView === 1 && !busted && !cashedOut && !isAdvancing && !inReplayMode && currentStep > 0;
    const potentialPayout = betAmount * totalMultiplier;

    return (
        <Card className={cn("lg:basis-1/3 w-full h-fit bg-[#12181C] border-[#2A3640] text-white", className)}>
            <CardContent className="flex flex-col gap-4 pt-4">
                {currentView === 0 && (
                    <div>
                        <p className="text-xs uppercase tracking-wide text-white/50 mb-2">Bet amount</p>
                        <BetAmountInput
                            min={minBet}
                            max={maxBet}
                            step={1}
                            value={betAmount}
                            onChange={setBetAmount}
                            balance={walletBalance}
                            disabled={currentView !== 0 || isLoading}
                            usdMode={usdMode}
                            setUsdMode={setUsdMode}
                            themeColorBackground="#1a1030"
                        />
                        <p className="text-xs text-white/50 text-center mt-3">
                            Pick 1 of 5 tiles each step — 1 hides a stumble ({Math.round(BUST_PROBABILITY * 100)}% odds). Cash out anytime.
                        </p>
                    </div>
                )}

                {currentView === 1 && (
                    <div className="flex flex-col gap-2 text-center">
                        <p className="text-xs uppercase tracking-wide text-white/50">Current multiplier</p>
                        <p className="text-2xl font-bold text-amber-300">{totalMultiplier.toFixed(2)}x</p>
                        {bonusMultiplier > 1 && (
                            <p className="text-xs text-emerald-300 font-semibold">🔥 {bonusMultiplier.toFixed(2)}x streak bonus active!</p>
                        )}
                        <p className="text-xs text-white/50">
                            Cash out now for <span className="text-emerald-300 font-semibold">{potentialPayout.toFixed(2)}</span>
                        </p>
                        <p className="text-xs text-white/40 mt-1">Pick a tile on the runway to take your next step.</p>
                    </div>
                )}
            </CardContent>

            <CardFooter className="flex flex-col gap-2">
                {currentView === 0 && (
                    <Button
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold"
                        disabled={!canStartWalk}
                        onClick={onPlay}
                    >
                        {isLoading ? "Starting…" : "Start the Walk"}
                    </Button>
                )}
                {currentView === 1 && (
                    <Button
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
                        disabled={!canCashOut}
                        onClick={onCashOut}
                    >
                        Cash Out
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
};

export default RunwayWalkSetupCard;