'use client';

import { useEffect, useRef } from 'react';

interface GlowBorderProps {
  spinning: boolean;
}

// Simple pulsing gold glow — no movement, no particles.
// Uses requestAnimationFrame to smoothly animate the box-shadow intensity.
export default function GlowBorder({ spinning }: GlowBorderProps) {
  const ref     = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const rafRef   = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      frameRef.current++;

      // Slow breath when idle, faster pulse when spinning
      const speed = spinning ? 0.10 : 0.025;
      const t     = Math.sin(frameRef.current * speed);  // -1 to 1
      const pulse = (t + 1) / 2;                         //  0 to 1

      const inner  = spinning ? 18 + 12 * pulse : 6 + 4 * pulse;
      const outer  = spinning ? 36 + 24 * pulse : 14 + 8 * pulse;
      const alphaB = spinning ? 0.55 + 0.45 * pulse : 0.30 + 0.25 * pulse;
      const alphaO = spinning ? 0.30 + 0.20 * pulse : 0.12 + 0.10 * pulse;

      el.style.boxShadow = [
        `0 0 ${inner}px rgba(212,160,23,${alphaB.toFixed(2)})`,
        `0 0 ${outer}px rgba(212,160,23,${alphaO.toFixed(2)})`,
        `inset 0 0 ${(inner * 0.4).toFixed(0)}px rgba(212,160,23,${(alphaO * 0.7).toFixed(2)})`,
      ].join(', ');

      el.style.borderColor = `rgba(212,160,23,${(0.4 + 0.4 * pulse).toFixed(2)})`;
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [spinning]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        inset: -4,
        borderRadius: 16,
        border: '1.5px solid rgba(212,160,23,0.5)',
        pointerEvents: 'none',
        zIndex: 20,
      }}
    />
  );
}
