'use client';
// file: /src/components/inventory/PriceTrackingModal.js v3 - Enhanced with feature gates

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { useFeatureGate } from '@/hooks/useSubscription';
import { FEATURE_GATES } from '@/lib/subscription-config';

export default function PriceTrackingModal({ item, isOpen, onClose, onPriceAdded }) {
    // Feature gate checks
    const priceTrackingGate = useFeatureGate(FEATURE_GATES.PRICE_TRACKING);
    const priceHistoryGate = useFeatureGate(FEATURE_GATES.PRICE_HISTORY);
    const priceAlertsGate = useFeatureGate(FEATURE_GATES.PRICE_ALERTS);

    // Existing state...
    const [activeTab, setActiveTab] = useState('add-price');
    const [formData, setFormData] = useState({
        price: '',
        store: '',
        size: '',
        unit: '',
        isOnSale: false,
        saleEndDate: '',
        notes: ''
    });
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(false);
    const [priceHistory, setPriceHistory] = useState([]);
    const [priceStats, setPriceStats] = useState(null);
    const [alerts, setAlerts] = useState({
        enabled: false,
        targetPrice: '',
        alertWhenBelow: true
    });
    const [usageInfo, setUsageInfo] = useState({
        currentCount: 0,
        remainingCount: 0,
        limit: 0
    });

    // Fetch usage limits when modal opens
    useEffect(() => {
        if (isOpen && item) {
            fetchPriceHistory();
            fetchStores();
            checkUsageLimits();
        }
    }, [isOpen, item]);

    const checkUsageLimits = async () => {
        try {
            // Get current price tracking count for this user
            const response = await fetch('/api/user/usage/price-tracking');
            const data = await response.json();
            if (data.success) {
                setUsageInfo(data.usage);
            }
        } catch (error) {
            console.error('Error checking usage limits:', error);
        }
    };

    const fetchPriceHistory = async () => {
        try {
            const response = await fetch(`/api/inventory/${item._id}/prices`);
            const data = await response.json();
            if (data.success) {
                setPriceHistory(data.data.priceHistory || []);
                setPriceStats(data.data.statistics || null);
                setAlerts({
                    enabled: data.data.priceAlerts?.enabled || false,
                    targetPrice: data.data.priceAlerts?.targetPrice || '',
                    alertWhenBelow: data.data.priceAlerts?.alertWhenBelow ?? true
                });
            }
        } catch (error) {
            console.error('Error fetching price history:', error);
        }
    };

    const fetchStores = async () => {
        try {
            const response = await fetch('/api/stores');
            const data = await response.json();
            if (data.success) {
                setStores(data.stores || []);
            }
        } catch (error) {
            console.error('Error fetching stores:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Check usage limits before allowing submission
        if (!priceTrackingGate.canUse || (usageInfo.limit > 0 && usageInfo.currentCount >= usageInfo.limit)) {
            alert(`You've reached your ${priceTrackingGate.tier} plan limit. Upgrade for unlimited price tracking!`);
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`/api/inventory/${item._id}/prices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (data.success) {
                onPriceAdded?.(data.data);
                setFormData({
                    price: '',
                    store: '',
                    size: '',
                    unit: '',
                    isOnSale: false,
                    saleEndDate: '',
                    notes: ''
                });
                fetchPriceHistory(); // Refresh history
                checkUsageLimits(); // Update usage counts
                setActiveTab('history'); // Switch to history tab
            } else {
                alert(data.error || 'Failed to add price');
            }
        } catch (error) {
            console.error('Error adding price:', error);
            alert('Error adding price');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateAlerts = async () => {
        if (!priceAlertsGate.canUse) {
            alert('Price alerts are available with Platinum subscription!');
            return;
        }

        try {
            const response = await fetch(`/api/inventory/${item._id}/prices`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(alerts)
            });

            const data = await response.json();
            if (data.success) {
                alert('Price alerts updated successfully!');
            } else {
                alert(data.error || 'Failed to update alerts');
            }
        } catch (error) {
            console.error('Error updating alerts:', error);
            alert('Error updating alerts');
        }
    };

    const handleDeletePrice = async (priceEntryId) => {
        if (!confirm('Are you sure you want to delete this price entry?')) return;

        try {
            const response = await fetch(`/api/inventory/${item._id}/prices?priceEntryId=${priceEntryId}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            if (data.success) {
                fetchPriceHistory(); // Refresh history
                checkUsageLimits(); // Update usage counts
                onPriceAdded?.({ refreshNeeded: true }); // Trigger parent refresh
            } else {
                alert(data.error || 'Failed to delete price entry');
            }
        } catch (error) {
            console.error('Error deleting price:', error);
            alert('Error deleting price');
        }
    };

    if (!isOpen) return null;

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatPrice = (price) => {
        return typeof price === 'number' ? price.toFixed(2) : '0.00';
    };

    const getUsageDisplay = () => {
        if (priceTrackingGate.tier === 'platinum' || priceTrackingGate.tier === 'admin') {
            return 'Unlimited';
        }
        return `${usageInfo.currentCount}/${usageInfo.limit}`;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] overflow-y-auto">
                <div className="p-6">
                    {/* Header with Usage Info */}
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">💰 Price Tracking</h2>
                            <div className="flex items-center space-x-3 mt-1">
                                <p className="text-sm text-gray-600">{item.name}</p>
                                <div className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                                    {priceTrackingGate.tier?.charAt(0).toUpperCase() + priceTrackingGate.tier?.slice(1)} Plan
                                </div>
                                <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                    Usage: {getUsageDisplay()}
                                </div>
                            </div>
                        </div>
                        <TouchEnhancedButton
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl"
                        >
                            ✕
                        </TouchEnhancedButton>
                    </div>

                    {/* Usage Warning for Free/Gold users */}
                    {(usageInfo.limit > 0 && usageInfo.remainingCount <= 2) && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                            <div className="flex items-start">
                                <div className="text-amber-600 mr-3 text-xl">⚠️</div>
                                <div>
                                    <h3 className="font-medium text-amber-800">Usage Limit Warning</h3>
                                    <p className="text-sm text-amber-700 mt-1">
                                        You have {usageInfo.remainingCount} price tracking entries remaining this month.
                                        <a href="/pricing?source=price-tracking-limit" className="underline ml-1">
                                            Upgrade for unlimited tracking!
                                        </a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Price Stats Banner - only if user has history access */}
                    {priceHistoryGate.canUse && priceStats && priceStats.totalEntries > 0 && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6 border border-blue-200">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div>
                                    <div className="text-lg font-semibold text-blue-600">${formatPrice(priceStats.lowest)}</div>
                                    <div className="text-xs text-gray-600">Lowest Price</div>
                                </div>
                                <div>
                                    <div className="text-lg font-semibold text-blue-600">${formatPrice(priceStats.average)}</div>
                                    <div className="text-xs text-gray-600">Average Price</div>
                                </div>
                                <div>
                                    <div className="text-lg font-semibold text-blue-600">${formatPrice(priceStats.highest)}</div>
                                    <div className="text-xs text-gray-600">Highest Price</div>
                                </div>
                                <div>
                                    <div className="text-lg font-semibold text-blue-600">{priceStats.totalEntries}</div>
                                    <div className="text-xs text-gray-600">Price Entries</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab Navigation with Feature Gates */}
                    <div className="flex border-b border-gray-200 mb-6">
                        <button
                            onClick={() => setActiveTab('add-price')}
                            className={`px-4 py-2 font-medium text-sm rounded-t-lg ${
                                activeTab === 'add-price'
                                    ? 'bg-indigo-100 text-indigo-700 border-b-2 border-indigo-500'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            💰 Add Price
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            disabled={!priceHistoryGate.canUse}
                            className={`px-4 py-2 font-medium text-sm rounded-t-lg ${
                                activeTab === 'history'
                                    ? 'bg-indigo-100 text-indigo-700 border-b-2 border-indigo-500'
                                    : priceHistoryGate.canUse
                                        ? 'text-gray-500 hover:text-gray-700'
                                        : 'text-gray-300 cursor-not-allowed'
                            }`}
                        >
                            📊 History ({priceHistory.length})
                            {!priceHistoryGate.canUse && <span className="ml-1 text-xs">🔒</span>}
                        </button>
                        <button
                            onClick={() => setActiveTab('alerts')}
                            className={`px-4 py-2 font-medium text-sm rounded-t-lg ${
                                activeTab === 'alerts'
                                    ? 'bg-indigo-100 text-indigo-700 border-b-2 border-indigo-500'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            🔔 Alerts
                            {!priceAlertsGate.canUse && <span className="ml-1 text-xs">🔒</span>}
                        </button>
                    </div>

                    {/* Rest of your existing tab content... */}
                    {/* (Keep all the existing tab content from your current modal) */}

                    {/* For the Alerts tab, update the feature detection: */}
                    {activeTab === 'alerts' && (
                        <div className="space-y-6">
                            {!priceAlertsGate.canUse ? (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <div className="flex items-start">
                                        <div className="text-yellow-600 mr-3 text-xl">⚠️</div>
                                        <div>
                                            <h3 className="font-medium text-yellow-800">Platinum Feature</h3>
                                            <p className="text-sm text-yellow-700 mt-1">
                                                Price alerts are available with Platinum subscription. Get notified when prices drop below your target!
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {/* Rest of alerts tab content... */}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
