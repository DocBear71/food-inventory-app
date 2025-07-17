// file: /src/app/api/user/currency/route.js v1

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

// GET - Fetch user's currency preferences
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

        const preferences = user.currencyPreferences || {
            currency: 'USD',
            currencySymbol: '$',
            currencyPosition: 'before',
            showCurrencyCode: false,
            decimalPlaces: 2
        };

        return NextResponse.json({
            success: true,
            preferences
        });

    } catch (error) {
        console.error('Error fetching currency preferences:', error);
        return NextResponse.json(
            { error: 'Failed to fetch currency preferences' },
            { status: 500 }
        );
    }
}

// PUT - Update user's currency preferences
export async function PUT(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { preferences } = body;

        // Validate preferences
        if (!preferences || typeof preferences !== 'object') {
            return NextResponse.json({ error: 'Valid preferences object required' }, { status: 400 });
        }

        const validCurrencies = [
            'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK',
            'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'NZD', 'ZAR', 'BRL', 'MXN',
            'ARS', 'CLP', 'COP', 'PEN', 'INR', 'CNY', 'KRW', 'SGD', 'HKD', 'TWD',
            'THB', 'PHP', 'MYR', 'IDR', 'VND', 'RUB', 'TRY', 'ILS', 'AED', 'SAR', 'EGP'
        ];

        if (preferences.currency && !validCurrencies.includes(preferences.currency)) {
            return NextResponse.json({ error: 'Invalid currency code' }, { status: 400 });
        }

        await connectDB();
        const user = await User.findById(session.user.id);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Update currency preferences
        user.currencyPreferences = {
            currency: preferences.currency || 'USD',
            currencySymbol: preferences.currencySymbol || '$',
            currencyPosition: ['before', 'after'].includes(preferences.currencyPosition) ?
                preferences.currencyPosition : 'before',
            showCurrencyCode: Boolean(preferences.showCurrencyCode),
            decimalPlaces: Math.min(Math.max(parseInt(preferences.decimalPlaces) || 2, 0), 3)
        };

        await user.save();

        return NextResponse.json({
            success: true,
            preferences: user.currencyPreferences,
            message: 'Currency preferences updated successfully'
        });

    } catch (error) {
        console.error('Error updating currency preferences:', error);
        return NextResponse.json(
            { error: 'Failed to update currency preferences' },
            { status: 500 }
        );
    }
}