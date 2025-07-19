// file: /src/app/api/recipes/photos/[id]/route.js - Enhanced version supporting both storage methods

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { RecipePhoto, Recipe } from '@/lib/models';
import { unlink } from 'fs/promises';
import path from 'path';
import fs from 'fs';

// GET - Serve photo binary data (supports both storage methods)
export async function GET(request, { params }) {
    try {
        const { photoId } = await params;

        if (!photoId) {
            return NextResponse.json({ error: 'Photo ID is required' }, { status: 400 });
        }

        await connectDB();

        // Try new MongoDB binary storage first
        let photo = await RecipePhoto.findById(photoId).populate('recipeId');

        if (photo) {
            // NEW: MongoDB binary storage
            const recipe = photo.recipeId;

            // Check if recipe is public or user has access
            if (!recipe.isPublic) {
                const session = await getEnhancedSession(request);
                if (!session?.user?.id || recipe.createdBy.toString() !== session.user.id) {
                    return NextResponse.json({ error: 'Not authorized to view this photo' }, { status: 403 });
                }
            }

            // Return binary image with proper headers
            return new NextResponse(photo.data, {
                headers: {
                    'Content-Type': photo.mimeType,
                    'Content-Length': photo.size.toString(),
                    'Cache-Control': 'public, max-age=31536000, immutable',
                    'ETag': `"${photoId}"`,
                    'Content-Disposition': `inline; filename="${photo.originalName || 'recipe-photo'}"`,
                },
            });
        }

        // LEGACY: Try old file system storage
        const { db } = await connectDB();
        const legacyPhoto = await db.collection('recipe_photos').findOne({ id: photoId });

        if (legacyPhoto) {
            // Check if file exists
            const filePath = path.join(process.cwd(), 'public', legacyPhoto.url);

            if (fs.existsSync(filePath)) {
                // Read file and return
                const fileBuffer = fs.readFileSync(filePath);
                const mimeType = legacyPhoto.mimeType || 'image/jpeg';

                return new NextResponse(fileBuffer, {
                    headers: {
                        'Content-Type': mimeType,
                        'Content-Length': fileBuffer.length.toString(),
                        'Cache-Control': 'public, max-age=31536000, immutable',
                        'ETag': `"legacy-${photoId}"`,
                    },
                });
            }
        }

        return NextResponse.json({ error: 'Photo not found' }, { status: 404 });

    } catch (error) {
        console.error('Serve photo error:', error);
        return NextResponse.json({ error: 'Failed to serve photo' }, { status: 500 });
    }
}

// DELETE - Delete a photo (supports both storage methods)
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

        // Try new MongoDB binary storage first
        let photo = await RecipePhoto.findById(photoId);

        if (photo) {
            // NEW: MongoDB binary storage deletion

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

            // If this was the primary photo and there are other photos, make the first one primary
            if (wasPrimary && remainingPhotos.length > 0) {
                await RecipePhoto.findByIdAndUpdate(remainingPhotos[0]._id, { isPrimary: true });
            }

            return NextResponse.json({
                success: true,
                message: 'Photo deleted successfully',
                storageType: 'mongodb'
            });
        }

        // LEGACY: Try old file system storage
        const { db } = await connectDB();
        const legacyPhoto = await db.collection('recipe_photos').findOne({ id: photoId });

        if (legacyPhoto) {
            // Delete file from filesystem
            const filePath = path.join(process.cwd(), 'public', legacyPhoto.url);
            try {
                await unlink(filePath);
                console.log(`🗑️ Deleted legacy photo file: ${filePath}`);
            } catch (fileError) {
                console.error('Error deleting legacy file:', fileError);
                // Continue with database deletion even if file delete fails
            }

            // Delete from legacy collection
            await db.collection('recipe_photos').deleteOne({ id: photoId });

            return NextResponse.json({
                success: true,
                message: 'Legacy photo deleted successfully',
                storageType: 'filesystem'
            });
        }

        return NextResponse.json({ error: 'Photo not found' }, { status: 404 });

    } catch (error) {
        console.error('Delete photo error:', error);
        return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
    }
}

