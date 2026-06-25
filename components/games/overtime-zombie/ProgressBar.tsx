import React from "react";
import { METER_MAX, METER_STAGE_THRESHOLD, STAGE_COLORS } from "./overtimeZombieConfig";

interface ProgressBarProps {
    points: number;
    zombieReleased: boolean;
    // True once the worker-attack scan/reveal phase begins. Until then the
    // released banner stays as the purple "OVERTIME ZOMBIE / RELEASED!!"
    // and only swaps to the red "SNACK ATTACK!!" when the crawl starts.
    inAttackPhase?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ points, zombieReleased, inAttackPhase = false }) => {
    if (zombieReleased) {
        const textClass = inAttackPhase
            ? "sa-zombie-released sa-zombie-released-attack"
            : "sa-zombie-released";
        const text = inAttackPhase ? (
            <>OVERTIME ZOMBIE<br />SNACK ATTACK!!</>
        ) : (
            <>OVERTIME ZOMBIE<br />RELEASED!!</>
        );
        return (
            <div className="sa-meter-container sa-meter-released">
                <div className={textClass}>{text}</div>
            </div>
        );
    }

    const percentage = Math.min((points / METER_MAX) * 100, 100);
    const currentStage = Math.min(
        Math.floor(points / METER_STAGE_THRESHOLD),
        STAGE_COLORS.length - 1
    );
    const barColor = STAGE_COLORS[currentStage];

    return (
        <div className="sa-meter-container">
            <img src="/submissions/overtime-zombie/meterHuman.webp" alt="Human" className="sa-meter-bookend" />
            <div className="sa-progress-track">
                {/* Stage markers */}
                {STAGE_COLORS.map((_, i) => {
                    if (i === 0) return null;
                    const markerPos = (i * METER_STAGE_THRESHOLD / METER_MAX) * 100;
                    return (
                        <div
                            key={i}
                            className="sa-progress-marker"
                            style={{ left: `${markerPos}%` }}
                        />
                    );
                })}
                <div
                    className="sa-progress-fill"
                    style={{
                        width: `${percentage}%`,
                        backgroundColor: barColor,
                    }}
                />
            </div>
            <img src="/submissions/overtime-zombie/meterZombie.webp" alt="Zombie" className="sa-meter-bookend" />
        </div>
    );
};

export default ProgressBar;
