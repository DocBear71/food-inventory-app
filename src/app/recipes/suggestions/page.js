'use client';
// file: /src/app/recipes/suggestions/page.js v10 - ADDED MULTI-PART RECIPE SUPPORT + DIETARY FILTERING

import {useSafeSession} from '@/hooks/useSafeSession';
import {useEffect, useState} from 'react';
import EnhancedAIShoppingListModal from '@/components/shopping/EnhancedAIShoppingListModal';
import {redirect} from 'next/navigation';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import React from 'react';
import { apiGet } from '@/lib/api-config';

// Enhanced Flashy Loading Modal Component
const LoadingModal = ({isOpen, progress, currentTask, inventory = [], recipes = []}) => {
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
                        <div
                            className="w-20 h-20 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
                        {/* Center emoji */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div
                                className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg">
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
                        style={{width: `${progress}%`}}
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
    const [userProfile, setUserProfile] = useState(null);

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

    // Dietary Filter State
    const [dietaryFilters, setDietaryFilters] = useState({
        useProfileDefaults: true,
        includeFilters: [],
        excludeFilters: [],
        avoidIngredients: []
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [curatedCurrentPage, setCuratedCurrentPage] = useState(1);
    const [curatedItemsPerPage, setCuratedItemsPerPage] = useState(8);

    // Modal state
    const [showShoppingList, setShowShoppingList] = useState(null);
    const [showRecipeModal, setShowRecipeModal] = useState(null);
    const [loadingRecipe, setLoadingRecipe] = useState(false);

    // Pre-indexing state
    const [ingredientIndex, setIngredientIndex] = useState(null);
    const [dataLoaded, setDataLoaded] = useState(false);

    // Available dietary options
    const DIETARY_OPTIONS = [
        {id: 'vegan', label: 'Vegan', description: 'Plant-based recipes only'},
        {id: 'vegetarian', label: 'Vegetarian', description: 'No meat or fish'},
        {id: 'gluten-free', label: 'Gluten-Free', description: 'No gluten-containing ingredients'},
        {id: 'keto', label: 'Keto/Low-Carb', description: 'Ketogenic and low-carb recipes'}
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

    const perPageOptions = [
        {value: 5, label: '5 per page'},
        {value: 10, label: '10 per page'},
        {value: 20, label: '20 per page'},
        {value: 50, label: '50 per page'},
        {value: 100, label: '100 per page'}
    ];

    const curatedPerPageOptions = [
        {value: 4, label: '4 per page'},
        {value: 8, label: '8 per page'},
        {value: 12, label: '12 per page'},
        {value: 20, label: '20 per page'}
    ];

    // NEW: Multi-part recipe support - Get all ingredients from both single-part and multi-part recipes
    const getAllRecipeIngredients = (recipe) => {
        const allIngredients = [];

        // Add legacy/single-part ingredients if they exist
        if (recipe.ingredients && Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
            allIngredients.push(...recipe.ingredients);
        }

        // Add multi-part ingredients if they exist
        if (recipe.isMultiPart && recipe.parts && Array.isArray(recipe.parts)) {
            recipe.parts.forEach(part => {
                if (part.ingredients && Array.isArray(part.ingredients)) {
                    // Tag each ingredient with its part name for better tracking
                    const partIngredients = part.ingredients.map(ingredient => ({
                        ...ingredient,
                        partName: part.name, // Add part context
                        partType: part.type  // Add part type context
                    }));
                    allIngredients.push(...partIngredients);
                }
            });
        }

        return allIngredients;
    };

    // NEW: Create display-friendly ingredient list for UI
    const getIngredientsForDisplay = (recipe) => {
        if (!recipe.isMultiPart) {
            // Single-part recipe - return ingredients as-is
            return recipe.ingredients || [];
        }

        // Multi-part recipe - organize by parts
        const organizedIngredients = [];

        if (recipe.parts && Array.isArray(recipe.parts)) {
            recipe.parts.forEach(part => {
                if (part.ingredients && Array.isArray(part.ingredients)) {
                    // Add a part header
                    organizedIngredients.push({
                        isPartHeader: true,
                        partName: part.name,
                        partType: part.type
                    });

                    // Add the ingredients for this part
                    organizedIngredients.push(...part.ingredients.map(ingredient => ({
                        ...ingredient,
                        partName: part.name,
                        partType: part.type
                    })));
                }
            });
        }

        return organizedIngredients;
    };

    // Dietary filtering functions
    const checkRecipeDietaryMatch = (recipe, dietaryFilters) => {
        if (!dietaryFilters || (!dietaryFilters.includeFilters.length && !dietaryFilters.excludeFilters.length && !dietaryFilters.avoidIngredients.length)) {
            return true;
        }

        const recipeText = `${recipe.title} ${(recipe.tags || []).join(' ')} ${recipe.description || ''}`.toLowerCase();

        // Get ingredients from both single-part and multi-part recipes
        const allIngredients = getAllRecipeIngredients(recipe);
        const recipeIngredients = allIngredients.map(ing =>
            typeof ing === 'string' ? ing.toLowerCase() : (ing.name || '').toLowerCase()
        ).join(' ');

        // Check include filters
        if (dietaryFilters.includeFilters.length > 0) {
            let matchesInclude = false;

            for (const filter of dietaryFilters.includeFilters) {
                switch (filter) {
                    case 'vegan':
                        if (recipeText.includes('vegan')) {
                            matchesInclude = true;
                        }
                        break;
                    case 'vegetarian':
                        if (recipeText.includes('vegetarian') || recipeText.includes('vegan')) {
                            matchesInclude = true;
                        }
                        break;
                    case 'gluten-free':
                        if (recipeText.includes('gluten-free') || recipeText.includes('gluten free')) {
                            matchesInclude = true;
                        }
                        break;
                    case 'keto':
                        if (recipeText.includes('keto') || recipeText.includes('low carb') || recipeText.includes('low-carb')) {
                            matchesInclude = true;
                        }
                        break;
                }
            }

            if (!matchesInclude) {
                return false;
            }
        }

        // Check exclude filters
        for (const filter of dietaryFilters.excludeFilters) {
            switch (filter) {
                case 'vegan':
                    if (recipeText.includes('vegan')) {
                        return false;
                    }
                    break;
                case 'vegetarian':
                    if (recipeText.includes('vegetarian') || recipeText.includes('vegan')) {
                        return false;
                    }
                    break;
                case 'gluten-free':
                    if (recipeText.includes('gluten-free') || recipeText.includes('gluten free')) {
                        return false;
                    }
                    break;
                case 'keto':
                    if (recipeText.includes('keto') || recipeText.includes('low carb') || recipeText.includes('low-carb')) {
                        return false;
                    }
                    break;
            }
        }

        // Check ingredients to avoid
        if (dietaryFilters.avoidIngredients.length > 0) {
            for (const avoidIngredient of dietaryFilters.avoidIngredients) {
                const normalizedAvoid = avoidIngredient.toLowerCase().trim();
                if (normalizedAvoid && (recipeText.includes(normalizedAvoid) || recipeIngredients.includes(normalizedAvoid))) {
                    return false;
                }
            }
        }

        return true;
    };

    // Load user profile for dietary defaults
    const loadUserProfile = async () => {
        try {
            const response = await apiGet('/api/user/profile');
            const data = await response.json();

            if (data.success && data.user) {
                setUserProfile(data.user);

                if (data.user.mealPlanningPreferences && dietaryFilters.useProfileDefaults) {
                    setDietaryFilters(prev => ({
                        ...prev,
                        avoidIngredients: data.user.mealPlanningPreferences.avoidIngredients || []
                    }));

                    applyProfileDefaults(data.user.mealPlanningPreferences);
                }
            }
        } catch (error) {
            console.warn('Could not load user profile for dietary defaults:', error);
        }
    };

    // Convert profile dietary restrictions to filter format
    const applyProfileDefaults = (mealPlanningPreferences) => {
        if (!mealPlanningPreferences || !mealPlanningPreferences.dietaryRestrictions) return;

        const includeFilters = [];
        const restrictions = mealPlanningPreferences.dietaryRestrictions.map(r => r.toLowerCase());

        if (restrictions.some(r => r.includes('vegan'))) {
            includeFilters.push('vegan');
        } else if (restrictions.some(r => r.includes('vegetarian'))) {
            includeFilters.push('vegetarian');
        }

        if (restrictions.some(r => r.includes('gluten-free') || r.includes('gluten free'))) {
            includeFilters.push('gluten-free');
        }

        if (restrictions.some(r => r.includes('keto') || r.includes('low carb') || r.includes('low-carb'))) {
            includeFilters.push('keto');
        }

        setDietaryFilters(prev => ({
            ...prev,
            includeFilters,
            avoidIngredients: mealPlanningPreferences.avoidIngredients || []
        }));
    };

    // Handle dietary filter changes
    const handleDietaryFilterChange = (filterType, value, isChecked) => {
        setDietaryFilters(prev => {
            const newFilters = {...prev};

            if (filterType === 'include') {
                if (isChecked) {
                    newFilters.includeFilters = [...prev.includeFilters, value];
                    newFilters.excludeFilters = prev.excludeFilters.filter(f => f !== value);
                } else {
                    newFilters.includeFilters = prev.includeFilters.filter(f => f !== value);
                }
            } else if (filterType === 'exclude') {
                if (isChecked) {
                    newFilters.excludeFilters = [...prev.excludeFilters, value];
                    newFilters.includeFilters = prev.includeFilters.filter(f => f !== value);
                } else {
                    newFilters.excludeFilters = prev.excludeFilters.filter(f => f !== value);
                }
            } else if (filterType === 'useProfileDefaults') {
                newFilters.useProfileDefaults = value;
                if (value && userProfile) {
                    applyProfileDefaults(userProfile.mealPlanningPreferences);
                }
            }

            return newFilters;
        });
    };

    // OPTIMIZED: Pre-compute ingredient index for fast lookups
    const createIngredientIndex = (inventory) => {
        console.log('🗂️ Creating ingredient index...');
        const index = new Map();

        inventory.forEach(item => {
            if (!item || !item.name) return;

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

            if (recipeNorm.includes(compoundNorm)) {
                for (const simple of simpleList) {
                    const simpleNorm = normalizeIngredientName(simple);
                    if (inventoryNorm === simpleNorm) {
                        return true;
                    }
                }
            }

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

        // Step 6: Partial matching for non-specialty ingredients
        if (!isSpecialtyIngredient(recipeName)) {
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

    // UPDATED: Batch recipe analysis with multi-part recipe support
    const analyzeRecipeBatch = async (recipeBatch, ingredientIndex, batchNumber, totalBatches) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const results = recipeBatch.map(recipe => {
                    // NEW: Get all ingredients from both single-part and multi-part recipes
                    const allIngredients = getAllRecipeIngredients(recipe);

                    if (!allIngredients || allIngredients.length === 0) {
                        return {
                            ...recipe,
                            analysis: {
                                matchPercentage: 0,
                                availableIngredients: [],
                                missingIngredients: [],
                                canMake: false,
                                isMultiPart: recipe.isMultiPart || false,
                                partsAnalysis: recipe.isMultiPart ? {} : null
                            }
                        };
                    }

                    const availableIngredients = [];
                    const missingIngredients = [];
                    let partsAnalysis = null;

                    // NEW: Track analysis by parts for multi-part recipes
                    if (recipe.isMultiPart && recipe.parts) {
                        partsAnalysis = {};

                        recipe.parts.forEach(part => {
                            if (part.ingredients && part.ingredients.length > 0) {
                                const partAvailable = [];
                                const partMissing = [];

                                part.ingredients.forEach(ingredient => {
                                    const matchResult = findBestIngredientMatchOptimized(ingredient, ingredientIndex);

                                    if (matchResult.found) {
                                        const availableIngredient = {
                                            ...ingredient,
                                            inventoryItem: matchResult.inventoryItem,
                                            matchType: matchResult.matchType,
                                            confidence: matchResult.confidence,
                                            substitutionNote: matchResult.substitutionNote,
                                            partName: part.name,
                                            partType: part.type
                                        };
                                        partAvailable.push(availableIngredient);
                                        availableIngredients.push(availableIngredient);
                                    } else {
                                        const missingIngredient = {
                                            ...ingredient,
                                            partName: part.name,
                                            partType: part.type
                                        };
                                        partMissing.push(missingIngredient);
                                        missingIngredients.push(missingIngredient);
                                    }
                                });

                                partsAnalysis[part.name] = {
                                    available: partAvailable,
                                    missing: partMissing,
                                    matchPercentage: part.ingredients.length > 0 ?
                                        (partAvailable.length / part.ingredients.length) : 0,
                                    canMake: partMissing.length === 0,
                                    totalIngredients: part.ingredients.length
                                };
                            }
                        });
                    } else {
                        // Single-part recipe analysis (existing logic)
                        allIngredients.forEach((recipeIngredient) => {
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
                    }

                    const matchPercentage = allIngredients.length > 0 ?
                        (availableIngredients.length / allIngredients.length) : 0;
                    const canMake = availableIngredients.length === allIngredients.length;

                    return {
                        ...recipe,
                        analysis: {
                            matchPercentage,
                            availableIngredients,
                            missingIngredients,
                            canMake,
                            totalIngredients: allIngredients.length,
                            availableCount: availableIngredients.length,
                            missingCount: missingIngredients.length,
                            isMultiPart: recipe.isMultiPart || false,
                            partsAnalysis: partsAnalysis
                        }
                    };
                });

                resolve(results);
            }, 10);
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

    // Load data but don't analyze until user clicks "Analyze"
    const loadInitialData = async () => {
        setLoading(true);

        try {
            console.log('🔄 Loading initial data...');

            // Step 1: Load user profile for dietary defaults
            await loadUserProfile();

            // Step 2: Load inventory
            const inventoryResponse = await apiGet('/api/inventory');
            const inventoryData = await inventoryResponse.json();

            if (inventoryData.success) {
                setInventory(inventoryData.inventory);
                console.log('✅ Loaded inventory items:', inventoryData.inventory.length);
            }

            // Step 3: Create ingredient index
            console.log('🗂️ Creating ingredient index...');
            const index = createIngredientIndex(inventoryData.inventory || []);
            setIngredientIndex(index);

            // Step 4: Load curated meals
            const curatedResponse = await apiGet('/api/admin/meals?status=approved&limit=100');
            const curatedData = await curatedResponse.json();

            if (curatedData.success) {
                setCuratedMeals(curatedData.meals);
                console.log('✅ Loaded curated meals:', curatedData.meals.length);
            }

            // Step 5: Load recipes
            const recipesResponse = await apiGet('/api/recipes');
            const recipesData = await recipesResponse.json();

            if (recipesData.success) {
                setRecipes(recipesData.recipes);
                console.log('✅ Loaded recipes:', recipesData.recipes.length);

                // NEW: Log multi-part recipe statistics
                const multiPartCount = recipesData.recipes.filter(r => r.isMultiPart).length;
                const singlePartCount = recipesData.recipes.length - multiPartCount;
                console.log(`📊 Recipe breakdown: ${singlePartCount} single-part, ${multiPartCount} multi-part`);
            }

            setDataLoaded(true);
            console.log('🎉 Initial data loading complete!');

        } catch (error) {
            console.error('❌ Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // ENHANCED: Analysis function with dietary filtering and multi-part support
    const runAnalysis = async () => {
        if (!ingredientIndex || recipes.length === 0) {
            console.error('Missing data for analysis');
            return;
        }

        setShowLoadingModal(true);
        setLoadingProgress(0);
        setCurrentLoadingTask('Starting analysis...');

        try {
            await new Promise(resolve => setTimeout(resolve, 300));

            // Filter recipes by category first
            let filteredRecipes = recipes;
            if (selectedCategory !== 'all') {
                filteredRecipes = recipes.filter(recipe => recipe.category === selectedCategory);
                console.log(`Filtered to ${filteredRecipes.length} recipes in category: ${selectedCategory}`);
            }

            // Apply dietary filtering
            if (dietaryFilters.includeFilters.length > 0 || dietaryFilters.excludeFilters.length > 0 || dietaryFilters.avoidIngredients.length > 0) {
                const beforeDietaryFilter = filteredRecipes.length;
                filteredRecipes = filteredRecipes.filter(recipe => checkRecipeDietaryMatch(recipe, dietaryFilters));
                console.log(`Dietary filtering: ${beforeDietaryFilter} → ${filteredRecipes.length} recipes`);
            }

            setCurrentLoadingTask(`Analyzing ${filteredRecipes.length} recipes (including multi-part recipes)...`);
            setLoadingProgress(15);

            // Process in batches
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

                const progress = 15 + ((i + 1) / batches.length) * 70;
                setLoadingProgress(progress);

                if (i % 3 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }

            setCurrentLoadingTask('Filtering and sorting results...');
            setLoadingProgress(90);

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
                sortBy,
                dietaryFilters: {...dietaryFilters}
            });

            setLoadingProgress(100);
            setCurrentLoadingTask(`Found ${suggestions.length} matching recipes!`);

            // NEW: Log multi-part analysis results
            const multiPartMatches = suggestions.filter(r => r.analysis.isMultiPart).length;
            const singlePartMatches = suggestions.length - multiPartMatches;
            console.log(`🎯 Analysis complete: ${suggestions.length} total matches (${singlePartMatches} single-part, ${multiPartMatches} multi-part)`);

            await new Promise(resolve => setTimeout(resolve, 1500));

        } catch (error) {
            console.error('Error during analysis:', error);
            setCurrentLoadingTask('Error during analysis. Please try again.');
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
            analyzedWithSettings.sortBy !== sortBy ||
            JSON.stringify(analyzedWithSettings.dietaryFilters) !== JSON.stringify(dietaryFilters)
        );
    };

    // Fast filtering/sorting of existing results
    const getFilteredSuggestions = () => {
        if (!analysisComplete) return [];
        if (needsReanalysis()) return [];
        return suggestions;
    };

    // Utility functions
    const loadRecipeDetails = async (recipeId) => {
        setLoadingRecipe(true);
        try {
            const response = await apiGet(`/api/recipes/${recipeId}`);
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
            <MobileOptimizedLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <div className="text-lg text-gray-600">Loading dashboard...</div>
                    </div>
                </div>
            </MobileOptimizedLayout>
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
                            <div className="text-2xl font-bold text-green-600">
                                {recipes.length}
                                {recipes.length > 0 && (
                                    <div className="text-xs text-gray-500 font-normal">
                                        {recipes.filter(r => r.isMultiPart).length} multi-part
                                    </div>
                                )}
                            </div>
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
                                {analysisComplete && filteredSuggestions.length > 0 && (
                                    <div className="text-xs text-gray-500 font-normal">
                                        {filteredSuggestions.filter(r => r.analysis.isMultiPart).length} multi-part
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Analysis Controls - keeping existing dietary filtering UI */}
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

                    {/* Keep existing dietary filtering section */}
                    <div className="border-t border-gray-200 pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-md font-semibold text-gray-900">🥗 Dietary Filters</h4>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="useProfileDefaults"
                                    checked={dietaryFilters.useProfileDefaults}
                                    onChange={(e) => handleDietaryFilterChange('useProfileDefaults', e.target.checked, null)}
                                    className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <label htmlFor="useProfileDefaults" className="text-sm text-gray-700">
                                    Use my profile defaults
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Include Filters */}
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <h5 className="text-sm font-semibold text-green-800 mb-3">✅ Show Only These Types</h5>
                                <div className="space-y-2">
                                    {DIETARY_OPTIONS.map(option => (
                                        <label key={option.id} className="flex items-start space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={dietaryFilters.includeFilters.includes(option.id)}
                                                onChange={(e) => handleDietaryFilterChange('include', option.id, e.target.checked)}
                                                className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                            />
                                            <div>
                                                <span className="text-sm font-medium text-gray-700">{option.label}</span>
                                                <p className="text-xs text-gray-500">{option.description}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                {dietaryFilters.includeFilters.length > 0 && (
                                    <p className="text-xs text-green-700 mt-2 font-medium">
                                        Showing only: {dietaryFilters.includeFilters.map(f =>
                                        DIETARY_OPTIONS.find(opt => opt.id === f)?.label
                                    ).join(', ')} recipes
                                    </p>
                                )}
                            </div>

                            {/* Exclude Filters */}
                            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                <h5 className="text-sm font-semibold text-red-800 mb-3">❌ Hide These Types</h5>
                                <div className="space-y-2">
                                    {DIETARY_OPTIONS.map(option => (
                                        <label key={option.id} className="flex items-start space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={dietaryFilters.excludeFilters.includes(option.id)}
                                                onChange={(e) => handleDietaryFilterChange('exclude', option.id, e.target.checked)}
                                                className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                                            />
                                            <div>
                                                <span className="text-sm font-medium text-gray-700">{option.label}</span>
                                                <p className="text-xs text-gray-500">{option.description}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                {dietaryFilters.excludeFilters.length > 0 && (
                                    <p className="text-xs text-red-700 mt-2 font-medium">
                                        Hiding: {dietaryFilters.excludeFilters.map(f =>
                                        DIETARY_OPTIONS.find(opt => opt.id === f)?.label
                                    ).join(', ')} recipes
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Ingredients to Avoid */}
                        <div className="mt-4 bg-orange-50 p-4 rounded-lg border border-orange-200">
                            <h5 className="text-sm font-semibold text-orange-800 mb-2">🚫 Avoid Ingredients</h5>
                            <input
                                type="text"
                                value={dietaryFilters.avoidIngredients.join(', ')}
                                onChange={(e) => {
                                    const ingredients = e.target.value
                                        .split(',')
                                        .map(item => item.trim())
                                        .filter(item => item.length > 0);
                                    setDietaryFilters(prev => ({...prev, avoidIngredients: ingredients}));
                                }}
                                placeholder="nuts, shellfish, mushrooms, etc."
                                className="w-full border border-orange-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                            />
                            <p className="text-xs text-orange-700 mt-1">
                                Recipes containing these ingredients will be hidden. Separate with commas.
                            </p>
                        </div>

                        {/* Quick Dietary Presets */}
                        <div className="mt-4 flex flex-wrap gap-2">
                            <TouchEnhancedButton
                                onClick={() => setDietaryFilters(prev => ({
                                    ...prev,
                                    includeFilters: ['vegan'],
                                    excludeFilters: [],
                                    useProfileDefaults: false
                                }))}
                                className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs hover:bg-green-200"
                            >
                                🌱 Vegan Only
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={() => setDietaryFilters(prev => ({
                                    ...prev,
                                    includeFilters: ['vegetarian'],
                                    excludeFilters: [],
                                    useProfileDefaults: false
                                }))}
                                className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs hover:bg-green-200"
                            >
                                🥬 Vegetarian Only
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={() => setDietaryFilters(prev => ({
                                    ...prev,
                                    includeFilters: ['gluten-free'],
                                    excludeFilters: [],
                                    useProfileDefaults: false
                                }))}
                                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs hover:bg-blue-200"
                            >
                                🌾 Gluten-Free Only
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={() => setDietaryFilters(prev => ({
                                    ...prev,
                                    includeFilters: ['keto'],
                                    excludeFilters: [],
                                    useProfileDefaults: false
                                }))}
                                className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs hover:bg-purple-200"
                            >
                                🥩 Keto Only
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={() => setDietaryFilters(prev => ({
                                    ...prev,
                                    includeFilters: [],
                                    excludeFilters: [],
                                    avoidIngredients: [],
                                    useProfileDefaults: false
                                }))}
                                className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs hover:bg-gray-200"
                            >
                                🔄 Clear All
                            </TouchEnhancedButton>
                        </div>
                    </div>

                    {/* Analysis Button */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
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
                                            {/* Show active dietary filters */}
                                            {(dietaryFilters.includeFilters.length > 0 || dietaryFilters.excludeFilters.length > 0 || dietaryFilters.avoidIngredients.length > 0) && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {dietaryFilters.includeFilters.length > 0 && (
                                                        <span className="text-green-600">
                                                            • Showing only: {dietaryFilters.includeFilters.map(f =>
                                                            DIETARY_OPTIONS.find(opt => opt.id === f)?.label
                                                        ).join(', ')}
                                                        </span>
                                                    )}
                                                    {dietaryFilters.excludeFilters.length > 0 && (
                                                        <span className="text-red-600 ml-2">
                                                            • Hiding: {dietaryFilters.excludeFilters.map(f =>
                                                            DIETARY_OPTIONS.find(opt => opt.id === f)?.label
                                                        ).join(', ')}
                                                        </span>
                                                    )}
                                                    {dietaryFilters.avoidIngredients.length > 0 && (
                                                        <span className="text-orange-600 ml-2">
                                                            • Avoiding: {dietaryFilters.avoidIngredients.slice(0, 3).join(', ')}
                                                            {dietaryFilters.avoidIngredients.length > 3 && '...'}
                                                        </span>
                                                    )}
                                                </div>
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
                                            <div className="space-y-2">
                                                <TouchEnhancedButton
                                                    onClick={() => setMatchThreshold(0.1)}
                                                    className="text-indigo-600 hover:text-indigo-900 text-sm block mx-auto"
                                                >
                                                    Try lowering the match threshold to 10%
                                                </TouchEnhancedButton>
                                                {(dietaryFilters.includeFilters.length > 0 || dietaryFilters.excludeFilters.length > 0) && (
                                                    <TouchEnhancedButton
                                                        onClick={() => setDietaryFilters(prev => ({
                                                            ...prev,
                                                            includeFilters: [],
                                                            excludeFilters: [],
                                                            useProfileDefaults: false
                                                        }))}
                                                        className="text-indigo-600 hover:text-indigo-900 text-sm block mx-auto"
                                                    >
                                                        or clear dietary filters
                                                    </TouchEnhancedButton>
                                                )}
                                            </div>
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
                                                                    <div className="flex-shrink-0 mt-2 sm:mt-0 flex gap-2">
                                                                        <div className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getMatchColor(recipe.analysis.matchPercentage)}`}>
                                                                            {Math.round(recipe.analysis.matchPercentage * 100)}% Match
                                                                        </div>
                                                                        {/* NEW: Multi-part recipe indicator */}
                                                                        {recipe.analysis.isMultiPart && (
                                                                            <div className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                                                                🔧 Multi-Part
                                                                            </div>
                                                                        )}
                                                                        {/* Show dietary tags */}
                                                                        {recipe.tags && recipe.tags.some(tag =>
                                                                            ['vegan', 'vegetarian', 'gluten-free', 'gluten free', 'keto', 'low carb', 'low-carb'].some(diet =>
                                                                                tag.toLowerCase().includes(diet)
                                                                            )
                                                                        ) && (
                                                                            <div className="flex gap-1">
                                                                                {recipe.tags.filter(tag =>
                                                                                    ['vegan', 'vegetarian', 'gluten-free', 'gluten free', 'keto', 'low carb', 'low-carb'].some(diet =>
                                                                                        tag.toLowerCase().includes(diet)
                                                                                    )
                                                                                ).slice(0, 2).map((tag, idx) => (
                                                                                    <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                                                        {tag}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        )}
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
                                                                {/* NEW: Multi-part recipe info */}
                                                                {recipe.analysis.isMultiPart && recipe.analysis.partsAnalysis && (
                                                                    <div className="mt-2 p-2 bg-purple-50 rounded border border-purple-200">
                                                                        <div className="text-xs font-medium text-purple-800 mb-1">Recipe Parts:</div>
                                                                        {Object.entries(recipe.analysis.partsAnalysis).map(([partName, partAnalysis]) => (
                                                                            <div key={partName} className="text-xs text-purple-700">
                                                                                • {partName}: {Math.round(partAnalysis.matchPercentage * 100)}% match
                                                                            </div>
                                                                        ))}
                                                                    </div>
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
                                                                        {/* NEW: Show part name for multi-part recipes */}
                                                                        {ingredient.partName && (
                                                                            <span className="text-xs text-purple-600 ml-1">({ingredient.partName})</span>
                                                                        )}
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
                                                                        {/* NEW: Show part name for multi-part recipes */}
                                                                        {ingredient.partName && (
                                                                            <span className="text-xs text-purple-600 ml-1">({ingredient.partName})</span>
                                                                        )}
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
                                                                   🛒 Missing ingredients needed ⚠️
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <TouchEnhancedButton
                                                                onClick={() => loadRecipeDetails(recipe._id)}
                                                                disabled={loadingRecipe}
                                                                className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 min-h-[36px]"
                                                            >
                                                                {loadingRecipe ? 'Loading...' : 'View Recipe'}
                                                            </TouchEnhancedButton>
                                                            {(recipe.analysis.matchPercentage * 100) < 100 && (
                                                                <TouchEnhancedButton
                                                                    onClick={async () => {
                                                                        if (!recipe || !recipe.analysis) {
                                                                            const {NativeDialog} = await import('@/components/mobile/NativeDialog');
                                                                            await NativeDialog.showError({
                                                                                title: 'Analysis Unavailable',
                                                                                message: 'Recipe analysis not available'
                                                                            });
                                                                            return;
                                                                        }

                                                                        // Create shopping list from missing ingredients
                                                                        const shoppingListData = {
                                                                            items: {
                                                                                'Grocery': recipe.analysis.missingIngredients.map(ingredient => ({
                                                                                    name: ingredient.name,
                                                                                    ingredient: ingredient.name,
                                                                                    amount: ingredient.amount || '',
                                                                                    unit: ingredient.unit || '',
                                                                                    category: 'Grocery',
                                                                                    recipes: [recipe.title],
                                                                                    inInventory: false,
                                                                                    inventoryItem: null,
                                                                                    purchased: false,
                                                                                    itemKey: `${ingredient.name}-Grocery`,
                                                                                    haveAmount: '',
                                                                                    needAmount: ingredient.amount || '',
                                                                                    notes: ingredient.partName ? `For ${ingredient.partName}` : '',
                                                                                    partName: ingredient.partName || null // NEW: Include part context
                                                                                }))
                                                                            },
                                                                            summary: {
                                                                                totalItems: recipe.analysis.missingIngredients.length,
                                                                                needToBuy: recipe.analysis.missingIngredients.length,
                                                                                inInventory: 0,
                                                                                purchased: 0
                                                                            },
                                                                            recipes: [recipe.title],
                                                                            generatedAt: new Date().toISOString()
                                                                        };

                                                                        setShowShoppingList({
                                                                            recipeId: recipe._id,
                                                                            recipeName: recipe.title,
                                                                            type: 'recipe',
                                                                            shoppingListData: shoppingListData
                                                                        });
                                                                    }}
                                                                    className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 min-h-[36px]"
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
                                                                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd"/>
                                                            </svg>
                                                        </TouchEnhancedButton>

                                                        {Array.from({length: getTotalPages(filteredSuggestions.length, itemsPerPage)}, (_, i) => i + 1)
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
                                                                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd"/>
                                                            </svg>
                                                        </TouchEnhancedButton>
                                                    </nav>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Curated Meals Tab - keeping existing curated meals code */}
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
                                                    {/* Keep existing curated meal display code */}
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
                                                    {/* Keep existing meal components and action buttons */}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!analysisComplete && dataLoaded && (
                    <div className="bg-white shadow rounded-lg p-8">
                        <div className="text-center">
                            <div className="text-gray-400 mb-4">
                                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Find Recipes!</h3>
                            <p className="text-gray-500 mb-6">
                                Your data is loaded and indexed. Set your preferences above and click "Find Recipes" to see what you can make with your current inventory.
                            </p>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="text-blue-800 text-sm">
                                    <strong>💡 Tip:</strong> Start with a 40% match threshold and experiment with dietary filters to find recipes that match your preferences. You can always adjust and re-analyze!
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recipe Modal - UPDATED to handle multi-part recipes */}
                {showRecipeModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    {showRecipeModal.title}
                                    {showRecipeModal.isMultiPart && (
                                        <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                            🔧 Multi-Part Recipe
                                        </span>
                                    )}
                                </h2>
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

                                {/* NEW: Multi-part recipe display */}
                                {showRecipeModal.isMultiPart && showRecipeModal.parts ? (
                                    <div className="space-y-8">
                                        {showRecipeModal.parts.map((part, partIndex) => (
                                            <div key={partIndex} className="border border-purple-200 rounded-lg p-6 bg-purple-50">
                                                <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
                                                    <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                                                        {partIndex + 1}
                                                    </span>
                                                    {part.name}
                                                    {part.type && (
                                                        <span className="ml-2 px-2 py-1 bg-purple-200 text-purple-800 text-xs rounded-full">
                                                            {part.type}
                                                        </span>
                                                    )}
                                                </h3>

                                                {part.description && (
                                                    <p className="text-purple-700 mb-4 italic">{part.description}</p>
                                                )}

                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                    <div>
                                                        <h4 className="text-md font-semibold text-purple-900 mb-3">Ingredients</h4>
                                                        <ul className="space-y-2">
                                                            {part.ingredients?.map((ingredient, index) => (
                                                                <li key={index} className="flex items-start space-x-4">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
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
                                                        <h4 className="text-md font-semibold text-purple-900 mb-3">Instructions</h4>
                                                        <ol className="space-y-3">
                                                            {part.instructions?.map((instruction, index) => (
                                                                <li key={index} className="flex items-start space-x-3">
                                                                    <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                                                                        {index + 1}
                                                                    </span>
                                                                    <p className="text-gray-700 leading-relaxed text-sm">{instruction}</p>
                                                                </li>
                                                            ))}
                                                        </ol>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    /* Single-part recipe display (existing) */
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
                                )}
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
                    <EnhancedAIShoppingListModal
                        isOpen={true}
                        onClose={() => setShowShoppingList(null)}
                        shoppingList={showShoppingList.shoppingListData}
                        title="🛒 Shopping List"
                        subtitle={showShoppingList.type === 'recipe' ? showShoppingList.recipeName : showShoppingList.mealName}
                        sourceRecipeIds={showShoppingList.type === 'recipe' ? [showShoppingList.recipeId] : []}
                        sourceMealPlanId={null}
                        showRefresh={false}
                    />
                )}

                <Footer/>
            </div>
        </MobileOptimizedLayout>
    );
}

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