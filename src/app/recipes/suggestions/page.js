// file: /src/app/recipes/suggestions/page.js

'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { redirect } from 'next/navigation';

export default function RecipeSuggestions() {
    const { data: session, status } = useSession();
    const [suggestions, setSuggestions] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [matchThreshold, setMatchThreshold] = useState(0.4); // Lower default threshold
    const [sortBy, setSortBy] = useState('match'); // 'match', 'time', 'difficulty'

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/auth/signin');
        }
    }, [status]);

    useEffect(() => {
        if (session) {
            loadData();
        }
    }, [session]);

    useEffect(() => {
        if (inventory.length > 0 && recipes.length > 0) {
            generateSuggestions();
        }
    }, [inventory, recipes, matchThreshold]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load inventory and recipes in parallel
            const [inventoryResponse, recipesResponse] = await Promise.all([
                fetch('/api/inventory'),
                fetch('/api/recipes')
            ]);

            const inventoryData = await inventoryResponse.json();
            const recipesData = await recipesResponse.json();

            if (inventoryData.success) {
                setInventory(inventoryData.inventory);
            }

            if (recipesData.success) {
                setRecipes(recipesData.recipes);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateSuggestions = () => {
        const suggestions = recipes
            .map(recipe => {
                const analysis = analyzeRecipe(recipe, inventory);
                return {
                    ...recipe,
                    analysis
                };
            })
            .filter(recipe => recipe.analysis.matchPercentage >= matchThreshold)
            .sort((a, b) => {
                switch (sortBy) {
                    case 'match':
                        return b.analysis.matchPercentage - a.analysis.matchPercentage;
                    case 'time':
                        const timeA = (a.prepTime || 0) + (a.cookTime || 0);
                        const timeB = (b.prepTime || 0) + (b.cookTime || 0);
                        return timeA - timeB;
                    case 'difficulty':
                        const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
                        return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
                    default:
                        return b.analysis.matchPercentage - a.analysis.matchPercentage;
                }
            });

        setSuggestions(suggestions);
    };

    const analyzeRecipe = (recipe, inventory) => {
        if (!recipe.ingredients || recipe.ingredients.length === 0) {
            return {
                matchPercentage: 0,
                availableIngredients: [],
                missingIngredients: recipe.ingredients || [],
                canMake: false
            };
        }

        // Basic pantry staples that most people have
        const pantryStaples = ['salt', 'pepper', 'black pepper', 'garlic powder', 'onion powder', 'oil', 'butter'];

        const availableIngredients = [];
        const missingIngredients = [];

        recipe.ingredients.forEach(recipeIngredient => {
            const found = findIngredientInInventory(recipeIngredient, inventory);

            // Check if it's a basic pantry staple
            const isPantryStaple = pantryStaples.some(staple =>
                recipeIngredient.name.toLowerCase().includes(staple)
            );

            if (found) {
                availableIngredients.push({
                    ...recipeIngredient,
                    inventoryItem: found
                });
            } else if (isPantryStaple) {
                // Assume pantry staples are available
                availableIngredients.push({
                    ...recipeIngredient,
                    inventoryItem: { name: `${recipeIngredient.name} (pantry staple)`, category: 'pantry' },
                    isPantryStaple: true
                });
            } else {
                missingIngredients.push(recipeIngredient);
            }
        });

        const totalIngredients = recipe.ingredients.length;
        const optionalCount = recipe.ingredients.filter(ing => ing.optional).length;
        const requiredIngredients = totalIngredients - optionalCount;
        const availableRequired = availableIngredients.filter(ing => !ing.optional).length;

        // Calculate match percentage
        const matchPercentage = totalIngredients > 0 ?
            (availableIngredients.length / totalIngredients) : 0;

        // Can make if all required ingredients are available
        const canMake = availableRequired >= requiredIngredients;

        console.log(`Recipe "${recipe.title}": ${availableIngredients.length}/${totalIngredients} ingredients (${Math.round(matchPercentage * 100)}%)`);

        return {
            matchPercentage,
            availableIngredients,
            missingIngredients,
            canMake,
            requiredMissing: missingIngredients.filter(ing => !ing.optional).length
        };
    };

    const findIngredientInInventory = (recipeIngredient, inventory) => {
        const recipeName = recipeIngredient.name.toLowerCase().trim();

        console.log(`Looking for recipe ingredient: "${recipeName}"`);
        console.log('Available inventory:', inventory.map(item => ({ name: item.name, category: item.category })));

        // Direct name match
        let found = inventory.find(item =>
            item.name.toLowerCase().trim() === recipeName
        );

        if (found) {
            console.log(`✅ Direct match found: ${found.name}`);
            return found;
        }

        // Partial name match (contains)
        found = inventory.find(item =>
            item.name.toLowerCase().includes(recipeName) ||
            recipeName.includes(item.name.toLowerCase())
        );

        if (found) {
            console.log(`✅ Partial match found: ${found.name}`);
            return found;
        }

        // Enhanced keyword matching for common ingredient variations
        const ingredientVariations = {
            'pasta': ['penne', 'spaghetti', 'macaroni', 'fettuccine', 'rigatoni', 'fusilli', 'linguine', 'angel hair', 'bow tie', 'rotini'],
            'olive oil': ['extra virgin olive oil', 'virgin olive oil', 'light olive oil', 'pure olive oil', 'evoo'],
            'garlic': ['garlic cloves', 'fresh garlic', 'garlic bulb', 'minced garlic'],
            'onion': ['yellow onion', 'white onion', 'red onion', 'sweet onion'],
            'tomato': ['roma tomato', 'cherry tomato', 'grape tomato', 'beefsteak tomato', 'diced tomato', 'crushed tomato'],
            'cheese': ['cheddar', 'mozzarella', 'parmesan', 'swiss', 'american cheese'],
            'milk': ['whole milk', '2% milk', 'skim milk', 'low fat milk'],
            'butter': ['unsalted butter', 'salted butter', 'sweet butter'],
            'flour': ['all purpose flour', 'bread flour', 'cake flour', 'whole wheat flour'],
            'sugar': ['white sugar', 'granulated sugar', 'brown sugar', 'raw sugar'],
            'salt': ['table salt', 'sea salt', 'kosher salt', 'iodized salt'],
            'pepper': ['black pepper', 'white pepper', 'ground pepper', 'cracked pepper']
        };

        // Check if recipe ingredient matches any variation
        for (const [baseIngredient, variations] of Object.entries(ingredientVariations)) {
            if (recipeName.includes(baseIngredient) || variations.some(v => recipeName.includes(v))) {
                found = inventory.find(item => {
                    const itemName = item.name.toLowerCase();
                    return variations.some(variation => itemName.includes(variation)) ||
                        itemName.includes(baseIngredient) ||
                        baseIngredient.includes(itemName);
                });

                if (found) {
                    console.log(`✅ Variation match found: ${found.name} matches ${recipeName}`);
                    return found;
                }
            }
        }

        // Check alternatives if they exist
        if (recipeIngredient.alternatives) {
            for (const alternative of recipeIngredient.alternatives) {
                found = inventory.find(item =>
                    item.name.toLowerCase().includes(alternative.toLowerCase()) ||
                    alternative.toLowerCase().includes(item.name.toLowerCase())
                );
                if (found) {
                    console.log(`✅ Alternative match found: ${found.name}`);
                    return found;
                }
            }
        }

        // Fuzzy matching - check for similar words
        found = inventory.find(item => {
            const itemWords = item.name.toLowerCase().split(/\s+/);
            const recipeWords = recipeName.split(/\s+/);

            // If any word from recipe matches any word from inventory item
            return recipeWords.some(recipeWord =>
                itemWords.some(itemWord =>
                    itemWord.includes(recipeWord) || recipeWord.includes(itemWord)
                )
            );
        });

        if (found) {
            console.log(`✅ Fuzzy match found: ${found.name}`);
            return found;
        }

        console.log(`❌ No match found for: ${recipeName}`);
        return null;
    };

    const getMatchColor = (percentage) => {
        if (percentage >= 0.9) return 'text-green-600 bg-green-100';
        if (percentage >= 0.7) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    const getDifficultyIcon = (difficulty) => {
        switch (difficulty) {
            case 'easy': return '🟢';
            case 'medium': return '🟡';
            case 'hard': return '🔴';
            default: return '⚪';
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">What Can I Make?</h1>
                        <p className="text-gray-600">Recipe suggestions based on your current inventory</p>
                    </div>
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-100"
                    >
                        {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
                    </button>
                </div>

                {/* Stats and Controls */}
                <div className="bg-white shadow rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div>
                            <div className="text-sm font-medium text-gray-700">Inventory Items</div>
                            <div className="text-2xl font-bold text-indigo-600">{inventory.length}</div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-700">Total Recipes</div>
                            <div className="text-2xl font-bold text-green-600">{recipes.length}</div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Minimum Match: {Math.round(matchThreshold * 100)}%
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="1"
                                step="0.1"
                                value={matchThreshold}
                                onChange={(e) => setMatchThreshold(parseFloat(e.target.value))}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                <option value="match">Best Match</option>
                                <option value="time">Quickest</option>
                                <option value="difficulty">Easiest</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Recipe Suggestions */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                            Recipe Suggestions ({suggestions.length})
                        </h3>

                        {loading ? (
                            <div className="text-center py-8">
                                <div className="text-gray-500">Analyzing your inventory...</div>
                            </div>
                        ) : inventory.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="text-gray-500 mb-4">No inventory items found</div>
                                <a
                                    href="/inventory"
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
                                >
                                    Add inventory items first
                                </a>
                            </div>
                        ) : recipes.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="text-gray-500 mb-4">No recipes found</div>
                                <a
                                    href="/recipes"
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
                                >
                                    Add recipes first
                                </a>
                            </div>
                        ) : suggestions.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="text-gray-500 mb-4">
                                    No recipes match your current inventory at {Math.round(matchThreshold * 100)}% threshold
                                </div>
                                <button
                                    onClick={() => setMatchThreshold(0.5)}
                                    className="text-indigo-600 hover:text-indigo-900 text-sm"
                                >
                                    Try lowering the match threshold
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {suggestions.map((recipe) => (
                                    <div key={recipe._id} className="border border-gray-200 rounded-lg p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1">
                                                <h4 className="text-xl font-semibold text-gray-900">{recipe.title}</h4>
                                                {recipe.description && (
                                                    <p className="text-gray-600 mt-1">{recipe.description}</p>
                                                )}
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getMatchColor(recipe.analysis.matchPercentage)}`}>
                                                {Math.round(recipe.analysis.matchPercentage * 100)}% Match
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {/* Recipe Info */}
                                            <div>
                                                <h5 className="font-medium text-gray-900 mb-2">Recipe Details</h5>
                                                <div className="space-y-1 text-sm text-gray-600">
                                                    <div className="flex items-center space-x-2">
                                                        <span>{getDifficultyIcon(recipe.difficulty)}</span>
                                                        <span className="capitalize">{recipe.difficulty}</span>
                                                    </div>
                                                    {recipe.prepTime && (
                                                        <div>Prep: {recipe.prepTime} minutes</div>
                                                    )}
                                                    {recipe.cookTime && (
                                                        <div>Cook: {recipe.cookTime} minutes</div>
                                                    )}
                                                    {recipe.servings && (
                                                        <div>Serves: {recipe.servings}</div>
                                                    )}
                                                    {recipe.source && (
                                                        <div className="text-xs">Source: {recipe.source}</div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Available Ingredients */}
                                            <div>
                                                <h5 className="font-medium text-green-700 mb-2">
                                                    ✅ You Have ({recipe.analysis.availableIngredients.length})
                                                </h5>
                                                <div className="space-y-1 text-sm">
                                                    {recipe.analysis.availableIngredients.slice(0, 5).map((ingredient, index) => (
                                                        <div key={index} className="text-green-600">
                                                            • {ingredient.amount} {ingredient.unit} {ingredient.name}
                                                            {ingredient.optional && <span className="text-gray-500"> (optional)</span>}
                                                        </div>
                                                    ))}
                                                    {recipe.analysis.availableIngredients.length > 5 && (
                                                        <div className="text-green-600 text-xs">
                                                            +{recipe.analysis.availableIngredients.length - 5} more available
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Missing Ingredients */}
                                            <div>
                                                <h5 className="font-medium text-red-700 mb-2">
                                                    ❌ You Need ({recipe.analysis.missingIngredients.length})
                                                </h5>
                                                <div className="space-y-1 text-sm">
                                                    {recipe.analysis.missingIngredients.slice(0, 5).map((ingredient, index) => (
                                                        <div key={index} className="text-red-600">
                                                            • {ingredient.amount} {ingredient.unit} {ingredient.name}
                                                            {ingredient.optional && <span className="text-gray-500"> (optional)</span>}
                                                        </div>
                                                    ))}
                                                    {recipe.analysis.missingIngredients.length > 5 && (
                                                        <div className="text-red-600 text-xs">
                                                            +{recipe.analysis.missingIngredients.length - 5} more needed
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="mt-4 flex justify-between items-center">
                                            <div className="text-sm text-gray-500">
                                                {recipe.analysis.canMake ? (
                                                    <span className="text-green-600 font-medium">
                            🎉 You can make this recipe!
                          </span>
                                                ) : recipe.analysis.requiredMissing === 1 ? (
                                                    <span className="text-yellow-600 font-medium">
                            Missing only 1 required ingredient
                          </span>
                                                ) : (
                                                    <span className="text-red-600">
                            Missing {recipe.analysis.requiredMissing} required ingredients
                          </span>
                                                )}
                                            </div>
                                            <div className="flex space-x-2">
                                                <a
                                                    href={`/recipes?id=${recipe._id}`}
                                                    className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                                                >
                                                    View Recipe
                                                </a>
                                                {!recipe.analysis.canMake && (
                                                    <button
                                                        onClick={() => {/* TODO: Generate shopping list */}}
                                                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                                                    >
                                                        Shopping List
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}