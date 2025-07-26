'use client';

// file: /src/components/mobile/VoiceInput.js v7 - NATIVE: Using @capacitor-community/speech-recognition

import { useState, useRef, useEffect, useCallback } from 'react';
import { TouchEnhancedButton } from './TouchEnhancedButton';
import { usePWA } from '@/hooks/usePWA';

export function VoiceInput({ onResult, onError, placeholder = "Say something..." }) {
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [confidence, setConfidence] = useState(0);
    const [permissionStatus, setPermissionStatus] = useState('unknown');
    const [browserInfo, setBrowserInfo] = useState({ browser: '', version: '', platform: '' });
    const [isCapacitor, setIsCapacitor] = useState(false);
    const [speechRecognition, setSpeechRecognition] = useState(null);
    const { vibrateDevice } = usePWA();

    // Detect Capacitor and browser/platform
    useEffect(() => {
        const detectEnvironment = () => {
            const ua = navigator.userAgent;
            const isIOS = /iPad|iPhone|iPod/.test(ua);
            const isAndroid = /Android/.test(ua);
            const isChrome = /Chrome/.test(ua);
            const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
            const isFirefox = /Firefox/.test(ua);

            // Check if running in Capacitor
            const isCapacitorApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
            setIsCapacitor(isCapacitorApp);

            let browser = 'unknown';
            if (isChrome) browser = 'chrome';
            else if (isSafari) browser = 'safari';
            else if (isFirefox) browser = 'firefox';

            let platform = 'desktop';
            if (isIOS) platform = 'ios';
            else if (isAndroid) platform = 'android';

            setBrowserInfo({ browser, platform, ua, isCapacitor: isCapacitorApp });

            console.log('🔍 Environment detected:', {
                browser,
                platform,
                isCapacitor: isCapacitorApp,
                hasCapacitor: !!window.Capacitor,
                isNative: isCapacitorApp
            });
        };

        detectEnvironment();
    }, []);

    // Initialize speech recognition based on environment
    useEffect(() => {
        const initializeSpeechRecognition = async () => {
            if (isCapacitor) {
                // Use native plugin for Capacitor
                try {
                    console.log('🎤 Initializing native speech recognition plugin...');
                    const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
                    setSpeechRecognition(SpeechRecognition);
                    setIsSupported(true);
                    console.log('✅ Native speech recognition plugin loaded');

                    // Check permissions
                    checkNativePermissions(SpeechRecognition);
                } catch (error) {
                    console.error('❌ Failed to load native speech recognition:', error);
                    setIsSupported(false);
                    setSpeechRecognition(null);
                }
            } else {
                // Use web API for browsers
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (SpeechRecognition) {
                    console.log('🌐 Using web speech recognition API');
                    setIsSupported(true);
                    checkWebPermissions();
                } else {
                    console.log('❌ Web speech recognition not supported');
                    setIsSupported(false);
                }
            }
        };

        if (browserInfo.platform !== '') {
            initializeSpeechRecognition();
        }
    }, [browserInfo, isCapacitor]);

    // Check native permissions using the plugin
    const checkNativePermissions = async (SpeechRecognition) => {
        try {
            console.log('🎤 Checking native speech recognition permissions...');
            const result = await SpeechRecognition.available();
            console.log('🎤 Native speech recognition availability:', result);

            if (result.available) {
                setPermissionStatus('granted');
                console.log('✅ Native speech recognition is available');
            } else {
                setPermissionStatus('denied');
                console.log('❌ Native speech recognition not available');
            }
        } catch (error) {
            console.error('❌ Error checking native permissions:', error);
            setPermissionStatus('unknown');
        }
    };

    // Check web permissions (fallback)
    const checkWebPermissions = async () => {
        try {
            if (navigator.permissions && navigator.permissions.query) {
                const result = await navigator.permissions.query({ name: 'microphone' });
                setPermissionStatus(result.state);
                console.log('🎤 Web microphone permission status:', result.state);
            } else {
                setPermissionStatus('unknown');
            }
        } catch (error) {
            console.log('⚠️ Could not check web permissions:', error);
            setPermissionStatus('unknown');
        }
    };

    // Request permissions
    const requestPermissions = async () => {
        if (isCapacitor && speechRecognition) {
            try {
                console.log('🎤 Requesting native speech recognition permissions...');
                const result = await speechRecognition.requestPermissions();
                console.log('🎤 Native permission result:', result);

                if (result.speechRecognition === 'granted') {
                    setPermissionStatus('granted');
                    return true;
                } else {
                    setPermissionStatus('denied');
                    if (onError) {
                        onError('Microphone permission denied. Please enable microphone access in your device settings:\n\n• Settings > Apps > Doc Bear\'s Comfort Kitchen > Permissions > Microphone > Allow\n• Then restart the app');
                    }
                    return false;
                }
            } catch (error) {
                console.error('❌ Native permission request failed:', error);
                setPermissionStatus('denied');
                if (onError) {
                    onError('Failed to request microphone permissions. Please check your device settings.');
                }
                return false;
            }
        } else {
            // Web fallback
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop());
                setPermissionStatus('granted');
                return true;
            } catch (error) {
                setPermissionStatus('denied');
                if (onError) {
                    onError('Microphone permission denied. Please allow microphone access and try again.');
                }
                return false;
            }
        }
    };

    // Start listening using native plugin
    const startNativeListening = async () => {
        if (!speechRecognition) {
            if (onError) onError('Speech recognition not available');
            return false;
        }

        try {
            console.log('🎤 Starting native speech recognition...');
            setIsListening(true);
            setTranscript('Listening... speak now');
            setConfidence(0);
            vibrateDevice([100, 50, 100]);

            const result = await speechRecognition.start({
                language: 'en-US',
                maxResults: 1,
                prompt: 'Speak now...',
                partialResults: true,
                popup: false // Don't show system popup
            });

            console.log('🎯 Native speech recognition result:', result);

            // Handle different result formats and error cases
            if (result && result.matches && result.matches.length > 0) {
                const transcript = result.matches[0];
                const confidence = result.confidence || 0.8;

                setTranscript(transcript);
                setConfidence(confidence);

                console.log('✅ Native speech result:', transcript);

                if (onResult) {
                    onResult(transcript.trim(), confidence);
                }
            } else if (result && result.message) {
                // Handle plugin error messages
                console.log('⚠️ Plugin returned message:', result.message);

                if (result.message === 'No match') {
                    if (onError) {
                        onError('No speech detected. Please try speaking louder and clearer.');
                    }
                } else if (result.message === 'Client side error') {
                    if (onError) {
                        onError('Speech recognition error. Please check your microphone permissions and try again.');
                    }
                } else {
                    if (onError) {
                        onError(`Speech recognition: ${result.message}`);
                    }
                }
            } else if (!result) {
                console.log('⚠️ No result returned from speech recognition');
                if (onError) {
                    onError('No speech detected. Please try speaking louder and clearer.');
                }
            } else {
                console.log('⚠️ Unexpected result format:', result);
                if (onError) {
                    onError('Speech recognition completed but no text was detected.');
                }
            }

            return true;
        } catch (error) {
            console.error('❌ Native speech recognition error:', error);

            let errorMessage = 'Voice recognition failed.';

            // Handle specific error types
            if (error && error.message) {
                if (error.message.includes('permission')) {
                    errorMessage = 'Microphone permission required. Please enable microphone access in device settings.';
                    setPermissionStatus('denied');
                } else if (error.message.includes('network')) {
                    errorMessage = 'Network error. Please check your internet connection.';
                } else if (error.message.includes('not available')) {
                    errorMessage = 'Speech recognition not available on this device.';
                } else if (error.message === 'No match') {
                    errorMessage = 'No speech detected. Please try speaking louder and clearer.';
                } else if (error.message === 'Client side error') {
                    errorMessage = 'Speech recognition error. Please check your microphone permissions.';
                } else {
                    errorMessage = `Voice recognition error: ${error.message}`;
                }
            } else if (typeof error === 'string') {
                errorMessage = `Voice recognition error: ${error}`;
            }

            if (onError) {
                onError(errorMessage);
            }
            return false;
        } finally {
            setIsListening(false);
            vibrateDevice([50]);
        }
    };

    // Start listening using web API (fallback)
    const startWebListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            if (onError) onError('Speech recognition not supported in this browser');
            return false;
        }

        try {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'en-US';
            recognition.maxAlternatives = 1;

            recognition.onstart = () => {
                console.log('🎤 Web speech recognition started');
                setIsListening(true);
                setTranscript('Listening... speak now');
                vibrateDevice([100, 50, 100]);
            };

            recognition.onend = () => {
                console.log('🏁 Web speech recognition ended');
                setIsListening(false);
                vibrateDevice([50]);
            };

            recognition.onerror = (event) => {
                console.error('🚨 Web speech recognition error:', event.error);
                setIsListening(false);

                if (onError) {
                    onError(`Speech recognition error: ${event.error}`);
                }
            };

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

                if (finalTranscript && finalTranscript.trim().length > 0) {
                    if (onResult) {
                        onResult(finalTranscript.trim(), confidence);
                    }
                }
            };

            recognition.start();
            return true;
        } catch (error) {
            console.error('❌ Web speech recognition failed:', error);
            if (onError) {
                onError('Failed to start speech recognition');
            }
            return false;
        }
    };

    // Main start listening function
    const startListening = useCallback(async () => {
        if (isListening) return;

        // Check permissions first
        if (permissionStatus === 'denied') {
            const hasPermission = await requestPermissions();
            if (!hasPermission) return;
        } else if (permissionStatus === 'unknown') {
            const hasPermission = await requestPermissions();
            if (!hasPermission) return;
        }

        // Start recognition based on environment
        if (isCapacitor && speechRecognition) {
            await startNativeListening();
        } else {
            startWebListening();
        }
    }, [isListening, permissionStatus, isCapacitor, speechRecognition, onResult, onError, vibrateDevice]);

    // Stop listening
    const stopListening = useCallback(async () => {
        if (!isListening) return;

        try {
            if (isCapacitor && speechRecognition) {
                console.log('🛑 Stopping native speech recognition...');
                await speechRecognition.stop();
            }
            setIsListening(false);
            vibrateDevice([50]);
        } catch (error) {
            console.error('Error stopping speech recognition:', error);
            setIsListening(false);
        }
    }, [isListening, isCapacitor, speechRecognition, vibrateDevice]);

    // Toggle listening
    const toggleListening = useCallback(async () => {
        if (isListening) {
            await stopListening();
        } else {
            await startListening();
        }
    }, [isListening, startListening, stopListening]);

    // Support detection messaging
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

        return (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-gray-800 text-sm">
                    🎤 Voice input is not supported on this device.
                </p>
            </div>
        );
    }

    // Permission denied state
    if (permissionStatus === 'denied') {
        return (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-3">
                    <span className="text-red-600 text-xl">🚫</span>
                    <div className="flex-1">
                        <p className="text-red-800 text-sm font-medium">Microphone Access Denied</p>
                        <div className="text-red-700 text-xs mt-1">
                            {isCapacitor ? (
                                <div>
                                    <p>Enable microphone access in your device settings:</p>
                                    <p className="mt-1">Settings → Apps → Doc Bear's Comfort Kitchen → Permissions → Microphone → Allow</p>
                                    <p className="mt-1 font-medium">Then restart the app</p>
                                </div>
                            ) : (
                                <div>
                                    {browserInfo.platform === 'ios' && 'Go to Settings > Safari > Camera & Microphone to allow access.'}
                                    {browserInfo.platform === 'android' && 'Check your browser settings to allow microphone access.'}
                                    {browserInfo.platform === 'desktop' && 'Click the microphone icon in your browser\'s address bar to allow access.'}
                                </div>
                            )}
                        </div>
                    </div>
                    <TouchEnhancedButton
                        onClick={requestPermissions}
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
            userSelect: 'none',
            position: 'relative'
        }}>
            {/* Environment indicator (dev only) */}
            {process.env.NODE_ENV === 'development' && (
                <div style={{
                    position: 'absolute',
                    top: '-20px',
                    left: '0',
                    fontSize: '10px',
                    color: '#666',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    padding: '2px 6px',
                    borderRadius: '4px'
                }}>
                    {isCapacitor ? '📱 Native Plugin' : `🌐 ${browserInfo.browser}`}
                </div>
            )}

            {/* Voice Button */}
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

            {/* Transcript Display */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {isListening ? (
                    <div>
                        <div style={{
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#3b82f6',
                            marginBottom: '0.25rem'
                        }}>
                            🎤 {isCapacitor ? 'Speak now...' : 'Listening...'}
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
                        {placeholder}
                        {isCapacitor && <span style={{ color: '#3b82f6' }}> (Native)</span>}
                    </div>
                )}
            </div>

            {/* Visual Feedback */}
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