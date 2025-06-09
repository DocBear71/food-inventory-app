// file: /src/app/api/user/profile/route.js

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        await connectDB();

        const user = await User.findById(session.user.id).select('-password');

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profile: user.profile || {},
                notificationSettings: user.notificationSettings || {},
                mealPlanningPreferences: user.mealPlanningPreferences || {},
                nutritionGoals: user.nutritionGoals || {},
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
        });

    } catch (error) {
        console.error('Profile fetch error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const {
            name,
            profile,
            notificationSettings,
            mealPlanningPreferences,
            nutritionGoals
        } = await request.json();

        // Validation
        if (!name || name.trim().length < 1) {
            return NextResponse.json(
                { error: 'Name is required' },
                { status: 400 }
            );
        }

        if (name.length > 100) {
            return NextResponse.json(
                { error: 'Name must be less than 100 characters' },
                { status: 400 }
            );
        }

        // Validate profile data if provided
        if (profile) {
            if (profile.bio && profile.bio.length > 200) {
                return NextResponse.json(
                    { error: 'Bio must be less than 200 characters' },
                    { status: 400 }
                );
            }

            if (profile.cookingLevel && !['beginner', 'intermediate', 'advanced'].includes(profile.cookingLevel)) {
                return NextResponse.json(
                    { error: 'Invalid cooking level' },
                    { status: 400 }
                );
            }
        }

        // Validate nutrition goals if provided
        if (nutritionGoals) {
            const numericFields = ['dailyCalories', 'protein', 'fat', 'carbs', 'fiber', 'sodium'];
            for (const field of numericFields) {
                if (nutritionGoals[field] !== undefined && (
                    typeof nutritionGoals[field] !== 'number' ||
                    nutritionGoals[field] < 0 ||
                    nutritionGoals[field] > 10000
                )) {
                    return NextResponse.json(
                        { error: `Invalid ${field} value` },
                        { status: 400 }
                    );
                }
            }
        }

        await connectDB();

        const updateData = {
            name: name.trim(),
            updatedAt: new Date()
        };

        // Add optional fields if provided
        if (profile) {
            updateData.profile = profile;
        }

        if (notificationSettings) {
            updateData.notificationSettings = notificationSettings;
        }

        if (mealPlanningPreferences) {
            updateData.mealPlanningPreferences = mealPlanningPreferences;
        }

        if (nutritionGoals) {
            updateData.nutritionGoals = nutritionGoals;
        }

        const updatedUser = await User.findByIdAndUpdate(
            session.user.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                profile: updatedUser.profile || {},
                notificationSettings: updatedUser.notificationSettings || {},
                mealPlanningPreferences: updatedUser.mealPlanningPreferences || {},
                nutritionGoals: updatedUser.nutritionGoals || {},
                updatedAt: updatedUser.updatedAt
            }
        });

    } catch (error) {
        console.error('Profile update error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}