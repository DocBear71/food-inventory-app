
// file: /src/app/api/auth/reset-password/route.js

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function POST(request) {
    try {
        const { token, password, confirmPassword } = await request.json();

        if (!token || !password || !confirmPassword) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        if (password !== confirmPassword) {
            return NextResponse.json(
                { error: 'Passwords do not match' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters long' },
                { status: 400 }
            );
        }

        // Hash the token to compare with stored hash
        const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

        await connectDB();

        // Find user with valid reset token that hasn't expired
        const user = await User.findOne({
            passwordResetToken: resetTokenHash,
            passwordResetExpires: { $gt: new Date() }
        });

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid or expired reset token' },
                { status: 400 }
            );
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Update password and remove reset token fields
        await User.findByIdAndUpdate(user._id, {
            password: hashedPassword,
            passwordResetToken: undefined,
            passwordResetExpires: undefined,
            updatedAt: new Date()
        });

        // Log password reset for audit trail
        console.log(`Password reset completed for user ${user.email} at ${new Date().toISOString()}`);

        return NextResponse.json({
            success: true,
            message: 'Password reset successfully. You can now sign in with your new password.'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
