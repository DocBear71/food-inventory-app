// file: /src/app/api/recipes/[id]/reviews/route.js v3 - FIXED

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Recipe, User } from '@/lib/models';

// GET - Fetch reviews for a recipe
export async function GET(request, { params }) {
    try {
        console.log('=== GET /api/recipes/[id]/reviews START ===');

        const session = await getServerSession(authOptions);
        const { id: recipeId } = await params;

        console.log('Recipe ID:', recipeId);
        console.log('Session:', session);

        if (!recipeId) {
            console.log('No recipe ID provided');
            return NextResponse.json(
                { error: 'Recipe ID is required' },
                { status: 400 }
            );
        }

        await connectDB();
        console.log('Database connected');

        const recipe = await Recipe.findById(recipeId)
            .select('reviews ratingStats title isPublic createdBy')
            .lean();

        console.log('Recipe found:', !!recipe);

        if (!recipe) {
            console.log('Recipe not found');
            return NextResponse.json(
                { error: 'Recipe not found' },
                { status: 404 }
            );
        }

        // Check if user can view this recipe
        if (!recipe.isPublic && (!session?.user?.id || recipe.createdBy.toString() !== session.user.id)) {
            console.log('Access denied - recipe not public and user not owner');
            return NextResponse.json(
                { error: 'Not authorized to view this recipe' },
                { status: 403 }
            );
        }

        // Initialize empty reviews if none exist
        const reviews = recipe.reviews || [];

        // Initialize empty rating stats if none exist
        const ratingStats = recipe.ratingStats || {
            averageRating: 0,
            totalRatings: 0,
            ratingDistribution: { star5: 0, star4: 0, star3: 0, star2: 0, star1: 0 }
        };

        // Sort reviews by helpfulness and recency
        const sortedReviews = reviews
            .sort((a, b) => {
                // First by helpfulness (helpful votes - unhelpful votes)
                const aHelpfulness = (a.helpfulVotes || 0) - (a.unhelpfulVotes || 0);
                const bHelpfulness = (b.helpfulVotes || 0) - (b.unhelpfulVotes || 0);
                if (bHelpfulness !== aHelpfulness) {
                    return bHelpfulness - aHelpfulness;
                }
                // Then by recency
                return new Date(b.createdAt) - new Date(a.createdAt);
            })
            .map(review => ({
                ...review,
                // Don't expose voting details to non-logged-in users
                userVote: session?.user?.id ?
                    review.votedBy?.find(v => v.userId.toString() === session.user.id)?.vote :
                    null
            }));

        console.log('Reviews processed:', sortedReviews.length);

        return NextResponse.json({
            success: true,
            reviews: sortedReviews,
            ratingStats: ratingStats,
            userCanReview: session?.user?.id &&
                session.user.id !== recipe.createdBy.toString() &&
                !reviews.some(r => r.userId && r.userId.toString() === session.user.id)
        });

    } catch (error) {
        console.error('=== GET recipe reviews error ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('================================');

        return NextResponse.json(
            { error: 'Failed to fetch reviews' },
            { status: 500 }
        );
    }
}

// POST - Add a new review
export async function POST(request, { params }) {
    try {
        console.log('=== POST /api/recipes/[id]/reviews START ===');

        const session = await getServerSession(authOptions);
        const recipeId = params.id;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        if (!recipeId) {
            return NextResponse.json(
                { error: 'Recipe ID is required' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { rating, comment, aspects, modifications, wouldMakeAgain } = body;

        console.log('Review data:', { rating, comment, aspects, modifications, wouldMakeAgain });

        // Validate rating
        if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
            return NextResponse.json(
                { error: 'Rating must be an integer between 1 and 5' },
                { status: 400 }
            );
        }

        await connectDB();

        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return NextResponse.json(
                { error: 'Recipe not found' },
                { status: 404 }
            );
        }

        // Check if recipe is public or user owns it
        if (!recipe.isPublic && recipe.createdBy.toString() !== session.user.id) {
            return NextResponse.json(
                { error: 'Not authorized to review this recipe' },
                { status: 403 }
            );
        }

        // Users cannot review their own recipes
        if (recipe.createdBy.toString() === session.user.id) {
            return NextResponse.json(
                { error: 'You cannot review your own recipe' },
                { status: 400 }
            );
        }

        // Initialize reviews array if it doesn't exist
        if (!recipe.reviews) {
            recipe.reviews = [];
        }

        // Check if user has already reviewed this recipe
        const existingReview = recipe.reviews.find(
            review => review.userId && review.userId.toString() === session.user.id
        );

        if (existingReview) {
            return NextResponse.json(
                { error: 'You have already reviewed this recipe' },
                { status: 400 }
            );
        }

        // Get user information
        const user = await User.findById(session.user.id).select('name profile.cookingLevel');
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Create new review
        const newReview = {
            userId: session.user.id,
            userName: user.name,
            rating,
            comment: comment?.trim() || '',
            aspects: aspects || {},
            modifications: modifications?.trim() || '',
            wouldMakeAgain: wouldMakeAgain || null,
            helpfulVotes: 0,
            unhelpfulVotes: 0,
            votedBy: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Add review to recipe
        recipe.reviews.push(newReview);

        // Recalculate rating statistics
        const allRatings = recipe.reviews.map(r => r.rating);
        const totalRatings = allRatings.length;
        const averageRating = allRatings.reduce((sum, r) => sum + r, 0) / totalRatings;

        // Calculate rating distribution
        const distribution = { star5: 0, star4: 0, star3: 0, star2: 0, star1: 0 };
        allRatings.forEach(rating => {
            distribution[`star${rating}`]++;
        });

        recipe.ratingStats = {
            averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
            totalRatings,
            ratingDistribution: distribution
        };

        recipe.updatedAt = new Date();
        await recipe.save();

        console.log('Review added successfully');

        return NextResponse.json({
            success: true,
            review: newReview,
            ratingStats: recipe.ratingStats,
            message: 'Review added successfully'
        });

    } catch (error) {
        console.error('=== POST recipe review error ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('================================');

        return NextResponse.json(
            { error: 'Failed to add review' },
            { status: 500 }
        );
    }
}

// PUT - Update an existing review
export async function PUT(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        const recipeId = params.id;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const body = await request.json();
        const { reviewId, rating, comment, aspects, modifications, wouldMakeAgain } = body;

        if (!reviewId) {
            return NextResponse.json(
                { error: 'Review ID is required' },
                { status: 400 }
            );
        }

        // Validate rating if provided
        if (rating && (rating < 1 || rating > 5 || !Number.isInteger(rating))) {
            return NextResponse.json(
                { error: 'Rating must be an integer between 1 and 5' },
                { status: 400 }
            );
        }

        await connectDB();

        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return NextResponse.json(
                { error: 'Recipe not found' },
                { status: 404 }
            );
        }

        // Initialize reviews array if it doesn't exist
        if (!recipe.reviews) {
            recipe.reviews = [];
        }

        // Find the review
        const reviewIndex = recipe.reviews.findIndex(
            review => review._id.toString() === reviewId &&
                review.userId.toString() === session.user.id
        );

        if (reviewIndex === -1) {
            return NextResponse.json(
                { error: 'Review not found or you do not have permission to edit it' },
                { status: 404 }
            );
        }

        // Update review
        if (rating) recipe.reviews[reviewIndex].rating = rating;
        if (comment !== undefined) recipe.reviews[reviewIndex].comment = comment.trim();
        if (aspects) recipe.reviews[reviewIndex].aspects = aspects;
        if (modifications !== undefined) recipe.reviews[reviewIndex].modifications = modifications.trim();
        if (wouldMakeAgain !== undefined) recipe.reviews[reviewIndex].wouldMakeAgain = wouldMakeAgain;
        recipe.reviews[reviewIndex].updatedAt = new Date();

        // Recalculate rating statistics if rating changed
        if (rating) {
            const allRatings = recipe.reviews.map(r => r.rating);
            const totalRatings = allRatings.length;
            const averageRating = allRatings.reduce((sum, r) => sum + r, 0) / totalRatings;

            const distribution = { star5: 0, star4: 0, star3: 0, star2: 0, star1: 0 };
            allRatings.forEach(rating => {
                distribution[`star${rating}`]++;
            });

            recipe.ratingStats = {
                averageRating: Math.round(averageRating * 10) / 10,
                totalRatings,
                ratingDistribution: distribution
            };
        }

        recipe.updatedAt = new Date();
        await recipe.save();

        return NextResponse.json({
            success: true,
            review: recipe.reviews[reviewIndex],
            ratingStats: recipe.ratingStats,
            message: 'Review updated successfully'
        });

    } catch (error) {
        console.error('PUT recipe review error:', error);
        return NextResponse.json(
            { error: 'Failed to update review' },
            { status: 500 }
        );
    }
}

// DELETE - Remove a review
export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        const recipeId = params.id;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const reviewId = searchParams.get('reviewId');

        if (!reviewId) {
            return NextResponse.json(
                { error: 'Review ID is required' },
                { status: 400 }
            );
        }

        await connectDB();

        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return NextResponse.json(
                { error: 'Recipe not found' },
                { status: 404 }
            );
        }

        // Initialize reviews array if it doesn't exist
        if (!recipe.reviews) {
            recipe.reviews = [];
        }

        // Find and remove the review
        const initialLength = recipe.reviews.length;
        recipe.reviews = recipe.reviews.filter(
            review => !(review._id.toString() === reviewId &&
                review.userId.toString() === session.user.id)
        );

        if (recipe.reviews.length === initialLength) {
            return NextResponse.json(
                { error: 'Review not found or you do not have permission to delete it' },
                { status: 404 }
            );
        }

        // Recalculate rating statistics
        if (recipe.reviews.length > 0) {
            const allRatings = recipe.reviews.map(r => r.rating);
            const totalRatings = allRatings.length;
            const averageRating = allRatings.reduce((sum, r) => sum + r, 0) / totalRatings;

            const distribution = { star5: 0, star4: 0, star3: 0, star2: 0, star1: 0 };
            allRatings.forEach(rating => {
                distribution[`star${rating}`]++;
            });

            recipe.ratingStats = {
                averageRating: Math.round(averageRating * 10) / 10,
                totalRatings,
                ratingDistribution: distribution
            };
        } else {
            // Reset to default if no reviews left
            recipe.ratingStats = {
                averageRating: 0,
                totalRatings: 0,
                ratingDistribution: { star5: 0, star4: 0, star3: 0, star2: 0, star1: 0 }
            };
        }

        recipe.updatedAt = new Date();
        await recipe.save();

        return NextResponse.json({
            success: true,
            ratingStats: recipe.ratingStats,
            message: 'Review deleted successfully'
        });

    } catch (error) {
        console.error('DELETE recipe review error:', error);
        return NextResponse.json(
            { error: 'Failed to delete review' },
            { status: 500 }
        );
    }
}

// Helper function to calculate user's average rating given
async function calculateUserAverageRating(userId) {
    try {
        const recipes = await Recipe.find(
            { 'reviews.userId': userId },
            { 'reviews.$': 1 }
        );

        const userRatings = recipes
            .map(recipe => recipe.reviews.find(review => review.userId.toString() === userId))
            .filter(review => review)
            .map(review => review.rating);

        if (userRatings.length === 0) return 0;

        const average = userRatings.reduce((sum, rating) => sum + rating, 0) / userRatings.length;
        return Math.round(average * 10) / 10;
    } catch (error) {
        console.error('Error calculating user average rating:', error);
        return 0;
    }
}