"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { randomBytes, Game } from "@/lib/games";
import GameWindow from "@/components/shared/GameWindow";
import PageantShowdownWindow from "./PageantShowdownWindow";
import PageantShowdownSetupCard from "./PageantShowdownSetupCard";
import { pageantShowdown, WIN_MULTIPLIER, PageantSide } from "./pageantShowdownConfig";
import { KodaEntry, pickMatchup, PLACEHOLDER_MATCHUP } from "./kodaPool";
import { bytesToHex, Hex } from "viem";
import { toast } from "sonner";

interface PageantShowdownProps {
    game?: Game;
}

interface GameState {
    chosenSide: PageantSide | null;
    outcome: PageantSide | null;
    isRevealing: boolean;
    payout: number | null;
    gameOver: boolean;
}

const initialGameState: GameState = {
    chosenSide: null,
    outcome: null,
    isRevealing: false,
    payout: null,
    gameOver: false,
};

const FLIP_DURATION_MS = 1600;

const PageantShowdownComponent: React.FC<PageantShowdownProps> = ({ game: gameProp }) => {
    const game = gameProp ?? pageantShowdown;
    const router = useRouter();
    const searchParams = useSearchParams();
    const replayIdString = searchParams.get("id");
    const walletBalance = 25;

    const [isGameOngoing, setIsGameOngoing] = useState<boolean>(false);
    const [currentView, setCurrentView] = useState<0 | 1 | 2>(0);
    const [betAmount, setBetAmount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [gameState, setGameState] = useState<GameState>(initialGameState);

    const [matchup, setMatchup] = useState<{ left: KodaEntry; right: KodaEntry }>(PLACEHOLDER_MATCHUP);
    useEffect(() => {
        setMatchup(pickMatchup());
    }, []);

    const shouldShowPNL: boolean = !!gameState.payout && gameState.payout > betAmount;

    const [currentGameId, setCurrentGameId] = useState<bigint>(
        replayIdString == null
            ? BigInt(bytesToHex(new Uint8Array(randomBytes(32))))
            : BigInt(replayIdString)
    );
    const [userRandomWord, setUserRandomWord] = useState<Hex>(
        bytesToHex(new Uint8Array(randomBytes(32)))
    );

    useEffect(() => {
        if (replayIdString !== null && replayIdString.length > 2) {
            setIsLoading(true);
            setCurrentGameId(BigInt(replayIdString));
        }
    }, [replayIdString]);

    const getActiveBetAmount = (): number => betAmount;
    const getTotalPayout = (): number => gameState.payout ?? 0;

    const playGame = async (gameId?: bigint, randomWord?: Hex): Promise<void> => {
        if (gameState.chosenSide === null) {
            toast.info("Pick a side before you flip.");
            return;
        }
        if (betAmount <= 0) {
            toast.info("Enter a bet amount first.");
            return;
        }

        setIsLoading(true);
        setIsGameOngoing(true);

        const gameIdToUse = gameId ?? currentGameId;
        const randomWordToUse = randomWord ?? userRandomWord;
        const chosenSide = gameState.chosenSide;

        try {
            console.log("playGame mock tx", {
                gameIdToUse,
                randomWordToUse,
                betAmount,
                chosenSide,
            });
            const receiptSuccess = true;

            if (!receiptSuccess) {
                toast.info("Something went wrong..");
                setIsLoading(false);
                setIsGameOngoing(false);
                return;
            }

            toast.success("Transaction complete!");
            setIsLoading(false);
            setCurrentView(1);
            setGameState((prev) => ({ ...prev, isRevealing: true }));

            const outcome: PageantSide = Math.random() < 0.5 ? "left" : "right";
            const won = outcome === chosenSide;
            const roundPayout = won ? betAmount * WIN_MULTIPLIER : 0;

            setTimeout(() => {
                setGameState((prev) => ({ ...prev, outcome, payout: roundPayout, isRevealing: false }));
                setCurrentView(2);
                setTimeout(() => {
                    setGameState((prev) => ({ ...prev, gameOver: true }));
                    setIsGameOngoing(false);
                }, won ? 1500 : 800);
            }, FLIP_DURATION_MS);
        } catch (error) {
            if (
                (error instanceof Error && error.message.includes("Transaction not found")) ||
                (typeof error === "string" && (error as string).includes("Transaction not found"))
            ) {
                console.warn("Ignoring a known timeout error.");
                return;
            }
            console.error("An unexpected error occurred:", error);
            toast.error("An unexpected error occurred.");
            setIsLoading(false);
            setIsGameOngoing(false);
        }
    };

    const handleReset = (isPlayingAgain: boolean = false): void => {
        if (!isPlayingAgain) {
            const newGameId = BigInt(bytesToHex(new Uint8Array(randomBytes(32))));
            const newUserWord = bytesToHex(new Uint8Array(randomBytes(32)));
            setCurrentGameId(newGameId);
            setUserRandomWord(newUserWord);
        }

        setGameState(initialGameState);
        setCurrentView(0);
        setIsLoading(false);
        setIsGameOngoing(false);
        setBetAmount(0);
        setMatchup(pickMatchup());

        if (replayIdString !== null) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("id");
            router.replace(`?${params.toString()}`, { scroll: false });
        }
    };

    const handlePlayAgain = async (): Promise<void> => {
        const newGameId = BigInt(bytesToHex(new Uint8Array(randomBytes(32))));
        const newUserWord = bytesToHex(new Uint8Array(randomBytes(32)));
        setCurrentGameId(newGameId);
        setUserRandomWord(newUserWord);

        const keepSide = gameState.chosenSide;
        handleReset(true);
        setGameState((prev) => ({ ...prev, chosenSide: keepSide }));

        await playGame(newGameId, newUserWord);
    };

    const handleRewatch = (): void => {
        if (gameState.outcome === null) return;

        const outcome = gameState.outcome;
        const chosenSide = gameState.chosenSide;
        const won = outcome === chosenSide;

        setCurrentView(1);
        setIsGameOngoing(false);
        setGameState((prev) => ({ ...prev, isRevealing: true, gameOver: false }));

        setTimeout(() => {
            setGameState((prev) => ({ ...prev, isRevealing: false }));
            setCurrentView(2);
            setTimeout(() => {
                setGameState((prev) => ({ ...prev, gameOver: true }));
            }, won ? 1500 : 800);
        }, FLIP_DURATION_MS);
    };

    const setupCardProps = {
        game,
        currentView,
        chosenSide: gameState.chosenSide,
        setChosenSide: (side: PageantSide) =>
            setGameState((prev) => ({ ...prev, chosenSide: side })),
        betAmount: currentView === 0 ? betAmount : getActiveBetAmount(),
        setBetAmount,
        isLoading,
        payout: gameState.payout,
        winMultiplier: WIN_MULTIPLIER,
        inReplayMode: replayIdString !== null,
        walletBalance,
        minBet: 1,
        maxBet: 100,
        onPlay: async () => await playGame(),
    };

    const gameWindowContent = (
        <PageantShowdownWindow
            game={game}
            chosenSide={gameState.chosenSide}
            outcome={gameState.outcome}
            isRevealing={gameState.isRevealing}
            gameCompleted={gameState.gameOver}
            betAmount={getActiveBetAmount()}
            payoutAmount={getTotalPayout()}
            leftKoda={matchup.left}
            rightKoda={matchup.right}
        />
    );

    return (
        <div>
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-8 lg:gap-10">
                <GameWindow
                    game={game}
                    currentGameId={currentGameId}
                    isLoading={isLoading}
                    isGameFinished={gameState.gameOver}
                    onPlayAgain={handlePlayAgain}
                    playAgainText="Play Again"
                    onRewatch={handleRewatch}
                    onReset={() => handleReset(false)}
                    betAmount={getActiveBetAmount()}
                    payout={gameState.payout}
                    inReplayMode={replayIdString !== null}
                    isUserOriginalPlayer={true}
                    showPNL={shouldShowPNL}
                    isGamePaused={false}
                    resultModalDelayMs={3200}
                >
                    {gameWindowContent}
                </GameWindow>

                <PageantShowdownSetupCard {...setupCardProps} placement="sidebar" />
            </div>
        </div>
    );
};

export default PageantShowdownComponent;