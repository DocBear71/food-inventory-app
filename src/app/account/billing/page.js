'use client';
// file: /src/app/account/billing/page.js v1 - Account billing and subscription management

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSafeSession } from '@/hooks/useSafeSession';
import { useSubscription } from '@/hooks/useSubscription';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { apiPost } from '@/lib/api-config';
import { usePlatform } from '@/hooks/usePlatform';

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

    // NEW FUNCTION: Handle RevenueCat purchases
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

                    // MOVE PURCHASE LOGIC HERE - INSIDE THE OFFERINGS SUCCESS BLOCK
                    const packageId = `${tier}_${billingCycle}_package`;
                    console.log('12. Looking for package:', packageId);

                    const packageToPurchase = offerings.current.availablePackages.find(
                        pkg => pkg.identifier === packageId
                    );

                    if (!packageToPurchase) {
                        throw new Error(`Package ${packageId} not found`);
                    }

                    console.log('13. Found package, attempting purchase...', packageToPurchase.identifier);

                    // Make the purchase
                    const purchaseResult = await Purchases.purchasePackage({
                        aPackage: packageToPurchase
                    });

                    console.log('14. Purchase successful!', purchaseResult);
                    setSuccess(`Successfully purchased ${tier} ${billingCycle}!`);

                } else {
                    console.log('11. No packages found in current offering');
                    setError('No packages available for purchase');
                }
            } else {
                console.log('9. No current offering available');
                setError('No offerings available');
            }

        } catch (error) {
            console.error('RevenueCat purchase error:', error);
            setError(`Purchase error: ${error.message}`);
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

    // Handle cancellation
    const handleCancelSubscription = async () => {
        if (!confirm('Are you sure you want to cancel your subscription? You\'ll lose access to premium features at the end of your billing period.')) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await apiPost('/api/subscription/cancel', {});

            const data = await response.json();

            if (response.ok) {
                setSuccess('Subscription cancelled. You\'ll retain access until the end of your current billing period.');
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

                {/* TEMPORARY: Platform Debug Info - REMOVE THIS LATER
                <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                    <h4 className="font-medium">Platform Debug Info:</h4>
                    <div className="text-sm space-y-1">
                        <div>Platform Type: {platform.type}</div>
                        <div>Is Web: {platform.isWeb.toString()}</div>
                        <div>Is Android: {platform.isAndroid.toString()}</div>
                        <div>Is iOS: {platform.isIOS.toString()}</div>
                        <div>Billing Provider: {platform.billingProvider}</div>
                    </div>
                </div>*/}

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

                    {/* DEBUG: Add this temporarily
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                        <h4 className="font-medium">Debug Info:</h4>
                        <div className="text-sm space-y-1">
                            <div>Tier: {subscription.tier}</div>
                            <div>isOnTrial: {isOnTrial.toString()}</div>
                            <div>Condition result: {(subscription.tier !== 'free' && !isOnTrial).toString()}</div>
                            <div>Start Date: {subscription.startDate}</div>
                            <div>End Date: {subscription.endDate}</div>
                            <div>Formatted Start: {formatDate(subscription.startDate)}</div>
                            <div>Formatted End: {formatDate(subscription.endDate)}</div>
                            <div>Full subscription object: {JSON.stringify(subscription, null, 2)}</div>
                        </div>
                    </div>*/}

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
                </div>

                {/* Cancel Subscription */}
                {subscription.tier !== 'free' && !isOnTrial && (
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Cancel Subscription</h2>
                        <p className="text-gray-600 mb-4">
                            You can cancel your subscription at any time. You'll retain access to premium features until the end of your current billing period.
                        </p>
                        <TouchEnhancedButton
                            onClick={handleCancelSubscription}
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
                        >
                            {loading ? 'Processing...' : 'Cancel Subscription'}
                        </TouchEnhancedButton>
                    </div>
                )}

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