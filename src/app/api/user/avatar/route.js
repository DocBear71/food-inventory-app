// file: /src/app/api/user/avatar/route.js v4 - VERCEL OPTIMIZED

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
// authOptions no longer needed in NextAuth v5
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { getEnhancedSession } from '@/lib/api-auth';

// Helper function to ensure JSON response
function createJsonResponse(data, status = 200) {
    return NextResponse.json(data, {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        }
    });
}

// Vercel-optimized GridFS upload with aggressive timeouts and smaller chunks
async function uploadToGridFSVercel(bucket, filename, buffer, metadata) {
    return new Promise((resolve, reject) => {
        console.log('Starting Vercel-optimized GridFS upload...');

        // Use smaller chunks for Vercel's memory constraints
        const uploadStream = bucket.openUploadStream(filename, {
            metadata,
            chunkSizeBytes: 32 * 1024 // 32KB chunks for Vercel
        });

        // Shorter timeout for Vercel
        const uploadTimeout = setTimeout(() => {
            console.error('GridFS upload timeout (Vercel limit)');
            uploadStream.destroy();
            reject(new Error('Upload timeout - file may be too large for serverless processing'));
        }, 25000); // 25 seconds max for Vercel

        let totalWritten = 0;

        uploadStream.on('error', (error) => {
            console.error('GridFS stream error:', error);
            clearTimeout(uploadTimeout);
            reject(error);
        });

        uploadStream.on('finish', () => {
            console.log('GridFS upload completed, total bytes:', totalWritten);
            clearTimeout(uploadTimeout);
            resolve(uploadStream.id);
        });

        // Write buffer in very small chunks to prevent Vercel memory issues
        const writeInSmallChunks = () => {
            const maxChunkSize = 8 * 1024; // 8KB at a time
            let offset = 0;

            const writeNextChunk = () => {
                if (offset >= buffer.length) {
                    uploadStream.end();
                    return;
                }

                const remainingBytes = buffer.length - offset;
                const chunkSize = Math.min(maxChunkSize, remainingBytes);
                const chunk = buffer.subarray(offset, offset + chunkSize);

                const canContinue = uploadStream.write(chunk);
                offset += chunkSize;
                totalWritten += chunkSize;

                // Log progress every 32KB
                if (totalWritten % (32 * 1024) === 0 || offset >= buffer.length) {
                    console.log(`Upload progress: ${totalWritten}/${buffer.length} bytes (${Math.round(totalWritten/buffer.length*100)}%)`);
                }

                if (!canContinue) {
                    // Wait for drain before continuing
                    uploadStream.once('drain', writeNextChunk);
                } else {
                    // Use setImmediate to yield control back to event loop
                    setImmediate(writeNextChunk);
                }
            };

            writeNextChunk();
        };

        // Start the chunked writing process
        writeInSmallChunks();
    });
}

// Alternative: Simple MongoDB document storage for Vercel (fallback)
async function storeAsDocument(db, userId, filename, buffer, metadata) {
    console.log('Using document storage fallback...');

    // Store file as Base64 in a regular MongoDB collection
    const avatarsCollection = db.collection('avatar_documents');

    // Delete existing avatar documents for this user
    await avatarsCollection.deleteMany({ userId: userId });

    const avatarDoc = {
        userId: userId,
        filename: filename,
        data: buffer.toString('base64'),
        metadata: metadata,
        createdAt: new Date()
    };

    const result = await avatarsCollection.insertOne(avatarDoc);
    console.log('Avatar stored as document:', result.insertedId);

    return result.insertedId;
}

export async function POST(request) {
    console.log('=== Avatar Upload API Called (Vercel Optimized) ===');
    const startTime = Date.now();

    try {
        // Quick authentication check
        const sessionResult = await getEnhancedSession(request);
        const session = sessionResult ? { user: sessionResult.user } : null;

        if (!session?.user) {
            return createJsonResponse({ error: 'Unauthorized' }, 401);
        }

        const userId = session.user.id || session.user._id || session.user.sub;
        if (!userId) {
            return createJsonResponse({ error: 'User ID not found' }, 400);
        }

        console.log('Processing upload for user:', userId);

        // Fast form data parsing
        const formData = await request.formData();
        const file = formData.get('avatar');

        if (!file) {
            return createJsonResponse({ error: 'No file uploaded' }, 400);
        }

        console.log('File received:', {
            name: file.name,
            type: file.type,
            size: file.size,
            parseTime: Date.now() - startTime
        });

        // Strict validation for Vercel
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return createJsonResponse({ error: 'Invalid file type' }, 400);
        }

        // Lower size limit for Vercel
        if (file.size > 1 * 1024 * 1024) { // 1MB limit for Vercel
            return createJsonResponse({ error: 'File too large. Maximum 1MB for upload.' }, 400);
        }

        // Quick database connection
        await connectDB();
        const db = mongoose.connection.db;

        if (!db) {
            return createJsonResponse({ error: 'Database not available' }, 500);
        }

        console.log('Database connected, reading file...');

        // Read file buffer quickly
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        console.log('File buffer ready:', buffer.length, 'bytes at', Date.now() - startTime, 'ms');

        // Generate metadata
        const filename = `avatar_${userId}_${Date.now()}.${file.name.split('.').pop()}`;
        const metadata = {
            userId: userId,
            originalName: file.name,
            contentType: file.type,
            uploadDate: new Date(),
            fileSize: buffer.length
        };

        let fileId;
        let useDocumentStorage = false;

        // Try GridFS first, fallback to document storage
        try {
            console.log('Attempting GridFS upload...');
            const bucket = new GridFSBucket(db, {
                bucketName: 'avatars',
                chunkSizeBytes: 32 * 1024 // Small chunks for Vercel
            });

            // Clean up existing files quickly (don't wait)
            bucket.find({ 'metadata.userId': userId }).toArray()
                .then(files => {
                    files.forEach(f => bucket.delete(f._id).catch(console.warn));
                })
                .catch(console.warn);

            fileId = await uploadToGridFSVercel(bucket, filename, buffer, metadata);
            console.log('GridFS upload successful:', fileId);

        } catch (gridError) {
            console.log('GridFS failed, trying document storage:', gridError.message);
            useDocumentStorage = true;

            try {
                fileId = await storeAsDocument(db, userId, filename, buffer, metadata);
                console.log('Document storage successful:', fileId);
            } catch (docError) {
                console.error('Both storage methods failed:', docError);
                return createJsonResponse({
                    error: 'Failed to store file: ' + docError.message
                }, 500);
            }
        }

        // Update user record quickly
        console.log('Updating user record...');
        try {
            await User.findByIdAndUpdate(
                userId,
                {
                    avatar: fileId.toString(),
                    avatarStorageType: useDocumentStorage ? 'document' : 'gridfs', // Track storage type
                    updatedAt: new Date()
                },
                { new: true }
            );
            console.log('User updated successfully');
        } catch (userError) {
            console.error('User update failed:', userError);
            // Clean up uploaded file but don't fail the request
        }

        const totalTime = Date.now() - startTime;
        console.log('Upload completed successfully in', totalTime, 'ms');

        return createJsonResponse({
            success: true,
            message: 'Avatar uploaded successfully',
            avatarId: fileId.toString(),
            avatarUrl: `/api/user/avatar/${fileId.toString()}`,
            uploadTime: totalTime,
            storageType: useDocumentStorage ? 'document' : 'gridfs'
        });

    } catch (error) {
        console.error('Upload error:', error);
        return createJsonResponse({
            error: 'Upload failed: ' + error.message
        }, 500);
    }
}

