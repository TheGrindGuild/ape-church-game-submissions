export type SymbolId =
  | 'golden_cub'          // scatter — 3+ triggers free spins
  | 'gold_apechain_tiger' // jackpot — highest paying (symbol3)
  | 'apechain_cowboy'     // tier 2 (symbol8)
  | 'og_top_hat'          // tier 3 (symbol1)
  | 'green_cub'           // tier 4 (symbol4)
  | 'camo_cub'            // tier 5 — most common (symbol6)
  | 'purple_cub';         // wild — substitutes all except scatter (symbol7)

export type GamePhase =
  | 'IDLE'
  | 'SPINNING'
  | 'EVALUATING'
  | 'WIN_DISPLAY'
  | 'FREE_SPINS_INTRO'
  | 'FREE_SPINS'
  | 'FREE_SPINS_END';


export interface WinLine {
  lineIndex: number;
  symbol: SymbolId;
  count: number;
  win: number;         // in coins (betPerLine units)
  positions: number[]; // [row for reel0, row for reel1, ...] length = count
}

export interface WinResult {
  lines: WinLine[];
  totalWin: number;       // sum of all line wins (in betPerLine units)
  scatterCount: number;
  triggeredFreeSpins: boolean;
  freeSpinsAwarded: number;
  bigWin: boolean;        // true if totalWin > 20× betPerLine
  megaWin: boolean;       // true if totalWin > 50× betPerLine
}

export interface SpinRecord {
  seed: number[];          // stored as array for JSON-serialisability
  reelPositions: number[];
  visibleSymbols: SymbolId[][];
  winResult: WinResult;
  isFreeSpins: boolean;
  betPerLine: number;
}

export interface GameState {
  phase: GamePhase;
  reels: SymbolId[][];         // [reel][row] — 5 reels × 3 rows
  activeWinLines: WinLine[];
  totalSessionWin: number;     // accumulated win across all spins
  lastSpinWin: number;
  freeSpinsRemaining: number;
  freeSpinsTotalWin: number;
  scatterCount: number;
  spinsCompleted: number;
}

export const INITIAL_GAME_STATE: GameState = {
  phase: 'IDLE',
  reels: [[], [], [], [], []],
  activeWinLines: [],
  totalSessionWin: 0,
  lastSpinWin: 0,
  freeSpinsRemaining: 0,
  freeSpinsTotalWin: 0,
  scatterCount: 0,
  spinsCompleted: 0,
};
