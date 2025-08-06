'use client';

// TEMPORARY DEBUG VERSION - Replace your account page temporarily with this

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSafeSession } from '@/hooks/useSafeSession';
import { useSubscription } from '@/hooks/useSubscription';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';

export default function AccountPage() {
    console.log('🔍 Account page rendering...');

    // All hooks at the top level - no conditions
    const { data: session, status } = useSafeSession();
    const router = useRouter();
    const subscription = useSubscription();

    // All state hooks together
    const [loading, setLoading] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [showPreRegModal, setShowPreRegModal] = useState(false);
    const [preRegRewardStatus, setPreRegRewardStatus] = useState(null);

    console.log('🔍 Session status:', status);
    console.log('🔍 Session data:', session);
    console.log('🔍 Subscription:', subscription);

    // Effect for redirect - but don't redirect immediately to avoid hook issues
    useEffect(() => {
        if (status === 'unauthenticated') {
            console.log('🔍 Will redirect to signin...');
            // Use setTimeout to avoid hook order issues
            setTimeout(() => {
                router.push('/auth/signin');
            }, 100);
        }
    }, [status, router]);

    // Simplified loading state
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

    // Simplified unauthenticated state
    if (status === 'unauthenticated') {
        return (
            <MobileOptimizedLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-lg text-gray-600">Redirecting to sign in...</div>
                    </div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    // Don't render if no session - but still maintain hook order
    if (!session) {
        return (
            <MobileOptimizedLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-lg text-gray-600">No session found...</div>
                    </div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    // Helper functions (moved outside render to avoid re-creation)
    const formatDate = (date) => {
        if (!date) return 'N/A';
        try {
            const dateObj = typeof date === 'string' ? new Date(date) : date;
            if (isNaN(dateObj.getTime())) return 'N/A';
            return dateObj.toLocaleDateString();
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

    console.log('🔍 Rendering main account content...');

    return (
        <MobileOptimizedLayout>
            <div className="space-y-6">
                {/* Minimal Header */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h1 className="text-2xl font-bold text-gray-900">Account Dashboard</h1>
                    <p className="text-gray-600 mt-1">Welcome back, {session.user?.name || 'User'}!</p>
                    <div className="mt-4 text-sm text-gray-500">
                        <div>Email: {session.user?.email}</div>
                        <div>Status: {status}</div>
                        <div>Subscription Tier: {subscription?.tier || 'unknown'}</div>
                        <div>Member since: {formatDate(session.user?.createdAt)}</div>
                    </div>
                </div>

                {/* Minimal Subscription Info */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Subscription Status</h2>

                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span>Current Plan:</span>
                            <span className={`px-3 py-1 rounded-full text-sm ${getTierColor(subscription?.tier)}`}>
                                {subscription?.tier || 'Unknown'}
                            </span>
                        </div>

                        <div className="flex justify-between">
                            <span>Status:</span>
                            <span>{subscription?.status || 'Unknown'}</span>
                        </div>

                        {subscription?.isTrialActive && (
                            <div className="flex justify-between">
                                <span>Trial Days Left:</span>
                                <span className="text-orange-600">
                                    {subscription.daysUntilTrialEnd || 'Unknown'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Basic Navigation */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Links</h2>
                    <div className="space-y-2">
                        <button
                            onClick={() => router.push('/account/billing')}
                            className="w-full text-left p-3 border rounded hover:bg-gray-50"
                        >
                            Manage Billing →
                        </button>
                        <button
                            onClick={() => router.push('/profile')}
                            className="w-full text-left p-3 border rounded hover:bg-gray-50"
                        >
                            Profile Settings →
                        </button>
                        <button
                            onClick={() => router.push('/inventory')}
                            className="w-full text-left p-3 border rounded hover:bg-gray-50"
                        >
                            Inventory →
                        </button>
                    </div>
                </div>

                {/* Debug Info */}
                <div className="bg-gray-100 rounded-lg p-4 text-sm">
                    <h3 className="font-semibold mb-2">Debug Info:</h3>
                    <div>Session Status: {status}</div>
                    <div>User ID: {session.user?.id}</div>
                    <div>User Email: {session.user?.email}</div>
                    <div>Subscription Tier: {subscription?.tier}</div>
                    <div>Hook Render Count: This should stay consistent</div>
                </div>
            </div>
        </MobileOptimizedLayout>
    );
}