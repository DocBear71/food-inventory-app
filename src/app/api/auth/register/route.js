// file: /src/app/api/auth/register/route.js v5 - IMPROVED: Better email deliverability and user onboarding

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';
import { sendEmailVerificationEmail } from '@/lib/email';

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
            acceptanceDate,
            // New subscription fields
            selectedTier = 'free',
            billingCycle = null,
            startTrial = false,
            source = null
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

        // Validate subscription tier
        const validTiers = ['free', 'gold', 'platinum'];
        if (!validTiers.includes(selectedTier)) {
            return NextResponse.json(
                { error: 'Invalid subscription tier' },
                { status: 400 }
            );
        }

        // Validate billing cycle for paid tiers
        if (selectedTier !== 'free' && startTrial && !['monthly', 'annual'].includes(billingCycle)) {
            return NextResponse.json(
                { error: 'Billing cycle is required for paid plans' },
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

        // Generate email verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const hashedVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

        // Prepare subscription data
        let subscriptionData = {
            tier: 'free',
            status: 'free',
            billingCycle: null,
            startDate: null,
            endDate: null,
            trialStartDate: null,
            trialEndDate: null
        };

        // Set up trial if requested
        if (startTrial && selectedTier !== 'free') {
            const now = new Date();
            const trialEnd = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days

            subscriptionData = {
                tier: selectedTier, // Store selected tier for later billing
                status: 'trial',
                billingCycle: billingCycle,
                startDate: now,
                trialStartDate: now,
                trialEndDate: trialEnd,
                endDate: null // Will be set when they subscribe after trial
            };
        }

        // Create user with all the data
        const user = new User({
            name: name.trim(),
            email: email.toLowerCase(),
            password: hashedPassword,

            // Email verification
            emailVerified: false,
            emailVerificationToken: hashedVerificationToken,
            emailVerificationExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            emailVerificationRequestedAt: new Date(),

            // Legal acceptance
            legalAcceptance: {
                termsAccepted: acceptedTerms,
                privacyAccepted: acceptedPrivacy,
                acceptanceDate: new Date(acceptanceDate),
                ipAddress: request.headers.get('x-forwarded-for') ||
                    request.headers.get('x-real-ip') ||
                    'unknown',
                userAgent: request.headers.get('user-agent') || 'unknown'
            },

            // Subscription data
            subscription: subscriptionData
        });

        await user.save();

        // Send email verification using the imported function
        try {
            console.log(`Sending verification email to ${email}...`);
            await sendEmailVerificationEmail(email, verificationToken, name);
            console.log(`Verification email sent successfully to ${email}`);
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
            // Don't fail the registration, but log the error
        }

        // Log successful registration
        console.log(`User registered successfully:`, {
            userId: user._id,
            email: email,
            tier: subscriptionData.tier,
            status: subscriptionData.status,
            trial: startTrial,
            source: source,
            timestamp: new Date().toISOString()
        });

        // Return success response
        return NextResponse.json({
            success: true,
            message: 'Account created successfully! Please check your email to verify your account.',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                emailVerified: user.emailVerified,
                subscription: {
                    tier: user.subscription.tier,
                    status: user.subscription.status,
                    trialEndDate: user.subscription.trialEndDate
                },
                legalAcceptanceDate: user.legalAcceptance.acceptanceDate
            },
            requiresEmailVerification: true
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