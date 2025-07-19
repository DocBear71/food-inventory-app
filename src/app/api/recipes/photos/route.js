// file: /src/app/api/recipes/photos/route.js - Upload photos to recipes

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

        const formData = await request.formData();
        const file = formData.get('photo');
        const recipeId = formData.get('recipeId');
        const isPrimary = formData.get('isPrimary') === 'true';
        const source = formData.get('source') || 'user_upload';

        if (!file || !recipeId) {
            return NextResponse.json({ error: 'Photo file and recipe ID are required' }, { status: 400 });
        }

        // Validate file
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
        }

        if (file.size > 5242880) { // 5MB
            return NextResponse.json({ error: 'File size must be under 5MB' }, { status: 400 });
        }

        await connectDB();

        // Verify recipe exists and user has permission
        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
        }

        if (recipe.createdBy.toString() !== session.user.id) {
            return NextResponse.json({ error: 'Not authorized to add photos to this recipe' }, { status: 403 });
        }

        // Convert file to buffer
        const buffer = await file.arrayBuffer();
        const photoBuffer = Buffer.from(buffer);

        // If this is set as primary, unset other primary photos
        if (isPrimary) {
            await RecipePhoto.updateMany(
                { recipeId, isPrimary: true },
                { isPrimary: false }
            );
        }

        // Create photo record
        const photo = new RecipePhoto({
            recipeId,
            filename: `recipe_${recipeId}_${Date.now()}_${file.name}`,
            originalName: file.name,
            mimeType: file.type,
            size: file.size,
            data: photoBuffer,
            isPrimary,
            source,
            uploadedBy: session.user.id
        });

        await photo.save();

        // Update recipe with photo reference
        await Recipe.findByIdAndUpdate(recipeId, {
            $addToSet: { photos: photo._id },
            $inc: { photoCount: 1 },
            hasPhotos: true,
            ...(isPrimary && { primaryPhoto: photo._id })
        });

        // Return photo info without binary data
        const { data, ...photoInfo } = photo.toObject();

        return NextResponse.json({
            success: true,
            photo: {
                ...photoInfo,
                url: `/api/recipes/photos/${photo._id}`
            },
            message: 'Photo uploaded successfully'
        });

    } catch (error) {
        console.error('Photo upload error:', error);
        return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
    }
}

// GET - List photos for recipes (admin/user management)
export async function GET(request) {
    try {
        const session = await getEnhancedSession(request);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const recipeId = searchParams.get('recipeId');
        const source = searchParams.get('source');

        await connectDB();

        let query = { uploadedBy: session.user.id };

        if (recipeId) {
            // Verify user has access to this recipe
            const recipe = await Recipe.findById(recipeId);
            if (!recipe || recipe.createdBy.toString() !== session.user.id) {
                return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
            }
            query.recipeId = recipeId;
        }

        if (source) {
            query.source = source;
        }

        const photos = await RecipePhoto.find(query)
            .select('-data') // Exclude binary data from list
            .sort({ isPrimary: -1, uploadedAt: -1 })
            .limit(50);

        const photosWithUrls = photos.map(photo => ({
            ...photo.toObject(),
            url: `/api/recipes/photos/${photo._id}`
        }));

        return NextResponse.json({
            success: true,
            photos: photosWithUrls
        });

    } catch (error) {
        console.error('Get photos error:', error);
        return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
    }
}