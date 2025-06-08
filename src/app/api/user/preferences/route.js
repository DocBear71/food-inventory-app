// file: /src/app/api/user/preferences/route.js - v1

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
            weekStartDay: user.mealPlanningPreferences?.weekStartDay || 'monday',
            defaultMealTypes: user.mealPlanningPreferences?.defaultMealTypes || ['breakfast', 'lunch', 'dinner'],
            planningHorizon: user.mealPlanningPreferences?.planningHorizon || 'week',
            shoppingDay: user.mealPlanningPreferences?.shoppingDay || 'sunday',
            mealPrepDays: user.mealPlanningPreferences?.mealPrepDays || ['sunday'],
            dietaryRestrictions: user.mealPlanningPreferences?.dietaryRestrictions || [],
            avoidIngredients: user.mealPlanningPreferences?.avoidIngredients || [],
            preferredCuisines: user.mealPlanningPreferences?.preferredCuisines || [],
            cookingTimePreference: user.mealPlanningPreferences?.cookingTimePreference || 'any'
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

        // Update only the provided preferences
        Object.keys(body).forEach(key => {
            if (body[key] !== undefined) {
                user.mealPlanningPreferences[key] = body[key];
            }
        });

        user.updatedAt = new Date();
        await user.save();

        console.log('User preferences updated successfully');

        return NextResponse.json({
            success: true,
            preferences: user.mealPlanningPreferences,
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