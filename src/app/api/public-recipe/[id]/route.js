// file: /app/api/public-recipe/[id]/route.js v3 - FIXED: Added multi-part recipe support

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Recipe } from '@/lib/models';

// GET - Fetch a single public recipe (no authentication required)
export async function GET(request, { params }) {
    try {
        const { id: recipeId } = await params;

        if (!recipeId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Recipe ID is required'
                },
                { status: 400 }
            );
        }

        await connectDB();

        // FIXED: Added photo population
        const recipe = await Recipe.findOne({
            _id: recipeId,
            isPublic: true  // Only public recipes accessible via this endpoint
        })
            .populate('createdBy', 'name') // Only get name, not email
            .populate('primaryPhoto')      // ADDED: Populate primary photo
            .populate('photos')            // ADDED: Populate photos array
            .lean();

        if (!recipe) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Recipe not found or not publicly available'
                },
                { status: 404 }
            );
        }

        // Clean and format recipe data for public consumption
        const publicRecipe = {
            _id: recipe._id,
            title: recipe.title,
            description: recipe.description,

            // ADDED: Multi-part recipe support
            isMultiPart: recipe.isMultiPart || false,
            parts: recipe.parts || [],

            // Format ingredients for consistent display
            ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.map(ing => {
                if (typeof ing === 'string') {
                    return { name: ing, amount: null, unit: '' };
                }

                // Handle your RecipeIngredientSchema structure
                let amount = null;
                if (ing.amount !== undefined && ing.amount !== null) {
                    // Handle Mixed type - could be number, string, or object
                    if (typeof ing.amount === 'number') {
                        amount = ing.amount;
                    } else if (typeof ing.amount === 'string') {
                        // Try to parse as number, otherwise keep as string
                        const parsed = parseFloat(ing.amount);
                        amount = isNaN(parsed) ? ing.amount : parsed;
                    } else if (typeof ing.amount === 'object' && ing.amount.value) {
                        // Handle object with value property
                        amount = ing.amount.value;
                    } else {
                        amount = ing.amount;
                    }
                }

                return {
                    name: ing.name || '',
                    amount: amount,
                    unit: ing.unit || '',
                    category: ing.category || null,
                    optional: ing.optional || false,
                    videoTimestamp: ing.videoTimestamp || null
                };
            }) : [],

            // Format instructions for consistent display
            instructions: Array.isArray(recipe.instructions) ? recipe.instructions.map((inst, index) => {
                if (typeof inst === 'string') {
                    return {
                        step: index + 1,
                        text: inst,
                        videoTimestamp: null
                    };
                }
                return {
                    step: inst.step || index + 1,
                    text: inst.text || inst,
                    videoTimestamp: inst.videoTimestamp || null
                };
            }) : [],

            // Basic recipe info
            cookTime: recipe.cookTime || null,
            prepTime: recipe.prepTime || null,
            servings: recipe.servings || null,
            difficulty: recipe.difficulty || 'medium',
            category: recipe.category || 'entrees',
            tags: Array.isArray(recipe.tags) ? recipe.tags : [],

            // Author info (public safe)
            author: {
                name: recipe.createdBy?.name || 'Anonymous Chef',
                isAnonymous: !recipe.createdBy?.name
            },

            // Source info
            source: recipe.source || null,
            importedFrom: recipe.importedFrom || null,

            // Rating and review stats (PUBLIC FEATURE)
            rating: {
                average: recipe.ratingStats?.averageRating || 0,
                totalRatings: recipe.ratingStats?.totalRatings || 0,
                distribution: recipe.ratingStats?.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
            },

            // Reviews (PUBLIC FEATURE) - limit to first 10 for performance
            reviews: Array.isArray(recipe.reviews) ? recipe.reviews.slice(0, 10).map(review => ({
                id: review._id,
                rating: review.rating,
                comment: review.comment,
                authorName: review.authorName || 'Anonymous',
                createdAt: review.createdAt,
                helpfulCount: review.helpfulVotes?.length || 0
            })) : [],

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

            // Photos array (populated)
            photos: Array.isArray(recipe.photos) ? recipe.photos.map(photo => ({
                _id: photo._id,
                imageData: photo.imageData || photo.data,
                mimeType: photo.mimeType || 'image/jpeg',
                originalName: photo.originalName,
                size: photo.size,
                url: photo.url,
                uploadedAt: photo.uploadedAt
            })) : [],

            // EXISTING: Image data (keep for backward compatibility)
            hasImage: !!(
                recipe.primaryPhoto?.imageData ||
                recipe.primaryPhoto?.data ||
                recipe.imageUrl ||
                recipe.extractedImage?.data ||
                recipe.uploadedImage?.data
            ),
            imageUrl: recipe.imageUrl || null,
            extractedImage: recipe.extractedImage ? {
                data: recipe.extractedImage.data,
                mimeType: recipe.extractedImage.mimeType || 'image/jpeg'
            } : null,
            uploadedImage: recipe.uploadedImage ? {
                data: recipe.uploadedImage.data,
                mimeType: recipe.uploadedImage.mimeType || 'image/jpeg'
            } : null,

            // Video metadata (if available)
            videoMetadata: recipe.videoMetadata ? {
                title: recipe.videoMetadata.title,
                duration: recipe.videoMetadata.duration,
                hasExtractedImage: recipe.videoMetadata.hasExtractedImage
            } : null,

            // Computed fields
            totalTime: (recipe.cookTime || 0) + (recipe.prepTime || 0),

            // Public metadata
            createdAt: recipe.createdAt?.toISOString(),
            viewCount: recipe.metrics?.viewCount || 0,

            // Flags for frontend logic
            isPublic: true,
            canEdit: false,
            canSave: false, // Will be determined by frontend auth state
            canAddToMealPlan: false, // Will be determined by frontend auth state

            // Features that require authentication (not included in public API)
            // - nutrition data
            // - shopping list features
            // - meal planning features
            // - editing capabilities
            // - printing with advanced formatting
        };

        // ADDED: Debug logging to help troubleshoot multi-part recipes
        console.log(`📸 Recipe "${recipe.title}" multi-part debug:`, {
            isMultiPart: recipe.isMultiPart,
            partsCount: recipe.parts?.length || 0,
            hasPhotos: recipe.hasPhotos,
            primaryPhotoExists: !!recipe.primaryPhoto,
            imagePriority: recipe.imagePriority
        });

        // Increment view count (don't await to avoid slowing response)
        Recipe.findByIdAndUpdate(recipeId, {
            $inc: { 'metrics.viewCount': 1 },
            $set: { 'metrics.lastViewed': new Date() }
        }).catch(err => console.warn('Failed to update view count:', err));

        return NextResponse.json({
            success: true,
            recipe: publicRecipe
        });

    } catch (error) {
        console.error('GET public recipe error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch recipe'
            },
            { status: 500 }
        );
    }
}