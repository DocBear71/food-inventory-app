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
    const { data: session, status, update: updateSession } = useSafeSession();
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


    const [debugInfo, setDebugInfo] = useState(null);
    const [showDebugModal, setShowDebugModal] = useState(false);
    const [debugLog, setDebugLog] = useState([]);
    const [showDebugLog, setShowDebugLog] = useState(false);

    // ENHANCED: Better debug tracking for iPad issues
    const addPurchaseStep = (step, data = {}) => {
        const timestamp = new Date().toISOString();
        const newStep = { step, timestamp, data };
        setPurchaseSteps(prev => [...prev, newStep]);
        console.log(`📱 Purchase Step ${purchaseSteps.length + 1}:`, step, data);
    };

    // VISUAL DEBUG: Add debug message that shows on screen
    const addDebugMessage = (message, data = {}, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        const newMessage = {
            id: Date.now(),
            timestamp,
            message,
            data,
            type, // 'info', 'success', 'warning', 'error'
            step: debugLog.length + 1
        };

        setDebugLog(prev => {
            const updated = [...prev.slice(-50), newMessage]; // Keep last 50 messages instead of 20

            // Store in localStorage for persistence
            try {
                localStorage.setItem('debug-log-backup', JSON.stringify(updated));
            } catch (e) {
                console.warn('Could not save debug log to localStorage');
            }

            return updated;
        });

        // Auto-show debug log for important messages
        if (type === 'error' || type === 'success') {
            setShowDebugLog(true);
        }

        console.log(`VISUAL DEBUG ${newMessage.step}: ${message}`, data);
    };

    // DIAGNOSTIC: Direct database check
    const checkDatabaseDirectly = async () => {
        try {
            addDebugMessage('Direct database check started', {}, 'info');

            const response = await fetch('/api/subscription/status?force=true&t=' + Date.now(), {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                cache: 'no-store'
            });

            if (response.ok) {
                const dbData = await response.json();
                addDebugMessage('Database check results', {
                    dbTier: dbData.tier,
                    dbStatus: dbData.status,
                    dbPlatform: dbData.platform,
                    dbIsAdmin: dbData.isAdmin,
                    dbUsage: dbData.usage ? Object.keys(dbData.usage) : 'none'
                }, 'info');

                return dbData;
            } else {
                addDebugMessage('Database check failed', { status: response.status }, 'error');
                return null;
            }
        } catch (error) {
            addDebugMessage('Database check error', { error: error.message }, 'error');
            return null;
        }
    };

    // VISUAL DEBUG: Clear debug log with confirmation
    const clearDebugLog = () => {
        setDebugLog([]);
        setShowDebugLog(false);
        try {
            localStorage.removeItem('debug-log-backup');
        } catch (e) {
            console.warn('Could not clear debug log from localStorage');
        }
    };


    // Load debug log from localStorage on component mount
    useEffect(() => {
        try {
            const savedLog = localStorage.getItem('debug-log-backup');
            if (savedLog) {
                const parsed = JSON.parse(savedLog);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setDebugLog(parsed);
                    addDebugMessage('Recovered debug log from previous session', { count: parsed.length }, 'info');
                }
            }
        } catch (e) {
            console.warn('Could not recover debug log from localStorage');
        }
    }, []);

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
            setDebugInfo({ step: 'Starting RevenueCat purchase', tier, billingCycle });

            if (!platform.isIOS && !platform.isAndroid) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Mobile Required',
                    message: 'RevenueCat purchases are only available on mobile devices'
                });
                return;
            }

            // Import RevenueCat
            let Purchases;
            try {
                const purchasesModule = await import('@revenuecat/purchases-capacitor');
                Purchases = purchasesModule.Purchases;
                setDebugInfo({ step: 'RevenueCat SDK imported successfully' });
            } catch (importError) {
                setDebugInfo({ step: 'RevenueCat import failed', error: importError.message });
                setShowDebugModal(true);
                return;
            }

            // Configure RevenueCat
            const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY;
            if (!apiKey) {
                setDebugInfo({ step: 'Missing API key' });
                setShowDebugModal(true);
                return;
            }

            await Purchases.configure({
                apiKey: apiKey,
                appUserID: null
            });

            setDebugInfo({ step: 'RevenueCat configured successfully' });

            // Get offerings
            const offerings = await Purchases.getOfferings();
            const packages = offerings.current.availablePackages || [];

            // CRITICAL: Visual debug of available packages
            const packageDebugInfo = {
                step: 'Available packages loaded',
                requestedTier: tier,
                requestedBilling: billingCycle,
                availablePackages: packages.map(p => ({
                    identifier: p.identifier,
                    productId: p.product?.identifier,
                    title: p.product?.title,
                    price: p.product?.priceString
                }))
            };

            setDebugInfo(packageDebugInfo);
            setShowDebugModal(true);

            // Wait for user to acknowledge the debug info
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showAlert({
                title: 'Debug: Available Packages',
                message: `Found ${packages.length} packages. Check the debug modal for details. Tap OK to continue.`
            });

            // Find package
            const targetPackageId = `${tier}_${billingCycle}_package`;
            let packageToPurchase = packages.find(p => p.identifier === targetPackageId);

            if (!packageToPurchase) {
                // Try alternative matching
                packageToPurchase = packages.find(p => p.product?.identifier === targetPackageId);
            }

            if (!packageToPurchase) {
                // Try flexible matching
                const tierKeywords = tier.toLowerCase();
                const cycleKeywords = billingCycle.toLowerCase();

                packageToPurchase = packages.find(p => {
                    const id = (p.identifier || '').toLowerCase();
                    const productId = (p.product?.identifier || '').toLowerCase();

                    return (id.includes(tierKeywords) || productId.includes(tierKeywords)) &&
                        (id.includes(cycleKeywords) || productId.includes(cycleKeywords));
                });
            }

            // Show what package will be purchased
            if (packageToPurchase) {
                const purchaseDebugInfo = {
                    step: 'Package found for purchase',
                    targetPackageId,
                    foundPackage: {
                        identifier: packageToPurchase.identifier,
                        productId: packageToPurchase.product?.identifier,
                        title: packageToPurchase.product?.title,
                        price: packageToPurchase.product?.priceString
                    }
                };

                setDebugInfo(purchaseDebugInfo);
                setShowDebugModal(true);

                // Confirm with user
                const confirmed = await NativeDialog.showConfirm({
                    title: 'Confirm Purchase',
                    message: `About to purchase:\n\nProduct: ${packageToPurchase.product?.title}\nPrice: ${packageToPurchase.product?.priceString}\nID: ${packageToPurchase.product?.identifier}\n\nIs this correct?`,
                    confirmText: 'Yes, Purchase This',
                    cancelText: 'Cancel'
                });

                if (!confirmed) {
                    setDebugInfo({ step: 'User cancelled purchase confirmation' });
                    return;
                }

                // Make the purchase
                setDebugInfo({ step: 'Starting App Store purchase...' });
                const purchaseResult = await Purchases.purchasePackage({ aPackage: packageToPurchase });

                // Show purchase result
                const resultDebugInfo = {
                    step: 'Purchase completed',
                    transactionId: purchaseResult.transactionIdentifier,
                    productId: purchaseResult.productIdentifier,
                    customerInfo: {
                        userId: purchaseResult.customerInfo?.originalAppUserId,
                        activeSubscriptions: Object.keys(purchaseResult.customerInfo?.activeSubscriptions || {}),
                        entitlements: Object.keys(purchaseResult.customerInfo?.entitlements?.all || {})
                    }
                };

                setDebugInfo(resultDebugInfo);
                setShowDebugModal(true);

                // Verify the purchase
                await handlePurchaseVerification(purchaseResult, tier, billingCycle);

            } else {
                const errorDebugInfo = {
                    step: 'NO PACKAGE FOUND!',
                    targetPackageId,
                    availablePackages: packages.map(p => p.identifier),
                    error: 'Could not find matching package'
                };

                setDebugInfo(errorDebugInfo);
                setShowDebugModal(true);

                await NativeDialog.showError({
                    title: 'Package Not Found',
                    message: `Could not find package for ${tier} ${billingCycle}. Looking for: ${targetPackageId}`
                });
                return;
            }

        } catch (error) {
            setDebugInfo({
                step: 'PURCHASE ERROR',
                error: error.message,
                errorType: error.constructor.name
            });
            setShowDebugModal(true);

            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Purchase Error',
                message: error.message
            });
        } finally {
            setLoading(false);
        }
        setPurchaseCompleted(true);
    };


    // CRITICAL FIX: Enhanced purchase verification with visual debugging
    const handlePurchaseVerification = async (purchaseResult, tier, billingCycle) => {
        try {
            addPurchaseStep('VERIFICATION_START');
            addDebugMessage('Starting purchase verification', { tier, billingCycle }, 'info');

            // CRITICAL: Set purchase as completed immediately for UI feedback
            setSuccess(`Purchase completed! Activating your ${tier} subscription...`);
            setPurchaseCompleted(true);
            addDebugMessage('Purchase marked as completed', { tier }, 'success');

            const response = await apiPost('/api/payments/revenuecat/verify', {
                purchaseResult: purchaseResult,
                tier: tier,
                billingCycle: billingCycle,
                userId: session.user.id
            });

            addDebugMessage('Verification API called', { status: response.status }, 'info');

            const data = await response.json();
            addDebugMessage('Verification response received', { success: response.ok }, response.ok ? 'success' : 'error');

            if (response.ok) {
                addPurchaseStep('VERIFICATION_SUCCESS');
                setSuccess(`Successfully activated ${tier} ${billingCycle} subscription!`);
                addDebugMessage('Backend verification successful', { tier, billingCycle }, 'success');

                // IMMEDIATE SESSION UPDATE - Force the session to be updated
                addDebugMessage('Force-updating session subscription data', { tier, billingCycle }, 'info');

                // After your existing session update code:
                if (session?.user) {
                    if (!session.user.subscription) {
                        session.user.subscription = {};
                    }
                    session.user.subscription.tier = tier;
                    session.user.subscription.status = 'active';
                    session.user.subscription.platform = 'revenuecat';
                    session.user.subscription.billingCycle = billingCycle;

                    // ADD THIS LINE to force the SubscriptionProvider to re-evaluate:
                    window.dispatchEvent(new CustomEvent('subscriptionUpdated', { detail: { tier, status: 'active' } }));


                    addDebugMessage('Force-updated session subscription object', {
                        tier: session.user.subscription.tier,
                        status: session.user.subscription.status,
                        platform: session.user.subscription.platform
                    }, 'success');

                    // CRITICAL: Force NextAuth session update to trigger provider re-render
                    try {
                        addDebugMessage('Calling updateSession to trigger provider refresh', {}, 'info');
                        await updateSession();
                        addDebugMessage('updateSession completed', {}, 'success');
                    } catch (updateError) {
                        addDebugMessage('updateSession failed', { error: updateError.message }, 'error');
                    }
                }

                // FORCE PROVIDER UPDATE: Direct manipulation of subscription state
                addDebugMessage('Attempting direct provider state update', {}, 'info');

                // Get the subscription provider and force update its state
                if (typeof window !== 'undefined' && window.forceSubscriptionUpdate) {
                    try {
                        window.forceSubscriptionUpdate({
                            tier: tier,
                            status: 'active',
                            platform: 'revenuecat',
                            billingCycle: billingCycle,
                            isActive: true,
                            isTrialActive: false,
                            hasUsedFreeTrial: true,
                            usage: session?.user?.usage || {},
                            timestamp: new Date().toISOString()
                        });
                        addDebugMessage('Direct provider update successful', { tier }, 'success');
                    } catch (directError) {
                        addDebugMessage('Direct provider update failed', { error: directError.message }, 'error');
                    }
                }

                // Continue with existing refresh logic as backup
                addDebugMessage('Starting subscription refresh cycle as backup', {}, 'info');

                // Rest of your existing refresh logic...
                subscription.clearCache();
                await updateSession();
                await subscription.refreshAfterPurchase();

                // Force page reload as final fallback
                setTimeout(() => {
                    addDebugMessage('Forcing page reload - final fallback', {}, 'warning');
                    window.location.reload();
                }, 3000);

            } else {
                addPurchaseStep('VERIFICATION_FAILED', { error: data.error });
                addDebugMessage('Backend verification failed', { error: data.error }, 'error');

                // Even if verification fails, the App Store purchase was successful
                setSuccess(`Purchase successful! Your ${tier} subscription is active. Refreshing account...`);
                addDebugMessage('App Store purchase successful, forcing refresh', {}, 'warning');

                // Force refresh and reload since payment went through
                await subscription.refreshAfterPurchase();
                setTimeout(() => {
                    addDebugMessage('Forcing page reload due to verification failure', {}, 'warning');
                    window.location.reload();
                }, 3000);
            }
        } catch (error) {
            addPurchaseStep('VERIFICATION_ERROR', { error: error.message });
            addDebugMessage('Verification error caught', { error: error.message }, 'error');

            // Still show success since App Store purchase completed
            setSuccess(`Purchase successful! Your ${tier} subscription is active. Refreshing account...`);

            // Force refresh and reload
            await subscription.refreshAfterPurchase();
            setTimeout(() => {
                addDebugMessage('Forcing page reload due to error', {}, 'warning');
                window.location.reload();
            }, 3000);
        }
    };


    const retryRefreshSubscription = async (expectedTier, attempt) => {
        const maxAttempts = 10; // Try for 20 seconds

        if (attempt >= maxAttempts) {
            console.log('❌ Max refresh attempts reached, forcing page reload...');
            window.location.reload();
            return;
        }

        console.log(`🔄 Retry attempt ${attempt + 1}/${maxAttempts} for subscription refresh...`);

        try {
            // Force clear caches
            subscription.clearCache();

            // Try to get fresh data again
            const freshDataResponse = await fetch('/api/subscription/status?force=true&t=' + Date.now(), {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                cache: 'no-store'
            });

            if (freshDataResponse.ok) {
                const freshData = await freshDataResponse.json();
                console.log(`🔄 Attempt ${attempt + 1} - Fresh data:`, freshData);

                if (freshData.tier === expectedTier) {
                    console.log('✅ Subscription successfully updated!');
                    subscription.forceRefresh();

                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                    return;
                }
            }

            // If not successful, try again in 2 seconds
            setTimeout(() => {
                retryRefreshSubscription(expectedTier, attempt + 1);
            }, 2000);

        } catch (error) {
            console.error(`❌ Retry attempt ${attempt + 1} failed:`, error);

            // Try again in 2 seconds
            setTimeout(() => {
                retryRefreshSubscription(expectedTier, attempt + 1);
            }, 2000);
        }
    };


    // CRITICAL FIX: iOS Restore Purchases with visual debugging
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
        clearDebugLog();
        addDebugMessage('Starting restore purchases process', {}, 'info');

        try {
            const { Purchases } = await import('@revenuecat/purchases-capacitor');
            const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY;

            if (!apiKey) {
                addDebugMessage('Missing RevenueCat API key', {}, 'error');
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Configuration Error',
                    message: 'RevenueCat iOS API key not configured'
                });
                return;
            }

            addDebugMessage('RevenueCat API key found, starting dual configuration test', {}, 'info');

            // CRITICAL FIX: Test both configurations to find subscriptions

            // Configuration 1: With app user ID (your current approach)
            addDebugMessage('Testing Configuration 1: With app user ID', { userId: session.user.id }, 'info');
            await Purchases.configure({
                apiKey: apiKey,
                appUserID: session.user.id
            });

            let customerInfo1 = await Purchases.getCustomerInfo();
            const config1Subs = Object.keys(customerInfo1.activeSubscriptions || {});
            const config1Ents = Object.keys(customerInfo1.entitlements?.active || {});

            addDebugMessage('Config 1 Results', {
                subscriptions: config1Subs,
                entitlements: config1Ents,
                count: config1Subs.length + config1Ents.length
            }, config1Subs.length > 0 ? 'success' : 'info');

            // Configuration 2: With null (Apple ID only)
            addDebugMessage('Testing Configuration 2: Apple ID only', {}, 'info');
            await Purchases.configure({
                apiKey: apiKey,
                appUserID: null
            });

            let customerInfo2 = await Purchases.getCustomerInfo();
            const config2Subs = Object.keys(customerInfo2.activeSubscriptions || {});
            const config2Ents = Object.keys(customerInfo2.entitlements?.active || {});

            addDebugMessage('Config 2 Results', {
                subscriptions: config2Subs,
                entitlements: config2Ents,
                count: config2Subs.length + config2Ents.length
            }, config2Subs.length > 0 ? 'success' : 'info');

            // CRITICAL: Try to restore purchases
            addDebugMessage('Calling restorePurchases()', {}, 'info');
            const restoreResult = await Purchases.restorePurchases();

            const restoreSubs = Object.keys(restoreResult.activeSubscriptions || {});
            const restoreEnts = Object.keys(restoreResult.entitlements?.active || {});

            addDebugMessage('Restore Results', {
                subscriptions: restoreSubs,
                entitlements: restoreEnts,
                count: restoreSubs.length + restoreEnts.length
            }, restoreSubs.length > 0 ? 'success' : 'warning');

            // Use whichever configuration found subscriptions
            const workingCustomerInfo = restoreSubs.length > 0
                ? restoreResult
                : config2Subs.length > 0
                    ? customerInfo2
                    : customerInfo1;

            const finalSubs = Object.keys(workingCustomerInfo.activeSubscriptions || {});
            const finalEnts = Object.values(workingCustomerInfo.entitlements?.active || {});

            addDebugMessage('Final Selection', {
                usingConfig: restoreSubs.length > 0 ? 'restore' : config2Subs.length > 0 ? 'config2' : 'config1',
                subscriptions: finalSubs,
                entitlementCount: finalEnts.length
            }, finalSubs.length > 0 || finalEnts.length > 0 ? 'success' : 'warning');

            const { NativeDialog } = await import('@/components/mobile/NativeDialog');

            if (finalEnts.length > 0 || finalSubs.length > 0) {
                addDebugMessage('Found active subscriptions, updating database', {}, 'success');

                // CRITICAL: Update database with found subscription
                try {
                    const response = await apiPost('/api/payments/revenuecat/restore', {
                        customerInfo: workingCustomerInfo,
                        userId: session.user.id
                    });

                    addDebugMessage('Database update response', { status: response.status }, response.ok ? 'success' : 'error');

                    if (response.ok) {
                        const dbData = await response.json();
                        addDebugMessage('Database updated successfully', { tier: dbData.subscription?.tier }, 'success');

                        setSuccess('Successfully restored your purchases! Your subscription is now active.');

                        // Force subscription refresh
                        addDebugMessage('Starting post-restore refresh', {}, 'info');
                        await subscription.refreshAfterPurchase();

                        setTimeout(() => {
                            addDebugMessage('Reloading page to show restored subscription', {}, 'info');
                            window.location.reload();
                        }, 2000);
                    } else {
                        const errorData = await response.json();
                        addDebugMessage('Database update failed', { error: errorData.error }, 'error');
                        await NativeDialog.showError({
                            title: 'Restore Partial Success',
                            message: 'Found subscription but failed to update account. Please contact support.'
                        });
                    }
                } catch (dbError) {
                    addDebugMessage('Database error during restore', { error: dbError.message }, 'error');
                    await NativeDialog.showError({
                        title: 'Database Error',
                        message: 'Found subscription but failed to update account. Please contact support.'
                    });
                }
            } else {
                addDebugMessage('No subscriptions found in any configuration', {
                    config1Count: config1Subs.length,
                    config2Count: config2Subs.length,
                    restoreCount: restoreSubs.length
                }, 'warning');

                await NativeDialog.showAlert({
                    title: 'No Subscriptions Found',
                    message: `No active subscriptions found.\n\nConfig 1: ${config1Subs.length} subscriptions\nConfig 2: ${config2Subs.length} subscriptions\nRestore: ${restoreSubs.length} subscriptions\n\nCheck the debug log for details.`
                });
                setShowDebugLog(true);
            }

        } catch (error) {
            addDebugMessage('Restore error caught', { error: error.message }, 'error');
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Restore Failed',
                message: `Failed to restore purchases: ${error.message}`
            });
            setShowDebugLog(true);
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

                // Reload to show trial status
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
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

                // Reload to show cancellation status
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
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

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <h3 className="text-yellow-900 font-semibold mb-2">Visual Debug Mode Active</h3>
                    <p className="text-yellow-700 text-sm mb-3">
                        Debug log stays open longer and persists between sessions. Page reloads in 7 seconds after purchase.
                    </p>
                    <div className="flex gap-2 flex-wrap">
                        <TouchEnhancedButton
                            onClick={() => {
                                // Force override the subscription state for testing
                                subscription.forceRefresh();

                                // Also try direct state manipulation
                                if (window.location.reload) {
                                    addDebugMessage('Force reloading page to clear hook state', {}, 'warning');
                                    setTimeout(() => window.location.reload(), 1000);
                                }
                            }}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                        >
                            Force Override Test
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={() => {
                                const sessionSub = session?.user?.subscription;
                                addDebugMessage('Hook Decision Flow Debug', {
                                    sessionExists: !!session,
                                    sessionStatus: session ? 'authenticated' : 'missing',
                                    userSubscriptionExists: !!sessionSub,
                                    sessionSubTier: sessionSub?.tier,
                                    sessionSubStatus: sessionSub?.status,
                                    sessionSubPlatform: sessionSub?.platform,

                                    // Test the condition logic
                                    tierNotFree: sessionSub?.tier !== 'free',
                                    tierNotAdmin: sessionSub?.tier !== 'admin',
                                    statusActive: sessionSub?.status === 'active',
                                    isGoldPlatinumBasic: (sessionSub?.tier === 'gold' || sessionSub?.tier === 'platinum' || sessionSub?.tier === 'basic'),

                                    // Overall condition result
                                    wouldPassPaidCheck: sessionSub?.tier !== 'free' &&
                                        sessionSub?.tier !== 'admin' &&
                                        sessionSub?.status === 'active' &&
                                        (sessionSub?.tier === 'gold' || sessionSub?.tier === 'platinum' || sessionSub?.tier === 'basic')
                                }, 'info');
                                setShowDebugLog(true);
                            }}
                            className="bg-orange-600 text-white px-3 py-1 rounded text-sm"
                        >
                            Debug Hook Logic
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={() => {
                                addDebugMessage('Current useSubscription hook state', {
                                    tier: subscription.tier,
                                    status: subscription.status,
                                    platform: subscription.platform,
                                    isAdmin: subscription.isAdmin,
                                    isActive: subscription.isActive,
                                    loading: subscription.loading,
                                    error: subscription.error,
                                    sessionUserSubscription: session?.user?.subscription ? {
                                        tier: session.user.subscription.tier,
                                        status: session.user.subscription.status,
                                        platform: session.user.subscription.platform
                                    } : 'missing'
                                }, 'info');
                                setShowDebugLog(true);
                            }}
                            className="bg-purple-600 text-white px-3 py-1 rounded text-sm"
                        >
                            Check Hook State
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={async () => {
                                try {
                                    addDebugMessage('Manual database check started', {}, 'info');

                                    const response = await fetch('/api/subscription/status?force=true&t=' + Date.now(), {
                                        method: 'GET',
                                        headers: {
                                            'Cache-Control': 'no-cache',
                                            'Pragma': 'no-cache'
                                        },
                                        cache: 'no-store'
                                    });

                                    if (response.ok) {
                                        const dbData = await response.json();
                                        addDebugMessage('Database API Response', {
                                            tier: dbData.tier,
                                            status: dbData.status,
                                            platform: dbData.platform,
                                            isAdmin: dbData.isAdmin,
                                            isActive: dbData.isActive,
                                            revenueCatId: dbData.debugInfo?.revenueCatId || 'missing',
                                            userSubscriptionPlatform: dbData.debugInfo?.userSubscriptionPlatform || 'missing'
                                        }, dbData.tier === 'gold' ? 'success' : 'error');

                                        setShowDebugLog(true);
                                    } else {
                                        addDebugMessage('Database check failed', { status: response.status }, 'error');
                                    }
                                } catch (error) {
                                    addDebugMessage('Database check error', { error: error.message }, 'error');
                                }
                            }}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                        >
                            Check Database Now
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={() => setShowDebugModal(true)}
                            className="bg-yellow-600 text-white px-3 py-1 rounded text-sm"
                        >
                            Show Last Debug Info
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={() => setShowDebugLog(true)}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                        >
                            Show Debug Log ({debugLog.length})
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={() => {
                                setShowDebugLog(true);
                                // Force scroll to bottom of debug log
                                setTimeout(() => {
                                    const debugModal = document.querySelector('.debug-log-container');
                                    if (debugModal) {
                                        debugModal.scrollTop = debugModal.scrollHeight;
                                    }
                                }, 100);
                            }}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                        >
                            Show Latest Debug
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={clearDebugLog}
                            className="bg-gray-600 text-white px-3 py-1 rounded text-sm"
                        >
                            Clear Debug Log
                        </TouchEnhancedButton>
                    </div>
                    {debugLog.length > 0 && (
                        <div className="mt-2 text-xs text-yellow-800">
                            Last: {debugLog[debugLog.length - 1]?.message} ({debugLog[debugLog.length - 1]?.type})
                        </div>
                    )}
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
                                        const response = await apiPost('/api/subscription/start-trial', {
                                            tier: 'platinum'
                                        });

                                        const data = await response.json();

                                        if (response.ok) {
                                            setSuccess('Free trial activated! You now have 7 days of full Platinum access.');

                                            // Reload to show trial status
                                            setTimeout(() => {
                                                window.location.reload();
                                            }, 2000);
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

                {/*/!* VISUAL DEBUG PANEL - Always visible for testing *!/*/}
                {/*<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">*/}
                {/*    <h3 className="text-blue-900 font-semibold mb-3">🔍 Debug Information</h3>*/}

                {/*    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">*/}
                {/*        <div>*/}
                {/*            <h4 className="font-medium text-blue-800 mb-2">Subscription Status:</h4>*/}
                {/*            <div className="bg-white p-2 rounded border">*/}
                {/*                <div><strong>Tier:</strong> {subscription.tier || 'undefined'}</div>*/}
                {/*                <div><strong>Status:</strong> {subscription.status || 'undefined'}</div>*/}
                {/*                <div><strong>Platform:</strong> {subscription.platform || 'undefined'}</div>*/}
                {/*                <div><strong>RevenueCat ID:</strong> {subscription.usage?.revenueCatCustomerId || 'none'}</div>*/}
                {/*                <div><strong>Billing Provider:</strong> {platform?.billingProvider || 'undefined'}</div>*/}
                {/*                <div><strong>Is Admin:</strong> {subscription.isAdmin ? 'Yes' : 'No'}</div>*/}
                {/*                <div><strong>Is Active:</strong> {subscription.isActive ? 'Yes' : 'No'}</div>*/}
                {/*                <div><strong>Has Used Trial:</strong> {subscription.hasUsedFreeTrial ? 'Yes' : 'No'}</div>*/}
                {/*                <div><strong>Hook Platform:</strong> {subscription.platform || 'MISSING'}</div>*/}
                {/*                <div><strong>Raw Subscription Data:</strong> {JSON.stringify(subscription.usage?.platform)}</div>*/}

                {/*            </div>*/}
                {/*        </div>*/}

                {/*        <div>*/}
                {/*            <h4 className="font-medium text-blue-800 mb-2">Session Info:</h4>*/}
                {/*            <div className="bg-white p-2 rounded border">*/}
                {/*                <div><strong>User ID:</strong> {session?.user?.id?.slice(-8) || 'undefined'}</div>*/}
                {/*                <div><strong>Email:</strong> {session?.user?.email || 'undefined'}</div>*/}
                {/*                <div><strong>Session Tier:</strong> {session?.user?.subscriptionTier || 'undefined'}</div>*/}
                {/*                <div><strong>Platform Type:</strong> {platform?.type || 'undefined'}</div>*/}
                {/*                <div><strong>Is iOS:</strong> {platform?.isIOS ? 'Yes' : 'No'}</div>*/}
                {/*                <div><strong>Billing Provider:</strong> {platform?.billingProvider || 'undefined'}</div>*/}
                {/*            </div>*/}
                {/*        </div>*/}
                {/*    </div>*/}

                {/*    {purchaseSteps.length > 0 && (*/}
                {/*        <div className="mt-4">*/}
                {/*            <h4 className="font-medium text-blue-800 mb-2">Purchase Steps:</h4>*/}
                {/*            <div className="bg-white p-2 rounded border max-h-32 overflow-y-auto">*/}
                {/*                {purchaseSteps.slice(-5).map((step, index) => (*/}
                {/*                    <div key={index} className="text-xs mb-1 border-b pb-1">*/}
                {/*                        <strong>{step.step}:</strong> {step.timestamp.slice(-8)}*/}
                {/*                        {step.data && Object.keys(step.data).length > 0 && (*/}
                {/*                            <div className="text-gray-600 ml-2">*/}
                {/*                                {Object.entries(step.data).map(([key, value]) => (*/}
                {/*                                    <div key={key}>{key}: {typeof value === 'object' ? JSON.stringify(value).slice(0, 50) : String(value)}</div>*/}
                {/*                                ))}*/}
                {/*                            </div>*/}
                {/*                        )}*/}
                {/*                    </div>*/}
                {/*                ))}*/}
                {/*            </div>*/}
                {/*        </div>*/}
                {/*    )}*/}

                {/*    <div className="mt-3 flex gap-2">*/}
                {/*        <TouchEnhancedButton*/}
                {/*            onClick={() => subscription.refetch()}*/}
                {/*            className="bg-blue-600 text-white px-3 py-1 rounded text-xs"*/}
                {/*        >*/}
                {/*            Force Refresh Subscription*/}
                {/*        </TouchEnhancedButton>*/}

                {/*        <TouchEnhancedButton*/}
                {/*            onClick={() => window.location.reload()}*/}
                {/*            className="bg-gray-600 text-white px-3 py-1 rounded text-xs"*/}
                {/*        >*/}
                {/*            Reload Page*/}
                {/*        </TouchEnhancedButton>*/}

                {/*        <TouchEnhancedButton*/}
                {/*            onClick={() => {*/}
                {/*                console.log('Full subscription object:', subscription);*/}
                {/*                console.log('Platform specifically:', subscription.platform);*/}
                {/*                setSuccess(`Platform: ${subscription.platform || 'UNDEFINED'}, Full keys: ${Object.keys(subscription).join(', ')}`);*/}
                {/*            }}*/}
                {/*            className="bg-yellow-600 text-white px-3 py-1 rounded text-xs"*/}
                {/*        >*/}
                {/*            🔍 CHECK HOOK PLATFORM*/}
                {/*        </TouchEnhancedButton>*/}

                {/*        <TouchEnhancedButton*/}
                {/*            onClick={async () => {*/}
                {/*                try {*/}
                {/*                    setSuccess('Testing cancellation...');*/}
                {/*                    const response = await apiPost('/api/subscription/cancel', {});*/}
                {/*                    const data = await response.json();*/}

                {/*                    if (response.ok) {*/}
                {/*                        setSuccess('CANCEL SUCCESS: ' + JSON.stringify(data, null, 2));*/}
                {/*                    } else {*/}
                {/*                        setError('CANCEL ERROR: ' + JSON.stringify(data, null, 2));*/}
                {/*                    }*/}
                {/*                } catch (err) {*/}
                {/*                    setError('CANCEL NETWORK ERROR: ' + err.message);*/}
                {/*                }*/}
                {/*            }}*/}
                {/*            className="bg-red-600 text-white px-3 py-1 rounded text-xs"*/}
                {/*        >*/}
                {/*            🧪 TEST CANCEL API*/}
                {/*        </TouchEnhancedButton>*/}

                {/*    </div>*/}
                {/*</div>*/}

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
            {/* VISUAL DEBUG LOG MODAL */}
            {showDebugLog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-96 overflow-hidden flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Visual Debug Log</h3>
                            <div className="flex gap-2">
                                <TouchEnhancedButton
                                    onClick={clearDebugLog}
                                    className="bg-gray-600 text-white px-3 py-1 rounded text-sm"
                                >
                                    Clear Log
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={() => setShowDebugLog(false)}
                                    className="text-gray-500 hover:text-gray-700 text-xl"
                                >
                                    ×
                                </TouchEnhancedButton>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 debug-log-container">
                            {debugLog.length === 0 ? (
                                <div className="text-gray-500 text-center py-8">No debug messages yet</div>
                            ) : (
                                <div className="space-y-2">
                                    {debugLog.map((log) => (
                                        <div
                                            key={log.id}
                                            className={`p-3 rounded border-l-4 ${
                                                log.type === 'success' ? 'bg-green-50 border-green-500' :
                                                    log.type === 'error' ? 'bg-red-50 border-red-500' :
                                                        log.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                                                            'bg-blue-50 border-blue-500'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                    <span className={`text-sm font-medium ${
                                        log.type === 'success' ? 'text-green-800' :
                                            log.type === 'error' ? 'text-red-800' :
                                                log.type === 'warning' ? 'text-yellow-800' :
                                                    'text-blue-800'
                                    }`}>
                                        Step {log.step}: {log.message}
                                    </span>
                                                <span className="text-xs text-gray-500">{log.timestamp}</span>
                                            </div>
                                            {Object.keys(log.data).length > 0 && (
                                                <div className="text-xs font-mono bg-white p-2 rounded mt-2 border">
                                                    {JSON.stringify(log.data, null, 2)}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
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