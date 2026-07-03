"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- Background image set config -------------------------------------------
// Change BG_SET to switch all 6 backgrounds at once
const BG_SET: "grok" | "chatgpt" | "gemini" = "grok"; // FINAL SELECTION

// Per-background coordinates -- tune each set independently
// Format: [die1Left, die1Top, die2Left, die2Top, die3Left, die3Top, btnBottom]
// LOCKED: chatgpt-sacred  Die1:19% 54.75% | Die2:50% 52%    | Die3:81.25% 54.75% | Btn:13.1%
// LOCKED: chatgpt-cursed  Die1:19% 54.75%  | Die2:50% 52%   | Die3:81.25% 54.75% | Btn:14.85%
// LOCKED: gemini-sacred   Die1:20.7% 52.75%  | Die2:50% 48%    | Die3:79.55% 52.75% | Btn:13.1%
// LOCKED: gemini-cursed   Die1:19.75% 53.5%  | Die2:50% 50.75% | Die3:80.25% 53.5% | Btn:9.1%
// LOCKED: grok-cursed     Die1:19.75% 51.5%  | Die2:50% 42.5%  | Die3:80.5% 51.5%  | Btn:8.1%
// LOCKED: grok-sacred     Die1:17.25% 50%    | Die2:50% 41%    | Die3:83% 50%      | Btn:13.1%
const BG_COORDS: Record<string, [string,string,string,string,string,string,string]> = {
    "grok-sacred":    ["17.25%", "50%",    "50%", "41%",   "83%",    "50%",    "13.1%"],
    "grok-cursed":    ["19.75%", "51.5%",  "50%", "41%",   "80.5%",  "51.5%",  "8.1%"],
    "chatgpt-sacred": ["19%",    "54.75%", "50%", "52%",   "81.25%", "54.75%", "13.1%"],
    "chatgpt-cursed": ["19%",    "54.75%", "50%", "52%",   "81.25%", "54.75%", "14.85%"],
    "gemini-sacred":  ["20.7%",  "52.75%", "50%", "48%",   "79.55%", "52.75%", "13.1%"],
    "gemini-cursed":  ["19.75%", "53.5%",  "50%", "50.75%","80.25%", "53.5%",  "9.1%"],
};


interface BonusRoundProps {
    sessionPayout: number;
    reason: "streak" | "maxRolls";
    onComplete: (finalPayout: number) => void;
}

// --- Fate Die -- 3D CSS die, styled per roll ---------------------------------

// Gold die for Roll 1, Silver for Roll 2, White/holy for Roll 3 -- SACRED version
const DIE_THEMES_SACRED = [
    { face: "#1a1200", border: "#FFD700", pip: "#FFD700", glow: "#FFD70066" },
    { face: "#0d0d1a", border: "#C0C0C0", pip: "#C0C0C0", glow: "#C0C0C066" },
    { face: "#1a0a00", border: "#FF6B35", pip: "#FF9160", glow: "#FF6B3566" },
];

// Blood red, sickly green, bone white -- CURSED version
const DIE_THEMES_CURSED = [
    { face: "#1a0000", border: "#DC2626", pip: "#FF4444", glow: "#DC262666" }, // Crimson
    { face: "#001a00", border: "#16A34A", pip: "#22C55E", glow: "#16A34A66" }, // Toxic green
    { face: "#0d0d0d", border: "#A8A8A8", pip: "#DDDDDD", glow: "#A8A8A866" }, // Bone white
];

