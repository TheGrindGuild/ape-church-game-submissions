"use client";

import React, { useMemo } from "react";

type Props = {
  pickedFreq: Map<number, number>; // number -> how many cards picked it
  drawnSet: Set<number>;
  flashNum: number | null;
};

export default function KenoBoard80({ pickedFreq, drawnSet, flashNum }: Props) {
  const numbers = useMemo(() => Array.from({ length: 80 }, (_, i) => i + 1), []);

  return (
    <div className="bg-slate-950/40 border border-slate-700 rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-slate-200">Keno Board (1–80)</div>
        <div className="text-xs text-slate-400">Purple=picked • Amber=overlap • Blue=drawn • Yellow=now</div>
      </div>
      <div className="grid grid-cols-10 md:grid-cols-16 gap-1">
        {numbers.map((n) => {
          const freq = pickedFreq.get(n) ?? 0;
          const picked = freq >= 1;
          const overlap = freq >= 2;
          const drawn = drawnSet.has(n);
          const flash = flashNum === n;
          const hit = picked && drawn;

          let cls = "bg-slate-800 text-slate-300 border-slate-700";
          if (picked) cls = "bg-purple-600/60 text-white border-purple-300";
          if (overlap) cls = "bg-amber-600/35 text-amber-100 border-amber-300";
          if (drawn) cls = "bg-blue-600 text-white border-blue-300";
          if (hit) cls = "bg-green-500 text-white border-green-300";
          if (flash) cls = "bg-yellow-400 text-slate-900 border-yellow-200";

          return (
            <div
              key={n}
              className={`h-7 rounded text-xs font-bold flex items-center justify-center border transition ${cls}`}
            >
              {n}
            </div>
          );
        })}
      </div>
    </div>
  );
}
