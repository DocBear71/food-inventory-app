// file: /src/components/reviews/ReviewDisplay.js v1

'use client';

import { useState } from 'react';
import { StarRating } from './RecipeRating';

export default function ReviewDisplay({
                                          review,
                                          recipeId,
                                          currentUserId,
                                          onReviewUpdated,
                                          onReviewDeleted
                                      }) {
    const [showFullComment, setShowFullComment] = useState(false);
    const [isVoting, setIsVoting] = useState(false);
    const [voteState, setVoteState] = useState({
        helpful: review.helpfulVotes || 0,
        unhelpful: review.unhelpfulVotes || 0,
        userVote: review.userVote || null
    });

    const isOwnReview = currentUserId === review.userId;
    const commentPreviewLength = 150;
    const shouldTruncate = review.comment && review.comment.length > commentPreviewLength;

    const handleVote = async (voteType) => {
        if (isOwnReview || isVoting) return;

        setIsVoting(true);

        try {
            const response = await fetch(`/api/recipes/${recipeId}/reviews/${review._id}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vote: voteType })
            });

            const data = await response.json();

            if (data.success) {
                setVoteState({
                    helpful: data.helpfulVotes,
                    unhelpful: data.unhelpfulVotes,
                    userVote: data.userVote
                });
            } else {
                alert(data.error || 'Failed to record vote');
            }
        } catch (error) {
            console.error('Error voting on review:', error);
            alert('Error recording vote');
        } finally {
            setIsVoting(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
        return date.toLocaleDateString();
    };

    const getCookingLevelBadge = (level) => {
        const badges = {
            beginner: { color: 'bg-green-100 text-green-800', icon: '🌱' },
            intermediate: { color: 'bg-yellow-100 text-yellow-800', icon: '👨‍🍳' },
            advanced: { color: 'bg-red-100 text-red-800', icon: '👨‍🍳' }
        };
        return badges[level] || badges.beginner;
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {review.userName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                        <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">{review.userName || 'Anonymous'}</span>
                            {review.userId?.profile?.cookingLevel && (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCookingLevelBadge(review.userId.profile.cookingLevel).color}`}>
                                    {getCookingLevelBadge(review.userId.profile.cookingLevel).icon}
                                    {review.userId.profile.cookingLevel}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                            <StarRating rating={review.rating} size="small" showNumber={false} />
                            <span className="text-sm text-gray-500">{formatDate(review.createdAt)}</span>
                        </div>
                    </div>
                </div>

                {/* Actions for own review */}
                {isOwnReview && (
                    <div className="flex space-x-2">
                        <button
                            onClick={() => onReviewUpdated && onReviewUpdated(review)}
                            className="text-sm text-indigo-600 hover:text-indigo-800"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => onReviewDeleted && onReviewDeleted(review)}
                            className="text-sm text-red-600 hover:text-red-800"
                        >
                            Delete
                        </button>
                    </div>
                )}
            </div>

            {/* Aspect Ratings */}
            {(review.aspects?.taste || review.aspects?.difficulty || review.aspects?.instructions) && (
                <div className="grid grid-cols-3 gap-4 py-3 border-t border-gray-100">
                    {review.aspects.taste && (
                        <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1">Taste</div>
                            <StarRating rating={review.aspects.taste} size="small" showNumber={false} />
                        </div>
                    )}
                    {review.aspects.difficulty && (
                        <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1">Difficulty</div>
                            <StarRating rating={review.aspects.difficulty} size="small" showNumber={false} />
                        </div>
                    )}
                    {review.aspects.instructions && (
                        <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1">Instructions</div>
                            <StarRating rating={review.aspects.instructions} size="small" showNumber={false} />
                        </div>
                    )}
                </div>
            )}

            {/* Comment */}
            {review.comment && (
                <div className="space-y-2">
                    <p className="text-gray-700 leading-relaxed">
                        {shouldTruncate && !showFullComment
                            ? `${review.comment.substring(0, commentPreviewLength)}...`
                            : review.comment
                        }
                    </p>
                    {shouldTruncate && (
                        <button
                            onClick={() => setShowFullComment(!showFullComment)}
                            className="text-sm text-indigo-600 hover:text-indigo-800"
                        >
                            {showFullComment ? 'Show less' : 'Read more'}
                        </button>
                    )}
                </div>
            )}

            {/* Modifications */}
            {review.modifications && (
                <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-sm font-medium text-blue-900 mb-1">Modifications Made:</div>
                    <p className="text-sm text-blue-800">{review.modifications}</p>
                </div>
            )}

            {/* Would Make Again */}
            {review.wouldMakeAgain !== null && (
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Would make again:</span>
                    <span className={`text-sm font-medium ${review.wouldMakeAgain ? 'text-green-600' : 'text-red-600'}`}>
                        {review.wouldMakeAgain ? '✅ Yes' : '❌ No'}
                    </span>
                </div>
            )}

            {/* Helpfulness Voting */}
            {!isOwnReview && currentUserId && (
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="text-sm text-gray-500">Was this review helpful?</div>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => handleVote('helpful')}
                            disabled={isVoting}
                            className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm transition-colors ${
                                voteState.userVote === 'helpful'
                                    ? 'bg-green-100 text-green-800'
                                    : 'text-gray-600 hover:bg-gray-100'
                            } disabled:opacity-50`}
                        >
                            <span>👍</span>
                            <span>Helpful ({voteState.helpful})</span>
                        </button>
                        <button
                            onClick={() => handleVote('unhelpful')}
                            disabled={isVoting}
                            className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm transition-colors ${
                                voteState.userVote === 'unhelpful'
                                    ? 'bg-red-100 text-red-800'
                                    : 'text-gray-600 hover:bg-gray-100'
                            } disabled:opacity-50`}
                        >
                            <span>👎</span>
                            <span>Not helpful ({voteState.unhelpful})</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Updated indicator */}
            {review.updatedAt && review.updatedAt !== review.createdAt && (
                <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                    Edited {formatDate(review.updatedAt)}
                </div>
            )}
        </div>
    );
}