'use client';
// file: /src/components/reviews/RecipeRating.js v2


import { useState } from 'react';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import { getApiUrl} from "@/lib/api-config";

// Star Rating Display Component
export function StarRating({ rating, size = 'medium', showNumber = true, interactive = false, onRatingChange }) {
    const [hoveredRating, setHoveredRating] = useState(0);

    // Mobile-first responsive sizing
    const sizeClasses = {
        small: {
            mobile: 'w-6 h-6', // Larger on mobile for touch
            desktop: 'md:w-4 md:h-4'
        },
        medium: {
            mobile: 'w-8 h-8', // Much larger on mobile
            desktop: 'md:w-5 md:h-5'
        },
        large: {
            mobile: 'w-10 h-10', // Very large on mobile for interactive elements
            desktop: 'md:w-6 md:h-6'
        }
    };

    const getStarClasses = (size) => {
        const sizeConfig = sizeClasses[size];
        return `${sizeConfig.mobile} ${sizeConfig.desktop}`;
    };

    const renderStar = (index) => {
        const starNumber = index + 1;
        const isActive = interactive ?
            (hoveredRating ? starNumber <= hoveredRating : starNumber <= rating) :
            starNumber <= rating;

        return (
            <TouchEnhancedButton
                key={index}
                type="button"
                disabled={!interactive}
                className={`
                    ${getStarClasses(size)}
                    ${interactive ? 'cursor-pointer hover:scale-110 transition-transform touch-friendly' : 'cursor-default'} 
                    ${isActive ? 'text-yellow-400' : 'text-gray-300'}
                    flex-shrink-0
                    ${interactive ? 'p-1' : ''}
                `}
                style={{
                    // Ensure minimum touch target size on mobile
                    minWidth: interactive ? '44px' : 'auto',
                    minHeight: interactive ? '44px' : 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                onClick={() => interactive && onRatingChange && onRatingChange(starNumber)}
                onMouseEnter={() => interactive && setHoveredRating(starNumber)}
                onMouseLeave={() => interactive && setHoveredRating(0)}
                title={interactive ? `Rate ${starNumber} star${starNumber !== 1 ? 's' : ''}` : undefined}
            >
                <svg
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    className={`${getStarClasses(size)} drop-shadow-sm`}
                    style={{
                        filter: isActive ? 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))' : 'none'
                    }}
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            </TouchEnhancedButton>
        );
    };

    return (
        <div className="flex items-center space-x-1">
            <div className={`flex ${interactive ? 'gap-1' : 'gap-0.5'}`}>
                {[0, 1, 2, 3, 4].map(renderStar)}
            </div>
            {showNumber && (
                <span className="text-sm md:text-sm text-gray-600 ml-2 whitespace-nowrap">
                    {rating > 0 ? rating.toFixed(1) : 'No ratings'}
                </span>
            )}
        </div>
    );
}

