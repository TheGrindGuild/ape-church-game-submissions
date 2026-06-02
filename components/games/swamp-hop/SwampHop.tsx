"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getPayout, randomBytes, Game } from "@/lib/games";
import GameWindow from "@/components/shared/GameWindow";
import SwampHopWindow, { HOP_MOTION_DURATION_S } from "./SwampHopWindow";
import SwampHopSetupCard from "./SwampHopSetupCard";
import LumaShrineBonusRound from "./LumaShrineBonusRound";
import { bytesToHex, Hex } from "viem";
import { toast } from "sonner";
import "./swamp-hop.styles.css";
import {
    applyHopToBank,
    applyLumaBonusToBank,
    applyTreasureBonus,
    estimateMaxProfit,
    getCurrentMultiplier,
    HopResult,
    LumaBonusRecord,
    LumaBonusResult,
    precomputeHopSequence,
} from "./swampHopLogic";
import { getSceneForGameId } from "./swampHopSprites";
import { LUMA_BONUS_CONFIG, LumaChoiceId } from "./swampHopConfig";

interface SwampHopComponentProps {
    game: Game;
}

type SwampHopView = 0 | 1 | 2 | 3;

const MIN_BET = 1;
const MAX_BET = 100;
const MOCK_WALLET_BALANCE = 25;

