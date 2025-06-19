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

// Loading Modal Component with more colorful design
const LoadingModal = ({ isOpen, progress, currentTask, inventory = [], recipes = [] }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
                <div className="text-center">
                    {/* Multi-colored spinning icon */}
                    <div className="relative mx-auto mb-4 w-16 h-16">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-gradient-to-r from-purple-400 via-pink-400 to-red-400 border-t-transparent"></div>
                        <div className="absolute top-2 left-2 animate-pulse">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-xl">🍳</span>
                            </div>
                        </div>
                    </div>

                    <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                        Analyzing Your Kitchen
                    </h3>
                    <p className="text-gray-700 mb-4 font-medium">{currentTask}</p>

                    {/* Colorful Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
                        <div
                            className="h-3 rounded-full transition-all duration-500 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>

                    <div className="text-lg font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                        {Math.round(progress)}% Complete
                    </div>

                    <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                        <div className="text-sm text-gray-600 flex items-center justify-center space-x-2">
                            <span className="animate-bounce">🔍</span>
                            <span>Checking your {inventory.length} items against {recipes.length} recipes...</span>
                        </div>
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
        if (dataLoaded && inventory.length > 0 && recipes.length > 0 && curatedMeals.length >= 0) {
            generateAllSuggestions();
        }
    }, [matchThreshold, selectedCategory]); // Removed inventory, recipes, curatedMeals from dependencies

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

    // Keep existing recipe analysis function
    const analyzeRecipe = (recipe, inventory) => {
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

        recipe.ingredients.forEach(recipeIngredient => {
            // Simplified ingredient matching
            const found = inventory.some(item =>
                item.name.toLowerCase().includes(recipeIngredient.name.toLowerCase()) ||
                recipeIngredient.name.toLowerCase().includes(item.name.toLowerCase())
            );

            if (found) {
                availableIngredients.push(recipeIngredient);
            } else {
                missingIngredients.push(recipeIngredient);
            }
        });

        const matchPercentage = recipe.ingredients.length > 0 ?
            (availableIngredients.length / recipe.ingredients.length) : 0;
        const canMake = availableIngredients.length >= Math.ceil(recipe.ingredients.length * 0.8);

        return {
            matchPercentage,
            availableIngredients,
            missingIngredients,
            canMake
        };
    };

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
                                                                <div>Prep: {recipe.prepTime} minutes</div>
                                                            )}
                                                            {recipe.cookTime && (
                                                                <div>Cook: {recipe.cookTime} minutes</div>
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