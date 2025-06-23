// file: /src/app/api/test/mongodb/route.js v1 - Test MongoDB connection

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET(request) {
    try {
        console.log('🧪 Testing MongoDB connection...');
        console.log('📝 Connection string format check...');

        // Check if MONGODB_URI is available
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable not found');
        }

        // Validate connection string format (without logging sensitive info)
        if (!mongoUri.startsWith('mongodb+srv://')) {
            throw new Error('Invalid connection string format - must start with mongodb+srv://');
        }

        console.log('✅ Connection string format is valid');

        const startTime = Date.now();
        await connectDB();
        const connectionTime = Date.now() - startTime;

        // Test a simple query
        const queryStartTime = Date.now();
        const dbStats = await mongoose.connection.db.admin().ping();
        const queryTime = Date.now() - queryStartTime;

        // Get some basic connection info
        const connectionInfo = {
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            dbName: mongoose.connection.name,
            // Check if we're actually connected
            isConnected: mongoose.connection.readyState === 1
        };

        console.log('✅ MongoDB connection test successful');
        console.log('📊 Connection info:', connectionInfo);

        return NextResponse.json({
            success: true,
            message: 'MongoDB connection successful',
            connectionTime: `${connectionTime}ms`,
            queryTime: `${queryTime}ms`,
            connectionInfo,
            ping: dbStats,
            mongooseVersion: mongoose.version
        });

    } catch (error) {
        console.error('❌ MongoDB connection test failed:', error);
        console.error('📋 Error details:', {
            name: error.constructor.name,
            message: error.message,
            stack: error.stack?.split('\n').slice(0, 5) // First 5 lines of stack
        });

        return NextResponse.json({
            success: false,
            error: error.message,
            errorType: error.constructor.name,
            isSSLError: isSSLError(error),
            connectionState: mongoose.connection.readyState,
            mongooseVersion: mongoose.version,
            suggestion: isSSLError(error) ?
                'This appears to be an SSL/TLS connection issue. Check your MongoDB Atlas network settings and connection string.' :
                'Check your MongoDB connection string and network connectivity.',
            troubleshooting: {
                step1: 'Verify MONGODB_URI is set in Vercel environment variables',
                step2: 'Check MongoDB Atlas Network Access (IP whitelist)',
                step3: 'Verify database user permissions',
                step4: 'Check if cluster is running and accessible'
            }
        }, { status: 500 });
    }
}

// Helper function to identify SSL/TLS errors
function isSSLError(error) {
    const sslErrorIndicators = [
        'SSL routines',
        'tlsv1 alert',
        'ssl3_read_bytes',
        'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR',
        'ENOTFOUND',
        'ECONNRESET',
        'ETIMEDOUT'
    ];

    const errorMessage = error.message || error.toString();
    return sslErrorIndicators.some(indicator =>
        errorMessage.toLowerCase().includes(indicator.toLowerCase())
    );
}