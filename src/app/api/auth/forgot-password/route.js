// file: /src/app/api/auth/forgot-password/route.js - UPDATED WITH EMAIL SENDING

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Please enter a valid email address' },
                { status: 400 }
            );
        }

        await connectDB();

        const user = await User.findOne({ email: email.toLowerCase() });

        // Always return success for security (don't reveal if email exists)
        // But only send email if user actually exists
        if (user) {
            // Check rate limiting
            if (!user.canRequestPasswordReset()) {
                console.log(`Password reset rate limit exceeded for ${email}`);
                // Still return success to not reveal information
                return NextResponse.json({
                    success: true,
                    message: 'If an account with that email exists, we have sent a password reset link to your email address.'
                });
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
            const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            // Save reset token to user and track the request
            await User.findByIdAndUpdate(user._id, {
                passwordResetToken: resetTokenHash,
                passwordResetExpires: resetTokenExpiry,
                updatedAt: new Date()
            });

            // Track the reset request for rate limiting
            await user.trackPasswordResetRequest();

            try {
                // Send the password reset email
                const emailResult = await sendPasswordResetEmail(user.email, resetToken);

                console.log(`Password reset email sent successfully to ${email}:`, emailResult);

                // Log for audit trail (remove sensitive data)
                console.log(`Password reset requested for ${email} at ${new Date().toISOString()}`);

            } catch (emailError) {
                console.error('Failed to send password reset email:', emailError);

                // Clear the reset token if email sending failed
                await User.findByIdAndUpdate(user._id, {
                    passwordResetToken: undefined,
                    passwordResetExpires: undefined
                });

                // Return an error since the email couldn't be sent
                return NextResponse.json(
                    { error: 'Failed to send password reset email. Please try again later.' },
                    { status: 500 }
                );
            }
        } else {
            // User doesn't exist, but we still log the attempt
            console.log(`Password reset requested for non-existent email: ${email}`);
        }

        return NextResponse.json({
            success: true,
            message: 'If an account with that email exists, we have sent a password reset link to your email address.'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json(
            { error: 'Internal server error. Please try again later.' },
            { status: 500 }
        );
    }
}