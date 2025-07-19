// file: /src/app/api/recipes/[id]/view/route.js v3 - Enhanced view tracking with user data and rate limiting

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import connectDB from '@/lib/mongodb';
import { Recipe } from '@/lib/models';

// POST - Track a recipe view with enhanced analytics
export async function POST(request, { params }) {
    try {
        const session = await auth();
        const { id: recipeId } = await params;

        if (!recipeId) {
            return NextResponse.json(
                { error: 'Recipe ID is required' },
                { status: 400 }
            );
        }

        await connectDB();

        // Get user IP for basic rate limiting (prevent spam views)
        const forwardedFor = request.headers.get('x-forwarded-for');
        const userIP = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';

        // Check if recipe exists and user can view it
        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return NextResponse.json(
                { error: 'Recipe not found' },
                { status: 404 }
            );
        }

        // Check if user can view this recipe (public or owner)
        if (!recipe.isPublic && (!session?.user?.id || recipe.createdBy.toString() !== session.user.id)) {
            return NextResponse.json(
                { error: 'Not authorized to view this recipe' },
                { status: 403 }
            );
        }

        // Simple rate limiting: don't count multiple views from same IP within 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentView = recipe.metrics?.recentViews?.find(view =>
            view.ip === userIP && view.timestamp > fiveMinutesAgo
        );

        if (!recentView) {
            // Prepare update data
            const updateData = {
                $inc: { 'metrics.viewCount': 1 },
                $set: {
                    'metrics.lastViewed': new Date(),
                    'metrics.lastViewedBy': session?.user?.id || null
                },
                $push: {
                    'metrics.recentViews': {
                        $each: [{
                            timestamp: new Date(),
                            userId: session?.user?.id || null,
                            ip: userIP,
                            userAgent: request.headers.get('user-agent') || 'unknown'
                        }],
                        $slice: -100 // Keep only last 100 views to prevent infinite growth
                    }
                }
            };

            // If user is logged in, track unique user views
            if (session?.user?.id) {
                updateData.$addToSet = {
                    'metrics.uniqueViewers': session.user.id
                };
            }

            // Update the recipe with view tracking
            const updatedRecipe = await Recipe.findByIdAndUpdate(
                recipeId,
                updateData,
                { new: true, upsert: false }
            );

            return NextResponse.json({
                success: true,
                viewCount: updatedRecipe.metrics.viewCount,
                uniqueViewers: updatedRecipe.metrics.uniqueViewers?.length || 0,
                message: 'View tracked successfully'
            });
        } else {
            // Return current stats without incrementing
            return NextResponse.json({
                success: true,
                viewCount: recipe.metrics.viewCount || 0,
                uniqueViewers: recipe.metrics.uniqueViewers?.length || 0,
                message: 'Recent view detected, not counted'
            });
        }

    } catch (error) {
        console.error('POST recipe view error:', error);
        return NextResponse.json(
            {
                error: 'Failed to track view',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500 }
        );
    }
}