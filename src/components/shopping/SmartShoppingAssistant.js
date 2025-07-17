'use client';

// file: /src/components/shopping/SmartShoppingAssistant.js - AI-powered shopping companion with price intelligence

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { MobileHaptics } from '@/components/mobile/MobileHaptics';
import {apiPost} from "@/lib/api-config.js";

export default function SmartShoppingAssistant({ onClose }) {
    const [step, setStep] = useState('input'); // input, optimizing, results, shopping
    const [shoppingInput, setShoppingInput] = useState('');
    const [budget, setBudget] = useState('');
    const [preferences, setPreferences] = useState({
        prioritize: 'savings',
        maxStores: 2,
        preferredStores: [],
        dietaryRestrictions: []
    });
    const [optimization, setOptimization] = useState(null);
    const [loading, setLoading] = useState(false);
    const [shoppingMode, setShoppingMode] = useState(false);
    const [checkedItems, setCheckedItems] = useState(new Set());

    const handleOptimize = async () => {
        if (!shoppingInput.trim()) return;

        setLoading(true);
        setStep('optimizing');
        MobileHaptics?.light();

        try {
            // Parse shopping input into items
            const items = parseShoppingInput(shoppingInput);

            // Call optimization API
            const response = await apiPost('/api/price-tracking/optimize-shopping', {
                    items,
                    budget: budget ? parseFloat(budget) : null,
                    preferredStores: preferences.preferredStores,
                    maxStores: preferences.maxStores,
                    prioritize: preferences.prioritize
                })

            const data = await response.json();
            if (data.success) {
                setOptimization(data.optimization);
                setStep('results');
                MobileHaptics?.success();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Optimization error:', error);
            alert('Failed to optimize shopping list. Please try again.');
            setStep('input');
            MobileHaptics?.error();
        } finally {
            setLoading(false);
        }
    };

    const parseShoppingInput = (input) => {
        // Parse various input formats
        const lines = input.split('\n').filter(line => line.trim());
        return lines.map(line => {
            // Remove common prefixes like "- ", "• ", numbers, etc.
            const cleaned = line.replace(/^[-•*\d+\.\s]+/, '').trim();

            // Try to extract quantity if present
            const quantityMatch = cleaned.match(/^(\d+)\s+(.+)/);
            if (quantityMatch) {
                return {
                    name: quantityMatch[2],
                    quantity: parseInt(quantityMatch[1])
                };
            }

            return { name: cleaned, quantity: 1 };
        }).filter(item => item.name.length > 0);
    };

    const startShopping = () => {
        setShoppingMode(true);
        setStep('shopping');
        MobileHaptics?.medium();
    };

    const toggleItemCheck = (itemIndex) => {
        const newChecked = new Set(checkedItems);
        if (newChecked.has(itemIndex)) {
            newChecked.delete(itemIndex);
        } else {
            newChecked.add(itemIndex);
        }
        setCheckedItems(newChecked);
        MobileHaptics?.light();
    };

    const formatPrice = (price) => {
        return typeof price === 'number' ? `$${price.toFixed(2)}` : '$0.00';
    };

    const getStepProgress = () => {
        switch (step) {
            case 'input': return 25;
            case 'optimizing': return 50;
            case 'results': return 75;
            case 'shopping': return 100;
            default: return 0;
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
            {/* Header with Progress */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                        <TouchEnhancedButton
                            onClick={onClose}
                            className="text-white hover:text-blue-200"
                        >
                            ✕
                        </TouchEnhancedButton>
                        <div>
                            <h1 className="text-lg font-bold">🤖 Smart Shopping Assistant</h1>
                            <p className="text-sm text-blue-100">AI-powered price optimization</p>
                        </div>
                    </div>

                    {step === 'shopping' && optimization && (
                        <div className="text-right">
                            <div className="text-xl font-bold">
                                {checkedItems.size}/{optimization.items.length}
                            </div>
                            <div className="text-xs text-blue-100">Items</div>
                        </div>
                    )}
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-blue-500 bg-opacity-30 rounded-full h-2">
                    <div
                        className="bg-white h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${getStepProgress()}%` }}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Step 1: Input */}
                {step === 'input' && (
                    <div className="p-4 space-y-6">
                        <div className="text-center">
                            <div className="text-4xl mb-4">🛒</div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">What do you need to buy?</h2>
                            <p className="text-gray-600">Enter your shopping list and I'll find the best prices and stores for you.</p>
                        </div>

                        {/* Shopping List Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                📝 Shopping List
                            </label>
                            <textarea
                                value={shoppingInput}
                                onChange={(e) => setShoppingInput(e.target.value)}
                                className="w-full h-32 border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Enter items, one per line:&#10;Bananas&#10;Milk&#10;Chicken breast&#10;Bread&#10;..."
                            />
                            <div className="text-xs text-gray-500 mt-1">
                                💡 Tip: You can copy and paste from anywhere, or just type naturally
                            </div>
                        </div>

                        {/* Budget (Optional) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                💰 Budget (Optional)
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={budget}
                                    onChange={(e) => setBudget(e.target.value)}
                                    className="pl-8 w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="50.00"
                                />
                            </div>
                        </div>

                        {/* Preferences */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                ⚙️ Shopping Preferences
                            </label>

                            <div className="space-y-4">
                                <div>
                                    <div className="text-sm text-gray-600 mb-2">What's most important to you?</div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { value: 'savings', label: '💰 Savings', desc: 'Lowest prices' },
                                            { value: 'convenience', label: '⚡ Speed', desc: 'Fewer stores' },
                                            { value: 'quality', label: '⭐ Quality', desc: 'Best products' }
                                        ].map(option => (
                                            <TouchEnhancedButton
                                                key={option.value}
                                                onClick={() => setPreferences(prev => ({ ...prev, prioritize: option.value }))}
                                                className={`p-3 rounded-lg border-2 text-center ${
                                                    preferences.prioritize === option.value
                                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                        : 'border-gray-300 hover:border-gray-400'
                                                }`}
                                            >
                                                <div className="text-lg">{option.label}</div>
                                                <div className="text-xs text-gray-500">{option.desc}</div>
                                            </TouchEnhancedButton>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-sm text-gray-600 mb-2">Maximum stores to visit</div>
                                    <select
                                        value={preferences.maxStores}
                                        onChange={(e) => setPreferences(prev => ({ ...prev, maxStores: parseInt(e.target.value) }))}
                                        className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value={1}>1 store (most convenient)</option>
                                        <option value={2}>2 stores (balanced)</option>
                                        <option value={3}>3 stores (maximum savings)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Continue Button */}
                        <TouchEnhancedButton
                            onClick={handleOptimize}
                            disabled={!shoppingInput.trim() || loading}
                            className="w-full bg-indigo-600 text-white py-4 px-4 rounded-xl hover:bg-indigo-700 disabled:bg-indigo-400 font-semibold text-lg"
                        >
                            🚀 Optimize My Shopping List
                        </TouchEnhancedButton>
                    </div>
                )}

                {/* Step 2: Optimizing */}
                {step === 'optimizing' && (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-6"></div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">🤖 AI is optimizing your shopping...</h2>
                            <div className="space-y-2 text-gray-600">
                                <p>✓ Analyzing price history</p>
                                <p>✓ Finding best deals</p>
                                <p>✓ Optimizing store routes</p>
                                <p>🔄 Calculating savings...</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Results */}
                {step === 'results' && optimization && (
                    <div className="p-4 space-y-6">
                        {/* Summary Stats */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div>
                                    <div className="text-2xl font-bold text-green-600">
                                        {formatPrice(optimization.totalCost)}
                                    </div>
                                    <div className="text-xs text-green-700">Total Cost</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-blue-600">
                                        {formatPrice(optimization.totalSavings)}
                                    </div>
                                    <div className="text-xs text-blue-700">Total Savings</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-purple-600">
                                        {optimization.storeRecommendations.length}
                                    </div>
                                    <div className="text-xs text-purple-700">Stores</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-orange-600">
                                        {optimization.summary.savingsRate}%
                                    </div>
                                    <div className="text-xs text-orange-700">Savings Rate</div>
                                </div>
                            </div>
                        </div>

                        {/* Budget Analysis */}
                        {optimization.budgetAnalysis && (
                            <div className={`border rounded-xl p-4 ${
                                optimization.budgetAnalysis.overBudget
                                    ? 'bg-red-50 border-red-200'
                                    : 'bg-green-50 border-green-200'
                            }`}>
                                <h3 className="font-semibold text-gray-900 mb-2">💰 Budget Analysis</h3>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="text-sm text-gray-600">
                                            Budget: {formatPrice(optimization.budgetAnalysis.budget)}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            Estimated: {formatPrice(optimization.budgetAnalysis.estimatedCost)}
                                        </div>
                                    </div>
                                    <div className={`text-lg font-bold ${
                                        optimization.budgetAnalysis.overBudget ? 'text-red-600' : 'text-green-600'
                                    }`}>
                                        {optimization.budgetAnalysis.overBudget ? 'Over' : 'Under'} by{' '}
                                        {formatPrice(Math.abs(optimization.budgetAnalysis.remaining))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Store Recommendations */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">🏪 Recommended Shopping Route</h3>
                            <div className="space-y-3">
                                {optimization.storeRecommendations.map((store, index) => (
                                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="font-semibold text-gray-900">
                                                    {index + 1}. {store.store}
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    {store.items.length} items • {formatPrice(store.totalCost)}
                                                </div>
                                            </div>
                                            {store.totalSavings > 0 && (
                                                <div className="text-green-600 font-semibold text-sm">
                                                    Save {formatPrice(store.totalSavings)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-1">
                                            {store.items.map((item, itemIndex) => (
                                                <span key={itemIndex} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {item}
                        </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <TouchEnhancedButton
                                onClick={startShopping}
                                className="w-full bg-green-600 text-white py-4 px-4 rounded-xl hover:bg-green-700 font-semibold text-lg"
                            >
                                🛒 Start Shopping
                            </TouchEnhancedButton>

                            <div className="grid grid-cols-2 gap-3">
                                <TouchEnhancedButton
                                    onClick={() => setStep('input')}
                                    className="bg-gray-200 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-300 font-medium"
                                >
                                    ← Edit List
                                </TouchEnhancedButton>

                                <TouchEnhancedButton
                                    onClick={() => {/* Save optimized list */}}
                                    className="bg-blue-600 text-white py-3 px-4 rounded-xl hover:bg-blue-700 font-medium"
                                >
                                    💾 Save List
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Shopping Mode */}
                {step === 'shopping' && optimization && (
                    <div className="p-4 space-y-4">
                        {/* Shopping Progress */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-blue-900">Shopping Progress</h3>
                                <div className="text-blue-600 font-semibold">
                                    {checkedItems.size} of {optimization.items.length} items
                                </div>
                            </div>
                            <div className="w-full bg-blue-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{
                                        width: `${(checkedItems.size / optimization.items.length) * 100}%`
                                    }}
                                />
                            </div>
                        </div>

                        {/* Current Store */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center space-x-3">
                                <div className="text-2xl">🏪</div>
                                <div>
                                    <div className="font-semibold text-green-900">
                                        Current Store: {optimization.storeRecommendations[0]?.store || 'First Store'}
                                    </div>
                                    <div className="text-sm text-green-700">
                                        {optimization.storeRecommendations[0]?.items.length || 0} items to find here
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Shopping Items */}
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-gray-900">🛒 Shopping List</h3>

                            {optimization.items.map((item, index) => {
                                const isChecked = checkedItems.has(index);
                                const bestPrice = item.bestPrice;

                                return (
                                    <div
                                        key={index}
                                        className={`border rounded-lg p-4 transition-all ${
                                            isChecked
                                                ? 'bg-gray-50 border-gray-300 opacity-75'
                                                : 'bg-white border-gray-200 hover:shadow-md'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <TouchEnhancedButton
                                                onClick={() => toggleItemCheck(index)}
                                                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                                                    isChecked
                                                        ? 'bg-green-500 border-green-500 text-white'
                                                        : 'border-gray-300 hover:border-green-500'
                                                }`}
                                            >
                                                {isChecked && '✓'}
                                            </TouchEnhancedButton>

                                            <div className="flex-1 min-w-0">
                                                <div className={`font-medium ${
                                                    isChecked ? 'line-through text-gray-500' : 'text-gray-900'
                                                }`}>
                                                    {item.name}
                                                </div>

                                                {bestPrice && (
                                                    <div className="flex items-center space-x-2 mt-1">
                            <span className={`text-sm font-semibold ${
                                isChecked ? 'text-gray-400' : 'text-green-600'
                            }`}>
                              {formatPrice(bestPrice.price)}
                            </span>

                                                        <span className="text-xs text-gray-500">
                              at {bestPrice.store}
                            </span>

                                                        {bestPrice.savings > 0 && !isChecked && (
                                                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                Save {formatPrice(bestPrice.savings)}
                              </span>
                                                        )}
                                                    </div>
                                                )}

                                                {item.alternatives && item.alternatives.length > 0 && !isChecked && (
                                                    <TouchEnhancedButton
                                                        onClick={() => {/* Show alternatives */}}
                                                        className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                                                    >
                                                        See {item.alternatives.length} alternatives
                                                    </TouchEnhancedButton>
                                                )}
                                            </div>

                                            {/* Item category indicator */}
                                            <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                                {item.category}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Shopping Complete */}
                        {checkedItems.size === optimization.items.length && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                                <div className="text-4xl mb-3">🎉</div>
                                <h3 className="text-xl font-bold text-green-900 mb-2">Shopping Complete!</h3>
                                <p className="text-green-700 mb-4">
                                    You saved approximately {formatPrice(optimization.totalSavings)} today!
                                </p>

                                <div className="space-y-3">
                                    <TouchEnhancedButton
                                        onClick={() => {/* Save shopping session */}}
                                        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 font-medium"
                                    >
                                        📊 Save Shopping Session
                                    </TouchEnhancedButton>

                                    <TouchEnhancedButton
                                        onClick={onClose}
                                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium"
                                    >
                                        🏠 Return to Dashboard
                                    </TouchEnhancedButton>
                                </div>
                            </div>
                        )}

                        {/* Quick Actions */}
                        <div className="fixed bottom-4 left-4 right-4 bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-600">
                                    <div className="font-medium">
                                        Total: {formatPrice(optimization.totalCost)}
                                    </div>
                                    <div>
                                        Saved: {formatPrice(optimization.totalSavings)}
                                    </div>
                                </div>

                                <div className="flex space-x-2">
                                    <TouchEnhancedButton
                                        onClick={() => {/* Add item */}}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
                                    >
                                        ➕ Add Item
                                    </TouchEnhancedButton>

                                    <TouchEnhancedButton
                                        onClick={() => setStep('results')}
                                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm"
                                    >
                                        📋 View List
                                    </TouchEnhancedButton>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}