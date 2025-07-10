'use client';
// file: /src/app/recipes/add/page.js v6 - VIDEO IMPORT SUPPORT

import { useRouter } from 'next/navigation';
import EnhancedRecipeForm from '@/components/recipes/EnhancedRecipeForm';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { apiPost } from '@/lib/api-config';

export default function AddRecipePage() {
    const router = useRouter();

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
                nutrition: recipeData.nutrition && Object.values(recipeData.nutrition).some(val => val) ? {
                    calories: {
                        value: parseFloat(recipeData.nutrition.calories) || 0,
                        unit: 'kcal',
                        name: 'Calories'
                    },
                    protein: {
                        value: parseFloat(recipeData.nutrition.protein) || 0,
                        unit: 'g',
                        name: 'Protein'
                    },
                    fat: {
                        value: parseFloat(recipeData.nutrition.fat) || 0,
                        unit: 'g',
                        name: 'Fat'
                    },
                    carbs: {
                        value: parseFloat(recipeData.nutrition.carbs) || 0,
                        unit: 'g',
                        name: 'Carbohydrates'
                    },
                    fiber: {
                        value: parseFloat(recipeData.nutrition.fiber) || 0,
                        unit: 'g',
                        name: 'Fiber'
                    }
                } : undefined,

                // ADD VIDEO IMPORT METADATA SUPPORT (only if video data exists)
                ...(recipeData.videoSource && {
                    videoMetadata: {
                        videoSource: recipeData.videoSource,
                        videoPlatform: recipeData.videoPlatform,
                        videoId: recipeData.videoId,
                        videoTitle: recipeData.videoTitle,
                        videoDuration: recipeData.videoDuration,
                        extractionMethod: recipeData.extractionMethod,
                        importedFrom: recipeData.importedFrom || `${recipeData.videoPlatform} video`,
                        socialMediaOptimized: recipeData.socialMediaOptimized || false,
                        transcriptLength: recipeData.transcriptLength,
                        processingTime: recipeData.processingTime
                    }
                }),

                // ENHANCED INSTRUCTIONS - SUPPORTS ALL METHODS (manual, parser, URL, video)
                instructions: recipeData.instructions
                    .filter(inst => {
                        // Handle both string and object instructions
                        const instructionText = typeof inst === 'string' ? inst : inst.instruction;
                        return instructionText && instructionText.trim();
                    })
                    .map((inst, index) => {
                        // Handle both string and object instructions
                        if (typeof inst === 'string') {
                            // Manual entry or text parser - keep as string
                            return inst;
                        } else {
                            // Video import or advanced parsing - preserve metadata
                            const result = {
                                text: inst.instruction,
                                step: index + 1
                            };

                            // Add video metadata only if it exists (video imports)
                            if (inst.timestamp) {
                                result.videoTimestamp = inst.timestamp;
                                result.videoLink = inst.videoLink;
                            }

                            return result;
                        }
                    }),

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
                        if (ing.timestamp) {
                            ingredient.videoTimestamp = ing.timestamp;
                            ingredient.videoLink = ing.videoLink;
                        }

                        return ingredient;
                    })
            };

            console.log('Transformed API data:', apiData);
            console.log('Video metadata:', apiData.videoMetadata);

            const response = await apiPost('/api/recipes', apiData);

            const data = await response.json();

            if (data.success) {
                // Success! Navigate to the new recipe
                console.log('✅ Recipe created successfully:', data.recipe._id);

                // Show success message for video imports
                if (recipeData.videoSource) {
                    console.log(`🎥 Video recipe imported from ${recipeData.videoPlatform}!`);
                }

                router.push(`/recipes/${data.recipe._id}`);
            } else {
                // Show error
                console.error('Recipe creation failed:', data.error);
                alert(data.error || 'Failed to create recipe');
                throw new Error(data.error || 'Failed to create recipe');
            }
        } catch (error) {
            console.error('Error creating recipe:', error);

            // Enhanced error handling for video imports
            if (recipeData.videoSource) {
                alert(`Error saving video recipe: ${error.message}\n\nThe recipe was extracted successfully but couldn't be saved. Please try again.`);
            } else {
                alert('Error creating recipe: ' + error.message);
            }

            throw error; // Re-throw so EnhancedRecipeForm can handle loading state
        }
    };

    // Handle cancel
    const handleCancel = () => {
        router.back();
    };

    return (
        <MobileOptimizedLayout>
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Add New Recipe</h1>
                        <p className="text-gray-600 mt-2">
                            Create a new recipe manually, paste recipe text to auto-extract details, or import from TikTok/Instagram videos
                        </p>
                    </div>
                    <TouchEnhancedButton
                        onClick={() => router.back()}
                        className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
                    >
                        ← Back to Recipes
                    </TouchEnhancedButton>
                </div>

                <EnhancedRecipeForm
                    onSubmit={handleRecipeSubmit}
                    onCancel={handleCancel}
                    isEditing={false}
                />
                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}