// file: /src/app/api/recipes/[id]/reviews/[reviewId]/vote/route.js v2

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { Recipe } from '@/lib/models';

// POST - Vote on review helpfulness
export async function POST(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        const { id: recipeId, reviewId } = params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        if (!recipeId || !reviewId) {
            return NextResponse.json(
                { error: 'Recipe ID and Review ID are required' },
                { status: 400 }
            );
        }

        const { vote } = await request.json();

        if (!vote || !['helpful', 'unhelpful'].includes(vote)) {
            return NextResponse.json(
                { error: 'Vote must be either "helpful" or "unhelpful"' },
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

        // Find the review
        const review = recipe.reviews.id(reviewId);
        if (!review) {
            return NextResponse.json(
                { error: 'Review not found' },
                { status: 404 }
            );
        }

        // Users cannot vote on their own reviews
        if (review.userId.toString() === session.user.id) {
            return NextResponse.json(
                { error: 'You cannot vote on your own review' },
                { status: 400 }
            );
        }

        // Check if user has already voted
        const existingVoteIndex = review.votedBy.findIndex(
            v => v.userId.toString() === session.user.id
        );

        if (existingVoteIndex !== -1) {
            const existingVote = review.votedBy[existingVoteIndex].vote;

            // If same vote, remove it (toggle off)
            if (existingVote === vote) {
                review.votedBy.splice(existingVoteIndex, 1);
                if (vote === 'helpful') {
                    review.helpfulVotes = Math.max(0, review.helpfulVotes - 1);
                } else {
                    review.unhelpfulVotes = Math.max(0, review.unhelpfulVotes - 1);
                }
            } else {
                // Change vote
                review.votedBy[existingVoteIndex].vote = vote;
                if (vote === 'helpful') {
                    review.helpfulVotes++;
                    review.unhelpfulVotes = Math.max(0, review.unhelpfulVotes - 1);
                } else {
                    review.unhelpfulVotes++;
                    review.helpfulVotes = Math.max(0, review.helpfulVotes - 1);
                }
            }
        } else {
            // New vote
            review.votedBy.push({
                userId: session.user.id,
                vote
            });
            if (vote === 'helpful') {
                review.helpfulVotes++;
            } else {
                review.unhelpfulVotes++;
            }
        }

        await recipe.save();

        // Get updated vote status for this user
        const userVote = review.votedBy.find(v => v.userId.toString() === session.user.id);

        return NextResponse.json({
            success: true,
            helpfulVotes: review.helpfulVotes,
            unhelpfulVotes: review.unhelpfulVotes,
            userVote: userVote ? userVote.vote : null,
            message: 'Vote recorded successfully'
        });

    } catch (error) {
        console.error('POST review vote error:', error);
        return NextResponse.json(
            { error: 'Failed to record vote' },
            { status: 500 }
        );
    }
}