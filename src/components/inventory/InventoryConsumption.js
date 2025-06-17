'use client';
// file: /src/components/inventory/InventoryConsumption.js v3 - Enhanced dual unit support for partial consumption


import { useState, useEffect } from 'react';
import { useSafeSession } from '@/hooks/useSafeSession';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import { formatInventoryDisplayText, hasDualUnits, getSmartUnitName } from '@/lib/inventoryDisplayUtils';

export default function InventoryConsumption({
                                                 item,
                                                 onConsume,
                                                 onClose,
                                                 mode = 'single', // 'single', 'recipe', 'bulk'
                                                 recipeIngredients = [], // For recipe mode
                                                 recipeName = ''
                                             }) {
    const { data: session } = useSafeSession();

    // Determine if item has dual units and which unit to prioritize
    const hasDualQuantities = hasDualUnits(item);
    const primaryQty = parseFloat(item.quantity) || 0;
    const secondaryQty = parseFloat(item.secondaryQuantity) || 0;

    // For dual unit items, prefer consuming by the secondary unit (individual items)
    const preferSecondaryUnit = hasDualQuantities && item.secondaryUnit === 'each';

    const [consumptionData, setConsumptionData] = useState({
        reason: 'consumed', // consumed, expired, recipe, donated, other
        quantity: 1,
        unit: preferSecondaryUnit ? item.secondaryUnit : item.unit,
        useSecondaryUnit: preferSecondaryUnit,
        notes: '',
        removeCompletely: false
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showUnitToggle, setShowUnitToggle] = useState(hasDualQuantities);

    // For recipe mode - track which ingredients to consume
    const [selectedIngredients, setSelectedIngredients] = useState(new Map());

    useEffect(() => {
        if (mode === 'recipe' && recipeIngredients.length > 0) {
            // Pre-populate with recipe ingredients that match inventory
            const matches = new Map();
            recipeIngredients.forEach(ingredient => {
                matches.set(ingredient.name, {
                    needed: ingredient.amount || '1',
                    unit: ingredient.unit || 'item',
                    consume: true
                });
            });
            setSelectedIngredients(matches);
        }
    }, [mode, recipeIngredients]);

    const reasonOptions = [
        { value: 'consumed', label: '🍽️ Consumed/Used', color: 'green' },
        { value: 'recipe', label: '👨‍🍳 Used in Recipe', color: 'blue' },
        { value: 'expired', label: '🗑️ Expired/Bad', color: 'red' },
        { value: 'donated', label: '❤️ Donated/Gifted', color: 'purple' },
        { value: 'spilled', label: '💧 Spilled/Wasted', color: 'orange' },
        { value: 'other', label: '📝 Other Reason', color: 'gray' }
    ];

    const getReasonStyle = (reason) => {
        const option = reasonOptions.find(opt => opt.value === reason);
        const colors = {
            green: { bg: '#f0fdf4', border: '#16a34a', text: '#15803d' },
            blue: { bg: '#eff6ff', border: '#2563eb', text: '#1d4ed8' },
            red: { bg: '#fef2f2', border: '#dc2626', text: '#dc2626' },
            purple: { bg: '#faf5ff', border: '#9333ea', text: '#7c3aed' },
            orange: { bg: '#fff7ed', border: '#ea580c', text: '#c2410c' },
            gray: { bg: '#f9fafb', border: '#6b7280', text: '#374151' }
        };
        return colors[option?.color] || colors.gray;
    };

    // Get current available quantity based on selected unit
    const getCurrentAvailableQuantity = () => {
        if (consumptionData.useSecondaryUnit && secondaryQty > 0) {
            return secondaryQty;
        }
        return primaryQty;
    };

    // Get the current unit being used
    const getCurrentUnit = () => {
        if (consumptionData.useSecondaryUnit && item.secondaryUnit) {
            return item.secondaryUnit;
        }
        return item.unit;
    };

    // Get smart unit name for display
    const getCurrentSmartUnit = () => {
        const unit = getCurrentUnit();
        const qty = parseFloat(consumptionData.quantity) || 1;
        return getSmartUnitName(item.name, unit, qty);
    };

    // Calculate remaining quantity after consumption
    const calculateRemainingQuantity = () => {
        const currentQty = getCurrentAvailableQuantity();
        const consumeQty = parseFloat(consumptionData.quantity) || 0;
        const remaining = currentQty - consumeQty;

        return {
            remaining: Math.max(0, remaining),
            unit: getCurrentUnit(),
            willBeEmpty: remaining <= 0
        };
    };

    // Handle quantity change with validation
    const handleQuantityChange = (value) => {
        const numValue = parseFloat(value);
        const maxQuantity = getCurrentAvailableQuantity();

        if (numValue >= maxQuantity) {
            setConsumptionData(prev => ({
                ...prev,
                quantity: maxQuantity,
                removeCompletely: true
            }));
        } else {
            setConsumptionData(prev => ({
                ...prev,
                quantity: numValue,
                removeCompletely: false
            }));
        }
    };

    // Handle unit toggle between primary and secondary
    const handleUnitToggle = () => {
        setConsumptionData(prev => {
            const newUseSecondary = !prev.useSecondaryUnit;
            return {
                ...prev,
                useSecondaryUnit: newUseSecondary,
                unit: newUseSecondary ? item.secondaryUnit : item.unit,
                quantity: 1, // Reset quantity when switching units
                removeCompletely: false
            };
        });
    };

    // Calculate what happens to both units after consumption
    const calculateDualUnitUpdate = () => {
        if (!hasDualQuantities) return null;

        const consumeQty = parseFloat(consumptionData.quantity) || 0;

        if (consumptionData.useSecondaryUnit) {
            // Consuming by secondary unit (e.g., individual items)
            const newSecondaryQty = Math.max(0, secondaryQty - consumeQty);

            // If we've consumed all individual items, also remove the package
            const newPrimaryQty = newSecondaryQty <= 0 ? 0 : primaryQty;

            return {
                newPrimaryQty,
                newSecondaryQty,
                removeCompletely: newPrimaryQty <= 0
            };
        } else {
            // Consuming by primary unit (e.g., whole packages)
            const newPrimaryQty = Math.max(0, primaryQty - consumeQty);

            // If removing packages, calculate remaining individual items
            // This is more complex - for now, if consuming whole packages, remove all secondary too
            const newSecondaryQty = newPrimaryQty <= 0 ? 0 : secondaryQty;

            return {
                newPrimaryQty,
                newSecondaryQty,
                removeCompletely: newPrimaryQty <= 0
            };
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            if (mode === 'recipe') {
                // Handle recipe consumption
                const consumptions = Array.from(selectedIngredients.entries())
                    .filter(([_, data]) => data.consume)
                    .map(([ingredientName, data]) => ({
                        ingredient: ingredientName,
                        quantity: parseFloat(data.needed) || 1,
                        unit: data.unit,
                        reason: 'recipe',
                        notes: `Used in recipe: ${recipeName}`,
                        recipeName
                    }));

                await onConsume(consumptions, 'recipe');
            } else {
                // Handle single item consumption with dual unit support
                const consumptionPayload = {
                    itemId: item._id,
                    reason: consumptionData.reason,
                    quantity: consumptionData.quantity,
                    unit: consumptionData.unit,
                    notes: consumptionData.notes,
                    removeCompletely: consumptionData.removeCompletely,
                    // NEW: Include dual unit information
                    isDualUnitConsumption: hasDualQuantities,
                    useSecondaryUnit: consumptionData.useSecondaryUnit
                };

                // If it's a dual unit item, include the calculation results
                if (hasDualQuantities) {
                    const dualUpdate = calculateDualUnitUpdate();
                    consumptionPayload.dualUnitUpdate = dualUpdate;
                }

                await onConsume(consumptionPayload);
            }

            onClose();
        } catch (error) {
            console.error('Error consuming item:', error);
            setError(error.message || 'Failed to update inventory');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleIngredientConsumption = (ingredientName) => {
        setSelectedIngredients(prev => {
            const updated = new Map(prev);
            const current = updated.get(ingredientName);
            if (current) {
                updated.set(ingredientName, { ...current, consume: !current.consume });
            }
            return updated;
        });
    };

    const updateIngredientData = (ingredientName, field, value) => {
        setSelectedIngredients(prev => {
            const updated = new Map(prev);
            const current = updated.get(ingredientName);
            if (current) {
                updated.set(ingredientName, { ...current, [field]: value });
            }
            return updated;
        });
    };

    if (mode === 'recipe') {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                    <div className="bg-blue-50 px-6 py-4 border-b border-blue-200">
                        <h2 className="text-xl font-semibold text-blue-900">
                            👨‍🍳 Recipe Ingredient Consumption
                        </h2>
                        <p className="text-sm text-blue-700 mt-1">
                            {recipeName}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col h-full">
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-red-800 text-sm">{error}</p>
                                </div>
                            )}

                            <div className="space-y-3">
                                {Array.from(selectedIngredients.entries()).map(([ingredientName, data]) => (
                                    <div key={ingredientName} className={`border rounded-lg p-4 ${
                                        data.consume ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'
                                    }`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="flex items-center space-x-3">
                                                <input
                                                    type="checkbox"
                                                    checked={data.consume}
                                                    onChange={() => toggleIngredientConsumption(ingredientName)}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                                <span className="font-medium text-gray-900">{ingredientName}</span>
                                            </label>
                                        </div>

                                        {data.consume && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Quantity to Use
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        min="0"
                                                        value={data.needed}
                                                        onChange={(e) => updateIngredientData(ingredientName, 'needed', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Unit
                                                    </label>
                                                    <select
                                                        value={data.unit}
                                                        onChange={(e) => updateIngredientData(ingredientName, 'unit', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        <option value="item">Item(s)</option>
                                                        <option value="each">Each</option>
                                                        <option value="cup">Cup(s)</option>
                                                        <option value="tbsp">Tablespoon(s)</option>
                                                        <option value="tsp">Teaspoon(s)</option>
                                                        <option value="oz">Ounces</option>
                                                        <option value="lbs">Pounds</option>
                                                        <option value="g">Grams</option>
                                                        <option value="kg">Kilograms</option>
                                                        <option value="ml">Milliliters</option>
                                                        <option value="l">Liters</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between">
                            <TouchEnhancedButton
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Cancel
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                type="submit"
                                disabled={isSubmitting || Array.from(selectedIngredients.values()).every(data => !data.consume)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Updating...
                                    </>
                                ) : (
                                    '✅ Update Inventory'
                                )}
                            </TouchEnhancedButton>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    // Single item consumption mode
    const reasonStyle = getReasonStyle(consumptionData.reason);
    const remainingInfo = calculateRemainingQuantity();
    const dualUnitUpdate = hasDualQuantities ? calculateDualUnitUpdate() : null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                        📦 Update Inventory Item
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {item.name} {item.brand && `(${item.brand})`}
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-4 space-y-4">
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-red-800 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Enhanced Current Stock Display */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-600 mb-2">Current Stock</div>
                            <div className="text-lg font-semibold text-gray-900">
                                {formatInventoryDisplayText(item)}
                            </div>

                            {/* Show individual unit breakdown for dual units */}
                            {hasDualQuantities && (
                                <div className="mt-2 text-sm text-gray-600 space-y-1">
                                    <div>• {primaryQty} {getSmartUnitName(item.name, item.unit, primaryQty)}</div>
                                    <div>• {secondaryQty} {getSmartUnitName(item.name, item.secondaryUnit, secondaryQty)}</div>
                                </div>
                            )}
                        </div>

                        {/* Unit Selection Toggle for Dual Unit Items */}
                        {showUnitToggle && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Consume by:
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={() => setConsumptionData(prev => ({ ...prev, useSecondaryUnit: false, unit: item.unit, quantity: 1, removeCompletely: false }))}
                                        className={`p-3 text-left text-sm rounded-lg border-2 transition-colors ${
                                            !consumptionData.useSecondaryUnit
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                        }`}
                                    >
                                        <div className="font-medium">{getSmartUnitName(item.name, item.unit, 1)}</div>
                                        <div className="text-xs opacity-75">Whole packages</div>
                                    </TouchEnhancedButton>

                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={() => setConsumptionData(prev => ({ ...prev, useSecondaryUnit: true, unit: item.secondaryUnit, quantity: 1, removeCompletely: false }))}
                                        className={`p-3 text-left text-sm rounded-lg border-2 transition-colors ${
                                            consumptionData.useSecondaryUnit
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                        }`}
                                    >
                                        <div className="font-medium">{getSmartUnitName(item.name, item.secondaryUnit, 1)}</div>
                                        <div className="text-xs opacity-75">Individual items</div>
                                    </TouchEnhancedButton>
                                </div>
                            </div>
                        )}

                        {/* Reason Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Reason for Update
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {reasonOptions.map((option) => (
                                    <TouchEnhancedButton
                                        key={option.value}
                                        type="button"
                                        onClick={() => setConsumptionData(prev => ({ ...prev, reason: option.value }))}
                                        className={`p-3 text-left text-sm rounded-lg border-2 transition-colors ${
                                            consumptionData.reason === option.value
                                                ? `border-current`
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                        style={{
                                            backgroundColor: consumptionData.reason === option.value ? reasonStyle.bg : '#fff',
                                            borderColor: consumptionData.reason === option.value ? reasonStyle.border : '#e5e7eb',
                                            color: consumptionData.reason === option.value ? reasonStyle.text : '#374151'
                                        }}
                                    >
                                        {option.label}
                                    </TouchEnhancedButton>
                                ))}
                            </div>
                        </div>

                        {/* Enhanced Quantity Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Quantity to consume ({getCurrentSmartUnit()})
                            </label>
                            <div className="flex items-center space-x-3">
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max={getCurrentAvailableQuantity()}
                                    value={consumptionData.quantity}
                                    onChange={(e) => handleQuantityChange(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                />
                                <div className="text-sm text-gray-500">
                                    of {getCurrentAvailableQuantity()} available
                                </div>
                            </div>
                        </div>

                        {/* Remove Completely Option */}
                        <div className="flex items-start">
                            <div className="flex items-center h-5">
                                <input
                                    id="removeCompletely"
                                    type="checkbox"
                                    checked={consumptionData.removeCompletely}
                                    onChange={(e) => setConsumptionData(prev => ({
                                        ...prev,
                                        removeCompletely: e.target.checked,
                                        quantity: e.target.checked ? getCurrentAvailableQuantity() : prev.quantity
                                    }))}
                                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="removeCompletely" className="font-medium text-gray-700">
                                    Remove entire item from inventory
                                </label>
                                <p className="text-gray-500">
                                    Check this if you've used up all of this item
                                </p>
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes (Optional)
                            </label>
                            <textarea
                                value={consumptionData.notes}
                                onChange={(e) => setConsumptionData(prev => ({ ...prev, notes: e.target.value }))}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Add any additional notes..."
                            />
                        </div>

                        {/* Enhanced Preview */}
                        <div className="bg-blue-50 rounded-lg p-4">
                            <div className="text-sm text-blue-800">
                                <strong>After update:</strong>
                            </div>
                            {consumptionData.removeCompletely ? (
                                <div className="text-sm text-blue-800 mt-1">
                                    Item will be completely removed from inventory
                                </div>
                            ) : hasDualQuantities && dualUnitUpdate ? (
                                <div className="text-sm text-blue-800 mt-1 space-y-1">
                                    <div>• {dualUnitUpdate.newPrimaryQty} {getSmartUnitName(item.name, item.unit, dualUnitUpdate.newPrimaryQty)} remaining</div>
                                    <div>• {dualUnitUpdate.newSecondaryQty} {getSmartUnitName(item.name, item.secondaryUnit, dualUnitUpdate.newSecondaryQty)} remaining</div>
                                </div>
                            ) : (
                                <div className="text-sm text-blue-800 mt-1">
                                    {remainingInfo.remaining.toFixed(1)} {remainingInfo.unit} remaining
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between">
                        <TouchEnhancedButton
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Cancel
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Updating...
                                </>
                            ) : (
                                '✅ Update Inventory'
                            )}
                        </TouchEnhancedButton>
                    </div>
                </form>
            </div>
        </div>
    );
}