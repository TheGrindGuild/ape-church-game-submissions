// Multi-Card Keno (Vegas-style) — Config

// Game uses: 10-spot cards, 20 numbers drawn from 1-80

export const KENO_RANGE = 80;
export const NUM_DRAWN = 20;
export const SPOTS_PER_CARD = 10;

// Supported card packs
export const CARD_COUNTS = [4, 20] as const;
export type CardCount = (typeof CARD_COUNTS)[number];

// Credit-like bet steps (Vegas-ish)
export const BET_STEPS = [1, 2, 5, 10, 20, 50, 100] as const;
export type BetStep = (typeof BET_STEPS)[number];

// 10-spot paytable multipliers (per 1 credit) — placeholder, adjust after audit
// matches -> multiplier
export const PAYOUT_TABLE_10SPOT: Record<number, number> = {
  10: 10000,
  9: 1000,
  8: 100,
  7: 25,
  6: 8,
  5: 3,
  4: 2,
  3: 1,
  2: 0,
  1: 0,
  0: 0,
};

// Animation
export const DRAW_INTERVAL_MS = 120; // reveal one drawn number every N ms
export const HIT_FLASH_MS = 220;
