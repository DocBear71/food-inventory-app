'use client';
// file: /src/components/recipes/SaveRecipeButton.js v2 - FIXED error handling and API calls

import {useState, useEffect} from 'react';
import {useSafeSession} from '@/hooks/useSafeSession';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import FeatureGate from '@/components/subscription/FeatureGate';
import {FEATURE_GATES} from '@/lib/subscription-config';
import {getApiUrl} from '@/lib/api-config';

export default function SaveRecipeButton({
                                             recipeId,
                                             recipeName,
                                             initialSavedState = false,
                                             onSaveStateChange = null,
                                             className = '',
                                             showText = true,
                                             size = 'medium' // 'small', 'medium', 'large'
                                         }) {
    const {data: session} = useSafeSession();
    const [isSaved, setIsSaved] = useState(initialSavedState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Check if recipe is saved on component mount
    useEffect(() => {
        if (session?.user?.id && recipeId && !error) {
            checkSavedStatus();
        }
    }, [session?.user?.id, recipeId]);

    const checkSavedStatus = async () => {
        try {
            console.log('🔍 SaveRecipeButton - Checking saved status for recipe:', recipeId);

            const response = await fetch(getApiUrl('/api/saved-recipes'));

            if (!response.ok) {
                console.warn('⚠️ SaveRecipeButton - Failed to check saved status:', response.status, response.statusText);

                // Don't set error state for failed status checks - just log and continue
                if (response.status === 401) {
                    console.log('🔐 SaveRecipeButton - User not authenticated');
                    return;
                } else if (response.status >= 500) {
                    console.warn('🚨 SaveRecipeButton - Server error checking saved status, will skip status check');
                    return;
                }
                return;
            }

            const data = await response.json();

            if (data.success && data.savedRecipes) {
                const savedRecipeIds = data.savedRecipes.map(saved =>
                    saved.recipeId?._id || saved.recipeId
                ).filter(Boolean);

                const isCurrentlySaved = savedRecipeIds.includes(recipeId);
                setIsSaved(isCurrentlySaved);

                console.log('✅ SaveRecipeButton - Status check complete. Recipe saved:', isCurrentlySaved);
            } else if (data.warning) {
                console.warn('⚠️ SaveRecipeButton - API returned warning:', data.warning);
                // Continue with default state if there's a warning
            }
        } catch (error) {
            console.warn('⚠️ SaveRecipeButton - Error checking saved status:', error.message);
            // Don't set error state for network issues during status check
            // Just log and continue with default state
        }
    };

    const handleSaveToggle = async () => {
        if (!session?.user?.id) {
            alert('Please sign in to save recipes');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            if (isSaved) {
                // Unsave recipe
                const response = await fetch(getApiUrl(`/api/saved-recipes?recipeId=${recipeId}`), {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (data.success) {
                    setIsSaved(false);
                    setSuccess('Recipe removed from saved recipes');
                    if (onSaveStateChange) onSaveStateChange(recipe._id, false);
                } else {
                    throw new Error(data.error || 'Failed to unsave recipe');
                }
            } else {
                // Save recipe
                const response = await fetch(getApiUrl('/api/saved-recipes'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({recipeId})
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (data.success) {
                    setIsSaved(true);
                    setSuccess(data.message || 'Recipe saved successfully');
                    if (onSaveStateChange) onSaveStateChange(recipeId, true);
                } else {
                    if (data.code === 'USAGE_LIMIT_EXCEEDED') {
                        // Handle upgrade prompt
                        if (confirm(`${data.error}\n\nWould you like to upgrade now?`)) {
                            window.location.href = data.upgradeUrl || '/pricing';
                        }
                        return; // Don't show error message for upgrade prompts
                    } else {
                        throw new Error(data.error || 'Failed to save recipe');
                    }
                }
            }
        } catch (error) {
            console.error('Error toggling save state:', error);
            setError(error.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    // Clear messages after delay
    useEffect(() => {
        if (success || error) {
            const timer = setTimeout(() => {
                setSuccess('');
                setError('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [success, error]);

    const getSizeClasses = () => {
        switch (size) {
            case 'small':
                return 'px-2 py-1 text-sm';
            case 'large':
                return 'px-6 py-3 text-lg';
            default:
                return 'px-4 py-2';
        }
    };

    const getIconSize = () => {
        switch (size) {
            case 'small':
                return 'w-4 h-4';
            case 'large':
                return 'w-6 h-6';
            default:
                return 'w-5 h-5';
        }
    };

    return (
        <FeatureGate
            feature={FEATURE_GATES.SAVE_RECIPE}
            fallback={
                <TouchEnhancedButton
                    onClick={() => window.location.href = '/pricing?source=save-recipe'}
                    className={`bg-gradient-to-r from-blue-400 to-purple-500 text-white rounded-md font-medium hover:from-blue-500 hover:to-purple-600 flex items-center gap-2 ${getSizeClasses()} ${className}`}
                >
                    <svg className={getIconSize()} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                    </svg>
                    {showText && <span>Save Recipe (Gold)</span>}
                </TouchEnhancedButton>
            }
        >
            <div className="relative">
                <TouchEnhancedButton
                    onClick={handleSaveToggle}
                    disabled={loading}
                    className={`${
                        isSaved
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                    } rounded-md font-medium transition-colors flex items-center gap-2 ${getSizeClasses()} ${className}`}
                >
                    {loading ? (
                        <div className={`animate-spin rounded-full border-b-2 ${
                            isSaved ? 'border-white' : 'border-gray-600'
                        } ${getIconSize()}`}></div>
                    ) : (
                        <svg
                            className={getIconSize()}
                            fill={isSaved ? "currentColor" : "none"}
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                            />
                        </svg>
                    )}
                    {showText && (
                        <span>
                            {loading ? 'Saving...' : isSaved ? 'Saved' : 'Save Recipe'}
                        </span>
                    )}
                </TouchEnhancedButton>

                {/* Success/Error Messages */}
                {(success || error) && (
                    <div className={`absolute top-full left-0 mt-2 w-64 rounded-lg p-3 z-10 ${
                        success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                        <div className={`text-sm ${
                            success ? 'text-green-800' : 'text-red-800'
                        }`}>
                            {success ? `✓ ${success}` : `⚠️ ${error}`}
                        </div>
                    </div>
                )}
            </div>
        </FeatureGate>
    );
}