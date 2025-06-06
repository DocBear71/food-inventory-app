// file: /src/app/shopping/page.js v3

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ShoppingListDisplay from '@/components/shopping/ShoppingListDisplay';
import { redirect } from 'next/navigation';

export default function ShoppingList() {
    const { data: session, status } = useSession();
    const [recipes, setRecipes] = useState([]);
    const [selectedRecipes, setSelectedRecipes] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [shoppingList, setShoppingList] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // All useEffect hooks must be called before any conditional returns
    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/auth/signin');
        }
    }, [status]);

    useEffect(() => {
        if (session) {
            fetchRecipes();
            fetchInventory();
        }
    }, [session]);

    // Early returns after all hooks
    if (status === 'loading') {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!session) {
        redirect('/auth/signin');
        return null;
    }

    const fetchRecipes = async () => {
        try {
            const response = await fetch('/api/recipes');
            const data = await response.json();
            if (data.success) {
                setRecipes(data.recipes);
            }
        } catch (error) {
            console.error('Error fetching recipes:', error);
        }
    };

    const fetchInventory = async () => {
        try {
            const response = await fetch('/api/inventory');
            const data = await response.json();
            if (data.success) {
                setInventory(data.inventory);
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleRecipeSelection = (recipeId) => {
        setSelectedRecipes(prev =>
            prev.includes(recipeId)
                ? prev.filter(id => id !== recipeId)
                : [...prev, recipeId]
        );
    };

    // NEW: Clear all selected recipes
    const clearAllSelections = () => {
        setSelectedRecipes([]);
    };

    // NEW: Select all recipes
    const selectAllRecipes = () => {
        setSelectedRecipes(filteredRecipes.map(recipe => recipe._id));
    };

    const generateShoppingList = async () => {
        if (selectedRecipes.length === 0) {
            alert('Please select at least one recipe');
            return;
        }

        setIsGenerating(true);
        console.log('Generating shopping list for recipes:', selectedRecipes);

        try {
            const response = await fetch('/api/shopping/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipeIds: selectedRecipes,
                }),
            });

            const data = await response.json();
            console.log('Shopping list response:', data);

            if (data.success) {
                setShoppingList(data.shoppingList);
                // DON'T clear selectedRecipes here - keep them selected
                console.log('Shopping list generated successfully');
            } else {
                alert('Error generating shopping list: ' + data.error);
            }
        } catch (error) {
            console.error('Error generating shopping list:', error);
            alert('Error generating shopping list');
        } finally {
            setIsGenerating(false);
        }
    };

    // REFRESH FUNCTION - Regenerates shopping list with current selections
    const refreshShoppingList = async () => {
        if (selectedRecipes.length === 0) {
            return;
        }

        setIsGenerating(true);
        console.log('Refreshing shopping list for recipes:', selectedRecipes);

        try {
            const response = await fetch('/api/shopping/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipeIds: selectedRecipes,
                }),
            });

            const data = await response.json();
            console.log('Refreshed shopping list response:', data);

            if (data.success) {
                setShoppingList(data.shoppingList);
                console.log('Shopping list refreshed successfully');
            } else {
                alert('Error refreshing shopping list: ' + data.error);
            }
        } catch (error) {
            console.error('Error refreshing shopping list:', error);
            alert('Error refreshing shopping list');
        } finally {
            setIsGenerating(false);
        }
    };

    const filteredRecipes = recipes.filter(recipe =>
        recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const clearShoppingList = () => {
        setShoppingList(null);
        // Keep selectedRecipes - don't clear them when closing shopping list
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-lg">Loading recipes and inventory...</div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        🛒 Shopping List Generator
                    </h1>
                    <p className="text-gray-600">
                        Select recipes you want to make and generate a shopping list for missing ingredients
                    </p>
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="text-sm text-blue-800">
                            <strong>📊 Your Current Inventory:</strong> {inventory.length} items |
                            <strong className="ml-2">🍳 Available Recipes:</strong> {recipes.length} recipes
                        </div>
                    </div>
                </div>

                {!shoppingList ? (
                    <>
                        {/* Recipe Selection */}
                        <div className="bg-white shadow rounded-lg p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold">Select Recipes to Cook</h2>
                                <div className="text-sm text-gray-600">
                                    {selectedRecipes.length} recipe{selectedRecipes.length !== 1 ? 's' : ''} selected
                                </div>
                            </div>

                            {/* Search */}
                            <div className="mb-4">
                                <input
                                    type="text"
                                    placeholder="Search recipes by name or tag..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            {/* Selection Controls */}
                            <div className="mb-4 flex gap-2 flex-wrap">
                                <button
                                    onClick={selectAllRecipes}
                                    disabled={filteredRecipes.length === 0}
                                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Select All ({filteredRecipes.length})
                                </button>
                                <button
                                    onClick={clearAllSelections}
                                    disabled={selectedRecipes.length === 0}
                                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Clear All ({selectedRecipes.length})
                                </button>
                                {selectedRecipes.length > 0 && (
                                    <div className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md">
                                        ✓ {selectedRecipes.length} recipe{selectedRecipes.length !== 1 ? 's' : ''} ready for shopping list
                                    </div>
                                )}
                            </div>

                            {/* Recipe List */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                                {filteredRecipes.map(recipe => (
                                    <div
                                        key={recipe._id}
                                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                            selectedRecipes.includes(recipe._id)
                                                ? 'border-indigo-500 bg-indigo-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                        onClick={() => toggleRecipeSelection(recipe._id)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="font-medium text-gray-900 text-sm mb-1">
                                                    {recipe.title}
                                                </h3>
                                                <div className="text-xs text-gray-500 space-y-1">
                                                    <div>🍽️ Serves {recipe.servings}</div>
                                                    <div>⏱️ {(recipe.prepTime || 0) + (recipe.cookTime || 0)} min total</div>
                                                    <div>📝 {recipe.ingredients?.length || 0} ingredients</div>
                                                </div>
                                                {recipe.tags && recipe.tags.length > 0 && (
                                                    <div className="mt-2">
                                                        {recipe.tags.slice(0, 2).map(tag => (
                                                            <span
                                                                key={tag}
                                                                className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded mr-1"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="ml-2">
                                                {selectedRecipes.includes(recipe._id) ? (
                                                    <div className="w-5 h-5 bg-indigo-600 text-white rounded flex items-center justify-center">
                                                        ✓
                                                    </div>
                                                ) : (
                                                    <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {filteredRecipes.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    {searchTerm ? 'No recipes found matching your search.' : 'No recipes available. Add some recipes first!'}
                                </div>
                            )}

                            {/* Generate Button */}
                            <div className="mt-6 flex justify-center">
                                <button
                                    onClick={generateShoppingList}
                                    disabled={selectedRecipes.length === 0 || isGenerating}
                                    className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium"
                                >
                                    {isGenerating ? (
                                        <>
                                            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Generating List...
                                        </>
                                    ) : (
                                        `🛒 Generate Shopping List (${selectedRecipes.length} recipes)`
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    /* Shopping List Display WITH REFRESH FUNCTION AND CLEAR BUTTON */
                    <div className="space-y-4">
                        {/* Action Bar Above Shopping List */}
                        <div className="bg-white shadow rounded-lg p-4">
                            <div className="flex justify-between items-center">
                                <div className="text-sm text-gray-600">
                                    Shopping list generated from {selectedRecipes.length} recipe{selectedRecipes.length !== 1 ? 's' : ''}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={clearAllSelections}
                                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                                    >
                                        🗑️ Clear All Selections
                                    </button>
                                    <button
                                        onClick={clearShoppingList}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                                    >
                                        📝 Select Different Recipes
                                    </button>
                                </div>
                            </div>
                        </div>

                        <ShoppingListDisplay
                            shoppingList={shoppingList}
                            onClose={clearShoppingList}
                            onRefresh={refreshShoppingList}
                        />
                    </div>
                )}

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-blue-900 mb-2">📋 How to Use Shopping Lists</h3>
                    <ul className="text-blue-800 space-y-1 text-sm">
                        <li>1. Select one or more recipes you want to cook</li>
                        <li>2. Use "Select All" or "Clear All" to quickly manage selections</li>
                        <li>3. Click "Generate Shopping List" to analyze missing ingredients</li>
                        <li>4. The system compares recipe needs with your current inventory</li>
                        <li>5. Shopping list shows only what you need to buy</li>
                        <li>6. Items are organized by store category for easy shopping</li>
                        <li>7. Use the Refresh button to update the list with latest inventory changes</li>
                        <li>8. Share via email, print, or save the list to take to the store</li>
                        <li>9. Use "Clear All Selections" to start over with different recipes</li>
                    </ul>
                </div>
            </div>
        </DashboardLayout>
    );
}