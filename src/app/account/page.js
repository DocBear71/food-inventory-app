'use client';

// file: /src/app/account/page.js v2 - Updated with Contact Support Modal

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSafeSession } from '@/hooks/useSafeSession';
import { useSubscription } from '@/hooks/useSubscription';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import ContactSupportModal from '@/components/support/ContactSupportModal';
import { apiPost } from '@/lib/api-config';

export default function AccountPage() {
    const { data: session, status } = useSafeSession();
    const router = useRouter();
    const subscription = useSubscription();
    const [loading, setLoading] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [showPreRegModal, setShowPreRegModal] = useState(false);
    const [preRegRewardStatus, setPreRegRewardStatus] = useState(null);

    // Redirect if not authenticated
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

    const checkForPreRegistrationReward = async () => {
        if (typeof window === 'undefined') return;

        try {
            // Check if already claimed
            const alreadyClaimed = localStorage.getItem('preregRewardClaimed');
            if (alreadyClaimed) {
                console.log('Pre-registration reward already claimed');
                return;
            }

            // Only check for Android users
            const isAndroid = /Android/i.test(navigator.userAgent);
            if (!isAndroid) {
                console.log('Not Android device, skipping pre-reg check');
                return;
            }

            const { Purchases } = await import('@revenuecat/purchases-capacitor');

            // Configure RevenueCat if not already done
            if (!window.revenueCatConfigured) {
                await Purchases.configure({
                    apiKey: process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY,
                    appUserID: session.user.id
                });
                window.revenueCatConfigured = true;
            }

            const customerInfo = await Purchases.getCustomerInfo();
            console.log('Checking for pre-registration reward...', customerInfo);

            // Check for the pre-registration product in non-subscription transactions
            const hasPreRegReward = customerInfo.nonSubscriptionTransactions?.some(
                transaction => transaction.productIdentifier === 'preregistration_premium_30day'
            );

            if (hasPreRegReward) {
                console.log('🎉 Pre-registration reward found!');
                setShowPreRegModal(true);
                setPreRegRewardStatus('available');
            } else {
                console.log('No pre-registration reward found');
                setPreRegRewardStatus('not_available');
            }

        } catch (error) {
            console.error('Pre-registration reward check failed:', error);
            setPreRegRewardStatus('error');
        }
    };

    const claimPreRegistrationReward = async () => {
        try {
            setLoading(true);

            // Call your backend to activate the reward
            const response = await apiPost('/api/subscription/claim-prereg-reward', {
                source: 'google-play-prereg'
            });

            const data = await response.json();

            if (response.ok) {
                // Mark as claimed
                localStorage.setItem('preregRewardClaimed', 'true');
                localStorage.setItem('preregRewardClaimedDate', new Date().toISOString());

                setSuccess('🎉 Pre-registration reward activated! You now have 30 days of premium access!');
                setShowPreRegModal(false);

                // Refresh subscription data
                subscription.refetch();
            } else {
                setError(data.error || 'Failed to claim pre-registration reward');
            }
        } catch (error) {
            console.error('Error claiming pre-registration reward:', error);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session?.user?.id) {
            // Small delay to let other initialization complete
            setTimeout(() => {
                checkForPreRegistrationReward();
            }, 2000);
        }
    }, [session?.user?.id]);

    // Helper functions
    const formatDate = (date) => {
        if (!date) return 'N/A';
        try {
            const dateObj = typeof date === 'string' ? new Date(date) : date;
            if (isNaN(dateObj.getTime())) return 'N/A';
            const month = dateObj.getMonth() + 1;
            const day = dateObj.getDate();
            const year = dateObj.getFullYear();
            return `${month}/${day}/${year}`;
        } catch (error) {
            return 'N/A';
        }
    };

    const getTierColor = (tier) => {
        switch (tier) {
            case 'platinum': return 'bg-purple-100 text-purple-800 border-purple-300';
            case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'admin': return 'bg-red-100 text-red-800 border-red-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const getUsagePercentage = (current, limit) => {
        if (limit === 'unlimited' || limit === -1) return 0;
        if (typeof limit !== 'number') return 0;
        return Math.min(100, (current / limit) * 100);
    };

    const getUsageColor = (percentage) => {
        if (percentage >= 90) return 'bg-red-500';
        if (percentage >= 75) return 'bg-orange-500';
        if (percentage >= 50) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    // Quick actions
    const quickActions = [
        {
            title: 'Manage Billing',
            description: 'Update subscription, view invoices, manage payment methods',
            icon: '💳',
            action: () => router.push('/account/billing'),
            color: 'border-blue-200 hover:border-blue-300 hover:bg-blue-50'
        },
        {
            title: 'Profile Settings',
            description: 'Update personal info, preferences, and dietary restrictions',
            icon: '⚙️',
            action: () => router.push('/profile'),
            color: 'border-green-200 hover:border-green-300 hover:bg-green-50'
        },
        {
            title: 'Inventory Management',
            description: 'Manage your food inventory and consumption tracking',
            icon: '📦',
            action: () => router.push('/inventory'),
            color: 'border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50'
        },
        {
            title: 'Recipe Collections',
            description: 'Save and organize your favorite recipes in custom collections',
            icon: '📚',
            action: () => router.push('/recipes?tab=collections'),
            color: 'border-purple-200 hover:border-purple-300 hover:bg-purple-50'
        }
    ];

    // Add this function to your account page
    const handleResendVerification = async () => {
        if (loading) return;

        setLoading(true);

        try {
            const response = await apiPost('/api/auth/resend-verification', {
                email: session.user.email
            });

            const data = await response.json();

            if (response.ok) {
                alert('Verification email sent! Please check your inbox and spam folder.');
            } else {
                alert(data.error || 'Failed to resend verification email');
            }
        } catch (error) {
            console.error('Resend verification error:', error);
            alert('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    console.log('Session user:', session.user);
    console.log('Subscription object:', subscription);
    console.log('User usage tracking:', session.user?.usageTracking);

    return (
        <MobileOptimizedLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Account Dashboard</h1>
                            <p className="text-gray-600 mt-1">Welcome back, {session.user?.name || 'User'}!</p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-500">Member since</div>
                            <div className="font-medium">{formatDate(session.user?.createdAt || new Date())}</div>
                        </div>
                    </div>
                </div>

                {/* Subscription Overview */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Subscription Overview</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Current Plan */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-medium text-gray-900">Current Plan</h3>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getTierColor(subscription.tier)}`}>
                                    {subscription.tier?.charAt(0).toUpperCase() + subscription.tier?.slice(1)}
                                    {subscription.isTrialActive && ' (Trial)'}
                                    {subscription.isAdmin && ' (Admin)'}
                                </span>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Status:</span>
                                    <span className="font-medium">
                                        {subscription.isTrialActive ? 'Trial Active' : subscription.status || 'Active'}
                                    </span>
                                </div>

                                {subscription.billingCycle && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Billing:</span>
                                        <span className="font-medium capitalize">{subscription.billingCycle}</span>
                                    </div>
                                )}

                                {subscription.endDate && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Next billing:</span>
                                        <span className="font-medium">{formatDate(subscription.endDate)}</span>
                                    </div>
                                )}

                                {subscription.isTrialActive && subscription.daysUntilTrialEnd !== null && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Trial ends:</span>
                                        <span className="font-medium text-orange-600">
                                            {subscription.daysUntilTrialEnd} day{subscription.daysUntilTrialEnd !== 1 ? 's' : ''} left
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Plan Features */}
                        <div>
                            <h3 className="font-medium text-gray-900 mb-3">Plan Features</h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className={`flex items-center ${subscription.canAddInventoryItem ? 'text-green-600' : 'text-gray-400'}`}>
                                    <span className="mr-2">{subscription.canAddInventoryItem ? '✅' : '❌'}</span>
                                    Inventory Tracking
                                </div>
                                <div className={`flex items-center ${subscription.canScanReceipt ? 'text-green-600' : 'text-gray-400'}`}>
                                    <span className="mr-2">{subscription.canScanReceipt ? '✅' : '❌'}</span>
                                    Receipt Scanning
                                </div>
                                <div className={`flex items-center ${subscription.hasMealPlanning ? 'text-green-600' : 'text-gray-400'}`}>
                                    <span className="mr-2">{subscription.hasMealPlanning ? '✅' : '❌'}</span>
                                    Meal Planning
                                </div>
                                <div className={`flex items-center ${subscription.hasNutritionAccess ? 'text-green-600' : 'text-gray-400'}`}>
                                    <span className="mr-2">{subscription.hasNutritionAccess ? '✅' : '❌'}</span>
                                    Nutrition Info
                                </div>
                                <div className={`flex items-center ${subscription.canWriteReviews ? 'text-green-600' : 'text-gray-400'}`}>
                                    <span className="mr-2">{subscription.canWriteReviews ? '✅' : '❌'}</span>
                                    Write Reviews
                                </div>
                                <div className={`flex items-center ${subscription.hasEmailNotifications ? 'text-green-600' : 'text-gray-400'}`}>
                                    <span className="mr-2">{subscription.hasEmailNotifications ? '✅' : '❌'}</span>
                                    Email Alerts
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                        <TouchEnhancedButton
                            onClick={() => router.push('/account/billing')}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            Manage Subscription
                        </TouchEnhancedButton>

                        {subscription.tier === 'free' && (
                            <TouchEnhancedButton
                                onClick={() => router.push('/pricing')}
                                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
                            >
                                Upgrade Plan
                            </TouchEnhancedButton>
                        )}

                        {(subscription.tier === 'gold' || subscription.tier === 'platinum') && (
                            <TouchEnhancedButton
                                onClick={() => router.push('/pricing')}
                                className="flex-1 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
                            >
                                View All Plans
                            </TouchEnhancedButton>
                        )}
                    </div>
                </div>

                {/* Usage Dashboard */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Usage Overview</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Total Inventory Items */}
                        <div className="text-center">
                            <div className="text-3xl font-bold text-indigo-600 mb-1">
                                {subscription.usage?.inventoryItems || 0}
                            </div>
                            <div className="text-sm text-gray-600 mb-2">Total Inventory Items</div>
                            {subscription.remainingInventoryItems !== 'Unlimited' && (
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(subscription.usage?.inventoryItems || 0, subscription.remainingInventoryItems + (subscription.usage?.inventoryItems || 0)))}`}
                                        style={{ width: `${getUsagePercentage(subscription.usage?.inventoryItems || 0, subscription.remainingInventoryItems + (subscription.usage?.inventoryItems || 0))}%` }}
                                    ></div>
                                </div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                                {subscription.remainingInventoryItems === 'Unlimited' ? 'Unlimited' : `${subscription.remainingInventoryItems} remaining`}
                            </div>
                        </div>

                        {/* Monthly Receipt Scans */}
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-600 mb-1">
                                {subscription.usage?.monthlyReceiptScans || 0}
                            </div>
                            <div className="text-sm text-gray-600 mb-2">Receipt Scans This Month</div>
                            {subscription.remainingReceiptScans !== 'Unlimited' && (
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(subscription.usage?.monthlyReceiptScans || 0, subscription.remainingReceiptScans + (subscription.usage?.monthlyReceiptScans || 0)))}`}
                                        style={{ width: `${getUsagePercentage(subscription.usage?.monthlyReceiptScans || 0, subscription.remainingReceiptScans + (subscription.usage?.monthlyReceiptScans || 0))}%` }}
                                    ></div>
                                </div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                                {subscription.remainingReceiptScans === 'Unlimited' ? 'Unlimited' : `${subscription.remainingReceiptScans} remaining this month`}
                            </div>
                        </div>

                        {/* Total Recipe Collections */}
                        <div className="text-center">
                            <div className="text-3xl font-bold text-blue-600 mb-1">
                                {subscription.usage?.recipeCollections || 0}
                            </div>
                            <div className="text-sm text-gray-600 mb-2">Total Recipe Collections</div>
                            {subscription.remainingRecipeCollections !== 'Unlimited' && (
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(subscription.usage?.recipeCollections || 0, subscription.remainingRecipeCollections + (subscription.usage?.recipeCollections || 0)))}`}
                                        style={{ width: `${getUsagePercentage(subscription.usage?.recipeCollections || 0, subscription.remainingRecipeCollections + (subscription.usage?.recipeCollections || 0))}%` }}
                                    ></div>
                                </div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                                {subscription.remainingRecipeCollections === 'Unlimited' ? 'Unlimited' : `${subscription.remainingRecipeCollections} remaining`}
                            </div>
                        </div>

                        {/* Total Saved Recipes */}
                        <div className="text-center">
                            <div className="text-3xl font-bold text-purple-600 mb-1">
                                {subscription.usage?.savedRecipes || 0}
                            </div>
                            <div className="text-sm text-gray-600 mb-2">Total Saved Recipes</div>
                            {subscription.remainingSavedRecipes !== 'Unlimited' && (
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(subscription.usage?.savedRecipes || 0, subscription.remainingSavedRecipes + (subscription.usage?.savedRecipes || 0)))}`}
                                        style={{ width: `${getUsagePercentage(subscription.usage?.savedRecipes || 0, subscription.remainingSavedRecipes + (subscription.usage?.savedRecipes || 0))}%` }}
                                    ></div>
                                </div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                                {subscription.remainingSavedRecipes === 'Unlimited' ? 'Unlimited' : `${subscription.remainingSavedRecipes} remaining`}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {quickActions.map((action, index) => (
                            <TouchEnhancedButton
                                key={index}
                                onClick={action.action}
                                className={`p-4 border-2 rounded-lg text-left transition-all ${action.color}`}
                            >
                                <div className="flex items-start space-x-3">
                                    <div className="text-2xl">{action.icon}</div>
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900 mb-1">{action.title}</div>
                                        <div className="text-sm text-gray-600">{action.description}</div>
                                    </div>
                                    <div className="text-gray-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </TouchEnhancedButton>
                        ))}
                    </div>
                </div>

                {/* Account Security */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Security</h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-3 border-b border-gray-200">
                            <div>
                                <div className="font-medium text-gray-900">Email Address</div>
                                <div className="text-sm text-gray-600">{session.user.email}</div>
                            </div>
                            <div className="flex items-center space-x-2">
                                {session.user?.emailVerified ? (
                                    <span className="text-green-600 text-sm">✅ Verified</span>
                                ) : (
                                    <div className="flex items-center space-x-2">
                                        <span className="text-orange-600 text-sm">⚠️ Unverified</span>
                                        <TouchEnhancedButton
                                            onClick={handleResendVerification}
                                            disabled={loading}
                                            className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${
                                                loading
                                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                    : 'bg-orange-600 text-white hover:bg-orange-700 border border-orange-600'
                                            }`}
                                        >
                                            {loading ? 'Sending...' : 'Resend Verification'}
                                        </TouchEnhancedButton>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-gray-200">
                            <div>
                                <div className="font-medium text-gray-900">Password</div>
                                <div className="text-sm text-gray-600">Last updated recently</div>
                            </div>
                            <TouchEnhancedButton
                                onClick={() => router.push('/auth/change-password')}
                                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                            >
                                Change Password
                            </TouchEnhancedButton>
                        </div>

                        <div className="flex items-center justify-between py-3">
                            <div>
                                <div className="font-medium text-gray-900">Two-Factor Authentication</div>
                                <div className="text-sm text-gray-600">Add an extra layer of security</div>
                            </div>
                            <TouchEnhancedButton
                                onClick={() => alert('Two-factor authentication setup coming soon!')}
                                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                            >
                                Enable 2FA
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>

                {/* Support */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Need Help?</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <TouchEnhancedButton
                            onClick={() => setShowContactModal(true)}
                            className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 text-center transition-colors"
                        >
                            <div className="text-2xl mb-2">📧</div>
                            <div className="font-medium text-gray-900">Contact Support</div>
                            <div className="text-sm text-gray-600">Get help with software issues/bugs</div>
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={() => router.push('/help')}
                            className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 text-center transition-colors"
                        >
                            <div className="text-2xl mb-2">📚</div>
                            <div className="font-medium text-gray-900">Help Center</div>
                            <div className="text-sm text-gray-600">Browse F.A.Q.s</div>
                        </TouchEnhancedButton>

                        <TouchEnhancedButton
                            onClick={() => router.push('/feedback')}
                            className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 text-center transition-colors"
                        >
                            <div className="text-2xl mb-2">💡</div>
                            <div className="font-medium text-gray-900">Send Feedback</div>
                            <div className="text-sm text-gray-600">Share your thoughts/comments</div>
                        </TouchEnhancedButton>
                    </div>
                </div>

                <Footer />
            </div>

            {/* Contact Support Modal */}
            <ContactSupportModal
                isOpen={showContactModal}
                onClose={() => setShowContactModal(false)}
                userSubscription={subscription}
            />

            {/* Pre-Registration Reward Modal */}
            {showPreRegModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
                        <div className="text-center">
                            <div className="text-6xl mb-4">🎉</div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                Congratulations!
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Thank you for pre-registering for Doc Bear's Comfort Kitchen!
                                As a special reward, you get <strong>30 days of premium access</strong> completely free!
                            </p>

                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                                <h3 className="font-semibold text-green-800 mb-2">Your Premium Benefits Include:</h3>
                                <ul className="text-sm text-green-700 text-left space-y-1">
                                    <li>✅ Unlimited inventory items</li>
                                    <li>✅ Unlimited receipt scanning</li>
                                    <li>✅ Advanced meal planning</li>
                                    <li>✅ Nutrition goal tracking</li>
                                    <li>✅ Priority support</li>
                                    <li>✅ All premium features</li>
                                </ul>
                            </div>

                            <div className="flex space-x-3">
                                <TouchEnhancedButton
                                    onClick={() => setShowPreRegModal(false)}
                                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium"
                                >
                                    Claim Later
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={claimPreRegistrationReward}
                                    disabled={loading}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
                                >
                                    {loading ? 'Activating...' : 'Claim Reward!'}
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </MobileOptimizedLayout>
    );
}