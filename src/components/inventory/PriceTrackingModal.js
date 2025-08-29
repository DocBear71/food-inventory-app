'use client';
// file: /src/components/inventory/PriceTrackingModal.js v4 - Fixed currency symbol positioning

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { useFeatureGate } from '@/hooks/useSubscription';
import { FEATURE_GATES } from '@/lib/subscription-config';
import {apiDelete, apiPost, apiPut} from "@/lib/api-config.js";
import { useCurrency } from '@/lib/currency-utils';
import NativeNavigation from "@/components/mobile/NativeNavigation.js";

export default function PriceTrackingModal({ item, isOpen, onClose, onPriceAdded }) {
    const userCurrency = useCurrency();
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
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showAlert({
                title: 'Plan Limit Reached',
                message: `You've reached your ${priceTrackingGate.tier} plan limit. Upgrade for unlimited price tracking!`
            });
            return;
        }

        setLoading(true);

        try {
            const response = await apiPost(`/api/inventory/${item._id}/prices`, {
                formData
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
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Add Price Failed',
                    message: data.error || 'Failed to add price'
                });
            }
        } catch (error) {
            console.error('Error adding price:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Add Price Error',
                message: 'Error adding price'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateAlerts = async () => {
        if (!priceAlertsGate.canUse) {
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showAlert({
                title: 'Premium Feature',
                message: 'Price alerts are available with Platinum subscription!'
            });
            return;
        }

        try {
            const response = await apiPut(`/api/inventory/${item._id}/prices`, {
                alerts
            });

            const data = await response.json();
            if (data.success) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showSuccess({
                    title: 'Alerts Updated',
                    message: 'Price alerts updated successfully!'
                });
            } else {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Update Failed',
                    message: data.error || 'Failed to update alerts'
                });
            }
        } catch (error) {
            console.error('Error updating alerts:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Update Error',
                message: 'Error updating alerts'
            });
        }
    };

    const handleDeletePrice = async (priceEntryId) => {
        const { NativeDialog } = await import('@/components/mobile/NativeDialog');
        const confirmed = await NativeDialog.showConfirm({
            title: 'Delete Price Entry',
            message: 'Are you sure you want to delete this price entry?',
            confirmText: 'Delete',
            cancelText: 'Cancel'
        });
        if (!confirmed) return;

        try {
            const response = await apiDelete(`/api/inventory/${item._id}/prices?priceEntryId=${priceEntryId}`, {
            });

            const data = await response.json();
            if (data.success) {
                fetchPriceHistory(); // Refresh history
                checkUsageLimits(); // Update usage counts
                onPriceAdded?.({ refreshNeeded: true }); // Trigger parent refresh
            } else {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Delete Failed',
                    message: data.error || 'Failed to delete price entry'
                });
            }
        } catch (error) {
            console.error('Error deleting price:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Delete Error',
                message: 'Error deleting price'
            });
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
        if (userCurrency.preferences) {
            return userCurrency.formatPrice(price);
        }
        return typeof price === 'number' ? `$${price.toFixed(2)}` : '$0.00';
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
                                    <div className="text-lg font-semibold text-blue-600">{formatPrice(priceStats.lowest)}</div>
                                    <div className="text-xs text-gray-600">Lowest Price</div>
                                </div>
                                <div>
                                    <div className="text-lg font-semibold text-blue-600">{formatPrice(priceStats.average)}</div>
                                    <div className="text-xs text-gray-600">Average Price</div>
                                </div>
                                <div>
                                    <div className="text-lg font-semibold text-blue-600">{formatPrice(priceStats.highest)}</div>
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

                    {/* Tab Content */}
                    <div className="min-h-[400px]">
                        {/* Add Price Tab */}
                        {activeTab === 'add-price' && (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Price *
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 z-10">
                                                {userCurrency.preferences?.currencySymbol || '$'}
                                            </span>
                                            <input
                                                type="number"
                                                step={userCurrency.preferences?.decimalPlaces === 0 ? '1' : '0.01'}
                                                min="0"
                                                required
                                                value={formData.price}
                                                onChange={(e) => setFormData(prev => ({...prev, price: e.target.value}))}
                                                className="w-full border border-gray-300 rounded-md py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                style={{ paddingLeft: '2rem', paddingRight: '0.75rem', fontSize: '16px' }}
                                                placeholder={userCurrency.preferences?.decimalPlaces === 0 ? '0' : '0.00'}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Enter price in {userCurrency.preferences?.currency || 'USD'}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Store *
                                        </label>
                                        <select
                                            required
                                            value={formData.store}
                                            onChange={(e) => setFormData(prev => ({...prev, store: e.target.value}))}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            style={{fontSize: '16px'}}
                                        >
                                            <option value="">Select store</option>
                                            {stores.map(store => (
                                                <option key={store._id} value={store.name}>
                                                    {store.name} {store.chain && `(${store.chain})`}
                                                </option>
                                            ))}
                                            <option value="Albertsons">Albertsons</option>
                                            <option value="Aldi">Aldi</option>
                                            <option value="Costco">Costco</option>
                                            <option value="H-E-B">H-E-B</option>
                                            <option value="Hy-Vee">Hy-Vee</option>
                                            <option value="Kroger">Kroger</option>
                                            <option value="Meijer">Meijer</option>
                                            <option value="Publix">Publix</option>
                                            <option value="Safeway">Safeway</option>
                                            <option value="Sam's Club">Sam's Club</option>
                                            <option value="Smiths">Smith's</option>
                                            <option value="Target">Target</option>
                                            <option value="Trader Joe's">Trader Joe's</option>
                                            <option value="Walmart">Walmart</option>
                                            <option value="Whole Foods">Whole Foods</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Package Size
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.size}
                                            onChange={(e) => setFormData(prev => ({...prev, size: e.target.value}))}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="e.g., 12 oz, 1 lb"
                                            style={{fontSize: '16px'}}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Unit
                                        </label>
                                        <select
                                            value={formData.unit}
                                            onChange={(e) => setFormData(prev => ({...prev, unit: e.target.value}))}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            style={{fontSize: '16px'}}
                                        >
                                            <option value="">Select unit</option>
                                            <option value="oz">Ounces</option>
                                            <option value="lb">Pounds</option>
                                            <option value="g">Grams</option>
                                            <option value="kg">Kilograms</option>
                                            <option value="ml">Milliliters</option>
                                            <option value="l">Liters</option>
                                            <option value="each">Each</option>
                                            <option value="package">Package</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="isOnSale"
                                            checked={formData.isOnSale}
                                            onChange={(e) => setFormData(prev => ({...prev, isOnSale: e.target.checked}))}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="isOnSale" className="ml-2 block text-sm text-gray-700">
                                            This item was on sale
                                        </label>
                                    </div>

                                    {formData.isOnSale && (
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Sale End Date</label>
                                            <input
                                                type="date"
                                                value={formData.saleEndDate}
                                                onChange={(e) => setFormData(prev => ({...prev, saleEndDate: e.target.value}))}
                                                className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Notes
                                    </label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))}
                                        rows={2}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Optional notes about this price..."
                                        style={{fontSize: '16px'}}
                                    />
                                </div>

                                <TouchEnhancedButton
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 font-medium"
                                >
                                    {loading ? 'Adding Price...' : 'Add Price Entry'}
                                </TouchEnhancedButton>
                            </form>
                        )}

                        {/* Price History Tab */}
                        {activeTab === 'history' && (
                            <div>
                                {priceHistory.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="text-gray-400 text-6xl mb-4">📊</div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Price History</h3>
                                        <p className="text-gray-500 mb-4">Start tracking prices to see trends and find the best deals.</p>
                                        <TouchEnhancedButton
                                            onClick={() => setActiveTab('add-price')}
                                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                                        >
                                            Add First Price
                                        </TouchEnhancedButton>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-96 overflow-y-auto">
                                        {priceHistory.map((entry, index) => (
                                            <div key={index} className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-3 mb-2">
                                                            <div className="text-xl font-bold text-green-600">{formatPrice(entry.price)}</div>
                                                            <div className="text-sm font-medium text-gray-700">{entry.store}</div>
                                                            {entry.isOnSale && (
                                                                <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                                                                    On Sale
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="text-sm text-gray-600 space-y-1">
                                                            <div>📅 {formatDate(entry.date)}</div>
                                                            {entry.size && entry.unit && (
                                                                <div>📦 {entry.size} {entry.unit}
                                                                    {entry.unitPrice && ` (${formatPrice(entry.unitPrice)}/${entry.unit})`}
                                                                </div>
                                                            )}
                                                            {entry.notes && (
                                                                <div className="italic">💭 "{entry.notes}"</div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <TouchEnhancedButton
                                                        onClick={() => handleDeletePrice(entry._id)}
                                                        className="ml-4 text-red-600 hover:text-red-800 text-sm"
                                                        title="Delete this price entry"
                                                    >
                                                        🗑️
                                                    </TouchEnhancedButton>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

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
                                <div className="space-y-4 opacity-50">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="enableAlerts"
                                            checked={alerts.enabled}
                                            onChange={(e) => setAlerts(prev => ({...prev, enabled: e.target.checked}))}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                            disabled
                                        />
                                        <label htmlFor="enableAlerts" className="ml-2 block text-sm text-gray-700">
                                            Enable price alerts for this item
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Target Price
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={alerts.targetPrice}
                                                onChange={(e) => setAlerts(prev => ({...prev, targetPrice: e.target.value}))}
                                                className="w-full border border-gray-300 rounded-md py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                style={{ paddingLeft: '2rem', paddingRight: '0.75rem' }}
                                                placeholder="0.00"
                                                disabled
                                            />
                                        </div>
                                    </div>

                                    <TouchEnhancedButton
                                        onClick={handleUpdateAlerts}
                                        disabled
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                                    >
                                        Save Alert Settings
                                    </TouchEnhancedButton>
                                </div>

                                <div className="text-center">
                                    <TouchEnhancedButton
                                        onClick={() => NativeNavigation.navigateTo({ path: '/pricing?source=price-alerts', router })}
                                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-semibold"
                                    >
                                        Upgrade to Platinum
                                    </TouchEnhancedButton>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}