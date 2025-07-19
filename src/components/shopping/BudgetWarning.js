'use client';

// file: /src/components/shopping/BudgetWarning.js v1 - Budget warning notification

import React, { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';

export default function BudgetWarning({
                                          total,
                                          budget,
                                          onDismiss,
                                          onAdjustBudget,
                                          className = ''
                                      }) {
    const [show, setShow] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    const overAmount = total - budget;
    const percentOver = ((total / budget) - 1) * 100;

    useEffect(() => {
        if (total > budget && !dismissed) {
            setShow(true);
        } else {
            setShow(false);
        }
    }, [total, budget, dismissed]);

    const handleDismiss = () => {
        setDismissed(true);
        setShow(false);
        if (onDismiss) onDismiss();
    };

    const handleAdjustBudget = () => {
        if (onAdjustBudget) onAdjustBudget(total);
        handleDismiss();
    };

    if (!show) return null;

    return (
        <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
            <div style={{
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}>
                <div className="flex items-start gap-3">
                    <div className="text-red-500 text-xl flex-shrink-0">
                        ⚠️
                    </div>
                    <div className="flex-1">
                        <h4 className="text-red-800 font-semibold text-sm mb-1">
                            Budget Exceeded!
                        </h4>
                        <p className="text-red-700 text-sm mb-3">
                            You're ${overAmount.toFixed(2)} over your budget ({percentOver.toFixed(1)}% over).
                            Consider removing some items or adjusting your budget.
                        </p>
                        <div className="flex gap-2 flex-wrap">
                            <TouchEnhancedButton
                                onClick={handleAdjustBudget}
                                className="bg-red-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-red-700"
                            >
                                Adjust Budget to ${total.toFixed(2)}
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={handleDismiss}
                                className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-xs font-medium hover:bg-gray-400"
                            >
                                Dismiss
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
