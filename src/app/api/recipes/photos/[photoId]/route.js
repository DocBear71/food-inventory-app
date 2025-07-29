// file: /src/app/api/recipes/photos/[photoId]/route.js - SPECIFIC FIX for Binary.createFromBase64

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { RecipePhoto, Recipe } from '@/lib/models';

// GET - Serve photo binary data (SPECIFIC FIX for your Binary.createFromBase64 format)
export async function GET(request, { params }) {
    try {
        const { photoId } = await params;

        if (!photoId) {
            console.error('❌ No photoId provided');
            return NextResponse.json({ error: 'Photo ID is required' }, { status: 400 });
        }

        console.log(`📸 Fetching photo: ${photoId}`);
        await connectDB();

        // Find the photo
        let photo = await RecipePhoto.findById(photoId).populate('recipeId');

        if (!photo) {
            console.log(`❌ Photo not found: ${photoId}`);
            return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
        }

        console.log(`📸 Found photo: ${photo.originalName}`);
        console.log(`📸 Data type: ${typeof photo.data}`);
        console.log(`📸 Data constructor: ${photo.data?.constructor?.name}`);
        console.log(`📸 Has buffer: ${!!photo.data?.buffer}`);
        console.log(`📸 BSON type: ${photo.data?._bsontype}`);

        const recipe = photo.recipeId;

        // Check if recipe is public or user has access
        if (!recipe.isPublic) {
            const session = await getEnhancedSession(request);
            if (!session?.user?.id || recipe.createdBy.toString() !== session.user.id) {
                return NextResponse.json({ error: 'Not authorized to view this photo' }, { status: 403 });
            }
        }

        // SPECIFIC FIX: Handle Binary.createFromBase64 format
        let imageBuffer;

        try {
            // Your data is stored as Binary.createFromBase64, so we need to handle the MongoDB Binary type
            if (photo.data && photo.data.constructor && photo.data.constructor.name === 'Binary') {
                console.log('📸 Processing MongoDB Binary object');

                // Method 1: Try the .buffer property (most common)
                if (photo.data.buffer) {
                    console.log('📸 Using .buffer property');
                    imageBuffer = Buffer.from(photo.data.buffer);
                }
                // Method 2: Try the .value() method
                else if (typeof photo.data.value === 'function') {
                    console.log('📸 Using .value() method');
                    imageBuffer = photo.data.value(true); // true returns Buffer
                }
                // Method 3: Try toString('base64') then convert back
                else if (typeof photo.data.toString === 'function') {
                    console.log('📸 Using .toString("base64") method');
                    const base64String = photo.data.toString('base64');
                    imageBuffer = Buffer.from(base64String, 'base64');
                }
                // Method 4: Direct binary access for Binary.createFromBase64
                else {
                    console.log('📸 Attempting direct binary access');
                    // For Binary.createFromBase64, the data might be in different properties
                    const binaryData = photo.data.sub_type !== undefined ? photo.data : photo.data.buffer || photo.data;
                    imageBuffer = Buffer.from(binaryData);
                }
            }
            // Handle if it's already a buffer
            else if (Buffer.isBuffer(photo.data)) {
                console.log('📸 Data is already a Buffer');
                imageBuffer = photo.data;
            }
            // Handle if it's a base64 string
            else if (typeof photo.data === 'string') {
                console.log('📸 Data is a base64 string');
                imageBuffer = Buffer.from(photo.data, 'base64');
            }
            // Handle BSON Binary type
            else if (photo.data && photo.data._bsontype === 'Binary') {
                console.log('📸 Processing BSON Binary type');
                imageBuffer = Buffer.from(photo.data.buffer);
            }
            else {
                console.error('❌ Unknown data format:', {
                    type: typeof photo.data,
                    constructor: photo.data?.constructor?.name,
                    keys: photo.data ? Object.keys(photo.data) : []
                });
                return NextResponse.json({ error: 'Unsupported photo data format' }, { status: 500 });
            }

            if (!imageBuffer || imageBuffer.length === 0) {
                console.error('❌ Failed to create imageBuffer or buffer is empty');
                return NextResponse.json({ error: 'Failed to process image data' }, { status: 500 });
            }

            console.log(`✅ Successfully created imageBuffer: ${imageBuffer.length} bytes`);
            console.log(`✅ Expected size: ${photo.size} bytes`);

            // Validate that we got the right amount of data
            if (Math.abs(imageBuffer.length - photo.size) > 100) {
                console.warn(`⚠️ Size mismatch: expected ${photo.size}, got ${imageBuffer.length}`);
            }

            // Return binary image with proper headers
            return new NextResponse(imageBuffer, {
                headers: {
                    'Content-Type': photo.mimeType || 'image/jpeg',
                    'Content-Length': imageBuffer.length.toString(),
                    'Cache-Control': 'public, max-age=31536000, immutable',
                    'ETag': `"${photoId}"`,
                    'Content-Disposition': `inline; filename="${photo.originalName || 'recipe-photo'}"`,
                    'Accept-Ranges': 'bytes',
                },
            });

        } catch (conversionError) {
            console.error('❌ Error converting image data:', conversionError);
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

// DELETE - Delete a photo
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

        // Check if user owns this photo
        if (photo.uploadedBy.toString() !== session.user.id) {
            return NextResponse.json({ error: 'Not authorized to delete this photo' }, { status: 403 });
        }

        const recipeId = photo.recipeId;
        const wasPrimary = photo.isPrimary;

        // Delete the photo from MongoDB
        await RecipePhoto.findByIdAndDelete(photoId);

        // Update recipe references
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

// PUT - Update photo metadata
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