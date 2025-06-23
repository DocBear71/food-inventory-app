// file: /src/lib/mongodb.js v3 - Enhanced with SSL error handling and connection retry

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
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
    const maxRetries = 3;

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
            const opts = {
                bufferCommands: false,
                maxPoolSize: 10, // Maintain up to 10 socket connections
                serverSelectionTimeoutMS: 10000, // Keep trying to send operations for 10 seconds
                socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
                bufferMaxEntries: 0, // Disable mongoose buffering
                useNewUrlParser: true,
                useUnifiedTopology: true,

                // Enhanced SSL/TLS configuration for better reliability
                ssl: true,
                sslValidate: true,

                // Connection retry configuration
                retryWrites: true,
                retryReads: true,

                // Additional options for stability
                heartbeatFrequencyMS: 10000, // Check connection every 10 seconds
                connectTimeoutMS: 30000, // Give up initial connection after 30 seconds

                // App name for debugging in MongoDB logs
                appName: 'DocBearsComfortKitchen',
            };

            console.log(`🔗 Creating new MongoDB connection (attempt ${retryAttempt + 1}/${maxRetries + 1})...`);

            cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
                console.log('✅ MongoDB connected successfully');

                // Add connection event listeners for better monitoring
                mongoose.connection.on('error', (err) => {
                    console.error('🔴 MongoDB connection error:', err);
                    // Don't reset cached connection here as it might be temporary
                });

                mongoose.connection.on('disconnected', () => {
                    console.log('🟡 MongoDB disconnected');
                });

                mongoose.connection.on('reconnected', () => {
                    console.log('🟢 MongoDB reconnected');
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

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, (retryAttempt + 1) * 1000));

            return connectDB(retryAttempt + 1);
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
        'ENOTFOUND',
        'ECONNRESET',
        'ETIMEDOUT'
    ];

    const errorMessage = error.message || error.toString();
    return sslErrorIndicators.some(indicator =>
        errorMessage.toLowerCase().includes(indicator.toLowerCase())
    );
}

// Add connection event listeners for better debugging
mongoose.connection.on('connected', () => {
    console.log('🟢 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('🔴 Mongoose connection error:', err);

    // If it's an SSL error, clear the cached connection to force retry
    if (isSSLError(err)) {
        console.log('🔄 SSL error detected, clearing cached connection for retry');
        cached.conn = null;
        cached.promise = null;
    }
});

mongoose.connection.on('disconnected', () => {
    console.log('🟡 Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down gracefully...');
    if (cached.conn) {
        await cached.conn.connection.close();
    }
    process.exit(0);
});

export default connectDB;