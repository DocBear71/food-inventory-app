// file: /src/app/api/admin/meals/route.js v1 - Curated meals management API for admin meal entry system

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { CuratedMeal, User } from '@/lib/models';

// GET - Fetch curated meals (admin view with all statuses)
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'all';
        const limit = parseInt(searchParams.get('limit')) || 50;
        const skip = parseInt(searchParams.get('skip')) || 0;

        await connectDB();

        // Build query based on status filter
        let query = {};

        switch (status) {
            case 'pending':
                query = { status: 'pending', submissionType: 'user' };
                break;
            case 'approved':
                query = { isApproved: true, status: 'approved' };
                break;
            case 'rejected':
                query = { status: 'rejected' };
                break;
            case 'admin':
                query = { submissionType: 'admin' };
                break;
            case 'user':
                query = { submissionType: 'user' };
                break;
            default:
                // 'all' - no additional filters
                break;
        }

        // Fetch meals with pagination
        const meals = await CuratedMeal.find(query)
            .populate('createdBy', 'name email')
            .populate('submittedBy', 'name email')
            .populate('approvedBy', 'name email')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .lean();

        // Get total count for pagination
        const totalCount = await CuratedMeal.countDocuments(query);

        // Get summary statistics
        const stats = await CuratedMeal.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const summary = {
            total: totalCount,
            pending: stats.find(s => s._id === 'pending')?.count || 0,
            approved: stats.find(s => s._id === 'approved')?.count || 0,
            rejected: stats.find(s => s._id === 'rejected')?.count || 0
        };

        return NextResponse.json({
            success: true,
            meals,
            summary,
            pagination: {
                currentPage: Math.floor(skip / limit) + 1,
                totalPages: Math.ceil(totalCount / limit),
                totalCount,
                hasMore: skip + limit < totalCount
            }
        });

    } catch (error) {
        console.error('GET curated meals error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch curated meals' },
            { status: 500 }
        );
    }
}

// POST - Create new curated meal
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            name,
            description,
            components,
            tags,
            estimatedTime,
            difficulty,
            servings,
            mealType,
            season,
            cookingTips,
            nutritionTags,
            source,
            submissionType
        } = body;

        // Validation
        if (!name || !description || !components || components.length === 0) {
            return NextResponse.json(
                { error: 'Name, description, and at least one component are required' },
                { status: 400 }
            );
        }

        // Validate components
        const validCategories = ['protein', 'starch', 'vegetable', 'sauce', 'dairy', 'fruit', 'condiment'];
        for (const component of components) {
            if (!component.itemName || !component.category) {
                return NextResponse.json(
                    { error: 'Each component must have an item name and category' },
                    { status: 400 }
                );
            }
            if (!validCategories.includes(component.category)) {
                return NextResponse.json(
                    { error: `Invalid component category: ${component.category}` },
                    { status: 400 }
                );
            }
        }

        await connectDB();

        // Check for duplicate meal names
        const existingMeal = await CuratedMeal.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') }
        });

        if (existingMeal) {
            return NextResponse.json(
                { error: 'A meal with this name already exists' },
                { status: 400 }
            );
        }

        // Create meal data
        const mealData = {
            name: name.trim(),
            description: description.trim(),
            components: components.map(comp => ({
                itemName: comp.itemName.trim(),
                category: comp.category,
                required: comp.required !== false, // Default to true
                alternatives: comp.alternatives || [],
                notes: comp.notes || ''
            })),
            tags: Array.isArray(tags) ? tags.filter(tag => tag.trim()) : [],
            estimatedTime: estimatedTime || 30,
            difficulty: difficulty || 'easy',
            servings: servings || 4,
            mealType: mealType || 'dinner',
            season: season || 'any',
            cookingTips: Array.isArray(cookingTips) ? cookingTips.filter(tip => tip.trim()) : [],
            nutritionTags: Array.isArray(nutritionTags) ? nutritionTags.filter(tag => tag.trim()) : [],
            source: source || '',
            createdBy: session.user.id,
            submissionType: submissionType || 'admin'
        };

        // For user submissions, set additional fields
        if (submissionType === 'user') {
            mealData.submittedBy = session.user.id;
            mealData.status = 'pending';
            mealData.isApproved = false;
        }

        const meal = new CuratedMeal(mealData);
        await meal.save();

        // Populate user info for response
        await meal.populate('createdBy', 'name email');
        if (meal.submittedBy) {
            await meal.populate('submittedBy', 'name email');
        }

        return NextResponse.json({
            success: true,
            meal,
            message: submissionType === 'user'
                ? 'Meal submitted for approval'
                : 'Curated meal created successfully'
        });

    } catch (error) {
        console.error('POST curated meal error:', error);
        return NextResponse.json(
            { error: 'Failed to create curated meal' },
            { status: 500 }
        );
    }
}

