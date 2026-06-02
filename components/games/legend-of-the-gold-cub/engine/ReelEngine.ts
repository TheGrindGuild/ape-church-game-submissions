import { SymbolId } from '../types';
import { REEL_STRIPS, NUM_REELS, NUM_ROWS } from '../myGameConfig';

// Derive 5 reel stop positions from a 32-byte seed.
// Each reel consumes 2 bytes (0-65535) mod strip length for uniform distribution.
export function resolveReelsFromSeed(seed: Uint8Array): number[] {
  return Array.from({ length: NUM_REELS }, (_, i) => {
    const hi = seed[i * 2];
    const lo = seed[i * 2 + 1];
    const raw = (hi * 256 + lo);
    return raw % REEL_STRIPS[i].length;
  });
}

// Return the 3 visible symbols for each reel given stop positions.
// visibleSymbols[reel][row]: row 0 = top, 1 = middle, 2 = bottom
export function getVisibleSymbols(positions: number[]): SymbolId[][] {
  return positions.map((stop, reel) => {
    const strip = REEL_STRIPS[reel];
    const len = strip.length;
    return Array.from({ length: NUM_ROWS }, (_, row) =>
      strip[(stop - 1 + row + len) % len]
    );
  });
}
