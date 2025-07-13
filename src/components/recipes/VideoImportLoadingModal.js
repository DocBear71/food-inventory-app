'use client';
// file: /src/components/recipes/VideoImportLoadingModal.js v3 - External control, no internal timers

import { useEffect, useState } from 'react';

const VideoImportLoadingModal = ({
                                     isVisible = false,
                                     platform = 'video',
                                     stage = 'processing',
                                     message = '',
                                     videoUrl = '',
                                     progress = null, // NEW: Allow external progress control
                                     onComplete = null
                                 }) => {
    const [internalProgress, setInternalProgress] = useState(0);
    const [currentTask, setCurrentTask] = useState('');

    useEffect(() => {

        if (!isVisible) {
            setInternalProgress(0);
            setCurrentTask('');
            return;
        }

        // If external progress is provided, use it
        if (progress !== null) {
            setInternalProgress(progress);
            setCurrentTask(message);
            return;
        }

        // Otherwise use slower, more realistic timing that matches API duration
        const phases = [
            { progress: 10, task: '🔗 Connecting to video source...', delay: 2000 },
            { progress: 25, task: '📥 Downloading video content...', delay: 3000 },
            { progress: 45, task: '🤖 AI analyzing video content...', delay: 4000 },
            { progress: 65, task: '📄 Extracting recipe information...', delay: 3000 },
            { progress: 80, task: '🧪 Analyzing ingredients & instructions...', delay: 2000 },
            { progress: 90, task: '🍳 Calculating nutrition information...', delay: 2000 },
            { progress: 95, task: '✅ Finalizing recipe...', delay: 1000 }
            // Don't go to 100% automatically - let parent control this
        ];

        let currentPhase = 0;
        let phaseTimeout;

        const runPhase = () => {
            if (currentPhase < phases.length && isVisible) {
                const phase = phases[currentPhase];

                phaseTimeout = setTimeout(() => {
                    if (isVisible) {
                        setInternalProgress(phase.progress);
                        setCurrentTask(phase.task);
                        currentPhase++;
                        runPhase();
                    }
                }, phase.delay);
            }
        };

        // Start the phases
        runPhase();

        // Cleanup function
        return () => {
            if (phaseTimeout) {
                clearTimeout(phaseTimeout);
            }
        };
    }, [isVisible, progress, message]);

    if (!isVisible) {
        console.log('🎭 VideoImportLoadingModal - not visible, returning null');
        return null;
    }

    const displayProgress = progress !== null ? progress : internalProgress;
    const displayTask = progress !== null ? message : currentTask;

    const getLoadingEmoji = () => {
        if (displayProgress < 20) return "🔗";
        if (displayProgress < 40) return "📥";
        if (displayProgress < 60) return "🤖";
        if (displayProgress < 80) return "📄";
        if (displayProgress < 95) return "🧪";
        return "✅";
    };

    const getPlatformEmoji = () => {
        switch (platform.toLowerCase()) {
            case 'facebook': return '📘';
            case 'instagram': return '📷';
            case 'tiktok': return '🎵';
            case 'youtube': return '📺';
            default: return '🎥';
        }
    };

    const getPlatformColor = () => {
        switch (platform.toLowerCase()) {
            case 'facebook': return 'from-blue-500 to-blue-600';
            case 'instagram': return 'from-pink-500 to-purple-600';
            case 'tiktok': return 'from-black to-red-600';
            case 'youtube': return 'from-red-500 to-red-600';
            default: return 'from-indigo-500 to-purple-600';
        }
    };

    const getProgressMessage = () => {
        if (displayProgress < 20) return "🔗 Establishing connection...";
        if (displayProgress < 40) return "📥 Downloading content...";
        if (displayProgress < 60) return "🤖 AI analyzing video...";
        if (displayProgress < 80) return "📄 Extracting recipe...";
        if (displayProgress < 95) return "🧪 Processing ingredients...";
        if (displayProgress === 100) return "🎉 Recipe ready!";
        return "⚡ Processing your video...";
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-md flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl border border-gray-100">

                {/* Main Loading Spinner */}
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        {/* Outer spinning ring - dynamic color based on platform */}
                        <div className={`w-20 h-20 border-4 border-gray-200 rounded-full animate-spin`}
                             style={{
                                 borderTopColor: platform === 'facebook' ? '#1877F2' :
                                     platform === 'instagram' ? '#E4405F' :
                                         platform === 'tiktok' ? '#FF0050' :
                                             platform === 'youtube' ? '#FF0000' :
                                                 '#6366F1'
                             }}></div>

                        {/* Center emoji with platform-specific background */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className={`w-12 h-12 bg-gradient-to-br ${getPlatformColor()} rounded-full flex items-center justify-center shadow-lg animate-pulse`}>
                                <span className="text-white text-xl">{getLoadingEmoji()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">
                    {getPlatformEmoji()} {platform.charAt(0).toUpperCase() + platform.slice(1)} Recipe Importer
                </h3>

                {/* Current Task */}
                <div className="text-center mb-6">
                    <p className="text-gray-700 font-medium text-lg mb-2">{displayTask}</p>
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                        <span>🤖</span>
                        <span>Powered by Doc Bear's AI extraction</span>
                        <span>🤖</span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
                    <div
                        className={`h-full bg-gradient-to-r ${getPlatformColor()} rounded-full transition-all duration-500 ease-out`}
                        style={{ width: `${displayProgress}%` }}
                    ></div>
                </div>

                {/* Progress Percentage */}
                <div className="text-center mb-6">
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                        {Math.round(displayProgress)}%
                    </div>
                    <div className="text-sm text-gray-600 font-medium">
                        {displayProgress === 100 ? "🎊 Import Complete!" : "Processing..."}
                    </div>
                </div>

                {/* Video Info */}
                {videoUrl && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
                        <div className="text-center">
                            <div className="text-sm font-medium text-gray-700 mb-1">
                                Source Video
                            </div>
                            <div className="text-xs text-gray-500 break-all">
                                {videoUrl.length > 50 ? `${videoUrl.substring(0, 47)}...` : videoUrl}
                            </div>
                        </div>
                    </div>
                )}

                {/* Processing Steps */}
                <div className="space-y-2">
                    {[
                        { step: "Connect to video", completed: displayProgress > 15 },
                        { step: "Download content", completed: displayProgress > 30 },
                        { step: "AI analysis", completed: displayProgress > 50 },
                        { step: "Extract recipe", completed: displayProgress > 70 },
                        { step: "Process nutrition", completed: displayProgress > 90 }
                    ].map((item, index) => (
                        <div key={index} className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                item.completed
                                    ? 'bg-green-500 border-green-500'
                                    : displayProgress > index * 20
                                        ? 'border-indigo-500 bg-indigo-100'
                                        : 'border-gray-300'
                            }`}>
                                {item.completed && (
                                    <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                            <span className={`text-sm ${
                                item.completed ? 'text-green-600 font-medium' : 'text-gray-600'
                            }`}>
                                {item.step}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Success Message */}
                {displayProgress === 100 && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-center">
                            <div className="text-green-800 font-medium mb-1">
                                🎉 Recipe Successfully Extracted!
                            </div>
                            <div className="text-green-600 text-sm">
                                Review and edit your imported recipe before saving
                            </div>
                        </div>
                    </div>
                )}

                {/* Progress Message */}
                <div className="text-center mt-4">
                    <div className="text-sm text-gray-600 font-medium">
                        {getProgressMessage()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoImportLoadingModal;