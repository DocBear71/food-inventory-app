// file: /src/app/api/user/preferences/route.js - Enhanced version

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

// GET - Fetch user preferences (ENHANCED)
export async function GET(request) {
    try {
        const session = await auth();

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
            // Existing meal planning preferences
            weekStartDay: user.mealPlanningPreferences?.weekStartDay || 'monday',
            defaultMealTypes: user.mealPlanningPreferences?.defaultMealTypes || ['breakfast', 'lunch', 'dinner'],
            planningHorizon: user.mealPlanningPreferences?.planningHorizon || 'week',
            shoppingDay: user.mealPlanningPreferences?.shoppingDay || 'sunday',
            mealPrepDays: user.mealPlanningPreferences?.mealPrepDays || ['sunday'],
            dietaryRestrictions: user.mealPlanningPreferences?.dietaryRestrictions || [],
            avoidIngredients: user.mealPlanningPreferences?.avoidIngredients || [],
            preferredCuisines: user.mealPlanningPreferences?.preferredCuisines || [],
            cookingTimePreference: user.mealPlanningPreferences?.cookingTimePreference || 'any',

            // Existing PWA preference
            disablePWABanner: user.disablePWABanner || false,

            // NEW: Inventory preferences
            inventoryPreferences: {
                defaultSortBy: user.inventoryPreferences?.defaultSortBy || 'expiration',
                defaultFilterStatus: user.inventoryPreferences?.defaultFilterStatus || 'all',
                defaultFilterLocation: user.inventoryPreferences?.defaultFilterLocation || 'all',
                showQuickFilters: user.inventoryPreferences?.showQuickFilters ?? true,
                itemsPerPage: user.inventoryPreferences?.itemsPerPage || 'all',
                compactView: user.inventoryPreferences?.compactView ?? false
            }
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

// PUT - Update user preferences (ENHANCED)
export async function PUT(request) {
    try {
        const session = await auth();

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

        // Initialize nested objects if they don't exist
        if (!user.mealPlanningPreferences) {
            user.mealPlanningPreferences = {};
        }
        if (!user.inventoryPreferences) {
            user.inventoryPreferences = {};
        }

        // Handle PWA banner preference (existing)
        if (body.disablePWABanner !== undefined) {
            user.disablePWABanner = body.disablePWABanner;
        }

        // Handle meal planning preferences (existing)
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

        // NEW: Handle inventory preferences
        if (body.inventoryPreferences) {
            const inventoryFields = [
                'defaultSortBy', 'defaultFilterStatus', 'defaultFilterLocation',
                'showQuickFilters', 'itemsPerPage', 'compactView'
            ];

            // Validate enum values for inventory preferences
            const validSortOptions = ['expiration', 'expiration-date', 'name', 'brand', 'category', 'location', 'quantity', 'date-added'];
            const validStatusOptions = ['all', 'expired', 'expiring', 'fresh'];
            const validLocationOptions = ['all', 'pantry', 'kitchen', 'fridge', 'fridge-freezer', 'deep-freezer', 'garage', 'other'];
            const validItemsPerPage = ['all', '20', '50', '100'];

            if (body.inventoryPreferences.defaultSortBy && !validSortOptions.includes(body.inventoryPreferences.defaultSortBy)) {
                return NextResponse.json({ error: 'Invalid sort option' }, { status: 400 });
            }

            if (body.inventoryPreferences.defaultFilterStatus && !validStatusOptions.includes(body.inventoryPreferences.defaultFilterStatus)) {
                return NextResponse.json({ error: 'Invalid filter status' }, { status: 400 });
            }

            if (body.inventoryPreferences.defaultFilterLocation && !validLocationOptions.includes(body.inventoryPreferences.defaultFilterLocation)) {
                return NextResponse.json({ error: 'Invalid filter location' }, { status: 400 });
            }

            if (body.inventoryPreferences.itemsPerPage && !validItemsPerPage.includes(body.inventoryPreferences.itemsPerPage)) {
                return NextResponse.json({ error: 'Invalid items per page' }, { status: 400 });
            }

            inventoryFields.forEach(key => {
                if (body.inventoryPreferences[key] !== undefined) {
                    user.inventoryPreferences[key] = body.inventoryPreferences[key];
                }
            });
        }

        user.updatedAt = new Date();
        await user.save();

        console.log('User preferences updated successfully');

        return NextResponse.json({
            success: true,
            preferences: {
                ...user.mealPlanningPreferences,
                disablePWABanner: user.disablePWABanner,
                inventoryPreferences: user.inventoryPreferences
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

// PATCH - Update specific preference (ENHANCED for inventory)
export async function PATCH(request) {
    try {
        const session = await auth();

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

        // Handle PWA banner preference (existing)
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

        // NEW: Handle single inventory preference updates
        if (body.inventoryPreference) {
            if (!user.inventoryPreferences) {
                user.inventoryPreferences = {};
            }

            const { key, value } = body.inventoryPreference;

            // Validate the key and value
            const validKeys = ['defaultSortBy', 'defaultFilterStatus', 'defaultFilterLocation', 'showQuickFilters', 'itemsPerPage', 'compactView'];

            if (!validKeys.includes(key)) {
                return NextResponse.json({ error: 'Invalid inventory preference key' }, { status: 400 });
            }

            user.inventoryPreferences[key] = value;
            user.updatedAt = new Date();
            await user.save();

            console.log('Inventory preference updated:', key, '=', value);

            return NextResponse.json({
                success: true,
                inventoryPreferences: user.inventoryPreferences,
                message: 'Inventory preference updated successfully'
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