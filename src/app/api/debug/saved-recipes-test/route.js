// file: /src/app/api/debug/saved-recipes-test/route.js - Debug endpoint to test saved recipes API

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function GET(request) {
    try {
        console.log('🧪 DEBUG: Testing saved recipes endpoint...');

        const session = await auth();
        console.log('✅ DEBUG: Session check:', !!session?.user?.id);

        if (!session?.user?.id) {
            return NextResponse.json({
                success: false,
                step: 'session',
                error: 'No session found'
            });
        }

        console.log('🔍 DEBUG: Connecting to database...');
        await connectDB();
        console.log('✅ DEBUG: Database connected');

        console.log('🔍 DEBUG: Finding user...');
        const user = await User.findById(session.user.id);
        console.log('✅ DEBUG: User found:', !!user);

        if (!user) {
            return NextResponse.json({
                success: false,
                step: 'user_fetch',
                error: 'User not found'
            });
        }

        console.log('🔍 DEBUG: Checking user structure...');
        const userStructure = {
            hasId: !!user._id,
            hasEmail: !!user.email,
            hasSavedRecipes: user.hasOwnProperty('savedRecipes'),
            savedRecipesType: typeof user.savedRecipes,
            savedRecipesIsArray: Array.isArray(user.savedRecipes),
            savedRecipesLength: Array.isArray(user.savedRecipes) ? user.savedRecipes.length : 'not_array',
            hasLegalAcceptance: user.hasOwnProperty('legalAcceptance'),
            legalAcceptanceComplete: !!(user.legalAcceptance?.termsAccepted && user.legalAcceptance?.privacyAccepted && user.legalAcceptance?.acceptanceDate),
            hasLegalVersion: user.hasOwnProperty('legalVersion'),
            hasUsageTracking: user.hasOwnProperty('usageTracking')
        };

        console.log('📊 DEBUG: User structure:', userStructure);

        // Try to initialize missing fields
        let needsSave = false;

        if (!user.savedRecipes) {
            console.log('📝 DEBUG: Initializing savedRecipes...');
            user.savedRecipes = [];
            needsSave = true;
        }

        if (!user.legalAcceptance?.acceptanceDate) {
            console.log('📝 DEBUG: Fixing legal acceptance...');
            if (!user.legalAcceptance) {
                user.legalAcceptance = {};
            }
            user.legalAcceptance.termsAccepted = user.legalAcceptance.termsAccepted ?? false;
            user.legalAcceptance.privacyAccepted = user.legalAcceptance.privacyAccepted ?? false;
            user.legalAcceptance.acceptanceDate = user.legalAcceptance.acceptanceDate || user.createdAt || new Date();
            needsSave = true;
        }

        if (!user.legalVersion) {
            console.log('📝 DEBUG: Initializing legal version...');
            user.legalVersion = {
                termsVersion: '1.0',
                privacyVersion: '1.0'
            };
            needsSave = true;
        }

        if (!user.usageTracking) {
            console.log('📝 DEBUG: Initializing usage tracking...');
            const now = new Date();
            user.usageTracking = {
                currentMonth: now.getMonth(),
                currentYear: now.getFullYear(),
                monthlyUPCScans: 0,
                monthlyReceiptScans: 0,
                totalInventoryItems: 0,
                totalPersonalRecipes: 0,
                totalSavedRecipes: user.savedRecipes.length,
                totalPublicRecipes: 0,
                totalRecipeCollections: 0,
                savedRecipes: user.savedRecipes.length,
                lastUpdated: now
            };
            needsSave = true;
        }

        if (needsSave) {
            console.log('💾 DEBUG: Saving user with fixes...');
            try {
                await user.save();
                console.log('✅ DEBUG: User saved successfully');
            } catch (saveError) {
                console.error('❌ DEBUG: Save error:', saveError);
                return NextResponse.json({
                    success: false,
                    step: 'user_save',
                    error: saveError.message,
                    validationErrors: saveError.errors || null
                });
            }
        }

        // Test basic population
        console.log('🔍 DEBUG: Testing population...');
        try {
            const populatedUser = await User.findById(session.user.id)
                .populate({
                    path: 'savedRecipes.recipeId',
                    select: 'title'
                });

            console.log('✅ DEBUG: Population successful');
            console.log('📊 DEBUG: Populated savedRecipes count:', populatedUser.savedRecipes.length);

            // Check for null recipes
            const validSavedRecipes = populatedUser.savedRecipes.filter(saved => saved && saved.recipeId);
            console.log('📊 DEBUG: Valid savedRecipes count:', validSavedRecipes.length);

            return NextResponse.json({
                success: true,
                message: 'Debug test completed successfully',
                results: {
                    userStructure,
                    needsSave,
                    savedRecipesCount: validSavedRecipes.length,
                    totalSavedRecipes: populatedUser.savedRecipes.length,
                    sampleData: validSavedRecipes.slice(0, 3).map(saved => ({
                        id: saved._id,
                        recipeId: saved.recipeId?._id || saved.recipeId,
                        recipeTitle: saved.recipeId?.title || 'Unknown',
                        savedAt: saved.savedAt
                    }))
                }
            });

        } catch (populateError) {
            console.error('❌ DEBUG: Population error:', populateError);
            return NextResponse.json({
                success: false,
                step: 'population',
                error: populateError.message,
                results: {
                    userStructure,
                    needsSave,
                    savedRecipesCount: user.savedRecipes.length
                }
            });
        }

    } catch (error) {
        console.error('❌ DEBUG: Outer error:', error);
        return NextResponse.json({
            success: false,
            step: 'unknown',
            error: error.message,
            stack: error.stack?.split('\n').slice(0, 5)
        });
    }
}