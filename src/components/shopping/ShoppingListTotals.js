'use client';

// file: /src/components/shopping/ShoppingListTotals.js v2 - iOS Native Enhancements with Native Form Components

import React, { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { ShoppingListTotalsCalculator, DEFAULT_TAX_RATES, TAXABLE_CATEGORIES } from '@/lib/shoppingListTotals';
import {
    NativeTextInput,
    NativeTextarea,
    NativeSelect
} from '@/components/forms/NativeIOSFormComponents';
import { PlatformDetection } from '@/utils/PlatformDetection';

export default function ShoppingListTotals({
                                               shoppingList,
                                               userPreferences = {},
                                               onBudgetChange = null,
                                               onTaxRateChange = null,
                                               compact = false,
                                               showBudgetTracker = true,
                                               showCategoryBreakdown = true,
                                               className = ''
                                           }) {
    const [calculator] = useState(() => new ShoppingListTotalsCalculator({
        currency: userPreferences.currency || 'USD',
        currencySymbol: userPreferences.currencySymbol || '$',
        currencyPosition: userPreferences.currencyPosition || 'before',
        decimalPlaces: userPreferences.decimalPlaces || 2,
        taxRate: userPreferences.taxRate || 0
    }));

    const [calculations, setCalculations] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [budget, setBudget] = useState(userPreferences.budget || '');
    const [taxRate, setTaxRate] = useState((userPreferences.taxRate || 0) * 100);
    const [selectedRegion, setSelectedRegion] = useState(userPreferences.region || 'custom');
    const [showCategoryDetails, setShowCategoryDetails] = useState(false);

    const isIOS = PlatformDetection.isIOS();

    // Recalculate totals when inputs change
    useEffect(() => {
        if (!shoppingList) return;

        calculator.taxRate = taxRate / 100;

        const results = calculator.calculateTotals(shoppingList, {
            budget: budget ? parseFloat(budget) : null,
            taxableCategories: TAXABLE_CATEGORIES.TAXABLE,
            discounts: [],
            coupons: []
        });

        setCalculations(results);
    }, [shoppingList, taxRate, budget, calculator]);

    const handleRegionChange = async (region) => {
        if (isIOS) {
            try {
                const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.buttonTap();
            } catch (error) {
                console.log('Region change haptic failed:', error);
            }
        }

        setSelectedRegion(region);
        if (region !== 'custom' && DEFAULT_TAX_RATES.US[region]) {
            const newTaxRate = DEFAULT_TAX_RATES.US[region] * 100;
            setTaxRate(newTaxRate);
            if (onTaxRateChange) {
                onTaxRateChange(newTaxRate / 100);
            }
        }
    };

    const handleBudgetSave = async () => {
        if (isIOS) {
            try {
                const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.success();

                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showSuccess({
                    title: 'Budget Saved',
                    message: budget ? `Budget set to ${calculator.formatCurrency(parseFloat(budget))}` : 'Budget removed'
                });
            } catch (error) {
                console.log('Budget save feedback failed:', error);
            }
        }

        if (onBudgetChange) {
            onBudgetChange(budget ? parseFloat(budget) : null);
        }
        setShowSettings(false);
    };

    const handleTaxRateChange = (newRate) => {
        setTaxRate(parseFloat(newRate) || 0);
        if (onTaxRateChange) {
            onTaxRateChange((parseFloat(newRate) || 0) / 100);
        }
    };

    const toggleSettings = async () => {
        if (isIOS) {
            try {
                const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.buttonTap();
            } catch (error) {
                console.log('Settings toggle haptic failed:', error);
            }
        }
        setShowSettings(!showSettings);
    };

    const toggleCategoryDetails = async () => {
        if (isIOS) {
            try {
                const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.buttonTap();
            } catch (error) {
                console.log('Category details haptic failed:', error);
            }
        }
        setShowCategoryDetails(!showCategoryDetails);
    };

    const getBudgetColorClass = () => {
        if (!calculations?.budget) return 'text-gray-600';

        if (calculations.isOverBudget) return 'text-red-600';
        if (calculations.budgetPercentUsed > 80) return 'text-orange-600';
        return 'text-green-600';
    };

    if (!calculations) {
        return (
            <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
                <div className="text-center text-gray-500">
                    <div className="animate-pulse">Calculating totals...</div>
                </div>
            </div>
        );
    }

    const summary = calculator.generateSummary(calculations);

    if (compact) {
        return (
            <div className={`bg-white rounded-lg border border-gray-200 p-3 ${className}`}>
                <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                        {summary.totalItems} items
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                        {summary.total}
                    </div>
                </div>
                {summary.budget && (
                    <div className="mt-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Budget</span>
                            <span className={getBudgetColorClass()}>
                                {summary.budgetRemaining} remaining
                            </span>
                        </div>
                        <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                    calculations.isOverBudget ? 'bg-red-500' :
                                        calculations.budgetPercentUsed > 80 ? 'bg-orange-500' : 'bg-green-500'
                                }`}
                                style={{
                                    width: `${Math.min(100, calculations.budgetPercentUsed || 0)}%`
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
            {/* Header */}
            <div className="border-b border-gray-200 p-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">
                        💰 Shopping List Totals
                    </h3>
                    <TouchEnhancedButton
                        onClick={toggleSettings}
                        className="text-gray-500 hover:text-gray-700 p-2 rounded-md hover:bg-gray-100"
                        title="Settings"
                    >
                        ⚙️
                    </TouchEnhancedButton>
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="border-b border-gray-200 p-4 bg-gray-50">
                    <div className="space-y-4">
                        {/* Budget Setting */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                💳 Shopping Budget
                            </label>
                            <div className="flex gap-2">
                                <NativeTextInput
                                    type="number"
                                    inputMode="decimal"
                                    pattern="[0-9]*"
                                    value={budget}
                                    onChange={(e) => setBudget(e.target.value)}
                                    placeholder="Enter budget amount"
                                    min="0"
                                    max="10000"
                                    step="0.01"
                                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    validation={(value) => {
                                        if (!value) return { isValid: true, message: '' };
                                        const num = parseFloat(value);
                                        return {
                                            isValid: num >= 0 && num <= 10000,
                                            message: num >= 0 && num <= 10000 ? 'Budget amount looks good!' : 'Budget should be 0-10000'
                                        };
                                    }}
                                    errorMessage="Please enter a valid budget amount"
                                    successMessage="Budget amount looks good!"
                                />
                                <TouchEnhancedButton
                                    onClick={handleBudgetSave}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                                >
                                    Save
                                </TouchEnhancedButton>
                            </div>
                        </div>

                        {/* Tax Rate Setting */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                🏛️ Tax Rate
                            </label>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <NativeSelect
                                    value={selectedRegion}
                                    onChange={(e) => handleRegionChange(e.target.value)}
                                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    options={[
                                        { value: 'custom', label: 'Custom Rate' },
                                        { value: 'IA', label: 'Iowa (6%)' },
                                        { value: 'CA', label: 'California (7.25%)' },
                                        { value: 'FL', label: 'Florida (6%)' },
                                        { value: 'NY', label: 'New York (8%)' },
                                        { value: 'TX', label: 'Texas (6.25%)' }
                                    ]}
                                />
                                <div className="flex">
                                    <NativeTextInput
                                        type="number"
                                        inputMode="decimal"
                                        pattern="[0-9]*"
                                        value={taxRate}
                                        onChange={(e) => handleTaxRateChange(e.target.value)}
                                        min="0"
                                        max="20"
                                        step="0.1"
                                        className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                        validation={(value) => {
                                            const num = parseFloat(value);
                                            if (!value) return { isValid: true, message: '' };
                                            return {
                                                isValid: num >= 0 && num <= 20,
                                                message: num >= 0 && num <= 20 ? 'Valid tax rate' : 'Tax rate should be 0-20%'
                                            };
                                        }}
                                    />
                                    <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                                        %
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">
                                Tax applies to non-food items (cleaning supplies, personal care, etc.)
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Totals */}
            <div className="p-4">
                <div className="space-y-3">
                    {/* Subtotal */}
                    <div className="flex justify-between text-base">
                        <span className="text-gray-600">Subtotal ({summary.totalItems} items)</span>
                        <span className="font-medium">{summary.subtotal}</span>
                    </div>

                    {/* Tax */}
                    {calculations.taxAmount > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Tax ({(taxRate).toFixed(1)}%)</span>
                            <span>{summary.tax}</span>
                        </div>
                    )}

                    {/* Discounts & Coupons */}
                    {calculations.discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                            <span>Discounts</span>
                            <span>-{summary.discount}</span>
                        </div>
                    )}

                    {calculations.couponAmount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                            <span>Coupons</span>
                            <span>-{summary.coupon}</span>
                        </div>
                    )}

                    {/* Total */}
                    <div className="border-t border-gray-200 pt-3">
                        <div className="flex justify-between text-lg font-bold">
                            <span className="text-gray-900">Total</span>
                            <span className="text-gray-900">{summary.total}</span>
                        </div>
                    </div>
                </div>

                {/* Budget Tracker */}
                {showBudgetTracker && summary.budget && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">Budget Tracker</span>
                            <span className={`text-sm font-medium ${getBudgetColorClass()}`}>
                                {summary.budgetPercentUsed}% used
                            </span>
                        </div>

                        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                            <div
                                className={`h-3 rounded-full transition-all duration-500 ${
                                    calculations.isOverBudget ? 'bg-red-500' :
                                        calculations.budgetPercentUsed > 80 ? 'bg-orange-500' : 'bg-green-500'
                                }`}
                                style={{
                                    width: `${Math.min(100, calculations.budgetPercentUsed || 0)}%`
                                }}
                            />
                        </div>

                        <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Budget: {summary.budget}</span>
                            <span className={getBudgetColorClass()}>
                                {calculations.isOverBudget ? 'Over by ' : 'Remaining: '}
                                {Math.abs(parseFloat(summary.budgetRemaining.replace(/[^0-9.-]/g, ''))).toFixed(2)}
                            </span>
                        </div>

                        {calculations.isOverBudget && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                                ⚠️ You're over budget! Consider removing some items or increasing your budget.
                            </div>
                        )}
                    </div>
                )}

                {/* Category Breakdown */}
                {showCategoryBreakdown && summary.categories.length > 1 && (
                    <div className="mt-4">
                        <TouchEnhancedButton
                            onClick={toggleCategoryDetails}
                            className="flex justify-between items-center w-full text-left p-2 hover:bg-gray-50 rounded-md"
                        >
                            <span className="text-sm font-medium text-gray-700">
                                📊 Category Breakdown
                            </span>
                            <span className="text-xs text-gray-500">
                                {showCategoryDetails ? '▼' : '▶'}
                            </span>
                        </TouchEnhancedButton>

                        {showCategoryDetails && (
                            <div className="mt-2 space-y-2">
                                {summary.categories.map((category, index) => (
                                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-gray-700">
                                                {category.name}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {category.itemCount} items
                                                {category.estimatedCount > 0 &&
                                                    ` (${category.estimatedCount} estimated)`
                                                }
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-medium text-gray-900">
                                                {category.formattedTotal}
                                            </div>
                                            {category.taxAmount > 0 && (
                                                <div className="text-xs text-gray-500">
                                                    +{category.formattedTax} tax
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Warnings */}
                {summary.warnings.length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="text-sm font-medium text-yellow-800 mb-1">
                            ⚠️ Notes
                        </div>
                        <ul className="text-xs text-yellow-700 space-y-1">
                            {summary.warnings.map((warning, index) => (
                                <li key={index}>• {warning}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}