// file: /src/app/api/user/avatar/route.js v3 - ROBUST with JSON Error Handling

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

// Helper function to ensure JSON response
function createJsonResponse(data, status = 200) {
    try {
        return NextResponse.json(data, {
            status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    } catch (error) {
        console.error('JSON response creation error:', error);
        return new NextResponse(
            JSON.stringify({ error: 'Internal server error' }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Helper function to process and resize image
async function processImage(buffer, maxWidth = 300, maxHeight = 300, quality = 0.8) {
    try {
        // Basic optimization - if image is too large, reject it
        if (buffer.length > 1024 * 1024) { // 1MB
            throw new Error('Image too large after processing');
        }

        return buffer;
    } catch (error) {
        console.error('Image processing error:', error);
        throw new Error('Failed to process image');
    }
}

// Helper function to validate image type
function validateImageType(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    return allowedTypes.includes(file.type);
}

// Helper function to generate unique filename
function generateFilename(userId, originalName) {
    const timestamp = Date.now();
    const ext = originalName.split('.').pop() || 'jpg';
    return `avatar_${userId}_${timestamp}.${ext}`;
}

export async function POST(request) {
    console.log('=== Avatar Upload API Called ===');

    try {
        // Check authentication first
        let session;
        try {
            session = await getServerSession(authOptions);
            console.log('Session check completed');
        } catch (authError) {
            console.error('Authentication error:', authError);
            return createJsonResponse({ error: 'Authentication failed' }, 401);
        }

        if (!session || !session.user) {
            console.log('No session found');
            return createJsonResponse({ error: 'Unauthorized - Please log in' }, 401);
        }

        // Get user ID from session
        const userId = session.user.id || session.user._id || session.user.sub;
        if (!userId) {
            console.error('No user ID found in session:', session.user);
            return createJsonResponse({ error: 'User ID not found in session' }, 400);
        }

        console.log('Processing upload for user:', userId);

        // Parse form data with better error handling
        let formData;
        try {
            console.log('Parsing form data...');
            formData = await Promise.race([
                request.formData(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Form data parsing timeout')), 10000)
                )
            ]);
            console.log('Form data parsed successfully');
        } catch (error) {
            console.error('Form data parsing error:', error);
            return createJsonResponse({ error: 'Failed to parse upload data: ' + error.message }, 400);
        }

        const file = formData.get('avatar');
        if (!file) {
            console.log('No file found in form data');
            return createJsonResponse({ error: 'No file uploaded' }, 400);
        }

        console.log('File received:', {
            name: file.name,
            type: file.type,
            size: file.size
        });

        // Validate file type
        if (!validateImageType(file)) {
            console.log('Invalid file type:', file.type);
            return createJsonResponse({
                error: 'Invalid file type. Please upload JPG, PNG, GIF, or WebP images.'
            }, 400);
        }

        // Validate file size (2MB limit)
        if (file.size > 2 * 1024 * 1024) {
            console.log('File too large:', file.size);
            return createJsonResponse({
                error: 'File too large. Maximum size is 2MB.'
            }, 400);
        }

        // Connect to database with better error handling
        try {
            console.log('Connecting to database...');
            await Promise.race([
                connectDB(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Database connection timeout')), 5000)
                )
            ]);
            console.log('Database connected successfully');
        } catch (error) {
            console.error('Database connection error:', error);
            return createJsonResponse({ error: 'Database connection failed: ' + error.message }, 500);
        }

        // Verify database connection
        if (!mongoose.connection.db) {
            console.error('No database connection available');
            return createJsonResponse({ error: 'Database not available' }, 500);
        }

        const db = mongoose.connection.db;
        let bucket;

        try {
            bucket = new GridFSBucket(db, { bucketName: 'avatars' });
            console.log('GridFS bucket created');
        } catch (bucketError) {
            console.error('GridFS bucket creation error:', bucketError);
            return createJsonResponse({ error: 'Storage system unavailable' }, 500);
        }

        // Delete existing avatar if it exists
        try {
            console.log('Checking for existing avatars...');
            const existingFiles = await Promise.race([
                bucket.find({ 'metadata.userId': userId }).toArray(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('File search timeout')), 3000)
                )
            ]);

            console.log(`Found ${existingFiles.length} existing avatar(s)`);

            for (const existingFile of existingFiles) {
                try {
                    await bucket.delete(existingFile._id);
                    console.log('Deleted existing avatar:', existingFile._id);
                } catch (deleteError) {
                    console.warn('Failed to delete existing file:', deleteError);
                    // Continue anyway - don't fail the upload for this
                }
            }
        } catch (error) {
            console.warn('Error checking for existing files:', error);
            // Continue with upload anyway
        }

        // Convert file to buffer
        let buffer;
        try {
            console.log('Reading file buffer...');
            const bytes = await Promise.race([
                file.arrayBuffer(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('File reading timeout')), 5000)
                )
            ]);
            buffer = Buffer.from(bytes);
            console.log('File buffer created, size:', buffer.length);
        } catch (error) {
            console.error('File reading error:', error);
            return createJsonResponse({ error: 'Failed to read uploaded file: ' + error.message }, 500);
        }

        // Process image
        try {
            console.log('Processing image...');
            buffer = await Promise.race([
                processImage(buffer),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Image processing timeout')), 8000)
                )
            ]);
            console.log('Image processed successfully');
        } catch (error) {
            console.error('Image processing error:', error);
            return createJsonResponse({
                error: 'Failed to process image: ' + error.message
            }, 500);
        }

        // Generate filename
        const filename = generateFilename(userId, file.name);
        console.log('Generated filename:', filename);

        // Upload the file
        let fileId;
        try {
            console.log('Starting file upload...');

            const uploadStream = bucket.openUploadStream(filename, {
                metadata: {
                    userId: userId,
                    originalName: file.name,
                    contentType: file.type,
                    uploadDate: new Date(),
                    processedSize: buffer.length
                }
            });

            fileId = await Promise.race([
                new Promise((resolve, reject) => {
                    uploadStream.on('error', (error) => {
                        console.error('Upload stream error:', error);
                        reject(error);
                    });
                    uploadStream.on('finish', () => {
                        console.log('Upload stream finished');
                        resolve(uploadStream.id);
                    });

                    // Write the buffer to the stream
                    uploadStream.end(buffer);
                }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('File upload timeout')), 15000)
                )
            ]);

            console.log('File uploaded successfully with ID:', fileId);
        } catch (error) {
            console.error('File upload error:', error);
            return createJsonResponse({
                error: 'Upload failed: ' + error.message
            }, 500);
        }

        // Update user record
        try {
            console.log('Updating user record...');

            const user = await Promise.race([
                User.findById(userId),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('User lookup timeout')), 3000)
                )
            ]);

            if (!user) {
                console.error('User not found:', userId);
                // Clean up uploaded file
                try {
                    await bucket.delete(fileId);
                    console.log('Cleaned up uploaded file due to user not found');
                } catch (cleanupError) {
                    console.error('Cleanup error:', cleanupError);
                }
                return createJsonResponse({ error: 'User not found' }, 404);
            }

            // Update user avatar
            user.avatar = fileId.toString();
            user.updatedAt = new Date();

            await Promise.race([
                user.save(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('User save timeout')), 3000)
                )
            ]);

            console.log('User record updated successfully');
        } catch (error) {
            console.error('User update error:', error);
            // Clean up uploaded file
            try {
                await bucket.delete(fileId);
                console.log('Cleaned up uploaded file due to user update failure');
            } catch (cleanupError) {
                console.error('Cleanup error:', cleanupError);
            }
            return createJsonResponse({
                error: 'Failed to update user profile: ' + error.message
            }, 500);
        }

        console.log('Avatar upload completed successfully');

        // Return success response
        return createJsonResponse({
            success: true,
            message: 'Avatar uploaded successfully',
            avatarId: fileId.toString(),
            avatarUrl: `/api/user/avatar/${fileId.toString()}`
        });

    } catch (error) {
        console.error('Unexpected avatar upload error:', error);
        return createJsonResponse({
            error: 'Unexpected error occurred: ' + (error.message || 'Unknown error'),
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, 500);
    }
}

