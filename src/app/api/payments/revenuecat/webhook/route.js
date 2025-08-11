// file: /src/app/api/payments/revenuecat/webhook/route.js - Enhanced with email notifications

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';
import {
    sendWelcomeEmail,
    sendPaymentConfirmationEmail,
    sendCancellationConfirmationEmail
} from '@/lib/email-todo-implementations';

const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

export async function POST(request) {
    try {
        const body = await request.text();
        const signature = request.headers.get('authorization');

        if (REVENUECAT_WEBHOOK_SECRET && signature) {
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

        const user = await findUserByRevenueCatId(appUserId);
        if (!user) {
            console.error('❌ User not found for RevenueCat ID:', appUserId);
            return;
        }

        const tier = extractTierFromProductId(productId);
        const billingCycle = extractBillingCycleFromProductId(productId);

        if (!tier || !billingCycle) {
            console.error('❌ Could not determine tier/billing from product:', productId);
            return;
        }

        const subscriptionEndDate = calculateEndDate(eventTimestamp, billingCycle);
        const isNewCustomer = !user.subscription || user.subscription.tier === 'free';

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
            nextBillingDate: subscriptionEndDate,
            trialStartDate: null,
            trialEndDate: null
        };

        await user.save();

        console.log('✅ Initial purchase processed:', {
            userId: user._id,
            tier: tier,
            productId: productId
        });

        // ✅ IMPLEMENTED: Send welcome email for new RevenueCat subscription
        try {
            await sendWelcomeEmail({
                userEmail: user.email,
                userName: user.name || 'there',
                tier: tier,
                billingCycle: billingCycle,
                isNewUser: isNewCustomer,
                previousTier: user.subscription?.tier || 'free',
                endDate: subscriptionEndDate.toISOString()
            });
        } catch (emailError) {
            console.error('❌ Failed to send welcome email:', emailError);
        }

        // Send payment confirmation
        try {
            await sendPaymentConfirmationEmail({
                userEmail: user.email,
                userName: user.name || 'there',
                amount: getPriceForTier(tier, billingCycle),
                currency: 'USD',
                invoiceId: event.event.transaction_id || 'RevenueCat Transaction',
                tier: tier,
                billingCycle: billingCycle,
                nextBillingDate: subscriptionEndDate.toISOString(),
                paymentMethod: 'App Store'
            });
        } catch (emailError) {
            console.error('❌ Failed to send payment confirmation email:', emailError);
        }

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

        // ✅ IMPLEMENTED: Send renewal payment confirmation
        try {
            await sendPaymentConfirmationEmail({
                userEmail: user.email,
                userName: user.name || 'there',
                amount: getPriceForTier(user.subscription.tier, billingCycle),
                currency: 'USD',
                invoiceId: event.event.transaction_id || 'RevenueCat Renewal',
                tier: user.subscription.tier,
                billingCycle: billingCycle,
                nextBillingDate: newEndDate.toISOString(),
                paymentMethod: 'App Store'
            });
        } catch (emailError) {
            console.error('❌ Failed to send renewal confirmation email:', emailError);
        }

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

        user.subscription = {
            ...user.subscription,
            status: 'cancelled'
        };

        await user.save();

        console.log('✅ Cancellation processed:', {
            userId: user._id,
            accessUntil: user.subscription.endDate
        });

        // ✅ IMPLEMENTED: Send cancellation confirmation
        try {
            await sendCancellationConfirmationEmail({
                userEmail: user.email,
                userName: user.name || 'there',
                tier: user.subscription.tier,
                billingCycle: user.subscription.billingCycle,
                accessUntilDate: user.subscription.endDate,
                cancellationReason: 'Cancelled via App Store'
            });
        } catch (emailError) {
            console.error('❌ Failed to send cancellation email:', emailError);
        }

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

        user.subscription = {
            ...user.subscription,
            status: 'active'
        };

        await user.save();

        console.log('✅ Uncancellation processed:', {
            userId: user._id
        });

        // Send reactivation notification (using welcome email template)
        try {
            await sendWelcomeEmail({
                userEmail: user.email,
                userName: user.name || 'there',
                tier: user.subscription.tier,
                billingCycle: user.subscription.billingCycle,
                isNewUser: false,
                previousTier: 'cancelled',
                endDate: user.subscription.endDate
            });
        } catch (emailError) {
            console.error('❌ Failed to send reactivation email:', emailError);
        }

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

        // Note: No email needed for expiration as it's expected

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

        user.subscription = {
            ...user.subscription,
            status: 'past_due'
        };

        await user.save();

        console.log('⚠️ Billing issue processed:', {
            userId: user._id
        });

        // ✅ IMPLEMENTED: Send billing issue notification
        try {
            const { sendPaymentFailedEmail } = await import('@/lib/email-todo-implementations');
            await sendPaymentFailedEmail({
                userEmail: user.email,
                userName: user.name || 'there',
                amount: getPriceForTier(user.subscription.tier, user.subscription.billingCycle),
                currency: 'USD',
                attemptCount: 1,
                nextRetryDate: null,
                tier: user.subscription.tier,
                billingCycle: user.subscription.billingCycle,
                reason: 'Billing issue detected via App Store'
            });
        } catch (emailError) {
            console.error('❌ Failed to send billing issue email:', emailError);
        }

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

        const newTier = extractTierFromProductId(newProductId);
        const newBillingCycle = extractBillingCycleFromProductId(newProductId);

        if (!newTier || !newBillingCycle) {
            console.error('❌ Could not determine new tier/billing from product:', newProductId);
            return;
        }

        const oldTier = user.subscription?.tier;
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
            oldTier: oldTier
        });

        // Send tier change notification (using upgrade email)
        try {
            const { sendSubscriptionUpgradeEmail } = await import('@/lib/email');
            await sendSubscriptionUpgradeEmail({
                userEmail: user.email,
                userName: user.name || 'there',
                newTier: newTier,
                previousTier: oldTier,
                endDate: newEndDate.toISOString(),
                upgradeReason: 'Plan changed via App Store',
                isUpgrade: getTierValue(newTier) > getTierValue(oldTier)
            });
        } catch (emailError) {
            console.error('❌ Failed to send tier change email:', emailError);
        }

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

