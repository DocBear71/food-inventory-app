// file: /src/app/api/admin/analytics/route.js
// Admin Analytics API - Get comprehensive usage statistics

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
// authOptions no longer needed in NextAuth v5
import connectDB from '@/lib/mongodb';
import { User, UserInventory, Recipe, RecipeCollection, MealPlan } from '@/lib/models';

export async function GET(request) {
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

        const { searchParams } = new URL(request.url);
        const timeframe = searchParams.get('timeframe') || '30'; // days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(timeframe));

        console.log(`📊 Generating admin analytics for last ${timeframe} days`);

        // Get overall statistics
        const [
            totalUsers,
            newUsers,
            activeUsers,
            usersByTier,
            totalRecipes,
            publicRecipes,
            totalInventoryItems,
            totalCollections,
            totalMealPlans
        ] = await Promise.all([
            // Total users
            User.countDocuments(),

            // New users in timeframe
            User.countDocuments({
                createdAt: { $gte: startDate }
            }),

            // Active users (logged in or updated within timeframe)
            User.countDocuments({
                $or: [
                    { updatedAt: { $gte: startDate } },
                    { 'usageTracking.lastUpdated': { $gte: startDate } }
                ]
            }),

            // Users by subscription tier
            User.aggregate([
                {
                    $group: {
                        _id: { $ifNull: ['$subscription.tier', 'free'] },
                        count: { $sum: 1 },
                        activeCount: {
                            $sum: {
                                $cond: [
                                    {
                                        $or: [
                                            { $gte: ['$updatedAt', startDate] },
                                            { $gte: ['$usageTracking.lastUpdated', startDate] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]),

            // Total recipes
            Recipe.countDocuments(),

            // Public recipes
            Recipe.countDocuments({ isPublic: true }),

            // Total inventory items across all users
            UserInventory.aggregate([
                { $unwind: '$items' },
                { $count: 'totalItems' }
            ]),

            // Total recipe collections
            RecipeCollection.countDocuments(),

            // Total meal plans
            MealPlan.countDocuments()
        ]);

        // Usage statistics aggregation
        const usageStats = await User.aggregate([
            {
                $group: {
                    _id: null,
                    totalUPCScans: { $sum: '$usageTracking.monthlyUPCScans' },
                    totalReceiptScans: { $sum: '$usageTracking.monthlyReceiptScans' },
                    avgInventoryItems: { $avg: '$usageTracking.totalInventoryItems' },
                    avgPersonalRecipes: { $avg: '$usageTracking.totalPersonalRecipes' },
                    avgSavedRecipes: { $avg: '$usageTracking.totalSavedRecipes' },
                    avgCollections: { $avg: '$usageTracking.totalRecipeCollections' }
                }
            }
        ]);

        // Growth metrics (daily registrations over timeframe)
        const growthData = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$createdAt'
                        }
                    },
                    newUsers: { $sum: 1 },
                    newFreeUsers: {
                        $sum: {
                            $cond: [
                                { $eq: [{ $ifNull: ['$subscription.tier', 'free'] }, 'free'] },
                                1,
                                0
                            ]
                        }
                    },
                    newPaidUsers: {
                        $sum: {
                            $cond: [
                                { $in: [{ $ifNull: ['$subscription.tier', 'free'] }, ['gold', 'platinum']] },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Recipe activity metrics
        const recipeActivity = await Recipe.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$createdAt'
                        }
                    },
                    newRecipes: { $sum: 1 },
                    newPublicRecipes: {
                        $sum: {
                            $cond: [{ $eq: ['$isPublic', true] }, 1, 0]
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Top users by activity
        const topUsers = await User.aggregate([
            {
                $project: {
                    name: 1,
                    email: 1,
                    subscriptionTier: { $ifNull: ['$subscription.tier', 'free'] },
                    totalRecipes: { $ifNull: ['$usageTracking.totalPersonalRecipes', 0] },
                    totalInventoryItems: { $ifNull: ['$usageTracking.totalInventoryItems', 0] },
                    monthlyScans: {
                        $add: [
                            { $ifNull: ['$usageTracking.monthlyUPCScans', 0] },
                            { $ifNull: ['$usageTracking.monthlyReceiptScans', 0] }
                        ]
                    },
                    createdAt: 1
                }
            },
            {
                $sort: {
                    totalRecipes: -1,
                    totalInventoryItems: -1,
                    monthlyScans: -1
                }
            },
            { $limit: 10 }
        ]);

        // Subscription conversion metrics
        const conversionMetrics = await User.aggregate([
            {
                $group: {
                    _id: null,
                    totalUsers: { $sum: 1 },
                    freeUsers: {
                        $sum: {
                            $cond: [
                                { $eq: [{ $ifNull: ['$subscription.tier', 'free'] }, 'free'] },
                                1,
                                0
                            ]
                        }
                    },
                    trialUsers: {
                        $sum: {
                            $cond: [
                                { $eq: ['$subscription.status', 'trial'] },
                                1,
                                0
                            ]
                        }
                    },
                    paidUsers: {
                        $sum: {
                            $cond: [
                                { $in: [{ $ifNull: ['$subscription.tier', 'free'] }, ['gold', 'platinum']] },
                                1,
                                0
                            ]
                        }
                    },
                    usedFreeTrial: {
                        $sum: {
                            $cond: [
                                { $eq: ['$subscription.hasUsedFreeTrial', true] },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        // Feature usage statistics
        const featureUsage = {
            inventoryUsers: await User.countDocuments({
                'usageTracking.totalInventoryItems': { $gt: 0 }
            }),
            recipeCreators: await User.countDocuments({
                'usageTracking.totalPersonalRecipes': { $gt: 0 }
            }),
            upcScanners: await User.countDocuments({
                'usageTracking.monthlyUPCScans': { $gt: 0 }
            }),
            receiptScanners: await User.countDocuments({
                'usageTracking.monthlyReceiptScans': { $gt: 0 }
            }),
            collectionUsers: await User.countDocuments({
                'usageTracking.totalRecipeCollections': { $gt: 0 }
            })
        };

        // Process data for response
        const tierBreakdown = {};
        usersByTier.forEach(tier => {
            tierBreakdown[tier._id] = {
                total: tier.count,
                active: tier.activeCount
            };
        });

        const usage = usageStats[0] || {
            totalUPCScans: 0,
            totalReceiptScans: 0,
            avgInventoryItems: 0,
            avgPersonalRecipes: 0,
            avgSavedRecipes: 0,
            avgCollections: 0
        };

        const conversion = conversionMetrics[0] || {
            totalUsers: 0,
            freeUsers: 0,
            trialUsers: 0,
            paidUsers: 0,
            usedFreeTrial: 0
        };

        return NextResponse.json({
            timeframe: parseInt(timeframe),
            generatedAt: new Date().toISOString(),

            overview: {
                totalUsers,
                newUsers,
                activeUsers,
                totalRecipes,
                publicRecipes,
                totalInventoryItems: totalInventoryItems[0]?.totalItems || 0,
                totalCollections,
                totalMealPlans
            },

            subscriptions: {
                breakdown: tierBreakdown,
                conversion: {
                    ...conversion,
                    conversionRate: conversion.totalUsers > 0
                        ? Math.round((conversion.paidUsers / conversion.totalUsers) * 100 * 100) / 100
                        : 0,
                    trialConversionRate: conversion.usedFreeTrial > 0
                        ? Math.round((conversion.paidUsers / conversion.usedFreeTrial) * 100 * 100) / 100
                        : 0
                }
            },

            usage: {
                scans: {
                    totalUPC: usage.totalUPCScans,
                    totalReceipt: usage.totalReceiptScans,
                    avgPerUser: Math.round((usage.totalUPCScans + usage.totalReceiptScans) / totalUsers * 100) / 100
                },
                averages: {
                    inventoryItems: Math.round(usage.avgInventoryItems * 100) / 100,
                    personalRecipes: Math.round(usage.avgPersonalRecipes * 100) / 100,
                    savedRecipes: Math.round(usage.avgSavedRecipes * 100) / 100,
                    collections: Math.round(usage.avgCollections * 100) / 100
                }
            },

            featureAdoption: {
                inventory: {
                    users: featureUsage.inventoryUsers,
                    percentage: Math.round((featureUsage.inventoryUsers / totalUsers) * 100 * 100) / 100
                },
                recipes: {
                    users: featureUsage.recipeCreators,
                    percentage: Math.round((featureUsage.recipeCreators / totalUsers) * 100 * 100) / 100
                },
                scanning: {
                    upcUsers: featureUsage.upcScanners,
                    receiptUsers: featureUsage.receiptScanners,
                    totalScanners: Math.max(featureUsage.upcScanners, featureUsage.receiptScanners),
                    percentage: Math.round((Math.max(featureUsage.upcScanners, featureUsage.receiptScanners) / totalUsers) * 100 * 100) / 100
                },
                collections: {
                    users: featureUsage.collectionUsers,
                    percentage: Math.round((featureUsage.collectionUsers / totalUsers) * 100 * 100) / 100
                }
            },

            growth: {
                daily: growthData,
                recipeActivity: recipeActivity
            },

            topUsers: topUsers.map(user => ({
                id: user._id,
                name: user.name,
                email: user.email,
                tier: user.subscriptionTier,
                recipes: user.totalRecipes,
                inventoryItems: user.totalInventoryItems,
                monthlyScans: user.monthlyScans,
                memberSince: user.createdAt
            }))
        });

    } catch (error) {
        console.error('❌ Admin analytics API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}