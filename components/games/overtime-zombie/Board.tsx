import React from "react";
import { CellState, SYMBOLS, ROWS, COLS, SHOE_SYMBOL_ID, WORKER_SYMBOL_ID } from "./overtimeZombieConfig";

interface BoardProps {
    board: CellState[][];
    cascadeCount: number;
    isBonusRound?: boolean;
    isRevealingWorkers?: boolean;
    revealScanIndex?: number;
    revealHighlightCell?: [number, number] | null;
    isPlaying?: boolean;
    bonusMultiplier?: number;
}

const Board: React.FC<BoardProps> = ({
    board,
    cascadeCount,
    isBonusRound = false,
    isRevealingWorkers = false,
    revealScanIndex = -1,
    revealHighlightCell = null,
    isPlaying = false,
    bonusMultiplier = 1,
}) => {
    if (board.length === 0) {
        return (
            <div className={`sa-board sa-board-empty ${isBonusRound ? "sa-board-bonus" : ""}`}>
                <div className="sa-board-placeholder">
                    {isPlaying ? "SPIN TO WIN" : "INSERT COIN TO PLAY"}
                </div>
            </div>
        );
    }

    return (
        <div className={`sa-board ${isBonusRound ? "sa-board-bonus" : ""}`}>
            {Array.from({ length: ROWS }, (_, row) => (
                <div key={row} className="sa-board-row">
                    {Array.from({ length: COLS }, (_, col) => {
                        const cell = board[row]?.[col];
                        if (!cell) return null;

                        // Empty/consumed slot
                        if (cell.isConsumed) {
                            return (
                                <div
                                    key={`${row}-${col}-${cascadeCount}-empty`}
                                    className="sa-cell sa-cell-empty"
                                />
                            );
                        }

                        const symbol = SYMBOLS[cell.symbolId];
                        const isShoe = cell.symbolId === SHOE_SYMBOL_ID;
                        const isWorker = cell.symbolId === WORKER_SYMBOL_ID;

                        // During reveal: determine if this cell has been scanned or is highlighted.
                        // Workers stay "attacked" through the rest of the bonus round (including the
                        // post-reveal payout / spin-ready window) — not just while the crawl is active.
                        const cellLinearIndex = row * COLS + col;
                        const bonusActive = isRevealingWorkers || isBonusRound;
                        const isScanned = bonusActive && cellLinearIndex < revealScanIndex;
                        const isWorkerHighlight = revealHighlightCell !== null
                            && revealHighlightCell[0] === row
                            && revealHighlightCell[1] === col;
                        // Persist red highlight on workers that have already been "attacked"
                        const isAttackedWorker = isWorker && isScanned;

                        const cellClasses = [
                            "sa-cell",
                            isShoe ? "sa-cell-shoe" : "",
                            isWorker ? "sa-cell-worker" : "",
                            cell.isMatched ? "sa-cell-matched" : "",
                            cell.isDropping ? "sa-cell-dropping" : "",
                            cell.isFreshBoard ? "sa-cell-fresh-board" : (cell.isNew ? "sa-cell-new" : ""),
                            isRevealingWorkers && !isScanned && !isWorkerHighlight ? "sa-cell-dimmed" : "",
                            isWorkerHighlight ? "sa-cell-worker-found" : "",
                            isAttackedWorker ? "sa-cell-worker-attacked" : "",
                        ].filter(Boolean).join(" ");

                        // Restock animation staggers:
                        //   Fresh board (Spin / Bonus entry): left→right column wave (50ms per col).
                        //   Cascade refill: rarer symbols pop in later via a quadratic curve
                        //   (id² × 6) — commons land near-synchronously, mid tier reads as a
                        //   staircase (~30ms steps), rares trail distinctly.
                        const restockDelay = cell.isFreshBoard
                            ? `${col * 50}ms`
                            : cell.isNew
                                ? `${Math.min(cell.symbolId, 7) ** 2 * 6}ms`
                                : undefined;

                        return (
                            <div
                                key={`${row}-${col}-${cascadeCount}-${cell.symbolId}-${cell.isDropping ? "drop" : ""}`}
                                className={cellClasses}
                                style={{
                                    color: symbol.color,
                                    borderColor: (cell.isMatched || isWorkerHighlight) ? symbol.color : "transparent",
                                    ...(restockDelay ? { animationDelay: restockDelay } : {}),
                                }}
                            >
                                {symbol.image ? (
                                    <img
                                        src={symbol.image}
                                        alt={symbol.name}
                                        className="sa-cell-sprite"
                                    />
                                ) : (
                                    <span className="sa-cell-symbol">{symbol.shape}</span>
                                )}
                                {isWorkerHighlight && (
                                    <span
                                        key={`mult-${row}-${col}-${bonusMultiplier}`}
                                        className="sa-multiplier-float"
                                    >
                                        {bonusMultiplier}X
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

export default Board;
