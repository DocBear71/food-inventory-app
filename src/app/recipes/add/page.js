'use client';
// file: /src/app/recipes/add/page.js v4


import { useRouter } from 'next/navigation';
import EnhancedRecipeForm from '@/components/recipes/EnhancedRecipeForm';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { getApiUrl } from '@/lib/api-config';

export default function AddRecipePage() {
    const router = useRouter();

    // Handle recipe submission
    const handleRecipeSubmit = async (recipeData) => {
        console.log('Submitting recipe:', recipeData);

        try {
            // Transform to match your API expectations
            const apiData = {
                title: recipeData.title,
                description: recipeData.description,
                ingredients: recipeData.ingredients.filter(ing => ing.name.trim()),
                instructions: recipeData.instructions
                    .filter(inst => inst.instruction && inst.instruction.trim())
                    .map(inst => inst.instruction),
                prepTime: recipeData.prepTime ? parseInt(recipeData.prepTime) : null,
                cookTime: recipeData.cookTime ? parseInt(recipeData.cookTime) : null,
                servings: recipeData.servings ? parseInt(recipeData.servings) : null,
                difficulty: recipeData.difficulty,
                tags: recipeData.tags || [],
                source: recipeData.source || '',
                isPublic: recipeData.isPublic || false,
                category: recipeData.category || 'entrees', // ADD THIS LINE
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
                } : undefined
            };

            console.log('Transformed API data:', apiData);
            console.log('Original recipe data isPublic:', recipeData.isPublic);
            console.log('API data isPublic:', apiData.isPublic);
            console.log('Nutrition transformation:', {
                original: recipeData.nutrition,
                transformed: apiData.nutrition
            });

            const response = await fetch(getApiUrl('/api/recipes'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(apiData)
            });

            const data = await response.json();

            if (data.success) {
                // Success! Navigate to the new recipe
                router.push(`/recipes/${data.recipe._id}`);
            } else {
                // Show error
                alert(data.error || 'Failed to create recipe');
                throw new Error(data.error || 'Failed to create recipe');
            }
        } catch (error) {
            console.error('Error creating recipe:', error);
            alert('Error creating recipe: ' + error.message);
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
                            Create a new recipe manually, or paste recipe text to auto-extract details
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