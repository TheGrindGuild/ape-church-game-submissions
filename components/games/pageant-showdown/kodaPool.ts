/**
 * Koda images now come directly from Otherside's own official asset CDN,
 * covering the full ~10,000-ID range rather than a curated static subset.
 * Much simpler than the earlier OpenSea-scraped approach: no API key, no
 * server route needed, just a predictable URL pattern per token ID.
 *
 * Pattern confirmed: https://assets.otherside.xyz/kodas/pfp_full/1200px/{id}.webp
 * ID range: 0-9999 inclusive.
 *
 * Note: not every ID in that range is guaranteed to resolve to a real,
 * intentionally-revealed Koda (the actual collection supply is smaller than
 * 10,000 per OpenSea), so an occasional 404 on a given round is possible.
 * The <Image> tag's onError handling (if any) or a simple fallback could be
 * added later if that turns out to be noticeable in practice.
 */

export interface KodaEntry {
    id: number;
    image: string;
}

const KODA_MAX_ID = 9999; // IDs range 0-9999 inclusive, per Otherside's asset host

function kodaImageUrl(id: number): string {
    return `https://assets.otherside.xyz/kodas/pfp_full/1200px/${id}.webp`;
}

function randomKodaId(): number {
    return Math.floor(Math.random() * (KODA_MAX_ID + 1));
}

/** Picks two distinct random Kodas for a matchup — one per side. */
export function pickMatchup(): { left: KodaEntry; right: KodaEntry } {
    const leftId = randomKodaId();
    let rightId: number;
    do {
        rightId = randomKodaId();
    } while (rightId === leftId);
    return {
        left: { id: leftId, image: kodaImageUrl(leftId) },
        right: { id: rightId, image: kodaImageUrl(rightId) },
    };
}

/**
 * Fixed, non-random placeholder pair — used ONLY for the very first render
 * before pickMatchup() runs client-side in a useEffect. Avoids a Next.js
 * hydration mismatch (server render vs. client render picking different
 * random Kodas), same reasoning as the original build.
 */
export const PLACEHOLDER_MATCHUP: { left: KodaEntry; right: KodaEntry } = {
    left: { id: 1, image: kodaImageUrl(1) },
    right: { id: 2, image: kodaImageUrl(2) },
};