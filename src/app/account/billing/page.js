'use client';
// file: /src/app/account/billing/page.js v4 - Added basic weekly test subscription

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSafeSession } from '@/hooks/useSafeSession';
import { useSubscription } from '@/hooks/useSubscription';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { apiPost } from '@/lib/api-config';
import { usePlatform } from '@/hooks/usePlatform';
import { trackEmailEvent } from '@/lib/email-todo-implementations';

// Separate component for search params to wrap in Suspense
function BillingContent() {
    const { data: session, status } = useSafeSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const subscription = useSubscription();
    const platform = usePlatform();

    // Get URL parameters from pricing page
    const urlTier = searchParams.get('tier');
    const urlBilling = searchParams.get('billing') || 'annual';
    const urlTrial = searchParams.get('trial') === 'true';
    const urlSource = searchParams.get('source');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isRestoring, setIsRestoring] = useState(false);
    const [purchaseSteps, setPurchaseSteps] = useState([]);

    // ENHANCED: Better debug tracking for iPad issues
    const addPurchaseStep = (step, data = {}) => {
        const timestamp = new Date().toISOString();
        const newStep = { step, timestamp, data };
        setPurchaseSteps(prev => [...prev, newStep]);
        console.log(`📱 Purchase Step ${purchaseSteps.length + 1}:`, step, data);
    };

    // Error boundary for debugging
    useEffect(() => {
        const handleError = (error) => {
            console.error('🚨 Global error caught:', error);
            addPurchaseStep('GLOBAL_ERROR', { message: error.message, stack: error.stack });
            setError(`App Error: ${error.message}`);
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', (event) => {
            console.error('🚨 Unhandled promise rejection:', event.reason);
            addPurchaseStep('PROMISE_REJECTION', { reason: event.reason?.message || 'Unknown error' });
            setError(`Promise Error: ${event.reason?.message || 'Unknown error'}`);
        });

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleError);
        };
    }, [purchaseSteps.length]);

    // Early returns for auth
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
        }
    }, [status, router]);

    if (status === 'loading') {
        return (
            <MobileOptimizedLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <div className="text-lg text-gray-600">Loading dashboard...</div>
                    </div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    if (!session) {
        return null;
    }

    // UPDATED: Subscription plans configuration with basic weekly test
    const plans = {
        free: {
            name: 'Free',
            price: { monthly: 0, annual: 0, weekly: 0 },
            description: 'Basic inventory management',
            features: ['50 inventory items', '100 starter recipes', 'Basic matching', '2 receipt scans/month']
        },
        basic: {
            name: 'Basic Weekly Access',
            price: { weekly: 0.99 },
            description: 'Essential kitchen management tools - weekly subscription',
            features: ['Essential tools access', 'Weekly billing', 'Test functionality', 'Basic support']
        },
        gold: {
            name: 'Gold',
            price: { monthly: 4.99, annual: 49.99 },
            description: 'Essential tools for active home cooks',
            features: ['250 inventory items', '500 recipes', 'Meal planning', '20 receipt scans/month', 'Nutrition info']
        },
        platinum: {
            name: 'Platinum',
            price: { monthly: 9.99, annual: 99.99 },
            description: 'Complete kitchen management',
            features: ['Unlimited inventory', 'All features', 'Advanced meal prep', 'Unlimited scanning', 'Priority support']
        }
    };

    // Handle subscription changes
    const handleSubscriptionChange = async (newTier, newBilling = 'annual') => {
        if (!newTier || newTier === subscription.tier) {
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');
        setPurchaseSteps([]);

        addPurchaseStep('PURCHASE_INITIATED', {
            tier: newTier,
            billing: newBilling,
            platform: platform.type,
            isIOS: platform.isIOS,
            isNative: platform.isNative
        });

        try {
            // Route to appropriate payment system based on platform
            if (platform.billingProvider === 'stripe') {
                await handleStripePurchase(newTier, newBilling);
            } else if (platform.billingProvider === 'appstore') {
                await handleRevenueCatPurchase(newTier, newBilling);
            } else {
                throw new Error(`Unknown billing platform: ${platform.billingProvider}`);
            }
        } catch (error) {
            console.error('Error in subscription change:', error);
            addPurchaseStep('SUBSCRIPTION_CHANGE_ERROR', { message: error.message });
            setError(`Subscription change failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Handle Stripe purchases (web)
    const handleStripePurchase = async (newTier, newBilling) => {
        addPurchaseStep('STRIPE_FLOW_START');

        const response = await apiPost('/api/payments/create-checkout', {
            tier: newTier,
            billingCycle: newBilling,
            currentTier: subscription.tier,
            source: urlSource || 'billing-page'
        });

        const data = await response.json();

        if (response.ok && data.url) {
            addPurchaseStep('STRIPE_CHECKOUT_CREATED', { url: data.url });

            // Track Stripe checkout initiation
            try {
                await trackEmailEvent({
                    eventType: 'checkout_initiated',
                    userEmail: session.user.email,
                    userId: session.user.id,
                    emailType: 'stripe_checkout',
                    metadata: {
                        tier: newTier,
                        billingCycle: newBilling,
                        platform: 'web',
                        source: urlSource || 'billing-page'
                    }
                });
            } catch (trackingError) {
                console.error('Failed to track checkout event:', trackingError);
            }

            window.location.href = data.url;
        } else {
            throw new Error(data.error || 'Failed to create checkout session');
        }
    };

    // ENHANCED: Improved RevenueCat purchase flow for iPad
    const handleRevenueCatPurchase = async (tier, billingCycle) => {
        try {
            addPurchaseStep('REVENUECAT_FLOW_START');

            // ENHANCED: Better iPad/iOS detection and error handling
            if (!platform.isIOS && !platform.isAndroid) {
                throw new Error('RevenueCat purchases are only available on mobile devices');
            }

            console.log('1. Starting RevenueCat purchase for iOS/iPad...');
            addPurchaseStep('REVENUECAT_IMPORT_START');

            // Dynamic import with better error handling
            let Purchases;
            try {
                const purchasesModule = await import('@revenuecat/purchases-capacitor');
                Purchases = purchasesModule.Purchases;
                addPurchaseStep('REVENUECAT_IMPORT_SUCCESS');
                console.log('2. RevenueCat SDK imported successfully');
            } catch (importError) {
                addPurchaseStep('REVENUECAT_IMPORT_FAILED', { error: importError.message });
                throw new Error(`RevenueCat SDK not available: ${importError.message}`);
            }

            // Get API key for iOS
            const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY;
            console.log('3. API key check:', !!apiKey);
            addPurchaseStep('API_KEY_CHECK', { hasKey: !!apiKey });

            if (!apiKey) {
                throw new Error('RevenueCat iOS API key not configured');
            }

            // ENHANCED: Configure RevenueCat with better error handling
            addPurchaseStep('REVENUECAT_CONFIGURE_START');
            try {
                await Purchases.configure({
                    apiKey: apiKey,
                    appUserID: session.user.id
                });
                addPurchaseStep('REVENUECAT_CONFIGURE_SUCCESS');
                console.log('4. RevenueCat configured successfully!');
            } catch (configError) {
                addPurchaseStep('REVENUECAT_CONFIGURE_FAILED', { error: configError.message });
                throw new Error(`RevenueCat configuration failed: ${configError.message}`);
            }

            // ENHANCED: Get customer info with detailed logging
            addPurchaseStep('CUSTOMER_INFO_START');
            let customerInfo;
            try {
                customerInfo = await Purchases.getCustomerInfo();
                addPurchaseStep('CUSTOMER_INFO_SUCCESS', {
                    userId: customerInfo.originalAppUserId,
                    activeSubscriptions: Object.keys(customerInfo.activeSubscriptions || {}),
                    entitlements: Object.keys(customerInfo.entitlements?.all || {})
                });
                console.log('5. Customer info retrieved successfully');
            } catch (customerError) {
                addPurchaseStep('CUSTOMER_INFO_FAILED', { error: customerError.message });
                throw new Error(`Failed to get customer info: ${customerError.message}`);
            }

            // ENHANCED: Get offerings with comprehensive error handling
            addPurchaseStep('OFFERINGS_START');
            let offerings;
            try {
                offerings = await Purchases.getOfferings();
                addPurchaseStep('OFFERINGS_SUCCESS', {
                    hasOfferings: !!offerings,
                    hasCurrent: !!offerings?.current,
                    packageCount: offerings?.current?.availablePackages?.length || 0
                });
                console.log('6. Offerings retrieved:', {
                    hasOfferings: !!offerings,
                    hasCurrent: !!offerings?.current,
                    packageCount: offerings?.current?.availablePackages?.length || 0
                });
            } catch (offeringsError) {
                addPurchaseStep('OFFERINGS_FAILED', { error: offeringsError.message });
                throw new Error(`Failed to get offerings: ${offeringsError.message}`);
            }

            if (!offerings || !offerings.current) {
                throw new Error('No subscription offerings available. Please ensure products are configured in App Store Connect.');
            }

            const packages = offerings.current.availablePackages || [];
            if (packages.length === 0) {
                throw new Error('No subscription packages found. Please check App Store Connect configuration.');
            }

            // Log all available packages for debugging
            addPurchaseStep('PACKAGES_ANALYSIS', {
                totalPackages: packages.length,
                packageIdentifiers: packages.map(p => p.identifier),
                productIdentifiers: packages.map(p => p.product?.identifier)
            });

            console.log('7. Available packages analysis:');
            packages.forEach((pkg, index) => {
                console.log(`  Package ${index + 1}:`, {
                    identifier: pkg.identifier,
                    productIdentifier: pkg.product?.identifier,
                    price: pkg.product?.priceString,
                    packageType: pkg.packageType
                });
            });

            // UPDATED: Enhanced package matching with support for basic weekly tier
            let packageId;
            if (tier === 'basic') {
                packageId = 'basic_weekly_test'; // Our test product
            } else {
                packageId = `${tier}_${billingCycle}`;
            }

            addPurchaseStep('PACKAGE_SEARCH', { searchingFor: packageId });

            let packageToPurchase = packages.find(pkg => pkg.identifier === packageId);

            if (!packageToPurchase) {
                // Strategy 1: Try without _package suffix or with alternative naming
                const patterns = [
                    `${tier}_${billingCycle}_package`,
                    `${tier}_${billingCycle}ly`,
                    tier === 'basic' ? 'basic_weekly' : `${tier.toUpperCase()}_${billingCycle.toUpperCase()}`,
                    tier === 'basic' ? 'test_weekly' : `comfortkitchen_${tier}_${billingCycle}`
                ];

                for (const pattern of patterns) {
                    packageToPurchase = packages.find(pkg =>
                        pkg.identifier === pattern ||
                        pkg.product?.identifier === pattern ||
                        pkg.identifier.includes(pattern) ||
                        pkg.product?.identifier?.includes(pattern)
                    );
                    if (packageToPurchase) {
                        addPurchaseStep('PACKAGE_FOUND_PATTERN', {
                            pattern,
                            identifier: packageToPurchase.identifier
                        });
                        break;
                    }
                }
            }

            if (!packageToPurchase) {
                // Strategy 2: Fallback to first package that contains the tier name
                packageToPurchase = packages.find(pkg =>
                    pkg.identifier.toLowerCase().includes(tier.toLowerCase()) ||
                    pkg.product?.identifier?.toLowerCase().includes(tier.toLowerCase())
                );

                if (packageToPurchase) {
                    addPurchaseStep('PACKAGE_FOUND_FALLBACK', { identifier: packageToPurchase.identifier });
                }
            }

            if (!packageToPurchase) {
                const availableIds = packages.map(p => p.identifier).join(', ');
                addPurchaseStep('PACKAGE_NOT_FOUND', {
                    searchedFor: packageId,
                    available: availableIds
                });
                throw new Error(`No package found for ${tier} ${billingCycle}. Available packages: ${availableIds}. Please check App Store Connect product configuration.`);
            }

            console.log('8. Package selected for purchase:', {
                identifier: packageToPurchase.identifier,
                productIdentifier: packageToPurchase.product?.identifier,
                price: packageToPurchase.product?.priceString
            });

            addPurchaseStep('PURCHASE_START', {
                packageIdentifier: packageToPurchase.identifier,
                productPrice: packageToPurchase.product?.priceString
            });

            // ENHANCED: Make the purchase with comprehensive error handling
            let purchaseResult;
            try {
                console.log('9. Initiating purchase...');
                setSuccess('Starting purchase process...');

                purchaseResult = await Purchases.purchasePackage({
                    aPackage: packageToPurchase
                });

                addPurchaseStep('PURCHASE_SUCCESS', {
                    transactionId: purchaseResult.transactionIdentifier,
                    productId: purchaseResult.productIdentifier
                });

                console.log('10. Purchase successful!', {
                    transactionId: purchaseResult.transactionIdentifier,
                    productId: purchaseResult.productIdentifier
                });

                setSuccess('Purchase completed! Verifying with our servers...');

            } catch (purchaseError) {
                addPurchaseStep('PURCHASE_FAILED', {
                    error: purchaseError.message,
                    code: purchaseError.code
                });

                console.error('Purchase failed:', purchaseError);

                // ENHANCED: Handle specific purchase errors with user-friendly messages
                if (purchaseError.message?.includes('ITEM_ALREADY_OWNED')) {
                    setError('You already own this subscription. Try restoring your purchases.');
                    return;
                } else if (purchaseError.message?.includes('USER_CANCELLED')) {
                    setError('Purchase was cancelled.');
                    return;
                } else if (purchaseError.message?.includes('PAYMENT_PENDING')) {
                    setError('Payment is pending. Please check back in a few minutes.');
                    return;
                } else if (purchaseError.message?.includes('ITEM_UNAVAILABLE')) {
                    setError('This subscription is temporarily unavailable. Please try again later.');
                    return;
                } else if (purchaseError.message?.includes('NETWORK_ERROR')) {
                    setError('Network error. Please check your connection and try again.');
                    return;
                }

                throw purchaseError;
            }

            // Track successful purchase
            try {
                await trackEmailEvent({
                    eventType: 'purchase_completed',
                    userEmail: session.user.email,
                    userId: session.user.id,
                    emailType: 'revenuecat_purchase',
                    metadata: {
                        tier,
                        billingCycle,
                        platform: platform.type,
                        packageId: packageToPurchase.identifier,
                        transactionId: purchaseResult.transactionIdentifier
                    }
                });
            } catch (trackingError) {
                console.error('Failed to track purchase event:', trackingError);
            }

            // ENHANCED: Verify purchase with backend
            await handlePurchaseVerification(purchaseResult, tier, billingCycle);

        } catch (error) {
            console.error('RevenueCat purchase error:', error);
            addPurchaseStep('REVENUECAT_ERROR', {
                message: error.message,
                stack: error.stack
            });

            // Enhanced error messages for iPad users
            if (error.message?.includes('configuration')) {
                setError('App Store configuration issue. Please try again later or contact support.');
            } else if (error.message?.includes('network') || error.message?.includes('Network')) {
                setError('Network connection issue. Please check your internet connection and try again.');
            } else if (error.message?.includes('offerings') || error.message?.includes('packages')) {
                setError('Subscription products are being updated. Please try again in a few minutes.');
            } else {
                setError(`Purchase error: ${error.message}`);
            }
        }
    };

    // ENHANCED: Purchase verification with better error handling
    const handlePurchaseVerification = async (purchaseResult, tier, billingCycle) => {
        try {
            addPurchaseStep('VERIFICATION_START');
            console.log('11. Verifying purchase with backend...');

            const response = await apiPost('/api/payments/revenuecat/verify', {
                purchaseResult: purchaseResult,
                tier: tier,
                billingCycle: billingCycle,
                userId: session.user.id
            });

            const data = await response.json();

            if (response.ok) {
                addPurchaseStep('VERIFICATION_SUCCESS');
                setSuccess(`Successfully activated ${tier} ${billingCycle} subscription!`);
                // Refresh subscription data
                subscription.refetch();
            } else {
                addPurchaseStep('VERIFICATION_FAILED', { error: data.error });
                console.error('Backend verification failed:', data);
                setError('Purchase completed but verification failed. Please contact support with your transaction ID.');
            }
        } catch (error) {
            addPurchaseStep('VERIFICATION_ERROR', { error: error.message });
            console.error('Verification error:', error);
            setError('Purchase completed but verification failed. Please contact support.');
        }
    };

    // ENHANCED: iOS Restore Purchases functionality with better error handling
    const handleRestorePurchases = async () => {
        if (!platform.isIOS) {
            setError('Restore purchases is only available on iOS devices.');
            return;
        }

        setIsRestoring(true);
        setError('');
        setSuccess('');
        setPurchaseSteps([]);

        addPurchaseStep('RESTORE_START');

        try {
            console.log('Starting restore purchases...');

            const { Purchases } = await import('@revenuecat/purchases-capacitor');

            // Configure RevenueCat if not already configured
            const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY;
            if (!apiKey) {
                throw new Error('RevenueCat iOS API key not configured');
            }

            await Purchases.configure({
                apiKey: apiKey,
                appUserID: session.user.id
            });

            addPurchaseStep('RESTORE_CONFIGURED');

            // Restore purchases
            const customerInfo = await Purchases.restorePurchases();
            addPurchaseStep('RESTORE_COMPLETED', {
                activeSubscriptions: Object.keys(customerInfo.activeSubscriptions || {}),
                entitlements: Object.keys(customerInfo.entitlements?.all || {})
            });

            console.log('Restore completed:', customerInfo);

            // Check if any active subscriptions were restored
            const activeEntitlements = Object.values(customerInfo.entitlements?.active || {});

            if (activeEntitlements.length > 0) {
                setSuccess('Successfully restored your purchases! Your subscription is now active.');
                subscription.refetch();
            } else {
                setError('No active subscriptions found to restore.');
            }

        } catch (error) {
            console.error('Restore purchases error:', error);
            addPurchaseStep('RESTORE_ERROR', { error: error.message });
            setError(`Failed to restore purchases: ${error.message}`);
        } finally {
            setIsRestoring(false);
        }
    };

    // Handle trial start
    const handleStartTrial = async () => {
        if (subscription.isTrialActive || subscription.tier !== 'free') {
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await apiPost('/api/subscription/start-trial', {
                source: urlSource || 'billing-page'
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess('7-day Platinum trial started! Enjoy full access to all features.');
                // Refresh subscription data
                subscription.refetch();
            } else {
                setError(data.error || 'Failed to start trial');
            }
        } catch (error) {
            console.error('Error starting trial:', error);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle cancellation with platform-specific instructions
    const handleCancelSubscription = async () => {
        let cancelMessage = 'Are you sure you want to cancel your subscription? You\'ll lose access to premium features at the end of your billing period.';

        if (platform.isIOS) {
            cancelMessage += '\n\nNote: For iOS subscriptions, you may also need to cancel through your Apple ID settings.';
        }

        if (!confirm(cancelMessage)) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await apiPost('/api/subscription/cancel', {});
            const data = await response.json();

            if (response.ok) {
                let successMessage = 'Subscription cancelled. You\'ll retain access until the end of your current billing period.';

                if (platform.isIOS) {
                    successMessage += '\n\nTo ensure complete cancellation, also check your Apple ID subscription settings.';
                }

                setSuccess(successMessage);
                subscription.refetch();
            } else {
                setError(data.error || 'Failed to cancel subscription');
            }
        } catch (error) {
            console.error('Error cancelling subscription:', error);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';

        try {
            const dateObj = typeof date === 'string' ? new Date(date) : date;
            if (isNaN(dateObj.getTime())) {
                console.log('Invalid date:', date);
                return 'N/A';
            }
            const month = dateObj.getMonth() + 1;
            const day = dateObj.getDate();
            const year = dateObj.getFullYear();
            return `${month}/${day}/${year}`;
        } catch (error) {
            console.error('Date formatting error:', error, 'for date:', date);
            return 'N/A';
        }
    };

    const getSavings = (plan) => {
        if (plan.price.monthly === 0) return 0;
        const monthlyTotal = plan.price.monthly * 12;
        return Math.round(((monthlyTotal - plan.price.annual) / monthlyTotal) * 100);
    };

    const currentPlan = subscription.isAdmin
        ? plans.platinum
        : plans[subscription.tier] || plans.free;
    const isOnTrial = subscription.isTrialActive;
    const canStartTrial = subscription.tier === 'free' &&
        !subscription.isTrialActive &&
        !subscription.subscriptionData?.hasUsedFreeTrial;
    const effectiveTier = subscription.isAdmin ? 'platinum' :
        subscription.isExpired ? 'free' :
            subscription.originalTier || subscription.tier;

    return (
        <MobileOptimizedLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Account & Billing</h1>
                            <p className="text-gray-600 mt-1">Manage your subscription and billing details</p>
                        </div>
                        <TouchEnhancedButton
                            onClick={() => router.push('/account')}
                            className="text-indigo-600 hover:text-indigo-700"
                        >
                            ← Back to Account
                        </TouchEnhancedButton>
                    </div>
                </div>

                {/* Status Messages */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        {error}
                        {/* ENHANCED: Show debug info for purchases on development */}
                        {process.env.NODE_ENV === 'development' && purchaseSteps.length > 0 && (
                            <details className="mt-4">
                                <summary className="cursor-pointer text-sm font-medium">Debug Information</summary>
                                <div className="mt-2 text-xs bg-red-50 p-2 rounded">
                                    {purchaseSteps.map((step, index) => (
                                        <div key={index} className="mb-1">
                                            <strong>{step.step}:</strong> {JSON.stringify(step.data)}
                                        </div>
                                    ))}
                                </div>
                            </details>
                        )}
                    </div>
                )}

                {success && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                        {success}
                    </div>
                )}

                {/* ENHANCED: iOS Restore Purchases Button - More Prominent */}
                {platform.isIOS && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <div className="text-center">
                            <div className="text-4xl mb-3">🔄</div>
                            <h3 className="text-blue-900 font-semibold text-lg mb-2">Already purchased?</h3>
                            <p className="text-blue-700 mb-4">
                                If you've already purchased a subscription on this device or with your Apple ID,
                                restore your purchases to regain access.
                            </p>
                            <TouchEnhancedButton
                                onClick={handleRestorePurchases}
                                disabled={isRestoring}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold text-lg"
                            >
                                {isRestoring ? 'Restoring...' : 'Restore Purchases'}
                            </TouchEnhancedButton>
                        </div>
                    </div>
                )}

                {/* Current Subscription Status */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Plan</h2>

                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                effectiveTier === 'free' ? 'bg-gray-100 text-gray-800' :
                                    effectiveTier === 'basic' ? 'bg-green-100 text-green-800' :
                                        effectiveTier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-purple-100 text-purple-800'
                            }`}>
                                {currentPlan.name}
                                {isOnTrial && ' (Trial)'}
                                {subscription.isAdmin && ' (Admin)'}
                            </div>

                            {subscription.billingCycle && (
                                <span className="text-sm text-gray-600">
                                    Billed {subscription.billingCycle}
                                </span>
                            )}
                        </div>

                        <div className="text-right">
                            {effectiveTier === 'free' ? (
                                <span className="text-2xl font-bold text-gray-900">Free</span>
                            ) : (
                                <div>
                                    <span className="text-2xl font-bold text-gray-900">
                                        ${subscription.billingCycle === 'annual'
                                        ? currentPlan.price.annual
                                        : subscription.billingCycle === 'weekly'
                                            ? currentPlan.price.weekly
                                            : currentPlan.price.monthly}
                                    </span>
                                    <span className="text-gray-600 text-sm">
                                        /{subscription.billingCycle === 'annual' ? 'year' :
                                        subscription.billingCycle === 'weekly' ? 'week' : 'month'}
                                    </span>
                                    <span className="text-gray-600 text-sm">
                                /{subscription.billingCycle === 'annual' ? 'year' :
                                        subscription.billingCycle === 'weekly' ? 'week' : 'month'}
                            </span>
                                    {subscription.isAdmin && (
                                        <div className="text-xs text-purple-600 font-medium">Admin Access</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <p className="text-gray-600 mb-4">{currentPlan.description}</p>

                    {/* Trial Information */}
                    {isOnTrial && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <div className="flex items-center">
                                <span className="text-blue-600 text-lg mr-2">🎉</span>
                                <div>
                                    <h4 className="text-blue-900 font-medium">Trial Active</h4>
                                    <p className="text-blue-700 text-sm">
                                        Your 7-day Platinum trial ends on {formatDate(subscription.trialEndDate)}
                                        {subscription.daysUntilTrialEnd && (
                                            <span> ({subscription.daysUntilTrialEnd} days remaining)</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Billing Information */}
                    {subscription.tier !== 'free' && !isOnTrial && (
                        <div className="border-t pt-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-600">Next billing date:</span>
                                    <span className="ml-2 font-medium">{formatDate(subscription.endDate)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600">Started:</span>
                                    <span className="ml-2 font-medium">{formatDate(subscription.startDate)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Usage Summary */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Usage This Month</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-indigo-600">{subscription.usage.inventoryItems || 0}</div>
                            <div className="text-sm text-gray-600">Inventory Items</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{subscription.usage.monthlyReceiptScans || 0}</div>
                            <div className="text-sm text-gray-600">Receipt Scans</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{subscription.usage.savedRecipes || 0}</div>
                            <div className="text-sm text-gray-600">Saved Recipes</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">{subscription.usage.personalRecipes || 0}</div>
                            <div className="text-sm text-gray-600">Personal Recipes</div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                {canStartTrial && (
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Try Platinum Free for 7 Days
                            </h3>
                            <p className="text-gray-600 mb-4">
                                Get full access to all premium features with no commitment
                            </p>
                            <TouchEnhancedButton
                                onClick={handleStartTrial}
                                disabled={loading}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium"
                            >
                                {loading ? 'Starting Trial...' : 'Start Free Trial'}
                            </TouchEnhancedButton>
                        </div>
                    </div>
                )}

                {/* Plan Comparison */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Plans</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {Object.entries(plans).map(([tierKey, plan]) => {
                            const isCurrentPlan = effectiveTier === tierKey;
                            const savings = getSavings(plan);

                            return (
                                <div
                                    key={tierKey}
                                    className={`border-2 rounded-lg p-6 ${
                                        isCurrentPlan
                                            ? 'border-indigo-500 bg-indigo-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="text-center mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            {plan.name}
                                            {isCurrentPlan && (
                                                <span className="ml-2 text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                                            Current
                                        </span>
                                            )}
                                        </h3>

                                        <div className="mb-4">
                                            {tierKey === 'free' ? (
                                                <span className="text-2xl font-bold text-gray-900">Free</span>
                                            ) : tierKey === 'basic' ? (
                                                <div>
                                                    <div className="text-2xl font-bold text-gray-900">
                                                        ${plan.price.weekly}
                                                        <span className="text-base text-gray-600">/week</span>
                                                    </div>
                                                    <div className="text-xs text-green-600 font-medium">
                                                        Test Subscription
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="text-2xl font-bold text-gray-900">
                                                        ${plan.price.annual}
                                                        <span className="text-base text-gray-600">/year</span>
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        ${plan.price.monthly}/month
                                                    </div>
                                                    {savings > 0 && (
                                                        <div className="text-xs text-green-600 font-medium">
                                                            Save {savings}% annually
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <ul className="space-y-2 mb-6">
                                        {plan.features.map((feature, index) => (
                                            <li key={index} className="flex items-center text-sm">
                                                <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>

                                    {!isCurrentPlan && !subscription.isAdmin && (
                                        <TouchEnhancedButton
                                            onClick={() => handleSubscriptionChange(
                                                tierKey,
                                                tierKey === 'basic' ? 'weekly' : 'annual'
                                            )}
                                            disabled={loading}
                                            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                                                tierKey === 'free'
                                                    ? 'bg-gray-600 hover:bg-gray-700 text-white'
                                                    : tierKey === 'basic'
                                                        ? 'bg-green-600 hover:bg-green-700 text-white'
                                                        : tierKey === 'gold'
                                                            ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                                            }`}
                                        >
                                            {loading ? 'Processing...' :
                                                tierKey === 'free' ? 'Downgrade to Free' :
                                                    platform.isIOS ? `Get ${plan.name} via App Store` :
                                                        `Upgrade to ${plan.name}`}
                                        </TouchEnhancedButton>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* iOS Subscription Management Link */}
                    {platform.isIOS && subscription.tier !== 'free' && (
                        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h3 className="text-blue-900 font-medium mb-2">Manage Your Subscription</h3>
                            <p className="text-blue-700 text-sm mb-3">
                                To manage your subscription, change billing information, or cancel, you can also use your device settings.
                            </p>
                            <TouchEnhancedButton
                                onClick={() => {
                                    // Open iOS Settings app to subscription management
                                    if (platform.isIOS) {
                                        window.location.href = 'https://apps.apple.com/account/subscriptions';
                                    }
                                }}
                                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                            >
                                Open iOS Subscription Settings →
                            </TouchEnhancedButton>
                        </div>
                    )}
                </div>

                {/* Cancel Subscription */}
                {subscription.tier !== 'free' && !isOnTrial && (
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Cancel Subscription</h2>
                        <p className="text-gray-600 mb-4">
                            You can cancel your subscription at any time. You'll retain access to premium features until the end of your current billing period.
                        </p>

                        {/* Platform-specific cancellation instructions */}
                        {platform.isIOS && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                <h4 className="text-yellow-800 font-medium mb-2">iOS Subscription Notice</h4>
                                <p className="text-yellow-700 text-sm">
                                    For subscriptions purchased through the App Store, you may also need to cancel directly through your Apple ID settings to ensure complete cancellation.
                                </p>
                            </div>
                        )}

                        <TouchEnhancedButton
                            onClick={handleCancelSubscription}
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
                        >
                            {loading ? 'Processing...' : 'Cancel Subscription'}
                        </TouchEnhancedButton>
                    </div>
                )}

                {/* Terms of Service and Privacy Policy Links (App Store Requirement) */}
                <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-gray-900 font-medium mb-4">Terms & Privacy</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <TouchEnhancedButton
                                onClick={() => router.push('/legal/terms')}
                                className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Terms of Service →
                            </TouchEnhancedButton>
                            <p className="text-gray-600 mt-1">
                                View our terms and conditions for subscription services.
                            </p>
                        </div>
                        <div>
                            <TouchEnhancedButton
                                onClick={() => router.push('/legal/privacy')}
                                className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Privacy Policy →
                            </TouchEnhancedButton>
                            <p className="text-gray-600 mt-1">
                                Learn how we protect and use your data.
                            </p>
                        </div>
                    </div>

                    {/* Subscription-specific legal notices */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-gray-900 font-medium text-sm mb-2">Subscription Terms</h4>
                        <ul className="text-xs text-gray-600 space-y-1">
                            <li>• Subscriptions automatically renew unless cancelled</li>
                            <li>• You can cancel anytime through your account settings</li>
                            <li>• Refunds are subject to our Terms of Service</li>
                            <li>• Pricing may vary by region and platform</li>
                            {platform.isIOS && (
                                <li>• iOS subscriptions are managed through your Apple ID</li>
                            )}
                        </ul>
                    </div>
                </div>

                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}

// Main component wrapped with Suspense
export default function BillingPage() {
    return (
        <Suspense fallback={
            <MobileOptimizedLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <div className="text-lg text-gray-600">Loading...</div>
                    </div>
                </div>
            </MobileOptimizedLayout>
        }>
            <BillingContent />
        </Suspense>
    );
}