// file: /src/app/api/admin/users/[id]/route.js
// Admin User Detail API - Get comprehensive individual user data

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
// authOptions no longer needed in NextAuth v5
import connectDB from '@/lib/mongodb';
import { User, UserInventory, Recipe, RecipeCollection, MealPlan, SavedShoppingList } from '@/lib/models';

export async function GET(request, { params }) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        await connectDB();

        // Verify admin status
        const adminUser = await User.findById(session.user.id).select('+isAdmin');
        if (!adminUser?.isAdmin) {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            );
        }

        const userId = params.id;
        console.log(`🔍 Admin fetching details for user: ${userId}`);

        // Get user with full details
        const user = await User.findById(userId)
            .select('name email subscription usageTracking createdAt updatedAt emailVerified isAdmin lastNotificationSent legalAcceptance profile notificationSettings mealPlanningPreferences nutritionGoals savedRecipes')
            .lean();

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Get comprehensive usage data
        const [
            inventory,
            recipeStats,
            collections,
            mealPlans,
            shoppingLists
        ] = await Promise.all([
            // Inventory with detailed breakdown
            UserInventory.findOne({ userId })
                .select('items lastUpdated')
                .lean(),

            // Recipe statistics
            Recipe.aggregate([
                { $match: { createdBy: user._id } },
                {
                    $group: {
                        _id: null,
                        totalRecipes: { $sum: 1 },
                        publicRecipes: {
                            $sum: { $cond: [{ $eq: ['$isPublic', true] }, 1, 0] }
                        },
                        privateRecipes: {
                            $sum: { $cond: [{ $eq: ['$isPublic', false] }, 1, 0] }
                        },
                        categories: { $addToSet: '$category' },
                        averageRating: { $avg: '$ratingStats.averageRating' },
                        totalViews: { $sum: '$metrics.viewCount' },
                        totalSaves: { $sum: '$metrics.saveCount' }
                    }
                }
            ]),

            // Recipe collections
            RecipeCollection.find({ userId })
                .select('name recipes createdAt isPublic stats')
                .lean(),

            // Meal plans
            MealPlan.find({ userId })
                .select('name weekStartDate isActive createdAt statistics')
                .sort({ createdAt: -1 })
                .limit(10)
                .lean(),

            // Shopping lists
            SavedShoppingList.find({ userId })
                .select('name listType stats createdAt')
                .sort({ createdAt: -1 })
                .limit(10)
                .lean()
        ]);

        // Process inventory data
        const inventoryData = inventory ? {
            totalItems: inventory.items?.length || 0,
            categories: [...new Set(inventory.items?.map(item => item.category).filter(Boolean))],
            locations: [...new Set(inventory.items?.map(item => item.location).filter(Boolean))],
            expiringItems: inventory.items?.filter(item => {
                if (!item.expirationDate) return false;
                const daysUntilExpiry = Math.ceil((new Date(item.expirationDate) - new Date()) / (1000 * 60 * 60 * 24));
                return daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
            }).length || 0,
            lastUpdated: inventory.lastUpdated
        } : {
            totalItems: 0,
            categories: [],
            locations: [],
            expiringItems: 0,
            lastUpdated: null
        };

        // Process recipe statistics
        const recipeData = recipeStats[0] || {
            totalRecipes: 0,
            publicRecipes: 0,
            privateRecipes: 0,
            categories: [],
            averageRating: 0,
            totalViews: 0,
            totalSaves: 0
        };

        // Process collections data
        const collectionsData = {
            totalCollections: collections.length,
            publicCollections: collections.filter(c => c.isPublic).length,
            totalRecipesInCollections: collections.reduce((sum, c) => sum + (c.recipes?.length || 0), 0),
            collections: collections.map(c => ({
                id: c._id,
                name: c.name,
                recipeCount: c.recipes?.length || 0,
                isPublic: c.isPublic,
                createdAt: c.createdAt
            }))
        };

        // Calculate subscription insights
        const subscriptionInsights = {
            tier: user.subscription?.tier || 'free',
            status: user.subscription?.status || 'free',
            isTrialActive: false,
            trialDaysRemaining: null,
            hasUsedFreeTrial: user.subscription?.hasUsedFreeTrial || false,
            subscriptionAge: null,
            billingCycle: user.subscription?.billingCycle
        };

        // Calculate trial info if applicable
        if (user.subscription?.status === 'trial' && user.subscription?.trialEndDate) {
            const trialEnd = new Date(user.subscription.trialEndDate);
            const now = new Date();
            subscriptionInsights.isTrialActive = now < trialEnd;
            subscriptionInsights.trialDaysRemaining = subscriptionInsights.isTrialActive
                ? Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))
                : 0;
        }

        // Calculate subscription age
        if (user.subscription?.startDate) {
            const startDate = new Date(user.subscription.startDate);
            const now = new Date();
            subscriptionInsights.subscriptionAge = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
        }

        // Activity timeline (recent activity)
        const activityTimeline = [];

        // Add recent recipes
        const recentRecipes = await Recipe.find({ createdBy: userId })
            .select('title createdAt isPublic')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        recentRecipes.forEach(recipe => {
            activityTimeline.push({
                type: 'recipe_created',
                date: recipe.createdAt,
                description: `Created recipe: ${recipe.title}`,
                metadata: { isPublic: recipe.isPublic }
            });
        });

        // Add recent collections
        collections.slice(0, 3).forEach(collection => {
            activityTimeline.push({
                type: 'collection_created',
                date: collection.createdAt,
                description: `Created collection: ${collection.name}`,
                metadata: { recipeCount: collection.recipes?.length || 0 }
            });
        });

        // Sort timeline by date
        activityTimeline.sort((a, b) => new Date(b.date) - new Date(a.date));

        return NextResponse.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                emailVerified: user.emailVerified,
                isAdmin: user.isAdmin,
                lastNotificationSent: user.lastNotificationSent,
                profile: user.profile,
                legalAcceptance: user.legalAcceptance
            },
            subscription: subscriptionInsights,
            inventory: inventoryData,
            recipes: recipeData,
            collections: collectionsData,
            mealPlans: {
                totalPlans: mealPlans.length,
                activePlans: mealPlans.filter(p => p.isActive).length,
                recentPlans: mealPlans.slice(0, 5).map(p => ({
                    id: p._id,
                    name: p.name,
                    weekStartDate: p.weekStartDate,
                    isActive: p.isActive,
                    totalMeals: p.statistics?.totalMeals || 0
                }))
            },
            shoppingLists: {
                totalLists: shoppingLists.length,
                recentLists: shoppingLists.slice(0, 5).map(l => ({
                    id: l._id,
                    name: l.name,
                    type: l.listType,
                    totalItems: l.stats?.totalItems || 0,
                    createdAt: l.createdAt
                }))
            },
            usage: {
                current: {
                    inventoryItems: inventoryData.totalItems,
                    personalRecipes: recipeData.totalRecipes,
                    publicRecipes: recipeData.publicRecipes,
                    savedRecipes: user.savedRecipes?.length || 0,
                    collections: collectionsData.totalCollections,
                    monthlyUPCScans: user.usageTracking?.monthlyUPCScans || 0,
                    monthlyReceiptScans: user.usageTracking?.monthlyReceiptScans || 0
                },
                tracking: user.usageTracking || {}
            },
            activity: {
                timeline: activityTimeline.slice(0, 10),
                summary: {
                    totalActions: activityTimeline.length,
                    recentActivity: activityTimeline.length > 0 ? activityTimeline[0].date : null
                }
            }
        });

    } catch (error) {
        console.error('❌ Admin user detail API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}