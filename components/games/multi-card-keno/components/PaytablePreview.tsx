"use client";

import React, { useMemo } from "react";
import { payoutMultiplier } from "../utils/kenoPaytables";

type Props = {
  spotsPicked: number;
  bet: number;
};

export default function PaytablePreview({ spotsPicked, bet }: Props) {
  const rows = useMemo(() => {
    if (spotsPicked <= 0) return [];
    const out: Array<{ hits: number; mult: number; win: number; full: boolean }> = [];

    // ApeChurch paytable is sparse. Show ALL listed win tiers (including 0-hit if it pays).
    for (let hits = 0; hits <= spotsPicked; hits++) {
      const mult = payoutMultiplier(spotsPicked, hits);
      if (mult > 0) {
        out.push({
          hits,
          mult,
          win: mult * bet,
          full: hits === spotsPicked,
        });
      }
    }

    // Show in natural order (Match 0..N) to mirror the ApeChurch UI.
    out.sort((a, b) => a.hits - b.hits);
    return out;
  }, [spotsPicked, bet]);

  return (
    <div className="mt-4 bg-slate-900/60 border border-slate-700 rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-slate-200">Paytable (this card)</div>
        <div className="text-xs text-slate-400">spots: {spotsPicked || 0}</div>
      </div>

      {spotsPicked <= 0 ? (
        <div className="text-xs text-slate-400">Pick some numbers to see payouts.</div>
      ) : rows.length === 0 ? (
        <div className="text-xs text-slate-400">No win tiers for this spot count (placeholder table).</div>
      ) : (
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-2 text-xs">
          <div className="text-slate-400 font-semibold">HIT</div>
          <div className="text-slate-400 font-semibold text-right">MULT</div>
          <div className="text-slate-400 font-semibold text-right">WIN</div>
          {rows.map((r) => (
            <React.Fragment key={r.hits}>
              <div className={r.full ? "text-amber-200 font-bold" : "text-slate-200"}>
                {r.hits}/{spotsPicked} {r.full ? "(FULL)" : ""}
              </div>
              <div className={r.full ? "text-amber-200 font-bold text-right" : "text-green-300 font-semibold text-right"}>
                {r.mult}x
              </div>
              <div className={r.win > 0 ? (r.full ? "text-amber-200 font-bold text-right" : "text-green-300 font-semibold text-right") : "text-slate-400 text-right"}>
                {r.win}
              </div>
            </React.Fragment>
          ))}
        </div>
      )}

      <div className="mt-2 text-[11px] text-slate-500">
        MULT is applied to this card's bet. Missing match tiers pay 0x.
      </div>
    </div>
  );
}
