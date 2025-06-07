// file: /src/components/inventory/InventoryConsumption.js v1

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function InventoryConsumption({
                                                 item,
                                                 onConsume,
                                                 onClose,
                                                 mode = 'single', // 'single', 'recipe', 'bulk'
                                                 recipeIngredients = [], // For recipe mode
                                                 recipeName = ''
                                             }) {
    const { data: session } = useSession();
    const [consumptionData, setConsumptionData] = useState({
        reason: 'consumed', // consumed, expired, recipe, donated, other
        quantity: 1,
        unit: item?.unit || 'item',
        notes: '',
        removeCompletely: false
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

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

    const handleQuantityChange = (value) => {
        const numValue = parseFloat(value);
        if (numValue >= item.quantity) {
            setConsumptionData(prev => ({
                ...prev,
                quantity: item.quantity,
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
                // Handle single item consumption
                await onConsume({
                    itemId: item._id,
                    reason: consumptionData.reason,
                    quantity: consumptionData.quantity,
                    unit: consumptionData.unit,
                    notes: consumptionData.notes,
                    removeCompletely: consumptionData.removeCompletely
                });
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
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Cancel
                            </button>
                            <button
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
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    // Single item consumption mode
    const reasonStyle = getReasonStyle(consumptionData.reason);

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

                        {/* Current Stock Display */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-600">Current Stock</div>
                            <div className="text-lg font-semibold text-gray-900">
                                {item.quantity} {item.unit}
                            </div>
                        </div>

                        {/* Reason Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Reason for Update
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {reasonOptions.map((option) => (
                                    <button
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
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Quantity Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Quantity
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max={item.quantity}
                                    value={consumptionData.quantity}
                                    onChange={(e) => handleQuantityChange(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Unit
                                </label>
                                <select
                                    value={consumptionData.unit}
                                    onChange={(e) => setConsumptionData(prev => ({ ...prev, unit: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="item">Item(s)</option>
                                    <option value="lbs">Pounds</option>
                                    <option value="oz">Ounces</option>
                                    <option value="kg">Kilograms</option>
                                    <option value="g">Grams</option>
                                    <option value="cup">Cup(s)</option>
                                    <option value="tbsp">Tablespoon(s)</option>
                                    <option value="tsp">Teaspoon(s)</option>
                                    <option value="ml">Milliliters</option>
                                    <option value="l">Liters</option>
                                    <option value="can">Can(s)</option>
                                    <option value="package">Package(s)</option>
                                </select>
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
                                        quantity: e.target.checked ? item.quantity : prev.quantity
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

                        {/* Preview */}
                        <div className="bg-blue-50 rounded-lg p-4">
                            <div className="text-sm text-blue-800">
                                <strong>After update:</strong>{' '}
                                {consumptionData.removeCompletely
                                    ? 'Item will be removed from inventory'
                                    : `${(item.quantity - consumptionData.quantity).toFixed(1)} ${item.unit} remaining`
                                }
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Cancel
                        </button>
                        <button
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
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}