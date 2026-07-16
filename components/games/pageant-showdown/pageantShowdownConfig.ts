import { Game } from "@/lib/games";

export type GameLayout = "two-column" | "full-size";
export const pageantShowdownLayout: GameLayout = "two-column";

export type PageantSide = "left" | "right";

export const WIN_MULTIPLIER = 2;

export const pageantShowdown: Game = {
    title: "Koda Pageant Showdown",
    description:
        "Who wins this Koda Pageant? Pick a side, watch the vote flip, and double your bet if you called it right.",
    gameAddress: "0x0000000000000000000000000000000000000000",
    gameBackground: "/submissions/pageant-showdown/background.png",
    card: "/submissions/pageant-showdown/card.png",
    banner: "/submissions/pageant-showdown/banner.png",
    themeColorBackground: "#1a1030",
    song: "/submissions/pageant-showdown/audio/song.mp3",
    payouts: {
        0: { 0: { 0: WIN_MULTIPLIER * 10_000 } },
        1: { 0: { 0: WIN_MULTIPLIER * 10_000 } },
    },
};