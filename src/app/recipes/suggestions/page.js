'use client';
// file: /src/app/recipes/suggestions/page.js v8 - OPTIMIZED with pre-indexing and deferred analysis

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
        if (progress < 15) return "📋";
        if (progress < 30) return "🗂️";
        if (progress < 50) return "🔍";
        if (progress < 75) return "📖";
        if (progress < 90) return "🧮";
        return "🎉";
    };

    const getProgressMessage = () => {
        if (progress < 15) return "📋 Loading your pantry...";
        if (progress < 30) return "🗂️ Indexing ingredients...";
        if (progress < 50) return "🔍 Scanning recipe database...";
        if (progress < 75) return "📖 Analyzing recipe matches...";
        if (progress < 90) return "🧮 Calculating compatibility scores...";
        if (progress < 100) return "🎯 Finalizing suggestions...";
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

    // Data state
    const [inventory, setInventory] = useState([]);
    const [recipes, setRecipes] = useState([]);
    const [curatedMeals, setCuratedMeals] = useState([]);

    // Analysis state
    const [suggestions, setSuggestions] = useState([]);
    const [curatedSuggestions, setCuratedSuggestions] = useState([]);
    const [analysisComplete, setAnalysisComplete] = useState(false);
    const [analyzedWithSettings, setAnalyzedWithSettings] = useState(null);

    // UI state
    const [loading, setLoading] = useState(true);
    const [showLoadingModal, setShowLoadingModal] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [currentLoadingTask, setCurrentLoadingTask] = useState('');

    // Filter state
    const [matchThreshold, setMatchThreshold] = useState(0.4);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortBy, setSortBy] = useState('match');
    const [activeTab, setActiveTab] = useState('curated');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [curatedCurrentPage, setCuratedCurrentPage] = useState(1);
    const [curatedItemsPerPage, setCuratedItemsPerPage] = useState(8);

    // Modal state
    const [showShoppingList, setShowShoppingList] = useState(null);
    const [showRecipeModal, setShowRecipeModal] = useState(null);
    const [loadingRecipe, setLoadingRecipe] = useState(false);

    // NEW: Pre-indexing state
    const [ingredientIndex, setIngredientIndex] = useState(null);
    const [dataLoaded, setDataLoaded] = useState(false);

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

    // OPTIMIZED: Pre-compute ingredient index for fast lookups
    const createIngredientIndex = (inventory) => {
        console.log('🗂️ Creating ingredient index...');
        const index = new Map();

        inventory.forEach(item => {
            if (!item || !item.name) return;

            // Get all variations for this ingredient
            const variations = getIngredientVariations(item.name);

            variations.forEach(variation => {
                if (!index.has(variation)) {
                    index.set(variation, []);
                }
                index.get(variation).push(item);
            });
        });

        console.log(`✅ Ingredient index created with ${index.size} entries`);
        return index;
    };

    function hasProblematicCrossMatch(recipeIngredient, inventoryItem) {
        const recipeNorm = normalizeIngredientName(recipeIngredient);
        const inventoryNorm = normalizeIngredientName(inventoryItem);

        for (const [compound, simpleList] of Object.entries(NEVER_CROSS_MATCH)) {
            const compoundNorm = normalizeIngredientName(compound);

            // If recipe asks for compound but inventory has simple
            if (recipeNorm.includes(compoundNorm)) {
                for (const simple of simpleList) {
                    const simpleNorm = normalizeIngredientName(simple);
                    if (inventoryNorm === simpleNorm) {
                        return true;
                    }
                }
            }

            // If recipe asks for simple but inventory has compound
            for (const simple of simpleList) {
                const simpleNorm = normalizeIngredientName(simple);
                if (recipeNorm === simpleNorm && inventoryNorm.includes(compoundNorm)) {
                    return true;
                }
            }
        }

        return false;
    }

    function isDietaryConflict(recipeIngredient, inventoryItem) {
        const recipeNorm = normalizeIngredientName(recipeIngredient);
        const inventoryNorm = normalizeIngredientName(inventoryItem);

        const veganKeywords = ['vegan', 'plant', 'dairy free', 'dairy-free'];
        const isRecipeVegan = veganKeywords.some(keyword => recipeNorm.includes(keyword));
        const isInventoryVegan = veganKeywords.some(keyword => inventoryNorm.includes(keyword));

        if (isRecipeVegan !== isInventoryVegan) {
            const baseIngredients = ['butter', 'milk', 'cheese', 'beef', 'chicken', 'sausage', 'bacon'];
            const hasCommonBase = baseIngredients.some(base =>
                recipeNorm.includes(base) && inventoryNorm.includes(base)
            );

            if (hasCommonBase) {
                return true;
            }
        }

        return false;
    }

    function isRecipeIngredient(itemName) {
        const normalized = normalizeIngredientName(itemName);
        return RECIPE_INGREDIENTS_NOT_INVENTORY.some(recipe =>
            normalized.includes(normalizeIngredientName(recipe))
        );
    }

    function isValidPartialMatch(recipeIngredient, inventoryItem, recipeNorm, inventoryNorm) {
        if (isDietaryConflict(recipeIngredient, inventoryItem) ||
            hasProblematicCrossMatch(recipeIngredient, inventoryItem)) {
            return false;
        }

        const isContained = inventoryNorm.includes(recipeNorm) || recipeNorm.includes(inventoryNorm);
        if (!isContained) {
            return false;
        }

        const minLength = Math.min(recipeNorm.length, inventoryNorm.length);
        const overlap = recipeNorm === inventoryNorm ? minLength :
            Math.max(
                recipeNorm.includes(inventoryNorm) ? inventoryNorm.length : 0,
                inventoryNorm.includes(recipeNorm) ? recipeNorm.length : 0
            );

        return (overlap / minLength) >= 0.5;
    }

