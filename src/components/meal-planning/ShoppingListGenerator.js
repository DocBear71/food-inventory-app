// file: /src/components/meal-planning/ShoppingListGenerator.js v7

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const scrollingStyles = {
    modal: {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '50',
        padding: '16px'
    },
    container: {
        backgroundColor: 'white',
        borderRadius: '8px',
        maxWidth: '1024px',
        width: '100%',
        height: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    },
    content: {
        flex: '1',
        overflowY: 'auto',
        padding: '16px'
    }
};

// Then replace your return statement's outer divs with:

return (
    <div style={scrollingStyles.modal}>
        <div style={scrollingStyles.container}>
            {/* Your existing header content */}

            {/* Content with forced scrolling */}
            <div style={scrollingStyles.content}>
                {/* All your existing content here */}
            </div>

            {/* Your existing footer */}
        </div>
    </div>
);

export default function ShoppingListGenerator({ mealPlanId, mealPlanName, onClose }) {
    const { data: session } = useSession();
    const [shoppingList, setShoppingList] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // all, needed, inventory
    const [sortBy, setSortBy] = useState('category'); // category, name, recipes

    console.log('ShoppingListGenerator props:', { mealPlanId, mealPlanName });

    // Generate shopping list
    const generateShoppingList = async () => {
        setLoading(true);
        setError(null);

        try {
            console.log('=== Generating shopping list ===');
            console.log('Meal plan ID:', mealPlanId);

            const response = await fetch(`/api/meal-plans/${mealPlanId}/shopping-list`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    options: {
                        checkInventory: true,
                        combineIngredients: true
                    }
                })
            });

            console.log('Shopping list API response status:', response.status);
            const data = await response.json();
            console.log('Shopping list API response data:', data);

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate shopping list');
            }

            console.log('Shopping list generated successfully:', data);
            setShoppingList(data.shoppingList);

        } catch (err) {
            console.error('Error generating shopping list:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Update item (mark as purchased, etc.)
    const updateItem = async (ingredientName, updates) => {
        try {
            const response = await fetch(`/api/meal-plans/${mealPlanId}/shopping-list`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    updates: [{ ingredientName, ...updates }]
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update shopping list');
            }

            // Update local state
            setShoppingList(prev => ({
                ...prev,
                items: prev.items.map(item =>
                    item.ingredient === ingredientName
                        ? { ...item, ...updates }
                        : item
                )
            }));

        } catch (err) {
            console.error('Error updating item:', err);
            setError(err.message);
        }
    };

    // Filter and sort items
    const getFilteredItems = () => {
        if (!shoppingList?.items) return [];

        let filtered = shoppingList.items;

        // Apply filter
        switch (filter) {
            case 'needed':
                filtered = filtered.filter(item => !item.inInventory && !item.purchased);
                break;
            case 'inventory':
                filtered = filtered.filter(item => item.inInventory);
                break;
            case 'purchased':
                filtered = filtered.filter(item => item.purchased);
                break;
            default:
                // 'all' - no filtering
                break;
        }

        // Apply sorting
        switch (sortBy) {
            case 'name':
                filtered.sort((a, b) => a.ingredient.localeCompare(b.ingredient));
                break;
            case 'recipes':
                filtered.sort((a, b) => a.recipes.join(', ').localeCompare(b.recipes.join(', ')));
                break;
            default:
                // 'category' - already sorted by category in API
                break;
        }

        return filtered;
    };

    // Group items by category for display
    const getGroupedItems = () => {
        const filtered = getFilteredItems();
        const grouped = {};

        filtered.forEach(item => {
            const category = item.category || 'other';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(item);
        });

        return grouped;
    };

    // Get category display name
    const getCategoryName = (category) => {
        const names = {
            produce: '🥬 Produce',
            meat: '🥩 Meat & Seafood',
            dairy: '🥛 Dairy & Eggs',
            pantry: '🥫 Pantry & Dry Goods',
            frozen: '🧊 Frozen Foods',
            bakery: '🍞 Bakery',
            other: '📦 Other Items'
        };
        return names[category] || `📦 ${category}`;
    };

    // Format amount display
    const formatAmount = (item) => {
        let display = item.amount || '';

        // Add alternative amounts if any
        if (item.alternativeAmounts && item.alternativeAmounts.length > 0) {
            const alternatives = item.alternativeAmounts
                .map(alt => `${alt.amount} ${alt.unit}`)
                .join(', ');
            display += ` (also: ${alternatives})`;
        }

        return display;
    };

    const filteredItems = getFilteredItems();
    const groupedItems = getGroupedItems();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex-none p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                🛒 Shopping List
                            </h2>
                            <p className="text-gray-600 mt-1">
                                {mealPlanName}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                        >
                            ×
                        </button>
                    </div>

                    {/* Stats */}
                    {shoppingList?.stats && (
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-blue-50 p-3 rounded-lg text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                    {shoppingList.stats.totalItems}
                                </div>
                                <div className="text-sm text-blue-800">Total Items</div>
                            </div>
                            <div className="bg-green-50 p-3 rounded-lg text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    {shoppingList.stats.inInventory}
                                </div>
                                <div className="text-sm text-green-800">In Inventory</div>
                            </div>
                            <div className="bg-orange-50 p-3 rounded-lg text-center">
                                <div className="text-2xl font-bold text-orange-600">
                                    {shoppingList.stats.needToBuy}
                                </div>
                                <div className="text-sm text-orange-800">Need to Buy</div>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-lg text-center">
                                <div className="text-2xl font-bold text-purple-600">
                                    {shoppingList.stats.categories}
                                </div>
                                <div className="text-sm text-purple-800">Categories</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Controls */}
                {shoppingList && (
                    <div className="flex-none p-4 border-b border-gray-200 bg-gray-50">
                        <div className="flex flex-wrap gap-4 items-center">
                            {/* Filter */}
                            <div className="flex items-center space-x-2">
                                <label className="text-sm font-medium text-gray-700">Filter:</label>
                                <select
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                                >
                                    <option value="all">All Items ({shoppingList.stats.totalItems})</option>
                                    <option value="needed">Need to Buy ({shoppingList.stats.needToBuy})</option>
                                    <option value="inventory">In Inventory ({shoppingList.stats.inInventory})</option>
                                    <option value="purchased">Purchased</option>
                                </select>
                            </div>

                            {/* Sort */}
                            <div className="flex items-center space-x-2">
                                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                                >
                                    <option value="category">Category</option>
                                    <option value="name">Name</option>
                                    <option value="recipes">Recipe</option>
                                </select>
                            </div>

                            <div className="text-sm text-gray-600">
                                Showing {filteredItems.length} items
                            </div>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                    {loading && (
                        <div className="p-8 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            <p className="mt-2 text-gray-600">Generating smart shopping list...</p>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="text-red-800 font-medium">Error generating shopping list</div>
                            <div className="text-red-600 text-sm mt-1">{error}</div>
                            <button
                                onClick={generateShoppingList}
                                className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {!shoppingList && !loading && !error && (
                        <div className="p-8 text-center">
                            <div className="text-6xl mb-4">🛒</div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Ready to Generate Shopping List
                            </h3>
                            <p className="text-gray-600 mb-6">
                                We'll analyze your meal plan, combine ingredients, and check your inventory
                                to create a smart shopping list organized by store sections.
                            </p>
                            <button
                                onClick={generateShoppingList}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                Generate Shopping List
                            </button>
                        </div>
                    )}

                    {shoppingList && (
                        <div className="p-4 space-y-6 pb-20">
                            {Object.keys(groupedItems).length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-500">No items match your current filter.</p>
                                </div>
                            ) : (
                                Object.entries(groupedItems).map(([category, items]) => (
                                    <div key={category}>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-3 sticky top-0 bg-white py-2">
                                            {getCategoryName(category)} ({items.length})
                                        </h3>

                                        <div className="space-y-2">
                                            {items.map((item, index) => (
                                                <div
                                                    key={`${item.ingredient}-${index}`}
                                                    className={`p-3 border rounded-lg ${
                                                        item.purchased
                                                            ? 'bg-green-50 border-green-200'
                                                            : item.inInventory
                                                                ? 'bg-blue-50 border-blue-200'
                                                                : 'bg-white border-gray-200'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center space-x-3">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={item.purchased || false}
                                                                    onChange={(e) =>
                                                                        updateItem(item.ingredient, {
                                                                            purchased: e.target.checked
                                                                        })
                                                                    }
                                                                    className="h-5 w-5 text-indigo-600 rounded"
                                                                />

                                                                <div className="flex-1">
                                                                    <div className={`font-medium ${
                                                                        item.purchased ? 'line-through text-gray-500' : 'text-gray-900'
                                                                    }`}>
                                                                        {item.ingredient}
                                                                        {item.optional && (
                                                                            <span className="text-gray-400 text-sm ml-2">(optional)</span>
                                                                        )}
                                                                    </div>

                                                                    <div className="text-sm text-gray-600 mt-1">
                                                                        {formatAmount(item)}
                                                                    </div>

                                                                    <div className="text-xs text-gray-500 mt-1">
                                                                        Used in: {item.recipes.join(', ')}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center space-x-2 ml-4">
                                                            {item.inInventory && (
                                                                <div className="flex items-center text-blue-600 text-xs">
                                                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                    </svg>
                                                                    In Inventory
                                                                </div>
                                                            )}

                                                            {item.purchased && (
                                                                <div className="flex items-center text-green-600 text-xs">
                                                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                    </svg>
                                                                    Purchased
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {item.inventoryItem && (
                                                        <div className="mt-2 p-2 bg-blue-100 rounded text-sm text-blue-800">
                                                            <strong>In your inventory:</strong> {item.inventoryItem.quantity} {item.inventoryItem.unit}
                                                            {item.inventoryItem.location && ` (${item.inventoryItem.location})`}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {shoppingList && (
                    <div className="flex-none p-4 border-t border-gray-200 bg-gray-50 text-center">
                        <p className="text-sm text-gray-600">
                            Shopping list generated on {new Date(shoppingList.generatedAt).toLocaleDateString()}
                        </p>
                        <button
                            onClick={generateShoppingList}
                            className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm"
                        >
                            Regenerate Shopping List
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}