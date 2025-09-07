// Create this new file: /src/app/api/debug/fix-subscription/route.js

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        await connectDB();
        const user = await User.findById(session.user.id);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        console.log('Current subscription data:', user.subscription);

        // Fix the subscription data
        if (user.subscription && user.subscription.tier !== 'free') {
            // Set platform to revenuecat if it's missing
            if (!user.subscription.platform) {
                user.subscription.platform = 'revenuecat';
            }

            // Ensure hasUsedFreeTrial is set
            if (user.subscription.hasUsedFreeTrial === undefined) {
                user.subscription.hasUsedFreeTrial = true;
            }

            await user.save();

            return NextResponse.json({
                success: true,
                message: 'Subscription data fixed',
                before: {
                    tier: user.subscription.tier,
                    platform: user.subscription.platform || 'undefined',
                    hasUsedFreeTrial: user.subscription.hasUsedFreeTrial
                },
                after: user.subscription
            });
        } else {
            return NextResponse.json({
                success: false,
                message: 'No paid subscription found to fix',
                currentSubscription: user.subscription
            });
        }

    } catch (error) {
        console.error('Error fixing subscription:', error);
        return NextResponse.json(
            { error: 'Failed to fix subscription' },
            { status: 500 }
        );
    }
}