'use client';
// file: /src/app/profile/page.js v10 - Added currency preferences to General tab

import {useState, useEffect, useRef, useCallback} from 'react';
import { useSafeSession } from '@/hooks/useSafeSession';
import {useRouter} from 'next/navigation';
import AccountDeletionModal from '@/components/profile/AccountDeletionModal';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';
import FeatureGate from '@/components/subscription/FeatureGate';
import { FEATURE_GATES } from '@/lib/subscription-config';
import { useFeatureGate } from '@/hooks/useSubscription';
import { getApiUrl } from "@/lib/api-config";
import { apiGet, apiPut, apiDelete, fetchWithSession } from '@/lib/api-config';
import { NutritionGoalsTracking } from '@/components/integrations/NutritionGoalsTracking';
import { SUPPORTED_CURRENCIES, formatCurrencyExample } from '@/lib/currency-utils';
import {
    NativeTextInput,
    NativeSelect,
    NativeTextarea,
    ValidationPatterns
} from '@/components/forms/NativeIOSFormComponents';
import { PlatformDetection } from "@/utils/PlatformDetection.js";
import NativeNavigation from "@/components/mobile/NativeNavigation.js";

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
        // NEW: Add inventory preferences
        inventoryPreferences: {
            defaultSortBy: 'expiration',
            defaultFilterStatus: 'all',
            defaultFilterLocation: 'all',
            showQuickFilters: true,
            itemsPerPage: 'all',
            compactView: false
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
        },
        // NEW: Add currency preferences
        currencyPreferences: {
            currency: 'USD',
            currencySymbol: '$',
            currencyPosition: 'before',
            showCurrencyCode: false,
            decimalPlaces: 2
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

    const handleNutritionGoalsSync = useCallback(async (newGoals) => {
        try {
            console.log('🎯 Syncing nutrition goals with profile:', newGoals);

            // Update the local form data immediately for UI responsiveness
            setFormData(prev => ({
                ...prev,
                nutritionGoals: newGoals
            }));

            // Show success feedback
            setSuccess('Nutrition goals updated and synced with profile!');
            setTimeout(() => setSuccess(''), 3000);

            return Promise.resolve();
        } catch (error) {
            console.error('🎯 Error syncing nutrition goals:', error);
            throw error;
        }
    }, []);

    // NEW: Handle currency change
    const handleCurrencyChange = (currencyCode) => {
        const currencyInfo = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
        if (currencyInfo) {
            setFormData(prev => ({
                ...prev,
                currencyPreferences: {
                    ...prev.currencyPreferences,
                    currency: currencyCode,
                    currencySymbol: currencyInfo.symbol,
                    currencyPosition: currencyInfo.position,
                    decimalPlaces: currencyInfo.decimalPlaces
                }
            }));
        }
    };

    // NEW: Get example price for currency preview
    const getCurrencyPreviewPrice = () => {
        const { currencySymbol, currencyPosition, decimalPlaces, showCurrencyCode, currency } = formData.currencyPreferences;
        const amount = decimalPlaces === 0 ? '1234' : '12.34';
        const formatted = formatCurrencyExample(amount, currencyPosition, currencySymbol);
        return showCurrencyCode ? `${formatted} ${currency}` : formatted;
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
    const validateFile = async (file) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = 1024 * 1024; // 1MB for Vercel

        if (!file) {
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'No File Selected',
                message: 'No file selected'
            });
            return;
        }

        if (!allowedTypes.includes(file.type)) {
            const {NativeDialog} = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Invalid File',
                message: 'Please select a valid image file (JPG, PNG, GIF, or WebP)'
            });
            return;
        }

        if (file.size > maxSize) {
            const {NativeDialog} = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'File Too Large',
                message: 'Image must be smaller than 1MB. Please choose a smaller image.'
            });
            return;
        }

        if (file.size === 0) {
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Empty File',
                message: 'The selected file appears to be empty'
            });
            return;
        }

        return true;
    };

    // Robust avatar upload with better error handling
    const handleAvatarUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        console.log('Starting avatar upload process...');
        setUploadingAvatar(true);
        setUploadProgress(0);

        try {
            // Validate file
            await validateFile(file);
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
                const response = await fetchWithSession('/api/user/avatar', {
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

                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                if (fetchError.name === 'AbortError') {
                    await NativeDialog.showError({
                        title: 'Upload Timeout',
                        message: 'Upload timed out. Please try with a smaller image.'
                    });
                } else {
                    await NativeDialog.showError({
                        title: 'Network Error',
                        message: 'Network error during upload: ' + fetchError.message
                    });
                }
                return;
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
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Upload Failed',
                    message: data.error || 'Upload failed with unknown error'
                });
                return;
            }

        } catch (error) {
            console.error('Avatar upload error:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Upload Failed',
                message: 'Failed to upload avatar. Please try again.'
            });
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

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                console.log('Remove timeout, aborting...');
                controller.abort();
            }, 10000); // 10 second timeout

            const response = await apiDelete('/api/user/avatar', {
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
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Remove Failed',
                    message: data.error || 'Failed to remove avatar'
                });
                return;
            }
        } catch (error) {
            console.error('Avatar removal error:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            if (error.name === 'AbortError') {
                await NativeDialog.showError({
                    title: 'Request Timeout',
                    message: 'Request timed out. Please try again.'
                });
            } else {
                await NativeDialog.showError({
                    title: 'Avatar Removal Failed',
                    message: error.message || 'Failed to remove avatar. Please try again.'
                });
            }
        } finally {
            setUploadingAvatar(false);
        }
    };

    // Redirect if not authenticated
    useEffect(() => {
        if (status === 'loading') return;
        if (!session) {
            NativeNavigation.routerPush(router, '/auth/signin');
        }
    }, [session, status, router]);

    // FIXED: Fetch profile data only on initial mount and manual refresh
    const fetchProfile = useCallback(async () => {
        try {
            setLoading(true);
            const response = await apiGet('/api/user/profile');

            if (!response.ok) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'HTTP Error',
                    message: `HTTP error! status: ${response.status}`
                });
                return;
            }

            const data = await parseResponse(response);

            if (data.error) {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Error',
                    message: data.error
                });
            } else {
                // **FIXED: Use static default values instead of formData**
                const defaultNotificationSettings = {
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
                };

                const defaultMealPlanningPreferences = {
                    weekStartDay: 'monday',
                    defaultMealTypes: ['Breakfast', 'AM Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'PM Snack'],
                    planningHorizon: 'week',
                    shoppingDay: 'sunday',
                    mealPrepDays: ['sunday'],
                    dietaryRestrictions: [],
                    avoidIngredients: [],
                    preferredCuisines: [],
                    cookingTimePreference: 'any'
                };

                const defaultNutritionGoals = {
                    dailyCalories: 2000,
                    protein: 150,
                    fat: 65,
                    carbs: 250,
                    fiber: 25,
                    sodium: 2300
                };

                const defaultInventoryPreferences = {
                    defaultSortBy: 'expiration',
                    defaultFilterStatus: 'all',
                    defaultFilterLocation: 'all',
                    showQuickFilters: true,
                    itemsPerPage: 'all',
                    compactView: false
                };

                // NEW: Default currency preferences
                const defaultCurrencyPreferences = {
                    currency: 'USD',
                    currencySymbol: '$',
                    currencyPosition: 'before',
                    showCurrencyCode: false,
                    decimalPlaces: 2
                };

                const userData = {
                    name: data.user?.name || '',
                    avatar: data.user?.avatar || '',
                    profile: {
                        bio: data.user?.profile?.bio || '',
                        cookingLevel: data.user?.profile?.cookingLevel || 'beginner',
                        favoritesCuisines: data.user?.profile?.favoritesCuisines || []
                    },
                    // NEW: Include inventory preferences
                    inventoryPreferences: data.user?.inventoryPreferences || defaultInventoryPreferences,
                    notificationSettings: data.user?.notificationSettings || defaultNotificationSettings,
                    mealPlanningPreferences: {
                        ...defaultMealPlanningPreferences,
                        ...(data.user?.mealPlanningPreferences || {}),
                        // UPDATED: Apply migration for meal types
                        defaultMealTypes: migrateOldMealTypes(data.user?.mealPlanningPreferences?.defaultMealTypes)
                    },
                    nutritionGoals: data.user?.nutritionGoals || defaultNutritionGoals,
                    // NEW: Include currency preferences
                    currencyPreferences: data.user?.currencyPreferences || defaultCurrencyPreferences
                };

                setFormData(userData);

                // FIXED: Set string states for comma-separated fields
                setFavoritesCuisinesString(userData.profile.favoritesCuisines.join(', '));
                setDietaryRestrictionsString(userData.mealPlanningPreferences.dietaryRestrictions.join(', '));
                setAvoidIngredientsString(userData.mealPlanningPreferences.avoidIngredients.join(', '));
            }
        } catch (error) {
            console.error('Profile fetch error:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Profile Load Failed',
                message: 'Failed to load profile. Please refresh the page.'
            });
        } finally {
            setLoading(false);
        }
    }, []); // **FIXED: Empty dependency array to prevent infinite loops**


    useEffect(() => {
        console.log('🔍 Session effect triggered:', { status, hasSession: !!session, userId: session?.user?.id });

        if (status === 'authenticated' && session?.user?.id) {
            console.log('🔍 Calling fetchProfile...');
            fetchProfile();
        } else if (status === 'loading') {
            console.log('🔍 Session still loading, waiting...');
        } else {
            console.log('🔍 Not authenticated, stopping loading');
            setLoading(false);
        }
    }, [session?.user?.id, status, fetchProfile]); // Add dependencies so it runs when session changes

