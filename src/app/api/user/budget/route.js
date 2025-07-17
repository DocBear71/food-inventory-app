// file: /src/app/api/user/budget/route.js v1 - User budget management

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const budget = user.budget || {
            weeklyMealBudget: 0,
            monthlyGroceryBudget: 0,
            strictMode: false,
            notifications: {
                weeklyWarning: true,
                overspendAlert: true,
                savingsOpportunities: true
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };

        return NextResponse.json({
            success: true,
            budget
        });

    } catch (error) {
        console.error('Error fetching user budget:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const {
            weeklyMealBudget,
            monthlyGroceryBudget,
            strictMode,
            notifications
        } = await request.json();

        // Validate budget amounts
        if (weeklyMealBudget !== undefined && (weeklyMealBudget < 0 || weeklyMealBudget > 10000)) {
            return NextResponse.json({
                error: 'Weekly meal budget must be between $0 and $10,000'
            }, { status: 400 });
        }

        if (monthlyGroceryBudget !== undefined && (monthlyGroceryBudget < 0 || monthlyGroceryBudget > 50000)) {
            return NextResponse.json({
                error: 'Monthly grocery budget must be between $0 and $50,000'
            }, { status: 400 });
        }

        await connectDB();

        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Initialize budget if it doesn't exist
        if (!user.budget) {
            user.budget = {
                weeklyMealBudget: 0,
                monthlyGroceryBudget: 0,
                strictMode: false,
                notifications: {
                    weeklyWarning: true,
                    overspendAlert: true,
                    savingsOpportunities: true
                },
                createdAt: new Date()
            };
        }

        // Update budget fields
        if (weeklyMealBudget !== undefined) {
            user.budget.weeklyMealBudget = parseFloat(weeklyMealBudget);
        }

        if (monthlyGroceryBudget !== undefined) {
            user.budget.monthlyGroceryBudget = parseFloat(monthlyGroceryBudget);
        }

        if (strictMode !== undefined) {
            user.budget.strictMode = Boolean(strictMode);
        }

        if (notifications) {
            user.budget.notifications = {
                ...user.budget.notifications,
                ...notifications
            };
        }

        user.budget.updatedAt = new Date();

        await user.save();

        return NextResponse.json({
            success: true,
            message: 'Budget updated successfully',
            budget: user.budget
        });

    } catch (error) {
        console.error('Error updating user budget:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const {
            weeklyMealBudget = 100,
            monthlyGroceryBudget = 400,
            strictMode = false,
            notifications = {
                weeklyWarning: true,
                overspendAlert: true,
                savingsOpportunities: true
            }
        } = await request.json();

        // Validate inputs
        if (weeklyMealBudget < 0 || weeklyMealBudget > 10000) {
            return NextResponse.json({
                error: 'Weekly meal budget must be between $0 and $10,000'
            }, { status: 400 });
        }

        if (monthlyGroceryBudget < 0 || monthlyGroceryBudget > 50000) {
            return NextResponse.json({
                error: 'Monthly grocery budget must be between $0 and $50,000'
            }, { status: 400 });
        }

        await connectDB();

        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Create new budget
        const newBudget = {
            weeklyMealBudget: parseFloat(weeklyMealBudget),
            monthlyGroceryBudget: parseFloat(monthlyGroceryBudget),
            strictMode: Boolean(strictMode),
            notifications: {
                weeklyWarning: notifications.weeklyWarning !== false,
                overspendAlert: notifications.overspendAlert !== false,
                savingsOpportunities: notifications.savingsOpportunities !== false
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };

        user.budget = newBudget;
        await user.save();

        return NextResponse.json({
            success: true,
            message: 'Budget created successfully',
            budget: newBudget
        });

    } catch (error) {
        console.error('Error creating user budget:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// DELETE endpoint to reset budget
export async function DELETE(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Reset budget to default values
        user.budget = {
            weeklyMealBudget: 0,
            monthlyGroceryBudget: 0,
            strictMode: false,
            notifications: {
                weeklyWarning: true,
                overspendAlert: true,
                savingsOpportunities: true
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await user.save();

        return NextResponse.json({
            success: true,
            message: 'Budget reset successfully',
            budget: user.budget
        });

    } catch (error) {
        console.error('Error resetting user budget:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}