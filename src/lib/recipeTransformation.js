// file: /src/lib/recipeTransformation.js v1 - Recipe scaling and unit conversion utilities

/**
 * Recipe Transformation Utilities
 * Handles recipe scaling and unit conversion with both basic math and AI integration
 */

// Modal.com service integration
export async function callModalTransformationService(functionName, data) {
    const response = await fetch(`${process.env.MODAL_WEBHOOK_URL}/recipe-transformation`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.MODAL_API_KEY}`
        },
        body: JSON.stringify({
            function: functionName,
            data: data
        })
    });

    if (!response.ok) {
        throw new Error(`Modal transformation service failed: ${response.statusText}`);
    }

    return await response.json();
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

// Basic mathematical recipe scaling (for free users)
export function scaleRecipeBasic(recipe, targetServings) {
    const originalServings = recipe.servings || 4;
    const scalingFactor = targetServings / originalServings;

    const scaledIngredients = recipe.ingredients.map(ingredient => {
        const scaledAmount = scaleAmountBasic(ingredient.amount, scalingFactor);

        return {
            ...ingredient,
            amount: scaledAmount,
            originalAmount: ingredient.amount,
            scalingNotes: `Scaled by ${scalingFactor.toFixed(2)}x`
        };
    });

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

// Basic unit conversion (for free users)
export function convertUnitsBasic(recipe, targetSystem) {
    const sourceSystem = detectMeasurementSystem(recipe.ingredients);

    if (sourceSystem === targetSystem) {
        return {
            success: true,
            message: "Recipe already in target measurement system",
            converted_ingredients: recipe.ingredients
        };
    }

    const conversionTable = getBasicConversionTable(sourceSystem, targetSystem);

    const convertedIngredients = recipe.ingredients.map(ingredient => {
        return convertIngredientBasic(ingredient, conversionTable, targetSystem);
    });

    return {
        success: true,
        converted_ingredients: convertedIngredients,
        conversion_notes: {
            method_used: "basic_mathematical_conversion",
            accuracy_level: "standard",
            regional_adaptations: `Converted to ${targetSystem} measurements`
        },
        method: "basic_math_conversion",
        success_probability: 0.8
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

// Get basic conversion table
function getBasicConversionTable(sourceSystem, targetSystem) {
    const conversions = {
        us_to_metric: {
            'cup': { ml: 240, g_flour: 120, g_sugar: 200 },
            'tbsp': { ml: 15 },
            'tsp': { ml: 5 },
            'oz': { g: 28.35 },
            'lb': { g: 453.59, kg: 0.454 },
            'fahrenheit': 'celsius'
        },
        metric_to_us: {
            'ml': { cup: 0.00422, tbsp: 0.0676, tsp: 0.2029 },
            'g': { oz: 0.0353, cup_flour: 0.00833, cup_sugar: 0.005 },
            'kg': { lb: 2.205 },
            'celsius': 'fahrenheit'
        }
    };

    return sourceSystem === 'us' && targetSystem === 'metric'
        ? conversions.us_to_metric
        : conversions.metric_to_us;
}

// Convert single ingredient using basic math
function convertIngredientBasic(ingredient, conversionTable, targetSystem) {
    const originalUnit = (ingredient.unit || '').toLowerCase();
    const originalAmount = ingredient.amount || '';
    const ingredientName = (ingredient.name || '').toLowerCase();

    // Try to parse numeric amount
    let numericAmount;
    try {
        numericAmount = parseFloat(originalAmount);
    } catch {
        return {
            ...ingredient,
            originalAmount: originalAmount,
            originalUnit: originalUnit,
            conversionMethod: "no_conversion_needed",
            notes: "Could not parse numeric amount"
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
                if (ingredientName.includes('flour') && conversions.g_flour) {
                    convertedAmount = numericAmount * conversions.g_flour;
                    convertedUnit = 'g';
                    conversionMethod = "ingredient_specific";
                } else if (ingredientName.includes('sugar') && conversions.g_sugar) {
                    convertedAmount = numericAmount * conversions.g_sugar;
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
                }
            }
            break;
        }
    }

    return {
        ...ingredient,
        amount: convertedAmount !== numericAmount ? convertedAmount.toFixed(1) : originalAmount,
        unit: convertedUnit,
        originalAmount: originalAmount,
        originalUnit: originalUnit,
        conversionMethod: conversionMethod,
        notes: convertedAmount !== numericAmount ? `Converted from ${originalAmount} ${originalUnit}` : "No conversion applied"
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

    if (!transformationType) {
        errors.push('Transformation type is required');
    }

    if (transformationType === 'scale') {
        if (!options.targetServings) {
            errors.push('Target servings required for scaling');
        } else if (options.targetServings < 1 || options.targetServings > 100) {
            errors.push('Target servings must be between 1 and 100');
        }
    }

    if (transformationType === 'convert') {
        if (!options.targetSystem) {
            errors.push('Target measurement system required for conversion');
        } else if (!['us', 'metric'].includes(options.targetSystem)) {
            errors.push('Target system must be "us" or "metric"');
        }
    }

    if (transformationType === 'both') {
        if (!options.targetServings || !options.targetSystem) {
            errors.push('Both target servings and measurement system required');
        }
    }

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