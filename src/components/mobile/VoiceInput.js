'use client';

// file: /src/components/mobile/VoiceInput.js v5 - Fixed Capacitor microphone permissions using native API

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
    const [isCapacitor, setIsCapacitor] = useState(false);
    const recognitionRef = useRef(null);
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

            // Check if running in Capacitor - Updated detection
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

    // Enhanced microphone permission request with @gachlab/capacitor-permissions
    const requestMicrophonePermission = useCallback(async () => {
        try {
            console.log('🎤 Requesting microphone permission...');

            if (isCapacitor) {
                console.log('📱 Capacitor app detected - using @gachlab/capacitor-permissions...');

                // Check if the @gachlab/capacitor-permissions plugin is available
                if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Permissions) {
                    try {
                        console.log('🔧 Using @gachlab/capacitor-permissions plugin...');

                        // First check current permission status
                        const permissionResult = await window.Capacitor.Plugins.Permissions.query({
                            permissions: [{ alias: 'microphone', permission: 'microphone' }]
                        });
                        console.log('🎤 Current microphone permission status:', permissionResult);

                        const microphoneStatus = permissionResult.results?.find(r => r.alias === 'microphone')?.state;
                        console.log('🎤 Microphone permission state:', microphoneStatus);

                        if (microphoneStatus === 'granted') {
                            setPermissionStatus('granted');
                            console.log('✅ Microphone permission already granted');
                            return true;
                        } else if (microphoneStatus === 'denied') {
                            setPermissionStatus('denied');
                            if (onError) {
                                onError('Microphone permission is permanently denied. Please enable it in your device settings:\n\n1. Go to Settings > Apps > Doc Bear\'s Comfort Kitchen\n2. Tap Permissions > Microphone\n3. Select "Allow"\n4. Force close and restart the app');
                            }
                            return false;
                        } else {
                            // Permission is 'prompt' or unknown - request it
                            console.log('🎤 Requesting microphone permission from user...');
                            const requestResult = await window.Capacitor.Plugins.Permissions.request({
                                permissions: [{ alias: 'microphone', permission: 'microphone' }]
                            });
                            console.log('🎤 Permission request result:', requestResult);

                            const newMicrophoneStatus = requestResult.results?.find(r => r.alias === 'microphone')?.state;

                            if (newMicrophoneStatus === 'granted') {
                                setPermissionStatus('granted');
                                console.log('✅ Microphone permission granted via @gachlab/capacitor-permissions');
                                return true;
                            } else {
                                setPermissionStatus('denied');
                                if (onError) {
                                    onError('Microphone permission denied. Please enable microphone access in your device settings:\n\n1. Go to Settings > Apps > Doc Bear\'s Comfort Kitchen\n2. Tap Permissions > Microphone\n3. Select "Allow"\n4. Force close and restart the app');
                                }
                                return false;
                            }
                        }
                    } catch (capacitorError) {
                        console.warn('⚠️ @gachlab/capacitor-permissions failed, falling back to web API:', capacitorError);
                        // Fall through to web API approach
                    }
                }

                // Fallback: Use web API for Capacitor (if permissions plugin not available)
                console.log('🌐 Falling back to web API for Capacitor...');
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true,
                            // Capacitor-specific optimizations
                            channelCount: 1,
                            sampleRate: 44100,
                            sampleSize: 16
                        }
                    });

                    // Stop the stream immediately - we just wanted permission
                    stream.getTracks().forEach(track => track.stop());

                    setPermissionStatus('granted');
                    console.log('✅ Capacitor microphone permission granted via web API fallback');
                    return true;

                } catch (webApiError) {
                    console.error('❌ Web API fallback also failed:', webApiError);

                    setPermissionStatus('denied');

                    if (webApiError.name === 'NotAllowedError') {
                        if (onError) {
                            onError('Microphone permission denied by system. Please check:\n\n1. Go to Settings > Apps > Doc Bear\'s Comfort Kitchen\n2. Tap Permissions > Microphone\n3. Select "Allow"\n4. Force close and restart the app\n\n⚠️ Important: You must restart the app after changing permissions for them to take effect.\n\nIf still not working:\n• Clear app cache: Settings > Apps > Doc Bear\'s Comfort Kitchen > Storage > Clear Cache\n• Restart your device\n• Reinstall the app if needed');
                        }
                    } else if (webApiError.name === 'NotFoundError') {
                        if (onError) {
                            onError('No microphone detected. Please check:\n• Your device has a working microphone\n• No other apps are using the microphone\n• Try restarting the app');
                        }
                    } else if (webApiError.name === 'NotReadableError') {
                        if (onError) {
                            onError('Microphone is being used by another application. Please:\n• Close other apps that might be using the microphone\n• Restart the app\n• Restart your device if needed');
                        }
                    } else {
                        if (onError) {
                            onError(`Microphone access failed (${webApiError.name}). Please:\n• Ensure microphone permissions are enabled in device settings\n• Restart the app\n• Contact support if the issue persists`);
                        }
                    }
                    return false;
                }
            }

            // Regular web browser handling
            console.log('🌐 Web browser - using standard getUserMedia...');
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
                console.log('✅ Web microphone permission granted');
                return true;
            } else {
                throw new Error('getUserMedia not supported');
            }
        } catch (error) {
            console.error('❌ Microphone permission request failed:', error);
            setPermissionStatus('denied');

            let errorMessage = 'Microphone access denied. ';

            if (isCapacitor) {
                errorMessage += 'Please enable microphone access in your device settings:\n';
                errorMessage += '1. Go to Settings > Apps > Doc Bear\'s Comfort Kitchen\n';
                errorMessage += '2. Tap Permissions > Microphone\n';
                errorMessage += '3. Select "Allow" and restart the app\n\n';
                errorMessage += 'If this doesn\'t work, try:\n';
                errorMessage += '• Clear app cache in Settings > Apps > Doc Bear\'s Comfort Kitchen > Storage\n';
                errorMessage += '• Restart your device\n';
                errorMessage += '• Reinstall the app if needed';
            } else if (browserInfo.platform === 'ios') {
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
    }, [isCapacitor, browserInfo.platform, onError]);

    // Check microphone permission status
    const checkMicrophonePermission = useCallback(async () => {
        try {
            console.log('🎤 Checking microphone permission...');

            if (isCapacitor && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Permissions) {
                try {
                    const result = await window.Capacitor.Plugins.Permissions.query({
                        permissions: [{ alias: 'microphone', permission: 'microphone' }]
                    });
                    const microphoneStatus = result.results?.find(r => r.alias === 'microphone')?.state;

                    if (microphoneStatus) {
                        setPermissionStatus(microphoneStatus);
                        console.log('🎤 @gachlab/capacitor-permissions status:', microphoneStatus);
                        return microphoneStatus;
                    }
                } catch (error) {
                    console.log('@gachlab/capacitor-permissions query failed, using web API fallback');
                }
            }

            // Use web permissions API for both web and Capacitor fallback
            if (navigator.permissions && navigator.permissions.query) {
                const result = await navigator.permissions.query({ name: 'microphone' });
                setPermissionStatus(result.state);

                // Listen for permission changes
                result.onchange = () => {
                    setPermissionStatus(result.state);
                    console.log('🎤 Permission status changed to:', result.state);
                };

                console.log('🎤 Web API permission status:', result.state);
                return result.state;
            } else {
                // Fallback for browsers that don't support permissions API
                console.log('⚠️ Permissions API not supported, using unknown status');
                setPermissionStatus('unknown');
                return 'unknown';
            }
        } catch (error) {
            console.log('Permission API query failed:', error);
            setPermissionStatus('unknown');
            return 'unknown';
        }
    }, [isCapacitor]);

    // Check browser support with mobile-specific considerations
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const isSupported = !!SpeechRecognition;

        // Additional checks for mobile platforms
        let mobileSupported = isSupported;

        if (browserInfo.platform === 'ios') {
            // Check iOS version - need 14.5+ for web, but Capacitor might work on older versions
            if (!isCapacitor) {
                const match = browserInfo.ua.match(/OS (\d+)_(\d+)/);
                if (match) {
                    const majorVersion = parseInt(match[1]);
                    const minorVersion = parseInt(match[2]);
                    mobileSupported = majorVersion > 14 || (majorVersion === 14 && minorVersion >= 5);
                }
            }
        }

        setIsSupported(isSupported && mobileSupported);

        // Check initial permission status
        if (isSupported && mobileSupported) {
            checkMicrophonePermission();
        }
    }, [browserInfo, checkMicrophonePermission, isCapacitor]);

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

            // Platform-specific optimizations
            if (browserInfo.platform === 'ios') {
                recognition.continuous = false;
                recognition.interimResults = false; // iOS works better without interim results
            }

            if (browserInfo.platform === 'android' || isCapacitor) {
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

            // Enhanced error handling for mobile and Capacitor
            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);

                let errorMessage = 'Voice recognition failed';
                switch (event.error) {
                    case 'no-speech':
                        errorMessage = 'No speech detected. Please try again.';
                        break;
                    case 'audio-capture':
                        errorMessage = isCapacitor
                            ? 'Microphone not accessible. Please check your device settings and restart the app.'
                            : 'Microphone not available. Check your device settings.';
                        break;
                    case 'not-allowed':
                        errorMessage = isCapacitor
                            ? 'Microphone permission denied. Please enable microphone access in Settings > Apps > Doc Bear\'s Comfort Kitchen > Permissions > Microphone, then restart the app.'
                            : 'Microphone access denied. Please allow microphone access and try again.';
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
                console.log('🎤 Speech recognition started');
                setIsListening(true);
                setTranscript('');
                vibrateDevice([100, 50, 100]);
            };

            recognition.onend = () => {
                console.log('🎤 Speech recognition ended');
                setIsListening(false);
                vibrateDevice([50]);
            };

            recognition.onspeechstart = () => {
                console.log('🎤 Speech detected');
            };

            recognition.onspeechend = () => {
                console.log('🎤 Speech ended');
                if (browserInfo.platform === 'ios' || browserInfo.platform === 'android' || isCapacitor) {
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
    }, [onResult, onError, vibrateDevice, browserInfo, isSupported, isListening, isCapacitor]);

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
                let errorMsg = 'Failed to start voice recognition. Please try again.';

                if (isCapacitor) {
                    errorMsg = 'Voice recognition failed. Please ensure microphone access is enabled in your device settings and restart the app.';
                } else if (browserInfo.platform === 'ios') {
                    errorMsg = 'Voice recognition failed. Make sure you have iOS 14.5 or later and microphone access is allowed.';
                }

                onError(errorMsg);
            }
        }
    }, [isListening, requestMicrophonePermission, onError, browserInfo.platform, isCapacitor]);

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

    // Enhanced support detection messaging
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

        if (browserInfo.platform === 'ios' && !isCapacitor) {
            return (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800 text-sm">
                        📱 Voice input requires iOS 14.5 or later in Safari. Update your device or use the mobile app for voice features.
                    </p>
                </div>
            );
        }

        return (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-gray-800 text-sm">
                    🎤 Voice input is not supported in this browser. Try Chrome, Safari, Edge, or use the mobile app.
                </p>
            </div>
        );
    }

    // Enhanced permission denied state
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
                                    <p className="mt-2 text-xs">If still not working, try clearing app cache or reinstalling.</p>
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
                    {isCapacitor ? '📱 Capacitor' : `🌐 ${browserInfo.browser}`}
                </div>
            )}

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
                        {isCapacitor && <span style={{ color: '#3b82f6' }}> (Native App)</span>}
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