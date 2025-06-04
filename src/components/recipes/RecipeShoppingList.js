// file: /src/components/recipes/RecipeShoppingList.js

'use client';

import { useState } from 'react';
import ShoppingListDisplay from '@/components/shopping/ShoppingListDisplay';

export default function RecipeShoppingList({ recipeId, recipeName, onClose }) {
    const [shoppingList, setShoppingList] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const generateShoppingList = async () => {
        setLoading(true);
        setError(null);

        try {
            console.log(`Generating shopping list for recipe: ${recipeName} (ID: ${recipeId})`);

            const response = await fetch(`/api/shopping/generate?recipeId=${recipeId}`);
            const data = await response.json();

            console.log('Shopping list response:', data);

            if (data.success) {
                setShoppingList(data.shoppingList);

                // Log shopping list details for debugging
                console.log('Generated shopping list:', {
                    recipes: data.shoppingList.recipes,
                    totalItems: data.shoppingList.summary.totalItems,
                    needToBuy: data.shoppingList.summary.needToBuy,
                    alreadyHave: data.shoppingList.summary.alreadyHave
                });

                // TEMPORARY: Log detailed ingredient analysis
                Object.entries(data.shoppingList.items).forEach(([category, items]) => {
                    console.log(`${category}:`, items.map(item => ({
                        name: item.originalName,
                        haveAmount: item.haveAmount,
                        needAmount: item.needAmount,
                        status: item.status,
                        isPantryStaple: item.isPantryStaple
                    })));
                });

                // TEMPORARY: Check if debug info is available
                if (data.debug) {
                    console.log('API Debug Info:', data.debug);
                }
            } else {
                console.error('Shopping list generation failed:', data.error);
                setError(data.error || 'Failed to generate shopping list');
            }
        } catch (err) {
            console.error('Error generating shopping list:', err);
            setError('Failed to generate shopping list');
        } finally {
            setLoading(false);
        }
    };

    if (!shoppingList) {
        return (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
                    <div className="mt-3">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">
                                🛒 Shopping List for "{recipeName}"
                            </h3>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                            >
                                ×
                            </button>
                        </div>

                        <div className="text-center py-8">
                            {loading ? (
                                <div>
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                                    <p className="text-gray-600">Analyzing recipe and inventory...</p>
                                    <p className="text-gray-500 text-sm mt-2">
                                        Checking package sizes and ingredient matches
                                    </p>
                                </div>
                            ) : error ? (
                                <div>
                                    <p className="text-red-600 mb-4">❌ {error}</p>
                                    <button
                                        onClick={generateShoppingList}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-gray-600 mb-4">
                                        Generate a shopping list for the ingredients you need to make "{recipeName}".
                                    </p>
                                    <p className="text-gray-500 text-sm mb-4">
                                        The system will check your inventory and assume standard package sizes
                                        (e.g., 1 box of pasta = 16 oz, 1 bottle of oil = 32 oz)
                                    </p>
                                    <button
                                        onClick={generateShoppingList}
                                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                                    >
                                        🛒 Generate Shopping List
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-start justify-center p-4">
            <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-lg overflow-hidden mt-8">
                {/* Fixed Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-white">
                    <h3 className="text-lg font-medium text-gray-900">
                        🛒 Shopping List for "{recipeName}"
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center"
                    >
                        ×
                    </button>
                </div>

                {/* Package Size Info */}
                <div className="px-6 pt-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-blue-800 text-sm">
                            📦 <strong>Smart Package Matching:</strong> The system assumes standard package sizes
                            (pasta box = 16 oz, oil bottle = 32 oz, etc.) when your inventory shows "items" or "packages".
                        </p>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
                    <div className="p-6 pt-4">
                        <ShoppingListDisplay
                            shoppingList={shoppingList}
                            onClose={onClose}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}