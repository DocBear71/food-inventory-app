'use client';
// file: /src/app/shopping/saved/page.js v3 - Final fixes for button layout and mobile responsiveness


import { useState, useEffect } from 'react';
import { useSafeSession } from '@/hooks/useSafeSession';
import EnhancedAIShoppingListModal from '@/components/shopping/EnhancedAIShoppingListModal';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-config';
import {KeyboardOptimizedInput} from '@/components/forms/KeyboardOptimizedInput';

export default function SavedShoppingListsPage() {
    let session = null;

    try {
        const sessionResult = useSafeSession();
        session = sessionResult?.data || null;
    } catch (error) {
        // Mobile build fallback
        session = null;
    }

    const [savedLists, setSavedLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({
        type: 'all',
        tags: '',
        includeArchived: false
    });
    const [selectedLists, setSelectedLists] = useState([]);
    const [showingList, setShowingList] = useState(null);
    const [showingListData, setShowingListData] = useState(null);
    const [stats, setStats] = useState({});

    const showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
                type === 'warning' ? 'bg-orange-500' : 'bg-blue-500';

        toast.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full opacity-0`;
        toast.innerHTML = `
        <div class="flex items-center space-x-2">
            <span>${message}</span>
        </div>
    `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        }, 100);

        // Animate out and remove
        setTimeout(() => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    };

    useEffect(() => {
        if (session?.user?.id) {
            fetchSavedLists();
        }
    }, [session, filters]);

    const fetchSavedLists = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();

            if (filters.type !== 'all') params.append('type', filters.type);
            if (filters.tags) params.append('tags', filters.tags);
            if (filters.includeArchived) params.append('includeArchived', 'true');

            const response = await apiGet(`/api/shopping/saved?${params}`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to fetch saved lists');
            }

            setSavedLists(result.lists || []);
            setStats(result.stats || {});
            setError('');
        } catch (error) {
            console.error('Error fetching saved lists:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const loadSavedList = async (listId, options = {}) => {
        try {
            const response = await apiPost(`/api/shopping/saved/${listId}/load`, {
                resetPurchased: true,
                updateInventoryStatus: true,
                startShoppingSession: true,
                ...options
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to load shopping list');
            }

            setShowingListData(result.shoppingList);
            setShowingList(result.savedListInfo);

            // Refresh the list to update usage stats
            fetchSavedLists();

        } catch (error) {
            console.error('Error loading shopping list:', error);
            setError(error.message);
        }
    };

    const deleteSavedLists = async (listIds, archive = false) => {
        try {
            const response = await apiDelete('/api/shopping/saved', { listIds, archive });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to delete lists');
            }

            setSelectedLists([]);
            fetchSavedLists();

        } catch (error) {
            console.error('Error deleting lists:', error);
            setError(error.message);
        }
    };

    const unarchiveSavedLists = async (listIds) => {
        try {
            const response = await apiPut('/api/shopping/saved/unarchive', { listIds });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to unarchive lists');
            }

            setSelectedLists([]);
            fetchSavedLists();

            showToast(`Successfully unarchived ${listIds.length} list${listIds.length !== 1 ? 's' : ''}`);

        } catch (error) {
            console.error('Error unarchiving lists:', error);
            setError(error.message);
        }
    };

    const handleSelectList = (listId) => {
        setSelectedLists(prev =>
            prev.includes(listId)
                ? prev.filter(id => id !== listId)
                : [...prev, listId]
        );
    };

    const handleSelectAll = () => {
        setSelectedLists(
            selectedLists.length === savedLists.length
                ? []
                : savedLists.map(list => list.id)
        );
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'recipe': return '🍳';
            case 'recipes': return '📝';
            case 'meal-plan': return '📅';
            case 'custom': return '🛒';
            default: return '📋';
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'recipe': return 'text-green-600 bg-green-50';
            case 'recipes': return 'text-blue-600 bg-blue-50';
            case 'meal-plan': return 'text-purple-600 bg-purple-50';
            case 'custom': return 'text-yellow-600 bg-yellow-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    if (showingListData && showingList) {
        return (
            <MobileOptimizedLayout>
                <EnhancedAIShoppingListModal
                    isOpen={true}
                    onClose={() => {
                        setShowingList(null);
                        setShowingListData(null);
                    }}
                    shoppingList={showingListData}
                    title={`${showingList.name} (Loaded)`}
                    subtitle={`Saved on ${new Date(showingList.createdAt).toLocaleDateString()}`}
                    onRefresh={() => loadSavedList(showingList.id)}
                    showRefresh={true}
                />
            </MobileOptimizedLayout>
        );
    }

    return (
        <MobileOptimizedLayout>
            <div className="max-w-7xl mx-auto px-4 py-8 pb-16">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        💾 Saved Shopping Lists
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Manage your saved shopping lists and templates
                    </p>
                </div>

                {/* Stats Cards */}
                {Object.keys(stats).length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {Object.entries(stats).map(([type, data]) => (
                            <div key={type} className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`text-2xl p-2 rounded-lg ${getTypeColor(type)}`}>
                                        {getTypeIcon(type)}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900 capitalize">
                                            {type.replace('-', ' ')} Lists
                                        </div>
                                        <div className="text-gray-600 text-sm">
                                            {data.count} saved
                                        </div>
                                    </div>
                                </div>
                                <div className="text-gray-600 text-sm">
                                    {data.totalItems} total items
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Filter by Type
                            </label>
                            <select
                                value={filters.type}
                                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="all">All Types</option>
                                <option value="recipe">Single Recipe</option>
                                <option value="recipes">Multiple Recipes</option>
                                <option value="meal-plan">Meal Plans</option>
                                <option value="custom">Custom Lists</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Filter by Tags
                            </label>
                            <KeyboardOptimizedInput
                                type="text"
                                value={filters.tags}
                                onChange={(e) => setFilters({ ...filters, tags: e.target.value })}
                                placeholder="weekly, healthy, quick..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.includeArchived}
                                    onChange={(e) => setFilters({ ...filters, includeArchived: e.target.checked })}
                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-700">
                                    Include archived
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Bulk Actions - FIXED BUTTON STYLING */}
                {selectedLists.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="text-blue-800 font-medium">
                            {selectedLists.length} list{selectedLists.length !== 1 ? 's' : ''} selected
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <TouchEnhancedButton
                                onClick={() => deleteSavedLists(selectedLists, true)}
                                className="flex-1 sm:flex-initial bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                📦 Archive
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={() => deleteSavedLists(selectedLists, false)}
                                className="flex-1 sm:flex-initial bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                🗑️ Delete
                            </TouchEnhancedButton>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                {/* Loading State */}
                {loading ? (
                    <div className="flex items-center justify-center py-12 text-gray-600">
                        <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mr-4" />
                        Loading saved lists...
                    </div>
                ) : savedLists.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <div className="text-6xl mb-4">📋</div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            No saved shopping lists
                        </h3>
                        <p className="text-gray-600">
                            Create a shopping list and save it to see it here.
                        </p>
                    </div>
                ) : (
                    /* Shopping Lists Grid */
                    <div>
                        {/* Select All Header */}
                        <div className="flex items-center justify-between mb-4 px-2">
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                                <input
                                    type="checkbox"
                                    checked={selectedLists.length === savedLists.length && savedLists.length > 0}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                Select All ({savedLists.length} lists)
                            </label>
                            <div className="text-sm text-gray-600">
                                {savedLists.length} list{savedLists.length !== 1 ? 's' : ''} found
                            </div>
                        </div>

                        {/* Lists Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {savedLists.map(list => (
                                <div
                                    key={list.id}
                                    className={`bg-white rounded-lg border-2 shadow-md overflow-hidden transition-all ${
                                        selectedLists.includes(list.id)
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    {/* List Header */}
                                    <div className="p-6 border-b border-gray-100">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedLists.includes(list.id)}
                                                        onChange={() => handleSelectList(list.id)}
                                                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                                    />
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: list.color }}
                                                    />
                                                    <span className={`text-xs font-medium px-2 py-1 rounded uppercase ${getTypeColor(list.listType)}`}>
                                                        {list.listType.replace('-', ' ')}
                                                    </span>
                                                    {list.isTemplate && (
                                                        <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                                                            TEMPLATE
                                                        </span>
                                                    )}
                                                    {list.isArchived && (
                                                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                                            ARCHIVED
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                                    {list.name}
                                                </h3>
                                                {list.contextName && (
                                                    <div className="text-sm text-gray-600 mb-2">
                                                        {list.contextName}
                                                    </div>
                                                )}
                                                {list.description && (
                                                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                                        {list.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Tags */}
                                        {list.tags && list.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-4">
                                                {list.tags.map(tag => (
                                                    <span
                                                        key={tag}
                                                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                                                    >
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Stats */}
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="bg-gray-50 p-3 rounded-lg text-center">
                                                <div className="text-lg font-semibold text-gray-900">
                                                    {list.stats.totalItems}
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    Items
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-lg text-center">
                                                <div className="text-lg font-semibold text-gray-900">
                                                    {list.usage.timesLoaded || 0}
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    Uses
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions - WITH UNARCHIVE OPTION */}
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <TouchEnhancedButton
                                                onClick={() => loadSavedList(list.id)}
                                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                            >
                                                📋 Load List
                                            </TouchEnhancedButton>
                                            <div className="flex gap-2 sm:flex-shrink-0">
                                                {/* Show unarchive button for archived lists */}
                                                {list.isArchived ? (
                                                    <TouchEnhancedButton
                                                        onClick={() => unarchiveSavedLists([list.id])}
                                                        className="flex-1 sm:w-auto bg-green-600 hover:bg-green-700 text-white px-3 py-3 rounded-md text-sm transition-colors flex items-center justify-center gap-1"
                                                        title="Un-archive"
                                                    >
                                                        📤
                                                        <span className="sm:hidden">Un-archive</span>
                                                    </TouchEnhancedButton>
                                                ) : (
                                                    /* Show archive button for active lists */
                                                    <TouchEnhancedButton
                                                        onClick={() => deleteSavedLists([list.id], true)}
                                                        className="flex-1 sm:w-auto bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-3 rounded-md text-sm transition-colors flex items-center justify-center gap-1"
                                                        title="Archive"
                                                    >
                                                        📦
                                                        <span className="sm:hidden">Archive</span>
                                                    </TouchEnhancedButton>
                                                )}
                                                <TouchEnhancedButton
                                                    onClick={() => deleteSavedLists([list.id], false)}
                                                    className="flex-1 sm:w-auto bg-red-600 hover:bg-red-700 text-white px-3 py-3 rounded-md text-sm transition-colors flex items-center justify-center gap-1"
                                                    title="Delete"
                                                >
                                                    🗑️
                                                    <span className="sm:hidden">Delete</span>
                                                </TouchEnhancedButton>
                                            </div>
                                        </div>
                                    </div>

                                    {/* List Footer */}
                                    <div className="px-6 py-4 bg-gray-50 text-xs text-gray-600">
                                        <div className="flex justify-between">
                                            <div>
                                                Created {new Date(list.createdAt).toLocaleDateString()}
                                            </div>
                                            {list.usage.lastLoaded && (
                                                <div>
                                                    Last used {new Date(list.usage.lastLoaded).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <br/>
                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}