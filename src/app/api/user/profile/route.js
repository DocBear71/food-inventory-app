// file: /src/app/api/user/profile/route.js v2 - Added currency preferences support

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

export const GET = withAuth(async (request) => {
    try {
        // Now request.session contains your enhanced session
        const session = request.session;

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        await connectDB();

        const user = await User.findById(session.user.id).select('-password');

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar || '',
                profile: user.profile || {},
                notificationSettings: user.notificationSettings || {},
                mealPlanningPreferences: user.mealPlanningPreferences || {},
                nutritionGoals: user.nutritionGoals || {},
                // Add inventory preferences
                inventoryPreferences: user.inventoryPreferences || {
                    defaultSortBy: 'expiration',
                    defaultFilterStatus: 'all',
                    defaultFilterLocation: 'all',
                    showQuickFilters: true,
                    itemsPerPage: 'all',
                    compactView: false
                },
                // NEW: Add currency preferences
                currencyPreferences: user.currencyPreferences || {
                    currency: 'USD',
                    currencySymbol: '$',
                    currencyPosition: 'before',
                    showCurrencyCode: false,
                    decimalPlaces: 2
                },
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
        });

    } catch (error) {
        console.error('Profile fetch error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
});

export const PUT = withAuth(async(request) => {
    try {
        const session = request.session;

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const {
            name,
            avatar,
            profile,
            notificationSettings,
            mealPlanningPreferences,
            nutritionGoals,
            inventoryPreferences,
            currencyPreferences  // NEW: Add currency preferences
        } = await request.json();

        // Validation
        if (!name || name.trim().length < 1) {
            return NextResponse.json(
                { error: 'Name is required' },
                { status: 400 }
            );
        }

        if (name.length > 100) {
            return NextResponse.json(
                { error: 'Name must be less than 100 characters' },
                { status: 400 }
            );
        }

        // Validate avatar if provided
        if (avatar !== undefined) {
            if (typeof avatar !== 'string') {
                return NextResponse.json(
                    { error: 'Avatar must be a valid URL string' },
                    { status: 400 }
                );
            }

            if (avatar.length > 500) {
                return NextResponse.json(
                    { error: 'Avatar URL must be less than 500 characters' },
                    { status: 400 }
                );
            }
        }

        // Validate profile data if provided
        if (profile) {
            if (profile.bio && profile.bio.length > 200) {
                return NextResponse.json(
                    { error: 'Bio must be less than 200 characters' },
                    { status: 400 }
                );
            }

            if (profile.cookingLevel && !['beginner', 'intermediate', 'advanced'].includes(profile.cookingLevel)) {
                return NextResponse.json(
                    { error: 'Invalid cooking level' },
                    { status: 400 }
                );
            }
        }

        // Validate nutrition goals if provided
        if (nutritionGoals) {
            const numericFields = ['dailyCalories', 'protein', 'fat', 'carbs', 'fiber', 'sodium'];
            for (const field of numericFields) {
                if (nutritionGoals[field] !== undefined && (
                    typeof nutritionGoals[field] !== 'number' ||
                    nutritionGoals[field] < 0 ||
                    nutritionGoals[field] > 10000
                )) {
                    return NextResponse.json(
                        { error: `Invalid ${field} value` },
                        { status: 400 }
                    );
                }
            }
        }

        // Validate inventory preferences if provided
        if (inventoryPreferences) {
            const validSortOptions = ['expiration', 'expiration-date', 'name', 'brand', 'category', 'location', 'quantity', 'date-added'];
            const validStatusOptions = ['all', 'expired', 'expiring', 'fresh'];
            const validLocationOptions = ['all', 'pantry', 'kitchen', 'fridge', 'fridge-freezer', 'deep-freezer', 'garage', 'other'];
            const validItemsPerPage = ['all', '20', '50', '100'];

            if (inventoryPreferences.defaultSortBy && !validSortOptions.includes(inventoryPreferences.defaultSortBy)) {
                return NextResponse.json(
                    { error: 'Invalid sort option' },
                    { status: 400 }
                );
            }

            if (inventoryPreferences.defaultFilterStatus && !validStatusOptions.includes(inventoryPreferences.defaultFilterStatus)) {
                return NextResponse.json(
                    { error: 'Invalid filter status' },
                    { status: 400 }
                );
            }

            if (inventoryPreferences.defaultFilterLocation && !validLocationOptions.includes(inventoryPreferences.defaultFilterLocation)) {
                return NextResponse.json(
                    { error: 'Invalid filter location' },
                    { status: 400 }
                );
            }

            if (inventoryPreferences.itemsPerPage && !validItemsPerPage.includes(inventoryPreferences.itemsPerPage)) {
                return NextResponse.json(
                    { error: 'Invalid items per page' },
                    { status: 400 }
                );
            }

            if (inventoryPreferences.showQuickFilters !== undefined && typeof inventoryPreferences.showQuickFilters !== 'boolean') {
                return NextResponse.json(
                    { error: 'showQuickFilters must be a boolean' },
                    { status: 400 }
                );
            }

            if (inventoryPreferences.compactView !== undefined && typeof inventoryPreferences.compactView !== 'boolean') {
                return NextResponse.json(
                    { error: 'compactView must be a boolean' },
                    { status: 400 }
                );
            }
        }

        // NEW: Validate currency preferences if provided
        if (currencyPreferences) {
            const validCurrencies = [
                'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK',
                'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'NZD', 'ZAR', 'BRL', 'MXN',
                'ARS', 'CLP', 'COP', 'PEN', 'INR', 'CNY', 'KRW', 'SGD', 'HKD', 'TWD',
                'THB', 'PHP', 'MYR', 'IDR', 'VND', 'RUB', 'TRY', 'ILS', 'AED', 'SAR', 'EGP'
            ];

            if (currencyPreferences.currency && !validCurrencies.includes(currencyPreferences.currency)) {
                return NextResponse.json(
                    { error: 'Invalid currency code' },
                    { status: 400 }
                );
            }

            if (currencyPreferences.currencySymbol !== undefined) {
                if (typeof currencyPreferences.currencySymbol !== 'string' || currencyPreferences.currencySymbol.length > 5) {
                    return NextResponse.json(
                        { error: 'Currency symbol must be a string with max 5 characters' },
                        { status: 400 }
                    );
                }
            }

            if (currencyPreferences.currencyPosition && !['before', 'after'].includes(currencyPreferences.currencyPosition)) {
                return NextResponse.json(
                    { error: 'Currency position must be "before" or "after"' },
                    { status: 400 }
                );
            }

            if (currencyPreferences.showCurrencyCode !== undefined && typeof currencyPreferences.showCurrencyCode !== 'boolean') {
                return NextResponse.json(
                    { error: 'showCurrencyCode must be a boolean' },
                    { status: 400 }
                );
            }

            if (currencyPreferences.decimalPlaces !== undefined) {
                const decimals = parseInt(currencyPreferences.decimalPlaces);
                if (isNaN(decimals) || decimals < 0 || decimals > 3) {
                    return NextResponse.json(
                        { error: 'Decimal places must be a number between 0 and 3' },
                        { status: 400 }
                    );
                }
            }
        }

        await connectDB();

        const updateData = {
            name: name.trim(),
            updatedAt: new Date()
        };

        // Add avatar if provided
        if (avatar !== undefined) {
            updateData.avatar = avatar;
        }

        // Add optional fields if provided
        if (profile) {
            updateData.profile = profile;
        }

        if (notificationSettings) {
            updateData.notificationSettings = notificationSettings;
        }

        if (mealPlanningPreferences) {
            updateData.mealPlanningPreferences = mealPlanningPreferences;
        }

        if (nutritionGoals) {
            updateData.nutritionGoals = nutritionGoals;
        }

        if (inventoryPreferences) {
            updateData.inventoryPreferences = inventoryPreferences;
        }

        // NEW: Add currency preferences
        if (currencyPreferences) {
            updateData.currencyPreferences = currencyPreferences;
        }

        const updatedUser = await User.findByIdAndUpdate(
            session.user.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                avatar: updatedUser.avatar || '',
                profile: updatedUser.profile || {},
                notificationSettings: updatedUser.notificationSettings || {},
                mealPlanningPreferences: updatedUser.mealPlanningPreferences || {},
                nutritionGoals: updatedUser.nutritionGoals || {},
                inventoryPreferences: updatedUser.inventoryPreferences || {
                    defaultSortBy: 'expiration',
                    defaultFilterStatus: 'all',
                    defaultFilterLocation: 'all',
                    showQuickFilters: true,
                    itemsPerPage: 'all',
                    compactView: false
                },
                // NEW: Return currency preferences
                currencyPreferences: updatedUser.currencyPreferences || {
                    currency: 'USD',
                    currencySymbol: '$',
                    currencyPosition: 'before',
                    showCurrencyCode: false,
                    decimalPlaces: 2
                },
                updatedAt: updatedUser.updatedAt
            }
        });

    } catch (error) {
        console.error('Profile update error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
});