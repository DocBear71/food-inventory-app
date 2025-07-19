// file: /src/app/api/recipes/photos/upload/route.js v2 - Binary storage in MongoDB

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { Recipe } from '@/lib/models';

export async function POST(request) {
    try {
        const session = await getEnhancedSession(request);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const imageFile = formData.get('recipeImage');
        const recipeId = formData.get('recipeId');

        if (!imageFile || !recipeId) {
            return NextResponse.json({
                error: 'Recipe image and recipe ID are required'
            }, { status: 400 });
        }

        // Validate file size (5MB limit)
        if (imageFile.size > 5242880) {
            return NextResponse.json({
                error: 'Image must be less than 5MB'
            }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(imageFile.type)) {
            return NextResponse.json({
                error: 'File must be JPG, PNG, or WebP format'
            }, { status: 400 });
        }

        await connectDB();

        // Verify recipe ownership
        const recipe = await Recipe.findOne({
            _id: recipeId,
            createdBy: session.user.id
        });

        if (!recipe) {
            return NextResponse.json({
                error: 'Recipe not found or access denied'
            }, { status: 404 });
        }

        // Convert file to buffer for binary storage
        const bytes = await imageFile.arrayBuffer();
        const imageBuffer = Buffer.from(bytes);

        // Convert to base64 for storage (same as user avatars)
        const base64Image = imageBuffer.toString('base64');

        // Create image data object
        const imageData = {
            data: base64Image,
            mimeType: imageFile.type,
            size: imageFile.size,
            originalName: imageFile.name,
            uploadedAt: new Date(),
            source: 'user_upload'
        };

        // Update recipe with the uploaded image
        const updatedRecipe = await Recipe.findByIdAndUpdate(
            recipeId,
            {
                // Store as base64 in imageData field (similar to extractedImage)
                uploadedImage: imageData,
                hasUserImage: true,
                updatedAt: new Date()
            },
            { new: true }
        );

        console.log(`📸 User image uploaded for recipe: ${recipe.title} (${imageFile.size} bytes)`);

        return NextResponse.json({
            success: true,
            image: {
                id: `uploaded-${Date.now()}`,
                data: `data:${imageFile.type};base64,${base64Image}`,
                source: 'user_upload',
                size: imageFile.size,
                mimeType: imageFile.type,
                uploadedAt: imageData.uploadedAt
            },
            message: 'Image uploaded and saved successfully'
        });

    } catch (error) {
        console.error('❌ Image upload error:', error);
        return NextResponse.json({
            error: 'Failed to upload image',
            details: error.message
        }, { status: 500 });
    }
}

// GET endpoint to serve uploaded images (similar to avatar serving)
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const recipeId = searchParams.get('recipeId');

        if (!recipeId) {
            return NextResponse.json({ error: 'Recipe ID required' }, { status: 400 });
        }

        await connectDB();

        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
        }

        // Check for uploaded image first, then extracted image
        let imageData = null;
        let contentType = 'image/jpeg';

        if (recipe.uploadedImage?.data) {
            imageData = recipe.uploadedImage.data;
            contentType = recipe.uploadedImage.mimeType || 'image/jpeg';
        } else if (recipe.extractedImage?.data) {
            imageData = recipe.extractedImage.data;
            contentType = 'image/jpeg'; // Extracted images are typically JPEG
        }

        if (!imageData) {
            return NextResponse.json({ error: 'No image found' }, { status: 404 });
        }

        // Convert base64 back to binary
        const imageBuffer = Buffer.from(imageData, 'base64');

        return new NextResponse(imageBuffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Length': imageBuffer.length.toString(),
                'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
            }
        });

    } catch (error) {
        console.error('❌ Error serving image:', error);
        return NextResponse.json({ error: 'Failed to serve image' }, { status: 500 });
    }
}