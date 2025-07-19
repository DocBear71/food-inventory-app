'use client';

// file: /src/components/shopping/ShoppingListItemPriceEntry.js v1 - Add/edit prices for shopping list items

import React, { useState } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';

export default function ShoppingListItemPriceEntry({
                                                       item,
                                                       onPriceUpdate,
                                                       onClose,
                                                       userPreferences = {}
                                                   }) {
    const [price, setPrice] = useState(item.price || item.unitPrice || item.estimatedPrice || '');
    const [isEstimated, setIsEstimated] = useState(!item.price && !item.unitPrice);
    const [loading, setLoading] = useState(false);

    const currencySymbol = userPreferences.currencySymbol || '$';

    const handleSave = async () => {
        setLoading(true);
        try {
            const updatedItem = {
                ...item,
                [isEstimated ? 'estimatedPrice' : 'price']: parseFloat(price) || 0,
                priceUpdatedAt: new Date().toISOString(),
                priceSource: isEstimated ? 'user_estimate' : 'user_manual'
            };

            await onPriceUpdate(updatedItem);
            onClose();
        } catch (error) {
            console.error('Error updating price:', error);
            alert('Failed to update price. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1rem'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                maxWidth: '400px',
                width: '100%'
            }}>
                <h3 style={{
                    margin: '0 0 1rem 0',
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#111827'
                }}>
                    💰 Set Price for {item.name || item.ingredient}
                </h3>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '0.5rem'
                    }}>
                        Price per {item.unit || 'item'}
                    </label>
                    <div style={{ position: 'relative' }}>
                        <span style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#6b7280',
                            fontSize: '1rem'
                        }}>
                            {currencySymbol}
                        </span>
                        <input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            style={{
                                width: '100%',
                                paddingLeft: '2rem',
                                paddingRight: '0.75rem',
                                paddingTop: '0.75rem',
                                paddingBottom: '0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '1rem',
                                outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                        />
                    </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.875rem',
                        color: '#374151',
                        cursor: 'pointer'
                    }}>
                        <input
                            type="checkbox"
                            checked={isEstimated}
                            onChange={(e) => setIsEstimated(e.target.checked)}
                            style={{
                                width: '1rem',
                                height: '1rem',
                                accentColor: '#3b82f6'
                            }}
                        />
                        This is an estimated price
                    </label>
                    <p style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        marginTop: '0.25rem',
                        marginLeft: '1.5rem'
                    }}>
                        Estimated prices are marked differently and don't affect exact totals
                    </p>
                </div>

                <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    justifyContent: 'flex-end'
                }}>
                    <TouchEnhancedButton
                        onClick={onClose}
                        disabled={loading}
                        style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1
                        }}
                    >
                        Cancel
                    </TouchEnhancedButton>
                    <TouchEnhancedButton
                        onClick={handleSave}
                        disabled={loading || !price}
                        style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: (loading || !price) ? '#9ca3af' : '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: (loading || !price) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? 'Saving...' : 'Save Price'}
                    </TouchEnhancedButton>
                </div>
            </div>
        </div>
    );
}