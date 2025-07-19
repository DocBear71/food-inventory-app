// file: /src/lib/api-helpers.js - Simple API wrapper for better error handling

import { auth } from '@/lib/auth';

import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

// Simple wrapper for API routes that need authentication and user lookup
export async function withAuth(handler) {
    return async (request) => {
        try {
            // Get the session
            const session = await auth();

            if (!session?.user?.id) {
                return new Response(
                    JSON.stringify({ error: 'Authentication required' }),
                    { status: 401, headers: { 'Content-Type': 'application/json' } }
                );
            }

            // Connect to database and get user
            await connectDB();
            const user = await User.findById(session.user.id);

            if (!user) {
                return new Response(
                    JSON.stringify({ error: 'User not found' }),
                    { status: 404, headers: { 'Content-Type': 'application/json' } }
                );
            }

            // Call the actual handler with user and session
            return await handler(request, { user, session });

        } catch (error) {
            console.error('API Error:', error);
            return new Response(
                JSON.stringify({
                    error: 'Internal server error',
                    details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
                }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }
    };
}

// Helper to safely increment UPC scans
export async function safelyTrackUPCScan(user) {
    try {
        const now = new Date();

        // Initialize or reset usage tracking
        if (!user.usageTracking ||
            user.usageTracking.currentMonth !== now.getMonth() ||
            user.usageTracking.currentYear !== now.getFullYear()) {

            user.usageTracking = {
                currentMonth: now.getMonth(),
                currentYear: now.getFullYear(),
                monthlyUPCScans: 0,
                monthlyReceiptScans: user.usageTracking?.monthlyReceiptScans || 0,
                totalInventoryItems: user.usageTracking?.totalInventoryItems || 0,
                totalPersonalRecipes: user.usageTracking?.totalPersonalRecipes || 0,
                totalSavedRecipes: user.usageTracking?.totalSavedRecipes || 0,
                totalPublicRecipes: user.usageTracking?.totalPublicRecipes || 0,
                totalRecipeCollections: user.usageTracking?.totalRecipeCollections || 0,
                lastUpdated: now
            };
        }

        // Increment scan count
        user.usageTracking.monthlyUPCScans = (user.usageTracking.monthlyUPCScans || 0) + 1;
        user.usageTracking.lastUpdated = now;

        // Save the user
        await user.save();

        console.log(`✅ UPC scan tracked for ${user.email}: ${user.usageTracking.monthlyUPCScans} scans this month`);

        return {
            success: true,
            currentScans: user.usageTracking.monthlyUPCScans
        };

    } catch (error) {
        console.error('❌ Error tracking UPC scan:', error);
        return {
            success: false,
            error: error.message,
            currentScans: user.usageTracking?.monthlyUPCScans || 0
        };
    }
}

// Helper to check subscription limits safely
export function checkUPCLimit(user, tier) {
    try {
        const currentScans = user.usageTracking?.monthlyUPCScans || 0;

        // Free tier: 10 scans per month
        if (tier === 'free') {
            return {
                allowed: currentScans < 10,
                currentCount: currentScans,
                limit: 10,
                remaining: Math.max(0, 10 - currentScans)
            };
        }

        // Paid tiers: unlimited
        return {
            allowed: true,
            currentCount: currentScans,
            limit: 'unlimited',
            remaining: 'unlimited'
        };

    } catch (error) {
        console.error('❌ Error checking UPC limit:', error);
        return {
            allowed: false,
            error: error.message,
            currentCount: 0,
            limit: 0,
            remaining: 0
        };
    }
}