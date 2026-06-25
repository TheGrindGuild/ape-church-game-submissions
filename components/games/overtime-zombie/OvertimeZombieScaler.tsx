"use client";

import React, { useLayoutEffect, useRef, useState } from "react";

// Snack Attack is designed against a 1500px-wide canvas — every position
// `calc(N% + Mpx)` in snack-attack.styles.css and OvertimeZombieWindow.tsx
// is tuned for that width. This wrapper renders the canvas at the natural
// design width and uniformly scales it down to fit the available browser
// width via CSS transform, so the layout never breaks on narrower screens.
//
// Scale is capped at 1.0 — we don't upscale beyond design size to avoid
// text antialiasing artifacts at >1500px viewports.
const DESIGN_WIDTH = 1500;

interface OvertimeZombieScalerProps {
    children: React.ReactNode;
}

const OvertimeZombieScaler: React.FC<OvertimeZombieScalerProps> = ({ children }) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [naturalHeight, setNaturalHeight] = useState(0);

    useLayoutEffect(() => {
        const wrapper = wrapperRef.current;
        const inner = innerRef.current;
        if (!wrapper || !inner) return;

        const recalc = (): void => {
            const newScale = Math.min(wrapper.clientWidth / DESIGN_WIDTH, 1);
            setScale(newScale);
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
            // past the scaled visual size.
            style={{ width: "100%", height: naturalHeight * scale, overflow: "hidden" }}
        >
            <div
                ref={innerRef}
                style={{
                    width: DESIGN_WIDTH,
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                }}
            >
                {children}
            </div>
        </div>
    );
};

export default OvertimeZombieScaler;