// PUT - Update curated meal or handle approval/rejection
export async function PUT(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { mealId, action, ...updateData } = body;

        if (!mealId) {
            return NextResponse.json(
                { error: 'Meal ID is required' },
                { status: 400 }
            );
        }

        await connectDB();

        const meal = await CuratedMeal.findById(mealId);
        if (!meal) {
            return NextResponse.json(
                { error: 'Meal not found' },
                { status: 404 }
            );
        }

        let updatedMeal;

        // Handle special actions (approve/reject)
        if (action === 'approve') {
            updatedMeal = await CuratedMeal.approve(mealId, session.user.id);
        } else if (action === 'reject') {
            if (!updateData.rejectionReason) {
                return NextResponse.json(
                    { error: 'Rejection reason is required' },
                    { status: 400 }
                );
            }
            updatedMeal = await CuratedMeal.reject(mealId, updateData.rejectionReason);
        } else {
            // Regular update
            // Check if user can edit (admin or original creator)
            const canEdit = meal.createdBy.toString() === session.user.id ||
                meal.submittedBy?.toString() === session.user.id;

            if (!canEdit) {
                return NextResponse.json(
                    { error: 'You do not have permission to edit this meal' },
                    { status: 403 }
                );
            }

            // Validate components if provided
            if (updateData.components) {
                const validCategories = ['protein', 'starch', 'vegetable', 'sauce', 'dairy', 'fruit', 'condiment'];
                for (const component of updateData.components) {
                    if (!component.itemName || !component.category) {
                        return NextResponse.json(
                            { error: 'Each component must have an item name and category' },
                            { status: 400 }
                        );
                    }
                    if (!validCategories.includes(component.category)) {
                        return NextResponse.json(
                            { error: `Invalid component category: ${component.category}` },
                            { status: 400 }
                        );
                    }
                }
            }

            updatedMeal = await CuratedMeal.findByIdAndUpdate(
                mealId,
                { ...updateData, updatedAt: new Date() },
                { new: true }
            );
        }

        // Populate user info
        await updatedMeal.populate('createdBy', 'name email');
        if (updatedMeal.submittedBy) {
            await updatedMeal.populate('submittedBy', 'name email');
        }
        if (updatedMeal.approvedBy) {
            await updatedMeal.populate('approvedBy', 'name email');
        }

        return NextResponse.json({
            success: true,
            meal: updatedMeal,
            message: action === 'approve' ? 'Meal approved successfully' :
                action === 'reject' ? 'Meal rejected' :
                    'Meal updated successfully'
        });

    } catch (error) {
        console.error('PUT curated meal error:', error);
        return NextResponse.json(
            { error: 'Failed to update curated meal' },
            { status: 500 }
        );
    }
}

// DELETE - Remove curated meal
export async function DELETE(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const mealId = searchParams.get('mealId');

        if (!mealId) {
            return NextResponse.json(
                { error: 'Meal ID is required' },
                { status: 400 }
            );
        }

        await connectDB();

        const meal = await CuratedMeal.findById(mealId);
        if (!meal) {
            return NextResponse.json(
                { error: 'Meal not found' },
                { status: 404 }
            );
        }

        // Check if user can delete (admin or original creator)
        const canDelete = meal.createdBy.toString() === session.user.id ||
            meal.submittedBy?.toString() === session.user.id;

        if (!canDelete) {
            return NextResponse.json(
                { error: 'You do not have permission to delete this meal' },
                { status: 403 }
            );
        }

        await CuratedMeal.findByIdAndDelete(mealId);

        return NextResponse.json({
            success: true,
            message: 'Curated meal deleted successfully'
        });

    } catch (error) {
        console.error('DELETE curated meal error:', error);
        return NextResponse.json(
            { error: 'Failed to delete curated meal' },
            { status: 500 }
        );
    }
}