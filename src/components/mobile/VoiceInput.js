'use client';

// file: /src/components/mobile/VoiceInput.js v2 - Enhanced for iOS/Android compatibility

import { useState, useRef, useEffect, useCallback } from 'react';
import { TouchEnhancedButton } from './TouchEnhancedButton';
import { usePWA } from '@/hooks/usePWA';

export function VoiceInput({ onResult, onError, placeholder = "Say something..." }) {
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [confidence, setConfidence] = useState(0);
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

        if (SpeechRecognition && mobileSupported) {
            const recognition = new SpeechRecognition();

            // Mobile-optimized configuration
            recognition.continuous = false; // Important for mobile
            recognition.interimResults = true;
            recognition.lang = 'en-US';
            recognition.maxAlternatives = 1;

            // iOS-specific optimizations
            if (browserInfo.platform === 'ios') {
                // Shorter timeout for iOS
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
                    const confidence = event.results[i][0].confidence || 0.8; // iOS sometimes doesn't provide confidence

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
                        errorMessage = browserInfo.platform === 'ios'
                            ? 'No speech detected. Make sure microphone access is allowed.'
                            : 'No speech detected. Please try again.';
                        break;
                    case 'audio-capture':
                        errorMessage = 'Microphone not available. Check your device settings.';
                        break;
                    case 'not-allowed':
                        errorMessage = browserInfo.platform === 'ios'
                            ? 'Microphone access denied. Go to Settings > Safari > Microphone to allow access.'
                            : 'Microphone access denied. Please allow microphone access and try again.';
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
                // Stronger vibration feedback for mobile
                vibrateDevice([100, 50, 100]);
            };

            recognition.onend = () => {
                setIsListening(false);
                vibrateDevice([50]);
            };

            // Mobile-specific timeout handling
            recognition.onspeechstart = () => {
                console.log('Speech detected');
            };

            recognition.onspeechend = () => {
                console.log('Speech ended');
                // On mobile, auto-stop after speech ends
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
    }, [onResult, onError, vibrateDevice, browserInfo]);

    // Mobile-optimized start function
    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            try {
                // Mobile-specific preparation
                if (browserInfo.platform === 'ios' || browserInfo.platform === 'android') {
                    // Clear any previous state
                    setTranscript('');
                    setConfidence(0);
                }

                recognitionRef.current.start();
            } catch (error) {
                console.error('Failed to start recognition:', error);
                if (onError) {
                    const errorMsg = browserInfo.platform === 'ios'
                        ? 'Voice recognition failed. Make sure you have iOS 14.5 or later.'
                        : 'Failed to start voice recognition. Please try again.';
                    onError(errorMsg);
                }
            }
        }
    }, [isListening, onError, browserInfo.platform]);

    // Mobile-optimized stop function
    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    }, [isListening]);

    // Toggle with mobile considerations
    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            // Request microphone permission on mobile before starting
            if (browserInfo.platform === 'ios' || browserInfo.platform === 'android') {
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    navigator.mediaDevices.getUserMedia({ audio: true })
                        .then(() => {
                            startListening();
                        })
                        .catch((error) => {
                            console.error('Microphone permission denied:', error);
                            if (onError) {
                                onError('Microphone access is required for voice input. Please grant permission and try again.');
                            }
                        });
                } else {
                    startListening();
                }
            } else {
                startListening();
            }
        }
    }, [isListening, startListening, stopListening, browserInfo.platform, onError]);

    // Don't render if not supported
    if (!isSupported) {
        // Show helpful message for unsupported browsers
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

        return null;
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
            // Mobile-specific touch improvements
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
                    width: '52px', // Slightly larger for mobile
                    height: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    animation: isListening ? 'pulse 1.5s infinite' : 'none',
                    // Mobile touch improvements
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
                            wordBreak: 'break-word' // Better for mobile
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
                        {placeholder}
                    </div>
                )}
            </div>

            {/* Enhanced Visual Feedback for Mobile */}
            {isListening && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px' // Slightly larger gap for mobile
                }}>
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            style={{
                                width: '4px', // Slightly wider for mobile
                                height: '24px', // Slightly taller for mobile
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