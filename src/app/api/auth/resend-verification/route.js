// file: /src/app/api/auth/resend-verification/route.js v3 - Fixed to work with actual User schema
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';
import { sendEmailVerificationEmail } from '@/lib/email';

export async function POST(request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        console.log(`Resend verification request for: ${email}`);

        await connectDB();

        // Find user - include the verification fields that are normally hidden
        const user = await User.findOne({ email: email.toLowerCase() })
            .select('+emailVerificationToken +emailVerificationExpires +emailVerificationRequestedAt');

        if (!user) {
            // Don't reveal if user exists or not for security
            console.log(`User not found for email: ${email}`);
            return NextResponse.json({
                success: true,
                message: 'If an account with that email exists, a verification email has been sent.'
            });
        }

        console.log(`User found: ${user.email}, verified: ${user.emailVerified}`);

        // Check if already verified
        if (user.emailVerified) {
            return NextResponse.json(
                { error: 'Email is already verified' },
                { status: 400 }
            );
        }

        // Check rate limiting (simple time-based check)
        const now = new Date();
        const lastRequested = user.emailVerificationRequestedAt;
        const cooldownMinutes = 1; // 1 minute cooldown

        if (lastRequested && (now - lastRequested) < (cooldownMinutes * 60 * 1000)) {
            console.log(`Rate limit exceeded for ${email}. Last request: ${lastRequested}`);
            return NextResponse.json(
                { error: 'Please wait a moment before requesting another verification email.' },
                { status: 429 }
            );
        }

        // Generate new verification token (same logic as registration)
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const hashedVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

        console.log(`Generated new verification token for ${email}`);

        // Update user with new token and timestamp
        user.emailVerificationToken = hashedVerificationToken;
        user.emailVerificationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        user.emailVerificationRequestedAt = now;
        await user.save();

        console.log(`Updated user record for ${email} with new verification token`);

        // Send verification email
        try {
            console.log(`Attempting to resend verification email to ${user.email}...`);
            console.log('Email service config check:', {
                hasResendKey: !!process.env.RESEND_API_KEY,
                fromEmail: process.env.FROM_EMAIL || 'noreply@docbearscomfort.kitchen',
                baseUrl: process.env.NEXTAUTH_URL || process.env.APP_URL
            });

            const emailResult = await sendEmailVerificationEmail(user.email, verificationToken, user.name);
            console.log(`Verification email resent successfully to ${user.email}`, emailResult);
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
            console.error('Email error details:', {
                message: emailError.message,
                stack: emailError.stack,
                email: user.email,
                hasToken: !!verificationToken,
                resendApiKey: process.env.RESEND_API_KEY ? 'configured' : 'missing',
                fromEmail: process.env.FROM_EMAIL,
                baseUrl: process.env.NEXTAUTH_URL || process.env.APP_URL,
                timestamp: new Date().toISOString()
            });
            return NextResponse.json(
                { error: 'Failed to send verification email. Please try again or contact support.' },
                { status: 500 }
            );
        }

        console.log(`Resend verification completed successfully for ${email}`);

        return NextResponse.json({
            success: true,
            message: 'Verification email sent! Please check your inbox and spam folder.'
        });

    } catch (error) {
        console.error('Resend verification error:', error);
        console.error('Full error details:', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}