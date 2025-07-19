'use client';

// file: /src/components/recipes/EnhancedPagination.js v1 - Advanced pagination with load more and infinite scroll

import React from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';

export default function EnhancedPagination({
                                               currentPage,
                                               totalPages,
                                               totalItems,
                                               itemsPerPage,
                                               onPageChange,
                                               onLoadMore = null,
                                               showLoadMore = false,
                                               loading = false,
                                               className = ''
                                           }) {
    const getVisiblePages = () => {
        const delta = 2;
        const range = [];
        const rangeWithDots = [];

        for (let i = Math.max(2, currentPage - delta);
             i <= Math.min(totalPages - 1, currentPage + delta);
             i++) {
            range.push(i);
        }

        if (currentPage - delta > 2) {
            rangeWithDots.push(1, '...');
        } else {
            rangeWithDots.push(1);
        }

        rangeWithDots.push(...range);

        if (currentPage + delta < totalPages - 1) {
            rangeWithDots.push('...', totalPages);
        } else if (totalPages > 1) {
            rangeWithDots.push(totalPages);
        }

        return rangeWithDots;
    };

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    if (totalPages <= 1 && !showLoadMore) return null;

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Results Info */}
            <div className="text-center text-sm text-gray-600">
                Showing {startItem.toLocaleString()} to {endItem.toLocaleString()} of {totalItems.toLocaleString()} recipes
            </div>

            {/* Load More Button (Alternative to pagination) */}
            {showLoadMore && onLoadMore && currentPage < totalPages && (
                <div className="text-center">
                    <TouchEnhancedButton
                        onClick={onLoadMore}
                        disabled={loading}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? (
                            <>
                                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Loading...
                            </>
                        ) : (
                            <>
                                Load More Recipes ({totalItems - endItem} remaining)
                            </>
                        )}
                    </TouchEnhancedButton>
                </div>
            )}

            {/* Traditional Pagination */}
            {!showLoadMore && totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2">
                    {/* Previous Button */}
                    <TouchEnhancedButton
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1 || loading}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                        ← Previous
                    </TouchEnhancedButton>

                    {/* Page Numbers */}
                    <div className="hidden sm:flex items-center space-x-1">
                        {getVisiblePages().map((page, index) => (
                            <div key={index}>
                                {page === '...' ? (
                                    <span className="px-3 py-2 text-sm text-gray-500">...</span>
                                ) : (
                                    <TouchEnhancedButton
                                        onClick={() => onPageChange(page)}
                                        disabled={loading}
                                        className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                                            currentPage === page
                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                : 'border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                                        }`}
                                    >
                                        {page}
                                    </TouchEnhancedButton>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Mobile Page Indicator */}
                    <div className="sm:hidden px-3 py-2 text-sm text-gray-700">
                        {currentPage} of {totalPages}
                    </div>

                    {/* Next Button */}
                    <TouchEnhancedButton
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || loading}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                        Next →
                    </TouchEnhancedButton>
                </div>
            )}

            {/* Quick Jump (for large datasets) */}
            {totalPages > 10 && !showLoadMore && (
                <div className="text-center">
                    <div className="inline-flex items-center space-x-2 text-sm">
                        <span className="text-gray-600">Jump to page:</span>
                        <select
                            value={currentPage}
                            onChange={(e) => onPageChange(parseInt(e.target.value))}
                            disabled={loading}
                            className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                        >
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <option key={page} value={page}>
                                    {page}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
}
