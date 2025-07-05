'use client';
// file: /src/components/recipes/RecipeShoppingList.js v9 - Updated to use unified shopping list modal

import { useState, useEffect } from 'react';
import UnifiedShoppingListModal from '@/components/shopping/UnifiedShoppingListModal';
import { apiPost } from '@/lib/api-config';

export default function RecipeShoppingList({ recipeId, recipeName, onClose }) {
    const [shoppingList, setShoppingList] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (recipeId) {
            generateShoppingList();
        }
    }, [recipeId]);

    const generateShoppingList = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await apiPost('/api/shopping/generate', {
                recipeIds: [recipeId]
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to generate shopping list');
            }

            setShoppingList(result.shoppingList);
        } catch (error) {
            console.error('Error generating shopping list:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Loading state
    if (loading) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}>
                <div style={{
                    backgroundColor: 'white',
                    padding: '2rem',
                    borderRadius: '12px',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '3rem',
                        height: '3rem',
                        border: '4px solid #e5e7eb',
                        borderTop: '4px solid #3b82f6',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 1rem'
                    }} />
                    <p>Generating shopping list...</p>
                </div>
                <style jsx>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1rem'
            }}>
                <div style={{
                    backgroundColor: 'white',
                    padding: '2rem',
                    borderRadius: '12px',
                    textAlign: 'center',
                    maxWidth: '400px'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
                    <h3 style={{ margin: '0 0 1rem 0', color: '#dc2626' }}>Error</h3>
                    <p style={{ margin: '0 0 1.5rem 0', color: '#6b7280' }}>{error}</p>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                            onClick={generateShoppingList}
                            style={{
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.75rem 1rem',
                                cursor: 'pointer'
                            }}
                        >
                            Retry
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                backgroundColor: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.75rem 1rem',
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Show unified shopping list modal when data is loaded
    return (
        <UnifiedShoppingListModal
            isOpen={!!shoppingList}
            onClose={onClose}
            shoppingList={shoppingList}
            title="🛒 Shopping List"
            subtitle={recipeName}
            sourceRecipeIds={[recipeId]}
            sourceMealPlanId={null}
            onRefresh={generateShoppingList}
            showRefresh={true}
        />
    );
}