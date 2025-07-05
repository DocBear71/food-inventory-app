'use client';
// file: /src/app/recipes/admin/meals/page.js v1 - Admin interface for managing curated meal suggestions

import { useState, useEffect } from 'react';
import { useSafeSession } from '@/hooks/useSafeSession';
import { redirect } from 'next/navigation';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-config';

const MEAL_CATEGORIES = [
    { value: 'protein', label: 'Protein', icon: '🥩' },
    { value: 'starch', label: 'Starch', icon: '🍚' },
    { value: 'vegetable', label: 'Vegetable', icon: '🥬' },
    { value: 'sauce', label: 'Sauce', icon: '🥄' },
    { value: 'dairy', label: 'Dairy', icon: '🧀' },
    { value: 'fruit', label: 'Fruit', icon: '🍎' },
    { value: 'condiment', label: 'Condiment', icon: '🍯' }
];

const MEAL_TYPES = [
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'snack', label: 'Snack' },
    { value: 'dessert', label: 'Dessert' },
    { value: 'any', label: 'Any Time' }
];

const DIFFICULTIES = [
    { value: 'easy', label: 'Easy', color: 'green' },
    { value: 'medium', label: 'Medium', color: 'yellow' },
    { value: 'hard', label: 'Hard', color: 'red' }
];

const SEASONS = [
    { value: 'spring', label: 'Spring' },
    { value: 'summer', label: 'Summer' },
    { value: 'fall', label: 'Fall' },
    { value: 'winter', label: 'Winter' },
    { value: 'any', label: 'Any Season' }
];

