// file: /src/app/recipes/suggestions/page.js v2

'use client';

import {useSession} from 'next-auth/react';
import {useEffect, useState} from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import RecipeShoppingList from '@/components/recipes/RecipeShoppingList';
import {redirect} from 'next/navigation';

export default function RecipeSuggestions() {
    const {data: session, status} = useSession();
    const [suggestions, setSuggestions] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [matchThreshold, setMatchThreshold] = useState(0.4);
    const [sortBy, setSortBy] = useState('match');
    const [showShoppingList, setShowShoppingList] = useState(null);
    const [debugMode, setDebugMode] = useState(false); // For debugging matches

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
            const [inventoryResponse, recipesResponse] = await Promise.all([
                fetch('/api/inventory'),
                fetch('/api/recipes')
            ]);

            const inventoryData = await inventoryResponse.json();
            const recipesData = await recipesResponse.json();

            if (inventoryData.success) {
                setInventory(inventoryData.inventory);
                console.log('Loaded inventory items:', inventoryData.inventory.map(item => ({
                    name: item.name,
                    category: item.category,
                    quantity: item.quantity
                })));
            }

            if (recipesData.success) {
                setRecipes(recipesData.recipes);
                console.log('Loaded recipes:', recipesData.recipes.map(r => ({
                    title: r.title,
                    ingredientCount: r.ingredients?.length || 0
                })));
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateSuggestions = () => {
        console.log('=== GENERATING SUGGESTIONS ===');
        console.log('Inventory count:', inventory.length);
        console.log('Recipe count:', recipes.length);
        console.log('Match threshold:', matchThreshold);

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
                        const difficultyOrder = {easy: 1, medium: 2, hard: 3};
                        return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
                    default:
                        return b.analysis.matchPercentage - a.analysis.matchPercentage;
                }
            });

        console.log('Generated suggestions:', suggestions.length);
        setSuggestions(suggestions);
    };

    const analyzeRecipe = (recipe, inventory) => {
        console.log(`\n=== ANALYZING RECIPE: ${recipe.title} ===`);

        if (!recipe.ingredients || recipe.ingredients.length === 0) {
            console.log('Recipe has no ingredients');
            return {
                matchPercentage: 0,
                availableIngredients: [],
                missingIngredients: [],
                canMake: false,
                matches: []
            };
        }

        console.log('Recipe ingredients:', recipe.ingredients.map(ing => ing.name));

        const availableIngredients = [];
        const missingIngredients = [];
        const matches = []; // For debugging

        recipe.ingredients.forEach(recipeIngredient => {
            const matchResult = findIngredientInInventory(recipeIngredient, inventory);

            if (matchResult.found) {
                availableIngredients.push({
                    ...recipeIngredient,
                    inventoryItem: matchResult.inventoryItem,
                    matchType: matchResult.matchType
                });
                matches.push({
                    recipeIngredient: recipeIngredient.name,
                    inventoryItem: matchResult.inventoryItem.name,
                    matchType: matchResult.matchType
                });
            } else {
                missingIngredients.push(recipeIngredient);
            }
        });

        const totalIngredients = recipe.ingredients.length;
        const optionalCount = recipe.ingredients.filter(ing => ing.optional).length;
        const requiredIngredients = totalIngredients - optionalCount;
        const availableRequired = availableIngredients.filter(ing => !ing.optional).length;

        const matchPercentage = totalIngredients > 0 ? (availableIngredients.length / totalIngredients) : 0;
        const canMake = availableRequired >= requiredIngredients;

        console.log(`Results: ${availableIngredients.length}/${totalIngredients} ingredients (${Math.round(matchPercentage * 100)}%)`);
        console.log('Matches found:', matches);

        return {
            matchPercentage,
            availableIngredients,
            missingIngredients,
            canMake,
            requiredMissing: missingIngredients.filter(ing => !ing.optional).length,
            matches // For debugging
        };
    };

    // Normalize ingredient names for better comparison
    const normalizeIngredientName = (name) => {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s]/g, ' ')  // Replace punctuation with spaces
            .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
            .replace(/\b(fresh|dried|minced|chopped|sliced|diced|whole|ground|crushed|grated|shredded|cooked|raw)\b/g, '')
            .replace(/\b(small|medium|large|extra)\b/g, '')
            .replace(/\b(can|jar|bottle|bag|box|package|container)\b/g, '')
            .replace(/\b(of|the|and|or)\b/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    };

    // Much more conservative ingredient matching
    const findIngredientInInventory = (recipeIngredient, inventory) => {
        const recipeName = normalizeIngredientName(recipeIngredient.name);

        console.log(`\n--- Looking for: "${recipeIngredient.name}" (normalized: "${recipeName}") ---`);

        // 1. EXACT MATCH (highest priority)
        for (const item of inventory) {
            const itemName = normalizeIngredientName(item.name);
            if (itemName === recipeName && recipeName.length > 2) {
                console.log(`✅ EXACT MATCH: "${item.name}"`);
                return {
                    found: true,
                    inventoryItem: item,
                    matchType: 'exact'
                };
            }
        }

        // 2. EXACT INGREDIENT VARIATIONS (very specific)
        const specificVariations = {
            // Only very specific, well-defined variations
            'olive oil': ['extra virgin olive oil', 'virgin olive oil', 'evoo'],
            'garlic': ['garlic cloves', 'garlic bulb'],
            'onion': ['yellow onion', 'white onion', 'red onion', 'sweet onion'],
            'tomato': ['roma tomato', 'cherry tomato', 'grape tomato', 'beefsteak tomato'],
            'cheese': ['cheddar cheese', 'mozzarella cheese', 'parmesan cheese'],
            'milk': ['whole milk', '2% milk', 'skim milk', '1% milk'],
            'butter': ['unsalted butter', 'salted butter'],
            'flour': ['all purpose flour', 'bread flour', 'cake flour'],
            'sugar': ['white sugar', 'granulated sugar', 'brown sugar'],
            'salt': ['table salt', 'sea salt', 'kosher salt'],
            'pepper': ['black pepper', 'white pepper', 'ground pepper'],
            'pasta': ['penne', 'spaghetti', 'macaroni', 'fettuccine', 'rigatoni'],
            // Add bell pepper variations
            'bell pepper': ['red bell pepper', 'green bell pepper', 'yellow bell pepper'],
            'red bell pepper': ['bell pepper'],
            'green bell pepper': ['bell pepper'],
            'yellow bell pepper': ['bell pepper']
        };

        // Check if recipe ingredient matches any specific variation
        for (const [baseIngredient, variations] of Object.entries(specificVariations)) {
            // Check if recipe ingredient is the base or a variation
            if (recipeName === baseIngredient || variations.some(v => normalizeIngredientName(v) === recipeName)) {
                // Look for base or any variation in inventory
                for (const item of inventory) {
                    const itemName = normalizeIngredientName(item.name);
                    if (itemName === baseIngredient || variations.some(v => normalizeIngredientName(v) === itemName)) {
                        console.log(`✅ VARIATION MATCH: "${item.name}" matches "${recipeIngredient.name}" via ${baseIngredient}`);
                        return {
                            found: true,
                            inventoryItem: item,
                            matchType: 'variation'
                        };
                    }
                }
            }
        }

        // 3. CONSERVATIVE PARTIAL MATCH (only for longer ingredient names)
        if (recipeName.length >= 5) { // Only for longer ingredient names
            for (const item of inventory) {
                const itemName = normalizeIngredientName(item.name);

                // Both must be reasonably long and one must contain the other as a significant portion
                if (itemName.length >= 4 &&
                    (itemName.includes(recipeName) || recipeName.includes(itemName))) {

                    // Additional validation: the contained part must be at least 50% of the longer string
                    const shorterLength = Math.min(itemName.length, recipeName.length);
                    const longerLength = Math.max(itemName.length, recipeName.length);

                    if (shorterLength / longerLength >= 0.6) {
                        console.log(`✅ CONSERVATIVE PARTIAL MATCH: "${item.name}" <-> "${recipeIngredient.name}"`);
                        return {
                            found: true,
                            inventoryItem: item,
                            matchType: 'partial'
                        };
                    }
                }
            }
        }

        // 4. CHECK ALTERNATIVES (if recipe provides them)
        if (recipeIngredient.alternatives && recipeIngredient.alternatives.length > 0) {
            for (const alternative of recipeIngredient.alternatives) {
                const altNormalized = normalizeIngredientName(alternative);
                for (const item of inventory) {
                    const itemName = normalizeIngredientName(item.name);
                    if (itemName === altNormalized) {
                        console.log(`✅ ALTERNATIVE MATCH: "${item.name}" matches alternative "${alternative}"`);
                        return {
                            found: true,
                            inventoryItem: item,
                            matchType: 'alternative'
                        };
                    }
                }
            }
        }

        console.log(`❌ NO MATCH found for: "${recipeIngredient.name}"`);
        return {
            found: false,
            inventoryItem: null,
            matchType: null
        };
    };

    const getMatchColor = (percentage) => {
        if (percentage >= 0.9) return 'text-green-600 bg-green-100';
        if (percentage >= 0.7) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    const getDifficultyIcon = (difficulty) => {
        switch (difficulty) {
            case 'easy':
                return '🟢';
            case 'medium':
                return '🟡';
            case 'hard':
                return '🔴';
            default:
                return '⚪';
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
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setDebugMode(!debugMode)}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                        >
                            {debugMode ? 'Hide Debug' : 'Show Debug'}
                        </button>
                        <button
                            onClick={loadData}
                            disabled={loading}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-100"
                        >
                            {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
                        </button>
                    </div>
                </div>

                {/* Debug Info */}
                {debugMode && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h4 className="font-medium text-yellow-800 mb-2">Debug Information</h4>
                        <div className="text-sm text-yellow-700 space-y-1">
                            <div>Current inventory items ({inventory.length}):</div>
                            <div className="pl-4 space-y-1">
                                {inventory.map((item, index) => (
                                    <div key={index}>• {item.name} (Category: {item.category || 'None'})</div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

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
                                min="0.1"
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
                                    No recipes match your current inventory at {Math.round(matchThreshold * 100)}%
                                    threshold
                                </div>
                                <button
                                    onClick={() => setMatchThreshold(0.1)}
                                    className="text-indigo-600 hover:text-indigo-900 text-sm"
                                >
                                    Try lowering the match threshold to 10%
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
                                            <div
                                                className={`px-3 py-1 rounded-full text-sm font-medium ${getMatchColor(recipe.analysis.matchPercentage)}`}>
                                                {Math.round(recipe.analysis.matchPercentage * 100)}% Match
                                            </div>
                                        </div>

                                        {/* Debug matches */}
                                        {debugMode && recipe.analysis.matches && recipe.analysis.matches.length > 0 && (
                                            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                                                <h6 className="font-medium text-blue-800 mb-2">Debug: Matches Found</h6>
                                                <div className="text-sm text-blue-700 space-y-1">
                                                    {recipe.analysis.matches.map((match, index) => (
                                                        <div key={index}>
                                                            • "{match.recipeIngredient}" → "{match.inventoryItem}"
                                                            ({match.matchType})
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

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
                                                            {ingredient.optional &&
                                                                <span className="text-gray-500"> (optional)</span>}
                                                            {debugMode && ingredient.matchType && (
                                                                <span
                                                                    className="text-xs text-blue-600"> [{ingredient.matchType}]</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {recipe.analysis.availableIngredients.length > 5 && (
                                                        <div className="text-green-600 text-xs">
                                                            +{recipe.analysis.availableIngredients.length - 5} more
                                                            available
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
                                                            {ingredient.optional &&
                                                                <span className="text-gray-500"> (optional)</span>}
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
                                                    href={`/recipes/${recipe._id}`}
                                                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                >
                                                    View Recipe
                                                </a>
                                                {!recipe.analysis.canMake && (
                                                    <button
                                                        onClick={() => setShowShoppingList({
                                                            recipeId: recipe._id,
                                                            recipeName: recipe.title
                                                        })}
                                                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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

                {/* Shopping List Modal */}
                {showShoppingList && (
                    <RecipeShoppingList
                        recipeId={showShoppingList.recipeId}
                        recipeName={showShoppingList.recipeName}
                        onClose={() => setShowShoppingList(null)}
                    />
                )}
            </div>
        </DashboardLayout>
    );
}