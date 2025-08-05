// Create this file: /src/app/api/subscription/claim-prereg-reward/route.js

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function POST(request) {
    try {
        console.log('🎁 Processing pre-registration reward claim...');

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { source } = await request.json();

        await connectDB();

        // Get user from database
        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Check if already claimed
        if (user.subscription?.preRegRewardClaimed) {
            return NextResponse.json(
                { error: 'Pre-registration reward already claimed' },
                { status: 409 }
            );
        }

        // Check if user is already on a paid plan
        if (user.subscription?.tier !== 'free' &&
            user.subscription?.status === 'active' &&
            !user.subscription?.trialStartDate) {
            return NextResponse.json(
                { error: 'User already has an active subscription' },
                { status: 409 }
            );
        }

        console.log('✅ Activating pre-registration reward:', {
            userId: user._id,
            email: user.email,
            currentTier: user.subscription?.tier || 'free',
            source: source
        });

        // Calculate reward period (30 days from now)
        const now = new Date();
        const rewardEndDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

        // Update user subscription with pre-registration reward
        user.subscription = {
            ...user.subscription,
            tier: 'platinum', // Give them the highest tier
            status: 'active',
            billingCycle: null, // No billing for reward period

            // Pre-registration reward specific fields
            preRegRewardActive: true,
            preRegRewardClaimed: true,
            preRegRewardClaimedDate: now,
            preRegRewardEndDate: rewardEndDate,
            preRegRewardSource: source || 'google-play-prereg',

            // Set start and end dates
            startDate: now,
            endDate: rewardEndDate,

            // Clear any existing trial data
            trialStartDate: null,
            trialEndDate: null,

            // Track the reward
            rewardMetadata: {
                type: 'pre-registration',
                platform: 'google-play',
                activatedDate: now,
                originalTier: user.subscription?.tier || 'free'
            }
        };

        await user.save();

        console.log('✅ Pre-registration reward activated:', {
            userId: user._id,
            email: user.email,
            rewardEndDate: rewardEndDate.toISOString(),
            tier: 'platinum'
        });

        // Send welcome email for pre-registration reward
        try {
            const { sendSubscriptionUpgradeEmail } = await import('@/lib/email');
            await sendSubscriptionUpgradeEmail({
                userName: user.name,
                userEmail: user.email,
                newTier: 'platinum',
                previousTier: user.subscription?.tier || 'free',
                endDate: rewardEndDate,
                upgradeReason: 'Pre-registration reward activated',
                isUpgrade: true
            });
            console.log('✅ Pre-registration welcome email sent');
        } catch (emailError) {
            console.error('❌ Failed to send welcome email:', emailError);
            // Don't fail the reward claim if email fails
        }

        // Track analytics event for reward claim
        try {
            const { trackEvent } = await import('@/lib/analytics');
            await trackEvent('pre_registration_reward_claimed', {
                user_id: user._id.toString(),
                tier: 'platinum',
                reward_type: 'pre_registration',
                platform: 'google-play',
                source: source,
                reward_duration_days: 30,
                previous_tier: user.subscription?.tier || 'free',
                activated_date: now.toISOString()
            });
            console.log('✅ Pre-registration reward analytics tracked');
        } catch (analyticsError) {
            console.error('❌ Failed to track analytics:', analyticsError);
            // Don't fail the reward claim if analytics fails
        }

        return NextResponse.json({
            success: true,
            subscription: {
                tier: 'platinum',
                status: 'active',
                endDate: rewardEndDate.toISOString(),
                preRegRewardActive: true,
                rewardDaysRemaining: 30
            },
            message: 'Pre-registration reward activated successfully! You now have 30 days of premium access.'
        });

    } catch (error) {
        console.error('❌ Error claiming pre-registration reward:', error);

        return NextResponse.json(
            { error: 'Failed to claim pre-registration reward. Please try again.' },
            { status: 500 }
        );
    }
}