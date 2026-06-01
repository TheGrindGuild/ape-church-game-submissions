'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SymbolId } from '../types';
import { SYMBOL_CONFIG, ALL_SYMBOL_IDS } from '../myGameConfig';

// ── Constants ────────────────────────────────────────────────────────────────

const CELL    = 1.0;  // Three.js height units per symbol row
const VISIBLE = 3;    // Rows shown in the camera
const STRIP   = 28;   // Number of planes in the virtual strip (> spin sequence)

// ── Shared texture cache — loaded once, reused by all 5 reel instances ───────
// NOTE: must not call TextureLoader at module level — it accesses `document`
// and would crash during Next.js server-side rendering.

const TEX: Partial<Record<SymbolId, THREE.Texture>> = {};

function getTexture(id: SymbolId): THREE.Texture {
  if (!TEX[id]) {
    TEX[id] = new THREE.TextureLoader().load(SYMBOL_CONFIG[id].image);
  }
  return TEX[id]!;
}

// ── Component ────────────────────────────────────────────────────────────────

interface ReelStripProps {
  targetSymbols: SymbolId[];  // [top, mid, bottom]
  isSpinning: boolean;
  spinDuration: number;        // ms before this reel stops
  onStopped: () => void;
  highlightRows?: number[];    // rows with a win highlight ring
}

