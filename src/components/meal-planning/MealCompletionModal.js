'use client';
// file: /src/components/meal-planning/MealCompletionModal.js v1 - Full-screen meal completion with ingredient matching

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { apiGet, apiPost } from '@/lib/api-config';
import { findBestInventoryMatch, normalizeIngredientName, extractIngredientName } from '@/utils/ingredientMatching';

export default function MealCompletionModal({
                                                isOpen,
                                                onClose,
                                                onComplete,
                                                meal,
                                                selectedSlot,
                                                inventory = []
                                            }) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [isMobile, setIsMobile] = useState(false);
    const [activeTab, setActiveTab] = useState('ingredients');

    // Completion settings
    const [completionType, setCompletionType] = useState('full'); // 'full', 'partial'
    const [completionPercentage, setCompletionPercentage] = useState(100);
    const [notes, setNotes] = useState('');

    // Recipe data
    const [recipeDetails, setRecipeDetails] = useState(null);
    const [matchedIngredients, setMatchedIngredients] = useState([]);

    // Check if mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (isOpen && meal) {
            if (meal.entryType === 'recipe') {
                loadRecipeDetails();
            } else {
                // For simple meals, use the items directly
                setMatchedIngredients(meal.simpleMeal.items.map(item => ({
                    recipeIngredient: {
                        name: item.itemName,
                        amount: item.quantity,
                        unit: item.unit
                    },
                    inventoryItem: inventory.find(invItem => invItem._id?.toString() === item.inventoryItemId?.toString()) || null,
                    quantityToConsume: completionType === 'full' ? item.quantity : Math.round((item.quantity * completionPercentage) / 100),
                    reason: 'consumed',
                    matchType: 'direct',
                    isManuallySelected: true
                })));
            }
        }
    }, [isOpen, meal, inventory, completionType, completionPercentage]);

    const loadRecipeDetails = async () => {
        if (!meal.recipeId) return;

        setLoading(true);
        try {
            const response = await apiGet(`/api/recipes/${meal.recipeId}`);
            const data = await response.json();

            if (data.success) {
                setRecipeDetails(data.recipe);
                performIngredientMatching(data.recipe.ingredients);
            } else {
                setError('Failed to load recipe details');
            }
        } catch (error) {
            console.error('Error loading recipe details:', error);
            setError('Failed to load recipe details');
        } finally {
            setLoading(false);
        }
    };

    const performIngredientMatching = (recipeIngredients) => {
        console.log('🔍 Performing ingredient matching for', recipeIngredients.length, 'ingredients');

        const matched = recipeIngredients.map(recipeIngredient => {
            const extractedName = extractIngredientName(recipeIngredient.name || recipeIngredient);
            const bestMatch = findBestInventoryMatch(extractedName, inventory);

            const baseQuantity = parseFloat(recipeIngredient.amount) || 1;
            const adjustedQuantity = completionType === 'full'
                ? baseQuantity
                : Math.round((baseQuantity * completionPercentage) / 100 * 10) / 10; // Round to 1 decimal

            return {
                recipeIngredient: {
                    name: recipeIngredient.name || recipeIngredient,
                    amount: recipeIngredient.amount,
                    unit: recipeIngredient.unit,
                    extractedName
                },
                inventoryItem: bestMatch,
                quantityToConsume: adjustedQuantity,
                reason: 'recipe',
                matchType: bestMatch ? 'auto' : 'none',
                isManuallySelected: false
            };
        });

        setMatchedIngredients(matched);
        console.log('✅ Ingredient matching complete:', matched.length, 'ingredients processed');
    };

    const updateIngredientMatch = (index, field, value) => {
        setMatchedIngredients(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const selectInventoryItem = (ingredientIndex, inventoryItem) => {
        updateIngredientMatch(ingredientIndex, 'inventoryItem', inventoryItem);
        updateIngredientMatch(ingredientIndex, 'matchType', 'manual');
        updateIngredientMatch(ingredientIndex, 'isManuallySelected', true);
    };

    const handleCompletionTypeChange = (type) => {
        setCompletionType(type);

        // Update all ingredient quantities based on completion type
        setMatchedIngredients(prev => prev.map(ingredient => {
            const baseQuantity = parseFloat(ingredient.recipeIngredient.amount) || 1;
            const newQuantity = type === 'full'
                ? baseQuantity
                : Math.round((baseQuantity * completionPercentage) / 100 * 10) / 10;

            return {
                ...ingredient,
                quantityToConsume: newQuantity
            };
        }));
    };

    const handlePercentageChange = (percentage) => {
        setCompletionPercentage(percentage);

        if (completionType === 'partial') {
            setMatchedIngredients(prev => prev.map(ingredient => {
                const baseQuantity = parseFloat(ingredient.recipeIngredient.amount) || 1;
                const newQuantity = Math.round((baseQuantity * percentage) / 100 * 10) / 10;

                return {
                    ...ingredient,
                    quantityToConsume: newQuantity
                };
            }));
        }
    };

    const getAvailableInventoryItems = (currentMatch) => {
        const currentIngredientName = currentMatch.recipeIngredient.extractedName || currentMatch.recipeIngredient.name;
        const normalized = normalizeIngredientName(currentIngredientName);

        return inventory.filter(item => {
            const itemNorm = normalizeIngredientName(item.name);
            // Show items that contain or are contained by the ingredient name
            return itemNorm.includes(normalized) || normalized.includes(itemNorm);
        });
    };

    const handleComplete = async () => {
        setSaving(true);
        setError('');

        try {
            // Filter out ingredients that don't have inventory matches
            const itemsToConsume = matchedIngredients
                .filter(ingredient => ingredient.inventoryItem && ingredient.quantityToConsume > 0)
                .map(ingredient => ({
                    itemId: ingredient.inventoryItem._id,
                    quantity: ingredient.quantityToConsume,
                    unit: ingredient.inventoryItem.unit,
                    reason: ingredient.reason,
                    notes: `${completionType === 'partial' ? `${completionPercentage}% completion - ` : ''}Used in ${meal.entryType === 'recipe' ? 'recipe' : 'meal'}: ${meal.entryType === 'recipe' ? meal.recipeName : meal.simpleMeal.name}`,
                    recipeName: meal.entryType === 'recipe' ? meal.recipeName : meal.simpleMeal.name
                }));

            if (itemsToConsume.length === 0) {
                setError('No inventory items selected for consumption');
                return;
            }

            console.log('📤 Consuming ingredients:', itemsToConsume);

            // Call the consumption API
            const response = await apiPost('/api/inventory/consume', {
                mode: 'batch',
                consumptions: itemsToConsume
            });

            const result = await response.json();

            if (result.success) {
                // Mark meal as completed and pass completion data
                await onComplete({
                    mealId: meal._id || `${meal.recipeName || meal.simpleMeal.name}-${Date.now()}`,
                    completionType,
                    completionPercentage,
                    itemsConsumed: itemsToConsume.length,
                    notes,
                    completedAt: new Date().toISOString(),
                    consumptionSummary: result.summary
                });

                onClose();
            } else {
                setError(result.error || 'Failed to consume ingredients');
            }
        } catch (error) {
            console.error('Error completing meal:', error);
            setError('Failed to complete meal: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const matchedCount = matchedIngredients.filter(ingredient => ingredient.inventoryItem).length;
    const totalCount = matchedIngredients.length;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
            <div className="bg-white rounded-lg w-full max-w-6xl h-[95vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                    <div className="flex-1">
                        <h2 className="text-lg font-semibold text-gray-900">
                            ✅ Mark Meal Complete
                        </h2>
                        <p className="text-sm text-gray-600">
                            {meal.entryType === 'recipe' ? meal.recipeName : meal.simpleMeal?.name} • {selectedSlot?.day} {selectedSlot?.mealType}
                        </p>
                    </div>
                    <TouchEnhancedButton
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-xl p-1 ml-4"
                    >
                        ×
                    </TouchEnhancedButton>
                </div>

                {/* Tab Navigation (Mobile) */}
                {isMobile && (
                    <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
                        <TouchEnhancedButton
                            onClick={() => setActiveTab('ingredients')}
                            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                                activeTab === 'ingredients'
                                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            📦 Ingredients ({matchedCount}/{totalCount})
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={() => setActiveTab('completion')}
                            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                                activeTab === 'completion'
                                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            ⚙️ Settings
                        </TouchEnhancedButton>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden flex">
                    {/* Desktop Split Layout / Mobile Tab Content */}
                    {(!isMobile || activeTab === 'ingredients') && (
                        <div className={`${isMobile ? 'w-full' : 'w-2/3'} border-r border-gray-200 flex flex-col min-h-0`}>
                            <div className="p-4 border-b border-gray-100 flex-shrink-0">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    📦 Ingredient Consumption
                                </h3>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">
                                        {matchedCount} of {totalCount} ingredients matched
                                    </span>
                                    {error && (
                                        <span className="text-red-600 text-xs">{error}</span>
                                    )}
                                </div>
                            </div>

                            {/* Ingredient List */}
                            <div className="flex-1 overflow-y-auto p-4 min-h-0">
                                {loading ? (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                                        <p className="text-gray-500">Loading recipe details...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {matchedIngredients.map((ingredient, index) => (
                                            <div key={index} className={`border rounded-lg p-4 ${
                                                ingredient.inventoryItem ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                                            }`}>
                                                {/* Ingredient Header */}
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <h4 className="font-medium text-gray-900 mb-1">
                                                            {ingredient.recipeIngredient.amount && ingredient.recipeIngredient.unit
                                                                ? `${ingredient.recipeIngredient.amount} ${ingredient.recipeIngredient.unit} `
                                                                : ''
                                                            }
                                                            {ingredient.recipeIngredient.name}
                                                        </h4>
                                                        {ingredient.inventoryItem && (
                                                            <div className="text-sm text-green-600">
                                                                ✅ Matched: {ingredient.inventoryItem.name}
                                                            </div>
                                                        )}
                                                        {!ingredient.inventoryItem && (
                                                            <div className="text-sm text-red-600">
                                                                ❌ No inventory match found
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        {ingredient.inventoryItem && (
                                                            <div className="text-sm text-gray-600">
                                                                Available: {ingredient.inventoryItem.quantity} {ingredient.inventoryItem.unit}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Manual Selection */}
                                                {!ingredient.inventoryItem && (
                                                    <div className="mb-3">
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Select from inventory:
                                                        </label>
                                                        <select
                                                            onChange={(e) => {
                                                                const selectedItem = inventory.find(item => item._id === e.target.value);
                                                                if (selectedItem) {
                                                                    selectInventoryItem(index, selectedItem);
                                                                }
                                                            }}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                                        >
                                                            <option value="">Select an item...</option>
                                                            {getAvailableInventoryItems(ingredient).map(item => (
                                                                <option key={item._id} value={item._id}>
                                                                    {item.name} ({item.quantity} {item.unit})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}

                                                {/* Consumption Settings */}
                                                {ingredient.inventoryItem && (
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Quantity to Use
                                                            </label>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                min="0"
                                                                max={ingredient.inventoryItem.quantity}
                                                                value={ingredient.quantityToConsume}
                                                                onChange={(e) => updateIngredientMatch(index, 'quantityToConsume', parseFloat(e.target.value))}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Reason
                                                            </label>
                                                            <select
                                                                value={ingredient.reason}
                                                                onChange={(e) => updateIngredientMatch(index, 'reason', e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                                            >
                                                                <option value="consumed">Consumed/Used</option>
                                                                <option value="recipe">Used in Recipe</option>
                                                                <option value="expired">Expired/Bad</option>
                                                                <option value="spilled">Spilled/Wasted</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Completion Settings Panel */}
                    {(!isMobile || activeTab === 'completion') && (
                        <div className={`${isMobile ? 'w-full' : 'w-1/3'} flex flex-col min-h-0`}>
                            <div className="p-4 border-b border-gray-100 flex-shrink-0">
                                <h3 className="text-lg font-semibold text-gray-900">⚙️ Completion Settings</h3>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                {/* Completion Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">
                                        How much did you make?
                                    </label>
                                    <div className="space-y-2">
                                        <TouchEnhancedButton
                                            onClick={() => handleCompletionTypeChange('full')}
                                            className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                                                completionType === 'full'
                                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                            }`}
                                        >
                                            <div className="font-medium">✅ Full Recipe/Meal</div>
                                            <div className="text-sm opacity-75">Made the complete recipe as planned</div>
                                        </TouchEnhancedButton>

                                        <TouchEnhancedButton
                                            onClick={() => handleCompletionTypeChange('partial')}
                                            className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                                                completionType === 'partial'
                                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                            }`}
                                        >
                                            <div className="font-medium">📏 Partial Amount</div>
                                            <div className="text-sm opacity-75">Made only a portion of the recipe</div>
                                        </TouchEnhancedButton>
                                    </div>
                                </div>

                                {/* Percentage Slider */}
                                {completionType === 'partial' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Percentage Made: {completionPercentage}%
                                        </label>
                                        <input
                                            type="range"
                                            min="10"
                                            max="90"
                                            step="5"
                                            value={completionPercentage}
                                            onChange={(e) => handlePercentageChange(parseInt(e.target.value))}
                                            className="w-full"
                                        />
                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span>10%</span>
                                            <span>50%</span>
                                            <span>90%</span>
                                        </div>
                                    </div>
                                )}

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Notes (Optional)
                                    </label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        placeholder="How was the meal? Any modifications you made?"
                                    />
                                </div>

                                {/* Summary */}
                                <div className="bg-blue-50 rounded-lg p-4">
                                    <h4 className="font-medium text-blue-900 mb-2">📊 Summary</h4>
                                    <div className="text-sm text-blue-800 space-y-1">
                                        <div>Meal: {meal.entryType === 'recipe' ? meal.recipeName : meal.simpleMeal?.name}</div>
                                        <div>Completion: {completionType === 'full' ? '100%' : `${completionPercentage}%`}</div>
                                        <div>Ingredients to consume: {matchedIngredients.filter(i => i.inventoryItem && i.quantityToConsume > 0).length}</div>
                                        <div>Missing ingredients: {matchedIngredients.filter(i => !i.inventoryItem).length}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0 bg-white">
                    <TouchEnhancedButton
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </TouchEnhancedButton>

                    <div className="flex items-center space-x-3">
                        <div className="text-sm text-gray-600">
                            {matchedCount > 0 ? `${matchedCount} items ready to consume` : 'No items to consume'}
                        </div>
                        <TouchEnhancedButton
                            onClick={handleComplete}
                            disabled={saving || matchedIngredients.filter(i => i.inventoryItem && i.quantityToConsume > 0).length === 0}
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:bg-gray-400 flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Completing...
                                </>
                            ) : (
                                <>
                                    ✅ Mark Complete
                                </>
                            )}
                        </TouchEnhancedButton>
                    </div>
                </div>
            </div>
        </div>
    );
}