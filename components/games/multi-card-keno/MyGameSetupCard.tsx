"use client";

import React, { useMemo, useState } from "react";
import { BET_STEPS, BetStep, CardCount, SPOTS_PER_CARD } from "./multiCardKenoConfig";
import type { KenoCard } from "./MyGame";
import PaytablePreview from "./components/PaytablePreview";
import SpeedSelector from "./components/SpeedSelector";
import HowToPlayModal from "./components/HowToPlayModal";

type Props = {
  cardCount: CardCount;
  cardCounts: CardCount[];
  cards: KenoCard[];
  activeCardIndex: number;
  overlaps: Map<number, number>;
  totalBet: number;
  onSetCardCount: (c: CardCount) => void;
  onSetActiveCardIndex: (idx: number) => void;
  onUpdateActiveCardPicks: (picks: number[], cardIndex?: number) => void;
  onUpdateActiveCardBet: (bet: BetStep) => void;
  onCopyBetToAll: () => void;
  onAutoPickActive: () => void;
  onClearActive: () => void;
  speed: 0 | 1 | 2;
  onChangeSpeed: (s: 0 | 1 | 2) => void;
  onPlay: () => void;
};

function isOverlap(overlaps: Map<number, number>, n: number) {
  return (overlaps.get(n) ?? 0) >= 2;
}

