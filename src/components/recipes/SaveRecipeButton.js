'use client';
// file: /src/components/recipes/SaveRecipeButton.js v5 - FIXED using global saved recipes hook to eliminate API spam

import {useState, useEffect} from 'react';
import {useSafeSession} from '@/hooks/useSafeSession';
import {useSavedRecipes} from '@/hooks/useSavedRecipes';
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
    const {
        savedRecipes,
        loading: savedRecipesLoading,
        error: savedRecipesError,
        isRecipeSaved,
        addToSaved,
        removeFromSaved,
        invalidateCache,
        totalCount
    } = useSavedRecipes();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [statusCheckFailed, setStatusCheckFailed] = useState(false);

    // Determine if recipe is saved using global state
    const isSaved = isRecipeSaved(recipeId);

    // Handle initial loading state
    useEffect(() => {
        if (savedRecipesError) {
            setStatusCheckFailed(true);
        } else {
            setStatusCheckFailed(false);
        }
    }, [savedRecipesError]);

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
                // Optimistically update UI first
                removeFromSaved(recipeId);
                if (onSaveStateChange) onSaveStateChange(recipeId, false);

                // Then make API call
                const response = await fetch(getApiUrl(`/api/saved-recipes?recipeId=${recipeId}`), {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    // Revert optimistic update on error
                    addToSaved(recipeId);
                    if (onSaveStateChange) onSaveStateChange(recipeId, true);

                    if (response.status >= 500) {
                        throw new Error('Server temporarily unavailable. Please try again later.');
                    }
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
                }

                const data = await response.json();

                if (data.success) {
                    setSuccess('Recipe removed from saved recipes');
                } else {
                    // Revert optimistic update on API error
                    addToSaved(recipeId);
                    if (onSaveStateChange) onSaveStateChange(recipeId, true);
                    throw new Error(data.error || 'Failed to unsave recipe');
                }
            } else {
                // Optimistically update UI first
                addToSaved(recipeId);
                if (onSaveStateChange) onSaveStateChange(recipeId, true);

                // Then make API call
                const response = await fetch(getApiUrl('/api/saved-recipes'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({recipeId})
                });

                if (!response.ok) {
                    // Handle 403 specially for usage limits
                    if (response.status === 403) {
                        try {
                            const errorData = await response.json();
                            if (errorData.code === 'USAGE_LIMIT_EXCEEDED') {
                                // Revert optimistic update
                                removeFromSaved(recipeId);
                                if (onSaveStateChange) onSaveStateChange(recipeId, false);

                                // Show error message
                                setError(errorData.error || 'You have reached your saved recipe limit.');

                                // Handle upgrade prompt after a short delay
                                setTimeout(() => {
                                    if (confirm(`${errorData.error}\n\nWould you like to upgrade now?`)) {
                                        window.location.href = errorData.upgradeUrl || '/pricing';
                                    }
                                }, 100);
                                return; // Exit early, we handled the error
                            }
                        } catch (parseError) {
                            console.warn('Could not parse 403 response:', parseError);
                        }
                    }

                    // Revert optimistic update on other errors
                    removeFromSaved(recipeId);
                    if (onSaveStateChange) onSaveStateChange(recipeId, false);

                    if (response.status >= 500) {
                        throw new Error('Server temporarily unavailable. Please try again later.');
                    }
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
                }

                const data = await response.json();

                if (data.success) {
                    setSuccess(data.message || 'Recipe saved successfully');
                } else {
                    // Revert optimistic update on API error
                    removeFromSaved(recipeId);
                    if (onSaveStateChange) onSaveStateChange(recipeId, false);

                    if (data.code === 'USAGE_LIMIT_EXCEEDED') {
                        // Show error message for limit exceeded
                        setError(data.error || 'You have reached your saved recipe limit.');

                        // Handle upgrade prompt after a short delay
                        setTimeout(() => {
                            if (confirm(`${data.error}\n\nWould you like to upgrade now?`)) {
                                window.location.href = data.upgradeUrl || '/pricing';
                            }
                        }, 100);
                        return; // Don't throw error, we handled it
                    } else {
                        throw new Error(data.error || 'Failed to save recipe');
                    }
                }
            }
        } catch (error) {
            console.error('Error toggling save state:', error);

            // Provide more user-friendly error messages
            let userMessage = 'An error occurred';
            if (error.message.includes('Server temporarily unavailable')) {
                userMessage = error.message;
            } else if (error.message.includes('500')) {
                userMessage = 'Server temporarily unavailable. Please try again later.';
            } else if (error.message.includes('503')) {
                userMessage = 'Service temporarily unavailable. Please try again later.';
            } else if (error.message.includes('401')) {
                userMessage = 'Please sign in again to save recipes.';
            } else if (error.message.includes('403')) {
                userMessage = 'You have reached your saved recipe limit.';
            } else if (error.message.includes('404')) {
                userMessage = 'Recipe not found or no longer available.';
            } else if (error.message.includes('Network') || error.message.includes('fetch')) {
                userMessage = 'Network error. Please check your connection.';
            } else {
                userMessage = error.message || 'An error occurred';
            }

            setError(userMessage);
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
                    disabled={loading || savedRecipesLoading}
                    className={`${
                        isSaved
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                    } rounded-md font-medium transition-colors flex items-center gap-2 ${getSizeClasses()} ${className} ${
                        statusCheckFailed ? 'opacity-90' : ''
                    }`}
                    title={statusCheckFailed ? 'Save status could not be verified' : ''}
                >
                    {(loading || savedRecipesLoading) ? (
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
                            {loading ? 'Saving...' :
                                savedRecipesLoading ? 'Loading...' :
                                    isSaved ? 'Saved' : 'Save Recipe'}
                            {statusCheckFailed && !loading && !savedRecipesLoading && (
                                <span className="text-xs opacity-75"> (?)</span>
                            )}
                        </span>
                    )}
                </TouchEnhancedButton>

                {/* Success/Error Messages */}
                {(success || error) && (
                    <div className={`absolute top-full left-0 mt-2 w-64 rounded-lg p-3 z-10 shadow-lg ${
                        success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                        <div className={`text-sm ${
                            success ? 'text-green-800' : 'text-red-800'
                        }`}>
                            {success ? `✓ ${success}` : `⚠️ ${error}`}
                        </div>
                    </div>
                )}

                {/* Status Check Failed Warning (only show if user hovers and check failed) */}
                {statusCheckFailed && !loading && !savedRecipesLoading && !success && !error && (
                    <div className="absolute top-full left-0 mt-1 w-48 text-xs text-gray-500 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                        Save status could not be verified
                    </div>
                )}
            </div>
        </FeatureGate>
    );
}