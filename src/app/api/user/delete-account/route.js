// file: /src/app/api/user/delete-account/route.js

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import {
    User,
    UserInventory,
    Recipe,
    DailyNutritionLog,
    MealPlan,
    MealPlanTemplate,
    Contact,
    EmailLog,
    SavedShoppingList,
    ShoppingListTemplate,
    MealPrepSuggestion,
    MealPrepTemplate
} from '@/lib/models';
import { sendAccountDeletionConfirmationEmail } from '@/lib/email';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const { password, confirmDeletion } = await request.json();

        // Validation
        if (!password) {
            return NextResponse.json(
                { error: 'Password is required to delete your account' },
                { status: 400 }
            );
        }

        if (!confirmDeletion) {
            return NextResponse.json(
                { error: 'You must confirm account deletion' },
                { status: 400 }
            );
        }

        await connectDB();

        // Find user and verify password
        const user = await User.findById(session.user.id);

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return NextResponse.json(
                { error: 'Incorrect password' },
                { status: 400 }
            );
        }

        // Start comprehensive data deletion
        const userId = session.user.id;
        const userEmail = user.email;
        const userName = user.name;

        console.log(`Starting account deletion process for user: ${userEmail} (${userId})`);

        // Create deletion summary for audit trail
        const deletionSummary = {
            userId,
            userEmail,
            userName,
            deletionDate: new Date(),
            deletedData: {}
        };

        try {
            // 1. Delete User Inventory
            const inventoryResult = await UserInventory.deleteMany({ userId });
            deletionSummary.deletedData.inventory = inventoryResult.deletedCount;

            // 2. Delete User's Recipes (but keep public ones - just remove ownership)
            const userRecipes = await Recipe.find({ createdBy: userId });
            let recipesDeleted = 0;
            let recipesAnonymized = 0;

            for (const recipe of userRecipes) {
                if (recipe.isPublic) {
                    // Anonymize public recipes instead of deleting
                    await Recipe.findByIdAndUpdate(recipe._id, {
                        createdBy: null,
                        $unset: {
                            'reviews': 1 // Remove user's reviews
                        }
                    });
                    recipesAnonymized++;
                } else {
                    // Delete private recipes
                    await Recipe.findByIdAndDelete(recipe._id);
                    recipesDeleted++;
                }
            }
            deletionSummary.deletedData.recipes = { deleted: recipesDeleted, anonymized: recipesAnonymized };

            // 3. Remove user's reviews from all recipes
            const reviewRemovalResult = await Recipe.updateMany(
                { 'reviews.userId': userId },
                {
                    $pull: { reviews: { userId } },
                    $inc: { 'ratingStats.totalRatings': -1 }
                }
            );
            deletionSummary.deletedData.reviewsRemoved = reviewRemovalResult.modifiedCount;

            // 4. Delete Nutrition Logs
            const nutritionResult = await DailyNutritionLog.deleteMany({ userId });
            deletionSummary.deletedData.nutritionLogs = nutritionResult.deletedCount;

            // 5. Delete Meal Plans
            const mealPlanResult = await MealPlan.deleteMany({ userId });
            deletionSummary.deletedData.mealPlans = mealPlanResult.deletedCount;

            // 6. Delete Meal Plan Templates
            const mealPlanTemplateResult = await MealPlanTemplate.deleteMany({ userId });
            deletionSummary.deletedData.mealPlanTemplates = mealPlanTemplateResult.deletedCount;

            // 7. Delete Contacts
            const contactsResult = await Contact.deleteMany({ userId });
            deletionSummary.deletedData.contacts = contactsResult.deletedCount;

            // 8. Delete Email Logs
            const emailLogResult = await EmailLog.deleteMany({ userId });
            deletionSummary.deletedData.emailLogs = emailLogResult.deletedCount;

            // 9. Delete Shopping Lists
            const shoppingListResult = await SavedShoppingList.deleteMany({ userId });
            deletionSummary.deletedData.shoppingLists = shoppingListResult.deletedCount;

            // 10. Delete Shopping List Templates
            const shoppingTemplateResult = await ShoppingListTemplate.deleteMany({ userId });
            deletionSummary.deletedData.shoppingListTemplates = shoppingTemplateResult.deletedCount;

            // 11. Delete Meal Prep Suggestions
            const mealPrepSuggestionResult = await MealPrepSuggestion.deleteMany({ userId });
            deletionSummary.deletedData.mealPrepSuggestions = mealPrepSuggestionResult.deletedCount;

            // 12. Delete Meal Prep Templates
            const mealPrepTemplateResult = await MealPrepTemplate.deleteMany({ userId });
            deletionSummary.deletedData.mealPrepTemplates = mealPrepTemplateResult.deletedCount;

            // 13. Remove user from any shared shopping lists or meal plans
            await SavedShoppingList.updateMany(
                { 'sharedWith.email': userEmail },
                { $pull: { sharedWith: { email: userEmail } } }
            );

            // 14. Clean up any orphaned references in other collections
            // This is a safeguard for any missed references

            // 15. Finally, delete the user account
            await User.findByIdAndDelete(userId);

            // Log deletion summary for audit trail
            console.log('Account deletion completed:', JSON.stringify(deletionSummary, null, 2));

            // Send confirmation email (if email service is available)
            try {
                await sendAccountDeletionConfirmationEmail(userEmail, userName);
                console.log(`Account deletion confirmation email sent to: ${userEmail}`);
            } catch (emailError) {
                console.error('Failed to send account deletion confirmation email:', emailError);
                // Don't fail the deletion if email fails
            }

            return NextResponse.json({
                success: true,
                message: 'Your account and all associated data have been permanently deleted.',
                summary: {
                    totalDataPointsDeleted: Object.values(deletionSummary.deletedData).reduce((total, count) => {
                        if (typeof count === 'object') {
                            return total + count.deleted + count.anonymized;
                        }
                        return total + count;
                    }, 0),
                    deletionDate: deletionSummary.deletionDate
                }
            });

        } catch (deletionError) {
            console.error('Error during data deletion:', deletionError);

            // If deletion fails partway through, log what was completed
            console.error('Partial deletion summary:', deletionSummary);

            return NextResponse.json(
                {
                    error: 'Account deletion failed. Please contact support.',
                    details: 'Some data may have been partially deleted. Please contact support for assistance.'
                },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Account deletion error:', error);
        return NextResponse.json(
            { error: 'Internal server error during account deletion' },
            { status: 500 }
        );
    }
}