export default function MyGameSetupCard(props: Props) {
  const [showHowTo, setShowHowTo] = useState(false);

  const active = props.cards[props.activeCardIndex];

  const pickedSet = useMemo(() => new Set(active.picks), [active.picks]);

  // Card color palette (repeatable)
  const CARD_COLORS = [
    "#ef4444", // red
    "#22c55e", // green
    "#3b82f6", // blue
    "#a855f7", // purple
    "#f59e0b", // amber
    "#06b6d4", // cyan
    "#f97316", // orange
    "#84cc16", // lime
    "#ec4899", // pink
    "#14b8a6", // teal
  ];

  const cardColorForIndex = (idx: number) => CARD_COLORS[idx % CARD_COLORS.length];
  const activeColor = cardColorForIndex(active.id - 1);

  const togglePick = (n: number) => {
    const next = new Set(active.picks);
    if (next.has(n)) next.delete(n);
    else {
      if (next.size >= SPOTS_PER_CARD) return;
      next.add(n);
    }

    // Important: pass explicit card index so rapid switching (especially in 20-card mode)
    // cannot apply picks to the wrong card due to stale closures/renders.
    props.onUpdateActiveCardPicks(Array.from(next).sort((a, b) => a - b), props.activeCardIndex);
  };

  const canGoOverview = props.cards.some((c) => c.picks.length >= 1);
  const activeCount = props.cards.filter((c) => c.picks.length >= 1).length;

  return (
    <div
      className="w-full max-w-6xl mx-auto bg-slate-900/40 border border-purple-700 rounded-xl p-4"
      style={{ borderColor: activeColor }}
    >
      <HowToPlayModal isOpen={showHowTo} onClose={() => setShowHowTo(false)} />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-purple-200">Multi-Card Keno</h2>
          <p className="text-sm text-slate-300">Vegas-style: each card has its own 10 picks + its own bet.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHowTo(true)}
            className="px-3 py-2 rounded font-semibold border bg-slate-800 border-slate-700 hover:bg-slate-700"
            aria-label="How to play"
            title="How to play"
          >
            i
          </button>

          {props.cardCounts.map((c) => (
            <button
              key={c}
              onClick={() => props.onSetCardCount(c)}
              className={`px-3 py-2 rounded font-semibold border ${
                props.cardCount === c
                  ? "bg-purple-600 border-purple-300"
                  : "bg-slate-800 border-slate-700 hover:bg-slate-700"
              }`}
            >
              {c} Cards
            </button>
          ))}
        </div>
      </div>

      {/* Card selector + speed controls (kept in normal flow to avoid overlap) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {props.cards.map((c, idx) => {
            const complete = c.picks.length === SPOTS_PER_CARD;
            return (
              <button
                key={c.id}
                onClick={() => props.onSetActiveCardIndex(idx)}
                style={idx === props.activeCardIndex ? { backgroundColor: `${activeColor}55`, borderColor: activeColor } : undefined}
                className={`px-2 py-1 rounded border text-sm ${
                  idx === props.activeCardIndex
                    ? "border-2 text-white"
                    : "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
                }`}
              >
                Card <span style={{ color: cardColorForIndex(c.id - 1) }}>{String.fromCharCode(65 + (c.id - 1))}</span>
                <span className={`ml-2 text-xs ${complete ? "text-green-300" : "text-slate-400"}`}>
                  {c.picks.length}/{SPOTS_PER_CARD}
                </span>
              </button>
            );
          })}
        </div>

        <div className="md:ml-auto md:pl-2 text-left md:text-right">
          <SpeedSelector speed={props.speed} onChange={props.onChangeSpeed} />
        </div>
      </div>

      {/* Active card controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-900/60 border border-slate-700 rounded p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm font-semibold text-slate-200">Active Card</div>
          </div>

          {/* Card label */}
          <div className="mt-1">
            <div className="text-slate-300">
              Card <span style={{ color: activeColor }}>{String.fromCharCode(65 + (active.id - 1))}</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">Pick exactly {SPOTS_PER_CARD} numbers.</div>
          </div>

          <div className="mt-3">
            <div className="text-sm font-semibold text-slate-200 mb-2">Bet (credits)</div>
            <div className="flex flex-wrap gap-2">
              {BET_STEPS.map((b) => (
                <button
                  key={b}
                  onClick={() => props.onUpdateActiveCardBet(b)}
                  className={`px-3 py-1 rounded border text-sm font-semibold ${
                    active.bet === b ? "bg-purple-600 border-purple-300" : "bg-slate-800 border-slate-700 hover:bg-slate-700"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={props.onCopyBetToAll}
                className="px-3 py-2 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-sm"
              >
                Copy bet to all
              </button>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={props.onAutoPickActive}
              className="flex-1 px-3 py-2 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-sm"
            >
              Auto-pick 10
            </button>
            <button
              onClick={props.onClearActive}
              className="flex-1 px-3 py-2 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-sm"
            >
              Clear
            </button>
          </div>

          <PaytablePreview spotsPicked={active.picks.length} bet={active.bet} />

          <div className="mt-4">
            <div className="text-xs text-slate-400 mb-1">Selected</div>
            <div className="flex flex-wrap gap-1">
              {active.picks.map((n) => (
                <span
                  key={n}
                  className={`px-2 py-1 rounded text-xs font-bold border ${
                    isOverlap(props.overlaps, n)
                      ? "bg-amber-600/30 border-amber-400 text-amber-100"
                      : "bg-slate-800 border-slate-700 text-slate-200"
                  }`}
                >
                  {n}
                </span>
              ))}
              {active.picks.length === 0 && <span className="text-xs text-slate-500">none</span>}
            </div>
          </div>
        </div>

        {/* Number grid */}
        <div className="md:col-span-2 bg-slate-900/60 border border-slate-700 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-slate-200">Pick Numbers (1–80)</div>
            <div className="text-xs text-slate-400">Overlaps glow amber</div>
          </div>
          <div className="grid grid-cols-10 gap-1 max-h-[520px] overflow-auto p-2 bg-slate-950/40 rounded">
            {Array.from({ length: 80 }, (_, i) => i + 1).map((n) => {
              const picked = pickedSet.has(n);
              const overlap = isOverlap(props.overlaps, n);
              return (
                <button
                  key={n}
                  onClick={() => togglePick(n)}
                  className={`h-8 rounded text-xs font-bold border transition ${
                    picked
                      ? overlap
                        ? "bg-amber-500/40 border-amber-300 text-amber-100"
                        : "bg-purple-600 border-purple-300 text-white"
                      : overlap
                        ? "bg-slate-900 border-amber-600/60 text-slate-200"
                        : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Active cards: {activeCount}/{props.cards.length} • Card {String.fromCharCode(65 + (active.id - 1))}: {active.picks.length}/{SPOTS_PER_CARD} picks
            </div>
            <button
              disabled={!canGoOverview}
              onClick={props.onPlay}
              className={`px-4 py-2 rounded font-semibold border ${
                canGoOverview
                  ? "bg-purple-600 border-purple-300 hover:bg-purple-700"
                  : "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
              }`}
            >
              Place Bet / Draw
            </button>
          </div>
          {!canGoOverview && (
            <div className="mt-2 text-xs text-slate-400">
              Pick at least 1 number on at least 1 card to continue. (Max {SPOTS_PER_CARD} per card.)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
