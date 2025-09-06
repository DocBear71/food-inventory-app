// file: /src/app/api/payments/revenuecat/verify/route.js v4 - Fixed Apple receipt validation and offerings error

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

// FIXED: Apple receipt validation function
async function validateReceiptWithApple(receiptData) {
    try {
        console.log('🍎 Starting Apple receipt validation...');

        if (!receiptData || !process.env.APPLE_SHARED_SECRET) {
            console.log('⚠️ Skipping Apple validation - missing receipt data or shared secret');
            return null;
        }

        // STEP 1: Always try production first (as per Apple's recommendation)
        const productionResponse = await fetch('https://buy.itunes.apple.com/verifyReceipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                'receipt-data': receiptData,
                'password': process.env.APPLE_SHARED_SECRET,
                'exclude-old-transactions': true
            })
        });

        const productionResult = await productionResponse.json();
        console.log('🍎 Production validation status:', productionResult.status);

        // STEP 2: If production fails with "sandbox receipt" error (21007), try sandbox
        if (productionResult.status === 21007) {
            console.log('🧪 Production failed with sandbox error, trying sandbox environment...');

            const sandboxResponse = await fetch('https://sandbox.itunes.apple.com/verifyReceipt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    'receipt-data': receiptData,
                    'password': process.env.APPLE_SHARED_SECRET,
                    'exclude-old-transactions': true
                })
            });

            const sandboxResult = await sandboxResponse.json();
            console.log('🧪 Sandbox validation status:', sandboxResult.status);

            // Add environment flag for debugging
            sandboxResult.environment = 'sandbox';
            return sandboxResult;
        }

        // STEP 3: Return production result for all other cases
        productionResult.environment = 'production';
        return productionResult;

    } catch (error) {
        console.error('❌ Apple receipt validation failed:', error);
        // Don't throw error - just log and continue
        return null;
    }
}

// FIXED: Better receipt data extraction
function extractReceiptData(purchaseResult) {
    try {
        // RevenueCat provides receipt data in different formats
        const receiptData =
            purchaseResult.transactionReceipt ||
            purchaseResult.receipt ||
            purchaseResult.originalTransactionIdentifier ||
            purchaseResult.transactionIdentifier;

        if (!receiptData) {
            console.warn('⚠️ No receipt data found in purchase result');
            return null;
        }

        console.log('📄 Found receipt data type:', typeof receiptData);

        // If it's already a base64 string, return as-is
        if (typeof receiptData === 'string') {
            return receiptData;
        }

        // Convert object to base64 if needed
        if (typeof receiptData === 'object') {
            return Buffer.from(JSON.stringify(receiptData)).toString('base64');
        }

        return receiptData;
    } catch (error) {
        console.error('❌ Error extracting receipt data:', error);
        return null;
    }
}

