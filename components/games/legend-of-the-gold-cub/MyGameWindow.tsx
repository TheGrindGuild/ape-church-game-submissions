'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import useSound from 'use-sound';
import { Game } from '@/lib/games';
import { GameState, SymbolId } from './types';
import { ALL_SYMBOL_IDS, NUM_REELS, NUM_ROWS, NUM_PAYLINES } from './myGameConfig';
import ReelStrip from './slot/ReelStrip';
import GlowBorder from './slot/GlowBorder';
import WinParticles, { WinLevel } from './slot/WinParticles';
import FreeSpinsIntro from './slot/FreeSpinsIntro';

interface MyGameWindowProps {
  game: Game;
  gameState: GameState;
  isActive: boolean;
  onAllReelsStopped: () => void;
  spinTrigger: number;
  betPerLine: number;
}

const REEL_DELAYS = [700, 950, 1200, 1450, 1700];

const IDLE_SYMBOLS: SymbolId[][] = [
  ['golden_cub',         'gold_apechain_tiger', 'apechain_cowboy'],
  ['camo_cub',           'og_top_hat',          'green_cub'      ],
  ['purple_cub',         'camo_cub',            'golden_cub'     ],
  ['gold_apechain_tiger','apechain_cowboy',      'og_top_hat'     ],
  ['green_cub',          'camo_cub',            'purple_cub'     ],
];

function winLevelFor(lastSpinWin: number, betPerLine: number, hasWinLines: boolean): WinLevel {
  if (!hasWinLines && lastSpinWin <= 0) return null;
  // Compare against the TOTAL BET (betPerLine × 20 paylines) — not betPerLine alone.
  // On a 5 APE bet: totalBet=5, big=50 APE, mega=100 APE, jackpot=250 APE.
  const totalBet = betPerLine * NUM_PAYLINES;
  if (lastSpinWin >= totalBet * 50) return 'jackpot';
  if (lastSpinWin >= totalBet * 20) return 'mega';
  if (lastSpinWin >= totalBet * 10) return 'big';
  if (lastSpinWin > 0)              return 'small';
  return null;
}

