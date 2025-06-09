// file: /src/app/api/auth/register/route.js v2

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function POST(request) {
    try {
        const {
            name,
            email,
            password,
            acceptedTerms,
            acceptedPrivacy,
            acceptanceDate
        } = await request.json();

        // Validation
        if (!name || !email || !password) {
            return NextResponse.json(
                { error: 'Name, email, and password are required' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters long' },
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

        // Validate legal acceptance
        if (!acceptedTerms || !acceptedPrivacy) {
            return NextResponse.json(
                { error: 'You must accept both the Terms of Use and Privacy Policy to create an account' },
                { status: 400 }
            );
        }

        if (!acceptanceDate) {
            return NextResponse.json(
                { error: 'Legal acceptance date is required' },
                { status: 400 }
            );
        }

        await connectDB();

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return NextResponse.json(
                { error: 'User with this email already exists' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user with legal acceptance tracking
        const user = new User({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            legalAcceptance: {
                termsAccepted: acceptedTerms,
                privacyAccepted: acceptedPrivacy,
                acceptanceDate: new Date(acceptanceDate),
                ipAddress: request.headers.get('x-forwarded-for') ||
                    request.headers.get('x-real-ip') ||
                    'unknown',
                userAgent: request.headers.get('user-agent') || 'unknown'
            }
        });

        await user.save();

        // Log legal acceptance for audit trail
        console.log(`Legal acceptance recorded for user ${email}:`, {
            userId: user._id,
            termsAccepted: acceptedTerms,
            privacyAccepted: acceptedPrivacy,
            acceptanceDate: acceptanceDate,
            timestamp: new Date().toISOString()
        });

        // Return success (don't send password back)
        return NextResponse.json({
            success: true,
            message: 'Account created successfully with legal acceptance recorded',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                legalAcceptanceDate: user.legalAcceptance.acceptanceDate
            },
        });

    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}