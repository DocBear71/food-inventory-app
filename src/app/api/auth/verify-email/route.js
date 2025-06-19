// FILE 1: /src/app/api/auth/verify-email/route.js
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.redirect(new URL('/auth/signin?error=missing-token', request.url));
        }

        // Hash the token to compare with stored hash
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        await connectDB();

        // Find user with valid verification token that hasn't expired
        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { $gt: new Date() }
        });

        if (!user) {
            return NextResponse.redirect(new URL('/auth/signin?error=invalid-token', request.url));
        }

        // Check if already verified
        if (user.emailVerified) {
            return NextResponse.redirect(new URL('/auth/signin?message=already-verified', request.url));
        }

        // Verify the email
        await user.verifyEmail();

        console.log(`Email verified for user: ${user.email}`);

        // Redirect to signin with success message
        return NextResponse.redirect(new URL('/auth/signin?message=email-verified', request.url));

    } catch (error) {
        console.error('Email verification error:', error);
        return NextResponse.redirect(new URL('/auth/signin?error=verification-failed', request.url));
    }
}

export async function POST(request) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json(
                { error: 'Verification token is required' },
                { status: 400 }
            );
        }

        // Hash the token to compare with stored hash
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        await connectDB();

        // Find user with valid verification token that hasn't expired
        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { $gt: new Date() }
        });

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid or expired verification token' },
                { status: 400 }
            );
        }

        // Check if already verified
        if (user.emailVerified) {
            return NextResponse.json({
                success: true,
                message: 'Email already verified',
                alreadyVerified: true
            });
        }

        // Verify the email
        await user.verifyEmail();

        console.log(`Email verified for user: ${user.email}`);

        return NextResponse.json({
            success: true,
            message: 'Email verified successfully! You can now sign in.',
            user: {
                id: user._id,
                email: user.email,
                emailVerified: true
            }
        });

    } catch (error) {
        console.error('Email verification error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
