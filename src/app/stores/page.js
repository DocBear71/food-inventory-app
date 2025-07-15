'use client';
// file: /src/app/stores/page.js - Store management and discovery

import { useState, useEffect } from 'react';
import { useSafeSession } from '@/hooks/useSafeSession';
import { useRouter } from 'next/navigation';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';

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

    const handleAddStore = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch('/api/stores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newStore)
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
            const response = await fetch('/api/stores', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId, ...updates })
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
            const response = await fetch(`/api/stores?storeId=${storeId}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            if (data.success) {
                setStores(prev => prev.filter(store => store._id !== storeId));
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
                                    Manage your favorite grocery stores for price tracking
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
                                            >
                                                ✏️
                                            </TouchEnhancedButton>
                                            <TouchEnhancedButton
                                                onClick={() => handleDeleteStore(store._id)}
                                                className="text-red-600 hover:text-red-800 text-sm"
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
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-200">
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
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
                            </div>
                        </div>
                    )}
                </div>

                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}