// GET route to serve avatar images
export async function GET(request) {
    console.log('=== Avatar GET Request ===');

    try {
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        const avatarId = pathParts[pathParts.length - 1];

        console.log('Requested avatar ID:', avatarId);

        if (!avatarId || avatarId === 'undefined' || avatarId === 'null') {
            console.log('Invalid avatar ID requested');
            return createJsonResponse({ error: 'Avatar ID required' }, 400);
        }

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(avatarId)) {
            console.log('Invalid ObjectId format:', avatarId);
            return createJsonResponse({ error: 'Invalid avatar ID format' }, 400);
        }

        // Connect to database
        try {
            await Promise.race([
                connectDB(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Database connection timeout')), 3000)
                )
            ]);
        } catch (error) {
            console.error('Database connection error in GET:', error);
            return createJsonResponse({ error: 'Database connection failed' }, 500);
        }

        const db = mongoose.connection.db;
        const bucket = new GridFSBucket(db, { bucketName: 'avatars' });

        // Find the file
        let files;
        try {
            files = await Promise.race([
                bucket.find({ _id: new mongoose.Types.ObjectId(avatarId) }).toArray(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('File search timeout')), 3000)
                )
            ]);
        } catch (error) {
            console.error('File search error:', error);
            return createJsonResponse({ error: 'Failed to search for avatar' }, 500);
        }

        if (files.length === 0) {
            console.log('Avatar not found:', avatarId);
            return createJsonResponse({ error: 'Avatar not found' }, 404);
        }

        const file = files[0];
        console.log('Found avatar file:', file.filename);

        // Download the file
        try {
            const downloadStream = bucket.openDownloadStream(file._id);

            const chunks = [];
            const downloadPromise = new Promise((resolve, reject) => {
                downloadStream.on('data', (chunk) => chunks.push(chunk));
                downloadStream.on('end', () => resolve());
                downloadStream.on('error', reject);
            });

            await Promise.race([
                downloadPromise,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Download timeout')), 10000)
                )
            ]);

            const buffer = Buffer.concat(chunks);
            console.log('Avatar downloaded successfully, size:', buffer.length);

            // Return image with proper headers
            return new NextResponse(buffer, {
                status: 200,
                headers: {
                    'Content-Type': file.metadata?.contentType || 'image/jpeg',
                    'Content-Length': buffer.length.toString(),
                    'Cache-Control': 'public, max-age=31536000, immutable',
                    'ETag': file._id.toString(),
                    'Last-Modified': file.uploadDate?.toUTCString() || new Date().toUTCString()
                }
            });

        } catch (error) {
            console.error('Avatar download error:', error);
            return createJsonResponse({
                error: 'Failed to download avatar: ' + error.message
            }, 500);
        }

    } catch (error) {
        console.error('Unexpected error in avatar GET:', error);
        return createJsonResponse({
            error: 'Unexpected error: ' + (error.message || 'Unknown error')
        }, 500);
    }
}

