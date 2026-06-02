"use client";

import React, { useMemo } from "react";

type Props = {
  pickedFreq: Map<number, number>;
  drawnSet: Set<number>;
  flashNum: number | null;
  centerText: string;
  subText?: string;
};

function tileClass(freq: number, drawn: boolean, flash: boolean) {
  const picked = freq >= 1;
  const overlap = freq >= 2;
  const hit = picked && drawn;

  // Base
  let cls = "bg-slate-800 text-slate-300 border-slate-700";

  // Picked overlays stay visible in draw view
  if (picked) cls = "bg-purple-600/60 text-white border-purple-300";

  // Overlap gets a dedicated look (and a ★ instead of the number)
  if (overlap) cls = "bg-amber-600/35 text-amber-100 border-amber-300";

  // Drawn / hit should still read.
  // Overlaps remain ★ always, but should turn green when they HIT.
  if (!overlap && drawn) cls = "bg-blue-600 text-white border-blue-300";
  if (hit) cls = "bg-green-500 text-white border-green-300";

  // Flash should always win for readability (including overlaps)
  if (flash) cls = "bg-yellow-400 text-slate-900 border-yellow-200";

  return cls;
}

export default function KenoBoardSplit({ pickedFreq, drawnSet, flashNum, centerText, subText }: Props) {
  const topNums = useMemo(() => Array.from({ length: 40 }, (_, i) => i + 1), []);
  const botNums = useMemo(() => Array.from({ length: 40 }, (_, i) => i + 41), []);

  const renderRowGrid = (nums: number[]) => (
    <div className="grid grid-cols-10 gap-1">
      {nums.map((n) => {
        const freq = pickedFreq.get(n) ?? 0;
        const drawn = drawnSet.has(n);
        const flash = flashNum === n;
        const overlap = freq >= 2;

        return (
          <div
            key={n}
            className={`aspect-square w-full rounded text-xs font-bold flex items-center justify-center border transition ${tileClass(freq, drawn, flash)}`}
            aria-label={overlap ? "Overlapping pick" : undefined}
          >
            {overlap ? "★" : n}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="bg-slate-950/40 border border-slate-700 rounded p-3 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-slate-200">Keno Board</div>
        <div className="text-xs text-slate-400">Purple=picked • Amber=overlap • Blue=drawn • Yellow=now</div>
      </div>

      {/* Top (1-40) */}
      <div className="mb-2">{renderRowGrid(topNums)}</div>

      {/* Center status bar */}
      <div className="my-2 bg-slate-900/70 border border-slate-700 rounded px-3 py-2">
        <div className="text-center font-semibold text-slate-100 tracking-wide">{centerText}</div>
        {subText && <div className="text-center text-xs text-slate-300 mt-0.5">{subText}</div>}
      </div>

      {/* Bottom (41-80) */}
      <div className="mt-2">{renderRowGrid(botNums)}</div>
    </div>
  );
}
