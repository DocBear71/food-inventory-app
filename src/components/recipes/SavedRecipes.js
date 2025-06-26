'use client';

// REPLACE entire /src/components/recipes/SavedRecipes.js with this deprecation notice:

import React from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';

const SavedRecipes = ({ onCountChange }) => {
    // This component is deprecated - recipes are now saved via collections only

    return (
        <div className="text-center py-12">
            <div className="text-gray-500 mb-6">
                <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                Recipe Saving Has Evolved!
            </h3>
            <p className="text-gray-600 mb-6 max-w-lg mx-auto">
                We've simplified recipe saving! Instead of individual saved recipes, use <strong>Collections</strong> to organize and save your favorite recipes in themed groups.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 max-w-md mx-auto">
                <h4 className="text-lg font-semibold text-blue-900 mb-3">
                    🎯 Why Collections Are Better:
                </h4>
                <ul className="text-left text-blue-800 space-y-2">
                    <li>• <strong>Better Organization:</strong> Group recipes by theme</li>
                    <li>• <strong>Easy Discovery:</strong> Find recipes faster</li>
                    <li>• <strong>Share Collections:</strong> Share themed recipe groups</li>
                    <li>• <strong>Simplified System:</strong> One way to save recipes</li>
                </ul>
            </div>

            <div className="space-y-4">
                <TouchEnhancedButton
                    onClick={() => window.location.href = '/recipes?tab=collections'}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 text-lg"
                >
                    📁 Go to Collections
                </TouchEnhancedButton>

                <div className="text-sm text-gray-500">
                    <p>Start with collections like "Weekly Favorites", "Comfort Food", or "Quick Meals"</p>
                </div>
            </div>
        </div>
    );
};

export default SavedRecipes;