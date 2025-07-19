// file: /src/app/api/recipes/photos/bulk-search/route.js - Bulk photo search for recipes without photos

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { Recipe, RecipePhoto, User } from '@/lib/models';

export async function POST(request) {
    try {
        const session = await getEnhancedSession(request);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Check if user is admin or has premium features
        const user = await User.findById(session.user.id);
        const userTier = user?.getEffectiveTier() || 'free';

        if (userTier === 'free') {
            return NextResponse.json({
                error: 'Bulk photo search is available with Gold and Platinum plans',
                code: 'FEATURE_NOT_AVAILABLE',
                feature: 'bulk_photo_search',
                currentTier: userTier,
                requiredTier: 'gold',
                upgradeUrl: '/pricing?source=bulk-photo-search&feature=bulk_photo_search&required=gold'
            }, { status: 403 });
        }

        const { autoSave = false, maxRecipes = 50 } = await request.json();

        await connectDB();

        // Find recipes without photos for this user
        const recipesWithoutPhotos = await Recipe.find({
            createdBy: session.user.id,
            $or: [
                { hasPhotos: false },
                { hasPhotos: { $exists: false } },
                { photoCount: 0 },
                { photoCount: { $exists: false } }
            ]
        })
            .select('title ingredients tags category')
            .limit(maxRecipes)
            .lean();

        if (recipesWithoutPhotos.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'All your recipes already have photos!',
                totalRecipes: 0,
                results: []
            });
        }

        console.log(`🔍 Starting bulk photo search for ${recipesWithoutPhotos.length} recipes`);

        // Call Modal.com bulk search function
        const modalResponse = await fetch(`${process.env.MODAL_ENDPOINT}/bulk-search-recipe-photos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.MODAL_API_KEY}`,
            },
            body: JSON.stringify({
                recipes: recipesWithoutPhotos,
                autoSave,
                userId: session.user.id
            })
        });

        if (!modalResponse.ok) {
            throw new Error(`Modal API error: ${modalResponse.status}`);
        }

        const modalResult = await modalResponse.json();

        if (!modalResult.success) {
            throw new Error(modalResult.error || 'Bulk search failed');
        }

        // If autoSave is enabled, save the best photos
        let savedPhotos = 0;
        if (autoSave) {
            for (const result of modalResult.results) {
                if (result.success && result.bestPhoto) {
                    try {
                        // Download and save the photo
                        const saveResponse = await fetch('/api/recipes/photos/download', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': request.headers.get('authorization'),
                                'Cookie': request.headers.get('cookie'),
                            },
                            body: JSON.stringify({
                                recipeId: result.recipeId,
                                photoUrl: result.bestPhoto.url,
                                metadata: result.bestPhoto,
                                isPrimary: true
                            })
                        });

                        if (saveResponse.ok) {
                            savedPhotos++;
                            console.log(`✅ Auto-saved photo for recipe: ${result.recipeTitle}`);
                        } else {
                            console.warn(`⚠️ Failed to auto-save photo for recipe: ${result.recipeTitle}`);
                        }
                    } catch (error) {
                        console.error(`❌ Error auto-saving photo for ${result.recipeTitle}:`, error);
                    }
                }
            }
        }

        const successfulSearches = modalResult.results.filter(r => r.success).length;

        return NextResponse.json({
            success: true,
            totalRecipes: recipesWithoutPhotos.length,
            successfulSearches,
            savedPhotos: autoSave ? savedPhotos : 0,
            results: modalResult.results,
            summary: {
                processed: recipesWithoutPhotos.length,
                foundPhotos: successfulSearches,
                savedPhotos: autoSave ? savedPhotos : 0,
                successRate: Math.round((successfulSearches / recipesWithoutPhotos.length) * 100)
            },
            message: autoSave
                ? `Found and saved photos for ${savedPhotos} recipes out of ${recipesWithoutPhotos.length} processed`
                : `Found photos for ${successfulSearches} recipes out of ${recipesWithoutPhotos.length} processed`
        });

    } catch (error) {
        console.error('Bulk photo search error:', error);
        return NextResponse.json({
            error: 'Failed to perform bulk photo search',
            details: error.message
        }, { status: 500 });
    }
}

// GET - Get bulk search status/history
export async function GET(request) {
    try {
        const session = await getEnhancedSession(request);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        await connectDB();

        // Count recipes without photos
        const recipesWithoutPhotos = await Recipe.countDocuments({
            createdBy: session.user.id,
            $or: [
                { hasPhotos: false },
                { hasPhotos: { $exists: false } },
                { photoCount: 0 },
                { photoCount: { $exists: false } }
            ]
        });

        // Count recipes with photos
        const recipesWithPhotos = await Recipe.countDocuments({
            createdBy: session.user.id,
            hasPhotos: true,
            photoCount: { $gt: 0 }
        });

        // Count AI-generated photos
        const aiGeneratedPhotos = await RecipePhoto.countDocuments({
            uploadedBy: session.user.id,
            source: 'ai_generated'
        });

        return NextResponse.json({
            success: true,
            stats: {
                totalRecipes: recipesWithoutPhotos + recipesWithPhotos,
                recipesWithPhotos,
                recipesWithoutPhotos,
                aiGeneratedPhotos,
                photoCompletionRate: Math.round((recipesWithPhotos / (recipesWithoutPhotos + recipesWithPhotos)) * 100)
            }
        });

    } catch (error) {
        console.error('Get bulk search stats error:', error);
        return NextResponse.json({
            error: 'Failed to get bulk search statistics'
        }, { status: 500 });
    }
}