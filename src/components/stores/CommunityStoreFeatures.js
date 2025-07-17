'use client';

// file: /src/components/stores/CommunityStoreFeatures.js v1 - Complete social features for store management

import { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { useSafeSession } from '@/hooks/useSafeSession';
import { MobileHaptics } from '@/components/mobile/MobileHaptics';
import {apiPost} from "@/lib/api-config.js";

export function StoreReviews({ storeId }) {
    const { data: session } = useSafeSession();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showWriteReview, setShowWriteReview] = useState(false);

    useEffect(() => {
        loadReviews();
    }, [storeId]);

    const loadReviews = async () => {
        try {
            const response = await fetch(`/api/stores/${storeId}/reviews`);
            const data = await response.json();
            if (data.success) {
                setReviews(data.reviews);
            }
        } catch (error) {
            console.error('Failed to load reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="text-center py-4">Loading reviews...</div>;
    }

    return (
        <div className="space-y-4">
            {/* Write Review Button */}
            {session && (
                <div className="text-center">
                    <TouchEnhancedButton
                        onClick={() => setShowWriteReview(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                    >
                        ✍️ Write a Review
                    </TouchEnhancedButton>
                </div>
            )}

            {/* Reviews List */}
            {reviews.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    No reviews yet. Be the first to review this store!
                </div>
            ) : (
                <div className="space-y-4">
                    {reviews.map(review => (
                        <ReviewCard key={review._id} review={review} />
                    ))}
                </div>
            )}

            {/* Write Review Modal */}
            {showWriteReview && (
                <WriteReviewModal
                    storeId={storeId}
                    onClose={() => setShowWriteReview(false)}
                    onSuccess={() => {
                        setShowWriteReview(false);
                        loadReviews();
                    }}
                />
            )}
        </div>
    );
}

function ReviewCard({ review }) {
    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-indigo-600 text-sm font-medium">
              {review.user.name[0].toUpperCase()}
            </span>
                    </div>
                    <div>
                        <div className="font-medium text-gray-900">{review.user.name}</div>
                        <div className="text-sm text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                </div>

                <div className="flex items-center">
          <span className="text-yellow-500">
            {'⭐'.repeat(review.rating)}
          </span>
                    <span className="ml-1 text-sm text-gray-500">
            ({review.rating}/5)
          </span>
                </div>
            </div>

            <p className="text-gray-700">{review.comment}</p>

            {review.tags && review.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                    {review.tags.map(tag => (
                        <span
                            key={tag}
                            className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                        >
              {tag}
            </span>
                    ))}
                </div>
            )}
        </div>
    );
}

function WriteReviewModal({ storeId, onClose, onSuccess }) {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(false);

    const availableTags = [
        'Clean', 'Well-stocked', 'Good prices', 'Friendly staff',
        'Easy parking', 'Good layout', 'Fast checkout', 'Fresh produce'
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        MobileHaptics?.medium();

        try {
            const response = await apiPost(`/api/stores/${storeId}/reviews`, {
                rating,
                comment,
                tags
            });

            const data = await response.json();
            if (data.success) {
                onSuccess();
                MobileHaptics?.success();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Failed to submit review:', error);
            alert('Failed to submit review. Please try again.');
            MobileHaptics?.error();
        } finally {
            setLoading(false);
        }
    };

    const toggleTag = (tag) => {
        setTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

                <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Write a Review</h3>
                            <TouchEnhancedButton
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <span className="text-xl">×</span>
                            </TouchEnhancedButton>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Rating */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Rating
                                </label>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <TouchEnhancedButton
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            className={`text-2xl ${
                                                star <= rating ? 'text-yellow-500' : 'text-gray-300'
                                            }`}
                                        >
                                            ⭐
                                        </TouchEnhancedButton>
                                    ))}
                                    <span className="ml-2 text-sm text-gray-600">
                    ({rating}/5)
                  </span>
                                </div>
                            </div>

                            {/* Comment */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Comment
                                </label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    rows="4"
                                    placeholder="Share your experience at this store..."
                                />
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tags (optional)
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {availableTags.map(tag => (
                                        <TouchEnhancedButton
                                            key={tag}
                                            type="button"
                                            onClick={() => toggleTag(tag)}
                                            className={`px-3 py-1 rounded-full text-sm ${
                                                tags.includes(tag)
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            {tag}
                                        </TouchEnhancedButton>
                                    ))}
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="flex gap-3 pt-4">
                                <TouchEnhancedButton
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200"
                                >
                                    Cancel
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    type="submit"
                                    disabled={loading || !comment.trim()}
                                    className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {loading ? 'Submitting...' : 'Submit Review'}
                                </TouchEnhancedButton>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Store comparison component
export function StoreComparison({ stores }) {
    const [comparisonMetric, setComparisonMetric] = useState('rating');

    const metrics = [
        { id: 'rating', name: 'Community Rating', icon: '⭐' },
        { id: 'prices', name: 'Average Prices', icon: '💰' },
        { id: 'distance', name: 'Distance', icon: '📍' },
        { id: 'layout', name: 'Layout Quality', icon: '🗺️' }
    ];

    const getSortedStores = () => {
        return [...stores].sort((a, b) => {
            switch (comparisonMetric) {
                case 'rating':
                    return (b.communityRating || 0) - (a.communityRating || 0);
                case 'distance':
                    return (a.distance || 0) - (b.distance || 0);
                default:
                    return 0;
            }
        });
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Compare Stores</h3>

                <select
                    value={comparisonMetric}
                    onChange={(e) => setComparisonMetric(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                >
                    {metrics.map(metric => (
                        <option key={metric.id} value={metric.id}>
                            {metric.icon} {metric.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="space-y-3">
                {getSortedStores().map((store, index) => (
                    <div
                        key={store._id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-indigo-600 font-bold text-sm">
                  #{index + 1}
                </span>
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">{store.name}</div>
                                <div className="text-sm text-gray-500">{store.chain}</div>
                            </div>
                        </div>

                        <div className="text-right">
                            {comparisonMetric === 'rating' && (
                                <div className="text-yellow-500">
                                    {'⭐'.repeat(Math.round(store.communityRating || 0))}
                                    <span className="text-gray-500 ml-1">
                    ({store.communityRating?.toFixed(1) || 'New'})
                  </span>
                                </div>
                            )}

                            {comparisonMetric === 'distance' && (
                                <div className="text-gray-700">
                                    📍 {store.distance?.toFixed(1) || '—'} mi
                                </div>
                            )}

                            {comparisonMetric === 'layout' && (
                                <div className="text-gray-700">
                                    {store.hasCustomLayout ? '✅ Custom' : '📋 Standard'}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Community store activity feed
export function CommunityActivity({ limit = 10 }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadActivity();
    }, []);

    const loadActivity = async () => {
        try {
            const response = await fetch(`/api/stores/community/activity?limit=${limit}`);
            const data = await response.json();
            if (data.success) {
                setActivities(data.activities);
            }
        } catch (error) {
            console.error('Failed to load community activity:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🐻 Community Activity</h3>
                <div className="text-center py-4">Loading activity...</div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🐻 Community Activity</h3>

            {activities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🌟</div>
                    <p>No recent activity. Be the first to contribute!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {activities.map((activity, index) => (
                        <ActivityItem key={index} activity={activity} />
                    ))}
                </div>
            )}
        </div>
    );
}

function ActivityItem({ activity }) {
    const getActivityIcon = (type) => {
        switch (type) {
            case 'review': return '⭐';
            case 'layout': return '🗺️';
            case 'store_added': return '🏪';
            default: return '📝';
        }
    };

    const getActivityMessage = (activity) => {
        switch (activity.type) {
            case 'review':
                return `${activity.user.name} reviewed ${activity.store.name}`;
            case 'layout':
                return `${activity.user.name} created a layout for ${activity.store.name}`;
            case 'store_added':
                return `${activity.user.name} added ${activity.store.name}`;
            default:
                return `${activity.user.name} updated ${activity.store.name}`;
        }
    };

    return (
        <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
            <div className="text-xl">
                {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">
                    {getActivityMessage(activity)}
                </div>
                <div className="text-xs text-gray-500">
                    {new Date(activity.createdAt).toLocaleDateString()}
                </div>
            </div>
            {activity.type === 'review' && activity.rating && (
                <div className="text-yellow-500 text-sm">
                    {'⭐'.repeat(activity.rating)}
                </div>
            )}
        </div>
    );
}

// Store statistics component
export function StoreStatistics({ storeId }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, [storeId]);

    const loadStats = async () => {
        try {
            const response = await fetch(`/api/stores/${storeId}/stats`);
            const data = await response.json();
            if (data.success) {
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Failed to load store stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="text-center py-4">Loading statistics...</div>;
    }

    if (!stats) {
        return <div className="text-center py-4 text-gray-500">No statistics available</div>;
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
                icon="⭐"
                value={stats.averageRating?.toFixed(1) || 'New'}
                label="Average Rating"
                color="text-yellow-500"
            />
            <StatCard
                icon="💬"
                value={stats.totalReviews || 0}
                label="Total Reviews"
                color="text-blue-500"
            />
            <StatCard
                icon="👥"
                value={stats.uniqueVisitors || 0}
                label="Doc Bear Users"
                color="text-green-500"
            />
            <StatCard
                icon="🗺️"
                value={stats.hasCustomLayout ? 'Yes' : 'No'}
                label="Custom Layout"
                color="text-purple-500"
            />
        </div>
    );
}

function StatCard({ icon, value, label, color }) {
    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className={`text-2xl mb-1 ${color}`}>{icon}</div>
            <div className="text-lg font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
        </div>
    );
}