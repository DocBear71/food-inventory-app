// file: /src/app/api/auth/change-password/route.js

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
// authOptions no longer needed in NextAuth v5
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function POST(request) {
    try {
        // Check if user is authenticated
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'You must be signed in to change your password' },
                { status: 401 }
            );
        }

        const { currentPassword, newPassword, confirmPassword } = await request.json();

        // Server-side validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        if (newPassword !== confirmPassword) {
            return NextResponse.json(
                { error: 'New passwords do not match' },
                { status: 400 }
            );
        }

        if (currentPassword === newPassword) {
            return NextResponse.json(
                { error: 'New password must be different from your current password' },
                { status: 400 }
            );
        }

        // Strong password validation
        const validatePassword = (password) => {
            const errors = [];

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

        const passwordErrors = validatePassword(newPassword);
        if (passwordErrors.length > 0) {
            return NextResponse.json(
                { error: `Password must contain ${passwordErrors.join(', ')}` },
                { status: 400 }
            );
        }

        await connectDB();

        // Get the user from database
        const user = await User.findById(session.user.id);

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

        if (!isCurrentPasswordValid) {
            return NextResponse.json(
                { error: 'Current password is incorrect' },
                { status: 400 }
            );
        }

        // Hash the new password
        const saltRounds = 12;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update user's password in database
        await User.findByIdAndUpdate(user._id, {
            password: hashedNewPassword,
            updatedAt: new Date()
        });

        // Clear any existing password reset tokens (user changed password successfully)
        await User.findByIdAndUpdate(user._id, {
            passwordResetToken: undefined,
            passwordResetExpires: undefined,
            passwordResetRequestedAt: undefined,
            passwordResetCount: 0
        });

        console.log(`Password changed successfully for user: ${user.email} at ${new Date().toISOString()}`);

        return NextResponse.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        return NextResponse.json(
            { error: 'Internal server error. Please try again later.' },
            { status: 500 }
        );
    }
}