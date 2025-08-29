'use client';
// file: /src/components/recipes/AdvancedRecipeFilters.js v3 - iOS Native Enhancements

import React, { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import {
    NativeTextInput,
    NativeSelect,
    NativeCheckbox
} from '@/components/forms/NativeIOSFormComponents';
import { PlatformDetection } from '@/utils/PlatformDetection';

export default function AdvancedRecipeFilters({
                                                  onFiltersChange,
                                                  initialFilters = {},
                                                  availableTags = [],
                                                  availableCategories = []
                                              }) {
    const [filters, setFilters] = useState({
        query: '',
        category: '',
        tags: [],
        difficulty: '',
        maxCookTime: '',
        maxPrepTime: '',
        servings: '',
        minRating: '',
        includeIngredients: [],
        excludeIngredients: [],
        dietaryRestrictions: [],
        nutrition: {},
        sortBy: 'featured',
        ...initialFilters
    });

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showNutrition, setShowNutrition] = useState(false);
    const [showDietary, setShowDietary] = useState(false);

    const isIOS = PlatformDetection.isIOS();

    useEffect(() => {
        onFiltersChange(filters);
    }, [filters]);

    const updateFilter = async (key, value) => {
        // iOS haptic feedback for filter changes
        if (isIOS) {
            try {
                const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.selection();
            } catch (error) {
                console.log('Filter haptic failed:', error);
            }
        }

        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const updateArrayFilter = async (key, value, isAdd) => {
        // iOS haptic feedback for array changes
        if (isIOS) {
            try {
                const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.selection();
            } catch (error) {
                console.log('Array filter haptic failed:', error);
            }
        }

        setFilters(prev => ({
            ...prev,
            [key]: isAdd
                ? [...(prev[key] || []), value]
                : (prev[key] || []).filter(item => item !== value)
        }));
    };

    const updateNutritionFilter = async (key, value) => {
        // iOS haptic for nutrition filter changes
        if (isIOS) {
            try {
                const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.selection();
            } catch (error) {
                console.log('Nutrition filter haptic failed:', error);
            }
        }

        setFilters(prev => ({
            ...prev,
            nutrition: { ...prev.nutrition, [key]: value }
        }));
    };

    // iOS Native Sort Option Sheet
    const showSortActionSheet = async () => {
        if (!isIOS) {
            return; // Fallback handled by normal select
        }

        try {
            const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
            await MobileHaptics.buttonTap();

            const sortOptions = [
                { value: 'featured', label: '✨ Featured', description: 'Quality recipes with daily variety' },
                { value: 'random', label: '🎲 Random', description: 'Completely random order' },
                { value: 'relevance', label: 'Most Relevant', description: 'Best matches for search' },
                { value: 'rating', label: 'Highest Rated', description: 'Best rated recipes first' },
                { value: 'popular', label: 'Most Popular', description: 'Most viewed recipes' },
                { value: 'newest', label: 'Recently Added', description: 'Newest recipes first' },
                { value: 'quickest', label: 'Quickest First', description: 'Shortest cooking time' },
                { value: 'easiest', label: 'Easiest First', description: 'Simplest recipes first' },
                { value: 'title', label: 'Alphabetical', description: 'A-Z order' }
            ];

            const buttons = sortOptions.map(option => ({
                text: filters.sortBy === option.value
                    ? `${option.label} ✓`
                    : option.label,
                style: 'default',
                action: () => {
                    updateFilter('sortBy', option.value);
                    return option.value;
                }
            }));

            buttons.push({
                text: 'Cancel',
                style: 'cancel',
                action: () => null
            });

            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showActionSheet({
                title: 'Sort Recipes',
                message: 'Choose how to sort recipes',
                buttons
            });

        } catch (error) {
            console.error('Sort action sheet error:', error);
        }
    };

    // iOS Native Category Selection Sheet
    const showCategoryActionSheet = async () => {
        if (!isIOS) {
            return;
        }

        try {
            const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
            await MobileHaptics.buttonTap();

            const buttons = [
                {
                    text: filters.category === '' ? 'All Categories ✓' : 'All Categories',
                    style: 'default',
                    action: () => {
                        updateFilter('category', '');
                        return '';
                    }
                }
            ];

            availableCategories.forEach(category => {
                buttons.push({
                    text: filters.category === category
                        ? `${category} ✓`
                        : category,
                    style: 'default',
                    action: () => {
                        updateFilter('category', category);
                        return category;
                    }
                });
            });

            buttons.push({
                text: 'Cancel',
                style: 'cancel',
                action: () => null
            });

            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showActionSheet({
                title: 'Recipe Category',
                message: 'Choose a recipe category to filter by',
                buttons
            });

        } catch (error) {
            console.error('Category action sheet error:', error);
        }
    };

    const clearFilters = async () => {
        // iOS haptic for clear action
        if (isIOS) {
            try {
                const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.notificationWarning();
            } catch (error) {
                console.log('Clear filters haptic failed:', error);
            }
        }

        setFilters({
            query: '',
            category: '',
            tags: [],
            difficulty: '',
            maxCookTime: '',
            maxPrepTime: '',
            servings: '',
            minRating: '',
            includeIngredients: [],
            excludeIngredients: [],
            dietaryRestrictions: [],
            nutrition: {},
            sortBy: 'featured'
        });
    };

    const getActiveFilterCount = () => {
        let count = 0;
        if (filters.query?.trim()) count++;
        if (filters.category) count++;
        if (filters.tags?.length > 0) count++;
        if (filters.difficulty) count++;
        if (filters.maxCookTime) count++;
        if (filters.maxPrepTime) count++;
        if (filters.servings) count++;
        if (filters.minRating) count++;
        if (filters.includeIngredients?.length > 0) count++;
        if (filters.excludeIngredients?.length > 0) count++;
        if (filters.dietaryRestrictions?.length > 0) count++;
        if (Object.keys(filters.nutrition).length > 0) count++;
        return count;
    };

    const getSortDescription = (sortValue) => {
        const descriptions = {
            'featured': 'Quality recipes with daily variety',
            'random': 'Completely random order',
            'relevance': 'Most relevant to search',
            'rating': 'Highest rated first',
            'popular': 'Most viewed recipes',
            'newest': 'Recently added recipes',
            'quickest': 'Shortest cooking time',
            'easiest': 'Easiest difficulty first',
            'title': 'Alphabetical order'
        };
        return descriptions[sortValue] || '';
    };

    // Handle advanced section toggle with haptic feedback
    const toggleAdvanced = async () => {
        if (isIOS) {
            try {
                const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.buttonTap();
            } catch (error) {
                console.log('Toggle haptic failed:', error);
            }
        }
        setShowAdvanced(!showAdvanced);
    };

    // Handle nutrition section toggle
    const toggleNutrition = async () => {
        if (isIOS) {
            try {
                const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.buttonTap();
            } catch (error) {
                console.log('Nutrition toggle haptic failed:', error);
            }
        }
        setShowNutrition(!showNutrition);
    };

    // Handle dietary section toggle
    const toggleDietary = async () => {
        if (isIOS) {
            try {
                const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.buttonTap();
            } catch (error) {
                console.log('Dietary toggle haptic failed:', error);
            }
        }
        setShowDietary(!showDietary);
    };

    return (
        <div className="bg-white rounded-lg border shadow-sm">
            {/* Main Search Bar */}
            <div className="p-4 border-b">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <NativeTextInput
                        type="text"
                        value={filters.query}
                        onChange={(e) => updateFilter('query', e.target.value)}
                        placeholder="Search recipes, ingredients, or descriptions..."
                        className="pl-10 pr-10"
                        style={{
                            paddingLeft: '2.5rem',
                            paddingRight: filters.query ? '2.5rem' : '1rem'
                        }}
                        validation={(value) => ({
                            isValid: true,
                            message: value && value.length > 2 ? `Searching for: ${value}` : ''
                        })}
                    />
                    {filters.query && (
                        <TouchEnhancedButton
                            onClick={() => updateFilter('query', '')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 z-10"
                        >
                            ✕
                        </TouchEnhancedButton>
                    )}
                </div>
            </div>

            {/* Quick Filters */}
            <div className="p-4 border-b bg-gray-50">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {/* Category - iOS uses action sheet, others use select */}
                    {isIOS ? (
                        <TouchEnhancedButton
                            onClick={showCategoryActionSheet}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-left flex items-center justify-between"
                        >
                            <span>{filters.category || 'All Categories'}</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </TouchEnhancedButton>
                    ) : (
                        <NativeSelect
                            value={filters.category}
                            onChange={(e) => updateFilter('category', e.target.value)}
                            options={[
                                { value: '', label: 'All Categories' },
                                ...availableCategories.map(cat => ({ value: cat, label: cat }))
                            ]}
                        />
                    )}

                    {/* Difficulty */}
                    <NativeSelect
                        value={filters.difficulty}
                        onChange={(e) => updateFilter('difficulty', e.target.value)}
                        options={[
                            { value: '', label: 'Any Difficulty' },
                            { value: 'easy', label: 'Easy' },
                            { value: 'medium', label: 'Medium' },
                            { value: 'hard', label: 'Hard' }
                        ]}
                    />

                    {/* Max Time */}
                    <NativeSelect
                        value={filters.maxCookTime}
                        onChange={(e) => updateFilter('maxCookTime', e.target.value)}
                        options={[
                            { value: '', label: 'Any Time' },
                            { value: '15', label: '15 min or less' },
                            { value: '30', label: '30 min or less' },
                            { value: '60', label: '1 hour or less' },
                            { value: '120', label: '2 hours or less' }
                        ]}
                    />

                    {/* Rating */}
                    <NativeSelect
                        value={filters.minRating}
                        onChange={(e) => updateFilter('minRating', e.target.value)}
                        options={[
                            { value: '', label: 'Any Rating' },
                            { value: '4', label: '4+ Stars' },
                            { value: '3', label: '3+ Stars' },
                            { value: '2', label: '2+ Stars' }
                        ]}
                    />

                    {/* Sort - iOS uses action sheet */}
                    {isIOS ? (
                        <TouchEnhancedButton
                            onClick={showSortActionSheet}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white text-left flex items-center justify-between"
                            title={getSortDescription(filters.sortBy)}
                        >
                            <span>
                                {filters.sortBy === 'featured' && '✨ Featured'}
                                {filters.sortBy === 'random' && '🎲 Random'}
                                {filters.sortBy === 'relevance' && 'Relevant'}
                                {filters.sortBy === 'rating' && 'Top Rated'}
                                {filters.sortBy === 'popular' && 'Popular'}
                                {filters.sortBy === 'newest' && 'Newest'}
                                {filters.sortBy === 'quickest' && 'Quickest'}
                                {filters.sortBy === 'easiest' && 'Easiest'}
                                {filters.sortBy === 'title' && 'A-Z'}
                            </span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </TouchEnhancedButton>
                    ) : (
                        <NativeSelect
                            value={filters.sortBy}
                            onChange={(e) => updateFilter('sortBy', e.target.value)}
                            title={getSortDescription(filters.sortBy)}
                            options={[
                                { value: 'featured', label: '✨ Featured' },
                                { value: 'random', label: '🎲 Random' },
                                { value: 'relevance', label: 'Most Relevant' },
                                { value: 'rating', label: 'Highest Rated' },
                                { value: 'popular', label: 'Most Popular' },
                                { value: 'newest', label: 'Newest First' },
                                { value: 'quickest', label: 'Quickest First' },
                                { value: 'easiest', label: 'Easiest First' },
                                { value: 'title', label: 'Alphabetical' }
                            ]}
                        />
                    )}

                    {/* Advanced Toggle */}
                    <TouchEnhancedButton
                        onClick={toggleAdvanced}
                        className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            showAdvanced
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                        ⚙️ Advanced
                        {getActiveFilterCount() > 0 && (
                            <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {getActiveFilterCount()}
                            </span>
                        )}
                    </TouchEnhancedButton>
                </div>

                {/* Sort explanation */}
                {(filters.sortBy === 'featured' || filters.sortBy === 'random') && (
                    <div className="mt-3">
                        {filters.sortBy === 'featured' && (
                            <div className="p-2 bg-purple-50 border border-purple-200 rounded-md">
                                <p className="text-xs text-purple-700">
                                    ✨ <strong>Featured:</strong> {getSortDescription('featured')}. Multi-part recipes, highly rated, and recent additions are prioritized.
                                </p>
                            </div>
                        )}

                        {filters.sortBy === 'random' && (
                            <div className="p-2 bg-green-50 border border-green-200 rounded-md">
                                <p className="text-xs text-green-700">
                                    🎲 <strong>Random:</strong> {getSortDescription('random')}. Refresh or change filters for a new random arrangement.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Advanced Filters */}
            {showAdvanced && (
                <div className="p-4 space-y-4 bg-gray-50">
                    {/* Tags Selection */}
                    {availableTags.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Recipe Tags
                            </label>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                {availableTags.slice(0, 20).map(tag => (
                                    <TouchEnhancedButton
                                        key={tag}
                                        onClick={() => updateArrayFilter('tags', tag, !filters.tags?.includes(tag))}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                            filters.tags?.includes(tag)
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

                    {/* Dietary Restrictions */}
                    <div>
                        <TouchEnhancedButton
                            onClick={toggleDietary}
                            className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"
                        >
                            🥗 Dietary Restrictions
                            <span className="text-xs">{showDietary ? '▼' : '▶'}</span>
                        </TouchEnhancedButton>

                        {showDietary && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free'].map(restriction => (
                                    <NativeCheckbox
                                        key={restriction}
                                        name={restriction}
                                        checked={filters.dietaryRestrictions?.includes(restriction)}
                                        onChange={(e) => updateArrayFilter('dietaryRestrictions', restriction, e.target.checked)}
                                        label={restriction.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Nutrition Filters */}
                    <div>
                        <TouchEnhancedButton
                            onClick={toggleNutrition}
                            className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"
                        >
                            📊 Nutrition Filters
                            <span className="text-xs">{showNutrition ? '▼' : '▶'}</span>
                        </TouchEnhancedButton>

                        {showNutrition && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                        Max Calories
                                    </label>
                                    <NativeTextInput
                                        type="number"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={filters.nutrition.maxCalories || ''}
                                        onChange={(e) => updateNutritionFilter('maxCalories', e.target.value)}
                                        placeholder="500"
                                        autoComplete="off"
                                        min="0"
                                        max="3000"
                                        validation={(value) => {
                                            if (!value) return { isValid: true, message: '' };
                                            const num = parseInt(value);
                                            return {
                                                isValid: num > 0 && num <= 3000,
                                                message: num > 0 && num <= 3000 ? 'Valid calorie limit' : 'Enter 1-3000 calories'
                                            };
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                        Min Protein (g)
                                    </label>
                                    <NativeTextInput
                                        type="number"
                                        inputMode="decimal"
                                        pattern="[0-9]*\.?[0-9]*"
                                        value={filters.nutrition.minProtein || ''}
                                        onChange={(e) => updateNutritionFilter('minProtein', e.target.value)}
                                        placeholder="20"
                                        autoComplete="off"
                                        min="0"
                                        max="200"
                                        validation={(value) => {
                                            if (!value) return { isValid: true, message: '' };
                                            const num = parseFloat(value);
                                            return {
                                                isValid: num > 0 && num <= 200,
                                                message: num > 0 && num <= 200 ? 'Valid protein amount' : 'Enter 1-200 grams'
                                            };
                                        }}
                                    />
                                </div>
                                <div>
                                    <NativeCheckbox
                                        name="lowCarb"
                                        checked={filters.nutrition.lowCarb || false}
                                        onChange={(e) => updateNutritionFilter('lowCarb', e.target.checked)}
                                        label="Low Carb (<20g)"
                                    />
                                </div>
                                <div>
                                    <NativeCheckbox
                                        name="highProtein"
                                        checked={filters.nutrition.highProtein || false}
                                        onChange={(e) => updateNutritionFilter('highProtein', e.target.checked)}
                                        label="High Protein (>20g)"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Clear Filters Button */}
                    {getActiveFilterCount() > 0 && (
                        <div className="pt-4 border-t">
                            <TouchEnhancedButton
                                onClick={clearFilters}
                                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                            >
                                Clear All Filters ({getActiveFilterCount()})
                            </TouchEnhancedButton>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}