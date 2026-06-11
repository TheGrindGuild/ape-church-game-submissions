# Froglings Swamp Hop

Froglings Swamp Hop is a lily-pad risk arcade game on the Ape Church template. Hop pad to pad to grow your bank, cash out early, or push for the Luma Shrine Bonus when you land on a Shrine Pad.

## Overview

- **Game type:** Arcade / risk progression (crash-style cash-out)
- **Template base:** `ape-church-game-template`
- **Supports rewatch:** Yes (deterministic replay of the last completed round)
- **On-chain betting:** Mocked for this submission (`console.log` in `playGame()`)

## Core Gameplay

1. Place a bet and choose **Max Hops** (1–15).
2. Tap **Hop** to advance one lily pad. Each safe pad multiplies your **bank** (not just your original bet).
3. **Cash out** anytime after your first successful hop to lock in your bank as payout.
4. **Croc Snap** is the only full bust — you lose your entire bet and the run ends.
5. Complete every hop without cashing out to earn a small **Treasure Finish** bonus (~6%) on your final bank.

## Lily Pads

| Pad | Effect |
| --- | --- |
| **Golden Lily** | Strongest growth on the path |
| **Stable Pad** | Safe, steady multiplier |
| **Wobbly Pad** | Lower multiplier, shaky landing |
| **Murky Edge** | Weakest safe pad |
| **Croc Snap** | Instant bust — bet lost |
| **Shrine Pad** | Triggers the **Luma Shrine Bonus** (see below) |

Pad outcomes are weighted (~4% approximate house edge). Croc chance rises after hop 6 (+1.5% per additional hop).

## Luma Shrine Bonus

Landing on a **Shrine Pad** pauses the run and opens the **Luma Shrine Bonus** overlay. Pick one of three Lumas:

| Luma | Risk profile | Outcomes |
| --- | --- | --- |
| **Safe** | Low risk | Guaranteed **+15%** on your current bank |
| **Wild** | Medium risk | **+75%** or **−15%** on your bank (50/50) |
| **Ancient** | High risk | **3× bank surge**, **+40%**, or **no bonus** (20% / 30% / 50%) |

Important for reviewers:

- The bonus **never busts your run** — only Croc Snap ends the run with a full loss.
- After you pick a Luma and tap **Continue**, you return to normal hopping or cash out.
- Bonus math is applied on top of your bank **after** the Shrine Pad hop multiplier.
- Outcomes are deterministic from the same seeded RNG as the main game.

## Controls

- **Place Your Bet** — start a new run
- **Hop** — advance one pad
- **Cash Out** — lock in current bank (available after hop 1)
- **Rewatch Hops** — replay the last completed round
- **Change Bet** — return to setup

## Assets

- Game assets: `public/submissions/swamp-hop/`
- Listing assets: `card.png`, `banner.png`
- Luma bonus icons: `public/submissions/swamp-hop/luma/`

## Notes for Review

- Game code: `components/games/swamp-hop/`
- Metadata: `submissions/swamp-hop/swamp-hop/metadata.json`
- Balance calibrated via `scripts/simulate-swamp-hop.ts` (~90% RTP cash-out after hop 1, ~4% house edge target)
- No `.wav` files included (MP3 only)

## Submitter Contact

- **Team:** Froglings
- **Telegram:** `@arttheruler`
- **Revenue share wallet:** `0xd3F8dA535D0318C8f829fF38f0656daC3b740692`
