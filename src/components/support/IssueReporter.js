'use client';
// file: /src/components/support/IssueReporter.js v2 - iOS Native Enhancements with Native Form Components


import { useState } from 'react';
import { useSafeSession } from '@/hooks/useSafeSession';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { fetchWithSession } from '@/lib/api-config';
import {
    NativeTextInput,
    NativeTextarea,
    NativeSelect
} from '@/components/forms/NativeIOSFormComponents';
import { PlatformDetection } from '@/utils/PlatformDetection';


export default function IssueReporter({
                                          buttonText = "📧 Report Issue",
                                          buttonClassName = "px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm",
                                          context = "general" // Context of where the issue is being reported from
                                      }) {
    const { data: session } = useSafeSession();
    const [showModal, setShowModal] = useState(false);
    const [reportData, setReportData] = useState({
        issue: '',
        description: '',
        email: '',
        additionalFiles: [],
        context: context
    });

    const isIOS = PlatformDetection.isIOS();

    async function openModal() {
        if (isIOS) {
            try {
                const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.buttonTap();
            } catch (error) {
                console.log('Open modal haptic failed:', error);
            }
        }

        setReportData({
            issue: '',
            description: '',
            email: session?.user?.email || '',
            additionalFiles: [],
            context: context
        });
        setShowModal(true);
    }

    async function handleFileUpload(event) {
        const files = Array.from(event.target.files);
        const validFiles = files.filter(async file => {
            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            const maxSize = 10 * 1024 * 1024; // 10MB

            if (!validTypes.includes(file.type)) {
                const errorMessage = `File ${file.name} is not a supported image type.`;
                if (isIOS) {
                    try {
                        const {NativeDialog} = await import('@/components/mobile/NativeDialog');
                        await NativeDialog.showError({
                            title: 'Unsupported File Type',
                            message: errorMessage
                        });
                    } catch (error) {
                        const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                        await NativeDialog.showError({
                            title: 'Error',
                            message: errorMessage
                        });
                    }
                } else {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Error',
                        message: errorMessage
                    });
                }
                return false;
            }

            if (file.size > maxSize) {
                const errorMessage = `File ${file.name} is too large. Maximum size is 10MB.`;
                if (isIOS) {
                    try {
                        const {NativeDialog} = await import('@/components/mobile/NativeDialog');
                        await NativeDialog.showError({
                            title: 'File Too Large',
                            message: errorMessage
                        });
                    } catch (error) {
                        const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                        await NativeDialog.showError({
                            title: 'Error',
                            message: errorMessage
                        });
                    }
                } else {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Error',
                        message: errorMessage
                    });
                }
                return false;
            }

            return true;
        });

        if (validFiles.length > 0) {
            if (isIOS) {
                try {
                    const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                    await MobileHaptics.success();
                } catch (error) {
                    console.log('File upload haptic failed:', error);
                }
            }

            setReportData(prev => ({
                ...prev,
                additionalFiles: [...prev.additionalFiles, ...validFiles]
            }));
        }
    }

    async function removeFile(index) {
        if (isIOS) {
            try {
                const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.buttonTap();
            } catch (error) {
                console.log('Remove file haptic failed:', error);
            }
        }

        setReportData(prev => ({
            ...prev,
            additionalFiles: prev.additionalFiles.filter((_, i) => i !== index)
        }));
    }

    async function submitReport() {
        if (!reportData.issue || !reportData.description) {
            const errorMessage = 'Please fill in all required fields.';
            if (isIOS) {
                try {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Missing Information',
                        message: errorMessage
                    });
                } catch (error) {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Error',
                        message: errorMessage
                    });
                }
            } else {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Error',
                    message: errorMessage
                });
            }
            return;
        }

        // iOS form submit haptic
        if (isIOS) {
            try {
                const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.formSubmit();
            } catch (error) {
                console.log('Form submit haptic failed:', error);
            }
        }

        try {
            const formData = new FormData();
            formData.append('issue', reportData.issue);
            formData.append('description', reportData.description);
            formData.append('email', reportData.email);
            formData.append('context', reportData.context);
            formData.append('pageUrl', window.location.href);

            // Add additional files
            reportData.additionalFiles.forEach((file, index) => {
                formData.append(`additionalFile_${index}`, file, file.name);
            });

            const response = await fetchWithSession('/api/general-issue-report', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const successMessage = 'Thank you! Your issue report has been sent. We\'ll look into it and get back to you.';

                if (isIOS) {
                    try {
                        const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                        await MobileHaptics.success();

                        const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                        await NativeDialog.showSuccess({
                            title: 'Report Sent!',
                            message: successMessage
                        });
                    } catch (error) {
                        const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                        await NativeDialog.showSuccess({
                            title: 'Success',
                            message: successMessage
                        });
                    }
                } else {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showSuccess({
                        title: 'Success',
                        message: successMessage
                    });
                }

                setShowModal(false);
            } else {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Report Failed',
                    message: 'Failed to send report'
                });
                return;
            }
        } catch (error) {
            console.error('Error sending issue report:', error);

            const errorMessage = 'Failed to send issue report. Please try again.';
            if (isIOS) {
                try {
                    const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                    await MobileHaptics.error();

                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Send Failed',
                        message: errorMessage
                    });
                } catch (dialogError) {
                    const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                    await NativeDialog.showError({
                        title: 'Error',
                        message: errorMessage
                    });
                }
            } else {
                const { NativeDialog } = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showError({
                    title: 'Error',
                    message: errorMessage
                });
            }
        }
    }

    async function handleCloseModal() {
        if (isIOS) {
            try {
                const { MobileHaptics } = await import('@/components/mobile/MobileHaptics');
                await MobileHaptics.buttonTap();
            } catch (error) {
                console.log('Close modal haptic failed:', error);
            }
        }
        setShowModal(false);
    }

    const issueOptions = [
        { value: '', label: 'Select an issue...' },
        { value: 'page-not-loading', label: 'Page not loading' },
        { value: 'feature-not-working', label: 'Feature not working' },
        { value: 'data-not-saving', label: 'Data not saving' },
        { value: 'ui-layout-broken', label: 'Layout/design broken' },
        { value: 'slow-performance', label: 'Slow performance' },
        { value: 'error-message', label: 'Error message appeared' },
        { value: 'login-issues', label: 'Login/authentication issues' },
        { value: 'mobile-issues', label: 'Mobile app issues' },
        { value: 'feature-request', label: 'Feature request' },
        { value: 'other', label: 'Other issue' }
    ];

    return (
        <>
            <TouchEnhancedButton
                onClick={openModal}
                className={buttonClassName}
            >
                {buttonText}
            </TouchEnhancedButton>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-900">📧 Report an Issue</h3>
                                <TouchEnhancedButton
                                    onClick={handleCloseModal}
                                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                                >
                                    ×
                                </TouchEnhancedButton>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        What type of issue are you experiencing? *
                                    </label>
                                    <NativeSelect
                                        value={reportData.issue}
                                        onChange={(e) => setReportData(prev => ({ ...prev, issue: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        options={issueOptions}
                                        required={true}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Please describe the issue in detail *
                                    </label>
                                    <NativeTextarea
                                        value={reportData.description}
                                        onChange={(e) => setReportData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Describe what happened, what you expected, what you were trying to do, and any error messages you saw..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        rows={4}
                                        maxLength={2000}
                                        autoExpand={true}
                                        validation={(value) => ({
                                            isValid: value.trim().length >= 10,
                                            message: value.trim().length >= 10 ? 'Description looks comprehensive!' : 'Please provide more details (at least 10 characters)'
                                        })}
                                        errorMessage="Please provide a detailed description"
                                        successMessage="Great description!"
                                        required={true}
                                    />
                                    <div className="text-xs text-gray-500 mt-1">
                                        {reportData.description.length}/2000 characters
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Your email (for follow-up)
                                    </label>
                                    <NativeTextInput
                                        type="email"
                                        inputMode="email"
                                        value={reportData.email}
                                        onChange={(e) => setReportData(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="your.email@example.com"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        validation={(value) => {
                                            if (!value) return { isValid: true, message: '' };
                                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                            return {
                                                isValid: emailRegex.test(value),
                                                message: emailRegex.test(value) ? 'Valid email address' : 'Please enter a valid email'
                                            };
                                        }}
                                        errorMessage="Please enter a valid email address"
                                        successMessage="Valid email address"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Screenshots/Images (optional but helpful!)
                                    </label>
                                    <div className="space-y-3">
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                        <p className="text-xs text-gray-500">
                                            📸 Screenshots help us understand and fix issues faster!
                                            Supports: JPG, PNG, GIF, WebP (max 10MB each)
                                        </p>

                                        {reportData.additionalFiles.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium text-gray-700">
                                                    Files to be sent ({reportData.additionalFiles.length}):
                                                </p>
                                                {reportData.additionalFiles.map((file, index) => (
                                                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-sm">📸</span>
                                                            <span className="text-sm text-gray-700 truncate">
                                                                {file.name}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                ({(file.size / 1024 / 1024).toFixed(1)}MB)
                                                            </span>
                                                        </div>
                                                        <TouchEnhancedButton
                                                            onClick={() => removeFile(index)}
                                                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                                                        >
                                                            Remove
                                                        </TouchEnhancedButton>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                    <p className="text-sm text-green-800">
                                        🚀 <strong>Your report will include:</strong>
                                    </p>
                                    <ul className="text-sm text-green-700 mt-1 space-y-1">
                                        <li>• Your issue description</li>
                                        <li>• Current page URL and context</li>
                                        {reportData.additionalFiles.length > 0 && (
                                            <li>• {reportData.additionalFiles.length} screenshot{reportData.additionalFiles.length > 1 ? 's' : ''}</li>
                                        )}
                                        <li>• Browser and device information</li>
                                        <li>• <strong>No personal data from your account</strong></li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex space-x-3 mt-6">
                                <TouchEnhancedButton
                                    onClick={handleCloseModal}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={submitReport}
                                    disabled={!reportData.issue || !reportData.description}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed"
                                >
                                    📧 Send Report
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}