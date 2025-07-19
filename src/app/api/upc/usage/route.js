// file: /src/app/api/upc/usage/route.js - v2 FIXED: Database consistency and cache issues

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';
import { FEATURE_GATES, checkUsageLimit, getUsageLimit } from '@/lib/subscription-config';

export async function GET(request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        // FIXED: Force fresh read from database with proper options
        const user = await User.findById(session.user.id)
            .lean(false)  // Don't use lean to ensure we get the latest data
            .exec();      // Force execution

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get current subscription info
        const userSubscription = {
            tier: user.getEffectiveTier(),
            status: user.subscription?.status || 'free'
        };

        // Reset monthly counter if needed
        const now = new Date();
        let needsReset = false;

        try {
            if (!user.usageTracking ||
                user.usageTracking.currentMonth !== now.getMonth() ||
                user.usageTracking.currentYear !== now.getFullYear()) {

                needsReset = true;

                // Initialize/reset usage tracking
                if (!user.usageTracking) {
                    user.usageTracking = {};
                }

                user.usageTracking.currentMonth = now.getMonth();
                user.usageTracking.currentYear = now.getFullYear();
                user.usageTracking.monthlyUPCScans = 0;
                user.usageTracking.lastUpdated = now;

                // Use updateOne to avoid validation issues
                await User.updateOne(
                    { _id: session.user.id },
                    {
                        $set: {
                            'usageTracking.currentMonth': now.getMonth(),
                            'usageTracking.currentYear': now.getFullYear(),
                            'usageTracking.monthlyUPCScans': 0,
                            'usageTracking.lastUpdated': now
                        }
                    },
                    { runValidators: false }
                );

                console.log(`✅ UPC usage tracking reset for user ${user.email} (new month)`);
            }
        } catch (trackingError) {
            console.error('Error resetting usage tracking:', trackingError);
            // Continue with current values even if reset fails
        }

        const currentScans = needsReset ? 0 : (user.usageTracking?.monthlyUPCScans || 0);
        const monthlyLimit = getUsageLimit(userSubscription, 'upcScansPerMonth');
        const hasCapacity = checkUsageLimit(userSubscription, FEATURE_GATES.UPC_SCANNING, currentScans);

        console.log('📊 UPC usage check (fresh from DB):', {
            userId: session.user.id,
            tier: userSubscription.tier,
            currentScans,
            monthlyLimit,
            hasCapacity,
            needsReset,
            timestamp: new Date().toISOString()
        });

        const response = NextResponse.json({
            success: true,
            currentMonth: currentScans,
            monthlyLimit: monthlyLimit === -1 ? 'unlimited' : monthlyLimit,
            remaining: monthlyLimit === -1 ? 'unlimited' : Math.max(0, monthlyLimit - currentScans),
            hasCapacity,
            canScan: hasCapacity,
            subscription: {
                tier: userSubscription.tier,
                status: userSubscription.status
            },
            resetDate: needsReset ? 'Just reset' : 'Next month',
            // FIXED: Add timestamp to help debug timing issues
            fetchedAt: new Date().toISOString()
        });

        // FIXED: Add cache-busting headers to ensure fresh data
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        response.headers.set('Surrogate-Control', 'no-store');

        return response;

    } catch (error) {
        console.error('GET UPC usage error:', error);
        return NextResponse.json(
            {
                error: 'Failed to check UPC usage',
                details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            },
            { status: 500 }
        );
    }
}