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
import NativeNavigation from "@/components/mobile/NativeNavigation.js";

// Separate component for search params to wrap in Suspense
function BillingContent() {
    const { data: session, status } = useSafeSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const subscription = useSubscription();
    const platform = usePlatform();

    // Get URL parameters from pricing page
    const urlSource = searchParams.get('source');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isRestoring, setIsRestoring] = useState(false);
    const [purchaseSteps, setPurchaseSteps] = useState([]);
    const [purchaseCompleted, setPurchaseCompleted] = useState(false);

    // ENHANCED: Better debug tracking for iPad issues
    const addPurchaseStep = (step, data = {}) => {
        const timestamp = new Date().toISOString();
        const newStep = { step, timestamp, data };
        setPurchaseSteps(prev => [...prev, newStep]);
        console.log(`📱 Purchase Step ${purchaseSteps.length + 1}:`, step, data);
    };

    // Error boundary for debugging
    useEffect(() => {
        const handleError = async (error) => {
            console.error('🚨 Global error caught:', error);
            addPurchaseStep('GLOBAL_ERROR', {message: error.message, stack: error.stack});
            const {NativeDialog} = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'App Error',
                message: error.message
            });
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', async (event) => {
            console.error('🚨 Unhandled promise rejection:', event.reason);
            addPurchaseStep('PROMISE_REJECTION', {reason: event.reason?.message || 'Unknown error'});
            const {NativeDialog} = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Promise Error',
                message: event.reason?.message || 'Unknown error'
            });
        });

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleError);
        };
    }, [purchaseSteps.length]);

    // Early returns for auth
    useEffect(() => {
        if (status === 'unauthenticated') {
            NativeNavigation.routerPush(router, '/auth/signin');
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

        if (purchaseCompleted) {
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showAlert({
                title: 'Purchase Already Completed',
                message: 'You have already completed a purchase. Please refresh the page to see your subscription or contact support if needed.'
            });
            return;
        }

        setLoading(true);
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
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Billing Platform Error',
                    message: `Unknown billing platform: ${platform.billingProvider}`
                });
                return;
            }
        } catch (error) {
            console.error('Error in subscription change:', error);
            addPurchaseStep('SUBSCRIPTION_CHANGE_ERROR', { message: error.message });
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Subscription Error',
                message: `Subscription change failed: ${error.message}`
            });
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
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Checkout Error',
                message: data.error || 'Failed to create checkout session'
            });
            return;
        }
    };

    // ENHANCED: RevenueCat purchase flow with better offerings error handling
    const handleRevenueCatPurchase = async (tier, billingCycle) => {
        try {
            addPurchaseStep('REVENUECAT_FLOW_START');

            // Better iPad/iOS detection and error handling
            if (!platform.isIOS && !platform.isAndroid) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Mobile Required',
                    message: 'RevenueCat purchases are only available on mobile devices'
                });
                return;
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
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'SDK Not Available',
                    message: `RevenueCat SDK not available: ${importError.message}`
                });
                return;
            }

            // Get API key for iOS
            const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY;
            console.log('3. API key check:', !!apiKey);
            addPurchaseStep('API_KEY_CHECK', { hasKey: !!apiKey });

            if (!apiKey) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Configuration Error',
                    message: 'RevenueCat iOS API key not configured'
                });
                return;
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
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Configuration Failed',
                    message: `RevenueCat configuration failed: ${configError.message}`
                });
                return;
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
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Customer Info Error',
                    message: `Failed to get customer info: ${customerError.message}`
                });
                return;
            }

            // ENHANCED: Get offerings with comprehensive error handling and retry logic
            addPurchaseStep('OFFERINGS_START');
            let offerings;
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
                try {
                    console.log(`6. Attempting to get offerings (attempt ${retryCount + 1}/${maxRetries})...`);
                    offerings = await Purchases.getOfferings();

                    addPurchaseStep('OFFERINGS_SUCCESS', {
                        hasOfferings: !!offerings,
                        hasCurrent: !!offerings?.current,
                        packageCount: offerings?.current?.availablePackages?.length || 0,
                        attempt: retryCount + 1
                    });

                    console.log('6. Offerings retrieved:', {
                        hasOfferings: !!offerings,
                        hasCurrent: !!offerings?.current,
                        packageCount: offerings?.current?.availablePackages?.length || 0
                    });

                    break; // Success, exit retry loop

                } catch (offeringsError) {
                    retryCount++;
                    console.error(`Offerings attempt ${retryCount} failed:`, offeringsError.message);

                    addPurchaseStep('OFFERINGS_RETRY', {
                        attempt: retryCount,
                        error: offeringsError.message,
                        willRetry: retryCount < maxRetries
                    });

                    if (retryCount >= maxRetries) {
                        // Final attempt failed
                        addPurchaseStep('OFFERINGS_FAILED', { error: offeringsError.message });

                        const { NativeDialog } = await import('@/components/mobile/NativeDialog');

                        // Provide specific error messages based on error type
                        if (offeringsError.message?.includes('no products registered')) {
                            await NativeDialog.showError({
                                title: 'Store Configuration Issue',
                                message: 'The App Store subscriptions are being set up. This usually resolves within 24-48 hours after App Store review approval. Please try again later.'
                            });
                        } else if (offeringsError.message?.includes('network') || offeringsError.message?.includes('Network')) {
                            await NativeDialog.showError({
                                title: 'Network Error',
                                message: 'Unable to connect to the App Store. Please check your internet connection and try again.'
                            });
                        } else if (offeringsError.message?.includes('configuration')) {
                            await NativeDialog.showError({
                                title: 'Configuration Error',
                                message: 'App Store configuration is being updated. Please try again in a few minutes.'
                            });
                        } else {
                            await NativeDialog.showError({
                                title: 'Store Temporarily Unavailable',
                                message: `Unable to load subscription options: ${offeringsError.message}. Please try again later.`
                            });
                        }
                        return;
                    } else {
                        // Wait before retry (exponential backoff)
                        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
                    }
                }
            }

            // Validate offerings
            if (!offerings || !offerings.current) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Store Unavailable',
                    message: 'No subscription offerings available. This may be due to pending App Store review. Please try again later.'
                });
                return;
            }

            const packages = offerings.current.availablePackages || [];
            if (packages.length === 0) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Subscriptions Unavailable',
                    message: 'No subscription packages found. The subscriptions may still be under review by Apple. Please try again later.'
                });
                return;
            }

            // Log all available packages for debugging
            addPurchaseStep('PACKAGES_ANALYSIS', {
                totalPackages: packages.length,
                packageIdentifiers: packages.map(p => p.identifier),
                productIdentifiers: packages.map(p => p.product?.identifier)
            });

            console.log('7. Available packages:', packages.map(p => ({
                identifier: p.identifier,
                productId: p.product?.identifier,
                price: p.product?.priceString
            })));

            // ENHANCED: Find the correct package with better matching logic
            const targetPackageId = `${tier}_${billingCycle}_package`;
            let packageToPurchase = packages.find(p => p.identifier === targetPackageId);

            // If exact match not found, try alternative matching
            if (!packageToPurchase) {
                // Try matching by product identifier
                packageToPurchase = packages.find(p => p.product?.identifier === targetPackageId);
            }

            // If still not found, try more flexible matching
            if (!packageToPurchase) {
                const tierKeywords = tier.toLowerCase();
                const cycleKeywords = billingCycle.toLowerCase();

                packageToPurchase = packages.find(p => {
                    const id = (p.identifier || '').toLowerCase();
                    const productId = (p.product?.identifier || '').toLowerCase();

                    return (id.includes(tierKeywords) || productId.includes(tierKeywords)) &&
                        (id.includes(cycleKeywords) || productId.includes(cycleKeywords));
                });
            }

            if (!packageToPurchase) {
                console.error('❌ Could not find package for:', targetPackageId);
                console.log('Available packages:', packages.map(p => ({
                    id: p.identifier,
                    productId: p.product?.identifier
                })));

                addPurchaseStep('PACKAGE_NOT_FOUND', {
                    targetPackageId,
                    availablePackages: packages.map(p => p.identifier)
                });

                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Subscription Not Available',
                    message: `The ${tier} ${billingCycle} subscription package is not currently available. Looking for: ${targetPackageId}`
                });
                return;
            }

            addPurchaseStep('PACKAGE_FOUND', {
                packageId: packageToPurchase.identifier,
                productId: packageToPurchase.product?.identifier,
                price: packageToPurchase.product?.priceString
            });

            console.log('8. Found package to purchase:', {
                identifier: packageToPurchase.identifier,
                productId: packageToPurchase.product?.identifier,
                price: packageToPurchase.product?.priceString
            });

            // ENHANCED: Make the purchase with better error handling
            addPurchaseStep('PURCHASE_START');
            let purchaseResult;
            try {
                console.log('9. Starting purchase...');
                purchaseResult = await Purchases.purchasePackage({ aPackage: packageToPurchase });
                addPurchaseStep('PURCHASE_SUCCESS', {
                    transactionId: purchaseResult.transactionIdentifier,
                    customerInfo: {
                        userId: purchaseResult.customerInfo?.originalAppUserId,
                        activeSubscriptions: Object.keys(purchaseResult.customerInfo?.activeSubscriptions || {}),
                        entitlements: Object.keys(purchaseResult.customerInfo?.entitlements?.all || {})
                    }
                });
                console.log('10. Purchase completed successfully!');
            } catch (purchaseError) {
                addPurchaseStep('PURCHASE_FAILED', { error: purchaseError.message });
                console.error('Purchase failed:', purchaseError);

                const { NativeDialog } = await import('@/components/mobile/NativeDialog');

                // Handle specific purchase errors
                if (purchaseError.message?.includes('cancelled') || purchaseError.message?.includes('user_cancelled')) {
                    // User cancelled - don't show error, just return
                    console.log('User cancelled purchase');
                    return;
                } else if (purchaseError.message?.includes('already_purchased')) {
                    await NativeDialog.showAlert({
                        title: 'Already Subscribed',
                        message: 'You already have this subscription. Please use "Restore Purchases" if needed.'
                    });
                    return;
                } else if (purchaseError.message?.includes('billing_unavailable')) {
                    await NativeDialog.showAlert({
                        title: 'Billing Unavailable',
                        message: 'In-app purchases are not available on this device. Please try again later.'
                    });
                    return;
                } else if (purchaseError.message?.includes('NETWORK_ERROR')) {
                    await NativeDialog.showAlert({
                        title: 'Network Error',
                        message: 'Network error. Please check your connection and try again.'
                    });
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
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            if (error.message?.includes('configuration')) {
                await NativeDialog.showError({
                    title: 'Configuration Issue',
                    message: 'App Store configuration issue. The subscriptions may still be under Apple review. Please try again later.'
                });
            } else if (error.message?.includes('network') || error.message?.includes('Network')) {
                await NativeDialog.showError({
                    title: 'Network Error',
                    message: 'Network connection issue. Please check your internet connection and try again.'
                });
            } else if (error.message?.includes('offerings') || error.message?.includes('packages')) {
                await NativeDialog.showError({
                    title: 'Store Temporarily Unavailable',
                    message: 'Subscription store is temporarily unavailable. This often happens when subscriptions are under App Store review. Please try again later.'
                });
            } else {
                await NativeDialog.showError({
                    title: 'Purchase Error',
                    message: error.message
                });
            }
        } finally {
            // CRITICAL FIX: Always clear loading state regardless of success/failure
            setLoading(false);
        }
        setPurchaseCompleted(true);
    };

    // ENHANCED: Purchase verification with better error handling
    const handlePurchaseVerification = async (purchaseResult, tier, billingCycle) => {
        try {
            addPurchaseStep('VERIFICATION_START');
            console.log('11. Verifying purchase with backend...');

            // CRITICAL: Set purchase as completed regardless of backend verification
            // The App Store purchase was successful, so we treat it as successful
            setSuccess(`🎉 Purchase completed! Activating your ${tier} subscription...`);

            // Try backend verification but don't block success on it
            try {
                const response = await apiPost('/api/payments/revenuecat/verify', {
                    purchaseResult: purchaseResult,
                    tier: tier,
                    billingCycle: billingCycle,
                    userId: session.user.id
                });

                const data = await response.json();

                if (response.ok) {
                    addPurchaseStep('VERIFICATION_SUCCESS');
                    setSuccess(`✅ Successfully activated ${tier} ${billingCycle} subscription!`);

                    // CRITICAL: Multiple refresh strategies to ensure UI updates
                    console.log('🔄 Refreshing subscription and session data...');

                    // Strategy 1: Force refresh subscription hook
                    subscription.refetch();

                    // Strategy 2: Use refreshFromDatabase if available
                    if (subscription.refreshFromDatabase) {
                        await subscription.refreshFromDatabase();
                    }

                    // Strategy 3: Force refresh session to get updated user data
                    try {
                        const sessionRefreshResponse = await apiPost('/api/auth/refresh-session');
                        if (sessionRefreshResponse.ok) {
                            console.log('✅ Session refresh successful');
                            // Force a page reload to ensure all hooks pick up new data
                            setTimeout(() => {
                                window.location.reload();
                            }, 2000);
                        }
                    } catch (sessionError) {
                        console.warn('Session refresh failed, forcing page reload:', sessionError);
                        // Fallback: just reload the page
                        setTimeout(() => {
                            window.location.reload();
                        }, 2000);
                    }

                } else {
                    addPurchaseStep('VERIFICATION_FAILED', { error: data.error });
                    console.error('Backend verification failed:', data);

                    // Show user that purchase was successful but verification had issues
                    setSuccess(`✅ Purchase successful! Your ${tier} subscription is active. Refreshing your account...`);

                    // Force page refresh to pick up changes from RevenueCat webhook
                    setTimeout(() => {
                        window.location.reload();
                    }, 3000);

                    // Show additional dialog for support if needed
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    setTimeout(async () => {
                        await NativeDialog.showAlert({
                            title: 'Purchase Successful',
                            message: 'Your subscription is active! The page will refresh to show your new features.'
                        });
                    }, 2000);
                }
            } catch (verificationError) {
                addPurchaseStep('VERIFICATION_ERROR', { error: verificationError.message });
                console.error('Verification error:', verificationError);

                // Still show success since App Store purchase completed
                setSuccess(`✅ Purchase successful! Your ${tier} subscription is active. Refreshing your account...`);

                // Force page refresh - RevenueCat webhook should have updated the database
                setTimeout(() => {
                    window.location.reload();
                }, 3000);

                // Show additional dialog
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                setTimeout(async () => {
                    await NativeDialog.showAlert({
                        title: 'Purchase Successful',
                        message: 'Your App Store purchase completed successfully! The page will refresh to show your subscription.'
                    });
                }, 2000);
            }

        } catch (error) {
            // This should rarely happen since we're being more permissive above
            addPurchaseStep('VERIFICATION_CRITICAL_ERROR', { error: error.message });
            console.error('Critical verification error:', error);

            // Even on critical error, assume purchase was successful since RevenueCat completed
            setSuccess(`✅ Purchase completed! Refreshing your account...`);

            // Force page refresh
            setTimeout(() => {
                window.location.reload();
            }, 3000);

            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showAlert({
                title: 'Purchase Completed',
                message: 'Your purchase went through successfully! The page will refresh to show your subscription.'
            });
        }
    };

    // ENHANCED: iOS Restore Purchases functionality with better error handling
    const handleRestorePurchases = async () => {
        if (!platform.isIOS) {
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showAlert({
                title: 'iOS Only Feature',
                message: 'Restore purchases is only available on iOS devices.'
            });
            return;
        }

        setIsRestoring(true);
        setSuccess('');
        setPurchaseSteps([]);

        addPurchaseStep('RESTORE_START');

        try {
            console.log('Starting restore purchases...');

            const { Purchases } = await import('@revenuecat/purchases-capacitor');

            // Configure RevenueCat if not already configured
            const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY;
            if (!apiKey) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Configuration Error',
                    message: 'RevenueCat iOS API key not configured'
                });
                return;
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
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showAlert({
                    title: 'No Subscriptions Found',
                    message: 'No active subscriptions found to restore.'
                });
            }

        } catch (error) {
            console.error('Restore purchases error:', error);
            addPurchaseStep('RESTORE_ERROR', { error: error.message });
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Restore Failed',
                message: `Failed to restore purchases: ${error.message}`
            });
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
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Trial Start Failed',
                    message: data.error || 'Failed to start trial'
                });
            }
        } catch (error) {
            console.error('Error starting trial:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Network Error',
                message: 'Network error. Please try again.'
            });
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

        const { NativeDialog } = await import('@/components/mobile/NativeDialog');
        const confirmed = await NativeDialog.showConfirm({
            title: 'Cancel Subscription',
            message: cancelMessage,
            confirmText: 'Cancel Subscription',
            cancelText: 'Keep Subscription'
        });
        if (!confirmed) {
            return;
        }

        setLoading(true);

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
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Cancellation Failed',
                    message: data.error || 'Failed to cancel subscription'
                });
            }
        } catch (error) {
            console.error('Error cancelling subscription:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Network Error',
                message: 'Network error. Please try again.'
            });
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
        !subscription.hasUsedFreeTrial &&
        !session?.user?.subscription?.hasUsedFreeTrial;
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
                            onClick={() => NativeNavigation.routerPush(router, '/account')}
                            className="text-indigo-600 hover:text-indigo-700"
                        >
                            ← Back to Account
                        </TouchEnhancedButton>
                    </div>
                </div>

                {/* Trial Activation Section */}
                {canStartTrial && (
                    <div className="bg-white shadow rounded-lg p-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                Activate Your 7-Day Free Trial
                            </h2>
                            <p className="text-gray-600 mb-6 max-w-lg mx-auto">
                                Experience all Platinum features completely free for 7 days.
                                No credit card required, cancel anytime.
                            </p>

                            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6 mb-6">
                                <h3 className="font-semibold text-purple-900 mb-4">Trial Includes Full Access To:</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-purple-800">
                                    <div className="flex items-center">
                                        <span className="text-green-600 mr-2">✓</span>
                                        Unlimited inventory items
                                    </div>
                                    <div className="flex items-center">
                                        <span className="text-green-600 mr-2">✓</span>
                                        Unlimited receipt scanning
                                    </div>
                                    <div className="flex items-center">
                                        <span className="text-green-600 mr-2">✓</span>
                                        Advanced meal planning
                                    </div>
                                    <div className="flex items-center">
                                        <span className="text-green-600 mr-2">✓</span>
                                        Nutrition goal tracking
                                    </div>
                                    <div className="flex items-center">
                                        <span className="text-green-600 mr-2">✓</span>
                                        Priority support
                                    </div>
                                    <div className="flex items-center">
                                        <span className="text-green-600 mr-2">✓</span>
                                        All premium features
                                    </div>
                                </div>
                            </div>

                            <TouchEnhancedButton
                                onClick={async () => {
                                    try {
                                        setLoading(true);
                                        const response = await apiPost('/api/subscription/activate-trial', {
                                            tier: 'platinum'
                                        });

                                        const data = await response.json();

                                        if (response.ok) {
                                            setSuccess('Free trial activated! You now have 7 days of full Platinum access.');
                                            subscription.refetch();
                                        } else {
                                            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                                            await NativeDialog.showError({
                                                title: 'Trial Activation Failed',
                                                message: data.error || 'Failed to activate trial'
                                            });
                                        }
                                    } catch (error) {
                                        const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                                        await NativeDialog.showError({
                                            title: 'Network Error',
                                            message: 'Please try again'
                                        });
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                disabled={loading}
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-3 rounded-lg font-semibold text-lg"
                            >
                                {loading ? 'Activating Trial...' : 'Activate Free Trial Now'}
                            </TouchEnhancedButton>

                            <p className="text-xs text-gray-500 mt-4">
                                After your trial ends, you can choose to subscribe or continue with the free plan
                            </p>
                        </div>
                    </div>
                )}

                {/* Status Messages */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                )}

                {/* VISUAL DEBUG PANEL - Always visible for testing */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-blue-900 font-semibold mb-3">🔍 Debug Information</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                            <h4 className="font-medium text-blue-800 mb-2">Subscription Status:</h4>
                            <div className="bg-white p-2 rounded border">
                                <div><strong>Tier:</strong> {subscription.tier || 'undefined'}</div>
                                <div><strong>Status:</strong> {subscription.status || 'undefined'}</div>
                                <div><strong>Platform:</strong> {subscription.platform || 'undefined'}</div>
                                <div><strong>RevenueCat ID:</strong> {subscription.usage?.revenueCatCustomerId || 'none'}</div>
                                <div><strong>Billing Provider:</strong> {platform?.billingProvider || 'undefined'}</div>
                                <div><strong>Is Admin:</strong> {subscription.isAdmin ? 'Yes' : 'No'}</div>
                                <div><strong>Is Active:</strong> {subscription.isActive ? 'Yes' : 'No'}</div>
                                <div><strong>Has Used Trial:</strong> {subscription.hasUsedFreeTrial ? 'Yes' : 'No'}</div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-medium text-blue-800 mb-2">Session Info:</h4>
                            <div className="bg-white p-2 rounded border">
                                <div><strong>User ID:</strong> {session?.user?.id?.slice(-8) || 'undefined'}</div>
                                <div><strong>Email:</strong> {session?.user?.email || 'undefined'}</div>
                                <div><strong>Session Tier:</strong> {session?.user?.subscriptionTier || 'undefined'}</div>
                                <div><strong>Platform Type:</strong> {platform?.type || 'undefined'}</div>
                                <div><strong>Is iOS:</strong> {platform?.isIOS ? 'Yes' : 'No'}</div>
                                <div><strong>Billing Provider:</strong> {platform?.billingProvider || 'undefined'}</div>
                            </div>
                        </div>
                    </div>

                    {purchaseSteps.length > 0 && (
                        <div className="mt-4">
                            <h4 className="font-medium text-blue-800 mb-2">Purchase Steps:</h4>
                            <div className="bg-white p-2 rounded border max-h-32 overflow-y-auto">
                                {purchaseSteps.slice(-5).map((step, index) => (
                                    <div key={index} className="text-xs mb-1 border-b pb-1">
                                        <strong>{step.step}:</strong> {step.timestamp.slice(-8)}
                                        {step.data && Object.keys(step.data).length > 0 && (
                                            <div className="text-gray-600 ml-2">
                                                {Object.entries(step.data).map(([key, value]) => (
                                                    <div key={key}>{key}: {typeof value === 'object' ? JSON.stringify(value).slice(0, 50) : String(value)}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-3 flex gap-2">
                        <TouchEnhancedButton
                            onClick={() => subscription.refetch()}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-xs"
                        >
                            Force Refresh Subscription
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={() => window.location.reload()}
                            className="bg-gray-600 text-white px-3 py-1 rounded text-xs"
                        >
                            Reload Page
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={async () => {
                                try {
                                    const response = await apiPost('/api/auth/refresh-session');
                                    if (response.ok) {
                                        setSuccess('Session refreshed successfully!');
                                        setTimeout(() => window.location.reload(), 1000);
                                    } else {
                                        setError('Failed to refresh session');
                                    }
                                } catch (err) {
                                    setError('Error refreshing session: ' + err.message);
                                }
                            }}
                            className="bg-green-600 text-white px-3 py-1 rounded text-xs"
                        >
                            Refresh Session
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={async () => {
                                try {
                                    // Use GET method instead of POST
                                    const response = await fetch('/api/subscription/status', {
                                        method: 'GET',
                                        headers: { 'Cache-Control': 'no-cache' }
                                    });
                                    if (response.ok) {
                                        const data = await response.json();
                                        setSuccess('Raw data: ' + JSON.stringify(data, null, 2).substring(0, 500) + '...');
                                    } else {
                                        setError('Failed to get raw data: ' + response.status);
                                    }
                                } catch (err) {
                                    setError('Error: ' + err.message);
                                }
                            }}
                            className="bg-yellow-600 text-white px-3 py-1 rounded text-xs"
                        >
                            Show Raw Data
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={async () => {
                                try {
                                    setSuccess('Forcing database save to add platform field...');

                                    // Force a refresh which should trigger the platform fix logic
                                    const response = await fetch('/api/subscription/status?' + Date.now(), {
                                        method: 'GET',
                                        headers: { 'Cache-Control': 'no-cache' }
                                    });

                                    if (response.ok) {
                                        setSuccess('✅ Platform check completed! Refreshing page...');
                                        setTimeout(() => window.location.reload(), 1000);
                                    } else {
                                        setError('Failed to check platform');
                                    }
                                } catch (err) {
                                    setError('Error: ' + err.message);
                                }
                            }}
                            className="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold"
                        >
                            🔧 Trigger Platform Fix
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={async () => {
                                try {
                                    setSuccess('Performing nuclear refresh...');

                                    // Step 1: Clear all caches
                                    if (typeof window !== 'undefined') {
                                        // Clear all storage
                                        localStorage.clear();
                                        sessionStorage.clear();

                                        // Clear any React Query caches if you're using them
                                        if (window.queryClient) {
                                            window.queryClient.clear();
                                        }
                                    }

                                    // Step 2: Force session refresh
                                    await fetch('/api/auth/refresh-session', {
                                        method: 'POST',
                                        headers: { 'Cache-Control': 'no-cache' }
                                    });

                                    // Step 3: Force subscription refresh
                                    await fetch('/api/subscription/status?' + Date.now(), {
                                        method: 'GET',
                                        headers: { 'Cache-Control': 'no-cache' }
                                    });

                                    // Step 4: Force page reload
                                    setSuccess('✅ Nuclear refresh complete! Reloading...');
                                    setTimeout(() => {
                                        window.location.href = window.location.href + '?t=' + Date.now();
                                    }, 1000);

                                } catch (err) {
                                    setError('Nuclear refresh failed: ' + err.message);
                                }
                            }}
                            className="bg-purple-600 text-white px-3 py-1 rounded text-xs font-bold"
                        >
                            🔥 NUCLEAR REFRESH
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={async () => {
                                try {
                                    const response = await fetch('/api/subscription/status?' + Date.now(), {
                                        method: 'GET',
                                        headers: { 'Cache-Control': 'no-cache' }
                                    });
                                    if (response.ok) {
                                        const data = await response.json();
                                        setSuccess('🔍 PLATFORM DEBUG: ' + JSON.stringify({
                                            finalPlatform: data.platform,
                                            tier: data.tier,
                                            debugInfo: data.debugInfo,
                                            rawUserSub: data.debugInfo?.userSubscriptionPlatform,
                                            hasRevenueCat: !!data.revenueCatCustomerId
                                        }, null, 2));
                                    } else {
                                        setError('Failed to get debug data: ' + response.status);
                                    }
                                } catch (err) {
                                    setError('Debug error: ' + err.message);
                                }
                            }}
                            className="bg-orange-600 text-white px-3 py-1 rounded text-xs font-bold"
                        >
                            🔍 PLATFORM DEBUG
                        </TouchEnhancedButton>

                    </div>
                </div>

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
                                onClick={() => NativeNavigation.routerPush(router, '/legal/terms')}
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
                                onClick={() => NativeNavigation.routerPush(router, '/legal/privacy')}
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