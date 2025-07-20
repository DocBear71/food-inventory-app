'use client';
// file: /src/app/stores/page.js - Enhanced with category ordering preferences

import { useState, useEffect } from 'react';
import { useSafeSession } from '@/hooks/useSafeSession';
import { useRouter } from 'next/navigation';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { apiDelete, apiPost, apiPut } from "@/lib/api-config.js";
import { StoreLayoutUtils } from '@/lib/storeLayouts';

export default function StoresPage() {
    const { data: session, status } = useSafeSession();
    const router = useRouter();
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterChain, setFilterChain] = useState('');
    const [showAddStore, setShowAddStore] = useState(false);
    const [editingStore, setEditingStore] = useState(null);
    const [showCategoryOrder, setShowCategoryOrder] = useState(null); // Store ID for category ordering
    const [newStore, setNewStore] = useState({
        name: '',
        chain: '',
        address: '',
        city: '',
        state: '',
        zipCode: ''
    });

    // 🆕 NEW: Category ordering state
    const [categoryOrderModal, setCategoryOrderModal] = useState(null);
    const [storeCategories, setStoreCategories] = useState({});

    // Redirect if not authenticated
    useEffect(() => {
        if (status === 'loading') return;
        if (!session) {
            router.push('/auth/signin');
        }
    }, [session, status, router]);

    useEffect(() => {
        if (session) {
            fetchStores();
            loadStoreCategoryOrders();
        }
    }, [session]);

    const fetchStores = async () => {
        try {
            const response = await fetch('/api/stores');
            const data = await response.json();
            if (data.success) {
                setStores(data.stores || []);
            } else {
                console.error('Failed to fetch stores:', data.error);
            }
        } catch (error) {
            console.error('Error fetching stores:', error);
        } finally {
            setLoading(false);
        }
    };

    // 🆕 NEW: Load category orders for all stores
    const loadStoreCategoryOrders = () => {
        try {
            const saved = localStorage.getItem('store-category-orders');
            if (saved) {
                const parsed = JSON.parse(saved);
                setStoreCategories(parsed);
                console.log('📂 Loaded store category orders:', parsed);
            }
        } catch (error) {
            console.error('Error loading store category orders:', error);
        }
    };

    // 🆕 NEW: Save category order for specific store
    const saveStoreCategoryOrder = (storeId, storeName, categoryOrder) => {
        try {
            const updated = {
                ...storeCategories,
                [storeId]: {
                    storeName,
                    categories: categoryOrder,
                    lastModified: new Date().toISOString()
                }
            };
            localStorage.setItem('store-category-orders', JSON.stringify(updated));
            setStoreCategories(updated);
            console.log(`💾 Saved category order for ${storeName}:`, categoryOrder);
        } catch (error) {
            console.error('Error saving store category order:', error);
        }
    };

    const handleAddStore = async (e) => {
        e.preventDefault();

        try {
            const response = await apiPost('/api/stores', {
                newStore
            });

            const data = await response.json();
            if (data.success) {
                setStores(prev => [...prev, data.store]);
                setNewStore({
                    name: '',
                    chain: '',
                    address: '',
                    city: '',
                    state: '',
                    zipCode: ''
                });
                setShowAddStore(false);
            } else {
                alert(data.error || 'Failed to add store');
            }
        } catch (error) {
            console.error('Error adding store:', error);
            alert('Error adding store');
        }
    };

    const handleUpdateStore = async (storeId, updates) => {
        try {
            const response = await apiPut('/api/stores', {
                storeId,
                ...updates
            });

            const data = await response.json();
            if (data.success) {
                setStores(prev => prev.map(store =>
                    store._id === storeId ? data.store : store
                ));
                setEditingStore(null);
            } else {
                alert(data.error || 'Failed to update store');
            }
        } catch (error) {
            console.error('Error updating store:', error);
            alert('Error updating store');
        }
    };

    const handleDeleteStore = async (storeId) => {
        if (!confirm('Are you sure you want to delete this store? This will not affect your price history.')) {
            return;
        }

        try {
            const response = await apiDelete(`/api/stores?storeId=${storeId}`, {});

            const data = await response.json();
            if (data.success) {
                setStores(prev => prev.filter(store => store._id !== storeId));

                // 🆕 NEW: Clean up category orders for deleted store
                const updated = { ...storeCategories };
                delete updated[storeId];
                localStorage.setItem('store-category-orders', JSON.stringify(updated));
                setStoreCategories(updated);
            } else {
                alert(data.error || 'Failed to delete store');
            }
        } catch (error) {
            console.error('Error deleting store:', error);
            alert('Error deleting store');
        }
    };

    const filteredStores = stores.filter(store => {
        const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            store.chain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            store.city?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesChain = !filterChain || store.chain?.toLowerCase().includes(filterChain.toLowerCase());
        return matchesSearch && matchesChain;
    });

    const uniqueChains = [...new Set(stores.map(store => store.chain).filter(Boolean))];

    if (status === 'loading' || loading) {
        return (
            <MobileOptimizedLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <MobileOptimizedLayout>
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">🏪 My Stores</h1>
                                <p className="text-gray-600 mt-1">
                                    Manage your favorite grocery stores and customize shopping layouts
                                </p>
                            </div>
                            <TouchEnhancedButton
                                onClick={() => setShowAddStore(true)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium"
                            >
                                + Add Store
                            </TouchEnhancedButton>
                        </div>

                        {/* Search and Filters */}
                        <div className="bg-white rounded-lg shadow p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Search Stores
                                    </label>
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Search by name, chain, or city..."
                                        style={{fontSize: '16px'}}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Filter by Chain
                                    </label>
                                    <select
                                        value={filterChain}
                                        onChange={(e) => setFilterChain(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        style={{fontSize: '16px'}}
                                    >
                                        <option value="">All Chains</option>
                                        {uniqueChains.map(chain => (
                                            <option key={chain} value={chain}>{chain}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Store Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {filteredStores.length === 0 ? (
                            <div className="col-span-full text-center py-12">
                                <div className="text-gray-400 text-6xl mb-4">🏪</div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No Stores Found</h3>
                                <p className="text-gray-500 mb-4">
                                    {stores.length === 0
                                        ? "Start adding your favorite grocery stores to track prices more efficiently."
                                        : "Try adjusting your search or filter criteria."
                                    }
                                </p>
                                {stores.length === 0 && (
                                    <TouchEnhancedButton
                                        onClick={() => setShowAddStore(true)}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium"
                                    >
                                        Add Your First Store
                                    </TouchEnhancedButton>
                                )}
                            </div>
                        ) : (
                            filteredStores.map(store => (
                                <div key={store._id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">{store.name}</h3>
                                            {store.chain && (
                                                <p className="text-sm text-gray-600">{store.chain}</p>
                                            )}
                                        </div>
                                        <div className="flex space-x-2">
                                            <TouchEnhancedButton
                                                onClick={() => setEditingStore(store)}
                                                className="text-indigo-600 hover:text-indigo-800 text-sm"
                                                title="Edit store"
                                            >
                                                ✏️
                                            </TouchEnhancedButton>
                                            <TouchEnhancedButton
                                                onClick={() => handleDeleteStore(store._id)}
                                                className="text-red-600 hover:text-red-800 text-sm"
                                                title="Delete store"
                                            >
                                                🗑️
                                            </TouchEnhancedButton>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm text-gray-600">
                                        {store.address && (
                                            <div className="flex items-start">
                                                <span className="mr-2">📍</span>
                                                <span>{store.address}</span>
                                            </div>
                                        )}
                                        {(store.city || store.state) && (
                                            <div className="flex items-center">
                                                <span className="mr-2">🌍</span>
                                                <span>
                                                    {store.city}{store.city && store.state && ', '}{store.state}
                                                    {store.zipCode && ` ${store.zipCode}`}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center">
                                            <span className="mr-2">📅</span>
                                            <span>Added {new Date(store.createdAt).toLocaleDateString()}</span>
                                        </div>

                                        {/* 🆕 NEW: Category Order Status */}
                                        {storeCategories[store._id] && (
                                            <div className="flex items-center">
                                                <span className="mr-2">📂</span>
                                                <span className="text-green-600">
                                                    Custom category order set ({storeCategories[store._id].categories.length} categories)
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                                        {/* 🆕 NEW: Category Order Button */}
                                        <TouchEnhancedButton
                                            onClick={() => setCategoryOrderModal(store)}
                                            className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 py-2 px-3 rounded-md text-sm font-medium border border-purple-200 flex items-center justify-center gap-2"
                                        >
                                            <span>📂</span>
                                            <span>
                                                {storeCategories[store._id] ? 'Edit Category Order' : 'Set Category Order'}
                                            </span>
                                        </TouchEnhancedButton>

                                        <TouchEnhancedButton
                                            onClick={() => router.push(`/inventory?store=${encodeURIComponent(store.name)}`)}
                                            className="w-full bg-yellow-50 hover:bg-yellow-100 text-yellow-700 py-2 px-3 rounded-md text-sm font-medium border border-yellow-200"
                                        >
                                            💰 View Price History
                                        </TouchEnhancedButton>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* 🆕 NEW: Category Order Modal */}
                    {categoryOrderModal && (
                        <CategoryOrderModal
                            store={categoryOrderModal}
                            currentOrder={storeCategories[categoryOrderModal._id]?.categories || []}
                            onSave={(categoryOrder) => {
                                saveStoreCategoryOrder(categoryOrderModal._id, categoryOrderModal.name, categoryOrder);
                                setCategoryOrderModal(null);
                            }}
                            onClose={() => setCategoryOrderModal(null)}
                        />
                    )}

                    {/* Add Store Modal */}
                    {showAddStore && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                            <div className="bg-white rounded-lg max-w-md w-full p-6">
                                <h2 className="text-xl font-semibold mb-4">Add New Store</h2>
                                <form onSubmit={handleAddStore} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Store Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={newStore.name}
                                            onChange={(e) => setNewStore(prev => ({...prev, name: e.target.value}))}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="e.g., Walmart Supercenter"
                                            style={{fontSize: '16px'}}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Chain/Brand
                                        </label>
                                        <select
                                            value={newStore.chain}
                                            onChange={(e) => setNewStore(prev => ({...prev, chain: e.target.value}))}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            style={{fontSize: '16px'}}
                                        >
                                            <option value="">Select chain</option>
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

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                City
                                            </label>
                                            <input
                                                type="text"
                                                value={newStore.city}
                                                onChange={(e) => setNewStore(prev => ({...prev, city: e.target.value}))}
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                placeholder="City"
                                                style={{fontSize: '16px'}}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                State
                                            </label>
                                            <input
                                                type="text"
                                                value={newStore.state}
                                                onChange={(e) => setNewStore(prev => ({...prev, state: e.target.value}))}
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                placeholder="State"
                                                maxLength={2}
                                                style={{fontSize: '16px'}}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Address (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={newStore.address}
                                            onChange={(e) => setNewStore(prev => ({...prev, address: e.target.value}))}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="Street address"
                                            style={{fontSize: '16px'}}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            ZIP Code
                                        </label>
                                        <input
                                            type="text"
                                            value={newStore.zipCode}
                                            onChange={(e) => setNewStore(prev => ({...prev, zipCode: e.target.value}))}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="ZIP code"
                                            maxLength={10}
                                            style={{fontSize: '16px'}}
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <TouchEnhancedButton
                                            type="button"
                                            onClick={() => {
                                                setShowAddStore(false);
                                                setNewStore({
                                                    name: '',
                                                    chain: '',
                                                    address: '',
                                                    city: '',
                                                    state: '',
                                                    zipCode: ''
                                                });
                                            }}
                                            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-md"
                                        >
                                            Cancel
                                        </TouchEnhancedButton>
                                        <TouchEnhancedButton
                                            type="submit"
                                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md"
                                        >
                                            Add Store
                                        </TouchEnhancedButton>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Edit Store Modal */}
                    {editingStore && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                            <div className="bg-white rounded-lg max-w-md w-full p-6">
                                <h2 className="text-xl font-semibold mb-4">Edit Store</h2>
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    handleUpdateStore(editingStore._id, {
                                        name: editingStore.name,
                                        chain: editingStore.chain,
                                        address: editingStore.address,
                                        city: editingStore.city,
                                        state: editingStore.state,
                                        zipCode: editingStore.zipCode
                                    });
                                }} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Store Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={editingStore.name}
                                            onChange={(e) => setEditingStore(prev => ({...prev, name: e.target.value}))}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            style={{fontSize: '16px'}}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Chain/Brand
                                        </label>
                                        <input
                                            type="text"
                                            value={editingStore.chain || ''}
                                            onChange={(e) => setEditingStore(prev => ({...prev, chain: e.target.value}))}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            style={{fontSize: '16px'}}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                City
                                            </label>
                                            <input
                                                type="text"
                                                value={editingStore.city || ''}
                                                onChange={(e) => setEditingStore(prev => ({...prev, city: e.target.value}))}
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                style={{fontSize: '16px'}}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                State
                                            </label>
                                            <input
                                                type="text"
                                                value={editingStore.state || ''}
                                                onChange={(e) => setEditingStore(prev => ({...prev, state: e.target.value}))}
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                maxLength={2}
                                                style={{fontSize: '16px'}}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <TouchEnhancedButton
                                            type="button"
                                            onClick={() => setEditingStore(null)}
                                            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-md"
                                        >
                                            Cancel
                                        </TouchEnhancedButton>
                                        <TouchEnhancedButton
                                            type="submit"
                                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md"
                                        >
                                            Update Store
                                        </TouchEnhancedButton>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Store Statistics */}
                    {stores.length > 0 && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Store Statistics</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
                                <div>
                                    <div className="text-3xl font-bold text-indigo-600">{stores.length}</div>
                                    <div className="text-sm text-gray-600">Total Stores</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-green-600">{uniqueChains.length}</div>
                                    <div className="text-sm text-gray-600">Different Chains</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-purple-600">
                                        {[...new Set(stores.map(store => store.city).filter(Boolean))].length}
                                    </div>
                                    <div className="text-sm text-gray-600">Cities</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-orange-600">
                                        {Object.keys(storeCategories).length}
                                    </div>
                                    <div className="text-sm text-gray-600">Custom Layouts</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}

// 🆕 NEW: Category Order Modal Component
function CategoryOrderModal({ store, currentOrder, onSave, onClose }) {
    // Get the store layout to show available categories
    const layout = StoreLayoutUtils.getStoreLayout(store.name, store.chain);
    const availableCategories = layout.categoryOrder || [];

    const [categoryOrder, setCategoryOrder] = useState(() => {
        if (currentOrder.length > 0) {
            // Use existing order and add any new categories
            const existing = [...currentOrder];
            availableCategories.forEach(cat => {
                if (!existing.includes(cat)) {
                    existing.push(cat);
                }
            });
            return existing;
        } else {
            // Use default store layout order
            return [...availableCategories];
        }
    });

    const [selectedCategory, setSelectedCategory] = useState(null);

    const moveCategory = (fromIndex, toIndex) => {
        const newOrder = [...categoryOrder];
        const [movedCategory] = newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, movedCategory);
        setCategoryOrder(newOrder);
    };

    const moveCategoryUp = (index) => {
        if (index > 0) {
            moveCategory(index, index - 1);
        }
    };

    const moveCategoryDown = (index) => {
        if (index < categoryOrder.length - 1) {
            moveCategory(index, index + 1);
        }
    };

    const resetToDefault = () => {
        setCategoryOrder([...availableCategories]);
    };

    const handleSave = () => {
        onSave(categoryOrder);
    };

    const getCategoryDisplayName = (category) => {
        // Clean up category names for display
        return category.replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace(/\//g, ' / ');
    };

    const getCategoryIcon = (category) => {
        const iconMap = {
            'Fresh Fruits': '🍎',
            'Fresh Vegetables': '🥬',
            'Dairy': '🥛',
            'Fresh/Frozen Beef': '🥩',
            'Fresh/Frozen Poultry': '🐔',
            'Fresh/Frozen Fish & Seafood': '🐟',
            'Frozen Items': '🧊',
            'Frozen Meals': '🍽️',
            'Frozen Vegetables': '❄️🥬',
            'Frozen Fruit': '❄️🍓',
            'Breads': '🍞',
            'Canned/Jarred Vegetables': '🥫',
            'Canned/Jarred Tomatoes': '🍅',
            'Canned/Jarred Sauces': '🫙',
            'Canned/Jarred Meals': '🥫',
            'Pasta': '🍝',
            'Grains': '🌾',
            'Baking & Cooking Ingredients': '🧁',
            'Seasonings': '🧂',
            'Spices': '🌶️',
            'Condiments': '🧂',
            'Beverages': '🥤',
            'Snacks': '🍿',
            'Other': '🛒'
        };
        return iconMap[category] || '📦';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-purple-600 text-white p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold">📂 Category Order</h2>
                            <p className="text-sm text-purple-100">{store.name}</p>
                        </div>
                        <TouchEnhancedButton
                            onClick={onClose}
                            className="text-white hover:text-purple-200 text-2xl"
                        >
                            ×
                        </TouchEnhancedButton>
                    </div>
                </div>

                {/* Instructions */}
                <div className="p-4 bg-purple-50 border-b border-purple-200">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">💡</span>
                        <div>
                            <h3 className="font-semibold text-purple-900 mb-1">Customize Your Shopping Flow</h3>
                            <p className="text-sm text-purple-700">
                                Arrange categories in the order you prefer to shop through {store.name}.
                                This will automatically organize your shopping lists for optimal efficiency.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Category List */}
                <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: '60vh' }}>
                    <div className="space-y-3">
                        {categoryOrder.map((category, index) => (
                            <div
                                key={category}
                                className={`flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 transition-all ${
                                    selectedCategory === category
                                        ? 'border-purple-300 bg-purple-50 shadow-md'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                                onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-600 rounded-full font-bold text-sm">
                                        {index + 1}
                                    </div>
                                    <div className="text-2xl">
                                        {getCategoryIcon(category)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900">
                                            {getCategoryDisplayName(category)}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            Position {index + 1} of {categoryOrder.length}
                                        </div>
                                    </div>
                                </div>

                                {/* Mobile-Friendly Controls */}
                                <div className="flex items-center gap-2">
                                    <TouchEnhancedButton
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            moveCategoryUp(index);
                                        }}
                                        disabled={index === 0}
                                        className={`p-2 rounded-lg border ${
                                            index === 0
                                                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                                : 'border-purple-200 text-purple-600 hover:bg-purple-50 active:bg-purple-100'
                                        }`}
                                        title="Move up"
                                    >
                                        ⬆️
                                    </TouchEnhancedButton>
                                    <TouchEnhancedButton
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            moveCategoryDown(index);
                                        }}
                                        disabled={index === categoryOrder.length - 1}
                                        className={`p-2 rounded-lg border ${
                                            index === categoryOrder.length - 1
                                                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                                : 'border-purple-200 text-purple-600 hover:bg-purple-50 active:bg-purple-100'
                                        }`}
                                        title="Move down"
                                    >
                                        ⬇️
                                    </TouchEnhancedButton>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Shopping Flow Preview */}
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-2">🗺️ Your Shopping Flow</h4>
                        <div className="text-sm text-blue-700">
                            <div className="flex flex-wrap gap-2">
                                {categoryOrder.slice(0, 5).map((category, index) => (
                                    <span key={category} className="flex items-center gap-1">
                                        <span>{getCategoryIcon(category)}</span>
                                        <span>{getCategoryDisplayName(category).split(' ')[0]}</span>
                                        {index < Math.min(4, categoryOrder.length - 1) && (
                                            <span className="text-blue-500 mx-1">→</span>
                                        )}
                                    </span>
                                ))}
                                {categoryOrder.length > 5 && (
                                    <span className="text-blue-500">... +{categoryOrder.length - 5} more</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Reset to Default */}
                        <TouchEnhancedButton
                            onClick={resetToDefault}
                            className="sm:w-auto bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 text-sm font-medium"
                        >
                            🔄 Reset to Default
                        </TouchEnhancedButton>

                        <div className="flex gap-3 sm:ml-auto">
                            <TouchEnhancedButton
                                onClick={onClose}
                                className="flex-1 sm:flex-none bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
                            >
                                Cancel
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={handleSave}
                                className="flex-1 sm:flex-none bg-purple-600 text-white py-2 px-6 rounded-lg hover:bg-purple-700 font-medium"
                            >
                                💾 Save Order
                            </TouchEnhancedButton>
                        </div>
                    </div>

                    {/* Status indicator */}
                    <div className="mt-3 text-center text-sm text-gray-500">
                        {currentOrder.length > 0 ? (
                            <span className="text-green-600">✅ This store has a custom category order</span>
                        ) : (
                            <span className="text-blue-600">🆕 Setting up category order for the first time</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}