// file: /src/app/api/nutrition/consumption/route.js v1 - Log nutrition consumption

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { NutritionLog } from '@/models/NutritionLog';

export async function POST(request) {
    try {
        await connectDB();

        const { itemId, nutrition, consumedAt } = await request.json();

        if (!itemId || !nutrition) {
            return NextResponse.json({
                success: false,
                error: 'Item ID and nutrition data are required'
            }, { status: 400 });
        }

        const nutritionLog = new NutritionLog({
            itemId,
            nutrition,
            consumedAt: consumedAt || new Date(),
            userId: request.headers.get('user-id') // Add authentication
        });

        await nutritionLog.save();

        return NextResponse.json({
            success: true,
            logId: nutritionLog._id
        });

    } catch (error) {
        console.error('Nutrition logging error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to log nutrition consumption'
        }, { status: 500 });
    }
}