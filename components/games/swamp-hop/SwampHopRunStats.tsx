import React from "react";

interface SwampHopRunStatsProps {
    currentBank: number;
    currentMultiplier: number;
    currentHopIndex: number;
    maxHops: number;
}

const SwampHopRunStats: React.FC<SwampHopRunStatsProps> = ({
    currentBank,
    currentMultiplier,
    currentHopIndex,
    maxHops,
}) => {
    const hopProgress = maxHops > 0 ? (currentHopIndex / maxHops) * 100 : 0;

    return (
        <div
            className="swamp-hop-hud"
            aria-live="polite"
            aria-label="Current run stats"
        >
            <div className="swamp-hop-stat">
                <p className="swamp-hop-stat-label">Bank</p>
                <p className="swamp-hop-stat-value gold">
                    {currentBank.toFixed(2)} APE
                </p>
            </div>
            <div className="swamp-hop-stat">
                <p className="swamp-hop-stat-label">Multiplier</p>
                <p className="swamp-hop-stat-value">
                    {currentMultiplier.toFixed(2)}x
                </p>
            </div>
            <div className="swamp-hop-stat">
                <p className="swamp-hop-stat-label">Hops</p>
                <p className="swamp-hop-stat-value">
                    {Math.min(currentHopIndex, maxHops)} / {maxHops}
                </p>
            </div>
            <div className="swamp-hop-progress">
                <div
                    className="swamp-hop-progress-fill"
                    style={{ width: `${hopProgress}%` }}
                />
            </div>
        </div>
    );
};

export default SwampHopRunStats;
