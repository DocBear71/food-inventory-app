'use client';
// file: /src/app/account/billing/page.js v2 - Enhanced iOS billing with App Store compliance

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

    // Subscription plans configuration
    const plans = {
        free: {
            name: 'Free',
            price: { monthly: 0, annual: 0 },
            description: 'Basic inventory management',
            features: ['50 inventory items', '100 starter recipes', 'Basic matching', '2 receipt scans/month']
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

        try {
            // Route to appropriate payment system based on platform
            if (platform.billingProvider === 'stripe') {
                // Your existing Stripe flow
                const response = await apiPost('/api/payments/create-checkout', {
                    tier: newTier,
                    billingCycle: newBilling,
                    currentTier: subscription.tier,
                    source: urlSource || 'billing-page'
                });

                const data = await response.json();

                if (response.ok && data.url) {
                    // Track Stripe checkout initiation
                    try {
                        const { trackEmailEvent } = await import('@/lib/email-todo-implementations');
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
                    setError(data.error || 'Failed to create checkout session');
                }
            } else if (platform.billingProvider === 'googleplay' || platform.billingProvider === 'appstore') {
                // RevenueCat flow for mobile platforms
                await handleRevenueCatPurchase(newTier, newBilling);
            } else {
                setError('Unknown billing platform');
            }
        } catch (error) {
            console.error('Error creating checkout:', error);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ENHANCED: Handle RevenueCat purchases with better error handling
    const handleRevenueCatPurchase = async (tier, billingCycle) => {
        try {
            console.log('1. Starting RevenueCat purchase...');

            const { Purchases } = await import('@revenuecat/purchases-capacitor');
            console.log('2. RevenueCat SDK imported successfully');

            // Platform-specific API key selection
            const apiKey = platform.isAndroid
                ? process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY
                : platform.isIOS
                    ? process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY
                    : null;

            console.log('3. Platform:', platform.type);
            console.log('4. API key exists:', !!apiKey);

            if (!apiKey) {
                throw new Error(`RevenueCat API key not configured for platform: ${platform.type}`);
            }

            // Configure RevenueCat
            await Purchases.configure({
                apiKey: apiKey,
                appUserID: session.user.id
            });
            console.log('5. RevenueCat configured successfully!');

            // Get and use customer info
            const customerInfo = await Purchases.getCustomerInfo();
            console.log('6. Customer info retrieved:', {
                userId: customerInfo.originalAppUserId,
                activeSubscriptions: Object.keys(customerInfo.activeSubscriptions || {}),
                entitlements: Object.keys(customerInfo.entitlements?.all || {}),
                hasActiveEntitlements: Object.values(customerInfo.entitlements?.active || {}).length > 0
            });

            // Get offerings and attempt purchase
            console.log('7. Attempting to get offerings...');

            const offerings = await Purchases.getOfferings();
            console.log('8. Raw offerings response:', JSON.stringify(offerings, null, 2));

            if (offerings && offerings.current) {
                console.log('9. Current offering identifier:', offerings.current.identifier);
                console.log('10. Available packages:', offerings.current.availablePackages?.length || 0);

                if (offerings.current.availablePackages?.length > 0) {
                    offerings.current.availablePackages.forEach((pkg, index) => {
                        console.log(`11.${index + 1} Package:`, {
                            identifier: pkg.identifier,
                            product: pkg.product?.identifier,
                            price: pkg.product?.priceString
                        });
                    });

                    // ENHANCED: Better package matching logic
                    const packageId = `${tier}_${billingCycle}_package`;
                    console.log('12. Looking for package:', packageId);

                    let packageToPurchase = offerings.current.availablePackages.find(
                        pkg => pkg.identifier === packageId
                    );

                    if (!packageToPurchase) {
                        // Try alternative package naming patterns
                        const alternativePackageId = `${tier}_${billingCycle}`;
                        const alternativePackage = offerings.current.availablePackages.find(
                            pkg => pkg.identifier === alternativePackageId ||
                                pkg.product?.identifier === `${tier}_${billingCycle}`
                        );

                        if (alternativePackage) {
                            console.log('12b. Found alternative package:', alternativePackage.identifier);
                            packageToPurchase = alternativePackage;
                        } else {
                            throw new Error(`Package ${packageId} not found. Available packages: ${offerings.current.availablePackages.map(p => p.identifier).join(', ')}`);
                        }
                    }

                    console.log('13. Found package, attempting purchase...', packageToPurchase.identifier);

                    // Make the purchase
                    // Make the purchase
                    const purchaseResult = await Purchases.purchasePackage({
                        aPackage: packageToPurchase
                    });

                    console.log('14. Purchase successful!', purchaseResult);

                    // Track successful purchase
                    try {
                        const { trackEmailEvent } = await import('@/lib/email-todo-implementations');
                        await trackEmailEvent({
                            eventType: 'purchase_completed',
                            userEmail: session.user.email,
                            userId: session.user.id,
                            emailType: 'revenuecat_purchase',
                            metadata: {
                                tier,
                                billingCycle,
                                platform: platform.type,
                                packageId: packageToPurchase.identifier
                            }
                        });
                    } catch (trackingError) {
                        console.error('Failed to track purchase event:', trackingError);
                    }

                    // ENHANCED: Verify purchase with backend
                    await handlePurchaseVerification(purchaseResult, tier, billingCycle);

                } else {
                    console.log('11. No packages found in current offering');
                    setError('No subscription packages available. Please try again later.');
                }
            } else {
                console.log('9. No current offering available');
                setError('Subscription service temporarily unavailable. Please try again later.');
            }

        } catch (error) {
            console.error('RevenueCat purchase error:', error);

            // Enhanced error messages
            if (error.message?.includes('ITEM_ALREADY_OWNED')) {
                setError('You already own this subscription. Try restoring your purchases.');
            } else if (error.message?.includes('USER_CANCELLED')) {
                setError('Purchase was cancelled.');
            } else if (error.message?.includes('PAYMENT_PENDING')) {
                setError('Payment is pending. Please check back in a few minutes.');
            } else if (error.message?.includes('ITEM_UNAVAILABLE')) {
                setError('This subscription is temporarily unavailable. Please try again later.');
            } else {
                setError(`Purchase error: ${error.message}`);
            }
        }
    };

    // NEW: Handle purchase verification with backend
    const handlePurchaseVerification = async (purchaseResult, tier, billingCycle) => {
        try {
            console.log('15. Verifying purchase with backend...');

            const response = await apiPost('/api/payments/revenuecat/verify', {
                purchaseResult: purchaseResult,
                tier: tier,
                billingCycle: billingCycle,
                userId: session.user.id
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(`Successfully activated ${tier} ${billingCycle} subscription!`);
                // Refresh subscription data
                subscription.refetch();
            } else {
                console.error('Backend verification failed:', data);
                setError('Purchase completed but verification failed. Please contact support.');
            }
        } catch (error) {
            console.error('Verification error:', error);
            setError('Purchase completed but verification failed. Please contact support.');
        }
    };

    // NEW: iOS Restore Purchases functionality (App Store requirement)
    const handleRestorePurchases = async () => {
        if (!platform.isIOS) {
            setError('Restore purchases is only available on iOS devices.');
            return;
        }

        setIsRestoring(true);
        setError('');
        setSuccess('');

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

            // Restore purchases
            const customerInfo = await Purchases.restorePurchases();
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

    // ENHANCED: Handle cancellation with platform-specific instructions
    const handleCancelSubscription = async () => {
        let cancelMessage = 'Are you sure you want to cancel your subscription? You\'ll lose access to premium features at the end of your billing period.';

        if (platform.isIOS) {
            cancelMessage += '\n\nNote: For iOS subscriptions, you may also need to cancel through your Apple ID settings.';
        } else if (platform.isAndroid) {
            cancelMessage += '\n\nNote: For Android subscriptions, you may also need to cancel through Google Play Store.';
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
                } else if (platform.isAndroid) {
                    successMessage += '\n\nTo ensure complete cancellation, also check your Google Play subscription settings.';
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
            // Handle both string and Date object inputs
            const dateObj = typeof date === 'string' ? new Date(date) : date;

            // Check if the date is valid
            if (isNaN(dateObj.getTime())) {
                console.log('Invalid date:', date);
                return 'N/A';
            }

            // Manual formatting - guaranteed to work everywhere
            const month = dateObj.getMonth() + 1; // getMonth() returns 0-11
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
    const effectiveTier = subscription.isAdmin ? 'platinum' : subscription.tier;

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
                    </div>
                )}

                {success && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                        {success}
                    </div>
                )}

                {/* NEW: iOS Restore Purchases Button (App Store Requirement) */}
                {platform.isIOS && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-blue-900 font-medium">Already purchased?</h3>
                                <p className="text-blue-700 text-sm">
                                    Restore your previous purchases from the App Store
                                </p>
                            </div>
                            <TouchEnhancedButton
                                onClick={handleRestorePurchases}
                                disabled={isRestoring}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
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
                                        : currentPlan.price.monthly}
                                    </span>
                                    <span className="text-gray-600 text-sm">
                                        /{subscription.billingCycle === 'annual' ? 'year' : 'month'}
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                                            {plan.price.monthly === 0 ? (
                                                <span className="text-2xl font-bold text-gray-900">Free</span>
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
                                            onClick={() => handleSubscriptionChange(tierKey, 'annual')}
                                            disabled={loading}
                                            className={`w-full py-2 px-4 rounded-lg font-medium ${
                                                tierKey === 'free'
                                                    ? 'bg-gray-600 hover:bg-gray-700 text-white'
                                                    : tierKey === 'gold'
                                                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                                            }`}
                                        >
                                            {loading ? 'Processing...' :
                                                tierKey === 'free' ? 'Downgrade to Free' :
                                                    platform.isAndroid ? `Get ${plan.name} via Google Play` :
                                                        platform.isIOS ? `Get ${plan.name} via App Store` :
                                                            `Upgrade to ${plan.name}`}
                                        </TouchEnhancedButton>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* NEW: iOS Subscription Management Link */}
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

                        {platform.isAndroid && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                <h4 className="text-yellow-800 font-medium mb-2">Android Subscription Notice</h4>
                                <p className="text-yellow-700 text-sm">
                                    For subscriptions purchased through Google Play, you may also need to cancel directly through the Google Play Store to ensure complete cancellation.
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

                {/* NEW: Terms of Service and Privacy Policy Links (App Store Requirement) */}
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
                            {platform.isAndroid && (
                                <li>• Android subscriptions are managed through Google Play</li>
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