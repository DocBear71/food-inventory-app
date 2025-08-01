import React, { useState } from 'react';
import { Zap, Loader2, CheckCircle, AlertCircle, DollarSign, Clock, Target } from 'lucide-react';
import {apiPost} from "@/lib/api-config.js";

const UpdateNutritionButton = ({
                                   recipe,
                                   onNutritionUpdate,
                                   disabled = false,
                                   className = ""
                               }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [lastResult, setLastResult] = useState(null);
    const [showDetails, setShowDetails] = useState(false);

    // Helper function to get all ingredients from both single-part and multi-part recipes
    const getAllIngredients = (recipe) => {
        if (!recipe) return [];

        // Multi-part recipe
        if (recipe.isMultiPart && recipe.parts && Array.isArray(recipe.parts)) {
            return recipe.parts.reduce((allIngredients, part) => {
                const partIngredients = (part.ingredients || []).filter(ing => ing.name && ing.name.trim());
                return [...allIngredients, ...partIngredients];
            }, []);
        }

        // Single-part recipe (legacy)
        return (recipe.ingredients || []).filter(ing => ing.name && ing.name.trim());
    };

    const handleUpdateNutrition = async () => {
        const allIngredients = getAllIngredients(recipe);

        if (allIngredients.length === 0) {
            alert('Please add ingredients before analyzing nutrition.');
            return;
        }

        setIsAnalyzing(true);
        setLastResult(null);

        try {
            // FIXED: Handle both saved and unsaved recipes
            if (recipe._id) {
                // Recipe is saved - use existing endpoint
                console.log('🔄 Analyzing nutrition for saved recipe:', recipe._id);

                const response = await apiPost(`/api/recipes/${recipe._id}/analyze-nutrition`, {
                    forceAnalysis: true,
                    includeDetails: true
                });

                const data = await response.json();

                if (data.success) {
                    setLastResult({
                        success: true,
                        ...data.analysisResult
                    });

                    // Call parent callback with updated nutrition
                    if (onNutritionUpdate) {
                        onNutritionUpdate(data.nutrition, data.analysisResult);
                    }
                } else {
                    setLastResult({
                        success: false,
                        error: data.error || 'Analysis failed'
                    });
                }
            } else {
                // Recipe is unsaved - analyze directly
                console.log('🔄 Analyzing nutrition for unsaved recipe with', allIngredients.length, 'ingredients');

                // Prepare recipe data for analysis
                const recipeForAnalysis = {
                    title: recipe.title || 'Unsaved Recipe',
                    ingredients: allIngredients, // Use flattened ingredients list
                    instructions: recipe.isMultiPart && recipe.parts ?
                        // Flatten instructions from all parts
                        recipe.parts.reduce((allInstructions, part, partIndex) => {
                            const partInstructions = (part.instructions || []).map(instruction => {
                                const instructionText = typeof instruction === 'string' ? instruction :
                                    (instruction.text || instruction.instruction || '');
                                return `[${part.name || `Part ${partIndex + 1}`}] ${instructionText}`;
                            });
                            return [...allInstructions, ...partInstructions];
                        }, [])
                        : recipe.instructions || [],
                    servings: parseInt(recipe.servings) || 4,
                    cookTime: recipe.cookTime,
                    prepTime: recipe.prepTime,
                    isMultiPart: recipe.isMultiPart || false,
                    parts: recipe.parts || []
                };

                const response = await apiPost('/api/recipes/analyze-nutrition-direct', {
                    recipe: recipeForAnalysis,
                    includeDetails: true
                });

                const data = await response.json();

                if (data.success) {
                    setLastResult({
                        success: true,
                        ...data.analysisResult
                    });

                    // Call parent callback with updated nutrition
                    if (onNutritionUpdate) {
                        onNutritionUpdate(data.nutrition, data.analysisResult);
                    }
                } else {
                    setLastResult({
                        success: false,
                        error: data.error || 'Analysis failed'
                    });
                }
            }

        } catch (error) {
            console.error('Nutrition analysis error:', error);
            setLastResult({
                success: false,
                error: 'Network error occurred'
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const formatCost = (cost) => {
        if (!cost) return '$0.00';
        return `$${cost.toFixed(4)}`;
    };

    const formatTime = (ms) => {
        if (!ms) return '0s';
        return ms > 1000 ? `${(ms/1000).toFixed(1)}s` : `${ms}ms`;
    };

    // Get ingredient count using the helper function
    const ingredientCount = getAllIngredients(recipe).length;
    const isDisabled = disabled || ingredientCount === 0 || isAnalyzing;

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Main Button */}
            <button
                onClick={handleUpdateNutrition}
                disabled={isDisabled}
                className={`
                    w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all
                    ${isAnalyzing
                    ? 'bg-blue-50 text-blue-600 cursor-not-allowed'
                    : isDisabled
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg'
                }
                `}
            >
                {isAnalyzing ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analyzing Nutrition...
                    </>
                ) : (
                    <>
                        <Zap className="w-5 h-5" />
                        Update Nutrition with AI
                    </>
                )}
            </button>

            {/* Enhanced Ingredient Count Info with multi-part support */}
            <div className="text-sm text-gray-600 text-center">
                {recipe && (
                    <>
                        Will analyze {ingredientCount} ingredient{ingredientCount !== 1 ? 's' : ''}
                        {recipe.isMultiPart && recipe.parts && (
                            <div className="text-xs text-gray-500 mt-1">
                                From {recipe.parts.length} recipe part{recipe.parts.length !== 1 ? 's' : ''}:
                                {recipe.parts.map((part, index) => {
                                    const partIngredientCount = (part.ingredients || []).filter(ing => ing.name && ing.name.trim()).length;
                                    return (
                                        <span key={index} className="ml-2">
                                            {part.name || `Part ${index + 1}`} ({partIngredientCount})
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                        {!recipe._id && (
                            <div className="text-xs text-blue-600 mt-1">
                                ✨ Preview mode - recipe not saved yet
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Results Display */}
            {lastResult && (
                <div className={`
                    p-4 rounded-lg border-l-4 
                    ${lastResult.success
                    ? 'bg-green-50 border-green-500'
                    : 'bg-red-50 border-red-500'
                }
                `}>
                    <div className="flex items-start gap-3">
                        {lastResult.success ? (
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        )}

                        <div className="flex-1">
                            <div className="font-medium text-gray-900">
                                {lastResult.success
                                    ? 'Nutrition Updated Successfully!'
                                    : 'Analysis Failed'
                                }
                            </div>

                            {lastResult.success ? (
                                <div className="mt-2 space-y-2">
                                    {/* Quick Stats */}
                                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                        {lastResult.metadata?.coverage !== undefined && (
                                            <div className="flex items-center gap-1">
                                                <Target className="w-4 h-4" />
                                                {Math.round(lastResult.metadata.coverage * 100)}% coverage
                                            </div>
                                        )}

                                        {lastResult.metadata?.aiAnalysis?.cost && (
                                            <div className="flex items-center gap-1">
                                                <DollarSign className="w-4 h-4" />
                                                {formatCost(lastResult.metadata.aiAnalysis.cost)}
                                            </div>
                                        )}

                                        {lastResult.metadata?.processingTime && (
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {formatTime(lastResult.metadata.processingTime)}
                                            </div>
                                        )}
                                    </div>

                                    {/* FIXED: Toggle Details button with type="button" to prevent form submission */}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setShowDetails(!showDetails);
                                        }}
                                        className="text-sm text-blue-600 hover:text-blue-700 underline"
                                    >
                                        {showDetails ? 'Hide Details' : 'Show Details'}
                                    </button>

                                    {/* Detailed Results */}
                                    {showDetails && lastResult.metadata && (
                                        <div className="mt-3 p-3 bg-white rounded border text-xs space-y-2">
                                            <div>
                                                <strong>Confidence:</strong> {Math.round((lastResult.metadata.confidence || 0) * 100)}%
                                            </div>

                                            {lastResult.metadata.aiAnalysis?.modelUsed && (
                                                <div>
                                                    <strong>AI Model:</strong> {lastResult.metadata.aiAnalysis.modelUsed}
                                                </div>
                                            )}

                                            {lastResult.metadata.aiAnalysis?.tokensUsed && (
                                                <div>
                                                    <strong>Tokens Used:</strong> {
                                                    typeof lastResult.metadata.aiAnalysis.tokensUsed === 'object'
                                                        ? lastResult.metadata.aiAnalysis.tokensUsed.total || 'N/A'
                                                        : lastResult.metadata.aiAnalysis.tokensUsed
                                                }
                                                </div>
                                            )}

                                            <div>
                                                <strong>Calculation Method:</strong> {lastResult.metadata.calculationMethod || 'ai_calculated'}
                                            </div>

                                            {recipe.isMultiPart && (
                                                <div>
                                                    <strong>Recipe Type:</strong> Multi-part recipe ({recipe.parts?.length || 0} parts)
                                                </div>
                                            )}

                                            {lastResult.metadata.aiAnalysis?.warnings?.length > 0 && (
                                                <div>
                                                    <strong>Warnings:</strong>
                                                    <ul className="mt-1 ml-4 list-disc">
                                                        {lastResult.metadata.aiAnalysis.warnings.map((warning, i) => (
                                                            <li key={i}>{warning}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="mt-2 text-sm text-red-700">
                                    {lastResult.error}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Help Text */}
            {!lastResult && !isAnalyzing && (
                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                    <div className="font-medium mb-1">AI Nutrition Analysis:</div>
                    <ul className="space-y-1 ml-4 list-disc">
                        <li>Uses USDA + OpenFoodFacts databases</li>
                        <li>Applies cooking method adjustments</li>
                        <li>Calculates per-serving nutrition</li>
                        <li>Supports multi-part recipes</li>
                        <li>Works before saving recipe</li>
                        <li>Requires Gold+ subscription</li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default UpdateNutritionButton;