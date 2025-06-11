// file: /src/app/api/auth/register/route.js v3

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

// Strong password validation function
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
        const {
            name,
            email,
            password,
            acceptedTerms,
            acceptedPrivacy,
            acceptanceDate
        } = await request.json();

        // Basic validation
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json(
                { error: 'Name is required' },
                { status: 400 }
            );
        }

        if (!email || typeof email !== 'string') {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Please enter a valid email address' },
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

        // Hash password with higher cost for better security
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user with legal acceptance tracking
        const user = new User({
            name: name.trim(),
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

        // Handle specific MongoDB errors
        if (error.code === 11000) {
            return NextResponse.json(
                { error: 'User with this email already exists' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}