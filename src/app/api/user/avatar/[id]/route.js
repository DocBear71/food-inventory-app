// file: /src/app/api/user/avatar/[id]/route.js - FIXED GET ROUTE

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

// Helper function for JSON responses
function createJsonResponse(data, status = 200) {
    return NextResponse.json(data, {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

export async function GET(request, { params }) {
    console.log('=== Avatar GET Request ===');

    try {
        // Get avatar ID from URL params
        const avatarId = params.id;
        console.log('Requested avatar ID:', avatarId);

        if (!avatarId || avatarId === 'undefined' || avatarId === 'null') {
            console.log('Invalid avatar ID');
            return createJsonResponse({ error: 'Avatar ID required' }, 400);
        }

        if (!mongoose.Types.ObjectId.isValid(avatarId)) {
            console.log('Invalid ObjectId format:', avatarId);
            return createJsonResponse({ error: 'Invalid avatar ID format' }, 400);
        }

        // Connect to database
        try {
            await connectDB();
            console.log('Database connected for avatar retrieval');
        } catch (dbError) {
            console.error('Database connection failed:', dbError);
            return createJsonResponse({ error: 'Database connection failed' }, 500);
        }

        const db = mongoose.connection.db;
        if (!db) {
            console.error('No database connection available');
            return createJsonResponse({ error: 'Database not available' }, 500);
        }

        // First, try document storage (which is what we're using now)
        try {
            console.log('Checking document storage...');
            const avatarsCollection = db.collection('avatar_documents');

            const doc = await avatarsCollection.findOne({
                _id: new mongoose.Types.ObjectId(avatarId)
            });

            if (doc) {
                console.log('Found avatar in document storage:', {
                    filename: doc.filename,
                    contentType: doc.metadata?.contentType,
                    dataLength: doc.data?.length || 0,
                    userId: doc.userId
                });

                if (!doc.data) {
                    console.error('Avatar document has no data field');
                    return createJsonResponse({ error: 'Avatar data corrupted' }, 500);
                }

                // Convert base64 back to buffer
                let buffer;
                try {
                    buffer = Buffer.from(doc.data, 'base64');
                    console.log('Successfully converted base64 to buffer, size:', buffer.length);
                } catch (base64Error) {
                    console.error('Failed to decode base64 data:', base64Error);
                    return createJsonResponse({ error: 'Avatar data corrupted' }, 500);
                }

                // Return the image with proper headers
                return new NextResponse(buffer, {
                    status: 200,
                    headers: {
                        'Content-Type': doc.metadata?.contentType || 'image/jpeg',
                        'Content-Length': buffer.length.toString(),
                        'Cache-Control': 'public, max-age=86400', // 24 hour cache
                        'ETag': avatarId,
                        'Last-Modified': new Date(doc.createdAt || doc.metadata?.uploadDate).toUTCString()
                    }
                });
            } else {
                console.log('Avatar not found in document storage');
            }
        } catch (docError) {
            console.error('Document storage lookup error:', docError);
        }

        // Fallback to GridFS if document storage doesn't have it
        try {
            console.log('Checking GridFS storage...');
            const bucket = new GridFSBucket(db, { bucketName: 'avatars' });

            const files = await bucket.find({
                _id: new mongoose.Types.ObjectId(avatarId)
            }).toArray();

            if (files.length === 0) {
                console.log('Avatar not found in GridFS either');
                return createJsonResponse({ error: 'Avatar not found' }, 404);
            }

            const file = files[0];
            console.log('Found avatar in GridFS:', file.filename);

            // Download from GridFS
            const downloadStream = bucket.openDownloadStream(file._id);
            const chunks = [];

            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    downloadStream.destroy();
                    reject(new Error('GridFS download timeout'));
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
            console.log('Successfully downloaded from GridFS, size:', buffer.length);

            return new NextResponse(buffer, {
                status: 200,
                headers: {
                    'Content-Type': file.metadata?.contentType || 'image/jpeg',
                    'Content-Length': buffer.length.toString(),
                    'Cache-Control': 'public, max-age=86400',
                    'ETag': avatarId,
                    'Last-Modified': file.uploadDate?.toUTCString() || new Date().toUTCString()
                }
            });

        } catch (gridError) {
            console.error('GridFS lookup error:', gridError);
            return createJsonResponse({
                error: 'Failed to retrieve avatar: ' + gridError.message
            }, 500);
        }

    } catch (error) {
        console.error('Unexpected error in avatar GET:', error);
        return createJsonResponse({
            error: 'Server error: ' + error.message
        }, 500);
    }
}