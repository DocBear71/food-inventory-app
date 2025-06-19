// FILE 2: /src/app/api/auth/resend-verification/route.js
import { NextResponse } from 'next/server';
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

        await connectDB();

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            // Don't reveal if user exists or not for security
            return NextResponse.json({
                success: true,
                message: 'If an account with that email exists, a verification email has been sent.'
            });
        }

        // Check if already verified
        if (user.emailVerified) {
            return NextResponse.json(
                { error: 'Email is already verified' },
                { status: 400 }
            );
        }

        // Check rate limiting
        if (!user.canRequestEmailVerification()) {
            return NextResponse.json(
                { error: 'Too many verification requests. Please try again later.' },
                { status: 429 }
            );
        }

        // Generate new verification token
        const verificationToken = user.generateEmailVerificationToken();
        await user.save();

        // Send verification email
        try {
            await sendEmailVerificationEmail(user.email, verificationToken, user.name);
            console.log(`Verification email resent to ${user.email}`);
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
            return NextResponse.json(
                { error: 'Failed to send verification email' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Verification email sent! Please check your inbox.'
        });

    } catch (error) {
        console.error('Resend verification error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}