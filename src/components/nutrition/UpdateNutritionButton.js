

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

    const handleUpdateNutrition = async () => {
        if (!recipe?.ingredients || recipe.ingredients.length === 0) {
            alert('Please add ingredients before analyzing nutrition.');
            return;
        }

        setIsAnalyzing(true);
        setLastResult(null);

        try {
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

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Main Button */}
            <button
                onClick={handleUpdateNutrition}
                disabled={disabled || isAnalyzing}
                className={`
                    w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all
                    ${isAnalyzing
                    ? 'bg-blue-50 text-blue-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg'
                }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
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

            {/* Ingredient Count Info */}
            {recipe?.ingredients && (
                <div className="text-sm text-gray-600 text-center">
                    Will analyze {recipe.ingredients.filter(ing => ing.name && ing.name.trim()).length} ingredients
                </div>
            )}

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

                                    {/* Toggle Details */}
                                    <button
                                        onClick={() => setShowDetails(!showDetails)}
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
                        <li>Requires Gold+ subscription</li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default UpdateNutritionButton;