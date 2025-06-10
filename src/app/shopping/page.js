// file: /src/app/shopping/page.js v6 - Fixed layout and styling issues

'use client';

import {useState, useEffect} from 'react';
import {useSession} from 'next-auth/react';
import ShoppingListDisplay from '@/components/shopping/ShoppingListDisplay';
import SavedShoppingListsButton from '@/components/shopping/SavedShoppingListsButton';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';

export default function ShoppingPage() {
    const {data: session} = useSession();
    const [recipes, setRecipes] = useState([]);
    const [filteredRecipes, setFilteredRecipes] = useState([]);
    const [selectedRecipes, setSelectedRecipes] = useState([]);
    const [shoppingList, setShoppingList] = useState(null);
    const [showShoppingList, setShowShoppingList] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [selectedDifficulty, setSelectedDifficulty] = useState('');
    const [selectedIngredient, setSelectedIngredient] = useState('');
    const [maxCookTime, setMaxCookTime] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Available filter options (extracted from recipes)
    const [availableTags, setAvailableTags] = useState([]);
    const [availableIngredients, setAvailableIngredients] = useState([]);

    // Enhanced ingredient normalization and matching (borrowed from your API)
    const normalizeIngredient = (ingredient) => {
        if (!ingredient || typeof ingredient !== 'string') {
            return '';
        }

        return ingredient
            .toLowerCase()
            .trim()
            .replace(/[^\w\s]/g, ' ')  // Replace non-word characters with spaces
            .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
            .trim();
    };

    // Create ingredient key for better matching (similar to your API)
    const createIngredientKey = (ingredient) => {
        const normalized = normalizeIngredient(ingredient);

        // Remove common descriptors that shouldn't prevent matching
        const cleaned = normalized
            .replace(/\b(fresh|dried|minced|chopped|sliced|diced|whole|ground|crushed|grated|shredded|toasted|crumbled|cooked)\b/g, '')
            .replace(/\b(small|medium|large|extra large)\b/g, '')
            .replace(/\b(can|jar|bottle|bag|box|package)\b/g, '')
            .replace(/\b(of|the|and|or|into|cut)\b/g, '')
            .replace(/\b(matchsticks|strips|florets)\b/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        return cleaned;
    };

    // Smart ingredient matching function
    const ingredientMatches = (searchTerm, ingredient) => {
        if (!searchTerm || !ingredient?.name) return false;

        const searchNormalized = normalizeIngredient(searchTerm);
        const ingredientNormalized = normalizeIngredient(ingredient.name);
        const ingredientKey = createIngredientKey(ingredient.name);
        const searchKey = createIngredientKey(searchTerm);

        // 1. Exact match (highest priority)
        if (ingredientNormalized === searchNormalized) return true;

        // 2. Key match (normalized without descriptors)
        if (ingredientKey === searchKey && searchKey.length > 2) return true;

        // 3. Specific ingredient type matching to prevent false positives
        if (searchNormalized === 'cheese') {
            // Only match actual cheese types, not things that contain "cheese"
            const cheeseTypes = ['cheddar', 'mozzarella', 'parmesan', 'swiss', 'feta', 'goat cheese', 'cream cheese', 'ricotta', 'provolone', 'brie', 'camembert', 'blue cheese', 'gouda', 'monterey jack', 'pepper jack', 'string cheese'];
            return cheeseTypes.some(type => ingredientKey.includes(type)) || ingredientKey === 'cheese';
        }

        if (searchNormalized === 'corn') {
            // Only match actual corn, not cornstarch, cornmeal, etc.
            return ingredientKey === 'corn' ||
                ingredientNormalized.includes('corn kernels') ||
                ingredientNormalized.includes('sweet corn') ||
                (ingredientNormalized.includes('corn') &&
                    !ingredientNormalized.includes('cornstarch') &&
                    !ingredientNormalized.includes('cornmeal') &&
                    !ingredientNormalized.includes('corn flake') &&
                    !ingredientNormalized.includes('cornflake') &&
                    !ingredientNormalized.includes('corn syrup') &&
                !ingredientNormalized.includes('cornhusks') &&
                !ingredientNormalized.includes('corn starch'));
        }

        if (searchNormalized === 'flour') {
            // Match flour types but not things that just contain "flour"
            return ingredientKey.includes('flour') &&
                (ingredientKey === 'flour' ||
                    ingredientNormalized.includes('all purpose flour') ||
                    ingredientNormalized.includes('wheat flour') ||
                    ingredientNormalized.includes('bread flour') ||
                    ingredientNormalized.includes('cake flour') ||
                    ingredientNormalized.includes('self rising flour'));
        }

        if (searchNormalized === 'beans') {
            // Match actual beans, not green beans or other things
            const beanTypes = ['black beans', 'kidney beans', 'pinto beans', 'navy beans', 'chickpeas', 'garbanzo beans', 'white beans', 'cannellini beans', 'lima beans', 'red beans', 'refried beans'];
            return beanTypes.some(type => ingredientNormalized.includes(type)) ||
                (ingredientKey === 'beans' &&
                    !ingredientNormalized.includes('green beans') &&
                    !ingredientNormalized.includes('string beans') &&
                    !ingredientNormalized.includes('vanilla beans'));
        }

        if (searchNormalized === 'chicken') {
            // Match chicken but not chicken broth, chicken stock, etc. in some cases
            return ingredientNormalized.includes('chicken') &&
                !ingredientNormalized.includes('chicken broth') &&
                !ingredientNormalized.includes('chicken stock') &&
                !ingredientNormalized.includes('chicken bouillon');
        }

        // 4. Word boundary matching for longer search terms (3+ characters)
        if (searchNormalized.length >= 3) {
            // Check if search term appears as a complete word
            const wordBoundaryRegex = new RegExp(`\\b${searchNormalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
            if (wordBoundaryRegex.test(ingredientNormalized)) return true;

            // Also check if ingredient starts with search term (for partial matching)
            if (ingredientNormalized.startsWith(searchNormalized + ' ') || ingredientNormalized === searchNormalized) return true;
        }

        // 5. Conservative contains check for very specific cases
        if (searchNormalized.length >= 4 && ingredientNormalized.includes(searchNormalized)) {
            // Make sure it's not a false positive like "corn" matching "cornstarch"
            const index = ingredientNormalized.indexOf(searchNormalized);
            const beforeChar = index > 0 ? ingredientNormalized[index - 1] : ' ';
            const afterChar = index + searchNormalized.length < ingredientNormalized.length ?
                ingredientNormalized[index + searchNormalized.length] : ' ';

            // It's a good match if search term is at word boundaries
            if (beforeChar === ' ' && (afterChar === ' ' || afterChar === 's')) { // Allow plural
                return true;
            }
        }

        return false;
    };

    // Fetch recipes when component mounts
    useEffect(() => {
        fetchRecipes();
    }, []);

    // Update filtered recipes when filters change
    useEffect(() => {
        applyFilters();
    }, [recipes, searchQuery, selectedTags, selectedDifficulty, selectedIngredient, maxCookTime]);

    const fetchRecipes = async () => {
        try {
            const response = await fetch('/api/recipes');
            const result = await response.json();
            if (result.success) {
                setRecipes(result.recipes);
                extractFilterOptions(result.recipes);
            } else {
                setError('Failed to fetch recipes');
            }
        } catch (error) {
            console.error('Error fetching recipes:', error);
            setError('Failed to fetch recipes');
        }
    };

    // Extract available filter options from recipes
    const extractFilterOptions = (recipeList) => {
        const allTags = new Set();
        const allIngredients = new Set();

        recipeList.forEach(recipe => {
            // Extract tags
            if (recipe.tags && Array.isArray(recipe.tags)) {
                recipe.tags.forEach(tag => allTags.add(tag));
            }

            // Extract ingredients
            if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
                recipe.ingredients.forEach(ingredient => {
                    if (ingredient.name) {
                        // Clean up ingredient name (remove amounts, descriptions)
                        const cleanName = ingredient.name
                            .toLowerCase()
                            .replace(/\b(fresh|dried|minced|chopped|sliced|diced|whole|ground|crushed|grated|shredded|cooked|raw)\b/g, '')
                            .replace(/\b(small|medium|large|extra large)\b/g, '')
                            .replace(/\b(can|jar|bottle|bag|box|package|of)\b/g, '')
                            .replace(/[,()]/g, '')
                            .replace(/\s+/g, ' ')
                            .trim();

                        if (cleanName.length > 2) {
                            allIngredients.add(cleanName);
                        }
                    }
                });
            }
        });

        setAvailableTags(Array.from(allTags).sort());
        setAvailableIngredients(Array.from(allIngredients).sort());
    };

    // Apply all filters to recipes
    const applyFilters = () => {
        let filtered = [...recipes];

        // Text search (title and description)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(recipe =>
                recipe.title.toLowerCase().includes(query) ||
                (recipe.description && recipe.description.toLowerCase().includes(query))
            );
        }

        // Tag filter
        if (selectedTags.length > 0) {
            filtered = filtered.filter(recipe =>
                recipe.tags && selectedTags.some(tag => recipe.tags.includes(tag))
            );
        }

        // Difficulty filter
        if (selectedDifficulty) {
            filtered = filtered.filter(recipe => recipe.difficulty === selectedDifficulty);
        }

        // Ingredient filter - now using smart matching
        if (selectedIngredient) {
            filtered = filtered.filter(recipe =>
                    recipe.ingredients && recipe.ingredients.some(ingredient =>
                        ingredientMatches(selectedIngredient, ingredient)
                    )
            );
        }

        // Cook time filter
        if (maxCookTime) {
            const maxTime = parseInt(maxCookTime);
            filtered = filtered.filter(recipe => {
                const totalTime = (recipe.cookTime || 0) + (recipe.prepTime || 0);
                return totalTime <= maxTime;
            });
        }

        setFilteredRecipes(filtered);
    };

    // Clear all filters
    const clearFilters = () => {
        setSearchQuery('');
        setSelectedTags([]);
        setSelectedDifficulty('');
        setSelectedIngredient('');
        setMaxCookTime('');
    };

    // Handle tag selection
    const handleTagToggle = (tag) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    const handleRecipeToggle = (recipeId) => {
        setSelectedRecipes(prev =>
            prev.includes(recipeId)
                ? prev.filter(id => id !== recipeId)
                : [...prev, recipeId]
        );
    };

    const handleSelectAll = () => {
        if (selectedRecipes.length === filteredRecipes.length) {
            setSelectedRecipes([]);
        } else {
            setSelectedRecipes(filteredRecipes.map(recipe => recipe._id));
        }
    };

    const handleClearAll = () => {
        setSelectedRecipes([]);
        setShoppingList(null);
        setShowShoppingList(false);
        setError('');
    };

    const generateShoppingList = async () => {
        if (selectedRecipes.length === 0) {
            setError('Please select at least one recipe');
            return;
        }

        setLoading(true);
        setError('');

        try {
            console.log('Generating shopping list for recipes:', selectedRecipes);

            const response = await fetch('/api/shopping/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipeIds: selectedRecipes
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to generate shopping list');
            }

            if (result.success) {
                console.log('Shopping list generated successfully:', result.shoppingList);
                setShoppingList(result.shoppingList);
                setShowShoppingList(true);
            } else {
                throw new Error('Invalid response format');
            }

        } catch (error) {
            console.error('Error generating shopping list:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const refreshShoppingList = () => {
        generateShoppingList();
    };

    const closeShoppingList = () => {
        setShowShoppingList(false);
    };

    // Get selected recipe details for display context
    const getSelectedRecipeNames = () => {
        return filteredRecipes
            .filter(recipe => selectedRecipes.includes(recipe._id))
            .map(recipe => recipe.title);
    };

    const getShoppingListTitle = () => {
        const selectedCount = selectedRecipes.length;
        if (selectedCount === 1) {
            const recipeName = getSelectedRecipeNames()[0];
            return `🛒 Shopping List - ${recipeName}`;
        } else {
            return `🛒 Shopping List - ${selectedCount} Recipes`;
        }
    };

    const getShoppingListSubtitle = () => {
        const recipeNames = getSelectedRecipeNames();
        if (recipeNames.length <= 3) {
            return recipeNames.join(', ');
        } else {
            return `${recipeNames.slice(0, 2).join(', ')} and ${recipeNames.length - 2} more`;
        }
    };

    // Count active filters
    const getActiveFilterCount = () => {
        let count = 0;
        if (searchQuery.trim()) count++;
        if (selectedTags.length > 0) count++;
        if (selectedDifficulty) count++;
        if (selectedIngredient) count++;
        if (maxCookTime) count++;
        return count;
    };

    if (showShoppingList && shoppingList) {
        return (
            <MobileOptimizedLayout>
                <ShoppingListDisplay
                    shoppingList={shoppingList}
                    onClose={closeShoppingList}
                    onRefresh={refreshShoppingList}
                    title={getShoppingListTitle()}
                    subtitle={getShoppingListSubtitle()}
                    sourceRecipeIds={selectedRecipes}
                    sourceMealPlanId={null}
                />
            </MobileOptimizedLayout>
        );
    }

    return (
        <MobileOptimizedLayout>
            <div className="max-w-7xl mx-auto px-4 py-8 pb-16">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            🛒 Shopping List Generator
                        </h1>
                        <p className="text-gray-600 text-lg">
                            Filter and select recipes to generate a smart shopping list
                        </p>
                    </div>
                    <SavedShoppingListsButton />
                </div>

                {/* Search and Filter Bar */}
                <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6 overflow-hidden">
                    <div className="p-6">
                        {/* Search Bar */}
                        <div className="mb-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search recipes by name or description..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg text-base bg-gray-50 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Filter Toggle and Status */}
                        <div className="flex items-center justify-between mb-4">
                            <TouchEnhancedButton
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    showFilters
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-600 text-white'
                                }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                                </svg>
                                Filters {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
                                <span className="text-xs">
                                    {showFilters ? '▲' : '▼'}
                                </span>
                            </TouchEnhancedButton>

                            <div className="flex items-center gap-4">
                                {getActiveFilterCount() > 0 && (
                                    <TouchEnhancedButton
                                        onClick={clearFilters}
                                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium"
                                    >
                                        Clear Filters
                                    </TouchEnhancedButton>
                                )}
                            </div>
                        </div>

                        {/* Expanded Filters */}
                        {showFilters && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                {/* Difficulty Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Difficulty Level
                                    </label>
                                    <select
                                        value={selectedDifficulty}
                                        onChange={(e) => setSelectedDifficulty(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="">All Difficulties</option>
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>

                                {/* Cook Time Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Max Total Time (minutes)
                                    </label>
                                    <select
                                        value={maxCookTime}
                                        onChange={(e) => setMaxCookTime(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="">Any Time</option>
                                        <option value="15">15 minutes or less</option>
                                        <option value="30">30 minutes or less</option>
                                        <option value="45">45 minutes or less</option>
                                        <option value="60">1 hour or less</option>
                                        <option value="90">1.5 hours or less</option>
                                        <option value="120">2 hours or less</option>
                                    </select>
                                </div>

                                {/* Ingredient Filter - Improved */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Contains Ingredient
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Type ingredient name..."
                                        value={selectedIngredient}
                                        onChange={(e) => setSelectedIngredient(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                    <div className="text-xs text-gray-500 mt-1">
                                        Search for ingredients like "chicken", "tomato", "flour"
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Results Count */}
                        <div className="mt-4 text-center">
                            <span className="text-sm text-gray-600">
                                Showing {filteredRecipes.length} of {recipes.length} recipes
                            </span>
                        </div>

                        {/* Tags Filter */}
                        {availableTags.length > 0 && (
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Recipe Tags
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {availableTags.map(tag => (
                                        <TouchEnhancedButton
                                            key={tag}
                                            onClick={() => handleTagToggle(tag)}
                                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                                selectedTags.includes(tag)
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                        >
                                            {tag}
                                        </TouchEnhancedButton>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Bar */}
                {filteredRecipes.length > 0 && (
                    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-4 flex-wrap">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={selectedRecipes.length === filteredRecipes.length && filteredRecipes.length > 0}
                                        onChange={handleSelectAll}
                                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    />
                                    Select All ({filteredRecipes.length} recipes)
                                </label>

                                {selectedRecipes.length > 0 && (
                                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-md text-sm font-medium">
                                        {selectedRecipes.length} selected
                                    </span>
                                )}
                            </div>

                            <div className="flex gap-3 items-center">
                                {selectedRecipes.length > 0 && (
                                    <TouchEnhancedButton
                                        onClick={handleClearAll}
                                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                                    >
                                        Clear All
                                    </TouchEnhancedButton>
                                )}

                                <TouchEnhancedButton
                                    onClick={generateShoppingList}
                                    disabled={selectedRecipes.length === 0 || loading}
                                    className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                                        selectedRecipes.length === 0 || loading
                                            ? 'bg-gray-400 text-white cursor-not-allowed'
                                            : 'bg-green-600 hover:bg-green-700 text-white'
                                    }`}
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            🛒 Generate Shopping List
                                        </>
                                    )}
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-8">
                        {error}
                    </div>
                )}

                {/* Recipe Selection */}
                <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-16">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900">
                            📝 Select Recipes ({filteredRecipes.length} available)
                        </h2>
                    </div>

                    <div className="p-6">
                        {filteredRecipes.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                {recipes.length === 0 ? (
                                    <>
                                        <div className="text-5xl mb-4">📝</div>
                                        <h3 className="text-xl font-semibold mb-2">No recipes found</h3>
                                        <p>Add some recipes first to generate shopping lists.</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-5xl mb-4">🔍</div>
                                        <h3 className="text-xl font-semibold mb-2">No recipes match your filters</h3>
                                        <p>Try adjusting your search criteria or clearing some filters.</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredRecipes.map(recipe => (
                                    <div
                                        key={recipe._id}
                                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                                            selectedRecipes.includes(recipe._id)
                                                ? 'border-blue-500 bg-blue-50 border-2'
                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                        onClick={() => handleRecipeToggle(recipe._id)}
                                    >
                                        <div className="flex items-start gap-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedRecipes.includes(recipe._id)}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    handleRecipeToggle(recipe._id);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-900 mb-2">
                                                    {recipe.title}
                                                </h3>
                                                {recipe.description && (
                                                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                                        {recipe.description}
                                                    </p>
                                                )}
                                                <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                                                    {recipe.servings && (
                                                        <span className="flex items-center gap-1">
                                                            🍽️ {recipe.servings} servings
                                                        </span>
                                                    )}
                                                    {(recipe.cookTime || recipe.prepTime) && (
                                                        <span className="flex items-center gap-1">
                                                            ⏱️ {(recipe.cookTime || 0) + (recipe.prepTime || 0)} min
                                                        </span>
                                                    )}
                                                    {recipe.ingredients && (
                                                        <span className="flex items-center gap-1">
                                                            🥕 {recipe.ingredients.length} ingredients
                                                        </span>
                                                    )}
                                                    {recipe.difficulty && (
                                                        <span className={`flex items-center gap-1 ${
                                                            recipe.difficulty === 'easy' ? 'text-green-600' :
                                                                recipe.difficulty === 'medium' ? 'text-orange-600' : 'text-red-600'
                                                        }`}>
                                                            📊 {recipe.difficulty}
                                                        </span>
                                                    )}
                                                </div>
                                                {recipe.tags && recipe.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {recipe.tags.slice(0, 4).map(tag => (
                                                            <span
                                                                key={tag}
                                                                className={`px-2 py-1 rounded-full text-xs ${
                                                                    selectedTags.includes(tag)
                                                                        ? 'bg-indigo-600 text-white'
                                                                        : 'bg-gray-100 text-gray-600'
                                                                }`}
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                        {recipe.tags.length > 4 && (
                                                            <span className="text-xs text-gray-500 italic">
                                                                +{recipe.tags.length - 4} more
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <br/>
                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}