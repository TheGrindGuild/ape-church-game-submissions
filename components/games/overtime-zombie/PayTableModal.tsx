import React from "react";
import { X } from "lucide-react";
import {
    SYMBOLS,
    KICK_THRESHOLD,
} from "./overtimeZombieConfig";

interface PayTableModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PayTableModal: React.FC<PayTableModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="sa-modal-backdrop" onClick={onClose}>
            <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
                <button
                    type="button"
                    className="sa-modal-close"
                    onClick={onClose}
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="sa-modal-title">GAME INFO</h2>

                <p className="sa-modal-subtitle">
                    Match 7 or more identical Snacks anywhere on the board to win!
                    Winning Snacks are dispensed into the Zombie Meter and the
                    vending machine is restocked for cascading wins.
                </p>

                <h3 className="sa-modal-section-title" style={{ color: "#a855f7" }}>PAY TABLE (Based on a 1 APE Bet)</h3>

                {/* Tier header */}
                <div className="sa-paytable-header">
                    <span className="sa-paytable-symbol-col">Symbol</span>
                    <span className="sa-paytable-tier-col">7-8</span>
                    <span className="sa-paytable-tier-col">9-10</span>
                    <span className="sa-paytable-tier-col">11+</span>
                </div>

                <div className="sa-paytable-rows">
                    {SYMBOLS.filter((sym) => !sym.isKick && !sym.isWorker).map((sym) => (
                        <div key={sym.id} className="sa-paytable-row">
                            <span className="sa-paytable-symbol-col">
                                {sym.image ? (
                                    <img src={sym.image} alt={sym.name} className="sa-paytable-icon" />
                                ) : (
                                    <span style={{ color: sym.color }}>{sym.shape}</span>
                                )}
                                <span className="sa-paytable-name">{sym.name}</span>
                            </span>
                            <span className="sa-paytable-tier-col">{sym.payoutMultipliers[0].toFixed(2)}x</span>
                            <span className="sa-paytable-tier-col">{sym.payoutMultipliers[1].toFixed(2)}x</span>
                            <span className="sa-paytable-tier-col">{sym.payoutMultipliers[2].toFixed(2)}x</span>
                        </div>
                    ))}
                </div>

                {/* Special symbols */}
                <h3 className="sa-modal-section-title" style={{ color: "#a855f7" }}>SPECIAL SYMBOLS</h3>

                <div className="sa-paytable-special">
                    {SYMBOLS[8].image && (
                        <img src={SYMBOLS[8].image} alt="Kick" className="sa-paytable-icon" />
                    )}
                    <div className="sa-paytable-special-text">
                        <div className="sa-paytable-special-name" style={{ color: "#FFD700" }}>KICK THE MACHINE</div>
                        <div className="sa-paytable-special-desc">
                            {KICK_THRESHOLD}+ Shoes and no matches left?
                            Spend the Shoes, reset board, &amp; increase Zombie Meter by 1 Stage!
                        </div>
                    </div>
                </div>

                <div className="sa-paytable-special">
                    {SYMBOLS[9].image && (
                        <img src={SYMBOLS[9].image} alt="Worker" className="sa-paytable-icon" />
                    )}
                    <div className="sa-paytable-special-text">
                        <div className="sa-paytable-special-name" style={{ color: "#38BDF8" }}>OFFICE WORKER</div>
                        <div className="sa-paytable-special-desc">
                            Bonus Round Only! Each Worker adds +0.5x to your spin total.
                        </div>
                    </div>
                </div>

                <h3 className="sa-modal-section-title" style={{ color: "#a855f7" }}>ZOMBIE METER</h3>
                <p className="sa-modal-text">
                    Fill the Zombie Meter to release the Overtime Zombie and reach the
                    Bonus Round! You&apos;ve got one spin to hunt down Workers! The meter
                    resets each spin so chain those cascades!
                </p>
            </div>
        </div>
    );
};

export default PayTableModal;
