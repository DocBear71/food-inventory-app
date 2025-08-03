// app/api/admin/mark-manual-image-needed/route.js - Mark recipes as needing manual images
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb.js';
import { Recipe } from '@/lib/models.js';

export async function POST(request) {
    try {
        const {
            recipeTitle,
            reason,
            rejectedImageCount = 0,
            additionalNotes = ''
        } = await request.json();

        console.log(`📝 Marking recipe as needing manual image: "${recipeTitle}"`);

        await connectDB();

        // Find the recipe
        const recipe = await Recipe.findOne({ title: recipeTitle });
        if (!recipe) {
            return NextResponse.json({
                success: false,
                error: 'Recipe not found'
            }, { status: 404 });
        }

        // Update recipe with manual image needed flag AND apply placeholder
        const updateData = {
            // Apply placeholder image immediately to prevent reanalysis
            imageUrl: '/images/recipe-placeholder.jpg',
            imageAttribution: 'Placeholder - Manual image needed',
            imageSource: 'placeholder',
            hasUserImage: false,

            // Manual image tracking flags
            needsManualImage: true,
            manualImageReason: reason,
            manualImageRequestedAt: new Date(),
            rejectedAIImageCount: rejectedImageCount,
            aiImageSearchAttempts: (recipe.aiImageSearchAttempts || 0) + 1,
            lastImageSearchAttempt: new Date(),
            imageSearchStatus: 'manual_needed',

            // Clear any AI scoring data since we're using placeholder
            aiRelevanceScore: null,
            aiConfidence: null,
            aiReason: `Manual image needed: ${reason}`,
            processingMethod: 'manual_placeholder',

            updatedAt: new Date()
        };

        // Add additional notes if provided
        if (additionalNotes) {
            updateData.manualImageNotes = additionalNotes;
        }

        // Store search history for analysis
        const searchHistory = recipe.imageSearchHistory || [];
        searchHistory.push({
            timestamp: new Date(),
            result: 'manual_needed',
            reason: reason,
            rejectedCount: rejectedImageCount,
            searchMethod: 'ai_enhanced',
            placeholderApplied: true
        });
        updateData.imageSearchHistory = searchHistory;

        await Recipe.findByIdAndUpdate(recipe._id, updateData);

        console.log(`✅ Recipe "${recipeTitle}" marked as needing manual image with placeholder applied`);

        // Log for admin reporting
        console.log(`📊 Manual Image Request:`, {
            recipeTitle,
            reason,
            rejectedCount: rejectedImageCount,
            category: recipe.category,
            tags: recipe.tags,
            searchAttempts: updateData.aiImageSearchAttempts,
            placeholderApplied: true
        });

        return NextResponse.json({
            success: true,
            message: `Recipe "${recipeTitle}" marked as needing manual image work and placeholder applied`,
            details: {
                reason: reason,
                rejectedImageCount: rejectedImageCount,
                searchAttempts: updateData.aiImageSearchAttempts,
                category: recipe.category,
                placeholderUrl: '/images/recipe-placeholder.jpg'
            }
        });

    } catch (error) {
        console.error('Mark manual image error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

// GET - Retrieve recipes that need manual images
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit')) || 50;
        const category = searchParams.get('category');

        console.log('📋 Fetching recipes that need manual images...');

        await connectDB();

        let query = { needsManualImage: true };
        if (category) {
            query.category = category;
        }

        const recipes = await Recipe.find(query)
            .select('title category manualImageReason rejectedAIImageCount manualImageRequestedAt tags imageUrl')
            .sort({ manualImageRequestedAt: -1 })
            .limit(limit)
            .lean();

        console.log(`📊 Found ${recipes.length} recipes needing manual images`);

        // Group by reason for analysis
        const reasonStats = {};
        recipes.forEach(recipe => {
            const reason = recipe.manualImageReason || 'Unknown';
            reasonStats[reason] = (reasonStats[reason] || 0) + 1;
        });

        return NextResponse.json({
            success: true,
            recipes: recipes,
            count: recipes.length,
            reasonStats: reasonStats,
            message: `Found ${recipes.length} recipes needing manual images`
        });

    } catch (error) {
        console.error('Get manual image list error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

// DELETE - Remove manual image flag (when image is manually added)
export async function DELETE(request) {
    try {
        const { recipeTitle, completionNotes = '' } = await request.json();

        console.log(`✅ Removing manual image flag for: "${recipeTitle}"`);

        await connectDB();

        const recipe = await Recipe.findOne({ title: recipeTitle });
        if (!recipe) {
            return NextResponse.json({
                success: false,
                error: 'Recipe not found'
            }, { status: 404 });
        }

        // Update recipe to remove manual image needed flag
        // Note: Keep the actual imageUrl as-is since a manual image should have been uploaded
        const updateData = {
            needsManualImage: false,
            manualImageCompleted: true,
            manualImageCompletedAt: new Date(),
            manualImageCompletionNotes: completionNotes,
            imageSearchStatus: 'manual_completed',

            // Clear placeholder-specific fields if it was a placeholder
            ...(recipe.imageSource === 'placeholder' && {
                imageAttribution: 'Manually uploaded image',
                imageSource: 'manual_upload',
                processingMethod: 'manual_upload'
            }),

            updatedAt: new Date()
        };

        // Update search history
        const searchHistory = recipe.imageSearchHistory || [];
        searchHistory.push({
            timestamp: new Date(),
            result: 'manual_completed',
            notes: completionNotes,
            searchMethod: 'manual',
            previouslyHadPlaceholder: recipe.imageSource === 'placeholder'
        });
        updateData.imageSearchHistory = searchHistory;

        await Recipe.findByIdAndUpdate(recipe._id, updateData);

        console.log(`✅ Manual image flag removed for "${recipeTitle}"`);

        return NextResponse.json({
            success: true,
            message: `Manual image work completed for "${recipeTitle}"`
        });

    } catch (error) {
        console.error('Remove manual image flag error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}