"use client";

import React, { useMemo } from "react";
import type { KenoCard } from "../MyGame";
import { countMatches, payoutForCard } from "../utils/kenoMath";

type Row = {
  label: string;
  letter: string;
  color: string;
  bet: number;
  marked: number;
  hit: number;
  pay: number;
};

function formatApe(n: number): string {
  // Test-mode display: treat local bet units as APE 1:1.
  // Keep formatting compact and readable.
  const v = Math.round((n + Number.EPSILON) * 100) / 100;
  return `${v}`;
}

type Props = {
  cards: KenoCard[];
  // Only the revealed (so-far) drawn numbers during animation.
  revealedDrawn: number[];
  title?: string;
};

export default function DrawCardSummary({ cards, revealedDrawn, title = "CURRENT: ALL" }: Props) {
  const rows = useMemo<Row[]>(() => {
    return cards.map((c, idx) => {
      const marked = c.picks.length;
      const hit = countMatches(c.picks, revealedDrawn);
      const pay = payoutForCard(marked, hit, c.bet);

      const letter = String.fromCharCode(65 + idx);

      // Reuse the same palette concept as setup: repeatable colors by card index.
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
      const color = CARD_COLORS[idx % CARD_COLORS.length];

      return {
        label: `Card ${letter}`,
        letter,
        color,
        bet: c.bet,
        marked,
        hit,
        pay,
      };
    });
  }, [cards, revealedDrawn]);

  const cardsPlayed = useMemo(() => cards.filter((c) => c.picks.length >= 1).length, [cards]);

  return (
    <div className="bg-slate-950/40 border border-slate-700 rounded p-3">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-sm font-bold text-slate-100 tracking-wide truncate">{title}</div>
        <div className="text-[11px] text-slate-400 whitespace-nowrap">Cards: {cardsPlayed}</div>
      </div>

      <div className="grid grid-cols-[1fr_44px_56px_40px_64px] gap-x-2 gap-y-1 text-[11px]">
        <div className="text-slate-400 font-semibold">CARDS</div>
        <div className="text-slate-400 font-semibold text-right">BET</div>
        <div className="text-slate-400 font-semibold text-right">MARKED</div>
        <div className="text-slate-400 font-semibold text-right">HIT</div>
        <div className="text-slate-400 font-semibold text-right">PAY</div>

        {rows.map((r) => (
          <React.Fragment key={r.label}>
            <div className="text-slate-200 font-semibold truncate">
              Card <span style={{ color: r.color }}>{r.letter}</span>
            </div>
            <div className="text-slate-200 text-right">{formatApe(r.bet)}</div>
            <div className="text-slate-200 text-right">{r.marked}</div>
            <div
              className={
                r.hit > 0 ? "text-green-300 font-semibold text-right" : "text-slate-200 text-right"
              }
            >
              {r.hit}
            </div>
            <div className={r.pay > 0 ? "text-amber-200 font-bold text-right" : "text-slate-400 text-right"}>
              {r.pay > 0 ? formatApe(r.pay) : "—"}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
