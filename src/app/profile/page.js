// file: /src/app/profile/page.js v4 - COMPLETE with All Tabs Restored

'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AccountDeletionModal from '@/components/profile/AccountDeletionModal';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import MobileOptimizedLayout from '@/components/layout/MobileOptimizedLayout';
import Footer from '@/components/legal/Footer';

export default function ProfilePage() {
    const { data: session, status, update } = useSession();
    const router = useRouter();
    const fileInputRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState('general');
    const [showDeletionModal, setShowDeletionModal] = useState(false);

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
            defaultMealTypes: ['breakfast', 'lunch', 'dinner'],
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
                    return { error: 'Server error occurred. Please try again.' };
                } else if (text.includes('404')) {
                    return { error: 'API endpoint not found. Please refresh the page.' };
                } else if (text.includes('500')) {
                    return { error: 'Internal server error. Please try again later.' };
                } else {
                    return { error: 'Unexpected server response. Please try again.' };
                }
            }
        } catch (parseError) {
            console.error('Response parsing error:', parseError);
            return { error: 'Failed to parse server response. Please try again.' };
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
                        let { width, height } = img;

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
                response = await fetch('/api/user/avatar', {
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
                setFormData(prev => ({ ...prev, avatar: data.avatarId }));

                // Update the session to reflect the new avatar
                try {
                    await update({ avatar: data.avatarId });
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

            const response = await fetch('/api/user/avatar', {
                method: 'DELETE',
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            console.log('Remove response received:', response.status);

            const data = await parseResponse(response);

            if (response.ok && data.success) {
                setFormData(prev => ({ ...prev, avatar: '' }));

                try {
                    await update({ avatar: '' });
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

    // Fetch user profile data
    useEffect(() => {
        if (session?.user?.id) {
            fetchProfile();
        }
    }, [session]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/user/profile');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await parseResponse(response);

            if (data.error) {
                setError(data.error);
            } else {
                setFormData({
                    name: data.user?.name || '',
                    avatar: data.user?.avatar || '',
                    profile: {
                        bio: data.user?.profile?.bio || '',
                        cookingLevel: data.user?.profile?.cookingLevel || 'beginner',
                        favoritesCuisines: data.user?.profile?.favoritesCuisines || []
                    },
                    notificationSettings: data.user?.notificationSettings || formData.notificationSettings,
                    mealPlanningPreferences: data.user?.mealPlanningPreferences || formData.mealPlanningPreferences,
                    nutritionGoals: data.user?.nutritionGoals || formData.nutritionGoals
                });
            }
        } catch (error) {
            console.error('Profile fetch error:', error);
            setError('Failed to load profile. Please refresh the page.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await parseResponse(response);

            if (response.ok && !data.error) {
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
            setFormData(prev => ({ ...prev, name: value }));
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

    const handleArrayChange = (section, field, value) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value.split(',').map(item => item.trim()).filter(item => item)
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

    const tabs = [
        { id: 'general', name: 'General', icon: '👤' },
        { id: 'notifications', name: 'Notifications', icon: '🔔' },
        { id: 'meal-planning', name: 'Meal Planning', icon: '📅' },
        { id: 'nutrition', name: 'Nutrition Goals', icon: '🥗' },
        { id: 'security', name: 'Security', icon: '🔒' }
    ];

    return (
        <MobileOptimizedLayout>
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white shadow rounded-lg">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h1 className="text-2xl font-semibold text-gray-900">Profile Settings</h1>
                            <p className="text-sm text-gray-600 mt-1">
                                Manage your account settings and preferences
                            </p>
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
                            <div className="mx-6 mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                                <div className="flex items-center">
                                    <div className="mr-2">✅</div>
                                    <div>{success}</div>
                                </div>
                            </div>
                        )}

                        {/* Tab Navigation */}
                        <div className="bg-gray-50 border-b border-gray-200">
                            <div className="px-4 sm:px-6 py-4">
                                <nav className="profile-tabs-grid grid gap-3">
                                    {tabs.map((tab) => (
                                        <TouchEnhancedButton
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`profile-tab-button group relative flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-200 touch-friendly min-h-[80px] ${
                                                activeTab === tab.id
                                                    ? 'bg-white text-indigo-700 shadow-lg border-2 border-indigo-200 transform scale-105 active'
                                                    : 'bg-white text-gray-600 hover:text-gray-800 hover:shadow-md border-2 border-gray-100 hover:border-gray-200'
                                            }`}
                                        >
                                            {activeTab === tab.id && (
                                                <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full"></div>
                                            )}

                                            <div className={`profile-tab-icon flex items-center justify-center w-8 h-8 rounded-full mb-2 transition-all ${
                                                activeTab === tab.id
                                                    ? 'bg-indigo-100'
                                                    : 'bg-gray-100 group-hover:bg-gray-200'
                                            }`}>
                                                <span className="text-lg">{tab.icon}</span>
                                            </div>

                                            <span className="profile-tab-text text-xs sm:text-sm font-medium text-center leading-tight">
                                                {tab.name}
                                            </span>
                                        </TouchEnhancedButton>
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
                                                <div className="w-24 h-24 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center">
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
                                                        style={{ display: formData.avatar ? 'none' : 'flex' }}
                                                    >
                                                        {session?.user?.name?.[0]?.toUpperCase() || 'U'}
                                                    </span>
                                                </div>

                                                {/* Upload Progress Overlay */}
                                                {uploadingAvatar && (
                                                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                                                        <div className="text-center">
                                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-1"></div>
                                                            {uploadProgress > 0 && (
                                                                <div className="text-white text-xs font-medium">{uploadProgress}%</div>
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
                                                style={{ fontSize: '16px' }}
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
                                                maxLength={200}
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                style={{ fontSize: '16px' }}
                                                placeholder="Tell us a bit about yourself..."
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                {formData.profile.bio.length}/200 characters
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Cooking Level
                                            </label>
                                            <select
                                                value={formData.profile.cookingLevel}
                                                onChange={(e) => handleInputChange('profile', 'cookingLevel', e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                                                value={formData.profile.favoritesCuisines.join(', ')}
                                                onChange={(e) => handleArrayChange('profile', 'favoritesCuisines', e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                style={{ fontSize: '16px' }}
                                                placeholder="Italian, Mexican, Asian, etc. (comma separated)"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Notifications Tab - RESTORED */}
                                {activeTab === 'notifications' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900 mb-4">Email Notifications</h3>

                                            <div className="space-y-4">
                                                <div className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        id="email-enabled"
                                                        checked={formData.notificationSettings.email.enabled}
                                                        onChange={(e) => handleNestedChange('notificationSettings', 'email', 'enabled', e.target.checked)}
                                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded touch-friendly"
                                                    />
                                                    <label htmlFor="email-enabled" className="ml-3 text-sm text-gray-700">
                                                        Enable email notifications
                                                    </label>
                                                </div>

                                                <div className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        id="daily-digest"
                                                        checked={formData.notificationSettings.email.dailyDigest}
                                                        onChange={(e) => handleNestedChange('notificationSettings', 'email', 'dailyDigest', e.target.checked)}
                                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded touch-friendly"
                                                    />
                                                    <label htmlFor="daily-digest" className="ml-3 text-sm text-gray-700">
                                                        Daily digest emails
                                                    </label>
                                                </div>

                                                <div className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        id="expiration-alerts"
                                                        checked={formData.notificationSettings.email.expirationAlerts}
                                                        onChange={(e) => handleNestedChange('notificationSettings', 'email', 'expirationAlerts', e.target.checked)}
                                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded touch-friendly"
                                                    />
                                                    <label htmlFor="expiration-alerts" className="ml-3 text-sm text-gray-700">
                                                        Food expiration alerts
                                                    </label>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">
                                                        Alert me _ days before expiration
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="30"
                                                        value={formData.notificationSettings.email.daysBeforeExpiration}
                                                        onChange={(e) => handleNestedChange('notificationSettings', 'email', 'daysBeforeExpiration', parseInt(e.target.value))}
                                                        className="mt-1 block w-20 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                        style={{ fontSize: '16px' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900 mb-4">Dashboard Settings</h3>

                                            <div className="space-y-4">
                                                <div className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        id="show-expiration-panel"
                                                        checked={formData.notificationSettings.dashboard.showExpirationPanel}
                                                        onChange={(e) => handleNestedChange('notificationSettings', 'dashboard', 'showExpirationPanel', e.target.checked)}
                                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded touch-friendly"
                                                    />
                                                    <label htmlFor="show-expiration-panel" className="ml-3 text-sm text-gray-700">
                                                        Show expiration alerts panel
                                                    </label>
                                                </div>

                                                <div className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        id="show-quick-stats"
                                                        checked={formData.notificationSettings.dashboard.showQuickStats}
                                                        onChange={(e) => handleNestedChange('notificationSettings', 'dashboard', 'showQuickStats', e.target.checked)}
                                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded touch-friendly"
                                                    />
                                                    <label htmlFor="show-quick-stats" className="ml-3 text-sm text-gray-700">
                                                        Show quick stats
                                                    </label>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">
                                                        Alert threshold (days)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="30"
                                                        value={formData.notificationSettings.dashboard.alertThreshold}
                                                        onChange={(e) => handleNestedChange('notificationSettings', 'dashboard', 'alertThreshold', parseInt(e.target.value))}
                                                        className="mt-1 block w-20 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                        style={{ fontSize: '16px' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Meal Planning Tab - RESTORED */}
                                {activeTab === 'meal-planning' && (
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Week starts on
                                            </label>
                                            <select
                                                value={formData.mealPlanningPreferences.weekStartDay}
                                                onChange={(e) => handleInputChange('mealPlanningPreferences', 'weekStartDay', e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                <option value="sunday">Sunday</option>
                                                <option value="monday">Monday</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Default meal types
                                            </label>
                                            <div className="space-y-3">
                                                {['breakfast', 'lunch', 'dinner', 'snack'].map((meal) => (
                                                    <div key={meal} className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            id={meal}
                                                            checked={formData.mealPlanningPreferences.defaultMealTypes.includes(meal)}
                                                            onChange={(e) => {
                                                                const current = formData.mealPlanningPreferences.defaultMealTypes;
                                                                const updated = e.target.checked
                                                                    ? [...current, meal]
                                                                    : current.filter(m => m !== meal);
                                                                handleInputChange('mealPlanningPreferences', 'defaultMealTypes', updated);
                                                            }}
                                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded touch-friendly"
                                                        />
                                                        <label htmlFor={meal} className="ml-3 text-sm text-gray-700 capitalize">
                                                            {meal}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Planning horizon
                                            </label>
                                            <select
                                                value={formData.mealPlanningPreferences.planningHorizon}
                                                onChange={(e) => handleInputChange('mealPlanningPreferences', 'planningHorizon', e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                <option value="week">1 Week</option>
                                                <option value="2weeks">2 Weeks</option>
                                                <option value="month">1 Month</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Preferred shopping day
                                            </label>
                                            <select
                                                value={formData.mealPlanningPreferences.shoppingDay}
                                                onChange={(e) => handleInputChange('mealPlanningPreferences', 'shoppingDay', e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day) => (
                                                    <option key={day} value={day} className="capitalize">{day}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Cooking time preference
                                            </label>
                                            <select
                                                value={formData.mealPlanningPreferences.cookingTimePreference}
                                                onChange={(e) => handleInputChange('mealPlanningPreferences', 'cookingTimePreference', e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                <option value="quick">Quick meals (under 30 min)</option>
                                                <option value="moderate">Moderate (30-60 min)</option>
                                                <option value="any">Any duration</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Dietary restrictions
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.mealPlanningPreferences.dietaryRestrictions.join(', ')}
                                                onChange={(e) => handleArrayChange('mealPlanningPreferences', 'dietaryRestrictions', e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                style={{ fontSize: '16px' }}
                                                placeholder="Vegetarian, Gluten-free, etc. (comma separated)"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Ingredients to avoid
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.mealPlanningPreferences.avoidIngredients.join(', ')}
                                                onChange={(e) => handleArrayChange('mealPlanningPreferences', 'avoidIngredients', e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                style={{ fontSize: '16px' }}
                                                placeholder="Nuts, shellfish, etc. (comma separated)"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Nutrition Tab - RESTORED */}
                                {activeTab === 'nutrition' && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Daily Calories
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1000"
                                                    max="5000"
                                                    value={formData.nutritionGoals.dailyCalories}
                                                    onChange={(e) => handleInputChange('nutritionGoals', 'dailyCalories', parseInt(e.target.value))}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                    style={{ fontSize: '16px' }}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Protein (grams)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="500"
                                                    value={formData.nutritionGoals.protein}
                                                    onChange={(e) => handleInputChange('nutritionGoals', 'protein', parseInt(e.target.value))}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                    style={{ fontSize: '16px' }}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Fat (grams)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="300"
                                                    value={formData.nutritionGoals.fat}
                                                    onChange={(e) => handleInputChange('nutritionGoals', 'fat', parseInt(e.target.value))}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                    style={{ fontSize: '16px' }}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Carbohydrates (grams)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="500"
                                                    value={formData.nutritionGoals.carbs}
                                                    onChange={(e) => handleInputChange('nutritionGoals', 'carbs', parseInt(e.target.value))}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                    style={{ fontSize: '16px' }}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Fiber (grams)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={formData.nutritionGoals.fiber}
                                                    onChange={(e) => handleInputChange('nutritionGoals', 'fiber', parseInt(e.target.value))}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                    style={{ fontSize: '16px' }}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Sodium (mg)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="5000"
                                                    value={formData.nutritionGoals.sodium}
                                                    onChange={(e) => handleInputChange('nutritionGoals', 'sodium', parseInt(e.target.value))}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                    style={{ fontSize: '16px' }}
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                                            <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Nutrition Tips</h4>
                                            <ul className="text-sm text-blue-700 space-y-1">
                                                <li>• Consult with a healthcare provider for personalized nutrition goals</li>
                                                <li>• These values are used to track your daily nutrition intake</li>
                                                <li>• Adjust based on your activity level and health goals</li>
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {/* Security Tab */}
                                {activeTab === 'security' && (
                                    <div className="space-y-6">
                                        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                                            <h4 className="text-sm font-medium text-gray-900 mb-2">🔒 Password Security</h4>
                                            <p className="text-sm text-gray-600 mb-4">
                                                Keep your account secure by regularly updating your password
                                            </p>

                                            <TouchEnhancedButton
                                                type="button"
                                                onClick={() => router.push('/profile/change-password')}
                                                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 touch-friendly"
                                            >
                                                Change Password
                                            </TouchEnhancedButton>
                                        </div>

                                        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                                            <h4 className="text-sm font-medium text-gray-900 mb-2">📧 Account Information</h4>
                                            <div className="space-y-2 text-sm text-gray-600">
                                                <p><strong>Email:</strong> {session.user.email}</p>
                                                <p><strong>Account created:</strong> {new Date(session.user.createdAt || Date.now()).toLocaleDateString()}</p>
                                            </div>
                                        </div>

                                        <div className="bg-red-50 border border-red-200 rounded-md p-4">
                                            <h4 className="text-sm font-medium text-red-900 mb-2">⚠️ Danger Zone</h4>
                                            <p className="text-sm text-red-700 mb-4">
                                                Account deletion is permanent and cannot be undone
                                            </p>

                                            <TouchEnhancedButton
                                                type="button"
                                                onClick={() => setShowDeletionModal(true)}
                                                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 touch-friendly"
                                            >
                                                Delete Account
                                            </TouchEnhancedButton>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Save Button */}
                            {activeTab !== 'security' && (
                                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                                    <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
                                        <TouchEnhancedButton
                                            type="button"
                                            onClick={() => router.push('/dashboard')}
                                            className="w-full sm:w-auto bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 touch-friendly"
                                        >
                                            Cancel
                                        </TouchEnhancedButton>

                                        <TouchEnhancedButton
                                            type="submit"
                                            disabled={saving || uploadingAvatar}
                                            className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-indigo-400 touch-friendly"
                                        >
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </TouchEnhancedButton>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
                <Footer />
            </div>
            <AccountDeletionModal
                isOpen={showDeletionModal}
                onClose={() => setShowDeletionModal(false)}
                userEmail={session.user.email}
            />
        </MobileOptimizedLayout>
    );
}