// DELETE route
export async function DELETE(request) {
    console.log('=== Avatar DELETE Request ===');

    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return createJsonResponse({ error: 'Unauthorized' }, 401);
        }

        const userId = session.user.id || session.user._id || session.user.sub;
        if (!userId) {
            return createJsonResponse({ error: 'User ID not found in session' }, 400);
        }

        console.log('Deleting avatar for user:', userId);

        // Connect to database
        try {
            await Promise.race([
                connectDB(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Database connection timeout')), 3000)
                )
            ]);
        } catch (error) {
            console.error('Database connection error in DELETE:', error);
            return createJsonResponse({ error: 'Database connection failed' }, 500);
        }

        const db = mongoose.connection.db;
        const bucket = new GridFSBucket(db, { bucketName: 'avatars' });

        // Find and delete user's avatar files
        try {
            const files = await Promise.race([
                bucket.find({ 'metadata.userId': userId }).toArray(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('File search timeout')), 3000)
                )
            ]);

            console.log(`Found ${files.length} avatar file(s) to delete`);

            for (const file of files) {
                try {
                    await bucket.delete(file._id);
                    console.log('Deleted avatar file:', file._id);
                } catch (deleteError) {
                    console.warn('Failed to delete file:', deleteError);
                    // Continue with other files
                }
            }
        } catch (error) {
            console.error('Error finding/deleting avatar files:', error);
            return createJsonResponse({
                error: 'Failed to delete avatar files: ' + error.message
            }, 500);
        }

        // Update user record
        try {
            const user = await Promise.race([
                User.findById(userId),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('User lookup timeout')), 3000)
                )
            ]);

            if (user) {
                user.avatar = '';
                user.updatedAt = new Date();
                await Promise.race([
                    user.save(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('User save timeout')), 3000)
                    )
                ]);
                console.log('User avatar field cleared');
            }
        } catch (error) {
            console.error('Error updating user record:', error);
            // Don't fail the request if user update fails
            console.warn('Avatar files deleted but user record update failed');
        }

        return createJsonResponse({
            success: true,
            message: 'Avatar removed successfully'
        });

    } catch (error) {
        console.error('Unexpected error in avatar DELETE:', error);
        return createJsonResponse({
            error: 'Unexpected error: ' + (error.message || 'Unknown error')
        }, 500);
    }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}