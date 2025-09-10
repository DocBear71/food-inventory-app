// file: /src/app/api/payments/revenuecat/restore/route.js v1 - Handle RevenueCat purchase restoration

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function POST(request) {
    try {
        console.log('🔄 Processing RevenueCat purchase restoration...');

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { customerInfo, userId } = await request.json();

        if (!customerInfo) {
            return NextResponse.json(
                { error: 'Customer info required' },
                { status: 400 }
            );
        }

        if (userId !== session.user.id) {
            return NextResponse.json(
                { error: 'User ID mismatch' },
                { status: 403 }
            );
        }

        await connectDB();

        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Extract subscription info from RevenueCat customerInfo
        const activeSubscriptions = customerInfo.activeSubscriptions || {};
        const activeEntitlements = customerInfo.entitlements?.active || {};

        console.log('📱 Restore - Active subscriptions:', Object.keys(activeSubscriptions));
        console.log('📱 Restore - Active entitlements:', Object.keys(activeEntitlements));

        // Determine tier from entitlements
        let tier = 'free';
        let billingCycle = 'monthly';

        if (activeEntitlements.platinum_access || activeEntitlements.premium_access) {
            tier = 'platinum';
        } else if (activeEntitlements.gold_access) {
            tier = 'gold';
        } else if (activeEntitlements.basic_access) {
            tier = 'basic';
            billingCycle = 'weekly';
        }

        // Try to determine billing cycle from subscription IDs
        const subscriptionIds = Object.keys(activeSubscriptions);
        for (const subId of subscriptionIds) {
            if (subId.includes('annual') || subId.includes('year')) {
                billingCycle = 'annual';
                break;
            } else if (subId.includes('weekly') || subId.includes('week')) {
                billingCycle = 'weekly';
                break;
            }
        }

        if (tier === 'free') {
            return NextResponse.json(
                { error: 'No active premium subscriptions found' },
                { status: 404 }
            );
        }

        const now = new Date();
        let subscriptionEndDate = new Date();

        // Calculate end date based on billing cycle
        if (billingCycle === 'annual') {
            subscriptionEndDate = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
        } else if (billingCycle === 'monthly') {
            subscriptionEndDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
        } else if (billingCycle === 'weekly') {
            subscriptionEndDate = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
        }

        // Update user subscription
        user.subscription = {
            ...user.subscription,
            tier: tier,
            status: 'active',
            billingCycle: billingCycle,
            startDate: user.subscription?.startDate || now,
            endDate: subscriptionEndDate,
            revenueCatCustomerId: customerInfo.originalAppUserId,
            platform: 'revenuecat',
            lastPaymentDate: now,
            nextBillingDate: subscriptionEndDate,
            hasUsedFreeTrial: true,
            restoredAt: now,
            restoredFrom: {
                originalAppUserId: customerInfo.originalAppUserId,
                activeSubscriptions: Object.keys(activeSubscriptions),
                activeEntitlements: Object.keys(activeEntitlements),
                timestamp: now
            }
        };

        await user.save();

        console.log('✅ RevenueCat subscription restored:', {
            userId: user._id,
            email: user.email,
            tier: tier,
            billingCycle: billingCycle,
            revenueCatCustomerId: customerInfo.originalAppUserId,
            activeSubscriptions: Object.keys(activeSubscriptions),
            activeEntitlements: Object.keys(activeEntitlements)
        });

        return NextResponse.json({
            success: true,
            subscription: {
                tier: tier,
                status: 'active',
                billingCycle: billingCycle,
                platform: 'revenuecat',
                revenueCatCustomerId: customerInfo.originalAppUserId,
                endDate: subscriptionEndDate.toISOString()
            },
            message: `Successfully restored ${tier} subscription!`,
            restored: {
                subscriptions: Object.keys(activeSubscriptions),
                entitlements: Object.keys(activeEntitlements)
            }
        });

    } catch (error) {
        console.error('❌ Error restoring RevenueCat purchases:', error);
        return NextResponse.json(
            {
                error: 'Failed to restore purchases',
                details: error.message
            },
            { status: 500 }
        );
    }
}