'use client';
// file: /src/components/meal-planning/MealCompletionModal.js v2 - Enhanced with ability to add extra items and missing inventory items

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { apiGet, apiPost } from '@/lib/api-config';
import { findBestInventoryMatch, normalizeIngredientName, extractIngredientName } from '@/utils/ingredientMatching';
import UPCLookup from '@/components/inventory/UPCLookup';
import KeyboardOptimizedInput from '@/components/forms/KeyboardOptimizedInput';

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

    // NEW: Extra items and missing items functionality
    const [showAddExtraItemModal, setShowAddExtraItemModal] = useState(false);
    const [showAddMissingItemModal, setShowAddMissingItemModal] = useState(false);
    const [extraItems, setExtraItems] = useState([]); // Items added during cooking
    const [addedInventoryItems, setAddedInventoryItems] = useState([]); // Items added to inventory during completion
    const [refreshedInventory, setRefreshedInventory] = useState(inventory); // Updated inventory list

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
                    inventoryItem: refreshedInventory.find(invItem => invItem._id?.toString() === item.inventoryItemId?.toString()) || null,
                    quantityToConsume: completionType === 'full' ? item.quantity : Math.round((item.quantity * completionPercentage) / 100),
                    reason: 'consumed',
                    matchType: 'direct',
                    isManuallySelected: true
                })));
            }
        }
    }, [isOpen, meal, refreshedInventory, completionType, completionPercentage]);

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
            const bestMatch = findBestInventoryMatch(extractedName, refreshedInventory);

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

        // Update extra items quantities too
        setExtraItems(prev => prev.map(item => {
            const baseQuantity = parseFloat(item.originalQuantity) || 1;
            const newQuantity = type === 'full'
                ? baseQuantity
                : Math.round((baseQuantity * completionPercentage) / 100 * 10) / 10;

            return {
                ...item,
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

            // Update extra items quantities too
            setExtraItems(prev => prev.map(item => {
                const baseQuantity = parseFloat(item.originalQuantity) || 1;
                const newQuantity = Math.round((baseQuantity * percentage) / 100 * 10) / 10;

                return {
                    ...item,
                    quantityToConsume: newQuantity
                };
            }));
        }
    };

    const getAvailableInventoryItems = (currentMatch) => {
        const currentIngredientName = currentMatch.recipeIngredient.extractedName || currentMatch.recipeIngredient.name;
        const normalized = normalizeIngredientName(currentIngredientName);

        return refreshedInventory.filter(item => {
            const itemNorm = normalizeIngredientName(item.name);
            // Show items that contain or are contained by the ingredient name
            return itemNorm.includes(normalized) || normalized.includes(itemNorm);
        });
    };

    // NEW: Handle adding extra items that were used during cooking
    const handleAddExtraItem = async (itemData) => {
        console.log('Adding extra item:', itemData);

        const extraItem = {
            id: `extra-${Date.now()}`,
            name: itemData.name,
            inventoryItem: itemData.inventoryItem,
            originalQuantity: itemData.quantity,
            quantityToConsume: completionType === 'full' ? itemData.quantity : Math.round((itemData.quantity * completionPercentage) / 100 * 10) / 10,
            reason: 'enhancement',
            unit: itemData.inventoryItem?.unit || 'item',
            notes: itemData.notes || 'Added during cooking'
        };

        setExtraItems(prev => [...prev, extraItem]);
        setShowAddExtraItemModal(false);

        // If item was added to inventory during this process, refresh our inventory
        if (itemData.addedToInventory) {
            await refreshInventoryList();
        }
    };

    // NEW: Handle adding missing inventory items
    const handleAddMissingItem = async (itemData) => {
        console.log('Adding missing inventory item:', itemData);

        // Add to our refreshed inventory so it can be used in consumption
        const newInventoryItem = {
            _id: `temp-${Date.now()}`,
            name: itemData.name,
            brand: itemData.brand || '',
            category: itemData.category || '',
            quantity: itemData.quantity,
            unit: itemData.unit,
            location: itemData.location || 'pantry',
            addedDuringCompletion: true
        };

        setRefreshedInventory(prev => [...prev, newInventoryItem]);
        setAddedInventoryItems(prev => [...prev, newInventoryItem]);
        setShowAddMissingItemModal(false);

        // Re-perform ingredient matching with updated inventory
        if (recipeDetails) {
            performIngredientMatching(recipeDetails.ingredients);
        }
    };

    // NEW: Refresh inventory list from server
    const refreshInventoryList = async () => {
        try {
            const response = await apiGet('/api/inventory');
            const data = await response.json();
            if (data.success) {
                setRefreshedInventory(data.inventory);
            }
        } catch (error) {
            console.error('Error refreshing inventory:', error);
        }
    };

    const handleComplete = async () => {
        setSaving(true);
        setError('');

        try {
            // Combine regular ingredients and extra items for consumption
            const allItemsToConsume = [];

            // Regular recipe ingredients
            const recipeItemsToConsume = matchedIngredients
                .filter(ingredient => ingredient.inventoryItem && ingredient.quantityToConsume > 0)
                .map(ingredient => ({
                    itemId: ingredient.inventoryItem._id,
                    quantity: ingredient.quantityToConsume,
                    unit: ingredient.inventoryItem.unit,
                    reason: ingredient.reason,
                    notes: `${completionType === 'partial' ? `${completionPercentage}% completion - ` : ''}Used in ${meal.entryType === 'recipe' ? 'recipe' : 'meal'}: ${meal.entryType === 'recipe' ? meal.recipeName : meal.simpleMeal.name}`,
                    recipeName: meal.entryType === 'recipe' ? meal.recipeName : meal.simpleMeal.name
                }));

            // Extra items added during cooking
            const extraItemsToConsume = extraItems
                .filter(item => item.inventoryItem && item.quantityToConsume > 0)
                .map(item => ({
                    itemId: item.inventoryItem._id,
                    quantity: item.quantityToConsume,
                    unit: item.unit,
                    reason: item.reason,
                    notes: `${completionType === 'partial' ? `${completionPercentage}% completion - ` : ''}Extra ingredient used: ${item.notes}`,
                    recipeName: meal.entryType === 'recipe' ? meal.recipeName : meal.simpleMeal.name
                }));

            allItemsToConsume.push(...recipeItemsToConsume, ...extraItemsToConsume);

            if (allItemsToConsume.length === 0) {
                setError('No inventory items selected for consumption');
                return;
            }

            console.log('📤 Consuming ingredients:', allItemsToConsume);

            // Call the consumption API
            const response = await apiPost('/api/inventory/consume', {
                mode: 'batch',
                consumptions: allItemsToConsume
            });

            const result = await response.json();

            if (result.success) {
                // Mark meal as completed and pass completion data
                await onComplete({
                    mealId: meal._id || `${meal.recipeName || meal.simpleMeal.name}-${Date.now()}`,
                    completionType,
                    completionPercentage,
                    itemsConsumed: allItemsToConsume.length,
                    extraItemsUsed: extraItems.length,
                    inventoryItemsAdded: addedInventoryItems.length,
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

    const removeExtraItem = (itemId) => {
        setExtraItems(prev => prev.filter(item => item.id !== itemId));
    };

    const getMissingIngredients = () => {
        return matchedIngredients.filter(ingredient => !ingredient.inventoryItem);
    };

    if (!isOpen) return null;

    const matchedCount = matchedIngredients.filter(ingredient => ingredient.inventoryItem).length;
    const totalCount = matchedIngredients.length;
    const missingCount = getMissingIngredients().length;

    return (
        <>
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
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            📦 Ingredient Consumption
                                        </h3>

                                        {/* NEW: Action buttons for adding items */}
                                        <div className="flex gap-2">
                                            <TouchEnhancedButton
                                                onClick={() => setShowAddExtraItemModal(true)}
                                                className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 border border-green-300"
                                                title="Add extra ingredients you used while cooking"
                                            >
                                                ➕ Add Extra
                                            </TouchEnhancedButton>

                                            {missingCount > 0 && (
                                                <TouchEnhancedButton
                                                    onClick={() => setShowAddMissingItemModal(true)}
                                                    className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 border border-orange-300"
                                                    title="Add missing ingredients to inventory"
                                                >
                                                    📋 Add Missing ({missingCount})
                                                </TouchEnhancedButton>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">
                                            {matchedCount} of {totalCount} ingredients matched
                                            {extraItems.length > 0 && ` • ${extraItems.length} extra items`}
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
                                            {/* Regular Recipe Ingredients */}
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
                                                                    const selectedItem = refreshedInventory.find(item => item._id === e.target.value);
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

                                            {/* NEW: Extra Items Section */}
                                            {extraItems.length > 0 && (
                                                <>
                                                    <div className="border-t pt-4 mt-4">
                                                        <h4 className="font-medium text-gray-900 mb-3">🌟 Extra Items Used</h4>
                                                    </div>
                                                    {extraItems.map((item) => (
                                                        <div key={item.id} className="border rounded-lg p-4 border-blue-200 bg-blue-50">
                                                            <div className="flex items-start justify-between mb-3">
                                                                <div className="flex-1">
                                                                    <h4 className="font-medium text-gray-900 mb-1">
                                                                        {item.name}
                                                                    </h4>
                                                                    <div className="text-sm text-blue-600">
                                                                        ✨ Extra ingredient: {item.inventoryItem.name}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="text-sm text-gray-600">
                                                                        Available: {item.inventoryItem.quantity} {item.inventoryItem.unit}
                                                                    </div>
                                                                    <TouchEnhancedButton
                                                                        onClick={() => removeExtraItem(item.id)}
                                                                        className="text-red-600 hover:text-red-800 text-sm"
                                                                    >
                                                                        ✕
                                                                    </TouchEnhancedButton>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                        Quantity Used
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        step="0.1"
                                                                        min="0"
                                                                        max={item.inventoryItem.quantity}
                                                                        value={item.quantityToConsume}
                                                                        onChange={(e) => {
                                                                            const newQuantity = parseFloat(e.target.value);
                                                                            setExtraItems(prev => prev.map(extraItem =>
                                                                                extraItem.id === item.id
                                                                                    ? { ...extraItem, quantityToConsume: newQuantity }
                                                                                    : extraItem
                                                                            ));
                                                                        }}
                                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                        Notes
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={item.notes}
                                                                        onChange={(e) => {
                                                                            setExtraItems(prev => prev.map(extraItem =>
                                                                                extraItem.id === item.id
                                                                                    ? { ...extraItem, notes: e.target.value }
                                                                                    : extraItem
                                                                            ));
                                                                        }}
                                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                                                        placeholder="Why was this added?"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </>
                                            )}
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
                                            {extraItems.length > 0 && (
                                                <div>Extra items used: {extraItems.length}</div>
                                            )}
                                            {addedInventoryItems.length > 0 && (
                                                <div>Items added to inventory: {addedInventoryItems.length}</div>
                                            )}
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
                                {matchedIngredients.filter(i => i.inventoryItem && i.quantityToConsume > 0).length + extraItems.filter(i => i.inventoryItem && i.quantityToConsume > 0).length > 0
                                    ? `${matchedIngredients.filter(i => i.inventoryItem && i.quantityToConsume > 0).length + extraItems.filter(i => i.inventoryItem && i.quantityToConsume > 0).length} items ready to consume`
                                    : 'No items to consume'}
                            </div>
                            <TouchEnhancedButton
                                onClick={handleComplete}
                                disabled={saving || (matchedIngredients.filter(i => i.inventoryItem && i.quantityToConsume > 0).length + extraItems.filter(i => i.inventoryItem && i.quantityToConsume > 0).length) === 0}
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

            {/* NEW: Add Extra Item Modal */}
            <AddInventoryItemModal
                isOpen={showAddExtraItemModal}
                onClose={() => setShowAddExtraItemModal(false)}
                onSave={handleAddExtraItem}
                title="Add Extra Ingredient"
                description="Add an ingredient you used that wasn't in the original recipe"
                mode="extra"
                inventory={refreshedInventory}
            />

            {/* NEW: Add Missing Item Modal */}
            <AddInventoryItemModal
                isOpen={showAddMissingItemModal}
                onClose={() => setShowAddMissingItemModal(false)}
                onSave={handleAddMissingItem}
                title="Add Missing Ingredients"
                description="Add ingredients to your inventory that were needed but not found"
                mode="missing"
                missingIngredients={getMissingIngredients()}
                inventory={refreshedInventory}
            />
        </>
    );
}

// NEW: Add Inventory Item Modal Component
function AddInventoryItemModal({
                                   isOpen,
                                   onClose,
                                   onSave,
                                   title,
                                   description,
                                   mode,
                                   inventory = [],
                                   missingIngredients = []
                               }) {
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        category: '',
        quantity: 1,
        unit: 'item',
        location: 'pantry',
        upc: '',
        notes: ''
    });
    const [selectedMissingIngredient, setSelectedMissingIngredient] = useState(null);
    const [showUPCLookup, setShowUPCLookup] = useState(false);
    const [loading, setLoading] = useState(false);
    const [addToInventory, setAddToInventory] = useState(true);
    const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);

    useEffect(() => {
        if (isOpen && mode === 'missing' && missingIngredients.length > 0) {
            // Pre-fill with first missing ingredient
            const firstMissing = missingIngredients[0];
            setFormData(prev => ({
                ...prev,
                name: firstMissing.recipeIngredient.name,
                quantity: firstMissing.recipeIngredient.amount || 1,
                unit: firstMissing.recipeIngredient.unit || 'item'
            }));
            setSelectedMissingIngredient(firstMissing);
        }
    }, [isOpen, mode, missingIngredients]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleProductFound = (product) => {
        setFormData(prev => ({
            ...prev,
            name: product.name || prev.name,
            brand: product.brand || prev.brand,
            category: product.category || prev.category,
            upc: product.upc || prev.upc
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let inventoryItem = selectedInventoryItem;
            let addedToInventory = false;

            // If we need to add to inventory or if it's a new item
            if (addToInventory && !selectedInventoryItem) {
                const response = await apiPost('/api/inventory', {
                    ...formData,
                    mergeDuplicates: true
                });

                const data = await response.json();

                if (data.success) {
                    inventoryItem = data.item;
                    addedToInventory = true;
                } else {
                    throw new Error(data.error || 'Failed to add item to inventory');
                }
            }

            // Call the onSave callback with the item data
            await onSave({
                name: formData.name,
                quantity: formData.quantity,
                unit: formData.unit,
                inventoryItem: inventoryItem,
                notes: formData.notes,
                addedToInventory: addedToInventory
            });

            // Reset form
            setFormData({
                name: '',
                brand: '',
                category: '',
                quantity: 1,
                unit: 'item',
                location: 'pantry',
                upc: '',
                notes: ''
            });
            setSelectedInventoryItem(null);
            setAddToInventory(true);

        } catch (error) {
            console.error('Error adding item:', error);
            alert('Error adding item: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleMissingIngredientSelect = (ingredient) => {
        setSelectedMissingIngredient(ingredient);
        setFormData(prev => ({
            ...prev,
            name: ingredient.recipeIngredient.name,
            quantity: ingredient.recipeIngredient.amount || 1,
            unit: ingredient.recipeIngredient.unit || 'item'
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                            <p className="text-sm text-gray-600">{description}</p>
                        </div>
                        <TouchEnhancedButton
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </TouchEnhancedButton>
                    </div>

                    {/* Missing Ingredients Quick Select (for missing mode) */}
                    {mode === 'missing' && missingIngredients.length > 0 && (
                        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                            <h3 className="text-sm font-medium text-orange-900 mb-2">Missing Ingredients:</h3>
                            <div className="flex flex-wrap gap-2">
                                {missingIngredients.map((ingredient, index) => (
                                    <TouchEnhancedButton
                                        key={index}
                                        onClick={() => handleMissingIngredientSelect(ingredient)}
                                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                                            selectedMissingIngredient === ingredient
                                                ? 'bg-orange-200 text-orange-800 border-orange-300'
                                                : 'bg-white text-orange-700 border-orange-300 hover:bg-orange-100'
                                        }`}
                                    >
                                        {ingredient.recipeIngredient.name}
                                    </TouchEnhancedButton>
                                ))}
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Toggle between using existing inventory or adding new */}
                        {mode === 'extra' && (
                            <div className="space-y-3">
                                <div className="flex items-center space-x-4">
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={() => {
                                            setSelectedInventoryItem(null);
                                            setAddToInventory(false);
                                        }}
                                        className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                                            !addToInventory && !selectedInventoryItem
                                                ? 'bg-blue-100 text-blue-700 border-blue-300'
                                                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                                        }`}
                                    >
                                        Use Existing Item
                                    </TouchEnhancedButton>
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={() => {
                                            setSelectedInventoryItem(null);
                                            setAddToInventory(true);
                                        }}
                                        className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                                            addToInventory
                                                ? 'bg-green-100 text-green-700 border-green-300'
                                                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                                        }`}
                                    >
                                        Add New Item
                                    </TouchEnhancedButton>
                                </div>

                                {/* Existing inventory selection */}
                                {!addToInventory && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Select from existing inventory:
                                        </label>
                                        <select
                                            onChange={(e) => {
                                                const item = inventory.find(i => i._id === e.target.value);
                                                setSelectedInventoryItem(item);
                                                if (item) {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        name: item.name,
                                                        quantity: 1, // Default to 1 for consumption
                                                        unit: item.unit
                                                    }));
                                                }
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            value={selectedInventoryItem?._id || ''}
                                        >
                                            <option value="">Choose an item...</option>
                                            {inventory.map(item => (
                                                <option key={item._id} value={item._id}>
                                                    {item.name} ({item.quantity} {item.unit})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Show form fields only if adding new item or for missing items */}
                        {(addToInventory || mode === 'missing' || !selectedInventoryItem) && (
                            <>
                                {/* UPC Lookup Toggle */}
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-medium text-gray-700">Item Details</h3>
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={() => setShowUPCLookup(!showUPCLookup)}
                                        className="text-sm text-indigo-600 hover:text-indigo-800"
                                    >
                                        {showUPCLookup ? 'Hide' : 'Show'} UPC Lookup
                                    </TouchEnhancedButton>
                                </div>

                                {/* UPC Lookup Section */}
                                {showUPCLookup && (
                                    <div className="border border-gray-200 rounded-lg p-4">
                                        <UPCLookup
                                            onProductFound={handleProductFound}
                                            onUPCChange={(upc) => setFormData(prev => ({ ...prev, upc }))}
                                            currentUPC={formData.upc}
                                        />
                                    </div>
                                )}

                                {/* Basic Form Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Item Name *
                                        </label>
                                        <KeyboardOptimizedInput
                                            type="text"
                                            name="name"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            placeholder="e.g., Extra Virgin Olive Oil"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Brand
                                        </label>
                                        <KeyboardOptimizedInput
                                            type="text"
                                            name="brand"
                                            value={formData.brand}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            placeholder="e.g., Bertolli"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Quantity *
                                        </label>
                                        <div className="flex rounded-md shadow-sm">
                                            <input
                                                type="number"
                                                name="quantity"
                                                min="0"
                                                step="0.01"
                                                required
                                                value={formData.quantity}
                                                onChange={handleChange}
                                                className="flex-1 border border-gray-300 rounded-l-md px-3 py-2"
                                            />
                                            <select
                                                name="unit"
                                                value={formData.unit}
                                                onChange={handleChange}
                                                className="border border-l-0 border-gray-300 rounded-r-md bg-gray-50 px-3 py-2"
                                            >
                                                <option value="can">Can(s)</option>
                                                <option value="cup">Cup(s)</option>
                                                <option value="each">Each</option>
                                                <option value="g">Grams</option>
                                                <option value="item">Item(s)</option>
                                                <option value="kg">Kilograms</option>
                                                <option value="l">Liters</option>
                                                <option value="ml">Milliliters</option>
                                                <option value="oz">Ounces</option>
                                                <option value="package">Package(s)</option>
                                                <option value="lbs">Pounds</option>
                                                <option value="tbsp">Tablespoon(s)</option>
                                                <option value="tsp">Teaspoon(s)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Category
                                        </label>
                                        <select
                                            name="category"
                                            value={formData.category}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        >
                                            <option value="">Select category</option>
                                            <option value="Baking & Cooking Ingredients">Baking & Cooking Ingredients</option>
                                            <option value="Condiments">Condiments</option>
                                            <option value="Dairy">Dairy</option>
                                            <option value="Fresh Spices">Fresh Spices</option>
                                            <option value="Seasonings">Seasonings</option>
                                            <option value="Spices">Spices</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Storage Location
                                        </label>
                                        <select
                                            name="location"
                                            value={formData.location}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        >
                                            <option value="pantry">Pantry</option>
                                            <option value="kitchen">Kitchen Cabinets</option>
                                            <option value="fridge">Fridge</option>
                                            <option value="fridge-freezer">Fridge Freezer</option>
                                            <option value="deep-freezer">Deep/Stand-up Freezer</option>
                                            <option value="garage">Garage/Storage</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Notes
                                        </label>
                                        <KeyboardOptimizedInput
                                            type="text"
                                            name="notes"
                                            value={formData.notes}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            placeholder="Why was this added?"
                                        />
                                    </div>
                                </div>

                                {/* Add to inventory checkbox for extra items */}
                                {mode === 'extra' && addToInventory && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                        <div className="flex items-start">
                                            <input
                                                type="checkbox"
                                                id="confirmAddToInventory"
                                                checked={addToInventory}
                                                onChange={(e) => setAddToInventory(e.target.checked)}
                                                className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="confirmAddToInventory" className="ml-3 text-sm text-green-800">
                                                <span className="font-medium">Add this item to your inventory</span>
                                                <p className="text-green-700 mt-1">
                                                    This will save the item for future meal planning and consumption tracking.
                                                    Great for spices, seasonings, and other items you buy in larger quantities.
                                                </p>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* Missing items always get added to inventory */}
                                {mode === 'missing' && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <div className="flex items-start">
                                            <div className="text-blue-600 mr-2">ℹ️</div>
                                            <div className="text-sm text-blue-800">
                                                <span className="font-medium">This item will be added to your inventory</span>
                                                <p className="text-blue-700 mt-1">
                                                    Missing recipe ingredients are automatically added to your inventory so you can track their consumption.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Show selected existing item info */}
                        {selectedInventoryItem && !addToInventory && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <h4 className="font-medium text-blue-900 mb-2">Selected Item:</h4>
                                <div className="text-sm text-blue-800">
                                    <div><strong>Name:</strong> {selectedInventoryItem.name}</div>
                                    <div><strong>Available:</strong> {selectedInventoryItem.quantity} {selectedInventoryItem.unit}</div>
                                    {selectedInventoryItem.brand && <div><strong>Brand:</strong> {selectedInventoryItem.brand}</div>}
                                    <div><strong>Location:</strong> {selectedInventoryItem.location}</div>
                                </div>
                            </div>
                        )}

                        {/* Form Actions */}
                        <div className="flex justify-end space-x-3 pt-4">
                            <TouchEnhancedButton
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                            >
                                Cancel
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                type="submit"
                                disabled={loading || (!selectedInventoryItem && !formData.name.trim())}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        ➕ Add Item
                                    </>
                                )}
                            </TouchEnhancedButton>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}