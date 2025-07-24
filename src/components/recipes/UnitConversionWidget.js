'use client';

// file: /src/components/recipes/UnitConversionWidget.js v2 - FIXED conversion logic and API response handling

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import FeatureGate from '@/components/subscription/FeatureGate';
import { FEATURE_GATES } from '@/lib/subscription-config';
import {apiPost} from "@/lib/api-config.js";

export default function UnitConversionWidget({
                                                 recipe,
                                                 onConversionChange,
                                                 className = '',
                                                 showSaveOption = true
                                             }) {
    const [targetSystem, setTargetSystem] = useState('metric');
    const [isConverting, setIsConverting] = useState(false);
    const [convertedRecipe, setConvertedRecipe] = useState(null);
    const [currentSystem, setCurrentSystem] = useState('unknown');
    const [transformationLimits, setTransformationLimits] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Detect current measurement system on mount
    useEffect(() => {
        const detectedSystem = detectMeasurementSystem(recipe.ingredients || []);
        setCurrentSystem(detectedSystem);

        // Set target system to opposite of current
        if (detectedSystem === 'us') {
            setTargetSystem('metric');
        } else if (detectedSystem === 'metric') {
            setTargetSystem('us');
        } else {
            setTargetSystem('metric'); // Default for mixed/unknown
        }

        fetchTransformationLimits();
    }, [recipe]);

    const detectMeasurementSystem = (ingredients) => {
        const usUnits = ['cup', 'cups', 'tbsp', 'tsp', 'oz', 'lb', 'lbs', 'ounce', 'pound', 'tablespoon', 'teaspoon', 'fl oz'];
        const metricUnits = ['g', 'kg', 'ml', 'l', 'gram', 'grams', 'kilogram', 'milliliter', 'liter'];

        let usCount = 0;
        let metricCount = 0;

        ingredients.forEach(ingredient => {
            const unit = (ingredient.unit || '').toLowerCase();
            const amount = String(ingredient.amount || '').toLowerCase();

            if (usUnits.some(usUnit => unit.includes(usUnit) || amount.includes(usUnit))) {
                usCount++;
            }
            if (metricUnits.some(metricUnit => unit.includes(metricUnit) || amount.includes(metricUnit))) {
                metricCount++;
            }
        });

        if (usCount > metricCount) return 'us';
        if (metricCount > usCount) return 'metric';
        return 'mixed';
    };

    const fetchTransformationLimits = async () => {
        try {
            const response = await fetch('/api/recipes/transform');
            if (response.ok) {
                const data = await response.json();
                setTransformationLimits(data);
                console.log('📊 Transformation limits loaded:', data);
            }
        } catch (error) {
            console.error('Error fetching transformation limits:', error);
        }
    };

    const handleConvert = async (saveAsNew = false, useAI = null) => {
        console.log('🔄 Starting unit conversion:', {
            targetSystem,
            currentSystem,
            useAI,
            saveAsNew,
            ingredientCount: recipe.ingredients?.length || 0
        });

        if (currentSystem === targetSystem) {
            setError('Recipe is already in the target measurement system');
            return;
        }

        if (!recipe.ingredients || recipe.ingredients.length === 0) {
            setError('No ingredients to convert');
            return;
        }

        setIsConverting(true);
        setError('');
        setSuccess('');

        try {
            const requestData = {
                recipeId: recipe._id,
                transformationType: 'convert',
                options: {
                    targetSystem,
                    saveAsNew
                },
                useAI: useAI || false
            };

            console.log('📤 Sending conversion request:', requestData);

            const response = await fetch('/api/recipes/transform', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            console.log('📥 Conversion response status:', response.status);
            const data = await response.json();
            console.log('📥 Conversion response data:', data);

            if (data.success) {
                // FIXED: Handle the correct response structure
                const transformationData = data.transformation || data.recipe;

                if (transformationData) {
                    setConversionResult(transformationData);

                    // FIXED: Apply conversion to the recipe display
                    if (onConversionChange && transformationData.converted_ingredients) {
                        const convertedRecipe = {
                            ...recipe,
                            ingredients: transformationData.converted_ingredients,
                            currentMeasurementSystem: targetSystem,
                            transformationApplied: {
                                type: 'convert',
                                originalSystem: currentSystem,
                                targetSystem: targetSystem,
                                appliedAt: new Date(),
                                method: transformationData.method || 'conversion'
                            }
                        };

                        console.log('🔄 Applying converted recipe:', convertedRecipe);
                        onConversionChange(convertedRecipe);

                        // Update current system to target system
                        setCurrentSystem(targetSystem);
                    }
                }

                if (saveAsNew && data.savedRecipe) {
                    setSuccess(`Converted recipe saved as "${data.savedRecipe.title}"`);
                } else {
                    setSuccess('Recipe converted successfully!');
                }

                // Refresh transformation limits
                fetchTransformationLimits();
            } else {
                console.error('❌ Conversion failed:', data);
                setError(data.error || 'Conversion failed');
            }
        } catch (error) {
            console.error('❌ Conversion request failed:', error);
            setError('Failed to convert recipe. Please try again.');
        } finally {
            setIsConverting(false);
        }
    };

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

    const canConvert = currentSystem !== 'unknown' && currentSystem !== targetSystem;

    return (
        <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                    🔄 Unit Conversion
                </h3>
            </div>

            {/* System Selection */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Convert to:
                </label>
                <select
                    value={targetSystem}
                    onChange={(e) => setTargetSystem(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={isConverting}
                >
                    <option value="metric">Metric (g, ml, °C)</option>
                    <option value="us">US Standard (cups, tbsp, °F)</option>
                </select>
            </div>

            {/* Current vs Target System Display */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                        <span className={`w-3 h-3 rounded-full mr-2 ${
                            currentSystem === 'us' ? 'bg-blue-500' :
                                currentSystem === 'metric' ? 'bg-green-500' :
                                    'bg-gray-400'
                        }`}></span>
                        <span className="font-medium">Current: {
                            currentSystem === 'us' ? 'US Standard' :
                                currentSystem === 'metric' ? 'Metric' :
                                    currentSystem === 'mixed' ? 'Mixed Units' :
                                        'Unknown'
                        }</span>
                        {currentSystem === 'us' && <span className="ml-1 text-gray-600">cups, tbsp, °F</span>}
                        {currentSystem === 'metric' && <span className="ml-1 text-gray-600">g, ml, °C</span>}
                    </div>

                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>

                    <div className="flex items-center">
                        <span className="font-medium">Target: {targetSystem === 'metric' ? 'Metric' : 'US Standard'}</span>
                        <span className="ml-1 text-gray-600">
                            {targetSystem === 'metric' ? 'g, ml, °C' : 'cups, tbsp, °F'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Usage Limits Display */}
            {transformationLimits && (
                <div className="mb-4 text-xs text-gray-600">
                    <div className="flex justify-between">
                        <span>Basic Conversion:</span>
                        <span className={transformationLimits.limits.basicConversion.remaining === 0 ? 'text-red-600' : ''}>
                            {transformationLimits.limits.basicConversion.remaining === 'Unlimited'
                                ? 'Unlimited'
                                : `${transformationLimits.limits.basicConversion.remaining} remaining`}
                        </span>
                    </div>
                    {transformationLimits.canUseAI && (
                        <div className="flex justify-between">
                            <span>AI Conversion:</span>
                            <span className={transformationLimits.limits.aiConversion.remaining === 0 ? 'text-red-600' : ''}>
                                {transformationLimits.limits.aiConversion.remaining === 'Unlimited'
                                    ? 'Unlimited'
                                    : `${transformationLimits.limits.aiConversion.remaining} remaining`}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
                {/* Basic Conversion */}
                <div className="flex gap-2">
                    <TouchEnhancedButton
                        onClick={() => handleConvert(false, false)}
                        disabled={isConverting || !canConvert || !transformationLimits?.features?.basicConversion}
                        className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isConverting ? (
                            <span className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Converting...
                            </span>
                        ) : (
                            '🔄 Convert Units (Basic)'
                        )}
                    </TouchEnhancedButton>

                    {showSaveOption && (
                        <TouchEnhancedButton
                            onClick={() => handleConvert(true, false)}
                            disabled={isConverting || !canConvert || !transformationLimits?.features?.basicConversion}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            title="Save converted recipe to your collection"
                        >
                            💾
                        </TouchEnhancedButton>
                    )}
                </div>

                {/* AI Conversion */}
                <FeatureGate
                    feature={FEATURE_GATES.AI_RECIPE_SCALING}
                    fallback={
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <p className="text-sm font-medium text-yellow-800">AI Conversion Available with Gold Plan</p>
                                    <p className="text-xs text-yellow-700">Get intelligent conversions with cultural adaptations</p>
                                </div>
                                <TouchEnhancedButton
                                    onClick={() => window.location.href = '/pricing?source=unit-conversion'}
                                    className="ml-auto px-3 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
                                >
                                    Upgrade
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    }
                >
                    {transformationLimits?.features?.aiConversion && (
                        <div className="flex gap-2">
                            <TouchEnhancedButton
                                onClick={() => handleConvert(false, true)}
                                disabled={isConverting || !canConvert || !transformationLimits?.features?.aiConversion}
                                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                🤖 AI Convert Units
                            </TouchEnhancedButton>

                            {showSaveOption && (
                                <TouchEnhancedButton
                                    onClick={() => handleConvert(true, true)}
                                    disabled={isConverting || !canConvert || !transformationLimits?.features?.aiConversion}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    title="Save AI-converted recipe to your collection"
                                >
                                    🤖💾
                                </TouchEnhancedButton>
                            )}
                        </div>
                    )}
                </FeatureGate>
            </div>

            {/* Conversion Examples */}
            <div className="mt-4">
                <TouchEnhancedButton
                    onClick={() => {}}
                    className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
                >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Conversion Examples
                </TouchEnhancedButton>

                <div className="mt-2 text-xs text-gray-600 space-y-1">
                    <div>• 250ml → 1 cup</div>
                    <div>• 120g flour → 1 cup</div>
                    <div>• 15ml → 1 tbsp</div>
                    <div>• 180°C → 350°F</div>
                </div>
            </div>

            {/* Result Display */}
            {conversionResult && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <h4 className="text-sm font-medium text-green-800 mb-2 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Recipe Converted Successfully!
                    </h4>

                    <div className="text-sm text-green-700 space-y-1">
                        <div><strong>Method:</strong> {conversionResult.method?.includes('ai') ? 'AI-Enhanced' : 'Mathematical'}</div>
                        <div><strong>Confidence:</strong> {(conversionResult.confidence * 100).toFixed(0)}%</div>

                        {conversionResult.rawResult?.conversion_notes && (
                            <div className="mt-2 space-y-1">
                                {conversionResult.rawResult.conversion_notes.accuracy_level && (
                                    <div><strong>Accuracy:</strong> {conversionResult.rawResult.conversion_notes.accuracy_level}</div>
                                )}
                                {conversionResult.rawResult.conversion_notes.regional_adaptations && (
                                    <div><strong>Notes:</strong> {conversionResult.rawResult.conversion_notes.regional_adaptations}</div>
                                )}
                            </div>
                        )}

                        {conversionResult.rawResult?.cultural_notes && (
                            <div className="mt-2">
                                <strong>Cultural Notes:</strong>
                                <div className="text-xs mt-1">{conversionResult.rawResult.cultural_notes}</div>
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
            {conversionResult && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                    <TouchEnhancedButton
                        onClick={() => {
                            setConversionResult(null);
                            setError('');
                            setSuccess('');
                            detectCurrentSystem(); // Re-detect system
                        }}
                        className="text-sm text-gray-600 hover:text-gray-800"
                        disabled={isConverting}
                    >
                        🔄 Reset Conversion
                    </TouchEnhancedButton>
                </div>
            )}
        </div>
    );
}