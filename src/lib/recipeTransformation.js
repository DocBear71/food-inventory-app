// file: /src/lib/recipeTransformation.js v2 - FIXED Modal.com integration and conversion logic

import {apiPost} from "@/lib/api-config.js";

/**
 * Recipe Transformation Utilities
 * Handles recipe scaling and unit conversion with both basic math and AI integration
 */

// FIXED: Modal.com service integration with proper environment variable handling
export async function callModalTransformationService(data) {
    // FIXED: Check both client and server environment variables and clean URL
    let modalUrl = process.env.NEXT_PUBLIC_MODAL_FUNCTION_URL ||
        process.env.MODAL_FUNCTION_URL ||
        'https://docbear71--recipe-transformation-service-transform-recipe.modal.run';

    // FIXED: Remove any leading slashes that might cause URL parsing issues
    modalUrl = modalUrl.replace(/^\/+/, '');

    // Ensure it starts with https:// if not already present
    if (!modalUrl.startsWith('http://') && !modalUrl.startsWith('https://')) {
        modalUrl = `https://${modalUrl}`;
    }

    console.log('🤖 Calling Modal service at:', modalUrl);
    console.log('📤 Sending data:', JSON.stringify(data, null, 2));

    try {
        // FIXED: Use fetch directly instead of apiPost for external service
        const response = await fetch(modalUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Modal service error:', response.status, errorText);
            throw new Error(`Modal transformation service failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Modal service response:', result);
        return result;
    } catch (error) {
        console.error('❌ Modal service call failed:', error);
        throw error;
    }
}

// Check if user can access AI transformation features
export function checkAITransformationAccess(user) {
    const tier = user?.getEffectiveTier?.() || 'free';

    // Gold+ users get AI-enhanced transformations
    return ['gold', 'platinum', 'admin'].includes(tier);
}

// Create a transformed recipe copy
export async function createTransformedRecipe(originalRecipe, transformationResult, userId, options, Recipe) {
    const transformedData = {
        ...originalRecipe.toObject(),
        _id: undefined, // Remove original ID to create new recipe
        title: `${originalRecipe.title} (${getTransformationSuffix(options)})`,

        // Update ingredients and servings based on transformation
        ingredients: transformationResult.scaled_ingredients || transformationResult.converted_ingredients || originalRecipe.ingredients,
        servings: options.targetServings || originalRecipe.servings,

        // Update measurement system if converted
        currentMeasurementSystem: options.targetSystem || originalRecipe.currentMeasurementSystem,

        // Set creator and transformation metadata
        createdBy: userId,
        originalRecipeId: originalRecipe._id,

        // Track transformation history
        transformationHistory: [{
            type: options.transformationType,
            appliedAt: new Date(),
            options: options,
            aiGenerated: !!transformationResult.method?.includes('ai'),
            transformationData: transformationResult
        }],

        // Update AI enhancements tracking
        aiTransformations: {
            scalingOptimized: options.transformationType === 'scale' && transformationResult.method?.includes('ai'),
            unitsOptimized: options.transformationType === 'convert' && transformationResult.method?.includes('ai'),
            lastAiTransformation: new Date(),
            aiTransformationVersion: '1.0'
        },

        // Clear any inherited scaling/conversion history from original
        scalingHistory: [],
        conversionHistory: [],

        // Reset metrics for new recipe
        metrics: {
            viewCount: 0,
            saveCount: 0,
            shareCount: 0
        },

        // Clear reviews for new recipe
        reviews: [],
        ratingStats: {
            averageRating: 0,
            totalRatings: 0,
            ratingDistribution: {
                star5: 0, star4: 0, star3: 0, star2: 0, star1: 0
            }
        }
    };

    const newRecipe = new Recipe(transformedData);
    await newRecipe.save();

    return newRecipe;
}

// Generate suffix for transformed recipe titles
export function getTransformationSuffix(options) {
    const { transformationType, targetServings, targetSystem } = options;

    if (transformationType === 'scale') {
        return `${targetServings} servings`;
    } else if (transformationType === 'convert') {
        return targetSystem === 'metric' ? 'Metric' : 'US Standard';
    } else if (transformationType === 'both') {
        return `${targetServings} servings, ${targetSystem === 'metric' ? 'Metric' : 'US Standard'}`;
    }

    return 'Modified';
}

// Detect measurement system from ingredients
export function detectMeasurementSystem(ingredients) {
    const usUnits = ['cup', 'cups', 'tbsp', 'tsp', 'oz', 'lb', 'lbs', 'ounce', 'pound', 'tablespoon', 'teaspoon', 'fl oz'];
    const metricUnits = ['g', 'kg', 'ml', 'l', 'gram', 'grams', 'kilogram', 'milliliter', 'liter'];

    let usCount = 0;
    let metricCount = 0;

    ingredients.forEach(ingredient => {
        const unit = (ingredient.unit || '').toLowerCase();
        const amount = String(ingredient.amount || '').toLowerCase();

        // Check unit field
        if (usUnits.some(usUnit => unit.includes(usUnit))) {
            usCount++;
        } else if (metricUnits.some(metricUnit => unit.includes(metricUnit))) {
            metricCount++;
        }

        // Check amount field for embedded units
        if (usUnits.some(usUnit => amount.includes(usUnit))) {
            usCount++;
        } else if (metricUnits.some(metricUnit => amount.includes(metricUnit))) {
            metricCount++;
        }
    });

    if (usCount > metricCount) return 'us';
    if (metricCount > usCount) return 'metric';
    return 'mixed';
}

// FIXED: Enhanced basic mathematical recipe scaling
export function scaleRecipeBasic(recipe, targetServings) {
    const originalServings = recipe.servings || 4;
    const scalingFactor = targetServings / originalServings;

    console.log('📐 Basic scaling:', {
        originalServings,
        targetServings,
        scalingFactor,
        ingredientCount: recipe.ingredients?.length || 0,
        sampleIngredient: recipe.ingredients?.[0]
    });

    const scaledIngredients = recipe.ingredients.map((ingredient, index) => {
        // FIXED: Extract data from complex Mongoose objects
        const ingredientData = ingredient._doc || ingredient;
        const name = ingredientData.name || ingredient.name;
        const originalAmount = ingredientData.amount || ingredient.amount;
        const unit = ingredientData.unit || ingredient.unit;
        const optional = ingredientData.optional || ingredient.optional;

        const scaledAmount = scaleAmountBasic(originalAmount, scalingFactor);

        console.log(`📐 Scaling ingredient ${index}:`, {
            original: ingredient,
            ingredientData,
            name,
            originalAmount,
            scaledAmount,
            scalingFactor
        });

        // FIXED: Return clean ingredient object with all necessary properties
        return {
            name: name,
            amount: scaledAmount,
            unit: unit,
            optional: optional || false,
            alternatives: ingredientData.alternatives || [],
            originalAmount: originalAmount,
            scalingNotes: `Scaled by ${scalingFactor.toFixed(2)}x`,
            _id: ingredientData._id || ingredient._id
        };
    });

    console.log('📐 Scaled ingredients result:', scaledIngredients);

    return {
        success: true,
        scaled_ingredients: scaledIngredients,
        cooking_adjustments: {
            time_multiplier: calculateTimeMultiplier(scalingFactor),
            temperature_changes: "No automatic temperature adjustment",
            equipment_notes: scalingFactor > 1.5 ? "Consider larger cookware" : "",
            difficulty_notes: "Basic mathematical scaling applied"
        },
        scaling_notes: `Recipe scaled from ${originalServings} to ${targetServings} servings`,
        method: "basic_math_scaling",
        success_probability: 0.75
    };
}

// FIXED: Enhanced basic unit conversion with better logic
export function convertUnitsBasic(recipe, targetSystem) {
    const sourceSystem = detectMeasurementSystem(recipe.ingredients);

    console.log('🔄 Basic conversion:', {
        sourceSystem,
        targetSystem,
        ingredientCount: recipe.ingredients?.length || 0,
        sampleIngredient: recipe.ingredients?.[0]
    });

    if (sourceSystem === targetSystem) {
        return {
            success: true,
            message: "Recipe already in target measurement system",
            converted_ingredients: recipe.ingredients,
            method: "no_conversion_needed",
            success_probability: 1.0 // FIXED: Add explicit confidence
        };
    }

    const conversionTable = getBasicConversionTable(sourceSystem, targetSystem);

    const convertedIngredients = recipe.ingredients.map((ingredient, index) => {
        const converted = convertIngredientBasic(ingredient, conversionTable, targetSystem);
        console.log(`🔄 Converting ingredient ${index}:`, {
            original: ingredient,
            converted: converted
        });
        return converted;
    });

    console.log('🔄 Converted ingredients result:', convertedIngredients);

    return {
        success: true,
        converted_ingredients: convertedIngredients,
        conversion_notes: {
            method_used: "basic_mathematical_conversion",
            accuracy_level: "standard",
            regional_adaptations: `Converted to ${targetSystem} measurements`
        },
        method: "basic_math_conversion",
        success_probability: 0.8 // FIXED: Add explicit confidence
    };
}

// Helper function to scale amounts mathematically
function scaleAmountBasic(amountStr, scalingFactor) {
    try {
        // Handle fractions and mixed numbers
        const fractionRegex = /(\d+)?\s*(\d+)\/(\d+)/;
        const decimalRegex = /(\d*\.?\d+)/;

        let numericValue = 0;

        // Check for fractions
        const fractionMatch = String(amountStr).match(fractionRegex);
        if (fractionMatch) {
            const whole = parseInt(fractionMatch[1] || '0');
            const numerator = parseInt(fractionMatch[2]);
            const denominator = parseInt(fractionMatch[3]);
            numericValue = whole + (numerator / denominator);
        } else {
            // Try decimal parsing
            const decimalMatch = String(amountStr).match(decimalRegex);
            if (decimalMatch) {
                numericValue = parseFloat(decimalMatch[1]);
            }
        }

        if (numericValue > 0) {
            const scaledValue = numericValue * scalingFactor;

            // Round to practical measurements
            if (scaledValue < 0.125) {
                return "pinch";
            } else if (scaledValue < 1) {
                return scaledValue.toFixed(2);
            } else if (scaledValue < 10) {
                return scaledValue.toFixed(1);
            } else {
                return Math.round(scaledValue).toString();
            }
        }

        // If we can't parse, return original with scaling note
        return `${amountStr} (×${scalingFactor.toFixed(2)})`;

    } catch (error) {
        console.error('Error scaling amount:', error);
        return `${amountStr} (×${scalingFactor.toFixed(2)})`;
    }
}

// FIXED: Enhanced conversion table with more units
function getBasicConversionTable(sourceSystem, targetSystem) {
    const conversions = {
        us_to_metric: {
            'cup': { ml: 240, g_flour: 125, g_sugar: 200, g_butter: 225 },
            'cups': { ml: 240, g_flour: 125, g_sugar: 200, g_butter: 225 },
            'tbsp': { ml: 15 },
            'tablespoon': { ml: 15 },
            'tsp': { ml: 5 },
            'teaspoon': { ml: 5 },
            'oz': { g: 28.35 },
            'ounce': { g: 28.35 },
            'lb': { g: 453.59, kg: 0.454 },
            'lbs': { g: 453.59, kg: 0.454 },
            'pound': { g: 453.59, kg: 0.454 },
            'fl oz': { ml: 29.57 },
            'fahrenheit': 'celsius'
        },
        metric_to_us: {
            'ml': { cup: 0.00422, tbsp: 0.0676, tsp: 0.2029, 'fl oz': 0.0338 },
            'l': { cup: 4.22 },
            'liter': { cup: 4.22 },
            'g': { oz: 0.0353, cup_flour: 0.008, cup_sugar: 0.005, cup_butter: 0.0044 },
            'gram': { oz: 0.0353, cup_flour: 0.008, cup_sugar: 0.005, cup_butter: 0.0044 },
            'kg': { lb: 2.205 },
            'kilogram': { lb: 2.205 },
            'celsius': 'fahrenheit'
        }
    };

    return sourceSystem === 'us' && targetSystem === 'metric'
        ? conversions.us_to_metric
        : conversions.metric_to_us;
}

// FIXED: Enhanced ingredient conversion with better logic
function convertIngredientBasic(ingredient, conversionTable, targetSystem) {
    // FIXED: Extract data from complex Mongoose objects
    const ingredientData = ingredient._doc || ingredient;
    const name = ingredientData.name || ingredient.name;
    const originalUnit = (ingredientData.unit || ingredient.unit || '').toLowerCase();
    const originalAmount = ingredientData.amount || ingredient.amount || '';
    const optional = ingredientData.optional || ingredient.optional || false;

    console.log('🔄 Converting ingredient:', {
        name,
        amount: originalAmount,
        unit: originalUnit,
        ingredient,
        ingredientData
    });

    // Try to parse numeric amount
    let numericAmount;
    try {
        // Handle fractions
        if (originalAmount.includes('/')) {
            const fractionMatch = originalAmount.match(/(\d+)\/(\d+)/);
            if (fractionMatch) {
                numericAmount = parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
            }
        } else {
            numericAmount = parseFloat(originalAmount);
        }
    } catch {
        // FIXED: Return clean ingredient object even if conversion fails
        return {
            name: name,
            amount: originalAmount,
            unit: originalUnit,
            optional: optional,
            alternatives: ingredientData.alternatives || [],
            originalAmount: originalAmount,
            originalUnit: originalUnit,
            conversionMethod: "no_conversion_needed",
            notes: "Could not parse numeric amount",
            _id: ingredientData._id || ingredient._id
        };
    }

    if (isNaN(numericAmount) || numericAmount <= 0) {
        // FIXED: Return clean ingredient object for non-numeric amounts
        return {
            name: name,
            amount: originalAmount,
            unit: originalUnit,
            optional: optional,
            alternatives: ingredientData.alternatives || [],
            originalAmount: originalAmount,
            originalUnit: originalUnit,
            conversionMethod: "no_conversion_needed",
            notes: "No numeric amount to convert",
            _id: ingredientData._id || ingredient._id
        };
    }

    // Find conversion
    let convertedAmount = numericAmount;
    let convertedUnit = originalUnit;
    let conversionMethod = "no_conversion_available";

    for (const [sourceUnit, conversions] of Object.entries(conversionTable)) {
        if (originalUnit.includes(sourceUnit)) {
            if (typeof conversions === 'object') {
                // Choose appropriate conversion based on ingredient
                if (name.toLowerCase().includes('flour') && conversions.g_flour) {
                    convertedAmount = numericAmount * conversions.g_flour;
                    convertedUnit = 'g';
                    conversionMethod = "ingredient_specific";
                } else if (name.toLowerCase().includes('sugar') && conversions.g_sugar) {
                    convertedAmount = numericAmount * conversions.g_sugar;
                    convertedUnit = 'g';
                    conversionMethod = "ingredient_specific";
                } else if (name.toLowerCase().includes('butter') && conversions.g_butter) {
                    convertedAmount = numericAmount * conversions.g_butter;
                    convertedUnit = 'g';
                    conversionMethod = "ingredient_specific";
                } else if (conversions.ml) {
                    convertedAmount = numericAmount * conversions.ml;
                    convertedUnit = 'ml';
                    conversionMethod = "volume_conversion";
                } else if (conversions.g) {
                    convertedAmount = numericAmount * conversions.g;
                    convertedUnit = 'g';
                    conversionMethod = "weight_conversion";
                } else if (conversions.cup) {
                    convertedAmount = numericAmount * conversions.cup;
                    convertedUnit = 'cup';
                    conversionMethod = "volume_conversion";
                } else if (conversions.tbsp) {
                    convertedAmount = numericAmount * conversions.tbsp;
                    convertedUnit = 'tbsp';
                    conversionMethod = "volume_conversion";
                } else if (conversions.tsp) {
                    convertedAmount = numericAmount * conversions.tsp;
                    convertedUnit = 'tsp';
                    conversionMethod = "volume_conversion";
                } else if (conversions.oz) {
                    convertedAmount = numericAmount * conversions.oz;
                    convertedUnit = 'oz';
                    conversionMethod = "weight_conversion";
                }
            }
            break;
        }
    }

    // Format the converted amount nicely
    let formattedAmount = convertedAmount;
    if (convertedAmount !== numericAmount) {
        if (convertedAmount < 1) {
            formattedAmount = convertedAmount.toFixed(2);
        } else if (convertedAmount < 10) {
            formattedAmount = convertedAmount.toFixed(1);
        } else {
            formattedAmount = Math.round(convertedAmount).toString();
        }
    } else {
        formattedAmount = originalAmount;
    }

    console.log('✅ Conversion result:', {
        original: `${originalAmount} ${originalUnit}`,
        converted: `${formattedAmount} ${convertedUnit}`,
        method: conversionMethod
    });

    // FIXED: Return clean ingredient object with all necessary properties
    return {
        name: name,
        amount: formattedAmount,
        unit: convertedUnit,
        optional: optional,
        alternatives: ingredientData.alternatives || [],
        originalAmount: originalAmount,
        originalUnit: originalUnit,
        conversionMethod: conversionMethod,
        notes: convertedAmount !== numericAmount ? `Converted from ${originalAmount} ${originalUnit}` : "No conversion applied",
        _id: ingredientData._id || ingredient._id
    };
}

// Calculate cooking time multiplier for scaled recipes
function calculateTimeMultiplier(scalingFactor) {
    if (scalingFactor <= 0.5) {
        return 0.8;  // Smaller batches cook faster
    } else if (scalingFactor <= 1.5) {
        return 1.0;  // No significant change
    } else if (scalingFactor <= 2.0) {
        return 1.15; // Slightly longer
    } else if (scalingFactor <= 3.0) {
        return 1.25; // Moderately longer
    } else {
        return 1.4;  // Much larger batches take longer
    }
}

// Usage tracking functions
export async function trackTransformationUsage(userId, transformationType, isAI = false, User) {
    try {
        const user = await User.findById(userId);
        if (!user) return false;

        // Ensure tracking structure exists
        if (!user.usageTracking) {
            user.usageTracking = {};
        }

        if (!user.usageTracking.recipeTransformations) {
            user.usageTracking.recipeTransformations = {
                basicScalings: 0,
                aiScalings: 0,
                basicConversions: 0,
                aiConversions: 0,
                lastReset: new Date()
            };
        }

        // Reset monthly counters if needed
        user.checkAndResetMonthlyUsage();

        // Track usage
        if (transformationType === 'scale') {
            if (isAI) {
                user.usageTracking.recipeTransformations.aiScalings += 1;
            } else {
                user.usageTracking.recipeTransformations.basicScalings += 1;
            }
        } else if (transformationType === 'convert') {
            if (isAI) {
                user.usageTracking.recipeTransformations.aiConversions += 1;
            } else {
                user.usageTracking.recipeTransformations.basicConversions += 1;
            }
        }

        user.usageTracking.lastUpdated = new Date();
        await user.save();

        return true;
    } catch (error) {
        console.error('Error tracking transformation usage:', error);
        return false;
    }
}

// Check transformation usage limits
export function checkTransformationLimit(user, transformationType, isAI = false) {
    try {
        const tier = user?.getEffectiveTier?.() || 'free';
        const usage = user?.usageTracking?.recipeTransformations || {};

        // Get current usage count
        let currentUsage = 0;
        if (transformationType === 'scale') {
            currentUsage = isAI ? (usage.aiScalings || 0) : (usage.basicScalings || 0);
        } else if (transformationType === 'convert') {
            currentUsage = isAI ? (usage.aiConversions || 0) : (usage.basicConversions || 0);
        }

        // Get limits based on tier
        const limits = {
            free: { basicScalings: 20, basicConversions: 20, aiScalings: 0, aiConversions: 0 },
            gold: { basicScalings: -1, basicConversions: -1, aiScalings: 50, aiConversions: 50 },
            platinum: { basicScalings: -1, basicConversions: -1, aiScalings: -1, aiConversions: -1 },
            admin: { basicScalings: -1, basicConversions: -1, aiScalings: -1, aiConversions: -1 }
        };

        const tierLimits = limits[tier] || limits.free;

        // Get specific limit
        let limit;
        if (transformationType === 'scale') {
            limit = isAI ? tierLimits.aiScalings : tierLimits.basicScalings;
        } else if (transformationType === 'convert') {
            limit = isAI ? tierLimits.aiConversions : tierLimits.basicConversions;
        }

        // -1 means unlimited
        if (limit === -1) return { allowed: true, remaining: 'Unlimited' };

        // 0 means not allowed
        if (limit === 0) return { allowed: false, remaining: 0, reason: 'feature_not_available' };

        // Check if under limit
        const allowed = currentUsage < limit;
        const remaining = Math.max(0, limit - currentUsage);

        return {
            allowed,
            remaining,
            current: currentUsage,
            limit,
            reason: allowed ? null : 'limit_exceeded'
        };

    } catch (error) {
        console.error('Error checking transformation limit:', error);
        return { allowed: false, remaining: 0, reason: 'error' };
    }
}

// Temperature conversion utilities
export function convertTemperature(temp, fromUnit, toUnit) {
    if (fromUnit === toUnit) return temp;

    const tempNum = parseFloat(temp);
    if (isNaN(tempNum)) return temp;

    if (fromUnit === 'fahrenheit' && toUnit === 'celsius') {
        return Math.round((tempNum - 32) * 5/9);
    } else if (fromUnit === 'celsius' && toUnit === 'fahrenheit') {
        return Math.round(tempNum * 9/5 + 32);
    }

    return temp;
}

// Find temperature mentions in instructions and convert them
export function convertInstructionTemperatures(instructions, targetSystem) {
    const tempRegexF = /(\d+)°?\s*[Ff]/g;
    const tempRegexC = /(\d+)°?\s*[Cc]/g;

    return instructions.map(instruction => {
        let instructionText = typeof instruction === 'string' ? instruction : instruction.text || instruction.instruction || '';

        if (targetSystem === 'metric') {
            // Convert Fahrenheit to Celsius
            instructionText = instructionText.replace(tempRegexF, (match, temp) => {
                const celsius = convertTemperature(temp, 'fahrenheit', 'celsius');
                return `${celsius}°C`;
            });
        } else if (targetSystem === 'us') {
            // Convert Celsius to Fahrenheit
            instructionText = instructionText.replace(tempRegexC, (match, temp) => {
                const fahrenheit = convertTemperature(temp, 'celsius', 'fahrenheit');
                return `${fahrenheit}°F`;
            });
        }

        // Return in same format as input
        if (typeof instruction === 'string') {
            return instructionText;
        } else {
            return {
                ...instruction,
                text: instructionText
            };
        }
    });
}

// Generate transformation summary for UI display
export function getTransformationSummary(recipe) {
    const summary = {
        hasTransformations: false,
        scaling: {
            hasHistory: false,
            currentServings: recipe.servings,
            originalServings: recipe.originalServings,
            isScaled: false,
            lastScaling: null
        },
        conversion: {
            hasHistory: false,
            currentSystem: recipe.currentMeasurementSystem || 'unknown',
            originalSystem: recipe.originalMeasurementSystem || 'unknown',
            isConverted: false,
            lastConversion: null
        },
        aiOptimized: false
    };

    // Check scaling history
    if (recipe.scalingHistory && recipe.scalingHistory.length > 0) {
        summary.scaling.hasHistory = true;
        summary.scaling.lastScaling = recipe.scalingHistory[recipe.scalingHistory.length - 1];
        summary.scaling.isScaled = recipe.originalServings && recipe.currentServings &&
            recipe.originalServings !== recipe.currentServings;
        summary.hasTransformations = true;
    }

    // Check conversion history
    if (recipe.conversionHistory && recipe.conversionHistory.length > 0) {
        summary.conversion.hasHistory = true;
        summary.conversion.lastConversion = recipe.conversionHistory[recipe.conversionHistory.length - 1];
        summary.conversion.isConverted = recipe.originalMeasurementSystem && recipe.currentMeasurementSystem &&
            recipe.originalMeasurementSystem !== recipe.currentMeasurementSystem;
        summary.hasTransformations = true;
    }

    // Check AI optimization
    summary.aiOptimized = recipe.aiTransformations?.scalingOptimized || recipe.aiTransformations?.unitsOptimized || false;

    return summary;
}

// Validate transformation parameters
export function validateTransformationParams(transformationType, options) {
    const errors = [];

    console.log('🔍 Validating transformation params:', { transformationType, options });

    if (!transformationType) {
        errors.push('Transformation type is required');
    }

    // FIXED: Add "both" as a valid transformation type
    if (!['scale', 'convert', 'both'].includes(transformationType)) {
        errors.push(`Unknown transformation type: ${transformationType}`);
    }

    if (!options) {
        errors.push('Options are required');
    }

    if (transformationType === 'scale') {
        if (!options?.targetServings) {
            errors.push('Target servings required for scaling');
        } else if (options.targetServings < 1 || options.targetServings > 100) {
            errors.push('Target servings must be between 1 and 100');
        }
    }

    if (transformationType === 'convert') {
        if (!options?.targetSystem) {
            errors.push('Target measurement system required for conversion');
        } else if (!['us', 'metric'].includes(options.targetSystem)) {
            errors.push('Target system must be "us" or "metric"');
        }
    }

    if (transformationType === 'both') {
        if (!options?.targetServings || !options?.targetSystem) {
            errors.push('Both target servings and measurement system required');
        }
        // Also validate the individual parameters
        if (options?.targetServings && (options.targetServings < 1 || options.targetServings > 100)) {
            errors.push('Target servings must be between 1 and 100');
        }
        if (options?.targetSystem && !['us', 'metric'].includes(options.targetSystem)) {
            errors.push('Target system must be "us" or "metric"');
        }
    }

    console.log('🔍 Validation result:', { isValid: errors.length === 0, errors });

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Format transformation result for display
export function formatTransformationResult(result, transformationType) {
    if (!result.success) {
        return {
            success: false,
            message: result.error || 'Transformation failed',
            details: result
        };
    }

    let message = 'Recipe transformed successfully';
    let details = [];

    if (transformationType === 'scale') {
        const adjustments = result.cooking_adjustments || {};

        if (adjustments.time_multiplier && adjustments.time_multiplier !== 1) {
            details.push(`Cooking time adjusted by ${(adjustments.time_multiplier * 100).toFixed(0)}%`);
        }

        if (adjustments.equipment_notes) {
            details.push(`Equipment: ${adjustments.equipment_notes}`);
        }

        if (result.practical_tips && result.practical_tips.length > 0) {
            details.push(`Tips: ${result.practical_tips.join(', ')}`);
        }

    } else if (transformationType === 'convert') {
        const notes = result.conversion_notes || {};

        if (notes.accuracy_level) {
            details.push(`Accuracy: ${notes.accuracy_level}`);
        }

        if (notes.regional_adaptations) {
            details.push(notes.regional_adaptations);
        }

        if (result.cultural_notes) {
            details.push(result.cultural_notes);
        }
    }

    if (result.method?.includes('ai')) {
        message += ' with AI optimization';
    }

    return {
        success: true,
        message,
        details,
        confidence: result.success_probability,
        method: result.method,
        rawResult: result
    };
}