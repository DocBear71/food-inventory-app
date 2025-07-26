'use client';

// file: /src/components/mobile/VoiceInput.js v6 - FIXED: Proper Capacitor microphone permissions using native APIs

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
    const [recognitionState, setRecognitionState] = useState('idle');
    const [startTimeout, setStartTimeout] = useState(null);
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

    // FIXED: Proper Capacitor microphone permission handling
    const requestMicrophonePermission = useCallback(async () => {
        try {
            console.log('🎤 Requesting microphone permission...');

            if (isCapacitor) {
                console.log('📱 Capacitor app detected - using web API with MainActivity support...');
            } else {
                console.log('🌐 Web browser detected - using standard web API...');
            }

            // Always use web API for permission request (works in both web and Capacitor)
            console.log('🌐 Requesting microphone permission via getUserMedia...');

            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true,
                            // Add Android-specific optimizations
                            channelCount: 1,
                            sampleRate: 44100,
                            sampleSize: 16
                        }
                    });

                    // Stop the stream immediately - we just wanted permission
                    stream.getTracks().forEach(track => {
                        console.log('🎤 Stopping audio track:', track.label);
                        track.stop();
                    });

                    setPermissionStatus('granted');
                    console.log('✅ Microphone permission granted via getUserMedia');
                    return true;

                } catch (getUserMediaError) {
                    console.error('❌ getUserMedia failed:', getUserMediaError);

                    // Log detailed error information
                    console.error('Error name:', getUserMediaError.name);
                    console.error('Error message:', getUserMediaError.message);

                    setPermissionStatus('denied');

                    let errorMessage = 'Microphone access failed. ';

                    switch (getUserMediaError.name) {
                        case 'NotAllowedError':
                            if (isCapacitor) {
                                errorMessage = 'Microphone permission denied. Please:\n\n';
                                errorMessage += '1. Go to Settings > Apps > Doc Bear\'s Comfort Kitchen\n';
                                errorMessage += '2. Tap Permissions > Microphone\n';
                                errorMessage += '3. Select "Allow"\n';
                                errorMessage += '4. Force close and restart the app\n\n';
                                errorMessage += 'IMPORTANT: You must restart the app after changing permissions.';
                            } else {
                                errorMessage = 'Microphone permission denied. Please allow microphone access and try again.';
                            }
                            break;

                        case 'NotFoundError':
                            errorMessage = 'No microphone found. Please check that your device has a working microphone.';
                            break;

                        case 'NotReadableError':
                            errorMessage = 'Microphone is being used by another app. Please close other apps and try again.';
                            break;

                        case 'OverconstrainedError':
                            errorMessage = 'Microphone constraints not supported. Please try again.';
                            break;

                        case 'SecurityError':
                            if (isCapacitor) {
                                errorMessage = 'Security error accessing microphone. Please check app permissions and restart.';
                            } else {
                                errorMessage = 'Microphone access blocked. Please ensure you\'re on a secure connection (HTTPS).';
                            }
                            break;

                        default:
                            errorMessage = `Microphone access failed: ${getUserMediaError.message || 'Unknown error'}`;
                            if (isCapacitor) {
                                errorMessage += '\n\nPlease check app permissions and restart the app.';
                            }
                    }

                    if (onError) {
                        onError(errorMessage);
                    }
                    return false;
                }
            } else {
                throw new Error('getUserMedia not supported in this browser');
            }

        } catch (error) {
            console.error('❌ Microphone permission request failed:', error);
            setPermissionStatus('denied');

            let errorMessage = 'Microphone access not supported. ';

            if (isCapacitor) {
                errorMessage = 'Microphone access failed. Please ensure permissions are enabled and restart the app.';
            } else {
                errorMessage = 'Microphone not supported in this browser. Please try Chrome, Safari, or Edge.';
            }

            if (onError) {
                onError(errorMessage);
            }
            return false;
        }
    }, [isCapacitor, onError]);


    // Helper function for web API permission handling
    const handleWebAPIPermission = useCallback(async () => {
        console.log('🌐 Using web API for microphone permission...');

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
    }, []);

    // FIXED: Improved permission checking for Capacitor
    const checkMicrophonePermission = useCallback(async () => {
        try {
            console.log('🎤 Checking microphone permission...');

            if (isCapacitor) {
                try {
                    const { Capacitor } = await import('@capacitor/core');

                    if (Capacitor.isNativePlatform()) {
                        // For native Capacitor, check web permissions API as fallback
                        // since most Capacitor apps use web-based permission checking
                        if (navigator.permissions && navigator.permissions.query) {
                            const result = await navigator.permissions.query({ name: 'microphone' });
                            setPermissionStatus(result.state);

                            result.onchange = () => {
                                setPermissionStatus(result.state);
                                console.log('🎤 Permission status changed to:', result.state);
                            };

                            console.log('🎤 Capacitor permission status:', result.state);
                            return result.state;
                        } else {
                            // If permissions API not available, assume unknown and request when needed
                            setPermissionStatus('unknown');
                            return 'unknown';
                        }
                    }
                } catch (error) {
                    console.log('Capacitor permission check failed, using web API fallback');
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

    useEffect(() => {
        const handlePermissionGranted = () => {
            console.log('🎤 MainActivity reports microphone permission granted');
            setPermissionStatus('granted');
        };

        const handlePermissionDenied = () => {
            console.log('❌ MainActivity reports microphone permission denied');
            setPermissionStatus('denied');
        };

        // Listen for events from MainActivity
        window.addEventListener('microphonePermissionGranted', handlePermissionGranted);
        window.addEventListener('microphonePermissionDenied', handlePermissionDenied);

        return () => {
            window.removeEventListener('microphonePermissionGranted', handlePermissionGranted);
            window.removeEventListener('microphonePermissionDenied', handlePermissionDenied);
        };
    }, []);

    // Check browser support with mobile-specific considerations
    useEffect(() => {
        // Check for Speech Recognition support
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

    // Initialize Speech Recognition with Capacitor optimizations
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition && isSupported) {
            const recognition = new SpeechRecognition();

            // SIMPLIFIED configuration for better Capacitor compatibility
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'en-US';
            recognition.maxAlternatives = 1;

            // Handle start event with timeout clearing
            recognition.onstart = () => {
                console.log('✅ Speech recognition actually started - clearing timeout');

                // Clear the start timeout since recognition actually started
                if (startTimeout) {
                    clearTimeout(startTimeout);
                    setStartTimeout(null);
                }

                setRecognitionState('listening');
                setIsListening(true);
                setTranscript('Listening... speak now');
                setConfidence(0);
                vibrateDevice([100, 50, 100]);
            };

            // Handle end event with cleanup
            recognition.onend = () => {
                console.log('🏁 Speech recognition ended, previous state:', recognitionState);

                // Clear any remaining timeout
                if (startTimeout) {
                    clearTimeout(startTimeout);
                    setStartTimeout(null);
                }

                setRecognitionState('idle');
                setIsListening(false);
                vibrateDevice([50]);
            };

            // Handle error with timeout cleanup
            recognition.onerror = (event) => {
                console.error('🚨 Speech recognition error:', event.error);
                console.log('🔍 Error details:', {
                    error: event.error,
                    timeStamp: event.timeStamp,
                    message: event.message,
                    recognitionState: recognitionState
                });

                // Clear timeout on error
                if (startTimeout) {
                    clearTimeout(startTimeout);
                    setStartTimeout(null);
                }

                setRecognitionState('idle');
                setIsListening(false);

                // Enhanced error handling for Capacitor
                if (event.error !== 'aborted') {
                    let errorMessage = '';
                    switch (event.error) {
                        case 'no-speech':
                            errorMessage = 'No speech detected. Please speak clearly and try again.';
                            break;
                        case 'audio-capture':
                            errorMessage = 'Microphone error. Please check your device microphone and try again.';
                            break;
                        case 'not-allowed':
                            errorMessage = 'Microphone access denied. Please enable microphone permissions and restart the app.';
                            setPermissionStatus('denied');
                            break;
                        case 'network':
                            errorMessage = 'Network error. Voice recognition requires internet connection.';
                            break;
                        case 'service-not-allowed':
                            errorMessage = 'Voice recognition service unavailable. Please try again later.';
                            break;
                        default:
                            errorMessage = `Voice recognition failed: ${event.error}. Try restarting the app.`;
                    }

                    if (onError) {
                        onError(errorMessage);
                    }
                } else {
                    console.log('🛑 Speech recognition was aborted (normal)');
                }
            };

            // Handle results (unchanged)
            recognition.onresult = (event) => {
                console.log('🎯 Speech result received');

                let finalTranscript = '';
                let interimTranscript = '';

                const startIndex = event.resultIndex !== undefined ? event.resultIndex : 0;
                const results = event.results;

                for (let i = startIndex; i < results.length; i++) {
                    const transcript = results[i][0].transcript;
                    const confidence = results[i][0].confidence || 0.8;

                    if (results[i].isFinal) {
                        finalTranscript += transcript;
                        setConfidence(confidence);
                        console.log('✅ Final transcript:', transcript);
                    } else {
                        interimTranscript += transcript;
                        console.log('📝 Interim transcript:', transcript);
                    }
                }

                const currentTranscript = finalTranscript || interimTranscript;
                setTranscript(currentTranscript);

                if (finalTranscript && finalTranscript.trim().length > 0) {
                    console.log('🎯 Processing final result:', finalTranscript.trim());
                    if (onResult) {
                        onResult(finalTranscript.trim(), confidence);
                    }
                }
            };

            recognitionRef.current = recognition;
        }

        return () => {
            // Cleanup timeout on component unmount
            if (startTimeout) {
                clearTimeout(startTimeout);
                setStartTimeout(null);
            }

            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch (e) {
                    console.log('Error aborting recognition on cleanup:', e);
                }
            }
            setRecognitionState('idle');
        };
    }, [onResult, onError, vibrateDevice, browserInfo, isSupported, recognitionState, startTimeout]);


    // Enhanced Speech Recognition configuration for web browsers
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition && isSupported) {
            const recognition = new SpeechRecognition();

            // CRITICAL: Web browser settings to prevent immediate stopping
            recognition.continuous = true;  // Keep listening for multiple phrases
            recognition.interimResults = true;  // Show results as user speaks
            recognition.lang = 'en-US';
            recognition.maxAlternatives = 1;

            // Web-specific timeout settings
            if (!isCapacitor) {  // Web browser only
                // These help prevent the "no speech" timeout
                recognition.serviceURI = '';  // Use default service
            }

            let finalTranscriptReceived = false;
            let speechTimeout = null;
            let silenceTimeout = null;

            // Handle results with better web support
            recognition.onresult = (event) => {
                console.log('🎤 Speech result received, event length:', event.results.length);

                let finalTranscript = '';
                let interimTranscript = '';

                // Process all results
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    const confidence = event.results[i][0].confidence || 0.8;

                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                        finalTranscriptReceived = true;
                        setConfidence(confidence);
                        console.log('✅ Final transcript:', transcript);
                    } else {
                        interimTranscript += transcript;
                        console.log('📝 Interim transcript:', transcript);
                    }
                }

                const currentTranscript = finalTranscript || interimTranscript;
                setTranscript(currentTranscript);

                // Clear any existing silence timeout
                if (silenceTimeout) {
                    clearTimeout(silenceTimeout);
                    silenceTimeout = null;
                }

                // If we have interim results, reset the silence timer
                if (interimTranscript) {
                    silenceTimeout = setTimeout(() => {
                        console.log('🔇 Silence detected, stopping recognition');
                        if (recognitionRef.current && isListening) {
                            recognitionRef.current.stop();
                        }
                    }, 3000); // Stop after 3 seconds of silence
                }

                // If we have a final result, process it
                if (finalTranscript && finalTranscript.trim().length > 0) {
                    console.log('🎯 Processing final result:', finalTranscript.trim());
                    if (onResult) {
                        onResult(finalTranscript.trim(), confidence);
                    }

                    // Stop after getting a final result
                    setTimeout(() => {
                        if (recognitionRef.current && isListening) {
                            recognitionRef.current.stop();
                        }
                    }, 500);
                }
            };

            // Handle speech start/end events
            recognition.onspeechstart = () => {
                console.log('🗣️ User started speaking');
                finalTranscriptReceived = false;

                // Clear any speech timeout
                if (speechTimeout) {
                    clearTimeout(speechTimeout);
                    speechTimeout = null;
                }
            };

            recognition.onspeechend = () => {
                console.log('🤐 User stopped speaking');

                // Give a moment for final results to come in
                speechTimeout = setTimeout(() => {
                    if (recognitionRef.current && isListening && !finalTranscriptReceived) {
                        console.log('⏰ No final transcript received, stopping recognition');
                        recognitionRef.current.stop();
                    }
                }, 1000);
            };

            // Handle audio events
            recognition.onaudiostart = () => {
                console.log('🎵 Audio capture started');
            };

            recognition.onaudioend = () => {
                console.log('🔇 Audio capture ended');
            };

            recognition.onsoundstart = () => {
                console.log('🔊 Sound detected');
            };

            recognition.onsoundend = () => {
                console.log('🔇 Sound ended');
            };

            // Enhanced error handling for web
            recognition.onerror = (event) => {
                console.error('🚨 Speech recognition error:', event.error);

                // Clear timeouts
                if (speechTimeout) clearTimeout(speechTimeout);
                if (silenceTimeout) clearTimeout(silenceTimeout);

                setIsListening(false);

                let errorMessage = '';
                let shouldRetry = false;

                switch (event.error) {
                    case 'no-speech':
                        errorMessage = 'No speech detected. Please speak clearly into your microphone.';
                        console.log('💡 Tip: Speak louder and closer to your microphone');
                        shouldRetry = true;
                        break;

                    case 'audio-capture':
                        errorMessage = 'Could not capture audio. Please check your microphone.';
                        break;

                    case 'not-allowed':
                        errorMessage = 'Microphone access denied. Please allow microphone access.';
                        setPermissionStatus('denied');
                        break;

                    case 'network':
                        errorMessage = 'Network error. Please check your internet connection.';
                        shouldRetry = true;
                        break;

                    case 'service-not-allowed':
                        errorMessage = 'Speech service not available. Please try again.';
                        shouldRetry = true;
                        break;

                    case 'aborted':
                        console.log('🛑 Speech recognition was stopped (normal)');
                        return; // Don't show error for manual stop

                    default:
                        errorMessage = `Speech recognition error: ${event.error}`;
                        shouldRetry = true;
                }

                if (onError && !shouldRetry) {
                    onError(errorMessage);
                } else if (shouldRetry) {
                    console.log('🔄 Error suggests retry might work:', errorMessage);
                    if (onError) {
                        onError(errorMessage + '\n\nTip: Try speaking immediately after clicking the microphone button.');
                    }
                }
            };

            // Handle start event
            recognition.onstart = () => {
                console.log('🎤 Speech recognition started - speak now!');
                setIsListening(true);
                setTranscript('Listening... speak now');
                setConfidence(0);
                finalTranscriptReceived = false;

                vibrateDevice([100, 50, 100]);

                // Set a maximum timeout for the entire session
                speechTimeout = setTimeout(() => {
                    console.log('⏰ Maximum listening time reached');
                    if (recognitionRef.current && isListening) {
                        recognitionRef.current.stop();
                    }
                }, 30000); // 30 seconds maximum
            };

            // Handle end event
            recognition.onend = () => {
                console.log('🏁 Speech recognition ended');

                // Clean up timeouts
                if (speechTimeout) {
                    clearTimeout(speechTimeout);
                    speechTimeout = null;
                }
                if (silenceTimeout) {
                    clearTimeout(silenceTimeout);
                    silenceTimeout = null;
                }

                setIsListening(false);
                vibrateDevice([50]);
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
        console.log('🎤 startListening called, current state:', recognitionState);

        if (!recognitionRef.current) {
            console.log('❌ No recognition object available');
            return;
        }

        if (recognitionState !== 'idle') {
            console.log('⚠️ Recognition not idle, current state:', recognitionState);
            return;
        }

        try {
            setRecognitionState('starting');

            // Always check/request permission before starting
            console.log('🎤 Starting voice input, checking permissions...');

            const hasPermission = await requestMicrophonePermission();

            if (!hasPermission) {
                console.log('❌ No microphone permission, cannot start voice input');
                setRecognitionState('idle');
                return;
            }

            // Clear any previous state
            setTranscript('');
            setConfidence(0);

            console.log('🎤 Starting speech recognition...');

            // CRITICAL: Set a timeout to detect if recognition.start() fails to trigger onstart
            const timeoutId = setTimeout(() => {
                console.log('⏰ TIMEOUT: Speech recognition failed to start within 3 seconds');
                console.log('🔧 This is likely a Capacitor WebView issue - attempting recovery...');

                if (recognitionState === 'starting') {
                    setRecognitionState('idle');
                    setIsListening(false);

                    if (onError) {
                        onError('Voice recognition failed to start. This may be a compatibility issue with your device.\n\nTry:\n• Restarting the app\n• Using a different keyboard\n• Speaking into a different microphone app first');
                    }
                }
            }, 3000); // 3 second timeout

            setStartTimeout(timeoutId);

            // ENHANCED: Try recognition start with better error handling
            setTimeout(() => {
                if (recognitionRef.current && recognitionState === 'starting') {
                    try {
                        console.log('🎤 Calling recognition.start()...');
                        recognitionRef.current.start();
                        console.log('🎤 recognition.start() called - waiting for onstart event...');
                    } catch (startError) {
                        console.error('❌ Error calling recognition.start():', startError);

                        // Clear timeout
                        if (timeoutId) {
                            clearTimeout(timeoutId);
                            setStartTimeout(null);
                        }

                        setRecognitionState('idle');
                        setIsListening(false);

                        // Try to provide helpful error message
                        let errorMessage = 'Failed to start voice recognition.';

                        if (startError.name === 'InvalidStateError') {
                            errorMessage = 'Voice recognition is already in use. Please wait a moment and try again.';
                        } else if (startError.name === 'NotAllowedError') {
                            errorMessage = 'Microphone access was denied. Please check your device settings.';
                        } else if (startError.name === 'ServiceNotAllowedError') {
                            errorMessage = 'Voice recognition service is not available. Check your internet connection.';
                        } else {
                            errorMessage = `Voice recognition error: ${startError.message || startError.name}`;
                        }

                        if (onError) {
                            onError(errorMessage);
                        }
                    }
                }
            }, 100); // Small delay to prevent race conditions

        } catch (error) {
            console.error('❌ Failed to start recognition:', error);

            // Clear timeout
            if (startTimeout) {
                clearTimeout(startTimeout);
                setStartTimeout(null);
            }

            setRecognitionState('idle');
            setIsListening(false);

            if (onError) {
                onError('Failed to start voice recognition. Please try again.');
            }
        }
    }, [recognitionState, requestMicrophonePermission, onError, startTimeout]);


// 3. UPDATE: Enhanced stop function with state management
    const stopListening = useCallback(() => {
        console.log('🛑 stopListening called, current state:', recognitionState);

        // Clear any start timeout
        if (startTimeout) {
            clearTimeout(startTimeout);
            setStartTimeout(null);
        }

        if (recognitionRef.current && (recognitionState === 'listening' || recognitionState === 'starting')) {
            console.log('🛑 Manually stopping speech recognition');
            setRecognitionState('stopping');

            try {
                recognitionRef.current.stop();
            } catch (e) {
                console.log('Error stopping recognition:', e);
                setRecognitionState('idle');
                setIsListening(false);
            }
        }
    }, [recognitionState, startTimeout]);

// 4. UPDATE: Enhanced toggle function
    const toggleListening = useCallback(async () => {
        console.log('🔄 toggleListening called, current state:', recognitionState, 'isListening:', isListening);

        if (isListening || recognitionState === 'listening' || recognitionState === 'starting') {
            stopListening();
        } else if (recognitionState === 'idle') {
            await startListening();
        }
    }, [isListening, recognitionState, startListening, stopListening]);

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