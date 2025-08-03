// file: /app/api/public-recipes/route.js v2 - Fixed with photo population

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Recipe } from '@/lib/models';

// GET - Fetch all public recipes (no authentication required)
export async function GET(request) {
    try {
        console.log('GET /api/public-recipes - Fetching public recipes for landing page');

        await connectDB();

        // FIXED: Added photo population
        const recipes = await Recipe.find({ isPublic: true })
            .populate('createdBy', 'name email')
            .populate('lastEditedBy', 'name email')
            .populate('primaryPhoto')      // ADDED: Populate primary photo
            .populate('photos')            // ADDED: Populate photos array
            .sort({ createdAt: -1 }) // Newest first
            .lean(); // Use lean for better performance since we're not modifying

        console.log(`GET /api/public-recipes - Found ${recipes.length} public recipes`);

        // Transform the data to include computed fields and clean up sensitive info
        const publicRecipes = recipes.map(recipe => ({
            ...recipe,
            // Ensure we have safe author info
            createdBy: recipe.createdBy ? {
                _id: recipe.createdBy._id,
                name: recipe.createdBy.name || 'Anonymous Chef',
                // Don't expose email addresses publicly
                displayName: recipe.createdBy.name || 'Anonymous Chef'
            } : {
                _id: null,
                name: 'Anonymous Chef',
                displayName: 'Anonymous Chef'
            },

            // Calculate total time if not present
            totalTime: (recipe.cookTime || 0) + (recipe.prepTime || 0),

            // Ensure arrays are properly initialized
            tags: Array.isArray(recipe.tags) ? recipe.tags : [],
            ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
            instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],

            // Clean up rating stats
            ratingStats: recipe.ratingStats || {
                averageRating: 0,
                totalRatings: 0,
                distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
            },

            // Add view count if available
            viewCount: recipe.metrics?.viewCount || 0,

            // Add difficulty with fallback
            difficulty: recipe.difficulty || 'medium',

            // Add category with fallback
            category: recipe.category || 'entrees',

            // Convert dates to ISO strings for JSON serialization
            createdAt: recipe.createdAt?.toISOString(),
            updatedAt: recipe.updatedAt?.toISOString(),

            // ENHANCED: Photo system data (previously missing)
            hasPhotos: recipe.hasPhotos || false,
            photoCount: recipe.photoCount || 0,
            imagePriority: recipe.imagePriority || 'external_url',

            // Primary photo (populated)
            primaryPhoto: recipe.primaryPhoto ? {
                _id: recipe.primaryPhoto._id,
                imageData: recipe.primaryPhoto.imageData || recipe.primaryPhoto.data,
                mimeType: recipe.primaryPhoto.mimeType || 'image/jpeg',
                originalName: recipe.primaryPhoto.originalName,
                size: recipe.primaryPhoto.size,
                url: recipe.primaryPhoto.url,
                uploadedAt: recipe.primaryPhoto.uploadedAt
            } : null,

            // Photos array (populated) - limit to first photo for performance
            photos: Array.isArray(recipe.photos) && recipe.photos.length > 0 ? [{
                _id: recipe.photos[0]._id,
                imageData: recipe.photos[0].imageData || recipe.photos[0].data,
                mimeType: recipe.photos[0].mimeType || 'image/jpeg',
                originalName: recipe.photos[0].originalName,
                size: recipe.photos[0].size,
                url: recipe.photos[0].url,
                uploadedAt: recipe.photos[0].uploadedAt
            }] : [],

            // ENHANCED: Image availability detection
            hasImage: !!(
                recipe.primaryPhoto?.imageData ||
                recipe.primaryPhoto?.data ||
                (recipe.photos && recipe.photos.length > 0 && (recipe.photos[0]?.imageData || recipe.photos[0]?.data)) ||
                recipe.imageUrl ||
                recipe.extractedImage?.data ||
                recipe.uploadedImage?.data
            ),

            // Add estimated difficulty score for sorting
            difficultyScore: recipe.difficulty === 'easy' ? 1 : recipe.difficulty === 'hard' ? 3 : 2,

            // Add search-friendly text for better filtering
            searchableText: [
                recipe.title,
                recipe.description,
                ...(Array.isArray(recipe.tags) ? recipe.tags : []),
                ...(Array.isArray(recipe.ingredients) ? recipe.ingredients.map(ing => {
                    // Handle both string and object ingredient formats
                    if (typeof ing === 'string') return ing;
                    return ing?.name || '';
                }).filter(Boolean) : [])
            ].filter(Boolean).join(' ').toLowerCase()
        }));

        return NextResponse.json({
            success: true,
            recipes: publicRecipes,
            count: publicRecipes.length,
            message: `Found ${publicRecipes.length} public recipes`
        });

    } catch (error) {
        console.error('GET public recipes error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch public recipes',
                recipes: [],
                count: 0
            },
            { status: 500 }
        );
    }
}