export default function ReelStrip({
  targetSymbols,
  isSpinning,
  spinDuration,
  onStopped,
  highlightRows = [],
}: ReelStripProps) {
  const mountRef    = useRef<HTMLDivElement>(null);
  const mountedRef  = useRef(true);

  // settled = animation fully done — glow only shows after this
  const [settled, setSettled] = useState(true);
  // Stable random shimmer delay — initialized to '0s' for SSR, set client-side to avoid hydration mismatch
  const [shimmerDelay, setShimmerDelay] = useState('0s');
  useEffect(() => { setShimmerDelay(`${(Math.random() * 4).toFixed(3)}s`); }, []);

  // When spin starts, hide glow immediately
  useEffect(() => {
    if (isSpinning) setSettled(false);
  }, [isSpinning]);

  // Wrapped onStopped — marks reel as settled
  const handleStopped = useCallback(() => {
    setSettled(true);
    onStopped();
  }, [onStopped]);

  // All Three.js state lives here — no React state = no re-renders during animation
  const glRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene:    THREE.Scene;
    camera:   THREE.OrthographicCamera;
    group:    THREE.Group;
    geo:      THREE.PlaneGeometry;
    rafId:    number;
    spinning: boolean;
  } | null>(null);

  // Latest targets — updated synchronously without triggering effects
  const targetsRef = useRef<SymbolId[]>(targetSymbols);
  targetsRef.current = targetSymbols;

  // ── Mount: create renderer, scene, camera, geometry ───────────────────────

  useEffect(() => {
    mountedRef.current = true;
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth  || 80;
    const H = el.clientHeight || W * VISIBLE;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;border-radius:inherit;';
    el.appendChild(renderer.domElement);

    // Camera: orthographic, shows exactly VISIBLE × CELL units tall
    const camH = VISIBLE * CELL;
    const camW = camH * (W / H);
    const camera = new THREE.OrthographicCamera(-camW / 2, camW / 2, camH / 2, -camH / 2, 0.1, 100);
    camera.position.z = 10;

    const scene = new THREE.Scene();
    const group = new THREE.Group();
    scene.add(group);

    // Shared geometry: one plane per symbol, 90% of a cell to leave a thin gap
    const geo = new THREE.PlaneGeometry(camW * 0.92, CELL * 0.92);

    // Build STRIP planes; initially show target symbols in the top 3 slots
    for (let i = 0; i < STRIP; i++) {
      const sym = targetSymbols[i % VISIBLE];
      const mat = new THREE.MeshBasicMaterial({ map: getTexture(sym), transparent: true, depthWrite: false });
      const mesh = new THREE.Mesh(geo, mat);
      // Top of camera = camH/2; first plane centre = camH/2 - CELL/2 = 1.0
      mesh.position.y = camH / 2 - CELL / 2 - i * CELL;
      // Only first VISIBLE planes are in the camera frustum initially
      mesh.visible = i < VISIBLE;
      group.add(mesh);
    }

    // Idle render loop (keeps canvas live for win highlights / static display)
    let rafId = 0;
    const idle = () => {
      if (!mountedRef.current) return;
      rafId = requestAnimationFrame(idle);
      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(idle);

    glRef.current = { renderer, scene, camera, group, geo, rafId, spinning: false };

    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(rafId);
      geo.dispose();
      group.children.forEach(c => ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).dispose());
      renderer.dispose();
      renderer.domElement.remove();
      glRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update static symbols when targetSymbols change (and not spinning) ─────

  useEffect(() => {
    const gl = glRef.current;
    if (!gl || gl.spinning) return;

    const camH = VISIBLE * CELL;
    for (let i = 0; i < VISIBLE; i++) {
      const mesh = gl.group.children[i] as THREE.Mesh;
      if (!mesh) continue;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.map = getTexture(targetSymbols[i]);
      mat.needsUpdate = true;
      mesh.visible = true;
      mesh.position.y = camH / 2 - CELL / 2 - i * CELL;
    }
    // Hide overflow planes
    for (let i = VISIBLE; i < STRIP; i++) {
      const m = gl.group.children[i] as THREE.Mesh;
      if (m) m.visible = false;
    }
  }, [targetSymbols]);

  // ── Spin animation — symbols fall downward, left reel to right ──────────────

  useEffect(() => {
    const gl = glRef.current;
    if (!isSpinning || !gl || gl.spinning) return;

    gl.spinning = true;

    const { renderer, scene, camera, group } = gl;
    const camH = VISIBLE * CELL;

    // Build the strip from bottom→up so symbols fall from the top:
    //   plane[0] at world y = -1.0 (bottom row)
    //   plane[1] at world y =  0.0 (middle row)
    //   plane[2] at world y = +1.0 (top row)
    //   plane[3..] above visible — they come INTO VIEW as group scrolls down
    //
    // Sequence order: [random×22, target_bottom, target_middle, target_top]
    // So when the group has moved down by totalCells:
    //   plane[22] is at bottom (-1.0)  → shows targets[2]
    //   plane[23] is at middle (0.0)   → shows targets[1]
    //   plane[24] is at top (+1.0)     → shows targets[0]

    const seq: SymbolId[] = [];
    for (let i = 0; i < 22; i++) {
      seq.push(ALL_SYMBOL_IDS[Math.floor(Math.random() * ALL_SYMBOL_IDS.length)]);
    }
    // Reversed: bottom target first so it lands at the bottom row
    seq.push(targetsRef.current[2]); // lands at bottom
    seq.push(targetsRef.current[1]); // lands at middle
    seq.push(targetsRef.current[0]); // lands at top

    const totalCells = seq.length - VISIBLE; // 22

    // Assign textures once (no per-frame texture swaps needed)
    // and position each plane bottom→up
    group.position.y = 0;
    group.children.forEach((c, i) => {
      const mesh = c as THREE.Mesh;
      const mat  = mesh.material as THREE.MeshBasicMaterial;
      mat.map = getTexture(seq[Math.min(i, seq.length - 1)]);
      mat.needsUpdate = true;
      mesh.visible    = true;
      // plane[0] at bottom (-1.0), increasing upward
      mesh.position.y = -(camH / 2 - CELL / 2) + i * CELL;
    });

    cancelAnimationFrame(gl.rafId);

    let startTime: number | null = null;
    let done = false;

    const animate = (timestamp: number) => {
      if (!mountedRef.current) return;
      if (!startTime) startTime = timestamp;

      const elapsed  = timestamp - startTime;
      const progress = Math.min(elapsed / spinDuration, 1);

      // Ease-out cubic — fast at start, decelerates to a smooth stop
      const eased   = 1 - Math.pow(1 - progress, 3);
      const scrolled = totalCells * eased;

      // Move the entire group downward — no per-plane texture swapping needed
      group.position.y = -scrolled * CELL;

      renderer.render(scene, camera);

      if (progress < 1) {
        gl.rafId = requestAnimationFrame(animate);
      } else if (!done) {
        done = true;
        gl.spinning = false;

        // Reset group offset and restore the normal static top→down layout
        group.position.y = 0;
        group.children.forEach((c) => { (c as THREE.Mesh).visible = false; });

        targetsRef.current.forEach((sym, i) => {
          const mesh = group.children[i] as THREE.Mesh;
          if (!mesh) return;
          const mat  = mesh.material as THREE.MeshBasicMaterial;
          mat.map = getTexture(sym);
          mat.needsUpdate = true;
          mesh.visible    = true;
          // Normal top→down: plane[0] at top, plane[1] middle, plane[2] bottom
          mesh.position.y = camH / 2 - CELL / 2 - i * CELL;
        });

        // Resume idle loop
        const idle = () => {
          if (!mountedRef.current) return;
          gl.rafId = requestAnimationFrame(idle);
          renderer.render(scene, camera);
        };
        gl.rafId = requestAnimationFrame(idle);

        handleStopped();
      }
    };

    gl.rafId = requestAnimationFrame(animate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpinning]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="relative"
      style={{ width: '100%', aspectRatio: `1/${VISIBLE}` }}
    >
      {/* Three.js canvas */}
      <div
        ref={mountRef}
        className="w-full h-full rounded-lg overflow-hidden bg-black/40 border border-white/10"
      />

      {/* Periodic shimmer sweep — very subtle diagonal light that passes over the reel */}
      <div
        className="absolute inset-0 rounded-lg pointer-events-none overflow-hidden"
        style={{ zIndex: 8 }}
      >
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.07) 50%, transparent 75%)',
          animationName: 'reelShimmer',
          animationDuration: `${7 + (highlightRows.length ? 0 : 3)}s`,
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
          animationDelay: shimmerDelay,
        }} />
      </div>

      {/* Ambient glow — shown only once the reel has fully settled (not during spin) */}
      {settled && targetSymbols.map((sym, row) => {
        const isJackpot    = sym === 'gold_apechain_tiger';
        const isScatterSym = sym === 'golden_cub';
        if (!isJackpot && !isScatterSym) return null;

        return (
          <div
            key={`ambient-${row}`}
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              top:    `${(row / VISIBLE) * 100}%`,
              height: `${(1 / VISIBLE) * 100}%`,
              borderRadius: 8,
              zIndex: 12,
              // Use longhand properties to avoid shorthand/animationDelay conflict
              animationName:            isJackpot ? 'jackpotAmbient' : 'scatterAmbient',
              animationDuration:        isJackpot ? '3.5s' : '3s',
              animationTimingFunction:  'ease-in-out',
              animationIterationCount:  'infinite',
              animationDirection:       'alternate',
              animationDelay:           `${row * 0.6}s`,
              animationFillMode:        'both',
            }}
          />
        );
      })}

      {/* Win highlight rings */}
      {highlightRows.map(row => (
        <div
          key={`win-${row}`}
          className="absolute left-0 right-0 pointer-events-none rounded-sm"
          style={{
            top:    `${(row / VISIBLE) * 100}%`,
            height: `${(1 / VISIBLE) * 100}%`,
            boxShadow: 'inset 0 0 0 2px #FFD700, 0 0 14px #FFD700',
            zIndex: 14,
          }}
        />
      ))}

      <style>{`
        /* Light sweep across each reel */
        @keyframes reelShimmer {
          0%   { transform: translateX(-200%); opacity: 0;   }
          10%  { opacity: 1; }
          40%  { transform: translateX(250%);  opacity: 0.6; }
          41%  { opacity: 0; transform: translateX(250%); }
          100% { transform: translateX(250%);  opacity: 0;   }
        }
        /* Jackpot (angel_tiger) — warm gold pulse */
        @keyframes jackpotAmbient {
          from {
            box-shadow:
              0 0 10px rgba(255,215,0,0.45),
              0 0 22px rgba(255,180,0,0.20),
              inset 0 0 10px rgba(255,215,0,0.18);
          }
          to {
            box-shadow:
              0 0 20px rgba(255,215,0,0.80),
              0 0 40px rgba(255,180,0,0.38),
              inset 0 0 18px rgba(255,215,0,0.32);
          }
        }
        /* Scatter (golden_cub) — cool cyan pulse */
        @keyframes scatterAmbient {
          from {
            box-shadow:
              0 0 10px rgba(0,210,255,0.45),
              0 0 22px rgba(0,140,255,0.20),
              inset 0 0 10px rgba(0,210,255,0.18);
          }
          to {
            box-shadow:
              0 0 20px rgba(0,210,255,0.80),
              0 0 40px rgba(0,140,255,0.38),
              inset 0 0 18px rgba(0,210,255,0.32);
          }
        }
      `}</style>
    </div>
  );
}
