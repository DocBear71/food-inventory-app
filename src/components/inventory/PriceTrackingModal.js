'use client';

// file: src/components/inventory/PriceTrackingModal.js v1

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';

export default function PriceTrackingModal({ item, isOpen, onClose, onPriceAdded }) {
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

    useEffect(() => {
        if (isOpen && item) {
            fetchPriceHistory();
            fetchStores();
        }
    }, [isOpen, item]);

    const fetchPriceHistory = async () => {
        try {
            const response = await fetch(`/api/inventory/${item._id}/prices`);
            const data = await response.json();
            if (data.success) {
                setPriceHistory(data.data.priceHistory || []);
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold">Price Tracking: {item.name}</h2>
                        <TouchEnhancedButton
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </TouchEnhancedButton>
                    </div>

                    {/* Add New Price Form */}
                    <form onSubmit={handleSubmit} className="mb-8">
                        <h3 className="text-lg font-medium mb-4">💰 Add New Price</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Price *
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        value={formData.price}
                                        onChange={(e) => setFormData(prev => ({...prev, price: e.target.value}))}
                                        className="pl-6 w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="0.00"
                                    />
                                </div>
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
                                >
                                    <option value="">Select store</option>
                                    {stores.map(store => (
                                        <option key={store._id} value={store.name}>
                                            {store.name} {store.chain && `(${store.chain})`}
                                        </option>
                                    ))}
                                    <option value="other">Other (type below)</option>
                                </select>
                                {formData.store === 'other' && (
                                    <input
                                        type="text"
                                        placeholder="Enter store name"
                                        className="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        onChange={(e) => setFormData(prev => ({...prev, store: e.target.value}))}
                                    />
                                )}
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

                        <div className="flex items-center mb-4">
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
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Sale End Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.saleEndDate}
                                    onChange={(e) => setFormData(prev => ({...prev, saleEndDate: e.target.value}))}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))}
                                rows={2}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Optional notes about this price..."
                            />
                        </div>

                        <TouchEnhancedButton
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400"
                        >
                            {loading ? 'Adding...' : 'Add Price'}
                        </TouchEnhancedButton>
                    </form>

                    {/* Price History */}
                    <div>
                        <h3 className="text-lg font-medium mb-4">📊 Price History</h3>
                        {priceHistory.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No price history yet</p>
                        ) : (
                            <div className="space-y-3 max-h-60 overflow-y-auto">
                                {priceHistory.map((entry, index) => (
                                    <div key={index} className="border rounded-lg p-3 bg-gray-50">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-semibold text-lg">${entry.price.toFixed(2)}</div>
                                                <div className="text-sm text-gray-600">{entry.store}</div>
                                                {entry.size && entry.unit && (
                                                    <div className="text-xs text-gray-500">
                                                        {entry.size} {entry.unit}
                                                        {entry.unitPrice && ` (${(entry.unitPrice).toFixed(2)}/${entry.unit})`}
                                                    </div>
                                                )}
                                                {entry.isOnSale && (
                                                    <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded mt-1">
                                                        On Sale
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-right text-sm text-gray-500">
                                                {new Date(entry.date).toLocaleDateString()}
                                            </div>
                                        </div>
                                        {entry.notes && (
                                            <div className="text-sm text-gray-600 mt-2 italic">
                                                "{entry.notes}"
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}