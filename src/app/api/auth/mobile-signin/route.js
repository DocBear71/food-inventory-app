// file: /src/app/api/auth/mobile-signin/route.js - Direct mobile authentication bypass

import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';
import { SignJWT } from 'jose';

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

export async function POST(request) {
    try {
        // Check if this is a mobile app request
        const userAgent = request.headers.get('user-agent') || '';
        const mobileAppHeader = request.headers.get('x-mobile-app');
        const isMobileApp = mobileAppHeader === 'docbears-comfort-kitchen' ||
            userAgent.includes('CapacitorHttp') ||
            userAgent.includes('DocBear');

        if (!isMobileApp) {
            return new Response(
                JSON.stringify({ error: 'This endpoint is for mobile apps only' }),
                { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
        }

        console.log('📱 Mobile signin request from:', userAgent);

        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return new Response(
                JSON.stringify({ error: 'Email and password are required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        await connectDB();

        const user = await User.findOne({ email });

        if (!user) {
            return new Response(
                JSON.stringify({ error: 'Invalid credentials' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return new Response(
                JSON.stringify({ error: 'Invalid credentials' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Check email verification
        if (!user.emailVerified) {
            return new Response(
                JSON.stringify({
                    error: 'email-not-verified',
                    message: 'Please verify your email before signing in'
                }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Update user data (trial expiration, usage reset, etc.)
        const trialExpired = user.checkAndExpireTrial();
        const usageReset = user.checkAndResetMonthlyUsage();

        if (trialExpired || usageReset) {
            await user.save();
        }

        // Get effective tier and admin status
        const effectiveTier = user.getEffectiveTier?.() || 'free';
        const subscriptionTier = user.subscription?.tier || 'free';
        const isAdmin = user.isAdmin === true ||
            effectiveTier === 'admin' ||
            (effectiveTier === 'platinum' && user.subscription?.status === 'active');

        // Create session data
        const sessionData = {
            user: {
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
                createdAt: user.createdAt,
                usage: {
                    monthlyReceiptScans: user.usageTracking?.monthlyReceiptScans || 0,
                    monthlyUPCScans: user.usageTracking?.monthlyUPCScans || 0,
                    totalInventoryItems: user.usageTracking?.totalInventoryItems || 0,
                    totalPersonalRecipes: user.usageTracking?.totalPersonalRecipes || 0,
                    totalRecipeCollections: user.usageTracking?.totalRecipeCollections || 0,
                    totalSavedRecipes: user.usageTracking?.totalSavedRecipes || user.savedRecipes?.length || 0,
                }
            },
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        };

        // Create a mobile session token
        const token = await new SignJWT({
            sub: user._id.toString(),
            email: user.email,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        })
            .setProtectedHeader({ alg: 'HS256' })
            .sign(secret);

        console.log('✅ Mobile authentication successful for:', user.email);

        return new Response(
            JSON.stringify({
                success: true,
                session: sessionData,
                token: token,
                message: 'Mobile authentication successful'
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Mobile-Auth': 'success'
                }
            }
        );

    } catch (error) {
        console.error('📱 Mobile signin error:', error);
        return new Response(
            JSON.stringify({
                error: 'Authentication failed',
                message: 'Internal server error'
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}