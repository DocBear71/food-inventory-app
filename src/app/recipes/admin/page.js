// file: /src/app/recipes/admin/page.js

'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { redirect } from 'next/navigation';

export default function AdminRecipes() {
    const { data: session, status } = useSession();
    const [uploadedFile, setUploadedFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [extractedText, setExtractedText] = useState('');
    const [parsedRecipes, setParsedRecipes] = useState([]);
    const [importResults, setImportResults] = useState(null);
    const [selectedVolume, setSelectedVolume] = useState('1');

    if (status === 'loading') {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
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

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('volume', selectedVolume);

            const response = await fetch('/api/recipes/extract', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setExtractedText(data.extractedText);
                setParsedRecipes(data.recipes || []);

                // Show success message if recipes were parsed
                if (data.recipes && data.recipes.length > 0) {
                    console.log(`Successfully extracted ${data.recipes.length} recipes!`);
                } else {
                    console.log('File processed but no recipes were automatically detected. You can add recipes manually below.');
                }
            } else {
                console.error('Server error:', data.error);
                setExtractedText(data.details || data.error || 'Unknown error occurred');

                // Still allow manual entry even if extraction failed
                if (!data.extractedText) {
                    setExtractedText(`File upload failed: ${data.error}\n\nYou can still add recipes manually using the "Add Recipe Manually" button below.`);
                }
            }
        } catch (error) {
            console.error('Upload error:', error);
            setExtractedText(`Network error: ${error.message}\n\nYou can still add recipes manually using the "Add Recipe Manually" button below.`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBulkImport = async () => {
        if (parsedRecipes.length === 0) return;

        setIsProcessing(true);

        try {
            const response = await fetch('/api/recipes/bulk-import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipes: parsedRecipes,
                    volume: selectedVolume,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setImportResults(data.results);
                setParsedRecipes([]);
                setExtractedText('');
                setUploadedFile(null);
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

    const handleDeleteVolume = async () => {
        if (!confirm(`Are you sure you want to delete ALL recipes from Volume ${selectedVolume}? This cannot be undone.`)) {
            return;
        }

        setIsProcessing(true);

        try {
            const response = await fetch(`/api/recipes/delete-volume?volume=${selectedVolume}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                alert(`Successfully deleted ${data.deletedCount} recipes from Volume ${selectedVolume}`);
                setImportResults(null);
                setParsedRecipes([]);
                setExtractedText('');
                setUploadedFile(null);
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

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Admin Recipe Import
                    </h1>
                    <p className="text-gray-600">
                        Bulk import recipes from Doc Bear's Comfort Food Survival Guide cookbooks
                    </p>
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
                                Upload PDF or DOCX File
                            </label>
                            <input
                                type="file"
                                accept=".pdf,.docx,.doc"
                                onChange={handleFileUpload}
                                disabled={isProcessing}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                💡 For best results, use DOCX files. PDF extraction may not work perfectly with all formats.
                            </p>
                        </div>

                        {/* Manual Entry Button */}
                        <div className="pt-4 border-t border-gray-200">
                            <button
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
                                        isPublic: false
                                    };
                                    setParsedRecipes([...parsedRecipes, newRecipe]);
                                }}
                                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                            >
                                ➕ Add Recipe Manually
                            </button>
                            <p className="mt-1 text-xs text-gray-500 text-center">
                                Can't upload a file? Add recipes one by one manually
                            </p>
                        </div>

                        {uploadedFile && (
                            <div className="text-sm text-gray-600">
                                📄 Uploaded: {uploadedFile.name} ({Math.round(uploadedFile.size / 1024)} KB)
                            </div>
                        )}

                        {isProcessing && (
                            <div className="flex items-center space-x-2 text-blue-600">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                <span>Processing file...</span>
                            </div>
                        )}
                    </div>
                </div>

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
                            <button
                                onClick={handleBulkImport}
                                disabled={isProcessing}
                                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                            >
                                {isProcessing ? 'Importing...' : `Import All ${parsedRecipes.length} Recipes`}
                            </button>
                        </div>

                        <div className="space-y-6">
                            {parsedRecipes.map((recipe, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-lg font-medium text-gray-900">Recipe {index + 1}</h3>
                                        <button
                                            onClick={() => removeRecipe(index)}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            🗑️ Remove
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Title */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Title</label>
                                            <input
                                                type="text"
                                                value={recipe.title || ''}
                                                onChange={(e) => editRecipe(index, 'title', e.target.value)}
                                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                            />
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
                                        <label className="block text-sm font-medium text-gray-700">Ingredients (one per line)</label>
                                        <textarea
                                            value={recipe.ingredients?.map(ing => `${ing.amount || ''} ${ing.unit || ''} ${ing.name || ''}`.trim()).join('\n') || ''}
                                            onChange={(e) => {
                                                const lines = e.target.value.split('\n');
                                                const ingredients = lines.map(line => {
                                                    const parts = line.trim().split(' ');
                                                    const amount = parseFloat(parts[0]) || '';
                                                    const unit = parts[1] || '';
                                                    const name = parts.slice(2).join(' ') || parts.slice(1).join(' ') || line.trim();
                                                    return { amount, unit, name };
                                                });
                                                editRecipe(index, 'ingredients', ingredients);
                                            }}
                                            rows="4"
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="2 cups flour&#10;1 tsp salt&#10;3 eggs"
                                        />
                                    </div>

                                    {/* Instructions */}
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700">Instructions (one step per line)</label>
                                        <textarea
                                            value={recipe.instructions?.join('\n') || ''}
                                            onChange={(e) => editRecipe(index, 'instructions', e.target.value.split('\n').filter(line => line.trim()))}
                                            rows="4"
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="Preheat oven to 350°F&#10;Mix dry ingredients&#10;Add wet ingredients"
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
                            <p className="text-green-800">
                                Successfully imported {importResults.imported} recipes from Volume {selectedVolume}!
                            </p>
                            {importResults.errors?.length > 0 && (
                                <div className="mt-2">
                                    <p className="text-red-600 font-medium">Errors:</p>
                                    <ul className="text-red-600 text-sm mt-1">
                                        {importResults.errors.map((error, i) => (
                                            <li key={i}>• {error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Delete Volume Button */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600 mb-2">
                                ⚠️ If the recipes didn't import correctly, you can delete all recipes from this volume and try again:
                            </p>
                            <button
                                onClick={handleDeleteVolume}
                                disabled={isProcessing}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 text-sm"
                            >
                                🗑️ Delete All Volume {selectedVolume} Recipes
                            </button>
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
                            <button
                                onClick={handleDeleteVolume}
                                disabled={isProcessing}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
                            >
                                🗑️ Delete All Volume {selectedVolume} Recipes
                            </button>
                        </div>
                    </div>
                )}

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-blue-900 mb-2">📋 How to Use</h3>
                    <ul className="text-blue-800 space-y-1 text-sm">
                        <li>1. Select the volume of Doc Bear's Comfort Food Survival Guide</li>
                        <li>2. Upload your PDF or DOCX file containing the recipes</li>
                        <li>3. Review the extracted text to ensure proper parsing</li>
                        <li>4. Edit any recipes that need corrections</li>
                        <li>5. Click "Import All Recipes" to add them to your database</li>
                        <li>6. The recipes will be tagged with the appropriate volume source</li>
                    </ul>
                </div>
            </div>
        </DashboardLayout>
    );
}