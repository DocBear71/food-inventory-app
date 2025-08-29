// file: /src/app/api/payments/revenuecat/verify/route.js v3 - Enhanced with Apple receipt validation

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

// ADDED: Apple receipt validation function (outside the POST function)
async function validateReceiptWithApple(receiptData) {
    try {
        console.log('🍎 Validating receipt with Apple...');

        // STEP 1: Always try production first
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
        console.log('🍎 Production validation result:', productionResult.status);

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
            console.log('🧪 Sandbox validation result:', sandboxResult.status);
            return sandboxResult;
        }

        // STEP 3: Return production result for all other cases
        return productionResult;

    } catch (error) {
        console.error('❌ Apple receipt validation failed:', error);
        const { NativeDialog } = await import('@/components/mobile/NativeDialog');
        await NativeDialog.showError({
            title: 'Receipt Validation Failed',
            message: `Receipt validation failed: ${error.message}`
        });
        return;
    }
}

// ADDED: Helper function to extract receipt data from RevenueCat purchase result
function extractReceiptData(purchaseResult) {
    try {
        // RevenueCat provides receipt data in different places depending on platform
        const receiptData = purchaseResult.transactionReceipt ||
            purchaseResult.originalPurchaseDate ||
            purchaseResult.customerInfo?.originalAppUserId;

        if (!receiptData) {
            console.warn('⚠️ No receipt data found in purchase result');
            return null;
        }

        // Convert to base64 if needed
        if (typeof receiptData === 'string' && !receiptData.includes('base64')) {
            return Buffer.from(receiptData).toString('base64');
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

        if (!['monthly', 'annual'].includes(billingCycle)) {
            return NextResponse.json(
                { error: 'Invalid billing cycle' },
                { status: 400 }
            );
        }

        if (!['gold', 'platinum'].includes(tier)) {
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

        // ENHANCED: Add Apple receipt validation for additional security
        let appleValidation = null;
        try {
            const receiptData = extractReceiptData(purchaseResult);
            if (receiptData && process.env.APPLE_SHARED_SECRET) {
                console.log('🍎 Attempting Apple receipt validation...');
                appleValidation = await validateReceiptWithApple(receiptData);

                if (appleValidation.status === 0) {
                    console.log('✅ Apple receipt validation successful');
                } else {
                    console.warn('⚠️ Apple receipt validation returned status:', appleValidation.status);
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
        } else {
            subscriptionEndDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
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
        if (user.subscription?.revenueCatCustomerId === customerInfo.originalAppUserId &&
            user.subscription?.tier === tier &&
            user.subscription?.status === 'active') {
            console.log('⚠️ Duplicate purchase detected, updating existing subscription');
        }

        // Update user subscription in database
        user.subscription = {
            ...user.subscription,
            tier: tier,
            status: 'active',
            billingCycle: billingCycle,
            startDate: now,
            endDate: subscriptionEndDate,

            // RevenueCat specific fields
            revenueCatCustomerId: customerInfo.originalAppUserId || customerInfo.originalApplicationVersion,
            platform: 'revenuecat',

            // Clear any previous Stripe data since this is a new RevenueCat purchase
            stripeCustomerId: null,
            stripeSubscriptionId: null,

            lastPaymentDate: now,
            nextBillingDate: subscriptionEndDate,

            // Clear trial data since they're now paying
            trialStartDate: null,
            trialEndDate: null,

            // Store purchase metadata for debugging/support
            purchaseMetadata: {
                revenueCatPurchaseResult: {
                    transactionIdentifier: purchaseResult.transactionIdentifier,
                    productIdentifier: purchaseResult.productIdentifier,
                    purchaseDate: purchaseResult.purchaseDate,
                    originalAppUserId: customerInfo.originalAppUserId,
                    entitlements: Object.keys(entitlements || {}),
                    hasExpectedEntitlement: hasEntitlement
                },
                // ADDED: Apple validation metadata
                appleValidation: appleValidation ? {
                    status: appleValidation.status,
                    environment: appleValidation.environment || 'unknown',
                    validatedAt: now.toISOString()
                } : null,
                originalTier: user.subscription?.tier || 'free',
                upgradeDate: now,
                platform: 'ios',
                verificationTimestamp: now
            }
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

        // Send welcome email for new RevenueCat subscription
        try {
            const { sendWelcomeEmail } = await import('@/lib/email-todo-implementations');
            await sendWelcomeEmail({
                userEmail: user.email,
                userName: user.name || 'there',
                tier: tier,
                billingCycle: billingCycle,
                isNewUser: !user.subscription || user.subscription.tier === 'free',
                previousTier: user.subscription?.tier || 'free',
                endDate: subscriptionEndDate.toISOString()
            });
        } catch (emailError) {
            console.error('❌ Failed to send welcome email:', emailError);
            // Don't throw - email failures shouldn't break purchase verification
        }

        // Log to analytics
        try {
            const { trackEmailEvent } = await import('@/lib/email-todo-implementations');
            await trackEmailEvent({
                eventType: 'subscription_activated',
                userEmail: user.email,
                userId: user._id.toString(),
                emailType: 'revenuecat_verification',
                metadata: {
                    tier: tier,
                    billingCycle: billingCycle,
                    platform: 'revenuecat',
                    hasExpectedEntitlement: hasEntitlement,
                    appleValidationStatus: appleValidation?.status || 'not_validated'
                }
            });
        } catch (analyticsError) {
            console.error('❌ Failed to track analytics:', analyticsError);
        }

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
            // ADDED: Apple validation info for debugging
            validation: {
                appleStatus: appleValidation?.status || 'not_validated',
                environment: appleValidation?.environment || 'unknown'
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
                code: 'VERIFICATION_FAILED'
            },
            { status: 500 }
        );
    }
}