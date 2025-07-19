// file: /src/app/api/meal-prep/generate/route.js v1

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import connectDB from '@/lib/mongodb';
import { createMealPrepAnalyzer, saveMealPrepSuggestions, getMealPrepSuggestions } from '@/lib/mealPrepAnalyzer';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { mealPlanId, userPreferences, regenerate } = await request.json();

        if (!mealPlanId) {
            return NextResponse.json({
                error: 'Meal plan ID is required'
            }, { status: 400 });
        }

        await connectDB();

        // Check if suggestions already exist (unless regenerating)
        if (!regenerate) {
            const existingSuggestions = await getMealPrepSuggestions(session.user.id, mealPlanId);
            if (existingSuggestions) {
                return NextResponse.json({
                    success: true,
                    suggestions: existingSuggestions,
                    isExisting: true
                });
            }
        }

        // Create analyzer and generate suggestions
        const analyzer = createMealPrepAnalyzer();
        const analysisResult = await analyzer.analyzeMealPlan(mealPlanId, userPreferences);

        // Save suggestions to database
        const savedSuggestions = await saveMealPrepSuggestions(
            session.user.id,
            analysisResult,
            userPreferences
        );

        console.log('Meal prep suggestions generated:', {
            mealPlanId,
            batchSuggestions: analysisResult.batchCookingSuggestions.length,
            prepSuggestions: analysisResult.ingredientPrepSuggestions.length,
            totalPrepTime: analysisResult.metrics.totalPrepTime,
            timeSaved: analysisResult.metrics.timeSaved
        });

        return NextResponse.json({
            success: true,
            suggestions: savedSuggestions,
            summary: {
                batchCookingOpportunities: analysisResult.batchCookingSuggestions.length,
                ingredientPrepTasks: analysisResult.ingredientPrepSuggestions.length,
                totalPrepTime: analysisResult.metrics.totalPrepTime,
                estimatedTimeSaved: analysisResult.metrics.timeSaved,
                recipesAffected: analysisResult.metrics.recipesAffected,
                efficiency: analysisResult.metrics.efficiency
            }
        });

    } catch (error) {
        console.error('Error generating meal prep suggestions:', error);
        return NextResponse.json({
            error: 'Failed to generate meal prep suggestions',
            details: error.message
        }, { status: 500 });
    }
}

export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const mealPlanId = searchParams.get('mealPlanId');

        if (!mealPlanId) {
            return NextResponse.json({
                error: 'Meal plan ID is required'
            }, { status: 400 });
        }

        await connectDB();

        const suggestions = await getMealPrepSuggestions(session.user.id, mealPlanId);

        if (!suggestions) {
            return NextResponse.json({
                success: false,
                message: 'No meal prep suggestions found for this meal plan'
            });
        }

        return NextResponse.json({
            success: true,
            suggestions
        });

    } catch (error) {
        console.error('Error fetching meal prep suggestions:', error);
        return NextResponse.json({
            error: 'Failed to fetch meal prep suggestions',
            details: error.message
        }, { status: 500 });
    }
}