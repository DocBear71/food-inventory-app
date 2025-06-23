// file: /src/app/api/test/mongodb/route.js v1 - Test MongoDB connection

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET(request) {
    try {
        console.log('🧪 Testing MongoDB connection...');

        const startTime = Date.now();
        await connectDB();
        const connectionTime = Date.now() - startTime;

        // Test a simple query
        const queryStartTime = Date.now();
        const dbStats = await mongoose.connection.db.admin().ping();
        const queryTime = Date.now() - queryStartTime;

        console.log('✅ MongoDB connection test successful');

        return NextResponse.json({
            success: true,
            message: 'MongoDB connection successful',
            connectionTime: `${connectionTime}ms`,
            queryTime: `${queryTime}ms`,
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            dbName: mongoose.connection.name,
            ping: dbStats
        });

    } catch (error) {
        console.error('❌ MongoDB connection test failed:', error);

        return NextResponse.json({
            success: false,
            error: error.message,
            errorType: error.constructor.name,
            isSSLError: isSSLError(error),
            connectionState: mongoose.connection.readyState,
            suggestion: isSSLError(error) ?
                'This appears to be an SSL/TLS connection issue. Check your MongoDB Atlas network settings and connection string.' :
                'Check your MongoDB connection string and network connectivity.'
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