'use client';
// file: /src/components/inventory/MobilePriceTrackingModal.js - Mobile-optimized price tracking

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { MobileHaptics } from '@/components/mobile/MobileHaptics';
import {apiPost} from "@/lib/api-config.js";
import { useCurrency } from '@/lib/currency-utils';

export default function MobilePriceTrackingModal({ item, isOpen, onClose, onPriceAdded }) {
    const userCurrency = useCurrency();
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
    const [showQuickAdd, setShowQuickAdd] = useState(false);

    // Mobile-specific state
    const [keyboardOpen, setKeyboardOpen] = useState(false);

    useEffect(() => {
        if (isOpen && item) {
            fetchPriceHistory();
            fetchStores();
        }
    }, [isOpen, item]);

    // Mobile keyboard detection
    useEffect(() => {
        if (!isOpen) return;

        const handleViewportChange = () => {
            const viewportHeight = window.visualViewport?.height || window.innerHeight;
            const windowHeight = window.innerHeight;
            const keyboardHeight = windowHeight - viewportHeight;

            setKeyboardOpen(keyboardHeight > 150);
        };

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportChange);
            return () => window.visualViewport.removeEventListener('resize', handleViewportChange);
        }
    }, [isOpen]);

    const fetchPriceHistory = async () => {
        try {
            const response = await fetch(`/api/inventory/${item._id}/prices`);
            const data = await response.json();
            if (data.success) {
                setPriceHistory(data.data.priceHistory || []);
                setPriceStats(data.data.statistics || null);
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
        setLoading(true);
        MobileHaptics?.light();

        try {
            const response = await apiPost(`/api/inventory/${item._id}/prices`, {
               formData
            });

            const data = await response.json();
            if (data.success) {
                MobileHaptics?.success();
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
                fetchPriceHistory();
                setActiveTab('history');
            } else {
                MobileHaptics?.error();
                alert(data.error || 'Failed to add price');
            }
        } catch (error) {
            console.error('Error adding price:', error);
            MobileHaptics?.error();
            alert('Error adding price');
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAdd = async (price, store) => {
        const quickData = {
            price: price.toString(),
            store,
            size: '',
            unit: '',
            isOnSale: false,
            notes: 'Quick add from mobile'
        };

        try {
            setLoading(true);
            MobileHaptics?.light();

            const response = await apiPost(`/api/inventory/${item._id}/prices`, {
                quickData
            });

            const data = await response.json();
            if (data.success) {
                MobileHaptics?.success();
                onPriceAdded?.(data.data);
                fetchPriceHistory();
                setActiveTab('history');
                setShowQuickAdd(false);
            } else {
                MobileHaptics?.error();
                alert(data.error || 'Failed to add price');
            }
        } catch (error) {
            console.error('Error adding quick price:', error);
            MobileHaptics?.error();
            alert('Error adding price');
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (price) => {
        if (userCurrency.preferences) {
            return userCurrency.formatPrice(price);
        }
        return typeof price === 'number' ? `$${price.toFixed(2)}` : '$0.00';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose} />

            {/* Modal */}
            <div
                className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl transition-transform duration-300 ${
                    keyboardOpen ? 'h-screen' : 'max-h-[85vh]'
                }`}
                style={{
                    transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
                }}
            >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-semibold text-gray-900 truncate">💰 {item.name}</h2>
                            <p className="text-sm text-gray-500 truncate">{item.category || 'Price Tracking'}</p>
                        </div>
                        <TouchEnhancedButton
                            onClick={onClose}
                            className="ml-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                            ✕
                        </TouchEnhancedButton>
                    </div>

                    {/* Quick Stats */}
                    {priceStats && priceStats.totalEntries > 0 && (
                        <div className="mt-3 grid grid-cols-3 gap-3">
                            <div className="text-center">
                                <div className="text-lg font-bold text-green-600">${formatPrice(priceStats.lowest)}</div>
                                <div className="text-xs text-gray-500">Lowest</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-bold text-blue-600">${formatPrice(priceStats.average)}</div>
                                <div className="text-xs text-gray-500">Average</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-bold text-gray-600">{priceStats.totalEntries}</div>
                                <div className="text-xs text-gray-500">Entries</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-gray-200 bg-gray-50">
                    <TouchEnhancedButton
                        onClick={() => setActiveTab('add-price')}
                        className={`flex-1 py-3 text-sm font-medium ${
                            activeTab === 'add-price'
                                ? 'text-indigo-600 border-b-2 border-indigo-500 bg-white'
                                : 'text-gray-500'
                        }`}
                    >
                        💰 Add Price
                    </TouchEnhancedButton>
                    <TouchEnhancedButton
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-3 text-sm font-medium ${
                            activeTab === 'history'
                                ? 'text-indigo-600 border-b-2 border-indigo-500 bg-white'
                                : 'text-gray-500'
                        }`}
                    >
                        📊 History ({priceHistory.length})
                    </TouchEnhancedButton>
                    <TouchEnhancedButton
                        onClick={() => setActiveTab('quick')}
                        className={`flex-1 py-3 text-sm font-medium ${
                            activeTab === 'quick'
                                ? 'text-indigo-600 border-b-2 border-indigo-500 bg-white'
                                : 'text-gray-500'
                        }`}
                    >
                        ⚡ Quick
                    </TouchEnhancedButton>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Add Price Tab */}
                    {activeTab === 'add-price' && (
                        <div className="p-4">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Price Input - Large and prominent */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        💵 Price
                                    </label>
                                    <div className="relative">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-lg text-gray-500">
                {userCurrency.preferences?.currencySymbol || '$'}
            </span>
                                        <input
                                            type="number"
                                            step={userCurrency.preferences?.decimalPlaces === 0 ? '1' : '0.01'}
                                            min="0"
                                            required
                                            value={formData.price}
                                            onChange={(e) => setFormData(prev => ({...prev, price: e.target.value}))}
                                            className="pl-8 w-full text-xl font-semibold border-2 border-gray-300 rounded-xl px-4 py-4 focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder={userCurrency.preferences?.decimalPlaces === 0 ? '0' : '0.00'}
                                            inputMode="decimal"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 text-center">
                                        Enter price in {userCurrency.preferences?.currency || 'USD'}
                                    </p>
                                </div>

                                {/* Store Selection - Touch-friendly */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        🏪 Store
                                    </label>
                                    <select
                                        required
                                        value={formData.store}
                                        onChange={(e) => setFormData(prev => ({...prev, store: e.target.value}))}
                                        className="w-full text-lg border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="">Select store</option>
                                        {stores.map(store => (
                                            <option key={store._id} value={store.name}>
                                                {store.name}
                                            </option>
                                        ))}
                                        <option value="Walmart">Walmart</option>
                                        <option value="Target">Target</option>
                                        <option value="Kroger">Kroger</option>
                                        <option value="Costco">Costco</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                {/* Size & Unit - Side by side */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            📦 Size
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.size}
                                            onChange={(e) => setFormData(prev => ({...prev, size: e.target.value}))}
                                            className="w-full border-2 border-gray-300 rounded-xl px-3 py-3 focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="12 oz"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            📏 Unit
                                        </label>
                                        <select
                                            value={formData.unit}
                                            onChange={(e) => setFormData(prev => ({...prev, unit: e.target.value}))}
                                            className="w-full border-2 border-gray-300 rounded-xl px-3 py-3 focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            <option value="">Unit</option>
                                            <option value="oz">oz</option>
                                            <option value="lb">lb</option>
                                            <option value="g">g</option>
                                            <option value="kg">kg</option>
                                            <option value="ml">ml</option>
                                            <option value="l">l</option>
                                            <option value="each">each</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Sale Toggle */}
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                    <div>
                                        <div className="font-medium text-gray-900">🏷️ On Sale</div>
                                        <div className="text-sm text-gray-500">Was this item discounted?</div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.isOnSale}
                                            onChange={(e) => setFormData(prev => ({...prev, isOnSale: e.target.checked}))}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        📝 Notes (Optional)
                                    </label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))}
                                        rows={2}
                                        className="w-full border-2 border-gray-300 rounded-xl px-3 py-3 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Any additional notes..."
                                    />
                                </div>

                                {/* Submit Button */}
                                <div className="pt-4">
                                    <TouchEnhancedButton
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-indigo-600 text-white py-4 px-4 rounded-xl hover:bg-indigo-700 disabled:bg-indigo-400 font-semibold text-lg"
                                    >
                                        {loading ? '💾 Adding...' : '💾 Add Price'}
                                    </TouchEnhancedButton>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* History Tab */}
                    {activeTab === 'history' && (
                        <div className="p-4">
                            {priceHistory.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="text-4xl mb-4">📊</div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No History Yet</h3>
                                    <p className="text-gray-500 mb-4">Add some prices to see trends!</p>
                                    <TouchEnhancedButton
                                        onClick={() => setActiveTab('add-price')}
                                        className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium"
                                    >
                                        Add First Price
                                    </TouchEnhancedButton>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {priceHistory.map((entry, index) => (
                                        <div key={index} className="bg-gray-50 rounded-xl p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center space-x-3">
                                                    <div className="text-xl font-bold text-green-600">
                                                        ${formatPrice(entry.price)}
                                                    </div>
                                                    {entry.isOnSale && (
                                                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                                                            Sale
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {formatDate(entry.date)}
                                                </div>
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                🏪 {entry.store}
                                                {entry.size && entry.unit && (
                                                    <span className="ml-2">📦 {entry.size} {entry.unit}</span>
                                                )}
                                            </div>
                                            {entry.notes && (
                                                <div className="text-sm text-gray-500 mt-2 italic">
                                                    "{entry.notes}"
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Quick Add Tab */}
                    {activeTab === 'quick' && (
                        <div className="p-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">⚡ Quick Price Entry</h3>
                            <p className="text-sm text-gray-600 mb-6">Tap a store to quickly add a common price</p>

                            {/* Common Stores with Price Buttons */}
                            <div className="space-y-4">
                                {['Walmart', 'Target', 'Kroger', 'Costco'].map(store => (
                                    <div key={store} className="bg-gray-50 rounded-xl p-4">
                                        <div className="font-medium text-gray-900 mb-3">🏪 {store}</div>
                                        <div className="grid grid-cols-4 gap-2">
                                            {['1.99', '2.99', '4.99', '9.99'].map(price => (
                                                <TouchEnhancedButton
                                                    key={price}
                                                    onClick={() => handleQuickAdd(parseFloat(price), store)}
                                                    disabled={loading}
                                                    className="bg-white border-2 border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 py-3 px-2 rounded-lg text-sm font-medium"
                                                >
                                                    ${price}
                                                </TouchEnhancedButton>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                                <div className="text-sm text-blue-800">
                                    💡 <strong>Tip:</strong> Quick add is perfect for common grocery prices.
                                    Use the "Add Price" tab for more detailed entries.
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}