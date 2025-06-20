'use client';
// file: /src/app/profile/page.js v8 - Added comprehensive subscription gates and manual refresh

import {useState, useEffect, useRef, useCallback} from 'react';
import { useSafeSession } from '@/hooks/useSafeSession';
import {useRouter} from 'next/navigation';
import AccountDeletionModal from '@/components/profile/AccountDeletionModal';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { FEATURE_GATES } from '@/lib/subscription-config';
import { useFeatureGate } from '@/hooks/useSubscription';
import { getApiUrl } from '@/lib/api-config';

export default function ProfilePage() {
    let session = null;
    let status = 'loading';
    let update = () => Promise.resolve(null);

    try {
        const sessionResult = useSafeSession();
        session = sessionResult?.data || null;
        status = sessionResult?.status || 'loading';
        update = sessionResult?.update || (() => Promise.resolve(null));
    } catch (error) {
        // Mobile build fallback
        session = null;
        status = 'unauthenticated';
        update = () => Promise.resolve(null);
    }

    const router = useRouter();
    const fileInputRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState('general');
    const [showDeletionModal, setShowDeletionModal] = useState(false);

    // Feature gates
    const nutritionGoalsGate = useFeatureGate(FEATURE_GATES.NUTRITION_GOALS);
    const mealPlanningGate = useFeatureGate(FEATURE_GATES.CREATE_MEAL_PLAN);
    const emailNotificationsGate = useFeatureGate(FEATURE_GATES.EMAIL_NOTIFICATIONS);

    const [formData, setFormData] = useState({
        name: '',
        avatar: '',
        profile: {
            bio: '',
            cookingLevel: 'beginner',
            favoritesCuisines: []
        },
        notificationSettings: {
            email: {
                enabled: false,
                dailyDigest: false,
                expirationAlerts: true,
                daysBeforeExpiration: 3
            },
            dashboard: {
                showExpirationPanel: true,
                showQuickStats: true,
                alertThreshold: 7
            }
        },
        mealPlanningPreferences: {
            weekStartDay: 'monday',
            defaultMealTypes: ['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack'],
            planningHorizon: 'week',
            shoppingDay: 'sunday',
            mealPrepDays: ['sunday'],
            dietaryRestrictions: [],
            avoidIngredients: [],
            preferredCuisines: [],
            cookingTimePreference: 'any'
        },
        nutritionGoals: {
            dailyCalories: 2000,
            protein: 150,
            fat: 65,
            carbs: 250,
            fiber: 25,
            sodium: 2300
        }
    });

    // FIXED: Add string states for comma-separated inputs
    const [favoritesCuisinesString, setFavoritesCuisinesString] = useState('');
    const [dietaryRestrictionsString, setDietaryRestrictionsString] = useState('');
    const [avoidIngredientsString, setAvoidIngredientsString] = useState('');

    // Improved response parsing that handles both JSON and HTML responses
    const parseResponse = async (response) => {
        const contentType = response.headers.get('content-type');

        try {
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                // If not JSON, get text and try to extract error message
                const text = await response.text();
                console.error('Non-JSON response received:', text);

                // Try to extract error message from HTML
                if (text.includes('An error occurred')) {
                    return {error: 'Server error occurred. Please try again.'};
                } else if (text.includes('404')) {
                    return {error: 'API endpoint not found. Please refresh the page.'};
                } else if (text.includes('500')) {
                    return {error: 'Internal server error. Please try again later.'};
                } else {
                    return {error: 'Unexpected server response. Please try again.'};
                }
            }
        } catch (parseError) {
            console.error('Response parsing error:', parseError);
            return {error: 'Failed to parse server response. Please try again.'};
        }
    };

    // Helper function to compress image before upload
    const compressImage = (file, maxWidth = 300, maxHeight = 300, quality = 0.8) => {
        return new Promise((resolve, reject) => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();

                img.onload = () => {
                    try {
                        // Calculate new dimensions
                        let {width, height} = img;

                        if (width > height) {
                            if (width > maxWidth) {
                                height = (height * maxWidth) / width;
                                width = maxWidth;
                            }
                        } else {
                            if (height > maxHeight) {
                                width = (width * maxHeight) / height;
                                height = maxHeight;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;

                        // Draw and compress
                        ctx.drawImage(img, 0, 0, width, height);

                        canvas.toBlob((blob) => {
                            if (blob) {
                                resolve(blob);
                            } else {
                                reject(new Error('Failed to compress image'));
                            }
                        }, 'image/jpeg', quality);
                    } catch (canvasError) {
                        reject(new Error('Failed to process image: ' + canvasError.message));
                    }
                };

                img.onerror = () => {
                    reject(new Error('Failed to load image for compression'));
                };

                img.src = URL.createObjectURL(file);
            } catch (error) {
                reject(new Error('Image compression setup failed: ' + error.message));
            }
        });
    };

    // Improved file validation
    const validateFile = (file) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = 1 * 1024 * 1024; // 1MB for Vercel

        if (!file) {
            throw new Error('No file selected');
        }

        if (!allowedTypes.includes(file.type)) {
            throw new Error('Please select a valid image file (JPG, PNG, GIF, or WebP)');
        }

        if (file.size > maxSize) {
            throw new Error('Image must be smaller than 1MB. Please choose a smaller image.');
        }

        if (file.size === 0) {
            throw new Error('The selected file appears to be empty');
        }

        return true;
    };

    // Robust avatar upload with better error handling
    const handleAvatarUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        console.log('Starting avatar upload process...');
        setUploadingAvatar(true);
        setError('');
        setUploadProgress(0);

        try {
            // Validate file
            validateFile(file);
            setUploadProgress(10);

            console.log('File validated, starting compression check...');

            // Compress image if it's too large
            let processedFile = file;
            if (file.size > 500 * 1024) { // If larger than 500KB, compress
                console.log('Compressing image...');
                try {
                    processedFile = await compressImage(file);
                    console.log('Image compressed successfully');
                    setUploadProgress(30);
                } catch (compressionError) {
                    console.warn('Compression failed, using original file:', compressionError);
                    // Continue with original file if compression fails
                }
            }

            // Create form data
            const uploadFormData = new FormData();
            uploadFormData.append('avatar', processedFile);
            setUploadProgress(40);

            console.log('Starting upload request...');

            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                console.log('Upload timeout, aborting...');
                controller.abort();
            }, 30000); // 30 second timeout

            // Upload with progress simulation
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 3, 90));
            }, 800);

            let response;
            try {
                response = await fetch(getApiUrl('/api/user/avatar'), {
                    method: 'POST',
                    body: uploadFormData,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                clearInterval(progressInterval);
                setUploadProgress(95);

                console.log('Upload response received:', response.status, response.statusText);
            } catch (fetchError) {
                clearTimeout(timeoutId);
                clearInterval(progressInterval);

                if (fetchError.name === 'AbortError') {
                    throw new Error('Upload timed out. Please try with a smaller image.');
                }
                throw new Error('Network error during upload: ' + fetchError.message);
            }

            // Parse response with improved error handling
            const data = await parseResponse(response);
            console.log('Parsed response data:', data);

            if (response.ok && data.success) {
                // Update form data with new avatar
                setFormData(prev => ({...prev, avatar: data.avatarId}));

                // Update the session to reflect the new avatar
                try {
                    await update({avatar: data.avatarId});
                    console.log('Session updated with new avatar');
                } catch (sessionError) {
                    console.warn('Failed to update session:', sessionError);
                    // Don't fail the upload for this
                }

                setUploadProgress(100);
                setSuccess('Avatar updated successfully!');
                setTimeout(() => {
                    setSuccess('');
                    setUploadProgress(0);
                }, 3000);
            } else {
                throw new Error(data.error || 'Upload failed with unknown error');
            }

        } catch (error) {
            console.error('Avatar upload error:', error);
            setError(error.message || 'Failed to upload avatar. Please try again.');
            setUploadProgress(0);
        } finally {
            setUploadingAvatar(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Improved avatar removal
    const handleRemoveAvatar = async () => {
        console.log('Starting avatar removal...');
        setUploadingAvatar(true);
        setError('');

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                console.log('Remove timeout, aborting...');
                controller.abort();
            }, 10000); // 10 second timeout

            const response = await fetch(getApiUrl('/api/user/avatar'), {
                method: 'DELETE',
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            console.log('Remove response received:', response.status);

            const data = await parseResponse(response);

            if (response.ok && data.success) {
                setFormData(prev => ({...prev, avatar: ''}));

                try {
                    await update({avatar: ''});
                    console.log('Session updated - avatar removed');
                } catch (sessionError) {
                    console.warn('Failed to update session:', sessionError);
                }

                setSuccess('Avatar removed successfully!');
                setTimeout(() => setSuccess(''), 3000);
            } else {
                throw new Error(data.error || 'Failed to remove avatar');
            }
        } catch (error) {
            console.error('Avatar removal error:', error);
            if (error.name === 'AbortError') {
                setError('Request timed out. Please try again.');
            } else {
                setError(error.message || 'Failed to remove avatar. Please try again.');
            }
        } finally {
            setUploadingAvatar(false);
        }
    };

    // Redirect if not authenticated
    useEffect(() => {
        if (status === 'loading') return;
        if (!session) {
            router.push('/auth/signin');
        }
    }, [session, status, router]);

    // FIXED: Fetch profile data only on initial mount and manual refresh
    const fetchProfile = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(getApiUrl('/api/user/profile'));

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await parseResponse(response);

            if (data.error) {
                setError(data.error);
            } else {
                const userData = {
                    name: data.user?.name || '',
                    avatar: data.user?.avatar || '',
                    profile: {
                        bio: data.user?.profile?.bio || '',
                        cookingLevel: data.user?.profile?.cookingLevel || 'beginner',
                        favoritesCuisines: data.user?.profile?.favoritesCuisines || []
                    },
                    notificationSettings: data.user?.notificationSettings || formData.notificationSettings,
                    mealPlanningPreferences: {
                        ...formData.mealPlanningPreferences,
                        ...(data.user?.mealPlanningPreferences || {}),
                        // UPDATED: Apply migration for meal types
                        defaultMealTypes: migrateOldMealTypes(data.user?.mealPlanningPreferences?.defaultMealTypes)
                    },
                    nutritionGoals: data.user?.nutritionGoals || formData.nutritionGoals
                };

                setFormData(userData);

                // FIXED: Set string states for comma-separated fields
                setFavoritesCuisinesString(userData.profile.favoritesCuisines.join(', '));
                setDietaryRestrictionsString(userData.mealPlanningPreferences.dietaryRestrictions.join(', '));
                setAvoidIngredientsString(userData.mealPlanningPreferences.avoidIngredients.join(', '));
            }
        } catch (error) {
            console.error('Profile fetch error:', error);
            setError('Failed to load profile. Please refresh the page.');
        } finally {
            setLoading(false);
        }
    }, []);

    // FIXED: Only fetch profile on mount if user is authenticated
    useEffect(() => {
        if (session?.user?.id && status === 'authenticated') {
            fetchProfile();
        }
    }, []); // Empty dependency array to only run on mount

    // UPDATED: Migration function for existing users
    const migrateOldMealTypes = (mealTypes) => {
        const oldMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
        const newMealTypes = ['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack'];

        // If user has the old format, upgrade to new format
        if (mealTypes && mealTypes.length > 0 && mealTypes.every(type => oldMealTypes.includes(type.toLowerCase()))) {
            console.log('Migrating old meal types to new expanded format');
            return newMealTypes;
        }

        // If empty or undefined, return new default
        if (!mealTypes || mealTypes.length === 0) {
            return newMealTypes;
        }

        // Otherwise, keep existing selection
        return mealTypes;
    };

    // Manual refresh function
    const handleManualRefresh = async () => {
        setRefreshing(true);
        setError('');
        setSuccess('');

        try {
            await fetchProfile();
            setSuccess('Profile refreshed successfully!');
            setTimeout(() => setSuccess(''), 2000);
        } catch (error) {
            setError('Failed to refresh profile. Please try again.');
        } finally {
            setRefreshing(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            // FIXED: Process comma-separated strings before submitting
            const finalFormData = {
                ...formData,
                profile: {
                    ...formData.profile,
                    favoritesCuisines: favoritesCuisinesString
                        .split(',')
                        .map(item => item.trim())
                        .filter(item => item.length > 0)
                },
                mealPlanningPreferences: {
                    ...formData.mealPlanningPreferences,
                    dietaryRestrictions: dietaryRestrictionsString
                        .split(',')
                        .map(item => item.trim())
                        .filter(item => item.length > 0),
                    avoidIngredients: avoidIngredientsString
                        .split(',')
                        .map(item => item.trim())
                        .filter(item => item.length > 0)
                }
            };

            const response = await fetch(getApiUrl('/api/user/profile'), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(finalFormData),
            });

            const data = await parseResponse(response);

            if (response.ok && !data.error) {
                // Update the main form data with processed arrays
                setFormData(finalFormData);
                setSuccess('Profile updated successfully!');
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(data.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            setError('Network error. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleInputChange = (section, field, value) => {
        if (section === 'name') {
            setFormData(prev => ({...prev, name: value}));
        } else {
            setFormData(prev => ({
                ...prev,
                [section]: {
                    ...prev[section],
                    [field]: value
                }
            }));
        }
    };

    const handleNestedChange = (section, subsection, field, value) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [subsection]: {
                    ...prev[section][subsection],
                    [field]: value
                }
            }
        }));
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    // UPDATED: Tabs with conditional nutrition tab based on subscription
    const getAvailableTabs = () => {
        const baseTabs = [
            {id: 'general', name: 'General', icon: '👤'},
            {id: 'notifications', name: 'Notifications', icon: '🔔'},
            {id: 'meal-planning', name: 'Meal Planning', icon: '📅'},
            {id: 'security', name: 'Security', icon: '🔒'}
        ];

        // Add nutrition tab only for Gold+ users
        return [
            ...baseTabs.slice(0, 3), // general, notifications, meal-planning
            {id: 'nutrition', name: 'Nutrition Goals', icon: '🥗', requiresSubscription: true},
            baseTabs[3] // security
        ];
    };

    const tabs = getAvailableTabs();

    // UPDATED: New meal types array
    const availableMealTypes = ['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack'];

    return (
        <MobileOptimizedLayout>
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white shadow rounded-lg">
                        {/* Header with Refresh Button */}
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h1 className="text-2xl font-semibold text-gray-900">Profile Settings</h1>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Manage your account settings and preferences
                                    </p>
                                </div>
                                <TouchEnhancedButton
                                    onClick={handleManualRefresh}
                                    disabled={refreshing}
                                    className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <svg
                                        className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    <span className="text-sm">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                                </TouchEnhancedButton>
                            </div>
                        </div>

                        {/* Alert Messages */}
                        {error && (
                            <div className="mx-6 mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                <div className="flex items-start">
                                    <div className="mr-2">⚠️</div>
                                    <div>
                                        <strong>Error:</strong> {error}
                                        <div className="text-sm mt-1 text-red-600">
                                            If this problem persists, try refreshing the page or contact support.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {success && (
                            <div
                                className="mx-6 mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                                <div className="flex items-center">
                                    <div className="mr-2">✅</div>
                                    <div>{success}</div>
                                </div>
                            </div>
                        )}

                        {/* Tab Navigation - UPDATED with subscription-aware tabs */}
                        <div className="bg-gray-50 border-b border-gray-200">
                            <div className="px-4 sm:px-6 py-4">
                                <nav className="profile-tabs-grid grid gap-3">
                                    {tabs.map((tab) => (
                                        <FeatureGate
                                            key={tab.id}
                                            feature={tab.requiresSubscription ? FEATURE_GATES.NUTRITION_GOALS : null}
                                            fallback={
                                                tab.requiresSubscription ? (
                                                    <div className="profile-tab-button group relative flex flex-col items-center justify-center p-4 rounded-xl border-2 border-gray-100 min-h-[80px] opacity-50">
                                                        <div className="absolute top-1 right-1 text-xs bg-yellow-100 text-yellow-800 px-1 rounded-full">
                                                            Gold
                                                        </div>
                                                        <div className="profile-tab-icon flex items-center justify-center w-8 h-8 rounded-full mb-2 bg-gray-100">
                                                            <span className="text-lg">{tab.icon}</span>
                                                        </div>
                                                        <span className="profile-tab-text text-xs sm:text-sm font-medium text-center leading-tight text-gray-400">
                                                            {tab.name}
                                                        </span>
                                                    </div>
                                                ) : null
                                            }
                                        >
                                            <TouchEnhancedButton
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`profile-tab-button group relative flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-200 touch-friendly min-h-[80px] ${
                                                    activeTab === tab.id
                                                        ? 'bg-white text-indigo-700 shadow-lg border-2 border-indigo-200 transform scale-105 active'
                                                        : 'bg-white text-gray-600 hover:text-gray-800 hover:shadow-md border-2 border-gray-100 hover:border-gray-200'
                                                }`}
                                            >
                                                {activeTab === tab.id && (
                                                    <div
                                                        className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full"></div>
                                                )}

                                                <div
                                                    className={`profile-tab-icon flex items-center justify-center w-8 h-8 rounded-full mb-2 transition-all ${
                                                        activeTab === tab.id
                                                            ? 'bg-indigo-100'
                                                            : 'bg-gray-100 group-hover:bg-gray-200'
                                                    }`}>
                                                    <span className="text-lg">{tab.icon}</span>
                                                </div>

                                                <span
                                                    className="profile-tab-text text-xs sm:text-sm font-medium text-center leading-tight">
                                                    {tab.name}
                                                </span>
                                            </TouchEnhancedButton>
                                        </FeatureGate>
                                    ))}
                                </nav>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="p-6">
                                {/* General Tab */}
                                {activeTab === 'general' && (
                                    <div className="space-y-6">
                                        {/* Avatar Section - Enhanced with Better Error Display */}
                                        <div className="flex flex-col items-center space-y-4">
                                            <div className="relative">
                                                <div
                                                    className="w-24 h-24 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center">
                                                    {formData.avatar ? (
                                                        <img
                                                            src={`/api/user/avatar/${formData.avatar}`}
                                                            alt="Profile Avatar"
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                console.log('Avatar image failed to load');
                                                                e.target.style.display = 'none';
                                                                e.target.nextElementSibling.style.display = 'flex';
                                                            }}
                                                        />
                                                    ) : null}
                                                    {/* Fallback display */}
                                                    <span
                                                        className="text-indigo-600 text-2xl font-medium"
                                                        style={{display: formData.avatar ? 'none' : 'flex'}}
                                                    >
                                                        {session?.user?.name?.[0]?.toUpperCase() || 'U'}
                                                    </span>
                                                </div>

                                                {/* Upload Progress Overlay */}
                                                {uploadingAvatar && (
                                                    <div
                                                        className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                                                        <div className="text-center">
                                                            <div
                                                                className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-1"></div>
                                                            {uploadProgress > 0 && (
                                                                <div
                                                                    className="text-white text-xs font-medium">{uploadProgress}%</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col items-center space-y-2">
                                                <TouchEnhancedButton
                                                    type="button"
                                                    onClick={() => {
                                                        if (fileInputRef.current) {
                                                            fileInputRef.current.click();
                                                        }
                                                    }}
                                                    disabled={uploadingAvatar}
                                                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-indigo-400 touch-friendly"
                                                >
                                                    {uploadingAvatar ? 'Uploading...' : 'Change Avatar'}
                                                </TouchEnhancedButton>

                                                {formData.avatar && !uploadingAvatar && (
                                                    <TouchEnhancedButton
                                                        type="button"
                                                        onClick={handleRemoveAvatar}
                                                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 touch-friendly text-sm"
                                                    >
                                                        Remove Avatar
                                                    </TouchEnhancedButton>
                                                )}

                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleAvatarUpload}
                                                    className="hidden"
                                                />
                                                <p className="text-xs text-gray-500 text-center">
                                                    JPG, PNG, GIF or WebP. Max 1MB.<br/>
                                                    Large images will be automatically compressed.<br/>
                                                    Loading % may pause at 90%, just let it finish.
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Full Name
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => handleInputChange('name', null, e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                style={{fontSize: '16px'}}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Email Address
                                            </label>
                                            <input
                                                type="email"
                                                value={session.user.email}
                                                disabled
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-500"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Email address cannot be changed
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Bio
                                            </label>
                                            <textarea
                                                value={formData.profile.bio}
                                                onChange={(e) => handleInputChange('profile', 'bio', e.target.value)}
                                                rows={3}
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                style={{fontSize: '16px'}}
                                                placeholder="Tell us a little about yourself..."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Cooking Level
                                            </label>
                                            <select
                                                value={formData.profile.cookingLevel}
                                                onChange={(e) => handleInputChange('profile', 'cookingLevel', e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                style={{fontSize: '16px'}}
                                            >
                                                <option value="beginner">Beginner</option>
                                                <option value="intermediate">Intermediate</option>
                                                <option value="advanced">Advanced</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Favorite Cuisines
                                            </label>
                                            <input
                                                type="text"
                                                value={favoritesCuisinesString}
                                                onChange={(e) => setFavoritesCuisinesString(e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                style={{fontSize: '16px'}}
                                                placeholder="Italian, Mexican, Asian, etc. (separate with commas)"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Separate multiple cuisines with commas
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Notifications Tab */}
                                {activeTab === 'notifications' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>

                                            {/* Email Notifications */}
                                            <div className="space-y-4">
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <h4 className="text-sm font-semibold text-gray-800 mb-3">📧 Email Notifications</h4>

                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <label className="text-sm font-medium text-gray-700">
                                                                    Enable Email Notifications
                                                                </label>
                                                                <p className="text-xs text-gray-500">
                                                                    Receive general notifications via email
                                                                </p>
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.notificationSettings.email.enabled}
                                                                onChange={(e) => handleNestedChange('notificationSettings', 'email', 'enabled', e.target.checked)}
                                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                            />
                                                        </div>

                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <label className="text-sm font-medium text-gray-700">
                                                                    Daily Digest
                                                                </label>
                                                                <p className="text-xs text-gray-500">
                                                                    Summary of your inventory and meal plans
                                                                </p>
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.notificationSettings.email.dailyDigest}
                                                                onChange={(e) => handleNestedChange('notificationSettings', 'email', 'dailyDigest', e.target.checked)}
                                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                            />
                                                        </div>

                                                        {/* FEATURE GATED: Expiration Alerts - Gold+ only */}
                                                        <FeatureGate
                                                            feature={FEATURE_GATES.EMAIL_NOTIFICATIONS}
                                                            fallback={
                                                                <div className="flex items-center justify-between opacity-50">
                                                                    <div className="flex-1">
                                                                        <label className="text-sm font-medium text-gray-400">
                                                                            Expiration Alerts 🔒
                                                                        </label>
                                                                        <p className="text-xs text-gray-400">
                                                                            Email alerts when food is about to expire
                                                                        </p>
                                                                        <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded mt-1 inline-block">
                                                                            Gold+ Feature
                                                                        </div>
                                                                    </div>
                                                                    <input
                                                                        type="checkbox"
                                                                        disabled
                                                                        className="h-4 w-4 text-gray-300 border-gray-300 rounded cursor-not-allowed"
                                                                    />
                                                                </div>
                                                            }
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <label className="text-sm font-medium text-gray-700">
                                                                        Expiration Alerts
                                                                    </label>
                                                                    <p className="text-xs text-gray-500">
                                                                        Email alerts when food is about to expire
                                                                    </p>
                                                                </div>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.notificationSettings.email.expirationAlerts}
                                                                    onChange={(e) => handleNestedChange('notificationSettings', 'email', 'expirationAlerts', e.target.checked)}
                                                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                                />
                                                            </div>

                                                            {formData.notificationSettings.email.expirationAlerts && (
                                                                <div className="ml-4 mt-2">
                                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                        Days before expiration to send alerts
                                                                    </label>
                                                                    <select
                                                                        value={formData.notificationSettings.email.daysBeforeExpiration}
                                                                        onChange={(e) => handleNestedChange('notificationSettings', 'email', 'daysBeforeExpiration', parseInt(e.target.value))}
                                                                        className="block w-24 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                    >
                                                                        <option value={1}>1 day</option>
                                                                        <option value={2}>2 days</option>
                                                                        <option value={3}>3 days</option>
                                                                        <option value={5}>5 days</option>
                                                                        <option value={7}>7 days</option>
                                                                    </select>
                                                                </div>
                                                            )}
                                                        </FeatureGate>
                                                    </div>
                                                </div>

                                                {/* Dashboard Notifications */}
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <h4 className="text-sm font-semibold text-gray-800 mb-3">📱 Dashboard Notifications</h4>

                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <label className="text-sm font-medium text-gray-700">
                                                                    Show Expiration Panel
                                                                </label>
                                                                <p className="text-xs text-gray-500">
                                                                    Display expiring items on dashboard
                                                                </p>
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.notificationSettings.dashboard.showExpirationPanel}
                                                                onChange={(e) => handleNestedChange('notificationSettings', 'dashboard', 'showExpirationPanel', e.target.checked)}
                                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                            />
                                                        </div>

                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <label className="text-sm font-medium text-gray-700">
                                                                    Show Quick Stats
                                                                </label>
                                                                <p className="text-xs text-gray-500">
                                                                    Display inventory statistics on dashboard
                                                                </p>
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.notificationSettings.dashboard.showQuickStats}
                                                                onChange={(e) => handleNestedChange('notificationSettings', 'dashboard', 'showQuickStats', e.target.checked)}
                                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                            />
                                                        </div>

                                                        {formData.notificationSettings.dashboard.showExpirationPanel && (
                                                            <div className="ml-0 mt-3">
                                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                    Alert threshold (days until expiration)
                                                                </label>
                                                                <select
                                                                    value={formData.notificationSettings.dashboard.alertThreshold}
                                                                    onChange={(e) => handleNestedChange('notificationSettings', 'dashboard', 'alertThreshold', parseInt(e.target.value))}
                                                                    className="block w-24 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                >
                                                                    <option value={3}>3 days</option>
                                                                    <option value={5}>5 days</option>
                                                                    <option value={7}>7 days</option>
                                                                    <option value={14}>14 days</option>
                                                                </select>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Meal Planning Tab */}
                                {activeTab === 'meal-planning' && (
                                    <FeatureGate
                                        feature={FEATURE_GATES.CREATE_MEAL_PLAN}
                                        fallback={
                                            <div className="text-center py-12">
                                                <div className="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                                                    <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-xl font-semibold text-gray-900 mb-2">Unlock Meal Planning</h3>
                                                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                                    Meal planning preferences are available with Gold and Platinum subscriptions. Plan your meals, set dietary restrictions, and customize your cooking experience.
                                                </p>
                                                <TouchEnhancedButton
                                                    onClick={() => window.location.href = '/pricing?source=profile&feature=meal-planning'}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
                                                >
                                                    Upgrade to Gold
                                                </TouchEnhancedButton>
                                            </div>
                                        }
                                    >
                                        <div className="space-y-6">
                                            <div>
                                                <h3 className="text-lg font-medium text-gray-900 mb-4">Meal Planning Preferences</h3>

                                                {/* Basic Meal Planning Settings - Gold+ */}
                                                <div className="space-y-4">
                                                    <div className="bg-gray-50 p-4 rounded-lg">
                                                        <h4 className="text-sm font-semibold text-gray-800 mb-3">📅 Planning Settings</h4>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Week Start Day
                                                                </label>
                                                                <select
                                                                    value={formData.mealPlanningPreferences.weekStartDay}
                                                                    onChange={(e) => handleInputChange('mealPlanningPreferences', 'weekStartDay', e.target.value)}
                                                                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                    style={{fontSize: '16px'}}
                                                                >
                                                                    <option value="sunday">Sunday</option>
                                                                    <option value="monday">Monday</option>
                                                                </select>
                                                            </div>

                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Planning Horizon
                                                                </label>
                                                                <select
                                                                    value={formData.mealPlanningPreferences.planningHorizon}
                                                                    onChange={(e) => handleInputChange('mealPlanningPreferences', 'planningHorizon', e.target.value)}
                                                                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                    style={{fontSize: '16px'}}
                                                                >
                                                                    <option value="week">1 Week</option>
                                                                    {mealPlanningGate.tier === 'gold' && <option value="2weeks">2 Weeks (Gold Max)</option>}
                                                                    {mealPlanningGate.isPlatinum && (
                                                                        <>
                                                                            <option value="2weeks">2 Weeks</option>
                                                                            <option value="month">1 Month</option>
                                                                            <option value="custom">Custom</option>
                                                                        </>
                                                                    )}
                                                                </select>
                                                                {mealPlanningGate.tier === 'gold' && (
                                                                    <p className="text-xs text-amber-600 mt-1">
                                                                        Upgrade to Platinum for unlimited planning horizon
                                                                    </p>
                                                                )}
                                                            </div>

                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Shopping Day
                                                                </label>
                                                                <select
                                                                    value={formData.mealPlanningPreferences.shoppingDay}
                                                                    onChange={(e) => handleInputChange('mealPlanningPreferences', 'shoppingDay', e.target.value)}
                                                                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                    style={{fontSize: '16px'}}
                                                                >
                                                                    <option value="sunday">Sunday</option>
                                                                    <option value="monday">Monday</option>
                                                                    <option value="tuesday">Tuesday</option>
                                                                    <option value="wednesday">Wednesday</option>
                                                                    <option value="thursday">Thursday</option>
                                                                    <option value="friday">Friday</option>
                                                                    <option value="saturday">Saturday</option>
                                                                </select>
                                                            </div>

                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Cooking Time Preference
                                                                </label>
                                                                <select
                                                                    value={formData.mealPlanningPreferences.cookingTimePreference}
                                                                    onChange={(e) => handleInputChange('mealPlanningPreferences', 'cookingTimePreference', e.target.value)}
                                                                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                    style={{fontSize: '16px'}}
                                                                >
                                                                    <option value="any">Any</option>
                                                                    <option value="quick">Quick (Under 30 min)</option>
                                                                    <option value="moderate">Moderate (30-60 min)</option>
                                                                    <option value="extended">Extended (60+ min)</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Meal Types */}
                                                    <div className="bg-gray-50 p-4 rounded-lg">
                                                        <h4 className="text-sm font-semibold text-gray-800 mb-3">🍽️ Default Meal Types</h4>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                            {availableMealTypes.map(mealType => (
                                                                <label key={mealType} className="flex items-center space-x-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={formData.mealPlanningPreferences.defaultMealTypes.includes(mealType)}
                                                                        onChange={(e) => {
                                                                            const currentTypes = formData.mealPlanningPreferences.defaultMealTypes;
                                                                            const newTypes = e.target.checked
                                                                                ? [...currentTypes, mealType]
                                                                                : currentTypes.filter(type => type !== mealType);
                                                                            handleInputChange('mealPlanningPreferences', 'defaultMealTypes', newTypes);
                                                                        }}
                                                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                                    />
                                                                    <span className="text-sm text-gray-700">{mealType}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Meal Prep Days */}
                                                    <div className="bg-gray-50 p-4 rounded-lg">
                                                        <h4 className="text-sm font-semibold text-gray-800 mb-3">📦 Meal Prep Days</h4>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                            {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => (
                                                                <label key={day} className="flex items-center space-x-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={formData.mealPlanningPreferences.mealPrepDays.includes(day)}
                                                                        onChange={(e) => {
                                                                            const currentDays = formData.mealPlanningPreferences.mealPrepDays;
                                                                            const newDays = e.target.checked
                                                                                ? [...currentDays, day]
                                                                                : currentDays.filter(d => d !== day);
                                                                            handleInputChange('mealPlanningPreferences', 'mealPrepDays', newDays);
                                                                        }}
                                                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                                    />
                                                                    <span className="text-sm text-gray-700 capitalize">{day}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Dietary Restrictions - Platinum Only */}
                                                    <div className="bg-gray-50 p-4 rounded-lg">
                                                        <h4 className="text-sm font-semibold text-gray-800 mb-3">🥗 Dietary Preferences</h4>

                                                        {mealPlanningGate.isPlatinum ? (
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                        Dietary Restrictions
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={dietaryRestrictionsString}
                                                                        onChange={(e) => setDietaryRestrictionsString(e.target.value)}
                                                                        className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                        style={{fontSize: '16px'}}
                                                                        placeholder="Vegetarian, Gluten-Free, Dairy-Free, etc."
                                                                    />
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        Separate multiple restrictions with commas
                                                                    </p>
                                                                </div>

                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                        Ingredients to Avoid
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={avoidIngredientsString}
                                                                        onChange={(e) => setAvoidIngredientsString(e.target.value)}
                                                                        className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                        style={{fontSize: '16px'}}
                                                                        placeholder="Nuts, Shellfish, Mushrooms, etc."
                                                                    />
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        Separate multiple ingredients with commas
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-center py-6 border-2 border-dashed border-purple-200 rounded-lg">
                                                                <div className="text-purple-600 mb-2">
                                                                    <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                                    </svg>
                                                                </div>
                                                                <h5 className="font-semibold text-gray-900 mb-1">Platinum Feature</h5>
                                                                <p className="text-sm text-gray-600 mb-3">
                                                                    Set dietary restrictions and ingredients to avoid with Platinum
                                                                </p>
                                                                <TouchEnhancedButton
                                                                    onClick={() => window.location.href = '/pricing?source=profile&feature=dietary-restrictions'}
                                                                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                                                                >
                                                                    Upgrade to Platinum
                                                                </TouchEnhancedButton>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </FeatureGate>
                                )}

                                {/* Nutrition Goals Tab */}
                                {activeTab === 'nutrition' && (
                                    <FeatureGate
                                        feature={FEATURE_GATES.NUTRITION_GOALS}
                                        fallback={
                                            <div className="text-center py-12">
                                                <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
                                                    <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-xl font-semibold text-gray-900 mb-2">Unlock Nutrition Goals</h3>
                                                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                                    Set personalized nutrition goals and track your daily intake with Gold and Platinum subscriptions. Monitor calories, macros, and micronutrients.
                                                </p>
                                                <TouchEnhancedButton
                                                    onClick={() => window.location.href = '/pricing?source=profile&feature=nutrition-goals'}
                                                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold"
                                                >
                                                    Upgrade to Gold
                                                </TouchEnhancedButton>
                                            </div>
                                        }
                                    >
                                        <div className="space-y-6">
                                            <div>
                                                <h3 className="text-lg font-medium text-gray-900 mb-4">Nutrition Goals</h3>

                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <h4 className="text-sm font-semibold text-gray-800 mb-4">🎯 Daily Nutrition Targets</h4>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Daily Calories
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={formData.nutritionGoals.dailyCalories}
                                                                onChange={(e) => handleInputChange('nutritionGoals', 'dailyCalories', parseInt(e.target.value) || 0)}
                                                                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                style={{fontSize: '16px'}}
                                                                min="1000"
                                                                max="5000"
                                                            />
                                                            <p className="text-xs text-gray-500 mt-1">Recommended: 1,500-3,000 calories</p>
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Protein (grams)
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={formData.nutritionGoals.protein}
                                                                onChange={(e) => handleInputChange('nutritionGoals', 'protein', parseInt(e.target.value) || 0)}
                                                                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                style={{fontSize: '16px'}}
                                                                min="20"
                                                                max="300"
                                                            />
                                                            <p className="text-xs text-gray-500 mt-1">Recommended: 50-200g</p>
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Fat (grams)
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={formData.nutritionGoals.fat}
                                                                onChange={(e) => handleInputChange('nutritionGoals', 'fat', parseInt(e.target.value) || 0)}
                                                                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                style={{fontSize: '16px'}}
                                                                min="20"
                                                                max="200"
                                                            />
                                                            <p className="text-xs text-gray-500 mt-1">Recommended: 44-78g</p>
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Carbohydrates (grams)
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={formData.nutritionGoals.carbs}
                                                                onChange={(e) => handleInputChange('nutritionGoals', 'carbs', parseInt(e.target.value) || 0)}
                                                                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                style={{fontSize: '16px'}}
                                                                min="50"
                                                                max="500"
                                                            />
                                                            <p className="text-xs text-gray-500 mt-1">Recommended: 130-300g</p>
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Fiber (grams)
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={formData.nutritionGoals.fiber}
                                                                onChange={(e) => handleInputChange('nutritionGoals', 'fiber', parseInt(e.target.value) || 0)}
                                                                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                style={{fontSize: '16px'}}
                                                                min="10"
                                                                max="60"
                                                            />
                                                            <p className="text-xs text-gray-500 mt-1">Recommended: 25-35g</p>
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Sodium (mg)
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={formData.nutritionGoals.sodium}
                                                                onChange={(e) => handleInputChange('nutritionGoals', 'sodium', parseInt(e.target.value) || 0)}
                                                                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                style={{fontSize: '16px'}}
                                                                min="1000"
                                                                max="4000"
                                                            />
                                                            <p className="text-xs text-gray-500 mt-1">Recommended: Less than 2,300mg</p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                        <p className="text-sm text-blue-800">
                                                            💡 <strong>Tip:</strong> These goals will be used to track your progress in meal plans and recipe nutrition analysis. Consult with a healthcare provider for personalized nutrition advice.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </FeatureGate>
                                )}

                                {/* Security Tab */}
                                {activeTab === 'security' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>

                                            <div className="space-y-4">
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <h4 className="text-sm font-semibold text-gray-800 mb-3">🔐 Password & Authentication</h4>

                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <h5 className="text-sm font-medium text-gray-700">Change Password</h5>
                                                                <p className="text-xs text-gray-500">Update your account password</p>
                                                            </div>
                                                            <TouchEnhancedButton
                                                                onClick={() => router.push('/auth/change-password')}
                                                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                                                            >
                                                                Change Password
                                                            </TouchEnhancedButton>
                                                        </div>

                                                        <hr className="border-gray-200" />

                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <h5 className="text-sm font-medium text-gray-700">Current Email</h5>
                                                                <p className="text-xs text-gray-500">{session.user.email}</p>
                                                            </div>
                                                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                                                ✓ Verified
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                                    <h4 className="text-sm font-semibold text-red-800 mb-3">⚠️ Danger Zone</h4>

                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <h5 className="text-sm font-medium text-red-700">Delete Account</h5>
                                                                <p className="text-xs text-red-600">
                                                                    Permanently delete your account and all data. This action cannot be undone.
                                                                </p>
                                                            </div>
                                                            <TouchEnhancedButton
                                                                onClick={() => setShowDeletionModal(true)}
                                                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                                                            >
                                                                Delete Account
                                                            </TouchEnhancedButton>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Save Button */}
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                                <TouchEnhancedButton
                                    type="button"
                                    onClick={() => router.push('/dashboard')}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-md font-medium"
                                >
                                    Cancel
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    type="submit"
                                    disabled={saving}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium disabled:bg-indigo-400"
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </TouchEnhancedButton>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Account Deletion Modal */}
                {showDeletionModal && (
                    <AccountDeletionModal
                        isOpen={showDeletionModal}
                        onClose={() => setShowDeletionModal(false)}
                        user={session.user}
                    />
                )}

                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}