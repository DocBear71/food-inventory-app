// file: /src/app/dashboard/page.js

'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { redirect } from 'next/navigation';

export default function Dashboard() {
    const { data: session, status } = useSession();
    const [inventoryStats, setInventoryStats] = useState({
        totalItems: 0,
        expiringItems: 0,
        categories: {}
    });
    const [loading, setLoading] = useState(true);

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
            const response = await fetch('/api/inventory');
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
        <DashboardLayout>
            <div className="space-y-6">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
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

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="text-2xl">⚠️</div>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Expiring Soon
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {loading ? '...' : inventoryStats.expiringItems}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
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

                {/* Quick actions - Fixed mobile layout */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                            Quick Actions
                        </h3>
                        {/* Mobile: 1 column, SM: 2 columns, LG: 4 columns */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <a
                                href="/inventory?action=add"
                                className="flex items-center p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors min-h-[80px]"
                            >
                                <div className="text-3xl mr-3 flex-shrink-0">➕</div>
                                <div className="min-w-0">
                                    <div className="font-medium text-indigo-900 text-sm">Add Item</div>
                                    <div className="text-xs text-indigo-700">Add to inventory</div>
                                </div>
                            </a>

                            <a
                                href="/inventory"
                                className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors min-h-[80px]"
                            >
                                <div className="text-3xl mr-3 flex-shrink-0">📋</div>
                                <div className="min-w-0">
                                    <div className="font-medium text-green-900 text-sm">View Inventory</div>
                                    <div className="text-xs text-green-700">See all items</div>
                                </div>
                            </a>

                            <a
                                href="/recipes"
                                className="flex items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors min-h-[80px]"
                            >
                                <div className="text-3xl mr-3 flex-shrink-0">🍳</div>
                                <div className="min-w-0">
                                    <div className="font-medium text-yellow-900 text-sm">Browse Recipes</div>
                                    <div className="text-xs text-yellow-700">Find recipes</div>
                                </div>
                            </a>

                            <a
                                href="/recipes/suggestions"
                                className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors min-h-[80px]"
                            >
                                <div className="text-3xl mr-3 flex-shrink-0">💡</div>
                                <div className="min-w-0">
                                    <div className="font-medium text-purple-900 text-sm">What Can I Make?</div>
                                    <div className="text-xs text-purple-700">Recipe suggestions</div>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Category breakdown */}
                {!loading && Object.keys(inventoryStats.categories).length > 0 && (
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                Inventory by Category
                            </h3>
                            <div className="space-y-3">
                                {Object.entries(inventoryStats.categories)
                                    .sort(([,a], [,b]) => b - a)
                                    .map(([category, count]) => (
                                        <div key={category} className="flex justify-between items-center">
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
            </div>
        </DashboardLayout>
    );
}