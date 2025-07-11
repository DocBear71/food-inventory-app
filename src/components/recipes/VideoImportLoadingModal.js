'use client';

// file: /src/components/recipes/VideoImportLoadingModal.js

import { useEffect, useState } from 'react';

export default function VideoImportLoadingModal({ isVisible, platform, onCancel }) {
    const [loadingStep, setLoadingStep] = useState(0);
    const [dots, setDots] = useState('');

    // DEBUG: Add console logs
    useEffect(() => {
        console.log('🎭 VideoImportLoadingModal - isVisible changed to:', isVisible);
        console.log('🎭 VideoImportLoadingModal - platform:', platform);
    }, [isVisible, platform]);

    const steps = [
        { text: 'Analyzing video...', duration: 3000 },
        { text: 'Extracting audio...', duration: 4000 },
        { text: 'AI transcribing speech...', duration: 8000 },
        { text: 'Parsing recipe ingredients...', duration: 5000 },
        { text: 'Generating instructions...', duration: 4000 },
        { text: 'Adding video timestamps...', duration: 3000 },
        { text: 'Finalizing recipe...', duration: 2000 }
    ];

    const platformInfo = {
        tiktok: {
            icon: '🎵',
            color: 'from-pink-500 to-purple-600',
            bgColor: 'bg-gradient-to-br from-pink-50 to-purple-50',
            expected: '15-45 seconds'
        },
        instagram: {
            icon: '📸',
            color: 'from-purple-500 to-pink-600',
            bgColor: 'bg-gradient-to-br from-purple-50 to-pink-50',
            expected: '20-60 seconds'
        },
        youtube: {
            icon: '📺',
            color: 'from-red-500 to-orange-600',
            bgColor: 'bg-gradient-to-br from-red-50 to-orange-50',
            expected: '30-90 seconds'
        }
    };

    const info = platformInfo[platform] || platformInfo.youtube;

    // Animate dots
    useEffect(() => {
        if (!isVisible) return;

        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);

        return () => clearInterval(interval);
    }, [isVisible]);

    // Auto-advance loading steps
    useEffect(() => {
        if (!isVisible) {
            setLoadingStep(0);
            return;
        }

        let timeouts = [];
        let currentTime = 0;

        steps.forEach((step, index) => {
            const timeout = setTimeout(() => {
                setLoadingStep(index);
            }, currentTime);
            timeouts.push(timeout);
            currentTime += step.duration;
        });

        return () => {
            timeouts.forEach(timeout => clearTimeout(timeout));
        };
    }, [isVisible]);

    // DEBUG: Early return with logging
    if (!isVisible) {
        console.log('🎭 VideoImportLoadingModal - not visible, returning null');
        return null;
    }

    console.log('🎭 VideoImportLoadingModal - rendering modal');

    const currentStep = steps[loadingStep] || steps[0];
    const progress = ((loadingStep + 1) / steps.length) * 100;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`${info.bgColor} rounded-2xl shadow-2xl max-w-md w-full p-8 relative`}>
                {/* Cancel button */}
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

                {/* Platform icon and title */}
                <div className="text-center mb-6">
                    <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r ${info.color} rounded-full text-white text-2xl mb-4 shadow-lg`}>
                        {info.icon}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Extracting Recipe from {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </h2>
                    <p className="text-gray-600 text-sm">
                        Using AI to analyze video and extract recipe details
                    </p>
                </div>

                {/* Loading animation */}
                <div className="mb-6">
                    <div className="flex items-center justify-center mb-4">
                        <div className="relative">
                            {/* Spinning ring */}
                            <div className={`w-16 h-16 border-4 border-gray-200 border-t-transparent rounded-full animate-spin bg-gradient-to-r ${info.color}`}></div>
                            {/* Inner pulsing circle */}
                            <div className={`absolute inset-2 bg-gradient-to-r ${info.color} rounded-full animate-pulse opacity-20`}></div>
                        </div>
                    </div>

                    {/* Current step */}
                    <div className="text-center">
                        <p className="text-lg font-medium text-gray-800 mb-2">
                            {currentStep.text}{dots}
                        </p>
                        <p className="text-sm text-gray-500">
                            Expected time: {info.expected}
                        </p>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mb-6">
                    <div className="flex justify-between text-xs text-gray-500 mb-2">
                        <span>Progress</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className={`h-2 bg-gradient-to-r ${info.color} rounded-full transition-all duration-1000 ease-out`}
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>

                {/* Steps list */}
                <div className="space-y-2">
                    {steps.map((step, index) => (
                        <div key={index} className="flex items-center text-sm">
                            <div className={`w-3 h-3 rounded-full mr-3 ${
                                index < loadingStep ? 'bg-green-500' :
                                    index === loadingStep ? `bg-gradient-to-r ${info.color}` : 'bg-gray-300'
                            }`}></div>
                            <span className={`${
                                index <= loadingStep ? 'text-gray-800 font-medium' : 'text-gray-500'
                            }`}>
                                {step.text.replace('...', '')}
                            </span>
                            {index < loadingStep && (
                                <svg className="w-4 h-4 ml-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                            )}
                        </div>
                    ))}
                </div>

                {/* Tips */}
                <div className="mt-6 p-4 bg-white bg-opacity-50 rounded-lg">
                    <p className="text-xs text-gray-600">
                        <strong>💡 Tip:</strong> Better results with clear audio and step-by-step cooking instructions.
                    </p>
                </div>

                {/* DEBUG INFO */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 bg-red-100 p-2 rounded text-xs">
                        <strong>Debug:</strong> Modal is rendering!<br/>
                        Platform: {platform}<br/>
                        Step: {loadingStep}/{steps.length}
                    </div>
                )}
            </div>
        </div>
    );
}