export default function MyGameWindow({
  game,
  gameState,
  isActive,
  onAllReelsStopped,
  spinTrigger,
  betPerLine,
}: MyGameWindowProps) {
  const muteSfx    = false;
  const sfxVolume  = 0.6;
  const [winSFX]        = useSound('/submissions/legend-of-the-gold-cub/sfx/win.mp3',        { volume: sfxVolume,       soundEnabled: !muteSfx, interrupt: true });
  const [bigWinSFX]     = useSound('/submissions/legend-of-the-gold-cub/sfx/big-win.mp3',    { volume: sfxVolume,       soundEnabled: !muteSfx, interrupt: true });
  const [freeSpinSFX]   = useSound('/submissions/legend-of-the-gold-cub/sfx/free-spins.mp3', { volume: sfxVolume * 0.9, soundEnabled: !muteSfx, interrupt: true });
  const [noWinSFX]      = useSound('/submissions/legend-of-the-gold-cub/sfx/no-win.mp3',     { volume: sfxVolume * 0.55,soundEnabled: !muteSfx, interrupt: true });
  const [spinStartSFX]  = useSound('/submissions/legend-of-the-gold-cub/sfx/spin-start.mp3', { volume: sfxVolume,       soundEnabled: !muteSfx, interrupt: true });
  const [reelDropSFX]   = useSound('/submissions/legend-of-the-gold-cub/sfx/reel-drop.mp3',  { volume: sfxVolume * 0.8, soundEnabled: !muteSfx });
  const [reelSpinPlay, { stop: reelSpinStop, sound: reelSpinHowl }] = useSound(
    '/submissions/legend-of-the-gold-cub/sfx/reel-spin.mp3',
    { volume: sfxVolume * 0.7, loop: true, soundEnabled: !muteSfx }
  );
  const reelSpinActiveRef = useRef(false);

  const [spinning, setSpinning]       = useState<boolean[]>(Array(NUM_REELS).fill(false));

  // Win display
  const [winLevel, setWinLevel]             = useState<WinLevel>(null);
  const [winCounterVal, setWinCounterVal]   = useState(0);
  const [showWinDisplay, setShowWinDisplay] = useState(false);
  const [flashOpacity, setFlashOpacity]     = useState(0);
  const [counterDone, setCounterDone]       = useState(false);

  const winIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flashTimerRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const winTargetRef   = useRef(0); // used by skip handler
  const stoppedRef     = useRef(0);
  const prevTriggerRef = useRef(0);

  const hasResolvedReels = gameState.reels.length === NUM_REELS
    && gameState.reels.every(r => r.length === NUM_ROWS);
  const visibleReels = hasResolvedReels ? gameState.reels : IDLE_SYMBOLS;

  // Per-reel win highlight rows
  const reelHighlights: number[][] = Array.from({ length: NUM_REELS }, () => []);
  if (gameState.phase === 'WIN_DISPLAY') {
    for (const wl of gameState.activeWinLines) {
      for (let r = 0; r < wl.count && r < NUM_REELS; r++) {
        if (!reelHighlights[r].includes(wl.positions[r])) {
          reelHighlights[r].push(wl.positions[r]);
        }
      }
    }
  }

  // Kick reel animations
  useEffect(() => {
    if (spinTrigger === 0 || spinTrigger === prevTriggerRef.current) return;
    prevTriggerRef.current = spinTrigger;
    stoppedRef.current = 0;

    // Clear previous win display
    setWinLevel(null);
    setShowWinDisplay(false);
    setCounterDone(false);
    setFlashOpacity(0);
    winTargetRef.current = 0;
    if (winIntervalRef.current) clearInterval(winIntervalRef.current);
    if (flashTimerRef.current)  clearTimeout(flashTimerRef.current);

    // Play spin-start SFX then loop the reel-spin tick
    spinStartSFX();
    reelSpinPlay();
    reelSpinActiveRef.current = true;

    setSpinning(Array(NUM_REELS).fill(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinTrigger]);

  const handleReelStopped = useCallback(() => {
    reelDropSFX();
    stoppedRef.current += 1;
    if (stoppedRef.current === NUM_REELS) {
      setSpinning(Array(NUM_REELS).fill(false));
      // Fade out the reel spin loop over 300ms then stop it
      if (reelSpinActiveRef.current) {
        reelSpinActiveRef.current = false;
        const howl = reelSpinHowl as { fade?: (from: number, to: number, duration: number) => void } | null;
        if (howl?.fade) {
          howl.fade(sfxVolume * 0.7, 0, 300);
          setTimeout(() => reelSpinStop(), 320);
        } else {
          reelSpinStop();
        }
      }
      onAllReelsStopped();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reelDropSFX, reelSpinHowl, reelSpinStop, onAllReelsStopped]);

  // Win display logic — fires when phase becomes WIN_DISPLAY
  useEffect(() => {
    if (gameState.phase !== 'WIN_DISPLAY') {
      setWinLevel(null);
      setShowWinDisplay(false);
      return;
    }

    const { lastSpinWin, activeWinLines } = gameState;
    const hasWin = lastSpinWin > 0;

    if (!hasWin && activeWinLines.length === 0) {
      noWinSFX();
      return;
    }

    const level = winLevelFor(lastSpinWin, betPerLine, activeWinLines.length > 0);

    // Scatter → free spins SFX takes priority over regular win SFX
    if (gameState.scatterCount >= 3) {
      freeSpinSFX();
    } else if (level === 'jackpot' || level === 'mega' || level === 'big') {
      bigWinSFX();
    } else {
      winSFX();
    }
    setWinLevel(level);
    setShowWinDisplay(true);
    setCounterDone(false);

    // Screen flash for big/mega/jackpot
    if (level === 'jackpot' || level === 'mega' || level === 'big') {
      setFlashOpacity(0.7);
      flashTimerRef.current = setTimeout(() => setFlashOpacity(0), 300);
    }

    // Counter duration scales with win size
    const durationMs = level === 'jackpot' ? 4000
                     : level === 'mega'    ? 3000
                     : level === 'big'     ? 2500
                     :                       1800;

    const target = lastSpinWin;
    const steps  = 60;
    winTargetRef.current = target;
    setWinCounterVal(0);

    if (winIntervalRef.current) clearInterval(winIntervalRef.current);
    let step = 0;
    winIntervalRef.current = setInterval(() => {
      step++;
      // Ease-out cubic — fast climb then slows dramatically
      const eased = 1 - Math.pow(1 - step / steps, 3);
      setWinCounterVal(target * Math.min(eased, 1));
      if (step >= steps) {
        clearInterval(winIntervalRef.current!);
        setCounterDone(true);
      }
    }, durationMs / steps);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.phase]);

  // Skip counter animation when user taps screen during WIN_DISPLAY
  const handleScreenTap = useCallback(() => {
    if (gameState.phase !== 'WIN_DISPLAY') return;
    if (winIntervalRef.current) {
      clearInterval(winIntervalRef.current);
      winIntervalRef.current = null;
    }
    setWinCounterVal(winTargetRef.current);
    setCounterDone(true);
  }, [gameState.phase]);

  const isSpinningAny = spinning.some(Boolean);

  // Win counter label styling by level
  const winLabelMap: Record<NonNullable<WinLevel>, { label: string; color: string; glow: string; scale: string }> = {
    small:    { label: 'Winner',   color: '#FFD700', glow: '#FFD700',  scale: 'text-3xl' },
    big:      { label: 'Big Win',  color: '#FFD700', glow: '#FF8C00',  scale: 'text-5xl' },
    mega:     { label: 'Mega Win', color: '#FFD700', glow: '#FF4500',  scale: 'text-6xl' },
    jackpot:  { label: 'Jackpot',  color: '#FFD700', glow: '#FF2200',  scale: 'text-7xl' },
    freespins:{ label: 'Free Spins!', color: '#00CFFF', glow: '#007FFF', scale: 'text-5xl' },
  };

  return (
    <div
      className="absolute inset-0 z-0 flex flex-col items-center justify-center select-none overflow-hidden px-2 sm:px-4 lg:px-7"
      onClick={handleScreenTap}
    >

      {/* Screen flash overlay — fires on big/mega/jackpot */}
      <div
        className="absolute inset-0 z-50 pointer-events-none"
        style={{
          background: 'white',
          opacity: flashOpacity,
          transition: 'opacity 0.3s ease-out',
        }}
      />

      {/* Three.js particle system — active during WIN_DISPLAY */}
      <WinParticles winLevel={gameState.phase === 'WIN_DISPLAY' ? winLevel : null} />

      {/* Game logo — responsive sizing */}
      <div className="relative z-10 w-full flex justify-center mb-1 sm:mb-2 pointer-events-none">
        <Image
          src="/submissions/legend-of-the-gold-cub/logo.webp"
          alt="Legend of the Gold Cub"
          width={1000}
          height={294}
          priority
          className="w-[90%] sm:w-[82%] max-w-[600px] object-contain"
        />
      </div>

      {/* Free Spins Banner — shown while free spins are active */}
      {gameState.freeSpinsRemaining > 0 && gameState.phase !== 'FREE_SPINS_INTRO' && (
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap"
          style={{ animation: 'fsBannerPop 0.4s cubic-bezier(0.175,0.885,0.32,1.275) both' }}
        >
          <div
            className="flex items-center gap-2 px-4 py-1.5 rounded-full"
            style={{
              background: 'linear-gradient(135deg, rgba(0,20,30,0.95) 0%, rgba(0,40,55,0.95) 100%)',
              border: '1.5px solid rgba(0,212,255,0.7)',
              boxShadow: '0 0 14px rgba(0,212,255,0.5), 0 0 30px rgba(0,180,220,0.25), inset 0 0 10px rgba(0,212,255,0.06)',
              animation: 'fsBannerGlow 1.6s ease-in-out infinite',
            }}
          >
            {/* Pulsing dot */}
            <span
              className="inline-block rounded-full"
              style={{
                width: 7, height: 7,
                background: '#00D4FF',
                boxShadow: '0 0 6px rgba(0,212,255,0.9)',
                animation: 'fsDotPulse 1s ease-in-out infinite',
              }}
            />
            <span
              className="text-xs font-black tracking-widest uppercase"
              style={{ color: 'rgba(0,212,255,0.9)' }}
            >
              Free Spins
            </span>
            {/* Count badge */}
            <span
              className="flex items-center justify-center rounded-full font-black tabular-nums text-xs"
              style={{
                minWidth: 22, height: 22, padding: '0 5px',
                background: 'rgba(0,212,255,0.15)',
                border: '1px solid rgba(0,212,255,0.5)',
                color: '#00D4FF',
                textShadow: '0 0 8px rgba(0,212,255,0.9)',
              }}
            >
              {gameState.freeSpinsRemaining}
            </span>
            <span
              className="text-[10px] tracking-wider uppercase"
              style={{ color: 'rgba(0,212,255,0.5)' }}
            >
              left
            </span>
          </div>
        </div>
      )}

      {/* Free Spins Intro — Three.js particle burst */}
      {gameState.phase === 'FREE_SPINS_INTRO' && (
        <FreeSpinsIntro spinsAwarded={gameState.freeSpinsRemaining} />
      )}

      {/* ── Reel Grid — near full width of game window ── */}
      <div
        className="relative z-10 flex gap-1 sm:gap-2 p-2 sm:p-3 lg:p-[14px_16px]"
        style={{
          width: '100%',
          background: 'rgba(0,0,0,0.65)',
          borderRadius: 16,
          boxShadow: 'inset 0 0 50px rgba(0,0,0,0.75), 0 4px 24px rgba(0,0,0,0.5)',
        }}
      >
        <GlowBorder spinning={isSpinningAny} />

        {/* Full-grid shimmer sweep — a single slow light that crosses all 5 reels */}
        <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden" style={{ zIndex: 25 }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(108deg, transparent 30%, rgba(255,255,255,0.04) 50%, transparent 70%)',
            animation: 'gridShimmer 9s ease-in-out infinite',
          }} />
        </div>

        {Array.from({ length: NUM_REELS }).map((_, reel) => (
          <div key={reel} style={{ flex: 1, minWidth: 0 }}>
            <ReelStrip
              targetSymbols={visibleReels[reel]}
              isSpinning={spinning[reel]}
              spinDuration={REEL_DELAYS[reel]}
              onStopped={handleReelStopped}
              highlightRows={reelHighlights[reel]}
            />
          </div>
        ))}

        {/* Top/bottom gradient mask */}
        <div className="absolute inset-x-0 top-0 h-4 pointer-events-none rounded-t-2xl"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)' }} />
        <div className="absolute inset-x-0 bottom-0 h-4 pointer-events-none rounded-b-2xl"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }} />
      </div>

      <style>{`
        @keyframes gridShimmer {
          0%   { transform: translateX(-120%); opacity: 0; }
          8%   { opacity: 1; }
          50%  { transform: translateX(120%); opacity: 0.8; }
          51%  { opacity: 0; transform: translateX(120%); }
          100% { transform: translateX(120%); opacity: 0; }
        }
      `}</style>

      {/* ── Win Display overlay ── */}
      {showWinDisplay && winLevel && gameState.phase === 'WIN_DISPLAY' && (
        <div
          className="absolute inset-x-0 z-30 flex flex-col items-center justify-center pointer-events-none"
          style={{
            bottom: winLevel === 'jackpot' || winLevel === 'mega' ? '6%' : '3%',
            animation: 'winPop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
          }}
        >
          {/* Backdrop panel — gives contrast against busy reel symbols */}
          <div
            className="px-6 sm:px-10 py-3 sm:py-4 rounded-2xl flex flex-col items-center"
            style={{
              background: 'linear-gradient(135deg, rgba(10,5,0,0.88) 0%, rgba(40,20,0,0.82) 100%)',
              border: `1px solid ${winLabelMap[winLevel].glow}55`,
              boxShadow: `0 0 24px ${winLabelMap[winLevel].glow}40, inset 0 1px 0 rgba(255,255,255,0.07)`,
              backdropFilter: 'blur(6px)',
            }}
          >
            {/* Win level label */}
            <p
              className={`font-black tracking-wide ${winLabelMap[winLevel].scale}`}
              style={{
                color: winLabelMap[winLevel].color,
                textShadow: `0 0 16px ${winLabelMap[winLevel].glow}, 0 0 32px ${winLabelMap[winLevel].glow}`,
                fontFamily: 'Georgia, serif',
                letterSpacing: '0.05em',
              }}
            >
              {winLabelMap[winLevel].label}
            </p>

            {/* Divider */}
            <div className="w-full my-1 sm:my-2" style={{ height: 1, background: `linear-gradient(to right, transparent, ${winLabelMap[winLevel].glow}80, transparent)` }} />

            {/* Animated APE counter */}
            <div className="flex items-baseline gap-2">
              <p
                className="text-3xl sm:text-4xl lg:text-5xl font-black tabular-nums"
                style={{ color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
              >
                {winCounterVal.toFixed(3)}
              </p>
              <span className="text-lg font-bold opacity-60 text-white">APE</span>
            </div>

            {/* Skip hint */}
            {!counterDone && (
              <p className="mt-2 text-xs text-white/35 animate-pulse tracking-widest uppercase">
                Tap to skip
              </p>
            )}
          </div>
        </div>
      )}

      {/* Scatter trigger banner */}
      {gameState.phase === 'WIN_DISPLAY' && gameState.scatterCount >= 3 && (
        <div
          className="absolute top-14 left-1/2 -translate-x-1/2 z-20 px-5 py-1.5 rounded-full text-sm font-bold whitespace-nowrap"
          style={{
            background: '#0ea5e9',
            color: '#fff',
            boxShadow: '0 0 16px rgba(14,165,233,0.8)',
            animation: 'winPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
          }}
        >
          {gameState.scatterCount} Golden Cubs — Free Spins incoming
        </div>
      )}

      <style>{`
        @keyframes winPop {
          from { opacity: 0; transform: scale(0.6); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes fsBannerPop {
          from { opacity: 0; transform: translateX(-50%) scale(0.7); }
          to   { opacity: 1; transform: translateX(-50%) scale(1); }
        }
        @keyframes fsBannerGlow {
          0%,100% { box-shadow: 0 0 14px rgba(0,212,255,0.5), 0 0 30px rgba(0,180,220,0.25), inset 0 0 10px rgba(0,212,255,0.06); }
          50%     { box-shadow: 0 0 22px rgba(0,212,255,0.85), 0 0 50px rgba(0,180,220,0.45), inset 0 0 16px rgba(0,212,255,0.12); }
        }
        @keyframes fsDotPulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%     { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}