const SwampHopComponent: React.FC<SwampHopComponentProps> = ({ game }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const replayIdString = searchParams.get("id");
    const walletBalance = MOCK_WALLET_BALANCE;

    const [currentView, setCurrentView] = useState<SwampHopView>(0);

    const [betAmount, setBetAmount] = useState<number>(0);
    const [maxHops, setMaxHops] = useState<number>(10);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [payout, setPayout] = useState<number | null>(null);
    const [currentHopIndex, setCurrentHopIndex] = useState<number>(0);
    const [gameOver, setGameOver] = useState<boolean>(false);
    const [isHopping, setIsHopping] = useState<boolean>(false);
    const [currentBank, setCurrentBank] = useState<number>(0);
    const [hopHistory, setHopHistory] = useState<(HopResult | null)[]>([]);
    const [lastHopResult, setLastHopResult] = useState<HopResult | null>(null);
    const [cashedOut, setCashedOut] = useState<boolean>(false);
    const [hopSequence, setHopSequence] = useState<HopResult[]>([]);
    const [sessionKey, setSessionKey] = useState(0);
    const [pendingBonusHop, setPendingBonusHop] = useState<number | null>(null);
    const [lumaBonusHistory, setLumaBonusHistory] = useState<LumaBonusRecord[]>(
        []
    );

    const bankRef = useRef(0);
    const bankAtBonusRef = useRef<number | null>(null);

    useEffect(() => {
        bankRef.current = currentBank;
    }, [currentBank]);

    const shouldShowPNL: boolean =
        !!payout && payout > 1 && payout > betAmount;
    const playAgainText = `Play Again (${maxHops} Hops)`;

    const [currentGameId, setCurrentGameId] = useState<bigint>(() =>
        replayIdString != null && replayIdString.length > 2
            ? BigInt(replayIdString)
            : BigInt(0)
    );
    const [userRandomWord, setUserRandomWord] = useState<Hex>(
        `0x${"00".repeat(32)}`
    );
    const [sessionReady, setSessionReady] = useState(false);

    useEffect(() => {
        if (replayIdString != null && replayIdString.length > 2) {
            setCurrentGameId(BigInt(replayIdString));
            setSessionReady(true);
            setIsLoading(true);

            const timer = window.setTimeout(() => {
                setIsLoading(false);
                setCurrentView(1);
            }, 400);

            return () => window.clearTimeout(timer);
        }

        setCurrentGameId(BigInt(bytesToHex(new Uint8Array(randomBytes(32)))));
        setUserRandomWord(bytesToHex(new Uint8Array(randomBytes(32))));
        setSessionReady(true);
    }, [replayIdString]);

    const currentMultiplier = useMemo(
        () => getCurrentMultiplier(currentBank, betAmount),
        [currentBank, betAmount]
    );

    const activeGame = useMemo(
        () => ({
            ...game,
            gameBackground:
                currentView === 3
                    ? "/submissions/swamp-hop/scenes/shrine.png"
                    : sessionReady
                      ? getSceneForGameId(currentGameId)
                      : game.gameBackground,
        }),
        [game, currentGameId, sessionReady, currentView]
    );

    const pendingBonusReplayRecord = useMemo(() => {
        if (pendingBonusHop == null) {
            return null;
        }
        return (
            lumaBonusHistory.find((r) => r.hopIndex === pendingBonusHop) ?? null
        );
    }, [pendingBonusHop, lumaBonusHistory]);

    const getHopsLeft = (): number => maxHops - currentHopIndex;

    const getActiveBetAmount = (): number => betAmount;

    const getTotalPayout = (): number => payout ?? 0;

    const finishGame = (finalPayout: number, delayMs: number) => {
        setPayout(finalPayout);
        setCurrentView(2);
        setTimeout(() => {
            setGameOver(true);
        }, delayMs);
    };

    const validateBet = (amount: number): boolean => {
        if (amount < MIN_BET) {
            toast.error(`Minimum bet is ${MIN_BET} APE`);
            return false;
        }

        if (amount > MAX_BET) {
            toast.error(`Maximum bet is ${MAX_BET} APE`);
            return false;
        }

        if (amount > walletBalance) {
            toast.error("Insufficient balance");
            return false;
        }

        if (maxHops < 1 || maxHops > 15) {
            toast.error("Choose between 1 and 15 hops");
            return false;
        }

        return true;
    };

    const playGame = async (gameId?: bigint, randomWord?: Hex) => {
        const activeBet = getActiveBetAmount();
        if (!validateBet(activeBet)) {
            return;
        }

        setIsLoading(true);

        const gameIdToUse = gameId ?? currentGameId;
        const randomWordToUse = randomWord ?? userRandomWord;
        const sequence = precomputeHopSequence(
            game.payouts,
            gameIdToUse,
            randomWordToUse,
            maxHops
        );

        setHopSequence(sequence);
        setHopHistory([]);
        setLastHopResult(null);
        setCurrentBank(activeBet);
        bankRef.current = activeBet;
        bankAtBonusRef.current = null;
        setCurrentHopIndex(0);
        setPayout(null);
        setCashedOut(false);
        setGameOver(false);
        setIsHopping(false);
        setPendingBonusHop(null);
        setLumaBonusHistory([]);
        setSessionKey((key) => key + 1);

        console.log("[Swamp Hop] Mock bet transaction", {
            gameAddress: game.gameAddress,
            betAmount: activeBet,
            maxHops,
            gameId: gameIdToUse.toString(),
            userRandomWord: randomWordToUse,
        });

        try {
            const receiptSuccess = true;

            if (receiptSuccess) {
                toast.success("Transaction complete!");
                setTimeout(() => {
                    setIsLoading(false);
                    setCurrentView(1);
                }, 1000);
            } else {
                toast.info("Something went wrong..");
                setIsLoading(false);
            }
        } catch (error) {
            if (
                (error instanceof Error &&
                    error.message.includes("Transaction not found")) ||
                (typeof error === "string" &&
                    error.includes("Transaction not found"))
            ) {
                return;
            }

            toast.error("An unexpected error occurred.");
            setIsLoading(false);
        }
    };

    const handleStateAdvance = () => {
        if (
            isHopping ||
            currentHopIndex >= maxHops ||
            currentView === 3 ||
            pendingBonusHop != null
        ) {
            return;
        }

        if (gameOver) {
            setGameOver(false);
        }

        setIsHopping(true);

        const hopIndexAtStart = currentHopIndex;
        const hopResult = hopSequence[hopIndexAtStart];
        if (hopResult == null) {
            setIsHopping(false);
            return;
        }

        setTimeout(() => {
            const activeBet = getActiveBetAmount();
            setIsHopping(false);
            setLastHopResult(hopResult);

            const nextHopIndex = hopIndexAtStart + 1;
            setHopHistory((prev) => {
                const next = [...prev];
                next[nextHopIndex] = hopResult;
                return next;
            });

            if (hopResult.isCroc) {
                bankRef.current = 0;
                bankAtBonusRef.current = null;
                setCurrentBank(0);
                setCurrentHopIndex(nextHopIndex);
                toast.info("Croc snap! You lost your bet.");
                finishGame(0, 1500);
                return;
            }

            const bankAfterHop = applyHopToBank(
                bankRef.current,
                activeBet,
                hopResult
            );
            bankRef.current = bankAfterHop;
            setCurrentHopIndex(nextHopIndex);

            if (
                hopResult.isShrine &&
                LUMA_BONUS_CONFIG.enabled &&
                LUMA_BONUS_CONFIG.triggerPadIndex === hopResult.padType
            ) {
                bankAtBonusRef.current = bankAfterHop;
                setCurrentBank(bankAfterHop);
                setPendingBonusHop(hopResult.hopIndex);
                setCurrentView(3);
                return;
            }

            setCurrentBank(bankAfterHop);

            if (nextHopIndex >= maxHops) {
                const treasureBank = applyTreasureBonus(bankAfterHop);
                bankRef.current = treasureBank;
                setCurrentBank(treasureBank);
                finishGame(treasureBank, 1500);
            }
        }, Math.round(HOP_MOTION_DURATION_S * 1000));
    };

    const handleLumaBonusComplete = (
        choiceId: LumaChoiceId,
        result: LumaBonusResult
    ) => {
        if (pendingBonusHop == null) {
            return;
        }

        const activeBet = getActiveBetAmount();
        const hopIndex = pendingBonusHop;

        setLumaBonusHistory((prev) => {
            const filtered = prev.filter((r) => r.hopIndex !== hopIndex);
            return [
                ...filtered,
                {
                    hopIndex,
                    choiceId,
                    factor: result.factor,
                    label: result.label,
                },
            ];
        });

        const choiceLabel =
            LUMA_BONUS_CONFIG.choices.find((c) => c.id === choiceId)?.label ??
            "Luma";
        toast.info(`${choiceLabel}: ${result.label}`);

        setPendingBonusHop(null);
        setCurrentView(1);

        const baseBank = bankAtBonusRef.current ?? bankRef.current;
        const nextBank = applyLumaBonusToBank(
            baseBank,
            result.factor,
            activeBet
        );
        bankAtBonusRef.current = null;
        bankRef.current = nextBank;
        setCurrentBank(nextBank);

        if (currentHopIndex >= maxHops) {
            const treasureBank = applyTreasureBonus(nextBank);
            bankRef.current = treasureBank;
            setCurrentBank(treasureBank);
            finishGame(treasureBank, 1500);
        }
    };

    const handleCashOut = () => {
        if (
            isHopping ||
            currentHopIndex === 0 ||
            currentBank <= 0 ||
            currentView !== 1
        ) {
            return;
        }

        setCashedOut(true);
        const bank = bankRef.current;
        const profit = bank - getActiveBetAmount();
        const bankText = bank.toLocaleString([], {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        if (profit > 0) {
            toast.success(
                `Cashed out at ${bankText} APE (+${profit.toFixed(2)} profit)`
            );
        } else {
            toast.success(`Cashed out at ${bankText} APE`);
        }
        finishGame(bank, 300);
    };

    const handleReset = (isPlayingAgain: boolean = false) => {
        if (isPlayingAgain === false) {
            const newGameId = BigInt(
                bytesToHex(new Uint8Array(randomBytes(32)))
            );
            const newUserWord = bytesToHex(new Uint8Array(randomBytes(32)));
            setCurrentGameId(newGameId);
            setUserRandomWord(newUserWord);
        }

        setIsHopping(false);
        setCurrentView(0);
        setPayout(null);
        setGameOver(false);
        setCurrentHopIndex(0);
        setCurrentBank(0);
        bankRef.current = 0;
        bankAtBonusRef.current = null;
        setHopHistory([]);
        setLastHopResult(null);
        setCashedOut(false);
        setHopSequence([]);
        setPendingBonusHop(null);
        setLumaBonusHistory([]);
        if (!isPlayingAgain) {
            setSessionKey((key) => key + 1);
        }

        if (replayIdString !== null) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("id");
            router.replace(`?${params.toString()}`, { scroll: false });
        }
    };

    const handlePlayAgain = async () => {
        const newGameId = BigInt(bytesToHex(new Uint8Array(randomBytes(32))));
        const newUserWord = bytesToHex(new Uint8Array(randomBytes(32)));

        setCurrentGameId(newGameId);
        setUserRandomWord(newUserWord);
        handleReset(true);
        await playGame(newGameId, newUserWord);
    };

    const handleRewatch = () => {
        const savedGameId = currentGameId;
        const savedWord = userRandomWord;
        const savedBet = betAmount;
        const savedMaxHops = maxHops;
        const savedLumaHistory = lumaBonusHistory;

        handleReset(false);

        setCurrentGameId(savedGameId);
        setUserRandomWord(savedWord);
        setBetAmount(savedBet);
        setMaxHops(savedMaxHops);
        setLumaBonusHistory(savedLumaHistory);

        const sequence = precomputeHopSequence(
            game.payouts,
            savedGameId,
            savedWord,
            savedMaxHops
        );

        setHopSequence(sequence);
        setCurrentView(1);
        setCurrentBank(savedBet);
        bankRef.current = savedBet;
        bankAtBonusRef.current = null;
        setGameOver(false);
    };

    return (
        <div>
            <div className="swamp-hop-layout flex flex-col lg:flex-row gap-4 sm:gap-8 lg:gap-10">
                <div className="swamp-hop-game-frame lg:basis-2/3 w-full">
                <GameWindow
                    game={activeGame}
                    currentGameId={currentGameId}
                    isLoading={isLoading}
                    isGameFinished={gameOver}
                    backgroundImageClassName="opacity-75 object-cover object-bottom"
                    onPlayAgain={handlePlayAgain}
                    playAgainText={playAgainText}
                    onRewatch={handleRewatch}
                    onReset={() => handleReset(false)}
                    betAmount={getActiveBetAmount()}
                    payout={payout}
                    inReplayMode={replayIdString !== null}
                    isUserOriginalPlayer={true}
                    showPNL={shouldShowPNL}
                    isGamePaused={false}
                    resultModalDelayMs={1000}
                >
                    <SwampHopWindow
                        key={sessionKey}
                        game={game}
                        isHopping={isHopping}
                        currentHopIndex={currentHopIndex}
                        maxHops={maxHops}
                        gameCompleted={gameOver}
                        hopHistory={hopHistory}
                        lastHopResult={lastHopResult}
                        betAmount={getActiveBetAmount()}
                        payoutAmount={getTotalPayout()}
                        currentBank={currentBank}
                        currentMultiplier={currentMultiplier}
                        cashedOut={cashedOut}
                    />
                    {currentView === 3 && pendingBonusHop != null && (
                        <LumaShrineBonusRound
                            gameId={currentGameId}
                            userRandomWord={userRandomWord}
                            hopIndex={pendingBonusHop}
                            currentBank={currentBank}
                            replayRecord={pendingBonusReplayRecord}
                            onComplete={handleLumaBonusComplete}
                        />
                    )}
                </GameWindow>
                </div>

                <SwampHopSetupCard
                    game={game}
                    onPlay={async () => await playGame()}
                    onHop={handleStateAdvance}
                    onCashOut={handleCashOut}
                    onRewatch={handleRewatch}
                    onReset={() => handleReset(false)}
                    onPlayAgain={async () => await handlePlayAgain()}
                    playAgainText={playAgainText}
                    currentView={currentView}
                    betAmount={
                        currentView === 0 ? betAmount : getActiveBetAmount()
                    }
                    setBetAmount={setBetAmount}
                    maxHops={maxHops}
                    setMaxHops={setMaxHops}
                    isLoading={isLoading}
                    payout={payout}
                    hopsLeft={getHopsLeft()}
                    currentMultiplier={currentMultiplier}
                    currentBank={currentBank}
                    jackpotMultiplier={getPayout(game.payouts, 5, 5, 5) / 10_000}
                    maxProfit={estimateMaxProfit(betAmount, maxHops)}
                    inReplayMode={replayIdString !== null}
                    account={undefined}
                    walletBalance={walletBalance}
                    playerAddress={undefined}
                    isGamePaused={currentView === 3}
                    profile={undefined}
                    minBet={MIN_BET}
                    maxBet={MAX_BET}
                    isHopping={isHopping}
                    currentHopIndex={currentHopIndex}
                    canCashOut={
                        currentView === 1 &&
                        currentHopIndex > 0 &&
                        currentBank > 0 &&
                        !isHopping &&
                        pendingBonusHop == null
                    }
                />
            </div>
        </div>
    );
};

export default SwampHopComponent;
