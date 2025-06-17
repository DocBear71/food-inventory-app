// file: /src/app/api/user/preferences/route.js - v2 - Added PWA banner preference

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

// GET - Fetch user preferences
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Return user preferences (with defaults if not set)
        const preferences = {
            // Meal planning preferences
            weekStartDay: user.mealPlanningPreferences?.weekStartDay || 'monday',
            defaultMealTypes: user.mealPlanningPreferences?.defaultMealTypes || ['breakfast', 'lunch', 'dinner'],
            planningHorizon: user.mealPlanningPreferences?.planningHorizon || 'week',
            shoppingDay: user.mealPlanningPreferences?.shoppingDay || 'sunday',
            mealPrepDays: user.mealPlanningPreferences?.mealPrepDays || ['sunday'],
            dietaryRestrictions: user.mealPlanningPreferences?.dietaryRestrictions || [],
            avoidIngredients: user.mealPlanningPreferences?.avoidIngredients || [],
            preferredCuisines: user.mealPlanningPreferences?.preferredCuisines || [],
            cookingTimePreference: user.mealPlanningPreferences?.cookingTimePreference || 'any',

            // PWA preferences
            disablePWABanner: user.disablePWABanner || false
        };

        return NextResponse.json({
            success: true,
            preferences
        });

    } catch (error) {
        console.error('GET user preferences error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch user preferences' },
            { status: 500 }
        );
    }
}

// PUT - Update user preferences
export async function PUT(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        console.log('Updating user preferences:', body);

        await connectDB();

        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Initialize mealPlanningPreferences if it doesn't exist
        if (!user.mealPlanningPreferences) {
            user.mealPlanningPreferences = {};
        }

        // Handle PWA banner preference (top-level field)
        if (body.disablePWABanner !== undefined) {
            user.disablePWABanner = body.disablePWABanner;
        }

        // Handle meal planning preferences (nested object)
        const mealPlanningFields = [
            'weekStartDay', 'defaultMealTypes', 'planningHorizon', 'shoppingDay',
            'mealPrepDays', 'dietaryRestrictions', 'avoidIngredients',
            'preferredCuisines', 'cookingTimePreference'
        ];

        mealPlanningFields.forEach(key => {
            if (body[key] !== undefined) {
                user.mealPlanningPreferences[key] = body[key];
            }
        });

        user.updatedAt = new Date();
        await user.save();

        console.log('User preferences updated successfully');

        return NextResponse.json({
            success: true,
            preferences: {
                ...user.mealPlanningPreferences,
                disablePWABanner: user.disablePWABanner
            },
            message: 'Preferences updated successfully'
        });

    } catch (error) {
        console.error('PUT user preferences error:', error);
        return NextResponse.json(
            { error: 'Failed to update user preferences' },
            { status: 500 }
        );
    }
}

// PATCH - Update specific preference (for PWA banner)
export async function PATCH(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        console.log('Patching user preference:', body);

        await connectDB();

        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Handle PWA banner preference
        if (body.disablePWABanner !== undefined) {
            user.disablePWABanner = body.disablePWABanner;
            user.updatedAt = new Date();
            await user.save();

            console.log('PWA banner preference updated:', body.disablePWABanner);

            return NextResponse.json({
                success: true,
                disablePWABanner: user.disablePWABanner,
                message: 'PWA banner preference updated successfully'
            });
        }

        return NextResponse.json(
            { error: 'No valid preference provided' },
            { status: 400 }
        );

    } catch (error) {
        console.error('PATCH user preferences error:', error);
        return NextResponse.json(
            { error: 'Failed to update user preference' },
            { status: 500 }
        );
    }
}