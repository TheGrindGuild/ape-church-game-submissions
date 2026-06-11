"use client";

import React, { useEffect, useState } from "react";
import {
    FROGLING_SPRITE_SHEETS,
    FROG_DISPLAY_SCALE,
    FROG_REFERENCE_FRAME_HEIGHT,
    FROG_TARGET_HEIGHT,
    FroglingAnimationName,
    getSpriteDisplayCellWidth,
} from "./swampHopSprites";

interface SpriteSheetAnimationProps {
    animation: FroglingAnimationName;
    play?: boolean;
    restartKey?: string | number;
    className?: string;
    alt?: string;
}

const SpriteSheetAnimation: React.FC<SpriteSheetAnimationProps> = ({
    animation,
    play = true,
    restartKey,
    className,
    alt = "Frogling",
}) => {
    const sheet = FROGLING_SPRITE_SHEETS[animation];
    const [frameIndex, setFrameIndex] = useState(0);

    useEffect(() => {
        if (!play || sheet.frameCount <= 1) {
            return undefined;
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect -- restart sprite on hop
        setFrameIndex(0);

        const intervalMs = Math.max(
            16,
            Math.floor(1000 / Math.max(1, sheet.fps))
        );

        const intervalId = window.setInterval(() => {
            setFrameIndex((previous) => {
                const next = previous + 1;
                if (next >= sheet.frameCount) {
                    return sheet.loop ? 0 : previous;
                }
                return next;
            });
        }, intervalMs);

        return () => window.clearInterval(intervalId);
    }, [play, sheet.frameCount, sheet.fps, sheet.loop, animation, restartKey]);

    const cellWidth = getSpriteDisplayCellWidth(sheet.frameWidth);
    const cellHeight = FROG_TARGET_HEIGHT;
    const offsetX = frameIndex * sheet.frameWidth * FROG_DISPLAY_SCALE;
    const cropTopY = Math.max(
        sheet.rowY,
        sheet.rowY + sheet.frameHeight - FROG_REFERENCE_FRAME_HEIGHT
    );
    const offsetY = cropTopY * FROG_DISPLAY_SCALE;

    return (
        <div
            className="swamp-hop-sprite-box"
            role="img"
            aria-label={alt}
            style={{ width: cellWidth, height: cellHeight }}
        >
            <div
                className={`swamp-hop-sprite-cell ${className ?? ""}`}
                style={{
                    backgroundImage: `url(${sheet.src})`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: `-${offsetX}px -${offsetY}px`,
                    backgroundSize: `${sheet.sheetWidth * FROG_DISPLAY_SCALE}px ${sheet.sheetHeight * FROG_DISPLAY_SCALE}px`,
                }}
            />
        </div>
    );
};

export default SpriteSheetAnimation;
