'use client';

// file: /src/components/mobile/VoiceInput.js v8 - NATIVE: Added app selection popup for better UX

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
    const [showAppSelectionTip, setShowAppSelectionTip] = useState(false);
    const [processingComplete, setProcessingComplete] = useState(false);
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

    // Check if user has seen the app selection tip
    useEffect(() => {
        if (isCapacitor && browserInfo.platform === 'android') {
            const hasSeenTip = localStorage.getItem('voice-app-selection-tip-shown');
            if (!hasSeenTip) {
                setShowAppSelectionTip(true);
            }
        }
    }, [isCapacitor, browserInfo]);

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
            setProcessingComplete(false);
            vibrateDevice([100, 50, 100]);

            // First, check if the plugin is available
            const availability = await speechRecognition.available();
            console.log('🔍 Plugin availability check:', availability);

            if (!availability.available) {
                throw new Error('Speech recognition not available on this device');
            }

            // Request permissions explicitly
            const permissions = await speechRecognition.requestPermissions();
            console.log('🔍 Permission check:', permissions);

            if (permissions.speechRecognition !== 'granted') {
                throw new Error('Microphone permission denied');
            }

            // Use minimal configuration for better compatibility
            console.log('🎤 Calling speechRecognition.start() with minimal config...');
            const result = await speechRecognition.start({
                language: 'en-US',
                maxResults: 5, // Get more results
                prompt: '', // Remove custom prompt
                partialResults: false, // Disable partial results for stability
                popup: true // Enable popup for better user feedback
            });

            console.log('🎯 Raw plugin result:', JSON.stringify(result, null, 2));

            // More thorough result checking
            if (!result) {
                console.log('❌ Plugin returned null/undefined');
                if (onError) {
                    onError('Speech recognition failed to start. Please try again.');
                }
                return false;
            }

            // Check for matches array
            if (result.matches && Array.isArray(result.matches) && result.matches.length > 0) {
                const transcript = result.matches[0];
                const confidence = result.confidence || 0.8;

                console.log('✅ Successfully got transcript:', transcript);
                setTranscript(transcript);
                setConfidence(confidence);
                setProcessingComplete(true);

                if (onResult) {
                    onResult(transcript.trim(), confidence);
                }

                // Show success message briefly, then auto-close
                setTimeout(() => {
                    setProcessingComplete(false);
                }, 1500);

                return true;
            }

            // Check for error messages in result
            if (result.message) {
                console.log('⚠️ Plugin returned message:', result.message);

                switch (result.message) {
                    case 'No match':
                    case "Didn't understand, please try again.":
                        if (onError) {
                            onError('Could not understand speech. Please speak clearly and try again.');
                        }
                        break;
                    case 'Client side error':
                        if (onError) {
                            onError('Speech recognition error. Please check microphone permissions and try again.');
                        }
                        break;
                    case 'Network error':
                        if (onError) {
                            onError('Network error. Please check your internet connection.');
                        }
                        break;
                    default:
                        if (onError) {
                            onError(`Speech recognition: ${result.message}`);
                        }
                }
                return false;
            }

            // If we get here, the result format is unexpected
            console.log('⚠️ Unexpected result format - no matches or message');
            if (onError) {
                onError('Speech recognition completed but no speech was detected. Please try again.');
            }
            return false;

        } catch (error) {
            console.error('❌ Native speech recognition error:', error);

            let errorMessage = 'Voice recognition failed.';

            if (error && error.message) {
                if (error.message.includes('permission') || error.message.includes('denied')) {
                    errorMessage = 'Microphone permission denied. Please enable microphone access in Settings > Apps > Doc Bear\'s Comfort Kitchen > Permissions.';
                    setPermissionStatus('denied');
                } else if (error.message.includes('not available')) {
                    errorMessage = 'Speech recognition is not available on this device.';
                } else if (error.message.includes('network')) {
                    errorMessage = 'Network error. Speech recognition requires internet connection.';
                } else {
                    errorMessage = `Speech recognition error: ${error.message}`;
                }
            }

            if (onError) {
                onError(errorMessage);
            }
            return false;

        } finally {
            console.log('🏁 Native speech recognition finished');
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
                setProcessingComplete(false);
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
                        setProcessingComplete(true);
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

                    // Show success message briefly, then auto-close
                    setTimeout(() => {
                        setProcessingComplete(false);
                    }, 1500);
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

    // Dismiss app selection tip
    const dismissAppSelectionTip = () => {
        setShowAppSelectionTip(false);
        localStorage.setItem('voice-app-selection-tip-shown', 'true');
    };

    // App Selection Tip Modal
    if (showAppSelectionTip) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-md w-full p-6">
                    <div className="text-center">
                        <div className="text-4xl mb-4">🎤</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Voice Recognition Setup
                        </h3>
                        <div className="text-left space-y-3 mb-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                                        <span className="text-white text-sm">🎤</span>
                                    </div>
                                    <div className="font-medium text-blue-900">
                                        Select "Speech Recognition and Synt..."
                                    </div>
                                </div>
                                <p className="text-sm text-blue-800">
                                    When prompted to complete the action, choose the option with the <strong>blue microphone icon</strong>.
                                </p>
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
                                        <span className="text-white text-sm">✓</span>
                                    </div>
                                    <div className="font-medium text-green-900">
                                        Choose "Always"
                                    </div>
                                </div>
                                <p className="text-sm text-green-800">
                                    This ensures voice recognition works smoothly every time.
                                </p>
                            </div>
                        </div>
                        <TouchEnhancedButton
                            onClick={dismissAppSelectionTip}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-lg font-medium"
                        >
                            Got it! Continue to Voice Input
                        </TouchEnhancedButton>
                    </div>
                </div>
            </div>
        );
    }

    // Success completion modal
    if (processingComplete && transcript && transcript !== 'Listening... speak now') {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                backgroundColor: '#dcfce7',
                borderRadius: '12px',
                border: '2px solid #22c55e',
                transition: 'all 0.3s ease',
                touchAction: 'manipulation',
                userSelect: 'none'
            }}>
                <div style={{
                    backgroundColor: '#22c55e',
                    color: 'white',
                    borderRadius: '50%',
                    width: '52px',
                    height: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem'
                }}>
                    ✓
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#16a34a',
                        marginBottom: '0.25rem'
                    }}>
                        Voice input successful!
                    </div>
                    <div style={{
                        fontSize: '1rem',
                        color: '#374151',
                        wordBreak: 'break-word'
                    }}>
                        {transcript}
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
            </div>
        );
    }

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