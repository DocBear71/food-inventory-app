// Enhanced NutritionModal.js with improved close button and voice analysis support
import React, { useState } from 'react';
import { X, Info, Mic } from 'lucide-react';

const NutritionModal = ({
                            nutrition,
                            isOpen,
                            onClose,
                            servings = 1,
                            recipeTitle = "Recipe",
                            isVoiceAnalysis = false // NEW: Flag to indicate this is from voice analysis
                        }) => {
    if (!isOpen || !nutrition) return null;

    // Calculate nutritional score and grade
    const calculateNutritionalGrade = (nutrition) => {
        let score = 0;
        let factors = 0;

        // Positive factors
        if (nutrition.protein?.value >= 20) { score += 25; factors++; }
        else if (nutrition.protein?.value >= 10) { score += 15; factors++; }

        if (nutrition.fiber?.value >= 5) { score += 20; factors++; }
        else if (nutrition.fiber?.value >= 3) { score += 10; factors++; }

        if (nutrition.vitaminC?.value >= 15) { score += 15; factors++; }
        if (nutrition.calcium?.value >= 100) { score += 10; factors++; }
        if (nutrition.iron?.value >= 2) { score += 10; factors++; }

        // Negative factors
        if (nutrition.saturatedFat?.value >= 10) { score -= 20; factors++; }
        else if (nutrition.saturatedFat?.value >= 5) { score -= 10; factors++; }

        if (nutrition.sodium?.value >= 800) { score -= 25; factors++; }
        else if (nutrition.sodium?.value >= 400) { score -= 15; factors++; }

        if (nutrition.sugars?.value >= 15) { score -= 15; factors++; }
        if (nutrition.transFat?.value > 0) { score -= 30; factors++; }

        // Calorie consideration
        const calories = nutrition.calories?.value || 0;
        if (calories < 200) { score += 10; factors++; }
        else if (calories > 600) { score -= 10; factors++; }

        const avgScore = factors > 0 ? score / factors : 0;

        // Convert to letter grade
        if (avgScore >= 15) return { grade: 'A', color: 'bg-green-500', description: 'Excellent' };
        if (avgScore >= 5) return { grade: 'B', color: 'bg-lime-500', description: 'Good' };
        if (avgScore >= -5) return { grade: 'C', color: 'bg-yellow-500', description: 'Fair' };
        if (avgScore >= -15) return { grade: 'D', color: 'bg-orange-500', description: 'Poor' };
        return { grade: 'F', color: 'bg-red-500', description: 'Very Poor' };
    };

    // Calculate daily values (based on 2000 calorie diet)
    const calculateDailyValue = (nutrient, value) => {
        const dailyValues = {
            calories: 2000,
            protein: 50,
            fat: 65,
            saturatedFat: 20,
            cholesterol: 300,
            carbs: 300,
            fiber: 25,
            sugars: 50,
            sodium: 2300,
            potassium: 3500,
            calcium: 1000,
            iron: 18,
            magnesium: 400,
            phosphorus: 1000,
            zinc: 11,
            vitaminA: 900,
            vitaminC: 90,
            vitaminD: 20,
            vitaminE: 15,
            vitaminK: 120,
            thiamin: 1.2,
            riboflavin: 1.3,
            niacin: 16,
            vitaminB6: 1.7,
            folate: 400,
            vitaminB12: 2.4
        };

        const dv = dailyValues[nutrient];
        if (!dv || !value) return null;

        return Math.round((value / dv) * 100);
    };

    const gradeInfo = calculateNutritionalGrade(nutrition);

    const NutrientRow = ({ label, nutrient, value, unit }) => {
        const dailyValue = calculateDailyValue(nutrient, value);

        return (
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-700 font-medium">{label}</span>
                <div className="flex items-center gap-4">
                    <span className="text-gray-900 font-semibold">
                        {value > 0 ? `${value} ${unit}` : '--'}
                    </span>
                    {dailyValue && (
                        <span className="text-gray-600 text-sm w-12 text-right">
                            {dailyValue}%
                        </span>
                    )}
                </div>
            </div>
        );
    };

    const servingSize = nutrition.servingSize?.value || 350;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[95vh] overflow-hidden mx-auto relative">
                {/* ENHANCED: Header with better close button positioning */}
                <div className="bg-green-50 p-4 border-b relative">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center flex-shrink-0">
                                {isVoiceAnalysis ? (
                                    <Mic size={16} className="text-white" />
                                ) : (
                                    <span className="text-white font-bold text-sm">N</span>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-gray-900 text-lg truncate">
                                    {isVoiceAnalysis ? 'Voice Analysis' : 'Nutrition'}
                                </h3>
                                <p className="text-sm text-gray-600 truncate">{recipeTitle}</p>
                                {isVoiceAnalysis && (
                                    <p className="text-xs text-green-600 mt-1">
                                        🎤 AI-powered nutrition analysis
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* IMPROVED: Close button positioned to the right */}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-200 rounded-full transition-colors bg-white shadow-sm border border-gray-200 flex-shrink-0 ml-2"
                            aria-label="Close nutrition modal"
                        >
                            <X size={18} className="text-gray-600" />
                        </button>
                    </div>

                    {/* Enhanced Nutritional Grade Display */}
                    <div className="mt-4">
                        <div className="flex justify-center items-center gap-1 mb-3">
                            <div className="flex items-end gap-1">
                                {['A', 'B', 'C', 'D', 'F'].map((grade) => {
                                    const isActive = grade === gradeInfo.grade;
                                    const gradeIndex = ['A', 'B', 'C', 'D', 'F'].indexOf(grade);
                                    const activeIndex = ['A', 'B', 'C', 'D', 'F'].indexOf(gradeInfo.grade);
                                    const isPassed = gradeIndex <= activeIndex;

                                    const getGradeColor = (g) => {
                                        switch(g) {
                                            case 'A': return isPassed ? 'bg-green-500' : 'bg-green-500 opacity-30';
                                            case 'B': return isPassed ? 'bg-lime-500' : 'bg-lime-500 opacity-30';
                                            case 'C': return isPassed ? 'bg-yellow-500' : 'bg-yellow-500 opacity-30';
                                            case 'D': return isPassed ? 'bg-orange-500' : 'bg-orange-500 opacity-30';
                                            case 'F': return isPassed ? 'bg-red-500' : 'bg-red-500 opacity-30';
                                            default: return 'bg-gray-200';
                                        }
                                    };

                                    return (
                                        <div
                                            key={grade}
                                            className={`flex items-center justify-center text-white font-bold transition-all duration-300 rounded-md ${
                                                isActive
                                                    ? `w-10 h-10 text-base ${gradeInfo.color} shadow-lg transform scale-110`
                                                    : `w-8 h-8 text-sm ${getGradeColor(grade)}`
                                            }`}
                                        >
                                            {grade}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-gray-700">
                                Nutritional Score: <span className="font-semibold text-lg">{gradeInfo.description}</span>
                            </p>
                            {nutrition.confidence && (
                                <p className="text-xs text-gray-500 mt-1">
                                    AI Confidence: {Math.round(nutrition.confidence * 100)}%
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Nutrition Content */}
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(95vh - 200px)' }}>
                    <div className="p-4">
                        {/* Serving Size */}
                        <div className="mb-4 pb-2 border-b-2 border-gray-200">
                            <p className="text-sm text-gray-600">
                                Per serving (1 serving = {servingSize}g)
                            </p>
                            <p className="text-xs text-gray-500 mt-1">daily intake*</p>
                        </div>

                        {/* Key Nutrients */}
                        <div className="space-y-1">
                            <NutrientRow
                                label="Energy"
                                nutrient="calories"
                                value={nutrition.calories?.value}
                                unit="kcal"
                            />
                            <NutrientRow
                                label="Fat"
                                nutrient="fat"
                                value={nutrition.fat?.value}
                                unit="g"
                            />
                            <NutrientRow
                                label="Saturated Fat"
                                nutrient="saturatedFat"
                                value={nutrition.saturatedFat?.value}
                                unit="g"
                            />
                            <NutrientRow
                                label="Monounsaturated Fat"
                                nutrient="monounsaturatedFat"
                                value={nutrition.monounsaturatedFat?.value}
                                unit="g"
                            />
                            <NutrientRow
                                label="Polyunsaturated Fat"
                                nutrient="polyunsaturatedFat"
                                value={nutrition.polyunsaturatedFat?.value}
                                unit="g"
                            />
                            <NutrientRow
                                label="Trans Fat"
                                nutrient="transFat"
                                value={nutrition.transFat?.value}
                                unit="g"
                            />
                            <NutrientRow
                                label="Carbohydrates"
                                nutrient="carbs"
                                value={nutrition.carbs?.value}
                                unit="g"
                            />
                            <NutrientRow
                                label="Fiber"
                                nutrient="fiber"
                                value={nutrition.fiber?.value}
                                unit="g"
                            />
                            <NutrientRow
                                label="Sugars"
                                nutrient="sugars"
                                value={nutrition.sugars?.value}
                                unit="g"
                            />
                            <NutrientRow
                                label="Protein"
                                nutrient="protein"
                                value={nutrition.protein?.value}
                                unit="g"
                            />
                            <NutrientRow
                                label="Sodium"
                                nutrient="sodium"
                                value={nutrition.sodium?.value}
                                unit="mg"
                            />
                            <NutrientRow
                                label="Cholesterol"
                                nutrient="cholesterol"
                                value={nutrition.cholesterol?.value}
                                unit="mg"
                            />
                            <NutrientRow
                                label="Calcium"
                                nutrient="calcium"
                                value={nutrition.calcium?.value}
                                unit="mg"
                            />
                            <NutrientRow
                                label="Magnesium"
                                nutrient="magnesium"
                                value={nutrition.magnesium?.value}
                                unit="mg"
                            />
                            <NutrientRow
                                label="Potassium"
                                nutrient="potassium"
                                value={nutrition.potassium?.value}
                                unit="mg"
                            />
                            <NutrientRow
                                label="Iron"
                                nutrient="iron"
                                value={nutrition.iron?.value}
                                unit="mg"
                            />
                            <NutrientRow
                                label="Zinc"
                                nutrient="zinc"
                                value={nutrition.zinc?.value}
                                unit="mg"
                            />
                            <NutrientRow
                                label="Vitamin A (RAE)"
                                nutrient="vitaminA"
                                value={nutrition.vitaminA?.value}
                                unit="µg"
                            />
                            <NutrientRow
                                label="Vitamin C"
                                nutrient="vitaminC"
                                value={nutrition.vitaminC?.value}
                                unit="mg"
                            />
                            <NutrientRow
                                label="Thiamin B1"
                                nutrient="thiamin"
                                value={nutrition.thiamin?.value}
                                unit="mg"
                            />
                            <NutrientRow
                                label="Riboflavin B2"
                                nutrient="riboflavin"
                                value={nutrition.riboflavin?.value}
                                unit="mg"
                            />
                            <NutrientRow
                                label="Niacin B3"
                                nutrient="niacin"
                                value={nutrition.niacin?.value}
                                unit="mg"
                            />
                            <NutrientRow
                                label="Vitamin B6"
                                nutrient="vitaminB6"
                                value={nutrition.vitaminB6?.value}
                                unit="mg"
                            />
                            <NutrientRow
                                label="Folic Acid B9"
                                nutrient="folate"
                                value={nutrition.folate?.value}
                                unit="µg"
                            />
                            <NutrientRow
                                label="Vitamin B12"
                                nutrient="vitaminB12"
                                value={nutrition.vitaminB12?.value}
                                unit="µg"
                            />
                        </div>

                        {/* ENHANCED: Additional analysis info for voice analysis */}
                        {isVoiceAnalysis && nutrition.calculationMethod && (
                            <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <h4 className="text-sm font-semibold text-blue-900 mb-2">🤖 Analysis Details</h4>
                                <div className="text-xs text-blue-700 space-y-1">
                                    <p>Method: {nutrition.calculationMethod.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                                    {nutrition.aiAnalysis?.modelUsed && (
                                        <p>AI Model: {nutrition.aiAnalysis.modelUsed}</p>
                                    )}
                                    {nutrition.aiAnalysis?.processingTime && (
                                        <p>Processing Time: {nutrition.aiAnalysis.processingTime}ms</p>
                                    )}
                                    {nutrition.aiAnalysis?.tokensUsed && (
                                        <p>Tokens Used: {nutrition.aiAnalysis.tokensUsed}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Analysis metadata footer */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-xs text-gray-500 text-center">
                                * Daily values are based on a 2000 calorie diet.
                            </p>
                            {isVoiceAnalysis && (
                                <p className="text-xs text-gray-500 text-center mt-1">
                                    🎤 Data generated by voice analysis AI
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NutritionModal;