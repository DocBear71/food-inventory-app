// file: /src/app/api/recipes/photos/[photoId]/route.js - FIXED for direct binary Buffer handling

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { RecipePhoto, Recipe } from '@/lib/models';

// GET - Serve photo binary data (FIXED for direct binary handling)
export async function GET(request, { params }) {
    try {
        const { photoId } = await params;

        if (!photoId) {
            console.error('❌ No photoId provided');
            return NextResponse.json({ error: 'Photo ID is required' }, { status: 400 });
        }

        console.log(`📸 Fetching photo: ${photoId}`);
        await connectDB();

        const photo = await RecipePhoto.findById(photoId).populate('recipeId');

        if (!photo) {
            console.log(`❌ Photo not found: ${photoId}`);
            return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
        }

        console.log(`📸 Found photo: ${photo.originalName}`);
        console.log(`📸 Expected size: ${photo.size} bytes`);
        console.log(`📸 Data type: ${typeof photo.data}`);
        console.log(`📸 Is Buffer: ${Buffer.isBuffer(photo.data)}`);

        const recipe = photo.recipeId;

        // Check if recipe is public or user has access
        if (!recipe.isPublic) {
            const session = await getEnhancedSession(request);
            if (!session?.user?.id || recipe.createdBy.toString() !== session.user.id) {
                return NextResponse.json({ error: 'Not authorized to view this photo' }, { status: 403 });
            }
        }

        // FIXED: Handle direct binary Buffer (no base64 conversion needed)
        let imageBuffer;

        try {
            if (Buffer.isBuffer(photo.data)) {
                // FIXED: The data is already a binary Buffer, use it directly
                imageBuffer = photo.data;
                console.log(`📸 Using direct binary buffer: ${imageBuffer.length} bytes`);
            } else if (typeof photo.data === 'string') {
                console.log('📸 Data is string, converting from base64');
                imageBuffer = Buffer.from(photo.data, 'base64');
            } else {
                console.error('❌ Unsupported data type:', typeof photo.data);
                return NextResponse.json({ error: 'Unsupported photo data format' }, { status: 500 });
            }

            if (!imageBuffer || imageBuffer.length === 0) {
                console.error('❌ Failed to create imageBuffer or buffer is empty');
                return NextResponse.json({ error: 'Failed to process image data' }, { status: 500 });
            }

            console.log(`✅ Successfully prepared imageBuffer: ${imageBuffer.length} bytes`);
            console.log(`📊 Expected: ${photo.size}, Actual: ${imageBuffer.length}`);

            // Validate image headers
            const isValidJPEG = imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8;
            const isPNG = imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50 && imageBuffer[2] === 0x4E && imageBuffer[3] === 0x47;
            const isWebP = imageBuffer[8] === 0x57 && imageBuffer[9] === 0x45 && imageBuffer[10] === 0x42 && imageBuffer[11] === 0x50;

            console.log(`📸 Valid JPEG: ${isValidJPEG}`);
            console.log(`📸 Valid PNG: ${isPNG}`);
            console.log(`📸 Valid WebP: ${isWebP}`);
            console.log(`📸 First 8 bytes: ${imageBuffer.slice(0, 8).toString('hex')}`);

            if (!isValidJPEG && !isPNG && !isWebP) {
                console.warn('⚠️ Invalid image header detected');
                // Log more debug info
                console.log(`📸 Full MIME type: ${photo.mimeType}`);
                console.log(`📸 First 16 bytes as hex: ${imageBuffer.slice(0, 16).toString('hex')}`);
                console.log(`📸 First 16 bytes as text: ${imageBuffer.slice(0, 16).toString('ascii')}`);
            }

            // Return binary image with proper headers
            return new NextResponse(imageBuffer, {
                headers: {
                    'Content-Type': photo.mimeType || 'image/jpeg',
                    'Content-Length': imageBuffer.length.toString(),
                    'Cache-Control': 'public, max-age=31536000, immutable',
                    'ETag': `"${photoId}"`,
                    'Content-Disposition': `inline; filename="${photo.originalName || 'recipe-photo'}"`,
                    // CORS headers for cross-origin requests
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET',
                    // Debug headers
                    'X-Original-Size': photo.size.toString(),
                    'X-Buffer-Size': imageBuffer.length.toString(),
                    'X-Valid-Image': (isValidJPEG || isPNG || isWebP).toString(),
                },
            });

        } catch (conversionError) {
            console.error('❌ Error processing image data:', conversionError);
            console.error('❌ Stack trace:', conversionError.stack);
            return NextResponse.json({
                error: 'Failed to process image data',
                details: conversionError.message
            }, { status: 500 });
        }

    } catch (error) {
        console.error('❌ Serve photo error:', error);
        console.error('❌ Stack trace:', error.stack);
        return NextResponse.json({
            error: 'Failed to serve photo',
            details: error.message
        }, { status: 500 });
    }
}

