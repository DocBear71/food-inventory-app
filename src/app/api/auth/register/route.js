// file: /src/app/api/auth/register/route.js v5 - IMPROVED: Better email deliverability and user onboarding

import { NextResponse } from 'next/response';
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

        // IMPROVED: Send welcome email with better deliverability
        try {
            console.log(`Sending welcome email to ${email}...`);
            await sendImprovedWelcomeEmail(email, verificationToken, name, selectedTier, startTrial);
            console.log(`Welcome email sent successfully to ${email}`);
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
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

// IMPROVED: Better welcome email that's less likely to be spam
async function sendImprovedWelcomeEmail(email, verificationToken, userName, selectedTier, isTrialUser) {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const verificationUrl = `${process.env.APP_URL}/auth/verify-email?token=${verificationToken}`;
    const currentYear = new Date().getFullYear();

    // Create more natural, less spammy subject line
    const subject = isTrialUser
        ? `Welcome to Doc Bear's Kitchen - Your 7-day trial awaits!`
        : `Welcome to Doc Bear's Kitchen - Please verify your email`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Doc Bear's Comfort Kitchen</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8fafc;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        
        .header {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            padding: 40px 30px;
            text-align: center;
        }
        
        .logo {
            font-size: 32px;
            color: #ffffff;
            margin-bottom: 10px;
        }
        
        .header-text {
            color: #e0e7ff;
            font-size: 18px;
            margin: 0;
            font-weight: 500;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .welcome-section {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .welcome-title {
            font-size: 28px;
            font-weight: 700;
            color: #1f2937;
            margin: 0 0 15px 0;
        }
        
        .welcome-subtitle {
            font-size: 18px;
            color: #6b7280;
            margin: 0 0 25px 0;
        }
        
        .verify-button {
            display: inline-block;
            padding: 16px 32px;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: #ffffff;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3);
        }
        
        .verify-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 12px rgba(79, 70, 229, 0.4);
        }
        
        .features-section {
            background: #f8fafc;
            border-radius: 12px;
            padding: 25px;
            margin: 30px 0;
        }
        
        .features-title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin: 0 0 20px 0;
            text-align: center;
        }
        
        .feature-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .feature-item {
            display: flex;
            align-items: center;
            padding: 8px 0;
            color: #374151;
        }
        
        .feature-icon {
            width: 24px;
            height: 24px;
            background: #4f46e5;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
            font-size: 12px;
            color: white;
            flex-shrink: 0;
        }
        
        .trial-notice {
            background: linear-gradient(135deg, #059669 0%, #10b981 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            margin: 25px 0;
        }
        
        .trial-notice h3 {
            margin: 0 0 10px 0;
            font-size: 18px;
        }
        
        .next-steps {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
        }
        
        .next-steps h4 {
            margin: 0 0 15px 0;
            color: #1e40af;
            font-size: 16px;
        }
        
        .step {
            display: flex;
            align-items: flex-start;
            margin: 10px 0;
            color: #1e40af;
            font-size: 14px;
        }
        
        .step-number {
            background: #3b82f6;
            color: white;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            margin-right: 10px;
            flex-shrink: 0;
        }
        
        .footer {
            background: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer-text {
            color: #6b7280;
            font-size: 14px;
            margin: 5px 0;
        }
        
        .social-links {
            margin: 20px 0;
        }
        
        .social-links a {
            color: #4f46e5;
            text-decoration: none;
            margin: 0 10px;
            font-size: 14px;
        }
        
        @media only screen and (max-width: 600px) {
            .content, .header, .footer {
                padding: 25px 20px !important;
            }
            
            .welcome-title {
                font-size: 24px !important;
            }
            
            .verify-button {
                width: calc(100% - 40px) !important;
                margin: 20px 0 !important;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🐻 Doc Bear's Comfort Kitchen</div>
            <p class="header-text">Smart Food Inventory Management</p>
        </div>
        
        <div class="content">
            <div class="welcome-section">
                <h1 class="welcome-title">Welcome, ${userName}! 🎉</h1>
                <p class="welcome-subtitle">
                    Thank you for joining thousands of home cooks who are reducing food waste and discovering new recipes.
                </p>
            </div>

            ${isTrialUser ? `
            <div class="trial-notice">
                <h3>🚀 Your 7-Day Platinum Trial is Ready!</h3>
                <p style="margin: 0; font-size: 16px;">
                    You have full access to all premium features. No payment required during your trial.
                </p>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
                <p style="font-size: 18px; color: #374151; margin-bottom: 20px;">
                    <strong>First, let's verify your email address:</strong>
                </p>
                <a href="${verificationUrl}" class="verify-button">
                    Verify Email & Start Cooking 🍳
                </a>
                <p style="font-size: 14px; color: #6b7280; margin-top: 15px;">
                    This link expires in 7 days. Click it to activate your account.
                </p>
            </div>
            
            <div class="features-section">
                <h3 class="features-title">Here's what you can do with Doc Bear's Kitchen:</h3>
                <ul class="feature-list">
                    <li class="feature-item">
                        <div class="feature-icon">📱</div>
                        <span>Scan UPC codes to instantly add food items to your inventory</span>
                    </li>
                    <li class="feature-item">
                        <div class="feature-icon">📋</div>
                        <span>Track expiration dates and get alerts before food spoils</span>
                    </li>
                    <li class="feature-item">
                        <div class="feature-icon">🍳</div>
                        <span>Discover recipes based on ingredients you already have</span>
                    </li>
                    <li class="feature-item">
                        <div class="feature-icon">📅</div>
                        <span>Plan meals and generate smart shopping lists</span>
                    </li>
                    <li class="feature-item">
                        <div class="feature-icon">📊</div>
                        <span>Get nutrition insights for your meals and inventory</span>
                    </li>
                    <li class="feature-item">
                        <div class="feature-icon">📤</div>
                        <span>Share shopping lists with family and friends</span>
                    </li>
                </ul>
            </div>
            
            <div class="next-steps">
                <h4>🎯 Quick Start Guide:</h4>
                <div class="step">
                    <div class="step-number">1</div>
                    <span>Click the verification button above to activate your account</span>
                </div>
                <div class="step">
                    <div class="step-number">2</div>
                    <span>Add your first few pantry items using the UPC scanner</span>
                </div>
                <div class="step">
                    <div class="step-number">3</div>
                    <span>Try "What Can I Make?" to find recipes with your ingredients</span>
                </div>
                <div class="step">
                    <div class="step-number">4</div>
                    <span>Create your first meal plan and shopping list</span>
                </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0; padding: 20px; background: #fef7ff; border: 1px solid #e879f9; border-radius: 8px;">
                <p style="margin: 0; color: #86198f; font-size: 16px;">
                    <strong>Questions?</strong> Just reply to this email - we're here to help! 💜
                </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <p style="color: #374151; font-size: 16px; margin: 0;">
                    Happy cooking!<br>
                    <em style="color: #6b7280;">Dr. Edward McKeown, The Doc Bear</em>
                </p>
            </div>
        </div>
        
        <div class="footer">
            <p class="footer-text">
                You received this email because you created an account at Doc Bear's Comfort Kitchen.
            </p>
            <div class="social-links">
                <a href="${process.env.APP_URL}/about">About Us</a> |
                <a href="${process.env.APP_URL}/privacy">Privacy Policy</a> |
                <a href="${process.env.APP_URL}/terms">Terms of Use</a>
            </div>
            <p class="footer-text" style="font-size: 12px; color: #9ca3af;">
                © ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>`;

    const text = `
Welcome to Doc Bear's Comfort Kitchen!

Hello ${userName},

Thank you for joining thousands of home cooks who are reducing food waste and discovering new recipes.

${isTrialUser ? `
🚀 YOUR 7-DAY PLATINUM TRIAL IS READY!
You have full access to all premium features. No payment required during your trial.
` : ''}

VERIFY YOUR EMAIL ADDRESS:
Please verify your email to activate your account:
${verificationUrl}

This link expires in 7 days.

WHAT YOU CAN DO WITH DOC BEAR'S KITCHEN:
✓ Scan UPC codes to instantly add food items to your inventory
✓ Track expiration dates and get alerts before food spoils  
✓ Discover recipes based on ingredients you already have
✓ Plan meals and generate smart shopping lists
✓ Get nutrition insights for your meals and inventory
✓ Share shopping lists with family and friends

QUICK START GUIDE:
1. Click the verification link above to activate your account
2. Add your first few pantry items using the UPC scanner
3. Try "What Can I Make?" to find recipes with your ingredients
4. Create your first meal plan and shopping list

Questions? Just reply to this email - we're here to help!

Happy cooking!
Dr. Edward McKeown, The Doc Bear

© ${currentYear} Doc Bear's Comfort Kitchen. All rights reserved.
    `;

    try {
        const result = await resend.emails.send({
            from: `Doc Bear's Comfort Kitchen <${process.env.FROM_EMAIL}>`,
            to: [email],
            subject,
            html,
            text,
            // IMPORTANT: Add these headers to improve deliverability
            headers: {
                'X-Entity-Ref-ID': `signup-${Date.now()}`,
                'List-Unsubscribe': `<${process.env.APP_URL}/unsubscribe>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
            },
            // Add tags for better tracking
            tags: [
                { name: 'campaign', value: 'welcome' },
                { name: 'user_tier', value: selectedTier },
                { name: 'is_trial', value: isTrialUser.toString() }
            ]
        });

        console.log('Welcome email sent:', result.id);
        return result;
    } catch (error) {
        console.error('Welcome email send error:', error);
        throw error;
    }
}