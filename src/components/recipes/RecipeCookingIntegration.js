// file: /src/components/recipes/RecipeCookingIntegration.js v1

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import InventoryConsumption from '@/components/inventory/InventoryConsumption';

export default function RecipeCookingIntegration({
                                                     recipe,
                                                     onCookingComplete,
                                                     onClose,
                                                     servingsMultiplier = 1
                                                 }) {
    const { data: session } = useSession();
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [matchedIngredients, setMatchedIngredients] = useState([]);
    const [missingIngredients, setMissingIngredients] = useState([]);
    const [showConsumption, setShowConsumption] = useState(false);
    const [cookingNotes, setCookingNotes] = useState('');

    useEffect(() => {
        if (session?.user?.id && recipe) {
            fetchInventoryAndMatch();
        }
    }, [session?.user?.id, recipe, servingsMultiplier]);

    const fetchInventoryAndMatch = async () => {
        setLoading(true);

        try {
            const response = await fetch('/api/inventory');
            const data = await response.json();

            if (data.success) {
                setInventory(data.inventory);
                matchIngredientsWithInventory(recipe.ingredients, data.inventory);
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    const matchIngredientsWithInventory = (recipeIngredients, inventoryItems) => {
        const matched = [];
        const missing = [];

        recipeIngredients.forEach(ingredient => {
            const adjustedAmount = ingredient.amount ?
                (parseFloat(ingredient.amount) * servingsMultiplier).toString() :
                ingredient.amount;

            // Try to find matching inventory items
            const inventoryMatches = inventoryItems.filter(item =>
                item.name.toLowerCase().includes(ingredient.name.toLowerCase()) ||
                ingredient.name.toLowerCase().includes(item.name.toLowerCase()) ||
                // Check for common name variations
                checkNameVariations(ingredient.name, item.name)
            );

            if (inventoryMatches.length > 0) {
                // Use the best match (could be enhanced with better matching logic)
                const bestMatch = inventoryMatches[0];
                matched.push({
                    recipeIngredient: {
                        ...ingredient,
                        amount: adjustedAmount
                    },
                    inventoryItem: bestMatch,
                    suggested: {
                        amount: adjustedAmount || '1',
                        unit: ingredient.unit || bestMatch.unit,
                        available: bestMatch.quantity,
                        sufficient: !adjustedAmount || parseFloat(adjustedAmount) <= bestMatch.quantity
                    }
                });
            } else {
                missing.push({
                    ...ingredient,
                    amount: adjustedAmount
                });
            }
        });

        setMatchedIngredients(matched);
        setMissingIngredients(missing);
    };

    const checkNameVariations = (recipeName, inventoryName) => {
        // Common ingredient name variations
        const variations = {
            'chicken breast': ['chicken', 'chicken breasts'],
            'ground beef': ['beef', 'ground meat'],
            'onion': ['onions', 'yellow onion'],
            'garlic': ['garlic cloves', 'fresh garlic'],
            'tomato': ['tomatoes', 'fresh tomatoes'],
            'bell pepper': ['peppers', 'bell peppers'],
            // Add more variations as needed
        };

        const recipeLower = recipeName.toLowerCase();
        const inventoryLower = inventoryName.toLowerCase();

        // Check if either name contains common variations
        for (const [key, variants] of Object.entries(variations)) {
            if (recipeLower.includes(key) && variants.some(v => inventoryLower.includes(v))) {
                return true;
            }
            if (inventoryLower.includes(key) && variants.some(v => recipeLower.includes(v))) {
                return true;
            }
        }

        return false;
    };

    const handleStartCooking = () => {
        if (matchedIngredients.length > 0) {
            setShowConsumption(true);
        } else {
            alert('No matching ingredients found in inventory');
        }
    };

    const handleCookingConsumption = async (consumptions) => {
        try {
            const response = await fetch('/api/inventory/consume', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    consumptions: consumptions,
                    mode: 'recipe'
                }),
            });

            const result = await response.json();

            if (result.success) {
                // Log the cooking activity
                await logCookingActivity();

                onCookingComplete?.(result.summary);
                onClose();
            } else {
                throw new Error(result.error || 'Failed to update inventory');
            }
        } catch (error) {
            console.error('Error updating inventory:', error);
            alert('Error updating inventory: ' + error.message);
            throw error;
        }
    };

    const logCookingActivity = async () => {
        try {
            // This could be expanded to log cooking activities in a separate collection
            const activityData = {
                recipeId: recipe._id,
                recipeName: recipe.title,
                servings: recipe.servings * servingsMultiplier,
                ingredientsUsed: matchedIngredients.length,
                ingredientsMissing: missingIngredients.length,
                notes: cookingNotes,
                dateCooked: new Date()
            };

            console.log('Cooking activity logged:', activityData);
            // You could send this to an API endpoint for cooking history tracking
        } catch (error) {
            console.error('Error logging cooking activity:', error);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <p>Checking inventory for recipe ingredients...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (showConsumption) {
        const recipeIngredients = matchedIngredients.map(match => ({
            name: match.recipeIngredient.name,
            amount: match.suggested.amount,
            unit: match.suggested.unit
        }));

        return (
            <InventoryConsumption
                mode="recipe"
                recipeIngredients={recipeIngredients}
                recipeName={recipe.title}
                onConsume={handleCookingConsumption}
                onClose={() => setShowConsumption(false)}
            />
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-blue-50 px-6 py-4 border-b border-blue-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-semibold text-blue-900">
                                👨‍🍳 Ready to Cook: {recipe.title}
                            </h2>
                            <p className="text-sm text-blue-700 mt-1">
                                {servingsMultiplier !== 1 && (
                                    <span>Adjusted for {servingsMultiplier}x servings • </span>
                                )}
                                Check ingredients and update inventory
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-blue-400 hover:text-blue-600 text-2xl font-bold"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                            <div className="text-2xl text-green-600 mb-2">✅</div>
                            <div className="text-lg font-semibold text-green-900">{matchedIngredients.length}</div>
                            <div className="text-sm text-green-700">Available in Inventory</div>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                            <div className="text-2xl text-red-600 mb-2">❌</div>
                            <div className="text-lg font-semibold text-red-900">{missingIngredients.length}</div>
                            <div className="text-sm text-red-700">Missing from Inventory</div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                            <div className="text-2xl text-blue-600 mb-2">📋</div>
                            <div className="text-lg font-semibold text-blue-900">{recipe.ingredients.length}</div>
                            <div className="text-sm text-blue-700">Total Ingredients</div>
                        </div>
                    </div>

                    {/* Available Ingredients */}
                    {matchedIngredients.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                ✅ Available Ingredients ({matchedIngredients.length})
                            </h3>
                            <div className="space-y-3">
                                {matchedIngredients.map((match, index) => (
                                    <div key={index} className={`border rounded-lg p-4 ${
                                        match.suggested.sufficient ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'
                                    }`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-medium text-gray-900">
                                                    {match.recipeIngredient.name}
                                                </h4>
                                                <p className="text-sm text-gray-600">
                                                    Need: {match.recipeIngredient.amount} {match.recipeIngredient.unit}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    Available: {match.suggested.available} {match.inventoryItem.unit}
                                                    <span className="text-gray-500 ml-1">
                                                        ({match.inventoryItem.name})
                                                    </span>
                                                </p>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                match.suggested.sufficient
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {match.suggested.sufficient ? 'Sufficient' : 'Low Stock'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Missing Ingredients */}
                    {missingIngredients.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                ❌ Missing Ingredients ({missingIngredients.length})
                            </h3>
                            <div className="space-y-2">
                                {missingIngredients.map((ingredient, index) => (
                                    <div key={index} className="border border-red-200 bg-red-50 rounded-lg p-3">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="font-medium text-red-900">
                                                    {ingredient.name}
                                                </span>
                                                {ingredient.amount && (
                                                    <span className="text-sm text-red-700 ml-2">
                                                        ({ingredient.amount} {ingredient.unit})
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                                                Not in inventory
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                    💡 <strong>Tip:</strong> You can still proceed with cooking and manually adjust quantities,
                                    or add these items to your shopping list.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Cooking Notes */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cooking Notes (Optional)
                        </label>
                        <textarea
                            value={cookingNotes}
                            onChange={(e) => setCookingNotes(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Add any modifications, substitutions, or notes about this cooking session..."
                        />
                    </div>

                    {/* Recipe Info */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Recipe Details</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="text-gray-600">Prep Time:</span>
                                <div className="font-medium">{recipe.prepTime || 'N/A'} min</div>
                            </div>
                            <div>
                                <span className="text-gray-600">Cook Time:</span>
                                <div className="font-medium">{recipe.cookTime || 'N/A'} min</div>
                            </div>
                            <div>
                                <span className="text-gray-600">Servings:</span>
                                <div className="font-medium">
                                    {recipe.servings ? (recipe.servings * servingsMultiplier) : 'N/A'}
                                </div>
                            </div>
                            <div>
                                <span className="text-gray-600">Difficulty:</span>
                                <div className="font-medium capitalize">{recipe.difficulty || 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                    <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                            {matchedIngredients.length > 0 ? (
                                <span className="text-green-600">
                                    ✅ Ready to cook with {matchedIngredients.length} ingredients from inventory
                                </span>
                            ) : (
                                <span className="text-red-600">
                                    ❌ No ingredients available in inventory
                                </span>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            {missingIngredients.length > 0 && (
                                <button
                                    onClick={() => {
                                        // Could integrate with shopping list here
                                        alert('Shopping list feature coming soon!');
                                    }}
                                    className="px-4 py-2 border border-blue-300 rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100"
                                >
                                    📋 Add to Shopping List
                                </button>
                            )}
                            <button
                                onClick={handleStartCooking}
                                disabled={matchedIngredients.length === 0}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {matchedIngredients.length > 0 ? (
                                    <>
                                        👨‍🍳 Start Cooking & Update Inventory
                                    </>
                                ) : (
                                    <>
                                        ❌ No Ingredients Available
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}