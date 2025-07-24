'use client';

// file: /src/components/recipes/RecipeScalingWidget.js v2 - FIXED to properly pass scaled ingredients to parent

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import FeatureGate from '@/components/subscription/FeatureGate';
import { FEATURE_GATES } from '@/lib/subscription-config';
import {apiPost} from "@/lib/api-config.js";

export default function RecipeScalingWidget({
                                                recipe,
                                                onScalingChange,
                                                className = '',
                                                showSaveOption = true
                                            }) {
    const [targetServings, setTargetServings] = useState(recipe.servings || 4);
    const [isScaling, setIsScaling] = useState(false);
    const [scaledRecipe, setScaledRecipe] = useState(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [transformationLimits, setTransformationLimits] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Load transformation limits on component mount
    useEffect(() => {
        fetchTransformationLimits();
    }, []);

    const fetchTransformationLimits = async () => {
        try {
            const response = await fetch('/api/recipes/transform');
            if (response.ok) {
                const data = await response.json();
                setTransformationLimits(data);
            }
        } catch (error) {
            console.error('Error fetching transformation limits:', error);
        }
    };

    const handleScale = async (saveAsNew = false, useAI = null) => {
        console.log('🔢 Starting transformation:', { targetServings, useAI, saveAsNew });

        if (targetServings === recipe.servings) {
            setError('Target servings same as original');
            return;
        }

        setIsScaling(true);
        setError('');
        setSuccess('');

        try {
            // FIXED: Ensure clean request structure
            const requestData = {
                recipeId: recipe._id,
                transformationType: 'scale',
                options: {
                    targetServings,
                    saveAsNew
                },
                useAI: useAI || false
            };

            console.log('📤 Sending request:', requestData);

            // FIXED: Use fetch directly to avoid any apiPost wrapper issues
            const response = await fetch('/api/recipes/transform', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData) // Send data directly, not wrapped
            });

            console.log('📥 Response status:', response.status);
            const data = await response.json();
            console.log('📥 Response data:', data);

            if (data.success) {
                // FIXED: Extract the actual scaling result properly
                const scalingResult = data.recipe || data.transformation;
                console.log('🔍 Scaling result:', scalingResult);

                setScaledRecipe(data.transformation);

                // FIXED: Create the transformed recipe with scaled ingredients
                if (onScalingChange && scalingResult.scaled_ingredients) {
                    const transformedRecipe = {
                        ...recipe,
                        ingredients: scalingResult.scaled_ingredients,
                        servings: targetServings,
                        transformationApplied: {
                            type: 'scale',
                            originalServings: recipe.servings,
                            targetServings: targetServings,
                            appliedAt: new Date(),
                            method: scalingResult.method || 'scaling'
                        }
                    };

                    console.log('🔄 Calling onScalingChange with:', transformedRecipe);
                    onScalingChange(transformedRecipe);
                }

                if (saveAsNew && data.savedRecipe) {
                    setSuccess(`Scaled recipe saved as "${data.savedRecipe.title}"`);
                } else {
                    setSuccess('Recipe scaled successfully!');
                }

                // Refresh transformation limits
                fetchTransformationLimits();
            } else {
                console.error('❌ Transformation failed:', data);
                setError(data.error || 'Scaling failed');
            }
        } catch (error) {
            console.error('❌ Request failed:', error);
            setError('Failed to scale recipe. Please try again.');
        } finally {
            setIsScaling(false);
        }
    };

    const scalingFactor = targetServings / (recipe.servings || 4);
    const isScaled = scalingFactor !== 1;

    // Clear success/error messages after delay
    useEffect(() => {
        if (success || error) {
            const timer = setTimeout(() => {
                setSuccess('');
                setError('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [success, error]);

    return (
        <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                    🍽️ Recipe Scaling
                </h3>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Serves:</span>
                    <input
                        type="number"
                        min="1"
                        max="50"
                        value={targetServings}
                        onChange={(e) => setTargetServings(parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isScaling}
                    />
                </div>
            </div>

            {/* Scaling Factor Display */}
            {isScaled && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-800">
                        <strong>Scaling Factor:</strong> {scalingFactor.toFixed(2)}x
                        {scalingFactor > 3 && (
                            <div className="text-orange-600 mt-1 flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                Large scaling may require cooking method adjustments
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Usage Limits Display */}
            {transformationLimits && (
                <div className="mb-4 text-xs text-gray-600">
                    <div className="flex justify-between">
                        <span>Basic Scaling:</span>
                        <span className={transformationLimits.limits.basicScaling.remaining === 0 ? 'text-red-600' : ''}>
                            {transformationLimits.limits.basicScaling.remaining === 'Unlimited'
                                ? 'Unlimited'
                                : `${transformationLimits.limits.basicScaling.remaining} remaining`}
                        </span>
                    </div>
                    {transformationLimits.canUseAI && (
                        <div className="flex justify-between">
                            <span>AI Scaling:</span>
                            <span className={transformationLimits.limits.aiScaling.remaining === 0 ? 'text-red-600' : ''}>
                                {transformationLimits.limits.aiScaling.remaining === 'Unlimited'
                                    ? 'Unlimited'
                                    : `${transformationLimits.limits.aiScaling.remaining} remaining`}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
                {/* Basic Scaling */}
                <div className="flex gap-2">
                    <TouchEnhancedButton
                        onClick={() => handleScale(false, false)}
                        disabled={isScaling || !isScaled || !transformationLimits?.features?.basicScaling}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isScaling ? (
                            <span className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Scaling...
                            </span>
                        ) : (
                            '📏 Scale Recipe (Basic)'
                        )}
                    </TouchEnhancedButton>

                    {showSaveOption && (
                        <TouchEnhancedButton
                            onClick={() => handleScale(true, false)}
                            disabled={isScaling || !isScaled || !transformationLimits?.features?.basicScaling}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            title="Save scaled recipe to your collection"
                        >
                            💾
                        </TouchEnhancedButton>
                    )}
                </div>

                {/* AI Scaling */}
                <FeatureGate
                    feature={FEATURE_GATES.AI_RECIPE_SCALING}
                    fallback={
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <p className="text-sm font-medium text-yellow-800">AI Scaling Available with Gold Plan</p>
                                    <p className="text-xs text-yellow-700">Get intelligent scaling with cooking time adjustments</p>
                                </div>
                                <TouchEnhancedButton
                                    onClick={() => window.location.href = '/pricing?source=recipe-scaling'}
                                    className="ml-auto px-3 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
                                >
                                    Upgrade
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    }
                >
                    {transformationLimits?.features?.aiScaling && (
                        <div className="flex gap-2">
                            <TouchEnhancedButton
                                onClick={() => handleScale(false, true)}
                                disabled={isScaling || !isScaled || !transformationLimits?.features?.aiScaling}
                                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                🤖 AI Scale Recipe
                            </TouchEnhancedButton>

                            {showSaveOption && (
                                <TouchEnhancedButton
                                    onClick={() => handleScale(true, true)}
                                    disabled={isScaling || !isScaled || !transformationLimits?.features?.aiScaling}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    title="Save AI-scaled recipe to your collection"
                                >
                                    🤖💾
                                </TouchEnhancedButton>
                            )}
                        </div>
                    )}
                </FeatureGate>
            </div>

            {/* Advanced Options */}
            <div className="mt-4">
                <TouchEnhancedButton
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
                >
                    <svg className={`w-4 h-4 mr-1 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Advanced Options
                </TouchEnhancedButton>

                {showAdvanced && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-md space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quick Scaling Presets
                            </label>
                            <div className="flex gap-2 flex-wrap">
                                {[
                                    { label: '1/2x', factor: 0.5 },
                                    { label: '2x', factor: 2 },
                                    { label: '3x', factor: 3 },
                                    { label: '4x', factor: 4 }
                                ].map(preset => (
                                    <TouchEnhancedButton
                                        key={preset.label}
                                        onClick={() => setTargetServings(Math.round((recipe.servings || 4) * preset.factor))}
                                        className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                        disabled={isScaling}
                                    >
                                        {preset.label}
                                    </TouchEnhancedButton>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Common Serving Sizes
                            </label>
                            <div className="flex gap-2 flex-wrap">
                                {[2, 4, 6, 8, 12, 16].map(servings => (
                                    <TouchEnhancedButton
                                        key={servings}
                                        onClick={() => setTargetServings(servings)}
                                        className={`px-2 py-1 text-xs rounded ${
                                            targetServings === servings
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                        disabled={isScaling}
                                    >
                                        {servings}
                                    </TouchEnhancedButton>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Result Display */}
            {scaledRecipe && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <h4 className="text-sm font-medium text-green-800 mb-2 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Recipe Scaled Successfully!
                    </h4>

                    <div className="text-sm text-green-700 space-y-1">
                        <div><strong>Method:</strong> {scaledRecipe.method?.includes('ai') ? 'AI-Enhanced' : 'Mathematical'}</div>
                        <div><strong>Confidence:</strong> {(scaledRecipe.confidence * 100).toFixed(0)}%</div>

                        {scaledRecipe.rawResult?.cooking_adjustments && (
                            <div className="mt-2 space-y-1">
                                {scaledRecipe.rawResult.cooking_adjustments.time_multiplier !== 1 && (
                                    <div><strong>Cooking Time:</strong> {(scaledRecipe.rawResult.cooking_adjustments.time_multiplier * 100).toFixed(0)}% of original</div>
                                )}
                                {scaledRecipe.rawResult.cooking_adjustments.equipment_notes && (
                                    <div><strong>Equipment:</strong> {scaledRecipe.rawResult.cooking_adjustments.equipment_notes}</div>
                                )}
                                {scaledRecipe.rawResult.cooking_adjustments.difficulty_notes && (
                                    <div><strong>Notes:</strong> {scaledRecipe.rawResult.cooking_adjustments.difficulty_notes}</div>
                                )}
                            </div>
                        )}

                        {scaledRecipe.rawResult?.practical_tips && scaledRecipe.rawResult.practical_tips.length > 0 && (
                            <div className="mt-2">
                                <strong>Tips:</strong>
                                <ul className="list-disc list-inside ml-2 mt-1">
                                    {scaledRecipe.rawResult.practical_tips.map((tip, index) => (
                                        <li key={index} className="text-xs">{tip}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                        <svg className="w-4 h-4 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-red-800">{error}</span>
                    </div>
                </div>
            )}

            {/* Success Display */}
            {success && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-green-800">{success}</span>
                    </div>
                </div>
            )}

            {/* Reset Button */}
            {(scaledRecipe || targetServings !== recipe.servings) && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                    <TouchEnhancedButton
                        onClick={() => {
                            setTargetServings(recipe.servings || 4);
                            setScaledRecipe(null);
                            setError('');
                            setSuccess('');
                            // FIXED: Notify parent to revert to original
                            if (onScalingChange) {
                                console.log('🔄 Resetting to original recipe');
                                onScalingChange({
                                    ...recipe,
                                    transformationApplied: null // Clear transformation flag
                                });
                            }
                        }}
                        className="text-sm text-gray-600 hover:text-gray-800"
                        disabled={isScaling}
                    >
                        🔄 Reset to Original
                    </TouchEnhancedButton>
                </div>
            )}
        </div>
    );
}