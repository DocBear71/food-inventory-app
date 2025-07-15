'use client';
// file: /src/components/inventory/AdvancedPriceSearch.js - Advanced price-based filtering

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';

export default function AdvancedPriceSearch({ onFiltersChange, inventory }) {
    const [filters, setFilters] = useState({
        priceRange: { min: '', max: '' },
        priceStatus: 'all', // all, tracked, untracked, good-deals, expensive
        storeFilter: 'all',
        sortBy: 'price-asc' // price-asc, price-desc, savings-desc, last-updated
    });

    const [priceStats, setPriceStats] = useState({
        minPrice: 0,
        maxPrice: 0,
        averagePrice: 0,
        trackedItems: 0
    });

    useEffect(() => {
        calculatePriceStats();
    }, [inventory]);

    useEffect(() => {
        onFiltersChange?.(filters);
    }, [filters]);

    const calculatePriceStats = () => {
        const itemsWithPrices = inventory.filter(item =>
            item.currentBestPrice?.price || item.averagePrice
        );

        if (itemsWithPrices.length === 0) {
            setPriceStats({ minPrice: 0, maxPrice: 0, averagePrice: 0, trackedItems: 0 });
            return;
        }

        const prices = itemsWithPrices.map(item =>
            item.currentBestPrice?.price || item.averagePrice || 0
        );

        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;

        setPriceStats({
            minPrice: Math.floor(minPrice * 100) / 100,
            maxPrice: Math.ceil(maxPrice * 100) / 100,
            averagePrice: Math.round(averagePrice * 100) / 100,
            trackedItems: itemsWithPrices.length
        });
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleRangeChange = (type, value) => {
        setFilters(prev => ({
            ...prev,
            priceRange: {
                ...prev.priceRange,
                [type]: value
            }
        }));
    };

    const clearFilters = () => {
        setFilters({
            priceRange: { min: '', max: '' },
            priceStatus: 'all',
            storeFilter: 'all',
            sortBy: 'price-asc'
        });
    };

    const getStoreOptions = () => {
        const stores = new Set();
        inventory.forEach(item => {
            if (item.currentBestPrice?.store) {
                stores.add(item.currentBestPrice.store);
            }
            if (item.priceHistory) {
                item.priceHistory.forEach(price => stores.add(price.store));
            }
        });
        return Array.from(stores).sort();
    };

    const applyQuickFilter = (type) => {
        switch (type) {
            case 'good-deals':
                setFilters(prev => ({
                    ...prev,
                    priceStatus: 'good-deals',
                    sortBy: 'savings-desc'
                }));
                break;
            case 'expensive':
                setFilters(prev => ({
                    ...prev,
                    priceRange: { min: priceStats.averagePrice.toString(), max: '' },
                    sortBy: 'price-desc'
                }));
                break;
            case 'budget':
                setFilters(prev => ({
                    ...prev,
                    priceRange: { min: '', max: priceStats.averagePrice.toString() },
                    sortBy: 'price-asc'
                }));
                break;
            case 'recent':
                setFilters(prev => ({
                    ...prev,
                    sortBy: 'last-updated'
                }));
                break;
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">💰 Price Filters</h3>
                <TouchEnhancedButton
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:text-blue-800"
                >
                    Clear All
                </TouchEnhancedButton>
            </div>

            {/* Price Statistics */}
            {priceStats.trackedItems > 0 && (
                <div className="bg-blue-50 rounded-lg p-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                        <div>
                            <div className="text-lg font-bold text-blue-600">{priceStats.trackedItems}</div>
                            <div className="text-xs text-blue-700">Items Tracked</div>
                        </div>
                        <div>
                            <div className="text-lg font-bold text-green-600">${priceStats.minPrice}</div>
                            <div className="text-xs text-green-700">Cheapest</div>
                        </div>
                        <div>
                            <div className="text-lg font-bold text-gray-600">${priceStats.averagePrice}</div>
                            <div className="text-xs text-gray-700">Average</div>
                        </div>
                        <div>
                            <div className="text-lg font-bold text-red-600">${priceStats.maxPrice}</div>
                            <div className="text-xs text-red-700">Most Expensive</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Filter Buttons */}
            <div>
                <div className="text-sm font-medium text-gray-700 mb-2">⚡ Quick Filters</div>
                <div className="flex flex-wrap gap-2">
                    <TouchEnhancedButton
                        onClick={() => applyQuickFilter('good-deals')}
                        className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 border border-green-300"
                    >
                        🎯 Good Deals
                    </TouchEnhancedButton>
                    <TouchEnhancedButton
                        onClick={() => applyQuickFilter('budget')}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 border border-blue-300"
                    >
                        💵 Budget Items
                    </TouchEnhancedButton>
                    <TouchEnhancedButton
                        onClick={() => applyQuickFilter('expensive')}
                        className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full hover:bg-red-200 border border-red-300"
                    >
                        💎 Premium Items
                    </TouchEnhancedButton>
                    <TouchEnhancedButton
                        onClick={() => applyQuickFilter('recent')}
                        className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 border border-purple-300"
                    >
                        🕒 Recently Updated
                    </TouchEnhancedButton>
                </div>
            </div>

            {/* Advanced Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Price Range */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        💰 Price Range
                    </label>
                    <div className="flex space-x-2">
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Min"
                            value={filters.priceRange.min}
                            onChange={(e) => handleRangeChange('min', e.target.value)}
                            className="w-1/2 border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Max"
                            value={filters.priceRange.max}
                            onChange={(e) => handleRangeChange('max', e.target.value)}
                            className="w-1/2 border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                </div>

                {/* Price Status */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        📊 Price Status
                    </label>
                    <select
                        value={filters.priceStatus}
                        onChange={(e) => handleFilterChange('priceStatus', e.target.value)}
                        className="w-full border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="all">All Items</option>
                        <option value="tracked">Price Tracked</option>
                        <option value="untracked">No Price Data</option>
                        <option value="good-deals">Good Deals (Below Avg)</option>
                        <option value="expensive">Above Average Price</option>
                    </select>
                </div>

                {/* Store Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        🏪 Store
                    </label>
                    <select
                        value={filters.storeFilter}
                        onChange={(e) => handleFilterChange('storeFilter', e.target.value)}
                        className="w-full border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="all">All Stores</option>
                        {getStoreOptions().map(store => (
                            <option key={store} value={store}>{store}</option>
                        ))}
                    </select>
                </div>

                {/* Sort By */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        🔃 Sort By
                    </label>
                    <select
                        value={filters.sortBy}
                        onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                        className="w-full border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="price-asc">💰 Price: Low to High</option>
                        <option value="price-desc">💰 Price: High to Low</option>
                        <option value="savings-desc">🎯 Best Deals First</option>
                        <option value="last-updated">🕒 Recently Updated</option>
                        <option value="name">🔤 Name (A-Z)</option>
                    </select>
                </div>
            </div>

            {/* Active Filters Summary */}
            {(filters.priceRange.min || filters.priceRange.max ||
                filters.priceStatus !== 'all' || filters.storeFilter !== 'all') && (
                <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm font-medium text-gray-700 mb-2">Active Filters:</div>
                    <div className="flex flex-wrap gap-2 text-xs">
                        {filters.priceRange.min && (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                Min: ${filters.priceRange.min}
                            </span>
                        )}
                        {filters.priceRange.max && (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                Max: ${filters.priceRange.max}
                            </span>
                        )}
                        {filters.priceStatus !== 'all' && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                                {filters.priceStatus.replace('-', ' ')}
                            </span>
                        )}
                        {filters.storeFilter !== 'all' && (
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                Store: {filters.storeFilter}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
