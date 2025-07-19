'use client';

// file: /src/components/shopping/BudgetNotifications.js

import React, { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';

export function BudgetNotifications({ alerts, onDismiss }) {
    const [dismissed, setDismissed] = useState(new Set());

    const visibleAlerts = alerts.filter(alert => !dismissed.has(alert.id));

    const handleDismiss = (alertId) => {
        setDismissed(prev => new Set([...prev, alertId]));
        onDismiss?.(alertId);
    };

    if (visibleAlerts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
            {visibleAlerts.map((alert) => (
                <div
                    key={alert.id}
                    className={`p-4 rounded-lg shadow-lg border-l-4 ${
                        alert.severity === 'high'
                            ? 'border-red-400 bg-red-50'
                            : 'border-yellow-400 bg-yellow-50'
                    } animate-slide-in`}
                >
                    <div className="flex items-start space-x-3">
                        <span className="text-xl">
                            {alert.severity === 'high' ? '🚨' : '⚠️'}
                        </span>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                                {alert.message}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                                {alert.action}
                            </p>
                        </div>
                        <TouchEnhancedButton
                            onClick={() => handleDismiss(alert.id)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </TouchEnhancedButton>
                    </div>
                </div>
            ))}
        </div>
    );
}

