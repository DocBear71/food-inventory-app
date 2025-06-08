// file: /src/app/inventory/page.js - v6 (Compact Card Layout)

'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import UPCLookup from '@/components/inventory/UPCLookup';
import InventoryConsumption from '@/components/inventory/InventoryConsumption';
import ConsumptionHistory from '@/components/inventory/ConsumptionHistory';
import { redirect } from 'next/navigation';

// Separate component for search params to wrap in Suspense
function InventoryContent() {
    const { data: session, status, update } = useSession();
    const searchParams = useSearchParams();
    const shouldShowAddForm = searchParams.get('action') === 'add';

    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(shouldShowAddForm);
    const [editingItem, setEditingItem] = useState(null);
    const [consumingItem, setConsumingItem] = useState(null);
    const [showConsumptionHistory, setShowConsumptionHistory] = useState(false);

    // 🔧 ENHANCED: Advanced filtering and search
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterLocation, setFilterLocation] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('expiration');
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        category: '',
        quantity: 1,
        unit: 'item',
        location: 'pantry',
        expirationDate: '',
        upc: ''
    });

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/auth/signin');
        }
    }, [status]);

    useEffect(() => {
        if (session) {
            fetchInventory();
        }
    }, [session]);

    const fetchInventory = async () => {
        try {
            const response = await fetch('/api/inventory');
            const data = await response.json();

            if (data.success) {
                setInventory(data.inventory);
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    // Handle consumption of items
    const handleConsumption = async (consumptionData, mode = 'single') => {
        try {
            const response = await fetch('/api/inventory/consume', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    consumptions: consumptionData,
                    mode: mode
                }),
            });

            const result = await response.json();

            if (result.success) {
                // Refresh inventory
                await fetchInventory();

                // Show success message
                const { summary } = result;
                let message = 'Inventory updated successfully!';

                if (summary.itemsRemoved.length > 0) {
                    message += ` Removed: ${summary.itemsRemoved.join(', ')}.`;
                }
                if (summary.itemsUpdated.length > 0) {
                    message += ` Updated quantities for ${summary.itemsUpdated.length} items.`;
                }

                alert(message);
            } else {
                throw new Error(result.error || 'Failed to update inventory');
            }
        } catch (error) {
            console.error('Error consuming items:', error);
            alert('Error updating inventory: ' + error.message);
            throw error;
        }
    };

    // Get expiration status for an item
    const getExpirationStatus = (expirationDate) => {
        if (!expirationDate) return { status: 'no-date', color: 'gray', bgColor: 'bg-gray-50', textColor: 'text-gray-600', label: 'No expiration date' };

        const expDate = new Date(expirationDate);
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const expDateStart = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
        const daysUntil = Math.ceil((expDateStart - todayStart) / (1000 * 60 * 60 * 24));

        if (daysUntil < 0) {
            return {
                status: 'expired',
                color: 'red',
                bgColor: 'bg-red-50',
                textColor: 'text-red-600',
                label: `Expired ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} ago`,
                icon: '🚨'
            };
        } else if (daysUntil === 0) {
            return {
                status: 'expires-today',
                color: 'orange',
                bgColor: 'bg-orange-50',
                textColor: 'text-orange-600',
                label: 'Expires today',
                icon: '⚠️'
            };
        } else if (daysUntil <= 3) {
            return {
                status: 'expires-soon',
                color: 'orange',
                bgColor: 'bg-orange-50',
                textColor: 'text-orange-600',
                label: `Expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
                icon: '⏰'
            };
        } else if (daysUntil <= 7) {
            return {
                status: 'expires-week',
                color: 'yellow',
                bgColor: 'bg-yellow-50',
                textColor: 'text-yellow-600',
                label: `Expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
                icon: '📅'
            };
        } else {
            return {
                status: 'fresh',
                color: 'green',
                bgColor: 'bg-green-50',
                textColor: 'text-green-600',
                label: `Fresh (${daysUntil} days left)`,
                icon: '✅'
            };
        }
    };

    // 🔧 ENHANCED: Advanced filter and sort inventory with search
    const getFilteredAndSortedInventory = () => {
        let filtered = [...inventory];

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(query) ||
                (item.brand && item.brand.toLowerCase().includes(query)) ||
                (item.category && item.category.toLowerCase().includes(query)) ||
                (item.upc && item.upc.includes(query))
            );
        }

        // Apply status filter
        if (filterStatus !== 'all') {
            filtered = filtered.filter(item => {
                const status = getExpirationStatus(item.expirationDate);
                switch (filterStatus) {
                    case 'expired':
                        return status.status === 'expired';
                    case 'expiring':
                        return ['expires-today', 'expires-soon', 'expires-week'].includes(status.status);
                    case 'fresh':
                        return status.status === 'fresh' || status.status === 'no-date';
                    default:
                        return true;
                }
            });
        }

        // Apply location filter
        if (filterLocation !== 'all') {
            filtered = filtered.filter(item => item.location === filterLocation);
        }

        // Apply category filter
        if (filterCategory !== 'all') {
            filtered = filtered.filter(item =>
                filterCategory === 'uncategorized'
                    ? (!item.category || item.category === '')
                    : item.category === filterCategory
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'expiration':
                    if (!a.expirationDate && !b.expirationDate) return 0;
                    if (!a.expirationDate) return 1;
                    if (!b.expirationDate) return -1;

                    const aStatus = getExpirationStatus(a.expirationDate);
                    const bStatus = getExpirationStatus(b.expirationDate);

                    const priorityOrder = ['expired', 'expires-today', 'expires-soon', 'expires-week', 'fresh', 'no-date'];
                    const aPriority = priorityOrder.indexOf(aStatus.status);
                    const bPriority = priorityOrder.indexOf(bStatus.status);

                    if (aPriority !== bPriority) {
                        return aPriority - bPriority;
                    }

                    return new Date(a.expirationDate) - new Date(b.expirationDate);

                case 'name':
                    return a.name.localeCompare(b.name);
                case 'category':
                    return (a.category || 'Other').localeCompare(b.category || 'Other');
                case 'location':
                    return a.location.localeCompare(b.location);
                case 'quantity':
                    return b.quantity - a.quantity; // Highest quantity first
                case 'date-added':
                    return new Date(b.addedDate || 0) - new Date(a.addedDate || 0); // Newest first
                default:
                    return 0;
            }
        });

        return filtered;
    };

    // 🔧 NEW: Get unique values for filter dropdowns
    const getUniqueLocations = () => {
        const locations = [...new Set(inventory.map(item => item.location))].sort();
        return locations;
    };

    const getUniqueCategories = () => {
        const categories = [...new Set(inventory.map(item => item.category || '').filter(Boolean))].sort();
        return categories;
    };

    // 🔧 NEW: Clear all filters
    const clearAllFilters = () => {
        setSearchQuery('');
        setFilterStatus('all');
        setFilterLocation('all');
        setFilterCategory('all');
        setSortBy('expiration');
    };

    // 🔧 NEW: Quick filter presets
    const applyQuickFilter = (type) => {
        clearAllFilters();
        switch (type) {
            case 'expired':
                setFilterStatus('expired');
                break;
            case 'expiring-soon':
                setFilterStatus('expiring');
                break;
            case 'pantry':
                setFilterLocation('pantry');
                break;
            case 'fridge':
                setFilterLocation('fridge');
                break;
            case 'freezer':
                setFilterLocation('freezer');
                break;
            default:
                break;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (!session?.user?.id) {
            alert('Session expired. Please sign in again.');
            setLoading(false);
            return;
        }

        try {
            const url = '/api/inventory';
            const method = editingItem ? 'PUT' : 'POST';
            const body = editingItem
                ? { itemId: editingItem._id, ...formData }
                : formData;

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'credentials': 'include'
                },
                credentials: 'include',
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (data.success) {
                await fetchInventory();
                setFormData({
                    name: '',
                    brand: '',
                    category: '',
                    quantity: 1,
                    unit: 'item',
                    location: 'pantry',
                    expirationDate: '',
                    upc: ''
                });
                setShowAddForm(false);
                setEditingItem(null);
            } else {
                if (response.status === 401) {
                    alert('Session expired. Please refresh the page and sign in again.');
                } else {
                    alert(data.error || 'Failed to save item');
                }
            }
        } catch (error) {
            console.error('Error saving item:', error);
            alert('Error saving item');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            brand: item.brand || '',
            category: item.category || '',
            quantity: item.quantity,
            unit: item.unit,
            location: item.location,
            expirationDate: item.expirationDate ? item.expirationDate.split('T')[0] : '',
            upc: item.upc || ''
        });
        setShowAddForm(true);
    };

    const handleDelete = async (itemId) => {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            const response = await fetch(`/api/inventory?itemId=${itemId}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                await fetchInventory();
            } else {
                alert(data.error || 'Failed to delete item');
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Error deleting item');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleProductFound = (product) => {
        setFormData(prev => ({
            ...prev,
            name: product.name || prev.name,
            brand: product.brand || prev.brand,
            category: product.category || prev.category,
            upc: product.upc || prev.upc
        }));
    };

    const handleUPCChange = (upc) => {
        setFormData(prev => ({
            ...prev,
            upc
        }));
    };

    const resetForm = () => {
        setFormData({
            name: '',
            brand: '',
            category: '',
            quantity: 1,
            unit: 'item',
            location: 'pantry',
            expirationDate: '',
            upc: ''
        });
        setShowAddForm(false);
        setEditingItem(null);
    };

    // Handle bulk consumption for expired items
    const handleBulkConsumeExpired = () => {
        const expiredItems = inventory.filter(item => {
            const status = getExpirationStatus(item.expirationDate);
            return status.status === 'expired';
        });

        if (expiredItems.length === 0) {
            alert('No expired items found');
            return;
        }

        if (confirm(`Remove ${expiredItems.length} expired items from inventory?`)) {
            const consumptions = expiredItems.map(item => ({
                itemId: item._id,
                reason: 'expired',
                quantity: item.quantity,
                unit: item.unit,
                notes: 'Bulk removal of expired items',
                removeCompletely: true
            }));

            Promise.all(consumptions.map(consumption =>
                handleConsumption(consumption, 'single')
            )).then(() => {
                alert(`Successfully removed ${expiredItems.length} expired items`);
            }).catch(error => {
                console.error('Error removing expired items:', error);
            });
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

    const filteredInventory = getFilteredAndSortedInventory();
    const expiredCount = inventory.filter(item => getExpirationStatus(item.expirationDate).status === 'expired').length;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">Food Inventory</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowConsumptionHistory(true)}
                            className="inline-flex items-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-md shadow-sm text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            📊 View History
                        </button>
                        {expiredCount > 0 && (
                            <button
                                onClick={handleBulkConsumeExpired}
                                className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md shadow-sm text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                🗑️ Remove {expiredCount} Expired
                            </button>
                        )}
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            {showAddForm ? 'Cancel' : 'Add Item'}
                        </button>
                    </div>
                </div>

                {/* 🔧 ENHANCED: Advanced Search and Filtering */}
                <div className="bg-white shadow rounded-lg p-4 space-y-4">
                    {/* Search Bar */}
                    <div>
                        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                            🔍 Search Inventory
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                id="search"
                                placeholder="Search by name, brand, category, or UPC..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-400">🔍</span>
                            </div>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Quick Filter Buttons */}
                    <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">⚡ Quick Filters</div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => applyQuickFilter('expired')}
                                className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full hover:bg-red-200 border border-red-300"
                            >
                                🚨 Expired
                            </button>
                            <button
                                onClick={() => applyQuickFilter('expiring-soon')}
                                className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200 border border-orange-300"
                            >
                                ⏰ Expiring Soon
                            </button>
                            <button
                                onClick={() => applyQuickFilter('pantry')}
                                className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full hover:bg-yellow-200 border border-yellow-300"
                            >
                                🏠 Pantry
                            </button>
                            <button
                                onClick={() => applyQuickFilter('fridge')}
                                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 border border-blue-300"
                            >
                                ❄️ Fridge
                            </button>
                            <button
                                onClick={() => applyQuickFilter('freezer')}
                                className="px-3 py-1 text-xs bg-cyan-100 text-cyan-700 rounded-full hover:bg-cyan-200 border border-cyan-300"
                            >
                                🧊 Freezer
                            </button>
                            <button
                                onClick={clearAllFilters}
                                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 border border-gray-300"
                            >
                                🔄 Clear All
                            </button>
                        </div>
                    </div>

                    {/* Advanced Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">📊 Status</label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                <option value="all">All Items ({inventory.length})</option>
                                <option value="expired">Expired ({inventory.filter(item => getExpirationStatus(item.expirationDate).status === 'expired').length})</option>
                                <option value="expiring">Expiring Soon ({inventory.filter(item => ['expires-today', 'expires-soon', 'expires-week'].includes(getExpirationStatus(item.expirationDate).status)).length})</option>
                                <option value="fresh">Fresh ({inventory.filter(item => ['fresh', 'no-date'].includes(getExpirationStatus(item.expirationDate).status)).length})</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">📍 Location</label>
                            <select
                                value={filterLocation}
                                onChange={(e) => setFilterLocation(e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                <option value="all">All Locations</option>
                                {getUniqueLocations().map(location => (
                                    <option key={location} value={location}>
                                        {location.charAt(0).toUpperCase() + location.slice(1)} ({inventory.filter(item => item.location === location).length})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">🏷️ Category</label>
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                <option value="all">All Categories</option>
                                {getUniqueCategories().map(category => (
                                    <option key={category} value={category}>
                                        {category} ({inventory.filter(item => item.category === category).length})
                                    </option>
                                ))}
                                {inventory.filter(item => !item.category || item.category === '').length > 0 && (
                                    <option value="uncategorized">
                                        Uncategorized ({inventory.filter(item => !item.category || item.category === '').length})
                                    </option>
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">⚡ Sort by</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                <option value="expiration">📅 Expiration Date</option>
                                <option value="name">🔤 Name (A-Z)</option>
                                <option value="category">🏷️ Category</option>
                                <option value="location">📍 Location</option>
                                <option value="quantity">📊 Quantity (High-Low)</option>
                                <option value="date-added">📅 Date Added (Newest)</option>
                            </select>
                        </div>
                    </div>

                    {/* Active Filters Display */}
                    {(searchQuery || filterStatus !== 'all' || filterLocation !== 'all' || filterCategory !== 'all') && (
                        <div className="border-t pt-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium text-gray-600">Active filters:</span>

                                {searchQuery && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                        Search: "{searchQuery}"
                                        <button onClick={() => setSearchQuery('')} className="ml-1 text-indigo-600 hover:text-indigo-800">✕</button>
                                    </span>
                                )}

                                {filterStatus !== 'all' && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        Status: {filterStatus}
                                        <button onClick={() => setFilterStatus('all')} className="ml-1 text-blue-600 hover:text-blue-800">✕</button>
                                    </span>
                                )}

                                {filterLocation !== 'all' && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Location: {filterLocation}
                                        <button onClick={() => setFilterLocation('all')} className="ml-1 text-green-600 hover:text-green-800">✕</button>
                                    </span>
                                )}

                                {filterCategory !== 'all' && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                        Category: {filterCategory}
                                        <button onClick={() => setFilterCategory('all')} className="ml-1 text-purple-600 hover:text-purple-800">✕</button>
                                    </span>
                                )}

                                <button
                                    onClick={clearAllFilters}
                                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                                >
                                    Clear all
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Results Summary */}
                    <div className="text-sm text-gray-500 border-t pt-3">
                        Showing <span className="font-semibold text-gray-900">{filteredInventory.length}</span> of <span className="font-semibold text-gray-900">{inventory.length}</span> items
                        {searchQuery && (
                            <span> matching "{searchQuery}"</span>
                        )}
                    </div>
                </div>

                {/* 🔧 FIXED: Add/Edit Form - This was missing! */}
                {showAddForm && (
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                {editingItem ? 'Edit Item' : 'Add New Item'}
                            </h3>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* UPC Lookup Section */}
                                <UPCLookup
                                    onProductFound={handleProductFound}
                                    onUPCChange={handleUPCChange}
                                    currentUPC={formData.upc}
                                />

                                {/* Divider */}
                                <div className="border-t border-gray-200 pt-6">
                                    <h4 className="text-md font-medium text-gray-900 mb-4">
                                        Item Details
                                    </h4>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                            Item Name *
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="brand" className="block text-sm font-medium text-gray-700">
                                            Brand
                                        </label>
                                        <input
                                            type="text"
                                            id="brand"
                                            name="brand"
                                            value={formData.brand}
                                            onChange={handleChange}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                                            Category
                                        </label>
                                        <select
                                            id="category"
                                            name="category"
                                            value={formData.category}
                                            onChange={handleChange}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        >
                                            <option value="">Select category</option>
                                            <option value="Fresh Vegetables">Fresh Vegetables</option>
                                            <option value="Fresh Fruits">Fresh Fruits</option>
                                            <option value="Fresh Spices">Fresh Spices</option>
                                            <option value="Dairy">Dairy</option>
                                            <option value="Cheese">Cheese</option>
                                            <option value="Eggs">Eggs</option>
                                            <option value="Fresh/Frozen Poultry">Fresh/Frozen Poultry</option>
                                            <option value="Fresh/Frozen Beef">Fresh/Frozen Beef</option>
                                            <option value="Fresh/Frozen Pork">Fresh/Frozen Pork</option>
                                            <option value="Fresh/Frozen Lamb">Fresh/Frozen Lamb</option>
                                            <option value="Fresh/Frozen Rabbit">Fresh/Frozen Rabbit</option>
                                            <option value="Fresh/Frozen Venison">Fresh/Frozen Venison</option>
                                            <option value="Fresh/Frozen Fish & Seafood">Fresh/Frozen Fish & Seafood</option>
                                            <option value="Beans">Beans</option>
                                            <option value="Canned Meat">Canned Meat</option>
                                            <option value="Canned Vegetables">Canned Vegetables</option>
                                            <option value="Canned Fruit">Canned Fruit</option>
                                            <option value="Canned Sauces">Canned Sauces</option>
                                            <option value="Canned Tomatoes">Canned Tomatoes</option>
                                            <option value="Canned Beans">Canned Beans</option>
                                            <option value="Canned Meals">Canned Meals</option>
                                            <option value="Frozen Vegetables">Frozen Vegetables</option>
                                            <option value="Frozen Fruit">Frozen Fruit</option>
                                            <option value="Grains">Grains</option>
                                            <option value="Boxed Meals">Boxed Meals</option>
                                            <option value="Seasonings">Seasonings</option>
                                            <option value="Spices">Spices</option>
                                            <option value="Bouillon">Bouillon</option>
                                            <option value="Stock/Broth">Stock/Broth</option>
                                            <option value="Beverages">Beverages</option>
                                            <option value="Snacks">Snacks</option>
                                            <option value="Condiments">Condiments</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                                            Storage Location
                                        </label>
                                        <select
                                            id="location"
                                            name="location"
                                            value={formData.location}
                                            onChange={handleChange}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        >
                                            <option value="pantry">Pantry</option>
                                            <option value="fridge">Refrigerator</option>
                                            <option value="freezer">Freezer</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                                            Quantity
                                        </label>
                                        <input
                                            type="number"
                                            id="quantity"
                                            name="quantity"
                                            min="0"
                                            step="0.1"
                                            value={formData.quantity}
                                            onChange={handleChange}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
                                            Unit
                                        </label>
                                        <select
                                            id="unit"
                                            name="unit"
                                            value={formData.unit}
                                            onChange={handleChange}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        >
                                            <option value="item">Item(s)</option>
                                            <option value="lbs">Pounds</option>
                                            <option value="oz">Ounces</option>
                                            <option value="kg">Kilograms</option>
                                            <option value="g">Grams</option>
                                            <option value="cup">Cup(s)</option>
                                            <option value="tbsp">Tablespoon(s)</option>
                                            <option value="tsp">Teaspoon(s)</option>
                                            <option value="ml">Milliliters</option>
                                            <option value="l">Liters</option>
                                            <option value="can">Can(s)</option>
                                            <option value="package">Package(s)</option>
                                        </select>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label htmlFor="expirationDate" className="block text-sm font-medium text-gray-700">
                                            Expiration Date
                                            <span className="text-sm text-gray-500 ml-1">(Important for tracking freshness)</span>
                                        </label>
                                        <input
                                            type="date"
                                            id="expirationDate"
                                            name="expirationDate"
                                            value={formData.expirationDate}
                                            onChange={handleChange}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">
                                            Setting expiration dates helps track freshness and prevents food waste
                                        </p>
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                                    >
                                        {loading ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* 🔧 NEW: COMPACT CARD LAYOUT - Good for both mobile and desktop */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                            Current Inventory ({filteredInventory.length} items)
                        </h3>

                        {loading ? (
                            <div className="text-center py-8">
                                <div className="text-gray-500">Loading inventory...</div>
                            </div>
                        ) : filteredInventory.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="text-gray-500 mb-4">
                                    {inventory.length === 0 ? 'No items in your inventory yet' : 'No items match your filters'}
                                </div>
                                {inventory.length === 0 && (
                                    <button
                                        onClick={() => setShowAddForm(true)}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
                                    >
                                        Add your first item
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                {/* 🔧 NEW: COMPACT GRID LAYOUT - Works on all screen sizes */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {filteredInventory.map((item) => {
                                        const expirationInfo = getExpirationStatus(item.expirationDate);

                                        return (
                                            <div
                                                key={item._id}
                                                className={`border rounded-lg p-4 ${expirationInfo.bgColor} hover:shadow-md transition-shadow relative`}
                                                style={{
                                                    borderLeftColor: expirationInfo.color === 'red' ? '#ef4444' :
                                                        expirationInfo.color === 'orange' ? '#f97316' :
                                                            expirationInfo.color === 'yellow' ? '#eab308' :
                                                                expirationInfo.color === 'green' ? '#22c55e' : '#6b7280',
                                                    borderLeftWidth: '4px'
                                                }}
                                            >
                                                {/* Status Icon - Top Right */}
                                                <div className="absolute top-2 right-2 text-lg">
                                                    {expirationInfo.icon || '📦'}
                                                </div>

                                                {/* Item Name and Brand */}
                                                <div className="mb-3 pr-8">
                                                    <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-1">
                                                        {item.name}
                                                    </h4>
                                                    {item.brand && (
                                                        <p className="text-xs text-gray-600">{item.brand}</p>
                                                    )}
                                                </div>

                                                {/* Quantity and Location Row */}
                                                <div className="flex justify-between items-center mb-3">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {item.quantity} {item.unit}
                                                    </div>
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                                                        {item.location}
                                                    </span>
                                                </div>

                                                {/* Category */}
                                                <div className="text-xs text-gray-500 mb-3">
                                                    {item.category || 'No category'}
                                                </div>

                                                {/* Expiration Status */}
                                                <div className={`text-xs font-medium ${expirationInfo.textColor} mb-3`}>
                                                    {item.expirationDate ? (
                                                        <div>
                                                            <div>{new Date(item.expirationDate).toLocaleDateString()}</div>
                                                            <div>{expirationInfo.label}</div>
                                                        </div>
                                                    ) : (
                                                        'No expiration set'
                                                    )}
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => setConsumingItem(item)}
                                                        className="flex-1 bg-blue-50 text-blue-700 text-xs font-medium py-1.5 px-2 rounded hover:bg-blue-100 border border-blue-200"
                                                        title="Use/Consume Item"
                                                    >
                                                        📦 Use
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        className="flex-1 bg-indigo-50 text-indigo-700 text-xs font-medium py-1.5 px-2 rounded hover:bg-indigo-100 border border-indigo-200"
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item._id)}
                                                        className="bg-red-50 text-red-700 text-xs font-medium py-1.5 px-2 rounded hover:bg-red-100 border border-red-200"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Consumption Modal */}
                {consumingItem && (
                    <InventoryConsumption
                        item={consumingItem}
                        onConsume={handleConsumption}
                        onClose={() => setConsumingItem(null)}
                        mode="single"
                    />
                )}

                {/* Consumption History Modal */}
                {showConsumptionHistory && (
                    <ConsumptionHistory
                        onClose={() => setShowConsumptionHistory(false)}
                    />
                )}
            </div>
        </DashboardLayout>
    );
}

// Main component wrapped with Suspense
export default function Inventory() {
    return (
        <Suspense fallback={
            <DashboardLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-lg">Loading...</div>
                </div>
            </DashboardLayout>
        }>
            <InventoryContent />
        </Suspense>
    );
}