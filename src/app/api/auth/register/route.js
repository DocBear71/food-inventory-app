// file: /src/app/api/auth/register/route.js v6 - Enhanced with international compliance and GDPR

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';
import { sendEmailVerificationEmail, sendParentalConsentEmail } from '@/lib/email';

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

// NEW: Country to region mapping for automatic regional setup
const getRegionFromCountry = (country) => {
    const regionMap = {
        'United States': { region: 'US', currency: 'USD', unitSystem: 'imperial' },
        'Canada': { region: 'CA', currency: 'CAD', unitSystem: 'metric' },
        'United Kingdom': { region: 'UK', currency: 'GBP', unitSystem: 'metric' },
        'Australia': { region: 'AU', currency: 'AUD', unitSystem: 'metric' },
        'New Zealand': { region: 'AU', currency: 'NZD', unitSystem: 'metric' },
        'Japan': { region: 'JP', currency: 'JPY', unitSystem: 'metric' },
        'South Korea': { region: 'JP', currency: 'KRW', unitSystem: 'metric' },

        // EU Countries
        'Germany': { region: 'EU', currency: 'EUR', unitSystem: 'metric' },
        'France': { region: 'EU', currency: 'EUR', unitSystem: 'metric' },
        'Italy': { region: 'EU', currency: 'EUR', unitSystem: 'metric' },
        'Spain': { region: 'EU', currency: 'EUR', unitSystem: 'metric' },
        'Netherlands': { region: 'EU', currency: 'EUR', unitSystem: 'metric' },
        'Belgium': { region: 'EU', currency: 'EUR', unitSystem: 'metric' },
        'Austria': { region: 'EU', currency: 'EUR', unitSystem: 'metric' },
        'Portugal': { region: 'EU', currency: 'EUR', unitSystem: 'metric' },
        'Ireland': { region: 'EU', currency: 'EUR', unitSystem: 'metric' },
        'Luxembourg': { region: 'EU', currency: 'EUR', unitSystem: 'metric' },
        'Finland': { region: 'EU', currency: 'EUR', unitSystem: 'metric' },
        'Greece': { region: 'EU', currency: 'EUR', unitSystem: 'metric' },
        'Poland': { region: 'EU', currency: 'PLN', unitSystem: 'metric' },
        'Czech Republic': { region: 'EU', currency: 'CZK', unitSystem: 'metric' },
        'Hungary': { region: 'EU', currency: 'HUF', unitSystem: 'metric' },
        'Sweden': { region: 'EU', currency: 'SEK', unitSystem: 'metric' },
        'Denmark': { region: 'EU', currency: 'DKK', unitSystem: 'metric' },
        'Croatia': { region: 'EU', currency: 'EUR', unitSystem: 'metric' },
        'Slovenia': { region: 'EU', currency: 'EUR', unitSystem: 'metric' },
        'Slovakia': { region: 'EU', currency: 'EUR', unitSystem: 'metric' },
        'Estonia': { region: 'EU', currency: 'EUR', unitSystem: 'metric' },
        'Latvia': { region: 'EU', currency: 'EUR', unitSystem: 'metric' },
        'Lithuania': { region: 'EU', currency: 'EUR', unitSystem: 'metric' },
        'Bulgaria': { region: 'EU', currency: 'BGN', unitSystem: 'metric' },
        'Romania': { region: 'EU', currency: 'RON', unitSystem: 'metric' },
        'Cyprus': { region: 'EU', currency: 'EUR', unitSystem: 'metric' },
        'Malta': { region: 'EU', currency: 'EUR', unitSystem: 'metric' },

        // EEA/EFTA
        'Norway': { region: 'EU', currency: 'NOK', unitSystem: 'metric' },
        'Iceland': { region: 'EU', currency: 'ISK', unitSystem: 'metric' },
        'Liechtenstein': { region: 'EU', currency: 'CHF', unitSystem: 'metric' },
        'Switzerland': { region: 'EU', currency: 'CHF', unitSystem: 'metric' }
    };

    return regionMap[country] || { region: 'Other', currency: 'USD', unitSystem: 'metric' };
};

// NEW: Get EU countries list for GDPR detection
const isEUCountry = (country) => {
    const euCountries = [
        'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic',
        'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece',
        'Hungary', 'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg',
        'Malta', 'Netherlands', 'Poland', 'Portugal', 'Romania', 'Slovakia',
        'Slovenia', 'Spain', 'Sweden', 'Iceland', 'Liechtenstein', 'Norway'
    ];
    return euCountries.includes(country);
};