// Verify deletion request (optional pre-check)
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

        // Get data summary for user to see what will be deleted
        const userId = session.user.id;

        const dataSummary = {
            inventory: await UserInventory.countDocuments({ userId }),
            recipes: await Recipe.countDocuments({ createdBy: userId }),
            nutritionLogs: await DailyNutritionLog.countDocuments({ userId }),
            mealPlans: await MealPlan.countDocuments({ userId }),
            mealPlanTemplates: await MealPlanTemplate.countDocuments({ userId }),
            contacts: await Contact.countDocuments({ userId }),
            emailLogs: await EmailLog.countDocuments({ userId }),
            shoppingLists: await SavedShoppingList.countDocuments({ userId }),
            shoppingListTemplates: await ShoppingListTemplate.countDocuments({ userId }),
            mealPrepSuggestions: await MealPrepSuggestion.countDocuments({ userId }),
            mealPrepTemplates: await MealPrepTemplate.countDocuments({ userId })
        };

        const totalDataPoints = Object.values(dataSummary).reduce((total, count) => total + count, 0);

        return NextResponse.json({
            success: true,
            dataSummary,
            totalDataPoints,
            message: totalDataPoints > 0
                ? `This action will permanently delete ${totalDataPoints} data points across all features.`
                : 'Your account has minimal data to delete.'
        });

    } catch (error) {
        console.error('Deletion preview error:', error);
        return NextResponse.json(
            { error: 'Failed to retrieve account data summary' },
            { status: 500 }
        );
    }
}