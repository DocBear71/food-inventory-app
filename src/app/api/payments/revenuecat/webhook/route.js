// file: /src/app/api/payments/revenuecat/webhook/route.js - RevenueCat webhook handler

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

// RevenueCat webhook secret (you'll get this from RevenueCat dashboard)
const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

export async function POST(request) {
    try {
        const body = await request.text();
        const signature = request.headers.get('authorization');

        // Verify webhook signature (if you set up webhook authentication)
        if (REVENUECAT_WEBHOOK_SECRET && signature) {
            // TODO: Implement signature verification
            // RevenueCat uses Authorization header for webhook authentication
            if (signature !== `Bearer ${REVENUECAT_WEBHOOK_SECRET}`) {
                console.error('❌ Invalid webhook signature');
                return NextResponse.json(
                    { error: 'Invalid signature' },
                    { status: 401 }
                );
            }
        }

        const event = JSON.parse(body);
        console.log('📨 Received RevenueCat webhook:', event.type);

        await connectDB();

        // Handle different event types
        switch (event.type) {
            case 'INITIAL_PURCHASE':
                await handleInitialPurchase(event);
                break;

            case 'RENEWAL':
                await handleRenewal(event);
                break;

            case 'CANCELLATION':
                await handleCancellation(event);
                break;

            case 'UNCANCELLATION':
                await handleUncancellation(event);
                break;

            case 'NON_RENEWING_PURCHASE':
                await handleNonRenewingPurchase(event);
                break;

            case 'SUBSCRIPTION_PAUSED':
                await handleSubscriptionPaused(event);
                break;

            case 'EXPIRATION':
                await handleExpiration(event);
                break;

            case 'BILLING_ISSUE':
                await handleBillingIssue(event);
                break;

            case 'PRODUCT_CHANGE':
                await handleProductChange(event);
                break;

            default:
                console.log(`📝 Unhandled RevenueCat event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });

    } catch (error) {
        console.error('❌ RevenueCat webhook error:', error);
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}

// Handle initial purchase
async function handleInitialPurchase(event) {
    try {
        console.log('✅ Processing initial purchase:', event.event.app_user_id);

        const appUserId = event.event.app_user_id;
        const productId = event.event.product_id;
        const eventTimestamp = new Date(event.event.event_timestamp_ms);

        // Find user by RevenueCat customer ID or create mapping
        const user = await findUserByRevenueCatId(appUserId);
        if (!user) {
            console.error('❌ User not found for RevenueCat ID:', appUserId);
            return;
        }

        // Determine tier from product ID
        const tier = extractTierFromProductId(productId);
        const billingCycle = extractBillingCycleFromProductId(productId);

        if (!tier || !billingCycle) {
            console.error('❌ Could not determine tier/billing from product:', productId);
            return;
        }

        // Update subscription
        const subscriptionEndDate = calculateEndDate(eventTimestamp, billingCycle);

        user.subscription = {
            ...user.subscription,
            tier: tier,
            status: 'active',
            billingCycle: billingCycle,
            startDate: eventTimestamp,
            endDate: subscriptionEndDate,
            revenueCatCustomerId: appUserId,
            platform: 'revenuecat',
            lastPaymentDate: eventTimestamp,
            nextBillingDate: subscriptionEndDate
        };

        await user.save();

        console.log('✅ Initial purchase processed:', {
            userId: user._id,
            tier: tier,
            productId: productId
        });

    } catch (error) {
        console.error('❌ Error handling initial purchase:', error);
    }
}

// Handle subscription renewal
async function handleRenewal(event) {
    try {
        console.log('🔄 Processing renewal:', event.event.app_user_id);

        const appUserId = event.event.app_user_id;
        const eventTimestamp = new Date(event.event.event_timestamp_ms);

        const user = await findUserByRevenueCatId(appUserId);
        if (!user) {
            console.error('❌ User not found for renewal:', appUserId);
            return;
        }

        // Update renewal date and extend subscription
        const billingCycle = user.subscription?.billingCycle || 'monthly';
        const newEndDate = calculateEndDate(eventTimestamp, billingCycle);

        user.subscription = {
            ...user.subscription,
            status: 'active',
            lastPaymentDate: eventTimestamp,
            endDate: newEndDate,
            nextBillingDate: newEndDate
        };

        await user.save();

        console.log('✅ Renewal processed:', {
            userId: user._id,
            newEndDate: newEndDate.toISOString()
        });

    } catch (error) {
        console.error('❌ Error handling renewal:', error);
    }
}

// Handle subscription cancellation
async function handleCancellation(event) {
    try {
        console.log('❌ Processing cancellation:', event.event.app_user_id);

        const appUserId = event.event.app_user_id;
        const user = await findUserByRevenueCatId(appUserId);

        if (!user) {
            console.error('❌ User not found for cancellation:', appUserId);
            return;
        }

        // Mark as cancelled but keep access until end of period
        user.subscription = {
            ...user.subscription,
            status: 'cancelled'
            // Keep endDate - user retains access until then
        };

        await user.save();

        console.log('✅ Cancellation processed:', {
            userId: user._id,
            accessUntil: user.subscription.endDate
        });

    } catch (error) {
        console.error('❌ Error handling cancellation:', error);
    }
}

// Handle subscription uncancellation (user reactivates)
async function handleUncancellation(event) {
    try {
        console.log('🔄 Processing uncancellation:', event.event.app_user_id);

        const appUserId = event.event.app_user_id;
        const user = await findUserByRevenueCatId(appUserId);

        if (!user) {
            console.error('❌ User not found for uncancellation:', appUserId);
            return;
        }

        // Reactivate subscription
        user.subscription = {
            ...user.subscription,
            status: 'active'
        };

        await user.save();

        console.log('✅ Uncancellation processed:', {
            userId: user._id
        });

    } catch (error) {
        console.error('❌ Error handling uncancellation:', error);
    }
}

// Handle subscription expiration
async function handleExpiration(event) {
    try {
        console.log('⏰ Processing expiration:', event.event.app_user_id);

        const appUserId = event.event.app_user_id;
        const user = await findUserByRevenueCatId(appUserId);

        if (!user) {
            console.error('❌ User not found for expiration:', appUserId);
            return;
        }

        // Downgrade to free tier
        user.subscription = {
            ...user.subscription,
            tier: 'free',
            status: 'expired',
            endDate: new Date()
        };

        await user.save();

        console.log('✅ Expiration processed - downgraded to free:', {
            userId: user._id
        });

    } catch (error) {
        console.error('❌ Error handling expiration:', error);
    }
}

// Handle billing issues
async function handleBillingIssue(event) {
    try {
        console.log('⚠️ Processing billing issue:', event.event.app_user_id);

        const appUserId = event.event.app_user_id;
        const user = await findUserByRevenueCatId(appUserId);

        if (!user) {
            console.error('❌ User not found for billing issue:', appUserId);
            return;
        }

        // Mark subscription as having billing issues
        user.subscription = {
            ...user.subscription,
            status: 'past_due'
        };

        await user.save();

        console.log('⚠️ Billing issue processed:', {
            userId: user._id
        });

        // TODO: Send billing issue notification email

    } catch (error) {
        console.error('❌ Error handling billing issue:', error);
    }
}

// Handle product/tier changes
async function handleProductChange(event) {
    try {
        console.log('🔄 Processing product change:', event.event.app_user_id);

        const appUserId = event.event.app_user_id;
        const newProductId = event.event.product_id;
        const eventTimestamp = new Date(event.event.event_timestamp_ms);

        const user = await findUserByRevenueCatId(appUserId);
        if (!user) {
            console.error('❌ User not found for product change:', appUserId);
            return;
        }

        // Determine new tier from product ID
        const newTier = extractTierFromProductId(newProductId);
        const newBillingCycle = extractBillingCycleFromProductId(newProductId);

        if (!newTier || !newBillingCycle) {
            console.error('❌ Could not determine new tier/billing from product:', newProductId);
            return;
        }

        // Update subscription with new tier
        const newEndDate = calculateEndDate(eventTimestamp, newBillingCycle);

        user.subscription = {
            ...user.subscription,
            tier: newTier,
            billingCycle: newBillingCycle,
            endDate: newEndDate,
            nextBillingDate: newEndDate
        };

        await user.save();

        console.log('✅ Product change processed:', {
            userId: user._id,
            newTier: newTier,
            oldTier: user.subscription?.tier
        });

    } catch (error) {
        console.error('❌ Error handling product change:', error);
    }
}

// Handle non-renewing purchases (not commonly used for subscriptions)
async function handleNonRenewingPurchase(event) {
    console.log('📝 Non-renewing purchase received (not handled for subscriptions)');
}

// Handle subscription paused
async function handleSubscriptionPaused(event) {
    try {
        console.log('⏸️ Processing subscription pause:', event.event.app_user_id);

        const appUserId = event.event.app_user_id;
        const user = await findUserByRevenueCatId(appUserId);

        if (!user) {
            console.error('❌ User not found for pause:', appUserId);
            return;
        }

        user.subscription = {
            ...user.subscription,
            status: 'paused'
        };

        await user.save();

        console.log('✅ Subscription pause processed:', {
            userId: user._id
        });

    } catch (error) {
        console.error('❌ Error handling subscription pause:', error);
    }
}

// Helper functions

async function findUserByRevenueCatId(revenueCatId) {
    // Try to find user by RevenueCat customer ID
    let user = await User.findOne({
        'subscription.revenueCatCustomerId': revenueCatId
    });

    // If not found, try to find by email or other identifier
    // This might happen on first purchase before the ID is stored
    if (!user) {
        // RevenueCat sometimes uses the user's email or your app's user ID
        // Adjust this logic based on how you set up App User IDs in RevenueCat
        user = await User.findOne({
            $or: [
                { email: revenueCatId },
                { _id: revenueCatId }
            ]
        });
    }

    return user;
}

function extractTierFromProductId(productId) {
    // Extract tier from product IDs like 'gold_monthly', 'platinum_annual'
    if (productId.includes('gold')) return 'gold';
    if (productId.includes('platinum')) return 'platinum';
    return null;
}

function extractBillingCycleFromProductId(productId) {
    // Extract billing cycle from product IDs
    if (productId.includes('monthly')) return 'monthly';
    if (productId.includes('annual')) return 'annual';
    return null;
}

function calculateEndDate(startDate, billingCycle) {
    const start = new Date(startDate);
    if (billingCycle === 'annual') {
        return new Date(start.getTime() + (365 * 24 * 60 * 60 * 1000));
    } else {
        return new Date(start.getTime() + (30 * 24 * 60 * 60 * 1000));
    }
}