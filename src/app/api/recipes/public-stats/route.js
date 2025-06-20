// file: /src/app/api/recipes/public-stats/route.js v1 - Get user's public recipe statistics

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Recipe, User } from '@/lib/models';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        await connectDB();

        // Get user subscription info
        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const tier = user.getEffectiveTier();

        // Count current public recipes
        const currentPublicCount = await Recipe.countDocuments({
            createdBy: session.user.id,
            isPublic: true
        });

        // Determine limits based on tier
        let limit;
        switch (tier) {
            case 'free':
                limit = 0;
                break;
            case 'gold':
                limit = 25;
                break;
            case 'platinum':
                limit = -1; // Unlimited
                break;
            default:
                limit = 0;
        }

        // Get total recipe count for additional context
        const totalRecipes = await Recipe.countDocuments({
            createdBy: session.user.id
        });

        return NextResponse.json({
            success: true,
            stats: {
                current: currentPublicCount,
                limit: limit,
                tier: tier,
                totalRecipes: totalRecipes,
                canMakePublic: tier !== 'free' && (limit === -1 || currentPublicCount < limit),
                remaining: limit === -1 ? 'unlimited' : Math.max(0, limit - currentPublicCount)
            }
        });

    } catch (error) {
        console.error('Error fetching public recipe stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch public recipe statistics' },
            { status: 500 }
        );
    }
}