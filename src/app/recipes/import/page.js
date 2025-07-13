'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import EnhancedRecipeForm from '@/components/recipes/EnhancedRecipeForm';
import Footer from '@/components/legal/Footer';

export default function ImportRecipePage() {
    const router = useRouter();

    const handleRecipeSubmit = async (recipeData) => {
        try {
            console.log('🎯 Importing recipe:', recipeData);

            const response = await fetch('/api/recipes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(recipeData)
            });

            const data = await response.json();

            if (data.success) {
                console.log('✅ Recipe imported successfully:', data.recipe._id);
                router.push(`/recipes/${data.recipe._id}`);
            } else {
                console.error('Recipe import failed:', data.error);
                // You could show error UI here
            }
        } catch (error) {
            console.error('Error importing recipe:', error);
            // You could show error UI here
        }
    };

    const handleCancel = () => {
        router.push('/recipes');
    };

    return (
        <MobileOptimizedLayout>
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Import-specific header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="text-4xl">🎯</div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                Import Recipe
                            </h1>
                            <p className="text-gray-600">
                                Import from social media, websites, or enhance with AI nutrition analysis
                            </p>
                        </div>
                    </div>

                    {/* Import method highlights */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-2xl mb-2">🎥</div>
                                <h3 className="font-semibold text-purple-900">Social Media</h3>
                                <p className="text-sm text-purple-700">TikTok, Instagram, Facebook</p>
                            </div>
                            <div>
                                <div className="text-2xl mb-2">🌐</div>
                                <h3 className="font-semibold text-blue-900">Recipe Websites</h3>
                                <p className="text-sm text-blue-700">AllRecipes, Food Network, etc.</p>
                            </div>
                            <div>
                                <div className="text-2xl mb-2">🤖</div>
                                <h3 className="font-semibold text-green-900">AI Enhancement</h3>
                                <p className="text-sm text-green-700">Comprehensive nutrition analysis</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Enhanced form for imports */}
                <EnhancedRecipeForm
                    onSubmit={handleRecipeSubmit}
                    onCancel={handleCancel}
                    isEditing={false}
                    isImportMode={true} // New prop to enable import-specific features
                    showAdvancedNutrition={true} // Enable full nutrition features
                />

                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}