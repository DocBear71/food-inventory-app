'use client';
// file: /src/components/support/IssueReporter.js - General issue reporting component


import { useState } from 'react';
import { useSafeSession } from '@/hooks/useSafeSession';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { getApiUrl } from '@/lib/api-config';


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

    function openModal() {
        setReportData({
            issue: '',
            description: '',
            email: session?.user?.email || '',
            additionalFiles: [],
            context: context
        });
        setShowModal(true);
    }

    function handleFileUpload(event) {
        const files = Array.from(event.target.files);
        const validFiles = files.filter(file => {
            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            const maxSize = 10 * 1024 * 1024; // 10MB

            if (!validTypes.includes(file.type)) {
                alert(`File ${file.name} is not a supported image type.`);
                return false;
            }

            if (file.size > maxSize) {
                alert(`File ${file.name} is too large. Maximum size is 10MB.`);
                return false;
            }

            return true;
        });

        setReportData(prev => ({
            ...prev,
            additionalFiles: [...prev.additionalFiles, ...validFiles]
        }));
    }

    function removeFile(index) {
        setReportData(prev => ({
            ...prev,
            additionalFiles: prev.additionalFiles.filter((_, i) => i !== index)
        }));
    }

    async function submitReport() {
        if (!reportData.issue || !reportData.description) {
            alert('Please fill in all required fields.');
            return;
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

            const response = await fetch(getApiUrl('/api/general-issue-report', {
                method: 'POST',
                body: formData
            }));

            if (response.ok) {
                alert('✅ Thank you! Your issue report has been sent. We\'ll look into it and get back to you.');
                setShowModal(false);
            } else {
                throw new Error('Failed to send report');
            }
        } catch (error) {
            console.error('Error sending issue report:', error);
            alert('❌ Failed to send issue report. Please try again.');
        }
    }

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
                                    onClick={() => setShowModal(false)}
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
                                    <select
                                        value={reportData.issue}
                                        onChange={(e) => setReportData(prev => ({ ...prev, issue: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="">Select an issue...</option>
                                        <option value="page-not-loading">Page not loading</option>
                                        <option value="feature-not-working">Feature not working</option>
                                        <option value="data-not-saving">Data not saving</option>
                                        <option value="ui-layout-broken">Layout/design broken</option>
                                        <option value="slow-performance">Slow performance</option>
                                        <option value="error-message">Error message appeared</option>
                                        <option value="login-issues">Login/authentication issues</option>
                                        <option value="mobile-issues">Mobile app issues</option>
                                        <option value="feature-request">Feature request</option>
                                        <option value="other">Other issue</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Please describe the issue in detail *
                                    </label>
                                    <textarea
                                        value={reportData.description}
                                        onChange={(e) => setReportData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Describe what happened, what you expected, what you were trying to do, and any error messages you saw..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        rows={4}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Your email (for follow-up)
                                    </label>
                                    <input
                                        type="email"
                                        value={reportData.email}
                                        onChange={(e) => setReportData(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="your.email@example.com"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
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
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </TouchEnhancedButton>
                                <TouchEnhancedButton
                                    onClick={submitReport}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
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