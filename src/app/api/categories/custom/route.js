// file: /src/app/api/categories/custom/route.js v1 - API for managing custom grocery categories

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';
import { auth } from '@/lib/auth.js';
import { User } from '@/lib/models';
import connectDB from '@/lib/mongodb';

// GET - Retrieve user's custom categories
export async function GET(request) {
    try {
        const session = await getEnhancedSession(auth);
        if (!session?.user?.id) {
            return NextResponse.json({
                success: false,
                error: 'Authentication required'
            }, { status: 401 });
        }

        await connectDB();

        const user = await User.findById(session.user.id).select('customCategories');
        if (!user) {
            return NextResponse.json({
                success: false,
                error: 'User not found'
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            customCategories: user.customCategories || {}
        });

    } catch (error) {
        console.error('Error fetching custom categories:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch custom categories'
        }, { status: 500 });
    }
}

// POST - Save user's custom categories
export async function POST(request) {
    try {
        const session = await getEnhancedSession(auth);
        if (!session?.user?.id) {
            return NextResponse.json({
                success: false,
                error: 'Authentication required'
            }, { status: 401 });
        }

        const { customCategories } = await request.json();

        if (!customCategories || typeof customCategories !== 'object') {
            return NextResponse.json({
                success: false,
                error: 'Invalid custom categories data'
            }, { status: 400 });
        }

        // Validate custom categories structure
        for (const [name, category] of Object.entries(customCategories)) {
            if (!category.name || !category.icon || !category.custom) {
                return NextResponse.json({
                    success: false,
                    error: `Invalid category structure for "${name}"`
                }, { status: 400 });
            }

            // Prevent XSS and limit lengths
            if (name.length > 50 || category.name.length > 50 || category.icon.length > 10) {
                return NextResponse.json({
                    success: false,
                    error: 'Category name or icon too long'
                }, { status: 400 });
            }
        }

        await connectMongoDB();

        const user = await User.findByIdAndUpdate(
            session.user.id,
            {
                customCategories: customCategories,
                updatedAt: new Date()
            },
            { new: true }
        ).select('customCategories');

        if (!user) {
            return NextResponse.json({
                success: false,
                error: 'User not found'
            }, { status: 404 });
        }

        console.log(`✅ Updated custom categories for user ${session.user.email}: ${Object.keys(customCategories).length} categories`);

        return NextResponse.json({
            success: true,
            customCategories: user.customCategories,
            message: 'Custom categories saved successfully'
        });

    } catch (error) {
        console.error('Error saving custom categories:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to save custom categories'
        }, { status: 500 });
    }
}

// DELETE - Remove a specific custom category
export async function DELETE(request) {
    try {
        const session = await getEnhancedSession(auth);
        if (!session?.user?.id) {
            return NextResponse.json({
                success: false,
                error: 'Authentication required'
            }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const categoryName = searchParams.get('name');

        if (!categoryName) {
            return NextResponse.json({
                success: false,
                error: 'Category name is required'
            }, { status: 400 });
        }

        await connectDB();

        const user = await User.findById(session.user.id).select('customCategories');
        if (!user) {
            return NextResponse.json({
                success: false,
                error: 'User not found'
            }, { status: 404 });
        }

        const customCategories = user.customCategories || {};

        if (!customCategories[categoryName]) {
            return NextResponse.json({
                success: false,
                error: 'Custom category not found'
            }, { status: 404 });
        }

        // Remove the category
        delete customCategories[categoryName];

        // Update user
        user.customCategories = customCategories;
        user.updatedAt = new Date();
        await user.save();

        console.log(`🗑️ Removed custom category "${categoryName}" for user ${session.user.email}`);

        return NextResponse.json({
            success: true,
            customCategories: user.customCategories,
            message: `Custom category "${categoryName}" removed successfully`
        });

    } catch (error) {
        console.error('Error removing custom category:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to remove custom category'
        }, { status: 500 });
    }
}