'use client';
// file: /src/app/stores/page.js v2 - Updated with new comprehensive grocery categories system

import { useState, useEffect } from 'react';
import { useSafeSession } from '@/hooks/useSafeSession';
import { useRouter } from 'next/navigation';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { apiDelete, apiPost, apiPut } from "@/lib/api-config.js";
import { CategoryUtils, GROCERY_CATEGORIES } from '@/lib/groceryCategories';
import KeyboardOptimizedInput from '@/components/forms/KeyboardOptimizedInput';

export default function StoresPage() {
    const { data: session, status } = useSafeSession();
    const router = useRouter();
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterChain, setFilterChain] = useState('');
    const [showAddStore, setShowAddStore] = useState(false);
    const [editingStore, setEditingStore] = useState(null);
    const [newStore, setNewStore] = useState({
        name: '',
        chain: '',
        address: '',
        city: '',
        state: '',
        zipCode: ''
    });

    // Category ordering state
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

    // Load category orders for all stores
    const loadStoreCategoryOrders = () => {
        try {
            const saved = localStorage.getItem(`store-categories-${session?.user?.id}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                setStoreCategories(parsed);
                console.log('📂 Loaded store category orders:', parsed);
            }
        } catch (error) {
            console.error('Error loading store category orders:', error);
        }
    };

    // Save category order for specific store
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
            localStorage.setItem(`store-categories-${session?.user?.id}`, JSON.stringify(updated));
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

                // Clean up category orders for deleted store
                const updated = { ...storeCategories };
                delete updated[storeId];
                localStorage.setItem(`store-categories-${session?.user?.id}`, JSON.stringify(updated));
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
                                    Manage your favorite grocery stores and customize shopping categories
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
                                    <KeyboardOptimizedInput
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
                                        ? "Start adding your favorite grocery stores to organize your shopping better."
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

                                        {/* Category Order Status */}
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
                                        {/* Category Order Button */}
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

                    {/* Enhanced Category Order Modal */}
                    {categoryOrderModal && (
                        <EnhancedCategoryOrderModal
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
                                    <div className="text-sm text-gray-600">Custom Category Orders</div>
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

// Enhanced Category Order Modal Component with ALL Movement Features
function EnhancedCategoryOrderModal({ store, currentOrder, onSave, onClose }) {
    // Use the new comprehensive category system
    const defaultCategories = CategoryUtils.getDefaultCategoryOrder();

    // Store Layout Templates
    const storeLayoutTemplates = {
        'fresh-first': {
            name: 'Fresh-First Layout',
            description: 'Produce → Bakery → Deli → Meat → Dairy → Frozen → Dry Goods',
            icon: '🥬',
            order: [
                'Fresh Fruits', 'Fresh Vegetables', 'Fresh Herbs', 'Organic Produce',
                'Bakery Fresh', 'Bakery Packaged', 'Fresh Bread',
                'Deli Prepared Foods', 'Deli Meats', 'Deli Cheese',
                'Fresh/Frozen Beef', 'Fresh/Frozen Poultry', 'Fresh/Frozen Pork', 'Fresh/Frozen Fish & Seafood',
                'Dairy', 'Eggs', 'Cheese',
                'Frozen Meals', 'Frozen Vegetables', 'Frozen Fruit', 'Frozen Other Items',
                'Canned Vegetables', 'Canned Fruit', 'Canned Meals', 'Pasta', 'Grains',
                'Condiments', 'Seasonings', 'Spices', 'Baking & Cooking Ingredients',
                'Beverages', 'Snacks', 'Other'
            ]
        },
        'food-safety': {
            name: 'Food Safety Layout',
            description: 'Dry Goods → Refrigerated → Frozen → Fresh (prevents spoilage)',
            icon: '🛡️',
            order: [...defaultCategories] // Current default
        },
        'perimeter-first': {
            name: 'Perimeter-First Layout',
            description: 'Fresh perimeter items → Center aisles → Frozen',
            icon: '🔄',
            order: [
                'Fresh Fruits', 'Fresh Vegetables', 'Organic Produce',
                'Fresh/Frozen Beef', 'Fresh/Frozen Poultry', 'Fresh/Frozen Pork', 'Fresh/Frozen Fish & Seafood',
                'Dairy', 'Eggs', 'Cheese',
                'Bakery Fresh', 'Bakery Packaged', 'Fresh Bread',
                'Deli Prepared Foods', 'Deli Meats', 'Deli Cheese',
                'Canned Vegetables', 'Canned Fruit', 'Canned Meals', 'Pasta', 'Grains',
                'Condiments', 'Seasonings', 'Spices', 'Baking & Cooking Ingredients',
                'Beverages', 'Snacks',
                'Frozen Meals', 'Frozen Vegetables', 'Frozen Fruit', 'Frozen Other Items',
                'Other'
            ]
        }
    };

    const [categoryOrder, setCategoryOrder] = useState(() => {
        if (currentOrder.length > 0) {
            const existing = [...currentOrder];
            defaultCategories.forEach(cat => {
                if (!existing.includes(cat)) {
                    existing.push(cat);
                }
            });
            return existing;
        } else {
            return [...defaultCategories];
        }
    });

    // Track hidden/removed categories
    const [hiddenCategories, setHiddenCategories] = useState(new Set());
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Collapsible sections state
    const [showInstructions, setShowInstructions] = useState(true);
    const [showTemplates, setShowTemplates] = useState(false);
    const [showAddCategoriesSection, setShowAddCategoriesSection] = useState(false);

    // Drag and drop state
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);

    // Jump to position states
    const [jumpToPositions, setJumpToPositions] = useState({});

    // Get visible categories (not hidden)
    const visibleCategories = categoryOrder.filter(cat => !hiddenCategories.has(cat));

    // Get hidden categories for the "add back" section
    const availableHiddenCategories = Array.from(hiddenCategories);

    // Apply template function
    const applyTemplate = (templateKey) => {
        const template = storeLayoutTemplates[templateKey];
        if (template) {
            const filteredOrder = template.order.filter(cat => defaultCategories.includes(cat));
            const remainingCategories = defaultCategories.filter(cat => !filteredOrder.includes(cat));
            setCategoryOrder([...filteredOrder, ...remainingCategories]);
            setHiddenCategories(new Set());
            setShowTemplates(false);
        }
    };

    // Drag and Drop Functions
    const handleDragStart = (e, category, index) => {
        setDraggedItem({ category, index });
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverIndex(index);
    };

    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    const handleDrop = (e, dropIndex) => {
        e.preventDefault();
        setDragOverIndex(null);

        if (draggedItem && draggedItem.index !== dropIndex) {
            const newOrder = [...categoryOrder];
            const draggedCategory = visibleCategories[draggedItem.index];
            const targetCategory = visibleCategories[dropIndex];

            const draggedActualIndex = newOrder.indexOf(draggedCategory);
            const targetActualIndex = newOrder.indexOf(targetCategory);

            newOrder.splice(draggedActualIndex, 1);
            const adjustedTargetIndex = draggedActualIndex < targetActualIndex ? targetActualIndex - 1 : targetActualIndex;
            newOrder.splice(adjustedTargetIndex, 0, draggedCategory);

            setCategoryOrder(newOrder);
        }
        setDraggedItem(null);
    };

    const moveCategory = (fromIndex, toIndex) => {
        const newOrder = [...categoryOrder];
        const [movedCategory] = newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, movedCategory);
        setCategoryOrder(newOrder);
    };

    // Quick move functions
    const moveToTop = (category) => {
        const currentIndex = categoryOrder.indexOf(category);
        moveCategory(currentIndex, 0);
    };

    const moveToBottom = (category) => {
        const currentIndex = categoryOrder.indexOf(category);
        moveCategory(currentIndex, categoryOrder.length - 1);
    };

    const moveBulkUp = (category, positions = 5) => {
        const currentIndex = categoryOrder.indexOf(category);
        const newIndex = Math.max(0, currentIndex - positions);
        moveCategory(currentIndex, newIndex);
    };

    const moveBulkDown = (category, positions = 5) => {
        const currentIndex = categoryOrder.indexOf(category);
        const newIndex = Math.min(categoryOrder.length - 1, currentIndex + positions);
        moveCategory(currentIndex, newIndex);
    };

    // Jump to position function
    const jumpToPosition = (category, targetPosition) => {
        const position = parseInt(targetPosition);
        if (isNaN(position) || position < 1 || position > visibleCategories.length) {
            return;
        }

        const currentIndex = categoryOrder.indexOf(category);
        const targetCategory = visibleCategories[position - 1];
        const targetIndex = categoryOrder.indexOf(targetCategory);

        moveCategory(currentIndex, targetIndex);

        setJumpToPositions(prev => ({
            ...prev,
            [category]: ''
        }));
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

    // Hide/Remove category functionality
    const hideCategory = (category) => {
        setHiddenCategories(prev => new Set([...prev, category]));
    };

    // Show/Add back category functionality
    const showCategory = (category) => {
        setHiddenCategories(prev => {
            const newSet = new Set(prev);
            newSet.delete(category);
            return newSet;
        });
    };

    const resetToDefault = () => {
        setCategoryOrder([...defaultCategories]);
        setHiddenCategories(new Set());
    };

    const handleSave = () => {
        const finalOrder = categoryOrder.filter(cat => !hiddenCategories.has(cat));
        onSave(finalOrder);
    };

    const getCategoryInfo = (categoryName) => {
        return GROCERY_CATEGORIES[categoryName] || {
            name: categoryName,
            icon: '📦',
            color: '#6b7280',
            section: 'Other'
        };
    };

    // Filter visible categories based on search
    const filteredCategories = visibleCategories.filter(category =>
        category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const clearSearch = () => {
        setSearchTerm('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-5xl w-full max-h-[95vh] overflow-hidden">
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

                {/* Collapsible Instructions */}
                <div className="border-b border-purple-200">
                    <TouchEnhancedButton
                        onClick={() => setShowInstructions(!showInstructions)}
                        className="w-full p-4 bg-purple-50 hover:bg-purple-100 transition-colors text-left"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">💡</span>
                                <div>
                                    <h3 className="font-semibold text-purple-900 mb-1">Customize Your Shopping Flow</h3>
                                    {showInstructions && (
                                        <p className="text-sm text-purple-700">
                                            Arrange categories to match how you shop through {store.name}.
                                            Use drag & drop, quick moves, or templates for fast setup.
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="text-purple-600 ml-2">
                                {showInstructions ? '🔼' : '🔽'}
                            </div>
                        </div>
                    </TouchEnhancedButton>
                </div>

                {/* Store Layout Templates */}
                <div className="border-b border-gray-200">
                    <TouchEnhancedButton
                        onClick={() => setShowTemplates(!showTemplates)}
                        className="w-full p-3 bg-blue-50 hover:bg-blue-100 transition-colors text-left"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">🏪</span>
                                <h3 className="font-medium text-blue-900">Quick Start Templates</h3>
                            </div>
                            <div className="text-blue-600">
                                {showTemplates ? '🔼' : '🔽'}
                            </div>
                        </div>
                    </TouchEnhancedButton>

                    {showTemplates && (
                        <div className="p-4 bg-blue-50">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {Object.entries(storeLayoutTemplates).map(([key, template]) => (
                                    <TouchEnhancedButton
                                        key={key}
                                        onClick={() => applyTemplate(key)}
                                        className="p-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 text-left transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className="text-2xl">{template.icon}</span>
                                            <div>
                                                <div className="font-medium text-blue-900">{template.name}</div>
                                                <div className="text-xs text-blue-700 mt-1">{template.description}</div>
                                            </div>
                                        </div>
                                    </TouchEnhancedButton>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Enhanced Search Bar */}
                <div className="p-4 border-b border-gray-200">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                            <span className="text-gray-400 text-sm">🔍</span>
                        </div>
                        <KeyboardOptimizedInput
                            type="text"
                            placeholder="Search categories..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                        {searchTerm && (
                            <TouchEnhancedButton
                                onClick={clearSearch}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 z-10"
                                title="Clear search"
                            >
                                <span className="text-sm">✕</span>
                            </TouchEnhancedButton>
                        )}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                        <div className="text-gray-600">
                            {filteredCategories.length} of {visibleCategories.length} visible categories
                            {searchTerm && ` matching "${searchTerm}"`}
                            {hiddenCategories.size > 0 && (
                                <span className="text-orange-600 ml-2">
                                    • {hiddenCategories.size} hidden
                                </span>
                            )}
                        </div>

                        {hiddenCategories.size > 0 && (
                            <TouchEnhancedButton
                                onClick={() => setShowAddCategoriesSection(!showAddCategoriesSection)}
                                className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                            >
                                {showAddCategoriesSection ? 'Hide' : 'Show'} Hidden ({hiddenCategories.size})
                            </TouchEnhancedButton>
                        )}
                    </div>
                </div>

                {/* Add Back Hidden Categories Section */}
                {showAddCategoriesSection && hiddenCategories.size > 0 && (
                    <div className="p-4 bg-green-50 border-b border-green-200">
                        <h4 className="font-medium text-green-900 mb-2">📂 Add Back Hidden Categories</h4>
                        <div className="flex flex-wrap gap-2">
                            {availableHiddenCategories.map(category => {
                                const categoryInfo = getCategoryInfo(category);
                                return (
                                    <TouchEnhancedButton
                                        key={category}
                                        onClick={() => showCategory(category)}
                                        className="flex items-center gap-2 px-3 py-1 bg-white border border-green-300 rounded-full text-sm hover:bg-green-100 transition-colors"
                                    >
                                        <span>{categoryInfo.icon}</span>
                                        <span>{categoryInfo.name}</span>
                                        <span className="text-green-600">+</span>
                                    </TouchEnhancedButton>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Category List with Drag & Drop */}
                <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: '55vh' }}>
                    {filteredCategories.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-gray-400 text-4xl mb-2">🔍</div>
                            <p className="text-gray-500">
                                {searchTerm ? `No categories match "${searchTerm}"` : 'No visible categories'}
                            </p>
                            {searchTerm && (
                                <TouchEnhancedButton
                                    onClick={clearSearch}
                                    className="mt-2 text-purple-600 hover:text-purple-800 underline"
                                >
                                    Clear search
                                </TouchEnhancedButton>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredCategories.map((category, index) => {
                                const actualIndex = visibleCategories.indexOf(category);
                                const categoryInfo = getCategoryInfo(category);
                                const isDraggedOver = dragOverIndex === index;

                                return (
                                    <div
                                        key={category}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, category, index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, index)}
                                        className={`p-4 bg-gray-50 rounded-lg border-2 transition-all cursor-move ${
                                            isDraggedOver
                                                ? 'border-purple-400 bg-purple-100 shadow-lg transform scale-[1.02]'
                                                : selectedCategory === category
                                                    ? 'border-purple-300 bg-purple-50 shadow-md'
                                                    : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                        onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                                    >
                                        {/* Mobile-First Layout */}
                                        <div className="space-y-3">
                                            {/* Top Row: Drag Handle, Position, Icon, Name */}
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing flex-shrink-0">
                                                    <span className="text-sm">⋮⋮</span>
                                                </div>

                                                <div className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-600 rounded-full font-bold text-sm flex-shrink-0">
                                                    {actualIndex + 1}
                                                </div>

                                                <div className="text-xl flex-shrink-0">
                                                    {categoryInfo.icon}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-gray-900 truncate">
                                                        {categoryInfo.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {categoryInfo.section} • Position {actualIndex + 1} of {visibleCategories.length}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Middle Row: Jump to Position */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-600 flex-shrink-0">Jump to:</span>
                                                <KeyboardOptimizedInput
                                                    type="number"
                                                    min="1"
                                                    max={visibleCategories.length}
                                                    value={jumpToPositions[category] || ''}
                                                    onChange={(e) => setJumpToPositions(prev => ({
                                                        ...prev,
                                                        [category]: e.target.value
                                                    }))}
                                                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-center"
                                                    placeholder="#"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <TouchEnhancedButton
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        jumpToPosition(category, jumpToPositions[category]);
                                                    }}
                                                    disabled={!jumpToPositions[category]}
                                                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400"
                                                    title="Jump to position"
                                                >
                                                    Go
                                                </TouchEnhancedButton>
                                            </div>

                                            {/* Bottom Row: Movement Controls */}
                                            <div className="space-y-2">
                                                {/* Quick Moves Row */}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm text-gray-600 flex-shrink-0">Quick:</span>
                                                    <TouchEnhancedButton
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            moveToTop(category);
                                                        }}
                                                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                                        title="Move to top"
                                                    >
                                                        ⏫ Top
                                                    </TouchEnhancedButton>
                                                    <TouchEnhancedButton
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            moveBulkUp(category, 5);
                                                        }}
                                                        disabled={actualIndex < 5}
                                                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400"
                                                        title="Move up 5"
                                                    >
                                                        ⬆️ 5
                                                    </TouchEnhancedButton>
                                                    <TouchEnhancedButton
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            moveBulkDown(category, 5);
                                                        }}
                                                        disabled={actualIndex >= visibleCategories.length - 5}
                                                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400"
                                                        title="Move down 5"
                                                    >
                                                        ⬇️ 5
                                                    </TouchEnhancedButton>
                                                    <TouchEnhancedButton
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            moveToBottom(category);
                                                        }}
                                                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                                        title="Move to bottom"
                                                    >
                                                        ⏬ Bottom
                                                    </TouchEnhancedButton>
                                                </div>

                                                {/* Standard & Hide Controls Row */}
                                                <div className="flex items-center gap-2 justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-gray-600 flex-shrink-0">Step:</span>
                                                        <TouchEnhancedButton
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const visibleIndex = visibleCategories.indexOf(category);
                                                                if (visibleIndex > 0) {
                                                                    const prevCategory = visibleCategories[visibleIndex - 1];
                                                                    const actualCurrentIndex = categoryOrder.indexOf(category);
                                                                    const actualPrevIndex = categoryOrder.indexOf(prevCategory);
                                                                    moveCategory(actualCurrentIndex, actualPrevIndex);
                                                                }
                                                            }}
                                                            disabled={actualIndex === 0}
                                                            className={`px-2 py-1 text-xs rounded border ${
                                                                actualIndex === 0
                                                                    ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                                                    : 'border-purple-200 text-purple-600 hover:bg-purple-50'
                                                            }`}
                                                            title="Move up one"
                                                        >
                                                            ⬆️
                                                        </TouchEnhancedButton>
                                                        <TouchEnhancedButton
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const visibleIndex = visibleCategories.indexOf(category);
                                                                if (visibleIndex < visibleCategories.length - 1) {
                                                                    const nextCategory = visibleCategories[visibleIndex + 1];
                                                                    const actualCurrentIndex = categoryOrder.indexOf(category);
                                                                    const actualNextIndex = categoryOrder.indexOf(nextCategory);
                                                                    moveCategory(actualCurrentIndex, actualNextIndex);
                                                                }
                                                            }}
                                                            disabled={actualIndex === visibleCategories.length - 1}
                                                            className={`px-2 py-1 text-xs rounded border ${
                                                                actualIndex === visibleCategories.length - 1
                                                                    ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                                                    : 'border-purple-200 text-purple-600 hover:bg-purple-50'
                                                            }`}
                                                            title="Move down one"
                                                        >
                                                            ⬇️
                                                        </TouchEnhancedButton>
                                                    </div>

                                                    {/* Hide Button */}
                                                    <TouchEnhancedButton
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            hideCategory(category);
                                                        }}
                                                        className="px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50"
                                                        title="Hide this category"
                                                    >
                                                        🗑️ Hide
                                                    </TouchEnhancedButton>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Movement Legend */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="font-medium text-gray-900 mb-2">🎯 Quick Movement Guide</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                            <div>
                                <div className="font-medium mb-1">Drag & Drop:</div>
                                <div>Click and drag any category to reorder</div>
                            </div>
                            <div>
                                <div className="font-medium mb-1">Jump to Position:</div>
                                <div>Type position number and click "Go"</div>
                            </div>
                            <div>
                                <div className="font-medium mb-1">Quick Moves:</div>
                                <div>⏫ Top • ⬆️5 Up 5 • ⬇️5 Down 5 • ⏬ Bottom</div>
                            </div>
                            <div>
                                <div className="font-medium mb-1">Templates:</div>
                                <div>Use store layout templates for quick setup</div>
                            </div>
                        </div>
                    </div>

                    {/* Shopping Flow Preview */}
                    {visibleCategories.length > 0 && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h4 className="font-semibold text-blue-900 mb-2">🗺️ Your Shopping Flow Preview</h4>
                            <div className="text-sm text-blue-700">
                                <div className="flex flex-wrap gap-2">
                                    {visibleCategories.slice(0, 8).map((category, index) => {
                                        const categoryInfo = getCategoryInfo(category);
                                        return (
                                            <span key={category} className="flex items-center gap-1">
                                                <span>{categoryInfo.icon}</span>
                                                <span>{category.split(' ')[0]}</span>
                                                {index < Math.min(7, visibleCategories.length - 1) && (
                                                    <span className="text-blue-500 mx-1">→</span>
                                                )}
                                            </span>
                                        );
                                    })}
                                    {visibleCategories.length > 8 && (
                                        <span className="text-blue-500">... +{visibleCategories.length - 8} more</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Category Sections Summary */}
                    <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                        <h4 className="font-semibold text-green-900 mb-2">📊 Category Breakdown</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {Object.entries(CategoryUtils.getCategoriesBySection()).map(([section, categories]) => {
                                const sectionCount = categories.filter(cat => visibleCategories.includes(cat.key)).length;
                                return (
                                    <div key={section} className="text-center">
                                        <div className="font-bold text-green-800">{sectionCount}</div>
                                        <div className="text-green-600">{section}</div>
                                    </div>
                                );
                            })}
                        </div>
                        {hiddenCategories.size > 0 && (
                            <div className="mt-2 text-center text-sm text-orange-600">
                                {hiddenCategories.size} categories hidden
                            </div>
                        )}
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
                                💾 Save Order ({visibleCategories.length} categories)
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
                        <div className="mt-1 text-xs">
                            💡 Your category order will be used in AI-enhanced shopping lists for {store.name}
                            {hiddenCategories.size > 0 && (
                                <span className="text-orange-600"> • {hiddenCategories.size} categories will be hidden from lists</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}