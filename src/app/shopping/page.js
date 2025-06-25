'use client';
// file: /src/app/shopping/page.js v9 - Added subscription gate for Gold+ users (matching meal-planning)

import {useSafeSession} from '@/hooks/useSafeSession';
import {useEffect} from 'react';
import {redirect} from 'next/navigation';
import {useState} from 'react';
import ShoppingListDisplay from '@/components/shopping/ShoppingListDisplay';
import SavedShoppingListsButton from '@/components/shopping/SavedShoppingListsButton';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import {getApiUrl} from '@/lib/api-config';
import {useSubscription, useFeatureGate} from '@/hooks/useSubscription';
import FeatureGate, {SubscriptionIndicator} from '@/components/subscription/FeatureGate';
import {FEATURE_GATES} from '@/lib/subscription-config';

export default function ShoppingPage() {
    const {data: session, status} = useSafeSession();
    const subscription = useSubscription();
    const shoppingGate = useFeatureGate(FEATURE_GATES.CREATE_MEAL_PLAN); // Using same gate as meal planning

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

    // NEW: Tag browser states
    const [showTagBrowser, setShowTagBrowser] = useState(false);
    const [selectedTagSection, setSelectedTagSection] = useState('');
    const [selectedTagLetter, setSelectedTagLetter] = useState('');

    // Available filter options (extracted from recipes)
    const [availableTags, setAvailableTags] = useState([]);
    const [availableIngredients, setAvailableIngredients] = useState([]);

    // NEW: Tag sections and organization
    const tagSections = [
        {id: 'A-G', label: 'A-G', letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G']},
        {id: 'H-N', label: 'H-N', letters: ['H', 'I', 'J', 'K', 'L', 'M', 'N']},
        {id: 'O-U', label: 'O-U', letters: ['O', 'P', 'Q', 'R', 'S', 'T', 'U']},
        {id: 'V-Z', label: 'V-Z', letters: ['V', 'W', 'X', 'Y', 'Z']},
        {id: '0-9', label: '0-9', letters: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']}
    ];

    // NEW: Organize tags by letter
    const organizeTagsByLetter = (tags) => {
        const organized = {};

        tags.forEach(tag => {
            const firstChar = tag.charAt(0).toUpperCase();
            if (!organized[firstChar]) {
                organized[firstChar] = [];
            }
            organized[firstChar].push(tag);
        });

        // Sort tags within each letter
        Object.keys(organized).forEach(letter => {
            organized[letter].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        });

        return organized;
    };

    // NEW: Get tags for a specific section
    const getTagsForSection = (sectionId) => {
        const section = tagSections.find(s => s.id === sectionId);
        if (!section) return {};

        const organizedTags = organizeTagsByLetter(availableTags);
        const sectionTags = {};

        section.letters.forEach(letter => {
            if (organizedTags[letter]) {
                sectionTags[letter] = organizedTags[letter];
            }
        });

        return sectionTags;
    };

    // NEW: Get available letters for a section (letters that have tags)
    const getAvailableLettersForSection = (sectionId) => {
        const sectionTags = getTagsForSection(sectionId);
        return Object.keys(sectionTags).sort();
    };

    // NEW: Get tags for a specific letter
    const getTagsForLetter = (letter) => {
        const organizedTags = organizeTagsByLetter(availableTags);
        return organizedTags[letter] || [];
    };

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

    // Redirect if not authenticated
    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/auth/signin');
        }
    }, [status]);

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
            const response = await fetch(getApiUrl('/api/recipes'));
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
        // NEW: Reset tag browser
        setShowTagBrowser(false);
        setSelectedTagSection('');
        setSelectedTagLetter('');
    };

    // Handle tag selection
    const handleTagToggle = (tag) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    // NEW: Handle tag browser navigation
    const handleTagSectionSelect = (sectionId) => {
        setSelectedTagSection(sectionId);
        setSelectedTagLetter('');
    };

    const handleTagLetterSelect = (letter) => {
        setSelectedTagLetter(letter);
    };

    const resetTagBrowser = () => {
        setSelectedTagSection('');
        setSelectedTagLetter('');
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

            const response = await fetch(getApiUrl('/api/shopping/generate'), {
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

    // Loading state while session is loading
    if (status === 'loading') {
        return (
            <MobileOptimizedLayout>
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
                        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
                            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                            <div className="h-10 bg-gray-200 rounded mb-4"></div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="h-10 bg-gray-200 rounded"></div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <Footer/>
                </div>
            </MobileOptimizedLayout>
        );
    }

    // Show shopping list if active
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
            <div className="max-w-7xl mx-auto">
                <FeatureGate
                    feature={FEATURE_GATES.CREATE_MEAL_PLAN}
                    fallback={
                        <div className="px-4 py-8">
                            {/* Header with subscription info */}
                            <div className="text-center mb-8">
                                <div className="flex items-center justify-center space-x-3 mb-4">
                                    <h1 className="text-3xl font-bold text-gray-900">🛒 Shopping List Generator</h1>
                                    <SubscriptionIndicator/>
                                </div>
                                <p className="text-gray-600">Generate smart shopping lists from your favorite
                                    recipes</p>
                            </div>

                            {/* Premium Feature Showcase */}
                            <div
                                className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-8 mb-8 border border-green-200">
                                <div className="text-center mb-6">
                                    <div className="text-6xl mb-4">🛒✨</div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-3">
                                        Shopping Lists are a Gold Feature
                                    </h2>
                                    <p className="text-gray-700 max-w-2xl mx-auto">
                                        Never forget an ingredient again! Generate smart shopping lists from your
                                        selected recipes,
                                        with automatic quantity consolidation and organized categories.
                                    </p>
                                </div>

                                {/* Feature Preview */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                    <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                                        <div className="text-2xl mb-2">📝</div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Smart Lists</h3>
                                        <p className="text-sm text-gray-600">Auto-consolidate quantities and organize by
                                            category</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                                        <div className="text-2xl mb-2">🔍</div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Recipe Filtering</h3>
                                        <p className="text-sm text-gray-600">Search by ingredients, tags, and
                                            difficulty</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                                        <div className="text-2xl mb-2">💾</div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Save & Share</h3>
                                        <p className="text-sm text-gray-600">Save lists for later and share with
                                            family</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                                        <div className="text-2xl mb-2">📱</div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Mobile Ready</h3>
                                        <p className="text-sm text-gray-600">Take your lists to the store on any
                                            device</p>
                                    </div>
                                </div>

                                {/* Mock Shopping List Preview */}
                                <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Preview:
                                        Generated Shopping List</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <h4 className="font-medium text-gray-700 mb-2">🥬 Produce</h4>
                                            <ul className="space-y-1 text-sm text-gray-600">
                                                <li>• 2 lbs Roma Tomatoes</li>
                                                <li>• 1 large Yellow Onion</li>
                                                <li>• 3 cloves Garlic</li>
                                                <li>• 1 bunch Fresh Basil</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-700 mb-2">🥛 Dairy</h4>
                                            <ul className="space-y-1 text-sm text-gray-600">
                                                <li>• 8 oz Mozzarella Cheese</li>
                                                <li>• 1/2 cup Parmesan</li>
                                                <li>• 2 large Eggs</li>
                                                <li>• 1 cup Heavy Cream</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-700 mb-2">🍝 Pantry</h4>
                                            <ul className="space-y-1 text-sm text-gray-600">
                                                <li>• 1 lb Pasta</li>
                                                <li>• 2 cups All-Purpose Flour</li>
                                                <li>• 1/4 cup Olive Oil</li>
                                                <li>• Salt & Pepper</li>
                                            </ul>
                                        </div>
                                    </div>
                                    <div className="text-center mt-4 text-sm text-gray-500">
                                        ↑ This is how your shopping lists would be organized
                                    </div>
                                </div>

                                {/* Upgrade CTA */}
                                <div className="text-center">
                                    <TouchEnhancedButton
                                        onClick={() => window.location.href = '/pricing?source=shopping-list'}
                                        className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-lg"
                                    >
                                        Upgrade to Gold - Start Shopping Smarter!
                                    </TouchEnhancedButton>
                                    <p className="text-sm text-gray-600 mt-3">
                                        7-day free trial • $4.99/month • Cancel anytime
                                    </p>
                                </div>
                            </div>

                            {/* What Gold Includes */}
                            <div className="bg-white rounded-lg border p-6 mb-8">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                                    🎯 What's Included with Gold
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                                            <span className="text-sm">Meal planning (up to 2 weeks)</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                                            <span className="text-sm">250 inventory items (vs 50 free)</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                                            <span className="text-sm">Unlimited UPC scanning</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                                            <span className="text-sm">Common Items Wizard</span>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                                            <span className="text-sm">Recipe reviews & ratings</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                                            <span className="text-sm">Email notifications</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                                            <span className="text-sm">Nutritional information</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                                            <span className="text-sm">100 personal recipes (vs 5 free)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Alternative Options for Free Users */}
                            <div className="bg-gray-50 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                                    💡 Free Alternatives While You Decide
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="text-center">
                                        <TouchEnhancedButton
                                            onClick={() => window.location.href = '/recipes'}
                                            className="w-full bg-blue-100 text-blue-700 py-3 px-4 rounded-lg hover:bg-blue-200 transition-colors"
                                        >
                                            Browse Recipes
                                        </TouchEnhancedButton>
                                        <p className="text-xs text-gray-600 mt-2">Find inspiration for your next
                                            meal</p>
                                    </div>
                                    <div className="text-center">
                                        <TouchEnhancedButton
                                            onClick={() => window.location.href = '/inventory'}
                                            className="w-full bg-green-100 text-green-700 py-3 px-4 rounded-lg hover:bg-green-200 transition-colors"
                                        >
                                            Check Inventory
                                        </TouchEnhancedButton>
                                        <p className="text-xs text-gray-600 mt-2">See what you have available</p>
                                    </div>
                                    <div className="text-center">
                                        <TouchEnhancedButton
                                            onClick={() => window.location.href = '/recipes/suggestions'}
                                            className="w-full bg-purple-100 text-purple-700 py-3 px-4 rounded-lg hover:bg-purple-200 transition-colors"
                                        >
                                            Recipe Suggestions
                                        </TouchEnhancedButton>
                                        <p className="text-xs text-gray-600 mt-2">Find recipes you can make now</p>
                                    </div>
                                </div>
                            </div>

                            <Footer/>
                        </div>
                    }
                >
                    {/* Original shopping list content goes here when user has access */}
                    <div className="px-4 py-8 pb-16">
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
                            <SavedShoppingListsButton/>
                        </div>

                        {/* Search and Filter Bar */}
                        <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6 overflow-hidden">
                            <div className="p-6">
                                {/* Search Bar - Enhanced to match inventory style */}
                                <div className="mb-4">
                                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                                        🔍 Search Recipes
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            id="search"
                                            placeholder="Search by name, description, or ingredients..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base bg-white focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                                        />
                                        {searchQuery && (
                                            <TouchEnhancedButton
                                                onClick={() => setSearchQuery('')}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                            >
                                                ✕
                                            </TouchEnhancedButton>
                                        )}
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
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"/>
                                        </svg>
                                        🎛️ Filters {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
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
                                                🔄 Clear Filters
                                            </TouchEnhancedButton>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Filters */}
                                {showFilters && (
                                    <div
                                        className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                        {/* Difficulty Filter */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                📊 Difficulty Level
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
                                                ⏱️ Max Total Time (minutes)
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
                                                🥕 Contains Ingredient
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
                                        📋 Showing {filteredRecipes.length} of {recipes.length} recipes
                                    </span>
                                </div>

                                {/* NEW: Alphabetical Tag Browser */}
                                {availableTags.length > 0 && (
                                    <div className="mt-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="block text-sm font-medium text-gray-700">
                                                🏷️ Recipe Tags ({availableTags.length} total)
                                            </label>
                                            <TouchEnhancedButton
                                                onClick={() => setShowTagBrowser(!showTagBrowser)}
                                                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                                    showTagBrowser
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-600 text-white'
                                                }`}
                                            >
                                                📚 Browse Tags
                                                <span className="text-xs">
                                                    {showTagBrowser ? '▲' : '▼'}
                                                </span>
                                            </TouchEnhancedButton>
                                        </div>

                                        {/* Show selected tags */}
                                        {selectedTags.length > 0 && (
                                            <div className="mb-3">
                                                <div className="text-xs text-gray-600 mb-2">Selected Tags:</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedTags.map(tag => (
                                                        <TouchEnhancedButton
                                                            key={tag}
                                                            onClick={() => handleTagToggle(tag)}
                                                            className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-600 text-white flex items-center gap-1"
                                                        >
                                                            {tag}
                                                            <span className="text-xs">✕</span>
                                                        </TouchEnhancedButton>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Tag Browser */}
                                        {showTagBrowser && (
                                            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                                                {/* Breadcrumb Navigation */}
                                                <div className="flex items-center gap-2 mb-4 text-sm">
                                                    <TouchEnhancedButton
                                                        onClick={resetTagBrowser}
                                                        className={`px-3 py-1 rounded ${!selectedTagSection ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                                    >
                                                        📚 All Sections
                                                    </TouchEnhancedButton>
                                                    {selectedTagSection && (
                                                        <>
                                                            <span className="text-gray-400">→</span>
                                                            <TouchEnhancedButton
                                                                onClick={() => setSelectedTagLetter('')}
                                                                className={`px-3 py-1 rounded ${!selectedTagLetter ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                                            >
                                                                🔤 {selectedTagSection}
                                                            </TouchEnhancedButton>
                                                        </>
                                                    )}
                                                    {selectedTagLetter && (
                                                        <>
                                                            <span className="text-gray-400">→</span>
                                                            <span className="px-3 py-1 rounded bg-blue-600 text-white">
                                                                🅰️ {selectedTagLetter}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Section View - Show all sections */}
                                                {!selectedTagSection && (
                                                    <div>
                                                        <h4 className="font-medium text-gray-800 mb-3">Choose a Letter
                                                            Range:</h4>
                                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                                            {tagSections.map(section => {
                                                                const availableLetters = getAvailableLettersForSection(section.id);
                                                                const hasContent = availableLetters.length > 0;

                                                                return (
                                                                    <TouchEnhancedButton
                                                                        key={section.id}
                                                                        onClick={() => hasContent && handleTagSectionSelect(section.id)}
                                                                        disabled={!hasContent}
                                                                        className={`p-3 rounded-lg text-center transition-colors ${
                                                                            hasContent
                                                                                ? 'bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300'
                                                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                                                        }`}
                                                                    >
                                                                        <div
                                                                            className="font-semibold text-lg">{section.label}</div>
                                                                        <div className="text-xs mt-1">
                                                                            {hasContent
                                                                                ? `${availableLetters.length} letters`
                                                                                : 'No tags'
                                                                            }
                                                                        </div>
                                                                    </TouchEnhancedButton>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Letter View - Show letters in selected section */}
                                                {selectedTagSection && !selectedTagLetter && (
                                                    <div>
                                                        <h4 className="font-medium text-gray-800 mb-3">
                                                            Choose a Letter from {selectedTagSection}:
                                                        </h4>
                                                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                                                            {tagSections.find(s => s.id === selectedTagSection)?.letters.map(letter => {
                                                                const letterTags = getTagsForLetter(letter);
                                                                const hasContent = letterTags.length > 0;

                                                                return (
                                                                    <TouchEnhancedButton
                                                                        key={letter}
                                                                        onClick={() => hasContent && handleTagLetterSelect(letter)}
                                                                        disabled={!hasContent}
                                                                        className={`p-3 rounded-lg text-center transition-colors ${
                                                                            hasContent
                                                                                ? 'bg-green-100 hover:bg-green-200 text-green-800 border border-green-300'
                                                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                                                        }`}
                                                                    >
                                                                        <div
                                                                            className="font-bold text-xl">{letter}</div>
                                                                        <div className="text-xs mt-1">
                                                                            {hasContent
                                                                                ? `${letterTags.length} tags`
                                                                                : 'No tags'
                                                                            }
                                                                        </div>
                                                                    </TouchEnhancedButton>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Tags View - Show tags for selected letter */}
                                                {selectedTagLetter && (
                                                    <div>
                                                        <h4 className="font-medium text-gray-800 mb-3">
                                                            Tags starting with "{selectedTagLetter}":
                                                        </h4>
                                                        <div
                                                            className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                                                            {getTagsForLetter(selectedTagLetter).map(tag => (
                                                                <TouchEnhancedButton
                                                                    key={tag}
                                                                    onClick={() => handleTagToggle(tag)}
                                                                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                                                                        selectedTags.includes(tag)
                                                                            ? 'bg-indigo-600 text-white'
                                                                            : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
                                                                    }`}
                                                                >
                                                                    {selectedTags.includes(tag) && (
                                                                        <span className="mr-1">✓</span>
                                                                    )}
                                                                    {tag}
                                                                </TouchEnhancedButton>
                                                            ))}
                                                        </div>

                                                        {/* Quick actions for letter view */}
                                                        <div className="mt-3 flex gap-2">
                                                            <TouchEnhancedButton
                                                                onClick={() => {
                                                                    const letterTags = getTagsForLetter(selectedTagLetter);
                                                                    letterTags.forEach(tag => {
                                                                        if (!selectedTags.includes(tag)) {
                                                                            setSelectedTags(prev => [...prev, tag]);
                                                                        }
                                                                    });
                                                                }}
                                                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium"
                                                            >
                                                                ✅ Select All {selectedTagLetter} Tags
                                                            </TouchEnhancedButton>
                                                            <TouchEnhancedButton
                                                                onClick={() => {
                                                                    const letterTags = getTagsForLetter(selectedTagLetter);
                                                                    setSelectedTags(prev => prev.filter(tag => !letterTags.includes(tag)));
                                                                }}
                                                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium"
                                                            >
                                                                ❌ Deselect All {selectedTagLetter} Tags
                                                            </TouchEnhancedButton>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
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
                                            ✅ Select All ({filteredRecipes.length} recipes)
                                        </label>

                                        {selectedRecipes.length > 0 && (
                                            <span
                                                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-md text-sm font-medium">
                                                📝 {selectedRecipes.length} selected
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex gap-3 items-center">
                                        {selectedRecipes.length > 0 && (
                                            <TouchEnhancedButton
                                                onClick={handleClearAll}
                                                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                                            >
                                                🗑️ Clear All
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
                                                    <div
                                                        className="w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin"/>
                                                    🔄 Generating...
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
                                🚨 {error}
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
                                                <h3 className="text-xl font-semibold mb-2">No recipes match your
                                                    filters</h3>
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
                                                        <div
                                                            className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
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


                                                {/* Alternative Options for Free Users */}
                                                <div className="bg-gray-50 rounded-lg p-6">
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                                                        💡 Free Alternatives While You Decide
                                                    </h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div className="text-center">
                                                            <TouchEnhancedButton
                                                                onClick={() => window.location.href = '/recipes'}
                                                                className="w-full bg-blue-100 text-blue-700 py-3 px-4 rounded-lg hover:bg-blue-200 transition-colors"
                                                            >
                                                                Browse Recipes
                                                            </TouchEnhancedButton>
                                                            <p className="text-xs text-gray-600 mt-2">Find inspiration
                                                                for your next meal</p>
                                                        </div>
                                                        <div className="text-center">
                                                            <TouchEnhancedButton
                                                                onClick={() => window.location.href = '/inventory'}
                                                                className="w-full bg-green-100 text-green-700 py-3 px-4 rounded-lg hover:bg-green-200 transition-colors"
                                                            >
                                                                Check Inventory
                                                            </TouchEnhancedButton>
                                                            <p className="text-xs text-gray-600 mt-2">See what you have
                                                                available</p>
                                                        </div>
                                                        <div className="text-center">
                                                            <TouchEnhancedButton
                                                                onClick={() => window.location.href = '/recipes/suggestions'}
                                                                className="w-full bg-purple-100 text-purple-700 py-3 px-4 rounded-lg hover:bg-purple-200 transition-colors"
                                                            >
                                                                Recipe Suggestions
                                                            </TouchEnhancedButton>
                                                            <p className="text-xs text-gray-600 mt-2">Find recipes you
                                                                can make now</p>
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>


                            {/* Original shopping list content goes here when user has access */}
                            <div className="px-4 py-8 pb-16">
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
                                    <SavedShoppingListsButton/>
                                </div>

                                {/* Search and Filter Bar */}
                                <div
                                    className="bg-white rounded-lg shadow-md border border-gray-200 mb-6 overflow-hidden">
                                    <div className="p-6">
                                        {/* Search Bar - Enhanced to match inventory style */}
                                        <div className="mb-4">
                                            <label htmlFor="search"
                                                   className="block text-sm font-medium text-gray-700 mb-2">
                                                🔍 Search Recipes
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    id="search"
                                                    placeholder="Search by name, description, or ingredients..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base bg-white focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                                                />
                                                {searchQuery && (
                                                    <TouchEnhancedButton
                                                        onClick={() => setSearchQuery('')}
                                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                                    >
                                                        ✕
                                                    </TouchEnhancedButton>
                                                )}
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
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                     viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round"
                                                          strokeWidth={2}
                                                          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"/>
                                                </svg>
                                                🎛️
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
                                                        🔄 Clear Filters
                                                    </TouchEnhancedButton>
                                                )}
                                            </div>
                                        </div>

                                        {/* Expanded Filters */}
                                        {showFilters && (
                                            <div
                                                className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                                {/* Difficulty Filter */}
                                                <div>
                                                    <label
                                                        className="block text-sm font-medium text-gray-700 mb-2">
                                                        📊 Difficulty Level
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
                                                    <label
                                                        className="block text-sm font-medium text-gray-700 mb-2">
                                                        ⏱️ Max Total Time (minutes)
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
                                                    <label
                                                        className="block text-sm font-medium text-gray-700 mb-2">
                                                        🥕 Contains Ingredient
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
                                    📋 Showing {filteredRecipes.length} of {recipes.length} recipes
                                </span>
                                        </div>

                                        {/* NEW: Alphabetical Tag Browser */}
                                        {availableTags.length > 0 && (
                                            <div className="mt-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <label className="block text-sm font-medium text-gray-700">
                                                        🏷️ Recipe Tags ({availableTags.length} total)
                                                    </label>
                                                    <TouchEnhancedButton
                                                        onClick={() => setShowTagBrowser(!showTagBrowser)}
                                                        className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                                            showTagBrowser
                                                                ? 'bg-blue-600 text-white'
                                                                : 'bg-gray-600 text-white'
                                                        }`}
                                                    >
                                                        📚 Browse Tags
                                                        <span className="text-xs">
                                                {showTagBrowser ? '▲' : '▼'}
                                            </span>
                                                    </TouchEnhancedButton>
                                                </div>

                                                {/* Show selected tags */}
                                                {selectedTags.length > 0 && (
                                                    <div className="mb-3">
                                                        <div className="text-xs text-gray-600 mb-2">Selected
                                                            Tags:
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {selectedTags.map(tag => (
                                                                <TouchEnhancedButton
                                                                    key={tag}
                                                                    onClick={() => handleTagToggle(tag)}
                                                                    className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-600 text-white flex items-center gap-1"
                                                                >
                                                                    {tag}
                                                                    <span className="text-xs">✕</span>
                                                                </TouchEnhancedButton>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Tag Browser */}
                                                {showTagBrowser && (
                                                    <div
                                                        className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                                                        {/* Breadcrumb Navigation */}
                                                        <div className="flex items-center gap-2 mb-4 text-sm">
                                                            <TouchEnhancedButton
                                                                onClick={resetTagBrowser}
                                                                className={`px-3 py-1 rounded ${!selectedTagSection ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                                            >
                                                                📚 All Sections
                                                            </TouchEnhancedButton>
                                                            {selectedTagSection && (
                                                                <>
                                                                    <span className="text-gray-400">→</span>
                                                                    <TouchEnhancedButton
                                                                        onClick={() => setSelectedTagLetter('')}
                                                                        className={`px-3 py-1 rounded ${!selectedTagLetter ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                                                    >
                                                                        🔤 {selectedTagSection}
                                                                    </TouchEnhancedButton>
                                                                </>
                                                            )}
                                                            {selectedTagLetter && (
                                                                <>
                                                                    <span className="text-gray-400">→</span>
                                                                    <span
                                                                        className="px-3 py-1 rounded bg-blue-600 text-white">
                                                            🅰️ {selectedTagLetter}
                                                        </span>
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* Section View - Show all sections */}
                                                        {!selectedTagSection && (
                                                            <div>
                                                                <h4 className="font-medium text-gray-800 mb-3">Choose
                                                                    a Letter Range:</h4>
                                                                <div
                                                                    className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                                                    {tagSections.map(section => {
                                                                        const availableLetters = getAvailableLettersForSection(section.id);
                                                                        const hasContent = availableLetters.length > 0;

                                                                        return (
                                                                            <TouchEnhancedButton
                                                                                key={section.id}
                                                                                onClick={() => hasContent && handleTagSectionSelect(section.id)}
                                                                                disabled={!hasContent}
                                                                                className={`p-3 rounded-lg text-center transition-colors ${
                                                                                    hasContent
                                                                                        ? 'bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300'
                                                                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                                                                }`}
                                                                            >
                                                                                <div
                                                                                    className="font-semibold text-lg">{section.label}</div>
                                                                                <div className="text-xs mt-1">
                                                                                    {hasContent
                                                                                        ? `${availableLetters.length} letters`
                                                                                        : 'No tags'
                                                                                    }
                                                                                </div>
                                                                            </TouchEnhancedButton>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Letter View - Show letters in selected section */}
                                                        {selectedTagSection && !selectedTagLetter && (
                                                            <div>
                                                                <h4 className="font-medium text-gray-800 mb-3">
                                                                    Choose a Letter from {selectedTagSection}:
                                                                </h4>
                                                                <div
                                                                    className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                                                                    {tagSections.find(s => s.id === selectedTagSection)?.letters.map(letter => {
                                                                        const letterTags = getTagsForLetter(letter);
                                                                        const hasContent = letterTags.length > 0;

                                                                        return (
                                                                            <TouchEnhancedButton
                                                                                key={letter}
                                                                                onClick={() => hasContent && handleTagLetterSelect(letter)}
                                                                                disabled={!hasContent}
                                                                                className={`p-3 rounded-lg text-center transition-colors ${
                                                                                    hasContent
                                                                                        ? 'bg-green-100 hover:bg-green-200 text-green-800 border border-green-300'
                                                                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                                                                }`}
                                                                            >
                                                                                <div
                                                                                    className="font-bold text-xl">{letter}</div>
                                                                                <div className="text-xs mt-1">
                                                                                    {hasContent
                                                                                        ? `${letterTags.length} tags`
                                                                                        : 'No tags'
                                                                                    }
                                                                                </div>
                                                                            </TouchEnhancedButton>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Tags View - Show tags for selected letter */}
                                                        {selectedTagLetter && (
                                                            <div>
                                                                <h4 className="font-medium text-gray-800 mb-3">
                                                                    Tags starting with "{selectedTagLetter}":
                                                                </h4>
                                                                <div
                                                                    className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                                                                    {getTagsForLetter(selectedTagLetter).map(tag => (
                                                                        <TouchEnhancedButton
                                                                            key={tag}
                                                                            onClick={() => handleTagToggle(tag)}
                                                                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                                                                                selectedTags.includes(tag)
                                                                                    ? 'bg-indigo-600 text-white'
                                                                                    : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
                                                                            }`}
                                                                        >
                                                                            {selectedTags.includes(tag) && (
                                                                                <span className="mr-1">✓</span>
                                                                            )}
                                                                            {tag}
                                                                        </TouchEnhancedButton>
                                                                    ))}
                                                                </div>

                                                                {/* Quick actions for letter view */}
                                                                <div className="mt-3 flex gap-2">
                                                                    <TouchEnhancedButton
                                                                        onClick={() => {
                                                                            const letterTags = getTagsForLetter(selectedTagLetter);
                                                                            letterTags.forEach(tag => {
                                                                                if (!selectedTags.includes(tag)) {
                                                                                    setSelectedTags(prev => [...prev, tag]);
                                                                                }
                                                                            });
                                                                        }}
                                                                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium"
                                                                    >
                                                                        ✅ Select All {selectedTagLetter} Tags
                                                                    </TouchEnhancedButton>
                                                                    <TouchEnhancedButton
                                                                        onClick={() => {
                                                                            const letterTags = getTagsForLetter(selectedTagLetter);
                                                                            setSelectedTags(prev => prev.filter(tag => !letterTags.includes(tag)));
                                                                        }}
                                                                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium"
                                                                    >
                                                                        ❌ Deselect All {selectedTagLetter} Tags
                                                                    </TouchEnhancedButton>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Bar */}
                                {filteredRecipes.length > 0 && (
                                    <div
                                        className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
                                        <div className="flex items-center justify-between flex-wrap gap-4">
                                            <div className="flex items-center gap-4 flex-wrap">
                                                <label
                                                    className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRecipes.length === filteredRecipes.length && filteredRecipes.length > 0}
                                                        onChange={handleSelectAll}
                                                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                                    />
                                                    ✅ Select All ({filteredRecipes.length} recipes)
                                                </label>

                                                {selectedRecipes.length > 0 && (
                                                    <span
                                                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-md text-sm font-medium">
                                            📝 {selectedRecipes.length} selected
                                        </span>
                                                )}
                                            </div>

                                            <div className="flex gap-3 items-center">
                                                {selectedRecipes.length > 0 && (
                                                    <TouchEnhancedButton
                                                        onClick={handleClearAll}
                                                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                                                    >
                                                        🗑️ Clear All
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
                                                            <div
                                                                className="w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin"/>
                                                            🔄 Generating...
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
                                    <div
                                        className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-8">
                                        🚨 {error}
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
                                                        <h3 className="text-xl font-semibold mb-2">No recipes
                                                            found</h3>
                                                        <p>Add some recipes first to generate shopping
                                                            lists.</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="text-5xl mb-4">🔍</div>
                                                        <h3 className="text-xl font-semibold mb-2">No recipes
                                                            match your filters</h3>
                                                        <p>Try adjusting your search criteria or clearing some
                                                            filters.</p>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <div
                                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                                                            <span
                                                                                className="text-xs text-gray-500 italic">
                                                                    +{recipe.tags.length - 4} more
                                                                </span>
                                                                        )}
                                                                    </p>
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
                                <Footer/>
                            </div>
                        </div>
                    </div>
                </FeatureGate>
            </div>
        </MobileOptimizedLayout>
    )
}