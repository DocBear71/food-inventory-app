// file: /src/app/api/subscription/cancel/route.js v2 - Handle both Stripe and RevenueCat cancellations

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import Stripe from 'stripe';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';
import {
    sendCancellationConfirmationEmail
} from '@/lib/email-todo-implementations';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
    try {
        console.log('❌ Processing subscription cancellation...');

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
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

        // Check if user has an active subscription
        if (user.subscription?.tier === 'free' || user.subscription?.status === 'cancelled') {
            return NextResponse.json(
                { error: 'No active subscription to cancel' },
                { status: 400 }
            );
        }

        console.log('📋 Current subscription:', {
            tier: user.subscription?.tier,
            status: user.subscription?.status,
            platform: user.subscription?.platform,
            billingCycle: user.subscription?.billingCycle
        });

        // Handle trial cancellation (immediate)
        if (user.subscription?.status === 'trial') {
            user.subscription = {
                ...user.subscription,
                tier: 'free',
                status: 'free',
                billingCycle: null,
                endDate: new Date(),
                trialStartDate: null,
                trialEndDate: null
            };

            await user.save();

            console.log('✅ Trial cancelled immediately:', {
                userId: user._id,
                email: user.email
            });

            return NextResponse.json({
                success: true,
                message: 'Trial cancelled successfully. You have been downgraded to the free plan.',
                immediate: true
            });
        }

        // Store original subscription details for email
        const originalTier = user.subscription.tier;
        const originalBillingCycle = user.subscription.billingCycle;
        const accessUntilDate = user.subscription.endDate;

        // Handle RevenueCat/App Store subscriptions
        if (user.subscription?.platform === 'revenuecat') {
            console.log('📱 Handling RevenueCat subscription cancellation');

            // For RevenueCat subscriptions, we can't cancel directly through API
            // Mark as cancelled in our database and provide Apple ID instructions
            user.subscription = {
                ...user.subscription,
                status: 'cancelled',
                // Keep access until the end of the current period
                // Don't change tier or endDate yet - that happens when it actually expires
            };

            await user.save();

            console.log('✅ RevenueCat subscription marked as cancelled:', {
                userId: user._id,
                email: user.email,
                originalTier: originalTier,
                accessUntil: accessUntilDate
            });

            // Send cancellation confirmation email
            try {
                await sendCancellationConfirmationEmail({
                    userEmail: user.email,
                    userName: user.name || 'there',
                    tier: originalTier,
                    billingCycle: originalBillingCycle,
                    accessUntilDate: accessUntilDate,
                    cancellationReason: 'Cancelled by user request via app'
                });
                console.log('✅ Cancellation confirmation email sent');
            } catch (emailError) {
                console.error('❌ Failed to send cancellation email:', emailError);
                // Don't fail the cancellation for email errors
            }

            return NextResponse.json({
                success: true,
                message: `Subscription cancelled successfully. You'll retain access to ${originalTier} features until ${new Date(accessUntilDate).toLocaleDateString()}.`,
                immediate: false,
                accessUntil: accessUntilDate,
                platform: 'revenuecat',
                additionalSteps: 'To ensure complete cancellation, also cancel through your Apple ID subscription settings.'
            });
        }

        // Handle Stripe subscriptions
        const stripeSubscriptionId = user.subscription?.stripeSubscriptionId;
        if (user.subscription?.platform === 'stripe' && stripeSubscriptionId) {
            console.log('💳 Handling Stripe subscription cancellation');

            try {
                // Cancel the subscription in Stripe (at period end)
                const cancelledSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
                    cancel_at_period_end: true,
                    metadata: {
                        cancelled_by: 'user',
                        cancelled_at: new Date().toISOString(),
                        user_id: user._id.toString()
                    }
                });

                // Update user subscription status
                user.subscription = {
                    ...user.subscription,
                    status: 'cancelled', // Mark as cancelled but keep benefits until period end
                    // Don't change tier yet - they keep access until period end
                    nextBillingDate: null
                };

                await user.save();

                const periodEnd = new Date(cancelledSubscription.current_period_end * 1000);

                console.log('✅ Stripe subscription cancelled (at period end):', {
                    userId: user._id,
                    email: user.email,
                    subscriptionId: stripeSubscriptionId,
                    accessUntil: periodEnd.toISOString()
                });

                // Send cancellation confirmation email
                try {
                    await sendCancellationConfirmationEmail({
                        userEmail: user.email,
                        userName: user.name || 'there',
                        tier: originalTier,
                        billingCycle: originalBillingCycle,
                        accessUntilDate: periodEnd,
                        cancellationReason: 'Cancelled by user request via Stripe'
                    });
                } catch (emailError) {
                    console.error('❌ Failed to send cancellation email:', emailError);
                }

                return NextResponse.json({
                    success: true,
                    message: `Subscription cancelled successfully. You'll retain access to premium features until ${periodEnd.toLocaleDateString()}.`,
                    immediate: false,
                    accessUntil: periodEnd.toISOString(),
                    platform: 'stripe'
                });

            } catch (stripeError) {
                console.error('❌ Stripe cancellation error:', stripeError);

                // If Stripe fails, still update our database
                user.subscription = {
                    ...user.subscription,
                    status: 'cancelled'
                };
                await user.save();

                return NextResponse.json({
                    success: true,
                    message: 'Subscription cancelled successfully.',
                    warning: 'There may be a delay in processing the cancellation.',
                    platform: 'stripe'
                });
            }
        }

        // Handle legacy subscriptions without platform specified
        if (!user.subscription?.platform && stripeSubscriptionId) {
            console.log('💳 Handling legacy Stripe subscription (no platform specified)');
            // Assume it's Stripe if we have a Stripe subscription ID
            // Same logic as above Stripe handling
            try {
                const cancelledSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
                    cancel_at_period_end: true,
                    metadata: {
                        cancelled_by: 'user',
                        cancelled_at: new Date().toISOString(),
                        user_id: user._id.toString()
                    }
                });

                user.subscription = {
                    ...user.subscription,
                    status: 'cancelled',
                    platform: 'stripe', // Set platform for future reference
                    nextBillingDate: null
                };

                await user.save();

                const periodEnd = new Date(cancelledSubscription.current_period_end * 1000);

                return NextResponse.json({
                    success: true,
                    message: `Subscription cancelled successfully. You'll retain access to premium features until ${periodEnd.toLocaleDateString()}.`,
                    immediate: false,
                    accessUntil: periodEnd.toISOString(),
                    platform: 'stripe'
                });
            } catch (stripeError) {
                console.error('❌ Legacy Stripe cancellation error:', stripeError);
                return NextResponse.json(
                    { error: 'Failed to cancel subscription. Please contact support.' },
                    { status: 500 }
                );
            }
        }

        // If we get here, subscription platform is unknown or unsupported
        console.error('❌ Unknown subscription platform:', {
            platform: user.subscription?.platform,
            hasStripeId: !!stripeSubscriptionId,
            hasRevenueCatId: !!user.subscription?.revenueCatCustomerId
        });

        return NextResponse.json(
            {
                error: 'Unable to determine subscription platform. Please contact support for assistance.',
                debug: {
                    platform: user.subscription?.platform || 'unknown',
                    tier: user.subscription?.tier
                }
            },
            { status: 400 }
        );

    } catch (error) {
        console.error('❌ Error cancelling subscription:', error);
        return NextResponse.json(
            { error: 'Internal server error. Please try again or contact support.' },
            { status: 500 }
        );
    }
}