export default function CuratedMealsAdmin() {
    let session = null;
    let status = 'loading';

    try {
        const sessionResult = useSafeSession();
        session = sessionResult?.data || null;
        status = sessionResult?.status || 'loading';
    } catch (error) {
        session = null;
        status = 'unauthenticated';
    }

    const [meals, setMeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingMeal, setEditingMeal] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [summary, setSummary] = useState({});

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        components: [{ itemName: '', category: 'protein', required: true, alternatives: [], notes: '' }],
        tags: [],
        estimatedTime: 30,
        difficulty: 'easy',
        servings: 4,
        mealType: 'dinner',
        season: 'any',
        cookingTips: [],
        nutritionTags: [],
        source: '',
        submissionType: 'admin'
    });

    const [newTag, setNewTag] = useState('');
    const [newTip, setNewTip] = useState('');
    const [newNutritionTag, setNewNutritionTag] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/auth/signin');
        }
    }, [status]);

    useEffect(() => {
        if (session) {
            fetchMeals();
        }
    }, [session, filterStatus]);

    const fetchMeals = async () => {
        setLoading(true);
        try {
            const response = await apiGet(`/api/admin/meals?status=${filterStatus}&limit=50`);
            const data = await response.json();

            if (data.success) {
                setMeals(data.meals);
                setSummary(data.summary);
            } else {
                console.error('Failed to fetch meals:', data.error);
            }
        } catch (error) {
            console.error('Error fetching meals:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const body = editingMeal
                ? { mealId: editingMeal._id, ...formData }
                : formData;

            const response = editingMeal
                ? await apiPut('/api/admin/meals', body)
                : await apiPost('/api/admin/meals', body);

            const data = await response.json();

            if (data.success) {
                await fetchMeals();
                resetForm();
                alert(data.message || 'Meal saved successfully!');
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error saving meal:', error);
            alert('Error saving meal');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (meal) => {
        setEditingMeal(meal);
        setFormData({
            name: meal.name,
            description: meal.description,
            components: meal.components.map(comp => ({
                itemName: comp.itemName,
                category: comp.category,
                required: comp.required,
                alternatives: comp.alternatives || [],
                notes: comp.notes || ''
            })),
            tags: meal.tags || [],
            estimatedTime: meal.estimatedTime,
            difficulty: meal.difficulty,
            servings: meal.servings,
            mealType: meal.mealType,
            season: meal.season,
            cookingTips: meal.cookingTips || [],
            nutritionTags: meal.nutritionTags || [],
            source: meal.source || '',
            submissionType: meal.submissionType
        });
        setShowAddForm(true);
    };

    const handleDelete = async (mealId) => {
        if (!confirm('Are you sure you want to delete this meal?')) return;

        try {
            const response = await apiDelete(`/api/admin/meals?mealId=${mealId}`);

            const data = await response.json();

            if (data.success) {
                await fetchMeals();
                alert('Meal deleted successfully');
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error deleting meal:', error);
            alert('Error deleting meal');
        }
    };

    const handleApprove = async (mealId) => {
        try {
            const response = await apiPut('/api/admin/meals', { mealId, action: 'approve' });

            const data = await response.json();

            if (data.success) {
                await fetchMeals();
                alert('Meal approved successfully');
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error approving meal:', error);
        }
    };

    const handleReject = async (mealId) => {
        const reason = prompt('Please provide a reason for rejection:');
        if (!reason) return;

        try {
            const response = await apiPut('/api/admin/meals', { mealId, action: 'reject', rejectionReason: reason });

            const data = await response.json();

            if (data.success) {
                await fetchMeals();
                alert('Meal rejected');
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error rejecting meal:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            components: [{ itemName: '', category: 'protein', required: true, alternatives: [], notes: '' }],
            tags: [],
            estimatedTime: 30,
            difficulty: 'easy',
            servings: 4,
            mealType: 'dinner',
            season: 'any',
            cookingTips: [],
            nutritionTags: [],
            source: '',
            submissionType: 'admin'
        });
        setEditingMeal(null);
        setShowAddForm(false);
        setNewTag('');
        setNewTip('');
        setNewNutritionTag('');
    };

    const addComponent = () => {
        setFormData(prev => ({
            ...prev,
            components: [...prev.components, { itemName: '', category: 'protein', required: true, alternatives: [], notes: '' }]
        }));
    };

    const removeComponent = (index) => {
        setFormData(prev => ({
            ...prev,
            components: prev.components.filter((_, i) => i !== index)
        }));
    };

    const updateComponent = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            components: prev.components.map((comp, i) =>
                i === index ? { ...comp, [field]: value } : comp
            )
        }));
    };

    const addTag = () => {
        if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, newTag.trim()]
            }));
            setNewTag('');
        }
    };

    const removeTag = (tagToRemove) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    const addCookingTip = () => {
        if (newTip.trim() && !formData.cookingTips.includes(newTip.trim())) {
            setFormData(prev => ({
                ...prev,
                cookingTips: [...prev.cookingTips, newTip.trim()]
            }));
            setNewTip('');
        }
    };

    const removeCookingTip = (tipToRemove) => {
        setFormData(prev => ({
            ...prev,
            cookingTips: prev.cookingTips.filter(tip => tip !== tipToRemove)
        }));
    };

    const addNutritionTag = () => {
        if (newNutritionTag.trim() && !formData.nutritionTags.includes(newNutritionTag.trim())) {
            setFormData(prev => ({
                ...prev,
                nutritionTags: [...prev.nutritionTags, newNutritionTag.trim()]
            }));
            setNewNutritionTag('');
        }
    };

    const removeNutritionTag = (tagToRemove) => {
        setFormData(prev => ({
            ...prev,
            nutritionTags: prev.nutritionTags.filter(tag => tag !== tagToRemove)
        }));
    };

    const getStatusColor = (status, isApproved) => {
        if (isApproved) return 'bg-green-100 text-green-800';
        if (status === 'pending') return 'bg-yellow-100 text-yellow-800';
        if (status === 'rejected') return 'bg-red-100 text-red-800';
        return 'bg-gray-100 text-gray-800';
    };

    const getDifficultyColor = (difficulty) => {
        const colors = {
            easy: 'bg-green-100 text-green-800',
            medium: 'bg-yellow-100 text-yellow-800',
            hard: 'bg-red-100 text-red-800'
        };
        return colors[difficulty] || colors.medium;
    };

    if (status === 'loading') {
        return (
            <MobileOptimizedLayout>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <div className="text-lg text-gray-600">Loading dashboard...</div>
                    </div>
                </div>
            </MobileOptimizedLayout>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <MobileOptimizedLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Curated Meal Management</h1>
                        <p className="text-gray-600">Manage meal suggestions for the recipe suggestion system</p>
                    </div>
                    <TouchEnhancedButton
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        {showAddForm ? 'Cancel' : 'Add New Meal'}
                    </TouchEnhancedButton>
                </div>

                {/* Summary Statistics */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">📊 Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{summary.total || 0}</div>
                            <div className="text-sm text-gray-500">Total Meals</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{summary.approved || 0}</div>
                            <div className="text-sm text-gray-500">Approved</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-600">{summary.pending || 0}</div>
                            <div className="text-sm text-gray-500">Pending</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">{summary.rejected || 0}</div>
                            <div className="text-sm text-gray-500">Rejected</div>
                        </div>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="bg-white shadow rounded-lg">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                            {[
                                { id: 'all', label: 'All Meals', count: summary.total },
                                { id: 'pending', label: 'Pending Approval', count: summary.pending },
                                { id: 'approved', label: 'Approved', count: summary.approved },
                                { id: 'rejected', label: 'Rejected', count: summary.rejected }
                            ].map(tab => (
                                <TouchEnhancedButton
                                    key={tab.id}
                                    onClick={() => setFilterStatus(tab.id)}
                                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                                        filterStatus === tab.id
                                            ? 'border-indigo-500 text-indigo-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    {tab.label} ({tab.count || 0})
                                </TouchEnhancedButton>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Add/Edit Form */}
                {showAddForm && (
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900">
                                {editingMeal ? 'Edit Meal' : 'Add New Curated Meal'}
                            </h3>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Basic Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Meal Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="e.g., Grilled Chicken Dinner"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Description *
                                    </label>
                                    <textarea
                                        required
                                        rows="3"
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Describe this meal and what makes it special..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Estimated Time (minutes) *
                                    </label>
                                    <input
                                        type="number"
                                        min="5"
                                        max="300"
                                        required
                                        value={formData.estimatedTime}
                                        onChange={(e) => setFormData(prev => ({ ...prev, estimatedTime: parseInt(e.target.value) }))}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Servings
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={formData.servings}
                                        onChange={(e) => setFormData(prev => ({ ...prev, servings: parseInt(e.target.value) }))}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Difficulty
                                    </label>
                                    <select
                                        value={formData.difficulty}
                                        onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        {DIFFICULTIES.map(diff => (
                                            <option key={diff.value} value={diff.value}>
                                                {diff.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Meal Type
                                    </label>
                                    <select
                                        value={formData.mealType}
                                        onChange={(e) => setFormData(prev => ({ ...prev, mealType: e.target.value }))}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        {MEAL_TYPES.map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Season
                                    </label>
                                    <select
                                        value={formData.season}
                                        onChange={(e) => setFormData(prev => ({ ...prev, season: e.target.value }))}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        {SEASONS.map(season => (
                                            <option key={season.value} value={season.value}>
                                                {season.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Source (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.source}
                                        onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="e.g., Family Recipe, Doc Bear's Volume 1"
                                    />
                                </div>
                            </div>

                            {/* Meal Components */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Meal Components * (at least 1 required)
                                    </label>
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={addComponent}
                                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                    >
                                        + Add Component
                                    </TouchEnhancedButton>
                                </div>

                                <div className="space-y-4">
                                    {formData.components.map((component, index) => (
                                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        Item Name *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={component.itemName}
                                                        onChange={(e) => updateComponent(index, 'itemName', e.target.value)}
                                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                        placeholder="e.g., chicken breast, mashed potatoes"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        Category *
                                                    </label>
                                                    <select
                                                        value={component.category}
                                                        onChange={(e) => updateComponent(index, 'category', e.target.value)}
                                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                    >
                                                        {MEAL_CATEGORIES.map(cat => (
                                                            <option key={cat.value} value={cat.value}>
                                                                {cat.icon} {cat.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={component.required}
                                                            onChange={(e) => updateComponent(index, 'required', e.target.checked)}
                                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                        />
                                                        <label className="ml-2 text-xs text-gray-700">Required</label>
                                                    </div>
                                                    {formData.components.length > 1 && (
                                                        <TouchEnhancedButton
                                                            type="button"
                                                            onClick={() => removeComponent(index)}
                                                            className="text-red-600 hover:text-red-800 text-sm"
                                                        >
                                                            Remove
                                                        </TouchEnhancedButton>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Notes (optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={component.notes}
                                                    onChange={(e) => updateComponent(index, 'notes', e.target.value)}
                                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                                    placeholder="e.g., grilled medium-rare, seasoned with herbs"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tags
                                </label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {formData.tags.map((tag, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                        >
                                            {tag}
                                            <TouchEnhancedButton
                                                type="button"
                                                onClick={() => removeTag(tag)}
                                                className="ml-1 text-blue-600 hover:text-blue-800"
                                            >
                                                ×
                                            </TouchEnhancedButton>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                        className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Add tag (e.g., comfort-food, quick, family-friendly)"
                                    />
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={addTag}
                                        className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                    >
                                        Add
                                    </TouchEnhancedButton>
                                </div>
                            </div>

                            {/* Cooking Tips */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Cooking Tips
                                </label>
                                <div className="space-y-2 mb-2">
                                    {formData.cookingTips.map((tip, index) => (
                                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                            <span className="text-sm text-gray-700">{tip}</span>
                                            <TouchEnhancedButton
                                                type="button"
                                                onClick={() => removeCookingTip(tip)}
                                                className="text-red-600 hover:text-red-800 text-sm"
                                            >
                                                Remove
                                            </TouchEnhancedButton>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newTip}
                                        onChange={(e) => setNewTip(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCookingTip())}
                                        className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Add cooking tip..."
                                    />
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={addCookingTip}
                                        className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                    >
                                        Add
                                    </TouchEnhancedButton>
                                </div>
                            </div>

                            {/* Nutrition Tags */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nutrition Tags
                                </label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {formData.nutritionTags.map((tag, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                                        >
                                            {tag}
                                            <TouchEnhancedButton
                                                type="button"
                                                onClick={() => removeNutritionTag(tag)}
                                                className="ml-1 text-green-600 hover:text-green-800"
                                            >
                                                ×
                                            </TouchEnhancedButton>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newNutritionTag}
                                        onChange={(e) => setNewNutritionTag(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addNutritionTag())}
                                        className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        placeholder="Add nutrition tag (e.g., high-protein, low-carb, heart-healthy)"
                                    />
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={addNutritionTag}
                                        className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                    >
                                        Add
                                    </TouchEnhancedButton>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                                <TouchEnhancedButton
                                    type="button"
                                    onClick={resetForm}
                                    className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    Cancel
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400"
                                >
                                    {loading ? 'Saving...' : editingMeal ? 'Update Meal' : 'Create Meal'}
                                </TouchEnhancedButton>
                            </div>
                        </form>
                    </div>
                )}

                {/* Meals List */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">
                            Curated Meals ({meals.length})
                        </h3>
                    </div>

                    {loading ? (
                        <div className="p-6 text-center">
                            <div className="text-gray-500">Loading meals...</div>
                        </div>
                    ) : meals.length === 0 ? (
                        <div className="p-6 text-center">
                            <div className="text-gray-500 mb-4">No meals found</div>
                            <TouchEnhancedButton
                                onClick={() => setShowAddForm(true)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
                            >
                                Add your first curated meal
                            </TouchEnhancedButton>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {meals.map((meal) => (
                                <div key={meal._id} className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h4 className="text-lg font-medium text-gray-900">{meal.name}</h4>
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(meal.status, meal.isApproved)}`}>
                                                    {meal.isApproved ? 'Approved' : meal.status}
                                                </span>
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(meal.difficulty)}`}>
                                                    {meal.difficulty}
                                                </span>
                                            </div>
                                            <p className="text-gray-600 mb-3">{meal.description}</p>

                                            <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                                                <span>⏱️ {meal.estimatedTime} min</span>
                                                <span>👥 {meal.servings} servings</span>
                                                <span>🍽️ {meal.mealType}</span>
                                                <span>📅 {meal.season}</span>
                                            </div>

                                            {/* Components */}
                                            <div className="mb-3">
                                                <div className="text-sm font-medium text-gray-700 mb-2">Components:</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {meal.components.map((comp, index) => (
                                                        <span
                                                            key={index}
                                                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                                comp.required ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-600'
                                                            }`}
                                                        >
                                                            {MEAL_CATEGORIES.find(cat => cat.value === comp.category)?.icon} {comp.itemName}
                                                            {!comp.required && ' (optional)'}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Tags */}
                                            {meal.tags && meal.tags.length > 0 && (
                                                <div className="mb-3">
                                                    <div className="text-sm font-medium text-gray-700 mb-2">Tags:</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {meal.tags.map((tag, index) => (
                                                            <span
                                                                key={index}
                                                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Metadata */}
                                            <div className="text-xs text-gray-500">
                                                <div>Created by: {meal.createdBy?.name || 'Unknown'}</div>
                                                {meal.submittedBy && meal.submittedBy._id !== meal.createdBy._id && (
                                                    <div>Submitted by: {meal.submittedBy.name}</div>
                                                )}
                                                <div>Created: {new Date(meal.createdAt).toLocaleDateString()}</div>
                                                {meal.usageStats?.timesSuggested > 0 && (
                                                    <div>Usage: {meal.usageStats.timesSuggested} suggestions, {meal.usageStats.timesUsed} uses</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col space-y-2 ml-4">
                                            <TouchEnhancedButton
                                                onClick={() => handleEdit(meal)}
                                                className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                            >
                                                ✏️ Edit
                                            </TouchEnhancedButton>

                                            {meal.status === 'pending' && (
                                                <>
                                                    <TouchEnhancedButton
                                                        onClick={() => handleApprove(meal._id)}
                                                        className="inline-flex items-center px-3 py-1 border border-green-300 text-xs font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100"
                                                    >
                                                        ✅ Approve
                                                    </TouchEnhancedButton>
                                                    <TouchEnhancedButton
                                                        onClick={() => handleReject(meal._id)}
                                                        className="inline-flex items-center px-3 py-1 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100"
                                                    >
                                                        ❌ Reject
                                                    </TouchEnhancedButton>
                                                </>
                                            )}

                                            <TouchEnhancedButton
                                                onClick={() => handleDelete(meal._id)}
                                                className="inline-flex items-center px-3 py-1 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100"
                                            >
                                                🗑️ Delete
                                            </TouchEnhancedButton>
                                        </div>
                                    </div>

                                    {/* Rejection Reason */}
                                    {meal.status === 'rejected' && meal.rejectionReason && (
                                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                                            <div className="text-sm font-medium text-red-800">Rejection Reason:</div>
                                            <div className="text-sm text-red-700">{meal.rejectionReason}</div>
                                        </div>
                                    )}

                                    {/* Cooking Tips */}
                                    {meal.cookingTips && meal.cookingTips.length > 0 && (
                                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                            <div className="text-sm font-medium text-yellow-800 mb-2">💡 Cooking Tips:</div>
                                            <ul className="text-sm text-yellow-700 space-y-1">
                                                {meal.cookingTips.map((tip, index) => (
                                                    <li key={index}>• {tip}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Instructions for Users */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-blue-900 mb-3">📝 How to Use Curated Meals</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-medium text-blue-800 mb-2">Creating Effective Meals:</h4>
                            <ul className="text-blue-800 space-y-1 text-sm list-disc list-inside">
                                <li>Focus on popular, well-tested meal combinations</li>
                                <li>Include a variety of components (protein + starch + vegetable works well)</li>
                                <li>Use clear, searchable ingredient names</li>
                                <li>Add helpful cooking tips for better user experience</li>
                                <li>Tag meals appropriately for filtering (comfort-food, quick, family-friendly)</li>
                                <li>Set realistic time estimates</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-medium text-blue-800 mb-2">Component Categories:</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                {MEAL_CATEGORIES.map(cat => (
                                    <div key={cat.value} className="text-blue-700">
                                        <span className="font-medium">{cat.icon} {cat.label}:</span>
                                        <div className="text-xs text-blue-600 ml-4">
                                            {cat.value === 'protein' && 'Meats, fish, tofu, beans'}
                                            {cat.value === 'starch' && 'Rice, potatoes, bread, pasta'}
                                            {cat.value === 'vegetable' && 'Any vegetables or greens'}
                                            {cat.value === 'sauce' && 'Gravies, sauces, dressings'}
                                            {cat.value === 'dairy' && 'Cheese, milk products'}
                                            {cat.value === 'fruit' && 'Fresh or canned fruits'}
                                            {cat.value === 'condiment' && 'Mustard, ketchup, etc.'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-yellow-800 text-sm">
                            <strong>💡 Pro Tip:</strong> These curated meals will be suggested to users based on their available inventory.
                            The more accurate and appealing your meal descriptions, the more likely users are to try them!
                        </p>
                    </div>
                </div>

                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}