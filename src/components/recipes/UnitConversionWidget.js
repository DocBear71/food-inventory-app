'use client';

// file: /src/components/recipes/UnitConversionWidget.js v2 - Simple fixes for detectCurrentSystem and conversionResult errors

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

    // FIXED: Define detectMeasurementSystem function
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

    const handleConvert = async (saveAsNew = false, useAI = null) => {
        if (currentSystem === targetSystem) {
            setError('Recipe is already in the target measurement system');
            return;
        }

        setIsConverting(true);
        setError('');
        setSuccess('');

        try {
            // Determine if AI should be used
            let shouldUseAI = false;
            if (useAI === true && transformationLimits?.canUseAI && transformationLimits?.features?.aiConversion) {
                shouldUseAI = true;
            } else if (useAI === false || !transformationLimits?.features?.aiConversion) {
                shouldUseAI = false;
            }

            const response = await apiPost('/api/recipes/transform', {
                recipeId: recipe._id,
                transformationType: 'convert',
                options: {
                    targetSystem,
                    saveAsNew
                },
                useAI: shouldUseAI
            });

            const data = await response.json();

            if (data.success) {
                // FIXED: Use data.transformation instead of data.recipe
                setConvertedRecipe(data.transformation);

                // FIXED: Apply conversion to the recipe display
                if (onConversionChange && data.recipe && data.recipe.converted_ingredients) {
                    const convertedRecipeData = {
                        ...recipe,
                        ingredients: data.recipe.converted_ingredients,
                        currentMeasurementSystem: targetSystem,
                        transformationApplied: {
                            type: 'convert',
                            originalSystem: currentSystem,
                            targetSystem: targetSystem,
                            appliedAt: new Date(),
                            method: data.transformation?.method || 'conversion'
                        }
                    };

                    console.log('🔄 Applying converted recipe:', convertedRecipeData);
                    onConversionChange(convertedRecipeData);

                    // Update current system to target system
                    setCurrentSystem(targetSystem);
                }

                if (saveAsNew && data.savedRecipe) {
                    setSuccess(`Converted recipe saved as "${data.savedRecipe.title}"!`);
                } else {
                    setSuccess(`Recipe converted successfully ${shouldUseAI ? 'with AI optimization' : ''}!`);
                }

                // Refresh limits after usage
                fetchTransformationLimits();
            } else {
                if (data.code === 'USAGE_LIMIT_EXCEEDED') {
                    setError(`${data.error} Consider upgrading for more conversions.`);
                } else {
                    setError(data.error || 'Failed to convert recipe');
                }
            }
        } catch (error) {
            console.error('Conversion error:', error);
            setError('Failed to convert recipe. Please try again.');
        } finally {
            setIsConverting(false);
        }
    };

    const isConversionNeeded = currentSystem !== targetSystem && currentSystem !== 'unknown';

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

    const getSystemDisplay = (system) => {
        const systemInfo = {
            us: { name: 'US Standard', icon: '🇺🇸', desc: 'cups, tbsp, °F' },
            metric: { name: 'Metric', icon: '🌍', desc: 'g, ml, °C' },
            mixed: { name: 'Mixed Units', icon: '🔀', desc: 'various units' },
            unknown: { name: 'Unknown', icon: '❓', desc: 'unable to detect' }
        };
        return systemInfo[system] || systemInfo.unknown;
    };

    const currentSystemInfo = getSystemDisplay(currentSystem);
    const targetSystemInfo = getSystemDisplay(targetSystem);

    return (
        <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
            {/* Header */}
            <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                    📐 Unit Conversion
                </h3>
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        Convert to:
                    </label>
                    <select
                        value={targetSystem}
                        onChange={(e) => setTargetSystem(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        disabled={isConverting}
                    >
                        <option value="metric">Metric (g, ml, °C)</option>
                        <option value="us">US Standard (cups, °F)</option>
                    </select>
                </div>
            </div>

            {/* Current System Display */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                        <span className="text-base mr-2">{currentSystemInfo.icon}</span>
                        <div>
                            <div className="font-medium text-gray-900">
                                Current: {currentSystemInfo.name}
                            </div>
                            <div className="text-gray-600 text-xs">
                                {currentSystemInfo.desc}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center">
                        <span className="mx-2 text-gray-400">→</span>
                        <div className="flex items-center">
                            <span className="text-base mr-2">{targetSystemInfo.icon}</span>
                            <div>
                                <div className="font-medium text-gray-900">
                                    Target: {targetSystemInfo.name}
                                </div>
                                <div className="text-gray-600 text-xs">
                                    {targetSystemInfo.desc}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {currentSystem === targetSystem && (
                    <div className="mt-2 flex items-center text-green-600 text-sm">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Recipe is already in the target system
                    </div>
                )}
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
                        disabled={isConverting || !isConversionNeeded || !transformationLimits?.features?.basicConversion}
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
                            disabled={isConverting || !isConversionNeeded || !transformationLimits?.features?.basicConversion}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            title="Save converted recipe to your collection"
                        >
                            💾
                        </TouchEnhancedButton>
                    )}
                </div>

                {/* AI Conversion */}
                <FeatureGate
                    feature={FEATURE_GATES.AI_UNIT_CONVERSION}
                    fallback={
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <p className="text-sm font-medium text-yellow-800">AI Conversion Available with Gold Plan</p>
                                    <p className="text-xs text-yellow-700">Get ingredient-specific density conversions</p>
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
                                disabled={isConverting || !isConversionNeeded || !transformationLimits?.features?.aiConversion}
                                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                🤖 AI Convert Units
                            </TouchEnhancedButton>

                            {showSaveOption && (
                                <TouchEnhancedButton
                                    onClick={() => handleConvert(true, true)}
                                    disabled={isConverting || !isConversionNeeded || !transformationLimits?.features?.aiConversion}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
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
                    onClick={() => {/* Toggle examples visibility */}}
                    className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
                >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Conversion Examples
                </TouchEnhancedButton>

                <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-3 rounded">
                    {targetSystem === 'metric' ? (
                        <div className="space-y-1">
                            <div>• 1 cup flour → 120g</div>
                            <div>• 1 cup sugar → 200g</div>
                            <div>• 1 tbsp → 15ml</div>
                            <div>• 350°F → 175°C</div>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <div>• 250ml → 1 cup</div>
                            <div>• 120g flour → 1 cup</div>
                            <div>• 15ml → 1 tbsp</div>
                            <div>• 180°C → 350°F</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Result Display */}
            {convertedRecipe && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <h4 className="text-sm font-medium text-green-800 mb-2 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Recipe Converted Successfully!
                    </h4>

                    <div className="text-sm text-green-700 space-y-1">
                        <div><strong>Method:</strong> {convertedRecipe.method?.includes('ai') ? 'AI-Enhanced' : 'Mathematical'}</div>
                        <div><strong>Confidence:</strong> {(convertedRecipe.confidence * 100).toFixed(0)}%</div>

                        {convertedRecipe.rawResult?.conversion_notes && (
                            <div className="mt-2 space-y-1">
                                {convertedRecipe.rawResult.conversion_notes.accuracy_level && (
                                    <div><strong>Accuracy:</strong> {convertedRecipe.rawResult.conversion_notes.accuracy_level}</div>
                                )}
                                {convertedRecipe.rawResult.conversion_notes.regional_adaptations && (
                                    <div><strong>Notes:</strong> {convertedRecipe.rawResult.conversion_notes.regional_adaptations}</div>
                                )}
                            </div>
                        )}

                        {convertedRecipe.rawResult?.cultural_notes && (
                            <div className="mt-2">
                                <strong>Cultural Notes:</strong> {convertedRecipe.rawResult.cultural_notes}
                            </div>
                        )}

                        {convertedRecipe.rawResult?.temperature_conversions?.instructions_updates &&
                            convertedRecipe.rawResult.temperature_conversions.instructions_updates.length > 0 && (
                                <div className="mt-2">
                                    <strong>Temperature Updates:</strong>
                                    <ul className="list-disc list-inside ml-2 mt-1">
                                        {convertedRecipe.rawResult.temperature_conversions.instructions_updates.map((update, index) => (
                                            <li key={index} className="text-xs">{update}</li>
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
            {convertedRecipe && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                    <TouchEnhancedButton
                        onClick={() => {
                            console.log('🔄 Unit conversion reset clicked');
                            setConvertedRecipe(null);
                            setError('');
                            setSuccess('');

                            // FIXED: Call the global reset function instead of trying to handle locally
                            if (window.handleRevertFromWidget) {
                                console.log('🔄 Calling global revert function');
                                window.handleRevertFromWidget();
                            } else {
                                console.warn('⚠️ Global revert function not available, trying onConversionChange');
                                // Fallback to local reset
                                if (onConversionChange) {
                                    onConversionChange({
                                        ...recipe,
                                        transformationApplied: null // Clear transformation flag
                                    });
                                }
                                // Re-detect system from original recipe
                                const detectedSystem = detectMeasurementSystem(recipe.ingredients || []);
                                setCurrentSystem(detectedSystem);
                            }
                        }}
                        className="text-sm text-gray-600 hover:text-gray-800"
                        disabled={isConverting}
                    >
                        🔄 Reset to Original
                    </TouchEnhancedButton>
                </div>
            )}
        </div>
    );
}