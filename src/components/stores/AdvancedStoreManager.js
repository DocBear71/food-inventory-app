// file: /src/components/stores/AdvancedStoreManager.js - Community-driven store management for Doc Bear's
'use client';

import { useState, useEffect } from 'react';
import { useSafeSession } from '@/hooks/useSafeSession';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { MobileHaptics } from '@/components/mobile/MobileHaptics';
import {apiPost} from "@/lib/api-config.js";
import KeyboardOptimizedInput from '@/components/forms/KeyboardOptimizedInput';

export default function AdvancedStoreManager() {
    const { data: session } = useSafeSession();
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterChain, setFilterChain] = useState('all');
    const [view, setView] = useState('grid'); // 'grid' or 'list'
    const [showAddStore, setShowAddStore] = useState(false);

    // Load stores
    useEffect(() => {
        loadStores();
    }, []);

    const loadStores = async () => {
        try {
            const response = await fetch('/api/stores/community');
            const data = await response.json();
            if (data.success) {
                setStores(data.stores || []);
            }
        } catch (error) {
            console.error('Failed to load stores:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter stores
    const filteredStores = stores.filter(store => {
        const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            store.address?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesChain = filterChain === 'all' || store.chain === filterChain;
        return matchesSearch && matchesChain;
    });

    // Get unique chains
    const chains = [...new Set(stores.map(store => store.chain).filter(Boolean))];

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">🏪 My Stores</h1>
                <p className="text-gray-600">
                    Manage your favorite stores and contribute to the Doc Bear community
                </p>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    {/* Search and Filter */}
                    <div className="flex flex-col sm:flex-row gap-3 flex-1">
                        <div className="relative flex-1 max-w-sm">
                            <input
                                type="text"
                                placeholder="Search stores..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-400">🔍</span>
                            </div>
                        </div>

                        <select
                            value={filterChain}
                            onChange={(e) => setFilterChain(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="all">All Chains</option>
                            {chains.map(chain => (
                                <option key={chain} value={chain}>{chain}</option>
                            ))}
                        </select>
                    </div>

                    {/* View Toggle and Add Button */}
                    <div className="flex items-center gap-3">
                        <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                            <TouchEnhancedButton
                                onClick={() => setView('grid')}
                                className={`px-3 py-2 text-sm ${
                                    view === 'grid'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <span className="mr-1">⊞</span> Grid
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={() => setView('list')}
                                className={`px-3 py-2 text-sm border-l ${
                                    view === 'list'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <span className="mr-1">☰</span> List
                            </TouchEnhancedButton>
                        </div>

                        <TouchEnhancedButton
                            onClick={() => setShowAddStore(true)}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                        >
                            <span>➕</span> Add Store
                        </TouchEnhancedButton>
                    </div>
                </div>
            </div>

            {/* Stores Display */}
            {filteredStores.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">🏪</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No stores found</h3>
                    <p className="text-gray-500 mb-4">
                        {searchTerm || filterChain !== 'all'
                            ? 'Try adjusting your search or filter criteria'
                            : 'Add your first store to get started'
                        }
                    </p>
                    <TouchEnhancedButton
                        onClick={() => setShowAddStore(true)}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700"
                    >
                        Add Your First Store
                    </TouchEnhancedButton>
                </div>
            ) : view === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredStores.map(store => (
                        <StoreCard key={store._id} store={store} onUpdate={loadStores} />
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredStores.map(store => (
                        <StoreListItem key={store._id} store={store} onUpdate={loadStores} />
                    ))}
                </div>
            )}

            {/* Add Store Modal */}
            {showAddStore && (
                <AddStoreModal
                    isOpen={showAddStore}
                    onClose={() => setShowAddStore(false)}
                    onSuccess={() => {
                        setShowAddStore(false);
                        loadStores();
                    }}
                />
            )}
        </div>
    );
}

// Store Card Component
function StoreCard({ store, onUpdate }) {
    const [showDetails, setShowDetails] = useState(false);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            {/* Store Header */}
            <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {store.name}
                        </h3>
                        <p className="text-sm text-gray-500">{store.chain}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                        <CommunityRating rating={store.communityRating} />
                        <StoreStatusBadge store={store} />
                    </div>
                </div>
            </div>

            {/* Store Info */}
            <div className="p-4">
                <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-600">
                        <span className="mr-2">📍</span>
                        <span className="truncate">{store.address}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                        <span className="mr-2">🕒</span>
                        <span>{store.hours || 'Hours not available'}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                        <span className="mr-2">📞</span>
                        <span>{store.phone || 'Phone not available'}</span>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                    <span>Layout: {store.hasCustomLayout ? '✅ Custom' : '📋 Standard'}</span>
                    <span>Reviews: {store.reviewCount || 0}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="p-4 pt-0">
                <div className="flex gap-2">
                    <TouchEnhancedButton
                        onClick={() => setShowDetails(true)}
                        className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 text-sm font-medium"
                    >
                        View Details
                    </TouchEnhancedButton>
                    <TouchEnhancedButton
                        onClick={() => {/* Navigate to AI shopping with this store */}}
                        className="flex-1 bg-indigo-600 text-white py-2 px-3 rounded-lg hover:bg-indigo-700 text-sm font-medium"
                    >
                        🤖 AI Shop
                    </TouchEnhancedButton>
                </div>
            </div>

            {/* Store Details Modal */}
            {showDetails && (
                <StoreDetailsModal
                    store={store}
                    onClose={() => setShowDetails(false)}
                    onUpdate={onUpdate}
                />
            )}
        </div>
    );
}

// Store List Item Component
function StoreListItem({ store, onUpdate }) {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {store.name}
                            </h3>
                            <p className="text-sm text-gray-500">{store.chain} • {store.address}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <CommunityRating rating={store.communityRating} />
                            <StoreStatusBadge store={store} />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                    <TouchEnhancedButton
                        className="bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 text-sm"
                    >
                        Details
                    </TouchEnhancedButton>
                    <TouchEnhancedButton
                        className="bg-indigo-600 text-white py-2 px-3 rounded-lg hover:bg-indigo-700 text-sm"
                    >
                        🤖 AI Shop
                    </TouchEnhancedButton>
                </div>
            </div>
        </div>
    );
}

// Community Rating Component
function CommunityRating({ rating }) {
    const stars = Math.round(rating || 0);
    return (
        <div className="flex items-center gap-1 text-sm">
            <span className="text-yellow-500">{'⭐'.repeat(stars)}</span>
            <span className="text-gray-500">({rating?.toFixed(1) || 'New'})</span>
        </div>
    );
}

// Store Status Badge
function StoreStatusBadge({ store }) {
    const getStatus = () => {
        const now = new Date();
        const hour = now.getHours();

        // Simple status logic - in real app, use store hours
        if (hour >= 6 && hour <= 22) {
            return { text: 'Open', color: 'bg-green-100 text-green-800' };
        } else {
            return { text: 'Closed', color: 'bg-red-100 text-red-800' };
        }
    };

    const status = getStatus();

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
      {status.text}
    </span>
    );
}

// Add Store Modal Component
function AddStoreModal({ isOpen, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        name: '',
        chain: '',
        address: '',
        phone: '',
        hours: '',
        website: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        MobileHaptics?.medium();

        try {
            const response = await apiPost('/api/stores', {
                formData
            });

            const data = await response.json();
            if (data.success) {
                onSuccess();
                MobileHaptics?.success();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Failed to add store:', error);
            alert('Failed to add store. Please try again.');
            MobileHaptics?.error();
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

                <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Add New Store</h3>
                            <TouchEnhancedButton
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <span className="text-xl">×</span>
                            </TouchEnhancedButton>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Store Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="e.g., Walmart Supercenter"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Chain/Brand
                                </label>
                                <input
                                    type="text"
                                    value={formData.chain}
                                    onChange={(e) => setFormData({...formData, chain: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="e.g., Walmart"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Address *
                                </label>
                                <textarea
                                    required
                                    value={formData.address}
                                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    rows="2"
                                    placeholder="1234 Main St, City, State 12345"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Phone
                                    </label>
                                    <KeyboardOptimizedInput
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="(555) 123-4567"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Hours
                                    </label>
                                    <KeyboardOptimizedInput
                                        type="text"
                                        value={formData.hours}
                                        onChange={(e) => setFormData({...formData, hours: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="9 AM - 9 PM"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <TouchEnhancedButton
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200"
                                >
                                    Cancel
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {loading ? 'Adding...' : 'Add Store'}
                                </TouchEnhancedButton>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Store Details Modal Component
function StoreDetailsModal({ store, onClose, onUpdate }) {
    const [activeTab, setActiveTab] = useState('info');

    const tabs = [
        { id: 'info', name: 'Info', icon: 'ℹ️' },
        { id: 'layout', name: 'Layout', icon: '🗺️' },
        { id: 'reviews', name: 'Reviews', icon: '⭐' },
        { id: 'prices', name: 'Prices', icon: '💰' }
    ];

    if (!store) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

                <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                    {/* Header */}
                    <div className="bg-indigo-600 text-white p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold">{store.name}</h2>
                                <p className="text-indigo-100">{store.chain} • {store.address}</p>
                            </div>
                            <TouchEnhancedButton
                                onClick={onClose}
                                className="text-white hover:text-indigo-200"
                            >
                                <span className="text-2xl">×</span>
                            </TouchEnhancedButton>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-gray-200">
                        <div className="flex">
                            {tabs.map(tab => (
                                <TouchEnhancedButton
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 ${
                                        activeTab === tab.id
                                            ? 'border-indigo-500 text-indigo-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <span className="mr-1">{tab.icon}</span>
                                    {tab.name}
                                </TouchEnhancedButton>
                            ))}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6 max-h-96 overflow-y-auto">
                        {activeTab === 'info' && <StoreInfoTab store={store} />}
                        {activeTab === 'layout' && <StoreLayoutTab store={store} />}
                        {activeTab === 'reviews' && <StoreReviewsTab store={store} />}
                        {activeTab === 'prices' && <StorePricesTab store={store} />}
                    </div>

                    {/* Actions */}
                    <div className="border-t border-gray-200 p-4">
                        <div className="flex gap-3">
                            <TouchEnhancedButton
                                onClick={() => {/* Edit store */}}
                                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200"
                            >
                                Edit Store
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={() => {/* Navigate to AI shopping */}}
                                className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700"
                            >
                                🎯 Start Smart Shopping
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Store Info Tab
function StoreInfoTab({ store }) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoItem icon="📍" label="Address" value={store.address} />
                <InfoItem icon="📞" label="Phone" value={store.phone || 'Not available'} />
                <InfoItem icon="🕒" label="Hours" value={store.hours || 'Not available'} />
                <InfoItem icon="🌐" label="Website" value={store.website || 'Not available'} />
            </div>

            <div className="pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Community Stats</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-2xl font-bold text-indigo-600">{store.reviewCount || 0}</div>
                        <div className="text-xs text-gray-500">Reviews</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-indigo-600">{store.communityRating?.toFixed(1) || 'New'}</div>
                        <div className="text-xs text-gray-500">Rating</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-indigo-600">{store.visitCount || 0}</div>
                        <div className="text-xs text-gray-500">Visits</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Store Layout Tab
function StoreLayoutTab({ store }) {
    return (
        <div className="space-y-4">
            <div className="text-center py-8">
                <div className="text-6xl mb-4">🗺️</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Store Layout</h3>
                <p className="text-gray-500 mb-4">
                    {store.hasCustomLayout
                        ? 'This store has a custom layout created by the community'
                        : 'Using standard layout template'
                    }
                </p>
                <TouchEnhancedButton className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                    {store.hasCustomLayout ? 'View Layout' : 'Create Layout'}
                </TouchEnhancedButton>
            </div>
        </div>
    );
}

// Store Reviews Tab
function StoreReviewsTab({ store }) {
    return (
        <div className="space-y-4">
            <div className="text-center py-8">
                <div className="text-6xl mb-4">⭐</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Community Reviews</h3>
                <p className="text-gray-500 mb-4">
                    {store.reviewCount > 0
                        ? `${store.reviewCount} reviews from Doc Bear community members`
                        : 'No reviews yet - be the first!'
                    }
                </p>
                <TouchEnhancedButton className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                    Write Review
                </TouchEnhancedButton>
            </div>
        </div>
    );
}

// Store Prices Tab
function StorePricesTab({ store }) {
    return (
        <div className="space-y-4">
            <div className="text-center py-8">
                <div className="text-6xl mb-4">💰</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Price Tracking</h3>
                <p className="text-gray-500 mb-4">
                    Track and compare prices for items at this store
                </p>
                <TouchEnhancedButton className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                    View Price History
                </TouchEnhancedButton>
            </div>
        </div>
    );
}

// Info Item Component
function InfoItem({ icon, label, value }) {
    return (
        <div className="flex items-start gap-2">
            <span className="text-lg">{icon}</span>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">{label}</div>
                <div className="text-sm text-gray-600 break-words">{value}</div>
            </div>
        </div>
    );
}