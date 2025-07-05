'use client';
// file: /src/components/inventory/ConsumptionHistory.js v2 - Enhanced with dual unit support and better display

import {useState, useEffect} from 'react';
import {useSafeSession} from '@/hooks/useSafeSession';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import FeatureGate from '@/components/subscription/FeatureGate';
import {FEATURE_GATES} from '@/lib/subscription-config';
import { apiGet, apiDelete } from '@/lib/api-config';

export default function ConsumptionHistory({onClose}) {
    const {data: session} = useSafeSession();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filterReason, setFilterReason] = useState('all');
    const [sortBy, setSortBy] = useState('date');
    const [showStats, setShowStats] = useState(false);
    const [showFilters, setShowFilters] = useState(true);

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
                limit: '100',
                reason: filterReason
            });

            const response = await apiGet(`/api/inventory/consume?${params}`);
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
        {value: 'all', label: 'All Reasons', icon: '📊', color: 'gray'},
        {value: 'consumed', label: 'Consumed/Used', icon: '🍽️', color: 'green'},
        {value: 'recipe', label: 'Used in Recipe', icon: '👨‍🍳', color: 'blue'},
        {value: 'expired', label: 'Expired/Bad', icon: '🗑️', color: 'red'},
        {value: 'donated', label: 'Donated/Gifted', icon: '❤️', color: 'purple'},
        {value: 'spilled', label: 'Spilled/Wasted', icon: '💧', color: 'orange'},
        {value: 'other', label: 'Other Reason', icon: '📝', color: 'gray'}
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
            return `Today at ${date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`;
        } else if (diffDays === 1) {
            return `Yesterday at ${date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`;
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    // Enhanced display text formatting for dual unit consumption
    const formatConsumptionText = (record) => {
        // Use the backend-provided display text if available
        if (record.displayText) {
            return record.displayText;
        }

        // Fallback to manual formatting for older records
        if (record.isDualUnitConsumption) {
            let consumptionText = `${record.quantityConsumed} ${record.unitConsumed} consumed`;

            if (record.primaryQuantityChange && record.primaryQuantityChange > 0) {
                consumptionText += ` (${record.primaryQuantityChange} ${record.unitConsumed})`;
            }

            if (record.secondaryQuantityChange && record.secondaryQuantityChange > 0) {
                const secondaryUnit = record.originalSecondaryUnit || 'items';
                consumptionText += ` (${record.secondaryQuantityChange} ${secondaryUnit})`;
            }

            return consumptionText;
        }

        // Standard single unit consumption
        return `${record.quantityConsumed} ${record.unitConsumed} consumed`;
    };

    const formatRemainingText = (record) => {
        // Use the backend-provided display text if available
        if (record.remainingDisplayText) {
            return record.remainingDisplayText;
        }

        // Fallback to manual formatting
        if (record.isDualUnitConsumption) {
            const primaryRemaining = record.remainingQuantity || 0;
            const secondaryRemaining = record.remainingSecondaryQuantity || 0;

            if (primaryRemaining <= 0 && secondaryRemaining <= 0) {
                return 'Item completely consumed';
            }

            const primaryUnit = record.unitConsumed || 'units';
            const secondaryUnit = record.originalSecondaryUnit || 'items';

            return `${primaryRemaining} ${primaryUnit}, ${secondaryRemaining} ${secondaryUnit} remaining`;
        }

        // Standard single unit remaining
        if (record.remainingQuantity > 0) {
            return `${record.remainingQuantity} ${record.unitConsumed} remaining`;
        }

        return 'Item completely consumed';
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

    const sortedHistory = getSortedHistory();
    const reasonStats = getReasonStats();

    const handleUndoConsumption = async (consumptionRecord) => {
        // Debug: Check what we have in the record
        console.log('Consumption record for undo:', consumptionRecord);
        console.log('Record _id:', consumptionRecord._id);
        console.log('Record keys:', Object.keys(consumptionRecord));

        // Check if we have a valid ID
        if (!consumptionRecord._id) {
            alert('Cannot undo this consumption - missing record ID. This may be an older record from before the undo feature was implemented.');
            return;
        }

        // Check if it can be undone
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
            console.log('Making undo request with ID:', consumptionRecord._id);

            const response = await apiDelete(`/api/inventory/consume?consumptionId=${consumptionRecord._id}`);


            const result = await response.json();
            console.log('Undo response:', result);

            if (result.success) {
                alert(result.message);
                // Refresh the history and trigger inventory refresh in parent
                await fetchHistory();

                // If there's a way to refresh the main inventory, call it
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
        // Debug: Log what we're checking
        console.log('Checking canUndo for record:', {
            hasId: !!record._id,
            id: record._id,
            isReversed: record.isReversed,
            isReversal: record.isReversal,
            itemName: record.itemName,
            dateConsumed: record.dateConsumed
        });

        // For now, let's be more permissive and see what happens
        if (record.isReversed || record.isReversal) {
            console.log('Cannot undo: already reversed or is a reversal');
            return false;
        }

        const consumptionDate = new Date(record.dateConsumed);
        const hoursSinceConsumption = (Date.now() - consumptionDate.getTime()) / (1000 * 60 * 60);

        if (hoursSinceConsumption > 24) {
            console.log('Cannot undo: too old (', hoursSinceConsumption, 'hours)');
            return false;
        }

        // Temporarily allow records without _id for debugging
        if (!record._id) {
            console.log('Record has no _id - this is an older record');
            return true; // Allow for now, but show different message
        }

        console.log('Can undo this record');
        return true;
    };

    // Replace the existing modal structure with this fixed version:

    return (
        <FeatureGate
            feature={FEATURE_GATES.CONSUMPTION_HISTORY}
            fallback={
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-t-lg">
                            <div className="text-center">
                                <div className="text-4xl mb-2">📊</div>
                                <h2 className="text-xl font-bold">Consumption History</h2>
                                <p className="text-blue-100 text-sm mt-1">Premium Feature</p>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="text-center mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Track Your Usage with Gold
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    See detailed history of what you've consumed, used in recipes, or removed from your
                                    inventory. Perfect for tracking eating habits and reducing food waste.
                                </p>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                    <div className="text-blue-800 text-sm">
                                        <div className="font-medium mb-2">📊 What you get with Gold:</div>
                                        <ul className="text-left space-y-1">
                                            <li>• Complete consumption history</li>
                                            <li>• Usage statistics by category</li>
                                            <li>• Recipe ingredient tracking</li>
                                            <li>• Waste reduction insights</li>
                                            <li>• Export consumption data</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <TouchEnhancedButton
                                    onClick={() => window.location.href = '/pricing?source=consumption-history'}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg"
                                >
                                    🚀 Upgrade to Gold - $4.99/month
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={onClose}
                                    className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-lg"
                                >
                                    Maybe Later
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>
                </div>
            }
        >
            {/* FIXED: Modal with collapsible sections */}
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl flex flex-col" style={{ height: '90vh' }}>
                    {/* Fixed Header - Always visible */}
                    <div className="bg-gray-50 px-4 sm:px-6 py-3 border-b border-gray-200 flex-shrink-0">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    📊 Consumption History
                                </h2>
                                <p className="text-xs text-gray-600">
                                    {sortedHistory.length} records • {history.filter(r => r.isDualUnitConsumption).length} dual-unit
                                </p>
                            </div>
                            <TouchEnhancedButton
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
                            >
                                ×
                            </TouchEnhancedButton>
                        </div>
                    </div>

                    {/* COLLAPSIBLE: Stats Overview */}
                    <div className="border-b border-gray-200 flex-shrink-0">
                        <TouchEnhancedButton
                            onClick={() => setShowStats(!showStats)}
                            className="w-full px-4 sm:px-6 py-2 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-colors"
                        >
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-700">📊 Statistics Overview</span>
                                <span className="text-xs text-gray-500">
                                ({reasonOptions.slice(1).reduce((sum, option) => sum + (reasonStats[option.value] || 0), 0)} total)
                            </span>
                            </div>
                            <div className={`transform transition-transform ${showStats ? 'rotate-180' : ''}`}>
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </TouchEnhancedButton>

                        {showStats && (
                            <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-100">
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                    {reasonOptions.slice(1).map((option) => {
                                        const count = reasonStats[option.value] || 0;
                                        return (
                                            <div key={option.value} className="text-center p-2 bg-white rounded shadow-sm">
                                                <div className="text-base sm:text-lg">{option.icon}</div>
                                                <div className="text-sm font-semibold text-gray-900">{count}</div>
                                                <div className="text-xs text-gray-600 leading-tight">
                                                <span className="sm:hidden">
                                                    {option.label.split('/')[0]}
                                                </span>
                                                    <span className="hidden sm:inline">
                                                    {option.label}
                                                </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* COLLAPSIBLE: Filters */}
                    <div className="border-b border-gray-200 flex-shrink-0">
                        <TouchEnhancedButton
                            onClick={() => setShowFilters(!showFilters)}
                            className="w-full px-4 sm:px-6 py-2 bg-white hover:bg-gray-50 flex items-center justify-between text-left transition-colors"
                        >
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-700">🔍 Filters & Sorting</span>
                                <span className="text-xs text-gray-500">
                                ({filterReason === 'all' ? 'All reasons' : reasonOptions.find(r => r.value === filterReason)?.label})
                            </span>
                            </div>
                            <div className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`}>
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </TouchEnhancedButton>

                        {showFilters && (
                            <div className="px-4 sm:px-6 py-3 border-t border-gray-100">
                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Reason</label>
                                        <select
                                            value={filterReason}
                                            onChange={(e) => setFilterReason(e.target.value)}
                                            className="w-full border-gray-300 rounded text-sm py-1 px-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            {reasonOptions.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label} {option.value !== 'all' ? `(${reasonStats[option.value] || 0})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Sort by</label>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            className="w-full border-gray-300 rounded text-sm py-1 px-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            <option value="date">Date (Recent First)</option>
                                            <option value="item">Item Name</option>
                                            <option value="quantity">Quantity</option>
                                            <option value="reason">Reason</option>
                                        </select>
                                    </div>

                                    <div className="flex gap-2">
                                        <TouchEnhancedButton
                                            onClick={fetchHistory}
                                            className="px-3 py-1 text-xs border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50"
                                        >
                                            🔄 Refresh
                                        </TouchEnhancedButton>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* MAIN CONTENT: History List - Takes up most of the space */}
                    <div className="flex-1 bg-gray-50 overflow-hidden w-full">
                        <div className="h-full overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-3 w-full">
                            {loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                                        <div className="text-gray-500">Loading consumption history...</div>
                                    </div>
                                </div>
                            ) : error ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <div className="text-red-600 mb-4">❌ {error}</div>
                                        <TouchEnhancedButton
                                            onClick={fetchHistory}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                        >
                                            Try Again
                                        </TouchEnhancedButton>
                                    </div>
                                </div>
                            ) : sortedHistory.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <div className="text-6xl mb-4">📦</div>
                                        <div className="text-gray-500 text-lg mb-2">No consumption history yet</div>
                                        <div className="text-gray-400 text-sm">
                                            Start using items from your inventory to see consumption tracking here
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3 pb-4">
                                    {sortedHistory.map((record, index) => {
                                        const reasonInfo = getReasonInfo(record.reason);

                                        return (
                                            <div key={`${record._id || index}-${record.dateConsumed}`}
                                                 className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow w-full overflow-hidden">

                                                <div className="space-y-2 w-full">
                                                    {/* Top row: Item name and date */}
                                                    <div className="flex items-start justify-between w-full">
                                                        <div className="flex items-center space-x-2 flex-1 min-w-0 overflow-hidden">
                                                            <div className="text-lg flex-shrink-0">{reasonInfo.icon}</div>
                                                            <div className="min-w-0 flex-1 overflow-hidden">
                                                                <h4 className="font-medium text-gray-900 text-sm truncate">
                                                                    {record.itemName}
                                                                </h4>
                                                                {record.ingredient && record.ingredient !== record.itemName && (
                                                                    <div className="text-xs text-gray-500 truncate">
                                                                        (used as {record.ingredient})
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="text-right flex-shrink-0 ml-2">
                                                            <div className="text-xs text-gray-400 whitespace-nowrap">
                                                                {new Date(record.dateConsumed).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Second row: Consumption details */}
                                                    <div className="text-sm text-gray-600 space-y-1 w-full overflow-hidden">
                                                        <div className="break-words">
                                                            <span className="font-medium">Consumed:</span> {formatConsumptionText(record)}
                                                        </div>
                                                        <div className="break-words">
                                                            <span className="font-medium">Status:</span> {formatRemainingText(record)}
                                                        </div>
                                                    </div>

                                                    {/* Third row: Tags and metadata */}
                                                    <div className="flex flex-wrap items-center gap-1 w-full">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                                                        reasonInfo.color === 'green' ? 'bg-green-100 text-green-800' :
                                                            reasonInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                                                                reasonInfo.color === 'red' ? 'bg-red-100 text-red-800' :
                                                                    reasonInfo.color === 'purple' ? 'bg-purple-100 text-purple-800' :
                                                                        reasonInfo.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                                                                            'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {reasonInfo.label}
                                                    </span>

                                                        {record.isDualUnitConsumption && (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex-shrink-0">
                                                            Dual
                                                        </span>
                                                        )}

                                                        <span className="text-xs text-gray-500 truncate">
                                                        {formatDate(record.dateConsumed)}
                                                    </span>
                                                    </div>

                                                    {/* Optional: Recipe info */}
                                                    {record.recipeName && (
                                                        <div className="text-xs text-blue-600 truncate w-full">
                                                            🍽️ Recipe: {record.recipeName}
                                                        </div>
                                                    )}

                                                    {/* Optional: Notes */}
                                                    {record.notes && (
                                                        <div className="text-xs text-gray-600 italic bg-gray-50 p-2 rounded break-words w-full">
                                                            "{record.notes}"
                                                        </div>
                                                    )}

                                                    {/* Action row: Undo button and status */}
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-gray-100 gap-2 w-full">
                                                        <div className="flex flex-wrap gap-1 text-xs min-w-0">
                                                            {record.isReversed && (
                                                                <span className="text-orange-500 font-medium whitespace-nowrap">
                                                                ↶ Reversed
                                                            </span>
                                                            )}

                                                            {record.isReversal && (
                                                                <span className="text-blue-500 font-medium whitespace-nowrap">
                                                                ↶ Undo Action
                                                            </span>
                                                            )}

                                                            {((record.remainingQuantity || 0) === 0 && (record.remainingSecondaryQuantity || 0) === 0) && (
                                                                <span className="text-red-500 font-medium whitespace-nowrap">
                                                                Item Removed
                                                            </span>
                                                            )}
                                                        </div>

                                                        {/* Undo Button - Stack on mobile */}
                                                        {canUndo(record) && (
                                                            <TouchEnhancedButton
                                                                onClick={() => handleUndoConsumption(record)}
                                                                className="px-3 py-1.5 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 border border-orange-300 transition-colors font-medium flex-shrink-0 w-full sm:w-auto text-center"
                                                                title={!record._id ? "This is an older record - undo may not work" : "Undo this consumption (restore to inventory)"}
                                                            >
                                                                {!record._id ? '⚠️ Try Undo' : '↶ Undo'}
                                                            </TouchEnhancedButton>
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

                    {/* Fixed Footer - Minimal */}
                    <div className="border-t border-gray-200 px-4 sm:px-6 py-2 bg-gray-50 flex-shrink-0">
                        <div className="flex justify-center">
                            <TouchEnhancedButton
                                onClick={onClose}
                                className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                            >
                                Close
                            </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>
                </div>
        </FeatureGate>
    );
}