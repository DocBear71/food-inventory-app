// file: /src/app/api/price-tracking/complete-onboarding/route.js v1 - Complete price tracking onboarding

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User, UserInventory, Store } from '@/lib/models';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const {
            completedSteps = [],
            preferredStores = [],
            budgetSettings = {},
            initialItems = [],
            notificationPreferences = {},
            onboardingData = {}
        } = await request.json();

        // Validate required steps
        const requiredSteps = ['budget_setup', 'store_selection', 'notification_preferences'];
        const missingSteps = requiredSteps.filter(step => !completedSteps.includes(step));

        if (missingSteps.length > 0) {
            return NextResponse.json({
                error: 'Onboarding incomplete',
                missingSteps,
                message: 'Please complete all required onboarding steps'
            }, { status: 400 });
        }

        await connectDB();

        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Initialize preferences if they don't exist
        if (!user.preferences) {
            user.preferences = {};
        }

        // Complete price intelligence onboarding
        if (!user.preferences.priceIntelligence) {
            user.preferences.priceIntelligence = {
                enabled: true,
                budgetFeatures: true,
                dealAlerts: true,
                smartSuggestions: true,
                showInsights: true
            };
        }

        user.preferences.priceIntelligence.onboardingCompleted = true;
        user.preferences.priceIntelligence.onboardingCompletedAt = new Date();
        user.preferences.priceIntelligence.onboardingVersion = '1.0';

        // Set preferred stores
        if (preferredStores.length > 0) {
            user.preferences.preferredStores = preferredStores;

            // Validate that stores exist
            const validStores = await Store.find({
                _id: { $in: preferredStores },
                isActive: true
            });

            if (validStores.length !== preferredStores.length) {
                console.warn('Some preferred stores were not found or are inactive');
            }
        }

        // Update budget settings
        if (Object.keys(budgetSettings).length > 0) {
            user.budget = {
                ...user.budget,
                ...budgetSettings,
                updatedAt: new Date()
            };

            // Ensure required budget fields
            if (!user.budget.createdAt) {
                user.budget.createdAt = new Date();
            }
        }

        // Update notification preferences
        if (Object.keys(notificationPreferences).length > 0) {
            if (!user.notificationSettings) {
                user.notificationSettings = {};
            }

            user.notificationSettings.priceTracking = {
                ...user.notificationSettings.priceTracking,
                ...notificationPreferences,
                updatedAt: new Date()
            };
        }

        // Store onboarding metadata
        user.onboarding = {
            ...user.onboarding,
            priceTracking: {
                completed: true,
                completedAt: new Date(),
                completedSteps,
                version: '1.0',
                data: onboardingData
            }
        };

        await user.save();

        // Set up initial inventory items if provided
        if (initialItems.length > 0) {
            let inventory = await UserInventory.findOne({ userId: session.user.id });

            if (!inventory) {
                inventory = new UserInventory({
                    userId: session.user.id,
                    items: [],
                    createdAt: new Date()
                });
            }

            // Add initial items with price tracking enabled
            const newItems = initialItems.map(item => ({
                name: item.name,
                category: item.category || 'General',
                quantity: item.quantity || 1,
                unit: item.unit || 'item',
                priceTracking: {
                    enabled: true,
                    alertsEnabled: true,
                    targetSavings: 0.20,
                    enabledAt: new Date()
                },
                priceAlerts: {
                    enabled: true,
                    targetPrice: item.targetPrice || null,
                    alertWhenBelow: true,
                    createdAt: new Date()
                },
                addedDate: new Date(),
                source: 'onboarding'
            }));

            inventory.items.push(...newItems);
            inventory.updatedAt = new Date();
            await inventory.save();
        }

        // Generate welcome insights and recommendations
        const welcomeInsights = await generateWelcomeInsights(user, preferredStores);

        return NextResponse.json({
            success: true,
            message: 'Price tracking onboarding completed successfully!',
            onboarding: {
                completed: true,
                completedAt: new Date(),
                features: {
                    priceTracking: true,
                    budgetFeatures: true,
                    dealAlerts: true,
                    smartSuggestions: true
                }
            },
            welcomeInsights,
            nextSteps: [
                'Start adding frequently purchased items to your inventory',
                'Check out current deals and price alerts',
                'Set up your first smart meal plan with budget optimization',
                'Explore price trends and savings opportunities'
            ],
            achievements: [
                {
                    title: 'Price Intelligence Expert',
                    description: 'Completed price tracking onboarding',
                    icon: '💰',
                    unlockedAt: new Date()
                },
                {
                    title: 'Budget Master',
                    description: 'Set up budget tracking',
                    icon: '📊',
                    unlockedAt: new Date()
                },
                {
                    title: 'Deal Hunter',
                    description: 'Enabled deal alerts',
                    icon: '🎯',
                    unlockedAt: new Date()
                }
            ]
        });

    } catch (error) {
        console.error('Error completing price tracking onboarding:', error);
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

        const onboardingStatus = {
            completed: user.preferences?.priceIntelligence?.onboardingCompleted || false,
            completedAt: user.onboarding?.priceTracking?.completedAt || null,
            version: user.onboarding?.priceTracking?.version || null,
            steps: {
                budget_setup: !!user.budget?.weeklyMealBudget,
                store_selection: !!(user.preferences?.preferredStores?.length > 0),
                notification_preferences: !!user.notificationSettings?.priceTracking,
                features_enabled: user.preferences?.priceIntelligence?.enabled || false
            }
        };

        // Calculate completion percentage
        const totalSteps = Object.keys(onboardingStatus.steps).length;
        const completedSteps = Object.values(onboardingStatus.steps).filter(Boolean).length;
        onboardingStatus.progress = Math.round((completedSteps / totalSteps) * 100);

        return NextResponse.json({
            success: true,
            onboarding: onboardingStatus,
            user: {
                hasInventory: !!(await UserInventory.findOne({ userId: session.user.id })),
                preferredStores: user.preferences?.preferredStores || [],
                budget: user.budget || null,
                notifications: user.notificationSettings?.priceTracking || null
            }
        });

    } catch (error) {
        console.error('Error fetching onboarding status:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

async function generateWelcomeInsights(user, preferredStores) {
    const insights = [];

    // Budget insight
    if (user.budget?.weeklyMealBudget) {
        insights.push({
            type: 'budget',
            title: 'Budget Tracking Active',
            description: `Your weekly meal budget of $${user.budget.weeklyMealBudget} is now being tracked`,
            icon: '💰',
            action: 'Start planning budget-optimized meals'
        });
    }

    // Store insights
    if (preferredStores.length > 0) {
        try {
            const stores = await Store.find({ _id: { $in: preferredStores } });
            insights.push({
                type: 'stores',
                title: 'Preferred Stores Set',
                description: `We'll prioritize deals from ${stores.map(s => s.name).join(', ')}`,
                icon: '🏪',
                action: 'Check current deals at your stores'
            });
        } catch (error) {
            console.error('Error fetching store names for insights:', error);
        }
    }

    // Feature insights
    insights.push({
        type: 'features',
        title: 'Smart Features Enabled',
        description: 'Deal alerts, budget tracking, and smart suggestions are now active',
        icon: '🧠',
        action: 'Explore price intelligence dashboard'
    });

    // Getting started tip
    insights.push({
        type: 'tip',
        title: 'Pro Tip',
        description: 'Add 10-15 frequently purchased items to get the best price recommendations',
        icon: '💡',
        action: 'Add items to inventory'
    });

    return insights;
}