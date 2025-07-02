// file: /src/app/api/receipt-scan/usage/route.js - v5 - Fixed validation issues with User model

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

// Helper function to get usage limits based on tier
function getUsageLimit(tier, limitType) {
    const limits = {
        free: {
            monthlyReceiptScans: 2
        },
        gold: {
            monthlyReceiptScans: 20
        },
        platinum: {
            monthlyReceiptScans: -1 // unlimited
        },
        admin: {
            monthlyReceiptScans: -1 // unlimited
        }
    };

    return limits[tier]?.[limitType] || 0;
}

// Helper function to check if usage is within limits
function checkUsageLimit(tier, currentUsage, limitType) {
    const limit = getUsageLimit(tier, limitType);

    if (limit === -1) return true; // unlimited
    if (limit === 0) return false; // not allowed

    return currentUsage < limit;
}

// GET - Check current receipt scan usage and limits
export async function GET(request) {
    try {
        console.log('GET /api/receipt-scan/usage - Starting...');

        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            console.log('No session or user ID found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('User ID:', session.user.id);

        await connectDB();
        console.log('Database connected');

        const user = await User.findById(session.user.id);
        if (!user) {
            console.log('User not found in database');
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get user's effective tier using the model method
        const userTier = user.getEffectiveTier();
        console.log('User tier:', userTier);

        // Get current month's usage using your existing model structure
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Initialize usage tracking if it doesn't exist (matches your model defaults)
        if (!user.usageTracking) {
            user.usageTracking = {
                currentMonth: currentMonth,
                currentYear: currentYear,
                monthlyUPCScans: 0,
                monthlyReceiptScans: 0,
                totalInventoryItems: 0,
                totalPersonalRecipes: 0,
                totalSavedRecipes: 0,
                totalPublicRecipes: 0,
                totalRecipeCollections: 0,
                lastUpdated: now
            };
        }

        // Check if we need to reset monthly counters
        let needsReset = false;
        if (user.usageTracking.currentMonth !== currentMonth ||
            user.usageTracking.currentYear !== currentYear) {
            console.log('Monthly counters need reset for new month');
            needsReset = true;
        }

        // FIXED: Use updateOne to avoid validation issues
        if (needsReset || !user.usageTracking) {
            try {
                await User.updateOne(
                    { _id: session.user.id },
                    {
                        $set: {
                            'usageTracking.currentMonth': currentMonth,
                            'usageTracking.currentYear': currentYear,
                            'usageTracking.monthlyUPCScans': needsReset ? 0 : (user.usageTracking?.monthlyUPCScans || 0),
                            'usageTracking.monthlyReceiptScans': needsReset ? 0 : (user.usageTracking?.monthlyReceiptScans || 0),
                            'usageTracking.totalInventoryItems': user.usageTracking?.totalInventoryItems || 0,
                            'usageTracking.totalPersonalRecipes': user.usageTracking?.totalPersonalRecipes || 0,
                            'usageTracking.totalSavedRecipes': user.usageTracking?.totalSavedRecipes || 0,
                            'usageTracking.totalPublicRecipes': user.usageTracking?.totalPublicRecipes || 0,
                            'usageTracking.totalRecipeCollections': user.usageTracking?.totalRecipeCollections || 0,
                            'usageTracking.lastUpdated': now
                        }
                    },
                    {
                        runValidators: false  // Skip validation to avoid legalAcceptance issues
                    }
                );
                console.log('Usage tracking initialized/reset successfully');

                // Refresh user data after update
                const updatedUser = await User.findById(session.user.id);
                if (updatedUser) {
                    user.usageTracking = updatedUser.usageTracking;
                }
            } catch (updateError) {
                console.error('Error updating usage tracking:', updateError);
            }
        }

        const currentMonthUsage = user.usageTracking?.monthlyReceiptScans || 0;
        const monthlyLimit = getUsageLimit(userTier, 'monthlyReceiptScans');
        const hasCapacity = checkUsageLimit(userTier, currentMonthUsage, 'monthlyReceiptScans');

        console.log('Receipt scan usage check:', {
            userId: session.user.id,
            tier: userTier,
            currentMonthUsage,
            monthlyLimit,
            hasCapacity
        });

        return NextResponse.json({
            success: true,
            usage: {
                currentMonth: currentMonthUsage,
                monthlyLimit: monthlyLimit === -1 ? 'unlimited' : monthlyLimit,
                remaining: monthlyLimit === -1 ? 'unlimited' : Math.max(0, monthlyLimit - currentMonthUsage),
                hasCapacity,
                canScan: hasCapacity
            },
            subscription: {
                tier: userTier,
                status: user.subscription?.status || 'free'
            }
        });

    } catch (error) {
        console.error('GET receipt scan usage error:', error);
        console.error('Error stack:', error.stack);
        return NextResponse.json(
            {
                error: 'Failed to check receipt scan usage',
                details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            },
            { status: 500 }
        );
    }
}

// POST - Increment receipt scan usage (call this when a scan is completed)
export async function POST(request) {
    try {
        console.log('POST /api/receipt-scan/usage - Starting...');

        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            console.log('No session or user ID found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { scanType = 'receipt', itemsExtracted = 0 } = body;

        console.log('Recording usage for user:', session.user.id, 'scanType:', scanType, 'items:', itemsExtracted);

        await connectDB();
        console.log('Database connected');

        const user = await User.findById(session.user.id);
        if (!user) {
            console.log('User not found in database');
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get user's effective tier using the model method
        const userTier = user.getEffectiveTier();
        console.log('User tier:', userTier);

        // Get current month
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Ensure usage tracking exists
        if (!user.usageTracking) {
            // FIXED: Use updateOne to initialize without validation
            await User.updateOne(
                { _id: session.user.id },
                {
                    $set: {
                        'usageTracking.currentMonth': currentMonth,
                        'usageTracking.currentYear': currentYear,
                        'usageTracking.monthlyUPCScans': 0,
                        'usageTracking.monthlyReceiptScans': 0,
                        'usageTracking.totalInventoryItems': 0,
                        'usageTracking.totalPersonalRecipes': 0,
                        'usageTracking.totalSavedRecipes': 0,
                        'usageTracking.totalPublicRecipes': 0,
                        'usageTracking.totalRecipeCollections': 0,
                        'usageTracking.lastUpdated': now
                    }
                },
                { runValidators: false }
            );

            // Refresh user data
            const updatedUser = await User.findById(session.user.id);
            if (updatedUser) {
                user.usageTracking = updatedUser.usageTracking;
            }
        }

        // Reset monthly counters if it's a new month
        if (user.usageTracking.currentMonth !== currentMonth ||
            user.usageTracking.currentYear !== currentYear) {
            console.log('Resetting monthly counters for new month');

            // FIXED: Use updateOne to reset without validation
            await User.updateOne(
                { _id: session.user.id },
                {
                    $set: {
                        'usageTracking.currentMonth': currentMonth,
                        'usageTracking.currentYear': currentYear,
                        'usageTracking.monthlyUPCScans': 0,
                        'usageTracking.monthlyReceiptScans': 0,
                        'usageTracking.lastUpdated': now
                    }
                },
                { runValidators: false }
            );

            // Update local data
            user.usageTracking.currentMonth = currentMonth;
            user.usageTracking.currentYear = currentYear;
            user.usageTracking.monthlyUPCScans = 0;
            user.usageTracking.monthlyReceiptScans = 0;
        }

        const currentMonthUsage = user.usageTracking.monthlyReceiptScans || 0;

        // Check if user has capacity BEFORE incrementing
        const hasCapacity = checkUsageLimit(userTier, currentMonthUsage, 'monthlyReceiptScans');

        if (!hasCapacity) {
            const monthlyLimit = getUsageLimit(userTier, 'monthlyReceiptScans');
            console.log('Usage limit exceeded:', {
                currentMonthUsage,
                monthlyLimit,
                tier: userTier
            });

            return NextResponse.json({
                error: 'Monthly receipt scan limit exceeded',
                code: 'USAGE_LIMIT_EXCEEDED',
                usage: {
                    currentMonth: currentMonthUsage,
                    monthlyLimit: monthlyLimit === -1 ? 'unlimited' : monthlyLimit,
                    remaining: 0
                },
                subscription: {
                    tier: userTier,
                    status: user.subscription?.status || 'free'
                },
                upgradeUrl: `/pricing?source=receipt-scan-limit&feature=receipt-scanning&required=${userTier === 'free' ? 'gold' : 'platinum'}`
            }, { status: 403 });
        }

        const newUsage = currentMonthUsage + 1;
        const totalScans = (user.usageTracking.totalReceiptScans || 0) + 1;

        // FIXED: Use updateOne to increment without triggering validation
        try {
            await User.updateOne(
                { _id: session.user.id },
                {
                    $set: {
                        'usageTracking.monthlyReceiptScans': newUsage,
                        'usageTracking.totalReceiptScans': totalScans,
                        'usageTracking.lastUpdated': now
                    }
                },
                { runValidators: false }  // Skip validation
            );
            console.log('Usage incremented successfully');
        } catch (updateError) {
            console.error('Error incrementing usage:', updateError);
            throw updateError;
        }

        const monthlyLimit = getUsageLimit(userTier, 'monthlyReceiptScans');

        console.log('Receipt scan usage incremented:', {
            userId: session.user.id,
            tier: userTier,
            newUsage,
            monthlyLimit,
            itemsExtracted,
            scanType
        });

        return NextResponse.json({
            success: true,
            message: 'Receipt scan usage recorded',
            usage: {
                currentMonth: newUsage,
                monthlyLimit: monthlyLimit === -1 ? 'unlimited' : monthlyLimit,
                remaining: monthlyLimit === -1 ? 'unlimited' : Math.max(0, monthlyLimit - newUsage),
                hasCapacity: monthlyLimit === -1 || newUsage < monthlyLimit
            },
            scan: {
                type: scanType,
                itemsExtracted,
                timestamp: new Date()
            }
        });

    } catch (error) {
        console.error('POST receipt scan usage error:', error);
        console.error('Error stack:', error.stack);
        return NextResponse.json(
            {
                error: 'Failed to record receipt scan usage',
                details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            },
            { status: 500 }
        );
    }
}