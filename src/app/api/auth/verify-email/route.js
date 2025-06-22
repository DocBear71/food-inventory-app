// file: /src/app/api/auth/verify-email/route.js v2 - Fixed to work with User model verification methods

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.redirect(new URL('/auth/signin?error=missing-token', request.url));
        }

        await connectDB();

        // Find user with the verification token that hasn't expired
        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: new Date() }
        }).select('+emailVerificationToken +emailVerificationExpires');

        if (!user) {
            return NextResponse.redirect(new URL('/auth/signin?error=invalid-token', request.url));
        }

        // Check if already verified
        if (user.emailVerified) {
            return NextResponse.redirect(new URL('/auth/signin?message=already-verified', request.url));
        }

        // Use the verifyEmailWithToken method
        const isValid = user.verifyEmailWithToken(token);

        if (!isValid) {
            return NextResponse.redirect(new URL('/auth/signin?error=invalid-token', request.url));
        }

        // Save the user with updated verification status
        await user.save();

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

        await connectDB();

        // Find user with the verification token that hasn't expired
        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: new Date() }
        }).select('+emailVerificationToken +emailVerificationExpires');

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

        // Use the verifyEmailWithToken method
        const isValid = user.verifyEmailWithToken(token);

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid or expired verification token' },
                { status: 400 }
            );
        }

        // Save the user with updated verification status
        await user.save();

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