// DELETE - Delete a photo (keep existing)
export async function DELETE(request, { params }) {
    try {
        const session = await getEnhancedSession(request);
        const { photoId } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        if (!photoId) {
            return NextResponse.json({ error: 'Photo ID is required' }, { status: 400 });
        }

        await connectDB();
        const photo = await RecipePhoto.findById(photoId);

        if (!photo) {
            return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
        }

        if (photo.uploadedBy.toString() !== session.user.id) {
            return NextResponse.json({ error: 'Not authorized to delete this photo' }, { status: 403 });
        }

        const recipeId = photo.recipeId;
        const wasPrimary = photo.isPrimary;

        await RecipePhoto.findByIdAndDelete(photoId);

        const remainingPhotos = await RecipePhoto.find({ recipeId });

        await Recipe.findByIdAndUpdate(recipeId, {
            $pull: { photos: photoId },
            photoCount: remainingPhotos.length,
            hasPhotos: remainingPhotos.length > 0,
            ...(wasPrimary && remainingPhotos.length > 0 && {
                primaryPhoto: remainingPhotos[0]._id
            }),
            ...(remainingPhotos.length === 0 && {
                $unset: { primaryPhoto: 1 }
            })
        });

        if (wasPrimary && remainingPhotos.length > 0) {
            await RecipePhoto.findByIdAndUpdate(remainingPhotos[0]._id, { isPrimary: true });
        }

        return NextResponse.json({
            success: true,
            message: 'Photo deleted successfully'
        });

    } catch (error) {
        console.error('Delete photo error:', error);
        return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
    }
}

// PUT - Update photo metadata (keep existing)
export async function PUT(request, { params }) {
    try {
        const session = await getEnhancedSession(request);
        const { photoId } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        if (!photoId) {
            return NextResponse.json({ error: 'Photo ID is required' }, { status: 400 });
        }

        const updates = await request.json();
        await connectDB();

        const photo = await RecipePhoto.findById(photoId);

        if (!photo) {
            return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
        }

        if (photo.uploadedBy.toString() !== session.user.id) {
            return NextResponse.json({ error: 'Not authorized to update this photo' }, { status: 403 });
        }

        if (updates.isPrimary === true) {
            await RecipePhoto.updateMany(
                { recipeId: photo.recipeId, _id: { $ne: photoId } },
                { isPrimary: false }
            );

            await Recipe.findByIdAndUpdate(photo.recipeId, {
                primaryPhoto: photoId
            });
        }

        const allowedUpdates = ['isPrimary', 'aiAnalysis', 'searchMetadata'];
        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                photo[field] = updates[field];
            }
        });

        await photo.save();

        const { data, ...photoInfo } = photo.toObject();

        return NextResponse.json({
            success: true,
            photo: {
                ...photoInfo,
                url: `/api/recipes/photos/${photo._id}`
            },
            message: 'Photo updated successfully'
        });

    } catch (error) {
        console.error('Update photo error:', error);
        return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 });
    }
}