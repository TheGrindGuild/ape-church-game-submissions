"use client";

import React, { useLayoutEffect, useRef, useState } from "react";

// Snack Attack is designed against a 1500px-wide canvas — every position
// `calc(N% + Mpx)` in snack-attack.styles.css and OvertimeZombieWindow.tsx
// is tuned for that width. This wrapper renders the canvas at the natural
// design width and applies a CSS transform to fit the available viewport:
//
//   - Desktop (>= 768px): uniformly scales the WHOLE 1500px canvas down to
//     fit the viewport width. Scale capped at 1.0 (no upscale beyond design).
//
//   - Mobile (< 768px): zooms in on the central column of the canvas via
//     scale + translateX. Shows just the vending machine + spin/info
//     controls; the worker/desk decoration on the sides is cropped via
//     overflow:hidden. All overlay positions stay correct because they
//     scale + translate together as one unit — no per-overlay re-tuning.
//
// The mobile constants below define the "window" into the design canvas
// that the mobile viewport shows. They're tuned to include the vending
// machine display + the spin/info button column to its right.
const DESIGN_WIDTH = 1500;
const MOBILE_BREAKPOINT = 768;
// Width (in design pixels) of the slice of the canvas the mobile viewport
// shows. Smaller = bigger visuals but more cropping; larger = more visible
// but smaller controls. 700 keeps spin button ~30px (touchable but tight).
const MOBILE_DESIGN_WINDOW = 700;
// Design-space x point that should appear at the horizontal CENTER of the
// mobile viewport. Tuned by eye against the vending machine art.
const MOBILE_FOCUS_X = 713;

interface OvertimeZombieScalerProps {
    children: React.ReactNode;
}

const OvertimeZombieScaler: React.FC<OvertimeZombieScalerProps> = ({ children }) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    // Design-space px to shift the inner canvas LEFT (applied before scale).
    // 0 on desktop; tuned to center the mobile focus point on viewport for mobile.
    const [translateX, setTranslateX] = useState(0);
    const [naturalHeight, setNaturalHeight] = useState(0);

    useLayoutEffect(() => {
        const wrapper = wrapperRef.current;
        const inner = innerRef.current;
        if (!wrapper || !inner) return;

        const recalc = (): void => {
            const w = wrapper.clientWidth;
            const isMobile = w < MOBILE_BREAKPOINT;
            if (isMobile) {
                // Mobile zoom: scale so MOBILE_DESIGN_WINDOW fits viewport width;
                // translate so MOBILE_FOCUS_X lands at viewport horizontal center.
                setScale(w / MOBILE_DESIGN_WINDOW);
                setTranslateX(MOBILE_FOCUS_X - MOBILE_DESIGN_WINDOW / 2);
            } else {
                // Desktop: uniform shrink-to-fit the full 1500px canvas.
                setScale(Math.min(w / DESIGN_WIDTH, 1));
                setTranslateX(0);
            }
            // offsetHeight ignores the transform and reads the un-scaled
            // layout height — that's the canvas's natural design height.
            setNaturalHeight(inner.offsetHeight);
        };

        recalc();

        const wrapperObserver = new ResizeObserver(recalc);
        wrapperObserver.observe(wrapper);
        // Inner may change height when game state mutates child layout
        // (rare with our absolute-positioned overlays, but defensive).
        const innerObserver = new ResizeObserver(() => {
            setNaturalHeight(inner.offsetHeight);
        });
        innerObserver.observe(inner);

        return () => {
            wrapperObserver.disconnect();
            innerObserver.disconnect();
        };
    }, []);

    return (
        <div
            ref={wrapperRef}
            // overflow:hidden because the un-scaled inner div is always
            // DESIGN_WIDTH px wide (1500); we mask the bits that extend
            // past the scaled visual size — and on mobile, the bits that
            // are translated off to the left.
            style={{ width: "100%", height: naturalHeight * scale, overflow: "hidden" }}
        >
            <div
                ref={innerRef}
                style={{
                    width: DESIGN_WIDTH,
                    // Order matters: translate first (in element local space),
                    // then scale. Reading right-to-left, the inner ones apply first.
                    transform: `scale(${scale}) translateX(-${translateX}px)`,
                    transformOrigin: "top left",
                }}
            >
                {children}
            </div>
        </div>
    );
};

export default OvertimeZombieScaler;
