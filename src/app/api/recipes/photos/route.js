// file: /src/app/api/recipes/photos/route.js - FIXED upload to store binary data correctly

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { Recipe, RecipePhoto } from '@/lib/models';

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

        // FIXED: Store as actual binary data, not base64 string
        const buffer = await file.arrayBuffer();
        const photoBuffer = Buffer.from(buffer);

        console.log(`📸 Upload: File size: ${file.size}, Buffer size: ${photoBuffer.length}`);
        console.log(`📸 Upload: First 4 bytes: ${photoBuffer.slice(0, 4).toString('hex')}`);

        // Validate it's a proper image
        const isValidJPEG = photoBuffer[0] === 0xFF && photoBuffer[1] === 0xD8;
        const isPNG = photoBuffer[0] === 0x89 && photoBuffer[1] === 0x50;

        if (!isValidJPEG && !isPNG) {
            return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
        }

        // If this is set as primary, unset other primary photos
        if (isPrimary) {
            await RecipePhoto.updateMany(
                { recipeId, isPrimary: true },
                { isPrimary: false }
            );
        }

        // FIXED: Create photo record with binary data (not base64)
        const photo = new RecipePhoto({
            recipeId,
            filename: `recipe_${recipeId}_${Date.now()}_${file.name}`,
            originalName: file.name,
            mimeType: file.type,
            size: file.size,
            data: photoBuffer, // Store as binary Buffer, not base64 string
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

        console.log(`✅ Photo uploaded successfully: ${photo.filename} (${file.size} bytes)`);

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

// GET - List photos for recipes (same as before)
export async function GET(request) {
    try {
        const session = await getEnhancedSession(request);
        const { searchParams } = new URL(request.url);
        const recipeId = searchParams.get('recipeId');
        const source = searchParams.get('source');

        await connectDB();

        let query = {};

        if (recipeId) {
            const recipe = await Recipe.findById(recipeId);
            if (!recipe) {
                return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
            }

            if (!recipe.isPublic && (!session?.user?.id || recipe.createdBy.toString() !== session.user.id)) {
                return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
            }

            query.recipeId = recipeId;
        } else if (session?.user?.id) {
            query.uploadedBy = session.user.id;
        } else {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
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
            photos: photosWithUrls,
            count: photosWithUrls.length
        });

    } catch (error) {
        console.error('Get photos error:', error);
        return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
    }
}