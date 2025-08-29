'use client';
// file: /src/components/recipes/RecipeCollections.js v5 - iOS Native Enhancements

import React, {useState, useEffect} from 'react';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import FeatureGate from '@/components/subscription/FeatureGate';
import {FEATURE_GATES} from '@/lib/subscription-config';
import {useSubscription} from '@/hooks/useSubscription';
import {useSafeSession} from '@/hooks/useSafeSession';
import {apiGet, apiPost, apiDelete} from '@/lib/api-config';
import {
    NativeTextInput,
    NativeTextarea,
    NativeCheckbox
} from '@/components/forms/NativeIOSFormComponents';
import {PlatformDetection} from '@/utils/PlatformDetection';

const RecipeCollections = ({
                               selectedRecipeId = null,
                               onCollectionUpdate = null,
                               showAddToCollection = false,
                               onCountChange = null
                           }) => {
    const subscription = useSubscription();
    const {data: session} = useSafeSession();
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [createFormData, setCreateFormData] = useState({
        name: '',
        description: '',
        isPublic: false
    });
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const isIOS = PlatformDetection.isIOS();

    // Collection limit checking
    const checkCollectionLimits = (currentCount) => {
        if (!subscription || subscription.loading) {
            return {allowed: true};
        }

        const userTier = subscription.tier || 'free';
        const limits = {
            free: 2,
            gold: 10,
            platinum: -1,
            admin: -1
        };

        const limit = limits[userTier] || limits.free;

        if (limit === -1 || userTier === 'admin') return {allowed: true};

        if (currentCount >= limit) {
            return {
                allowed: false,
                reason: 'limit_exceeded',
                currentCount,
                limit,
                tier: userTier
            };
        }

        return {allowed: true};
    };

    // iOS Native Create Collection Flow
    const handleCreateCollectionClick = async () => {
        const currentCount = collections.length;
        const limitCheck = checkCollectionLimits(currentCount);

        // iOS haptic for button tap
        if (isIOS) {
            try {
                const {MobileHaptics} = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.buttonTap();
            } catch (error) {
                console.log('Create collection haptic failed:', error);
            }
        }

        if (!limitCheck.allowed) {
            if (isIOS) {
                try {
                    const {NativeDialog} = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showUpgradePrompt({
                        feature: 'Recipe Collections',
                        tier: limitCheck.tier === 'free' ? 'Gold' : 'Platinum',
                        currentLimit: `You've reached your ${limitCheck.tier} plan limit of ${limitCheck.limit} collections.`
                    });
                } catch (error) {
                    console.error('Native upgrade prompt failed:', error);
                    // Fallback to web confirm
                    const errorMessage = `You've reached your ${limitCheck.tier} plan limit of ${limitCheck.limit} collections. Upgrade to ${limitCheck.tier === 'free' ? 'Gold' : 'Platinum'} for more collections.`;
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    const confirmed = await NativeDialog.showConfirm({
                        title: 'Collection Limit Reached',
                        message: `${errorMessage}\n\nWould you like to upgrade now?`,
                        confirmText: 'Upgrade',
                        cancelText: 'Cancel'
                    });
                    if (confirmed) {
                        window.location.href = `/pricing?source=collection-limit&tier=${limitCheck.tier}`;
                    }
                }
            } else {
                // Web fallback
                const errorMessage = `You've reached your ${limitCheck.tier} plan limit of ${limitCheck.limit} collections.`;
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                const confirmed = await NativeDialog.showConfirm({
                    title: 'Collection Limit',
                    message: `${errorMessage}\n\nWould you like to upgrade now?`,
                    confirmText: 'Upgrade',
                    cancelText: 'Cancel'
                });
                if (confirmed) {
                    window.location.href = `/pricing?source=collection-limit&tier=${limitCheck.tier}`;
                }
            }
            return;
        }

        // Show native iOS form or web form
        if (isIOS) {
            await showNativeCreateForm();
        } else {
            setShowCreateForm(true);
        }
    };


    useEffect(() => {
        fetchCollections();
    }, []);

// Update parent count when collections change
    useEffect(() => {
        if (onCountChange) {
            onCountChange(collections.length);
        }
    }, [collections.length, onCountChange]);

    const fetchCollections = async () => {
        try {
            setLoading(true);
            const response = await apiGet('/api/collections');
            const data = await response.json();

            if (data.success) {
                setCollections(data.collections);
            } else {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Loading Failed',
                    message: data.error || 'Failed to fetch collections'
                });
            }
        } catch (error) {
            console.error('Error fetching collections:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Network Error',
                message: 'Failed to fetch collections'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCollection = async (formData) => {
        setCreating(true);
        setSuccess('');

        // iOS form submit haptic
        if (isIOS) {
            try {
                const {MobileHaptics} = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.formSubmit();
            } catch (error) {
                console.log('Create collection haptic failed:', error);
            }
        }

        try {
            const response = await apiPost('/api/collections', formData);
            const data = await response.json();

            if (data.success) {
                // iOS success haptic
                if (isIOS) {
                    try {
                        const {MobileHaptics} = await import('@/components/mobile/MobileHaptics');
                        await MobileHaptics.success();

                        const {NativeDialog} = await import('@/components/mobile/NativeDialog');
                        await NativeDialog.showSuccess({
                            title: 'Collection Created',
                            message: `"${formData.name}" has been created successfully!`
                        });
                    } catch (error) {
                        console.log('Success notification failed:', error);
                    }
                } else {
                    setSuccess('Collection created successfully!');
                }

                setCollections([data.collection, ...collections]);
                setCreateFormData({name: '', description: '', isPublic: false});
                setShowCreateForm(false);

                setTimeout(() => setSuccess(''), 3000);

                if (onCollectionUpdate) {
                    onCollectionUpdate();
                }
            } else {
                if (data.code === 'USAGE_LIMIT_EXCEEDED') {
                    if (isIOS) {
                        const {NativeDialog} = await import('@/components/mobile/NativeDialog');
                        await NativeDialog.showUpgradePrompt({
                            feature: 'Recipe Collections',
                            tier: 'Gold',
                            currentLimit: data.error
                        });
                    } else {
                        const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                        await NativeDialog.showError({
                            title: 'Collection Limit',
                            message: data.error || 'Collection limit exceeded'
                        });
                    }
                    setShowCreateForm(false);
                } else {
                    if (isIOS) {
                        const {MobileHaptics} = await import('@/components/mobile/MobileHaptics');
                        await MobileHaptics.error();

                        const {NativeDialog} = await import('@/components/mobile/NativeDialog');
                        await NativeDialog.showError({
                            title: 'Creation Failed',
                            message: data.error || 'Failed to create collection. Please try again.'
                        });
                    } else {
                        const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                        await NativeDialog.showError({
                            title: 'Creation Failed',
                            message: data.error || 'Failed to create collection'
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error creating collection:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Creation Failed',
                message: data.error || 'Failed to create collection'
            });
        } finally {
            setCreating(false);
        }
    };

    // iOS Native Collection Creation Form
    const showNativeCreateForm = async () => {
        try {
            const {NativeDialog} = await import('@/components/mobile/NativeDialog');

            // Step 1: Get collection name
            const nameResult = await NativeDialog.showPrompt({
                title: 'Create New Collection',
                message: 'Enter a name for your recipe collection:',
                placeholder: 'e.g., Comfort Food Favorites',
                buttons: [
                    {
                        text: 'Next',
                        style: 'default',
                        action: async (name) => {
                            if (name && name.trim()) {
                                return name.trim();
                            }
                            await NativeDialog.showAlert({
                                title: 'Name Required',
                                message: 'Please enter a collection name.'
                            });
                            return false;
                        }
                    },
                    {
                        text: 'Cancel',
                        style: 'cancel',
                        action: () => false
                    }
                ]
            });

            if (!nameResult) return;

            // Step 2: Get description (optional)
            const descResult = await NativeDialog.showPrompt({
                title: 'Collection Description',
                message: 'Add a description (optional):',
                placeholder: 'Describe this collection...',
                buttons: [
                    {
                        text: 'Next',
                        style: 'default',
                        action: (desc) => desc || ''
                    },
                    {
                        text: 'Skip',
                        style: 'default',
                        action: () => ''
                    },
                    {
                        text: 'Back',
                        style: 'cancel',
                        action: () => showNativeCreateForm()
                    }
                ]
            });

            if (descResult === false) return;

            // Step 3: Privacy setting
            const privacyResult = await NativeDialog.showActionSheet({
                title: 'Collection Privacy',
                message: 'Who can see this collection?',
                buttons: [
                    {
                        text: '🔒 Private (Only me)',
                        style: 'default',
                        action: () => false
                    },
                    {
                        text: '🌍 Public (Everyone)',
                        style: 'default',
                        action: () => true
                    },
                    {
                        text: 'Cancel',
                        style: 'cancel',
                        action: () => null
                    }
                ]
            });

            if (privacyResult === null) return;

            // Create the collection
            await handleCreateCollection({
                name: nameResult,
                description: descResult,
                isPublic: privacyResult
            });

        } catch (error) {
            console.error('Error creating collection:', error);

            if (isIOS) {
                const {MobileHaptics} = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.error();

                const {NativeDialog} = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Network Error',
                    message: 'Failed to create collection. Please check your connection and try again.'
                });
            } else {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Creation Failed',
                    message: data.error || 'Failed to create collection'
                });
            }
        } finally {
            setCreating(false);
        }
    };

    const handleAddRecipeToCollection = async (collectionId) => {
        if (!selectedRecipeId) return;

        // iOS haptic for add action
        if (isIOS) {
            try {
                const {MobileHaptics} = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.buttonTap();
            } catch (error) {
                console.log('Add recipe haptic failed:', error);
            }
        }

        try {
            const response = await apiPost(`/api/collections/${collectionId}/recipes`, {recipeId: selectedRecipeId});
            const data = await response.json();

            if (data.success) {
                // iOS success haptic
                if (isIOS) {
                    const {MobileHaptics} = await import('@/components/mobile/MobileHaptics');
                    await MobileHaptics.success();

                    const {NativeDialog} = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showSuccess({
                        title: 'Recipe Added',
                        message: data.message || 'Recipe added to collection successfully!'
                    });
                } else {
                    setSuccess(data.message);
                }

                // Update the collection in state
                setCollections(collections.map(collection =>
                    collection._id === collectionId ? data.collection : collection
                ));

                setTimeout(() => setSuccess(''), 3000);

                if (onCollectionUpdate) {
                    onCollectionUpdate();
                }
            } else {
                if (isIOS) {
                    const {MobileHaptics} = await import('@/components/mobile/MobileHaptics');
                    await MobileHaptics.error();

                    const {NativeDialog} = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Failed to Add Recipe',
                        message: data.error || 'Could not add recipe to collection. Please try again.'
                    });
                } else {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Failed to Add',
                        message: data.error || 'Failed to add recipe to collection'
                    });
                }
            }
        } catch (error) {
            console.error('Error adding recipe to collection:', error);

            if (isIOS) {
                const {MobileHaptics} = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.error();

                const {NativeDialog} = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Network Error',
                    message: 'Failed to add recipe to collection. Please try again.'
                });
            } else {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Network Error',
                    message: 'Failed to add recipe to collection'
                });
            }
        }
    };

    const handleDeleteCollection = async (collectionId) => {
        try {
            let confirmed = false;

            if (isIOS) {
                // Native iOS confirmation dialog
                const {NativeDialog} = await import('@/components/mobile/NativeDialog');
                const result = await NativeDialog.showConfirm({
                    title: 'Delete Collection',
                    message: 'Are you sure you want to delete this collection? This action cannot be undone.',
                    okButtonTitle: 'Delete',
                    cancelButtonTitle: 'Cancel',
                    onConfirm: () => true,
                    onCancel: () => false
                });
                confirmed = result.value;
            } else {
                // Web fallback
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                confirmed = await NativeDialog.showConfirm({
                    title: 'Delete Collection',
                    message: 'Are you sure you want to delete this collection? This action cannot be undone.',
                    confirmText: 'Delete',
                    cancelText: 'Cancel'
                });
            }

            if (!confirmed) return;

            // iOS delete action haptic
            if (isIOS) {
                const {MobileHaptics} = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.buttonTap();
            }

            const response = await apiDelete(`/api/collections/${collectionId}`);

            if (response.ok) {
                // iOS success haptic
                if (isIOS) {
                    const {MobileHaptics} = await import('@/components/mobile/MobileHaptics');
                    await MobileHaptics.success();

                    const {NativeDialog} = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showSuccess({
                        title: 'Collection Deleted',
                        message: 'Collection deleted successfully'
                    });
                } else {
                    setSuccess('Collection deleted successfully');
                }

                setCollections(collections.filter(collection => collection._id !== collectionId));
                setTimeout(() => setSuccess(''), 3000);

                if (onCollectionUpdate) {
                    onCollectionUpdate();
                }
            } else {
                const data = await response.json();

                if (isIOS) {
                    const {MobileHaptics} = await import('@/components/mobile/MobileHaptics');
                    await MobileHaptics.error();

                    const {NativeDialog} = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Delete Failed',
                        message: data.error || 'Failed to delete collection. Please try again.'
                    });
                } else {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Delete Failed',
                        message: data.error || 'Failed to delete collection'
                    });
                }
            }
        } catch (error) {
            console.error('Error deleting collection:', error);

            if (isIOS) {
                const {MobileHaptics} = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.error();

                const {NativeDialog} = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Network Error',
                    message: 'Failed to delete collection. Please check your connection and try again.'
                });
            } else {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Network Error',
                    message: 'Failed to delete collection'
                });
            }
        }
    };

    const isRecipeInCollection = (collection) => {
        if (!selectedRecipeId) return false;
        return collection.recipes.some(recipe =>
            recipe.recipeId?._id === selectedRecipeId || recipe.recipeId === selectedRecipeId
        );
    };

    const getUsageInfo = () => {
        if (!subscription || subscription.loading) {
            return {current: collections.length, limit: '...', tier: 'free'};
        }

        const tier = subscription.tier || 'free';
        const limits = {
            free: 2,
            gold: 10,
            platinum: -1,
            admin: -1
        };

        const limit = limits[tier] || limits.free;

        return {
            current: collections.length,
            limit: limit === -1 ? 'Unlimited' : limit,
            tier,
            isUnlimited: limit === -1 || tier === 'admin',
            isAtLimit: (limit !== -1 && tier !== 'admin') && collections.length >= limit,
            isNearLimit: (limit !== -1 && tier !== 'admin') && collections.length >= (limit * 0.8)
        };
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-16 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const usageInfo = getUsageInfo();

    return (
        <div className="space-y-6">
            {/* Header with Usage Info */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                        Recipe Collections ({(() => {
                        if (usageInfo.isUnlimited || usageInfo.tier === 'admin') {
                            return `${usageInfo.current}`;
                        }
                        return `${usageInfo.current}/${usageInfo.limit}`;
                    })()})
                    </h2>
                    {!subscription.loading && (
                        <p className="text-sm text-gray-600 mt-1">
                            {(() => {
                                if (usageInfo.isUnlimited || usageInfo.tier === 'admin') {
                                    return `Unlimited collections on ${usageInfo.tier} plan`;
                                } else if (usageInfo.isAtLimit) {
                                    return (
                                        <span className="text-red-600 font-medium">
                                You've reached your {usageInfo.tier} plan limit
                            </span>
                                    );
                                } else if (usageInfo.isNearLimit) {
                                    return (
                                        <span className="text-orange-600">
                                {typeof usageInfo.limit === 'number' ? usageInfo.limit - usageInfo.current : 0} collection{(usageInfo.limit - usageInfo.current) !== 1 ? 's' : ''} remaining
                            </span>
                                    );
                                } else {
                                    return `${typeof usageInfo.limit === 'number' ? usageInfo.limit - usageInfo.current : 0} collection${(usageInfo.limit - usageInfo.current) !== 1 ? 's' : ''} remaining on ${usageInfo.tier} plan`;
                                }
                            })()}
                        </p>
                    )}
                </div>

                {/* Create Collection Button */}
                {!showCreateForm && (
                    <TouchEnhancedButton
                        onClick={handleCreateCollectionClick}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                    >
                        📁 Create Collection
                    </TouchEnhancedButton>
                )}
            </div>

            {/* Usage Warning for Near Limit */}
            {usageInfo.isNearLimit && !usageInfo.isAtLimit && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <div className="text-orange-500 mr-3 mt-0.5">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd"
                                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                      clipRule="evenodd"/>
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-orange-800">
                                Approaching Collection Limit
                            </h3>
                            <p className="text-sm text-orange-700 mt-1">
                                You
                                have {usageInfo.limit - usageInfo.current} collection{usageInfo.limit - usageInfo.current !== 1 ? 's' : ''} remaining
                                on your {usageInfo.tier} plan.
                                {usageInfo.tier === 'free' && ' Upgrade to Gold for 10 collections or Platinum for unlimited.'}
                                {usageInfo.tier === 'gold' && ' Upgrade to Platinum for unlimited collections.'}
                            </p>
                            <TouchEnhancedButton
                                onClick={async () => {
                                    if (isIOS) {
                                        const {MobileHaptics} = await import('@/components/mobile/MobileHaptics');
                                        await MobileHaptics.buttonTap();
                                    }
                                    window.location.href = `/pricing?source=collection-warning&tier=${usageInfo.tier}`;
                                }}
                                className="mt-2 text-orange-600 hover:text-orange-800 underline text-sm"
                            >
                                View Upgrade Options
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>
            )}

            {/* At Limit Warning */}
            {usageInfo.isAtLimit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <div className="text-red-500 mr-3 mt-0.5">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                      clipRule="evenodd"/>
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-red-800">
                                Collection Limit Reached
                            </h3>
                            <p className="text-sm text-red-700 mt-1">
                                You've reached your {usageInfo.tier} plan limit of {usageInfo.limit} collections.
                                {usageInfo.tier === 'free' && ' Upgrade to Gold for 10 collections or Platinum for unlimited.'}
                                {usageInfo.tier === 'gold' && ' Upgrade to Platinum for unlimited collections.'}
                            </p>
                            <TouchEnhancedButton
                                onClick={async () => {
                                    if (isIOS) {
                                        const {MobileHaptics} = await import('@/components/mobile/MobileHaptics');
                                        await MobileHaptics.buttonTap();
                                    }
                                    window.location.href = `/pricing?source=collection-limit&tier=${usageInfo.tier}`;
                                }}
                                className="mt-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
                            >
                                🚀 Upgrade Now
                            </TouchEnhancedButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Success/Error Messages (web only) */}
            {!isIOS && error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="text-sm text-red-800">
                        <strong>Error:</strong> {error}
                    </div>
                </div>
            )}

            {!isIOS && success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-sm text-green-800">
                        <strong>Success:</strong> {success}
                    </div>
                </div>
            )}

            {/* Create Collection Form - Web Only */}
            {!isIOS && showCreateForm && (
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Collection</h3>

                    <form onSubmit={(e) => {
                        e.preventDefault();
                        handleCreateCollection(createFormData);
                    }} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Collection Name *
                            </label>
                            <NativeTextInput
                                type="text"
                                required
                                value={createFormData.name}
                                onChange={(e) => setCreateFormData({
                                    ...createFormData,
                                    name: e.target.value
                                })}
                                placeholder="e.g., Comfort Food Favorites"
                                maxLength={100}
                                validation={(value) => ({
                                    isValid: value && value.length >= 3 && value.length <= 100,
                                    message: value && value.length >= 3 && value.length <= 100
                                        ? 'Good collection name'
                                        : 'Name should be 3-100 characters'
                                })}
                                errorMessage="Collection name is required (3-100 characters)"
                                successMessage="Perfect collection name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description (Optional)
                            </label>
                            <NativeTextarea
                                value={createFormData.description}
                                onChange={(e) => setCreateFormData({
                                    ...createFormData,
                                    description: e.target.value
                                })}
                                placeholder="Describe this collection..."
                                rows={3}
                                maxLength={500}
                                autoExpand={true}
                                validation={(value) => ({
                                    isValid: true,
                                    message: value && value.length > 10 ? 'Great description' : ''
                                })}
                            />
                        </div>

                        <div>
                            <NativeCheckbox
                                name="isPublic"
                                checked={createFormData.isPublic}
                                onChange={(e) => setCreateFormData({
                                    ...createFormData,
                                    isPublic: e.target.checked
                                })}
                                label="Make this collection public"
                            />
                            <p className="text-sm text-gray-500 ml-8 mt-1">
                                Public collections can be viewed by other users
                            </p>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <TouchEnhancedButton
                                type="button"
                                onClick={() => {
                                    setShowCreateForm(false);
                                    setCreateFormData({name: '', description: '', isPublic: false});
                                    ;
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                type="submit"
                                disabled={creating || !createFormData.name.trim()}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center gap-2"
                            >
                                {creating ? (
                                    <>
                                        <div
                                            className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Creating...
                                    </>
                                ) : (
                                    '📁 Create Collection'
                                )}
                            </TouchEnhancedButton>
                        </div>
                    </form>
                </div>
            )}

            {/* Collections List */}
            {collections.length > 0 ? (
                <div className="space-y-4">
                    {collections.map((collection) => (
                        <div key={collection._id}
                             className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">

                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-lg font-medium text-gray-900">
                                            📁 {collection.name}
                                        </h3>
                                        {collection.isPublic && (
                                            <span
                                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                🌍 Public
                            </span>
                                        )}
                                        <span className="text-sm text-gray-500">
                                            ({collection.recipeCount || collection.recipes.length} recipes)
                                        </span>
                                    </div>

                                    {collection.description && (
                                        <p className="text-gray-600 text-sm mb-3">
                                            {collection.description}
                                        </p>
                                    )}

                                    {/* Recipe Preview */}
                                    {collection.recipes.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {collection.recipes.slice(0, 3).map((recipe, index) => (
                                                <span key={index}
                                                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                                    {recipe.recipeId?.title || 'Recipe'}
                                                </span>
                                            ))}
                                            {collection.recipes.length > 3 && (
                                                <span className="text-xs text-gray-500">
                                                    +{collection.recipes.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center space-x-2 ml-4">
                                    {/* Add Recipe to Collection Button */}
                                    {showAddToCollection && selectedRecipeId && (
                                        <TouchEnhancedButton
                                            onClick={() => handleAddRecipeToCollection(collection._id)}
                                            disabled={isRecipeInCollection(collection)}
                                            className={`px-3 py-1 text-sm rounded-md ${
                                                isRecipeInCollection(collection)
                                                    ? 'bg-green-100 text-green-800 cursor-not-allowed'
                                                    : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                                            }`}
                                        >
                                            {isRecipeInCollection(collection) ? '✓ Added' : '+ Add Recipe'}
                                        </TouchEnhancedButton>
                                    )}

                                    {/* View Collection Button */}
                                    <TouchEnhancedButton
                                        onClick={async () => {
                                            if (isIOS) {
                                                const {MobileHaptics} = await import('@/components/mobile/MobileHaptics');
                                                await MobileHaptics.buttonTap();
                                            }
                                            window.location.href = `/collections/${collection._id}`;
                                        }}
                                        className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
                                    >
                                        👀 View
                                    </TouchEnhancedButton>

                                    {/* Delete Collection Button */}
                                    <TouchEnhancedButton
                                        onClick={() => handleDeleteCollection(collection._id)}
                                        className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                                    >
                                        🗑️ Delete
                                    </TouchEnhancedButton>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <FeatureGate
                    feature={FEATURE_GATES.RECIPE_COLLECTIONS}
                    fallback={
                        <div className="text-center py-8">
                            <div className="text-gray-500 mb-4">
                                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24"
                                     stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Recipe Collections Available with Gold
                            </h3>
                            <p className="text-gray-500 mb-4">
                                Organize your recipes into collections like "Comfort Food", "Quick Dinners", or "Holiday
                                Recipes"
                            </p>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                <div className="text-sm text-yellow-800">
                                    <strong>🎯 Collection Features:</strong>
                                    <ul className="mt-2 space-y-1 text-left">
                                        <li>• <strong>Free:</strong> 2 recipe collections</li>
                                        <li>• <strong>Gold:</strong> 10 recipe collections</li>
                                        <li>• <strong>Platinum:</strong> Unlimited collections</li>
                                        <li>• Organize recipes by theme, cuisine, or occasion</li>
                                        <li>• Share collections publicly</li>
                                    </ul>
                                </div>
                            </div>
                            <TouchEnhancedButton
                                onClick={async () => {
                                    if (isIOS) {
                                        const {MobileHaptics} = await import('@/components/mobile/MobileHaptics');
                                        await MobileHaptics.buttonTap();
                                    }
                                    window.location.href = '/pricing?source=recipe-collections';
                                }}
                                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-md font-medium hover:from-yellow-500 hover:to-orange-600"
                            >
                                🚀 Upgrade to Unlock Collections
                            </TouchEnhancedButton>
                        </div>
                    }
                >
                    <div className="text-center py-8">
                        <div className="text-gray-500 mb-4">
                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No Collections Yet
                        </h3>
                        <p className="text-gray-500 mb-4">
                            Start organizing your recipes by creating your first collection
                        </p>
                        <TouchEnhancedButton
                            onClick={handleCreateCollectionClick}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700"
                        >
                            📁 Create Your First Collection
                        </TouchEnhancedButton>
                    </div>
                </FeatureGate>
            )}
        </div>
    );
};

export default RecipeCollections;