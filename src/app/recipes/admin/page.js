'use client';
// file: /src/app/recipes/admin/page.js v3 - Updated for Delimited Format


import {useState} from 'react';
import { useSafeSession } from '@/hooks/useSafeSession';
import {redirect} from 'next/navigation';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { apiPost, apiDelete, fetchWithSession } from '@/lib/api-config';

// Category options for the dropdown
const CATEGORY_OPTIONS = [
    { value: 'seasonings', label: 'Seasonings' },
    { value: 'sauces', label: 'Sauces' },
    { value: 'salad-dressings', label: 'Salad Dressings' },
    { value: 'marinades', label: 'Marinades' },
    { value: 'ingredients', label: 'Basic Ingredients' },
    { value: 'entrees', label: 'Entrees' },
    { value: 'side-dishes', label: 'Side Dishes' },
    { value: 'soups', label: 'Soups' },
    { value: 'sandwiches', label: 'Sandwiches' },
    { value: 'appetizers', label: 'Appetizers' },
    { value: 'desserts', label: 'Desserts' },
    { value: 'breads', label: 'Breads' },
    { value: 'pizza-dough', label: 'Pizza Dough' },
    { value: 'specialty-items', label: 'Specialty Items' },
    { value: 'beverages', label: 'Beverages' },
    { value: 'breakfast', label: 'Breakfast' }
];

