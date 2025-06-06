// file: /src/app/shopping/page.js v4

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ShoppingListDisplay from '@/components/shopping/ShoppingListDisplay';
import SavedShoppingListsButton from '@/components/shopping/SavedShoppingListsButton';

export default function ShoppingPage() {
    const { data: session } = useSession();
    const [recipes, setRecipes] = useState([]);
    const [selectedRecipes, setSelectedRecipes] = useState([]);
    const [shoppingList, setShoppingList] = useState(null);
    const [showShoppingList, setShowShoppingList] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Fetch recipes when component mounts
    useEffect(() => {
        fetchRecipes();
    }, []);

    const fetchRecipes = async () => {
        try {
            const response = await fetch('/api/recipes');
            const result = await response.json();
            if (result.success) {
                setRecipes(result.recipes);
            } else {
                setError('Failed to fetch recipes');
            }
        } catch (error) {
            console.error('Error fetching recipes:', error);
            setError('Failed to fetch recipes');
        }
    };

    const handleRecipeToggle = (recipeId) => {
        setSelectedRecipes(prev =>
            prev.includes(recipeId)
                ? prev.filter(id => id !== recipeId)
                : [...prev, recipeId]
        );
    };

    const handleSelectAll = () => {
        if (selectedRecipes.length === recipes.length) {
            setSelectedRecipes([]);
        } else {
            setSelectedRecipes(recipes.map(recipe => recipe._id));
        }
    };

    const handleClearAll = () => {
        setSelectedRecipes([]);
        setShoppingList(null);
        setShowShoppingList(false);
        setError('');
    };

    const generateShoppingList = async () => {
        if (selectedRecipes.length === 0) {
            setError('Please select at least one recipe');
            return;
        }

        setLoading(true);
        setError('');

        try {
            console.log('Generating shopping list for recipes:', selectedRecipes);

            const response = await fetch('/api/shopping/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipeIds: selectedRecipes
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to generate shopping list');
            }

            if (result.success) {
                console.log('Shopping list generated successfully:', result.shoppingList);
                setShoppingList(result.shoppingList);
                setShowShoppingList(true);
            } else {
                throw new Error('Invalid response format');
            }

        } catch (error) {
            console.error('Error generating shopping list:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const refreshShoppingList = () => {
        generateShoppingList();
    };

    const closeShoppingList = () => {
        setShowShoppingList(false);
    };

    // Get selected recipe details for display context
    const getSelectedRecipeNames = () => {
        return recipes
            .filter(recipe => selectedRecipes.includes(recipe._id))
            .map(recipe => recipe.title);
    };

    const getShoppingListTitle = () => {
        const selectedCount = selectedRecipes.length;
        if (selectedCount === 1) {
            const recipeName = getSelectedRecipeNames()[0];
            return `🛒 Shopping List - ${recipeName}`;
        } else {
            return `🛒 Shopping List - ${selectedCount} Recipes`;
        }
    };

    const getShoppingListSubtitle = () => {
        const recipeNames = getSelectedRecipeNames();
        if (recipeNames.length <= 3) {
            return recipeNames.join(', ');
        } else {
            return `${recipeNames.slice(0, 2).join(', ')} and ${recipeNames.length - 2} more`;
        }
    };

    if (showShoppingList && shoppingList) {
        return (
            <DashboardLayout>
                <ShoppingListDisplay
                    shoppingList={shoppingList}
                    onClose={closeShoppingList}
                    onRefresh={refreshShoppingList}
                    title={getShoppingListTitle()}
                    subtitle={getShoppingListSubtitle()}
                    sourceRecipeIds={selectedRecipes}
                    sourceMealPlanId={null}
                />
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div style={{ padding: '2rem' }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '2rem'
                }}>
                    <div>
                        <h1 style={{
                            fontSize: '2rem',
                            fontWeight: 'bold',
                            marginBottom: '0.5rem',
                            color: '#111827'
                        }}>
                            🛒 Shopping List Generator
                        </h1>
                        <p style={{ color: '#6b7280', fontSize: '1rem' }}>
                            Select recipes you want to cook and generate a smart shopping list
                        </p>
                    </div>
                    <SavedShoppingListsButton />
                </div>

                {/* Recipe Selection Instructions */}
                <div style={{
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #0ea5e9',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '2rem'
                }}>
                    <h3 style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        marginBottom: '0.5rem',
                        color: '#0369a1'
                    }}>
                        How to Use Shopping List Generator:
                    </h3>
                    <ol style={{
                        margin: 0,
                        paddingLeft: '1.5rem',
                        color: '#0c4a6e',
                        lineHeight: '1.6'
                    }}>
                        <li>Select one or more recipes below using the checkboxes</li>
                        <li>Use "Select All" to choose all recipes, or "Clear All" to start over</li>
                        <li>Click "Generate Shopping List" to create your list</li>
                        <li>The system combines ingredients from all selected recipes</li>
                        <li>Shopping list shows items you need vs. items already in your inventory</li>
                        <li>Items are organized by store categories for efficient shopping</li>
                        <li>Use the Refresh button to update inventory status</li>
                        <li>Share via email, or print/export your shopping list</li>
                        <li>Use "Clear All Selections" to deselect all recipes and start over</li>
                    </ol>
                </div>

                {/* Action Bar */}
                {recipes.length > 0 && (
                    <div style={{
                        backgroundColor: 'white',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #e5e7eb',
                        marginBottom: '2rem'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '1rem'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                flexWrap: 'wrap'
                            }}>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    color: '#374151'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedRecipes.length === recipes.length && recipes.length > 0}
                                        onChange={handleSelectAll}
                                        style={{ transform: 'scale(1.1)' }}
                                    />
                                    Select All ({recipes.length} recipes)
                                </label>

                                {selectedRecipes.length > 0 && (
                                    <span style={{
                                        backgroundColor: '#dbeafe',
                                        color: '#1e40af',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '6px',
                                        fontSize: '0.875rem',
                                        fontWeight: '500'
                                    }}>
                                        {selectedRecipes.length} selected
                                    </span>
                                )}
                            </div>

                            <div style={{
                                display: 'flex',
                                gap: '0.75rem',
                                alignItems: 'center'
                            }}>
                                {selectedRecipes.length > 0 && (
                                    <button
                                        onClick={handleClearAll}
                                        style={{
                                            backgroundColor: '#6b7280',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            padding: '0.75rem 1rem',
                                            fontSize: '0.875rem',
                                            fontWeight: '500',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Clear All
                                    </button>
                                )}

                                <button
                                    onClick={generateShoppingList}
                                    disabled={selectedRecipes.length === 0 || loading}
                                    style={{
                                        backgroundColor: selectedRecipes.length === 0 || loading ? '#9ca3af' : '#16a34a',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '0.75rem 1.5rem',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        cursor: selectedRecipes.length === 0 || loading ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    {loading ? (
                                        <>
                                            <div style={{
                                                width: '1rem',
                                                height: '1rem',
                                                border: '2px solid transparent',
                                                borderTop: '2px solid white',
                                                borderRadius: '50%',
                                                animation: 'spin 1s linear infinite'
                                            }} />
                                            Generating...
                                        </>
                                    ) : (
                                        '🛒 Generate Shopping List'
                                    )}
                                </button>
                            </div>
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
                        marginBottom: '2rem'
                    }}>
                        {error}
                    </div>
                )}

                {/* Recipe Selection */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e5e7eb'
                }}>
                    <div style={{
                        padding: '1.5rem',
                        borderBottom: '1px solid #e5e7eb'
                    }}>
                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            margin: 0,
                            color: '#111827'
                        }}>
                            📝 Select Recipes ({recipes.length} available)
                        </h2>
                    </div>

                    <div style={{ padding: '1.5rem' }}>
                        {recipes.length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '3rem',
                                color: '#6b7280'
                            }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                                    No recipes found
                                </h3>
                                <p>Add some recipes first to generate shopping lists.</p>
                            </div>
                        ) : (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                gap: '1rem'
                            }}>
                                {recipes.map(recipe => (
                                    <div
                                        key={recipe._id}
                                        style={{
                                            border: selectedRecipes.includes(recipe._id)
                                                ? '2px solid #3b82f6'
                                                : '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            padding: '1rem',
                                            cursor: 'pointer',
                                            backgroundColor: selectedRecipes.includes(recipe._id)
                                                ? '#eff6ff'
                                                : 'white',
                                            transition: 'all 0.2s'
                                        }}
                                        onClick={() => handleRecipeToggle(recipe._id)}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '0.75rem'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedRecipes.includes(recipe._id)}
                                                onChange={() => handleRecipeToggle(recipe._id)}
                                                style={{
                                                    marginTop: '0.125rem',
                                                    transform: 'scale(1.1)'
                                                }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <h3 style={{
                                                    fontSize: '1rem',
                                                    fontWeight: '600',
                                                    margin: '0 0 0.5rem 0',
                                                    color: '#111827'
                                                }}>
                                                    {recipe.title}
                                                </h3>
                                                {recipe.description && (
                                                    <p style={{
                                                        fontSize: '0.875rem',
                                                        color: '#6b7280',
                                                        margin: '0 0 0.5rem 0',
                                                        lineHeight: '1.4'
                                                    }}>
                                                        {recipe.description}
                                                    </p>
                                                )}
                                                <div style={{
                                                    display: 'flex',
                                                    gap: '1rem',
                                                    fontSize: '0.75rem',
                                                    color: '#6b7280'
                                                }}>
                                                    {recipe.servings && (
                                                        <span>🍽️ {recipe.servings} servings</span>
                                                    )}
                                                    {recipe.cookTime && (
                                                        <span>⏱️ {recipe.cookTime} min</span>
                                                    )}
                                                    {recipe.ingredients && (
                                                        <span>🥕 {recipe.ingredients.length} ingredients</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <style jsx>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        </DashboardLayout>
    );
}