// Also, let's update the redirect effect to be more specific:
    useEffect( () => {
        if (status === 'unauthenticated') {
            console.log('🔍 Redirecting to signin - not authenticated');
            NativeNavigation.routerPush(router, '/auth/signin');
        }
    }, [status, router]); // Only redirect on unauthenticated, not loading

    // **ALSO ADD: Debug logging to see what's happening**
    useEffect(() => {
        console.log('🔍 PROFILE PAGE STATUS:', {
            sessionStatus: status,
            hasSession: !!session,
            loading: loading,
            userId: session?.user?.id
        });
    }, [session, status, loading]);

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

    const getSortDisplayName = (sortBy) => {
        const sortOptions = {
            'expiration': 'Priority (Expiring First)',
            'expiration-date': 'Expiration Date',
            'name': 'Name (A-Z)',
            'brand': 'Brand (A-Z)',
            'category': 'Category',
            'location': 'Location',
            'quantity': 'Quantity (High to Low)',
            'date-added': 'Recently Added'
        };
        return sortOptions[sortBy] || sortBy;
    };

    const getFilterDisplayName = (filter) => {
        const filterOptions = {
            'all': 'All Items',
            'expired': 'Expired Only',
            'expiring': 'Expiring Soon',
            'fresh': 'Fresh Only'
        };
        return filterOptions[filter] || filter;
    };

    const getLocationDisplayName = (location) => {
        const locationOptions = {
            'all': 'All Locations',
            'pantry': 'Pantry',
            'kitchen': 'Kitchen',
            'fridge': 'Fridge',
            'fridge-freezer': 'Fridge Freezer',
            'deep-freezer': 'Deep/Stand-up Freezer',
            'garage': 'Garage/Storage',
            'other': 'Other'
        };
        return locationOptions[location] || location;
    };

    // Manual refresh function
    const handleManualRefresh = async () => {
        setRefreshing(true);
        setSuccess('');

        try {
            await fetchProfile();
            setSuccess('Profile refreshed successfully!');
            setTimeout(() => setSuccess(''), 2000);
        } catch (error) {
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Refresh Failed',
                message: 'Failed to refresh profile. Please try again.'
            });
        } finally {
            setRefreshing(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (PlatformDetection.isIOS()) {
            // Force iOS to complete any pending input
            const activeElement = document.activeElement;
            if (activeElement && activeElement.blur) {
                activeElement.blur();
            }

            // Wait for iOS to process input changes
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // 🍎 Native iOS form submit haptic
        try {
            const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
            await MobileHaptics.formSubmit();
        } catch (error) {
            console.log('Form submit haptic failed:', error);
        }

        setSaving(true);
        setSuccess('');

        try {
            // ... existing form submission logic

            if (response.ok && !data.error) {
                // 🍎 Success haptic feedback
                try {
                    const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                    await MobileHaptics.success();
                } catch (error) {
                    console.log('Success haptic failed:', error);
                }

                // Update the main form data with processed arrays
                setFormData(finalFormData);
                setSuccess('Profile updated successfully!');
                setTimeout(() => setSuccess(''), 3000);
            } else {
                // 🍎 Error haptic feedback
                try {
                    const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                    await MobileHaptics.error();
                } catch (error) {
                    console.log('Error haptic failed:', error);
                }

                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Update Failed',
                    message: data.error || 'Failed to update profile'
                });
            }
        } catch (error) {
            console.error('Profile update error:', error);

            // 🍎 Error haptic feedback
            try {
                const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.error();
            } catch (error) {
                console.log('Error haptic failed:', error);
            }

            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Network Error',
                message: 'Network error. Please try again.'
            });
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
            {id: 'inventory', name: 'Inventory', icon: '📦'}, // NEW TAB
            {id: 'notifications', name: 'Notifications', icon: '🔔'},
            {id: 'meal-planning', name: 'Meal Planning', icon: '📅', requiresSubscription: true},
            {id: 'security', name: 'Security', icon: '🔒'}
        ];

        // Add nutrition tab only for Gold+ users
        return [
            ...baseTabs.slice(0, 4), // general, inventory, notifications, meal-planning
            {id: 'nutrition', name: 'Nutrition Goals', icon: '🥗', requiresSubscription: true},
            baseTabs[4] // security
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

                        {/* Tab Navigation - FIXED: Show all tabs, handle restrictions in tab content */}
                        <div className="bg-gray-50 border-b border-gray-200">
                            <div className="px-4 sm:px-6 py-4">
                                <nav className="flex flex-wrap gap-2 sm:gap-3">
                                    {tabs.map((tab) => {
                                        const hasAccess = !tab.requiresSubscription || nutritionGoalsGate.canUse;

                                        return (
                                            <TouchEnhancedButton
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl transition-all duration-200 touch-friendly min-h-[70px] sm:min-h-[80px] min-w-[80px] sm:min-w-[100px] ${
                                                    activeTab === tab.id
                                                        ? 'bg-white text-indigo-700 shadow-lg border-2 border-indigo-200 transform scale-105'
                                                        : hasAccess
                                                            ? 'bg-white text-gray-600 hover:text-gray-800 hover:shadow-md border-2 border-gray-100 hover:border-gray-200'
                                                            : 'bg-white text-gray-400 border-2 border-gray-100 cursor-pointer'
                                                }`}
                                            >
                                                {/* Active indicator */}
                                                {activeTab === tab.id && (
                                                    <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full"></div>
                                                )}

                                                {/* Premium indicator for locked tabs */}
                                                {!hasAccess && (
                                                    <div className="absolute top-1 right-1 text-xs bg-yellow-100 text-yellow-800 px-1 rounded-full">
                                                        Gold
                                                    </div>
                                                )}

                                                {/* Icon */}
                                                <div className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full mb-1 sm:mb-2 transition-all ${
                                                    activeTab === tab.id
                                                        ? 'bg-indigo-100'
                                                        : hasAccess
                                                            ? 'bg-gray-100 group-hover:bg-gray-200'
                                                            : 'bg-gray-100'
                                                }`}>
                                                    <span className="text-sm sm:text-lg">{tab.icon}</span>
                                                </div>

                                                {/* Tab name */}
                                                <span className="text-xs sm:text-sm font-medium text-center leading-tight px-1">
                                                    {tab.name}
                                                </span>
                                            </TouchEnhancedButton>
                                        );
                                    })}
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
                                                            src={getApiUrl(`/api/user/avatar/${formData.avatar}`)}
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
                                            <NativeTextInput
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => handleInputChange('name', null, e.target.value)}
                                                placeholder="Enter your full name"
                                                required
                                                validation={(value) => ({
                                                    isValid: value && value.length >= 2 && value.length <= 50,
                                                    message: value && value.length >= 2 && value.length <= 50
                                                        ? 'Name looks good!'
                                                        : value && value.length < 2
                                                            ? 'Name should be at least 2 characters'
                                                            : 'Name too long (max 50 characters)'
                                                })}
                                                errorMessage="Please enter your full name (2-50 characters)"
                                                successMessage="Name looks good!"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Email Address
                                            </label>
                                            <NativeTextInput
                                                type="email"
                                                value={session.user.email}
                                                disabled
                                                placeholder="Email address"
                                                validation={ValidationPatterns.email}
                                            />

                                            <p className="text-xs text-gray-500 mt-1">
                                                Email address cannot be changed
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Bio
                                            </label>
                                            <NativeTextarea
                                                value={formData.profile.bio}
                                                onChange={(e) => handleInputChange('profile', 'bio', e.target.value)}
                                                placeholder="Tell us a little about yourself..."
                                                autoExpand={true}
                                                maxLength={500}
                                                validation={(value) => ({
                                                    isValid: true,
                                                    message: value && value.length > 20 ? 'Great bio!' : ''
                                                })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Cooking Level
                                            </label>
                                            <NativeSelect
                                                value={formData.profile.cookingLevel}
                                                onChange={(e) => handleInputChange('profile', 'cookingLevel', e.target.value)}
                                                validation={ValidationPatterns.required}
                                                options={[
                                                    { value: "beginner", label: "Beginner" },
                                                    { value: "intermediate", label: "Intermediate" },
                                                    { value: "advanced", label: "Advanced" }
                                                ]}
                                                errorMessage="Please select your cooking level"
                                                successMessage="Cooking level selected"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Favorite Cuisines
                                            </label>
                                            <NativeTextInput
                                                type="text"
                                                value={favoritesCuisinesString}
                                                onChange={(e) => setFavoritesCuisinesString(e.target.value)}
                                                placeholder="Italian, Mexican, Asian, etc. (separate with commas)"
                                                validation={(value) => ({
                                                    isValid: true,
                                                    message: value && value.split(',').length > 0 ? 'Cuisines added' : ''
                                                })}
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Separate multiple cuisines with commas
                                            </p>
                                        </div>

                                        {/* NEW: Currency Preferences Section */}
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <h3 className="text-lg font-medium text-blue-900 mb-4 flex items-center">
                                                <span className="mr-2">💱</span>
                                                Currency & Pricing Settings
                                            </h3>
                                            <p className="text-sm text-blue-700 mb-4">
                                                Set your preferred currency for price tracking and shopping lists. This affects how prices are displayed throughout the app.
                                            </p>

                                            <div className="space-y-4">
                                                {/* Currency Selection */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Primary Currency
                                                    </label>
                                                    <NativeSelect
                                                        value={formData.currencyPreferences.currency}
                                                        onChange={(e) => {
                                                            // 🍎 Selection haptic feedback
                                                            try {
                                                                import('@/components/mobile/MobileHaptics').then(({ MobileHaptics }) => {
                                                                    MobileHaptics.selection();
                                                                });
                                                            } catch (error) {
                                                                console.log('Selection haptic failed:', error);
                                                            }

                                                            handleCurrencyChange(e.target.value);
                                                        }}
                                                        validation={ValidationPatterns.required}
                                                        options={SUPPORTED_CURRENCIES.map(currency => ({
                                                            value: currency.code,
                                                            label: `${currency.flag} ${currency.code} - ${currency.name} (${currency.symbol}) - ${currency.countries}`
                                                        }))}
                                                        errorMessage="Please select a currency"
                                                        successMessage="Currency selected"
                                                    />
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        Choose your local currency for price tracking and shopping lists
                                                    </p>
                                                </div>

                                                {/* Advanced Currency Settings */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Currency Symbol */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Currency Symbol
                                                        </label>
                                                        <NativeTextInput
                                                            type="text"
                                                            inputMode="text"
                                                            pattern="[\$€£¥₹₽₩₪₨₦₡₵₴₸₼]"
                                                            value={formData.currencyPreferences.currencySymbol}
                                                            onChange={(e) => handleInputChange('currencyPreferences', 'currencySymbol', e.target.value)}
                                                            placeholder="$"
                                                            autoComplete="off"
                                                            maxLength="5"
                                                            validation={(value) => ({
                                                                isValid: value && value.length >= 1 && value.length <= 5,
                                                                message: value && value.length >= 1 ? 'Symbol looks good' : 'Enter a currency symbol'
                                                            })}
                                                            errorMessage="Currency symbol required (1-5 characters)"
                                                            successMessage="Symbol looks good"
                                                        />
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Symbol used to display prices (e.g., $, €, £)
                                                        </p>
                                                    </div>

                                                    {/* Decimal Places */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Decimal Places
                                                        </label>
                                                        <NativeSelect
                                                            value={formData.currencyPreferences.decimalPlaces}
                                                            onChange={(e) => handleInputChange('currencyPreferences', 'decimalPlaces', parseInt(e.target.value))}
                                                            validation={ValidationPatterns.required}
                                                            options={[
                                                                { value: 0, label: "0 (whole numbers only)" },
                                                                { value: 2, label: "2 (standard)" },
                                                                { value: 3, label: "3 (high precision)" }
                                                            ]}
                                                            errorMessage="Please select decimal places"
                                                            successMessage="Decimal places selected"
                                                        />
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Number of decimal places to show in prices
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Symbol Position */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Symbol Position
                                                    </label>
                                                    <div className="flex gap-4">
                                                        <label className="flex items-center">
                                                            <input
                                                                type="radio"
                                                                value="before"
                                                                checked={formData.currencyPreferences.currencyPosition === 'before'}
                                                                onChange={(e) => handleInputChange('currencyPreferences', 'currencyPosition', e.target.value)}
                                                                className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                                            />
                                                            <span className="text-sm">
                                                                Before ({formatCurrencyExample('12.34', 'before', formData.currencyPreferences.currencySymbol)})
                                                            </span>
                                                        </label>
                                                        <label className="flex items-center">
                                                            <input
                                                                type="radio"
                                                                value="after"
                                                                checked={formData.currencyPreferences.currencyPosition === 'after'}
                                                                onChange={(e) => handleInputChange('currencyPreferences', 'currencyPosition', e.target.value)}
                                                                className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                                            />
                                                            <span className="text-sm">
                                                                After ({formatCurrencyExample('12.34', 'after', formData.currencyPreferences.currencySymbol)})
                                                            </span>
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* Show Currency Code */}
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-medium text-gray-900">Show Currency Code</div>
                                                        <div className="text-sm text-gray-600">Display currency code after prices (e.g., $12.34 USD)</div>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.currencyPreferences.showCurrencyCode}
                                                            onChange={(e) => handleInputChange('currencyPreferences', 'showCurrencyCode', e.target.checked)}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                    </label>
                                                </div>

                                                {/* Preview */}
                                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                                    <h4 className="font-medium text-gray-900 mb-2">💰 Price Preview</h4>
                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex justify-between">
                                                            <span>Example price:</span>
                                                            <span className="font-mono font-semibold text-green-600">
                                                                {getCurrencyPreviewPrice()}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Large amount:</span>
                                                            <span className="font-mono font-semibold text-green-600">
                                                                {formatCurrencyExample(
                                                                    formData.currencyPreferences.decimalPlaces === 0 ? '1000' : '1,234.56',
                                                                    formData.currencyPreferences.currencyPosition,
                                                                    formData.currencyPreferences.currencySymbol
                                                                )}{formData.currencyPreferences.showCurrencyCode ? ` ${formData.currencyPreferences.currency}` : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-2">
                                                        This is how prices will appear in shopping lists, inventory tracking, and throughout the app.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Inventory Preferences Tab - NEW */}
                                {activeTab === 'inventory' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900 mb-4">Inventory Display Preferences</h3>
                                            <p className="text-sm text-gray-600 mb-6">
                                                Customize how your inventory is displayed and sorted by default. These settings will be applied automatically when you visit your inventory page.
                                            </p>

                                            <div className="space-y-6">
                                                {/* Default Sorting */}
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <h4 className="text-sm font-semibold text-gray-800 mb-3">🔃 Default Sorting</h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Sort inventory by
                                                            </label>
                                                            <NativeSelect
                                                                value={formData.inventoryPreferences.defaultSortBy}
                                                                onChange={(e) => handleInputChange('inventoryPreferences', 'defaultSortBy', e.target.value)}
                                                                validation={ValidationPatterns.required}
                                                                options={[
                                                                    { value: "expiration", label: "⚠️ Priority (Expiring First)" },
                                                                    { value: "expiration-date", label: "📅 Expiration Date" },
                                                                    { value: "name", label: "🔤 Name (A-Z)" },
                                                                    { value: "brand", label: "🏷️ Brand (A-Z)" },
                                                                    { value: "category", label: "📂 Category" },
                                                                    { value: "location", label: "📍 Location" },
                                                                    { value: "quantity", label: "📊 Quantity (High to Low)" },
                                                                    { value: "date-added", label: "🕒 Recently Added" }
                                                                ]}
                                                                errorMessage="Please select sort option"
                                                                successMessage="Sort option selected"
                                                            />
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                This will be your default sort order when opening inventory
                                                            </p>
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Default status filter
                                                            </label>
                                                            <NativeSelect
                                                                value={formData.inventoryPreferences.defaultFilterStatus}
                                                                onChange={(e) => handleInputChange('inventoryPreferences', 'defaultFilterStatus', e.target.value)}
                                                                validation={ValidationPatterns.required}
                                                                options={[
                                                                    { value: "all", label: "📦 All Items" },
                                                                    { value: "expired", label: "🚨 Expired Only" },
                                                                    { value: "expiring", label: "⏰ Expiring Soon" },
                                                                    { value: "fresh", label: "✅ Fresh Only" }
                                                                ]}
                                                                errorMessage="Please select filter status"
                                                                successMessage="Filter status selected"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Default location filter
                                                            </label>
                                                            <select
                                                                value={formData.inventoryPreferences.defaultFilterLocation}
                                                                onChange={(e) => handleInputChange('inventoryPreferences', 'defaultFilterLocation', e.target.value)}
                                                                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                style={{fontSize: '16px'}}
                                                            >
                                                                <option value="all">📍 All Locations</option>
                                                                <option value="pantry">🏠 Pantry</option>
                                                                <option value="kitchen">🚪 Kitchen</option>
                                                                <option value="fridge">❄️ Fridge</option>
                                                                <option value="fridge-freezer">🧊 Fridge Freezer</option>
                                                                <option value="deep-freezer">❄️ Deep/Stand-up Freezer</option>
                                                                <option value="garage">🏠 Garage/Storage</option>
                                                                <option value="other">📦 Other</option>
                                                            </select>
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Items to display
                                                            </label>
                                                            <select
                                                                value={formData.inventoryPreferences.itemsPerPage}
                                                                onChange={(e) => handleInputChange('inventoryPreferences', 'itemsPerPage', e.target.value)}
                                                                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                                style={{fontSize: '16px'}}
                                                            >
                                                                <option value="all">Show All Items</option>
                                                                <option value="20">20 items per page</option>
                                                                <option value="50">50 items per page</option>
                                                                <option value="100">100 items per page</option>
                                                            </select>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                Pagination can improve performance with large inventories
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Display Options */}
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <h4 className="text-sm font-semibold text-gray-800 mb-3">👁️ Display Options</h4>
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <label className="text-sm font-medium text-gray-700">
                                                                    Show Quick Filter Buttons
                                                                </label>
                                                                <p className="text-xs text-gray-500">
                                                                    Display quick filter buttons (Expired, Expiring Soon, etc.)
                                                                </p>
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.inventoryPreferences.showQuickFilters}
                                                                onChange={(e) => handleInputChange('inventoryPreferences', 'showQuickFilters', e.target.checked)}
                                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                            />
                                                        </div>

                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <label className="text-sm font-medium text-gray-700">
                                                                    Compact View
                                                                </label>
                                                                <p className="text-xs text-gray-500">
                                                                    Show more items in less space (smaller cards)
                                                                </p>
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.inventoryPreferences.compactView}
                                                                onChange={(e) => handleInputChange('inventoryPreferences', 'compactView', e.target.checked)}
                                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Preview Section */}
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                    <h4 className="text-sm font-semibold text-blue-800 mb-2">👀 Preview</h4>
                                                    <p className="text-sm text-blue-700">
                                                        With your current settings, your inventory will:
                                                    </p>
                                                    <ul className="text-sm text-blue-700 mt-2 space-y-1">
                                                        <li>• Be sorted by <strong>{getSortDisplayName(formData.inventoryPreferences.defaultSortBy)}</strong></li>
                                                        <li>• Show <strong>{getFilterDisplayName(formData.inventoryPreferences.defaultFilterStatus)}</strong> items</li>
                                                        <li>• Filter to <strong>{getLocationDisplayName(formData.inventoryPreferences.defaultFilterLocation)}</strong></li>
                                                        <li>• Display <strong>{formData.inventoryPreferences.itemsPerPage === 'all' ? 'all items' : formData.inventoryPreferences.itemsPerPage + ' items per page'}</strong></li>
                                                        <li>• Use <strong>{formData.inventoryPreferences.compactView ? 'compact' : 'standard'}</strong> view</li>
                                                        <li>• {formData.inventoryPreferences.showQuickFilters ? 'Show' : 'Hide'} quick filter buttons</li>
                                                    </ul>
                                                </div>

                                                {/* Reset to Defaults */}
                                                <div className="text-center">
                                                    <TouchEnhancedButton
                                                        type="button"
                                                        onClick={() => {
                                                            const defaultPrefs = {
                                                                defaultSortBy: 'expiration',
                                                                defaultFilterStatus: 'all',
                                                                defaultFilterLocation: 'all',
                                                                showQuickFilters: true,
                                                                itemsPerPage: 'all',
                                                                compactView: false
                                                            };
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                inventoryPreferences: defaultPrefs
                                                            }));
                                                        }}
                                                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                                                    >
                                                        🔄 Reset to Default Settings
                                                    </TouchEnhancedButton>
                                                </div>
                                            </div>
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
                                                    onClick={() => NativeNavigation.navigateTo({ path: '/pricing?source=profile&feature=meal-planning', router })}
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
                                                                    <NativeTextInput
                                                                        type="text"
                                                                        value={dietaryRestrictionsString}
                                                                        onChange={(e) => setDietaryRestrictionsString(e.target.value)}
                                                                        placeholder="Vegetarian, Gluten-Free, Dairy-Free, etc."
                                                                        validation={(value) => ({
                                                                            isValid: true,
                                                                            message: value && value.split(',').length > 0 ? 'Restrictions added' : ''
                                                                        })}
                                                                    />
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        Separate multiple restrictions with commas
                                                                    </p>
                                                                </div>

                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                        Ingredients to Avoid
                                                                    </label>
                                                                    <NativeTextInput
                                                                        type="text"
                                                                        value={avoidIngredientsString}
                                                                        onChange={(e) => setAvoidIngredientsString(e.target.value)}
                                                                        placeholder="Nuts, Shellfish, Mushrooms, etc."
                                                                        validation={(value) => ({
                                                                            isValid: true,
                                                                            message: value && value.split(',').length > 0 ? 'Ingredients to avoid added' : ''
                                                                        })}
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
                                                                    onClick={() => NativeNavigation.navigateTo({ path: '/pricing?source=profile&feature=dietary-restrictions', router })}
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
                                                    onClick={() => NativeNavigation.navigateTo({ path: '/pricing?source=profile&feature=nutrition-goals', router })}
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
                                                <p className="text-sm text-gray-600 mb-4">
                                                    Set your daily nutrition targets. Changes are automatically saved and synced across all features.
                                                </p>

                                                {/* Enhanced Nutrition Goals Component */}
                                                <NutritionGoalsTracking
                                                    data={{
                                                        goals: {
                                                            current: formData.nutritionGoals
                                                        }
                                                    }}
                                                    loading={loading}
                                                    onGoalsUpdate={() => {
                                                        console.log('🎯 Nutrition goals updated via component');
                                                        // Optionally refresh profile data here if needed
                                                    }}
                                                    onProfileSync={handleNutritionGoalsSync}
                                                />

                                                {/* Alternative: Manual Goals Form (keep as backup/alternative) */}
                                                <div className="mt-8 bg-gray-50 p-4 rounded-lg">
                                                    <details className="cursor-pointer">
                                                        <summary className="text-sm font-medium text-gray-700 mb-2">
                                                            📝 Manual Entry (Alternative Method)
                                                        </summary>

                                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Daily Calories
                                                                </label>
                                                                <NativeTextInput
                                                                    type="number"
                                                                    inputMode="numeric"
                                                                    pattern="[0-9]*"
                                                                    value={formData.nutritionGoals.dailyCalories}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value.replace(/[^0-9]/g, '');
                                                                        handleInputChange('nutritionGoals', 'dailyCalories', parseInt(e.target.value) || 0)
                                                                    }}
                                                                    placeholder="2000"
                                                                    autoComplete="off"
                                                                    min="1000"
                                                                    max="5000"
                                                                    validation={(value) => {
                                                                        const num = parseInt(value);
                                                                        return {
                                                                            isValid: num >= 1000 && num <= 5000,
                                                                            message: num >= 1000 && num <= 5000 ? 'Good calorie goal' : 'Calories should be 1000-5000'
                                                                        };
                                                                    }}
                                                                    errorMessage="Calories should be 1000-5000"
                                                                    successMessage="Good calorie goal"
                                                                />
                                                                <p className="text-xs text-gray-500 mt-1">Recommended: 1,500-3,000 calories</p>
                                                            </div>

                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Protein (grams)
                                                                </label>
                                                                <NativeTextInput
                                                                    type="number"
                                                                    inputMode="numeric"
                                                                    pattern="[0-9]*"
                                                                    value={formData.nutritionGoals.protein}
                                                                    onChange={(e) => handleInputChange('nutritionGoals', 'protein', parseInt(e.target.value) || 0)}
                                                                    placeholder="150"
                                                                    autoComplete="off"
                                                                    min="20"
                                                                    max="300"
                                                                    validation={(value) => {
                                                                        const num = parseInt(value);
                                                                        return {
                                                                            isValid: num >= 20 && num <= 300,
                                                                            message: num >= 20 && num <= 300 ? 'Good protein goal' : 'Protein should be 20-300g'
                                                                        };
                                                                    }}
                                                                    errorMessage="Protein should be 20-300g"
                                                                    successMessage="Good protein goal"
                                                                />
                                                                <p className="text-xs text-gray-500 mt-1">Recommended: 50-200g</p>
                                                            </div>

                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Fat (grams)
                                                                </label>
                                                                <NativeTextInput
                                                                    type="number"
                                                                    inputMode="numeric"
                                                                    pattern="[0-9]*"
                                                                    value={formData.nutritionGoals.fat}
                                                                    onChange={(e) => handleInputChange('nutritionGoals', 'fat', parseInt(e.target.value) || 0)}
                                                                    placeholder="65"
                                                                    autoComplete="off"
                                                                    min="20"
                                                                    max="200"
                                                                    validation={(value) => {
                                                                        const num = parseInt(value);
                                                                        return {
                                                                            isValid: num >= 20 && num <= 200,
                                                                            message: num >= 20 && num <= 200 ? 'Good fat goal' : 'Fat should be 20-200g'
                                                                        };
                                                                    }}
                                                                    errorMessage="Fat should be 20-200g"
                                                                    successMessage="Good fat goal"
                                                                />
                                                                <p className="text-xs text-gray-500 mt-1">Recommended: 44-78g</p>
                                                            </div>

                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Carbohydrates (grams)
                                                                </label>
                                                                <NativeTextInput
                                                                    type="number"
                                                                    inputMode="numeric"
                                                                    pattern="[0-9]*"
                                                                    value={formData.nutritionGoals.carbs}
                                                                    onChange={(e) => handleInputChange('nutritionGoals', 'carbs', parseInt(e.target.value) || 0)}
                                                                    placeholder="250"
                                                                    autoComplete="off"
                                                                    min="50"
                                                                    max="500"
                                                                    validation={(value) => {
                                                                        const num = parseInt(value);
                                                                        return {
                                                                            isValid: num >= 50 && num <= 500,
                                                                            message: num >= 50 && num <= 500 ? 'Good carb goal' : 'Carbs should be 50-500g'
                                                                        };
                                                                    }}
                                                                    errorMessage="Carbs should be 50-500g"
                                                                    successMessage="Good carb goal"
                                                                />
                                                                <p className="text-xs text-gray-500 mt-1">Recommended: 130-300g</p>
                                                            </div>

                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Fiber (grams)
                                                                </label>
                                                                <NativeTextInput
                                                                    type="number"
                                                                    inputMode="numeric"
                                                                    pattern="[0-9]*"
                                                                    value={formData.nutritionGoals.fiber}
                                                                    onChange={(e) => handleInputChange('nutritionGoals', 'fiber', parseInt(e.target.value) || 0)}
                                                                    placeholder="25"
                                                                    autoComplete="off"
                                                                    min="10"
                                                                    max="60"
                                                                    validation={(value) => {
                                                                        const num = parseInt(value);
                                                                        return {
                                                                            isValid: num >= 10 && num <= 60,
                                                                            message: num >= 10 && num <= 60 ? 'Good fiber goal' : 'Fiber should be 10-60g'
                                                                        };
                                                                    }}
                                                                    errorMessage="Fiber should be 10-60g"
                                                                    successMessage="Good fiber goal"
                                                                />
                                                                <p className="text-xs text-gray-500 mt-1">Recommended: 25-35g</p>
                                                            </div>

                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Sodium (mg)
                                                                </label>
                                                                <NativeTextInput
                                                                    type="number"
                                                                    inputMode="numeric"
                                                                    pattern="[0-9]*"
                                                                    value={formData.nutritionGoals.sodium}
                                                                    onChange={(e) => handleInputChange('nutritionGoals', 'sodium', parseInt(e.target.value) || 0)}
                                                                    placeholder="2300"
                                                                    autoComplete="off"
                                                                    min="1000"
                                                                    max="4000"
                                                                    validation={(value) => {
                                                                        const num = parseInt(value);
                                                                        return {
                                                                            isValid: num >= 1000 && num <= 4000,
                                                                            message: num >= 1000 && num <= 4000 ? 'Good sodium goal' : 'Sodium should be 1000-4000mg'
                                                                        };
                                                                    }}
                                                                    errorMessage="Sodium should be 1000-4000mg"
                                                                    successMessage="Good sodium goal"
                                                                />
                                                                <p className="text-xs text-gray-500 mt-1">Recommended: Less than 2,300mg</p>
                                                            </div>
                                                        </div>

                                                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                            <p className="text-sm text-blue-800">
                                                                💡 <strong>Note:</strong> Use the enhanced component above for better experience with templates and visual feedback. This manual form saves with your profile when you click "Save Changes" at the bottom.
                                                            </p>
                                                        </div>
                                                    </details>
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
                                                                onClick={() => NativeNavigation.routerPush(router, '/auth/change-password')}
                                                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                                                            >
                                                                Change Password
                                                            </TouchEnhancedButton>
                                                        </div>

                                                        <hr className="border-gray-200" />

                                                        <div className="flex items-center justify-between py-3 border-b border-gray-200">
                                                            <div>
                                                                <div className="font-medium text-gray-900">Email Address</div>
                                                                <div className="text-sm text-gray-600">{session.user.email}</div>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                {session.user?.emailVerified ? (
                                                                    <span className="text-green-600 text-sm">✅ Verified</span>
                                                                ) : (
                                                                    <span className="text-orange-600 text-sm">⚠️ Unverified</span>
                                                                )}
                                                            </div>
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
                                    onClick={() => NativeNavigation.routerPush(router, '/dashboard')}
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

                {/* Account Deletion Modal - FIXED: Pass userEmail instead of user */}
                {showDeletionModal && (
                    <AccountDeletionModal
                        isOpen={showDeletionModal}
                        onClose={() => setShowDeletionModal(false)}
                        userEmail={session?.user?.email}
                    />
                )}

                <Footer />
            </div>
        </MobileOptimizedLayout>
    );
}