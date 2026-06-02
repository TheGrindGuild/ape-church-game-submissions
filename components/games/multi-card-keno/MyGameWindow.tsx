"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { HIT_FLASH_MS } from "./multiCardKenoConfig";
import { Howl } from "howler";
import type { KenoCard, CardResult } from "./MyGame";
import KenoBoardSplit from "./components/KenoBoardSplit";
import DrawCardSummary from "./components/DrawCardSummary";
import GameResultsModal from "@/components/shared/GameResultsModal";
import { myGame } from "./myGameConfig";

type Props = {
  mode: "draw";
  cards: KenoCard[];
  overlaps: Map<number, number>;
  totalBet: number;
  drawn: number[];
  results: CardResult[];
  totalPayout: number;
  onBack: () => void;
  onReset: () => void;
  onPlayAgain: () => void;
  muteSfx?: boolean;
};

export default function MyGameWindow(props: Props) {
  const { drawn, cards, totalBet, totalPayout, muteSfx = false } = props;
  const [revealed, setRevealed] = useState<number>(0);
  const [flashNum, setFlashNum] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [speed, setSpeed] = useState<0 | 1 | 2>(1); // 0 slow, 1 med, 2 fast

  const sfxDrawRef = useRef<Howl | null>(null);
  const sfxHitRef = useRef<Howl | null>(null);

  const drawIntervalMs = speed === 0 ? 180 : speed === 2 ? 70 : 120;

  // Load SFX (local testing). Later we can route mute/volume through the template GameWindow controls.
  useEffect(() => {
    sfxDrawRef.current?.unload();
    sfxHitRef.current?.unload();

    sfxDrawRef.current = new Howl({
      src: ["/submissions/multi-card-keno/audio/keno-draw-miss.mp3"],
      volume: 0.6,
      mute: muteSfx,
    });

    sfxHitRef.current = new Howl({
      src: ["/submissions/multi-card-keno/audio/keno-hit.mp3"],
      volume: 0.8,
      mute: muteSfx,
    });

    return () => {
      sfxDrawRef.current?.unload();
      sfxHitRef.current?.unload();
      sfxDrawRef.current = null;
      sfxHitRef.current = null;
    };
  }, [muteSfx]);

  useEffect(() => {
    sfxDrawRef.current?.mute(muteSfx);
    sfxHitRef.current?.mute(muteSfx);
  }, [muteSfx]);

  useEffect(() => {
    setShowResults(false);
    setRevealed(0);
    let i = 0;
    const t = setInterval(() => {
      i++;
      setRevealed(i);
      const num = drawn[i - 1];
      setFlashNum(num);

      // SFX per reveal: hit sound if the number is a hit on ANY card; otherwise draw/miss.
      const isHit = cards.some((c) => c.picks.includes(num));
      if (isHit) sfxHitRef.current?.play();
      else sfxDrawRef.current?.play();

      setTimeout(() => setFlashNum((cur) => (cur === num ? null : cur)), HIT_FLASH_MS);
      if (i >= drawn.length) {
        clearInterval(t);
        // Show results overlay after the last ball drops
        // slight pause so the player can register the final board state
        setTimeout(() => setShowResults(true), 900);
      }
    }, drawIntervalMs);
    return () => clearInterval(t);
  }, [drawn, drawIntervalMs, cards]);

  const revealedDrawn = useMemo(() => drawn.slice(0, revealed), [drawn, revealed]);
  const revealedSet = useMemo(() => new Set(revealedDrawn), [revealedDrawn]);
  // Frequency map of picked numbers across all cards (for unified board view)
  const pickedFreq = useMemo(() => {
    const freq = new Map<number, number>();
    for (const c of cards) {
      for (const n of c.picks) freq.set(n, (freq.get(n) ?? 0) + 1);
    }
    return freq;
  }, [cards]);

  return (
    <div className="w-full max-w-6xl mx-auto bg-slate-900/40 border border-purple-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-2xl font-bold text-purple-200">Draw</h2>
          <p className="text-sm text-slate-300">20 numbers drawn. Hits flash as numbers reveal.</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">Bet / Payout</div>
          <div className="text-lg font-bold">
            {totalBet} →{" "}
            {revealed < drawn.length ? (
              <span className="text-slate-400">Drawing…</span>
            ) : (
              <span className={totalPayout > 0 ? "text-green-300" : "text-slate-200"}>{totalPayout}</span>
            )}
          </div>
        </div>
      </div>

      {/* Main: Split keno board (Vegas-style) + per-card live summary */}
      <div className="mb-4 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-3 items-start">
        {/* Desktop left panel */}
        <div className="hidden lg:block">
          <DrawCardSummary cards={cards} revealedDrawn={revealedDrawn} />
        </div>

        <KenoBoardSplit
          pickedFreq={pickedFreq}
          drawnSet={revealedSet}
          flashNum={flashNum}
          centerText={
            revealed < drawn.length
              ? `DRAWING ${Math.min(revealed + 1, drawn.length)}/${drawn.length}`
              : "DRAW COMPLETE"
          }
          subText={`Bet ${totalBet} • Speed: ${speed === 0 ? "SLOW" : speed === 2 ? "FAST" : "MED"}`}
        />
      </div>

      {/* Speed selector (Vegas arrows) */}
      <div className="mb-4 flex items-center justify-center gap-3">
        <div className="text-xs text-slate-400">SPEED</div>
        {[0, 1, 2].map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s as 0 | 1 | 2)}
            className={`px-3 py-1 rounded border text-xs font-semibold transition ${
              speed === s
                ? "bg-amber-500/30 border-amber-300 text-amber-100"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {s === 0 ? "◀" : s === 1 ? "◀◀" : "◀◀◀"}
          </button>
        ))}
      </div>

      {/* Cards intentionally hidden in draw view for Vegas-style full-board focus.
          We can add a toggle later if desired. */}

      <GameResultsModal
        isOpen={showResults}
        payout={totalPayout}
        betAmount={totalBet}
        usdMode={false}
        apePrice={1}
        isLoading={false}
        gameTitle={myGame.title}
        onReset={props.onReset}
        onPlayAgain={props.onPlayAgain}
        onRewatch={undefined}
        showRewatchOption={false}
        showPlayAgainOption={true}
        showPNL={true}
      />

      <div className="flex gap-2">
        <button
          onClick={props.onBack}
          className="px-4 py-2 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700"
        >
          Back
        </button>
        <button
          onClick={props.onPlayAgain}
          className="flex-1 px-4 py-2 rounded bg-purple-600 border border-purple-300 hover:bg-purple-700 font-semibold"
        >
          Play Again
        </button>
        <button
          onClick={props.onReset}
          className="px-4 py-2 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700"
        >
          Reset
        </button>
      </div>

      {/* Mobile summary panel (single page scroll; no nested scroll box) */}
      <div className="mt-3 lg:hidden">
        <DrawCardSummary cards={cards} revealedDrawn={revealedDrawn} />
      </div>
    </div>
  );
}
