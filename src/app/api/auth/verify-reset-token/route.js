
// file: /src/app/api/auth/verify-reset-token/route.js

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function POST(request) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json(
                { error: 'Token is required' },
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

        return NextResponse.json({
            success: true,
            message: 'Token is valid',
            email: user.email
        });

    } catch (error) {
        console.error('Verify reset token error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}