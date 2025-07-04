// file: /src/app/api/auth/restore-session/route.js
// Restores NextAuth session from mobile session data

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function POST(request) {
    try {
        console.log('🔄 Session restoration API called');

        const { mobileSession } = await request.json();

        if (!mobileSession?.user?.email) {
            return NextResponse.json(
                { error: 'Invalid mobile session data' },
                { status: 400 }
            );
        }

        console.log('📱 Restoring session for:', mobileSession.user.email);

        // Verify user exists in database
        await connectDB();
        const user = await User.findOne({ email: mobileSession.user.email });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        console.log('✅ User verified in database');

        // Create JWT token for NextAuth compatibility
        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
        const jwt = await new SignJWT({
            email: user.email,
            name: user.name,
            id: user._id.toString(),
            emailVerified: user.emailVerified || false,
            avatar: user.avatar || '',
            subscriptionTier: user.subscription?.tier || 'free',
            subscriptionStatus: user.subscription?.status || 'free',
            effectiveTier: user.getEffectiveTier?.() || 'free',
            subscription: user.subscription || null,
            isAdmin: (user.subscription?.tier === 'admin' || user.subscription?.tier === 'platinum'),
            roles: user.roles || [],
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
            sub: user._id.toString()
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(secret);

        console.log('🎫 JWT token created');

        // Set NextAuth session cookie
        const cookieStore = cookies();
        cookieStore.set('next-auth.session-token', jwt, {
            httpOnly: true,
            secure: false, // Set to false for mobile
            sameSite: 'lax',
            path: '/',
            maxAge: 24 * 60 * 60 // 24 hours
        });

        console.log('🍪 Session cookie set');

        return NextResponse.json({
            success: true,
            message: 'Session restored successfully',
            user: {
                email: user.email,
                name: user.name,
                id: user._id.toString()
            }
        });

    } catch (error) {
        console.error('Session restoration error:', error);
        return NextResponse.json(
            { error: 'Session restoration failed' },
            { status: 500 }
        );
    }
}