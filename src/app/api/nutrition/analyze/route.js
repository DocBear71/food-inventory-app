// file: /src/app/api/nutrition/analyze/route.js v1

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
// authOptions no longer needed in NextAuth v5
import connectDB from '@/lib/mongodb';
import { createNutritionAnalyzer } from '@/lib/nutritionAnalyzer';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { mealPlanId } = await request.json();

        if (!mealPlanId) {
            return NextResponse.json({
                error: 'Meal plan ID is required'
            }, { status: 400 });
        }

        await connectDB();

        // Create analyzer and analyze meal plan
        const analyzer = createNutritionAnalyzer();
        const analysisResult = await analyzer.analyzeMealPlan(mealPlanId, session.user.id);

        if (!analysisResult.success) {
            return NextResponse.json({
                error: analysisResult.error
            }, { status: 400 });
        }

        // Update meal plan with calculated nutrition
        await analyzer.updateMealPlanNutrition(mealPlanId, analysisResult.analysis.weeklyNutrition);

        console.log('Nutrition analysis completed:', {
            mealPlanId,
            score: analysisResult.analysis.nutritionScore,
            daysWithMeals: analysisResult.analysis.weeklyNutrition.daysWithMeals
        });

        return NextResponse.json({
            success: true,
            analysis: analysisResult.analysis
        });

    } catch (error) {
        console.error('Error analyzing nutrition:', error);
        return NextResponse.json({
            error: 'Failed to analyze nutrition',
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

        // Get existing analysis (this would come from a cache/database in a real implementation)
        const analyzer = createNutritionAnalyzer();
        const analysisResult = await analyzer.analyzeMealPlan(mealPlanId, session.user.id);

        return NextResponse.json({
            success: true,
            analysis: analysisResult.success ? analysisResult.analysis : null
        });

    } catch (error) {
        console.error('Error fetching nutrition analysis:', error);
        return NextResponse.json({
            error: 'Failed to fetch nutrition analysis',
            details: error.message
        }, { status: 500 });
    }
}