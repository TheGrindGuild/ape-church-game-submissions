import { SymbolId, WinLine, WinResult } from '../types';
import { PAYTABLE, PAYLINES, SYMBOL_CONFIG, NUM_PAYLINES } from '../myGameConfig';

// Count consecutive matching symbols from reel 0 leftward, treating wilds as any.
function countConsecutive(lineSymbols: SymbolId[]): { symbol: SymbolId; count: number } {
  // Find first non-wild to use as anchor
  const anchor = lineSymbols.find(s => !SYMBOL_CONFIG[s].isWild && !SYMBOL_CONFIG[s].isScatter);
  if (!anchor) {
    // All wilds — counts as wild 5-of-a-kind (no paytable entry, pays via highest substitute)
    return { symbol: 'purple_cub', count: lineSymbols.length };
  }

  let count = 0;
  for (const s of lineSymbols) {
    if (s === anchor || SYMBOL_CONFIG[s].isWild) {
      count++;
    } else {
      break;
    }
  }
  return { symbol: anchor, count };
}

export function evaluateWins(
  visibleSymbols: SymbolId[][], // [reel][row]
  betPerLine: number,
): WinResult {
  const lines: WinLine[] = [];
  let totalWin = 0;

  // Evaluate each payline
  for (let lineIdx = 0; lineIdx < PAYLINES.length; lineIdx++) {
    const line = PAYLINES[lineIdx];
    const lineSymbols = line.map((row, reel) => visibleSymbols[reel][row]);
    const { symbol, count } = countConsecutive(lineSymbols);

    if (count >= 3) {
      const payout = (PAYTABLE[symbol] as Record<number, number | undefined>)[count] ?? 0;
      if (payout > 0) {
        const win = payout * betPerLine;
        totalWin += win;
        lines.push({
          lineIndex: lineIdx,
          symbol,
          count,
          win,
          positions: line.slice(0, count),
        });
      }
    }
  }

  // Scatter: count golden_cub anywhere on all 15 visible cells
  const scatterCount = visibleSymbols.flat().filter(s => SYMBOL_CONFIG[s].isScatter).length;
  let scatterWin = 0;
  if (scatterCount >= 3) {
    const scatterPay = (PAYTABLE['golden_cub'] as Record<number, number | undefined>)[scatterCount] ?? 0;
    // Scatter pays on total bet (all lines)
    scatterWin = scatterPay * betPerLine * NUM_PAYLINES;
    totalWin += scatterWin;
  }

  const triggeredFreeSpins = scatterCount >= 3;
  const freeSpinsAwarded = triggeredFreeSpins
    ? scatterCount === 3 ? 10 : scatterCount === 4 ? 15 : 20
    : 0;

  return {
    lines,
    totalWin,
    scatterCount,
    triggeredFreeSpins,
    freeSpinsAwarded,
    bigWin: totalWin >= betPerLine * 20,
    megaWin: totalWin >= betPerLine * 50,
  };
}
