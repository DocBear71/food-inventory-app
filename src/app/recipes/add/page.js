'use client';
// file: /src/app/recipes/add/page.js v8 - Enhanced with import data handling

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import EnhancedRecipeForm from '@/components/recipes/EnhancedRecipeForm';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { apiPost } from '@/lib/api-config';
import NativeNavigation from "@/components/mobile/NativeNavigation.js";

export default function AddRecipePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [importedRecipeData, setImportedRecipeData] = useState(null);
    const [importSource, setImportSource] = useState(null);

    // Check for imported recipe data
    // Check for imported recipe data
    useEffect(() => {
        const imported = searchParams.get('imported');
        const source = searchParams.get('source');

        if (imported === 'true') {
            // Try sessionStorage first (for new method)
            const storedRecipe = sessionStorage.getItem('importedRecipe');
            if (storedRecipe) {
                try {
                    const decodedData = JSON.parse(storedRecipe);
                    console.log('📥 Imported recipe data from sessionStorage:', decodedData);
                    setImportedRecipeData(decodedData);
                    setImportSource(source || 'unknown');

                    // Clean up sessionStorage
                    sessionStorage.removeItem('importedRecipe');
                } catch (error) {
                    console.error('Error parsing stored recipe data:', error);
                }
            } else {
                // Fallback to URL parameter (for compatibility)
                const dataParam = searchParams.get('data');
                if (dataParam) {
                    try {
                        const decodedData = JSON.parse(decodeURIComponent(dataParam));
                        console.log('📥 Imported recipe data from URL:', decodedData);
                        setImportedRecipeData(decodedData);
                        setImportSource(source || 'unknown');
                    } catch (error) {
                        console.error('Error parsing imported recipe data:', error);
                    }
                }
            }

            // Clean up URL parameters
            const cleanUrl = new URL(window.location);
            cleanUrl.searchParams.delete('imported');
            cleanUrl.searchParams.delete('source');
            cleanUrl.searchParams.delete('data');
            window.history.replaceState({}, '', cleanUrl);
        }
    }, [searchParams]);

    // Handle recipe submission with video import support
    const handleRecipeSubmit = async (recipeData) => {
        console.log('Submitting recipe:', recipeData);

        try {
            // Transform to match your API expectations
            const apiData = {
                title: recipeData.title,
                description: recipeData.description,
                prepTime: recipeData.prepTime ? parseInt(recipeData.prepTime) : null,
                cookTime: recipeData.cookTime ? parseInt(recipeData.cookTime) : null,
                servings: recipeData.servings ? parseInt(recipeData.servings) : null,
                difficulty: recipeData.difficulty,
                tags: recipeData.tags || [],
                source: recipeData.source || '',
                isPublic: recipeData.isPublic || false,
                category: recipeData.category || 'entrees',
                nutrition: recipeData.nutrition && Object.keys(recipeData.nutrition).length > 0 ? {
                    ...recipeData.nutrition,
                    calculatedAt: new Date()
                } : undefined,

                // ENHANCED INGREDIENTS - SUPPORTS ALL METHODS (manual, parser, URL, video)
                ingredients: recipeData.ingredients
                    .filter(ing => ing.name.trim())
                    .map(ing => {
                        const ingredient = {
                            name: ing.name,
                            amount: ing.amount || '',
                            unit: ing.unit || '',
                            optional: ing.optional || false
                        };

                        // Add video metadata only if it exists (video imports)
                        if (ing.videoTimestamp) {
                            ingredient.videoTimestamp = ing.videoTimestamp;
                            ingredient.videoLink = ing.videoLink;
                        }

                        return ingredient;
                    }),

                // FIXED INSTRUCTIONS - Handle all import methods properly
                instructions: recipeData.instructions
                    .filter(inst => {
                        // Handle both string and object instructions
                        const instructionText = typeof inst === 'string' ? inst : (inst.text || inst.instruction);
                        return instructionText && instructionText.trim();
                    })
                    .map((inst, index) => {
                        // Handle different instruction formats from different import methods
                        if (typeof inst === 'string') {
                            // Manual entry or text parser - return as string (your API expects this)
                            return inst;
                        } else if (inst.text) {
                            // Video import format: {text: "...", step: 1, videoTimestamp: 123}
                            // Your MongoDB schema supports this object format
                            return {
                                text: inst.text,
                                step: inst.step || index + 1,
                                ...(inst.videoTimestamp && {
                                    videoTimestamp: inst.videoTimestamp,
                                    videoLink: inst.videoLink
                                })
                            };
                        } else if (inst.instruction) {
                            // Alternative object format: {instruction: "...", step: 1}
                            // Convert to the schema format
                            return {
                                text: inst.instruction,
                                step: inst.step || index + 1,
                                ...(inst.videoTimestamp && {
                                    videoTimestamp: inst.videoTimestamp,
                                    videoLink: inst.videoLink
                                })
                            };
                        } else {
                            // Fallback - treat as string
                            return String(inst);
                        }
                    }),

                // ADD VIDEO METADATA SUPPORT (only if video data exists)
                ...(recipeData.videoMetadata && {
                    videoMetadata: recipeData.videoMetadata
                }),

                // Add importedFrom for video imports
                ...(recipeData.importedFrom && {
                    importedFrom: recipeData.importedFrom
                })
            };

            const response = await apiPost('/api/recipes', apiData);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Server Error',
                    message: `Server error: ${response.status} - ${errorText}`
                });
                return;
            }

            const data = await response.json();

            if (data.success) {
                // Show success message for video imports
                if (recipeData.videoMetadata) {
                    console.log(`✅ ${importSource || 'Video'} recipe imported successfully!`);
                }

                router.push(`/recipes/${data.recipe._id}`);
            } else {
                // Show error
                console.error('Recipe creation failed:', data.error);
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Recipe Creation Failed',
                    message: data.error || 'Failed to create recipe'
                });
                return;
            }
        } catch (error) {
            console.error('Error creating recipe:', error);

            // Enhanced error handling for video imports
            if (recipeData.videoMetadata || importSource) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: `${importSource || 'Imported'} Recipe Save Failed`,
                    message: `The recipe was extracted successfully but couldn't be saved: ${error.message}\n\nPlease try again.`
                });
            } else {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Recipe Creation Failed',
                    message: error.message
                });
            }

            throw error; // Re-throw so EnhancedRecipeForm can handle loading state
        }
    };

    // Handle cancel
    const handleCancel = async () => {
        await NativeNavigation.routerBack(router);
    };

    const getImportSourceInfo = () => {
        switch (importSource) {
            case 'tiktok':
                return { icon: '🎵', name: 'TikTok', color: 'pink' };
            case 'instagram':
                return { icon: '📸', name: 'Instagram', color: 'purple' };
            case 'facebook':
                return { icon: '👥', name: 'Facebook', color: 'blue' };
            case 'website':
                return { icon: '🌐', name: 'Website', color: 'green' };
            default:
                return { icon: '🎯', name: 'Import', color: 'indigo' };
        }
    };

    return (
        <MobileOptimizedLayout>
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold text-gray-900">
                                {importedRecipeData ? 'Review Imported Recipe' : 'Add New Recipe'}
                            </h1>
                            {importedRecipeData && (
                                <div className={`px-3 py-1 rounded-full text-sm font-medium bg-${getImportSourceInfo().color}-100 text-${getImportSourceInfo().color}-800`}>
                                    {getImportSourceInfo().icon} {getImportSourceInfo().name} Import
                                </div>
                            )}
                        </div>

                        {importedRecipeData ? (
                            <div className="text-gray-600 space-y-1">
                                <p>Review and edit the imported recipe details below, then save.</p>
                                {importSource === 'tiktok' && (
                                    <p className="text-sm">🎵 <strong>TikTok Recipe:</strong> Extracted using AI video analysis with timestamps</p>
                                )}
                                {importSource === 'instagram' && (
                                    <p className="text-sm">📸 <strong>Instagram Recipe:</strong> Extracted using AI content analysis</p>
                                )}
                                {importSource === 'facebook' && (
                                    <p className="text-sm">👥 <strong>Facebook Recipe:</strong> Extracted using AI video analysis</p>
                                )}
                                {importSource === 'website' && (
                                    <p className="text-sm">🌐 <strong>Website Recipe:</strong> Imported and enhanced with AI nutrition</p>
                                )}
                            </div>
                        ) : (
                            <div className="text-gray-600 mt-2 space-y-1">
                                <p>Choose your preferred method to add recipes:</p>
                                <div className="text-sm space-y-1 mt-2">
                                    <div>• <strong>Manual Entry:</strong> Build recipes step-by-step with full control</div>
                                    <div>• <strong>Text Paste:</strong> Paste recipe text or YouTube transcripts for AI extraction</div>
                                    <div>• <strong>Website Import:</strong> Import directly from recipe websites and blogs</div>
                                    <div>• <strong>Social Video:</strong> Extract from TikTok, Instagram, and Facebook videos</div>
                                </div>
                            </div>
                        )}
                    </div>
                    <TouchEnhancedButton
                        onClick={() => NativeNavigation.routerBack(router)}
                        className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
                    >
                        ← Back to Recipes
                    </TouchEnhancedButton>
                </div>

                {/* Import Success Message */}
                {importedRecipeData && (
                    <div className={`bg-${getImportSourceInfo().color}-50 border border-${getImportSourceInfo().color}-200 rounded-lg p-6 mb-6`}>
                        <div className="flex items-start">
                            <div className={`text-${getImportSourceInfo().color}-600 mr-3 mt-0.5`}>
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className={`text-lg font-medium text-${getImportSourceInfo().color}-800 mb-2`}>
                                    {getImportSourceInfo().icon} {getImportSourceInfo().name} Recipe Successfully Imported!
                                </h3>
                                <div className={`text-sm text-${getImportSourceInfo().color}-700 space-y-1`}>
                                    <p>✅ <strong>Title:</strong> {importedRecipeData.title || 'Untitled Recipe'}</p>
                                    <p>🥕 <strong>Ingredients:</strong> {importedRecipeData.ingredients?.length || 0} items</p>
                                    <p>📋 <strong>Instructions:</strong> {importedRecipeData.instructions?.length || 0} steps</p>
                                    {importedRecipeData.videoMetadata && (
                                        <p>🎥 <strong>Video Features:</strong> Timestamps and links included</p>
                                    )}
                                    {importedRecipeData.nutrition && Object.keys(importedRecipeData.nutrition).length > 0 && (
                                        <p>🤖 <strong>Nutrition:</strong> AI-calculated nutrition facts included</p>
                                    )}
                                </div>
                                <div className={`mt-3 text-xs text-${getImportSourceInfo().color}-600`}>
                                    Review the details below and make any necessary edits before saving your recipe.
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <EnhancedRecipeForm
                    initialData={importedRecipeData}
                    onSubmit={handleRecipeSubmit}
                    onCancel={handleCancel}
                    isEditing={false}
                    showNutritionAnalysis={true} // Enable nutrition AI for all recipes
                />

                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}