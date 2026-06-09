"use client";

import React from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function HowToPlayModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-xl rounded-xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-bold text-slate-100">How to Play</div>
            <div className="text-xs text-slate-400 mt-0.5">Multi-Card Keno</div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-2 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-sm"
          >
            Close
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm text-slate-200">
          <div>
            <div className="font-semibold text-slate-100">Goal</div>
            <div className="text-slate-300">Pick numbers. Then 20 numbers are drawn. Your matches determine payout.</div>
          </div>

          <div>
            <div className="font-semibold text-slate-100">Cards</div>
            <div className="text-slate-300">
              Each card has its own picks and its own bet. Only cards with at least 1 picked number are “in play” for the draw.
            </div>
          </div>

          <div>
            <div className="font-semibold text-slate-100">Overlaps (★)</div>
            <div className="text-slate-300">
              A ★ means that number was picked on 2+ cards. It’s just visual clarity — it still counts normally for each card.
            </div>
          </div>

          <div>
            <div className="font-semibold text-slate-100">Payouts</div>
            <div className="text-slate-300">
              Payouts use the Ape Church Keno paytable for your spot count (how many numbers you picked on that card).
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-xs text-slate-400">
            Tip: In 20-card mode, overlaps can help you track shared core numbers across cards.
          </div>
        </div>
      </div>
    </div>
  );
}
