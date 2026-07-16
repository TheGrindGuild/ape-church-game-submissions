"use client";

import React, { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Game } from "@/lib/games";
import { cn } from "@/lib/utils";
import BetAmountInput from "@/components/shared/BetAmountInput";
import { PageantSide } from "./pageantShowdownConfig";

interface PageantShowdownSetupCardProps {
    game: Game;
    /** "sidebar" = right column on desktop (this game only uses the two-column layout). */
    placement?: "sidebar" | "standalone";
    className?: string;

    currentView: 0 | 1 | 2;
    chosenSide: PageantSide | null;
    setChosenSide: (side: PageantSide) => void;

    betAmount: number;
    setBetAmount: (amount: number) => void;
    isLoading: boolean;
    payout: number | null;
    winMultiplier: number;
    inReplayMode: boolean;

    walletBalance: number;
    minBet: number;
    maxBet: number;

    onPlay: () => void;
}

const PageantShowdownSetupCard: React.FC<PageantShowdownSetupCardProps> = ({
    placement = "sidebar",
    className,
    currentView,
    chosenSide,
    setChosenSide,
    betAmount,
    setBetAmount,
    isLoading,
    winMultiplier,
    inReplayMode,
    walletBalance,
    minBet,
    maxBet,
    onPlay,
}) => {
    const [usdMode, setUsdMode] = useState<boolean>(false);
    const canPlay = currentView === 0 && !isLoading && !inReplayMode && chosenSide !== null && betAmount > 0;

    const flipButton = (extraClassName = "") => (
        <Button
            className={cn(
                "w-full bg-amber-500 hover:bg-amber-400 text-black font-bold",
                extraClassName
            )}
            disabled={!canPlay}
            onClick={onPlay}
        >
            {isLoading ? "Flipping…" : "Flip the Vote"}
        </Button>
    );

    return (
        <Card
            className={cn(
                "w-full h-full min-h-0 flex flex-col overflow-hidden bg-[#12181C] border-[#2A3640] text-white",
                className
            )}
        >
            {currentView === 0 && (
                <div className="shrink-0 lg:hidden px-6 pt-4">
                    {flipButton()}
                </div>
            )}

            <CardContent className="flex flex-col gap-4 pt-4 flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                <div>
                    <p className="text-xs uppercase tracking-wide text-white/50 mb-2">Pick a side</p>
                    <div className="grid grid-cols-2 gap-2">
                        <SideButton
                            label="Left Koda"
                            side="left"
                            selected={chosenSide === "left"}
                            disabled={currentView !== 0 || isLoading}
                            onClick={() => setChosenSide("left")}
                        />
                        <SideButton
                            label="Right Koda"
                            side="right"
                            selected={chosenSide === "right"}
                            disabled={currentView !== 0 || isLoading}
                            onClick={() => setChosenSide("right")}
                        />
                    </div>
                </div>

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
                </div>

                <p className="text-xs text-white/50 text-center">
                    Call it right: <span className="text-amber-300 font-semibold">{winMultiplier}x</span> payout. Call it wrong: nothing.
                </p>

                <div className="grow hidden lg:block" />
            </CardContent>

            <CardFooter className="hidden lg:flex shrink-0">
                {flipButton()}
            </CardFooter>
        </Card>
    );
};

interface SideButtonProps {
    label: string;
    side: PageantSide;
    selected: boolean;
    disabled: boolean;
    onClick: () => void;
}

const SideButton: React.FC<SideButtonProps> = ({ label, selected, disabled, onClick }) => (
    <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={cn(
            "rounded-lg border-2 py-3 text-sm font-semibold transition-colors",
            selected
                ? "border-amber-400 bg-amber-400/10 text-amber-200"
                : "border-[#2A3640] bg-[#0e1317] text-white/70 hover:border-white/30",
            disabled && "opacity-50 cursor-not-allowed"
        )}
    >
        {label}
    </button>
);

export default PageantShowdownSetupCard;