export async function POST(request) {
    try {
        const {
            name,
            email,
            password,
            country, // NEW
            acceptedTerms,
            acceptedPrivacy,
            acceptanceDate,

            // NEW: International compliance fields
            isEUUser = false,
            acceptedDataProcessing = null,
            acceptedVoiceProcessing = false,
            acceptedInternationalTransfers = false,

            // NEW: Minor protection fields
            isMinor = false,
            parentEmail = null,
            acceptedMinorConsent = null,

            // Existing subscription fields
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

        // NEW: Country validation
        if (!country || typeof country !== 'string') {
            return NextResponse.json(
                { error: 'Country selection is required' },
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

        // NEW: Enhanced validation for international compliance
        const userIsEU = isEUUser || isEUCountry(country);

        if (userIsEU && acceptedDataProcessing !== true) {
            return NextResponse.json(
                { error: 'EU users must consent to data processing under GDPR' },
                { status: 400 }
            );
        }

        // NEW: Minor protection validation
        if (isMinor) {
            if (!parentEmail || !emailRegex.test(parentEmail)) {
                return NextResponse.json(
                    { error: 'Valid parent/guardian email is required for users under 18' },
                    { status: 400 }
                );
            }

            if (!acceptedMinorConsent) {
                return NextResponse.json(
                    { error: 'Parental consent confirmation is required for users under 18' },
                    { status: 400 }
                );
            }

            if (parentEmail.toLowerCase() === email.toLowerCase()) {
                return NextResponse.json(
                    { error: 'Parent/guardian email must be different from user email' },
                    { status: 400 }
                );
            }
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

        // NEW: Check if parent email is already in use as a regular user (for minor accounts)
        if (isMinor && parentEmail) {
            const existingParent = await User.findOne({ email: parentEmail.toLowerCase() });
            if (existingParent) {
                return NextResponse.json(
                    { error: 'Parent/guardian email is already registered as a user account' },
                    { status: 400 }
                );
            }
        }

        // Hash password with higher cost for better security
        const hashedPassword = await bcrypt.hash(password, 12);

        // Generate email verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const hashedVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

        // NEW: Generate parent verification token if needed
        let parentVerificationToken = null;
        let hashedParentVerificationToken = null;
        if (isMinor && parentEmail) {
            parentVerificationToken = crypto.randomBytes(32).toString('hex');
            hashedParentVerificationToken = crypto.createHash('sha256').update(parentVerificationToken).digest('hex');
        }

        // NEW: Get regional settings based on country
        const regionalSettings = getRegionFromCountry(country);

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
                tier: selectedTier,
                status: 'trial',
                billingCycle: billingCycle,
                startDate: now,
                trialStartDate: now,
                trialEndDate: trialEnd,
                endDate: null
            };
        }

        // NEW: Enhanced legal acceptance tracking
        const enhancedLegalAcceptance = {
            termsAccepted: acceptedTerms,
            privacyAccepted: acceptedPrivacy,
            acceptanceDate: new Date(acceptanceDate),
            ipAddress: request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',

            // NEW: International compliance tracking
            country: country,
            isEUUser: userIsEU,
            gdprApplies: userIsEU,
            acceptedDataProcessing: userIsEU ? acceptedDataProcessing : null,
            acceptedVoiceProcessing: acceptedVoiceProcessing,
            acceptedInternationalTransfers: acceptedInternationalTransfers,

            // NEW: Minor protection tracking
            isMinor: isMinor,
            parentEmail: isMinor ? parentEmail.toLowerCase() : null,
            acceptedMinorConsent: isMinor ? acceptedMinorConsent : null,
            parentVerificationRequired: isMinor,
            parentVerificationToken: hashedParentVerificationToken,
            parentVerificationExpires: isMinor ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,

            // Legal document versions
            termsVersion: '3.0', // Updated version with international compliance
            privacyVersion: '2.0', // Updated version with GDPR

            // Consent metadata
            consentMethod: 'explicit-web-form',
            consentContext: 'account-registration',
            consentWithdrawn: false,
            consentWithdrawnDate: null
        };

        // Create user with enhanced international data
        const user = new User({
            name: name.trim(),
            email: email.toLowerCase(),
            password: hashedPassword,

            // Email verification
            emailVerified: false,
            emailVerificationToken: hashedVerificationToken,
            emailVerificationExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            emailVerificationRequestedAt: new Date(),

            // Enhanced legal acceptance
            legalAcceptance: enhancedLegalAcceptance,

            // NEW: Legal versions tracking
            legalVersion: {
                termsVersion: '3.0',
                privacyVersion: '2.0'
            },

            // Subscription data
            subscription: subscriptionData,

            // NEW: Auto-configure international preferences based on country
            currencyPreferences: {
                currency: regionalSettings.currency,
                currencySymbol: regionalSettings.currency === 'EUR' ? '€' :
                    regionalSettings.currency === 'GBP' ? '£' : '$',
                currencyPosition: ['EUR'].includes(regionalSettings.currency) ? 'after' : 'before',
                showCurrencyCode: false,
                decimalPlaces: 2
            },

            // NEW: International preferences based on country
            internationalPreferences: {
                primaryRegion: regionalSettings.region,
                preferredDatabases: regionalSettings.region === 'EU' ? ['OpenFoodFacts', 'EU-EFSA'] :
                    regionalSettings.region === 'UK' ? ['OpenFoodFacts', 'UK-FSA'] :
                        ['OpenFoodFacts', 'USDA'],
                preferredLanguages: [regionalSettings.region === 'CA' ? 'en-CA' :
                    regionalSettings.region === 'UK' ? 'en-GB' :
                        regionalSettings.region === 'AU' ? 'en-AU' : 'en-US'],
                unitSystem: regionalSettings.unitSystem,
                temperatureScale: regionalSettings.unitSystem === 'imperial' ? 'fahrenheit' : 'celsius',
                dateFormat: regionalSettings.region === 'US' ? 'MM/DD/YYYY' : 'DD/MM/YYYY',
                autoDetectRegion: true
            },

            // NEW: Regional profile
            userRegionalProfile: {
                detectedRegion: regionalSettings.region,
                detectedCountry: country === 'United States' ? 'US' :
                    country === 'United Kingdom' ? 'GB' :
                        country === 'Canada' ? 'CA' :
                            country === 'Australia' ? 'AU' : 'Other',
                detectionMethods: ['user-specified'],
                lastDetectionUpdate: new Date(),
                regionalConfidence: 1.0
            },

            // NEW: Compliance preferences
            compliancePreferences: {
                dataPrivacyCompliance: userIsEU ? 'GDPR' :
                    country === 'Canada' ? 'PIPEDA' :
                        country === 'Australia' ? 'APPs' :
                            country === 'United States' ? 'CCPA' : 'Standard',
                nutritionLabelingCompliance: userIsEU ? 'EU-1169' :
                    country === 'United Kingdom' ? 'UK-FSA' :
                        country === 'Canada' ? 'CA-CFIA' :
                            country === 'Australia' ? 'AU-FSANZ' : 'US-FDA',
                allergenDisclosureCompliance: userIsEU ? 'EU-1169' :
                    country === 'United Kingdom' ? 'UK-FSA' :
                        country === 'Canada' ? 'CA-Enhanced' :
                            country === 'Australia' ? 'AU-Standard' : 'US-FALCPA',
                ageVerificationRequired: isMinor
            }
        });

        await user.save();

        // Send email verification
        try {
            console.log(`Sending verification email to ${email}...`);
            await sendEmailVerificationEmail(email, verificationToken, name);
            console.log(`Verification email sent successfully to ${email}`);

            // NEW: Send parental consent email if minor
            if (isMinor && parentEmail && parentVerificationToken) {
                console.log(`Sending parental consent email to ${parentEmail}...`);
                try {
                    await sendParentalConsentEmail(parentEmail, parentVerificationToken, name, email);
                    console.log(`Parental consent email sent successfully to ${parentEmail}`);
                } catch (parentEmailError) {
                    console.error('Failed to send parental consent email:', parentEmailError);
                    // Don't fail registration, but log the error
                }
            }
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
            // Don't fail the registration, but log the error
        }

        // Log successful registration with international context
        console.log(`User registered successfully:`, {
            userId: user._id,
            email: email,
            country: country,
            isEUUser: userIsEU,
            isMinor: isMinor,
            tier: subscriptionData.tier,
            status: subscriptionData.status,
            trial: startTrial,
            source: source,
            region: regionalSettings.region,
            currency: regionalSettings.currency,
            compliance: user.compliancePreferences.dataPrivacyCompliance,
            timestamp: new Date().toISOString()
        });

        // Return success response with international context
        const responseData = {
            success: true,
            message: 'Account created successfully! Please check your email to verify your account.',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                country: country,
                emailVerified: user.emailVerified,
                isMinor: isMinor,
                parentVerificationRequired: isMinor,
                subscription: {
                    tier: user.subscription.tier,
                    status: user.subscription.status,
                    trialEndDate: user.subscription.trialEndDate
                },
                internationalSettings: {
                    region: regionalSettings.region,
                    currency: regionalSettings.currency,
                    unitSystem: regionalSettings.unitSystem,
                    isEUUser: userIsEU,
                    compliance: user.compliancePreferences.dataPrivacyCompliance
                },
                legalAcceptanceDate: user.legalAcceptance.acceptanceDate
            },
            requiresEmailVerification: true,
            requiresParentVerification: isMinor
        };

        if (isMinor) {
            responseData.message = 'Account created successfully! Please check your email to verify your account. Your parent/guardian will also receive a verification email.';
        }

        if (userIsEU) {
            responseData.gdprNotice = 'Your account is protected under GDPR. You have additional data protection rights including access, rectification, erasure, and portability.';
        }

        return NextResponse.json(responseData);

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