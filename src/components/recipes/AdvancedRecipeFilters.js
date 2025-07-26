'use client';

// file: /src/components/recipes/AdvancedRecipeFilters.js v1 - Enhanced recipe filtering interface

import React, { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import KeyboardOptimizedInput from '@/components/forms/KeyboardOptimizedInput';

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
        sortBy: 'relevance',
        ...initialFilters
    });

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showNutrition, setShowNutrition] = useState(false);
    const [showDietary, setShowDietary] = useState(false);

    useEffect(() => {
        onFiltersChange(filters);
    }, [filters]);

    const updateFilter = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const updateArrayFilter = (key, value, isAdd) => {
        setFilters(prev => ({
            ...prev,
            [key]: isAdd
                ? [...(prev[key] || []), value]
                : (prev[key] || []).filter(item => item !== value)
        }));
    };

    const updateNutritionFilter = (key, value) => {
        setFilters(prev => ({
            ...prev,
            nutrition: { ...prev.nutrition, [key]: value }
        }));
    };

    const clearFilters = () => {
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
            sortBy: 'relevance'
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

    return (
        <div className="bg-white rounded-lg border shadow-sm">
            {/* Main Search Bar - FIXED */}
            <div className="p-4 border-b">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={filters.query}
                        onChange={(e) => updateFilter('query', e.target.value)}
                        placeholder="Search recipes, ingredients, or descriptions..."
                        className="w-full border border-gray-300 rounded-lg text-base focus:ring-indigo-500 focus:border-indigo-500"
                        style={{
                            paddingLeft: '2.5rem',
                            paddingRight: filters.query ? '2.5rem' : '1rem',
                            paddingTop: '0.75rem',
                            paddingBottom: '0.75rem'
                        }}
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
                    {/* Category */}
                    <select
                        value={filters.category}
                        onChange={(e) => updateFilter('category', e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="">All Categories</option>
                        {availableCategories.map(category => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>

                    {/* Difficulty */}
                    <select
                        value={filters.difficulty}
                        onChange={(e) => updateFilter('difficulty', e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="">Any Difficulty</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>

                    {/* Max Time */}
                    <select
                        value={filters.maxCookTime}
                        onChange={(e) => updateFilter('maxCookTime', e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="">Any Time</option>
                        <option value="15">15 min or less</option>
                        <option value="30">30 min or less</option>
                        <option value="60">1 hour or less</option>
                        <option value="120">2 hours or less</option>
                    </select>

                    {/* Rating */}
                    <select
                        value={filters.minRating}
                        onChange={(e) => updateFilter('minRating', e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="">Any Rating</option>
                        <option value="4">4+ Stars</option>
                        <option value="3">3+ Stars</option>
                        <option value="2">2+ Stars</option>
                    </select>

                    {/* Sort */}
                    <select
                        value={filters.sortBy}
                        onChange={(e) => updateFilter('sortBy', e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="relevance">Most Relevant</option>
                        <option value="rating">Highest Rated</option>
                        <option value="popular">Most Popular</option>
                        <option value="newest">Newest First</option>
                        <option value="quickest">Quickest First</option>
                        <option value="easiest">Easiest First</option>
                        <option value="title">Alphabetical</option>
                    </select>

                    {/* Advanced Toggle */}
                    <TouchEnhancedButton
                        onClick={() => setShowAdvanced(!showAdvanced)}
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
                            onClick={() => setShowDietary(!showDietary)}
                            className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"
                        >
                            🥗 Dietary Restrictions
                            <span className="text-xs">{showDietary ? '▼' : '▶'}</span>
                        </TouchEnhancedButton>

                        {showDietary && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free'].map(restriction => (
                                    <label key={restriction} className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={filters.dietaryRestrictions?.includes(restriction)}
                                            onChange={(e) => updateArrayFilter('dietaryRestrictions', restriction, e.target.checked)}
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="capitalize">{restriction.replace('-', ' ')}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Nutrition Filters */}
                    <div>
                        <TouchEnhancedButton
                            onClick={() => setShowNutrition(!showNutrition)}
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
                                    <KeyboardOptimizedInput
                                        type="number"
                                        value={filters.nutrition.maxCalories || ''}
                                        onChange={(e) => updateNutritionFilter('maxCalories', e.target.value)}
                                        placeholder="500"
                                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                        Min Protein (g)
                                    </label>
                                    <KeyboardOptimizedInput
                                        type="number"
                                        value={filters.nutrition.minProtein || ''}
                                        onChange={(e) => updateNutritionFilter('minProtein', e.target.value)}
                                        placeholder="20"
                                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-xs">
                                        <input
                                            type="checkbox"
                                            checked={filters.nutrition.lowCarb || false}
                                            onChange={(e) => updateNutritionFilter('lowCarb', e.target.checked)}
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        Low Carb (&lt;20g)
                                    </label>
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-xs">
                                        <input
                                            type="checkbox"
                                            checked={filters.nutrition.highProtein || false}
                                            onChange={(e) => updateNutritionFilter('highProtein', e.target.checked)}
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        High Protein (&gt;20g)
                                    </label>
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