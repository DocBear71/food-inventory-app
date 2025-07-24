'use client';

// file: /src/components/recipes/RecipeTransformationPanel.js v2 - FIXED API response handling and reset functionality

import { useState } from 'react';
import RecipeScalingWidget from './RecipeScalingWidget';
import UnitConversionWidget from './UnitConversionWidget';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import {apiPost} from "@/lib/api-config.js";
import {detectMeasurementSystem} from "@/lib/recipeTransformation";
import {KeyboardOptimizedInput} from '@/components/forms/KeyboardOptimizedInput';

export default function RecipeTransformationPanel({
                                                      recipe,
                                                      onTransformationChange,
                                                      onRevert,
                                                      className = '',
                                                      showSaveOptions = true,
                                                      defaultExpanded = false
                                                  }) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [activeTab, setActiveTab] = useState('scale'); // 'scale', 'convert', 'both'
    const [servingsInput, setServingsInput] = useState(String(recipe.servings || 4));
    const [isCombinedTransform, setIsCombinedTransform] = useState(false);
    // Add a separate state for the input string
    const [combinedServingsInput, setCombinedServingsInput] = useState(String(recipe.servings || 4));
    const [combinedOptions, setCombinedOptions] = useState({
        targetServings: recipe.servings || 4,
        targetSystem: detectMeasurementSystem(recipe.ingredients || [])
    });

    const handleCombinedTransform = async (saveAsNew = false) => {
        // FIXED: Validate servings input using the string input state
        if (!combinedServingsInput || combinedServingsInput === '' || parseInt(combinedServingsInput) < 1) {
            alert('Please enter a valid number of servings (1 or more)');
            return;
        }

        const servingsToUse = parseInt(combinedServingsInput);

        setIsCombinedTransform(true);

        try {
            console.log('🚀 Starting combined transformation:', {
                targetServings: servingsToUse,
                targetSystem: combinedOptions.targetSystem,
                saveAsNew
            });

            const response = await apiPost('/api/recipes/transform', {
                recipeId: recipe._id,
                transformationType: 'both',
                options: {
                    targetServings: servingsToUse,
                    targetSystem: combinedOptions.targetSystem,
                    saveAsNew
                },
                useAI: true
            });

            const data = await response.json();
            console.log('🚀 Combined transformation response:', data);

            if (data.success) {
                console.log('🔍 Raw API Response:', data);
                console.log('🔍 Transformation Result:', data.transformation);
                console.log('🔍 Recipe Result:', data.recipe);

                const transformationResult = data.recipe || data.transformation;
                console.log('🔍 Selected Transformation Result:', transformationResult);

                if (transformationResult && onTransformationChange) {
                    const finalIngredients = transformationResult.converted_ingredients ||
                        transformationResult.scaled_ingredients ||
                        recipe.ingredients;

                    console.log('🔍 Final Ingredients to Apply:', finalIngredients);
                    console.log('🔍 Target Servings:', combinedOptions.targetServings);

                    const transformedRecipe = {
                        ...recipe,
                        ingredients: finalIngredients,
                        servings: combinedOptions.targetServings, // This should be 6
                        currentMeasurementSystem: combinedOptions.targetSystem,
                        transformationApplied: {
                            type: 'both',
                            scaling: {
                                originalServings: recipe.servings,
                                targetServings: combinedOptions.targetServings
                            },
                            conversion: {
                                targetSystem: combinedOptions.targetSystem
                            },
                            appliedAt: new Date(),
                            method: transformationResult.method || 'combined'
                        }
                    };

                    console.log('🔍 Final Transformed Recipe Being Applied:', transformedRecipe);
                    onTransformationChange(transformedRecipe);
                }


                if (saveAsNew && data.savedRecipe) {
                    alert(`✅ Transformed recipe saved as "${data.savedRecipe.title}"!`);
                } else {
                    alert('✅ Recipe transformed successfully!');
                }
            } else {
                console.error('❌ Combined transformation failed:', data);
                alert(`❌ ${data.error || 'Transformation failed'}`);
            }
        } catch (error) {
            console.error('Combined transformation error:', error);
            alert('❌ Failed to transform recipe');
        } finally {
            setIsCombinedTransform(false);
        }
    };

    // FIXED: Enhanced revert functionality
    const handleRevert = () => {
        if (onRevert) {
            console.log('🔄 Reverting to original recipe');
            onRevert();
        }

        // Reset component state
        setCombinedOptions({
            targetServings: recipe.servings || 4,
            targetSystem: 'metric'
        });
    };

    if (!isExpanded) {
        return (
            <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
                <TouchEnhancedButton
                    onClick={() => setIsExpanded(true)}
                    className="w-full flex items-center justify-between text-left hover:bg-gray-50 p-2 rounded"
                >
                    <div className="flex items-center">
                        <span className="text-lg font-medium text-gray-900">
                            🔧 Recipe Transformations
                        </span>
                        <span className="ml-2 text-sm text-gray-600">
                            Scale servings • Convert units
                        </span>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </TouchEnhancedButton>
            </div>
        );
    }

    return (
        <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">
                        🔧 Recipe Transformations
                    </h3>
                    <div className="flex items-center space-x-2">
                        {/* FIXED: Enhanced revert button */}
                        <TouchEnhancedButton
                            onClick={() => {
                                console.log('🔄 Reset button clicked in transformation panel');
                                if (onRevert) {
                                    onRevert();
                                } else {
                                    console.warn('⚠️ No onRevert function provided');
                                }
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
                            title="Reset to original recipe"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Reset to Original</span>
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={() => setIsExpanded(false)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                        </TouchEnhancedButton>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="mt-4">
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                        <TouchEnhancedButton
                            onClick={() => setActiveTab('scale')}
                            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                                activeTab === 'scale'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            📏 Scale
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={() => setActiveTab('convert')}
                            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                                activeTab === 'convert'
                                    ? 'bg-white text-purple-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            🔄 Convert
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={() => setActiveTab('both')}
                            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                                activeTab === 'both'
                                    ? 'bg-white text-green-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            🔧 Both
                        </TouchEnhancedButton>
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            <div className="p-4">
                {activeTab === 'scale' && (
                    <RecipeScalingWidget
                        recipe={recipe}
                        onScalingChange={onTransformationChange}
                        showSaveOption={showSaveOptions}
                        className="border-0 p-0"
                    />
                )}

                {activeTab === 'convert' && (
                    <UnitConversionWidget
                        recipe={recipe}
                        onConversionChange={onTransformationChange}
                        showSaveOption={showSaveOptions}
                        className="border-0 p-0"
                    />
                )}

                {activeTab === 'both' && (
                    <div className="space-y-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                            <h4 className="text-lg font-medium text-gray-900 mb-3">
                                🚀 Scale & Convert Recipe
                            </h4>
                            <p className="text-sm text-gray-600 mb-4">
                                Transform your recipe by both changing the serving size and converting to a different measurement system in one step.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Scaling Options */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Target Servings
                                    </label>
                                    <KeyboardOptimizedInput
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={combinedServingsInput}
                                        onChange={(e) => {
                                            const value = e.target.value;

                                            // Allow empty string so users can clear the input
                                            if (value === '') {
                                                setCombinedServingsInput('');
                                                return;
                                            }

                                            // Only allow numbers
                                            if (!/^\d+$/.test(value)) {
                                                return;
                                            }

                                            const numValue = parseInt(value);

                                            // Enforce reasonable limits
                                            if (numValue > 100) {
                                                return;
                                            }

                                            setCombinedServingsInput(value);
                                            setCombinedOptions(prev => ({
                                                ...prev,
                                                targetServings: numValue
                                            }));
                                        }}
                                        onBlur={() => {
                                            if (combinedServingsInput === '' || parseInt(combinedServingsInput) < 1) {
                                                // If empty or invalid, revert to current recipe servings
                                                const fallback = recipe.servings || 4;
                                                setCombinedServingsInput(String(fallback));
                                                setCombinedOptions(prev => ({
                                                    ...prev,
                                                    targetServings: fallback
                                                }));
                                            }
                                        }}
                                        onFocus={(e) => {
                                            // Select all text on focus for easy replacement
                                            e.target.select();
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="1"
                                        disabled={isCombinedTransform}
                                        autoComplete="off"
                                    />
                                    <div className="mt-1 text-xs text-gray-500">
                                        Original: {recipe.servings || 4} servings
                                    </div>
                                </div>

                                {/* Conversion Options */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Target Measurement System
                                    </label>
                                    <select
                                        value={combinedOptions.targetSystem}
                                        onChange={(e) => setCombinedOptions(prev => ({
                                            ...prev,
                                            targetSystem: e.target.value
                                        }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        disabled={isCombinedTransform}
                                    >
                                        <option value="metric">Metric (g, ml, °C)</option>
                                        <option value="us">US Standard (cups, °F)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Transformation Summary */}
                            <div className="mt-4 p-3 bg-white rounded border">
                                <div className="text-sm">
                                    <strong>Transformation Summary:</strong>
                                    <div className="mt-1 text-gray-600">
                                        • Scale from {recipe.servings || 4} to {combinedOptions.targetServings} servings
                                        ({((combinedOptions.targetServings / (recipe.servings || 4)) * 100).toFixed(0)}% of original)
                                    </div>
                                    <div className="text-gray-600">
                                        • Convert to {combinedOptions.targetSystem === 'metric' ? 'Metric' : 'US Standard'} measurements
                                    </div>
                                    <div className="text-gray-600">
                                        • AI-powered optimization for cooking times and methods
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-4 flex gap-2">
                                <TouchEnhancedButton
                                    onClick={() => handleCombinedTransform(false)}
                                    disabled={isCombinedTransform}
                                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {isCombinedTransform ? (
                                        <span className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Transforming...
                                        </span>
                                    ) : (
                                        '🚀 Transform Recipe'
                                    )}
                                </TouchEnhancedButton>

                                {showSaveOptions && (
                                    <TouchEnhancedButton
                                        onClick={() => handleCombinedTransform(true)}
                                        disabled={isCombinedTransform}
                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                        title="Save transformed recipe to your collection"
                                    >
                                        💾 Save
                                    </TouchEnhancedButton>
                                )}
                            </div>

                            {/* Feature Note */}
                            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                                <strong>💡 Pro Tip:</strong> Combined transformations use AI to ensure optimal results when both scaling and converting measurements.
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Info */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                <div className="flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Recipe transformations help you adapt recipes to your needs
                    </div>
                    <div className="flex items-center space-x-3">
                        <span className="flex items-center">
                            <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                            Basic (Free)
                        </span>
                        <span className="flex items-center">
                            <span className="w-2 h-2 bg-purple-500 rounded-full mr-1"></span>
                            AI (Gold+)
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}