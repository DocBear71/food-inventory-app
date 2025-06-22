// file: /src/app/api/receipt-scan/usage/route.js - v1 - Track receipt scan usage with subscription limits

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';
import { FEATURE_GATES, checkUsageLimit, getUsageLimit } from '@/lib/subscription-config';

// GET - Check current receipt scan usage and limits
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get user's subscription info
        const userSubscription = {
            tier: user.getEffectiveTier(),
            status: user.subscription?.status || 'free'
        };

        // Get current month's usage
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Initialize usage tracking if it doesn't exist
        if (!user.usageTracking) {
            user.usageTracking = {};
        }
        if (!user.usageTracking.monthlyReceiptScans) {
            user.usageTracking.monthlyReceiptScans = {};
        }

        const currentMonthUsage = user.usageTracking.monthlyReceiptScans[currentMonth] || 0;
        const monthlyLimit = getUsageLimit(userSubscription, 'monthlyReceiptScans');
        const hasCapacity = checkUsageLimit(userSubscription, FEATURE_GATES.RECEIPT_SCAN, currentMonthUsage);

        console.log('Receipt scan usage check:', {
            userId: session.user.id,
            tier: userSubscription.tier,
            currentMonth,
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
                tier: userSubscription.tier,
                status: userSubscription.status
            }
        });

    } catch (error) {
        console.error('GET receipt scan usage error:', error);
        return NextResponse.json(
            { error: 'Failed to check receipt scan usage' },
            { status: 500 }
        );
    }
}

// POST - Increment receipt scan usage (call this when a scan is completed)
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { scanType = 'receipt', itemsExtracted = 0 } = body;

        await connectDB();

        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get user's subscription info
        const userSubscription = {
            tier: user.getEffectiveTier(),
            status: user.subscription?.status || 'free'
        };

        // Get current month key
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Initialize usage tracking if it doesn't exist
        if (!user.usageTracking) {
            user.usageTracking = {};
        }
        if (!user.usageTracking.monthlyReceiptScans) {
            user.usageTracking.monthlyReceiptScans = {};
        }

        const currentMonthUsage = user.usageTracking.monthlyReceiptScans[currentMonth] || 0;

        // Check if user has capacity BEFORE incrementing
        const hasCapacity = checkUsageLimit(userSubscription, FEATURE_GATES.RECEIPT_SCAN, currentMonthUsage);

        if (!hasCapacity) {
            const monthlyLimit = getUsageLimit(userSubscription, 'monthlyReceiptScans');
            return NextResponse.json({
                error: 'Monthly receipt scan limit exceeded',
                code: 'USAGE_LIMIT_EXCEEDED',
                usage: {
                    currentMonth: currentMonthUsage,
                    monthlyLimit: monthlyLimit === -1 ? 'unlimited' : monthlyLimit,
                    remaining: 0
                },
                subscription: {
                    tier: userSubscription.tier,
                    status: userSubscription.status
                },
                upgradeUrl: `/pricing?source=receipt-scan-limit&feature=receipt-scanning&required=${userSubscription.tier === 'free' ? 'gold' : 'platinum'}`
            }, { status: 403 });
        }

        // Increment usage
        user.usageTracking.monthlyReceiptScans[currentMonth] = currentMonthUsage + 1;
        user.usageTracking.lastReceiptScan = new Date();
        user.usageTracking.totalReceiptScans = (user.usageTracking.totalReceiptScans || 0) + 1;
        user.usageTracking.lastUpdated = new Date();

        await user.save();

        const newUsage = user.usageTracking.monthlyReceiptScans[currentMonth];
        const monthlyLimit = getUsageLimit(userSubscription, 'monthlyReceiptScans');

        console.log('Receipt scan usage incremented:', {
            userId: session.user.id,
            tier: userSubscription.tier,
            currentMonth,
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
        return NextResponse.json(
            { error: 'Failed to record receipt scan usage' },
            { status: 500 }
        );
    }
}