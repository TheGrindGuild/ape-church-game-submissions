import { KENO_RANGE, NUM_DRAWN, SPOTS_PER_CARD } from "../multiCardKenoConfig";
import { payoutMultiplier } from "./kenoPaytables";

export function drawNumbers(): number[] {
  const all = Array.from({ length: KENO_RANGE }, (_, i) => i + 1);
  // Fisher–Yates shuffle
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, NUM_DRAWN);
}

export function countMatches(picks: number[], drawn: number[]): number {
  const set = new Set(drawn);
  let c = 0;
  for (const n of picks) if (set.has(n)) c++;
  return c;
}

export function payoutForCard(spotsPicked: number, matches: number, bet: number): number {
  if (spotsPicked <= 0) return 0;
  const mult = payoutMultiplier(spotsPicked, matches);
  return mult * bet;
}

export function randomCardPicks(count: number = SPOTS_PER_CARD): number[] {
  const all = Array.from({ length: KENO_RANGE }, (_, i) => i + 1);
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, Math.min(count, SPOTS_PER_CARD)).sort((a, b) => a - b);
}
