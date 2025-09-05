'use client';
// file: src/app/dashboard/page.js v16 - FIXED: Removed double scrollbars by fixing container structure

import {useSafeSession} from '@/hooks/useSafeSession';
import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import ExpirationNotifications from '@/components/notifications/ExpirationNotifications';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-config';
import { useSubscription } from '@/hooks/useSubscription';
import NativeNavigation from "@/components/mobile/NativeNavigation.js";

export default function Dashboard() {
    const {data: session, status} = useSafeSession();
    const router = useRouter();
    const [inventoryStats, setInventoryStats] = useState({
        totalItems: 0,
        expiringItems: 0,
        categories: {}
    });
    const subscription = useSubscription();
    const [showExpiredBanner, setShowExpiredBanner] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showNotifications, setShowNotifications] = useState(false);

    // FIXED: Use router.push instead of redirect
    useEffect(() => {
        if (status === 'unauthenticated') {
            NativeNavigation.routerPush(router, '/auth/signin');
        }
    }, [status, router]);

    useEffect(() => {
        if (session) {
            fetchInventoryStats();
        }
    }, [session]);

    // Check if we should show the expired banner
    useEffect(() => {
        const dismissed = localStorage.getItem('dismissed-expired-banner');
        const shouldShow = subscription.status === 'expired' && !dismissed;
        setShowExpiredBanner(shouldShow);
    }, [subscription.status]);

