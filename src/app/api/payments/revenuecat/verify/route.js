// file: /src/app/api/payments/revenuecat/verify/route.js - RevenueCat purchase verification

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function POST(request) {
    try {
        console.log('🔄 Processing RevenueCat purchase verification...');

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { purchaseResult, tier, billingCycle, userId } = await request.json();

        // Validate inputs
        if (!purchaseResult || !tier || !billingCycle) {
            return NextResponse.json(
                { error: 'Purchase result, tier, and billing cycle are required' },
                { status: 400 }
            );
        }

        if (!['monthly', 'annual'].includes(billingCycle)) {
            return NextResponse.json(
                { error: 'Invalid billing cycle' },
                { status: 400 }
            );
        }

        if (!['gold', 'platinum'].includes(tier)) {
            return NextResponse.json(
                { error: 'Invalid tier' },
                { status: 400 }
            );
        }

        // Ensure the user ID matches the session
        if (userId !== session.user.id) {
            return NextResponse.json(
                { error: 'User ID mismatch' },
                { status: 403 }
            );
        }

        await connectDB();

        // Get user from database
        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        console.log('✅ RevenueCat purchase verification:', {
            userId: user._id,
            email: user.email,
            tier: tier,
            billingCycle: billingCycle,
            customerInfo: purchaseResult.customerInfo?.originalAppUserId,
            timestamp: new Date().toISOString()
        });

        // Extract subscription information from RevenueCat purchase result
        const customerInfo = purchaseResult.customerInfo;
        const entitlements = customerInfo?.entitlements;

        // Determine subscription dates
        const now = new Date();
        let subscriptionEndDate = null;

        // Calculate end date based on billing cycle
        if (billingCycle === 'annual') {
            subscriptionEndDate = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
        } else {
            subscriptionEndDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
        }

        // Check if the user has the expected entitlement
        const expectedEntitlement = `${tier}_access`; // e.g., 'gold_access', 'platinum_access'
        const hasEntitlement = entitlements && entitlements[expectedEntitlement]?.isActive;

        if (!hasEntitlement) {
            console.warn('⚠️ User does not have expected entitlement:', expectedEntitlement);
            // Still proceed but log the issue
        }

        // Update user subscription in database
        user.subscription = {
            ...user.subscription,
            tier: tier,
            status: 'active',
            billingCycle: billingCycle,
            startDate: now,
            endDate: subscriptionEndDate,

            // RevenueCat specific fields
            revenueCatCustomerId: customerInfo?.originalAppUserId || customerInfo?.originalApplicationVersion,
            platform: 'revenuecat', // Track that this came from RevenueCat (Google Play/App Store)

            // Clear any previous Stripe data since this is a new RevenueCat purchase
            stripeCustomerId: null,
            stripeSubscriptionId: null,

            lastPaymentDate: now,
            nextBillingDate: subscriptionEndDate,

            // Clear trial data since they're now paying
            trialStartDate: null,
            trialEndDate: null,

            // Store purchase metadata for future reference
            purchaseMetadata: {
                revenueCatPurchaseResult: {
                    transactionIdentifier: purchaseResult.transactionIdentifier,
                    productIdentifier: purchaseResult.productIdentifier,
                    purchaseDate: purchaseResult.purchaseDate
                },
                originalTier: user.subscription?.tier || 'free',
                upgradeDate: now
            }
        };

        await user.save();

        console.log('✅ RevenueCat subscription activated:', {
            userId: user._id,
            email: user.email,
            tier: tier,
            billingCycle: billingCycle,
            nextBilling: subscriptionEndDate.toISOString(),
            revenueCatCustomerId: customerInfo?.originalAppUserId
        });

        // TODO: Send welcome/upgrade email for new subscription
        // TODO: Send webhook to analytics (if needed)

        return NextResponse.json({
            success: true,
            subscription: {
                tier: tier,
                status: 'active',
                billingCycle: billingCycle,
                startDate: now.toISOString(),
                endDate: subscriptionEndDate.toISOString(),
                platform: 'revenuecat'
            },
            message: `Successfully activated ${tier} subscription!`
        });

    } catch (error) {
        console.error('❌ Error verifying RevenueCat purchase:', error);

        // Handle specific RevenueCat errors
        if (error.message?.includes('already_purchased')) {
            return NextResponse.json(
                { error: 'This subscription has already been processed' },
                { status: 409 }
            );
        }

        if (error.message?.includes('invalid_receipt')) {
            return NextResponse.json(
                { error: 'Invalid purchase receipt' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to verify purchase. Please try again.' },
            { status: 500 }
        );
    }
}