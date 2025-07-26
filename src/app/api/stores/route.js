// file: src/app/api/stores/route.js v3 - FIXED: User-specific store filtering

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Store } from '@/lib/models.js';

// GET - Fetch stores (FIXED: Now filters by user)
export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { searchParams } = new URL(request.url);
        const zipCode = searchParams.get('zipCode');
        const chain = searchParams.get('chain');
        const search = searchParams.get('search');

        // 🔧 FIXED: Build query with user filter FIRST
        let query = {
            isActive: true,
            addedBy: session.user.id  // ✅ CRITICAL FIX: Filter by current user
        };

        if (zipCode) {
            query.zipCode = zipCode;
        }

        if (chain) {
            query.chain = new RegExp(chain, 'i');
        }

        if (search) {
            query.$or = [
                { name: new RegExp(search, 'i') },
                { chain: new RegExp(search, 'i') },
                { city: new RegExp(search, 'i') }
            ];
        }

        console.log('🔍 Stores GET query:', query); // Debug log

        const stores = await Store.find(query)
            .sort({ name: 1 })
            .limit(100) // Limit results to prevent huge responses
            .lean();

        console.log(`✅ Found ${stores.length} stores for user ${session.user.id}`); // Debug log

        return NextResponse.json({
            success: true,
            stores: stores.map(store => ({
                _id: store._id,
                name: store.name,
                chain: store.chain || '',
                address: store.address || '',
                city: store.city || '',
                state: store.state || '',
                zipCode: store.zipCode || '',
                isActive: store.isActive,
                createdAt: store.createdAt
            })),
            total: stores.length
        });

    } catch (error) {
        console.error('GET stores error:', error);
        return NextResponse.json({
            error: 'Failed to fetch stores',
            details: error.message
        }, { status: 500 });
    }
}

// POST - Add new store
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const body = await request.json();
        console.log('🔍 POST stores - received body:', body);

        // ✅ FIXED: Extract from the correct structure
        const { newStore } = body;

        if (!newStore) {
            return NextResponse.json({
                error: 'Store data is required'
            }, { status: 400 });
        }

        const { name, chain, address, city, state, zipCode, storeId } = newStore;

        console.log('🔍 POST stores - extracted data:', { name, chain, address, city, state, zipCode });

        // Validation
        if (!name || name.trim().length === 0) {
            return NextResponse.json({
                error: 'Store name is required'
            }, { status: 400 });
        }

        if (name.trim().length > 100) {
            return NextResponse.json({
                error: 'Store name must be less than 100 characters'
            }, { status: 400 });
        }

        // 🔧 FIXED: Check for duplicates ONLY within user's stores
        const existingStore = await Store.findOne({
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
            city: city ? { $regex: new RegExp(`^${city.trim()}$`, 'i') } : { $exists: false },
            addedBy: session.user.id  // ✅ CRITICAL: Only check current user's stores
        });

        if (existingStore) {
            return NextResponse.json({
                error: 'A store with this name already exists in your list'
            }, { status: 409 });
        }

        // Create new store
        const newStoreDoc = new Store({
            name: name.trim(),
            chain: chain?.trim() || '',
            address: address?.trim() || '',
            city: city?.trim() || '',
            state: state?.trim() || '',
            zipCode: zipCode?.trim() || '',
            storeId: storeId?.trim() || '',
            addedBy: session.user.id,  // ✅ Always set to current user
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const savedStore = await newStoreDoc.save();

        console.log(`✅ Created store for user ${session.user.id}:`, savedStore.name);

        return NextResponse.json({
            success: true,
            message: 'Store added successfully',
            store: {
                _id: savedStore._id,
                name: savedStore.name,
                chain: savedStore.chain,
                address: savedStore.address,
                city: savedStore.city,
                state: savedStore.state,
                zipCode: savedStore.zipCode,
                isActive: savedStore.isActive,
                createdAt: savedStore.createdAt
            }
        });

    } catch (error) {
        console.error('POST store error:', error);

        // Handle mongoose validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return NextResponse.json({
                error: 'Validation failed',
                details: errors.join(', ')
            }, { status: 400 });
        }

        return NextResponse.json({
            error: 'Failed to add store',
            details: error.message
        }, { status: 500 });
    }
}

// PUT - Update store
export async function PUT(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const body = await request.json();
        const { storeId, name, chain, address, city, state, zipCode, isActive } = body;

        if (!storeId) {
            return NextResponse.json({
                error: 'Store ID is required'
            }, { status: 400 });
        }

        // 🔧 FIXED: Find store and verify ownership in one query
        const store = await Store.findOne({
            _id: storeId,
            addedBy: session.user.id  // ✅ CRITICAL: Ensure user owns this store
        });

        if (!store) {
            return NextResponse.json({
                error: 'Store not found or you do not have permission to edit it'
            }, { status: 404 });
        }

        // Update store
        const updateData = {
            updatedAt: new Date()
        };

        if (name !== undefined) updateData.name = name.trim();
        if (chain !== undefined) updateData.chain = chain.trim();
        if (address !== undefined) updateData.address = address.trim();
        if (city !== undefined) updateData.city = city.trim();
        if (state !== undefined) updateData.state = state.trim();
        if (zipCode !== undefined) updateData.zipCode = zipCode.trim();
        if (isActive !== undefined) updateData.isActive = Boolean(isActive);

        const updatedStore = await Store.findByIdAndUpdate(
            storeId,
            updateData,
            { new: true, runValidators: true }
        );

        console.log(`✅ Updated store for user ${session.user.id}:`, updatedStore.name);

        return NextResponse.json({
            success: true,
            message: 'Store updated successfully',
            store: {
                _id: updatedStore._id,
                name: updatedStore.name,
                chain: updatedStore.chain,
                address: updatedStore.address,
                city: updatedStore.city,
                state: updatedStore.state,
                zipCode: updatedStore.zipCode,
                isActive: updatedStore.isActive,
                updatedAt: updatedStore.updatedAt
            }
        });

    } catch (error) {
        console.error('PUT store error:', error);
        return NextResponse.json({
            error: 'Failed to update store',
            details: error.message
        }, { status: 500 });
    }
}

// DELETE - Delete store
export async function DELETE(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { searchParams } = new URL(request.url);
        const storeId = searchParams.get('storeId');

        if (!storeId) {
            return NextResponse.json({
                error: 'Store ID is required'
            }, { status: 400 });
        }

        // 🔧 FIXED: Find store and verify ownership in one query
        const store = await Store.findOne({
            _id: storeId,
            addedBy: session.user.id  // ✅ CRITICAL: Ensure user owns this store
        });

        if (!store) {
            return NextResponse.json({
                error: 'Store not found or you do not have permission to delete it'
            }, { status: 404 });
        }

        // Soft delete (mark as inactive) instead of hard delete
        // This preserves price history references
        await Store.findByIdAndUpdate(storeId, {
            isActive: false,
            updatedAt: new Date()
        });

        console.log(`✅ Deleted store for user ${session.user.id}:`, store.name);

        return NextResponse.json({
            success: true,
            message: 'Store deleted successfully'
        });

    } catch (error) {
        console.error('DELETE store error:', error);
        return NextResponse.json({
            error: 'Failed to delete store',
            details: error.message
        }, { status: 500 });
    }
}