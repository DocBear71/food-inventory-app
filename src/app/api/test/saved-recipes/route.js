// file: /src/app/api/test/saved-recipes/route.js v1 - Debug endpoint for saved recipes

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function GET(request) {
    try {
        console.log('🧪 Testing saved recipes functionality...');

        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({
                success: false,
                error: 'No session found',
                step: 'session_check'
            }, { status: 401 });
        }

        console.log('✅ Session found for user:', session.user.id);

        await connectDB();
        console.log('✅ Database connected');

        // Step 1: Basic user fetch
        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({
                success: false,
                error: 'User not found',
                step: 'user_fetch',
                userId: session.user.id
            }, { status: 404 });
        }

        console.log('✅ User found');

        // Step 2: Check user structure
        const userStructure = {
            hasId: !!user._id,
            hasEmail: !!user.email,
            hasName: !!user.name,
            hasSavedRecipes: user.hasOwnProperty('savedRecipes'),
            savedRecipesType: typeof user.savedRecipes,
            savedRecipesLength: Array.isArray(user.savedRecipes) ? user.savedRecipes.length : 'not_array',
            hasLegalAcceptance: user.hasOwnProperty('legalAcceptance'),
            legalAcceptanceStructure: user.legalAcceptance ? {
                hasTermsAccepted: user.legalAcceptance.hasOwnProperty('termsAccepted'),
                hasPrivacyAccepted: user.legalAcceptance.hasOwnProperty('privacyAccepted'),
                hasAcceptanceDate: user.legalAcceptance.hasOwnProperty('acceptanceDate'),
                acceptanceDate: user.legalAcceptance.acceptanceDate
            } : null,
            hasLegalVersion: user.hasOwnProperty('legalVersion')
        };

        console.log('📊 User structure:', userStructure);

        // Step 3: Initialize savedRecipes if needed
        if (!user.savedRecipes) {
            console.log('📝 Initializing savedRecipes array...');
            user.savedRecipes = [];
        }

        // Step 4: Check if we can save the user (validation test)
        let saveTest = { canSave: false, error: null };
        try {
            // Test saving without actually saving
            await user.validate();
            saveTest.canSave = true;
            console.log('✅ User validation passed');
        } catch (validationError) {
            saveTest.error = {
                name: validationError.name,
                message: validationError.message,
                errors: validationError.errors
            };
            console.log('❌ User validation failed:', validationError.message);
        }

        return NextResponse.json({
            success: true,
            message: 'Saved recipes debug test completed',
            results: {
                session: {
                    userId: session.user.id,
                    userEmail: session.user.email
                },
                userStructure,
                saveTest,
                currentSavedRecipesCount: Array.isArray(user.savedRecipes) ? user.savedRecipes.length : 0,
                sampleSavedRecipes: Array.isArray(user.savedRecipes) ? user.savedRecipes.slice(0, 3) : []
            }
        });

    } catch (error) {
        console.error('❌ Saved recipes test failed:', error);

        return NextResponse.json({
            success: false,
            error: error.message,
            errorType: error.constructor.name,
            stack: error.stack?.split('\n').slice(0, 5),
            step: 'unknown_error'
        }, { status: 500 });
    }
}