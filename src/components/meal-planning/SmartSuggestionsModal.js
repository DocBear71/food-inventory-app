'use client';

// file: /src/components/meal-planning/SmartSuggestionsModal.js v2 - Enhanced error handling

import { useState } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';

export default function SmartSuggestionsModal({
                                                  isOpen,
                                                  onClose,
                                                  suggestions = [],
                                                  onApplySuggestion,
                                                  isLoading = false,
                                                  mealPlan = null,
                                                  onMealPlanUpdate = null,
                                                  error = null // Add error prop
                                              }) {
    const [selectedSuggestion, setSelectedSuggestion] = useState(null);
    const [applyingIndex, setApplyingIndex] = useState(null);

    if (!isOpen) return null;

    const formatPrice = (price) => {
        return typeof price === 'number' ? `$${price.toFixed(2)}` : '$0.00';
    };

    const getSuggestionIcon = (type) => {
        const icons = {
            'inventory_expiry': '⏰',
            'batch_cooking': '🍲',
            'deal_opportunity': '🏷️',
            'budget_optimization': '💰',
            'seasonal': '🌱',
            'nutrition_balance': '🥗'
        };
        return icons[type] || '💡';
    };

    const getUrgencyColor = (urgency) => {
        const colors = {
            'high': 'bg-red-100 text-red-800 border-red-200',
            'medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'low': 'bg-green-100 text-green-800 border-green-200'
        };
        return colors[urgency] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    const handleApplySuggestion = async (suggestion, index) => {
        setApplyingIndex(index);

        try {
            if (suggestion.action === 'replace_meal' || suggestion.action === 'add_meal') {
                // For recipe suggestions, open recipe selection modal with pre-filtered recipes
                if (suggestion.recipes && suggestion.recipes.length > 0) {
                    const message = `📝 Ready to apply this suggestion!\n\n` +
                        `💡 ${suggestion.title}\n\n` +
                        `📋 Steps to apply:\n` +
                        `1. Choose one of these recommended recipes:\n` +
                        suggestion.recipes.slice(0, 3).map((recipe, idx) =>
                            `   ${idx + 1}. ${recipe.name} (${recipe.difficulty || 'medium'})`
                        ).join('\n') +
                        `\n\n2. ${suggestion.action === 'replace_meal' ? 'Replace an existing meal' : 'Add to an empty meal slot'}` +
                        `${suggestion.targetSlots && suggestion.targetSlots.length > 0 ?
                            `\n\n📅 Available slots:\n${suggestion.targetSlots.slice(0, 3).map(slot => `   • ${slot.day} ${slot.mealType}`).join('\n')}` :
                            ''
                        }` +
                        `\n\n💰 Potential savings: ${formatPrice(suggestion.savings || 0)}`;

                    alert(message);

                    // Call the parent's apply function for advanced handling
                    if (onApplySuggestion) {
                        await onApplySuggestion(suggestion);
                    }
                }
            } else if (suggestion.action === 'meal_prep') {
                // For meal prep suggestions
                const message = `🍲 Meal Prep Suggestion Ready!\n\n` +
                    `💡 ${suggestion.title}\n\n` +
                    `📋 How to start meal prep:\n` +
                    `1. Choose a recipe for batch cooking:\n` +
                    suggestion.recipes.slice(0, 2).map((recipe, idx) =>
                        `   ${idx + 1}. ${recipe.name} (serves ${recipe.servings || 'multiple'})`
                    ).join('\n') +
                    `\n\n2. Cook a larger batch (2-3x normal serving)\n` +
                    `3. Use portions for multiple meals this week\n` +
                    `4. Store properly for freshness\n\n` +
                    `💰 Estimated savings: ${formatPrice(suggestion.savings || 0)}\n` +
                    `⏰ Time saved: 2-3 hours this week`;

                alert(message);

                if (onApplySuggestion) {
                    await onApplySuggestion(suggestion);
                }
            } else if (suggestion.type === 'deal_opportunity') {
                // For deal-based suggestions
                let message = `🏷️ Deal Alert!\n\n` +
                    `💡 ${suggestion.title}\n\n`;

                if (suggestion.dealInfo) {
                    message += `🏪 Store: ${suggestion.dealInfo.store}\n` +
                        `💰 Price: ${formatPrice(suggestion.dealInfo.salePrice)} ` +
                        `(was ${formatPrice(suggestion.dealInfo.originalPrice)})\n` +
                        `🎯 Savings: ${suggestion.dealInfo.savingsPercent}% off\n`;

                    if (suggestion.dealInfo.validUntil) {
                        const validDate = new Date(suggestion.dealInfo.validUntil).toLocaleDateString();
                        message += `⏰ Valid until: ${validDate}\n`;
                    }
                }

                message += `\n📋 Recommended recipes using this ingredient:\n` +
                    suggestion.recipes.slice(0, 3).map((recipe, idx) =>
                        `   ${idx + 1}. ${recipe.name}`
                    ).join('\n') +
                    `\n\n💡 Tip: Stock up while it's on sale and plan meals around this ingredient!`;

                alert(message);

                if (onApplySuggestion) {
                    await onApplySuggestion(suggestion);
                }
            } else {
                // General suggestions
                const message = `💡 ${suggestion.title}\n\n` +
                    `📝 ${suggestion.description}\n\n` +
                    `💰 Potential savings: ${formatPrice(suggestion.savings || 0)}\n\n` +
                    `📋 Benefits:\n${(suggestion.benefits || suggestion.healthBenefits || ['General improvement']).map(benefit => `   • ${benefit}`).join('\n')}`;

                alert(message);

                if (onApplySuggestion) {
                    await onApplySuggestion(suggestion);
                }
            }

        } catch (error) {
            console.error('Error applying suggestion:', error);
            alert(`Error applying suggestion: ${error.message}`);
        } finally {
            setApplyingIndex(null);
        }
    };

    const totalSavings = suggestions.reduce((sum, s) => sum + (s.savings || 0), 0);
    const highPrioritySuggestions = suggestions.filter(s => s.urgency === 'high').length;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                💡 Smart Money-Saving Ideas
                            </h2>
                            <p className="text-gray-600 mt-1">
                                AI-powered suggestions to save money and reduce waste
                            </p>
                        </div>
                        <TouchEnhancedButton
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl leading-none p-2"
                            title="Close suggestions"
                        >
                            ×
                        </TouchEnhancedButton>
                    </div>

                    {/* Summary Stats */}
                    {!isLoading && !error && suggestions.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-3 text-sm">
                            <div className="bg-green-100 text-green-800 px-3 py-2 rounded-full font-medium">
                                💰 Total Potential Savings: {formatPrice(totalSavings)}
                            </div>
                            <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-full font-medium">
                                📊 {suggestions.length} Suggestions Found
                            </div>
                            {highPrioritySuggestions > 0 && (
                                <div className="bg-red-100 text-red-800 px-3 py-2 rounded-full font-medium">
                                    🚨 {highPrioritySuggestions} High Priority
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600 mb-4"></div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing Your Meal Plan</h3>
                            <p className="text-gray-600">Finding money-saving opportunities based on your inventory, dietary preferences, and current deals...</p>
                        </div>
                    ) : error ? (
                        // Error state
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">⚠️</div>
                            <h3 className="text-lg font-medium text-red-900 mb-2">Unable to Generate Suggestions</h3>
                            <p className="text-red-600 mb-4">
                                We encountered an error while analyzing your meal plan.
                            </p>
                            <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg mb-4">
                                <strong>Error details:</strong> {error}
                            </div>
                            <TouchEnhancedButton
                                onClick={onClose}
                                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium"
                            >
                                Close and Try Again
                            </TouchEnhancedButton>
                        </div>
                    ) : suggestions.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">🎉</div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Excellent Work!</h3>
                            <p className="text-gray-600 mb-4">
                                Your meal plan is already well-optimized for both cost and nutrition.
                                No immediate money-saving opportunities were found.
                            </p>
                            <div className="text-sm text-gray-500">
                                💡 Tip: Check back after adding new items to your inventory or when new deals become available.
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {suggestions.map((suggestion, index) => (
                                <div
                                    key={index}
                                    className="border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-all duration-200 bg-white"
                                >
                                    {/* Suggestion Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3 flex-1">
                                            <span className="text-3xl">{getSuggestionIcon(suggestion.type)}</span>
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-900 text-lg">{suggestion.title}</h3>
                                                <p className="text-gray-600 mt-1">{suggestion.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            {suggestion.urgency && (
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(suggestion.urgency)}`}>
                                                    {suggestion.urgency.charAt(0).toUpperCase() + suggestion.urgency.slice(1)} Priority
                                                </span>
                                            )}
                                            {suggestion.savings && (
                                                <div className="text-green-600 font-bold text-lg">
                                                    Save {formatPrice(suggestion.savings)}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Deal Info (for deal opportunities) */}
                                    {suggestion.dealInfo && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium text-yellow-800 flex items-center gap-2">
                                                        🏪 {suggestion.dealInfo.store}
                                                    </div>
                                                    <div className="text-yellow-700 mt-1">
                                                        <span className="line-through text-gray-500">{formatPrice(suggestion.dealInfo.originalPrice)}</span>
                                                        <span className="ml-2 font-bold text-lg">{formatPrice(suggestion.dealInfo.salePrice)}</span>
                                                        <span className="ml-2 bg-green-600 text-white px-2 py-1 rounded text-sm font-medium">
                                                            {suggestion.dealInfo.savingsPercent}% OFF
                                                        </span>
                                                    </div>
                                                </div>
                                                {suggestion.dealInfo.validUntil && (
                                                    <div className="text-sm text-yellow-700 text-right">
                                                        <div className="font-medium">Valid until:</div>
                                                        <div>{new Date(suggestion.dealInfo.validUntil).toLocaleDateString()}</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Suggested Recipes */}
                                    {suggestion.recipes && suggestion.recipes.length > 0 && (
                                        <div className="mb-4">
                                            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                                👨‍🍳 Recommended Recipes ({suggestion.recipes.length})
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {suggestion.recipes.map((recipe, recipeIndex) => (
                                                    <div
                                                        key={recipeIndex}
                                                        className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:bg-gray-100 transition-colors"
                                                    >
                                                        <div className="font-medium text-gray-900 text-sm mb-1">{recipe.name}</div>
                                                        <div className="text-xs text-gray-600 space-y-1">
                                                            {recipe.difficulty && <div>🎯 {recipe.difficulty}</div>}
                                                            {recipe.totalTime && <div>⏱️ {recipe.totalTime} min</div>}
                                                            {recipe.servings && <div>👥 {recipe.servings} servings</div>}
                                                            {recipe.estimatedCost && <div>💰 {formatPrice(recipe.estimatedCost)}</div>}
                                                        </div>
                                                        {recipe.seasonalIngredients && recipe.seasonalIngredients.length > 0 && (
                                                            <div className="text-xs text-green-600 mt-2">
                                                                🌱 Seasonal: {recipe.seasonalIngredients.join(', ')}
                                                            </div>
                                                        )}
                                                        {recipe.nutritionHighlights && recipe.nutritionHighlights.length > 0 && (
                                                            <div className="text-xs text-blue-600 mt-1">
                                                                💪 {recipe.nutritionHighlights.join(', ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Benefits */}
                                    {(suggestion.benefits || suggestion.healthBenefits) && (
                                        <div className="mb-4">
                                            <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                                ✨ Key Benefits
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {(suggestion.benefits || suggestion.healthBenefits || []).map((benefit, benefitIndex) => (
                                                    <span
                                                        key={benefitIndex}
                                                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                                                    >
                                                        {benefit}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Target Slots */}
                                    {suggestion.targetSlots && suggestion.targetSlots.length > 0 && (
                                        <div className="mb-4">
                                            <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                                📅 Available Meal Slots
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {suggestion.targetSlots.slice(0, 6).map((slot, slotIndex) => (
                                                    <span
                                                        key={slotIndex}
                                                        className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium"
                                                    >
                                                        {slot.day} {slot.mealType}
                                                    </span>
                                                ))}
                                                {suggestion.targetSlots.length > 6 && (
                                                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                                                        +{suggestion.targetSlots.length - 6} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-3 mt-5 pt-4 border-t border-gray-100">
                                        <TouchEnhancedButton
                                            onClick={() => handleApplySuggestion(suggestion, index)}
                                            disabled={applyingIndex === index}
                                            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 flex-1 justify-center"
                                        >
                                            {applyingIndex === index ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    Applying...
                                                </>
                                            ) : (
                                                <>
                                                    {suggestion.action === 'replace_meal' ? '🔄 Replace Meal' :
                                                        suggestion.action === 'add_meal' ? '➕ Add to Plan' :
                                                            suggestion.action === 'meal_prep' ? '🍲 Start Meal Prep' :
                                                                '✨ Apply Suggestion'}
                                                </>
                                            )}
                                        </TouchEnhancedButton>

                                        <TouchEnhancedButton
                                            onClick={() => setSelectedSuggestion(selectedSuggestion === index ? null : index)}
                                            className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            {selectedSuggestion === index ? 'Less Info' : 'More Info'}
                                        </TouchEnhancedButton>
                                    </div>

                                    {/* Expanded Info */}
                                    {selectedSuggestion === index && (
                                        <div className="mt-4 pt-4 border-t border-gray-200 bg-gray-50 rounded-lg p-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <h5 className="font-semibold text-gray-800 mb-3">📋 Detailed Information</h5>
                                                    <div className="text-gray-600 space-y-2">
                                                        <div><strong>Category:</strong> {suggestion.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                                                        <div><strong>Priority Score:</strong> {suggestion.priority || 'Medium'}</div>
                                                        {suggestion.season && <div><strong>Season:</strong> {suggestion.season}</div>}
                                                        {suggestion.nutritionGoal && <div><strong>Nutrition Goal:</strong> {suggestion.nutritionGoal}</div>}
                                                        {suggestion.budgetImpact && <div><strong>Budget Impact:</strong> {suggestion.budgetImpact}</div>}
                                                        {suggestion.urgency && <div><strong>Urgency:</strong> {suggestion.urgency}</div>}
                                                    </div>
                                                </div>
                                                {suggestion.recipes && suggestion.recipes.length > 0 && (
                                                    <div>
                                                        <h5 className="font-semibold text-gray-800 mb-3">🍳 All Recipe Options</h5>
                                                        <div className="text-gray-600 space-y-1 max-h-32 overflow-y-auto">
                                                            {suggestion.recipes.map((recipe, idx) => (
                                                                <div key={idx} className="text-sm flex justify-between">
                                                                    <span>• {recipe.name}</span>
                                                                    {recipe.estimatedCost && (
                                                                        <span className="text-green-600 font-medium">
                                                                            {formatPrice(recipe.estimatedCost)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                            <span>💡</span>
                            <span>Suggestions are personalized based on your inventory, dietary preferences, and budget.</span>
                        </div>
                        <div className="flex gap-3">
                            <TouchEnhancedButton
                                onClick={onClose}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                            >
                                Close
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}