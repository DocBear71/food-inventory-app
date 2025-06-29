'use client';
// file: /src/app/inventory/history/page.js v2 - Fixed mobile layout and scrolling

import { useSafeSession } from '@/hooks/useSafeSession';
import { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { getApiUrl } from '@/lib/api-config';

export default function ConsumptionHistoryPage() {
    const { data: session, status } = useSafeSession();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filterReason, setFilterReason] = useState('all');
    const [sortBy, setSortBy] = useState('date');

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/auth/signin');
        }
    }, [status]);

    useEffect(() => {
        if (session?.user?.id) {
            fetchHistory();
        }
    }, [session?.user?.id, filterReason]);

    const fetchHistory = async () => {
        setLoading(true);
        setError('');

        try {
            const params = new URLSearchParams({
                limit: '100'
            });

            if (filterReason !== 'all') {
                params.append('reason', filterReason);
            }

            let apiUrl;
            try {
                apiUrl = getApiUrl(`/api/inventory/consume?${params}`);
            } catch (e) {
                console.error('getApiUrl failed:', e);
                apiUrl = `/api/inventory/consume?${params}`;
            }

            const response = await fetch(apiUrl);
            const result = await response.json();

            if (result.success) {
                setHistory(result.history || []);
            } else {
                setError(result.error || 'Failed to fetch consumption history');
            }
        } catch (error) {
            console.error('Error fetching consumption history:', error);
            setError('Failed to load consumption history');
        } finally {
            setLoading(false);
        }
    };

    const reasonOptions = [
        { value: 'all', label: 'All Reasons', icon: '📊', color: 'gray' },
        { value: 'consumed', label: 'Consumed/Used', icon: '🍽️', color: 'green' },
        { value: 'recipe', label: 'Used in Recipe', icon: '👨‍🍳', color: 'blue' },
        { value: 'expired', label: 'Expired/Bad', icon: '🗑️', color: 'red' },
        { value: 'donated', label: 'Donated/Gifted', icon: '❤️', color: 'purple' },
        { value: 'spilled', label: 'Spilled/Wasted', icon: '💧', color: 'orange' },
        { value: 'other', label: 'Other Reason', icon: '📝', color: 'gray' }
    ];

    const getReasonInfo = (reason) => {
        return reasonOptions.find(opt => opt.value === reason) || reasonOptions[0];
    };

    const getSortedHistory = () => {
        let sorted = [...history];

        switch (sortBy) {
            case 'date':
                sorted.sort((a, b) => new Date(b.dateConsumed) - new Date(a.dateConsumed));
                break;
            case 'item':
                sorted.sort((a, b) => a.itemName.localeCompare(b.itemName));
                break;
            case 'quantity':
                sorted.sort((a, b) => b.quantityConsumed - a.quantityConsumed);
                break;
            case 'reason':
                sorted.sort((a, b) => a.reason.localeCompare(b.reason));
                break;
            default:
                break;
        }

        return sorted;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays === 1) {
            return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    const getReasonStats = () => {
        const stats = {};
        reasonOptions.forEach(option => {
            if (option.value !== 'all') {
                stats[option.value] = history.filter(item => item.reason === option.value).length;
            }
        });
        return stats;
    };

    // NEW: Undo consumption function
    const handleUndoConsumption = async (consumptionRecord) => {
        console.log('Consumption record for undo:', consumptionRecord);

        if (!consumptionRecord._id) {
            alert('Cannot undo this consumption - missing record ID. This may be an older record from before the undo feature was implemented.');
            return;
        }

        const consumptionDate = new Date(consumptionRecord.dateConsumed);
        const hoursSinceConsumption = (Date.now() - consumptionDate.getTime()) / (1000 * 60 * 60);

        if (hoursSinceConsumption > 24) {
            alert('Cannot undo consumptions older than 24 hours');
            return;
        }

        if (consumptionRecord.isReversed) {
            alert('This consumption has already been reversed');
            return;
        }

        if (consumptionRecord.isReversal) {
            alert('Cannot undo a reversal record');
            return;
        }

        const confirmMessage = `Are you sure you want to undo this consumption?\n\n` +
            `This will restore ${consumptionRecord.quantityConsumed} ${consumptionRecord.unitConsumed} of ${consumptionRecord.itemName} back to your inventory.`;

        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            let apiUrl;
            try {
                apiUrl = getApiUrl(`/api/inventory/consume?consumptionId=${consumptionRecord._id}`);
            } catch (e) {
                apiUrl = `/api/inventory/consume?consumptionId=${consumptionRecord._id}`;
            }

            const response = await fetch(apiUrl, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                alert(result.message);
                await fetchHistory();

                if (window.dispatchEvent) {
                    window.dispatchEvent(new CustomEvent('inventoryUpdated'));
                }
            } else {
                alert(result.error || 'Failed to undo consumption');
            }
        } catch (error) {
            console.error('Error undoing consumption:', error);
            alert('Error undoing consumption: ' + error.message);
        }
    };

    const canUndo = (record) => {
        if (record.isReversed || record.isReversal) {
            return false;
        }

        const consumptionDate = new Date(record.dateConsumed);
        const hoursSinceConsumption = (Date.now() - consumptionDate.getTime()) / (1000 * 60 * 60);

        if (hoursSinceConsumption > 24) {
            return false;
        }

        return true;
    };

    if (status === 'loading') {
        return (
            <MobileOptimizedLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <div className="text-lg text-gray-600">Loading dashboard...</div>
                    </div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    if (!session) {
        return null;
    }

    const sortedHistory = getSortedHistory();
    const reasonStats = getReasonStats();

    return (
        <MobileOptimizedLayout>
            {/* FIXED: Better mobile layout with proper height management */}
            <div className="min-h-screen flex flex-col">
                {/* Header - Fixed at top */}
                <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-4 flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">📊 Usage History</h1>
                            <p className="text-sm text-gray-600 mt-1">Track consumed and removed items</p>
                        </div>
                        <TouchEnhancedButton
                            onClick={() => window.history.back()}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                            ← Back
                        </TouchEnhancedButton>
                    </div>
                </div>

                {/* Stats Overview - Compact for mobile */}
                <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
                    <h2 className="text-sm font-semibold text-gray-900 mb-2">Overview</h2>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        {reasonOptions.slice(1).map((option) => {
                            const count = reasonStats[option.value] || 0;
                            return (
                                <div key={option.value} className="text-center p-2 bg-gray-50 rounded">
                                    <div className="text-lg">{option.icon}</div>
                                    <div className="text-sm font-semibold text-gray-900">{count}</div>
                                    <div className="text-xs text-gray-600 leading-tight">{option.label}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Filters - Compact for mobile */}
                <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Filter by Reason
                            </label>
                            <select
                                value={filterReason}
                                onChange={(e) => setFilterReason(e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            >
                                {reasonOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label} {option.value !== 'all' ? `(${reasonStats[option.value] || 0})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Sort by
                            </label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            >
                                <option value="date">Date (Recent First)</option>
                                <option value="item">Item Name</option>
                                <option value="quantity">Quantity</option>
                                <option value="reason">Reason</option>
                            </select>
                        </div>

                        <div className="flex items-end">
                            <div className="text-xs text-gray-500 whitespace-nowrap">
                                {sortedHistory.length} records
                            </div>
                        </div>
                    </div>
                </div>

                {/* FIXED: History List - Takes remaining space and properly scrollable */}
                <div className="flex-1 bg-gray-50 overflow-hidden">
                    <div className="h-full overflow-y-auto px-4 py-4">
                        {loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                                <div className="text-gray-500">Loading consumption history...</div>
                            </div>
                        ) : error ? (
                            <div className="text-center py-8">
                                <div className="text-red-600 mb-4">❌ {error}</div>
                                <TouchEnhancedButton
                                    onClick={fetchHistory}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                >
                                    Try Again
                                </TouchEnhancedButton>
                            </div>
                        ) : sortedHistory.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="text-4xl mb-4">📦</div>
                                <div className="text-gray-500 text-lg mb-2">No consumption history yet</div>
                                <div className="text-gray-400 text-sm">
                                    Start using items from your inventory to see consumption tracking here
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3 pb-4">
                                {sortedHistory.map((record, index) => {
                                    const reasonInfo = getReasonInfo(record.reason);

                                    return (
                                        <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start space-x-3 flex-1 min-w-0">
                                                    <div className="text-xl flex-shrink-0">{reasonInfo.icon}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center space-x-2">
                                                            <h4 className="font-medium text-gray-900 truncate">
                                                                {record.itemName}
                                                            </h4>
                                                            {record.ingredient && record.ingredient !== record.itemName && (
                                                                <span className="text-sm text-gray-500 truncate">
                                                                    (used as {record.ingredient})
                                                                </span>
                                                            )}
                                                            {record.isDualUnitConsumption && (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex-shrink-0">
                                                                    Dual
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="mt-1 space-y-1">
                                                            <div className="text-sm text-gray-600">
                                                                <span className="font-medium">Used:</span> {record.quantityConsumed} {record.unitConsumed}
                                                                {record.remainingQuantity > 0 && (
                                                                    <span className="ml-2">
                                                                        • <span className="font-medium">Left:</span> {record.remainingQuantity} {record.unitConsumed}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                    reasonInfo.color === 'green' ? 'bg-green-100 text-green-800' :
                                                                        reasonInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                                                                            reasonInfo.color === 'red' ? 'bg-red-100 text-red-800' :
                                                                                reasonInfo.color === 'purple' ? 'bg-purple-100 text-purple-800' :
                                                                                    reasonInfo.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                                                                                        'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                    {reasonInfo.label}
                                                                </span>
                                                                <span className="truncate">{formatDate(record.dateConsumed)}</span>
                                                            </div>

                                                            {record.recipeName && (
                                                                <div className="text-sm text-blue-600 truncate">
                                                                    🍽️ Recipe: {record.recipeName}
                                                                </div>
                                                            )}

                                                            {record.notes && (
                                                                <div className="text-sm text-gray-600 italic truncate">
                                                                    "{record.notes}"
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right flex flex-col items-end ml-2 flex-shrink-0">
                                                    <div className="text-xs text-gray-400">
                                                        {new Date(record.dateConsumed).toLocaleDateString()}
                                                    </div>

                                                    {/* Undo Button */}
                                                    {canUndo(record) && (
                                                        <TouchEnhancedButton
                                                            onClick={() => handleUndoConsumption(record)}
                                                            className="mt-2 px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 border border-orange-300"
                                                            title={!record._id ? "This is an older record - undo may not work" : "Undo this consumption (restore to inventory)"}
                                                        >
                                                            {!record._id ? '⚠️ Try' : '↶ Undo'}
                                                        </TouchEnhancedButton>
                                                    )}

                                                    {record.isReversed && (
                                                        <div className="text-xs text-orange-500 font-medium mt-1">
                                                            ↶ Reversed
                                                        </div>
                                                    )}

                                                    {record.isReversal && (
                                                        <div className="text-xs text-blue-500 font-medium mt-1">
                                                            ↶ Undo Action
                                                        </div>
                                                    )}

                                                    {record.remainingQuantity === 0 && (
                                                        <div className="text-xs text-red-500 font-medium mt-1">
                                                            Removed
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </MobileOptimizedLayout>
    );
}