// PUT - Update photo metadata (supports both storage methods)
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

        // Try new MongoDB binary storage first
        let photo = await RecipePhoto.findById(photoId);

        if (photo) {
            // NEW: MongoDB binary storage update

            // Check if user owns this photo
            if (photo.uploadedBy.toString() !== session.user.id) {
                return NextResponse.json({ error: 'Not authorized to update this photo' }, { status: 403 });
            }

            // If setting as primary, unset other primary photos for this recipe
            if (updates.isPrimary === true) {
                await RecipePhoto.updateMany(
                    { recipeId: photo.recipeId, _id: { $ne: photoId } },
                    { isPrimary: false }
                );

                // Update recipe's primary photo reference
                await Recipe.findByIdAndUpdate(photo.recipeId, {
                    primaryPhoto: photoId
                });
            }

            // Update allowed fields
            const allowedUpdates = ['isPrimary', 'aiAnalysis', 'searchMetadata'];
            allowedUpdates.forEach(field => {
                if (updates[field] !== undefined) {
                    photo[field] = updates[field];
                }
            });

            await photo.save();

            // Return photo info without binary data
            const { data, ...photoInfo } = photo.toObject();

            return NextResponse.json({
                success: true,
                photo: {
                    ...photoInfo,
                    url: `/api/recipes/photos/${photo._id}`
                },
                message: 'Photo updated successfully',
                storageType: 'mongodb'
            });
        }

        // LEGACY: Handle old file system storage updates
        const { db } = await connectDB();
        const legacyPhoto = await db.collection('recipe_photos').findOne({ id: photoId });

        if (legacyPhoto) {
            // Update legacy photo metadata
            const updateFields = {};

            if (updates.isPrimary !== undefined) {
                updateFields.isPrimary = updates.isPrimary;

                // If setting as primary, unset other primary photos
                if (updates.isPrimary === true) {
                    await db.collection('recipe_photos').updateMany(
                        { recipeId: legacyPhoto.recipeId, id: { $ne: photoId } },
                        { $set: { isPrimary: false } }
                    );
                }
            }

            if (Object.keys(updateFields).length > 0) {
                await db.collection('recipe_photos').updateOne(
                    { id: photoId },
                    { $set: updateFields }
                );
            }

            const updatedPhoto = await db.collection('recipe_photos').findOne({ id: photoId });

            return NextResponse.json({
                success: true,
                photo: {
                    ...updatedPhoto,
                    url: `/api/recipes/photos/${photoId}`
                },
                message: 'Legacy photo updated successfully',
                storageType: 'filesystem'
            });
        }

        return NextResponse.json({ error: 'Photo not found' }, { status: 404 });

    } catch (error) {
        console.error('Update photo error:', error);
        return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 });
    }
}

// MIGRATION HELPER - Convert legacy photos to MongoDB binary storage
export async function PATCH(request, { params }) {
    try {
        const session = await getEnhancedSession(request);
        const { photoId } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Check if user is admin or owns the photo
        // You might want to restrict this to admin users only

        const { action } = await request.json();

        if (action !== 'migrate-to-mongodb') {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        await connectDB();
        const { db } = await connectDB();

        // Get legacy photo
        const legacyPhoto = await db.collection('recipe_photos').findOne({ id: photoId });

        if (!legacyPhoto) {
            return NextResponse.json({ error: 'Legacy photo not found' }, { status: 404 });
        }

        // Check if file exists
        const filePath = path.join(process.cwd(), 'public', legacyPhoto.url);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'Photo file not found on filesystem' }, { status: 404 });
        }

        // Read file into buffer
        const fileBuffer = fs.readFileSync(filePath);
        const stats = fs.statSync(filePath);

        // Create new MongoDB binary photo record
        const newPhoto = new RecipePhoto({
            recipeId: legacyPhoto.recipeId,
            filename: path.basename(legacyPhoto.url),
            originalName: legacyPhoto.originalName || path.basename(legacyPhoto.url),
            mimeType: legacyPhoto.mimeType || 'image/jpeg',
            size: stats.size,
            data: fileBuffer,
            isPrimary: legacyPhoto.isPrimary || false,
            source: 'user_upload', // Assume legacy photos were user uploads
            uploadedBy: session.user.id,
            uploadedAt: legacyPhoto.createdAt || new Date()
        });

        await newPhoto.save();

        // Update recipe to reference new photo
        await Recipe.findByIdAndUpdate(legacyPhoto.recipeId, {
            $addToSet: { photos: newPhoto._id },
            $inc: { photoCount: 1 },
            hasPhotos: true,
            ...(legacyPhoto.isPrimary && { primaryPhoto: newPhoto._id })
        });

        // Delete legacy photo from database and filesystem
        await db.collection('recipe_photos').deleteOne({ id: photoId });

        try {
            await unlink(filePath);
            console.log(`🔄 Migrated and deleted legacy photo: ${filePath}`);
        } catch (error) {
            console.warn(`⚠️ Could not delete legacy file: ${filePath}`, error);
        }

        return NextResponse.json({
            success: true,
            message: 'Photo migrated to MongoDB binary storage',
            newPhotoId: newPhoto._id,
            legacyPhotoId: photoId,
            fileSize: stats.size
        });

    } catch (error) {
        console.error('Migration error:', error);
        return NextResponse.json({ error: 'Failed to migrate photo' }, { status: 500 });
    }
}