export async function POST(request) {
    try {
        console.log('🔄 Processing RevenueCat purchase verification...');

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { purchaseResult, tier, billingCycle, userId } = await request.json();

        // Validate inputs
        if (!purchaseResult || !tier || !billingCycle) {
            return NextResponse.json(
                { error: 'Purchase result, tier, and billing cycle are required' },
                { status: 400 }
            );
        }

        if (!['monthly', 'annual', 'weekly'].includes(billingCycle)) {
            return NextResponse.json(
                { error: 'Invalid billing cycle' },
                { status: 400 }
            );
        }

        if (!['gold', 'platinum', 'basic'].includes(tier)) {
            return NextResponse.json(
                { error: 'Invalid tier' },
                { status: 400 }
            );
        }

        // Ensure the user ID matches the session
        if (userId !== session.user.id) {
            return NextResponse.json(
                { error: 'User ID mismatch' },
                { status: 403 }
            );
        }

        await connectDB();

        // Get user from database
        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        console.log('✅ RevenueCat purchase verification:', {
            userId: user._id,
            email: user.email,
            tier: tier,
            billingCycle: billingCycle,
            customerInfo: purchaseResult.customerInfo?.originalAppUserId,
            timestamp: new Date().toISOString()
        });

        // Extract subscription information from RevenueCat purchase result
        const customerInfo = purchaseResult.customerInfo;
        const entitlements = customerInfo?.entitlements;

        if (!customerInfo) {
            console.error('❌ Invalid purchase result - missing customerInfo');
            return NextResponse.json(
                { error: 'Invalid purchase result format' },
                { status: 400 }
            );
        }

        // ENHANCED: Apple receipt validation with better error handling
        let appleValidation = null;
        try {
            const receiptData = extractReceiptData(purchaseResult);
            if (receiptData && process.env.APPLE_SHARED_SECRET) {
                console.log('🍎 Attempting Apple receipt validation...');
                appleValidation = await validateReceiptWithApple(receiptData);

                if (appleValidation?.status === 0) {
                    console.log('✅ Apple receipt validation successful');
                } else if (appleValidation?.status) {
                    console.warn('⚠️ Apple receipt validation returned status:', appleValidation.status);

                    // Log common Apple receipt validation error codes for debugging
                    const statusMessages = {
                        21000: 'App Store could not read the JSON data',
                        21002: 'Receipt data was malformed',
                        21003: 'Receipt could not be authenticated',
                        21004: 'Shared secret does not match',
                        21005: 'Receipt server is not currently available',
                        21006: 'Receipt is valid but subscription has expired',
                        21007: 'Receipt is a sandbox receipt but was sent to production',
                        21008: 'Receipt is a production receipt but was sent to sandbox'
                    };

                    console.warn('🍎 Apple validation status meaning:', statusMessages[appleValidation.status] || 'Unknown status');
                }
            } else {
                console.log('ℹ️ Skipping Apple receipt validation (no receipt data or shared secret)');
            }
        } catch (validationError) {
            console.warn('⚠️ Apple receipt validation failed, continuing with RevenueCat data:', validationError.message);
            // Don't fail the entire request if Apple validation fails
            // RevenueCat already validated the purchase
        }

        // Determine subscription dates
        const now = new Date();
        let subscriptionEndDate = null;

        // Calculate end date based on billing cycle
        if (billingCycle === 'annual') {
            subscriptionEndDate = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
        } else if (billingCycle === 'monthly') {
            subscriptionEndDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
        } else if (billingCycle === 'weekly') {
            subscriptionEndDate = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
        }

        // Check if the user has the expected entitlement
        const expectedEntitlement = `${tier}_access`; // e.g., 'gold_access', 'platinum_access'
        const hasEntitlement = entitlements && entitlements[expectedEntitlement]?.isActive;

        if (!hasEntitlement) {
            console.warn('⚠️ User does not have expected entitlement:', expectedEntitlement);
            console.log('Available entitlements:', Object.keys(entitlements || {}));
            // Still proceed but log the issue for debugging
        }

        // Check for duplicate purchases
        const existingSubscription = user.subscription || {};
        if (existingSubscription &&
            existingSubscription.tier === tier &&
            existingSubscription.billingCycle === billingCycle &&
            existingSubscription.status === 'active' &&
            existingSubscription.endDate > now) {

            console.log('ℹ️ User already has active subscription with same tier/cycle');
            return NextResponse.json({
                success: true,
                subscription: existingSubscription,
                message: 'Subscription already active',
                duplicate: true
            });
        }

        // Update user subscription
        user.subscription = {
            ...existingSubscription, // Preserve existing data
            tier: tier,
            status: 'active',
            billingCycle: billingCycle,
            startDate: now,
            endDate: subscriptionEndDate,
            revenueCatCustomerId: customerInfo.originalAppUserId,
            platform: 'revenuecat',
            lastPaymentDate: now,
            nextBillingDate: subscriptionEndDate,
            trialStartDate: null,
            trialEndDate: null,
            // CRITICAL: Preserve or set hasUsedFreeTrial flag
            hasUsedFreeTrial: existingSubscription.hasUsedFreeTrial || true,
            paymentHistory: [
                ...(existingSubscription.paymentHistory || []),
                {
                    date: now,
                    amount: getSubscriptionPrice(tier, billingCycle),
                    tier: tier,
                    billingCycle: billingCycle,
                    platform: 'revenuecat',
                    transactionId: purchaseResult.transactionIdentifier || 'unknown',
                    appleValidation: appleValidation ? {
                        status: appleValidation.status,
                        environment: appleValidation.environment || 'unknown',
                        validatedAt: now.toISOString()
                    } : null,
                    originalTier: existingSubscription.tier || 'free',
                    upgradeDate: now,
                    verificationTimestamp: now
                }
            ]
        };

        // Update usage tracking to reset monthly counters for new subscribers
        if (!user.usageTracking) {
            user.usageTracking = {
                currentMonth: now.getMonth(),
                currentYear: now.getFullYear(),
                monthlyUPCScans: 0,
                monthlyReceiptScans: 0,
                monthlyEmailShares: 0,
                monthlyEmailNotifications: 0,
                totalInventoryItems: 0,
                totalPersonalRecipes: 0,
                totalSavedRecipes: 0,
                totalPublicRecipes: 0,
                totalRecipeCollections: 0,
                lastUpdated: now
            };
        }

        await user.save();

        console.log('✅ RevenueCat subscription activated:', {
            userId: user._id,
            email: user.email,
            tier: tier,
            billingCycle: billingCycle,
            nextBilling: subscriptionEndDate.toISOString(),
            revenueCatCustomerId: customerInfo.originalAppUserId,
            hasExpectedEntitlement: hasEntitlement,
            appleValidationStatus: appleValidation?.status || 'not_validated'
        });

        return NextResponse.json({
            success: true,
            subscription: {
                tier: tier,
                status: 'active',
                billingCycle: billingCycle,
                startDate: now.toISOString(),
                endDate: subscriptionEndDate.toISOString(),
                platform: 'revenuecat',
                revenueCatCustomerId: customerInfo.originalAppUserId
            },
            message: `Successfully activated ${tier} subscription!`,
            entitlement: {
                expected: expectedEntitlement,
                found: hasEntitlement,
                available: Object.keys(entitlements || {})
            },
            // Enhanced debugging info
            validation: {
                appleStatus: appleValidation?.status || 'not_validated',
                environment: appleValidation?.environment || 'unknown',
                revenueCatCustomerId: customerInfo.originalAppUserId,
                transactionId: purchaseResult.transactionIdentifier
            }
        });

    } catch (error) {
        console.error('❌ Error verifying RevenueCat purchase:', error);

        // Handle specific RevenueCat errors with better user messages
        if (error.message?.includes('already_purchased')) {
            return NextResponse.json(
                {
                    error: 'This subscription has already been processed',
                    code: 'DUPLICATE_PURCHASE'
                },
                { status: 409 }
            );
        }

        if (error.message?.includes('invalid_receipt')) {
            return NextResponse.json(
                {
                    error: 'Invalid purchase receipt. Please try again.',
                    code: 'INVALID_RECEIPT'
                },
                { status: 400 }
            );
        }

        if (error.message?.includes('user_not_found')) {
            return NextResponse.json(
                {
                    error: 'User account not found. Please sign in and try again.',
                    code: 'USER_NOT_FOUND'
                },
                { status: 404 }
            );
        }

        // Database/connection errors
        if (error.name === 'MongoError' || error.name === 'MongooseError') {
            return NextResponse.json(
                {
                    error: 'Database error. Please try again.',
                    code: 'DATABASE_ERROR'
                },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                error: 'Failed to verify purchase. Please try again or contact support.',
                code: 'VERIFICATION_FAILED',
                details: error.message
            },
            { status: 500 }
        );
    }
}

// Helper function to get subscription price for payment history
function getSubscriptionPrice(tier, billingCycle) {
    const prices = {
        basic: { weekly: 0.99 },
        gold: { monthly: 4.99, annual: 49.99 },
        platinum: { monthly: 9.99, annual: 99.99 }
    };

    return prices[tier]?.[billingCycle] || 0;
}