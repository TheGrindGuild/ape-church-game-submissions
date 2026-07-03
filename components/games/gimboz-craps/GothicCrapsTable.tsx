"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BetType, GamePhase, PRE_POINT_BETS, POST_POINT_BETS } from "./gimbozCrapsConfig";

const G      = "#A8E10C";   // neon green accent
const GOLD   = "#FFD700";   // gold payouts
// Unified warm palette - borders only, text is always cream/white
const PASS_C = "#FFD700";   // pass line - gold (hero bet)
const DP_C   = "#FF8A80";   // don't pass - soft salmon
const COME_C = "#90CAF9";   // come - soft blue
const DC_C   = "#FFAB91";   // don't come - soft peach
const FIELD_C= "#FFE082";   // field - soft gold
const PLACE_C= "#80DEEA";   // place bets - soft teal
const A7_C   = "#FFCC80";   // any seven - soft orange
const CRAPS_C= "#EF9A9A";   // any craps - soft red
const HARD_C = "#CE93D8";   // hardways - soft lavender
const TEXT_C = "#F5F0E8";   // universal cream text - same everywhere
const CHIP_COLORS: Record<number, string> = {
    1: "#9F7AEA", 5: "#4299E1", 10: "#ECC94B",
    25: "#48BB78", 100: "#F56565", 250: "#ED8936",
};
const closestChip = (amt: number) =>
    ([1,5,10,25,100,250] as const).slice().reverse().find(v => v <= amt) ?? 1;
const chipLabel = (a: number) =>
    a >= 1000 ? `${(a/1000).toFixed(a%1000===0?0:1)}k` : String(a);

const BET_INFO: Record<BetType, { title:string; how:string; win:string; lose:string; pays:string }> = {
    passLine:     { title:"PASS LINE",        how:"Bet before the come-out roll.",                          win:"7 or 11 on come-out, or point before 7.",  lose:"2, 3 or 12 on come-out, or 7 before point.", pays:"1 to 1" },
    dontPass:     { title:"DON'T PASS BAR",   how:"Betting against the shooter before come-out.",           win:"2 or 3 on come-out, or 7 before point.",   lose:"7 or 11 on come-out, or point before 7.",    pays:"1 to 1 (12=push)" },
    come:         { title:"COME",             how:"Like Pass Line - place AFTER the point is set.",         win:"7 or 11 on next roll, or come-point before 7.", lose:"2, 3 or 12 on next roll.",              pays:"1 to 1" },
    dontCome:     { title:"DON'T COME BAR",   how:"Like Don't Pass - place AFTER the point is set.",        win:"2 or 3 on next roll, or 7 before come-point.", lose:"7 or 11 on next roll.",                 pays:"1 to 1 (12=push)" },
    place4:       { title:"PLACE 4",          how:"Bet 4 rolls before 7. Available after point is set.",    win:"4 rolls before a 7.",  lose:"7 rolls first.",  pays:"9 to 5" },
    place5:       { title:"PLACE 5",          how:"Bet 5 rolls before 7. Available after point is set.",    win:"5 rolls before a 7.",  lose:"7 rolls first.",  pays:"7 to 5" },
    place6:       { title:"PLACE 6",          how:"Bet 6 rolls before 7. Available after point is set.",    win:"6 rolls before a 7.",  lose:"7 rolls first.",  pays:"7 to 6" },
    place8:       { title:"PLACE 8",          how:"Bet 8 rolls before 7. Available after point is set.",    win:"8 rolls before a 7.",  lose:"7 rolls first.",  pays:"7 to 6" },
    place9:       { title:"PLACE 9",          how:"Bet 9 rolls before 7. Available after point is set.",    win:"9 rolls before a 7.",  lose:"7 rolls first.",  pays:"7 to 5" },
    place10:      { title:"PLACE 10",         how:"Bet 10 rolls before 7. Available after point is set.",   win:"10 rolls before a 7.", lose:"7 rolls first.",  pays:"9 to 5" },
    field:        { title:"FIELD BET",        how:"One-roll bet only. Wins or loses on the very next roll.",win:"2, 3, 4, 9, 10, 11, or 12.", lose:"5, 6, 7, or 8.", pays:"1:1 · 2=2:1 · 12=3:1" },
    hard4:        { title:"HARD 4",           how:"2+2 rolls before 7 or easy 4.",  win:"Roll 2+2.", lose:"7 or easy 4.", pays:"7 to 1" },
    hard6:        { title:"HARD 6",           how:"3+3 rolls before 7 or easy 6.",  win:"Roll 3+3.", lose:"7 or easy 6.", pays:"9 to 1" },
    hard8:        { title:"HARD 8",           how:"4+4 rolls before 7 or easy 8.",  win:"Roll 4+4.", lose:"7 or easy 8.", pays:"9 to 1" },
    hard10:       { title:"HARD 10",          how:"5+5 rolls before 7 or easy 10.", win:"Roll 5+5.", lose:"7 or easy 10.",pays:"7 to 1" },
    any7:         { title:"ANY SEVEN",        how:"One-roll prop. Next roll must be 7.", win:"Any 7.", lose:"Anything else.", pays:"4 to 1" },
    anyCraps:     { title:"ANY CRAPS",        how:"One-roll prop. Next roll must be 2, 3, or 12.", win:"2, 3, or 12.", lose:"Anything else.", pays:"7 to 1" },
    passOdds:     { title:"PASS ODDS",        how:"True odds on Pass Line point. ZERO house edge!", win:"Point before 7.", lose:"7 before point.", pays:"4,10→2:1  5,9→3:2  6,8→6:5" },
    dontPassOdds: { title:"DON'T PASS ODDS",  how:"Lay odds against point. ZERO house edge!", win:"7 before point.", lose:"Point before 7.", pays:"4,10→1:2  5,9→2:3  6,8→5:6" },
};