// OPTIMIZED: Fast ingredient lookup using pre-computed index WITH FULL LOGIC
    const findBestIngredientMatchOptimized = (recipeIngredient, ingredientIndex) => {
        const extractedName = extractIngredientName(recipeIngredient);
        const recipeName = extractedName || recipeIngredient.name || recipeIngredient;
        const recipeNormalized = normalizeIngredientName(recipeName);

        // Step 1: Direct exact lookup in index
        if (ingredientIndex.has(recipeNormalized)) {
            const matches = ingredientIndex.get(recipeNormalized);
            for (const match of matches) {
                if (!isDietaryConflict(recipeName, match.name) &&
                    !hasProblematicCrossMatch(recipeName, match.name)) {
                    return {
                        found: true,
                        inventoryItem: match,
                        matchType: 'exact',
                        confidence: 1.0
                    };
                }
            }
        }

        // Step 2: Check variations in index
        const recipeVariations = getIngredientVariations(recipeName);
        for (const variation of recipeVariations) {
            if (ingredientIndex.has(variation)) {
                const matches = ingredientIndex.get(variation);
                for (const match of matches) {
                    if (!isDietaryConflict(recipeName, match.name) &&
                        !hasProblematicCrossMatch(recipeName, match.name)) {
                        return {
                            found: true,
                            inventoryItem: match,
                            matchType: 'variation',
                            confidence: 0.9
                        };
                    }
                }
            }
        }

        // Step 3: Intelligent substitutions using index
        const substitution = INTELLIGENT_SUBSTITUTIONS[recipeNormalized];
        if (substitution) {
            for (const substitute of substitution.canSubstituteWith) {
                const subNormalized = normalizeIngredientName(substitute);
                if (ingredientIndex.has(subNormalized)) {
                    const matches = ingredientIndex.get(subNormalized);
                    for (const match of matches) {
                        if (!isDietaryConflict(recipeName, match.name) &&
                            !hasProblematicCrossMatch(recipeName, match.name)) {
                            return {
                                found: true,
                                inventoryItem: match,
                                matchType: 'substitution',
                                substitutionNote: substitution.conversionNote,
                                originalIngredient: recipeName,
                                confidence: 0.85
                            };
                        }
                    }
                }
            }
        }

        // Step 4: Raw-to-cooked conversions using index
        const conversion = RAW_TO_COOKED_CONVERSIONS[recipeNormalized];
        if (conversion) {
            for (const rawIngredient of conversion.canMakeFrom) {
                const rawNormalized = normalizeIngredientName(rawIngredient);
                if (ingredientIndex.has(rawNormalized)) {
                    const matches = ingredientIndex.get(rawNormalized);
                    for (const match of matches) {
                        if (!isDietaryConflict(recipeName, match.name) &&
                            !hasProblematicCrossMatch(recipeName, match.name)) {
                            return {
                                found: true,
                                inventoryItem: match,
                                matchType: 'conversion',
                                conversionNote: conversion.conversionNote,
                                cookingRequired: true,
                                originalIngredient: recipeName,
                                confidence: 0.8
                            };
                        }
                    }
                }
            }
        }

        // Step 5: Ingredient separations using index
        const separation = INGREDIENT_SEPARATIONS[recipeNormalized];
        if (separation) {
            for (const wholeIngredient of separation.canMakeFrom) {
                const wholeNormalized = normalizeIngredientName(wholeIngredient);
                if (ingredientIndex.has(wholeNormalized)) {
                    const matches = ingredientIndex.get(wholeNormalized);
                    for (const match of matches) {
                        if (!isDietaryConflict(recipeName, match.name) &&
                            !hasProblematicCrossMatch(recipeName, match.name)) {
                            return {
                                found: true,
                                inventoryItem: match,
                                matchType: 'separation',
                                separationNote: separation.conversionNote,
                                separationRequired: true,
                                originalIngredient: recipeName,
                                confidence: 0.9
                            };
                        }
                    }
                }
            }
        }

        // Step 6: Partial matching for non-specialty ingredients (only if not specialty)
        if (!isSpecialtyIngredient(recipeName)) {
            // Iterate through all index entries to find partial matches
            for (const [indexKey, matches] of ingredientIndex.entries()) {
                if (indexKey.includes(recipeNormalized) || recipeNormalized.includes(indexKey)) {
                    for (const match of matches) {
                        const itemNormalized = normalizeIngredientName(match.name);
                        if (isValidPartialMatch(recipeName, match.name, recipeNormalized, itemNormalized)) {
                            return {
                                found: true,
                                inventoryItem: match,
                                matchType: 'partial',
                                confidence: 0.7
                            };
                        }
                    }
                }
            }
        }

        return {
            found: false,
            inventoryItem: null,
            matchType: null,
            confidence: 0
        };
    };

    // OPTIMIZED: Batch recipe analysis
    const analyzeRecipeBatch = async (recipeBatch, ingredientIndex, batchNumber, totalBatches) => {
        return new Promise((resolve) => {
            // Use setTimeout to prevent blocking
            setTimeout(() => {
                const results = recipeBatch.map(recipe => {
                    if (!recipe.ingredients || recipe.ingredients.length === 0) {
                        return {
                            ...recipe,
                            analysis: {
                                matchPercentage: 0,
                                availableIngredients: [],
                                missingIngredients: [],
                                canMake: false
                            }
                        };
                    }

                    const availableIngredients = [];
                    const missingIngredients = [];

                    recipe.ingredients.forEach((recipeIngredient) => {
                        const matchResult = findBestIngredientMatchOptimized(recipeIngredient, ingredientIndex);

                        if (matchResult.found) {
                            availableIngredients.push({
                                ...recipeIngredient,
                                inventoryItem: matchResult.inventoryItem,
                                matchType: matchResult.matchType,
                                confidence: matchResult.confidence,
                                substitutionNote: matchResult.substitutionNote
                            });
                        } else {
                            missingIngredients.push(recipeIngredient);
                        }
                    });

                    const matchPercentage = recipe.ingredients.length > 0 ?
                        (availableIngredients.length / recipe.ingredients.length) : 0;
                    const canMake = availableIngredients.length >= Math.ceil(recipe.ingredients.length * 0.8);

                    return {
                        ...recipe,
                        analysis: {
                            matchPercentage,
                            availableIngredients,
                            missingIngredients,
                            canMake,
                            totalIngredients: recipe.ingredients.length,
                            availableCount: availableIngredients.length,
                            missingCount: missingIngredients.length
                        }
                    };
                });

                resolve(results);
            }, 10); // Small delay to prevent blocking
        });
    };

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/auth/signin');
        }
    }, [status]);

    useEffect(() => {
        if (session && !dataLoaded) {
            loadInitialData();
        }
    }, [session, dataLoaded]);

    // NEW: Load data but don't analyze until user clicks "Analyze"
    const loadInitialData = async () => {
        setLoading(true);
        // REMOVED: setShowLoadingModal(true); - no modal needed for initial load

        try {
            console.log('🔄 Loading initial data...');

            // Step 1: Load inventory
            const inventoryResponse = await fetch(getApiUrl('/api/inventory'));
            const inventoryData = await inventoryResponse.json();

            if (inventoryData.success) {
                setInventory(inventoryData.inventory);
                console.log('✅ Loaded inventory items:', inventoryData.inventory.length);
            }

            // Step 2: Create ingredient index
            console.log('🗂️ Creating ingredient index...');
            const index = createIngredientIndex(inventoryData.inventory || []);
            setIngredientIndex(index);

            // Step 3: Load curated meals
            const curatedResponse = await fetch(getApiUrl('/api/admin/meals?status=approved&limit=100'));
            const curatedData = await curatedResponse.json();

            if (curatedData.success) {
                setCuratedMeals(curatedData.meals);
                console.log('✅ Loaded curated meals:', curatedData.meals.length);
            }

            // Step 4: Load recipes
            const recipesResponse = await fetch(getApiUrl('/api/recipes'));
            const recipesData = await recipesResponse.json();

            if (recipesData.success) {
                setRecipes(recipesData.recipes);
                console.log('✅ Loaded recipes:', recipesData.recipes.length);
            }

            setDataLoaded(true);
            console.log('🎉 Initial data loading complete!');

        } catch (error) {
            console.error('❌ Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // NEW: Separate analysis function that runs when user clicks "Analyze"
    const runAnalysis = async () => {
        if (!ingredientIndex || recipes.length === 0) {
            console.error('Missing data for analysis');
            return;
        }

        setShowLoadingModal(true);
        setLoadingProgress(0);
        setCurrentLoadingTask('Starting analysis...');

        try {
            // Small delay to show the modal
            await new Promise(resolve => setTimeout(resolve, 300));

            // Filter recipes by category first
            let filteredRecipes = recipes;
            if (selectedCategory !== 'all') {
                filteredRecipes = recipes.filter(recipe => recipe.category === selectedCategory);
                console.log(`Filtered to ${filteredRecipes.length} recipes in category: ${selectedCategory}`);
            }

            setCurrentLoadingTask(`Analyzing ${filteredRecipes.length} recipes...`);
            setLoadingProgress(15);

            // Process in batches of 25 to prevent blocking
            const batchSize = 25;
            const batches = [];
            for (let i = 0; i < filteredRecipes.length; i += batchSize) {
                batches.push(filteredRecipes.slice(i, i + batchSize));
            }

            console.log(`Processing ${batches.length} batches of ${batchSize} recipes each`);

            const allResults = [];
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                setCurrentLoadingTask(`Analyzing batch ${i + 1} of ${batches.length}...`);

                const batchResults = await analyzeRecipeBatch(batch, ingredientIndex, i + 1, batches.length);
                allResults.push(...batchResults);

                // Update progress more granularly and add delays to make it visible
                const progress = 15 + ((i + 1) / batches.length) * 70; // 15% to 85%
                setLoadingProgress(progress);

                // Add a small delay every few batches so users can see progress
                if (i % 3 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }

            setCurrentLoadingTask('Filtering and sorting results...');
            setLoadingProgress(90);

            // Add delay before final step
            await new Promise(resolve => setTimeout(resolve, 300));

            // Filter by match threshold and sort
            const suggestions = allResults
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

            setSuggestions(suggestions);
            setAnalysisComplete(true);
            setAnalyzedWithSettings({
                matchThreshold,
                selectedCategory,
                sortBy
            });

            setLoadingProgress(100);
            setCurrentLoadingTask(`Found ${suggestions.length} matching recipes!`);

            console.log(`Analysis complete: ${suggestions.length} matching recipes found`);

            // Keep the success message visible for longer
            await new Promise(resolve => setTimeout(resolve, 1500));

        } catch (error) {
            console.error('Error during analysis:', error);
            setCurrentLoadingTask('Error during analysis. Please try again.');
            // Keep error message visible
            await new Promise(resolve => setTimeout(resolve, 2000));
        } finally {
            setShowLoadingModal(false);
        }
    };

    // Check if analysis needs to be re-run
    const needsReanalysis = () => {
        if (!analysisComplete || !analyzedWithSettings) return true;

        return (
            analyzedWithSettings.matchThreshold !== matchThreshold ||
            analyzedWithSettings.selectedCategory !== selectedCategory ||
            analyzedWithSettings.sortBy !== sortBy
        );
    };

    // Fast filtering/sorting of existing results (no re-analysis needed)
    const getFilteredSuggestions = () => {
        if (!analysisComplete) return [];

        // If we need reanalysis, return empty (user needs to click analyze again)
        if (needsReanalysis()) return [];

        return suggestions;
    };

    // Keep existing utility functions (unchanged)
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

    // Pagination helpers
    const getPaginatedData = (data, currentPage, itemsPerPage) => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return data.slice(startIndex, endIndex);
    };

    const getTotalPages = (totalItems, itemsPerPage) => {
        return Math.ceil(totalItems / itemsPerPage);
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

    const filteredSuggestions = getFilteredSuggestions();

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
                            onClick={loadInitialData}
                            disabled={showLoadingModal}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-100"
                        >
                            {showLoadingModal ? '🔄 Loading...' : '🔄 Refresh Data'}
                        </TouchEnhancedButton>
                    </div>
                </div>

                {/* Stats */}
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
                            <div className="text-sm font-medium text-gray-700">Analysis Status</div>
                            <div className={`text-sm font-medium ${analysisComplete ? 'text-green-600' : 'text-gray-400'}`}>
                                {analysisComplete ? '✅ Complete' : '⏳ Ready to analyze'}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-700">Matching Recipes</div>
                            <div className="text-2xl font-bold text-purple-600">
                                {analysisComplete ? filteredSuggestions.length : '?'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* NEW: Analysis Controls */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Analysis Settings</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {/* Match Threshold */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Match Threshold: {Math.round(matchThreshold * 100)}%
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
                            <div className="text-xs text-gray-500 mt-1">
                                Minimum percentage of ingredients you must have
                            </div>
                        </div>

                        {/* Category Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Recipe Category</label>
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

                        {/* Sort Order */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Sort Results By</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                <option value="match">Best Match First</option>
                                <option value="time">Quickest First</option>
                                <option value="difficulty">Easiest First</option>
                            </select>
                        </div>
                    </div>

                    {/* Analysis Button */}
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            {!dataLoaded ? (
                                "Load your data first, then set your preferences and analyze"
                            ) : needsReanalysis() ? (
                                "Settings changed. Click 'Find Recipes' to update results."
                            ) : analysisComplete ? (
                                `Analysis complete! Found ${filteredSuggestions.length} matching recipes.`
                            ) : (
                                "Ready to analyze. Click 'Find Recipes' to start."
                            )}
                        </div>

                        <TouchEnhancedButton
                            onClick={runAnalysis}
                            disabled={!dataLoaded || showLoadingModal}
                            className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white transition-colors ${
                                !dataLoaded || showLoadingModal
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : needsReanalysis()
                                        ? 'bg-indigo-600 hover:bg-indigo-700 animate-pulse'
                                        : 'bg-green-600 hover:bg-green-700'
                            }`}
                        >
                            {showLoadingModal ? (
                                '🔄 Analyzing...'
                            ) : needsReanalysis() ? (
                                '🔍 Find Recipes'
                            ) : (
                                '✅ Re-analyze'
                            )}
                        </TouchEnhancedButton>
                    </div>
                </div>

                {/* Results Section */}
                {analysisComplete && !needsReanalysis() && (
                    <div className="bg-white shadow rounded-lg">
                        <div className="border-b border-gray-200">
                            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                                <TouchEnhancedButton
                                    onClick={() => setActiveTab('recipes')}
                                    className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm ${
                                        activeTab === 'recipes'
                                            ? 'border-indigo-500 text-indigo-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    📖 Recipe Matches ({filteredSuggestions.length})
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={() => setActiveTab('curated')}
                                    className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm ${
                                        activeTab === 'curated'
                                            ? 'border-indigo-500 text-indigo-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    ⭐ Curated Meals ({curatedMeals.length})
                                </TouchEnhancedButton>
                            </nav>
                        </div>

                        <div className="px-4 py-5 sm:p-6">
                            {/* Recipe Suggestions Tab */}
                            {activeTab === 'recipes' && (
                                <div id="recipes-results">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                                            📖 Recipe Suggestions ({filteredSuggestions.length})
                                            {selectedCategory !== 'all' && (
                                                <span className="text-sm text-gray-500 ml-2">
                                                    • Filtered by {recipeCategories.find(cat => cat.value === selectedCategory)?.label}
                                                </span>
                                            )}
                                        </h3>
                                        {filteredSuggestions.length > 10 && (
                                            <div className="flex items-center space-x-3">
                                                <label className="text-sm text-gray-700">Show:</label>
                                                <select
                                                    value={itemsPerPage}
                                                    onChange={(e) => {
                                                        setItemsPerPage(parseInt(e.target.value));
                                                        setCurrentPage(1);
                                                    }}
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

                                    {filteredSuggestions.length === 0 ? (
                                        <div className="text-center py-8">
                                            <div className="text-gray-500 mb-4">
                                                No recipes match your current settings
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
                                            {getPaginatedData(filteredSuggestions, currentPage, itemsPerPage).map((recipe) => (
                                                <div key={recipe._id} className="border border-gray-200 rounded-lg p-6">
                                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 space-y-3 sm:space-y-0">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex flex-col space-y-2 mb-3">
                                                                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
                                                                    <h4 className="text-lg sm:text-xl font-semibold text-gray-900 break-words">
                                                                        {recipe.title}
                                                                    </h4>
                                                                    <div className="flex-shrink-0 mt-2 sm:mt-0">
                                                                        <div className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getMatchColor(recipe.analysis.matchPercentage)}`}>
                                                                            {Math.round(recipe.analysis.matchPercentage * 100)}% Match
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {recipe.description && (
                                                                    <p className="text-gray-600 text-sm sm:text-base">{recipe.description}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                                                        {/* Recipe Info */}
                                                        <div className="lg:col-span-1">
                                                            <h5 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Recipe Details</h5>
                                                            <div className="space-y-1 text-xs sm:text-sm text-gray-600">
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
                                                        <div className="lg:col-span-1">
                                                            <h5 className="font-medium text-green-700 mb-2 text-sm sm:text-base">
                                                                ✅ You Have ({recipe.analysis.availableIngredients.length})
                                                            </h5>
                                                            <div className="space-y-1 text-xs sm:text-sm">
                                                                {recipe.analysis.availableIngredients.slice(0, 5).map((ingredient, index) => (
                                                                    <div key={index} className="text-green-600 break-words">
                                                                        • {ingredient.amount} {ingredient.unit} {ingredient.name}
                                                                        {ingredient.matchType === 'substitution' && (
                                                                            <span className="text-xs text-blue-600 ml-1">(substitute)</span>
                                                                        )}
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
                                                        <div className="lg:col-span-1">
                                                            <h5 className="font-medium text-red-700 mb-2 text-sm sm:text-base">
                                                                ❌ You Need ({recipe.analysis.missingIngredients.length})
                                                            </h5>
                                                            <div className="space-y-1 text-xs sm:text-sm">
                                                                {recipe.analysis.missingIngredients.slice(0, 5).map((ingredient, index) => (
                                                                    <div key={index} className="text-red-600 break-words">
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
                                                    <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
                                                        <div className="text-xs sm:text-sm text-gray-500">
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
                                                        <TouchEnhancedButton
                                                            onClick={() => loadRecipeDetails(recipe._id)}
                                                            disabled={loadingRecipe}
                                                            className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                                                            style={{ height: '36px', minHeight: '36px', width: '36px', minWidth: '36px'}}
                                                        >
                                                            {loadingRecipe ? 'Loading...' : 'View Recipe'}
                                                        </TouchEnhancedButton>
                                                        {(recipe.analysis.matchPercentage * 100) < 100 && (
                                                            <TouchEnhancedButton
                                                                onClick={() => setShowShoppingList({
                                                                    recipeId: recipe._id,
                                                                    recipeName: recipe.title,
                                                                    type: 'recipe'
                                                                })}
                                                                className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                                                style={{ height: '36px', minHeight: '36px', width: '36px', minWidth: '36px'}}
                                                            >
                                                                Shopping List
                                                            </TouchEnhancedButton>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Pagination */}
                                    {filteredSuggestions.length > itemsPerPage && (
                                        <div className="mt-8 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg">
                                            <div className="flex flex-1 justify-between sm:hidden">
                                                <TouchEnhancedButton
                                                    onClick={() => setCurrentPage(currentPage - 1)}
                                                    disabled={currentPage === 1}
                                                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                                                >
                                                    Previous
                                                </TouchEnhancedButton>
                                                <TouchEnhancedButton
                                                    onClick={() => setCurrentPage(currentPage + 1)}
                                                    disabled={currentPage === getTotalPages(filteredSuggestions.length, itemsPerPage)}
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
                                                            {Math.min(currentPage * itemsPerPage, filteredSuggestions.length)}
                                                        </span>{' '}
                                                        of{' '}
                                                        <span className="font-medium">{filteredSuggestions.length}</span> results
                                                    </p>
                                                </div>
                                                <div>
                                                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                                        <TouchEnhancedButton
                                                            onClick={() => setCurrentPage(currentPage - 1)}
                                                            disabled={currentPage === 1}
                                                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100"
                                                        >
                                                            <span className="sr-only">Previous</span>
                                                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                                            </svg>
                                                        </TouchEnhancedButton>

                                                        {Array.from({ length: getTotalPages(filteredSuggestions.length, itemsPerPage) }, (_, i) => i + 1)
                                                            .filter(page => {
                                                                const totalPages = getTotalPages(filteredSuggestions.length, itemsPerPage);
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
                                                                            onClick={() => setCurrentPage(page)}
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
                                                            onClick={() => setCurrentPage(currentPage + 1)}
                                                            disabled={currentPage === getTotalPages(filteredSuggestions.length, itemsPerPage)}
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

                            {/* Curated Meals Tab - Restored functionality */}
                            {activeTab === 'curated' && (
                                <div id="curated-results">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                                            ⭐ Curated Meal Suggestions ({curatedMeals.length})
                                        </h3>
                                    </div>

                                    {curatedMeals.length === 0 ? (
                                        <div className="text-center py-8">
                                            <div className="text-gray-500 mb-4">
                                                No curated meals available yet
                                            </div>
                                            <p className="text-sm text-gray-400">
                                                Check back later for hand-picked meal combinations.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {curatedMeals.slice(0, 10).map((meal, index) => (
                                                <div key={meal._id} className="border border-gray-200 rounded-lg p-4 sm:p-6 bg-gradient-to-r from-purple-50 to-indigo-50">
                                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 space-y-2 sm:space-y-0">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mb-2">
                                                                <h4 className="text-lg sm:text-xl font-semibold text-gray-900 break-words">
                                                                    {meal.name}
                                                                </h4>
                                                                <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                                        {meal.difficulty}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <p className="text-gray-600 mb-3 text-sm sm:text-base">{meal.description}</p>

                                                            <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 mb-4">
                                                                <span>⏱️ {meal.estimatedTime} min</span>
                                                                <span>👥 {meal.servings} servings</span>
                                                                <span>🍽️ {meal.mealType}</span>
                                                                {meal.season !== 'any' && <span>📅 {meal.season}</span>}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                                        {/* Meal Components */}
                                                        <div>
                                                            <h5 className="font-medium text-gray-700 mb-3 text-sm sm:text-base">
                                                                🥘 Meal Components ({meal.components?.length || 0})
                                                            </h5>
                                                            <div className="space-y-2">
                                                                {meal.components?.slice(0, 5).map((component, idx) => (
                                                                    <div key={idx} className="flex items-center space-x-3 bg-white p-2 sm:p-3 rounded-lg border border-gray-200">
                                                                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="font-medium text-gray-900 text-sm break-words">
                                                                                {component.itemName}
                                                                                {!component.required && <span className="text-gray-500 text-xs ml-1">(optional)</span>}
                                                                            </div>
                                                                            <div className="text-xs text-gray-500 capitalize">
                                                                                {component.category}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )) || []}
                                                                {meal.components?.length > 5 && (
                                                                    <div className="text-xs text-gray-500 italic p-2">
                                                                        +{meal.components.length - 5} more components
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Cooking Tips */}
                                                        <div>
                                                            <h5 className="font-medium text-gray-700 mb-3 text-sm sm:text-base">
                                                                💡 Cooking Tips
                                                            </h5>
                                                            {meal.cookingTips && meal.cookingTips.length > 0 ? (
                                                                <div className="space-y-2">
                                                                    {meal.cookingTips.slice(0, 3).map((tip, tipIndex) => (
                                                                        <div key={tipIndex} className="bg-white p-2 sm:p-3 rounded-lg border border-yellow-200">
                                                                            <div className="text-xs sm:text-sm text-gray-700">• {tip}</div>
                                                                        </div>
                                                                    ))}
                                                                    {meal.cookingTips.length > 3 && (
                                                                        <div className="text-xs text-gray-500 italic p-2">
                                                                            +{meal.cookingTips.length - 3} more tips
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                                                    <div className="text-sm text-gray-500 italic">
                                                                        No specific cooking tips for this meal
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Action Bar */}
                                                    <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
                                                        <div className="text-xs sm:text-sm text-gray-500">
                                                            <span className="text-indigo-600 font-medium">
                                                                🍽️ Curated meal suggestion
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                                                            <TouchEnhancedButton
                                                                onClick={() => {
                                                                    alert('Add to meal plan feature coming soon!');
                                                                }}
                                                                className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                                            >
                                                                📅 Add to Meal Plan
                                                            </TouchEnhancedButton>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Empty State - Show when no analysis has been run */}
                {!analysisComplete && dataLoaded && (
                    <div className="bg-white shadow rounded-lg p-8">
                        <div className="text-center">
                            <div className="text-gray-400 mb-4">
                                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Find Recipes!</h3>
                            <p className="text-gray-500 mb-6">
                                Your data is loaded and indexed. Set your preferences above and click "Find Recipes" to see what you can make with your current inventory.
                            </p>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="text-blue-800 text-sm">
                                    <strong>💡 Tip:</strong> Start with a 40% match threshold to see recipes where you have most ingredients.
                                    You can always adjust and re-analyze!
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recipe Modal */}
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

// CORE INGREDIENT MATCHING FUNCTIONS (keep your existing functions here)
// These need to be added at the bottom - all the functions like:
// - normalizeIngredientName
// - extractIngredientName
// - getIngredientVariations
// - INTELLIGENT_SUBSTITUTIONS
// - etc.

// COMPLETE INGREDIENT MATCHING SYSTEM - All original logic preserved

const NEVER_MATCH_INGREDIENTS = [
    // Specialty flours
    'almond flour', 'coconut flour', 'cake flour', 'bread flour', 'self rising flour',
    'whole wheat flour', 'gluten free flour', 'gluten-free flour', 'oat flour', 'rice flour',

    // Specialty sugars
    'powdered sugar', 'confectioners sugar', 'coconut sugar', 'maple sugar',
    'swerve', 'stevia', 'erythritol', 'monk fruit', 'xylitol', 'sugar substitute',

    // Alternative milks
    'almond milk', 'oat milk', 'soy milk', 'coconut milk', 'rice milk', 'cashew milk',

    // Compound dairy products
    'buttermilk', 'sour cream', 'heavy cream', 'half and half', 'cream cheese',

    // Vegan/diet-specific ingredients
    'vegan butter', 'vegan cheese', 'vegan milk', 'vegan bacon', 'vegan sausage',
    'vegan beef', 'vegan chicken', 'plant butter', 'plant milk', 'plant beef',

    // Specialty extracts and seasonings
    'vanilla extract', 'almond extract', 'garlic powder', 'onion powder',

    // Specialty baking ingredients
    'baking powder', 'baking soda', 'cream of tartar', 'xanthan gum'
];

const NEVER_CROSS_MATCH = {
    'peanut butter': ['butter'],
    'almond butter': ['butter'],
    'green onions': ['onion', 'onions'],
    'scallions': ['onion', 'onions'],
    'red bell pepper': ['pepper'],
    'green bell pepper': ['pepper'],
    'red pepper diced': ['pepper'],
    'buttermilk': ['milk', 'butter'],
    'heavy cream': ['milk'],
    'sour cream': ['cream', 'milk'],
    'cream cheese': ['cheese', 'cream'],
    'vegan bacon': ['bacon'],
    'sugar substitute': ['sugar'],
    'brown sugar': ['sugar'],
    'packed brown sugar': ['sugar']
};

const RECIPE_INGREDIENTS_NOT_INVENTORY = [
    'vegan honey mustard marinade', 'honey mustard marinade', 'teriyaki marinade',
    'bbq sauce', 'pizza dough', 'seasoning mix', 'spice blend', 'marinade'
];

const INTELLIGENT_SUBSTITUTIONS = {
    'garlic cloves': {
        canSubstituteWith: ['minced garlic', 'garlic', 'chopped garlic', 'garlic jar'],
        conversionNote: '1 clove ≈ 1 tsp minced garlic'
    },
    'garlic cloves minced': {
        canSubstituteWith: ['minced garlic', 'garlic', 'garlic cloves'],
        conversionNote: '1 clove ≈ 1 tsp minced garlic'
    },
    'minced garlic': {
        canSubstituteWith: ['garlic cloves', 'garlic', 'fresh garlic'],
        conversionNote: '1 tsp ≈ 1 clove fresh garlic'
    },
    'bread': {
        canSubstituteWith: [
            'sandwich bread', 'wheat bread', 'white bread', 'sandwich wheat bread',
            'honey wheat bread', 'texas toast', 'sourdough bread', 'rye bread'
        ],
        conversionNote: 'Any bread type works for generic bread'
    },
    'slice of bread': {
        canSubstituteWith: [
            'sandwich bread', 'wheat bread', 'white bread', 'sandwich wheat bread',
            'honey wheat bread', 'texas toast', 'sourdough bread'
        ],
        conversionNote: 'Any sliced bread works'
    },
    'ground hamburger': {
        canSubstituteWith: ['ground beef', 'hamburger', 'ground chuck', 'lean ground beef'],
        conversionNote: 'Ground hamburger is the same as ground beef'
    },
    'hamburger': {
        canSubstituteWith: ['ground beef', 'ground hamburger', 'ground chuck'],
        conversionNote: 'Hamburger meat is ground beef'
    },
    'bay leaf': {
        canSubstituteWith: ['bay leaves'],
        conversionNote: 'Singular and plural are the same ingredient'
    },
    'bay leaves': {
        canSubstituteWith: ['bay leaf'],
        conversionNote: 'Singular and plural are the same ingredient'
    },
    'marsala wine': {
        canSubstituteWith: ['marsala cooking wine', 'cooking marsala', 'dry marsala'],
        conversionNote: 'Cooking wine can substitute for regular wine'
    },
    'hot water': {
        canSubstituteWith: ['water', 'warm water', 'boiling water'],
        conversionNote: 'Water can be heated as needed'
    }
};

const RAW_TO_COOKED_CONVERSIONS = {
    'cooked chicken': {
        canMakeFrom: ['chicken', 'raw chicken', 'chicken breast', 'chicken thighs', 'whole chicken'],
        conversionNote: 'Can cook raw chicken to make cooked chicken',
        cookingRequired: true
    },
    'shredded cooked chicken': {
        canMakeFrom: ['chicken', 'raw chicken', 'chicken breast', 'chicken thighs', 'cooked chicken'],
        conversionNote: 'Cook and shred raw chicken, or shred existing cooked chicken',
        cookingRequired: true
    },
    'cooked ground beef': {
        canMakeFrom: ['ground beef', 'hamburger', 'ground hamburger', 'raw ground beef'],
        conversionNote: 'Can cook raw ground beef',
        cookingRequired: true
    },
    'cooked bacon': {
        canMakeFrom: ['bacon', 'raw bacon', 'bacon strips'],
        conversionNote: 'Can cook raw bacon',
        cookingRequired: true
    }
};

const INGREDIENT_SEPARATIONS = {
    'egg whites': {
        canMakeFrom: ['eggs', 'large eggs', 'whole eggs'],
        conversionNote: '1 egg = 1 egg white + 1 egg yolk',
        separationRequired: true
    },
    'egg yolks': {
        canMakeFrom: ['eggs', 'large eggs', 'whole eggs'],
        conversionNote: '1 egg = 1 egg white + 1 egg yolk',
        separationRequired: true
    }
};

const INGREDIENT_VARIATIONS = {
    // WATER
    'water': ['tap water', 'filtered water', 'cold water', 'warm water', 'hot water', 'boiling water'],
    'hot water': ['water', 'warm water', 'boiling water'],

    // EGGS
    'eggs': [
        'egg', 'large eggs', 'extra large eggs', 'jumbo eggs', 'medium eggs',
        'fresh eggs', 'whole eggs', 'brown eggs', 'white eggs'
    ],
    'egg': ['eggs', 'large egg', 'extra large egg', 'fresh egg', 'whole egg'],

    // FLOUR - Basic flour only
    'flour': [
        'all purpose flour', 'all-purpose flour', 'plain flour', 'white flour',
        'unbleached flour', 'bleached flour', 'enriched flour', 'wheat flour',
        'ap flour', 'general purpose flour'
    ],
    'all purpose flour': ['flour', 'all-purpose flour', 'plain flour'],
    'all-purpose flour': ['flour', 'all purpose flour', 'plain flour'],

    // SUGAR - White sugar only (brown sugar is specialty)
    'sugar': [
        'white sugar', 'granulated sugar', 'cane sugar', 'pure cane sugar',
        'granulated white sugar', 'table sugar', 'regular sugar'
    ],
    'white sugar': ['sugar', 'granulated sugar', 'cane sugar'],
    'granulated sugar': ['sugar', 'white sugar'],

    // BROWN SUGAR - Exact matches only
    'brown sugar': ['light brown sugar', 'dark brown sugar', 'packed brown sugar'],
    'packed brown sugar': ['brown sugar', 'light brown sugar', 'dark brown sugar'],
    'light brown sugar': ['brown sugar', 'packed brown sugar'],
    'dark brown sugar': ['brown sugar', 'packed brown sugar'],

    // MILK
    'milk': [
        'whole milk', '2% milk', '1% milk', 'skim milk', 'vitamin d milk',
        'reduced fat milk', 'low fat milk', 'fresh milk', 'dairy milk'
    ],
    'whole milk': ['milk', 'vitamin d milk'],

    // BUTTER
    'butter': [
        'unsalted butter', 'salted butter', 'sweet cream butter', 'dairy butter',
        'real butter', 'churned butter'
    ],
    'unsalted butter': ['butter', 'sweet cream butter'],
    'salted butter': ['butter'],

    // GARLIC
    'garlic': [
        'garlic cloves', 'garlic bulb', 'minced garlic', 'fresh garlic',
        'chopped garlic', 'whole garlic', 'garlic head'
    ],
    'garlic cloves': ['garlic', 'fresh garlic', 'minced garlic'],
    'minced garlic': ['garlic', 'garlic cloves'],

    // ONION
    'onion': [
        'onions', 'yellow onion', 'white onion', 'sweet onion', 'cooking onion',
        'spanish onion', 'diced onion'
    ],
    'onion finely diced': ['onion', 'onions', 'diced onion', 'yellow onion'],
    'diced onion': ['onion', 'onions'],

    // GROUND BEEF/HAMBURGER
    'ground beef': [
        'beef', 'hamburger', 'ground chuck', 'lean ground beef', 'ground hamburger',
        'extra lean ground beef'
    ],
    'ground hamburger': ['ground beef', 'hamburger', 'beef', 'ground chuck'],
    'hamburger': ['ground beef', 'ground hamburger', 'beef'],

    // BREAD
    'bread': [
        'sandwich bread', 'wheat bread', 'white bread', 'sandwich wheat bread',
        'honey wheat bread', 'texas toast', 'sourdough bread', 'sliced bread'
    ],
    'slice of bread': ['bread', 'sandwich bread', 'wheat bread', 'white bread'],
    'sandwich wheat bread': ['bread', 'wheat bread', 'sandwich bread'],

    // WINE
    'marsala wine': ['marsala cooking wine', 'cooking marsala', 'dry marsala', 'sweet marsala'],
    'marsala cooking wine': ['marsala wine', 'cooking marsala'],

    // BAKING INGREDIENTS
    'baking soda': ['sodium bicarbonate', 'bicarbonate of soda'],
    'baking powder': ['double acting baking powder', 'aluminum free baking powder'],

    // SEASONINGS
    'salt': ['table salt', 'sea salt', 'kosher salt', 'fine salt', 'iodized salt'],
    'pepper': ['black pepper', 'ground pepper', 'ground black pepper'],

    // Other common ingredients
    'honey': ['raw honey', 'pure honey', 'natural honey', 'wildflower honey'],
    'white pepper': ['white pepper powder', 'ground white pepper'],
    'vanilla extract': ['pure vanilla extract', 'vanilla essence'],
    'vegetable oil': ['canola oil', 'soybean oil', 'corn oil'],
    'olive oil': ['extra virgin olive oil', 'virgin olive oil']
};

function extractIngredientName(ingredientString) {
    if (!ingredientString || typeof ingredientString !== 'string') {
        return '';
    }

    const nameString = ingredientString.name || ingredientString;
    let cleaned = nameString.replace(/\([^)]*\)/g, '');

    // Remove leading count numbers
    cleaned = cleaned.replace(/^\d+\s+/, '');

    // Remove measurements aggressively
    cleaned = cleaned
        .replace(/\d+\s*[½¼¾]/g, '')
        .replace(/[½¼¾]/g, '')
        .replace(/\d*\.\d+/g, '')
        .replace(/\b\d+\b/g, '')
        .replace(/\b(cups?|tbsp|tsp|tablespoons?|teaspoons?|lbs?|pounds?|oz|ounces?|ml|liters?|l|grams?|g|kg|kilograms?|pt\.?|pints?|qt|quarts?|gal|gallons?|fl\.?\s*oz|fluid\s*ounces?)\b/gi, '')
        .replace(/\b(beaten|melted|softened|minced|chopped|sliced|diced|crushed|grated|shredded|packed|cold|hot|warm|uncooked|cooked|finely)\b/gi, '')
        .replace(/\b(optional|to\s+taste|dash|pinch)\b/gi, '')
        .replace(/^\s*(adds?\s+richness\s+and\s+color|about)\s*/gi, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return cleaned;
}

function normalizeIngredientName(name) {
    if (!name || typeof name !== 'string') {
        return '';
    }

    return name
        .toLowerCase()
        .trim()
        .replace(/\([^)]*\)/g, '')
        .replace(/\b(organic|natural|pure|fresh|raw|whole|fine|coarse|ground)\b/g, '')
        .replace(/\b(small|medium|large|extra large|jumbo|mini)\b/g, '')
        .replace(/\b(can|jar|bottle|bag|box|package|container)\b/g, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isSpecialtyIngredient(ingredient) {
    const normalized = normalizeIngredientName(ingredient);
    return NEVER_MATCH_INGREDIENTS.some(specialty => {
        const specialtyNorm = normalizeIngredientName(specialty);
        return normalized === specialtyNorm || normalized.includes(specialtyNorm);
    });
}

function getIngredientVariations(ingredient) {
    const normalized = normalizeIngredientName(ingredient);

    // If it's a specialty ingredient, only return itself for exact matching
    if (isSpecialtyIngredient(ingredient)) {
        return [normalized, ingredient.toLowerCase().trim()];
    }

    const variations = new Set([normalized]);
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