// file: /src/app/api/recipes/[id]/view/route.js v2

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Recipe } from '@/lib/models';

// POST - Track a recipe view
export async function POST(request, { params }) {
    try {
        const { id: recipeId } = await params;

        if (!recipeId) {
            return NextResponse.json(
                { error: 'Recipe ID is required' },
                { status: 400 }
            );
        }

        await connectDB();

        // Increment view count and update last viewed date
        const recipe = await Recipe.findByIdAndUpdate(
            recipeId,
            {
                $inc: { 'metrics.viewCount': 1 },
                $set: { 'metrics.lastViewed': new Date() }
            },
            { new: true }
        );

        if (!recipe) {
            return NextResponse.json(
                { error: 'Recipe not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            viewCount: recipe.metrics.viewCount
        });

    } catch (error) {
        console.error('POST recipe view error:', error);
        return NextResponse.json(
            { error: 'Failed to track view' },
            { status: 500 }
        );
    }
}