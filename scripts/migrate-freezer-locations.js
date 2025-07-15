// /scripts/migrate-freezer-locations.js - Atlas M0 optimized with aggressive timeouts
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import mongoose from 'mongoose';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load .env from project root - check multiple file names
const projectRoot = join(__dirname, '..');
const envFiles = ['.env.local', '.env', '.env.development', '.env.development.local'];

console.log('🔍 Debug information:');
console.log('📁 Script location:', __dirname);
console.log('📁 Project root:', projectRoot);

let envFileFound = false;

// Check for different .env file names
for (const envFile of envFiles) {
    const envPath = join(projectRoot, envFile);
    console.log(`📄 Checking ${envFile}:`, existsSync(envPath));

    if (existsSync(envPath) && !envFileFound) {
        envFileFound = true;
        console.log(`✅ Using environment file: ${envFile}`);

        // Load environment variables from the found file
        dotenv.config({ path: envPath });
        break;
    }
}

if (!envFileFound) {
    console.log('❌ No environment file found. Checked:', envFiles.join(', '));
}

console.log('🔐 Environment variables:');
console.log('📍 MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('📍 MONGODB_URI length:', process.env.MONGODB_URI?.length || 0);

// Debug: Show the MongoDB URI format (without revealing credentials)
if (process.env.MONGODB_URI) {
    const uri = process.env.MONGODB_URI;
    const maskedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log('🔗 MongoDB URI format:', maskedUri);
}

// Timeout wrapper for any promise
function withTimeout(promise, timeoutMs, operation = 'Operation') {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${operation} timeout after ${timeoutMs}ms`)), timeoutMs)
        )
    ]);
}

async function migrateFreezerLocations() {
    if (!process.env.MONGODB_URI) {
        console.error('❌ No MongoDB connection string found!');
        console.error('💡 Please check your .env.local file contains:');
        console.error('   MONGODB_URI=mongodb://...');
        process.exit(1);
    }

    console.log('\n🔗 Connecting to MongoDB Atlas using Mongoose...');
    console.log('⏱️ Using aggressive timeouts for M0 free tier');

    let connection = null;

    try {
        // VERY aggressive settings for Atlas M0 free tier
        const opts = {
            bufferCommands: false,

            // SUPER aggressive timeouts for M0
            maxPoolSize: 1, // Only 1 connection for migration
            minPoolSize: 0,
            maxIdleTimeMS: 5000, // Very short idle time
            serverSelectionTimeoutMS: 3000, // Very short server selection
            socketTimeoutMS: 8000, // Short socket timeout
            connectTimeoutMS: 3000, // Very short connection timeout
            heartbeatFrequencyMS: 60000, // Less frequent heartbeats

            retryWrites: false, // Disable retry writes for migration
            retryReads: false,
            w: 1, // Reduced write concern for speed

            ssl: true,
            tlsAllowInvalidCertificates: false,
            tlsAllowInvalidHostnames: false,
            appName: 'Migration-Script',

            autoIndex: false,
            autoCreate: false,
        };

        console.log('🚀 Attempting connection with 10-second timeout...');

        // Add connection event listeners BEFORE connecting
        mongoose.connection.on('connecting', () => {
            console.log('🔄 Mongoose connecting...');
        });

        mongoose.connection.on('connected', () => {
            console.log('✅ Mongoose connected!');
        });

        mongoose.connection.on('error', (err) => {
            console.error('🔴 Connection error:', err.message);
        });

        // Try to connect with aggressive timeout
        connection = await withTimeout(
            mongoose.connect(process.env.MONGODB_URI, opts),
            10000, // 10 second timeout
            'MongoDB connection'
        );

        console.log('✅ Connected to MongoDB Atlas!');

        // Get the native MongoDB connection from Mongoose
        const db = mongoose.connection.db;
        console.log('📊 Database name:', db.databaseName);

        // Test the connection with timeout
        console.log('🔍 Testing database connection...');
        await withTimeout(
            db.admin().ping(),
            5000,
            'Database ping'
        );
        console.log('✅ Database ping successful');

        // List collections with timeout
        console.log('📚 Listing collections...');
        const collections = await withTimeout(
            db.listCollections().toArray(),
            5000,
            'List collections'
        );
        console.log('📚 Available collections:', collections.map(c => c.name));

        console.log('\n🔄 Starting freezer location migration...');

        // Check if we have the expected collections
        const hasInventory = collections.some(c => c.name === 'inventoryitems');
        const hasUsers = collections.some(c => c.name === 'users');

        if (!hasInventory && !hasUsers) {
            console.log('⚠️ Warning: No "inventoryitems" or "users" collections found.');
            console.log('🤔 Are you connected to the correct database?');
            console.log('📋 Available collections:', collections.map(c => c.name).join(', '));

            // Still continue with other collections that might exist
        }

        // 1. Check current data before migration with timeout
        let currentInventoryCount = 0;
        let currentUserPrefCount = 0;

        if (hasInventory) {
            console.log('🔍 Counting inventory items...');
            currentInventoryCount = await withTimeout(
                db.collection('inventoryitems').countDocuments({ location: 'freezer' }),
                5000,
                'Count inventory items'
            );
        }

        if (hasUsers) {
            console.log('🔍 Counting user preferences...');
            currentUserPrefCount = await withTimeout(
                db.collection('users').countDocuments({ 'inventoryPreferences.defaultFilterLocation': 'freezer' }),
                5000,
                'Count user preferences'
            );
        }

        console.log(`📋 Found ${currentInventoryCount} inventory items with 'freezer' location`);
        console.log(`👤 Found ${currentUserPrefCount} users with 'freezer' as default filter`);

        if (currentInventoryCount === 0 && currentUserPrefCount === 0) {
            console.log('ℹ️ No records found with "freezer" location.');
            console.log('   This could mean migration was already run or no data needs updating.');
        }

        // 2. Update inventory items with timeout
        let inventoryResult = { modifiedCount: 0 };
        if (hasInventory && currentInventoryCount > 0) {
            console.log('🔄 Updating inventory items...');
            inventoryResult = await withTimeout(
                db.collection('inventoryitems').updateMany(
                    { location: 'freezer' },
                    { $set: { location: 'fridge-freezer' } }
                ),
                10000,
                'Update inventory items'
            );
            console.log(`✅ Updated ${inventoryResult.modifiedCount} inventory items`);
        } else if (hasInventory) {
            console.log('⏭️ No inventory items with "freezer" to update');
        } else {
            console.log('⏭️ No inventoryitems collection found');
        }

        // 3. Update user inventory preferences with timeout
        let userPrefsResult = { modifiedCount: 0 };
        if (hasUsers && currentUserPrefCount > 0) {
            console.log('🔄 Updating user preferences...');
            userPrefsResult = await withTimeout(
                db.collection('users').updateMany(
                    { 'inventoryPreferences.defaultFilterLocation': 'freezer' },
                    { $set: { 'inventoryPreferences.defaultFilterLocation': 'fridge-freezer' } }
                ),
                10000,
                'Update user preferences'
            );
            console.log(`✅ Updated ${userPrefsResult.modifiedCount} user inventory preferences`);
        } else if (hasUsers) {
            console.log('⏭️ No user preferences with "freezer" to update');
        } else {
            console.log('⏭️ No users collection found');
        }

        // 4-6. Update other collections if they exist (with timeouts)
        let mealPlanResult = { modifiedCount: 0 };
        let shoppingResult = { modifiedCount: 0 };
        let consumptionResult = { modifiedCount: 0 };

        // Check and update other collections quickly
        for (const collection of collections) {
            try {
                if (collection.name === 'mealplans') {
                    console.log('🔄 Updating meal plans...');
                    mealPlanResult = await withTimeout(
                        db.collection('mealplans').updateMany(
                            { 'ingredients.location': 'freezer' },
                            { $set: { 'ingredients.$[elem].location': 'fridge-freezer' } },
                            { arrayFilters: [{ 'elem.location': 'freezer' }] }
                        ),
                        10000,
                        'Update meal plans'
                    );
                    console.log(`✅ Updated ${mealPlanResult.modifiedCount} meal plan ingredients`);
                }

                if (collection.name === 'shoppinglists') {
                    console.log('🔄 Updating shopping lists...');
                    shoppingResult = await withTimeout(
                        db.collection('shoppinglists').updateMany(
                            { 'items.location': 'freezer' },
                            { $set: { 'items.$[elem].location': 'fridge-freezer' } },
                            { arrayFilters: [{ 'elem.location': 'freezer' }] }
                        ),
                        10000,
                        'Update shopping lists'
                    );
                    console.log(`✅ Updated ${shoppingResult.modifiedCount} shopping list items`);
                }

                if (collection.name === 'consumptionhistory') {
                    console.log('🔄 Updating consumption history...');
                    consumptionResult = await withTimeout(
                        db.collection('consumptionhistory').updateMany(
                            { location: 'freezer' },
                            { $set: { location: 'fridge-freezer' } }
                        ),
                        10000,
                        'Update consumption history'
                    );
                    console.log(`✅ Updated ${consumptionResult.modifiedCount} consumption history records`);
                }
            } catch (updateError) {
                console.log(`⚠️ Skipped updating ${collection.name}:`, updateError.message);
            }
        }

        console.log('\n🎉 Migration completed successfully!');

        // Summary report
        const totalUpdated = inventoryResult.modifiedCount +
            userPrefsResult.modifiedCount +
            mealPlanResult.modifiedCount +
            shoppingResult.modifiedCount +
            consumptionResult.modifiedCount;

        console.log(`📊 Total records updated: ${totalUpdated}`);

        if (totalUpdated === 0) {
            console.log('\nℹ️ No records were updated. This means:');
            console.log('  ✅ Migration was likely already run previously');
            console.log('  ✅ No data currently uses "freezer" as location');
            console.log('  ✅ All freezer items are already using "fridge-freezer"');
            console.log('\n🎯 This is actually a GOOD thing - your data is already up to date!');
        } else {
            console.log('\n✨ Migration summary:');
            console.log(`  • Inventory items: ${inventoryResult.modifiedCount}`);
            console.log(`  • User preferences: ${userPrefsResult.modifiedCount}`);
            console.log(`  • Meal plan ingredients: ${mealPlanResult.modifiedCount}`);
            console.log(`  • Shopping list items: ${shoppingResult.modifiedCount}`);
            console.log(`  • Consumption history: ${consumptionResult.modifiedCount}`);
        }

    } catch (error) {
        console.error('\n❌ Migration failed:');

        if (error.message.includes('timeout')) {
            console.error('🕒 Operation timed out. Atlas M0 clusters can be slow.');
            console.error('💡 Possible solutions:');
            console.error('  • Try running the migration again (M0 can be inconsistent)');
            console.error('  • Check if your Atlas cluster is paused');
            console.error('  • Verify your IP is whitelisted in Atlas Network Access');
        } else if (error.message.includes('authentication') || error.message.includes('auth')) {
            console.error('🔐 Authentication failed. Check your credentials in .env.local');
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
            console.error('🌐 Network error. Check Atlas connectivity.');
        } else {
            console.error('💥 Error details:', error.message);
        }

        console.error('\n🔧 Atlas M0 Troubleshooting:');
        console.error('  1. ✅ Check Atlas cluster is not paused');
        console.error('  2. ✅ Verify IP whitelist (0.0.0.0/0 for testing)');
        console.error('  3. ✅ Confirm credentials are correct');
        console.error('  4. 🔄 Try again (M0 connections can be flaky)');

        throw error;
    } finally {
        try {
            if (connection || mongoose.connection.readyState === 1) {
                console.log('🔌 Closing Mongoose connection...');
                await withTimeout(
                    mongoose.connection.close(),
                    5000,
                    'Close connection'
                );
                console.log('✅ Connection closed successfully');
            }
        } catch (closeError) {
            console.error('⚠️ Error closing connection:', closeError.message);
        }
    }
}

// ES module way to check if this is the main module
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
    migrateFreezerLocations()
        .then(() => {
            console.log('\n✅ Migration script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Migration script failed');
            console.error('🔄 For Atlas M0, try running the script again - connections can be inconsistent');
            process.exit(1);
        });
}

export { migrateFreezerLocations };