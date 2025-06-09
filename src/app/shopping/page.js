// file: /src/app/shopping/page.js v5

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ShoppingListDisplay from '@/components/shopping/ShoppingListDisplay';
import SavedShoppingListsButton from '@/components/shopping/SavedShoppingListsButton';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';

export default function ShoppingPage() {
    const { data: session } = useSession();
    const [recipes, setRecipes] = useState([]);
    const [filteredRecipes, setFilteredRecipes] = useState([]);
    const [selectedRecipes, setSelectedRecipes] = useState([]);
    const [shoppingList, setShoppingList] = useState(null);
    const [showShoppingList, setShowShoppingList] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [selectedDifficulty, setSelectedDifficulty] = useState('');
    const [selectedIngredient, setSelectedIngredient] = useState('');
    const [maxCookTime, setMaxCookTime] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Available filter options (extracted from recipes)
    const [availableTags, setAvailableTags] = useState([]);
    const [availableIngredients, setAvailableIngredients] = useState([]);

    // Fetch recipes when component mounts
    useEffect(() => {
        fetchRecipes();
    }, []);

    // Update filtered recipes when filters change
    useEffect(() => {
        applyFilters();
    }, [recipes, searchQuery, selectedTags, selectedDifficulty, selectedIngredient, maxCookTime]);

    const fetchRecipes = async () => {
        try {
            const response = await fetch('/api/recipes');
            const result = await response.json();
            if (result.success) {
                setRecipes(result.recipes);
                extractFilterOptions(result.recipes);
            } else {
                setError('Failed to fetch recipes');
            }
        } catch (error) {
            console.error('Error fetching recipes:', error);
            setError('Failed to fetch recipes');
        }
    };

    // Extract available filter options from recipes
    const extractFilterOptions = (recipeList) => {
        const allTags = new Set();
        const allIngredients = new Set();

        recipeList.forEach(recipe => {
            // Extract tags
            if (recipe.tags && Array.isArray(recipe.tags)) {
                recipe.tags.forEach(tag => allTags.add(tag));
            }

            // Extract ingredients
            if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
                recipe.ingredients.forEach(ingredient => {
                    if (ingredient.name) {
                        // Clean up ingredient name (remove amounts, descriptions)
                        const cleanName = ingredient.name
                            .toLowerCase()
                            .replace(/\b(fresh|dried|minced|chopped|sliced|diced|whole|ground|crushed|grated|shredded|cooked|raw)\b/g, '')
                            .replace(/\b(small|medium|large|extra large)\b/g, '')
                            .replace(/\b(can|jar|bottle|bag|box|package|of)\b/g, '')
                            .replace(/[,()]/g, '')
                            .replace(/\s+/g, ' ')
                            .trim();

                        if (cleanName.length > 2) {
                            allIngredients.add(cleanName);
                        }
                    }
                });
            }
        });

        setAvailableTags(Array.from(allTags).sort());
        setAvailableIngredients(Array.from(allIngredients).sort());
    };

    // Apply all filters to recipes
    const applyFilters = () => {
        let filtered = [...recipes];

        // Text search (title and description)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(recipe =>
                recipe.title.toLowerCase().includes(query) ||
                (recipe.description && recipe.description.toLowerCase().includes(query))
            );
        }

        // Tag filter
        if (selectedTags.length > 0) {
            filtered = filtered.filter(recipe =>
                recipe.tags && selectedTags.some(tag => recipe.tags.includes(tag))
            );
        }

        // Difficulty filter
        if (selectedDifficulty) {
            filtered = filtered.filter(recipe => recipe.difficulty === selectedDifficulty);
        }

        // Ingredient filter
        if (selectedIngredient) {
            filtered = filtered.filter(recipe =>
                    recipe.ingredients && recipe.ingredients.some(ingredient =>
                        ingredient.name.toLowerCase().includes(selectedIngredient.toLowerCase())
                    )
            );
        }

        // Cook time filter
        if (maxCookTime) {
            const maxTime = parseInt(maxCookTime);
            filtered = filtered.filter(recipe => {
                const totalTime = (recipe.cookTime || 0) + (recipe.prepTime || 0);
                return totalTime <= maxTime;
            });
        }

        setFilteredRecipes(filtered);
    };

    // Clear all filters
    const clearFilters = () => {
        setSearchQuery('');
        setSelectedTags([]);
        setSelectedDifficulty('');
        setSelectedIngredient('');
        setMaxCookTime('');
    };

    // Handle tag selection
    const handleTagToggle = (tag) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    const handleRecipeToggle = (recipeId) => {
        setSelectedRecipes(prev =>
            prev.includes(recipeId)
                ? prev.filter(id => id !== recipeId)
                : [...prev, recipeId]
        );
    };

    const handleSelectAll = () => {
        if (selectedRecipes.length === filteredRecipes.length) {
            setSelectedRecipes([]);
        } else {
            setSelectedRecipes(filteredRecipes.map(recipe => recipe._id));
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
        return filteredRecipes
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

    // Count active filters
    const getActiveFilterCount = () => {
        let count = 0;
        if (searchQuery.trim()) count++;
        if (selectedTags.length > 0) count++;
        if (selectedDifficulty) count++;
        if (selectedIngredient) count++;
        if (maxCookTime) count++;
        return count;
    };

    if (showShoppingList && shoppingList) {
        return (
            <MobileOptimizedLayout>
                <ShoppingListDisplay
                    shoppingList={shoppingList}
                    onClose={closeShoppingList}
                    onRefresh={refreshShoppingList}
                    title={getShoppingListTitle()}
                    subtitle={getShoppingListSubtitle()}
                    sourceRecipeIds={selectedRecipes}
                    sourceMealPlanId={null}
                />
            </MobileOptimizedLayout>
        );
    }

    return (
        <MobileOptimizedLayout>
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
                            Filter and select recipes to generate a smart shopping list
                        </p>
                    </div>
                    <SavedShoppingListsButton />
                </div>

                {/* Search and Filter Bar */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e5e7eb',
                    marginBottom: '1.5rem',
                    overflow: 'hidden'
                }}>
                    <div style={{ padding: '1.5rem' }}>
                        {/* Search Bar */}
                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder="Search recipes by name or description..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem 0.75rem 2.5rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        backgroundColor: '#f9fafb'
                                    }}
                                />
                                <div style={{
                                    position: 'absolute',
                                    left: '0.75rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#6b7280'
                                }}>
                                    🔍
                                </div>
                            </div>
                        </div>

                        {/* Filter Toggle and Status */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: showFilters ? '1rem' : '0'
                        }}>
                            <TouchEnhancedButton
                                onClick={() => setShowFilters(!showFilters)}
                                style={{
                                    backgroundColor: showFilters ? '#4f46e5' : '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                🎛️ Filters {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
                                <span style={{ fontSize: '0.75rem' }}>
                                    {showFilters ? '▲' : '▼'}
                                </span>
                            </TouchEnhancedButton>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                    Showing {filteredRecipes.length} of {recipes.length} recipes
                                </span>
                                {getActiveFilterCount() > 0 && (
                                    <TouchEnhancedButton
                                        onClick={clearFilters}
                                        style={{
                                            backgroundColor: '#dc2626',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '0.25rem 0.75rem',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Clear Filters
                                    </TouchEnhancedButton>
                                )}
                            </div>
                        </div>

                        {/* Expanded Filters */}
                        {showFilters && (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                gap: '1rem',
                                padding: '1rem',
                                backgroundColor: '#f8fafc',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0'
                            }}>
                                {/* Difficulty Filter */}
                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        color: '#374151',
                                        marginBottom: '0.5rem'
                                    }}>
                                        Difficulty Level
                                    </label>
                                    <select
                                        value={selectedDifficulty}
                                        onChange={(e) => setSelectedDifficulty(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '0.875rem',
                                            backgroundColor: 'white'
                                        }}
                                    >
                                        <option value="">All Difficulties</option>
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>

                                {/* Cook Time Filter */}
                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        color: '#374151',
                                        marginBottom: '0.5rem'
                                    }}>
                                        Max Total Time (minutes)
                                    </label>
                                    <select
                                        value={maxCookTime}
                                        onChange={(e) => setMaxCookTime(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '0.875rem',
                                            backgroundColor: 'white'
                                        }}
                                    >
                                        <option value="">Any Time</option>
                                        <option value="15">15 minutes or less</option>
                                        <option value="30">30 minutes or less</option>
                                        <option value="45">45 minutes or less</option>
                                        <option value="60">1 hour or less</option>
                                        <option value="90">1.5 hours or less</option>
                                        <option value="120">2 hours or less</option>
                                    </select>
                                </div>

                                {/* Ingredient Filter */}
                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        color: '#374151',
                                        marginBottom: '0.5rem'
                                    }}>
                                        Contains Ingredient
                                    </label>
                                    <select
                                        value={selectedIngredient}
                                        onChange={(e) => setSelectedIngredient(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '0.875rem',
                                            backgroundColor: 'white'
                                        }}
                                    >
                                        <option value="">Any Ingredient</option>
                                        {availableIngredients.slice(0, 50).map(ingredient => (
                                            <option key={ingredient} value={ingredient}>
                                                {ingredient.charAt(0).toUpperCase() + ingredient.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Tags Filter (always visible when there are tags) */}
                        {availableTags.length > 0 && (
                            <div style={{ marginTop: showFilters ? '1rem' : '0' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    color: '#374151',
                                    marginBottom: '0.5rem'
                                }}>
                                    Recipe Tags
                                </label>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '0.5rem'
                                }}>
                                    {availableTags.map(tag => (
                                        <TouchEnhancedButton
                                            key={tag}
                                            onClick={() => handleTagToggle(tag)}
                                            style={{
                                                backgroundColor: selectedTags.includes(tag) ? '#4f46e5' : '#f3f4f6',
                                                color: selectedTags.includes(tag) ? 'white' : '#374151',
                                                border: 'none',
                                                borderRadius: '16px',
                                                padding: '0.375rem 0.75rem',
                                                fontSize: '0.75rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {tag}
                                        </TouchEnhancedButton>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Bar */}
                {filteredRecipes.length > 0 && (
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
                                        checked={selectedRecipes.length === filteredRecipes.length && filteredRecipes.length > 0}
                                        onChange={handleSelectAll}
                                        style={{ transform: 'scale(1.1)' }}
                                    />
                                    Select All ({filteredRecipes.length} recipes)
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
                                    <TouchEnhancedButton
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
                                    </TouchEnhancedButton>
                                )}

                                <TouchEnhancedButton
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
                                </TouchEnhancedButton>
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
                            📝 Select Recipes ({filteredRecipes.length} available)
                        </h2>
                    </div>

                    <div style={{ padding: '1.5rem' }}>
                        {filteredRecipes.length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '3rem',
                                color: '#6b7280'
                            }}>
                                {recipes.length === 0 ? (
                                    <>
                                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                                            No recipes found
                                        </h3>
                                        <p>Add some recipes first to generate shopping lists.</p>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                                            No recipes match your filters
                                        </h3>
                                        <p>Try adjusting your search criteria or clearing some filters.</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                gap: '1rem'
                            }}>
                                {filteredRecipes.map(recipe => (
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
                                                        margin: '0 0 0.75rem 0',
                                                        lineHeight: '1.4',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden'
                                                    }}>
                                                        {recipe.description}
                                                    </p>
                                                )}
                                                <div style={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: '1rem',
                                                    fontSize: '0.75rem',
                                                    color: '#6b7280',
                                                    marginBottom: '0.75rem'
                                                }}>
                                                    {recipe.servings && (
                                                        <span>🍽️ {recipe.servings} servings</span>
                                                    )}
                                                    {(recipe.cookTime || recipe.prepTime) && (
                                                        <span>⏱️ {(recipe.cookTime || 0) + (recipe.prepTime || 0)} min</span>
                                                    )}
                                                    {recipe.ingredients && (
                                                        <span>🥕 {recipe.ingredients.length} ingredients</span>
                                                    )}
                                                    {recipe.difficulty && (
                                                        <span style={{
                                                            color: recipe.difficulty === 'easy' ? '#16a34a' :
                                                                recipe.difficulty === 'medium' ? '#d97706' : '#dc2626'
                                                        }}>
                                                            📊 {recipe.difficulty}
                                                        </span>
                                                    )}
                                                </div>
                                                {recipe.tags && recipe.tags.length > 0 && (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                        {recipe.tags.slice(0, 4).map(tag => (
                                                            <span key={tag} style={{
                                                                backgroundColor: selectedTags.includes(tag) ? '#4f46e5' : '#f3f4f6',
                                                                color: selectedTags.includes(tag) ? 'white' : '#6b7280',
                                                                padding: '0.25rem 0.5rem',
                                                                borderRadius: '12px',
                                                                fontSize: '0.75rem'
                                                            }}>
                                                                {tag}
                                                            </span>
                                                        ))}
                                                        {recipe.tags.length > 4 && (
                                                            <span style={{
                                                                color: '#6b7280',
                                                                fontSize: '0.75rem',
                                                                fontStyle: 'italic'
                                                            }}>
                                                                +{recipe.tags.length - 4} more
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
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
                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}