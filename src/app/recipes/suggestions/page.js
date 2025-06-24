'use client';
// file: /src/app/recipes/suggestions/page.js v7 - Enhanced with curated meal suggestions and loading modal

import { useSafeSession } from '@/hooks/useSafeSession';
import {useEffect, useState} from 'react';
import RecipeShoppingList from '@/components/recipes/RecipeShoppingList';
import {redirect} from 'next/navigation';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { getApiUrl } from '@/lib/api-config';
import React from 'react';

// Enhanced Flashy Loading Modal Component
const LoadingModal = ({ isOpen, progress, currentTask, inventory = [], recipes = [] }) => {
    if (!isOpen) return null;

    const getLoadingEmoji = () => {
        if (progress < 25) return "📋";
        if (progress < 50) return "🍽️";
        if (progress < 75) return "📖";
        return "🎉";
    };

    const getProgressMessage = () => {
        if (progress < 25) return "🔍 Scanning your pantry...";
        if (progress < 50) return "🍽️ Finding delicious possibilities...";
        if (progress < 75) return "📖 Matching recipes to ingredients...";
        if (progress < 100) return "🎯 Calculating perfect matches...";
        return "🎉 Ready to cook amazing meals!";
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-lg border border-gray-100">

                {/* Main Loading Spinner */}
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        {/* Outer spinning ring */}
                        <div className="w-20 h-20 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>

                        {/* Center emoji */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                                <span className="text-white text-xl">{getLoadingEmoji()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">
                    🔮 Doc Bear's Kitchen Magic
                </h3>

                {/* Current Task */}
                <div className="text-center mb-6">
                    <p className="text-gray-700 font-medium text-lg mb-2">{currentTask}</p>
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                        <span>✨</span>
                        <span>Powered by Doc Bear's culinary intelligence</span>
                        <span>✨</span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
                    <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                {/* Progress Percentage */}
                <div className="text-center mb-6">
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                        {Math.round(progress)}%
                    </div>
                    <div className="text-sm text-gray-600 font-medium">
                        {progress === 100 ? "🎊 Analysis Complete!" : "Processing..."}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600 mb-1">{inventory.length}</div>
                        <div className="text-xs text-gray-600 font-medium">Ingredients</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600 mb-1">{recipes.length}</div>
                        <div className="text-xs text-gray-600 font-medium">Recipes</div>
                    </div>
                </div>

                {/* Progress Message */}
                <div className="text-center">
                    <div className="text-sm text-gray-600 font-medium">
                        {getProgressMessage()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function RecipeSuggestions() {
    let session = null;
    let status = 'loading';

    try {
        const sessionResult = useSafeSession();
        session = sessionResult?.data || null;
        status = sessionResult?.status || 'loading';
    } catch (error) {
        session = null;
        status = 'unauthenticated';
    }

    // Existing state
    const [suggestions, setSuggestions] = useState([]);
    const [simpleMealSuggestions, setSimpleMealSuggestions] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [matchThreshold, setMatchThreshold] = useState(0.4);
    const [sortBy, setSortBy] = useState('match');
    const [showShoppingList, setShowShoppingList] = useState(null);
    const [showRecipeModal, setShowRecipeModal] = useState(null);
    const [loadingRecipe, setLoadingRecipe] = useState(false);
    const [activeTab, setActiveTab] = useState('curated');
    const [selectedCategory, setSelectedCategory] = useState('all');

    // New state for curated meals and loading
    const [curatedMeals, setCuratedMeals] = useState([]);
    const [curatedSuggestions, setCuratedSuggestions] = useState([]);
    const [showLoadingModal, setShowLoadingModal] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [currentLoadingTask, setCurrentLoadingTask] = useState('');

    // State to prevent auto-refresh on tab switches
    const [dataLoaded, setDataLoaded] = useState(false);

    // Existing meal templates (keeping for fallback)
    const mealTemplates = [
        {
            id: 'protein-starch-vegetable',
            name: 'Protein + Starch + Vegetable',
            description: 'Classic balanced meal',
            icon: '🍽️',
            requiredCategories: ['protein', 'starch', 'vegetable'],
            optionalCategories: ['sauce', 'gravy'],
            examples: ['Steak + Mashed Potatoes + Broccoli', 'Chicken + Rice + Green Beans']
        },
        {
            id: 'pasta-meal',
            name: 'Pasta Dish',
            description: 'Pasta-based meal',
            icon: '🍝',
            requiredCategories: ['pasta', 'sauce'],
            optionalCategories: ['protein', 'vegetable', 'cheese'],
            examples: ['Spaghetti + Marinara + Parmesan', 'Penne + Chicken + Broccoli']
        },
        {
            id: 'sandwich-meal',
            name: 'Sandwich/Wrap',
            description: 'Bread-based meal',
            icon: '🥪',
            requiredCategories: ['bread', 'protein'],
            optionalCategories: ['vegetable', 'cheese', 'condiment'],
            examples: ['Turkey Sandwich + Lettuce + Tomato', 'Grilled Cheese + Tomato Soup']
        },
        {
            id: 'rice-bowl',
            name: 'Rice Bowl',
            description: 'Rice-based bowl',
            icon: '🍚',
            requiredCategories: ['rice', 'protein'],
            optionalCategories: ['vegetable', 'sauce'],
            examples: ['Chicken Teriyaki Bowl', 'Beef and Broccoli Rice']
        }
    ];

    const recipeCategories = [
        {value: 'all', label: 'All Categories'},
        {value: 'seasonings', label: 'Seasonings'},
        {value: 'sauces', label: 'Sauces'},
        {value: 'salad-dressings', label: 'Salad Dressings'},
        {value: 'marinades', label: 'Marinades'},
        {value: 'ingredients', label: 'Basic Ingredients'},
        {value: 'entrees', label: 'Entrees'},
        {value: 'side-dishes', label: 'Side Dishes'},
        {value: 'soups', label: 'Soups'},
        {value: 'sandwiches', label: 'Sandwiches'},
        {value: 'appetizers', label: 'Appetizers'},
        {value: 'desserts', label: 'Desserts'},
        {value: 'breads', label: 'Breads'},
        {value: 'pizza-dough', label: 'Pizza Dough'},
        {value: 'specialty-items', label: 'Specialty Items'},
        {value: 'beverages', label: 'Beverages'},
        {value: 'breakfast', label: 'Breakfast'}
    ];

    // New state for pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [curatedCurrentPage, setCuratedCurrentPage] = useState(1);
    const [curatedItemsPerPage, setCuratedItemsPerPage] = useState(8);

    // Pagination options
    const perPageOptions = [
        { value: 5, label: '5 per page' },
        { value: 10, label: '10 per page' },
        { value: 20, label: '20 per page' },
        { value: 50, label: '50 per page' },
        { value: 100, label: '100 per page' }
    ];

    const curatedPerPageOptions = [
        { value: 4, label: '4 per page' },
        { value: 8, label: '8 per page' },
        { value: 12, label: '12 per page' },
        { value: 20, label: '20 per page' }
    ];

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/auth/signin');
        }
    }, [status]);

    useEffect(() => {
        // Only load data once when session is available and data hasn't been loaded
        if (session && !dataLoaded) {
            loadAllData();
        }
    }, [session, dataLoaded]);

    useEffect(() => {
        // Only regenerate suggestions if we have data and user changes filters
        // This prevents auto-refresh on tab switches
        if (dataLoaded && inventory.length > 0 && recipes.length > 0) {
            generateAllSuggestions();
        }
    }, [dataLoaded, matchThreshold, selectedCategory]);

    // Enhanced data loading with progress tracking
    const loadAllData = async () => {
        setShowLoadingModal(true);
        setLoadingProgress(0);
        setLoading(true);

        try {
            // Step 1: Load inventory
            setCurrentLoadingTask('Loading your inventory...');
            setLoadingProgress(10);

            const inventoryResponse = await fetch(getApiUrl('/api/inventory'));
            const inventoryData = await inventoryResponse.json();

            if (inventoryData.success) {
                setInventory(inventoryData.inventory);
                console.log('Loaded inventory items:', inventoryData.inventory.length);
            }

            setLoadingProgress(25);

            // Step 2: Load curated meals
            setCurrentLoadingTask('Loading curated meal suggestions...');

            const curatedResponse = await fetch(getApiUrl('/api/admin/meals?status=approved&limit=100'));
            const curatedData = await curatedResponse.json();

            if (curatedData.success) {
                setCuratedMeals(curatedData.meals);
                console.log('Loaded curated meals:', curatedData.meals.length);
            }

            setLoadingProgress(50);

            // Step 3: Load recipes
            setCurrentLoadingTask('Loading recipe database...');

            const recipesResponse = await fetch(getApiUrl('/api/recipes'));
            const recipesData = await recipesResponse.json();

            if (recipesData.success) {
                setRecipes(recipesData.recipes);
                console.log('Loaded recipes:', recipesData.recipes.length);
            }

            setLoadingProgress(75);

            // Step 4: Brief pause for processing message
            setCurrentLoadingTask('Analyzing meal possibilities...');
            await new Promise(resolve => setTimeout(resolve, 500));
            setLoadingProgress(100);

            // Set data loaded flag to prevent auto-refresh
            setDataLoaded(true);

        } catch (error) {
            console.error('Error loading data:', error);
            setCurrentLoadingTask('Error loading data. Please try again.');
        } finally {
            // Hide loading modal after a brief delay
            setTimeout(() => {
                setShowLoadingModal(false);
                setLoading(false);
            }, 500);
        }
    };

    // Comprehensive ingredient variations - covers real scanning/entry variations
    const INGREDIENT_VARIATIONS = {
        // BASIC INGREDIENTS - Most common variations
        'eggs': [
            'egg', 'large eggs', 'extra large eggs', 'jumbo eggs', 'medium eggs', 'small eggs',
            'fresh eggs', 'whole eggs', 'large white eggs', 'brown eggs', 'white eggs',
            'eggs (extra large)', 'eggs (large)', 'eggs (jumbo)', 'grade a eggs',
            'cage free eggs', 'free range eggs', 'organic eggs', 'pasture raised eggs'
        ],
        'egg': [
            'eggs', 'large egg', 'extra large egg', 'fresh egg', 'whole egg'
        ],

        'flour': [
            'all purpose flour', 'all-purpose flour', 'plain flour', 'white flour',
            'unbleached flour', 'bleached flour', 'enriched flour', 'wheat flour',
            'flour (all purpose)', 'ap flour', 'general purpose flour', 'regular flour',
            'enriched wheat flour', 'unbleached all purpose flour'
        ],
        'all purpose flour': ['flour', 'all-purpose flour', 'plain flour', 'ap flour'],
        'all-purpose flour': ['flour', 'all purpose flour', 'plain flour'],

        'sugar': [
            'white sugar', 'granulated sugar', 'cane sugar', 'pure cane sugar',
            'sugar (granulated)', 'granulated white sugar', 'table sugar',
            'refined sugar', 'crystalline sugar', 'regular sugar'
        ],
        'white sugar': ['sugar', 'granulated sugar', 'cane sugar'],
        'granulated sugar': ['sugar', 'white sugar', 'sugar (granulated)'],

        'milk': [
            'whole milk', '2% milk', '1% milk', 'skim milk', 'fat free milk',
            'vitamin d milk', 'reduced fat milk', 'low fat milk', 'nonfat milk',
            'milk (whole)', 'milk (2%)', 'fresh milk', 'dairy milk'
        ],
        'whole milk': ['milk', 'vitamin d milk', 'milk (whole)'],
        '2% milk': ['milk', 'reduced fat milk', 'milk (2%)'],

        // REGULAR BUTTER (NO VEGAN CROSSOVER)
        'butter': [
            'unsalted butter', 'salted butter', 'sweet cream butter', 'dairy butter',
            'butter (unsalted)', 'butter (salted)', 'real butter', 'churned butter'
        ],
        'unsalted butter': ['butter', 'sweet cream butter'],
        'salted butter': ['butter'],

        // REGULAR BEEF (NO VEGAN CROSSOVER)
        'beef': [
            'ground beef', 'beef chuck', 'beef sirloin', 'lean beef', 'beef roast',
            'beef steak', 'hamburger', 'ground chuck', 'lean ground beef'
        ],
        'ground beef': ['beef', 'hamburger', 'ground chuck', 'lean ground beef'],

        // REGULAR SAUSAGE (NO VEGAN CROSSOVER)
        'breakfast sausage': [
            'sausage', 'pork sausage', 'italian sausage', 'breakfast links',
            'sausage links', 'ground sausage'
        ],
        'sausage': ['breakfast sausage', 'pork sausage', 'italian sausage'],

        // HONEY
        'honey': [
            'raw honey', 'pure honey', 'natural honey', 'wildflower honey',
            'clover honey', 'organic honey', 'local honey', 'unfiltered honey'
        ],
        'raw honey': ['honey', 'pure honey', 'natural honey'],

        // WHITE PEPPER
        'white pepper': [
            'white pepper powder', 'ground white pepper', 'white peppercorns',
            'white pepper (ground)', 'powdered white pepper'
        ],
        'white pepper powder': ['white pepper', 'ground white pepper'],
        'ground white pepper': ['white pepper', 'white pepper powder'],

        // SEASONINGS
        'garlic': [
            'garlic cloves', 'garlic bulb', 'minced garlic', 'fresh garlic',
            'chopped garlic', 'garlic (fresh)', 'whole garlic', 'garlic head'
        ],
        'garlic cloves': ['garlic', 'fresh garlic', 'garlic bulb'],

        'onion': [
            'onions', 'yellow onion', 'white onion', 'sweet onion', 'cooking onion',
            'small onion', 'large onion', 'medium onion', 'onion (yellow)', 'onion (white)',
            'spanish onion', 'storage onion'
        ],
        'yellow onion': ['onion', 'onions', 'cooking onion'],

        'salt': ['table salt', 'sea salt', 'kosher salt', 'fine salt', 'iodized salt'],
        'pepper': ['black pepper', 'ground pepper', 'ground black pepper'],

        // BAKING INGREDIENTS
        'baking powder': [
            'double acting baking powder', 'aluminum free baking powder'
        ],
        'vanilla extract': [
            'pure vanilla extract', 'vanilla essence', 'vanilla flavoring'
        ]
    };

// 2. NEVER CROSS-MATCH ITEMS (CRITICAL FOR DIETARY RESTRICTIONS):
    const DIETARY_RESTRICTED_INGREDIENTS = {
        // Vegan ingredients should NEVER match non-vegan
        vegan: [
            'vegan butter', 'vegan beef', 'vegan sausage', 'vegan breakfast sausage',
            'vegan chicken', 'vegan cheese', 'vegan milk', 'plant butter',
            'plant beef', 'plant sausage', 'plant milk', 'dairy free butter',
            'dairy free milk', 'dairy free cheese', 'coconut milk', 'almond milk',
            'soy milk', 'oat milk', 'cashew milk'
        ],
        // Non-vegan ingredients should NEVER match vegan
        nonVegan: [
            'butter', 'beef', 'sausage', 'breakfast sausage', 'chicken', 'cheese',
            'milk', 'dairy butter', 'ground beef', 'pork sausage', 'whole milk',
            '2% milk', 'cheddar cheese', 'mozzarella cheese'
        ],
        // Specialty ingredients that need exact matches
        specialty: [
            'almond flour', 'coconut flour', 'cake flour', 'bread flour',
            'brown sugar', 'powdered sugar', 'buttermilk', 'heavy cream',
            'sour cream', 'cream cheese'
        ]
    };

// 3. ENHANCED NORMALIZATION WITH BETTER PARENTHESES HANDLING:
    function normalizeIngredientName(name) {
        if (!name || typeof name !== 'string') {
            return '';
        }

        return name
            .toLowerCase()
            .trim()
            // Remove parentheses and their contents FIRST
            .replace(/\([^)]*\)/g, '')
            // Remove brand names and common descriptors
            .replace(/\b(brand|organic|natural|pure|fresh|raw|whole|fine|coarse|ground|minced|chopped|sliced|diced|crushed|grated|shredded)\b/g, '')
            // Remove size descriptors
            .replace(/\b(small|medium|large|extra large|jumbo|mini)\b/g, '')
            // Remove packaging descriptors
            .replace(/\b(can|jar|bottle|bag|box|package|container|lb|oz|cups?|tbsp|tsp)\b/g, '')
            // Replace punctuation and hyphens with spaces
            .replace(/[^\w\s]/g, ' ')
            // Normalize multiple spaces
            .replace(/\s+/g, ' ')
            .trim();
    }

// 4. DIETARY RESTRICTION CHECKER:
    function isDietaryConflict(recipeIngredient, inventoryItem) {
        const recipeNorm = normalizeIngredientName(recipeIngredient);
        const inventoryNorm = normalizeIngredientName(inventoryItem);

        // Check if recipe asks for vegan but inventory is non-vegan
        const isRecipeVegan = DIETARY_RESTRICTED_INGREDIENTS.vegan.some(vegan =>
            recipeNorm.includes(normalizeIngredientName(vegan))
        );
        const isInventoryNonVegan = DIETARY_RESTRICTED_INGREDIENTS.nonVegan.some(nonVegan =>
            inventoryNorm.includes(normalizeIngredientName(nonVegan))
        );

        if (isRecipeVegan && isInventoryNonVegan) {
            console.log(`🚫 DIETARY CONFLICT: Recipe wants vegan "${recipeIngredient}" but inventory has non-vegan "${inventoryItem}"`);
            return true;
        }

        // Check if recipe asks for non-vegan but inventory is vegan
        const isRecipeNonVegan = DIETARY_RESTRICTED_INGREDIENTS.nonVegan.some(nonVegan =>
            recipeNorm.includes(normalizeIngredientName(nonVegan))
        );
        const isInventoryVegan = DIETARY_RESTRICTED_INGREDIENTS.vegan.some(vegan =>
            inventoryNorm.includes(normalizeIngredientName(vegan))
        );

        if (isRecipeNonVegan && isInventoryVegan) {
            console.log(`🚫 DIETARY CONFLICT: Recipe wants non-vegan "${recipeIngredient}" but inventory has vegan "${inventoryItem}"`);
            return true;
        }

        return false;
    }

// 5. IMPROVED MATCHING FUNCTION WITH DIETARY RESTRICTIONS:
    function findBestIngredientMatch(recipeIngredient, inventory) {
        const recipeName = recipeIngredient.name || recipeIngredient;
        const recipeNormalized = normalizeIngredientName(recipeName);

        console.log(`\n🔍 Looking for recipe ingredient: "${recipeName}"`);
        console.log(`📝 Normalized to: "${recipeNormalized}"`);

        // Step 1: Try exact match first
        for (const item of inventory) {
            const itemNormalized = normalizeIngredientName(item.name);

            // Check for dietary conflicts FIRST
            if (isDietaryConflict(recipeName, item.name)) {
                console.log(`🚫 SKIPPING: Dietary conflict between "${recipeName}" and "${item.name}"`);
                continue;
            }

            if (itemNormalized === recipeNormalized) {
                console.log(`✅ EXACT MATCH: "${item.name}" = "${recipeName}"`);
                return {
                    found: true,
                    inventoryItem: item,
                    matchType: 'exact',
                    confidence: 1.0
                };
            }
        }

        // Step 2: Try variation matching
        const recipeVariations = getIngredientVariations(recipeName);
        console.log(`🔄 Recipe variations:`, recipeVariations);

        for (const item of inventory) {
            // Check for dietary conflicts FIRST
            if (isDietaryConflict(recipeName, item.name)) {
                console.log(`🚫 SKIPPING: Dietary conflict between "${recipeName}" and "${item.name}"`);
                continue;
            }

            const itemVariations = getIngredientVariations(item.name);
            console.log(`🔄 Checking "${item.name}" variations:`, itemVariations);

            // Check if any recipe variation matches any inventory variation
            for (const recipeVar of recipeVariations) {
                for (const itemVar of itemVariations) {
                    if (recipeVar === itemVar && recipeVar.length > 2) {
                        console.log(`✅ VARIATION MATCH: "${item.name}" ↔ "${recipeName}" via "${recipeVar}"`);
                        return {
                            found: true,
                            inventoryItem: item,
                            matchType: 'variation',
                            confidence: 0.9
                        };
                    }
                }
            }
        }

        // Step 3: Try partial matching (contains) - with stricter validation
        for (const item of inventory) {
            // Check for dietary conflicts FIRST
            if (isDietaryConflict(recipeName, item.name)) {
                console.log(`🚫 SKIPPING: Dietary conflict between "${recipeName}" and "${item.name}"`);
                continue;
            }

            const itemNormalized = normalizeIngredientName(item.name);

            if (itemNormalized.includes(recipeNormalized) || recipeNormalized.includes(itemNormalized)) {
                // Make sure it's not a false positive AND not a dietary conflict
                if (isValidPartialMatch(recipeName, item.name)) {
                    console.log(`✅ PARTIAL MATCH: "${item.name}" ↔ "${recipeName}"`);
                    return {
                        found: true,
                        inventoryItem: item,
                        matchType: 'partial',
                        confidence: 0.7
                    };
                }
            }
        }

        console.log(`❌ NO MATCH found for: "${recipeName}"`);
        return {
            found: false,
            inventoryItem: null,
            matchType: null,
            confidence: 0
        };
    }

// 6. ENHANCED PARTIAL MATCH VALIDATION:
    function isValidPartialMatch(recipeIngredient, inventoryItem) {
        const recipeNorm = normalizeIngredientName(recipeIngredient);
        const inventoryNorm = normalizeIngredientName(inventoryItem);

        // First check for dietary conflicts
        if (isDietaryConflict(recipeIngredient, inventoryItem)) {
            return false;
        }

        // Avoid other false positives
        const problematicPairs = [
            ['buttermilk', 'milk'],
            ['buttermilk', 'butter'],
            ['brown sugar', 'sugar'],
            ['almond flour', 'flour'],
            ['coconut flour', 'flour'],
            ['cake flour', 'flour'],
            ['bread flour', 'flour'],
            ['self rising flour', 'flour'],
            ['powdered sugar', 'sugar'],
            ['confectioners sugar', 'sugar'],
            ['heavy cream', 'milk'],
            ['sour cream', 'cream'],
            ['cream cheese', 'cheese']
        ];

        for (const [ingredient1, ingredient2] of problematicPairs) {
            if ((recipeNorm.includes(ingredient1) && inventoryNorm.includes(ingredient2)) ||
                (recipeNorm.includes(ingredient2) && inventoryNorm.includes(ingredient1))) {
                return false;
            }
        }

        return true;
    }

// 7. KEEP EXISTING getIngredientVariations FUNCTION (unchanged):
    function getIngredientVariations(ingredient) {
        const normalized = normalizeIngredientName(ingredient);
        const variations = new Set([normalized]);

        // Add the original (for exact brand matches)
        variations.add(ingredient.toLowerCase().trim());

        // Check if this ingredient has defined variations
        if (INGREDIENT_VARIATIONS[normalized]) {
            INGREDIENT_VARIATIONS[normalized].forEach(variation => {
                variations.add(normalizeIngredientName(variation));
            });
        }

        // Check if this ingredient is a variation of something else
        for (const [base, variationList] of Object.entries(INGREDIENT_VARIATIONS)) {
            const normalizedVariations = variationList.map(v => normalizeIngredientName(v));
            if (normalizedVariations.includes(normalized)) {
                variations.add(base);
                normalizedVariations.forEach(v => variations.add(v));
                break;
            }
        }

        return Array.from(variations);
    }

// 8. ENHANCED DEBUG FUNCTION:
    function debugSpecificIngredient(recipeIngredientName, inventory) {
        console.log(`\n🔧 === DEBUGGING SPECIFIC INGREDIENT: "${recipeIngredientName}" ===`);

        const result = findBestIngredientMatch(recipeIngredientName, inventory);

        // Check what inventory items might conflict
        const conflictingItems = inventory.filter(item =>
            isDietaryConflict(recipeIngredientName, item.name)
        );

        const debugInfo = {
            recipeIngredient: recipeIngredientName,
            normalized: normalizeIngredientName(recipeIngredientName),
            variations: getIngredientVariations(recipeIngredientName),
            result: result,
            conflictingItems: conflictingItems.map(item => item.name),
            potentialMatches: inventory.filter(item => {
                const itemNorm = normalizeIngredientName(item.name);
                const recipeNorm = normalizeIngredientName(recipeIngredientName);
                return itemNorm.includes(recipeNorm) || recipeNorm.includes(itemNorm);
            }).map(item => ({
                name: item.name,
                normalized: normalizeIngredientName(item.name),
                hasConflict: isDietaryConflict(recipeIngredientName, item.name)
            }))
        };

        console.log('🔧 Debug info:', debugInfo);

        if (result.found) {
            console.log(`✅ MATCH FOUND: "${result.inventoryItem.name}" (${result.matchType}, confidence: ${result.confidence})`);
        } else {
            console.log(`❌ NO MATCH FOUND`);
            if (conflictingItems.length > 0) {
                console.log(`🚫 Conflicting items found:`, conflictingItems.map(item => item.name));
            }
            console.log(`🔍 Potential matches:`, debugInfo.potentialMatches);
        }

        return debugInfo;
    }

// 9. COMPREHENSIVE TEST FUNCTION TO ADD TO YOUR COMPONENT:
    const runComprehensiveDebugTest = () => {
        console.log('\n🔧 === COMPREHENSIVE DEBUG TEST ===');

        const testIngredients = [
            'flour',
            'sugar',
            'eggs',
            'milk',
            'honey',
            'white pepper powder',
            'butter',
            'vegan butter',
            'beef',
            'vegan beef',
            'breakfast sausage',
            'vegan breakfast sausage'
        ];

        testIngredients.forEach(ingredient => {
            debugSpecificIngredient(ingredient, inventory);
        });

        console.log('🔧 Comprehensive debug test complete!');
    };

    // Specialty ingredients that should NEVER cross-match
    const SPECIALTY_INGREDIENTS = [
        // Specialty flours (these are different ingredients, not variations)
        'almond flour', 'coconut flour', 'cake flour', 'bread flour', 'self rising flour',
        'whole wheat flour', 'gluten free flour', 'gluten-free flour', 'oat flour', 'rice flour',
        'buckwheat flour', 'spelt flour', 'rye flour',

        // Specialty sugars (these are different ingredients)
        'brown sugar', 'powdered sugar', 'confectioners sugar', 'coconut sugar', 'maple sugar',
        'turbinado sugar', 'demerara sugar', 'muscovado sugar', 'palm sugar',
        'swerve', 'erythritol', 'stevia', 'monk fruit', 'xylitol',

        // Alternative milks (these are different from dairy milk)
        'almond milk', 'oat milk', 'soy milk', 'coconut milk', 'rice milk', 'cashew milk',
        'hemp milk', 'pea milk', 'macadamia milk',

        // Compound dairy products (need exact matches)
        'buttermilk', 'sour cream', 'heavy cream', 'half and half', 'cream cheese',
        'whipping cream', 'clotted cream',

        // Vegan/diet-specific ingredients
        'vegan butter', 'vegan cheese', 'vegan milk', 'plant butter', 'earth balance',
        'dairy free', 'lactose free', 'sugar free', 'no sugar added', 'reduced sodium',

        // Specialty extracts
        'vanilla extract', 'almond extract', 'lemon extract', 'rum extract',

        // Specialty seasonings
        'garlic powder', 'onion powder', 'seasoning salt', 'herb seasoning',

        // Specialty baking ingredients
        'baking powder', 'baking soda', 'cream of tartar', 'xanthan gum',

        // Specialty nut butters
        'almond butter', 'cashew butter', 'sunflower seed butter',
        'natural peanut butter', 'organic peanut butter', 'no stir peanut butter'
    ];

    // Items that should NEVER match with anything else (specialty ingredients)
    const NEVER_MATCH_INGREDIENTS = [
        // Specialty flours
        'almond flour', 'coconut flour', 'cake flour', 'bread flour', 'self rising flour',
        'whole wheat flour', 'gluten free flour', 'gluten-free flour', 'oat flour', 'rice flour',

        // Specialty sugars
        'brown sugar', 'powdered sugar', 'confectioners sugar', 'coconut sugar', 'maple sugar',
        'swerve', 'swerve brown sugar', 'stevia', 'erythritol',

        // Specialty milks
        'almond milk', 'oat milk', 'soy milk', 'coconut milk', 'rice milk', 'cashew milk',

        // Compound ingredients that need exact matches
        'buttermilk', 'sour cream', 'heavy cream', 'half and half', 'cream cheese',

        // Dietary-specific ingredients
        'vegan butter', 'vegan cheese', 'vegan milk', 'vegan vanilla extract', 'vegan sausage',
        'plant butter', 'dairy free', 'gluten free', 'sugar free', 'no sugar added',

        // Specialty extracts and seasonings
        'vanilla extract', 'almond extract', 'lemon extract', 'garlic powder', 'onion powder',

        // Specialty baking ingredients
        'baking powder', 'baking soda', 'gluten-free baking powder', 'aluminum free baking powder',

        // Specialty nut butters
        'almond butter', 'cashew butter', 'no sugar added peanut butter', 'natural peanut butter'
    ];

    // Check if ingredient is a specialty item that shouldn't cross-match
    function isSpecialtyIngredient(ingredient) {
        const normalized = normalizeIngredientName(ingredient);

        return SPECIALTY_INGREDIENTS.some(specialty => {
            const specialtyNorm = normalizeIngredientName(specialty);
            // Use exact matching for specialty ingredients to avoid false positives
            return normalized === specialtyNorm ||
                normalized.includes(specialtyNorm) ||
                specialtyNorm.includes(normalized);
        });
    }

    // Get bidirectional variations for an ingredient
    function getBidirectionalVariations(ingredient) {
        const normalized = normalizeIngredientName(ingredient);
        const variations = new Set([normalized]);

        // If it's a specialty ingredient, only return exact matches
        if (isSpecialtyIngredient(ingredient)) {
            // For specialty ingredients, still allow exact matches with different formatting
            const original = ingredient.toLowerCase().trim();
            variations.add(original);
            return Array.from(variations);
        }

        // Check if this ingredient has defined variations
        if (INGREDIENT_VARIATIONS[normalized]) {
            INGREDIENT_VARIATIONS[normalized].forEach(variation => {
                variations.add(normalizeIngredientName(variation));
            });
        }

        // Check if this ingredient is a variation of a base ingredient
        for (const [base, variationList] of Object.entries(INGREDIENT_VARIATIONS)) {
            const normalizedVariations = variationList.map(v => normalizeIngredientName(v));
            if (normalizedVariations.includes(normalized)) {
                variations.add(base);
                normalizedVariations.forEach(v => variations.add(v));
                break; // Stop after first match to prevent cross-contamination
            }
        }

        return Array.from(variations);
    }


    // Get ONLY explicitly defined variations for common ingredients
    function getExactVariations(ingredient) {
        const normalized = normalizeIngredientName(ingredient);

        // If it's a specialty ingredient, return only itself
        if (isSpecialtyIngredient(ingredient)) {
            return [normalized];
        }

        // Find exact variations only
        if (INGREDIENT_VARIATIONS[normalized]) {
            return [normalized, ...INGREDIENT_VARIATIONS[normalized].map(v => normalizeIngredientName(v))];
        }

        // Check if this ingredient is a variation of something else
        for (const [base, variations] of Object.entries(INGREDIENT_VARIATIONS)) {
            const normalizedVariations = variations.map(v => normalizeIngredientName(v));
            if (normalizedVariations.includes(normalized)) {
                return [base, ...normalizedVariations, normalized];
            }
        }

        // If no variations found, return only itself
        return [normalized];
    }

    // New function to generate all suggestions
    const generateAllSuggestions = async () => {
        console.log('=== GENERATING ALL SUGGESTIONS ===');

        // Generate curated meal suggestions first (these are higher quality)
        const curatedSuggestions = generateCuratedMealSuggestions();
        setCuratedSuggestions(curatedSuggestions);

        // Generate traditional recipe suggestions
        generateRecipeSuggestions();

        // Generate simple meal suggestions (fallback templates)
        generateSimpleMealSuggestions();
    };

    // NEW: Generate curated meal suggestions
    const generateCuratedMealSuggestions = () => {
        console.log('=== GENERATING CURATED MEAL SUGGESTIONS ===');
        console.log('Available curated meals:', curatedMeals.length);
        console.log('Available inventory items:', inventory.length);

        if (curatedMeals.length === 0 || inventory.length === 0) {
            return [];
        }

        const suggestions = curatedMeals.map(meal => {
            const analysis = analyzeCuratedMeal(meal, inventory);
            return {
                ...meal,
                analysis,
                type: 'curated'
            };
        }).filter(meal => meal.analysis.canMake || meal.analysis.matchPercentage >= 0.5) // Show if we can make it or close
            .sort((a, b) => {
                // Sort by match percentage, then by completeness
                if (a.analysis.canMake !== b.analysis.canMake) {
                    return b.analysis.canMake - a.analysis.canMake;
                }
                return b.analysis.matchPercentage - a.analysis.matchPercentage;
            });

        console.log('Generated curated meal suggestions:', suggestions.length);
        return suggestions;
    };

    // NEW: Analyze curated meal against inventory
    const analyzeCuratedMeal = (meal, inventory) => {
        console.log(`\n=== ANALYZING CURATED MEAL: ${meal.name} ===`);

        const availableComponents = [];
        const missingComponents = [];
        let requiredAvailable = 0;
        let requiredTotal = 0;

        meal.components.forEach(component => {
            if (component.required) {
                requiredTotal++;
            }

            // Check if we have this component in inventory
            const matchResult = findComponentInInventory(component, inventory);

            if (matchResult.found) {
                availableComponents.push({
                    ...component,
                    inventoryItem: matchResult.inventoryItem,
                    matchType: matchResult.matchType
                });

                if (component.required) {
                    requiredAvailable++;
                }
            } else {
                missingComponents.push(component);
            }
        });

        const totalComponents = meal.components.length;
        const matchPercentage = totalComponents > 0 ? (availableComponents.length / totalComponents) : 0;
        const canMake = requiredAvailable >= requiredTotal;

        console.log(`Results: ${availableComponents.length}/${totalComponents} components (${Math.round(matchPercentage * 100)}%)`);
        console.log(`Required: ${requiredAvailable}/${requiredTotal} - Can make: ${canMake}`);

        return {
            matchPercentage,
            availableComponents,
            missingComponents,
            canMake,
            requiredMissing: requiredTotal - requiredAvailable,
            estimatedTime: meal.estimatedTime,
            difficulty: meal.difficulty
        };
    };

    // NEW: Find component in inventory (similar to recipe ingredient matching)
    const findComponentInInventory = (component, inventory) => {
        const componentName = component.itemName.toLowerCase().trim();

        console.log(`\n--- Looking for component: "${component.itemName}" (category: ${component.category}) ---`);

        // 1. EXACT MATCH
        for (const item of inventory) {
            const itemName = item.name.toLowerCase().trim();
            if (itemName === componentName) {
                console.log(`✅ EXACT MATCH: "${item.name}"`);
                return {
                    found: true,
                    inventoryItem: item,
                    matchType: 'exact'
                };
            }
        }

        // 2. PARTIAL MATCH (contains)
        for (const item of inventory) {
            const itemName = item.name.toLowerCase().trim();

            // Check if item name contains component name or vice versa
            if (itemName.includes(componentName) || componentName.includes(itemName)) {
                // Additional validation based on component category
                if (isValidCategoryMatch(item, component.category)) {
                    console.log(`✅ PARTIAL MATCH: "${item.name}" matches "${component.itemName}"`);
                    return {
                        found: true,
                        inventoryItem: item,
                        matchType: 'partial'
                    };
                }
            }
        }

        // 3. CATEGORY-BASED SMART MATCHING
        for (const item of inventory) {
            if (isSmartCategoryMatch(item, component)) {
                console.log(`✅ SMART MATCH: "${item.name}" for ${component.category} component "${component.itemName}"`);
                return {
                    found: true,
                    inventoryItem: item,
                    matchType: 'category'
                };
            }
        }

        // 4. CHECK ALTERNATIVES
        if (component.alternatives && component.alternatives.length > 0) {
            for (const alternative of component.alternatives) {
                const altName = alternative.toLowerCase().trim();
                for (const item of inventory) {
                    const itemName = item.name.toLowerCase().trim();
                    if (itemName.includes(altName) || altName.includes(itemName)) {
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

        console.log(`❌ NO MATCH found for: "${component.itemName}"`);
        return {
            found: false,
            inventoryItem: null,
            matchType: null
        };
    };

    // NEW: Category validation helper
    const isValidCategoryMatch = (inventoryItem, componentCategory) => {
        const itemName = inventoryItem.name.toLowerCase();
        const itemCategory = inventoryItem.category ? inventoryItem.category.toLowerCase() : '';

        switch (componentCategory) {
            case 'protein':
                return itemCategory.includes('meat') ||
                    itemCategory.includes('poultry') ||
                    itemCategory.includes('fish') ||
                    itemCategory.includes('beef') ||
                    itemCategory.includes('pork') ||
                    itemName.includes('chicken') ||
                    itemName.includes('beef') ||
                    itemName.includes('pork') ||
                    itemName.includes('fish') ||
                    itemName.includes('turkey') ||
                    itemName.includes('tofu') ||
                    itemName.includes('beans');

            case 'starch':
                return itemCategory.includes('grain') ||
                    itemName.includes('rice') ||
                    itemName.includes('potato') ||
                    itemName.includes('pasta') ||
                    itemName.includes('bread') ||
                    itemName.includes('quinoa');

            case 'vegetable':
                return itemCategory.includes('vegetable') ||
                    itemName.includes('broccoli') ||
                    itemName.includes('carrot') ||
                    itemName.includes('bean') ||
                    itemName.includes('spinach') ||
                    itemName.includes('corn');

            case 'dairy':
                return itemCategory.includes('dairy') ||
                    itemCategory.includes('cheese') ||
                    itemName.includes('cheese') ||
                    itemName.includes('milk') ||
                    itemName.includes('butter');

            case 'sauce':
                return itemCategory.includes('sauce') ||
                    itemCategory.includes('condiment') ||
                    itemName.includes('sauce') ||
                    itemName.includes('gravy');

            case 'fruit':
                return itemCategory.includes('fruit') ||
                    itemName.includes('apple') ||
                    itemName.includes('banana') ||
                    itemName.includes('berry');

            case 'condiment':
                return itemCategory.includes('condiment') ||
                    itemName.includes('mustard') ||
                    itemName.includes('ketchup') ||
                    itemName.includes('mayo');

            default:
                return false;
        }
    };

    // NEW: Smart category matching
    const isSmartCategoryMatch = (inventoryItem, component) => {
        const itemName = inventoryItem.name.toLowerCase();
        const componentName = component.itemName.toLowerCase();

        // Define smart substitutions by category
        const smartMatches = {
            protein: {
                'ground beef': ['hamburger', 'ground chuck'],
                'chicken breast': ['chicken breasts', 'boneless chicken'],
                'chicken': ['poultry', 'chicken breast', 'chicken thigh']
            },
            starch: {
                'mashed potatoes': ['potato', 'potatoes'],
                'rice': ['white rice', 'brown rice', 'jasmine rice'],
                'pasta': ['spaghetti', 'penne', 'macaroni']
            },
            vegetable: {
                'green beans': ['beans', 'string beans'],
                'broccoli': ['frozen broccoli', 'fresh broccoli']
            }
        };

        const categoryMatches = smartMatches[component.category];
        if (categoryMatches && categoryMatches[componentName]) {
            return categoryMatches[componentName].some(match =>
                itemName.includes(match) || match.includes(itemName)
            );
        }

        return false;
    };

    // Existing functions (keeping for backward compatibility)
    const generateRecipeSuggestions = () => {
        console.log('=== GENERATING RECIPE SUGGESTIONS ===');

        let filteredRecipes = recipes;

        if (selectedCategory !== 'all') {
            filteredRecipes = recipes.filter(recipe => recipe.category === selectedCategory);
        }

        const suggestions = filteredRecipes
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

        console.log('Generated recipe suggestions:', suggestions.length);
        setSuggestions(suggestions);
    };

    // Keep existing template-based meal generation as fallback
    const generateSimpleMealSuggestions = () => {
        console.log('=== GENERATING SIMPLE MEAL SUGGESTIONS (FALLBACK) ===');

        // Only generate if we have few curated suggestions
        if (curatedSuggestions.length >= 3) {
            console.log('Skipping template meals - sufficient curated meals available');
            setSimpleMealSuggestions([]);
            return;
        }

        // Use existing logic but simplified
        const categorizedInventory = categorizeInventoryItems(inventory);

        const suggestions = mealTemplates.map(template => {
            const suggestion = generateMealFromTemplate(template, categorizedInventory);
            return suggestion;
        }).filter(suggestion => suggestion && suggestion.canMake);

        console.log('Generated simple meal suggestions:', suggestions.length);
        setSimpleMealSuggestions(suggestions);
    };

    // Keep existing helper functions (categorizeInventoryItems, etc.) for fallback system
    const categorizeInventoryItems = (inventory) => {
        // Simplified version of existing categorization
        const categorized = {
            protein: [],
            starch: [],
            vegetable: [],
            pasta: [],
            rice: [],
            bread: [],
            sauce: [],
            cheese: []
        };

        inventory.forEach(item => {
            const itemName = item.name.toLowerCase();
            const category = item.category ? item.category.toLowerCase() : '';

            // Basic categorization logic
            if (category.includes('meat') || category.includes('poultry') ||
                itemName.includes('chicken') || itemName.includes('beef')) {
                categorized.protein.push(item);
            } else if (category.includes('vegetable') || itemName.includes('broccoli') ||
                itemName.includes('carrot')) {
                categorized.vegetable.push(item);
            } else if (itemName.includes('rice')) {
                categorized.rice.push(item);
                categorized.starch.push(item);
            } else if (itemName.includes('pasta') || itemName.includes('spaghetti')) {
                categorized.pasta.push(item);
                categorized.starch.push(item);
            } else if (itemName.includes('potato')) {
                categorized.starch.push(item);
            } else if (itemName.includes('bread')) {
                categorized.bread.push(item);
            } else if (itemName.includes('cheese')) {
                categorized.cheese.push(item);
            } else if (itemName.includes('sauce')) {
                categorized.sauce.push(item);
            }
        });

        return categorized;
    };

    const generateMealFromTemplate = (template, categorizedInventory) => {
        // Simplified template meal generation
        const components = [];
        let canMake = true;

        for (const category of template.requiredCategories) {
            const availableItems = categorizedInventory[category] || [];
            if (availableItems.length > 0) {
                const selectedItem = availableItems[Math.floor(Math.random() * availableItems.length)];
                components.push({
                    category,
                    item: selectedItem,
                    required: true
                });
            } else {
                canMake = false;
            }
        }

        return canMake ? {
            id: template.id,
            template,
            components,
            canMake: true,
            estimatedTime: 30
        } : null;
    };

    // Create a standardized key for ingredient combination and matching
    function createIngredientKey(ingredient) {
        const normalized = normalizeIngredientName(ingredient);

        // Remove common descriptors that shouldn't prevent matching
        const cleaned = normalized
            .replace(/\b(fresh|dried|minced|chopped|sliced|diced|whole|ground|crushed|grated|shredded|toasted|crumbled|cooked)\b/g, '')
            .replace(/\b(small|medium|large|extra large)\b/g, '')
            .replace(/\b(can|jar|bottle|bag|box|package)\b/g, '')
            .replace(/\b(of|the|and|or|into|cut)\b/g, '')
            .replace(/\b(matchsticks|strips|florets)\b/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        // IMPROVED: Better pasta handling - normalize all pasta types to 'pasta'
        if (cleaned.includes('pasta') ||
            cleaned.includes('spaghetti') ||
            cleaned.includes('penne') ||
            cleaned.includes('fettuccine') ||
            cleaned.includes('fusilli') ||
            cleaned.includes('rigatoni') ||
            cleaned.includes('linguine') ||
            cleaned.includes('angel hair') ||
            cleaned.includes('bow tie') ||
            cleaned.includes('farfalle') ||
            cleaned.includes('macaroni') ||
            cleaned.includes('shells') ||
            cleaned.includes('rotini') ||
            cleaned.includes('gemelli') ||
            cleaned.includes('orzo')) {
            return 'pasta';
        }

        // Handle specific cases for better matching
        if (cleaned.includes('red bell pepper')) return 'red-bell-pepper';
        if (cleaned.includes('green bell pepper')) return 'green-bell-pepper';
        if (cleaned.includes('bell pepper') && !cleaned.includes('red') && !cleaned.includes('green')) return 'bell-pepper';
        if (cleaned.includes('green onion') || cleaned.includes('scallion')) return 'green-onion';
        if (cleaned.includes('red pepper flakes')) return 'red-pepper-flakes';
        if (cleaned.includes('garlic')) return 'garlic';
        if (cleaned.includes('onion') && !cleaned.includes('green') && !cleaned.includes('red')) return 'onion';
        if (cleaned.includes('tomato sauce') || cleaned.includes('marinara')) return 'tomato-sauce';
        if (cleaned.includes('diced tomatoes')) return 'diced-tomatoes';
        if (cleaned.includes('shredded mozzarella')) return 'shredded-mozzarella';
        if (cleaned.includes('mozzarella') && !cleaned.includes('shredded')) return 'mozzarella';
        if (cleaned.includes('cheddar')) return 'cheddar';
        if (cleaned.includes('sesame seeds')) return 'sesame-seeds';
        if (cleaned.includes('vegetable oil')) return 'vegetable-oil';
        if (cleaned.includes('olive oil')) return 'olive-oil';
        if (cleaned.includes('soy sauce')) return 'soy-sauce';
        if (cleaned.includes('white wine')) return 'white-wine';
        if (cleaned.includes('italian sausage')) return 'italian-sausage';
        if (cleaned.includes('chicken breast')) return 'chicken-breast';
        if (cleaned.includes('beef sirloin')) return 'beef-sirloin';
        if (cleaned.includes('lasagna noodles')) return 'lasagna-noodles';
        if (cleaned.includes('pappardelle')) return 'pappardelle';
        if (cleaned.includes('cornstarch') || cleaned.includes('corn starch')) return 'cornstarch';
        if (cleaned.includes('chives')) return 'chives';
        if (cleaned.includes('broccoli')) return 'broccoli';
        if (cleaned.includes('pineapple')) return 'pineapple';
        if (cleaned.includes('carrots')) return 'carrots';

        // CRITICAL: Handle eggs specifically
        if (cleaned.includes('eggs') || cleaned === 'egg') return 'eggs';

        // CRITICAL: Handle flour specifically
        if (cleaned.includes('flour')) return 'flour';

        return cleaned;
    }

    // Check if ingredient is vegan/plant-based (simplified version)
    function isVeganOrPlantBased(name) {
        const normalizedName = normalizeIngredientName(name);
        const veganKeywords = [
            'vegan', 'plant-based', 'plant based', 'vegetarian', 'dairy-free',
            'dairy free', 'non-dairy', 'non dairy', 'almond', 'soy', 'oat',
            'coconut', 'cashew', 'rice milk', 'hemp', 'pea protein'
        ];

        return veganKeywords.some(keyword => normalizedName.includes(keyword));
    }

    // Check if ingredient is animal product (simplified version)
    function isAnimalProduct(name) {
        const normalizedName = normalizeIngredientName(name);
        const animalKeywords = [
            'butter', 'milk', 'cheese', 'cream', 'yogurt', 'sour cream',
            'buttermilk', 'heavy cream', 'half and half', 'dairy',
            'beef', 'pork', 'chicken', 'turkey', 'fish', 'salmon',
            'bacon', 'sausage', 'ham', 'ground beef', 'ground turkey',
            'eggs', 'egg', 'honey', 'gelatin', 'lard'
        ];

        // Don't mark as animal product if it's explicitly vegan
        if (isVeganOrPlantBased(normalizedName)) {
            return false;
        }

        return animalKeywords.some(keyword => normalizedName.includes(keyword));
    }

    // Additional validation for ingredient matching
    function isValidIngredientMatch(recipeIngredient, inventoryItem) {
        const recipeName = normalizeIngredientName(recipeIngredient);
        const itemName = normalizeIngredientName(inventoryItem);

        // Specific problematic cases to avoid
        const problematicPairs = [
            // Butter variations
            { recipe: 'vegan butter', inventory: 'butter' },
            { recipe: 'plant butter', inventory: 'butter' },
            { recipe: 'dairy free butter', inventory: 'butter' },

            // Milk variations
            { recipe: 'vegan milk', inventory: 'milk' },
            { recipe: 'almond milk', inventory: 'milk' },
            { recipe: 'soy milk', inventory: 'milk' },
            { recipe: 'oat milk', inventory: 'milk' },
            { recipe: 'plant milk', inventory: 'milk' },

            // Buttermilk (very specific)
            { recipe: 'vegan buttermilk', inventory: 'butter' },
            { recipe: 'vegan buttermilk', inventory: 'milk' },
            { recipe: 'buttermilk', inventory: 'butter' },
            { recipe: 'buttermilk', inventory: 'milk' },

            // Meat variations
            { recipe: 'vegan sausage', inventory: 'sausage' },
            { recipe: 'plant sausage', inventory: 'sausage' },
            { recipe: 'vegan ground beef', inventory: 'ground beef' },
            { recipe: 'plant ground', inventory: 'ground beef' },

            // Cheese variations
            { recipe: 'vegan cheese', inventory: 'cheese' },
            { recipe: 'dairy free cheese', inventory: 'cheese' },
            { recipe: 'plant cheese', inventory: 'cheese' }
        ];

        // Check if this is a problematic pair
        for (const pair of problematicPairs) {
            if ((recipeName.includes(pair.recipe) && itemName.includes(pair.inventory)) ||
                (recipeName.includes(pair.inventory) && itemName.includes(pair.recipe))) {
                return false;
            }
        }

        // Additional check: if recipe asks for a compound ingredient (like buttermilk)
        // don't match with its components (butter + milk)
        const compoundIngredients = ['buttermilk', 'sour cream', 'heavy cream', 'half and half'];
        for (const compound of compoundIngredients) {
            if (recipeName.includes(compound) && !itemName.includes(compound)) {
                return false;
            }
        }

        return true;
    }

    // Smart substitution matching for valid alternatives
    function findSmartSubstitution(recipeIngredient, inventoryItem) {
        const recipeName = normalizeIngredientName(recipeIngredient);
        const itemName = normalizeIngredientName(inventoryItem);

        // Define valid substitutions (only non-vegan to non-vegan, vegan to vegan)
        const substitutions = {
            // Cooking oils (generally interchangeable)
            'vegetable oil': ['canola oil', 'sunflower oil', 'safflower oil'],
            'canola oil': ['vegetable oil', 'sunflower oil'],
            'olive oil': ['avocado oil'],

            // Vinegars
            'white vinegar': ['apple cider vinegar', 'rice vinegar'],
            'apple cider vinegar': ['white vinegar', 'rice vinegar'],

            // Sugars
            'white sugar': ['granulated sugar', 'cane sugar', 'sugar', 'sugar (granulated)'],
            'brown sugar': ['coconut sugar', 'raw sugar', 'dark brown sugar', 'light brown sugar'],

            // Flours (basic)
            'all purpose flour': ['plain flour', 'white flour', 'flour'],
            'plain flour': ['all purpose flour'],

            // Spices and seasonings
            'garlic powder': ['granulated garlic'],
            'onion powder': ['granulated onion'],

            // Only safe dairy substitutions (within same category)
            'whole milk': ['2% milk', 'skim milk', 'vitamin d milk'],
            '2% milk': ['whole milk', 'skim milk'],
            'skim milk': ['2% milk', 'whole milk']
        };

        // Check if recipe ingredient has valid substitutions
        for (const [ingredient, alternatives] of Object.entries(substitutions)) {
            if (recipeName.includes(ingredient)) {
                for (const alt of alternatives) {
                    if (itemName.includes(alt)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    // Updated analyzeRecipe function with enhanced logging
    function analyzeRecipe(recipe, inventory) {
        if (!recipe.ingredients || recipe.ingredients.length === 0) {
            return {
                matchPercentage: 0,
                availableIngredients: [],
                missingIngredients: [],
                canMake: false
            };
        }

        const availableIngredients = [];
        const missingIngredients = [];

        console.log(`\n🍳 === ANALYZING RECIPE: ${recipe.title} ===`);
        console.log(`📋 Recipe has ${recipe.ingredients.length} ingredients`);
        console.log(`🥫 Inventory has ${inventory.length} items`);

        recipe.ingredients.forEach((recipeIngredient, index) => {
            console.log(`\n[${index + 1}/${recipe.ingredients.length}] Processing: "${recipeIngredient.name}"`);

            const matchResult = findBestIngredientMatch(recipeIngredient, inventory);

            if (matchResult.found) {
                console.log(`✅ MATCHED: "${recipeIngredient.name}" → "${matchResult.inventoryItem.name}" (${matchResult.matchType})`);
                availableIngredients.push({
                    ...recipeIngredient,
                    inventoryItem: matchResult.inventoryItem,
                    matchType: matchResult.matchType,
                    confidence: matchResult.confidence
                });
            } else {
                console.log(`❌ MISSING: "${recipeIngredient.name}"`);
                missingIngredients.push(recipeIngredient);
            }
        });

        const matchPercentage = recipe.ingredients.length > 0 ?
            (availableIngredients.length / recipe.ingredients.length) : 0;
        const canMake = availableIngredients.length >= Math.ceil(recipe.ingredients.length * 0.8);

        const summary = {
            matchPercentage,
            availableIngredients,
            missingIngredients,
            canMake,
            totalIngredients: recipe.ingredients.length,
            availableCount: availableIngredients.length,
            missingCount: missingIngredients.length
        };

        console.log(`\n📊 === RECIPE ANALYSIS SUMMARY ===`);
        console.log(`Available: ${summary.availableCount}/${summary.totalIngredients} (${Math.round(matchPercentage * 100)}%)`);
        console.log(`Can make: ${canMake}`);
        console.log(`Available ingredients:`, availableIngredients.map(ing => `"${ing.name}" → "${ing.inventoryItem.name}"`));
        console.log(`Missing ingredients:`, missingIngredients.map(ing => `"${ing.name}"`));

        return summary;
    }

    // Keep existing utility functions
    const loadRecipeDetails = async (recipeId) => {
        setLoadingRecipe(true);
        try {
            const response = await fetch(getApiUrl(`/api/recipes/${recipeId}`));
            const data = await response.json();

            if (data.success) {
                setShowRecipeModal(data.recipe);
            }
        } catch (error) {
            console.error('Error loading recipe details:', error);
        } finally {
            setLoadingRecipe(false);
        }
    };

    const getMatchColor = (percentage) => {
        if (percentage >= 0.9) return 'text-green-600 bg-green-100';
        if (percentage >= 0.7) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    const getDifficultyColor = (difficulty) => {
        const colors = {
            easy: 'bg-green-100 text-green-800',
            medium: 'bg-yellow-100 text-yellow-800',
            hard: 'bg-red-100 text-red-800'
        };
        return colors[difficulty] || colors.medium;
    };

    const formatCookTime = (minutes) => {
        if (!minutes) return 'Not specified';
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    // Pagination helper functions
    const getPaginatedData = (data, currentPage, itemsPerPage) => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return data.slice(startIndex, endIndex);
    };

    const getTotalPages = (totalItems, itemsPerPage) => {
        return Math.ceil(totalItems / itemsPerPage);
    };

    const handlePageChange = (newPage, type = 'recipes') => {
        if (type === 'curated') {
            setCuratedCurrentPage(newPage);
            // Scroll to top of curated results
            document.getElementById('curated-results')?.scrollIntoView({ behavior: 'smooth' });
        } else {
            setCurrentPage(newPage);
            // Scroll to top of recipe results
            document.getElementById('recipes-results')?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleItemsPerPageChange = (newItemsPerPage, type = 'recipes') => {
        if (type === 'curated') {
            setCuratedItemsPerPage(newItemsPerPage);
            setCuratedCurrentPage(1); // Reset to first page
        } else {
            setItemsPerPage(newItemsPerPage);
            setCurrentPage(1); // Reset to first page
        }
    };

    // Loading and auth checks
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
        <MobileOptimizedLayout>
            {/* Loading Modal */}
            <LoadingModal
                isOpen={showLoadingModal}
                progress={loadingProgress}
                currentTask={currentLoadingTask}
                inventory={inventory}
                recipes={recipes}
            />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">What Can I Make?</h1>
                        <p className="text-gray-600">Smart meal suggestions and recipe matches based on your inventory</p>
                    </div>
                    <div>
                        <TouchEnhancedButton
                            onClick={loadAllData}
                            disabled={showLoadingModal}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-100"
                        >
                            {showLoadingModal ? '🔄 Analyzing...' : '🔄 Refresh'}
                        </TouchEnhancedButton>
                    </div>
                </div>

                {/* Stats and Controls */}
                <div className="bg-white shadow rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                        <div>
                            <div className="text-sm font-medium text-gray-700">Inventory Items</div>
                            <div className="text-2xl font-bold text-indigo-600">{inventory.length}</div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-700">Curated Meals</div>
                            <div className="text-2xl font-bold text-purple-600">{curatedMeals.length}</div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-700">Total Recipes</div>
                            <div className="text-2xl font-bold text-green-600">{recipes.length}</div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Recipe Match: {Math.round(matchThreshold * 100)}%
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Recipe Category</label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                {recipeCategories.map(category => (
                                    <option key={category.value} value={category.value}>
                                        {category.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Enhanced Tab Navigation */}
                <div className="bg-white shadow rounded-lg">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            <TouchEnhancedButton
                                onClick={() => setActiveTab('curated')}
                                className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm ${
                                    activeTab === 'curated'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                ⭐ Curated Meals ({curatedSuggestions.length})
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={() => setActiveTab('recipes')}
                                className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm ${
                                    activeTab === 'recipes'
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                📖 Recipe Matches ({suggestions.length})
                            </TouchEnhancedButton>
                            {simpleMealSuggestions.length > 0 && (
                                <TouchEnhancedButton
                                    onClick={() => setActiveTab('simple')}
                                    className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm ${
                                        activeTab === 'simple'
                                            ? 'border-indigo-500 text-indigo-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    🍽️ Simple Ideas ({simpleMealSuggestions.length})
                                </TouchEnhancedButton>
                            )}
                        </nav>
                    </div>

                    <div className="px-4 py-5 sm:p-6">
                        {/* Curated Meal Suggestions */}
                        {activeTab === 'curated' && (
                            <div id="curated-results">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                                        ⭐ Curated Meal Suggestions ({curatedSuggestions.length})
                                    </h3>
                                    {curatedSuggestions.length > 4 && (
                                        <div className="flex items-center space-x-3">
                                            <label className="text-sm text-gray-700">Show:</label>
                                            <select
                                                value={curatedItemsPerPage}
                                                onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value), 'curated')}
                                                className="border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                {curatedPerPageOptions.map(option => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {loading ? (
                                    <div className="text-center py-8">
                                        <div className="text-gray-500">Loading meal suggestions...</div>
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
                                ) : curatedSuggestions.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="text-gray-500 mb-4">
                                            No curated meals match your current inventory
                                        </div>
                                        <div className="text-sm text-gray-400 mb-4">
                                            Try adding more basic ingredients like proteins, starches, and vegetables
                                        </div>
                                        <TouchEnhancedButton
                                            onClick={() => setActiveTab('recipes')}
                                            className="text-indigo-600 hover:text-indigo-900 text-sm"
                                        >
                                            Check recipe suggestions instead
                                        </TouchEnhancedButton>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {getPaginatedData(curatedSuggestions, curatedCurrentPage, curatedItemsPerPage).map((meal, index) => (
                                            <div key={meal._id} className="border border-gray-200 rounded-lg p-6 bg-gradient-to-r from-purple-50 to-indigo-50">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-3 mb-2">
                                                            <h4 className="text-xl font-semibold text-gray-900">
                                                                {meal.name}
                                                            </h4>
                                                            <div
                                                                className={`px-3 py-1 rounded-full text-sm font-medium ${getMatchColor(meal.analysis.matchPercentage)}`}>
                                                                {Math.round(meal.analysis.matchPercentage * 100)}% Match
                                                            </div>
                                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(meal.difficulty)}`}>
                                                                {meal.difficulty}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-600 mb-3">{meal.description}</p>

                                                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                                                            <span>⏱️ {meal.estimatedTime} min</span>
                                                            <span>👥 {meal.servings} servings</span>
                                                            <span>🍽️ {meal.mealType}</span>
                                                            {meal.season !== 'any' && <span>📅 {meal.season}</span>}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end space-y-2">
                                                        <div
                                                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                                meal.analysis.canMake
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                            {meal.analysis.canMake ? '✅ Ready to Make' : '🛒 Need Items'}
                                                        </div>
                                                        {meal.tags && meal.tags.length > 0 && (
                                                            <div className="text-xs text-gray-500">
                                                                {meal.tags.slice(0, 2).join(', ')}
                                                                {meal.tags.length > 2 && '...'}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Available Components */}
                                                    <div>
                                                        <h5 className="font-medium text-green-700 mb-3">
                                                            ✅ You Have ({meal.analysis.availableComponents.length})
                                                        </h5>
                                                        <div className="space-y-2">
                                                            {meal.analysis.availableComponents.map((component, idx) => (
                                                                <div key={idx} className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-green-200">
                                                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                                                    <div className="flex-1">
                                                                        <div className="font-medium text-gray-900">
                                                                            {component.inventoryItem.name}
                                                                        </div>
                                                                        <div className="text-sm text-gray-500 capitalize">
                                                                            {component.category} • {component.matchType} match
                                                                            {component.inventoryItem.brand && ` • ${component.inventoryItem.brand}`}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Missing Components */}
                                                    <div>
                                                        <h5 className="font-medium text-red-700 mb-3">
                                                            🛒 You Need ({meal.analysis.missingComponents.length})
                                                        </h5>
                                                        <div className="space-y-2">
                                                            {meal.analysis.missingComponents.map((component, idx) => (
                                                                <div key={idx} className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-red-200">
                                                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                                                    <div className="flex-1">
                                                                        <div className="font-medium text-gray-900">
                                                                            {component.itemName}
                                                                            {!component.required && <span className="text-gray-500 text-sm ml-1">(optional)</span>}
                                                                        </div>
                                                                        <div className="text-sm text-gray-500 capitalize">
                                                                            {component.category}
                                                                            {component.alternatives && component.alternatives.length > 0 && (
                                                                                <span className="text-xs text-blue-600 ml-2">
                                                                                    Alt: {component.alternatives.slice(0, 2).join(', ')}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {meal.analysis.missingComponents.length === 0 && (
                                                                <div className="text-green-600 text-sm italic p-3">
                                                                    🎉 You have everything you need!
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Cooking Tips */}
                                                {meal.cookingTips && meal.cookingTips.length > 0 && (
                                                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                        <div className="flex items-start space-x-2">
                                                            <span className="text-yellow-600 mt-0.5">💡</span>
                                                            <div>
                                                                <div className="font-medium text-yellow-800 text-sm">Cooking Tips:</div>
                                                                <ul className="text-yellow-700 text-sm mt-1 space-y-1">
                                                                    {meal.cookingTips.map((tip, tipIndex) => (
                                                                        <li key={tipIndex}>• {tip}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Action Bar */}
                                                <div className="mt-4 flex justify-between items-center">
                                                    <div className="text-sm text-gray-500">
                                                        {meal.analysis.canMake ? (
                                                            <span className="text-green-600 font-medium">
                                                                🎉 You can make this meal!
                                                            </span>
                                                        ) : meal.analysis.requiredMissing === 1 ? (
                                                            <span className="text-yellow-600 font-medium">
                                                                Missing only 1 required ingredient
                                                            </span>
                                                        ) : (
                                                            <span className="text-red-600">
                                                                Missing {meal.analysis.requiredMissing} required ingredients
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        {!meal.analysis.canMake && (
                                                            <TouchEnhancedButton
                                                                onClick={() => setShowShoppingList({
                                                                    mealId: meal._id,
                                                                    mealName: meal.name,
                                                                    type: 'curated'
                                                                })}
                                                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                                            >
                                                                🛒 Shopping List
                                                            </TouchEnhancedButton>
                                                        )}
                                                        <TouchEnhancedButton
                                                            onClick={() => {
                                                                // Future: Add to meal plan functionality
                                                                alert('Add to meal plan feature coming soon!');
                                                            }}
                                                            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                                        >
                                                            📅 Add to Meal Plan
                                                        </TouchEnhancedButton>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Curated Meals Pagination */}
                                {curatedSuggestions.length > curatedItemsPerPage && (
                                    <div className="mt-8 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg">
                                        <div className="flex flex-1 justify-between sm:hidden">
                                            <TouchEnhancedButton
                                                onClick={() => handlePageChange(curatedCurrentPage - 1, 'curated')}
                                                disabled={curatedCurrentPage === 1}
                                                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                                            >
                                                Previous
                                            </TouchEnhancedButton>
                                            <TouchEnhancedButton
                                                onClick={() => handlePageChange(curatedCurrentPage + 1, 'curated')}
                                                disabled={curatedCurrentPage === getTotalPages(curatedSuggestions.length, curatedItemsPerPage)}
                                                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                                            >
                                                Next
                                            </TouchEnhancedButton>
                                        </div>
                                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-sm text-gray-700">
                                                    Showing{' '}
                                                    <span className="font-medium">
                                                        {((curatedCurrentPage - 1) * curatedItemsPerPage) + 1}
                                                    </span>{' '}
                                                    to{' '}
                                                    <span className="font-medium">
                                                        {Math.min(curatedCurrentPage * curatedItemsPerPage, curatedSuggestions.length)}
                                                    </span>{' '}
                                                    of{' '}
                                                    <span className="font-medium">{curatedSuggestions.length}</span> results
                                                </p>
                                            </div>
                                            <div>
                                                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                                    <TouchEnhancedButton
                                                        onClick={() => handlePageChange(curatedCurrentPage - 1, 'curated')}
                                                        disabled={curatedCurrentPage === 1}
                                                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100"
                                                    >
                                                        <span className="sr-only">Previous</span>
                                                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                                        </svg>
                                                    </TouchEnhancedButton>

                                                    {Array.from({ length: getTotalPages(curatedSuggestions.length, curatedItemsPerPage) }, (_, i) => i + 1)
                                                        .filter(page => {
                                                            const totalPages = getTotalPages(curatedSuggestions.length, curatedItemsPerPage);
                                                            if (totalPages <= 7) return true;
                                                            if (page === 1 || page === totalPages) return true;
                                                            if (Math.abs(page - curatedCurrentPage) <= 2) return true;
                                                            return false;
                                                        })
                                                        .map((page, index, array) => {
                                                            const showEllipsis = index > 0 && page - array[index - 1] > 1;
                                                            return (
                                                                <div key={page} className="flex items-center">
                                                                    {showEllipsis && (
                                                                        <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
                                                                            ...
                                                                        </span>
                                                                    )}
                                                                    <TouchEnhancedButton
                                                                        onClick={() => handlePageChange(page, 'curated')}
                                                                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                                                            page === curatedCurrentPage
                                                                                ? 'bg-indigo-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                                                                                : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                                                        }`}
                                                                    >
                                                                        {page}
                                                                    </TouchEnhancedButton>
                                                                </div>
                                                            );
                                                        })}

                                                    <TouchEnhancedButton
                                                        onClick={() => handlePageChange(curatedCurrentPage + 1, 'curated')}
                                                        disabled={curatedCurrentPage === getTotalPages(curatedSuggestions.length, curatedItemsPerPage)}
                                                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100"
                                                    >
                                                        <span className="sr-only">Next</span>
                                                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                                        </svg>
                                                    </TouchEnhancedButton>
                                                </nav>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Recipe Suggestions (existing code with pagination) */}
                        {activeTab === 'recipes' && (
                            <div id="recipes-results">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                                        📖 Recipe Suggestions ({suggestions.length})
                                        {selectedCategory !== 'all' && (
                                            <span className="text-sm text-gray-500 ml-2">
                                                • Filtered by {recipeCategories.find(cat => cat.value === selectedCategory)?.label}
                                            </span>
                                        )}
                                    </h3>
                                    {suggestions.length > 10 && (
                                        <div className="flex items-center space-x-3">
                                            <label className="text-sm text-gray-700">Show:</label>
                                            <select
                                                value={itemsPerPage}
                                                onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value), 'recipes')}
                                                className="border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                {perPageOptions.map(option => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {loading ? (
                                    <div className="text-center py-8">
                                        <div className="text-gray-500">Analyzing your recipes...</div>
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
                                ) : suggestions.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="text-gray-500 mb-4">
                                            No recipes match your current inventory at {Math.round(matchThreshold * 100)}% threshold
                                        </div>
                                        <TouchEnhancedButton
                                            onClick={() => setMatchThreshold(0.1)}
                                            className="text-indigo-600 hover:text-indigo-900 text-sm"
                                        >
                                            Try lowering the match threshold to 10%
                                        </TouchEnhancedButton>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {getPaginatedData(suggestions, currentPage, itemsPerPage).map((recipe) => (
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

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    {/* Recipe Info */}
                                                    <div>
                                                        <h5 className="font-medium text-gray-900 mb-2">Recipe Details</h5>
                                                        <div className="space-y-1 text-sm text-gray-600">
                                                            <div className="flex items-center space-x-2">
                                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(recipe.difficulty)}`}>
                                                                    {recipe.difficulty}
                                                                </span>
                                                            </div>
                                                            {recipe.prepTime && (
                                                                <div>Prep: {formatCookTime(recipe.prepTime)}</div>
                                                            )}
                                                            {recipe.cookTime && (
                                                                <div>Cook: {formatCookTime(recipe.cookTime)}</div>
                                                            )}
                                                            {recipe.prepTime && recipe.cookTime && (
                                                                <div>Total: {formatCookTime(recipe.prepTime + recipe.cookTime)}</div>
                                                            )}
                                                            {recipe.servings && (
                                                                <div>Serves: {recipe.servings}</div>
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
                                                        ) : (
                                                            <span className="text-red-600">
                                                                Missing ingredients needed
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        <TouchEnhancedButton
                                                            onClick={() => loadRecipeDetails(recipe._id)}
                                                            disabled={loadingRecipe}
                                                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                                                        >
                                                            {loadingRecipe ? 'Loading...' : 'View Recipe'}
                                                        </TouchEnhancedButton>
                                                        {!recipe.analysis.canMake && (
                                                            <TouchEnhancedButton
                                                                onClick={() => setShowShoppingList({
                                                                    recipeId: recipe._id,
                                                                    recipeName: recipe.title,
                                                                    type: 'recipe'
                                                                })}
                                                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                                            >
                                                                Shopping List
                                                            </TouchEnhancedButton>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Recipe Pagination */}
                                {suggestions.length > itemsPerPage && (
                                    <div className="mt-8 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg">
                                        <div className="flex flex-1 justify-between sm:hidden">
                                            <TouchEnhancedButton
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                                            >
                                                Previous
                                            </TouchEnhancedButton>
                                            <TouchEnhancedButton
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === getTotalPages(suggestions.length, itemsPerPage)}
                                                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                                            >
                                                Next
                                            </TouchEnhancedButton>
                                        </div>
                                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-sm text-gray-700">
                                                    Showing{' '}
                                                    <span className="font-medium">
                                                        {((currentPage - 1) * itemsPerPage) + 1}
                                                    </span>{' '}
                                                    to{' '}
                                                    <span className="font-medium">
                                                        {Math.min(currentPage * itemsPerPage, suggestions.length)}
                                                    </span>{' '}
                                                    of{' '}
                                                    <span className="font-medium">{suggestions.length}</span> results
                                                </p>
                                            </div>
                                            <div>
                                                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                                    <TouchEnhancedButton
                                                        onClick={() => handlePageChange(currentPage - 1)}
                                                        disabled={currentPage === 1}
                                                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100"
                                                    >
                                                        <span className="sr-only">Previous</span>
                                                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                                        </svg>
                                                    </TouchEnhancedButton>

                                                    {Array.from({ length: getTotalPages(suggestions.length, itemsPerPage) }, (_, i) => i + 1)
                                                        .filter(page => {
                                                            const totalPages = getTotalPages(suggestions.length, itemsPerPage);
                                                            if (totalPages <= 7) return true;
                                                            if (page === 1 || page === totalPages) return true;
                                                            if (Math.abs(page - currentPage) <= 2) return true;
                                                            return false;
                                                        })
                                                        .map((page, index, array) => {
                                                            const showEllipsis = index > 0 && page - array[index - 1] > 1;
                                                            return (
                                                                <div key={page} className="flex items-center">
                                                                    {showEllipsis && (
                                                                        <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
                                                                            ...
                                                                        </span>
                                                                    )}
                                                                    <TouchEnhancedButton
                                                                        onClick={() => handlePageChange(page)}
                                                                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                                                            page === currentPage
                                                                                ? 'bg-indigo-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                                                                                : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                                                        }`}
                                                                    >
                                                                        {page}
                                                                    </TouchEnhancedButton>
                                                                </div>
                                                            );
                                                        })}

                                                    <TouchEnhancedButton
                                                        onClick={() => handlePageChange(currentPage + 1)}
                                                        disabled={currentPage === getTotalPages(suggestions.length, itemsPerPage)}
                                                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100"
                                                    >
                                                        <span className="sr-only">Next</span>
                                                        <svg className="h-5 w-5" viewView="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                                        </svg>
                                                    </TouchEnhancedButton>
                                                </nav>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Simple Meal Suggestions (Fallback - only show if active) */}
                        {activeTab === 'simple' && simpleMealSuggestions.length > 0 && (
                            <div>
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                    🍽️ Simple Meal Ideas ({simpleMealSuggestions.length})
                                </h3>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                    <div className="text-blue-800 text-sm">
                                        <strong>ℹ️ Note:</strong> These are basic meal combinations generated from templates.
                                        For better suggestions, check out the Curated Meals tab!
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {simpleMealSuggestions.map((suggestion, index) => (
                                        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-3 mb-2">
                                                        <span className="text-xl">{suggestion.template.icon}</span>
                                                        <h4 className="text-lg font-semibold text-gray-900">
                                                            {suggestion.template.name}
                                                        </h4>
                                                    </div>
                                                    <p className="text-gray-600 mb-2">{suggestion.template.description}</p>
                                                </div>
                                                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                                    ✅ Available
                                                </div>
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                <strong>Components:</strong> {suggestion.components.map(comp => comp.item.name).join(', ')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recipe Modal (existing) */}
                {showRecipeModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-gray-900">{showRecipeModal.title}</h2>
                                <TouchEnhancedButton
                                    onClick={() => setShowRecipeModal(null)}
                                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                                >
                                    ×
                                </TouchEnhancedButton>
                            </div>
                            <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-120px)]">
                                {showRecipeModal.description && (
                                    <p className="text-gray-600 mb-4">{showRecipeModal.description}</p>
                                )}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingredients</h3>
                                        <ul className="space-y-2">
                                            {showRecipeModal.ingredients?.map((ingredient, index) => (
                                                <li key={index} className="flex items-start space-x-4">
                                                    <input
                                                        type="checkbox"
                                                        className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span className="text-gray-700">
                                                        {ingredient.amount && (
                                                            <span className="font-medium">
                                                                {ingredient.amount}
                                                                {ingredient.unit && ` ${ingredient.unit}`}{' '}
                                                            </span>
                                                        )}
                                                        {ingredient.name}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Instructions</h3>
                                        <ol className="space-y-4">
                                            {showRecipeModal.instructions?.map((instruction, index) => (
                                                <li key={index} className="flex items-start space-x-4">
                                                    <span className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                                                        {index + 1}
                                                    </span>
                                                    <p className="text-gray-700 leading-relaxed">{instruction}</p>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                                <TouchEnhancedButton
                                    onClick={() => setShowRecipeModal(null)}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                                >
                                    Close
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>
                )}

                {/* Shopping List Modal */}
                {showShoppingList && (
                    <RecipeShoppingList
                        recipeId={showShoppingList.type === 'recipe' ? showShoppingList.recipeId : null}
                        recipeName={showShoppingList.type === 'recipe' ? showShoppingList.recipeName : showShoppingList.mealName}
                        onClose={() => setShowShoppingList(null)}
                        mealId={showShoppingList.type === 'curated' ? showShoppingList.mealId : null}
                        type={showShoppingList.type}
                    />
                )}

                <Footer/>
            </div>
        </MobileOptimizedLayout>
    );
}