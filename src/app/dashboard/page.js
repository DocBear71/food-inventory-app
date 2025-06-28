'use client';
// file: src/app/dashboard/page.js v14 - Added Receipt Scanner to Quick Actions


import {useSafeSession} from '@/hooks/useSafeSession';
import {useEffect, useState} from 'react';
import ExpirationNotifications from '@/components/notifications/ExpirationNotifications';
import {redirect} from 'next/navigation';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import {getApiUrl} from '@/lib/api-config';

export default function Dashboard() {
    const {data: session, status} = useSafeSession();
    const [inventoryStats, setInventoryStats] = useState({
        totalItems: 0,
        expiringItems: 0,
        categories: {}
    });
    const [loading, setLoading] = useState(true);
    const [showNotifications, setShowNotifications] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/auth/signin');
        }
    }, [status]);

    useEffect(() => {
        if (session) {
            fetchInventoryStats();
        }
    }, [session]);

    const fetchInventoryStats = async () => {
        try {
            const response = await fetch(getApiUrl('/api/inventory'));
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
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <MobileOptimizedLayout>
            <div className="space-y-6 dashboard-container">
                {/* Welcome header */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h1 className="text-2xl font-bold text-gray-900">
                            Welcome back, {session.user.name}!
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Here's what's happening with your food inventory today.
                        </p>
                    </div>
                </div>

                {/* Stats cards - Stack on mobile */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
                    <ExpirationNotifications onItemsUpdated={handleItemsUpdated}/>
                )}

                {/* Quick actions - Fixed mobile layout with Receipt Scanner */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                            Quick Actions
                        </h3>
                        {/* Mobile: 1 column, MD: 2 columns, LG: 4 columns - Custom CSS */}
                        <div className="mobile-stack">
                            {/* Receipt Scanner - NEW */}
                            <a
                                href="/inventory/receipt-scan"
                                className="flex items-center p-6 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors min-h-[100px]"
                            >
                                <div className="text-4xl mr-4 flex-shrink-0">📄</div>
                                <div className="min-w-0">
                                    <div className="font-medium text-purple-900 text-base">Scan Receipt</div>
                                    <div className="text-sm text-purple-700">Add items from receipt</div>
                                </div>
                            </a>

                            <a
                                href="/inventory?action=add"
                                className="flex items-center p-6 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors min-h-[100px]"
                            >
                                <div className="text-4xl mr-4 flex-shrink-0">➕</div>
                                <div className="min-w-0">
                                    <div className="font-medium text-indigo-900 text-base">Add Item</div>
                                    <div className="text-sm text-indigo-700">Add to inventory</div>
                                </div>
                            </a>

                            <a
                                href="/inventory"
                                className="flex items-center p-6 bg-green-50 rounded-lg hover:bg-green-100 transition-colors min-h-[100px]"
                            >
                                <div className="text-4xl mr-4 flex-shrink-0">📋</div>
                                <div className="min-w-0">
                                    <div className="font-medium text-green-900 text-base">View Inventory</div>
                                    <div className="text-sm text-green-700">See all items</div>
                                </div>
                            </a>

                            <a
                                href="/recipes"
                                className="flex items-center p-6 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors min-h-[100px]"
                            >
                                <div className="text-4xl mr-4 flex-shrink-0">🍳</div>
                                <div className="min-w-0">
                                    <div className="font-medium text-yellow-900 text-base">Browse Recipes</div>
                                    <div className="text-sm text-yellow-700">Find recipes</div>
                                </div>
                            </a>

                            <a
                                href="/recipes/suggestions"
                                className="flex items-center p-6 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors min-h-[100px]"
                            >
                                <div className="text-4xl mr-4 flex-shrink-0">💡</div>
                                <div className="min-w-0">
                                    <div className="font-medium text-orange-900 text-base">What Can I Make?</div>
                                    <div className="text-sm text-orange-700">Recipe suggestions</div>
                                </div>
                            </a>

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
                        </div>
                    </div>
                </div>

                {/* Category breakdown - Fixed version */}
                {!loading && Object.keys(inventoryStats.categories).length > 0 && (
                    <div className="bg-white shadow rounded-lg">
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
            </div>
        </MobileOptimizedLayout>
    );
}