// Reset banner dismissal when subscription status changes from expired
    useEffect(() => {
        if (subscription.status !== 'expired') {
            localStorage.removeItem('dismissed-expired-banner');
        }
    }, [subscription.status]);

    const dismissBanner = () => {
        localStorage.setItem('dismissed-expired-banner', 'true');
        setShowExpiredBanner(false);
    };

    const fetchInventoryStats = async () => {
        try {
            const response = await apiGet('/api/inventory');
            const data = await response.json();

            if (data.success) {
                const items = data.inventory;
                const now = new Date();
                const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

                const stats = {
                    totalItems: items.length,
                    expiringItems: items.filter(item =>
                        item.expirationDate && new Date(item.expirationDate) <= weekFromNow
                    ).length,
                    categories: items.reduce((acc, item) => {
                        const category = item.category || 'Other';
                        acc[category] = (acc[category] || 0) + 1;
                        return acc;
                    }, {})
                };

                setInventoryStats(stats);
            }
        } catch (error) {
            console.error('Error fetching inventory stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleItemsUpdated = () => {
        // Refresh inventory stats when items are updated from notifications
        fetchInventoryStats();
    };

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

    return (
        <MobileOptimizedLayout>
            {/* Expired Subscription Banner */}
            {showExpiredBanner && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                    <div className="flex items-start justify-between">
                        <div className="flex">
                            <div className="text-red-400 text-xl mr-3">⚠️</div>
                            <div className="flex-1">
                                <h3 className="text-red-800 font-semibold text-lg">
                                    Your subscription has expired
                                </h3>
                                <p className="text-red-700 mt-1">
                                    Your premium features are no longer available. Reactivate your subscription to regain access to meal planning, unlimited scanning, and more.
                                </p>
                                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                                    <TouchEnhancedButton
                                        onClick={() => NativeNavigation.routerPush(router, '/pricing')}
                                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium text-sm"
                                    >
                                        Reactivate Subscription
                                    </TouchEnhancedButton>
                                    <TouchEnhancedButton
                                        onClick={() => NativeNavigation.routerPush(router, '/account/billing')}
                                        className="bg-white hover:bg-gray-50 text-red-600 border border-red-600 px-4 py-2 rounded-lg font-medium text-sm"
                                    >
                                        View Billing Details
                                    </TouchEnhancedButton>
                                </div>
                            </div>
                        </div>
                        <TouchEnhancedButton
                            onClick={dismissBanner}
                            className="text-red-400 hover:text-red-600 ml-4"
                            aria-label="Dismiss banner"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </TouchEnhancedButton>
                    </div>
                </div>
            )}

            {/* Welcome header */}
            <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
                <div className="px-4 py-5 sm:p-6">
                    <h1 className="text-2xl font-bold text-gray-900">
                        Welcome back, {session.user.name}!
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Here's what's happening with your food inventory today.
                    </p>
                </div>
            </div>

            {/* Free Trial Promotion */}
            {subscription.tier === 'free' && subscription.status !== 'trial' && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-purple-900 mb-2">
                                Try Platinum Free for 7 Days!
                            </h3>
                            <p className="text-purple-800 mb-3">
                                Get unlimited inventory, advanced meal planning, nutrition tracking, and all premium features. No credit card required.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <TouchEnhancedButton
                                    onClick={() => NativeNavigation.routerPush(router, '/account/billing?trial=true')}
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium"
                                >
                                    Start Free Trial
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={() => NativeNavigation.routerPush(router, '/pricing')}
                                    className="bg-white hover:bg-gray-50 text-purple-600 border border-purple-600 px-6 py-2 rounded-lg font-medium"
                                >
                                    View All Plans
                                </TouchEnhancedButton>
                            </div>
                        </div>
                        <div className="hidden sm:block ml-6 text-6xl">
                            🎁
                        </div>
                    </div>
                </div>
            )}

            {/* Stats cards - Stack on mobile */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-4">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="text-2xl">📦</div>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Total Items
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {loading ? '...' : inventoryStats.totalItems}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setShowNotifications(!showNotifications)}
                >
                    <div className="p-4">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="text-2xl">
                                    {inventoryStats.expiringItems > 0 ? '⚠️' : '✅'}
                                </div>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Expiring Soon<br/>
                                        <span
                                            className="text-xs text-indigo-600 ml-1">(click to {showNotifications ? 'hide' : 'view'})</span>
                                    </dt>
                                    <dd className={`text-lg font-medium ${inventoryStats.expiringItems > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                        {loading ? '...' : inventoryStats.expiringItems}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-4">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="text-2xl">🏷️</div>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Categories
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {loading ? '...' : Object.keys(inventoryStats.categories).length}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expiration Notifications - Show/Hide based on toggle */}
            {showNotifications && (
                <div className="mb-6">
                    <ExpirationNotifications onItemsUpdated={handleItemsUpdated}/>
                </div>
            )}

            {/* Quick actions - ENHANCED: Added shopping list quick action */}
            <div className="bg-white shadow rounded-lg mb-6">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Quick Actions
                    </h3>
                    {/* FIXED: Removed mobile-stack class and used simpler grid approach */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {/* Receipt Scanner - FIXED: Using Link */}
                        <Link
                            href="/inventory/receipt-scan"
                            className="flex items-center p-6 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors min-h-[100px]"
                        >
                            <div className="text-4xl mr-4 flex-shrink-0">📄</div>
                            <div className="min-w-0">
                                <div className="font-medium text-purple-900 text-base">Scan Receipt</div>
                                <div className="text-sm text-purple-700">Add items from receipt</div>
                            </div>
                        </Link>

                        {/* NEW: Add to Shopping List Quick Action */}
                        <Link
                            href="/shopping/add-items"
                            className="flex items-center p-6 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors min-h-[100px]"
                        >
                            <div className="text-4xl mr-4 flex-shrink-0">🛒</div>
                            <div className="min-w-0">
                                <div className="font-medium text-blue-900 text-base">Add to Shopping List</div>
                                <div className="text-sm text-blue-700">From inventory or add new items</div>
                            </div>
                        </Link>

                        <Link
                            href="/inventory?action=add&scroll=form"
                            className="flex items-center p-6 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors min-h-[100px]"
                        >
                            <div className="text-4xl mr-4 flex-shrink-0">➕</div>
                            <div className="min-w-0">
                                <div className="font-medium text-indigo-900 text-base">Add Item</div>
                                <div className="text-sm text-indigo-700">Add to inventory</div>
                            </div>
                        </Link>

                        <Link
                            href="/inventory"
                            className="flex items-center p-6 bg-green-50 rounded-lg hover:bg-green-100 transition-colors min-h-[100px]"
                        >
                            <div className="text-4xl mr-4 flex-shrink-0">📋</div>
                            <div className="min-w-0">
                                <div className="font-medium text-green-900 text-base">View Inventory</div>
                                <div className="text-sm text-green-700">See all items</div>
                            </div>
                        </Link>

                        <Link
                            href="/dashboard/nutrition"
                            className="flex items-center p-6 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors min-h-[100px]"
                        >
                            <div className="text-4xl mr-4 flex-shrink-0">🔬</div>
                            <div className="min-w-0">
                                <div className="font-medium text-emerald-900 text-base">Nutrition Dashboard</div>
                                <div className="text-sm text-emerald-700">AI-powered nutrition analysis</div>
                            </div>
                        </Link>

                        <Link
                            href="/stores"
                            className="flex items-center p-6 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors min-h-[100px]"
                        >
                            <div className="text-4xl mr-4 flex-shrink-0">🏪</div>
                            <div className="min-w-0">
                                <div className="font-medium text-teal-900 text-base">My Stores</div>
                                <div className="text-sm text-teal-700">Manage price tracking stores</div>
                            </div>
                        </Link>

                        <Link
                            href="/recipes"
                            className="flex items-center p-6 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors min-h-[100px]"
                        >
                            <div className="text-4xl mr-4 flex-shrink-0">🍳</div>
                            <div className="min-w-0">
                                <div className="font-medium text-yellow-900 text-base">Browse Recipes</div>
                                <div className="text-sm text-yellow-700">Find recipes</div>
                            </div>
                        </Link>

                        <Link
                            href="/recipes/suggestions"
                            className="flex items-center p-6 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors min-h-[100px]"
                        >
                            <div className="text-4xl mr-4 flex-shrink-0">💡</div>
                            <div className="min-w-0">
                                <div className="font-medium text-orange-900 text-base">What Can I Make?</div>
                                <div className="text-sm text-orange-700">Recipe suggestions</div>
                            </div>
                        </Link>

                        {/* Expiration Management Quick Action */}
                        <TouchEnhancedButton
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="flex items-center p-6 bg-red-50 rounded-lg hover:bg-red-100 transition-colors min-h-[100px] w-full text-left"
                        >
                            <div className="text-4xl mr-4 flex-shrink-0">
                                {inventoryStats.expiringItems > 0 ? '🚨' : '✅'}
                            </div>
                            <div className="min-w-0">
                                <div className="font-medium text-red-900 text-base">
                                    {inventoryStats.expiringItems > 0 ? 'Check Expiring Items' : 'All Items Fresh'}
                                </div>
                                <div className="text-sm text-red-700">
                                    {inventoryStats.expiringItems > 0
                                        ? `${inventoryStats.expiringItems} items need attention`
                                        : 'No items expiring soon'
                                    }
                                </div>
                            </div>
                        </TouchEnhancedButton>

                        {/* NEW: Recently Used Items Quick Action */}
                        <Link
                            href="/shopping/add-items?tab=consumed"
                            className="flex items-center p-6 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors min-h-[100px]"
                        >
                            <div className="text-4xl mr-4 flex-shrink-0">🔄</div>
                            <div className="min-w-0">
                                <div className="font-medium text-teal-900 text-base">Recently Used Items</div>
                                <div className="text-sm text-teal-700">Re-add consumed items</div>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Category breakdown - Fixed version */}
            {!loading && Object.keys(inventoryStats.categories).length > 0 && (
                <div className="bg-white shadow rounded-lg mb-6">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                            Inventory by Category
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {Object.entries(inventoryStats.categories)
                                .sort(([, a], [, b]) => b - a)
                                .map(([category, count]) => (
                                    <div key={category} className="flex justify-between items-center py-1">
                                        <span className="text-sm font-medium text-gray-700">
                                            {category}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            {count} item{count !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            )}

            <Footer/>
        </MobileOptimizedLayout>
    );
}