// Optimized GET route that handles both GridFS and document storage
export async function GET(request) {
    try {
        const url = new URL(request.url);
        const avatarId = url.pathname.split('/').pop();

        if (!avatarId || !mongoose.Types.ObjectId.isValid(avatarId)) {
            return createJsonResponse({ error: 'Invalid avatar ID' }, 400);
        }

        await connectDB();
        const db = mongoose.connection.db;

        // Try document storage first (faster for Vercel)
        try {
            const avatarsCollection = db.collection('avatar_documents');
            const doc = await avatarsCollection.findOne({
                _id: new mongoose.Types.ObjectId(avatarId)
            });

            if (doc) {
                console.log('Serving avatar from document storage');
                const buffer = Buffer.from(doc.data, 'base64');

                return new NextResponse(buffer, {
                    status: 200,
                    headers: {
                        'Content-Type': doc.metadata.contentType || 'image/jpeg',
                        'Content-Length': buffer.length.toString(),
                        'Cache-Control': 'public, max-age=86400', // 24 hour cache
                        'ETag': avatarId
                    }
                });
            }
        } catch (docError) {
            console.log('Document storage lookup failed, trying GridFS...');
        }

        // Fallback to GridFS
        const bucket = new GridFSBucket(db, { bucketName: 'avatars' });
        const files = await bucket.find({
            _id: new mongoose.Types.ObjectId(avatarId)
        }).toArray();

        if (files.length === 0) {
            return createJsonResponse({ error: 'Avatar not found' }, 404);
        }

        const file = files[0];
        console.log('Serving avatar from GridFS:', file.filename);

        // Quick GridFS download
        const downloadStream = bucket.openDownloadStream(file._id);
        const chunks = [];

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                downloadStream.destroy();
                reject(new Error('Download timeout'));
            }, 10000);

            downloadStream.on('data', chunk => chunks.push(chunk));
            downloadStream.on('end', () => {
                clearTimeout(timeout);
                resolve();
            });
            downloadStream.on('error', error => {
                clearTimeout(timeout);
                reject(error);
            });
        });

        const buffer = Buffer.concat(chunks);

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': file.metadata?.contentType || 'image/jpeg',
                'Content-Length': buffer.length.toString(),
                'Cache-Control': 'public, max-age=86400',
                'ETag': avatarId
            }
        });

    } catch (error) {
        console.error('Avatar retrieval error:', error);
        return createJsonResponse({
            error: 'Failed to retrieve avatar: ' + error.message
        }, 500);
    }
}

// Simple DELETE route
export async function DELETE(request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return createJsonResponse({ error: 'Unauthorized' }, 401);
        }

        const userId = session.user.id || session.user._id || session.user.sub;

        await connectDB();
        const db = mongoose.connection.db;

        // Delete from both storage types
        try {
            // Delete document storage
            const avatarsCollection = db.collection('avatar_documents');
            await avatarsCollection.deleteMany({ userId: userId });

            // Delete GridFS files
            const bucket = new GridFSBucket(db, { bucketName: 'avatars' });
            const files = await bucket.find({ 'metadata.userId': userId }).toArray();
            for (const file of files) {
                await bucket.delete(file._id);
            }
        } catch (deleteError) {
            console.warn('Cleanup error:', deleteError);
        }

        // Update user
        await User.findByIdAndUpdate(userId, {
            avatar: '',
            updatedAt: new Date()
        });

        return createJsonResponse({
            success: true,
            message: 'Avatar removed successfully'
        });

    } catch (error) {
        console.error('Delete error:', error);
        return createJsonResponse({
            error: 'Failed to delete avatar: ' + error.message
        }, 500);
    }
}