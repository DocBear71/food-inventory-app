// file: /src/app/api/subscription/start-trial/route.js v3 - Added RevenueCat support

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';
import {
    sendWelcomeEmail
} from '@/lib/email-todo-implementations';

export async function POST(request) {
    try {
        console.log('🎯 Starting trial...');

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { source } = body || {};

        await connectDB();

        // Get user from database
        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        console.log('📊 Current subscription status:', {
            tier: user.subscription?.tier,
            status: user.subscription?.status,
            platform: user.subscription?.platform,
            hasUsedFreeTrial: user.subscription?.hasUsedFreeTrial
        });

        // Check if user is eligible for trial
        if (user.subscription?.tier !== 'free' && user.subscription?.tier !== undefined) {
            return NextResponse.json(
                { error: 'Trial is only available for free tier users' },
                { status: 400 }
            );
        }

        // CRITICAL: Check if user has already used their FREE TRIAL (permanent check)
        if (user.subscription?.hasUsedFreeTrial) {
            return NextResponse.json(
                { error: 'You have already used your free trial. Each user is only eligible for one free trial.' },
                { status: 400 }
            );
        }

        // ADDITIONAL: Check if user is currently in an active trial
        if (user.subscription?.status === 'trial' &&
            user.subscription?.trialEndDate &&
            new Date() < new Date(user.subscription.trialEndDate)) {
            return NextResponse.json(
                { error: 'You already have an active trial' },
                { status: 400 }
            );
        }

        // ENHANCED: Check for existing paid subscription (RevenueCat or Stripe)
        const hasActivePaidSubscription = user.subscription && (
            (user.subscription.platform === 'revenuecat' &&
                user.subscription.status === 'active' &&
                user.subscription.tier !== 'free') ||
            (user.subscription.platform === 'stripe' &&
                user.subscription.stripeSubscriptionId &&
                user.subscription.status === 'active')
        );

        if (hasActivePaidSubscription) {
            return NextResponse.json(
                { error: 'You already have an active subscription' },
                { status: 400 }
            );
        }

        // Set up 7-day Platinum trial
        const now = new Date();
        const trialEnd = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days

        // ENHANCED: Preserve existing subscription data while setting trial
        const existingSubscription = user.subscription || {};

        user.subscription = {
            ...existingSubscription, // Preserve any existing data
            tier: 'platinum', // Give them full Platinum access during trial
            status: 'trial',
            billingCycle: null, // They'll choose after trial
            startDate: now,
            endDate: null, // Will be set when they subscribe to paid plan
            trialStartDate: now,
            trialEndDate: trialEnd,
            hasUsedFreeTrial: true, // CRITICAL: Mark that they've used their free trial (PERMANENT)

            // Preserve platform information if it exists
            platform: existingSubscription.platform || null,

            // Clear any payment-related fields during trial
            stripeCustomerId: existingSubscription.stripeCustomerId || null,
            stripeSubscriptionId: null, // No Stripe subscription during trial
            revenueCatCustomerId: existingSubscription.revenueCatCustomerId || null,
            lastPaymentDate: null,
            nextBillingDate: null
        };

        await user.save();

        console.log('✅ Trial started successfully:', {
            userId: user._id,
            email: user.email,
            trialStart: now.toISOString(),
            trialEnd: trialEnd.toISOString(),
            hasUsedFreeTrial: true, // Log this important flag
            platform: user.subscription.platform || 'none',
            source: source || 'unknown'
        });

        // Send welcome email for trial
        try {
            await sendWelcomeEmail({
                userEmail: user.email,
                userName: user.name || 'there',
                tier: 'platinum',
                billingCycle: 'trial',
                endDate: trialEnd.toISOString(),
                isNewUser: false,
                previousTier: 'free',
                isTrial: true
            });
            console.log('✅ Trial welcome email sent');
        } catch (emailError) {
            console.error('❌ Failed to send trial welcome email:', emailError);
            // Don't fail the trial for email errors
        }

        return NextResponse.json({
            success: true,
            message: '7-day Platinum trial started successfully!',
            subscription: {
                tier: 'platinum',
                status: 'trial',
                trialStartDate: now.toISOString(),
                trialEndDate: trialEnd.toISOString(),
                hasUsedFreeTrial: true,
                platform: user.subscription.platform || null
            }
        });

    } catch (error) {
        console.error('❌ Error starting trial:', error);

        // Handle specific error types
        if (error.name === 'MongoError' || error.name === 'MongooseError') {
            return NextResponse.json(
                { error: 'Database error. Please try again.' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error. Please try again or contact support.' },
            { status: 500 }
        );
    }
}