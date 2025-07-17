'use client';

// file: /src/components/shopping/PriceIntegrationDashboard.js v1 - Complete price intelligence hub

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { MobileHaptics } from '@/components/mobile/MobileHaptics';
import SmartPriceShoppingList from './SmartPriceShoppingList';
import PriceAnalyticsDashboard from '@/components/analytics/PriceAnalyticsDashboard';
import AdvancedPriceSearch from '@/components/inventory/AdvancedPriceSearch';

export default function PriceIntegrationDashboard({ initialView = 'overview' }) {
    const [activeView, setActiveView] = useState(initialView);
    const [priceAlerts, setPriceAlerts] = useState([]);
    const [dealOpportunities, setDealOpportunities] = useState([]);
    const [budgetAnalysis, setBudgetAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [inventory, setInventory] = useState([]);

    useEffect(() => {
        loadPriceData();
    }, []);

    const loadPriceData = async () => {
        try {
            setLoading(true);

            // Load price alerts
            const alertsResponse = await fetch('/api/price-tracking/alerts');
            const alertsData = await alertsResponse.json();
            if (alertsData.success) {
                setPriceAlerts(alertsData.alerts);
            }

            // Load deal opportunities
            const dealsResponse = await fetch('/api/price-tracking/deals');
            const dealsData = await dealsResponse.json();
            if (dealsData.success) {
                setDealOpportunities(dealsData.deals);
            }

            // Load budget analysis
            const budgetResponse = await fetch('/api/price-tracking/budget-analysis');
            const budgetData = await budgetResponse.json();
            if (budgetData.success) {
                setBudgetAnalysis(budgetData.analysis);
            }

            // Load inventory for price filtering
            const inventoryResponse = await fetch('/api/inventory');
            const inventoryData = await inventoryResponse.json();
            if (inventoryData.success) {
                setInventory(inventoryData.inventory?.items || []);
            }

        } catch (error) {
            console.error('Error loading price data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSmartList = () => {
        setActiveView('smart-list');
        MobileHaptics?.light();
    };

    const handleViewChange = (view) => {
        setActiveView(view);
        MobileHaptics?.light();
    };

    const formatPrice = (price) => {
        return typeof price === 'number' ? `$${price.toFixed(2)}` : '$0.00';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <div className="text-lg text-gray-600">Loading price intelligence...</div>
                </div>
            </div>
        );
    }

    // Smart Shopping List View
    if (activeView === 'smart-list') {
        return (
            <SmartPriceShoppingList
                initialItems={[]}
                onClose={() => setActiveView('overview')}
                onSave={(listData) => {
                    console.log('Smart list saved:', listData);
                    setActiveView('overview');
                }}
            />
        );
    }

    // Price Analytics View
    if (activeView === 'analytics') {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="bg-white border-b border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <TouchEnhancedButton
                                onClick={() => setActiveView('overview')}
                                className="text-gray-600 hover:text-gray-800"
                            >
                                ← Back
                            </TouchEnhancedButton>
                            <h1 className="text-xl font-bold text-gray-900">📊 Price Analytics</h1>
                        </div>
                    </div>
                </div>
                <div className="p-4">
                    <PriceAnalyticsDashboard />
                </div>
            </div>
        );
    }

    // Advanced Search View
    if (activeView === 'search') {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="bg-white border-b border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <TouchEnhancedButton
                                onClick={() => setActiveView('overview')}
                                className="text-gray-600 hover:text-gray-800"
                            >
                                ← Back
                            </TouchEnhancedButton>
                            <h1 className="text-xl font-bold text-gray-900">🔍 Advanced Price Search</h1>
                        </div>
                    </div>
                </div>
                <div className="p-4">
                    <AdvancedPriceSearch
                        inventory={inventory}
                        onFiltersChange={(filters) => {
                            console.log('Filters changed:', filters);
                        }}
                    />
                </div>
            </div>
        );
    }

    // Main Overview Dashboard
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold">💰 Price Intelligence Hub</h1>
                        <p className="text-sm text-green-100">Smart shopping with AI-powered price optimization</p>
                    </div>

                    <TouchEnhancedButton
                        onClick={handleCreateSmartList}
                        className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-medium"
                    >
                        ➕ Smart List
                    </TouchEnhancedButton>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    <TouchEnhancedButton
                        onClick={() => handleViewChange('smart-list')}
                        className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow"
                    >
                        <div className="text-2xl mb-2">🛒</div>
                        <div className="text-sm font-medium text-gray-900">Smart Shopping</div>
                        <div className="text-xs text-gray-500">Price-optimized lists</div>
                    </TouchEnhancedButton>

                    <TouchEnhancedButton
                        onClick={() => handleViewChange('analytics')}
                        className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow"
                    >
                        <div className="text-2xl mb-2">📊</div>
                        <div className="text-sm font-medium text-gray-900">Price Analytics</div>
                        <div className="text-xs text-gray-500">Trends & insights</div>
                    </TouchEnhancedButton>

                    <TouchEnhancedButton
                        onClick={() => handleViewChange('search')}
                        className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow"
                    >
                        <div className="text-2xl mb-2">🔍</div>
                        <div className="text-sm font-medium text-gray-900">Price Search</div>
                        <div className="text-xs text-gray-500">Advanced filtering</div>
                    </TouchEnhancedButton>

                    <TouchEnhancedButton
                        onClick={() => {/* Open budget planning */}}
                        className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition-shadow"
                    >
                        <div className="text-2xl mb-2">💵</div>
                        <div className="text-sm font-medium text-gray-900">Budget Planner</div>
                        <div className="text-xs text-gray-500">Smart budgeting</div>
                    </TouchEnhancedButton>
                </div>

                {/* Price Alerts */}
                {priceAlerts.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">🚨 Price Alerts</h3>
                            <TouchEnhancedButton
                                onClick={() => {/* View all alerts */}}
                                className="text-blue-600 text-sm hover:text-blue-700"
                            >
                                View All ({priceAlerts.length})
                            </TouchEnhancedButton>
                        </div>

                        <div className="space-y-3">
                            {priceAlerts.slice(0, 3).map((alert, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <div className="text-xl">🎯</div>
                                        <div>
                                            <div className="font-medium text-gray-900">{alert.itemName}</div>
                                            <div className="text-sm text-gray-600">
                                                Target: {formatPrice(alert.targetPrice)} • Current: {formatPrice(alert.currentPrice)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-sm font-semibold text-red-600">
                                            {formatPrice(alert.currentPrice - alert.targetPrice)} over
                                        </div>
                                        <div className="text-xs text-gray-500">{alert.store}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Deal Opportunities */}
                {dealOpportunities.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">🎯 Deal Opportunities</h3>
                            <TouchEnhancedButton
                                onClick={() => {/* View all deals */}}
                                className="text-green-600 text-sm hover:text-green-700"
                            >
                                Stock Up Now
                            </TouchEnhancedButton>
                        </div>

                        <div className="space-y-3">
                            {dealOpportunities.slice(0, 4).map((deal, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <div className="text-xl">💰</div>
                                        <div>
                                            <div className="font-medium text-gray-900">{deal.itemName}</div>
                                            <div className="text-sm text-gray-600">
                                                {deal.store} • {deal.savingsPercent}% below average
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-lg font-bold text-green-600">
                                            {formatPrice(deal.currentPrice)}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Save {formatPrice(deal.savings)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Budget Analysis */}
                {budgetAnalysis && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">💵 Budget Analysis</h3>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                    {formatPrice(budgetAnalysis.monthlySpending)}
                                </div>
                                <div className="text-xs text-gray-500">This Month</div>
                            </div>

                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    {formatPrice(budgetAnalysis.avgSavings)}
                                </div>
                                <div className="text-xs text-gray-500">Avg Savings</div>
                            </div>

                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">
                                    {budgetAnalysis.dealsFound}
                                </div>
                                <div className="text-xs text-gray-500">Deals Found</div>
                            </div>

                            <div className="text-center">
                                <div className="text-2xl font-bold text-orange-600">
                                    {budgetAnalysis.itemsTracked}
                                </div>
                                <div className="text-xs text-gray-500">Items Tracked</div>
                            </div>
                        </div>

                        {budgetAnalysis.recommendations && budgetAnalysis.recommendations.length > 0 && (
                            <div className="bg-blue-50 rounded-lg p-3">
                                <div className="text-sm font-medium text-blue-900 mb-2">💡 Smart Recommendations:</div>
                                <ul className="text-sm text-blue-800 space-y-1">
                                    {budgetAnalysis.recommendations.slice(0, 3).map((rec, index) => (
                                        <li key={index}>• {rec}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Recent Activity */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Recent Price Activity</h3>

                    <div className="space-y-3">
                        {/* This would show recent price updates, alerts, etc. */}
                        <div className="flex items-center space-x-3 text-sm">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <div className="flex-1">
                                <span className="font-medium">Bananas</span> price dropped to $1.99 at Walmart
                            </div>
                            <div className="text-gray-500">2h ago</div>
                        </div>

                        <div className="flex items-center space-x-3 text-sm">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <div className="flex-1">
                                Added price tracking for <span className="font-medium">Chicken Breast</span>
                            </div>
                            <div className="text-gray-500">5h ago</div>
                        </div>

                        <div className="flex items-center space-x-3 text-sm">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            <div className="flex-1">
                                Price alert triggered for <span className="font-medium">Milk</span> at Target
                            </div>
                            <div className="text-gray-500">1d ago</div>
                        </div>
                    </div>

                    <TouchEnhancedButton
                        onClick={() => {/* View activity log */}}
                        className="w-full mt-4 text-center text-blue-600 hover:text-blue-700 py-2 border border-blue-200 rounded-lg hover:bg-blue-50"
                    >
                        View Full Activity Log
                    </TouchEnhancedButton>
                </div>
            </div>
        </div>
    );
}