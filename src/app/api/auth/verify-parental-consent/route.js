// FILE 1: /src/app/api/auth/verify-parental-consent/route.js

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.redirect(new URL('/auth/verify-parental-consent?error=missing-token', request.url));
        }

        await connectDB();

        // Hash the incoming token to match what's stored in the database (same pattern as email verification)
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Find user with the hashed parent verification token that hasn't expired
        const user = await User.findOne({
            'legalAcceptance.parentVerificationToken': hashedToken,
            'legalAcceptance.parentVerificationExpires': { $gt: new Date() },
            'legalAcceptance.parentVerificationCompleted': false
        }).select('+legalAcceptance.parentVerificationToken +legalAcceptance.parentVerificationExpires');

        if (!user) {
            console.log('No user found with parental consent token or token expired');
            return NextResponse.redirect(new URL('/auth/verify-parental-consent?error=invalid-token', request.url));
        }

        // Check if already verified
        if (user.legalAcceptance.parentVerificationCompleted) {
            return NextResponse.redirect(new URL('/auth/verify-parental-consent?message=already-verified', request.url));
        }

        // Mark parental consent as verified and clear verification fields
        user.legalAcceptance.parentVerificationCompleted = true;
        user.legalAcceptance.parentVerificationCompletedAt = new Date();
        user.legalAcceptance.parentVerificationToken = undefined;
        user.legalAcceptance.parentVerificationExpires = undefined;

        // Save the user with updated verification status
        await user.save();

        console.log(`Parental consent verified successfully for user: ${user.email} (minor: ${user.name})`);

        // Redirect to verification page with success message
        return NextResponse.redirect(new URL('/auth/verify-parental-consent?message=consent-verified', request.url));

    } catch (error) {
        console.error('Parental consent verification error:', error);
        return NextResponse.redirect(new URL('/auth/verify-parental-consent?error=verification-failed', request.url));
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

        // Hash the incoming token to match what's stored in the database
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Find user with the hashed parent verification token that hasn't expired
        const user = await User.findOne({
            'legalAcceptance.parentVerificationToken': hashedToken,
            'legalAcceptance.parentVerificationExpires': { $gt: new Date() },
            'legalAcceptance.parentVerificationCompleted': false
        }).select('+legalAcceptance.parentVerificationToken +legalAcceptance.parentVerificationExpires');

        if (!user) {
            console.log('No user found with parental consent token or token expired');
            return NextResponse.json(
                { error: 'Invalid or expired verification token' },
                { status: 400 }
            );
        }

        // Check if already verified
        if (user.legalAcceptance.parentVerificationCompleted) {
            return NextResponse.json({
                success: true,
                message: 'Parental consent already verified',
                alreadyVerified: true
            });
        }

        // Mark parental consent as verified and clear verification fields
        user.legalAcceptance.parentVerificationCompleted = true;
        user.legalAcceptance.parentVerificationCompletedAt = new Date();
        user.legalAcceptance.parentVerificationToken = undefined;
        user.legalAcceptance.parentVerificationExpires = undefined;

        // Save the user with updated verification status
        await user.save();

        console.log(`Parental consent verified successfully for user: ${user.email} (minor: ${user.name})`);

        return NextResponse.json({
            success: true,
            message: 'Parental consent verified successfully! The child account is now fully active.',
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                parentVerificationCompleted: true
            }
        });

    } catch (error) {
        console.error('Parental consent verification error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}