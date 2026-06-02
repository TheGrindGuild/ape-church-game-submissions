'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Number of spark particles flowing along the border
const PARTICLE_COUNT = 180;
const TRAIL_LENGTH    = 8;    // how many trailing dots per spark

interface AnimatedBorderProps {
  spinning: boolean;
}

export default function AnimatedBorder({ spinning }: AnimatedBorderProps) {
  const mountRef   = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth  || 500;
    const H = el.clientHeight || 340;

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
    el.appendChild(renderer.domElement);

    // ── Camera (2-D orthographic, origin top-left) ────────────────────────────
    const camera = new THREE.OrthographicCamera(0, W, 0, -H, 0.1, 100);
    camera.position.z = 10;

    const scene = new THREE.Scene();

    // ── Border path: clockwise rectangle corners ──────────────────────────────
    const PAD   = 4;   // inset from container edge
    const BL    = { x: PAD,     y: -PAD       };  // top-left (y is negative in our +y-up cam)
    const BR    = { x: W - PAD, y: -PAD       };
    const TR_BR = { x: W - PAD, y: -(H - PAD) };
    const TR_BL = { x: PAD,     y: -(H - PAD) };

    // Total perimeter
    const TOP    = W - 2 * PAD;
    const RIGHT  = H - 2 * PAD;
    const BOTTOM = W - 2 * PAD;
    const LEFT   = H - 2 * PAD;
    const PERIM  = TOP + RIGHT + BOTTOM + LEFT;

    // Map t ∈ [0,1) → (x, y) along the border clockwise starting top-left
    function borderPoint(t: number): { x: number; y: number } {
      const d = ((t % 1) + 1) % 1; // normalise to [0,1)
      const len = d * PERIM;

      if (len < TOP) {
        // Top edge: left → right
        return { x: BL.x + len, y: BL.y };
      }
      if (len < TOP + RIGHT) {
        // Right edge: top → bottom
        const s = len - TOP;
        return { x: BR.x, y: BL.y - s };
      }
      if (len < TOP + RIGHT + BOTTOM) {
        // Bottom edge: right → left
        const s = len - TOP - RIGHT;
        return { x: TR_BR.x - s, y: TR_BR.y };
      }
      // Left edge: bottom → top
      const s = len - TOP - RIGHT - BOTTOM;
      return { x: TR_BL.x, y: TR_BL.y + s };
    }

    // ── Particle system ────────────────────────────────────────────────────────
    // Each spark has a t-offset along the perimeter and a speed.
    const sparks: { t: number; speed: number; size: number; brightness: number }[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      sparks.push({
        t:          Math.random(),
        speed:      0.00015 + Math.random() * 0.0003,
        size:       1.5 + Math.random() * 3,
        brightness: 0.4 + Math.random() * 0.6,
      });
    }

    // One BufferGeometry for all trail dots
    const TOTAL_DOTS = PARTICLE_COUNT * TRAIL_LENGTH;
    const positions  = new Float32Array(TOTAL_DOTS * 3);
    const colours    = new Float32Array(TOTAL_DOTS * 3);
    const sizes      = new Float32Array(TOTAL_DOTS);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colours,   3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes,     1));

    const mat = new THREE.PointsMaterial({
      size:          4,
      vertexColors:  true,
      transparent:   true,
      opacity:       0.95,
      blending:      THREE.AdditiveBlending,
      depthWrite:    false,
      sizeAttenuation: false,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // ── Static glowing border line ────────────────────────────────────────────
    const linePoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 200; i++) {
      const pt = borderPoint(i / 200);
      linePoints.push(new THREE.Vector3(pt.x, pt.y, 0));
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMat = new THREE.LineBasicMaterial({
      color:      0xd4a017,
      transparent: true,
      opacity:    0.35,
      blending:   THREE.AdditiveBlending,
    });
    const borderLine = new THREE.LineLoop(lineGeo, lineMat);
    scene.add(borderLine);

    // ── Corner glow spheres ───────────────────────────────────────────────────
    const cornerPositions = [BL, BR, TR_BR, TR_BL];
    cornerPositions.forEach(({ x, y }) => {
      const sGeo = new THREE.SphereGeometry(5, 8, 8);
      const sMat = new THREE.MeshBasicMaterial({
        color:       0xffd700,
        transparent: true,
        opacity:     0.6,
        blending:    THREE.AdditiveBlending,
      });
      const sphere = new THREE.Mesh(sGeo, sMat);
      sphere.position.set(x, y, 0);
      scene.add(sphere);
    });

    // ── Animation loop ────────────────────────────────────────────────────────
    let rafId = 0;
    let frame = 0;

    const animate = () => {
      if (!mountedRef.current) return;
      rafId = requestAnimationFrame(animate);
      frame++;

      // Speed boost when spinning
      const speedMult = spinning ? 3.0 : 1.0;

      // Update each spark and its trail
      sparks.forEach((spark, si) => {
        spark.t = (spark.t + spark.speed * speedMult) % 1;

        for (let ti = 0; ti < TRAIL_LENGTH; ti++) {
          const idx    = si * TRAIL_LENGTH + ti;
          const trailT = spark.t - ti * (0.003 + spark.speed);
          const pt     = borderPoint(trailT);
          const fade   = (1 - ti / TRAIL_LENGTH) * spark.brightness;

          positions[idx * 3]     = pt.x;
          positions[idx * 3 + 1] = pt.y;
          positions[idx * 3 + 2] = 0;

          // Colour: interpolate gold → white → dim gold by trail position
          const r = ti === 0 ? 1.0 : (1.0 * fade);
          const g = ti === 0 ? 0.9 : (0.85 * fade);
          const b = ti === 0 ? 0.2 : (0.1 * fade);

          colours[idx * 3]     = r;
          colours[idx * 3 + 1] = g;
          colours[idx * 3 + 2] = b;

          sizes[idx] = ti === 0 ? spark.size : spark.size * (1 - ti / TRAIL_LENGTH) * 0.8;
        }
      });

      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate    = true;
      geo.attributes.size.needsUpdate     = true;

      // Pulse the static border opacity
      const pulse = 0.25 + 0.15 * Math.sin(frame * 0.04);
      lineMat.opacity = pulse;

      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(rafId);
      geo.dispose();
      mat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={mountRef}
      style={{
        position: 'absolute',
        inset: -6,
        pointerEvents: 'none',
        zIndex: 20,
        borderRadius: 16,
        overflow: 'hidden',
      }}
    />
  );
}
