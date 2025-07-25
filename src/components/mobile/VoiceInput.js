'use client';

// file: /src/components/mobile/VoiceInput.js v3 - Fixed permission handling

import { useState, useRef, useEffect, useCallback } from 'react';
import { TouchEnhancedButton } from './TouchEnhancedButton';
import { usePWA } from '@/hooks/usePWA';

export function VoiceInput({ onResult, onError, placeholder = "Say something..." }) {
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [confidence, setConfidence] = useState(0);
    const [permissionStatus, setPermissionStatus] = useState('unknown'); // 'granted', 'denied', 'prompt', 'unknown'
    const [browserInfo, setBrowserInfo] = useState({ browser: '', version: '', platform: '' });
    const recognitionRef = useRef(null);
    const { vibrateDevice } = usePWA();

    // Detect browser and platform
    useEffect(() => {
        const detectBrowser = () => {
            const ua = navigator.userAgent;
            const isIOS = /iPad|iPhone|iPod/.test(ua);
            const isAndroid = /Android/.test(ua);
            const isChrome = /Chrome/.test(ua);
            const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
            const isFirefox = /Firefox/.test(ua);

            let browser = 'unknown';
            if (isChrome) browser = 'chrome';
            else if (isSafari) browser = 'safari';
            else if (isFirefox) browser = 'firefox';

            let platform = 'desktop';
            if (isIOS) platform = 'ios';
            else if (isAndroid) platform = 'android';

            setBrowserInfo({ browser, platform, ua });
        };

        detectBrowser();
    }, []);

    // Check microphone permission status
    const checkMicrophonePermission = useCallback(async () => {
        try {
            if (navigator.permissions && navigator.permissions.query) {
                const result = await navigator.permissions.query({ name: 'microphone' });
                setPermissionStatus(result.state);

                // Listen for permission changes
                result.onchange = () => {
                    setPermissionStatus(result.state);
                };

                return result.state;
            } else {
                // Fallback for browsers that don't support permissions API
                setPermissionStatus('unknown');
                return 'unknown';
            }
        } catch (error) {
            console.log('Permission API not supported:', error);
            setPermissionStatus('unknown');
            return 'unknown';
        }
    }, []);

    // Request microphone permission explicitly
    const requestMicrophonePermission = useCallback(async () => {
        try {
            console.log('🎤 Requesting microphone permission...');

            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });

                // Stop the stream immediately - we just wanted permission
                stream.getTracks().forEach(track => track.stop());

                setPermissionStatus('granted');
                console.log('✅ Microphone permission granted');
                return true;
            } else {
                throw new Error('getUserMedia not supported');
            }
        } catch (error) {
            console.error('❌ Microphone permission denied:', error);
            setPermissionStatus('denied');

            let errorMessage = 'Microphone access denied. ';

            if (browserInfo.platform === 'ios') {
                errorMessage += 'Go to Settings > Safari > Camera & Microphone > Allow websites to ask.';
            } else if (browserInfo.platform === 'android') {
                errorMessage += 'Check your browser settings to allow microphone access.';
            } else {
                errorMessage += 'Click the microphone icon in your browser\'s address bar to allow access.';
            }

            if (onError) {
                onError(errorMessage);
            }
            return false;
        }
    }, [browserInfo.platform, onError]);

    // Check browser support with mobile-specific considerations
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const isSupported = !!SpeechRecognition;

        // Additional checks for mobile platforms
        let mobileSupported = isSupported;

        if (browserInfo.platform === 'ios') {
            // Check iOS version - need 14.5+
            const match = browserInfo.ua.match(/OS (\d+)_(\d+)/);
            if (match) {
                const majorVersion = parseInt(match[1]);
                const minorVersion = parseInt(match[2]);
                mobileSupported = majorVersion > 14 || (majorVersion === 14 && minorVersion >= 5);
            }
        }

        setIsSupported(isSupported && mobileSupported);

        // Check initial permission status
        if (isSupported && mobileSupported) {
            checkMicrophonePermission();
        }
    }, [browserInfo, checkMicrophonePermission]);

    // Initialize Speech Recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition && isSupported) {
            const recognition = new SpeechRecognition();

            // Mobile-optimized configuration
            recognition.continuous = false; // Important for mobile
            recognition.interimResults = true;
            recognition.lang = 'en-US';
            recognition.maxAlternatives = 1;

            // iOS-specific optimizations
            if (browserInfo.platform === 'ios') {
                recognition.continuous = false;
                recognition.interimResults = false; // iOS works better without interim results
            }

            // Android-specific optimizations
            if (browserInfo.platform === 'android') {
                recognition.continuous = false;
                recognition.interimResults = true;
            }

            // Handle results with mobile considerations
            recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    const confidence = event.results[i][0].confidence || 0.8;

                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                        setConfidence(confidence);
                    } else {
                        interimTranscript += transcript;
                    }
                }

                const currentTranscript = finalTranscript || interimTranscript;
                setTranscript(currentTranscript);

                if (finalTranscript && onResult) {
                    onResult(finalTranscript.trim(), confidence);
                }
            };

            // Enhanced error handling for mobile
            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);

                let errorMessage = 'Voice recognition failed';
                switch (event.error) {
                    case 'no-speech':
                        errorMessage = 'No speech detected. Please try again.';
                        break;
                    case 'audio-capture':
                        errorMessage = 'Microphone not available. Check your device settings.';
                        break;
                    case 'not-allowed':
                        errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
                        setPermissionStatus('denied');
                        break;
                    case 'network':
                        errorMessage = 'Network error. Voice recognition requires an internet connection.';
                        break;
                    case 'service-not-allowed':
                        errorMessage = 'Speech recognition service not allowed. Try reloading the page.';
                        break;
                    default:
                        errorMessage = `Voice recognition error: ${event.error}`;
                }

                if (onError) {
                    onError(errorMessage);
                }
            };

            // Handle start/end with mobile feedback
            recognition.onstart = () => {
                setIsListening(true);
                setTranscript('');
                vibrateDevice([100, 50, 100]);
            };

            recognition.onend = () => {
                setIsListening(false);
                vibrateDevice([50]);
            };

            recognition.onspeechstart = () => {
                console.log('Speech detected');
            };

            recognition.onspeechend = () => {
                console.log('Speech ended');
                if (browserInfo.platform === 'ios' || browserInfo.platform === 'android') {
                    setTimeout(() => {
                        if (recognition && isListening) {
                            recognition.stop();
                        }
                    }, 500);
                }
            };

            recognitionRef.current = recognition;
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, [onResult, onError, vibrateDevice, browserInfo, isSupported, isListening]);

    // Enhanced start function with permission check
    const startListening = useCallback(async () => {
        if (!recognitionRef.current || isListening) return;

        try {
            // Always check/request permission before starting
            console.log('🎤 Starting voice input, checking permissions...');

            const hasPermission = await requestMicrophonePermission();

            if (!hasPermission) {
                console.log('❌ No microphone permission, cannot start voice input');
                return;
            }

            // Clear any previous state
            setTranscript('');
            setConfidence(0);

            console.log('🎤 Starting speech recognition...');
            recognitionRef.current.start();
        } catch (error) {
            console.error('Failed to start recognition:', error);
            if (onError) {
                const errorMsg = browserInfo.platform === 'ios'
                    ? 'Voice recognition failed. Make sure you have iOS 14.5 or later and microphone access is allowed.'
                    : 'Failed to start voice recognition. Please try again.';
                onError(errorMsg);
            }
        }
    }, [isListening, requestMicrophonePermission, onError, browserInfo.platform]);

    // Stop function
    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    }, [isListening]);

    // Toggle function with better permission handling
    const toggleListening = useCallback(async () => {
        if (isListening) {
            stopListening();
        } else {
            await startListening();
        }
    }, [isListening, startListening, stopListening]);

    // Don't render if not supported
    if (!isSupported) {
        if (browserInfo.browser === 'firefox') {
            return (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm">
                        🦊 Voice input is not supported in Firefox. Try Chrome or Safari for voice features.
                    </p>
                </div>
            );
        }

        if (browserInfo.platform === 'ios') {
            return (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800 text-sm">
                        📱 Voice input requires iOS 14.5 or later. Please update your device to use voice features.
                    </p>
                </div>
            );
        }

        return (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-gray-800 text-sm">
                    🎤 Voice input is not supported in this browser. Try Chrome, Safari, or Edge.
                </p>
            </div>
        );
    }

    // Show permission denied state
    if (permissionStatus === 'denied') {
        return (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-3">
                    <span className="text-red-600 text-xl">🚫</span>
                    <div className="flex-1">
                        <p className="text-red-800 text-sm font-medium">Microphone Access Denied</p>
                        <p className="text-red-700 text-xs mt-1">
                            {browserInfo.platform === 'ios' && 'Go to Settings > Safari > Camera & Microphone to allow access.'}
                            {browserInfo.platform === 'android' && 'Check your browser settings to allow microphone access.'}
                            {browserInfo.platform === 'desktop' && 'Click the microphone icon in your browser\'s address bar to allow access.'}
                        </p>
                    </div>
                    <TouchEnhancedButton
                        onClick={requestMicrophonePermission}
                        className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
                    >
                        Retry
                    </TouchEnhancedButton>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            backgroundColor: isListening ? '#dbeafe' : '#f8fafc',
            borderRadius: '12px',
            border: `2px solid ${isListening ? '#3b82f6' : '#e5e7eb'}`,
            transition: 'all 0.2s ease',
            touchAction: 'manipulation',
            userSelect: 'none'
        }}>
            {/* Enhanced Voice Button for Mobile */}
            <TouchEnhancedButton
                onClick={toggleListening}
                style={{
                    backgroundColor: isListening ? '#ef4444' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '52px',
                    height: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    animation: isListening ? 'pulse 1.5s infinite' : 'none',
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                }}
                title={isListening ? 'Stop listening' : 'Start voice input'}
            >
                {isListening ? '⏹️' : '🎤'}
            </TouchEnhancedButton>

            {/* Enhanced Transcript Display */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {isListening ? (
                    <div>
                        <div style={{
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#3b82f6',
                            marginBottom: '0.25rem'
                        }}>
                            🎤 {browserInfo.platform === 'ios' ? 'Speak now...' : 'Listening...'}
                        </div>
                        <div style={{
                            fontSize: '1rem',
                            color: '#374151',
                            minHeight: '1.5rem',
                            wordBreak: 'break-word'
                        }}>
                            {transcript || 'Say something...'}
                        </div>
                        {confidence > 0 && (
                            <div style={{
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                marginTop: '0.25rem'
                            }}>
                                Confidence: {Math.round(confidence * 100)}%
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{
                        fontSize: '0.875rem',
                        color: '#6b7280'
                    }}>
                        {permissionStatus === 'prompt' ? 'Click microphone to start' : placeholder}
                    </div>
                )}
            </div>

            {/* Enhanced Visual Feedback for Mobile */}
            {isListening && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                }}>
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            style={{
                                width: '4px',
                                height: '24px',
                                backgroundColor: '#3b82f6',
                                borderRadius: '2px',
                                animation: `voice-wave 1.2s ease-in-out infinite`,
                                animationDelay: `${i * 0.1}s`
                            }}
                        />
                    ))}
                </div>
            )}

            <style jsx>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }

                @keyframes voice-wave {
                    0%, 100% { transform: scaleY(0.5); }
                    50% { transform: scaleY(1); }
                }
            `}</style>
        </div>
    );
}