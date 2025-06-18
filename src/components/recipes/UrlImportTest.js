'use client';
// file: /src/components/recipes/UrlImportTest.js - v1
// This is a standalone test component to verify URL importing works


import { useState } from 'react';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import { getApiUrl} from "@/lib/api-config";

export default function UrlImportTest() {
    const [url, setUrl] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Sample URLs for testing
    const sampleUrls = [
        'https://www.allrecipes.com/recipe/213742/cheesy-chicken-broccoli-casserole/',
        'https://www.foodnetwork.com/recipes/alton-brown/baked-macaroni-and-cheese-recipe-1939524',
        'https://www.simplyrecipes.com/recipes/perfect_scrambled_eggs/',
        'https://cookist.com/pasta-alla-vodka/',
        'https://www.epicurious.com/recipes/food/views/chocolate-chip-cookies-51198570'
    ];

    const testImport = async (testUrl = url) => {
        if (!testUrl) {
            setError('Please enter a URL');
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await fetch(getApiUrl('/api/recipes/scrape'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: testUrl })
            });

            const data = await response.json();

            if (data.success) {
                setResult(data.recipe);
            } else {
                setError(data.error || 'Failed to import recipe');
            }
        } catch (err) {
            setError('Network error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    🧪 URL Import Test Tool
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Recipe URL
                        </label>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://www.allrecipes.com/recipe/..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quick Test URLs
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {sampleUrls.map((sampleUrl, index) => (
                                <TouchEnhancedButton
                                    key={index}
                                    onClick={() => {
                                        setUrl(sampleUrl);
                                        testImport(sampleUrl);
                                    }}
                                    disabled={loading}
                                    className="text-left p-2 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
                                >
                                    {new URL(sampleUrl).hostname.replace('www.', '')}
                                </TouchEnhancedButton>
                            ))}
                        </div>
                    </div>

                    <TouchEnhancedButton
                        onClick={() => testImport()}
                        disabled={!url || loading}
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Testing Import...
                            </>
                        ) : (
                            'Test URL Import'
                        )}
                    </TouchEnhancedButton>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-medium text-red-800 mb-2">Import Error</h3>
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {result && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h3 className="font-medium text-green-800 mb-4">✅ Import Successful!</h3>

                    <div className="space-y-4 text-sm">
                        <div>
                            <strong>Title:</strong> {result.title}
                        </div>

                        {result.description && (
                            <div>
                                <strong>Description:</strong> {result.description}
                            </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {result.prepTime && (
                                <div>
                                    <strong>Prep:</strong> {result.prepTime} min
                                </div>
                            )}
                            {result.cookTime && (
                                <div>
                                    <strong>Cook:</strong> {result.cookTime} min
                                </div>
                            )}
                            {result.servings && (
                                <div>
                                    <strong>Servings:</strong> {result.servings}
                                </div>
                            )}
                            <div>
                                <strong>Difficulty:</strong> {result.difficulty}
                            </div>
                        </div>

                        {result.ingredients && result.ingredients.length > 0 && (
                            <div>
                                <strong>Ingredients ({result.ingredients.length}):</strong>
                                <ul className="mt-2 space-y-1 pl-4">
                                    {result.ingredients.slice(0, 5).map((ing, i) => (
                                        <li key={i} className="text-xs">
                                            {ing.amount} {ing.unit} {ing.name}
                                            {ing.optional && ' (optional)'}
                                        </li>
                                    ))}
                                    {result.ingredients.length > 5 && (
                                        <li className="text-xs text-gray-500">
                                            ... and {result.ingredients.length - 5} more
                                        </li>
                                    )}
                                </ul>
                            </div>
                        )}

                        {result.instructions && result.instructions.length > 0 && (
                            <div>
                                <strong>Instructions ({result.instructions.length}):</strong>
                                <ol className="mt-2 space-y-1 pl-4">
                                    {result.instructions.slice(0, 3).map((inst, i) => (
                                        <li key={i} className="text-xs">
                                            {inst.substring(0, 100)}...
                                        </li>
                                    ))}
                                    {result.instructions.length > 3 && (
                                        <li className="text-xs text-gray-500">
                                            ... and {result.instructions.length - 3} more steps
                                        </li>
                                    )}
                                </ol>
                            </div>
                        )}

                        {result.tags && result.tags.length > 0 && (
                            <div>
                                <strong>Tags:</strong> {result.tags.join(', ')}
                            </div>
                        )}

                        <div>
                            <strong>Source:</strong> {result.source}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}