export default function AdminRecipes() {
    let session = null;
    let status = 'loading';

    try {
        const sessionResult = useSafeSession();
        session = sessionResult?.data || null;
        status = sessionResult?.status || 'loading';
    } catch (error) {
        // Mobile build fallback
        session = null;
        status = 'unauthenticated';
    }

    const [uploadedFile, setUploadedFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [extractedText, setExtractedText] = useState('');
    const [parsedRecipes, setParsedRecipes] = useState([]);
    const [importResults, setImportResults] = useState(null);
    const [selectedVolume, setSelectedVolume] = useState('1');
    const [parseStats, setParseStats] = useState(null);

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
        redirect('/auth/signin');
    }

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploadedFile(file);
        setIsProcessing(true);
        setExtractedText('');
        setParsedRecipes([]);
        setParseStats(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('volume', selectedVolume);

            const response = await fetchWithSession('/api/recipes/extract', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setExtractedText(data.extractedText);
                setParsedRecipes(data.recipes || []);

                // Calculate parsing statistics
                const stats = {
                    totalRecipes: data.recipes?.length || 0,
                    withDescriptions: data.recipes?.filter(r => r.description && r.description.trim()).length || 0,
                    avgIngredients: data.recipes?.length > 0 ?
                        Math.round(data.recipes.reduce((sum, r) => sum + (r.ingredients?.length || 0), 0) / data.recipes.length) : 0,
                    avgInstructions: data.recipes?.length > 0 ?
                        Math.round(data.recipes.reduce((sum, r) => sum + (r.instructions?.length || 0), 0) / data.recipes.length) : 0,
                    categories: [...new Set(data.recipes?.map(r => r.category) || [])].length
                };
                setParseStats(stats);

                console.log(`Successfully extracted ${data.recipes.length} recipes!`);
            } else {
                console.error('Server error:', data.error);
                setExtractedText(data.details || data.error || 'Unknown error occurred');

                if (!data.extractedText) {
                    setExtractedText(`File upload failed: ${data.error}\n\nPlease check your file format and try again.`);
                }
            }
        } catch (error) {
            console.error('Upload error:', error);
            setExtractedText(`Network error: ${error.message}\n\nPlease check your connection and try again.`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBulkImport = async () => {
        if (parsedRecipes.length === 0) return;

        setIsProcessing(true);

        try {
            const response = await apiPost('/api/recipes/bulk-import', {
                recipes: parsedRecipes,
                volume: selectedVolume,
            });

            const data = await response.json();

            if (data.success) {
                setImportResults(data.results);
                setParsedRecipes([]);
                setExtractedText('');
                setUploadedFile(null);
                setParseStats(null);
            } else {
                alert('Error importing recipes: ' + data.error);
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('Error importing recipes');
        } finally {
            setIsProcessing(false);
        }
    };

    const editRecipe = (index, field, value) => {
        const updated = [...parsedRecipes];
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            if (!updated[index][parent]) updated[index][parent] = {};
            updated[index][parent][child] = value;
        } else {
            updated[index][field] = value;
        }
        setParsedRecipes(updated);
    };

    const removeRecipe = (index) => {
        const updated = parsedRecipes.filter((_, i) => i !== index);
        setParsedRecipes(updated);

        // Recalculate stats
        if (updated.length > 0) {
            const stats = {
                totalRecipes: updated.length,
                withDescriptions: updated.filter(r => r.description && r.description.trim()).length,
                avgIngredients: Math.round(updated.reduce((sum, r) => sum + (r.ingredients?.length || 0), 0) / updated.length),
                avgInstructions: Math.round(updated.reduce((sum, r) => sum + (r.instructions?.length || 0), 0) / updated.length),
                categories: [...new Set(updated.map(r => r.category))].length
            };
            setParseStats(stats);
        } else {
            setParseStats(null);
        }
    };

    const handleBulkCategoryChange = (newCategory) => {
        if (!newCategory) return;
        const updated = parsedRecipes.map(recipe => ({
            ...recipe,
            category: newCategory
        }));
        setParsedRecipes(updated);
    };

    const handleDeleteVolume = async () => {
        if (!confirm(`Are you sure you want to delete ALL recipes from Volume ${selectedVolume}? This cannot be undone.`)) {
            return;
        }

        setIsProcessing(true);

        try {
            const response = await apiDelete(`/api/recipes/delete-volume?volume=${selectedVolume}`);

            const data = await response.json();

            if (data.success) {
                alert(`Successfully deleted ${data.deletedCount} recipes from Volume ${selectedVolume}`);
                setImportResults(null);
                setParsedRecipes([]);
                setExtractedText('');
                setUploadedFile(null);
                setParseStats(null);
            } else {
                alert('Error deleting recipes: ' + data.error);
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Error deleting recipes');
        } finally {
            setIsProcessing(false);
        }
    };

    const getCategoryLabel = (categoryValue) => {
        const category = CATEGORY_OPTIONS.find(opt => opt.value === categoryValue);
        return category ? category.label : categoryValue;
    };

    const getCategorySummary = () => {
        const summary = {};
        parsedRecipes.forEach(recipe => {
            const category = recipe.category || 'uncategorized';
            summary[category] = (summary[category] || 0) + 1;
        });
        return summary;
    };

    return (
        <MobileOptimizedLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Admin Recipe Import
                    </h1>
                    <p className="text-gray-600">
                        Bulk import recipes from Doc Bear's Comfort Food Survival Guide cookbooks using the new delimited format
                    </p>
                </div>

                {/* Format Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-blue-900 mb-3">📝 Required Recipe Format</h3>
                    <div className="text-blue-800 space-y-2 text-sm">
                        <p><strong>Your DOCX/PDF file must follow this exact format:</strong></p>
                        <div className="bg-white p-4 rounded border font-mono text-xs">
                            <div className="text-gray-600">Recipe Title<br/>
                                <br/>
                                --Description--<br/>
                                Your recipe description here<br/>
                                <br/>
                                --Ingredients--<br/>
                                1 cup flour<br/>
                                2 tbsp butter<br/>
                                1 tsp salt<br/>
                                <br/>
                                --Instructions--<br/>
                                Mix ingredients together<br/>
                                Bake for 30 minutes<br/>
                                <br/>
                                --Tags--<br/>
                                baking, quick, family-friendly<br/>
                                <br/>
                                --RECIPE BREAK--</div>
                        </div>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Start each recipe with just the title</li>
                            <li>Use <code>--Description--</code>, <code>--Ingredients--</code>, <code>--Instructions--</code>, <code>--Tags--</code> as section headers</li>
                            <li>End each recipe with <code>--RECIPE BREAK--</code></li>
                            <li>List ingredients one per line with amounts</li>
                            <li>List instructions one step per line</li>
                            <li>Tags should be comma-separated</li>
                        </ul>
                    </div>
                </div>

                {/* Upload Section */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">📚 Upload Cookbook</h2>

                    <div className="space-y-4">
                        {/* Volume Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Volume
                            </label>
                            <select
                                value={selectedVolume}
                                onChange={(e) => setSelectedVolume(e.target.value)}
                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="1">Doc Bear's Comfort Food Survival Guide - Volume 1</option>
                                <option value="2">Doc Bear's Comfort Food Survival Guide - Volume 2</option>
                                <option value="3">Doc Bear's Comfort Food Survival Guide - Volume 3</option>
                                <option value="4">Doc Bear's Comfort Food Survival Guide - Volume 4</option>
                            </select>
                        </div>

                        {/* File Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Upload DOCX File (Recommended)
                            </label>
                            <input
                                type="file"
                                accept=".docx,.doc"
                                onChange={handleFileUpload}
                                disabled={isProcessing}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                💡 <strong>DOCX files only for best results.</strong> Make sure your file follows the delimited format above.
                            </p>
                        </div>

                        {/* Manual Entry Button */}
                        <div className="pt-4 border-t border-gray-200">
                            <TouchEnhancedButton
                                onClick={() => {
                                    const newRecipe = {
                                        title: '',
                                        description: '',
                                        ingredients: [],
                                        instructions: [],
                                        prepTime: 15,
                                        cookTime: 30,
                                        servings: 4,
                                        difficulty: 'medium',
                                        tags: ['comfort-food'],
                                        source: `Doc Bear's Comfort Food Survival Guide Volume ${selectedVolume}`,
                                        isPublic: false,
                                        category: 'entrees'
                                    };
                                    setParsedRecipes([...parsedRecipes, newRecipe]);
                                }}
                                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                            >
                                ➕ Add Recipe Manually
                            </TouchEnhancedButton>
                        </div>

                        {uploadedFile && (
                            <div className="text-sm text-gray-600">
                                📄 Uploaded: {uploadedFile.name} ({Math.round(uploadedFile.size / 1024)} KB)
                            </div>
                        )}

                        {isProcessing && (
                            <div className="flex items-center space-x-2 text-blue-600">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                <span>Processing file and parsing recipes...</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Parsing Statistics */}
                {parseStats && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-green-900 mb-2">📊 Parsing Results</h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-700">{parseStats.totalRecipes}</div>
                                <div className="text-green-600">Recipes Found</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-700">{parseStats.withDescriptions}</div>
                                <div className="text-green-600">With Descriptions</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-700">{parseStats.avgIngredients}</div>
                                <div className="text-green-600">Avg Ingredients</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-700">{parseStats.avgInstructions}</div>
                                <div className="text-green-600">Avg Instructions</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-700">{parseStats.categories}</div>
                                <div className="text-green-600">Categories</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Extracted Text Preview */}
                {extractedText && (
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">📝 Extracted Text Preview</h2>
                        <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                            <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                                {extractedText.substring(0, 2000)}
                                {extractedText.length > 2000 && '... (truncated)'}
                            </pre>
                        </div>
                    </div>
                )}

                {/* Parsed Recipes */}
                {parsedRecipes.length > 0 && (
                    <div className="bg-white shadow rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">🍳 Parsed Recipes ({parsedRecipes.length})</h2>
                            <TouchEnhancedButton
                                onClick={handleBulkImport}
                                disabled={isProcessing}
                                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                            >
                                {isProcessing ? 'Importing...' : `Import All ${parsedRecipes.length} Recipes`}
                            </TouchEnhancedButton>
                        </div>

                        {/* Bulk Category Change */}
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                            <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-2 md:space-y-0">
                                <label className="block text-sm font-medium text-gray-700">
                                    Change All Categories To:
                                </label>
                                <select
                                    onChange={(e) => e.target.value && handleBulkCategoryChange(e.target.value)}
                                    className="block w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    defaultValue=""
                                >
                                    <option value="">Select category for all...</option>
                                    {CATEGORY_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Category Summary */}
                            <div className="mt-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Current Category Distribution:</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                    {Object.entries(getCategorySummary()).map(([category, count]) => (
                                        <div key={category} className="text-gray-600">
                                            <strong>{getCategoryLabel(category)}:</strong> {count}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {parsedRecipes.map((recipe, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-lg font-medium text-gray-900">
                                            Recipe {index + 1}
                                            {recipe.title && <span className="text-blue-600"> - {recipe.title}</span>}
                                        </h3>
                                        <TouchEnhancedButton
                                            onClick={() => removeRecipe(index)}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            🗑️ Remove
                                        </TouchEnhancedButton>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {/* Title */}
                                        <div className="lg:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700">Title</label>
                                            <input
                                                type="text"
                                                value={recipe.title || ''}
                                                onChange={(e) => editRecipe(index, 'title', e.target.value)}
                                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        {/* Category Selector */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Category
                                            </label>
                                            <select
                                                value={recipe.category || 'entrees'}
                                                onChange={(e) => editRecipe(index, 'category', e.target.value)}
                                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            >
                                                {CATEGORY_OPTIONS.map(option => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Auto-detected: {getCategoryLabel(recipe.category)}
                                            </p>
                                        </div>

                                        {/* Prep Time */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Prep Time (minutes)</label>
                                            <input
                                                type="number"
                                                value={recipe.prepTime || ''}
                                                onChange={(e) => editRecipe(index, 'prepTime', parseInt(e.target.value) || 0)}
                                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        {/* Cook Time */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Cook Time (minutes)</label>
                                            <input
                                                type="number"
                                                value={recipe.cookTime || ''}
                                                onChange={(e) => editRecipe(index, 'cookTime', parseInt(e.target.value) || 0)}
                                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        {/* Servings */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Servings</label>
                                            <input
                                                type="number"
                                                value={recipe.servings || ''}
                                                onChange={(e) => editRecipe(index, 'servings', parseInt(e.target.value) || 0)}
                                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700">Description</label>
                                        <textarea
                                            value={recipe.description || ''}
                                            onChange={(e) => editRecipe(index, 'description', e.target.value)}
                                            rows="2"
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>

                                    {/* Ingredients */}
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Ingredients ({recipe.ingredients?.length || 0}) (one per line)
                                        </label>
                                        <textarea
                                            value={recipe.ingredients?.map(ing => `${ing.amount || ''} ${ing.unit || ''} ${ing.name || ''}`.trim()).join('\n') || ''}
                                            onChange={(e) => {
                                                const lines = e.target.value.split('\n');
                                                const ingredients = lines.map(line => {
                                                    const parts = line.trim().split(' ');
                                                    const amount = parseFloat(parts[0]) || '';
                                                    const unit = parts[1] || '';
                                                    const name = parts.slice(2).join(' ') || parts.slice(1).join(' ') || line.trim();
                                                    return {amount, unit, name};
                                                });
                                                editRecipe(index, 'ingredients', ingredients);
                                            }}
                                            rows="6"
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="2 cups flour&#10;1 tsp salt&#10;3 eggs"
                                        />
                                    </div>

                                    {/* Instructions */}
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Instructions ({recipe.instructions?.length || 0}) (one step per line)
                                        </label>
                                        <textarea
                                            value={recipe.instructions?.join('\n') || ''}
                                            onChange={(e) => editRecipe(index, 'instructions', e.target.value.split('\n').filter(line => line.trim()))}
                                            rows="6"
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="Preheat oven to 350°F&#10;Mix dry ingredients&#10;Add wet ingredients"
                                        />
                                    </div>

                                    {/* Tags */}
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Tags ({recipe.tags?.length || 0}) (comma-separated)
                                        </label>
                                        <input
                                            type="text"
                                            value={recipe.tags?.join(', ') || ''}
                                            onChange={(e) => {
                                                const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
                                                editRecipe(index, 'tags', tags);
                                            }}
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="comfort-food, family-friendly, quick"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Import Results */}
                {importResults && (
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">✅ Import Results</h2>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-700">{importResults.imported}</div>
                                    <div className="text-sm text-green-600">Successfully Imported</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-yellow-700">{importResults.duplicates || 0}</div>
                                    <div className="text-sm text-yellow-600">Duplicates Skipped</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-red-700">{importResults.skipped || 0}</div>
                                    <div className="text-sm text-red-600">Failed/Skipped</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-700">{importResults.successRate || 0}%</div>
                                    <div className="text-sm text-blue-600">Success Rate</div>
                                </div>
                            </div>

                            <p className="text-green-800 mb-2">
                                Successfully imported {importResults.imported} recipes from Volume {selectedVolume}!
                            </p>

                            {importResults.errors?.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-red-600 font-medium mb-2">Issues encountered:</p>
                                    <div className="bg-red-50 border border-red-200 rounded p-3 max-h-64 overflow-y-auto">
                                        <ul className="text-red-700 text-sm space-y-1">
                                            {importResults.errors.map((error, i) => (
                                                <li key={i}>• {error}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Delete Volume Button */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600 mb-2">
                                ⚠️ If the recipes didn't import correctly, you can delete all recipes from this volume and try again:
                            </p>
                            <TouchEnhancedButton
                                onClick={handleDeleteVolume}
                                disabled={isProcessing}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 flex items-center space-x-2"
                            >
                                <span className="emoji" role="img" aria-label="trash">🗑️</span>
                                <span>Delete All Volume {selectedVolume} Recipes</span>
                            </TouchEnhancedButton>
                        </div>
                    </div>
                )}

                {/* Delete Volume Section (if no recent import) */}
                {!importResults && (
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">🗑️ Clean Up Previous Imports</h2>
                        <p className="text-gray-600 mb-4">
                            If you need to delete all recipes from a previous import that didn't work correctly:
                        </p>
                        <div className="flex space-x-2">
                            <select
                                value={selectedVolume}
                                onChange={(e) => setSelectedVolume(e.target.value)}
                                className="block border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                            >
                                <option value="1">Volume 1</option>
                                <option value="2">Volume 2</option>
                                <option value="3">Volume 3</option>
                                <option value="4">Volume 4</option>
                            </select>
                            <TouchEnhancedButton
                                onClick={handleDeleteVolume}
                                disabled={isProcessing}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 flex items-center space-x-2"
                            >
                                <span className="emoji" role="img" aria-label="trash">🗑️</span>
                                <span>Delete All Volume {selectedVolume} Recipes</span>
                            </TouchEnhancedButton>
                        </div>
                    </div>
                )}

                {/* Enhanced Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-blue-900 mb-2">📋 How to Use the New Format</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-medium text-blue-800 mb-2">Step-by-Step Process:</h4>
                            <ol className="text-blue-800 space-y-1 text-sm list-decimal list-inside">
                                <li>Format your recipes using the delimited format shown above</li>
                                <li>Save as DOCX file (preferred) for best parsing results</li>
                                <li>Select the appropriate volume for your cookbook</li>
                                <li>Upload your file and wait for automatic parsing</li>
                                <li>Review the parsing statistics and parsed recipes</li>
                                <li>Adjust categories using bulk change or individual dropdowns</li>
                                <li>Edit any recipes that need corrections</li>
                                <li>Click "Import All Recipes" to add them to your database</li>
                            </ol>
                        </div>
                        <div>
                            <h4 className="font-medium text-blue-800 mb-2">Auto-Detection Features:</h4>
                            <ul className="text-blue-800 space-y-1 text-sm list-disc list-inside">
                                <li><strong>Smart Category Detection:</strong> Automatically categorizes recipes based on title, tags, and description</li>
                                <li><strong>Ingredient Parsing:</strong> Handles fractions (1/2, 1 1/2), decimals (2.5), and various units</li>
                                <li><strong>Duplicate Prevention:</strong> Won't import recipes with the same title</li>
                                <li><strong>Format Validation:</strong> Ensures all recipes have required fields</li>
                                <li><strong>Error Reporting:</strong> Detailed feedback on any parsing issues</li>
                                <li><strong>Flexible Tags:</strong> Automatically adds volume tags and preserves your custom tags</li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-yellow-800 text-sm">
                            <strong>💡 Pro Tip:</strong> Test with a small file first (2-3 recipes) to ensure your format is correct before uploading all recipes from a volume.
                        </p>
                    </div>
                </div>

                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}