// file: /src/app/api/subscription/cancel/route.js v1 - Cancel subscription

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
// authOptions no longer needed in NextAuth v5
import Stripe from 'stripe';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

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
        if (user.subscription?.tier === 'free') {
            return NextResponse.json(
                { error: 'No active subscription to cancel' },
                { status: 400 }
            );
        }

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

        // Handle paid subscription cancellation
        const stripeSubscriptionId = user.subscription?.stripeSubscriptionId;
        if (!stripeSubscriptionId) {
            return NextResponse.json(
                { error: 'No Stripe subscription found' },
                { status: 400 }
            );
        }

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

            console.log('✅ Subscription cancelled (at period end):', {
                userId: user._id,
                email: user.email,
                subscriptionId: stripeSubscriptionId,
                accessUntil: periodEnd.toISOString()
            });

            return NextResponse.json({
                success: true,
                message: `Subscription cancelled successfully. You'll retain access to premium features until ${periodEnd.toLocaleDateString()}.`,
                immediate: false,
                accessUntil: periodEnd.toISOString()
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
                warning: 'There may be a delay in processing the cancellation.'
            });
        }

    } catch (error) {
        console.error('❌ Error cancelling subscription:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}