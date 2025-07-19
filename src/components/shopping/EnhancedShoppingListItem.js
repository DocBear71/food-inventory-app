'use client';

// file: /src/components/shopping/EnhancedShoppingListItem.js v1 - Shopping list item with price editing

import React, { useState } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import ShoppingListItemPriceEntry from '@/components/shopping/ShoppingListItemPriceEntry';

export default function EnhancedShoppingListItem({
                                                     item,
                                                     onToggle,
                                                     onPriceUpdate,
                                                     userPreferences = {},
                                                     showPrices = true,
                                                     reorderMode = false,
                                                     // Drag and drop props
                                                     draggable = false,
                                                     onDragStart = null,
                                                     onDragEnd = null,
                                                     onDragOver = null,
                                                     onDragEnter = null,
                                                     onDrop = null,
                                                     isDraggedOver = false,
                                                     isDragging = false
                                                 }) {
    const [showPriceEntry, setShowPriceEntry] = useState(false);
    const [localItem, setLocalItem] = useState(item);

    const currencySymbol = userPreferences.currencySymbol || '$';
    const isPurchased = localItem.purchased;
    const hasPrice = !!(localItem.price || localItem.unitPrice || localItem.estimatedPrice);
    const price = localItem.price || localItem.unitPrice || localItem.estimatedPrice;
    const isEstimated = !!(localItem.estimatedPrice && !localItem.price && !localItem.unitPrice);

    const handlePriceUpdate = async (updatedItem) => {
        setLocalItem(updatedItem);
        if (onPriceUpdate) {
            await onPriceUpdate(updatedItem);
        }
    };

    const formatPrice = (price) => {
        if (!price) return null;
        const formatted = parseFloat(price).toFixed(userPreferences.decimalPlaces || 2);
        return userPreferences.currencyPosition === 'after' ?
            `${formatted}${currencySymbol}` :
            `${currencySymbol}${formatted}`;
    };

    const itemStyle = {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.75rem',
        backgroundColor: isPurchased ? '#f0fdf4' :
            isDraggedOver ? '#e0f2fe' :
                '#fafafa',
        borderRadius: '8px',
        border: reorderMode ? '2px dashed #d1d5db' : '1px solid #e5e7eb',
        opacity: isPurchased ? 0.7 : 1,
        textDecoration: isPurchased ? 'line-through' : 'none',
        cursor: reorderMode ? 'grab' : 'default',
        transition: 'all 0.2s ease',
        transform: isDragging ? 'scale(1.02)' : 'scale(1)',
        boxShadow: reorderMode ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
    };

    return (
        <>
            <div
                style={itemStyle}
                draggable={draggable}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDragEnter={onDragEnter}
                onDrop={onDrop}
            >
                {/* Drag Handle (only in reorder mode) */}
                {reorderMode && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        color: '#6b7280',
                        fontSize: '1.2rem',
                        cursor: 'grab',
                        userSelect: 'none',
                        padding: '0.25rem'
                    }}>
                        ⋮⋮
                    </div>
                )}

                {/* Checkbox (hidden in reorder mode) */}
                {!reorderMode && (
                    <input
                        type="checkbox"
                        checked={isPurchased}
                        onChange={() => onToggle(localItem.itemKey || `${localItem.ingredient || localItem.name}-${localItem.category || 'other'}`)}
                        style={{
                            marginTop: '0.125rem',
                            cursor: 'pointer',
                            transform: 'scale(1.3)',
                            accentColor: '#8b5cf6'
                        }}
                    />
                )}

                {/* Item Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontWeight: '500',
                        color: '#374151',
                        fontSize: '0.95rem',
                        lineHeight: '1.4',
                        marginBottom: '0.25rem'
                    }}>
                        {localItem.amount && `${localItem.amount} `}{localItem.ingredient || localItem.name}
                    </div>

                    {/* Price Display */}
                    {showPrices && hasPrice && (
                        <div style={{
                            fontSize: '0.8rem',
                            color: isEstimated ? '#f59e0b' : '#16a34a',
                            backgroundColor: isEstimated ? '#fef3c7' : '#f0fdf4',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            marginBottom: '0.25rem',
                            border: isEstimated ? '1px solid #fbbf24' : '1px solid #bbf7d0',
                            display: 'inline-block'
                        }}>
                            {formatPrice(price)} {isEstimated && '(estimated)'}
                        </div>
                    )}

                    {/* Inventory Status */}
                    {localItem.inInventory && (
                        <div style={{
                            fontSize: '0.8rem',
                            color: '#16a34a',
                            backgroundColor: '#f0fdf4',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            marginBottom: '0.25rem',
                            border: '1px solid #bbf7d0'
                        }}>
                            ✅ In inventory: {localItem.haveAmount || 'Available'}
                            {localItem.inventoryItem?.location &&
                                ` (${localItem.inventoryItem.location})`
                            }
                        </div>
                    )}

                    {/* Recipe References */}
                    {localItem.recipes && localItem.recipes.length > 0 && (
                        <div style={{
                            fontSize: '0.7rem',
                            color: '#6b7280',
                            backgroundColor: '#f8fafc',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            border: '1px solid #e2e8f0'
                        }}>
                            Used in: {localItem.recipes.join(', ')}
                        </div>
                    )}
                </div>

                {/* Price Action Button */}
                {showPrices && !reorderMode && (
                    <TouchEnhancedButton
                        onClick={() => setShowPriceEntry(true)}
                        style={{
                            backgroundColor: hasPrice ? '#f59e0b' : '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0.5rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            flexShrink: 0
                        }}
                        title={hasPrice ? 'Edit price' : 'Add price'}
                    >
                        {hasPrice ? '💰' : '➕💰'}
                    </TouchEnhancedButton>
                )}
            </div>

            {/* Price Entry Modal */}
            {showPriceEntry && (
                <ShoppingListItemPriceEntry
                    item={localItem}
                    onPriceUpdate={handlePriceUpdate}
                    onClose={() => setShowPriceEntry(false)}
                    userPreferences={userPreferences}
                />
            )}
        </>
    );
}
