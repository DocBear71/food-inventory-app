// file: /src/components/reviews/RecipeReviewsSection.js v4

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { RatingStats, AddReviewForm } from './RecipeRating';
import ReviewDisplay from './ReviewDisplay';

export default function RecipeReviewsSection({ recipeId, recipeOwnerId }) {
    const { data: session } = useSession();
    const [reviews, setReviews] = useState([]);
    const [ratingStats, setRatingStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [userCanReview, setUserCanReview] = useState(false);
    const [sortBy, setSortBy] = useState('helpful'); // helpful, newest, oldest
    const [editingReview, setEditingReview] = useState(null);

    useEffect(() => {
        fetchReviews();
    }, [recipeId]);

    const fetchReviews = async () => {
        try {
            const response = await fetch(`/api/recipes/${recipeId}/reviews`);
            const data = await response.json();

            if (data.success) {
                setReviews(data.reviews || []);
                setRatingStats(data.ratingStats);
                setUserCanReview(data.userCanReview || false);
            } else {
                console.error('Failed to fetch reviews:', data.error);
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReviewAdded = (newReview, updatedRatingStats) => {
        setReviews(prev => [newReview, ...prev]);
        setRatingStats(updatedRatingStats);
        setShowAddForm(false);
        setUserCanReview(false); // User can no longer review after adding one
    };

    const handleReviewUpdated = async (review) => {
        // For now, just refresh - could implement inline editing later
        setEditingReview(review);
        setShowAddForm(true);
    };

    const handleReviewDeleted = async (review) => {
        if (!confirm('Are you sure you want to delete this review?')) {
            return;
        }

        try {
            const response = await fetch(
                `/api/recipes/${recipeId}/reviews?reviewId=${review._id}`,
                { method: 'DELETE' }
            );

            const data = await response.json();

            if (data.success) {
                setReviews(prev => prev.filter(r => r._id !== review._id));
                setRatingStats(data.ratingStats);
                setUserCanReview(true); // User can review again after deleting
            } else {
                alert(data.error || 'Failed to delete review');
            }
        } catch (error) {
            console.error('Error deleting review:', error);
            alert('Error deleting review');
        }
    };

    const getSortedReviews = () => {
        const sortedReviews = [...reviews];

        switch (sortBy) {
            case 'helpful':
                return sortedReviews.sort((a, b) => {
                    const aHelpfulness = (a.helpfulVotes || 0) - (a.unhelpfulVotes || 0);
                    const bHelpfulness = (b.helpfulVotes || 0) - (b.unhelpfulVotes || 0);
                    if (bHelpfulness !== aHelpfulness) {
                        return bHelpfulness - aHelpfulness;
                    }
                    return new Date(b.createdAt) - new Date(a.createdAt);
                });
            case 'newest':
                return sortedReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            case 'oldest':
                return sortedReviews.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            case 'rating_high':
                return sortedReviews.sort((a, b) => b.rating - a.rating);
            case 'rating_low':
                return sortedReviews.sort((a, b) => a.rating - b.rating);
            default:
                return sortedReviews;
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-32 bg-gray-200 rounded mb-4"></div>
                    <div className="h-24 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                    Reviews & Ratings
                </h2>
                {userCanReview && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                    >
                        Write a Review
                    </button>
                )}
            </div>

            {/* Rating Statistics */}
            <RatingStats ratingStats={ratingStats} />

            {/* Add Review Form */}
            {showAddForm && (
                <AddReviewForm
                    recipeId={recipeId}
                    onReviewAdded={handleReviewAdded}
                    onCancel={() => {
                        setShowAddForm(false);
                        setEditingReview(null);
                    }}
                    editingReview={editingReview}
                />
            )}

            {/* Reviews List */}
            {reviews.length > 0 ? (
                <div className="space-y-4">
                    {/* Sort Controls */}
                    <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                        <div className="text-sm text-gray-600">
                            {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                        </div>
                        <div className="flex items-center space-x-2">
                            <label htmlFor="sort-reviews" className="text-sm text-gray-600">
                                Sort by:
                            </label>
                            <select
                                id="sort-reviews"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="helpful">Most Helpful</option>
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="rating_high">Highest Rating</option>
                                <option value="rating_low">Lowest Rating</option>
                            </select>
                        </div>
                    </div>

                    {/* Reviews */}
                    <div className="space-y-4">
                        {getSortedReviews().map((review) => (
                            <ReviewDisplay
                                key={review._id}
                                review={review}
                                recipeId={recipeId}
                                currentUserId={session?.user?.id}
                                onReviewUpdated={handleReviewUpdated}
                                onReviewDeleted={handleReviewDeleted}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <div className="text-gray-500 mb-4">
                        <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.96 8.96 0 01-4.906-1.431L3 21l2.431-5.094A8.96 8.96 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
                    <p className="text-gray-500 mb-4">Be the first to share your thoughts about this recipe!</p>
                    {userCanReview && (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                        >
                            Write the First Review
                        </button>
                    )}
                </div>
            )}

            {/* Login Prompt for Non-Logged-In Users */}
            {!session && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-blue-700">
                                <a href="/auth/signin" className="font-medium underline hover:text-blue-600">
                                    Sign in
                                </a> to write a review and help other cooks discover great recipes!
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}