'use client';

// file: /src/components/reviews/RecipeReviewsSection.js v3 - Added subscription gate for writing reviews

import { useState, useEffect } from 'react';
import { useSafeSession } from '@/hooks/useSafeSession';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import { useSubscription, useFeatureGate } from '@/hooks/useSubscription';
import FeatureGate from '@/components/subscription/FeatureGate';
import { FEATURE_GATES } from '@/lib/subscription-config';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-config';

// Simple Star Rating Component
function StarRating({ rating, maxRating = 5, onRatingChange, interactive = false, size = 'medium' }) {
    const sizeClasses = {
        small: 'w-4 h-4',
        medium: 'w-6 h-6',
        large: 'w-8 h-8'
    };

    return (
        <div className="flex space-x-1">
            {[...Array(maxRating)].map((_, index) => {
                const starValue = index + 1;
                return (
                    <TouchEnhancedButton
                        key={index}
                        type="button"
                        onClick={() => interactive && onRatingChange && onRatingChange(starValue)}
                        disabled={!interactive}
                        className={`${sizeClasses[size]} ${
                            interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'
                        } ${starValue <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                    </TouchEnhancedButton>
                );
            })}
        </div>
    );
}

// Rating Statistics Component
function RatingStats({ ratingStats, compact = false }) {
    if (!ratingStats || ratingStats.totalRatings === 0) {
        return (
            <div className="text-center text-gray-500 py-4">
                <div className="text-sm">No ratings yet</div>
                <div className="text-xs">Be the first to rate this recipe!</div>
            </div>
        );
    }

    const { averageRating, totalRatings, ratingDistribution } = ratingStats;

    if (compact) {
        return (
            <div className="flex items-center space-x-2">
                <StarRating rating={averageRating} size="small" />
                <span className="text-sm text-gray-600">
                    {averageRating.toFixed(1)} ({totalRatings})
                </span>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center space-x-4 mb-4">
                <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{averageRating.toFixed(1)}</div>
                    <StarRating rating={averageRating} size="medium" />
                    <div className="text-sm text-gray-500 mt-1">{totalRatings} review{totalRatings !== 1 ? 's' : ''}</div>
                </div>

                <div className="flex-1">
                    {[5, 4, 3, 2, 1].map(stars => {
                        const count = ratingDistribution[`star${stars}`] || 0;
                        const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;

                        return (
                            <div key={stars} className="flex items-center space-x-2 mb-1">
                                <span className="text-sm text-gray-600 w-2">{stars}</span>
                                <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                <div className="flex-1 h-2 bg-gray-200 rounded">
                                    <div
                                        className="h-2 bg-yellow-400 rounded"
                                        style={{ width: `${percentage}%` }}
                                    ></div>
                                </div>
                                <span className="text-sm text-gray-500 w-8">{count}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// Add Review Form Component
function AddReviewForm({ recipeId, onReviewAdded, onCancel }) {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [aspects, setAspects] = useState({
        taste: 0,
        difficulty: 0,
        instructions: 0
    });
    const [modifications, setModifications] = useState('');
    const [wouldMakeAgain, setWouldMakeAgain] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (rating === 0) {
            alert('Please select a rating');
            return;
        }

        setSubmitting(true);

        try {
            const response = await apiPost(`/api/recipes/${recipeId}/reviews`, {
                rating,
                comment: comment.trim(),
                aspects: Object.keys(aspects).reduce((acc, key) => {
                    if (aspects[key] > 0) acc[key] = aspects[key];
                    return acc;
                }, {}),
                modifications: modifications.trim(),
                wouldMakeAgain
            });

            const data = await response.json();

            if (data.success) {
                if (onReviewAdded) {
                    onReviewAdded(data.review, data.ratingStats);
                }
                // Reset form
                setRating(0);
                setComment('');
                setAspects({ taste: 0, difficulty: 0, instructions: 0 });
                setModifications('');
                setWouldMakeAgain(null);
            } else {
                alert(data.error || 'Failed to add review');
            }
        } catch (error) {
            console.error('Error adding review:', error);
            alert('Error adding review');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Write a Review</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Overall Rating */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Overall Rating *
                    </label>
                    <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchEnhancedButton
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className={`w-8 h-8 ${
                                    star <= rating ? 'text-yellow-400' : 'text-gray-300'
                                } hover:text-yellow-400 transition-colors`}
                            >
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            </TouchEnhancedButton>
                        ))}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                        {rating > 0 ? `${rating} star${rating !== 1 ? 's' : ''}` : 'Click to rate'}
                    </div>
                </div>

                {/* Comment */}
                <div>
                    <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                        Your Review
                    </label>
                    <textarea
                        id="comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Share your thoughts about this recipe..."
                        rows={4}
                        maxLength={1000}
                        className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                    <div className="text-xs text-gray-500 mt-1">{comment.length}/1000 characters</div>
                </div>

                {/* Aspect Ratings */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Taste</label>
                        <StarRating
                            rating={aspects.taste}
                            onRatingChange={(rating) => setAspects(prev => ({ ...prev, taste: rating }))}
                            interactive={true}
                            size="small"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                        <StarRating
                            rating={aspects.difficulty}
                            onRatingChange={(rating) => setAspects(prev => ({ ...prev, difficulty: rating }))}
                            interactive={true}
                            size="small"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                        <StarRating
                            rating={aspects.instructions}
                            onRatingChange={(rating) => setAspects(prev => ({ ...prev, instructions: rating }))}
                            interactive={true}
                            size="small"
                        />
                    </div>
                </div>

                {/* Modifications */}
                <div>
                    <label htmlFor="modifications" className="block text-sm font-medium text-gray-700 mb-2">
                        Did you make any modifications?
                    </label>
                    <textarea
                        id="modifications"
                        value={modifications}
                        onChange={(e) => setModifications(e.target.value)}
                        placeholder="Describe any changes you made to the recipe..."
                        rows={2}
                        maxLength={500}
                        className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>

                {/* Would Make Again */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Would you make this recipe again?
                    </label>
                    <div className="flex space-x-4">
                        <label className="flex items-center">
                            <input
                                type="radio"
                                name="wouldMakeAgain"
                                checked={wouldMakeAgain === true}
                                onChange={() => setWouldMakeAgain(true)}
                                className="mr-2"
                            />
                            Yes
                        </label>
                        <label className="flex items-center">
                            <input
                                type="radio"
                                name="wouldMakeAgain"
                                checked={wouldMakeAgain === false}
                                onChange={() => setWouldMakeAgain(false)}
                                className="mr-2"
                            />
                            No
                        </label>
                    </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                    <TouchEnhancedButton
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Cancel
                    </TouchEnhancedButton>
                    <TouchEnhancedButton
                        type="submit"
                        disabled={submitting || rating === 0}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400"
                    >
                        {submitting ? 'Posting...' : 'Post Review'}
                    </TouchEnhancedButton>
                </div>
            </form>
        </div>
    );
}

// Main Reviews Section Component with Subscription Gate
export default function RecipeReviewsSection({ recipeId, recipeOwnerId }) {
    const { data: session } = useSafeSession();
    const [reviews, setReviews] = useState([]);
    const [ratingStats, setRatingStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [userCanReview, setUserCanReview] = useState(false);

    // Subscription hooks
    const subscription = useSubscription();
    const reviewGate = useFeatureGate(FEATURE_GATES.WRITE_REVIEW);

    useEffect(() => {
        fetchReviews();
    }, [recipeId]);

    const fetchReviews = async () => {
        try {
            const response = await apiGet(`/api/recipes/${recipeId}/reviews`);
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
        setUserCanReview(false);
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
                {userCanReview && session && (
                    <FeatureGate
                        feature={FEATURE_GATES.WRITE_REVIEW}
                        fallback={
                            <div className="text-center">
                                <TouchEnhancedButton
                                    onClick={() => window.location.href = '/pricing?source=recipe-reviews'}
                                    className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors text-sm"
                                >
                                    Upgrade to Write Reviews
                                </TouchEnhancedButton>
                                <div className="text-xs text-gray-500 mt-1">Gold feature</div>
                            </div>
                        }
                    >
                        <TouchEnhancedButton
                            onClick={() => setShowAddForm(true)}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                        >
                            Write a Review
                        </TouchEnhancedButton>
                    </FeatureGate>
                )}
            </div>

            {/* Rating Statistics */}
            <RatingStats ratingStats={ratingStats} />

            {/* Add Review Form */}
            {showAddForm && reviewGate.hasAccess && (
                <AddReviewForm
                    recipeId={recipeId}
                    onReviewAdded={handleReviewAdded}
                    onCancel={() => setShowAddForm(false)}
                />
            )}

            {/* Reviews List or Empty State */}
            {reviews.length > 0 ? (
                <div className="space-y-4">
                    <div className="text-sm text-gray-600">
                        {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                    </div>
                    {/* Individual reviews would go here */}
                    <div className="text-center py-8 text-gray-500">
                        Review display coming soon...
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

                    {session && userCanReview && (
                        <FeatureGate
                            feature={FEATURE_GATES.WRITE_REVIEW}
                            fallback={
                                <div className="space-y-2">
                                    <TouchEnhancedButton
                                        onClick={() => window.location.href = '/pricing?source=recipe-reviews'}
                                        className="bg-yellow-600 text-white px-6 py-2 rounded-md hover:bg-yellow-700 transition-colors"
                                    >
                                        Upgrade to Write the First Review
                                    </TouchEnhancedButton>
                                    <div className="text-xs text-gray-500">
                                        Writing reviews requires a Gold subscription
                                    </div>
                                </div>
                            }
                        >
                            <TouchEnhancedButton
                                onClick={() => setShowAddForm(true)}
                                className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                            >
                                Write the First Review
                            </TouchEnhancedButton>
                        </FeatureGate>
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
                                <span className="block text-xs mt-1">Note: Writing reviews requires a Gold subscription</span>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Subscription Info for Free Users */}
            {session && !reviewGate.hasAccess && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                <span className="font-medium">Recipe reviews are a Gold feature.</span> Upgrade to share your cooking experiences and help other home cooks discover great recipes!
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}