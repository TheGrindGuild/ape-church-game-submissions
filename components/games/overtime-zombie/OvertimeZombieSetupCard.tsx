import React, { useState } from "react";
import {
    Card,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, X } from "lucide-react";
import { Game } from "@/lib/games";
import BetAmountInput from "@/components/shared/BetAmountInput";
import { CustomSlider } from "@/components/shared/CustomSlider";
import { METER_MAX, METER_STAGE_THRESHOLD, SYMBOLS, KICK_THRESHOLD, KICK_METER_POINTS } from "./overtimeZombieConfig";

const MAX_SPINS = 10;

interface OvertimeZombieSetupCardProps {
    game: Game;
    onPlay: () => void;
    onSpin: () => void;
    onRewatch: () => void;
    onReset: () => void;
    onPlayAgain: () => void;
    currentView: 0 | 1 | 2;
    betAmount: number;
    setBetAmount: (amount: number) => void;
    numberOfSpins: number;
    setNumberOfSpins: (n: number) => void;
    isLoading: boolean;
    payout: number | null;
    inReplayMode: boolean;
    walletBalance: number;
    spinComplete: boolean;
    zombieReleased: boolean;
    isAnimating: boolean;
    meterPoints: number;
    isBonusRound: boolean;
    bonusWorkersFound: number;
    bonusMultiplier: number;
    // Bet limits — declared on the contract but not yet consumed by the UI.
    // Other Ape Church games clamp the bet input to [minBet, maxBet]; wire
    // these into the bet-amount control when the blockchain integration lands.
    minBet: number;
    maxBet: number;
}

