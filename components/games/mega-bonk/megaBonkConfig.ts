import { Game } from "@/lib/games";

export const DIFFICULTY_MIN = 5;
export const DIFFICULTY_MAX = 95;
export const DIFFICULTY_PRESETS = [10, 25, 50, 75, 90];
export const MIN_BET = 1;
export const MAX_BET = 500;
export const MAX_PROFIT = 1000;
export const SCORE_MIN = 1;
export const SCORE_MAX = 100;

export const METER_COUNT_DURATION_MS = 2000;
// Meter starts at frame 31 of Wade_Punch (30 fps = 1033 ms) after BagDrop (333 ms)
export const PUNCH_DELAY_MS = 333 + Math.round((31 / 30) * 1000); // 1366 ms
// Wade_Punch is 2s long and starts after the 333ms bag-drop lead-in.
export const RESULT_ANIM_DELAY_MS = 333 + 2000; // 2333 ms
export const RESULT_SFX_DUCK_MULTIPLIER = 0.26;
export const RESULT_SFX_RESTORE_DELAY_MS = 260;
export const WIN_SFX_DURATION_MS = 3402;
export const LOSE_SFX_DURATION_MS = 6467;

export interface MegaBonkGameState {
  betAmount: number;
  difficulty: number;
  score: number | null;
  won: boolean | null;
  payout: number | null;
}

export const initialGameState: MegaBonkGameState = {
  betAmount: 0,
  difficulty: 50,
  score: null,
  won: null,
  payout: null,
};

export const getWinChance = (difficulty: number): number => 100 - difficulty;

export const calcPotentialPayout = (betAmount: number, difficulty: number): number => {
  const winChance = getWinChance(difficulty);
  if (winChance <= 0 || betAmount <= 0) return 0;
  return parseFloat(((betAmount * 100) / winChance).toFixed(4));
};

export const megaBonk: Game = {
  title: "Mega Bonk",
  description:
    "Set your target difficulty, place your APE bet, and BONK the machine. Score higher than the target to win!",
  gameAddress: "",
  gameBackground: "/submissions/mega-bonk/background.png",
  card: "/submissions/mega-bonk/card.png",
  banner: "/submissions/mega-bonk/banner.png",
  song: "/submissions/mega-bonk/audio/music.mp3",
  themeColorBackground: "#12181C",
  payouts: {},
};
