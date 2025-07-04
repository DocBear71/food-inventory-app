// file: /src/app/api/user/by-email/route.js

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function POST(request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        await connectDB();

        const user = await User.findOne({ email });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get effective tier
        const effectiveTier = user.getEffectiveTier?.() || 'free';
        const subscriptionTier = user.subscription?.tier || 'free';
        const isAdmin = subscriptionTier === 'admin' || effectiveTier === 'admin' || subscriptionTier === 'platinum' || effectiveTier === 'platinum';

        const userData = {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified || false,
            avatar: user.avatar || '',
            subscriptionTier: subscriptionTier,
            subscriptionStatus: user.subscription?.status || 'free',
            effectiveTier: effectiveTier,
            subscription: user.subscription || null,
            isAdmin: isAdmin,
            roles: user.roles || [],
        };

        console.log('📤 Returning user data for email:', email, userData);

        return NextResponse.json(userData);
    } catch (error) {
        console.error('Error fetching user by email:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}