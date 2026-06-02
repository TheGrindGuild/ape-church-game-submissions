"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Howl } from "howler";
import { CardCount, CARD_COUNTS, BetStep } from "./multiCardKenoConfig";
import MyGameSetupCard from "./MyGameSetupCard";
import MyGameWindow from "./MyGameWindow";
import { drawNumbers, countMatches, payoutForCard, randomCardPicks } from "./utils/kenoMath";
import type { Game } from "@/lib/games";

export type KenoCard = {
  id: number;
  picks: number[]; // length=10
  bet: BetStep;
};

export type CardResult = {
  id: number;
  matches: number;
  payout: number;
};

export type KenoGameState = {
  cardCount: CardCount;
  cards: KenoCard[];
  activeCardIndex: number;
  speed: 0 | 1 | 2; // 0 slow, 1 med, 2 fast
  drawn: number[];
  revealedCount: number; // animation progress
  results: CardResult[];
  totalBet: number;
  totalPayout: number;
};

const DEFAULT_BET: BetStep = 1;

function makeCards(count: CardCount): KenoCard[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    picks: [],
    bet: DEFAULT_BET,
  }));
}

type MyGameProps = {
  game?: Game;
};

const MyGame: React.FC<MyGameProps> = () => {
  const bgmRef = useRef<Howl | null>(null);
  const [muteMusic, setMuteMusic] = useState(false);
  const [muteSfx, setMuteSfx] = useState(false);

  const [currentView, setCurrentView] = useState<0 | 1 | 2>(0); // 0 setup, 1 draw/ongoing, 2 game over

  // BGM (safe local loop). Avoids GameWindow/background changes while enabling your provided loop.
  useEffect(() => {
    bgmRef.current?.unload();
    const bgm = new Howl({
      src: ["/submissions/multi-card-keno/audio/keno-bgm.mp3"],
      loop: true,
      volume: 0.5,
    });
    bgmRef.current = bgm;
    bgm.play();

    return () => {
      bgm.unload();
      bgmRef.current = null;
    };
  }, []);

  useEffect(() => {
    const bgm = bgmRef.current;
    if (!bgm) return;
    bgm.mute(muteMusic);
    if (!muteMusic && !bgm.playing()) bgm.play();
  }, [muteMusic]);

  const [state, setState] = useState<KenoGameState>(() => ({
    cardCount: 4,
    cards: makeCards(4),
    activeCardIndex: 0,
    speed: 1,
    drawn: [],
    revealedCount: 0,
    results: [],
    totalBet: 0,
    totalPayout: 0,
  }));

  // Vegas-ish behavior: only cards with at least 1 pick are considered "in play" for the draw.
  const activeCards = useMemo(() => state.cards.filter((c) => c.picks.length >= 1), [state.cards]);

  const overlaps = useMemo(() => {
    const freq = new Map<number, number>();
    for (const c of activeCards) {
      for (const n of c.picks) freq.set(n, (freq.get(n) ?? 0) + 1);
    }
    return freq;
  }, [activeCards]);

  // Total bet should reflect only the cards actually in play.
  const totalBet = useMemo(() => activeCards.reduce((s, c) => s + (c.bet ?? 0), 0), [activeCards]);

  const setCardCount = (count: CardCount) => {
    setState((prev) => ({
      ...prev,
      cardCount: count,
      cards: makeCards(count),
      activeCardIndex: 0,
      drawn: [],
      revealedCount: 0,
      results: [],
      totalBet: 0,
      totalPayout: 0,
    }));
    setCurrentView(0);
  };

  const setSpeed = (speed: 0 | 1 | 2) => setState((p) => ({ ...p, speed }));

  const setActiveCardIndex = (idx: number) => setState((p) => ({ ...p, activeCardIndex: idx }));

  const updateActiveCardPicks = (nextPicks: number[], cardIndex?: number) => {
    setState((prev) => {
      const idx = typeof cardIndex === "number" ? cardIndex : prev.activeCardIndex;
      const cards = [...prev.cards];
      cards[idx] = { ...cards[idx], picks: nextPicks };
      return { ...prev, cards };
    });
  };

  const updateActiveCardBet = (bet: BetStep) => {
    setState((prev) => {
      const cards = [...prev.cards];
      cards[prev.activeCardIndex] = { ...cards[prev.activeCardIndex], bet };
      return { ...prev, cards };
    });
  };

  const copyBetToAll = () => {
    setState((prev) => {
      const bet = prev.cards[prev.activeCardIndex].bet;
      return { ...prev, cards: prev.cards.map((c) => ({ ...c, bet })) };
    });
  };

  const autoPickActive = () => updateActiveCardPicks(randomCardPicks());

  const clearActive = () => updateActiveCardPicks([]);

  // Direct play: setup -> draw (no separate overview screen)
  const playGame = () => {
    placeBetAndDraw();
  };

  const placeBetAndDraw = () => {
    // Allow 0–10 picks per card. Only "active" cards (>=1 pick) participate.
    if (activeCards.length === 0) {
      alert("Pick at least 1 number on at least 1 card.");
      return;
    }

    const drawn = drawNumbers();

    // Results/payouts only for active cards (in-play). Inactive cards should not affect draw UI or totals.
    const results: CardResult[] = activeCards.map((c) => {
      const m = countMatches(c.picks, drawn);
      const payout = payoutForCard(c.picks.length, m, c.bet);
      return { id: c.id, matches: m, payout };
    });
    const totalPayout = results.reduce((s, r) => s + r.payout, 0);

    setState((prev) => ({
      ...prev,
      drawn,
      revealedCount: 0,
      results,
      totalBet,
      totalPayout,
    }));

    setCurrentView(1);
  };

  const handleReset = () => {
    setState((prev) => ({
      ...prev,
      cards: makeCards(prev.cardCount),
      activeCardIndex: 0,
      drawn: [],
      revealedCount: 0,
      results: [],
      totalBet: 0,
      totalPayout: 0,
    }));
    setCurrentView(0);
  };

  const handlePlayAgain = () => {
    // keep cards as-is, just redraw
    placeBetAndDraw();
  };

  return (
    <div className="relative w-full h-full p-4 text-white">
      {currentView === 0 && (
        <MyGameSetupCard
          cardCount={state.cardCount}
          cardCounts={CARD_COUNTS as unknown as CardCount[]}
          cards={state.cards}
          activeCardIndex={state.activeCardIndex}
          overlaps={overlaps}
          totalBet={totalBet}
          onSetCardCount={setCardCount}
          onSetActiveCardIndex={setActiveCardIndex}
          onUpdateActiveCardPicks={updateActiveCardPicks}
          onUpdateActiveCardBet={updateActiveCardBet}
          onCopyBetToAll={copyBetToAll}
          onAutoPickActive={autoPickActive}
          onClearActive={clearActive}
          speed={state.speed}
          onChangeSpeed={setSpeed}
          onPlay={playGame}
        />
      )}

      {currentView === 1 && (
        <MyGameWindow
          mode="draw"
          // Draw view should reflect only the cards that were actually in-play (picked >= 1).
          // This keeps overlaps/stars and picked highlighting Vegas-correct.
          cards={activeCards}
          overlaps={overlaps}
          totalBet={state.totalBet}
          drawn={state.drawn}
          results={state.results}
          totalPayout={state.totalPayout}
          onBack={() => setCurrentView(0)}
          onReset={handleReset}
          onPlayAgain={handlePlayAgain}
          muteSfx={muteSfx}
        />
      )}
      {/* Audio toggles (ApeChurch-style placement) */}
      <div className="absolute bottom-6 right-6 z-40 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMuteSfx((v) => !v)}
          className={`text-2xl leading-none transition ${muteSfx ? "opacity-40" : "opacity-100 hover:opacity-80"}`}
          title={muteSfx ? "Unmute SFX" : "Mute SFX"}
          aria-label={muteSfx ? "Unmute sound effects" : "Mute sound effects"}
        >
          {muteSfx ? "🔇" : "🔊"}
        </button>
        <button
          type="button"
          onClick={() => setMuteMusic((v) => !v)}
          className={`text-2xl leading-none transition ${muteMusic ? "opacity-40" : "opacity-100 hover:opacity-80"}`}
          title={muteMusic ? "Unmute music" : "Mute music"}
          aria-label={muteMusic ? "Unmute music" : "Mute music"}
        >
          {muteMusic ? "🎵🚫" : "🎵"}
        </button>
      </div>
    </div>
  );
};

export default MyGame;
