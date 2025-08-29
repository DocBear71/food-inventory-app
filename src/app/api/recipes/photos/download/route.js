// file: /src/app/api/recipes/photos/download/route.js - Download and save external photos

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

        const { recipeId, photoUrl, metadata, isPrimary = false } = await request.json();

        if (!recipeId || !photoUrl) {
            return NextResponse.json({
                error: 'Recipe ID and photo URL are required'
            }, { status: 400 });
        }

        await connectDB();

        // Verify recipe exists and user has permission
        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
        }

        if (recipe.createdBy.toString() !== session.user.id) {
            return NextResponse.json({
                error: 'Not authorized to add photos to this recipe'
            }, { status: 403 });
        }

        // Download the image
        console.log(`📸 Downloading image from: ${photoUrl}`);

        const response = await fetch(photoUrl, {
            headers: {
                'User-Agent': 'Doc Bear\'s Comfort Kitchen/1.0',
                'Accept': 'image/*',
            },
            timeout: 30000 // 30 second timeout
        });

        if (!response.ok) {
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Download Failed',
                message: `Failed to download image: ${response.status} ${response.statusText}`
            });
            return;
        }

        const buffer = await response.arrayBuffer();
        const photoBuffer = Buffer.from(buffer);

        // Validate size (5MB limit)
        if (photoBuffer.length > 5242880) {
            return NextResponse.json({
                error: 'Downloaded image exceeds 5MB limit'
            }, { status: 400 });
        }

        // Determine MIME type
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        if (!contentType.startsWith('image/')) {
            return NextResponse.json({
                error: 'Downloaded file is not an image'
            }, { status: 400 });
        }

        // Validate MIME type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(contentType)) {
            return NextResponse.json({
                error: 'Unsupported image format. Allowed: JPEG, PNG, WebP'
            }, { status: 400 });
        }

        // If setting as primary, unset other primary photos
        if (isPrimary) {
            await RecipePhoto.updateMany(
                { recipeId, isPrimary: true },
                { isPrimary: false }
            );
        }

        // Create filename
        const timestamp = Date.now();
        const extension = contentType === 'image/jpeg' ? 'jpg' :
            contentType === 'image/png' ? 'png' :
                contentType === 'image/webp' ? 'webp' : 'jpg';

        const filename = `ai_${recipeId}_${timestamp}.${extension}`;

        // Create photo record
        const photo = new RecipePhoto({
            recipeId,
            filename,
            originalName: metadata?.description || 'AI Generated Recipe Photo',
            mimeType: contentType,
            size: photoBuffer.length,
            data: photoBuffer,
            isPrimary,
            source: 'ai_generated',
            aiAnalysis: {
                description: metadata?.description,
                confidence: metadata?.confidence || 0.8,
                foodRelevanceScore: metadata?.foodRelevanceScore || 0.8,
                tags: metadata?.tags || []
            },
            searchMetadata: {
                searchTerms: metadata?.searchTerms || [],
                searchEngine: metadata?.source || 'ai_search',
                originalUrl: photoUrl,
                attribution: metadata?.attribution
            },
            uploadedBy: session.user.id
        });

        await photo.save();

        // Update recipe with photo reference
        const updateResult = await Recipe.findByIdAndUpdate(
            recipeId,
            {
                $addToSet: { photos: photo._id },
                $inc: { photoCount: 1 },
                hasPhotos: true,
                ...(isPrimary && { primaryPhoto: photo._id })
            },
            { new: true }
        );

        console.log(`✅ Photo saved successfully: ${filename} (${(photoBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

        // Return photo info without binary data
        const { data, ...photoInfo } = photo.toObject();

        return NextResponse.json({
            success: true,
            photo: {
                ...photoInfo,
                url: `/api/recipes/photos/${photo._id}`
            },
            message: 'Photo downloaded and saved successfully'
        });

    } catch (error) {
        console.error('Photo download error:', error);

        // Provide more specific error messages
        if (error.message.includes('fetch')) {
            return NextResponse.json({
                error: 'Failed to download image from URL. The image may be unavailable or protected.'
            }, { status: 500 });
        }

        if (error.message.includes('timeout')) {
            return NextResponse.json({
                error: 'Image download timed out. Please try again.'
            }, { status: 500 });
        }

        return NextResponse.json({
            error: 'Failed to download and save photo',
            details: error.message
        }, { status: 500 });
    }
}