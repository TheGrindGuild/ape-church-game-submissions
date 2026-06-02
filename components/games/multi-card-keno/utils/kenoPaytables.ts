// Ape Church Keno paytable (screenshot-authoritative).
// Convention: PAYTABLE[spotsPicked][matches] = multiplier per 1 credit.
// Sparse by design: any missing match count = 0x payout.
export const PAYTABLE: Record<number, Record<number, number>> = {
  // 1-spot
  1: { 0: 0.5, 1: 2.25 },

  // 2-spot
  2: { 1: 1.8, 2: 4.25 },

  // 3-spot
  3: { 1: 0.8, 2: 2.5, 3: 20 },

  // 4-spot
  4: { 2: 2, 3: 7, 4: 100 },

  // 5-spot
  5: { 0: 1.25, 2: 1.1, 3: 2.5, 4: 10, 5: 200 },

  // 6-spot
  6: { 0: 1.5, 2: 0.5, 3: 2, 4: 7, 5: 50, 6: 500 },

  // 7-spot
  7: { 0: 2, 3: 1.25, 4: 4, 5: 37.5, 6: 250, 7: 2500 },

  // 8-spot
  8: { 0: 2, 2: 0.5, 3: 1.1, 4: 2, 5: 10, 6: 50, 7: 500, 8: 10000 },

  // 9-spot
  9: { 0: 3, 3: 0.25, 4: 1.5, 5: 10, 6: 50, 7: 500, 8: 5000, 9: 500000 },

  // 10-spot
  10: { 0: 4, 3: 0.25, 4: 1.2, 5: 4, 6: 25, 7: 250, 8: 2000, 9: 50000, 10: 1000000 },
};

export function payoutMultiplier(spotsPicked: number, matches: number): number {
  return PAYTABLE[spotsPicked]?.[matches] ?? 0;
}