// ENHANCED: Helper functions with better user matching

async function findUserByRevenueCatId(revenueCatId) {
    console.log('🔍 Looking for user with RevenueCat ID:', revenueCatId);

    // Try to find user by RevenueCat customer ID
    let user = await User.findOne({
        'subscription.revenueCatCustomerId': revenueCatId
    });

    if (user) {
        console.log('✅ Found user by RevenueCat customer ID:', user.email);
        return user;
    }

    // ENHANCED: Try multiple fallback strategies

    // Strategy 1: If RevenueCat ID looks like our user ID (MongoDB ObjectId)
    if (revenueCatId.match(/^[0-9a-fA-F]{24}$/)) {
        console.log('🔍 Trying user ID lookup...');
        user = await User.findById(revenueCatId);
        if (user) {
            console.log('✅ Found user by ID match:', user.email);
            // Update their subscription with the RevenueCat customer ID for future lookups
            if (!user.subscription) {
                user.subscription = {};
            }
            user.subscription.revenueCatCustomerId = revenueCatId;
            await user.save();
            return user;
        }
    }

    // Strategy 2: If RevenueCat ID looks like an email
    if (revenueCatId.includes('@')) {
        console.log('🔍 Trying email lookup...');
        user = await User.findOne({ email: revenueCatId });
        if (user) {
            console.log('✅ Found user by email match:', user.email);
            // Update their subscription with the RevenueCat customer ID
            if (!user.subscription) {
                user.subscription = {};
            }
            user.subscription.revenueCatCustomerId = revenueCatId;
            await user.save();
            return user;
        }
    }

    // Strategy 3: Look for any recent user who made a purchase but doesn't have RevenueCat ID stored yet
    console.log('🔍 Trying recent purchase lookup...');
    const recentUsers = await User.find({
        'subscription.platform': 'revenuecat',
        'subscription.revenueCatCustomerId': { $exists: false },
        'subscription.startDate': {
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
    }).sort({ 'subscription.startDate': -1 }).limit(5);

    if (recentUsers.length > 0) {
        console.log(`🔍 Found ${recentUsers.length} recent RevenueCat users without customer ID`);
        console.log('Recent users:', recentUsers.map(u => ({ id: u._id, email: u.email })));
    }

    console.log('❌ No user found for RevenueCat ID:', revenueCatId);
    return null;
}

function extractTierFromProductId(productId) {
    if (productId.includes('gold')) return 'gold';
    if (productId.includes('platinum')) return 'platinum';
    return null;
}

function extractBillingCycleFromProductId(productId) {
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

function getPriceForTier(tier, billingCycle) {
    const prices = {
        gold: { monthly: '4.99', annual: '49.99' },
        platinum: { monthly: '9.99', annual: '99.99' }
    };
    return prices[tier]?.[billingCycle] || '0.00';
}

function getTierValue(tier) {
    const values = { free: 0, gold: 1, platinum: 2, admin: 3 };
    return values[tier] || 0;
}