'use client';
// file: /src/components/recipes/SimpleFeatureGate.js v1 - Simple feature gate that works with your existing API

import { useState, useEffect } from 'react';
import { useSafeSession } from '@/hooks/useSafeSession';
import { apiGet } from '@/lib/api-config';
import NativeNavigation from "@/components/mobile/NativeNavigation.js";

export default function SimpleFeatureGate({
                                              feature,
                                              children,
                                              fallback = null,
                                              requiresTier = 'gold' // default required tier
                                          }) {
    const { data: session } = useSafeSession();
    const [hasAccess, setHasAccess] = useState(true); // Default to true to prevent blocking
    const [loading, setLoading] = useState(false);
    const [userTier, setUserTier] = useState('free');

    useEffect(() => {
        if (session?.user?.id) {
            checkAccess();
        }
    }, [session?.user?.id, feature]);

    const checkAccess = async () => {
        try {
            setLoading(true);
            const response = await apiGet('/api/subscription/status');

            if (response.ok) {
                const data = await response.json();
                const tier = data.tier || 'free';
                setUserTier(tier);

                // Simple tier checking
                const tierHierarchy = { free: 0, gold: 1, platinum: 2 };
                const requiredLevel = tierHierarchy[requiresTier] || 1;
                const userLevel = tierHierarchy[tier] || 0;

                setHasAccess(userLevel >= requiredLevel);
            } else {
                console.warn('Subscription API failed, allowing access');
                setHasAccess(true); // Default to allowing access
            }
        } catch (error) {
            console.warn('Error checking subscription, allowing access:', error);
            setHasAccess(true); // Default to allowing access on error
        } finally {
            setLoading(false);
        }
    };

    // If not signed in, show sign in prompt
    if (!session?.user?.id) {
        return fallback || (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm mb-2">Please sign in to access this feature</p>
                <button
                    onClick={() => NativeNavigation.navigateTo({ path: '/auth/signin', router })}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                    Sign In
                </button>
            </div>
        );
    }

    // Show loading state
    if (loading) {
        return <div className="animate-pulse bg-gray-200 rounded h-10 w-32"></div>;
    }

    // If user has access, show children
    if (hasAccess) {
        return children;
    }

    // If fallback provided, use it
    if (fallback) {
        return fallback;
    }

    // Default upgrade prompt
    return (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
                <div className="text-blue-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <div className="flex-1">
                    <p className="text-sm text-gray-700 mb-2">
                        This feature requires a {requiresTier.charAt(0).toUpperCase() + requiresTier.slice(1)} subscription
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => window.location.href = `/pricing?source=${feature}&required=${requiresTier}`}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                            Upgrade to {requiresTier.charAt(0).toUpperCase() + requiresTier.slice(1)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}