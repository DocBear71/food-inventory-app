'use client';

// file: /src/components/shopping/BudgetTracker.js

import React, { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { MobileHaptics } from '@/components/mobile/MobileHaptics';

export function BudgetTracker({ shoppingList, onBudgetUpdate }) {
    const [budget, setBudget] = useState(0);
    const [currentTotal, setCurrentTotal] = useState(0);
    const [alerts, setAlerts] = useState([]);
    const [budgetSettings, setBudgetSettings] = useState({
        warningThreshold: 0.8, // 80%
        enabled: true,
        categories: {}
    });

    useEffect(() => {
        calculateTotal();
        checkBudgetAlerts();
    }, [shoppingList, budget, budgetSettings]);

    const calculateTotal = () => {
        const total = shoppingList.reduce((sum, item) => {
            const price = item.estimatedPrice || 0;
            const quantity = item.quantity || 1;
            return sum + (price * quantity);
        }, 0);
        setCurrentTotal(total);
    };

    const checkBudgetAlerts = () => {
        if (!budgetSettings.enabled || budget <= 0) return;

        const newAlerts = [];
        const percentage = (currentTotal / budget) * 100;

        // Overall budget alerts
        if (percentage >= 100) {
            newAlerts.push({
                type: 'over_budget',
                message: `You're $${(currentTotal - budget).toFixed(2)} over budget!`,
                severity: 'high',
                action: 'Review and remove items'
            });
        } else if (percentage >= budgetSettings.warningThreshold * 100) {
            newAlerts.push({
                type: 'approaching_budget',
                message: `You're at ${percentage.toFixed(0)}% of your budget`,
                severity: 'medium',
                action: 'Consider removing non-essential items'
            });
        }

        // Category-specific alerts
        const categoryTotals = getCategoryTotals();
        Object.entries(budgetSettings.categories).forEach(([category, categoryBudget]) => {
            const categoryTotal = categoryTotals[category] || 0;
            const categoryPercentage = (categoryTotal / categoryBudget) * 100;

            if (categoryPercentage >= 100) {
                newAlerts.push({
                    type: 'category_over_budget',
                    message: `${category} is over budget by $${(categoryTotal - categoryBudget).toFixed(2)}`,
                    severity: 'high',
                    category,
                    action: 'Review items in this category'
                });
            }
        });

        setAlerts(newAlerts);

        // Trigger haptic feedback for new alerts
        if (newAlerts.length > 0 && newAlerts.some(alert => alert.severity === 'high')) {
            MobileHaptics?.error();
        }
    };

    const getCategoryTotals = () => {
        return shoppingList.reduce((totals, item) => {
            const category = item.category || 'Other';
            const price = item.estimatedPrice || 0;
            const quantity = item.quantity || 1;
            totals[category] = (totals[category] || 0) + (price * quantity);
            return totals;
        }, {});
    };

    const saveBudgetSettings = async () => {
        try {
            const response = await fetch('/api/shopping/budget-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ budget, settings: budgetSettings })
            });

            if (response.ok) {
                onBudgetUpdate?.({ budget, settings: budgetSettings });
                MobileHaptics?.success();
            }
        } catch (error) {
            console.error('Error saving budget settings:', error);
            MobileHaptics?.error();
        }
    };

    const getProgressColor = () => {
        const percentage = (currentTotal / budget) * 100;
        if (percentage >= 100) return 'bg-red-500';
        if (percentage >= budgetSettings.warningThreshold * 100) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getProgressPercentage = () => {
        if (budget <= 0) return 0;
        return Math.min((currentTotal / budget) * 100, 100);
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            {/* Budget Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">💰 Budget Tracker</h3>
                <TouchEnhancedButton
                    onClick={() => setBudgetSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                        budgetSettings.enabled
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                    }`}
                >
                    {budgetSettings.enabled ? 'Enabled' : 'Disabled'}
                </TouchEnhancedButton>
            </div>

            {/* Budget Input */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Shopping Budget</label>
                <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                        type="number"
                        value={budget}
                        onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                        onBlur={saveBudgetSettings}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                        step="0.01"
                    />
                </div>
            </div>

            {/* Budget Progress */}
            {budget > 0 && (
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Current Total: ${currentTotal.toFixed(2)}</span>
                        <span className="text-sm text-gray-600">Budget: ${budget.toFixed(2)}</span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                            className={`h-3 rounded-full transition-all duration-300 ${getProgressColor()}`}
                            style={{ width: `${getProgressPercentage()}%` }}
                        ></div>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">
                            {getProgressPercentage().toFixed(0)}% used
                        </span>
                        <span className={`font-medium ${
                            currentTotal > budget ? 'text-red-600' : 'text-green-600'
                        }`}>
                            ${(budget - currentTotal).toFixed(2)} remaining
                        </span>
                    </div>
                </div>
            )}

            {/* Budget Alerts */}
            {alerts.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">⚠️ Budget Alerts</h4>
                    {alerts.map((alert, index) => (
                        <div
                            key={index}
                            className={`p-3 rounded-lg border-l-4 ${
                                alert.severity === 'high'
                                    ? 'border-red-400 bg-red-50'
                                    : 'border-yellow-400 bg-yellow-50'
                            }`}
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
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Category Budgets */}
            <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">📊 Category Breakdown</h4>
                {Object.entries(getCategoryTotals()).map(([category, total]) => (
                    <div key={category} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{category}:</span>
                        <span className="font-medium">${total.toFixed(2)}</span>
                    </div>
                ))}
            </div>

            {/* Budget Settings */}
            <div className="border-t pt-4">
                <TouchEnhancedButton
                    onClick={() => setBudgetSettings(prev => ({ ...prev, showSettings: !prev.showSettings }))}
                    className="text-sm text-blue-600 hover:text-blue-700"
                >
                    ⚙️ Advanced Settings
                </TouchEnhancedButton>

                {budgetSettings.showSettings && (
                    <div className="mt-3 space-y-3">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Warning Threshold</label>
                            <select
                                value={budgetSettings.warningThreshold}
                                onChange={(e) => setBudgetSettings(prev => ({
                                    ...prev,
                                    warningThreshold: parseFloat(e.target.value)
                                }))}
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={0.5}>50%</option>
                                <option value={0.7}>70%</option>
                                <option value={0.8}>80%</option>
                                <option value={0.9}>90%</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

