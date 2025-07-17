'use client';
// file: /src/components/analytics/PriceAnalyticsDashboard.js v1 - Price insights and trends

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { useCurrency } from '@/lib/currency-utils';

export default function PriceAnalyticsDashboard({ className = "" }) {
    const userCurrency = useCurrency();
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('30');
    const [selectedCategory, setSelectedCategory] = useState('');

    useEffect(() => {
        fetchAnalytics();
    }, [timeRange, selectedCategory]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({ range: timeRange });
            if (selectedCategory) params.append('category', selectedCategory);

            const response = await fetch(`/api/analytics/prices?${params}`);
            const data = await response.json();

            if (data.success) {
                setAnalytics(data.data.analytics);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className={`bg-white rounded-lg shadow p-6 text-center ${className}`}>
                <div className="text-gray-400 text-4xl mb-4">📊</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Price Data Yet</h3>
                <p className="text-gray-500">Start tracking prices to see analytics and insights here.</p>
            </div>
        );
    }

    const formatCurrency = (amount) => {
        if (userCurrency.preferences) {
            return userCurrency.formatPrice(amount);
        }
        return `$${amount.toFixed(2)}`;
    };

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Controls */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="flex flex-wrap gap-4 items-center">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="7">Last 7 days</option>
                            <option value="30">Last 30 days</option>
                            <option value="90">Last 3 months</option>
                            <option value="365">Last year</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="">All Categories</option>
                            {analytics.trends.categoryAnalysis.map(cat => (
                                <option key={cat.category} value={cat.category}>
                                    {cat.category}
                                </option>
                            ))}
                        </select>
                    </div>
                    <TouchEnhancedButton
                        onClick={fetchAnalytics}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm mt-6"
                    >
                        Refresh
                    </TouchEnhancedButton>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="text-2xl">📦</div>
                        </div>
                        <div className="ml-4">
                            <div className="text-2xl font-bold text-gray-900">
                                {analytics.overview.totalItemsTracked}
                            </div>
                            <div className="text-sm text-gray-600">Items Tracked</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="text-2xl">💰</div>
                        </div>
                        <div className="ml-4">
                            <div className="text-2xl font-bold text-gray-900">
                                {analytics.overview.totalPriceEntries}
                            </div>
                            <div className="text-sm text-gray-600">Price Entries</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="text-2xl">🏪</div>
                        </div>
                        <div className="ml-4">
                            <div className="text-2xl font-bold text-gray-900">
                                {analytics.trends.storeComparison.length}
                            </div>
                            <div className="text-sm text-gray-600">Stores Compared</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <div className="text-2xl">📈</div>
                        </div>
                        <div className="ml-4">
                            <div className="text-2xl font-bold text-green-600">
                                {analytics.recommendations.stockUpAlerts.length}
                            </div>
                            <div className="text-sm text-gray-600">Good Deals</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Store Comparison */}
            {analytics.trends.storeComparison.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">🏪 Store Comparison</h3>
                    <div className="space-y-3">
                        {analytics.trends.storeComparison.slice(0, 5).map((store, index) => (
                            <div key={store.store} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                <div className="flex items-center space-x-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                        index === 0 ? 'bg-green-100 text-green-800' :
                                            index === 1 ? 'bg-blue-100 text-blue-800' :
                                                index === 2 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'
                                    }`}>
                                        {index + 1}
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900">{store.store}</div>
                                        <div className="text-sm text-gray-600">
                                            {store.itemCount} items • {store.totalEntries} entries
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-semibold text-gray-900">
                                        {formatCurrency(store.averagePrice)}
                                    </div>
                                    <div className="text-sm text-gray-600">avg price</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Best Deals */}
            {analytics.recommendations.bestDeals.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Best Price Variations</h3>
                    <div className="space-y-3">
                        {analytics.recommendations.bestDeals.slice(0, 5).map((deal, index) => (
                            <div key={`${deal.itemName}-${index}`} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                                <div>
                                    <div className="font-medium text-gray-900">{deal.itemName}</div>
                                    <div className="text-sm text-gray-600">
                                        {deal.category} • {formatCurrency(deal.lowestPrice)} - {formatCurrency(deal.highestPrice)}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-semibold text-green-600">
                                        {deal.savings.toFixed(1)}% range
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Save {formatCurrency(deal.savingsAmount)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stock Up Alerts */}
            {analytics.recommendations.stockUpAlerts.length > 0 && (
                <div className="bg-green-50 rounded-lg border border-green-200 p-6">
                    <h3 className="text-lg font-semibold text-green-900 mb-4">🚨 Stock Up Opportunities</h3>
                    <p className="text-sm text-green-700 mb-4">
                        These items are currently priced below their historical average - great time to stock up!
                    </p>
                    <div className="space-y-3">
                        {analytics.recommendations.stockUpAlerts.slice(0, 3).map((alert, index) => (
                            <div key={`${alert.itemName}-${index}`} className="bg-white rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium text-gray-900">{alert.itemName}</div>
                                        <div className="text-sm text-gray-600">
                                            {alert.category} • Currently at {alert.store}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold text-green-600">
                                            {formatCurrency(alert.currentPrice)}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            vs {formatCurrency(alert.averagePrice)} avg
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Store Recommendations */}
            {analytics.recommendations.storeRecommendations.length > 0 && (
                <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4">💡 Store Recommendations</h3>
                    {analytics.recommendations.storeRecommendations.map((rec, index) => (
                        <div key={index} className="bg-white rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                                <div className="text-2xl">🏆</div>
                                <div>
                                    <div className="font-medium text-gray-900">{rec.store}</div>
                                    <div className="text-sm text-gray-600 mt-1">{rec.reason}</div>
                                    <div className="text-sm text-blue-600 font-medium mt-1">{rec.savings}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
