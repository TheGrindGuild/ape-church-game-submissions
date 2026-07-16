"use client";

import React, { useEffect, useState, useRef } from "react";

// ─── Pip layouts per face ─────────────────────────────────────────────────────
// Each face is a 3x3 grid — positions: TL, TC, TR, ML, MC, MR, BL, BC, BR
const FACE_PIPS: Record<number, boolean[]> = {
    1: [false, false, false, false, true,  false, false, false, false],
    2: [true,  false, false, false, false, false, false, false, true ],
    3: [true,  false, false, false, true,  false, false, false, true ],
    4: [true,  false, true,  false, false, false, true,  false, true ],
    5: [true,  false, true,  false, true,  false, true,  false, true ],
    6: [true,  false, true,  true,  false, true,  true,  false, true ],
};

// CSS 3D rotation to show each face value
const FACE_ROTATIONS: Record<number, string> = {
    1: "rotateY(0deg)",
    2: "rotateX(-90deg)",
    3: "rotateY(90deg)",
    4: "rotateY(-90deg)",
    5: "rotateX(90deg)",
    6: "rotateY(180deg)",
};

// Random intermediate rotations for tumble effect
const TUMBLE_KEYFRAMES = [
    "rotateX(180deg) rotateY(90deg)",
    "rotateX(360deg) rotateY(180deg)",
    "rotateX(270deg) rotateY(270deg) rotateZ(90deg)",
    "rotateX(450deg) rotateY(360deg) rotateZ(180deg)",
];

interface Die3DProps {
    value: number;
    isRolling: boolean;
    glowing?: boolean;
    size?: number; // px
    delay?: number; // ms
}

const Die3D: React.FC<Die3DProps> = ({ value, isRolling, glowing = false, size = 80, delay = 0 }) => {
    const [transform, setTransform] = useState(FACE_ROTATIONS[value]);
    const [tumbling, setTumbling] = useState(false);
    const frameRef = useRef<number>(0);
    const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

    useEffect(() => {
        // Clear any existing timers
        timeoutRefs.current.forEach(t => clearTimeout(t));
        timeoutRefs.current = [];

        if (isRolling) {
            setTumbling(true);
            // Cycle through random rotations rapidly
            let step = 0;
            const totalSteps = 8;
            const stepDuration = 110;

            const cycle = () => {
                const rx = Math.floor(Math.random() * 4) * 90;
                const ry = Math.floor(Math.random() * 4) * 90;
                const rz = Math.floor(Math.random() * 2) * 45;
                setTransform(`rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`);
                step++;
                if (step < totalSteps) {
                    const t = setTimeout(cycle, stepDuration);
                    timeoutRefs.current.push(t);
                } else {
                    // Settle to final value after delay
                    const t = setTimeout(() => {
                        setTransform(FACE_ROTATIONS[value]);
                        setTumbling(false);
                    }, stepDuration);
                    timeoutRefs.current.push(t);
                }
            };

            const startT = setTimeout(cycle, delay);
            timeoutRefs.current.push(startT);
        } else {
            setTumbling(false);
            setTransform(FACE_ROTATIONS[value]);
        }

        return () => {
            timeoutRefs.current.forEach(t => clearTimeout(t));
        };
    }, [isRolling, value, delay]);

    const faceStyle = (face: number): React.CSSProperties => ({
        position: "absolute",
        width: size,
        height: size,
        backfaceVisibility: "hidden",
        border: `1px solid ${glowing ? "#A8E10C44" : "#3D3D6E"}`,
        borderRadius: size * 0.18,
        background: glowing
            ? "linear-gradient(135deg, #1a2e00 0%, #0d1a00 100%)"
            : "linear-gradient(135deg, #252545 0%, #0e0e22 100%)",
        boxShadow: glowing
            ? `inset 0 0 ${size * 0.15}px rgba(168,225,12,0.15), 0 0 ${size * 0.2}px rgba(168,225,12,0.4)`
            : `inset 0 0 ${size * 0.12}px rgba(0,0,0,0.6)`,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        padding: size * 0.12,
        gap: size * 0.04,
        transform: (() => {
            const half = size / 2;
            switch (face) {
                case 1: return `rotateY(0deg) translateZ(${half}px)`;
                case 2: return `rotateX(90deg) translateZ(${half}px)`;
                case 3: return `rotateY(-90deg) translateZ(${half}px)`;
                case 4: return `rotateY(90deg) translateZ(${half}px)`;
                case 5: return `rotateX(-90deg) translateZ(${half}px)`;
                case 6: return `rotateY(180deg) translateZ(${half}px)`;
                default: return "";
            }
        })(),
    });

    const pipStyle: React.CSSProperties = {
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        background: glowing ? "#A8E10C" : "#7DC200",
        boxShadow: `0 0 ${size * 0.06}px #A8E10C`,
    };

    const emptyPipStyle: React.CSSProperties = {
        width: "100%",
        height: "100%",
    };

    return (
        <div
            style={{
                width: size,
                height: size,
                perspective: size * 5,
                perspectiveOrigin: "50% 50%",
            }}
        >
            <div
                style={{
                    width: size,
                    height: size,
                    position: "relative",
                    transformStyle: "preserve-3d",
                    transform,
                    transition: tumbling
                        ? `transform ${delay > 0 ? 80 : 80}ms ease-in-out`
                        : "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
            >
                {[1, 2, 3, 4, 5, 6].map(face => (
                    <div key={face} style={faceStyle(face)}>
                        {FACE_PIPS[face].map((hasPip, i) => (
                            <div key={i} style={hasPip ? pipStyle : emptyPipStyle} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Die3D;
