
'use client';

// file: /src/app/admin/analytics/page.js
// Admin Analytics Dashboard - Comprehensive usage statistics and insights

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import NativeNavigation from "@/components/mobile/NativeNavigation.js";

export default function AdminAnalyticsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    // State management
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeframe, setTimeframe] = useState(30);

    // Check admin access
    useEffect(() => {
        if (status === 'loading') return;

        if (!session?.user?.isAdmin) {
            NativeNavigation.routerPush(router, '/');
            return;
        }
    }, [session, status, router]);

    // Fetch analytics data
    useEffect(() => {
        if (session?.user?.isAdmin) {
            fetchAnalytics();
        }
    }, [session, timeframe]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/admin/analytics?timeframe=${timeframe}`);

            if (!response.ok) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Request Failed',
                    message: `HTTP ${response.status}: ${response.statusText}`
                });
                return;
            }

            const data = await response.json();
            setAnalytics(data);

        } catch (err) {
            console.error('Error fetching analytics:', err);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Analytics Error',
                message: err.message
            });
        } finally {
            setLoading(false);
        }
    };

    // Helper functions
    const formatNumber = (num) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num?.toString() || '0';
    };

    const formatPercentage = (num) => {
        return `${num?.toFixed(1) || '0'}%`;
    };

    const getGrowthIndicator = (current, previous) => {
        if (!previous || previous === 0) return null;
        const growth = ((current - previous) / previous) * 100;
        const isPositive = growth > 0;
        return (
            <span className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '↗' : '↘'} {Math.abs(growth).toFixed(1)}%
            </span>
        );
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!session?.user?.isAdmin) {
        return null;
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                    <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading analytics</h3>
                        <p className="mt-1 text-sm text-gray-500">{error}</p>
                        <div className="mt-6">
                            <button
                                onClick={fetchAnalytics}
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h3 className="text-sm font-medium text-gray-900">No analytics data available</h3>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
                            <p className="mt-2 text-gray-600">
                                Comprehensive insights into user behavior and platform usage.
                            </p>
                        </div>

                        {/* Timeframe Selector */}
                        <div className="flex items-center space-x-3">
                            <label className="text-sm font-medium text-gray-700">Timeframe:</label>
                            <select
                                value={timeframe}
                                onChange={(e) => setTimeframe(parseInt(e.target.value))}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value={7}>Last 7 days</option>
                                <option value={30}>Last 30 days</option>
                                <option value={90}>Last 90 days</option>
                                <option value={365}>Last year</option>
                            </select>
                            <button
                                onClick={fetchAnalytics}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                            >
                                Refresh
                            </button>
                        </div>
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                        Generated at: {new Date(analytics.generatedAt).toLocaleString()}
                    </div>
                </div>

                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <span className="text-2xl">👥</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Total Users
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {formatNumber(analytics.overview.totalUsers)}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-5 py-3">
                            <div className="text-sm">
                                <span className="text-gray-600">New this period: </span>
                                <span className="font-medium text-green-600">
                                    {analytics.overview.newUsers}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <span className="text-2xl">🏃</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Active Users
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {formatNumber(analytics.overview.activeUsers)}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-5 py-3">
                            <div className="text-sm">
                                <span className="text-gray-600">Activity rate: </span>
                                <span className="font-medium text-blue-600">
                                    {formatPercentage((analytics.overview.activeUsers / analytics.overview.totalUsers) * 100)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <span className="text-2xl">📝</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Total Recipes
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {formatNumber(analytics.overview.totalRecipes)}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-5 py-3">
                            <div className="text-sm">
                                <span className="text-gray-600">Public: </span>
                                <span className="font-medium text-purple-600">
                                    {analytics.overview.publicRecipes} ({formatPercentage((analytics.overview.publicRecipes / analytics.overview.totalRecipes) * 100)})
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <span className="text-2xl">📦</span>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Inventory Items
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {formatNumber(analytics.overview.totalInventoryItems)}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-5 py-3">
                            <div className="text-sm">
                                <span className="text-gray-600">Avg per user: </span>
                                <span className="font-medium text-orange-600">
                                    {(analytics.overview.totalInventoryItems / analytics.overview.totalUsers).toFixed(1)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subscription Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Subscription Breakdown</h3>
                        <div className="space-y-4">
                            {Object.entries(analytics.subscriptions.breakdown).map(([tier, data]) => (
                                <div key={tier} className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            tier === 'admin' ? 'bg-purple-100 text-purple-800' :
                                                tier === 'platinum' ? 'bg-gray-100 text-gray-800' :
                                                    tier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-green-100 text-green-800'
                                        }`}>
                                            {tier.charAt(0).toUpperCase() + tier.slice(1)}
                                        </span>
                                        <span className="ml-2 text-sm text-gray-600">
                                            {data.total} users
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {data.active} active ({formatPercentage((data.active / data.total) * 100)})
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Conversion Metrics</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm text-gray-500">Conversion Rate</div>
                                    <div className="text-lg font-medium text-green-600">
                                        {formatPercentage(analytics.subscriptions.conversion.conversionRate)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500">Trial Conversion</div>
                                    <div className="text-lg font-medium text-blue-600">
                                        {formatPercentage(analytics.subscriptions.conversion.trialConversionRate)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Feature Adoption</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">📦 Inventory Management</span>
                                <div className="flex items-center">
                                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full"
                                            style={{width: `${analytics.featureAdoption.inventory.percentage}%`}}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium">
                                        {formatPercentage(analytics.featureAdoption.inventory.percentage)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">📝 Recipe Creation</span>
                                <div className="flex items-center">
                                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                                        <div
                                            className="bg-green-600 h-2 rounded-full"
                                            style={{width: `${analytics.featureAdoption.recipes.percentage}%`}}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium">
                                        {formatPercentage(analytics.featureAdoption.recipes.percentage)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">📱 Barcode Scanning</span>
                                <div className="flex items-center">
                                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                                        <div
                                            className="bg-purple-600 h-2 rounded-full"
                                            style={{width: `${analytics.featureAdoption.scanning.percentage}%`}}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium">
                                        {formatPercentage(analytics.featureAdoption.scanning.percentage)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">📚 Collections</span>
                                <div className="flex items-center">
                                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                                        <div
                                            className="bg-yellow-600 h-2 rounded-full"
                                            style={{width: `${analytics.featureAdoption.collections.percentage}%`}}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium">
                                        {formatPercentage(analytics.featureAdoption.collections.percentage)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Usage Statistics */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Scanning Activity</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Total UPC Scans</span>
                                <span className="text-sm font-medium text-gray-900">
                                    {formatNumber(analytics.usage.scans.totalUPC)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Total Receipt Scans</span>
                                <span className="text-sm font-medium text-gray-900">
                                    {formatNumber(analytics.usage.scans.totalReceipt)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Average per User</span>
                                <span className="text-sm font-medium text-blue-600">
                                    {analytics.usage.scans.avgPerUser.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Averages</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Inventory Items</span>
                                <span className="text-sm font-medium text-gray-900">
                                    {analytics.usage.averages.inventoryItems}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Personal Recipes</span>
                                <span className="text-sm font-medium text-gray-900">
                                    {analytics.usage.averages.personalRecipes}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Saved Recipes</span>
                                <span className="text-sm font-medium text-gray-900">
                                    {analytics.usage.averages.savedRecipes}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Collections</span>
                                <span className="text-sm font-medium text-gray-900">
                                    {analytics.usage.averages.collections}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Totals</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Recipe Collections</span>
                                <span className="text-sm font-medium text-gray-900">
                                    {formatNumber(analytics.overview.totalCollections)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Meal Plans</span>
                                <span className="text-sm font-medium text-gray-900">
                                    {formatNumber(analytics.overview.totalMealPlans)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Email Verified</span>
                                <span className="text-sm font-medium text-green-600">
                                    {analytics.overview.emailVerifiedUsers || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Users */}
                <div className="bg-white shadow rounded-lg p-6 mb-8">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Top Active Users</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    Tier
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    Recipes
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    Inventory
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    Monthly Scans
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    Member Since
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    Actions
                                </th>
                            </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                            {analytics.topUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-8 w-8">
                                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                                        <span className="text-xs font-medium text-indigo-800">
                                                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                                        </span>
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                user.tier === 'admin' ? 'bg-purple-100 text-purple-800' :
                                                    user.tier === 'platinum' ? 'bg-gray-100 text-gray-800' :
                                                        user.tier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-green-100 text-green-800'
                                            }`}>
                                                {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}
                                            </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {user.recipes}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {user.inventoryItems}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {user.monthlyScans}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(user.memberSince).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => router.push(`/admin/users/${user.id}`)}
                                            className="text-indigo-600 hover:text-indigo-900"
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Growth Chart Placeholder */}
                {analytics.growth.daily.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white shadow rounded-lg p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">User Growth Trend</h3>
                            <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                                <div className="text-center">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">Growth Chart</h3>
                                    <p className="mt-1 text-sm text-gray-500">Chart visualization would go here</p>
                                    <p className="text-xs text-gray-400 mt-2">
                                        Last {analytics.growth.daily.length} days of user registration data
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white shadow rounded-lg p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Recipe Activity Trend</h3>
                            <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                                <div className="text-center">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">Recipe Activity</h3>
                                    <p className="mt-1 text-sm text-gray-500">Recipe creation trends would go here</p>
                                    <p className="text-xs text-gray-400 mt-2">
                                        {analytics.growth.recipeActivity.length} data points available
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Raw Data for Development */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-8 bg-gray-100 rounded-lg p-4">
                        <details>
                            <summary className="cursor-pointer text-sm font-medium text-gray-700">
                                🔧 Development: Raw Analytics Data
                            </summary>
                            <pre className="mt-2 text-xs text-gray-600 overflow-auto max-h-96">
                                {JSON.stringify(analytics, null, 2)}
                            </pre>
                        </details>
                    </div>
                )}
            </div>
        </div>
    );
}