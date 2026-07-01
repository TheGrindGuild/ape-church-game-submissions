import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import BetAmountInput from "@/components/shared/BetAmountInput";
import { CustomSlider } from "@/components/shared/CustomSlider";
import { playSound } from "./soundManager";

const MAX_SPINS = 10;
const PRESETS = [3, 5, 10];

interface SetupOverlayProps {
    themeColor: string;
    betAmount: number;
    setBetAmount: (amount: number) => void;
    numberOfSpins: number;
    setNumberOfSpins: (n: number) => void;
    walletBalance: number;
    isLoading: boolean;
}

const SetupOverlay: React.FC<SetupOverlayProps> = ({
    themeColor,
    betAmount,
    setBetAmount,
    numberOfSpins,
    setNumberOfSpins,
    walletBalance,
    isLoading,
}) => {
    const perSpin = numberOfSpins > 0 ? betAmount / numberOfSpins : betAmount;

    return (
        <div className="sa-setup-content" onPointerUp={() => playSound("select")}>
            {/* Bet Amount */}
            <BetAmountInput
                min={0}
                max={walletBalance}
                step={1}
                value={betAmount}
                onChange={setBetAmount}
                balance={walletBalance}
                usdMode={false}
                setUsdMode={() => {}}
                disabled={isLoading}
                themeColorBackground={themeColor}
            />

            {/* Number of Spins */}
            <div className="mt-6">
                <CustomSlider
                    label="Number of Spins"
                    min={1}
                    max={MAX_SPINS}
                    step={1}
                    value={numberOfSpins}
                    onChange={setNumberOfSpins}
                    presets={PRESETS}
                    themeColor={themeColor}
                    disabled={isLoading}
                />

                {/* Preset spin buttons */}
                <div className="mt-2 grid grid-cols-3 gap-2">
                    {PRESETS.map((presetValue) => (
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

            {/* Total Bet Amount + Per Spin */}
            <div className="sa-setup-preview mt-6 flex flex-col gap-0 leading-tight">
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
                        {perSpin.toLocaleString([], {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 3,
                        })} APE
                    </span>
                </div>
            </div>

        </div>
    );
};

export default SetupOverlay;
