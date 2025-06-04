// file: /src/app/recipes/page.js v2

'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { redirect } from 'next/navigation';

// Separate component for search params to wrap in Suspense
function RecipesContent() {
    const { data: session, status } = useSession();
    const searchParams = useSearchParams();
    const router = useRouter();
    const shouldShowAddForm = searchParams.get('action') === 'add';
    const editRecipeId = searchParams.get('id');

    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(shouldShowAddForm);
    const [editingRecipe, setEditingRecipe] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterDifficulty, setFilterDifficulty] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        ingredients: [{ name: '', amount: '', unit: '', optional: false }],
        instructions: [''],
        cookTime: '',
        prepTime: '',
        servings: '',
        difficulty: 'medium',
        tags: '',
        source: '',
        isPublic: false
    });

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/auth/signin');
        }
    }, [status]);

    useEffect(() => {
        if (session) {
            fetchRecipes();
        }
    }, [session]);

    // Handle editing from URL params
    useEffect(() => {
        if (editRecipeId && recipes.length > 0) {
            const recipeToEdit = recipes.find(r => r._id === editRecipeId);
            if (recipeToEdit) {
                handleEdit(recipeToEdit);
            }
        }
    }, [editRecipeId, recipes]);

    const fetchRecipes = async () => {
        try {
            const response = await fetch('/api/recipes');
            const data = await response.json();

            if (data.success) {
                setRecipes(data.recipes);
            }
        } catch (error) {
            console.error('Error fetching recipes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const recipeData = {
                ...formData,
                ingredients: formData.ingredients.filter(ing => ing.name.trim() !== ''),
                instructions: formData.instructions.filter(inst => inst.trim() !== ''),
                tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
                cookTime: formData.cookTime ? parseInt(formData.cookTime) : null,
                prepTime: formData.prepTime ? parseInt(formData.prepTime) : null,
                servings: formData.servings ? parseInt(formData.servings) : null
            };

            const url = editingRecipe ? '/api/recipes' : '/api/recipes';
            const method = editingRecipe ? 'PUT' : 'POST';
            const body = editingRecipe
                ? { recipeId: editingRecipe._id, ...recipeData }
                : recipeData;

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (data.success) {
                await fetchRecipes();
                resetForm();
            } else {
                alert(data.error || 'Failed to save recipe');
            }
        } catch (error) {
            console.error('Error saving recipe:', error);
            alert('Error saving recipe');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (recipe) => {
        setEditingRecipe(recipe);
        setFormData({
            title: recipe.title,
            description: recipe.description || '',
            ingredients: recipe.ingredients.length > 0 ? recipe.ingredients : [{ name: '', amount: '', unit: '', optional: false }],
            instructions: recipe.instructions.length > 0 ? recipe.instructions : [''],
            cookTime: recipe.cookTime || '',
            prepTime: recipe.prepTime || '',
            servings: recipe.servings || '',
            difficulty: recipe.difficulty || 'medium',
            tags: recipe.tags ? recipe.tags.join(', ') : '',
            source: recipe.source || '',
            isPublic: recipe.isPublic || false
        });
        setShowAddForm(true);
    };

    const handleDelete = async (recipeId) => {
        if (!confirm('Are you sure you want to delete this recipe?')) return;

        try {
            const response = await fetch(`/api/recipes?recipeId=${recipeId}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                await fetchRecipes();
            } else {
                alert(data.error || 'Failed to delete recipe');
            }
        } catch (error) {
            console.error('Error deleting recipe:', error);
            alert('Error deleting recipe');
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const addIngredient = () => {
        setFormData(prev => ({
            ...prev,
            ingredients: [...prev.ingredients, { name: '', amount: '', unit: '', optional: false }]
        }));
    };

    const removeIngredient = (index) => {
        setFormData(prev => ({
            ...prev,
            ingredients: prev.ingredients.filter((_, i) => i !== index)
        }));
    };

    const updateIngredient = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            ingredients: prev.ingredients.map((ing, i) =>
                i === index ? { ...ing, [field]: value } : ing
            )
        }));
    };

    const addInstruction = () => {
        setFormData(prev => ({
            ...prev,
            instructions: [...prev.instructions, '']
        }));
    };

    const removeInstruction = (index) => {
        setFormData(prev => ({
            ...prev,
            instructions: prev.instructions.filter((_, i) => i !== index)
        }));
    };

    const updateInstruction = (index, value) => {
        setFormData(prev => ({
            ...prev,
            instructions: prev.instructions.map((inst, i) =>
                i === index ? value : inst
            )
        }));
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            ingredients: [{ name: '', amount: '', unit: '', optional: false }],
            instructions: [''],
            cookTime: '',
            prepTime: '',
            servings: '',
            difficulty: 'medium',
            tags: '',
            source: '',
            isPublic: false
        });
        setShowAddForm(false);
        setEditingRecipe(null);
        // Clear URL params
        router.push('/recipes', { scroll: false });
    };

    // Navigate to recipe detail page
    const viewRecipe = (recipeId) => {
        router.push(`/recipes/${recipeId}`);
    };

    // Calculate nutrition preview (if available)
    const getNutritionPreview = (recipe) => {
        if (!recipe.nutrition) return null;

        const hasNutrition = Object.values(recipe.nutrition).some(n => n && n.value > 0);
        if (!hasNutrition) return null;

        return {
            calories: Math.round(recipe.nutrition.calories?.value || 0),
            protein: Math.round(recipe.nutrition.protein?.value || 0),
            carbs: Math.round(recipe.nutrition.carbs?.value || 0),
            fat: Math.round(recipe.nutrition.fat?.value || 0)
        };
    };

    // Filter recipes based on search and filters
    const filteredRecipes = recipes.filter(recipe => {
        const matchesSearch = recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            recipe.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            recipe.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCategory = !filterCategory || recipe.tags?.includes(filterCategory);
        const matchesDifficulty = !filterDifficulty || recipe.difficulty === filterDifficulty;

        return matchesSearch && matchesCategory && matchesDifficulty;
    });

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">Recipe Collection</h1>
                    <div className="flex space-x-3">
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            {showAddForm ? 'Cancel' : 'Add Recipe'}
                        </button>
                        <button
                            onClick={() => {/* TODO: Implement bulk import */}}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            📚 Bulk Import
                        </button>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="bg-white shadow rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <input
                                type="text"
                                placeholder="Search recipes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                <option value="">All Categories</option>
                                <option value="breakfast">Breakfast</option>
                                <option value="lunch">Lunch</option>
                                <option value="dinner">Dinner</option>
                                <option value="dessert">Dessert</option>
                                <option value="snack">Snack</option>
                                <option value="comfort-food">Comfort Food</option>
                            </select>
                        </div>
                        <div>
                            <select
                                value={filterDifficulty}
                                onChange={(e) => setFilterDifficulty(e.target.value)}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                <option value="">All Difficulties</option>
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                            {filteredRecipes.length} of {recipes.length} recipes
                        </div>
                    </div>
                </div>

                {/* Add/Edit Recipe Form */}
                {showAddForm && (
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                {editingRecipe ? 'Edit Recipe' : 'Add New Recipe'}
                            </h3>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Basic Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                                            Recipe Title *
                                        </label>
                                        <input
                                            type="text"
                                            id="title"
                                            name="title"
                                            required
                                            value={formData.title}
                                            onChange={handleChange}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                            Description
                                        </label>
                                        <textarea
                                            id="description"
                                            name="description"
                                            rows={3}
                                            value={formData.description}
                                            onChange={handleChange}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="prepTime" className="block text-sm font-medium text-gray-700">
                                            Prep Time (minutes)
                                        </label>
                                        <input
                                            type="number"
                                            id="prepTime"
                                            name="prepTime"
                                            value={formData.prepTime}
                                            onChange={handleChange}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="cookTime" className="block text-sm font-medium text-gray-700">
                                            Cook Time (minutes)
                                        </label>
                                        <input
                                            type="number"
                                            id="cookTime"
                                            name="cookTime"
                                            value={formData.cookTime}
                                            onChange={handleChange}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="servings" className="block text-sm font-medium text-gray-700">
                                            Servings
                                        </label>
                                        <input
                                            type="number"
                                            id="servings"
                                            name="servings"
                                            value={formData.servings}
                                            onChange={handleChange}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">
                                            Difficulty
                                        </label>
                                        <select
                                            id="difficulty"
                                            name="difficulty"
                                            value={formData.difficulty}
                                            onChange={handleChange}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        >
                                            <option value="easy">Easy</option>
                                            <option value="medium">Medium</option>
                                            <option value="hard">Hard</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="source" className="block text-sm font-medium text-gray-700">
                                            Source (e.g., "Doc Bear's Volume 1")
                                        </label>
                                        <input
                                            type="text"
                                            id="source"
                                            name="source"
                                            value={formData.source}
                                            onChange={handleChange}
                                            placeholder="Doc Bear's Comfort Food Survival Guide Volume 1"
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                                            Tags (comma-separated)
                                        </label>
                                        <input
                                            type="text"
                                            id="tags"
                                            name="tags"
                                            value={formData.tags}
                                            onChange={handleChange}
                                            placeholder="comfort-food, dinner, easy"
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Ingredients */}
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-md font-medium text-gray-900">Ingredients</h4>
                                        <button
                                            type="button"
                                            onClick={addIngredient}
                                            className="text-sm text-indigo-600 hover:text-indigo-900"
                                        >
                                            + Add Ingredient
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {formData.ingredients.map((ingredient, index) => (
                                            <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                                <div className="col-span-5">
                                                    <input
                                                        type="text"
                                                        placeholder="Ingredient name"
                                                        value={ingredient.name}
                                                        onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                                                        className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Amount"
                                                        value={ingredient.amount}
                                                        onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                                                        className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Unit"
                                                        value={ingredient.unit}
                                                        onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                                                        className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={ingredient.optional}
                                                            onChange={(e) => updateIngredient(index, 'optional', e.target.checked)}
                                                            className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                        />
                                                        <span className="ml-1 text-xs text-gray-600">Optional</span>
                                                    </label>
                                                </div>
                                                <div className="col-span-1">
                                                    {formData.ingredients.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeIngredient(index)}
                                                            className="text-red-600 hover:text-red-900 text-sm"
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Instructions */}
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-md font-medium text-gray-900">Instructions</h4>
                                        <button
                                            type="button"
                                            onClick={addInstruction}
                                            className="text-sm text-indigo-600 hover:text-indigo-900"
                                        >
                                            + Add Step
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {formData.instructions.map((instruction, index) => (
                                            <div key={index} className="flex items-start space-x-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-indigo-100 text-indigo-600 text-sm font-medium rounded-full">
                          {index + 1}
                        </span>
                                                <textarea
                                                    placeholder="Describe this step..."
                                                    value={instruction}
                                                    onChange={(e) => updateInstruction(index, e.target.value)}
                                                    className="flex-1 text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                                    rows={2}
                                                />
                                                {formData.instructions.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeInstruction(index)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Options */}
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="isPublic"
                                        name="isPublic"
                                        checked={formData.isPublic}
                                        onChange={handleChange}
                                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    />
                                    <label htmlFor="isPublic" className="ml-2 text-sm text-gray-600">
                                        Make this recipe public (others can see it)
                                    </label>
                                </div>

                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                                    >
                                        {loading ? 'Saving...' : editingRecipe ? 'Update Recipe' : 'Add Recipe'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Recipe List */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                            Your Recipes ({filteredRecipes.length})
                        </h3>

                        {loading ? (
                            <div className="text-center py-8">
                                <div className="text-gray-500">Loading recipes...</div>
                            </div>
                        ) : filteredRecipes.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="text-gray-500 mb-4">
                                    {recipes.length === 0 ? 'No recipes yet' : 'No recipes match your search'}
                                </div>
                                {recipes.length === 0 && (
                                    <button
                                        onClick={() => setShowAddForm(true)}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
                                    >
                                        Add your first recipe
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredRecipes.map((recipe) => {
                                    const nutritionPreview = getNutritionPreview(recipe);
                                    const canEdit = recipe.createdBy === session?.user?.id;

                                    return (
                                        <div key={recipe._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                            {/* Recipe Header */}
                                            <div className="flex justify-between items-start mb-3">
                                                <button
                                                    onClick={() => viewRecipe(recipe._id)}
                                                    className="flex-1 text-left hover:text-indigo-600 transition-colors"
                                                >
                                                    <h4 className="text-lg font-medium text-gray-900 truncate">
                                                        {recipe.title}
                                                    </h4>
                                                </button>

                                                {canEdit && (
                                                    <div className="flex space-x-1 ml-2">
                                                        <button
                                                            onClick={() => handleEdit(recipe)}
                                                            className="text-indigo-600 hover:text-indigo-900 text-sm"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(recipe._id)}
                                                            className="text-red-600 hover:text-red-900 text-sm"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Description */}
                                            {recipe.description && (
                                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{recipe.description}</p>
                                            )}

                                            {/* Recipe Meta */}
                                            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                                                {recipe.prepTime && <span>Prep: {recipe.prepTime}m</span>}
                                                {recipe.cookTime && <span>Cook: {recipe.cookTime}m</span>}
                                                {recipe.servings && <span>Serves: {recipe.servings}</span>}
                                                <span className="capitalize">
                                                    {recipe.difficulty === 'easy' ? '🟢' : recipe.difficulty === 'medium' ? '🟡' : '🔴'}
                                                    {recipe.difficulty}
                                                </span>
                                            </div>

                                            {/* Nutrition Preview */}
                                            {nutritionPreview && (
                                                <div className="bg-green-50 rounded-md p-2 mb-3">
                                                    <div className="text-xs text-green-800 font-medium mb-1">Nutrition (per serving):</div>
                                                    <div className="grid grid-cols-4 gap-1 text-xs text-green-700">
                                                        <div className="text-center">
                                                            <div className="font-medium">{nutritionPreview.calories}</div>
                                                            <div>cal</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="font-medium">{nutritionPreview.protein}g</div>
                                                            <div>protein</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="font-medium">{nutritionPreview.carbs}g</div>
                                                            <div>carbs</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="font-medium">{nutritionPreview.fat}g</div>
                                                            <div>fat</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Ingredients Count */}
                                            <div className="text-sm text-gray-600 mb-2">
                                                <strong>Ingredients:</strong> {recipe.ingredients?.length || 0}
                                            </div>

                                            {/* Tags */}
                                            {recipe.tags && recipe.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mb-3">
                                                    {recipe.tags.slice(0, 3).map((tag, index) => (
                                                        <span key={index} className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                    {recipe.tags.length > 3 && (
                                                        <span className="text-xs text-gray-500">+{recipe.tags.length - 3} more</span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Source */}
                                            {recipe.source && (
                                                <div className="text-xs text-gray-500 mb-3">
                                                    Source: {recipe.source}
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => viewRecipe(recipe._id)}
                                                    className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 text-sm font-medium"
                                                >
                                                    View Recipe
                                                </button>
                                                <button
                                                    onClick={() => router.push(`/shopping/generate?recipeId=${recipe._id}`)}
                                                    className="px-3 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100 text-sm"
                                                >
                                                    🛒
                                                </button>
                                            </div>

                                            {/* Nutrition Badge */}
                                            {recipe.nutrition && (
                                                <div className="mt-2 text-center">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        🥗 Nutrition Available
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

// Main component wrapped with Suspense
export default function Recipes() {
    return (
        <Suspense fallback={
            <DashboardLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-lg">Loading...</div>
                </div>
            </DashboardLayout>
        }>
            <RecipesContent />
        </Suspense>
    );
}