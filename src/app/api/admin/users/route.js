// file: /src/app/api/admin/users/route.js
// Admin Users API - List users with pagination, search, and filtering

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User, UserInventory, Recipe, RecipeCollection } from '@/lib/models';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        // Check if user is admin
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

        // Parse query parameters
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 25;
        const search = searchParams.get('search') || '';
        const tier = searchParams.get('tier') || '';
        const status = searchParams.get('status') || '';
        const sortBy = searchParams.get('sortBy') || 'createdAt';
        const sortOrder = searchParams.get('sortOrder') || 'desc';

        // Build filter query
        const filter = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (tier) {
            filter['subscription.tier'] = tier;
        }

        if (status) {
            filter['subscription.status'] = status;
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Calculate pagination
        const skip = (page - 1) * limit;

        console.log('🔍 Admin users query:', {
            filter,
            sort,
            page,
            limit,
            skip
        });

        // Get users with pagination
        const [users, totalUsers] = await Promise.all([
            User.find(filter)
                .select('name email subscription usageTracking createdAt updatedAt emailVerified isAdmin lastNotificationSent')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(filter)
        ]);

        console.log(`📊 Found ${users.length} users out of ${totalUsers} total`);

        // Get usage stats for each user efficiently
        const userIds = users.map(user => user._id);

        const [inventories, recipeCounts, collectionCounts] = await Promise.all([
            UserInventory.find({ userId: { $in: userIds } })
                .select('userId items')
                .lean(),
            Recipe.aggregate([
                { $match: { createdBy: { $in: userIds } } },
                {
                    $group: {
                        _id: '$createdBy',
                        personalRecipes: { $sum: 1 },
                        publicRecipes: {
                            $sum: { $cond: [{ $eq: ['$isPublic', true] }, 1, 0] }
                        }
                    }
                }
            ]),
            RecipeCollection.aggregate([
                { $match: { userId: { $in: userIds } } },
                { $group: { _id: '$userId', collections: { $sum: 1 } } }
            ])
        ]);

        // Create lookup maps for efficient data merging
        const inventoryMap = new Map();
        inventories.forEach(inv => {
            inventoryMap.set(inv.userId.toString(), inv.items?.length || 0);
        });

        const recipeMap = new Map();
        recipeCounts.forEach(count => {
            recipeMap.set(count._id.toString(), {
                personal: count.personalRecipes || 0,
                public: count.publicRecipes || 0
            });
        });

        const collectionMap = new Map();
        collectionCounts.forEach(count => {
            collectionMap.set(count._id.toString(), count.collections || 0);
        });

        // Enhance users with usage data
        const enhancedUsers = users.map(user => {
            const userId = user._id.toString();
            const recipes = recipeMap.get(userId) || { personal: 0, public: 0 };

            return {
                ...user,
                stats: {
                    inventoryItems: inventoryMap.get(userId) || 0,
                    personalRecipes: recipes.personal,
                    publicRecipes: recipes.public,
                    savedRecipes: user.savedRecipes?.length || 0,
                    collections: collectionMap.get(userId) || 0,
                    monthlyUPCScans: user.usageTracking?.monthlyUPCScans || 0,
                    monthlyReceiptScans: user.usageTracking?.monthlyReceiptScans || 0
                },
                subscription: {
                    tier: user.subscription?.tier || 'free',
                    status: user.subscription?.status || 'free',
                    trialEndDate: user.subscription?.trialEndDate,
                    endDate: user.subscription?.endDate,
                    hasUsedFreeTrial: user.subscription?.hasUsedFreeTrial || false
                }
            };
        });

        // Calculate pagination info
        const totalPages = Math.ceil(totalUsers / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        return NextResponse.json({
            users: enhancedUsers,
            pagination: {
                currentPage: page,
                totalPages,
                totalUsers,
                hasNext,
                hasPrev,
                limit
            },
            filters: {
                search,
                tier,
                status,
                sortBy,
                sortOrder
            }
        });

    } catch (error) {
        console.error('❌ Admin users API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}