// file: /src/lib/mongodb.js v5 - FIXED for MongoDB Atlas M0 free tier with better connection pooling and SSL error handling

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
    await NativeDialog.showError({
        title: 'DataBase Failed',
        message: 'Please define the MONGODB_URI environment variable inside .env.local'
    });
    return;
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB(retryAttempt = 0) {
    const maxRetries = 2; // Reduced retries for M0

    try {
        if (cached.conn) {
            // Check if connection is still alive
            if (cached.conn.connection.readyState === 1) {
                console.log('📊 Using existing MongoDB connection');
                return cached.conn;
            } else {
                console.log('🔄 Existing connection is not ready, reconnecting...');
                cached.conn = null;
                cached.promise = null;
            }
        }

        if (!cached.promise) {
            // OPTIMIZED for MongoDB Atlas M0 Free Tier
            const opts = {
                bufferCommands: false,

                // Connection Pool Settings - CRITICAL for M0
                maxPoolSize: 2, // Very low for M0 free tier (max 10-100 connections)
                minPoolSize: 0, // Start with 0 connections
                maxIdleTimeMS: 10000, // Close idle connections quickly
                serverSelectionTimeoutMS: 5000, // Reduced timeout for faster failure
                socketTimeoutMS: 15000, // Reduced socket timeout
                connectTimeoutMS: 5000, // Reduced connection timeout

                // Heartbeat and Monitoring
                heartbeatFrequencyMS: 30000, // Less frequent heartbeats

                // Retry Settings
                retryWrites: true,
                retryReads: false, // Disable retry reads for M0

                // Write Concern
                w: 'majority',

                // SSL/TLS Settings - FIXED for SSL errors
                ssl: true,
                tlsAllowInvalidCertificates: false,
                tlsAllowInvalidHostnames: false,

                // App identification
                appName: 'DocBearsComfortKitchen',

                // Additional M0 optimizations
                autoIndex: false, // Disable auto-indexing for performance
                autoCreate: false, // Disable auto-collection creation
            };

            console.log(`🔗 Creating new MongoDB connection (attempt ${retryAttempt + 1}/${maxRetries + 1})...`);

            cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
                console.log('✅ MongoDB connected successfully');

                // Add connection event listeners for better monitoring
                mongoose.connection.on('error', (err) => {
                    console.error('🔴 MongoDB connection error:', err);
                    // Clear cache on persistent errors
                    if (isConnectionError(err)) {
                        cached.conn = null;
                        cached.promise = null;
                    }
                });

                mongoose.connection.on('disconnected', () => {
                    console.log('🟡 MongoDB disconnected');
                    cached.conn = null;
                    cached.promise = null;
                });

                mongoose.connection.on('reconnected', () => {
                    console.log('🟢 MongoDB reconnected');
                });

                // Handle connection pool events for M0 monitoring
                mongoose.connection.on('connectionPoolCreated', () => {
                    console.log('🏊 MongoDB connection pool created');
                });

                mongoose.connection.on('connectionPoolClosed', () => {
                    console.log('🏊‍♂️ MongoDB connection pool closed');
                });

                return mongoose;
            }).catch((error) => {
                console.error('❌ MongoDB connection error:', error);
                cached.promise = null; // Reset promise on error
                throw error;
            });
        }

        try {
            cached.conn = await cached.promise;
            console.log('📊 MongoDB connection established');
        } catch (e) {
            console.error('❌ Failed to establish MongoDB connection:', e);
            cached.promise = null;

            // Check if this is an SSL/TLS error and we haven't exceeded max retries
            if (isSSLError(e) && retryAttempt < maxRetries) {
                console.log(`🔄 SSL error detected, retrying connection in ${(retryAttempt + 1) * 2} seconds...`);

                // Wait before retrying with exponential backoff
                await new Promise(resolve => setTimeout(resolve, (retryAttempt + 1) * 2000));

                return connectDB(retryAttempt + 1);
            }

            throw e;
        }

        return cached.conn;
    } catch (error) {
        console.error('❌ ConnectDB Error:', error);

        // If this is an SSL error and we have retries left, try again
        if (isSSLError(error) && retryAttempt < maxRetries) {
            console.log(`🔄 Retrying connection due to SSL error (attempt ${retryAttempt + 1}/${maxRetries})...`);

            // Clear cached connection and promise
            cached.conn = null;
            cached.promise = null;

            // Wait before retrying with longer delay for SSL issues
            await new Promise(resolve => setTimeout(resolve, (retryAttempt + 1) * 3000));

            return connectDB(retryAttempt + 1);
        }

        // For M0 connection limit errors, wait longer before throwing
        if (isConnectionLimitError(error)) {
            console.log('⏳ Connection limit reached, waiting before final error...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        throw error;
    }
}

// Helper function to identify SSL/TLS errors
function isSSLError(error) {
    const sslErrorIndicators = [
        'SSL routines',
        'tlsv1 alert',
        'ssl3_read_bytes',
        'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR',
        'SSL alert number',
        'alert internal error',
        'ssl handshake',
        'certificate verify failed'
    ];

    const errorMessage = error.message || error.toString();
    const errorName = error.constructor.name || '';

    return sslErrorIndicators.some(indicator =>
        errorMessage.toLowerCase().includes(indicator.toLowerCase()) ||
        errorName.toLowerCase().includes(indicator.toLowerCase())
    );
}

// Helper function to identify connection limit errors
function isConnectionLimitError(error) {
    const limitErrorIndicators = [
        'too many connections',
        'connection limit',
        'exceeded the maximum number',
        'connection pool',
        'ECONNRESET',
        'MongoNetworkError'
    ];

    const errorMessage = error.message || error.toString();
    return limitErrorIndicators.some(indicator =>
        errorMessage.toLowerCase().includes(indicator.toLowerCase())
    );
}

// Helper function to identify general connection errors
function isConnectionError(error) {
    return isSSLError(error) || isConnectionLimitError(error) ||
        error.name === 'MongoNetworkError' ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('ETIMEDOUT');
}

// Add connection event listeners for better debugging
mongoose.connection.on('connected', () => {
    console.log('🟢 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('🔴 Mongoose connection error:', err);

    // If it's an SSL or connection error, clear the cached connection to force retry
    if (isConnectionError(err)) {
        console.log('🔄 Connection error detected, clearing cached connection for retry');
        cached.conn = null;
        cached.promise = null;
    }
});

mongoose.connection.on('disconnected', () => {
    console.log('🟡 Mongoose disconnected from MongoDB');
    // Clear cache when disconnected
    cached.conn = null;
    cached.promise = null;
});

// Enhanced graceful shutdown for Vercel
const gracefulShutdown = async () => {
    console.log('🛑 Shutting down gracefully...');
    if (cached.conn) {
        try {
            await cached.conn.connection.close();
            console.log('✅ MongoDB connection closed successfully');
        } catch (error) {
            console.error('❌ Error closing MongoDB connection:', error);
        }
    }
    cached.conn = null;
    cached.promise = null;
};

// Handle various shutdown signals for Vercel
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('beforeExit', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    if (isConnectionError(error)) {
        cached.conn = null;
        cached.promise = null;
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    if (isConnectionError(reason)) {
        cached.conn = null;
        cached.promise = null;
    }
});

export default connectDB;

// Create a separate function with retry logic for high-traffic endpoints
export async function connectWithRetry(maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await connectDB();
        } catch (error) {
            console.error(`❌ Connection attempt ${attempt + 1} failed:`, error.message);

            if (attempt === maxRetries - 1) {
                throw error; // Last attempt failed
            }

            // Wait before retry with exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
            console.log(`⏳ Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}