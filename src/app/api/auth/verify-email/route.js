// file: /src/app/api/auth/verify-email/route.js v3 - FIXED: Properly handle hashed verification tokens

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

        await connectDB();

        // FIXED: Hash the incoming token to match what's stored in the database
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Find user with the hashed verification token that hasn't expired
        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { $gt: new Date() }
        }).select('+emailVerificationToken +emailVerificationExpires');

        if (!user) {
            console.log('No user found with token or token expired');
            return NextResponse.redirect(new URL('/auth/signin?error=invalid-token', request.url));
        }

        // Check if already verified
        if (user.emailVerified) {
            return NextResponse.redirect(new URL('/auth/signin?message=already-verified', request.url));
        }

        // Mark email as verified and clear verification fields
        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        user.emailVerifiedAt = new Date();

        // Save the user with updated verification status
        await user.save();

        console.log(`Email verified successfully for user: ${user.email}`);

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

        // FIXED: Hash the incoming token to match what's stored in the database
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Find user with the hashed verification token that hasn't expired
        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { $gt: new Date() }
        }).select('+emailVerificationToken +emailVerificationExpires');

        if (!user) {
            console.log('No user found with token or token expired');
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

        // Mark email as verified and clear verification fields
        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        user.emailVerifiedAt = new Date();

        // Save the user with updated verification status
        await user.save();

        console.log(`Email verified successfully for user: ${user.email}`);

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