const FateDie3D: React.FC<{
    rolling: boolean;
    result: string | null;
    label: string;
    size?: number;
    themeIndex?: number;
    themes?: typeof DIE_THEMES_SACRED;
    isCursedTrial?: boolean;
}> = ({ rolling, result, label, size = 90, themeIndex = 0, themes = DIE_THEMES_SACRED, isCursedTrial = false }) => {
    // Once settled, show a flat 2D result card instead of 3D die to avoid face visibility bugs
    if (!rolling && result) {
        const theme = themes[themeIndex];
        // Using custom icons for key faces, fallback emoji for others
        const ICON_IMGS: Record<string, string> = {
            bust:    "/submissions/gimboz-craps/icons/bonus-bust.webp",
            apewill: "/submissions/gimboz-craps/icons/bonus-gimboz-will.webp",
            hold:    "/submissions/gimboz-craps/icons/bonus-hold-sacred.webp",   // overridden per trial below
            down:    "/submissions/gimboz-craps/icons/bonus-down.webp",
            "1x":    "/submissions/gimboz-craps/icons/bonus-1x-sacred.webp",
            "2x":    "/submissions/gimboz-craps/icons/bonus-2x.webp",
            "3x":    "/submissions/gimboz-craps/icons/bonus-3x.webp",
            up:      "/submissions/gimboz-craps/icons/bonus-up.webp",
            double:  "/submissions/gimboz-craps/icons/bonus-double-sacred.webp",
        };
        // Cursed trial uses different icons
        if (isCursedTrial) {
            ICON_IMGS["hold"]   = "/submissions/gimboz-craps/icons/bonus-hold-cursed.webp";
            ICON_IMGS["1x"]     = "/submissions/gimboz-craps/icons/bonus-1x-cursed.webp";
            ICON_IMGS["double"] = "/submissions/gimboz-craps/icons/bonus-double.webp";
        }
        const MULT_LABELS: Record<string, string> = {
            bust:"0x", "1x":"1x", "2x":"2x", "3x":"3x",
            hold:"1x", double:"2x", apewill:"500x", up:"+1", down:"-1",
        };
        return (
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
                style={{
                    width: size, height: size,
                    background: isCursedTrial ? `linear-gradient(135deg, #2a0808ee, #1a0404bb)` : `linear-gradient(135deg, #2a1e00ee, #1a1200bb)`,
                    border: `3px solid ${theme.border}`,
                    borderRadius: size * 0.18,
                    boxShadow: `0 0 20px ${theme.glow}, 0 0 40px ${theme.glow}55`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    overflow: "hidden",
                    padding: "6px",
                }}>
                {ICON_IMGS[result] ? (
                    <div style={{ position: "relative", width: size * 0.60, height: size * 0.60, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {/* Inner glow behind icon */}
                        <div style={{
                            position: "absolute", inset: "-20%", borderRadius: "50%",
                            background: isCursedTrial
                                ? "radial-gradient(ellipse at center, rgba(220,38,38,0.75) 0%, rgba(180,0,0,0.4) 40%, transparent 70%)"
                                : "radial-gradient(ellipse at center, rgba(255,215,0,0.8) 0%, rgba(200,150,0,0.4) 40%, transparent 70%)",
                        }} />
                        <img src={ICON_IMGS[result]} alt={result}
                            style={{ width: "100%", height: "100%", objectFit: "contain", position: "relative", zIndex: 1 }} />
                    </div>
                ) : (
                    <span style={{ fontSize: size * 0.38, lineHeight: 1 }}>
                        {result}
                    </span>
                )}
                <span style={{
                    fontSize: size * 0.2,
                    fontWeight: 900,
                    fontFamily: "'Chantilly','Arial Black',sans-serif",
                    color: theme.border,
                    letterSpacing: "0.05em",
                }}>
                    {MULT_LABELS[result] || result}
                </span>
            </motion.div>
        );
    }

    const [rollingIcon, setRollingIcon] = useState(0);

        const DIE_ROLLING_ICONS: Record<string, string[]> = {
            "sacred-0": [
                "/submissions/gimboz-craps/icons/bonus-1x-sacred.webp",
                "/submissions/gimboz-craps/icons/bonus-2x.webp",
                "/submissions/gimboz-craps/icons/bonus-3x.webp",
            ],
            "sacred-1": [
                "/submissions/gimboz-craps/icons/bonus-down.webp",
                "/submissions/gimboz-craps/icons/bonus-hold-sacred.webp",
                "/submissions/gimboz-craps/icons/bonus-up.webp",
            ],
            "sacred-2": [
                "/submissions/gimboz-craps/icons/bonus-hold-sacred.webp",
                "/submissions/gimboz-craps/icons/bonus-double-sacred.webp",
                "/submissions/gimboz-craps/icons/bonus-gimboz-will.webp",
            ],
            "cursed-0": [
                "/submissions/gimboz-craps/icons/bonus-3x.webp",
                "/submissions/gimboz-craps/icons/bonus-2x.webp",
                "/submissions/gimboz-craps/icons/bonus-1x-cursed.webp",
                "/submissions/gimboz-craps/icons/bonus-bust.webp",
            ],
            "cursed-1": [
                "/submissions/gimboz-craps/icons/bonus-up.webp",
                "/submissions/gimboz-craps/icons/bonus-hold-cursed.webp",
                "/submissions/gimboz-craps/icons/bonus-down.webp",
            ],
            "cursed-2": [
                "/submissions/gimboz-craps/icons/bonus-gimboz-will.webp",
                "/submissions/gimboz-craps/icons/bonus-double.webp",
                "/submissions/gimboz-craps/icons/bonus-hold-cursed.webp",
                "/submissions/gimboz-craps/icons/bonus-bust.webp",
            ],
        };
        const dieKey = (isCursedTrial ? "cursed" : "sacred") + "-" + themeIndex;
        const BONUS_ICONS = DIE_ROLLING_ICONS[dieKey] ?? DIE_ROLLING_ICONS["sacred-0"];

    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

    const theme = themes[themeIndex];

    useEffect(() => {
        timers.current.forEach(t => clearTimeout(t));
        timers.current = [];

        if (rolling) {
            let step = 0;
            const cycle = () => {
                setRollingIcon(prev => (prev + 1) % BONUS_ICONS.length);
                step++;
                if (step < 10) {
                    const t = setTimeout(cycle, 100);
                    timers.current.push(t);
                }
            };
            cycle();
        }

        return () => timers.current.forEach(t => clearTimeout(t));
    }, [rolling, result]);

    // Pending state -- show hold icon (not a dot)
    if (!rolling && !result) {
        const theme = themes[themeIndex];
        const holdIcon = isCursedTrial
            ? "/submissions/gimboz-craps/icons/bonus-hold-cursed.webp"
            : "/submissions/gimboz-craps/icons/bonus-hold-sacred.webp";
        return (
            <div style={{
                width: size, height: size,
                background: theme.face + "88",
                border: "2px solid " + theme.border + "44",
                borderRadius: size * 0.18,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 2, opacity: 0.5,
            }}>
                <img src={holdIcon} alt="" style={{ width: size * 0.72, height: size * 0.72, objectFit: "contain", filter: "grayscale(0.6)" }} />
            </div>
        );
    }

    // Rolling state: show icon cycling card (slot machine effect)
    return (
        <div className="flex flex-col items-center gap-3">
            <motion.div
                animate={{ scale: [1, 1.05, 0.97, 1.03, 1], rotate: [-2, 2, -1, 1, 0] }}
                transition={{ repeat: Infinity, duration: 0.3, ease: "easeInOut" }}
                style={{
                    width: size, height: size,
                    background: `linear-gradient(135deg, ${theme.face}ee, ${theme.face}cc)`,
                    border: `3px solid ${theme.border}`,
                    borderRadius: size * 0.18,
                    boxShadow: `0 0 20px ${theme.glow}`,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                }}>
                <img
                    src={BONUS_ICONS[rollingIcon]}
                    alt=""
                    style={{ width: size * 0.72, height: size * 0.72, objectFit: "contain", filter: "blur(0.5px) brightness(0.85)" }}
                />
            </motion.div>
            {/* Result label */}
            <div className="text-center min-h-[40px] flex flex-col items-center justify-center">
                {result && !rolling ? (
                    <motion.div initial={{scale:0,opacity:0}} animate={{scale:1,opacity:1}}
                        className="flex flex-col items-center gap-0.5">
                        <span className="text-lg font-black uppercase tracking-widest"
                            style={{ color: theme.border }}>
                            {label}
                        </span>
                    </motion.div>
                ) : rolling ? (
                    <motion.span animate={{opacity:[0.3,1,0.3]}} transition={{repeat:Infinity,duration:0.4}}
                        className="text-xs uppercase tracking-widest" style={{color:theme.border}}>
                        Rolling...
                    </motion.span>
                ) : (
                    <span className="text-xs text-white/20 uppercase tracking-widest">Roll {themeIndex+1}</span>
                )}
            </div>
        </div>
    );
};

// --- Odds table shown before rolling ----------------------------------------

const OddsTable: React.FC<{sessionPayout: number; isCursed?: boolean}> = ({sessionPayout, isCursed=false}) => {
    const gold = isCursed ? "#DC2626" : "#FFD700";
    const sacredDice = [
        {
            label: "DIE 1 — SET BASE",
            desc: "Sets your starting multiplier",
            outcomes: [
                { img: "/submissions/gimboz-craps/icons/bonus-3x.webp",        name: "3x SACRED",  odds: "1/6", desc: "Triple payout",    color: "#F97316" },
                { img: "/submissions/gimboz-craps/icons/bonus-2x.webp",        name: "2x BLESS",   odds: "2/6", desc: "Double payout",    color: "#A8E10C" },
                { img: "/submissions/gimboz-craps/icons/bonus-1x-sacred.webp", name: "1x HOLD",    odds: "3/6", desc: "Keep payout",      color: "#C0C0C0" },
            ],
        },
        {
            label: "DIE 2 — SHIFT TIER",
            desc: "Adjusts your multiplier up or down",
            outcomes: [
                { img: "/submissions/gimboz-craps/icons/bonus-up.webp",           name: "+1 TIER", odds: "2/6", desc: "Raise multiplier",      color: "#A8E10C" },
                { img: "/submissions/gimboz-craps/icons/bonus-hold-sacred.webp",  name: "HOLD",    odds: "3/6", desc: "Keep multiplier",      color: "#C0C0C0" },
                { img: "/submissions/gimboz-craps/icons/bonus-down.webp",         name: "-1 TIER", odds: "1/6", desc: "Drop multiplier",     color: "#DC2626" },
            ],
        },
        {
            label: "DIE 3 — FINAL FATE",
            desc: "Determines your final outcome",
            outcomes: [
                { img: "/submissions/gimboz-craps/icons/bonus-gimboz-will.webp",    name: "GIMBOZ WILL 500x", odds: "1/6", desc: "500x jackpot!",  color: "#FFD700" },
                { img: "/submissions/gimboz-craps/icons/bonus-double-sacred.webp",  name: "DOUBLE",           odds: "1/6", desc: "2x multiplier",     color: "#F97316" },
                { img: "/submissions/gimboz-craps/icons/bonus-hold-sacred.webp",    name: "HOLD",             odds: "4/6", desc: "Lock multiplier",    color: "#C0C0C0" },
            ],
        },
    ];
    const cursedDice = [
        {
            label: "DIE 1 — SET BASE",
            desc: "Sets your starting multiplier",
            outcomes: [
                { img: "/submissions/gimboz-craps/icons/bonus-3x.webp",        name: "3x CURSED",    odds: "1/6", desc: "Triple payout",      color: "#F97316" },
                { img: "/submissions/gimboz-craps/icons/bonus-2x.webp",        name: "2x TAINTED",   odds: "2/6", desc: "Double payout",      color: "#A8E10C" },
                { img: "/submissions/gimboz-craps/icons/bonus-1x-cursed.webp", name: "1x SURVIVE",   odds: "2/6", desc: "Keep payout",   color: "#C0C0C0" },
                { img: "/submissions/gimboz-craps/icons/bonus-bust.webp",      name: "OBLITERATE",   odds: "1/6", desc: "Lose everything",    color: "#ef4444" },
            ],
        },
        {
            label: "DIE 2 — SHIFT TIER",
            desc: "Adjusts your multiplier up or down",
            outcomes: [
                { img: "/submissions/gimboz-craps/icons/bonus-up.webp",          name: "WORSE +1",  odds: "1/6", desc: "Raise curse",    color: "#DC2626" },
                { img: "/submissions/gimboz-craps/icons/bonus-hold-cursed.webp", name: "HOLD DOOM", odds: "3/6", desc: "Hold curse",     color: "#C0C0C0" },
                { img: "/submissions/gimboz-craps/icons/bonus-down.webp",        name: "ESCAPE -1", odds: "2/6", desc: "Lower curse",      color: "#A8E10C" },
            ],
        },
        {
            label: "DIE 3 — FINAL FATE",
            desc: "Determines your final outcome",
            outcomes: [
                { img: "/submissions/gimboz-craps/icons/bonus-gimboz-will.webp", name: "GIMBOZ MERCY 500x", odds: "1/6", desc: "500x miracle!",   color: "#FFD700" },
                { img: "/submissions/gimboz-craps/icons/bonus-double.webp",      name: "DOUBLE CURSE",      odds: "1/6", desc: "2x multiplier",    color: "#F97316" },
                { img: "/submissions/gimboz-craps/icons/bonus-hold-cursed.webp", name: "ENDURE",            odds: "3/6", desc: "Hold multiplier",        color: "#C0C0C0" },
                { img: "/submissions/gimboz-craps/icons/bonus-bust.webp",        name: "CONSUMED",          odds: "1/6", desc: "Lose everything",    color: "#ef4444" },
            ],
        },
    ];
    const dice = isCursed ? cursedDice : sacredDice;
    return (
        <div className="w-full" style={{ maxWidth: 525, border: `1px solid ${gold}55`, borderRadius: "12px", overflow: "hidden", boxShadow: `0 0 18px ${gold}44, 0 0 6px ${gold}66` }}>
            <p className="text-[10px] text-center uppercase tracking-widest font-bold mb-2" style={{ color: gold }}>
                3 Fate Dice — Possible Outcomes
            </p>
            {/* 3 columns, one per die */}
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${gold}33`, background: "rgba(0,0,0,0.6)" }}>
                {/* Column headers */}
                <div className="grid grid-cols-3" style={{ borderBottom: `1px solid ${gold}22` }}>
                    {dice.map((die, di) => (
                        <div key={di} className="px-2 py-2 flex flex-col items-center text-center"
                            style={{ background: `${gold}12`, borderRight: di < 2 ? `1px solid ${gold}22` : "none" }}>
                            <p className="text-[9px] font-black uppercase tracking-wide" style={{ color: gold }}>
                                {die.label.split("—")[0].trim()}
                            </p>
                            <p className="text-[8px] text-white/35 leading-tight">{die.label.split("—")[1]?.trim()}</p>
                        </div>
                    ))}
                </div>
                {/* Outcome rows — find max outcomes count */}
                {Array.from({ length: Math.max(...dice.map(d => d.outcomes.length)) }).map((_, ri) => (
                    <div key={ri} className="grid grid-cols-3" style={{ borderTop: `1px solid rgba(255,255,255,0.05)` }}>
                        {dice.map((die, di) => {
                            const o = die.outcomes[ri];
                            return (
                                <div key={di} className="px-2 py-1.5 flex items-center gap-1.5"
                                    style={{
                                        borderRight: di < 2 ? `1px solid rgba(255,255,255,0.05)` : "none",
                                        background: o ? `${o.color}08` : "transparent",
                                    }}>
                                    {o ? (
                                        <>
                                            <img src={o.img} className="w-6 h-6 shrink-0" alt="" />
                                            <div className="flex flex-col min-w-0">
                                                <p className="text-[9px] font-black uppercase leading-tight truncate"
                                                    style={{ color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>{o.name}</p>
                                                <p className="text-[8px] font-bold leading-tight"
                                                    style={{ color: o.color, textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>{(o as any).desc}</p>
                                            </div>
                                        </>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Weighted random ---------------------------------------------------------

function rollFace<T extends { weight: number; name: string }>(faces: T[]): T {
    const valid = faces.filter(f => f.weight > 0);
    const total = valid.reduce((a,f) => a+f.weight, 0);
    let r = Math.random() * total;
    for (const f of valid) { r -= f.weight; if (r <= 0) return f; }
    return valid[valid.length-1];
}

// --- SACRED TRIAL dice (streak bonus) -- hope for the best ------------------
const ROLL1_SACRED = [
    {name:"1x",    label:"1x HOLD",   mult:1,  weight:3},  // was bust(w:1)+1x(w:2) -- floor now 1x
    {name:"2x",    label:"2x BLESS",  mult:2,  weight:2},
    {name:"3x",    label:"3x SACRED", mult:3,  weight:1},
];
const ROLL2_SACRED = [
    {name:"down",  label:"-1 TIER",   delta:-1, weight:1},
    {name:"hold",  label:"HOLD",      delta: 0, weight:3},
    {name:"up",    label:"+1 TIER",   delta: 1, weight:2},
];
const ROLL3_SACRED = [
    {name:"hold",    label:"HOLD",      final:"hold",    weight:4},  // was bust(w:1)+hold(w:3) -- no bust in sacred
    {name:"double",  label:"DOUBLE",    final:"double",  weight:1},
    {name:"apewill", label:"GIMBOZ WILL", final:"apewill", weight:1},
];

// --- CURSED TRIAL dice (lucky 13) -- pray to avoid the worst ----------------
// Same probabilities, reversed psychology: Die 3 starts scary, Gimboz Will is escape
const ROLL1_CURSED = [
    {name:"3x",    label:"3x CURSED",  mult:3,  weight:1},
    {name:"2x",    label:"2x TAINTED", mult:2,  weight:2},
    {name:"1x",    label:"1x SURVIVE", mult:1,  weight:2},
    {name:"bust",  label:"OBLITERATE", mult:0,  weight:1},
];
const ROLL2_CURSED = [
    {name:"up",    label:"WORSE +1",   delta: 1, weight:1},  // going up = more cursed
    {name:"hold",  label:"HOLD DOOM",  delta: 0, weight:3},
    {name:"down",  label:"ESCAPE -1",  delta:-1, weight:2},  // going down = better for player
];
const ROLL3_CURSED = [
    {name:"apewill", label:"GIMBOZ MERCY 500x", final:"apewill", weight:1}, // miracle escape
    {name:"double",  label:"DOUBLE CURSE",    final:"double",  weight:1},  // double current
    {name:"hold",    label:"ENDURE",           final:"hold",    weight:3},  // survive
    {name:"bust",    label:"CONSUMED",         final:"bust",    weight:1},  // lose all
];

// --- Main component ---------------------------------------------------------

const BonusRound: React.FC<BonusRoundProps> = ({ sessionPayout, reason, onComplete }) => {
    // Determine variant up front so doRoll callbacks can reference correct faces
    const isCursed = reason === "maxRolls";
    // ⚠️ DEV ONLY — REMOVE BEFORE SUBMISSION
    const DEV_DIE_BG = false;
    const dieBg = DEV_DIE_BG
        ? (isCursed
            ? "rgba(139,0,0,0.22)"
            : "rgba(255,215,0,0.13)")
        : "transparent";
    const dieBorder = DEV_DIE_BG
        ? (isCursed
            ? "1px solid rgba(220,38,38,0.35)"
            : "1px solid rgba(255,215,0,0.3)")
        : "none";
    const dieGlow = DEV_DIE_BG
        ? (isCursed
            ? "inset 0 0 12px rgba(139,0,0,0.3)"
            : "inset 0 0 12px rgba(255,215,0,0.2)")
        : "none";
    const coordKey = isCursed ? BG_SET + "-cursed" : BG_SET + "-sacred";
    const [d1l, d1t, d2l, d2t, d3l, d3t, btnB] = BG_COORDS[coordKey] ?? BG_COORDS["chatgpt-sacred"];
    const dieThemes = isCursed ? DIE_THEMES_CURSED : DIE_THEMES_SACRED;
    const roll1Faces = isCursed ? ROLL1_CURSED : ROLL1_SACRED;
    const roll2Faces = isCursed ? ROLL2_CURSED : ROLL2_SACRED;
    const roll3Faces = isCursed ? ROLL3_CURSED : ROLL3_SACRED;

    // Background images mapped per BG_SET
    const bgSacred = `/submissions/gimboz-craps/bonus-bg-sacred-${BG_SET}.webp`;
    const bgCursed = `/submissions/gimboz-craps/bonus-bg-cursed-${BG_SET}.webp`;
    const bgImage = isCursed ? bgCursed : bgSacred;

    const [phase, setPhase] = useState<"info"|"roll1"|"roll2"|"roll3"|"result">("info");

    const [spinning, setSpinning] = useState(false);

    const [r1, setR1] = useState<typeof ROLL1_SACRED[0]|null>(null);
    const [r2, setR2] = useState<typeof ROLL2_SACRED[0]|null>(null);
    const [r3, setR3] = useState<typeof ROLL3_SACRED[0]|null>(null);
    const [currentMult, setCurrentMult] = useState(0);
    const [finalMult, setFinalMult] = useState(1);
    const [finalPayout, setFinalPayout] = useState(0);
    const [rolled3, setRolled3] = useState(false);

    const doRoll1 = useCallback(() => {
        setSpinning(true);
        setTimeout(() => {
            const res = rollFace(roll1Faces);
            setR1(res); setCurrentMult(res.mult); setSpinning(false); setPhase("roll2");
        }, 1100);
    }, [roll1Faces]);

    const doRoll2 = useCallback(() => {
        setSpinning(true);
        setTimeout(() => {
            const res = rollFace(roll2Faces);
            setR2(res);
            const newMult = Math.max(0, Math.min(3, currentMult + res.delta));
            setCurrentMult(newMult);
            setSpinning(false); setPhase("roll3");
        }, 1100);
    }, [currentMult, roll2Faces]);

    const doRoll3 = useCallback(() => {
        setRolled3(true);
        setSpinning(true);
        setTimeout(() => {
            const res = rollFace(roll3Faces);
            let mult = currentMult;
            if (res.final==="bust") mult = isCursed ? 0 : Math.max(1, currentMult); // sacred floor: 1x
            else if (res.final==="double") mult = currentMult * 2;
            else if (res.final==="apewill") mult = 500;
            // If double resolved to 0 (mult was 0), display as bust
            const resolvedFinal = (res.final==="double" && mult===0) ? "bust" : res.final;
            setR3(resolvedFinal === res.final ? res : {...res, final: resolvedFinal, name: "bust", label: "OBLITERATE"});
            setFinalMult(mult);
            setFinalPayout(Math.floor(sessionPayout*mult));
            setSpinning(false);
            // Show final die result for 2.5s before result overlay
            setTimeout(() => setPhase("result"), 2000);
        }, 1100);
    }, [currentMult, sessionPayout, roll3Faces]);

    const GOLD = isCursed ? "#DC2626" : "#FFD700";
    const GOLD2 = isCursed ? "#FF8080" : "#FFF3B0";

    const isRollingPhase = phase !== "info";

    return (
        <motion.div initial={{opacity:0}} animate={{opacity:1}}
            className="absolute inset-0 z-50 overflow-hidden"
            style={{
                color: "#fff",
                border: isCursed ? "3px solid #DC2626" : "3px solid #FFD700",
                outline: isCursed ? "1px solid #7F1D1D" : "1px solid #8B6914",
                outlineOffset: "-6px",
            }}>

            {/* -- INFO PHASE -- outcomes table + buttons, same bg as intro -- */}
            {phase === "info" && (
                <div className="absolute inset-0 flex flex-col"
                    style={{
                        background: isCursed
                            ? "url('/submissions/gimboz-craps/bonus-intro-cursed.webp') center/cover no-repeat #000"
                            : "url('/submissions/gimboz-craps/bonus-intro-sacred.webp') center/cover no-repeat #000",
                    }}>
                    {/* Headers baked into bg images -- no coded header needed */}
                    {/* Outcomes table */}
                    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
                        className="relative z-10 flex flex-col items-center gap-3 px-4 w-full"
                        style={{ position: "absolute", top: "34%", left: 0, right: 0, paddingBottom: "80px" }}>
                        <OddsTable sessionPayout={sessionPayout} isCursed={isCursed} />
                    </motion.div>
                    {/* Both trials: buttons pinned to bottom */}
                    <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-center pb-4 gap-3"
                        style={{ background: isCursed ? "linear-gradient(to top, rgba(0,0,0,0.9) 60%, transparent)" : "linear-gradient(to top, rgba(0,0,0,0.85) 60%, transparent)" }}>
                        {isCursed ? (
                            <>
                                <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.97}}
                                    onClick={() => setPhase("roll1")}
                                    className="flex-1 max-w-[200px] py-3.5 rounded-xl font-black uppercase tracking-widest text-sm"
                                    style={{ background:"linear-gradient(135deg, #7F1D1D, #DC2626)", color:"#fff", boxShadow:"0 0 20px rgba(220,38,38,0.6)" }}>
                                    Face Your Fate
                                </motion.button>
                                <motion.img src="/submissions/gimboz-craps/skull-spin.gif" alt=""
                                    animate={{ scale: [1, 1.12, 1] }}
                                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                    style={{ width: 52, height: 52, alignSelf: "center", mixBlendMode: "screen" }} />
                                <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.97}}
                                    onClick={() => onComplete(sessionPayout)}
                                    className="flex-1 max-w-[200px] py-3.5 rounded-xl font-black uppercase tracking-widest text-sm"
                                    style={{ background:"linear-gradient(135deg, #1a3a1a, #16A34A)", color:"#fff", boxShadow:"0 0 20px rgba(22,163,74,0.5)" }}>
                                    Cash Out
                                </motion.button>
                            </>
                        ) : (
                            <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.97}}
                                onClick={() => setPhase("roll1")}
                                className="px-10 py-3.5 rounded-xl font-black uppercase tracking-widest text-base"
                                style={{ background:"linear-gradient(135deg, #FFD700, #B8860B)", color:"#1a0a00", boxShadow:"0 0 24px rgba(255,215,0,0.6)" }}>
                                Begin The Trial
                            </motion.button>
                        )}
                    </div>
                </div>
            )}

            {/* -- ROLLING PHASE -- absolute layout over background image -- */}
            {isRollingPhase && (
                <div className="absolute inset-0">
                    {/* Background image */}
                    <img
                        src={bgImage}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ pointerEvents: "none", userSelect: "none" }}
                    />

                    {/* Header bar -- top 4%, semi-transparent black pill, horizontally centered */}
                    <div className="absolute left-1/2 -translate-x-1/2"
                        style={{ top: "4%", zIndex: 10 }}>
                        <div className="px-5 py-1.5 rounded-full font-black text-sm whitespace-nowrap"
                            style={{
                                background: "rgba(0,0,0,0.65)",
                                backdropFilter: "blur(6px)",
                                border: `1px solid ${GOLD}44`,
                                color: GOLD,
                            }}>
                            {isCursed ? "Cursed Trial" : "Sacred Trial"} - Session: {sessionPayout.toLocaleString()} APE
                        </div>
                    </div>

                    {/* Multiplier pill -- top 14%, centered */}
                    <div className="absolute left-1/2 -translate-x-1/2"
                        style={{ top: "14%", zIndex: 10 }}>
                        <div className="px-4 py-1.5 rounded-full font-black text-sm"
                            style={{
                                background: "rgba(0,0,0,0.55)",
                                backdropFilter: "blur(4px)",
                                border: `1px solid ${GOLD}55`,
                                color: GOLD,
                            }}>
                            {r1 ? `Current: ${currentMult}x multiplier` : "Roll to set your fate"}
                        </div>
                    </div>

                    {/* -- Die 1 (left) -- centered at left 19.25%, top 48% -- */}
                    {(() => {
                        const d = { diePhase:"roll1", result:r1, roll:doRoll1, theme:0, title:"DIE 1 -- SET BASE", desc:"0x/1x/2x/3x" };
                        const i = 0;
                        const isActive = phase === "roll1";
                        const isDone = r1 !== null;
                        const isPending = !isActive && !isDone;
                        return (
                            <div className="absolute flex flex-col items-center gap-1"
                                style={{
                                    left: d1l, top: d1t,
                                    transform: "translate(-50%, -50%)",
                                    zIndex: 10,
                                    opacity: isPending ? 0.35 : 1,
                                    transition: "opacity 0.3s",
                                    background: dieBg,
                                    border: dieBorder,
                                    boxShadow: dieGlow,
                                    borderRadius: "12px",
                                    padding: "8px 6px 4px",
                                }}>
                                {isActive && (
                                    <motion.div animate={{opacity:[0.6,1,0.6]}} transition={{repeat:Infinity,duration:1}}
                                        className="text-[9px] font-black uppercase tracking-widest"
                                        style={{color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.9)"}}>
                                        ACTIVE
                                    </motion.div>
                                )}
                                {isDone && <div className="text-[9px] font-black uppercase tracking-widest text-white/60">DONE</div>}
                                {isPending && <div className="text-[9px] uppercase tracking-widest text-white/30">PENDING</div>}
                                <FateDie3D
                                    rolling={isActive && spinning}
                                    result={isDone ? (r1?.name||null) : null}
                                    label={isDone ? (r1?.label||"") : ""}
                                    size={80}
                                    themeIndex={0}
                                    themes={dieThemes}
                                    isCursedTrial={isCursed}
                                />
                                <p className="text-[9px] font-black uppercase text-center mt-0.5"
                                    style={{color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.8)"}}>
                                    {d.title}
                                </p>
                                {isDone && (
                                    <div className="rounded px-2 py-0.5"
                                        style={{ background:`${dieThemes[0].border}18`, border:`1px solid ${dieThemes[0].border}44` }}>
                                        <p className="text-[10px] font-black" style={{color:"#fff", textShadow:"0 1px 3px rgba(0,0,0,0.9)"}}>{r1?.label}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* -- Die 2 (center/active) -- centered at left 50%, top 43.25%, slightly larger -- */}
                    {(() => {
                        const isActive = phase === "roll2";
                        const isDone = r2 !== null;
                        const isPending = !isActive && !isDone;
                        return (
                            <div className="absolute flex flex-col items-center gap-1"
                                style={{
                                    left: d2l, top: d2t,
                                    transform: "translate(-50%, -50%)",
                                    zIndex: 10,
                                    opacity: isPending ? 0.35 : 1,
                                    transition: "opacity 0.3s",
                                    background: dieBg,
                                    border: dieBorder,
                                    boxShadow: dieGlow,
                                    borderRadius: "12px",
                                    padding: "8px 6px 4px",
                                }}>
                                {isActive && (
                                    <motion.div animate={{opacity:[0.6,1,0.6]}} transition={{repeat:Infinity,duration:1}}
                                        className="text-[9px] font-black uppercase tracking-widest"
                                        style={{color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.9)"}}>
                                        ACTIVE
                                    </motion.div>
                                )}
                                {isDone && <div className="text-[9px] font-black uppercase tracking-widest text-white/60">DONE</div>}
                                {isPending && <div className="text-[9px] uppercase tracking-widest text-white/30">PENDING</div>}
                                <FateDie3D
                                    rolling={isActive && spinning}
                                    result={isDone ? (r2?.name||null) : null}
                                    label={isDone ? (r2?.label||"") : ""}
                                    size={96}
                                    themeIndex={1}
                                    themes={dieThemes}
                                    isCursedTrial={isCursed}
                                />
                                <p className="text-[9px] font-black uppercase text-center mt-0.5"
                                    style={{color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.8)"}}>
                                    DIE 2 -- SHIFT TIER
                                </p>
                                {isDone && (
                                    <div className="rounded px-2 py-0.5"
                                        style={{ background:`${dieThemes[1].border}18`, border:`1px solid ${dieThemes[1].border}44` }}>
                                        <p className="text-[10px] font-black" style={{color:"#fff", textShadow:"0 1px 3px rgba(0,0,0,0.9)"}}>{r2?.label}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* -- Die 3 (right) -- centered at left 80.5%, top 48% -- */}
                    {(() => {
                        const isActive = phase === "roll3";
                        const isDone = r3 !== null;
                        const isPending = !isActive && !isDone;
                        return (
                            <div className="absolute flex flex-col items-center gap-1"
                                style={{
                                    left: d3l, top: d3t,
                                    transform: "translate(-50%, -50%)",
                                    zIndex: 10,
                                    opacity: isPending ? 0.35 : 1,
                                    transition: "opacity 0.3s",
                                    background: dieBg,
                                    border: dieBorder,
                                    boxShadow: dieGlow,
                                    borderRadius: "12px",
                                    padding: "8px 6px 4px",
                                }}>
                                {isActive && (
                                    <motion.div animate={{opacity:[0.6,1,0.6]}} transition={{repeat:Infinity,duration:1}}
                                        className="text-[9px] font-black uppercase tracking-widest"
                                        style={{color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.9)"}}>
                                        ACTIVE
                                    </motion.div>
                                )}
                                {isDone && <div className="text-[9px] font-black uppercase tracking-widest text-white/60">DONE</div>}
                                {isPending && <div className="text-[9px] uppercase tracking-widest text-white/30">PENDING</div>}
                                <FateDie3D
                                    rolling={isActive && spinning}
                                    result={isDone ? (r3?.name||null) : null}
                                    label={isDone ? (r3?.label||"") : ""}
                                    size={80}
                                    themeIndex={2}
                                    themes={dieThemes}
                                    isCursedTrial={isCursed}
                                />
                                <p className="text-[9px] font-black uppercase text-center mt-0.5"
                                    style={{color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.8)"}}>
                                    DIE 3 -- FINAL FATE
                                </p>
                                {isDone && (
                                    <div className="rounded px-2 py-0.5"
                                        style={{ background:`${dieThemes[2].border}18`, border:`1px solid ${dieThemes[2].border}44` }}>
                                        <p className="text-[10px] font-black" style={{color:"#fff", textShadow:"0 1px 3px rgba(0,0,0,0.9)"}}>{r3?.label}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* -- Roll button -- bottom 11.25%, centered -- */}
                    {!spinning && !rolled3 && (
                        <div className="absolute left-1/2 -translate-x-1/2"
                            style={{ bottom: btnB, zIndex: 10 }}>
                            <motion.button initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
                                whileHover={{scale:1.04}} whileTap={{scale:0.97}}
                                onClick={phase==="roll1"?doRoll1:phase==="roll2"?doRoll2:doRoll3}
                                className="px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm whitespace-nowrap"
                                style={{
                                    background: isCursed
                                        ? "linear-gradient(135deg, #7F1D1D, #DC2626)"
                                        : "linear-gradient(135deg, #FFD700, #B8860B)",
                                    color: isCursed ? "#fff" : "#1a0a00",
                                    boxShadow: isCursed
                                        ? "0 0 16px rgba(220,38,38,0.55)"
                                        : "0 0 16px rgba(255,215,0,0.45)",
                                }}>
                                {phase==="roll1"?"Roll Fate Die 1":phase==="roll2"?"Roll Fate Die 2":"Roll Final Die"}
                            </motion.button>
                        </div>
                    )}
                </div>
            )}

            {/* -- RESULT PHASE -- centered overlay -- */}
            {phase === "result" && (
                <div className="absolute inset-0" style={{ zIndex: 20 }}>
                    <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)", pointerEvents: "none" }} />

                    {/* Centered result overlay */}
                    <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 10 }}>
                        <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}}
                            className="flex flex-col items-center gap-4 px-6 py-6 rounded-2xl w-full max-w-xs mx-4"
                            style={{
                                background: "rgba(0,0,0,0.75)",
                                backdropFilter: "blur(8px)",
                                border: `2px solid ${GOLD}55`,
                                boxShadow: `0 0 40px ${GOLD}33`,
                            }}>

                            {finalMult===500 ? (
                                <>
                                    <motion.div animate={{scale:[1,1.15,1],rotate:[0,5,-5,0]}}
                                        transition={{repeat:Infinity,duration:1.2}}>
                                        <img src="/submissions/gimboz-craps/icons/lightning.webp" className="w-16 h-16" style={{mixBlendMode:"screen"}} alt="" />
                                    </motion.div>
                                    <h2 className="text-3xl font-black uppercase tracking-widest text-center"
                                        style={{color:GOLD, textShadow:`0 0 30px ${GOLD}`}}>
                                        GIMBOZ WILL!
                                    </h2>
                                    <p className="text-5xl font-black" style={{color:GOLD}}>500x</p>
                                </>
                            ) : finalMult===0 ? (
                                <>
                                    <img src="/submissions/gimboz-craps/icons/bonus-bust.webp" className="w-20 h-20" alt="" />
                                    <h2 className="text-2xl font-black uppercase" style={{color:"#ef4444"}}>Busted</h2>
                                </>
                            ) : (
                                <>
                                    <motion.div animate={{scale:[1,1.08,1]}} transition={{repeat:Infinity,duration:1.5}}>
                                        {finalMult>=500 ? <img src="/submissions/gimboz-craps/icons/bonus-gimboz-will.webp" className="w-14 h-14" alt="" /> : finalMult>=3 ? <img src="/submissions/gimboz-craps/icons/bonus-3x.webp" className="w-14 h-14" alt="" /> : <img src="/submissions/gimboz-craps/icons/bonus-2x.webp" className="w-14 h-14" alt="" />}
                                    </motion.div>
                                    <h2 className="text-3xl font-black uppercase" style={{ color:GOLD, fontFamily:"Chantilly,Arial Black,sans-serif" }}>{finalMult}x Multiplier</h2>
                                </>
                            )}

                            <div className="rounded-xl px-6 py-4 w-full text-center"
                                style={{background:"rgba(0,0,0,0.4)", border:`2px solid ${GOLD}44`}}>
                                <p className="text-[10px] text-white/50 uppercase tracking-widest">Final Payout</p>
                                <p className="text-4xl font-black" style={{color: finalMult>0?GOLD2:"#ef4444"}}>
                                    {finalPayout.toLocaleString()} APE
                                </p>
                                {finalMult>1 && (
                                    <p className="text-[10px] text-white/35 mt-1">
                                        ({sessionPayout.toLocaleString()} x {finalMult})
                                    </p>
                                )}
                            </div>

                            <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.97}}
                                onClick={() => onComplete(finalMult === 0 ? 0 : finalMult >= 500 ? Math.floor(sessionPayout * 500) : Math.floor(sessionPayout * finalMult))}
                                className="px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm"
                                style={{
                                    background: isCursed
                                        ? "linear-gradient(135deg, #7F1D1D, #DC2626)"
                                        : "linear-gradient(135deg, #FFD700, #B8860B)",
                                    color: isCursed ? "#fff" : "#1a0a00",
                                    boxShadow: isCursed
                                        ? "0 0 20px rgba(220,38,38,0.5)"
                                        : "0 0 20px rgba(255,215,0,0.5)",
                                }}>
                                Collect & Finish
                            </motion.button>
                        </motion.div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default BonusRound;