const OvertimeZombieSetupCard: React.FC<OvertimeZombieSetupCardProps> = ({
    game,
    onPlay,
    onSpin,
    onRewatch,
    onReset,
    onPlayAgain,
    currentView,
    betAmount,
    setBetAmount,
    numberOfSpins,
    setNumberOfSpins,
    isLoading,
    payout,
    inReplayMode,
    walletBalance,
    spinComplete,
    zombieReleased,
    isAnimating,
    meterPoints,
    isBonusRound,
    bonusWorkersFound,
    bonusMultiplier,
    // minBet / maxBet intentionally not destructured — see interface comment.
}) => {
    const themeColor = game.themeColorBackground;
    const usdMode = false;
    const [showPayTable, setShowPayTable] = useState(false);

    const getBetAmountText = (): string => {
        return `${(betAmount || 0).toLocaleString([], {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        })} APE`;
    };

    const getPayoutText = (): string => {
        return `${(payout || 0).toLocaleString([], {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        })} APE`;
    };

    const getCurrentStage = (): number => {
        return Math.min(
            Math.floor(meterPoints / METER_STAGE_THRESHOLD) + 1,
            5
        );
    };

    return (
        <Card className="lg:basis-1/3 p-6 flex flex-col">
            {/* VIEW 0: Setup */}
            {currentView === 0 && (
                <>
                    <CardContent className="font-roboto">

                        {/* Place Bet button - mobile */}
                        <Button
                            onClick={onPlay}
                            className="lg:hidden w-full mb-4"
                            style={{
                                backgroundColor: themeColor,
                                borderColor: themeColor,
                            }}
                            disabled={betAmount <= 0}
                        >
                            Place Your Bet
                        </Button>

                        {/* Bet Amount */}
                        <div className="mt-2">
                            <BetAmountInput
                                min={0}
                                max={walletBalance}
                                step={1}
                                value={betAmount}
                                onChange={setBetAmount}
                                balance={walletBalance}
                                usdMode={usdMode}
                                setUsdMode={() => {}}
                                disabled={isLoading}
                                themeColorBackground={themeColor}
                            />
                        </div>

                        {/* Number of Spins */}
                        <div className="mt-8">
                            <CustomSlider
                                label="Number of Spins"
                                min={1}
                                max={MAX_SPINS}
                                step={1}
                                value={numberOfSpins}
                                onChange={setNumberOfSpins}
                                presets={[3, 5, 10]}
                                themeColor={themeColor}
                                disabled={isLoading}
                            />

                            {/* Preset spin buttons (always visible) */}
                            <div className="mt-3 grid grid-cols-3 gap-2">
                                {[3, 5, 10].map((presetValue) => (
                                    <button
                                        key={presetValue}
                                        type="button"
                                        onClick={() => setNumberOfSpins(presetValue)}
                                        disabled={isLoading}
                                        className="text-xs font-semibold py-1.5 rounded-[5px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                        style={
                                            numberOfSpins === presetValue
                                                ? { backgroundColor: themeColor, color: "white", borderColor: themeColor }
                                                : { backgroundColor: "transparent", color: "#91989C", border: "1px solid #2a3640" }
                                        }
                                    >
                                        {presetValue}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="mt-6 border-t border-[#2a3640]" />

                        {/* Total Bet Amount + Per Spin */}
                        <div className="mt-4 flex flex-col gap-2" style={{ fontSize: "10px" }}>
                            <div className="flex justify-between items-center text-[#91989C]">
                                <span className="flex items-center gap-1.5">
                                    Total Bet Amount
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button type="button" className="cursor-help">
                                                    <Info size={14} />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent className="sa-tooltip-hint">
                                                Total amount you plan to wager across all paid base spins.
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </span>
                                <span className="text-right text-foreground font-semibold">
                                    {betAmount.toLocaleString([], { maximumFractionDigits: 0 })} APE
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-[#91989C]">
                                <span>Bet Per Spin</span>
                                <span className="text-right text-foreground font-semibold">
                                    {(numberOfSpins > 0 ? betAmount / numberOfSpins : betAmount).toLocaleString([], {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 3,
                                    })} APE
                                </span>
                            </div>
                        </div>
                    </CardContent>

                    <div className="grow" />

                    <CardFooter className="mt-6 w-full flex flex-col font-roboto">
                        <Button
                            onClick={onPlay}
                            className="hidden lg:flex w-full"
                            style={{
                                backgroundColor: themeColor,
                                borderColor: themeColor,
                            }}
                            disabled={betAmount <= 0}
                        >
                            Place Your Bet
                        </Button>
                    </CardFooter>
                </>
            )}

            {/* VIEW 1: Ongoing */}
            {currentView === 1 && (
                <CardContent className="grow font-roboto flex flex-col lg:justify-between gap-6">
                    {inReplayMode && (
                        <p
                            className="font-semibold text-2xl text-center"
                            style={{ color: themeColor }}
                        >
                            Replay Mode
                        </p>
                    )}

                    {/* Status */}
                    {isBonusRound ? (
                        <div className="text-center font-nohemia">
                            <p className="text-lg font-medium" style={{ color: "#FACC15" }}>
                                SNACK ATTACK!
                            </p>
                            <p className="mt-1 text-sm text-[#91989C]">
                                Zombie is hunting for workers...
                            </p>
                            {bonusWorkersFound > 0 && !isAnimating && (
                                <p className="mt-2 font-semibold text-2xl" style={{ color: "#DC2626", textShadow: "0 0 8px rgba(220, 38, 38, 0.5)" }}>
                                    {bonusWorkersFound} worker{bonusWorkersFound !== 1 ? "s" : ""} — {bonusMultiplier}x
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="text-center font-nohemia">
                            <p className="text-lg font-medium text-[#91989C]">Zombie Meter</p>
                            <p
                                className="mt-1 font-semibold text-3xl"
                                style={{ color: themeColor }}
                            >
                                {meterPoints} / {METER_MAX}
                            </p>
                            <p className="mt-1 text-sm text-[#91989C]">
                                Stage {getCurrentStage()} of 5
                            </p>
                        </div>
                    )}

                    {/* Spin button */}
                    <div className="flex flex-col items-center gap-3">
                        {isBonusRound ? (
                            <div className="text-center">
                                <p className="text-sm text-[#91989C] animate-pulse">
                                    {isAnimating ? "Cascading..." : "Bonus round complete!"}
                                </p>
                            </div>
                        ) : spinComplete && !zombieReleased ? (
                            <div className="text-center">
                                <p className="text-sm text-[#91989C] mb-3">
                                    No more cascades! Spin again to try a new board.
                                </p>
                                <Button
                                    onClick={onSpin}
                                    className="w-full"
                                    style={{
                                        backgroundColor: themeColor,
                                        borderColor: themeColor,
                                    }}
                                >
                                    Spin ({getBetAmountText()})
                                </Button>
                            </div>
                        ) : zombieReleased ? (
                            <div className="text-center">
                                <p className="sa-zombie-released-card">
                                    ZOMBIE RELEASED!
                                </p>
                            </div>
                        ) : !isAnimating && meterPoints === 0 ? (
                            <Button
                                onClick={onSpin}
                                className="w-full"
                                style={{
                                    backgroundColor: themeColor,
                                    borderColor: themeColor,
                                }}
                            >
                                Spin
                            </Button>
                        ) : (
                            <div className="text-center">
                                <p className="text-sm text-[#91989C] animate-pulse">
                                    Cascading...
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="w-full flex flex-col items-center gap-2 font-medium text-xs text-[#91989C]">
                        <div className="w-full flex justify-between items-center gap-2">
                            <p>Bet Amount</p>
                            <p className="text-right">{getBetAmountText()}</p>
                        </div>
                        <div className="w-full flex justify-between items-center gap-2">
                            <p>Wallet Balance</p>
                            <p className="text-right">{walletBalance.toFixed(2)} APE</p>
                        </div>
                    </div>

                    {/* Pay Table Toggle */}
                    <div className="flex justify-center">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-[#91989C] hover:text-foreground"
                            onClick={() => setShowPayTable(!showPayTable)}
                        >
                            {showPayTable ? <X className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                        </Button>
                    </div>

                    {/* Pay Table Modal */}
                    {showPayTable && (
                        <div className="w-full p-3 bg-[#0f1419] border border-[#2a3640] rounded-md">
                            <p className="text-xs font-medium text-[#91989C] mb-2 text-center">Pay Table</p>
                            <div className="flex items-center justify-end gap-0 mb-1 text-[10px] text-[#91989C]">
                                <span className="w-[44px] text-center">7-8</span>
                                <span className="w-[44px] text-center">9-10</span>
                                <span className="w-[44px] text-center">11+</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                {SYMBOLS.filter((sym) => !sym.isKick && !sym.isWorker).map((sym) => (
                                    <div key={sym.id} className="flex items-center justify-between text-xs text-[#91989C]">
                                        <span className="flex items-center gap-1 min-w-0">
                                            {sym.image ? (
                                                <img src={sym.image} alt={sym.name} className="w-4 h-4 object-contain" />
                                            ) : (
                                                <span style={{ color: sym.color }}>{sym.shape}</span>
                                            )}
                                            <span className="truncate">{sym.name}</span>
                                        </span>
                                        <span className="flex gap-0 shrink-0">
                                            <span className="w-[44px] text-center">{sym.payoutMultipliers[0].toFixed(2)}x</span>
                                            <span className="w-[44px] text-center">{sym.payoutMultipliers[1].toFixed(2)}x</span>
                                            <span className="w-[44px] text-center">{sym.payoutMultipliers[2].toFixed(2)}x</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-2 pt-2 border-t border-[#2a3640]">
                                <div className="flex items-center justify-between text-xs text-[#F97316]">
                                    <span className="flex items-center gap-1">
                                        {SYMBOLS[8].image ? (
                                            <img src={SYMBOLS[8].image} alt="Kick" className="w-4 h-4 object-contain" />
                                        ) : (
                                            <span>{SYMBOLS[8].shape}</span>
                                        )}
                                        Kick
                                    </span>
                                    <span>{KICK_THRESHOLD}+ = {KICK_METER_POINTS}pts + wipe</span>
                                </div>
                                <p className="mt-1 text-[10px] text-[#38BDF8] text-center">
                                    Worker bonus: +0.5x each
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            )}

            {/* VIEW 2: Finished */}
            {currentView === 2 && (
                <CardContent className="grow font-roboto flex flex-col lg:justify-between gap-6">
                    {/* Result */}
                    <div className="text-center">
                        {zombieReleased ? (
                            <div>
                                <p className="sa-zombie-released-card">
                                    ZOMBIE RELEASED!
                                </p>
                                <p className="text-sm text-[#91989C] mt-2">
                                    The manager has been fully zombified!
                                </p>
                                {bonusWorkersFound > 0 && (
                                    <p className="text-sm mt-1" style={{ color: "#DC2626" }}>
                                        {bonusWorkersFound} worker{bonusWorkersFound !== 1 ? "s" : ""} caught — {bonusMultiplier}x multiplier!
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div>
                                <p className="text-xl font-semibold text-foreground">
                                    Game Over
                                </p>
                                <p className="text-sm text-[#91989C] mt-2">
                                    The cascade ended. Try again!
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="w-full flex flex-col items-center gap-2 font-medium text-xs text-[#91989C]">
                        <div className="w-full flex justify-between items-center gap-2">
                            <p>Bet Amount</p>
                            <p className="text-right">{getBetAmountText()}</p>
                        </div>
                        <div className="w-full flex justify-between items-center gap-2">
                            <p>Total Payout</p>
                            <p className={`text-right ${(payout || 0) > betAmount ? "text-success" : ""}`}>
                                {getPayoutText()}
                            </p>
                        </div>
                        <div className="w-full flex justify-between items-center gap-2">
                            <p>Wallet Balance</p>
                            <p className="text-right">{walletBalance.toFixed(2)} APE</p>
                        </div>
                    </div>

                    {/* USD toggle */}
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <p className="text-foreground text-lg font-semibold">
                                Show Bets in USD
                            </p>
                            <p className="text-sm">
                                Your bets are valued in {usdMode ? "US Dollars" : "APE"}
                            </p>
                        </div>
                        <Switch
                            checked={usdMode}
                            onCheckedChange={() => {}}
                            aria-readonly
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3">
                        <Button
                            className="w-full"
                            style={{
                                backgroundColor: themeColor,
                                borderColor: themeColor,
                            }}
                            onClick={onPlayAgain}
                        >
                            Play Again
                        </Button>
                        <Button
                            className="w-full"
                            variant="secondary"
                            onClick={onRewatch}
                        >
                            Rewatch
                        </Button>
                        <Button
                            className="w-full"
                            variant="secondary"
                            onClick={onReset}
                        >
                            Change Bet
                        </Button>
                    </div>
                </CardContent>
            )}
        </Card>
    );
};

export default OvertimeZombieSetupCard;
