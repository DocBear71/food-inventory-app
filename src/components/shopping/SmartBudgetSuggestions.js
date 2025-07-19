'use client';

// file: /src/components/shopping/SmartBudgetSuggestions.js

import React, { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';

export function SmartBudgetSuggestions({ shoppingList, budget, onApplySuggestion }) {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        generateSuggestions();
    }, [shoppingList, budget]);

    const generateSuggestions = async () => {
        if (!budget || shoppingList.length === 0) return;

        setLoading(true);
        try {
            const response = await fetch('/api/shopping/budget-suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shoppingList, budget })
            });

            if (response.ok) {
                const data = await response.json();
                setSuggestions(data.suggestions || []);
            }
        } catch (error) {
            console.error('Error generating suggestions:', error);
        } finally {
            setLoading(false);
        }
    };

    const applySuggestion = (suggestion) => {
        onApplySuggestion?.(suggestion);
        setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (suggestions.length === 0) return null;

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Smart Budget Suggestions</h3>

            <div className="space-y-3">
                {suggestions.map((suggestion) => (
                    <div
                        key={suggestion.id}
                        className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg"
                    >
                        <span className="text-xl">{suggestion.icon}</span>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                                {suggestion.title}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                                {suggestion.description}
                            </p>
                            <p className="text-xs text-green-600 mt-1 font-medium">
                                💰 Save ${suggestion.savings.toFixed(2)}
                            </p>
                        </div>
                        <TouchEnhancedButton
                            onClick={() => applySuggestion(suggestion)}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                            Apply
                        </TouchEnhancedButton>
                    </div>
                ))}
            </div>
        </div>
    );
}

