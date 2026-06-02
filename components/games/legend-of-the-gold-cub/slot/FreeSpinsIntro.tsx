'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface FreeSpinsIntroProps {
  spinsAwarded: number;
}

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  baseScale: number;
}

export default function FreeSpinsIntro({ spinsAwarded }: FreeSpinsIntroProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth;
    const H = el.clientHeight;

    // Scene
    const scene    = new THREE.Scene();
    const camera   = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, 0.1, 1000);
    camera.position.z = 100;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    // Particle geometry — small diamond-ish octahedron for sparkle feel
    const geo = new THREE.OctahedronGeometry(4, 0);

    const COLORS = [0xFFD700, 0xFF8C00, 0xFFE066, 0x00D4FF, 0xFFFFFF, 0xFFA040];

    const particles: Particle[] = [];
    const COUNT = 120;

    for (let i = 0; i < COUNT; i++) {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(geo, mat);

      // All start at center
      mesh.position.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        0,
      );

      const angle   = Math.random() * Math.PI * 2;
      const speed   = 1.5 + Math.random() * 5;
      const maxLife = 90 + Math.random() * 60;

      particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: 0,
        life: 0,
        maxLife,
        baseScale: 0.4 + Math.random() * 1.2,
      });

      scene.add(mesh);
    }

    // Soft background radial glow via a large circle plane
    const bgGeo = new THREE.CircleGeometry(Math.max(W, H) * 0.6, 64);
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x001a22,
      transparent: true,
      opacity: 0,
    });
    const bgCircle = scene.add(new THREE.Mesh(bgGeo, bgMat));
    void bgCircle;

    let frame = 0;
    let rafId = 0;

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      frame++;

      for (const p of particles) {
        p.life++;
        const t = p.life / p.maxLife;

        // Gravity-ish arc
        p.vy -= 0.04;

        p.mesh.position.x += p.vx;
        p.mesh.position.y += p.vy;
        p.mesh.rotation.x += 0.06;
        p.mesh.rotation.y += 0.04;

        // Scale: burst in then shrink out
        const scale = p.baseScale * Math.sin(t * Math.PI);
        p.mesh.scale.setScalar(Math.max(scale, 0.01));

        // Fade out in last 30% of life
        const mat = p.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;

        // Respawn
        if (p.life >= p.maxLife) {
          p.life = 0;
          p.mesh.position.set(
            (Math.random() - 0.5) * 30,
            (Math.random() - 0.5) * 30,
            0,
          );
          const angle = Math.random() * Math.PI * 2;
          const speed = 1.5 + Math.random() * 5;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed;
          const color = COLORS[Math.floor(Math.random() * COLORS.length)];
          mat.color.setHex(color);
          p.maxLife = 90 + Math.random() * 60;
        }
      }

      renderer.render(scene, camera);
    };

    tick();

    return () => {
      cancelAnimationFrame(rafId);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      particles.forEach(p => {
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.MeshBasicMaterial).dispose();
      });
    };
  }, []);

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none overflow-hidden">

      {/* Three.js canvas layer */}
      <div ref={mountRef} className="absolute inset-0" />

      {/* Dark radial backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,30,40,0.82) 0%, rgba(0,0,0,0.92) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-2 sm:gap-3">

        {/* Top label */}
        <p
          className="text-xs sm:text-sm font-bold tracking-[0.35em] uppercase"
          style={{ color: 'rgba(0,212,255,0.75)' }}
        >
          Golden Cubs Have Spoken
        </p>

        {/* Main title */}
        <p
          className="font-black text-4xl sm:text-6xl lg:text-7xl tracking-widest uppercase"
          style={{
            color: '#FFD700',
            textShadow: [
              '0 0 12px #FFD700',
              '0 0 30px #FF8C00',
              '0 0 60px #FF4500',
              '0 0 100px rgba(255,140,0,0.4)',
            ].join(', '),
            fontFamily: 'Georgia, serif',
            letterSpacing: '0.08em',
            animation: 'fsTextPulse 1.4s ease-in-out infinite',
          }}
        >
          Free Spins
        </p>

        {/* Spin count badge */}
        <div
          className="flex flex-col items-center justify-center mt-1"
          style={{
            width: 96, height: 96,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,212,255,0.18) 0%, rgba(0,80,120,0.12) 100%)',
            border: '2px solid rgba(0,212,255,0.6)',
            boxShadow: [
              '0 0 16px rgba(0,212,255,0.6)',
              '0 0 40px rgba(0,180,220,0.3)',
              'inset 0 0 20px rgba(0,212,255,0.1)',
            ].join(', '),
            animation: 'fsBadgePulse 1.2s ease-in-out infinite',
          }}
        >
          <span
            className="font-black tabular-nums leading-none"
            style={{
              fontSize: spinsAwarded >= 20 ? '2.2rem' : '2.6rem',
              color: '#00D4FF',
              textShadow: '0 0 12px rgba(0,212,255,0.9)',
            }}
          >
            {spinsAwarded}
          </span>
          <span
            className="text-[10px] font-bold tracking-widest uppercase mt-0.5"
            style={{ color: 'rgba(0,212,255,0.7)' }}
          >
            spins
          </span>
        </div>

        {/* Thin gold divider */}
        <div style={{
          width: 160,
          height: 1,
          background: 'linear-gradient(90deg, transparent, #D4A017, transparent)',
          marginTop: 4,
        }} />

        <p
          className="text-xs tracking-widest uppercase"
          style={{ color: 'rgba(212,160,23,0.55)' }}
        >
          Spins on the house
        </p>
      </div>

      <style>{`
        @keyframes fsTextPulse {
          0%, 100% { text-shadow: 0 0 12px #FFD700, 0 0 30px #FF8C00, 0 0 60px #FF4500; }
          50%       { text-shadow: 0 0 20px #FFD700, 0 0 50px #FF8C00, 0 0 90px #FF4500, 0 0 120px rgba(255,80,0,0.5); }
        }
        @keyframes fsBadgePulse {
          0%, 100% { box-shadow: 0 0 16px rgba(0,212,255,0.6), 0 0 40px rgba(0,180,220,0.3), inset 0 0 20px rgba(0,212,255,0.1); }
          50%       { box-shadow: 0 0 28px rgba(0,212,255,0.9), 0 0 70px rgba(0,180,220,0.5), inset 0 0 30px rgba(0,212,255,0.2); }
        }
      `}</style>
    </div>
  );
}