// Rating Statistics Component
export function RatingStats({ ratingStats, compact = false }) {
    if (!ratingStats || ratingStats.totalRatings === 0) {
        return (
            <div className="text-center text-gray-500 py-4">
                <div className="text-sm md:text-sm">No ratings yet</div>
                <div className="text-xs md:text-xs">Be the first to rate this recipe!</div>
            </div>
        );
    }

    const { averageRating, totalRatings, ratingDistribution } = ratingStats;

    if (compact) {
        return (
            <div className="flex items-center space-x-2">
                <StarRating rating={averageRating} size="small" showNumber={false} />
                <span className="text-sm md:text-sm text-gray-600 whitespace-nowrap">
                    {averageRating.toFixed(1)} ({totalRatings})
                </span>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border p-4">
            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4 mb-4">
                <div className="text-center flex-shrink-0">
                    <div className="text-3xl font-bold text-gray-900">{averageRating.toFixed(1)}</div>
                    <StarRating rating={averageRating} size="medium" showNumber={false} />
                    <div className="text-sm text-gray-500 mt-1">{totalRatings} review{totalRatings !== 1 ? 's' : ''}</div>
                </div>

                <div className="flex-1 w-full">
                    {[5, 4, 3, 2, 1].map(stars => {
                        const count = ratingDistribution[`star${stars}`] || 0;
                        const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;

                        return (
                            <div key={stars} className="flex items-center space-x-2 mb-1">
                                <span className="text-sm text-gray-600 w-3 flex-shrink-0">{stars}</span>
                                <svg className="w-4 h-4 md:w-4 md:h-4 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                <div className="flex-1 h-2 bg-gray-200 rounded min-w-0">
                                    <div
                                        className="h-2 bg-yellow-400 rounded transition-all duration-300"
                                        style={{ width: `${percentage}%` }}
                                    ></div>
                                </div>
                                <span className="text-sm text-gray-500 w-8 text-right flex-shrink-0">{count}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// Add Review Form Component
export function AddReviewForm({ recipeId, onReviewAdded, onCancel }) {
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
            const response = await fetch(getApiUrl(`/api/recipes/${recipeId}/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rating,
                    comment: comment.trim(),
                    aspects: Object.keys(aspects).reduce((acc, key) => {
                        if (aspects[key] > 0) acc[key] = aspects[key];
                        return acc;
                    }, {}),
                    modifications: modifications.trim(),
                    wouldMakeAgain
                })
            }));

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
        <div className="bg-white rounded-lg border p-4 md:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Write a Review</h3>

            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                {/* Overall Rating */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Overall Rating *
                    </label>
                    <div className="flex justify-center md:justify-start">
                        <StarRating
                            rating={rating}
                            size="large"
                            interactive={true}
                            showNumber={false}
                            onRatingChange={setRating}
                        />
                    </div>
                    {rating > 0 && (
                        <div className="text-center md:text-left mt-2 text-sm text-gray-600">
                            {rating} star{rating !== 1 ? 's' : ''} selected
                        </div>
                    )}
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
                        className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm md:text-sm p-3"
                        style={{ fontSize: '16px' }} // Prevents zoom on iOS
                    />
                    <div className="text-xs text-gray-500 mt-1">{comment.length}/1000 characters</div>
                </div>

                {/* Aspect Ratings */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Rate Different Aspects (Optional)
                    </label>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-md">
                            <label className="text-sm font-medium text-gray-700 mb-2 sm:mb-0">Taste</label>
                            <StarRating
                                rating={aspects.taste}
                                size="medium"
                                interactive={true}
                                showNumber={false}
                                onRatingChange={(rating) => setAspects(prev => ({ ...prev, taste: rating }))}
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-md">
                            <label className="text-sm font-medium text-gray-700 mb-2 sm:mb-0">Difficulty</label>
                            <StarRating
                                rating={aspects.difficulty}
                                size="medium"
                                interactive={true}
                                showNumber={false}
                                onRatingChange={(rating) => setAspects(prev => ({ ...prev, difficulty: rating }))}
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-md">
                            <label className="text-sm font-medium text-gray-700 mb-2 sm:mb-0">Instructions</label>
                            <StarRating
                                rating={aspects.instructions}
                                size="medium"
                                interactive={true}
                                showNumber={false}
                                onRatingChange={(rating) => setAspects(prev => ({ ...prev, instructions: rating }))}
                            />
                        </div>
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
                        className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm md:text-sm p-3"
                        style={{ fontSize: '16px' }} // Prevents zoom on iOS
                    />
                    <div className="text-xs text-gray-500 mt-1">{modifications.length}/500 characters</div>
                </div>

                {/* Would Make Again */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Would you make this recipe again?
                    </label>
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-6">
                        <label className="flex items-center touch-friendly">
                            <input
                                type="radio"
                                name="wouldMakeAgain"
                                checked={wouldMakeAgain === true}
                                onChange={() => setWouldMakeAgain(true)}
                                className="mr-3 w-4 h-4"
                            />
                            <span className="text-sm">Yes</span>
                        </label>
                        <label className="flex items-center touch-friendly">
                            <input
                                type="radio"
                                name="wouldMakeAgain"
                                checked={wouldMakeAgain === false}
                                onChange={() => setWouldMakeAgain(false)}
                                className="mr-3 w-4 h-4"
                            />
                            <span className="text-sm">No</span>
                        </label>
                    </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t">
                    <TouchEnhancedButton
                        type="button"
                        onClick={onCancel}
                        className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 touch-friendly"
                    >
                        Cancel
                    </TouchEnhancedButton>
                    <TouchEnhancedButton
                        type="submit"
                        disabled={submitting || rating === 0}
                        className="w-full sm:w-auto px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 touch-friendly"
                    >
                        {submitting ? 'Posting...' : 'Post Review'}
                    </TouchEnhancedButton>
                </div>
            </form>
        </div>
    );
}