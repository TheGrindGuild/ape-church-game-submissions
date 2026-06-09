"use client";

import React from "react";

type Props = {
  speed: 0 | 1 | 2;
  onChange: (s: 0 | 1 | 2) => void;
};

export default function SpeedSelector({ speed, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-xs text-slate-400">SPEED</div>
      {[0, 1, 2].map((s) => (
        <button
          key={s}
          onClick={() => onChange(s as 0 | 1 | 2)}
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
  );
}
