'use client';
// file: /src/app/recipes/add/page.js v9 - STANDARDIZED import success screen for ALL imports

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

    // ENHANCED: Detect import source from multiple indicators
    const detectImportSource = (recipeData, urlSource) => {
        // Priority 1: URL parameter
        if (urlSource) {
            return urlSource;
        }

        // Priority 2: Recipe metadata
        if (recipeData) {
            // Check for platform in various places
            if (recipeData.platform) {
                return recipeData.platform;
            }

            if (recipeData.videoMetadata?.platform) {
                return recipeData.videoMetadata.platform;
            }

            if (recipeData.extractionInfo?.platform) {
                return recipeData.extractionInfo.platform;
            }

            // Check source URL for platform indicators
            if (recipeData.source) {
                const sourceUrl = recipeData.source.toLowerCase();
                if (sourceUrl.includes('tiktok.com') || sourceUrl.includes('vm.tiktok.com')) return 'tiktok';
                if (sourceUrl.includes('instagram.com')) return 'instagram';
                if (sourceUrl.includes('facebook.com') || sourceUrl.includes('fb.watch')) return 'facebook';
                if (sourceUrl.includes('twitter.com') || sourceUrl.includes('x.com')) return 'twitter';
                if (sourceUrl.includes('youtube.com') || sourceUrl.includes('youtu.be')) return 'youtube';
                if (sourceUrl.includes('reddit.com')) return 'reddit';
                if (sourceUrl.includes('pinterest.com')) return 'pinterest';
                if (sourceUrl.includes('bsky.app') || sourceUrl.includes('bluesky.app')) return 'bluesky';
                if (sourceUrl.includes('linkedin.com')) return 'linkedin';
                if (sourceUrl.includes('threads.net')) return 'threads';
                if (sourceUrl.includes('snapchat.com')) return 'snapchat';

                // Check for website imports
                if (sourceUrl.startsWith('http') && !sourceUrl.includes('tiktok') && !sourceUrl.includes('instagram')) {
                    return 'website';
                }
            }

            // Check extraction method for clues
            if (recipeData.extractionMethod || recipeData.extraction_method) {
                const method = (recipeData.extractionMethod || recipeData.extraction_method).toLowerCase();
                if (method.includes('tiktok')) return 'tiktok';
                if (method.includes('instagram')) return 'instagram';
                if (method.includes('facebook')) return 'facebook';
                if (method.includes('twitter')) return 'twitter';
                if (method.includes('youtube')) return 'youtube';
                if (method.includes('reddit')) return 'reddit';
                if (method.includes('website') || method.includes('url')) return 'website';
                if (method.includes('text') || method.includes('paste')) return 'text';
            }

            // Check for video-specific indicators
            if (recipeData.videoMetadata || recipeData.extractedImage || recipeData.videoInfo) {
                return 'video'; // Generic video import
            }

            // Check importedFrom field
            if (recipeData.importedFrom) {
                const importedFrom = recipeData.importedFrom.toLowerCase();
                if (importedFrom.includes('tiktok')) return 'tiktok';
                if (importedFrom.includes('instagram')) return 'instagram';
                if (importedFrom.includes('facebook')) return 'facebook';
                if (importedFrom.includes('website')) return 'website';
                if (importedFrom.includes('url')) return 'website';
                if (importedFrom.includes('text')) return 'text';
            }
        }

        // Default fallback
        return 'import';
    };

    // Check for imported recipe data
    useEffect(() => {
        const imported = searchParams.get('imported');
        const urlSource = searchParams.get('source');

        if (imported === 'true') {
            // Try sessionStorage first (for new method)
            const storedRecipe = sessionStorage.getItem('importedRecipe');
            if (storedRecipe) {
                try {
                    const decodedData = JSON.parse(storedRecipe);
                    console.log('📥 Imported recipe data from sessionStorage:', decodedData);

                    // Detect import source from multiple indicators
                    const detectedSource = detectImportSource(decodedData, urlSource);
                    console.log('🔍 Detected import source:', detectedSource);

                    setImportedRecipeData(decodedData);
                    setImportSource(detectedSource);

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

                        // Detect import source from multiple indicators
                        const detectedSource = detectImportSource(decodedData, urlSource);
                        console.log('🔍 Detected import source:', detectedSource);

                        setImportedRecipeData(decodedData);
                        setImportSource(detectedSource);
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

                // Add importedFrom for all imports
                ...(importSource && {
                    importedFrom: `${importSource} import`
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
                // Show success message for imports
                if (importSource) {
                    console.log(`✅ ${importSource} recipe imported successfully!`);
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

            // Enhanced error handling for imports
            if (importSource) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: `${getImportSourceInfo().name} Recipe Save Failed`,
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

    // ENHANCED: More comprehensive import source info
    const getImportSourceInfo = () => {
        switch (importSource) {
            case 'tiktok':
                return { icon: '🎵', name: 'TikTok', color: 'pink' };
            case 'instagram':
                return { icon: '📸', name: 'Instagram', color: 'purple' };
            case 'facebook':
                return { icon: '👥', name: 'Facebook', color: 'blue' };
            case 'twitter':
                return { icon: '🐦', name: 'Twitter/X', color: 'sky' };
            case 'youtube':
                return { icon: '📺', name: 'YouTube', color: 'red' };
            case 'reddit':
                return { icon: '🔴', name: 'Reddit', color: 'orange' };
            case 'pinterest':
                return { icon: '📌', name: 'Pinterest', color: 'red' };
            case 'bluesky':
                return { icon: '🦋', name: 'Bluesky', color: 'blue' };
            case 'linkedin':
                return { icon: '💼', name: 'LinkedIn', color: 'blue' };
            case 'threads':
                return { icon: '🧵', name: 'Threads', color: 'gray' };
            case 'snapchat':
                return { icon: '👻', name: 'Snapchat', color: 'yellow' };
            case 'website':
                return { icon: '🌐', name: 'Website', color: 'green' };
            case 'text':
                return { icon: '📝', name: 'Text Parser', color: 'indigo' };
            case 'video':
                return { icon: '🎥', name: 'Video', color: 'purple' };
            case 'import':
            default:
                return { icon: '🎯', name: 'Import', color: 'indigo' };
        }
    };

    // ENHANCED: Get appropriate features list for each import type
    const getImportFeatures = () => {
        if (!importedRecipeData) return [];

        const features = [];

        // Standard features
        if (importedRecipeData.title) {
            features.push({ icon: '✅', label: 'Title', value: importedRecipeData.title });
        }

        if (importedRecipeData.ingredients?.length > 0) {
            features.push({ icon: '🥕', label: 'Ingredients', value: `${importedRecipeData.ingredients.length} items` });
        }

        if (importedRecipeData.instructions?.length > 0) {
            features.push({ icon: '📋', label: 'Instructions', value: `${importedRecipeData.instructions.length} steps` });
        }

        // Video-specific features
        if (importedRecipeData.videoMetadata || importedRecipeData.videoInfo) {
            features.push({ icon: '🎥', label: 'Video Features', value: 'Timestamps and links included' });
        }

        // Image features
        if (importedRecipeData.extractedImage) {
            features.push({ icon: '🖼️', label: 'Recipe Image', value: 'AI-extracted from video' });
        }

        // Nutrition features
        if (importedRecipeData.nutrition && Object.keys(importedRecipeData.nutrition).length > 0) {
            features.push({ icon: '🤖', label: 'Nutrition', value: 'AI-calculated nutrition facts included' });
        }

        return features;
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
                                <p className="text-sm">
                                    {getImportSourceInfo().icon} <strong>{getImportSourceInfo().name} Recipe:</strong>
                                    {importSource === 'tiktok' && ' Extracted using AI video analysis with timestamps'}
                                    {importSource === 'instagram' && ' Extracted using AI content analysis'}
                                    {importSource === 'facebook' && ' Extracted using AI video analysis'}
                                    {importSource === 'twitter' && ' Extracted using AI content analysis'}
                                    {importSource === 'youtube' && ' Extracted using AI video analysis'}
                                    {importSource === 'website' && ' Imported and enhanced with AI nutrition'}
                                    {importSource === 'text' && ' Processed with AI text parser'}
                                    {!['tiktok', 'instagram', 'facebook', 'twitter', 'youtube', 'website', 'text'].includes(importSource) && ' Enhanced with AI processing'}
                                </p>
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

                {/* STANDARDIZED Import Success Message - Shows for ALL imports */}
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
                                    {getImportFeatures().map((feature, index) => (
                                        <p key={index}>
                                            {feature.icon} <strong>{feature.label}:</strong> {feature.value}
                                        </p>
                                    ))}
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