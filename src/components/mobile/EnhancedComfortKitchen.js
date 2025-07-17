// file: /src/components/mobile/EnhancedComfortKitchen.js - Doc Bear's enhanced mobile components
'use client';

import { useState } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { TouchEnhancedButton } from './TouchEnhancedButton';

export function ComfortKitchenMobileEnhancements({ children }) {
    const [showMobileActions, setShowMobileActions] = useState(false);
    const {
        getDeviceCapabilities,
        shareContent,
        vibrateDevice,
        setAppBadge,
        showNotification
    } = usePWA();

    const capabilities = getDeviceCapabilities();

    // Enhanced sharing for Doc Bear's Comfort Kitchen
    const shareRecipe = async (recipe) => {
        const shareData = {
            title: `🐻 ${recipe.title} - Doc Bear's Recipe`,
            text: `Check out this delicious recipe from Doc Bear's Comfort Kitchen: ${recipe.description}`,
            url: `${window.location.origin}/recipes/${recipe.id}`
        };

        const shared = await shareContent(shareData);
        if (shared) {
            vibrateDevice([50]); // Success feedback
            showNotification('Recipe Shared!', {
                body: `${recipe.title} has been shared successfully`,
                icon: '/icons/icon-192x192.png'
            });
        }
    };

    // Enhanced inventory notifications
    const notifyLowStock = async (items) => {
        if (items.length > 0) {
            setAppBadge(items.length);
            showNotification('🐻 Low Stock Alert', {
                body: `${items.length} items are running low in your kitchen`,
                actions: [
                    { action: 'view', title: 'View Items' },
                    { action: 'shop', title: 'Generate Shopping List' }
                ]
            });
        }
    };

    // Quick action buttons for mobile
    const QuickActions = () => (
        <div style={{
            position: 'fixed',
            bottom: 'calc(80px + max(env(safe-area-inset-bottom, 0px), 0px))',
            right: '16px',
            zIndex: 1000
        }}>
            {showMobileActions && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    marginBottom: '12px'
                }}>
                    {capabilities.camera && (
                        <TouchEnhancedButton
                            onClick={() => window.location.href = '/inventory?action=scan'}
                            style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '50%',
                                backgroundColor: '#8b5cf6',
                                color: 'white',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.5rem',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                cursor: 'pointer'
                            }}
                            title="Scan Barcode"
                        >
                            📷
                        </TouchEnhancedButton>
                    )}

                    <TouchEnhancedButton
                        onClick={() => window.location.href = '/shopping'}
                        style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            backgroundColor: '#059669',
                            color: 'white',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            cursor: 'pointer'
                        }}
                        title="AI Shopping List"
                    >
                        🤖
                    </TouchEnhancedButton>

                    <TouchEnhancedButton
                        onClick={() => window.location.href = '/inventory?action=add'}
                        style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            cursor: 'pointer'
                        }}
                        title="Add Item"
                    >
                        ➕
                    </TouchEnhancedButton>
                </div>
            )}

            {/* Main FAB */}
            <TouchEnhancedButton
                onClick={() => setShowMobileActions(!showMobileActions)}
                style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: '#4f46e5', // Doc Bear's theme color
                    color: 'white',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                    transform: showMobileActions ? 'rotate(45deg)' : 'rotate(0deg)'
                }}
            >
                {showMobileActions ? '✕' : '🐻'}
            </TouchEnhancedButton>
        </div>
    );

    return (
        <>
            {children}
            <QuickActions />
        </>
    );
}