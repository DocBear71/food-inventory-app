// file: /src/app/api/nutrition/route.js v1

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import { NutritionService } from '@/lib/services/nutritionService';

// GET - Search for nutrition information
export async function GET(request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query');
        const fdcId = searchParams.get('fdcId');
        const limit = parseInt(searchParams.get('limit')) || 10;

        if (fdcId) {
            // Get detailed nutrition for specific food item
            const result = await NutritionService.getFoodDetails(fdcId);
            return NextResponse.json(result);
        } else if (query) {
            // Search for foods
            const result = await NutritionService.searchFoods(query, limit);
            return NextResponse.json(result);
        } else {
            return NextResponse.json(
                { error: 'Query or fdcId parameter is required' },
                { status: 400 }
            );
        }

    } catch (error) {
        console.error('Nutrition API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch nutrition data' },
            { status: 500 }
        );
    }
}