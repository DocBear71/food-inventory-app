// file: /src/app/api/price-tracking/enable/route.js v1 - Enable price tracking features

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User, UserInventory } from '@/lib/models';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const {
            enablePriceTracking = true,
            enableBudgetFeatures = true,
            enableDealAlerts = true,
            enableSmartSuggestions = true,
            weeklyBudget = 100,
            preferredStores = [],
            notificationPreferences = {
                dealAlerts: true,
                budgetWarnings: true,
                priceDrops: true,
                weeklyReports: true
            }
        } = await request.json();

        await connectDB();

        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Initialize or update user preferences
        if (!user.preferences) {
            user.preferences = {};
        }

        // Update price intelligence preferences
        user.preferences.priceIntelligence = {
            enabled: enablePriceTracking,
            budgetFeatures: enableBudgetFeatures,
            dealAlerts: enableDealAlerts,
            smartSuggestions: enableSmartSuggestions,
            showInsights: true,
            enabledAt: new Date(),
            onboardingCompleted: false
        };

        // Set up initial budget if budget features are enabled
        if (enableBudgetFeatures) {
            user.budget = {
                weeklyMealBudget: parseFloat(weeklyBudget),
                monthlyGroceryBudget: parseFloat(weeklyBudget) * 4.33, // Approximate monthly
                strictMode: false,
                notifications: {
                    weeklyWarning: notificationPreferences.budgetWarnings,
                    overspendAlert: notificationPreferences.budgetWarnings,
                    savingsOpportunities: notificationPreferences.dealAlerts
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };
        }

        // Set up notification preferences
        if (!user.notificationSettings) {
            user.notificationSettings = {};
        }

        user.notificationSettings.priceTracking = {
            dealAlerts: notificationPreferences.dealAlerts,
            budgetWarnings: notificationPreferences.budgetWarnings,
            priceDrops: notificationPreferences.priceDrops,
            weeklyReports: notificationPreferences.weeklyReports,
            frequency: 'daily',
            minSavingsThreshold: 0.20 // 20% minimum savings to alert
        };

        // Set preferred stores
        if (preferredStores && preferredStores.length > 0) {
            user.preferences.preferredStores = preferredStores;
        }

        await user.save();

        // Initialize inventory for price tracking if it doesn't exist
        let inventory = await UserInventory.findOne({ userId: session.user.id });

        if (!inventory) {
            inventory = new UserInventory({
                userId: session.user.id,
                items: [],
                createdAt: new Date(),
                updatedAt: new Date()
            });
            await inventory.save();
        }

        // Add price tracking metadata to existing inventory items
        if (enablePriceTracking && inventory.items.length > 0) {
            let itemsUpdated = false;

            inventory.items.forEach(item => {
                if (!item.priceTracking) {
                    item.priceTracking = {
                        enabled: true,
                        alertsEnabled: enableDealAlerts,
                        targetSavings: 0.20, // 20% savings target
                        enabledAt: new Date()
                    };
                    itemsUpdated = true;
                }
            });

            if (itemsUpdated) {
                await inventory.save();
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Price tracking enabled successfully',
            features: {
                priceTracking: enablePriceTracking,
                budgetFeatures: enableBudgetFeatures,
                dealAlerts: enableDealAlerts,
                smartSuggestions: enableSmartSuggestions
            },
            nextSteps: [
                'Complete the price tracking onboarding',
                'Add your frequently purchased items to inventory',
                'Set up price alerts for key ingredients',
                'Connect your preferred stores for better deals'
            ],
            onboardingRequired: true
        });

    } catch (error) {
        console.error('Error enabling price tracking:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

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

        const priceIntelligence = user.preferences?.priceIntelligence || {
            enabled: false,
            budgetFeatures: false,
            dealAlerts: false,
            smartSuggestions: false,
            showInsights: false,
            onboardingCompleted: false
        };

        const notificationSettings = user.notificationSettings?.priceTracking || {
            dealAlerts: true,
            budgetWarnings: true,
            priceDrops: true,
            weeklyReports: true,
            frequency: 'daily',
            minSavingsThreshold: 0.20
        };

        return NextResponse.json({
            success: true,
            priceIntelligence,
            notificationSettings,
            budget: user.budget || null,
            preferredStores: user.preferences?.preferredStores || [],
            isEnabled: priceIntelligence.enabled,
            onboardingRequired: !priceIntelligence.onboardingCompleted
        });

    } catch (error) {
        console.error('Error fetching price tracking status:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const updateData = await request.json();

        await connectDB();

        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Initialize preferences if they don't exist
        if (!user.preferences) {
            user.preferences = {};
        }

        if (!user.preferences.priceIntelligence) {
            user.preferences.priceIntelligence = {
                enabled: false,
                budgetFeatures: false,
                dealAlerts: false,
                smartSuggestions: false,
                showInsights: false,
                onboardingCompleted: false
            };
        }

        // Update price intelligence settings
        Object.keys(updateData).forEach(key => {
            if (key in user.preferences.priceIntelligence) {
                user.preferences.priceIntelligence[key] = updateData[key];
            }
        });

        user.preferences.priceIntelligence.updatedAt = new Date();

        await user.save();

        return NextResponse.json({
            success: true,
            message: 'Price tracking settings updated successfully',
            priceIntelligence: user.preferences.priceIntelligence
        });

    } catch (error) {
        console.error('Error updating price tracking settings:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// Disable price tracking
export async function DELETE(request) {
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

        // Disable price tracking but keep historical data
        if (user.preferences?.priceIntelligence) {
            user.preferences.priceIntelligence.enabled = false;
            user.preferences.priceIntelligence.budgetFeatures = false;
            user.preferences.priceIntelligence.dealAlerts = false;
            user.preferences.priceIntelligence.smartSuggestions = false;
            user.preferences.priceIntelligence.showInsights = false;
            user.preferences.priceIntelligence.disabledAt = new Date();
        }

        // Disable notifications
        if (user.notificationSettings?.priceTracking) {
            user.notificationSettings.priceTracking.dealAlerts = false;
            user.notificationSettings.priceTracking.budgetWarnings = false;
            user.notificationSettings.priceTracking.priceDrops = false;
            user.notificationSettings.priceTracking.weeklyReports = false;
        }

        await user.save();

        return NextResponse.json({
            success: true,
            message: 'Price tracking disabled successfully',
            note: 'Historical price data has been preserved and can be re-enabled at any time'
        });

    } catch (error) {
        console.error('Error disabling price tracking:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}