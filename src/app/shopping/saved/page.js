// file: /src/app/shopping/saved/page.js v1

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ShoppingListDisplay from '@/components/shopping/ShoppingListDisplay';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';

export default function SavedShoppingListsPage() {
    const { data: session } = useSession();
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

            const response = await fetch(`/api/shopping/saved?${params}`);
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
            const response = await fetch(`/api/shopping/saved/${listId}/load`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resetPurchased: true,
                    updateInventoryStatus: true,
                    startShoppingSession: true,
                    ...options
                })
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
            const response = await fetch('/api/shopping/saved', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ listIds, archive })
            });

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
            case 'recipe': return '#10b981';
            case 'recipes': return '#3b82f6';
            case 'meal-plan': return '#8b5cf6';
            case 'custom': return '#f59e0b';
            default: return '#6b7280';
        }
    };

    if (showingListData && showingList) {
        return (
            <MobileOptimizedLayout>
                <ShoppingListDisplay
                    shoppingList={showingListData}
                    onClose={() => {
                        setShowingList(null);
                        setShowingListData(null);
                    }}
                    onRefresh={() => loadSavedList(showingList.id)}
                    title={`${showingList.name} (Loaded)`}
                    subtitle={`Saved on ${new Date(showingList.createdAt).toLocaleDateString()}`}
                />
            </MobileOptimizedLayout>
        );
    }

    return (
        <MobileOptimizedLayout>
            <div style={{ padding: '2rem' }}>
                {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        marginBottom: '0.5rem',
                        color: '#111827'
                    }}>
                        💾 Saved Shopping Lists
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '1rem' }}>
                        Manage your saved shopping lists and templates
                    </p>
                </div>

                {/* Stats Cards */}
                {Object.keys(stats).length > 0 && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem',
                        marginBottom: '2rem'
                    }}>
                        {Object.entries(stats).map(([type, data]) => (
                            <div key={type} style={{
                                backgroundColor: 'white',
                                padding: '1.5rem',
                                borderRadius: '12px',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                                border: '1px solid #e5e7eb'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    marginBottom: '0.5rem'
                                }}>
                                    <div style={{
                                        fontSize: '1.5rem',
                                        backgroundColor: getTypeColor(type),
                                        color: 'white',
                                        padding: '0.5rem',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {getTypeIcon(type)}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                                            {type.replace('-', ' ')} Lists
                                        </div>
                                        <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                            {data.count} saved
                                        </div>
                                    </div>
                                </div>
                                <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                    {data.totalItems} total items
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Filters */}
                <div style={{
                    backgroundColor: 'white',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e5e7eb',
                    marginBottom: '2rem'
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem',
                        alignItems: 'end'
                    }}>
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                marginBottom: '0.5rem',
                                color: '#374151'
                            }}>
                                Filter by Type
                            </label>
                            <select
                                value={filters.type}
                                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    fontSize: '0.875rem'
                                }}
                            >
                                <option value="all">All Types</option>
                                <option value="recipe">Single Recipe</option>
                                <option value="recipes">Multiple Recipes</option>
                                <option value="meal-plan">Meal Plans</option>
                                <option value="custom">Custom Lists</option>
                            </select>
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                marginBottom: '0.5rem',
                                color: '#374151'
                            }}>
                                Filter by Tags
                            </label>
                            <input
                                type="text"
                                value={filters.tags}
                                onChange={(e) => setFilters({ ...filters, tags: e.target.value })}
                                placeholder="weekly, healthy, quick..."
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    fontSize: '0.875rem'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                cursor: 'pointer'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={filters.includeArchived}
                                    onChange={(e) => setFilters({ ...filters, includeArchived: e.target.checked })}
                                />
                                <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                                    Include archived
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedLists.length > 0 && (
                    <div style={{
                        backgroundColor: '#eff6ff',
                        border: '1px solid #dbeafe',
                        borderRadius: '8px',
                        padding: '1rem',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ color: '#1e40af', fontWeight: '500' }}>
                            {selectedLists.length} list{selectedLists.length !== 1 ? 's' : ''} selected
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <TouchEnhancedButton
                                onClick={() => deleteSavedLists(selectedLists, true)}
                                style={{
                                    backgroundColor: '#f59e0b',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer'
                                }}
                            >
                                📦 Archive
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={() => deleteSavedLists(selectedLists, false)}
                                style={{
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer'
                                }}
                            >
                                🗑️ Delete
                            </TouchEnhancedButton>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div style={{
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginBottom: '1rem'
                    }}>
                        {error}
                    </div>
                )}

                {/* Loading State */}
                {loading ? (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '3rem',
                        color: '#6b7280'
                    }}>
                        <div style={{
                            width: '2rem',
                            height: '2rem',
                            border: '3px solid #e5e7eb',
                            borderTop: '3px solid #3b82f6',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            marginRight: '1rem'
                        }} />
                        Loading saved lists...
                    </div>
                ) : savedLists.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '3rem',
                        color: '#6b7280'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                            No saved shopping lists
                        </h3>
                        <p>
                            Create a shopping list and save it to see it here.
                        </p>
                    </div>
                ) : (
                    /* Shopping Lists Grid */
                    <div>
                        {/* Select All Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '1rem',
                            padding: '0 0.5rem'
                        }}>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                color: '#6b7280'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={selectedLists.length === savedLists.length && savedLists.length > 0}
                                    onChange={handleSelectAll}
                                />
                                Select All ({savedLists.length} lists)
                            </label>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                {savedLists.length} list{savedLists.length !== 1 ? 's' : ''} found
                            </div>
                        </div>

                        {/* Lists Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                            gap: '1.5rem'
                        }}>
                            {savedLists.map(list => (
                                <div
                                    key={list.id}
                                    style={{
                                        backgroundColor: 'white',
                                        borderRadius: '12px',
                                        border: selectedLists.includes(list.id)
                                            ? '2px solid #3b82f6'
                                            : '1px solid #e5e7eb',
                                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                                        overflow: 'hidden',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {/* List Header */}
                                    <div style={{
                                        padding: '1.5rem',
                                        borderBottom: '1px solid #f3f4f6'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            justifyContent: 'space-between',
                                            marginBottom: '1rem'
                                        }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    marginBottom: '0.5rem'
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedLists.includes(list.id)}
                                                        onChange={() => handleSelectList(list.id)}
                                                        style={{ margin: 0 }}
                                                    />
                                                    <div
                                                        style={{
                                                            width: '0.75rem',
                                                            height: '0.75rem',
                                                            borderRadius: '50%',
                                                            backgroundColor: list.color
                                                        }}
                                                    />
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: '500',
                                                        color: getTypeColor(list.listType),
                                                        backgroundColor: `${getTypeColor(list.listType)}20`,
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '4px',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {list.listType.replace('-', ' ')}
                                                    </span>
                                                    {list.isTemplate && (
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            color: '#8b5cf6',
                                                            backgroundColor: '#f3e8ff',
                                                            padding: '0.25rem 0.5rem',
                                                            borderRadius: '4px'
                                                        }}>
                                                            TEMPLATE
                                                        </span>
                                                    )}
                                                    {list.isArchived && (
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            color: '#6b7280',
                                                            backgroundColor: '#f3f4f6',
                                                            padding: '0.25rem 0.5rem',
                                                            borderRadius: '4px'
                                                        }}>
                                                            ARCHIVED
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 style={{
                                                    fontSize: '1.125rem',
                                                    fontWeight: '600',
                                                    margin: '0 0 0.25rem 0',
                                                    color: '#111827'
                                                }}>
                                                    {list.name}
                                                </h3>
                                                {list.contextName && (
                                                    <div style={{
                                                        fontSize: '0.875rem',
                                                        color: '#6b7280',
                                                        marginBottom: '0.5rem'
                                                    }}>
                                                        {list.contextName}
                                                    </div>
                                                )}
                                                {list.description && (
                                                    <p style={{
                                                        fontSize: '0.875rem',
                                                        color: '#6b7280',
                                                        margin: '0 0 0.5rem 0',
                                                        lineHeight: '1.4'
                                                    }}>
                                                        {list.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Tags */}
                                        {list.tags && list.tags.length > 0 && (
                                            <div style={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: '0.25rem',
                                                marginBottom: '1rem'
                                            }}>
                                                {list.tags.map(tag => (
                                                    <span
                                                        key={tag}
                                                        style={{
                                                            fontSize: '0.75rem',
                                                            backgroundColor: '#f3f4f6',
                                                            color: '#6b7280',
                                                            padding: '0.25rem 0.5rem',
                                                            borderRadius: '4px'
                                                        }}
                                                    >
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Stats */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(2, 1fr)',
                                            gap: '0.5rem',
                                            marginBottom: '1rem'
                                        }}>
                                            <div style={{
                                                backgroundColor: '#f8fafc',
                                                padding: '0.75rem',
                                                borderRadius: '6px',
                                                textAlign: 'center'
                                            }}>
                                                <div style={{
                                                    fontSize: '1.25rem',
                                                    fontWeight: '600',
                                                    color: '#1e293b'
                                                }}>
                                                    {list.stats.totalItems}
                                                </div>
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    color: '#64748b'
                                                }}>
                                                    Items
                                                </div>
                                            </div>
                                            <div style={{
                                                backgroundColor: '#f8fafc',
                                                padding: '0.75rem',
                                                borderRadius: '6px',
                                                textAlign: 'center'
                                            }}>
                                                <div style={{
                                                    fontSize: '1.25rem',
                                                    fontWeight: '600',
                                                    color: '#1e293b'
                                                }}>
                                                    {list.usage.timesLoaded || 0}
                                                </div>
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    color: '#64748b'
                                                }}>
                                                    Uses
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{
                                            display: 'flex',
                                            gap: '0.5rem'
                                        }}>
                                            <TouchEnhancedButton
                                                onClick={() => loadSavedList(list.id)}
                                                style={{
                                                    flex: 1,
                                                    backgroundColor: '#3b82f6',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '0.75rem',
                                                    fontSize: '0.875rem',
                                                    fontWeight: '500',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.5rem'
                                                }}
                                            >
                                                📋 Load List
                                            </TouchEnhancedButton>
                                            <TouchEnhancedButton
                                                onClick={() => deleteSavedLists([list.id], true)}
                                                style={{
                                                    backgroundColor: '#f59e0b',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '0.75rem',
                                                    fontSize: '0.875rem',
                                                    cursor: 'pointer'
                                                }}
                                                title="Archive"
                                            >
                                                📦
                                            </TouchEnhancedButton>
                                            <TouchEnhancedButton
                                                onClick={() => deleteSavedLists([list.id], false)}
                                                style={{
                                                    backgroundColor: '#ef4444',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '0.75rem',
                                                    fontSize: '0.875rem',
                                                    cursor: 'pointer'
                                                }}
                                                title="Delete"
                                            >
                                                🗑️
                                            </TouchEnhancedButton>
                                        </div>
                                    </div>

                                    {/* List Footer */}
                                    <div style={{
                                        padding: '1rem 1.5rem',
                                        backgroundColor: '#f9fafb',
                                        fontSize: '0.75rem',
                                        color: '#6b7280'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between'
                                        }}>
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
            </div>

            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </MobileOptimizedLayout>
    );
}