// file: /src/app/api/nutrition/analyze-unified/route.js v1

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Recipe, UserInventory } from '@/lib/models';
import { NutritionLog } from "@/models/NutritionLog.js";
import { modalBridge } from '@/lib/modal-bridge';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const {
            type,
            data,
            saveResults = false,
            analysisLevel = 'standard'
        } = await request.json();

        console.log(`🧠 Unified nutrition analysis: ${type} (level: ${analysisLevel})`);

        let analysisResult;

        switch (type) {
            case 'recipe':
                analysisResult = await analyzeRecipeNutrition(data, session.user.id, analysisLevel, saveResults);
                break;
            case 'inventory_item':
                analysisResult = await analyzeInventoryItemNutrition(data, session.user.id, analysisLevel, saveResults);
                break;
            case 'meal_plan':
                analysisResult = await analyzeMealPlanNutrition(data, session.user.id, analysisLevel);
                break;
            case 'consumption':
                analysisResult = await logNutritionConsumption(data, session.user.id);
                break;
            case 'goals_comparison':
                analysisResult = await compareAgainstGoals(data, session.user.id);
                break;
            default:
                return NextResponse.json({
                    error: 'Invalid analysis type'
                }, { status: 400 });
        }

        return NextResponse.json(analysisResult);
    } catch (error) {
        console.error('Unified nutrition analysis error:', error);
        return NextResponse.json({
            error: 'Nutrition analysis failed',
            details: error.message
        }, { status: 500 });
    }
}

async function analyzeRecipeNutrition(recipeData, userId, analysisLevel, saveResults) {
    try {
        const result = await modalBridge.analyzeNutrition({
            type: 'recipe',
            recipe: recipeData,
            userId: userId,
            analysis_level: analysisLevel
        });

        if (result.success && saveResults && recipeData.recipeId) {
            // Save nutrition data to recipe
            await Recipe.findByIdAndUpdate(recipeData.recipeId, {
                nutrition: result.nutrition,
                nutritionCalculatedAt: new Date(),
                nutritionCoverage: result.coverage || 0.9
            });
        }

        return {
            success: true,
            nutrition: result.nutrition,
            analysis: result.analysis,
            coverage: result.coverage || 0.9,
            method: 'modal_ai_analysis',
            saved: saveResults && recipeData.recipeId
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

async function analyzeInventoryItemNutrition(itemData, userId, analysisLevel, saveResults) {
    try {
        const result = await modalBridge.analyzeNutrition({
            type: 'inventory_item',
            data: itemData,
            userId: userId,
            analysis_level: analysisLevel
        });

        if (result.success && saveResults && itemData.itemId) {
            // Update inventory item
            const userInventory = await UserInventory.findOne({ userId });
            if (userInventory) {
                const itemIndex = userInventory.items.findIndex(item =>
                    item._id.toString() === itemData.itemId
                );

                if (itemIndex !== -1) {
                    userInventory.items[itemIndex].nutrition = result.nutrition;
                    userInventory.items[itemIndex].nutritionLastCalculated = new Date();
                    await userInventory.save();
                }
            }
        }

        return {
            success: true,
            nutrition: result.nutrition,
            confidence: result.confidence || 0.8,
            method: 'modal_ai_analysis',
            saved: saveResults && itemData.itemId
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

async function logNutritionConsumption(consumptionData, userId) {
    try {
        const nutritionLog = new NutritionLog({
            userId: userId,
            itemId: consumptionData.itemId,
            nutrition: consumptionData.nutrition,
            consumedAt: consumptionData.consumedAt || new Date()
        });

        await nutritionLog.save();

        return {
            success: true,
            logId: nutritionLog._id,
            message: 'Nutrition consumption logged successfully'
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

async function compareAgainstGoals(goalsData, userId) {
    try {
        // Get user's nutrition goals and recent logs
        const [user, recentLogs] = await Promise.all([
            User.findById(userId).select('nutritionGoals'),
            NutritionLog.find({
                userId,
                consumedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            })
        ]);

        if (!user?.nutritionGoals) {
            return {
                success: false,
                error: 'No nutrition goals set'
            };
        }

        // Calculate progress against goals
        const progress = calculateGoalProgress(recentLogs, user.nutritionGoals);

        return {
            success: true,
            goals: user.nutritionGoals,
            progress: progress,
            recommendations: generateGoalRecommendations(progress),
            method: 'goals_comparison'
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

function calculateGoalProgress(nutritionLogs, goals) {
    // Calculate daily averages from logs
    const totalNutrition = nutritionLogs.reduce((acc, log) => {
        Object.keys(goals).forEach(nutrient => {
            if (log.nutrition?.[nutrient]?.value) {
                acc[nutrient] = (acc[nutrient] || 0) + log.nutrition[nutrient].value;
            }
        });
        return acc;
    }, {});

    const days = Math.max(1, Math.ceil(nutritionLogs.length / 3)); // Estimate days

    const progress = {};
    Object.keys(goals).forEach(nutrient => {
        const current = (totalNutrition[nutrient] || 0) / days;
        const goal = goals[nutrient];
        const percentage = goal > 0 ? (current / goal) * 100 : 0;

        progress[nutrient] = {
            current: Math.round(current),
            goal: goal,
            percentage: Math.round(percentage),
            status: getGoalStatus(percentage, nutrient)
        };
    });

    return progress;
}

function getGoalStatus(percentage, nutrient) {
    if (nutrient === 'sodium') {
        // For sodium, lower is better
        if (percentage <= 100) return 'excellent';
        if (percentage <= 120) return 'good';
        return 'over';
    } else {
        // For other nutrients, meeting goal is good
        if (percentage >= 90) return 'excellent';
        if (percentage >= 70) return 'good';
        if (percentage >= 50) return 'fair';
        return 'needs_improvement';
    }
}

function generateGoalRecommendations(progress) {
    const recommendations = [];

    Object.entries(progress).forEach(([nutrient, data]) => {
        if (data.status === 'needs_improvement') {
            recommendations.push({
                nutrient,
                type: 'increase',
                message: `Increase ${nutrient} intake - currently at ${data.percentage}% of goal`,
                priority: data.percentage < 50 ? 'high' : 'medium'
            });
        } else if (data.status === 'over' && nutrient === 'sodium') {
            recommendations.push({
                nutrient,
                type: 'decrease',
                message: `Reduce sodium intake - currently at ${data.percentage}% of limit`,
                priority: data.percentage > 150 ? 'high' : 'medium'
            });
        }
    });

    return recommendations;
}