// file: /src/lib/mongodb.js v2 - Enhanced error handling and connection management

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

async function connectDB() {
    try {
        if (cached.conn) {
            console.log('📊 Using existing MongoDB connection');
            return cached.conn;
        }

        if (!cached.promise) {
            const opts = {
                bufferCommands: false,
                maxPoolSize: 10, // Maintain up to 10 socket connections
                serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
                socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
                bufferMaxEntries: 0, // Disable mongoose buffering
                useNewUrlParser: true,
                useUnifiedTopology: true,
            };

            console.log('🔗 Creating new MongoDB connection...');
            cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
                console.log('✅ MongoDB connected successfully');
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
            throw e;
        }

        return cached.conn;
    } catch (error) {
        console.error('❌ ConnectDB Error:', error);
        throw error;
    }
}

// Add connection event listeners for better debugging
mongoose.connection.on('connected', () => {
    console.log('🟢 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('🔴 Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('🟡 Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down gracefully...');
    await mongoose.connection.close();
    process.exit(0);
});

export default connectDB;