interface GothicCrapsTableProps {
    point: number | null;
    phase: GamePhase;
    bets: Partial<Record<BetType, number>>;
    selectedChipValue: number;
    onBetPlace: (type: BetType) => void;
    onClearBet: (type: BetType) => void;
    interactive: boolean;
    winningZones?: BetType[]; // zones that paid on last roll - glow green
    closeInfo?: boolean; // close info panel when rolling
}

const GothicCrapsTable: React.FC<GothicCrapsTableProps> = ({
    point, phase, bets, selectedChipValue, onBetPlace, onClearBet, interactive, winningZones = [], closeInfo = false,
}) => {
    const [hovered, setHovered] = useState<BetType | null>(null);
    const [hoveredY, setHoveredY] = useState<number>(0);
    const [infoOpen, setInfoOpen] = useState<BetType | null>(null);
    const [bonusInfoOpen, setBonusInfoOpen] = useState(false);

    // Auto-close info panel when rolling starts or overlay shows
    React.useEffect(() => {
        if (closeInfo) setInfoOpen(null);
    }, [closeInfo]);

    const canBet = (t: BetType) => {
        if (!interactive) return false;
        return phase === "comeOut" ? PRE_POINT_BETS.includes(t) : POST_POINT_BETS.includes(t);
    };
    const amt  = (t: BetType) => bets[t] ?? 0;
    const hasB = (t: BetType) => amt(t) > 0;

    // Per-zone accent color
    const zoneColor = (t: BetType): string => {
        if (t === "passLine" || t === "passOdds") return PASS_C;
        if (t === "dontPass" || t === "dontPassOdds") return DP_C;
        if (t === "come") return COME_C;
        if (t === "dontCome") return DC_C;
        if (t === "field") return FIELD_C;
        if (t.startsWith("place")) return PLACE_C;
        if (t === "any7") return A7_C;
        if (t === "anyCraps") return CRAPS_C;
        if (t.startsWith("hard")) return HARD_C;
        return G;
    };

    // ─── Zone ─────────────────────────────────────────────────────────────────
    const Zone = ({ type, x, y, w, h, children, rx=5 }: {
        type:BetType; x:number; y:number; w:number; h:number; children?:React.ReactNode; rx?:number;
    }) => {
        const active  = hasB(type);
        const allowed = canBet(type);
        const hov     = hovered === type;
        const won     = winningZones.includes(type);
        const zc      = zoneColor(type);  // accent color for this zone
        const cc      = won ? zc : CHIP_COLORS[closestChip(amt(type))];
        const cr      = 18;

        return (
            <g onClick={(e) => {
                    // If clicking the info button area, don't place bet
                    const target = e.target as SVGElement;
                    if (target.getAttribute('data-info')) return;
                    if (allowed) onBetPlace(type);
                }}
               style={{ cursor: allowed ? "pointer" : "default" }}>
                <rect x={x} y={y} width={w} height={h} rx={rx}
                    fill={won ? `${zc}40` : active ? `${zc}30` : `${zc}12`} />
                <rect x={x} y={y} width={w} height={h} rx={rx} fill="none"
                    stroke={zc}
                    strokeWidth={won ? 3 : active ? 2.5 : 1.2}
                    strokeOpacity={won ? 0.9 : active ? 0.85 : 0.4} />
                {(won || active) && (
                    <rect x={x-2} y={y-2} width={w+4} height={h+4} rx={rx+2} fill="none"
                        stroke={zc}
                        strokeWidth={won ? 4 : 3}
                        opacity={won ? 0.35 : 0.2}/>
                )}
                {/* Locked zone - subtle dim, not harsh black */}
                {!allowed && interactive && (
                    <rect x={x} y={y} width={w} height={h} rx={rx}
                        fill="rgba(0,0,0,0.45)"/>
                )}
                {children}
                {/* ℹ info button - top-left corner, click to open info panel */}
                {BET_INFO[type] && (
                    <g onClick={(e) => { e.stopPropagation(); setInfoOpen(infoOpen === type ? null : type); setHoveredY((y + h/2) / 900); }}
                       style={{ cursor: "pointer" }} data-info="true">
                        <circle cx={x+17} cy={y+17} r={14} fill="rgba(0,0,0,0.7)" stroke={zc} strokeWidth={1.5} strokeOpacity={0.8} data-info="true"/>
                        <text x={x+17} y={y+22} textAnchor="middle" fill={zc} fillOpacity={0.95}
                            fontSize={16} fontWeight="900" fontFamily="Arial,sans-serif" data-info="true">ⓘ</text>
                    </g>
                )}
                {active && (
                    <g onClick={e=>{e.stopPropagation();onClearBet(type);}} style={{cursor:"pointer"}}>
                        <circle cx={x+w-cr-4} cy={y+h-cr-4} r={cr+2} fill="rgba(0,0,0,0.55)"/>
                        <circle cx={x+w-cr-4} cy={y+h-cr-5} r={cr} fill={cc} stroke="#000" strokeWidth={1.8}/>
                        {[0,60,120,180,240,300].map(d=>{
                            const r=d*Math.PI/180;
                            return <circle key={d} cx={(x+w-cr-4)+Math.cos(r)*(cr-5)} cy={(y+h-cr-5)+Math.sin(r)*(cr-5)} r={2.5} fill="rgba(0,0,0,0.3)"/>;
                        })}
                        <circle cx={x+w-cr-4} cy={y+h-cr-5} r={cr-6} fill={cc}/>
                        <text x={x+w-cr-4} y={y+h-cr-1} textAnchor="middle" fill="white"
                            fontSize={amt(type)>=100?9:11} fontWeight="900"
                            fontFamily="Arial Black,sans-serif">{chipLabel(amt(type))}</text>
                    </g>
                )}
            </g>
        );
    };

    // Text helpers - tuned for 900×820 viewBox
    const T = (x:number,y:number,txt:string,sz:number,op=1,col=TEXT_C) => (
        <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fill={col} fillOpacity={op} fontSize={sz} fontWeight="800"
            fontFamily="'Chantilly','Arial Black',Arial,sans-serif" letterSpacing="0.04em">{txt}</text>
    );
    const Sub = (x:number,y:number,txt:string,sz=11,op=0.7) => (
        <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fill={TEXT_C} fillOpacity={op} fontSize={sz}
            fontFamily="'Chantilly','Arial Black',Arial,sans-serif" letterSpacing="0.03em">{txt}</text>
    );
    const Lbl = (x:number,y:number,txt:string,sz=10) => (
        <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fill={GOLD} fillOpacity={0.6} fontSize={sz}
            fontFamily="'Chantilly','Arial Black',Arial,sans-serif" fontWeight="800" letterSpacing="0.1em">{txt.toUpperCase()}</text>
    );

    // ─── Layout: viewBox 900 × 900 (square) ──────────────────────────────────
    // Rows laid out with NO overlap, explicit y positions
    // PROP BETS: bottom band with clear separator

    const X=4; const W=892;

    // Main rows - explicit y, no overlapping
    const DCY=20;  const DCH=42;   // Don't Come:  y20→62
    const PNY=70;  const PNH=120; const NC=W/6; // Place nums: y70→190
    const COY=198; const COH=96;   // Come:        y198→294
    const FIY=302; const FIH=76;   // Field:       y302→378
    const PLY=386; const PLH=110;  // Pass Line:   y386→496
    const DPY=504; const DPH=96;   // Don't Pass:  y504→600

    const PY=618;  // Proposition bets top (18px gap after Don't Pass)
    const PH=274;  // Prop section height → fills to y892
    const PW=W/6;  // 6 prop cells

    return (
        <div className="w-full h-full select-none relative"
            style={{ borderRadius:10, overflow:"hidden",
                boxShadow:`0 0 0 2px ${G}55, 0 0 60px rgba(0,0,0,0.98)` }}>
            <svg viewBox="0 0 900 900" width="100%" height="100%"
                preserveAspectRatio="xMidYMid meet"
                style={{ display:"block", position:"absolute", inset:0 }}>
                <defs>
                    <radialGradient id="gfelt" cx="50%" cy="50%" r="80%">
                        <stop offset="0%" stopColor="#1e5c30"/>
                        <stop offset="55%" stopColor="#143d1e"/>
                        <stop offset="100%" stopColor="#0a1e0d"/>
                    </radialGradient>
                    <filter id="gglow">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/>
                        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                </defs>

                {/* Background */}
                <rect x="0" y="0" width="900" height="900" rx="10" fill="url(#gfelt)"/>
                {/* Subtle gold border - casino edge, no dashes */}
                <rect x="3" y="3" width="894" height="894" rx="8" fill="none"
                    stroke="#8B6914" strokeWidth="3" strokeOpacity="0.7"/>
                <rect x="7" y="7" width="886" height="886" rx="6" fill="none"
                    stroke="#FFD700" strokeWidth="1" strokeOpacity="0.2"/>

                {/* Divider between main table and prop bets */}
                <line x1={X} y1={PY-5} x2={X+W} y2={PY-5}
                    stroke={G} strokeWidth="2" strokeOpacity="0.6"/>

                {/* ═══ MAIN TABLE ═══ */}

                {/* DON'T COME BAR */}
                <Zone type="dontCome" x={X} y={DCY} w={W} h={DCH} rx={4}>
                    {T(X+W/2, DCY+DCH/2, "DON'T COME BAR", 18, 1, DC_C)}
                </Zone>

                {/* PLACE NUMBERS */}
                {[4,5,6,8,9,10].map((num,i) => {
                    const type=`place${num}` as BetType;
                    const cx=X+i*NC+NC/2;
                    const isPoint=point===num;
                    const pays=num===4||num===10?"9:5":num===5||num===9?"7:5":"7:6";
                    return (
                        <Zone key={type} type={type} x={X+i*NC} y={PNY+18} w={NC} h={PNH-18} rx={4}>
                            {T(cx, PNY+18+(PNH-18)*0.38, String(num), 40, isPoint?1:0.9, isPoint?"#fff":PLACE_C)}
                            {Sub(cx, PNY+18+(PNH-18)*0.72, `PAYS ${pays}`, 12, 0.6)}
                            {i>0 && <line x1={X+i*NC} y1={PNY+28} x2={X+i*NC} y2={PNY+18+PNH-28}
                                stroke={G} strokeWidth={0.6} strokeOpacity={0.15}/>}
                            {isPoint && (
                                <g filter="url(#gglow)">
                                    <circle cx={X+i*NC+18} cy={PNY+18+16} r={14}
                                        fill="white" stroke="black" strokeWidth={2}/>
                                    <text x={X+i*NC+18} y={PNY+18+20} textAnchor="middle"
                                        fill="black" fontSize={9} fontWeight="900"
                                        fontFamily="Arial Black,sans-serif">ON</text>
                                </g>
                            )}
                        </Zone>
                    );
                })}

                {/* COME */}
                <Zone type="come" x={X} y={COY} w={W} h={COH} rx={5}>
                    {T(X+W/2, COY+COH*0.36, "COME", 32, 0.9)}
                    {Sub(X+W/2, COY+COH*0.7, "WIN ON 7 OR 11  -  PLACE AFTER POINT IS SET", 13, 0.85)}
                </Zone>

                {/* FIELD */}
                <Zone type="field" x={X} y={FIY} w={W} h={FIH} rx={5}>
                    {/* FIELD label left */}
                    {T(X+58, FIY+FIH*0.42, "FIELD", 17, 1, FIELD_C)}
                    {Sub(X+58, FIY+FIH*0.72, "WIN:", 13, 0.85)}
                    {/* Numbers across center */}
                    {[2,3,4,9,10,11,12].map((n,i) => {
                        const nx=X+118+i*104;
                        const isSpec=n===2||n===12;
                        return (
                            <g key={n}>
                                {T(nx, FIY+FIH*0.36, String(n), 21, 1, isSpec?GOLD:FIELD_C)}
                                {isSpec && Sub(nx, FIY+FIH*0.72, n===2?"2:1":"3:1", 15, 1)}
                            </g>
                        );
                    })}
                    {/* LOSE label right */}
                    {T(X+W-65, FIY+FIH*0.38, "LOSE ON:", 14, 1, "#ef4444")}
                    {T(X+W-65, FIY+FIH*0.68, "5  6  7  8", 16, 1, "#ef4444")}
                </Zone>

                {/* PASS LINE - hero bet, full width */}
                <Zone type="passLine" x={X} y={PLY} w={W} h={PLH} rx={5}>
                    {T(X+W/2, PLY+PLH*0.36, "PASS LINE", 38, 1, PASS_C)}
                    {Sub(X+W/2, PLY+PLH*0.63, "WIN ON 7 OR 11  •  LOSE ON 2, 3, 12  •  PAYS 1 TO 1", 13, 0.85)}
                    {Sub(X+W/2, PLY+PLH*0.82, "ADD ODDS AFTER POINT IS SET", 13, 0.45)}
                </Zone>

                {/* DON'T PASS BAR - full width, matches Pass Line */}
                <Zone type="dontPass" x={X} y={DPY} w={W} h={DPH} rx={5}>
                    {T(X+W/2, DPY+DPH*0.36, "DON'T PASS BAR", 38, 0.9)}
                    {Sub(X+W/2, DPY+DPH*0.63, "WIN ON 2 OR 3  •  LOSE ON 7 OR 11  •  12 = PUSH  •  PAYS 1 TO 1", 13, 0.85)}
                    {Sub(X+W/2, DPY+DPH*0.82, "BETTING AGAINST THE SHOOTER", 13, 0.45)}
                </Zone>

                {/* ═══ PROPOSITION BETS ROW ═══ */}

                {/* Distinct background tint for entire prop section */}
                <rect x={X} y={PY} width={W} height={PH} rx={8}
                    fill="rgba(255,215,0,0.04)" stroke={GOLD} strokeWidth={1.5} strokeOpacity={0.35}/>

                {/* Separator line above */}
                <rect x={X} y={PY-3} width={W} height={2} rx={1} fill={GOLD} fillOpacity={0.4}/>

                {/* PROPOSITION BETS label - centered at TOP of section, large and clear */}
                <rect x={X+W/2-170} y={PY+8} width={340} height={28} rx={6}
                    fill="rgba(10,8,0,0.85)" stroke={GOLD} strokeWidth={1.2} strokeOpacity={0.5}/>
                <text x={X+W/2} y={PY+22} textAnchor="middle" dominantBaseline="middle"
                    fill={GOLD} fillOpacity={1} fontSize={18} fontWeight="800"
                    fontFamily="'Chantilly','Arial Black',Arial,sans-serif" letterSpacing="0.18em">
                    PROPOSITION BETS
                </text>

                {/* 6 prop cells - Any Seven | Hard 4 | Hard 6 | Hard 8 | Hard 10 | Any Craps */}
                {/* Any Seven */}
                <Zone type="any7" x={X+PW*0+2} y={PY+42} w={PW-4} h={PH-46} rx={6}>
                    {T(X+PW*0+PW/2, PY+42+(PH-46)*0.22, "ANY", 20, 1, A7_C)}
                    {T(X+PW*0+PW/2, PY+42+(PH-46)*0.44, "SEVEN", 20, 1, A7_C)}
                    {T(X+PW*0+PW/2, PY+42+(PH-46)*0.67, "4 TO 1", 26, 1, GOLD)}
                    {Sub(X+PW*0+PW/2, PY+42+(PH-46)*0.87, "ONE ROLL", 11, 0.5)}
                </Zone>
                {/* ── Hard bet helper: draws two mini dice side by side ── */}
                {([
                    { type: "hard4"  as BetType, i: 1, half: 2, pays: "7 TO 1" },
                    { type: "hard6"  as BetType, i: 2, half: 3, pays: "9 TO 1" },
                    { type: "hard8"  as BetType, i: 3, half: 4, pays: "9 TO 1" },
                    { type: "hard10" as BetType, i: 4, half: 5, pays: "7 TO 1" },
                ] as { type: BetType; i: number; half: number; pays: string }[]).map(({ type, i, half, pays }) => {
                    const cx  = X + PW * i + PW / 2;
                    const ty  = PY + 42;   // match Any Seven/Craps offset (below label)
                    const th  = PH - 46;   // match Any Seven/Craps height
                    const num = parseInt(type.replace("hard",""));
                    const DS  = 36; // smaller die so both fit in cell with text
                    const GAP = 4;  // tighter gap

                    // pip positions inside a DS×DS die
                    const PIPS: Record<number,[number,number][]> = {
                        1:[[DS/2,DS/2]],
                        2:[[DS*.28,DS*.28],[DS*.72,DS*.72]],
                        3:[[DS*.28,DS*.28],[DS/2,DS/2],[DS*.72,DS*.72]],
                        4:[[DS*.28,DS*.28],[DS*.72,DS*.28],[DS*.28,DS*.72],[DS*.72,DS*.72]],
                        5:[[DS*.28,DS*.28],[DS*.72,DS*.28],[DS/2,DS/2],[DS*.28,DS*.72],[DS*.72,DS*.72]],
                        6:[[DS*.28,DS*.22],[DS*.72,DS*.22],[DS*.28,DS/2],[DS*.72,DS/2],[DS*.28,DS*.78],[DS*.72,DS*.78]],
                    };

                    const drawDie = (dx: number, dy: number, val: number) => (
                        <g key={`die-${dx}-${dy}`}>
                            <rect x={dx} y={dy} width={DS} height={DS} rx={9}
                                fill="#1a0f2e" stroke={HARD_C} strokeWidth={1.5} strokeOpacity={0.6}/>
                            <rect x={dx+2} y={dy+2} width={DS-4} height={DS*0.35} rx={7}
                                fill="rgba(255,255,255,0.04)"/>
                            {(PIPS[val]??[]).map(([px,py],pi) => (
                                <circle key={pi} cx={dx+px} cy={dy+py} r={DS*0.1}
                                    fill={HARD_C} opacity={0.9}
                                    style={{ filter:`drop-shadow(0 0 3px ${HARD_C})` }}/>
                            ))}
                        </g>
                    );

                    // Stack die 1 top, die 2 bottom - centred in cell
                    const totalH = DS * 2 + GAP;
                    const diceBlockTop = ty + th * 0.28;
                    const d1x = cx - DS / 2;
                    const d1y = diceBlockTop;
                    const d2y = diceBlockTop + DS + GAP;

                    return (
                        <Zone key={type} type={type} x={X+PW*i+2} y={ty} w={PW-4} h={th} rx={6}>
                            {/* HARD 4 label */}
                            {T(cx, ty + th * 0.13, `HARD ${num}`, 20, 1, HARD_C)}
                            {/* Die 1 */}
                            {drawDie(d1x, d1y, half)}
                            {/* Die 2 */}
                            {drawDie(d1x, d2y, half)}
                            {/* Payout */}
                            {T(cx, ty + th * 0.88, pays, 17, 1, GOLD)}
                        </Zone>
                    );
                })}
                {/* Any Craps */}
                <Zone type="anyCraps" x={X+PW*5+2} y={PY+42} w={PW-4} h={PH-46} rx={6}>
                    {T(X+PW*5+PW/2, PY+42+(PH-46)*0.22, "ANY", 20, 1, CRAPS_C)}
                    {T(X+PW*5+PW/2, PY+42+(PH-46)*0.44, "CRAPS", 20, 1, CRAPS_C)}
                    {T(X+PW*5+PW/2, PY+42+(PH-46)*0.67, "7 TO 1", 26, 1, GOLD)}
                    {Sub(X+PW*5+PW/2, PY+42+(PH-46)*0.87, "2 · 3 · 12", 11, 0.55)}
                </Zone>

                {/* ── Phase-based group lock overlays (inside SVG) ── */}
                {interactive && phase === "comeOut" && (
                    <g style={{ pointerEvents: "none" }}>
                        {/* Large banner covering Place Numbers + Come area */}
                        {/* Background fill over the locked zone */}
                        <rect x={X+4} y={PNY+18} width={W-8} height={(COY+COH)-(PNY+18)+4} rx={8}
                            fill="rgba(0,0,0,0.72)"/>
                        {/* Banner box - centered in locked area */}
                        {/* Compact pill banner - visible but not dominating */}
                        <rect x={X+W/2-200} y={PNY+18+(((COY+COH)-(PNY+18))/2)-18} width={400} height={36} rx={18}
                            fill="rgba(20,12,0,0.88)"
                            stroke="#F6AD55" strokeWidth={1.5} strokeOpacity={0.7}/>
                        <text x={X+W/2} y={PNY+18+(((COY+COH)-(PNY+18))/2)+4}
                            textAnchor="middle" dominantBaseline="middle"
                            fill="#F6AD55" fontSize={14} fontWeight="900"
                            fontFamily="'Arial Black',Arial,sans-serif" letterSpacing="0.08em">
                            ⚠ Unlocks after point is set
                        </text>
                    </g>
                )}

                {/* Point phase overlay handled in HTML below SVG */}

            </svg>

            {/* ── Bonuses info button — top-right corner ── */}
            <motion.button
                onClick={() => { setInfoOpen(null); setBonusInfoOpen(true); }}
                className="absolute top-2 right-2 z-30 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest"
                animate={{ boxShadow: ["0 0 4px rgba(168,225,12,0.2)", "0 0 14px rgba(168,225,12,0.7)", "0 0 4px rgba(168,225,12,0.2)"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                style={{ background: "rgba(168,225,12,0.15)", border: "1px solid rgba(168,225,12,0.5)", color: "#A8E10C" }}>
                Bonuses?
            </motion.button>

            {/* ── Point phase banner - pinned at BOTTOM so it doesn't cover betting zones ── */}
            {/* Point phase info handled in sidebar - no banner on table */}

            {/* ── Info panel - click ℹ to open, click backdrop to close ── */}
            <AnimatePresence>
                {infoOpen && BET_INFO[infoOpen] && (
                    <>
                        {/* Invisible backdrop to dismiss */}
                        <div className="absolute inset-0 z-40" onClick={() => setInfoOpen(null)} />
                        <motion.div key={infoOpen}
                            initial={{ opacity:0, y: hoveredY < 0.55 ? -8 : 8, scale:0.95 }}
                            animate={{ opacity:1, y:0, scale:1 }}
                            exit={{ opacity:0, scale:0.95 }}
                            transition={{ duration:0.15 }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 rounded-xl border"
                            style={{
                                background:"rgba(5,20,5,0.98)",
                                borderColor: zoneColor(infoOpen),
                                boxShadow:`0 0 32px ${zoneColor(infoOpen)}55, 0 8px 32px rgba(0,0,0,0.8)`,
                                width: 340,
                            }}
                            onClick={e => e.stopPropagation()}>
                            <div className="px-4 py-3 flex flex-col gap-2">
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-black tracking-widest" style={{color: zoneColor(infoOpen)}}>
                                        {BET_INFO[infoOpen].title}
                                    </p>
                                    <button onClick={() => setInfoOpen(null)}
                                        className="text-white/30 hover:text-white text-base leading-none px-1">×</button>
                                </div>
                                <p className="text-xs text-white leading-snug">{BET_INFO[infoOpen].how}</p>
                                {/* Win / Pays / Lose grid */}
                                <div className="border-t border-white/15 pt-2 grid grid-cols-3 gap-2 text-center">
                                    <div>
                                        <p className="text-[9px] text-white/60 uppercase mb-0.5 font-bold">Win on</p>
                                        <p className="text-[10px] font-bold leading-tight" style={{color:"#6EE7B7"}}>{BET_INFO[infoOpen].win}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-white/60 uppercase mb-0.5 font-bold">Pays</p>
                                        <p className="text-[10px] font-bold text-yellow-300 leading-tight">{BET_INFO[infoOpen].pays}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-white/60 uppercase mb-0.5 font-bold">Lose on</p>
                                        <p className="text-[10px] font-bold text-red-300 leading-tight">{BET_INFO[infoOpen].lose}</p>
                                    </div>
                                </div>
                                {/* Bet action */}
                                {canBet(infoOpen) && (
                                    <button
                                        onClick={() => { onBetPlace(infoOpen); setInfoOpen(null); }}
                                        className="w-full py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide text-black"
                                        style={{ background: zoneColor(infoOpen) }}>
                                        + Bet {selectedChipValue} APE on {BET_INFO[infoOpen].title}
                                    </button>
                                )}
                                {!canBet(infoOpen) && interactive && (
                                    <p className="text-[9px] text-center text-white/30 uppercase tracking-wide">
                                        Not available in this phase
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
                {bonusInfoOpen && (
                    <>
                        <div className="absolute inset-0 z-40" onClick={() => setBonusInfoOpen(false)} />
                        <motion.div
                            initial={{ opacity:0, scale:0.95 }}
                            animate={{ opacity:1, scale:1 }}
                            exit={{ opacity:0, scale:0.95 }}
                            transition={{ duration:0.15 }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 rounded-xl border"
                            style={{ background:"rgba(5,10,5,0.98)", borderColor:"#A8E10C55", boxShadow:"0 0 32px #A8E10C33, 0 8px 32px rgba(0,0,0,0.8)", width:340 }}
                            onClick={e => e.stopPropagation()}>
                            <div className="px-4 py-3 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-black tracking-widest" style={{color:"#A8E10C"}}>BONUS ROUNDS</p>
                                    <button onClick={() => setBonusInfoOpen(false)} className="text-white/30 hover:text-white text-base leading-none px-1">x</button>
                                </div>
                                {[
                                    { color:"#FFD700", title:"The Sacred Trial", trigger:"4 consecutive points in a row", desc:"Roll 3 fate dice. Minimum 1x payout — no bust. Can reach 500x (Gimboz Will)." },
                                    { color:"#DC2626", title:"The Cursed Trial", trigger:"Survive 13 rolls (Lucky 13)", desc:"Cash Out to keep your session total, or Face Your Fate. Bust is possible. Gimboz Mercy = 500x escape." },
                                    { color:"#FFD700", title:"Holy Sevens", trigger:"3 natural 7s in a row on come-out", desc:"Earns 50x on your Pass Line bet. Watch the 7-tracker in the sidebar as your streak builds." },
                                ].map(b => (
                                    <div key={b.title} className="rounded-lg p-2.5 flex flex-col gap-1"
                                        style={{ background:`${b.color}0d`, border:`1px solid ${b.color}33` }}>
                                        <p className="text-[11px] font-black" style={{color:b.color}}>{b.title}</p>
                                        <p className="text-[9px] font-bold uppercase tracking-wide text-white/40">{b.trigger}</p>
                                        <p className="text-[10px] text-white/65 leading-snug">{b.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GothicCrapsTable;
