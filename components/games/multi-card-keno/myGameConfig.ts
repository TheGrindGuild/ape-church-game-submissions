import { Game } from "@/lib/games";

// Multi-Card Keno configuration + metadata for Ape Church template
// This file MUST export `myGame` for the template home page.

export const myGame: Game = {
  title: "Multi-Card Keno",
  description:
    "Pick 1–10 numbers and play 4 or 20 cards at once. Same draw across all cards. Fair, transparent paytable.",
  gameAddress: "0x0000000000000000000000000000000000000000",

  gameBackground: "/submissions/multi-card-keno/background.png",
  card: "/submissions/multi-card-keno/card.jpg",
  banner: "/submissions/multi-card-keno/banner.png",
  advanceToNextStateAsset: "/submissions/multi-card-keno/advance-button.png",
  themeColorBackground: "#4C1D95",

  song: "/submissions/multi-card-keno/audio/keno-bgm.mp3",

  // Not used by keno skeleton yet, but template expects this shape.
  // Keep a minimal safe stub.
  payouts: {},
};

// Keno game constants (used by the React components)
export const PAYOUT_TABLE: Record<number, number> = {
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

export const MIN_NUMBERS = 2;
export const MAX_NUMBERS = 10;
export const MIN_BET = 0.1;
export const MAX_BET = 100;
export const CARD_COUNTS = [4, 9, 20];
export const DEFAULT_CARD_COUNT = 4;
export const NUM_DRAWN = 20;
export const KENO_RANGE = 80;
