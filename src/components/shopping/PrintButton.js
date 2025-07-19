'use client';

// file: /src/components/shopping/PrintButton.js v1 - Standalone print button component

import React, { useState } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import PrintOptionsModal from '@/components/shopping/PrintOptionsModal';

export default function PrintButton({
                                        shoppingList,
                                        title = 'Shopping List',
                                        subtitle = null,
                                        storeName = null,
                                        shoppingRoute = null,
                                        totals = null,
                                        className = '',
                                        buttonText = '🖨️ Print',
                                        variant = 'primary' // 'primary', 'secondary', 'icon'
                                    }) {
    const [showPrintModal, setShowPrintModal] = useState(false);

    const getButtonStyle = () => {
        const baseStyle = {
            border: 'none',
            borderRadius: '6px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
        };

        switch (variant) {
            case 'primary':
                return {
                    ...baseStyle,
                    backgroundColor: '#2563eb',
                    color: 'white',
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem'
                };
            case 'secondary':
                return {
                    ...baseStyle,
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem',
                    border: '1px solid #d1d5db'
                };
            case 'icon':
                return {
                    ...baseStyle,
                    backgroundColor: '#2563eb',
                    color: 'white',
                    padding: '0.5rem',
                    fontSize: '0.65rem',
                    textAlign: 'center',
                    flexDirection: 'column'
                };
            default:
                return baseStyle;
        }
    };

    return (
        <>
            <TouchEnhancedButton
                onClick={() => setShowPrintModal(true)}
                style={getButtonStyle()}
                className={className}
                title="Print shopping list"
            >
                {variant === 'icon' ? (
                    <>
                        🖨️
                        <br />
                        Print
                    </>
                ) : (
                    buttonText
                )}
            </TouchEnhancedButton>

            <PrintOptionsModal
                isOpen={showPrintModal}
                onClose={() => setShowPrintModal(false)}
                onPrint={() => setShowPrintModal(false)}
                shoppingList={shoppingList}
                title={title}
                subtitle={subtitle}
                storeName={storeName}
                shoppingRoute={shoppingRoute}
                totals={totals}
            />
        </>
    );
}
