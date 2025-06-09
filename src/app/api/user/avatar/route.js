// file: /src/app/api/user/avatar/route.js - MongoDB GridFS Storage

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

export async function POST(request) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        console.log('Session user:', session?.user);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user ID from session - handle different possible formats
        const userId = session.user.id || session.user._id || session.user.sub;
        console.log('Extracted user ID:', userId);

        if (!userId) {
            console.error('No user ID found in session:', session.user);
            return NextResponse.json({ error: 'User ID not found in session' }, { status: 400 });
        }

        // Parse form data
        const formData = await request.formData();
        const file = formData.get('avatar');

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        console.log('File received:', {
            name: file.name,
            type: file.type,
            size: file.size
        });

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Invalid file type. Please upload an image.' }, { status: 400 });
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
        }

        // Connect to database
        await connectDB();
        const db = mongoose.connection.db;

        // Create GridFS bucket for avatars
        const bucket = new GridFSBucket(db, { bucketName: 'avatars' });

        // Delete existing avatar if it exists
        const existingFiles = await bucket.find({ 'metadata.userId': userId }).toArray();
        for (const existingFile of existingFiles) {
            await bucket.delete(existingFile._id);
            console.log('Deleted existing avatar:', existingFile._id);
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create upload stream
        const uploadStream = bucket.openUploadStream(`avatar_${userId}_${Date.now()}`, {
            metadata: {
                userId: userId,
                originalName: file.name,
                contentType: file.type,
                uploadDate: new Date()
            }
        });

        // Upload the file
        const fileId = await new Promise((resolve, reject) => {
            uploadStream.end(buffer, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(uploadStream.id);
                }
            });
        });

        console.log('File uploaded with ID:', fileId);

        // Update user with avatar reference
        const user = await User.findById(userId);
        if (!user) {
            // Clean up uploaded file
            await bucket.delete(fileId);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Store the GridFS file ID
        user.avatar = fileId.toString();
        user.updatedAt = new Date();
        await user.save();

        console.log('Avatar saved successfully');

        return NextResponse.json({
            success: true,
            message: 'Avatar uploaded successfully',
            avatarId: fileId.toString(),
            avatarUrl: `/api/user/avatar/${fileId.toString()}` // URL to retrieve the image
        });

    } catch (error) {
        console.error('Avatar upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload avatar: ' + error.message },
            { status: 500 }
        );
    }
}

// GET route to serve avatar images
export async function GET(request) {
    try {
        const url = new URL(request.url);
        const avatarId = url.pathname.split('/').pop();

        if (!avatarId) {
            return NextResponse.json({ error: 'Avatar ID required' }, { status: 400 });
        }

        await connectDB();
        const db = mongoose.connection.db;
        const bucket = new GridFSBucket(db, { bucketName: 'avatars' });

        // Find the file
        const files = await bucket.find({ _id: new mongoose.Types.ObjectId(avatarId) }).toArray();

        if (files.length === 0) {
            return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
        }

        const file = files[0];

        // Create download stream
        const downloadStream = bucket.openDownloadStream(file._id);

        // Convert stream to buffer
        const chunks = [];
        for await (const chunk of downloadStream) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // Return image with proper headers
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': file.metadata.contentType || 'image/jpeg',
                'Content-Length': buffer.length.toString(),
                'Cache-Control': 'public, max-age=31536000, immutable' // Cache for 1 year
            }
        });

    } catch (error) {
        console.error('Avatar retrieval error:', error);
        return NextResponse.json({ error: 'Failed to retrieve avatar' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id || session.user._id || session.user.sub;

        if (!userId) {
            return NextResponse.json({ error: 'User ID not found in session' }, { status: 400 });
        }

        await connectDB();
        const db = mongoose.connection.db;
        const bucket = new GridFSBucket(db, { bucketName: 'avatars' });

        // Find and delete user's avatar files
        const files = await bucket.find({ 'metadata.userId': userId }).toArray();

        for (const file of files) {
            await bucket.delete(file._id);
            console.log('Deleted avatar file:', file._id);
        }

        // Update user record
        const user = await User.findById(userId);
        if (user) {
            user.avatar = '';
            user.updatedAt = new Date();
            await user.save();
        }

        return NextResponse.json({
            success: true,
            message: 'Avatar removed successfully'
        });

    } catch (error) {
        console.error('Avatar removal error:', error);
        return NextResponse.json(
            { error: 'Failed to remove avatar: ' + error.message },
            { status: 500 }
        );
    }
}