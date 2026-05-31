import React from "react";
import {
    Card,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { Game } from "@/lib/games";
import BetAmountInput from "@/components/shared/BetAmountInput";
import { CustomSlider } from "@/components/shared/CustomSlider";
import ChipSelection, { Chip } from "@/components/shared/ChipSelection";
import { APPROX_HOUSE_EDGE_PERCENT } from "./swampHopConfig";
import { getCrocChancePercent } from "./swampHopLogic";

interface WalletAccount {
    address: string;
}

interface SwampHopSetupCardProps {
    game: Game;
    onPlay: () => void;
    onHop: () => void;
    onCashOut: () => void;
    onRewatch: () => void;
    onReset: () => void;
    onPlayAgain: () => void;
    playAgainText?: string;
    currentView: 0 | 1 | 2 | 3;

    betAmount: number;
    setBetAmount: (amount: number) => void;
    maxHops: number;
    setMaxHops: (hops: number) => void;
    isLoading: boolean;
    payout: number | null;
    hopsLeft: number;
    currentMultiplier: number;
    currentBank: number;
    jackpotMultiplier: number;
    maxProfit: number;
    inReplayMode: boolean;
    isHopping: boolean;
    currentHopIndex: number;
    canCashOut: boolean;

    account?: WalletAccount;
    walletBalance: number;
    playerAddress?: string;
    isGamePaused?: boolean;
    profile?: Record<string, unknown>;
    minBet: number;
    maxBet: number;
}

const MAX_HOPS = 15;
const SHRINE_PAD_INFO =
    "Shrine Pad hops pay ~1.5× your bank, then open the Luma Shrine Bonus overlay.";
const LUMA_BONUS_INFO =
    "Pick Safe (+15%), Wild (+75% or −15%), or Ancient (3×, +40%, or no bonus). The Luma bonus never busts your run — only Croc Snap does.";
const MAX_PROFIT_INFO =
    "Theoretical best-case profit if every hop hits a Shrine Pad and you finish all hops with the treasure bonus.";

const SwampHopSetupCard: React.FC<SwampHopSetupCardProps> = ({
    game,
    onPlay,
    onHop,
    onCashOut,
    onRewatch,
    onReset,
    onPlayAgain,
    playAgainText = "Play Again",
    currentView,
    betAmount,
    setBetAmount,
    maxHops,
    setMaxHops,
    isLoading,
    payout,
    hopsLeft,
    currentMultiplier,
    currentBank,
    jackpotMultiplier,
    maxProfit,
    inReplayMode,
    isHopping,
    currentHopIndex,
    canCashOut,
    account = undefined,
    playerAddress = undefined,
    walletBalance,
    isGamePaused = false,
    maxBet,
    minBet,
}) => {
    const themeColorBackground = game.themeColorBackground;
    const usdMode = false;

    const chips: Chip[] = [
        { id: "1", value: 1, image: "/shared/chips/chip_1.png" },
        { id: "5", value: 5, image: "/shared/chips/chip_5.png" },
        { id: "10", value: 10, image: "/shared/chips/chip_10.png" },
        { id: "25", value: 25, image: "/shared/chips/chip_25.png" },
    ];

    const [selectedChipId, setSelectedChipId] = React.useState<string | null>(
        null
    );

    const getCurrentWalletAmount = (): number => walletBalance;

    const getCurrentWalletAmountString = (): string =>
        `${walletBalance.toFixed(2)} APE`;

    const HopsLeftBlock = (hideOnDesktop: boolean) => (
        <div
            className={`${
                hideOnDesktop ? "lg:hidden" : "hidden lg:block"
            } text-center font-nohemia`}
        >
            <p className="text-lg font-medium text-[#91989C]">Hops Left</p>
            <p
                className="mt-2 font-semibold text-2xl sm:text-5xl"
                style={{ color: themeColorBackground }}
            >
                {hopsLeft} / {maxHops}
            </p>
        </div>
    );

    const getBetAmountText = (): string =>
        `${(betAmount || 0).toLocaleString([], {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        })} APE`;

    const getTotalPayoutText = (): string =>
        `${(payout || 0).toLocaleString([], {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        })} APE`;

    const getJackpotAmountString = (): string =>
        `${((betAmount || 0) * jackpotMultiplier).toLocaleString([], {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        })} APE`;

    const getMaxProfitString = (): string =>
        `${maxProfit.toLocaleString([], {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        })} APE`;

    const getBankText = (): string =>
        `${currentBank.toLocaleString([], {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        })} APE`;

    const getMultiplierText = (): string => `${currentMultiplier.toFixed(2)}x`;

    const getCashOutHelperText = (): string | null => {
        if (currentView === 3) {
            return "Complete the Luma Shrine Bonus first";
        }
        if (currentView !== 1 || canCashOut) {
            return null;
        }
        if (isHopping) {
            return "Wait for hop to finish";
        }
        if (currentHopIndex === 0) {
            return "Hop once to unlock cash out";
        }
        return null;
    };

    const ShowInUsdAndStats = (invertOnDesktop: boolean) => {
        const showGreenText = (payout || 0) > (betAmount || 0);

        return (
            <div
                className={`${
                    invertOnDesktop ? "flex-col-reverse lg:flex-col" : "flex-col"
                } font-roboto flex gap-12 lg:gap-8`}
            >
                {inReplayMode && (
                    <p
                        className="mt-2 font-semibold text-3xl sm:text-3xl text-center"
                        style={{ color: themeColorBackground }}
                    >
                        Replay Mode
                    </p>
                )}

                <div className="flex items-center justify-between gap-2">
                    <div>
                        <p className="text-foreground text-lg font-semibold">
                            Show Bets in USD
                        </p>
                        <p className="text-sm">
                            Your bets are valued in {usdMode ? "US Dollars" : "APE"}
                        </p>
                    </div>
                    <Switch checked={usdMode} onCheckedChange={() => {}} aria-readonly />
                </div>

                <div className="w-full flex flex-col items-center gap-2 font-medium text-xs text-[#91989C]">
                    <div className="w-full flex justify-between items-center gap-2">
                        <p>Bet Amount</p>
                        <p className="text-right">{getBetAmountText()}</p>
                    </div>
                    {currentView >= 1 && (
                        <>
                            <div className="w-full flex justify-between items-center gap-2">
                                <p>Current Bank</p>
                                <p className="text-right text-[#3d8b37]">
                                    {getBankText()}
                                </p>
                            </div>
                            <div className="w-full flex justify-between items-center gap-2">
                                <p>Multiplier</p>
                                <p className="text-right">{getMultiplierText()}</p>
                            </div>
                        </>
                    )}
                    <div className="w-full flex justify-between items-center gap-2">
                        <p>Total Pay Out</p>
                        <p
                            className={`text-right ${showGreenText ? "text-success" : ""}`}
                        >
                            {getTotalPayoutText()}
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    const canReplay = (): boolean => {
        if (!playerAddress || !account || inReplayMode) {
            return false;
        }
        return playerAddress.toLowerCase() === account.address.toLowerCase();
    };

    return (
        <Card className="swamp-hop-setup lg:basis-1/3 p-6 flex flex-col">
            {currentView === 0 && (
                <>
                    <CardContent className="font-roboto">
                        <Button
                            onClick={onPlay}
                            className="lg:hidden w-full"
                            style={{
                                backgroundColor: themeColorBackground,
                                borderColor: themeColorBackground,
                            }}
                            disabled={
                                betAmount === null || betAmount <= 0 || isGamePaused
                            }
                        >
                            Place Your Bet
                        </Button>

                        <div className="mt-5">
                            <BetAmountInput
                                min={minBet}
                                max={getCurrentWalletAmount()}
                                step={0.1}
                                value={betAmount}
                                onChange={setBetAmount}
                                balance={getCurrentWalletAmount()}
                                usdMode={usdMode}
                                setUsdMode={() => {}}
                                disabled={isLoading}
                                themeColorBackground={themeColorBackground}
                            />
                        </div>

                        <ChipSelection
                            chips={chips}
                            selectedChipId={selectedChipId}
                            onChipSelect={(chip) => {
                                setSelectedChipId(chip.id);
                                setBetAmount(
                                    Math.min(
                                        betAmount + chip.value,
                                        maxBet,
                                        walletBalance
                                    )
                                );
                            }}
                            onRemoveAllBets={() => {
                                setSelectedChipId(null);
                                setBetAmount(0);
                            }}
                        />

                        <div className="mt-8">
                            <CustomSlider
                                label="Max Hops"
                                min={1}
                                max={MAX_HOPS}
                                step={1}
                                value={maxHops}
                                onChange={setMaxHops}
                                presets={[5, 10, 15]}
                                themeColor={themeColorBackground}
                            />
                        </div>
                    </CardContent>

                    <div className="grow" />

                    <CardFooter className="mt-8 w-full flex flex-col font-roboto">
                        <div className="w-full flex flex-col items-center gap-2 font-medium text-xs text-[#91989C]">
                            <div className="w-full flex justify-between items-center gap-2">
                                <div className="flex items-center gap-2">
                                    <p>Shrine Pad Multiplier</p>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Info size={16} />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{SHRINE_PAD_INFO}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <p className="text-right">{jackpotMultiplier}x</p>
                            </div>
                            <div className="w-full flex justify-between items-center gap-2">
                                <div className="flex items-center gap-2">
                                    <p>Shrine Pad at Bet</p>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Info size={16} />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{LUMA_BONUS_INFO}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <p className="text-right">{getJackpotAmountString()}</p>
                            </div>
                            <div className="w-full flex justify-between items-center gap-2">
                                <div className="flex items-center gap-2">
                                    <p>Max Profit</p>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Info size={16} />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{MAX_PROFIT_INFO}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <p className="text-right">{getMaxProfitString()}</p>
                            </div>
                            <div className="w-full flex justify-between items-center gap-2">
                                <p>Max Bet</p>
                                <p className="text-right">
                                    {maxBet.toLocaleString([], {
                                        maximumFractionDigits: 0,
                                    })}{" "}
                                    APE
                                </p>
                            </div>
                            <div className="w-full flex justify-between items-center gap-2 pt-1 border-t border-white/10">
                                <p>Approx. House Edge</p>
                                <p className="text-right">
                                    ~{APPROX_HOUSE_EDGE_PERCENT}%
                                </p>
                            </div>
                        </div>

                        <Button
                            onClick={onPlay}
                            className="hidden lg:flex mt-6 w-full"
                            style={{
                                backgroundColor: themeColorBackground,
                                borderColor: themeColorBackground,
                            }}
                            disabled={
                                betAmount === null || betAmount <= 0 || isGamePaused
                            }
                        >
                            Place Your Bet
                        </Button>
                    </CardFooter>
                </>
            )}

            {currentView === 3 && (
                <CardContent className="grow font-roboto flex flex-col gap-6">
                    {ShowInUsdAndStats(true)}
                    <div className="text-center space-y-2 py-4">
                        <p
                            className="text-lg font-bold"
                            style={{ color: themeColorBackground }}
                        >
                            Luma Shrine Bonus
                        </p>
                        <p className="text-sm text-[#91989C]">
                            Pick Safe, Wild, or Ancient in the game window.
                            Luma adjusts your bank — it never busts your run.
                            Then hop again or cash out.
                        </p>
                    </div>
                </CardContent>
            )}

            {currentView === 1 && (
                <CardContent className="grow font-roboto flex flex-col-reverse lg:flex-col lg:justify-between gap-8">
                    {ShowInUsdAndStats(true)}
                    {HopsLeftBlock(false)}

                    <div className="flex lg:flex-col justify-evenly items-center gap-4">
                        {HopsLeftBlock(true)}

                        <div className="font-roboto flex flex-col items-center gap-3 w-full max-w-[220px]">
                            <button
                                type="button"
                                onClick={onHop}
                                disabled={isHopping || hopsLeft <= 0}
                                className="swamp-hop-hop-btn w-full"
                            >
                                Hop
                            </button>

                            <Button
                                onClick={onCashOut}
                                disabled={!canCashOut}
                                variant="secondary"
                                className="swamp-hop-cashout-btn w-full"
                            >
                                Cash Out
                            </Button>
                            {getCashOutHelperText() != null && (
                                <p className="text-xs text-[#91989C] text-center">
                                    {getCashOutHelperText()}
                                </p>
                            )}

                            <div className="w-full mt-2 pt-3 border-t border-white/10 text-xs text-[#91989C] space-y-1">
                                <div className="flex justify-between">
                                    <span>Croc chance (next hop)</span>
                                    <span className="text-white/90">
                                        {getCrocChancePercent(currentHopIndex).toFixed(
                                            1
                                        )}
                                        %
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Approx. house edge</span>
                                    <span className="text-white/90">
                                        ~{APPROX_HOUSE_EDGE_PERCENT}%
                                    </span>
                                </div>
                                <p className="text-[10px] leading-snug pt-1">
                                    Croc Snap is the only full bust. Shrine Pads
                                    open the Luma bonus (Safe +15%, Wild ±75%,
                                    Ancient up to 3×). Croc chance rises after
                                    hop 6.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            )}

            {currentView === 2 && (
                <CardContent className="grow font-roboto flex flex-col lg:justify-between gap-8">
                    <div className="lg:hidden">
                        {canReplay() ? (
                            <Button
                                className="w-full"
                                style={{
                                    backgroundColor: themeColorBackground,
                                    borderColor: themeColorBackground,
                                }}
                                onClick={onPlayAgain}
                                disabled={isGamePaused}
                            >
                                {playAgainText}
                            </Button>
                        ) : (
                            <Button
                                className="w-full"
                                variant="secondary"
                                style={{
                                    backgroundColor: themeColorBackground,
                                    borderColor: themeColorBackground,
                                }}
                                onClick={onRewatch}
                            >
                                Rewatch Hops
                            </Button>
                        )}

                        <Button
                            className="w-full mt-3"
                            variant="secondary"
                            onClick={onReset}
                        >
                            Change Bet
                        </Button>
                    </div>

                    {ShowInUsdAndStats(false)}
                    {HopsLeftBlock(false)}

                    <CardFooter className="w-full hidden lg:block">
                        <div className="w-full flex flex-col gap-4">
                            {canReplay() ? (
                                <Button
                                    className="w-full"
                                    style={{
                                        backgroundColor: themeColorBackground,
                                        borderColor: themeColorBackground,
                                    }}
                                    onClick={onPlayAgain}
                                    disabled={isGamePaused}
                                >
                                    {playAgainText}
                                </Button>
                            ) : (
                                <Button
                                    className="w-full"
                                    style={{
                                        backgroundColor: themeColorBackground,
                                        borderColor: themeColorBackground,
                                    }}
                                    onClick={onRewatch}
                                >
                                    Rewatch Hops
                                </Button>
                            )}

                            <Button
                                className="w-full"
                                variant="secondary"
                                onClick={onReset}
                            >
                                Change Bet
                            </Button>
                        </div>
                    </CardFooter>
                </CardContent>
            )}
        </Card>
    );
};

export default SwampHopSetupCard;
