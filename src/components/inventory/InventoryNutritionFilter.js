'use client';

// file: /src/components/inventory/InventoryNutritionFilter.js v1 - Filter inventory by nutrition

import React, { useState } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';

export default function InventoryNutritionFilter({
                                                     onFilterChange,
                                                     activeFilters = {},
                                                     className = ""
                                                 }) {
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        hasNutrition: activeFilters.hasNutrition || false,
        highProtein: activeFilters.highProtein || false,
        lowCarb: activeFilters.lowCarb || false,
        lowCalorie: activeFilters.lowCalorie || false,
        highFiber: activeFilters.highFiber || false,
        lowSodium: activeFilters.lowSodium || false,
        ...activeFilters
    });

    const handleFilterChange = (filterKey, value) => {
        const newFilters = { ...filters, [filterKey]: value };
        setFilters(newFilters);

        if (onFilterChange) {
            onFilterChange(newFilters);
        }
    };

    const clearAllFilters = () => {
        const clearedFilters = Object.keys(filters).reduce((acc, key) => {
            acc[key] = false;
            return acc;
        }, {});

        setFilters(clearedFilters);
        if (onFilterChange) {
            onFilterChange(clearedFilters);
        }
    };

    const getActiveFilterCount = () => {
        return Object.values(filters).filter(Boolean).length;
    };

    const filterOptions = [
        {
            key: 'hasNutrition',
            label: 'Has Nutrition Data',
            description: 'Items with available nutrition information',
            icon: '📊'
        },
        {
            key: 'highProtein',
            label: 'High Protein',
            description: 'Items with 10g+ protein per serving',
            icon: '💪'
        },
        {
            key: 'lowCarb',
            label: 'Low Carb',
            description: 'Items with less than 15g carbs per serving',
            icon: '🥬'
        },
        {
            key: 'lowCalorie',
            label: 'Low Calorie',
            description: 'Items with less than 100 calories per serving',
            icon: '⚖️'
        },
        {
            key: 'highFiber',
            label: 'High Fiber',
            description: 'Items with 5g+ fiber per serving',
            icon: '🌾'
        },
        {
            key: 'lowSodium',
            label: 'Low Sodium',
            description: 'Items with less than 140mg sodium per serving',
            icon: '🧂'
        }
    ];

    return (
        <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">🔍 Nutrition Filters</h3>
                    {getActiveFilterCount() > 0 && (
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
                            {getActiveFilterCount()} active
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {getActiveFilterCount() > 0 && (
                        <TouchEnhancedButton
                            onClick={clearAllFilters}
                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                            Clear All
                        </TouchEnhancedButton>
                    )}
                    <TouchEnhancedButton
                        onClick={() => setShowFilters(!showFilters)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        {showFilters ? '▲ Hide' : '▼ Show'}
                    </TouchEnhancedButton>
                </div>
            </div>

            {/* Quick Filter Pills */}
            <div className="flex flex-wrap gap-2 mb-3">
                {filterOptions.slice(0, 3).map(option => (
                    <TouchEnhancedButton
                        key={option.key}
                        onClick={() => handleFilterChange(option.key, !filters[option.key])}
                        className={`text-xs px-3 py-1 rounded-full transition-colors ${
                            filters[option.key]
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        {option.icon} {option.label}
                    </TouchEnhancedButton>
                ))}
            </div>

            {/* Expanded Filters */}
            {showFilters && (
                <div className="space-y-3 pt-3 border-t border-gray-200">
                    {filterOptions.map(option => (
                        <div key={option.key} className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{option.icon}</span>
                                    <span className="font-medium text-gray-900">
                                        {option.label}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1 ml-7">
                                    {option.description}
                                </p>
                            </div>

                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters[option.key]}
                                    onChange={(e) => handleFilterChange(option.key, e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}