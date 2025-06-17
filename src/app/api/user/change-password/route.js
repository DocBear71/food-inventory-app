// file: /src/app/api/user/change-password/route.js - UPDATED WITH EMAIL CONFIRMATION

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';
import { sendPasswordChangeConfirmationEmail } from '@/lib/email';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const { currentPassword, newPassword, confirmPassword } = await request.json();

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            return NextResponse.json(
                { error: 'All password fields are required' },
                { status: 400 }
            );
        }

        if (newPassword !== confirmPassword) {
            return NextResponse.json(
                { error: 'New passwords do not match' },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: 'New password must be at least 6 characters long' },
                { status: 400 }
            );
        }

        if (newPassword === currentPassword) {
            return NextResponse.json(
                { error: 'New password must be different from current password' },
                { status: 400 }
            );
        }

        await connectDB();

        // Find user and verify current password
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

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 12);

        // Update password
        await User.findByIdAndUpdate(session.user.id, {
            password: hashedNewPassword,
            updatedAt: new Date()
        });

        // Log password change for audit trail
        console.log(`Password changed for user ${user.email} at ${new Date().toISOString()}`);

        // Send confirmation email (don't fail the request if email fails)
        try {
            await sendPasswordChangeConfirmationEmail(user.email);
            console.log(`Password change confirmation email sent to ${user.email}`);
        } catch (emailError) {
            console.error('Failed to send password change confirmation email:', emailError);
            // Continue with success response even if email fails
        }

        return NextResponse.json({
            success: true,
            message: 'Password changed successfully. A confirmation email has been sent to your email address.'
        });

    } catch (error) {
        console.error('Password change error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}