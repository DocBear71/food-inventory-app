// file: /src/app/api/subscription/start-trial/route.js v1 - Start 7-day Platinum trial

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function POST(request) {
    try {
        console.log('🎯 Starting trial...');

        const session = await getServerSession(authOptions);
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

        // Check if user is eligible for trial
        if (user.subscription?.tier !== 'free') {
            return NextResponse.json(
                { error: 'Trial is only available for free tier users' },
                { status: 400 }
            );
        }

        // Check if user has already used their trial
        if (user.subscription?.trialStartDate) {
            return NextResponse.json(
                { error: 'Trial has already been used' },
                { status: 400 }
            );
        }

        // Set up 7-day Platinum trial
        const now = new Date();
        const trialEnd = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days

        user.subscription = {
            ...user.subscription,
            tier: 'platinum', // Give them full Platinum access during trial
            status: 'trial',
            billingCycle: null, // They'll choose after trial
            startDate: now,
            endDate: null, // Will be set when they subscribe
            trialStartDate: now,
            trialEndDate: trialEnd,
            stripeCustomerId: user.subscription?.stripeCustomerId || null,
            stripeSubscriptionId: null,
            lastPaymentDate: null,
            nextBillingDate: null
        };

        await user.save();

        console.log('✅ Trial started successfully:', {
            userId: user._id,
            email: user.email,
            trialStart: now.toISOString(),
            trialEnd: trialEnd.toISOString(),
            source: source || 'unknown'
        });

        return NextResponse.json({
            success: true,
            message: '7-day Platinum trial started successfully!',
            trialEndDate: trialEnd.toISOString(),
            tier: 'platinum',
            status: 'trial'
        });

    } catch (error) {
        console.error('❌ Error starting trial:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}