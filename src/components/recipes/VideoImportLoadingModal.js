'use client';

// file: /src/components/recipes/VideoImportLoadingModal.js

import { useEffect, useState } from 'react';

export default function VideoImportLoadingModal({
                                                    isVisible,
                                                    platform = 'facebook',
                                                    stage = 'processing',
                                                    message = 'Processing video...',
                                                    onCancel
                                                }) {
    const [dots, setDots] = useState('');

    // DEBUG: Add console logs
    useEffect(() => {
        console.log('🎭 VideoImportLoadingModal - isVisible changed to:', isVisible);
        console.log('🎭 VideoImportLoadingModal - platform:', platform);
        console.log('🎭 VideoImportLoadingModal - stage:', stage);
        console.log('🎭 VideoImportLoadingModal - message:', message);
    }, [isVisible, platform, stage, message]);

    const platformInfo = {
        tiktok: {
            name: 'TikTok',
            icon: '🎵',
            color: 'from-pink-500 to-purple-600',
            bgColor: 'from-pink-50 to-purple-50',
            borderColor: 'border-pink-200',
            estimatedTime: '15-45 seconds',
            description: 'Quick viral recipes and cooking trends'
        },
        instagram: {
            name: 'Instagram',
            icon: '📸',
            color: 'from-purple-500 to-pink-600',
            bgColor: 'from-purple-50 to-pink-50',
            borderColor: 'border-purple-200',
            estimatedTime: '20-60 seconds',
            description: 'Recipe reels and cooking posts'
        },
        facebook: {
            name: 'Facebook',
            icon: '👥',
            color: 'from-blue-500 to-indigo-600',
            bgColor: 'from-blue-50 to-indigo-50',
            borderColor: 'border-blue-200',
            estimatedTime: '15-30 seconds',
            description: 'AI-powered recipe extraction'
        },
        unknown: {
            name: 'Video',
            icon: '🎥',
            color: 'from-gray-500 to-gray-600',
            bgColor: 'from-gray-50 to-gray-50',
            borderColor: 'border-gray-200',
            estimatedTime: '30-120 seconds',
            description: 'Processing video content'
        }
    };

    const stageInfo = {
        starting: {
            icon: '🎬',
            title: 'Starting Analysis',
            progress: 10
        },
        downloading: {
            icon: '📥',
            title: 'Downloading Video',
            progress: 25
        },
        processing: {
            icon: '🤖',
            title: 'AI Frame Analysis',
            progress: 60
        },
        generating: {
            icon: '📝',
            title: 'Creating Recipe',
            progress: 85
        },
        complete: {
            icon: '✅',
            title: 'Complete',
            progress: 100
        }
    };

    const info = platformInfo[platform] || platformInfo.unknown;
    const currentStage = stageInfo[stage] || stageInfo.processing;

    // Animate dots
    useEffect(() => {
        if (!isVisible) return;

        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);

        return () => clearInterval(interval);
    }, [isVisible]);

    // DEBUG: Early return with logging
    if (!isVisible) {
        console.log('🎭 VideoImportLoadingModal - not visible, returning null');
        return null;
    }

    console.log('🎭 VideoImportLoadingModal - rendering modal');

    const steps = [
        { key: 'starting', label: 'Initialize analysis', completed: ['downloading', 'processing', 'generating', 'complete'].includes(stage) },
        { key: 'downloading', label: 'Download video', completed: ['processing', 'generating', 'complete'].includes(stage) },
        { key: 'processing', label: 'AI frame analysis', completed: ['generating', 'complete'].includes(stage) },
        { key: 'generating', label: 'Generate recipe', completed: ['complete'].includes(stage) }
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative`}>
                {/* Cancel button */}
                {onCancel && stage !== 'complete' && (
                    <button
                        onClick={() => {
                            console.log('🚫 Modal cancel button clicked');
                            onCancel();
                        }}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                )}

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="text-4xl mb-3">
                        {currentStage.icon}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {currentStage.title}
                    </h3>
                    <p className="text-gray-600 capitalize">
                        Importing from {platform}
                    </p>
                </div>

                {/* Progress Animation */}
                <div className="mb-6">
                    <div className="flex justify-center mb-4">
                        {stage === 'complete' ? (
                            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                            </div>
                        ) : (
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        )}
                    </div>
                    <p className="text-center text-gray-700 font-medium">
                        {message}{stage !== 'complete' ? dots : ''}
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                    <div className="flex justify-between text-xs text-gray-500 mb-2">
                        <span>Progress</span>
                        <span>{currentStage.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className={`h-2 ${stage === 'complete' ? 'bg-green-500' : 'bg-indigo-600'} rounded-full transition-all duration-1000 ease-out`}
                            style={{ width: `${currentStage.progress}%` }}
                        ></div>
                    </div>
                </div>

                {/* Progress Steps */}
                <div className="space-y-2 mb-6">
                    {steps.map((step, index) => (
                        <div key={step.key} className="flex items-center">
                            <div className={`w-4 h-4 rounded-full mr-3 ${
                                step.completed ? 'bg-green-500' :
                                    stage === step.key ? 'bg-indigo-600 animate-pulse' :
                                        'bg-gray-300'
                            }`}></div>
                            <span className={`text-sm ${
                                step.completed ? 'text-green-600 font-medium' :
                                    stage === step.key ? 'text-indigo-600 font-medium' :
                                        'text-gray-500'
                            }`}>
                                {step.label}
                            </span>
                            {step.completed && (
                                <svg className="w-4 h-4 ml-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                            )}
                        </div>
                    ))}
                </div>

                {/* Tips */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-blue-800 text-sm">
                        💡 {stage === 'complete' ? 'Recipe extracted successfully! The form will be populated automatically.' :
                        'This usually takes 15-30 seconds. The AI is watching your video and extracting the complete recipe!'}
                    </p>
                </div>

                {/* Expected time (only show if not complete) */}
                {stage !== 'complete' && (
                    <div className="text-center text-sm text-gray-500">
                        Expected time: {info.estimatedTime}
                    </div>
                )}

                {/* DEBUG INFO */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 bg-red-100 p-2 rounded text-xs">
                        <strong>Debug:</strong> Modal is rendering!<br/>
                        Platform: {platform}<br/>
                        Stage: {stage}<br/>
                        Message: {message}<br/>
                        Progress: {currentStage.progress}%
                    </div>
                )}
            </div>
        </div>
    );
}