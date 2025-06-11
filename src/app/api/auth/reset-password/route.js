// file: /src/app/api/auth/reset-password/route.js v2

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

// Strong password validation function (same as register)
const validatePassword = (password) => {
    const errors = [];

    if (!password || typeof password !== 'string') {
        return ['Password is required'];
    }

    if (password.length < 8) {
        errors.push('at least 8 characters');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('one number');
    }

    if (!/[!@#$%^&*]/.test(password)) {
        errors.push('one special character (!@#$%^&*)');
    }

    return errors;
};

export async function POST(request) {
    try {
        const { token, password, confirmPassword } = await request.json();

        // Validation
        if (!token || !password || !confirmPassword) {
            return NextResponse.json(
                { error: 'Token, password, and confirm password are required' },
                { status: 400 }
            );
        }

        if (password !== confirmPassword) {
            return NextResponse.json(
                { error: 'Passwords do not match' },
                { status: 400 }
            );
        }

        // Strong password validation
        const passwordErrors = validatePassword(password);
        if (passwordErrors.length > 0) {
            return NextResponse.json(
                { error: `Password must contain ${passwordErrors.join(', ')}` },
                { status: 400 }
            );
        }

        await connectDB();

        // Hash the token to match stored version
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Find user with valid reset token
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid or expired reset token' },
                { status: 400 }
            );
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Update user password and clear reset fields
        user.password = hashedPassword;
        await user.clearPasswordReset();

        console.log(`Password reset successful for user: ${user.email}`);

        return NextResponse.json({
            success: true,
            message: 'Password has been reset successfully'
        });

    } catch (error) {
        console.error('Password reset error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}